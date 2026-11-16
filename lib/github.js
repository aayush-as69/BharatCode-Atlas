import { redactSecrets, isSensitivePath } from './redact.js';
import {
  parseDependencies, detectAll, selectManifests, selectPriorityFiles, isPreviewable,
  fileRole, buildFingerprint, buildHypothesis
} from './repo-heuristics.js';

const API = 'https://api.github.com';
const REQUEST_TIMEOUT_MS = 8_000;
const MAX_SOURCE_PREVIEW = 3_500;
const MAX_TREE_PATHS = 2_000;
const MAX_CACHE_ENTRIES = 300;
const SUCCESS_TTL_MS = 15 * 60 * 1000;
const FAILURE_TTL_MS = 2 * 60 * 1000;

export function parseRepoUrl(url = '') {
  const m = String(url).match(/github\.com\/([^/]+)\/([^/#?]+)/i);
  if (!m) return { owner: null, repo: null };
  const owner = m[1];
  const repo = m[2].replace(/\.git$/i, '');
  const valid = (x) => /^[A-Za-z0-9._-]{1,100}$/.test(x) && x !== '.' && x !== '..';
  return valid(owner) && valid(repo) ? { owner, repo } : { owner: null, repo: null };
}

export const isBlockedSourcePath = isSensitivePath;

export class GitHubError extends Error {
  constructor(status, rateLimited = false) {
    super('GitHub API ' + status);
    this.name = 'GitHubError';
    this.status = status;
    this.rateLimited = rateLimited;
  }
}

async function github(path) {
  const token = process.env.GITHUB_TOKEN;
  let res;
  try {
    res = await fetch(API + path, {
      headers: { accept: 'application/vnd.github+json', ...(token ? { authorization: 'Bearer ' + token } : {}) },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      next: { revalidate: 3600 }
    });
  } catch (error) {
    throw new GitHubError(error?.name === 'TimeoutError' ? 'timeout' : 'network');
  }
  if (!res.ok) {
    const rateLimited = res.status === 429 || (res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0');
    throw new GitHubError(res.status, rateLimited);
  }
  return res.json();
}

const decode = (response) => (response?.content ? Buffer.from(response.content, 'base64').toString('utf8') : '');
const contentsPath = (owner, repo, filePath) =>
  '/repos/' + owner + '/' + repo + '/contents/' + filePath.split('/').map(encodeURIComponent).join('/');

function describeError(error) {
  if (error?.rateLimited) return 'GitHub rate limit reached. Set GITHUB_TOKEN to raise it, or try again later.';
  if (error?.status === 404) return 'Repository not found or not public.';
  if (error?.status === 'timeout') return 'GitHub did not respond in time.';
  return 'Repository inspection is unavailable right now.';
}

const cache = new Map();
const inflight = new Map();

function cacheSet(key, data, ttl) {
  cache.set(key, { time: Date.now(), ttl, data });
  while (cache.size > MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value);
}

// Test helper: forget cached and in-flight inspections.
export function clearInspectionCache() {
  cache.clear();
  inflight.clear();
}

// Never throws. Returns {ok:true,...} or {ok:false,error}. Failures are cached
// briefly so a page that fans out cannot hammer GitHub while it is rate limiting.
// options.light skips file-content fetches (README + manifests are still read).
export async function inspectRepository(githubRepo, { light = false } = {}) {
  const key = String(githubRepo || '').toLowerCase() + (light ? '#light' : '');
  const hit = cache.get(key);
  if (hit && Date.now() - hit.time < hit.ttl) return { ...hit.data, cache: 'memory' };
  if (inflight.has(key)) return inflight.get(key);

  const promise = run(githubRepo, light)
    .then((data) => { cacheSet(key, data, data.ok ? SUCCESS_TTL_MS : FAILURE_TTL_MS); return data; })
    .finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return promise;
}

async function run(githubRepo, light) {
  const { owner, repo } = parseRepoUrl(githubRepo);
  if (!owner || !repo) return { ok: false, error: 'Invalid GitHub repository URL' };

  try {
    const meta = await github('/repos/' + owner + '/' + repo);
    const tree = await github('/repos/' + owner + '/' + repo + '/git/trees/' + encodeURIComponent(meta.default_branch) + '?recursive=1');
    const blobs = (tree.tree || []).filter((x) => x.type === 'blob');
    const paths = blobs.map((x) => x.path).slice(0, MAX_TREE_PATHS);
    const sizes = new Map(blobs.map((x) => [x.path, x.size]));

    let readme = '';
    const readmePath = paths.find((p) => /^readme(\.(md|markdown|rst|txt))?$/i.test(p));
    if (readmePath) {
      try { readme = decode(await github(contentsPath(owner, repo, readmePath))).slice(0, 20_000); } catch { /* optional */ }
    }

    // Dependencies come from the FULL manifest, not from a truncated preview.
    const manifests = selectManifests(paths.filter((p) => !isBlockedSourcePath(p)), light ? 4 : 8);
    const deps = new Set();
    const manifestContent = new Map();
    await Promise.all(manifests.map(async (path) => {
      try {
        const text = decode(await github(contentsPath(owner, repo, path)));
        manifestContent.set(path, text);
        for (const name of parseDependencies(path, text)) deps.add(name);
      } catch { /* a missing manifest only lowers confidence */ }
    }));

    const detected = detectAll({ paths, readme, deps });

    const listed = selectPriorityFiles(paths, isBlockedSourcePath);
    const sourceFiles = [];
    for (const path of listed) {
      let preview = null;
      if (!light && isPreviewable(path)) {
        try {
          const text = manifestContent.get(path) ?? decode(await github(contentsPath(owner, repo, path)));
          preview = redactSecrets(text).slice(0, MAX_SOURCE_PREVIEW);
        } catch { /* listed without preview */ }
      }
      sourceFiles.push({ path, size: sizes.get(path) ?? null, role: fileRole(path), preview });
    }

    const dependencySignals = [];
    for (const [name, hits] of Object.entries(detected.technologies.evidence)) {
      for (const hit of hits) {
        if (hit.startsWith('dependency: ')) dependencySignals.push({ technology: name, dependency: hit.slice(12) });
      }
    }

    return {
      ok: true,
      repository: {
        full_name: meta.full_name, description: meta.description, stars: meta.stargazers_count, forks: meta.forks_count,
        open_issues: meta.open_issues_count, default_branch: meta.default_branch, language: meta.language,
        updated_at: meta.updated_at, license: meta.license?.spdx_id || null
      },
      files: { count: paths.length, truncated: Boolean(tree.truncated) || blobs.length > MAX_TREE_PATHS, readme_found: Boolean(readme), manifests },
      technologies: detected.technologies.names,
      architecture: detected.architecture.names,
      evidence: {
        technology_detection: 'Dependency manifests, repository file paths, and README terms',
        sample_files: paths.slice(0, 60),
        technologies: detected.technologies.evidence,
        architecture: detected.architecture.evidence,
        architecture_hypothesis: buildHypothesis(detected.architecture.evidence),
        source_files: sourceFiles,
        architecture_fingerprint: buildFingerprint(sourceFiles, detected.architecture.evidence),
        dependency_signals: dependencySignals
      }
    };
  } catch (error) {
    return { ok: false, error: describeError(error), rateLimited: Boolean(error?.rateLimited) };
  }
}

// Runs `worker` over `items` with bounded concurrency, preserving order.
export async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  }));
  return results;
}
