ALTER TABLE public.suppliers
  DROP CONSTRAINT IF EXISTS suppliers_type_check;

ALTER TABLE public.suppliers
  ADD CONSTRAINT suppliers_type_check
  CHECK (
    supplier_type IN (
      'hotel',
      'riad',
      'resort',
      'restaurant',
      'airline',
      'car_rental',
      'transport_company',
      'local_guide',
      'activity_provider',
      'manufacturer',
      'wholesaler',
      'distributor'
    )
  );
