import fs from 'node:fs';

export const dataset = JSON.parse(fs.readFileSync(new URL('../../data/projects.json', import.meta.url), 'utf8'));
export const projects = dataset.projects;
