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

const FIRM_GMAIL = 'Quintanareyes.abogados@gmail.com';
const FROM = `"${config.smtp.fromName}" <${config.smtp.from}>`;

const TIPO_CASO_LABELS: Record<string, string> = {
  FAMILIA: 'Derecho de Familia',
  MIGRATORIO: 'Derecho Migratorio',
  PENAL: 'Derecho Penal',
  CIVIL: 'Derecho Civil',
  LABORAL: 'Derecho Laboral',
  ADMINISTRATIVO: 'Derecho Administrativo',
  CORPORATIVO: 'Derecho Corporativo',
};

const ESTADO_LABELS: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  EN_PROCESO: 'En Proceso',
  ATENDIDA: 'Atendida',
  ARCHIVADA: 'Archivada',
};

function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function padId(id: number): string {
  return `QR-${String(id).padStart(5, '0')}`;
}

function timestamp(): string {
  return new Date().toLocaleDateString('es-PA', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ─── Shared HTML wrapper ──────────────────────────────────────────
function emailWrapper(content: string, footerExtra = ''): string {
  return `
<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;color:#1C1C1C;">
  <div style="background:#0E0E0E;padding:24px 32px;text-align:center;">
    <h1 style="color:#C9A449;font-size:17px;margin:0;letter-spacing:3px;font-weight:600;">QUINTANA REYES &amp; ASOCIADOS</h1>
    <p style="color:#6B6B6B;font-size:11px;margin:6px 0 0;letter-spacing:1px;">FIRMA LEGAL EN PANAMÁ</p>
  </div>
  <div style="padding:28px 32px;border:1px solid #E6E6E6;border-top:none;background:#fff;">
    ${content}
  </div>
  <div style="padding:16px 32px;background:#0E0E0E;text-align:center;">
    <p style="color:#6B6B6B;font-size:11px;margin:0 0 4px;">Obarrio, Ciudad de Panamá · PH Atrium Tower, Piso 26</p>
    <p style="color:#6B6B6B;font-size:11px;margin:0 0 4px;">+507 6281-0554 | +507 6606-9100 | 309-0166 EXT 323</p>
    <p style="color:#6B6B6B;font-size:11px;margin:0 0 4px;">info@quintanareyes.com · quintanareyes.com</p>
    ${footerExtra}
    <p style="color:#4A4A4A;font-size:10px;margin:8px 0 0;">© ${new Date().getFullYear()} Quintana Reyes &amp; Asociados. Todos los derechos reservados.</p>
  </div>
</div>`;
}

// ─── 1. New solicitud → Firm notification ─────────────────────────
interface NewSolicitudData {
  id: number;
  nombre: string;
  email: string;
  telefono: string;
  tipoCaso: string;
  mensaje: string | null;
}

function firmNotificationHtml(d: NewSolicitudData): string {
  const area = TIPO_CASO_LABELS[d.tipoCaso] || d.tipoCaso;
  const ref = padId(d.id);
  return emailWrapper(`
    <p style="color:#C9A449;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:600;margin:0 0 16px;">Nueva Solicitud Web</p>
    <h2 style="color:#0E0E0E;font-size:18px;margin:0 0 20px;">Solicitud ${esc(ref)}</h2>
    <table style="width:100%;border-collapse:collapse;">
      <tr><td style="padding:10px 14px;border-bottom:1px solid #E6E6E6;color:#6B6B6B;font-size:13px;width:130px;background:#FAFAF7;">Referencia</td><td style="padding:10px 14px;border-bottom:1px solid #E6E6E6;font-size:14px;font-weight:600;">${esc(ref)}</td></tr>
      <tr><td style="padding:10px 14px;border-bottom:1px solid #E6E6E6;color:#6B6B6B;font-size:13px;background:#FAFAF7;">Cliente</td><td style="padding:10px 14px;border-bottom:1px solid #E6E6E6;font-size:14px;">${esc(d.nombre)}</td></tr>
      <tr><td style="padding:10px 14px;border-bottom:1px solid #E6E6E6;color:#6B6B6B;font-size:13px;background:#FAFAF7;">Correo</td><td style="padding:10px 14px;border-bottom:1px solid #E6E6E6;font-size:14px;"><a href="mailto:${esc(d.email)}" style="color:#C9A449;text-decoration:none;">${esc(d.email)}</a></td></tr>
      <tr><td style="padding:10px 14px;border-bottom:1px solid #E6E6E6;color:#6B6B6B;font-size:13px;background:#FAFAF7;">Teléfono</td><td style="padding:10px 14px;border-bottom:1px solid #E6E6E6;font-size:14px;">${esc(d.telefono)}</td></tr>
      <tr><td style="padding:10px 14px;border-bottom:1px solid #E6E6E6;color:#6B6B6B;font-size:13px;background:#FAFAF7;">Área</td><td style="padding:10px 14px;border-bottom:1px solid #E6E6E6;font-size:14px;"><span style="background:#C9A449;color:#0E0E0E;padding:2px 10px;font-size:12px;font-weight:600;">${esc(area)}</span></td></tr>
      ${d.mensaje ? `<tr><td style="padding:10px 14px;color:#6B6B6B;font-size:13px;background:#FAFAF7;vertical-align:top;">Mensaje</td><td style="padding:10px 14px;font-size:14px;line-height:1.6;">${esc(d.mensaje)}</td></tr>` : ''}
    </table>
    <div style="margin-top:24px;padding:14px;background:#FAFAF7;border-left:3px solid #C9A449;">
      <p style="margin:0;font-size:13px;color:#6B6B6B;"><strong style="color:#0E0E0E;">Acción requerida:</strong> Contactar al cliente a la brevedad posible.</p>
    </div>
    <p style="color:#6B6B6B;font-size:11px;margin:20px 0 0;">Generado el ${timestamp()}</p>
  `);
}

// ─── 2. New solicitud → Client confirmation ───────────────────────
function clientConfirmationHtml(d: NewSolicitudData): string {
  const area = TIPO_CASO_LABELS[d.tipoCaso] || d.tipoCaso;
  const ref = padId(d.id);
  return emailWrapper(`
    <h2 style="color:#0E0E0E;font-size:18px;margin:0 0 6px;">Estimado/a ${esc(d.nombre)},</h2>
    <p style="color:#6B6B6B;font-size:14px;line-height:1.7;margin-bottom:20px;">
      Hemos recibido su solicitud de consulta. Nuestro equipo legal revisará su caso y se pondrá en contacto con usted a la brevedad posible.
    </p>

    <div style="background:#FAFAF7;padding:20px 24px;margin-bottom:20px;">
      <p style="color:#C9A449;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:600;margin:0 0 14px;">Datos de su solicitud</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:5px 0;color:#6B6B6B;font-size:13px;width:130px;">N° de solicitud:</td><td style="padding:5px 0;font-size:14px;font-weight:700;color:#0E0E0E;">${esc(ref)}</td></tr>
        <tr><td style="padding:5px 0;color:#6B6B6B;font-size:13px;">Nombre:</td><td style="padding:5px 0;font-size:13px;">${esc(d.nombre)}</td></tr>
        <tr><td style="padding:5px 0;color:#6B6B6B;font-size:13px;">Teléfono:</td><td style="padding:5px 0;font-size:13px;">${esc(d.telefono)}</td></tr>
        <tr><td style="padding:5px 0;color:#6B6B6B;font-size:13px;">Área:</td><td style="padding:5px 0;font-size:13px;">${esc(area)}</td></tr>
      </table>
    </div>

    <div style="background:#0E0E0E;padding:20px 24px;margin-bottom:20px;">
      <p style="color:#C9A449;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:600;margin:0 0 8px;">Importante</p>
      <p style="color:#E6E6E6;font-size:13px;line-height:1.6;margin:0;">
        Guarde su número de referencia <strong style="color:#C9A449;">${esc(ref)}</strong> para agilizar la atención de su caso al momento de comunicarse con nosotros.
      </p>
    </div>

    <div style="border-left:3px solid #C9A449;padding-left:16px;margin-bottom:20px;">
      <p style="font-style:italic;color:#0E0E0E;font-size:14px;margin:0;line-height:1.6;">
        "Su caso merece más que un abogado, merece una estrategia."
      </p>
    </div>

    <p style="color:#6B6B6B;font-size:13px;line-height:1.6;margin:0;">
      Si necesita contactarnos, puede llamarnos directamente:<br/>
      <strong>+507 6281-0554</strong> | <strong>+507 6606-9100</strong> | 309-0166 EXT 323
    </p>
  `);
}

// ─── 3. Status change → Firm + Client ─────────────────────────────
interface StatusChangeData {
  id: number;
  nombre: string;
  email: string;
  estadoAnterior: string;
  estadoNuevo: string;
}

function statusChangeFirmHtml(d: StatusChangeData): string {
  const ref = padId(d.id);
  const prev = ESTADO_LABELS[d.estadoAnterior] || d.estadoAnterior;
  const next = ESTADO_LABELS[d.estadoNuevo] || d.estadoNuevo;
  return emailWrapper(`
    <p style="color:#C9A449;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:600;margin:0 0 16px;">Cambio de Estado</p>
    <h2 style="color:#0E0E0E;font-size:18px;margin:0 0 20px;">Solicitud ${esc(ref)} — ${esc(d.nombre)}</h2>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
      <span style="background:#E6E6E6;color:#6B6B6B;padding:6px 14px;font-size:13px;font-weight:600;">${esc(prev)}</span>
      <span style="color:#C9A449;font-size:18px;">→</span>
      <span style="background:#C9A449;color:#0E0E0E;padding:6px 14px;font-size:13px;font-weight:600;">${esc(next)}</span>
    </div>
    <p style="color:#6B6B6B;font-size:12px;margin:0;">Cliente: ${esc(d.nombre)} (${esc(d.email)})</p>
    <p style="color:#6B6B6B;font-size:11px;margin:12px 0 0;">Actualizado el ${timestamp()}</p>
  `);
}

function statusChangeClientHtml(d: StatusChangeData): string {
  const ref = padId(d.id);
  const next = ESTADO_LABELS[d.estadoNuevo] || d.estadoNuevo;

  const mensajes: Record<string, string> = {
    EN_PROCESO: 'Su caso ha sido asignado a un abogado de nuestro equipo y se encuentra en proceso de revisión. Le contactaremos si necesitamos información adicional.',
    ATENDIDA: 'Su solicitud ha sido atendida. Si tiene alguna consulta adicional, no dude en comunicarse con nosotros.',
    ARCHIVADA: 'Su solicitud ha sido archivada. Si desea reactivarla o tiene nuevas consultas, estamos a su disposición.',
    PENDIENTE: 'Su solicitud ha vuelto a estado pendiente. Nuestro equipo la revisará próximamente.',
  };
  const msg = mensajes[d.estadoNuevo] || 'El estado de su solicitud ha sido actualizado.';

  return emailWrapper(`
    <h2 style="color:#0E0E0E;font-size:18px;margin:0 0 6px;">Estimado/a ${esc(d.nombre)},</h2>
    <p style="color:#6B6B6B;font-size:14px;line-height:1.7;margin-bottom:20px;">
      Le informamos que su solicitud <strong style="color:#0E0E0E;">${esc(ref)}</strong> ha sido actualizada.
    </p>

    <div style="background:#FAFAF7;padding:20px 24px;margin-bottom:20px;text-align:center;">
      <p style="color:#6B6B6B;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:600;margin:0 0 8px;">Nuevo Estado</p>
      <span style="display:inline-block;background:#C9A449;color:#0E0E0E;padding:8px 24px;font-size:14px;font-weight:700;letter-spacing:1px;">${esc(next)}</span>
    </div>

    <p style="color:#0E0E0E;font-size:14px;line-height:1.7;margin-bottom:20px;">${msg}</p>

    <div style="background:#FAFAF7;padding:14px 20px;margin-bottom:20px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:4px 0;color:#6B6B6B;font-size:13px;width:130px;">N° de solicitud:</td><td style="padding:4px 0;font-size:13px;font-weight:600;">${esc(ref)}</td></tr>
        <tr><td style="padding:4px 0;color:#6B6B6B;font-size:13px;">Cliente:</td><td style="padding:4px 0;font-size:13px;">${esc(d.nombre)}</td></tr>
      </table>
    </div>

    <p style="color:#6B6B6B;font-size:13px;line-height:1.6;margin:0;">
      Para cualquier consulta, mencione su referencia <strong>${esc(ref)}</strong>.<br/>
      <strong>+507 6281-0554</strong> | <strong>+507 6606-9100</strong> | 309-0166 EXT 323
    </p>
  `);
}

// ─── Public API ───────────────────────────────────────────────────

export async function sendNewSolicitudNotification(data: NewSolicitudData): Promise<void> {
  const ref = padId(data.id);
  const area = TIPO_CASO_LABELS[data.tipoCaso] || data.tipoCaso;

  await Promise.allSettled([
    transporter.sendMail({
      from: FROM,
      to: `${config.smtp.from}, ${FIRM_GMAIL}`,
      replyTo: data.email,
      subject: `Nueva solicitud web ${ref} - ${data.nombre} - ${area}`,
      html: firmNotificationHtml(data),
    }),
    transporter.sendMail({
      from: FROM,
      to: data.email,
      subject: `Solicitud ${ref} recibida - Quintana Reyes & Asociados`,
      html: clientConfirmationHtml(data),
    }),
  ]);
}

export async function sendStatusChangeNotification(data: StatusChangeData): Promise<void> {
  const ref = padId(data.id);
  const next = ESTADO_LABELS[data.estadoNuevo] || data.estadoNuevo;

  await Promise.allSettled([
    transporter.sendMail({
      from: FROM,
      to: `${config.smtp.from}, ${FIRM_GMAIL}`,
      subject: `Solicitud ${ref} → ${next} - ${data.nombre}`,
      html: statusChangeFirmHtml(data),
    }),
    transporter.sendMail({
      from: FROM,
      to: data.email,
      subject: `Actualización de su solicitud ${ref} - Quintana Reyes & Asociados`,
      html: statusChangeClientHtml(data),
    }),
  ]);
}

// ─── 4. Comment notification → Internal users ───────────────────
interface CommentNotificationData {
  recipientEmail: string;
  recipientName: string;
  authorName: string;
  solicitudId: number;
  solicitudNombre: string;
  contenido: string;
  isReply: boolean;
}

function commentNotificationHtml(d: CommentNotificationData): string {
  const ref = padId(d.solicitudId);
  const actionLabel = d.isReply ? 'respondió en' : 'comentó en';
  const preview = d.contenido.length > 200 ? d.contenido.substring(0, 200) + '...' : d.contenido;
  return emailWrapper(`
    <p style="color:#C9A449;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:600;margin:0 0 16px;">Nuevo ${d.isReply ? 'Respuesta' : 'Comentario'}</p>
    <h2 style="color:#0E0E0E;font-size:18px;margin:0 0 20px;">${esc(d.authorName)} ${actionLabel} solicitud ${esc(ref)}</h2>

    <div style="background:#FAFAF7;padding:20px 24px;margin-bottom:20px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:5px 0;color:#6B6B6B;font-size:13px;width:130px;">Solicitud:</td><td style="padding:5px 0;font-size:14px;font-weight:700;color:#0E0E0E;">${esc(ref)} — ${esc(d.solicitudNombre)}</td></tr>
        <tr><td style="padding:5px 0;color:#6B6B6B;font-size:13px;">Autor:</td><td style="padding:5px 0;font-size:13px;">${esc(d.authorName)}</td></tr>
      </table>
    </div>

    <div style="border-left:3px solid #C9A449;padding:14px 20px;background:#FAFAF7;margin-bottom:20px;">
      <p style="margin:0;font-size:14px;line-height:1.6;color:#1C1C1C;">${esc(preview)}</p>
    </div>

    <p style="color:#6B6B6B;font-size:13px;line-height:1.6;margin:0;">
      Ingrese al panel de administración para ver el comentario completo y responder.
    </p>
    <p style="color:#6B6B6B;font-size:11px;margin:16px 0 0;">Generado el ${timestamp()}</p>
  `);
}

export async function sendCommentNotification(data: CommentNotificationData): Promise<void> {
  const ref = padId(data.solicitudId);
  const actionLabel = data.isReply ? 'respondió en' : 'comentó en';

  await transporter.sendMail({
    from: FROM,
    to: data.recipientEmail,
    subject: `${data.authorName} ${actionLabel} solicitud ${ref} - Quintana Reyes & Asociados`,
    html: commentNotificationHtml(data),
  });
}

export async function verifySmtpConnection(): Promise<boolean> {
  try {
    await transporter.verify();
    return true;
  } catch {
    return false;
  }
}
