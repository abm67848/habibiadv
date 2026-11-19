import { supabase } from '@/lib/supabase/client';

function parseSectionVisibility(value) {
  const parsed = typeof value === 'string' ? JSON.parse(value || '{}') : value;
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
}

/**
 * Fetch list of published packages for the public customer store
 */
export async function getPublicPackages({ search = '', category = 'ALL', country = 'ALL' } = {}) {
  const { data: offers, error } = await supabase
    .from('offers')
    .select('id, public_title, created_at')
    .eq('status', 'active')
    .eq('is_public', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getPublicPackages error:', error);
    throw error;
  }

  if (!offers?.length) return [];

  const ids = offers.map((offer) => offer.id);
  const { data: landingConfigs, error: landingError } = await supabase
    .from('landing_page_configs')
    .select('offer_id, section_visibility')
    .in('offer_id', ids);
  if (landingError) throw landingError;

  const configsByOffer = new Map((landingConfigs || []).map((config) => [config.offer_id, config]));
  const groups = new Map();
  offers.forEach((offer) => {
    const visibility = parseSectionVisibility(configsByOffer.get(offer.id)?.section_visibility);
    const visible = (section) => visibility[section] !== false;
    const signature = JSON.stringify({
      overview: visible('overview'),
      media: visible('media'),
      highlights: visible('highlights'),
      trip_facts: visible('trip_facts'),
      pricing: visible('pricing'),
      departures: visible('departures'),
    });
    if (!groups.has(signature)) groups.set(signature, { ids: [], visibility });
    groups.get(signature).ids.push(offer.id);
  });

  const packagesById = new Map(offers.map((offer) => [
    offer.id,
    {
      id: offer.id,
      public_title: offer.public_title,
      section_visibility: parseSectionVisibility(configsByOffer.get(offer.id)?.section_visibility),
      destination_names: [],
      next_departure: null,
    },
  ]));

  await Promise.all([...groups.values()].map(async ({ ids: groupIds, visibility }) => {
    const show = (section) => visibility[section] !== false;
    const columns = ['id'];
    if (show('overview')) columns.push('short_description');
    if (show('media')) columns.push('cover_image_url', 'gallery');
    if (show('highlights')) columns.push('highlights');
    if (show('trip_facts')) columns.push(
      'package_category', 'destination_country', 'duration_days', 'duration_nights', 'min_travelers', 'max_travelers',
    );
    if (show('pricing')) columns.push('default_currency', 'starting_price', 'price_display_mode');

    const { data: details, error: detailsError } = await supabase
      .from('offers')
      .select([...new Set(columns)].join(', '))
      .in('id', groupIds)
      .eq('status', 'active')
      .eq('is_public', true);
    if (detailsError) throw detailsError;
    (details || []).forEach((detail) => {
      packagesById.set(detail.id, { ...packagesById.get(detail.id), ...detail });
    });

    const relatedQueries = [];
    if (show('trip_facts')) {
      relatedQueries.push(
        supabase
          .from('offer_destinations')
          .select('offer_id, destination_name, country, sort_order')
          .in('offer_id', groupIds)
          .order('sort_order', { ascending: true })
          .then(({ data, error: relationError }) => {
            if (relationError) throw relationError;
            (data || []).forEach((destination) => {
              const pkg = packagesById.get(destination.offer_id);
              pkg.destination_names.push(destination.destination_name);
              if (!pkg.primary_city) pkg.primary_city = destination.destination_name || '';
              if (!pkg.destination_country) pkg.country = destination.country || '';
            });
          }),
      );
    }
    if (show('departures')) {
      relatedQueries.push(
        supabase
          .from('offer_departures')
          .select('offer_id, departure_date')
          .in('offer_id', groupIds)
          .eq('status', 'open')
          .gte('departure_date', new Date().toISOString().slice(0, 10))
          .order('departure_date', { ascending: true })
          .then(({ data, error: relationError }) => {
            if (relationError) throw relationError;
            (data || []).forEach((departure) => {
              const pkg = packagesById.get(departure.offer_id);
              if (!pkg.next_departure) pkg.next_departure = departure.departure_date;
            });
          }),
      );
    }
    await Promise.all(relatedQueries);
  }));

  const data = [...packagesById.values()].map((pkg) => ({
    ...pkg,
    gallery: Array.isArray(pkg.gallery) ? pkg.gallery : [],
    highlights: Array.isArray(pkg.highlights) ? pkg.highlights : [],
  }));

  let filtered = data;
  if (category && category !== 'ALL') {
    filtered = filtered.filter((pkg) => pkg.package_category === category);
  }
  if (country && country !== 'ALL') {
    filtered = filtered.filter((pkg) => (pkg.destination_country || pkg.country) === country);
  }
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(
      (pkg) =>
        pkg.public_title?.toLowerCase().includes(s) ||
        pkg.short_description?.toLowerCase().includes(s) ||
        pkg.destination_country?.toLowerCase().includes(s) ||
        pkg.package_category?.toLowerCase().includes(s)
    );
  }

  return filtered;
}

/**
 * Fetch full package details along with all relation tables:
 * itinerary days, departures, inclusions/exclusions, accommodations, transports, activities
 */
export async function getPackageDetailsByIdOrRef(idOrRef, { preview = false } = {}) {
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrRef);

  let offerQuery = supabase.from('offers').select(preview ? '*' : 'id, public_title');
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
  let landingResult;
  let results;

  if (preview) {
    results = await Promise.all([
      supabase.from('offer_itinerary_days').select('*').eq('offer_id', offerId).order('sort_order', { ascending: true }).order('day_number', { ascending: true }),
      supabase.from('offer_departures').select('*').eq('offer_id', offerId).eq('status', 'open').gte('departure_date', new Date().toISOString().split('T')[0]).order('departure_date', { ascending: true }),
      supabase.from('offer_inclusions_exclusions').select('*').eq('offer_id', offerId).order('sort_order', { ascending: true }),
      supabase.from('offer_accommodations').select('*').eq('offer_id', offerId),
      supabase.from('offer_transports').select('*').eq('offer_id', offerId).order('sort_order', { ascending: true }),
      supabase.from('offer_activities').select('*').eq('offer_id', offerId).order('sort_order', { ascending: true }),
      supabase.from('offer_destinations').select('*').eq('offer_id', offerId).order('sort_order', { ascending: true }),
      supabase.from('offer_pricing_rules').select('*').eq('offer_id', offerId),
      supabase.from('landing_page_configs').select('*').eq('offer_id', offerId).maybeSingle(),
    ]);
  } else {
    const { data: visibilityConfig, error: visibilityError } = await supabase
      .from('landing_page_configs')
      .select('offer_id, section_visibility')
      .eq('offer_id', offerId)
      .maybeSingle();
    if (visibilityError) throw visibilityError;
    const visibility = parseSectionVisibility(visibilityConfig?.section_visibility);
    const isVisible = (section) => visibility[section] !== false;

    const offerColumns = ['id', 'public_title'];
    if (isVisible('trip_facts')) offerColumns.push('reference', 'package_category', 'destination_country', 'duration_days', 'duration_nights', 'min_travelers', 'max_travelers');
    if (isVisible('overview')) offerColumns.push('short_description', 'full_description');
    if (isVisible('media')) offerColumns.push('cover_image_url', 'gallery');
    if (isVisible('highlights')) offerColumns.push('highlights');
    if (isVisible('pricing')) offerColumns.push('default_currency', 'starting_price', 'price_display_mode');
    const { data: publicOffer, error: publicOfferError } = await supabase
      .from('offers')
      .select([...new Set(offerColumns)].join(', '))
      .eq('id', offerId)
      .eq('status', 'active')
      .eq('is_public', true)
      .maybeSingle();
    if (publicOfferError) throw publicOfferError;
    if (!publicOffer) return null;
    Object.assign(offerData, publicOffer);

    const landingColumns = ['offer_id', 'section_visibility', 'hero_heading'];
    if (isVisible('overview')) landingColumns.push('hero_subtitle', 'public_introduction');
    if (isVisible('faqs')) landingColumns.push('faqs', 'terms_and_conditions', 'cancellation_policy');
    const itineraryQuery = isVisible('itinerary')
      ? supabase.from('offer_itinerary_days').select('id, day_number, title, destination, description, sort_order').eq('offer_id', offerId).order('sort_order', { ascending: true }).order('day_number', { ascending: true })
      : Promise.resolve({ data: [], error: null });
    const departuresQuery = isVisible('departures')
      ? supabase.from('offer_departures').select(`id, departure_date, return_date, max_capacity, reserved_capacity${isVisible('pricing') ? ', selling_price_override, currency' : ''}`).eq('offer_id', offerId).eq('status', 'open').gte('departure_date', new Date().toISOString().split('T')[0]).order('departure_date', { ascending: true })
      : Promise.resolve({ data: [], error: null });
    const inclusionsQuery = isVisible('inclusions')
      ? supabase.from('offer_inclusions_exclusions').select('id, item_type, description, sort_order').eq('offer_id', offerId).order('sort_order', { ascending: true })
      : Promise.resolve({ data: [], error: null });
    const pricingQuery = isVisible('pricing') && isVisible('booking_widget')
      ? supabase.from('offer_pricing_rules').select('price_type, amount, currency').eq('offer_id', offerId)
      : Promise.resolve({ data: [], error: null });
    const relatedResults = await Promise.all([
      itineraryQuery,
      departuresQuery,
      inclusionsQuery,
      pricingQuery,
      supabase.from('landing_page_configs').select(landingColumns.join(', ')).eq('offer_id', offerId).maybeSingle(),
    ]);
    results = [
      relatedResults[0],
      relatedResults[1],
      relatedResults[2],
      { data: [], error: null },
      { data: [], error: null },
      { data: [], error: null },
      { data: [], error: null },
      relatedResults[3],
      relatedResults[4],
    ];
  }

  const failedResult = results.find((result) => result.error);
  if (failedResult?.error) throw failedResult.error;
  const [itineraryResult, departuresResult, inclusionsResult, accommodationsResult, transportsResult, activitiesResult, destinationsResult, pricingRulesResult] = results;
  landingResult = results[8];
  if (landingResult.data) {
    landingResult.data.section_visibility = parseSectionVisibility(landingResult.data.section_visibility);
  }

  let insurancePlans = [];
  if (landingResult.data?.section_visibility?.booking_widget !== false) {
    const insurancePlansResult = await supabase
      .from('offer_insurance_plans')
      .select('plan_key, label, description, pricing_model, premium, currency, min_travelers, is_default, sort_order, active')
      .eq('offer_id', offerId)
      .eq('active', true)
      .order('sort_order', { ascending: true });
    if (insurancePlansResult.error) throw insurancePlansResult.error;
    insurancePlans = insurancePlansResult.data || [];
  }

  return {
    ...offerData,
    itinerary: itineraryResult.data || [],
    departures: departuresResult.data || [],
    inclusions: (inclusionsResult.data || []).filter((item) => item.item_type === 'inclusion'),
    exclusions: (inclusionsResult.data || []).filter((item) => item.item_type === 'exclusion'),
    accommodations: accommodationsResult.data || [],
    transports: transportsResult.data || [],
    activities: activitiesResult.data || [],
    destinations: destinationsResult.data || [],
    pricing_rules: pricingRulesResult.data || [],
    insurance_plans: insurancePlans,
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
