import React, { useState } from 'react';
import {
  Compass,
  MapPin,
  Calendar,
  DollarSign,
  Plus,
  Search,
  Filter,
  ArrowUpRight,
  Sparkles,
  Plane,
  Building,
} from 'lucide-react';

export default function TravelPage() {
  const [activeTab, setActiveTab] = useState('destinations');
  const [search, setSearch] = useState('');

  const destinations = [
    { id: 1, name: 'Marrakech Medina & Atlas', country: 'Morocco', code: 'RAK', packages: 12, rating: 4.9, active: true },
    { id: 2, name: 'Santorini Sunset Villas', country: 'Greece', code: 'JTR', packages: 8, rating: 4.8, active: true },
    { id: 3, name: 'Kyoto Heritage & Temples', country: 'Japan', code: 'KIX', packages: 15, rating: 4.9, active: true },
    { id: 4, name: 'Maldives Overwater Resort', country: 'Maldives', code: 'MLE', packages: 6, rating: 4.95, active: true },
    { id: 5, name: 'Swiss Alps Ski Chalet', country: 'Switzerland', code: 'ZRH', packages: 9, rating: 4.7, active: false },
  ];

  const filtered = destinations.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase()) || 
    d.country.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
              TRAVEL & CATALOG
            </span>
            <span className="text-xs text-slate-400">• Development Mode</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Travel & Destinations Management
          </h1>
          <p className="text-sm text-slate-500">
            Organize destination hubs, flights, travel categories and excursion routes.
          </p>
        </div>

        <button className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-amber-500">
          <Plus className="h-4 w-4" /> Add Destination
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Active Destinations</span>
            <span className="rounded-md bg-emerald-50 p-1.5 text-emerald-600"><MapPin className="h-4 w-4" /></span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">42</div>
          <span className="text-xs text-emerald-600 font-medium">↑ +3 new this month</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Flight Routes</span>
            <span className="rounded-md bg-sky-50 p-1.5 text-sky-600"><Plane className="h-4 w-4" /></span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">118</div>
          <span className="text-xs text-slate-500">Connected with 14 airlines</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Hotel Partners</span>
            <span className="rounded-md bg-indigo-50 p-1.5 text-indigo-600"><Building className="h-4 w-4" /></span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">260+</div>
          <span className="text-xs text-indigo-600 font-medium">98% verified quality</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Avg Satisfaction</span>
            <span className="rounded-md bg-amber-50 p-1.5 text-amber-600"><Sparkles className="h-4 w-4" /></span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">4.92 / 5.0</div>
          <span className="text-xs text-amber-700 font-medium">Based on 1,420 client reviews</span>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search destinations, codes..."
              className="w-full rounded-lg border border-slate-200 py-1.5 pl-9 pr-3 text-xs focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
              <Filter className="h-3.5 w-3.5" /> Filter
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3">Destination</th>
                <th className="px-5 py-3">Country</th>
                <th className="px-5 py-3">Airport Code</th>
                <th className="px-5 py-3">Available Packages</th>
                <th className="px-5 py-3">Rating</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70">
                  <td className="px-5 py-3.5 font-semibold text-slate-900">{item.name}</td>
                  <td className="px-5 py-3.5 text-slate-600">{item.country}</td>
                  <td className="px-5 py-3.5 font-mono text-xs text-amber-700">{item.code}</td>
                  <td className="px-5 py-3.5">{item.packages} packages</td>
                  <td className="px-5 py-3.5 font-semibold text-slate-800">★ {item.rating}</td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        item.active
                          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button className="text-amber-700 hover:text-amber-800 font-medium">Edit &rarr;</button>
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
