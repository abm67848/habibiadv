// src/pages/admin/AdminDashboardPage.jsx
import { translate } from '@/context/index.jsx';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, ArrowRight, BarChart3, Calendar, Check, ChevronDown, ChevronRight, Compass,
  CreditCard, DollarSign, Layers, RefreshCw, Search, ShieldCheck, TrendingDown, TrendingUp, Users, Wallet, X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

/* ---------- Shared style tokens ---------- */
const btnGhost =
  'inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition disabled:opacity-50';

/* ================================================================== */
/*  Constants                                                          */
/* ================================================================== */
const RANGE_OPTIONS = [
  { value: 'today', label: 'Hoy' },
  { value: 'last_7_days', label: 'Últimos 7 días' },
  { value: 'last_30_days', label: 'Últimos 30 días' },
  { value: 'this_month', label: 'Este mes' },
  { value: 'this_year', label: 'Este año' },
];

const STATUS_META = {
  pending:     { label: 'Pendiente',   dot: 'bg-amber-500',   chip: 'bg-amber-50 text-amber-800 ring-amber-200' },
  confirmed:   { label: 'Confirmada',  dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  in_progress: { label: 'En curso',    dot: 'bg-sky-500',     chip: 'bg-sky-50 text-sky-800 ring-sky-200' },
  completed:   { label: 'Completada',  dot: 'bg-violet-500',  chip: 'bg-violet-50 text-violet-800 ring-violet-200' },
  cancelled:   { label: 'Cancelada',   dot: 'bg-rose-500',    chip: 'bg-rose-50 text-rose-800 ring-rose-200' },
};

const PAYMENT_META = {
  paid:           { label: 'Pagada',          color: '#10b981' },
  partially_paid: { label: 'Pago parcial',    color: '#f59e0b' },
  overpaid:       { label: 'Pago en exceso',  color: '#8b5cf6' },
  unpaid:         { label: 'Sin pagar',       color: '#f43f5e' },
};

/* ================================================================== */
/*  Utilities                                                          */
/* ================================================================== */
const fmtMoney = (n, currency = 'MAD') => {
  const v = Number(n || 0);
  if (!Number.isFinite(v)) return '—';
  try {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency, maximumFractionDigits: 0 }).format(v);
  } catch {
    return `${currency} ${v.toLocaleString('es-ES')}`;
  }
};

const fmtDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
};

const toDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const travelers = (n) => `${n || 1} ${(n || 1) === 1 ? 'viajero' : 'viajeros'}`;

function rangeFor(preset) {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = toDay(now);

  switch (preset) {
    case 'today':        break;
    case 'last_7_days':  start.setDate(start.getDate() - 6); break;
    case 'last_30_days': start.setDate(start.getDate() - 29); break;
    case 'this_month':   start.setDate(1); break;
    case 'this_year':    start.setMonth(0, 1); break;
    default:             start.setDate(start.getDate() - 29);
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
function KpiCard({ label, value, sub, icon: Icon, tone = 'text-slate-900', chip = 'bg-slate-100 text-slate-600', trend, onClick }) {
  const trendUp = trend != null && trend >= 0;
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      {...(onClick ? { type: 'button', onClick } : {})}
      className={`w-full bg-white p-5 rounded-xl border border-slate-200/80 text-left ${
        onClick ? 'transition hover:border-amber-300 hover:bg-amber-50/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-slate-500">{label}</p>
          <p className={`text-2xl font-semibold mt-1 truncate ${tone}`}>{value}</p>
          {sub && <p className="mt-0.5 text-xs text-slate-400 truncate">{sub}</p>}
        </div>
        {Icon && (
          <span className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${chip}`}>
            <Icon className="w-5 h-5" />
          </span>
        )}
      </div>
      {trend != null && (
        <p className={`mt-3 inline-flex items-center gap-1 text-xs font-medium ${trendUp ? 'text-emerald-600' : 'text-rose-600'}`}>
          {trendUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          {Math.abs(trend).toFixed(1)}% frente al periodo anterior
        </p>
      )}
    </Wrapper>
  );
}

function SectionCard({ title, icon: Icon, subtitle, action, children, className = '' }) {
  return (
    <section className={`bg-white rounded-xl border border-slate-200/80 overflow-hidden ${className}`}>
      <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex items-start gap-2.5 min-w-0">
          {Icon && <Icon className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />}
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
        </div>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function LinkAction({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-800 underline-offset-2 hover:underline shrink-0"
    >
      {children}
    </button>
  );
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${meta.chip}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

function PaidBar({ paid, total }) {
  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  return (
    <div className="w-full">
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-xs text-slate-400">{pct}% cobrado</p>
    </div>
  );
}

function MixRow({ label, value, pct, color, dotClass }) {
  return (
    <li>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-2 font-medium text-slate-700">
          <span className={`w-2 h-2 rounded-full ${dotClass || ''}`} style={color ? { background: color } : undefined} />
          {label}
        </span>
        <span className="font-semibold text-slate-900">
          {value}
          <span className="ml-1 text-xs font-normal text-slate-400">({pct}%)</span>
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${dotClass || ''}`} style={{ width: `${pct}%`, ...(color ? { background: color } : {}) }} />
      </div>
    </li>
  );
}

function EmptyMini({ icon: Icon = Layers, children }) {
  return (
    <div className="py-8 text-center">
      <span className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-400">
        <Icon aria-hidden="true" className="h-5 w-5" />
      </span>
      <p className="mt-2 text-sm text-slate-500">{children}</p>
    </div>
  );
}

/* ---------- Custom dropdown (portal menu, keyboard support) ---------- */
function Select({
  value, onChange, options, placeholder = 'Selecciona…', searchable = false, prefix, icon: LeadIcon,
  compact = false, disabled = false, ariaLabel, className = '', menuMinWidth = 200,
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
          ${open ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200 hover:border-slate-300'}`}
      >
        <span className="flex items-center gap-2 min-w-0">
          {LeadIcon && <LeadIcon className="w-4 h-4 text-amber-600 shrink-0" />}
          {prefix && <span className="text-slate-400 shrink-0">{prefix}</span>}
          <span className={`truncate ${selected ? 'text-slate-800' : 'text-slate-400'}`}>
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

/* ================================================================== */
/*  Smooth line chart (Catmull-Rom → Bézier)                           */
/* ================================================================== */
function smoothPath(points) {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

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
  // Los hooks van antes de cualquier return anticipado para respetar las reglas de React.
  const [hover, setHover] = useState(null);

  const width = 800;
  const pad = { top: 16, right: 16, bottom: 32, left: 56 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  if (!series.length) {
    return (
      <div className="grid h-60 place-items-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-400">
        {translate('No hay actividad en este periodo.')}
      </div>
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

  const handleMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xPixels = ((e.clientX - rect.left) / rect.width) * width;
    const relative = xPixels - pad.left;
    if (relative < 0 || relative > innerW) { setHover(null); return; }
    const idx = series.length > 1 ? Math.round(relative / stepX) : 0;
    setHover(Math.max(0, Math.min(series.length - 1, idx)));
  };

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        role="img"
        aria-label="Tendencia de ingresos"
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
          <path d={prevPath} stroke="#cbd5e1" strokeWidth="1.75" fill="none" strokeDasharray="5 4" strokeLinejoin="round" strokeLinecap="round" />
        )}

        <path d={currentPath} stroke="#d97706" strokeWidth="2.25" fill="none" strokeLinejoin="round" strokeLinecap="round" />

        {series.map((d, i) =>
          i % labelEvery === 0 || i === series.length - 1 ? (
            <text key={i} x={xFor(i)} y={height - 10} textAnchor="middle" fontSize="10" fill="#94a3b8">
              {d.label}
            </text>
          ) : null,
        )}

        {hover != null && series[hover] && (
          <g>
            <line x1={xFor(hover)} x2={xFor(hover)} y1={pad.top} y2={pad.top + innerH} stroke="#94a3b8" strokeDasharray="3 3" />
            <circle cx={xFor(hover)} cy={yFor(series[hover].revenue)} r="4.5" fill="#d97706" stroke="#fff" strokeWidth="2" />
          </g>
        )}
      </svg>

      {hover != null && series[hover] && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-md"
          style={{
            left: `${(xFor(hover) / width) * 100}%`,
            top: `${(yFor(series[hover].revenue) / height) * 100}%`,
          }}
        >
          <p className="font-semibold text-slate-900">{series[hover].label}</p>
          <p className="text-amber-700">{fmtMoney(series[hover].revenue, currency)}</p>
          {previous?.[hover] && (
            <p className="text-slate-400">Anterior: {fmtMoney(previous[hover].revenue, currency)}</p>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full bg-amber-600" />{translate('Periodo actual')}
        </span>
        {previous && previous.length > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full bg-slate-300" style={{ backgroundImage: 'linear-gradient(90deg, #cbd5e1 50%, transparent 50%)', backgroundSize: '4px 100%' }} />
            {translate('Periodo anterior')}
          </span>
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
        setCurrentUser(profile || { full_name: user.email?.split('@')[0] || 'Usuario de la agencia' });
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
      setError(err?.message || 'No se pudieron cargar las métricas del panel.');
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
        label: cursor.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
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
        label: cursor.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
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
    // Alinea la longitud con la serie actual para que el gráfico se asigne índice a índice
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
      else if (total > 0 && paid > total) bucket = 'overpaid';
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
      { key: 'individual', label: 'Individual', value: individual, pct: Math.round((individual / total) * 100), color: '#10b981' },
      { key: 'collective', label: 'Colectivo',  value: collective, pct: Math.round((collective / total) * 100), color: '#0ea5e9' },
      { key: 'none',       label: 'Sin seguro', value: none,       pct: Math.round((none / total) * 100),       color: '#cbd5e1' },
    ];
  }, [periodBookings]);

  /* ---------- Recent bookings ---------- */
  const recentBookings = useMemo(() => enrichedBookings.slice(0, 8), [enrichedBookings]);

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
        title: b.offer?.public_title || b.offer?.internal_title || 'Paquete sin título',
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
  if (loading && bookings.length === 0) {
    return (
      <div className="min-h-screen bg-stone-50">
        <div className="mx-auto max-w-[1600px] space-y-6 p-6 lg:p-8">
          <div className="h-20 animate-pulse rounded-xl bg-white" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-white" />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="h-72 animate-pulse rounded-xl bg-white lg:col-span-2" />
            <div className="h-72 animate-pulse rounded-xl bg-white" />
          </div>
          <p className="text-center text-sm text-slate-400">{translate('Cargando el panel…')}</p>
        </div>
      </div>
    );
  }

  const firstName = currentUser?.full_name?.split(' ')[0];
  const rangeText = `${start.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} – ${end.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}`;

  const kpiCards = [
    {
      label: 'Reservas',
      value: kpis.totalReservations,
      sub: `${kpis.confirmed} confirmadas · ${kpis.pending} pendientes`,
      icon: Calendar,
      tone: 'text-slate-900',
      chip: 'bg-slate-100 text-slate-600',
      trend: kpis.reservationChange,
      to: '/admin/reservations',
    },
    {
      label: 'Ingresos netos',
      value: fmtMoney(kpis.revenue),
      sub: `Ticket medio ${fmtMoney(kpis.aov)}`,
      icon: Wallet,
      tone: 'text-emerald-600',
      chip: 'bg-emerald-50 text-emerald-600',
      trend: kpis.revenueChange,
      to: '/admin/payments-transactions',
    },
    {
      label: 'Saldo pendiente',
      value: fmtMoney(kpis.outstanding),
      sub: 'Importe por cobrar en este periodo',
      icon: DollarSign,
      tone: 'text-slate-900',
      chip: 'bg-violet-50 text-violet-600',
      to: '/admin/payments-transactions',
    },
    {
      label: 'Reservas con seguro',
      value: `${kpis.insuranceAttach.toFixed(1)}%`,
      sub: `${kpis.insured} de ${kpis.totalReservations} reservas`,
      icon: ShieldCheck,
      tone: 'text-slate-900',
      chip: 'bg-sky-50 text-sky-600',
      to: '/admin/reservations',
    },
  ];

  /* ---------- Render ---------- */
  return (
    <main className="min-h-screen bg-stone-50">
      <style>{`
        @keyframes rp-pop { from { opacity: 0; transform: translateY(6px) scale(.98); } to { opacity: 1; transform: none; } }
        .rp-pop { animation: rp-pop .16s ease-out; }
        @media (prefers-reduced-motion: reduce) { .rp-pop { animation-duration: 1ms; } }
      `}</style>

      <div className="mx-auto max-w-[1600px] space-y-6 p-6 lg:p-8">
        {/* Header */}
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              {firstName ? `Bienvenido de nuevo, ${firstName}` : 'Bienvenido de nuevo'}
            </h1>
            <p className="mt-1 text-sm text-slate-500 first-letter:uppercase">
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
              {' · '}{translate('Resumen de la actividad de tu agencia. Cambia el rango o abre cualquier panel.')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              className="w-52"
              icon={Calendar}
              ariaLabel="Rango de fechas"
              value={dateRange}
              onChange={setDateRange}
              options={RANGE_OPTIONS}
            />
            <button type="button" onClick={() => navigate('/admin/analytics')} className={btnGhost}>
              <BarChart3 className="w-4 h-4 text-slate-500" />{translate('Analítica')}
            </button>
            <button type="button" onClick={load} className={btnGhost} title="Actualizar datos">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />{translate('Actualizar')}
            </button>
          </div>
        </header>

        {error && (
          <div role="alert" className="px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800 text-sm rp-pop">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="flex-1">{error}</span>
            <button type="button" onClick={() => setError(null)} className="p-1 hover:bg-rose-100 rounded" aria-label="Descartar">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* KPI row */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpiCards.map(({ to, ...card }) => (
            <KpiCard key={card.label} {...card} onClick={() => navigate(to)} />
          ))}
        </section>

        {/* Charts row */}
        <div className="grid gap-4 lg:grid-cols-3">
          <SectionCard
            title="Tendencia de ingresos"
            icon={TrendingUp}
            subtitle="Cobro neto diario frente al periodo anterior"
            className="lg:col-span-2"
            action={<span className="text-xs font-medium text-slate-500 shrink-0">{rangeText}</span>}
          >
            <RevenueTrend series={revenueSeries} previous={previousSeries} currency="MAD" />
          </SectionCard>

          <SectionCard title="Distribución por estado" icon={Layers} subtitle="Reservas de este periodo">
            {statusDistribution.length === 0 ? (
              <EmptyMini icon={Calendar}>{translate('No hay reservas en este periodo.')}</EmptyMini>
            ) : (
              <ul className="space-y-4">
                {statusDistribution.map(({ status, count, percentage, meta }) => (
                  <li key={status}>
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/reservations?status=${status}`)}
                      className="w-full rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30"
                    >
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="flex items-center gap-2 font-medium text-slate-700">
                          <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                          {meta.label}
                        </span>
                        <span className="font-semibold text-slate-900">
                          {count}
                          <span className="ml-1 text-xs font-normal text-slate-400">({percentage}%)</span>
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full rounded-full ${meta.dot}`} style={{ width: `${percentage}%` }} />
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>

        {/* Second row */}
        <div className="grid gap-4 lg:grid-cols-3">
          <SectionCard title="Estado de los pagos" icon={CreditCard} subtitle="Reservas por estado de pago en este periodo">
            {paymentMix.length === 0 ? (
              <EmptyMini icon={CreditCard}>{translate('No hay reservas en este periodo.')}</EmptyMini>
            ) : (
              <ul className="space-y-4">
                {paymentMix.map((row) => (
                  <MixRow key={row.key} label={row.label} value={row.value} pct={row.percentage} color={row.color} />
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Seguros contratados" icon={ShieldCheck} subtitle="De las reservas creadas en este periodo">
            <ul className="space-y-4">
              {insuranceMix.map((row) => (
                <MixRow key={row.key} label={row.label} value={row.value} pct={row.pct} color={row.color} />
              ))}
            </ul>
          </SectionCard>

          <SectionCard
            title="Clientes y catálogo"
            icon={Users}
            action={<LinkAction onClick={() => navigate('/admin/customers')}>{translate('Abrir clientes')}</LinkAction>}
          >
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-slate-200 p-4">
                <dt className="text-slate-500">{translate('Total de clientes')}</dt>
                <dd className="mt-1 text-xl font-semibold text-slate-900">{customers.length}</dd>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <dt className="text-emerald-700">{translate('Nuevos en el periodo')}</dt>
                <dd className="mt-1 text-xl font-semibold text-emerald-700">+{newCustomers.length}</dd>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <dt className="text-slate-500">{translate('Ofertas activas')}</dt>
                <dd className="mt-1 text-xl font-semibold text-slate-900">{activeOffers}</dd>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <dt className="text-slate-500">{translate('Total de ofertas')}</dt>
                <dd className="mt-1 text-xl font-semibold text-slate-900">{offers.length}</dd>
              </div>
            </dl>
          </SectionCard>
        </div>

        {/* Recent bookings + upcoming departures */}
        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard
            title="Reservas recientes"
            icon={Calendar}
            action={
              <LinkAction onClick={() => navigate('/admin/reservations')}>
                {translate('Ver todas')} <ChevronRight className="w-3.5 h-3.5" />
              </LinkAction>
            }
          >
            {recentBookings.length === 0 ? (
              <EmptyMini icon={Calendar}>{translate('Aún no hay reservas.')}</EmptyMini>
            ) : (
              <ul className="space-y-2.5">
                {recentBookings.map((b) => (
                  <li key={b.id}>
                    <button
                      type="button"
                      onClick={() => navigate('/admin/reservations')}
                      className="w-full rounded-xl border border-slate-200 bg-white p-3.5 text-left transition hover:border-amber-300 hover:bg-amber-50/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">
                            {b.customers?.full_name || 'Invitado'}
                          </p>
                          <p className="truncate font-mono text-xs text-amber-700">{b.booking_reference}</p>
                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            {b.destination || '—'} · {travelers(b.traveler_count)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <StatusBadge status={b.booking_status} />
                          <span className="text-sm font-semibold text-slate-900">
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
            title="Próximas salidas"
            icon={Compass}
            subtitle="Próximos 30 días"
            action={
              <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200">
                {upcomingDepartures.length} {upcomingDepartures.length === 1 ? 'viaje' : 'viajes'}
              </span>
            }
          >
            {upcomingDepartures.length === 0 ? (
              <EmptyMini icon={Compass}>{translate('No hay salidas programadas próximamente.')}</EmptyMini>
            ) : (
              <ul className="space-y-2.5">
                {upcomingDepartures.map((b) => {
                  const seatsAvailable =
                    b.departure && b.departure.max_capacity != null
                      ? Math.max(0, Number(b.departure.max_capacity) - Number(b.departure.reserved_capacity || 0))
                      : null;
                  return (
                    <li key={b.id} className="rounded-xl border border-slate-200 bg-white p-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">
                            {b.customers?.full_name || 'Invitado'}
                          </p>
                          <p className="truncate text-xs text-slate-500">{b.destination || '—'}</p>
                          <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-amber-800">
                            <Calendar className="w-3.5 h-3.5" /> {fmtDate(b.departure_date)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold text-slate-900">{travelers(b.traveler_count)}</p>
                          {seatsAvailable != null && (
                            <p className={`text-xs ${seatsAvailable <= 3 ? 'font-semibold text-rose-600' : 'text-slate-500'}`}>
                              {seatsAvailable === 1 ? 'Queda 1 plaza' : `Quedan ${seatsAvailable} plazas`}
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
          title="Paquetes con más ingresos"
          icon={Compass}
          subtitle="En el periodo seleccionado"
          action={
            <LinkAction onClick={() => navigate('/admin/packages-services')}>
              {translate('Todos los paquetes')} <ChevronRight className="w-3.5 h-3.5" />
            </LinkAction>
          }
        >
          {topPackages.length === 0 ? (
            <EmptyMini icon={Compass}>{translate('No se vendió ningún paquete en este periodo.')}</EmptyMini>
          ) : (
            <div className="-mx-5 -mb-5 overflow-x-auto">
              <table className="w-full min-w-[600px] border-collapse text-left">
                <thead>
                  <tr className="border-y border-slate-100 bg-stone-50 text-xs font-medium text-slate-500">
                    <th className="py-3 px-5">{translate('Paquete')}</th>
                    <th className="py-3 px-4">{translate('Categoría')}</th>
                    <th className="py-3 px-4 text-right">{translate('Reservas')}</th>
                    <th className="py-3 px-4 text-right">{translate('Ingresos')}</th>
                    <th className="py-3 px-5 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {topPackages.map((p) => (
                    <tr
                      key={p.id}
                      tabIndex={0}
                      onClick={() => navigate(`/admin/packages-services/${p.id}`)}
                      onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/admin/packages-services/${p.id}`); }}
                      className="group cursor-pointer hover:bg-amber-50/40 focus:outline-none focus-visible:bg-amber-50/60 transition-colors"
                    >
                      <td className="py-3.5 px-5">
                        <p className="font-medium text-slate-900">{p.title}</p>
                        <p className="font-mono text-xs text-amber-700">{p.reference}</p>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{p.category}</td>
                      <td className="py-3.5 px-4 text-right font-medium text-slate-700">{p.bookings}</td>
                      <td className="py-3.5 px-4 text-right font-semibold text-slate-900">{fmtMoney(p.revenue)}</td>
                      <td className="py-3.5 px-5 text-right">
                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600 transition" aria-label={`Abrir ${p.title}`} />
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