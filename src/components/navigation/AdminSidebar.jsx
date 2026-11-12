import {
  BarChart3,
  Building2,
  CalendarDays,
  ChevronDown,
  Compass,
  CreditCard,
  LayoutDashboard,
  Settings,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import LOGO from '../../assets/logo.png';

const navigationGroups = [
  {
    title: 'OVERVIEW',
    items: [{ name: 'Dashboard', path: '/admin', icon: LayoutDashboard, end: true }],
  },
  {
    title: 'TRAVEL',
    items: [
      { name: 'Travel', path: '/admin/travel', icon: Compass },
      { name: 'Packages & Services', path: '/admin/packages', icon: Compass },
    ],
  },
  {
    title: 'MANAGEMENT',
    items: [
      { name: 'Bookings', path: '/admin/bookings', icon: CalendarDays },
      { name: 'Customers', path: '/admin/customers', icon: Users },
      { name: 'Suppliers', path: '/admin/suppliers', icon: Building2 },
    ],
  },
  {
    title: 'FINANCE',
    items: [
      { name: 'Finance', path: '/admin/finance', icon: Wallet },
      { name: 'Expenses', path: '/admin/expenses', icon: CreditCard },
      { name: 'Payments & Transactions', path: '/admin/payments-transactions', icon: CreditCard },
    ],
  },
  {
    title: 'INSIGHTS & SYSTEM',
    items: [
      { name: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
      { name: 'Settings', path: '/admin/settings', icon: Settings },
    ],
  },
];

export default function AdminSidebar() {
  return (
    <aside className="flex h-screen w-64 select-none flex-col border-r border-amber-100 bg-white text-slate-700 shadow-xs">
      <div className="flex items-center justify-between border-b border-amber-100 p-4">
        <div className="flex items-center space-x-3">
          <img src={LOGO} alt="" className="h-12 w-8 object-contain" />
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-slate-950">Habibi Adventure</h1>
            <p className="text-xs text-slate-400">Admin Portal</p>
          </div>
        </div>
        <ChevronDown aria-hidden="true" className="h-4 w-4 text-slate-400" />
      </div>

      <nav
        aria-label="Admin navigation"
        className="flex-1 space-y-5 overflow-y-auto px-3 py-5 scrollbar-thin scrollbar-thumb-slate-200"
      >
        {navigationGroups.map((group) => (
          <section key={group.title} className="space-y-1">
            <h2 className="px-3 text-[10px] font-bold tracking-wider text-slate-400">
              {group.title}
            </h2>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.end}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-md border px-3 py-2 text-xs font-medium transition-all duration-150 ${
                        isActive
                          ? 'border-amber-200 bg-amber-50 text-amber-900 shadow-xs'
                          : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          aria-hidden="true"
                          className={`h-4 w-4 ${isActive ? 'text-amber-600' : 'text-slate-400'}`}
                        />
                        <span>{item.name}</span>
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </section>
        ))}
      </nav>

      <div className="border-t border-amber-100 p-3">
        <div className="flex items-center justify-between rounded-lg border border-amber-200/60 bg-amber-50/50 p-2.5">
          <div className="flex items-center space-x-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
            <span className="text-xs font-medium text-slate-700">Supabase Connected</span>
          </div>
          <Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-amber-600" />
        </div>
      </div>
    </aside>
  );
}
