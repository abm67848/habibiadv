import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar as CalendarIcon, 
  Search, 
  Plus, 
  Eye, 
  DollarSign, 
  Users, 
  Compass, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  XCircle, 
  Phone, 
  Mail, 
  MapPin, 
  RefreshCw,
  X,
  AlertTriangle,
  Copy,
  Check,
  FileText
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/context/index.jsx';

export default function ReservationsPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  // State management
  const [reservations, setReservations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [payments, setPayments] = useState([]);
  const [financials, setFinancials] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [bookingStatusFilter, setBookingStatusFilter] = useState('ALL');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('ALL');
  const [destinationFilter, setDestinationFilter] = useState('ALL');
  const [employeeFilter, setEmployeeFilter] = useState('ALL');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [copiedSql, setCopiedSql] = useState(false);

  // Form states for Create Reservation
  const [formData, setFormData] = useState({
    customer_id: '',
    destination: '',
    departure_date: '',
    return_date: '',
    traveler_count: 1,
    total_amount: '',
    currency: 'MAD',
    booking_status: 'pending',
    assigned_to: user?.id || '',
    special_requests: '',
    internal_notes: '',
    // Initial Payment
    initial_payment_amount: '',
    payment_method: 'bank_transfer',
    payment_notes: 'Initial booking deposit'
  });

  // Form state for Adding Payment
  const [paymentData, setPaymentData] = useState({
    amount: '',
    payment_method: 'bank_transfer',
    transaction_status: 'completed',
    transaction_type: 'payment',
    transaction_reference: '',
    notes: ''
  });

  const [formSubmitting, setFormSubmitting] = useState(false);

  // Fetch all required data from Supabase on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch bookings, customers, profiles, payments, and booking_financials view in parallel
      const [
        bookingsRes,
        customersRes,
        profilesRes,
        paymentsRes,
        financialsRes
      ] = await Promise.all([
        supabase.from('bookings').select('*').order('created_at', { ascending: false }),
        supabase.from('customers').select('*').order('full_name', { ascending: true }),
        supabase.from('profiles').select('*'),
        supabase.from('booking_payments').select('*'),
        supabase.from('booking_financials').select('*')
      ]);

      if (bookingsRes.error) throw bookingsRes.error;
      if (customersRes.error) throw customersRes.error;
      
      setReservations(bookingsRes.data || []);
      setCustomers(customersRes.data || []);
      setProfiles(profilesRes.data || []);
      setPayments(paymentsRes.error ? [] : (paymentsRes.data || []));
      setFinancials(financialsRes.error ? [] : (financialsRes.data || []));

    } catch (err) {
      console.error('Error fetching reservations data:', err);
      setError('Failed to load reservations and related records from Supabase. Ensure migration 0002 has been applied.');
    } finally {
      setLoading(false);
    }
  };

  // Compute enriched reservations matching the SQL schema
  const enrichedReservations = useMemo(() => {
    return reservations.map(res => {
      const customer = customers.find(c => c.id === res.customer_id) || { full_name: 'Unknown Customer', phone: '', email: '' };
      const assignedProfile = profiles.find(p => p.id === res.assigned_to) || { full_name: 'Unassigned' };
      const fin = financials.find(f => f.booking_id === res.id) || {};

      // Filter payments for this booking
      const resPayments = payments.filter(p => p.booking_id === res.id);
      
      const totalPaid = fin.net_paid !== undefined ? Number(fin.net_paid) : resPayments
        .filter(p => p.transaction_status === 'completed')
        .reduce((sum, p) => sum + (p.transaction_type === 'payment' ? Number(p.amount) : -Number(p.amount)), 0);

      const totalAmount = Number(res.total_amount || 0);
      const balance = fin.outstanding_balance !== undefined ? Number(fin.outstanding_balance) : Math.max(0, totalAmount - totalPaid);

      let paymentStatus = fin.payment_status || 'unpaid';
      if (fin.payment_status === undefined) {
        if (totalPaid >= totalAmount && totalAmount > 0) paymentStatus = 'paid';
        else if (totalPaid > 0) paymentStatus = 'partially_paid';
        else paymentStatus = 'unpaid';
      }

      return {
        ...res,
        customer,
        assignedProfile,
        totalPaid,
        balance,
        paymentStatus,
        resPayments
      };
    });
  }, [reservations, customers, profiles, payments, financials]);

  // Statistics calculation
  const stats = useMemo(() => {
    const totalReservations = enrichedReservations.length;
    const confirmedReservations = enrichedReservations.filter(r => r.booking_status === 'confirmed').length;
    const pendingReservations = enrichedReservations.filter(r => r.booking_status === 'pending').length;
    const totalOutstandingBalance = enrichedReservations.reduce((sum, r) => sum + r.balance, 0);

    return {
      totalReservations,
      confirmedReservations,
      pendingReservations,
      totalOutstandingBalance
    };
  }, [enrichedReservations]);

  // Unique destinations for filter dropdown
  const uniqueDestinations = useMemo(() => {
    const dests = new Set();
    enrichedReservations.forEach(r => {
      if (r.destination) dests.add(r.destination);
    });
    return Array.from(dests);
  }, [enrichedReservations]);

  // Filtered reservations
  const filteredReservations = useMemo(() => {
    return enrichedReservations.filter(res => {
      const matchesSearch = 
        (res.booking_reference && res.booking_reference.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (res.customer?.full_name && res.customer.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (res.customer?.phone && res.customer.phone.includes(searchQuery)) ||
        (res.destination && res.destination.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesBookingStatus = bookingStatusFilter === 'ALL' || res.booking_status === bookingStatusFilter;
      const matchesPaymentStatus = paymentStatusFilter === 'ALL' || res.paymentStatus === paymentStatusFilter;
      const matchesDestination = destinationFilter === 'ALL' || res.destination === destinationFilter;
      const matchesEmployee = employeeFilter === 'ALL' || res.assigned_to === employeeFilter;

      return matchesSearch && matchesBookingStatus && matchesPaymentStatus && matchesDestination && matchesEmployee;
    });
  }, [enrichedReservations, searchQuery, bookingStatusFilter, paymentStatusFilter, destinationFilter, employeeFilter]);

  // Create Reservation submission
  const handleCreateReservation = async (e) => {
    e.preventDefault();
    if (!formData.customer_id || !formData.total_amount || !formData.departure_date) {
      alert('Please select a customer, departure date, and specify a total amount.');
      return;
    }

    try {
      setFormSubmitting(true);
      setError(null);

      const newBookingPayload = {
        customer_id: formData.customer_id,
        destination: formData.destination || 'General Trip',
        departure_date: formData.departure_date,
        return_date: formData.return_date || null,
        traveler_count: Number(formData.traveler_count) || 1,
        total_amount: Number(formData.total_amount),
        currency: formData.currency || 'MAD',
        booking_status: formData.booking_status || 'pending',
        assigned_to: formData.assigned_to || user?.id || null,
        special_requests: formData.special_requests || null,
        internal_notes: formData.internal_notes || null,
        created_by: user?.id
      };

      const { data: insertedBooking, error: insertError } = await supabase
        .from('bookings')
        .insert([newBookingPayload])
        .select()
        .single();

      if (insertError) throw insertError;

      // If initial payment is provided, record it in booking_payments table
      if (formData.initial_payment_amount && Number(formData.initial_payment_amount) > 0 && insertedBooking) {
        const paymentPayload = {
          booking_id: insertedBooking.id,
          transaction_type: 'payment',
          amount: Number(formData.initial_payment_amount),
          currency: formData.currency || 'MAD',
          payment_method: formData.payment_method,
          transaction_status: 'completed',
          notes: formData.payment_notes,
          recorded_by: user?.id
        };

        const { error: paymentError } = await supabase
          .from('booking_payments')
          .insert([paymentPayload]);

        if (paymentError) {
          console.error('Error inserting initial payment:', paymentError);
        }
      }

      setSuccessMessage('Reservation created successfully!');
      setIsCreateModalOpen(false);
      setFormData({
        customer_id: '',
        destination: '',
        departure_date: '',
        return_date: '',
        traveler_count: 1,
        total_amount: '',
        currency: 'MAD',
        booking_status: 'pending',
        assigned_to: user?.id || '',
        special_requests: '',
        internal_notes: '',
        initial_payment_amount: '',
        payment_method: 'bank_transfer',
        payment_notes: 'Initial booking deposit'
      });

      await fetchData();
      setTimeout(() => setSuccessMessage(null), 4000);

    } catch (err) {
      console.error('Error creating reservation:', err);
      setError('Failed to create reservation: ' + (err.message || 'Unknown error'));
    } finally {
      setFormSubmitting(false);
    }
  };

  // Add Payment to selected reservation
  const handleAddPayment = async (e) => {
    e.preventDefault();
    if (!selectedReservation || !paymentData.amount) return;

    try {
      setFormSubmitting(true);
      setError(null);

      const paymentPayload = {
        booking_id: selectedReservation.id,
        transaction_type: paymentData.transaction_type,
        amount: Number(paymentData.amount),
        currency: selectedReservation.currency || 'MAD',
        payment_method: paymentData.payment_method,
        transaction_status: paymentData.transaction_status,
        transaction_reference: paymentData.transaction_reference || null,
        notes: paymentData.notes || null,
        recorded_by: user?.id
      };

      const { error: paymentError } = await supabase
        .from('booking_payments')
        .insert([paymentPayload]);

      if (paymentError) throw paymentError;

      setSuccessMessage('Transaction recorded successfully!');
      setIsPaymentModalOpen(false);
      setPaymentData({
        amount: '',
        payment_method: 'bank_transfer',
        transaction_status: 'completed',
        transaction_type: 'payment',
        transaction_reference: '',
        notes: ''
      });

      await fetchData();

      const updatedRes = enrichedReservations.find(r => r.id === selectedReservation.id);
      if (updatedRes) setSelectedReservation(updatedRes);

      setTimeout(() => setSuccessMessage(null), 4000);

    } catch (err) {
      console.error('Error recording payment:', err);
      setError('Failed to record transaction: ' + (err.message || 'Unknown error'));
    } finally {
      setFormSubmitting(false);
    }
  };

  // Update Booking Status
  const handleUpdateStatus = async (reservationId, newStatus) => {
    try {
      setError(null);
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ booking_status: newStatus })
        .eq('id', reservationId);

      if (updateError) throw updateError;

      setSuccessMessage(`Booking status updated to ${newStatus}`);
      await fetchData();

      if (selectedReservation && selectedReservation.id === reservationId) {
        setSelectedReservation(prev => ({ ...prev, booking_status: newStatus }));
      }

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Failed to update booking status.');
    }
  };

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

  const getPaymentBadge = (status) => {
    switch (status) {
      case 'paid':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">Paid</span>;
      case 'partially_paid':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">Partially Paid</span>;
      case 'overpaid':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">Overpaid</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">Unpaid</span>;
    }
  };

  const sqlMigrationCode = `-- ============================================================================
-- Migration: 0002_bookings_module
-- Description: Reservations / Bookings module for the Travel Agency
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    country TEXT,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMPTZ
);

CREATE SEQUENCE IF NOT EXISTS public.booking_ref_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_booking_reference()
RETURNS TEXT LANGUAGE sql VOLATILE AS $$
    SELECT 'BK-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('public.booking_ref_seq')::TEXT, 6, '0');
$$;

CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_reference TEXT UNIQUE NOT NULL DEFAULT public.generate_booking_reference(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    destination TEXT,
    departure_date DATE NOT NULL,
    return_date DATE,
    traveler_count INTEGER NOT NULL DEFAULT 1,
    total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'MAD',
    booking_status TEXT NOT NULL DEFAULT 'pending',
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    special_requests TEXT,
    internal_notes TEXT,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT bookings_status_check CHECK (booking_status IN ('pending','confirmed','in_progress','completed','cancelled'))
);

CREATE TABLE IF NOT EXISTS public.booking_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL,
    original_payment_id UUID REFERENCES public.booking_payments(id) ON DELETE RESTRICT,
    amount NUMERIC(14,2) NOT NULL,
    currency TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    transaction_status TEXT NOT NULL DEFAULT 'pending',
    transaction_reference TEXT,
    transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,
    recorded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT payment_type_check CHECK (transaction_type IN ('payment','refund')),
    CONSTRAINT payment_amount_check CHECK (amount > 0)
);

CREATE OR REPLACE VIEW public.booking_financials WITH (security_invoker = true) AS
SELECT
    b.id AS booking_id,
    b.booking_reference,
    b.total_amount AS booking_total,
    b.currency,
    b.booking_status,
    COALESCE(SUM(CASE WHEN p.transaction_type = 'payment' AND p.transaction_status = 'completed' THEN p.amount ELSE 0 END), 0) AS total_completed_payments,
    COALESCE(SUM(CASE WHEN p.transaction_type = 'refund' AND p.transaction_status = 'completed' THEN p.amount ELSE 0 END), 0) AS total_completed_refunds,
    COALESCE(SUM(CASE WHEN p.transaction_type = 'payment' AND p.transaction_status = 'completed' THEN p.amount WHEN p.transaction_type = 'refund' AND p.transaction_status = 'completed' THEN -p.amount ELSE 0 END), 0) AS net_paid,
    b.total_amount - COALESCE(SUM(CASE WHEN p.transaction_type = 'payment' AND p.transaction_status = 'completed' THEN p.amount WHEN p.transaction_type = 'refund' AND p.transaction_status = 'completed' THEN -p.amount ELSE 0 END), 0) AS outstanding_balance,
    CASE
        WHEN COALESCE(SUM(CASE WHEN p.transaction_type = 'payment' AND p.transaction_status = 'completed' THEN p.amount WHEN p.transaction_type = 'refund' AND p.transaction_status = 'completed' THEN -p.amount ELSE 0 END), 0) = 0 THEN 'unpaid'
        WHEN COALESCE(SUM(CASE WHEN p.transaction_type = 'payment' AND p.transaction_status = 'completed' THEN p.amount WHEN p.transaction_type = 'refund' AND p.transaction_status = 'completed' THEN -p.amount ELSE 0 END), 0) < b.total_amount THEN 'partially_paid'
        WHEN COALESCE(SUM(CASE WHEN p.transaction_type = 'payment' AND p.transaction_status = 'completed' THEN p.amount WHEN p.transaction_type = 'refund' AND p.transaction_status = 'completed' THEN -p.amount ELSE 0 END), 0) = b.total_amount THEN 'paid'
        ELSE 'overpaid'
    END AS payment_status
FROM public.bookings b
LEFT JOIN public.booking_payments p ON p.booking_id = b.id
GROUP BY b.id, b.booking_reference, b.total_amount, b.currency, b.booking_status;`;

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 bg-slate-50/50 min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Reservations (0002 Schema Compatible)</h1>
          <p className="text-sm text-slate-500 mt-1">Manage bookings, travelers, and ledger payments connected directly to Supabase.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSqlModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-all shadow-xs"
          >
            <FileText className="w-4 h-4 text-amber-600" />
            <span>View SQL Migration</span>
          </button>
          <button 
            onClick={fetchData}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-xs transition-all"
            title="Refresh records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-500 shadow-sm shadow-amber-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Reservation</span>
          </button>
        </div>
      </div>

      {/* Success / Error Banners */}
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

      {/* Overview Statistics (4 Compact Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-xl border border-amber-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Reservations</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.totalReservations}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <CalendarIcon className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-amber-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Confirmed Bookings</p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">{stats.confirmedReservations}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-amber-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Pending Bookings</p>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">{stats.pendingReservations}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-amber-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Outstanding Balance</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.totalOutstandingBalance.toLocaleString()} MAD</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search and Filters Section */}
      <div className="bg-white p-5 rounded-xl border border-amber-100 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Search Box */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Search by BK ref, customer name, phone or destination..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
            />
          </div>

          {/* Booking Status Filter */}
          <div>
            <select
              value={bookingStatusFilter}
              onChange={(e) => setBookingStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Booking Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Payment Status Filter */}
          <div>
            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Payment Statuses</option>
              <option value="paid">Paid</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="unpaid">Unpaid</option>
              <option value="overpaid">Overpaid</option>
            </select>
          </div>

        </div>

        {/* Secondary Filters row */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Destination Filter */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-slate-500 uppercase">Destination:</span>
              <select
                value={destinationFilter}
                onChange={(e) => setDestinationFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">All Destinations</option>
                {uniqueDestinations.map((dest, idx) => (
                  <option key={idx} value={dest}>{dest}</option>
                ))}
              </select>
            </div>

            {/* Employee Filter */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-slate-500 uppercase">Assigned To:</span>
              <select
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">All Employees</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>{p.full_name || p.email || 'Employee'}</option>
                ))}
              </select>
            </div>

          </div>

          {/* Clear Filters Action */}
          {(searchQuery || bookingStatusFilter !== 'ALL' || paymentStatusFilter !== 'ALL' || destinationFilter !== 'ALL' || employeeFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setBookingStatusFilter('ALL');
                setPaymentStatusFilter('ALL');
                setDestinationFilter('ALL');
                setEmployeeFilter('ALL');
              }}
              className="text-xs font-medium text-amber-600 hover:text-amber-700 underline"
            >
              Clear all filters
            </button>
          )}
        </div>
      </div>

      {/* Reservations Table */}
      <div className="bg-white rounded-xl border border-amber-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Ref</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Destination</th>
                <th className="py-3.5 px-4">Departure</th>
                <th className="py-3.5 px-4 text-center">Travelers</th>
                <th className="py-3.5 px-4 text-right">Total</th>
                <th className="py-3.5 px-4 text-right">Paid</th>
                <th className="py-3.5 px-4 text-right">Balance</th>
                <th className="py-3.5 px-4">Booking Status</th>
                <th className="py-3.5 px-4">Payment</th>
                <th className="py-3.5 px-4">Assigned To</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="12" className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-600" />
                    Loading bookings from Supabase...
                  </td>
                </tr>
              ) : filteredReservations.length === 0 ? (
                <tr>
                  <td colSpan="12" className="py-12 text-center text-slate-400">
                    <CalendarIcon className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No reservations found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredReservations.map((res) => (
                  <tr key={res.id} className="hover:bg-amber-50/30 transition-colors">
                    
                    <td className="py-3.5 px-4 font-mono font-semibold text-amber-700">
                      {res.booking_reference}
                    </td>

                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      <div>{res.customer.full_name}</div>
                      <div className="text-[11px] text-slate-400">{res.customer.phone || res.customer.email}</div>
                    </td>

                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      {res.destination || 'General Trip'}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                      <div>{res.departure_date ? new Date(res.departure_date).toLocaleDateString() : 'TBD'}</div>
                      <div className="text-[10px] text-slate-400">to {res.return_date ? new Date(res.return_date).toLocaleDateString() : 'TBD'}</div>
                    </td>

                    <td className="py-3.5 px-4 text-center font-semibold text-slate-800">
                      {res.traveler_count || 1}
                    </td>

                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      {Number(res.total_amount || 0).toLocaleString()} {res.currency}
                    </td>

                    <td className="py-3.5 px-4 text-right font-semibold text-emerald-600">
                      {res.totalPaid.toLocaleString()} {res.currency}
                    </td>

                    <td className="py-3.5 px-4 text-right font-semibold text-slate-600">
                      {res.balance.toLocaleString()} {res.currency}
                    </td>

                    <td className="py-3.5 px-4">
                      {getStatusBadge(res.booking_status)}
                    </td>

                    <td className="py-3.5 px-4">
                      {getPaymentBadge(res.paymentStatus)}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      {res.assignedProfile?.full_name || 'Unassigned'}
                    </td>

                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedReservation(res);
                            setIsDetailModalOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedReservation(res);
                            setIsPaymentModalOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Add Payment"
                        >
                          <DollarSign className="w-4 h-4" />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE RESERVATION MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-amber-100 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-base font-bold text-slate-900">Create New Reservation (0002 Schema)</h3>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateReservation} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 flex items-center gap-2">
                  <Users className="w-4 h-4" /> Customer Information
                </h4>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Select Customer *</label>
                  <select
                    required
                    value={formData.customer_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, customer_id: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                  >
                    <option value="">Select an existing customer...</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.full_name} ({c.phone || c.email || 'No contact info'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 flex items-center gap-2">
                  <Compass className="w-4 h-4" /> Trip Details
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Destination *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Marrakech, Agadir, Chefchaouen"
                      value={formData.destination}
                      onChange={(e) => setFormData(prev => ({ ...prev, destination: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Traveler Count *</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={formData.traveler_count}
                      onChange={(e) => setFormData(prev => ({ ...prev, traveler_count: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Departure Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.departure_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, departure_date: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Return Date</label>
                    <input
                      type="date"
                      value={formData.return_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, return_date: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" /> Pricing & Initial Payment
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Total Amount *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={formData.total_amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, total_amount: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Currency</label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                    >
                      <option value="MAD">MAD</option>
                      <option value="EUR">EUR</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Initial Payment Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.initial_payment_amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, initial_payment_amount: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Payment Method</label>
                    <select
                      value={formData.payment_method}
                      onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                    >
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Assigned Employee</label>
                    <select
                      value={formData.assigned_to}
                      onChange={(e) => setFormData(prev => ({ ...prev, assigned_to: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                    >
                      <option value="">Select Employee...</option>
                      {profiles.map(p => (
                        <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Initial Status</label>
                    <select
                      value={formData.booking_status}
                      onChange={(e) => setFormData(prev => ({ ...prev, booking_status: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Special Requests</label>
                  <textarea
                    rows="2"
                    placeholder="Dietary requirements, room preferences..."
                    value={formData.special_requests}
                    onChange={(e) => setFormData(prev => ({ ...prev, special_requests: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                  ></textarea>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Internal Notes</label>
                  <textarea
                    rows="2"
                    placeholder="Staff notes..."
                    value={formData.internal_notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, internal_notes: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                  ></textarea>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-500 shadow-sm disabled:opacity-50"
                >
                  {formSubmitting ? 'Saving...' : 'Save Reservation'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* RESERVATION DETAILS MODAL */}
      {isDetailModalOpen && selectedReservation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full border border-amber-100 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 font-bold font-mono">
                  BK
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Booking #{selectedReservation.booking_reference}</h3>
                  <p className="text-xs text-slate-500">Created on {new Date(selectedReservation.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsDetailModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              
              <div className="flex flex-wrap items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200/80 gap-4">
                <div>
                  <span className="text-[11px] font-medium text-slate-400 uppercase block mb-1">Current Status</span>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(selectedReservation.booking_status)}
                    {getPaymentBadge(selectedReservation.paymentStatus)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-slate-400 uppercase">Change Status:</span>
                  <select
                    value={selectedReservation.booking_status || 'pending'}
                    onChange={(e) => handleUpdateStatus(selectedReservation.id, e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-amber-500 font-medium"
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 flex items-center gap-2">
                    <Users className="w-4 h-4" /> Customer Information
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    <p className="font-semibold text-slate-900 text-sm">{selectedReservation.customer.full_name}</p>
                    <p className="text-slate-600 flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" /> {selectedReservation.customer.phone || 'No phone'}
                    </p>
                    <p className="text-slate-600 flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400" /> {selectedReservation.customer.email || 'No email'}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 flex items-center gap-2">
                    <Compass className="w-4 h-4" /> Trip Itinerary
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    <p className="font-semibold text-slate-900 text-sm">Destination: {selectedReservation.destination}</p>
                    <p className="text-slate-600 flex items-center gap-2">
                      <CalendarIcon className="w-3.5 h-3.5 text-slate-400" /> {selectedReservation.departure_date ? new Date(selectedReservation.departure_date).toLocaleDateString() : 'TBD'} to {selectedReservation.return_date ? new Date(selectedReservation.return_date).toLocaleDateString() : 'TBD'}
                    </p>
                    <p className="text-slate-600">Travelers Count: <span className="font-semibold text-slate-900">{selectedReservation.traveler_count || 1}</span></p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-amber-100 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" /> Financial Summary & Transaction Ledger
                  </h4>
                  <button
                    onClick={() => setIsPaymentModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Payment / Refund
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center py-2 bg-slate-50 rounded-lg">
                  <div>
                    <span className="text-[10px] uppercase font-medium text-slate-400">Total Amount</span>
                    <p className="text-lg font-bold text-slate-900">{selectedReservation.total_amount.toLocaleString()} {selectedReservation.currency}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-medium text-slate-400">Net Paid</span>
                    <p className="text-lg font-bold text-emerald-600">{selectedReservation.totalPaid.toLocaleString()} {selectedReservation.currency}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-medium text-slate-400">Balance Due</span>
                    <p className="text-lg font-bold text-slate-700">{selectedReservation.balance.toLocaleString()} {selectedReservation.currency}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-700">Ledger Transactions (booking_payments)</span>
                  {selectedReservation.resPayments.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-2">No transactions recorded yet.</p>
                  ) : (
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-400 uppercase text-[10px]">
                          <tr>
                            <th className="py-2 px-3">Type</th>
                            <th className="py-2 px-3">Date</th>
                            <th className="py-2 px-3">Method</th>
                            <th className="py-2 px-3">Status</th>
                            <th className="py-2 px-3 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedReservation.resPayments.map(pay => (
                            <tr key={pay.id}>
                              <td className="py-2 px-3 uppercase font-bold text-slate-700">{pay.transaction_type}</td>
                              <td className="py-2 px-3 text-slate-600">{new Date(pay.transaction_date || pay.created_at).toLocaleDateString()}</td>
                              <td className="py-2 px-3 capitalize text-slate-800">{pay.payment_method}</td>
                              <td className="py-2 px-3 capitalize text-slate-600">{pay.transaction_status}</td>
                              <td className={`py-2 px-3 text-right font-bold ${pay.transaction_type === 'refund' ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {pay.transaction_type === 'refund' ? '-' : '+'}{Number(pay.amount).toLocaleString()} {pay.currency}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                  <span className="font-semibold text-slate-700 block mb-1">Special Requests:</span>
                  <p className="text-slate-600">{selectedReservation.special_requests || 'None specified.'}</p>
                </div>
                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                  <span className="font-semibold text-slate-700 block mb-1">Internal Staff Notes:</span>
                  <p className="text-slate-600">{selectedReservation.internal_notes || 'None specified.'}</p>
                </div>
              </div>

            </div>

            <div className="flex items-center justify-end px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ADD PAYMENT MODAL */}
      {isPaymentModalOpen && selectedReservation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full border border-amber-100 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-base font-bold text-slate-900">Record Transaction — #{selectedReservation.booking_reference}</h3>
              <button 
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPayment} className="p-6 space-y-4">
              
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-xs text-amber-900 flex justify-between">
                <span>Remaining Balance Due:</span>
                <span className="font-bold">{selectedReservation.balance.toLocaleString()} {selectedReservation.currency}</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Transaction Type</label>
                <select
                  value={paymentData.transaction_type}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, transaction_type: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500 font-medium"
                >
                  <option value="payment">Payment (+)</option>
                  <option value="refund">Refund (-)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Amount ({selectedReservation.currency}) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Payment Method</label>
                <select
                  value={paymentData.payment_method}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, payment_method: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Transaction Status</label>
                <select
                  value={paymentData.transaction_status}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, transaction_status: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                >
                  <option value="completed">Completed (Immutable)</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Transaction Reference (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. TXN-998234"
                  value={paymentData.transaction_reference}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, transaction_reference: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  rows="2"
                  placeholder="Receipt / deposit notes..."
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-500 shadow-sm disabled:opacity-50"
                >
                  {formSubmitting ? 'Recording...' : 'Record Transaction'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* SQL MIGRATION MODAL WITH COPY BUTTON */}
      {isSqlModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-900 rounded-2xl max-w-4xl w-full border border-slate-700 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 text-slate-200">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-bold text-white">Migration 0002: Bookings Module SQL</h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(sqlMigrationCode);
                    setCopiedSql(true);
                    setTimeout(() => setCopiedSql(false), 3000);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-lg transition-all shadow-sm"
                >
                  {copiedSql ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedSql ? 'Copied to Clipboard!' : 'Copy SQL'}</span>
                </button>
                <button 
                  onClick={() => setIsSqlModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <pre className="text-xs font-mono text-slate-300 bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-x-auto whitespace-pre">
                {sqlMigrationCode}
              </pre>
            </div>

            <div className="flex items-center justify-end px-6 py-4 border-t border-slate-800 bg-slate-950">
              <button
                onClick={() => setIsSqlModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}