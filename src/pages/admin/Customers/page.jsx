import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Search, 
  Plus, 
  Eye, 
  Phone, 
  Mail, 
  MapPin, 
  Tag as TagIcon, 
  Calendar, 
  DollarSign, 
  RefreshCw, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Copy, 
  Check,
  Filter,
  ArrowUpDown
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '../../../context/index.jsx';

export default function CustomersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [tags, setTags] = useState([]);
  const [tagAssignments, setTagAssignments] = useState([]);
  const [bookingSummaries, setBookingSummaries] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [tagFilter, setTagFilter] = useState('ALL');
  const [countryFilter, setCountryFilter] = useState('ALL');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isTagsModalOpen, setIsTagsModalOpen] = useState(false);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Form states for Create Customer
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    alternative_phone: '',
    date_of_birth: '',
    nationality: '',
    gender: '',
    country: '',
    city: '',
    address: '',
    preferred_language: 'fr',
    customer_source: 'direct',
    customer_status: 'active',
    notes: ''
  });

  // New Tag Form state
  const [newTagData, setNewTagData] = useState({ name: '', color: '#3b82f6', description: '' });
  const [formSubmitting, setFormSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        customersRes,
        tagsRes,
        assignmentsRes,
        summaryRes
      ] = await Promise.all([
        supabase.from('customers').select('*').order('created_at', { ascending: false }),
        supabase.from('customer_tags').select('*').order('name', { ascending: true }),
        supabase.from('customer_tag_assignments').select('*'),
        supabase.from('customer_booking_summary').select('*')
      ]);

      if (customersRes.error) throw customersRes.error;

      setCustomers(customersRes.data || []);
      setTags(tagsRes.error ? [] : (tagsRes.data || []));
      setTagAssignments(assignmentsRes.error ? [] : (assignmentsRes.data || []));
      setBookingSummaries(summaryRes.error ? [] : (summaryRes.data || []));

    } catch (err) {
      console.error('Error fetching CRM data:', err);
      setError('Failed to load customers. Please ensure migration 0003_customers_crm is applied.');
    } finally {
      setLoading(false);
    }
  };

  // Enriched customers with tags and booking summaries
  const enrichedCustomers = useMemo(() => {
    return customers.map(c => {
      const summary = bookingSummaries.find(s => s.customer_id === c.id) || {
        total_bookings: 0,
        confirmed_bookings: 0,
        total_booking_value: 0,
        total_paid: 0,
        outstanding_balance: 0
      };

      const assignedTagIds = tagAssignments.filter(ta => ta.customer_id === c.id).map(ta => ta.tag_id);
      const customerTags = tags.filter(t => assignedTagIds.includes(t.id));

      return {
        ...c,
        summary,
        customerTags
      };
    });
  }, [customers, tags, tagAssignments, bookingSummaries]);

  // Statistics
  const stats = useMemo(() => {
    const totalCustomers = enrichedCustomers.length;
    const activeCustomers = enrichedCustomers.filter(c => c.customer_status === 'active').length;
    const totalBookingsValue = enrichedCustomers.reduce((sum, c) => sum + Number(c.summary.total_booking_value || 0), 0);
    const totalOutstanding = enrichedCustomers.reduce((sum, c) => sum + Number(c.summary.outstanding_balance || 0), 0);

    return { totalCustomers, activeCustomers, totalBookingsValue, totalOutstanding };
  }, [enrichedCustomers]);

  // Unique countries for filter
  const uniqueCountries = useMemo(() => {
    const countries = new Set();
    enrichedCustomers.forEach(c => { if (c.country) countries.add(c.country); });
    return Array.from(countries);
  }, [enrichedCustomers]);

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    return enrichedCustomers.filter(c => {
      const matchesSearch = 
        (c.customer_reference && c.customer_reference.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.full_name && c.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.phone && c.phone.includes(searchQuery)) ||
        (c.city && c.city.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'ALL' || c.customer_status === statusFilter;
      const matchesCountry = countryFilter === 'ALL' || c.country === countryFilter;
      const matchesTag = tagFilter === 'ALL' || c.customerTags.some(t => t.id === tagFilter);

      return matchesSearch && matchesStatus && matchesCountry && matchesTag;
    });
  }, [enrichedCustomers, searchQuery, statusFilter, countryFilter, tagFilter]);

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!formData.first_name || !formData.last_name || !formData.phone) {
      alert('First name, last name, and phone number are required.');
      return;
    }

    try {
      setFormSubmitting(true);
      setError(null);

      const payload = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        full_name: `${formData.first_name.trim()} ${formData.last_name.trim()}`,
        email: formData.email ? formData.email.trim() : null,
        phone: formData.phone.trim(),
        alternative_phone: formData.alternative_phone || null,
        date_of_birth: formData.date_of_birth || null,
        nationality: formData.nationality || null,
        gender: formData.gender || null,
        country: formData.country || null,
        city: formData.city || null,
        address: formData.address || null,
        preferred_language: formData.preferred_language || 'fr',
        customer_source: formData.customer_source || null,
        customer_status: formData.customer_status || 'active',
        notes: formData.notes || null,
        created_by: user?.id
      };

      const { error: insertError } = await supabase.from('customers').insert([payload]);
      if (insertError) throw insertError;

      setSuccessMessage('Customer created successfully!');
      setIsCreateModalOpen(false);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        alternative_phone: '',
        date_of_birth: '',
        nationality: '',
        gender: '',
        country: '',
        city: '',
        address: '',
        preferred_language: 'fr',
        customer_source: 'direct',
        customer_status: 'active',
        notes: ''
      });

      await fetchData();
      setTimeout(() => setSuccessMessage(null), 4000);

    } catch (err) {
      console.error('Error creating customer:', err);
      setError('Failed to create customer: ' + (err.message || 'Unknown error'));
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleCreateTag = async (e) => {
    e.preventDefault();
    if (!newTagData.name) return;

    try {
      setFormSubmitting(true);
      const { error: tagError } = await supabase.from('customer_tags').insert([newTagData]);
      if (tagError) throw tagError;

      setSuccessMessage('Tag created successfully!');
      setNewTagData({ name: '', color: '#3b82f6', description: '' });
      await fetchData();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error creating tag:', err);
      setError('Failed to create tag: ' + err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 className="w-3 h-3" /> Active</span>;
      case 'inactive':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">Inactive</span>;
      case 'archived':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">Archived</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200">{status}</span>;
    }
  };

  const sqlMigrationCode = `-- ============================================================================
-- Migration: 0003_customers_crm
-- Description: Customers / CRM module full schema
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE SEQUENCE IF NOT EXISTS public.customer_ref_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_customer_reference()
RETURNS TEXT LANGUAGE sql VOLATILE AS $$
    SELECT 'CUS-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('public.customer_ref_seq')::TEXT, 6, '0');
$$;

CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_reference TEXT UNIQUE NOT NULL DEFAULT public.generate_customer_reference(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    alternative_phone TEXT,
    date_of_birth DATE,
    nationality TEXT,
    gender TEXT,
    country TEXT,
    city TEXT,
    address TEXT,
    preferred_language TEXT DEFAULT 'fr',
    customer_source TEXT,
    customer_status TEXT NOT NULL DEFAULT 'active',
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.customer_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    color TEXT,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.customer_tag_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.customer_tags(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT customer_tag_assignments_unique UNIQUE (customer_id, tag_id)
);

CREATE TABLE IF NOT EXISTS public.customer_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    interaction_type TEXT NOT NULL,
    subject TEXT,
    description TEXT,
    interaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.customer_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    document_name TEXT NOT NULL,
    document_type TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    mime_type TEXT,
    file_size BIGINT,
    uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`;

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 bg-slate-50/50 min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Customers CRM (Migration 0003)</h1>
          <p className="text-sm text-slate-500 mt-1">Manage client portfolios, communication history, tags, and booking summaries.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSqlModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-all shadow-xs"
          >
            <FileText className="w-4 h-4 text-amber-600" />
            <span>View SQL Schema</span>
          </button>
          <button 
            onClick={() => setIsTagsModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-all shadow-xs"
          >
            <TagIcon className="w-4 h-4 text-blue-600" />
            <span>Manage Tags</span>
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
            <span>New Customer</span>
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

      {/* Overview Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-xl border border-amber-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Customers</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.totalCustomers}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-amber-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Active Portfolio</p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">{stats.activeCustomers}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-amber-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Booking Volume</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.totalBookingsValue.toLocaleString()} MAD</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-amber-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Outstanding Balance</p>
            <h3 className="text-2xl font-bold text-purple-600 mt-1">{stats.totalOutstanding.toLocaleString()} MAD</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search and Filters Section */}
      <div className="bg-white p-5 rounded-xl border border-amber-100 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Search by CUS ref, name, email, phone, or city..."
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
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div>
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Tags</option>
              {tags.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-medium text-slate-500 uppercase">Country:</span>
            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Countries</option>
              {uniqueCountries.map((c, i) => (
                <option key={i} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {(searchQuery || statusFilter !== 'ALL' || countryFilter !== 'ALL' || tagFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
                setCountryFilter('ALL');
                setTagFilter('ALL');
              }}
              className="text-xs font-medium text-amber-600 hover:text-amber-700 underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-xl border border-amber-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Ref</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Contact</th>
                <th className="py-3.5 px-4">Location</th>
                <th className="py-3.5 px-4">Tags</th>
                <th className="py-3.5 px-4 text-center">Bookings</th>
                <th className="py-3.5 px-4 text-right">Total Value</th>
                <th className="py-3.5 px-4 text-right">Balance Due</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="10" className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-600" />
                    Loading customers from Supabase...
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No customers found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-amber-50/30 transition-colors">
                    
                    <td className="py-3.5 px-4 font-mono font-semibold text-amber-700">
                      {c.customer_reference}
                    </td>

                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      <div className="font-bold text-slate-900">{c.full_name}</div>
                      <div className="text-[11px] text-slate-400">Lang: {c.preferred_language?.toUpperCase()} | Src: {c.customer_source || 'Direct'}</div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      <div className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-slate-400" /> {c.phone}</div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400"><Mail className="w-3 h-3 text-slate-400" /> {c.email || 'No email'}</div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      <div>{c.city || '—'}</div>
                      <div className="text-[11px] text-slate-400">{c.country || '—'}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-[180px]">
                        {c.customerTags.length === 0 ? (
                          <span className="text-[10px] text-slate-400 italic">No tags</span>
                        ) : (
                          c.customerTags.map(tag => (
                            <span 
                              key={tag.id} 
                              className="px-2 py-0.5 rounded text-[10px] font-semibold text-white shadow-xs"
                              style={{ backgroundColor: tag.color || '#3b82f6' }}
                            >
                              {tag.name}
                            </span>
                          ))
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                      {c.summary.total_bookings}
                    </td>

                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      {Number(c.summary.total_booking_value || 0).toLocaleString()} MAD
                    </td>

                    <td className="py-3.5 px-4 text-right font-semibold text-purple-600">
                      {Number(c.summary.outstanding_balance || 0).toLocaleString()} MAD
                    </td>

                    <td className="py-3.5 px-4">
                      {getStatusBadge(c.customer_status)}
                    </td>

                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => navigate(`/admin/customers/${c.id}`)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors"
                        title="View Customer Profile"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Profile</span>
                      </button>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE CUSTOMER MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-amber-100 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-base font-bold text-slate-900">Create New CRM Customer (Migration 0003)</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="+212 600000000"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="client@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    placeholder="Casablanca, Rabat..."
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Country</label>
                  <input
                    type="text"
                    placeholder="Morocco, France..."
                    value={formData.country}
                    onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Preferred Language</label>
                  <select
                    value={formData.preferred_language}
                    onChange={(e) => setFormData(prev => ({ ...prev, preferred_language: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                  >
                    <option value="fr">French (fr)</option>
                    <option value="en">English (en)</option>
                    <option value="ar">Arabic (ar)</option>
                    <option value="es">Spanish (es)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Customer Source</label>
                  <input
                    type="text"
                    placeholder="Website, Instagram, Referral..."
                    value={formData.customer_source}
                    onChange={(e) => setFormData(prev => ({ ...prev, customer_source: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
                  <select
                    value={formData.customer_status}
                    onChange={(e) => setFormData(prev => ({ ...prev, customer_status: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  rows="2"
                  placeholder="Additional client notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg">
                  Cancel
                </button>
                <button type="submit" disabled={formSubmitting} className="px-5 py-2 text-xs font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-500 shadow-sm disabled:opacity-50">
                  {formSubmitting ? 'Creating...' : 'Save Customer'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MANAGE TAGS MODAL */}
      {isTagsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-amber-100 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-base font-bold text-slate-900">Manage Customer Tags</h3>
              <button onClick={() => setIsTagsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              
              <form onSubmit={handleCreateTag} className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600">Create New Tag</h4>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Tag Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. VIP, Corporate, Family"
                      value={newTagData.name}
                      onChange={(e) => setNewTagData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Badge Color</label>
                    <input
                      type="color"
                      value={newTagData.color}
                      onChange={(e) => setNewTagData(prev => ({ ...prev, color: e.target.value }))}
                      className="w-full h-8 bg-white border border-slate-200 rounded-lg px-1 py-1 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button type="submit" disabled={formSubmitting} className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-500 shadow-xs">
                    {formSubmitting ? 'Adding...' : 'Add Tag'}
                  </button>
                </div>
              </form>

              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Existing Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {tags.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No tags created yet.</p>
                  ) : (
                    tags.map(t => (
                      <span 
                        key={t.id} 
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-white shadow-xs"
                        style={{ backgroundColor: t.color || '#3b82f6' }}
                      >
                        {t.name}
                      </span>
                    ))
                  )}
                </div>
              </div>

            </div>

            <div className="flex items-center justify-end px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <button onClick={() => setIsTagsModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg">
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* SQL MIGRATION MODAL */}
      {isSqlModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-900 rounded-2xl max-w-4xl w-full border border-slate-700 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 text-slate-200">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-bold text-white">Migration 0003: Customers CRM Schema</h3>
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
                  <span>{copiedSql ? 'Copied!' : 'Copy SQL'}</span>
                </button>
                <button onClick={() => setIsSqlModalOpen(false)} className="p-1 text-slate-400 hover:text-white rounded-lg">
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