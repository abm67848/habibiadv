import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Compass, 
  CreditCard, 
  Users, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ShieldCheck, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Plus, 
  FileText, 
  Globe, 
  Layers, 
  ChevronRight,
  Briefcase,
  AlertCircle,
  XCircle,
  Filter
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

export default function AdminDashboardPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Date Range Selector State
  const [dateRange, setDateRange] = useState('last_30_days'); // 'today', 'last_7_days', 'last_30_days', 'this_month', 'this_year'

  // Raw data from Supabase
  const [bookings, setBookings] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [catalogItems, setCatalogItems] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setCurrentUser(profile || { full_name: user.email?.split('@')[0] || 'Agency User' });
      }

      // Fetch bookings, customers, and catalog items in parallel
      const [bookingsRes, customersRes, catalogRes] = await Promise.all([
        supabase.from('bookings').select('*, customers(full_name, phone, email)').order('created_at', { ascending: false }),
        supabase.from('customers').select('*').order('created_at', { ascending: false }),
        supabase.from('catalog_items').select('*')
      ]);

      if (bookingsRes.error) throw bookingsRes.error;
      if (customersRes.error) throw customersRes.error;

      setBookings(bookingsRes.data || []);
      setCustomers(customersRes.data || []);
      setCatalogItems(catalogRes.error ? [] : (catalogRes.data || []));

    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load dashboard metrics from Supabase. Please ensure tables exist.');
    } finally {
      setLoading(false);
    }
  };

  // Helper to filter items by date range
  const filterByDateRange = (items, dateField) => {
    if (!items || items.length === 0) return [];
    const now = new Date();
    
    return items.filter(item => {
      const itemDate = new Date(item[dateField] || item.created_at);
      if (isNaN(itemDate.getTime())) return false;

      if (dateRange === 'today') {
        return itemDate.toDateString() === now.toDateString();
      } else if (dateRange === 'last_7_days') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);
        return itemDate >= sevenDaysAgo && itemDate <= now;
      } else if (dateRange === 'last_30_days') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);
        return itemDate >= thirtyDaysAgo && itemDate <= now;
      } else if (dateRange === 'this_month') {
        return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
      } else if (dateRange === 'this_year') {
        return itemDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  };

  // Filtered bookings based on selected date range
  const filteredBookings = useMemo(() => {
    return filterByDateRange(bookings, 'created_at');
  }, [bookings, dateRange]);

  // Filtered customers based on selected date range
  const filteredCustomers = useMemo(() => {
    return filterByDateRange(customers, 'created_at');
  }, [customers, dateRange]);

  // Previous equivalent period calculation for comparisons
  const previousPeriodBookings = useMemo(() => {
    const now = new Date();
    return bookings.filter(b => {
      const bDate = new Date(b.created_at);
      if (isNaN(bDate.getTime())) return false;

      if (dateRange === 'last_7_days') {
        const startPrev = new Date(); startPrev.setDate(now.getDate() - 14);
        const endPrev = new Date(); endPrev.setDate(now.getDate() - 7);
        return bDate >= startPrev && bDate < endPrev;
      } else if (dateRange === 'last_30_days') {
        const startPrev = new Date(); startPrev.setDate(now.getDate() - 60);
        const endPrev = new Date(); endPrev.setDate(now.getDate() - 30);
        return bDate >= startPrev && bDate < endPrev;
      } else if (dateRange === 'this_month') {
        const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
        const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        return bDate.getMonth() === prevMonth && bDate.getFullYear() === prevYear;
      } else if (dateRange === 'this_year') {
        return bDate.getFullYear() === now.getFullYear() - 1;
      }
      return false;
    });
  }, [bookings, dateRange]);

  // KPI Statistics calculations
  const stats = useMemo(() => {
    const totalReservations = filteredBookings.length;
    const prevReservations = previousPeriodBookings.length;
    
    // Percentage change vs previous period
    let reservationChangePercent = 0;
    if (prevReservations > 0) {
      reservationChangePercent = Math.round(((totalReservations - prevReservations) / prevReservations) * 100);
    } else if (totalReservations > 0) {
      reservationChangePercent = 100;
    }

    const confirmedReservations = filteredBookings.filter(b => b.booking_status === 'confirmed').length;
    const confirmedPercentage = totalReservations > 0 ? Math.round((confirmedReservations / totalReservations) * 100) : 0;

    const pendingReservations = filteredBookings.filter(b => b.booking_status === 'pending').length;

    const totalCustomersCount = customers.length;
    const newCustomersCount = filteredCustomers.length;

    const activePackages = catalogItems.filter(i => i.item_type === 'package' && i.status === 'active').length;
    const activeServices = catalogItems.filter(i => i.item_type === 'service' && i.status === 'active').length;

    return {
      totalReservations,
      reservationChangePercent,
      confirmedReservations,
      confirmedPercentage,
      pendingReservations,
      totalCustomersCount,
      newCustomersCount,
      activePackages,
      activeServices
    };
  }, [filteredBookings, previousPeriodBookings, customers, filteredCustomers, catalogItems]);

  // Chart 1: Reservations over time (grouped by date)
  const timeSeriesData = useMemo(() => {
    const counts = {};
    filteredBookings.forEach(b => {
      const dateStr = new Date(b.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      counts[dateStr] = (counts[dateStr] || 0) + 1;
    });
    return Object.entries(counts).map(([date, count]) => ({ date, count })).slice(-10); // Last 10 points
  }, [filteredBookings]);

  // Chart 2: Status distribution
  const statusDistribution = useMemo(() => {
    const dist = {
      pending: 0,
      confirmed: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0
    };
    filteredBookings.forEach(b => {
      const status = b.booking_status || 'pending';
      if (dist[status] !== undefined) {
        dist[status]++;
      } else {
        dist[status] = (dist[status] || 0) + 1;
      }
    });

    const total = filteredBookings.length;
    return Object.entries(dist).map(([status, count]) => ({
      status,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0
    }));
  }, [filteredBookings]);

  // Recent 5-10 reservations
  const recentReservations = useMemo(() => {
    return bookings.slice(0, 8);
  }, [bookings]);

  // Upcoming departures (next 30 days)
  const upcomingDepartures = useMemo(() => {
    const now = new Date();
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(now.getDate() + 30);

    return bookings.filter(b => {
      if (!b.departure_date) return false;
      const depDate = new Date(b.departure_date);
      return depDate >= now && depDate <= thirtyDaysLater && b.booking_status !== 'cancelled';
    }).sort((a, b) => new Date(a.departure_date) - new Date(b.departure_date)).slice(0, 6);
  }, [bookings]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'confirmed':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 className="w-3 h-3" /> Confirmed</span>;
      case 'in_progress':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"><Clock className="w-3 h-3" /> In Progress</span>;
      case 'completed':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200"><CheckCircle2 className="w-3 h-3" /> Completed</span>;
      case 'cancelled':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200"><XCircle className="w-3 h-3" /> Cancelled</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200"><AlertCircle className="w-3 h-3" /> Pending</span>;
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 min-h-screen flex items-center justify-center bg-slate-50/50">
        <div>
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-600 mb-3" />
          <p className="text-sm font-medium text-slate-700">Loading Agency Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 bg-slate-50/50 min-h-screen">
      
      {/* 3. DASHBOARD HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-amber-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-1 rounded-full w-fit mb-2 border border-amber-200">
            <Calendar className="w-3.5 h-3.5" />
            <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Dashboard{currentUser?.full_name ? `, Welcome back, ${currentUser.full_name}` : ''}
          </h1>
          <p className="text-sm text-slate-500 mt-1">Here's an overview of your travel agency's activity.</p>
        </div>

        {/* Date-Range Selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700">
            <Filter className="w-3.5 h-3.5 text-amber-600" />
            <span>Period:</span>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
            >
              <option value="today">Today</option>
              <option value="last_7_days">Last 7 days</option>
              <option value="last_30_days">Last 30 days</option>
              <option value="this_month">This month</option>
              <option value="this_year">This year</option>
            </select>
          </div>

          <button
            onClick={fetchDashboardData}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-xs transition-all"
            title="Refresh Dashboard"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800 text-xs font-medium">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 4. OVERVIEW STATISTICS (5 KPI Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        
        {/* Card 1: Total Reservations */}
        <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Reservations</p>
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <h3 className="text-3xl font-extrabold text-slate-900 mt-2">{stats.totalReservations}</h3>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">vs prev period</span>
            <span className={`font-bold flex items-center gap-0.5 ${stats.reservationChangePercent >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {stats.reservationChangePercent >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {stats.reservationChangePercent}%
            </span>
          </div>
        </div>

        {/* Card 2: Confirmed Reservations */}
        <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Confirmed Bookings</p>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <h3 className="text-3xl font-extrabold text-emerald-600 mt-2">{stats.confirmedReservations}</h3>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            <span className="font-semibold text-slate-700">{stats.confirmedPercentage}%</span> of total period
          </div>
        </div>

        {/* Card 3: Pending Reservations */}
        <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Bookings</p>
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <h3 className="text-3xl font-extrabold text-amber-600 mt-2">{stats.pendingReservations}</h3>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px]">
            {stats.pendingReservations > 0 ? (
              <span className="text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">Requires attention</span>
            ) : (
              <span className="text-slate-400">All reviewed</span>
            )}
          </div>
        </div>

        {/* Card 4: Total Customers */}
        <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Customers</p>
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <h3 className="text-3xl font-extrabold text-slate-900 mt-2">{stats.totalCustomersCount}</h3>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            <span className="font-semibold text-blue-600">+{stats.newCustomersCount}</span> new in period
          </div>
        </div>

        {/* Card 5: Active Packages & Services */}
        <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Catalog</p>
              <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
                <Compass className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <h3 className="text-3xl font-extrabold text-slate-900">{stats.activePackages}</h3>
              <span className="text-xs text-slate-400 font-medium">pkgs / {stats.activeServices} srvs</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-purple-700 font-medium">
            Published on public portal
          </div>
        </div>

      </div>

      {/* 5 & 6. CHARTS SECTION (Reservations Over Time & Status Distribution) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 5. Reservations Overview Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-amber-100 shadow-xs p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Reservations Over Time</h3>
              <p className="text-xs text-slate-500 mt-0.5">Booking creation trend across the selected period</p>
            </div>
            <button onClick={() => navigate('/admin/reservations')} className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1">
              View All <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {timeSeriesData.length === 0 ? (
            <div className="py-16 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
              <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-xs">No reservation activity found for this date range.</p>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <div className="h-56 flex items-end gap-3 px-2 border-b border-l border-slate-200 pb-2">
                {timeSeriesData.map((item, idx) => {
                  const maxCount = Math.max(...timeSeriesData.map(d => d.count), 5);
                  const heightPercent = Math.max(12, Math.round((item.count / maxCount) * 100));
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative">
                      {/* Tooltip */}
                      <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-mono py-1 px-2 rounded pointer-events-none whitespace-nowrap z-10">
                        {item.date}: {item.count} bookings
                      </div>
                      <div className="w-full bg-amber-500/90 hover:bg-amber-600 rounded-t-lg transition-all" style={{ height: `${heightPercent}%` }}></div>
                      <span className="text-[10px] font-medium text-slate-500 truncate w-full text-center">{item.date}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-400 text-center">Displaying daily booking volume for active period selection.</p>
            </div>
          )}
        </div>

        {/* 6. Reservation Status Distribution */}
        <div className="bg-white rounded-2xl border border-amber-100 shadow-xs p-6 space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Status Distribution</h3>
            <p className="text-xs text-slate-500 mt-0.5">Breakdown by actual database statuses</p>
          </div>

          <div className="space-y-4">
            {statusDistribution.map((item) => (
              <div key={item.status} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="capitalize font-semibold text-slate-700 flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${
                      item.status === 'confirmed' ? 'bg-emerald-500' :
                      item.status === 'pending' ? 'bg-amber-500' :
                      item.status === 'in_progress' ? 'bg-blue-500' :
                      item.status === 'completed' ? 'bg-purple-500' : 'bg-rose-500'
                    }`}></span>
                    {item.status.replace('_', ' ')}
                  </span>
                  <span className="font-bold text-slate-900">{item.count} <span className="text-slate-400 font-normal">({item.percentage}%)</span></span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      item.status === 'confirmed' ? 'bg-emerald-500' :
                      item.status === 'pending' ? 'bg-amber-500' :
                      item.status === 'in_progress' ? 'bg-blue-500' :
                      item.status === 'completed' ? 'bg-purple-500' : 'bg-rose-500'
                    }`} 
                    style={{ width: `${item.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 7. RECENT RESERVATIONS & UPCOMING DEPARTURES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Recent Reservations Table */}
        <div className="bg-white rounded-2xl border border-amber-100 shadow-xs p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-600" /> Recent Reservations
            </h3>
            <button onClick={() => navigate('/admin/reservations')} className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1">
              View All <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentReservations.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-6 text-center">No recent reservations found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase">
                    <th className="py-3 px-3">Reservation Ref</th>
                    <th className="py-3 px-3">Customer Name</th>
                    <th className="py-3 px-3">Destination</th>
                    <th className="py-3 px-3 text-right">Total</th>
                    <th className="py-3 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentReservations.map(res => (
                    <tr key={res.id} className="hover:bg-amber-50/30 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-amber-700">{res.booking_reference}</td>
                      <td className="py-3 px-3 font-semibold text-slate-900">{res.customers?.full_name || 'Guest'}</td>
                      <td className="py-3 px-3 text-slate-600">{res.destination || 'Custom'}</td>
                      <td className="py-3 px-3 text-right font-extrabold text-slate-900">{Number(res.total_amount).toLocaleString()} {res.currency}</td>
                      <td className="py-3 px-3">{getStatusBadge(res.booking_status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Upcoming Departures (Next 30 Days) */}
        <div className="bg-white rounded-2xl border border-amber-100 shadow-xs p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Compass className="w-4 h-4 text-amber-600" /> Upcoming Departures (Next 30 Days)
            </h3>
            <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
              {upcomingDepartures.length} Trips
            </span>
          </div>

          {upcomingDepartures.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-6 text-center">No upcoming departures scheduled in the next 30 days.</p>
          ) : (
            <div className="space-y-3">
              {upcomingDepartures.map(trip => (
                <div key={trip.id} className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-amber-700">{trip.booking_reference}</span>
                      <span className="text-slate-900 font-semibold">{trip.customers?.full_name}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Destination: <strong className="text-slate-800">{trip.destination}</strong></p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-amber-800 bg-amber-100 px-2 py-1 rounded text-[11px]">
                      {new Date(trip.departure_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1">{trip.traveler_count || 1} travelers</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}