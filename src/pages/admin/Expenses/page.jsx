import { useAppSettings, translate } from '@/context/index.jsx';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, ArrowUpRight, Bed, Building2, Bus, Calendar as CalendarIcon, Car, Check, CheckCircle2,
  ChevronDown, ChevronRight, Clock, Compass, CreditCard, Download, ExternalLink, Filter, Flag, Pencil, Plane,
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
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 hover:border-slate-300 focus:border-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-500/15';
const labelCls = 'block text-xs font-medium text-slate-600 mb-1.5';
const btnGhost =
  'inline-flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition disabled:opacity-50';
const btnPrimary =
  'inline-flex items-center gap-2 px-3.5 py-2.5 text-sm font-semibold text-white bg-amber-500 rounded-lg shadow-sm ring-1 ring-inset ring-amber-600/20 hover:bg-amber-600 transition disabled:opacity-50';
const btnDanger =
  'inline-flex items-center gap-2 px-3.5 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-lg shadow-sm hover:bg-red-500 transition disabled:opacity-50';

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
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

const EMPTY_FILTERS = { status: 'ALL', type: 'ALL', category: 'ALL', supplier: 'ALL', from: '', to: '' };

/* ------------------------------------------------------------------ */
/*  Small components                                                   */
/* ------------------------------------------------------------------ */
function StatusBadge({ status }) {
  const s = PAY_STATUS[status] || PAY_STATUS.unpaid;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${s.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function SupplierAvatar({ type, name, size = 'h-10 w-10' }) {
  const Icon = SUPPLIER_TYPE_META[type]?.icon;
  return (
    <span className={`${size} shrink-0 rounded-xl bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-200 flex items-center justify-center text-xs font-semibold`}>
      {Icon ? <Icon className="h-[18px] w-[18px]" aria-hidden="true" /> : initials(name)}
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

function StatCard({ label, value, sub, tone = 'text-slate-900', bar = 'bg-slate-300' }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <span className={`absolute inset-y-0 left-0 w-1 ${bar}`} />
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${tone}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400 truncate">{sub}</p>}
    </div>
  );
}

function Modal({ children, onClose, maxW = 'max-w-2xl' }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white shadow-2xl ${maxW}`}>
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, subtitle, onClose }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
      >
        <X aria-hidden="true" className="h-4 w-4" />
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

/* Ilustración: recibos apilados + billetera (estado vacío) */
function EmptyExpensesIllustration() {
  return (
    <svg viewBox="0 0 320 200" className="mx-auto h-44 w-auto" role="img" aria-label="Ilustración de recibos y billetera">
      <ellipse cx="160" cy="184" rx="110" ry="8" className="fill-slate-100" />
      {/* recibo trasero */}
      <g transform="rotate(-5 110 100)">
        <rect x="46" y="46" width="104" height="100" rx="10" className="fill-white stroke-slate-200" strokeWidth="2" />
        <rect x="60" y="62" width="52" height="6" rx="3" className="fill-slate-200" />
        <rect x="60" y="76" width="76" height="5" rx="2.5" className="fill-slate-100" />
        <rect x="60" y="88" width="64" height="5" rx="2.5" className="fill-slate-100" />
        <rect x="60" y="100" width="70" height="5" rx="2.5" className="fill-slate-100" />
        <rect x="60" y="120" width="34" height="6" rx="3" className="fill-slate-300" />
      </g>
      {/* recibo frontal con acento ámbar */}
      <g transform="rotate(6 200 100)">
        <rect x="150" y="54" width="118" height="112" rx="10" className="fill-white stroke-amber-300" strokeWidth="2" />
        <rect x="164" y="70" width="46" height="7" rx="3.5" className="fill-slate-300" />
        <rect x="164" y="84" width="84" height="5" rx="2.5" className="fill-slate-100" />
        <rect x="164" y="96" width="72" height="5" rx="2.5" className="fill-slate-100" />
        <rect x="164" y="108" width="80" height="5" rx="2.5" className="fill-slate-100" />
        <path d="M160 128h98" strokeDasharray="4 4" className="stroke-slate-200" strokeWidth="2" />
        <rect x="164" y="138" width="42" height="14" rx="7" className="fill-emerald-100" />
        <circle cx="174" cy="145" r="3" className="fill-emerald-500" />
        <rect x="214" y="143" width="42" height="5" rx="2.5" className="fill-slate-100" />
      </g>
      {/* billetera */}
      <g transform="translate(238 130)">
        <rect x="0" y="0" width="54" height="36" rx="8" className="fill-amber-100 stroke-amber-400" strokeWidth="2" />
        <rect x="34" y="8" width="20" height="20" rx="5" className="fill-white stroke-amber-400" strokeWidth="2" />
        <circle cx="44" cy="18" r="2.5" className="fill-amber-500" />
      </g>
      {/* insignia + */}
      <circle cx="262" cy="52" r="20" className="fill-amber-500" />
      <path d="M262 43v18M253 52h18" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <circle cx="40" cy="40" r="4" className="fill-amber-200" />
      <circle cx="288" cy="118" r="3" className="fill-amber-300" />
      <circle cx="30" cy="150" r="3" className="fill-slate-200" />
    </svg>
  );
}

/* Ilustración: lupa sobre una lista (sin resultados) */
function NoResultsIllustration() {
  return (
    <svg viewBox="0 0 200 140" className="mx-auto h-32 w-auto" role="img" aria-label="Sin resultados">
      <rect x="24" y="20" width="120" height="100" rx="10" className="fill-white stroke-slate-200" strokeWidth="2" />
      <rect x="40" y="38" width="60" height="6" rx="3" className="fill-slate-200" />
      <rect x="40" y="54" width="88" height="5" rx="2.5" className="fill-slate-100" />
      <rect x="40" y="68" width="76" height="5" rx="2.5" className="fill-slate-100" />
      <rect x="40" y="82" width="84" height="5" rx="2.5" className="fill-slate-100" />
      <rect x="40" y="96" width="52" height="5" rx="2.5" className="fill-slate-100" />
      <circle cx="146" cy="92" r="26" className="fill-amber-50 stroke-amber-500" strokeWidth="3" />
      <path d="M164 110l14 14" className="stroke-amber-500" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function EmptyState({ onCreate }) {
  const steps = [
    ['Registra tu primer gasto', 'Vincula el gasto a un proveedor y a una reserva.'],
    ['Controla los pagos', 'Registra pagos parciales o totales con su método.'],
    ['Analiza y exporta', 'Consulta por categoría, estado y exporta a CSV.'],
  ];
  return (
    <div className="px-6 py-12 text-center">
      <EmptyExpensesIllustration />
      <h2 className="mt-4 text-xl font-semibold text-slate-900">{translate('Aún no hay gastos')}</h2>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500">
        {translate('Empieza a controlar lo que gasta la agencia vinculándolo a tus proveedores y reservas.')}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm ring-1 ring-inset ring-amber-600/20 hover:bg-amber-600"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          {translate('Registrar primer gasto')}
        </button>
      </div>
      <ol className="mx-auto mt-10 grid max-w-3xl gap-3 text-left sm:grid-cols-3">
        {steps.map(([title, text], i) => (
          <li key={title} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-amber-500 text-xs font-bold text-white">{i + 1}</span>
            <p className="mt-2 text-sm font-semibold text-slate-900">{title}</p>
            <p className="mt-0.5 text-xs text-slate-500">{text}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function NoResults({ onClear }) {
  return (
    <div className="px-6 py-14 text-center">
      <NoResultsIllustration />
      <h2 className="mt-4 text-base font-semibold text-slate-900">{translate('Ningún gasto coincide con estos filtros')}</h2>
      <p className="mt-1 text-sm text-slate-500">{translate('Prueba con otra búsqueda o quita algunos filtros.')}</p>
      <button
        type="button"
        onClick={onClear}
        className="mt-5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
      >
        {translate('Borrar todos los filtros')}
      </button>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="divide-y divide-slate-100" role="status" aria-label="Cargando gastos">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex animate-pulse items-center gap-3 px-4 py-4">
          <div className="h-10 w-10 rounded-xl bg-slate-100" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-40 rounded bg-slate-100" />
            <div className="h-2.5 w-24 rounded bg-slate-100" />
          </div>
          <div className="hidden h-3 w-24 rounded bg-slate-100 sm:block" />
          <div className="h-5 w-16 rounded-full bg-slate-100" />
        </div>
      ))}
    </div>
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
      case 'Escape': e.preventDefault(); e.stopPropagation(); close(); break;
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

  // Filter modal
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [filterDraft, setFilterDraft] = useState(EMPTY_FILTERS);

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
  const filterDraftDateInvalid = Boolean(filterDraft.from && filterDraft.to && filterDraft.from > filterDraft.to);

  /* ----- Stats ----- */
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

  /* ----- Chips for active filters ----- */
  const activeChips = [
    statusFilter !== 'ALL' && {
      key: 'status', label: PAY_STATUS[statusFilter]?.label || statusFilter,
      clear: () => setStatusFilter('ALL'),
    },
    typeFilter !== 'ALL' && {
      key: 'type', label: TYPE_OPTIONS.find((t) => t.value === typeFilter)?.label || typeFilter,
      clear: () => setTypeFilter('ALL'),
    },
    categoryFilter !== 'ALL' && {
      key: 'category', label: titleCase(categoryFilter),
      clear: () => setCategoryFilter('ALL'),
    },
    supplierFilter !== 'ALL' && {
      key: 'supplier', label: supplierFilter === '__none' ? 'No supplier' : (supplierById.get(supplierFilter)?.name || supplierFilter),
      clear: () => setSupplierFilter('ALL'),
    },
    dateFrom && { key: 'from', label: `Desde ${dateFrom}`, clear: () => setDateFrom('') },
    dateTo && { key: 'to', label: `Hasta ${dateTo}`, clear: () => setDateTo('') },
  ].filter(Boolean);

  /* ----- Filter modal ----- */
  const openFilterModal = () => {
    setFilterDraft({ status: statusFilter, type: typeFilter, category: categoryFilter, supplier: supplierFilter, from: dateFrom, to: dateTo });
    setFilterModalOpen(true);
  };
  const applyFilterDraft = () => {
    if (filterDraftDateInvalid) return;
    setStatusFilter(filterDraft.status);
    setTypeFilter(filterDraft.type);
    setCategoryFilter(filterDraft.category);
    setSupplierFilter(filterDraft.supplier);
    setDateFrom(filterDraft.from);
    setDateTo(filterDraft.to);
    setFilterModalOpen(false);
  };
  const clearFilterDraft = () => setFilterDraft(EMPTY_FILTERS);

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
      else if (filterModalOpen) setFilterModalOpen(false);
      else if (detailId) closeDetail();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [deleteTarget, payTarget, formOpen, filterModalOpen, detailId, closeDetail]);

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
          if (insErr.code !== '23505') break;
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

  /* ----- CSV export ----- */
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

  /* ---------- Render ---------- */
  return (
    <main className="mx-auto w-full max-w-7xl space-y-5 p-4 sm:p-6">
      <style>{`
        @keyframes rp-pop { from { opacity: 0; transform: translateY(6px) scale(.98); } to { opacity: 1; transform: none; } }
        .rp-pop { animation: rp-pop .16s ease-out; }
        @media (prefers-reduced-motion: reduce) { .rp-pop { animation-duration: 1ms; } }
      `}</style>

      {/* Encabezado */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 text-amber-600 ring-1 ring-inset ring-amber-200">
            <Receipt aria-hidden="true" className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{translate('Gastos')}</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {translate('Controla lo que gasta la agencia, vinculado a tus proveedores y reservas.')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={exportCsv} disabled={!filtered.length} className={btnGhost} title="Exportar CSV">
            <Download aria-hidden="true" className="h-4 w-4 text-slate-500" />
            <span className="hidden sm:inline">{translate('Exportar CSV')}</span>
          </button>
          <button type="button" onClick={fetchData} disabled={loading} className={btnGhost} title="Actualizar">
            <RefreshCw aria-hidden="true" className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{translate('Actualizar')}</span>
          </button>
          <button type="button" onClick={openCreate} className={btnPrimary}>
            <Plus aria-hidden="true" className="h-4 w-4" />
            {translate('Nuevo gasto')}
          </button>
        </div>
      </header>

      {notice && (
        <p role="status" className="flex items-center justify-between gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 ring-1 ring-inset ring-emerald-200">
          {notice}
          <button type="button" onClick={() => setNotice(null)} aria-label="Descartar" className="rounded p-0.5 hover:bg-emerald-100">
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </p>
      )}

      {error && (
        <p role="alert" className="flex items-center justify-between gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          <span className="flex items-center gap-2"><AlertTriangle aria-hidden="true" className="h-4 w-4" />{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Descartar" className="rounded p-0.5 hover:bg-red-100">
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </p>
      )}

      {/* Estadísticas */}
      {!loading && enriched.length > 0 && (
        <div className="space-y-3">
          {currencies.length > 1 && (
            <div className="flex items-center justify-end gap-2 text-xs text-slate-500">
              {translate('Totales en')}
              <Select compact className="w-28" value={activeCurrency} onChange={setViewCurrency} ariaLabel="Moneda para los totales" menuMinWidth={120}
                options={currencies.map((c) => ({ value: c, label: c }))} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label={translate('Total de gastos')} value={`${fmtMoney(stats.total)} ${activeCurrency}`}
              sub={`${stats.count} ${stats.count === 1 ? 'gasto' : 'gastos'}`} bar="bg-amber-500" />
            <StatCard label={translate('Pagado')} value={`${fmtMoney(stats.paid)} ${activeCurrency}`}
              sub={stats.total ? `${Math.round((stats.paid / stats.total) * 100)}% del total` : '—'}
              tone="text-emerald-700" bar="bg-emerald-500" />
            <StatCard label={translate('Pendiente')} value={`${fmtMoney(stats.outstanding)} ${activeCurrency}`}
              sub={translate('Aún por pagar')} tone="text-amber-700" bar="bg-amber-400" />
            <StatCard label={translate('Vencido')} value={stats.overdueCount}
              sub={stats.overdueCount ? `${fmtMoney(stats.overdueAmount)} ${activeCurrency}` : translate('Nada vencido')}
              tone={stats.overdueCount ? 'text-red-700' : 'text-slate-900'} bar={stats.overdueCount ? 'bg-red-500' : 'bg-slate-300'} />
          </div>
        </div>
      )}

      {/* Breakdowns */}
      {!loading && enriched.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <BarList title="Top suppliers by spend" icon={Building2} rows={topSuppliers} currency={activeCurrency} empty="No expenses are linked to a supplier yet." />
          <BarList title="Spend by category" icon={Receipt} rows={topCategories} currency={activeCurrency} empty="No expenses yet." />
        </div>
      )}

      {/* Tabla + toolbar */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="space-y-3 border-b border-slate-200 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="relative block min-w-0 flex-1">
              <span className="sr-only">{translate('Buscar gastos')}</span>
              <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder={translate('Buscar por título, número, proveedor o factura…')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`${inputCls} pl-9`}
              />
            </label>
            <button
              type="button"
              onClick={openFilterModal}
              aria-haspopup="dialog"
              aria-expanded={filterModalOpen}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <Filter aria-hidden="true" className="h-4 w-4" />
              {translate('Filtros')}
              {activeChips.length > 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">{activeChips.length}</span>
              )}
            </button>
          </div>

          {hasFilters && (
            <div className="flex flex-wrap items-center gap-2">
              {activeChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={chip.clear}
                  className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200 hover:bg-amber-100"
                >
                  {chip.label}
                  <X aria-hidden="true" className="h-3 w-3" />
                  <span className="sr-only">{translate('Quitar filtro')}</span>
                </button>
              ))}
              <button type="button" onClick={clearFilters} className="px-1 text-xs font-medium text-slate-500 hover:text-slate-800">
                {translate('Borrar todo')}
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span>{filtered.length} de {enriched.length} {enriched.length === 1 ? 'gasto' : 'gastos'}</span>
            <span className="text-slate-300">|</span>
            <label className="inline-flex items-center gap-1.5">{translate('Desde')}
              <input type="date" value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)} className={`${inputCls} !w-auto !py-1`} />
            </label>
            <label className="inline-flex items-center gap-1.5">{translate('hasta')}
              <input type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} className={`${inputCls} !w-auto !py-1`} />
            </label>
            {dateRangeInvalid && <span role="alert" className="text-red-600">{translate('La fecha de inicio es posterior a la de fin.')}</span>}
          </div>
        </div>

        {/* Cuerpo */}
        {loading ? (
          <Skeleton />
        ) : enriched.length === 0 ? (
          <EmptyState onCreate={openCreate} />
        ) : filtered.length === 0 ? (
          <NoResults onClear={clearFilters} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">{translate('Gasto')}</th>
                  <th className="px-4 py-3 font-medium">{translate('Proveedor')}</th>
                  <th className="px-4 py-3 font-medium">{translate('Categoría')}</th>
                  <th className="px-4 py-3 text-right font-medium">{translate('Importe')}</th>
                  <th className="w-44 px-4 py-3 font-medium">{translate('Pagado')}</th>
                  <th className="px-4 py-3 font-medium">{translate('Estado')}</th>
                  <th className="px-4 py-3 font-medium">{translate('Vence')}</th>
                  <th className="w-28 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((e) => {
                  const cancelled = e.payment_status === 'cancelled';
                  return (
                    <tr
                      key={e.id}
                      tabIndex={0}
                      onClick={() => openDetail(e)}
                      onKeyDown={(ev) => { if (ev.key === 'Enter') openDetail(e); }}
                      className={`group cursor-pointer transition-colors hover:bg-amber-50/30 focus:outline-none focus-visible:bg-amber-50/60 ${cancelled ? 'opacity-60' : ''}`}
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <SupplierAvatar type={e.supplier?.supplier_type} name={e.supplier_name || e.title} />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-900">{e.title}</p>
                            <p className="mt-0.5 text-xs text-slate-400">
                              <span className="font-mono text-amber-700">{e.expense_number || '—'}</span> · {fmtDate(e.expense_date)}
                              {e.is_recurring && <Repeat className="ml-1.5 -mt-0.5 inline h-3 w-3 text-slate-400" aria-label="Recurrente" />}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {e.supplier_name ? (
                          <div className="min-w-0">
                            {e.supplier ? (
                              <Link to={`/admin/suppliers/${e.supplier.id}`} onClick={(ev) => ev.stopPropagation()}
                                className="block truncate font-medium text-slate-900 hover:text-amber-700">{e.supplier.name}</Link>
                            ) : (
                              <p className="truncate font-medium text-slate-900">{e.supplier_name}</p>
                            )}
                            <p className="truncate text-xs text-slate-400">{e.supplier ? e.supplier.supplier_code : 'Otro beneficiario'}</p>
                          </div>
                        ) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-slate-700">{titleCase(e.category)}</p>
                        <p className="text-xs text-slate-400">{titleCase(e.expense_type)}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right">
                        <p className="font-semibold text-slate-900">{fmtMoney(e.amount)} {e.currency}</p>
                        {Number(e.tax_amount) > 0 && <p className="text-xs text-slate-400">incl. {fmtMoney(e.tax_amount)} imp.</p>}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                          <span className="font-medium text-emerald-700">{fmtMoney(e.paid_amount)}</span>
                          <span className={e.balance > 0 ? 'text-red-600' : 'text-slate-400'}>
                            {e.balance > 0 ? `${fmtMoney(e.balance)} rest.` : 'Pagado'}
                          </span>
                        </div>
                        <PaidBar paid={Number(e.paid_amount || 0)} total={Number(e.amount || 0)} />
                      </td>
                      <td className="px-4 py-3.5"><StatusBadge status={e.payment_status} /></td>
                      <td className="px-4 py-3.5 text-slate-600">{e.due_date ? fmtDate(e.due_date) : '—'}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex justify-end gap-1">
                          <button type="button" onClick={(ev) => { ev.stopPropagation(); openEdit(e); }}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50">
                            <Pencil aria-hidden="true" className="h-3.5 w-3.5" />{translate('Editar')}
                          </button>
                          {e.balance > 0 && e.payment_status !== 'cancelled' && (
                            <button type="button" onClick={(ev) => { ev.stopPropagation(); openPay(e); }}
                              className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50">
                              <Wallet aria-hidden="true" className="h-3.5 w-3.5" />{translate('Pagar')}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal de filtros */}
      {filterModalOpen && (
        <Modal onClose={() => setFilterModalOpen(false)}>
          <ModalHeader
            title={translate('Filtrar gastos')}
            subtitle={translate('Combina estado, tipo, categoría, proveedor y fechas.')}
            onClose={() => setFilterModalOpen(false)}
          />
          <div className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                {translate('Estado')}
                <div className="mt-1.5">
                  <Select value={filterDraft.status} onChange={(v) => setFilterDraft((d) => ({ ...d, status: v }))}
                    options={[{ value: 'ALL', label: 'Todos' }, ...PAY_STATUS_OPTIONS]} />
                </div>
              </label>
              <label className="text-sm font-medium text-slate-700">
                {translate('Tipo')}
                <div className="mt-1.5">
                  <Select value={filterDraft.type} onChange={(v) => setFilterDraft((d) => ({ ...d, type: v }))}
                    options={[{ value: 'ALL', label: 'Todos' }, ...TYPE_OPTIONS]} />
                </div>
              </label>
              <label className="text-sm font-medium text-slate-700">
                {translate('Categoría')}
                <div className="mt-1.5">
                  <Select value={filterDraft.category} onChange={(v) => setFilterDraft((d) => ({ ...d, category: v }))} searchable
                    options={[{ value: 'ALL', label: 'Todas' }, ...categoryOptions]} />
                </div>
              </label>
              <label className="text-sm font-medium text-slate-700">
                {translate('Proveedor')}
                <div className="mt-1.5">
                  <Select value={filterDraft.supplier} onChange={(v) => setFilterDraft((d) => ({ ...d, supplier: v }))} searchable
                    options={supplierFilterOptions} menuMinWidth={280} />
                </div>
              </label>
              <label className="text-sm font-medium text-slate-700">
                {translate('Desde')}
                <input type="date" value={filterDraft.from} max={filterDraft.to || undefined}
                  onChange={(e) => setFilterDraft((d) => ({ ...d, from: e.target.value }))}
                  className={`${inputCls} mt-1.5`} />
              </label>
              <label className="text-sm font-medium text-slate-700">
                {translate('Hasta')}
                <input type="date" value={filterDraft.to} min={filterDraft.from || undefined}
                  onChange={(e) => setFilterDraft((d) => ({ ...d, to: e.target.value }))}
                  className={`${inputCls} mt-1.5`} />
              </label>
            </div>
            {filterDraftDateInvalid && (
              <p role="alert" className="text-sm text-red-700">{translate('La fecha de inicio debe ser anterior o igual a la fecha de fin.')}</p>
            )}
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" onClick={clearFilterDraft}
                className="mr-auto rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">{translate('Borrar filtros')}</button>
              <button type="button" onClick={() => setFilterModalOpen(false)}
                className="rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">{translate('Cancelar')}</button>
              <button type="button" onClick={applyFilterDraft} disabled={filterDraftDateInvalid}
                className="rounded-lg bg-amber-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50">{translate('Aplicar filtros')}</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de detalle */}
      {detail && (
        <Modal onClose={closeDetail} maxW="max-w-3xl">
          <ModalHeader
            title={detail.title}
            subtitle={`${detail.expense_number || '—'} · ${fmtDate(detail.expense_date)}`}
            onClose={closeDetail}
          />
          <div className="space-y-5 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-medium text-slate-500">{translate('Importe')}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{fmtMoney(detail.amount)} <span className="text-base font-medium text-slate-400">{detail.currency}</span></p>
                {Number(detail.tax_amount) > 0 && <p className="text-xs text-slate-400 mt-0.5">incl. {fmtMoney(detail.tax_amount)} imp.</p>}
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-slate-500">{translate('Estado')}</p>
                  <StatusBadge status={detail.payment_status} />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="font-medium text-emerald-700">{fmtMoney(detail.paid_amount)} pagado</span>
                  <span className={detail.balance > 0 ? 'text-red-600' : 'text-slate-400'}>
                    {detail.balance > 0 ? `${fmtMoney(detail.balance)} rest.` : 'Pagado'}
                  </span>
                </div>
                <div className="mt-2"><PaidBar paid={Number(detail.paid_amount || 0)} total={Number(detail.amount || 0)} /></div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-slate-500">{translate('Proveedor')}</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{detail.supplier?.name || detail.supplier_name || '—'}</p>
                {detail.supplier_reference && <p className="text-xs text-slate-400">{detail.supplier_reference}</p>}
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">{translate('Categoría')}</p>
                <p className="mt-1 text-sm text-slate-900">{titleCase(detail.category)} · {titleCase(detail.expense_type)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">{translate('Vence')}</p>
                <p className={`mt-1 text-sm ${detail.overdue ? 'font-medium text-red-600' : 'text-slate-900'}`}>{detail.due_date ? fmtDate(detail.due_date) : '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">{translate('Factura')}</p>
                <p className="mt-1 text-sm text-slate-900">{detail.invoice_number || '—'}</p>
              </div>
            </div>

            {detail.notes && (
              <div>
                <p className="text-xs font-medium text-slate-500">{translate('Notas')}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{detail.notes}</p>
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" onClick={() => { closeDetail(); setDeleteTarget(detail); }} className={btnDanger}>
                <Trash2 aria-hidden="true" className="h-4 w-4" />{translate('Eliminar')}
              </button>
              <button type="button" onClick={() => { closeDetail(); openEdit(detail); }} className={btnGhost}>
                <Pencil aria-hidden="true" className="h-4 w-4" />{translate('Editar')}
              </button>
              {detail.balance > 0 && detail.payment_status !== 'cancelled' && (
                <button type="button" onClick={() => { closeDetail(); openPay(detail); }} className={btnPrimary}>
                  <Wallet aria-hidden="true" className="h-4 w-4" />{translate('Registrar pago')}
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de pago */}
      {payTarget && (
        <Modal onClose={() => setPayTarget(null)} maxW="max-w-md">
          <form onSubmit={handlePay}>
            <ModalHeader
              title={translate('Registrar pago')}
              subtitle={`${payTarget.title} · ${fmtMoney(payTarget.balance)} ${payTarget.currency} ${translate('pendiente')}`}
              onClose={() => setPayTarget(null)}
            />
            <div className="space-y-4 p-5">
              <label className="block text-sm font-medium text-slate-700">
                {translate('Importe')}
                <input type="number" min="0" step="0.01" value={payForm.amount}
                  onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))}
                  className={`${inputCls} mt-1.5`} required />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                {translate('Método')}
                <div className="mt-1.5">
                  <Select value={payForm.method} onChange={(v) => setPayForm((f) => ({ ...f, method: v }))} options={PAY_METHOD_OPTIONS} />
                </div>
              </label>
              <label className="block text-sm font-medium text-slate-700">
                {translate('Fecha')}
                <input type="date" value={payForm.date}
                  onChange={(e) => setPayForm((f) => ({ ...f, date: e.target.value }))}
                  className={`${inputCls} mt-1.5`} />
              </label>
              {payError && <p role="alert" className="text-sm text-red-700">{payError}</p>}
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setPayTarget(null)} disabled={saving}
                  className="rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50">{translate('Cancelar')}</button>
                <button type="submit" disabled={saving}
                  className="rounded-lg bg-amber-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50">
                  {saving ? translate('Guardando…') : translate('Registrar pago')}
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal de eliminación */}
      {deleteTarget && (
        <Modal onClose={() => setDeleteTarget(null)} maxW="max-w-md">
          <ModalHeader title={translate('Eliminar gasto')} subtitle={deleteTarget.title} onClose={() => setDeleteTarget(null)} />
          <div className="space-y-4 p-5">
            <p className="text-sm text-slate-600">{translate('Esta acción no se puede deshacer. ¿Seguro que quieres eliminar este gasto?')}</p>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={saving}
                className="rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50">{translate('Cancelar')}</button>
              <button type="button" onClick={handleDelete} disabled={saving} className={btnDanger}>
                <Trash2 aria-hidden="true" className="h-4 w-4" />
                {saving ? translate('Eliminando…') : translate('Eliminar')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de crear/editar */}
      {formOpen && (
        <Modal onClose={() => !saving && setFormOpen(false)}>
          <form onSubmit={handleSave}>
            <ModalHeader
              title={editingId ? translate('Editar gasto') : translate('Nuevo gasto')}
              subtitle={editingId ? form.title : translate('Registra un gasto y vincúlalo a proveedor y reserva.')}
              onClose={() => !saving && setFormOpen(false)}
            />
            <div className="space-y-4 p-5">
              <label className="block text-sm font-medium text-slate-700">
                {translate('Título')}
                <input value={form.title} onChange={setField('title')} className={`${inputCls} mt-1.5`} required />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  {translate('Categoría')}
                  <div className="mt-1.5">
                    <Select value={form.category} onChange={setSel('category')} searchable options={categoryOptions} />
                  </div>
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  {translate('Tipo')}
                  <div className="mt-1.5">
                    <Select value={form.expense_type} onChange={setSel('expense_type')} options={TYPE_OPTIONS} />
                  </div>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block text-sm font-medium text-slate-700">
                  {translate('Importe')}
                  <input type="number" min="0" step="0.01" value={form.amount} onChange={setField('amount')} className={`${inputCls} mt-1.5`} required />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  {translate('Impuesto')}
                  <input type="number" min="0" step="0.01" value={form.tax_amount} onChange={setField('tax_amount')} className={`${inputCls} mt-1.5`} />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  {translate('Moneda')}
                  <div className="mt-1.5">
                    <Select value={form.currency} onChange={setSel('currency')} options={CURRENCY_OPTIONS} />
                  </div>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  {translate('Proveedor')}
                  <div className="mt-1.5">
                    <Select value={form.supplier_id} onChange={pickSupplier} options={supplierFormOptions} searchable menuMinWidth={280} />
                  </div>
                </label>
                {!form.supplier_id && (
                  <label className="block text-sm font-medium text-slate-700">
                    {translate('Beneficiario')}
                    <input value={form.payee_name} onChange={setField('payee_name')} className={`${inputCls} mt-1.5`} placeholder={translate('Otro beneficiario')} />
                  </label>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  {translate('Reserva')}
                  <div className="mt-1.5">
                    <Select value={form.booking_id} onChange={setSel('booking_id')} options={bookingOptions} searchable />
                  </div>
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  {translate('Nº factura')}
                  <input value={form.invoice_number} onChange={setField('invoice_number')} className={`${inputCls} mt-1.5`} />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  {translate('Fecha del gasto')}
                  <input type="date" value={form.expense_date} onChange={setField('expense_date')} className={`${inputCls} mt-1.5`} />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  {translate('Vencimiento')}
                  <input type="date" value={form.due_date} onChange={setField('due_date')} className={`${inputCls} mt-1.5`} />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block text-sm font-medium text-slate-700">
                  {translate('Pagado')}
                  <input type="number" min="0" step="0.01" value={form.paid_amount} onChange={setField('paid_amount')} className={`${inputCls} mt-1.5`} />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  {translate('Método')}
                  <div className="mt-1.5">
                    <Select value={form.payment_method} onChange={setSel('payment_method')} options={METHOD_OPTIONS} />
                  </div>
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  {translate('Fecha de pago')}
                  <input type="date" value={form.paid_date} onChange={setField('paid_date')} className={`${inputCls} mt-1.5`} />
                </label>
              </div>

              <label className="block text-sm font-medium text-slate-700">
                {translate('Notas')}
                <textarea value={form.notes} onChange={setField('notes')} rows={3} className={`${inputCls} mt-1.5`} />
              </label>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={form.is_recurring} onChange={(e) => setForm((f) => ({ ...f, is_recurring: e.target.checked }))} />
                {translate('Gasto recurrente')}
              </label>
              {form.is_recurring && (
                <label className="block text-sm font-medium text-slate-700">
                  {translate('Frecuencia')}
                  <div className="mt-1.5">
                    <Select value={form.recurrence_frequency} onChange={setSel('recurrence_frequency')} options={FREQUENCY_OPTIONS} />
                  </div>
                </label>
              )}

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={form.is_cancelled} onChange={(e) => setForm((f) => ({ ...f, is_cancelled: e.target.checked }))} />
                {translate('Marcar como cancelado')}
              </label>

              {formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => !saving && setFormOpen(false)} disabled={saving}
                  className="rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50">{translate('Cancelar')}</button>
                <button type="submit" disabled={saving}
                  className="rounded-lg bg-amber-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50">
                  {saving ? translate('Guardando…') : editingId ? translate('Guardar cambios') : translate('Crear gasto')}
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </main>
  );
}