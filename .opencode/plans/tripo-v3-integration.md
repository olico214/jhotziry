# Plan — Integración Tripo3D V3 (texto→imagen→3D e imagen→3D)

> Estado: listo para implementar. Toda la API V3 fue verificada en vivo con la clave del usuario.

## 1. Contexto y decisiones

- La web (Next.js) ya está construida: landing, cotización en Postgres, `/crear`, visor 3D R3F y auth diferida con magic link.
- Se reemplaza el generador `mock` por **Tripo3D V3** como motor real.
- **Flujo texto:** DeepSeek enriquece el prompt → **Tripo `text-to-image`** → se muestra la imagen intermedia → **Tripo `image-to-model`** → GLB.
- **Flujo imagen:** DeepSeek (visión) describe la foto → subir a Tripo → **`image-to-model`** → GLB.
- **Fallback a `mock`** si falta `TRIPO_API_KEY`, hay error o no hay saldo.
- Se usa **V3** (`https://openapi.tripo3d.ai/v3`): V2 entra en mantenimiento 2026-10-01 y se apaga 2026-11-01.

## 2. API Tripo V3 verificada en vivo

Base: `https://openapi.tripo3d.ai/v3`
Auth: header `Authorization: Bearer <TRIPO_API_KEY>`

### 2.1 Texto → imagen
```
POST /v3/generation/text-to-image
{ "prompt": "...", "negative_prompt": "..." }   // negative opcional
-> 200 { "code":0, "data": { "task_id": "..." } }
```
Resultado (`GET /v3/tasks/{id}`):
```
output.generated_image_url
```
Costo verificado: **5 créditos**. Modelo interno observado: `seedream_v4`.

### 2.2 Subida de imagen (rápida, multipart)
```
POST /v3/files        (multipart/form-data, campo "file")
-> { "code":0, "data": { "file_token": "file_..." } }
```
Alternativa (presign S3): `POST /v3/files/presign` `{ "format":"png" }` → `{ presigned_url }`.
Acepta webp/jpeg/png, ≤20 MB.

### 2.3 Imagen → modelo
```
POST /v3/generation/image-to-model
{
  "file": { "type": "png", "file_token": "file_..." },
  "model": "v3.1-20260211",
  "texture": true,
  "pbr": true,
  "face_limit": 80000
}
-> { "code":0, "data": { "task_id": "..." } }
```
Resultado:
```
output.model_url            // GLB con textura/PBR
output.rendered_image_url   // preview webp
```
Costo verificado: **30 créditos** (texture+pbr, v3.1). `texture:false` resta ~10 créditos.

### 2.4 Consulta de tarea
```
GET /v3/tasks/{task_id}
-> { "data": { "status", "progress", "output": {...}, "credits_consumed", ... } }
```
`status`: `queued` | `running` | `success` | `failed` | `banned` | `expired` | `cancelled` | `unknown`.
`progress`: 0–100.
Las URLs de salida **caducan a los 5 minutos** → descargar y guardar de inmediato.

### 2.5 Costos observados
| Etapa | Créditos |
|---|---|
| `text-to-image` | 5 |
| `image-to-model` (texture+pbr) | 30 |
| **Texto→3D completo (con imagen)** | **~35** |
| **Imagen→3D** | **~30** |

Con 100 créditos: ~2–3 generaciones. Se deja `face_limit` configurable (80.000 por defecto) para acotar el peso del GLB (la prueba generó 40,7 MB sin límite).

## 3. Variables de entorno

```env
AI_PROVIDER=tripo
TRIPO_API_KEY=            # ya provista por el usuario
TRIPO_BASE_URL=https://openapi.tripo3d.ai/v3
TRIPO_MODEL=v3.1-20260211
TRIPO_FACE_LIMIT=80000
TRIPO_TEXTURE=true
TRIPO_PBR=true
```
Actualizar `.env.local` (gitignored) y `.env.example`. Mantener `DEEPSEEK_*`.

## 4. Cambios de esquema (Drizzle)

`drafts`: agregar `previewPath text` (imagen intermedia).
`generation_jobs`: agregar `stage text` (`image_gen` | `model_gen`).

Generar y aplicar migración:
```
npm run db:generate
npm run db:migrate
```

## 5. Provider asíncrono (contrato)

Reescribir `src/lib/ai/provider.js` con dos implementaciones (`tripo`, `mock`) bajo un contrato común:

```js
{
  name,
  estimatedMillis,               // solo UX
  async start({ mode, prompt, imagePath, job, draft }) -> { stage, providerTaskId }
  async step({ stage, providerTaskId, draft }) -> {
    status: "processing" | "succeeded" | "failed",
    progress,                    // 0-100
    stage?,                      // puede avanzar de etapa
    providerTaskId?,             // nueva tarea al avanzar
    previewBuffer?, previewExtension?,  // imagen intermedia a guardar
    modelBuffer?, modelExtension?,      // GLB a guardar
    error?
  }
}
```

### `tripo` provider
- `start` texto: `createTextToImage(prompt)` → `{ stage:"image_gen", providerTaskId }`.
- `start` imagen: lee el archivo local, `uploadImage` → `file_token`, `createImageToModel` → `{ stage:"model_gen", providerTaskId }`.
- `step` `image_gen`: `getTask`; si `success` → descarga `generated_image_url` (devuelve `previewBuffer`) y arranca `image-to-model` con `file_token` → `{ status:"processing", stage:"model_gen", providerTaskId, progress:0 }`.
- `step` `model_gen`: `getTask`; si `success` → descarga `model_url` → `{ status:"succeeded", progress:100, modelBuffer, modelExtension:"glb" }`.
- Estados finales no-éxito → `{ status:"failed", error }`.

### `mock` provider
- Mantiene el comportamiento actual (GLB procedural por tiempo transcurrido), adaptado al contrato `start`/`step`. Para el flujo texto no genera imagen intermedia.

### `src/lib/ai/tripo.js` (nuevo)
- `isConfigured()`
- `createTextToImage({ prompt, negativePrompt })`
- `createImageToModel({ fileToken, extension })`
- `uploadImage({ buffer, extension })`
- `getTask(taskId)`
- `downloadBuffer(url)`
- Normaliza `getTask` a `{ status, progress, output }`.

## 6. Rutas

### `POST /api/generate/text`
1. Validar `{ draftId, prompt }`.
2. DeepSeek `enhanceTextPrompt` (fallback al prompt original); guardar `prompt`, `enhancedPrompt`, `aiSummary`.
3. Insertar `generation_jobs` (`type:"text"`, `status:"processing"`, `provider`).
4. `provider.start({ mode:"text", prompt: enhanced })`; guardar `stage` + `providerJobId`.
5. Responder `{ draftId, jobId, estimatedMs }`; si falla, marcar job `failed` y devolver error.

### `POST /api/generate/image`
1. Validar FormData `image` + `draftId` (ya existe).
2. Guardar imagen local (`sourceImagePath`).
3. DeepSeek `describeImagePrompt` (opcional, para el resumen).
4. Insertar job y `provider.start({ mode:"image", imagePath })`.
5. Responder `{ draftId, jobId, estimatedMs }`.

### `GET /api/jobs/[id]`
Máquina de estados:
1. Cargar job + draft.
2. Si `status` terminal (`succeeded`/`failed`) → serializar (incluye `summary`, `previewUrl`).
3. `provider.step(...)`.
4. Si devuelve `previewBuffer` → guardar en `models/{draftId}/preview.png` → `drafts.previewPath`.
5. Actualizar job (`stage`, `providerJobId`, `progress`, `status`, `error`).
6. Si devuelve `modelBuffer` → guardar `models/{draftId}/model.glb` → `drafts.modelPath` + `status:"ready"` → job `succeeded`.
7. Serializar: `{ jobId, draftId, status, progress, modelUrl, previewUrl, summary, error }`.

### `GET /api/preview/[id]` (nuevo)
Sirve `drafts.previewPath` (imagen intermedia) con el mismo control de acceso que `/api/files/[id]`.

## 7. UI

- `draft-store`: agregar `previewUrl`; `setReady({ modelUrl, summary })` ya existe.
- `useGeneration`: leer `previewUrl`/`summary` del job; intervalo de polling 2500 ms (Tripo tarda 30–90 s).
- `CreateWorkspace`: mostrar la **imagen intermedia** (DeepSeek resumen + preview) encima del visor 3D mientras se genera el modelo.
- Opcional: mostrar costo estimado ("~35 créditos") junto al botón.

## 8. Archivos a tocar

| Archivo | Acción |
|---|---|
| `src/lib/ai/tripo.js` | nuevo |
| `src/lib/ai/provider.js` | reescribir (start/step + registro) |
| `src/lib/db/schema.js` | +2 columnas |
| `src/lib/db/migrations/*` | generadas |
| `src/app/api/generate/text/route.js` | adaptar a `start` |
| `src/app/api/generate/image/route.js` | adaptar a `start` |
| `src/app/api/jobs/[id]/route.js` | máquina de estados |
| `src/app/api/preview/[id]/route.js` | nuevo |
| `src/lib/store/draft-store.js` | +`previewUrl` |
| `src/hooks/useGeneration.js` | consumir preview/summary, intervalo |
| `src/components/create/CreateWorkspace.jsx` | UI imagen intermedia |
| `.env.local`, `.env.example` | variables Tripo |

## 9. Verificación

1. `npm run lint` y `npm run build`.
2. Prueba real texto→3D: prompt → imagen intermedia visible → GLB en el visor.
3. Prueba real imagen→3D con una foto.
4. Verificar `drafts.previewPath`, `drafts.modelPath`, `generation_jobs.stage`.
5. Fallback: poner `AI_PROVIDER=mock` y confirmar que el flujo sigue.

## 10. Riesgos / notas

- **Costo:** ~35 créditos por texto→3D y ~30 por imagen→3D; 100 créditos ≈ 2–3 pruebas. Ajustar `face_limit`/textura si se quiere abaratar.
- **Latencia:** `image-to-model` tardó ~3 min en la prueba. Polling de 2,5 s.
- **Peso del GLB:** sin `face_limit` fue 40,7 MB; se fija 80.000 caras.
- **URLs caducan en 5 min:** siempre descargar y almacenar en `.data`.
- **Claves:** `TRIPO_API_KEY` y `DEEPSEEK_API_KEY` solo en `.env.local` (gitignored), nunca en el repo.
- **Rutas V3 no documentadas explícitamente** (upload/task) quedaron confirmadas por prueba directa.
