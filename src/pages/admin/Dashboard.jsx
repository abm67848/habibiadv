import { useAppSettings, translate } from '@/context/index.jsx';
// src/pages/admin/AdminDashboardPage.jsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle, AlertTriangle, ArrowRight, BarChart3, Calendar, CheckCircle2,
  ChevronRight, Clock, Compass, CreditCard, DollarSign, Filter, Layers,
  RefreshCw, ShieldCheck, TrendingDown, TrendingUp, Users, Wallet, XCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

/* ================================================================== */
/*  Constants                                                          */
/* ================================================================== */
const RANGE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'last_7_days', label: 'Last 7 days' },
  { value: 'last_30_days', label: 'Last 30 days' },
  { value: 'this_month', label: 'This month' },
  { value: 'this_year', label: 'This year' },
];

const STATUS_META = {
  pending:     { label: 'Pending',     dot: 'bg-amber-500',   chip: 'bg-amber-50 text-amber-800 ring-amber-200',   icon: AlertCircle },
  confirmed:   { label: 'Confirmed',   dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-800 ring-emerald-200', icon: CheckCircle2 },
  in_progress: { label: 'In progress', dot: 'bg-sky-500',     chip: 'bg-sky-50 text-sky-800 ring-sky-200',         icon: Clock },
  completed:   { label: 'Completed',   dot: 'bg-violet-500',  chip: 'bg-violet-50 text-violet-800 ring-violet-200', icon: CheckCircle2 },
  cancelled:   { label: 'Cancelled',   dot: 'bg-rose-500',    chip: 'bg-rose-50 text-rose-800 ring-rose-200',      icon: XCircle },
};

const PAYMENT_META = {
  paid:           { label: 'Paid',           color: '#10b981' },
  partially_paid: { label: 'Partially paid', color: '#f59e0b' },
  overpaid:       { label: 'Overpaid',       color: '#8b5cf6' },
  unpaid:         { label: 'Unpaid',         color: '#f43f5e' },
};

/* ================================================================== */
/*  Utilities                                                          */
/* ================================================================== */
const fmtMoney = (n, currency = 'MAD') => {
  const v = Number(n || 0);
  if (!Number.isFinite(v)) return '—';
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(v);
  } catch {
    return `${currency} ${v.toLocaleString()}`;
  }
};

const fmtDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
};

const toDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

function rangeFor(preset) {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = toDay(now);

  switch (preset) {
    case 'today':       break;
    case 'last_7_days': start.setDate(start.getDate() - 6); break;
    case 'last_30_days':start.setDate(start.getDate() - 29); break;
    case 'this_month':  start.setDate(1); break;
    case 'this_year':   start.setMonth(0, 1); break;
    default:            start.setDate(start.getDate() - 29);
  }

  const spanMs = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(start.getTime() - spanMs - 1);

  return { start, end, prevStart, prevEnd };
}

function within(dateStr, from, to) {
  if (!dateStr) return false;
  const d = new Date(dateStr).getTime();
  if (Number.isNaN(d)) return false;
  return d >= from.getTime() && d <= to.getTime();
}

function sum(arr, pick) {
  return arr.reduce((s, x) => s + Number(pick(x) || 0), 0);
}

/* ================================================================== */
/*  Small primitives                                                   */
/* ================================================================== */
function KpiCard({ label, value, sub, icon: Icon, tone = 'slate', trend, onClick }) {
  const tones = {
    slate:   'bg-slate-50 text-slate-700 ring-slate-200',
    amber:   'bg-amber-50 text-amber-700 ring-amber-200',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    sky:     'bg-sky-50 text-sky-700 ring-sky-200',
    violet:  'bg-violet-50 text-violet-700 ring-violet-200',
    rose:    'bg-rose-50 text-rose-700 ring-rose-200',
  };
  const trendUp = trend != null && trend >= 0;
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      {...(onClick ? { type: 'button', onClick } : {})}
      className={`w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm ${
        onClick ? 'transition hover:border-slate-300 hover:shadow-md' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1.5 truncate text-2xl font-bold text-slate-900">{value}</p>
          {sub && <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>}
        </div>
        {Icon && (
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ring-1 ring-inset ${tones[tone]}`}>
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      {trend != null && (
        <p className={`mt-2 inline-flex items-center gap-1 text-[11px] font-semibold ${trendUp ? 'text-emerald-600' : 'text-rose-600'}`}>
          {trendUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {Math.abs(trend).toFixed(1)}% vs prev
        </p>
      )}
    </Wrapper>
  );
}

function SectionCard({ title, icon: Icon, subtitle, action, children, className = '' }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
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

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.pending;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${meta.chip}`}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

function PaidBar({ paid, total }) {
  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  return (
    <div className="w-full">
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-0.5 text-[10px] text-slate-400">{pct}% collected</p>
    </div>
  );
}

/* ================================================================== */
/*  Smooth line chart (Catmull-Rom → Bézier)                           */
/* ================================================================== */
function smoothPath(points) {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

  // Catmull-Rom to Bézier
  const d = [`M ${points[0].x} ${points[0].y}`];
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`);
  }
  return d.join(' ');
}

function RevenueTrend({ series, previous, currency, height = 240 }) {
  const width = 800;
  const pad = { top: 16, right: 16, bottom: 32, left: 56 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  if (!series.length) {
    return (
      <div className="grid h-60 place-items-center rounded-lg border border-dashed border-slate-200 text-xs text-slate-400">{translate('No activity in this period.')}</div>
    );
  }

  const maxVal = Math.max(
    1,
    ...series.map((d) => d.revenue),
    ...(previous || []).map((d) => d.revenue),
  );

  const stepX = series.length > 1 ? innerW / (series.length - 1) : 0;
  const xFor = (i) => pad.left + i * stepX;
  const yFor = (v) => pad.top + innerH - (v / maxVal) * innerH;

  const currentPoints = series.map((d, i) => ({ x: xFor(i), y: yFor(d.revenue) }));
  const previousPoints = (previous || []).map((d, i) => ({ x: xFor(i), y: yFor(d.revenue) }));

  const currentPath = smoothPath(currentPoints);
  const prevPath = smoothPath(previousPoints);
  const areaPath = currentPoints.length
    ? `${currentPath} L ${xFor(currentPoints.length - 1)} ${pad.top + innerH} L ${xFor(0)} ${pad.top + innerH} Z`
    : '';

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((p) => Math.round(maxVal * p));
  const labelEvery = Math.max(1, Math.ceil(series.length / 8));
  const [hover, setHover] = React.useState(null);

  const handleMove = (e) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const xPixels = ((e.clientX - rect.left) / rect.width) * width;
    const relative = xPixels - pad.left;
    if (relative < 0 || relative > innerW) { setHover(null); return; }
    const idx = series.length > 1 ? Math.round(relative / stepX) : 0;
    const clamped = Math.max(0, Math.min(series.length - 1, idx));
    setHover(clamped);
  };

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        role="img"
        aria-label="Revenue trend"
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="rev-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.30" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={width - pad.right} y1={yFor(t)} y2={yFor(t)} stroke="#e2e8f0" strokeDasharray="3 3" />
            <text x={pad.left - 8} y={yFor(t) + 3} textAnchor="end" fontSize="10" fill="#94a3b8">
              {t >= 1000 ? `${Math.round(t / 1000)}k` : t}
            </text>
          </g>
        ))}

        {areaPath && <path d={areaPath} fill="url(#rev-area)" />}

        {prevPath && (
          <path
            d={prevPath}
            stroke="#cbd5e1"
            strokeWidth="1.75"
            fill="none"
            strokeDasharray="5 4"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        <path
          d={currentPath}
          stroke="#d97706"
          strokeWidth="2.25"
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {series.map((d, i) =>
          i % labelEvery === 0 || i === series.length - 1 ? (
            <text key={i} x={xFor(i)} y={height - 10} textAnchor="middle" fontSize="10" fill="#94a3b8">
              {d.label}
            </text>
          ) : null,
        )}

        {hover != null && series[hover] && (
          <g>
            <line
              x1={xFor(hover)}
              x2={xFor(hover)}
              y1={pad.top}
              y2={pad.top + innerH}
              stroke="#94a3b8"
              strokeDasharray="3 3"
            />
            <circle cx={xFor(hover)} cy={yFor(series[hover].revenue)} r="4.5" fill="#d97706" stroke="#fff" strokeWidth="2" />
          </g>
        )}
      </svg>

      {hover != null && series[hover] && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] shadow-md"
          style={{
            left: `${(xFor(hover) / width) * 100}%`,
            top: `${(yFor(series[hover].revenue) / height) * 100}%`,
          }}
        >
          <p className="font-semibold text-slate-900">{series[hover].label}</p>
          <p className="text-amber-700">{fmtMoney(series[hover].revenue, currency)}</p>
          {previous?.[hover] && (
            <p className="text-slate-400">Prev: {fmtMoney(previous[hover].revenue, currency)}</p>
          )}
        </div>
      )}

      <div className="mt-2 flex items-center gap-4 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full bg-amber-600" />{translate('Current period')}</span>
        {previous && previous.length > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full bg-slate-300" style={{ backgroundImage: 'linear-gradient(90deg, #cbd5e1 50%, transparent 50%)', backgroundSize: '4px 100%' }} />{translate('Previous period')}</span>
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Main page                                                          */
/* ================================================================== */
export default function AdminDashboardPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('last_30_days');
  const [currentUser, setCurrentUser] = useState(null);

  const [bookings, setBookings] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [offers, setOffers] = useState([]);
  const [departures, setDepartures] = useState([]);
  const [payments, setPayments] = useState([]);
  const [financials, setFinancials] = useState([]);

  /* ---------- Load ---------- */
  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
        setCurrentUser(profile || { full_name: user.email?.split('@')[0] || 'Agency user' });
      }

      const [bookingsRes, customersRes, offersRes, departuresRes, paymentsRes, financialsRes] = await Promise.all([
        supabase
          .from('bookings')
          .select('*, customers(full_name, phone, email)')
          .order('created_at', { ascending: false }),
        supabase.from('customers').select('id, full_name, created_at').order('created_at', { ascending: false }),
        supabase.from('offers').select('id, reference, public_title, internal_title, package_category, destination_country, default_currency, status, is_public, starting_price'),
        supabase.from('offer_departures').select('id, offer_id, departure_date, max_capacity, reserved_capacity, status'),
        supabase.from('booking_payments').select('id, booking_id, transaction_type, transaction_status, amount, currency, transaction_date, created_at'),
        supabase.rpc('get_page_booking_financials'),
      ]);

      if (bookingsRes.error) throw bookingsRes.error;
      if (customersRes.error) throw customersRes.error;
      if (offersRes.error) throw offersRes.error;
      if (departuresRes.error) throw departuresRes.error;
      if (paymentsRes.error) throw paymentsRes.error;
      if (financialsRes.error) throw financialsRes.error;

      setBookings(bookingsRes.data || []);
      setCustomers(customersRes.data || []);
      setOffers(offersRes.data || []);
      setDepartures(departuresRes.data || []);
      setPayments(paymentsRes.data || []);
      setFinancials(financialsRes.data || []);
    } catch (err) {
      console.error('Dashboard load failed:', err);
      setError(err?.message || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ---------- Derived collections ---------- */
  const offersById = useMemo(() => {
    const m = new Map();
    offers.forEach((o) => m.set(o.id, o));
    return m;
  }, [offers]);

  const financialsByBooking = useMemo(() => {
    const m = new Map();
    financials.forEach((f) => m.set(f.booking_id, f));
    return m;
  }, [financials]);

  const paymentsByBooking = useMemo(() => {
    const m = new Map();
    for (const p of payments) {
      if (p.transaction_status !== 'completed') continue;
      const list = m.get(p.booking_id) || [];
      list.push(p);
      m.set(p.booking_id, list);
    }
    return m;
  }, [payments]);

  const departuresById = useMemo(() => {
    const m = new Map();
    departures.forEach((d) => m.set(d.id, d));
    return m;
  }, [departures]);

  const enrichedBookings = useMemo(() => {
    return bookings.map((b) => {
      const fin = financialsByBooking.get(b.id) || {};
      const bookingPayments = paymentsByBooking.get(b.id) || [];
      const paidFromPayments = bookingPayments.reduce(
        (s, p) => s + (p.transaction_type === 'refund' ? -Number(p.amount || 0) : Number(p.amount || 0)),
        0,
      );
      const total = Number(b.total_amount || 0);
      const netPaid = fin.net_paid != null ? Number(fin.net_paid) : paidFromPayments;
      const outstanding = fin.outstanding_balance != null
        ? Number(fin.outstanding_balance)
        : Math.max(0, total - netPaid);
      const offer = offersById.get(b.offer_id) || null;
      const departure = b.offer_departure_id ? departuresById.get(b.offer_departure_id) : null;
      return { ...b, offer, departure, netPaid, outstanding, total };
    });
  }, [bookings, financialsByBooking, paymentsByBooking, offersById, departuresById]);

  const { start, end, prevStart, prevEnd } = useMemo(() => rangeFor(dateRange), [dateRange]);

  const periodBookings = useMemo(
    () => enrichedBookings.filter((b) => within(b.created_at, start, end)),
    [enrichedBookings, start, end],
  );

  const prevBookings = useMemo(
    () => enrichedBookings.filter((b) => within(b.created_at, prevStart, prevEnd)),
    [enrichedBookings, prevStart, prevEnd],
  );

  const newCustomers = useMemo(
    () => customers.filter((c) => within(c.created_at, start, end)),
    [customers, start, end],
  );

  const activeOffers = useMemo(
    () => offers.filter((o) => o.status === 'active' && o.is_public).length,
    [offers],
  );

  /* ---------- KPIs ---------- */
  const kpis = useMemo(() => {
    const totalReservations = periodBookings.length;
    const prevReservations = prevBookings.length;
    const reservationChange = prevReservations ? ((totalReservations - prevReservations) / prevReservations) * 100 : null;

    const confirmed = periodBookings.filter((b) => b.booking_status === 'confirmed').length;
    const pending = periodBookings.filter((b) => b.booking_status === 'pending').length;

    const revenue = sum(periodBookings, (b) => b.netPaid);
    const prevRevenue = sum(prevBookings, (b) => b.netPaid);
    const revenueChange = prevRevenue ? ((revenue - prevRevenue) / prevRevenue) * 100 : null;

    const aov = totalReservations ? revenue / totalReservations : 0;
    const outstanding = sum(periodBookings, (b) => b.outstanding);
    const insured = periodBookings.filter((b) => b.extra_insurance).length;
    const insuranceAttach = totalReservations ? (insured / totalReservations) * 100 : 0;

    return {
      totalReservations, reservationChange,
      confirmed, pending,
      revenue, revenueChange,
      aov, outstanding,
      insured, insuranceAttach,
    };
  }, [periodBookings, prevBookings]);

  /* ---------- Revenue series (current + previous aligned by index) ---------- */
  const revenueSeries = useMemo(() => {
    const buckets = new Map();
    const cursor = toDay(start);
    const endDay = toDay(end);
    while (cursor <= endDay) {
      buckets.set(cursor.toISOString().slice(0, 10), {
        label: cursor.toLocaleDateString(undefined, { day: '2-digit', month: 'short' }),
        revenue: 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    periodBookings.forEach((b) => {
      const day = toDay(b.created_at).toISOString().slice(0, 10);
      const bucket = buckets.get(day);
      if (bucket) bucket.revenue += Number(b.netPaid || 0);
    });
    return Array.from(buckets.values());
  }, [periodBookings, start, end]);

  const previousSeries = useMemo(() => {
    const buckets = new Map();
    const cursor = toDay(prevStart);
    const endDay = toDay(prevEnd);
    while (cursor <= endDay) {
      buckets.set(cursor.toISOString().slice(0, 10), {
        label: cursor.toLocaleDateString(undefined, { day: '2-digit', month: 'short' }),
        revenue: 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    prevBookings.forEach((b) => {
      const day = toDay(b.created_at).toISOString().slice(0, 10);
      const bucket = buckets.get(day);
      if (bucket) bucket.revenue += Number(b.netPaid || 0);
    });
    const arr = Array.from(buckets.values());
    // Align length with current series so the chart maps index-to-index
    return arr.slice(-revenueSeries.length);
  }, [prevBookings, prevStart, prevEnd, revenueSeries.length]);

  /* ---------- Status distribution ---------- */
  const statusDistribution = useMemo(() => {
    const counts = { pending: 0, confirmed: 0, in_progress: 0, completed: 0, cancelled: 0 };
    periodBookings.forEach((b) => {
      const key = b.booking_status || 'pending';
      counts[key] = (counts[key] || 0) + 1;
    });
    const total = periodBookings.length;
    return Object.entries(counts)
      .filter(([, count]) => count > 0)
      .map(([status, count]) => ({
        status,
        count,
        percentage: total ? Math.round((count / total) * 100) : 0,
        meta: STATUS_META[status] || STATUS_META.pending,
      }));
  }, [periodBookings]);

  /* ---------- Payment mix ---------- */
  const paymentMix = useMemo(() => {
    const acc = { paid: 0, partially_paid: 0, overpaid: 0, unpaid: 0 };
    periodBookings.forEach((b) => {
      const total = Number(b.total || 0);
      const paid = Number(b.netPaid || 0);
      let bucket = 'unpaid';
      if (total === 0 && paid === 0) bucket = 'unpaid';
      else if (paid >= total && total > 0) bucket = 'paid';
      else if (paid > 0) bucket = 'partially_paid';
      acc[bucket] = (acc[bucket] || 0) + 1;
    });
    const total = periodBookings.length;
    return Object.entries(acc)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({
        key: k,
        label: PAYMENT_META[k].label,
        color: PAYMENT_META[k].color,
        value: v,
        percentage: total ? Math.round((v / total) * 100) : 0,
      }));
  }, [periodBookings]);

  /* ---------- Insurance mix ---------- */
  const insuranceMix = useMemo(() => {
    let individual = 0, collective = 0, none = 0;
    periodBookings.forEach((b) => {
      if (!b.extra_insurance) none += 1;
      else if (b.insurance_type === 'collective') collective += 1;
      else individual += 1;
    });
    const total = periodBookings.length || 1;
    return [
      { key: 'individual', label: 'Individual',   value: individual, pct: Math.round((individual / total) * 100), color: '#10b981' },
      { key: 'collective', label: 'Collective',   value: collective, pct: Math.round((collective / total) * 100), color: '#0ea5e9' },
      { key: 'none',       label: 'No insurance', value: none,       pct: Math.round((none / total) * 100),       color: '#cbd5e1' },
    ];
  }, [periodBookings]);

  /* ---------- Recent bookings ---------- */
  const recentBookings = useMemo(
    () => [...enrichedBookings].slice(0, 8),
    [enrichedBookings],
  );

  /* ---------- Upcoming departures ---------- */
  const upcomingDepartures = useMemo(() => {
    const now = new Date();
    const in30 = new Date();
    in30.setDate(now.getDate() + 30);
    return enrichedBookings
      .filter((b) => {
        if (!b.departure_date) return false;
        if (b.booking_status === 'cancelled') return false;
        const d = new Date(b.departure_date);
        return d >= now && d <= in30;
      })
      .sort((a, b) => new Date(a.departure_date) - new Date(b.departure_date))
      .slice(0, 6);
  }, [enrichedBookings]);

  /* ---------- Top packages ---------- */
  const topPackages = useMemo(() => {
    const acc = new Map();
    periodBookings.forEach((b) => {
      if (!b.offer_id) return;
      const entry = acc.get(b.offer_id) || {
        id: b.offer_id,
        title: b.offer?.public_title || b.offer?.internal_title || 'Untitled package',
        reference: b.offer?.reference || '—',
        category: b.offer?.package_category || '—',
        bookings: 0,
        revenue: 0,
      };
      entry.bookings += 1;
      entry.revenue += Number(b.netPaid || 0);
      acc.set(b.offer_id, entry);
    });
    return Array.from(acc.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [periodBookings]);

  /* ---------- Render guards ---------- */
  if (loading) {
    return (
      <div className="min-h-[60vh] bg-slate-50/50">
        <div className="mx-auto max-w-[1600px] space-y-6 p-6 sm:p-8">
          <div className="h-24 animate-pulse rounded-2xl bg-white" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-white" />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="h-72 animate-pulse rounded-xl bg-white lg:col-span-2" />
            <div className="h-72 animate-pulse rounded-xl bg-white" />
          </div>
          <p className="text-center text-xs text-slate-400">{translate('Loading dashboard…')}</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50/70 pb-10">
      <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Header — no "New package" button */}
        <header className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-amber-500/10 text-amber-600 ring-1 ring-inset ring-amber-200">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">
                  Welcome back{currentUser?.full_name ? `, ${currentUser.full_name.split(' ')[0]}` : ''}
                </h1>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                  {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: '2-digit' })}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">{translate('Snapshot of your agency\'s activity. Switch ranges, drill into any panel.')}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs">
              <Filter className="h-3.5 w-3.5 text-amber-600" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none"
                aria-label="Date range"
              >
                {RANGE_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => navigate('/admin/analytics')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <BarChart3 className="h-3.5 w-3.5 text-amber-600" />{translate('Analytics')}</button>
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />{translate('Sync')}</button>
          </div>
        </header>

        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* KPI row */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Reservations"
            value={kpis.totalReservations}
            sub={`${kpis.confirmed} confirmed · ${kpis.pending} pending`}
            icon={Calendar}
            tone="slate"
            trend={kpis.reservationChange}
            onClick={() => navigate('/admin/reservations')}
          />
          <KpiCard
            label="Net revenue"
            value={fmtMoney(kpis.revenue)}
            sub={`AOV ${fmtMoney(kpis.aov)}`}
            icon={Wallet}
            tone="emerald"
            trend={kpis.revenueChange}
            onClick={() => navigate('/admin/payments-transactions')}
          />
          <KpiCard
            label="Outstanding"
            value={fmtMoney(kpis.outstanding)}
            sub="Balance due across this period"
            icon={DollarSign}
            tone="amber"
            onClick={() => navigate('/admin/payments-transactions')}
          />
          <KpiCard
            label="Insurance attach"
            value={`${kpis.insuranceAttach.toFixed(1)}%`}
            sub={`${kpis.insured} of ${kpis.totalReservations} bookings`}
            icon={ShieldCheck}
            tone="sky"
            onClick={() => navigate('/admin/reservations')}
          />
        </section>

        {/* Charts row — smooth line chart with previous-period overlay */}
        <div className="grid gap-4 lg:grid-cols-3">
          <SectionCard
            title="Revenue trend"
            icon={TrendingUp}
            subtitle="Daily net collected vs previous period"
            className="lg:col-span-2"
            action={
              <span className="text-[11px] font-medium text-slate-500">
                {start.toLocaleDateString()} – {end.toLocaleDateString()}
              </span>
            }
          >
            <RevenueTrend
              series={revenueSeries}
              previous={previousSeries}
              currency="MAD"
            />
          </SectionCard>

          <SectionCard title="Status distribution" icon={Layers} subtitle="Bookings in this period">
            {statusDistribution.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">{translate('No bookings in this period.')}</p>
            ) : (
              <ul className="space-y-3">
                {statusDistribution.map(({ status, count, percentage, meta }) => (
                  <li key={status}>
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/reservations?status=${status}`)}
                      className="w-full text-left"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="flex items-center gap-2 font-medium text-slate-700">
                          <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                          {meta.label}
                        </span>
                        <span className="font-semibold text-slate-900">
                          {count}
                          <span className="ml-1 text-[10px] text-slate-400">({percentage}%)</span>
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full rounded-full ${meta.dot}`} style={{ width: `${percentage}%` }} />
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>

        {/* Second row: payment mix + insurance mix + customers / offers snapshot */}
        <div className="grid gap-4 lg:grid-cols-3">
          <SectionCard title="Payment mix" icon={CreditCard} subtitle="Bookings by payment state in this period">
            {paymentMix.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-400">{translate('No bookings in this period.')}</p>
            ) : (
              <ul className="space-y-2.5">
                {paymentMix.map((row) => (
                  <li key={row.key}>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex items-center gap-2 font-medium text-slate-700">
                        <span className="h-2 w-2 rounded-full" style={{ background: row.color }} />
                        {row.label}
                      </span>
                      <span className="font-semibold text-slate-900">
                        {row.value}
                        <span className="ml-1 text-[10px] text-slate-400">({row.percentage}%)</span>
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full" style={{ width: `${row.percentage}%`, background: row.color }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Insurance mix" icon={ShieldCheck} subtitle="Of bookings created in this period">
            <ul className="space-y-2.5">
              {insuranceMix.map((row) => (
                <li key={row.key}>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex items-center gap-2 font-medium text-slate-700">
                      <span className="h-2 w-2 rounded-full" style={{ background: row.color }} />
                      {row.label}
                    </span>
                    <span className="font-semibold text-slate-900">
                      {row.value}
                      <span className="ml-1 text-[10px] text-slate-400">({row.pct}%)</span>
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full" style={{ width: `${row.pct}%`, background: row.color }} />
                  </div>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard
            title="Customers & catalog"
            icon={Users}
            action={
              <button
                type="button"
                onClick={() => navigate('/admin/customers')}
                className="text-[11px] font-semibold text-amber-700 hover:underline"
              >{translate('Open customers')}</button>
            }
          >
            <dl className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-slate-200 p-3">
                <dt className="text-slate-500">{translate('Total customers')}</dt>
                <dd className="mt-0.5 text-lg font-bold text-slate-900">{customers.length}</dd>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <dt className="text-emerald-700">{translate('New this period')}</dt>
                <dd className="mt-0.5 text-lg font-bold text-emerald-700">+{newCustomers.length}</dd>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <dt className="text-slate-500">{translate('Active offers')}</dt>
                <dd className="mt-0.5 text-lg font-bold text-slate-900">{activeOffers}</dd>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <dt className="text-slate-500">{translate('Total offers')}</dt>
                <dd className="mt-0.5 text-lg font-bold text-slate-900">{offers.length}</dd>
              </div>
            </dl>
          </SectionCard>
        </div>

        {/* Recent bookings + upcoming departures */}
        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard
            title="Recent bookings"
            icon={Calendar}
            action={
              <button
                type="button"
                onClick={() => navigate('/admin/reservations')}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 hover:underline"
              >
                View all <ChevronRight className="h-3 w-3" />
              </button>
            }
          >
            {recentBookings.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">{translate('No bookings yet.')}</p>
            ) : (
              <ul className="space-y-2">
                {recentBookings.map((b) => (
                  <li key={b.id}>
                    <button
                      type="button"
                      onClick={() => navigate('/admin/reservations')}
                      className="w-full rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-slate-300"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-slate-900">
                            {b.customers?.full_name || 'Guest'}
                          </p>
                          <p className="truncate font-mono text-[10px] text-amber-700">{b.booking_reference}</p>
                          <p className="mt-0.5 truncate text-[11px] text-slate-500">
                            {b.destination || '—'} · {b.traveler_count || 1} traveler{(b.traveler_count || 1) === 1 ? '' : 's'}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <StatusBadge status={b.booking_status} />
                          <span className="text-[11px] font-semibold text-slate-900">
                            {fmtMoney(b.total_amount, b.currency)}
                          </span>
                        </div>
                      </div>
                      <PaidBar paid={b.netPaid} total={b.total} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard
            title="Upcoming departures"
            icon={Compass}
            subtitle="Next 30 days"
            action={
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">
                {upcomingDepartures.length} trips
              </span>
            }
          >
            {upcomingDepartures.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">{translate('No upcoming departures scheduled.')}</p>
            ) : (
              <ul className="space-y-2">
                {upcomingDepartures.map((b) => {
                  const seatsAvailable =
                    b.departure && b.departure.max_capacity != null
                      ? Math.max(0, Number(b.departure.max_capacity) - Number(b.departure.reserved_capacity || 0))
                      : null;
                  return (
                    <li key={b.id} className="rounded-lg border border-slate-200 bg-white p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-slate-900">
                            {b.customers?.full_name || 'Guest'}
                          </p>
                          <p className="truncate text-[11px] text-slate-500">{b.destination || '—'}</p>
                          <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-amber-800">
                            <Calendar className="h-3 w-3" /> {fmtDate(b.departure_date)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] font-semibold text-slate-900">
                            {b.traveler_count || 1} traveler{(b.traveler_count || 1) === 1 ? '' : 's'}
                          </p>
                          {seatsAvailable != null && (
                            <p className={`text-[10px] ${seatsAvailable <= 3 ? 'font-semibold text-rose-600' : 'text-slate-500'}`}>
                              {seatsAvailable} seats left
                            </p>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>
        </div>

        {/* Top packages */}
        <SectionCard
          title="Top packages by revenue"
          icon={Compass}
          subtitle="In the selected period"
          action={
            <button
              type="button"
              onClick={() => navigate('/admin/packages-services')}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 hover:underline"
            >
              All packages <ChevronRight className="h-3 w-3" />
            </button>
          }
        >
          {topPackages.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-400">{translate('No packages sold in this period.')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-xs">
                <thead className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  <tr className="border-b border-slate-200">
                    <th className="py-2 pr-3">{translate('Package')}</th>
                    <th className="py-2 pr-3">{translate('Category')}</th>
                    <th className="py-2 pr-3 text-right">{translate('Bookings')}</th>
                    <th className="py-2 pr-3 text-right">{translate('Revenue')}</th>
                    <th className="py-2 pl-3 text-right" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topPackages.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/60">
                      <td className="py-2.5 pr-3">
                        <p className="font-semibold text-slate-900">{p.title}</p>
                        <p className="font-mono text-[10px] text-amber-700">{p.reference}</p>
                      </td>
                      <td className="py-2.5 pr-3 text-slate-600">{p.category}</td>
                      <td className="py-2.5 pr-3 text-right font-medium text-slate-700">{p.bookings}</td>
                      <td className="py-2.5 pr-3 text-right font-semibold text-slate-900">{fmtMoney(p.revenue)}</td>
                      <td className="py-2.5 pl-3 text-right">
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/packages-services/${p.id}`)}
                          className="inline-flex items-center gap-1 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          aria-label={`Open ${p.title}`}
                        >
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>
    </main>
  );
}