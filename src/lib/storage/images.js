import path from "node:path";

const MIME_BY_EXTENSION = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".gif": "image/gif",
};

export function mimeFromExtension(extension) {
  const clean = `.${String(extension || "").replace(/^\./, "").toLowerCase()}`;
  return MIME_BY_EXTENSION[clean] || "application/octet-stream";
}

export function mimeFromPath(filePath) {
  return mimeFromExtension(path.extname(filePath || ""));
}

export function imageRecordFromBuffer(buffer, mime) {
  return {
    mime: mime || "application/octet-stream",
    data: Buffer.from(buffer).toString("base64"),
  };
}

export function bufferFromImageRecord(record) {
  if (!record?.data) return null;
  return Buffer.from(record.data, "base64");
}
