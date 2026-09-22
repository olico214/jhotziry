const BASE_URL =
  process.env.TRIPO_BASE_URL || "https://openapi.tripo3d.ai/v3";

export const SUPPORTED_IMAGE_TYPES = ["png", "jpg", "jpeg", "webp"];

export function isConfigured() {
  return Boolean(process.env.TRIPO_API_KEY);
}

function apiKey() {
  const key = process.env.TRIPO_API_KEY;
  if (!key) throw new Error("TRIPO_API_KEY no configurada");
  return key;
}

export function normalizeImageType(extension) {
  const clean = String(extension || "").replace(/^\./, "").toLowerCase();
  if (clean === "jpg" || clean === "jpeg") return "jpg";
  if (clean === "webp") return "webp";
  return "png";
}

async function tripoFetch(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...options.headers,
    },
    cache: "no-store",
  });

  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!response.ok || (payload && payload.code !== 0)) {
    const message =
      payload?.message || `Tripo respondió ${response.status}`;
    throw new Error(message);
  }

  return payload?.data ?? null;
}

export async function createTextToImage({ prompt, negativePrompt }) {
  const data = await tripoFetch("/generation/text-to-image", {
    method: "POST",
    body: JSON.stringify({
      prompt,
      ...(negativePrompt ? { negative_prompt: negativePrompt } : {}),
    }),
  });
  return data.task_id;
}

export async function uploadImage({ buffer, extension }) {
  const type = normalizeImageType(extension);
  const form = new FormData();
  form.append(
    "file",
    new Blob([buffer], { type: `image/${type}` }),
    `image.${type}`,
  );
  const data = await tripoFetch("/files", { method: "POST", body: form });
  return data.file_token;
}

export async function createImageToModel({ fileToken, extension, parts = false }) {
  const type = normalizeImageType(extension);

  const body = {
    file: { type, file_token: fileToken },
    model: process.env.TRIPO_MODEL || "v3.1-20260211",
    face_limit: Number(process.env.TRIPO_FACE_LIMIT || 80000),
  };

  if (parts) {
    body.generate_parts = true;
    body.texture = false;
    body.pbr = false;
  } else {
    body.texture = process.env.TRIPO_TEXTURE !== "false";
    body.pbr = process.env.TRIPO_PBR !== "false";
  }

  const data = await tripoFetch("/generation/image-to-model", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return data.task_id;
}

export async function createImageToImage({ fileToken, prompt }) {
  const data = await tripoFetch("/generation/image-to-image", {
    method: "POST",
    body: JSON.stringify({
      input: fileToken,
      prompt,
      model: process.env.TRIPO_IMAGE_MODEL || "seedream_v5",
      size: process.env.TRIPO_IMAGE_SIZE || "2K",
    }),
  });
  return data.task_id;
}

export async function getTask(taskId) {
  const data = await tripoFetch(`/tasks/${taskId}`, { method: "GET" });
  return {
    status: data.status,
    progress: data.progress ?? 0,
    output: data.output ?? {},
    creditsConsumed: data.credits_consumed ?? 0,
    raw: data,
  };
}

export async function downloadBuffer(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`No se pudo descargar el archivo de Tripo (${response.status})`);
  }
  return Buffer.from(await response.arrayBuffer());
}
