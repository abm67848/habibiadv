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

const TYPE_LABELS = {
  hotel: 'Hotel', riad: 'Riad', resort: 'Resort', restaurant: 'Restaurante', airline: 'Aerolínea',
  car_rental: 'Alquiler de coches', transport_company: 'Empresa de transporte',
  local_guide: 'Guía local', activity_provider: 'Proveedor de actividades',
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
  active: { dot: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200', label: 'Activo' },
  pending: { dot: 'bg-amber-500', pill: 'bg-amber-50 text-amber-700 ring-amber-200', label: 'Pendiente' },
  blacklisted: { dot: 'bg-rose-500', pill: 'bg-rose-50 text-rose-700 ring-rose-200', label: 'En lista negra' },
  inactive: { dot: 'bg-slate-400', pill: 'bg-slate-100 text-slate-600 ring-slate-200', label: 'Inactivo' },
  expired: { dot: 'bg-rose-500', pill: 'bg-rose-50 text-rose-700 ring-rose-200', label: 'Caducado' },
  pending_renewal: { dot: 'bg-amber-500', pill: 'bg-amber-50 text-amber-700 ring-amber-200', label: 'Pendiente de renovación' },
  terminated: { dot: 'bg-slate-400', pill: 'bg-slate-100 text-slate-600 ring-slate-200', label: 'Terminado' },
};

const EMPTY_SERVICE = { service_name: '', service_category: 'accommodation', description: '', unit: 'per_night', base_price: '', currency: 'EUR', status: 'active' };
const EMPTY_CONTACT = { full_name: '', position: '', email: '', phone: '', is_primary: false, notes: '' };
const EMPTY_LOCATION = { location_name: '', country: '', city: '', address: '', latitude: '', longitude: '', notes: '' };
const EMPTY_CONTRACT = { contract_reference: '', contract_type: 'Master Service Agreement', start_date: '', end_date: '', payment_terms: 'Net 30', currency: 'EUR', status: 'active', notes: '' };

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('es-ES') : '—');
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
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${s.pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
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
      {l}{required && <span className="ml-0.5 text-red-500">*</span>}
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
          <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 p-5">{children}</div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">{translate('Cancelar')}</button>
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
          ['offer_accommodations', 'Alojamiento'],
          ['offer_transports', 'Transporte'],
          ['offer_activities', 'Actividad'],
          ['offer_costs', 'Coste'],
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
        setPackageError(packageFetchError.message || 'No se pudieron cargar los paquetes conectados.');
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
      setError(err.message || 'No se pudieron cargar los detalles del proveedor.');
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
      showToast(`Estado del proveedor actualizado a ${STATUS[newStatus]?.label || newStatus}`);
      fetchSupplierData();
    } catch (err) { fail('Error al actualizar el estado', err); }
  };

  const handleDeleteSupplier = async () => {
    if (!confirm('¿Seguro que quieres eliminar (borrado lógico) este proveedor?')) return;
    try {
      const { error } = await supabase.from('suppliers').update({ deleted_at: new Date().toISOString(), status: 'inactive' }).eq('id', id);
      if (error) throw error;
      navigate('/admin/suppliers');
    } catch (err) { fail('Error al eliminar el proveedor', err); }
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
        : { ...EMPTY_SERVICE, currency: supplier.preferred_currency === 'MAD' ? 'EUR' : (supplier.preferred_currency || 'EUR') },
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
        currency: serviceForm.currency === 'MAD' ? 'EUR' : (serviceForm.currency || 'EUR'),
        status: serviceForm.status,
      },
      okAdd: 'Servicio añadido correctamente',
      okEdit: 'Servicio actualizado correctamente',
      close: setServiceModalOpen,
      reset: () => { setEditingService(null); setServiceForm(EMPTY_SERVICE); },
      failPrefix: 'Error al guardar el servicio',
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
      okAdd: 'Contacto añadido',
      okEdit: 'Contacto actualizado',
      close: setContactModalOpen,
      reset: () => { setEditingContact(null); setContactForm(EMPTY_CONTACT); },
      failPrefix: 'Error al guardar el contacto',
    });
  };

  const handleSetPrimaryContact = async (contactId) => {
    try {
      await supabase.from('supplier_contacts').update({ is_primary: false }).eq('supplier_id', id);
      const { error } = await supabase.from('supplier_contacts').update({ is_primary: true }).eq('id', contactId);
      if (error) throw error;
      showToast('Contacto principal actualizado');
      fetchSupplierData();
    } catch (err) { fail('Error al establecer el contacto principal', err); }
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
      okAdd: 'Ubicación añadida',
      okEdit: 'Ubicación actualizada',
      close: setLocationModalOpen,
      reset: () => { setEditingLocation(null); setLocationForm(EMPTY_LOCATION); },
      failPrefix: 'Error al guardar la ubicación',
    });
  };

  /* ---------------- documents ---------------- */
  const handleDocumentUpload = async (e) => {
    e.preventDefault();
    if (!docFile) return showToast('Por favor, selecciona un archivo.', 'error');
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

      showToast('Documento subido de forma segura');
      setDocumentModalOpen(false);
      setDocFile(null); setDocName(''); setDocExpiry(''); setDocNotes('');
      fetchSupplierData();
    } catch (err) { fail('Error al subir el documento', err); }
    finally { setUploadingDoc(false); }
  };

  const handleDeleteDocument = async (docId, storagePath) => {
    if (!confirm('¿Eliminar el documento?')) return;
    try {
      await supabase.storage.from('supplier-documents').remove([storagePath]);
      const { error } = await supabase.from('supplier_documents').delete().eq('id', docId);
      if (error) throw error;
      showToast('Documento eliminado');
      fetchSupplierData();
    } catch (err) { fail('Error al eliminar el documento', err); }
  };

  const handleDownloadDoc = async (storagePath) => {
    try {
      const { data, error } = await supabase.storage.from('supplier-documents').createSignedUrl(storagePath, 60);
      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (err) { fail('Error al obtener la URL firmada', err); }
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
            currency: supplier.preferred_currency === 'MAD' ? 'EUR' : (supplier.preferred_currency || 'EUR'),
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
      okAdd: 'Contrato registrado',
      okEdit: 'Contrato actualizado',
      close: setContractModalOpen,
      reset: () => { setEditingContract(null); setContractForm(EMPTY_CONTRACT); },
      failPrefix: 'Error al guardar el contrato',
    });
  };

  /* ---------------- loading / error ---------------- */
  if (loading && !supplier) {
    return (
      <div className="mx-auto max-w-7xl animate-pulse space-y-5 p-4 sm:p-6" role="status" aria-label="Cargando proveedor">
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
        <h2 className="mt-4 text-xl font-bold text-slate-900">Proveedor no encontrado</h2>
        <p className="mt-1.5 text-sm text-slate-500">{error || 'No se pudo cargar el proveedor solicitado.'}</p>
        <button onClick={() => navigate('/admin/suppliers')} className="mt-6 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600">Volver a proveedores</button>
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
    { id: 'overview', label: 'Resumen', icon: Building2 },
    { id: 'services', label: 'Servicios y tarifas', icon: Tag, count: supplier.supplier_services.length },
    { id: 'contacts', label: 'Contactos', icon: Users, count: supplier.supplier_contacts.length },
    { id: 'locations', label: 'Ubicaciones', icon: MapPin, count: supplier.supplier_locations.length },
    { id: 'documents', label: 'Documentos', icon: FileText, count: supplier.supplier_documents.length },
    { id: 'contracts', label: 'Contratos', icon: Briefcase, count: supplier.supplier_contracts.length },
    { id: 'packages', label: 'Paquetes', icon: Compass, count: connectedPackages.length },
    { id: 'history', label: 'Actividad', icon: Clock, count: supplier.supplier_activity_logs.length },
  ];

  const kpis = [
    { label: 'Total de servicios', value: supplier.supplier_services.length, icon: Tag, tone: 'bg-slate-100 text-slate-600' },
    { label: 'Servicios activos', value: activeServicesCount, icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-600' },
    { label: 'Paquetes vinculados', value: connectedPackages.length, icon: Compass, tone: 'bg-amber-50 text-amber-600' },
    { label: 'Contrato', value: activeContract ? 'Activo' : 'Ninguno', icon: Briefcase, tone: 'bg-indigo-50 text-indigo-600' },
    { label: 'Última actividad', value: lastLog ? fmtDate(lastLog.created_at) : 'Sin actividad', icon: Clock, tone: 'bg-slate-100 text-slate-600', small: true },
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
          <button type="button" onClick={() => setToast(null)} aria-label="Descartar" className="rounded p-0.5 hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Breadcrumb */}
      <nav aria-label="Migas de pan" className="flex items-center gap-2 text-sm">
        <Link to="/admin/suppliers" className="inline-flex items-center gap-1.5 font-medium text-slate-500 hover:text-slate-900">
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />Proveedores</Link>
        <span className="text-slate-300">/</span>
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
                {supplier.status === 'active' ? 'Desactivar' : 'Activar'}
              </button>
              {supplier.status !== 'blacklisted' ? (
                <button onClick={() => handleStatusChange('blacklisted')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100">
                  <Ban aria-hidden="true" className="h-4 w-4" />Lista negra</button>
              ) : (
                <button onClick={() => handleStatusChange('active')}
                  className="rounded-lg border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100">Quitar de lista negra</button>
              )}
              <button onClick={handleDeleteSupplier} title="Eliminar proveedor" aria-label="Eliminar proveedor"
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
            <span className="inline-flex items-center gap-1.5 font-medium text-amber-700">
              <TypeIcon aria-hidden="true" className="h-4 w-4" /> {TYPE_LABELS[supplier.supplier_type] || label(supplier.supplier_type)}
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
                <Globe aria-hidden="true" className="h-4 w-4" /> Sitio web <ExternalLink aria-hidden="true" className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div role="tablist" aria-label="Secciones del proveedor" className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
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
              <Card icon={Building2} title="Información general">
                <p className="text-sm leading-relaxed text-slate-600">{supplier.description || 'Sin descripción proporcionada.'}</p>
                <dl className="mt-4 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
                  <Info label="Razón social">{supplier.legal_name}</Info>
                  <Info label="Tipo de proveedor"><span className="capitalize">{TYPE_LABELS[supplier.supplier_type] || label(supplier.supplier_type)}</span></Info>
                  <Info label="Correo electrónico">{supplier.email}</Info>
                  <Info label="Teléfono">{supplier.phone}</Info>
                </dl>
              </Card>

              <Card icon={Briefcase} title="Información empresarial">
                <dl className="grid gap-4 sm:grid-cols-2">
                  <Info label="NIF/CIF">{supplier.tax_number}</Info>
                  <Info label="Número de registro">{supplier.registration_number}</Info>
                  <Info label="Condiciones de pago">{supplier.payment_terms}</Info>
                  <Info label="Moneda preferida" mono>{supplier.preferred_currency}</Info>
                </dl>
              </Card>

              {detailEntries.length > 0 && (
                <Card icon={TypeIcon} title={`Especificaciones de ${TYPE_LABELS[supplier.supplier_type] || label(supplier.supplier_type)}`}>
                  <dl className="grid gap-4 sm:grid-cols-2">
                    {detailEntries.map(([key, val]) => (
                      <Info key={key} label={<span className="capitalize">{label(key)}</span>}>
                        {Array.isArray(val) ? val.join(', ') : typeof val === 'object' ? JSON.stringify(val) : typeof val === 'boolean' ? (val ? 'Sí' : 'No') : String(val)}
                      </Info>
                    ))}
                  </dl>
                </Card>
              )}
            </div>

            <div className="space-y-6">
              <Card icon={UserCheck} title="Contacto principal">
                {primaryContact ? (
                  <div className="space-y-1.5 text-sm">
                    <p className="font-semibold text-slate-900">{primaryContact.full_name}</p>
                    <p className="text-xs text-slate-500">{primaryContact.position || 'Representante'}</p>
                    {primaryContact.email && <p className="flex items-center gap-2 pt-1 text-xs text-slate-600"><Mail aria-hidden="true" className="h-3.5 w-3.5 text-slate-400" />{primaryContact.email}</p>}
                    {primaryContact.phone && <p className="flex items-center gap-2 text-xs text-slate-600"><Phone aria-hidden="true" className="h-3.5 w-3.5 text-slate-400" />{primaryContact.phone}</p>}
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm text-slate-500">Aún no hay contacto principal.</p>
                    <button onClick={() => { setActiveTab('contacts'); openContact(); }} className="mt-2 text-sm font-medium text-amber-700 hover:underline">Añadir un contacto</button>
                  </div>
                )}
              </Card>

              <Card icon={MapPin} title="Sede central">
                <p className="text-sm text-slate-700">{supplier.address || 'Dirección no especificada'}</p>
                <p className="mt-0.5 text-sm text-slate-500">{[supplier.city, supplier.country, supplier.postal_code].filter(Boolean).join(', ')}</p>
              </Card>

              <Card icon={FileText} title="Notas internas" tone="amber">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-amber-900/80">
                  {notes || 'Sin notas internas registradas.'}
                </p>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ============================ SERVICES ============================ */}
      {activeTab === 'services' && (
        <div className="space-y-5">
          <TabHeader title="Catálogo de servicios y tarifas" text="Habitaciones, vuelos, categorías de vehículos, paquetes y excursiones."
            action={supplier.supplier_services.length > 0 && <PrimaryButton icon={Plus} onClick={() => openService()}>Añadir servicio</PrimaryButton>} />
          {supplier.supplier_services.length === 0 ? (
            <EmptyState icon={Tag} title="Aún no hay servicios catalogados"
              text="Añade las habitaciones, traslados, tours o comidas que ofrece este proveedor, con sus tarifas base."
              actionLabel="Añadir primer servicio" onAction={() => openService()} />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    {['Servicio', 'Categoría', 'Tarifa base', 'Unidad', 'Estado'].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}
                    <th className="px-4 py-3 text-right font-medium">Acciones</th>
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
                          <IconBtn icon={Edit} title="Editar" aria-label="Editar servicio" onClick={() => openService(s)} />
                          <IconBtn icon={Trash2} danger title="Eliminar" aria-label="Eliminar servicio"
                            onClick={() => remove('supplier_services', s.id, '¿Eliminar este servicio?', 'Servicio eliminado', 'Error al eliminar el servicio')} />
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
          <TabHeader title="Directorio de contactos" text="Personal clave, gerentes y agentes operativos."
            action={supplier.supplier_contacts.length > 0 && <PrimaryButton icon={Plus} onClick={() => openContact()}>Añadir contacto</PrimaryButton>} />
          {supplier.supplier_contacts.length === 0 ? (
            <EmptyState icon={Users} title="No hay contactos registrados"
              text="Guarda a las personas con las que trabajas en este proveedor para que tu equipo sepa a quién llamar."
              actionLabel="Añadir primer contacto" onAction={() => openContact()} />
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
                        <p className="text-xs text-slate-500">{c.position || 'Representante'}</p>
                      </div>
                    </div>
                    {c.is_primary ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800"><Star aria-hidden="true" className="h-3 w-3" />Principal</span>
                    ) : (
                      <button onClick={() => handleSetPrimaryContact(c.id)} className="text-xs font-medium text-amber-700 hover:underline">Establecer principal</button>
                    )}
                  </div>
                  <div className="my-4 space-y-1.5 text-sm text-slate-600">
                    {c.email && <p className="flex items-center gap-2"><Mail aria-hidden="true" className="h-3.5 w-3.5 text-slate-400" />{c.email}</p>}
                    {c.phone && <p className="flex items-center gap-2"><Phone aria-hidden="true" className="h-3.5 w-3.5 text-slate-400" />{c.phone}</p>}
                    {c.notes && <p className="pt-1 text-xs italic text-slate-500">{c.notes}</p>}
                  </div>
                  <div className="flex justify-end gap-1 border-t border-slate-100 pt-3">
                    <IconBtn icon={Edit} aria-label="Editar contacto" onClick={() => openContact(c)} />
                    <IconBtn icon={Trash2} danger aria-label="Eliminar contacto" onClick={() => remove('supplier_contacts', c.id, '¿Eliminar contacto?', 'Contacto eliminado', 'Error al eliminar el contacto')} />
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
          <TabHeader title="Ubicaciones y sucursales" text="Presencia multi-ciudad, cadenas hoteleras y puntos de recogida."
            action={supplier.supplier_locations.length > 0 && <PrimaryButton icon={Plus} onClick={() => openLocation()}>Añadir ubicación</PrimaryButton>} />
          {supplier.supplier_locations.length === 0 ? (
            <EmptyState icon={MapPin} title="Sin ubicaciones adicionales"
              text="¿Este proveedor opera desde más de un lugar? Añade cada sucursal o propiedad aquí."
              actionLabel="Añadir primera ubicación" onAction={() => openLocation()} />
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
                      <IconBtn icon={Edit} aria-label="Editar ubicación" onClick={() => openLocation(loc)} />
                      <IconBtn icon={Trash2} danger aria-label="Eliminar ubicación" onClick={() => remove('supplier_locations', loc.id, '¿Eliminar ubicación?', 'Ubicación eliminada', 'Error al eliminar la ubicación')} />
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
          <TabHeader title="Documentos" text="Licencias comerciales, certificados fiscales y pólizas de seguro, almacenados de forma privada."
            action={supplier.supplier_documents.length > 0 && <PrimaryButton icon={Upload} onClick={() => setDocumentModalOpen(true)}>Subir documento</PrimaryButton>} />
          {supplier.supplier_documents.length === 0 ? (
            <EmptyState icon={FileText} title="No hay documentos subidos"
              text="Mantén licencias, contratos y seguros en un lugar seguro y recibe avisos antes de que caduquen."
              actionLabel="Subir primer documento" actionIcon={Upload} onAction={() => setDocumentModalOpen(true)} />
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
                            {expired ? `Caducado el ${fmtDate(doc.expiry_date)}` : soon ? `Caduca en ${left}d` : `Caduca el ${fmtDate(doc.expiry_date)}`}
                          </span>
                        )}
                        {doc.notes && <p className="mt-1.5 text-xs text-slate-400">{doc.notes}</p>}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <IconBtn icon={Download} title="Descargar" aria-label="Descargar documento" onClick={() => handleDownloadDoc(doc.storage_path)} />
                      <IconBtn icon={Trash2} danger title="Eliminar" aria-label="Eliminar documento" onClick={() => handleDeleteDocument(doc.id, doc.storage_path)} />
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
          <TabHeader title="Contratos" text="Acuerdos de servicio, condiciones de comisión y periodos de validez."
            action={supplier.supplier_contracts.length > 0 && <PrimaryButton icon={Plus} onClick={() => openContract()}>Registrar contrato</PrimaryButton>} />
          {supplier.supplier_contracts.length === 0 ? (
            <EmptyState icon={Briefcase} title="Sin contratos registrados"
              text="Registra tu acuerdo con este proveedor para hacer seguimiento de sus términos y fechas de renovación."
              actionLabel="Registrar primer contrato" onAction={() => openContract()} />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500">
                  <tr>
                    {['Referencia', 'Tipo', 'Validez', 'Condiciones de pago', 'Estado'].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}
                    <th className="px-4 py-3 text-right font-medium">Acciones</th>
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
                            <span className="ml-2 rounded-full bg-amber-50 px-1.5 py-0.5 font-medium text-amber-700">Termina en {left}d</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{c.payment_terms}</td>
                        <td className="px-4 py-3"><Pill status={c.status} /></td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <IconBtn icon={Edit} aria-label="Editar contrato" onClick={() => openContract(c)} />
                            <IconBtn icon={Trash2} danger aria-label="Eliminar contrato" onClick={() => remove('supplier_contracts', c.id, '¿Eliminar registro del contrato?', 'Contrato eliminado', 'Error al eliminar el contrato')} />
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
          <TabHeader title="Paquetes conectados" text="Paquetes que utilizan este proveedor para alojamiento, transporte, actividades o costes internos." />
          {loadingPackages ? (
            <p role="status" className="py-12 text-center text-sm text-slate-400">Cargando paquetes...</p>
          ) : packageError ? (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">{packageError}</p>
          ) : connectedPackages.length === 0 ? (
            <EmptyState icon={Compass} title="Ningún paquete conectado"
              text="Cuando este proveedor se utilice en paquetes de viaje, aparecerá aquí automáticamente." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {connectedPackages.map((pkg) => (
                <div key={pkg.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-amber-300 hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-200">
                        <Compass aria-hidden="true" className="h-[18px] w-[18px]" />
                      </span>
                      <div>
                        <h4 className="font-semibold text-slate-900">{pkg.public_title || pkg.internal_title || 'Paquete sin título'}</h4>
                        <p className="font-mono text-xs text-slate-400">{pkg.reference}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-slate-600">
                    {pkg.destination_country && <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-slate-400" />{pkg.destination_country}</p>}
                    {pkg.supplierUsage?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {pkg.supplierUsage.map((u) => (
                          <span key={u} className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">{u}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="text-sm font-semibold tabular-nums text-slate-900">
                      {pkg.default_currency} {pkg.starting_price ? Number(pkg.starting_price).toFixed(2) : '—'}
                    </span>
                    <Link to={`/admin/offers/${pkg.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 hover:underline">
                      Ver paquete <ExternalLink className="h-3 w-3" />
                    </Link>
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
          <TabHeader title="Historial de actividad" text="Registro de cambios y acciones realizadas sobre este proveedor." />
          {supplier.supplier_activity_logs.length === 0 ? (
            <EmptyState icon={Clock} title="Sin actividad registrada"
              text="Las acciones sobre este proveedor aparecerán aquí a medida que ocurran." />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <ul className="divide-y divide-slate-100">
                {supplier.supplier_activity_logs.map((log) => (
                  <li key={log.id} className="flex items-start gap-3 px-5 py-4">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500">
                      <Clock aria-hidden="true" className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-800">{log.action || log.description || 'Acción registrada'}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{fmtDate(log.created_at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ============================ MODALS ============================ */}
      {/* Service modal */}
      {serviceModalOpen && (
        <Modal
          title={editingService ? 'Editar servicio' : 'Añadir servicio'}
          subtitle={editingService ? 'Actualiza los detalles del servicio.' : 'Define un nuevo servicio con su tarifa base.'}
          onClose={() => { setServiceModalOpen(false); setEditingService(null); setServiceForm(EMPTY_SERVICE); }}
          onSubmit={handleServiceSubmit}
          submitLabel={editingService ? 'Guardar cambios' : 'Añadir servicio'}
        >
          <Field label="Nombre del servicio" required>
            <input required value={serviceForm.service_name} onChange={(e) => setServiceForm({ ...serviceForm, service_name: e.target.value })} className={inputCls} placeholder="Habitación doble con vistas" />
          </Field>
          <Field label="Categoría" required>
            <select value={serviceForm.service_category} onChange={(e) => setServiceForm({ ...serviceForm, service_category: e.target.value })} className={inputCls}>
              <option value="accommodation">Alojamiento</option>
              <option value="transport">Transporte</option>
              <option value="activity">Actividad</option>
              <option value="meal">Comida</option>
              <option value="other">Otro</option>
            </select>
          </Field>
          <Field label="Descripción">
            <textarea value={serviceForm.description} onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })} className={inputCls} rows={3} placeholder="Descripción del servicio..." />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tarifa base">
              <input type="number" min="0" step="0.01" value={serviceForm.base_price} onChange={(e) => setServiceForm({ ...serviceForm, base_price: e.target.value })} className={inputCls} placeholder="0.00" />
            </Field>
            <Field label="Moneda">
              <select value={serviceForm.currency} onChange={(e) => setServiceForm({ ...serviceForm, currency: e.target.value })} className={inputCls}>
                <option value="EUR">EUR</option><option value="USD">USD</option><option value="GBP">GBP</option>
              </select>
            </Field>
            <Field label="Unidad">
              <select value={serviceForm.unit} onChange={(e) => setServiceForm({ ...serviceForm, unit: e.target.value })} className={inputCls}>
                <option value="per_night">Por noche</option>
                <option value="per_person">Por persona</option>
                <option value="per_item">Por ítem</option>
                <option value="per_day">Por día</option>
                <option value="per_trip">Por viaje</option>
              </select>
            </Field>
            <Field label="Estado">
              <select value={serviceForm.status} onChange={(e) => setServiceForm({ ...serviceForm, status: e.target.value })} className={inputCls}>
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </Field>
          </div>
        </Modal>
      )}

      {/* Contact modal */}
      {contactModalOpen && (
        <Modal
          title={editingContact ? 'Editar contacto' : 'Añadir contacto'}
          subtitle="Datos de la persona de contacto en el proveedor."
          onClose={() => { setContactModalOpen(false); setEditingContact(null); setContactForm(EMPTY_CONTACT); }}
          onSubmit={handleContactSubmit}
          submitLabel={editingContact ? 'Guardar cambios' : 'Añadir contacto'}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre completo" required className="sm:col-span-2">
              <input required value={contactForm.full_name} onChange={(e) => setContactForm({ ...contactForm, full_name: e.target.value })} className={inputCls} placeholder="Ana García" />
            </Field>
            <Field label="Cargo">
              <input value={contactForm.position} onChange={(e) => setContactForm({ ...contactForm, position: e.target.value })} className={inputCls} placeholder="Directora de operaciones" />
            </Field>
            <Field label="Correo electrónico">
              <input type="email" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} className={inputCls} placeholder="ana@ejemplo.com" />
            </Field>
            <Field label="Teléfono">
              <input type="tel" value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} className={inputCls} placeholder="+212600000000" />
            </Field>
            <Field label="Notas">
              <input value={contactForm.notes} onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })} className={inputCls} placeholder="Información adicional" />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={contactForm.is_primary} onChange={(e) => setContactForm({ ...contactForm, is_primary: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500" />
            Establecer como contacto principal
          </label>
        </Modal>
      )}

      {/* Location modal */}
      {locationModalOpen && (
        <Modal
          title={editingLocation ? 'Editar ubicación' : 'Añadir ubicación'}
          subtitle="Sucursal, propiedad o punto de recogida."
          onClose={() => { setLocationModalOpen(false); setEditingLocation(null); setLocationForm(EMPTY_LOCATION); }}
          onSubmit={handleLocationSubmit}
          submitLabel={editingLocation ? 'Guardar cambios' : 'Añadir ubicación'}
        >
          <Field label="Nombre de la ubicación" required>
            <input required value={locationForm.location_name} onChange={(e) => setLocationForm({ ...locationForm, location_name: e.target.value })} className={inputCls} placeholder="Sede Marrakech" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="País">
              <input value={locationForm.country} onChange={(e) => setLocationForm({ ...locationForm, country: e.target.value })} className={inputCls} placeholder="Marruecos" />
            </Field>
            <Field label="Ciudad">
              <input value={locationForm.city} onChange={(e) => setLocationForm({ ...locationForm, city: e.target.value })} className={inputCls} placeholder="Marrakech" />
            </Field>
            <Field label="Dirección" className="sm:col-span-2">
              <input value={locationForm.address} onChange={(e) => setLocationForm({ ...locationForm, address: e.target.value })} className={inputCls} placeholder="12 Rue Medina" />
            </Field>
            <Field label="Latitud">
              <input value={locationForm.latitude} onChange={(e) => setLocationForm({ ...locationForm, latitude: e.target.value })} className={inputCls} placeholder="31.6295" />
            </Field>
            <Field label="Longitud">
              <input value={locationForm.longitude} onChange={(e) => setLocationForm({ ...locationForm, longitude: e.target.value })} className={inputCls} placeholder="-7.9811" />
            </Field>
          </div>
          <Field label="Notas">
            <textarea value={locationForm.notes} onChange={(e) => setLocationForm({ ...locationForm, notes: e.target.value })} className={inputCls} rows={2} placeholder="Información adicional..." />
          </Field>
        </Modal>
      )}

      {/* Document modal */}
      {documentModalOpen && (
        <Modal
          title="Subir documento"
          subtitle="Licencia, certificado o póliza de seguro."
          onClose={() => { setDocumentModalOpen(false); setDocFile(null); setDocName(''); setDocExpiry(''); setDocNotes(''); }}
          onSubmit={handleDocumentUpload}
          submitLabel={uploadingDoc ? 'Subiendo...' : 'Subir documento'}
          busy={uploadingDoc}
        >
          <Field label="Archivo" required>
            <input type="file" onChange={(e) => setDocFile(e.target.files?.[0] || null)} className={inputCls} />
          </Field>
          <Field label="Nombre del documento">
            <input value={docName} onChange={(e) => setDocName(e.target.value)} className={inputCls} placeholder="Licencia comercial 2024" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tipo de documento">
              <select value={docType} onChange={(e) => setDocType(e.target.value)} className={inputCls}>
                <option value="contract">Contrato</option>
                <option value="license">Licencia</option>
                <option value="tax">Certificado fiscal</option>
                <option value="insurance">Seguro</option>
                <option value="other">Otro</option>
              </select>
            </Field>
            <Field label="Fecha de caducidad">
              <input type="date" value={docExpiry} onChange={(e) => setDocExpiry(e.target.value)} className={inputCls} />
            </Field>
          </div>
          <Field label="Notas">
            <textarea value={docNotes} onChange={(e) => setDocNotes(e.target.value)} className={inputCls} rows={2} placeholder="Observaciones..." />
          </Field>
        </Modal>
      )}

      {/* Contract modal */}
      {contractModalOpen && (
        <Modal
          title={editingContract ? 'Editar contrato' : 'Registrar contrato'}
          subtitle="Acuerdo de servicio con condiciones y validez."
          onClose={() => { setContractModalOpen(false); setEditingContract(null); setContractForm(EMPTY_CONTRACT); }}
          onSubmit={handleContractSubmit}
          submitLabel={editingContract ? 'Guardar cambios' : 'Registrar contrato'}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Referencia" required>
              <input required value={contractForm.contract_reference} onChange={(e) => setContractForm({ ...contractForm, contract_reference: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Tipo de contrato">
              <select value={contractForm.contract_type} onChange={(e) => setContractForm({ ...contractForm, contract_type: e.target.value })} className={inputCls}>
                <option>Master Service Agreement</option>
                <option>Contrato de comisión</option>
                <option>Contrato de suministro</option>
                <option>Otro</option>
              </select>
            </Field>
            <Field label="Fecha de inicio">
              <input type="date" value={contractForm.start_date} onChange={(e) => setContractForm({ ...contractForm, start_date: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Fecha de fin">
              <input type="date" value={contractForm.end_date} min={contractForm.start_date || undefined} onChange={(e) => setContractForm({ ...contractForm, end_date: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Condiciones de pago">
              <select value={contractForm.payment_terms} onChange={(e) => setContractForm({ ...contractForm, payment_terms: e.target.value })} className={inputCls}>
                <option>Net 30</option><option>Net 15</option><option>Net 60</option><option>Pago inmediato</option>
              </select>
            </Field>
            <Field label="Moneda">
              <select value={contractForm.currency} onChange={(e) => setContractForm({ ...contractForm, currency: e.target.value })} className={inputCls}>
                <option value="EUR">EUR</option><option value="USD">USD</option><option value="GBP">GBP</option>
              </select>
            </Field>
            <Field label="Estado">
              <select value={contractForm.status} onChange={(e) => setContractForm({ ...contractForm, status: e.target.value })} className={inputCls}>
                <option value="active">Activo</option>
                <option value="expired">Caducado</option>
                <option value="pending_renewal">Pendiente de renovación</option>
                <option value="terminated">Terminado</option>
              </select>
            </Field>
          </div>
          <Field label="Notas">
            <textarea value={contractForm.notes} onChange={(e) => setContractForm({ ...contractForm, notes: e.target.value })} className={inputCls} rows={2} placeholder="Observaciones del contrato..." />
          </Field>
        </Modal>
      )}
    </div>
  );
}