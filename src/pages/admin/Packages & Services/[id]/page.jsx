import { useAppSettings, translate, useAuth } from '@/context/index.jsx';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle, ArrowDown, ArrowLeft, ArrowUp, Archive, Check, CheckCircle2,
  ChevronRight, Circle, Copy, Eye, Globe, Loader2, Lock, Plus, Save, ShieldCheck, Trash2, X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client.jsx';

import { saveAdminOffer } from '@/services/packages/index.jsx';
import { canUserAccessPath } from '@/services/roleAccessService.js';

/* ================================================================== */
/*  Config                                                             */
/* ================================================================== */
const inputClass =
  'mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500';

const TABS = [
  { key: 'overview',      label: 'Overview',              desc: 'Identity, descriptions, media and travel rules.' },
  { key: 'destinations',  label: 'Destinations',          desc: 'Countries and cities included in this package.' },
  { key: 'accommodations',label: 'Accommodation',         desc: 'Hotels, riads and resorts with supplier links.' },
  { key: 'flights',       label: 'Flights',               desc: 'Flight segments and airlines.' },
  { key: 'ground',        label: 'Ground Transport',      desc: 'Transfers, cars, buses and trains.' },
  { key: 'activities',    label: 'Activities',            desc: 'Excursions and optional experiences.' },
  { key: 'itinerary',     label: 'Itinerary',             desc: 'Day-by-day plan visible to travelers.' },
  { key: 'inclusions',    label: 'Inclusions & Exclusions', desc: 'What is and is not included.' },
  { key: 'pricing',       label: 'Pricing & Costs',       desc: 'Selling prices, internal costs, insurance plans and margin.' },
  { key: 'departures',    label: 'Departures',            desc: 'Dates, capacity and availability.' },
  { key: 'landing',       label: 'Public Page & SEO',     desc: 'Slug, hero, metadata and FAQs.' },
  { key: 'settings',      label: 'Settings',              desc: 'Status, visibility and internal notes.' },
];

const PUBLIC_SECTION_OPTIONS = [
  ['overview', 'Description and introduction'],
  ['media', 'Cover image and gallery'],
  ['highlights', 'Trip highlights'],
  ['trip_facts', 'Category, destination and trip facts'],
  ['itinerary', 'Day-by-day itinerary'],
  ['inclusions', 'Inclusions and exclusions'],
  ['departures', 'Departure dates and availability'],
  ['pricing', 'Prices and pricing breakdown'],
  ['booking_widget', 'Booking request form'],
  ['faqs', 'FAQs, terms and cancellation policy'],
];

// Child section definitions — kept compatible with your existing schema
const CHILD_SECTIONS = {
  destinations: {
    table: 'offer_destinations',
    title: 'Destination',
    fields: [
      { name: 'destination_name', label: 'City / destination', required: true, wide: true },
      { name: 'country',          label: 'Country',            required: true },
      { name: 'arrival_day',      label: 'Arrival day',   type: 'number', integer: true },
      { name: 'departure_day',    label: 'Departure day', type: 'number', integer: true },
      { name: 'sort_order',       label: 'Display order', type: 'number', integer: true },
      { name: 'description',      label: 'Description',   type: 'textarea', wide: true },
      { name: 'image_url',        label: 'Image URL',     type: 'url', wide: true },
    ],
    orderBy: 'sort_order',
  },
  accommodations: {
    table: 'offer_accommodations',
    title: 'Accommodation',
    supplierKinds: ['hotel', 'riad', 'resort'],
    fields: [
      { name: 'supplier_id',               label: 'Supplier (hotel/riad/resort)', type: 'supplier', supplierKind: 'hotel' },
      { name: 'hotel_name_snapshot',       label: 'Property name (snapshot)',     required: true, wide: true },
      { name: 'destination',               label: 'City / destination' },
      { name: 'check_in_day',              label: 'Check-in day',  type: 'number', integer: true },
      { name: 'check_out_day',             label: 'Check-out day', type: 'number', integer: true },
      { name: 'number_of_nights',          label: 'Nights',        type: 'number', integer: true },
      { name: 'room_type',                 label: 'Room type' },
      { name: 'number_of_rooms',           label: 'Number of rooms', type: 'number', integer: true },
      { name: 'occupancy_per_room',        label: 'Guests per room', type: 'number', integer: true },
      { name: 'meal_plan',                 label: 'Meal plan' },
      { name: 'amenities',                 label: 'Amenities (one per line)', type: 'array', wide: true },
      { name: 'description',               label: 'Public description', type: 'textarea', wide: true },
      { name: 'images',                    label: 'Image URLs (one per line)', type: 'array', wide: true },
      { name: 'internal_reference',        label: 'Private booking reference', wide: true, private: true },
    ],
    orderBy: 'check_in_day',
  },
  flights: {
    table: 'offer_transports',
    title: 'Flight',
    fixedValues: { transport_type: 'flight' },
    supplierKinds: ['airline'],
    fields: [
      { name: 'supplier_id',            label: 'Airline / supplier', type: 'supplier', supplierKind: 'airline' },
      { name: 'provider_name',          label: 'Airline', required: true },
      { name: 'flight_or_service_number', label: 'Flight number' },
      { name: 'departure_location',     label: 'Departure airport' },
      { name: 'arrival_location',       label: 'Arrival airport' },
      { name: 'departure_datetime',     label: 'Departure date & time', type: 'datetime-local' },
      { name: 'arrival_datetime',       label: 'Arrival date & time', type: 'datetime-local' },
      { name: 'cabin_class',            label: 'Cabin class' },
      { name: 'baggage_allowance',      label: 'Baggage allowance' },
      { name: 'description',            label: 'Public notes', type: 'textarea', wide: true },
      { name: 'sort_order',             label: 'Display order', type: 'number', integer: true },
    ],
    orderBy: 'sort_order',
  },
  ground: {
    table: 'offer_transports',
    title: 'Ground Service',
    supplierKinds: ['transport_company', 'car_rental'],
    fields: [
      { name: 'supplier_id',        label: 'Transport supplier', type: 'supplier', supplierKind: 'transport_company' },
      { name: 'transport_type',     label: 'Transport type', type: 'select', required: true, options: ['ground', 'transfer', 'private 4x4', 'bus', 'train'] },
      { name: 'provider_name',      label: 'Provider / operator' },
      { name: 'vehicle_type',       label: 'Vehicle / model' },
      { name: 'flight_or_service_number', label: 'Service reference' },
      { name: 'departure_location', label: 'Pickup location' },
      { name: 'arrival_location',   label: 'Drop-off location' },
      { name: 'departure_datetime', label: 'Pickup date & time', type: 'datetime-local' },
      { name: 'arrival_datetime',   label: 'Drop-off date & time', type: 'datetime-local' },
      { name: 'description',        label: 'Public description', type: 'textarea', wide: true },
      { name: 'sort_order',         label: 'Display order', type: 'number', integer: true },
    ],
    orderBy: 'sort_order',
  },
  activities: {
    table: 'offer_activities',
    title: 'Activity',
    supplierKinds: ['activity_provider', 'local_guide'],
    fields: [
      { name: 'supplier_id',    label: 'Activity supplier', type: 'supplier', supplierKind: 'activity_provider' },
      { name: 'activity_name',  label: 'Activity', required: true },
      { name: 'destination',    label: 'Destination' },
      { name: 'scheduled_day',  label: 'Scheduled day', type: 'number', integer: true },
      { name: 'duration',       label: 'Duration' },
      { name: 'is_included',    label: 'Included in offer', type: 'checkbox' },
      { name: 'price',          label: 'Optional selling price', type: 'number' },
      { name: 'currency',       label: 'Price currency' },
      { name: 'image_url',      label: 'Image URL', type: 'url' },
      { name: 'description',    label: 'Description', type: 'textarea', wide: true },
      { name: 'sort_order',     label: 'Display order', type: 'number', integer: true },
    ],
    orderBy: 'sort_order',
  },
  itinerary: {
    table: 'offer_itinerary_days',
    title: 'Itinerary Day',
    fields: [
      { name: 'day_number',   label: 'Day number', type: 'number', required: true, integer: true },
      { name: 'title',        label: 'Day title', required: true },
      { name: 'destination',  label: 'Destination' },
      { name: 'description',  label: 'Day description', type: 'textarea', wide: true },
      { name: 'images',       label: 'Image URLs (one per line)', type: 'array', wide: true },
      { name: 'sort_order',   label: 'Display order', type: 'number', integer: true },
    ],
    orderBy: 'sort_order',
  },
  inclusions: {
    table: 'offer_inclusions_exclusions',
    title: 'Item',
    fields: [
      { name: 'description', label: 'Item', type: 'textarea', required: true, wide: true },
      { name: 'category',    label: 'Category' },
      { name: 'sort_order',  label: 'Display order', type: 'number', integer: true },
    ],
    orderBy: 'sort_order',
  },
  pricingRules: {
    table: 'offer_pricing_rules',
    title: 'Pricing Rule',
    fields: [
      { name: 'price_type', label: 'Price type', type: 'select', required: true,
        options: ['adult', 'child', 'infant', 'single_supplement', 'other'] },
      { name: 'amount',     label: 'Amount', type: 'number', required: true },
      { name: 'currency',   label: 'Currency', required: true },
      { name: 'conditions', label: 'Conditions', type: 'textarea', wide: true },
    ],
  },
  costs: {
    table: 'offer_costs',
    title: 'Cost Line',
    fields: [
      { name: 'cost_type', label: 'Cost type', type: 'select', required: true,
        options: ['accommodation', 'flight', 'ground', 'activity', 'other'] },
      { name: 'supplier_id', label: 'Supplier', type: 'supplier', supplierKind: null },
      { name: 'label', label: 'Label', required: true },
      { name: 'unit', label: 'Unit', type: 'select',
        options: ['per_person', 'per_room_night', 'per_group', 'per_trip'] },
      { name: 'amount', label: 'Amount', type: 'number', required: true },
      { name: 'currency', label: 'Currency', required: true },
      { name: 'notes', label: 'Private notes', type: 'textarea', wide: true },
    ],
  },
  departures: {
    table: 'offer_departures',
    title: 'Departure',
    fields: [
      { name: 'departure_date',     label: 'Departure date', type: 'date', required: true },
      { name: 'return_date',        label: 'Return date', type: 'date' },
      { name: 'booking_deadline',   label: 'Booking deadline', type: 'date' },
      { name: 'max_capacity',       label: 'Maximum capacity', type: 'number', integer: true },
      { name: 'reserved_capacity',  label: 'Reserved capacity', type: 'number', integer: true },
      { name: 'selling_price_override', label: 'Price override', type: 'number' },
      { name: 'currency',           label: 'Currency' },
      { name: 'status',             label: 'Status', type: 'select', options: ['open', 'sold_out', 'closed', 'cancelled'] },
      { name: 'internal_notes',     label: 'Private notes', type: 'textarea', wide: true, private: true },
    ],
    orderBy: 'departure_date',
  },
};

const TABLES_TO_LOAD = [
  ['offer_destinations', 'sort_order'],
  ['offer_accommodations', 'check_in_day'],
  ['offer_transports', 'sort_order'],
  ['offer_activities', 'sort_order'],
  ['offer_itinerary_days', 'sort_order'],
  ['offer_inclusions_exclusions', 'sort_order'],
  ['offer_departures', 'departure_date'],
  ['offer_pricing_rules', null],
  ['offer_costs', null],
  ['offer_insurance_plans', 'sort_order'],
];

const EMPTY_OVERVIEW = {
  internal_title: '', public_title: '', reference: '', package_category: '',
  short_description: '', full_description: '', destination_country: '',
  duration_days: '', duration_nights: '', cover_image_url: '',
  gallery: [], highlights: [], min_travelers: '', max_travelers: '',
  default_currency: 'MAD', starting_price: '', price_display_mode: 'starting_from',
  booking_deadline_days: '',
};

/* ================================================================== */
/*  Utilities                                                          */
/* ================================================================== */
function displayFieldValue(field, value) {
  if (field.type === 'array') return Array.isArray(value) ? value.join('\n') : '';
  if (field.type === 'datetime-local' && value) return String(value).slice(0, 16);
  if (field.type === 'checkbox') return Boolean(value);
  return value ?? '';
}

function serializeField(field, value) {
  if (field.type === 'array') return value.split('\n').map((v) => v.trim()).filter(Boolean);
  if (field.type === 'number') return value === '' ? null : Number(value);
  if (field.type === 'checkbox') return Boolean(value);
  if (field.type === 'datetime-local') {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  }
  if (field.name === 'currency' && value) return value.trim().toUpperCase();
  return value === '' ? null : value;
}

function readableError(err) {
  const msg = err?.message || String(err);
  if (/row-level security|permission denied|not allowed/i.test(msg)) {
    return `${msg} Check that the signed-in account has the required packages.* permissions and owns this record.`;
  }
  return msg;
}

function getWriteError(result, action) {
  if (result.error) return result.error;
  if (!result.data) {
    return new Error(`${action} affected no rows. Confirm permissions and that the record belongs to this package.`);
  }
  return null;
}

function getChildPayload(table, record, offerId, section) {
  const columns = new Set([
    ...section.fields.map((f) => f.name),
    ...Object.keys(section.fixedValues || {}),
    ...(table === 'offer_inclusions_exclusions' ? ['item_type'] : []),
  ]);
  const payload = { offer_id: offerId };
  columns.forEach((c) => { if (c in record) payload[c] = record[c]; });
  return payload;
}

function slugifyPlanKey(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 40);
}

/* ================================================================== */
/*  UI primitives                                                      */
/* ================================================================== */
function FieldControl({ field, value, onChange }) {
  const common = { id: field.name, required: field.required, className: inputClass };

  if (field.type === 'checkbox') {
    return (
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
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
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  if (field.type === 'select') {
    return (
      <select {...common} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">{translate('Select…')}</option>
        {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  if (field.type === 'supplier') {
    return <SupplierPicker field={field} value={value} onChange={onChange} />;
  }
  return (
    <input
      {...common}
      type={field.type || 'text'}
      min={field.type === 'number' ? 0 : undefined}
      step={field.type === 'number' ? (field.integer ? 1 : 'any') : undefined}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

/* ================================================================== */
/*  Supplier picker                                                    */
/* ================================================================== */
function SupplierPicker({ field, value, onChange }) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      let q = supabase
        .from('suppliers')
        .select('id, name, supplier_type, city, status')
        .is('deleted_at', null)
        .order('name', { ascending: true })
        .limit(200);
      if (field.supplierKinds?.length) q = q.in('supplier_type', field.supplierKinds);
      else if (field.supplierKind) q = q.eq('supplier_type', field.supplierKind);
      const { data, error } = await q;
      if (cancelled) return;
      if (!error) setOptions(data || []);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [field.supplierKind, field.supplierKinds]);

  useEffect(() => {
    function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const selected = options.find((o) => o.id === value);
  const filtered = options.filter((o) =>
    !query || o.name?.toLowerCase().includes(query.toLowerCase()) ||
    o.city?.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mt-1 flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-800 focus:border-amber-500 focus:outline-none"
      >
        <span className="truncate">
          {selected ? selected.name : <span className="text-slate-400">{translate('Select supplier…')}</span>}
        </span>
        {value && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onChange(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onChange(''); } }}
            className="ml-2 rounded p-0.5 text-slate-400 hover:bg-slate-100"
            aria-label="Clear supplier"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        )}
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 p-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search suppliers…"
              className="w-full rounded border border-slate-200 px-2 py-1 text-xs focus:border-amber-500 focus:outline-none"
            />
          </div>
          <ul className="max-h-56 overflow-y-auto py-1 text-sm">
            {loading ? (
              <li className="px-3 py-2 text-xs text-slate-500">{translate('Loading…')}</li>
            ) : filtered.length === 0 ? (
              <li className="px-3 py-2 text-xs text-slate-500">{translate('No suppliers match.')}</li>
            ) : filtered.map((opt) => (
              <li key={opt.id}>
                <button
                  type="button"
                  onClick={() => { onChange(opt.id); setOpen(false); }}
                  className={`flex w-full items-center justify-between px-3 py-1.5 text-left hover:bg-slate-50 ${value === opt.id ? 'bg-amber-50' : ''}`}
                >
                  <span className="truncate">
                    <span className="font-medium text-slate-800">{opt.name}</span>
                    {opt.city && <span className="ml-2 text-xs text-slate-400">{opt.city}</span>}
                  </span>
                  <span className="ml-2 text-[10px] uppercase tracking-wide text-slate-400">{opt.supplier_type}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Record manager                                                     */
/* ================================================================== */
function RecordManager({
  offerId, sectionKey, title, records, onRecordsChange,
  fixedValues = {}, canWrite = true, onDraftChange, extraDefaults = {},
}) {
  const config = CHILD_SECTIONS[sectionKey];
  const recordFixedValues = { ...config.fixedValues, ...fixedValues };
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState('');
  const orderField = config.orderBy;

  const orderedRecords = orderField
    ? [...records].sort((a, b) => String(a[orderField] ?? '').localeCompare(String(b[orderField] ?? ''), undefined, { numeric: true }))
    : records;

  const startNew = () => {
    setError('');
    const base = {
      ...recordFixedValues,
      offer_id: offerId,
      ...(orderField ? { [orderField]: records.length + 1 } : {}),
      ...(sectionKey === 'activities' ? { is_included: true, currency: 'MAD' } : {}),
      ...(sectionKey === 'pricingRules' ? { currency: 'MAD' } : {}),
      ...(sectionKey === 'costs' ? { currency: 'MAD', unit: 'per_person' } : {}),
      ...(sectionKey === 'departures' ? { status: 'open', currency: 'MAD', reserved_capacity: 0 } : {}),
      ...extraDefaults,
    };
    config.fields.forEach((f) => {
      if (!(f.name in base)) base[f.name] = f.type === 'checkbox' ? false : '';
    });
    setDraft({ ...base, __isNew: true });
    onDraftChange?.(true);
  };

  const startEdit = (item) => {
    setError('');
    const next = { ...item };
    config.fields.forEach((f) => { next[f.name] = displayFieldValue(f, item[f.name]); });
    setDraft({ ...next, __isNew: false });
    onDraftChange?.(true);
  };

  const cancelDraft = () => { setDraft(null); setError(''); onDraftChange?.(false); };

  const stage = (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = { ...recordFixedValues };
      config.fields.forEach((f) => {
        if (f.name in draft) payload[f.name] = serializeField(f, draft[f.name]);
      });
      if (payload.currency && !/^[A-Z]{3}$/.test(payload.currency)) {
        throw new Error('Currency must be a three-letter ISO code (e.g. MAD, EUR).');
      }
      if (draft.__isNew) {
        const tempId = globalThis.crypto?.randomUUID?.() || `tmp-${Date.now()}-${Math.random()}`;
        onRecordsChange(
          [...records, { ...payload, __draftId: tempId }],
          sectionKey, recordFixedValues,
        );
      } else {
        onRecordsChange(
          records.map((r) => (r.id === draft.id ? { ...payload, id: draft.id } : r)),
          sectionKey, recordFixedValues,
        );
      }
      cancelDraft();
    } catch (err) {
      setError(`Could not add this record: ${readableError(err)}`);
    }
  };

  const remove = (item) => {
    if (!window.confirm(`Delete this ${title.toLowerCase()}?`)) return;
    const id = item.id || item.__draftId;
    onRecordsChange(
      records.filter((r) => (r.id || r.__draftId) !== id),
      sectionKey, recordFixedValues,
    );
  };

  const move = (item, dir) => {
    if (!orderField) return;
    const idx = orderedRecords.findIndex((r) => (r.id || r.__draftId) === (item.id || item.__draftId));
    const neighbor = orderedRecords[idx + dir];
    if (!neighbor) return;
    const reordered = [...orderedRecords];
    [reordered[idx], reordered[idx + dir]] = [reordered[idx + dir], reordered[idx]];
    onRecordsChange(
      reordered.map((r, i) => ({ ...r, [orderField]: i + 1 })),
      sectionKey, recordFixedValues,
    );
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500">{records.length} record{records.length === 1 ? '' : 's'}</p>
        </div>
        <button
          type="button" disabled={!canWrite} onClick={startNew}
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" /> Add {title}
        </button>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800">
          {error}
        </p>
      )}

      {draft && (
        <form onSubmit={stage} className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/40 p-3">
          <p className="text-xs font-semibold text-slate-800">
            {draft.__isNew ? `New ${title.toLowerCase()}` : `Editing ${title.toLowerCase()}`}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {config.fields
              .filter((f) => !(f.name in recordFixedValues))
              .map((f) => (
                <label
                  key={f.name} htmlFor={f.name}
                  className={`block text-xs font-medium text-slate-700 ${f.wide || f.type === 'textarea' || f.type === 'array' || f.type === 'supplier' ? 'sm:col-span-2' : ''}`}
                >
                  {f.label}{f.required && <span className="text-rose-500">{translate('*')}</span>}
                  {f.private && <span className="ml-1 rounded bg-slate-200 px-1 py-0.5 text-[9px] font-semibold uppercase text-slate-600">{translate('private')}</span>}
                  <FieldControl
                    field={f}
                    value={displayFieldValue(f, draft[f.name])}
                    onChange={(v) => setDraft((c) => ({ ...c, [f.name]: v }))}
                  />
                </label>
              ))}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={cancelDraft} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600">{translate('Cancel')}</button>
            <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white">
              <Check className="h-3.5 w-3.5" /> {draft.__isNew ? 'Add' : 'Update'}
            </button>
          </div>
        </form>
      )}

      {orderedRecords.length === 0 && !draft ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-xs text-slate-500">
          No {title.toLowerCase()} records yet.
        </div>
      ) : (
        <ul className="space-y-2">
          {orderedRecords.map((item, i) => {
            const summaryField = config.fields.find((f) => item[f.name] != null && item[f.name] !== '');
            return (
              <li key={item.id || item.__draftId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {summaryField ? String(item[summaryField.name]) : title}
                    {item.__draftId && (
                      <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-amber-800">{translate('unsaved')}</span>
                    )}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {config.fields
                      .filter((f) => f.name !== summaryField?.name && item[f.name] != null && item[f.name] !== '')
                      .slice(0, 3)
                      .map((f) => `${f.label}: ${Array.isArray(item[f.name]) ? item[f.name].join(', ') : item[f.name]}`)
                      .join(' · ')}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {orderField && (
                    <>
                      <button type="button" disabled={!canWrite || i === 0} onClick={() => move(item, -1)} className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30" aria-label="Move up"><ArrowUp className="h-3.5 w-3.5" /></button>
                      <button type="button" disabled={!canWrite || i === orderedRecords.length - 1} onClick={() => move(item, 1)} className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30" aria-label="Move down"><ArrowDown className="h-3.5 w-3.5" /></button>
                    </>
                  )}
                  <button type="button" disabled={!canWrite} onClick={() => startEdit(item)} className="rounded px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50">{translate('Edit')}</button>
                  <button type="button" disabled={!canWrite} onClick={() => remove(item)} className="rounded p-1 text-rose-600 hover:bg-rose-50 disabled:opacity-50" aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* ================================================================== */
/*  Insurance plans manager (custom editor, not part of RecordManager) */
/* ================================================================== */
function InsurancePlansEditor({ offerId, plans, onChange, canWrite, defaultCurrency }) {
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState('');

  const nextSortOrder = () =>
    plans.length ? Math.max(...plans.map((p) => Number(p.sort_order) || 0)) + 1 : 1;

  const startNew = () => {
    setError('');
    setDraft({
      __isNew: true,
      offer_id: offerId,
      plan_key: '',
      label: '',
      description: '',
      pricing_model: 'per_traveler',
      premium: '',
      currency: defaultCurrency || 'MAD',
      min_travelers: '',
      is_default: plans.length === 0,
      sort_order: nextSortOrder(),
      active: true,
    });
  };

  const startEdit = (plan) => {
    setError('');
    setDraft({ ...plan, __isNew: false });
  };

  const cancel = () => { setDraft(null); setError(''); };

  const validate = (d) => {
    if (!d.label?.trim()) return 'Label is required.';
    const key = (d.plan_key || slugifyPlanKey(d.label)).trim();
    if (!key) return 'Plan key is required.';
    if (!/^[a-z0-9_]{2,40}$/.test(key)) return 'Plan key must be 2–40 lowercase letters, digits or underscores.';
    if (!Number.isFinite(Number(d.premium)) || Number(d.premium) < 0) return 'Premium must be a non-negative number.';
    if (!/^[A-Z]{3}$/.test((d.currency || '').toUpperCase())) return 'Currency must be a 3-letter ISO code.';
    if (d.min_travelers !== '' && (!Number.isInteger(Number(d.min_travelers)) || Number(d.min_travelers) < 1)) {
      return 'Minimum travelers must be a positive integer or left blank.';
    }
    const clash = plans.find((p) =>
      p.id !== d.id && (p.plan_key || '').toLowerCase() === key.toLowerCase());
    if (clash) return `A plan with key "${key}" already exists.`;
    return '';
  };

  const stage = (e) => {
    e.preventDefault();
    const v = validate(draft);
    if (v) { setError(v); return; }
    const key = (draft.plan_key || slugifyPlanKey(draft.label)).trim();
    const payload = {
      offer_id: offerId,
      plan_key: key,
      label: draft.label.trim(),
      description: (draft.description || '').trim() || null,
      pricing_model: draft.pricing_model,
      premium: Number(draft.premium),
      currency: draft.currency.toUpperCase(),
      min_travelers: draft.min_travelers === '' ? null : Number(draft.min_travelers),
      is_default: Boolean(draft.is_default),
      sort_order: Number(draft.sort_order) || nextSortOrder(),
      active: draft.active !== false,
    };
    const updatedPlans = draft.__isNew
      ? [...plans, {
        ...payload,
        __draftId: globalThis.crypto?.randomUUID?.() || `tmp-${Date.now()}-${Math.random()}`,
      }]
      : plans.map((p) => (p.id === draft.id ? { ...payload, id: draft.id } : p));
    const defaultPlan = draft.__isNew
      ? updatedPlans[updatedPlans.length - 1]
      : updatedPlans.find((plan) => plan.id === draft.id);
    onChange(
      payload.is_default
        ? updatedPlans.map((plan) => ({
          ...plan,
          is_default: plan === defaultPlan,
        }))
        : updatedPlans,
    );
    setDraft(null);
    setError('');
  };

  const remove = (plan) => {
    if (!window.confirm(`Delete insurance plan "${plan.label}"?`)) return;
    onChange(plans.filter((p) => (p.id || p.__draftId) !== (plan.id || plan.__draftId)));
  };

  const setDefault = (plan) => {
    const targetId = plan.id || plan.__draftId;
    onChange(plans.map((p) => ({
      ...p,
      is_default: (p.id || p.__draftId) === targetId,
    })));
  };

  const toggleActive = (plan) => {
    const targetId = plan.id || plan.__draftId;
    onChange(plans.map((p) => ((p.id || p.__draftId) === targetId ? { ...p, active: !p.active } : p)));
  };

  // Ensure single default when plans are rendered — derived helper
  const defaultPlan = plans.find((p) => p.is_default);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900">
            <ShieldCheck className="h-4 w-4 text-amber-600" />{translate('Insurance plans')}</h3>
          <p className="text-xs text-slate-500">{translate('Plans defined here drive the insurance choice shown to travelers on the public booking page.')}</p>
        </div>
        <button
          type="button" disabled={!canWrite} onClick={startNew}
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />{translate('Add insurance plan')}</button>
      </div>

      {plans.length === 0 && !draft && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-xs text-slate-500">{translate('No insurance plans configured. Add one to enable insurance at booking. Leave empty to hide insurance entirely.')}</div>
      )}

      {error && (
        <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800">
          {error}
        </p>
      )}

      {draft && (
        <form onSubmit={stage} className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/40 p-3">
          <p className="text-xs font-semibold text-slate-800">
            {draft.__isNew ? 'New insurance plan' : 'Editing insurance plan'}
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-slate-700 sm:col-span-2">
              Plan name <span className="text-rose-500">{translate('*')}</span>
              <input
                value={draft.label}
                onChange={(e) => setDraft((c) => ({
                  ...c,
                  label: e.target.value,
                  plan_key: c.__isNew && !c.plan_key ? slugifyPlanKey(e.target.value) : c.plan_key,
                }))}
                placeholder="e.g. Individual coverage"
                className={inputClass}
              />
            </label>

            <label className="block text-xs font-medium text-slate-700">
              Plan key (unique)
              <input
                value={draft.plan_key}
                onChange={(e) => setDraft((c) => ({ ...c, plan_key: slugifyPlanKey(e.target.value) }))}
                placeholder="individual"
                className={`${inputClass} font-mono`}
              />
              <span className="mt-1 block text-[10px] text-slate-500">{translate('Used by the booking flow. Must be unique per package.')}</span>
            </label>

            <label className="block text-xs font-medium text-slate-700">
              Pricing model <span className="text-rose-500">{translate('*')}</span>
              <select
                value={draft.pricing_model}
                onChange={(e) => setDraft((c) => ({ ...c, pricing_model: e.target.value }))}
                className={inputClass}
              >
                <option value="per_traveler">{translate('Per traveler')}</option>
                <option value="flat">{translate('Flat for the group')}</option>
              </select>
            </label>

            <label className="block text-xs font-medium text-slate-700">
              Premium <span className="text-rose-500">{translate('*')}</span>
              <input
                type="number" min="0" step="0.01"
                value={draft.premium}
                onChange={(e) => setDraft((c) => ({ ...c, premium: e.target.value }))}
                placeholder="0.00"
                className={inputClass}
              />
            </label>

            <label className="block text-xs font-medium text-slate-700">
              Currency <span className="text-rose-500">{translate('*')}</span>
              <input
                maxLength={3}
                value={draft.currency}
                onChange={(e) => setDraft((c) => ({ ...c, currency: e.target.value.toUpperCase() }))}
                placeholder="MAD"
                className={`${inputClass} uppercase`}
              />
            </label>

            <label className="block text-xs font-medium text-slate-700">
              Minimum travelers (optional)
              <input
                type="number" min="1" step="1"
                value={draft.min_travelers}
                onChange={(e) => setDraft((c) => ({ ...c, min_travelers: e.target.value }))}
                placeholder="Leave blank for no minimum"
                className={inputClass}
              />
            </label>

            <label className="block text-xs font-medium text-slate-700">
              Display order
              <input
                type="number" min="0" step="1"
                value={draft.sort_order}
                onChange={(e) => setDraft((c) => ({ ...c, sort_order: e.target.value }))}
                className={inputClass}
              />
            </label>

            <label className="block text-xs font-medium text-slate-700 sm:col-span-2">
              Description shown to travelers
              <textarea
                rows={2}
                value={draft.description || ''}
                onChange={(e) => setDraft((c) => ({ ...c, description: e.target.value }))}
                placeholder="Brief coverage summary, e.g. Medical, cancellation and luggage."
                className={inputClass}
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-1">
            <label className="inline-flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={Boolean(draft.is_default)}
                onChange={(e) => setDraft((c) => ({ ...c, is_default: e.target.checked }))}
              />{translate('Preselect this plan on the booking page')}</label>
            <label className="inline-flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={draft.active !== false}
                onChange={(e) => setDraft((c) => ({ ...c, active: e.target.checked }))}
              />{translate('Active (visible to travelers)')}</label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={cancel} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600">{translate('Cancel')}</button>
            <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white">
              <Check className="h-3.5 w-3.5" /> {draft.__isNew ? 'Add plan' : 'Update plan'}
            </button>
          </div>
        </form>
      )}

      {plans.length > 0 && (
        <ul className="space-y-2">
          {[...plans]
            .sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0))
            .map((plan) => {
              const isDefault = Boolean(plan.is_default);
              const isActive = plan.active !== false;
              return (
                <li
                  key={plan.id || plan.__draftId}
                  className={`flex flex-wrap items-start justify-between gap-3 rounded-lg border p-3 ${
                    isActive ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50/70'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-900">
                      <ShieldCheck className={`h-4 w-4 ${isDefault ? 'text-emerald-600' : 'text-amber-600'}`} />
                      {plan.label}
                      {isDefault && (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-700 ring-1 ring-inset ring-emerald-200">{translate('Default')}</span>
                      )}
                      {!isActive && (
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600">{translate('Hidden')}</span>
                      )}
                      {plan.__draftId && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800">{translate('Unsaved')}</span>
                      )}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      <span className="font-mono text-slate-400">{plan.plan_key}</span>
                      {' · '}
                      {plan.pricing_model === 'flat'
                        ? `Flat ${Number(plan.premium).toLocaleString()} ${plan.currency} for the group`
                        : `${Number(plan.premium).toLocaleString()} ${plan.currency} per traveler`}
                      {plan.min_travelers ? ` · min ${plan.min_travelers} travelers` : ''}
                    </p>
                    {plan.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-slate-600">{plan.description}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    {!isDefault && isActive && (
                      <button
                        type="button"
                        disabled={!canWrite}
                        onClick={() => setDefault(plan)}
                        className="rounded px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                      >{translate('Make default')}</button>
                    )}
                    <button
                      type="button"
                      disabled={!canWrite}
                      onClick={() => toggleActive(plan)}
                      className="rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                    >
                      {isActive ? 'Hide' : 'Show'}
                    </button>
                    <button
                      type="button"
                      disabled={!canWrite}
                      onClick={() => startEdit(plan)}
                      className="rounded px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                    >{translate('Edit')}</button>
                    <button
                      type="button"
                      disabled={!canWrite}
                      onClick={() => remove(plan)}
                      className="rounded p-1 text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                      aria-label="Delete plan"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
        </ul>
      )}
    </section>
  );
}

/* ================================================================== */
/*  Validation                                                         */
/* ================================================================== */
function buildValidation({ overview, children, landing }) {
  const errors = [];
  const warnings = [];

  if (!overview.internal_title?.trim()) errors.push({ section: 'overview', message: 'Internal title is required.' });
  if (!overview.public_title?.trim()) errors.push({ section: 'overview', message: 'Public title is required.' });
  if (!overview.reference?.trim()) errors.push({ section: 'overview', message: 'Reference is required.' });
  if (!overview.destination_country?.trim()) errors.push({ section: 'overview', message: 'Destination country is required.' });
  if (!Number(overview.duration_days) || Number(overview.duration_days) < 1) errors.push({ section: 'overview', message: 'Duration in days must be at least 1.' });

  if (!landing?.slug?.trim()) errors.push({ section: 'landing', message: 'Public URL slug is required to publish.' });
  if (!landing?.hero_heading?.trim()) errors.push({ section: 'landing', message: 'Hero heading is required to publish.' });
  if (!overview.full_description?.trim() && !landing?.public_introduction?.trim()) {
    warnings.push({ section: 'landing', message: 'Add a public introduction or full description so the page has content.' });
  }

  const hasDestinations = (children.offer_destinations || []).length > 0;
  if (!hasDestinations) warnings.push({ section: 'destinations', message: 'No destinations configured.' });

  const hasPrice =
    Number(overview.starting_price) > 0 ||
    (children.offer_pricing_rules || []).some((r) => r.price_type === 'adult' && Number(r.amount) > 0) ||
    (children.offer_departures || []).some((d) => Number(d.selling_price_override) > 0);
  if (!hasPrice) errors.push({ section: 'pricing', message: 'At least one public selling price (starting price, adult rule or departure override) is required to publish.' });

  const badDepartures = (children.offer_departures || []).filter((d) =>
    d.max_capacity != null && d.reserved_capacity != null && Number(d.reserved_capacity) > Number(d.max_capacity));
  if (badDepartures.length) errors.push({ section: 'departures', message: `${badDepartures.length} departure(s) have reserved capacity above max capacity.` });

  // Insurance plan checks
  const insurancePlans = children.offer_insurance_plans || [];
  if (insurancePlans.length > 0) {
    const activePlans = insurancePlans.filter((p) => p.active !== false);
    if (activePlans.length === 0) {
      errors.push({ section: 'pricing', message: 'All insurance plans are hidden — either show at least one or remove them.' });
    }
    const defaults = insurancePlans.filter((p) => p.is_default);
    if (defaults.length > 1) {
      errors.push({ section: 'pricing', message: 'Only one insurance plan can be the default.' });
    }
    const badKeys = insurancePlans.filter((p) => !/^[a-z0-9_]{2,40}$/.test(p.plan_key || ''));
    if (badKeys.length) {
      errors.push({ section: 'pricing', message: `${badKeys.length} insurance plan(s) have an invalid key.` });
    }
  }

  return { errors, warnings, canPublish: errors.length === 0 };
}

/* ================================================================== */
/*  NextStep bar                                                       */
/* ================================================================== */
function NextStepBar({ activeTab, setActiveTab, canProceed = true, blockReason }) {
  const idx = TABS.findIndex((t) => t.key === activeTab);
  const next = TABS[idx + 1];
  const prev = TABS[idx - 1];

  return (
    <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
      <button
        type="button"
        disabled={!prev}
        onClick={() => prev && setActiveTab(prev.key)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {prev ? `Back: ${prev.label}` : 'Back'}
      </button>

      <p className="order-last w-full text-center text-[11px] text-slate-400 sm:order-none sm:w-auto">
        Step {idx + 1} of {TABS.length}
        {blockReason ? ` · ${blockReason}` : ''}
      </p>

      {next ? (
        <button
          type="button"
          disabled={!canProceed}
          onClick={() => canProceed && setActiveTab(next.key)}
          title={!canProceed ? blockReason : `Go to ${next.label}`}
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next: {next.label}
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      ) : (
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5" />{translate('Last step')}</span>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Main page                                                          */
/* ================================================================== */
export default function PackageDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    user,
    roles,
    rolePagePermissions,
    permissions,
    isSuperAdmin,
    loading: authLoading,
  } = useAuth();
  const canView = canUserAccessPath(roles, '/admin/packages', rolePagePermissions);
  const canUpdate = isSuperAdmin || permissions.includes('packages.update');

  const [activeTab, setActiveTab] = useState('overview');
  const [offer, setOffer]         = useState(null);
  const [overview, setOverview]   = useState(EMPTY_OVERVIEW);
  const [children, setChildren]   = useState({});
  const [landing, setLanding]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [notice, setNotice]       = useState('');
  const [dirty, setDirty]         = useState(false);
  const [draftOpen, setDraftOpen] = useState(false);

  const originalChildren = useRef({});
  const originalOverview = useRef(EMPTY_OVERVIEW);

  /* ---- Load ---- */
  const loadOffer = useCallback(async () => {
    if (authLoading) return;
    if (!user || !canView) {
      setLoading(false);
      setOffer(null);
      setError(!user
        ? 'Sign in with an authorized account to edit packages.'
        : 'Your account is missing the packages.view permission.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data: offerData, error: oErr } = await supabase.from('offers').select('*').eq('id', id).single();
      if (oErr) throw oErr;
      setOffer(offerData);

      const nextOverview = {
        ...EMPTY_OVERVIEW, ...offerData,
        gallery: Array.isArray(offerData.gallery) ? offerData.gallery : [],
        highlights: Array.isArray(offerData.highlights) ? offerData.highlights : [],
      };
      setOverview(nextOverview);
      originalOverview.current = { ...nextOverview };

      const results = await Promise.all(TABLES_TO_LOAD.map(([table, orderBy]) => {
        let q = supabase.from(table).select('*').eq('offer_id', id);
        if (orderBy) q = q.order(orderBy, { ascending: true });
        return q;
      }));
      const nextChildren = {};
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
      TABLES_TO_LOAD.forEach(([table], i) => { nextChildren[table] = results[i].data || []; });
      setChildren(nextChildren);
      originalChildren.current = Object.fromEntries(
        Object.entries(nextChildren).map(([t, rows]) => [t, rows.map((r) => ({ ...r }))]),
      );

      const { data: lp, error: lpErr } = await supabase
        .from('landing_page_configs').select('*').eq('offer_id', id).maybeSingle();
      if (lpErr) throw lpErr;
      setLanding(lp ? {
        ...lp,
        section_visibility: lp.section_visibility && typeof lp.section_visibility === 'object' ? lp.section_visibility : {},
        faqs: Array.isArray(lp.faqs) ? lp.faqs : [],
      } : {
        offer_id: id, slug: '', meta_title: '', meta_description: '', og_image_url: '',
        hero_heading: '', hero_subtitle: '', public_introduction: '',
        section_visibility: {}, faqs: [], terms_and_conditions: '', cancellation_policy: '',
        cta_label: '', cta_action_url: '',
      });
    } catch (err) {
      console.error('Load failed:', err);
      setError(`Could not load package: ${readableError(err)}`);
    } finally {
      setLoading(false);
    }
  }, [authLoading, canView, id, user]);

  useEffect(() => { loadOffer(); }, [loadOffer]);

  /* ---- Dirty tracking ---- */
  useEffect(() => {
    const overviewChanged = JSON.stringify(overview) !== JSON.stringify(originalOverview.current);
    const childrenChanged = Object.entries(children).some(([t, rows]) => {
      const orig = originalChildren.current[t] || [];
      return JSON.stringify(rows) !== JSON.stringify(orig);
    });
    setDirty(overviewChanged || childrenChanged);
  }, [overview, children]);

  const updateChildRecords = useCallback((table, records, sectionKey, fixedValues = {}) => {
    setChildren((cur) => {
      const curRows = cur[table] || [];
      let next = records;
      if (table === 'offer_transports') {
        const untouched = curRows.filter((r) => sectionKey === 'flights'
          ? r.transport_type !== 'flight'
          : r.transport_type === 'flight');
        next = [...untouched, ...records];
      } else if (table === 'offer_inclusions_exclusions') {
        const untouched = curRows.filter((r) => r.item_type !== fixedValues.item_type);
        next = [...untouched, ...records];
      }
      return { ...cur, [table]: next };
    });
  }, []);

  /* ---- Save ---- */
  const persistOverview = async (status = offer?.status, isPublic = offer?.is_public) => {
    if (!canUpdate) throw new Error('Missing packages.update permission.');
    const payload = {
      id,
      internal_title: overview.internal_title?.trim() || '',
      public_title: overview.public_title?.trim() || '',
      reference: overview.reference?.trim() || '',
      package_category: overview.package_category?.trim() || '',
      short_description: overview.short_description || null,
      full_description: overview.full_description || null,
      destination_country: overview.destination_country?.trim() || '',
      duration_days: overview.duration_days === '' ? null : Number(overview.duration_days),
      duration_nights: overview.duration_nights === '' ? null : Number(overview.duration_nights),
      cover_image_url: overview.cover_image_url || null,
      gallery: overview.gallery || [],
      highlights: overview.highlights || [],
      min_travelers: overview.min_travelers === '' ? null : Number(overview.min_travelers),
      max_travelers: overview.max_travelers === '' ? null : Number(overview.max_travelers),
      default_currency: (overview.default_currency || 'MAD').trim().toUpperCase(),
      starting_price: overview.starting_price === '' ? null : Number(overview.starting_price),
      price_display_mode: overview.price_display_mode || null,
      booking_deadline_days: overview.booking_deadline_days === '' ? null : Number(overview.booking_deadline_days),
      status,
      is_public: Boolean(isPublic),
      published_at: status === 'active'
        ? offer?.published_at || new Date().toISOString()
        : offer?.published_at || null,
    };
    const saved = await saveAdminOffer(payload);
    setOffer(saved);
    setOverview((c) => ({ ...c, ...saved }));
    originalOverview.current = { ...saved, gallery: saved.gallery || [], highlights: saved.highlights || [] };
    return saved;
  };

  const persistLanding = async (publish = false) => {
    if (!canUpdate) throw new Error('Missing packages.update permission.');
    const payload = {
      ...landing, offer_id: id,
      slug: landing.slug?.trim() || null,
      section_visibility: typeof landing.section_visibility === 'string'
        ? JSON.parse(landing.section_visibility || '{}') : landing.section_visibility,
      faqs: typeof landing.faqs === 'string' ? JSON.parse(landing.faqs || '[]') : landing.faqs,
      published_at: publish
        ? landing.published_at || new Date().toISOString()
        : landing.published_at || null,
    };
    const res = landing.id
      ? await supabase.from('landing_page_configs').update(payload).eq('id', landing.id).eq('offer_id', id).select().maybeSingle()
      : await supabase.from('landing_page_configs').insert(payload).select().single();
    const writeErr = getWriteError(res, 'Saving landing page');
    if (writeErr) throw writeErr;
    setLanding(res.data);
    return res.data;
  };

  const persistInsurancePlans = async () => {
    const desired = children.offer_insurance_plans || [];
    const original = originalChildren.current.offer_insurance_plans || [];
    const desiredIds = new Set(desired.filter((p) => p.id).map((p) => p.id));

    // Deletes
    for (const oldRow of original) {
      if (desiredIds.has(oldRow.id)) continue;
      const res = await supabase.from('offer_insurance_plans').delete().eq('id', oldRow.id).eq('offer_id', id).select('id').maybeSingle();
      const err = getWriteError(res, 'Delete insurance plan');
      if (err) throw err;
    }

    // Upserts
    const persisted = [];
    for (const plan of desired) {
      const payload = {
        offer_id: id,
        plan_key: plan.plan_key,
        label: plan.label,
        description: plan.description || null,
        pricing_model: plan.pricing_model,
        premium: Number(plan.premium) || 0,
        currency: (plan.currency || 'MAD').toUpperCase(),
        min_travelers: plan.min_travelers === '' || plan.min_travelers == null ? null : Number(plan.min_travelers),
        is_default: Boolean(plan.is_default),
        sort_order: Number(plan.sort_order) || 0,
        active: plan.active !== false,
        updated_at: new Date().toISOString(),
      };
      const res = plan.id
        ? await supabase.from('offer_insurance_plans').update(payload).eq('id', plan.id).eq('offer_id', id).select('id').single()
        : await supabase.from('offer_insurance_plans').insert(payload).select('id').single();
      const err = getWriteError(res, 'Save insurance plan');
      if (err) throw err;
      const { __draftId, ...rest } = plan;
      persisted.push({ ...rest, id: res.data.id });
    }

    setChildren((c) => ({ ...c, offer_insurance_plans: persisted }));
    originalChildren.current = {
      ...originalChildren.current,
      offer_insurance_plans: persisted.map((p) => ({ ...p })),
    };
  };

  const persistChildren = async () => {
    const summary = { savedTables: [], failedTable: null, message: '' };
    for (const [table] of TABLES_TO_LOAD) {
      // Skip the insurance plans table here — handled separately to keep
      // its custom editor logic out of the generic child persistence.
      if (table === 'offer_insurance_plans') continue;

      try {
        const desired = children[table] || [];
        const original = originalChildren.current[table] || [];
        const desiredIds = new Set(desired.filter((r) => r.id).map((r) => r.id));

        for (const oldRow of original) {
          if (desiredIds.has(oldRow.id)) continue;
          const res = await supabase.from(table).delete().eq('id', oldRow.id).eq('offer_id', id).select('id').maybeSingle();
          const err = getWriteError(res, `Delete in ${table}`);
          if (err) throw err;
        }

        for (let i = 0; i < desired.length; i += 1) {
          const record = desired[i];
          const section = Object.values(CHILD_SECTIONS).find((s) => s.table === table) || { fields: [], fixedValues: {} };
          const payload = getChildPayload(table, record, id, section);
          const res = record.id
            ? await supabase.from(table).update(payload).eq('id', record.id).eq('offer_id', id).select('id').single()
            : await supabase.from(table).insert(payload).select('id').single();
          const err = getWriteError(res, `Save in ${table}`);
          if (err) throw err;
          if (!record.id) {
            const { __draftId, ...rest } = record;
            const persisted = { ...rest, id: res.data.id };
            setChildren((c) => {
              const rows = [...(c[table] || [])];
              const idx = rows.findIndex((r) => r.__draftId === __draftId);
              if (idx >= 0) rows[idx] = persisted;
              return { ...c, [table]: rows };
            });
          }
        }

        originalChildren.current = {
          ...originalChildren.current,
          [table]: (children[table] || []).map((r) => ({ ...r })),
        };
        summary.savedTables.push(table);
      } catch (err) {
        summary.failedTable = table;
        summary.message = readableError(err);
        return summary;
      }
    }
    return summary;
  };

  const saveAll = async ({ status = offer?.status, isPublic = offer?.is_public, publish = false } = {}) => {
    if (!canUpdate) { setError('Missing packages.update permission.'); return; }
    if (draftOpen) { setError('Finish or cancel the open record form before saving.'); return; }
    setSaving(true); setError(''); setNotice('');
    try {
      await persistOverview(status, isPublic);

      const childResult = await persistChildren();
      if (childResult.failedTable) {
        setError(`Saved overview, but failed on ${childResult.failedTable}: ${childResult.message}. Fix and save again — already-saved sections are preserved.`);
        return;
      }

      try {
        await persistInsurancePlans();
      } catch (planErr) {
        setError(`Saved overview and services, but failed to save insurance plans: ${readableError(planErr)}. Fix and save again.`);
        return;
      }

      await persistLanding(publish || status === 'active');
      setDirty(false);

      const wasLive = offer?.status === 'active' && offer?.is_public;
      const noticeMsg =
        status === 'draft'
          ? 'Draft saved.'
          : publish && wasLive
            ? 'Changes saved and republished.'
            : publish
              ? 'Package published.'
              : 'Package saved.';
      setNotice(noticeMsg);
    } catch (err) {
      console.error('Save failed:', err);
      setError(`Could not save: ${readableError(err)}`);
    } finally {
      setSaving(false);
    }
  };

  const publish          = () => saveAll({ status: 'active',   isPublic: true,  publish: true });
  const unpublish        = () => saveAll({ status: 'inactive', isPublic: false });
  const saveAndRepublish = () => saveAll({ status: 'active',   isPublic: true,  publish: true });

  const archive = async () => {
    if (!canUpdate) return;
    if (!window.confirm('Archive this package? It will be hidden from the public site.')) return;
    try {
      const saved = await saveAdminOffer({
        id,
        status: 'archived',
        is_public: false,
        published_at: null,
      });
      setOffer(saved);
      setNotice('Package archived.');
    } catch (err) {
      setError(`Could not archive: ${readableError(err)}`);
    }
  };

  const duplicate = async () => {
    try {
      const ref = `PKG-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const copy = await saveAdminOffer({
        reference: ref,
        internal_title: `${offer.internal_title || offer.public_title} (copy)`,
        public_title: `${offer.public_title || offer.internal_title} (copy)`,
        package_category: offer.package_category,
        destination_country: offer.destination_country,
        duration_days: offer.duration_days,
        duration_nights: offer.duration_nights,
        short_description: offer.short_description,
        starting_price: offer.starting_price,
        default_currency: offer.default_currency,
        status: 'draft', is_public: false, created_by: user?.id || null,
      });

      // Copy insurance plans best-effort
      const currentPlans = children.offer_insurance_plans || [];
      if (currentPlans.length) {
        const cloned = currentPlans.map((p) => ({
          offer_id: copy.id,
          plan_key: p.plan_key,
          label: p.label,
          description: p.description || null,
          pricing_model: p.pricing_model,
          premium: Number(p.premium) || 0,
          currency: (p.currency || 'MAD').toUpperCase(),
          min_travelers: p.min_travelers ?? null,
          is_default: Boolean(p.is_default),
          sort_order: Number(p.sort_order) || 0,
          active: p.active !== false,
        }));
        const { error: cloneErr } = await supabase.from('offer_insurance_plans').insert(cloned);
        if (cloneErr) console.warn('Copied offer, but insurance plans could not be duplicated:', cloneErr);
      }

      navigate(`/admin/packages-services/${copy.id}`);
    } catch (err) {
      setError(`Could not duplicate: ${readableError(err)}`);
    }
  };

  /* ---- Derived ---- */
  const validation = useMemo(
    () => buildValidation({ overview, children, landing }),
    [overview, children, landing],
  );

  const sectionStatus = useMemo(() => ({
    overview: Boolean(overview.internal_title && overview.public_title && overview.reference && overview.destination_country && Number(overview.duration_days) > 0),
    destinations: (children.offer_destinations || []).length > 0,
    accommodations: (children.offer_accommodations || []).length > 0,
    flights: (children.offer_transports || []).some((t) => t.transport_type === 'flight'),
    ground: (children.offer_transports || []).some((t) => t.transport_type !== 'flight'),
    activities: (children.offer_activities || []).length > 0,
    itinerary: (children.offer_itinerary_days || []).length > 0,
    inclusions: ['inclusion', 'exclusion'].every((type) => (children.offer_inclusions_exclusions || []).some((i) => i.item_type === type)),
    pricing: ((children.offer_pricing_rules || []).length > 0 || (children.offer_costs || []).length > 0) &&
             (children.offer_insurance_plans || []).length >= 0,
    departures: (children.offer_departures || []).length > 0,
    landing: Boolean(landing?.slug && landing?.hero_heading),
    settings: Boolean(offer?.status),
  }), [overview, children, landing, offer]);

  const canProceedFrom = useCallback((tabKey) => {
    if (tabKey === 'overview') {
      return Boolean(
        overview.internal_title?.trim() &&
        overview.public_title?.trim() &&
        overview.reference?.trim() &&
        overview.destination_country?.trim() &&
        Number(overview.duration_days) >= 1
      );
    }
    return true;
  }, [overview]);

  const blockReasonFor = useCallback((tabKey) => {
    if (tabKey === 'overview' && !canProceedFrom('overview')) {
      return 'Fill in title, reference, destination and duration to continue.';
    }
    return '';
  }, [canProceedFrom]);

  /* ---- Render ---- */
  if (authLoading || loading) {
    return <main className="flex min-h-[50vh] items-center justify-center gap-3 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin text-amber-600" />{translate('Loading package…')}</main>;
  }
  if (!offer) {
    return (
      <main className="m-6 rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
        {error || 'Package not found.'}
        <button type="button" onClick={() => navigate('/admin/packages-services')} className="ml-3 font-semibold underline">{translate('Back to packages')}</button>
      </main>
    );
  }

  const isLive = offer.status === 'active' && offer.is_public;
  const activeTabMeta = TABS.find((t) => t.key === activeTab);
  const insurancePlans = children.offer_insurance_plans || [];

  return (
    <main className="min-h-full space-y-5 bg-slate-50/70 p-4 sm:p-6">
      {/* Header */}
      <header className="sticky top-0 z-20 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white/95 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <button type="button" onClick={() => navigate('/admin/packages-services')} aria-label="Back to packages" className="mt-0.5 rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"><ArrowLeft className="h-4 w-4" /></button>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-slate-900">{offer.public_title || offer.internal_title || 'Untitled package'}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-mono">{offer.reference}</span>
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600">{offer.status}</span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${isLive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                {isLive ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                {isLive ? 'Live' : 'Private'}
              </span>
              {dirty && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800">{translate('Unsaved changes')}</span>}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={saving || !canUpdate || !dirty} onClick={() => saveAll({ status: 'draft' })} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save Draft
          </button>
          <button type="button" onClick={() => window.open(`/packages/${id}?preview=true`, '_blank', 'noopener,noreferrer')} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"><Eye className="h-3.5 w-3.5" />{translate('Preview')}</button>
          <button type="button" onClick={duplicate} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"><Copy className="h-3.5 w-3.5" />{translate('Duplicate')}</button>
          <button type="button" disabled={!canUpdate} onClick={archive} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 disabled:opacity-50"><Archive className="h-3.5 w-3.5" />{translate('Archive')}</button>
          {isLive ? (
            <>
              <button
                type="button"
                disabled={saving || !canUpdate}
                onClick={unpublish}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"
              >{translate('Unpublish')}</button>
              <button
                type="button"
                disabled={saving || !canUpdate || !dirty || !validation.canPublish}
                onClick={saveAndRepublish}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                title={
                  !validation.canPublish
                    ? 'Resolve validation errors first'
                    : !dirty
                      ? 'No unsaved changes'
                      : 'Save current changes and keep the package live'
                }
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Save &amp; Republish
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={saving || !canUpdate || !validation.canPublish}
              onClick={publish}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />{translate('Publish')}</button>
          )}
        </div>
      </header>

      {error && <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
      {notice && <div role="status" className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 className="h-4 w-4" />{notice}</div>}

      <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* Sidebar */}
        <aside className="h-fit rounded-xl border border-slate-200 bg-white p-2">
          <nav className="space-y-0.5" aria-label="Package sections">
            {TABS.map((tab, i) => {
              const active = activeTab === tab.key;
              const done = sectionStatus[tab.key];
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium ${active ? 'bg-amber-50 text-amber-900' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="w-4 text-[10px] text-slate-400">{i + 1}.</span>
                    <span className="truncate">{tab.label}</span>
                  </span>
                  {done ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : <Circle className="h-4 w-4 shrink-0 text-slate-300" />}
                </button>
              );
            })}
          </nav>
          <div className="mt-3 border-t border-slate-100 px-2 pt-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{translate('Validation')}</p>
            {validation.errors.length === 0 && validation.warnings.length === 0 ? (
              <p className="mt-1 text-[11px] text-emerald-700">{translate('Ready to publish.')}</p>
            ) : (
              <ul className="mt-1 space-y-1 text-[11px]">
                {validation.errors.map((e, i) => (
                  <li key={`e${i}`} className="flex items-start gap-1 text-rose-700">
                    <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                    <button type="button" onClick={() => setActiveTab(e.section)} className="text-left underline-offset-2 hover:underline">{e.message}</button>
                  </li>
                ))}
                {validation.warnings.map((w, i) => (
                  <li key={`w${i}`} className="flex items-start gap-1 text-amber-700">
                    <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                    <button type="button" onClick={() => setActiveTab(w.section)} className="text-left underline-offset-2 hover:underline">{w.message}</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* Content */}
        <section className="min-w-0 space-y-6 rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
          {activeTabMeta && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{activeTabMeta.label}</h2>
              <p className="mt-1 text-xs text-slate-500">{activeTabMeta.desc}</p>
            </div>
          )}

          {activeTab === 'overview' && (
            <OverviewSection overview={overview} setOverview={setOverview} disabled={!canUpdate} />
          )}
          {activeTab === 'destinations' && (
            <RecordManager
              offerId={id} sectionKey="destinations" title="Destination"
              records={children.offer_destinations || []}
              onRecordsChange={(r, s, f) => updateChildRecords('offer_destinations', r, s, f)}
              onDraftChange={setDraftOpen} canWrite={canUpdate}
            />
          )}
          {activeTab === 'accommodations' && (
            <RecordManager
              offerId={id} sectionKey="accommodations" title="Accommodation"
              records={children.offer_accommodations || []}
              onRecordsChange={(r, s, f) => updateChildRecords('offer_accommodations', r, s, f)}
              onDraftChange={setDraftOpen} canWrite={canUpdate}
            />
          )}
          {activeTab === 'flights' && (
            <RecordManager
              offerId={id} sectionKey="flights" title="Flight"
              records={(children.offer_transports || []).filter((t) => t.transport_type === 'flight')}
              onRecordsChange={(r, s, f) => updateChildRecords('offer_transports', r, s, f)}
              onDraftChange={setDraftOpen} canWrite={canUpdate}
            />
          )}
          {activeTab === 'ground' && (
            <RecordManager
              offerId={id} sectionKey="ground" title="Ground Service"
              records={(children.offer_transports || []).filter((t) => t.transport_type !== 'flight')}
              onRecordsChange={(r, s, f) => updateChildRecords('offer_transports', r, s, f)}
              onDraftChange={setDraftOpen} canWrite={canUpdate}
            />
          )}
          {activeTab === 'activities' && (
            <RecordManager
              offerId={id} sectionKey="activities" title="Activity"
              records={children.offer_activities || []}
              onRecordsChange={(r, s, f) => updateChildRecords('offer_activities', r, s, f)}
              onDraftChange={setDraftOpen} canWrite={canUpdate}
            />
          )}
          {activeTab === 'itinerary' && (
            <RecordManager
              offerId={id} sectionKey="itinerary" title="Itinerary Day"
              records={children.offer_itinerary_days || []}
              onRecordsChange={(r, s, f) => updateChildRecords('offer_itinerary_days', r, s, f)}
              onDraftChange={setDraftOpen} canWrite={canUpdate}
            />
          )}
          {activeTab === 'inclusions' && (
            <div className="space-y-8">
              <RecordManager
                offerId={id} sectionKey="inclusions" title="Inclusion"
                records={(children.offer_inclusions_exclusions || []).filter((i) => i.item_type === 'inclusion')}
                fixedValues={{ item_type: 'inclusion' }}
                onRecordsChange={(r, s, f) => updateChildRecords('offer_inclusions_exclusions', r, s, f)}
                onDraftChange={setDraftOpen} canWrite={canUpdate}
              />
              <div className="border-t border-slate-200" />
              <RecordManager
                offerId={id} sectionKey="inclusions" title="Exclusion"
                records={(children.offer_inclusions_exclusions || []).filter((i) => i.item_type === 'exclusion')}
                fixedValues={{ item_type: 'exclusion' }}
                onRecordsChange={(r, s, f) => updateChildRecords('offer_inclusions_exclusions', r, s, f)}
                onDraftChange={setDraftOpen} canWrite={canUpdate}
              />
            </div>
          )}
          {activeTab === 'pricing' && (
            <PricingSection
              offerId={id}
              children={children}
              updateChildRecords={updateChildRecords}
              overview={overview}
              setDraftOpen={setDraftOpen}
              canWrite={canUpdate}
              insurancePlans={insurancePlans}
              onInsurancePlansChange={(plans) => setChildren((c) => ({ ...c, offer_insurance_plans: plans }))}
            />
          )}
          {activeTab === 'departures' && (
            <RecordManager
              offerId={id} sectionKey="departures" title="Departure"
              records={children.offer_departures || []}
              onRecordsChange={(r, s, f) => updateChildRecords('offer_departures', r, s, f)}
              onDraftChange={setDraftOpen} canWrite={canUpdate}
            />
          )}
          {activeTab === 'landing' && (
            <LandingSection landing={landing} setLanding={setLanding} disabled={!canUpdate} />
          )}
          {activeTab === 'settings' && (
            <SettingsSection
              offer={offer} landing={landing} canWrite={canUpdate}
              onArchive={archive} onSaveDraft={() => saveAll({ status: 'draft' })}
            />
          )}

          <NextStepBar
            activeTab={activeTab}
            setActiveTab={(key) => { setError(''); setActiveTab(key); }}
            canProceed={canProceedFrom(activeTab) && !draftOpen}
            blockReason={
              draftOpen
                ? 'Finish or cancel the open record form first.'
                : blockReasonFor(activeTab)
            }
          />
        </section>
      </div>
    </main>
  );
}

/* ================================================================== */
/*  Sections                                                           */
/* ================================================================== */
function OverviewSection({ overview, setOverview, disabled }) {
  const update = (k, v) => setOverview((c) => ({ ...c, [k]: v }));
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          ['internal_title', 'Internal title', 'text', true],
          ['public_title', 'Public title', 'text', true],
          ['reference', 'Reference', 'text', true],
          ['package_category', 'Category', 'text', true],
          ['destination_country', 'Main destination country', 'text', true],
          ['duration_days', 'Duration (days)', 'number', true],
          ['duration_nights', 'Duration (nights)', 'number', false],
          ['min_travelers', 'Minimum travelers', 'number', false],
          ['max_travelers', 'Maximum travelers', 'number', false],
          ['default_currency', 'Default currency', 'text', false],
          ['starting_price', 'Starting price', 'number', false],
          ['booking_deadline_days', 'Booking deadline (days)', 'number', false],
        ].map(([key, label, type, required]) => (
          <label key={key} className="block text-xs font-medium text-slate-700">
            {label}{required && <span className="text-rose-500">{translate('*')}</span>}
            <input
              type={type} min={type === 'number' ? 0 : undefined}
              maxLength={key === 'default_currency' ? 3 : undefined}
              value={overview[key] ?? ''} disabled={disabled}
              onChange={(e) => update(key, key === 'default_currency' ? e.target.value.toUpperCase() : e.target.value)}
              className={inputClass}
            />
          </label>
        ))}
        <label className="block text-xs font-medium text-slate-700">
          Price display mode
          <select value={overview.price_display_mode || 'starting_from'} disabled={disabled}
            onChange={(e) => update('price_display_mode', e.target.value)} className={inputClass}>
            <option value="starting_from">{translate('Starting from')}</option>
            <option value="exact">{translate('Exact price')}</option>
            <option value="on_request">{translate('On request')}</option>
          </select>
        </label>
        <label className="block text-xs font-medium text-slate-700 sm:col-span-2">
          Cover image URL
          <input value={overview.cover_image_url || ''} disabled={disabled}
            onChange={(e) => update('cover_image_url', e.target.value)} className={inputClass} />
        </label>
        <label className="block text-xs font-medium text-slate-700 sm:col-span-2">
          Short description
          <textarea rows={2} value={overview.short_description || ''} disabled={disabled}
            onChange={(e) => update('short_description', e.target.value)} className={inputClass} />
        </label>
        <label className="block text-xs font-medium text-slate-700 sm:col-span-2">
          Full public description
          <textarea rows={5} value={overview.full_description || ''} disabled={disabled}
            onChange={(e) => update('full_description', e.target.value)} className={inputClass} />
        </label>
        <label className="block text-xs font-medium text-slate-700">
          Gallery image URLs (one per line)
          <textarea rows={4} value={(overview.gallery || []).join('\n')} disabled={disabled}
            onChange={(e) => update('gallery', e.target.value.split('\n').map((v) => v.trim()).filter(Boolean))}
            className={inputClass} />
        </label>
        <label className="block text-xs font-medium text-slate-700">
          Highlights (one per line)
          <textarea rows={4} value={(overview.highlights || []).join('\n')} disabled={disabled}
            onChange={(e) => update('highlights', e.target.value.split('\n').map((v) => v.trim()).filter(Boolean))}
            className={inputClass} />
        </label>
      </div>
    </div>
  );
}

function PricingSection({
  offerId, children, updateChildRecords, overview, setDraftOpen, canWrite,
  insurancePlans, onInsurancePlansChange,
}) {
  const costs = children.offer_costs || [];
  const rules = children.offer_pricing_rules || [];
  const currency = overview.default_currency || 'MAD';
  const adultRule = rules.find((r) => r.price_type === 'adult' && Number(r.amount) > 0);
  const selling = Number(overview.starting_price) || Number(adultRule?.amount) || 0;
  const totalCost = costs
    .filter((c) => (c.currency || '').toUpperCase() === currency.toUpperCase())
    .reduce((sum, c) => sum + Number(c.amount || 0), 0);
  const margin = selling > 0 ? ((selling - totalCost) / selling) * 100 : 0;
  const mixedCurrency = costs.some((c) => (c.currency || '').toUpperCase() !== currency.toUpperCase());

  return (
    <div className="space-y-10">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">{translate('Selling price')}</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{selling ? `${selling.toLocaleString()} ${currency}` : '—'}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-[10px] uppercase tracking-wide text-slate-500">{translate('Total cost')}</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{totalCost.toLocaleString()} {currency}</p>
        </div>
        <div className={`rounded-lg border p-3 ${margin >= 0 ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
          <p className="text-[10px] uppercase tracking-wide text-slate-500">{translate('Gross margin')}</p>
          <p className={`mt-1 text-lg font-bold ${margin >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{margin.toFixed(1)}%</p>
        </div>
      </div>
      {mixedCurrency && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">{translate('Some cost lines use a different currency than the package default. Totals ignore cross-currency lines — convert them or set the package default to match.')}</p>
      )}

      <RecordManager
        offerId={offerId} sectionKey="pricingRules" title="Pricing Rule"
        records={rules}
        onRecordsChange={(r, s, f) => updateChildRecords('offer_pricing_rules', r, s, f)}
        onDraftChange={setDraftOpen} canWrite={canWrite}
      />

      <div className="border-t border-slate-200" />

      <RecordManager
        offerId={offerId} sectionKey="costs" title="Cost Line"
        records={costs}
        onRecordsChange={(r, s, f) => updateChildRecords('offer_costs', r, s, f)}
        onDraftChange={setDraftOpen} canWrite={canWrite}
      />

      <div className="border-t border-slate-200" />

      {/* Insurance plans per package */}
      <InsurancePlansEditor
        offerId={offerId}
        plans={insurancePlans}
        onChange={onInsurancePlansChange}
        canWrite={canWrite}
        defaultCurrency={currency}
      />
    </div>
  );
}

function LandingSection({ landing, setLanding, disabled }) {
  const update = (k, v) => setLanding((c) => ({ ...c, [k]: v }));
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          ['slug', 'URL slug'], ['meta_title', 'SEO title'], ['og_image_url', 'Open Graph image URL'],
          ['hero_heading', 'Hero heading'], ['hero_subtitle', 'Hero subtitle'],
          ['cta_label', 'CTA label'], ['cta_action_url', 'CTA URL'],
        ].map(([k, label]) => (
          <label key={k} className="block text-xs font-medium text-slate-700">
            {label}
            <input value={landing?.[k] || ''} disabled={disabled}
              onChange={(e) => update(k, e.target.value)} className={inputClass} />
          </label>
        ))}
        <label className="block text-xs font-medium text-slate-700 sm:col-span-2">
          Meta description
          <textarea rows={2} value={landing?.meta_description || ''} disabled={disabled}
            onChange={(e) => update('meta_description', e.target.value)} className={inputClass} />
        </label>
        <label className="block text-xs font-medium text-slate-700 sm:col-span-2">
          Public introduction
          <textarea rows={4} value={landing?.public_introduction || ''} disabled={disabled}
            onChange={(e) => update('public_introduction', e.target.value)} className={inputClass} />
        </label>
      </div>

      <fieldset className="rounded-lg border border-slate-200 p-3">
        <legend className="px-1 text-xs font-medium text-slate-700">{translate('Public package content')}</legend>
        <p className="mb-3 text-[11px] leading-relaxed text-slate-500">{translate('Checked sections are shown on the public package page. Uncheck a section to keep it private. The package title and published status are managed separately.')}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {PUBLIC_SECTION_OPTIONS.map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-50">
              <input type="checkbox" disabled={disabled}
                checked={landing?.section_visibility?.[key] !== false}
                onChange={(e) => update('section_visibility', { ...(landing.section_visibility || {}), [key]: e.target.checked })} />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-medium text-slate-700">{translate('FAQs')}</h3>
          <button type="button" disabled={disabled}
            onClick={() => update('faqs', [...(landing.faqs || []), { question: '', answer: '' }])}
            className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
            <Plus className="h-3.5 w-3.5" />{translate('Add FAQ')}</button>
        </div>
        {(landing.faqs || []).map((faq, i) => (
          <div key={i} className="grid gap-2 rounded-lg border border-slate-200 p-2 sm:grid-cols-2">
            <input value={faq.question || ''} disabled={disabled}
              onChange={(e) => {
                const faqs = [...landing.faqs];
                faqs[i] = { ...faqs[i], question: e.target.value };
                update('faqs', faqs);
              }}
              placeholder="Question" className={inputClass} />
            <textarea rows={2} value={faq.answer || ''} disabled={disabled}
              onChange={(e) => {
                const faqs = [...landing.faqs];
                faqs[i] = { ...faqs[i], answer: e.target.value };
                update('faqs', faqs);
              }}
              placeholder="Answer" className={inputClass} />
            <button type="button" disabled={disabled}
              onClick={() => update('faqs', landing.faqs.filter((_, idx) => idx !== i))}
              className="text-left text-xs font-medium text-rose-600">{translate('Remove')}</button>
          </div>
        ))}
      </section>

      <label className="block text-xs font-medium text-slate-700">Terms & conditions
        <textarea rows={3} value={landing?.terms_and_conditions || ''} disabled={disabled}
          onChange={(e) => update('terms_and_conditions', e.target.value)} className={inputClass} />
      </label>
      <label className="block text-xs font-medium text-slate-700">Cancellation policy
        <textarea rows={3} value={landing?.cancellation_policy || ''} disabled={disabled}
          onChange={(e) => update('cancellation_policy', e.target.value)} className={inputClass} />
      </label>
    </div>
  );
}

function SettingsSection({ offer, landing, canWrite, onArchive, onSaveDraft }) {
  return (
    <div className="space-y-5">
      <dl className="grid gap-3 text-xs sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 p-3">
          <dt className="text-slate-500">{translate('Status')}</dt>
          <dd className="mt-0.5 font-semibold capitalize text-slate-800">{offer.status}</dd>
        </div>
        <div className="rounded-lg border border-slate-200 p-3">
          <dt className="text-slate-500">{translate('Public visibility')}</dt>
          <dd className="mt-0.5 font-semibold text-slate-800">{offer.is_public ? 'Public' : 'Private'}</dd>
        </div>
        <div className="rounded-lg border border-slate-200 p-3">
          <dt className="text-slate-500">{translate('Slug')}</dt>
          <dd className="mt-0.5 font-mono text-slate-800">{landing?.slug || '—'}</dd>
        </div>
        <div className="rounded-lg border border-slate-200 p-3">
          <dt className="text-slate-500">{translate('Last updated')}</dt>
          <dd className="mt-0.5 text-slate-800">{offer.updated_at ? new Date(offer.updated_at).toLocaleString() : '—'}</dd>
        </div>
      </dl>
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        Internal notes are not part of the <code>{translate('offers')}</code> schema you have today. To store them, add an
        <code>{translate('internal_notes')}</code> text column to <code>{translate('offers')}</code>{translate('or a separate private table with RLS restricted to admins. Until then this editor won\'t mix private notes into public descriptions.')}</div>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={!canWrite} onClick={onSaveDraft}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">{translate('Save as draft')}</button>
        <button type="button" disabled={!canWrite} onClick={onArchive}
          className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 disabled:opacity-50">{translate('Archive package')}</button>
      </div>
    </div>
  );
}