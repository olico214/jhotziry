import dotenv from "dotenv";
import { Client } from "pg";

dotenv.config({ path: ".env.local" });

const email = process.argv[2]?.trim().toLowerCase();

if (!email) {
  console.error("Uso: npm run admin:grant -- correo@dominio.com");
  process.exit(1);
}

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const result = await client.query(
  "update users set is_admin = true where lower(email) = $1 returning id, email",
  [email],
);

if (result.rowCount === 0) {
  console.error(
    `No existe un usuario con el correo ${email}. Debe iniciar sesión una vez primero.`,
  );
  await client.end();
  process.exit(1);
}

console.log(`Listo: ${result.rows[0].email} ahora es administrador.`);
await client.end();
