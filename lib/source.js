import projectsData from '@/data/projects.json';
import { validateDataset, findProject as findProjectIn } from './dataset.js';

// Scoring and classification live in ./signals.js (pure, unit-tested). This
// module only loads the committed dataset. The row count is NOT asserted here:
// a data change must not take the whole site down. Structure is validated at
// build/CI time by `npm run verify:data` and on first load below.

let cached = null;

export async function getProjects() {
  if (cached) return cached;
  const problems = validateDataset(projectsData);
  if (problems.length) {
    throw new Error('Invalid BharatCode dataset: ' + problems.slice(0, 3).join('; ') + (problems.length > 3 ? ` (+${problems.length - 3} more)` : ''));
  }
  const projects = Array.isArray(projectsData?.projects) ? projectsData.projects : projectsData;
  cached = projects.slice().sort((a, b) => a.rank - b.rank);
  return cached;
}

// Resolves current repo-based ids and legacy rank-based ids like "p012".
export async function findProject(id) {
  return findProjectIn(await getProjects(), id);
}

export * from './signals.js';
