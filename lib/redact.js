// Redaction for third-party file previews. Atlas shows snippets of other
// people's repositories, so anything that looks like a credential is masked
// before it is returned to the browser or cached.
//
// Best effort, not a guarantee. Design constraints:
//  - Linear time: input is untrusted, so no regex may backtrack quadratically.
//  - Names are matched by whole segment (API_KEY, apiKey, client-secret), not
//    substring, so "next-auth", "jsonwebtoken" and "tokenizer" are not masked.
//  - Placeholders are recognised only when the WHOLE value is a placeholder.

export const REDACTED = '[redacted]';
export const MAX_REDACT_INPUT = 60_000;
const LONG_RUN = /[A-Za-z0-9_+/=.~-]{120,}/g;

const SENSITIVE_PATH_PATTERNS = [
  /(^|\/)\.env($|\.)/i,
  /(^|\/)\.npmrc$/i,
  /(^|\/)\.netrc$/i,
  /credentials?/i,
  /secrets?/i,
  /private/i,
  /token/i,
  /\.pem$/i,
  /\.key$/i,
  /\.p12$/i,
  /\.pfx$/i,
  /\.keystore$/i,
  /(^|\/)id_(rsa|dsa|ecdsa|ed25519)/i,
  /service[-_]?account/i,
  /firebase-adminsdk/i,
  /kubeconfig/i
];

export function isSensitivePath(path) {
  return SENSITIVE_PATH_PATTERNS.some((pattern) => pattern.test(path));
}

const TOKEN_PATTERNS = [
  /-----BEGIN [A-Z ]{0,30}PRIVATE KEY-----[\s\S]{0,8000}?(?:-----END [A-Z ]{0,30}PRIVATE KEY-----|$)/g,
  /\bsk-[A-Za-z0-9_-]{20,}/g,
  /\bsk_(?:live|test)_[A-Za-z0-9]{16,}/g,
  /\bgh[pousr]_[A-Za-z0-9]{30,}/g,
  /\bgithub_pat_[A-Za-z0-9_]{30,}/g,
  /\bAIza[0-9A-Za-z_-]{30,}/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}/g,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g,
  /\b(?:Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{8,}/g
];

// scheme://user:password@host
const URL_CREDENTIALS = /\b([a-z][a-z0-9+.-]{0,20}:\/\/[^\s:/@]{1,100}):([^\s@/]{1,200})@/gi;

// ------------------------------------------------------------- name classification

const STRONG = new Set([
  'password', 'passwd', 'pwd', 'passphrase', 'secret', 'token', 'credential', 'credentials', 'authorization',
  'apikey', 'privatekey', 'accesskey', 'secretkey', 'clientsecret', 'dsn', 'connectionstring', 'bearer'
]);
const WEAK = new Set(['key', 'auth']);

function segments(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

// 'strong' names are redacted for any plausible value; 'weak' names (a bare
// "key" or "auth") only when the value looks like a real key.
function nameKind(name) {
  const segs = segments(name);
  let weak = false;
  for (let i = 0; i < segs.length; i++) {
    if (STRONG.has(segs[i])) return 'strong';
    if (i + 1 < segs.length && (STRONG.has(segs[i] + segs[i + 1]) || STRONG.has(segs[i + 1] + segs[i]))) return 'strong';
    if (WEAK.has(segs[i])) weak = true;
  }
  return weak ? 'weak' : null;
}

// ----------------------------------------------------------------- value checks

const SEMVER = /^[~^<>=v]*\d+\.[\dx*]+(?:\.[\dx*]+)?(?:[-+][\w.]+)?$/i;
const WHOLE_PLACEHOLDER = [
  /^\$\{?[A-Za-z_][A-Za-z0-9_]*\}?$/,          // $VAR or ${VAR}
  /^<[^<>]{0,80}>$/,                              // <your-secret>
  /^\{\{[^}]{0,80}\}\}$/,                         // {{ secret }}
  /^%[^%]{1,60}%$/,                               // %VAR%
  /^your[_-][a-z_-]{1,60}$/i,                     // your_api_key_here
  /^x{3,}$/i,
  /^\*{3,}$/,
  /^(?:changeme|change-me|example|placeholder|todo|null|none|undefined|true|false|\[redacted\])$/i
];
const CODE_REFERENCE = /^(?:process\.env|os\.environ|os\.getenv|getenv\(|env\(|import\.meta\.env|System\.getenv)/;

function isPlaceholder(value) {
  // Already masked by an earlier pass (the value regex stops before the closing bracket).
  if (value.startsWith('[redacted')) return true;
  return CODE_REFERENCE.test(value) || WHOLE_PLACEHOLDER.some((pattern) => pattern.test(value));
}

function shouldRedact(kind, value) {
  if (!value || isPlaceholder(value) || SEMVER.test(value)) return false;
  if (kind === 'strong') return value.length >= 3 && !(/^\d+$/.test(value) && value.length < 6);
  // weak: needs to look like a key (length and a digit)
  return value.length >= 8 && /\d/.test(value);
}

// name = value, "name": "value", name: value. Bounded repetitions keep matching
// linear. Quoted values may contain spaces.
const ASSIGNMENT = /(["']?)([A-Za-z_][A-Za-z0-9_.-]{0,60})\1(\s{0,4}[:=]\s{0,4})(?:"([^"\n]{1,200})"|'([^'\n]{1,200})'|([^\s"'#,;}\]]{3,200}))/g;

// Dockerfile: ENV NAME value / ARG NAME value (the "=" form is handled above).
const DOCKER_SPACE_FORM = /^(\s{0,8}(?:ENV|ARG)\s{1,8})([A-Za-z_][A-Za-z0-9_]{0,60})(\s{1,8})([^\s=][^\n]{0,200})$/gim;

export function redactSecrets(text) {
  if (!text) return text;
  let out = String(text).slice(0, MAX_REDACT_INPUT);

  // Very long unbroken runs (base64 blobs, data URIs, minified keys) are never
  // useful in a preview and are the classic trigger for slow regexes.
  out = out.replace(LONG_RUN, '[redacted: long value]');

  for (const pattern of TOKEN_PATTERNS) out = out.replace(pattern, REDACTED);
  out = out.replace(URL_CREDENTIALS, (_m, prefix) => prefix + ':' + REDACTED + '@');

  out = out.replace(DOCKER_SPACE_FORM, (match, head, name, space, value) => {
    const kind = nameKind(name);
    return kind && shouldRedact(kind, value.trim()) ? head + name + space + REDACTED : match;
  });

  return redactAssignments(out, 0);
}

// A non-sensitive name can wrap a sensitive assignment, e.g. "start": "API_KEY=abc node x".
// Quoted values of such names are rescanned one level deep.
function redactAssignments(text, depth) {
  return text.replace(ASSIGNMENT, (match, nameQuote, name, separator, dq, sq, bare) => {
    const kind = nameKind(name);
    const quote = dq !== undefined ? '"' : sq !== undefined ? "'" : '';
    const value = dq ?? sq ?? bare;
    if (!kind) {
      if (!quote || depth >= 1) return match;
      const inner = redactAssignments(value, depth + 1);
      return inner === value ? match : nameQuote + name + nameQuote + separator + quote + inner + quote;
    }
    if (!shouldRedact(kind, value)) return match;
    return nameQuote + name + nameQuote + separator + quote + REDACTED + quote;
  });
}
