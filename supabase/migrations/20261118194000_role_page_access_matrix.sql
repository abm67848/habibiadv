CREATE TABLE IF NOT EXISTS public.role_page_permissions (
  role_id uuid PRIMARY KEY REFERENCES public.roles(id) ON DELETE CASCADE,
  allowed_paths text[] NOT NULL DEFAULT '{}'::text[],
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.role_page_permissions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_page_permissions TO authenticated;

CREATE OR REPLACE FUNCTION public.can_manage_role_page_permissions()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles AS user_role
    JOIN public.roles AS assigned_role ON assigned_role.id = user_role.role_id
    WHERE user_role.user_id = auth.uid()
      AND assigned_role.name IN ('manager', 'administrator', 'super_admin')
  );
$$;

REVOKE ALL ON FUNCTION public.can_manage_role_page_permissions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_role_page_permissions() TO authenticated;

DROP POLICY IF EXISTS role_page_permissions_read_authenticated ON public.role_page_permissions;
CREATE POLICY role_page_permissions_read_authenticated
  ON public.role_page_permissions
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS role_page_permissions_manage ON public.role_page_permissions;
CREATE POLICY role_page_permissions_manage
  ON public.role_page_permissions
  FOR ALL
  TO authenticated
  USING (public.can_manage_role_page_permissions())
  WITH CHECK (public.can_manage_role_page_permissions());

