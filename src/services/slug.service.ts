import pool from '../config/database';
import { RowDataPacket } from 'mysql2';

/**
 * Convert a string to a URL-friendly slug:
 *   - lowercase
 *   - remove diacritics (combining marks U+0300..U+036F)
 *   - replace non-alphanumeric runs with a single hyphen
 *   - trim leading/trailing hyphens
 *   - cap length at 320 chars (column is VARCHAR(350))
 */
export function generateSlug(input: string): string {
  const DIACRITICS = /[̀-ͯ]/g;
  const base = (input || '')
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return base.slice(0, 320) || 'post';
}

interface SlugRow extends RowDataPacket {
  id: number;
}

export type SlugColumn = 'slug_es' | 'slug_en';

/**
 * Generate a unique slug from a title, optionally ignoring a given post id
 * (so editing a post does not collide with itself). The `column` parameter
 * selects which slug column to check for uniqueness, since blog_posts now
 * holds a slug per language.
 */
export async function generateUniqueSlug(
  title: string,
  ignoreId?: number,
  column: SlugColumn = 'slug_es',
): Promise<string> {
  const baseSlug = generateSlug(title);
  let candidate = baseSlug;
  let counter = 2;

  while (true) {
    const params: unknown[] = [candidate];
    let sql = `SELECT id FROM blog_posts WHERE ${column} = ?`;
    if (ignoreId !== undefined) {
      sql += ' AND id != ?';
      params.push(ignoreId);
    }
    sql += ' LIMIT 1';

    const [rows] = await pool.query<SlugRow[]>(sql, params);
    if (rows.length === 0) return candidate;

    candidate = `${baseSlug}-${counter}`;
    counter += 1;
  }
}
