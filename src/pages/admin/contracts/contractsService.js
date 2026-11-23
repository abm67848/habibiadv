// Database Service for Travel Contracts
// Direct mapping to the SQL schema tables
import { supabase } from '@/lib/supabase/client.jsx';
import { DEFAULT_TEMPLATES, getSavedContractTemplate } from './defaultTemplates.js';

/* ------------------------------------------------------------------ */
/*  1. TEMPLATES: Fetch & Auto-Seed                                    */
/* ------------------------------------------------------------------ */
export async function fetchContractTemplates() {
  const customMain = getSavedContractTemplate();
  let dbTemplates = [];

  try {
    const { data: templates, error } = await supabase
      .from('contract_templates')
      .select('*, sections:contract_template_sections(*)')
      .order('created_at', { ascending: true });

    if (!error && templates && templates.length > 0) {
      dbTemplates = templates;
    } else if (!error && (!templates || templates.length === 0)) {
      // If table is empty, auto-seed with standard templates
      await seedDefaultTemplates();
      const { data: reseeded } = await supabase
        .from('contract_templates')
        .select('*, sections:contract_template_sections(*)')
        .order('created_at', { ascending: true });
      if (reseeded && reseeded.length > 0) dbTemplates = reseeded;
    }
  } catch (err) {
    console.warn('Could not query contract_templates from Supabase, using defaults:', err);
  }

  // Ensure the custom main template saved from Settings is always the primary option
  const otherTemplates = dbTemplates.filter((t) => t.id !== customMain.id && t.code !== customMain.code);
  return [customMain, ...otherTemplates];
}

export async function seedDefaultTemplates() {
  for (const tpl of DEFAULT_TEMPLATES) {
    try {
      const { data: insertedTpl, error: tplErr } = await supabase
        .from('contract_templates')
        .insert({
          name: tpl.name,
          code: tpl.code,
          description: tpl.description,
          primary_language: tpl.primary_language,
          secondary_language: tpl.secondary_language,
          version: tpl.version || 1,
          is_active: true,
        })
        .select()
        .single();

      if (!tplErr && insertedTpl && tpl.sections) {
        const sectionsToInsert = tpl.sections.map((s) => ({
          template_id: insertedTpl.id,
          section_key: s.section_key,
          title_es: s.title_es || null,
          title_pl: s.title_pl || null,
          title_en: s.title_en || null,
          default_content_es: s.content_es || null,
          default_content_pl: s.content_pl || null,
          default_content_en: s.content_en || null,
          sort_order: s.sort_order || 0,
          is_required: s.is_required || false,
          is_active: true,
        }));

        await supabase.from('contract_template_sections').insert(sectionsToInsert);
      }
    } catch (e) {
      console.warn('Template seed skipped:', e);
    }
  }
}

/* ------------------------------------------------------------------ */
/*  2. CONTRACTS: Fetch All with Relations                             */
/* ------------------------------------------------------------------ */
export async function fetchContracts() {
  const { data: dbContracts, error } = await supabase
    .from('contracts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!dbContracts?.length) return [];

  const contractIds = dbContracts.map((c) => c.id);

  // Fetch all related child tables in parallel
  const [partsRes, pricesRes, paysRes, srvsRes, accsRes, itinRes, secsRes] = await Promise.all([
    supabase.from('contract_participants').select('*').in('contract_id', contractIds),
    supabase.from('contract_price_items').select('*').in('contract_id', contractIds),
    supabase.from('contract_payments').select('*').in('contract_id', contractIds).order('due_date', { ascending: true }),
    supabase.from('contract_service_items').select('*').in('contract_id', contractIds).order('sort_order', { ascending: true }),
    supabase.from('contract_accommodations').select('*').in('contract_id', contractIds).order('sort_order', { ascending: true }),
    supabase.from('contract_itinerary_items').select('*').in('contract_id', contractIds).order('sort_order', { ascending: true }),
    supabase.from('contract_sections').select('*').in('contract_id', contractIds).order('sort_order', { ascending: true }),
  ]);

  return dbContracts.map((ctr) => ({
    ...ctr,
    participants: (partsRes.data || []).filter((p) => p.contract_id === ctr.id),
    pricing_items: (pricesRes.data || []).filter((p) => p.contract_id === ctr.id),
    payments: (paysRes.data || []).filter((p) => p.contract_id === ctr.id),
    services: (srvsRes.data || []).filter((s) => s.contract_id === ctr.id),
    accommodations: (accsRes.data || []).filter((a) => a.contract_id === ctr.id),
    itinerary: (itinRes.data || []).filter((i) => i.contract_id === ctr.id),
    sections: (secsRes.data || []).filter((i) => i.contract_id === ctr.id),
  }));
}

/* ------------------------------------------------------------------ */
/*  3. BOOKINGS: Fetch Bookings & Auto-populate Details               */
/* ------------------------------------------------------------------ */
export async function fetchBookingWithFullDetails(bookingId) {
  try {
    const { data: booking, error: bErr } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (bErr || !booking) return null;

    let customer = null;
    if (booking.customer_id) {
      const { data: custData } = await supabase
        .from('customers')
        .select('*')
        .eq('id', booking.customer_id)
        .single();
      customer = custData;
    }

    // Resolve offer: either via direct booking.offer_id, or by matching offer_reference / offer_title
    let targetOfferId = booking.offer_id || null;
    let resolvedOffer = null;

    if (targetOfferId) {
      const { data: oData } = await supabase.from('offers').select('*').eq('id', targetOfferId).single();
      resolvedOffer = oData;
    } else {
      // Try resolving by offer_reference or matching offer_title
      if (booking.offer_reference) {
        const { data: matchRef } = await supabase.from('offers').select('*').eq('reference', booking.offer_reference).limit(1);
        if (matchRef && matchRef.length > 0) {
          resolvedOffer = matchRef[0];
          targetOfferId = resolvedOffer.id;
        }
      }
      if (!resolvedOffer && booking.offer_title) {
        const { data: matchTitle } = await supabase.from('offers').select('*').ilike('public_title', `%${booking.offer_title}%`).limit(1);
        if (matchTitle && matchTitle.length > 0) {
          resolvedOffer = matchTitle[0];
          targetOfferId = resolvedOffer.id;
        } else {
          const { data: matchInt } = await supabase.from('offers').select('*').ilike('internal_title', `%${booking.offer_title}%`).limit(1);
          if (matchInt && matchInt.length > 0) {
            resolvedOffer = matchInt[0];
            targetOfferId = resolvedOffer.id;
          }
        }
      }
      // If still not matched, check if booking.destination matches an offer destination
      if (!resolvedOffer && booking.destination) {
        const { data: matchDest } = await supabase.from('offers').select('*').ilike('destination_country', `%${booking.destination}%`).limit(1);
        if (matchDest && matchDest.length > 0) {
          resolvedOffer = matchDest[0];
          targetOfferId = resolvedOffer.id;
        }
      }
    }

    let offerDetails = null;
    if (targetOfferId) {
      const [itinRes, accRes, incRes] = await Promise.all([
        supabase.from('offer_itinerary_days').select('*').eq('offer_id', targetOfferId).order('day_number', { ascending: true }),
        supabase.from('offer_accommodations').select('*').eq('offer_id', targetOfferId).order('sort_order', { ascending: true }),
        supabase.from('offer_inclusions_exclusions').select('*').eq('offer_id', targetOfferId),
      ]);

      offerDetails = {
        offer: resolvedOffer,
        itinerary: itinRes.data || [],
        accommodations: accRes.data || [],
        inclusionsExclusions: incRes.data || [],
      };
    }

    return { booking, customer, offerDetails };
  } catch (e) {
    console.warn('Error fetching booking details:', e);
    return null;
  }
}

export async function fetchPackageWithFullDetails(packageId) {
  try {
    const { data: offer, error: oErr } = await supabase
      .from('offers')
      .select('*')
      .eq('id', packageId)
      .single();

    if (oErr || !offer) return null;

    const [itinRes, accRes, incRes] = await Promise.all([
      supabase.from('offer_itinerary_days').select('*').eq('offer_id', packageId).order('day_number', { ascending: true }),
      supabase.from('offer_accommodations').select('*').eq('offer_id', packageId).order('sort_order', { ascending: true }),
      supabase.from('offer_inclusions_exclusions').select('*').eq('offer_id', packageId),
    ]);

    return {
      offer,
      itinerary: itinRes.data || [],
      accommodations: accRes.data || [],
      inclusionsExclusions: incRes.data || [],
    };
  } catch (e) {
    console.warn('Error fetching package details:', e);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  4. CREATE CONTRACT: Full Relational Database Insert                */
/* ------------------------------------------------------------------ */
export async function createFullContract({
  contractData,
  participants = [],
  pricingItems = [],
  services = [],
  accommodations = [],
  payments = [],
  itinerary = [],
  sections = [],
  userId,
}) {
  // 1. Insert into public.contracts
  const { data: newContract, error: ctrErr } = await supabase
    .from('contracts')
    .insert({
      contract_number: contractData.contract_number,
      template_id: contractData.template_id || null,
      template_version: contractData.template_version || 1,
      booking_id: contractData.booking_id || null,
      status: contractData.status || 'draft',
      primary_language: contractData.primary_language || 'es',
      secondary_language: contractData.secondary_language || null,
      agency_name: contractData.agency_name,
      agency_tax_number: contractData.agency_tax_number,
      agency_address: contractData.agency_address,
      agency_postal_code: contractData.agency_postal_code || null,
      agency_city: contractData.agency_city || 'Marrakech',
      agency_country: contractData.agency_country || 'Morocco',
      agency_phone: contractData.agency_phone,
      agency_email: contractData.agency_email,
      agency_logo_url: contractData.agency_logo_url || null,
      trip_title: contractData.trip_title,
      destination: contractData.destination,
      start_date: contractData.start_date || null,
      end_date: contractData.end_date || null,
      duration_days: contractData.duration_days || 1,
      duration_nights: contractData.duration_nights || 0,
      travel_modality: contractData.travel_modality || null,
      currency: contractData.currency || 'EUR',
      subtotal: Number(contractData.subtotal || contractData.total_amount || 0),
      discount_total: Number(contractData.discount_total || 0),
      tax_total: Number(contractData.tax_total || 0),
      total_amount: Number(contractData.total_amount || 0),
      deposit_percentage: Number(contractData.deposit_percentage || 30),
      deposit_amount: Number(contractData.deposit_amount || 0),
      remaining_amount: Number(contractData.remaining_amount || 0),
      payment_deadline: contractData.payment_deadline || null,
      payment_instructions: contractData.payment_instructions || null,
      bank_account_name: contractData.bank_account_name || null,
      bank_account_iban: contractData.bank_account_iban || null,
      bank_account_swift: contractData.bank_account_swift || null,
      cancellation_policy_es: contractData.cancellation_policy_es || null,
      cancellation_policy_pl: contractData.cancellation_policy_pl || null,
      cancellation_policy_en: contractData.cancellation_policy_en || null,
      contract_date: contractData.contract_date || new Date().toISOString().split('T')[0],
      signed_place: contractData.signed_place || 'Marrakech',
      contract_data: contractData.contract_data || {},
      generation_snapshot: contractData.generation_snapshot || {},
      created_by: userId || null,
    })
    .select()
    .single();

  if (ctrErr) throw ctrErr;
  const contractId = newContract.id;

  // 2. Insert into public.contract_participants
  if (participants && participants.length > 0) {
    const pRows = participants.map((p) => ({
      contract_id: contractId,
      participant_role: p.participant_role || 'traveler',
      full_name: p.full_name,
      document_type: p.document_type || 'Passport',
      document_number: p.document_number || null,
      nationality: p.nationality || null,
      date_of_birth: p.date_of_birth || null,
      phone: p.phone || null,
      email: p.email || null,
      address: p.address || null,
      is_primary_contact: Boolean(p.is_primary_contact),
      signature_status: p.signature_status || 'pending',
    }));
    await supabase.from('contract_participants').insert(pRows);
  }

  // 3. Insert into public.contract_price_items
  if (pricingItems && pricingItems.length > 0) {
    const prRows = pricingItems.map((pri, idx) => ({
      contract_id: contractId,
      description_es: pri.description_es || pri.description || 'Concepto de viaje',
      description_pl: pri.description_pl || null,
      description_en: pri.description_en || null,
      price_type: pri.price_type || 'other',
      quantity: Number(pri.quantity || 1),
      unit_price: Number(pri.unit_price || 0),
      total_price: Number(pri.total_price || 0),
      currency: contractData.currency || 'EUR',
      sort_order: idx + 1,
    }));
    await supabase.from('contract_price_items').insert(prRows);
  }

  // 4. Insert into public.contract_payments
  if (payments && payments.length > 0) {
    const payRows = payments.map((pay) => ({
      contract_id: contractId,
      payment_type: pay.payment_type || 'installment',
      description: pay.description || 'Pago estipulado',
      amount: Number(pay.amount || 0),
      currency: contractData.currency || 'EUR',
      due_date: pay.due_date || null,
      payment_status: pay.payment_status || 'pending',
      payment_method: pay.payment_method || 'bank_transfer',
      transaction_reference: pay.transaction_reference || null,
    }));
    await supabase.from('contract_payments').insert(payRows);
  }

  // 5. Insert into public.contract_service_items
  if (services && services.length > 0) {
    const srvRows = services.map((s, idx) => ({
      contract_id: contractId,
      service_type: s.service_type || 'included',
      title_es: s.title_es || s.title || null,
      title_pl: s.title_pl || null,
      title_en: s.title_en || null,
      description_es: s.description_es || s.description || null,
      sort_order: idx + 1,
    }));
    await supabase.from('contract_service_items').insert(srvRows);
  }

  // 6. Insert into public.contract_accommodations
  if (accommodations && accommodations.length > 0) {
    const accRows = accommodations.map((a, idx) => ({
      contract_id: contractId,
      accommodation_name: a.accommodation_name || 'Hotel',
      accommodation_type: a.accommodation_type || null,
      location: a.location || null,
      room_type: a.room_type || null,
      room_occupancy: Number(a.room_occupancy || 2),
      check_in: a.check_in || null,
      check_out: a.check_out || null,
      sort_order: idx + 1,
    }));
    await supabase.from('contract_accommodations').insert(accRows);
  }

  // 7. Insert into public.contract_itinerary_items
  if (itinerary && itinerary.length > 0) {
    const itinRows = itinerary.map((i, idx) => ({
      contract_id: contractId,
      day_number: i.day_number || idx + 1,
      itinerary_date: i.itinerary_date || null,
      title_es: i.title_es || i.title || `DÃ­a ${idx + 1}`,
      title_pl: i.title_pl || null,
      title_en: i.title_en || null,
      description_es: i.description_es || i.description || null,
      start_location: i.start_location || null,
      end_location: i.end_location || null,
      sort_order: idx + 1,
    }));
    await supabase.from('contract_itinerary_items').insert(itinRows);
  }

  // 8. Insert into public.contract_sections
  if (sections && sections.length > 0) {
    const secRows = sections.map((sec, idx) => ({
      contract_id: contractId,
      section_key: sec.section_key || `sec_${idx + 1}`,
      section_number: String(idx + 1),
      title_es: sec.title_es || null,
      title_pl: sec.title_pl || null,
      title_en: sec.title_en || null,
      content_es: sec.content_es || sec.default_content_es || null,
      content_pl: sec.content_pl || sec.default_content_pl || null,
      content_en: sec.content_en || sec.default_content_en || null,
      section_type: sec.section_type || 'standard',
      sort_order: idx + 1,
      is_visible: true,
      is_annex: Boolean(sec.is_annex),
    }));
    await supabase.from('contract_sections').insert(secRows);
  }

  return newContract;
}

/* ------------------------------------------------------------------ */
/*  5. UPDATE & DELETE OPERATIONS                                     */
/* ------------------------------------------------------------------ */
export async function updateContractStatusInDb(contractId, status, { signed_at, signed_place } = {}) {
  const updates = { status };
  if (signed_at) updates.signed_at = signed_at;
  if (signed_place) updates.signed_place = signed_place;

  const { error } = await supabase.from('contracts').update(updates).eq('id', contractId);
  if (error) throw error;

  if (status === 'signed') {
    await supabase
      .from('contract_participants')
      .update({ signature_status: 'signed', signed_at: signed_at || new Date().toISOString() })
      .eq('contract_id', contractId);
  }
}

export async function deleteContractFromDb(contractId) {
  if (!/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(contractId || '')) {
    throw new Error('Este contrato no está guardado en la base de datos.');
  }

  const { error } = await supabase.rpc('delete_contract_with_details', {
    p_contract_id: contractId,
  });
  if (error) throw error;
}

