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

export async function sendInvitationEmail(email, url, appName) {
  const transport = getTransporter();

  const html = `
    <div style="font-family:Nunito,Arial,sans-serif;background:#fff5f9;padding:32px;border-radius:24px;color:#4a2b3b">
      <h1 style="color:#e34d8b;margin:0 0 8px">${appName}</h1>
      <p>Te invitaron a crear tu cuenta. 🎀</p>
      <p>Completa tu registro con tu nombre completo y domicilio para que podamos preparar tus pedidos.</p>
      <p style="margin:24px 0">
        <a href="${url}" style="background:#f96ba4;color:#fff;padding:12px 24px;border-radius:9999px;text-decoration:none;display:inline-block">
          Completar mi registro
        </a>
      </p>
      <p style="font-size:13px;color:#8a6478">El enlace caduca en 7 días.</p>
    </div>
  `;

  if (!transport) {
    console.info(`[invitacion] SMTP no configurado. Enlace para ${email}: ${url}`);
    return { delivered: false, preview: url };
  }

  try {
    await transport.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to: email,
      subject: `Te invitaron a ${appName}`,
      html,
    });
    return { delivered: true };
  } catch (error) {
    console.error("[invitacion] Error al enviar correo:", error.message);
    console.info(`[invitacion] Enlace de respaldo para ${email}: ${url}`);
    return { delivered: false, preview: url, error: error.message };
  }
}

export async function sendNewOrderEmail(recipients, order, appName) {
  const transport = getTransporter();
  const to = Array.isArray(recipients) ? recipients.join(",") : recipients;

  const html = `
    <div style="font-family:Nunito,Arial,sans-serif;background:#fff5f9;padding:32px;border-radius:24px;color:#4a2b3b">
      <h1 style="color:#e34d8b;margin:0 0 8px">${appName} · Nuevo pedido</h1>
      <p><strong>${order.name}</strong> (${order.email}) hizo un pedido.</p>
      <ul>
        <li>Descripción: ${order.description || "—"}</li>
        <li>Cantidad: ${order.quantity || 1}</li>
        <li>Domicilio: ${order.address || "—"}</li>
      </ul>
      <p style="margin:24px 0">
        <a href="${order.adminUrl}" style="background:#f96ba4;color:#fff;padding:12px 24px;border-radius:9999px;text-decoration:none;display:inline-block">
          Ver en el panel
        </a>
      </p>
    </div>
  `;

  if (!transport || !to) {
    console.info(`[pedido-admin] Aviso de pedido para ${to}: ${order.adminUrl}`);
    return { delivered: false };
  }

  try {
    await transport.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to,
      subject: `Nuevo pedido de ${order.name} · ${appName}`,
      html,
    });
    return { delivered: true };
  } catch (error) {
    console.error("[pedido-admin] Error al enviar aviso:", error.message);
    return { delivered: false, error: error.message };
  }
}

export async function sendOrderConfirmationEmail(email, order, appName) {
  const transport = getTransporter();

  const html = `
    <div style="font-family:Nunito,Arial,sans-serif;background:#fff5f9;padding:32px;border-radius:24px;color:#4a2b3b">
      <h1 style="color:#e34d8b;margin:0 0 8px">${appName}</h1>
      <p>¡Recibimos tu pedido! 🎁</p>
      <ul>
        <li>Descripción: ${order.description || "—"}</li>
        <li>Cantidad: ${order.quantity || 1}</li>
        <li>Recibe: ${order.name}</li>
        <li>Domicilio: ${order.address || "—"}</li>
      </ul>
      <p>Te escribiremos para confirmar precio y envío.</p>
      <p style="margin:24px 0">
        <a href="${order.ordersUrl}" style="background:#f96ba4;color:#fff;padding:12px 24px;border-radius:9999px;text-decoration:none;display:inline-block">
          Ver mis pedidos
        </a>
      </p>
    </div>
  `;

  if (!transport) {
    console.info(`[pedido-cliente] Confirmación para ${email}`);
    return { delivered: false };
  }

  try {
    await transport.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to: email,
      subject: `Recibimos tu pedido · ${appName}`,
      html,
    });
    return { delivered: true };
  } catch (error) {
    console.error("[pedido-cliente] Error al enviar confirmación:", error.message);
    return { delivered: false, error: error.message };
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
