import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Compass,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  Mail,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
  Search,
  Settings,
  User,
  UserCog,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import LOGO from '../../assets/logo.png';
import { useAppSettings, useAuth } from '../../context/index.jsx';
import { canUserAccessPath } from '../../services/roleAccessService.js';

/**
 * Barra lateral avanzada.
 *
 * Novedades respecto a la versión básica:
 *  - Grupos plegables; el grupo de la ruta activa se abre solo al navegar.
 *  - Modo compacto (solo iconos) con información en `title`.
 *  - Búsqueda en el menú (ignora tildes y mayúsculas) con atajo "/".
 *  - Insignias opcionales por ruta mediante la prop `badges`.
 *  - Navegación con teclado: ↑ ↓ Home End entre enlaces.
 *  - Preferencias (compacto y grupos plegados) guardadas en localStorage.
 *
 * Props:
 *  - onNavigate:       se llama al pulsar un enlace (útil para cerrar el menú en móvil).
 *  - badges:           objeto { '/admin/bookings': 3, '/admin/support': 'Nuevo' }.
 *  - defaultCollapsed: estado compacto inicial si no hay preferencia guardada.
 *
 * Los textos en español son los valores por defecto: se usan cuando el diccionario
 * de traducciones de `useAppSettings().t` no tiene la clave correspondiente.
 */
const NAVIGATION_GROUPS = [
  {
    titleKey: 'nav_overview',
    fallbackTitle: 'Resumen',
    items: [
      { nameKey: 'nav_dashboard', fallbackName: 'Panel', path: '/admin', icon: LayoutDashboard, end: true },
    ],
  },
  {
    titleKey: 'nav_sales_operations',
    fallbackTitle: 'Ventas y operaciones',
    items: [
      { nameKey: 'nav_packages', fallbackName: 'Paquetes y servicios', path: '/admin/packages', icon: Compass },
      { nameKey: 'nav_blog', fallbackName: 'Blog y Artículos', path: '/admin/blog', icon: BookOpen },
      { nameKey: 'nav_bookings', fallbackName: 'Reservas', path: '/admin/bookings', icon: CalendarDays },
      { nameKey: 'nav_customers', fallbackName: 'Clientes', path: '/admin/customers', icon: Users },
      { nameKey: 'nav_messages', fallbackName: 'Mensajes de contacto', path: '/admin/messages', icon: Mail },
    ],
  },
  {
    titleKey: 'nav_partners',
    fallbackTitle: 'Socios',
    items: [
      { nameKey: 'nav_suppliers', fallbackName: 'Proveedores', path: '/admin/suppliers', icon: Building2 },
      { nameKey: 'nav_contracts', fallbackName: 'Contratos', path: '/admin/contracts', icon: FileText },
    ],
  },
  {
    titleKey: 'nav_finance',
    fallbackTitle: 'Finanzas',
    items: [
      { nameKey: 'nav_finance_title', fallbackName: 'Resumen financiero', path: '/admin/finance', icon: Wallet },
      {
        nameKey: 'nav_payments',
        fallbackName: 'Pagos y transacciones',
        path: '/admin/payments-transactions',
        icon: ArrowLeftRight,
      },
      { nameKey: 'nav_expenses', fallbackName: 'Gastos', path: '/admin/expenses', icon: Receipt },
    ],
  },
  {
    titleKey: 'nav_insights',
    fallbackTitle: 'Análisis',
    items: [
      { nameKey: 'nav_analytics', fallbackName: 'Analítica', path: '/admin/analytics', icon: BarChart3 },
    ],
  },
  {
    titleKey: 'nav_administration',
    fallbackTitle: 'Administración',
    items: [
      { nameKey: 'nav_team', fallbackName: 'Equipo', path: '/admin/team', icon: UserCog },
      { nameKey: 'nav_settings', fallbackName: 'Ajustes', path: '/admin/settings', icon: Settings },
      { nameKey: 'nav_profile', fallbackName: 'Mi perfil', path: '/admin/profile', icon: User },
    ],
  },
];

const BOTTOM_GROUP = {
  titleKey: 'nav_help',
  fallbackTitle: 'Ayuda',
  items: [{ nameKey: 'nav_support', fallbackName: 'Soporte', path: '/admin/support', icon: LifeBuoy }],
};

const LANGUAGE_NAMES = {
  es: 'Español',
  fr: 'Francés',
  en: 'Inglés',
  ar: 'Árabe',
};

/* ------------------------------------------------------------------ */
/*  Utilidades                                                         */
/* ------------------------------------------------------------------ */
const STORAGE_KEY = 'admin-sidebar:v1';

function readPrefs() {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function writePrefs(prefs) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* almacenamiento no disponible: se ignora */
  }
}

// Minúsculas y sin tildes, para que "analitica" encuentre "Analítica"
const normalize = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const matchesPath = (item, pathname) =>
  item.end ? pathname === item.path : pathname === item.path || pathname.startsWith(`${item.path}/`);

const hasBadge = (badge) => badge !== undefined && badge !== null && badge !== '' && badge !== 0;

const linkClass = ({ isActive }) =>
  `group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors
   focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 ${
    isActive ? 'bg-amber-50 text-amber-900' : 'text-slate-600 hover:bg-stone-50 hover:text-slate-900'
  }`;

/* ------------------------------------------------------------------ */
/*  Elemento de navegación                                             */
/* ------------------------------------------------------------------ */
function NavItem({ item, label, badge, collapsed, onNavigate }) {
  const Icon = item.icon;
  const showBadge = hasBadge(badge);

  return (
    <li>
      <NavLink
        to={item.path}
        end={item.end}
        data-nav-link="true"
        onClick={onNavigate}
        title={collapsed ? label : undefined}
        aria-label={collapsed ? label : undefined}
        className={(state) => `${linkClass(state)} ${collapsed ? 'justify-center px-0' : ''}`}
      >
        {({ isActive }) => (
          <>
            {isActive && (
              <span
                aria-hidden="true"
                className="absolute inset-y-1.5 start-0 w-1 rounded-full bg-amber-500"
              />
            )}
            <Icon
              aria-hidden="true"
              className={`h-4 w-4 shrink-0 transition-colors ${
                isActive ? 'text-amber-600' : 'text-slate-400 group-hover:text-slate-500'
              }`}
            />
            {!collapsed && <span className="truncate">{label}</span>}
            {showBadge &&
              (collapsed ? (
                <span
                  aria-hidden="true"
                  className="absolute end-2 top-1.5 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white"
                />
              ) : (
                <span className="ms-auto rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-amber-800">
                  {badge}
                </span>
              ))}
          </>
        )}
      </NavLink>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/*  Grupo de navegación (plegable)                                     */
/* ------------------------------------------------------------------ */
function NavGroup({
  group, t, badges, collapsed, collapsible = true, closed = false, forceOpen = false,
  hasActive = false, onToggle, onNavigate,
}) {
  const headingId = `nav-group-${group.titleKey}`;
  const listId = `nav-list-${group.titleKey}`;
  const title = t(group.titleKey, group.fallbackTitle);
  const isOpen = collapsed || !collapsible || forceOpen || !closed;

  return (
    <section aria-labelledby={headingId}>
      {collapsed ? (
        <h2 id={headingId} className="sr-only">{title}</h2>
      ) : collapsible ? (
        <h2 id={headingId} className="mb-1">
          <button
            type="button"
            onClick={() => onToggle(group.titleKey)}
            aria-expanded={isOpen}
            aria-controls={listId}
            className="flex w-full items-center justify-between rounded-md px-3 py-1 text-xs font-medium text-slate-400 transition-colors hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
          >
            <span className="flex items-center gap-1.5">
              {title}
              {!isOpen && hasActive && (
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              )}
            </span>
            <ChevronDown
              aria-hidden="true"
              className={`h-3.5 w-3.5 transition-transform ${isOpen ? '' : '-rotate-90 rtl:rotate-90'}`}
            />
          </button>
        </h2>
      ) : (
        <h2 id={headingId} className="mb-1.5 px-3 text-xs font-medium text-slate-400">{title}</h2>
      )}

      <ul id={listId} hidden={!isOpen} className="space-y-0.5">
        {group.items.map((item) => (
          <NavItem
            key={item.path}
            item={item}
            label={t(item.nameKey, item.fallbackName)}
            badge={badges[item.path]}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Barra lateral                                                      */
/* ------------------------------------------------------------------ */
export default function AdminSidebar({ onNavigate, badges = {}, defaultCollapsed = false }) {
  const { t, settings } = useAppSettings();
  const { roles, rolePagePermissions } = useAuth();
  const { pathname } = useLocation();

  const initialPrefs = useMemo(readPrefs, []);
  const [collapsed, setCollapsed] = useState(initialPrefs.collapsed ?? defaultCollapsed);
  const [closedGroups, setClosedGroups] = useState(initialPrefs.closedGroups ?? {});
  const [query, setQuery] = useState('');

  const asideRef = useRef(null);
  const searchRef = useRef(null);

  // Guarda las preferencias cuando cambian
  useEffect(() => {
    writePrefs({ collapsed, closedGroups });
  }, [collapsed, closedGroups]);

  // Quita los elementos restringidos; si un grupo se queda sin elementos visibles, se oculta por completo
  const permittedGroups = useMemo(
    () =>
      NAVIGATION_GROUPS.map((group) => ({
        ...group,
        items: group.items.filter((item) => canUserAccessPath(roles, item.path, rolePagePermissions)),
      })).filter((group) => group.items.length > 0),
    [roles, rolePagePermissions],
  );

  const showBottomHelp = useMemo(
    () => BOTTOM_GROUP.items.some((item) => canUserAccessPath(roles, item.path, rolePagePermissions)),
    [roles, rolePagePermissions],
  );

  // Filtro de búsqueda: coincide con el nombre del elemento o con el del grupo
  const normalizedQuery = normalize(query.trim());
  const visibleGroups = useMemo(() => {
    if (!normalizedQuery) return permittedGroups;
    return permittedGroups
      .map((group) => {
        const groupMatches = normalize(t(group.titleKey, group.fallbackTitle)).includes(normalizedQuery);
        const items = groupMatches
          ? group.items
          : group.items.filter((item) => normalize(t(item.nameKey, item.fallbackName)).includes(normalizedQuery));
        return { ...group, items };
      })
      .filter((group) => group.items.length > 0);
  }, [permittedGroups, normalizedQuery, t]);

  // Abre automáticamente el grupo de la ruta activa al navegar
  useEffect(() => {
    const activeGroup = permittedGroups.find((group) => group.items.some((item) => matchesPath(item, pathname)));
    if (activeGroup) {
      setClosedGroups((current) =>
        current[activeGroup.titleKey] ? { ...current, [activeGroup.titleKey]: false } : current,
      );
    }
    // Solo al cambiar de ruta: si dependiera de closedGroups, el usuario no podría plegar el grupo activo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggleGroup = useCallback((key) => {
    setClosedGroups((current) => ({ ...current, [key]: !current[key] }));
  }, []);

  const expandAndFocusSearch = useCallback(() => {
    setCollapsed(false);
    window.setTimeout(() => searchRef.current?.focus(), 0);
  }, []);

  // Atajo global "/" para ir a la búsqueda (no interfiere al escribir en otros campos)
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
      const el = document.activeElement;
      const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
      if (typing) return;
      event.preventDefault();
      expandAndFocusSearch();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [expandAndFocusSearch]);

  // Navegación con teclado entre enlaces visibles: ↑ ↓ Home End
  function handleNavKeyDown(event) {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const links = Array.from(asideRef.current?.querySelectorAll('[data-nav-link]') || [])
      .filter((el) => el.offsetParent !== null);
    const index = links.indexOf(document.activeElement);
    if (index === -1) return;

    event.preventDefault();
    let nextIndex = index;
    if (event.key === 'ArrowDown') nextIndex = Math.min(index + 1, links.length - 1);
    if (event.key === 'ArrowUp') nextIndex = Math.max(index - 1, 0);
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = links.length - 1;
    links[nextIndex]?.focus();
  }

  const languageCode = settings.adminLanguage;
  const languageName = LANGUAGE_NAMES[languageCode] || languageCode;
  const searching = Boolean(normalizedQuery);

  return (
    <aside
      ref={asideRef}
      className={`flex h-screen shrink-0 select-none flex-col border-r border-slate-200/80 bg-white text-slate-700 transition-[width] duration-200 ${
        collapsed ? 'w-[4.5rem]' : 'w-64'
      }`}
    >
      {/* Marca + botón de contraer */}
      <div className={`flex h-16 items-center border-b border-slate-100 ${collapsed ? 'justify-center px-2' : 'gap-3 px-4'}`}>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-stone-50 ring-1 ring-inset ring-slate-200">
          <img src={LOGO} alt="" className="h-7 w-7 object-contain" />
        </span>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold tracking-tight text-slate-900">
              {settings.agencyName || 'Habibi Adventure'}
            </p>
            <p className="truncate text-xs text-slate-500">{t('portal_admin', 'Portal de administración')}</p>
          </div>
        )}
        {!collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            aria-label={t('nav_collapse', 'Contraer barra lateral')}
            title={t('nav_collapse', 'Contraer barra lateral')}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
          >
            <PanelLeftClose aria-hidden="true" className="h-4 w-4 rtl:rotate-180" />
          </button>
        )}
      </div>

      {/* Búsqueda */}
      <div className={`border-b border-slate-100 ${collapsed ? 'px-2 py-2' : 'px-3 py-3'}`}>
        {collapsed ? (
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              aria-label={t('nav_expand', 'Expandir barra lateral')}
              title={t('nav_expand', 'Expandir barra lateral')}
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
            >
              <PanelLeftOpen aria-hidden="true" className="h-4 w-4 rtl:rotate-180" />
            </button>
            <button
              type="button"
              onClick={expandAndFocusSearch}
              aria-label={t('nav_search_label', 'Buscar en el menú')}
              title={t('nav_search_label', 'Buscar en el menú')}
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
            >
              <Search aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <label className="relative block">
            <span className="sr-only">{t('nav_search_label', 'Buscar en el menú')}</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
            />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  setQuery('');
                  event.currentTarget.blur();
                }
              }}
              placeholder={t('nav_search_placeholder', 'Buscar en el menú…')}
              className="w-full rounded-lg border border-slate-200 bg-stone-50/60 py-1.5 pe-14 ps-8 text-xs text-slate-800 placeholder:text-slate-400 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 [&::-webkit-search-cancel-button]:hidden"
            />
            {query ? (
              <button
                type="button"
                onClick={() => { setQuery(''); searchRef.current?.focus(); }}
                aria-label={t('nav_search_clear', 'Borrar búsqueda')}
                className="absolute end-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X aria-hidden="true" className="h-3 w-3" />
              </button>
            ) : (
              <kbd
                aria-hidden="true"
                className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 text-[10px] font-medium text-slate-400"
              >
                /
              </kbd>
            )}
          </label>
        )}
      </div>

      {/* Navegación */}
      <nav
        aria-label={t('nav_aria', 'Navegación de administración')}
        onKeyDown={handleNavKeyDown}
        className={`flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-slate-200 ${
          collapsed ? 'space-y-3 px-2' : 'space-y-5 px-3'
        }`}
      >
        {visibleGroups.length === 0 ? (
          <p role="status" className="px-3 py-6 text-center text-xs text-slate-400">
            {t('nav_no_results', 'No se encontraron resultados')}
          </p>
        ) : (
          visibleGroups.map((group, index) => (
            <React.Fragment key={group.titleKey}>
              {collapsed && index > 0 && <div aria-hidden="true" className="mx-2 border-t border-slate-100" />}
              <NavGroup
                group={group}
                t={t}
                badges={badges}
                collapsed={collapsed}
                closed={Boolean(closedGroups[group.titleKey])}
                forceOpen={searching}
                hasActive={group.items.some((item) => matchesPath(item, pathname))}
                onToggle={toggleGroup}
                onNavigate={onNavigate}
              />
            </React.Fragment>
          ))
        )}
      </nav>

      {/* Categoría fija abajo: Soporte */}
      {showBottomHelp && (
        <nav
          aria-label={t('nav_help', 'Ayuda')}
          onKeyDown={handleNavKeyDown}
          className={`border-t border-slate-100 py-4 ${collapsed ? 'px-2' : 'px-3'}`}
        >
          <NavGroup
            group={BOTTOM_GROUP}
            t={t}
            badges={badges}
            collapsed={collapsed}
            collapsible={false}
            onNavigate={onNavigate}
          />
        </nav>
      )}

      {/* Pie: moneda e idioma actuales */}
      <Link
        to="/admin/settings"
        onClick={onNavigate}
        className={`group flex items-center border-t border-slate-100 bg-stone-50/70 py-3 text-xs text-slate-500 transition-colors hover:bg-amber-50/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500/40 ${
          collapsed ? 'justify-center px-2' : 'justify-between gap-3 px-4'
        }`}
        title={
          collapsed
            ? `${t('currency_label', 'Moneda')}: ${settings.currency}${languageName ? ` · ${languageName}` : ''}`
            : t('change_in_settings', 'Cambiar en Ajustes')
        }
      >
        {collapsed ? (
          <strong className="font-semibold text-slate-800">{settings.currency}</strong>
        ) : (
          <>
            <span className="min-w-0 truncate">
              {t('currency_label', 'Moneda')}:{' '}
              <strong className="font-semibold text-slate-800">{settings.currency}</strong>
              {languageName && (
                <>
                  {' · '}
                  <span title={languageName}>{languageName}</span>
                </>
              )}
            </span>
            <ChevronRight
              aria-hidden="true"
              className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-amber-600 rtl:rotate-180"
            />
          </>
        )}
      </Link>
    </aside>
  );
}