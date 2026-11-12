import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LogOut, 
  Bell, 
  ChevronDown, 
  Settings,
  ExternalLink 
} from 'lucide-react';
import { useAuth } from '../../context/index.jsx';
import LOGO from '../../assets/logo.png';

export default function AdminTopbar() {
  const { user, profile, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Admin';
  const roleName = roles[0] ? roles[0].replace('_', ' ') : 'Administrator';

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth/admin-login');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-amber-100 bg-white px-6 text-slate-800 select-none shadow-xs">
      
      {/* Left side: Context / Breadcrumb / Quick Status */}
      <div className="flex items-center gap-3">
        <img src={LOGO} alt="" className="h-12 w-8 object-contain" />
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-950 tracking-tight">Habibi Adventure Portal</h2>
            <span className="px-2 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-full">
              Live
            </span>
          </div>
          <p className="text-xs text-slate-500">Manage bookings, clients, and agency operations</p>
        </div>
      </div>

      {/* Right side: Actions, Notifications, and Profile Dropdown */}
      <div className="flex items-center gap-4">
        
        {/* Quick View Public Site Link */}
        <a 
          href="/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-amber-700 bg-slate-50 hover:bg-amber-50/50 border border-slate-200 hover:border-amber-200 rounded-md transition-colors"
          title="View Public Site"
        >
          <span>Live Site</span>
          <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600" />
        </a>

        {/* Notification Bell */}
        <button 
          aria-label="View notifications"
          className="relative p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg border border-slate-200 hover:border-amber-200 transition-colors"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full ring-2 ring-white" />
        </button>

        <div className="h-5 w-[1px] bg-slate-200" />

        {user ? (
          <div className="relative" ref={dropdownRef}>
            {/* User Profile Trigger Button */}
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-amber-50/60 transition-colors border border-transparent hover:border-amber-200"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-white font-semibold text-xs shadow-xs">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="text-left hidden sm:block">
                <span className="block text-xs font-semibold text-slate-900 leading-tight">{displayName}</span>
                <span className="block text-[10px] uppercase tracking-wider text-amber-600 font-medium">
                  {roleName}
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white border border-amber-100 shadow-xl py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-2 border-b border-slate-100 sm:hidden">
                  <p className="text-xs font-semibold text-slate-900">{displayName}</p>
                  <p className="text-[10px] uppercase tracking-wider text-amber-600">{roleName}</p>
                </div>

                <button
                  onClick={() => { setDropdownOpen(false); navigate('/admin/settings'); }}
                  className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-slate-700 hover:bg-amber-50 hover:text-amber-900 transition-colors"
                >
                  <Settings className="w-4 h-4 text-slate-400 group-hover:text-amber-600" />
                  <span>Account Settings</span>
                </button>

                <div className="my-1 border-t border-slate-100" />

                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 transition-colors font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => navigate('/auth/admin-login')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-amber-500 shadow-xs transition-all"
          >
            Sign in
          </button>
        )}
      </div>
    </header>
  );
}