// Request helpers shared by the API routes.

export class BodyTooLargeError extends Error {
  constructor() {
    super('Request body too large');
    this.name = 'BodyTooLargeError';
  }
}

export class BodyTimeoutError extends Error {
  constructor() {
    super('Request body timed out');
    this.name = 'BodyTimeoutError';
  }
}

export const BODY_DEADLINE_MS = 5_000;

// Returns an error Response when the request should not be parsed at all, else null.
// Requires a JSON content type (a cross-site <form> cannot send one without a
// CORS preflight) and rejects browser-declared cross-site requests.
export function rejectUnsuitableRequest(request) {
  if (request.headers.get('sec-fetch-site') === 'cross-site') return json({ error: 'Cross-site requests are not allowed.' }, 403);
  const type = (request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (type !== 'application/json') return json({ error: 'Content-Type must be application/json.' }, 415);
  return null;
}

// Reads a request body while enforcing a byte cap on the bytes actually
// received. Content-Length is only a hint and can be absent (chunked) or wrong.
export async function readBodyCapped(request, maxBytes, deadlineMs = BODY_DEADLINE_MS) {
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) throw new BodyTooLargeError();
  if (!request.body) return '';

  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  const deadline = Date.now() + deadlineMs;
  for (;;) {
    // A client that opens the body and then stalls must not hold the request forever.
    let timer;
    const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new BodyTimeoutError()), Math.max(1, deadline - Date.now())); });
    let result;
    try {
      result = await Promise.race([reader.read(), timeout]);
    } catch (error) {
      try { await reader.cancel(); } catch { /* ignore */ }
      throw error;
    } finally {
      clearTimeout(timer);
    }
    const { done, value } = result;
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      try { await reader.cancel(); } catch { /* ignore */ }
      throw new BodyTooLargeError();
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

export async function readJsonCapped(request, maxBytes, deadlineMs) {
  const text = await readBodyCapped(request, maxBytes, deadlineMs);
  return JSON.parse(text);
}

export function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers }
  });
}
