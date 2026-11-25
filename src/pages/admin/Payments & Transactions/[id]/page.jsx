import { useAppSettings, translate } from '@/context/index.jsx';
// src/pages/admin/payments-transactions/PaymentDetailPage.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  AlertCircle, AlertTriangle, ArrowDownLeft, ArrowLeft, ArrowUpRight, Check,
  CheckCircle2, ChevronRight, Clipboard, Clock, CreditCard, Download, ExternalLink,
  FileText, History, Loader2, Lock, RefreshCw, Search, ShieldCheck, User, X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '../../../../context/index.jsx';

/* ------------------------------------------------------------------ */
/*  Reference helper (no imports, no require)                          */
/* ------------------------------------------------------------------ */
const getTransactionReference = (p) =>
  String(p?.transaction_reference_unique || p?.transaction_reference || p?.id || '');

/* ------------------------------------------------------------------ */
/*  Invoice service — optional, dynamically imported at click time     */
/* ------------------------------------------------------------------ */
async function loadInvoiceBuilder() {
  try {
    const mod = await import('../../../../services/documents/invoicePdfService.js');
    return mod?.buildInvoicePdf ? mod : null;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[payment-detail] Invoice service unavailable:', err?.message);
    return null;
  }
}

/* ================================================================== */
/*  Constants                                                          */
/* ================================================================== */
const STATUS_META = {
  completed: { label: 'Completado', tone: 'emerald', icon: CheckCircle2 },
  pending:   { label: 'Pendiente',   tone: 'amber',   icon: Clock },
  failed:    { label: 'Fallido',    tone: 'rose',    icon: AlertTriangle },
  voided:    { label: 'Anulado',    tone: 'slate',   icon: X },
  cancelled: { label: 'Cancelado', tone: 'rose',    icon: X },
};

const TONE_MAP = {
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber:   'bg-amber-50 text-amber-700 ring-amber-200',
  rose:    'bg-rose-50 text-rose-700 ring-rose-200',
  slate:   'bg-slate-100 text-slate-600 ring-slate-200',
};

const METHOD_LABEL = {
  card: 'Tarjeta',
  cash: 'Efectivo',
  bank_transfer: 'Transferencia bancaria',
  other: 'Otro',
};

const REFUND_PRESETS = [0.25, 0.5, 1];
const REASON_PRESETS = [
  'Cancelación solicitada por el cliente',
  'Cargo duplicado',
  'Servicio no prestado',
  'Corrección de precio',
];

/* ================================================================== */
/*  Utilities                                                          */
/* ================================================================== */
const fmtMoney = (n, currency = 'EUR') => {
  const v = Number(n || 0);
  if (!Number.isFinite(v)) return '—';
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(v);
  } catch {
    return `${currency} ${v.toLocaleString()}`;
  }
};

const fmtDateTime = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString(undefined, {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return '—';
  }
};

const shortHash = (id) => (id ? `${String(id).slice(0, 8)}…` : '—');

/** Normalize a Supabase FK join that may come back as object or array. */
function oneOrFirst(value) {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function useToasts() {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((tone, message) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, tone, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);
  const dismiss = (id) => setToasts((t) => t.filter((x) => x.id !== id));
  return { toasts, push, dismiss };
}

/* ================================================================== */
/*  Primitives                                                         */
/* ================================================================== */
function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.pending;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${TONE_MAP[meta.tone]}`}>
      <Icon className="h-3.5 w-3.5" />
      {meta.label}
    </span>
  );
}

function SectionCard({ title, icon: Icon, action, children, subtitle }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div className="flex items-start gap-2">
          {Icon && (
            <span className="mt-0.5 grid h-7 w-7 place-items-center rounded-lg bg-amber-500/10 text-amber-600 ring-1 ring-inset ring-amber-200">
              <Icon className="h-3.5 w-3.5" />
            </span>
          )}
          <div>
            <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[11px] text-slate-500">{subtitle}</p>}
          </div>
        </div>
        {action}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

function ToastStack({ toasts, dismiss }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed right-4 top-4 z-[70] flex w-[340px] max-w-[calc(100vw-2rem)] flex-col gap-2">
      {toasts.map((t) => {
        const meta = t.tone === 'success' ? STATUS_META.completed : STATUS_META.failed;
        const Icon = meta.icon;
        return (
          <div
            key={t.id}
            role="status"
            className={`flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-medium shadow-lg ring-1 ring-inset ${
              t.tone === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800 ring-emerald-200'
                : 'border-rose-200 bg-rose-50 text-rose-800 ring-rose-200'
            }`}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="flex-1">{t.message}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="rounded p-0.5 hover:bg-black/5"
              aria-label="Descartar"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function Modal({ children, onClose, maxW = 'max-w-lg' }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="presentation"
    >
      <div className={`my-8 w-full ${maxW} overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl`}>
        {children}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Page                                                               */
/* ================================================================== */
export default function PaymentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { invoice: invoiceConfig, currency: defaultCurrency } = useAppSettings();
  const { toasts, push, dismiss } = useToasts();

  const [payment, setPayment] = useState(null);
  const [booking, setBooking] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [profilesById, setProfilesById] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [copied, setCopied] = useState(false);

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusReason, setStatusReason] = useState('');

  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundData, setRefundData] = useState({ amount: '', refund_reason: '', payment_method: 'card' });
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [auditQuery, setAuditQuery] = useState('');
  const auditSearchRef = useRef(null);

  /* ---------- Fetch ---------- */
  const fetchPaymentDetails = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);

      const payRes = await supabase
        .from('booking_payments')
        .select('*, bookings(*)')
        .eq('id', id)
        .single();
      if (payRes.error) throw payRes.error;

      const pay = payRes.data;
      const normalizedBooking = oneOrFirst(pay.bookings);
      setPayment(pay);
      setBooking(normalizedBooking);
      setNewStatus(pay.transaction_status);

      const [custRes, ledgerRes, auditRes, profilesRes] = await Promise.all([
        normalizedBooking?.customer_id
          ? supabase.from('customers').select('*').eq('id', normalizedBooking.customer_id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        supabase
          .from('booking_payments')
          .select('*')
          .eq('booking_id', pay.booking_id)
          .order('transaction_date', { ascending: true }),
        supabase
          .from('audit_logs')
          .select('*')
          .eq('entity_id', id)
          .order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, full_name, email'),
      ]);

      setCustomer(custRes.error ? null : custRes.data);
      setLedger(ledgerRes.error ? [] : ledgerRes.data || []);
      setAuditLogs(auditRes.error ? [] : auditRes.data || []);
      const profileMap = {};
      (profilesRes.error ? [] : profilesRes.data || []).forEach((p) => { profileMap[p.id] = p; });
      setProfilesById(profileMap);
    } catch (err) {
      console.error('Error fetching transaction detail:', err);
      setError(err?.message || 'No se pudo cargar el perfil de la transacción.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchPaymentDetails(); }, [fetchPaymentDetails]);

  /* ---------- Derived ledger math (BEFORE keyboard effect) ---------- */
  const { netCollected, totalRefunded, refundableRemaining } = useMemo(() => {
    const completed = (ledger || []).filter((r) => r.transaction_status === 'completed');
    const paymentsSum = completed
      .filter((r) => r.transaction_type === 'payment')
      .reduce((s, r) => s + Number(r.amount || 0), 0);
    const refundsSum = completed
      .filter((r) => r.transaction_type === 'refund')
      .reduce((s, r) => s + Number(r.amount || 0), 0);
    return {
      netCollected: paymentsSum - refundsSum,
      totalRefunded: refundsSum,
      refundableRemaining: Math.max(0, paymentsSum - refundsSum),
    };
  }, [ledger]);

  const isImmutable = payment?.transaction_status === 'completed';
  const isRefundableBase = payment?.transaction_type === 'payment' && isImmutable;
  const canRefund = isRefundableBase && refundableRemaining > 0;

  const originalPayment = useMemo(() => {
    if (payment?.transaction_type !== 'refund' || !payment?.original_payment_id) return null;
    return (ledger || []).find((r) => r.id === payment.original_payment_id) || null;
  }, [payment, ledger]);

  /* ---------- Keyboard shortcuts (now canRefund is defined) ---------- */
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target?.tagName || '').toLowerCase();
      const isTyping = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable;
      if (e.key === 'Escape') {
        if (isStatusModalOpen) setIsStatusModalOpen(false);
        else if (isRefundModalOpen) setIsRefundModalOpen(false);
        return;
      }
      if (isTyping) return;
      if (e.key === '/') {
        e.preventDefault();
        auditSearchRef.current?.focus();
      }
      if (e.key.toLowerCase() === 'r' && canRefund && !isRefundModalOpen) {
        setIsRefundModalOpen(true);
      }
      if (e.key.toLowerCase() === 's' && payment?.transaction_status !== 'completed' && !isStatusModalOpen) {
        setIsStatusModalOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isStatusModalOpen, isRefundModalOpen, payment, canRefund]);

  /* ---------- Status change ---------- */
  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (isImmutable) {
      push('error', 'Los pagos completados son inmutables. Emite un reembolso para corregirlo.');
      return;
    }
    if (['failed', 'voided', 'cancelled'].includes(newStatus) && !statusReason.trim()) {
      push('error', 'Se requiere un motivo al pasar a un estado fallido, anulado o cancelado.');
      return;
    }
    try {
      setFormSubmitting(true);
      const { error: err } = await supabase
        .from('booking_payments')
        .update({
          transaction_status: newStatus,
          status_changed_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (err) throw err;

      push('success', 'Estado actualizado y registrado en la auditoría.');
      setIsStatusModalOpen(false);
      setStatusReason('');
      await fetchPaymentDetails();
    } catch (err) {
      console.error('Error updating status:', err);
      push('error', `No se pudo actualizar el estado: ${err.message}`);
    } finally {
      setFormSubmitting(false);
    }
  };

  /* ---------- Refund ---------- */
  const handleIssueRefund = async (e) => {
    e.preventDefault();
    const amount = parseFloat(refundData.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      push('error', 'Introduce un importe de reembolso mayor que cero.');
      return;
    }
    if (amount > refundableRemaining + 0.0001) {
      push('error', `El reembolso no puede superar el saldo reembolsable de ${fmtMoney(refundableRemaining, payment.currency)}.`);
      return;
    }
    try {
      setFormSubmitting(true);
      const payload = {
        booking_id: payment.booking_id,
        original_payment_id: payment.id,
        transaction_type: 'refund',
        payment_method: refundData.payment_method,
        amount,
        currency: payment.currency,
        transaction_status: 'completed',
        refund_reason: refundData.refund_reason || null,
        recorded_by: user?.id,
      };
      const { error: err } = await supabase.from('booking_payments').insert([payload]);
      if (err) throw err;

      push('success', `Reembolso de ${fmtMoney(amount, payment.currency)} emitido.`);
      setIsRefundModalOpen(false);
      setRefundData({ amount: '', refund_reason: '', payment_method: 'card' });
      await fetchPaymentDetails();
    } catch (err) {
      console.error('Error issuing refund:', err);
      push('error', `Error en el reembolso: ${err.message}`);
    } finally {
      setFormSubmitting(false);
    }
  };

  /* ---------- Invoice PDF (dynamic import) ---------- */
  const handleDownloadInvoice = async () => {
    try {
      setGeneratingPdf(true);
      const invoiceBuilder = await loadInvoiceBuilder();
      if (!invoiceBuilder) {
        push('error', 'El generador de facturas no está disponible en esta versión.');
        return;
      }
      const doc = await invoiceBuilder.buildInvoicePdf({
        payment,
        booking,
        customer,
        ledger,
        invoiceConfig,
        defaultCurrency,
      });
      doc.save(invoiceBuilder.getInvoiceFileName(payment, invoiceConfig));
      push('success', 'Factura descargada.');
    } catch (err) {
      console.error('Error generating PDF:', err);
      push('error', `No se pudo generar la factura: ${err.message}`);
    } finally {
      setGeneratingPdf(false);
    }
  };

  /* ---------- Copy helpers ---------- */
  const handleCopyReference = async () => {
    try {
      await navigator.clipboard.writeText(getTransactionReference(payment));
      setCopied(true);
      push('success', 'Referencia copiada.');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      push('error', 'No se pudo copiar la referencia.');
    }
  };

  /* ---------- Filtered audit ---------- */
  const filteredAudit = useMemo(() => {
    const q = auditQuery.trim().toLowerCase();
    if (!q) return auditLogs;
    return auditLogs.filter((log) =>
      [log.action, log.description, log.actor_id]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [auditLogs, auditQuery]);

  /* ---------- Render guards ---------- */
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-3 text-sm text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin text-amber-600" />{translate('Cargando transacción…')}</div>
    );
  }
  if (error && !payment) {
    return (
      <main className="m-6 rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
        <p className="flex items-center gap-2"><AlertCircle className="h-4 w-4" /> {error}</p>
        <button
          type="button"
          onClick={() => navigate('/admin/payments-transactions')}
          className="mt-3 font-semibold underline"
        >{translate('Volver a pagos')}</button>
      </main>
    );
  }
  if (!payment) {
    return (
      <main className="m-6 rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
        <p className="flex items-center gap-2"><AlertCircle className="h-4 w-4" />{translate('Transacción no encontrada.')}</p>
        <button
          type="button"
          onClick={() => navigate('/admin/payments-transactions')}
          className="mt-3 font-semibold underline"
        >{translate('Volver a pagos')}</button>
      </main>
    );
  }

  const isRefund = payment.transaction_type === 'refund';
  const refNumber = getTransactionReference(payment);

  return (
    <main className="min-h-screen bg-slate-50/70 pb-10">
      <ToastStack toasts={toasts} dismiss={dismiss} />

      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => navigate('/admin/payments-transactions')}
              className="mt-0.5 rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
              aria-label="Volver a pagos"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900">
                  {isRefund ? 'Reembolso' : 'Pago'} · {refNumber}
                </h1>
                <StatusBadge status={payment.transaction_status} />
                {isRefund && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-rose-700 ring-1 ring-inset ring-rose-200">
                    <ArrowUpRight className="h-3 w-3" />{translate('Reembolso')}</span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                {METHOD_LABEL[payment.payment_method] || payment.payment_method} · {fmtDateTime(payment.transaction_date || payment.created_at)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyReference}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Clipboard className="h-3.5 w-3.5" />}
              {copied ? 'Copiado' : 'Copiar referencia'}
            </button>
            <button
              type="button"
              onClick={handleDownloadInvoice}
              disabled={generatingPdf || payment.transaction_status !== 'completed'}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {generatingPdf
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Download className="h-3.5 w-3.5" />}
              {isRefund ? 'Nota de crédito PDF' : 'Factura PDF'}
            </button>
            {!isImmutable && (
              <button
                type="button"
                onClick={() => setIsStatusModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-500"
              >
                <RefreshCw className="h-3.5 w-3.5" />{translate('Actualizar estado')}</button>
            )}
            {canRefund && (
              <button
                type="button"
                onClick={() => setIsRefundModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-500"
              >
                <ArrowUpRight className="h-3.5 w-3.5" />{translate('Emitir reembolso')}</button>
            )}
            {isImmutable && payment.transaction_type === 'payment' && refundableRemaining === 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                <ShieldCheck className="h-3.5 w-3.5" />{translate('Totalmente reembolsado')}</span>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto mt-6 grid max-w-[1500px] grid-cols-1 gap-6 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* LEFT */}
        <div className="space-y-6">
          <section
            className={`relative overflow-hidden rounded-2xl border p-6 ${
              isRefund
                ? 'border-rose-200 bg-gradient-to-br from-rose-50 to-white'
                : 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white'
            }`}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4">
                <div
                  className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-white shadow-sm ${
                    isRefund ? 'bg-rose-600' : 'bg-emerald-600'
                  }`}
                >
                  {isRefund ? <ArrowUpRight className="h-7 w-7" /> : <ArrowDownLeft className="h-7 w-7" />}
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                    {isRefund ? 'Importe del reembolso' : 'Importe del pago'}
                  </p>
                  <p
                    className={`mt-1 text-3xl font-extrabold tracking-tight ${
                      isRefund ? 'text-rose-700' : 'text-slate-900'
                    }`}
                  >
                    {isRefund ? '−' : '+'}{fmtMoney(payment.amount, payment.currency)}
                  </p>
                  {isImmutable && (
                    <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-700 ring-1 ring-inset ring-slate-200">
                      <Lock className="h-3 w-3" />{translate('Registro inmutable')}</p>
                  )}
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-3 text-xs sm:text-right">
                <div>
                  <dt className="text-slate-500">{translate('Neto cobrado')}</dt>
                  <dd className="font-semibold text-slate-900">{fmtMoney(netCollected, payment.currency)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">{translate('Reembolsado')}</dt>
                  <dd className="font-semibold text-rose-700">{fmtMoney(totalRefunded, payment.currency)}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-slate-500">{translate('Saldo reembolsable')}</dt>
                  <dd className="font-semibold text-slate-900">{fmtMoney(refundableRemaining, payment.currency)}</dd>
                </div>
              </dl>
            </div>
          </section>

          <SectionCard
            title="Reserva"
            icon={FileText}
            action={booking && (
              <button
                type="button"
                onClick={() => navigate(`/admin/reservations?bookingId=${booking.id}`)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:underline"
              >
                Abrir reserva <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          >
            {booking ? (
              <div className="grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="font-mono text-sm font-semibold text-amber-700">{booking.booking_reference || '—'}</p>
                  <p className="text-xs text-slate-500">
                    {booking.destination || '—'} · {booking.traveler_count || 1} viajero{(booking.traveler_count || 1) === 1 ? '' : 's'}
                  </p>
                  {customer && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-600">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      {customer.full_name} · {customer.email || customer.phone || '—'}
                    </p>
                  )}
                </div>
                <dl className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <dt className="text-slate-500">{translate('Total de la reserva')}</dt>
                    <dd className="font-semibold text-slate-900">{fmtMoney(booking.total_amount, booking.currency)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">{translate('Estado de la reserva')}</dt>
                    <dd className="font-semibold text-slate-900 capitalize">{booking.booking_status || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">{translate('Salida')}</dt>
                    <dd className="font-semibold text-slate-900">{booking.departure_date || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">{translate('Regreso')}</dt>
                    <dd className="font-semibold text-slate-900">{booking.return_date || '—'}</dd>
                  </div>
                </dl>
              </div>
            ) : (
              <p className="text-xs text-slate-500">{translate('Contexto de la reserva no disponible.')}</p>
            )}
          </SectionCard>

          <SectionCard
            title="Libro de transacciones"
            icon={History}
            subtitle={`${ledger.length} transacción${ledger.length === 1 ? '' : 'es'} en esta reserva`}
          >
            {ledger.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-400">{translate('No hay transacciones registradas.')}</p>
            ) : (
              <ul className="space-y-2">
                {ledger.map((row) => {
                  const isCurrent = row.id === payment.id;
                  const refund = row.transaction_type === 'refund';
                  return (
                    <li
                      key={row.id}
                      onClick={() => !isCurrent && navigate(`/admin/payments-transactions/${row.id}`)}
                      className={`flex items-center justify-between gap-3 rounded-lg border p-3 text-xs transition ${
                        isCurrent
                          ? 'border-amber-300 bg-amber-50/50'
                          : 'cursor-pointer border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`grid h-7 w-7 place-items-center rounded-lg text-white ${
                            refund ? 'bg-rose-600' : 'bg-emerald-600'
                          }`}
                        >
                          {refund ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownLeft className="h-3.5 w-3.5" />}
                        </span>
                        <div>
                          <p className="font-semibold text-slate-900">
                            {refund ? 'Reembolso' : 'Pago'}
                            {isCurrent && (
                              <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-amber-800">{translate('actual')}</span>
                            )}
                          </p>
                          <p className="text-[10px] text-slate-400">{fmtDateTime(row.transaction_date || row.created_at)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={row.transaction_status} />
                        <p className={`font-semibold ${refund ? 'text-rose-700' : 'text-emerald-700'}`}>
                          {refund ? '−' : '+'}{fmtMoney(row.amount, row.currency || payment.currency)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>

          <SectionCard
            title="Registro de auditoría"
            icon={History}
            subtitle={`${auditLogs.length} evento${auditLogs.length === 1 ? '' : 's'}`}
            action={
              <div className="relative">
                <Search className="pointer-events-none absolute inset-y-0 left-2.5 my-auto h-3.5 w-3.5 text-slate-400" />
                <input
                  ref={auditSearchRef}
                  value={auditQuery}
                  onChange={(e) => setAuditQuery(e.target.value)}
                  placeholder="Filtrar ( / )"
                  className="w-44 rounded-lg border border-slate-200 py-1.5 pl-8 pr-2 text-xs focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
            }
          >
            {filteredAudit.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-400">
                {auditLogs.length === 0 ? 'Aún no hay eventos registrados.' : 'Ningún evento coincide con el filtro.'}
              </p>
            ) : (
              <ol className="relative space-y-3 before:absolute before:bottom-2 before:left-[13px] before:top-2 before:w-px before:bg-slate-200">
                {filteredAudit.map((log) => {
                  const actor = profilesById[log.actor_id];
                  return (
                    <li key={log.id} className="relative flex items-start gap-3">
                      <span className="z-10 mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white text-amber-600 ring-2 ring-amber-200">
                        <Clock className="h-3 w-3" />
                      </span>
                      <div className="flex-1 rounded-lg border border-slate-200 bg-white p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
                            {log.action || 'evento'}
                          </span>
                          <span className="text-xs font-medium text-slate-800">{log.description || '—'}</span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                          {fmtDateTime(log.created_at)}
                          {' · '}
                          {actor?.full_name || actor?.email || shortHash(log.actor_id)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </SectionCard>
        </div>

        {/* RIGHT */}
        <aside className="space-y-6">
          <SectionCard title="Estado" icon={ShieldCheck}>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">{translate('Actual')}</span>
                <StatusBadge status={payment.transaction_status} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">{translate('Cambiado el')}</span>
                <span className="font-medium text-slate-800">{fmtDateTime(payment.status_changed_at)}</span>
              </div>
              {isImmutable && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-[11px] leading-relaxed text-emerald-800">
                  <p className="flex items-center gap-1.5 font-semibold">
                    <Lock className="h-3.5 w-3.5" />{translate('Las transacciones completadas son inmutables')}</p>
                  <p className="mt-1">{translate('Para corregir un pago completado, emite un reembolso en lugar de editarlo.')}</p>
                </div>
              )}
              {!isImmutable && (
                <button
                  type="button"
                  onClick={() => setIsStatusModalOpen(true)}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <RefreshCw className="h-3.5 w-3.5" />{translate('Actualizar estado')}</button>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Reembolsos" icon={ArrowUpRight}>
            <div className="space-y-3 text-xs">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-slate-500">{translate('Saldo reembolsable')}</p>
                <p className="mt-0.5 text-base font-bold text-slate-900">
                  {fmtMoney(refundableRemaining, payment.currency)}
                </p>
                <p className="mt-0.5 text-[10px] text-slate-500">
                  {fmtMoney(totalRefunded, payment.currency)} ya reembolsado de {fmtMoney(netCollected + totalRefunded, payment.currency)}
                </p>
              </div>

              {originalPayment && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
                  <p className="text-[11px] font-semibold uppercase text-rose-700">{translate('Revierte el pago')}</p>
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/payments-transactions/${originalPayment.id}`)}
                    className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-rose-700 hover:underline"
                  >
                    {getTransactionReference(originalPayment)} <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              )}

              {canRefund ? (
                <button
                  type="button"
                  onClick={() => setIsRefundModalOpen(true)}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-500"
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />{translate('Emitir reembolso')}</button>
              ) : (
                isImmutable && payment.transaction_type === 'payment' && refundableRemaining === 0 && (
                  <p className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-[11px] text-slate-600">{translate('Este pago ha sido reembolsado en su totalidad.')}</p>
                )
              )}
            </div>
          </SectionCard>

          <SectionCard title="Metadatos" icon={CreditCard}>
            <dl className="grid gap-2 text-xs">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">{translate('ID de transacción')}</dt>
                <dd className="font-mono text-slate-800" title={payment.id}>{shortHash(payment.id)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">{translate('Método')}</dt>
                <dd className="font-medium text-slate-800">{METHOD_LABEL[payment.payment_method] || payment.payment_method}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">{translate('Moneda')}</dt>
                <dd className="font-medium text-slate-800">{payment.currency}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">{translate('Registrado por')}</dt>
                <dd className="font-medium text-slate-800">
                  {profilesById[payment.recorded_by]?.full_name
                    || profilesById[payment.recorded_by]?.email
                    || shortHash(payment.recorded_by)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">{translate('Creado')}</dt>
                <dd className="font-medium text-slate-800">{fmtDateTime(payment.created_at)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">{translate('Actualizado')}</dt>
                <dd className="font-medium text-slate-800">{fmtDateTime(payment.updated_at)}</dd>
              </div>
            </dl>
          </SectionCard>
        </aside>
      </div>

      {/* STATUS MODAL */}
      {isStatusModalOpen && (
        <Modal onClose={() => setIsStatusModalOpen(false)}>
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-5 py-3">
            <h3 className="text-sm font-semibold text-slate-900">{translate('Actualizar estado de la transacción')}</h3>
            <button
              type="button"
              onClick={() => setIsStatusModalOpen(false)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={handleUpdateStatus} className="space-y-4 p-5">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
              <span className="text-slate-500">{translate('Actual:')}</span>
              <StatusBadge status={payment.transaction_status} />
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-slate-500">{translate('Nuevo:')}</span>
              <StatusBadge status={newStatus} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">{translate('Nuevo estado')}</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              >
                <option value="pending">{translate('Pendiente')}</option>
                <option value="completed">{translate('Completado (se vuelve inmutable)')}</option>
                <option value="failed">{translate('Fallido')}</option>
                <option value="voided">{translate('Anulado')}</option>
                <option value="cancelled">{translate('Cancelado')}</option>
              </select>
            </div>
            {['failed', 'voided', 'cancelled'].includes(newStatus) && (
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Motivo <span className="text-rose-500">{translate('*')}</span>
                </label>
                <textarea
                  rows={3}
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="Explica por qué cambia este estado."
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
            )}
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setIsStatusModalOpen(false)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >{translate('Cancelar')}</button>
              <button
                type="submit"
                disabled={formSubmitting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
              >
                {formSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Guardar estado
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* REFUND MODAL */}
      {isRefundModalOpen && (
        <Modal onClose={() => setIsRefundModalOpen(false)}>
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-5 py-3">
            <h3 className="text-sm font-semibold text-slate-900">{translate('Emitir reembolso')}</h3>
            <button
              type="button"
              onClick={() => setIsRefundModalOpen(false)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={handleIssueRefund} className="space-y-4 p-5">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">{translate('Saldo reembolsable')}</span>
                <span className="font-semibold text-slate-900">{fmtMoney(refundableRemaining, payment.currency)}</span>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Importe del reembolso ({payment.currency}) <span className="text-rose-500">{translate('*')}</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={refundableRemaining}
                required
                value={refundData.amount}
                onChange={(e) => setRefundData((p) => ({ ...p, amount: e.target.value }))}
                placeholder="0,00"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {REFUND_PRESETS.map((f) => {
                  const value = +(refundableRemaining * f).toFixed(2);
                  if (value <= 0) return null;
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setRefundData((p) => ({ ...p, amount: String(value) }))}
                      className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-amber-300 hover:bg-amber-50"
                    >
                      {Math.round(f * 100)}% · {fmtMoney(value, payment.currency)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">{translate('Motivo')}</label>
              <textarea
                rows={3}
                value={refundData.refund_reason}
                onChange={(e) => setRefundData((p) => ({ ...p, refund_reason: e.target.value }))}
                placeholder="Describe el motivo del reembolso."
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {REASON_PRESETS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRefundData((p) => ({ ...p, refund_reason: r }))}
                    className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-slate-300"
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">{translate('Método de reembolso')}</label>
              <select
                value={refundData.payment_method}
                onChange={(e) => setRefundData((p) => ({ ...p, payment_method: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              >
                <option value="card">{translate('Tarjeta')}</option>
                <option value="cash">{translate('Efectivo')}</option>
                <option value="bank_transfer">{translate('Transferencia bancaria')}</option>
                <option value="other">{translate('Otro')}</option>
              </select>
            </div>

            {refundData.amount && Number(refundData.amount) > 0 && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-[11px] text-rose-800">
                Tras este reembolso, quedarán {fmtMoney(Math.max(0, refundableRemaining - Number(refundData.amount)), payment.currency)} reembolsables en este pago.
              </div>
            )}

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setIsRefundModalOpen(false)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >{translate('Cancelar')}</button>
              <button
                type="submit"
                disabled={formSubmitting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
              >
                {formSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Confirmar reembolso
              </button>
            </div>
          </form>
        </Modal>
      )}
    </main>
  );
}