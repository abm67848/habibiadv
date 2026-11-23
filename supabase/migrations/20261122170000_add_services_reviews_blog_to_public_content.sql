-- Migration: Add services, home_reviews, and blog columns to public_site_content
ALTER TABLE public.public_site_content
  ADD COLUMN IF NOT EXISTS services jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS home_reviews jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS blog jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Ensure RLS allows public select and authenticated updates
GRANT SELECT ON public.public_site_content TO anon, authenticated;
GRANT UPDATE ON public.public_site_content TO authenticated;

NOTIFY pgrst, 'reload schema';
