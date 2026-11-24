import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('next config: security headers include a CSP that does not break Next inline scripts', async () => {
  const config = (await import('../next.config.mjs')).default;
  const [{ headers }] = await config.headers();
  const csp = headers.find((h) => h.key === 'Content-Security-Policy')?.value || '';
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /object-src 'none'/);
  assert.ok(!/script-src|default-src/.test(csp), 'a script policy without nonces would block Next.js bootstrap scripts');
  assert.ok(headers.some((h) => h.key === 'X-Content-Type-Options'));
});

test('.env.example documents every variable the README lists', () => {
  const example = readFileSync(new URL('../.env.example', import.meta.url), 'utf8');
  for (const name of ['GITHUB_TOKEN', 'BHARATCODE_API_KEY', 'BHARATCODE_BASE_URL', 'BHARATCODE_MODEL', 'TRUSTED_IP_HEADER']) {
    assert.ok(example.includes(name + '='), name);
  }
});

test('the sidebar does not hardcode the project count', () => {
  const nav = readFileSync(new URL('../components/Nav.jsx', import.meta.url), 'utf8');
  assert.ok(!/\b\d{3}\s+published projects/.test(nav));
});

test('CI workflows declare permissions once at the top level', () => {
  for (const file of ['atlas-ci.yml', 'atlas-audit.yml']) {
    const text = readFileSync(new URL('../.github/workflows/' + file, import.meta.url), 'utf8');
    assert.equal((text.match(/^permissions:/gm) || []).length, 1, file);
  }
});
