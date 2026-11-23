import { useAppSettings, translate, useAuth } from '@/context/index.jsx';
import React, { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Calendar as CalendarIcon, Search, Plus, DollarSign, Users, Compass, CheckCircle2,
  Clock, AlertCircle, XCircle, Phone, Mail, RefreshCw, X, AlertTriangle, Copy, Check,
  FileText, ChevronRight, ChevronDown, ArrowUpRight, StickyNote, MessageSquare, Wallet,
  UserPlus, UserCheck, Upload, Trash2, Edit, Download, File, Image as ImageIcon, Loader2,
  RotateCcw,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

/* ---------- Shared style tokens ---------- */
const inputCls =
  'w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition';
const labelCls = 'block text-xs font-medium text-slate-600 mb-1.5';
const btnGhost =
  'inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition';
const btnPrimary =
  'inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-500 shadow-sm transition disabled:opacity-50';
const btnDanger =
  'inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition';

const BOOKING_STATUS = {
  pending: { label: 'Pendiente', dot: 'bg-amber-500', cls: 'bg-amber-50 text-amber-800 ring-amber-200', icon: AlertCircle },
  confirmed: { label: 'Confirmada', dot: 'bg-emerald-500', cls: 'bg-emerald-50 text-emerald-800 ring-emerald-200', icon: CheckCircle2 },
  in_progress: { label: 'En curso', dot: 'bg-sky-500', cls: 'bg-sky-50 text-sky-800 ring-sky-200', icon: Clock },
  completed: { label: 'Completada', dot: 'bg-violet-500', cls: 'bg-violet-50 text-violet-800 ring-violet-200', icon: CheckCircle2 },
  cancelled: { label: 'Cancelada', dot: 'bg-rose-500', cls: 'bg-rose-50 text-rose-800 ring-rose-200', icon: XCircle },
};

const PAYMENT_STATUS = {
  paid: { label: 'Pagado', dot: 'bg-emerald-500', cls: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  partially_paid: { label: 'Parcial', dot: 'bg-amber-500', cls: 'bg-amber-50 text-amber-800 ring-amber-200' },
  overpaid: { label: 'Sobrepagado', dot: 'bg-violet-500', cls: 'bg-violet-50 text-violet-800 ring-violet-200' },
  unpaid: { label: 'Sin pagar', dot: 'bg-rose-500', cls: 'bg-rose-50 text-rose-800 ring-rose-200' },
};

const BOOKING_STATUS_OPTIONS = Object.entries(BOOKING_STATUS).map(([value, v]) => ({ value, label: v.label, dot: v.dot }));
const PAYMENT_STATUS_OPTIONS = Object.entries(PAYMENT_STATUS).map(([value, v]) => ({ value, label: v.label, dot: v.dot }));
const CURRENCY_OPTIONS = ['MAD', 'EUR', 'USD'].map((c) => ({ value: c, label: c }));
const METHOD_OPTIONS = [
  { value: 'bank_transfer', label: 'Transferencia bancaria' },
  { value: 'cash', label: 'Efectivo' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'other', label: 'Otro' },
];
const TXN_TYPE_OPTIONS = [
  { value: 'payment', label: 'Pago', hint: 'Suma al importe pagado', dot: 'bg-emerald-500' },
  { value: 'refund', label: 'Reembolso', hint: 'Resta del importe pagado', dot: 'bg-rose-500' },
];
const TXN_STATUS_OPTIONS = [
  { value: 'completed', label: 'Completada', hint: 'Bloqueada al guardar', dot: 'bg-emerald-500' },
  { value: 'pending', label: 'Pendiente', dot: 'bg-amber-500' },
  { value: 'failed', label: 'Fallida', dot: 'bg-rose-500' },
];
const INITIAL_STATUS_OPTIONS = BOOKING_STATUS_OPTIONS.filter((o) => ['pending', 'confirmed'].includes(o.value));

const EMPTY_FORM = (userId) => ({
  customer_id: '', destination: '', departure_date: '', return_date: '', traveler_count: 1,
  total_amount: '', currency: 'MAD', booking_status: 'pending', assigned_to: userId || '',
  special_requests: '', internal_notes: '', initial_payment_amount: '',
  payment_method: 'bank_transfer', payment_notes: 'Depósito inicial de la reserva',
});

const EMPTY_CUSTOMER = {
  first_name: '', last_name: '', phone: '', email: '', country: '',
};

const EMPTY_PAYMENT = {
  amount: '', payment_method: 'bank_transfer', transaction_status: 'completed',
  transaction_type: 'payment', transaction_reference: '', notes: '',
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Por definir';
const fmtMoney = (n) => Number(n || 0).toLocaleString('es-ES', { maximumFractionDigits: 2 });
const fmtBytes = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};
const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('') || '?';

/* ---------- Small presentational pieces ---------- */
function StatusBadge({ status }) {
  const s = BOOKING_STATUS[status] || BOOKING_STATUS.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${s.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function PaymentBadge({ status }) {
  const s = PAYMENT_STATUS[status] || PAYMENT_STATUS.unpaid;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${s.cls}`}>
      {s.label}
    </span>
  );
}

function Avatar({ name, size = 'w-8 h-8 text-xs' }) {
  return (
    <span className={`${size} shrink-0 rounded-full bg-slate-900 text-amber-100 font-semibold flex items-center justify-center`}>
      {initials(name)}
    </span>
  );
}

function PaidBar({ paid, total }) {
  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  return (
    <div className="w-full">
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[11px] text-slate-400 mt-1">{pct}% cobrado</p>
    </div>
  );
}

/* ---------- Custom dropdown ---------- */
function Select({
  value, onChange, options, placeholder = 'Selecciona…', searchable = false, prefix,
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

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (triggerRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onScroll = (e) => {
      if (menuRef.current?.contains(e.target)) return;
      place();
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', place);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', place);
    };
  }, [open, place]);

  useEffect(() => {
    if (open && searchable) searchRef.current?.focus();
  }, [open, searchable]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
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
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        openMenu();
      }
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
          {selected?.avatar && <Avatar name={selected.label} size="w-5 h-5 text-[9px]" />}
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
                  placeholder="Buscar"
                  aria-label="Buscar opciones"
                  className="w-full bg-stone-50 rounded-md pl-8 pr-2 py-1.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-500/30"
                />
              </div>
            </div>
          )}
          <ul ref={listRef} role="listbox" className="overflow-y-auto p-1">
            {visible.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-slate-400">{translate('Sin coincidencias')}</li>
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
                    {o.avatar && <Avatar name={o.label} size="w-6 h-6 text-[10px]" />}
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

function Modal({ children, onClose, maxW = 'max-w-2xl', dark = false }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`${dark ? 'bg-slate-900 text-slate-200 border-slate-700' : 'bg-white border-slate-200'} rounded-2xl w-full ${maxW} border shadow-2xl my-8 overflow-hidden rp-pop`}>
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
      <button onClick={onClose} className="p-1.5 -mr-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition" aria-label="Cerrar">
        <X className="w-5 h-5" />
      </button>
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

/* ---------- Empty state graphics ---------- */
function EmptyIllustrationReservations() {
  return (
    <svg viewBox="0 0 320 200" className="mx-auto h-40 w-auto" role="img" aria-label="Ilustración de reservas">
      <ellipse cx="160" cy="184" rx="110" ry="8" className="fill-slate-100" />
      <g transform="rotate(-4 100 100)">
        <rect x="38" y="52" width="120" height="78" rx="12" className="fill-white stroke-slate-200" strokeWidth="2" />
        <rect x="52" y="68" width="52" height="6" rx="3" className="fill-slate-200" />
        <rect x="52" y="82" width="80" height="5" rx="2.5" className="fill-slate-100" />
        <rect x="52" y="94" width="60" height="5" rx="2.5" className="fill-slate-100" />
        <rect x="52" y="108" width="36" height="10" rx="5" className="fill-emerald-100" />
      </g>
      <g transform="rotate(4 200 100)">
        <rect x="140" y="62" width="130" height="86" rx="12" className="fill-white stroke-amber-300" strokeWidth="2" />
        <rect x="156" y="78" width="26" height="26" rx="8" className="fill-amber-100" />
        <path d="M163 91v-5h12v5M160 91h18" className="stroke-amber-600" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="190" y="80" width="56" height="7" rx="3.5" className="fill-slate-300" />
        <rect x="190" y="93" width="36" height="5" rx="2.5" className="fill-slate-200" />
        <rect x="156" y="116" width="42" height="14" rx="7" className="fill-emerald-100" />
        <circle cx="166" cy="123" r="3" className="fill-emerald-500" />
        <rect x="206" y="121" width="40" height="5" rx="2.5" className="fill-slate-100" />
      </g>
      <circle cx="262" cy="52" r="20" className="fill-amber-500" />
      <path d="M262 43v18M253 52h18" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <circle cx="40" cy="40" r="4" className="fill-amber-200" />
      <circle cx="288" cy="120" r="3" className="fill-amber-300" />
      <circle cx="30" cy="150" r="3" className="fill-slate-200" />
    </svg>
  );
}

function EmptyStateReservations({ hasFilters, onClearFilters, onCreate }) {
  if (hasFilters) {
    return (
      <div className="px-6 py-16 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400">
          <Search aria-hidden="true" className="h-6 w-6" />
        </span>
        <h3 className="mt-4 text-base font-semibold text-slate-900">Ninguna reserva coincide con estos filtros</h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">Prueba con otra búsqueda o quita algunos filtros.</p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={onClearFilters} className={btnGhost}>
            <RotateCcw className="w-4 h-4" />Borrar todos los filtros
          </button>
          <button type="button" onClick={onCreate} className={btnPrimary}>
            <Plus className="w-4 h-4" />Nueva reserva
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="px-6 py-14 text-center">
      <EmptyIllustrationReservations />
      <h3 className="mt-4 text-xl font-semibold text-slate-900">Aún no hay reservas</h3>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500">
        Registra tu primera reserva para empezar a hacer seguimiento de viajeros, pagos y documentos en un solo lugar.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={onCreate} className={btnPrimary}>
          <Plus className="w-4 h-4" />Crear primera reserva
        </button>
        <button type="button" onClick={onClearFilters} className={btnGhost}>
          <RefreshCw className="w-4 h-4" />Actualizar
        </button>
      </div>
      <ol className="mx-auto mt-10 grid max-w-3xl gap-3 text-left sm:grid-cols-3">
        {[
          ['Elige o crea un cliente', 'Puedes usar uno existente o registrar uno nuevo en el acto.'],
          ['Añade los datos del viaje', 'Destino, fechas, viajeros e importe total.'],
          ['Registra el pago inicial', 'Opcional, pero acelera el cobro y el seguimiento.'],
        ].map(([title, text], i) => (
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

/* ---------- Page ---------- */
export default function ReservationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [reservations, setReservations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [payments, setPayments] = useState([]);
  const [financials, setFinancials] = useState([]);
  const [documents, setDocuments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [bookingStatusFilter, setBookingStatusFilter] = useState('ALL');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('ALL');
  const [destinationFilter, setDestinationFilter] = useState('ALL');
  const [employeeFilter, setEmployeeFilter] = useState('ALL');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailClosing, setDetailClosing] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [copiedSql, setCopiedSql] = useState(false);

  const [formData, setFormData] = useState(EMPTY_FORM(user?.id));
  const [customerMode, setCustomerMode] = useState('existing');
  const [newCustomer, setNewCustomer] = useState(EMPTY_CUSTOMER);
  const [paymentData, setPaymentData] = useState(EMPTY_PAYMENT);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const flash = (msg, ms = 4000) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), ms);
  };

  const openCreateModal = () => {
    setFormData(EMPTY_FORM(user?.id));
    setCustomerMode('existing');
    setNewCustomer(EMPTY_CUSTOMER);
    setError(null);
    setIsCreateModalOpen(true);
  };

  /* ----- Data ----- */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [bookingsRes, customersRes, profilesRes, paymentsRes, financialsRes, docsRes] = await Promise.all([
        supabase.from('bookings').select('*').order('created_at', { ascending: false }),
        supabase.from('customers').select('*').order('full_name', { ascending: true }),
        supabase.from('profiles').select('*'),
        supabase.from('booking_payments').select('*'),
        supabase.from('booking_financials').select('*'),
        supabase.from('booking_documents').select('*').order('created_at', { ascending: false }),
      ]);
      if (bookingsRes.error) throw bookingsRes.error;
      if (customersRes.error) throw customersRes.error;

      setReservations(bookingsRes.data || []);
      setCustomers(customersRes.data || []);
      setProfiles(profilesRes.data || []);
      setPayments(paymentsRes.error ? [] : paymentsRes.data || []);
      setFinancials(financialsRes.error ? [] : financialsRes.data || []);
      setDocuments(docsRes.error ? [] : docsRes.data || []);
    } catch (err) {
      console.error('Error fetching reservations data:', err);
      setError('No se pudieron cargar las reservas. Comprueba que las migraciones del esquema de reservas estén aplicadas en Supabase.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel('admin-bookings-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'booking_documents' }, fetchData)
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Realtime booking updates unavailable:', status);
        }
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const enrichedReservations = useMemo(() => {
    return reservations.map((res) => {
      const customer = customers.find((c) => c.id === res.customer_id) || { full_name: 'Cliente desconocido', phone: '', email: '' };
      const assignedProfile = profiles.find((p) => p.id === res.assigned_to) || { full_name: 'Sin asignar' };
      const fin = financials.find((f) => f.booking_id === res.id) || {};
      const resPayments = payments.filter((p) => p.booking_id === res.id);
      const resDocuments = documents.filter((d) => d.booking_id === res.id);

      const totalPaid =
        fin.net_paid !== undefined
          ? Number(fin.net_paid)
          : resPayments
              .filter((p) => p.transaction_status === 'completed')
              .reduce((sum, p) => sum + (p.transaction_type === 'payment' ? Number(p.amount) : -Number(p.amount)), 0);

      const totalAmount = Number(res.total_amount || 0);
      const balance = fin.outstanding_balance !== undefined ? Number(fin.outstanding_balance) : Math.max(0, totalAmount - totalPaid);

      let paymentStatus = fin.payment_status;
      if (paymentStatus === undefined) {
        if (totalPaid >= totalAmount && totalAmount > 0) paymentStatus = 'paid';
        else if (totalPaid > 0) paymentStatus = 'partially_paid';
        else paymentStatus = 'unpaid';
      }

      return { ...res, customer, assignedProfile, totalPaid, balance, paymentStatus, resPayments, resDocuments };
    });
  }, [reservations, customers, profiles, payments, financials, documents]);

  const selectedReservation = useMemo(
    () => enrichedReservations.find((r) => r.id === selectedId) || null,
    [enrichedReservations, selectedId]
  );

  const stats = useMemo(() => ({
    total: enrichedReservations.length,
    confirmed: enrichedReservations.filter((r) => r.booking_status === 'confirmed').length,
    pending: enrichedReservations.filter((r) => r.booking_status === 'pending').length,
    outstanding: enrichedReservations.reduce((sum, r) => sum + r.balance, 0),
  }), [enrichedReservations]);

  const uniqueDestinations = useMemo(
    () => Array.from(new Set(enrichedReservations.map((r) => r.destination).filter(Boolean))),
    [enrichedReservations]
  );

  const destinationOptions = useMemo(
    () => [{ value: 'ALL', label: 'Todos' }, ...uniqueDestinations.map((d) => ({ value: d, label: d }))],
    [uniqueDestinations]
  );
  const employeeOptions = useMemo(
    () => [
      { value: 'ALL', label: 'Todos' },
      ...profiles.map((p) => ({ value: p.id, label: p.full_name || p.email || 'Empleado', hint: p.full_name ? p.email : undefined, avatar: true })),
    ],
    [profiles]
  );
  const assignOptions = useMemo(
    () => [
      { value: '', label: 'Sin asignar' },
      ...profiles.map((p) => ({ value: p.id, label: p.full_name || p.email || 'Empleado', hint: p.full_name ? p.email : undefined, avatar: true })),
    ],
    [profiles]
  );
  const customerOptions = useMemo(
    () => customers.map((c) => ({ value: c.id, label: c.full_name, hint: c.phone || c.email || 'Sin datos de contacto', avatar: true })),
    [customers]
  );

  const filteredReservations = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return enrichedReservations.filter((res) => {
      const matchesSearch =
        !q ||
        res.booking_reference?.toLowerCase().includes(q) ||
        res.customer?.full_name?.toLowerCase().includes(q) ||
        res.customer?.phone?.includes(searchQuery) ||
        res.destination?.toLowerCase().includes(q) ||
        res.offer_title?.toLowerCase().includes(q) ||
        res.offer_reference?.toLowerCase().includes(q);
      return (
        matchesSearch &&
        (bookingStatusFilter === 'ALL' || res.booking_status === bookingStatusFilter) &&
        (paymentStatusFilter === 'ALL' || res.paymentStatus === paymentStatusFilter) &&
        (destinationFilter === 'ALL' || res.destination === destinationFilter) &&
        (employeeFilter === 'ALL' || res.assigned_to === employeeFilter)
      );
    });
  }, [enrichedReservations, searchQuery, bookingStatusFilter, paymentStatusFilter, destinationFilter, employeeFilter]);

  const hasFilters = searchQuery || bookingStatusFilter !== 'ALL' || paymentStatusFilter !== 'ALL' || destinationFilter !== 'ALL' || employeeFilter !== 'ALL';

  const clearFilters = () => {
    setSearchQuery(''); setBookingStatusFilter('ALL'); setPaymentStatusFilter('ALL');
    setDestinationFilter('ALL'); setEmployeeFilter('ALL');
  };

  /* ----- Detail sheet open / close ----- */
  const openDetail = (res) => {
    setSelectedId(res.id);
    setDetailClosing(false);
    setIsDetailOpen(true);
  };

  const closeDetail = useCallback(() => {
    setDetailClosing(true);
    setTimeout(() => {
      setIsDetailOpen(false);
      setDetailClosing(false);
    }, 260);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (isPaymentModalOpen) setIsPaymentModalOpen(false);
      else if (isCreateModalOpen) setIsCreateModalOpen(false);
      else if (isEditModalOpen) setIsEditModalOpen(false);
      else if (isDeleteModalOpen) setIsDeleteModalOpen(false);
      else if (isSqlModalOpen) setIsSqlModalOpen(false);
      else if (isDetailOpen) closeDetail();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isPaymentModalOpen, isCreateModalOpen, isEditModalOpen, isDeleteModalOpen, isSqlModalOpen, isDetailOpen, closeDetail]);

  useEffect(() => {
    document.body.style.overflow = isDetailOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isDetailOpen]);

  /* ----- Actions ----- */
  const handleCreateReservation = async (e) => {
    e.preventDefault();
    if ((customerMode === 'existing' && !formData.customer_id) ||
      (customerMode === 'new' && (!newCustomer.first_name.trim() || !newCustomer.last_name.trim() || !newCustomer.phone.trim())) ||
      formData.total_amount === '' || !formData.departure_date) {
      setError('Completa los datos del cliente, la fecha de salida y el importe total.');
      return;
    }
    try {
      setFormSubmitting(true);
      setError(null);

      let customerId = formData.customer_id;
      if (customerMode === 'new') {
        const firstName = newCustomer.first_name.trim();
        const lastName = newCustomer.last_name.trim();
        const { data: createdCustomer, error: customerError } = await supabase
          .from('customers')
          .insert([{
            first_name: firstName,
            last_name: lastName,
            full_name: `${firstName} ${lastName}`,
            phone: newCustomer.phone.trim(),
            email: newCustomer.email.trim() || null,
            country: newCustomer.country.trim() || null,
            customer_status: 'active',
            customer_source: 'admin_booking',
            created_by: user?.id,
          }])
          .select('id, full_name, phone, email')
          .single();
        if (customerError) throw customerError;
        if (!createdCustomer) throw new Error('No se devolvió el registro del nuevo cliente.');

        customerId = createdCustomer.id;
        setCustomers((current) => [createdCustomer, ...current.filter((customer) => customer.id !== createdCustomer.id)]);
        setCustomerMode('existing');
        setFormData((current) => ({ ...current, customer_id: createdCustomer.id }));
      }

      const { data: insertedBooking, error: insertError } = await supabase
        .from('bookings')
        .insert([{
          customer_id: customerId,
          destination: formData.destination || 'Viaje general',
          departure_date: formData.departure_date,
          return_date: formData.return_date || null,
          traveler_count: Number(formData.traveler_count) || 1,
          total_amount: Number(formData.total_amount),
          currency: formData.currency || 'MAD',
          booking_status: formData.booking_status || 'pending',
          assigned_to: formData.assigned_to || user?.id || null,
          special_requests: formData.special_requests || null,
          internal_notes: formData.internal_notes || null,
          created_by: user?.id,
        }])
        .select()
        .single();
      if (insertError) throw insertError;

      if (Number(formData.initial_payment_amount) > 0 && insertedBooking) {
        const { error: paymentError } = await supabase.from('booking_payments').insert([{
          booking_id: insertedBooking.id,
          transaction_type: 'payment',
          amount: Number(formData.initial_payment_amount),
          currency: formData.currency || 'MAD',
          payment_method: formData.payment_method,
          transaction_status: 'completed',
          notes: formData.payment_notes,
          recorded_by: user?.id,
        }]);
        if (paymentError) console.error('Error inserting initial payment:', paymentError);
      }

      flash('Reserva creada.');
      setIsCreateModalOpen(false);
      setFormData(EMPTY_FORM(user?.id));
      setCustomerMode('existing');
      setNewCustomer(EMPTY_CUSTOMER);
      await fetchData();
    } catch (err) {
      console.error('Error creating reservation:', err);
      setError('No se pudo crear la reserva: ' + (err.message || 'Error desconocido'));
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditReservation = async (e) => {
    e.preventDefault();
    if (!selectedReservation) return;
    try {
      setFormSubmitting(true);
      setError(null);
      const { error: updateError } = await supabase.from('bookings').update({
        destination: formData.destination,
        departure_date: formData.departure_date,
        return_date: formData.return_date || null,
        traveler_count: Number(formData.traveler_count) || 1,
        total_amount: Number(formData.total_amount),
        currency: formData.currency || 'MAD',
        booking_status: formData.booking_status,
        assigned_to: formData.assigned_to || null,
        special_requests: formData.special_requests || null,
        internal_notes: formData.internal_notes || null,
      }).eq('id', selectedReservation.id);

      if (updateError) throw updateError;
      flash('Reserva actualizada correctamente.');
      setIsEditModalOpen(false);
      await fetchData();
    } catch (err) {
      console.error('Error updating reservation:', err);
      setError('No se pudo actualizar la reserva: ' + (err.message || 'Error desconocido'));
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteReservation = async () => {
    if (!selectedReservation) return;
    try {
      setFormSubmitting(true);
      const { error: delError } = await supabase.from('bookings').delete().eq('id', selectedReservation.id);
      if (delError) throw delError;

      flash('Reserva eliminada.');
      setIsDeleteModalOpen(false);
      closeDetail();
      await fetchData();
    } catch (err) {
      console.error('Error deleting reservation:', err);
      setError('No se pudo eliminar la reserva: ' + (err.message || 'Error desconocido'));
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    if (!selectedReservation || !paymentData.amount) return;
    try {
      setFormSubmitting(true);
      setError(null);
      const { error: paymentError } = await supabase.from('booking_payments').insert([{
        booking_id: selectedReservation.id,
        transaction_type: paymentData.transaction_type,
        amount: Number(paymentData.amount),
        currency: selectedReservation.currency || 'MAD',
        payment_method: paymentData.payment_method,
        transaction_status: paymentData.transaction_status,
        transaction_reference: paymentData.transaction_reference || null,
        notes: paymentData.notes || null,
        recorded_by: user?.id,
      }]);
      if (paymentError) throw paymentError;

      flash('Transacción registrada.');
      setIsPaymentModalOpen(false);
      setPaymentData(EMPTY_PAYMENT);
      await fetchData();
    } catch (err) {
      console.error('Error recording payment:', err);
      setError('No se pudo registrar la transacción: ' + (err.message || 'Error desconocido'));
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleUpdateStatus = async (reservationId, newStatus) => {
    try {
      setError(null);
      const { error: updateError } = await supabase.from('bookings').update({ booking_status: newStatus }).eq('id', reservationId);
      if (updateError) throw updateError;
      flash(`Estado cambiado a ${BOOKING_STATUS[newStatus]?.label || newStatus}.`, 3000);
      await fetchData();
    } catch (err) {
      console.error('Error updating status:', err);
      setError('No se pudo actualizar el estado de la reserva.');
    }
  };

  /* ----- Document Upload & Delete ----- */
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedReservation) return;

    try {
      setIsUploading(true);
      setError(null);

      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedReservation.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('booking-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('booking-documents')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase.from('booking_documents').insert([{
        booking_id: selectedReservation.id,
        file_name: file.name,
        file_url: publicUrl,
        file_size: file.size,
        file_type: file.type,
        uploaded_by: user?.id,
      }]);

      if (dbError) throw dbError;

      flash('Documento subido correctamente.');
      await fetchData();
    } catch (err) {
      console.error('Upload error:', err);
      setError('No se pudo subir el documento: ' + (err.message || 'Error desconocido'));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteDocument = async (docId, fileUrl) => {
    if (!window.confirm('¿Seguro que quieres eliminar este documento?')) return;

    try {
      setError(null);

      const { error: dbError } = await supabase.from('booking_documents').delete().eq('id', docId);
      if (dbError) throw dbError;

      const filePath = fileUrl.split('/').slice(-2).join('/');
      if (filePath) {
        await supabase.storage.from('booking-documents').remove([filePath]);
      }

      flash('Documento eliminado.');
      await fetchData();
    } catch (err) {
      console.error('Delete doc error:', err);
      setError('No se pudo eliminar el documento: ' + (err.message || 'Error desconocido'));
    }
  };

  const sqlMigrationCode = `-- Fragmento de migración para el seguimiento de documentos`;

  const statCards = [
    { label: 'Total reservas', value: stats.total, icon: CalendarIcon, tone: 'text-slate-900', chip: 'bg-slate-100 text-slate-600' },
    { label: 'Confirmadas', value: stats.confirmed, icon: CheckCircle2, tone: 'text-emerald-600', chip: 'bg-emerald-50 text-emerald-600' },
    { label: 'Pendientes', value: stats.pending, icon: Clock, tone: 'text-amber-600', chip: 'bg-amber-50 text-amber-600' },
    { label: 'Saldo pendiente', value: `${fmtMoney(stats.outstanding)} MAD`, icon: Wallet, tone: 'text-slate-900', chip: 'bg-violet-50 text-violet-600' },
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
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">{translate('Reservas')}</h1>
            <p className="text-sm text-slate-500 mt-1">{translate('Reservas, viajeros y pagos en un solo lugar.')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setIsSqlModalOpen(true)} className={btnGhost}>
              <FileText className="w-4 h-4 text-slate-500" />{translate('Migración SQL')}</button>
            <button onClick={fetchData} className={btnGhost} title="Actualizar registros">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />{translate('Actualizar')}</button>
            <button onClick={openCreateModal} className={btnPrimary}>
              <Plus className="w-4 h-4" />{translate('Nueva reserva')}</button>
          </div>
        </div>

        {/* Banners */}
        {successMessage && (
          <div role="status" className="px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 text-sm rp-pop">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> {successMessage}
          </div>
        )}
        {error && (
          <div role="alert" className="px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800 text-sm rp-pop">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="p-1 hover:bg-rose-100 rounded" aria-label="Descartar"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(({ label, value, icon: Icon, tone, chip }) => (
            <div key={label} className="bg-white p-5 rounded-xl border border-slate-200/80 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-slate-500">{label}</p>
                <p className={`text-2xl font-semibold mt-1 truncate ${tone}`}>{value}</p>
              </div>
              <span className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${chip}`}>
                <Icon className="w-5 h-5" />
              </span>
            </div>
          ))}
        </div>

        {/* Table card with toolbar */}
        <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
          <div className="p-4 border-b border-slate-100 space-y-3">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por referencia, cliente, teléfono o destino"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`${inputCls} pl-9`}
                />
              </div>
              <Select
                className="lg:w-52"
                prefix="Estado"
                ariaLabel="Filtro de estado de reserva"
                value={bookingStatusFilter}
                onChange={setBookingStatusFilter}
                options={[{ value: 'ALL', label: 'Todos' }, ...BOOKING_STATUS_OPTIONS]}
              />
              <Select
                className="lg:w-52"
                prefix="Pago"
                ariaLabel="Filtro de estado de pago"
                value={paymentStatusFilter}
                onChange={setPaymentStatusFilter}
                options={[{ value: 'ALL', label: 'Todos' }, ...PAYMENT_STATUS_OPTIONS]}
              />
              <Select
                className="lg:w-56"
                prefix="Destino"
                ariaLabel="Filtro de destino"
                value={destinationFilter}
                onChange={setDestinationFilter}
                options={destinationOptions}
                searchable={destinationOptions.length > 7}
              />
              <Select
                className="lg:w-56"
                prefix="Asignado"
                ariaLabel="Filtro de empleado asignado"
                value={employeeFilter}
                onChange={setEmployeeFilter}
                options={employeeOptions}
                searchable={employeeOptions.length > 7}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{filteredReservations.length} de {enrichedReservations.length} reservas</span>
              {hasFilters && (
                <button onClick={clearFilters} className="font-medium text-amber-700 hover:text-amber-800 underline underline-offset-2">
                  {translate('Borrar filtros')}
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1100px]">
              <thead>
                <tr className="bg-stone-50 border-b border-slate-100 text-xs font-medium text-slate-500">
                  <th className="py-3 px-4">{translate('Referencia')}</th>
                  <th className="py-3 px-4">{translate('Cliente')}</th>
                  <th className="py-3 px-4">{translate('Viaje')}</th>
                  <th className="py-3 px-4">{translate('Fechas')}</th>
                  <th className="py-3 px-4 text-center">{translate('Viajeros')}</th>
                  <th className="py-3 px-4 w-52">{translate('Pago')}</th>
                  <th className="py-3 px-4">{translate('Estado')}</th>
                  <th className="py-3 px-4">{translate('Asignado a')}</th>
                  <th className="py-3 px-4 w-24" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="py-16 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-600" />{translate('Cargando reservas…')}</td>
                  </tr>
                ) : filteredReservations.length === 0 ? (
                  <tr>
                    <td colSpan="9">
                      <EmptyStateReservations hasFilters={hasFilters} onClearFilters={clearFilters} onCreate={openCreateModal} />
                    </td>
                  </tr>
                ) : (
                  filteredReservations.map((res) => (
                    <tr
                      key={res.id}
                      tabIndex={0}
                      onClick={() => openDetail(res)}
                      onKeyDown={(e) => { if (e.key === 'Enter') openDetail(res); }}
                      className="group cursor-pointer hover:bg-amber-50/40 focus:outline-none focus-visible:bg-amber-50/60 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono text-xs font-semibold text-amber-700 whitespace-nowrap">{res.booking_reference}</td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={res.customer.full_name} />
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 truncate">{res.customer.full_name}</p>
                            <p className="text-xs text-slate-400 truncate">{res.customer.phone || res.customer.email || 'Sin contacto'}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-medium text-slate-900">{res.offer_title || res.destination || 'Viaje general'}</p>
                        {res.offer_reference && <p className="text-xs text-amber-700">{res.offer_reference}</p>}
                        {res.offer_title && res.destination && <p className="text-xs text-slate-400">{res.destination}</p>}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <p>{fmtDate(res.departure_date)}</p>
                        <p className="text-xs text-slate-400">a {fmtDate(res.return_date)}</p>
                      </td>

                      <td className="py-3.5 px-4 text-center font-medium">{res.traveler_count || 1}</td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="font-semibold text-slate-900 whitespace-nowrap">{fmtMoney(res.total_amount)} {res.currency}</span>
                          <PaymentBadge status={res.paymentStatus} />
                        </div>
                        <PaidBar paid={res.totalPaid} total={Number(res.total_amount || 0)} />
                      </td>

                      <td className="py-3.5 px-4"><StatusBadge status={res.booking_status} /></td>

                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">{res.assignedProfile?.full_name || 'Sin asignar'}</td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedId(res.id); setIsPaymentModalOpen(true); }}
                            onKeyDown={(e) => e.stopPropagation()}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                            title="Añadir pago"
                            aria-label="Añadir pago"
                          >
                            <DollarSign className="w-4 h-4" />
                          </button>
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600 transition" />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ================= DETAIL SLIDE-UP SHEET ================= */}
      {isDetailOpen && selectedReservation && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={`Reserva ${selectedReservation.booking_reference}`}>
          <div
            className={`absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] ${detailClosing ? 'rp-backdrop-out' : 'rp-backdrop-in'}`}
            onClick={closeDetail}
          />
          <div
            className={`absolute bottom-0 left-0 w-full h-[75vh] bg-stone-50 rounded-t-3xl shadow-[0_-20px_60px_-15px_rgba(15,23,42,0.35)] flex flex-col ${detailClosing ? 'rp-sheet-out' : 'rp-sheet-in'}`}
          >
            <div className="flex justify-center pt-3 pb-1">
              <button onClick={closeDetail} className="w-12 h-1.5 rounded-full bg-slate-300 hover:bg-slate-400 transition" aria-label="Cerrar panel" />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 px-6 lg:px-10 py-3 border-b border-slate-200 bg-stone-50">
              <div className="flex items-center gap-4 min-w-0">
                <Avatar name={selectedReservation.customer.full_name} size="w-12 h-12 text-sm" />
                <div className="min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-lg font-semibold text-slate-900 truncate">{selectedReservation.customer.full_name}</h3>
                    <span className="font-mono text-xs font-semibold text-amber-700 bg-amber-50 ring-1 ring-inset ring-amber-200 px-2 py-0.5 rounded">
                      {selectedReservation.booking_reference}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Creada el {fmtDate(selectedReservation.created_at)}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <PaymentBadge status={selectedReservation.paymentStatus} />
                <Select
                  compact
                  className="w-48"
                  prefix="Estado"
                  ariaLabel="Cambiar estado de la reserva"
                  value={selectedReservation.booking_status || 'pending'}
                  onChange={(v) => handleUpdateStatus(selectedReservation.id, v)}
                  options={BOOKING_STATUS_OPTIONS}
                />

                <button onClick={() => {
                  setFormData({
                    customer_id: selectedReservation.customer_id,
                    destination: selectedReservation.destination || '',
                    departure_date: selectedReservation.departure_date || '',
                    return_date: selectedReservation.return_date || '',
                    traveler_count: selectedReservation.traveler_count || 1,
                    total_amount: selectedReservation.total_amount || '',
                    currency: selectedReservation.currency || 'MAD',
                    booking_status: selectedReservation.booking_status || 'pending',
                    assigned_to: selectedReservation.assigned_to || '',
                    special_requests: selectedReservation.special_requests || '',
                    internal_notes: selectedReservation.internal_notes || '',
                  });
                  setIsEditModalOpen(true);
                }} className={btnGhost}>
                  <Edit className="w-4 h-4" />{translate('Editar')}</button>

                <button onClick={() => setIsDeleteModalOpen(true)} className={btnDanger}>
                  <Trash2 className="w-4 h-4" />{translate('Eliminar')}</button>

                <button onClick={() => setIsPaymentModalOpen(true)} className={btnPrimary}>
                  <Plus className="w-4 h-4" />{translate('Añadir pago')}</button>
                <button onClick={closeDetail} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition" aria-label="Cerrar">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 lg:px-10 py-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-[1500px] mx-auto">
                <div className="space-y-4">
                  <section className="bg-white rounded-xl border border-slate-200/80 p-5 space-y-3">
                    <SectionTitle icon={Users}>{translate('Cliente')}</SectionTitle>
                    <div className="space-y-2 text-sm">
                      <p className="font-medium text-slate-900">{selectedReservation.customer.full_name}</p>
                      <p className="text-slate-600 flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-400" /> {selectedReservation.customer.phone || 'Sin teléfono'}</p>
                      <p className="text-slate-600 flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-slate-400" /> {selectedReservation.customer.email || 'Sin correo'}</p>
                    </div>
                  </section>

                  <section className="bg-white rounded-xl border border-slate-200/80 p-5 space-y-3">
                    <SectionTitle icon={Compass}>{translate('Viaje')}</SectionTitle>
                    <div className="space-y-2 text-sm">
                      {selectedReservation.offer_title && (
                        <div>
                          <p className="font-medium text-slate-900">{selectedReservation.offer_title}</p>
                          {selectedReservation.offer_reference && <p className="text-xs text-slate-500">Ref. del paquete: {selectedReservation.offer_reference}</p>}
                          {selectedReservation.offer_id && (
                            <button
                              type="button"
                              onClick={() => navigate(`/admin/packages-services/${selectedReservation.offer_id}`)}
                              className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 hover:underline mt-1"
                            >
                              Abrir paquete en admin <ArrowUpRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                      <p className="text-slate-700"><span className="text-slate-400">{translate('Destino')}</span> &nbsp;{selectedReservation.destination || 'Por definir'}</p>
                      <p className="text-slate-700 flex items-center gap-2">
                        <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                        {fmtDate(selectedReservation.departure_date)} a {fmtDate(selectedReservation.return_date)}
                      </p>
                      <p className="text-slate-700"><span className="text-slate-400">{translate('Viajeros')}</span> &nbsp;<span className="font-semibold">{selectedReservation.traveler_count || 1}</span></p>
                      <p className="text-slate-700"><span className="text-slate-400">{translate('Asignado a')}</span> &nbsp;{selectedReservation.assignedProfile?.full_name || 'Sin asignar'}</p>
                    </div>
                  </section>
                </div>

                <div className="lg:col-span-2 space-y-4">
                  <section className="bg-white rounded-xl border border-slate-200/80 p-5 space-y-5">
                    <SectionTitle icon={Wallet}>{translate('Pagos')}</SectionTitle>

                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { l: 'Total', v: selectedReservation.total_amount, c: 'text-slate-900' },
                        { l: 'Neto cobrado', v: selectedReservation.totalPaid, c: 'text-emerald-600' },
                        { l: 'Saldo pendiente', v: selectedReservation.balance, c: selectedReservation.balance > 0 ? 'text-rose-600' : 'text-slate-700' },
                      ].map((x) => (
                        <div key={x.l} className="bg-stone-50 rounded-lg px-4 py-3">
                          <p className="text-xs text-slate-500">{x.l}</p>
                          <p className={`text-lg font-semibold mt-0.5 ${x.c}`}>{fmtMoney(x.v)} <span className="text-xs font-medium text-slate-400">{selectedReservation.currency}</span></p>
                        </div>
                      ))}
                    </div>
                    <PaidBar paid={selectedReservation.totalPaid} total={Number(selectedReservation.total_amount || 0)} />

                    <div>
                      <p className="text-sm font-medium text-slate-800 mb-2">{translate('Transacciones')}</p>
                      {selectedReservation.resPayments.length === 0 ? (
                        <div className="border border-dashed border-slate-200 rounded-lg py-6 text-center text-sm text-slate-500">{translate('Sin transacciones todavía.')}</div>
                      ) : (
                        <div className="border border-slate-200 rounded-lg overflow-x-auto">
                          <table className="w-full text-left text-sm min-w-[520px]">
                            <thead className="bg-stone-50 text-xs text-slate-500">
                              <tr>
                                <th className="py-2 px-3 font-medium">{translate('Tipo')}</th>
                                <th className="py-2 px-3 font-medium">{translate('Fecha')}</th>
                                <th className="py-2 px-3 font-medium">{translate('Método')}</th>
                                <th className="py-2 px-3 font-medium">{translate('Estado')}</th>
                                <th className="py-2 px-3 font-medium text-right">{translate('Importe')}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {selectedReservation.resPayments.map((pay) => (
                                <tr key={pay.id}>
                                  <td className="py-2 px-3 font-medium text-slate-800">{pay.transaction_type === 'refund' ? 'Reembolso' : 'Pago'}</td>
                                  <td className="py-2 px-3 text-slate-600">{fmtDate(pay.transaction_date || pay.created_at)}</td>
                                  <td className="py-2 px-3 text-slate-700">{(pay.payment_method || '').replace('_', ' ')}</td>
                                  <td className="py-2 px-3 text-slate-600">{pay.transaction_status === 'completed' ? 'Completada' : pay.transaction_status === 'pending' ? 'Pendiente' : 'Fallida'}</td>
                                  <td className={`py-2 px-3 text-right font-semibold ${pay.transaction_type === 'refund' ? 'text-rose-600' : 'text-emerald-600'}`}>
                                    {pay.transaction_type === 'refund' ? '−' : '+'}{fmtMoney(pay.amount)} {pay.currency}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </section>

                  <section className="bg-white rounded-xl border border-slate-200/80 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <SectionTitle icon={FileText}>{translate('Documentos y archivos adjuntos')}</SectionTitle>
                      <div className="relative">
                        <input
                          type="file"
                          className="hidden"
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                          accept="image/*,.pdf,.doc,.docx"
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className={btnGhost}
                        >
                          {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                          {isUploading ? 'Subiendo…' : 'Subir documento'}
                        </button>
                      </div>
                    </div>

                    {selectedReservation.resDocuments.length === 0 ? (
                      <div className="border border-dashed border-slate-200 rounded-lg py-8 text-center bg-stone-50/50">
                        <File className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        <p className="text-sm font-medium text-slate-700">{translate('Aún no hay documentos')}</p>
                        <p className="text-xs text-slate-500 mt-1">{translate('Sube billetes, pasaportes o itinerarios.')}</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedReservation.resDocuments.map((doc) => {
                          const isImage = doc.file_type?.startsWith('image/');
                          return (
                            <div key={doc.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-white group hover:border-amber-300 transition-colors">
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center shrink-0 text-slate-500">
                                  {isImage ? <ImageIcon className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                                </span>
                                <div className="min-w-0 pr-2">
                                  <p className="text-sm font-medium text-slate-900 truncate" title={doc.file_name}>{doc.file_name}</p>
                                  <p className="text-xs text-slate-500">{fmtBytes(doc.file_size)}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <a
                                  href={doc.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded"
                                  title="Descargar"
                                >
                                  <Download className="w-4 h-4" />
                                </a>
                                <button
                                  onClick={() => handleDeleteDocument(doc.id, doc.file_url)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                </div>

                <section className="bg-white rounded-xl border border-slate-200/80 p-5 lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <SectionTitle icon={MessageSquare}>{translate('Solicitudes especiales')}</SectionTitle>
                    <p className="text-sm text-slate-600 mt-2">{selectedReservation.special_requests || 'Sin especificar.'}</p>
                  </div>
                  <div>
                    <SectionTitle icon={StickyNote}>{translate('Notas internas')}</SectionTitle>
                    <p className="text-sm text-slate-600 mt-2">{selectedReservation.internal_notes || 'Sin especificar.'}</p>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= EDIT MODAL ================= */}
      {isEditModalOpen && selectedReservation && (
        <Modal onClose={() => setIsEditModalOpen(false)}>
          <ModalHeader title="Editar reserva" subtitle={`Ref: ${selectedReservation.booking_reference}`} onClose={() => setIsEditModalOpen(false)} />
          <form onSubmit={handleEditReservation} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            <div className="space-y-3">
              <SectionTitle icon={Compass}>{translate('Detalles del viaje')}</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>{translate('Destino *')}</label>
                  <input type="text" required placeholder="p. ej. Marrakech" value={formData.destination} onChange={(e) => setFormData((p) => ({ ...p, destination: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{translate('Viajeros *')}</label>
                  <input type="number" min="1" required value={formData.traveler_count} onChange={(e) => setFormData((p) => ({ ...p, traveler_count: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{translate('Fecha de salida *')}</label>
                  <input type="date" required value={formData.departure_date} onChange={(e) => setFormData((p) => ({ ...p, departure_date: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{translate('Fecha de regreso')}</label>
                  <input type="date" min={formData.departure_date || undefined} value={formData.return_date} onChange={(e) => setFormData((p) => ({ ...p, return_date: e.target.value }))} className={inputCls} />
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-5 border-t border-slate-100">
              <SectionTitle icon={DollarSign}>{translate('Precio y estado')}</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className={labelCls}>{translate('Importe total *')}</label>
                  <input type="number" step="0.01" required placeholder="0.00" value={formData.total_amount} onChange={(e) => setFormData((p) => ({ ...p, total_amount: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{translate('Moneda')}</label>
                  <Select value={formData.currency} onChange={(v) => setFormData((p) => ({ ...p, currency: v }))} options={CURRENCY_OPTIONS} ariaLabel="Moneda" menuMinWidth={120} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelCls}>{translate('Empleado asignado')}</label>
                  <Select
                    searchable={assignOptions.length > 7}
                    value={formData.assigned_to}
                    onChange={(v) => setFormData((p) => ({ ...p, assigned_to: v }))}
                    options={assignOptions}
                    placeholder="Selecciona un empleado"
                    ariaLabel="Empleado asignado"
                    menuMinWidth={280}
                  />
                </div>
                <div>
                  <label className={labelCls}>{translate('Estado')}</label>
                  <Select value={formData.booking_status} onChange={(v) => setFormData((p) => ({ ...p, booking_status: v }))} options={BOOKING_STATUS_OPTIONS} ariaLabel="Estado" />
                </div>
              </div>
              <div>
                <label className={labelCls}>{translate('Solicitudes especiales')}</label>
                <textarea rows="2" value={formData.special_requests} onChange={(e) => setFormData((p) => ({ ...p, special_requests: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{translate('Notas internas')}</label>
                <textarea rows="2" value={formData.internal_notes} onChange={(e) => setFormData((p) => ({ ...p, internal_notes: e.target.value }))} className={inputCls} />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-100">
              <button type="button" onClick={() => setIsEditModalOpen(false)} className={btnGhost}>{translate('Cancelar')}</button>
              <button type="submit" disabled={formSubmitting} className={btnPrimary}>{formSubmitting ? 'Guardando…' : 'Guardar cambios'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ================= DELETE CONFIRMATION MODAL ================= */}
      {isDeleteModalOpen && selectedReservation && (
        <Modal onClose={() => setIsDeleteModalOpen(false)} maxW="max-w-md">
          <div className="p-6 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-rose-100 text-rose-600 mb-4">
              <AlertTriangle className="w-6 h-6" />
            </span>
            <h3 className="text-lg font-semibold text-slate-900">{translate('¿Eliminar esta reserva?')}</h3>
            <p className="mt-2 text-sm text-slate-600">
              ¿Seguro que quieres eliminar la reserva <strong>{selectedReservation.booking_reference}</strong>{translate('? También se eliminarán todos los pagos y documentos asociados. Esta acción no se puede deshacer.')}</p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button type="button" onClick={() => setIsDeleteModalOpen(false)} className={btnGhost}>{translate('Cancelar')}</button>
              <button type="button" onClick={handleDeleteReservation} disabled={formSubmitting} className={btnDanger}>
                {formSubmitting ? 'Eliminando…' : 'Eliminar reserva'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ================= CREATE RESERVATION ================= */}
      {isCreateModalOpen && (
        <Modal onClose={() => setIsCreateModalOpen(false)}>
          <ModalHeader title="Nueva reserva" subtitle="Añade una reserva y, opcionalmente, su primer pago." onClose={() => setIsCreateModalOpen(false)} />
          <form onSubmit={handleCreateReservation} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            <div className="space-y-3">
              <SectionTitle icon={Users}>{translate('Cliente')}</SectionTitle>
              <div role="tablist" aria-label="Origen del cliente" className="grid grid-cols-2 gap-1 p-1 bg-stone-100 rounded-lg">
                {[
                  { mode: 'existing', label: 'Cliente existente', icon: UserCheck },
                  { mode: 'new', label: 'Cliente nuevo', icon: UserPlus },
                ].map(({ mode, label, icon: Icon }) => (
                  <button
                    key={mode}
                    type="button"
                    role="tab"
                    aria-selected={customerMode === mode}
                    onClick={() => { setCustomerMode(mode); setFormData((p) => ({ ...p, customer_id: '' })); }}
                    className={`inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition
                      ${customerMode === mode ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <Icon className="w-4 h-4" /> {label}
                  </button>
                ))}
              </div>

              {customerMode === 'existing' ? (
                <div>
                  <label className={labelCls}>{translate('Cliente *')}</label>
                  <Select
                    searchable
                    value={formData.customer_id}
                    onChange={(v) => setFormData((p) => ({ ...p, customer_id: v }))}
                    options={customerOptions}
                    placeholder="Selecciona un cliente existente"
                    ariaLabel="Cliente"
                    menuMinWidth={320}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>{translate('Nombre *')}</label>
                    <input type="text" required autoComplete="given-name" value={newCustomer.first_name}
                      onChange={(e) => setNewCustomer((current) => ({ ...current, first_name: e.target.value }))} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>{translate('Apellidos *')}</label>
                    <input type="text" required autoComplete="family-name" value={newCustomer.last_name}
                      onChange={(e) => setNewCustomer((current) => ({ ...current, last_name: e.target.value }))} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>{translate('Teléfono *')}</label>
                    <input type="tel" required autoComplete="tel" value={newCustomer.phone}
                      onChange={(e) => setNewCustomer((current) => ({ ...current, phone: e.target.value }))} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>{translate('Correo electrónico')}</label>
                    <input type="email" autoComplete="email" value={newCustomer.email}
                      onChange={(e) => setNewCustomer((current) => ({ ...current, email: e.target.value }))} className={inputCls} />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelCls}>{translate('País')}</label>
                    <input type="text" autoComplete="country-name" value={newCustomer.country}
                      onChange={(e) => setNewCustomer((current) => ({ ...current, country: e.target.value }))} className={inputCls} />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3 pt-5 border-t border-slate-100">
              <SectionTitle icon={Compass}>{translate('Detalles del viaje')}</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>{translate('Destino *')}</label>
                  <input type="text" required placeholder="p. ej. Marrakech, Agadir, Chefchaouen" value={formData.destination} onChange={(e) => setFormData((p) => ({ ...p, destination: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{translate('Viajeros *')}</label>
                  <input type="number" min="1" required value={formData.traveler_count} onChange={(e) => setFormData((p) => ({ ...p, traveler_count: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{translate('Fecha de salida *')}</label>
                  <input type="date" required value={formData.departure_date} onChange={(e) => setFormData((p) => ({ ...p, departure_date: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{translate('Fecha de regreso')}</label>
                  <input type="date" min={formData.departure_date || undefined} value={formData.return_date} onChange={(e) => setFormData((p) => ({ ...p, return_date: e.target.value }))} className={inputCls} />
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-5 border-t border-slate-100">
              <SectionTitle icon={DollarSign}>{translate('Precio y primer pago')}</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className={labelCls}>{translate('Importe total *')}</label>
                  <input type="number" step="0.01" required placeholder="0.00" value={formData.total_amount} onChange={(e) => setFormData((p) => ({ ...p, total_amount: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{translate('Moneda')}</label>
                  <Select value={formData.currency} onChange={(v) => setFormData((p) => ({ ...p, currency: v }))} options={CURRENCY_OPTIONS} ariaLabel="Moneda" menuMinWidth={120} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelCls}>{translate('Pago inicial')}</label>
                  <input type="number" step="0.01" placeholder="0.00" value={formData.initial_payment_amount} onChange={(e) => setFormData((p) => ({ ...p, initial_payment_amount: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{translate('Método de pago')}</label>
                  <Select value={formData.payment_method} onChange={(v) => setFormData((p) => ({ ...p, payment_method: v }))} options={METHOD_OPTIONS} ariaLabel="Método de pago" />
                </div>
                <div className="md:col-span-2">
                  <label className={labelCls}>{translate('Empleado asignado')}</label>
                  <Select
                    searchable={assignOptions.length > 7}
                    value={formData.assigned_to}
                    onChange={(v) => setFormData((p) => ({ ...p, assigned_to: v }))}
                    options={assignOptions}
                    placeholder="Selecciona un empleado"
                    ariaLabel="Empleado asignado"
                    menuMinWidth={280}
                  />
                </div>
                <div>
                  <label className={labelCls}>{translate('Estado inicial')}</label>
                  <Select value={formData.booking_status} onChange={(v) => setFormData((p) => ({ ...p, booking_status: v }))} options={INITIAL_STATUS_OPTIONS} ariaLabel="Estado inicial" />
                </div>
              </div>
              <div>
                <label className={labelCls}>{translate('Solicitudes especiales')}</label>
                <textarea rows="2" placeholder="Requisitos dietéticos, preferencias de habitación" value={formData.special_requests} onChange={(e) => setFormData((p) => ({ ...p, special_requests: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{translate('Notas internas')}</label>
                <textarea rows="2" placeholder="Notas solo para el equipo" value={formData.internal_notes} onChange={(e) => setFormData((p) => ({ ...p, internal_notes: e.target.value }))} className={inputCls} />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-100">
              <button type="button" onClick={() => setIsCreateModalOpen(false)} className={btnGhost}>{translate('Cancelar')}</button>
              <button type="submit" disabled={formSubmitting} className={btnPrimary}>{formSubmitting ? 'Guardando…' : 'Guardar reserva'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ================= ADD PAYMENT ================= */}
      {isPaymentModalOpen && selectedReservation && (
        <Modal onClose={() => setIsPaymentModalOpen(false)} maxW="max-w-md">
          <ModalHeader title="Registrar transacción" subtitle={`Reserva ${selectedReservation.booking_reference}`} onClose={() => setIsPaymentModalOpen(false)} />
          <form onSubmit={handleAddPayment} className="p-6 space-y-4">
            <div className="bg-amber-50 px-4 py-3 rounded-lg border border-amber-200 text-sm text-amber-900 flex justify-between">
              <span>{translate('Saldo pendiente')}</span>
              <span className="font-semibold">{fmtMoney(selectedReservation.balance)} {selectedReservation.currency}</span>
            </div>
            <div>
              <label className={labelCls}>{translate('Tipo de transacción')}</label>
              <Select value={paymentData.transaction_type} onChange={(v) => setPaymentData((p) => ({ ...p, transaction_type: v }))} options={TXN_TYPE_OPTIONS} ariaLabel="Tipo de transacción" />
            </div>
            <div>
              <label className={labelCls}>Importe ({selectedReservation.currency}) *</label>
              <input type="number" step="0.01" min="0.01" required placeholder="0.00" value={paymentData.amount} onChange={(e) => setPaymentData((p) => ({ ...p, amount: e.target.value }))} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>{translate('Método')}</label>
                <Select value={paymentData.payment_method} onChange={(v) => setPaymentData((p) => ({ ...p, payment_method: v }))} options={METHOD_OPTIONS} ariaLabel="Método de pago" />
              </div>
              <div>
                <label className={labelCls}>{translate('Estado')}</label>
                <Select value={paymentData.transaction_status} onChange={(v) => setPaymentData((p) => ({ ...p, transaction_status: v }))} options={TXN_STATUS_OPTIONS} ariaLabel="Estado de la transacción" menuMinWidth={220} />
              </div>
            </div>
            <div>
              <label className={labelCls}>{translate('Referencia (opcional)')}</label>
              <input type="text" placeholder="p. ej. TXN-998234" value={paymentData.transaction_reference} onChange={(e) => setPaymentData((p) => ({ ...p, transaction_reference: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{translate('Notas')}</label>
              <textarea rows="2" placeholder="Notas del recibo o depósito" value={paymentData.notes} onChange={(e) => setPaymentData((p) => ({ ...p, notes: e.target.value }))} className={inputCls} />
            </div>
            <p className="text-xs text-slate-500">{translate('Las transacciones completadas no se pueden editar después. Para corregirlas, registra un reembolso.')}</p>
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setIsPaymentModalOpen(false)} className={btnGhost}>{translate('Cancelar')}</button>
              <button type="submit" disabled={formSubmitting} className={btnPrimary}>{formSubmitting ? 'Registrando…' : 'Registrar transacción'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ================= SQL MIGRATION ================= */}
      {isSqlModalOpen && (
        <Modal onClose={() => setIsSqlModalOpen(false)} maxW="max-w-4xl" dark>
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-semibold text-white">{translate('Migración: documentos y archivos adjuntos')}</h3>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(sqlMigrationCode);
                  setCopiedSql(true);
                  setTimeout(() => setCopiedSql(false), 3000);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-lg transition"
              >
                {copiedSql ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedSql ? 'Copiado' : 'Copiar SQL'}
              </button>
              <button onClick={() => setIsSqlModalOpen(false)} className="p-1 text-slate-400 hover:text-white rounded-lg" aria-label="Cerrar">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            <pre className="text-xs font-mono text-slate-300 bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-x-auto whitespace-pre">{sqlMigrationCode}</pre>
          </div>
        </Modal>
      )}
    </div>
  );
}