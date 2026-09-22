import { buildMockGlb, buildMockPreview, seedFromString } from "./glb";
import * as tripo from "./tripo";

const MOCK_ESTIMATED_MS = 6000;

const CARICATURE_PROMPT =
  "Transform this photo into a cute 3D cartoon caricature of the same subject. " +
  "Keep the subject recognizable: same identity, hairstyle, clothing and colors, " +
  "but exaggerate the proportions in a fun way (slightly bigger head, expressive eyes, " +
  "friendly smile). Smooth pastel colors, soft studio lighting, clean simple background, " +
  "stylized collectible figurine look ready to be turned into a 3D printable model. " +
  "Do not change who the subject is.";

function tripoEnabled() {
  const configured = (process.env.AI_PROVIDER || "mock") === "tripo";
  return configured && tripo.isConfigured();
}

const tripoProvider = {
  name: "tripo",

  async start({ mode, prompt, imageBuffer, imageExtension }) {
    if (mode === "text") {
      const taskId = await tripo.createTextToImage({ prompt });
      return { stage: "image_gen", providerTaskId: taskId };
    }

    const fileToken = await tripo.uploadImage({
      buffer: imageBuffer,
      extension: imageExtension,
    });

    if (mode === "image_style") {
      const finalPrompt = prompt
        ? `${CARICATURE_PROMPT} Additional instructions from the user (apply them while keeping the caricature style and the same subject): ${prompt}`
        : CARICATURE_PROMPT;
      const taskId = await tripo.createImageToImage({
        fileToken,
        prompt: finalPrompt,
      });
      return { stage: "image_gen", providerTaskId: taskId };
    }

    const taskId = await tripo.createImageToModel({
      fileToken,
      extension: imageExtension,
    });
    return { stage: "model_gen", providerTaskId: taskId };
  },

  async step({ stage, providerTaskId }) {
    const task = await tripo.getTask(providerTaskId);

    if (task.status === "queued" || task.status === "running") {
      return { status: "processing", progress: task.progress };
    }

    if (task.status !== "success") {
      return {
        status: "failed",
        progress: 0,
        error: `Tripo devolvió el estado "${task.status}"`,
      };
    }

    if (stage === "image_gen") {
      const url =
        task.output.generated_image_url || task.output.model_url || null;
      const buffer = await tripo.downloadBuffer(url);
      return {
        status: "succeeded",
        progress: 100,
        previewBuffer: buffer,
        previewExtension: "png",
      };
    }

    const buffer = await tripo.downloadBuffer(task.output.model_url);
    return {
      status: "succeeded",
      progress: 100,
      modelBuffer: buffer,
      modelExtension: "glb",
    };
  },
};

const mockProvider = {
  name: "mock",
  estimatedMillis: MOCK_ESTIMATED_MS,

  async start({ mode }) {
    if (mode === "model") {
      return { stage: "model_gen", providerTaskId: `mock-model-${Date.now()}` };
    }
    return { stage: "image_gen", providerTaskId: `mock-${mode}-${Date.now()}` };
  },

  async step({ stage, prompt, elapsedMs }) {
    const progress = Math.min(
      99,
      Math.round((elapsedMs / MOCK_ESTIMATED_MS) * 100),
    );

    if (elapsedMs < MOCK_ESTIMATED_MS) {
      return { status: "processing", progress };
    }

    if (stage === "image_gen") {
      const seed = seedFromString(prompt || "preview");
      return {
        status: "succeeded",
        progress: 100,
        previewBuffer: buildMockPreview({ prompt, hueShift: (seed % 7) * 6 }),
        previewExtension: "svg",
      };
    }

    return {
      status: "succeeded",
      progress: 100,
      modelBuffer: buildMockGlb({ seed: seedFromString(prompt || "model") }),
      modelExtension: "glb",
    };
  },
};

export function getProviderName() {
  return tripoEnabled() ? "tripo" : "mock";
}

export function getProvider() {
  return tripoEnabled() ? tripoProvider : mockProvider;
}
