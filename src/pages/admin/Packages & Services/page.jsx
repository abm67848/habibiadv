// src/pages/admin/AdminPackagesAndServicesPage.jsx
import { translate, useAuth } from '@/context/index.jsx';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Activity, AlertTriangle, Archive, Building2, CalendarDays, Check, CheckCircle2, ChevronDown,
  ChevronLeft, ChevronRight, Copy, Download, Edit, Eye, Globe, Layers, Loader2, Lock, MapPin,
  MoreHorizontal, Package, Plane, Plus, RefreshCw, RotateCcw, Search, X,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { supabase } from '@/lib/supabase/client.jsx';
import { getAdminPackages, saveAdminOffer } from '@/services/packages/index.jsx';
import { canUserAccessPath } from '@/services/roleAccessService.js';

/* ---------- Shared style tokens ---------- */
const inputCls =
  'w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition';
const labelCls = 'block text-xs font-medium text-slate-600 mb-1.5';
const btnGhost =
  'inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed';
const btnPrimary =
  'inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-500 shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed';

/* ---------- Constants ---------- */
// Los valores se guardan en inglés en la base de datos; solo se traduce la etiqueta visible.
const CATEGORIES = [
  'Adventure',
  'Beach & Island',
  'City & Culture',
  'Desert & Safari',
  'Family',
  'Food & Wine',
  'Luxury',
  'Religious & Pilgrimage',
  'Other',
];
const CATEGORY_LABELS = {
  Adventure: 'Aventura',
  'Beach & Island': 'Playa e islas',
  'City & Culture': 'Ciudad y cultura',
  'Desert & Safari': 'Desierto y safari',
  Family: 'Familia',
  'Food & Wine': 'Gastronomía y vinos',
  Luxury: 'Lujo',
  'Religious & Pilgrimage': 'Religioso y peregrinación',
  Other: 'Otro',
};
const categoryLabel = (v) => CATEGORY_LABELS[v] || v || '—';
const CATEGORY_OPTIONS = CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c] }));

const PACKAGE_STATUS = {
  draft: { label: 'Borrador', dot: 'bg-amber-500', cls: 'bg-amber-50 text-amber-800 ring-amber-200' },
  active: { label: 'Activo', dot: 'bg-emerald-500', cls: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  inactive: { label: 'Inactivo', dot: 'bg-slate-400', cls: 'bg-slate-100 text-slate-600 ring-slate-200' },
  archived: { label: 'Archivado', dot: 'bg-slate-300', cls: 'bg-slate-100 text-slate-500 ring-slate-200' },
};
const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Todos' },
  ...Object.entries(PACKAGE_STATUS).map(([value, v]) => ({ value, label: v.label, dot: v.dot })),
];
const VISIBILITY_OPTIONS = [
  { value: 'ALL', label: 'Todas' },
  { value: 'public', label: 'Solo públicos', dot: 'bg-emerald-500' },
  { value: 'private', label: 'Solo privados', dot: 'bg-slate-400' },
];

const PAGE_SIZE = 15;

/* ---------- Helpers ---------- */
function formatCurrency(amount, currency) {
  if (amount == null || amount === '') return 'Sin precio';
  const code = currency || 'MAD';
  try {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 2,
    }).format(Number(amount));
  } catch {
    return `${code} ${Number(amount).toLocaleString('es-ES')}`;
  }
}

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function generateReference() {
  const year = new Date().getFullYear();
  const rand = String(Math.floor(1000 + Math.random() * 9000));
  const ts = Date.now().toString(36).slice(-3).toUpperCase();
  return `PKG-${year}-${rand}${ts}`;
}

const createInitialOffer = () => ({
  reference: generateReference(),
  internal_title: '',
  public_title: '',
  package_category: 'City & Culture',
  destination_country: '',
  destination_city: '',
  duration_days: 1,
  duration_nights: 0,
  short_description: '',
});

const isLiveOffer = (o) => Boolean(o.is_public && o.status === 'active');

/* ---------- Small presentational pieces ---------- */
function StatusBadge({ status }) {
  const s = PACKAGE_STATUS[status] || PACKAGE_STATUS.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${s.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function VisibilityBadge({ isPublic, status }) {
  const live = isPublic && status === 'active';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${
      live ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-slate-100 text-slate-600 ring-slate-200'
    }`}>
      {live ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
      {live ? 'En vivo' : 'Privado'}
    </span>
  );
}

function ConfigIndicator({ icon: IconCmp, count, label }) {
  const ok = count > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
        ok ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-slate-50 text-slate-400 ring-slate-200'
      }`}
      title={`${label}: ${count}`}
      aria-label={`${label}: ${count}`}
    >
      <IconCmp className="w-3 h-3" />
      {count}
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
      <button onClick={onClose} className="p-1.5 -mr-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition" aria-label="Cerrar">
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

function FieldError({ children }) {
  return children ? <p className="mt-1 text-xs text-rose-600">{children}</p> : null;
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

/* ---------- Row action menu (portal, so the table's overflow never clips it) ---------- */
function RowActions({ offer, canUpdate, canCreate, duplicating, onDuplicate, onPublishToggle, onArchive }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const live = isLiveOffer(offer);
  const name = offer.public_title || offer.reference;

  const place = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const up = window.innerHeight - r.bottom < 190 && r.top > 190;
    setPos({
      right: Math.max(8, window.innerWidth - r.right),
      top: up ? undefined : r.bottom + 6,
      bottom: up ? window.innerHeight - r.top + 6 : undefined,
    });
  }, []);

  useLayoutEffect(() => { if (open) place(); }, [open, place]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (btnRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); btnRef.current?.focus(); } };
    const onMove = () => setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [open]);

  const stop = (e) => e.stopPropagation();
  const itemCls = 'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm rounded-lg disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <div className="flex items-center justify-end gap-1" onClick={stop} onKeyDown={stop}>
      <Link
        to={`/packages/${offer.id}${live ? '' : '?preview=true'}`}
        target="_blank"
        rel="noreferrer"
        aria-label={`Vista previa de ${name}`}
        title="Vista previa"
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
      >
        <Eye className="w-4 h-4" />
      </Link>
      <Link
        to={`/admin/packages-services/${offer.id}`}
        aria-label={`Editar ${name}`}
        title="Editar"
        className="rounded-lg p-2 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
      >
        <Edit className="w-4 h-4" />
      </Link>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Más acciones para ${name}`}
        title="Más acciones"
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
      >
        {duplicating ? <Loader2 className="w-4 h-4 animate-spin" /> : <MoreHorizontal className="w-4 h-4" />}
      </button>
      {open && pos && createPortal(
        <div
          ref={menuRef}
          role="menu"
          style={{ position: 'fixed', right: pos.right, top: pos.top, bottom: pos.bottom }}
          className="z-[100] w-52 p-1 bg-white border border-slate-200 rounded-xl shadow-xl shadow-slate-900/10 ring-1 ring-black/5 rp-pop"
        >
          <button
            type="button"
            role="menuitem"
            disabled={!canCreate || duplicating}
            onClick={() => { setOpen(false); onDuplicate(offer); }}
            className={`${itemCls} text-slate-700 hover:bg-amber-50`}
          >
            <Copy className="w-4 h-4 text-slate-400" />{translate('Duplicar')}
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={!canUpdate}
            onClick={() => { setOpen(false); onPublishToggle(offer); }}
            className={`${itemCls} text-slate-700 hover:bg-amber-50`}
          >
            {live ? <Lock className="w-4 h-4 text-slate-400" /> : <Globe className="w-4 h-4 text-slate-400" />}
            {live ? 'Despublicar' : 'Publicar'}
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={!canUpdate || offer.status === 'archived'}
            onClick={() => { setOpen(false); onArchive(offer); }}
            className={`${itemCls} text-rose-600 hover:bg-rose-50`}
          >
            <Archive className="w-4 h-4" />{translate('Archivar')}
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}

/* ---------- Empty state graphics ---------- */
function EmptyIllustrationPackages() {
  return (
    <svg viewBox="0 0 320 200" className="mx-auto h-40 w-auto" role="img" aria-label="Ilustración de paquetes de viaje">
      <ellipse cx="160" cy="184" rx="110" ry="8" className="fill-slate-100" />

      {/* Ruta punteada entre las dos tarjetas */}
      <path d="M120 54C150 22 214 22 244 46" className="stroke-amber-300" stroke="currentColor" strokeWidth="2" strokeDasharray="4 5" strokeLinecap="round" fill="none" />
      <circle cx="120" cy="54" r="4" className="fill-amber-300" />

      {/* Tarjeta de paquete (atrás, inclinada a la izquierda) */}
      <g transform="rotate(-4 100 110)">
        <rect x="38" y="56" width="122" height="94" rx="12" className="fill-white stroke-slate-200" strokeWidth="2" />
        <rect x="48" y="66" width="102" height="44" rx="8" className="fill-slate-100" />
        <path d="M48 110l26-26 18 16 14-12 44 22z" className="fill-slate-200" />
        <circle cx="130" cy="82" r="6" className="fill-amber-200" />
        <rect x="48" y="120" width="62" height="7" rx="3.5" className="fill-slate-300" />
        <rect x="48" y="133" width="40" height="5" rx="2.5" className="fill-slate-200" />
      </g>

      {/* Tarjeta de destino (delante, inclinada a la derecha) */}
      <g transform="rotate(4 205 105)">
        <rect x="140" y="68" width="132" height="86" rx="12" className="fill-white stroke-amber-300" strokeWidth="2" />
        <circle cx="170" cy="94" r="15" className="fill-amber-100" />
        <path d="M170 86a6 6 0 0 1 6 6c0 5-6 11-6 11s-6-6-6-11a6 6 0 0 1 6-6z" className="fill-amber-500" />
        <circle cx="170" cy="92" r="2.2" className="fill-white" />
        <rect x="194" y="84" width="56" height="7" rx="3.5" className="fill-slate-300" />
        <rect x="194" y="97" width="36" height="5" rx="2.5" className="fill-slate-200" />
        <rect x="156" y="122" width="44" height="14" rx="7" className="fill-emerald-100" />
        <circle cx="166" cy="129" r="3" className="fill-emerald-500" />
        <rect x="208" y="127" width="44" height="5" rx="2.5" className="fill-slate-100" />
      </g>

      {/* Botón + */}
      <circle cx="262" cy="52" r="20" className="fill-amber-500" />
      <path d="M262 43v18M253 52h18" stroke="white" strokeWidth="3" strokeLinecap="round" />

      <circle cx="40" cy="36" r="4" className="fill-amber-200" />
      <circle cx="290" cy="124" r="3" className="fill-amber-300" />
      <circle cx="28" cy="158" r="3" className="fill-slate-200" />
    </svg>
  );
}

function EmptyStatePackages({ hasFilters, canCreate, onClearFilters, onRefresh, onCreate }) {
  if (hasFilters) {
    return (
      <div className="px-6 py-16 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400">
          <Search aria-hidden="true" className="h-6 w-6" />
        </span>
        <h3 className="mt-4 text-base font-semibold text-slate-900">Ningún paquete coincide con estos filtros</h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">Prueba con otra búsqueda o quita algunos filtros.</p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={onClearFilters} className={btnGhost}>
            <RotateCcw className="w-4 h-4" />Borrar todos los filtros
          </button>
          <button type="button" onClick={onCreate} disabled={!canCreate} className={btnPrimary}>
            <Plus className="w-4 h-4" />Crear paquete
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="px-6 py-14 text-center">
      <EmptyIllustrationPackages />
      <h3 className="mt-4 text-xl font-semibold text-slate-900">Aún no hay paquetes</h3>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500">
        Crea tu primer paquete de viaje como borrador y complétalo con servicios, precios y salidas antes de publicarlo.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={onCreate} disabled={!canCreate} className={btnPrimary}>
          <Plus className="w-4 h-4" />Crear primer paquete
        </button>
        <button type="button" onClick={onRefresh} className={btnGhost}>
          <RefreshCw className="w-4 h-4" />Actualizar
        </button>
      </div>
      <ol className="mx-auto mt-10 grid max-w-3xl gap-3 text-left sm:grid-cols-3">
        {[
          ['Crea el borrador', 'Título, destino y duración son lo único obligatorio.'],
          ['Añade servicios y precios', 'Hoteles, vuelos, actividades, salidas y tarifas en el editor.'],
          ['Publica cuando esté listo', 'Pasa el paquete a activo y público con un clic.'],
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
export default function AdminPackagesAndServicesPage() {
  const navigate = useNavigate();
  const {
    user,
    roles,
    rolePagePermissions,
    permissions = [],
    isSuperAdmin,
    loading: authLoading,
  } = useAuth();

  const canViewOffers = canUserAccessPath(roles, '/admin/packages', rolePagePermissions);
  const canCreateOffers = isSuperAdmin || permissions.includes('packages.create');
  const canUpdateOffers = isSuperAdmin || permissions.includes('packages.update') || canCreateOffers;

  const [packages, setPackages] = useState([]);
  const [counts, setCounts] = useState({});
  const [upcomingByOffer, setUpcomingByOffer] = useState({});
  const [nextDepartureByOffer, setNextDepartureByOffer] = useState({});
  const [destinationsByOffer, setDestinationsByOffer] = useState({});

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [visibilityFilter, setVisibilityFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newOffer, setNewOffer] = useState(createInitialOffer);
  const [formErrors, setFormErrors] = useState({});

  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);

  const categoryFilterOptions = useMemo(() => [{ value: 'ALL', label: 'Todas' }, ...CATEGORY_OPTIONS], []);

  /* ------------ Data loading ------------ */
  const loadData = useCallback(async () => {
    if (authLoading) return;
    if (!user || !canViewOffers) {
      setPackages([]);
      setCounts({});
      setUpcomingByOffer({});
      setNextDepartureByOffer({});
      setDestinationsByOffer({});
      setError(
        !user
          ? 'Inicia sesión con una cuenta autorizada para gestionar las ofertas.'
          : 'Tu cuenta no tiene el permiso packages.view.',
      );
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const offers = await getAdminPackages();
      setPackages(offers);

      if (!offers.length) {
        setCounts({});
        setUpcomingByOffer({});
        setNextDepartureByOffer({});
        setDestinationsByOffer({});
        return;
      }

      const offerIds = offers.map((o) => o.id);
      const today = new Date().toISOString().slice(0, 10);

      const [
        destinationsRes,
        accommodationsRes,
        transportsRes,
        activitiesRes,
        departuresRes,
      ] = await Promise.all([
        supabase
          .from('offer_destinations')
          .select('offer_id,destination_name,country,sort_order')
          .in('offer_id', offerIds)
          .order('sort_order', { ascending: true }),
        supabase.from('offer_accommodations').select('offer_id').in('offer_id', offerIds),
        supabase.from('offer_transports').select('offer_id,transport_type').in('offer_id', offerIds),
        supabase.from('offer_activities').select('offer_id').in('offer_id', offerIds),
        supabase
          .from('offer_departures')
          .select('offer_id,departure_date,max_capacity,reserved_capacity')
          .in('offer_id', offerIds)
          .gte('departure_date', today)
          .order('departure_date', { ascending: true }),
      ]);

      // Falla en el primer error para no mostrar contadores incorrectos en silencio
      for (const res of [destinationsRes, accommodationsRes, transportsRes, activitiesRes, departuresRes]) {
        if (res.error) throw res.error;
      }

      const nextCounts = {};
      const nextUpcoming = {};
      const nextNextDep = {};
      const nextDestinations = {};

      offerIds.forEach((id) => {
        nextCounts[id] = { hotels: 0, flights: 0, activities: 0 };
        nextUpcoming[id] = 0;
        nextDestinations[id] = [];
      });

      (destinationsRes.data || []).forEach((row) => {
        if (!nextDestinations[row.offer_id]) return;
        nextDestinations[row.offer_id].push({
          name: row.destination_name,
          country: row.country,
          sort_order: row.sort_order ?? 0,
        });
      });

      (accommodationsRes.data || []).forEach((row) => {
        if (nextCounts[row.offer_id]) nextCounts[row.offer_id].hotels += 1;
      });
      (transportsRes.data || []).forEach((row) => {
        if (nextCounts[row.offer_id] && row.transport_type?.toLowerCase() === 'flight') {
          nextCounts[row.offer_id].flights += 1;
        }
      });
      (activitiesRes.data || []).forEach((row) => {
        if (nextCounts[row.offer_id]) nextCounts[row.offer_id].activities += 1;
      });
      (departuresRes.data || []).forEach((row) => {
        if (!nextUpcoming[row.offer_id] && nextUpcoming[row.offer_id] !== 0) nextUpcoming[row.offer_id] = 0;
        nextUpcoming[row.offer_id] += 1;
        if (!nextNextDep[row.offer_id]) {
          const maxCapacity = row.max_capacity == null ? null : Number(row.max_capacity);
          const reservedCapacity = Number(row.reserved_capacity ?? 0);
          nextNextDep[row.offer_id] = {
            ...row,
            seats_available: Number.isFinite(maxCapacity)
              ? Math.max(0, maxCapacity - (Number.isFinite(reservedCapacity) ? reservedCapacity : 0))
              : null,
          };
        }
      });

      setCounts(nextCounts);
      setUpcomingByOffer(nextUpcoming);
      setNextDepartureByOffer(nextNextDep);
      setDestinationsByOffer(nextDestinations);
    } catch (loadError) {
      console.error('Error loading admin offers:', loadError);
      setError(`No se pudieron cargar las ofertas y sus contadores de configuración: ${loadError.message}`);
    } finally {
      setLoading(false);
    }
  }, [authLoading, canViewOffers, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!isModalOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !submitting) setIsModalOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isModalOpen, submitting]);

  /* ------------ KPIs ------------ */
  const kpis = useMemo(() => {
    const total = packages.length;
    const published = packages.filter(isLiveOffer).length;
    const draft = packages.filter((o) => o.status === 'draft').length;
    const upcoming = Object.values(upcomingByOffer).reduce((sum, n) => sum + n, 0);
    return { total, published, draft, upcoming };
  }, [packages, upcomingByOffer]);

  /* ------------ Filtering + pagination ------------ */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return packages.filter((offer) => {
      const haystack = [
        offer.reference,
        offer.public_title,
        offer.internal_title,
        offer.destination_country,
        offer.package_category,
        categoryLabel(offer.package_category),
        ...(destinationsByOffer[offer.id] || []).flatMap((d) => [d.name, d.country]),
      ]
        .filter(Boolean)
        .map((v) => String(v).toLowerCase());

      if (q && !haystack.some((v) => v.includes(q))) return false;
      if (statusFilter !== 'ALL' && offer.status !== statusFilter) return false;
      if (categoryFilter !== 'ALL' && offer.package_category !== categoryFilter) return false;
      if (visibilityFilter === 'public' && !isLiveOffer(offer)) return false;
      if (visibilityFilter === 'private' && isLiveOffer(offer)) return false;
      return true;
    });
  }, [packages, search, statusFilter, categoryFilter, visibilityFilter, destinationsByOffer]);

  const totalFiltered = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage],
  );

  useEffect(() => {
    setPage(1); // volver a la página 1 al cambiar los filtros
  }, [search, statusFilter, categoryFilter, visibilityFilter]);

  const hasFilters =
    Boolean(search) || statusFilter !== 'ALL' || categoryFilter !== 'ALL' || visibilityFilter !== 'ALL';

  function resetFilters() {
    setSearch('');
    setStatusFilter('ALL');
    setCategoryFilter('ALL');
    setVisibilityFilter('ALL');
  }

  /* ------------ Create ------------ */
  function openCreateModal() {
    setError('');
    setFormErrors({});
    setNewOffer(createInitialOffer());
    setIsModalOpen(true);
  }

  function validateOffer(o) {
    const errs = {};
    if (!o.internal_title.trim()) errs.internal_title = 'El título interno es obligatorio.';
    if (!o.public_title.trim()) errs.public_title = 'El título público es obligatorio.';
    if (!o.destination_country.trim()) errs.destination_country = 'El país es obligatorio.';
    if (!Number.isFinite(Number(o.duration_days)) || Number(o.duration_days) < 1) {
      errs.duration_days = 'Debe ser al menos 1 día.';
    }
    if (!Number.isFinite(Number(o.duration_nights)) || Number(o.duration_nights) < 0) {
      errs.duration_nights = 'Debe ser 0 o más.';
    }
    return errs;
  }

  async function handleCreateOffer(event) {
    event.preventDefault();
    if (!canCreateOffers) {
      setError('Tu cuenta no tiene el permiso packages.create necesario para crear ofertas.');
      return;
    }
    const errs = validateOffer(newOffer);
    setFormErrors(errs);
    if (Object.keys(errs).length) return;

    setSubmitting(true);
    setError('');
    let createdOffer = null;
    let destinationWarning = '';

    try {
      createdOffer = await saveAdminOffer({
        reference: newOffer.reference,
        internal_title: newOffer.internal_title.trim(),
        public_title: newOffer.public_title.trim(),
        package_category: newOffer.package_category.trim(),
        destination_country: newOffer.destination_country.trim(),
        duration_days: Number(newOffer.duration_days),
        duration_nights: Number(newOffer.duration_nights),
        short_description: newOffer.short_description.trim() || null,
        status: 'draft',
        is_public: false,
        created_by: user?.id || null,
      });

      if (newOffer.destination_city.trim()) {
        const { error: destErr } = await supabase.from('offer_destinations').insert({
          offer_id: createdOffer.id,
          destination_name: newOffer.destination_city.trim(),
          country: newOffer.destination_country.trim(),
          sort_order: 0,
        });
        if (destErr) {
          console.error('Offer created but main city could not be added:', destErr);
          destinationWarning = ` La oferta se creó, pero no se pudo guardar su ciudad: ${destErr.message}`;
        }
      }

      setIsModalOpen(false);
      setNewOffer(createInitialOffer());
      setFormErrors({});
      await loadData();
      setNotice({
        id: createdOffer.id,
        message: `Borrador creado correctamente.${destinationWarning}`,
      });
    } catch (createError) {
      console.error('Error creating draft offer:', createError);
      setError(`No se pudo crear la oferta: ${createError.message}`);
      // Si la oferta se creó pero falló un paso posterior, se muestra con claridad
      if (createdOffer) {
        setNotice({
          id: createdOffer.id,
          message: `Borrador creado, pero algunos detalles no se guardaron. ${createError.message}`,
        });
      }
    } finally {
      setSubmitting(false);
    }
  }

  /* ------------ Duplicate ------------ */
  async function handleDuplicate(offer) {
    if (!canCreateOffers || duplicatingId) return;
    setDuplicatingId(offer.id);
    setError('');

    try {
      // 1) Crear la nueva fila en borrador
      const newDraft = await saveAdminOffer({
        reference: generateReference(),
        internal_title: `${offer.internal_title || offer.public_title || 'Sin título'} (copia)`,
        public_title: `${offer.public_title || offer.internal_title || 'Sin título'} (copia)`,
        package_category: offer.package_category || 'Other',
        destination_country: offer.destination_country || '',
        duration_days: Number(offer.duration_days) || 1,
        duration_nights: Number(offer.duration_nights) || 0,
        short_description: offer.short_description || null,
        starting_price: offer.starting_price ?? null,
        default_currency: offer.default_currency || 'MAD',
        status: 'draft',
        is_public: false,
        created_by: user?.id || null,
      });

      // 2) Copiar los registros de configuración relacionados.
      //    Cada bloque está aislado para informar de un fallo parcial en lugar de ocultarlo.
      const childErrors = [];

      async function copyTable(table, columns) {
        const { data, error: fetchErr } = await supabase
          .from(table)
          .select(['offer_id', ...columns].join(','))
          .eq('offer_id', offer.id);
        if (fetchErr) throw fetchErr;
        if (!data || !data.length) return;
        const rows = data.map((row) => {
          const { offer_id, ...rest } = row;
          return { offer_id: newDraft.id, ...rest };
        });
        const { error: insertErr } = await supabase.from(table).insert(rows);
        if (insertErr) throw insertErr;
      }

      const tablesToCopy = [
        ['offer_destinations', ['destination_name', 'country', 'city', 'nights', 'sort_order', 'notes']],
        ['offer_accommodations', ['hotel_name', 'hotel_category', 'room_type', 'meal_plan', 'nights', 'sort_order']],
        ['offer_transports', ['transport_type', 'provider', 'origin', 'destination', 'sort_order']],
        ['offer_activities', ['activity_name', 'activity_type', 'day_number', 'duration_minutes', 'sort_order']],
        ['offer_inclusions', ['label', 'sort_order']],
        ['offer_exclusions', ['label', 'sort_order']],
      ];

      for (const [table, columns] of tablesToCopy) {
        try {
          await copyTable(table, columns);
        } catch (copyErr) {
          childErrors.push(`${table}: ${copyErr.message}`);
        }
      }

      // Configuración de la landing page, si el esquema usa `offer_landing_pages` (relación 1:1).
      // Se protege con try porque la tabla puede no existir.
      try {
        const { data: landing } = await supabase
          .from('offer_landing_pages')
          .select('*')
          .eq('offer_id', offer.id)
          .maybeSingle();
        if (landing) {
          const { id, offer_id, created_at, updated_at, ...rest } = landing;
          await supabase.from('offer_landing_pages').insert({ offer_id: newDraft.id, ...rest });
        }
      } catch {
        // La tabla de landing pages es opcional: no se falla la duplicación por ella.
      }

      await loadData();

      if (childErrors.length) {
        setNotice({
          id: newDraft.id,
          message: `Borrador duplicado, pero algunas secciones no se pudieron copiar: ${childErrors
            .slice(0, 2)
            .join('; ')}${childErrors.length > 2 ? '…' : ''}. Revísalas y vuelve a añadirlas en el editor.`,
        });
      } else {
        setNotice({
          id: newDraft.id,
          message: 'Oferta duplicada como borrador. Sigue editando para revisar la copia.',
        });
      }
    } catch (dupErr) {
      console.error('Duplicate failed:', dupErr);
      setError(`No se pudo duplicar la oferta: ${dupErr.message}`);
    } finally {
      setDuplicatingId(null);
    }
  }

  /* ------------ Publish / Unpublish ------------ */
  async function handlePublishToggle(offer) {
    if (!canUpdateOffers) return;
    const live = isLiveOffer(offer);
    const payload = live
      ? { status: 'inactive', is_public: false }
      : { status: 'active', is_public: true };

    try {
      await saveAdminOffer({ id: offer.id, ...payload });
      await loadData();
      setNotice({
        id: offer.id,
        message: live ? 'Oferta despublicada.' : 'Oferta publicada.',
      });
    } catch (pubErr) {
      console.error('Publish toggle failed:', pubErr);
      setError(`No se pudo actualizar el estado de publicación: ${pubErr.message}`);
    }
  }

  /* ------------ Archive ------------ */
  async function handleArchive(offer) {
    if (!canUpdateOffers) return;
    try {
      await saveAdminOffer({ id: offer.id, status: 'archived', is_public: false });
      await loadData();
      setNotice({ id: offer.id, message: 'Oferta archivada.' });
    } catch (archErr) {
      console.error('Archive failed:', archErr);
      setError(`No se pudo archivar la oferta: ${archErr.message}`);
    }
  }

  /* ------------ CSV export (client-side) ------------ */
  function handleExportCsv() {
    if (!filtered.length) return;
    // Las columnas se mantienen en inglés para que el archivo siga siendo apto para importar en otros sistemas.
    const header = [
      'reference',
      'internal_title',
      'public_title',
      'category',
      'country',
      'destinations',
      'duration_days',
      'duration_nights',
      'hotels',
      'flights',
      'activities',
      'upcoming_departures',
      'starting_price',
      'currency',
      'status',
      'public',
      'updated_at',
    ];
    const escape = (v) => {
      if (v == null) return '';
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [header.join(',')];
    filtered.forEach((o) => {
      const cfg = counts[o.id] || {};
      const dests = (destinationsByOffer[o.id] || []).map((d) => d.name).filter(Boolean).join(' | ');
      lines.push(
        [
          o.reference,
          o.internal_title,
          o.public_title,
          o.package_category,
          o.destination_country,
          dests,
          o.duration_days,
          o.duration_nights,
          cfg.hotels || 0,
          cfg.flights || 0,
          cfg.activities || 0,
          upcomingByOffer[o.id] || 0,
          o.starting_price ?? '',
          o.default_currency ?? 'MAD',
          o.status,
          isLiveOffer(o) ? 'yes' : 'no',
          o.updated_at,
        ]
          .map(escape)
          .join(','),
      );
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `packages-export-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /* ------------ Guards ------------ */
  if (authLoading) {
    return (
      <main className="min-h-screen bg-stone-50 flex items-center justify-center gap-3 text-sm text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin text-amber-600" />{translate('Comprobando el acceso de la cuenta…')}
      </main>
    );
  }

  if (!user || !canViewOffers) {
    return (
      <main className="min-h-screen bg-stone-50 p-6 lg:p-8">
        <div role="alert" className="mx-auto max-w-xl rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900 flex items-start gap-3">
          <Lock className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <p className="font-medium">
              {!user
                ? 'Inicia sesión con una cuenta autorizada para gestionar las ofertas.'
                : 'Tu cuenta no tiene el permiso packages.view.'}
            </p>
            {!user && (
              <button type="button" onClick={() => navigate('/auth/admin-login')} className={`${btnPrimary} mt-4`}>
                {translate('Iniciar sesión')}
              </button>
            )}
          </div>
        </div>
      </main>
    );
  }

  const statCards = [
    { label: 'Total de paquetes', value: kpis.total, icon: Layers, tone: 'text-slate-900', chip: 'bg-slate-100 text-slate-600' },
    { label: 'Publicados', value: kpis.published, icon: Globe, tone: 'text-emerald-600', chip: 'bg-emerald-50 text-emerald-600', hint: 'Visibles en el sitio público' },
    { label: 'Borradores', value: kpis.draft, icon: Edit, tone: 'text-slate-900', chip: 'bg-amber-50 text-amber-600', hint: 'Pendientes de completar' },
    { label: 'Salidas próximas', value: kpis.upcoming, icon: CalendarDays, tone: 'text-slate-900', chip: 'bg-sky-50 text-sky-600', hint: 'En todos los paquetes' },
  ];

  /* ---------- Render ---------- */
  return (
    <main className="min-h-screen bg-stone-50">
      <style>{`
        @keyframes rp-pop { from { opacity: 0; transform: translateY(6px) scale(.98); } to { opacity: 1; transform: none; } }
        .rp-pop { animation: rp-pop .16s ease-out; }
        @media (prefers-reduced-motion: reduce) { .rp-pop { animation-duration: 1ms; } }
      `}</style>

      <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">{translate('Paquetes y servicios')}</h1>
            <p className="text-sm text-slate-500 mt-1">{translate('Crea borradores de paquetes, completa sus servicios y precios, y publícalos cuando estén listos.')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={handleExportCsv} disabled={!filtered.length} className={btnGhost}>
              <Download className="w-4 h-4 text-slate-500" />{translate('Exportar CSV')}
            </button>
            <button type="button" onClick={loadData} className={btnGhost} title="Actualizar registros">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />{translate('Actualizar')}
            </button>
            <button type="button" disabled={!canCreateOffers} onClick={openCreateModal} className={btnPrimary}>
              <Plus className="w-4 h-4" />{translate('Crear paquete')}
            </button>
          </div>
        </header>

        {/* Banners */}
        {!canCreateOffers && (
          <div role="status" className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900">
            Puedes ver las ofertas, pero crear nuevas requiere el permiso{' '}
            <code className="rounded bg-amber-100 px-1">packages.create</code>.
          </div>
        )}
        {notice && (
          <div role="status" className="px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-emerald-800 text-sm rp-pop">
            <span className="flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              {notice.message}
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(`/admin/packages-services/${notice.id}`)}
                className="font-semibold underline underline-offset-2"
              >{translate('Seguir editando')}</button>
              <button type="button" onClick={() => setNotice(null)} className="p-1 hover:bg-emerald-100 rounded" aria-label="Descartar aviso">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
        {error && !isModalOpen && (
          <div role="alert" className="px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800 text-sm rp-pop">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="flex-1">{error}</span>
            <button type="button" onClick={() => setError('')} className="p-1 hover:bg-rose-100 rounded" aria-label="Descartar error">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Stats */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(({ label, value, icon: Icon, tone, chip, hint }) => (
            <div key={label} className="bg-white p-5 rounded-xl border border-slate-200/80 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-slate-500">{label}</p>
                <p className={`text-2xl font-semibold mt-1 truncate ${tone}`}>{value}</p>
                {hint && <p className="text-xs text-slate-400 mt-0.5 truncate">{hint}</p>}
              </div>
              <span className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${chip}`}>
                <Icon className="w-5 h-5" />
              </span>
            </div>
          ))}
        </section>

        {/* Table card with toolbar */}
        <section className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
          <div className="p-4 border-b border-slate-100 space-y-3">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por título, referencia, país o ciudad"
                  aria-label="Buscar paquetes"
                  className={`${inputCls} pl-9 ${search ? 'pr-9' : ''}`}
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label="Borrar búsqueda"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <Select className="lg:w-52" prefix="Estado" ariaLabel="Filtro de estado" value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
              <Select className="lg:w-60" prefix="Categoría" ariaLabel="Filtro de categoría" value={categoryFilter} onChange={setCategoryFilter} options={categoryFilterOptions} menuMinWidth={240} />
              <Select className="lg:w-56" prefix="Visibilidad" ariaLabel="Filtro de visibilidad" value={visibilityFilter} onChange={setVisibilityFilter} options={VISIBILITY_OPTIONS} />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{totalFiltered} de {packages.length} paquetes</span>
              {hasFilters && (
                <button type="button" onClick={resetFilters} className="font-medium text-amber-700 hover:text-amber-800 underline underline-offset-2">
                  {translate('Borrar filtros')}
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1280px]">
              <thead>
                <tr className="bg-stone-50 border-b border-slate-100 text-xs font-medium text-slate-500">
                  <th className="py-3 px-4">{translate('Paquete / Referencia')}</th>
                  <th className="py-3 px-4">{translate('Destino')}</th>
                  <th className="py-3 px-4">{translate('Categoría')}</th>
                  <th className="py-3 px-4">{translate('Duración')}</th>
                  <th className="py-3 px-4">{translate('Configuración')}</th>
                  <th className="py-3 px-4">{translate('Precio desde')}</th>
                  <th className="py-3 px-4">{translate('Próxima salida')}</th>
                  <th className="py-3 px-4">{translate('Estado')}</th>
                  <th className="py-3 px-4">{translate('Visibilidad')}</th>
                  <th className="py-3 px-4">{translate('Actualizado')}</th>
                  <th className="py-3 px-4 text-right">{translate('Acciones')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={11} className="py-16 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-600" />{translate('Cargando paquetes…')}
                    </td>
                  </tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={11}>
                      <EmptyStatePackages
                        hasFilters={hasFilters}
                        canCreate={canCreateOffers}
                        onClearFilters={resetFilters}
                        onRefresh={loadData}
                        onCreate={openCreateModal}
                      />
                    </td>
                  </tr>
                ) : (
                  pageRows.map((offer) => {
                    const cfg = counts[offer.id] || {};
                    const dests = destinationsByOffer[offer.id] || [];
                    const primaryDest = dests[0]?.name || offer.destination_country || '—';
                    const extraDest = dests.length > 1 ? `+${dests.length - 1} más` : null;
                    const nextDep = nextDepartureByOffer[offer.id];
                    const goEdit = () => navigate(`/admin/packages-services/${offer.id}`);
                    return (
                      <tr
                        key={offer.id}
                        tabIndex={0}
                        onClick={goEdit}
                        onKeyDown={(e) => { if (e.key === 'Enter') goEdit(); }}
                        className="group cursor-pointer hover:bg-amber-50/40 focus:outline-none focus-visible:bg-amber-50/60 transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <p className="font-medium text-slate-900">
                            {offer.public_title || offer.internal_title || 'Paquete sin título'}
                          </p>
                          <p className="font-mono text-xs text-amber-700">{offer.reference}</p>
                          {offer.internal_title && offer.public_title && offer.internal_title !== offer.public_title && (
                            <p className="mt-0.5 max-w-[260px] truncate text-xs text-slate-400">
                              Interno: {offer.internal_title}
                            </p>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-start gap-1.5">
                            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <div>
                              <p className="text-slate-800">{primaryDest}</p>
                              <p className="text-xs text-slate-400">
                                {offer.destination_country || '—'}
                                {extraDest && ` · ${extraDest}`}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center rounded-md bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
                            {categoryLabel(offer.package_category)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                          {offer.duration_days ?? '—'} días / {offer.duration_nights ?? '—'} noches
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1">
                            <ConfigIndicator icon={Building2} count={cfg.hotels || 0} label="Hoteles" />
                            <ConfigIndicator icon={Plane} count={cfg.flights || 0} label="Vuelos" />
                            <ConfigIndicator icon={Activity} count={cfg.activities || 0} label="Actividades" />
                          </div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap font-semibold text-slate-900">
                          {formatCurrency(offer.starting_price, offer.default_currency)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {nextDep ? (
                            <div>
                              <p className="text-slate-800">{formatDate(nextDep.departure_date)}</p>
                              <p className="text-xs text-slate-400">
                                {upcomingByOffer[offer.id] || 0} {(upcomingByOffer[offer.id] || 0) === 1 ? 'próxima' : 'próximas'}
                                {nextDep.seats_available != null && ` · ${nextDep.seats_available} plazas`}
                              </p>
                            </div>
                          ) : (
                            <span className="text-slate-400">{translate('Sin salidas')}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4"><StatusBadge status={offer.status} /></td>
                        <td className="py-3.5 px-4"><VisibilityBadge isPublic={offer.is_public} status={offer.status} /></td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-500">
                          {formatDate(offer.updated_at || offer.created_at)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <RowActions
                              offer={offer}
                              canCreate={canCreateOffers}
                              canUpdate={canUpdateOffers}
                              duplicating={duplicatingId === offer.id}
                              onDuplicate={handleDuplicate}
                              onPublishToggle={handlePublishToggle}
                              onArchive={handleArchive}
                            />
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

          {/* Pagination */}
          {totalFiltered > PAGE_SIZE && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-600">
              <span>
                Mostrando {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, totalFiltered)} de {totalFiltered}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className={`${btnGhost} !px-2.5 !py-1.5 !text-xs`}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />{translate('Anterior')}
                </button>
                <span className="px-1">Página {safePage} de {totalPages}</span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className={`${btnGhost} !px-2.5 !py-1.5 !text-xs`}
                >
                  {translate('Siguiente')}<ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* ================= CREAR PAQUETE EN BORRADOR ================= */}
      {isModalOpen && (
        <Modal onClose={() => !submitting && setIsModalOpen(false)}>
          <ModalHeader
            title="Crear paquete en borrador"
            subtitle="Añade lo esencial ahora; los servicios y precios se configuran en el editor."
            onClose={() => setIsModalOpen(false)}
          />
          <form onSubmit={handleCreateOffer} noValidate className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            <div className="space-y-3">
              <SectionTitle icon={Package}>{translate('Información básica')}</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls} htmlFor="pkg-internal-title">{translate('Título interno *')}</label>
                  <input
                    id="pkg-internal-title"
                    type="text"
                    required
                    value={newOffer.internal_title}
                    onChange={(e) => setNewOffer({ ...newOffer, internal_title: e.target.value })}
                    className={inputCls}
                  />
                  <FieldError>{formErrors.internal_title}</FieldError>
                </div>
                <div>
                  <label className={labelCls} htmlFor="pkg-public-title">{translate('Título público *')}</label>
                  <input
                    id="pkg-public-title"
                    type="text"
                    required
                    value={newOffer.public_title}
                    onChange={(e) => setNewOffer({ ...newOffer, public_title: e.target.value })}
                    className={inputCls}
                  />
                  <FieldError>{formErrors.public_title}</FieldError>
                </div>
                <div>
                  <label className={labelCls} htmlFor="pkg-reference">{translate('Referencia (se genera automáticamente)')}</label>
                  <input
                    id="pkg-reference"
                    readOnly
                    value={newOffer.reference}
                    className={`${inputCls} bg-slate-50 font-mono text-slate-500`}
                  />
                </div>
                <div>
                  <label className={labelCls}>{translate('Categoría del paquete')}</label>
                  <Select
                    value={newOffer.package_category}
                    onChange={(v) => setNewOffer({ ...newOffer, package_category: v })}
                    options={CATEGORY_OPTIONS}
                    ariaLabel="Categoría del paquete"
                    menuMinWidth={240}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-5 border-t border-slate-100">
              <SectionTitle icon={MapPin}>{translate('Destino y duración')}</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls} htmlFor="pkg-country">{translate('País de destino *')}</label>
                  <input
                    id="pkg-country"
                    type="text"
                    required
                    autoComplete="country-name"
                    placeholder="Marruecos, Francia"
                    value={newOffer.destination_country}
                    onChange={(e) => setNewOffer({ ...newOffer, destination_country: e.target.value })}
                    className={inputCls}
                  />
                  <FieldError>{formErrors.destination_country}</FieldError>
                </div>
                <div>
                  <label className={labelCls} htmlFor="pkg-city">{translate('Ciudad principal de destino (opcional)')}</label>
                  <input
                    id="pkg-city"
                    type="text"
                    placeholder="Marrakech, París"
                    value={newOffer.destination_city}
                    onChange={(e) => setNewOffer({ ...newOffer, destination_city: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor="pkg-days">{translate('Duración en días *')}</label>
                  <input
                    id="pkg-days"
                    type="number"
                    min="1"
                    required
                    value={newOffer.duration_days}
                    onChange={(e) => setNewOffer({ ...newOffer, duration_days: e.target.value })}
                    className={inputCls}
                  />
                  <FieldError>{formErrors.duration_days}</FieldError>
                </div>
                <div>
                  <label className={labelCls} htmlFor="pkg-nights">{translate('Duración en noches *')}</label>
                  <input
                    id="pkg-nights"
                    type="number"
                    min="0"
                    required
                    value={newOffer.duration_nights}
                    onChange={(e) => setNewOffer({ ...newOffer, duration_nights: e.target.value })}
                    className={inputCls}
                  />
                  <FieldError>{formErrors.duration_nights}</FieldError>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-5 border-t border-slate-100">
              <SectionTitle icon={Edit}>{translate('Descripción')}</SectionTitle>
              <div>
                <label className={labelCls} htmlFor="pkg-description">{translate('Descripción breve (opcional)')}</label>
                <textarea
                  id="pkg-description"
                  rows="3"
                  placeholder="Resume en una o dos frases lo que incluye este paquete"
                  value={newOffer.short_description}
                  onChange={(e) => setNewOffer({ ...newOffer, short_description: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>

            {error && (
              <div role="alert" className="px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800 text-sm">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="flex-1">{error}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-100">
              <button type="button" onClick={() => setIsModalOpen(false)} disabled={submitting} className={btnGhost}>{translate('Cancelar')}</button>
              <button type="submit" disabled={submitting} className={btnPrimary}>
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitting ? 'Creando borrador…' : 'Crear paquete en borrador'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </main>
  );
}