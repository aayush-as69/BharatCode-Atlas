import test from 'node:test';
import assert from 'node:assert/strict';
import { installFetch, jsonResponse, b64 } from './helpers/mock-fetch.mjs';

delete process.env.GITHUB_TOKEN;
const { inspectRepository, parseRepoUrl, mapLimit, clearInspectionCache } = await import('../lib/github.js');

const FAKE_KEY = 'abcdef123456ZZ';
const files = {
  'README.md': '# Demo\nA RAG demo built with Next.js. Authors: Me.',
  'package.json': JSON.stringify({
    name: 'demo',
    scripts: { start: `API_KEY=${FAKE_KEY} node server.js`, upgrade: 'echo' },
    dependencies: { next: '15.5.29', react: '19', openai: '^6', express: '4' }
  }),
  'Dockerfile': 'FROM node:20\nENV TOKEN=' + 'q'.repeat(24) + '\n',
  '.github/workflows/ci.yml': 'name: ci\non: push\n',
  'server.js': `const key = "sk-${'A1b2'.repeat(8)}";`,
  '.env': 'SECRET=hunter2hunter2',
  'src/index.js': 'console.log(1)',
  'app/api/chat/route.js': 'export async function POST(){}'
};

function githubHandler(repoPath, fileMap = files) {
  const files = fileMap;
  return (url) => {
    if (url.endsWith(`/repos/${repoPath}`)) return jsonResponse({ full_name: repoPath, default_branch: 'main', stargazers_count: 3, forks_count: 1, open_issues_count: 0, language: 'JavaScript', updated_at: '2026-01-01T00:00:00Z', license: { spdx_id: 'MIT' } });
    if (url.includes('/git/trees/')) return jsonResponse({ truncated: false, tree: Object.keys(files).map((path) => ({ type: 'blob', path, size: files[path].length })) });
    const m = url.match(/\/contents\/(.+)$/);
    if (m) {
      const path = decodeURIComponent(m[1]).replace(/%2F/g, '/');
      return files[path] != null ? jsonResponse({ content: b64(files[path]) }) : jsonResponse({}, 404);
    }
    return jsonResponse({}, 404);
  };
}

test('parseRepoUrl', () => {
  assert.deepEqual(parseRepoUrl('https://github.com/a/b.git'), { owner: 'a', repo: 'b' });
  assert.deepEqual(parseRepoUrl('https://github.com/a/b/tree/main'), { owner: 'a', repo: 'b' });
  assert.deepEqual(parseRepoUrl('nope'), { owner: null, repo: null });
});

test('inspection: detects from manifests, masks secrets, never fetches risky files', async () => {
  const net = installFetch(githubHandler('o/demo'));
  try {
    const r = await inspectRepository('https://github.com/o/demo');
    assert.equal(r.ok, true);
    for (const t of ['Next.js', 'React', 'OpenAI', 'Express', 'Docker']) assert.ok(r.technologies.includes(t), t);
    assert.ok(!r.technologies.includes('PostgreSQL'), '"upgrade" script must not look like pg');
    for (const a of ['Frontend', 'Backend / API', 'AI / LLM', 'RAG / Retrieval', 'Deployment']) assert.ok(r.architecture.includes(a), a);
    assert.ok(!r.architecture.includes('Authentication'), '"Authors" in README is not authentication');
    assert.ok(!r.architecture.includes('Agents / Orchestration'), 'a CI workflow is not agent orchestration');

    const listed = Object.fromEntries(r.evidence.source_files.map((f) => [f.path, f]));
    assert.ok(!('.env' in listed), '.env is never listed');
    assert.equal(listed['server.js'].preview, null, 'entry source is listed without content');
    assert.equal(listed['app/api/chat/route.js'].preview, null);
    assert.ok(listed['package.json'].preview.includes('[redacted]'));
    assert.ok(!JSON.stringify(r).includes(FAKE_KEY), 'key must not appear anywhere in the result');
    assert.ok(!JSON.stringify(r).includes('q'.repeat(24)), 'Dockerfile token must be masked');
    assert.ok(!JSON.stringify(r).includes('A1b2A1b2'), 'server.js secret is never fetched');

    assert.ok(!net.calls.some((u) => /contents\/(server\.js|\.env|src%2Findex\.js)/.test(u)), 'risky files are not requested');
    assert.ok(r.evidence.source_files.every((f) => f.size == null || typeof f.size === 'number'));
  } finally { net.restore(); }
});

test('inspection: success is cached, and concurrent calls share one request', async () => {
  const net = installFetch(githubHandler('o/cached'));
  try {
    const [a, b] = await Promise.all([inspectRepository('https://github.com/o/cached'), inspectRepository('https://github.com/o/cached')]);
    assert.ok(a.ok && b.ok);
    const first = net.calls.length;
    const again = await inspectRepository('https://github.com/o/cached');
    assert.equal(again.cache, 'memory');
    assert.equal(net.calls.length, first);
  } finally { net.restore(); }
});

test('inspection: rate limiting is reported clearly and failures are cached briefly', async () => {
  const net = installFetch(() => jsonResponse({ message: 'limit' }, 403, { 'x-ratelimit-remaining': '0' }));
  try {
    const r = await inspectRepository('https://github.com/o/limited');
    assert.equal(r.ok, false);
    assert.equal(r.rateLimited, true);
    assert.match(r.error, /rate limit/i);
    const calls = net.calls.length;
    await inspectRepository('https://github.com/o/limited');
    assert.equal(net.calls.length, calls, 'failure is not retried immediately');
  } finally { net.restore(); }
});

test('inspection: missing repo, timeouts and bad URLs never throw', async () => {
  let net = installFetch(() => jsonResponse({}, 404));
  try { assert.match((await inspectRepository('https://github.com/o/missing')).error, /not found/i); } finally { net.restore(); }
  net = installFetch(() => { throw new DOMException('timed out', 'TimeoutError'); });
  try { assert.match((await inspectRepository('https://github.com/o/slow')).error, /in time/i); } finally { net.restore(); }
  assert.equal((await inspectRepository('not a url')).ok, false);
  assert.equal((await inspectRepository(undefined)).ok, false);
});

test('inspection: light mode fetches no file previews', async () => {
  const net = installFetch(githubHandler('o/lite'));
  try {
    const r = await inspectRepository('https://github.com/o/lite', { light: true });
    assert.equal(r.ok, true);
    assert.ok(r.evidence.source_files.every((f) => f.preview === null));
  } finally { net.restore(); }
});

test('mapLimit preserves order and bounds concurrency', async () => {
  let running = 0, peak = 0;
  const out = await mapLimit([5, 1, 4, 2, 3, 6, 7], 3, async (n) => {
    running++; peak = Math.max(peak, running);
    await new Promise((r) => setTimeout(r, n));
    running--;
    return n * 2;
  });
  assert.deepEqual(out, [10, 2, 8, 4, 6, 12, 14]);
  assert.ok(peak <= 3, 'peak ' + peak);
  assert.deepEqual(await mapLimit([], 3, async () => 1), []);
});

test('inspection: manifests under secret-named paths are never fetched or parsed', async () => {
  const tricky = {
    'package.json': JSON.stringify({ dependencies: { react: '19' } }),
    'secrets/package.json': JSON.stringify({ dependencies: { express: '4', mongodb: '6' } }),
    'config/credentials/requirements.txt': 'fastapi\n',
    'private/Dockerfile': 'FROM node:20\n',
    'README.md': '# Demo'
  };
  const net = installFetch(githubHandler('o/secretpaths', tricky));
  try {
    const r = await inspectRepository('https://github.com/o/secretpaths');
    assert.equal(r.ok, true);
    assert.ok(!net.calls.some((u) => /secrets|credentials|private/.test(decodeURIComponent(u).replace(/^.*\/contents\//, ''))), 'blocked paths are not requested: ' + net.calls.join(' '));
    assert.ok(!r.technologies.includes('Express') && !r.technologies.includes('FastAPI') && !r.technologies.includes('MongoDB'));
    assert.ok(r.technologies.includes('React'));
    assert.ok(!r.files.manifests.some((m) => /secrets|credentials|private/.test(m)));
  } finally { net.restore(); }
});

test('inspection: README is found in any letter case and common extensions', async () => {
  for (const name of ['Readme.md', 'README.rst', 'readme.markdown']) {
    clearInspectionCache();
    const net = installFetch(githubHandler('o/readme', { [name]: 'A RAG demo', 'package.json': '{}' }));
    try {
      const r = await inspectRepository('https://github.com/o/readme');
      assert.equal(r.files.readme_found, true, name);
    } finally { net.restore(); }
  }
});

test('parseRepoUrl: unsafe owner or repo names are rejected', () => {
  for (const bad of ['https://github.com/a%2Fb/c', 'https://github.com/../x', 'https://github.com/a/..', 'https://github.com/a b/c', 'https://github.com/o/r%00']) {
    assert.deepEqual(parseRepoUrl(bad), { owner: null, repo: null }, bad);
  }
  assert.deepEqual(parseRepoUrl('https://github.com/Owner-1/repo.name_2'), { owner: 'Owner-1', repo: 'repo.name_2' });
});
