import fs from 'node:fs';
import { validateDataset } from '../lib/dataset.js';

const file = new URL('../data/projects.json', import.meta.url);
const dataset = JSON.parse(fs.readFileSync(file, 'utf8'));
const problems = validateDataset(dataset);

if (problems.length) {
  console.error(`Dataset verification failed (${problems.length} problem${problems.length === 1 ? '' : 's'}):`);
  problems.slice(0, 25).forEach((p) => console.error(' -', p));
  process.exit(1);
}
console.log(`Dataset verification passed: ${dataset.projects.length} projects, unique ids and ranks, valid repository URLs.`);
