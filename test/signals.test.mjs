import test from 'node:test';
import assert from 'node:assert/strict';
import { projects } from './helpers/data.mjs';
import {
  hasTerm, classify, architectureProfile, researchScore, buildUserProfile, userOpportunity, STRONG_MATCH_SCORE, hiddenGem
} from '../lib/signals.js';

const fake = (over = {}) => ({ rank: 1, project_name: 'X', description: '', votes: 0, github_stars: 0, community_score: 0, ...over });

test('term matching is word-start based, not raw substring', () => {
  assert.equal(hasTerm('a fragile storage app', 'rag'), false);
  assert.equal(hasTerm('invoice automation', 'voice'), false);
  assert.equal(hasTerm('rag pipeline', 'rag'), true);
  assert.equal(hasTerm('multi-agent agents and agentic flows', 'agent'), true);
});

test('classify finds signals in project text', () => {
  const c = classify(fake({ description: 'A voice agent with retrieval over embeddings' }));
  assert.ok(c.voice && c.agents && c.rag);
  assert.equal(c.civic, false);
});

test('without repository evidence no engineering dimension is true', () => {
  for (const p of projects) {
    const d = architectureProfile(p).dimensions;
    for (const key of ['frontend', 'backend', 'database', 'deployment', 'testing', 'observability']) {
      assert.equal(d[key], false, `${p.id} ${key}`);
    }
  }
});

test('repository evidence raises the research score', () => {
  const p = fake({ description: 'a tool' });
  const withRepo = researchScore(p, { ok: true, technologies: ['OpenAI'], architecture: ['Frontend', 'Backend / API', 'Testing', 'AI / LLM'] });
  assert.ok(withRepo > researchScore(p));
});

test('user profile: free text uses whole words', () => {
  assert.equal(buildUserProfile({ building: 'storage app for average users' }).profile.rag, false);
  assert.equal(buildUserProfile({ building: 'We use RAG for support' }).profile.rag, true);
  assert.equal(buildUserProfile({ interests: 'Developer Tools' }).profile.devtools, true);
  assert.equal(buildUserProfile({ interests: 'AI / LLM' }).profile.ai, true);
});

test('recommendations: devtools and AI interests can match; no overlap scores 0', () => {
  const dev = buildUserProfile({ interests: 'Developer Tools' });
  assert.ok(projects.some((p) => userOpportunity(p, dev).score > 0), 'devtools interest matches something');
  const ai = buildUserProfile({ interests: 'AI / LLM' });
  assert.ok(projects.some((p) => userOpportunity(p, ai).score > 0), 'AI interest matches something');
  const none = userOpportunity(fake({ description: 'knitting patterns' }), buildUserProfile({ interests: 'Security' }));
  assert.equal(none.score, 0);
});

test('"Strong match" is reachable for typical input', () => {
  for (const interests of ['AI Agents', 'AI Agents RAG / Retrieval', 'AI Agents RAG / Retrieval Security']) {
    const up = buildUserProfile({ interests });
    const strong = projects.filter((p) => userOpportunity(p, up).score >= STRONG_MATCH_SCORE);
    assert.ok(strong.length > 0, `no strong match for: ${interests}`);
  }
});

test('scores stay within 0-100', () => {
  for (const p of projects) {
    for (const s of [hiddenGem(p), researchScore(p)]) assert.ok(s >= 0 && s <= 100);
  }
});
