CREATE TABLE IF NOT EXISTS public.offer_insurance_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  plan_key text NOT NULL CHECK (plan_key ~ '^[a-z0-9_]{2,40}$'),
  label text NOT NULL,
  description text,
  pricing_model text NOT NULL CHECK (pricing_model IN ('per_traveler', 'flat')),
  premium numeric(14, 2) NOT NULL DEFAULT 0 CHECK (premium >= 0),
  currency text NOT NULL DEFAULT 'MAD' CHECK (currency ~ '^[A-Z]{3}$'),
  min_travelers integer CHECK (min_travelers IS NULL OR min_travelers >= 1),
  is_default boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (offer_id, plan_key)
);

CREATE INDEX IF NOT EXISTS offer_insurance_plans_offer_id_idx
  ON public.offer_insurance_plans (offer_id);

ALTER TABLE public.offer_insurance_plans ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.offer_insurance_plans TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.offer_insurance_plans TO authenticated;

DROP POLICY IF EXISTS offer_insurance_plans_select_packages ON public.offer_insurance_plans;
CREATE POLICY offer_insurance_plans_select_packages
  ON public.offer_insurance_plans
  FOR SELECT
  TO anon, authenticated
  USING (
    (
      active
      AND EXISTS (
        SELECT 1
        FROM public.offers AS o
        WHERE o.id = offer_insurance_plans.offer_id
          AND o.status = 'active'
          AND o.is_public = true
      )
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_roles AS ur
      JOIN public.role_permissions AS rp ON rp.role_id = ur.role_id
      JOIN public.permissions AS p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid()
        AND p.name = 'packages.view'
    )
  );

DROP POLICY IF EXISTS offer_insurance_plans_insert_packages ON public.offer_insurance_plans;
CREATE POLICY offer_insurance_plans_insert_packages
  ON public.offer_insurance_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles AS ur
      JOIN public.role_permissions AS rp ON rp.role_id = ur.role_id
      JOIN public.permissions AS p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid()
        AND p.name = 'packages.update'
    )
    AND EXISTS (
      SELECT 1
      FROM public.offers AS o
      WHERE o.id = offer_insurance_plans.offer_id
    )
  );

DROP POLICY IF EXISTS offer_insurance_plans_update_packages ON public.offer_insurance_plans;
CREATE POLICY offer_insurance_plans_update_packages
  ON public.offer_insurance_plans
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles AS ur
      JOIN public.role_permissions AS rp ON rp.role_id = ur.role_id
      JOIN public.permissions AS p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid()
        AND p.name = 'packages.update'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles AS ur
      JOIN public.role_permissions AS rp ON rp.role_id = ur.role_id
      JOIN public.permissions AS p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid()
        AND p.name = 'packages.update'
    )
    AND EXISTS (
      SELECT 1
      FROM public.offers AS o
      WHERE o.id = offer_insurance_plans.offer_id
    )
  );

DROP POLICY IF EXISTS offer_insurance_plans_delete_packages ON public.offer_insurance_plans;
CREATE POLICY offer_insurance_plans_delete_packages
  ON public.offer_insurance_plans
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles AS ur
      JOIN public.role_permissions AS rp ON rp.role_id = ur.role_id
      JOIN public.permissions AS p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid()
        AND p.name = 'packages.update'
    )
  );

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS extra_insurance boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS insurance_type text,
  ADD COLUMN IF NOT EXISTS insurance_premium numeric(14, 2),
  ADD COLUMN IF NOT EXISTS insurance_plan_key text,
  ADD COLUMN IF NOT EXISTS insurance_plan_label text,
  ADD COLUMN IF NOT EXISTS insurance_pricing_model text
    CHECK (insurance_pricing_model IS NULL OR insurance_pricing_model IN ('per_traveler', 'flat')),
  ADD COLUMN IF NOT EXISTS insurance_currency text;

DROP FUNCTION IF EXISTS public.create_public_package_booking(uuid, uuid, date, integer, text, text, text);
DROP FUNCTION IF EXISTS public.create_public_package_booking(uuid, uuid, date, integer, text, text, text, text);

CREATE FUNCTION public.create_public_package_booking(
  p_offer_id uuid,
  p_offer_departure_id uuid,
  p_requested_departure_date date,
  p_traveler_count integer,
  p_full_name text,
  p_contact text,
  p_special_requests text DEFAULT NULL,
  p_insurance_plan_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_offer public.offers%ROWTYPE;
  v_departure public.offer_departures%ROWTYPE;
  v_insurance_plan public.offer_insurance_plans%ROWTYPE;
  v_customer_id uuid;
  v_booking public.bookings%ROWTYPE;
  v_name text := btrim(COALESCE(p_full_name, ''));
  v_contact text := btrim(COALESCE(p_contact, ''));
  v_email text;
  v_phone text;
  v_rule_price numeric;
  v_rule_currency text;
  v_unit_price numeric;
  v_currency text;
  v_insurance_premium numeric := 0;
  v_departure_date date;
  v_return_date date;
  v_destination text;
BEGIN
  IF length(v_name) < 2 OR length(v_name) > 200 THEN
    RAISE EXCEPTION 'Enter a valid name.';
  END IF;

  IF p_traveler_count IS NULL OR p_traveler_count < 1 THEN
    RAISE EXCEPTION 'At least one traveler is required.';
  END IF;

  IF length(COALESCE(p_special_requests, '')) > 4000 THEN
    RAISE EXCEPTION 'Special requests are too long.';
  END IF;

  IF v_contact = '' OR length(v_contact) > 254 THEN
    RAISE EXCEPTION 'Enter a valid email address or phone number.';
  ELSIF position('@' IN v_contact) > 0 THEN
    IF v_contact !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
      RAISE EXCEPTION 'Enter a valid email address.';
    END IF;
    v_email := lower(v_contact);
  ELSE
    IF length(regexp_replace(v_contact, '[^0-9]', '', 'g')) < 7 THEN
      RAISE EXCEPTION 'Enter a valid phone number.';
    END IF;
    v_phone := v_contact;
  END IF;

  SELECT * INTO v_offer
  FROM public.offers
  WHERE id = p_offer_id
    AND status = 'active'
    AND is_public = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This package is not currently available for booking.';
  END IF;

  IF p_traveler_count < COALESCE(v_offer.min_travelers, 1)
    OR (v_offer.max_travelers IS NOT NULL AND p_traveler_count > v_offer.max_travelers) THEN
    RAISE EXCEPTION 'The traveler count is outside this package''s allowed range.';
  END IF;

  IF p_offer_departure_id IS NOT NULL THEN
    SELECT * INTO v_departure
    FROM public.offer_departures
    WHERE id = p_offer_departure_id
      AND offer_id = p_offer_id
      AND status = 'open'
      AND departure_date >= CURRENT_DATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'This departure is no longer available.';
    END IF;

    IF v_departure.max_capacity IS NOT NULL
      AND v_departure.max_capacity - COALESCE(v_departure.reserved_capacity, 0) < p_traveler_count THEN
      RAISE EXCEPTION 'There are not enough seats remaining for this request.';
    END IF;
    v_departure_date := v_departure.departure_date;
  ELSE
    IF p_requested_departure_date IS NULL OR p_requested_departure_date < CURRENT_DATE THEN
      RAISE EXCEPTION 'Choose a future preferred departure date.';
    END IF;
    v_departure_date := p_requested_departure_date;
  END IF;

  SELECT amount, currency INTO v_rule_price, v_rule_currency
  FROM public.offer_pricing_rules
  WHERE offer_id = p_offer_id AND price_type = 'adult'
  LIMIT 1;

  v_unit_price := COALESCE(v_departure.selling_price_override, v_offer.starting_price, v_rule_price);
  v_currency := COALESCE(v_departure.currency, v_rule_currency, v_offer.default_currency, 'MAD');
  v_return_date := COALESCE(
    v_departure.return_date,
    CASE
      WHEN v_offer.duration_days IS NOT NULL
        THEN v_departure_date + GREATEST(v_offer.duration_days::integer - 1, 0)
      ELSE NULL
    END
  );

  IF p_insurance_plan_key IS NOT NULL THEN
    SELECT * INTO v_insurance_plan
    FROM public.offer_insurance_plans
    WHERE offer_id = p_offer_id
      AND plan_key = p_insurance_plan_key
      AND active = true;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'This insurance plan is no longer available.';
    END IF;

    IF v_insurance_plan.min_travelers IS NOT NULL
      AND p_traveler_count < v_insurance_plan.min_travelers THEN
      RAISE EXCEPTION 'This insurance plan requires at least % travelers.', v_insurance_plan.min_travelers;
    END IF;

    v_insurance_premium := CASE
      WHEN v_insurance_plan.pricing_model = 'per_traveler'
        THEN v_insurance_plan.premium * p_traveler_count
      ELSE v_insurance_plan.premium
    END;
  END IF;

  SELECT destination_name INTO v_destination
  FROM public.offer_destinations
  WHERE offer_id = p_offer_id
  ORDER BY sort_order NULLS LAST
  LIMIT 1;

  IF v_destination IS NULL THEN
    v_destination := v_offer.destination_country;
  END IF;

  INSERT INTO public.customers (first_name, last_name, full_name, email, phone, created_by)
  VALUES (
    split_part(v_name, ' ', 1),
    CASE
      WHEN position(' ' IN v_name) > 0
        THEN substring(v_name FROM position(' ' IN v_name) + 1)
      ELSE ''
    END,
    v_name,
    v_email,
    v_phone,
    NULL
  )
  RETURNING id INTO v_customer_id;

  INSERT INTO public.bookings (
    customer_id,
    offer_id,
    offer_departure_id,
    offer_title,
    offer_reference,
    destination,
    departure_date,
    return_date,
    traveler_count,
    total_amount,
    currency,
    booking_status,
    assigned_to,
    special_requests,
    created_by,
    extra_insurance,
    insurance_premium,
    insurance_plan_key,
    insurance_plan_label,
    insurance_pricing_model,
    insurance_currency
  )
  VALUES (
    v_customer_id,
    p_offer_id,
    p_offer_departure_id,
    COALESCE(v_offer.public_title, v_offer.internal_title, v_offer.reference),
    v_offer.reference,
    COALESCE(v_destination, v_offer.public_title),
    v_departure_date,
    v_return_date,
    p_traveler_count,
    COALESCE(v_unit_price, 0) * p_traveler_count
      + CASE
          WHEN p_insurance_plan_key IS NOT NULL
            AND upper(v_insurance_plan.currency) = upper(v_currency)
            THEN v_insurance_premium
          ELSE 0
        END,
    v_currency,
    'pending',
    NULL,
    NULLIF(btrim(COALESCE(p_special_requests, '')), ''),
    NULL,
    p_insurance_plan_key IS NOT NULL,
    CASE WHEN p_insurance_plan_key IS NOT NULL THEN v_insurance_premium ELSE NULL END,
    CASE WHEN p_insurance_plan_key IS NOT NULL THEN v_insurance_plan.plan_key ELSE NULL END,
    CASE WHEN p_insurance_plan_key IS NOT NULL THEN v_insurance_plan.label ELSE NULL END,
    CASE WHEN p_insurance_plan_key IS NOT NULL THEN v_insurance_plan.pricing_model ELSE NULL END,
    CASE WHEN p_insurance_plan_key IS NOT NULL THEN v_insurance_plan.currency ELSE NULL END
  )
  RETURNING * INTO v_booking;

  RETURN jsonb_build_object(
    'booking_id', v_booking.id,
    'booking_reference', v_booking.booking_reference
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_public_package_booking(uuid, uuid, date, integer, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_public_package_booking(uuid, uuid, date, integer, text, text, text, text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
