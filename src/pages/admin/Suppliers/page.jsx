import { useAppSettings, translate } from '@/context/index.jsx';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bed, Building2, Bus, Car, ChevronDown, Compass, Download, FileSpreadsheet, Filter, Flag, Mail,
  MapPin, Pencil, Phone, Plane, Plus, RefreshCw, Search, Star, Trash2, Upload, Utensils, X,
} from 'lucide-react';
import { useAuth } from '../../../context/index.jsx';
import { supabase } from '../../../lib/supabase/client.jsx';
import { canUserAccessPath } from '../../../services/roleAccessService.js';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
const supplierTypes = [
  ['hotel', 'Hotel', Building2],
  ['riad', 'Riad', Bed],
  ['resort', 'Resort', Star],
  ['restaurant', 'Restaurant', Utensils],
  ['airline', 'Airline', Plane],
  ['car_rental', 'Car rental', Car],
  ['transport_company', 'Transport company', Bus],
  ['local_guide', 'Local guide', Flag],
  ['activity_provider', 'Activity provider', Compass],
  ['manufacturer', 'Manufacturer', Building2],
  ['wholesaler', 'Wholesaler', Building2],
  ['distributor', 'Distributor', Bus],
];
const typeMeta = (value) => supplierTypes.find(([v]) => v === value);

const supplierStatuses = ['pending', 'active', 'inactive', 'blacklisted'];
const statusStyles = {
  pending: { dot: 'bg-amber-500', pill: 'bg-amber-50 text-amber-800 ring-amber-200' },
  active: { dot: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  inactive: { dot: 'bg-slate-400', pill: 'bg-slate-100 text-slate-700 ring-slate-200' },
  blacklisted: { dot: 'bg-red-500', pill: 'bg-red-50 text-red-800 ring-red-200' },
};

const emptyFilters = { supplier_type: '', status: '', city: '', created_from: '', created_to: '' };

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 hover:border-slate-300 focus:border-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-500/15';

// FIX: single source of truth for header normalization (strips BOM, trims, lowercases, underscores)
function normalizeHeader(header) {
  return String(header ?? '')
    .replace(/^\ufeff/, '') // strip UTF-8 BOM (common in Excel-saved CSVs)
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // strip zero-width chars
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

function getCsvDelimiter(csvText) {
  const header = csvText
    .replace(/^\ufeff/, '')
    .split(/\r\n?|\n/)
    .find((line) => line.trim()) || '';

  return [',', ';', '\t'].reduce((selected, delimiter) => {
    const count = header.split(delimiter).length - 1;
    return count > selected.count ? { delimiter, count } : selected;
  }, { delimiter: ',', count: -1 }).delimiter;
}

// FIX: normalize a raw row into our canonical shape, resolving common aliases
function normalizeRow(row) {
  const normalized = {};
  Object.entries(row).forEach(([header, value]) => {
    normalized[normalizeHeader(header)] = value;
  });
  if (!normalized.name && normalized.supplier_name) normalized.name = normalized.supplier_name;
  if (!normalized.supplier_type) normalized.supplier_type = normalized.category || normalized.type;
  if (normalized.status) normalized.status = String(normalized.status).trim().toLowerCase();
  if (normalized.supplier_type) {
    normalized.supplier_type = String(normalized.supplier_type).trim().toLowerCase().replace(/[\s-]+/g, '_');
  }
  return normalized;
}

/* ------------------------------------------------------------------ */
/*  API (unchanged contract, used by other pages)                      */
/* ------------------------------------------------------------------ */
export const suppliersApi = {
  async getSuppliers({ search = '', filters = emptyFilters } = {}) {
    let query = supabase
      .from('suppliers')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (search.trim()) {
      const term = search.trim();
      query = query.or(`name.ilike.%${term}%,supplier_code.ilike.%${term}%,email.ilike.%${term}%`);
    }
    if (filters.supplier_type) query = query.eq('supplier_type', filters.supplier_type);
    if (filters.status) query = query.eq('status', filters.status);
    for (const field of ['name', 'supplier_code', 'email', 'phone', 'website', 'address', 'city', 'country', 'notes']) {
      if (filters[field]?.trim()) query = query.ilike(field, `%${filters[field].trim()}%`);
    }
    if (filters.created_from) query = query.gte('created_at', filters.created_from);
    if (filters.created_to) {
      const exclusiveEnd = new Date(`${filters.created_to}T00:00:00.000Z`);
      exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1);
      query = query.lt('created_at', exclusiveEnd.toISOString());
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async createSupplier(formData) {
    const { categoryData, ...supplierData } = formData;
    if (!supplierData.supplier_code) {
      supplierData.supplier_code = `SUP-${Math.floor(100000 + Math.random() * 900000)}`;
    }

    const { data: supplier, error } = await supabase.from('suppliers').insert([supplierData]).select().single();
    if (error) throw error;

    if (categoryData && Object.keys(categoryData).length) {
      const detailsTable = {
        hotel: 'supplier_hotels',
        riad: 'supplier_riads',
        resort: 'supplier_hotels',
        restaurant: 'supplier_restaurants',
        airline: 'supplier_airlines',
        car_rental: 'supplier_car_rentals',
        transport_company: 'supplier_transport',
        local_guide: 'supplier_guides',
        activity_provider: 'supplier_activities',
      }[supplier.supplier_type];

      if (detailsTable) {
        const { error: detailsError } = await supabase
          .from(detailsTable)
          .insert([{ ...categoryData, supplier_id: supplier.id }]);
        if (detailsError) throw detailsError;
      }
    }
    return supplier;
  },

  async updateSupplier(id, changes) {
    const { data, error } = await supabase
      .from('suppliers')
      .update({ ...changes, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async softDeleteSupplier(id) {
    const { error } = await supabase
      .from('suppliers')
      .update({ deleted_at: new Date().toISOString(), status: 'inactive' })
      .eq('id', id);
    if (error) throw error;
  },

  // FIX: collect ALL validation problems instead of throwing on the first bad row,
  // and normalize headers per-row (handles BOM regardless of how the caller built rows).
  async importSuppliers(rows) {
    const problems = [];
    const records = rows.map((rawRow, index) => {
      const row = normalizeRow(rawRow);
      const rowNumber = index + 2; // header is row 1
      const name = String(row.name || '').trim();
      const type = String(row.supplier_type || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
      const status = String(row.status || 'pending').trim().toLowerCase();

      if (!name) problems.push(`Row ${rowNumber}: supplier name is required.`);
      if (!supplierTypes.some(([value]) => value === type)) {
        problems.push(`Row ${rowNumber}: invalid supplier_type "${row.supplier_type ?? ''}".`);
      }
      if (!supplierStatuses.includes(status)) {
        problems.push(`Row ${rowNumber}: invalid status "${row.status ?? ''}".`);
      }

      return {
        name,
        supplier_type: type,
        status,
        supplier_code: String(row.supplier_code || '').trim() || `SUP-${Math.floor(100000 + Math.random() * 900000)}`,
        email: String(row.email || '').trim() || null,
        phone: String(row.phone || '').trim() || null,
        website: String(row.website || '').trim() || null,
        address: String(row.address || '').trim() || null,
        city: String(row.city || '').trim() || null,
        country: String(row.country || '').trim() || null,
        notes: String(row.notes || '').trim() || null,
      };
    });

    if (problems.length) {
      const err = new Error(problems.slice(0, 10).join('\n'));
      err.details = problems;
      throw err;
    }

    const { data, error } = await supabase.from('suppliers').insert(records).select();
    if (error) throw error;
    return data;
  },
};

function getErrorMessage(error, fallback) {
  return error && typeof error.message === 'string' ? error.message : fallback;
}

function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/* ------------------------------------------------------------------ */
/*  Small components                                                   */
/* ------------------------------------------------------------------ */
function StatusPill({ status }) {
  const s = statusStyles[status] || statusStyles.inactive;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize ring-1 ring-inset ${s.pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {status || 'unknown'}
    </span>
  );
}

function TypeAvatar({ type }) {
  const Cmp = typeMeta(type)?.[2] || Building2;
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-200">
      <Cmp aria-hidden="true" className="h-[18px] w-[18px]" />
    </span>
  );
}

function StatCard({ label, value, tone = 'text-slate-900', bar = 'bg-slate-300' }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <span className={`absolute inset-y-0 left-0 w-1 ${bar}`} />
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}

function Modal({ children, onClose, labelledBy, wide }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white shadow-2xl ${wide ? 'max-w-2xl' : 'max-w-xl'}`}
      >
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ id, title, subtitle, onClose }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <div>
        <h2 id={id} className="text-lg font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
        <X aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>
  );
}

/* Empty-state illustration: a stack of supplier cards with a dashed "add" slot */
function EmptyIllustration() {
  return (
    <svg viewBox="0 0 320 200" className="mx-auto h-44 w-auto" role="img" aria-label="Illustration of supplier cards">
      <ellipse cx="160" cy="184" rx="110" ry="8" className="fill-slate-100" />
      {/* back card */}
      <g transform="rotate(-6 100 100)">
        <rect x="38" y="50" width="120" height="78" rx="12" className="fill-white stroke-slate-200" strokeWidth="2" />
        <circle cx="62" cy="76" r="12" className="fill-slate-100" />
        <rect x="82" y="68" width="52" height="6" rx="3" className="fill-slate-200" />
        <rect x="82" y="80" width="34" height="5" rx="2.5" className="fill-slate-100" />
        <rect x="52" y="104" width="80" height="5" rx="2.5" className="fill-slate-100" />
      </g>
      {/* front card */}
      <g transform="rotate(4 200 100)">
        <rect x="140" y="62" width="130" height="86" rx="12" className="fill-white stroke-amber-300" strokeWidth="2" />
        <rect x="156" y="78" width="26" height="26" rx="8" className="fill-amber-100" />
        <path d="M163 96v-9h12v9M160 96h18" className="stroke-amber-600" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="190" y="80" width="56" height="7" rx="3.5" className="fill-slate-300" />
        <rect x="190" y="93" width="36" height="5" rx="2.5" className="fill-slate-200" />
        <rect x="156" y="116" width="42" height="14" rx="7" className="fill-emerald-100" />
        <circle cx="166" cy="123" r="3" className="fill-emerald-500" />
        <rect x="206" y="121" width="40" height="5" rx="2.5" className="fill-slate-100" />
      </g>
      {/* add badge */}
      <circle cx="262" cy="52" r="20" className="fill-amber-500" />
      <path d="M262 43v18M253 52h18" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <circle cx="40" cy="40" r="4" className="fill-amber-200" />
      <circle cx="288" cy="120" r="3" className="fill-amber-300" />
      <circle cx="30" cy="150" r="3" className="fill-slate-200" />
    </svg>
  );
}

function EmptyState({ onImport, onTemplate }) {
  const steps = [
    ['Add a supplier', 'Create hotels, riads, restaurants, guides and more.'],
    ['Or import in bulk', 'Upload a CSV or Excel file with your whole network.'],
    ['Track and manage', 'Filter by category, status, city and date added.'],
  ];
  return (
    <div className="px-6 py-12 text-center">
      <EmptyIllustration />
      <h2 className="mt-4 text-xl font-semibold text-slate-900">{translate('No suppliers yet')}</h2>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500">{translate('Your supplier network starts here. Add your first vendor or bring in an existing list.')}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/admin/suppliers/new"
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm ring-1 ring-inset ring-amber-600/20 hover:bg-amber-600"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />{translate('Add your first supplier')}</Link>
        <button type="button" onClick={onImport}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
          <Upload aria-hidden="true" className="h-4 w-4" />{translate('Import from CSV')}</button>
        <button type="button" onClick={onTemplate}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-amber-700 hover:bg-amber-50">
          <Download aria-hidden="true" className="h-4 w-4" />{translate('Get the template')}</button>
      </div>
      <ol className="mx-auto mt-10 grid max-w-3xl gap-3 text-left sm:grid-cols-3">
        {steps.map(([title, text], i) => (
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

function NoResults({ onClear }) {
  return (
    <div className="px-6 py-14 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400">
        <Search aria-hidden="true" className="h-6 w-6" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-slate-900">{translate('No suppliers match these filters')}</h2>
      <p className="mt-1 text-sm text-slate-500">{translate('Try a different search or remove some filters.')}</p>
      <button type="button" onClick={onClear}
        className="mt-5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">{translate('Clear all filters')}</button>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="divide-y divide-slate-100" role="status" aria-label="Loading suppliers">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex animate-pulse items-center gap-3 px-4 py-4">
          <div className="h-10 w-10 rounded-xl bg-slate-100" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-40 rounded bg-slate-100" />
            <div className="h-2.5 w-24 rounded bg-slate-100" />
          </div>
          <div className="hidden h-3 w-24 rounded bg-slate-100 sm:block" />
          <div className="h-5 w-16 rounded-full bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function SuppliersPage() {
  const { user, roles, rolePagePermissions, isManager, loading: authLoading } = useAuth();
  const canViewSuppliers = canUserAccessPath(roles, '/admin/suppliers', rolePagePermissions);
  const canManageSuppliers = isManager;
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(() => ({ ...emptyFilters }));
  const [filterDraft, setFilterDraft] = useState(() => ({ ...emptyFilters }));
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [importMenuOpen, setImportMenuOpen] = useState(false);
  const [importFormat, setImportFormat] = useState('csv');
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importRows, setImportRows] = useState([]);
  const [importFileName, setImportFileName] = useState('');
  const [importError, setImportError] = useState('');
  const [importing, setImporting] = useState(false);
  const [draggingFile, setDraggingFile] = useState(false);
  const [notice, setNotice] = useState('');
  const importFileRef = useRef(null);
  const importMenuRef = useRef(null);

  const debouncedSearch = useDebounced(search);
  const debouncedCity = useDebounced(filters.city);
  const appliedFilters = useMemo(() => ({ ...filters, city: debouncedCity }), [filters, debouncedCity]);

  const dateRangeInvalid = Boolean(filters.created_from && filters.created_to && filters.created_from > filters.created_to);
  const filterDraftDateRangeInvalid = Boolean(
    filterDraft.created_from && filterDraft.created_to && filterDraft.created_from > filterDraft.created_to,
  );

  useEffect(() => {
    let cancelled = false;

    async function loadSuppliers() {
      if (authLoading) {
        setLoading(true);
        return;
      }
      if (!user || !canViewSuppliers) {
        setSuppliers([]);
        setLoading(false);
        return;
      }
      if (dateRangeInvalid) return;

      setLoading(true);
      setError('');
      try {
        const data = await suppliersApi.getSuppliers({ search: debouncedSearch, filters: appliedFilters });
        if (!cancelled) setSuppliers(data);
      } catch (loadError) {
        if (!cancelled) setError(getErrorMessage(loadError, 'Unable to load suppliers.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSuppliers();
    return () => { cancelled = true; };
  }, [authLoading, user?.id, canViewSuppliers, debouncedSearch, appliedFilters, refreshKey, dateRangeInvalid]);

  useEffect(() => {
    function closeMenu(event) {
      if (importMenuRef.current && !importMenuRef.current.contains(event.target)) setImportMenuOpen(false);
    }
    document.addEventListener('mousedown', closeMenu);
    return () => document.removeEventListener('mousedown', closeMenu);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  /* ---------- import ---------- */
  function chooseImportFormat(format) {
    setImportFormat(format);
    setImportMenuOpen(false);
    setImportRows([]);
    setImportFileName('');
    setImportError('');
    setImportModalOpen(true);
  }

  function closeImport() {
    if (importing) return;
    setImportModalOpen(false);
    setImportRows([]);
    setImportFileName('');
    setImportError('');
  }

  async function parseImportFile(file) {
    const format = importFormat;
    const extension = file.name.split('.').pop()?.toLowerCase();
    const accepted = format === 'csv' ? ['csv'] : ['xlsx', 'xls'];
    if (!accepted.includes(extension)) {
      setImportError(`Choose a ${format.toUpperCase()} file.`);
      return;
    }

    setImportError('');
    try {
      const XLSX = await import('xlsx');
      let workbook;
      if (format === 'csv') {
        const csvText = (await file.text()).replace(/^\ufeff/, '');
        workbook = XLSX.read(csvText, { type: 'string', FS: getCsvDelimiter(csvText) });
      } else {
        workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      }
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) throw new Error('The selected file has no worksheets.');

      const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '', raw: false });
      if (!rawRows.length) throw new Error('The selected file has no data rows.');

      // FIX: normalize headers per row (BOM-safe) via shared helper
      const rows = rawRows.map((row) => normalizeRow(row));

      setImportRows(rows);
      setImportFileName(file.name);
      setImportFormat(format);
    } catch (parseError) {
      setImportError(getErrorMessage(parseError, 'Unable to read the selected file.'));
    }
  }

  function handleImportFile(event) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (file) parseImportFile(file);
  }

  function handleImportDrop(event) {
    event.preventDefault();
    setDraggingFile(false);
    const file = event.dataTransfer.files?.[0];
    if (file) parseImportFile(file);
  }

  async function downloadImportTemplate() {
    const headers = ['name', 'supplier_type', 'supplier_code', 'status', 'email', 'phone', 'website', 'address', 'city', 'country', 'notes'];
    const example = [
      'Example Supplier', 'hotel', 'SUP-100123', 'active', 'contact@example.com',
      '+212600000000', 'https://example.com', '12 Rue Medina', 'Marrakech', 'Morocco', 'Preferred partner',
    ];

    try {
      if (importFormat === 'csv') {
        const csv = [headers, example]
          .map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(','))
          .join('\r\n');
        // FIX: prepend UTF-8 BOM so Excel opens it without mangling accents
        const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = 'supplier-import-template.csv';
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 0);
        return;
      }

      const XLSX = await import('xlsx');
      const worksheet = XLSX.utils.aoa_to_sheet([headers, example]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Suppliers');
      XLSX.writeFile(workbook, 'supplier-import-template.xlsx');
    } catch (downloadError) {
      setImportError(getErrorMessage(downloadError, 'Unable to download the template.'));
    }
  }

  async function importSuppliers() {
    if (!importRows.length || importing) return;
    setImporting(true);
    setImportError('');
    try {
      const imported = await suppliersApi.importSuppliers(importRows);
      setSuppliers((current) => [...imported, ...current]);
      setImportRows([]);
      setImportFileName('');
      setNotice(`Imported ${imported.length} supplier${imported.length === 1 ? '' : 's'}.`);
      setImportModalOpen(false);
      setRefreshKey((key) => key + 1);
    } catch (importErr) {
      setImportError(getErrorMessage(importErr, 'Unable to import suppliers.'));
    } finally {
      setImporting(false);
    }
  }

  /* ---------- filters ---------- */
  const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value }));
  const openFilterModal = () => {
    setFilterDraft({ ...filters });
    setFilterModalOpen(true);
  };
  const applyFilterDraft = () => {
    if (filterDraftDateRangeInvalid) return;
    setFilters({ ...filterDraft });
    setFilterModalOpen(false);
  };
  const clearFilterDraft = () => setFilterDraft({ ...emptyFilters });
  const clearFilters = () => {
    setFilters({ ...emptyFilters });
    setFilterDraft({ ...emptyFilters });
    setSearch('');
    setFilterModalOpen(false);
  };

  const activeChips = [
    filters.supplier_type && { key: 'supplier_type', label: typeMeta(filters.supplier_type)?.[1] },
    filters.status && { key: 'status', label: filters.status },
    filters.city && { key: 'city', label: filters.city },
    filters.created_from && { key: 'created_from', label: `From ${filters.created_from}` },
    filters.created_to && { key: 'created_to', label: `To ${filters.created_to}` },
  ].filter(Boolean);
  const hasActiveQuery = activeChips.length > 0 || Boolean(search.trim());

  const cityOptions = useMemo(
    () => [...new Set(suppliers.map((s) => s.city).filter(Boolean))].sort(),
    [suppliers],
  );

  /* ---------- edit / delete ---------- */
  function startEditing(supplier) {
    setError('');
    setEditingSupplier(supplier);
    setEditForm({
      name: supplier.name || '',
      supplier_code: supplier.supplier_code || '',
      supplier_type: supplier.supplier_type || '',
      status: supplier.status || 'pending',
      email: supplier.email || '',
      phone: supplier.phone || '',
      website: supplier.website || '',
      address: supplier.address || '',
      city: supplier.city || '',
      country: supplier.country || '',
    });
  }

  function closeEditor() {
    if (savingEdit) return;
    setEditingSupplier(null);
    setEditForm(null);
  }

  async function saveSupplier(event) {
    event.preventDefault();
    if (!editingSupplier || !editForm || savingEdit) return;
    if (!editForm.name.trim()) {
      setError('Supplier name is required.');
      return;
    }

    setSavingEdit(true);
    setError('');
    try {
      const updated = await suppliersApi.updateSupplier(editingSupplier.id, {
        ...editForm,
        name: editForm.name.trim(),
        supplier_code: editForm.supplier_code.trim() || null,
        email: editForm.email.trim() || null,
        phone: editForm.phone.trim() || null,
        website: editForm.website.trim() || null,
        address: editForm.address.trim() || null,
        city: editForm.city.trim() || null,
        country: editForm.country.trim() || null,
      });
      setSuppliers((current) => current.map((s) => (s.id === updated.id ? updated : s)));
      setEditingSupplier(null);
      setEditForm(null);
    } catch (saveError) {
      setError(getErrorMessage(saveError, 'Unable to update supplier.'));
    } finally {
      setSavingEdit(false);
    }
  }

  async function deleteSupplier(supplier) {
    if (!window.confirm(`Delete ${supplier.name}? It will be hidden from the suppliers list.`)) return;
    setError('');
    try {
      await suppliersApi.softDeleteSupplier(supplier.id);
      setSuppliers((current) => current.filter((item) => item.id !== supplier.id));
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, 'Unable to delete supplier.'));
    }
  }

  /* ---------- derived ---------- */
  const stats = useMemo(() => ({
    total: suppliers.length,
    active: suppliers.filter((s) => s.status === 'active').length,
    pending: suppliers.filter((s) => s.status === 'pending').length,
    cities: new Set(suppliers.map((s) => s.city).filter(Boolean)).size,
  }), [suppliers]);

  const blocked = authLoading || !user || !canViewSuppliers;
  const showEmpty = !loading && !error && suppliers.length === 0 && !blocked;

  return (
    <main className="mx-auto w-full max-w-7xl space-y-5 p-4 sm:p-6">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 text-amber-600 ring-1 ring-inset ring-amber-200">
            <Building2 aria-hidden="true" className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{translate('Suppliers')}</h1>
            <p className="mt-0.5 text-sm text-slate-500">{translate('Manage your supplier and vendor network.')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRefreshKey((key) => key + 1)}
            disabled={loading || blocked}
            aria-label="Refresh suppliers"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw aria-hidden="true" className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{translate('Refresh')}</span>
          </button>
          {canManageSuppliers && <div className="relative flex" ref={importMenuRef}>
            <Link
              to="/admin/suppliers/new"
              className="inline-flex items-center gap-2 rounded-l-lg bg-amber-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-600"
            >
              <Plus aria-hidden="true" className="h-4 w-4" />{translate('Add supplier')}</Link>
            <button
              type="button"
              aria-label="Choose supplier import format"
              aria-haspopup="menu"
              aria-expanded={importMenuOpen}
              onClick={() => setImportMenuOpen((open) => !open)}
              className="rounded-r-lg border-l border-amber-600/40 bg-amber-500 px-2.5 text-white hover:bg-amber-600"
            >
              <ChevronDown aria-hidden="true" className={`h-4 w-4 transition-transform ${importMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {importMenuOpen && (
              <div role="menu" className="absolute right-0 top-full z-30 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                <button type="button" role="menuitem" onClick={() => chooseImportFormat('csv')}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
                  <Upload aria-hidden="true" className="h-4 w-4 text-slate-400" />{translate('Import from CSV')}</button>
                <button type="button" role="menuitem" onClick={() => chooseImportFormat('xlsx')}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
                  <FileSpreadsheet aria-hidden="true" className="h-4 w-4 text-slate-400" />{translate('Import from Excel (.xlsx)')}</button>
              </div>
            )}
          </div>}
        </div>
      </header>

      {notice && (
        <p role="status" className="flex items-center justify-between gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 ring-1 ring-inset ring-emerald-200">
          {notice}
          <button type="button" onClick={() => setNotice('')} aria-label="Dismiss" className="rounded p-0.5 hover:bg-emerald-100">
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </p>
      )}

      {/* Stats (only once there is data) */}
      {!blocked && !error && (suppliers.length > 0 || hasActiveQuery) && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label={hasActiveQuery ? 'Matching suppliers' : 'Total suppliers'} value={stats.total} bar="bg-amber-500" />
          <StatCard label="Active" value={stats.active} tone="text-emerald-700" bar="bg-emerald-500" />
          <StatCard label="Pending review" value={stats.pending} tone="text-amber-700" bar="bg-amber-400" />
          <StatCard label="Cities" value={stats.cities} bar="bg-slate-300" />
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {!blocked && (
          <div className="space-y-3 border-b border-slate-200 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <label className="relative block min-w-0 flex-1">
                <span className="sr-only">{translate('Search suppliers')}</span>
                <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, code, or email..." className={`${inputCls} pl-9`} />
              </label>
              <button type="button" onClick={openFilterModal} aria-haspopup="dialog" aria-expanded={filterModalOpen}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
                <Filter aria-hidden="true" className="h-4 w-4" />
                Filters
                {activeChips.length > 0 && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">{activeChips.length}</span>
                )}
              </button>
            </div>

            {hasActiveQuery && (
              <div className="flex flex-wrap items-center gap-2">
                {activeChips.map((chip) => (
                  <button key={chip.key} type="button" onClick={() => setFilter(chip.key, '')}
                    className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium capitalize text-amber-800 ring-1 ring-inset ring-amber-200 hover:bg-amber-100">
                    {chip.label}
                    <X aria-hidden="true" className="h-3 w-3" />
                    <span className="sr-only">{translate('Remove filter')}</span>
                  </button>
                ))}
                <button type="button" onClick={clearFilters} className="px-1 text-xs font-medium text-slate-500 hover:text-slate-800">{translate('Clear all')}</button>
              </div>
            )}
          </div>
        )}

        {/* Body */}
        {authLoading ? (
          <p role="status" className="p-6 text-sm text-slate-500">{translate('Checking your sign-in...')}</p>
        ) : !user ? (
          <p className="p-6 text-sm text-slate-600">
            Sign in with an admin account to view suppliers.{' '}
            <Link to="/auth/admin-login" className="font-medium text-amber-700 hover:underline">{translate('Sign in')}</Link>
          </p>
        ) : !canViewSuppliers ? (
          <p role="alert" className="p-6 text-sm text-red-700">{translate('Your role does not have access to the suppliers page.')}</p>
        ) : error && !editingSupplier ? (
          <p role="alert" className="m-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">{error}</p>
        ) : loading ? (
          <Skeleton />
        ) : showEmpty ? (
          hasActiveQuery ? (
            <NoResults onClear={clearFilters} />
          ) : canManageSuppliers ? (
            <EmptyState onImport={() => chooseImportFormat('csv')} onTemplate={() => { chooseImportFormat('csv'); }} />
          ) : (
            <p className="p-6 text-sm text-slate-500">{translate('No suppliers are available to your account.')}</p>
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">{translate('Supplier')}</th>
                  <th className="px-4 py-3 font-medium">{translate('Category')}</th>
                  <th className="px-4 py-3 font-medium">{translate('Location')}</th>
                  <th className="px-4 py-3 font-medium">{translate('Contact')}</th>
                  <th className="px-4 py-3 font-medium">{translate('Status')}</th>
                  <th className="px-4 py-3 text-right font-medium">{translate('Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {suppliers.map((supplier) => (
                  <tr key={supplier.id} className="transition-colors hover:bg-amber-50/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <TypeAvatar type={supplier.supplier_type} />
                        <div className="min-w-0">
                          <Link to={`/admin/suppliers/${supplier.id}`} className="block truncate font-medium text-slate-900 hover:text-amber-700">
                            {supplier.name}
                          </Link>
                          {supplier.supplier_code && <p className="text-xs text-slate-400">{supplier.supplier_code}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {typeMeta(supplier.supplier_type)?.[1] || supplier.supplier_type || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin aria-hidden="true" className="h-3.5 w-3.5 text-slate-400" />
                        {[supplier.city, supplier.country].filter(Boolean).join(', ') || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div className="flex items-center gap-1.5"><Mail aria-hidden="true" className="h-3.5 w-3.5 text-slate-400" />{supplier.email || '—'}</div>
                      {supplier.phone && (
                        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
                          <Phone aria-hidden="true" className="h-3 w-3" />{supplier.phone}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3"><StatusPill status={supplier.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Link to={`/admin/suppliers/${supplier.id}`}
                          className="rounded-md px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100">{translate('View')}</Link>
                        {canManageSuppliers && (
                          <>
                            <button type="button" onClick={() => startEditing(supplier)}
                              className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50">
                              <Pencil aria-hidden="true" className="h-3.5 w-3.5" />{translate('Edit')}</button>
                            <button type="button" onClick={() => deleteSupplier(supplier)}
                              className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50">
                              <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />{translate('Delete')}</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Supplier filters modal */}
      {filterModalOpen && (
        <Modal onClose={() => setFilterModalOpen(false)} labelledBy="supplier-filters-title">
          <ModalHeader
            id="supplier-filters-title"
            title="Filter suppliers"
            subtitle="Choose any combination of category, status, city and date added."
            onClose={() => setFilterModalOpen(false)}
          />
          <div className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Category
                <select value={filterDraft.supplier_type}
                  onChange={(e) => setFilterDraft((draft) => ({ ...draft, supplier_type: e.target.value }))}
                  className={`${inputCls} mt-1.5`}>
                  <option value="">{translate('All categories')}</option>
                  {supplierTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700">
                Status
                <select value={filterDraft.status}
                  onChange={(e) => setFilterDraft((draft) => ({ ...draft, status: e.target.value }))}
                  className={`${inputCls} mt-1.5 capitalize`}>
                  <option value="">{translate('All statuses')}</option>
                  {supplierStatuses.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                City
                <input list="supplier-cities" value={filterDraft.city}
                  onChange={(e) => setFilterDraft((draft) => ({ ...draft, city: e.target.value }))}
                  placeholder="Any city" className={`${inputCls} mt-1.5`} />
                <datalist id="supplier-cities">
                  {cityOptions.map((city) => <option key={city} value={city} />)}
                </datalist>
              </label>
              <label className="text-sm font-medium text-slate-700">
                Added from
                <input type="date" value={filterDraft.created_from}
                  onChange={(e) => setFilterDraft((draft) => ({ ...draft, created_from: e.target.value }))}
                  className={`${inputCls} mt-1.5`} />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Added to
                <input type="date" value={filterDraft.created_to}
                  min={filterDraft.created_from || undefined}
                  onChange={(e) => setFilterDraft((draft) => ({ ...draft, created_to: e.target.value }))}
                  className={`${inputCls} mt-1.5`} />
              </label>
            </div>
            {filterDraftDateRangeInvalid && (
              <p role="alert" className="text-sm text-red-700">{translate('The start date must be on or before the end date.')}</p>
            )}
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" onClick={clearFilterDraft}
                className="mr-auto rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">{translate('Clear filters')}</button>
              <button type="button" onClick={() => setFilterModalOpen(false)}
                className="rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">{translate('Cancel')}</button>
              <button type="button" onClick={applyFilterDraft} disabled={filterDraftDateRangeInvalid}
                className="rounded-lg bg-amber-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50">{translate('Apply filters')}</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Import modal */}
      {importModalOpen && (
        <Modal onClose={closeImport} labelledBy="supplier-import-title" wide>
          <ModalHeader id="supplier-import-title" title={`Import suppliers from ${importFormat.toUpperCase()}`}
            subtitle="Required columns: name and supplier_type." onClose={closeImport} />
          <div className="p-5">
            <p className="text-sm text-slate-500">{translate('Optional columns: supplier_code, status, email, phone, website, address, city, country, notes.')}</p>
            <button type="button" onClick={downloadImportTemplate}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
              <Download aria-hidden="true" className="h-4 w-4" />
              Download {importFormat.toUpperCase()} template
            </button>

            <div
              onDragOver={(e) => { e.preventDefault(); setDraggingFile(true); }}
              onDragLeave={() => setDraggingFile(false)}
              onDrop={handleImportDrop}
              className={`mt-4 rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
                draggingFile ? 'border-amber-500 bg-amber-50' : 'border-slate-300 bg-slate-50 hover:border-amber-400'
              }`}
            >
              <input ref={importFileRef} type="file" accept={importFormat === 'csv' ? '.csv,text/csv' : '.xlsx,.xls'}
                onChange={handleImportFile} className="sr-only" />
              <Upload aria-hidden="true" className="mx-auto h-8 w-8 text-amber-600" />
              <p className="mt-2 text-sm font-medium text-slate-800">Drag and drop your {importFormat.toUpperCase()} file here</p>
              <button type="button" onClick={() => importFileRef.current?.click()}
                className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">{translate('Browse files')}</button>
            </div>

            {importFileName && (
              <p className="mt-3 text-sm text-slate-600">
                {importFileName}: {importRows.length} supplier{importRows.length === 1 ? '' : 's'} ready
              </p>
            )}

            {/* FIX: show every imported column so you can confirm parsing worked */}
            {importRows.length > 0 && (
              <div className="mt-3 max-h-56 overflow-auto rounded-lg border border-slate-200">
                <table className="w-full min-w-[720px] text-left text-xs">
                  <thead className="sticky top-0 bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-3 py-2">{translate('Name')}</th>
                      <th className="px-3 py-2">{translate('Type')}</th>
                      <th className="px-3 py-2">{translate('Code')}</th>
                      <th className="px-3 py-2">{translate('Status')}</th>
                      <th className="px-3 py-2">{translate('Email')}</th>
                      <th className="px-3 py-2">{translate('Phone')}</th>
                      <th className="px-3 py-2">{translate('City')}</th>
                      <th className="px-3 py-2">{translate('Country')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {importRows.slice(0, 10).map((row, index) => (
                      <tr key={`${row.name || 'row'}-${index}`}>
                        <td className="px-3 py-2 font-medium text-slate-800">{row.name || '—'}</td>
                        <td className="px-3 py-2">{row.supplier_type || '—'}</td>
                        <td className="px-3 py-2">{row.supplier_code || '—'}</td>
                        <td className="px-3 py-2 capitalize">{row.status || '—'}</td>
                        <td className="px-3 py-2">{row.email || '—'}</td>
                        <td className="px-3 py-2">{row.phone || '—'}</td>
                        <td className="px-3 py-2">{row.city || '—'}</td>
                        <td className="px-3 py-2">{row.country || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {importRows.length > 10 && (
                  <p className="border-t border-slate-100 px-3 py-2 text-xs text-slate-500">
                    And {importRows.length - 10} more...
                  </p>
                )}
              </div>
            )}

            {importError && (
              <pre role="alert" className="mt-3 whitespace-pre-wrap rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-200">
                {importError}
              </pre>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={closeImport} disabled={importing}
                className="rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50">{translate('Cancel')}</button>
              <button type="button" onClick={importSuppliers} disabled={importing || !importRows.length}
                className="rounded-lg bg-amber-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50">
                {importing ? 'Importing...' : importRows.length ? `Import ${importRows.length} supplier${importRows.length === 1 ? '' : 's'}` : 'Import suppliers'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit modal */}
      {editingSupplier && editForm && (
        <Modal onClose={closeEditor} labelledBy="edit-supplier-title" wide>
          <form onSubmit={saveSupplier}>
            <ModalHeader id="edit-supplier-title" title="Edit supplier" subtitle={editingSupplier.name} onClose={closeEditor} />
            <div className="p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  Name
                  <input required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className={`${inputCls} mt-1.5 font-normal`} />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Supplier code
                  <input value={editForm.supplier_code} onChange={(e) => setEditForm({ ...editForm, supplier_code: e.target.value })}
                    className={`${inputCls} mt-1.5 font-normal`} />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Category
                  <select value={editForm.supplier_type} onChange={(e) => setEditForm({ ...editForm, supplier_type: e.target.value })}
                    className={`${inputCls} mt-1.5 font-normal`}>
                    <option value="">{translate('Select category')}</option>
                    {supplierTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Status
                  <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className={`${inputCls} mt-1.5 font-normal capitalize`}>
                    {supplierStatuses.map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                </label>
                {['email', 'phone', 'website', 'address', 'city', 'country'].map((field) => (
                  <label key={field} className="text-sm font-medium capitalize text-slate-700">
                    {field}
                    <input type={field === 'email' ? 'email' : field === 'website' ? 'url' : 'text'}
                      value={editForm[field]} onChange={(e) => setEditForm({ ...editForm, [field]: e.target.value })}
                      className={`${inputCls} mt-1.5 font-normal`} />
                  </label>
                ))}
              </div>
              {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={closeEditor} disabled={savingEdit}
                  className="rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50">{translate('Cancel')}</button>
                <button type="submit" disabled={savingEdit}
                  className="rounded-lg bg-amber-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50">
                  {savingEdit ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </main>
  );
}