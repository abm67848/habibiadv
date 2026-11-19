DROP FUNCTION IF EXISTS public.create_public_package_booking(uuid, uuid, date, integer, text, text);

NOTIFY pgrst, 'reload schema';
