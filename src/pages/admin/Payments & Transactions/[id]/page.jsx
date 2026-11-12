import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  CreditCard, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  X, 
  ArrowUpRight,
  ArrowDownLeft,
  Clock
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '../../../../context/index.jsx';

export default function PaymentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [payment, setPayment] = useState(null);
  const [booking, setBooking] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Status Change Modal
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  // Refund Modal (Strictly using migration 0006 columns)
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundData, setRefundData] = useState({
    amount: '',
    refund_reason: '',
    payment_method: 'card'
  });

  const [formSubmitting, setFormSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchPaymentDetails();
    }
  }, [id]);

  const fetchPaymentDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const payRes = await supabase.from('booking_payments').select('*, bookings(*)').eq('id', id).single();
      if (payRes.error) throw payRes.error;

      setPayment(payRes.data);
      setBooking(payRes.data.bookings || null);
      setNewStatus(payRes.data.transaction_status);

      const auditRes = await supabase
        .from('audit_logs')
        .select('*')
        .eq('entity_id', id)
        .order('created_at', { ascending: false });

      setAuditLogs(auditRes.error ? [] : (auditRes.data || []));

    } catch (err) {
      console.error('Error fetching transaction detail:', err);
      setError('Failed to load transaction profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (payment.transaction_status === 'completed') {
      alert('Completed payments are immutable per Migration 0006.');
      return;
    }

    try {
      setFormSubmitting(true);
      setError(null);

      const { error: err } = await supabase
        .from('booking_payments')
        .update({ transaction_status: newStatus })
        .eq('id', id);

      if (err) throw err;

      setSuccessMessage('Transaction status updated successfully (audit log recorded)!');
      setIsStatusModalOpen(false);
      await fetchPaymentDetails();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Failed to update status: ' + err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleIssueRefund = async (e) => {
    e.preventDefault();
    if (!refundData.amount) return;

    try {
      setFormSubmitting(true);
      setError(null);

      const payload = {
        booking_id: payment.booking_id,
        original_payment_id: payment.id,
        transaction_type: 'refund',
        payment_method: refundData.payment_method,
        amount: parseFloat(refundData.amount),
        currency: payment.currency,
        transaction_status: 'completed',
        refund_reason: refundData.refund_reason || null,
        recorded_by: user?.id
      };

      const { error: err } = await supabase.from('booking_payments').insert([payload]);
      if (err) throw err;

      setSuccessMessage('Refund issued and validated successfully via concurrency-safe trigger!');
      setIsRefundModalOpen(false);
      setRefundData({ amount: '', refund_reason: '', payment_method: 'card' });
      await fetchPaymentDetails();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      console.error('Error issuing refund:', err);
      setError('Refund validation failed: ' + (err.message || 'Unknown error'));
    } finally {
      setFormSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 min-h-screen flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-600 mb-2" />
        <span>Loading transaction profile...</span>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="p-12 text-center text-slate-500 min-h-screen">
        <h2 className="text-xl font-bold text-slate-800">Transaction not found</h2>
        <button onClick={() => navigate('/admin/payments-transactions')} className="mt-4 px-4 py-2 bg-amber-600 text-white rounded-lg text-xs">
          Back to Payments
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 bg-slate-50/50 min-h-screen">
      
      {/* Top Bar / Back */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate('/admin/payments-transactions')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-amber-600 bg-white border border-slate-200 px-3 py-2 rounded-lg shadow-xs transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Payments</span>
        </button>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
            {payment.transaction_reference_unique}
          </span>
          {payment.transaction_status !== 'completed' ? (
            <button
              onClick={() => setIsStatusModalOpen(true)}
              className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-500 shadow-sm"
            >
              Update Status
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg">
              <ShieldCheck className="w-4 h-4" /> Immutable Completed Record
            </span>
          )}
          {payment.transaction_type === 'payment' && payment.transaction_status === 'completed' && (
            <button
              onClick={() => setIsRefundModalOpen(true)}
              className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 rounded-lg hover:bg-rose-500 shadow-sm"
            >
              Issue Refund
            </button>
          )}
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

      {/* Profile Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-amber-100 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-sm ${payment.transaction_type === 'refund' ? 'bg-rose-600' : 'bg-emerald-600'}`}>
              {payment.transaction_type === 'refund' ? <ArrowUpRight className="w-8 h-8" /> : <CreditCard className="w-8 h-8" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 uppercase">{payment.transaction_type} Record</h1>
                <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 uppercase">
                  {payment.transaction_status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Method: <strong className="uppercase">{payment.payment_method}</strong> | Recorded on {new Date(payment.transaction_date || payment.created_at).toLocaleString()}</p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Transaction Amount</p>
            <h3 className={`text-3xl font-extrabold mt-0.5 ${payment.transaction_type === 'refund' ? 'text-rose-600' : 'text-slate-900'}`}>
              {payment.transaction_type === 'refund' ? '-' : '+'}{Number(payment.amount || 0).toLocaleString()} <span className="text-sm font-bold text-amber-700">{payment.currency}</span>
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100 text-xs">
          <div>
            <span className="text-slate-400 block uppercase tracking-wider text-[10px]">Booking Reference</span>
            <span className="font-mono font-bold text-amber-700">{booking?.booking_reference || '—'}</span>
          </div>
          <div>
            <span className="text-slate-400 block uppercase tracking-wider text-[10px]">Refund Reason</span>
            <span className="font-bold text-slate-800">{payment.refund_reason || '—'}</span>
          </div>
          <div>
            <span className="text-slate-400 block uppercase tracking-wider text-[10px]">Status Changed At</span>
            <span className="font-bold text-slate-800">{payment.status_changed_at ? new Date(payment.status_changed_at).toLocaleString() : '—'}</span>
          </div>
          <div>
            <span className="text-slate-400 block uppercase tracking-wider text-[10px]">Booking Total</span>
            <span className="font-bold text-slate-800">{booking ? `${Number(booking.total_amount).toLocaleString()} ${booking.currency}` : '—'}</span>
          </div>
        </div>
      </div>

      {/* Main Split: Audit Trail */}
      <div className="bg-white rounded-2xl border border-amber-100 shadow-xs p-6 space-y-6">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-600" /> Audit Trail & Status History ({auditLogs.length})
        </h3>

        {auditLogs.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-4">No audit logs recorded for this transaction yet.</p>
        ) : (
          <div className="space-y-3">
            {auditLogs.map(log => (
              <div key={log.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded text-[10px]">
                      {log.action}
                    </span>
                    <span className="font-semibold text-slate-900">{log.description}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Logged at {new Date(log.created_at).toLocaleString()}</p>
                </div>
                <div className="text-right font-mono text-[10px] text-slate-400">
                  Actor: {log.actor_id?.slice(0, 8)}...
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* STATUS CHANGE MODAL */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full border border-amber-100 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-base font-bold text-slate-900">Update Transaction Status</h3>
              <button onClick={() => setIsStatusModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateStatus} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">New Status *</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold"
                >
                  <option value="pending">Pending</option>
                  <option value="completed">Completed (Becomes Immutable)</option>
                  <option value="failed">Failed</option>
                  <option value="voided">Voided</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsStatusModalOpen(false)} className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg">
                  Cancel
                </button>
                <button type="submit" disabled={formSubmitting} className="px-5 py-2 text-xs font-semibold text-white bg-amber-600 rounded-lg shadow-sm">
                  {formSubmitting ? 'Updating...' : 'Save Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REFUND MODAL */}
      {isRefundModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full border border-amber-100 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-base font-bold text-slate-900">Issue Concurrency-Safe Refund</h3>
              <button onClick={() => setIsRefundModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleIssueRefund} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Refund Amount * ({payment.currency})</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  max={payment.amount}
                  placeholder="Max available..."
                  value={refundData.amount}
                  onChange={(e) => setRefundData(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold"
                />
                <p className="text-[10px] text-slate-400 mt-1">Original payment amount: {payment.amount} {payment.currency}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Refund Reason (Stored in column)</label>
                <textarea
                  rows="2"
                  placeholder="e.g. Customer requested cancellation..."
                  value={refundData.refund_reason}
                  onChange={(e) => setRefundData(prev => ({ ...prev, refund_reason: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs"
                ></textarea>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsRefundModalOpen(false)} className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg">
                  Cancel
                </button>
                <button type="submit" disabled={formSubmitting} className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 rounded-lg shadow-sm">
                  {formSubmitting ? 'Issuing...' : 'Confirm Refund'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
