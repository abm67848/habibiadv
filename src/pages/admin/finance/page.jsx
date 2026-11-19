import { useAppSettings, translate, useAuth } from '@/context/index.jsx';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { 
  Wallet, TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight, 
  RefreshCw, Calendar, Download, AlertTriangle, Building2, Users, FileText, CheckCircle2, Trash2
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';


// --- Helpers ---
const fmtMoney = (amount, currency = 'MAD') => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount || 0);
};
const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '-';
const COLORS = ['#d97706', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444'];

export default function FinancePage() {
  const { user } = useAuth();
  
  // Global State
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dataWarning, setDataWarning] = useState(null);
  const [deletingPaymentId, setDeletingPaymentId] = useState(null);
  
  // Global Filters
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  
  // Data State
  const [rawData, setRawData] = useState({
    bookings: [],
    customerPayments: [],
    expenses: [],
    supplierCosts: [] // from offer_costs
  });

  // --- Data Fetching ---
  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      setError(null);
      setDataWarning(null);

      const [bookingsRes, custPaymentsRes, expensesRes, suppCostsRes] = await Promise.all([
        supabase.from('bookings').select('*, customers(full_name)'),
        supabase.from('booking_payments').select('*').eq('transaction_status', 'completed'),
        supabase.from('expenses').select('*'),
        supabase.from('offer_costs').select('*, offers(public_title, bookings(id))') // Direct COGS
      ]);

      if (bookingsRes.error) throw bookingsRes.error;
      if (custPaymentsRes.error) throw custPaymentsRes.error;

      const optionalSourceErrors = [
        ['expenses', expensesRes.error],
        ['offer costs', suppCostsRes.error],
      ].filter(([, sourceError]) => sourceError);

      setRawData({
        bookings: bookingsRes.data || [],
        customerPayments: custPaymentsRes.data || [],
        expenses: expensesRes.error ? [] : expensesRes.data || [],
        supplierCosts: suppCostsRes.error ? [] : suppCostsRes.data || []
      });
      if (optionalSourceErrors.length > 0) {
        setDataWarning(
          `Some finance data could not be loaded: ${optionalSourceErrors
            .map(([source, sourceError]) => `${source}: ${sourceError.message}`)
            .join('; ')}`,
        );
      }

    } catch (err) {
      console.error(err);
      setError(err?.message || 'Failed to sync financial data. Please verify your database connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const deleteCustomerPayment = async (payment) => {
    const type = payment.transaction_type === 'refund' ? 'refund' : 'payment';
    const amount = fmtMoney(payment.amount, payment.currency || 'MAD');
    if (!window.confirm(`Permanently delete this ${type} of ${amount}? This cannot be undone.`)) return;

    setDeletingPaymentId(payment.id);
    setError(null);
    try {
      const { data, error: deleteError } = await supabase
        .from('booking_payments')
        .delete()
        .eq('id', payment.id)
        .select('id');

      if (deleteError) throw deleteError;
      if (!data?.length) throw new Error('No matching payment was deleted. It may have already been removed.');

      setRawData((current) => ({
        ...current,
        customerPayments: current.customerPayments.filter((item) => item.id !== payment.id),
      }));
    } catch (deleteError) {
      console.error('Failed to delete customer payment transaction:', deleteError);
      setError(`Could not delete the payment transaction: ${deleteError.message || 'Please try again.'}`);
    } finally {
      setDeletingPaymentId(null);
    }
  };

  // --- Calculations Engine ---
  const metrics = useMemo(() => {
    // 1. Filter by Date Range
    const inRange = (dateStr) => {
      if (!dateStr) return false;
      const d = new Date(dateStr).toISOString().split('T')[0];
      return d >= dateRange.start && d <= dateRange.end;
    };

    const filteredBookings = rawData.bookings.filter(b => inRange(b.created_at));
    const filteredCustPayments = rawData.customerPayments.filter(p => inRange(p.transaction_date || p.created_at));
    const filteredExpenses = rawData.expenses.filter(e => inRange(e.expense_date));

    // 2. KPI Calculations
    // Sales Value (What we sold)
    const totalSalesValue = filteredBookings.reduce((sum, b) => sum + Number(b.total_amount), 0);
    
    // Cash In (Customer Payments - Refunds)
    const cashIn = filteredCustPayments.reduce((sum, p) => {
      return sum + (p.transaction_type === 'payment' ? Number(p.amount) : -Number(p.amount));
    }, 0);

    // Supplier payments are recorded as paid amounts on expenses.
    const activeExpenses = filteredExpenses.filter(e => e.payment_status !== 'cancelled');
    const cashOutExpenses = activeExpenses.reduce((sum, e) => sum + Number(e.paid_amount || 0), 0);
    const totalCashOut = cashOutExpenses;

    // Accounts Receivable (Outstanding Customer Balances)
    // Booking Total - (Sum of completed payments for that booking)
    let accountsReceivable = 0;
    filteredBookings.forEach(b => {
      const paidForBooking = rawData.customerPayments
        .filter(p => p.booking_id === b.id && p.transaction_status === 'completed')
        .reduce((sum, p) => sum + (p.transaction_type === 'payment' ? Number(p.amount) : -Number(p.amount)), 0);
      
      const balance = Number(b.total_amount) - paidForBooking;
      if (balance > 0) accountsReceivable += balance;
    });

    // Accounts Payable (Unpaid Expenses)
    const accountsPayable = activeExpenses.reduce(
      (sum, e) => sum + Math.max(0, Number(e.amount || 0) - Number(e.paid_amount || 0)),
      0,
    );

    // Profitability
    const grossProfit = totalSalesValue - (accountsPayable + cashOutExpenses); // Simplified COGS proxy
    const netProfit = cashIn - totalCashOut;
    const profitMargin = totalSalesValue > 0 ? (grossProfit / totalSalesValue) * 100 : 0;
    const cashBalance = cashIn - totalCashOut;

    return {
      totalSalesValue,
      cashIn,
      totalCashOut,
      accountsReceivable,
      accountsPayable,
      grossProfit,
      netProfit,
      profitMargin,
      cashBalance,
      filteredBookings,
      filteredCustPayments,
      filteredExpenses
    };
  }, [rawData, dateRange]);

  // --- Chart Data Prep ---
  const chartData = useMemo(() => {
    // Group by Month for Revenue vs Expenses
    const monthlyData = {};
    
    metrics.filteredCustPayments.forEach(p => {
      const m = new Date(p.transaction_date || p.created_at).toLocaleString('default', { month: 'short' });
      if (!monthlyData[m]) monthlyData[m] = { name: m, revenue: 0, expenses: 0 };
      monthlyData[m].revenue += p.transaction_type === 'payment' ? Number(p.amount) : -Number(p.amount);
    });

    metrics.filteredExpenses.forEach(e => {
      const m = new Date(e.expense_date).toLocaleString('default', { month: 'short' });
      if (!monthlyData[m]) monthlyData[m] = { name: m, revenue: 0, expenses: 0 };
      if (e.payment_status !== 'cancelled') monthlyData[m].expenses += Number(e.paid_amount || 0);
    });

    return Object.values(monthlyData);
  }, [metrics]);

  // --- UI Components ---
  const KPICard = ({ title, value, subtext, icon: Icon, trend, trendValue, colorClass = "text-slate-900" }) => (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
          <h3 className={`text-2xl font-bold mt-2 ${colorClass}`}>{value}</h3>
        </div>
        <div className="p-2 bg-slate-50 rounded-lg text-slate-400">
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {(subtext || trend) && (
        <div className="mt-3 flex items-center gap-2 text-xs font-medium">
          {trend === 'up' && <span className="text-emerald-600 flex items-center gap-1"><ArrowUpRight className="w-3 h-3"/> {trendValue}%</span>}
          {trend === 'down' && <span className="text-rose-600 flex items-center gap-1"><ArrowDownRight className="w-3 h-3"/> {trendValue}%</span>}
          {subtext && <span className="text-slate-500">{subtext}</span>}
        </div>
      )}
    </div>
  );

  const TABS = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'revenue', label: 'Revenue & Receivables', icon: DollarSign },
    { id: 'expenses', label: 'Expenses & Payables', icon: TrendingDown },
    { id: 'profitability', label: 'Profitability', icon: FileText },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6 bg-slate-50 min-h-screen">
      
      {/* Header & Global Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{translate('Financial Dashboard')}</h1>
          <p className="text-sm text-slate-500 mt-1">{translate('Habibi Adventure Hafa S.L. — Real-time financial overview.')}</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm">
          <Calendar className="w-4 h-4 text-slate-400 ml-2" />
          <input 
            type="date" 
            value={dateRange.start} 
            onChange={e => setDateRange(p => ({...p, start: e.target.value}))}
            className="text-sm border-none focus:ring-0 bg-transparent text-slate-700" 
          />
          <span className="text-slate-400">{translate('to')}</span>
          <input 
            type="date" 
            value={dateRange.end} 
            onChange={e => setDateRange(p => ({...p, end: e.target.value}))}
            className="text-sm border-none focus:ring-0 bg-transparent text-slate-700" 
          />
          <button onClick={fetchFinancialData} className="p-2 text-slate-500 hover:bg-slate-100 rounded-md transition">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg flex items-center gap-2 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}
      {dataWarning && (
        <div role="status" className="p-4 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg flex items-center gap-2 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {dataWarning}
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Revenue (Cash)" value={fmtMoney(metrics.cashIn)} icon={ArrowUpRight} colorClass="text-emerald-600" subtext="Collected from customers" />
        <KPICard title="Total Expenses (Cash)" value={fmtMoney(metrics.totalCashOut)} icon={ArrowDownRight} colorClass="text-rose-600" subtext="Paid out to suppliers/ops" />
        <KPICard title="Net Cash Flow" value={fmtMoney(metrics.cashBalance)} icon={Wallet} colorClass={metrics.cashBalance >= 0 ? "text-slate-900" : "text-rose-600"} subtext="Inflows - Outflows" />
        <KPICard title="Profit Margin" value={`${metrics.profitMargin.toFixed(1)}%`} icon={TrendingUp} colorClass="text-blue-600" subtext="Based on Sales Value" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Sales Value" value={fmtMoney(metrics.totalSalesValue)} icon={FileText} subtext="Total booked value" />
        <KPICard title="Accounts Receivable" value={fmtMoney(metrics.accountsReceivable)} icon={Users} colorClass="text-amber-600" subtext="Owed by customers" />
        <KPICard title="Accounts Payable" value={fmtMoney(metrics.accountsPayable)} icon={Building2} colorClass="text-amber-600" subtext="Owed to suppliers" />
        <KPICard title="Gross Profit" value={fmtMoney(metrics.grossProfit)} icon={CheckCircle2} colorClass="text-emerald-600" subtext="Sales - Direct Costs" />
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-6 -mb-px">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id 
                  ? 'border-amber-500 text-amber-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* TAB CONTENT: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Main Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-6">{translate('Revenue vs Expenses')}</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(val) => `$${val/1000}k`} />
                  <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Legend iconType="circle" wrapperStyle={{fontSize: '12px'}} />
                  <Bar dataKey="revenue" name="Revenue In" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
                  <Bar dataKey="expenses" name="Expenses Out" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Aging / Breakdown */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-4">{translate('Financial Health')}</h3>
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
                <p className="text-xs font-semibold text-amber-800 uppercase">{translate('Action Required: Receivables')}</p>
                <p className="text-lg font-bold text-amber-900 mt-1">{fmtMoney(metrics.accountsReceivable)}</p>
                <p className="text-xs text-amber-700 mt-1">Outstanding customer balances across {metrics.filteredBookings.length} bookings.</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-xs font-semibold text-slate-600 uppercase">{translate('Pending Payables')}</p>
                <p className="text-lg font-bold text-slate-800 mt-1">{fmtMoney(metrics.accountsPayable)}</p>
                <p className="text-xs text-slate-500 mt-1">{translate('Unpaid expenses and supplier invoices.')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: REVENUE & RECEIVABLES */}
      {activeTab === 'revenue' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden animate-in fade-in">
          <div className="p-5 border-b border-slate-200 flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-slate-900">{translate('Customer Receivables')}</h3>
              <p className="text-xs text-slate-500">{translate('Track outstanding balances and collected payments.')}</p>
            </div>
            <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg">
              <Download className="w-3.5 h-3.5" />{translate('Export CSV')}</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">{translate('Booking Ref')}</th>
                  <th className="px-5 py-3">{translate('Customer')}</th>
                  <th className="px-5 py-3 text-right">{translate('Total Value')}</th>
                  <th className="px-5 py-3 text-right">{translate('Amount Paid')}</th>
                  <th className="px-5 py-3 text-right">{translate('Balance Due')}</th>
                  <th className="px-5 py-3">{translate('Status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metrics.filteredBookings.map(b => {
                  const paid = rawData.customerPayments
                    .filter(p => p.booking_id === b.id)
                    .reduce((sum, p) => sum + (p.transaction_type === 'payment' ? Number(p.amount) : -Number(p.amount)), 0);
                  const balance = Number(b.total_amount) - paid;
                  
                  return (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-mono text-xs font-medium text-amber-600">{b.booking_reference}</td>
                      <td className="px-5 py-3 font-medium text-slate-800">{b.customers?.full_name || 'Unknown'}</td>
                      <td className="px-5 py-3 text-right">{fmtMoney(b.total_amount, b.currency)}</td>
                      <td className="px-5 py-3 text-right text-emerald-600 font-medium">{fmtMoney(paid, b.currency)}</td>
                      <td className="px-5 py-3 text-right font-bold text-rose-600">{balance > 0 ? fmtMoney(balance, b.currency) : '-'}</td>
                      <td className="px-5 py-3">
                        {balance <= 0 ? (
                          <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 uppercase">{translate('Paid')}</span>
                        ) : paid > 0 ? (
                          <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 uppercase">{translate('Partial')}</span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 uppercase">{translate('Unpaid')}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-200">
            <div className="p-5">
              <h3 className="text-base font-bold text-slate-900">{translate('Customer Payment Transactions')}</h3>
              <p className="text-xs text-slate-500">{translate('Completed payments and refunds in the selected date range.')}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3">{translate('Date')}</th>
                    <th className="px-5 py-3">{translate('Booking Ref')}</th>
                    <th className="px-5 py-3">{translate('Customer')}</th>
                    <th className="px-5 py-3">{translate('Type')}</th>
                    <th className="px-5 py-3">{translate('Method')}</th>
                    <th className="px-5 py-3 text-right">{translate('Amount')}</th>
                    <th className="px-5 py-3 text-right">{translate('Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {metrics.filteredCustPayments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-slate-400">{translate('No customer payment transactions found for this period.')}</td>
                    </tr>
                  ) : (
                    metrics.filteredCustPayments.map((payment) => {
                      const booking = rawData.bookings.find((item) => item.id === payment.booking_id);
                      const isRefund = payment.transaction_type === 'refund';
                      const isDeleting = deletingPaymentId === payment.id;

                      return (
                        <tr key={payment.id} className="hover:bg-slate-50">
                          <td className="px-5 py-3 text-slate-600">{fmtDate(payment.transaction_date || payment.created_at)}</td>
                          <td className="px-5 py-3 font-mono text-xs font-medium text-amber-600">{booking?.booking_reference || '—'}</td>
                          <td className="px-5 py-3 font-medium text-slate-800">{booking?.customers?.full_name || 'Unknown'}</td>
                          <td className="px-5 py-3 capitalize">{payment.transaction_type || 'payment'}</td>
                          <td className="px-5 py-3 capitalize text-slate-600">{(payment.payment_method || 'unknown').replace(/_/g, ' ')}</td>
                          <td className={`px-5 py-3 text-right font-semibold ${isRefund ? 'text-rose-600' : 'text-slate-900'}`}>
                            {isRefund ? '−' : '+'}{fmtMoney(payment.amount, payment.currency || 'MAD')}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => deleteCustomerPayment(payment)}
                              disabled={deletingPaymentId !== null}
                              aria-label={`Delete ${payment.transaction_type || 'payment'} transaction`}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isDeleting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                              {isDeleting ? 'Deleting…' : 'Delete'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: EXPENSES & PAYABLES */}
      {activeTab === 'expenses' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-slate-900">{translate('Expenses & Supplier Payables')}</h3>
                <p className="text-xs text-slate-500">{translate('Track all cash outflows and unpaid obligations.')}</p>
              </div>
              <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-lg shadow-sm">
                <DollarSign className="w-3.5 h-3.5" />{translate('Record Expense')}</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3">{translate('Date')}</th>
                    <th className="px-5 py-3">{translate('Title / Supplier')}</th>
                    <th className="px-5 py-3">{translate('Category')}</th>
                    <th className="px-5 py-3 text-right">{translate('Amount')}</th>
                    <th className="px-5 py-3">{translate('Status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {metrics.filteredExpenses.length === 0 ? (
                    <tr><td colSpan="5" className="px-5 py-8 text-center text-slate-400">{translate('No expenses found for this period.')}</td></tr>
                  ) : (
                    metrics.filteredExpenses.map(e => (
                      <tr key={e.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3 text-slate-600">{fmtDate(e.expense_date)}</td>
                        <td className="px-5 py-3 font-medium text-slate-800">{e.title || e.supplier_name || 'General Expense'}</td>
                        <td className="px-5 py-3"><span className="px-2 py-1 bg-slate-100 rounded text-xs text-slate-600">{e.category || 'Uncategorized'}</span></td>
                        <td className="px-5 py-3 text-right font-bold text-slate-900">{fmtMoney(e.amount, e.currency)}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            e.payment_status === 'paid'
                              ? 'bg-emerald-100 text-emerald-700'
                              : e.payment_status === 'partially_paid'
                                ? 'bg-amber-100 text-amber-700'
                                : e.payment_status === 'cancelled'
                                  ? 'bg-slate-100 text-slate-600'
                                  : 'bg-rose-100 text-rose-700'
                          }`}>
                            {e.payment_status || 'unpaid'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: PROFITABILITY */}
      {activeTab === 'profitability' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 animate-in fade-in">
          <h3 className="text-base font-bold text-slate-900 mb-2">{translate('Booking Profitability Analysis')}</h3>
          <p className="text-sm text-slate-500 mb-6">{translate('Compare actual Sales Value against recorded direct costs.')}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs font-semibold text-slate-500 uppercase">{translate('Total Sales')}</p>
              <p className="text-xl font-bold text-slate-900 mt-1">{fmtMoney(metrics.totalSalesValue)}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs font-semibold text-slate-500 uppercase">{translate('Recorded Direct Costs')}</p>
              <p className="text-xl font-bold text-rose-600 mt-1">{fmtMoney(metrics.accountsPayable + metrics.totalCashOut)}</p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <p className="text-xs font-semibold text-emerald-700 uppercase">{translate('Gross Profit')}</p>
              <p className="text-xl font-bold text-emerald-700 mt-1">{fmtMoney(metrics.grossProfit)}</p>
            </div>
          </div>

          <div className="text-center p-8 border border-dashed border-slate-300 rounded-xl bg-slate-50">
            <FileText className="w-8 h-8 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600 text-sm">{translate('Detailed per-booking profitability requires linking `offer_costs` directly to specific bookings.')}</p>
            <p className="text-slate-400 text-xs mt-1">{translate('Navigate to the Reservations page to view individual booking margins.')}</p>
          </div>
        </div>
      )}
    </div>
  );
}