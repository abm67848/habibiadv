-- Create contact_messages table to receive inquiries submitted from the public /contact page
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  topic text,
  preferred_reply text DEFAULT 'email',
  message text NOT NULL,
  package_ref text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- 1. Allow anyone (public/anon and authenticated) to submit a contact message
DROP POLICY IF EXISTS contact_messages_insert_public ON public.contact_messages;
CREATE POLICY contact_messages_insert_public
  ON public.contact_messages
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 2. Allow authenticated staff to view all contact messages
DROP POLICY IF EXISTS contact_messages_select_authenticated ON public.contact_messages;
CREATE POLICY contact_messages_select_authenticated
  ON public.contact_messages
  FOR SELECT
  TO authenticated
  USING (true);

-- 3. Allow authenticated staff to update message status or internal notes
DROP POLICY IF EXISTS contact_messages_update_authenticated ON public.contact_messages;
CREATE POLICY contact_messages_update_authenticated
  ON public.contact_messages
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. Allow authenticated staff to delete/archive messages
DROP POLICY IF EXISTS contact_messages_delete_authenticated ON public.contact_messages;
CREATE POLICY contact_messages_delete_authenticated
  ON public.contact_messages
  FOR DELETE
  TO authenticated
  USING (true);

-- Realtime support
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.contact_messages;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
