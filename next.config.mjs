/** @type {import('next').NextConfig} */
const baseHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const mediaOrigins = [
  process.env.S3_PUBLIC_BASE_URL,
  process.env.S3_ENDPOINT,
]
  .filter(Boolean)
  .map((value) => {
    try {
      return new URL(value).origin;
    } catch {
      return null;
    }
  })
  .filter(Boolean);

const imgSrc = ["'self'", "data:", "blob:", ...new Set(mediaOrigins)].join(" ");

const csp = [
  "default-src 'self'",
  `img-src ${imgSrc}`,
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig = {
  async headers() {
    const headers = [...baseHeaders];
    headers.push({
      key: "Content-Security-Policy-Report-Only",
      value: csp,
    });

    if (process.env.NODE_ENV === "production") {
      headers.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains",
      });
    }

    return [{ source: "/:path*", headers }];
  },
};

export default nextConfig;
