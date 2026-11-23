CREATE OR REPLACE FUNCTION public.delete_customer_with_history(p_customer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_booking_ids uuid[];
  v_contract_ids uuid[];
  v_document_urls text[];
BEGIN
  IF auth.uid() IS NULL
    OR NOT public.can_view_admin_page('/admin/customers')
    OR NOT public.can_view_admin_page('/admin/bookings')
    OR NOT public.can_view_admin_page('/admin/contracts')
    OR NOT public.can_view_admin_page('/admin/payments-transactions') THEN
    RAISE EXCEPTION 'Insufficient permission to delete customer history'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.customers WHERE id = p_customer_id
  ) THEN
    RAISE EXCEPTION 'Customer does not exist'
      USING ERRCODE = 'P0002';
  END IF;

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[])
  INTO v_booking_ids
  FROM public.bookings
  WHERE customer_id = p_customer_id;

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[])
  INTO v_contract_ids
  FROM public.contracts
  WHERE booking_id = ANY(v_booking_ids);

  WITH deleted_documents AS (
    DELETE FROM public.booking_documents
    WHERE booking_id = ANY(v_booking_ids)
    RETURNING file_url
  )
  SELECT COALESCE(array_agg(file_url), ARRAY[]::text[])
  INTO v_document_urls
  FROM deleted_documents;

  UPDATE public.expenses
  SET booking_id = NULL
  WHERE booking_id = ANY(v_booking_ids);

  DELETE FROM public.booking_payments
  WHERE booking_id = ANY(v_booking_ids);

  DELETE FROM public.contract_participants
  WHERE contract_id = ANY(v_contract_ids);
  DELETE FROM public.contract_price_items
  WHERE contract_id = ANY(v_contract_ids);
  DELETE FROM public.contract_payments
  WHERE contract_id = ANY(v_contract_ids);
  DELETE FROM public.contract_service_items
  WHERE contract_id = ANY(v_contract_ids);
  DELETE FROM public.contract_accommodations
  WHERE contract_id = ANY(v_contract_ids);
  DELETE FROM public.contract_itinerary_items
  WHERE contract_id = ANY(v_contract_ids);
  DELETE FROM public.contract_sections
  WHERE contract_id = ANY(v_contract_ids);

  DELETE FROM public.contracts
  WHERE id = ANY(v_contract_ids);

  DELETE FROM public.bookings
  WHERE id = ANY(v_booking_ids);

  DELETE FROM public.customers
  WHERE id = p_customer_id;

  RETURN jsonb_build_object('booking_document_urls', to_jsonb(v_document_urls));
END;
$$;

REVOKE ALL ON FUNCTION public.delete_customer_with_history(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_customer_with_history(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
