import React, { useState } from 'react';
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  DollarSign,
  Calendar,
  Tag,
  Receipt,
  Building,
} from 'lucide-react';

export default function ExpensesPage() {
  const [search, setSearch] = useState('');

  const expenses = [
    { id: 'EXP-401', payee: 'Royal Air Maroc', category: 'Flight Ticketing', amount: '$4,850', date: 'Nov 10, 2026', method: 'Wire Transfer', status: 'Paid' },
    { id: 'EXP-402', payee: 'Marrakech Palace Hotel', category: 'Accommodation', amount: '$6,200', date: 'Nov 08, 2026', method: 'Corporate Card', status: 'Paid' },
    { id: 'EXP-403', payee: 'Atlas Tour Guides Co.', category: 'Local Guides', amount: '$1,400', date: 'Nov 07, 2026', method: 'Cash / Voucher', status: 'Paid' },
    { id: 'EXP-404', payee: 'Google Ads & Meta Marketing', category: 'Marketing & Ads', amount: '$2,150', date: 'Nov 05, 2026', method: 'Corporate Card', status: 'Paid' },
    { id: 'EXP-405', payee: 'Hertz Fleet Leasing', category: 'Vehicle Rental', amount: '$3,800', date: 'Nov 02, 2026', method: 'Wire Transfer', status: 'Pending Approval' },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
              OPERATIONAL EXPENSES
            </span>
            <span className="text-xs text-slate-400">• Development Ledger</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Agency Operating Expenses
          </h1>
          <p className="text-sm text-slate-500">
            Record, approve and categorize agency costs, hotel prepayments, guides, transport and marketing.
          </p>
        </div>

        <button className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-amber-500">
          <Plus className="h-4 w-4" /> Record New Expense
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Total Expenses (MTD)</span>
          <div className="mt-2 text-2xl font-bold text-slate-900">$18,400</div>
          <span className="text-xs text-slate-500">Under the $25,000 monthly target</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Supplier Direct Costs</span>
          <div className="mt-2 text-2xl font-bold text-slate-900">$12,450</div>
          <span className="text-xs text-slate-500">67.6% of all expenses</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Awaiting Approval</span>
          <div className="mt-2 text-2xl font-bold text-amber-700">1 Item</div>
          <span className="text-xs text-amber-700 font-medium">$3,800 vehicle leasing</span>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <div className="relative w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search payee or category..."
              className="w-full rounded-lg border border-slate-200 py-1.5 pl-9 pr-3 text-xs focus:border-amber-500 focus:outline-none"
            />
          </div>
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
            <Filter className="h-3.5 w-3.5" /> Filter by Category
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3">Expense ID</th>
                <th className="px-5 py-3">Payee / Vendor</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Payment Method</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50/70">
                  <td className="px-5 py-3.5 font-mono text-amber-700 font-semibold">{exp.id}</td>
                  <td className="px-5 py-3.5 font-semibold text-slate-900">{exp.payee}</td>
                  <td className="px-5 py-3.5 text-slate-600">{exp.category}</td>
                  <td className="px-5 py-3.5 text-slate-500">{exp.date}</td>
                  <td className="px-5 py-3.5">{exp.method}</td>
                  <td className="px-5 py-3.5 font-bold text-slate-900">{exp.amount}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      exp.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                    }`}>
                      {exp.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button className="text-slate-500 hover:text-slate-800">View &rarr;</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
