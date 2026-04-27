-- One-shot migration: drop the legacy monolingual blog_posts table
-- so the bilingual schema in schema.sql can be recreated by `npm run db:init`.
-- Destructive: any existing posts are erased. Safe in dev where data is seeded.
DROP TABLE IF EXISTS blog_posts;
