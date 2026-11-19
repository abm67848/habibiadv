import { useAppSettings, translate, useAuth } from '@/context/index.jsx';
import React, { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Calendar as CalendarIcon, Search, Plus, DollarSign, Users, Compass, CheckCircle2,
  Clock, AlertCircle, XCircle, Phone, Mail, RefreshCw, X, AlertTriangle, Copy, Check,
  FileText, ChevronRight, ChevronDown, ArrowUpRight, StickyNote, MessageSquare, Wallet,
  UserPlus, UserCheck, Upload, Trash2, Edit, Download, File, Image as ImageIcon, Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';


/* ---------- Shared style tokens ---------- */
const inputCls =
  'w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition';
const labelCls = 'block text-xs font-medium text-slate-600 mb-1.5';
const btnGhost =
  'inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition';
const btnPrimary =
  'inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-500 shadow-sm transition disabled:opacity-50';
const btnDanger =
  'inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition';

const BOOKING_STATUS = {
  pending: { label: 'Pending', dot: 'bg-amber-500', cls: 'bg-amber-50 text-amber-800 ring-amber-200', icon: AlertCircle },
  confirmed: { label: 'Confirmed', dot: 'bg-emerald-500', cls: 'bg-emerald-50 text-emerald-800 ring-emerald-200', icon: CheckCircle2 },
  in_progress: { label: 'In progress', dot: 'bg-sky-500', cls: 'bg-sky-50 text-sky-800 ring-sky-200', icon: Clock },
  completed: { label: 'Completed', dot: 'bg-violet-500', cls: 'bg-violet-50 text-violet-800 ring-violet-200', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', dot: 'bg-rose-500', cls: 'bg-rose-50 text-rose-800 ring-rose-200', icon: XCircle },
};

const PAYMENT_STATUS = {
  paid: { label: 'Paid', dot: 'bg-emerald-500', cls: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  partially_paid: { label: 'Partially paid', dot: 'bg-amber-500', cls: 'bg-amber-50 text-amber-800 ring-amber-200' },
  overpaid: { label: 'Overpaid', dot: 'bg-violet-500', cls: 'bg-violet-50 text-violet-800 ring-violet-200' },
  unpaid: { label: 'Unpaid', dot: 'bg-rose-500', cls: 'bg-rose-50 text-rose-800 ring-rose-200' },
};

const BOOKING_STATUS_OPTIONS = Object.entries(BOOKING_STATUS).map(([value, v]) => ({ value, label: v.label, dot: v.dot }));
const PAYMENT_STATUS_OPTIONS = Object.entries(PAYMENT_STATUS).map(([value, v]) => ({ value, label: v.label, dot: v.dot }));
const CURRENCY_OPTIONS = ['MAD', 'EUR', 'USD'].map((c) => ({ value: c, label: c }));
const METHOD_OPTIONS = [
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
];
const TXN_TYPE_OPTIONS = [
  { value: 'payment', label: 'Payment', hint: 'Adds to the amount paid', dot: 'bg-emerald-500' },
  { value: 'refund', label: 'Refund', hint: 'Subtracts from the amount paid', dot: 'bg-rose-500' },
];
const TXN_STATUS_OPTIONS = [
  { value: 'completed', label: 'Completed', hint: 'Locked once saved', dot: 'bg-emerald-500' },
  { value: 'pending', label: 'Pending', dot: 'bg-amber-500' },
  { value: 'failed', label: 'Failed', dot: 'bg-rose-500' },
];
const INITIAL_STATUS_OPTIONS = BOOKING_STATUS_OPTIONS.filter((o) => ['pending', 'confirmed'].includes(o.value));

const EMPTY_FORM = (userId) => ({
  customer_id: '', destination: '', departure_date: '', return_date: '', traveler_count: 1,
  total_amount: '', currency: 'MAD', booking_status: 'pending', assigned_to: userId || '',
  special_requests: '', internal_notes: '', initial_payment_amount: '',
  payment_method: 'bank_transfer', payment_notes: 'Initial booking deposit',
});

const EMPTY_CUSTOMER = {
  first_name: '', last_name: '', phone: '', email: '', country: '',
};

const EMPTY_PAYMENT = {
  amount: '', payment_method: 'bank_transfer', transaction_status: 'completed',
  transaction_type: 'payment', transaction_reference: '', notes: '',
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : 'TBD';
const fmtMoney = (n) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
const fmtBytes = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};
const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('') || '?';

/* ---------- Small presentational pieces ---------- */
function StatusBadge({ status }) {
  const s = BOOKING_STATUS[status] || BOOKING_STATUS.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${s.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function PaymentBadge({ status }) {
  const s = PAYMENT_STATUS[status] || PAYMENT_STATUS.unpaid;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${s.cls}`}>
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

function PaidBar({ paid, total }) {
  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  return (
    <div className="w-full">
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[11px] text-slate-400 mt-1">{pct}% collected</p>
    </div>
  );
}

/* ---------- Custom dropdown ---------- */
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

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (triggerRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onScroll = (e) => {
      if (menuRef.current?.contains(e.target)) return;
      place();
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', place);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', place);
    };
  }, [open, place]);

  useEffect(() => {
    if (open && searchable) searchRef.current?.focus();
  }, [open, searchable]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
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
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        openMenu();
      }
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
          {selected?.avatar && <Avatar name={selected.label} size="w-5 h-5 text-[9px]" />}
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
      <button onClick={onClose} className="p-1.5 -mr-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition" aria-label="Close">
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

function SectionTitle({ icon: Icon, children }) {
  return (
    <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
      <Icon className="w-4 h-4 text-amber-600" /> {children}
    </h4>
  );
}

/* ---------- Page ---------- */
export default function ReservationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [reservations, setReservations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [payments, setPayments] = useState([]);
  const [financials, setFinancials] = useState([]);
  const [documents, setDocuments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [bookingStatusFilter, setBookingStatusFilter] = useState('ALL');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('ALL');
  const [destinationFilter, setDestinationFilter] = useState('ALL');
  const [employeeFilter, setEmployeeFilter] = useState('ALL');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailClosing, setDetailClosing] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [copiedSql, setCopiedSql] = useState(false);

  const [formData, setFormData] = useState(EMPTY_FORM(user?.id));
  const [customerMode, setCustomerMode] = useState('existing');
  const [newCustomer, setNewCustomer] = useState(EMPTY_CUSTOMER);
  const [paymentData, setPaymentData] = useState(EMPTY_PAYMENT);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // File upload state
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const flash = (msg, ms = 4000) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), ms);
  };

  const openCreateModal = () => {
    setFormData(EMPTY_FORM(user?.id));
    setCustomerMode('existing');
    setNewCustomer(EMPTY_CUSTOMER);
    setError(null);
    setIsCreateModalOpen(true);
  };

  /* ----- Data ----- */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [bookingsRes, customersRes, profilesRes, paymentsRes, financialsRes, docsRes] = await Promise.all([
        supabase.from('bookings').select('*').order('created_at', { ascending: false }),
        supabase.from('customers').select('*').order('full_name', { ascending: true }),
        supabase.from('profiles').select('*'),
        supabase.from('booking_payments').select('*'),
        supabase.from('booking_financials').select('*'),
        supabase.from('booking_documents').select('*').order('created_at', { ascending: false }),
      ]);
      if (bookingsRes.error) throw bookingsRes.error;
      if (customersRes.error) throw customersRes.error;

      setReservations(bookingsRes.data || []);
      setCustomers(customersRes.data || []);
      setProfiles(profilesRes.data || []);
      setPayments(paymentsRes.error ? [] : paymentsRes.data || []);
      setFinancials(financialsRes.error ? [] : financialsRes.data || []);
      setDocuments(docsRes.error ? [] : docsRes.data || []);
    } catch (err) {
      console.error('Error fetching reservations data:', err);
      setError('Could not load reservations. Check that the booking schema migrations have been applied in Supabase.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel('admin-bookings-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'booking_documents' }, fetchData)
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Realtime booking updates unavailable:', status);
        }
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const enrichedReservations = useMemo(() => {
    return reservations.map((res) => {
      const customer = customers.find((c) => c.id === res.customer_id) || { full_name: 'Unknown customer', phone: '', email: '' };
      const assignedProfile = profiles.find((p) => p.id === res.assigned_to) || { full_name: 'Unassigned' };
      const fin = financials.find((f) => f.booking_id === res.id) || {};
      const resPayments = payments.filter((p) => p.booking_id === res.id);
      const resDocuments = documents.filter((d) => d.booking_id === res.id);

      const totalPaid =
        fin.net_paid !== undefined
          ? Number(fin.net_paid)
          : resPayments
              .filter((p) => p.transaction_status === 'completed')
              .reduce((sum, p) => sum + (p.transaction_type === 'payment' ? Number(p.amount) : -Number(p.amount)), 0);

      const totalAmount = Number(res.total_amount || 0);
      const balance = fin.outstanding_balance !== undefined ? Number(fin.outstanding_balance) : Math.max(0, totalAmount - totalPaid);

      let paymentStatus = fin.payment_status;
      if (paymentStatus === undefined) {
        if (totalPaid >= totalAmount && totalAmount > 0) paymentStatus = 'paid';
        else if (totalPaid > 0) paymentStatus = 'partially_paid';
        else paymentStatus = 'unpaid';
      }

      return { ...res, customer, assignedProfile, totalPaid, balance, paymentStatus, resPayments, resDocuments };
    });
  }, [reservations, customers, profiles, payments, financials, documents]);

  const selectedReservation = useMemo(
    () => enrichedReservations.find((r) => r.id === selectedId) || null,
    [enrichedReservations, selectedId]
  );

  const stats = useMemo(() => ({
    total: enrichedReservations.length,
    confirmed: enrichedReservations.filter((r) => r.booking_status === 'confirmed').length,
    pending: enrichedReservations.filter((r) => r.booking_status === 'pending').length,
    outstanding: enrichedReservations.reduce((sum, r) => sum + r.balance, 0),
  }), [enrichedReservations]);

  const uniqueDestinations = useMemo(
    () => Array.from(new Set(enrichedReservations.map((r) => r.destination).filter(Boolean))),
    [enrichedReservations]
  );

  /* ----- Dropdown option lists ----- */
  const destinationOptions = useMemo(
    () => [{ value: 'ALL', label: 'All' }, ...uniqueDestinations.map((d) => ({ value: d, label: d }))],
    [uniqueDestinations]
  );
  const employeeOptions = useMemo(
    () => [
      { value: 'ALL', label: 'Everyone' },
      ...profiles.map((p) => ({ value: p.id, label: p.full_name || p.email || 'Employee', hint: p.full_name ? p.email : undefined, avatar: true })),
    ],
    [profiles]
  );
  const assignOptions = useMemo(
    () => [
      { value: '', label: 'Unassigned' },
      ...profiles.map((p) => ({ value: p.id, label: p.full_name || p.email || 'Employee', hint: p.full_name ? p.email : undefined, avatar: true })),
    ],
    [profiles]
  );
  const customerOptions = useMemo(
    () => customers.map((c) => ({ value: c.id, label: c.full_name, hint: c.phone || c.email || 'No contact info', avatar: true })),
    [customers]
  );

  const filteredReservations = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return enrichedReservations.filter((res) => {
      const matchesSearch =
        !q ||
        res.booking_reference?.toLowerCase().includes(q) ||
        res.customer?.full_name?.toLowerCase().includes(q) ||
        res.customer?.phone?.includes(searchQuery) ||
        res.destination?.toLowerCase().includes(q) ||
        res.offer_title?.toLowerCase().includes(q) ||
        res.offer_reference?.toLowerCase().includes(q);
      return (
        matchesSearch &&
        (bookingStatusFilter === 'ALL' || res.booking_status === bookingStatusFilter) &&
        (paymentStatusFilter === 'ALL' || res.paymentStatus === paymentStatusFilter) &&
        (destinationFilter === 'ALL' || res.destination === destinationFilter) &&
        (employeeFilter === 'ALL' || res.assigned_to === employeeFilter)
      );
    });
  }, [enrichedReservations, searchQuery, bookingStatusFilter, paymentStatusFilter, destinationFilter, employeeFilter]);

  const hasFilters = searchQuery || bookingStatusFilter !== 'ALL' || paymentStatusFilter !== 'ALL' || destinationFilter !== 'ALL' || employeeFilter !== 'ALL';

  /* ----- Detail sheet open / close ----- */
  const openDetail = (res) => {
    setSelectedId(res.id);
    setDetailClosing(false);
    setIsDetailOpen(true);
  };

  const closeDetail = useCallback(() => {
    setDetailClosing(true);
    setTimeout(() => {
      setIsDetailOpen(false);
      setDetailClosing(false);
    }, 260);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (isPaymentModalOpen) setIsPaymentModalOpen(false);
      else if (isCreateModalOpen) setIsCreateModalOpen(false);
      else if (isEditModalOpen) setIsEditModalOpen(false);
      else if (isDeleteModalOpen) setIsDeleteModalOpen(false);
      else if (isSqlModalOpen) setIsSqlModalOpen(false);
      else if (isDetailOpen) closeDetail();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isPaymentModalOpen, isCreateModalOpen, isEditModalOpen, isDeleteModalOpen, isSqlModalOpen, isDetailOpen, closeDetail]);

  useEffect(() => {
    document.body.style.overflow = isDetailOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isDetailOpen]);

  /* ----- Actions ----- */
  const handleCreateReservation = async (e) => {
    e.preventDefault();
    if ((customerMode === 'existing' && !formData.customer_id) ||
      (customerMode === 'new' && (!newCustomer.first_name.trim() || !newCustomer.last_name.trim() || !newCustomer.phone.trim())) ||
      formData.total_amount === '' || !formData.departure_date) {
      setError('Complete the customer details, departure date and total amount.');
      return;
    }
    try {
      setFormSubmitting(true);
      setError(null);

      let customerId = formData.customer_id;
      if (customerMode === 'new') {
        const firstName = newCustomer.first_name.trim();
        const lastName = newCustomer.last_name.trim();
        const { data: createdCustomer, error: customerError } = await supabase
          .from('customers')
          .insert([{
            first_name: firstName,
            last_name: lastName,
            full_name: `${firstName} ${lastName}`,
            phone: newCustomer.phone.trim(),
            email: newCustomer.email.trim() || null,
            country: newCustomer.country.trim() || null,
            customer_status: 'active',
            customer_source: 'admin_booking',
            created_by: user?.id,
          }])
          .select('id, full_name, phone, email')
          .single();
        if (customerError) throw customerError;
        if (!createdCustomer) throw new Error('The new customer record was not returned.');

        customerId = createdCustomer.id;
        setCustomers((current) => [createdCustomer, ...current.filter((customer) => customer.id !== createdCustomer.id)]);
        setCustomerMode('existing');
        setFormData((current) => ({ ...current, customer_id: createdCustomer.id }));
      }

      const { data: insertedBooking, error: insertError } = await supabase
        .from('bookings')
        .insert([{
          customer_id: customerId,
          destination: formData.destination || 'General Trip',
          departure_date: formData.departure_date,
          return_date: formData.return_date || null,
          traveler_count: Number(formData.traveler_count) || 1,
          total_amount: Number(formData.total_amount),
          currency: formData.currency || 'MAD',
          booking_status: formData.booking_status || 'pending',
          assigned_to: formData.assigned_to || user?.id || null,
          special_requests: formData.special_requests || null,
          internal_notes: formData.internal_notes || null,
          created_by: user?.id,
        }])
        .select()
        .single();
      if (insertError) throw insertError;

      if (Number(formData.initial_payment_amount) > 0 && insertedBooking) {
        const { error: paymentError } = await supabase.from('booking_payments').insert([{
          booking_id: insertedBooking.id,
          transaction_type: 'payment',
          amount: Number(formData.initial_payment_amount),
          currency: formData.currency || 'MAD',
          payment_method: formData.payment_method,
          transaction_status: 'completed',
          notes: formData.payment_notes,
          recorded_by: user?.id,
        }]);
        if (paymentError) console.error('Error inserting initial payment:', paymentError);
      }

      flash('Reservation created.');
      setIsCreateModalOpen(false);
      setFormData(EMPTY_FORM(user?.id));
      setCustomerMode('existing');
      setNewCustomer(EMPTY_CUSTOMER);
      await fetchData();
    } catch (err) {
      console.error('Error creating reservation:', err);
      setError('Could not create the reservation: ' + (err.message || 'Unknown error'));
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditReservation = async (e) => {
    e.preventDefault();
    if (!selectedReservation) return;
    try {
      setFormSubmitting(true);
      setError(null);
      const { error: updateError } = await supabase.from('bookings').update({
        destination: formData.destination,
        departure_date: formData.departure_date,
        return_date: formData.return_date || null,
        traveler_count: Number(formData.traveler_count) || 1,
        total_amount: Number(formData.total_amount),
        currency: formData.currency || 'MAD',
        booking_status: formData.booking_status,
        assigned_to: formData.assigned_to || null,
        special_requests: formData.special_requests || null,
        internal_notes: formData.internal_notes || null,
      }).eq('id', selectedReservation.id);

      if (updateError) throw updateError;
      flash('Reservation updated successfully.');
      setIsEditModalOpen(false);
      await fetchData();
    } catch (err) {
      console.error('Error updating reservation:', err);
      setError('Could not update the reservation: ' + (err.message || 'Unknown error'));
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteReservation = async () => {
    if (!selectedReservation) return;
    try {
      setFormSubmitting(true);
      const { error: delError } = await supabase.from('bookings').delete().eq('id', selectedReservation.id);
      if (delError) throw delError;
      
      flash('Reservation deleted.');
      setIsDeleteModalOpen(false);
      closeDetail();
      await fetchData();
    } catch (err) {
      console.error('Error deleting reservation:', err);
      setError('Could not delete the reservation: ' + (err.message || 'Unknown error'));
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    if (!selectedReservation || !paymentData.amount) return;
    try {
      setFormSubmitting(true);
      setError(null);
      const { error: paymentError } = await supabase.from('booking_payments').insert([{
        booking_id: selectedReservation.id,
        transaction_type: paymentData.transaction_type,
        amount: Number(paymentData.amount),
        currency: selectedReservation.currency || 'MAD',
        payment_method: paymentData.payment_method,
        transaction_status: paymentData.transaction_status,
        transaction_reference: paymentData.transaction_reference || null,
        notes: paymentData.notes || null,
        recorded_by: user?.id,
      }]);
      if (paymentError) throw paymentError;

      flash('Transaction recorded.');
      setIsPaymentModalOpen(false);
      setPaymentData(EMPTY_PAYMENT);
      await fetchData();
    } catch (err) {
      console.error('Error recording payment:', err);
      setError('Could not record the transaction: ' + (err.message || 'Unknown error'));
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleUpdateStatus = async (reservationId, newStatus) => {
    try {
      setError(null);
      const { error: updateError } = await supabase.from('bookings').update({ booking_status: newStatus }).eq('id', reservationId);
      if (updateError) throw updateError;
      flash(`Status changed to ${BOOKING_STATUS[newStatus]?.label || newStatus}.`, 3000);
      await fetchData();
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Could not update the booking status.');
    }
  };

  /* ----- Document Upload & Delete ----- */
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedReservation) return;

    try {
      setIsUploading(true);
      setError(null);

      // Generate a unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedReservation.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // 1. Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from('booking-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // 2. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('booking-documents')
        .getPublicUrl(fileName);

      // 3. Save record in DB
      const { error: dbError } = await supabase.from('booking_documents').insert([{
        booking_id: selectedReservation.id,
        file_name: file.name,
        file_url: publicUrl,
        file_size: file.size,
        file_type: file.type,
        uploaded_by: user?.id,
      }]);

      if (dbError) throw dbError;

      flash('Document uploaded successfully.');
      await fetchData();
    } catch (err) {
      console.error('Upload error:', err);
      setError('Could not upload the document: ' + (err.message || 'Unknown error'));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteDocument = async (docId, fileUrl) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    
    try {
      setError(null);
      
      // 1. Delete from DB
      const { error: dbError } = await supabase.from('booking_documents').delete().eq('id', docId);
      if (dbError) throw dbError;

      // 2. Delete from Storage (optional but good practice)
      // Extract file path from publicUrl if possible
      const filePath = fileUrl.split('/').slice(-2).join('/');
      if (filePath) {
        await supabase.storage.from('booking-documents').remove([filePath]);
      }

      flash('Document deleted.');
      await fetchData();
    } catch (err) {
      console.error('Delete doc error:', err);
      setError('Could not delete the document: ' + (err.message || 'Unknown error'));
    }
  };

  const sqlMigrationCode = `-- Migration snippet for Documents tracking`;

  const statCards = [
    { label: 'Total reservations', value: stats.total, icon: CalendarIcon, tone: 'text-slate-900', chip: 'bg-slate-100 text-slate-600' },
    { label: 'Confirmed', value: stats.confirmed, icon: CheckCircle2, tone: 'text-emerald-600', chip: 'bg-emerald-50 text-emerald-600' },
    { label: 'Pending', value: stats.pending, icon: Clock, tone: 'text-amber-600', chip: 'bg-amber-50 text-amber-600' },
    { label: 'Outstanding balance', value: `${fmtMoney(stats.outstanding)} MAD`, icon: Wallet, tone: 'text-slate-900', chip: 'bg-violet-50 text-violet-600' },
  ];

  /* ---------- Render ---------- */
  return (
    <div className="min-h-screen bg-stone-50">
      <style>{`
        @keyframes rp-pop { from { opacity: 0; transform: translateY(6px) scale(.98); } to { opacity: 1; transform: none; } }
        @keyframes rp-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes rp-fade-out { from { opacity: 1; } to { opacity: 0; } }
        @keyframes rp-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes rp-down { from { transform: translateY(0); } to { transform: translateY(100%); } }
        .rp-pop { animation: rp-pop .16s ease-out; }
        .rp-backdrop-in { animation: rp-fade .22s ease-out forwards; }
        .rp-backdrop-out { animation: rp-fade-out .26s ease-in forwards; }
        .rp-sheet-in { animation: rp-up .3s cubic-bezier(.22,1,.36,1) forwards; }
        .rp-sheet-out { animation: rp-down .26s cubic-bezier(.4,0,1,1) forwards; }
        @media (prefers-reduced-motion: reduce) {
          .rp-pop, .rp-backdrop-in, .rp-backdrop-out, .rp-sheet-in, .rp-sheet-out { animation-duration: 1ms; }
        }
      `}</style>

      <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">{translate('Reservations')}</h1>
            <p className="text-sm text-slate-500 mt-1">{translate('Bookings, travelers and payment ledgers in one place.')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setIsSqlModalOpen(true)} className={btnGhost}>
              <FileText className="w-4 h-4 text-slate-500" />{translate('SQL migration')}</button>
            <button onClick={fetchData} className={btnGhost} title="Refresh records">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />{translate('Refresh')}</button>
            <button onClick={openCreateModal} className={btnPrimary}>
              <Plus className="w-4 h-4" />{translate('New reservation')}</button>
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
                  placeholder="Search by reference, customer, phone or destination"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`${inputCls} pl-9`}
                />
              </div>
              <Select
                className="lg:w-52"
                prefix="Status"
                ariaLabel="Booking status filter"
                value={bookingStatusFilter}
                onChange={setBookingStatusFilter}
                options={[{ value: 'ALL', label: 'All' }, ...BOOKING_STATUS_OPTIONS]}
              />
              <Select
                className="lg:w-52"
                prefix="Payment"
                ariaLabel="Payment status filter"
                value={paymentStatusFilter}
                onChange={setPaymentStatusFilter}
                options={[{ value: 'ALL', label: 'All' }, ...PAYMENT_STATUS_OPTIONS]}
              />
              <Select
                className="lg:w-56"
                prefix="Destination"
                ariaLabel="Destination filter"
                value={destinationFilter}
                onChange={setDestinationFilter}
                options={destinationOptions}
                searchable={destinationOptions.length > 7}
              />
              <Select
                className="lg:w-56"
                prefix="Assigned"
                ariaLabel="Assigned employee filter"
                value={employeeFilter}
                onChange={setEmployeeFilter}
                options={employeeOptions}
                searchable={employeeOptions.length > 7}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{filteredReservations.length} of {enrichedReservations.length} reservations</span>
              {hasFilters && (
                <button
                  onClick={() => {
                    setSearchQuery(''); setBookingStatusFilter('ALL'); setPaymentStatusFilter('ALL');
                    setDestinationFilter('ALL'); setEmployeeFilter('ALL');
                  }}
                  className="font-medium text-amber-700 hover:text-amber-800 underline underline-offset-2"
                >{translate('Clear filters')}</button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1100px]">
              <thead>
                <tr className="bg-stone-50 border-b border-slate-100 text-xs font-medium text-slate-500">
                  <th className="py-3 px-4">{translate('Reference')}</th>
                  <th className="py-3 px-4">{translate('Customer')}</th>
                  <th className="py-3 px-4">{translate('Trip')}</th>
                  <th className="py-3 px-4">{translate('Dates')}</th>
                  <th className="py-3 px-4 text-center">{translate('Travelers')}</th>
                  <th className="py-3 px-4 w-52">{translate('Payment')}</th>
                  <th className="py-3 px-4">{translate('Status')}</th>
                  <th className="py-3 px-4">{translate('Assigned to')}</th>
                  <th className="py-3 px-4 w-24" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="py-16 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-600" />{translate('Loading reservations…')}</td>
                  </tr>
                ) : filteredReservations.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="py-16 text-center text-slate-500">
                      <CalendarIcon className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="font-medium text-slate-700">{translate('No reservations match')}</p>
                      <p className="text-xs mt-1">{translate('Try a different search or clear the filters.')}</p>
                    </td>
                  </tr>
                ) : (
                  filteredReservations.map((res) => (
                    <tr
                      key={res.id}
                      tabIndex={0}
                      onClick={() => openDetail(res)}
                      onKeyDown={(e) => { if (e.key === 'Enter') openDetail(res); }}
                      className="group cursor-pointer hover:bg-amber-50/40 focus:outline-none focus-visible:bg-amber-50/60 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono text-xs font-semibold text-amber-700 whitespace-nowrap">{res.booking_reference}</td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={res.customer.full_name} />
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 truncate">{res.customer.full_name}</p>
                            <p className="text-xs text-slate-400 truncate">{res.customer.phone || res.customer.email || 'No contact'}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-medium text-slate-900">{res.offer_title || res.destination || 'General Trip'}</p>
                        {res.offer_reference && <p className="text-xs text-amber-700">{res.offer_reference}</p>}
                        {res.offer_title && res.destination && <p className="text-xs text-slate-400">{res.destination}</p>}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <p>{fmtDate(res.departure_date)}</p>
                        <p className="text-xs text-slate-400">to {fmtDate(res.return_date)}</p>
                      </td>

                      <td className="py-3.5 px-4 text-center font-medium">{res.traveler_count || 1}</td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="font-semibold text-slate-900 whitespace-nowrap">{fmtMoney(res.total_amount)} {res.currency}</span>
                          <PaymentBadge status={res.paymentStatus} />
                        </div>
                        <PaidBar paid={res.totalPaid} total={Number(res.total_amount || 0)} />
                      </td>

                      <td className="py-3.5 px-4"><StatusBadge status={res.booking_status} /></td>

                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">{res.assignedProfile?.full_name || 'Unassigned'}</td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedId(res.id); setIsPaymentModalOpen(true); }}
                            onKeyDown={(e) => e.stopPropagation()}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                            title="Add payment"
                            aria-label="Add payment"
                          >
                            <DollarSign className="w-4 h-4" />
                          </button>
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600 transition" />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ================= DETAIL SLIDE-UP SHEET ================= */}
      {isDetailOpen && selectedReservation && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={`Booking ${selectedReservation.booking_reference}`}>
          <div
            className={`absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] ${detailClosing ? 'rp-backdrop-out' : 'rp-backdrop-in'}`}
            onClick={closeDetail}
          />
          <div
            className={`absolute bottom-0 left-0 w-full h-[75vh] bg-stone-50 rounded-t-3xl shadow-[0_-20px_60px_-15px_rgba(15,23,42,0.35)] flex flex-col ${detailClosing ? 'rp-sheet-out' : 'rp-sheet-in'}`}
          >
            {/* Grab handle */}
            <div className="flex justify-center pt-3 pb-1">
              <button onClick={closeDetail} className="w-12 h-1.5 rounded-full bg-slate-300 hover:bg-slate-400 transition" aria-label="Close panel" />
            </div>

            {/* Sheet header */}
            <div className="flex flex-wrap items-center justify-between gap-4 px-6 lg:px-10 py-3 border-b border-slate-200 bg-stone-50">
              <div className="flex items-center gap-4 min-w-0">
                <Avatar name={selectedReservation.customer.full_name} size="w-12 h-12 text-sm" />
                <div className="min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-lg font-semibold text-slate-900 truncate">{selectedReservation.customer.full_name}</h3>
                    <span className="font-mono text-xs font-semibold text-amber-700 bg-amber-50 ring-1 ring-inset ring-amber-200 px-2 py-0.5 rounded">
                      {selectedReservation.booking_reference}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Created {fmtDate(selectedReservation.created_at)}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <PaymentBadge status={selectedReservation.paymentStatus} />
                <Select
                  compact
                  className="w-48"
                  prefix="Status"
                  ariaLabel="Change booking status"
                  value={selectedReservation.booking_status || 'pending'}
                  onChange={(v) => handleUpdateStatus(selectedReservation.id, v)}
                  options={BOOKING_STATUS_OPTIONS}
                />
                
                <button onClick={() => {
                  setFormData({
                    customer_id: selectedReservation.customer_id,
                    destination: selectedReservation.destination || '',
                    departure_date: selectedReservation.departure_date || '',
                    return_date: selectedReservation.return_date || '',
                    traveler_count: selectedReservation.traveler_count || 1,
                    total_amount: selectedReservation.total_amount || '',
                    currency: selectedReservation.currency || 'MAD',
                    booking_status: selectedReservation.booking_status || 'pending',
                    assigned_to: selectedReservation.assigned_to || '',
                    special_requests: selectedReservation.special_requests || '',
                    internal_notes: selectedReservation.internal_notes || '',
                  });
                  setIsEditModalOpen(true);
                }} className={btnGhost}>
                  <Edit className="w-4 h-4" />{translate('Edit')}</button>

                <button onClick={() => setIsDeleteModalOpen(true)} className={btnDanger}>
                  <Trash2 className="w-4 h-4" />{translate('Delete')}</button>

                <button onClick={() => setIsPaymentModalOpen(true)} className={btnPrimary}>
                  <Plus className="w-4 h-4" />{translate('Add payment')}</button>
                <button onClick={closeDetail} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition" aria-label="Close">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Sheet body */}
            <div className="flex-1 overflow-y-auto px-6 lg:px-10 py-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-[1500px] mx-auto">
                {/* Left: customer + trip */}
                <div className="space-y-4">
                  <section className="bg-white rounded-xl border border-slate-200/80 p-5 space-y-3">
                    <SectionTitle icon={Users}>{translate('Customer')}</SectionTitle>
                    <div className="space-y-2 text-sm">
                      <p className="font-medium text-slate-900">{selectedReservation.customer.full_name}</p>
                      <p className="text-slate-600 flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-400" /> {selectedReservation.customer.phone || 'No phone'}</p>
                      <p className="text-slate-600 flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-slate-400" /> {selectedReservation.customer.email || 'No email'}</p>
                    </div>
                  </section>

                  <section className="bg-white rounded-xl border border-slate-200/80 p-5 space-y-3">
                    <SectionTitle icon={Compass}>{translate('Trip')}</SectionTitle>
                    <div className="space-y-2 text-sm">
                      {selectedReservation.offer_title && (
                        <div>
                          <p className="font-medium text-slate-900">{selectedReservation.offer_title}</p>
                          {selectedReservation.offer_reference && <p className="text-xs text-slate-500">Package ref: {selectedReservation.offer_reference}</p>}
                          {selectedReservation.offer_id && (
                            <button
                              type="button"
                              onClick={() => navigate(`/admin/packages-services/${selectedReservation.offer_id}`)}
                              className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 hover:underline mt-1"
                            >
                              Open package in admin <ArrowUpRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                      <p className="text-slate-700"><span className="text-slate-400">{translate('Destination')}</span> &nbsp;{selectedReservation.destination || 'TBD'}</p>
                      <p className="text-slate-700 flex items-center gap-2">
                        <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                        {fmtDate(selectedReservation.departure_date)} to {fmtDate(selectedReservation.return_date)}
                      </p>
                      <p className="text-slate-700"><span className="text-slate-400">{translate('Travelers')}</span> &nbsp;<span className="font-semibold">{selectedReservation.traveler_count || 1}</span></p>
                      <p className="text-slate-700"><span className="text-slate-400">{translate('Assigned to')}</span> &nbsp;{selectedReservation.assignedProfile?.full_name || 'Unassigned'}</p>
                    </div>
                  </section>
                </div>

                {/* Middle + right: financials & documents */}
                <div className="lg:col-span-2 space-y-4">
                  <section className="bg-white rounded-xl border border-slate-200/80 p-5 space-y-5">
                    <SectionTitle icon={Wallet}>{translate('Payments')}</SectionTitle>

                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { l: 'Total', v: selectedReservation.total_amount, c: 'text-slate-900' },
                        { l: 'Net paid', v: selectedReservation.totalPaid, c: 'text-emerald-600' },
                        { l: 'Balance due', v: selectedReservation.balance, c: selectedReservation.balance > 0 ? 'text-rose-600' : 'text-slate-700' },
                      ].map((x) => (
                        <div key={x.l} className="bg-stone-50 rounded-lg px-4 py-3">
                          <p className="text-xs text-slate-500">{x.l}</p>
                          <p className={`text-lg font-semibold mt-0.5 ${x.c}`}>{fmtMoney(x.v)} <span className="text-xs font-medium text-slate-400">{selectedReservation.currency}</span></p>
                        </div>
                      ))}
                    </div>
                    <PaidBar paid={selectedReservation.totalPaid} total={Number(selectedReservation.total_amount || 0)} />

                    <div>
                      <p className="text-sm font-medium text-slate-800 mb-2">{translate('Transactions')}</p>
                      {selectedReservation.resPayments.length === 0 ? (
                        <div className="border border-dashed border-slate-200 rounded-lg py-6 text-center text-sm text-slate-500">{translate('No transactions yet.')}</div>
                      ) : (
                        <div className="border border-slate-200 rounded-lg overflow-x-auto">
                          <table className="w-full text-left text-sm min-w-[520px]">
                            <thead className="bg-stone-50 text-xs text-slate-500">
                              <tr>
                                <th className="py-2 px-3 font-medium">{translate('Type')}</th>
                                <th className="py-2 px-3 font-medium">{translate('Date')}</th>
                                <th className="py-2 px-3 font-medium">{translate('Method')}</th>
                                <th className="py-2 px-3 font-medium">{translate('Status')}</th>
                                <th className="py-2 px-3 font-medium text-right">{translate('Amount')}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {selectedReservation.resPayments.map((pay) => (
                                <tr key={pay.id}>
                                  <td className="py-2 px-3 capitalize font-medium text-slate-800">{pay.transaction_type}</td>
                                  <td className="py-2 px-3 text-slate-600">{fmtDate(pay.transaction_date || pay.created_at)}</td>
                                  <td className="py-2 px-3 capitalize text-slate-700">{(pay.payment_method || '').replace('_', ' ')}</td>
                                  <td className="py-2 px-3 capitalize text-slate-600">{pay.transaction_status}</td>
                                  <td className={`py-2 px-3 text-right font-semibold ${pay.transaction_type === 'refund' ? 'text-rose-600' : 'text-emerald-600'}`}>
                                    {pay.transaction_type === 'refund' ? '−' : '+'}{fmtMoney(pay.amount)} {pay.currency}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* DOCUMENTS SECTION */}
                  <section className="bg-white rounded-xl border border-slate-200/80 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <SectionTitle icon={FileText}>{translate('Documents & Attachments')}</SectionTitle>
                      <div className="relative">
                        <input
                          type="file"
                          className="hidden"
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                          accept="image/*,.pdf,.doc,.docx"
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className={btnGhost}
                        >
                          {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                          {isUploading ? 'Uploading...' : 'Upload document'}
                        </button>
                      </div>
                    </div>

                    {selectedReservation.resDocuments.length === 0 ? (
                      <div className="border border-dashed border-slate-200 rounded-lg py-8 text-center bg-stone-50/50">
                        <File className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        <p className="text-sm font-medium text-slate-700">{translate('No documents yet')}</p>
                        <p className="text-xs text-slate-500 mt-1">{translate('Upload tickets, passports, or itineraries.')}</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedReservation.resDocuments.map((doc) => {
                          const isImage = doc.file_type?.startsWith('image/');
                          return (
                            <div key={doc.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-white group hover:border-amber-300 transition-colors">
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center shrink-0 text-slate-500">
                                  {isImage ? <ImageIcon className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                                </span>
                                <div className="min-w-0 pr-2">
                                  <p className="text-sm font-medium text-slate-900 truncate" title={doc.file_name}>{doc.file_name}</p>
                                  <p className="text-xs text-slate-500">{fmtBytes(doc.file_size)}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <a
                                  href={doc.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded"
                                  title="Download"
                                >
                                  <Download className="w-4 h-4" />
                                </a>
                                <button
                                  onClick={() => handleDeleteDocument(doc.id, doc.file_url)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                </div>

                {/* Notes row */}
                <section className="bg-white rounded-xl border border-slate-200/80 p-5 lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <SectionTitle icon={MessageSquare}>{translate('Special requests')}</SectionTitle>
                    <p className="text-sm text-slate-600 mt-2">{selectedReservation.special_requests || 'None specified.'}</p>
                  </div>
                  <div>
                    <SectionTitle icon={StickyNote}>{translate('Internal notes')}</SectionTitle>
                    <p className="text-sm text-slate-600 mt-2">{selectedReservation.internal_notes || 'None specified.'}</p>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= EDIT MODAL ================= */}
      {isEditModalOpen && selectedReservation && (
        <Modal onClose={() => setIsEditModalOpen(false)}>
          <ModalHeader title="Edit reservation" subtitle={`Ref: ${selectedReservation.booking_reference}`} onClose={() => setIsEditModalOpen(false)} />
          <form onSubmit={handleEditReservation} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            <div className="space-y-3">
              <SectionTitle icon={Compass}>{translate('Trip details')}</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>{translate('Destination *')}</label>
                  <input type="text" required placeholder="e.g. Marrakech" value={formData.destination} onChange={(e) => setFormData((p) => ({ ...p, destination: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{translate('Travelers *')}</label>
                  <input type="number" min="1" required value={formData.traveler_count} onChange={(e) => setFormData((p) => ({ ...p, traveler_count: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{translate('Departure date *')}</label>
                  <input type="date" required value={formData.departure_date} onChange={(e) => setFormData((p) => ({ ...p, departure_date: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{translate('Return date')}</label>
                  <input type="date" min={formData.departure_date || undefined} value={formData.return_date} onChange={(e) => setFormData((p) => ({ ...p, return_date: e.target.value }))} className={inputCls} />
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-5 border-t border-slate-100">
              <SectionTitle icon={DollarSign}>{translate('Pricing & Status')}</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className={labelCls}>{translate('Total amount *')}</label>
                  <input type="number" step="0.01" required placeholder="0.00" value={formData.total_amount} onChange={(e) => setFormData((p) => ({ ...p, total_amount: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{translate('Currency')}</label>
                  <Select value={formData.currency} onChange={(v) => setFormData((p) => ({ ...p, currency: v }))} options={CURRENCY_OPTIONS} ariaLabel="Currency" menuMinWidth={120} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelCls}>{translate('Assigned employee')}</label>
                  <Select
                    searchable={assignOptions.length > 7}
                    value={formData.assigned_to}
                    onChange={(v) => setFormData((p) => ({ ...p, assigned_to: v }))}
                    options={assignOptions}
                    placeholder="Select an employee"
                    ariaLabel="Assigned employee"
                    menuMinWidth={280}
                  />
                </div>
                <div>
                  <label className={labelCls}>{translate('Status')}</label>
                  <Select value={formData.booking_status} onChange={(v) => setFormData((p) => ({ ...p, booking_status: v }))} options={BOOKING_STATUS_OPTIONS} ariaLabel="Status" />
                </div>
              </div>
              <div>
                <label className={labelCls}>{translate('Special requests')}</label>
                <textarea rows="2" value={formData.special_requests} onChange={(e) => setFormData((p) => ({ ...p, special_requests: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{translate('Internal notes')}</label>
                <textarea rows="2" value={formData.internal_notes} onChange={(e) => setFormData((p) => ({ ...p, internal_notes: e.target.value }))} className={inputCls} />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-100">
              <button type="button" onClick={() => setIsEditModalOpen(false)} className={btnGhost}>{translate('Cancel')}</button>
              <button type="submit" disabled={formSubmitting} className={btnPrimary}>{formSubmitting ? 'Saving…' : 'Save changes'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ================= DELETE CONFIRMATION MODAL ================= */}
      {isDeleteModalOpen && selectedReservation && (
        <Modal onClose={() => setIsDeleteModalOpen(false)} maxW="max-w-md">
          <div className="p-6 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-rose-100 text-rose-600 mb-4">
              <AlertTriangle className="w-6 h-6" />
            </span>
            <h3 className="text-lg font-semibold text-slate-900">{translate('Delete this reservation?')}</h3>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to delete booking <strong>{selectedReservation.booking_reference}</strong>{translate('? This will also remove all associated payments and documents. This action cannot be undone.')}</p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button type="button" onClick={() => setIsDeleteModalOpen(false)} className={btnGhost}>{translate('Cancel')}</button>
              <button type="button" onClick={handleDeleteReservation} disabled={formSubmitting} className={btnDanger}>
                {formSubmitting ? 'Deleting…' : 'Delete reservation'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ================= CREATE RESERVATION ================= */}
      {isCreateModalOpen && (
        <Modal onClose={() => setIsCreateModalOpen(false)}>
          <ModalHeader title="New reservation" subtitle="Add a booking and, optionally, its first payment." onClose={() => setIsCreateModalOpen(false)} />
          <form onSubmit={handleCreateReservation} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            <div className="space-y-3">
              <SectionTitle icon={Users}>{translate('Customer')}</SectionTitle>
              <div role="tablist" aria-label="Customer source" className="grid grid-cols-2 gap-1 p-1 bg-stone-100 rounded-lg">
                {[
                  { mode: 'existing', label: 'Existing customer', icon: UserCheck },
                  { mode: 'new', label: 'New customer', icon: UserPlus },
                ].map(({ mode, label, icon: Icon }) => (
                  <button
                    key={mode}
                    type="button"
                    role="tab"
                    aria-selected={customerMode === mode}
                    onClick={() => { setCustomerMode(mode); setFormData((p) => ({ ...p, customer_id: '' })); }}
                    className={`inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition
                      ${customerMode === mode ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <Icon className="w-4 h-4" /> {label}
                  </button>
                ))}
              </div>

              {customerMode === 'existing' ? (
                <div>
                  <label className={labelCls}>{translate('Customer *')}</label>
                  <Select
                    searchable
                    value={formData.customer_id}
                    onChange={(v) => setFormData((p) => ({ ...p, customer_id: v }))}
                    options={customerOptions}
                    placeholder="Select an existing customer"
                    ariaLabel="Customer"
                    menuMinWidth={320}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>{translate('First name *')}</label>
                    <input type="text" required autoComplete="given-name" value={newCustomer.first_name}
                      onChange={(e) => setNewCustomer((current) => ({ ...current, first_name: e.target.value }))} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>{translate('Last name *')}</label>
                    <input type="text" required autoComplete="family-name" value={newCustomer.last_name}
                      onChange={(e) => setNewCustomer((current) => ({ ...current, last_name: e.target.value }))} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>{translate('Phone *')}</label>
                    <input type="tel" required autoComplete="tel" value={newCustomer.phone}
                      onChange={(e) => setNewCustomer((current) => ({ ...current, phone: e.target.value }))} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>{translate('Email')}</label>
                    <input type="email" autoComplete="email" value={newCustomer.email}
                      onChange={(e) => setNewCustomer((current) => ({ ...current, email: e.target.value }))} className={inputCls} />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelCls}>{translate('Country')}</label>
                    <input type="text" autoComplete="country-name" value={newCustomer.country}
                      onChange={(e) => setNewCustomer((current) => ({ ...current, country: e.target.value }))} className={inputCls} />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3 pt-5 border-t border-slate-100">
              <SectionTitle icon={Compass}>{translate('Trip details')}</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>{translate('Destination *')}</label>
                  <input type="text" required placeholder="e.g. Marrakech, Agadir, Chefchaouen" value={formData.destination} onChange={(e) => setFormData((p) => ({ ...p, destination: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{translate('Travelers *')}</label>
                  <input type="number" min="1" required value={formData.traveler_count} onChange={(e) => setFormData((p) => ({ ...p, traveler_count: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{translate('Departure date *')}</label>
                  <input type="date" required value={formData.departure_date} onChange={(e) => setFormData((p) => ({ ...p, departure_date: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{translate('Return date')}</label>
                  <input type="date" min={formData.departure_date || undefined} value={formData.return_date} onChange={(e) => setFormData((p) => ({ ...p, return_date: e.target.value }))} className={inputCls} />
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-5 border-t border-slate-100">
              <SectionTitle icon={DollarSign}>{translate('Pricing and first payment')}</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className={labelCls}>{translate('Total amount *')}</label>
                  <input type="number" step="0.01" required placeholder="0.00" value={formData.total_amount} onChange={(e) => setFormData((p) => ({ ...p, total_amount: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{translate('Currency')}</label>
                  <Select value={formData.currency} onChange={(v) => setFormData((p) => ({ ...p, currency: v }))} options={CURRENCY_OPTIONS} ariaLabel="Currency" menuMinWidth={120} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelCls}>{translate('Initial payment')}</label>
                  <input type="number" step="0.01" placeholder="0.00" value={formData.initial_payment_amount} onChange={(e) => setFormData((p) => ({ ...p, initial_payment_amount: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{translate('Payment method')}</label>
                  <Select value={formData.payment_method} onChange={(v) => setFormData((p) => ({ ...p, payment_method: v }))} options={METHOD_OPTIONS} ariaLabel="Payment method" />
                </div>
                <div className="md:col-span-2">
                  <label className={labelCls}>{translate('Assigned employee')}</label>
                  <Select
                    searchable={assignOptions.length > 7}
                    value={formData.assigned_to}
                    onChange={(v) => setFormData((p) => ({ ...p, assigned_to: v }))}
                    options={assignOptions}
                    placeholder="Select an employee"
                    ariaLabel="Assigned employee"
                    menuMinWidth={280}
                  />
                </div>
                <div>
                  <label className={labelCls}>{translate('Initial status')}</label>
                  <Select value={formData.booking_status} onChange={(v) => setFormData((p) => ({ ...p, booking_status: v }))} options={INITIAL_STATUS_OPTIONS} ariaLabel="Initial status" />
                </div>
              </div>
              <div>
                <label className={labelCls}>{translate('Special requests')}</label>
                <textarea rows="2" placeholder="Dietary requirements, room preferences" value={formData.special_requests} onChange={(e) => setFormData((p) => ({ ...p, special_requests: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{translate('Internal notes')}</label>
                <textarea rows="2" placeholder="Notes for staff only" value={formData.internal_notes} onChange={(e) => setFormData((p) => ({ ...p, internal_notes: e.target.value }))} className={inputCls} />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-100">
              <button type="button" onClick={() => setIsCreateModalOpen(false)} className={btnGhost}>{translate('Cancel')}</button>
              <button type="submit" disabled={formSubmitting} className={btnPrimary}>{formSubmitting ? 'Saving…' : 'Save reservation'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ================= ADD PAYMENT ================= */}
      {isPaymentModalOpen && selectedReservation && (
        <Modal onClose={() => setIsPaymentModalOpen(false)} maxW="max-w-md">
          <ModalHeader title="Record transaction" subtitle={`Booking ${selectedReservation.booking_reference}`} onClose={() => setIsPaymentModalOpen(false)} />
          <form onSubmit={handleAddPayment} className="p-6 space-y-4">
            <div className="bg-amber-50 px-4 py-3 rounded-lg border border-amber-200 text-sm text-amber-900 flex justify-between">
              <span>{translate('Balance due')}</span>
              <span className="font-semibold">{fmtMoney(selectedReservation.balance)} {selectedReservation.currency}</span>
            </div>
            <div>
              <label className={labelCls}>{translate('Transaction type')}</label>
              <Select value={paymentData.transaction_type} onChange={(v) => setPaymentData((p) => ({ ...p, transaction_type: v }))} options={TXN_TYPE_OPTIONS} ariaLabel="Transaction type" />
            </div>
            <div>
              <label className={labelCls}>Amount ({selectedReservation.currency}) *</label>
              <input type="number" step="0.01" min="0.01" required placeholder="0.00" value={paymentData.amount} onChange={(e) => setPaymentData((p) => ({ ...p, amount: e.target.value }))} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>{translate('Method')}</label>
                <Select value={paymentData.payment_method} onChange={(v) => setPaymentData((p) => ({ ...p, payment_method: v }))} options={METHOD_OPTIONS} ariaLabel="Payment method" />
              </div>
              <div>
                <label className={labelCls}>{translate('Status')}</label>
                <Select value={paymentData.transaction_status} onChange={(v) => setPaymentData((p) => ({ ...p, transaction_status: v }))} options={TXN_STATUS_OPTIONS} ariaLabel="Transaction status" menuMinWidth={220} />
              </div>
            </div>
            <div>
              <label className={labelCls}>{translate('Reference (optional)')}</label>
              <input type="text" placeholder="e.g. TXN-998234" value={paymentData.transaction_reference} onChange={(e) => setPaymentData((p) => ({ ...p, transaction_reference: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{translate('Notes')}</label>
              <textarea rows="2" placeholder="Receipt or deposit notes" value={paymentData.notes} onChange={(e) => setPaymentData((p) => ({ ...p, notes: e.target.value }))} className={inputCls} />
            </div>
            <p className="text-xs text-slate-500">{translate('Completed transactions can’t be edited later. Record a refund to correct one.')}</p>
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setIsPaymentModalOpen(false)} className={btnGhost}>{translate('Cancel')}</button>
              <button type="submit" disabled={formSubmitting} className={btnPrimary}>{formSubmitting ? 'Recording…' : 'Record transaction'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ================= SQL MIGRATION ================= */}
      {isSqlModalOpen && (
        <Modal onClose={() => setIsSqlModalOpen(false)} maxW="max-w-4xl" dark>
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-semibold text-white">{translate('Migration: documents & attachments')}</h3>
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
                {copiedSql ? 'Copied' : 'Copy SQL'}
              </button>
              <button onClick={() => setIsSqlModalOpen(false)} className="p-1 text-slate-400 hover:text-white rounded-lg" aria-label="Close">
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