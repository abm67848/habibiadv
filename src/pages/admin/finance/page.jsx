import { useAuth } from '@/context/index.jsx';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  Wallet, TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight,
  RefreshCw, Calendar, Download, AlertTriangle, Building2, Users, FileText, CheckCircle2, Trash2,
  ChevronDown, ArrowRight, Check
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

// --- Utilidades ---
const LOCALE = 'es-ES';
const fmtMoney = (amount, currency = 'MAD') =>
  new Intl.NumberFormat(LOCALE, { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount || 0);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(LOCALE) : '-');
const toISO = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const fmtShort = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' });
};

const PAYMENT_STATUS_ES = {
  paid: 'Pagado',
  partially_paid: 'Parcial',
  cancelled: 'Cancelado',
  unpaid: 'Sin pagar',
};
const METHOD_ES = {
  cash: 'efectivo',
  card: 'tarjeta',
  credit_card: 'tarjeta de crédito',
  bank_transfer: 'transferencia bancaria',
  transfer: 'transferencia',
  unknown: 'desconocido',
};
const TYPE_ES = { payment: 'Pago', refund: 'Reembolso' };

// --- Selector de rango de fechas ---
const getPresets = () => {
  const now = new Date();
  const today = toISO(now);
  const daysAgo = (n) => {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    return toISO(d);
  };
  return [
    { id: 'today', label: 'Hoy', start: today, end: today },
    { id: '7d', label: 'Últimos 7 días', start: daysAgo(6), end: today },
    { id: '30d', label: 'Últimos 30 días', start: daysAgo(29), end: today },
    { id: 'month', label: 'Este mes', start: toISO(new Date(now.getFullYear(), now.getMonth(), 1)), end: today },
    {
      id: 'lastMonth',
      label: 'Mes pasado',
      start: toISO(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      end: toISO(new Date(now.getFullYear(), now.getMonth(), 0)),
    },
    { id: 'year', label: 'Este año', start: toISO(new Date(now.getFullYear(), 0, 1)), end: today },
  ];
};

function DateRangePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const presets = useMemo(getPresets, [open]);
  const activePreset = presets.find((p) => p.start === value.start && p.end === value.end);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const setStart = (start) => onChange({ start, end: start > value.end ? start : value.end });
  const setEnd = (end) => onChange({ start: end < value.start ? end : value.start, end });

  const dayCount = Math.max(
    1,
    Math.round((new Date(value.end) - new Date(value.start)) / 86400000) + 1
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`group flex items-center gap-3 rounded-xl border bg-white pl-3 pr-3 py-2 shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
          open ? 'border-amber-400 ring-4 ring-amber-100' : 'border-slate-200 hover:border-amber-300'
        }`}
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
          <Calendar className="h-4 w-4" />
        </span>
        <span className="text-left">
          <span className="block text-[11px] font-medium text-slate-400 leading-none">
            {activePreset ? activePreset.label : 'Rango personalizado'}
          </span>
          <span className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-800">
            {fmtShort(value.start)}
            <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            {fmtShort(value.end)}
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Seleccionar rango de fechas"
          className="absolute right-0 z-30 mt-2 w-[min(92vw,520px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10"
        >
          <div className="grid grid-cols-1 sm:grid-cols-[170px_1fr]">
            <div className="border-b border-slate-100 bg-slate-50/70 p-2 sm:border-b-0 sm:border-r">
              <p className="px-3 pb-1 pt-2 text-xs font-semibold text-slate-500">Rangos rápidos</p>
              <div className="flex flex-wrap gap-1 sm:flex-col">
                {presets.map((p) => {
                  const active = activePreset?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { onChange({ start: p.start, end: p.end }); setOpen(false); }}
                      className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                        active
                          ? 'bg-amber-500 font-semibold text-white shadow-sm'
                          : 'text-slate-600 hover:bg-white hover:text-slate-900'
                      }`}
                    >
                      {p.label}
                      {active && <Check className="h-3.5 w-3.5" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-5">
              <p className="text-xs font-semibold text-slate-500">Rango personalizado</p>
              <div className="mt-3 space-y-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600">Desde</span>
                  <input
                    type="date"
                    value={value.start}
                    max={value.end}
                    onChange={(e) => e.target.value && setStart(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-800 transition focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-amber-100"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600">Hasta</span>
                  <input
                    type="date"
                    value={value.end}
                    min={value.start}
                    onChange={(e) => e.target.value && setEnd(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-800 transition focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-amber-100"
                  />
                </label>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <span>Período seleccionado</span>
                <span className="font-semibold">{dayCount} {dayCount === 1 ? 'día' : 'días'}</span>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-4 w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Tarjeta KPI ---
const KPICard = ({ title, value, subtext, icon: Icon, trend, trendValue, colorClass = 'text-slate-900' }) => (
  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-xs font-semibold text-slate-500 tracking-wide">{title}</p>
        <h3 className={`text-2xl font-bold mt-2 ${colorClass}`}>{value}</h3>
      </div>
      <div className="p-2 bg-slate-50 rounded-lg text-slate-400">
        <Icon className="w-5 h-5" />
      </div>
    </div>
    {(subtext || trend) && (
      <div className="mt-3 flex items-center gap-2 text-xs font-medium">
        {trend === 'up' && <span className="text-emerald-600 flex items-center gap-1"><ArrowUpRight className="w-3 h-3" /> {trendValue}%</span>}
        {trend === 'down' && <span className="text-rose-600 flex items-center gap-1"><ArrowDownRight className="w-3 h-3" /> {trendValue}%</span>}
        {subtext && <span className="text-slate-500">{subtext}</span>}
      </div>
    )}
  </div>
);

export default function FinancePage() {
  const { user } = useAuth();

  // Estado global
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dataWarning, setDataWarning] = useState(null);
  const [deletingPaymentId, setDeletingPaymentId] = useState(null);

  // Filtros globales
  const [dateRange, setDateRange] = useState({
    start: toISO(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
    end: toISO(new Date()),
  });

  // Datos
  const [rawData, setRawData] = useState({
    bookings: [],
    customerPayments: [],
    expenses: [],
    supplierCosts: [], // de offer_costs
  });

  // --- Carga de datos ---
  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      setError(null);
      setDataWarning(null);

      const [bookingsRes, custPaymentsRes, expensesRes, suppCostsRes] = await Promise.all([
        supabase.from('bookings').select('*, customers(full_name)'),
        supabase.from('booking_payments').select('*').eq('transaction_status', 'completed'),
        supabase.from('expenses').select('*'),
        supabase.from('offer_costs').select('*, offers(public_title, bookings(id))'), // COGS directo
      ]);

      if (bookingsRes.error) throw bookingsRes.error;
      if (custPaymentsRes.error) throw custPaymentsRes.error;

      const optionalSourceErrors = [
        ['gastos', expensesRes.error],
        ['costes de ofertas', suppCostsRes.error],
      ].filter(([, sourceError]) => sourceError);

      setRawData({
        bookings: bookingsRes.data || [],
        customerPayments: custPaymentsRes.data || [],
        expenses: expensesRes.error ? [] : expensesRes.data || [],
        supplierCosts: suppCostsRes.error ? [] : suppCostsRes.data || [],
      });
      if (optionalSourceErrors.length > 0) {
        setDataWarning(
          `No se pudieron cargar algunos datos financieros: ${optionalSourceErrors
            .map(([source, sourceError]) => `${source}: ${sourceError.message}`)
            .join('; ')}`,
        );
      }
    } catch (err) {
      console.error(err);
      setError(err?.message || 'No se pudieron sincronizar los datos financieros. Verifica la conexión con la base de datos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const deleteCustomerPayment = async (payment) => {
    const type = payment.transaction_type === 'refund' ? 'reembolso' : 'pago';
    const amount = fmtMoney(payment.amount, payment.currency || 'MAD');
    if (!window.confirm(`¿Eliminar definitivamente este ${type} de ${amount}? Esta acción no se puede deshacer.`)) return;

    setDeletingPaymentId(payment.id);
    setError(null);
    try {
      const { data, error: deleteError } = await supabase
        .from('booking_payments')
        .delete()
        .eq('id', payment.id)
        .select('id');

      if (deleteError) throw deleteError;
      if (!data?.length) throw new Error('No se eliminó ningún pago. Es posible que ya haya sido borrado.');

      setRawData((current) => ({
        ...current,
        customerPayments: current.customerPayments.filter((item) => item.id !== payment.id),
      }));
    } catch (deleteError) {
      console.error('Failed to delete customer payment transaction:', deleteError);
      setError(`No se pudo eliminar la transacción: ${deleteError.message || 'Inténtalo de nuevo.'}`);
    } finally {
      setDeletingPaymentId(null);
    }
  };

  // --- Motor de cálculo ---
  const metrics = useMemo(() => {
    const inRange = (dateStr) => {
      if (!dateStr) return false;
      const d = new Date(dateStr).toISOString().split('T')[0];
      return d >= dateRange.start && d <= dateRange.end;
    };

    const filteredBookings = rawData.bookings.filter((b) => inRange(b.created_at));
    const filteredCustPayments = rawData.customerPayments.filter((p) => inRange(p.transaction_date || p.created_at));
    const filteredExpenses = rawData.expenses.filter((e) => inRange(e.expense_date));

    // Valor de ventas
    const totalSalesValue = filteredBookings.reduce((sum, b) => sum + Number(b.total_amount), 0);

    // Entradas de caja (pagos - reembolsos)
    const cashIn = filteredCustPayments.reduce(
      (sum, p) => sum + (p.transaction_type === 'payment' ? Number(p.amount) : -Number(p.amount)),
      0,
    );

    // Los pagos a proveedores se registran como importes pagados en los gastos.
    const activeExpenses = filteredExpenses.filter((e) => e.payment_status !== 'cancelled');
    const cashOutExpenses = activeExpenses.reduce((sum, e) => sum + Number(e.paid_amount || 0), 0);
    const totalCashOut = cashOutExpenses;

    // Cuentas por cobrar
    let accountsReceivable = 0;
    filteredBookings.forEach((b) => {
      const paidForBooking = rawData.customerPayments
        .filter((p) => p.booking_id === b.id && p.transaction_status === 'completed')
        .reduce((sum, p) => sum + (p.transaction_type === 'payment' ? Number(p.amount) : -Number(p.amount)), 0);

      const balance = Number(b.total_amount) - paidForBooking;
      if (balance > 0) accountsReceivable += balance;
    });

    // Cuentas por pagar
    const accountsPayable = activeExpenses.reduce(
      (sum, e) => sum + Math.max(0, Number(e.amount || 0) - Number(e.paid_amount || 0)),
      0,
    );

    // Rentabilidad
    const grossProfit = totalSalesValue - (accountsPayable + cashOutExpenses); // COGS simplificado
    const netProfit = cashIn - totalCashOut;
    const profitMargin = totalSalesValue > 0 ? (grossProfit / totalSalesValue) * 100 : 0;
    const cashBalance = cashIn - totalCashOut;

    return {
      totalSalesValue, cashIn, totalCashOut, accountsReceivable, accountsPayable,
      grossProfit, netProfit, profitMargin, cashBalance,
      filteredBookings, filteredCustPayments, filteredExpenses,
    };
  }, [rawData, dateRange]);

  // --- Datos del gráfico ---
  const chartData = useMemo(() => {
    const monthlyData = {};
    const monthName = (d) => new Date(d).toLocaleString(LOCALE, { month: 'short' });

    metrics.filteredCustPayments.forEach((p) => {
      const m = monthName(p.transaction_date || p.created_at);
      if (!monthlyData[m]) monthlyData[m] = { name: m, revenue: 0, expenses: 0 };
      monthlyData[m].revenue += p.transaction_type === 'payment' ? Number(p.amount) : -Number(p.amount);
    });

    metrics.filteredExpenses.forEach((e) => {
      const m = monthName(e.expense_date);
      if (!monthlyData[m]) monthlyData[m] = { name: m, revenue: 0, expenses: 0 };
      if (e.payment_status !== 'cancelled') monthlyData[m].expenses += Number(e.paid_amount || 0);
    });

    return Object.values(monthlyData);
  }, [metrics]);

  const TABS = [
    { id: 'overview', label: 'Resumen', icon: TrendingUp },
    { id: 'revenue', label: 'Ingresos y cobros', icon: DollarSign },
    { id: 'expenses', label: 'Gastos y pagos', icon: TrendingDown },
    { id: 'profitability', label: 'Rentabilidad', icon: FileText },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6 bg-slate-50 min-h-screen">

      {/* Encabezado y filtros globales */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Panel financiero</h1>
          <p className="text-sm text-slate-500 mt-1">Habibi Adventure Hafa S.L. — Visión financiera en tiempo real.</p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <button
            onClick={fetchFinancialData}
            aria-label="Actualizar datos"
            title="Actualizar datos"
            className="flex h-[52px] w-[52px] items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-amber-300 hover:text-amber-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg flex items-center gap-2 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}
      {dataWarning && (
        <div role="status" className="p-4 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg flex items-center gap-2 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {dataWarning}
        </div>
      )}

      {/* Fila de KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Ingresos totales (caja)" value={fmtMoney(metrics.cashIn)} icon={ArrowUpRight} colorClass="text-emerald-600" subtext="Cobrado a clientes" />
        <KPICard title="Gastos totales (caja)" value={fmtMoney(metrics.totalCashOut)} icon={ArrowDownRight} colorClass="text-rose-600" subtext="Pagado a proveedores y operaciones" />
        <KPICard title="Flujo de caja neto" value={fmtMoney(metrics.cashBalance)} icon={Wallet} colorClass={metrics.cashBalance >= 0 ? 'text-slate-900' : 'text-rose-600'} subtext="Entradas - salidas" />
        <KPICard title="Margen de beneficio" value={`${metrics.profitMargin.toFixed(1)}%`} icon={TrendingUp} colorClass="text-blue-600" subtext="Sobre el valor de ventas" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Valor total de ventas" value={fmtMoney(metrics.totalSalesValue)} icon={FileText} subtext="Valor total reservado" />
        <KPICard title="Cuentas por cobrar" value={fmtMoney(metrics.accountsReceivable)} icon={Users} colorClass="text-amber-600" subtext="Pendiente de clientes" />
        <KPICard title="Cuentas por pagar" value={fmtMoney(metrics.accountsPayable)} icon={Building2} colorClass="text-amber-600" subtext="Pendiente con proveedores" />
        <KPICard title="Beneficio bruto" value={fmtMoney(metrics.grossProfit)} icon={CheckCircle2} colorClass="text-emerald-600" subtext="Ventas - costes directos" />
      </div>

      {/* Pestañas */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-6 -mb-px overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-3 px-1 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* PESTAÑA: RESUMEN */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-6">Ingresos vs. gastos</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(val) => `${val / 1000}k`} />
                  <RechartsTooltip
                    cursor={{ fill: '#f8fafc' }}
                    formatter={(val) => fmtMoney(val)}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="revenue" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
                  <Bar dataKey="expenses" name="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Salud financiera</h3>
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
                <p className="text-xs font-semibold text-amber-800">Acción requerida: cobros pendientes</p>
                <p className="text-lg font-bold text-amber-900 mt-1">{fmtMoney(metrics.accountsReceivable)}</p>
                <p className="text-xs text-amber-700 mt-1">Saldos pendientes de clientes en {metrics.filteredBookings.length} reservas.</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-xs font-semibold text-slate-600">Pagos pendientes</p>
                <p className="text-lg font-bold text-slate-800 mt-1">{fmtMoney(metrics.accountsPayable)}</p>
                <p className="text-xs text-slate-500 mt-1">Gastos y facturas de proveedores sin pagar.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA: INGRESOS Y COBROS */}
      {activeTab === 'revenue' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-slate-900">Cobros a clientes</h3>
              <p className="text-xs text-slate-500">Consulta los saldos pendientes y los pagos recibidos.</p>
            </div>
            <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg">
              <Download className="w-3.5 h-3.5" />Exportar CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-5 py-3">Ref. de reserva</th>
                  <th className="px-5 py-3">Cliente</th>
                  <th className="px-5 py-3 text-right">Valor total</th>
                  <th className="px-5 py-3 text-right">Importe pagado</th>
                  <th className="px-5 py-3 text-right">Saldo pendiente</th>
                  <th className="px-5 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metrics.filteredBookings.map((b) => {
                  const paid = rawData.customerPayments
                    .filter((p) => p.booking_id === b.id)
                    .reduce((sum, p) => sum + (p.transaction_type === 'payment' ? Number(p.amount) : -Number(p.amount)), 0);
                  const balance = Number(b.total_amount) - paid;

                  return (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-mono text-xs font-medium text-amber-600">{b.booking_reference}</td>
                      <td className="px-5 py-3 font-medium text-slate-800">{b.customers?.full_name || 'Desconocido'}</td>
                      <td className="px-5 py-3 text-right">{fmtMoney(b.total_amount, b.currency)}</td>
                      <td className="px-5 py-3 text-right text-emerald-600 font-medium">{fmtMoney(paid, b.currency)}</td>
                      <td className="px-5 py-3 text-right font-bold text-rose-600">{balance > 0 ? fmtMoney(balance, b.currency) : '-'}</td>
                      <td className="px-5 py-3">
                        {balance <= 0 ? (
                          <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 uppercase">Pagado</span>
                        ) : paid > 0 ? (
                          <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 uppercase">Parcial</span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 uppercase">Sin pagar</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-200">
            <div className="p-5">
              <h3 className="text-base font-bold text-slate-900">Transacciones de pago de clientes</h3>
              <p className="text-xs text-slate-500">Pagos completados y reembolsos en el rango de fechas seleccionado.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Fecha</th>
                    <th className="px-5 py-3">Ref. de reserva</th>
                    <th className="px-5 py-3">Cliente</th>
                    <th className="px-5 py-3">Tipo</th>
                    <th className="px-5 py-3">Método</th>
                    <th className="px-5 py-3 text-right">Importe</th>
                    <th className="px-5 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {metrics.filteredCustPayments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-slate-400">No hay transacciones de pago de clientes en este período.</td>
                    </tr>
                  ) : (
                    metrics.filteredCustPayments.map((payment) => {
                      const booking = rawData.bookings.find((item) => item.id === payment.booking_id);
                      const isRefund = payment.transaction_type === 'refund';
                      const isDeleting = deletingPaymentId === payment.id;
                      const method = payment.payment_method || 'unknown';

                      return (
                        <tr key={payment.id} className="hover:bg-slate-50">
                          <td className="px-5 py-3 text-slate-600">{fmtDate(payment.transaction_date || payment.created_at)}</td>
                          <td className="px-5 py-3 font-mono text-xs font-medium text-amber-600">{booking?.booking_reference || '—'}</td>
                          <td className="px-5 py-3 font-medium text-slate-800">{booking?.customers?.full_name || 'Desconocido'}</td>
                          <td className="px-5 py-3">{TYPE_ES[payment.transaction_type || 'payment'] || payment.transaction_type}</td>
                          <td className="px-5 py-3 capitalize text-slate-600">{METHOD_ES[method] || method.replace(/_/g, ' ')}</td>
                          <td className={`px-5 py-3 text-right font-semibold ${isRefund ? 'text-rose-600' : 'text-slate-900'}`}>
                            {isRefund ? '−' : '+'}{fmtMoney(payment.amount, payment.currency || 'MAD')}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => deleteCustomerPayment(payment)}
                              disabled={deletingPaymentId !== null}
                              aria-label={`Eliminar ${isRefund ? 'reembolso' : 'pago'}`}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isDeleting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                              {isDeleting ? 'Eliminando…' : 'Eliminar'}
                            </button>
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
      )}

      {/* PESTAÑA: GASTOS Y PAGOS */}
      {activeTab === 'expenses' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-slate-900">Gastos y pagos a proveedores</h3>
                <p className="text-xs text-slate-500">Controla todas las salidas de caja y las obligaciones pendientes.</p>
              </div>
              <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-lg shadow-sm">
                <DollarSign className="w-3.5 h-3.5" />Registrar gasto
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Fecha</th>
                    <th className="px-5 py-3">Título / Proveedor</th>
                    <th className="px-5 py-3">Categoría</th>
                    <th className="px-5 py-3 text-right">Importe</th>
                    <th className="px-5 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {metrics.filteredExpenses.length === 0 ? (
                    <tr><td colSpan="5" className="px-5 py-8 text-center text-slate-400">No hay gastos en este período.</td></tr>
                  ) : (
                    metrics.filteredExpenses.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3 text-slate-600">{fmtDate(e.expense_date)}</td>
                        <td className="px-5 py-3 font-medium text-slate-800">{e.title || e.supplier_name || 'Gasto general'}</td>
                        <td className="px-5 py-3"><span className="px-2 py-1 bg-slate-100 rounded text-xs text-slate-600">{e.category || 'Sin categoría'}</span></td>
                        <td className="px-5 py-3 text-right font-bold text-slate-900">{fmtMoney(e.amount, e.currency)}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            e.payment_status === 'paid'
                              ? 'bg-emerald-100 text-emerald-700'
                              : e.payment_status === 'partially_paid'
                                ? 'bg-amber-100 text-amber-700'
                                : e.payment_status === 'cancelled'
                                  ? 'bg-slate-100 text-slate-600'
                                  : 'bg-rose-100 text-rose-700'
                          }`}>
                            {PAYMENT_STATUS_ES[e.payment_status || 'unpaid'] || e.payment_status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA: RENTABILIDAD */}
      {activeTab === 'profitability' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
          <h3 className="text-base font-bold text-slate-900 mb-2">Análisis de rentabilidad de reservas</h3>
          <p className="text-sm text-slate-500 mb-6">Compara el valor real de ventas con los costes directos registrados.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs font-semibold text-slate-500">Ventas totales</p>
              <p className="text-xl font-bold text-slate-900 mt-1">{fmtMoney(metrics.totalSalesValue)}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs font-semibold text-slate-500">Costes directos registrados</p>
              <p className="text-xl font-bold text-rose-600 mt-1">{fmtMoney(metrics.accountsPayable + metrics.totalCashOut)}</p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <p className="text-xs font-semibold text-emerald-700">Beneficio bruto</p>
              <p className="text-xl font-bold text-emerald-700 mt-1">{fmtMoney(metrics.grossProfit)}</p>
            </div>
          </div>

          <div className="text-center p-8 border border-dashed border-slate-300 rounded-xl bg-slate-50">
            <FileText className="w-8 h-8 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600 text-sm">El análisis detallado por reserva requiere vincular `offer_costs` directamente a reservas concretas.</p>
            <p className="text-slate-400 text-xs mt-1">Ve a la página de Reservas para consultar los márgenes de cada reserva.</p>
          </div>
        </div>
      )}
    </div>
  );
}