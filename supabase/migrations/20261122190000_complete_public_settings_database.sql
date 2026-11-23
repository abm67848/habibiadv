-- Complete database-backed control for all Settings tabs.
ALTER TABLE public.public_site_content
  ADD COLUMN IF NOT EXISTS agency_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS contract_template jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Ensure public read and settings-admin write remain explicit.
GRANT SELECT ON public.public_site_content TO anon, authenticated;
GRANT UPDATE ON public.public_site_content TO authenticated;

CREATE INDEX IF NOT EXISTS public_site_content_agency_settings_gin
  ON public.public_site_content USING gin (agency_settings);
CREATE INDEX IF NOT EXISTS public_site_content_contract_template_gin
  ON public.public_site_content USING gin (contract_template);

NOTIFY pgrst, 'reload schema';
