import sharp from 'sharp';

const MAX_INPUT_BYTES = 5 * 1024 * 1024; // 5MB before compression

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'webp' | 'jpeg';
}

export interface CompressResult {
  base64: string;
  mimeType: string;
  sizeKB: number;
}

/**
 * Strip the data URI prefix (data:image/png;base64,...) if present and return
 * just the base64 payload.
 */
function stripDataUriPrefix(input: string): string {
  const commaIdx = input.indexOf(',');
  if (input.startsWith('data:') && commaIdx !== -1) {
    return input.slice(commaIdx + 1);
  }
  return input;
}

/**
 * Compress a base64-encoded image with sharp. Resizes if it exceeds the
 * configured dimensions and re-encodes it to WebP (or JPEG fallback).
 *
 * Throws an Error with a Spanish message when the input is invalid or too
 * large so the controller can forward it to the client.
 */
export async function compressImage(
  base64Input: string,
  options: CompressOptions = {},
): Promise<CompressResult> {
  if (!base64Input || typeof base64Input !== 'string') {
    throw new Error('Imagen invalida: se esperaba un string base64.');
  }

  const {
    maxWidth = 1200,
    maxHeight = 800,
    quality = 80,
    format = 'webp',
  } = options;

  const payload = stripDataUriPrefix(base64Input).trim();

  let buffer: Buffer;
  try {
    buffer = Buffer.from(payload, 'base64');
  } catch {
    throw new Error('Imagen invalida: no se pudo decodificar el base64.');
  }

  if (buffer.length === 0) {
    throw new Error('Imagen invalida: contenido vacio.');
  }
  if (buffer.length > MAX_INPUT_BYTES) {
    throw new Error('La imagen excede el tamano maximo permitido (5MB).');
  }

  let pipeline: sharp.Sharp;
  try {
    pipeline = sharp(buffer);
    const meta = await pipeline.metadata();
    if (!meta.format) {
      throw new Error('Formato de imagen no reconocido.');
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Formato')) throw err;
    throw new Error('Imagen invalida: no se pudo procesar el archivo.');
  }

  pipeline = pipeline.rotate().resize({
    width: maxWidth,
    height: maxHeight,
    fit: 'inside',
    withoutEnlargement: true,
  });

  let outputBuffer: Buffer;
  let mimeType: string;
  if (format === 'jpeg') {
    outputBuffer = await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();
    mimeType = 'image/jpeg';
  } else {
    outputBuffer = await pipeline.webp({ quality }).toBuffer();
    mimeType = 'image/webp';
  }

  return {
    base64: outputBuffer.toString('base64'),
    mimeType,
    sizeKB: Math.round(outputBuffer.length / 1024),
  };
}
