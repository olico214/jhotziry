import { readBuffer } from "@/lib/storage/files";

const BASE_URL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
const MODEL = process.env.DEEPSEEK_MODEL || "deepseek-flash";

const MIME_BY_EXT = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

export function isEnhanceEnabled() {
  return (
    process.env.AI_ENHANCE !== "false" &&
    Boolean(process.env.DEEPSEEK_API_KEY)
  );
}

const SYSTEM_PROMPT = `Eres el director creativo de una plataforma de modelos 3D para impresion.
A partir de una idea o una foto, defines el diseno del modelo.
Responde SOLO con un objeto JSON valido con esta forma exacta:
{
  "prompt": "descripcion tecnica detallada en INGLES para un generador text-to-3D: sujeto, estilo caricaturesco/stylized, pose, proporciones, colores y base plana para imprimir",
  "summary": "resumen amable en ESPANOL de maximo 140 caracteres para mostrar al usuario",
  "suggestedSize": "tamano recomendado de impresion, por ejemplo '10 cm de alto'"
}
No incluyas texto fuera del JSON.`;

async function chat(messages) {
  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      stream: false,
      temperature: 0.7,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}

function parseResult(content) {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content);
    if (!parsed?.prompt) return null;
    return {
      prompt: String(parsed.prompt).trim(),
      summary: parsed.summary ? String(parsed.summary).trim() : null,
      suggestedSize: parsed.suggestedSize
        ? String(parsed.suggestedSize).trim()
        : null,
    };
  } catch {
    return null;
  }
}

const STYLE_LABELS = {
  realistic: "fotorrealista / realista (NO usar estilo dibujo)",
  anime: "anime / manga japones",
  cartoon: "caricatura / dibujo animado 3D",
};

export async function enhanceTextPrompt(idea, style = "realistic") {
  const content = await chat([
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Idea del usuario: "${idea}"\nEstilo visual obligatorio: ${
        STYLE_LABELS[style] || STYLE_LABELS.realistic
      }.`,
    },
  ]);
  return parseResult(content);
}

export async function describeImagePrompt(imagePath) {
  const buffer = await readBuffer(imagePath);
  const extension = imagePath.slice(imagePath.lastIndexOf(".")).toLowerCase();
  const mime = MIME_BY_EXT[extension] || "image/jpeg";
  const dataUrl = `data:${mime};base64,${buffer.toString("base64")}`;

  const content = await chat([
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: "Analiza esta foto y define un modelo 3D caricaturesco para imprimir a partir del sujeto principal.",
        },
        { type: "image_url", image_url: { url: dataUrl, detail: "low" } },
      ],
    },
  ]);

  return parseResult(content);
}
