// Installs a fake global fetch for a test file and records every URL requested.
export function installFetch(handler) {
  const real = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push(String(url));
    return handler(String(url), init);
  };
  return { calls, restore: () => { globalThis.fetch = real; } };
}

export const jsonResponse = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });

export const b64 = (text) => Buffer.from(text, 'utf8').toString('base64');
