import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function generateToken() {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token) {
  return createHash("sha256")
    .update(`${token}.${process.env.AUTH_SECRET || "jhotziry-dev"}`)
    .digest("hex");
}

export function safeEqual(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
