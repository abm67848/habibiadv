import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LogOut, ChevronDown, Settings, ExternalLink, User, LifeBuoy, Menu, Loader2, AlertTriangle,
} from 'lucide-react';
import { useAuth, useAppSettings } from '../../context/index.jsx';
import { canUserAccessPath } from '../../services/roleAccessService.js';

/* ---------- Constantes ---------- */
const ROLE_LABELS = {
  super_admin: 'Superadministrador',
  admin: 'Administrador',
  manager: 'Gerente',
  agent: 'Agente',
  staff: 'Personal',
  accountant: 'Contable',
};
const roleLabel = (r = '') =>
  ROLE_LABELS[r] || r.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

// Se evalúa de la ruta más específica a la más general. Las claves coinciden con las de AdminSidebar.
const SECTIONS = [
  { prefix: '/admin/packages', key: 'nav_packages', fallback: 'Paquetes y servicios' },
  { prefix: '/admin/bookings', key: 'nav_bookings', fallback: 'Reservas' },
  { prefix: '/admin/reservations', key: 'nav_bookings', fallback: 'Reservas' },
  { prefix: '/admin/customers', key: 'nav_customers', fallback: 'Clientes' },
  { prefix: '/admin/suppliers', key: 'nav_suppliers', fallback: 'Proveedores' },
  { prefix: '/admin/contracts', key: 'nav_contracts', fallback: 'Contratos' },
  { prefix: '/admin/finance', key: 'nav_finance_title', fallback: 'Resumen financiero' },
  { prefix: '/admin/payments-transactions', key: 'nav_payments', fallback: 'Pagos y transacciones' },
  { prefix: '/admin/expenses', key: 'nav_expenses', fallback: 'Gastos' },
  { prefix: '/admin/analytics', key: 'nav_analytics', fallback: 'Analítica' },
  { prefix: '/admin/team', key: 'nav_team', fallback: 'Equipo' },
  { prefix: '/admin/settings', key: 'nav_settings', fallback: 'Ajustes' },
  { prefix: '/admin/profile', key: 'nav_profile', fallback: 'Mi perfil' },
  { prefix: '/admin/support', key: 'nav_support', fallback: 'Soporte' },
  { prefix: '/admin', key: 'nav_dashboard', fallback: 'Panel' },
];

const matchesPrefix = (pathname, prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`);

const ITEM_BASE =
  'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors ' +
  'focus:outline-none disabled:cursor-not-allowed disabled:opacity-50';
const ITEM_DEFAULT = `${ITEM_BASE} text-slate-700 hover:bg-amber-50 focus-visible:bg-amber-50`;

/* ---------- Avatar ---------- */
function Avatar({ src, initial, alt }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [src]);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={alt}
        onError={() => setFailed(true)}
        className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-slate-200"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-amber-100"
    >
      {initial}
    </span>
  );
}

/* ---------- Componente ---------- */
export default function AdminTopbar({ onMenuClick }) {
  const { user, profile, roles, rolePagePermissions, signOut } = useAuth();
  const { t } = useAppSettings();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');
  const wrapperRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Admin';
  const roleName = roles?.[0] ? roleLabel(roles[0]) : 'Administrador';
  const initial = displayName.charAt(0).toUpperCase();

  const section = useMemo(() => {
    const hit = SECTIONS.find((s) => matchesPrefix(pathname, s.prefix));
    return hit ? t(hit.key, hit.fallback) : null;
  }, [pathname, t]);

  const canSee = useCallback(
    (path) => canUserAccessPath(roles, path, rolePagePermissions),
    [roles, rolePagePermissions],
  );

  const items = useMemo(
    () => [
      { path: '/admin/profile', icon: User, label: t('nav_profile', 'Mi perfil') },
      { path: '/admin/settings', icon: Settings, label: t('nav_settings', 'Ajustes') },
      { path: '/admin/support', icon: LifeBuoy, label: t('nav_support', 'Soporte') },
    ].filter((item) => item.path === '/admin/profile' || canSee(item.path)),
    [t, canSee],
  );

  const close = useCallback((returnFocus = false) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  /* Cierra al hacer clic fuera y con Escape */
  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) close();
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') close(true);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, close]);

  /* Al abrir el menú, el foco va al primer elemento */
  useEffect(() => {
    if (open) menuRef.current?.querySelector('[role="menuitem"]')?.focus();
  }, [open]);

  /* Cierra el menú al cambiar de ruta */
  useEffect(() => { setOpen(false); }, [pathname]);

  const onMenuKeyDown = (e) => {
    const els = Array.from(menuRef.current?.querySelectorAll('[role="menuitem"]:not(:disabled)') || []);
    if (!els.length) return;
    const idx = els.indexOf(document.activeElement);
    const focusAt = (i) => { e.preventDefault(); els[(i + els.length) % els.length].focus(); };

    switch (e.key) {
      case 'ArrowDown': focusAt(idx + 1); break;
      case 'ArrowUp': focusAt(idx - 1); break;
      case 'Home': focusAt(0); break;
      case 'End': focusAt(els.length - 1); break;
      case 'Tab': close(); break;
      default: break;
    }
  };

  const onTriggerKeyDown = (e) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      setOpen(true);
    }
  };

  const go = (path) => {
    close();
    navigate(path);
  };

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError('');
    try {
      await signOut();
      close();
      navigate('/auth/admin-login');
    } catch (err) {
      console.error('Sign out error:', err);
      setSignOutError('No se pudo cerrar la sesión. Inténtalo de nuevo.');
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b border-slate-200/80 bg-white px-4 text-slate-800 select-none sm:px-6">
      <style>{`
        @keyframes rp-pop { from { opacity: 0; transform: translateY(6px) scale(.98); } to { opacity: 1; transform: none; } }
        .rp-pop { animation: rp-pop .16s ease-out; }
        @media (prefers-reduced-motion: reduce) { .rp-pop { animation-duration: 1ms; } }
      `}</style>

      {/* Izquierda: menú móvil + sección actual */}
      <div className="flex min-w-0 items-center gap-3">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="-ml-1 rounded-lg p-2 text-slate-500 transition-colors hover:bg-stone-50 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 lg:hidden rtl:-mr-1 rtl:ml-0"
            aria-label={t('open_menu', 'Abrir menú de navegación')}
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        {section && (
          <p className="truncate text-sm font-medium text-slate-500">
            <span className="hidden sm:inline">{t('current_section', 'Estás en')}: </span>
            <span className="font-semibold text-slate-900">{section}</span>
          </p>
        )}
      </div>

      {/* Derecha: sitio público + perfil */}
      <div className="flex shrink-0 items-center gap-3 sm:gap-4">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
          title={t('live_site_title', 'Abrir el sitio público en una pestaña nueva')}
        >
          <span className="hidden sm:inline">{t('live_site', 'Ver sitio público')}</span>
          <ExternalLink className="h-4 w-4 text-slate-400 transition-colors group-hover:text-amber-600" aria-hidden="true" />
          <span className="sr-only sm:hidden">{t('live_site', 'Ver sitio público')}</span>
        </a>

        <div className="h-5 w-px bg-slate-200" aria-hidden="true" />

        {user ? (
          <div className="relative" ref={wrapperRef}>
            <button
              ref={triggerRef}
              type="button"
              onClick={() => setOpen((v) => !v)}
              onKeyDown={onTriggerKeyDown}
              aria-haspopup="menu"
              aria-expanded={open}
              aria-label={`${t('account_menu', 'Menú de la cuenta')}: ${displayName}`}
              className={`flex items-center gap-2.5 rounded-xl border p-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 ${
                open ? 'border-amber-300 bg-amber-50/60' : 'border-transparent hover:border-slate-200 hover:bg-stone-50'
              }`}
            >
              <Avatar src={profile?.avatar_url} initial={initial} alt="" />
              <span className="hidden text-left rtl:text-right sm:block">
                <span className="block max-w-[10rem] truncate text-sm font-semibold leading-tight text-slate-900">
                  {displayName}
                </span>
                <span className="block text-xs leading-tight text-slate-500">{roleName}</span>
              </span>
              <ChevronDown
                aria-hidden="true"
                className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180 text-amber-600' : ''}`}
              />
            </button>

            {open && (
              <div
                ref={menuRef}
                role="menu"
                aria-label={t('account_menu', 'Menú de la cuenta')}
                onKeyDown={onMenuKeyDown}
                className="rp-pop absolute right-0 z-50 mt-2 w-72 origin-top-right overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10 ring-1 ring-black/5 rtl:left-0 rtl:right-auto"
              >
                {/* Cabecera de identidad */}
                <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5">
                  <Avatar src={profile?.avatar_url} initial={initial} alt="" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{displayName}</p>
                    {user?.email && <p className="truncate text-xs text-slate-500">{user.email}</p>}
                    <span className="mt-1 inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200">
                      {roleName}
                    </span>
                  </div>
                </div>

                <div className="p-1.5">
                  {items.map(({ path, icon: Icon, label }) => (
                    <button
                      key={path}
                      type="button"
                      role="menuitem"
                      onClick={() => go(path)}
                      className={ITEM_DEFAULT}
                    >
                      <Icon className="h-4 w-4 text-slate-400" aria-hidden="true" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>

                <div className="border-t border-slate-100 p-1.5">
                  {signOutError && (
                    <p role="alert" className="mb-1 flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-600" aria-hidden="true" />
                      {signOutError}
                    </p>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className={`${ITEM_BASE} font-medium text-rose-600 hover:bg-rose-50 focus-visible:bg-rose-50`}
                  >
                    {signingOut
                      ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      : <LogOut className="h-4 w-4" aria-hidden="true" />}
                    <span>{signingOut ? t('signing_out', 'Cerrando sesión…') : t('sign_out', 'Cerrar sesión')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => navigate('/auth/admin-login')}
            className="inline-flex items-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 focus-visible:ring-offset-2"
          >
            {t('sign_in', 'Iniciar sesión')}
          </button>
        )}
      </div>
    </header>
  );
}