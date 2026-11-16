import test from 'node:test';
import assert from 'node:assert/strict';
import { dataset, projects } from './helpers/data.mjs';
import { validateDataset, assignIds, decodeEntities, slugifyRepo, findProject, finalizeProjects } from '../lib/dataset.js';

test('committed dataset is valid', () => {
  assert.deepEqual(validateDataset(dataset), []);
  assert.equal(dataset.count, projects.length);
});

test('ids are stable repo slugs, not rank-derived', () => {
  assert.ok(projects.every((p) => !/^p\d{3}$/.test(p.id)), 'no legacy ids remain');
  assert.equal(new Set(projects.map((p) => p.id)).size, projects.length);
});

test('ids do not change when ranks change', () => {
  const rows = [
    { rank: 1, github_repo: 'https://github.com/Foo/Bar', project_name: 'a', description: 'x'.repeat(30) },
    { rank: 2, github_repo: 'https://github.com/foo/bar', project_name: 'b', description: 'x'.repeat(30) },
    { rank: 3, github_repo: 'https://github.com/baz/qux', project_name: 'c', description: 'x'.repeat(30) }
  ];
  const before = Object.fromEntries(assignIds(rows).map((p) => [p.project_name, p.id]));
  const shifted = rows.map((p) => (p.project_name === 'c' ? { ...p, rank: 1 } : { ...p, rank: p.rank + 1 }));
  const after = Object.fromEntries(assignIds(shifted).map((p) => [p.project_name, p.id]));
  assert.equal(before.c, after.c);
  assert.equal(before.c, 'baz-qux');
  assert.equal(before.a, 'foo-bar');
  assert.equal(before.b, 'foo-bar-2');
});

test('entities are decoded and junk rows are flagged', () => {
  assert.equal(decodeEntities('a &gt; b &amp; c &#39;d&#x27; &quot;e&quot;'), `a > b & c 'd' "e"`);
  assert.ok(!projects.some((p) => /&(gt|lt|amp|quot|#\d+);/.test(p.description + p.project_name)));
  const out = finalizeProjects([
    { rank: 1, github_repo: 'https://github.com/a/b', project_name: 'x', description: '.', votes: 0, github_stars: 0, community_score: 0 },
    { rank: 2, github_repo: 'https://github.com/a/b', project_name: 'y', description: 'a long enough description here', votes: 0, github_stars: 0, community_score: 0 }
  ]);
  assert.deepEqual(out[0].quality_flags.sort(), ['duplicate_repo', 'minimal_description']);
  assert.deepEqual(out[1].quality_flags, ['duplicate_repo']);
});

test('validateDataset reports real problems', () => {
  const base = { id: 'a', rank: 1, project_name: 'A', description: 'd', votes: 1, github_stars: 1, community_score: 1, github_repo: 'https://github.com/a/a' };
  assert.ok(validateDataset({ projects: [] }).length);
  assert.ok(validateDataset({ count: 3, projects: [base] }).some((m) => /count/.test(m)));
  assert.ok(validateDataset({ projects: [base, { ...base }] }).some((m) => /duplicate id/.test(m)));
  assert.ok(validateDataset({ projects: [{ ...base, votes: 'x' }] }).some((m) => /votes/.test(m)));
  assert.ok(validateDataset({ projects: [{ ...base, github_repo: 'http://evil.test/x' }] }).some((m) => /github_repo/.test(m)));
});

test('legacy rank ids still resolve', () => {
  const first = projects.find((p) => p.rank === 1);
  assert.equal(findProject(projects, 'p001').id, first.id);
  assert.equal(findProject(projects, first.id).id, first.id);
  assert.equal(findProject(projects, 'p9999'), null);
  assert.equal(findProject(projects, 'nope'), null);
  assert.equal(slugifyRepo('https://github.com/Some-User/My_Repo.git'), 'some-user-my-repo');
});

test('decodeEntities: invalid numeric references never throw and are left as written', async () => {
  const { decodeEntities } = await import('../lib/dataset.js');
  assert.equal(decodeEntities('a &#99999999999; b'), 'a &#99999999999; b');
  assert.equal(decodeEntities('&#x110000; &#xD800; &#0;'), '&#x110000; &#xD800; &#0;');
  assert.equal(decodeEntities('&#65; &#x42; &amp; &lt;'), 'A B & <');
});

test('decodeEntities: a single pass, so escaped entities are not decoded twice', async () => {
  const { decodeEntities } = await import('../lib/dataset.js');
  assert.equal(decodeEntities('&amp;lt;b&amp;gt;'), '&lt;b&gt;');
});
