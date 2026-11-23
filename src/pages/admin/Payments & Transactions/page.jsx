import React, { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard, Search, Plus, DollarSign, RefreshCw, X, CheckCircle2, AlertTriangle, FileText,
  ArrowUpRight, ArrowDownLeft, Download, ChevronDown, ChevronRight, Check, Copy, Trash2, Eye, RotateCcw,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth, useAppSettings, translate } from '../../../context/index.jsx';
import { buildInvoicePdf, getInvoiceFileName, getTransactionReference } from '../../../services/documents/invoicePdfService.js';
import AdvancedInvoiceModal from '@/components/shared/AdvancedInvoiceModal.jsx';

/* ---------- Helpers ---------- */
const fmtMoney = (n) => Number(n || 0).toLocaleString('es-ES', { maximumFractionDigits: 2 });
const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const METHOD_LABELS = {
  card: 'Tarjeta',
  cash: 'Efectivo',
  bank_transfer: 'Transferencia bancaria',
  other: 'Otro',
};
const methodLabel = (m = '') =>
  METHOD_LABELS[m] || m.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

/* ---------- Shared style tokens ---------- */
const inputCls =
  'w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition';
const labelCls = 'block text-xs font-medium text-slate-600 mb-1.5';
const btnGhost =
  'inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition';
const btnPrimary =
  'inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-500 shadow-sm transition disabled:opacity-50';

const TXN_STATUS = {
  completed: { label: 'Completado', dot: 'bg-emerald-500', cls: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  pending: { label: 'Pendiente', dot: 'bg-amber-500', cls: 'bg-amber-50 text-amber-800 ring-amber-200' },
  failed: { label: 'Fallido', dot: 'bg-rose-500', cls: 'bg-rose-50 text-rose-800 ring-rose-200' },
  voided: { label: 'Anulado', dot: 'bg-slate-400', cls: 'bg-slate-100 text-slate-600 ring-slate-200' },
};
const STATUS_OPTIONS = Object.entries(TXN_STATUS).map(([value, v]) => ({ value, label: v.label, dot: v.dot }));
const RECORD_STATUS_OPTIONS = [
  { value: 'completed', label: 'Completado', hint: 'Se bloquea al guardar', dot: 'bg-emerald-500' },
  { value: 'pending', label: 'Pendiente', dot: 'bg-amber-500' },
  { value: 'failed', label: 'Fallido', dot: 'bg-rose-500' },
];
const TYPE_OPTIONS = [
  { value: 'payment', label: 'Pago', hint: 'Dinero recibido', dot: 'bg-emerald-500' },
  { value: 'refund', label: 'Reembolso', hint: 'Dinero devuelto', dot: 'bg-rose-500' },
];
const METHOD_OPTIONS = [
  { value: 'card', label: 'Tarjeta' },
  { value: 'cash', label: 'Efectivo' },
  { value: 'bank_transfer', label: 'Transferencia bancaria' },
  { value: 'other', label: 'Otro' },
];

const EMPTY_FORM = {
  booking_id: '', transaction_type: 'payment', payment_method: 'card', amount: '',
  currency: 'MAD', transaction_status: 'completed', transaction_reference: '', notes: '',
};

/* ---------- Small presentational pieces ---------- */
function StatusBadge({ status }) {
  const s = TXN_STATUS[status] || { label: status || 'Desconocido', dot: 'bg-slate-400', cls: 'bg-slate-50 text-slate-700 ring-slate-200' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${s.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function TypeBadge({ type }) {
  const refund = type === 'refund';
  const Icon = refund ? ArrowUpRight : ArrowDownLeft;
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${refund ? 'text-rose-700' : 'text-emerald-700'}`}>
      <span className={`w-6 h-6 rounded-md flex items-center justify-center ${refund ? 'bg-rose-50' : 'bg-emerald-50'}`}>
        <Icon className="w-3.5 h-3.5" />
      </span>
      {refund ? 'Reembolso' : 'Pago'}
    </span>
  );
}

function SectionTitle({ icon: Icon, children }) {
  return (
    <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
      <Icon className="w-4 h-4 text-amber-600" /> {children}
    </h4>
  );
}

function Modal({ children, onClose, maxW = 'max-w-xl', dark = false }) {
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

/* ---------- Custom dropdown (portal menu, keyboard support, optional search) ----------
   Options: { value, label, hint?, dot?, color?, disabled? } */
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

  useLayoutEffect(() => { if (open) place(); }, [open, place]);

  useEffect(() => {
    if (!open) return;
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
      case 'Escape': e.preventDefault(); e.stopPropagation(); close(); break; // no cierra también el modal de fondo
      case 'Tab': setOpen(false); break;
      default: break;
    }
  };

  const isFiltered = prefix && value !== emptyValue && value !== '' && value != null;
  const marker = (o, size) =>
    o?.color ? <span className={`${size} rounded-full shrink-0`} style={{ backgroundColor: o.color }} /> :
    o?.dot ? <span className={`${size} rounded-full shrink-0 ${o.dot}`} /> : null;

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
          {marker(selected, 'w-2 h-2')}
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
                    {marker(o, 'w-2 h-2')}
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

/* ---------- Empty state graphics ---------- */
function EmptyIllustrationPayments() {
  return (
    <svg viewBox="0 0 320 200" className="mx-auto h-40 w-auto" role="img" aria-label="Ilustración de pagos y facturas">
      <ellipse cx="160" cy="184" rx="110" ry="8" className="fill-slate-100" />

      {/* Factura (atrás, inclinada a la izquierda) */}
      <g transform="rotate(-5 100 100)">
        <rect x="38" y="40" width="112" height="106" rx="12" className="fill-white stroke-slate-200" strokeWidth="2" />
        <rect x="52" y="56" width="44" height="7" rx="3.5" className="fill-slate-200" />
        <rect x="52" y="70" width="28" height="5" rx="2.5" className="fill-slate-100" />
        <rect x="52" y="92" width="84" height="5" rx="2.5" className="fill-slate-100" />
        <rect x="52" y="104" width="84" height="5" rx="2.5" className="fill-slate-100" />
        <rect x="52" y="116" width="52" height="5" rx="2.5" className="fill-slate-100" />
        <rect x="52" y="130" width="40" height="7" rx="3.5" className="fill-slate-300" />
      </g>

      {/* Tarjeta de transacción (delante, inclinada a la derecha) */}
      <g transform="rotate(4 205 100)">
        <rect x="138" y="62" width="134" height="88" rx="12" className="fill-white stroke-amber-300" strokeWidth="2" />
        <circle cx="168" cy="88" r="15" className="fill-emerald-100" />
        <path d="M168 96v-16m-6 6 6-6 6 6" className="stroke-emerald-600" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <rect x="192" y="80" width="58" height="7" rx="3.5" className="fill-slate-300" />
        <rect x="192" y="93" width="36" height="5" rx="2.5" className="fill-slate-200" />
        <rect x="154" y="118" width="44" height="14" rx="7" className="fill-emerald-100" />
        <circle cx="164" cy="125" r="3" className="fill-emerald-500" />
        <rect x="208" y="123" width="42" height="6" rx="3" className="fill-amber-200" />
      </g>

      {/* Moneda con signo + */}
      <circle cx="262" cy="52" r="20" className="fill-amber-500" />
      <circle cx="262" cy="52" r="14" className="fill-none stroke-amber-200" strokeWidth="1.5" />
      <path d="M262 43v18M253 52h18" stroke="white" strokeWidth="3" strokeLinecap="round" />

      <circle cx="40" cy="30" r="4" className="fill-amber-200" />
      <circle cx="288" cy="124" r="3" className="fill-amber-300" />
      <circle cx="28" cy="156" r="3" className="fill-slate-200" />
    </svg>
  );
}

function EmptyStatePayments({ hasFilters, onClearFilters, onCreate }) {
  if (hasFilters) {
    return (
      <div className="px-6 py-16 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400">
          <Search aria-hidden="true" className="h-6 w-6" />
        </span>
        <h3 className="mt-4 text-base font-semibold text-slate-900">Ninguna transacción coincide con estos filtros</h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">Prueba con otra búsqueda o quita algunos filtros.</p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={onClearFilters} className={btnGhost}>
            <RotateCcw className="w-4 h-4" />Borrar todos los filtros
          </button>
          <button type="button" onClick={onCreate} className={btnPrimary}>
            <Plus className="w-4 h-4" />Registrar transacción
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="px-6 py-14 text-center">
      <EmptyIllustrationPayments />
      <h3 className="mt-4 text-xl font-semibold text-slate-900">Aún no hay transacciones</h3>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500">
        Registra el primer pago o reembolso de una reserva para empezar a llevar el control de tus ingresos.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={onCreate} className={btnPrimary}>
          <Plus className="w-4 h-4" />Registrar primera transacción
        </button>
        <button type="button" onClick={onClearFilters} className={btnGhost}>
          <RefreshCw className="w-4 h-4" />Actualizar
        </button>
      </div>
      <ol className="mx-auto mt-10 grid max-w-3xl gap-3 text-left sm:grid-cols-3">
        {[
          ['Elige una reserva', 'Cada pago o reembolso se asocia a una reserva existente.'],
          ['Registra el importe', 'Indica el tipo, el método y el estado de la transacción.'],
          ['Descarga la factura', 'Genera la factura o la nota de crédito en PDF al instante.'],
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
export default function PaymentsPage() {
  const { user } = useAuth();
  const { currency: globalCurrency, invoice: invoiceConfig } = useAppSettings();
  const navigate = useNavigate();

  const [payments, setPayments] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [methodFilter, setMethodFilter] = useState('ALL');

  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [generatingId, setGeneratingId] = useState(null);
  const [deletingPaymentId, setDeletingPaymentId] = useState(null);
  const [invoiceModalData, setInvoiceModalData] = useState(null);

  const viewInvoice = async (payment) => {
    try {
      const { data: booking } = await supabase
        .from('bookings')
        .select('*, customers (*)')
        .eq('id', payment.booking_id)
        .maybeSingle();

      const ledger = payments.filter((p) => p.booking_id === payment.booking_id);
      setInvoiceModalData({
        payment,
        booking: booking || {},
        ledger,
        customer: booking?.customers || null,
      });
    } catch (err) {
      console.error('Error viewing invoice:', err);
      setError('No se pudo abrir la factura: ' + (err.message || 'Error desconocido'));
    }
  };

  const flash = (msg, ms = 4000) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), ms);
  };

  /* ----- Data ----- */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [paymentsRes, bookingsRes] = await Promise.all([
        supabase.from('booking_payments').select('*, bookings(booking_reference, total_amount, currency)').order('transaction_date', { ascending: false }),
        supabase.from('bookings').select('id, booking_reference, total_amount, currency').order('created_at', { ascending: false }),
      ]);
      if (paymentsRes.error) throw paymentsRes.error;
      if (bookingsRes.error) throw bookingsRes.error;
      setPayments(paymentsRes.data || []);
      setBookings(bookingsRes.data || []);
    } catch (err) {
      console.error('Error fetching payments:', err);
      setError('No se pudieron cargar los pagos. Comprueba que la migración 0006 esté aplicada.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (isRecordModalOpen) setIsRecordModalOpen(false);
      else if (isSqlModalOpen) setIsSqlModalOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isRecordModalOpen, isSqlModalOpen]);

  const paymentMethods = useMemo(
    () => [...new Set(payments.map((p) => p.payment_method).filter(Boolean))].sort(),
    [payments]
  );

  const methodFilterOptions = useMemo(
    () => [{ value: 'ALL', label: 'Todos' }, ...paymentMethods.map((m) => ({ value: m, label: methodLabel(m) }))],
    [paymentMethods]
  );

  const bookingOptions = useMemo(
    () => bookings.map((b) => ({
      value: b.id,
      label: b.booking_reference,
      hint: `Total ${fmtMoney(b.total_amount)} ${b.currency}`,
    })),
    [bookings]
  );

  const filteredPayments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return payments.filter((p) => {
      const matchesSearch = !query ||
        getTransactionReference(p).toLowerCase().includes(query) ||
        p.bookings?.booking_reference?.toLowerCase().includes(query);
      return (
        matchesSearch &&
        (statusFilter === 'ALL' || p.transaction_status === statusFilter) &&
        (typeFilter === 'ALL' || p.transaction_type === typeFilter) &&
        (methodFilter === 'ALL' || p.payment_method === methodFilter)
      );
    });
  }, [payments, searchQuery, statusFilter, typeFilter, methodFilter]);

  const hasFilters = searchQuery || statusFilter !== 'ALL' || typeFilter !== 'ALL' || methodFilter !== 'ALL';
  const clearFilters = () => { setSearchQuery(''); setStatusFilter('ALL'); setTypeFilter('ALL'); setMethodFilter('ALL'); };

  const stats = useMemo(() => {
    const sum = (type) => payments
      .filter((p) => p.transaction_type === type && p.transaction_status === 'completed')
      .reduce((s, p) => s + Number(p.amount || 0), 0);
    const completedPayments = sum('payment');
    const totalRefunds = sum('refund');
    return { totalTransactions: payments.length, completedPayments, totalRefunds, netRevenue: completedPayments - totalRefunds };
  }, [payments]);

  const selectedBooking = bookings.find((b) => b.id === formData.booking_id);

  /* ----- Actions ----- */
  const openRecordModal = () => {
    setFormData(EMPTY_FORM);
    setError(null);
    setIsRecordModalOpen(true);
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!formData.booking_id || !formData.amount) {
      setError('Elige una reserva e introduce un importe.');
      return;
    }
    try {
      setFormSubmitting(true);
      setError(null);

      const { error: insertErr } = await supabase.from('booking_payments').insert([{
        booking_id: formData.booking_id,
        transaction_type: formData.transaction_type,
        payment_method: formData.payment_method,
        amount: parseFloat(formData.amount),
        currency: selectedBooking ? selectedBooking.currency : formData.currency,
        transaction_status: formData.transaction_status,
        transaction_reference: formData.transaction_reference.trim() || null,
        notes: formData.notes.trim() || null,
        recorded_by: user?.id,
      }]);
      if (insertErr) throw insertErr;

      flash('Transacción registrada.');
      setIsRecordModalOpen(false);
      setFormData(EMPTY_FORM);
      await fetchData();
    } catch (err) {
      console.error('Error recording payment:', err);
      setError('No se pudo registrar la transacción: ' + (err.message || 'Error desconocido'));
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeletePayment = async (payment) => {
    const type = payment.transaction_type === 'refund' ? 'reembolso' : 'pago';
    if (!window.confirm(`¿Eliminar permanentemente este ${type} de ${fmtMoney(payment.amount)} ${payment.currency || ''}? Esta acción no se puede deshacer.`)) return;

    try {
      setDeletingPaymentId(payment.id);
      setError(null);
      const { data, error: deleteError } = await supabase
        .from('booking_payments')
        .delete()
        .eq('id', payment.id)
        .select('id');
      if (deleteError) throw deleteError;
      if (!data?.length) throw new Error('No se eliminó ninguna transacción. Es posible que ya se haya borrado.');

      setPayments((current) => current.filter((item) => item.id !== payment.id));
      setInvoiceModalData((current) => (current?.payment?.id === payment.id ? null : current));
      flash('Transacción eliminada.');
    } catch (deleteError) {
      console.error('Error deleting payment transaction:', deleteError);
      setError('No se pudo eliminar la transacción: ' + (deleteError.message || 'Error desconocido'));
    } finally {
      setDeletingPaymentId(null);
    }
  };

  const generateInvoice = async (payment) => {
    try {
      setGeneratingId(payment.id);
      setError(null);

      const { data: booking, error: fetchErr } = await supabase
        .from('bookings')
        .select('*, customers (*)')
        .eq('id', payment.booking_id)
        .single();
      if (fetchErr) throw fetchErr;
      if (!booking) throw new Error('No se encontró la reserva de esta transacción.');

      const ledger = payments.filter((p) => p.booking_id === payment.booking_id);
      const doc = await buildInvoicePdf({
        payment,
        booking,
        customer: booking.customers,
        ledger,
        invoiceConfig,
        defaultCurrency: globalCurrency,
      });
      doc.save(getInvoiceFileName(payment, invoiceConfig));
      flash('Factura descargada.', 3000);
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('No se pudo generar la factura: ' + err.message);
    } finally {
      setGeneratingId(null);
    }
  };

  const testSql = 'SELECT * FROM booking_financials;';

  const statCards = [
    { label: 'Total de transacciones', value: stats.totalTransactions, icon: CreditCard, tone: 'text-slate-900', chip: 'bg-slate-100 text-slate-600' },
    { label: 'Pagos recibidos', value: `${fmtMoney(stats.completedPayments)} ${globalCurrency}`, icon: ArrowDownLeft, tone: 'text-emerald-600', chip: 'bg-emerald-50 text-emerald-600' },
    { label: 'Reembolsos emitidos', value: `${fmtMoney(stats.totalRefunds)} ${globalCurrency}`, icon: ArrowUpRight, tone: 'text-rose-600', chip: 'bg-rose-50 text-rose-600' },
    { label: 'Ingresos netos', value: `${fmtMoney(stats.netRevenue)} ${globalCurrency}`, icon: DollarSign, tone: 'text-slate-900', chip: 'bg-sky-50 text-sky-600' },
  ];

  /* ---------- Render ---------- */
  return (
    <div className="min-h-screen bg-stone-50">
      <style>{`
        @keyframes rp-pop { from { opacity: 0; transform: translateY(6px) scale(.98); } to { opacity: 1; transform: none; } }
        .rp-pop { animation: rp-pop .16s ease-out; }
        @media (prefers-reduced-motion: reduce) { .rp-pop { animation-duration: 1ms; } }
      `}</style>

      <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">{translate('Pagos y facturas')}</h1>
            <p className="text-sm text-slate-500 mt-1">{translate('Controla las transacciones, descarga facturas y supervisa los ingresos netos.')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setIsSqlModalOpen(true)} className={btnGhost}>
              <FileText className="w-4 h-4 text-slate-500" />{translate('SQL de prueba')}</button>
            <button onClick={fetchData} className={btnGhost} title="Actualizar registros">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />{translate('Actualizar')}</button>
            <button onClick={openRecordModal} className={btnPrimary}>
              <Plus className="w-4 h-4" />{translate('Registrar transacción')}</button>
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
                  placeholder="Buscar por referencia de transacción o de reserva"
                  aria-label="Buscar transacciones"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`${inputCls} pl-9`}
                />
              </div>
              <Select className="lg:w-52" prefix="Estado" ariaLabel="Filtro de estado" value={statusFilter} onChange={setStatusFilter}
                options={[{ value: 'ALL', label: 'Todos' }, ...STATUS_OPTIONS]} />
              <Select className="lg:w-48" prefix="Tipo" ariaLabel="Filtro de tipo" value={typeFilter} onChange={setTypeFilter}
                options={[{ value: 'ALL', label: 'Todos' }, ...TYPE_OPTIONS]} />
              <Select className="lg:w-56" prefix="Método" ariaLabel="Filtro de método de pago" value={methodFilter} onChange={setMethodFilter}
                options={methodFilterOptions} />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{filteredPayments.length} de {payments.length} transacciones</span>
              {hasFilters && (
                <button onClick={clearFilters} className="font-medium text-amber-700 hover:text-amber-800 underline underline-offset-2">
                  {translate('Borrar filtros')}
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-stone-50 border-b border-slate-100 text-xs font-medium text-slate-500">
                  <th className="py-3 px-4">{translate('Transacción')}</th>
                  <th className="py-3 px-4">{translate('Tipo')}</th>
                  <th className="py-3 px-4">{translate('Reserva')}</th>
                  <th className="py-3 px-4">{translate('Método')}</th>
                  <th className="py-3 px-4 text-right">{translate('Importe')}</th>
                  <th className="py-3 px-4">{translate('Estado')}</th>
                  <th className="py-3 px-4 w-44" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="py-16 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-600" />{translate('Cargando transacciones…')}</td>
                  </tr>
                ) : filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan="7">
                      <EmptyStatePayments hasFilters={hasFilters} onClearFilters={hasFilters ? clearFilters : fetchData} onCreate={openRecordModal} />
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p) => {
                    const refund = p.transaction_type === 'refund';
                    const canInvoice = p.transaction_status === 'completed';
                    const busy = generatingId === p.id;
                    const deleting = deletingPaymentId === p.id;
                    return (
                      <tr
                        key={p.id}
                        tabIndex={0}
                        onClick={() => navigate(`/admin/payments-transactions/${p.id}`)}
                        onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/admin/payments-transactions/${p.id}`); }}
                        className="group cursor-pointer hover:bg-amber-50/40 focus:outline-none focus-visible:bg-amber-50/60 transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <p className="font-mono text-xs font-semibold text-amber-700">{getTransactionReference(p) || '—'}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{fmtDateTime(p.transaction_date || p.created_at)}</p>
                        </td>
                        <td className="py-3.5 px-4"><TypeBadge type={p.transaction_type} /></td>
                        <td className="py-3.5 px-4 font-mono text-xs font-semibold text-slate-800">{p.bookings?.booking_reference || '—'}</td>
                        <td className="py-3.5 px-4 text-slate-600">{methodLabel(p.payment_method)}</td>
                        <td className={`py-3.5 px-4 text-right font-semibold whitespace-nowrap ${refund ? 'text-rose-600' : 'text-slate-900'}`}>
                          {refund ? '−' : '+'}{fmtMoney(p.amount)} {p.currency}
                        </td>
                        <td className="py-3.5 px-4"><StatusBadge status={p.transaction_status} /></td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); viewInvoice(p); }}
                              onKeyDown={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition"
                              title="Ver factura interactiva"
                            >
                              <Eye className="w-3.5 h-3.5 text-amber-600" />
                              <span className="hidden sm:inline">Ver</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); generateInvoice(p); }}
                              onKeyDown={(e) => e.stopPropagation()}
                              disabled={generatingId !== null || !canInvoice}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
                              title={canInvoice ? 'Descargar factura en PDF' : 'Solo las transacciones completadas pueden facturarse'}
                            >
                              {busy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                              {refund ? 'Nota de crédito' : 'Factura'}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleDeletePayment(p); }}
                              onKeyDown={(e) => e.stopPropagation()}
                              disabled={deleting || generatingId === p.id}
                              className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                              title="Eliminar transacción"
                              aria-label={`Eliminar ${refund ? 'reembolso' : 'pago'}`}
                            >
                              {deleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            </button>
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

      {/* ================= REGISTRAR TRANSACCIÓN ================= */}
      {isRecordModalOpen && (
        <Modal onClose={() => setIsRecordModalOpen(false)}>
          <ModalHeader title="Registrar transacción" subtitle="Los pagos y reembolsos se añaden al libro de cuentas de la reserva." onClose={() => setIsRecordModalOpen(false)} />
          <form onSubmit={handleRecordPayment} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            <div className="space-y-3">
              <SectionTitle icon={FileText}>{translate('Reserva')}</SectionTitle>
              <div>
                <label className={labelCls}>{translate('Reserva *')}</label>
                <Select
                  searchable
                  value={formData.booking_id}
                  onChange={(v) => setFormData((p) => ({ ...p, booking_id: v }))}
                  options={bookingOptions}
                  placeholder="Selecciona una reserva"
                  ariaLabel="Reserva"
                  menuMinWidth={320}
                />
              </div>
            </div>

            <div className="space-y-3 pt-5 border-t border-slate-100">
              <SectionTitle icon={DollarSign}>{translate('Transacción')}</SectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>{translate('Tipo')}</label>
                  <Select value={formData.transaction_type} onChange={(v) => setFormData((p) => ({ ...p, transaction_type: v }))} options={TYPE_OPTIONS} ariaLabel="Tipo de transacción" />
                </div>
                <div>
                  <label className={labelCls}>{translate('Método')}</label>
                  <Select value={formData.payment_method} onChange={(v) => setFormData((p) => ({ ...p, payment_method: v }))} options={METHOD_OPTIONS} ariaLabel="Método de pago" />
                </div>
                <div>
                  <label className={labelCls}>{translate('Importe *')}</label>
                  <input type="number" step="0.01" min="0.01" required placeholder="5000.00" value={formData.amount}
                    onChange={(e) => setFormData((p) => ({ ...p, amount: e.target.value }))} className={inputCls} />
                  <p className="text-xs text-slate-400 mt-1">
                    Moneda: {selectedBooking ? selectedBooking.currency : formData.currency}{selectedBooking ? ' (de la reserva)' : ''}
                  </p>
                </div>
                <div>
                  <label className={labelCls}>{translate('Estado')}</label>
                  <Select value={formData.transaction_status} onChange={(v) => setFormData((p) => ({ ...p, transaction_status: v }))} options={RECORD_STATUS_OPTIONS} ariaLabel="Estado de la transacción" menuMinWidth={220} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>{translate('Referencia (opcional)')}</label>
                  <input type="text" placeholder="p. ej. TXN-998234" value={formData.transaction_reference}
                    onChange={(e) => setFormData((p) => ({ ...p, transaction_reference: e.target.value }))} className={inputCls} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>{translate('Notas')}</label>
                  <textarea rows="2" placeholder="Notas del recibo o del depósito" value={formData.notes}
                    onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))} className={inputCls} />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-100">
              <button type="button" onClick={() => setIsRecordModalOpen(false)} className={btnGhost}>{translate('Cancelar')}</button>
              <button type="submit" disabled={formSubmitting} className={btnPrimary}>{formSubmitting ? 'Registrando…' : 'Registrar transacción'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ================= SQL DE PRUEBA ================= */}
      {isSqlModalOpen && (
        <Modal onClose={() => setIsSqlModalOpen(false)} maxW="max-w-3xl" dark>
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-semibold text-white">{translate('SQL de prueba')}</h3>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(testSql);
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
          <div className="p-6">
            <pre className="text-xs font-mono text-slate-300 bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-x-auto whitespace-pre">{testSql}</pre>
          </div>
        </Modal>
      )}

      {/* Visor avanzado de facturas */}
      <AdvancedInvoiceModal
        isOpen={Boolean(invoiceModalData)}
        onClose={() => setInvoiceModalData(null)}
        {...invoiceModalData}
      />
    </div>
  );
}