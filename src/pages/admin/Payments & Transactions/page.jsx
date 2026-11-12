import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CreditCard, 
  Search, 
  Plus, 
  Eye, 
  DollarSign, 
  RefreshCw, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  Calendar,
  Filter
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '../../../context/index.jsx';

export default function PaymentsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [payments, setPayments] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [methodFilter, setMethodFilter] = useState('ALL');

  // Modals
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);

  // Record Payment Form (Strictly matching migration 0006 columns)
  const [formData, setFormData] = useState({
    booking_id: '',
    transaction_type: 'payment',
    payment_method: 'card',
    amount: '',
    currency: 'MAD',
    transaction_status: 'completed'
  });

  const [formSubmitting, setFormSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [paymentsRes, bookingsRes] = await Promise.all([
        supabase.from('booking_payments').select('*, bookings(booking_reference, total_amount, currency)').order('transaction_date', { ascending: false }),
        supabase.from('bookings').select('id, booking_reference, total_amount, currency').order('created_at', { ascending: false })
      ]);

      if (paymentsRes.error) throw paymentsRes.error;

      setPayments(paymentsRes.data || []);
      setBookings(bookingsRes.error ? [] : (bookingsRes.data || []));

    } catch (err) {
      console.error('Error fetching payments:', err);
      setError('Failed to load payments. Ensure migration 0006 is applied.');
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const matchesSearch = 
        (p.transaction_reference_unique && p.transaction_reference_unique.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.bookings?.booking_reference && p.bookings.booking_reference.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'ALL' || p.transaction_status === statusFilter;
      const matchesType = typeFilter === 'ALL' || p.transaction_type === typeFilter;
      const matchesMethod = methodFilter === 'ALL' || p.payment_method === methodFilter;

      return matchesSearch && matchesStatus && matchesType && matchesMethod;
    });
  }, [payments, searchQuery, statusFilter, typeFilter, methodFilter]);

  const stats = useMemo(() => {
    const totalTransactions = payments.length;
    const completedPayments = payments
      .filter(p => p.transaction_type === 'payment' && p.transaction_status === 'completed')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const totalRefunds = payments
      .filter(p => p.transaction_type === 'refund' && p.transaction_status === 'completed')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const netRevenue = completedPayments - totalRefunds;

    return { totalTransactions, completedPayments, totalRefunds, netRevenue };
  }, [payments]);

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!formData.booking_id || !formData.amount) {
      alert('Booking and amount are required.');
      return;
    }

    try {
      setFormSubmitting(true);
      setError(null);

      const selectedBooking = bookings.find(b => b.id === formData.booking_id);

      // Payload strictly using migration 0006 columns
      const payload = {
        booking_id: formData.booking_id,
        transaction_type: formData.transaction_type,
        payment_method: formData.payment_method,
        amount: parseFloat(formData.amount),
        currency: selectedBooking ? selectedBooking.currency : formData.currency,
        transaction_status: formData.transaction_status,
        recorded_by: user?.id
      };

      const { error: insertErr } = await supabase.from('booking_payments').insert([payload]);
      if (insertErr) throw insertErr;

      setSuccessMessage('Transaction recorded successfully!');
      setIsRecordModalOpen(false);
      setFormData({
        booking_id: '',
        transaction_type: 'payment',
        payment_method: 'card',
        amount: '',
        currency: 'MAD',
        transaction_status: 'completed'
      });

      await fetchData();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      console.error('Error recording payment:', err);
      setError('Failed to record transaction: ' + (err.message || 'Unknown error'));
    } finally {
      setFormSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 className="w-3 h-3" /> Completed</span>;
      case 'pending':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">Pending</span>;
      case 'failed':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">Failed</span>;
      case 'voided':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">Voided</span>;
      case 'cancelled':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">Cancelled</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-50 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 bg-slate-50/50 min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Payments & Transactions (Migration 0006)</h1>
          <p className="text-sm text-slate-500 mt-1">Concurrency-safe refunds, audit triggers, immutable completed records, and financials.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSqlModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-all shadow-xs"
          >
            <FileText className="w-4 h-4 text-amber-600" />
            <span>View Test SQL</span>
          </button>
          <button 
            onClick={fetchData}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-xs transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button 
            onClick={() => setIsRecordModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-500 shadow-sm shadow-amber-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 text-xs font-medium animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800 text-xs font-medium animate-in fade-in">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Overview Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-xl border border-amber-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Transactions</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.totalTransactions}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-amber-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Payments In</p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">{stats.completedPayments.toLocaleString()} MAD</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-amber-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Refunds Out</p>
            <h3 className="text-2xl font-bold text-rose-600 mt-1">{stats.totalRefunds.toLocaleString()} MAD</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-amber-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Net Revenue</p>
            <h3 className="text-2xl font-bold text-blue-600 mt-1">{stats.netRevenue.toLocaleString()} MAD</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white p-5 rounded-xl border border-amber-100 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Search by PAY/REF reference..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="voided">Voided</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500 font-medium"
            >
              <option value="ALL">All Types</option>
              <option value="payment">Payment</option>
              <option value="refund">Refund</option>
            </select>
          </div>

        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl border border-amber-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Transaction Ref</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Booking Ref</th>
                <th className="py-3.5 px-4">Method</th>
                <th className="py-3.5 px-4 text-right">Amount</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-600" />
                    Loading transactions from Supabase...
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    <CreditCard className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No transactions found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-amber-50/30 transition-colors">
                    
                    <td className="py-3.5 px-4 font-mono font-bold text-amber-700">
                      {p.transaction_reference_unique}
                    </td>

                    <td className="py-3.5 px-4">
                      {p.transaction_type === 'refund' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 uppercase">
                          <ArrowUpRight className="w-3 h-3" /> Refund
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                          <ArrowDownLeft className="w-3 h-3" /> Payment
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                      {p.bookings?.booking_reference || '—'}
                    </td>

                    <td className="py-3.5 px-4 uppercase font-semibold text-slate-600">
                      {p.payment_method}
                    </td>

                    <td className={`py-3.5 px-4 text-right font-extrabold ${p.transaction_type === 'refund' ? 'text-rose-600' : 'text-slate-900'}`}>
                      {p.transaction_type === 'refund' ? '-' : '+'}{Number(p.amount || 0).toLocaleString()} {p.currency}
                    </td>

                    <td className="py-3.5 px-4">
                      {getStatusBadge(p.transaction_status)}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(p.transaction_date || p.created_at).toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => navigate(`/admin/payments-transactions/${p.id}`)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors"
                        title="View Transaction Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Details</span>
                      </button>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECORD PAYMENT MODAL */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-amber-100 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-base font-bold text-slate-900">Record Payment / Transaction (Migration 0006)</h3>
              <button onClick={() => setIsRecordModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Select Booking *</label>
                <select
                  required
                  value={formData.booking_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, booking_id: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800"
                >
                  <option value="">Select booking...</option>
                  {bookings.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.booking_reference} — Total: {Number(b.total_amount).toLocaleString()} {b.currency}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Transaction Type</label>
                  <select
                    value={formData.transaction_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, transaction_type: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold"
                  >
                    <option value="payment">Payment (PAY)</option>
                    <option value="refund">Refund (REF)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium"
                  >
                    <option value="card">Card</option>
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="5000.00"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Initial Status</label>
                  <select
                    value={formData.transaction_status}
                    onChange={(e) => setFormData(prev => ({ ...prev, transaction_status: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium"
                  >
                    <option value="completed">Completed (Immutable)</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsRecordModalOpen(false)} className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg">
                  Cancel
                </button>
                <button type="submit" disabled={formSubmitting} className="px-5 py-2 text-xs font-semibold text-white bg-amber-600 rounded-lg shadow-sm">
                  {formSubmitting ? 'Recording...' : 'Record Transaction'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* SQL MIGRATION MODAL */}
      {isSqlModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-900 rounded-2xl max-w-4xl w-full border border-slate-700 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 text-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
              <h3 className="text-sm font-bold text-white">Migration 0006 Verification Test SQL</h3>
              <button onClick={() => setIsSqlModalOpen(false)} className="p-1 text-slate-400 hover:text-white rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <pre className="text-xs font-mono text-slate-300 bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-x-auto whitespace-pre">
{`-- 1. Check schema changes applied
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema='public' AND table_name='booking_payments'
ORDER BY ordinal_position;

-- 2. Test reference generation
INSERT INTO public.booking_payments
  (booking_id, transaction_type, amount, currency, payment_method,
   transaction_status, recorded_by)
VALUES
  ('<booking-id>', 'payment', 1000.00, 'MAD', 'cash', 'completed', auth.uid())
RETURNING id, transaction_reference_unique;

-- 3. Test refund validation
INSERT INTO public.booking_payments
  (booking_id, transaction_type, original_payment_id, amount, currency,
   payment_method, transaction_status, recorded_by)
VALUES
  ('<booking-id>', 'refund', '<payment-id>', 400.00, 'MAD', 'cash', 'completed', auth.uid())
RETURNING id, transaction_reference_unique;

-- 4. Over-refund rejected
INSERT INTO public.booking_payments
  (booking_id, transaction_type, original_payment_id, amount, currency,
   payment_method, transaction_status, recorded_by)
VALUES
  ('<booking-id>', 'refund', '<payment-id>', 700.00, 'MAD', 'cash', 'completed', auth.uid());

-- 5. Check financials
SELECT * FROM public.booking_financials WHERE booking_id = '<booking-id>';

-- 6. Completed payment can't be edited
UPDATE public.booking_payments SET amount = 999 WHERE id = '<payment-id>';

-- 7. Status-change audit written
SELECT * FROM public.audit_logs
WHERE entity_type = 'booking_payment' AND entity_id = '<payment-id>'
ORDER BY created_at DESC;`}
              </pre>
            </div>
            <div className="flex items-center justify-end px-6 py-4 border-t border-slate-800 bg-slate-950">
              <button onClick={() => setIsSqlModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
