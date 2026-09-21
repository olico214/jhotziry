import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

function rootDir() {
  return path.resolve(process.cwd(), process.env.STORAGE_DIR || "./.data");
}

export function resolveStoragePath(relative) {
  const root = rootDir();
  const full = path.resolve(root, relative);
  if (full !== root && !full.startsWith(root + path.sep)) {
    throw new Error("Ruta de almacenamiento inválida");
  }
  return full;
}

export async function saveBuffer(relative, data) {
  const full = resolveStoragePath(relative);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, data);
  return relative;
}

export async function readBuffer(relative) {
  return readFile(resolveStoragePath(relative));
}

export function extensionFor(file) {
  const name = file?.name || "";
  const ext = path.extname(name).toLowerCase();
  if (ext && ext.length <= 6) return ext;
  const type = file?.type || "";
  if (type.includes("png")) return ".png";
  if (type.includes("jpeg") || type.includes("jpg")) return ".jpg";
  if (type.includes("webp")) return ".webp";
  return ".bin";
}

const CONTENT_TYPES = {
  ".glb": "model/gltf-binary",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

export function contentTypeFor(relative) {
  const ext = path.extname(relative || "").toLowerCase();
  return CONTENT_TYPES[ext] || "application/octet-stream";
}
