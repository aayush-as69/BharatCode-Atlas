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

test('does not mangle ordinary manifests (dependency names that contain auth/token/key)', () => {
  const pkg = '{"name":"app","scripts":{"dev":"next dev"},"dependencies":{"next":"15.5.29","author-tools":"^1.0.0","next-auth":"^4.24.0","jsonwebtoken":"^9.0.1","keyv":"~5.0.0"}}';
  assert.equal(redactSecrets(pkg), pkg);
  for (const line of ['monkey: banana-split', 'sortKey: "createdAt"', 'tokenizer: "bert-base"', 'max_tokens: 2048', '"private": true']) {
    assert.equal(redactSecrets(line), line, line);
  }
});

test('masks short passwords, quoted values with spaces, and placeholder-prefixed secrets', () => {
  for (const line of [
    'POSTGRES_PASSWORD=admin', 'password: root', 'DB_PASSWORD=pass1', 'password="p w d x y z"',
    '"authorization": "abcdefghijk"', 'PASSWORD=$uper$ecret99', 'secret=examplesecretvalue'
  ]) {
    const out = redactSecrets(line);
    assert.ok(out.includes(REDACTED), line + ' -> ' + out);
  }
  for (const secret of ['admin', 'root', 'pass1', 'p w d x y z', 'abcdefghijk', 'uper', 'examplesecretvalue']) {
    for (const line of ['POSTGRES_PASSWORD=admin', 'password: root', 'DB_PASSWORD=pass1', 'password="p w d x y z"', '"authorization": "abcdefghijk"', 'PASSWORD=$uper$ecret99', 'secret=examplesecretvalue']) {
      if (line.includes(secret)) assert.ok(!redactSecrets(line).includes(secret), line);
    }
  }
});

test('masks Basic/Bearer authorization headers cleanly', () => {
  assert.equal(redactSecrets('Authorization: Basic dXNlcjpwYXNzd29yZA=='), 'Authorization: ' + REDACTED);
  assert.ok(!redactSecrets('Authorization: Bearer abcdefghijklmnop1234').includes('abcdefghijkl'));
});

test('masks Dockerfile ENV/ARG in both forms', () => {
  assert.equal(redactSecrets('ENV API_TOKEN abcdef123456ZZ'), 'ENV API_TOKEN ' + REDACTED);
  assert.equal(redactSecrets('ARG SECRET_KEY=abcdef123456'), 'ARG SECRET_KEY=' + REDACTED);
  assert.equal(redactSecrets('ENV NODE_ENV production'), 'ENV NODE_ENV production');
});

test('runs in linear time on adversarial input (no ReDoS)', () => {
  const inputs = [
    'a'.repeat(100_000), 'a-'.repeat(50_000), 'key'.repeat(30_000), 'a=a'.repeat(30_000), '"'.repeat(80_000),
    'k:'.repeat(40_000), ('A_'.repeat(30) + '=').repeat(2000), '-----BEGIN PRIVATE KEY-----' + 'A'.repeat(50_000),
    ' '.repeat(80_000) + 'password:', 'ENV ' + 'A'.repeat(50_000)
  ];
  for (const input of inputs) {
    const start = performance.now();
    redactSecrets(input);
    assert.ok(performance.now() - start < 500, 'slow on input starting ' + JSON.stringify(input.slice(0, 20)));
  }
});

test('very long blobs are collapsed rather than shown', () => {
  const out = redactSecrets('data:image/png;base64,' + 'A'.repeat(500));
  assert.ok(!out.includes('AAAAAAAAAA'));
});

test('sensitive paths are recognised', () => {
  for (const p of ['.env', '.env.production', 'config/secrets.json', 'keys/server.pem', 'id_rsa', 'firebase-adminsdk-abc.json']) {
    assert.ok(isSensitivePath(p), p);
  }
  for (const p of ['package.json', 'src/index.js', 'README.md']) {
    assert.equal(isSensitivePath(p), false, p);
  }
});

test('redact: sensitive assignment nested inside a quoted value', () => {
  const out = redactSecrets('{"scripts":{"start":"API_KEY=abcdef123456ZZ node server.js"}}');
  assert.ok(!out.includes('abcdef123456ZZ'), out);
  assert.ok(out.includes('node server.js'), 'surrounding command is kept');
});
