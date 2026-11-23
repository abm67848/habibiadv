CREATE TABLE IF NOT EXISTS public.public_site_content (
  id text PRIMARY KEY CHECK (id = 'public'),
  contact jsonb NOT NULL DEFAULT '{}'::jsonb,
  about jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.public_site_content ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.public_site_content TO anon, authenticated;
GRANT UPDATE ON public.public_site_content TO authenticated;

DROP POLICY IF EXISTS public_site_content_read ON public.public_site_content;
CREATE POLICY public_site_content_read
  ON public.public_site_content
  FOR SELECT
  TO anon, authenticated
  USING (id = 'public');

DROP POLICY IF EXISTS public_site_content_admin_update ON public.public_site_content;
CREATE POLICY public_site_content_admin_update
  ON public.public_site_content
  FOR UPDATE
  TO authenticated
  USING (public.can_view_admin_page('/admin/settings'))
  WITH CHECK (public.can_view_admin_page('/admin/settings'));

INSERT INTO public.public_site_content (id)
VALUES ('public')
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.delete_my_account(
  confirmation_email text,
  confirmation_phrase text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  target_user_id uuid := auth.uid();
  token_issued_at bigint;
BEGIN
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'A signed-in account is required.';
  END IF;

  IF lower(btrim(COALESCE(confirmation_email, ''))) <> lower(COALESCE(auth.jwt()->>'email', '')) THEN
    RAISE EXCEPTION 'The confirmation email does not match the signed-in account.';
  END IF;

  IF confirmation_phrase <> 'DELETE MY ACCOUNT' THEN
    RAISE EXCEPTION 'The confirmation phrase is incorrect.';
  END IF;

  IF COALESCE(auth.jwt()->>'iat', '') !~ '^[0-9]+$' THEN
    RAISE EXCEPTION 'Please re-authenticate before deleting your account.';
  END IF;

  token_issued_at := (auth.jwt()->>'iat')::bigint;
  IF to_timestamp(token_issued_at::double precision) < now() - interval '5 minutes' THEN
    RAISE EXCEPTION 'Please re-authenticate before deleting your account.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_roles AS target_role
    JOIN public.roles AS role ON role.id = target_role.role_id
    WHERE target_role.user_id = target_user_id
      AND role.name = 'super_admin'
  ) AND NOT EXISTS (
    SELECT 1
    FROM public.user_roles AS other_role
    JOIN public.roles AS role ON role.id = other_role.role_id
    JOIN public.profiles AS profile ON profile.id = other_role.user_id
    WHERE other_role.user_id <> target_user_id
      AND role.name = 'super_admin'
      AND profile.account_status = 'active'
      AND profile.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'The last active super admin cannot delete their account.';
  END IF;

  DELETE FROM auth.users
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The signed-in account could not be found.';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_account(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_my_account(text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
