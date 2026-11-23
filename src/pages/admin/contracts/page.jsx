import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  FileText, Plus, Search, Filter, Download, Eye, CheckCircle2,
  Clock, AlertCircle, XCircle, Users, Calendar, DollarSign,
  Sparkles, RefreshCw, Trash2, Check, ChevronDown, ChevronRight,
  ShieldCheck, ArrowRight, UserCheck, CreditCard, MapPin, X,
  FileSignature, Settings, ExternalLink, Printer, RotateCcw, Wand2,
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
  all: { label: 'Todos los contratos', cls: 'bg-slate-100 text-slate-700 ring-slate-200' },
  draft: { label: 'Borrador', dot: 'bg-slate-400', cls: 'bg-slate-50 text-slate-700 ring-slate-200' },
  pending_signature: { label: 'Pendiente de firma', dot: 'bg-amber-500 animate-pulse', cls: 'bg-amber-50 text-amber-900 ring-amber-300' },
  signed: { label: 'Firmado', dot: 'bg-emerald-500', cls: 'bg-emerald-50 text-emerald-800 ring-emerald-300' },
  confirmed: { label: 'Confirmado', dot: 'bg-teal-500', cls: 'bg-teal-50 text-teal-800 ring-teal-300' },
  cancelled: { label: 'Cancelado', dot: 'bg-rose-500', cls: 'bg-rose-50 text-rose-800 ring-rose-200' },
};

const FILTER_TABS = ['all', 'pending_signature', 'signed', 'draft', 'cancelled'];

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

/* ---------- Empty states ---------- */
function EmptyIllustrationContracts() {
  return (
    <svg viewBox="0 0 320 200" className="mx-auto h-40 w-auto" role="img" aria-label="Ilustración de contratos">
      <ellipse cx="160" cy="184" rx="110" ry="8" className="fill-slate-100" />
      {/* documento trasero */}
      <g transform="rotate(-6 100 100)">
        <rect x="38" y="50" width="120" height="86" rx="12" className="fill-white stroke-slate-200" strokeWidth="2" />
        <rect x="52" y="66" width="52" height="6" rx="3" className="fill-slate-200" />
        <rect x="52" y="80" width="80" height="5" rx="2.5" className="fill-slate-100" />
        <rect x="52" y="92" width="70" height="5" rx="2.5" className="fill-slate-100" />
        <rect x="52" y="104" width="60" height="5" rx="2.5" className="fill-slate-100" />
        <rect x="52" y="116" width="40" height="8" rx="4" className="fill-slate-100" />
      </g>
      {/* documento frontal con sello */}
      <g transform="rotate(4 200 100)">
        <rect x="140" y="62" width="130" height="94" rx="12" className="fill-white stroke-amber-300" strokeWidth="2" />
        <rect x="156" y="76" width="56" height="7" rx="3.5" className="fill-slate-300" />
        <rect x="156" y="90" width="98" height="4" rx="2" className="fill-slate-100" />
        <rect x="156" y="100" width="90" height="4" rx="2" className="fill-slate-100" />
        <rect x="156" y="110" width="80" height="4" rx="2" className="fill-slate-100" />
        <rect x="156" y="120" width="70" height="4" rx="2" className="fill-slate-100" />
        <rect x="156" y="130" width="50" height="4" rx="2" className="fill-slate-100" />
        {/* sello firma */}
        <circle cx="232" cy="130" r="14" className="fill-amber-100" />
        <path d="M225 130l4 4 8-8" className="stroke-amber-600" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {/* insignia */}
      <circle cx="262" cy="52" r="20" className="fill-amber-500" />
      <path d="M262 43v18M253 52h18" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <circle cx="40" cy="40" r="4" className="fill-amber-200" />
      <circle cx="288" cy="120" r="3" className="fill-amber-300" />
      <circle cx="30" cy="150" r="3" className="fill-slate-200" />
    </svg>
  );
}

function EmptyStateContracts({ hasFilters, onClearFilters, onCreate }) {
  if (hasFilters) {
    return (
      <div className="px-6 py-16 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400">
          <Search aria-hidden="true" className="h-6 w-6" />
        </span>
        <h3 className="mt-4 text-base font-semibold text-slate-900">Ningún contrato coincide con estos filtros</h3>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">Prueba con otra búsqueda o quita algunos filtros.</p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <RotateCcw className="h-4 w-4" />Borrar todos los filtros
          </button>
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-600"
          >
            <Plus className="h-4 w-4" />Generar nuevo contrato
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="px-6 py-14 text-center">
      <EmptyIllustrationContracts />
      <h3 className="mt-4 text-xl font-semibold text-slate-900">Aún no hay contratos emitidos</h3>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500">
        Genera el primer contrato oficial coordinado con una reserva existente. Cada contrato incluye las 16 cláusulas normativas.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-600"
        >
          <Sparkles className="h-4 w-4" />Generar primer contrato
        </button>
        <Link
          to="/admin/settings?tab=contracts"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <Settings className="h-4 w-4" />Ajustes de plantilla
        </Link>
      </div>
      <ol className="mx-auto mt-10 grid max-w-3xl gap-3 text-left sm:grid-cols-3">
        {[
          ['Selecciona una reserva', 'Los datos de cliente, viaje, itinerario y servicios se auto-rellenan.'],
          ['Revisa las 16 cláusulas', 'Encabezado, cuenta Santander, condiciones, anexos y firmas.'],
          ['Descarga y envía el PDF', 'Genera el contrato oficial en PDF listo para firmar.'],
        ].map(([title, text], i) => (
          <li key={title} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-amber-500 text-xs font-bold text-white">{i + 1}</span>
            <p className="mt-2 text-sm font-semibold text-slate-900">{title}</p>
            <p className="mt-0.5 text-xs text-slate-500">{text}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ---------- Page ---------- */
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
  const [toastIsError, setToastIsError] = useState(false);

  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');

  const [previewContract, setPreviewContract] = useState(null);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);

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

  const notify = useCallback((msg, isError = false) => {
    setToastMsg(msg);
    setToastIsError(isError);
    setTimeout(() => setToastMsg(null), 3500);
  }, []);

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
      console.error('Load contracts error:', err);
      notify(`No se pudieron cargar los contratos: ${err.message || 'Error desconocido'}`, true);
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  const hasFilters = searchQuery.trim() !== '' || activeTab !== 'all';
  const clearFilters = () => { setSearchQuery(''); setActiveTab('all'); };

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

      const created = await createFullContract({
        contract: newContractPayload,
        participants: participantsPayload,
        itinerary: contractItinerary,
        services: contractServices,
        accommodations: contractAccommodations,
        sections: mainTemplate.sections,
      });

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
    if (!window.confirm(`¿Seguro que desea eliminar el contrato ${ctr.contract_number}? Esta acción no se puede deshacer.`)) return;
    try {
      await deleteContractFromDb(ctr.id);
      notify(`Contrato ${ctr.contract_number} eliminado.`);
      loadData();
    } catch (err) {
      console.error('Error deleting contract:', err);
      notify(`Error al eliminar el contrato: ${err.message || 'Error desconocido'}`, true);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-[1600px] space-y-6 p-6 lg:p-8">
        {/* Toast */}
        {toastMsg && (
          <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-2 rounded-xl text-white px-4 py-2.5 text-xs font-semibold shadow-xl ring-1 ${toastIsError ? 'bg-rose-900 ring-rose-800' : 'bg-slate-900 ring-slate-800'}`}>
            {toastIsError
              ? <AlertCircle className="w-4 h-4 text-rose-300" />
              : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Header & Controls */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">
                <FileSignature className="h-3 w-3" />
                Contratos oficiales
              </span>
              <span className="text-xs text-slate-400">• 16 cláusulas normativas</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              Contratos de viaje y prestación de servicios
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Generación oficial coordinada con reservas, paquetes de viaje, cuenta Santander y anexos organizativos.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/admin/settings?tab=contracts"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition"
              title="Personalizar cláusulas y encabezado"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              <span>Ajustes de plantilla</span>
            </Link>

            <button
              onClick={() => {
                setWizardStep(1);
                setIsGenerateModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm ring-1 ring-inset ring-amber-600/20 hover:bg-amber-600 transition"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generar nuevo contrato</span>
            </button>
          </div>
        </header>

        {/* KPI Summary Strip */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Total contratos</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{metrics.total}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Pendientes de firma</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-amber-600">{metrics.pendingSig}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Firmados y confirmados</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-600">{metrics.signedCount}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Valor en cartera</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{formatMoney(metrics.totalAmount, defaultCur || 'EUR')}</p>
          </div>
        </div>

        {/* Contracts Table Card */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* Search & Status Filters */}
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por número, cliente, pasaporte o destino…"
                className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {FILTER_TABS.map((tab) => {
                const active = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      active
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {CONTRACT_STATUSES[tab]?.label || tab}
                  </button>
                );
              })}
            </div>
          </div>

          {hasFilters && filteredContracts.length > 0 && (
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-4 py-2 text-xs text-slate-500">
              <span>{filteredContracts.length} de {contracts.length} contratos</span>
              <button onClick={clearFilters} className="font-medium text-amber-700 hover:text-amber-800 underline underline-offset-2">
                Borrar filtros
              </button>
            </div>
          )}

          {/* Table Rows */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-stone-50 border-b border-slate-100 text-xs font-medium text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Contrato</th>
                  <th className="py-3 px-4">Cliente contratante</th>
                  <th className="py-3 px-4">Viaje y fechas</th>
                  <th className="py-3 px-4 text-right">Importe / Depósito 40%</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-600" />
                      Cargando contratos…
                    </td>
                  </tr>
                ) : filteredContracts.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyStateContracts
                        hasFilters={hasFilters}
                        onClearFilters={clearFilters}
                        onCreate={() => { setWizardStep(1); setIsGenerateModalOpen(true); }}
                      />
                    </td>
                  </tr>
                ) : (
                  filteredContracts.map((ctr) => {
                    const mainP = ctr.participants?.find((p) => p.is_primary_contact) || ctr.participants?.[0] || {};
                    const dep = ctr.deposit_amount || Math.round((ctr.total_amount || 0) * 0.4);
                    const isBusy = generatingPdfId === ctr.id;

                    return (
                      <tr key={ctr.id} className="transition-colors hover:bg-amber-50/40">
                        <td className="py-3.5 px-4">
                          <div className="font-mono font-bold text-slate-900">{ctr.contract_number}</div>
                          <div className="text-xs text-slate-400">
                            {ctr.contract_date ? new Date(ctr.contract_date).toLocaleDateString('es-ES') : '—'}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <ClientAvatar name={mainP.full_name || ctr.customer_name} />
                            <div>
                              <p className="font-bold text-slate-900">{mainP.full_name || ctr.customer_name || 'Cliente'}</p>
                              <p className="text-xs text-slate-400 font-mono">{mainP.document_number || 'Doc. pendiente'}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">{ctr.trip_title}</div>
                          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                            <span>{ctr.duration_days || 1} días</span>
                            <span>•</span>
                            <span>{ctr.start_date ? new Date(ctr.start_date).toLocaleDateString('es-ES') : 'A convenir'}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="font-mono font-bold text-slate-900">
                            {formatMoney(ctr.total_amount || 0, ctr.currency || 'EUR')}
                          </div>
                          <div className="text-xs font-medium text-emerald-700">
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
                              className="inline-flex items-center gap-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white px-2.5 py-1.5 text-xs font-semibold shadow-sm transition disabled:opacity-60"
                              title="Descargar PDF oficial (16 artículos)"
                            >
                              {isBusy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                              <span className="hidden sm:inline">PDF</span>
                            </button>

                            {ctr.status !== 'signed' && (
                              <button
                                onClick={() => handleMarkSigned(ctr)}
                                className="rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 p-1.5 transition"
                                title="Marcar como firmado"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              onClick={() => handleDelete(ctr)}
                              className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
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
      </div>

      {/* ================= FAST GENERATE CONTRACT MODAL ================= */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-6 py-4 text-white">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold">Generador oficial de contratos (16 cláusulas)</h3>
              </div>
              <button onClick={() => setIsGenerateModalOpen(false)} className="rounded p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[75vh] space-y-5 overflow-y-auto p-6 text-xs">
              {/* Step 1: Booking Auto-Fill */}
              <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                <label className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                  <Wand2 className="h-3.5 w-3.5" />
                  Selecciona una reserva para auto-coordinación de datos
                </label>
                <select
                  value={selectedBookingId}
                  onChange={(e) => handleSelectBooking(e.target.value)}
                  className="w-full rounded-lg border border-amber-300 bg-white p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">-- Seleccionar una reserva activa --</option>
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block font-semibold text-slate-700">Nombre completo del cliente</label>
                  <input
                    type="text"
                    value={contractForm.customer_name}
                    onChange={(e) => setContractForm({ ...contractForm, customer_name: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    placeholder="p. ej. Carlos Mendoza Ruiz"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-slate-700">DNI / Pasaporte / Documento</label>
                  <input
                    type="text"
                    value={contractForm.customer_document}
                    onChange={(e) => setContractForm({ ...contractForm, customer_document: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    placeholder="PA49201948"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-slate-700">Teléfono de contacto</label>
                  <input
                    type="text"
                    value={contractForm.customer_phone}
                    onChange={(e) => setContractForm({ ...contractForm, customer_phone: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    placeholder="+34 622 890 123"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-slate-700">Correo electrónico</label>
                  <input
                    type="email"
                    value={contractForm.customer_email}
                    onChange={(e) => setContractForm({ ...contractForm, customer_email: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    placeholder="cliente@email.com"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-slate-700">Título del viaje seleccionado</label>
                  <input
                    type="text"
                    value={contractForm.trip_title}
                    onChange={(e) => setContractForm({ ...contractForm, trip_title: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    placeholder="Gran Tour de Marruecos y Desierto"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-slate-700">Modalidad de viaje</label>
                  <input
                    type="text"
                    value={contractForm.travel_modality}
                    onChange={(e) => setContractForm({ ...contractForm, travel_modality: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    placeholder="Circuito privado con chófer y guía"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-slate-700">Fechas del viaje (salida – regreso)</label>
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
                  <label className="mb-1 block font-semibold text-slate-700">Lugar de formalización</label>
                  <input
                    type="text"
                    value={contractForm.signed_place}
                    onChange={(e) => setContractForm({ ...contractForm, signed_place: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                    placeholder="Marrakech"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-slate-700">Precio total acordado ({contractForm.currency})</label>
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
                  <label className="mb-1 block font-semibold text-slate-700">Depósito 40% (restante 60% en Marruecos)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={contractForm.deposit_amount}
                      readOnly
                      className="w-1/2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-emerald-800"
                    />
                    <span className="text-[11px] font-medium text-slate-500">
                      Saldo restante 60%: <strong>{contractForm.remaining_amount} {contractForm.currency}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Verified Features Checklist */}
              <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600">
                <p className="font-bold text-slate-800">El contrato se generará con las 16 secciones oficiales:</p>
                <p>✓ Encabezado con logotipo, teléfonos, dirección y C.P. 04740</p>
                <p>✓ Cláusula 6: cuenta Banco Santander y SWIFT/BIC oficial</p>
                <p>✓ Cláusula 6: estipulación del 40% en 5 días y 60% en efectivo en Marruecos</p>
                <p>✓ Cláusula 7: política de cancelación no reembolsable tras 21 días</p>
                <p>✓ Cláusula 10: supuestos de fuerza mayor (tráfico, tormentas, pandemias)</p>
                <p>✓ Anexo N.º 1 con condiciones organizativas, organizador, participante y firmas</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setIsGenerateModalOpen(false)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleCreateAndDownload}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-500 transition"
              >
                <Download className="w-4 h-4" />
                <span>Generar y descargar PDF (16 secciones)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}