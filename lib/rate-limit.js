// Small in-memory sliding-window rate limiter plus client-key and concurrency
// helpers. State is per server instance: on serverless platforms each instance
// has its own counters, so this is a best-effort guard, not a global quota.

export function createRateLimiter({ windowMs, max, maxKeys = 5000 }) {
  const log = new Map();

  function sweep(now) {
    for (const [key, stamps] of log) {
      if (!stamps.some((t) => now - t < windowMs)) log.delete(key);
    }
    // Still too large (many active keys): drop oldest-inserted entries.
    while (log.size > maxKeys) {
      log.delete(log.keys().next().value);
    }
  }

  return {
    check(key, now = Date.now()) {
      const recent = (log.get(key) || []).filter((t) => now - t < windowMs);
      if (recent.length >= max) {
        log.set(key, recent);
        return { allowed: false, retryAfter: Math.max(1, Math.ceil((windowMs - (now - recent[0])) / 1000)) };
      }
      recent.push(now);
      log.set(key, recent);
      if (log.size > maxKeys) sweep(now);
      return { allowed: true, retryAfter: 0 };
    },
    size: () => log.size
  };
}

// Prefer headers that the hosting platform sets itself. A client-supplied
// X-Forwarded-For is only trusted for its LAST hop (appended by the nearest
// proxy); the first entry can be forged by the caller.
export function getClientKey(headers) {
  const get = (name) => (typeof headers.get === 'function' ? headers.get(name) : headers[name]);
  const platform = get('x-vercel-forwarded-for') || get('x-real-ip');
  if (platform) return String(platform).split(',')[0].trim() || 'unknown';
  const forwarded = get('x-forwarded-for');
  if (forwarded) {
    const hops = String(forwarded).split(',').map((s) => s.trim()).filter(Boolean);
    if (hops.length) return hops[hops.length - 1];
  }
  return 'unknown';
}

// Concurrency gate. acquire() is synchronous, so the check and the increment
// cannot be separated by an await.
export function createGate(maxConcurrent) {
  let active = 0;
  return {
    acquire() {
      if (active >= maxConcurrent) return null;
      active += 1;
      let released = false;
      return () => {
        if (released) return;
        released = true;
        active = Math.max(0, active - 1);
      };
    },
    active: () => active
  };
}
