-- ============================================================
--  PENDING ACCOUNT ENFORCEMENT (FIXED & TESTED)
--  Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ── STEP 1: Add columns if they do not exist ───────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'pending';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS employment_status TEXT NOT NULL DEFAULT 'probation';

-- Add invitation_email if missing so team directory/invite features work safely
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS invitation_email TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- ── STEP 2: Trigger function on profiles table ─────────────────
CREATE OR REPLACE FUNCTION public.handle_new_profile_pending_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Always default new profiles to pending unless explicitly activated by an admin
  IF NEW.account_status IS NULL OR NEW.account_status = '' THEN
    NEW.account_status := 'pending';
  END IF;

  IF NEW.employment_status IS NULL OR NEW.employment_status = '' THEN
    NEW.employment_status := 'probation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created_set_pending ON public.profiles;
CREATE TRIGGER on_profile_created_set_pending
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_profile_pending_status();

-- ── STEP 3: Auto-create profile row from auth.users ────────────
-- When a user registers through Supabase auth, create their profile with 'pending'
CREATE OR REPLACE FUNCTION public.handle_auth_user_created()
RETURNS TRIGGER
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
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
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

  -- Backfill contact details for accounts created before the profile trigger stored them.
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

-- ── STEP 4: Activate your manager account (elyoussfiayoub66@gmail.com) ───
-- This uses auth.users.email to find your user id safely regardless of column names!
UPDATE public.profiles
SET 
  account_status = 'active',
  employment_status = 'active'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'elyoussfiayoub66@gmail.com'
);

-- Also ensure super_admin role is assigned to your user
DO $$
DECLARE
  v_user_id UUID;
  v_role_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'elyoussfiayoub66@gmail.com' LIMIT 1;
  SELECT id INTO v_role_id FROM public.roles WHERE name IN ('super_admin', 'superadmin', 'manager', 'administrator') LIMIT 1;

  IF v_user_id IS NOT NULL AND v_role_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role_id)
    VALUES (v_user_id, v_role_id)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ── STEP 5: Verify your profile status ─────────────────────────
SELECT 
  p.id,
  u.email,
  p.full_name,
  p.account_status,
  p.employment_status
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE u.email = 'elyoussfiayoub66@gmail.com';
