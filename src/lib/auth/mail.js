import nodemailer from "nodemailer";

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return null;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  return transporter;
}

export async function sendMagicLink(email, url, appName) {
  const transport = getTransporter();

  const html = `
    <div style="font-family:Nunito,Arial,sans-serif;background:#fff5f9;padding:32px;border-radius:24px;color:#4a2b3b">
      <h1 style="color:#e34d8b;margin:0 0 8px">${appName}</h1>
      <p>Tu enlace para entrar y guardar tu diseño:</p>
      <p style="margin:24px 0">
        <a href="${url}" style="background:#f96ba4;color:#fff;padding:12px 24px;border-radius:9999px;text-decoration:none;display:inline-block">
          Entrar a ${appName}
        </a>
      </p>
      <p style="font-size:13px;color:#8a6478">Si no solicitaste este enlace, ignora este correo. Caduca en 15 minutos.</p>
    </div>
  `;

  if (!transport) {
    console.info(`[magic-link] SMTP no configurado. Enlace para ${email}: ${url}`);
    return { delivered: false, preview: url };
  }

  try {
    await transport.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to: email,
      subject: `Tu enlace de acceso a ${appName}`,
      html,
    });
    return { delivered: true };
  } catch (error) {
    console.error("[magic-link] Error al enviar correo:", error.message);
    console.info(`[magic-link] Enlace de respaldo para ${email}: ${url}`);
    return { delivered: false, preview: url, error: error.message };
  }
}

export async function sendImageReadyEmail(email, url, appName) {
  const transport = getTransporter();

  const html = `
    <div style="font-family:Nunito,Arial,sans-serif;background:#fff5f9;padding:32px;border-radius:24px;color:#4a2b3b">
      <h1 style="color:#e34d8b;margin:0 0 8px">${appName}</h1>
      <p>¡Tu imagen ya está lista! 🎀</p>
      <p style="margin:24px 0">
        <a href="${url}" style="background:#f96ba4;color:#fff;padding:12px 24px;border-radius:9999px;text-decoration:none;display:inline-block">
          Ver mi diseño
        </a>
      </p>
      <p style="font-size:13px;color:#8a6478">Entra para verla y, si te gusta, pedir tu pieza impresa.</p>
    </div>
  `;

  if (!transport) {
    console.info(`[image-ready] SMTP no configurado. Aviso para ${email}: ${url}`);
    return { delivered: false };
  }

  try {
    await transport.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to: email,
      subject: `Tu imagen está lista · ${appName}`,
      html,
    });
    return { delivered: true };
  } catch (error) {
    console.error("[image-ready] Error al enviar aviso:", error.message);
    return { delivered: false, error: error.message };
  }
}
