import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  Compass,
  Calendar,
  DollarSign,
  ArrowUpRight,
  Filter,
} from 'lucide-react';

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('30d');

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
              AGENCY PERFORMANCE
            </span>
            <span className="text-xs text-slate-400">• Development Analytics</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Agency Analytics & KPIs
          </h1>
          <p className="text-sm text-slate-500">
            Real-time travel demand indicators, conversion rates, seasonal destination performance and staff metrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {['7d', '30d', '90d', '1y'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                timeRange === range
                  ? 'bg-amber-600 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Total Bookings</span>
          <div className="mt-2 text-2xl font-bold text-slate-900">248</div>
          <div className="mt-1 flex items-center gap-1 text-xs text-emerald-600 font-medium">
            <ArrowUpRight className="h-3.5 w-3.5" /> +18.2% vs prior period
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Total Inquiry Leads</span>
          <div className="mt-2 text-2xl font-bold text-slate-900">1,120</div>
          <div className="mt-1 flex items-center gap-1 text-xs text-emerald-600 font-medium">
            <ArrowUpRight className="h-3.5 w-3.5" /> 22.1% Lead-to-booking rate
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Average Booking Value</span>
          <div className="mt-2 text-2xl font-bold text-slate-900">$2,140</div>
          <div className="mt-1 flex items-center gap-1 text-xs text-emerald-600 font-medium">
            <ArrowUpRight className="h-3.5 w-3.5" /> +5.4% YoY
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Customer NPS Score</span>
          <div className="mt-2 text-2xl font-bold text-emerald-600">86 / 100</div>
          <span className="text-xs text-slate-500">World-class hospitality rating</span>
        </div>
      </div>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <h2 className="text-sm font-semibold text-slate-900">Top Trending Destinations (Volume)</h2>
          <div className="mt-4 space-y-3 text-xs">
            <div>
              <div className="flex justify-between font-medium text-slate-800 mb-1">
                <span>1. Marrakech & High Atlas (Morocco)</span>
                <span>84 bookings (34%)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-amber-500" style={{ width: '34%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between font-medium text-slate-800 mb-1">
                <span>2. Santorini & Cyclades (Greece)</span>
                <span>52 bookings (21%)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-amber-500" style={{ width: '21%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between font-medium text-slate-800 mb-1">
                <span>3. Kyoto & Tokyo Heritage (Japan)</span>
                <span>46 bookings (18%)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-amber-500" style={{ width: '18%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between font-medium text-slate-800 mb-1">
                <span>4. Mecca & Medina Umrah (Saudi Arabia)</span>
                <span>38 bookings (15%)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-amber-500" style={{ width: '15%' }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <h2 className="text-sm font-semibold text-slate-900">Booking Channel Attribution</h2>
          <div className="mt-4 space-y-3 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="text-slate-600">Direct Agency Website</span>
              <span className="font-bold text-slate-900">54%</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="text-slate-600">Repeat Customers & Referrals</span>
              <span className="font-bold text-slate-900">28%</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="text-slate-600">Travel Agent B2B Partners</span>
              <span className="font-bold text-slate-900">12%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Social Media & Influencer Campaigns</span>
              <span className="font-bold text-slate-900">6%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
