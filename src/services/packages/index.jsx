import { supabase } from '@/lib/supabase/client';

/**
 * Fetch list of published packages for the public customer store
 */
export async function getPublicPackages({ search = '', category = 'ALL', country = 'ALL' } = {}) {
  let query = supabase
    .from('offers')
    .select(`
      id,
      reference,
      public_title,
      internal_title,
      short_description,
      destination_country,
      package_category,
      duration_days,
      duration_nights,
      cover_image_url,
      gallery,
      highlights,
      min_travelers,
      max_travelers,
      default_currency,
      starting_price,
      price_display_mode,
      status,
      is_public,
      created_at
    `)
    .eq('status', 'active')
    .eq('is_public', true)
    .order('created_at', { ascending: false });

  if (category && category !== 'ALL') {
    query = query.eq('package_category', category);
  }

  if (country && country !== 'ALL') {
    query = query.eq('destination_country', country);
  }

  const { data, error } = await query;
  if (error) {
    console.error('getPublicPackages error:', error);
    throw error;
  }

  if (search) {
    const s = search.toLowerCase();
    return (data || []).filter(
      (pkg) =>
        pkg.public_title?.toLowerCase().includes(s) ||
        pkg.short_description?.toLowerCase().includes(s) ||
        pkg.destination_country?.toLowerCase().includes(s) ||
        pkg.package_category?.toLowerCase().includes(s)
    );
  }

  return data || [];
}

/**
 * Fetch full package details along with all relation tables:
 * itinerary days, departures, inclusions/exclusions, accommodations, transports, activities
 */
export async function getPackageDetailsByIdOrRef(idOrRef, { preview = false } = {}) {
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrRef);

  let offerQuery = supabase.from('offers').select('*');
  if (isUUID) {
    offerQuery = offerQuery.eq('id', idOrRef);
  } else {
    offerQuery = offerQuery.eq('reference', idOrRef);
  }
  if (!preview) {
    offerQuery = offerQuery.eq('status', 'active').eq('is_public', true);
  }

  const { data: offerData, error: offerError } = await offerQuery.maybeSingle();
  if (offerError) throw offerError;
  if (!offerData) return null;

  const offerId = offerData.id;

  // Concurrently fetch related child tables
  const results = await Promise.all([
    supabase
      .from('offer_itinerary_days')
      .select('*')
      .eq('offer_id', offerId)
      .order('sort_order', { ascending: true })
      .order('day_number', { ascending: true }),
    supabase
      .from('offer_departures')
      .select('*')
      .eq('offer_id', offerId)
      .gte('departure_date', new Date().toISOString().split('T')[0])
      .order('departure_date', { ascending: true }),
    supabase
      .from('offer_inclusions_exclusions')
      .select('*')
      .eq('offer_id', offerId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('offer_accommodations')
      .select('*')
      .eq('offer_id', offerId),
    supabase
      .from('offer_transports')
      .select('*')
      .eq('offer_id', offerId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('offer_activities')
      .select('*')
      .eq('offer_id', offerId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('offer_destinations')
      .select('*')
      .eq('offer_id', offerId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('offer_pricing_rules')
      .select('*')
      .eq('offer_id', offerId),
    supabase
      .from('landing_page_configs')
      .select('*')
      .eq('offer_id', offerId)
      .maybeSingle(),
  ]);
  const failedResult = results.find((result) => result.error);
  if (failedResult?.error) throw failedResult.error;
  const [itineraryResult, departuresResult, inclusionsResult, accommodationsResult, transportsResult, activitiesResult, destinationsResult, pricingRulesResult, landingResult] = results;
  const itinerary = itineraryResult.data;
  const departures = departuresResult.data;
  const inclusionsExclusions = inclusionsResult.data;
  const accommodations = accommodationsResult.data;
  const transports = transportsResult.data;
  const activities = activitiesResult.data;

  return {
    ...offerData,
    itinerary: itinerary || [],
    departures: departures || [],
    inclusions: (inclusionsExclusions || []).filter((item) => item.item_type === 'inclusion'),
    exclusions: (inclusionsExclusions || []).filter((item) => item.item_type === 'exclusion'),
    accommodations: accommodations || [],
    transports: transports || [],
    activities: activities || [],
    destinations: destinationsResult.data || [],
    pricing_rules: pricingRulesResult.data || [],
    landing_page: landingResult.data || null,
  };
}

/**
 * Fetch all packages for the admin portal (including drafts, inactive, cost metrics)
 */
export async function getAdminPackages() {
  const { data, error } = await supabase
    .from('offers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getAdminPackages error:', error);
    throw error;
  }

  return data || [];
}

/**
 * Create or update offer in admin
 */
export async function saveAdminOffer(offerPayload) {
  if (offerPayload.id) {
    const { data, error } = await supabase
      .from('offers')
      .update(offerPayload)
      .eq('id', offerPayload.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from('offers')
      .insert(offerPayload)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}
