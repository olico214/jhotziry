import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

function readConfig() {
  const endpoint = process.env.S3_ENDPOINT;
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) return null;

  const cleanEndpoint = endpoint.replace(/\/+$/, "");

  return {
    endpoint: cleanEndpoint,
    bucket,
    region: process.env.S3_REGION || "us-east-1",
    forcePathStyle: (process.env.S3_FORCE_PATH_STYLE || "true") !== "false",
    credentials: { accessKeyId, secretAccessKey },
    publicBaseUrl: (
      process.env.S3_PUBLIC_BASE_URL || `${cleanEndpoint}/${bucket}`
    ).replace(/\/+$/, ""),
  };
}

let cachedClient = null;

function getClient(config) {
  if (!cachedClient) {
    cachedClient = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: config.forcePathStyle,
      credentials: config.credentials,
    });
  }
  return cachedClient;
}

export function isObjectStoreConfigured() {
  return Boolean(readConfig());
}

async function bodyToBuffer(body) {
  if (!body) return Buffer.alloc(0);
  if (Buffer.isBuffer(body)) return body;
  const chunks = [];
  for await (const chunk of body) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

export async function putObject(key, body, contentType) {
  const config = readConfig();
  if (!config) throw new Error("Object store no configurado");

  await getClient(config).send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: body,
      ContentType: contentType || "application/octet-stream",
    }),
  );
  return key;
}

export async function getObject(key) {
  const config = readConfig();
  if (!config) throw new Error("Object store no configurado");

  const result = await getClient(config).send(
    new GetObjectCommand({ Bucket: config.bucket, Key: key }),
  );

  return {
    buffer: await bodyToBuffer(result.Body),
    contentType: result.ContentType || "application/octet-stream",
  };
}

export async function deleteObject(key) {
  const config = readConfig();
  if (!config) return;
  await getClient(config).send(
    new DeleteObjectCommand({ Bucket: config.bucket, Key: key }),
  );
}

export function buildPublicUrl(key) {
  const config = readConfig();
  if (!config || !key) return null;
  return `${config.publicBaseUrl}/${key}`;
}

export function draftSourceKey(draftId, extension) {
  const ext = String(extension || "png").replace(/^\./, "").toLowerCase();
  return `drafts/${draftId}/source.${ext}`;
}

export function draftPreviewKey(draftId, extension = "png") {
  const ext = String(extension || "png").replace(/^\./, "").toLowerCase();
  return `drafts/${draftId}/preview.${ext}`;
}

export function postImageKey(postId, extension) {
  const ext = String(extension || "png").replace(/^\./, "").toLowerCase();
  return `posts/${postId}/image.${ext}`;
}

export function orderClientPhotoKey(orderId, extension) {
  const ext = String(extension || "png").replace(/^\./, "").toLowerCase();
  return `orders/${orderId}/client-photo.${ext}`;
}
