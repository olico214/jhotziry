export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const { ensureRunner } = await import("./lib/jobs/runner");
  ensureRunner();
}
