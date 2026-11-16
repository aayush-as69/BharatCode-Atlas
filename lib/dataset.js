// Pure helpers for building and validating the project dataset. Used by the
// sync script, the verify script and tests.

const NAMED_ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

// Numeric references outside the valid Unicode range (or surrogates, or NUL)
// are left as written; String.fromCodePoint would throw a RangeError on them.
function fromCodePointSafe(match, code) {
  return Number.isInteger(code) && code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff)
    ? String.fromCodePoint(code)
    : match;
}

// Decode exactly once, in finalizeProjects. Decoding twice would turn the
// literal text "&amp;lt;" into "<".
export function decodeEntities(value = '') {
  return String(value)
    .replace(/&#x([0-9a-f]{1,8});/gi, (match, hex) => fromCodePointSafe(match, parseInt(hex, 16)))
    .replace(/&#(\d{1,8});/g, (match, dec) => fromCodePointSafe(match, parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (match, name) => NAMED_ENTITIES[name.toLowerCase()] ?? match);
}

export function slugifyRepo(url = '') {
  const match = String(url).match(/github\.com\/([^/]+)\/([^/#?]+)/i);
  const raw = match ? match[1] + '-' + match[2].replace(/\.git$/i, '') : String(url);
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'project';
}

// Stable ids: derived from the repository, not from leaderboard rank, so a
// re-sync does not point saved research at a different project. Rows sharing a
// repository get -2, -3, ... in rank order.
export function assignIds(projects) {
  const seen = new Map();
  return [...projects].sort((a, b) => a.rank - b.rank).map((project) => {
    const base = slugifyRepo(project.github_repo);
    const n = (seen.get(base) || 0) + 1;
    seen.set(base, n);
    return { ...project, id: n === 1 ? base : base + '-' + n };
  });
}

export const MIN_DESCRIPTION_LENGTH = 20;

export function qualityFlags(project, repoCounts) {
  const flags = [];
  const key = String(project.github_repo || '').toLowerCase();
  if ((repoCounts.get(key) || 0) > 1) flags.push('duplicate_repo');
  if ((project.description || '').trim().length < MIN_DESCRIPTION_LENGTH) flags.push('minimal_description');
  return flags;
}

export function addQualityFlags(projects) {
  const counts = new Map();
  for (const p of projects) {
    const key = String(p.github_repo || '').toLowerCase();
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return projects.map((p) => {
    const flags = qualityFlags(p, counts);
    const { quality_flags: _old, ...rest } = p;
    return flags.length ? { ...rest, quality_flags: flags } : rest;
  });
}

export function finalizeProjects(rawProjects) {
  return addQualityFlags(assignIds(rawProjects.map((p) => ({
    ...p,
    project_name: decodeEntities(p.project_name),
    description: decodeEntities(p.description)
  }))));
}

const REQUIRED_NUMBERS = ['rank', 'votes', 'github_stars', 'community_score'];

// Returns a list of human-readable problems; empty list means valid.
export function validateDataset(dataset) {
  const problems = [];
  const projects = Array.isArray(dataset) ? dataset : dataset?.projects;
  if (!Array.isArray(projects) || projects.length === 0) return ['projects must be a non-empty array'];
  if (!Array.isArray(dataset) && typeof dataset.count === 'number' && dataset.count !== projects.length) {
    problems.push(`count field (${dataset.count}) does not match projects.length (${projects.length})`);
  }
  const ids = new Set();
  const ranks = new Set();
  for (const p of projects) {
    const label = p?.id ?? '(no id)';
    if (!p?.id || typeof p.id !== 'string') problems.push(`${label}: missing id`);
    else if (ids.has(p.id)) problems.push(`${label}: duplicate id`);
    else ids.add(p.id);
    if (!p?.project_name) problems.push(`${label}: missing project_name`);
    if (typeof p?.description !== 'string' || !p.description) problems.push(`${label}: missing description`);
    for (const key of REQUIRED_NUMBERS) {
      if (typeof p?.[key] !== 'number' || Number.isNaN(p[key])) problems.push(`${label}: ${key} is not a number`);
    }
    if (ranks.has(p?.rank)) problems.push(`${label}: duplicate rank ${p.rank}`);
    ranks.add(p?.rank);
    if (!/^https:\/\/github\.com\/[^/]+\/[^/]+/i.test(p?.github_repo || '')) problems.push(`${label}: github_repo is not a GitHub repository URL`);
  }
  return problems;
}

// Resolves current ids and legacy rank-based ids ("p012") to a project.
export function findProject(projects, id) {
  const exact = projects.find((p) => p.id === id);
  if (exact) return exact;
  const legacy = /^p(\d{1,4})$/.exec(String(id || ''));
  if (legacy) return projects.find((p) => p.rank === Number(legacy[1])) || null;
  return null;
}
