import { useAppSettings, translate, useAuth } from '@/context/index.jsx';
// src/pages/admin/AdminPackagesAndServicesPage.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Archive,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Edit,
  Eye,
  Filter,
  Globe,
  Layers,
  Loader2,
  Lock,
  MapPin,
  Plus,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { supabase } from '@/lib/supabase/client.jsx';
import { getAdminPackages, saveAdminOffer } from '@/services/packages/index.jsx';
import { canUserAccessPath } from '@/services/roleAccessService.js';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
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

const STATUS_FILTERS = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'archived', label: 'Archived' },
];

const VISIBILITY_FILTERS = [
  { value: 'ALL', label: 'Public & private' },
  { value: 'public', label: 'Public only' },
  { value: 'private', label: 'Private only' },
];

const PAGE_SIZE = 15;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function formatCurrency(amount, currency) {
  if (amount == null || amount === '') return 'Not priced';
  const code = currency || 'MAD';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 2,
    }).format(Number(amount));
  } catch {
    return `${code} ${Number(amount).toLocaleString()}`;
  }
}

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString(undefined, {
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

/* ------------------------------------------------------------------ */
/*  Icons (inline SVG fallbacks to keep bundle lean)                   */
/* ------------------------------------------------------------------ */
const Icon = ({ children, className = 'h-4 w-4', ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
    {...props}
  >
    {children}
  </svg>
);

const BuildingIcon = (p) => (<Icon {...p}><path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" /><path d="M16 8h2a2 2 0 0 1 2 2v11" /><path d="M2 21h20M8 7h2M8 11h2M8 15h2" /></Icon>);
const PlaneIcon = (p) => (<Icon {...p}><path d="M17.8 19.2 16 11l3.5-3.5a2.1 2.1 0 0 0-3-3L13 8 4.8 6.2a1 1 0 0 0-.9 1.7l5.6 4-2 2-2.4-.4a1 1 0 0 0-.9 1.7l4.5 3.2 3.2 4.5a1 1 0 0 0 1.7-.9l-.4-2.4 2-2 4 5.6a1 1 0 0 0 1.7-.9Z" /></Icon>);
const ActivityIcon = (p) => (<Icon {...p}><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></Icon>);
const CalendarIcon = (p) => (<Icon {...p}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></Icon>);

/* ------------------------------------------------------------------ */
/*  Small primitives                                                   */
/* ------------------------------------------------------------------ */
function StatusBadge({ status }) {
  const map = {
    active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    draft: 'bg-amber-50 text-amber-700 ring-amber-200',
    inactive: 'bg-slate-100 text-slate-600 ring-slate-200',
    archived: 'bg-slate-100 text-slate-500 ring-slate-200',
  };
  const cls = map[status] || 'bg-slate-100 text-slate-600 ring-slate-200';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${cls}`}>
      {status || 'draft'}
    </span>
  );
}

function VisibilityBadge({ isPublic, status }) {
  const live = isPublic && status === 'active';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${
      live ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-slate-100 text-slate-600 ring-slate-200'
    }`}>
      {live ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
      {live ? 'Live' : 'Private'}
    </span>
  );
}

function ConfigIndicator({ icon: IconCmp, count, label }) {
  const ok = count > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${
        ok ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-slate-50 text-slate-400 ring-slate-200'
      }`}
      title={`${label}: ${count}`}
    >
      <IconCmp className="h-3 w-3" />
      {count}
    </span>
  );
}

function StatCard({ label, value, tone = 'slate', icon: IconCmp, hint }) {
  const tones = {
    slate: 'bg-slate-50 text-slate-700 ring-slate-200',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    sky: 'bg-sky-50 text-sky-700 ring-sky-200',
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1.5 text-2xl font-bold text-slate-900">{value}</p>
          {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
        </div>
        {IconCmp && (
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ring-1 ring-inset ${tones[tone]}`}>
            <IconCmp className="h-4 w-4" />
          </span>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Row action menu                                                    */
/* ------------------------------------------------------------------ */
function RowActions({ offer, canUpdate, canCreate, onDuplicate, onPublishToggle, onArchive }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const isLive = offer.is_public && offer.status === 'active';

  return (
    <div ref={ref} className="relative flex items-center justify-end gap-1.5">
      <Link
        to={`/packages/${offer.id}${isLive ? '' : '?preview=true'}`}
        target="_blank"
        rel="noreferrer"
        aria-label={`Preview ${offer.public_title || offer.reference}`}
        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        title="Preview"
      >
        <Eye className="h-3.5 w-3.5" />
      </Link>
      <Link
        to={`/admin/packages-services/${offer.id}`}
        aria-label={`Edit ${offer.public_title || offer.reference}`}
        className="rounded-md p-1.5 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
        title="Edit"
      >
        <Edit className="h-3.5 w-3.5" />
      </Link>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={open}
          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          title="More actions"
        >
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div role="menu" className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white text-xs shadow-lg">
            <button
              type="button"
              role="menuitem"
              disabled={!canCreate}
              onClick={() => { setOpen(false); onDuplicate(offer); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Copy className="h-3.5 w-3.5" />{translate('Duplicate')}</button>
            <button
              type="button"
              role="menuitem"
              disabled={!canUpdate}
              onClick={() => { setOpen(false); onPublishToggle(offer); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLive ? <Lock className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
              {isLive ? 'Unpublish' : 'Publish'}
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={!canUpdate || offer.status === 'archived'}
              onClick={() => { setOpen(false); onArchive(offer); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Archive className="h-3.5 w-3.5" />{translate('Archive')}</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
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
          ? 'Sign in with an authorized account to manage offers.'
          : 'Your account is missing the packages.view permission.',
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

      // Fail fast on the first error — avoids silently showing wrong counts
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
      setError(`Could not load offers and configuration counts: ${loadError.message}`);
    } finally {
      setLoading(false);
    }
  }, [authLoading, canViewOffers, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ------------ KPIs ------------ */
  const kpis = useMemo(() => {
    const total = packages.length;
    const published = packages.filter((o) => o.status === 'active' && o.is_public).length;
    const draft = packages.filter((o) => o.status === 'draft').length;
    const upcoming = Object.values(upcomingByOffer).reduce((sum, n) => sum + n, 0);
    return { total, published, draft, upcoming };
  }, [packages, upcomingByOffer]);

  /* ------------ Filtering + pagination ------------ */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return packages.filter((offer) => {
      // Server-relevant text search — matched against fields we already have
      const haystack = [
        offer.reference,
        offer.public_title,
        offer.internal_title,
        offer.destination_country,
        offer.package_category,
        ...(destinationsByOffer[offer.id] || []).flatMap((d) => [d.name, d.country]),
      ]
        .filter(Boolean)
        .map((v) => String(v).toLowerCase());

      if (q && !haystack.some((v) => v.includes(q))) return false;
      if (statusFilter !== 'ALL' && offer.status !== statusFilter) return false;
      if (categoryFilter !== 'ALL' && offer.package_category !== categoryFilter) return false;
      if (visibilityFilter === 'public' && !(offer.is_public && offer.status === 'active')) return false;
      if (visibilityFilter === 'private' && offer.is_public && offer.status === 'active') return false;
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
    // Reset to page 1 when filters change
    setPage(1);
  }, [search, statusFilter, categoryFilter, visibilityFilter]);

  const activeFilterCount =
    (search ? 1 : 0) +
    (statusFilter !== 'ALL' ? 1 : 0) +
    (categoryFilter !== 'ALL' ? 1 : 0) +
    (visibilityFilter !== 'ALL' ? 1 : 0);

  function resetFilters() {
    setSearch('');
    setStatusFilter('ALL');
    setCategoryFilter('ALL');
    setVisibilityFilter('ALL');
  }

  /* ------------ Create ------------ */
  function validateOffer(o) {
    const errs = {};
    if (!o.internal_title.trim()) errs.internal_title = 'Internal title is required.';
    if (!o.public_title.trim()) errs.public_title = 'Public title is required.';
    if (!o.destination_country.trim()) errs.destination_country = 'Country is required.';
    if (!Number.isFinite(Number(o.duration_days)) || Number(o.duration_days) < 1) {
      errs.duration_days = 'Must be at least 1 day.';
    }
    if (!Number.isFinite(Number(o.duration_nights)) || Number(o.duration_nights) < 0) {
      errs.duration_nights = 'Must be 0 or more.';
    }
    return errs;
  }

  async function handleCreateOffer(event) {
    event.preventDefault();
    if (!canCreateOffers) {
      setError('Your account is missing the packages.create permission required to create offers.');
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
          destinationWarning = ` The offer was created, but its city could not be saved: ${destErr.message}`;
        }
      }

      setIsModalOpen(false);
      setNewOffer(createInitialOffer());
      setFormErrors({});
      await loadData();
      setNotice({
        id: createdOffer.id,
        message: `Draft offer created successfully.${destinationWarning}`,
      });
    } catch (createError) {
      console.error('Error creating draft offer:', createError);
      setError(`Could not create offer: ${createError.message}`);
      // If the offer was created but a later step failed, surface it clearly
      if (createdOffer) {
        setNotice({
          id: createdOffer.id,
          message: `Draft created but some details failed to save. ${createError.message}`,
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
      // 1) Create the new draft row
      const newDraft = await saveAdminOffer({
        reference: generateReference(),
        internal_title: `${offer.internal_title || offer.public_title || 'Untitled'} (copy)`,
        public_title: `${offer.public_title || offer.internal_title || 'Untitled'} (copy)`,
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

      // 2) Copy related configuration records (safe order, FK respected)
      //    Each block is isolated so a partial failure is reported, not swallowed.
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
          // Column mismatch? Retry with only `sort_order` if present, else log
          childErrors.push(`${table}: ${copyErr.message}`);
        }
      }

      // Landing-page configuration, if your schema uses `offer_landing_pages`
      // with a 1:1 relationship. Guard with a try since the table may not exist.
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
        // Landing page table is optional — do not fail duplication over it.
      }

      await loadData();

      if (childErrors.length) {
        setNotice({
          id: newDraft.id,
          message: `Draft duplicated, but some sections could not be copied: ${childErrors
            .slice(0, 2)
            .join('; ')}${childErrors.length > 2 ? '…' : ''}. Review and re-add them in the editor.`,
        });
      } else {
        setNotice({
          id: newDraft.id,
          message: 'Offer duplicated as a draft. Continue editing to review the copy.',
        });
      }
    } catch (dupErr) {
      console.error('Duplicate failed:', dupErr);
      setError(`Could not duplicate offer: ${dupErr.message}`);
    } finally {
      setDuplicatingId(null);
    }
  }

  /* ------------ Publish / Unpublish ------------ */
  async function handlePublishToggle(offer) {
    if (!canUpdateOffers) return;
    const isLive = offer.is_public && offer.status === 'active';
    const payload = isLive
      ? { status: 'inactive', is_public: false }
      : { status: 'active', is_public: true };

    try {
      await saveAdminOffer({ id: offer.id, ...payload });
      await loadData();
      setNotice({
        id: offer.id,
        message: isLive ? 'Offer unpublished.' : 'Offer published.',
      });
    } catch (pubErr) {
      console.error('Publish toggle failed:', pubErr);
      setError(`Could not update publish state: ${pubErr.message}`);
    }
  }

  /* ------------ Archive ------------ */
  async function handleArchive(offer) {
    if (!canUpdateOffers) return;
    try {
      await saveAdminOffer({ id: offer.id, status: 'archived', is_public: false });
      await loadData();
      setNotice({ id: offer.id, message: 'Offer archived.' });
    } catch (archErr) {
      console.error('Archive failed:', archErr);
      setError(`Could not archive offer: ${archErr.message}`);
    }
  }

  /* ------------ CSV export (client-side) ------------ */
  function handleExportCsv() {
    if (!filtered.length) return;
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
          o.is_public && o.status === 'active' ? 'yes' : 'no',
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
  if (authLoading || loading) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center gap-3 text-sm text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin text-amber-600" />{translate('Checking account access and loading offers…')}</main>
    );
  }

  if (!user || !canViewOffers) {
    return (
      <main className="m-6 rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        <p>
          {!user
            ? 'Sign in with an authorized account to manage offers.'
            : 'Your account is missing the packages.view permission.'}
        </p>
        {!user && (
          <button
            type="button"
            onClick={() => navigate('/auth/admin-login')}
            className="mt-3 font-semibold underline"
          >{translate('Sign in')}</button>
        )}
      </main>
    );
  }

  return (
    <main className="space-y-6 p-6">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="rounded-md bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">{translate('OFFERS & SERVICES')}</span>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{translate('Packages & Services')}</h1>
          <p className="mt-1 text-sm text-slate-500">{translate('Create draft packages, complete their services and pricing, then publish when ready.')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={!filtered.length}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />{translate('Export CSV')}</button>
          <button
            type="button"
            disabled={!canCreateOffers}
            onClick={() => {
              setError('');
              setFormErrors({});
              setNewOffer(createInitialOffer());
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />{translate('Create Package')}</button>
        </div>
      </header>

      {!canCreateOffers && (
        <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          You can view offers, but creating new ones requires the{' '}
          <code className="rounded bg-amber-100 px-1">{translate('packages.create')}</code>{translate('permission.')}</div>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError('')}
            className="ml-auto rounded p-0.5 text-rose-600 hover:bg-rose-100"
            aria-label="Dismiss error"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {notice.message}
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(`/admin/packages-services/${notice.id}`)}
              className="font-semibold underline underline-offset-2"
            >{translate('Continue editing')}</button>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="rounded p-0.5 hover:bg-emerald-100"
              aria-label="Dismiss notice"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* KPI cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total packages" value={kpis.total} icon={Layers} tone="slate" />
        <StatCard label="Published" value={kpis.published} icon={Globe} tone="emerald" hint="Live on the public site" />
        <StatCard label="Drafts" value={kpis.draft} icon={Edit} tone="amber" hint="Waiting to complete" />
        <StatCard label="Upcoming departures" value={kpis.upcoming} icon={CalendarIcon} tone="sky" hint="Across all packages" />
      </section>

      {/* Filters */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-md">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, reference, country, city…"
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-9 text-xs focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              aria-label="Search packages"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600 focus:border-amber-500 focus:outline-none"
            >
              {STATUS_FILTERS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>

            <select
              aria-label="Filter by category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600 focus:border-amber-500 focus:outline-none"
            >
              <option value="ALL">{translate('All categories')}</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              aria-label="Filter by visibility"
              value={visibilityFilter}
              onChange={(e) => setVisibilityFilter(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600 focus:border-amber-500 focus:outline-none"
            >
              {VISIBILITY_FILTERS.map((v) => (
                <option key={v.value} value={v.value}>{v.label}</option>
              ))}
            </select>

            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset ({activeFilterCount})
              </button>
            )}

            <span className="ml-auto inline-flex items-center gap-1 rounded-md bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-500 ring-1 ring-inset ring-slate-200">
              <Filter className="h-3 w-3" />
              {totalFiltered} of {packages.length}
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-left text-xs">
            <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">{translate('Package / Reference')}</th>
                <th className="px-4 py-3">{translate('Destination')}</th>
                <th className="px-4 py-3">{translate('Category')}</th>
                <th className="px-4 py-3">{translate('Duration')}</th>
                <th className="px-4 py-3">{translate('Configuration')}</th>
                <th className="px-4 py-3">{translate('Starting price')}</th>
                <th className="px-4 py-3">{translate('Next departure')}</th>
                <th className="px-4 py-3">{translate('Status')}</th>
                <th className="px-4 py-3">{translate('Visibility')}</th>
                <th className="px-4 py-3">{translate('Updated')}</th>
                <th className="px-4 py-3 text-right">{translate('Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    {packages.length === 0
                      ? 'No packages yet. Create your first package to get started.'
                      : 'No packages match the current filters.'}
                  </td>
                </tr>
              ) : (
                pageRows.map((offer) => {
                  const cfg = counts[offer.id] || {};
                  const dests = destinationsByOffer[offer.id] || [];
                  const primaryDest =
                    dests[0]?.name || offer.destination_country || '—';
                  const extraDest = dests.length > 1 ? `+${dests.length - 1} more` : null;
                  const nextDep = nextDepartureByOffer[offer.id];
                  return (
                    <tr key={offer.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900">
                          {offer.public_title || offer.internal_title || 'Untitled package'}
                        </div>
                        <div className="font-mono text-[10px] text-amber-700">
                          {offer.reference}
                        </div>
                        {offer.internal_title && offer.public_title && offer.internal_title !== offer.public_title && (
                          <div className="mt-0.5 truncate text-[10px] text-slate-400">
                            Internal: {offer.internal_title}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-start gap-1.5">
                          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <div>
                            <div className="text-slate-800">{primaryDest}</div>
                            <div className="text-[10px] text-slate-400">
                              {offer.destination_country || '—'}
                              {extraDest && ` · ${extraDest}`}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center rounded-md bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
                          {offer.package_category || '—'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-slate-600">
                        {offer.duration_days ?? '—'}d / {offer.duration_nights ?? '—'}n
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          <ConfigIndicator icon={BuildingIcon} count={cfg.hotels || 0} label="Hotels" />
                          <ConfigIndicator icon={PlaneIcon} count={cfg.flights || 0} label="Flights" />
                          <ConfigIndicator icon={ActivityIcon} count={cfg.activities || 0} label="Activities" />
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 font-semibold text-slate-900">
                        {formatCurrency(offer.starting_price, offer.default_currency)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        {nextDep ? (
                          <div>
                            <div className="text-slate-800">{formatDate(nextDep.departure_date)}</div>
                            <div className="text-[10px] text-slate-400">
                              {upcomingByOffer[offer.id] || 0} upcoming
                              {nextDep.seats_available != null && ` · ${nextDep.seats_available} seats`}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">{translate('No departures')}</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5"><StatusBadge status={offer.status} /></td>
                      <td className="px-4 py-3.5">
                        <VisibilityBadge isPublic={offer.is_public} status={offer.status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-slate-500">
                        {formatDate(offer.updated_at || offer.created_at)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <RowActions
                          offer={offer}
                          canCreate={canCreateOffers}
                          canUpdate={canUpdateOffers}
                          onDuplicate={handleDuplicate}
                          onPublishToggle={handlePublishToggle}
                          onArchive={handleArchive}
                        />
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
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-600">
            <span>
              Showing {(safePage - 1) * PAGE_SIZE + 1}–
              {Math.min(safePage * PAGE_SIZE, totalFiltered)} of {totalFiltered}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />{translate('Prev')}</button>
              <span className="px-2">Page {safePage} / {totalPages}</span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 hover:bg-slate-50 disabled:opacity-40"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Create modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-offer-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 id="create-offer-title" className="text-lg font-bold text-slate-900">{translate('Create draft package')}</h2>
                <p className="mt-1 text-xs text-slate-500">{translate('Add the essentials now; configure services and pricing in the editor.')}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close dialog"
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOffer} className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-medium text-slate-700">
                  Internal title <span className="text-red-500">{translate('*')}</span>
                  <input
                    required
                    value={newOffer.internal_title}
                    onChange={(e) => setNewOffer({ ...newOffer, internal_title: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2"
                  />
                  {formErrors.internal_title && (
                    <span className="mt-1 block text-[11px] text-rose-600">{formErrors.internal_title}</span>
                  )}
                </label>
                <label className="text-xs font-medium text-slate-700">
                  Public title <span className="text-red-500">{translate('*')}</span>
                  <input
                    required
                    value={newOffer.public_title}
                    onChange={(e) => setNewOffer({ ...newOffer, public_title: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2"
                  />
                  {formErrors.public_title && (
                    <span className="mt-1 block text-[11px] text-rose-600">{formErrors.public_title}</span>
                  )}
                </label>
              </div>

              <label className="block text-xs font-medium text-slate-700">
                Reference (generated automatically)
                <input
                  readOnly
                  value={newOffer.reference}
                  className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-slate-500"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-medium text-slate-700">
                  Package category
                  <select
                    value={newOffer.package_category}
                    onChange={(e) => setNewOffer({ ...newOffer, package_category: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
                  >
                    {CATEGORIES.map((c) => (<option key={c}>{c}</option>))}
                  </select>
                </label>
                <label className="text-xs font-medium text-slate-700">
                  Destination country <span className="text-red-500">{translate('*')}</span>
                  <input
                    required
                    value={newOffer.destination_country}
                    onChange={(e) => setNewOffer({ ...newOffer, destination_country: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2"
                  />
                  {formErrors.destination_country && (
                    <span className="mt-1 block text-[11px] text-rose-600">{formErrors.destination_country}</span>
                  )}
                </label>
              </div>

              <label className="block text-xs font-medium text-slate-700">
                Main destination city <span className="font-normal text-slate-400">{translate('(optional)')}</span>
                <input
                  value={newOffer.destination_city}
                  onChange={(e) => setNewOffer({ ...newOffer, destination_city: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-medium text-slate-700">
                  Duration in days <span className="text-red-500">{translate('*')}</span>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newOffer.duration_days}
                    onChange={(e) => setNewOffer({ ...newOffer, duration_days: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2"
                  />
                  {formErrors.duration_days && (
                    <span className="mt-1 block text-[11px] text-rose-600">{formErrors.duration_days}</span>
                  )}
                </label>
                <label className="text-xs font-medium text-slate-700">
                  Duration in nights <span className="text-red-500">{translate('*')}</span>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newOffer.duration_nights}
                    onChange={(e) => setNewOffer({ ...newOffer, duration_nights: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2"
                  />
                  {formErrors.duration_nights && (
                    <span className="mt-1 block text-[11px] text-rose-600">{formErrors.duration_nights}</span>
                  )}
                </label>
              </div>

              <label className="block text-xs font-medium text-slate-700">
                Short description <span className="font-normal text-slate-400">{translate('(optional)')}</span>
                <textarea
                  rows={3}
                  value={newOffer.short_description}
                  onChange={(e) => setNewOffer({ ...newOffer, short_description: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2"
                />
              </label>

              {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs text-slate-600"
                >{translate('Cancel')}</button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {submitting ? 'Creating draft…' : 'Create draft package'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}