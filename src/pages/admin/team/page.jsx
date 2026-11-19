import { useAppSettings, translate, useAuth } from '@/context/index.jsx';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Users, UserPlus, Search, Mail, Phone, Shield, ShieldCheck, ShieldAlert, Clock, Building,
  CheckCircle2, AlertTriangle, UserCheck, X, Loader2, Calendar, Briefcase, Globe, ChevronDown,
  ChevronLeft, ChevronRight, ChevronsUpDown, ArrowUp, ArrowDown, Download, RefreshCw, Lock, Check, Trash2,
  Sliders, Eye, EyeOff, Save, CheckCircle, Info, Sparkles, Filter, RotateCcw,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client.jsx';
import {
  ADMIN_PAGES,
  fetchRolePagePermissions,
  saveRolePagePermissions,
  buildDefaultRolePagePermissions,
} from '@/services/roleAccessService.js';

/* ---------- Constants ---------- */
const PAGE_SIZE = 10;
const ADMIN_PERMISSION = 'users.manage';

const DEPARTMENTS = ['Management', 'Sales', 'Operations', 'Finance', 'IT'];
const DEPT_STYLE = {
  Sales: 'bg-sky-50 text-sky-700 ring-sky-200',
  Operations: 'bg-violet-50 text-violet-700 ring-violet-200',
  Finance: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Management: 'bg-amber-50 text-amber-800 ring-amber-200',
  IT: 'bg-slate-100 text-slate-700 ring-slate-200',
};
const EMPLOYMENT = {
  active: { label: 'Active', dot: 'bg-emerald-500', cls: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  probation: { label: 'Probation', dot: 'bg-sky-500', cls: 'bg-sky-50 text-sky-800 ring-sky-200' },
  on_leave: { label: 'On leave', dot: 'bg-amber-500', cls: 'bg-amber-50 text-amber-800 ring-amber-200' },
  terminated: { label: 'Terminated', dot: 'bg-rose-500', cls: 'bg-rose-50 text-rose-800 ring-rose-200' },
};
const ACCOUNT = {
  active: { label: 'Active', dot: 'bg-emerald-500', cls: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  pending: { label: 'Pending Approval', dot: 'bg-amber-500 animate-pulse', cls: 'bg-amber-50 text-amber-900 ring-amber-300 font-semibold' },
  suspended: { label: 'Suspended', dot: 'bg-rose-500', cls: 'bg-rose-50 text-rose-800 ring-rose-200' },
};
const toOptions = (map) => Object.entries(map).map(([value, v]) => ({ value, label: v.label, dot: v.dot }));
const EMPLOYMENT_OPTIONS = toOptions(EMPLOYMENT);
const DEPT_OPTIONS = DEPARTMENTS.map((d) => ({ value: d, label: d }));

const inputCls = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 transition focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30';
const btnGhost = 'inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';
const btnPrimary = 'inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50';
const btnDanger = 'inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:opacity-50';

const initials = (n = '') => n.split(' ').filter(Boolean).slice(0, 2).map((s) => s[0].toUpperCase()).join('') || '?';
const roleLabel = (n = '') => n.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
const isAdminRole = (n = '') => /admin|manager/i.test(n);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const rolesOf = (e) => (e.user_roles || []).map((r) => r.roles).filter(Boolean);

/* ---------- Styled dropdown (portal menu, keyboard support) ---------- */
function Select({
  value, onChange, options, placeholder = 'Select…', searchable = false, prefix, compact = false,
  disabled = false, ariaLabel, className = '', menuMinWidth = 200, emptyValue = 'all', align = 'left',
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
    return q ? options.filter((o) => `${o.label} ${o.hint || ''}`.toLowerCase().includes(q)) : options;
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
    const left = align === 'right' ? r.right - width : r.left;
    setPos({
      left: Math.min(Math.max(8, left), window.innerWidth - width - 8), width,
      top: up ? undefined : r.bottom + 6, bottom: up ? window.innerHeight - r.top + 6 : undefined,
      maxHeight: Math.max(160, Math.min(320, up ? above : below)),
    });
  }, [visible.length, searchable, menuMinWidth, align]);

  useLayoutEffect(() => { if (open) place(); }, [open, place]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (!triggerRef.current?.contains(e.target) && !menuRef.current?.contains(e.target)) setOpen(false); };
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
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  };
  const close = (refocus = true) => { setOpen(false); if (refocus) triggerRef.current?.focus(); };
  const choose = (o) => { if (!o || o.disabled) return; onChange(o.value); close(); };

  const onKeyDown = (e) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); openMenu(); }
      return;
    }
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); setActive((i) => Math.min(visible.length - 1, i + 1)); break;
      case 'ArrowUp': e.preventDefault(); setActive((i) => Math.max(0, i - 1)); break;
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
        ref={triggerRef} type="button" disabled={disabled} aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open}
        onClick={(e) => { e.stopPropagation(); open ? close(false) : openMenu(); }} onKeyDown={onKeyDown}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 ${compact ? 'py-1.5' : 'py-2'} text-left text-sm transition
          focus:outline-none focus:ring-2 focus:ring-amber-500/30 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60
          ${open ? 'border-amber-500 ring-2 ring-amber-500/20' : isFiltered ? 'border-amber-300 bg-amber-50/60' : 'border-slate-200 hover:border-slate-300'}`}
      >
        <span className="flex min-w-0 items-center gap-2">
          {selected?.dot && <span className={`h-2 w-2 shrink-0 rounded-full ${selected.dot}`} />}
          {prefix && <span className="shrink-0 text-slate-400">{prefix}</span>}
          <span className={`truncate ${selected ? (isFiltered ? 'font-medium text-amber-900' : 'text-slate-800') : 'text-slate-400'}`}>
            {selected ? selected.label : placeholder}
          </span>
        </span>
        {disabled ? <Lock className="h-3.5 w-3.5 shrink-0 text-slate-300" /> : <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180 text-amber-600' : ''}`} />}
      </button>
      {open && pos && createPortal(
        <div
          ref={menuRef} role="presentation"
          style={{ position: 'fixed', left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: pos.maxHeight }}
          className="td-pop z-[100] flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10 ring-1 ring-black/5"
          onClick={(e) => e.stopPropagation()}
        >
          {searchable && (
            <div className="shrink-0 border-b border-slate-100 p-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchRef} type="search" value={query} onChange={(e) => { setQuery(e.target.value); setActive(0); }}
                  placeholder="Filter…" className="w-full rounded-md border border-slate-200 py-1.5 pl-8 pr-2 text-xs text-slate-800 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
          )}
          <ul ref={listRef} role="listbox" tabIndex={-1} className="flex-1 overflow-y-auto p-1 text-sm scrollbar-thin">
            {visible.length === 0 ? (
              <li className="px-3 py-4 text-center text-xs text-slate-400">{translate('No matches')}</li>
            ) : visible.map((o, idx) => {
              const isSel = o.value === value;
              const isAct = idx === active;
              return (
                <li
                  key={o.value} data-idx={idx} role="option" aria-selected={isSel} aria-disabled={o.disabled}
                  onMouseEnter={() => setActive(idx)} onClick={() => choose(o)}
                  className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs transition ${
                    o.disabled ? 'cursor-not-allowed opacity-40' : isAct ? 'bg-amber-50 text-amber-900' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {o.dot && <span className={`h-2 w-2 shrink-0 rounded-full ${o.dot}`} />}
                    <span className="truncate font-medium">{o.label}</span>
                  </span>
                  {isSel && <Check className="h-3.5 w-3.5 shrink-0 text-amber-600" />}
                </li>
              );
            })}
          </ul>
        </div>,
        document.body,
      )}
    </div>
  );
}

function Badge({ children, cls = 'bg-slate-100 text-slate-700 ring-slate-200', dot }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />}
      {children}
    </span>
  );
}

function Avatar({ emp, size = 'h-9 w-9 text-xs' }) {
  return (
    <div className={`relative flex ${size} shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 font-bold text-white shadow-xs`}>
      {emp?.avatar_url ? <img src={emp.avatar_url} alt="" className="h-full w-full rounded-full object-cover" /> : initials(emp?.full_name)}
    </div>
  );
}

function SortHead({ label, k, sort, setSort }) {
  const isSorted = sort.key === k;
  return (
    <th
      onClick={() => setSort({ key: k, dir: isSorted && sort.dir === 'asc' ? 'desc' : 'asc' })}
      className="cursor-pointer select-none px-4 py-3 font-semibold transition hover:text-slate-900"
    >
      <div className="inline-flex items-center gap-1.5">
        <span>{translate(label)}</span>
        {isSorted ? (
          sort.dir === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-amber-600" /> : <ArrowDown className="h-3.5 w-3.5 text-amber-600" />
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5 text-slate-300" />
        )}
      </div>
    </th>
  );
}

/* ---------- Main Component ---------- */
export default function TeamDirectory() {
  const { user, roles: currentUserRoles, isManager, isSuperAdmin, isAdmin, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState('directory'); // 'directory' | 'pending' | 'permissions'
  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [dept, setDept] = useState('all');
  const [empStatus, setEmpStatus] = useState('all');
  const [acctStatus, setAcctStatus] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sort, setSort] = useState({ key: 'name', dir: 'asc' });
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Drawer & Modals
  const [selectedId, setSelectedId] = useState(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState({ email: '', full_name: '', department: 'Sales', job_title: '' });
  const [confirm, setConfirm] = useState(null);

  // Role Access Matrix State
  const [rolePermissions, setRolePermissions] = useState(() => buildDefaultRolePagePermissions());
  const [selectedRoleForPerms, setSelectedRoleForPerms] = useState('sales_agent');
  const [isPermsSaved, setIsPermsSaved] = useState(false);
  const [permissionError, setPermissionError] = useState(null);
  const [permissionSaving, setPermissionSaving] = useState(false);

  const notify = useCallback((message, tone = 'success') => {
    setToast({ message, tone });
    setTimeout(() => setToast(null), 4000);
  }, []);

  /* ----- Access control: ONLY Managers & Administrators have write / assignment permissions ----- */
  const me = employees.find((e) => e.id === user?.id);
  const canManage = Boolean(
    user && (isManager || isSuperAdmin || isAdmin || (me && rolesOf(me).some((r) => r.name === 'manager' || isAdminRole(r.name)))),
  );
  const canApproveAccounts = Boolean(user && (isSuperAdmin || currentUserRoles.includes('manager')));
  const adminCount = employees.filter((e) => rolesOf(e).some((r) => isAdminRole(r.name)) && e.account_status === 'active').length;

  /* ----- Data Fetching ----- */
  const fetchTeam = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const [p, r] = await Promise.all([
        supabase.from('profiles').select('*, user_roles!user_id (role_id, roles (id, name, description))').is('deleted_at', null).order('created_at', { ascending: false }),
        supabase.from('roles').select('*').order('name'),
      ]);
      if (p.error) throw p.error;
      if (r.error) throw r.error;
      setEmployees(p.data || []);
      setRoles(r.data || []);
      try {
        setRolePermissions(await fetchRolePagePermissions());
        setPermissionError(null);
      } catch (permissionLoadError) {
        console.error('Error fetching role page permissions:', permissionLoadError);
        setPermissionError(permissionLoadError.message || 'Could not load saved role page permissions.');
      }
    } catch (e) {
      console.error('Error fetching team data:', e);
      setError(e.message);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTeam(); }, [fetchTeam]);
  useEffect(() => {
    if (roles.length && !roles.some((role) => role.name === selectedRoleForPerms)) {
      setSelectedRoleForPerms(roles[0].name);
    }
  }, [roles, selectedRoleForPerms]);
  useEffect(() => { setPage(1); }, [search, dept, empStatus, acctStatus, roleFilter]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (confirm) setConfirm(null); else if (inviteOpen) setInviteOpen(false); else if (selectedId) setSelectedId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirm, inviteOpen, selectedId]);

  /* ----- Derived Lists ----- */
  const selectedEmp = employees.find((e) => e.id === selectedId) || null;
  const roleOptions = useMemo(() => roles.map((r) => ({ value: r.id, label: roleLabel(r.name), hint: r.description || undefined })), [roles]);

  const pendingEmployees = useMemo(() => {
    return employees.filter((e) => !e.account_status || e.account_status === 'pending');
  }, [employees]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = employees.filter((e) => {
      const hay = `${e.full_name || ''} ${e.invitation_email || ''} ${e.employee_id || ''} ${e.job_title || ''}`.toLowerCase();
      return (!q || hay.includes(q))
        && (dept === 'all' || e.department === dept)
        && (empStatus === 'all' || e.employment_status === empStatus)
        && (acctStatus === 'all' || (e.account_status || 'pending') === acctStatus)
        && (roleFilter === 'all' || (roleFilter === 'none' ? rolesOf(e).length === 0 : rolesOf(e).some((r) => r.id === roleFilter)));
    });
    const val = (e) => ({
      name: e.full_name || '', dept: e.department || '', role: rolesOf(e)[0]?.name || '~',
      status: e.employment_status || '', account: e.account_status || '', joined: e.created_at || '',
    })[sort.key];
    return [...list].sort((a, b) => String(val(a)).localeCompare(String(val(b)), undefined, { numeric: true }) * (sort.dir === 'asc' ? 1 : -1));
  }, [employees, search, dept, empStatus, acctStatus, roleFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const kpis = useMemo(() => [
    { label: 'Total team members', value: employees.length, icon: Users, chip: 'bg-slate-100 text-slate-600' },
    { label: 'Active members', value: employees.filter((e) => e.account_status === 'active').length, icon: UserCheck, chip: 'bg-emerald-50 text-emerald-600' },
    { label: 'Pending approval', value: pendingEmployees.length, icon: Clock, chip: pendingEmployees.length > 0 ? 'bg-amber-100 text-amber-900 ring-2 ring-amber-400' : 'bg-slate-100 text-slate-600' },
    { label: 'Managers & Admins', value: employees.filter((e) => rolesOf(e).some((r) => isAdminRole(r.name))).length, icon: ShieldCheck, chip: 'bg-indigo-50 text-indigo-600' },
    { label: 'Suspended accounts', value: employees.filter((e) => e.account_status === 'suspended').length, icon: ShieldAlert, chip: 'bg-rose-50 text-rose-600' },
  ], [employees, pendingEmployees]);

  const hasFilters = search || dept !== 'all' || empStatus !== 'all' || acctStatus !== 'all' || roleFilter !== 'all';
  const clearFilters = () => { setSearch(''); setDept('all'); setEmpStatus('all'); setAcctStatus('all'); setRoleFilter('all'); };

  /* ----- Selection ----- */
  const pageIds = rows.map((r) => r.id);
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const toggleAll = () => setSelectedIds((s) => {
    const n = new Set(s);
    pageIds.forEach((id) => (allOnPage ? n.delete(id) : n.add(id)));
    return n;
  });
  const toggleOne = (id) => setSelectedIds((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  /* ----- Actions Guarded Strictly by Manager Role ----- */
  const patchProfiles = async (ids, patch, okMsg) => {
    if (!canManage || !ids.length) return;
    setBusy(true);
    try {
      const { error: e } = await supabase.from('profiles').update(patch).in('id', ids);
      if (e) throw e;
      setEmployees((prev) => prev.map((p) => (ids.includes(p.id) ? { ...p, ...patch } : p)));
      notify(okMsg || 'Profile updated.');
    } catch (e) { notify('Update failed: ' + e.message, 'error'); } finally { setBusy(false); }
  };

  // 1-Click Approve and Activate Pending Signup
  const approveAndActivate = (emp) => {
    if (!canApproveAccounts) return notify('Only managers and super admins can approve accounts.', 'error');
    if (emp.account_status && emp.account_status !== 'pending') {
      return notify('Only pending accounts can be approved.', 'error');
    }
    setConfirm({
      title: `Approve and activate ${emp.full_name}?`,
      message: `${emp.full_name} will be activated and will immediately have access to log in to the agency portal.`,
      confirmLabel: 'Approve & Activate',
      tone: 'primary',
      onConfirm: async () => {
        await patchProfiles([emp.id], { account_status: 'active', employment_status: 'active' }, `Account activated! ${emp.full_name} can now sign in.`);
        fetchTeam();
      },
    });
  };

  // Reject / Terminate pending account
  const rejectAccount = (emp) => {
    if (!canApproveAccounts) return notify('Only managers and super admins can reject accounts.', 'error');
    if (emp.account_status && emp.account_status !== 'pending') {
      return notify('Only pending accounts can be rejected.', 'error');
    }
    setConfirm({
      title: `Reject account for ${emp.full_name}?`,
      message: `The pending registration for ${emp.invitation_email || emp.full_name} will be marked as suspended and denied access.`,
      confirmLabel: 'Reject Account',
      tone: 'danger',
      onConfirm: async () => {
        await patchProfiles([emp.id], { account_status: 'suspended', employment_status: 'terminated' }, `Account rejected for ${emp.full_name}.`);
        fetchTeam();
      },
    });
  };

  const toggleSuspend = (emp) => {
    if (!canManage) return notify('Only managers can change account statuses.', 'error');
    if (emp.id === user?.id) return notify('You cannot suspend your own account.', 'error');
    if ((!emp.account_status || emp.account_status === 'pending') && !canApproveAccounts) {
      return notify('Only managers and super admins can reject pending accounts.', 'error');
    }
    const suspending = emp.account_status !== 'suspended';
    if (!suspending && !canApproveAccounts) {
      return notify('Only managers and super admins can reactivate accounts.', 'error');
    }
    const isLastAdmin = suspending && rolesOf(emp).some((r) => isAdminRole(r.name)) && adminCount <= 1;
    if (isLastAdmin) return notify('At least one active admin must remain.', 'error');
    setConfirm({
      title: suspending ? `Suspend ${emp.full_name}?` : `Reactivate ${emp.full_name}?`,
      message: suspending ? 'They will lose access to the agency portal until reactivated by a manager.' : 'They will regain access according to their role permissions.',
      confirmLabel: suspending ? 'Suspend account' : 'Activate account', tone: suspending ? 'danger' : 'primary',
      onConfirm: () => patchProfiles([emp.id], { account_status: suspending ? 'suspended' : 'active' }, suspending ? 'Account suspended.' : 'Account activated.'),
    });
  };

  const deleteSuspendedAccount = (emp) => {
    if (!canManage) return notify('Only managers can delete accounts.', 'error');
    if (emp.account_status !== 'suspended') return notify('Only suspended accounts can be deleted.', 'error');
    if (emp.id === user?.id) return notify('You cannot delete your own account.', 'error');
    setConfirm({
      title: `Delete ${emp.full_name || 'this account'}?`,
      message: 'This will remove the suspended account from the team directory and block sign-in. Its authentication record is retained for audit purposes.',
      confirmLabel: 'Delete account',
      tone: 'danger',
      onConfirm: async () => {
        setBusy(true);
        try {
          const { data, error: deleteError } = await supabase
            .from('profiles')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', emp.id)
            .eq('account_status', 'suspended')
            .is('deleted_at', null)
            .select('id')
            .maybeSingle();
          if (deleteError) throw deleteError;
          if (!data) throw new Error('The account is no longer suspended or has already been deleted.');

          setEmployees((prev) => prev.filter((profile) => profile.id !== emp.id));
          setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(emp.id);
            return next;
          });
          setSelectedId((prev) => (prev === emp.id ? null : prev));
          notify('Suspended account deleted from the team directory.');
        } catch (deleteError) {
          notify('Could not delete account: ' + deleteError.message, 'error');
        } finally {
          setBusy(false);
        }
      },
    });
  };

  const bulkSuspend = () => {
    if (!canManage) return notify('Only managers can perform bulk operations.', 'error');
    const ids = [...selectedIds].filter((id) => id !== user?.id);
    const pendingSelected = employees.some((emp) => ids.includes(emp.id) && (!emp.account_status || emp.account_status === 'pending'));
    if (pendingSelected && !canApproveAccounts) {
      return notify('Only managers and super admins can reject pending accounts.', 'error');
    }
    const adminsHit = employees.filter((e) => ids.includes(e.id) && rolesOf(e).some((r) => isAdminRole(r.name))).length;
    if (adminsHit >= adminCount && adminCount > 0) return notify('This would suspend every admin. Deselect at least one.', 'error');
    setConfirm({
      title: `Suspend ${ids.length} account${ids.length === 1 ? '' : 's'}?`, message: 'Your own account is always skipped.',
      confirmLabel: 'Suspend accounts', tone: 'danger',
      onConfirm: async () => { await patchProfiles(ids, { account_status: 'suspended' }, 'Accounts suspended.'); setSelectedIds(new Set()); },
    });
  };

  const assignRole = async (emp, roleId) => {
    if (!canManage || !roleId) return notify('Only managers can assign roles.', 'error');
    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const { error: e } = await supabase.from('user_roles').insert([{ user_id: emp.id, role_id: roleId, assigned_by: auth?.user?.id }]);
      if (e) throw e;
      notify('Role assigned successfully.');
      await fetchTeam();
    } catch (e) { notify('Could not assign role: ' + e.message, 'error'); } finally { setBusy(false); }
  };

  const removeRole = (emp, role) => {
    if (!canManage) return notify('Only managers can remove roles.', 'error');
    if (isAdminRole(role.name)) {
      if (emp.id === user?.id) return notify('You cannot remove your own admin role.', 'error');
      if (adminCount <= 1) return notify('At least one active admin must remain.', 'error');
    }
    setConfirm({
      title: `Remove the ${roleLabel(role.name)} role?`, message: `${emp.full_name} will lose the permissions associated with this role.`,
      confirmLabel: 'Remove role', tone: 'danger',
      onConfirm: async () => {
        setBusy(true);
        try {
          const { error: e } = await supabase.from('user_roles').delete().match({ user_id: emp.id, role_id: role.id });
          if (e) throw e;
          notify('Role removed.');
          await fetchTeam();
        } catch (er) { notify('Could not remove role: ' + er.message, 'error'); } finally { setBusy(false); }
      },
    });
  };

  const sendInvite = async (e) => {
    e.preventDefault();
    if (!canManage) return notify('Only managers can invite employees.', 'error');
    setBusy(true);
    try {
      const { error: dbErr } = await supabase.from('profiles').insert([{
        full_name: invite.full_name.trim(), invitation_email: invite.email.trim().toLowerCase(), department: invite.department,
        job_title: invite.job_title.trim() || null, account_status: 'pending', employment_status: 'probation', invitation_status: 'sent',
      }]);
      if (dbErr) throw dbErr;
      notify('Invitation created with Pending Approval status.');
      setInviteOpen(false);
      setInvite({ email: '', full_name: '', department: 'Sales', job_title: '' });
      fetchTeam();
    } catch (er) { notify('Could not invite employee: ' + er.message, 'error'); } finally { setBusy(false); }
  };

  /* ----- Role Page Access Permission Matrix Handlers ----- */
  const handleTogglePageAccess = (roleKey, pagePath) => {
    if (!canManage) return notify('Only managers can modify page access permissions.', 'error');
    if (roleKey === 'super_admin' || roleKey === 'manager') return;
    const currentAllowed = rolePermissions[roleKey] || [];
    const isAllowed = currentAllowed.includes(pagePath);
    const updated = isAllowed
      ? currentAllowed.filter((p) => p !== pagePath)
      : [...currentAllowed, pagePath];

    const nextPerms = {
      ...rolePermissions,
      [roleKey]: updated,
    };
    setRolePermissions(nextPerms);
    setIsPermsSaved(false);
  };

  const handleSavePagePermissions = async () => {
    if (!canManage) return notify('Only managers can save page access permissions.', 'error');
    setPermissionSaving(true);
    setPermissionError(null);
    try {
      const savedPermissions = await saveRolePagePermissions(rolePermissions, roles, user?.id);
      setRolePermissions(savedPermissions);
      setIsPermsSaved(true);
      setTimeout(() => setIsPermsSaved(false), 3500);
      notify(`Page permissions saved for role: ${roleLabel(selectedRoleForPerms)}. Restricted pages are now hidden and blocked.`);
    } catch (saveError) {
      console.error('Error saving role page permissions:', saveError);
      setPermissionError(saveError.message || 'Could not save role page permissions.');
      notify('Could not save role page permissions: ' + (saveError.message || 'Unknown error.'), 'error');
    } finally {
      setPermissionSaving(false);
    }
  };

  const handleReloadRolePermissions = async () => {
    try {
      setPermissionError(null);
      setRolePermissions(await fetchRolePagePermissions());
    } catch (loadError) {
      console.error('Error reloading role page permissions:', loadError);
      setPermissionError(loadError.message || 'Could not load saved role page permissions.');
    }
  };

  const handleResetRolePermissionsToDefaults = async () => {
    if (!canManage) return;
    if (window.confirm('Reset all roles to system default page access permissions?')) {
      const def = buildDefaultRolePagePermissions();
      setPermissionSaving(true);
      setPermissionError(null);
      try {
        const savedPermissions = await saveRolePagePermissions(def, roles, user?.id);
        setRolePermissions(savedPermissions);
        notify('Role page access restored to system defaults.');
      } catch (saveError) {
        console.error('Error resetting role page permissions:', saveError);
        setPermissionError(saveError.message || 'Could not reset role page permissions.');
        notify('Could not reset role page permissions: ' + (saveError.message || 'Unknown error.'), 'error');
      } finally {
        setPermissionSaving(false);
      }
    }
  };

  const exportCsv = () => {
    const esc = (v) => (v == null ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
    const head = ['employee_id', 'full_name', 'email', 'phone', 'department', 'job_title', 'roles', 'employment_status', 'account_status', 'joined'];
    const lines = filtered.map((e) => [e.employee_id, e.full_name, e.invitation_email, e.phone, e.department, e.job_title,
      rolesOf(e).map((r) => r.name).join(' | '), e.employment_status, e.account_status, e.created_at].map(esc).join(','));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' }));
    a.download = `team-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  /* ---------- Render ---------- */
  if (loading || authLoading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-sm text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
          <span>{translate('Loading team and role directory…')}</span>
        </div>
      </div>
    );
  }

  const availableRoles = selectedEmp ? roleOptions.filter((o) => !rolesOf(selectedEmp).some((r) => r.id === o.value)) : [];

  return (
    <div className="min-h-screen bg-stone-50">
      <style>{`
        @keyframes td-pop { from { opacity: 0; transform: translateY(6px) scale(.98); } to { opacity: 1; transform: none; } }
        @keyframes td-slide { from { transform: translateX(100%); } to { transform: none; } }
        .td-pop { animation: td-pop .16s ease-out; } .td-slide { animation: td-slide .28s cubic-bezier(.22,1,.36,1); }
        @media (prefers-reduced-motion: reduce) { .td-pop, .td-slide { animation-duration: 1ms; } }
      `}</style>

      {toast && (
        <div role="status" className={`td-pop fixed bottom-6 right-6 z-[90] flex items-center gap-3 rounded-xl px-5 py-3 text-sm font-medium shadow-xl ring-1 ring-inset ${toast.tone === 'error' ? 'bg-rose-50 text-rose-800 ring-rose-200' : 'bg-slate-900 text-white ring-slate-800'}`}>
          {toast.tone === 'error' ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
          {toast.message}
        </div>
      )}

      <div className="mx-auto max-w-[1600px] space-y-6 p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                TEAM & ACCESS CONTROL
              </span>
              <span className="text-xs text-slate-400">• Manager Security Hub</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              {translate('Team Directory & Role Access Control')}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {translate('Approve pending staff registrations, assign roles, and restrict page access in real time.')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={fetchTeam} className={btnGhost} title="Refresh">
              <RefreshCw className="h-4 w-4" />{translate('Refresh')}
            </button>
            <button onClick={exportCsv} disabled={!filtered.length} className={btnGhost}>
              <Download className="h-4 w-4" />{translate('Export CSV')}
            </button>
            <button
              onClick={() => setInviteOpen(true)}
              disabled={!canManage}
              className={btnPrimary}
              title={canManage ? undefined : 'Only managers can invite employees'}
            >
              <UserPlus className="h-4 w-4" />{translate('Invite employee')}
            </button>
          </div>
        </div>

        {/* Manager Access Alert */}
        {!canManage && (
          <div role="status" className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <Lock className="h-4 w-4 shrink-0 text-amber-600" />
            <span>{translate('View-only access: Only users with the Manager or Administrator role can assign roles, activate pending accounts, and configure page restrictions.')}</span>
          </div>
        )}

        {/* Tab Navigation Strip */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab('directory')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${
              activeTab === 'directory'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Team Members ({employees.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('pending')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${
              activeTab === 'pending'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Clock className="h-4 w-4 text-amber-500" />
            <span>Pending Approvals</span>
            {pendingEmployees.length > 0 && (
              <span className="ml-1 rounded-full bg-amber-200 px-2 py-0.5 text-[11px] font-bold text-amber-950">
                {pendingEmployees.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('permissions')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${
              activeTab === 'permissions'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Sliders className="h-4 w-4" />
            <span>Role Page Access Matrix</span>
          </button>
        </div>

        {/* TAB 1: PENDING APPROVALS QUEUE */}
        {activeTab === 'pending' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                <ShieldAlert className="h-4 w-4 text-amber-600" />
                <span>Pending Signup Activations ({pendingEmployees.length})</span>
              </div>
              <p className="mt-1 text-xs text-amber-800 leading-relaxed">
                New signups are restricted from logging in until an authorized manager or super admin verifies their identity, assigns appropriate roles, and activates the account.
              </p>
            </div>

            {pendingEmployees.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500 mb-3" />
                <h3 className="text-base font-bold text-slate-900">All caught up!</h3>
                <p className="text-sm text-slate-500 mt-1">There are no pending accounts awaiting manager or super admin approval right now.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingEmployees.map((emp) => {
                  const rs = rolesOf(emp);
                  return (
                    <div key={emp.id} className="rounded-xl border border-amber-200 bg-white p-5 shadow-xs space-y-4 hover:shadow-md transition">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar emp={emp} size="h-11 w-11 text-sm" />
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">{emp.full_name || 'Unnamed'}</h4>
                            <p className="text-xs text-slate-500">{emp.invitation_email || 'No email'}</p>
                            <p className="text-[11px] text-amber-700 font-medium mt-0.5">{emp.job_title || emp.department || 'Operations'}</p>
                          </div>
                        </div>
                        <Badge cls="bg-amber-100 text-amber-900 ring-amber-300 font-bold">Pending</Badge>
                      </div>

                      <div className="border-t border-slate-100 pt-3 text-xs text-slate-600 space-y-1">
                        <p><span className="text-slate-400">Phone:</span> {emp.phone || 'Not provided'}</p>
                        <p><span className="text-slate-400">Registered:</span> {fmtDate(emp.created_at)}</p>
                        <p><span className="text-slate-400">Assigned Role:</span> {rs.length > 0 ? roleLabel(rs[0].name) : 'Pending manager assignment'}</p>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                        <button
                          onClick={() => approveAndActivate(emp)}
                          disabled={!canApproveAccounts || busy}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 text-xs font-semibold shadow-xs transition"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span>Approve & Activate</span>
                        </button>

                        <button
                          onClick={() => rejectAccount(emp)}
                          disabled={!canApproveAccounts || busy}
                          className="inline-flex items-center justify-center rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-700 px-3 py-2 text-xs font-semibold transition"
                          title="Reject and suspend"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ROLE PAGE ACCESS CONTROL MATRIX */}
        {activeTab === 'permissions' && (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Sliders className="h-5 w-5 text-amber-600" />
                    <span>Granular Role Page Access Matrix</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                    As a Manager, you can grant or restrict access to any admin page for each configurable role. Manager and Super Admin roles always retain full access.
                    <strong> Restricted pages are automatically hidden from the staff member’s sidebar and direct URL navigation is blocked.</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetRolePermissionsToDefaults}
                    disabled={!canManage || permissionSaving || Boolean(permissionError)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
                    <span>Reset Defaults</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSavePagePermissions}
                    disabled={!canManage || permissionSaving || Boolean(permissionError)}
                    className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-amber-500 transition"
                  >
                    <Save className="h-4 w-4" />
                    <span>{permissionSaving ? 'Saving…' : 'Save Role Permissions'}</span>
                  </button>
                </div>
              </div>

              {permissionError && (
                <div role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-medium text-rose-800">
                  <div className="flex items-center justify-between gap-3">
                    <span>Could not load or save role permissions: {permissionError}</span>
                    <button type="button" onClick={handleReloadRolePermissions} className="shrink-0 font-semibold underline">
                      Retry
                    </button>
                  </div>
                </div>
              )}

              {isPermsSaved && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Permissions saved successfully! The sidebar and routes reflect these changes immediately.</span>
                </div>
              )}

              {/* Role Selectors */}
              <div className="mt-5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Select Role to Configure:
                </label>
                <div className="flex flex-wrap gap-2">
                  {roles.map((role) => {
                    const isSelected = selectedRoleForPerms === role.name;
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => setSelectedRoleForPerms(role.name)}
                        title={role.description || roleLabel(role.name)}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition ${
                          isSelected
                            ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-white'
                        }`}
                      >
                        <Shield className={`h-3.5 w-3.5 ${isSelected ? 'text-white' : 'text-amber-600'}`} />
                        <span>{roleLabel(role.name)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Page Permissions Matrix for Selected Role */}
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Accessible Pages for: <span className="text-amber-700 underline">{roleLabel(selectedRoleForPerms)}</span>
                  </h3>
                  <span className="text-xs text-slate-400">
                    Toggle to grant or restrict access
                  </span>
                </div>

                {/* Managers and super admins retain full access by policy. */}
                {['manager', 'super_admin'].includes(selectedRoleForPerms) && (
                  <div className="flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
                    <ShieldCheck className="h-5 w-5 shrink-0 text-indigo-600" />
                    <span>
                      <strong>{roleLabel(selectedRoleForPerms)}</strong> always has unrestricted access to every page. Toggles below are shown for reference only and cannot be changed.
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ADMIN_PAGES.map((page) => {
                    const isImmutableRole = ['manager', 'super_admin'].includes(selectedRoleForPerms);
                    const savedPaths = isImmutableRole
                      ? ADMIN_PAGES.map((p) => p.path)
                      : (rolePermissions?.[selectedRoleForPerms] || []);
                    const allowedPaths = Array.isArray(savedPaths) ? savedPaths : [];
                    const isAllowed = isImmutableRole || allowedPaths.includes(page.path);
                    return (
                      <div
                        key={page.path}
                        className={`flex items-start justify-between p-4 rounded-xl border transition ${
                          isAllowed
                            ? 'border-emerald-200 bg-emerald-50/30'
                            : 'border-slate-200 bg-slate-50/60 opacity-80'
                        }`}
                      >
                        <div className="pr-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs">{page.name}</span>
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 font-mono">
                              {page.path}
                            </span>
                            <span className="text-[10px] font-medium text-slate-400">({page.group})</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1 leading-snug">{page.description}</p>
                        </div>

                        <button
                          type="button"
                          disabled={!canManage || isImmutableRole}
                          onClick={() => !isImmutableRole && handleTogglePageAccess(selectedRoleForPerms, page.path)}
                          title={isImmutableRole ? `${roleLabel(selectedRoleForPerms)} always has full access` : (isAllowed ? 'Click to restrict access' : 'Click to grant access')}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            isImmutableRole ? 'cursor-not-allowed opacity-70' : ''
                          } ${isAllowed ? 'bg-emerald-600' : 'bg-slate-300'}`}
                        >
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                              isAllowed ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TEAM DIRECTORY TABLE */}
        {activeTab === 'directory' && (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
              {kpis.map(({ label, value, icon: Icon, chip }) => (
                <div key={label} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white p-4">
                  <div>
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
                  </div>
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${chip}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                </div>
              ))}
            </div>

            {/* Table card */}
            <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white">
              <div className="space-y-3 border-b border-slate-100 p-4">
                <div className="flex flex-col gap-3 xl:flex-row">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search name, email, employee ID or job title"
                      className={`${inputCls} pl-9`}
                      aria-label="Search employees"
                    />
                  </div>
                  <Select className="xl:w-52" prefix="Dept" ariaLabel="Department filter" value={dept} onChange={setDept} options={[{ value: 'all', label: 'All' }, ...DEPT_OPTIONS]} />
                  <Select className="xl:w-56" prefix="Role" ariaLabel="Role filter" value={roleFilter} onChange={setRoleFilter} menuMinWidth={220}
                    options={[{ value: 'all', label: 'All' }, { value: 'none', label: 'No role' }, ...roleOptions]} />
                  <Select className="xl:w-56" prefix="Status" ariaLabel="Employment status filter" value={empStatus} onChange={setEmpStatus} options={[{ value: 'all', label: 'All' }, ...EMPLOYMENT_OPTIONS]} />
                  <Select className="xl:w-56" prefix="Account" ariaLabel="Account status filter" value={acctStatus} onChange={setAcctStatus} options={[{ value: 'all', label: 'All' }, ...toOptions(ACCOUNT)]} />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{filtered.length} of {employees.length} employees</span>
                  {hasFilters && (
                    <button onClick={clearFilters} className="font-medium text-amber-700 underline underline-offset-2 hover:text-amber-800">
                      {translate('Clear filters')}
                    </button>
                  )}
                </div>
              </div>

              {/* Bulk bar */}
              {canManage && selectedIds.size > 0 && (
                <div className="td-pop flex flex-wrap items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2.5">
                  <span className="text-sm font-medium text-amber-900">{selectedIds.size} selected</span>
                  <Select compact className="w-48" ariaLabel="Bulk change department" placeholder="Set department…" value="" onChange={(v) => patchProfiles([...selectedIds], { department: v }, 'Departments updated.')} options={DEPT_OPTIONS} />
                  <Select compact className="w-44" ariaLabel="Bulk change status" placeholder="Set status…" value="" onChange={(v) => patchProfiles([...selectedIds], { employment_status: v }, 'Statuses updated.')} options={EMPLOYMENT_OPTIONS} />
                  <button onClick={bulkSuspend} disabled={busy} className={`${btnDanger} !py-1.5`}>
                    <ShieldAlert className="h-4 w-4" />{translate('Suspend')}
                  </button>
                  <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-xs font-medium text-amber-800 underline underline-offset-2">
                    {translate('Clear selection')}
                  </button>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-stone-50 text-xs text-slate-500">
                      {canManage && (
                        <th className="w-10 px-4 py-3">
                          <input type="checkbox" checked={allOnPage} onChange={toggleAll} aria-label="Select all on this page" className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500" />
                        </th>
                      )}
                      <SortHead label="Employee" k="name" sort={sort} setSort={setSort} />
                      <SortHead label="Department" k="dept" sort={sort} setSort={setSort} />
                      <SortHead label="Role" k="role" sort={sort} setSort={setSort} />
                      <SortHead label="Employment" k="status" sort={sort} setSort={setSort} />
                      <SortHead label="Account" k="account" sort={sort} setSort={setSort} />
                      <SortHead label="Joined" k="joined" sort={sort} setSort={setSort} />
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={canManage ? 8 : 7} className="py-16 text-center text-slate-500">
                          <Users className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                          <p className="font-medium text-slate-700">{translate('No employees match')}</p>
                          <p className="mt-1 text-xs">{translate('Try a different search or clear the filters.')}</p>
                        </td>
                      </tr>
                    ) : rows.map((e) => {
                      const rs = rolesOf(e);
                      const emp = EMPLOYMENT[e.employment_status];
                      const acct = ACCOUNT[e.account_status || 'pending'] || ACCOUNT.pending;
                      const isMe = e.id === user?.id;
                      const isPending = !e.account_status || e.account_status === 'pending';

                      return (
                        <tr
                          key={e.id}
                          tabIndex={0}
                          onClick={() => setSelectedId(e.id)}
                          onKeyDown={(ev) => ev.key === 'Enter' && setSelectedId(e.id)}
                          className={`group cursor-pointer transition-colors hover:bg-amber-50/40 focus:outline-none focus-visible:bg-amber-50/60 ${selectedIds.has(e.id) ? 'bg-amber-50/50' : ''}`}
                        >
                          {canManage && (
                            <td className="px-4 py-3" onClick={(ev) => ev.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={selectedIds.has(e.id)}
                                onChange={() => toggleOne(e.id)}
                                aria-label={`Select ${e.full_name}`}
                                className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                              />
                            </td>
                          )}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar emp={e} />
                              <div className="min-w-0">
                                <p className="truncate font-medium text-slate-900">
                                  {e.full_name || 'Unnamed'}
                                  {isMe && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">{translate('You')}</span>}
                                </p>
                                <p className="truncate text-xs text-slate-400">{e.invitation_email || 'No email'}{e.job_title ? ` · ${e.job_title}` : ''}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {e.department ? <Badge cls={DEPT_STYLE[e.department] || DEPT_STYLE.IT}>{e.department}</Badge> : <span className="text-slate-400">{translate('Unassigned')}</span>}
                          </td>
                          <td className="px-4 py-3">
                            {rs.length === 0 ? <span className="text-slate-400">{translate('No role')}</span> : (
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
                                  {isAdminRole(rs[0].name) ? <ShieldCheck className="h-4 w-4 text-amber-600" /> : <Shield className="h-4 w-4 text-slate-400" />}
                                  {roleLabel(rs[0].name)}
                                </span>
                                {rs.length > 1 && (
                                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600" title={rs.slice(1).map((r) => roleLabel(r.name)).join(', ')}>
                                    +{rs.length - 1}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3" onClick={(ev) => ev.stopPropagation()}>
                            {canManage ? (
                              <Select
                                compact className="w-40" ariaLabel={`Employment status for ${e.full_name}`} value={e.employment_status || 'active'} disabled={busy}
                                onChange={(v) => patchProfiles([e.id], { employment_status: v })} options={EMPLOYMENT_OPTIONS}
                              />
                            ) : emp ? <Badge cls={emp.cls} dot={emp.dot}>{emp.label}</Badge> : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs ${acct.cls}`}>
                              <span className={`h-2 w-2 rounded-full ${acct.dot}`} />
                              {acct.label}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-500">{fmtDate(e.created_at)}</td>
                          <td className="px-4 py-3 text-right" onClick={(ev) => ev.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              {isPending && canApproveAccounts && (
                                <button
                                  disabled={busy}
                                  onClick={() => approveAndActivate(e)}
                                  className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-500 shadow-xs"
                                  title="Approve and activate account"
                                >
                                  <Check className="h-3 w-3" />
                                  <span>Approve</span>
                                </button>
                              )}
                              {e.account_status === 'suspended' && canManage && (
                                <>
                                  {canApproveAccounts && (
                                    <button
                                      disabled={busy}
                                      onClick={() => toggleSuspend(e)}
                                      className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-500 shadow-xs disabled:opacity-50"
                                      title="Activate suspended account"
                                    >
                                      <UserCheck className="h-3 w-3" />
                                      <span>Activate</span>
                                    </button>
                                  )}
                                  <button
                                    disabled={busy}
                                    onClick={() => deleteSuspendedAccount(e)}
                                    className="inline-flex items-center gap-1 rounded bg-rose-600 px-2 py-1 text-xs font-semibold text-white hover:bg-rose-500 shadow-xs disabled:opacity-50"
                                    title="Delete suspended account"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                    <span>Delete</span>
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => setSelectedId(e.id)}
                                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                title="View details"
                              >
                                <ChevronRight className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {filtered.length > PAGE_SIZE && (
                <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-600">
                  <span>Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 hover:bg-slate-50 disabled:opacity-40">
                      <ChevronLeft className="h-3.5 w-3.5" />{translate('Prev')}
                    </button>
                    <span className="px-2">Page {safePage} / {totalPages}</span>
                    <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 hover:bg-slate-50 disabled:opacity-40">
                      Next <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ============ DRAWER ============ */}
      {selectedEmp && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={`Profile of ${selectedEmp.full_name}`}>
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={() => setSelectedId(null)} />
          <div className="td-slide relative flex h-full w-full max-w-md flex-col bg-stone-50 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <h2 className="text-base font-semibold text-slate-900">{translate('Employee profile & security')}</h2>
              <button onClick={() => setSelectedId(null)} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-6">
              <div className="flex items-center gap-4">
                <Avatar emp={selectedEmp} size="h-16 w-16 text-xl" />
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-semibold text-slate-900">{selectedEmp.full_name}</h3>
                  <p className="text-sm text-slate-500">{selectedEmp.job_title || 'No title'}</p>
                  <p className="mt-1 font-mono text-xs text-amber-700">{selectedEmp.employee_id || 'ID pending'}</p>
                </div>
              </div>

              {/* Account Status Card with Approve Action */}
              <section className="space-y-3 rounded-xl border border-slate-200/80 bg-white p-4 text-sm">
                <h4 className="text-sm font-semibold text-slate-900 flex items-center justify-between">
                  <span>Account Activation Status</span>
                  <Badge cls={ACCOUNT[selectedEmp.account_status || 'pending']?.cls}>
                    {ACCOUNT[selectedEmp.account_status || 'pending']?.label}
                  </Badge>
                </h4>

                {(!selectedEmp.account_status || selectedEmp.account_status === 'pending') && canApproveAccounts && (
                  <div className="rounded-lg bg-amber-50 p-3 border border-amber-200 space-y-2">
                    <p className="text-xs text-amber-900 font-medium">
                      This user signed up and cannot log in until approved.
                    </p>
                    <button
                      type="button"
                      onClick={() => approveAndActivate(selectedEmp)}
                      disabled={busy}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-500 transition"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>Approve & Activate Account</span>
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between gap-4 pt-1">
                  <span className="flex items-center gap-2 text-slate-500">
                    <ShieldAlert className="h-4 w-4" />
                    <span>Change Status</span>
                  </span>
                  <Select
                    compact align="right" className="w-44" ariaLabel="Account status"
                    value={selectedEmp.account_status || 'pending'}
                    disabled={!canManage || busy || !selectedEmp.account_status || selectedEmp.account_status === 'pending'}
                    onChange={(v) => patchProfiles([selectedEmp.id], { account_status: v }, `Account status updated to ${v}.`)}
                    options={toOptions(ACCOUNT).filter((option) => option.value !== 'active' || selectedEmp.account_status === 'active' || canApproveAccounts)}
                  />
                </div>
              </section>

              <section className="space-y-3 rounded-xl border border-slate-200/80 bg-white p-4 text-sm">
                <h4 className="text-sm font-semibold text-slate-900">{translate('Contact')}</h4>
                {[[Mail, 'Email', selectedEmp.invitation_email], [Phone, 'Phone', selectedEmp.phone], [Globe, 'Timezone', selectedEmp.timezone || 'Africa/Casablanca']].map(([Icon, l, v]) => (
                  <div key={l} className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-2 text-slate-500"><Icon className="h-4 w-4" />{l}</span>
                    <span className="truncate font-medium text-slate-900">{v || 'N/A'}</span>
                  </div>
                ))}
              </section>

              <section className="space-y-3 rounded-xl border border-slate-200/80 bg-white p-4 text-sm">
                <h4 className="text-sm font-semibold text-slate-900">{translate('Employment')}</h4>
                <div className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-2 text-slate-500"><Building className="h-4 w-4" />{translate('Department')}</span>
                  <Select compact align="right" className="w-44" ariaLabel="Department" placeholder="Unassigned" value={selectedEmp.department || ''} disabled={!canManage || busy}
                    onChange={(v) => patchProfiles([selectedEmp.id], { department: v })} options={DEPT_OPTIONS} />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-2 text-slate-500"><Briefcase className="h-4 w-4" />{translate('Status')}</span>
                  <Select compact align="right" className="w-44" ariaLabel="Employment status" value={selectedEmp.employment_status || 'active'} disabled={!canManage || busy}
                    onChange={(v) => patchProfiles([selectedEmp.id], { employment_status: v })} options={EMPLOYMENT_OPTIONS} />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-2 text-slate-500"><Calendar className="h-4 w-4" />{translate('Joined')}</span>
                  <span className="font-medium text-slate-900">{fmtDate(selectedEmp.created_at)}</span>
                </div>
              </section>

              {/* Roles Section - ONLY managers can assign / remove */}
              <section className="space-y-3 rounded-xl border border-slate-200/80 bg-white p-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-900">{translate('Assigned Roles')}</h4>
                  <span className="text-xs text-slate-400">{canManage ? 'Manager Control' : 'Read-only'}</span>
                </div>
                {rolesOf(selectedEmp).length === 0 ? <p className="text-sm text-slate-500">{translate('No roles assigned.')}</p> : (
                  <ul className="space-y-2">
                    {rolesOf(selectedEmp).map((r) => (
                      <li key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="rounded-lg bg-amber-50 p-2 text-amber-600">
                            {isAdminRole(r.name) ? <ShieldCheck className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-900">{roleLabel(r.name)}</p>
                            {r.description && <p className="truncate text-xs text-slate-400">{r.description}</p>}
                          </div>
                        </div>
                        {canManage && (
                          <button onClick={() => removeRole(selectedEmp, r)} disabled={busy} className="rounded-lg p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600" title="Remove role">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {canManage && availableRoles.length > 0 && (
                  <div className="pt-2">
                    <Select placeholder="Assign another role…" value="" onChange={(v) => assignRole(selectedEmp, v)} options={availableRoles} disabled={busy} />
                  </div>
                )}
              </section>
            </div>

            {canManage && (
              <div className="border-t border-slate-200 bg-white p-4 flex gap-2">
                {selectedEmp.account_status === 'suspended' && (
                  <button onClick={() => deleteSuspendedAccount(selectedEmp)} disabled={busy} className={btnDanger}>
                    <Trash2 className="h-4 w-4" />
                    {translate('Delete account')}
                  </button>
                )}
                <button
                  onClick={() => toggleSuspend(selectedEmp)}
                  disabled={busy || (selectedEmp.account_status === 'suspended' && !canApproveAccounts)}
                  className={`flex-1 ${selectedEmp.account_status === 'suspended' ? btnPrimary : btnDanger}`}
                >
                  {selectedEmp.account_status === 'suspended' ? <UserCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                  {selectedEmp.account_status === 'suspended' ? translate('Reactivate account') : translate('Suspend account')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============ INVITE MODAL ============ */}
      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={() => setInviteOpen(false)} />
          <form onSubmit={sendInvite} className="td-pop relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-amber-600" />
                <span>Invite New Employee</span>
              </h3>
              <button type="button" onClick={() => setInviteOpen(false)} className="rounded p-1 text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
              <input required value={invite.full_name} onChange={(e) => setInvite({ ...invite, full_name: e.target.value })} className={inputCls} placeholder="e.g. Fatima Zahra" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <input required type="email" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} className={inputCls} placeholder="fatima@habibi-adventure.com" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                <select value={invite.department} onChange={(e) => setInvite({ ...invite, department: e.target.value })} className={inputCls}>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Job Title</label>
                <input value={invite.job_title} onChange={(e) => setInvite({ ...invite, job_title: e.target.value })} className={inputCls} placeholder="e.g. Sales Agent" />
              </div>
            </div>
            <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
              New accounts start in <strong>Pending</strong> status until a manager or super admin verifies and activates them.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setInviteOpen(false)} className={btnGhost}>Cancel</button>
              <button type="submit" disabled={busy} className={btnPrimary}>Send Invitation</button>
            </div>
          </form>
        </div>
      )}

      {/* ============ CONFIRM MODAL ============ */}
      {confirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={() => setConfirm(null)} />
          <div className="td-pop relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">{confirm.title}</h3>
            <p className="text-xs text-slate-600 leading-relaxed">{confirm.message}</p>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setConfirm(null)} className={btnGhost}>Cancel</button>
              <button
                type="button"
                onClick={() => { const fn = confirm.onConfirm; setConfirm(null); fn?.(); }}
                className={confirm.tone === 'danger' ? btnDanger : btnPrimary}
              >
                {confirm.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

