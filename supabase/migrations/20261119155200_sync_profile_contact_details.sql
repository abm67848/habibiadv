ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS employment_status text NOT NULL DEFAULT 'probation',
  ADD COLUMN IF NOT EXISTS invitation_email text,
  ADD COLUMN IF NOT EXISTS phone text;

CREATE OR REPLACE FUNCTION public.handle_auth_user_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    invitation_email,
    phone,
    account_status,
    employment_status
  )
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), ''),
    NEW.email,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'phone', ''), NULLIF(NEW.phone, '')),
    'pending',
    'probation'
  )
  ON CONFLICT (id) DO UPDATE
    SET invitation_email = COALESCE(NULLIF(profiles.invitation_email, ''), EXCLUDED.invitation_email),
        phone = COALESCE(NULLIF(profiles.phone, ''), EXCLUDED.phone),
        account_status = CASE
          WHEN profiles.account_status = 'active' THEN 'active'
          ELSE 'pending'
        END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_pending ON auth.users;
CREATE TRIGGER on_auth_user_created_pending
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auth_user_created();

UPDATE public.profiles AS profile
SET invitation_email = COALESCE(NULLIF(profile.invitation_email, ''), auth_user.email),
    phone = COALESCE(
      NULLIF(profile.phone, ''),
      NULLIF(auth_user.raw_user_meta_data->>'phone', ''),
      NULLIF(auth_user.phone, '')
    )
FROM auth.users AS auth_user
WHERE auth_user.id = profile.id
  AND (
    profile.invitation_email IS NULL
    OR profile.invitation_email = ''
    OR profile.phone IS NULL
    OR profile.phone = ''
  );
