-- Add destinations and partnerships JSONB columns to public_site_content
ALTER TABLE public.public_site_content
  ADD COLUMN IF NOT EXISTS destinations jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS partnerships jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Notify PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
