import test from 'node:test';
import assert from 'node:assert/strict';
import { projects } from './helpers/data.mjs';
import { tokenize, searchProjects } from '../lib/search.js';
import { classify } from '../lib/signals.js';

test('tokenize keeps short technical terms and strips punctuation/stopwords', () => {
  assert.deepEqual(tokenize('Which projects have the strongest RAG signals?'), ['rag']);
  assert.ok(tokenize('Could this inspire BrandGuard?').includes('brandguard'));
  assert.ok(tokenize('LLM + OCR for AI').every((t) => ['llm', 'ocr', 'ai'].includes(t)));
  assert.deepEqual(tokenize('the of and'), []);
});

test('empty or stopword-only questions return nothing instead of everything', () => {
  assert.deepEqual(searchProjects(projects, ''), []);
  assert.deepEqual(searchProjects(projects, 'what are the'), []);
});

test('RAG question returns on-topic projects (regression: previously 0 of 9)', () => {
  const found = searchProjects(projects, 'Which projects have the strongest RAG signals?');
  assert.ok(found.length >= 5, `only ${found.length} results`);
  const onTopic = found.filter((p) => classify(p).rag).length;
  assert.ok(onTopic / found.length >= 0.8, `only ${onTopic}/${found.length} on topic`);
});

test('multi-concept question ranks projects matching both concepts first', () => {
  const found = searchProjects(projects, 'Find projects related to voice agents and retrieval.');
  assert.ok(found.length > 0);
  const c = classify(found[0]);
  assert.ok((c.voice ? 1 : 0) + (c.agents ? 1 : 0) + (c.rag ? 1 : 0) >= 2, 'top hit should match at least two concepts');
});

test('trailing punctuation does not break matching', () => {
  const name = projects.find((p) => /^[A-Za-z]{6,}$/.test(p.project_name)).project_name;
  const found = searchProjects(projects, `Tell me about ${name}?`);
  assert.ok(found.some((p) => p.project_name === name));
});

test('results respect the limit and are deterministic', () => {
  const a = searchProjects(projects, 'security fraud', { limit: 5 });
  const b = searchProjects(projects, 'security fraud', { limit: 5 });
  assert.equal(a.length, 5);
  assert.deepEqual(a.map((p) => p.id), b.map((p) => p.id));
});
