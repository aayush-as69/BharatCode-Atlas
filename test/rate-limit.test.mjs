import test from 'node:test';
import assert from 'node:assert/strict';
import { createRateLimiter, createGate, getClientKey } from '../lib/rate-limit.js';

test('limiter allows up to max per window then blocks with Retry-After', () => {
  const limiter = createRateLimiter({ windowMs: 60_000, max: 3 });
  const t = 1_000_000;
  for (let i = 0; i < 3; i++) assert.equal(limiter.check('a', t + i).allowed, true);
  const blocked = limiter.check('a', t + 10);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfter >= 1 && blocked.retryAfter <= 60);
  assert.equal(limiter.check('b', t + 10).allowed, true, 'other keys are independent');
  assert.equal(limiter.check('a', t + 61_000).allowed, true, 'window slides');
});

test('limiter memory stays bounded', () => {
  const limiter = createRateLimiter({ windowMs: 60_000, max: 5, maxKeys: 100 });
  for (let i = 0; i < 1000; i++) limiter.check('ip-' + i, 1_000_000 + i);
  assert.ok(limiter.size() <= 101, 'size ' + limiter.size());
});

test('client key ignores a forged leftmost X-Forwarded-For hop', () => {
  const h = (o) => new Headers(o);
  assert.equal(getClientKey(h({ 'x-forwarded-for': '1.1.1.1, 9.9.9.9' })), '9.9.9.9');
  assert.equal(getClientKey(h({ 'x-forwarded-for': '6.6.6.6, 9.9.9.9' })), '9.9.9.9', 'spoofing the first hop does not change the key');
  assert.equal(getClientKey(h({ 'x-vercel-forwarded-for': '2.2.2.2', 'x-forwarded-for': '6.6.6.6' })), '2.2.2.2');
  assert.equal(getClientKey(h({ 'x-real-ip': '3.3.3.3' })), '3.3.3.3');
  assert.equal(getClientKey(h({})), 'unknown');
});

test('gate is synchronous: no more than N holders, release is idempotent', () => {
  const gate = createGate(2);
  const a = gate.acquire();
  const b = gate.acquire();
  assert.ok(a && b);
  assert.equal(gate.acquire(), null);
  a(); a();
  assert.equal(gate.active(), 1);
  assert.ok(gate.acquire());
});
