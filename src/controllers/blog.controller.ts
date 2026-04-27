import { Request, Response } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { validationResult } from 'express-validator';
import pool from '../config/database';
import { AuthRequest, BlogPostRow, EstadoBlog } from '../types';
import { compressImage } from '../services/image.service';
import { generateSlug, generateUniqueSlug } from '../services/slug.service';

const VALID_ESTADOS: EstadoBlog[] = [
  'BORRADOR',
  'PROGRAMADO',
  'PUBLICADO',
  'ARCHIVADO',
];

type Lang = 'es' | 'en';

interface CountRow extends RowDataPacket {
  total: number;
}

/**
 * Convert a tags column (string from JSON or already-parsed array) into a
 * plain string[]. Returns [] when null/empty/invalid.
 */
function normalizeTags(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function parseLang(raw: unknown): Lang {
  return raw === 'en' ? 'en' : 'es';
}

/**
 * Project a bilingual row down to a single language using flat aliases
 * (titulo, slug, extracto, contenido, categoria, tags) so the public API
 * stays language-agnostic from the consumer's perspective.
 *
 * `includeContenido=false` is used in list endpoints to keep payload light.
 */
function shapePublicPost(
  row: BlogPostRow,
  lang: Lang,
  includeContenido: boolean,
): Record<string, unknown> {
  const titulo = lang === 'en' ? row.titulo_en : row.titulo_es;
  const slug = lang === 'en' ? row.slug_en : row.slug_es;
  const extracto = lang === 'en' ? row.extracto_en : row.extracto_es;
  const contenido = lang === 'en' ? row.contenido_en : row.contenido_es;
  const categoria = lang === 'en' ? row.categoria_en : row.categoria_es;
  const tagsRaw = lang === 'en' ? row.tags_en : row.tags_es;

  const base: Record<string, unknown> = {
    id: row.id,
    titulo,
    slug,
    // Both slugs are exposed so the client can build language-switcher links
    // (e.g. /es/blog/<slug_es> ↔ /en/blog/<slug_en>) without a second request.
    slug_es: row.slug_es ?? null,
    slug_en: row.slug_en ?? null,
    extracto: extracto ?? null,
    categoria: categoria ?? null,
    tags: normalizeTags(tagsRaw),
    imagenDestacada: row.imagenDestacada ?? null,
    imagenDestacadaMime: row.imagenDestacadaMime ?? null,
    autor: row.autor,
    estado: row.estado,
    fechaPublicacion: row.fechaPublicacion,
    fechaCreacion: row.fechaCreacion,
    fechaActualizacion: row.fechaActualizacion,
    creadoPorId: row.creadoPorId,
    lang,
  };
  if (includeContenido) base.contenido = contenido ?? null;
  return base;
}

/**
 * Admin shape: returns the bilingual row as-is, only normalizing tag JSON
 * blobs into arrays so the editor can hydrate both tabs without parsing.
 */
function shapeAdminPost(row: BlogPostRow): Record<string, unknown> {
  return {
    ...row,
    tags_es: normalizeTags(row.tags_es),
    tags_en: normalizeTags(row.tags_en),
  };
}

/**
 * GET /api/blog?lang=es|en
 * PUBLIC. Lists posts with estado=PUBLICADO and fechaPublicacion <= NOW()
 * that have a non-empty version in the requested language. Returns extracto +
 * metadata only (no full contenido) to keep the payload light.
 */
export async function getPublicBlogPosts(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const lang = parseLang(req.query.lang);
    const tituloCol = `titulo_${lang}`;
    const contenidoCol = `contenido_${lang}`;
    const slugCol = `slug_${lang}`;
    const extractoCol = `extracto_${lang}`;
    const categoriaCol = `categoria_${lang}`;
    const tagsCol = `tags_${lang}`;

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit as string) || 9),
    );
    const offset = (page - 1) * limit;

    const conditions: string[] = [
      "estado = 'PUBLICADO'",
      'fechaPublicacion IS NOT NULL',
      'fechaPublicacion <= UTC_TIMESTAMP()',
      `${tituloCol} IS NOT NULL`,
      `${tituloCol} <> ''`,
      `${contenidoCol} IS NOT NULL`,
      `${contenidoCol} <> ''`,
    ];
    const params: unknown[] = [];

    if (req.query.categoria) {
      conditions.push(`${categoriaCol} = ?`);
      params.push(req.query.categoria);
    }
    if (req.query.search) {
      const search = `%${req.query.search}%`;
      conditions.push(`(${tituloCol} LIKE ? OR ${extractoCol} LIKE ?)`);
      params.push(search, search);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const [countResult] = await pool.query<CountRow[]>(
      `SELECT COUNT(*) as total FROM blog_posts ${whereClause}`,
      params,
    );
    const total = countResult[0]?.total ?? 0;

    params.push(limit, offset);
    const [rows] = await pool.query<BlogPostRow[]>(
      `SELECT id,
              ${tituloCol}    AS ${tituloCol},
              ${slugCol}      AS ${slugCol},
              slug_es, slug_en,
              ${extractoCol}  AS ${extractoCol},
              ${categoriaCol} AS ${categoriaCol},
              ${tagsCol}      AS ${tagsCol},
              imagenDestacada, imagenDestacadaMime,
              autor, estado, fechaPublicacion,
              fechaCreacion, fechaActualizacion, creadoPorId
       FROM blog_posts
       ${whereClause}
       ORDER BY fechaPublicacion DESC
       LIMIT ? OFFSET ?`,
      params,
    );

    res.json({
      success: true,
      data: rows.map((r) => shapePublicPost(r, lang, false)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[blog.public.list] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor.',
    });
  }
}

/**
 * GET /api/blog/:slug?lang=es|en
 * PUBLIC. Returns a single published post by slug, including contenido.
 *
 * If `lang` is provided, matches the corresponding slug column directly. If
 * not, tries slug_es first then slug_en, and uses whichever matched as the
 * projection language — this lets shared/canonical URLs keep working when
 * the admin only filled one language.
 */
export async function getPublicBlogPostBySlug(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const slug = (req.params.slug as string)?.trim();
    if (!slug) {
      res.status(400).json({ success: false, message: 'Slug invalido.' });
      return;
    }

    const requestedLang = req.query.lang === 'es' || req.query.lang === 'en'
      ? (req.query.lang as Lang)
      : null;

    const fetchBy = async (column: 'slug_es' | 'slug_en'): Promise<BlogPostRow | null> => {
      const [rows] = await pool.query<BlogPostRow[]>(
        `SELECT * FROM blog_posts
         WHERE ${column} = ? AND estado = 'PUBLICADO'
           AND fechaPublicacion IS NOT NULL AND fechaPublicacion <= UTC_TIMESTAMP()
         LIMIT 1`,
        [slug],
      );
      return rows[0] ?? null;
    };

    let row: BlogPostRow | null = null;
    let matchedLang: Lang = 'es';

    if (requestedLang) {
      const col = requestedLang === 'en' ? 'slug_en' : 'slug_es';
      row = await fetchBy(col);
      matchedLang = requestedLang;
    } else {
      row = await fetchBy('slug_es');
      if (row) {
        matchedLang = 'es';
      } else {
        row = await fetchBy('slug_en');
        matchedLang = 'en';
      }
    }

    if (!row) {
      res.status(404).json({
        success: false,
        message: 'Articulo no encontrado.',
      });
      return;
    }

    // Guard against asking for a language whose content was never authored.
    const tituloForLang = matchedLang === 'en' ? row.titulo_en : row.titulo_es;
    const contenidoForLang = matchedLang === 'en' ? row.contenido_en : row.contenido_es;
    if (!tituloForLang || !contenidoForLang) {
      res.status(404).json({
        success: false,
        message: 'Articulo no encontrado.',
      });
      return;
    }

    res.json({ success: true, data: shapePublicPost(row, matchedLang, true) });
  } catch (error) {
    console.error('[blog.public.bySlug] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor.',
    });
  }
}

/**
 * GET /api/blog/admin/all
 * Protected. Lists all posts with any estado, with filters and pagination.
 * Returns the raw bilingual columns so the admin UI can render both tabs.
 */
export async function getAdminBlogPosts(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit as string) || 20),
    );
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (req.query.estado && VALID_ESTADOS.includes(req.query.estado as EstadoBlog)) {
      conditions.push('estado = ?');
      params.push(req.query.estado);
    }
    if (req.query.categoria) {
      conditions.push('(categoria_es = ? OR categoria_en = ?)');
      params.push(req.query.categoria, req.query.categoria);
    }
    if (req.query.search) {
      const search = `%${req.query.search}%`;
      conditions.push(
        '(titulo_es LIKE ? OR titulo_en LIKE ? OR slug_es LIKE ? OR slug_en LIKE ?)',
      );
      params.push(search, search, search, search);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const [countResult] = await pool.query<CountRow[]>(
      `SELECT COUNT(*) as total FROM blog_posts ${whereClause}`,
      params,
    );
    const total = countResult[0]?.total ?? 0;

    params.push(limit, offset);
    const [rows] = await pool.query<BlogPostRow[]>(
      `SELECT id,
              titulo_es, titulo_en,
              slug_es, slug_en,
              extracto_es, extracto_en,
              categoria_es, categoria_en,
              tags_es, tags_en,
              imagenDestacadaMime,
              autor, estado, fechaPublicacion,
              fechaCreacion, fechaActualizacion, creadoPorId
       FROM blog_posts
       ${whereClause}
       ORDER BY fechaCreacion DESC
       LIMIT ? OFFSET ?`,
      params,
    );

    res.json({
      success: true,
      data: rows.map(shapeAdminPost),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[blog.admin.list] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor.',
    });
  }
}

/**
 * GET /api/blog/admin/:id
 * Protected. Returns a single post by id with full bilingual contenido
 * (any estado).
 */
export async function getAdminBlogPostById(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id) || id < 1) {
      res.status(400).json({ success: false, message: 'ID invalido.' });
      return;
    }

    const [rows] = await pool.query<BlogPostRow[]>(
      'SELECT * FROM blog_posts WHERE id = ? LIMIT 1',
      [id],
    );

    if (rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Articulo no encontrado.',
      });
      return;
    }

    res.json({ success: true, data: shapeAdminPost(rows[0]) });
  } catch (error) {
    console.error('[blog.admin.byId] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor.',
    });
  }
}

/**
 * POST /api/blog
 * Protected. Creates a new blog post. Compresses imagenDestacada with sharp.
 * Slugs are derived server-side from the titles per language; client cannot
 * supply slug_es/slug_en directly.
 */
export async function createBlogPost(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, message: errors.array()[0].msg });
    return;
  }
  if (!req.user) {
    res.status(401).json({ success: false, message: 'No autenticado.' });
    return;
  }

  const {
    titulo_es,
    titulo_en,
    extracto_es,
    extracto_en,
    contenido_es,
    contenido_en,
    categoria_es,
    categoria_en,
    tags_es,
    tags_en,
    imagenDestacada,
    autor,
    estado,
    fechaPublicacion,
  } = req.body as Record<string, unknown>;

  try {
    // Derive slugs from titles. EN slug only when an EN title is supplied.
    const slugEs = await generateUniqueSlug(
      generateSlug(String(titulo_es)),
      undefined,
      'slug_es',
    );

    const tituloEnTrim =
      typeof titulo_en === 'string' ? titulo_en.trim() : '';
    const slugEn = tituloEnTrim
      ? await generateUniqueSlug(
          generateSlug(tituloEnTrim),
          undefined,
          'slug_en',
        )
      : null;

    // Compress image (when provided) before storing
    let imagenBase64: string | null = null;
    let imagenMime: string | null = null;
    if (typeof imagenDestacada === 'string' && imagenDestacada.length > 0) {
      try {
        const compressed = await compressImage(imagenDestacada);
        imagenBase64 = compressed.base64;
        imagenMime = compressed.mimeType;
      } catch (imgErr) {
        const message = imgErr instanceof Error ? imgErr.message : 'Imagen invalida.';
        res.status(400).json({ success: false, message });
        return;
      }
    }

    const finalEstado: EstadoBlog =
      typeof estado === 'string' && VALID_ESTADOS.includes(estado as EstadoBlog)
        ? (estado as EstadoBlog)
        : 'BORRADOR';

    // Use SQL UTC_TIMESTAMP() (server time) when publishing without an explicit
    // date so the value is comparable to UTC_TIMESTAMP() in the public read filter.
    // Mixing JS new Date() with SQL UTC across timezones produces stale rows.
    const useSqlNow = finalEstado === 'PUBLICADO' && !fechaPublicacion;
    const fechaPublicacionParam = useSqlNow
      ? null
      : fechaPublicacion
        ? new Date(String(fechaPublicacion))
        : null;
    const fechaPlaceholder = useSqlNow ? 'UTC_TIMESTAMP()' : '?';

    const tagsEsJson = Array.isArray(tags_es) ? JSON.stringify(tags_es) : null;
    const tagsEnJson = Array.isArray(tags_en) ? JSON.stringify(tags_en) : null;

    const tituloEnVal = tituloEnTrim || null;
    const extractoEsVal =
      typeof extracto_es === 'string' && extracto_es.length > 0 ? extracto_es : null;
    const extractoEnVal =
      typeof extracto_en === 'string' && extracto_en.length > 0 ? extracto_en : null;
    const contenidoEnVal =
      typeof contenido_en === 'string' && contenido_en.length > 0 ? contenido_en : null;
    const categoriaEsVal =
      typeof categoria_es === 'string' && categoria_es.length > 0 ? categoria_es : null;
    const categoriaEnVal =
      typeof categoria_en === 'string' && categoria_en.length > 0 ? categoria_en : null;

    const insertParams: unknown[] = [
      titulo_es,
      tituloEnVal,
      slugEs,
      slugEn,
      extractoEsVal,
      extractoEnVal,
      contenido_es,
      contenidoEnVal,
      categoriaEsVal,
      categoriaEnVal,
      tagsEsJson,
      tagsEnJson,
      imagenBase64,
      imagenMime,
      autor,
      finalEstado,
    ];
    if (!useSqlNow) insertParams.push(fechaPublicacionParam);
    insertParams.push(req.user.id);

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO blog_posts
        (titulo_es, titulo_en, slug_es, slug_en,
         extracto_es, extracto_en, contenido_es, contenido_en,
         categoria_es, categoria_en, tags_es, tags_en,
         imagenDestacada, imagenDestacadaMime,
         autor, estado, fechaPublicacion, creadoPorId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${fechaPlaceholder}, ?)`,
      insertParams,
    );

    await pool.query<ResultSetHeader>(
      `INSERT INTO audit_logs (usuarioId, accion, entidad, entidadId, metadata)
       VALUES (?, ?, ?, ?, ?)`,
      [
        req.user.id,
        'CREATE',
        'blog_posts',
        result.insertId,
        JSON.stringify({
          titulo_es,
          titulo_en: tituloEnVal,
          slug_es: slugEs,
          slug_en: slugEn,
          estado: finalEstado,
        }),
      ],
    );

    const [created] = await pool.query<BlogPostRow[]>(
      'SELECT * FROM blog_posts WHERE id = ? LIMIT 1',
      [result.insertId],
    );

    res.status(201).json({ success: true, data: shapeAdminPost(created[0]) });
  } catch (error) {
    console.error('[blog.create] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor.',
    });
  }
}

/**
 * PUT /api/blog/:id
 * Protected. Updates a blog post. Re-compresses imagenDestacada if provided.
 * Slugs are server-derived: any slug_es/slug_en supplied by the client is
 * ignored. Changing titulo_<lang> regenerates slug_<lang>; clearing
 * titulo_en clears slug_en.
 */
export async function updateBlogPost(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, message: errors.array()[0].msg });
    return;
  }

  const id = parseInt(req.params.id as string);
  if (isNaN(id) || id < 1) {
    res.status(400).json({ success: false, message: 'ID invalido.' });
    return;
  }
  if (!req.user) {
    res.status(401).json({ success: false, message: 'No autenticado.' });
    return;
  }

  try {
    const [existing] = await pool.query<BlogPostRow[]>(
      'SELECT * FROM blog_posts WHERE id = ? LIMIT 1',
      [id],
    );
    if (existing.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Articulo no encontrado.',
      });
      return;
    }

    const current = existing[0];
    const body = req.body as Record<string, unknown>;
    const updates: string[] = [];
    const params: unknown[] = [];
    const changes: Record<string, unknown> = {};

    // ── Titulos / slugs (server-derived) ────────────────────────────
    if (body.titulo_es !== undefined) {
      const newTitulo = String(body.titulo_es);
      updates.push('titulo_es = ?');
      params.push(newTitulo);
      changes.titulo_es = true;

      const newSlug = await generateUniqueSlug(
        generateSlug(newTitulo),
        id,
        'slug_es',
      );
      if (newSlug !== current.slug_es) {
        updates.push('slug_es = ?');
        params.push(newSlug);
        changes.slug_es = { from: current.slug_es, to: newSlug };
      }
    }

    if (body.titulo_en !== undefined) {
      const raw = body.titulo_en;
      const trimmed = typeof raw === 'string' ? raw.trim() : '';
      if (raw === null || trimmed === '') {
        updates.push('titulo_en = ?', 'slug_en = ?');
        params.push(null, null);
        changes.titulo_en = 'cleared';
        if (current.slug_en) changes.slug_en = { from: current.slug_en, to: null };
      } else {
        updates.push('titulo_en = ?');
        params.push(trimmed);
        changes.titulo_en = true;

        const newSlug = await generateUniqueSlug(
          generateSlug(trimmed),
          id,
          'slug_en',
        );
        if (newSlug !== current.slug_en) {
          updates.push('slug_en = ?');
          params.push(newSlug);
          changes.slug_en = { from: current.slug_en, to: newSlug };
        }
      }
    }

    // ── Extractos ───────────────────────────────────────────────────
    if (body.extracto_es !== undefined) {
      updates.push('extracto_es = ?');
      params.push(body.extracto_es || null);
    }
    if (body.extracto_en !== undefined) {
      updates.push('extracto_en = ?');
      params.push(body.extracto_en || null);
    }

    // ── Contenidos ──────────────────────────────────────────────────
    if (body.contenido_es !== undefined) {
      updates.push('contenido_es = ?');
      params.push(body.contenido_es);
      changes.contenido_es = true;
    }
    if (body.contenido_en !== undefined) {
      updates.push('contenido_en = ?');
      params.push(body.contenido_en || null);
      changes.contenido_en = true;
    }

    // ── Imagen ──────────────────────────────────────────────────────
    if (body.imagenDestacada !== undefined) {
      if (body.imagenDestacada === null || body.imagenDestacada === '') {
        updates.push('imagenDestacada = ?', 'imagenDestacadaMime = ?');
        params.push(null, null);
        changes.imagenDestacada = 'removed';
      } else if (typeof body.imagenDestacada === 'string') {
        try {
          const compressed = await compressImage(body.imagenDestacada);
          updates.push('imagenDestacada = ?', 'imagenDestacadaMime = ?');
          params.push(compressed.base64, compressed.mimeType);
          changes.imagenDestacada = 'replaced';
        } catch (imgErr) {
          const message = imgErr instanceof Error ? imgErr.message : 'Imagen invalida.';
          res.status(400).json({ success: false, message });
          return;
        }
      }
    }

    // ── Categorias ──────────────────────────────────────────────────
    if (body.categoria_es !== undefined) {
      updates.push('categoria_es = ?');
      params.push(body.categoria_es || null);
    }
    if (body.categoria_en !== undefined) {
      updates.push('categoria_en = ?');
      params.push(body.categoria_en || null);
    }

    // ── Tags ────────────────────────────────────────────────────────
    if (body.tags_es !== undefined) {
      updates.push('tags_es = ?');
      params.push(Array.isArray(body.tags_es) ? JSON.stringify(body.tags_es) : null);
    }
    if (body.tags_en !== undefined) {
      updates.push('tags_en = ?');
      params.push(Array.isArray(body.tags_en) ? JSON.stringify(body.tags_en) : null);
    }

    // ── Compartidos ─────────────────────────────────────────────────
    if (body.autor !== undefined) {
      updates.push('autor = ?');
      params.push(body.autor);
    }
    if (body.estado !== undefined && VALID_ESTADOS.includes(body.estado as EstadoBlog)) {
      updates.push('estado = ?');
      params.push(body.estado);
      changes.estado = { from: current.estado, to: body.estado };

      // Auto-set fechaPublicacion when going to PUBLICADO without an explicit
      // date. Use UTC_TIMESTAMP() so we stay consistent with the public read
      // filter and the pool's UTC storage convention.
      if (
        body.estado === 'PUBLICADO' &&
        body.fechaPublicacion === undefined &&
        !current.fechaPublicacion
      ) {
        updates.push('fechaPublicacion = UTC_TIMESTAMP()');
      }
    }
    if (body.fechaPublicacion !== undefined) {
      updates.push('fechaPublicacion = ?');
      params.push(body.fechaPublicacion ? new Date(String(body.fechaPublicacion)) : null);
    }

    if (updates.length === 0) {
      res.status(400).json({
        success: false,
        message: 'No se proporcionaron campos para actualizar.',
      });
      return;
    }

    params.push(id);
    await pool.query<ResultSetHeader>(
      `UPDATE blog_posts SET ${updates.join(', ')} WHERE id = ?`,
      params,
    );

    await pool.query<ResultSetHeader>(
      `INSERT INTO audit_logs (usuarioId, accion, entidad, entidadId, metadata)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, 'UPDATE', 'blog_posts', id, JSON.stringify(changes)],
    );

    const [updated] = await pool.query<BlogPostRow[]>(
      'SELECT * FROM blog_posts WHERE id = ? LIMIT 1',
      [id],
    );
    res.json({ success: true, data: shapeAdminPost(updated[0]) });
  } catch (error) {
    console.error('[blog.update] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor.',
    });
  }
}

/**
 * DELETE /api/blog/:id
 * Protected (Admin only). Permanently deletes a blog post.
 */
export async function deleteBlogPost(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const id = parseInt(req.params.id as string);
  if (isNaN(id) || id < 1) {
    res.status(400).json({ success: false, message: 'ID invalido.' });
    return;
  }
  if (!req.user) {
    res.status(401).json({ success: false, message: 'No autenticado.' });
    return;
  }

  try {
    const [existing] = await pool.query<BlogPostRow[]>(
      'SELECT id, titulo_es, slug_es FROM blog_posts WHERE id = ? LIMIT 1',
      [id],
    );
    if (existing.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Articulo no encontrado.',
      });
      return;
    }

    await pool.query<ResultSetHeader>('DELETE FROM blog_posts WHERE id = ?', [id]);

    await pool.query<ResultSetHeader>(
      `INSERT INTO audit_logs (usuarioId, accion, entidad, entidadId, metadata)
       VALUES (?, ?, ?, ?, ?)`,
      [
        req.user.id,
        'DELETE',
        'blog_posts',
        id,
        JSON.stringify({
          titulo_es: existing[0].titulo_es,
          slug_es: existing[0].slug_es,
        }),
      ],
    );

    res.json({
      success: true,
      message: 'Articulo eliminado correctamente.',
    });
  } catch (error) {
    console.error('[blog.delete] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor.',
    });
  }
}
