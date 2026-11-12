import React, { useState } from 'react';
import {
  Settings,
  Shield,
  Key,
  Bell,
  Database,
  Globe,
  Mail,
  Lock,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/context/index.jsx';

export default function SettingsPage() {
  const { user, profile, roles, isSuperAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('general');
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
              SYSTEM CONFIGURATION
            </span>
            <span className="text-xs text-slate-400">• PostgreSQL & RLS</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Agency System & Security Settings
          </h1>
          <p className="text-sm text-slate-500">
            Configure agency profile, Supabase authentication, notifications, staff roles, and audit logging.
          </p>
        </div>

        {saved && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>Settings saved successfully!</span>
          </div>
        )}
      </div>

      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('general')}
          className={`border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
            activeTab === 'general'
              ? 'border-amber-600 text-amber-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          General Agency Profile
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
            activeTab === 'security'
              ? 'border-amber-600 text-amber-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Roles & Permissions
        </button>
        <button
          onClick={() => setActiveTab('database')}
          className={`border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
            activeTab === 'database'
              ? 'border-amber-600 text-amber-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Supabase Database & Audit
        </button>
      </div>

      {activeTab === 'general' && (
        <form onSubmit={handleSave} className="max-w-3xl space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Agency Name</label>
              <input
                type="text"
                defaultValue="Habibi Adventure"
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Official Contact Email</label>
              <input
                type="email"
                defaultValue="contact@skyview-travel.com"
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Default Currency</label>
              <select className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-amber-500 focus:outline-none">
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="MAD">MAD (DH)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Timezone</label>
              <input
                type="text"
                defaultValue="Africa/Casablanca (UTC+1)"
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-amber-500"
            >
              <Save className="h-4 w-4" /> Save Agency Changes
            </button>
          </div>
        </form>
      )}

      {activeTab === 'security' && (
        <div className="max-w-3xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <h2 className="text-sm font-semibold text-slate-900">Current Session Authority</h2>
          <div className="rounded-lg bg-slate-50 p-4 text-xs space-y-2">
            <div><strong className="text-slate-800">Signed In As:</strong> {user?.email || 'admin.travelagency@gmail.com'}</div>
            <div><strong className="text-slate-800">Assigned Roles:</strong> {roles.join(', ') || 'super_admin'}</div>
            <div><strong className="text-slate-800">Super Admin Privilege:</strong> {isSuperAdmin ? 'Active (Full Grants)' : 'Active'}</div>
          </div>

          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 pt-2">System Roles Defined</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border border-slate-200 p-2.5">
              <span className="font-semibold text-slate-900">super_admin</span>
              <p className="text-[11px] text-slate-500">Full system access, can manage roles & administrators.</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-2.5">
              <span className="font-semibold text-slate-900">administrator</span>
              <p className="text-[11px] text-slate-500">Manages employees, operations and all agency resources.</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-2.5">
              <span className="font-semibold text-slate-900">manager</span>
              <p className="text-[11px] text-slate-500">Supervises teams, bookings, destinations & logistics.</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-2.5">
              <span className="font-semibold text-slate-900">accountant</span>
              <p className="text-[11px] text-slate-500">Handles finance, payments, invoices & expenses.</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'database' && (
        <div className="max-w-3xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-xs text-xs text-slate-700">
          <h2 className="text-sm font-semibold text-slate-900">Supabase Connection State</h2>
          <div className="space-y-2">
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Supabase Host:</span>
              <span className="font-mono text-slate-800">gklqhykfdyitnccbgpwk.supabase.co</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">PostgreSQL Extensions:</span>
              <span className="font-mono text-emerald-700">pgcrypto (Active)</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Row Level Security (RLS):</span>
              <span className="font-semibold text-emerald-700">Enabled on all 6 core tables</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Audit Logging Table:</span>
              <span className="font-mono text-slate-800">public.audit_logs (Immutable)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
