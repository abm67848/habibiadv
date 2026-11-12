import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  CheckCircle2,
  Circle,
  Eye,
  Loader2,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client.jsx';
import { useAuth } from '@/context/index.jsx';
import { saveAdminOffer } from '@/services/packages/index.jsx';

const inputClass = 'mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500';
const tabs = [
  ['overview', 'Overview'],
  ['destinations', 'Countries & Cities'],
  ['accommodations', 'Hotels & Accommodation'],
  ['flights', 'Flights & Airlines'],
  ['ground', 'Cars & Ground Transport'],
  ['activities', 'Activities & Excursions'],
  ['itinerary', 'Day-by-Day Itinerary'],
  ['inclusions', 'Inclusions & Exclusions'],
  ['pricing', 'Pricing & Departures'],
  ['landing', 'Public Landing Page'],
];

const childSections = {
  destinations: {
    table: 'offer_destinations',
    fields: [
      { name: 'destination_name', label: 'City / destination', required: true },
      { name: 'country', label: 'Country', required: true },
      { name: 'arrival_day', label: 'Arrival day', type: 'number', integer: true },
      { name: 'departure_day', label: 'Departure day', type: 'number', integer: true },
      { name: 'sort_order', label: 'Display order', type: 'number', integer: true },
      { name: 'description', label: 'Description', type: 'textarea', wide: true },
      { name: 'image_url', label: 'Image URL', type: 'url', wide: true },
    ],
    orderBy: 'sort_order',
  },
  accommodations: {
    table: 'offer_accommodations',
    fields: [
      { name: 'hotel_name_snapshot', label: 'Hotel / accommodation', required: true },
      { name: 'destination', label: 'City / destination' },
      { name: 'check_in_day', label: 'Check-in day', type: 'number', integer: true },
      { name: 'check_out_day', label: 'Check-out day', type: 'number', integer: true },
      { name: 'number_of_nights', label: 'Nights', type: 'number', integer: true },
      { name: 'room_type', label: 'Room type' },
      { name: 'number_of_rooms', label: 'Number of rooms', type: 'number', integer: true },
      { name: 'occupancy_per_room', label: 'Guests per room', type: 'number', integer: true },
      { name: 'meal_plan', label: 'Meal plan' },
      { name: 'amenities', label: 'Amenities (one per line)', type: 'array', wide: true },
      { name: 'description', label: 'Description', type: 'textarea', wide: true },
      { name: 'images', label: 'Image URLs (one per line)', type: 'array', wide: true },
      { name: 'internal_reference', label: 'Private booking reference', wide: true },
    ],
    orderBy: 'check_in_day',
  },
  flights: {
    table: 'offer_transports',
    fixedValues: { transport_type: 'flight' },
    fields: [
      { name: 'provider_name', label: 'Airline', required: true },
      { name: 'flight_or_service_number', label: 'Flight number' },
      { name: 'departure_location', label: 'Departure airport' },
      { name: 'arrival_location', label: 'Arrival airport' },
      { name: 'departure_datetime', label: 'Departure date & time', type: 'datetime-local' },
      { name: 'arrival_datetime', label: 'Arrival date & time', type: 'datetime-local' },
      { name: 'cabin_class', label: 'Cabin class' },
      { name: 'baggage_allowance', label: 'Baggage allowance' },
      { name: 'description', label: 'Notes', type: 'textarea', wide: true },
      { name: 'sort_order', label: 'Display order', type: 'number', integer: true },
    ],
    orderBy: 'sort_order',
  },
  ground: {
    table: 'offer_transports',
    fields: [
      { name: 'transport_type', label: 'Transport type', type: 'select', required: true, options: ['ground', 'transfer', 'private 4x4', 'bus', 'train'] },
      { name: 'provider_name', label: 'Provider / operator' },
      { name: 'vehicle_type', label: 'Vehicle / model and passenger capacity' },
      { name: 'flight_or_service_number', label: 'Service reference' },
      { name: 'departure_location', label: 'Pickup location' },
      { name: 'arrival_location', label: 'Drop-off location' },
      { name: 'departure_datetime', label: 'Pickup date & time', type: 'datetime-local' },
      { name: 'arrival_datetime', label: 'Drop-off date & time', type: 'datetime-local' },
      { name: 'description', label: 'Public service description', type: 'textarea', wide: true },
      { name: 'sort_order', label: 'Display order', type: 'number', integer: true },
    ],
    orderBy: 'sort_order',
  },
  activities: {
    table: 'offer_activities',
    fields: [
      { name: 'activity_name', label: 'Activity', required: true },
      { name: 'destination', label: 'Destination' },
      { name: 'scheduled_day', label: 'Scheduled day', type: 'number', integer: true },
      { name: 'duration', label: 'Duration' },
      { name: 'is_included', label: 'Included in offer', type: 'checkbox' },
      { name: 'price', label: 'Optional price', type: 'number' },
      { name: 'currency', label: 'Price currency' },
      { name: 'image_url', label: 'Image URL', type: 'url' },
      { name: 'description', label: 'Description', type: 'textarea', wide: true },
      { name: 'sort_order', label: 'Display order', type: 'number', integer: true },
    ],
    orderBy: 'sort_order',
  },
  itinerary: {
    table: 'offer_itinerary_days',
    fields: [
      { name: 'day_number', label: 'Day number', type: 'number', required: true, integer: true },
      { name: 'title', label: 'Day title', required: true },
      { name: 'destination', label: 'Destination' },
      { name: 'description', label: 'Day description', type: 'textarea', wide: true },
      { name: 'images', label: 'Image URLs (one per line)', type: 'array', wide: true },
      { name: 'sort_order', label: 'Display order', type: 'number', integer: true },
    ],
    orderBy: 'sort_order',
  },
  inclusions: {
    table: 'offer_inclusions_exclusions',
    fields: [
      { name: 'description', label: 'Item', type: 'textarea', required: true, wide: true },
      { name: 'category', label: 'Category' },
      { name: 'sort_order', label: 'Display order', type: 'number', integer: true },
    ],
    orderBy: 'sort_order',
  },
  rules: {
    table: 'offer_pricing_rules',
    fields: [
      { name: 'price_type', label: 'Price type', type: 'select', required: true, options: ['adult', 'child', 'infant', 'single_supplement', 'other'] },
      { name: 'amount', label: 'Amount', type: 'number', required: true },
      { name: 'currency', label: 'Currency', required: true },
      { name: 'conditions', label: 'Conditions', type: 'textarea', wide: true },
    ],
  },
  departures: {
    table: 'offer_departures',
    fields: [
      { name: 'departure_date', label: 'Departure date', type: 'date', required: true },
      { name: 'return_date', label: 'Return date', type: 'date' },
      { name: 'booking_deadline', label: 'Booking deadline', type: 'date' },
      { name: 'max_capacity', label: 'Maximum capacity', type: 'number', integer: true },
      { name: 'reserved_capacity', label: 'Reserved capacity', type: 'number', integer: true },
      { name: 'selling_price_override', label: 'Price override', type: 'number' },
      { name: 'currency', label: 'Currency' },
      { name: 'status', label: 'Status', type: 'select', options: ['open', 'sold_out', 'closed', 'cancelled'] },
      { name: 'internal_notes', label: 'Private notes', type: 'textarea', wide: true },
    ],
    orderBy: 'departure_date',
  },
};

const tablesToLoad = [
  ['offer_destinations', 'offer_destinations', 'sort_order'],
  ['offer_accommodations', 'offer_accommodations', 'check_in_day'],
  ['offer_transports', 'offer_transports', 'sort_order'],
  ['offer_activities', 'offer_activities', 'sort_order'],
  ['offer_itinerary_days', 'offer_itinerary_days', 'sort_order'],
  ['offer_inclusions_exclusions', 'offer_inclusions_exclusions', 'sort_order'],
  ['offer_departures', 'offer_departures', 'departure_date'],
  ['offer_pricing_rules', 'offer_pricing_rules', null],
];

const emptyOverview = {
  internal_title: '',
  public_title: '',
  reference: '',
  package_category: '',
  short_description: '',
  full_description: '',
  destination_country: '',
  duration_days: '',
  duration_nights: '',
  cover_image_url: '',
  gallery: [],
  highlights: [],
  min_travelers: '',
  max_travelers: '',
  default_currency: 'MAD',
  starting_price: '',
  price_display_mode: 'starting_from',
  booking_deadline_days: '',
};

function displayFieldValue(field, value) {
  if (field.type === 'array') return Array.isArray(value) ? value.join('\n') : '';
  if (field.type === 'datetime-local' && value) return String(value).slice(0, 16);
  if (field.type === 'checkbox') return Boolean(value);
  return value ?? '';
}

function serializeField(field, value) {
  if (field.type === 'array') return value.split('\n').map((item) => item.trim()).filter(Boolean);
  if (field.type === 'number') return value === '' ? null : Number(value);
  if (field.type === 'checkbox') return Boolean(value);
  if (field.type === 'datetime-local') return value ? new Date(value).toISOString() : null;
  if (field.name === 'currency' && value) return value.trim().toUpperCase();
  return value === '' ? null : value;
}

function Field({ field, value, onChange }) {
  const common = {
    id: field.name,
    required: field.required,
    className: inputClass,
  };

  if (field.type === 'checkbox') {
    return (
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} />
        {field.label}
      </label>
    );
  }
  if (field.type === 'textarea' || field.type === 'array') {
    return (
      <textarea
        {...common}
        rows={field.type === 'array' ? 3 : 4}
        value={value ?? ''}
        placeholder={field.type === 'array' ? 'One item per line' : ''}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }
  if (field.type === 'select') {
    return (
      <select {...common} value={value ?? ''} onChange={(event) => onChange(event.target.value)}>
        <option value="">Select…</option>
        {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    );
  }
  return (
    <input
      {...common}
      type={field.type || 'text'}
      min={field.type === 'number' ? 0 : undefined}
      step={field.type === 'number' ? (field.integer ? 1 : 'any') : undefined}
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function getWriteError(result, action) {
  if (result.error) return result.error;
  if (!result.data) {
    return new Error(`${action} affected no rows. Check your packages.update permission and confirm this record belongs to the current offer.`);
  }
  return null;
}

function getReadableError(error) {
  const message = error?.message || String(error);
  if (/row-level security|permission denied|not allowed/i.test(message)) {
    return `${message} Check that your signed-in account has packages.view and packages.update permissions (and packages.create when creating offers).`;
  }
  return message;
}

function getChildPayload(table, record, offerId) {
  const fields = Object.values(childSections)
    .filter((section) => section.table === table)
    .flatMap((section) => [
      ...section.fields.map((field) => field.name),
      ...Object.keys(section.fixedValues || {}),
    ]);
  const columns = new Set([...fields, ...(table === 'offer_inclusions_exclusions' ? ['item_type'] : [])]);
  const payload = { offer_id: offerId };
  columns.forEach((column) => {
    if (column in record) payload[column] = record[column];
  });
  return payload;
}

function RecordManager({ offerId, sectionKey, title, records, onRecordsChange, fixedValues = {}, canWrite = true, onPendingChange }) {
  const config = childSections[sectionKey];
  const recordFixedValues = { ...config.fixedValues, ...fixedValues };
  const [record, setRecord] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');
  const orderField = config.orderBy;
  const orderedRecords = orderField
    ? [...records].sort((a, b) => String(a[orderField] ?? '').localeCompare(String(b[orderField] ?? ''), undefined, { numeric: true }))
    : records;

  const startNew = () => {
    setError('');
    const newRecord = {
      ...recordFixedValues,
      offer_id: offerId,
      ...(sectionKey === 'ground' ? { transport_type: 'ground' } : {}),
      ...(orderField ? { [orderField]: records.length + 1 } : {}),
      ...(sectionKey === 'activities' ? { is_included: true, currency: 'MAD' } : {}),
      ...(sectionKey === 'rules' ? { currency: 'MAD' } : {}),
      ...(sectionKey === 'departures' ? { status: 'open', currency: 'MAD', reserved_capacity: 0 } : {}),
    };
    config.fields.forEach((field) => {
      if (!(field.name in newRecord)) newRecord[field.name] = field.type === 'checkbox' ? false : '';
    });
    setRecord(newRecord);
    onPendingChange(true);
  };

  const startEdit = (item) => {
    setError('');
    const draft = { ...item };
    config.fields.forEach((field) => {
      draft[field.name] = displayFieldValue(field, item[field.name]);
    });
    setRecord(draft);
    onPendingChange(true);
  };

  const stageRecord = (event) => {
    event.preventDefault();
    setError('');
    try {
      const payload = { ...recordFixedValues };
      config.fields.forEach((field) => {
        if (field.name in record) payload[field.name] = serializeField(field, record[field.name]);
      });
      if (payload.currency && !/^[A-Z]{3}$/.test(payload.currency)) {
        throw new Error('Currency must be a three-letter ISO code, such as MAD or EUR.');
      }

      if (record.id || record.__draftId) {
        const recordKey = record.id || record.__draftId;
        onRecordsChange(records.map((item) => (item.id || item.__draftId) === recordKey ? { ...payload, id: record.id, __draftId: record.__draftId } : item), sectionKey, recordFixedValues);
      } else {
        const draftId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
        onRecordsChange([...records, { ...payload, __draftId: draftId }], sectionKey, recordFixedValues);
      }
      setRecord(null);
      onPendingChange(false);
      setError('');
    } catch (stageError) {
      setError(`Could not add this record to the offer: ${getReadableError(stageError)}`);
    }
  };

  const deleteRecord = async (item) => {
    if (!window.confirm(`Delete this ${title.toLowerCase()} record?`)) return;
    setDeletingId(item.id);
    setError('');
    onRecordsChange(records.filter((recordItem) => (recordItem.id || recordItem.__draftId) !== (item.id || item.__draftId)), sectionKey, recordFixedValues);
    setDeletingId(null);
  };

  const moveRecord = async (item, direction) => {
    if (!orderField) return;
    const index = orderedRecords.findIndex((entry) => entry.id === item.id);
    const neighbor = orderedRecords[index + direction];
    if (!neighbor) return;
    setError('');
    const reordered = [...orderedRecords];
    [reordered[index], reordered[index + direction]] = [reordered[index + direction], reordered[index]];
    onRecordsChange(reordered.map((entry, orderIndex) => ({ ...entry, [orderField]: orderIndex + 1 })), sectionKey, recordFixedValues);
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="text-xs text-slate-500">{records.length} record{records.length === 1 ? '' : 's'} in this offer</p>
        </div>
        <button type="button" disabled={!canWrite} onClick={startNew} className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50">
          <Plus className="h-4 w-4" /> Add {title.replace(/s$/, '')}
        </button>
      </div>

      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{error}</p>}
      {(sectionKey === 'flights' || sectionKey === 'ground') && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          The provided transport schema has no private booking-reference field{sectionKey === 'ground' ? ' or separate passenger-capacity field' : ''}. Do not enter private references in public descriptions.
        </p>
      )}
      {sectionKey === 'destinations' && (
        <p className="text-xs text-slate-500">Stay nights are derived from departure day minus arrival day; the destination table has no separate nights column.</p>
      )}

      {record && (
        <form onSubmit={stageRecord} className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">{record.id ? 'Edit' : 'Add'} {title.replace(/s$/, '')}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {config.fields.filter((field) => !(field.name in recordFixedValues)).map((field) => (
              field.type === 'checkbox' ? (
                <div key={field.name} className="pt-6">
                  <Field field={field} value={displayFieldValue(field, record[field.name])} onChange={(value) => setRecord((current) => ({ ...current, [field.name]: value }))} />
                </div>
              ) : (
                <label key={field.name} htmlFor={field.name} className={`block text-xs font-medium text-slate-700 ${field.wide || field.type === 'textarea' || field.type === 'array' ? 'sm:col-span-2' : ''}`}>
                  {field.label}
                  <Field field={field} value={displayFieldValue(field, record[field.name])} onChange={(value) => setRecord((current) => ({ ...current, [field.name]: value }))} />
                </label>
              )
            ))}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => { setRecord(null); onPendingChange(false); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">Cancel</button>
            <button type="submit" disabled={!canWrite} className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">
              <Plus className="h-3.5 w-3.5" />{record.id ? 'Update offer record' : 'Add to offer'}
            </button>
          </div>
        </form>
      )}

      {orderedRecords.length ? (
        <div className="space-y-2">
          {orderedRecords.map((item, index) => {
            const summary = config.fields
              .filter((field) => !(field.name in recordFixedValues))
              .map((field) => [field.label, item[field.name]])
              .find(([, value]) => value !== null && value !== undefined && value !== '');
            return (
              <article key={item.id || item.__draftId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{summary?.[1] || title}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {config.fields
                      .filter((field) => field.name !== summary?.[0] && item[field.name] !== null && item[field.name] !== undefined && item[field.name] !== '')
                      .slice(0, 3)
                      .map((field) => `${field.label}: ${Array.isArray(item[field.name]) ? item[field.name].join(', ') : item[field.name]}`)
                      .join(' · ')}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {orderField && (
                    <>
                      <button type="button" disabled={!canWrite || index === 0} onClick={() => moveRecord(item, -1)} aria-label="Move up" className="rounded p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                      <button type="button" disabled={!canWrite || index === orderedRecords.length - 1} onClick={() => moveRecord(item, 1)} aria-label="Move down" className="rounded p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                    </>
                  )}
                  <button type="button" disabled={!canWrite} onClick={() => startEdit(item)} className="rounded px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50">Edit</button>
                  <button type="button" disabled={!canWrite || deletingId === item.id} onClick={() => deleteRecord(item)} aria-label={`Delete ${title}`} className="rounded p-1.5 text-rose-600 hover:bg-rose-50 disabled:opacity-50">
                    {deletingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        !record && <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">No records yet. Add one to configure this section.</div>
      )}
    </section>
  );
}

export default function PackageDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, permissions, loading: authLoading } = useAuth();
  const canViewOffers = permissions.includes('packages.view');
  const canUpdateOffers = permissions.includes('packages.update');
  const [activeTab, setActiveTab] = useState('overview');
  const [offer, setOffer] = useState(null);
  const [overview, setOverview] = useState(emptyOverview);
  const [children, setChildren] = useState({});
  const originalChildren = useRef({});
  const [landing, setLanding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [overviewSaving, setOverviewSaving] = useState(false);
  const [landingSaving, setLandingSaving] = useState(false);
  const [actionSaving, setActionSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [recordDraftOpen, setRecordDraftOpen] = useState(false);

  const loadOffer = useCallback(async () => {
    if (authLoading) return;
    if (!user || !canViewOffers) {
      setLoading(false);
      setOffer(null);
      setError(!user
        ? 'Sign in with an authorized account to edit offers.'
        : 'Your account is missing the packages.view permission.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { data: offerData, error: offerError } = await supabase.from('offers').select('*').eq('id', id).single();
      if (offerError) throw offerError;
      setOffer(offerData);
      setOverview({
        ...emptyOverview,
        ...offerData,
        gallery: Array.isArray(offerData.gallery) ? offerData.gallery : [],
        highlights: Array.isArray(offerData.highlights) ? offerData.highlights : [],
      });

      const results = await Promise.all(tablesToLoad.map(([, table, orderBy]) => {
        let query = supabase.from(table).select('*').eq('offer_id', id);
        if (orderBy) query = query.order(orderBy, { ascending: true });
        return query;
      }));
      const failed = results.find((result) => result.error);
      if (failed?.error) throw failed.error;
      const nextChildren = {};
      tablesToLoad.forEach(([key], index) => { nextChildren[key] = results[index].data || []; });
      setChildren(nextChildren);
      originalChildren.current = Object.fromEntries(
        Object.entries(nextChildren).map(([table, records]) => [table, records.map((record) => ({ ...record }))]),
      );

      const { data: landingData, error: landingError } = await supabase
        .from('landing_page_configs')
        .select('*')
        .eq('offer_id', id)
        .maybeSingle();
      if (landingError) throw landingError;
      setLanding(landingData ? {
        ...landingData,
        section_visibility: landingData.section_visibility && typeof landingData.section_visibility === 'object'
          ? landingData.section_visibility
          : {},
        faqs: Array.isArray(landingData.faqs) ? landingData.faqs : [],
      } : {
        offer_id: id,
        slug: '',
        meta_title: '',
        meta_description: '',
        og_image_url: '',
        hero_heading: '',
        hero_subtitle: '',
        public_introduction: '',
        section_visibility: {},
        faqs: [],
        terms_and_conditions: '',
        cancellation_policy: '',
        cta_label: '',
        cta_action_url: '',
      });
    } catch (loadError) {
      console.error('Could not load offer editor data:', loadError);
      setError(`Could not load offer editor data: ${loadError.message}`);
    } finally {
      setLoading(false);
    }
  }, [authLoading, canViewOffers, id, user]);

  useEffect(() => { loadOffer(); }, [loadOffer]);

  const updateChildRecords = useCallback((table, records, sectionKey, fixedValues = {}) => {
    setChildren((current) => {
      const currentRecords = current[table] || [];
      let nextRecords = records;
      if (table === 'offer_transports') {
        const untouched = currentRecords.filter((record) => sectionKey === 'flights'
          ? record.transport_type !== 'flight'
          : record.transport_type === 'flight');
        nextRecords = [...untouched, ...records];
      } else if (table === 'offer_inclusions_exclusions') {
        const untouched = currentRecords.filter((record) => record.item_type !== fixedValues.item_type);
        nextRecords = [...untouched, ...records];
      }
      return { ...current, [table]: nextRecords };
    });
  }, []);

  const completions = useMemo(() => ({
    overview: Boolean(overview.internal_title && overview.public_title && overview.reference && overview.package_category && overview.destination_country && Number(overview.duration_days) > 0),
    destinations: (children.offer_destinations || []).length > 0,
    accommodations: (children.offer_accommodations || []).length > 0,
    flights: (children.offer_transports || []).some((transport) => transport.transport_type === 'flight'),
    ground: (children.offer_transports || []).some((transport) => transport.transport_type !== 'flight'),
    activities: (children.offer_activities || []).length > 0,
    itinerary: (children.offer_itinerary_days || []).length > 0,
    inclusions: ['inclusion', 'exclusion'].every((type) => (children.offer_inclusions_exclusions || []).some((item) => item.item_type === type)),
    pricing: (children.offer_pricing_rules || []).length > 0 || (children.offer_departures || []).length > 0,
    landing: Boolean(landing?.slug && landing?.hero_heading),
  }), [overview, children, landing]);

  const saveOverview = async (status = offer?.status, isPublic = status === 'active' ? offer?.is_public : false) => {
    if (!canUpdateOffers) {
      setError('Your account is missing the packages.update permission required to save offer data.');
      return null;
    }
    setOverviewSaving(true);
    setError('');
    try {
      const payload = {
        id,
        internal_title: overview.internal_title.trim(),
        public_title: overview.public_title.trim(),
        reference: overview.reference.trim(),
        package_category: overview.package_category.trim(),
        short_description: overview.short_description || null,
        full_description: overview.full_description || null,
        destination_country: overview.destination_country.trim(),
        duration_days: overview.duration_days === '' ? null : Number(overview.duration_days),
        duration_nights: overview.duration_nights === '' ? null : Number(overview.duration_nights),
        cover_image_url: overview.cover_image_url || null,
        gallery: overview.gallery,
        highlights: overview.highlights,
        min_travelers: overview.min_travelers === '' ? null : Number(overview.min_travelers),
        max_travelers: overview.max_travelers === '' ? null : Number(overview.max_travelers),
        default_currency: (overview.default_currency || 'MAD').trim().toUpperCase(),
        starting_price: overview.starting_price === '' ? null : Number(overview.starting_price),
        price_display_mode: overview.price_display_mode || null,
        booking_deadline_days: overview.booking_deadline_days === '' ? null : Number(overview.booking_deadline_days),
        status,
        is_public: Boolean(isPublic),
      };
      const saved = await saveAdminOffer(payload);
      setOffer(saved);
      setOverview((current) => ({ ...current, ...saved }));
      setNotice(status === 'draft' ? 'Draft saved.' : 'Overview saved.');
      return saved;
    } catch (saveError) {
      console.error('Could not save offer overview:', saveError);
      setError(`Could not save overview: ${getReadableError(saveError)}`);
      return null;
    } finally {
      setOverviewSaving(false);
    }
  };

  const persistLanding = async (publish = false) => {
    if (!canUpdateOffers) {
      throw new Error('Your account is missing the packages.update permission required to save landing-page data.');
    }
    setLandingSaving(true);
    try {
      const payload = {
        ...landing,
        offer_id: id,
        slug: landing.slug?.trim() || null,
        section_visibility: typeof landing.section_visibility === 'string'
          ? JSON.parse(landing.section_visibility || '{}')
          : landing.section_visibility,
        faqs: typeof landing.faqs === 'string'
          ? JSON.parse(landing.faqs || '[]')
          : landing.faqs,
        published_at: publish ? new Date().toISOString() : landing.published_at || null,
      };
      const result = landing.id
        ? await supabase.from('landing_page_configs').update(payload).eq('id', landing.id).eq('offer_id', id).select().maybeSingle()
        : await supabase.from('landing_page_configs').insert(payload).select().single();
      const writeError = getWriteError(result, 'Saving landing page settings');
      if (writeError) throw writeError;
      setLanding(result.data);
      return result.data;
    } finally {
      setLandingSaving(false);
    }
  };

  const saveLanding = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await persistLanding();
      setNotice('Public landing page settings saved.');
    } catch (saveError) {
      console.error('Could not save landing page settings:', saveError);
      setError(`Could not save landing page: ${getReadableError(saveError)}`);
    }
  };

  const saveDraft = async () => {
    await saveAll('draft', false);
  };

  const saveAll = async (status = offer?.status, isPublic = offer?.is_public) => {
    if (!canUpdateOffers) {
      setError('Your account is missing the packages.update permission required to save offer data.');
      return;
    }
    if (recordDraftOpen) {
      setError('Add or cancel the open record form before saving the offer.');
      return;
    }

    setActionSaving(true);
    setError('');
    setNotice('');
    let activeSection = 'overview';
    try {
      const savedOffer = await saveOverview(status, isPublic);
      if (!savedOffer) throw new Error('Offer overview could not be saved.');

      for (const [table] of tablesToLoad) {
        activeSection = table;
        const desiredRecords = children[table] || [];
        const originalRecords = originalChildren.current[table] || [];
        const desiredIds = new Set(desiredRecords.map((record) => record.id).filter(Boolean));
        let persistedRecords = [...desiredRecords];
        let persistedOriginals = [...originalRecords];

        for (const oldRecord of originalRecords) {
          if (desiredIds.has(oldRecord.id)) continue;
          const result = await supabase
            .from(table)
            .delete()
            .eq('id', oldRecord.id)
            .eq('offer_id', id)
            .select('id')
            .maybeSingle();
          const writeError = getWriteError(result, `Deleting a record from ${table}`);
          if (writeError) throw writeError;
          persistedOriginals = persistedOriginals.filter((record) => record.id !== oldRecord.id);
          originalChildren.current = { ...originalChildren.current, [table]: persistedOriginals };
        }

        for (let index = 0; index < desiredRecords.length; index += 1) {
          const record = desiredRecords[index];
          const payload = getChildPayload(table, record, id);
          const result = record.id
            ? await supabase.from(table).update(payload).eq('id', record.id).eq('offer_id', id).select('id').maybeSingle()
            : await supabase.from(table).insert(payload).select('id').single();
          const writeError = getWriteError(result, `Saving a record in ${table}`);
          if (writeError) throw writeError;

          const savedRecord = { ...record, id: result.data.id };
          delete savedRecord.__draftId;
          persistedRecords[index] = savedRecord;
          const originalIndex = persistedOriginals.findIndex((entry) => entry.id === savedRecord.id);
          if (originalIndex === -1) persistedOriginals.push(savedRecord);
          else persistedOriginals[originalIndex] = savedRecord;
          originalChildren.current = { ...originalChildren.current, [table]: persistedOriginals };
          setChildren((current) => ({ ...current, [table]: persistedRecords }));
        }
      }

      activeSection = 'Public Landing Page';
      const savedLanding = await persistLanding(status === 'active');
      setLanding(savedLanding);
      setOffer(savedOffer);
      setNotice('All offer sections and records have been saved.');
    } catch (saveError) {
      console.error(`Could not finish saving offer at ${activeSection}:`, saveError);
      setError(`Saving stopped at ${activeSection}: ${getReadableError(saveError)} Successfully saved changes are retained; fix the issue and save again.`);
    } finally {
      setActionSaving(false);
    }
  };

  const publishOffer = async () => {
    const canPublish = completions.overview && completions.landing &&
      (Number(overview.starting_price) > 0 ||
        (children.offer_departures || []).some((departure) => Number(departure.selling_price_override) > 0) ||
        (children.offer_pricing_rules || []).some((rule) => rule.price_type === 'adult' && Number(rule.amount) > 0));
    if (!canPublish) {
      setError('To publish, complete the overview, add a landing-page slug and hero heading, and configure an adult price, starting price, or priced departure.');
      setActiveTab(!completions.overview ? 'overview' : !completions.landing ? 'landing' : 'pricing');
      return;
    }
    await saveAll('active', true);
  };

  const changeStatus = async (status) => {
    if (!canUpdateOffers) {
      setError('Your account is missing the packages.update permission required to change offer status.');
      return;
    }
    setActionSaving(true);
    setError('');
    try {
      const saved = await saveAdminOffer({ id, status, is_public: status === 'active' ? offer.is_public : false });
      setOffer(saved);
      setNotice(`Offer status changed to ${status}.`);
    } catch (statusError) {
      console.error('Could not update offer status:', statusError);
      setError(`Could not update status: ${getReadableError(statusError)}`);
    } finally {
      setActionSaving(false);
    }
  };

  const updateLandingField = (name, value) => setLanding((current) => ({ ...current, [name]: value }));
  const activeStepIndex = tabs.findIndex(([key]) => key === activeTab);

  const goToNextStep = () => {
    if (recordDraftOpen) {
      setError('Add or cancel the open record form before continuing to the next section.');
      return;
    }
    if (activeTab === 'overview' && !completions.overview) {
      setError('Complete the required overview fields before continuing.');
      return;
    }
    setError('');
    if (activeStepIndex < tabs.length - 1) setActiveTab(tabs[activeStepIndex + 1][0]);
  };

  if (authLoading || loading) {
    return <main className="flex min-h-[50vh] items-center justify-center gap-3 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin text-amber-600" />Loading offer editor…</main>;
  }
  if (!offer) {
  return (
    <main className="m-6 rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
      {error || 'Offer not found.'}
      {!user && <button type="button" onClick={() => navigate('/auth/admin-login')} className="ml-3 font-semibold underline">Sign in</button>}
      <button type="button" onClick={() => navigate('/admin/packages-services')} className="ml-3 font-semibold underline">Back to offers</button>
    </main>
  );
  }

  const tabContent = () => {
    if (activeTab === 'overview') {
      const overviewFields = [
        ['internal_title', 'Internal title'], ['public_title', 'Public title'], ['reference', 'Reference'], ['package_category', 'Category'], ['destination_country', 'Destination country'],
        ['duration_days', 'Duration in days', 'number', 1], ['duration_nights', 'Duration in nights', 'number', 1], ['min_travelers', 'Minimum travelers', 'number', 1], ['max_travelers', 'Maximum travelers', 'number', 1],
        ['default_currency', 'Default currency'], ['starting_price', 'Starting price', 'number', '0.01'], ['price_display_mode', 'Price display mode'],
        ['booking_deadline_days', 'Booking deadline (days)', 'number', 1], ['cover_image_url', 'Cover image URL'],
      ];
      return (
        <form onSubmit={(event) => event.preventDefault()} className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Offer overview</h2>
            <p className="mt-1 text-xs text-slate-500">Public-facing content is separate from internal operations. Never put private notes in descriptions.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {overviewFields.map(([name, label, type, step]) => (
              <label key={name} className="block text-xs font-medium text-slate-700">{label}
                {name === 'price_display_mode' ? (
                  <select value={overview[name] || 'starting_from'} onChange={(event) => setOverview((current) => ({ ...current, [name]: event.target.value }))} className={inputClass}>
                    <option value="starting_from">Starting from</option>
                    <option value="exact">Exact price</option>
                    <option value="on_request">On request</option>
                  </select>
                ) : (
                  <input
                    required={['internal_title', 'public_title', 'reference', 'package_category', 'destination_country'].includes(name)}
                    type={type || 'text'}
                    min={type === 'number' ? 0 : undefined}
                    maxLength={name === 'default_currency' ? 3 : undefined}
                    step={step}
                    value={overview[name] ?? ''}
                    onChange={(event) => setOverview((current) => ({
                      ...current,
                      [name]: name === 'default_currency' ? event.target.value.toUpperCase() : event.target.value,
                    }))}
                    className={inputClass}
                  />
                )}
              </label>
            ))}
            <label className="block text-xs font-medium text-slate-700 sm:col-span-2">Short description
              <textarea rows={2} value={overview.short_description || ''} onChange={(event) => setOverview((current) => ({ ...current, short_description: event.target.value }))} className={inputClass} />
            </label>
            <label className="block text-xs font-medium text-slate-700 sm:col-span-2">Full public description
              <textarea rows={5} value={overview.full_description || ''} onChange={(event) => setOverview((current) => ({ ...current, full_description: event.target.value }))} className={inputClass} />
            </label>
            <label className="block text-xs font-medium text-slate-700">Gallery image URLs <span className="font-normal text-slate-400">(one per line)</span>
              <textarea rows={4} value={overview.gallery.join('\n')} onChange={(event) => setOverview((current) => ({ ...current, gallery: event.target.value.split('\n').map((value) => value.trim()).filter(Boolean) }))} className={inputClass} />
            </label>
            <label className="block text-xs font-medium text-slate-700">Highlights <span className="font-normal text-slate-400">(one per line)</span>
              <textarea rows={4} value={overview.highlights.join('\n')} onChange={(event) => setOverview((current) => ({ ...current, highlights: event.target.value.split('\n').map((value) => value.trim()).filter(Boolean) }))} className={inputClass} />
            </label>
          </div>
          <aside className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            Internal notes are not supported by the provided <code>offers</code> schema. Add a private notes column or table before storing them; this editor will not mix private notes into public descriptions.
          </aside>
        </form>
      );
    }
    if (activeTab === 'destinations') return <RecordManager offerId={id} sectionKey="destinations" title="Countries & Cities" records={children.offer_destinations || []} onRecordsChange={(records, section, fixed) => updateChildRecords('offer_destinations', records, section, fixed)} onPendingChange={setRecordDraftOpen} canWrite={canUpdateOffers} />;
    if (activeTab === 'accommodations') return <RecordManager offerId={id} sectionKey="accommodations" title="Hotels & Accommodation" records={children.offer_accommodations || []} onRecordsChange={(records, section, fixed) => updateChildRecords('offer_accommodations', records, section, fixed)} onPendingChange={setRecordDraftOpen} canWrite={canUpdateOffers} />;
    if (activeTab === 'flights') return <RecordManager offerId={id} sectionKey="flights" title="Flights & Airlines" records={(children.offer_transports || []).filter((item) => item.transport_type === 'flight')} onRecordsChange={(records, section, fixed) => updateChildRecords('offer_transports', records, section, fixed)} onPendingChange={setRecordDraftOpen} canWrite={canUpdateOffers} />;
    if (activeTab === 'ground') return <RecordManager offerId={id} sectionKey="ground" title="Cars & Ground Transportation" records={(children.offer_transports || []).filter((item) => item.transport_type !== 'flight')} onRecordsChange={(records, section, fixed) => updateChildRecords('offer_transports', records, section, fixed)} onPendingChange={setRecordDraftOpen} canWrite={canUpdateOffers} />;
    if (activeTab === 'activities') return <RecordManager offerId={id} sectionKey="activities" title="Activities & Excursions" records={children.offer_activities || []} onRecordsChange={(records, section, fixed) => updateChildRecords('offer_activities', records, section, fixed)} onPendingChange={setRecordDraftOpen} canWrite={canUpdateOffers} />;
    if (activeTab === 'itinerary') return <RecordManager offerId={id} sectionKey="itinerary" title="Day-by-Day Itinerary" records={children.offer_itinerary_days || []} onRecordsChange={(records, section, fixed) => updateChildRecords('offer_itinerary_days', records, section, fixed)} onPendingChange={setRecordDraftOpen} canWrite={canUpdateOffers} />;
    if (activeTab === 'inclusions') {
      const records = children.offer_inclusions_exclusions || [];
      return (
        <div className="space-y-8">
          <RecordManager offerId={id} sectionKey="inclusions" title="Inclusions" records={records.filter((item) => item.item_type === 'inclusion')} fixedValues={{ item_type: 'inclusion' }} onRecordsChange={(next, section, fixed) => updateChildRecords('offer_inclusions_exclusions', next, section, fixed)} onPendingChange={setRecordDraftOpen} canWrite={canUpdateOffers} />
          <div className="border-t border-slate-200" />
          <RecordManager offerId={id} sectionKey="inclusions" title="Exclusions" records={records.filter((item) => item.item_type === 'exclusion')} fixedValues={{ item_type: 'exclusion' }} onRecordsChange={(next, section, fixed) => updateChildRecords('offer_inclusions_exclusions', next, section, fixed)} onPendingChange={setRecordDraftOpen} canWrite={canUpdateOffers} />
        </div>
      );
    }
    if (activeTab === 'pricing') {
      return (
        <div className="space-y-8">
          <RecordManager offerId={id} sectionKey="rules" title="Pricing Rules" records={children.offer_pricing_rules || []} onRecordsChange={(records, section, fixed) => updateChildRecords('offer_pricing_rules', records, section, fixed)} onPendingChange={setRecordDraftOpen} canWrite={canUpdateOffers} />
          <div className="border-t border-slate-200" />
          <RecordManager offerId={id} sectionKey="departures" title="Departures" records={children.offer_departures || []} onRecordsChange={(records, section, fixed) => updateChildRecords('offer_departures', records, section, fixed)} onPendingChange={setRecordDraftOpen} canWrite={canUpdateOffers} />
        </div>
      );
    }
    return (
      <form onSubmit={(event) => event.preventDefault()} className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Public landing page</h2>
          <p className="mt-1 text-xs text-slate-500">Configure the public offer page. JSON fields must contain valid JSON.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ['slug', 'URL slug'], ['meta_title', 'SEO title'], ['og_image_url', 'Social sharing image URL'], ['hero_heading', 'Hero headline'],
            ['hero_subtitle', 'Hero subtitle'], ['cta_label', 'Call-to-action label'], ['cta_action_url', 'Call-to-action URL'],
          ].map(([name, label]) => (
            <label key={name} className="block text-xs font-medium text-slate-700">{label}
              <input value={landing?.[name] || ''} onChange={(event) => updateLandingField(name, event.target.value)} className={inputClass} />
            </label>
          ))}
          <label className="block text-xs font-medium text-slate-700 sm:col-span-2">Meta description
            <textarea rows={2} value={landing?.meta_description || ''} onChange={(event) => updateLandingField('meta_description', event.target.value)} className={inputClass} />
          </label>
          <label className="block text-xs font-medium text-slate-700 sm:col-span-2">Public introduction
            <textarea rows={5} value={landing?.public_introduction || ''} onChange={(event) => updateLandingField('public_introduction', event.target.value)} className={inputClass} />
          </label>
          <fieldset className="rounded-lg border border-slate-200 p-3 sm:col-span-2">
            <legend className="px-1 text-xs font-medium text-slate-700">Visible public sections</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {[
                ['overview', 'Overview'],
                ['itinerary', 'Itinerary'],
                ['inclusions', 'Inclusions & exclusions'],
                ['departures', 'Departure dates'],
                ['booking_widget', 'Booking widget'],
                ['faqs', 'FAQs and policies'],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={landing?.section_visibility?.[key] !== false}
                    onChange={(event) => updateLandingField('section_visibility', {
                      ...landing.section_visibility,
                      [key]: event.target.checked,
                    })}
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <section className="space-y-3 sm:col-span-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium text-slate-700">Frequently asked questions</h3>
              <button
                type="button"
                onClick={() => updateLandingField('faqs', [...(landing.faqs || []), { question: '', answer: '' }])}
                className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700"
              >
                <Plus className="h-3.5 w-3.5" />Add FAQ
              </button>
            </div>
            {(landing.faqs || []).map((faq, index) => (
              <div key={faq.id || index} className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-2">
                <label className="block text-xs text-slate-600">Question
                  <input value={faq.question || ''} onChange={(event) => {
                    const faqs = [...landing.faqs];
                    faqs[index] = { ...faqs[index], question: event.target.value };
                    updateLandingField('faqs', faqs);
                  }} className={inputClass} />
                </label>
                <label className="block text-xs text-slate-600">Answer
                  <textarea rows={2} value={faq.answer || ''} onChange={(event) => {
                    const faqs = [...landing.faqs];
                    faqs[index] = { ...faqs[index], answer: event.target.value };
                    updateLandingField('faqs', faqs);
                  }} className={inputClass} />
                </label>
                <button type="button" onClick={() => updateLandingField('faqs', landing.faqs.filter((_, faqIndex) => faqIndex !== index))} className="text-left text-xs font-medium text-rose-600">Remove FAQ</button>
              </div>
            ))}
          </section>
          <label className="block text-xs font-medium text-slate-700 sm:col-span-2">Terms & conditions
            <textarea rows={4} value={landing?.terms_and_conditions || ''} onChange={(event) => updateLandingField('terms_and_conditions', event.target.value)} className={inputClass} />
          </label>
          <label className="block text-xs font-medium text-slate-700 sm:col-span-2">Cancellation policy
            <textarea rows={4} value={landing?.cancellation_policy || ''} onChange={(event) => updateLandingField('cancellation_policy', event.target.value)} className={inputClass} />
          </label>
        </div>
      </form>
    );
  };

  return (
    <main className="min-h-full space-y-5 bg-slate-50/70 p-4 sm:p-6">
      <header className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <button type="button" onClick={() => navigate('/admin/packages-services')} aria-label="Back to offers" className="mt-1 rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"><ArrowLeft className="h-4 w-4" /></button>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-slate-900">{offer.public_title || offer.internal_title || 'Untitled offer'}</p>
            <p className="mt-1 font-mono text-xs text-slate-500">{offer.reference} · <span className="capitalize">{offer.status}</span></p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={actionSaving || !canUpdateOffers} onClick={saveDraft} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"><Save className="h-3.5 w-3.5" />Save Draft</button>
          <button type="button" onClick={() => window.open(`/packages/${id}?preview=true`, '_blank', 'noopener,noreferrer')} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"><Eye className="h-3.5 w-3.5" />Preview</button>
          {offer.status !== 'archived' && <button type="button" disabled={actionSaving || !canUpdateOffers} onClick={() => changeStatus('archived')} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 disabled:opacity-50">Archive</button>}
          <button type="button" disabled={actionSaving || !canUpdateOffers} onClick={publishOffer} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50">
            {actionSaving && offer.status !== 'active' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}Publish
          </button>
        </div>
      </header>

      {error && <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
      {notice && <div role="status" className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 className="h-4 w-4" />{notice}</div>}
      {!canUpdateOffers && (
        <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          This account can view offers but cannot save changes. Ask an administrator to grant the <code>packages.update</code> permission.
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="h-fit rounded-xl border border-slate-200 bg-white p-3">
          <h2 className="px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Offer sections</h2>
          <nav aria-label="Offer editor sections" className="space-y-1">
            {tabs.map(([key, label], index) => (
              <div key={key} aria-current={activeTab === key ? 'step' : undefined} className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-xs font-medium ${activeTab === key ? 'bg-amber-50 text-amber-900' : 'text-slate-600'}`}>
                <span className="flex items-center gap-2"><span className="w-4 text-[10px] text-slate-400">{index + 1}.</span>{label}</span>
                {completions[key] ? <CheckCircle2 aria-label="Complete" className="h-4 w-4 shrink-0 text-emerald-600" /> : <Circle aria-label="Incomplete" className="h-4 w-4 shrink-0 text-slate-300" />}
              </div>
            ))}
          </nav>
          <p className="mt-3 border-t border-slate-100 px-2 pt-3 text-[10px] leading-4 text-slate-400">Work through each section in order. Click “Save all sections” on the final step to write your changes.</p>
        </aside>
        <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
          {tabContent()}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              disabled={activeStepIndex <= 0 || actionSaving}
              onClick={() => { setError(''); setActiveTab(tabs[activeStepIndex - 1][0]); }}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 disabled:opacity-40"
            >
              Previous
            </button>
            <p className="text-xs text-slate-500">Section {activeStepIndex + 1} of {tabs.length} · Changes are saved together at the end.</p>
            {activeStepIndex < tabs.length - 1 ? (
              <button
                type="button"
                disabled={actionSaving}
                onClick={goToNextStep}
                className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
              >
                Next: {tabs[activeStepIndex + 1][1]}
              </button>
            ) : (
              <button
                type="button"
                disabled={actionSaving || !canUpdateOffers || recordDraftOpen}
                onClick={() => saveAll()}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {actionSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {actionSaving ? 'Saving all sections…' : 'Save all sections'}
              </button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
