import { useAppSettings, translate } from '@/context/index.jsx';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, ArrowUpRight, Bed, Building2, Bus, Calendar as CalendarIcon, Car, Check, CheckCircle2,
  ChevronDown, ChevronRight, Clock, Compass, CreditCard, Download, ExternalLink, Flag, Pencil, Plane,
  Plus, Receipt, RefreshCw, Repeat, Search, Star, Trash2, Utensils, Wallet, X,
} from 'lucide-react';
import { useAuth } from '../../../context/index.jsx';
import { supabase } from '../../../lib/supabase/client.jsx';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
const SUPPLIER_TYPE_META = {
  hotel: { label: 'Hotel', icon: Building2, category: 'accommodation' },
  riad: { label: 'Riad', icon: Bed, category: 'accommodation' },
  resort: { label: 'Resort', icon: Star, category: 'accommodation' },
  restaurant: { label: 'Restaurant', icon: Utensils, category: 'meals' },
  airline: { label: 'Airline', icon: Plane, category: 'flights' },
  car_rental: { label: 'Car rental', icon: Car, category: 'transport' },
  transport_company: { label: 'Transport company', icon: Bus, category: 'transport' },
  local_guide: { label: 'Local guide', icon: Flag, category: 'guides' },
  activity_provider: { label: 'Activity provider', icon: Compass, category: 'activities' },
  manufacturer: { label: 'Manufacturer', icon: Building2 },
  wholesaler: { label: 'Wholesaler', icon: Building2 },
  distributor: { label: 'Distributor', icon: Bus },
};

const CATEGORY_PRESETS = [
  'accommodation', 'flights', 'transport', 'meals', 'activities', 'guides', 'marketing', 'salaries',
  'rent', 'utilities', 'software', 'insurance', 'taxes', 'office', 'maintenance', 'other',
];

const PAY_STATUS = {
  unpaid: { label: 'Unpaid', dot: 'bg-rose-500', cls: 'bg-rose-50 text-rose-800 ring-rose-200' },
  partially_paid: { label: 'Partially paid', dot: 'bg-amber-500', cls: 'bg-amber-50 text-amber-800 ring-amber-200' },
  paid: { label: 'Paid', dot: 'bg-emerald-500', cls: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  cancelled: { label: 'Cancelled', dot: 'bg-slate-400', cls: 'bg-slate-100 text-slate-600 ring-slate-200' },
};
const PAY_STATUS_OPTIONS = Object.entries(PAY_STATUS).map(([value, v]) => ({ value, label: v.label, dot: v.dot }));

const TYPE_OPTIONS = [
  { value: 'operational', label: 'Operational', hint: 'Day-to-day running costs', dot: 'bg-sky-500' },
  { value: 'booking', label: 'Booking', hint: 'Cost of a specific booking', dot: 'bg-amber-500' },
  { value: 'investment', label: 'Investment', hint: 'Equipment, growth, long-term', dot: 'bg-violet-500' },
  { value: 'tax', label: 'Tax', hint: 'Taxes and levies', dot: 'bg-rose-500' },
  { value: 'other', label: 'Other', dot: 'bg-slate-400' },
];
const METHOD_OPTIONS = [
  { value: '', label: 'Not set' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'card', label: 'Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'direct_debit', label: 'Direct debit' },
  { value: 'other', label: 'Other' },
];
const PAY_METHOD_OPTIONS = METHOD_OPTIONS.filter((o) => o.value);
const CURRENCY_OPTIONS = ['MAD', 'EUR', 'USD'].map((c) => ({ value: c, label: c }));
const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

/* ------------------------------------------------------------------ */
/*  Style tokens + helpers                                             */
/* ------------------------------------------------------------------ */
const inputCls =
  'w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition';
const labelCls = 'block text-xs font-medium text-slate-600 mb-1.5';
const btnGhost =
  'inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition disabled:opacity-50';
const btnPrimary =
  'inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-500 shadow-sm transition disabled:opacity-50';
const btnDanger =
  'inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-rose-600 rounded-lg hover:bg-rose-500 shadow-sm transition disabled:opacity-50';

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
// DATE columns come back as "YYYY-MM-DD": parse as local so the day never shifts
const fmtDate = (d) =>
  d ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtMoney = (n) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
const titleCase = (s = '') => s.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('') || '?';
const newExpenseNumber = () => `EXP-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
const errMsg = (e, fallback) => (e && typeof e.message === 'string' ? e.message : fallback);

const balanceOf = (e) => (e.payment_status === 'cancelled' ? 0 : Math.max(0, Number(e.amount || 0) - Number(e.paid_amount || 0)));
const isOverdue = (e) => Boolean(e.due_date) && e.payment_status !== 'cancelled' && balanceOf(e) > 0 && String(e.due_date).slice(0, 10) < todayISO();

const EMPTY_FORM = () => ({
  title: '', description: '', category: 'other', expense_type: 'operational',
  amount: '', tax_amount: '', currency: 'MAD',
  supplier_id: '', payee_name: '', booking_id: '',
  expense_date: todayISO(), due_date: '',
  paid_amount: '', payment_method: '', paid_date: todayISO(),
  invoice_number: '', receipt_url: '',
  is_recurring: false, recurrence_frequency: 'monthly',
  notes: '', is_cancelled: false,
});

/* ------------------------------------------------------------------ */
/*  Small components                                                   */
/* ------------------------------------------------------------------ */
function StatusBadge({ status }) {
  const s = PAY_STATUS[status] || PAY_STATUS.unpaid;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${s.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function SupplierAvatar({ type, name, size = 'w-9 h-9' }) {
  const Icon = SUPPLIER_TYPE_META[type]?.icon;
  return (
    <span className={`${size} shrink-0 rounded-xl bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-200 flex items-center justify-center text-xs font-semibold`}>
      {Icon ? <Icon className="w-4 h-4" aria-hidden="true" /> : initials(name)}
    </span>
  );
}

function PaidBar({ paid, total }) {
  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  return (
    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
      <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

function SectionTitle({ icon: Icon, children }) {
  return (
    <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
      <Icon className="w-4 h-4 text-amber-600" /> {children}
    </h4>
  );
}

function Modal({ children, onClose, maxW = 'max-w-2xl' }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" className={`bg-white border-slate-200 rounded-2xl w-full ${maxW} border shadow-2xl my-8 overflow-hidden rp-pop`}>
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, subtitle, onClose }) {
  return (
    <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100">
      <div>
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      <button type="button" onClick={onClose} className="p-1.5 -mr-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition" aria-label="Close">
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

function BarList({ title, icon, rows, currency, empty }) {
  const max = rows[0]?.value || 1;
  return (
    <section className="bg-white rounded-xl border border-slate-200/80 p-5 space-y-4">
      <SectionTitle icon={icon}>{title}</SectionTitle>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-400">{empty}</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.key}>
              <div className="flex items-center justify-between gap-3 text-sm">
                {r.href ? (
                  <Link to={r.href} className="truncate font-medium text-slate-800 hover:text-amber-700">{r.label}</Link>
                ) : (
                  <span className="truncate font-medium text-slate-800">{r.label}</span>
                )}
                <span className="shrink-0 font-semibold text-slate-900">{fmtMoney(r.value)} <span className="text-xs font-medium text-slate-400">{currency}</span></span>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.max(4, (r.value / max) * 100)}%` }} />
              </div>
              {r.sub && <p className="text-xs text-slate-400 mt-1">{r.sub}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* Custom dropdown: portal menu (never clipped), flips upward, keyboard support, optional search.
   Options: { value, label, hint?, dot?, disabled? } */
function Select({
  value, onChange, options, placeholder = 'Select…', searchable = false, prefix,
  compact = false, disabled = false, ariaLabel, className = '', menuMinWidth = 200, emptyValue = 'ALL',
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const searchRef = useRef(null);
  const listRef = useRef(null);

  const selected = options.find((o) => o.value === value);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => `${o.label} ${o.hint || ''}`.toLowerCase().includes(q));
  }, [options, query]);

  const place = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const wanted = Math.min(288, visible.length * 40 + (searchable ? 56 : 12));
    const below = window.innerHeight - r.bottom - 12;
    const above = r.top - 12;
    const up = below < wanted && above > below;
    const width = Math.max(r.width, menuMinWidth);
    setPos({
      left: Math.min(Math.max(8, r.left), window.innerWidth - width - 8),
      width,
      top: up ? undefined : r.bottom + 6,
      bottom: up ? window.innerHeight - r.top + 6 : undefined,
      maxHeight: Math.max(160, Math.min(320, up ? above : below)),
    });
  }, [visible.length, searchable, menuMinWidth]);

  useLayoutEffect(() => { if (open) place(); }, [open, place]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (triggerRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onScroll = (e) => { if (!menuRef.current?.contains(e.target)) place(); };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', place);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', place);
    };
  }, [open, place]);

  useEffect(() => { if (open && searchable) searchRef.current?.focus(); }, [open, searchable]);
  useEffect(() => {
    if (open) listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open, visible]);

  const openMenu = () => {
    if (disabled) return;
    setQuery('');
    const idx = options.findIndex((o) => o.value === value);
    setActive(idx >= 0 ? idx : 0);
    setOpen(true);
  };
  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };
  const choose = (o) => {
    if (!o || o.disabled) return;
    onChange(o.value);
    close();
  };

  const onKeyDown = (e) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); openMenu(); }
      return;
    }
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); setActive((i) => Math.min(visible.length - 1, i + 1)); break;
      case 'ArrowUp': e.preventDefault(); setActive((i) => Math.max(0, i - 1)); break;
      case 'Home': if (!searchable) { e.preventDefault(); setActive(0); } break;
      case 'End': if (!searchable) { e.preventDefault(); setActive(visible.length - 1); } break;
      case 'Enter': e.preventDefault(); choose(visible[active]); break;
      case ' ': if (!searchable) { e.preventDefault(); choose(visible[active]); } break;
      case 'Escape': e.preventDefault(); e.stopPropagation(); close(); break; // don't also close the modal behind
      case 'Tab': setOpen(false); break;
      default: break;
    }
  };

  const isFiltered = prefix && value !== emptyValue && value !== '' && value != null;

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? close(false) : openMenu())}
        onKeyDown={onKeyDown}
        className={`w-full flex items-center justify-between gap-2 bg-white border rounded-lg px-3 ${compact ? 'py-1.5' : 'py-2'} text-sm text-left transition
          focus:outline-none focus:ring-2 focus:ring-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed
          ${open ? 'border-amber-500 ring-2 ring-amber-500/20' : isFiltered ? 'border-amber-300 bg-amber-50/60' : 'border-slate-200 hover:border-slate-300'}`}
      >
        <span className="flex items-center gap-2 min-w-0">
          {selected?.dot && <span className={`w-2 h-2 rounded-full shrink-0 ${selected.dot}`} />}
          {prefix && <span className="text-slate-400 shrink-0">{prefix}</span>}
          <span className={`truncate ${selected ? (isFiltered ? 'text-amber-900 font-medium' : 'text-slate-800') : 'text-slate-400'}`}>
            {selected ? selected.label : placeholder}
          </span>
        </span>
        <ChevronDown className={`w-4 h-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180 text-amber-600' : ''}`} />
      </button>

      {open && pos && createPortal(
        <div
          ref={menuRef}
          role="presentation"
          style={{ position: 'fixed', left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: pos.maxHeight }}
          className="z-[100] flex flex-col bg-white border border-slate-200 rounded-xl shadow-xl shadow-slate-900/10 ring-1 ring-black/5 overflow-hidden rp-pop"
        >
          {searchable && (
            <div className="p-2 border-b border-slate-100 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setActive(0); }}
                  onKeyDown={onKeyDown}
                  placeholder="Search"
                  aria-label="Search options"
                  className="w-full bg-stone-50 rounded-md pl-8 pr-2 py-1.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-500/30"
                />
              </div>
            </div>
          )}
          <ul ref={listRef} role="listbox" className="overflow-y-auto p-1">
            {visible.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-slate-400">{translate('No matches')}</li>
            ) : (
              visible.map((o, i) => {
                const isSel = o.value === value;
                return (
                  <li
                    key={String(o.value)}
                    role="option"
                    aria-selected={isSel}
                    data-idx={i}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choose(o)}
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm cursor-pointer
                      ${i === active ? 'bg-amber-50' : ''} ${o.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    {o.dot && <span className={`w-2 h-2 rounded-full shrink-0 ${o.dot}`} />}
                    <span className="flex-1 min-w-0">
                      <span className={`block truncate ${isSel ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>{o.label}</span>
                      {o.hint && <span className="block truncate text-xs text-slate-400">{o.hint}</span>}
                    </span>
                    {isSel && <Check className="w-4 h-4 text-amber-600 shrink-0" />}
                  </li>
                );
              })
            )}
          </ul>
        </div>,
        document.body
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function ExpensesPage() {
  const { user } = useAuth();

  const [expenses, setExpenses] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [supplierFilter, setSupplierFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [viewCurrency, setViewCurrency] = useState(null);

  // Layers
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [detailClosing, setDetailClosing] = useState(false);
  const [payTarget, setPayTarget] = useState(null);
  const [payForm, setPayForm] = useState({ amount: '', method: 'bank_transfer', date: todayISO() });
  const [payError, setPayError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const flash = (msg, ms = 4000) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), ms);
  };

  /* ----- Data ----- */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [expRes, supRes, bookRes] = await Promise.all([
        supabase.from('expenses').select('*').order('expense_date', { ascending: false }).order('created_at', { ascending: false }),
        supabase.from('suppliers').select('id, name, supplier_code, supplier_type, status, city').is('deleted_at', null).order('name', { ascending: true }),
        supabase.from('bookings').select('id, booking_reference, destination, currency').order('created_at', { ascending: false }),
      ]);
      if (expRes.error) throw expRes.error;
      setExpenses(expRes.data || []);
      setSuppliers(supRes.error ? [] : supRes.data || []);
      setBookings(bookRes.error ? [] : bookRes.data || []);
    } catch (err) {
      console.error('Error loading expenses:', err);
      setError(`Could not load expenses: ${errMsg(err, 'unknown error')}. Make sure the expenses table migration has been applied.`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ----- Supplier linking ----- */
  const supplierById = useMemo(() => new Map(suppliers.map((s) => [s.id, s])), [suppliers]);
  const supplierByCode = useMemo(() => new Map(suppliers.filter((s) => s.supplier_code).map((s) => [s.supplier_code, s])), [suppliers]);
  const supplierByName = useMemo(() => new Map(suppliers.map((s) => [s.name.trim().toLowerCase(), s])), [suppliers]);

  // expenses store supplier_name + supplier_reference (the supplier code), so match on those
  const matchSupplier = useCallback((e) => {
    if (e.supplier_reference && supplierByCode.has(e.supplier_reference)) return supplierByCode.get(e.supplier_reference);
    if (e.supplier_name) return supplierByName.get(e.supplier_name.trim().toLowerCase()) || null;
    return null;
  }, [supplierByCode, supplierByName]);

  const supplierKey = useCallback((e) => {
    const s = matchSupplier(e);
    if (s) return s.id;
    return e.supplier_name ? `name:${e.supplier_name}` : '';
  }, [matchSupplier]);

  const bookingById = useMemo(() => new Map(bookings.map((b) => [b.id, b])), [bookings]);

  const enriched = useMemo(
    () => expenses.map((e) => ({ ...e, supplier: matchSupplier(e), balance: balanceOf(e), overdue: isOverdue(e) })),
    [expenses, matchSupplier]
  );

  const detail = useMemo(() => enriched.find((e) => e.id === detailId) || null, [enriched, detailId]);

  /* ----- Options ----- */
  const categoryOptions = useMemo(() => {
    const all = new Set([...CATEGORY_PRESETS, ...expenses.map((e) => e.category).filter(Boolean)]);
    return [...all].map((c) => ({ value: c, label: titleCase(c) }));
  }, [expenses]);

  const supplierFilterOptions = useMemo(() => {
    const known = new Set(suppliers.map((s) => s.id));
    const extra = new Map();
    enriched.forEach((e) => {
      const key = supplierKey(e);
      if (key && !known.has(key)) extra.set(key, e.supplier_name);
    });
    return [
      { value: 'ALL', label: 'All' },
      { value: '__none', label: 'No supplier' },
      ...suppliers.map((s) => ({ value: s.id, label: s.name, hint: s.supplier_code })),
      ...[...extra].map(([value, label]) => ({ value, label, hint: 'Not in suppliers' })),
    ];
  }, [suppliers, enriched, supplierKey]);

  const supplierFormOptions = useMemo(
    () => [
      { value: '', label: 'No supplier / other payee', hint: 'Type a payee name below' },
      ...suppliers.map((s) => ({
        value: s.id,
        label: s.name,
        hint: [s.supplier_code, SUPPLIER_TYPE_META[s.supplier_type]?.label, s.city].filter(Boolean).join(' · '),
      })),
    ],
    [suppliers]
  );

  const bookingOptions = useMemo(
    () => [
      { value: '', label: 'Not linked' },
      ...bookings.map((b) => ({ value: b.id, label: b.booking_reference, hint: b.destination || undefined })),
    ],
    [bookings]
  );

  /* ----- Filtering ----- */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched.filter((e) => {
      const matchesSearch = !q ||
        e.title?.toLowerCase().includes(q) ||
        e.expense_number?.toLowerCase().includes(q) ||
        e.supplier_name?.toLowerCase().includes(q) ||
        e.supplier_reference?.toLowerCase().includes(q) ||
        e.invoice_number?.toLowerCase().includes(q);
      const key = supplierKey(e);
      const matchesSupplier = supplierFilter === 'ALL' || (supplierFilter === '__none' ? !key : key === supplierFilter);
      const d = String(e.expense_date).slice(0, 10);
      return (
        matchesSearch && matchesSupplier &&
        (statusFilter === 'ALL' || e.payment_status === statusFilter) &&
        (typeFilter === 'ALL' || e.expense_type === typeFilter) &&
        (categoryFilter === 'ALL' || e.category === categoryFilter) &&
        (!dateFrom || d >= dateFrom) &&
        (!dateTo || d <= dateTo)
      );
    });
  }, [enriched, search, statusFilter, typeFilter, categoryFilter, supplierFilter, dateFrom, dateTo, supplierKey]);

  const hasFilters = Boolean(search || statusFilter !== 'ALL' || typeFilter !== 'ALL' || categoryFilter !== 'ALL' || supplierFilter !== 'ALL' || dateFrom || dateTo);
  const clearFilters = () => {
    setSearch(''); setStatusFilter('ALL'); setTypeFilter('ALL'); setCategoryFilter('ALL');
    setSupplierFilter('ALL'); setDateFrom(''); setDateTo('');
  };
  const dateRangeInvalid = Boolean(dateFrom && dateTo && dateFrom > dateTo);

  /* ----- Stats (one currency at a time so sums are never mixed) ----- */
  const currencies = useMemo(() => {
    const counts = new Map();
    expenses.forEach((e) => counts.set(e.currency, (counts.get(e.currency) || 0) + 1));
    return [...counts].sort((a, b) => b[1] - a[1]).map(([c]) => c);
  }, [expenses]);
  const activeCurrency = viewCurrency && currencies.includes(viewCurrency) ? viewCurrency : currencies[0] || 'MAD';

  const stats = useMemo(() => {
    const live = enriched.filter((e) => e.currency === activeCurrency && e.payment_status !== 'cancelled');
    const total = live.reduce((s, e) => s + Number(e.amount || 0), 0);
    const paid = live.reduce((s, e) => s + Math.min(Number(e.paid_amount || 0), Number(e.amount || 0)), 0);
    const outstanding = live.reduce((s, e) => s + e.balance, 0);
    const overdueRows = live.filter((e) => e.overdue);
    return {
      count: live.length, total, paid, outstanding,
      overdueCount: overdueRows.length,
      overdueAmount: overdueRows.reduce((s, e) => s + e.balance, 0),
    };
  }, [enriched, activeCurrency]);

  const topSuppliers = useMemo(() => {
    const map = new Map();
    enriched
      .filter((e) => e.currency === activeCurrency && e.payment_status !== 'cancelled' && (e.supplier_name || e.supplier))
      .forEach((e) => {
        const key = supplierKey(e);
        const row = map.get(key) || { key, label: e.supplier?.name || e.supplier_name, value: 0, owed: 0, count: 0, href: e.supplier ? `/admin/suppliers/${e.supplier.id}` : null };
        row.value += Number(e.amount || 0);
        row.owed += e.balance;
        row.count += 1;
        map.set(key, row);
      });
    return [...map.values()]
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
      .map((r) => ({ ...r, sub: `${r.count} expense${r.count === 1 ? '' : 's'}${r.owed > 0 ? ` · ${fmtMoney(r.owed)} ${activeCurrency} still owed` : ' · settled'}` }));
  }, [enriched, activeCurrency, supplierKey]);

  const topCategories = useMemo(() => {
    const map = new Map();
    enriched
      .filter((e) => e.currency === activeCurrency && e.payment_status !== 'cancelled')
      .forEach((e) => map.set(e.category, (map.get(e.category) || 0) + Number(e.amount || 0)));
    return [...map].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([key, value]) => ({ key, label: titleCase(key), value }));
  }, [enriched, activeCurrency]);

  /* ----- Layers: detail / escape / scroll lock ----- */
  const openDetail = (e) => { setDetailId(e.id); setDetailClosing(false); };
  const closeDetail = useCallback(() => {
    setDetailClosing(true);
    setTimeout(() => { setDetailId(null); setDetailClosing(false); }, 260);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (deleteTarget) setDeleteTarget(null);
      else if (payTarget) setPayTarget(null);
      else if (formOpen) setFormOpen(false);
      else if (detailId) closeDetail();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [deleteTarget, payTarget, formOpen, detailId, closeDetail]);

  useEffect(() => {
    document.body.style.overflow = detailId ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [detailId]);

  /* ----- Form ----- */
  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setSel = (key) => (v) => setForm((f) => ({ ...f, [key]: v }));

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM());
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (e) => {
    const s = matchSupplier(e);
    setEditingId(e.id);
    setForm({
      title: e.title || '',
      description: e.description || '',
      category: e.category || 'other',
      expense_type: e.expense_type || 'operational',
      amount: String(e.amount ?? ''),
      tax_amount: Number(e.tax_amount) ? String(e.tax_amount) : '',
      currency: e.currency || 'MAD',
      supplier_id: s?.id || '',
      payee_name: s ? '' : e.supplier_name || '',
      booking_id: e.booking_id || '',
      expense_date: String(e.expense_date || todayISO()).slice(0, 10),
      due_date: e.due_date ? String(e.due_date).slice(0, 10) : '',
      paid_amount: Number(e.paid_amount) ? String(e.paid_amount) : '',
      payment_method: e.payment_method || '',
      paid_date: e.paid_at ? String(e.paid_at).slice(0, 10) : todayISO(),
      invoice_number: e.invoice_number || '',
      receipt_url: e.receipt_url || '',
      is_recurring: Boolean(e.is_recurring),
      recurrence_frequency: e.recurrence_frequency || 'monthly',
      notes: e.notes || '',
      is_cancelled: e.payment_status === 'cancelled',
    });
    setFormError('');
    setFormOpen(true);
  };

  // Picking a supplier suggests a category when the category is still the default
  const pickSupplier = (id) => {
    setForm((f) => {
      const s = supplierById.get(id);
      const suggested = s ? SUPPLIER_TYPE_META[s.supplier_type]?.category : null;
      return { ...f, supplier_id: id, payee_name: id ? '' : f.payee_name, category: f.category === 'other' && suggested ? suggested : f.category };
    });
  };

  const handleSave = async (ev) => {
    ev.preventDefault();
    const amount = Number(form.amount);
    const tax = Number(form.tax_amount || 0);
    const paid = Number(form.paid_amount || 0);

    if (!form.title.trim()) return setFormError('Give the expense a title.');
    if (!(amount > 0)) return setFormError('The amount must be greater than zero.');
    if (tax < 0 || tax > amount) return setFormError('Tax must be between zero and the total amount.');
    if (paid < 0 || paid > amount) return setFormError('The amount paid cannot be negative or more than the total.');
    if (form.is_recurring && !form.recurrence_frequency) return setFormError('Choose how often this expense repeats.');
    if (form.due_date && form.due_date < form.expense_date) return setFormError('The due date cannot be before the expense date.');

    const supplier = supplierById.get(form.supplier_id);
    const status = form.is_cancelled ? 'cancelled' : paid >= amount ? 'paid' : paid > 0 ? 'partially_paid' : 'unpaid';

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      category: form.category || 'other',
      expense_type: form.expense_type,
      amount,
      tax_amount: tax,
      currency: form.currency,
      supplier_name: supplier ? supplier.name : form.payee_name.trim() || null,
      supplier_reference: supplier ? supplier.supplier_code || null : null,
      expense_date: form.expense_date,
      due_date: form.due_date || null,
      payment_status: status,
      payment_method: form.payment_method || null,
      paid_amount: paid,
      paid_at: status === 'paid' ? new Date(`${form.paid_date || todayISO()}T12:00:00`).toISOString() : null,
      booking_id: form.booking_id || null,
      invoice_number: form.invoice_number.trim() || null,
      receipt_url: form.receipt_url.trim() || null,
      is_recurring: form.is_recurring,
      recurrence_frequency: form.is_recurring ? form.recurrence_frequency : null,
      notes: form.notes.trim() || null,
    };

    try {
      setSaving(true);
      setFormError('');
      if (editingId) {
        const { error: upErr } = await supabase.from('expenses').update(payload).eq('id', editingId);
        if (upErr) throw upErr;
      } else {
        let lastError = null;
        for (let attempt = 0; attempt < 3; attempt += 1) {
          const { error: insErr } = await supabase.from('expenses').insert([{ ...payload, expense_number: newExpenseNumber(), created_by: user?.id || null }]);
          if (!insErr) { lastError = null; break; }
          lastError = insErr;
          if (insErr.code !== '23505') break; // only retry on a duplicate expense number
        }
        if (lastError) throw lastError;
      }
      setFormOpen(false);
      flash(editingId ? 'Expense updated.' : 'Expense created.');
      await fetchData();
    } catch (err) {
      console.error('Error saving expense:', err);
      setFormError(errMsg(err, 'Could not save the expense.'));
    } finally {
      setSaving(false);
    }
  };

  /* ----- Record payment ----- */
  const openPay = (e) => {
    setPayTarget(e);
    setPayForm({ amount: String(e.balance), method: e.payment_method || 'bank_transfer', date: todayISO() });
    setPayError('');
  };

  const handlePay = async (ev) => {
    ev.preventDefault();
    if (!payTarget) return;
    const value = Number(payForm.amount);
    if (!(value > 0)) return setPayError('Enter an amount greater than zero.');
    if (value > payTarget.balance + 0.0001) return setPayError(`That is more than the ${fmtMoney(payTarget.balance)} ${payTarget.currency} still owed.`);

    const newPaid = Number(payTarget.paid_amount || 0) + value;
    const status = newPaid >= Number(payTarget.amount) ? 'paid' : 'partially_paid';
    try {
      setSaving(true);
      setPayError('');
      const { error: upErr } = await supabase.from('expenses').update({
        paid_amount: newPaid,
        payment_status: status,
        payment_method: payForm.method,
        paid_at: status === 'paid' ? new Date(`${payForm.date || todayISO()}T12:00:00`).toISOString() : null,
      }).eq('id', payTarget.id);
      if (upErr) throw upErr;
      setPayTarget(null);
      flash(status === 'paid' ? 'Expense fully paid.' : 'Payment recorded.');
      await fetchData();
    } catch (err) {
      console.error('Error recording payment:', err);
      setPayError(errMsg(err, 'Could not record the payment.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setSaving(true);
      const { error: delErr } = await supabase.from('expenses').delete().eq('id', deleteTarget.id);
      if (delErr) throw delErr;
      if (detailId === deleteTarget.id) { setDetailId(null); setDetailClosing(false); }
      setDeleteTarget(null);
      flash('Expense deleted.');
      await fetchData();
    } catch (err) {
      console.error('Error deleting expense:', err);
      setError(errMsg(err, 'Could not delete the expense.'));
      setDeleteTarget(null);
    } finally {
      setSaving(false);
    }
  };

  /* ----- CSV export (respects the current filters) ----- */
  const exportCsv = () => {
    const header = ['expense_number', 'title', 'category', 'type', 'supplier', 'supplier_code', 'amount', 'tax', 'currency', 'paid', 'balance', 'status', 'expense_date', 'due_date', 'invoice_number'];
    const rows = filtered.map((e) => [
      e.expense_number, e.title, e.category, e.expense_type, e.supplier_name, e.supplier_reference,
      e.amount, e.tax_amount, e.currency, e.paid_amount, e.balance, e.payment_status,
      String(e.expense_date).slice(0, 10), e.due_date ? String(e.due_date).slice(0, 10) : '', e.invoice_number,
    ]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${todayISO()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const statCards = [
    { label: 'Total expenses', value: `${fmtMoney(stats.total)} ${activeCurrency}`, sub: `${stats.count} expense${stats.count === 1 ? '' : 's'}`, icon: Receipt, tone: 'text-slate-900', chip: 'bg-slate-100 text-slate-600' },
    { label: 'Paid', value: `${fmtMoney(stats.paid)} ${activeCurrency}`, sub: stats.total ? `${Math.round((stats.paid / stats.total) * 100)}% of total` : 'Nothing yet', icon: CheckCircle2, tone: 'text-emerald-600', chip: 'bg-emerald-50 text-emerald-600' },
    { label: 'Outstanding', value: `${fmtMoney(stats.outstanding)} ${activeCurrency}`, sub: 'Still to be paid', icon: Wallet, tone: 'text-amber-600', chip: 'bg-amber-50 text-amber-600' },
    { label: 'Overdue', value: stats.overdueCount, sub: stats.overdueCount ? `${fmtMoney(stats.overdueAmount)} ${activeCurrency} past due` : 'Nothing past due', icon: Clock, tone: stats.overdueCount ? 'text-rose-600' : 'text-slate-900', chip: 'bg-rose-50 text-rose-600' },
  ];

  /* ---------- Render ---------- */
  return (
    <div className="min-h-screen bg-stone-50">
      <style>{`
        @keyframes rp-pop { from { opacity: 0; transform: translateY(6px) scale(.98); } to { opacity: 1; transform: none; } }
        @keyframes rp-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes rp-fade-out { from { opacity: 1; } to { opacity: 0; } }
        @keyframes rp-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes rp-down { from { transform: translateY(0); } to { transform: translateY(100%); } }
        .rp-pop { animation: rp-pop .16s ease-out; }
        .rp-backdrop-in { animation: rp-fade .22s ease-out forwards; }
        .rp-backdrop-out { animation: rp-fade-out .26s ease-in forwards; }
        .rp-sheet-in { animation: rp-up .3s cubic-bezier(.22,1,.36,1) forwards; }
        .rp-sheet-out { animation: rp-down .26s cubic-bezier(.4,0,1,1) forwards; }
        @media (prefers-reduced-motion: reduce) {
          .rp-pop, .rp-backdrop-in, .rp-backdrop-out, .rp-sheet-in, .rp-sheet-out { animation-duration: 1ms; }
        }
      `}</style>

      <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">{translate('Expenses')}</h1>
            <p className="text-sm text-slate-500 mt-1">{translate('Track what the agency spends, linked to your suppliers and bookings.')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={exportCsv} disabled={!filtered.length} className={btnGhost}>
              <Download className="w-4 h-4 text-slate-500" />{translate('Export CSV')}</button>
            <button onClick={fetchData} className={btnGhost} title="Refresh records">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />{translate('Refresh')}</button>
            <button onClick={openCreate} className={btnPrimary}>
              <Plus className="w-4 h-4" />{translate('New expense')}</button>
          </div>
        </div>

        {/* Banners */}
        {notice && (
          <div role="status" className="px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 text-sm rp-pop">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> {notice}
          </div>
        )}
        {error && (
          <div role="alert" className="px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800 text-sm rp-pop">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="p-1 hover:bg-rose-100 rounded" aria-label="Dismiss"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Stats */}
        <div className="space-y-3">
          {currencies.length > 1 && (
            <div className="flex items-center justify-end gap-2 text-xs text-slate-500">
              Totals shown in
              <Select compact className="w-28" value={activeCurrency} onChange={setViewCurrency} ariaLabel="Currency for totals" menuMinWidth={120}
                options={currencies.map((c) => ({ value: c, label: c }))} />
            </div>
          )}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map(({ label, value, sub, icon: Icon, tone, chip }) => (
              <div key={label} className="bg-white p-5 rounded-xl border border-slate-200/80 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-slate-500">{label}</p>
                  <p className={`text-2xl font-semibold mt-1 truncate ${tone}`}>{value}</p>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{sub}</p>
                </div>
                <span className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${chip}`}><Icon className="w-5 h-5" /></span>
              </div>
            ))}
          </div>
        </div>

        {/* Breakdowns */}
        {!loading && enriched.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <BarList title="Top suppliers by spend" icon={Building2} rows={topSuppliers} currency={activeCurrency} empty="No expenses are linked to a supplier yet." />
            <BarList title="Spend by category" icon={Receipt} rows={topCategories} currency={activeCurrency} empty="No expenses yet." />
          </div>
        )}

        {/* Table card with toolbar */}
        <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
          <div className="p-4 border-b border-slate-100 space-y-3">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input type="search" placeholder="Search title, number, supplier or invoice" value={search}
                  onChange={(e) => setSearch(e.target.value)} className={`${inputCls} pl-9`} />
              </div>
              <Select className="lg:w-48" prefix="Status" ariaLabel="Payment status filter" value={statusFilter} onChange={setStatusFilter}
                options={[{ value: 'ALL', label: 'All' }, ...PAY_STATUS_OPTIONS]} />
              <Select className="lg:w-48" prefix="Type" ariaLabel="Expense type filter" value={typeFilter} onChange={setTypeFilter}
                options={[{ value: 'ALL', label: 'All' }, ...TYPE_OPTIONS]} />
              <Select className="lg:w-52" prefix="Category" ariaLabel="Category filter" value={categoryFilter} onChange={setCategoryFilter}
                options={[{ value: 'ALL', label: 'All' }, ...categoryOptions]} searchable />
              <Select className="lg:w-56" prefix="Supplier" ariaLabel="Supplier filter" value={supplierFilter} onChange={setSupplierFilter}
                options={supplierFilterOptions} searchable menuMinWidth={280} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
              <div className="flex flex-wrap items-center gap-2">
                <span>{filtered.length} of {enriched.length} expenses</span>
                <span className="text-slate-300">{translate('|')}</span>
                <label className="inline-flex items-center gap-1.5">From
                  <input type="date" value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)} className={`${inputCls} !w-auto !py-1`} />
                </label>
                <label className="inline-flex items-center gap-1.5">to
                  <input type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} className={`${inputCls} !w-auto !py-1`} />
                </label>
                {dateRangeInvalid && <span role="alert" className="text-rose-600">{translate('Start date is after the end date.')}</span>}
              </div>
              {hasFilters && (
                <button onClick={clearFilters} className="font-medium text-amber-700 hover:text-amber-800 underline underline-offset-2">{translate('Clear filters')}</button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1100px]">
              <thead>
                <tr className="bg-stone-50 border-b border-slate-100 text-xs font-medium text-slate-500">
                  <th className="py-3 px-4">{translate('Expense')}</th>
                  <th className="py-3 px-4">{translate('Supplier')}</th>
                  <th className="py-3 px-4">{translate('Category')}</th>
                  <th className="py-3 px-4 text-right">{translate('Amount')}</th>
                  <th className="py-3 px-4 w-44">{translate('Paid')}</th>
                  <th className="py-3 px-4">{translate('Status')}</th>
                  <th className="py-3 px-4">{translate('Due')}</th>
                  <th className="py-3 px-4 w-28" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {loading ? (
                  <tr><td colSpan="8" className="py-16 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-600" />{translate('Loading expenses…')}</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan="8" className="py-16 text-center text-slate-500">
                    <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium text-slate-700">{enriched.length === 0 ? 'No expenses yet' : 'No expenses match'}</p>
                    <p className="text-xs mt-1">{enriched.length === 0 ? 'Record your first expense to start tracking spend.' : 'Try a different search or clear the filters.'}</p>
                    {enriched.length === 0 && (
                      <button onClick={openCreate} className={`${btnPrimary} mt-4`}><Plus className="w-4 h-4" />{translate('New expense')}</button>
                    )}
                  </td></tr>
                ) : (
                  filtered.map((e) => {
                    const cancelled = e.payment_status === 'cancelled';
                    return (
                      <tr key={e.id} tabIndex={0} onClick={() => openDetail(e)} onKeyDown={(ev) => { if (ev.key === 'Enter') openDetail(e); }}
                        className={`group cursor-pointer hover:bg-amber-50/40 focus:outline-none focus-visible:bg-amber-50/60 transition-colors ${cancelled ? 'opacity-60' : ''}`}>
                        <td className="py-3.5 px-4">
                          <p className="font-medium text-slate-900">{e.title}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            <span className="font-mono text-amber-700">{e.expense_number || '—'}</span> · {fmtDate(e.expense_date)}
                            {e.is_recurring && <Repeat className="inline w-3 h-3 ml-1.5 -mt-0.5 text-slate-400" aria-label="Recurring" />}
                          </p>
                        </td>
                        <td className="py-3.5 px-4">
                          {e.supplier_name ? (
                            <div className="flex items-center gap-2.5 min-w-0">
                              <SupplierAvatar type={e.supplier?.supplier_type} name={e.supplier_name} />
                              <div className="min-w-0">
                                {e.supplier ? (
                                  <Link to={`/admin/suppliers/${e.supplier.id}`} onClick={(ev) => ev.stopPropagation()}
                                    className="block truncate font-medium text-slate-900 hover:text-amber-700">{e.supplier.name}</Link>
                                ) : (
                                  <p className="truncate font-medium text-slate-900">{e.supplier_name}</p>
                                )}
                                <p className="text-xs text-slate-400 truncate">{e.supplier ? e.supplier.supplier_code : 'Other payee'}</p>
                              </div>
                            </div>
                          ) : <span className="text-slate-400">{translate('—')}</span>}
                        </td>
                        <td className="py-3.5 px-4">
                          <p>{titleCase(e.category)}</p>
                          <p className="text-xs text-slate-400">{titleCase(e.expense_type)}</p>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <p className="font-semibold text-slate-900">{fmtMoney(e.amount)} {e.currency}</p>
                          {Number(e.tax_amount) > 0 && <p className="text-xs text-slate-400">incl. {fmtMoney(e.tax_amount)} tax</p>}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-between gap-2 text-xs mb-1.5">
                            <span className="font-medium text-emerald-700">{fmtMoney(e.paid_amount)}</span>
                            <span className={e.balance > 0 ? 'text-rose-600' : 'text-slate-400'}>{e.balance > 0 ? `${fmtMoney(e.balance)} left` : 'Settled'}</span>
                          </div>
                          <PaidBar paid={Number(e.paid_amount || 0)} total={Number(e.amount || 0)} />
                        </td>
                        <td className="py-3.5 px-4"><StatusBadge status={e.payment_status} /></td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {e.due_date ? (
                            <>
                              <p className={e.overdue ? 'font-medium text-rose-600' : 'text-slate-600'}>{fmtDate(e.due_date)}</p>
                              {e.overdue && <p className="text-xs text-rose-500">{translate('Overdue')}</p>}
                            </>
                          ) : <span className="text-slate-400">{translate('—')}</span>}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-end gap-1">
                            {e.balance > 0 && (
                              <button onClick={(ev) => { ev.stopPropagation(); openPay(e); }} onKeyDown={(ev) => ev.stopPropagation()}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition" title="Record a payment">
                                <CreditCard className="w-3.5 h-3.5" />{translate('Pay')}</button>
                            )}
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600 transition" />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ================= DETAIL SLIDE-UP SHEET (100% width, 70% height) ================= */}
      {detail && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={`Expense ${detail.expense_number || detail.title}`}>
          <div className={`absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] ${detailClosing ? 'rp-backdrop-out' : 'rp-backdrop-in'}`} onClick={closeDetail} />
          <div className={`absolute bottom-0 left-0 w-full h-[70vh] bg-stone-50 rounded-t-3xl shadow-[0_-20px_60px_-15px_rgba(15,23,42,0.35)] flex flex-col ${detailClosing ? 'rp-sheet-out' : 'rp-sheet-in'}`}>
            <div className="flex justify-center pt-3 pb-1">
              <button onClick={closeDetail} className="w-12 h-1.5 rounded-full bg-slate-300 hover:bg-slate-400 transition" aria-label="Close panel" />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 px-6 lg:px-10 py-3 border-b border-slate-200">
              <div className="min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-lg font-semibold text-slate-900 truncate">{detail.title}</h3>
                  <span className="font-mono text-xs font-semibold text-amber-700 bg-amber-50 ring-1 ring-inset ring-amber-200 px-2 py-0.5 rounded">{detail.expense_number || 'No number'}</span>
                  <StatusBadge status={detail.payment_status} />
                  {detail.overdue && <span className="text-xs font-medium text-rose-700 bg-rose-50 ring-1 ring-inset ring-rose-200 px-2 py-0.5 rounded-full">{translate('Overdue')}</span>}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Dated {fmtDate(detail.expense_date)} · Created {fmtDate(detail.created_at)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {detail.balance > 0 && <button onClick={() => openPay(detail)} className={btnPrimary}><CreditCard className="w-4 h-4" />{translate('Record payment')}</button>}
                <button onClick={() => { closeDetail(); openEdit(detail); }} className={btnGhost}><Pencil className="w-4 h-4 text-slate-500" />{translate('Edit')}</button>
                <button onClick={() => setDeleteTarget(detail)} className={`${btnGhost} !text-rose-700 hover:!bg-rose-50`}><Trash2 className="w-4 h-4" />{translate('Delete')}</button>
                <button onClick={closeDetail} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition" aria-label="Close"><X className="w-5 h-5" /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 lg:px-10 py-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-[1500px] mx-auto">
                <div className="space-y-4">
                  <section className="bg-white rounded-xl border border-slate-200/80 p-5 space-y-3">
                    <SectionTitle icon={Building2}>{translate('Supplier')}</SectionTitle>
                    {detail.supplier_name ? (
                      <div className="flex items-center gap-3">
                        <SupplierAvatar type={detail.supplier?.supplier_type} name={detail.supplier_name} size="w-11 h-11" />
                        <div className="min-w-0 text-sm">
                          <p className="font-medium text-slate-900 truncate">{detail.supplier?.name || detail.supplier_name}</p>
                          <p className="text-xs text-slate-500">
                            {detail.supplier
                              ? [detail.supplier.supplier_code, SUPPLIER_TYPE_META[detail.supplier.supplier_type]?.label].filter(Boolean).join(' · ')
                              : 'Other payee (not in your suppliers)'}
                          </p>
                          {detail.supplier && (
                            <Link to={`/admin/suppliers/${detail.supplier.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 hover:underline mt-1">
                              Open supplier <ArrowUpRight className="w-3 h-3" />
                            </Link>
                          )}
                        </div>
                      </div>
                    ) : <p className="text-sm text-slate-500">{translate('No supplier on this expense.')}</p>}
                  </section>

                  <section className="bg-white rounded-xl border border-slate-200/80 p-5 space-y-2.5 text-sm">
                    <SectionTitle icon={Receipt}>{translate('Details')}</SectionTitle>
                    <p><span className="text-slate-400">{translate('Category')}</span> &nbsp;{titleCase(detail.category)}</p>
                    <p><span className="text-slate-400">{translate('Type')}</span> &nbsp;{titleCase(detail.expense_type)}</p>
                    <p><span className="text-slate-400">{translate('Invoice no.')}</span> &nbsp;{detail.invoice_number || '—'}</p>
                    {detail.booking_id && (
                      <p><span className="text-slate-400">{translate('Booking')}</span> &nbsp;<span className="font-mono text-xs font-semibold">{bookingById.get(detail.booking_id)?.booking_reference || detail.booking_id.slice(0, 8)}</span></p>
                    )}
                    {detail.is_recurring && (
                      <p className="flex items-center gap-1.5"><Repeat className="w-3.5 h-3.5 text-slate-400" /> Repeats {detail.recurrence_frequency}</p>
                    )}
                    {detail.receipt_url && (
                      <a href={detail.receipt_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 hover:underline">
                        View receipt <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </section>
                </div>

                <section className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 p-5 space-y-5">
                  <SectionTitle icon={Wallet}>{translate('Payment')}</SectionTitle>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { l: 'Total', v: detail.amount, c: 'text-slate-900' },
                      { l: 'Paid', v: detail.paid_amount, c: 'text-emerald-600' },
                      { l: 'Balance', v: detail.balance, c: detail.balance > 0 ? 'text-rose-600' : 'text-slate-700' },
                    ].map((x) => (
                      <div key={x.l} className="bg-stone-50 rounded-lg px-4 py-3">
                        <p className="text-xs text-slate-500">{x.l}</p>
                        <p className={`text-lg font-semibold mt-0.5 ${x.c}`}>{fmtMoney(x.v)} <span className="text-xs font-medium text-slate-400">{detail.currency}</span></p>
                      </div>
                    ))}
                  </div>
                  <PaidBar paid={Number(detail.paid_amount || 0)} total={Number(detail.amount || 0)} />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div><p className="text-xs text-slate-400">{translate('Tax included')}</p><p className="mt-0.5">{fmtMoney(detail.tax_amount)} {detail.currency}</p></div>
                    <div><p className="text-xs text-slate-400">{translate('Method')}</p><p className="mt-0.5">{detail.payment_method ? titleCase(detail.payment_method) : '—'}</p></div>
                    <div><p className="text-xs text-slate-400">{translate('Due date')}</p><p className={`mt-0.5 ${detail.overdue ? 'text-rose-600 font-medium' : ''}`}>{fmtDate(detail.due_date)}</p></div>
                    <div><p className="text-xs text-slate-400">{translate('Paid on')}</p><p className="mt-0.5">{detail.paid_at ? fmtDate(detail.paid_at) : '—'}</p></div>
                  </div>
                </section>

                <section className="bg-white rounded-xl border border-slate-200/80 p-5 lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <SectionTitle icon={CalendarIcon}>{translate('Description')}</SectionTitle>
                    <p className="text-sm text-slate-600 mt-2 whitespace-pre-line">{detail.description || 'None provided.'}</p>
                  </div>
                  <div>
                    <SectionTitle icon={Pencil}>{translate('Internal notes')}</SectionTitle>
                    <p className="text-sm text-slate-600 mt-2 whitespace-pre-line">{detail.notes || 'None provided.'}</p>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= CREATE / EDIT ================= */}
      {formOpen && (
        <Modal onClose={() => setFormOpen(false)} maxW="max-w-3xl">
          <ModalHeader title={editingId ? 'Edit expense' : 'New expense'}
            subtitle="Pick a supplier from your network and the details are filled in for you." onClose={() => setFormOpen(false)} />
          <form onSubmit={handleSave} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            {formError && (
              <div role="alert" className="px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800 text-sm">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" /> {formError}
              </div>
            )}

            <div className="space-y-3">
              <SectionTitle icon={Receipt}>{translate('What was it for?')}</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className={labelCls}>{translate('Title *')}</label>
                  <input required value={form.title} onChange={setField('title')} placeholder="e.g. Riad Atlas, 3 nights for booking BK-2026-000012" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{translate('Type')}</label>
                  <Select value={form.expense_type} onChange={setSel('expense_type')} options={TYPE_OPTIONS} ariaLabel="Expense type" menuMinWidth={240} />
                </div>
                <div>
                  <label className={labelCls}>{translate('Category')}</label>
                  <Select value={form.category} onChange={setSel('category')} options={categoryOptions} searchable ariaLabel="Category" />
                </div>
                <div className="md:col-span-2">
                  <label className={labelCls}>{translate('Description')}</label>
                  <textarea rows="2" value={form.description} onChange={setField('description')} className={inputCls} placeholder="Optional details" />
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-5 border-t border-slate-100">
              <SectionTitle icon={Building2}>{translate('Supplier')}</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>{translate('Supplier')}</label>
                  <Select value={form.supplier_id} onChange={pickSupplier} options={supplierFormOptions} searchable ariaLabel="Supplier" menuMinWidth={340} placeholder="Select a supplier" />
                </div>
                {form.supplier_id ? (
                  <div className="text-sm text-slate-500 self-end pb-2">
                    Saved with code <span className="font-mono font-semibold text-amber-700">{supplierById.get(form.supplier_id)?.supplier_code || '—'}</span>
                  </div>
                ) : (
                  <div>
                    <label className={labelCls}>{translate('Payee name')}</label>
                    <input value={form.payee_name} onChange={setField('payee_name')} placeholder="e.g. Landlord, Meta Ads" className={inputCls} />
                  </div>
                )}
                {(form.expense_type === 'booking' || form.booking_id) && (
                  <div className="md:col-span-2">
                    <label className={labelCls}>{translate('Linked booking')}</label>
                    <Select value={form.booking_id} onChange={setSel('booking_id')} options={bookingOptions} searchable ariaLabel="Linked booking" menuMinWidth={300} />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3 pt-5 border-t border-slate-100">
              <SectionTitle icon={Wallet}>{translate('Amount and payment')}</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>{translate('Total amount *')}</label>
                  <input type="number" step="0.01" min="0.01" required value={form.amount} onChange={setField('amount')} placeholder="0.00" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{translate('Of which tax')}</label>
                  <input type="number" step="0.01" min="0" value={form.tax_amount} onChange={setField('tax_amount')} placeholder="0.00" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{translate('Currency')}</label>
                  <Select value={form.currency} onChange={setSel('currency')} options={CURRENCY_OPTIONS} ariaLabel="Currency" menuMinWidth={120} />
                </div>
                <div>
                  <label className={labelCls}>{translate('Already paid')}</label>
                  <input type="number" step="0.01" min="0" value={form.paid_amount} onChange={setField('paid_amount')} placeholder="0.00" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{translate('Payment method')}</label>
                  <Select value={form.payment_method} onChange={setSel('payment_method')} options={METHOD_OPTIONS} ariaLabel="Payment method" />
                </div>
                {Number(form.paid_amount) > 0 && Number(form.paid_amount) >= Number(form.amount || 0) ? (
                  <div>
                    <label className={labelCls}>{translate('Paid on')}</label>
                    <input type="date" value={form.paid_date} onChange={setField('paid_date')} className={inputCls} />
                  </div>
                ) : <div className="hidden md:block" />}
                <div>
                  <label className={labelCls}>{translate('Expense date *')}</label>
                  <input type="date" required value={form.expense_date} onChange={setField('expense_date')} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{translate('Due date')}</label>
                  <input type="date" min={form.expense_date || undefined} value={form.due_date} onChange={setField('due_date')} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{translate('Invoice number')}</label>
                  <input value={form.invoice_number} onChange={setField('invoice_number')} className={inputCls} />
                </div>
                <div className="md:col-span-3">
                  <label className={labelCls}>{translate('Receipt link')}</label>
                  <input type="url" value={form.receipt_url} onChange={setField('receipt_url')} placeholder="https://…" className={inputCls} />
                </div>
              </div>
              <p className="text-xs text-slate-500">{translate('The status is worked out from the amount paid: nothing paid is unpaid, part paid is partially paid, all paid is paid.')}</p>
            </div>

            <div className="space-y-3 pt-5 border-t border-slate-100">
              <SectionTitle icon={Repeat}>{translate('More')}</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={form.is_recurring} onChange={(e) => setForm((f) => ({ ...f, is_recurring: e.target.checked }))} className="accent-amber-600" />{translate('Recurring expense')}</label>
                {form.is_recurring ? (
                  <Select value={form.recurrence_frequency} onChange={setSel('recurrence_frequency')} options={FREQUENCY_OPTIONS} prefix="Repeats" ariaLabel="Recurrence" />
                ) : <div className="hidden md:block" />}
                <label className="flex items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 cursor-pointer md:col-span-2">
                  <input type="checkbox" checked={form.is_cancelled} onChange={(e) => setForm((f) => ({ ...f, is_cancelled: e.target.checked }))} className="accent-amber-600" />{translate('This expense is cancelled (left out of all totals)')}</label>
                <div className="md:col-span-2">
                  <label className={labelCls}>{translate('Internal notes')}</label>
                  <textarea rows="2" value={form.notes} onChange={setField('notes')} className={inputCls} placeholder="Visible to staff only" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-100">
              <button type="button" onClick={() => setFormOpen(false)} className={btnGhost}>{translate('Cancel')}</button>
              <button type="submit" disabled={saving} className={btnPrimary}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Save expense'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ================= RECORD PAYMENT ================= */}
      {payTarget && (
        <Modal onClose={() => setPayTarget(null)} maxW="max-w-md">
          <ModalHeader title="Record payment" subtitle={`${payTarget.title}${payTarget.expense_number ? ` · ${payTarget.expense_number}` : ''}`} onClose={() => setPayTarget(null)} />
          <form onSubmit={handlePay} className="p-6 space-y-4">
            {payError && (
              <div role="alert" className="px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm">{payError}</div>
            )}
            <div className="bg-amber-50 px-4 py-3 rounded-lg border border-amber-200 text-sm text-amber-900 flex justify-between">
              <span>{translate('Still owed')}</span>
              <span className="font-semibold">{fmtMoney(payTarget.balance)} {payTarget.currency}</span>
            </div>
            <div>
              <label className={labelCls}>Amount ({payTarget.currency}) *</label>
              <input type="number" step="0.01" min="0.01" max={payTarget.balance} required value={payForm.amount}
                onChange={(e) => setPayForm((p) => ({ ...p, amount: e.target.value }))} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>{translate('Method')}</label>
                <Select value={payForm.method} onChange={(v) => setPayForm((p) => ({ ...p, method: v }))} options={PAY_METHOD_OPTIONS} ariaLabel="Payment method" />
              </div>
              <div>
                <label className={labelCls}>{translate('Date')}</label>
                <input type="date" value={payForm.date} max={todayISO()} onChange={(e) => setPayForm((p) => ({ ...p, date: e.target.value }))} className={inputCls} />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setPayTarget(null)} className={btnGhost}>{translate('Cancel')}</button>
              <button type="submit" disabled={saving} className={btnPrimary}>{saving ? 'Saving…' : 'Record payment'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ================= DELETE CONFIRM ================= */}
      {deleteTarget && (
        <Modal onClose={() => setDeleteTarget(null)} maxW="max-w-md">
          <ModalHeader title="Delete this expense?" subtitle={deleteTarget.title} onClose={() => setDeleteTarget(null)} />
          <div className="p-6 space-y-4">
            <p className="text-sm text-slate-600">
              This permanently removes <span className="font-semibold">{deleteTarget.expense_number || 'the expense'}</span>{translate('and cannot be undone. If you only want to leave it out of totals, edit it and mark it as cancelled instead.')}</p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className={btnGhost}>{translate('Keep it')}</button>
              <button onClick={handleDelete} disabled={saving} className={btnDanger}>{saving ? 'Deleting…' : 'Delete expense'}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}