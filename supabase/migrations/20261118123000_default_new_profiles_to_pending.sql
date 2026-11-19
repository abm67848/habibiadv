ALTER TABLE public.profiles
  ALTER COLUMN account_status SET DEFAULT 'pending';

UPDATE public.profiles
SET account_status = 'pending'
WHERE account_status IS NULL;

CREATE OR REPLACE FUNCTION public.set_new_profile_account_pending()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.account_status := 'pending';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_new_profile_account_pending ON public.profiles;
CREATE TRIGGER set_new_profile_account_pending
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_new_profile_account_pending();

CREATE OR REPLACE FUNCTION public.enforce_manager_account_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.account_status IS DISTINCT FROM OLD.account_status
    AND (
      ((OLD.account_status IS NULL OR OLD.account_status = 'pending') AND NEW.account_status IN ('active', 'suspended'))
      OR NEW.account_status = 'active'
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.user_roles AS user_role
      JOIN public.roles AS assigned_role ON assigned_role.id = user_role.role_id
      WHERE user_role.user_id = auth.uid()
        AND assigned_role.name IN ('manager', 'super_admin')
    )
  THEN
    RAISE EXCEPTION 'Only managers and super admins can approve or activate accounts.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_manager_account_approval ON public.profiles;
CREATE TRIGGER enforce_manager_account_approval
  BEFORE UPDATE OF account_status ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_manager_account_approval();
