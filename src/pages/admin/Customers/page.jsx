import { useAppSettings, translate } from '@/context/index.jsx';
import React, { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Users, Search, Plus, Phone, Mail, Tag as TagIcon, DollarSign, RefreshCw, X,
  CheckCircle2, AlertTriangle, FileText, Copy, Check, ChevronDown, ChevronRight, Wallet, UserRound, Trash2,
  RotateCcw,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '../../../context/index.jsx';

/* ---------- Shared style tokens ---------- */
const inputCls =
  'w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition';
const labelCls = 'block text-xs font-medium text-slate-600 mb-1.5';
const btnGhost =
  'inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition';
const btnPrimary =
  'inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-500 shadow-sm transition disabled:opacity-50';

const CUSTOMER_STATUS = {
  active: { label: 'Activo', dot: 'bg-emerald-500', cls: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  inactive: { label: 'Inactivo', dot: 'bg-amber-500', cls: 'bg-amber-50 text-amber-800 ring-amber-200' },
  archived: { label: 'Archivado', dot: 'bg-slate-400', cls: 'bg-slate-100 text-slate-600 ring-slate-200' },
};
const STATUS_OPTIONS = Object.entries(CUSTOMER_STATUS).map(([value, v]) => ({ value, label: v.label, dot: v.dot }));
const CREATE_STATUS_OPTIONS = STATUS_OPTIONS.filter((o) => o.value !== 'archived');
const LANGUAGE_OPTIONS = [
  { value: 'fr', label: 'Francés', hint: 'fr' },
  { value: 'en', label: 'Inglés', hint: 'en' },
  { value: 'ar', label: 'Árabe', hint: 'ar' },
  { value: 'es', label: 'Español', hint: 'es' },
];
const SOURCE_OPTIONS = [
  { value: 'direct', label: 'Directo' },
  { value: 'website', label: 'Sitio web' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'referral', label: 'Referido' },
  { value: 'walk_in', label: 'Presencial' },
  { value: 'other', label: 'Otro' },
];
const GENDER_OPTIONS = [
  { value: '', label: 'Sin especificar' },
  { value: 'female', label: 'Femenino' },
  { value: 'male', label: 'Masculino' },
  { value: 'other', label: 'Otro' },
];
const TAG_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b'];

const EMPTY_FORM = {
  first_name: '', last_name: '', email: '', phone: '', alternative_phone: '', date_of_birth: '',
  nationality: '', gender: '', country: '', city: '', address: '', preferred_language: 'fr',
  customer_source: 'direct', customer_status: 'active', notes: '',
};
const EMPTY_TAG = { name: '', color: TAG_COLORS[0], description: '' };

const fmtMoney = (n) => Number(n || 0).toLocaleString('es-ES', { maximumFractionDigits: 2 });
const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('') || '?';

const getBookingDocumentPath = (fileUrl) => {
  const marker = '/booking-documents/';
  const markerIndex = fileUrl?.indexOf(marker) ?? -1;
  if (markerIndex < 0) return null;

  const encodedPath = fileUrl.slice(markerIndex + marker.length).split('?')[0];
  try {
    return decodeURIComponent(encodedPath);
  } catch {
    return encodedPath;
  }
};

/* ---------- Small presentational pieces ---------- */
function StatusBadge({ status }) {
  const s = CUSTOMER_STATUS[status] || { label: status || 'Desconocido', dot: 'bg-slate-400', cls: 'bg-slate-50 text-slate-700 ring-slate-200' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${s.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
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

function TagChip({ tag }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-white ring-1 ring-inset ring-slate-200 text-slate-700">
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color || '#3b82f6' }} />
      {tag.name}
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
      case 'Escape': e.preventDefault(); e.stopPropagation(); close(); break;
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

/* ---------- Empty state graphics ---------- */
function EmptyIllustrationCustomers() {
  return (
    <svg viewBox="0 0 320 200" className="mx-auto h-40 w-auto" role="img" aria-label="Ilustración de clientes">
      <ellipse cx="160" cy="184" rx="110" ry="8" className="fill-slate-100" />
      <g transform="rotate(-4 100 100)">
        <rect x="38" y="52" width="120" height="78" rx="12" className="fill-white stroke-slate-200" strokeWidth="2" />
        <circle cx="66" cy="78" r="12" className="fill-slate-100" />
        <rect x="86" y="70" width="52" height="6" rx="3" className="fill-slate-200" />
        <rect x="86" y="82" width="34" height="5" rx="2.5" className="fill-slate-100" />
        <rect x="52" y="106" width="80" height="5" rx="2.5" className="fill-slate-100" />
      </g>
      <g transform="rotate(4 200 100)">
        <rect x="140" y="62" width="130" height="86" rx="12" className="fill-white stroke-amber-300" strokeWidth="2" />
        <circle cx="170" cy="86" r="14" className="fill-amber-100" />
        <circle cx="170" cy="82" r="5" className="fill-amber-500" />
        <path d="M162 92c2-4 6-6 8-6s6 2 8 6" className="fill-amber-500" />
        <rect x="196" y="78" width="56" height="7" rx="3.5" className="fill-slate-300" />
        <rect x="196" y="91" width="36" height="5" rx="2.5" className="fill-slate-200" />
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

function EmptyStateCustomers({ hasFilters, onClearFilters, onCreate }) {
  if (hasFilters) {
    return (
      <div className="px-6 py-16 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400">
          <Search aria-hidden="true" className="h-6 w-6" />
        </span>
        <h3 className="mt-4 text-base font-semibold text-slate-900">Ningún cliente coincide con estos filtros</h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">Prueba con otra búsqueda o quita algunos filtros.</p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={onClearFilters} className={btnGhost}>
            <RotateCcw className="w-4 h-4" />Borrar todos los filtros
          </button>
          <button type="button" onClick={onCreate} className={btnPrimary}>
            <Plus className="w-4 h-4" />Nuevo cliente
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="px-6 py-14 text-center">
      <EmptyIllustrationCustomers />
      <h3 className="mt-4 text-xl font-semibold text-slate-900">Aún no hay clientes</h3>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500">
        Empieza a construir tu base de clientes. Añade el primero o importa una lista existente.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={onCreate} className={btnPrimary}>
          <Plus className="w-4 h-4" />Añadir primer cliente
        </button>
        <button type="button" onClick={onClearFilters} className={btnGhost}>
          <RefreshCw className="w-4 h-4" />Actualizar
        </button>
      </div>
      <ol className="mx-auto mt-10 grid max-w-3xl gap-3 text-left sm:grid-cols-3">
        {[
          ['Crea el perfil', 'Nombre y teléfono son lo único obligatorio.'],
          ['Asigna etiquetas', 'Agrupa clientes por tipo, país o valor.'],
          ['Consulta su historial', 'Reservas, pagos y saldo pendiente en un vistazo.'],
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
export default function CustomersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [tags, setTags] = useState([]);
  const [tagAssignments, setTagAssignments] = useState([]);
  const [bookingSummaries, setBookingSummaries] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [tagFilter, setTagFilter] = useState('ALL');
  const [countryFilter, setCountryFilter] = useState('ALL');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isTagsModalOpen, setIsTagsModalOpen] = useState(false);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [newTagData, setNewTagData] = useState(EMPTY_TAG);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [deletingCustomerId, setDeletingCustomerId] = useState(null);

  const flash = (msg, ms = 4000) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), ms);
  };
  const setField = (key) => (e) => setFormData((p) => ({ ...p, [key]: e.target.value }));
  const setSelect = (key) => (v) => setFormData((p) => ({ ...p, [key]: v }));

  /* ----- Data ----- */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [customersRes, tagsRes, assignmentsRes, summaryRes] = await Promise.all([
        supabase.from('customers').select('*').order('created_at', { ascending: false }),
        supabase.from('customer_tags').select('*').order('name', { ascending: true }),
        supabase.from('customer_tag_assignments').select('*'),
        supabase.from('customer_booking_summary').select('*'),
      ]);
      if (customersRes.error) throw customersRes.error;

      setCustomers(customersRes.data || []);
      setTags(tagsRes.error ? [] : tagsRes.data || []);
      setTagAssignments(assignmentsRes.error ? [] : assignmentsRes.data || []);
      setBookingSummaries(summaryRes.error ? [] : summaryRes.data || []);
    } catch (err) {
      console.error('Error fetching CRM data:', err);
      setError('No se pudieron cargar los clientes. Comprueba que la migración 0003_customers_crm esté aplicada.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (isCreateModalOpen) setIsCreateModalOpen(false);
      else if (isTagsModalOpen) setIsTagsModalOpen(false);
      else if (isSqlModalOpen) setIsSqlModalOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isCreateModalOpen, isTagsModalOpen, isSqlModalOpen]);

  const enrichedCustomers = useMemo(() => {
    return customers.map((c) => {
      const summary = bookingSummaries.find((s) => s.customer_id === c.id) || {
        total_bookings: 0, confirmed_bookings: 0, total_booking_value: 0, total_paid: 0, outstanding_balance: 0,
      };
      const assignedTagIds = tagAssignments.filter((ta) => ta.customer_id === c.id).map((ta) => ta.tag_id);
      const customerTags = tags.filter((t) => assignedTagIds.includes(t.id));
      return { ...c, summary, customerTags };
    });
  }, [customers, tags, tagAssignments, bookingSummaries]);

  const stats = useMemo(() => ({
    total: enrichedCustomers.length,
    active: enrichedCustomers.filter((c) => c.customer_status === 'active').length,
    value: enrichedCustomers.reduce((sum, c) => sum + Number(c.summary.total_booking_value || 0), 0),
    outstanding: enrichedCustomers.reduce((sum, c) => sum + Number(c.summary.outstanding_balance || 0), 0),
  }), [enrichedCustomers]);

  const uniqueCountries = useMemo(
    () => Array.from(new Set(enrichedCustomers.map((c) => c.country).filter(Boolean))),
    [enrichedCustomers]
  );

  const tagOptions = useMemo(
    () => [{ value: 'ALL', label: 'Todas' }, ...tags.map((t) => ({ value: t.id, label: t.name, color: t.color || '#3b82f6' }))],
    [tags]
  );
  const countryOptions = useMemo(
    () => [{ value: 'ALL', label: 'Todos' }, ...uniqueCountries.map((c) => ({ value: c, label: c }))],
    [uniqueCountries]
  );

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return enrichedCustomers.filter((c) => {
      const matchesSearch =
        !q ||
        c.customer_reference?.toLowerCase().includes(q) ||
        c.full_name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(searchQuery) ||
        c.city?.toLowerCase().includes(q);
      return (
        matchesSearch &&
        (statusFilter === 'ALL' || c.customer_status === statusFilter) &&
        (countryFilter === 'ALL' || c.country === countryFilter) &&
        (tagFilter === 'ALL' || c.customerTags.some((t) => t.id === tagFilter))
      );
    });
  }, [enrichedCustomers, searchQuery, statusFilter, countryFilter, tagFilter]);

  const hasFilters = searchQuery || statusFilter !== 'ALL' || countryFilter !== 'ALL' || tagFilter !== 'ALL';
  const clearFilters = () => { setSearchQuery(''); setStatusFilter('ALL'); setCountryFilter('ALL'); setTagFilter('ALL'); };

  /* ----- Actions ----- */
  const openCreateModal = () => {
    setFormData(EMPTY_FORM);
    setError(null);
    setIsCreateModalOpen(true);
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!formData.first_name.trim() || !formData.last_name.trim() || !formData.phone.trim()) {
      setError('El nombre, los apellidos y el teléfono son obligatorios.');
      return;
    }
    try {
      setFormSubmitting(true);
      setError(null);

      const { error: insertError } = await supabase.from('customers').insert([{
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        full_name: `${formData.first_name.trim()} ${formData.last_name.trim()}`,
        email: formData.email ? formData.email.trim() : null,
        phone: formData.phone.trim(),
        alternative_phone: formData.alternative_phone || null,
        date_of_birth: formData.date_of_birth || null,
        nationality: formData.nationality || null,
        gender: formData.gender || null,
        country: formData.country || null,
        city: formData.city || null,
        address: formData.address || null,
        preferred_language: formData.preferred_language || 'fr',
        customer_source: formData.customer_source || null,
        customer_status: formData.customer_status || 'active',
        notes: formData.notes || null,
        created_by: user?.id,
      }]);
      if (insertError) throw insertError;

      flash('Cliente creado.');
      setIsCreateModalOpen(false);
      setFormData(EMPTY_FORM);
      await fetchData();
    } catch (err) {
      console.error('Error creating customer:', err);
      setError('No se pudo crear el cliente: ' + (err.message || 'Error desconocido'));
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteCustomer = async (customer) => {
    const customerName = customer.full_name || 'este cliente';
    const confirmed = window.confirm(
      `¿Eliminar permanentemente a ${customerName} y todas sus reservas, contratos, pagos y documentos? ` +
      'Los gastos vinculados se conservarán, pero se desvincularán de sus reservas. Esta acción no se puede deshacer.'
    );
    if (!confirmed) return;
    if (window.prompt(`Escribe ELIMINAR ${customerName} para confirmar.`) !== `ELIMINAR ${customerName}`) return;

    try {
      setDeletingCustomerId(customer.id);
      setError(null);
      const { data, error: deleteError } = await supabase.rpc('delete_customer_with_history', {
        p_customer_id: customer.id,
      });
      if (deleteError) throw deleteError;

      const documentUrls = data?.booking_document_urls || [];
      const documentPaths = documentUrls
        .map(getBookingDocumentPath)
        .filter(Boolean);
      const storageCleanupIssues = [];
      if (documentPaths.length < documentUrls.length) {
        storageCleanupIssues.push(`${documentUrls.length - documentPaths.length} documento(s) con ruta no reconocida`);
      }
      if (documentPaths.length > 0) {
        const { error } = await supabase.storage.from('booking-documents').remove(documentPaths);
        if (error) storageCleanupIssues.push(error.message);
      }

      setCustomers((current) => current.filter((item) => item.id !== customer.id));
      setTagAssignments((current) => current.filter((item) => item.customer_id !== customer.id));
      setBookingSummaries((current) => current.filter((item) => item.customer_id !== customer.id));
      if (storageCleanupIssues.length > 0) {
        console.error('Customer history deleted, but some booking document files could not be removed:', storageCleanupIssues);
        setError(
          `Cliente e historial eliminados, pero la limpieza de archivos quedó incompleta: ${storageCleanupIssues.join('; ')}.` +
          (documentPaths.length > 0 ? ` Rutas para limpieza manual: ${documentPaths.join(', ')}` : '')
        );
      } else {
        flash('Cliente, reservas, contratos, pagos y documentos eliminados. Los gastos se conservaron sin reserva vinculada.');
      }
    } catch (deleteError) {
      console.error('Error deleting customer:', deleteError);
      setError('No se pudo eliminar el cliente: ' + (deleteError.message || 'Error desconocido'));
    } finally {
      setDeletingCustomerId(null);
    }
  };

  const handleCreateTag = async (e) => {
    e.preventDefault();
    if (!newTagData.name.trim()) return;
    try {
      setFormSubmitting(true);
      setError(null);
      const { error: tagError } = await supabase.from('customer_tags').insert([{
        name: newTagData.name.trim(),
        color: newTagData.color,
        description: newTagData.description.trim() || null,
      }]);
      if (tagError) throw tagError;

      flash('Etiqueta creada.', 3000);
      setNewTagData(EMPTY_TAG);
      await fetchData();
    } catch (err) {
      console.error('Error creating tag:', err);
      setError('No se pudo crear la etiqueta: ' + err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const sqlMigrationCode = `-- ============================================================================
-- Migration: 0003_customers_crm
-- Description: Customers / CRM module full schema
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE SEQUENCE IF NOT EXISTS public.customer_ref_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_customer_reference()
RETURNS TEXT LANGUAGE sql VOLATILE AS $$
    SELECT 'CUS-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('public.customer_ref_seq')::TEXT, 6, '0');
$$;

CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_reference TEXT UNIQUE NOT NULL DEFAULT public.generate_customer_reference(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    alternative_phone TEXT,
    date_of_birth DATE,
    nationality TEXT,
    gender TEXT,
    country TEXT,
    city TEXT,
    address TEXT,
    preferred_language TEXT DEFAULT 'fr',
    customer_source TEXT,
    customer_status TEXT NOT NULL DEFAULT 'active',
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.customer_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    color TEXT,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.customer_tag_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.customer_tags(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT customer_tag_assignments_unique UNIQUE (customer_id, tag_id)
);

CREATE TABLE IF NOT EXISTS public.customer_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    interaction_type TEXT NOT NULL,
    subject TEXT,
    description TEXT,
    interaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.customer_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    document_name TEXT NOT NULL,
    document_type TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    mime_type TEXT,
    file_size BIGINT,
    uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`;

  const statCards = [
    { label: 'Total de clientes', value: stats.total, icon: Users, tone: 'text-slate-900', chip: 'bg-slate-100 text-slate-600' },
    { label: 'Clientes activos', value: stats.active, icon: CheckCircle2, tone: 'text-emerald-600', chip: 'bg-emerald-50 text-emerald-600' },
    { label: 'Valor total reservado', value: `${fmtMoney(stats.value)} EUR`, icon: DollarSign, tone: 'text-slate-900', chip: 'bg-sky-50 text-sky-600' },
    { label: 'Saldo pendiente', value: `${fmtMoney(stats.outstanding)} EUR`, icon: Wallet, tone: 'text-slate-900', chip: 'bg-violet-50 text-violet-600' },
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
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">{translate('Clientes')}</h1>
            <p className="text-sm text-slate-500 mt-1">{translate('Perfiles de cliente, etiquetas e historial de reservas en un solo lugar.')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setIsSqlModalOpen(true)} className={btnGhost}>
              <FileText className="w-4 h-4 text-slate-500" />{translate('Esquema SQL')}</button>
            <button onClick={() => setIsTagsModalOpen(true)} className={btnGhost}>
              <TagIcon className="w-4 h-4 text-slate-500" />{translate('Gestionar etiquetas')}</button>
            <button onClick={fetchData} className={btnGhost} title="Actualizar registros">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />{translate('Actualizar')}</button>
            <button onClick={openCreateModal} className={btnPrimary}>
              <Plus className="w-4 h-4" />{translate('Nuevo cliente')}</button>
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
                  placeholder="Buscar por referencia, nombre, correo, teléfono o ciudad"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`${inputCls} pl-9`}
                />
              </div>
              <Select
                className="lg:w-52"
                prefix="Estado"
                ariaLabel="Filtro de estado"
                value={statusFilter}
                onChange={setStatusFilter}
                options={[{ value: 'ALL', label: 'Todos' }, ...STATUS_OPTIONS]}
              />
              <Select
                className="lg:w-52"
                prefix="Etiqueta"
                ariaLabel="Filtro de etiqueta"
                value={tagFilter}
                onChange={setTagFilter}
                options={tagOptions}
                searchable={tagOptions.length > 7}
              />
              <Select
                className="lg:w-56"
                prefix="País"
                ariaLabel="Filtro de país"
                value={countryFilter}
                onChange={setCountryFilter}
                options={countryOptions}
                searchable={countryOptions.length > 7}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{filteredCustomers.length} de {enrichedCustomers.length} clientes</span>
              {hasFilters && (
                <button onClick={clearFilters} className="font-medium text-amber-700 hover:text-amber-800 underline underline-offset-2">
                  {translate('Borrar filtros')}
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-stone-50 border-b border-slate-100 text-xs font-medium text-slate-500">
                  <th className="py-3 px-4">{translate('Cliente')}</th>
                  <th className="py-3 px-4">{translate('Contacto')}</th>
                  <th className="py-3 px-4">{translate('Ubicación')}</th>
                  <th className="py-3 px-4">{translate('Etiquetas')}</th>
                  <th className="py-3 px-4 text-right">{translate('Reservas')}</th>
                  <th className="py-3 px-4 text-right">{translate('Saldo pendiente')}</th>
                  <th className="py-3 px-4">{translate('Estado')}</th>
                  <th className="py-3 px-4 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="py-16 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-600" />{translate('Cargando clientes…')}</td>
                  </tr>
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan="8">
                      <EmptyStateCustomers hasFilters={hasFilters} onClearFilters={clearFilters} onCreate={openCreateModal} />
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((c) => {
                    const balance = Number(c.summary.outstanding_balance || 0);
                    return (
                      <tr
                        key={c.id}
                        tabIndex={0}
                        onClick={() => navigate(`/admin/customers/${c.id}`)}
                        onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/admin/customers/${c.id}`); }}
                        className="group cursor-pointer hover:bg-amber-50/40 focus:outline-none focus-visible:bg-amber-50/60 transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <Avatar name={c.full_name} />
                            <div className="min-w-0">
                              <p className="font-medium text-slate-900 truncate">{c.full_name}</p>
                              <p className="text-xs text-slate-400 truncate">
                                <span className="font-mono text-amber-700">{c.customer_reference}</span>
                                {' · '}{c.preferred_language?.toUpperCase()}{' · '}{(SOURCE_OPTIONS.find((o) => o.value === c.customer_source)?.label) || 'Directo'}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-600">
                          <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" /> {c.phone}</p>
                          <p className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5"><Mail className="w-3.5 h-3.5" /> {c.email || 'Sin correo'}</p>
                        </td>

                        <td className="py-3.5 px-4 text-slate-600">
                          <p>{c.city || '—'}</p>
                          <p className="text-xs text-slate-400">{c.country || '—'}</p>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1 max-w-[220px]">
                            {c.customerTags.length === 0 ? (
                              <span className="text-xs text-slate-400">{translate('Sin etiquetas')}</span>
                            ) : (
                              c.customerTags.map((tag) => <TagChip key={tag.id} tag={tag} />)
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <p className="font-semibold text-slate-900">{fmtMoney(c.summary.total_booking_value)} EUR</p>
                          <p className="text-xs text-slate-400">
                            {c.summary.total_bookings} {Number(c.summary.total_bookings) === 1 ? 'reserva' : 'reservas'}
                          </p>
                        </td>

                        <td className={`py-3.5 px-4 text-right font-semibold whitespace-nowrap ${balance > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                          {fmtMoney(balance)} EUR
                        </td>

                        <td className="py-3.5 px-4"><StatusBadge status={c.customer_status} /></td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleDeleteCustomer(c); }}
                              onKeyDown={(e) => e.stopPropagation()}
                              disabled={deletingCustomerId === c.id}
                              className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                              title="Eliminar cliente"
                              aria-label={`Eliminar ${c.full_name || 'cliente'}`}
                            >
                              {deletingCustomerId === c.id
                                ? <RefreshCw className="w-4 h-4 animate-spin" />
                                : <Trash2 className="w-4 h-4" />}
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

      {/* ================= CREATE CUSTOMER ================= */}
      {isCreateModalOpen && (
        <Modal onClose={() => setIsCreateModalOpen(false)}>
          <ModalHeader title="Nuevo cliente" subtitle="El nombre y el teléfono son obligatorios. El resto puede añadirse después." onClose={() => setIsCreateModalOpen(false)} />
          <form onSubmit={handleCreateCustomer} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            <div className="space-y-3">
              <SectionTitle icon={UserRound}>{translate('Identidad y contacto')}</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>{translate('Nombre *')}</label>
                  <input type="text" required autoComplete="given-name" value={formData.first_name} onChange={setField('first_name')} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{translate('Apellidos *')}</label>
                  <input type="text" required autoComplete="family-name" value={formData.last_name} onChange={setField('last_name')} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{translate('Teléfono *')}</label>
                  <input type="tel" required autoComplete="tel" placeholder="+212 600000000" value={formData.phone} onChange={setField('phone')} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{translate('Teléfono alternativo')}</label>
                  <input type="tel" value={formData.alternative_phone} onChange={setField('alternative_phone')} className={inputCls} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelCls}>{translate('Correo electrónico')}</label>
                  <input type="email" autoComplete="email" placeholder="cliente@ejemplo.com" value={formData.email} onChange={setField('email')} className={inputCls} />
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-5 border-t border-slate-100">
              <SectionTitle icon={Users}>{translate('Perfil')}</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>{translate('Fecha de nacimiento')}</label>
                  <input type="date" max={new Date().toISOString().slice(0, 10)} value={formData.date_of_birth} onChange={setField('date_of_birth')} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{translate('Género')}</label>
                  <Select value={formData.gender} onChange={setSelect('gender')} options={GENDER_OPTIONS} ariaLabel="Género" menuMinWidth={160} />
                </div>
                <div>
                  <label className={labelCls}>{translate('Nacionalidad')}</label>
                  <input type="text" value={formData.nationality} onChange={setField('nationality')} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{translate('Ciudad')}</label>
                  <input type="text" placeholder="Casablanca, Rabat" value={formData.city} onChange={setField('city')} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{translate('País')}</label>
                  <input type="text" autoComplete="country-name" placeholder="Marruecos, Francia" value={formData.country} onChange={setField('country')} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{translate('Idioma preferido')}</label>
                  <Select value={formData.preferred_language} onChange={setSelect('preferred_language')} options={LANGUAGE_OPTIONS} ariaLabel="Idioma preferido" menuMinWidth={180} />
                </div>
                <div className="md:col-span-3">
                  <label className={labelCls}>{translate('Dirección')}</label>
                  <input type="text" autoComplete="street-address" value={formData.address} onChange={setField('address')} className={inputCls} />
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-5 border-t border-slate-100">
              <SectionTitle icon={TagIcon}>{translate('CRM')}</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>{translate('Origen del cliente')}</label>
                  <Select value={formData.customer_source} onChange={setSelect('customer_source')} options={SOURCE_OPTIONS} ariaLabel="Origen del cliente" />
                </div>
                <div>
                  <label className={labelCls}>{translate('Estado')}</label>
                  <Select value={formData.customer_status} onChange={setSelect('customer_status')} options={CREATE_STATUS_OPTIONS} ariaLabel="Estado del cliente" />
                </div>
              </div>
              <div>
                <label className={labelCls}>{translate('Notas')}</label>
                <textarea rows="2" placeholder="Cualquier cosa que el equipo deba saber de este cliente" value={formData.notes} onChange={setField('notes')} className={inputCls} />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-100">
              <button type="button" onClick={() => setIsCreateModalOpen(false)} className={btnGhost}>{translate('Cancelar')}</button>
              <button type="submit" disabled={formSubmitting} className={btnPrimary}>{formSubmitting ? 'Guardando…' : 'Guardar cliente'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ================= MANAGE TAGS ================= */}
      {isTagsModalOpen && (
        <Modal onClose={() => setIsTagsModalOpen(false)} maxW="max-w-lg">
          <ModalHeader title="Etiquetas de cliente" subtitle="Las etiquetas agrupan clientes y aparecen como filtros." onClose={() => setIsTagsModalOpen(false)} />
          <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            <form onSubmit={handleCreateTag} className="space-y-4">
              <SectionTitle icon={Plus}>{translate('Nueva etiqueta')}</SectionTitle>
              <div>
                <label className={labelCls}>{translate('Nombre *')}</label>
                <input type="text" required placeholder="p. ej. VIP, Empresa, Familia" value={newTagData.name}
                  onChange={(e) => setNewTagData((p) => ({ ...p, name: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{translate('Descripción')}</label>
                <input type="text" placeholder="Opcional" value={newTagData.description}
                  onChange={(e) => setNewTagData((p) => ({ ...p, description: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{translate('Color')}</label>
                <div className="flex flex-wrap items-center gap-2">
                  {TAG_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewTagData((p) => ({ ...p, color }))}
                      aria-label={`Usar color ${color}`}
                      aria-pressed={newTagData.color === color}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition ring-offset-2 ${newTagData.color === color ? 'ring-2 ring-slate-900' : 'hover:scale-110'}`}
                      style={{ backgroundColor: color }}
                    >
                      {newTagData.color === color && <Check className="w-4 h-4 text-white" />}
                    </button>
                  ))}
                  <label className="ml-1 inline-flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
                    <input type="color" value={newTagData.color}
                      onChange={(e) => setNewTagData((p) => ({ ...p, color: e.target.value }))}
                      className="w-7 h-7 rounded-md border border-slate-200 cursor-pointer p-0.5 bg-white" aria-label="Color personalizado" />{translate('Personalizado')}</label>
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  Vista previa <TagChip tag={{ name: newTagData.name || 'Nombre', color: newTagData.color }} />
                </div>
                <button type="submit" disabled={formSubmitting} className={btnPrimary}>{formSubmitting ? 'Añadiendo…' : 'Añadir etiqueta'}</button>
              </div>
            </form>

            <div className="space-y-3 pt-5 border-t border-slate-100">
              <SectionTitle icon={TagIcon}>Etiquetas existentes ({tags.length})</SectionTitle>
              {tags.length === 0 ? (
                <p className="text-sm text-slate-500">{translate('Aún no hay etiquetas. Crea la primera arriba.')}</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tags.map((t) => <TagChip key={t.id} tag={t} />)}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center justify-end px-6 py-4 border-t border-slate-100 bg-stone-50">
            <button onClick={() => setIsTagsModalOpen(false)} className={btnGhost}>{translate('Cerrar')}</button>
          </div>
        </Modal>
      )}

      {/* ================= SQL MIGRATION ================= */}
      {isSqlModalOpen && (
        <Modal onClose={() => setIsSqlModalOpen(false)} maxW="max-w-4xl" dark>
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-semibold text-white">{translate('Migración 0003: esquema CRM de clientes')}</h3>
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