# jhotziry

Plataforma web donde un cliente describe una idea o sube una foto, la IA genera una **imagen estilo caricatura**, y el administrador la convierte en un **modelo 3D (`.glb`)** cuando el cliente pide la pieza impresa. Incluye blog de la comunidad, pedidos con seguimiento, chat por pedido y notificaciones.

## Requisitos
- **Node.js ≥ 20.9**
- **Postgres ≥ 14** (local o en tu servidor)
- **SMTP** (para los enlaces de acceso por correo)
- Claves de **DeepSeek** y **Tripo3D** (o usar `AI_PROVIDER=mock` para probar sin gastar)

## 1. Instalación (primera vez)

### 1.1 Descargar e instalar dependencias
```bash
git clone <tu-repo> jhotziry
cd jhotziry
npm ci
```

### 1.2 Crear la base de datos
Con `createdb`:
```bash
createdb jhotziry
```
O con `psql`:
```sql
CREATE DATABASE jhotziry;
```

### 1.3 Configurar variables de entorno
Copia el ejemplo y edítalo:
```bash
cp .env.example .env.local
```
Claves mínimas para arrancar:

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_APP_NAME` | Nombre de la app (por defecto `jhotziry`) |
| `APP_URL` | URL pública (usada en los enlaces de correo) |
| `DATABASE_URL` | `postgres://usuario:clave@host:5432/jhotziry` |
| `AUTH_SECRET` | Secreto fuerte para sesiones/magic links |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASS` | Correo de acceso |
| `MAIL_FROM` | Remitente, p. ej. `"jhotziry <no-reply@tudominio.com>"` |
| `AI_PROVIDER` | `tripo` (real) o `mock` (sin coste) |
| `DEEPSEEK_API_KEY` | Clave de DeepSeek (opcional; mejora prompts) |
| `TRIPO_API_KEY` | Clave de Tripo3D |
| `ADMIN_EMAILS` | Correos que se vuelven admin al entrar (separados por coma) |
| `STORAGE_DIR` | Carpeta persistente para los `.glb` (por defecto `./.data`) |

Genera un `AUTH_SECRET` fuerte con:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

### 1.4 Crear las tablas (migrar)
```bash
npm run db:migrate
```
Esto aplica **todas** las migraciones ya incluidas en `src/lib/db/migrations/`. No necesitas generar nada en el servidor.

### 1.5 Compilar y arrancar
```bash
npm run build
npm run start
```
App en `http://localhost:3000` (o tu `APP_URL`).

### 1.6 Hacerte administrador
Dos formas:
- Agrega tu correo a `ADMIN_EMAILS` en `.env.local` y reinicia. Al entrar con el magic link serás admin.
- O, si el usuario ya existe (ya iniciaste sesión una vez):
```bash
npm run admin:grant -- tucorreo@dominio.com
```

## 2. Base de datos: actualizaciones del esquema

Las migraciones se versionan en el repo (`src/lib/db/migrations/`). El comando de drizzle-kit usa `drizzle.config.mjs`, que lee tu `.env.local`.

### 2.1 En tu PC (desarrollo), cuando cambie el esquema
```bash
# 1) Genera el archivo SQL de migración a partir de src/lib/db/schema.js
npm run db:generate

# 2) Revisa el SQL generado en src/lib/db/migrations/ (importante) y aplícalo
npm run db:migrate
```
Commita el nuevo archivo de `migrations/` junto con el cambio de `schema.js`.

### 2.2 En el servidor (producción), al actualizar el código
```bash
git pull
npm ci
npm run db:migrate     # aplica solo las migraciones nuevas
npm run build
npm run start          # o reinicia el servicio (systemd/pm2)
```
> Nunca uses `db:push` en producción: es solo para prototipos locales (sincroniza el esquema sin historial).

### 2.3 Comprobar el estado de las migraciones
Drizzle lleva el control en la tabla `drizzle.__drizzle_migrations`:
```sql
SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at;
```

### 2.4 Respaldar antes de migrar (recomendado)
```bash
pg_dump "$DATABASE_URL" -Fc -f jhotziry-$(date +%F).dump
```
Drizzle no hace *rollback* automático: si algo falla, restaura el respaldo y corrige la migración.

## 3. Desarrollo
```bash
npm run dev      # next dev (Turbopack)
npm run lint     # eslint
npm run build    # build de produccion
```

## 4. Producción (Linux) — resumen
1. Instala Node ≥ 20.9 y Postgres, crea la BD.
2. Crea `.env.local` con `APP_URL` público (HTTPS), `AUTH_SECRET`, `DATABASE_URL`, SMTP, claves de IA, `ADMIN_EMAILS` y `STORAGE_DIR` a una ruta persistente.
3. `npm ci` → `npm run db:migrate` → `npm run build`.
4. Arranca con systemd o pm2:
   ```bash
   pm2 start npm --name jhotziry -- run start
   ```
5. Nginx con HTTPS **reenviando `x-forwarded-for`** (el rate limit depende de la IP real).
6. Monta `STORAGE_DIR` en un volumen persistente (ahí van los `.glb`).
7. Respalda Postgres y `STORAGE_DIR` periódicamente.

## 5. Almacenamiento y datos
- **Imágenes** (foto del cliente y vistas previas) se guardan en **Postgres** como `jsonb` (base64). No dependen del disco.
- **`.glb`** (modelos 3D) se guardan en disco bajo `STORAGE_DIR` y solo el admin puede descargarlos.

## 6. Notas
- El **acceso es por invitación**: el admin invita por correo desde el panel; nadie se auto-registra.
- El **rate limiting** es en memoria (una sola instancia). Si escalas horizontalmente, migra el limiter a Redis/Upstash.
- Los textos de UI están en **español**.
