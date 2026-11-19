import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  FileText, Plus, Search, Filter, Download, Eye, CheckCircle2,
  Clock, AlertCircle, XCircle, Users, Calendar, DollarSign,
  Sparkles, RefreshCw, Trash2, Check, ChevronDown, ChevronRight,
  ShieldCheck, ArrowRight, UserCheck, CreditCard, MapPin, X,
  FileSignature, Settings, ExternalLink, Printer,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client.jsx';
import { useAuth, translate, useAppSettings } from '@/context/index.jsx';
import { buildContractPdf } from '@/services/documents/contractPdfService.js';
import {
  fetchContracts,
  fetchContractTemplates,
  fetchBookingWithFullDetails,
  fetchPackageWithFullDetails,
  createFullContract,
  updateContractStatusInDb,
  deleteContractFromDb,
} from './contractsService.js';
import { DEFAULT_TEMPLATES } from './defaultTemplates.js';
import {
  replaceTemplateVariables,
  getSavedContractHeaderSettings,
  getSavedContractTemplate,
} from './templateEngine.js';

/* ---------- STATUS BADGES ---------- */
const CONTRACT_STATUSES = {
  all: { label: 'Todos los Contratos', cls: 'bg-slate-100 text-slate-700 ring-slate-200' },
  draft: { label: 'Borrador', dot: 'bg-slate-400', cls: 'bg-slate-50 text-slate-700 ring-slate-200' },
  pending_signature: { label: 'Pendiente de Firma', dot: 'bg-amber-500 animate-pulse', cls: 'bg-amber-50 text-amber-900 ring-amber-300' },
  signed: { label: 'Firmado', dot: 'bg-emerald-500', cls: 'bg-emerald-50 text-emerald-800 ring-emerald-300' },
  confirmed: { label: 'Confirmado', dot: 'bg-teal-500', cls: 'bg-teal-50 text-teal-800 ring-teal-300' },
  cancelled: { label: 'Cancelado', dot: 'bg-rose-500', cls: 'bg-rose-50 text-rose-800 ring-rose-200' },
};

function StatusBadge({ status }) {
  const s = CONTRACT_STATUSES[status] || CONTRACT_STATUSES.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ring-inset ${s.cls}`}>
      {s.dot && <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />}
      {s.label}
    </span>
  );
}

function ClientAvatar({ name }) {
  const initials = (name || 'Cliente')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');

  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 text-white font-bold text-xs flex items-center justify-center shadow-2xs shrink-0 ring-2 ring-white">
      {initials || 'CL'}
    </div>
  );
}

export default function ContractsPage() {
  const { user } = useAuth();
  const { formatMoney, invoice: agencyInvoiceSettings, currency: defaultCur } = useAppSettings();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  /* ---------- STATE ---------- */
  const [contracts, setContracts] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [packages, setPackages] = useState([]);
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const [loading, setLoading] = useState(true);
  const [generatingPdfId, setGeneratingPdfId] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  // Filters & Search
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');

  // Modals
  const [previewContract, setPreviewContract] = useState(null);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1); // 1: Select Booking & Coordinate | 2: Review & Generate

  // Form State for Contract Generation
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [contractForm, setContractForm] = useState({
    contract_number: `CTR-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
    trip_title: '',
    destination: 'Marruecos',
    start_date: '',
    end_date: '',
    duration_days: 7,
    duration_nights: 6,
    travel_modality: 'Circuito Privado con Chófer y Guía',
    total_amount: 1200,
    deposit_percentage: 40,
    deposit_amount: 480,
    remaining_amount: 720,
    currency: defaultCur || 'EUR',
    signed_place: 'Marrakech',
    customer_name: '',
    customer_document: '',
    customer_phone: '',
    customer_email: '',
    customer_address: '',
    customer_country: 'España',
  });
  const [contractItinerary, setContractItinerary] = useState([]);
  const [contractServices, setContractServices] = useState([]);
  const [contractAccommodations, setContractAccommodations] = useState([]);

  const notify = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  /* ---------- DATA FETCHING ---------- */
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [loadedContracts, loadedTemplates, bRes, oRes] = await Promise.all([
        fetchContracts(),
        fetchContractTemplates(),
        supabase.from('bookings').select('*, customers(full_name, phone, email, country, passport_number)').order('created_at', { ascending: false }),
        supabase.from('offers').select('*').order('created_at', { ascending: false }),
      ]);

      setContracts(loadedContracts || []);
      setTemplates(loadedTemplates || DEFAULT_TEMPLATES);
      setBookings(bRes?.data || []);
      setPackages(oRes?.data || []);
    } catch (err) {
      console.warn('Load contracts error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle direct link with ?booking_id=...
  useEffect(() => {
    const bId = searchParams.get('booking_id');
    if (bId && bookings.length > 0) {
      handleSelectBooking(bId);
      setIsGenerateModalOpen(true);
    }
  }, [searchParams, bookings]);

  /* ---------- FILTERING & KPI METRICS ---------- */
  const filteredContracts = useMemo(() => {
    return contracts
      .filter((c) => {
        if (activeTab !== 'all' && c.status !== activeTab) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const mainP = c.participants?.find((p) => p.is_primary_contact) || c.participants?.[0];
          const matchNumber = c.contract_number?.toLowerCase().includes(q);
          const matchTitle = c.trip_title?.toLowerCase().includes(q);
          const matchCustomer = mainP?.full_name?.toLowerCase().includes(q) || mainP?.document_number?.toLowerCase().includes(q);
          if (!matchNumber && !matchTitle && !matchCustomer) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date_desc') return new Date(b.created_at || b.contract_date) - new Date(a.created_at || a.contract_date);
        if (sortBy === 'date_asc') return new Date(a.created_at || a.contract_date) - new Date(b.created_at || b.contract_date);
        if (sortBy === 'amount_desc') return Number(b.total_amount || 0) - Number(a.total_amount || 0);
        if (sortBy === 'amount_asc') return Number(a.total_amount || 0) - Number(b.total_amount || 0);
        return 0;
      });
  }, [contracts, activeTab, searchQuery, sortBy]);

  const metrics = useMemo(() => {
    const total = contracts.length;
    const pendingSig = contracts.filter((c) => c.status === 'pending_signature').length;
    const signedCount = contracts.filter((c) => c.status === 'signed' || c.status === 'confirmed').length;
    const totalAmount = contracts
      .filter((c) => c.status !== 'cancelled')
      .reduce((sum, c) => sum + Number(c.total_amount || 0), 0);

    return { total, pendingSig, signedCount, totalAmount };
  }, [contracts]);

  /* ---------- COORDINATE BOOKING / PACKAGE / CUSTOMER ---------- */
  const handleSelectBooking = async (bId) => {
    setSelectedBookingId(bId);
    if (!bId) return;

    const fullBookingData = await fetchBookingWithFullDetails(bId);
    if (!fullBookingData || !fullBookingData.booking) return;

    const { booking: b, customer: cust, offerDetails } = fullBookingData;

    const total = Number(b.total_amount || 0);
    const dep = Math.round(total * 0.4);
    const rem = total - dep;

    let dDays = 1;
    let dNights = 0;
    if (b.start_date && b.end_date) {
      const d1 = new Date(b.start_date);
      const d2 = new Date(b.end_date);
      const diffTime = Math.abs(d2 - d1);
      dDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      dNights = Math.max(0, dDays - 1);
    }

    setContractForm((prev) => ({
      ...prev,
      trip_title: b.offer_title || offerDetails?.offer?.public_title || `Viaje a ${b.destination || 'Marruecos'}`,
      destination: b.destination || offerDetails?.offer?.destination_country || 'Marruecos',
      start_date: b.start_date || '',
      end_date: b.end_date || '',
      duration_days: dDays,
      duration_nights: dNights,
      total_amount: total,
      deposit_percentage: 40,
      deposit_amount: dep,
      remaining_amount: rem,
      currency: b.currency || defaultCur || 'EUR',
      customer_name: cust?.full_name || '',
      customer_document: cust?.passport_number || cust?.id_number || '',
      customer_phone: cust?.phone || '',
      customer_email: cust?.email || '',
      customer_address: cust?.address || '',
      customer_country: cust?.country || 'España',
    }));

    if (offerDetails) {
      if (offerDetails.itinerary && offerDetails.itinerary.length > 0) {
        setContractItinerary(offerDetails.itinerary);
      }
      if (offerDetails.inclusionsExclusions && offerDetails.inclusionsExclusions.length > 0) {
        setContractServices(
          offerDetails.inclusionsExclusions.map((ie) => ({
            service_type: ie.type === 'inclusion' ? 'included' : 'excluded',
            title_es: ie.title || ie.description || '',
          }))
        );
      }
      if (offerDetails.accommodations && offerDetails.accommodations.length > 0) {
        setContractAccommodations(
          offerDetails.accommodations.map((a) => ({
            accommodation_name: a.hotel_name || a.name || 'Hotel/Riad',
            location: a.city || a.location || '',
            room_type: a.room_type || 'Habitación Doble',
          }))
        );
      }
    }
  };

  /* ---------- GENERATE PDF & SAVE ---------- */
  const handleDownloadPdf = async (contract) => {
    try {
      setGeneratingPdfId(contract.id);
      const headerSettings = getSavedContractHeaderSettings();
      const doc = await buildContractPdf({
        contract,
        participants: contract.participants || [],
        itinerary: contract.itinerary || [],
        pricing: contract.pricing_items || [],
        services: contract.services || [],
        accommodations: contract.accommodations || [],
        sections: contract.sections || getSavedContractTemplate().sections,
        agencyConfig: {
          ...agencyInvoiceSettings,
          ...headerSettings,
        },
      });
      doc.save(`${contract.contract_number || 'CONTRATO-VIAJE'}.pdf`);
      notify(`PDF descargado: ${contract.contract_number}`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      notify('Error al generar el PDF del contrato.');
    } finally {
      setGeneratingPdfId(null);
    }
  };

  const handleCreateAndDownload = async () => {
    try {
      setLoading(true);
      const headerSettings = getSavedContractHeaderSettings();
      const mainTemplate = getSavedContractTemplate();

      const newContractPayload = {
        contract_number: contractForm.contract_number,
        booking_id: selectedBookingId || null,
        status: 'pending_signature',
        primary_language: 'es',
        trip_title: contractForm.trip_title,
        destination: contractForm.destination,
        start_date: contractForm.start_date || null,
        end_date: contractForm.end_date || null,
        duration_days: contractForm.duration_days,
        duration_nights: contractForm.duration_nights,
        travel_modality: contractForm.travel_modality,
        total_amount: contractForm.total_amount,
        deposit_percentage: contractForm.deposit_percentage,
        deposit_amount: contractForm.deposit_amount,
        remaining_amount: contractForm.remaining_amount,
        currency: contractForm.currency,
        bank_account_iban: headerSettings.bank_account_iban,
        bank_account_swift: headerSettings.bank_account_swift,
        agency_name: headerSettings.agency_name,
        agency_cif: headerSettings.agency_cif,
        agency_address: headerSettings.agency_address,
        agency_postal_code: headerSettings.agency_postal_code,
        agency_city: headerSettings.agency_city,
        agency_country: headerSettings.agency_country,
        agency_phone: headerSettings.agency_phone,
        agency_email: headerSettings.agency_email,
        signed_place: contractForm.signed_place,
        contract_date: new Date().toISOString(),
        sections: mainTemplate.sections,
      };

      const participantsPayload = [
        {
          full_name: contractForm.customer_name || 'Cliente',
          document_number: contractForm.customer_document || '—',
          phone: contractForm.customer_phone || '',
          email: contractForm.customer_email || '',
          address: contractForm.customer_address || '',
          nationality: contractForm.customer_country || 'España',
          is_primary_contact: true,
          signature_status: 'pending',
        },
      ];

      // Save to Supabase DB
      const created = await createFullContract({
        contract: newContractPayload,
        participants: participantsPayload,
        itinerary: contractItinerary,
        services: contractServices,
        accommodations: contractAccommodations,
        sections: mainTemplate.sections,
      });

      // Generate & Download the official 16-section PDF immediately
      const doc = await buildContractPdf({
        contract: { ...newContractPayload, ...created },
        participants: participantsPayload,
        itinerary: contractItinerary,
        services: contractServices,
        accommodations: contractAccommodations,
        sections: mainTemplate.sections,
        agencyConfig: headerSettings,
      });

      doc.save(`${contractForm.contract_number}.pdf`);
      notify(`Contrato ${contractForm.contract_number} generado y descargado.`);

      setIsGenerateModalOpen(false);
      loadData();
    } catch (err) {
      console.error('Error creating contract:', err);
      notify('Error al crear el contrato.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkSigned = async (ctr) => {
    try {
      await updateContractStatusInDb(ctr.id, 'signed');
      notify(`Contrato ${ctr.contract_number} marcado como Firmado.`);
      loadData();
    } catch (err) {
      notify('No se pudo actualizar el estado.');
    }
  };

  const handleDelete = async (ctr) => {
    if (!window.confirm(`¿Seguro que desea eliminar el contrato ${ctr.contract_number}?`)) return;
    try {
      await deleteContractFromDb(ctr.id);
      notify(`Contrato ${ctr.contract_number} eliminado.`);
      loadData();
    } catch (err) {
      notify('Error al eliminar el contrato.');
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 p-6 lg:p-8 space-y-6">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-2.5 text-xs font-semibold shadow-xl ring-1 ring-slate-800 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
              CONTRATOS OFICIALES
            </span>
            <span className="text-xs text-slate-400">• 16 Cláusulas Normativas</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Contratos de Viaje y Prestación de Servicios
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Generación oficial coordinada con reservas, paquetes de viaje, cuenta Santander y anexos organizativos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/admin/settings?tab=contracts"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
            title="Personalizar cláusulas y encabezado"
          >
            <Settings className="w-3.5 h-3.5 text-slate-400" />
            <span>Ajustes de Plantilla</span>
          </Link>

          <button
            onClick={() => {
              setWizardStep(1);
              setIsGenerateModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-amber-500 transition"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generar Nuevo Contrato</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Total Contratos</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{metrics.total}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Pendientes de Firma</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{metrics.pendingSig}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Firmados y Confirmados</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{metrics.signedCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Valor en Cartera</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{formatMoney(metrics.totalAmount, defaultCur || 'EUR')}</p>
        </div>
      </div>

      {/* Simplified Contracts Table Card */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden space-y-3">
        {/* Search & Status Filters */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por número, cliente, pasaporte o destino…"
              className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {['all', 'pending_signature', 'signed', 'draft', 'cancelled'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === tab
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {CONTRACT_STATUSES[tab]?.label || tab}
              </button>
            ))}
          </div>
        </div>

        {/* Table Rows */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-stone-50 border-b border-slate-100 text-slate-500 uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Contrato</th>
                <th className="py-3 px-4">Cliente Contratante</th>
                <th className="py-3 px-4">Viaje y Fechas</th>
                <th className="py-3 px-4 text-right">Importe / Depósito (40%)</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredContracts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium text-slate-600">No se encontraron contratos</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Haga clic en "Generar Nuevo Contrato" para emitir uno coordinado con una reserva.</p>
                  </td>
                </tr>
              ) : (
                filteredContracts.map((ctr) => {
                  const mainP = ctr.participants?.find((p) => p.is_primary_contact) || ctr.participants?.[0] || {};
                  const dep = ctr.deposit_amount || Math.round((ctr.total_amount || 0) * 0.4);
                  const isBusy = generatingPdfId === ctr.id;

                  return (
                    <tr key={ctr.id} className="hover:bg-amber-50/40 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900">{ctr.contract_number}</div>
                        <div className="text-[11px] text-slate-400">{ctr.contract_date ? new Date(ctr.contract_date).toLocaleDateString() : '—'}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <ClientAvatar name={mainP.full_name || ctr.customer_name} />
                          <div>
                            <p className="font-bold text-slate-900">{mainP.full_name || ctr.customer_name || 'Cliente'}</p>
                            <p className="text-[11px] text-slate-400 font-mono">{mainP.document_number || 'Doc pendiente'}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{ctr.trip_title}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span>{ctr.duration_days || 1} días</span>
                          <span>•</span>
                          <span>{ctr.start_date ? new Date(ctr.start_date).toLocaleDateString() : 'A convenir'}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="font-bold text-slate-900 font-mono">
                          {formatMoney(ctr.total_amount || 0, ctr.currency || 'EUR')}
                        </div>
                        <div className="text-[11px] text-emerald-700 font-medium">
                          Depósito 40%: {formatMoney(dep, ctr.currency || 'EUR')}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <StatusBadge status={ctr.status} />
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleDownloadPdf(ctr)}
                            disabled={isBusy}
                            className="inline-flex items-center gap-1 rounded bg-amber-600 hover:bg-amber-500 text-white px-2.5 py-1.5 text-xs font-semibold shadow-2xs transition"
                            title="Descargar PDF Oficial (16 Artículos)"
                          >
                            {isBusy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                            <span className="hidden sm:inline">PDF</span>
                          </button>

                          {ctr.status !== 'signed' && (
                            <button
                              onClick={() => handleMarkSigned(ctr)}
                              className="rounded border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 p-1.5 transition"
                              title="Marcar como Firmado"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => handleDelete(ctr)}
                            className="rounded p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Eliminar contrato"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= FAST GENERATE CONTRACT MODAL ================= */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-3xl rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm">Generador Oficial de Contratos (16 Cláusulas)</h3>
              </div>
              <button onClick={() => setIsGenerateModalOpen(false)} className="rounded p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-xs">
              {/* Step 1: Booking Auto-Fill */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-2">
                <label className="block font-bold text-amber-950 text-xs">
                  Seleccionar Reserva para Auto-coordinación de Datos:
                </label>
                <select
                  value={selectedBookingId}
                  onChange={(e) => handleSelectBooking(e.target.value)}
                  className="w-full rounded-lg border border-amber-300 bg-white p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">-- Seleccionar una reserva activa para auto-rellenar --</option>
                  {bookings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.booking_reference || b.id.slice(0, 8)} — {b.customers?.full_name || 'Cliente'} — {b.offer_title || b.destination || 'Viaje'} ({formatMoney(b.total_amount, b.currency || 'EUR')})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-amber-800">
                  Al seleccionar una reserva, se coordinan automáticamente los datos del cliente, el itinerario día a día, los servicios incluidos/excluidos y los alojamientos.
                </p>
              </div>

              {/* Form Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nombre Completo del Cliente</label>
                  <input
                    type="text"
                    value={contractForm.customer_name}
                    onChange={(e) => setContractForm({ ...contractForm, customer_name: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
                    placeholder="e.g. Carlos Mendoza Ruiz"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">DNI / Pasaporte / Documento</label>
                  <input
                    type="text"
                    value={contractForm.customer_document}
                    onChange={(e) => setContractForm({ ...contractForm, customer_document: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
                    placeholder="PA49201948"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Teléfono de Contacto</label>
                  <input
                    type="text"
                    value={contractForm.customer_phone}
                    onChange={(e) => setContractForm({ ...contractForm, customer_phone: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
                    placeholder="+34 622 890 123"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    value={contractForm.customer_email}
                    onChange={(e) => setContractForm({ ...contractForm, customer_email: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
                    placeholder="cliente@email.com"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Título del Viaje Seleccionado</label>
                  <input
                    type="text"
                    value={contractForm.trip_title}
                    onChange={(e) => setContractForm({ ...contractForm, trip_title: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
                    placeholder="Gran Tour de Marruecos & Desierto"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Modalidad de Viaje</label>
                  <input
                    type="text"
                    value={contractForm.travel_modality}
                    onChange={(e) => setContractForm({ ...contractForm, travel_modality: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
                    placeholder="Circuito Privado con Chófer y Guía"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fechas del Viaje (Salida - Regreso)</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={contractForm.start_date}
                      onChange={(e) => setContractForm({ ...contractForm, start_date: e.target.value })}
                      className="w-1/2 rounded-lg border border-slate-200 px-3 py-2 text-xs"
                    />
                    <input
                      type="date"
                      value={contractForm.end_date}
                      onChange={(e) => setContractForm({ ...contractForm, end_date: e.target.value })}
                      className="w-1/2 rounded-lg border border-slate-200 px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Lugar de Formalización</label>
                  <input
                    type="text"
                    value={contractForm.signed_place}
                    onChange={(e) => setContractForm({ ...contractForm, signed_place: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                    placeholder="Marrakech"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Precio Total Acordado ({contractForm.currency})</label>
                  <input
                    type="number"
                    value={contractForm.total_amount}
                    onChange={(e) => {
                      const tot = Number(e.target.value);
                      const dep = Math.round((tot * (contractForm.deposit_percentage || 40)) / 100);
                      setContractForm({
                        ...contractForm,
                        total_amount: tot,
                        deposit_amount: dep,
                        remaining_amount: tot - dep,
                      });
                    }}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Depósito 40% (Restante 60% en Marruecos)</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      value={contractForm.deposit_amount}
                      readOnly
                      className="w-1/2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-emerald-800"
                    />
                    <span className="text-[11px] text-slate-500 font-medium">
                      Saldo restante 60%: <strong>{contractForm.remaining_amount} {contractForm.currency}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Verified Features Checklist */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1 text-[11px] text-slate-600">
                <p className="font-bold text-slate-800">El contrato se generará con las 16 secciones oficiales:</p>
                <p>✓ Encabezado con logotipo, teléfonos, dirección y C.P. 04740</p>
                <p>✓ Cláusula 6: Cuenta Banco Santander y SWIFT/BIC oficial</p>
                <p>✓ Cláusula 6: Estipulación del 40% en 5 días y 60% en efectivo en Marruecos</p>
                <p>✓ Cláusula 7: Política de cancelación no reembolsable tras 21 días</p>
                <p>✓ Cláusula 10: Supuestos de fuerza mayor (tráfico, tormentas, pandemias)</p>
                <p>✓ Anexo N.º 1 con condiciones organizativas, organizador, participante y firmas</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50">
              <button
                type="button"
                onClick={() => setIsGenerateModalOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleCreateAndDownload}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-500 transition"
              >
                <Download className="w-4 h-4" />
                <span>Generar y Descargar PDF (16 Secciones)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
