import { useAppSettings, translate } from '@/context/index.jsx';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { suppliersApi } from '../page.jsx';

/* ------------------------------------------------------------------ */
/*  Icons (single component, path lookup)                              */
/* ------------------------------------------------------------------ */
const PATHS = {
  arrowLeft: <path d="M19 12H5M12 19l-7-7 7-7" />,
  check: <path d="m5 13 4 4L19 7" />,
  x: <path d="M18 6 6 18M6 6l12 12" />,
  building: <><path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" /><path d="M16 8h2a2 2 0 0 1 2 2v11" /><path d="M2 21h20M8 7h2M8 11h2M8 15h2" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
  phone: <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.7.6 2.5a2 2 0 0 1-.4 2.1L8 9.5a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.4c.8.3 1.6.5 2.5.6a2 2 0 0 1 1.7 2Z" />,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>,
  pin: <><path d="M12 21s-7-5.5-7-11a7 7 0 1 1 14 0c0 5.5-7 11-7 11Z" /><circle cx="12" cy="10" r="2.5" /></>,
  layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /></>,
  refresh: <><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></>,
  alert: <><path d="M12 3 2 21h20L12 3Z" /><path d="M12 10v5M12 18h.01" /></>,
  star: <path d="m12 3 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.9l1.1-6.5L2.6 9.8l6.5-.9L12 3Z" />,
  save: <><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" /><path d="M17 21v-8H7v8M7 3v5h8" /></>,
  id: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7 15v-4M11 15v-2M15 15v-3M19 15v-1" /></>,
  bed: <><path d="M3 18V6M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5" /><circle cx="7" cy="11" r="1.5" /></>,
  fork: <path d="M7 3v8a2 2 0 0 0 2 2v8M5 3v6M9 3v6M17 21V3c-2 1-3 4-3 8h3" />,
  plane: <path d="m2 16 20-6-3-3-6 2-6-5-2 1 4 6-4 2-3-2-1 1 3 4Z" />,
  car: <><path d="M5 16V11l2-5h10l2 5v5M3 16h18v3H3z" /><circle cx="7.5" cy="16" r="1" /><circle cx="16.5" cy="16" r="1" /></>,
  bus: <><rect x="4" y="4" width="16" height="13" rx="2" /><path d="M4 11h16M7 20v-3M17 20v-3" /></>,
  compass: <><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" /></>,
  flag: <path d="M5 21V4M5 4h11l-2 4 2 4H5" />,
};

const Icon = ({ name, className = 'h-4 w-4', ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" {...props}>
    {PATHS[name]}
  </svg>
);

/* ------------------------------------------------------------------ */
/*  Definitions                                                        */
/* ------------------------------------------------------------------ */
const CATEGORY_OPTIONS = [
  { value: 'hotel', label: 'Hotel', group: 'Accommodation', icon: 'building' },
  { value: 'riad', label: 'Riad', group: 'Accommodation', icon: 'bed' },
  { value: 'resort', label: 'Resort', group: 'Accommodation', icon: 'star' },
  { value: 'restaurant', label: 'Restaurant', group: 'Food & Beverage', icon: 'fork' },
  { value: 'airline', label: 'Airline', group: 'Transport', icon: 'plane' },
  { value: 'car_rental', label: 'Car Rental', group: 'Transport', icon: 'car' },
  { value: 'transport_company', label: 'Transport Company', group: 'Transport', icon: 'bus' },
  { value: 'local_guide', label: 'Local Guide', group: 'Services', icon: 'flag' },
  { value: 'activity_provider', label: 'Activity Provider', group: 'Services', icon: 'compass' },
];
const GROUPS = [...new Set(CATEGORY_OPTIONS.map((c) => c.group))];

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', dot: 'bg-amber-500', active: 'border-amber-500 bg-amber-50 text-amber-800' },
  { value: 'active', label: 'Active', dot: 'bg-emerald-500', active: 'border-emerald-500 bg-emerald-50 text-emerald-800' },
  { value: 'inactive', label: 'Inactive', dot: 'bg-slate-400', active: 'border-slate-400 bg-slate-100 text-slate-700' },
  { value: 'blacklisted', label: 'Blacklisted', dot: 'bg-red-500', active: 'border-red-500 bg-red-50 text-red-800' },
];

const CATEGORY_FIELDS = {
  hotel: [
    { key: 'star_rating', label: 'Star rating', type: 'number', min: 1, max: 5, placeholder: '1–5' },
    { key: 'number_of_rooms', label: 'Number of rooms', type: 'number', min: 0 },
    { key: 'check_in_time', label: 'Check-in time', type: 'time' },
    { key: 'check_out_time', label: 'Check-out time', type: 'time' },
    { key: 'amenities', label: 'Amenities', type: 'textarea', placeholder: 'Pool, Spa, WiFi...' },
  ],
  riad: [
    { key: 'number_of_rooms', label: 'Number of rooms', type: 'number', min: 0 },
    { key: 'check_in_time', label: 'Check-in time', type: 'time' },
    { key: 'check_out_time', label: 'Check-out time', type: 'time' },
    { key: 'amenities', label: 'Amenities', type: 'textarea' },
  ],
  resort: [
    { key: 'star_rating', label: 'Star rating', type: 'number', min: 1, max: 5 },
    { key: 'number_of_rooms', label: 'Number of rooms', type: 'number', min: 0 },
    { key: 'amenities', label: 'Amenities', type: 'textarea' },
  ],
  restaurant: [
    { key: 'cuisine_type', label: 'Cuisine type', type: 'text', placeholder: 'Moroccan, Italian...' },
    { key: 'seating_capacity', label: 'Seating capacity', type: 'number', min: 0 },
    { key: 'opening_hours', label: 'Opening hours', type: 'text', placeholder: '12:00 – 23:00' },
  ],
  airline: [
    { key: 'iata_code', label: 'IATA code', type: 'text', placeholder: 'AT' },
    { key: 'icao_code', label: 'ICAO code', type: 'text', placeholder: 'RAM' },
    { key: 'fleet_size', label: 'Fleet size', type: 'number', min: 0 },
  ],
  car_rental: [
    { key: 'fleet_size', label: 'Fleet size', type: 'number', min: 0 },
    { key: 'rental_types', label: 'Rental types', type: 'text', placeholder: 'Economy, SUV, Luxury' },
    { key: 'insurance_included', label: 'Insurance included', type: 'checkbox' },
  ],
  transport_company: [
    { key: 'vehicle_types', label: 'Vehicle types', type: 'text', placeholder: 'Bus, Minivan, Coach' },
    { key: 'fleet_size', label: 'Fleet size', type: 'number', min: 0 },
    { key: 'coverage_area', label: 'Coverage area', type: 'text' },
  ],
  local_guide: [
    { key: 'languages', label: 'Languages', type: 'text', placeholder: 'English, French, Arabic' },
    { key: 'specialties', label: 'Specialties', type: 'text', placeholder: 'History, Food tours' },
    { key: 'license_number', label: 'License number', type: 'text' },
  ],
  activity_provider: [
    { key: 'activity_types', label: 'Activity types', type: 'text', placeholder: 'Desert tours, Hiking' },
    { key: 'min_group_size', label: 'Min group size', type: 'number', min: 0 },
    { key: 'max_group_size', label: 'Max group size', type: 'number', min: 0 },
    { key: 'duration', label: 'Typical duration', type: 'text', placeholder: 'e.g. 3 hours' },
  ],
};

/* ------------------------------------------------------------------ */
/*  Field primitives                                                   */
/* ------------------------------------------------------------------ */
const inputCls = (hasError) =>
  `w-full rounded-lg border bg-white py-2.5 px-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:outline-none focus:ring-4 ${
    hasError
      ? 'border-red-300 focus:border-red-500 focus:ring-red-500/15'
      : 'border-slate-200 hover:border-slate-300 focus:border-amber-500 focus:ring-amber-500/15'
  }`;

function Field({ label, htmlFor, required, error, hint, children, className = '' }) {
  return (
    <div id={`field-${htmlFor}`} className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 flex items-center gap-1 text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500">{translate('*')}</span>}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-600">
          <Icon name="alert" className="h-3 w-3" />{error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

function TextInput({ id, value, onChange, error, icon, type = 'text', ...rest }) {
  return (
    <div className="relative">
      {icon && (
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
          <Icon name={icon} />
        </span>
      )}
      <input
        id={id}
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        className={inputCls(Boolean(error)) + (icon ? ' pl-9' : '')}
        {...rest}
      />
    </div>
  );
}

function TextArea({ id, value, onChange, rows = 3, ...rest }) {
  return (
    <textarea id={id} rows={rows} value={value ?? ''} onChange={(e) => onChange(e.target.value)}
      className={inputCls(false) + ' resize-y'} {...rest} />
  );
}

/* ------------------------------------------------------------------ */
/*  Section card                                                       */
/* ------------------------------------------------------------------ */
function Section({ icon, title, description, children, right }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 text-amber-600 ring-1 ring-inset ring-amber-200">
            <Icon name={icon} className="h-[18px] w-[18px]" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
            {description && <p className="text-xs text-slate-500">{description}</p>}
          </div>
        </div>
        {right}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Toast                                                              */
/* ------------------------------------------------------------------ */
function Toast({ toast, onClose }) {
  if (!toast) return null;
  const success = toast.tone === 'success';
  return (
    <div
      role="status"
      className={`fixed right-4 top-4 z-[60] flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm font-medium shadow-xl ring-1 ring-inset ${
        success ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-red-50 text-red-800 ring-red-200'
      }`}
    >
      <Icon name={success ? 'check' : 'alert'} className="mt-0.5 h-4 w-4" />
      <span className="pr-2">{toast.message}</span>
      <button type="button" onClick={onClose} className="rounded p-0.5 hover:bg-black/5" aria-label="Dismiss">
        <Icon name="x" className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Live preview + completeness                                        */
/* ------------------------------------------------------------------ */
function PreviewCard({ form, category, status, progress }) {
  const initial = form.name.trim().charAt(0).toUpperCase();
  const rows = [
    ['mail', form.email],
    ['phone', form.phone],
    ['globe', form.website],
    ['pin', [form.city, form.country].filter(Boolean).join(', ')],
  ].filter(([, v]) => v);

  return (
    <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="h-16 bg-gradient-to-r from-amber-500 to-amber-400" />
      <div className="px-5 pb-5">
        <div className="-mt-7 grid h-14 w-14 place-items-center rounded-2xl bg-white text-xl font-bold text-amber-600 shadow-md ring-4 ring-white">
          {initial || <Icon name={category?.icon || 'building'} className="h-6 w-6 text-slate-300" />}
        </div>
        <h3 className={`mt-3 truncate text-base font-semibold ${form.name ? 'text-slate-900' : 'text-slate-400'}`}>
          {form.name || 'Supplier name'}
        </h3>
        <p className="mt-0.5 text-xs text-slate-500">
          {category ? category.label : 'No category yet'}
          {form.supplier_code ? ` · ${form.supplier_code}` : ''}
        </p>

        <span className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${status.active}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>

        {rows.length > 0 && (
          <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4">
            {rows.map(([icon, v]) => (
              <li key={icon} className="flex items-center gap-2 text-sm text-slate-600">
                <Icon name={icon} className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="truncate">{v}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 border-t border-slate-100 pt-4">
          <div className="mb-1.5 flex justify-between text-xs">
            <span className="font-medium text-slate-700">{translate('Profile completeness')}</span>
            <span className="tabular-nums text-slate-500">{progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-amber-500 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
const INITIAL = {
  name: '', supplier_code: '', supplier_type: '', status: 'pending',
  email: '', phone: '', website: '', address: '', city: '', country: 'Morocco', notes: '',
};

export default function NewSupplierPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL);
  const [categoryDetails, setCategoryDetails] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const categoryFields = useMemo(
    () => (form.supplier_type ? CATEGORY_FIELDS[form.supplier_type] || [] : []),
    [form.supplier_type],
  );
  const category = CATEGORY_OPTIONS.find((c) => c.value === form.supplier_type);
  const status = STATUS_OPTIONS.find((s) => s.value === form.status) || STATUS_OPTIONS[0];

  const progress = useMemo(() => {
    const keys = ['name', 'supplier_type', 'email', 'phone', 'website', 'address', 'city', 'notes'];
    return Math.round((keys.filter((k) => String(form[k]).trim()).length / keys.length) * 100);
  }, [form]);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      if (!e[key]) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
  }

  function updateDetail(key, value) {
    setCategoryDetails((d) => ({ ...d, [key]: value }));
  }

  function selectCategory(value) {
    if (value !== form.supplier_type) setCategoryDetails({});
    update('supplier_type', value);
  }

  function validate() {
    const next = {};
    if (!form.name.trim()) next.name = 'Supplier name is required.';
    if (!form.supplier_type) next.supplier_type = 'Please choose a category.';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Enter a valid email address.';
    if (form.website && !/^https?:\/\/.+/.test(form.website)) next.website = 'Website must start with http:// or https://';
    setErrors(next);
    return next;
  }

  function generateCode() {
    update('supplier_code', `SUP-${Math.floor(100000 + Math.random() * 900000)}`);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving) return;
    const found = validate();
    if (Object.keys(found).length) {
      setToast({ tone: 'error', message: 'Please fix the highlighted fields.' });
      document.getElementById(`field-${Object.keys(found)[0]}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setSaving(true);
    try {
      const cleanDetails = Object.fromEntries(
        Object.entries(categoryDetails).filter(([, v]) => v !== '' && v !== undefined && v !== null),
      );
      const payload = {
        ...form,
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        city: form.city.trim() || null,
        address: form.address.trim() || null,
        country: form.country.trim() || null,
        website: form.website.trim() || null,
        notes: form.notes.trim() || null,
        supplier_code: form.supplier_code.trim() || undefined,
        categoryData: Object.keys(cleanDetails).length ? cleanDetails : null,
      };

      const created = await suppliersApi.createSupplier(payload);
      setToast({ tone: 'success', message: `Supplier "${created.name}" created.` });
      setTimeout(() => navigate(`/admin/suppliers/${created.id}`), 500);
    } catch (err) {
      setToast({ tone: 'error', message: err && typeof err.message === 'string' ? err.message : 'Unable to create supplier.' });
    } finally {
      setSaving(false);
    }
  }

  const submitBtn = (
    <button
      type="submit"
      form="supplier-form"
      disabled={saving}
      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm ring-1 ring-inset ring-amber-600/20 transition hover:bg-amber-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-500/30 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Icon name={saving ? 'refresh' : 'save'} className={`h-4 w-4 ${saving ? 'animate-spin' : ''}`} />
      {saving ? 'Saving…' : 'Create supplier'}
    </button>
  );

  const cancelBtn = (
    <Link
      to="/admin/suppliers"
      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
    >{translate('Cancel')}</Link>
  );

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-4 pb-28 sm:p-6 sm:pb-28">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Header */}
      <header className="flex items-start gap-3">
        <Link
          to="/admin/suppliers"
          className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
          aria-label="Back to suppliers"
        >
          <Icon name="arrowLeft" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{translate('New supplier')}</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Add a vendor manually. Fields marked <span className="text-red-500">{translate('*')}</span>{translate('are required.')}</p>
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <form id="supplier-form" onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* Basic info */}
          <Section icon="building" title="Basic information" description="General supplier identity and status.">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field htmlFor="name" label="Supplier name" required error={errors.name} className="sm:col-span-2">
                <TextInput id="name" value={form.name} onChange={(v) => update('name', v)} error={errors.name}
                  icon="building" placeholder="Riad Al-Andalus" autoFocus />
              </Field>

              <Field htmlFor="supplier_code" label="Supplier code" hint="Auto-generated if left blank.">
                <div className="flex gap-2">
                  <TextInput id="supplier_code" value={form.supplier_code} onChange={(v) => update('supplier_code', v)}
                    icon="id" placeholder="SUP-100123" />
                  <button
                    type="button"
                    onClick={generateCode}
                    className="inline-flex shrink-0 items-center rounded-lg border border-slate-200 bg-white px-3 text-slate-600 shadow-sm transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
                    title="Generate code"
                    aria-label="Generate code"
                  >
                    <Icon name="refresh" />
                  </button>
                </div>
              </Field>

              <Field htmlFor="status" label="Status">
                <div id="status" role="radiogroup" aria-label="Status" className="grid grid-cols-2 gap-2">
                  {STATUS_OPTIONS.map((s) => {
                    const on = form.status === s.value;
                    return (
                      <button
                        key={s.value}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => update('status', s.value)}
                        className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-500/20 ${
                          on ? s.active : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </Field>

              <Field htmlFor="notes" label="Internal notes" className="sm:col-span-2">
                <TextArea id="notes" value={form.notes} onChange={(v) => update('notes', v)}
                  placeholder="Preferred partner, payment terms, special arrangements..." />
              </Field>
            </div>
          </Section>

          {/* Category picker */}
          <Section icon="layers" title="Category" description="What kind of supplier is this?"
            right={errors.supplier_type && (
              <span className="flex items-center gap-1 text-xs font-medium text-red-600">
                <Icon name="alert" className="h-3 w-3" />{errors.supplier_type}
              </span>
            )}>
            <div id="field-supplier_type" role="radiogroup" aria-label="Category" className="space-y-4">
              {GROUPS.map((g) => (
                <div key={g}>
                  <p className="mb-2 text-xs font-medium text-slate-500">{g}</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {CATEGORY_OPTIONS.filter((c) => c.group === g).map((c) => {
                      const on = form.supplier_type === c.value;
                      return (
                        <button
                          key={c.value}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          onClick={() => selectCategory(c.value)}
                          className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-500/20 ${
                            on
                              ? 'border-amber-500 bg-amber-50 text-amber-900 ring-1 ring-amber-500'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-amber-300 hover:bg-amber-50/40'
                          }`}
                        >
                          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${on ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                            <Icon name={c.icon} />
                          </span>
                          <span className="leading-tight">{c.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Contact */}
          <Section icon="user" title="Contact information" description="How to reach this supplier.">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field htmlFor="email" label="Email" error={errors.email}>
                <TextInput id="email" type="email" value={form.email} onChange={(v) => update('email', v)}
                  error={errors.email} icon="mail" placeholder="contact@supplier.com" autoComplete="email" />
              </Field>
              <Field htmlFor="phone" label="Phone">
                <TextInput id="phone" type="tel" value={form.phone} onChange={(v) => update('phone', v)}
                  icon="phone" placeholder="+212 6 00 00 00 00" autoComplete="tel" />
              </Field>
              <Field htmlFor="website" label="Website" error={errors.website} className="sm:col-span-2">
                <TextInput id="website" type="url" value={form.website} onChange={(v) => update('website', v)}
                  error={errors.website} icon="globe" placeholder="https://supplier.com" />
              </Field>
            </div>
          </Section>

          {/* Location */}
          <Section icon="pin" title="Location" description="Where the supplier operates from.">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field htmlFor="address" label="Address" className="sm:col-span-2">
                <TextInput id="address" value={form.address} onChange={(v) => update('address', v)}
                  icon="pin" placeholder="12 Rue de la Médina" />
              </Field>
              <Field htmlFor="city" label="City">
                <TextInput id="city" value={form.city} onChange={(v) => update('city', v)} placeholder="Marrakech" />
              </Field>
              <Field htmlFor="country" label="Country">
                <TextInput id="country" value={form.country} onChange={(v) => update('country', v)} placeholder="Morocco" />
              </Field>
            </div>
          </Section>

          {/* Category-specific details */}
          {categoryFields.length > 0 && (
            <Section
              icon={category?.icon || 'star'}
              title={`${category?.label} details`}
              description="Optional details specific to this category."
              right={
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                  {categoryFields.length} field{categoryFields.length === 1 ? '' : 's'}
                </span>
              }
            >
              <div className="grid gap-5 sm:grid-cols-2">
                {categoryFields.map((f) => (
                  <Field key={f.key} htmlFor={f.key} label={f.label} className={f.type === 'textarea' ? 'sm:col-span-2' : ''}>
                    {f.type === 'textarea' ? (
                      <TextArea id={f.key} value={categoryDetails[f.key] ?? ''} onChange={(v) => updateDetail(f.key, v)}
                        placeholder={f.placeholder} />
                    ) : f.type === 'checkbox' ? (
                      <label className="inline-flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm hover:border-slate-300">
                        <input
                          id={f.key}
                          type="checkbox"
                          checked={Boolean(categoryDetails[f.key])}
                          onChange={(e) => updateDetail(f.key, e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                        />{translate('Yes')}</label>
                    ) : (
                      <TextInput
                        id={f.key}
                        type={f.type}
                        min={f.min}
                        max={f.max}
                        value={categoryDetails[f.key] ?? ''}
                        onChange={(v) => updateDetail(f.key, f.type === 'number' ? (v === '' ? '' : Number(v)) : v)}
                        placeholder={f.placeholder}
                      />
                    )}
                  </Field>
                ))}
              </div>
            </Section>
          )}
        </form>

        {/* Sticky side summary */}
        <div className="lg:sticky lg:top-6">
          <PreviewCard form={form} category={category} status={status} progress={progress} />
        </div>
      </div>

      {/* Sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <p className="hidden min-w-0 truncate text-xs text-slate-500 sm:block">
            {category ? (
              <>Category details are saved to <code className="rounded bg-slate-100 px-1 py-0.5">supplier_{form.supplier_type}</code> automatically.</>
            ) : (
              'Choose a category to add type-specific details.'
            )}
          </p>
          <div className="ml-auto flex items-center gap-2">
            {cancelBtn}
            {submitBtn}
          </div>
        </div>
      </div>
    </main>
  );
}