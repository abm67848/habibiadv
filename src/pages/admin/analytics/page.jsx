import { useAppSettings, translate } from '@/context/index.jsx';
// src/pages/admin/AnalyticsPage.jsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3, RefreshCw, Download, Wallet, CalendarDays, TrendingUp, TrendingDown, Minus,
  AlertTriangle, ShieldCheck, Clock, Users, XCircle, Lightbulb, X, Target,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

/* ---------- Config ---------- */
// Approximate conversion to MAD. Replace with live rates or an app setting when available.
const RATES_TO_MAD = { MAD: 1, EUR: 10.8, USD: 10 };
const toMAD = (n, c) => Number(n || 0) * (RATES_TO_MAD[c] ?? 1);
const DAY = 86400000;

const PRESETS = [
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '365', label: 'Last 12 months' },
  { value: 'ytd', label: 'Year to date' },
  { value: 'all', label: 'All time' },
];

const STATUS_META = {
  pending: { label: 'Pending', color: '#f59e0b' },
  confirmed: { label: 'Confirmed', color: '#10b981' },
  in_progress: { label: 'In progress', color: '#0ea5e9' },
  completed: { label: 'Completed', color: '#8b5cf6' },
  cancelled: { label: 'Cancelled', color: '#f43f5e' },
};
const METHOD_COLORS = ['#d97706', '#0ea5e9', '#10b981', '#8b5cf6', '#94a3b8'];

/* ---------- Helpers ---------- */
const fmt = (n, d = 0) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: d });
const fmtCompact = (n) => Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(Number(n || 0));
const pct = (a, b) => (b > 0 ? (a / b) * 100 : 0);
const delta = (cur, prev) => (prev === 0 ? (cur === 0 ? 0 : null) : ((cur - prev) / Math.abs(prev)) * 100);
const label = (s = '') => s.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
const dateOf = (r) => new Date(r.transaction_date || r.created_at).getTime();
const monthKey = (t) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };

function resolveRange(preset, firstTs) {
  const end = Date.now();
  let start;
  if (preset === 'all') start = firstTs || end - 365 * DAY;
  else if (preset === 'ytd') start = new Date(new Date().getFullYear(), 0, 1).getTime();
  else start = end - Number(preset) * DAY;
  const len = Math.max(DAY, end - start);
  return { start, end, prevStart: start - len, prevEnd: start };
}

function buildBuckets(start, end) {
  const spanDays = (end - start) / DAY;
  const monthly = spanDays > 70;
  const buckets = [];
  if (monthly) {
    const d = new Date(start); d.setDate(1); d.setHours(0, 0, 0, 0);
    while (d.getTime() <= end) {
      const from = d.getTime(); d.setMonth(d.getMonth() + 1);
      buckets.push({ from, to: d.getTime(), label: new Date(from).toLocaleDateString(undefined, { month: 'short', year: '2-digit' }) });
    }
  } else {
    for (let t = start; t < end; t += DAY) buckets.push({ from: t, to: t + DAY, label: new Date(t).toLocaleDateString(undefined, { day: '2-digit', month: 'short' }) });
  }
  return buckets;
}

/* ---------- SVG charts (dependency-free) ---------- */
function TrendChart({ labels, series, prev, height = 240 }) {
  const [hover, setHover] = useState(null);
  const W = 760, H = height, pad = { l: 48, r: 12, t: 12, b: 28 };
  const n = series.length;
  if (!n) return null;
  const max = Math.max(1, ...series, ...(prev || [0])) * 1.1;
  const min = Math.min(0, ...series);
  const x = (i) => pad.l + (n === 1 ? 0 : (i / (n - 1)) * (W - pad.l - pad.r));
  const y = (v) => pad.t + (1 - (v - min) / (max - min)) * (H - pad.t - pad.b);
  const line = (arr) => arr.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${line(series)} L${x(n - 1)},${y(min)} L${x(0)},${y(min)} Z`;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => min + (max - min) * t);
  const step = Math.ceil(n / 8);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Revenue trend chart" onMouseLeave={() => setHover(null)}>
      <defs>
        <linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#d97706" stopOpacity=".22" /><stop offset="100%" stopColor="#d97706" stopOpacity="0" />
        </linearGradient>
      </defs>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeDasharray="3 4" />
          <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize="10" fill="#94a3b8">{fmtCompact(t)}</text>
        </g>
      ))}
      {labels.map((l, i) => i % step === 0 && <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="#94a3b8">{l}</text>)}
      {prev && <path d={line(prev)} fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="5 4" />}
      <path d={area} fill="url(#trendFill)" />
      <path d={line(series)} fill="none" stroke="#d97706" strokeWidth="2.25" strokeLinejoin="round" />
      {hover != null && (
        <g>
          <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke="#d97706" strokeOpacity=".35" />
          <circle cx={x(hover)} cy={y(series[hover])} r="4" fill="#fff" stroke="#d97706" strokeWidth="2" />
          <g transform={`translate(${Math.min(Math.max(x(hover) - 70, pad.l), W - 150)},${pad.t})`}>
            <rect width="140" height={prev ? 52 : 36} rx="8" fill="#0f172a" />
            <text x="10" y="16" fontSize="10" fill="#cbd5e1">{labels[hover]}</text>
            <text x="10" y="31" fontSize="12" fontWeight="600" fill="#fff">{fmt(series[hover])} MAD</text>
            {prev && <text x="10" y="45" fontSize="10" fill="#94a3b8">Prev: {fmt(prev[hover])}</text>}
          </g>
        </g>
      )}
      {series.map((_, i) => (
        <rect key={i} x={x(i) - (W - pad.l - pad.r) / n / 2} y={pad.t} width={(W - pad.l - pad.r) / n} height={H - pad.t - pad.b}
          fill="transparent" onMouseEnter={() => setHover(i)} />
      ))}
    </svg>
  );
}

function Donut({ data, size = 150 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = 52, c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <svg viewBox="0 0 140 140" width={size} height={size} role="img" aria-label="Distribution chart">
      <circle cx="70" cy="70" r={r} fill="none" stroke="#f1f5f9" strokeWidth="16" />
      {total > 0 && data.map((d) => {
        const len = (d.value / total) * c;
        const el = <circle key={d.label} cx="70" cy="70" r={r} fill="none" stroke={d.color} strokeWidth="16"
          strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-acc} transform="rotate(-90 70 70)" />;
        acc += len;
        return el;
      })}
      <text x="70" y="68" textAnchor="middle" fontSize="20" fontWeight="600" fill="#0f172a">{fmt(total)}</text>
      <text x="70" y="84" textAnchor="middle" fontSize="10" fill="#94a3b8">{translate('total')}</text>
    </svg>
  );
}

function HBars({ rows, unit = 'MAD', color = '#d97706' }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <Empty text="No data in this period." />;
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium text-slate-800">{r.label}</span>
            <span className="shrink-0 tabular-nums text-slate-500">{fmt(r.value)} {unit}{r.note ? <span className="ml-2 text-xs text-slate-400">{r.note}</span> : null}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(r.value / max) * 100}%`, background: r.color || color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Columns({ rows, height = 150 }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {rows.map((r) => (
        <div key={r.label} className="flex flex-1 flex-col items-center justify-end gap-1.5" title={`${r.label}: ${fmt(r.value)} MAD, ${r.count} departures`}>
          <span className="text-[11px] tabular-nums text-slate-500">{r.value ? fmtCompact(r.value) : ''}</span>
          <div className="w-full rounded-t-md bg-gradient-to-t from-amber-500 to-amber-300" style={{ height: `${Math.max(2, (r.value / max) * (height - 46))}px` }} />
          <span className="text-[11px] text-slate-400">{r.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- UI pieces ---------- */
function Empty({ text }) {
  return <p className="rounded-lg border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">{text}</p>;
}

function Card({ title, subtitle, right, children, className = '' }) {
  return (
    <section className={`rounded-xl border border-slate-200/80 bg-white p-5 ${className}`}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
        {right}
      </header>
      {children}
    </section>
  );
}

function Delta({ value, invert = false }) {
  if (value == null) return <span className="text-xs text-slate-400">{translate('new')}</span>;
  const flat = Math.abs(value) < 0.5;
  const good = invert ? value < 0 : value > 0;
  const Icon = flat ? Minus : value > 0 ? TrendingUp : TrendingDown;
  const cls = flat ? 'text-slate-500 bg-slate-100' : good ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      <Icon className="h-3 w-3" />{Math.abs(value).toFixed(1)}%
    </span>
  );
}

function Kpi({ label: l, value, unit, delta: d, invert, icon: Icon, chip, hint }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-200/80 bg-white p-5">
      <div className="min-w-0">
        <p className="text-sm text-slate-500">{l}</p>
        <p className="mt-1 truncate text-2xl font-semibold text-slate-900">{value}{unit && <span className="ml-1 text-sm font-medium text-slate-400">{unit}</span>}</p>
        <div className="mt-2 flex items-center gap-2">
          {d !== undefined && <Delta value={d} invert={invert} />}
          {hint && <span className="text-xs text-slate-400">{hint}</span>}
        </div>
      </div>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${chip}`}><Icon className="h-5 w-5" /></span>
    </div>
  );
}

const selectCls = 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30';

/* ---------- Page ---------- */
export default function AnalyticsPage() {
  const navigate = useNavigate();
  const [raw, setRaw] = useState({ bookings: [], payments: [], customers: [], profiles: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [preset, setPreset] = useState('90');
  const [destination, setDestination] = useState('ALL');
  const [employee, setEmployee] = useState('ALL');
  const [metric, setMetric] = useState('revenue');

  const load = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const [b, p, c, pr] = await Promise.all([
        supabase.from('bookings').select('*').order('created_at', { ascending: false }),
        supabase.from('booking_payments').select('*'),
        supabase.from('customers').select('id, full_name, country, created_at'),
        supabase.from('profiles').select('id, full_name, email'),
      ]);
      if (b.error) throw b.error;
      setRaw({ bookings: b.data || [], payments: p.error ? [] : p.data || [], customers: c.error ? [] : c.data || [], profiles: pr.error ? [] : pr.data || [] });
    } catch (e) {
      console.error('Analytics load failed:', e);
      setError('Could not load analytics data: ' + (e.message || 'Unknown error'));
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const destinations = useMemo(() => [...new Set(raw.bookings.map((b) => b.destination).filter(Boolean))].sort(), [raw.bookings]);

  /* ----- Core computation ----- */
  const a = useMemo(() => {
    const { bookings, payments, customers, profiles } = raw;
    const firstTs = Math.min(...bookings.map((b) => new Date(b.created_at).getTime()), Date.now());
    const range = resolveRange(preset, firstTs);
    const inR = (t, s, e) => t >= s && t < e;

    const scoped = bookings.filter((b) =>
      (destination === 'ALL' || b.destination === destination) && (employee === 'ALL' || b.assigned_to === employee));
    const ids = new Set(scoped.map((b) => b.id));
    const bookingById = Object.fromEntries(bookings.map((b) => [b.id, b]));

    const completed = payments.filter((p) => p.transaction_status === 'completed' && ids.has(p.booking_id));
    const signed = (p) => (p.transaction_type === 'refund' ? -1 : 1) * toMAD(p.amount, p.currency);

    const paidByBooking = {};
    completed.forEach((p) => { paidByBooking[p.booking_id] = (paidByBooking[p.booking_id] || 0) + signed(p); });

    const cur = scoped.filter((b) => inR(new Date(b.created_at).getTime(), range.start, range.end));
    const prv = scoped.filter((b) => inR(new Date(b.created_at).getTime(), range.prevStart, range.prevEnd));
    const curPay = completed.filter((p) => inR(dateOf(p), range.start, range.end));
    const prvPay = completed.filter((p) => inR(dateOf(p), range.prevStart, range.prevEnd));

    const sumRev = (list) => list.reduce((s, p) => s + signed(p), 0);
    const live = (list) => list.filter((b) => b.booking_status !== 'cancelled');
    const booked = (list) => live(list).reduce((s, b) => s + toMAD(b.total_amount, b.currency), 0);
    const cancelRate = (list) => pct(list.filter((b) => b.booking_status === 'cancelled').length, list.length);
    const avgVal = (list) => (live(list).length ? booked(list) / live(list).length : 0);
    const collected = (list) => live(list).reduce((s, b) => s + Math.min(paidByBooking[b.id] || 0, toMAD(b.total_amount, b.currency)), 0);
    const collectRate = (list) => pct(collected(list), booked(list));
    const insureRate = (list) => pct(list.filter((b) => b.extra_insurance).length, list.length);
    const lead = (list) => {
      const v = list.filter((b) => b.departure_date).map((b) => (new Date(b.departure_date) - new Date(b.created_at)) / DAY).filter((d) => d >= 0);
      return v.length ? v.reduce((s, d) => s + d, 0) / v.length : 0;
    };

    /* Outstanding & aging (all active bookings, not range-bound) */
    const aging = { overdue: 0, d30: 0, d90: 0, later: 0 };
    let outstandingTotal = 0, overdueCount = 0;
    scoped.filter((b) => ['pending', 'confirmed', 'in_progress', 'completed'].includes(b.booking_status)).forEach((b) => {
      const due = toMAD(b.total_amount, b.currency) - (paidByBooking[b.id] || 0);
      if (due <= 0.5) return;
      outstandingTotal += due;
      const days = b.departure_date ? (new Date(b.departure_date) - Date.now()) / DAY : 999;
      if (days < 0) { aging.overdue += due; overdueCount++; }
      else if (days <= 30) aging.d30 += due;
      else if (days <= 90) aging.d90 += due;
      else aging.later += due;
    });

    /* Trend */
    const buckets = buildBuckets(range.start, range.end);
    const bucketVals = (rows, getT, getV, off = 0) => buckets.map((bk) =>
      rows.reduce((s, r) => (inR(getT(r) - off, bk.from, bk.to) ? s + getV(r) : s), 0));
    const shift = range.end - range.start;
    const trend = {
      revenue: bucketVals(completed, dateOf, signed),
      revenuePrev: bucketVals(completed, dateOf, signed, -shift),
      bookings: bucketVals(scoped, (b) => new Date(b.created_at).getTime(), () => 1),
      bookingsPrev: bucketVals(scoped, (b) => new Date(b.created_at).getTime(), () => 1, -shift),
      value: bucketVals(live(scoped), (b) => new Date(b.created_at).getTime(), (b) => toMAD(b.total_amount, b.currency)),
      valuePrev: bucketVals(live(scoped), (b) => new Date(b.created_at).getTime(), (b) => toMAD(b.total_amount, b.currency), -shift),
    };

    /* Breakdowns */
    const statusRows = Object.entries(STATUS_META).map(([k, m]) => ({ label: m.label, color: m.color, value: cur.filter((b) => b.booking_status === k).length }));
    const group = (list, keyFn, valFn) => {
      const m = {};
      list.forEach((r) => { const k = keyFn(r); if (!k) return; m[k] = m[k] || { value: 0, count: 0 }; m[k].value += valFn(r); m[k].count++; });
      return Object.entries(m).map(([k, v]) => ({ label: k, ...v }));
    };
    const topDest = group(live(cur), (b) => b.destination, (b) => toMAD(b.total_amount, b.currency))
      .sort((x, y) => y.value - x.value).slice(0, 7).map((r) => ({ ...r, note: `${r.count} bookings` }));
    const methods = group(curPay.filter((p) => p.transaction_type === 'payment'), (p) => label(p.payment_method || 'other'), signed)
      .sort((x, y) => y.value - x.value).map((r, i) => ({ ...r, color: METHOD_COLORS[i % METHOD_COLORS.length] }));
    const countries = (() => {
      const cMap = Object.fromEntries(customers.map((c) => [c.id, c]));
      return group(live(cur), (b) => cMap[b.customer_id]?.country, (b) => toMAD(b.total_amount, b.currency))
        .sort((x, y) => y.value - x.value).slice(0, 6).map((r) => ({ ...r, note: `${r.count}` }));
    })();

    /* Team */
    const team = profiles.map((p) => {
      const mine = cur.filter((b) => b.assigned_to === p.id);
      const won = mine.filter((b) => ['confirmed', 'in_progress', 'completed'].includes(b.booking_status));
      return {
        id: p.id, name: p.full_name || p.email || 'Employee', bookings: mine.length,
        value: booked(mine), conv: pct(won.length, mine.length), cancel: cancelRate(mine), avg: avgVal(mine),
      };
    }).filter((t) => t.bookings > 0).sort((x, y) => y.value - x.value);

    /* Forecast: next 6 months of departures */
    const now = new Date();
    const forecast = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const key = monthKey(d);
      const rows = live(scoped).filter((b) => b.departure_date && monthKey(new Date(b.departure_date)) === key);
      return { label: d.toLocaleDateString(undefined, { month: 'short' }), value: booked(rows), count: rows.length };
    });

    /* Customers */
    const newCustomers = customers.filter((c) => inR(new Date(c.created_at).getTime(), range.start, range.end)).length;
    const counts = {};
    scoped.forEach((b) => { counts[b.customer_id] = (counts[b.customer_id] || 0) + 1; });
    const buyersInRange = [...new Set(cur.map((b) => b.customer_id))];
    const repeat = pct(buyersInRange.filter((id) => counts[id] > 1).length, buyersInRange.length);

    const k = {
      revenue: sumRev(curPay), revenuePrev: sumRev(prvPay),
      bookings: cur.length, bookingsPrev: prv.length,
      avg: avgVal(cur), avgPrev: avgVal(prv),
      collect: collectRate(cur), collectPrev: collectRate(prv),
      cancel: cancelRate(cur), cancelPrev: cancelRate(prv),
      insure: insureRate(cur), insurePrev: insureRate(prv),
      lead: lead(cur), leadPrev: lead(prv),
      booked: booked(cur), bookedPrev: booked(prv),
      outstanding: outstandingTotal, overdueCount, newCustomers, repeat,
    };

    /* Auto-generated insights */
    const insights = [];
    const dRev = delta(k.revenue, k.revenuePrev);
    if (dRev != null && Math.abs(dRev) >= 5) insights.push({ tone: dRev > 0 ? 'good' : 'bad', text: `Net revenue is ${dRev > 0 ? 'up' : 'down'} ${Math.abs(dRev).toFixed(0)}% against the previous period.` });
    if (topDest[0] && booked(cur) > 0) insights.push({ tone: 'info', text: `${topDest[0].label} drives ${pct(topDest[0].value, booked(cur)).toFixed(0)}% of booked value${pct(topDest[0].value, booked(cur)) > 50 ? ', which is a concentration risk' : ''}.` });
    if (aging.overdue > 0) insights.push({ tone: 'bad', text: `${fmt(aging.overdue)} MAD is unpaid on ${overdueCount} bookings whose departure date has passed.` });
    if (aging.d30 > 0) insights.push({ tone: 'warn', text: `${fmt(aging.d30)} MAD is due to be collected before departures in the next 30 days.` });
    if (k.cancel > k.cancelPrev + 3) insights.push({ tone: 'bad', text: `Cancellation rate rose to ${k.cancel.toFixed(1)}% from ${k.cancelPrev.toFixed(1)}%.` });
    if (k.insure < 25 && k.bookings > 4) insights.push({ tone: 'warn', text: `Only ${k.insure.toFixed(0)}% of bookings include extra insurance. Offering it at checkout is an easy upsell.` });
    const slow = forecast.slice(0, 3).filter((f) => f.count === 0).length;
    if (slow) insights.push({ tone: 'warn', text: `${slow} of the next 3 months have no departures booked yet.` });

    return { range, k, trend, statusRows, topDest, methods, countries, team, forecast, aging, insights, cur, bookingById, paidByBooking };
  }, [raw, preset, destination, employee]);

  const exportCsv = () => {
    const esc = (v) => (v == null ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
    const head = ['reference', 'created_at', 'destination', 'status', 'departure_date', 'total', 'currency', 'total_mad', 'paid_mad', 'insurance'];
    const rows = a.cur.map((b) => [b.booking_reference, b.created_at, b.destination, b.booking_status, b.departure_date, b.total_amount, b.currency,
      toMAD(b.total_amount, b.currency).toFixed(2), (a.paidByBooking[b.id] || 0).toFixed(2), b.extra_insurance ? 'yes' : 'no']);
    const blob = new Blob([[head, ...rows].map((r) => r.map(esc).join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const { k } = a;
  const trendSeries = metric === 'revenue' ? [a.trend.revenue, a.trend.revenuePrev]
    : metric === 'bookings' ? [a.trend.bookings, a.trend.bookingsPrev] : [a.trend.value, a.trend.valuePrev];
  const trendLabels = buildBuckets(a.range.start, a.range.end).map((b) => b.label);
  const agingRows = [
    { label: 'Past departure', value: a.aging.overdue, color: '#f43f5e' },
    { label: 'Departs within 30 days', value: a.aging.d30, color: '#f59e0b' },
    { label: 'Departs in 31–90 days', value: a.aging.d90, color: '#0ea5e9' },
    { label: 'Departs later', value: a.aging.later, color: '#94a3b8' },
  ];
  const toneCls = { good: 'bg-emerald-50 text-emerald-800 ring-emerald-200', bad: 'bg-rose-50 text-rose-800 ring-rose-200', warn: 'bg-amber-50 text-amber-800 ring-amber-200', info: 'bg-slate-50 text-slate-700 ring-slate-200' };
  const filtersOn = destination !== 'ALL' || employee !== 'ALL';

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-[1600px] space-y-6 p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{translate('Analytics')}</h1>
            <p className="mt-1 text-sm text-slate-500">{translate('Revenue, bookings, collections and team performance. Amounts are converted to MAD.')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select aria-label="Period" value={preset} onChange={(e) => setPreset(e.target.value)} className={selectCls}>
              {PRESETS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <select aria-label="Destination" value={destination} onChange={(e) => setDestination(e.target.value)} className={selectCls}>
              <option value="ALL">{translate('All destinations')}</option>
              {destinations.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <select aria-label="Employee" value={employee} onChange={(e) => setEmployee(e.target.value)} className={selectCls}>
              <option value="ALL">{translate('Everyone')}</option>
              {raw.profiles.map((p) => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
            </select>
            {filtersOn && (
              <button onClick={() => { setDestination('ALL'); setEmployee('ALL'); }} className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 underline underline-offset-2">
                <X className="h-3 w-3" />{translate('Clear')}</button>
            )}
            <button onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" title="Refresh data">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />{translate('Refresh')}</button>
            <button onClick={exportCsv} disabled={!a.cur.length} className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-500 disabled:opacity-50">
              <Download className="h-4 w-4" />{translate('Export CSV')}</button>
          </div>
        </div>

        {error && (
          <div role="alert" className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" /><span className="flex-1">{error}</span>
          </div>
        )}

        {loading ? (
          <div className="py-24 text-center text-slate-400"><RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin text-amber-600" />{translate('Crunching the numbers…')}</div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Kpi label="Net revenue" value={fmt(k.revenue)} unit="MAD" delta={delta(k.revenue, k.revenuePrev)} icon={Wallet} chip="bg-emerald-50 text-emerald-600" hint="vs previous period" />
              <Kpi label="New bookings" value={fmt(k.bookings)} delta={delta(k.bookings, k.bookingsPrev)} icon={CalendarDays} chip="bg-sky-50 text-sky-600" hint={`${fmt(k.booked)} MAD booked`} />
              <Kpi label="Average booking value" value={fmt(k.avg)} unit="MAD" delta={delta(k.avg, k.avgPrev)} icon={Target} chip="bg-violet-50 text-violet-600" />
              <Kpi label="Collection rate" value={k.collect.toFixed(1)} unit="%" delta={delta(k.collect, k.collectPrev)} icon={BarChart3} chip="bg-amber-50 text-amber-600" hint="paid vs booked" />
              <Kpi label="Outstanding balance" value={fmt(k.outstanding)} unit="MAD" icon={Clock} chip="bg-rose-50 text-rose-600" hint={`${k.overdueCount} past departure`} />
              <Kpi label="Cancellation rate" value={k.cancel.toFixed(1)} unit="%" delta={delta(k.cancel, k.cancelPrev)} invert icon={XCircle} chip="bg-rose-50 text-rose-600" />
              <Kpi label="Insurance attach rate" value={k.insure.toFixed(1)} unit="%" delta={delta(k.insure, k.insurePrev)} icon={ShieldCheck} chip="bg-emerald-50 text-emerald-600" />
              <Kpi label="Average lead time" value={fmt(k.lead)} unit="days" delta={delta(k.lead, k.leadPrev)} icon={Users} chip="bg-slate-100 text-slate-600" hint={`${k.repeat.toFixed(0)}% repeat buyers`} />
            </div>

            {/* Trend + insights */}
            <div className="grid gap-6 xl:grid-cols-3">
              <Card
                className="xl:col-span-2"
                title="Performance over time"
                subtitle="Solid line is this period, dashed line is the previous period."
                right={
                  <div role="tablist" className="flex gap-1 rounded-lg bg-stone-100 p-1 text-xs font-medium">
                    {[['revenue', 'Revenue'], ['value', 'Booked value'], ['bookings', 'Bookings']].map(([v, l]) => (
                      <button key={v} role="tab" aria-selected={metric === v} onClick={() => setMetric(v)}
                        className={`rounded-md px-3 py-1.5 transition ${metric === v ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>{l}</button>
                    ))}
                  </div>
                }
              >
                <TrendChart labels={trendLabels} series={trendSeries[0]} prev={trendSeries[1]} />
              </Card>

              <Card title="Insights" subtitle="Generated from your current filters." right={<Lightbulb className="h-4 w-4 text-amber-600" />}>
                {a.insights.length === 0 ? <Empty text="Nothing unusual in this period." /> : (
                  <ul className="space-y-2.5">
                    {a.insights.map((i, idx) => (
                      <li key={idx} className={`rounded-lg px-3 py-2.5 text-sm ring-1 ring-inset ${toneCls[i.tone]}`}>{i.text}</li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>

            {/* Breakdowns */}
            <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
              <Card title="Booking status" subtitle="Bookings created in this period.">
                <div className="flex flex-wrap items-center gap-6">
                  <Donut data={a.statusRows} />
                  <ul className="min-w-[140px] flex-1 space-y-2 text-sm">
                    {a.statusRows.map((s) => (
                      <li key={s.label} className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2 text-slate-600"><span className="h-2 w-2 rounded-full" style={{ background: s.color }} />{s.label}</span>
                        <span className="tabular-nums font-medium text-slate-900">{s.value}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>

              <Card title="Top destinations" subtitle="By booked value, cancelled bookings excluded.">
                <HBars rows={a.topDest} />
              </Card>

              <Card title="Payments by method" subtitle="Completed payments in this period.">
                <HBars rows={a.methods} />
              </Card>

              <Card title="Receivables aging" subtitle="Unpaid balance grouped by departure date." right={<span className="text-xs font-semibold text-rose-600 tabular-nums">{fmt(k.outstanding)} MAD</span>}>
                <HBars rows={agingRows} />
              </Card>

              <Card title="Departure forecast" subtitle="Booked value by departure month, next 6 months.">
                <Columns rows={a.forecast} />
              </Card>

              <Card title="Customer countries" subtitle="By booked value.">
                <HBars rows={a.countries} color="#0ea5e9" />
              </Card>
            </div>

            {/* Team */}
            <Card title="Team performance" subtitle="Bookings created in this period, by assigned employee." className="overflow-hidden !p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-y border-slate-100 bg-stone-50 text-xs font-medium text-slate-500">
                      <th className="px-5 py-3">{translate('Employee')}</th>
                      <th className="px-4 py-3 text-right">{translate('Bookings')}</th>
                      <th className="px-4 py-3 text-right">{translate('Booked value')}</th>
                      <th className="px-4 py-3 text-right">{translate('Avg value')}</th>
                      <th className="w-52 px-4 py-3">{translate('Win rate')}</th>
                      <th className="px-5 py-3 text-right">{translate('Cancelled')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {a.team.length === 0 ? (
                      <tr><td colSpan="6" className="py-10 text-center text-slate-400">{translate('No assigned bookings in this period.')}</td></tr>
                    ) : a.team.map((t) => (
                      <tr key={t.id} className="hover:bg-amber-50/40">
                        <td className="px-5 py-3.5 font-medium text-slate-900">
                          <button onClick={() => setEmployee(t.id)} className="text-left hover:text-amber-700 hover:underline" title="Filter the page by this employee">{t.name}</button>
                        </td>
                        <td className="px-4 py-3.5 text-right tabular-nums">{t.bookings}</td>
                        <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-slate-900">{fmt(t.value)} MAD</td>
                        <td className="px-4 py-3.5 text-right tabular-nums">{fmt(t.avg)} MAD</td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${t.conv}%` }} /></div>
                            <span className="w-10 text-right text-xs tabular-nums text-slate-500">{t.conv.toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className={`px-5 py-3.5 text-right tabular-nums ${t.cancel > 20 ? 'font-semibold text-rose-600' : ''}`}>{t.cancel.toFixed(0)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <p className="text-xs text-slate-400">
              Conversion rates: 1 EUR = {RATES_TO_MAD.EUR} MAD, 1 USD = {RATES_TO_MAD.USD} MAD. Edit <code className="rounded bg-slate-100 px-1">{translate('RATES_TO_MAD')}</code> at the top of this file to change them.{' '}
              <button onClick={() => navigate('/admin/payments-transactions')} className="font-medium text-amber-700 underline underline-offset-2">{translate('Open payments ledger')}</button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}