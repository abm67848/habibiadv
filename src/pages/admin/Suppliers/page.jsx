import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Search,
  Filter,
  Phone,
  Mail,
  MapPin,
  Star,
  CheckCircle2,
} from 'lucide-react';

export default function SuppliersPage() {
  const [search, setSearch] = useState('');

  const suppliers = [
    { id: 1, name: 'Royal Mansour Hospitality', type: 'Luxury Hotels & Riads', location: 'Marrakech, Morocco', contact: 'M. Alami', phone: '+212 529-808080', rating: 4.95, contracts: 4, status: 'Active' },
    { id: 2, name: 'Atlas 4x4 & Desert Expeditions', type: 'Transport & Safaris', location: 'Ouarzazate, Morocco', contact: 'Hassan Driss', phone: '+212 661-456789', rating: 4.88, contracts: 8, status: 'Active' },
    { id: 3, name: 'Aegean Yacht Charter Co.', type: 'Cruises & Boat Charters', location: 'Athens, Greece', contact: 'Nikos P.', phone: '+30 210 998877', rating: 4.82, contracts: 2, status: 'Active' },
    { id: 4, name: 'Swiss Alpine Guides Association', type: 'Adventure & Excursions', location: 'Interlaken, Switzerland', contact: 'Marc Weber', phone: '+41 33 826 0000', rating: 4.90, contracts: 3, status: 'Active' },
    { id: 5, name: 'Gulf Air & Executive Jet Travel', type: 'Private Aviation & Flights', location: 'Dubai, UAE', contact: 'Tariq K.', phone: '+971 4 200 1122', rating: 4.75, contracts: 1, status: 'Reviewing' },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
              SUPPLIERS & VENDORS
            </span>
            <span className="text-xs text-slate-400">• Operations Management</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Suppliers & Vendor Network
          </h1>
          <p className="text-sm text-slate-500">
            Manage agency partnerships, hotels, transport operators, guides, and airlines.
          </p>
        </div>

        <button className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-amber-500">
          <Plus className="h-4 w-4" /> Add Partner Vendor
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Active Partners</span>
          <div className="mt-2 text-2xl font-bold text-slate-900">76</div>
          <span className="text-xs text-emerald-600">Contracted & vetted</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Avg Vendor Rating</span>
          <div className="mt-2 text-2xl font-bold text-slate-900">4.88 / 5</div>
          <span className="text-xs text-amber-700 font-medium">Quality assurance verified</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Open Contracts</span>
          <div className="mt-2 text-2xl font-bold text-slate-900">18</div>
          <span className="text-xs text-slate-500">Renewals due this quarter</span>
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
              placeholder="Search vendor name or type..."
              className="w-full rounded-lg border border-slate-200 py-1.5 pl-9 pr-3 text-xs focus:border-amber-500 focus:outline-none"
            />
          </div>
          <button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
            <Filter className="h-3.5 w-3.5" /> Filter by Type
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3">Vendor / Supplier</th>
                <th className="px-5 py-3">Service Category</th>
                <th className="px-5 py-3">Base Location</th>
                <th className="px-5 py-3">Contact Person</th>
                <th className="px-5 py-3">Quality Score</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {suppliers.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/70">
                  <td className="px-5 py-3.5 font-semibold text-slate-900">{s.name}</td>
                  <td className="px-5 py-3.5 text-slate-600">{s.type}</td>
                  <td className="px-5 py-3.5">{s.location}</td>
                  <td className="px-5 py-3.5">
                    <div>{s.contact}</div>
                    <div className="text-[11px] text-slate-400">{s.phone}</div>
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-slate-800">★ {s.rating}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      s.status === 'Active' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                    }`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button className="text-amber-700 hover:text-amber-800 font-medium">Manage &rarr;</button>
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
