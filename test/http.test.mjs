import test from 'node:test';
import assert from 'node:assert/strict';
import { readBodyCapped, readJsonCapped, BodyTooLargeError, json } from '../lib/http.js';

const post = (body, headers = {}) => new Request('http://x.test/api', { method: 'POST', body, headers, duplex: 'half' });

function chunked(totalBytes, chunk = 1024) {
  let sent = 0;
  return new ReadableStream({
    pull(controller) {
      if (sent >= totalBytes) return controller.close();
      const n = Math.min(chunk, totalBytes - sent);
      controller.enqueue(new Uint8Array(n).fill(97));
      sent += n;
    }
  });
}

test('reads a small body', async () => {
  assert.equal(await readBodyCapped(post('{"a":1}'), 100), '{"a":1}');
  assert.deepEqual(await readJsonCapped(post('{"a":1}'), 100), { a: 1 });
});

test('rejects an oversized declared Content-Length', async () => {
  await assert.rejects(readBodyCapped(post('x'.repeat(50), { 'content-length': '50' }), 10), BodyTooLargeError);
});

test('rejects an oversized chunked body that has no Content-Length', async () => {
  const req = new Request('http://x.test/api', { method: 'POST', body: chunked(50_000), duplex: 'half' });
  assert.equal(req.headers.get('content-length'), null);
  await assert.rejects(readBodyCapped(req, 8192), BodyTooLargeError);
});

test('a lying Content-Length cannot bypass the cap', async () => {
  const req = new Request('http://x.test/api', { method: 'POST', body: chunked(20_000), headers: { 'content-length': '5' }, duplex: 'half' });
  await assert.rejects(readBodyCapped(req, 8192), BodyTooLargeError);
});

test('invalid JSON throws a normal error, not BodyTooLarge', async () => {
  await assert.rejects(readJsonCapped(post('{nope'), 100), (e) => !(e instanceof BodyTooLargeError));
});

test('json() sets status, content type and no-store', async () => {
  const res = json({ ok: true }, 429, { 'Retry-After': '5' });
  assert.equal(res.status, 429);
  assert.equal(res.headers.get('retry-after'), '5');
  assert.equal(res.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await res.json(), { ok: true });
});
