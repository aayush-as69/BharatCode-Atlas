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

// Which header identifies the client depends on the deployment, and a header
// the platform does not overwrite can be forged by the caller:
//  - TRUSTED_IP_HEADER names a header your own proxy/CDN always sets (e.g. cf-connecting-ip).
//  - On Vercel (VERCEL is set) x-vercel-forwarded-for / x-real-ip are set by the platform.
//  - Otherwise only the LAST x-forwarded-for hop (appended by the nearest proxy)
//    is used. x-real-ip is NOT trusted there because clients can send it directly.
export function getClientKey(headers, env = process.env) {
  const get = (name) => (typeof headers.get === 'function' ? headers.get(name) : headers[name]);
  const first = (value) => String(value).split(',')[0].trim();

  const trusted = env.TRUSTED_IP_HEADER && get(String(env.TRUSTED_IP_HEADER).toLowerCase());
  if (trusted && first(trusted)) return first(trusted);

  if (env.VERCEL) {
    const platform = get('x-vercel-forwarded-for') || get('x-real-ip');
    if (platform && first(platform)) return first(platform);
  }

  const forwarded = get('x-forwarded-for');
  if (forwarded) {
    const hops = String(forwarded).split(',').map((x) => x.trim()).filter(Boolean);
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
