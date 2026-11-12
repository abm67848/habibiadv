import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Tag as TagIcon, 
  MessageSquare, 
  FileText, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  X, 
  Compass, 
  ShieldCheck,
  Clock,
  Trash2
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '../../../../context/index.jsx';

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [customer, setCustomer] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [tags, setTags] = useState([]);
  const [customerTagAssignments, setCustomerTagAssignments] = useState([]);
  const [bookingSummary, setBookingSummary] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Modals
  const [isInteractionModalOpen, setIsInteractionModalOpen] = useState(false);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);

  // Interaction Form
  const [interactionData, setInteractionData] = useState({
    interaction_type: 'call',
    subject: '',
    description: ''
  });

  // Document Form
  const [docData, setDocData] = useState({
    document_name: '',
    document_type: 'passport',
    storage_path: ''
  });

  const [selectedTagId, setSelectedTagId] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchCustomerDetails();
    }
  }, [id]);

  const fetchCustomerDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        customerRes,
        bookingsRes,
        interactionsRes,
        docsRes,
        tagsRes,
        assignmentsRes,
        summaryRes
      ] = await Promise.all([
        supabase.from('customers').select('*').eq('id', id).single(),
        supabase.from('bookings').select('*').eq('customer_id', id).order('created_at', { ascending: false }),
        supabase.from('customer_interactions').select('*').eq('customer_id', id).order('interaction_date', { ascending: false }),
        supabase.from('customer_documents').select('*').eq('customer_id', id).order('created_at', { ascending: false }),
        supabase.from('customer_tags').select('*').order('name', { ascending: true }),
        supabase.from('customer_tag_assignments').select('*').eq('customer_id', id),
        supabase.from('customer_booking_summary').select('*').eq('customer_id', id).maybeSingle()
      ]);

      if (customerRes.error) throw customerRes.error;

      setCustomer(customerRes.data);
      setBookings(bookingsRes.error ? [] : (bookingsRes.data || []));
      setInteractions(interactionsRes.error ? [] : (interactionsRes.data || []));
      setDocuments(docsRes.error ? [] : (docsRes.data || []));
      setTags(tagsRes.error ? [] : (tagsRes.data || []));
      setCustomerTagAssignments(assignmentsRes.error ? [] : (assignmentsRes.data || []));
      setBookingSummary(summaryRes.data || null);

    } catch (err) {
      console.error('Error fetching customer profile:', err);
      setError('Failed to load customer profile.');
    } finally {
      setLoading(false);
    }
  };

  const assignedTags = useMemo(() => {
    const assignedIds = customerTagAssignments.map(ta => ta.tag_id);
    return tags.filter(t => assignedIds.includes(t.id));
  }, [tags, customerTagAssignments]);

  const unassignedTags = useMemo(() => {
    const assignedIds = customerTagAssignments.map(ta => ta.tag_id);
    return tags.filter(t => !assignedIds.includes(t.id));
  }, [tags, customerTagAssignments]);

  const handleAddInteraction = async (e) => {
    e.preventDefault();
    if (!interactionData.subject) return;

    try {
      setFormSubmitting(true);
      const payload = {
        customer_id: id,
        interaction_type: interactionData.interaction_type,
        subject: interactionData.subject.trim(),
        description: interactionData.description.trim() || null,
        created_by: user?.id
      };

      const { error: err } = await supabase.from('customer_interactions').insert([payload]);
      if (err) throw err;

      setSuccessMessage('Interaction logged successfully!');
      setIsInteractionModalOpen(false);
      setInteractionData({ interaction_type: 'call', subject: '', description: '' });
      await fetchCustomerDetails();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error adding interaction:', err);
      setError('Failed to record interaction.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleAssignTag = async (e) => {
    e.preventDefault();
    if (!selectedTagId) return;

    try {
      setFormSubmitting(true);
      const payload = {
        customer_id: id,
        tag_id: selectedTagId,
        assigned_by: user?.id
      };

      const { error: err } = await supabase.from('customer_tag_assignments').insert([payload]);
      if (err) throw err;

      setSuccessMessage('Tag assigned successfully!');
      setIsTagModalOpen(false);
      setSelectedTagId('');
      await fetchCustomerDetails();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error assigning tag:', err);
      setError('Failed to assign tag.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleRemoveTag = async (tagId) => {
    try {
      const { error: err } = await supabase
        .from('customer_tag_assignments')
        .delete()
        .match({ customer_id: id, tag_id: tagId });

      if (err) throw err;
      setSuccessMessage('Tag removed.');
      await fetchCustomerDetails();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error removing tag:', err);
      setError('Failed to remove tag.');
    }
  };

  const handleAddDocument = async (e) => {
    e.preventDefault();
    if (!docData.document_name) return;

    try {
      setFormSubmitting(true);
      const payload = {
        customer_id: id,
        document_name: docData.document_name.trim(),
        document_type: docData.document_type,
        storage_path: `${id}/${docData.document_name}`,
        uploaded_by: user?.id
      };

      const { error: err } = await supabase.from('customer_documents').insert([payload]);
      if (err) throw err;

      setSuccessMessage('Document metadata recorded successfully!');
      setIsDocModalOpen(false);
      setDocData({ document_name: '', document_type: 'passport', storage_path: '' });
      await fetchCustomerDetails();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error adding document:', err);
      setError('Failed to record document.');
    } finally {
      setFormSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 min-h-screen flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-600 mb-2" />
        <span>Loading customer profile...</span>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-12 text-center text-slate-500 min-h-screen">
        <h2 className="text-xl font-bold text-slate-800">Customer not found</h2>
        <button onClick={() => navigate('/admin/customers')} className="mt-4 px-4 py-2 bg-amber-600 text-white rounded-lg text-xs">
          Back to Customers
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 bg-slate-50/50 min-h-screen">
      
      {/* Top Bar / Back */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate('/admin/customers')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-amber-600 bg-white border border-slate-200 px-3 py-2 rounded-lg shadow-xs transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Customers</span>
        </button>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
            {customer.customer_reference}
          </span>
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
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 text-2xl font-bold">
              {customer.first_name[0]}{customer.last_name[0]}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{customer.full_name}</h1>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-slate-400" /> {customer.phone}</span>
                <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-slate-400" /> {customer.email || 'No email'}</span>
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {customer.city || 'City TBD'}, {customer.country || 'Country TBD'}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsTagModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-all"
            >
              <TagIcon className="w-4 h-4" /> Assign Tag
            </button>
            <button
              onClick={() => setIsInteractionModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-all"
            >
              <MessageSquare className="w-4 h-4" /> Log Interaction
            </button>
            <button
              onClick={() => setIsDocModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-all"
            >
              <FileText className="w-4 h-4" /> Add Document
            </button>
          </div>
        </div>

        {/* Assigned Tags List */}
        <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-500 uppercase">Tags:</span>
          {assignedTags.length === 0 ? (
            <span className="text-xs text-slate-400 italic">No tags assigned.</span>
          ) : (
            assignedTags.map(tag => (
              <span 
                key={tag.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-white shadow-xs"
                style={{ backgroundColor: tag.color || '#3b82f6' }}
              >
                {tag.name}
                <button onClick={() => handleRemoveTag(tag.id)} className="hover:text-slate-200">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))
          )}
        </div>
      </div>

      {/* Grid Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-xl border border-amber-100 shadow-xs">
          <p className="text-xs font-medium text-slate-400 uppercase">Total Bookings</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">{bookingSummary?.total_bookings || 0}</h3>
        </div>
        <div className="bg-white p-5 rounded-xl border border-amber-100 shadow-xs">
          <p className="text-xs font-medium text-slate-400 uppercase">Confirmed Bookings</p>
          <h3 className="text-2xl font-bold text-emerald-600 mt-1">{bookingSummary?.confirmed_bookings || 0}</h3>
        </div>
        <div className="bg-white p-5 rounded-xl border border-amber-100 shadow-xs">
          <p className="text-xs font-medium text-slate-400 uppercase">Total Booking Value</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">{Number(bookingSummary?.total_booking_value || 0).toLocaleString()} MAD</h3>
        </div>
        <div className="bg-white p-5 rounded-xl border border-amber-100 shadow-xs">
          <p className="text-xs font-medium text-slate-400 uppercase">Outstanding Balance</p>
          <h3 className="text-2xl font-bold text-purple-600 mt-1">{Number(bookingSummary?.outstanding_balance || 0).toLocaleString()} MAD</h3>
        </div>
      </div>

      {/* Main Content Split: Bookings & Interactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Cols: Bookings & Documents */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Bookings Section */}
          <div className="bg-white rounded-2xl border border-amber-100 shadow-xs p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Compass className="w-4 h-4 text-amber-600" /> Customer Bookings ({bookings.length})
            </h3>
            {bookings.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4">No bookings recorded for this customer yet.</p>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Ref</th>
                      <th className="py-3 px-4">Destination</th>
                      <th className="py-3 px-4">Departure</th>
                      <th className="py-3 px-4 text-right">Total</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bookings.map(b => (
                      <tr key={b.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-mono font-bold text-amber-700">{b.booking_reference}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{b.destination || 'Trip'}</td>
                        <td className="py-3 px-4 text-slate-600">{new Date(b.departure_date).toLocaleDateString()}</td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">{Number(b.total_amount).toLocaleString()} {b.currency}</td>
                        <td className="py-3 px-4 capitalize text-slate-700">{b.booking_status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Documents Section */}
          <div className="bg-white rounded-2xl border border-amber-100 shadow-xs p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-600" /> Customer Documents ({documents.length})
            </h3>
            {documents.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4">No documents metadata recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {documents.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                    <div>
                      <p className="font-bold text-slate-900">{doc.document_name}</p>
                      <p className="text-[11px] text-slate-400 capitalize">Type: {doc.document_type} | Uploaded {new Date(doc.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 text-[11px] font-medium">Private Storage</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Col: CRM Interactions Timeline */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-amber-100 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-amber-600" /> CRM History
              </h3>
              <button
                onClick={() => setIsInteractionModalOpen(true)}
                className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                title="Add Interaction"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {interactions.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4">No interaction history recorded.</p>
            ) : (
              <div className="space-y-4">
                {interactions.map(item => (
                  <div key={item.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded text-[10px]">
                        {item.interaction_type}
                      </span>
                      <span className="text-[10px] text-slate-400">{new Date(item.interaction_date || item.created_at).toLocaleString()}</span>
                    </div>
                    <p className="font-bold text-slate-900 mt-1">{item.subject}</p>
                    {item.description && <p className="text-slate-600">{item.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ASSIGN TAG MODAL */}
      {isTagModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full border border-amber-100 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-base font-bold text-slate-900">Assign Tag to Customer</h3>
              <button onClick={() => setIsTagModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAssignTag} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Select Tag *</label>
                <select
                  required
                  value={selectedTagId}
                  onChange={(e) => setSelectedTagId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                >
                  <option value="">Select a tag...</option>
                  {unassignedTags.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsTagModalOpen(false)} className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg">
                  Cancel
                </button>
                <button type="submit" disabled={formSubmitting} className="px-5 py-2 text-xs font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-500 shadow-sm disabled:opacity-50">
                  {formSubmitting ? 'Assigning...' : 'Assign Tag'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LOG INTERACTION MODAL */}
      {isInteractionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full border border-amber-100 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-base font-bold text-slate-900">Log Interaction</h3>
              <button onClick={() => setIsInteractionModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddInteraction} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Interaction Type</label>
                <select
                  value={interactionData.interaction_type}
                  onChange={(e) => setInteractionData(prev => ({ ...prev, interaction_type: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500 font-medium"
                >
                  <option value="call">Call</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Email</option>
                  <option value="meeting">Meeting</option>
                  <option value="note">Note</option>
                  <option value="follow_up">Follow Up</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Subject *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Discussed summer tour packages"
                  value={interactionData.subject}
                  onChange={(e) => setInteractionData(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  rows="3"
                  placeholder="Detailed notes..."
                  value={interactionData.description}
                  onChange={(e) => setInteractionData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                ></textarea>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsInteractionModalOpen(false)} className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg">
                  Cancel
                </button>
                <button type="submit" disabled={formSubmitting} className="px-5 py-2 text-xs font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-500 shadow-sm disabled:opacity-50">
                  {formSubmitting ? 'Saving...' : 'Save Interaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD DOCUMENT MODAL */}
      {isDocModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full border border-amber-100 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-base font-bold text-slate-900">Record Document Metadata</h3>
              <button onClick={() => setIsDocModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddDocument} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Document Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Passport_Scan.pdf"
                  value={docData.document_name}
                  onChange={(e) => setDocData(prev => ({ ...prev, document_name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Document Type</label>
                <select
                  value={docData.document_type}
                  onChange={(e) => setDocData(prev => ({ ...prev, document_type: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                >
                  <option value="passport">Passport</option>
                  <option value="visa">Visa</option>
                  <option value="id_card">ID Card</option>
                  <option value="contract">Contract</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsDocModalOpen(false)} className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg">
                  Cancel
                </button>
                <button type="submit" disabled={formSubmitting} className="px-5 py-2 text-xs font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-500 shadow-sm disabled:opacity-50">
                  {formSubmitting ? 'Saving...' : 'Save Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}