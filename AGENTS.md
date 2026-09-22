<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# jhotziry — guía del proyecto

Plataforma web donde un cliente describe una idea o sube una foto, la IA genera una **imagen estilo caricatura**, y el administrador la convierte a **modelo 3D (`.glb`)** cuando el cliente pide la pieza impresa. Incluye blog de la comunidad, pedidos con seguimiento y notificaciones.

## Stack
- **Next.js 16.3.5** (App Router, **Turbopack** por defecto) + **React 19**.
- **JavaScript** (NO TypeScript), alias `@/*` → `src/*` (`jsconfig.json`).
- **Tailwind CSS v4** (`@import "tailwindcss"` + `@theme` en `src/app/globals.css`). Estética "liquid glass" con utilidades `.glass`, `.glass-strong`, `.glass-soft`, `.glass-bar` (definidas en `globals.css`).
- **Postgres + Drizzle ORM** (`drizzle-orm`, `pg`, `drizzle-kit`).
- **Auth**: magic link por email (SMTP propio, `nodemailer`), sin Google. Acceso **solo por invitación**.
- **IA**: capa creativa con **DeepSeek** (texto y visión) y motor de imagen con **Tripo3D V3** (`image-to-image`, `text-to-image`, `image-to-model`). Existe un proveedor **`mock`** que no gasta créditos.
- **3D en el navegador**: `three`, `@react-three/fiber`, `@react-three/drei` (solo para el admin previsualizar el `.glb`).

## Comandos
```
npm run dev            # next dev (Turbopack)
npm run build          # next build
npm run start          # next start (producción)
npm run lint           # eslint (next lint fue eliminado en Next 16)
npm run db:generate    # genera migración desde src/lib/db/schema.js
npm run db:migrate     # aplica migraciones
npm run db:push        # push directo del esquema (dev)
npm run admin:grant -- correo@dominio.com   # marca admin a un usuario existente
```
Antes de tocar APIs/convenciones de Next 16, leer `node_modules/next/dist/docs/` (ver bloque de arriba). Recordar: `cookies()`, `headers()`, `params`, `searchParams` son **async** en Next 16.

## Variables de entorno
Copiar `.env.example` a `.env.local` (gitignored). Claves:
- `NEXT_PUBLIC_APP_NAME` (por defecto `jhotziry`), `APP_URL` (URL pública, usada en enlaces de correo).
- `DATABASE_URL`, `AUTH_SECRET` (fuerte; genera con `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`).
- SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`.
- IA: `AI_PROVIDER` (`tripo` | `mock`), `AI_ENHANCE`; `DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL`, `DEEPSEEK_MODEL`; `TRIPO_API_KEY`, `TRIPO_BASE_URL`, `TRIPO_MODEL`, `TRIPO_FACE_LIMIT`, `TRIPO_TEXTURE`, `TRIPO_PBR`, `TRIPO_IMAGE_MODEL`, `TRIPO_IMAGE_SIZE`.
- Créditos: `WELCOME_CREDITS`, `CREDITS_PER_PREVIEW`, `NEXT_PUBLIC_CREDITS_PER_PREVIEW`, `CREDITS_PER_IDEA`, `NEXT_PUBLIC_CREDITS_PER_IDEA`.
- Acceso: `ADMIN_EMAILS` (correos que se vuelven admin al entrar), `STORAGE_DIR` (por defecto `./.data`).

## Arquitectura
```
src/app/                 páginas (App Router) + api/ (Route Handlers)
  page.js                landing (destacados del blog)
  crear/                 herramienta de creación
  blog/                  feed de la comunidad
  mis-pedidos/, mis-pedidos/[id]
  admin/                 panel (solo admin)
  registro/              registro por invitación
  api/                   ver "Rutas" abajo
src/components/          UI (landing, create, blog, orders, admin, layout, ui)
src/hooks/               useSession, useGeneration (react-query)
src/lib/
  ai/                    deepseek.js, tripo.js, provider.js, glb.js (mock)
  auth/                  session.js, csrf.js, guard.js, tokens.js, mail.js, invitations.js, roles.js
  db/                    client.js, schema.js, drafts.js, migrations/
  posts/                 queries.js
  security/              rate-limit.js
  storage/               files.js (disco/GLE), images.js (jsonb base64)
  jobs/                  runner.js (avanza trabajos en segundo plano)
  store/                 draft-store.js (zustand + persist)
  api-client.js          apiFetch (añade x-csrf-token)
  config.js, notifications.js
```

### Modelo de datos (Drizzle, `src/lib/db/schema.js`)
`users` (email, fullName, address, isAdmin, credits), `sessions` (+`csrf_hash`), `magic_links`, `invitations`, `access_requests`, `drafts` (mode, style, prompt, enhancedPrompt, aiSummary, `sourceImage`/`previewImage` jsonb, modelPath, status), `generation_jobs` (stage, status, progress, attempts, providerJobId), `orders`, `order_events` (timeline), `order_messages` (chat), `credit_transactions`, `posts` (tags jsonb), `post_comments`, `post_likes`, `quote_requests`, `notifications`.

### Flujos
- **Texto → imagen**: `POST /api/generate/text` → DeepSeek enriquece el prompt → Tripo `text-to-image` → el job guarda `preview_image` (jsonb) → email "imagen lista".
- **Foto → caricatura**: `POST /api/generate/image` (multipart `image` + `prompt` opcional) → DeepSeek traduce/mejora el prompt y describe la foto → Tripo `image-to-image` (base caricatura + extra del usuario) → `preview_image`.
- **Imagen → 3D**: solo admin, `POST /api/admin/orders/[id]/generate` → Tripo `image-to-model` → `drafts.model_path` (`.glb` en disco) → descarga vía `GET /api/files/[id]` (solo admin).
- **Trabajos**: `src/lib/jobs/runner.js` (`ensureRunner`) avanza los `generation_jobs` en `processing` cada 5 s, sin depender del navegador. Al terminar envía correo y notificación.
- **Pedido**: el usuario pide su pieza → `orders` + `order_events` (timeline) + email a admin y cliente + notificación al admin. Chat por pedido con `order_messages`. El **panel admin reutiliza `OrdersBoard`** (la misma lista que "Mis pedidos") en la pestaña Pedidos; al hacer clic en un pedido se abre `/mis-pedidos/[id]`, que muestra imagen, datos, timeline y chat. Si el que mira es admin, ahí mismo aparecen las **acciones de admin** (Generar 3D / cambiar estado) vía `AdminOrderActions`.

### Rutas API (todas en `src/app/api`)
Públicas de lectura: `GET /api/posts`, `GET /api/posts/[id]/image`, `POST /api/auth/request-link`, `POST /api/auth/access-request`, `GET /api/auth/verify`.
Con sesión + CSRF (mutaciones) o solo sesión (lecturas): `orders`, `orders/[id]/messages`, `drafts`, `drafts/claim`, `posts` (POST), `posts/[id]/comments`, `posts/[id]/like`, `notifications`, `notifications/read`, `generate/text`, `generate/image`, `assistant/expand`, `quote`, `auth/logout`.
Solo admin: `admin/credits`, `admin/invitations`, `admin/access-requests/[id]/invite`, `admin/orders/[id]`, `admin/orders/[id]/generate`, `admin/posts/[id]`, `GET /api/files/[id]`.

## Seguridad
- **Invitación obligatoria**: `request-link` no revela si un correo existe (responde genérico); el acceso solo para usuarios ya registrados o `ADMIN_EMAILS`.
- **Sesión**: token 256-bit hasheado en `sessions`, cookie httpOnly `jho_session`.
- **CSRF**: patrón doble envío — cookie `jho_csrf` (no httpOnly) + header `x-csrf-token`; el servidor valida contra `sessions.csrf_hash`. Usar **siempre** `apiFetch` en el cliente (añade el header). Los guards son `requireUser(request)` y `requireAdmin(request)` (`src/lib/auth/guard.js`).
- **Rate limiting** en memoria (`src/lib/security/rate-limit.js`): `request-link`, `access-request`, `register`, `quote`, `drafts`, `assistant/expand`, `generate/*`, `orders`, `posts/comments/likes`. Clave por IP (`x-forwarded-for`) o usuario.
- **Cabeceras** en `next.config.mjs` (nosniff, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy, HSTS en prod, CSP en `Content-Security-Policy-Report-Only` — endurecer tras revisar reportes).
- Nunca exponer claves con `NEXT_PUBLIC_`; las de IA/DB son solo de servidor.

## Almacenamiento
- **Imágenes** (foto origen y preview) en Postgres como `jsonb` `{ mime, data: base64 }`. No dependen del filesystem.
- **`.glb`** en disco bajo `STORAGE_DIR` (`./.data`), servido solo al admin.

## Convenciones
- Textos de UI en **español**; títulos/errores amables.
- Sin comentarios en el código salvo necesidad.
- Validación con **zod**; mutaciones del cliente con `apiFetch`.
- Estilo: glass + paleta rosa; usar las utilidades `.glass*` ya definidas.
- Al terminar cambios: `npm run lint` y `npm run build`.

---

# Producción (Linux)

Requisitos: **Node.js ≥ 20.9**, Postgres ≥ 14, SMTP, claves de DeepSeek/Tripo.

1. **Base de datos**: crear la BD Postgres y obtener `DATABASE_URL`.
2. **Variables**: crear `.env.local` (o variables del servicio) con `DATABASE_URL`, `AUTH_SECRET` fuerte, `APP_URL` (URL pública con HTTPS), SMTP, claves de IA, `ADMIN_EMAILS`, `AI_PROVIDER=tripo`, `STORAGE_DIR` a una ruta persistente.
3. **Instalar y migrar**:
   ```
   npm ci
   npm run db:migrate
   npm run build
   ```
4. **Ejecutar** con un gestor de procesos. Ejemplo systemd:
   ```
   [Unit]
   Description=jhotziry
   After=network.target postgresql.service
   [Service]
   WorkingDirectory=/opt/jhotziry
   ExecStart=/usr/bin/npm run start
   Environment=PORT=3000
   Restart=always
   User=www-data
   [Install]
   WantedBy=multi-user.target
   ```
   (o `pm2 start npm --name jhotziry -- run start`).
5. **Reverse proxy (nginx)** con HTTPS y **reenviar `x-forwarded-for`** (el rate limit y los logs dependen de la IP real). No exponer el puerto de Next directamente.
6. **Almacenamiento**: montar `STORAGE_DIR` en un volumen persistente (ahí van los `.glb`). Las imágenes ya viven en Postgres.
7. **Admin**: `npm run admin:grant -- correo@dominio.com` (el usuario debe existir tras iniciar sesión una vez) o agregarlo a `ADMIN_EMAILS`.
8. **Escalado**: el rate limit es **en memoria**. Con una sola instancia basta; si se escala horizontalmente, migrar el limiter a Redis/Upstash sin cambiar las rutas.
9. **Endurecer CSP**: revisar los reportes `Content-Security-Policy-Report-Only` y luego quitar `-Report-Only`.
10. **Respaldos** de Postgres y de `STORAGE_DIR`.

Notas: las sesiones/magic links usan `AUTH_SECRET` (rotarlo cierra sesiones). SMTP debe tener un buzón válido del dominio (el host de Hostinger no acepta un remitente de Gmail).
