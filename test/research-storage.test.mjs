import test from 'node:test';
import assert from 'node:assert/strict';
import { loadResearch, saveResearch, addResearchEntry, compactIntelligence, RESEARCH_KEY } from '../lib/research-storage.js';

function memoryStorage(initial = {}, { failWrites = false } = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { if (failWrites) throw new DOMException('quota', 'QuotaExceededError'); map.set(k, String(v)); },
    map
  };
}

test('corrupt or non-array storage loads as empty', () => {
  assert.deepEqual(loadResearch(memoryStorage({ [RESEARCH_KEY]: '{not json' })), []);
  assert.deepEqual(loadResearch(memoryStorage({ [RESEARCH_KEY]: '{"a":1}' })), []);
  assert.deepEqual(loadResearch(memoryStorage()), []);
});

test('a full or blocked storage reports an error instead of throwing', () => {
  const result = saveResearch([{ id: 1 }], memoryStorage({}, { failWrites: true }));
  assert.equal(result.ok, false);
  assert.match(result.error, /storage/i);
});

test('entries are de-duplicated per project and per comparison', () => {
  const s = memoryStorage();
  assert.equal(addResearchEntry({ id: 'a', project: { id: 'p1' } }, s).ok, true);
  assert.equal(addResearchEntry({ id: 'b', project: { id: 'p1' } }, s).existing, true);
  addResearchEntry({ id: 'c', comparison: ['x', 'y'], project: { id: 'comparison-c' } }, s);
  assert.equal(addResearchEntry({ id: 'd', comparison: ['y', 'x'], project: { id: 'comparison-d' } }, s).existing, true);
  assert.equal(loadResearch(s).length, 2);
});

test('snapshots never keep raw file previews', () => {
  const compact = compactIntelligence({
    ok: true,
    repository: { full_name: 'a/b', language: 'JS', stars: 5 },
    technologies: ['React'],
    architecture: ['Frontend'],
    evidence: {
      source_files: [{ path: 'package.json', preview: 'SECRET-PREVIEW' }],
      architecture_fingerprint: [{ layer: 'Application', signal: 's', evidence: ['app/page.jsx'], extra: 'drop' }]
    }
  });
  const text = JSON.stringify(compact);
  assert.ok(!text.includes('SECRET-PREVIEW') && !text.includes('source_files') && !text.includes('"extra"'));
  assert.equal(compactIntelligence({ ok: false }), null);
  assert.ok(text.length < 2000);
});
