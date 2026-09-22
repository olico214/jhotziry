const BASE_URL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
const MODEL = process.env.DEEPSEEK_MODEL || "deepseek-flash";

export function isEnhanceEnabled() {
  return (
    process.env.AI_ENHANCE !== "false" &&
    Boolean(process.env.DEEPSEEK_API_KEY)
  );
}

const SYSTEM_PROMPT = `Eres el director creativo de una plataforma de figuras 3D para impresion.
A partir de una idea o una foto, defines el diseno del modelo.

El modelo se imprimira con FILAMENTOS (FDM), asi que el diseno debe ser SIMPLE y facil de imprimir:
- Usa una paleta BASICA de 2 a 4 colores PLANOS y solidos, de alto contraste.
- Evita degradados, texturas complejas, detalles finos, transparencias y sombras realistas.
- Prefiere formas limpias y cerradas, silueta clara y fondo liso.
- Cuando aporte, disena el objeto por REGIONES DE COLOR bien separadas, pensando en que se pueda imprimir en partes con filamentos distintos.

Responde SOLO con un objeto JSON valido con esta forma exacta:
{
  "prompt": "descripcion tecnica detallada en INGLES para un generador text-to-3D: sujeto, estilo caricaturesco/stylized, pose y proporciones; incluye una paleta de 2-4 colores planos y frases como 'flat solid colors', 'minimal gradients', 'clean closed shapes', 'printable in parts by color', 'flat base for FDM printing'",
  "summary": "resumen amable en ESPANOL de maximo 140 caracteres para mostrar al usuario",
  "suggestedSize": "tamano recomendado de impresion, por ejemplo '10 cm de alto'"
}
No incluyas texto fuera del JSON.`;

async function chat(messages, { json = true, temperature = 0.7 } = {}) {
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
      temperature,
      ...(json ? { response_format: { type: "json_object" } } : {}),
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

const IDEA_SYSTEM_PROMPT = `Eres el asistente creativo de una tienda de figuras personalizadas.
Tu tarea es tomar una idea corta del cliente y convertirla en una descripcion clara y detallada de la imagen que quiere generar, para que el cliente entienda exactamente lo que necesita.

Reglas:
- Escribe en espanol, con tono calido y claro.
- Respeta siempre el estilo visual que se te indica.
- Empieza con un parrafo breve (2-3 frases) que describa la escena principal.
- Despues incluye una lista con guiones de detalles clave: sujeto, pose y expresion, ropa o accesorios, colores, fondo, estilo y un detalle especial.
- Si falta informacion, propone opciones creativas y razonables.
- No menciones que eres una IA ni pidas mas datos.
- Devuelve solo el texto, sin titulos de nivel y sin comillas envolventes.
- Maximo 180 palabras.`;

const IMAGE_EXTRA_PROMPT = `Eres director de arte de figuras para impresion.
Recibes una instruccion corta del cliente para modificar una FOTO (accesorios, ropa, escena, estilo) y debes devolverla como una instruccion tecnica en INGLES para un modelo image-to-image.

Reglas:
- Devuelve SOLO la instruccion en ingles, en una sola linea, sin comillas ni explicaciones.
- No cambies la identidad del sujeto; solo aplica los cambios pedidos.
- Maximo 40 palabras.`;

export async function enhanceImagePrompt(userPrompt) {
  const content = await chat(
    [
      { role: "system", content: IMAGE_EXTRA_PROMPT },
      { role: "user", content: `Instruccion del cliente: "${userPrompt}"` },
    ],
    { json: false, temperature: 0.5 },
  );
  return content.trim();
}

export async function expandIdea(idea, style = "cartoon") {
  const content = await chat(
    [
      { role: "system", content: IDEA_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Idea del cliente: "${idea}"\nEstilo visual deseado: ${
          STYLE_LABELS[style] || STYLE_LABELS.cartoon
        }.`,
      },
    ],
    { json: false, temperature: 0.8 },
  );
  return content.trim();
}

export async function describeImagePrompt(buffer, mime = "image/jpeg") {
  const dataUrl = `data:${mime};base64,${Buffer.from(buffer).toString("base64")}`;

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
