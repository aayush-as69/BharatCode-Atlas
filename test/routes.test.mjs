import test from 'node:test';
import assert from 'node:assert/strict';
import { installFetch, jsonResponse } from './helpers/mock-fetch.mjs';

delete process.env.BHARATCODE_API_KEY;
delete process.env.GITHUB_TOKEN;

const { POST: research } = await import('../app/api/research/route.js');
const { POST: forYou } = await import('../app/api/for-you/route.js');

let ipCounter = 0;
const nextIp = () => `10.0.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`;
const call = (handler, body, { ip = nextIp(), headers = {}, raw } = {}) =>
  handler(new Request('http://atlas.test/api', {
    method: 'POST',
    body: raw ?? JSON.stringify(body),
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip, ...headers },
    duplex: 'half'
  }));

// ------------------------------------------------------------------ /api/research

test('research: returns retrieved evidence and a clear message when no model is configured', async () => {
  const res = await call(research, { question: 'Which projects have the strongest RAG signals?' });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.projects.length >= 5);
  assert.equal(data.answer, null);
  assert.match(data.error, /not configured/i);
  assert.ok(!/BHARATCODE_API_KEY/.test(data.error), 'does not leak env var names');
});

test('research: invalid JSON is a 400, not a misleading catch-all', async () => {
  const res = await call(research, null, { raw: '{oops' });
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /JSON/);
});

test('research: validates the question', async () => {
  assert.equal((await call(research, { question: '   ' })).status, 400);
  assert.equal((await call(research, { question: 42 })).status, 400);
  assert.equal((await call(research, {})).status, 400);
  assert.equal((await call(research, { question: 'x'.repeat(601) })).status, 413);
});

test('research: chunked oversized body is rejected even without Content-Length', async () => {
  let sent = 0;
  const body = new ReadableStream({
    pull(c) { if (sent > 40_000) return c.close(); c.enqueue(new TextEncoder().encode('a'.repeat(2048))); sent += 2048; }
  });
  const req = new Request('http://atlas.test/api', { method: 'POST', body, headers: { 'content-type': 'application/json', 'x-forwarded-for': nextIp() }, duplex: 'half' });
  assert.equal((await research(req)).status, 413);
});

test('research: a question with no matches returns an empty, explained result', async () => {
  const res = await call(research, { question: 'zzzxqv qqqwwweee' });
  const data = await res.json();
  assert.equal(res.status, 200);
  assert.deepEqual(data.projects, []);
  assert.match(data.error, /No matching projects/);
});

test('research: per-client rate limit returns 429 with Retry-After', async () => {
  const ip = nextIp();
  for (let i = 0; i < 5; i++) assert.equal((await call(research, { question: 'security' }, { ip })).status, 200);
  const blocked = await call(research, { question: 'security' }, { ip });
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.headers.get('retry-after')) >= 1);
});

test('research: spoofing X-Forwarded-For does not reset the limit', async () => {
  const headers = (n) => ({ 'x-forwarded-for': `${n}.${n}.${n}.${n}, 172.16.0.9`, 'x-real-ip': '' });
  const results = [];
  for (let i = 1; i <= 7; i++) {
    const req = new Request('http://atlas.test/api', { method: 'POST', body: JSON.stringify({ question: 'voice' }), headers: headers(i), duplex: 'half' });
    results.push((await research(req)).status);
  }
  assert.ok(results.includes(429), 'rotating the first XFF hop must not evade the limit: ' + results);
});

// ------------------------------------------------------------------- /api/for-you

test('for-you: needs some input', async () => {
  assert.equal((await call(forYou, {})).status, 400);
  assert.equal((await call(forYou, [])).status, 400);
  assert.equal((await call(forYou, null, { raw: 'nope' })).status, 400);
});

test('for-you: rejects things that are not GitHub usernames before any network call', async () => {
  const net = installFetch(() => { throw new Error('network must not be used'); });
  try {
    for (const github of ['not a user!!', '../../etc/passwd', 'a'.repeat(80), 'https://evil.test/x']) {
      assert.equal((await call(forYou, { github })).status, 400, github);
    }
    assert.equal(net.calls.length, 0);
  } finally { net.restore(); }
});

test('for-you: free-text input yields strong matches without any GitHub call', async () => {
  const net = installFetch(() => { throw new Error('network must not be used'); });
  try {
    const res = await call(forYou, { building: 'I am building an AI voice agent for customer support', interests: ['AI Agents', 'Voice / Audio', 42, null] });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.ok(data.strongMatches.length > 0, 'strong matches must be reachable');
    assert.ok(data.recommendations.every((r) => r.score > 0));
    assert.ok(!('landscape' in data));
    assert.equal(net.calls.length, 0);
  } finally { net.restore(); }
});

test('for-you: GitHub rate limiting is reported as 503, not as "no profile found"', async () => {
  const net = installFetch(() => jsonResponse({ message: 'rate limited' }, 403, { 'x-ratelimit-remaining': '0' }));
  try {
    const res = await call(forYou, { github: 'octocat' });
    assert.equal(res.status, 503);
    assert.match((await res.json()).error, /rate limiting/i);
  } finally { net.restore(); }
});

test('for-you: unknown GitHub user is a 404', async () => {
  const net = installFetch(() => jsonResponse({ message: 'Not Found' }, 404));
  try {
    assert.equal((await call(forYou, { github: 'definitely-not-a-user' })).status, 404);
  } finally { net.restore(); }
});

test('for-you: GitHub data is used for detection but raw repositories are not echoed back', async () => {
  const net = installFetch((url) => {
    if (url.endsWith('/users/octocat')) return jsonResponse({ login: 'octocat', name: 'Octo', bio: 'I build RAG pipelines' });
    if (url.includes('/users/octocat/repos')) return jsonResponse([{ name: 'secret-private-name', description: 'vector search', language: 'Python', topics: ['rag'] }]);
    return jsonResponse({}, 404);
  });
  try {
    const res = await call(forYou, { github: 'https://github.com/octocat' });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.ok(data.detected.includes('Python'));
    assert.equal(data.github.repoCount, 1);
    assert.ok(!JSON.stringify(data).includes('secret-private-name'));
    assert.ok(data.recommendations.length > 0);
  } finally { net.restore(); }
});

test('for-you: caps profiles at 5 and rate limits per client', async () => {
  const net = installFetch((url) => (url.includes('/repos') ? jsonResponse([]) : jsonResponse({ login: 'u' })));
  try {
    const many = Array.from({ length: 12 }, (_, i) => 'user' + i);
    await call(forYou, { github: many[0], githubProfiles: many, interests: ['Security'] });
    assert.ok(net.calls.filter((u) => /\/users\/user\d+$/.test(u)).length <= 5);
    const ip = nextIp();
    let last;
    for (let i = 0; i < 11; i++) last = await call(forYou, { interests: ['Security'] }, { ip });
    assert.equal(last.status, 429);
  } finally { net.restore(); }
});

test('research: forged x-real-ip does not evade the limit (not trusted off-platform)', async () => {
  const statuses = [];
  for (let i = 1; i <= 7; i++) {
    const req = new Request('http://atlas.test/api', { method: 'POST', body: JSON.stringify({ question: 'voice' }), headers: { 'content-type': 'application/json', 'x-forwarded-for': '172.16.0.50', 'x-real-ip': `9.9.9.${i}` }, duplex: 'half' });
    statuses.push((await research(req)).status);
  }
  assert.ok(statuses.includes(429), String(statuses));
});

test('research: requires a JSON content type and rejects cross-site requests', async () => {
  const plain = new Request('http://atlas.test/api', { method: 'POST', body: '{"question":"voice"}', headers: { 'content-type': 'text/plain', 'x-forwarded-for': nextIp() }, duplex: 'half' });
  assert.equal((await research(plain)).status, 415);
  const cross = await call(research, { question: 'voice' }, { headers: { 'sec-fetch-site': 'cross-site' } });
  assert.equal(cross.status, 403);
});

test('research: a stalled body is answered with 408 and does not hold a model slot', async () => {
  const { readBodyCapped, BodyTimeoutError } = await import('../lib/http.js');
  const stalled = new Request('http://atlas.test/api', { method: 'POST', body: new ReadableStream({ start() {} }), headers: { 'content-type': 'application/json' }, duplex: 'half' });
  await assert.rejects(() => readBodyCapped(stalled, 1000, 50), BodyTimeoutError);
});

test('for-you: requires JSON content type', async () => {
  const req = new Request('http://atlas.test/api', { method: 'POST', body: '{}', headers: { 'content-type': 'text/plain', 'x-forwarded-for': nextIp() }, duplex: 'half' });
  assert.equal((await forYou(req)).status, 415);
});

test('for-you: a profile that does not exist is reported, not silently dropped', async () => {
  const net = installFetch((url) => {
    if (/\/users\/ghost-user$/.test(url)) return jsonResponse({ message: 'Not Found' }, 404);
    if (/\/users\/real-user$/.test(url)) return jsonResponse({ login: 'real-user', name: 'Real', bio: 'I build voice agents' });
    if (/\/users\/real-user\/repos/.test(url)) return jsonResponse([{ name: 'r', description: 'speech tools', language: 'Python', topics: ['voice'] }]);
    throw new Error('unexpected ' + url);
  });
  try {
    const res = await call(forYou, { githubProfiles: ['real-user', 'ghost-user'] });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body.notFound, ['ghost-user']);
    assert.deepEqual(body.github.profiles, ['real-user']);
  } finally { net.restore(); }
});
