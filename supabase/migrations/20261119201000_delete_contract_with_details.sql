CREATE OR REPLACE FUNCTION public.delete_contract_with_details(p_contract_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL
    OR NOT public.can_view_admin_page('/admin/contracts') THEN
    RAISE EXCEPTION 'Insufficient permission to delete contracts'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.contracts WHERE id = p_contract_id
  ) THEN
    RAISE EXCEPTION 'Contract does not exist'
      USING ERRCODE = 'P0002';
  END IF;

  DELETE FROM public.contract_participants
  WHERE contract_id = p_contract_id;
  DELETE FROM public.contract_price_items
  WHERE contract_id = p_contract_id;
  DELETE FROM public.contract_payments
  WHERE contract_id = p_contract_id;
  DELETE FROM public.contract_service_items
  WHERE contract_id = p_contract_id;
  DELETE FROM public.contract_accommodations
  WHERE contract_id = p_contract_id;
  DELETE FROM public.contract_itinerary_items
  WHERE contract_id = p_contract_id;
  DELETE FROM public.contract_sections
  WHERE contract_id = p_contract_id;

  DELETE FROM public.contracts
  WHERE id = p_contract_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_contract_with_details(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_contract_with_details(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
