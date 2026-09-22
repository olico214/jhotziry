import { NextResponse } from "next/server";

const store = (globalThis.__jhoRate ??= new Map());

export function getClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  return "local";
}

export function rateLimit({ key, limit, windowMs }) {
  const now = Date.now();
  const entry = store.get(key) ?? { hits: [] };

  entry.hits = entry.hits.filter((time) => now - time < windowMs);

  if (entry.hits.length >= limit) {
    const retryAfter = Math.max(
      1,
      Math.ceil((windowMs - (now - entry.hits[0])) / 1000),
    );
    store.set(key, entry);
    return { ok: false, retryAfter, remaining: 0 };
  }

  entry.hits.push(now);
  store.set(key, entry);
  return { ok: true, remaining: limit - entry.hits.length };
}

export function rateLimitResponse(retryAfter) {
  return NextResponse.json(
    {
      error: "Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.",
    },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}

export function limitByIp(request, name, limit, windowMs) {
  const result = rateLimit({
    key: `${name}:${getClientIp(request)}`,
    limit,
    windowMs,
  });
  return result.ok ? null : rateLimitResponse(result.retryAfter);
}

export function limitByKey(name, key, limit, windowMs) {
  const result = rateLimit({
    key: `${name}:${key}`,
    limit,
    windowMs,
  });
  return result.ok ? null : rateLimitResponse(result.retryAfter);
}

if (!globalThis.__jhoRateCleanup) {
  globalThis.__jhoRateCleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      entry.hits = entry.hits.filter((time) => now - time < 24 * 60 * 60 * 1000);
      if (entry.hits.length === 0) store.delete(key);
    }
  }, 10 * 60 * 1000);
  if (typeof globalThis.__jhoRateCleanup.unref === "function") {
    globalThis.__jhoRateCleanup.unref();
  }
}
