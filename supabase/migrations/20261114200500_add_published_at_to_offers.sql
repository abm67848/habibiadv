ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

NOTIFY pgrst, 'reload schema';
