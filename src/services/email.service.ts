import nodemailer from 'nodemailer';
import config from '../config';

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.secure,
  auth: {
    user: config.smtp.user,
    pass: config.smtp.pass,
  },
});

interface NewSolicitudEmail {
  nombre: string;
  email: string;
  telefono: string;
  tipoCaso: string;
  mensaje: string | null;
}

export async function sendNewSolicitudNotification(data: NewSolicitudEmail): Promise<void> {
  const tipoCasoLabels: Record<string, string> = {
    FAMILIA: 'Derecho de Familia',
    MIGRATORIO: 'Derecho Migratorio',
    PENAL: 'Derecho Penal',
    CIVIL: 'Derecho Civil',
    LABORAL: 'Derecho Laboral',
    ADMINISTRATIVO: 'Derecho Administrativo',
    CORPORATIVO: 'Derecho Corporativo',
  };

  const areaLabel = tipoCasoLabels[data.tipoCaso] || data.tipoCaso;

  await transporter.sendMail({
    from: `"${config.smtp.fromName}" <${config.smtp.from}>`,
    to: config.smtp.from,
    replyTo: data.email,
    subject: `Nueva solicitud de consulta - ${areaLabel}`,
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1C1C1C;">
        <div style="background-color: #0E0E0E; padding: 24px 32px; text-align: center;">
          <h1 style="color: #C9A449; font-size: 20px; margin: 0; letter-spacing: 2px;">QUINTANA REYES & ASOCIADOS</h1>
        </div>
        <div style="padding: 32px; border: 1px solid #E6E6E6; border-top: none;">
          <h2 style="color: #0E0E0E; font-size: 18px; margin-top: 0;">Nueva Solicitud de Consulta</h2>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #E6E6E6; color: #6B6B6B; width: 140px; vertical-align: top;">Nombre</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #E6E6E6; font-weight: 500;">${escapeHtml(data.nombre)}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #E6E6E6; color: #6B6B6B; vertical-align: top;">Correo</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #E6E6E6;"><a href="mailto:${escapeHtml(data.email)}" style="color: #C9A449;">${escapeHtml(data.email)}</a></td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #E6E6E6; color: #6B6B6B; vertical-align: top;">Teléfono</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #E6E6E6;">${escapeHtml(data.telefono)}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #E6E6E6; color: #6B6B6B; vertical-align: top;">Área de interés</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #E6E6E6;">${escapeHtml(areaLabel)}</td>
            </tr>
            ${data.mensaje ? `
            <tr>
              <td style="padding: 10px 0; color: #6B6B6B; vertical-align: top;">Mensaje</td>
              <td style="padding: 10px 0;">${escapeHtml(data.mensaje)}</td>
            </tr>` : ''}
          </table>
          <p style="color: #6B6B6B; font-size: 13px; margin-top: 24px;">Este correo fue generado automáticamente desde el formulario de contacto del sitio web.</p>
        </div>
      </div>
    `,
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function verifySmtpConnection(): Promise<boolean> {
  try {
    await transporter.verify();
    return true;
  } catch {
    return false;
  }
}
