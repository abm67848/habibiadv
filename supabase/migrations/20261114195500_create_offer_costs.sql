CREATE TABLE IF NOT EXISTS public.offer_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  cost_type text NOT NULL CHECK (cost_type IN ('accommodation', 'flight', 'ground', 'activity', 'other')),
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  label text NOT NULL,
  unit text NOT NULL DEFAULT 'per_person'
    CHECK (unit IN ('per_person', 'per_room_night', 'per_group', 'per_trip')),
  amount numeric(12, 2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'MAD',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS offer_costs_offer_id_idx
  ON public.offer_costs (offer_id);

ALTER TABLE public.offer_costs ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.offer_costs TO authenticated;

DROP POLICY IF EXISTS offer_costs_select_packages ON public.offer_costs;
CREATE POLICY offer_costs_select_packages
  ON public.offer_costs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles AS ur
      JOIN public.role_permissions AS rp ON rp.role_id = ur.role_id
      JOIN public.permissions AS p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid()
        AND p.name = 'packages.view'
    )
    AND EXISTS (
      SELECT 1
      FROM public.offers AS o
      WHERE o.id = offer_costs.offer_id
    )
  );

DROP POLICY IF EXISTS offer_costs_insert_packages ON public.offer_costs;
CREATE POLICY offer_costs_insert_packages
  ON public.offer_costs
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
      WHERE o.id = offer_costs.offer_id
    )
  );

DROP POLICY IF EXISTS offer_costs_update_packages ON public.offer_costs;
CREATE POLICY offer_costs_update_packages
  ON public.offer_costs
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
    AND EXISTS (
      SELECT 1
      FROM public.offers AS o
      WHERE o.id = offer_costs.offer_id
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
      WHERE o.id = offer_costs.offer_id
    )
  );

DROP POLICY IF EXISTS offer_costs_delete_packages ON public.offer_costs;
CREATE POLICY offer_costs_delete_packages
  ON public.offer_costs
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
    AND EXISTS (
      SELECT 1
      FROM public.offers AS o
      WHERE o.id = offer_costs.offer_id
    )
  );

NOTIFY pgrst, 'reload schema';
