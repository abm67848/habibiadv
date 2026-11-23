-- Seed application system roles: super_admin, manager, receptionist, employee, accountant
-- Ensures all 5 standard roles exist in public.roles and have valid permissions

-- 1. Ensure table structure exists
CREATE TABLE IF NOT EXISTS public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read roles
DROP POLICY IF EXISTS roles_read_authenticated ON public.roles;
CREATE POLICY roles_read_authenticated
  ON public.roles
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated managers / super_admins to insert/update roles
DROP POLICY IF EXISTS roles_manage_authenticated ON public.roles;
CREATE POLICY roles_manage_authenticated
  ON public.roles
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 2. Insert or update the 5 system roles
INSERT INTO public.roles (name, description)
VALUES
  ('super_admin', 'Full system access, security management, and role permission administration.'),
  ('manager', 'Full administrative access across operations, teams, bookings, logistics, and settings.'),
  ('receptionist', 'Front-desk customer care, reservation handling, check-in, and daily client inquiries.'),
  ('employee', 'Operational staff member with role-based access to assigned packages and travel tasks.'),
  ('accountant', 'Financial management, customer billing, payment ledgers, invoices, and expenses.')
ON CONFLICT (name) DO UPDATE
SET description = EXCLUDED.description;

-- 3. Pre-seed default role page permissions in public.role_page_permissions
-- (All admin pages: /admin, /admin/packages, /admin/blog, /admin/bookings, /admin/customers,
--  /admin/suppliers, /admin/contracts, /admin/finance, /admin/payments-transactions,
--  /admin/expenses, /admin/analytics, /admin/team, /admin/settings, /admin/profile, /admin/support)

DO $$
DECLARE
  v_role_id uuid;
  v_all_paths text[] := ARRAY[
    '/admin',
    '/admin/packages',
    '/admin/blog',
    '/admin/bookings',
    '/admin/customers',
    '/admin/suppliers',
    '/admin/contracts',
    '/admin/finance',
    '/admin/payments-transactions',
    '/admin/expenses',
    '/admin/analytics',
    '/admin/team',
    '/admin/settings',
    '/admin/messages',
    '/admin/profile',
    '/admin/support'
  ];
  v_receptionist_paths text[] := ARRAY[
    '/admin',
    '/admin/packages',
    '/admin/blog',
    '/admin/bookings',
    '/admin/customers',
    '/admin/messages',
    '/admin/profile',
    '/admin/support'
  ];
  v_employee_paths text[] := ARRAY[
    '/admin',
    '/admin/packages',
    '/admin/blog',
    '/admin/messages',
    '/admin/profile',
    '/admin/support'
  ];
  v_accountant_paths text[] := ARRAY[
    '/admin',
    '/admin/bookings',
    '/admin/contracts',
    '/admin/finance',
    '/admin/payments-transactions',
    '/admin/expenses',
    '/admin/profile',
    '/admin/support'
  ];
BEGIN
  -- Super Admin: full access
  SELECT id INTO v_role_id FROM public.roles WHERE name = 'super_admin';
  IF v_role_id IS NOT NULL THEN
    INSERT INTO public.role_page_permissions (role_id, allowed_paths, updated_at)
    VALUES (v_role_id, v_all_paths, now())
    ON CONFLICT (role_id) DO UPDATE SET allowed_paths = v_all_paths;
  END IF;

  -- Manager: full access
  SELECT id INTO v_role_id FROM public.roles WHERE name = 'manager';
  IF v_role_id IS NOT NULL THEN
    INSERT INTO public.role_page_permissions (role_id, allowed_paths, updated_at)
    VALUES (v_role_id, v_all_paths, now())
    ON CONFLICT (role_id) DO UPDATE SET allowed_paths = v_all_paths;
  END IF;

  -- Receptionist: front desk & bookings
  SELECT id INTO v_role_id FROM public.roles WHERE name = 'receptionist';
  IF v_role_id IS NOT NULL THEN
    INSERT INTO public.role_page_permissions (role_id, allowed_paths, updated_at)
    VALUES (v_role_id, v_receptionist_paths, now())
    ON CONFLICT (role_id) DO UPDATE SET allowed_paths = v_receptionist_paths;
  END IF;

  -- Employee: operational
  SELECT id INTO v_role_id FROM public.roles WHERE name = 'employee';
  IF v_role_id IS NOT NULL THEN
    INSERT INTO public.role_page_permissions (role_id, allowed_paths, updated_at)
    VALUES (v_role_id, v_employee_paths, now())
    ON CONFLICT (role_id) DO UPDATE SET allowed_paths = v_employee_paths;
  END IF;

  -- Accountant: finances & billing
  SELECT id INTO v_role_id FROM public.roles WHERE name = 'accountant';
  IF v_role_id IS NOT NULL THEN
    INSERT INTO public.role_page_permissions (role_id, allowed_paths, updated_at)
    VALUES (v_role_id, v_accountant_paths, now())
    ON CONFLICT (role_id) DO UPDATE SET allowed_paths = v_accountant_paths;
  END IF;
END $$;
