import React, { useState } from 'react';
import {
  Wallet,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Download,
  CreditCard,
  FileText,
  Calendar,
} from 'lucide-react';

export default function FinancePage() {
  const [period, setPeriod] = useState('month');

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
              FINANCE & ACCOUNTING
            </span>
            <span className="text-xs text-slate-400">• Financial Overview</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Agency Financial Dashboard
          </h1>
          <p className="text-sm text-slate-500">
            Monitor revenue, cash flow, profit margins, outstanding client invoices and supplier payouts.
          </p>
        </div>

        <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50">
          <Download className="h-4 w-4" /> Export Financial Report
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Total Revenue (MTD)</span>
          <div className="mt-2 text-2xl font-bold text-slate-900">$184,520</div>
          <div className="mt-1 flex items-center gap-1 text-xs text-emerald-600 font-medium">
            <ArrowUpRight className="h-3.5 w-3.5" /> +12.4% vs last month
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Operating Expenses</span>
          <div className="mt-2 text-2xl font-bold text-slate-900">$92,340</div>
          <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
            Supplier bookings + logistics
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Gross Profit</span>
          <div className="mt-2 text-2xl font-bold text-emerald-600">$92,180</div>
          <div className="mt-1 flex items-center gap-1 text-xs text-emerald-600 font-medium">
            49.9% Net agency margin
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Pending Receivables</span>
          <div className="mt-2 text-2xl font-bold text-amber-700">$24,600</div>
          <div className="mt-1 flex items-center gap-1 text-xs text-amber-700 font-medium">
            7 Invoices awaiting deposit
          </div>
        </div>
      </div>

      {/* Recent Ledger / Summary */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <h2 className="text-sm font-semibold text-slate-900">Revenue Streams by Category</h2>
          <div className="mt-4 space-y-3 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="text-slate-600">Luxury Holiday Packages</span>
              <span className="font-bold text-slate-900">$112,400 (61%)</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="text-slate-600">Hajj & Umrah Pilgrimages</span>
              <span className="font-bold text-slate-900">$42,500 (23%)</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="text-slate-600">Flight Ticketing & Charters</span>
              <span className="font-bold text-slate-900">$18,200 (10%)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Visa & Insurance Commissions</span>
              <span className="font-bold text-slate-900">$11,420 (6%)</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <h2 className="text-sm font-semibold text-slate-900">Upcoming Supplier Settlements</h2>
          <div className="mt-4 space-y-3 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <span className="font-medium text-slate-900">Royal Mansour Hospitality</span>
                <div className="text-[11px] text-slate-500">Due Nov 20, 2026</div>
              </div>
              <span className="font-bold text-rose-600">$14,200</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <span className="font-medium text-slate-900">Atlas 4x4 Desert Transport</span>
                <div className="text-[11px] text-slate-500">Due Nov 24, 2026</div>
              </div>
              <span className="font-bold text-rose-600">$6,850</span>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <span className="font-medium text-slate-900">Aegean Sea Yacht Charters</span>
                <div className="text-[11px] text-slate-500">Due Nov 30, 2026</div>
              </div>
              <span className="font-bold text-rose-600">$9,400</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
