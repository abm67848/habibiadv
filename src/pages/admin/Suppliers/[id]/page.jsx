import { useAppSettings, translate } from '@/context/index.jsx';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Building2, ArrowLeft, Edit, CheckCircle2, MapPin, Mail, Phone, Globe, FileText, Users, Tag,
  Calendar, Upload, Download, Trash2, Plus, ExternalLink, AlertTriangle, Briefcase, Compass, Star,
  Plane, Car, Utensils, UserCheck, Clock, X, Bed, Bus, Flag, Ban, Power,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client.jsx';

/* ------------------------------------------------------------------ */
/*  Constants & helpers                                                */
/* ------------------------------------------------------------------ */
const TYPE_ICONS = {
  hotel: Building2, riad: Bed, resort: Star, restaurant: Utensils, airline: Plane,
  car_rental: Car, transport_company: Bus, local_guide: Flag, activity_provider: Compass,
};

const DETAIL_TABLES = {
  hotel: 'supplier_hotels',
  riad: 'supplier_riads',
  resort: 'supplier_hotels',
  airline: 'supplier_airlines',
  car_rental: 'supplier_car_rentals',
  restaurant: 'supplier_restaurants',
  transport_company: 'supplier_transport',
  local_guide: 'supplier_guides',
  guide: 'supplier_guides',
  activity_provider: 'supplier_activities',
};

const STATUS = {
  active: { dot: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  pending: { dot: 'bg-amber-500', pill: 'bg-amber-50 text-amber-700 ring-amber-200' },
  blacklisted: { dot: 'bg-rose-500', pill: 'bg-rose-50 text-rose-700 ring-rose-200' },
  inactive: { dot: 'bg-slate-400', pill: 'bg-slate-100 text-slate-600 ring-slate-200' },
  expired: { dot: 'bg-rose-500', pill: 'bg-rose-50 text-rose-700 ring-rose-200' },
  pending_renewal: { dot: 'bg-amber-500', pill: 'bg-amber-50 text-amber-700 ring-amber-200' },
  terminated: { dot: 'bg-slate-400', pill: 'bg-slate-100 text-slate-600 ring-slate-200' },
};

const EMPTY_SERVICE = { service_name: '', service_category: 'accommodation', description: '', unit: 'per_night', base_price: '', currency: 'MAD', status: 'active' };
const EMPTY_CONTACT = { full_name: '', position: '', email: '', phone: '', is_primary: false, notes: '' };
const EMPTY_LOCATION = { location_name: '', country: '', city: '', address: '', latitude: '', longitude: '', notes: '' };
const EMPTY_CONTRACT = { contract_reference: '', contract_type: 'Master Service Agreement', start_date: '', end_date: '', payment_terms: 'Net 30', currency: 'MAD', status: 'active', notes: '' };

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : '—');
const daysUntil = (d) => Math.ceil((new Date(d) - new Date()) / 86400000);
const label = (s) => String(s || '').replace(/_/g, ' ');

const inputCls =
  'mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 hover:border-slate-300 focus:border-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-500/15';

/* ------------------------------------------------------------------ */
/*  Shared UI                                                          */
/* ------------------------------------------------------------------ */
function Pill({ status }) {
  const s = STATUS[status] || STATUS.inactive;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize ring-1 ring-inset ${s.pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {label(status) || 'unknown'}
    </span>
  );
}

function Card({ icon: Ic, title, children, className = '', tone = 'white' }) {
  const t = tone === 'amber' ? 'border-amber-200/70 bg-amber-50/60' : 'border-slate-200 bg-white';
  return (
    <section className={`rounded-2xl border p-5 shadow-sm ${t} ${className}`}>
      {title && (
        <h3 className="mb-4 flex items-center gap-2.5 text-sm font-semibold text-slate-900">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-100/70 text-amber-600 ring-1 ring-inset ring-amber-200">
            <Ic aria-hidden="true" className="h-4 w-4" />
          </span>
          {title}
        </h3>
      )}
      {children}
    </section>
  );
}

function Info({ label: l, children, mono }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-slate-400">{l}</dt>
      <dd className={`mt-0.5 break-words text-sm font-medium text-slate-800 ${mono ? 'font-mono text-amber-700' : ''}`}>{children || '—'}</dd>
    </div>
  );
}

function Field({ label: l, required, children, className = '' }) {
  return (
    <label className={`block text-sm font-medium text-slate-700 ${className}`}>
      {l}{required && <span className="ml-0.5 text-red-500">{translate('*')}</span>}
      {children}
    </label>
  );
}

function Modal({ title, subtitle, onClose, onSubmit, submitLabel, busy, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <form
        onSubmit={onSubmit}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 p-5">{children}</div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">{translate('Cancel')}</button>
          <button type="submit" disabled={busy} className="rounded-lg bg-amber-500 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-600 disabled:opacity-60">
            {submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

function PrimaryButton({ icon: Ic, children, ...props }) {
  return (
    <button
      type="button"
      {...props}
      className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm ring-1 ring-inset ring-amber-600/20 transition hover:bg-amber-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-500/30"
    >
      <Ic aria-hidden="true" className="h-4 w-4" /> {children}
    </button>
  );
}

function IconBtn({ icon: Ic, danger, ...props }) {
  return (
    <button
      type="button"
      {...props}
      className={`rounded-lg p-1.5 transition ${danger ? 'text-slate-400 hover:bg-rose-50 hover:text-rose-600' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
    >
      <Ic aria-hidden="true" className="h-4 w-4" />
    </button>
  );
}

function TabHeader({ title, text, action }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500">{text}</p>
      </div>
      {action}
    </div>
  );
}

/* Graphic empty state: layered rings around an icon, with an action */
function EmptyState({ icon: Ic, title, text, actionLabel, onAction, actionIcon = Plus }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <div className="relative mx-auto grid h-28 w-28 place-items-center" aria-hidden="true">
        <span className="absolute inset-0 rounded-full border border-dashed border-amber-300" />
        <span className="absolute inset-3 rounded-full bg-amber-50" />
        <span className="absolute inset-7 rounded-full bg-amber-100" />
        <Ic className="relative h-8 w-8 text-amber-600" strokeWidth={1.5} />
        <span className="absolute -right-1 top-3 h-3 w-3 rounded-full bg-amber-400" />
        <span className="absolute -left-2 bottom-5 h-2 w-2 rounded-full bg-amber-200" />
        <span className="absolute bottom-0 right-4 h-2.5 w-2.5 rounded-full bg-slate-200" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">{text}</p>
      {actionLabel && (
        <div className="mt-5 flex justify-center">
          <PrimaryButton icon={actionIcon} onClick={onAction}>{actionLabel}</PrimaryButton>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function SupplierDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [supplier, setSupplier] = useState(null);
  const [categoryDetails, setCategoryDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const [connectedPackages, setConnectedPackages] = useState([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [packageError, setPackageError] = useState('');

  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [serviceForm, setServiceForm] = useState(EMPTY_SERVICE);

  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [contactForm, setContactForm] = useState(EMPTY_CONTACT);

  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [locationForm, setLocationForm] = useState(EMPTY_LOCATION);

  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [docFile, setDocFile] = useState(null);
  const [docType, setDocType] = useState('contract');
  const [docName, setDocName] = useState('');
  const [docExpiry, setDocExpiry] = useState('');
  const [docNotes, setDocNotes] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const [contractModalOpen, setContractModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState(null);
  const [contractForm, setContractForm] = useState(EMPTY_CONTRACT);

  /* ---------------- data ---------------- */
  const fetchSupplierData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [supplierRes, servicesRes, contactsRes, locationsRes, documentsRes, contractsRes, logsRes] = await Promise.all([
        supabase.from('suppliers').select('*').eq('id', id).single(),
        supabase.from('supplier_services').select('*').eq('supplier_id', id).order('created_at', { ascending: false }),
        supabase.from('supplier_contacts').select('*').eq('supplier_id', id).order('is_primary', { ascending: false }),
        supabase.from('supplier_locations').select('*').eq('supplier_id', id),
        supabase.from('supplier_documents').select('*').eq('supplier_id', id).order('created_at', { ascending: false }),
        supabase.from('supplier_contracts').select('*').eq('supplier_id', id).order('created_at', { ascending: false }),
        supabase.from('supplier_activity_logs').select('*').eq('supplier_id', id).order('created_at', { ascending: false }),
      ]);

      if (supplierRes.error) throw supplierRes.error;

      let detailData = {};
      const detailTable = DETAIL_TABLES[supplierRes.data.supplier_type];
      if (detailTable) {
        const detailRes = await supabase.from(detailTable).select('*').eq('supplier_id', id).maybeSingle();
        if (!detailRes.error && detailRes.data) detailData = detailRes.data;
      }

      setLoadingPackages(true);
      let connectedOffers = [];
      try {
        setPackageError('');
        const packageRelations = [
          ['offer_accommodations', 'Accommodation'],
          ['offer_transports', 'Transport'],
          ['offer_activities', 'Activity'],
          ['offer_costs', 'Cost'],
        ];
        const relationResults = await Promise.all(
          packageRelations.map(async ([table, type]) => {
            const { data, error } = await supabase.from(table).select('offer_id').eq('supplier_id', id);
            if (error) throw error;
            return (data || []).map(({ offer_id }) => ({ offer_id, type }));
          }),
        );
        const packageUsage = new Map();
        relationResults.flat().forEach(({ offer_id, type }) => {
          if (!packageUsage.has(offer_id)) packageUsage.set(offer_id, new Set());
          packageUsage.get(offer_id).add(type);
        });

        const offerIds = [...packageUsage.keys()];
        if (offerIds.length) {
          const { data, error } = await supabase
            .from('offers')
            .select('id, reference, public_title, internal_title, status, is_public, destination_country, package_category, starting_price, default_currency, cover_image_url')
            .in('id', offerIds)
            .order('created_at', { ascending: false });
          if (error) throw error;
          connectedOffers = (data || []).map((offer) => ({
            ...offer,
            supplierUsage: [...(packageUsage.get(offer.id) || [])],
          }));
        }
      } catch (packageFetchError) {
        console.error('Error fetching packages connected to supplier:', packageFetchError);
        setPackageError(packageFetchError.message || 'Failed to load connected packages.');
      }

      setSupplier({
        ...supplierRes.data,
        supplier_services: servicesRes.data || [],
        supplier_contacts: contactsRes.data || [],
        supplier_locations: locationsRes.data || [],
        supplier_documents: documentsRes.data || [],
        supplier_contracts: contractsRes.data || [],
        supplier_activity_logs: logsRes.data || [],
      });
      setCategoryDetails(detailData);
      setConnectedPackages(connectedOffers);
    } catch (err) {
      console.error('Error fetching supplier details:', err);
      setError(err.message || 'Failed to load supplier details.');
    } finally {
      setLoading(false);
      setLoadingPackages(false);
    }
  };

  useEffect(() => {
    if (id) fetchSupplierData();
  }, [id]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = (message, tone = 'success') => setToast({ message, tone });
  const fail = (prefix, err) => showToast(`${prefix}: ${err.message || err}`, 'error');

  /* ---------------- supplier actions ---------------- */
  const handleStatusChange = async (newStatus) => {
    try {
      const { error } = await supabase.from('suppliers').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      showToast(`Supplier status updated to ${newStatus}`);
      fetchSupplierData();
    } catch (err) { fail('Error updating status', err); }
  };

  const handleDeleteSupplier = async () => {
    if (!confirm('Are you sure you want to delete (soft delete) this supplier?')) return;
    try {
      const { error } = await supabase.from('suppliers').update({ deleted_at: new Date().toISOString(), status: 'inactive' }).eq('id', id);
      if (error) throw error;
      navigate('/admin/suppliers');
    } catch (err) { fail('Error deleting supplier', err); }
  };

  /* ---------------- generic save/delete ---------------- */
  const save = async ({ table, editing, payload, okAdd, okEdit, close, reset, failPrefix }) => {
    try {
      const res = editing
        ? await supabase.from(table).update(payload).eq('id', editing.id)
        : await supabase.from(table).insert([payload]);
      if (res.error) throw res.error;
      showToast(editing ? okEdit : okAdd);
      close(false);
      reset();
      fetchSupplierData();
    } catch (err) { fail(failPrefix, err); }
  };

  const remove = async (table, rowId, question, okMsg, failPrefix) => {
    if (!confirm(question)) return;
    try {
      const { error } = await supabase.from(table).delete().eq('id', rowId);
      if (error) throw error;
      showToast(okMsg);
      fetchSupplierData();
    } catch (err) { fail(failPrefix, err); }
  };

  /* ---------------- services ---------------- */
  const openService = (service = null) => {
    setEditingService(service);
    setServiceForm(
      service
        ? {
            service_name: service.service_name,
            service_category: service.service_category,
            description: service.description || '',
            unit: service.unit || 'per_item',
            base_price: service.base_price || '',
            currency: service.currency,
            status: service.status,
          }
        : { ...EMPTY_SERVICE, currency: supplier.preferred_currency || 'MAD' },
    );
    setServiceModalOpen(true);
  };

  const handleServiceSubmit = (e) => {
    e.preventDefault();
    save({
      table: 'supplier_services',
      editing: editingService,
      payload: {
        supplier_id: id,
        service_name: serviceForm.service_name,
        service_category: serviceForm.service_category,
        description: serviceForm.description || null,
        unit: serviceForm.unit || null,
        base_price: serviceForm.base_price === '' || isNaN(serviceForm.base_price) ? null : Number(serviceForm.base_price),
        currency: serviceForm.currency || 'MAD',
        status: serviceForm.status,
      },
      okAdd: 'Service added successfully',
      okEdit: 'Service updated successfully',
      close: setServiceModalOpen,
      reset: () => { setEditingService(null); setServiceForm(EMPTY_SERVICE); },
      failPrefix: 'Error saving service',
    });
  };

  /* ---------------- contacts ---------------- */
  const openContact = (contact = null) => {
    setEditingContact(contact);
    setContactForm(
      contact
        ? {
            full_name: contact.full_name,
            position: contact.position || '',
            email: contact.email || '',
            phone: contact.phone || '',
            is_primary: contact.is_primary,
            notes: contact.notes || '',
          }
        : EMPTY_CONTACT,
    );
    setContactModalOpen(true);
  };

  const handleContactSubmit = (e) => {
    e.preventDefault();
    save({
      table: 'supplier_contacts',
      editing: editingContact,
      payload: { supplier_id: id, ...contactForm },
      okAdd: 'Contact added',
      okEdit: 'Contact updated',
      close: setContactModalOpen,
      reset: () => { setEditingContact(null); setContactForm(EMPTY_CONTACT); },
      failPrefix: 'Error saving contact',
    });
  };

  const handleSetPrimaryContact = async (contactId) => {
    try {
      await supabase.from('supplier_contacts').update({ is_primary: false }).eq('supplier_id', id);
      const { error } = await supabase.from('supplier_contacts').update({ is_primary: true }).eq('id', contactId);
      if (error) throw error;
      showToast('Primary contact updated');
      fetchSupplierData();
    } catch (err) { fail('Error setting primary contact', err); }
  };

  /* ---------------- locations ---------------- */
  const openLocation = (loc = null) => {
    setEditingLocation(loc);
    setLocationForm(
      loc
        ? {
            location_name: loc.location_name,
            country: loc.country,
            city: loc.city,
            address: loc.address || '',
            latitude: loc.latitude || '',
            longitude: loc.longitude || '',
            notes: loc.notes || '',
          }
        : { ...EMPTY_LOCATION, country: supplier.country || '', city: supplier.city || '' },
    );
    setLocationModalOpen(true);
  };

  const handleLocationSubmit = (e) => {
    e.preventDefault();
    save({
      table: 'supplier_locations',
      editing: editingLocation,
      payload: {
        supplier_id: id,
        ...locationForm,
        latitude: locationForm.latitude ? Number(locationForm.latitude) : null,
        longitude: locationForm.longitude ? Number(locationForm.longitude) : null,
      },
      okAdd: 'Location added',
      okEdit: 'Location updated',
      close: setLocationModalOpen,
      reset: () => { setEditingLocation(null); setLocationForm(EMPTY_LOCATION); },
      failPrefix: 'Error saving location',
    });
  };

  /* ---------------- documents ---------------- */
  const handleDocumentUpload = async (e) => {
    e.preventDefault();
    if (!docFile) return showToast('Please select a file.', 'error');
    setUploadingDoc(true);
    try {
      const fileExt = docFile.name.split('.').pop();
      const filePath = `${id}/${Math.random().toString(36).substring(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('supplier-documents').upload(filePath, docFile);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from('supplier_documents').insert([{
        supplier_id: id,
        document_type: docType,
        document_name: docName || docFile.name,
        storage_path: filePath,
        expiry_date: docExpiry || null,
        notes: docNotes || null,
      }]);
      if (dbError) throw dbError;

      showToast('Document uploaded securely');
      setDocumentModalOpen(false);
      setDocFile(null); setDocName(''); setDocExpiry(''); setDocNotes('');
      fetchSupplierData();
    } catch (err) { fail('Error uploading document', err); }
    finally { setUploadingDoc(false); }
  };

  const handleDeleteDocument = async (docId, storagePath) => {
    if (!confirm('Delete document?')) return;
    try {
      await supabase.storage.from('supplier-documents').remove([storagePath]);
      const { error } = await supabase.from('supplier_documents').delete().eq('id', docId);
      if (error) throw error;
      showToast('Document deleted');
      fetchSupplierData();
    } catch (err) { fail('Error deleting document', err); }
  };

  const handleDownloadDoc = async (storagePath) => {
    try {
      const { data, error } = await supabase.storage.from('supplier-documents').createSignedUrl(storagePath, 60);
      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (err) { fail('Error getting signed URL', err); }
  };

  /* ---------------- contracts ---------------- */
  const openContract = (contract = null) => {
    setEditingContract(contract);
    setContractForm(
      contract
        ? {
            contract_reference: contract.contract_reference,
            contract_type: contract.contract_type,
            start_date: contract.start_date,
            end_date: contract.end_date,
            payment_terms: contract.payment_terms || 'Net 30',
            currency: contract.currency,
            status: contract.status,
            notes: contract.notes || '',
          }
        : {
            ...EMPTY_CONTRACT,
            contract_reference: `CTR-${Math.floor(1000 + Math.random() * 9000)}`,
            currency: supplier.preferred_currency || 'MAD',
          },
    );
    setContractModalOpen(true);
  };

  const handleContractSubmit = (e) => {
    e.preventDefault();
    save({
      table: 'supplier_contracts',
      editing: editingContract,
      payload: { supplier_id: id, ...contractForm },
      okAdd: 'Contract registered',
      okEdit: 'Contract updated',
      close: setContractModalOpen,
      reset: () => { setEditingContract(null); setContractForm(EMPTY_CONTRACT); },
      failPrefix: 'Error saving contract',
    });
  };

  /* ---------------- loading / error ---------------- */
  if (loading && !supplier) {
    return (
      <div className="mx-auto max-w-7xl animate-pulse space-y-5 p-4 sm:p-6" role="status" aria-label="Loading supplier">
        <div className="h-4 w-32 rounded bg-slate-100" />
        <div className="h-44 rounded-2xl bg-slate-100" />
        <div className="h-10 rounded-xl bg-slate-100" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-24 rounded-2xl bg-slate-100" />)}
        </div>
      </div>
    );
  }

  if (error || !supplier) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-200">
          <AlertTriangle aria-hidden="true" className="h-8 w-8" />
        </span>
        <h2 className="mt-4 text-xl font-bold text-slate-900">{translate('Supplier not found')}</h2>
        <p className="mt-1.5 text-sm text-slate-500">{error || 'The requested supplier could not be loaded.'}</p>
        <button onClick={() => navigate('/admin/suppliers')} className="mt-6 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600">{translate('Back to suppliers')}</button>
      </div>
    );
  }

  /* ---------------- derived ---------------- */
  const TypeIcon = TYPE_ICONS[supplier.supplier_type] || Tag;
  const primaryContact = supplier.supplier_contacts.find((c) => c.is_primary) || supplier.supplier_contacts[0];
  const activeServicesCount = supplier.supplier_services.filter((s) => s.status === 'active').length;
  const activeContract = supplier.supplier_contracts.find((c) => c.status === 'active');
  const lastLog = supplier.supplier_activity_logs[0];
  const detailEntries = Object.entries(categoryDetails).filter(
    ([k, v]) => !['id', 'supplier_id', 'created_at', 'updated_at'].includes(k) && v !== null && v !== '',
  );
  const notes = supplier.internal_notes || supplier.notes;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Building2 },
    { id: 'services', label: 'Services & rates', icon: Tag, count: supplier.supplier_services.length },
    { id: 'contacts', label: 'Contacts', icon: Users, count: supplier.supplier_contacts.length },
    { id: 'locations', label: 'Locations', icon: MapPin, count: supplier.supplier_locations.length },
    { id: 'documents', label: 'Documents', icon: FileText, count: supplier.supplier_documents.length },
    { id: 'contracts', label: 'Contracts', icon: Briefcase, count: supplier.supplier_contracts.length },
    { id: 'packages', label: 'Packages', icon: Compass, count: connectedPackages.length },
    { id: 'history', label: 'Activity', icon: Clock, count: supplier.supplier_activity_logs.length },
  ];

  const kpis = [
    { label: 'Total services', value: supplier.supplier_services.length, icon: Tag, tone: 'bg-slate-100 text-slate-600' },
    { label: 'Active services', value: activeServicesCount, icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-600' },
    { label: 'Linked packages', value: connectedPackages.length, icon: Compass, tone: 'bg-amber-50 text-amber-600' },
    { label: 'Contract', value: activeContract ? 'Active' : 'None', icon: Briefcase, tone: 'bg-indigo-50 text-indigo-600' },
    { label: 'Last activity', value: lastLog ? fmtDate(lastLog.created_at) : 'None yet', icon: Clock, tone: 'bg-slate-100 text-slate-600', small: true },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 pb-16 sm:p-6 sm:pb-16">
      {/* Toast */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-[60] flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-xl ${
            toast.tone === 'error' ? 'bg-rose-600 text-white' : 'bg-slate-900 text-white'
          }`}
        >
          {toast.tone === 'error' ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
          <span className="max-w-xs">{toast.message}</span>
          <button type="button" onClick={() => setToast(null)} aria-label="Dismiss" className="rounded p-0.5 hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
        <Link to="/admin/suppliers" className="inline-flex items-center gap-1.5 font-medium text-slate-500 hover:text-slate-900">
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />{translate('Suppliers')}</Link>
        <span className="text-slate-300">{translate('/')}</span>
        <span className="truncate font-medium text-slate-800">{supplier.name}</span>
      </nav>

      {/* Header */}
      <header className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-20 bg-gradient-to-r from-amber-500 to-amber-400" />
        <div className="px-5 pb-5 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="-mt-9 flex items-end gap-4">
              <div className="grid h-[72px] w-[72px] shrink-0 place-items-center rounded-2xl bg-white text-3xl font-bold text-amber-600 shadow-md ring-4 ring-white">
                {supplier.name.charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleStatusChange(supplier.status === 'active' ? 'inactive' : 'active')}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-medium transition ${
                  supplier.status === 'active'
                    ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    : 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                <Power aria-hidden="true" className="h-4 w-4" />
                {supplier.status === 'active' ? 'Deactivate' : 'Activate'}
              </button>
              {supplier.status !== 'blacklisted' ? (
                <button onClick={() => handleStatusChange('blacklisted')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100">
                  <Ban aria-hidden="true" className="h-4 w-4" />{translate('Blacklist')}</button>
              ) : (
                <button onClick={() => handleStatusChange('active')}
                  className="rounded-lg border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100">{translate('Remove from blacklist')}</button>
              )}
              <button onClick={handleDeleteSupplier} title="Delete supplier" aria-label="Delete supplier"
                className="rounded-lg border border-slate-200 p-2.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600">
                <Trash2 aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{supplier.name}</h1>
            <Pill status={supplier.status} />
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1.5 font-medium capitalize text-amber-700">
              <TypeIcon aria-hidden="true" className="h-4 w-4" /> {label(supplier.supplier_type)}
            </span>
            {supplier.supplier_code && <span className="font-mono text-slate-400">· {supplier.supplier_code}</span>}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-600">
            {(supplier.city || supplier.country) && (
              <span className="inline-flex items-center gap-1.5"><MapPin aria-hidden="true" className="h-4 w-4 text-slate-400" />{[supplier.city, supplier.country].filter(Boolean).join(', ')}</span>
            )}
            {supplier.email && (
              <a href={`mailto:${supplier.email}`} className="inline-flex items-center gap-1.5 hover:text-amber-700"><Mail aria-hidden="true" className="h-4 w-4 text-slate-400" />{supplier.email}</a>
            )}
            {supplier.phone && (
              <a href={`tel:${supplier.phone}`} className="inline-flex items-center gap-1.5 hover:text-amber-700"><Phone aria-hidden="true" className="h-4 w-4 text-slate-400" />{supplier.phone}</a>
            )}
            {supplier.website && (
              <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-medium text-amber-700 hover:underline">
                <Globe aria-hidden="true" className="h-4 w-4" /> Website <ExternalLink aria-hidden="true" className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div role="tablist" aria-label="Supplier sections" className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        {tabs.map((tab) => {
          const on = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={on}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-500/20 ${
                on ? 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <tab.icon aria-hidden="true" className={`h-4 w-4 ${on ? 'text-amber-600' : 'text-slate-400'}`} />
              {tab.label}
              {tab.count > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums ${on ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ============================ OVERVIEW ============================ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            {kpis.map((k) => (
              <div key={k.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <span className={`grid h-8 w-8 place-items-center rounded-lg ${k.tone}`}><k.icon aria-hidden="true" className="h-4 w-4" /></span>
                <p className="mt-3 text-xs font-medium text-slate-500">{k.label}</p>
                <p className={`mt-0.5 font-bold text-slate-900 ${k.small ? 'text-sm' : 'text-2xl tabular-nums'}`}>{k.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Card icon={Building2} title="General information">
                <p className="text-sm leading-relaxed text-slate-600">{supplier.description || 'No description provided.'}</p>
                <dl className="mt-4 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
                  <Info label="Legal name">{supplier.legal_name}</Info>
                  <Info label="Supplier type"><span className="capitalize">{label(supplier.supplier_type)}</span></Info>
                  <Info label="Email">{supplier.email}</Info>
                  <Info label="Phone">{supplier.phone}</Info>
                </dl>
              </Card>

              <Card icon={Briefcase} title="Business information">
                <dl className="grid gap-4 sm:grid-cols-2">
                  <Info label="Tax number">{supplier.tax_number}</Info>
                  <Info label="Registration number">{supplier.registration_number}</Info>
                  <Info label="Payment terms">{supplier.payment_terms}</Info>
                  <Info label="Preferred currency" mono>{supplier.preferred_currency}</Info>
                </dl>
              </Card>

              {detailEntries.length > 0 && (
                <Card icon={TypeIcon} title={`${label(supplier.supplier_type)} specifications`}>
                  <dl className="grid gap-4 sm:grid-cols-2">
                    {detailEntries.map(([key, val]) => (
                      <Info key={key} label={<span className="capitalize">{label(key)}</span>}>
                        {Array.isArray(val) ? val.join(', ') : typeof val === 'object' ? JSON.stringify(val) : typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val)}
                      </Info>
                    ))}
                  </dl>
                </Card>
              )}
            </div>

            <div className="space-y-6">
              <Card icon={UserCheck} title="Primary contact">
                {primaryContact ? (
                  <div className="space-y-1.5 text-sm">
                    <p className="font-semibold text-slate-900">{primaryContact.full_name}</p>
                    <p className="text-xs text-slate-500">{primaryContact.position || 'Representative'}</p>
                    {primaryContact.email && <p className="flex items-center gap-2 pt-1 text-xs text-slate-600"><Mail aria-hidden="true" className="h-3.5 w-3.5 text-slate-400" />{primaryContact.email}</p>}
                    {primaryContact.phone && <p className="flex items-center gap-2 text-xs text-slate-600"><Phone aria-hidden="true" className="h-3.5 w-3.5 text-slate-400" />{primaryContact.phone}</p>}
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm text-slate-500">{translate('No primary contact yet.')}</p>
                    <button onClick={() => { setActiveTab('contacts'); openContact(); }} className="mt-2 text-sm font-medium text-amber-700 hover:underline">{translate('Add a contact')}</button>
                  </div>
                )}
              </Card>

              <Card icon={MapPin} title="Headquarters">
                <p className="text-sm text-slate-700">{supplier.address || 'Address not specified'}</p>
                <p className="mt-0.5 text-sm text-slate-500">{[supplier.city, supplier.country, supplier.postal_code].filter(Boolean).join(', ')}</p>
              </Card>

              <Card icon={FileText} title="Internal notes" tone="amber">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-amber-900/80">
                  {notes || 'No internal notes recorded.'}
                </p>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ============================ SERVICES ============================ */}
      {activeTab === 'services' && (
        <div className="space-y-5">
          <TabHeader title="Services & rate catalog" text="Rooms, flights, vehicle categories, packages and excursions."
            action={supplier.supplier_services.length > 0 && <PrimaryButton icon={Plus} onClick={() => openService()}>{translate('Add service')}</PrimaryButton>} />
          {supplier.supplier_services.length === 0 ? (
            <EmptyState icon={Tag} title="No services cataloged yet"
              text="Add the rooms, transfers, tours or meals this supplier offers, with their base rates."
              actionLabel="Add first service" onAction={() => openService()} />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    {['Service', 'Category', 'Base rate', 'Unit', 'Status'].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}
                    <th className="px-4 py-3 text-right font-medium">{translate('Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {supplier.supplier_services.map((s) => (
                    <tr key={s.id} className="transition-colors hover:bg-amber-50/30">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{s.service_name}</p>
                        {s.description && <p className="max-w-xs truncate text-xs text-slate-400">{s.description}</p>}
                      </td>
                      <td className="px-4 py-3 capitalize text-slate-600">{s.service_category}</td>
                      <td className="px-4 py-3 font-semibold tabular-nums text-amber-700">{s.currency} {s.base_price ? Number(s.base_price).toFixed(2) : '0.00'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{s.unit}</td>
                      <td className="px-4 py-3"><Pill status={s.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <IconBtn icon={Edit} title="Edit" aria-label="Edit service" onClick={() => openService(s)} />
                          <IconBtn icon={Trash2} danger title="Delete" aria-label="Delete service"
                            onClick={() => remove('supplier_services', s.id, 'Delete this service?', 'Service deleted', 'Error deleting service')} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================ CONTACTS ============================ */}
      {activeTab === 'contacts' && (
        <div className="space-y-5">
          <TabHeader title="Contacts directory" text="Key personnel, managers and operational agents."
            action={supplier.supplier_contacts.length > 0 && <PrimaryButton icon={Plus} onClick={() => openContact()}>{translate('Add contact')}</PrimaryButton>} />
          {supplier.supplier_contacts.length === 0 ? (
            <EmptyState icon={Users} title="No contacts recorded"
              text="Save the people you work with at this supplier so your team knows who to call."
              actionLabel="Add first contact" onAction={() => openContact()} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {supplier.supplier_contacts.map((c) => (
                <div key={c.id} className={`rounded-2xl border bg-white p-5 shadow-sm ${c.is_primary ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-11 w-11 place-items-center rounded-full bg-amber-50 font-bold text-amber-700 ring-1 ring-inset ring-amber-200">
                        {c.full_name.charAt(0).toUpperCase()}
                      </span>
                      <div>
                        <h4 className="font-semibold text-slate-900">{c.full_name}</h4>
                        <p className="text-xs text-slate-500">{c.position || 'Representative'}</p>
                      </div>
                    </div>
                    {c.is_primary ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800"><Star aria-hidden="true" className="h-3 w-3" />{translate('Primary')}</span>
                    ) : (
                      <button onClick={() => handleSetPrimaryContact(c.id)} className="text-xs font-medium text-amber-700 hover:underline">{translate('Set primary')}</button>
                    )}
                  </div>
                  <div className="my-4 space-y-1.5 text-sm text-slate-600">
                    {c.email && <p className="flex items-center gap-2"><Mail aria-hidden="true" className="h-3.5 w-3.5 text-slate-400" />{c.email}</p>}
                    {c.phone && <p className="flex items-center gap-2"><Phone aria-hidden="true" className="h-3.5 w-3.5 text-slate-400" />{c.phone}</p>}
                    {c.notes && <p className="pt-1 text-xs italic text-slate-500">{c.notes}</p>}
                  </div>
                  <div className="flex justify-end gap-1 border-t border-slate-100 pt-3">
                    <IconBtn icon={Edit} aria-label="Edit contact" onClick={() => openContact(c)} />
                    <IconBtn icon={Trash2} danger aria-label="Delete contact" onClick={() => remove('supplier_contacts', c.id, 'Delete contact?', 'Contact deleted', 'Error deleting contact')} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================ LOCATIONS ============================ */}
      {activeTab === 'locations' && (
        <div className="space-y-5">
          <TabHeader title="Locations & branches" text="Multi-city presence, hotel chains and pickup branches."
            action={supplier.supplier_locations.length > 0 && <PrimaryButton icon={Plus} onClick={() => openLocation()}>{translate('Add location')}</PrimaryButton>} />
          {supplier.supplier_locations.length === 0 ? (
            <EmptyState icon={MapPin} title="No additional locations"
              text="Does this supplier operate from more than one place? Add each branch or property here."
              actionLabel="Add first location" onAction={() => openLocation()} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {supplier.supplier_locations.map((loc) => (
                <div key={loc.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-200"><MapPin aria-hidden="true" className="h-[18px] w-[18px]" /></span>
                      <div>
                        <h4 className="font-semibold text-slate-900">{loc.location_name}</h4>
                        <p className="mt-0.5 text-sm text-slate-600">{[loc.address, loc.city, loc.country].filter(Boolean).join(', ')}</p>
                        {loc.latitude && loc.longitude && <p className="mt-1 font-mono text-xs text-slate-400">{loc.latitude}, {loc.longitude}</p>}
                        {loc.notes && <p className="mt-1 text-xs italic text-slate-500">{loc.notes}</p>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <IconBtn icon={Edit} aria-label="Edit location" onClick={() => openLocation(loc)} />
                      <IconBtn icon={Trash2} danger aria-label="Delete location" onClick={() => remove('supplier_locations', loc.id, 'Delete location?', 'Location deleted', 'Error deleting location')} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================ DOCUMENTS ============================ */}
      {activeTab === 'documents' && (
        <div className="space-y-5">
          <TabHeader title="Documents" text="Trade licenses, tax certificates and insurance policies, stored privately."
            action={supplier.supplier_documents.length > 0 && <PrimaryButton icon={Upload} onClick={() => setDocumentModalOpen(true)}>{translate('Upload document')}</PrimaryButton>} />
          {supplier.supplier_documents.length === 0 ? (
            <EmptyState icon={FileText} title="No documents uploaded"
              text="Keep licenses, contracts and insurance in one secure place and get warned before they expire."
              actionLabel="Upload first document" actionIcon={Upload} onAction={() => setDocumentModalOpen(true)} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {supplier.supplier_documents.map((doc) => {
                const left = doc.expiry_date ? daysUntil(doc.expiry_date) : null;
                const expired = left !== null && left < 0;
                const soon = left !== null && !expired && left < 30;
                return (
                  <div key={doc.id} className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200"><FileText aria-hidden="true" className="h-5 w-5" /></span>
                      <div className="min-w-0">
                        <h4 className="truncate text-sm font-semibold text-slate-900">{doc.document_name}</h4>
                        <p className="text-xs capitalize text-slate-500">{doc.document_type}</p>
                        {doc.expiry_date && (
                          <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                            expired ? 'bg-rose-50 text-rose-700' : soon ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            <Calendar aria-hidden="true" className="h-3 w-3" />
                            {expired ? `Expired ${fmtDate(doc.expiry_date)}` : soon ? `Expires in ${left}d` : `Expires ${fmtDate(doc.expiry_date)}`}
                          </span>
                        )}
                        {doc.notes && <p className="mt-1.5 text-xs text-slate-400">{doc.notes}</p>}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <IconBtn icon={Download} title="Download" aria-label="Download document" onClick={() => handleDownloadDoc(doc.storage_path)} />
                      <IconBtn icon={Trash2} danger title="Delete" aria-label="Delete document" onClick={() => handleDeleteDocument(doc.id, doc.storage_path)} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================ CONTRACTS ============================ */}
      {activeTab === 'contracts' && (
        <div className="space-y-5">
          <TabHeader title="Contracts" text="Service agreements, commission terms and validity periods."
            action={supplier.supplier_contracts.length > 0 && <PrimaryButton icon={Plus} onClick={() => openContract()}>{translate('Register contract')}</PrimaryButton>} />
          {supplier.supplier_contracts.length === 0 ? (
            <EmptyState icon={Briefcase} title="No contracts registered"
              text="Record your agreement with this supplier to track its terms and renewal dates."
              actionLabel="Register first contract" onAction={() => openContract()} />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    {['Reference', 'Type', 'Validity', 'Payment terms', 'Status'].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}
                    <th className="px-4 py-3 text-right font-medium">{translate('Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {supplier.supplier_contracts.map((c) => {
                    const left = c.end_date ? daysUntil(c.end_date) : null;
                    return (
                      <tr key={c.id} className="transition-colors hover:bg-amber-50/30">
                        <td className="px-4 py-3 font-mono font-semibold text-slate-900">{c.contract_reference}</td>
                        <td className="px-4 py-3 text-slate-700">{c.contract_type}</td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {fmtDate(c.start_date)} → {fmtDate(c.end_date)}
                          {c.status === 'active' && left !== null && left >= 0 && left < 30 && (
                            <span className="ml-2 rounded-full bg-amber-50 px-1.5 py-0.5 font-medium text-amber-700">Ends in {left}d</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{c.payment_terms}</td>
                        <td className="px-4 py-3"><Pill status={c.status} /></td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <IconBtn icon={Edit} aria-label="Edit contract" onClick={() => openContract(c)} />
                            <IconBtn icon={Trash2} danger aria-label="Delete contract" onClick={() => remove('supplier_contracts', c.id, 'Delete contract record?', 'Contract deleted', 'Error deleting contract')} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================ PACKAGES ============================ */}
      {activeTab === 'packages' && (
        <div className="space-y-5">
          <TabHeader title="Connected packages" text="Packages that use this supplier for accommodation, transport, activities or internal costs." />
          {loadingPackages ? (
            <p role="status" className="py-12 text-center text-sm text-slate-400">{translate('Loading connected packages...')}</p>
          ) : packageError ? (
            <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              Could not load connected packages: {packageError}
            </p>
          ) : connectedPackages.length === 0 ? (
            <EmptyState icon={Compass} title="Not used in any package yet"
              text="When you link this supplier to accommodation, transport, activities or costs in a package, it will show up here."
              actionLabel="Browse packages" actionIcon={Compass} onAction={() => navigate('/admin/packages')} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {connectedPackages.map((pkg) => (
                <div key={pkg.id} className="flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="space-y-3 p-5">
                    {pkg.cover_image_url && (
                      <img src={pkg.cover_image_url} alt="" className="h-36 w-full rounded-xl object-cover" />
                    )}
                    <div className="flex items-start justify-between">
                      <span className="font-mono text-xs font-semibold text-amber-700">{pkg.reference || pkg.id}</span>
                      <Pill status={pkg.status} />
                    </div>
                    <h4 className="font-bold text-slate-900">{pkg.public_title || pkg.internal_title || 'Untitled package'}</h4>
                    {pkg.destination_country && (
                      <p className="flex items-center gap-1.5 text-xs text-slate-500"><MapPin aria-hidden="true" className="h-3.5 w-3.5 text-slate-400" />{pkg.destination_country}</p>
                    )}
                    {pkg.starting_price != null && (
                      <p className="text-sm font-semibold text-slate-700">
                        {pkg.default_currency || 'MAD'} {Number(pkg.starting_price).toLocaleString()}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {pkg.supplierUsage.map((type) => (
                        <span key={type} className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">{type}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 bg-slate-50 p-3.5">
                    <Link to={`/admin/packages-services/${pkg.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 hover:underline">
                      Edit package <ExternalLink aria-hidden="true" className="h-3 w-3" />
                    </Link>
                    {pkg.status === 'active' && pkg.is_public && (
                      <Link to={`/packages/${pkg.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline">
                        Public page <ExternalLink aria-hidden="true" className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================ HISTORY ============================ */}
      {activeTab === 'history' && (
        <div className="space-y-5">
          <TabHeader title="Activity history" text="Chronological log of changes, uploads and renewals." />
          {supplier.supplier_activity_logs.length === 0 ? (
            <EmptyState icon={Clock} title="No activity recorded yet"
              text="Changes to this supplier, such as status updates, documents and contracts, will appear here as a timeline." />
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <ol className="ml-3 space-y-6 border-l-2 border-amber-200 pl-6">
                {supplier.supplier_activity_logs.map((log) => (
                  <li key={log.id} className="relative">
                    <span className="absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-amber-500 shadow" />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-900">{log.action_type}</span>
                      <time className="text-xs text-slate-400">{new Date(log.created_at).toLocaleString()}</time>
                    </div>
                    <p className="mt-0.5 text-sm text-slate-600">{log.description}</p>
                    <p className="mt-0.5 text-xs text-slate-400">By {log.user_email || 'System'}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {/* ============================ MODALS ============================ */}
      {serviceModalOpen && (
        <Modal title={editingService ? 'Edit service' : 'Add service'} onClose={() => setServiceModalOpen(false)}
          onSubmit={handleServiceSubmit} submitLabel="Save service">
          <Field label="Service name" required>
            <input required value={serviceForm.service_name} onChange={(e) => setServiceForm({ ...serviceForm, service_name: e.target.value })}
              placeholder="e.g. Deluxe Ocean View Suite" className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <select value={serviceForm.service_category} onChange={(e) => setServiceForm({ ...serviceForm, service_category: e.target.value })} className={inputCls}>
                <option value="accommodation">{translate('Accommodation / Room')}</option>
                <option value="transfer">{translate('Airport Transfer')}</option>
                <option value="meal">{translate('Meal Plan')}</option>
                <option value="tour">{translate('Guided Tour')}</option>
                <option value="excursion">{translate('Excursion / Activity')}</option>
                <option value="other">{translate('Other')}</option>
              </select>
            </Field>
            <Field label="Unit">
              <input value={serviceForm.unit} onChange={(e) => setServiceForm({ ...serviceForm, unit: e.target.value })} placeholder="per_night / per_person" className={inputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Base price">
              <input type="number" step="0.01" value={serviceForm.base_price} onChange={(e) => setServiceForm({ ...serviceForm, base_price: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Currency">
              <input maxLength={3} value={serviceForm.currency} onChange={(e) => setServiceForm({ ...serviceForm, currency: e.target.value.toUpperCase() })} className={`${inputCls} uppercase`} />
            </Field>
          </div>
          <Field label="Description">
            <textarea rows={2} value={serviceForm.description} onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
              placeholder="Service inclusions..." className={inputCls} />
          </Field>
        </Modal>
      )}

      {contactModalOpen && (
        <Modal title={editingContact ? 'Edit contact' : 'Add contact'} onClose={() => setContactModalOpen(false)}
          onSubmit={handleContactSubmit} submitLabel="Save contact">
          <Field label="Full name" required>
            <input required value={contactForm.full_name} onChange={(e) => setContactForm({ ...contactForm, full_name: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Position">
            <input value={contactForm.position} onChange={(e) => setContactForm({ ...contactForm, position: e.target.value })} placeholder="e.g. Sales Manager" className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email">
              <input type="email" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Phone">
              <input value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} className={inputCls} />
            </Field>
          </div>
          <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 hover:border-slate-300">
            <input type="checkbox" checked={contactForm.is_primary} onChange={(e) => setContactForm({ ...contactForm, is_primary: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500" />{translate('Set as primary contact')}</label>
          <Field label="Notes">
            <textarea rows={2} value={contactForm.notes} onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })} className={inputCls} />
          </Field>
        </Modal>
      )}

      {locationModalOpen && (
        <Modal title={editingLocation ? 'Edit location' : 'Add location'} onClose={() => setLocationModalOpen(false)}
          onSubmit={handleLocationSubmit} submitLabel="Save location">
          <Field label="Location / branch name" required>
            <input required value={locationForm.location_name} onChange={(e) => setLocationForm({ ...locationForm, location_name: e.target.value })}
              placeholder="e.g. Marrakech City Center Branch" className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="City">
              <input value={locationForm.city} onChange={(e) => setLocationForm({ ...locationForm, city: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Country">
              <input value={locationForm.country} onChange={(e) => setLocationForm({ ...locationForm, country: e.target.value })} className={inputCls} />
            </Field>
          </div>
          <Field label="Address">
            <input value={locationForm.address} onChange={(e) => setLocationForm({ ...locationForm, address: e.target.value })} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitude">
              <input type="number" step="any" value={locationForm.latitude} onChange={(e) => setLocationForm({ ...locationForm, latitude: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Longitude">
              <input type="number" step="any" value={locationForm.longitude} onChange={(e) => setLocationForm({ ...locationForm, longitude: e.target.value })} className={inputCls} />
            </Field>
          </div>
        </Modal>
      )}

      {documentModalOpen && (
        <Modal title="Upload document" subtitle="Files are stored privately and shared through short-lived links."
          onClose={() => setDocumentModalOpen(false)} onSubmit={handleDocumentUpload} busy={uploadingDoc}
          submitLabel={uploadingDoc ? 'Uploading...' : 'Upload file'}>
          <Field label="Document type">
            <select value={docType} onChange={(e) => setDocType(e.target.value)} className={inputCls}>
              <option value="contract">{translate('Commercial Contract')}</option>
              <option value="license">{translate('Trade License')}</option>
              <option value="certification">{translate('Certification')}</option>
              <option value="insurance">{translate('Insurance Policy')}</option>
              <option value="registration">{translate('Company Registration')}</option>
              <option value="other">{translate('Other Document')}</option>
            </select>
          </Field>
          <Field label="Document name">
            <input value={docName} onChange={(e) => setDocName(e.target.value)} placeholder="e.g. 2026 Liability Insurance Policy" className={inputCls} />
          </Field>
          <Field label="Expiry date (optional)">
            <input type="date" value={docExpiry} onChange={(e) => setDocExpiry(e.target.value)} className={inputCls} />
          </Field>
          <Field label="File" required>
            <input required type="file" onChange={(e) => setDocFile(e.target.files[0])}
              className="mt-1.5 w-full text-sm text-slate-500 file:mr-4 file:rounded-lg file:border-0 file:bg-amber-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-amber-700 hover:file:bg-amber-100" />
          </Field>
          <Field label="Notes">
            <input value={docNotes} onChange={(e) => setDocNotes(e.target.value)} className={inputCls} />
          </Field>
        </Modal>
      )}

      {contractModalOpen && (
        <Modal title={editingContract ? 'Edit contract' : 'Register contract'} onClose={() => setContractModalOpen(false)}
          onSubmit={handleContractSubmit} submitLabel="Save contract">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Reference" required>
              <input required value={contractForm.contract_reference} onChange={(e) => setContractForm({ ...contractForm, contract_reference: e.target.value })} className={`${inputCls} uppercase`} />
            </Field>
            <Field label="Contract type">
              <input value={contractForm.contract_type} onChange={(e) => setContractForm({ ...contractForm, contract_type: e.target.value })} className={inputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start date" required>
              <input required type="date" value={contractForm.start_date} onChange={(e) => setContractForm({ ...contractForm, start_date: e.target.value })} className={inputCls} />
            </Field>
            <Field label="End date" required>
              <input required type="date" min={contractForm.start_date || undefined} value={contractForm.end_date} onChange={(e) => setContractForm({ ...contractForm, end_date: e.target.value })} className={inputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Payment terms">
              <input value={contractForm.payment_terms} onChange={(e) => setContractForm({ ...contractForm, payment_terms: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Status">
              <select value={contractForm.status} onChange={(e) => setContractForm({ ...contractForm, status: e.target.value })} className={inputCls}>
                <option value="active">{translate('Active')}</option>
                <option value="expired">{translate('Expired')}</option>
                <option value="pending_renewal">{translate('Pending Renewal')}</option>
                <option value="terminated">{translate('Terminated')}</option>
              </select>
            </Field>
          </div>
          <Field label="Notes">
            <textarea rows={2} value={contractForm.notes} onChange={(e) => setContractForm({ ...contractForm, notes: e.target.value })} className={inputCls} />
          </Field>
        </Modal>
      )}
    </div>
  );
}