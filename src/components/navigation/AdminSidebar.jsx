import React, { useMemo } from 'react';
import {
  ArrowLeftRight,
  BarChart3,
  Building2,
  CalendarDays,
  Compass,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  Receipt,
  Settings,
  User,
  UserCog,
  Users,
  Wallet,
} from 'lucide-react';
import { NavLink, Link } from 'react-router-dom';
import LOGO from '../../assets/logo.png';
import { useAppSettings, useAuth } from '../../context/index.jsx';
import { canUserAccessPath } from '../../services/roleAccessService.js';

/**
 * Grouped by how an agency actually works:
 *  - Overview:    where you land
 *  - Sales & operations: what you sell and the day-to-day with travelers
 *  - Partners:    the suppliers you buy from and the agreements with them
 *  - Finance:     money in, money out
 *  - Insights:    reporting
 *  - Administration: your team and system configuration
 *  - Help (pinned to the bottom): support, in its own category
 */
const NAVIGATION_GROUPS = [
  {
    titleKey: 'nav_overview',
    fallbackTitle: 'Overview',
    items: [
      { nameKey: 'nav_dashboard', fallbackName: 'Dashboard', path: '/admin', icon: LayoutDashboard, end: true },
    ],
  },
  {
    titleKey: 'nav_sales_operations',
    fallbackTitle: 'Sales & operations',
    items: [
      { nameKey: 'nav_packages', fallbackName: 'Packages & Services', path: '/admin/packages', icon: Compass },
      { nameKey: 'nav_bookings', fallbackName: 'Bookings', path: '/admin/bookings', icon: CalendarDays },
      { nameKey: 'nav_customers', fallbackName: 'Customers', path: '/admin/customers', icon: Users },
    ],
  },
  {
    titleKey: 'nav_partners',
    fallbackTitle: 'Partners',
    items: [
      { nameKey: 'nav_suppliers', fallbackName: 'Suppliers', path: '/admin/suppliers', icon: Building2 },
      { nameKey: 'nav_contracts', fallbackName: 'Contracts', path: '/admin/contracts', icon: FileText },
    ],
  },
  {
    titleKey: 'nav_finance',
    fallbackTitle: 'Finance',
    items: [
      { nameKey: 'nav_finance_title', fallbackName: 'Finance', path: '/admin/finance', icon: Wallet },
      {
        nameKey: 'nav_payments',
        fallbackName: 'Payments & Transactions',
        path: '/admin/payments-transactions',
        icon: ArrowLeftRight,
      },
      { nameKey: 'nav_expenses', fallbackName: 'Expenses', path: '/admin/expenses', icon: Receipt },
    ],
  },
  {
    titleKey: 'nav_insights',
    fallbackTitle: 'Insights',
    items: [
      { nameKey: 'nav_analytics', fallbackName: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
    ],
  },
  {
    titleKey: 'nav_administration',
    fallbackTitle: 'Administration',
    items: [
      { nameKey: 'nav_team', fallbackName: 'Team', path: '/admin/team', icon: UserCog },
      { nameKey: 'nav_settings', fallbackName: 'Settings', path: '/admin/settings', icon: Settings },
      { nameKey: 'nav_profile', fallbackName: 'Profile', path: '/admin/profile', icon: User },
    ],
  },
];

const BOTTOM_GROUP = {
  titleKey: 'nav_help',
  fallbackTitle: 'Help',
  items: [{ nameKey: 'nav_support', fallbackName: 'Support', path: '/admin/support', icon: LifeBuoy }],
};

const linkClass = ({ isActive }) =>
  `relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
    isActive ? 'bg-amber-50 text-amber-900' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
  }`;

function NavGroup({ group, t }) {
  return (
    <section aria-labelledby={`nav-group-${group.titleKey}`}>
      <h2 id={`nav-group-${group.titleKey}`} className="mb-1.5 px-3 text-xs font-semibold text-slate-400">
        {t(group.titleKey, group.fallbackTitle)}
      </h2>

      <ul className="space-y-0.5">
        {group.items.map((item) => {
          const Icon = item.icon;

          return (
            <li key={item.path}>
              <NavLink to={item.path} end={item.end} className={linkClass}>
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
                      className={`h-4 w-4 shrink-0 ${isActive ? 'text-amber-600' : 'text-slate-400'}`}
                    />
                    <span className="truncate">{t(item.nameKey, item.fallbackName)}</span>
                  </>
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function AdminSidebar() {
  const { t, settings } = useAppSettings();
  const { roles, rolePagePermissions } = useAuth();

  // Filter groups: remove restricted items; if a group has 0 visible items, hide the group completely
  const visibleGroups = useMemo(() => {
    return NAVIGATION_GROUPS.map((group) => {
      const allowedItems = group.items.filter((item) =>
        canUserAccessPath(roles, item.path, rolePagePermissions)
      );
      return {
        ...group,
        items: allowedItems,
      };
    }).filter((group) => group.items.length > 0);
  }, [roles, rolePagePermissions]);

  const showBottomHelp = useMemo(() => {
    return BOTTOM_GROUP.items.some((item) => canUserAccessPath(roles, item.path, rolePagePermissions));
  }, [roles, rolePagePermissions]);

  return (
    <aside className="flex h-screen w-64 shrink-0 select-none flex-col border-r border-amber-100 bg-white text-slate-700">
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 border-b border-amber-100 px-4">
        <img src={LOGO} alt="" className="h-9 w-9 shrink-0 object-contain" />
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold tracking-tight text-slate-950">
            {settings.agencyName || 'Habibi Adventure'}
          </h1>
          <p className="truncate text-xs text-slate-500">{t('portal_admin', 'Admin portal')}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav
        aria-label={t('nav_aria', 'Admin navigation')}
        className="flex-1 space-y-6 overflow-y-auto px-3 py-5 scrollbar-thin scrollbar-thumb-slate-200"
      >
        {visibleGroups.map((group) => (
          <NavGroup key={group.titleKey} group={group} t={t} />
        ))}
      </nav>

      {/* Pinned bottom category: Support */}
      {showBottomHelp && (
        <nav
          aria-label={t('nav_help', 'Help')}
          className="border-t border-amber-100 px-3 py-4"
        >
          <NavGroup group={BOTTOM_GROUP} t={t} />
        </nav>
      )}

      {/* Footer: current currency & language */}
      <Link
        to="/admin/settings"
        className="flex items-center justify-between border-t border-amber-100 bg-amber-50/40 px-4 py-3 text-xs text-slate-500 transition-colors hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-400"
        title={t('change_in_settings', 'Change in Settings')}
      >
        <span>
          {t('currency_label', 'Currency')}:{' '}
          <strong className="font-semibold text-amber-800">{settings.currency}</strong>
        </span>
        <span className="rounded bg-amber-200/60 px-1.5 py-0.5 font-semibold uppercase text-amber-900">
          {settings.adminLanguage}
        </span>
      </Link>
    </aside>
  );
}