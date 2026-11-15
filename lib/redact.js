// Redaction for third-party file previews. Atlas shows snippets of other
// people's repositories, so anything that looks like a credential is masked
// before it is returned to the browser or cached.

export const REDACTED = '[redacted]';

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
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)/g,
  /\bsk-[A-Za-z0-9_-]{20,}/g,
  /\bsk_(?:live|test)_[A-Za-z0-9]{16,}/g,
  /\bgh[pousr]_[A-Za-z0-9]{30,}/g,
  /\bgithub_pat_[A-Za-z0-9_]{30,}/g,
  /\bAIza[0-9A-Za-z_-]{30,}/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}/g,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{16,}/g
];

// scheme://user:password@host
const URL_CREDENTIALS = /\b([a-z][a-z0-9+.-]*:\/\/[^\s:/@]+):([^\s@/]+)@/gi;

// KEY=value, "key": "value", key: value where the name suggests a secret.
const ASSIGNMENT = /(["']?)([A-Za-z0-9_.-]*(?:key|secret|token|password|passwd|pwd|credential|auth(?!or)|private|dsn|connection[_-]?string)[A-Za-z0-9_.-]*)\1(\s*[:=]\s*)(["']?)([^\s"'#,;}\]]{6,})\4/gi;

const PLACEHOLDER = /^(?:your[_-]|<|\$|%|\{\{|x{3,}|\*{3,}|changeme|change[-_]me|example|placeholder|todo|process\.env|os\.environ|env\(|getenv|import\.meta|null$|none$|undefined$|true$|false$)/i;

function looksLikePlaceholder(value) {
  return PLACEHOLDER.test(value);
}

export function redactSecrets(text) {
  if (!text) return text;
  let out = String(text);
  for (const pattern of TOKEN_PATTERNS) out = out.replace(pattern, REDACTED);
  out = out.replace(URL_CREDENTIALS, (_m, prefix) => prefix + ':' + REDACTED + '@');
  out = out.replace(ASSIGNMENT, (match, nameQuote, name, separator, valueQuote, value) => {
    if (looksLikePlaceholder(value) || value === REDACTED) return match;
    return nameQuote + name + nameQuote + separator + valueQuote + REDACTED + valueQuote;
  });
  return out;
}
