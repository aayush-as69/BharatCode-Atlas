import test from 'node:test';
import assert from 'node:assert/strict';
import {redactSecrets,matchesTerm} from '../lib/github.js';

test('redactSecrets masks KEY=value assignments',()=>{
  const out=redactSecrets('OPENAI_API_KEY=sk-very-secret-value-123456\nDEBUG=true');
  assert.ok(out.includes('[redacted]'));
  assert.ok(!out.includes('sk-very-secret-value-123456'));
});

test('redactSecrets masks quoted credential properties',()=>{
  const out=redactSecrets('const config={apiKey:"abc123secretvalue"};');
  assert.ok(out.includes('[redacted]'));
  assert.ok(!out.includes('abc123secretvalue'));
});

test('redactSecrets masks single-quoted credential assignments',()=>{
  const out=redactSecrets("authToken = 'supersecrettoken99'");
  assert.ok(!out.includes('supersecrettoken99'));
});

test('redactSecrets leaves ordinary values intact',()=>{
  const out=redactSecrets('const name="RAGDesk";\nVERSION=1.2.3');
  assert.ok(out.includes('RAGDesk'));
  assert.ok(!out.includes('[redacted]'));
});

test('matchesTerm uses word boundaries for plain terms',()=>{
  assert.ok(matchesTerm('a rag pipeline for search','rag'));
  assert.ok(!matchesTerm('a smart garage door opener','rag'));
  assert.ok(!matchesTerm('the author wrote this','auth'));
  assert.ok(matchesTerm('authentication with oauth','authentication'));
});

test('matchesTerm handles plurals and compound names',()=>{
  assert.ok(matchesTerm('autonomous agents orchestrate tools','agent'));
  assert.ok(matchesTerm('document embeddings','embedding'));
  assert.ok(matchesTerm('ragdesk assistant','rag','RAGDesk assistant'));
  assert.ok(!matchesTerm('garage opener','rag','garage opener'));
  assert.ok(matchesTerm('an ai copilot','ai'));
  assert.ok(!matchesTerm('an airline booking tool','ai'));
});

test('matchesTerm keeps substring matching for structural terms',()=>{
  assert.ok(matchesTerm('src/app/page.jsx layout','app/'));
  assert.ok(matchesTerm('package.json dependencies','package.json'));
});
