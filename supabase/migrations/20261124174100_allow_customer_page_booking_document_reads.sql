GRANT SELECT ON TABLE public.booking_documents TO authenticated;

DROP POLICY IF EXISTS role_page_matrix_read ON public.booking_documents;
CREATE POLICY role_page_matrix_read
  ON public.booking_documents
  FOR SELECT
  TO authenticated
  USING (
    public.can_view_any_admin_page(
      ARRAY['/admin/bookings', '/admin/customers']::text[]
    )
  );

NOTIFY pgrst, 'reload schema';
