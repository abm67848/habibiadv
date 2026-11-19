import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, ChevronDown, Settings, ExternalLink, User } from 'lucide-react';
import { useAuth, useAppSettings } from '../../context/index.jsx';

export default function AdminTopbar() {
  const { user, profile, roles, signOut } = useAuth();
  const { t } = useAppSettings();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const triggerRef = useRef(null);

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Admin';
  const roleName = roles?.[0] ? roles[0].replace(/_/g, ' ') : 'Administrator';
  const initial = displayName.charAt(0).toUpperCase();

  const close = useCallback((returnFocus = false) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  // Close on outside click and on Escape
  useEffect(() => {
    if (!open) return;

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

  const go = (path) => {
    close();
    navigate(path);
  };

  const handleSignOut = async () => {
    close();
    try {
      await signOut();
      navigate('/auth/admin-login');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const menuItem =
    'flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-slate-700 transition-colors ' +
    'hover:bg-amber-50 hover:text-amber-900 focus-visible:bg-amber-50 focus-visible:outline-none';

  return (
    <header className="flex h-16 items-center justify-end border-b border-amber-100 bg-white px-6 text-slate-800 select-none">
      {/* Right: live site link + profile */}
      <div className="flex items-center gap-4">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          title={t('live_site_title', 'Open the public site in a new tab')}
        >
          <span>{t('live_site', 'View live site')}</span>
          <ExternalLink className="h-3.5 w-3.5 text-slate-400 transition-colors group-hover:text-amber-600" />
        </a>

        <div className="h-5 w-px bg-slate-200" aria-hidden="true" />

        {user ? (
          <div className="relative" ref={wrapperRef}>
            <button
              ref={triggerRef}
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={open}
              className="flex items-center gap-2.5 rounded-xl border border-transparent p-1.5 transition-colors hover:border-amber-200 hover:bg-amber-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-sm font-semibold text-white">
                {initial}
              </span>
              <span className="hidden text-left rtl:text-right sm:block">
                <span className="block text-sm font-semibold leading-tight text-slate-900">
                  {displayName}
                </span>
                <span className="block text-xs capitalize leading-tight text-slate-500">
                  {roleName}
                </span>
              </span>
              <ChevronDown
                className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                  open ? 'rotate-180' : ''
                }`}
              />
            </button>

            {open && (
              <div
                role="menu"
                aria-label={t('account_menu', 'Account menu')}
                className="absolute right-0 z-50 mt-2 w-64 origin-top-right overflow-hidden rounded-xl border border-amber-100 bg-white py-1.5 shadow-xl rtl:left-0 rtl:right-auto"
              >
                {/* Identity header */}
                <div className="border-b border-slate-100 px-3.5 pb-3 pt-2">
                  <p className="truncate text-sm font-semibold text-slate-900">{displayName}</p>
                  {user?.email && (
                    <p className="truncate text-xs text-slate-500">{user.email}</p>
                  )}
                  <p className="mt-0.5 text-xs capitalize text-amber-700">{roleName}</p>
                </div>

                <div className="py-1">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => go('/admin/profile')}
                    className={menuItem}
                  >
                    <User className="h-4 w-4 text-slate-400" />
                    <span>{t('nav_profile', 'My profile')}</span>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => go('/admin/settings')}
                    className={menuItem}
                  >
                    <Settings className="h-4 w-4 text-slate-400" />
                    <span>{t('nav_settings', 'Settings')}</span>
                  </button>
                </div>

                <div className="border-t border-slate-100 pt-1">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 focus-visible:bg-rose-50 focus-visible:outline-none"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>{t('sign_out', 'Sign out')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => navigate('/auth/admin-login')}
            className="inline-flex items-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
          >
            {t('sign_in', 'Sign in')}
          </button>
        )}
      </div>
    </header>
  );
}