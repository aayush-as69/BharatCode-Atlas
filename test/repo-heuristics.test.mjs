import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectAll, parseDependencies, selectPriorityFiles, selectManifests, isPreviewable, fileRole, TECH_RULES, ARCHITECTURE_RULES
} from '../lib/repo-heuristics.js';
import { isSensitivePath } from '../lib/redact.js';

const ctx = (over = {}) => ({ paths: [], readme: '', deps: new Set(), ...over });
const arch = (c) => detectAll(ctx(c)).architecture.names;
const tech = (c) => detectAll(ctx(c)).technologies.names;

test('a CI workflow alone is not "Agents / Orchestration" or "Deployment"', () => {
  const names = arch({ paths: ['.github/workflows/ci.yml'] });
  assert.ok(!names.includes('Agents / Orchestration'));
  assert.ok(!names.includes('Deployment'));
});

test('README words are matched as whole words', () => {
  assert.deepEqual(arch({ readme: 'Authors: me. This model is cool. Express yourself.' }), []);
  assert.deepEqual(tech({ readme: 'Express yourself with node' }), []);
  assert.ok(arch({ readme: 'We built a RAG pipeline' }).includes('RAG / Retrieval'));
});

test('dependency names match exactly ("pg" is not "upgrade")', () => {
  const upgrade = parseDependencies('package.json', '{"scripts":{"upgrade":"x"},"dependencies":{"upgrade-tool":"1"}}');
  assert.ok(!tech({ deps: upgrade }).includes('PostgreSQL'));
  const real = parseDependencies('package.json', '{"dependencies":{"pg":"8"}}');
  assert.ok(tech({ deps: real }).includes('PostgreSQL'));
});

test('package.json dependencies drive technology and architecture signals', () => {
  const deps = parseDependencies('package.json', JSON.stringify({
    dependencies: { next: '15', react: '19', openai: '6', express: '4', '@supabase/supabase-js': '2' },
    devDependencies: { vitest: '1' }
  }));
  const { technologies, architecture } = detectAll(ctx({ deps }));
  for (const t of ['Next.js', 'React', 'OpenAI', 'Express', 'Supabase']) assert.ok(technologies.names.includes(t), t);
  for (const a of ['Frontend', 'Backend / API', 'Database', 'AI / LLM', 'Testing']) assert.ok(architecture.names.includes(a), a);
  assert.ok(architecture.evidence['AI / LLM'][0].startsWith('dependency: '));
});

test('prefix dependency patterns (langchain-*, @langchain/*) work', () => {
  const deps = parseDependencies('requirements.txt', 'langchain-openai==0.1\nfaiss-cpu\n# comment\n-r other.txt\nFastAPI>=0.1');
  const names = tech({ deps });
  assert.ok(names.includes('LangChain') && names.includes('Vector DB') && names.includes('FastAPI'));
  assert.ok(tech({ deps: parseDependencies('package.json', '{"dependencies":{"@langchain/core":"1"}}') }).includes('LangChain'));
});

test('truncated package.json still yields dependencies', () => {
  const deps = parseDependencies('package.json', '{"dependencies":{"react":"19","next":"15",');
  assert.ok(deps.has('react') && deps.has('next'));
});

test('pyproject and requirements parsing', () => {
  const py = parseDependencies('pyproject.toml', '[project]\ndependencies = ["fastapi>=0.1", "chromadb"]\n[tool.poetry.dependencies]\nflask = "^3"');
  for (const d of ['fastapi', 'chromadb', 'flask']) assert.ok(py.has(d), d);
});

test('path rules use segments, not substrings', () => {
  assert.ok(arch({ paths: ['src/api/users.js'] }).includes('Backend / API'));
  assert.ok(!arch({ paths: ['src/rapid/stuff.js'] }).includes('Backend / API'));
  assert.ok(arch({ paths: ['tests/a.test.js'] }).includes('Testing'));
  assert.ok(arch({ paths: ['Dockerfile'] }).includes('Deployment'));
});

test('rules are well-formed', () => {
  for (const rule of [...TECH_RULES, ...ARCHITECTURE_RULES]) {
    assert.ok(rule.name && (rule.deps || rule.paths || rule.readme), rule.name);
  }
});

test('only manifests and deploy/CI config are previewable; entry/API sources are not', () => {
  for (const p of ['package.json', 'Dockerfile', 'docker-compose.yml', '.github/workflows/ci.yml', 'vercel.json']) assert.ok(isPreviewable(p), p);
  for (const p of ['src/index.js', 'server.js', 'app/api/x/route.js', 'src/App.jsx']) assert.equal(isPreviewable(p), false, p);
});

test('priority file selection never includes sensitive paths and honours the limit', () => {
  const paths = ['package.json', '.env', '.env.example', 'server.js', 'config/secrets.json', 'Dockerfile', ...Array.from({ length: 40 }, (_, i) => `.github/workflows/w${i}.yml`)];
  const picked = selectPriorityFiles(paths, isSensitivePath, 18);
  assert.ok(picked.length <= 18);
  assert.ok(picked.includes('package.json') && picked.includes('server.js'));
  assert.ok(!picked.some(isSensitivePath));
});

test('manifest selection prefers shallow paths', () => {
  const picked = selectManifests(['a/b/c/package.json', 'package.json', 'backend/requirements.txt'], 2);
  assert.deepEqual(picked, ['package.json', 'backend/requirements.txt']);
});

test('file roles', () => {
  assert.equal(fileRole('package.json'), 'Dependencies');
  assert.equal(fileRole('.github/workflows/ci.yml'), 'CI / automation');
  assert.equal(fileRole('app/api/x/route.js'), 'API / backend');
  assert.equal(fileRole('Dockerfile'), 'Deployment');
});
