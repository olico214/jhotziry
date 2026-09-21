import { buildMockGlb, buildMockPreview, seedFromString } from "./glb";
import * as tripo from "./tripo";

const MOCK_ESTIMATED_MS = 6000;

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
      const buffer = await tripo.downloadBuffer(task.output.generated_image_url);
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
    if (mode === "text") {
      return { stage: "image_gen", providerTaskId: `mock-${Date.now()}` };
    }
    return { stage: "model_gen", providerTaskId: `mock-model-${Date.now()}` };
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
