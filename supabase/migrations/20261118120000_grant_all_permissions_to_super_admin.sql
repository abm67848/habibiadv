DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.roles
    WHERE name = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'The super_admin role must exist before granting full permissions.';
  END IF;
END;
$$;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT super_admin.id, permission.id
FROM public.roles AS super_admin
CROSS JOIN public.permissions AS permission
WHERE super_admin.name = 'super_admin'
  AND NOT EXISTS (
    SELECT 1
    FROM public.role_permissions AS existing
    WHERE existing.role_id = super_admin.id
      AND existing.permission_id = permission.id
  );

CREATE OR REPLACE FUNCTION public.grant_new_permission_to_super_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT super_admin.id, NEW.id
  FROM public.roles AS super_admin
  WHERE super_admin.name = 'super_admin'
    AND NOT EXISTS (
      SELECT 1
      FROM public.role_permissions AS existing
      WHERE existing.role_id = super_admin.id
        AND existing.permission_id = NEW.id
    );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_new_permission_to_super_admin() FROM PUBLIC;

DROP TRIGGER IF EXISTS grant_new_permission_to_super_admin ON public.permissions;
CREATE TRIGGER grant_new_permission_to_super_admin
  AFTER INSERT ON public.permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.grant_new_permission_to_super_admin();
