CREATE OR REPLACE FUNCTION public.can_view_admin_page(requested_path text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.profiles AS profile
      WHERE profile.id = auth.uid()
        AND profile.account_status = 'active'
        AND profile.deleted_at IS NULL
    )
    AND (
      requested_path = '/admin/profile'
      OR EXISTS (
        SELECT 1
        FROM public.user_roles AS user_role
        JOIN public.roles AS assigned_role ON assigned_role.id = user_role.role_id
        LEFT JOIN public.role_page_permissions AS page_permission
          ON page_permission.role_id = assigned_role.id
        WHERE user_role.user_id = auth.uid()
          AND (
            assigned_role.name IN ('super_admin', 'manager')
            OR CASE
              WHEN page_permission.role_id IS NOT NULL
                THEN requested_path = ANY(page_permission.allowed_paths)
              WHEN requested_path = '/admin'
                THEN assigned_role.name IN (
                  'super_admin', 'administrator', 'manager', 'sales_agent',
                  'reservation_agent', 'accountant', 'content_manager', 'tour_guide'
                )
              WHEN requested_path = '/admin/bookings'
                THEN assigned_role.name IN (
                  'super_admin', 'administrator', 'manager', 'sales_agent',
                  'reservation_agent', 'accountant'
                )
              WHEN requested_path = '/admin/payments-transactions'
                THEN assigned_role.name IN (
                  'super_admin', 'administrator', 'manager', 'accountant'
                )
              WHEN requested_path = '/admin/finance'
                THEN assigned_role.name IN (
                  'super_admin', 'administrator', 'manager', 'accountant'
                )
              ELSE false
            END
          )
      )
    );
$$;

REVOKE ALL ON FUNCTION public.can_view_admin_page(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_view_admin_page(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.can_view_any_admin_page(requested_paths text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM unnest(requested_paths) AS requested(path)
    WHERE public.can_view_admin_page(requested.path)
  );
$$;

REVOKE ALL ON FUNCTION public.can_view_any_admin_page(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_view_any_admin_page(text[]) TO authenticated;

DO $$
DECLARE
  table_access record;
  relation_kind "char";
BEGIN
  FOR table_access IN
    SELECT *
    FROM (VALUES
      (
        'bookings',
        ARRAY['/admin', '/admin/bookings', '/admin/payments-transactions', '/admin/finance']::text[]
      ),
      (
        'customers',
        ARRAY['/admin', '/admin/bookings', '/admin/customers', '/admin/payments-transactions', '/admin/finance']::text[]
      ),
      (
        'booking_payments',
        ARRAY['/admin', '/admin/bookings', '/admin/payments-transactions', '/admin/finance']::text[]
      ),
      (
        'booking_financials',
        ARRAY['/admin', '/admin/bookings', '/admin/payments-transactions', '/admin/finance']::text[]
      ),
      (
        'booking_documents',
        ARRAY['/admin/bookings']::text[]
      ),
      (
        'offers',
        ARRAY['/admin', '/admin/packages', '/admin/finance']::text[]
      ),
      (
        'offer_departures',
        ARRAY['/admin', '/admin/packages']::text[]
      ),
      (
        'offer_costs',
        ARRAY['/admin/packages', '/admin/finance']::text[]
      ),
      (
        'expenses',
        ARRAY['/admin/finance']::text[]
      ),
      (
        'supplier_payments',
        ARRAY['/admin/finance']::text[]
      ),
      (
        'suppliers',
        ARRAY['/admin/suppliers', '/admin/finance']::text[]
      )
    ) AS permissions(table_name, allowed_pages)
  LOOP
    SELECT relation.relkind
    INTO relation_kind
    FROM pg_class AS relation
    JOIN pg_namespace AS schema ON schema.oid = relation.relnamespace
    WHERE schema.nspname = 'public'
      AND relation.relname = table_access.table_name;

    IF relation_kind IN ('r', 'p') THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_access.table_name);
      EXECUTE format('GRANT SELECT ON TABLE public.%I TO authenticated', table_access.table_name);
      EXECUTE format(
        'DROP POLICY IF EXISTS role_page_matrix_read ON public.%I',
        table_access.table_name
      );
      EXECUTE format(
        'CREATE POLICY role_page_matrix_read ON public.%I FOR SELECT TO authenticated USING (public.can_view_any_admin_page(%L::text[]))',
        table_access.table_name,
        table_access.allowed_pages
      );
    ELSIF relation_kind IN ('v', 'm') THEN
      RAISE NOTICE 'Page-scoped SELECT policy requires a table; %.% is a view', 'public', table_access.table_name;
    ELSE
      RAISE NOTICE 'Skipping page-scoped read policy: public.% does not exist', table_access.table_name;
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_page_booking_financials()
RETURNS SETOF public.booking_financials
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT financials.*
  FROM public.booking_financials AS financials
  WHERE public.can_view_any_admin_page(
    ARRAY['/admin', '/admin/bookings', '/admin/payments-transactions', '/admin/finance']::text[]
  );
$$;

REVOKE ALL ON FUNCTION public.get_page_booking_financials() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_page_booking_financials() TO authenticated;

NOTIFY pgrst, 'reload schema';
