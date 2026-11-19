import React, { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard, Search, Plus, DollarSign, RefreshCw, X, CheckCircle2, AlertTriangle, FileText,
  ArrowUpRight, ArrowDownLeft, Download, ChevronDown, ChevronRight, Check, Copy, Trash2
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth, useAppSettings, translate } from '../../../context/index.jsx';
import { buildInvoicePdf, getInvoiceFileName, getTransactionReference } from '../../../services/documents/invoicePdfService.js';
import AdvancedInvoiceModal from '@/components/shared/AdvancedInvoiceModal.jsx';
import { Eye } from 'lucide-react';

/* ---------- Helpers ---------- */
const fmtMoney = (n) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const methodLabel = (m = '') => m.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

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
  completed: { label: 'Completed', dot: 'bg-emerald-500', cls: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  pending: { label: 'Pending', dot: 'bg-amber-500', cls: 'bg-amber-50 text-amber-800 ring-amber-200' },
  failed: { label: 'Failed', dot: 'bg-rose-500', cls: 'bg-rose-50 text-rose-800 ring-rose-200' },
  voided: { label: 'Voided', dot: 'bg-slate-400', cls: 'bg-slate-100 text-slate-600 ring-slate-200' },
};
const STATUS_OPTIONS = Object.entries(TXN_STATUS).map(([value, v]) => ({ value, label: v.label, dot: v.dot }));
const RECORD_STATUS_OPTIONS = [
  { value: 'completed', label: 'Completed', hint: 'Locked once saved', dot: 'bg-emerald-500' },
  { value: 'pending', label: 'Pending', dot: 'bg-amber-500' },
  { value: 'failed', label: 'Failed', dot: 'bg-rose-500' },
];
const TYPE_OPTIONS = [
  { value: 'payment', label: 'Payment', hint: 'Money received', dot: 'bg-emerald-500' },
  { value: 'refund', label: 'Refund', hint: 'Money returned', dot: 'bg-rose-500' },
];
const METHOD_OPTIONS = [
  { value: 'card', label: 'Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'other', label: 'Other' },
];

const EMPTY_FORM = {
  booking_id: '', transaction_type: 'payment', payment_method: 'card', amount: '',
  currency: 'MAD', transaction_status: 'completed', transaction_reference: '', notes: '',
};

/* ---------- Small presentational pieces ---------- */
function StatusBadge({ status }) {
  const s = TXN_STATUS[status] || { label: status || 'Unknown', dot: 'bg-slate-400', cls: 'bg-slate-50 text-slate-700 ring-slate-200' };
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
      {refund ? 'Refund' : 'Payment'}
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
      <button onClick={onClose} className="p-1.5 -mr-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition" aria-label="Close">
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

/* ---------- Custom dropdown (portal menu, keyboard support, optional search) ----------
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
      setError('Could not load payments. Check that migration 0006 has been applied.');
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
    () => [{ value: 'ALL', label: 'All' }, ...paymentMethods.map((m) => ({ value: m, label: methodLabel(m) }))],
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
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!formData.booking_id || !formData.amount) {
      setError('Choose a booking and enter an amount.');
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

      flash('Transaction recorded.');
      setIsRecordModalOpen(false);
      setFormData(EMPTY_FORM);
      await fetchData();
    } catch (err) {
      console.error('Error recording payment:', err);
      setError('Could not record the transaction: ' + (err.message || 'Unknown error'));
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeletePayment = async (payment) => {
    const type = payment.transaction_type === 'refund' ? 'refund' : 'payment';
    if (!window.confirm(`Permanently delete this ${type} of ${fmtMoney(payment.amount)} ${payment.currency || ''}? This cannot be undone.`)) return;

    try {
      setDeletingPaymentId(payment.id);
      setError(null);
      const { data, error: deleteError } = await supabase
        .from('booking_payments')
        .delete()
        .eq('id', payment.id)
        .select('id');
      if (deleteError) throw deleteError;
      if (!data?.length) throw new Error('No matching transaction was deleted. It may have already been removed.');

      setPayments((current) => current.filter((item) => item.id !== payment.id));
      setInvoiceModalData((current) => current?.payment?.id === payment.id ? null : current);
      flash('Transaction deleted.');
    } catch (deleteError) {
      console.error('Error deleting payment transaction:', deleteError);
      setError('Could not delete the transaction: ' + (deleteError.message || 'Unknown error'));
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
      if (!booking) throw new Error('Could not find the booking for this transaction.');

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
      flash('Invoice downloaded.', 3000);
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('Could not generate the invoice: ' + err.message);
    } finally {
      setGeneratingId(null);
    }
  };

  const testSql = 'SELECT * FROM booking_financials;';

  const statCards = [
    { label: 'Total transactions', value: stats.totalTransactions, icon: CreditCard, tone: 'text-slate-900', chip: 'bg-slate-100 text-slate-600' },
    { label: 'Payments in', value: `${fmtMoney(stats.completedPayments)} ${globalCurrency}`, icon: ArrowDownLeft, tone: 'text-emerald-600', chip: 'bg-emerald-50 text-emerald-600' },
    { label: 'Refunds out', value: `${fmtMoney(stats.totalRefunds)} ${globalCurrency}`, icon: ArrowUpRight, tone: 'text-rose-600', chip: 'bg-rose-50 text-rose-600' },
    { label: 'Net revenue', value: `${fmtMoney(stats.netRevenue)} ${globalCurrency}`, icon: DollarSign, tone: 'text-slate-900', chip: 'bg-sky-50 text-sky-600' },
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
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">{translate('Payments and invoices')}</h1>
            <p className="text-sm text-slate-500 mt-1">{translate('Track transactions, download invoices and monitor net revenue.')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setIsSqlModalOpen(true)} className={btnGhost}>
              <FileText className="w-4 h-4 text-slate-500" />{translate('Test SQL')}</button>
            <button onClick={fetchData} className={btnGhost} title="Refresh records">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />{translate('Refresh')}</button>
            <button onClick={() => { setFormData(EMPTY_FORM); setError(null); setIsRecordModalOpen(true); }} className={btnPrimary}>
              <Plus className="w-4 h-4" />{translate('Record transaction')}</button>
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
            <button onClick={() => setError(null)} className="p-1 hover:bg-rose-100 rounded" aria-label="Dismiss"><X className="w-4 h-4" /></button>
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
                  placeholder="Search by transaction or booking reference"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`${inputCls} pl-9`}
                />
              </div>
              <Select className="lg:w-52" prefix="Status" ariaLabel="Status filter" value={statusFilter} onChange={setStatusFilter}
                options={[{ value: 'ALL', label: 'All' }, ...STATUS_OPTIONS]} />
              <Select className="lg:w-48" prefix="Type" ariaLabel="Type filter" value={typeFilter} onChange={setTypeFilter}
                options={[{ value: 'ALL', label: 'All' }, ...TYPE_OPTIONS]} />
              <Select className="lg:w-52" prefix="Method" ariaLabel="Payment method filter" value={methodFilter} onChange={setMethodFilter}
                options={methodFilterOptions} />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{filteredPayments.length} of {payments.length} transactions</span>
              {hasFilters && (
                <button
                  onClick={() => { setSearchQuery(''); setStatusFilter('ALL'); setTypeFilter('ALL'); setMethodFilter('ALL'); }}
                  className="font-medium text-amber-700 hover:text-amber-800 underline underline-offset-2"
                >{translate('Clear filters')}</button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-stone-50 border-b border-slate-100 text-xs font-medium text-slate-500">
                  <th className="py-3 px-4">{translate('Transaction')}</th>
                  <th className="py-3 px-4">{translate('Type')}</th>
                  <th className="py-3 px-4">{translate('Booking')}</th>
                  <th className="py-3 px-4">{translate('Method')}</th>
                  <th className="py-3 px-4 text-right">{translate('Amount')}</th>
                  <th className="py-3 px-4">{translate('Status')}</th>
                  <th className="py-3 px-4 w-44" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="py-16 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-600" />{translate('Loading transactions…')}</td>
                  </tr>
                ) : filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-16 text-center text-slate-500">
                      <CreditCard className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="font-medium text-slate-700">{translate('No transactions match')}</p>
                      <p className="text-xs mt-1">{translate('Try a different search or clear the filters.')}</p>
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
                              title="View interactive invoice"
                            >
                              <Eye className="w-3.5 h-3.5 text-amber-600" />
                              <span className="hidden sm:inline">View</span>
                            </button>

                            <button
                              onClick={(e) => { e.stopPropagation(); generateInvoice(p); }}
                              onKeyDown={(e) => e.stopPropagation()}
                              disabled={generatingId !== null || !canInvoice}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
                              title={canInvoice ? 'Download PDF invoice' : 'Only completed transactions can be invoiced'}
                            >
                              {busy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                              {refund ? 'Credit note' : 'Invoice'}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleDeletePayment(p); }}
                              onKeyDown={(e) => e.stopPropagation()}
                              disabled={deleting || generatingId === p.id}
                              className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                              title="Delete transaction"
                              aria-label={`Delete ${p.transaction_type || 'payment'} transaction`}
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

      {/* ================= RECORD TRANSACTION ================= */}
      {isRecordModalOpen && (
        <Modal onClose={() => setIsRecordModalOpen(false)}>
          <ModalHeader title="Record transaction" subtitle="Payments and refunds are added to the booking ledger." onClose={() => setIsRecordModalOpen(false)} />
          <form onSubmit={handleRecordPayment} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            <div className="space-y-3">
              <SectionTitle icon={FileText}>{translate('Booking')}</SectionTitle>
              <div>
                <label className={labelCls}>{translate('Booking *')}</label>
                <Select
                  searchable
                  value={formData.booking_id}
                  onChange={(v) => setFormData((p) => ({ ...p, booking_id: v }))}
                  options={bookingOptions}
                  placeholder="Select a booking"
                  ariaLabel="Booking"
                  menuMinWidth={320}
                />
              </div>
            </div>

            <div className="space-y-3 pt-5 border-t border-slate-100">
              <SectionTitle icon={DollarSign}>{translate('Transaction')}</SectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>{translate('Type')}</label>
                  <Select value={formData.transaction_type} onChange={(v) => setFormData((p) => ({ ...p, transaction_type: v }))} options={TYPE_OPTIONS} ariaLabel="Transaction type" />
                </div>
                <div>
                  <label className={labelCls}>{translate('Method')}</label>
                  <Select value={formData.payment_method} onChange={(v) => setFormData((p) => ({ ...p, payment_method: v }))} options={METHOD_OPTIONS} ariaLabel="Payment method" />
                </div>
                <div>
                  <label className={labelCls}>{translate('Amount *')}</label>
                  <input type="number" step="0.01" min="0.01" required placeholder="5000.00" value={formData.amount}
                    onChange={(e) => setFormData((p) => ({ ...p, amount: e.target.value }))} className={inputCls} />
                  <p className="text-xs text-slate-400 mt-1">
                    Currency: {selectedBooking ? selectedBooking.currency : formData.currency}{selectedBooking ? ' (from the booking)' : ''}
                  </p>
                </div>
                <div>
                  <label className={labelCls}>{translate('Status')}</label>
                  <Select value={formData.transaction_status} onChange={(v) => setFormData((p) => ({ ...p, transaction_status: v }))} options={RECORD_STATUS_OPTIONS} ariaLabel="Transaction status" menuMinWidth={220} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>{translate('Reference (optional)')}</label>
                  <input type="text" placeholder="e.g. TXN-998234" value={formData.transaction_reference}
                    onChange={(e) => setFormData((p) => ({ ...p, transaction_reference: e.target.value }))} className={inputCls} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>{translate('Notes')}</label>
                  <textarea rows="2" placeholder="Receipt or deposit notes" value={formData.notes}
                    onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))} className={inputCls} />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-100">
              <button type="button" onClick={() => setIsRecordModalOpen(false)} className={btnGhost}>{translate('Cancel')}</button>
              <button type="submit" disabled={formSubmitting} className={btnPrimary}>{formSubmitting ? 'Recording…' : 'Record transaction'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ================= TEST SQL ================= */}
      {isSqlModalOpen && (
        <Modal onClose={() => setIsSqlModalOpen(false)} maxW="max-w-3xl" dark>
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-semibold text-white">{translate('Test SQL')}</h3>
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
                {copiedSql ? 'Copied' : 'Copy SQL'}
              </button>
              <button onClick={() => setIsSqlModalOpen(false)} className="p-1 text-slate-400 hover:text-white rounded-lg" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="p-6">
            <pre className="text-xs font-mono text-slate-300 bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-x-auto whitespace-pre">{testSql}</pre>
          </div>
        </Modal>
      )}

      {/* Advanced Invoice Viewer Modal */}
      <AdvancedInvoiceModal
        isOpen={Boolean(invoiceModalData)}
        onClose={() => setInvoiceModalData(null)}
        {...invoiceModalData}
      />
    </div>
  );
}