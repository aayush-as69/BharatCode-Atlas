import test from 'node:test';
import assert from 'node:assert/strict';
import { redactSecrets, isSensitivePath, REDACTED } from '../lib/redact.js';

// All values below are obviously fake and built at runtime.
const fakeOpenAI = 'sk-' + 'A1b2'.repeat(8);
const fakeGh = 'ghp_' + 'x9Y8'.repeat(10);
const fakeAws = 'AKIA' + 'ABCDEFGHIJKLMNOP';

test('masks well-known token formats', () => {
  for (const secret of [fakeOpenAI, fakeGh, fakeAws, 'AIza' + 'Sy'.repeat(18)]) {
    const out = redactSecrets(`const key = "${secret}";`);
    assert.ok(!out.includes(secret), 'secret leaked: ' + secret.slice(0, 6));
    assert.ok(out.includes(REDACTED));
  }
});

test('masks KEY=value and JSON-style assignments', () => {
  assert.equal(redactSecrets('OPENAI_API_KEY=abcdef123456'), 'OPENAI_API_KEY=' + REDACTED);
  assert.ok(!redactSecrets('{"client_secret": "supersecretvalue1"}').includes('supersecretvalue1'));
  assert.ok(!redactSecrets('password: hunter2hunter2').includes('hunter2hunter2'));
});

test('masks credentials embedded in URLs and private key blocks', () => {
  const out = redactSecrets('mongodb://admin:pa55w0rd@cluster.example.com/db');
  assert.ok(!out.includes('pa55w0rd'));
  assert.ok(out.includes('cluster.example.com'));
  const pem = '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkq\n-----END PRIVATE KEY-----';
  assert.ok(!redactSecrets(pem).includes('MIIEvQ'));
});

test('keeps placeholders and env references readable', () => {
  for (const line of ['API_KEY=your_api_key_here', 'TOKEN=process.env.TOKEN', 'SECRET=<your-secret>', 'KEY=${KEY}', 'PASSWORD=changeme']) {
    assert.equal(redactSecrets(line), line);
  }
});

test('does not mangle ordinary manifests', () => {
  const pkg = '{"name":"app","scripts":{"dev":"next dev"},"dependencies":{"next":"15.5.29","author-tools":"^1.0.0"}}';
  assert.equal(redactSecrets(pkg), pkg);
});

test('sensitive paths are recognised', () => {
  for (const p of ['.env', '.env.production', 'config/secrets.json', 'keys/server.pem', 'id_rsa', 'firebase-adminsdk-abc.json']) {
    assert.ok(isSensitivePath(p), p);
  }
  for (const p of ['.env.example'.replace('.env.example', 'package.json'), 'src/index.js', 'README.md']) {
    assert.equal(isSensitivePath(p), false, p);
  }
});
