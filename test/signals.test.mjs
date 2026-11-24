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

test('buildUserProfile: everyday words do not switch interests on', () => {
  const profile = buildUserProfile({
    githubData: { bio: 'I write code, public repos on github, a workflow for model trains and calls', repos: [] },
    building: 'a conversation about a call'
  }).profile;
  assert.deepEqual(Object.entries(profile).filter(([, on]) => on).map(([k]) => k), []);
});

test('buildUserProfile: genuine interest terms still match', () => {
  const profile = buildUserProfile({ building: 'a voice agent with retrieval over a vector store' }).profile;
  assert.ok(profile.voice && profile.agents && profile.rag);
});

test('selectHiddenGems: skips minimal rows and shows each repository once', async () => {
  const { selectHiddenGems } = await import('../lib/signals.js');
  const base = { votes: 0, github_stars: 0, community_score: 0, description: 'An agent that uses retrieval and voice over a vector store for security review.' };
  const rows = [
    { ...base, id: 'a', rank: 1, project_name: 'A', github_repo: 'https://github.com/o/shared' },
    { ...base, id: 'a-2', rank: 2, project_name: 'A2', github_repo: 'https://github.com/O/Shared', votes: 40 },
    { ...base, id: 'b', rank: 3, project_name: 'B', github_repo: 'https://github.com/o/tiny', quality_flags: ['minimal_description'] },
    { ...base, id: 'c', rank: 4, project_name: 'C', github_repo: 'https://github.com/o/other' }
  ];
  const out = selectHiddenGems(rows, 10);
  assert.deepEqual(out.map((p) => p.id).sort(), ['a', 'c']);
  assert.ok(out.every((p) => typeof p.gem === 'number' && typeof p.why === 'string'));
  assert.equal(selectHiddenGems(rows, 1).length, 1);
});

test('selectHiddenGems: real dataset never repeats a repository', () => {
  return import('../lib/signals.js').then(({ selectHiddenGems }) => {
    const out = selectHiddenGems(projects, 60);
    assert.equal(new Set(out.map((p) => p.github_repo.toLowerCase())).size, out.length);
    assert.ok(out.every((p) => !(p.quality_flags || []).includes('minimal_description')));
  });
});
