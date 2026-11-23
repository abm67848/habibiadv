import React, { useMemo, useState } from 'react';
import {
  Settings,
  Shield,
  Key,
  Bell,
  Database,
  Globe,
  Mail,
  Lock,
  Save,
  CheckCircle2,
  Receipt,
  Languages,
  DollarSign,
  FileText,
  RotateCcw,
  Building,
  Building2,
  Phone,
  FileCheck,
  Eye,
  Check,
  Sparkles,
  UserRound,
  Wrench,
  Quote,
  Search,
  ExternalLink,
  ChevronRight,
  SlidersHorizontal,
  Compass,
  MapPin,
  Handshake,
} from 'lucide-react';
import { useAuth, translate, useAppSettings, ADMIN_LANGUAGES, CURRENCY_LIST, DEFAULT_INVOICE_SETTINGS } from '@/context/index.jsx';
import { SYSTEM_ROLES, formatRoleLabel, formatRoleDescription } from '@/config/rolesConfig.js';

import ContractTemplateSettingsTab from './ContractTemplateSettingsTab.jsx';
import AccountSettingsTab from './AccountSettingsTab.jsx';
import ServicesSettingsTab from './ServicesSettingsTab.jsx';
import ReviewsSettingsTab from './ReviewsSettingsTab.jsx';
import AboutSettingsTab from './AboutSettingsTab.jsx';
import ContactSettingsTab from './ContactSettingsTab.jsx';
import DestinationsSettingsTab from './DestinationsSettingsTab.jsx';
import PartnershipsSettingsTab from './PartnershipsSettingsTab.jsx';

/* ------------------------------------------------------------------ */
/*  Categorized Settings Structure                                    */
/* ------------------------------------------------------------------ */
const SETTINGS_CATEGORIES = [
  {
    id: 'agency',
    label: 'Agencia y operaciones',
    icon: Building2,
    description: 'Configuración general, moneda del proyecto, identidad de factura y plantillas contractuales',
    tabs: [
      {
        id: 'general',
        label: 'General y moneda',
        hint: 'Marca de agencia, zona horaria y moneda base',
        icon: DollarSign,
      },
      {
        id: 'invoice',
        label: 'Plantilla de factura',
        hint: 'Datos de facturación, fiscales y diseño PDF',
        icon: Receipt,
      },
      {
        id: 'contracts',
        label: 'Plantillas de contrato',
        hint: '16 cláusulas legales oficiales y generador',
        icon: FileText,
      },
      {
        id: 'language',
        label: 'Idioma del administrador',
        hint: 'Idioma del panel (ES, EN, FR, AR)',
        icon: Languages,
      },
    ],
  },
  {
    id: 'website',
    label: 'Sitio web público (CMS)',
    icon: Globe,
    description: 'Personalice las páginas públicas, servicios, reseñas y datos de contacto',
    tabs: [
      {
        id: 'services',
        label: 'Página de servicios',
        hint: 'Catálogo, inclusiones, categorías y llamada a la acción',
        icon: Wrench,
        liveUrl: '/services',
      },
      {
        id: 'reviews',
        label: 'Reseñas de inicio',
        hint: 'Carrusel de testimonios, valoraciones y citas',
        icon: Quote,
        liveUrl: '/#reviews',
      },
      {
        id: 'about',
        label: 'Página Nosotros',
        hint: 'Equipo, hitos, historia y valores',
        icon: Globe,
        liveUrl: '/about',
      },
      {
        id: 'contact',
        label: 'Página de contacto',
        hint: 'Horarios, WhatsApp, teléfono, correo y preguntas frecuentes',
        icon: Phone,
        liveUrl: '/contact',
      },
      {
        id: 'destinations',
        label: 'Destinos',
        hint: 'Gestionar el catálogo de destinos turísticos',
        icon: MapPin,
        liveUrl: '/destinations',
      },
      {
        id: 'partnerships',
        label: 'Asociaciones',
        hint: 'Cuadrícula de socios y encabezado de inicio',
        icon: Handshake,
        liveUrl: '/#partnerships',
      },
    ],
  },
  {
    id: 'system',
    label: 'Seguridad y sistema',
    icon: Shield,
    description: 'Credenciales, permisos de roles y estado de conexión de la base de datos',
    tabs: [
      {
        id: 'account',
        label: 'Cuenta y zona peligrosa',
        hint: 'Credenciales, perfil y eliminación de cuenta',
        icon: UserRound,
        badge: 'Sensible',
      },
      {
        id: 'security',
        label: 'Roles y seguridad',
        hint: 'Definiciones de roles y permisos de páginas',
        icon: Lock,
      },
      {
        id: 'database',
        label: 'Estado del sistema',
        hint: 'Servidor de Supabase y extensiones',
        icon: Database,
      },
    ],
  },
];

export default function SettingsPage() {
  const { user, roles, isSuperAdmin } = useAuth();
  const {
    settings,
    currency,
    adminLanguage,
    invoice,
    updateSettings,
    setCurrency,
    setAdminLanguage,
    updateInvoiceSettings,
    resetSettings,
    t,
    formatMoney,
  } = useAppSettings();

  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam) return tabParam;
    }
    return 'general';
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [saved, setSaved] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  // Form local states initialized from settings context
  const [generalForm, setGeneralForm] = useState({
    agencyName: settings.agencyName,
    contactEmail: settings.contactEmail,
    timezone: settings.timezone,
    currency: currency,
  });

  const [invoiceForm, setInvoiceForm] = useState({
    brand: invoice.brand || '',
    tagline: invoice.tagline || '',
    companyName: invoice.companyName || '',
    addressLine1: invoice.addressLine1 || '',
    addressLine2: invoice.addressLine2 || '',
    phone: invoice.phone || '',
    email: invoice.email || '',
    website: invoice.website || '',
    taxNumber: invoice.taxNumber || '',
    invoicePrefix: invoice.invoicePrefix || 'INV',
    creditNotePrefix: invoice.creditNotePrefix || 'CN',
    notes: invoice.notes || '',
    footerNote: invoice.footerNote || '',
    vatRate: invoice.vatRate !== undefined ? invoice.vatRate : 0,
  });

  const triggerSaveNotification = (msg) => {
    setSavedMsg(msg || t('saved_successfully', 'Settings saved successfully!'));
    setSaved(true);
    setTimeout(() => setSaved(false), 3500);
  };

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location);
      url.searchParams.set('tab', tabId);
      window.history.replaceState({}, '', url);
    }
  };

  const handleSaveGeneral = (e) => {
    e.preventDefault();
    updateSettings({
      agencyName: generalForm.agencyName,
      contactEmail: generalForm.contactEmail,
      timezone: generalForm.timezone,
      currency: generalForm.currency,
    });
    triggerSaveNotification('¡Configuración general de la agencia y moneda actualizadas!');
  };

  const handleSaveInvoice = (e) => {
    e.preventDefault();
    updateInvoiceSettings(invoiceForm);
    triggerSaveNotification('¡Los datos de la plantilla de factura se actualizaron correctamente!');
  };

  const handleSelectLanguage = (langCode) => {
    setAdminLanguage(langCode);
    triggerSaveNotification(`¡Idioma del administrador cambiado a ${ADMIN_LANGUAGES.find((l) => l.code === langCode)?.name}!`);
  };

  const handleResetDefaults = () => {
    if (window.confirm('¿Restablecer los ajustes de facturas y generales a los valores predeterminados?')) {
      resetSettings();
      setGeneralForm({
        agencyName: 'Habibi Adventure',
        contactEmail: 'habibiadventure.26@gmail.com',
        timezone: 'Africa/Casablanca (UTC+1)',
        currency: 'MAD',
      });
      setInvoiceForm({ ...DEFAULT_INVOICE_SETTINGS });
      triggerSaveNotification('¡Configuración restablecida a los valores predeterminados!');
    }
  };

  // Find active category and tab metadata
  const activeMeta = useMemo(() => {
    for (const cat of SETTINGS_CATEGORIES) {
      const found = cat.tabs.find((tab) => tab.id === activeTab);
      if (found) {
        return { category: cat, tab: found };
      }
    }
    return { category: SETTINGS_CATEGORIES[0], tab: SETTINGS_CATEGORIES[0].tabs[0] };
  }, [activeTab]);

  // Filtered categories based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return SETTINGS_CATEGORIES;
    const q = searchQuery.toLowerCase();
    return SETTINGS_CATEGORIES.map((cat) => ({
      ...cat,
      tabs: cat.tabs.filter(
        (t) =>
          t.label.toLowerCase().includes(q) ||
          t.hint.toLowerCase().includes(q) ||
          cat.label.toLowerCase().includes(q)
      ),
    })).filter((cat) => cat.tabs.length > 0);
  }, [searchQuery]);

  // Active Category on mobile/segmented control
  const activeCategory = activeMeta.category;

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Top Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
              {t('settings_badge', 'CONFIGURACIÓN DEL SISTEMA')}
            </span>
            <span className="text-xs text-slate-400">{translate('• Centro de control')}</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            {t('settings_title', 'Sistema y ajustes de la agencia')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {t('settings_subtitle', 'Configure operaciones, moneda, contenido público, plantillas de contrato y seguridad del sistema.')}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          {saved && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>{savedMsg}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition shadow-2xs"
            title="Restablecer ajustes generales y de factura"
          >
            <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
            <span>{t('reset_defaults', 'Restablecer')}</span>
          </button>
        </div>
      </div>

      {/* MOBILE CATEGORY SELECTOR (Visible only on < lg screens) */}
      <div className="block lg:hidden space-y-3">
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 text-xs font-semibold text-slate-600">
          {SETTINGS_CATEGORIES.map((cat) => {
            const isCurrentCat = activeCategory.id === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleSelectTab(cat.tabs[0].id)}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-center transition ${
                  isCurrentCat
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <cat.icon className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                <span className="truncate">{cat.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Horizontal tabs within the active category */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {activeCategory.tabs.map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleSelectTab(tab.id)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition ${
                  isSelected
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <tab.icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* MAIN TWO-COLUMN MASTER-DETAIL LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-[290px_1fr] gap-6 items-start">
        {/* LEFT COLUMN: Modern Grouped Settings Navigation Sidebar */}
        <aside className="hidden lg:block space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          {/* Search / Filter Input */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar ajustes..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 transition hover:bg-white focus:bg-white focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-[10px] text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            )}
          </div>

          {/* Grouped Tab Sections */}
          <div className="space-y-5">
            {filteredCategories.map((category) => (
              <div key={category.id} className="space-y-1.5">
                <div className="flex items-center gap-1.5 px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <category.icon className="h-3.5 w-3.5 text-amber-600" />
                  <span>{category.label}</span>
                </div>

                <div className="space-y-1">
                  {category.tabs.map((tab) => {
                    const isSelected = activeTab === tab.id;
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => handleSelectTab(tab.id)}
                        className={`w-full flex items-center justify-between gap-2.5 rounded-xl px-3 py-2.5 text-left transition group ${
                          isSelected
                            ? 'bg-amber-50 text-amber-950 font-semibold ring-1 ring-amber-200/80 shadow-2xs'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <span
                            className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg transition ${
                              isSelected
                                ? 'bg-amber-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700'
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </span>

                          <div className="min-w-0">
                            <p className="text-xs truncate leading-snug">{tab.label}</p>
                            <p className="text-[10px] text-slate-400 truncate leading-snug font-normal">
                              {tab.hint}
                            </p>
                          </div>
                        </div>

                        {tab.badge ? (
                          <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[9px] font-bold text-rose-700 ring-1 ring-rose-200 shrink-0">
                            {tab.badge}
                          </span>
                        ) : isSelected ? (
                          <ChevronRight className="h-4 w-4 text-amber-600 shrink-0" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* RIGHT COLUMN: Active Setting Content Pane */}
        <main className="min-w-0 space-y-4">
          {/* Breadcrumb Context Header for Active Tab */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3.5 shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                <activeMeta.tab.icon className="h-4 w-4" />
              </span>
              <div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <span>{activeMeta.category.label}</span>
                  <span>/</span>
                  <span className="font-semibold text-amber-800">{activeMeta.tab.label}</span>
                </div>
                <h2 className="text-sm font-bold text-slate-900">{activeMeta.tab.label}</h2>
              </div>
            </div>

            {activeMeta.tab.liveUrl && (
              <a
                href={activeMeta.tab.liveUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition shadow-2xs"
              >
                <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
                <span>Ver página pública</span>
              </a>
            )}
          </div>

          {/* TAB CONTENT: General & Currency */}
          {activeTab === 'general' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <form
                onSubmit={handleSaveGeneral}
                className="lg:col-span-2 space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
              >
                <div>
                  <h2 className="text-sm font-bold text-slate-900">{translate('Ajustes de agencia y moneda del proyecto')}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{translate('Gestione la identidad de marca de la agencia y la moneda financiera predeterminada del proyecto.')}</p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      {t('agency_name', 'Nombre de la agencia')}
                    </label>
                    <input
                      type="text"
                      value={generalForm.agencyName}
                      onChange={(e) => setGeneralForm({ ...generalForm, agencyName: e.target.value })}
                      className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      {t('contact_email', 'Correo electrónico de contacto')}
                    </label>
                    <input
                      type="email"
                      value={generalForm.contactEmail}
                      onChange={(e) => setGeneralForm({ ...generalForm, contactEmail: e.target.value })}
                      className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      required
                    />
                  </div>
                </div>

                {/* Global Project Currency Section */}
                <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-amber-600 text-white rounded-lg">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                        {t('default_currency', 'Moneda global del proyecto')}
                      </h3>
                      <p className="text-[11px] text-amber-800">
                        {t('currency_help', 'Esta moneda se utilizará en paquetes, reservas, pagos, finanzas y vistas públicas.')}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {CURRENCY_LIST.map((cur) => {
                      const isSelected = generalForm.currency === cur.code;
                      return (
                        <button
                          key={cur.code}
                          type="button"
                          onClick={() => setGeneralForm({ ...generalForm, currency: cur.code })}
                          className={`flex flex-col p-3 rounded-lg border text-left transition ${
                            isSelected
                              ? 'border-amber-600 bg-white shadow-xs ring-2 ring-amber-500/20'
                              : 'border-slate-200 bg-white/70 hover:border-amber-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-sm text-slate-900">{cur.code}</span>
                            <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">
                              {cur.symbol}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 mt-1 truncate">{cur.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      {t('timezone', 'Zona horaria de la agencia')}
                    </label>
                    <input
                      type="text"
                      value={generalForm.timezone}
                      onChange={(e) => setGeneralForm({ ...generalForm, timezone: e.target.value })}
                      className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <p className="text-[11px] text-slate-500 mb-1.5">{translate('Ejemplo de formato de moneda:')}</p>
                    <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs font-bold text-slate-800">
                      {formatMoney(12500, generalForm.currency)}
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-amber-500 transition"
                  >
                    <Save className="h-4 w-4" /> {t('save_changes', 'Guardar agencia y moneda')}
                  </button>
                </div>
              </form>

              {/* Side Info Box */}
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600" />{translate('Estado activo del entorno')}</h3>
                  <div className="space-y-2 text-xs text-slate-600">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span>{translate('Moneda seleccionada:')}</span>
                      <span className="font-bold text-amber-700">{currency}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span>{translate('Idioma del panel:')}</span>
                      <span className="font-bold uppercase text-slate-800">{adminLanguage}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span>{translate('Plantilla de factura:')}</span>
                      <span className="font-bold text-emerald-700">{translate('Personalizada v2.1')}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>{translate('Sincronización de catálogos públicos:')}</span>
                      <span className="font-semibold text-emerald-600">{translate('Activa')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB CONTENT: Invoice Settings */}
          {activeTab === 'invoice' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <form
                onSubmit={handleSaveInvoice}
                className="lg:col-span-7 space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
              >
                <div>
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-amber-600" />{translate('Control de facturas y notas de crédito')}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{translate('Personalice la marca, direcciones, datos fiscales y prefijos de factura para generar PDF.')}</p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      {t('inv_brand', 'Nombre comercial')}
                    </label>
                    <input
                      type="text"
                      value={invoiceForm.brand}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, brand: e.target.value })}
                      className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      {t('inv_tagline', 'Eslogan')}
                    </label>
                    <input
                      type="text"
                      value={invoiceForm.tagline}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, tagline: e.target.value })}
                      className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    {t('inv_legal_name', 'Razón social')}
                  </label>
                  <input
                    type="text"
                    value={invoiceForm.companyName}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, companyName: e.target.value })}
                    className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      {t('inv_address1', 'Dirección línea 1')}
                    </label>
                    <input
                      type="text"
                      value={invoiceForm.addressLine1}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, addressLine1: e.target.value })}
                      className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      {t('inv_address2', 'Dirección línea 2 (ciudad / país)')}
                    </label>
                    <input
                      type="text"
                      value={invoiceForm.addressLine2}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, addressLine2: e.target.value })}
                      className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      {t('inv_phone', 'Teléfono en facturas')}
                    </label>
                    <input
                      type="text"
                      value={invoiceForm.phone}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, phone: e.target.value })}
                      className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      {t('inv_email', 'Correo en facturas')}
                    </label>
                    <input
                      type="email"
                      value={invoiceForm.email}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, email: e.target.value })}
                      className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      {t('inv_website', 'Sitio web')}
                    </label>
                    <input
                      type="text"
                      value={invoiceForm.website}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, website: e.target.value })}
                      className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      {t('inv_prefix', 'Prefijo de factura')}
                    </label>
                    <input
                      type="text"
                      value={invoiceForm.invoicePrefix}
                      maxLength={6}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, invoicePrefix: e.target.value.toUpperCase() })}
                      className="mt-1.5 w-full uppercase rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      {t('inv_cn_prefix', 'Prefijo de nota de crédito')}
                    </label>
                    <input
                      type="text"
                      value={invoiceForm.creditNotePrefix}
                      maxLength={6}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, creditNotePrefix: e.target.value.toUpperCase() })}
                      className="mt-1.5 w-full uppercase rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      {t('inv_vat', 'IVA predeterminado (%)')}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={invoiceForm.vatRate}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, vatRate: Number(e.target.value) })}
                      className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    {t('inv_tax_id', 'Identificación fiscal (ICE / IF / RC)')}
                  </label>
                  <input
                    type="text"
                    value={invoiceForm.taxNumber}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, taxNumber: e.target.value })}
                    className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    {t('inv_footer_note', 'Notas de pie e instrucciones de pago')}
                  </label>
                  <textarea
                    rows={2}
                    value={invoiceForm.footerNote}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, footerNote: e.target.value })}
                    className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-amber-500 transition"
                  >
                    <Save className="h-4 w-4" /> {t('save_changes', 'Guardar ajustes de factura')}
                  </button>
                </div>
              </form>

              {/* Advanced Invoice Live Visual Card Preview */}
              <div className="lg:col-span-5 space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Eye className="w-4 h-4 text-amber-600" />
                      <span>{t('inv_preview_title', 'Vista previa avanzada de factura')}</span>
                    </span>
                    <span className="text-[10px] uppercase font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      <span>Fintech A4 Spec</span>
                    </span>
                  </div>

                  {/* Advanced Invoice Mock Sheet */}
                  <div className="rounded-xl border border-slate-200 bg-white shadow-md p-5 font-sans text-xs text-slate-700 space-y-4">
                    {/* Header Band */}
                    <div className="flex justify-between items-start pb-4 border-b border-slate-200">
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-base tracking-tight">
                          {invoiceForm.brand || 'Habibi Adventure'}
                        </h3>
                        <p className="text-[10px] text-amber-700 font-bold uppercase tracking-widest">
                          {invoiceForm.tagline || 'TRAVEL & LUXURY EXPEDITIONS'}
                        </p>
                        <div className="mt-2 inline-flex items-center gap-1.5 rounded bg-slate-900 text-amber-400 font-mono text-xs font-bold px-2 py-0.5">
                          <span>{invoiceForm.invoicePrefix || 'INV'}-2026-0042</span>
                        </div>
                      </div>
                      <div className="text-right text-[10px] text-slate-500 space-y-0.5 max-w-[180px]">
                        <p className="font-bold text-slate-900 text-xs">{invoiceForm.companyName || invoiceForm.brand}</p>
                        <p>{invoiceForm.addressLine1}</p>
                        <p>{invoiceForm.addressLine2}</p>
                        <p>{invoiceForm.phone}</p>
                        {invoiceForm.taxNumber && <p className="font-mono text-[9px] text-slate-400">{invoiceForm.taxNumber}</p>}
                      </div>
                    </div>

                    {/* Client & Booking Facts Grid */}
                    <div className="grid grid-cols-2 gap-3 text-[11px] p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                      <div>
                        <p className="font-bold text-amber-900 uppercase text-[9px]">Facturado a</p>
                        <p className="font-semibold text-slate-900">Carlos Mendoza Ruiz</p>
                        <p className="text-slate-500 text-[10px]">carlos.mendoza@email.com</p>
                        <p className="text-slate-500 text-[10px]">España • PA49201948</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-amber-900 uppercase text-[9px]">Información del viaje</p>
                        <p className="font-semibold text-slate-900">Gran Tour de Marruecos</p>
                        <p className="text-slate-500 text-[10px]">2 Travelers • Private 4x4</p>
                        <p className="text-emerald-700 font-bold text-[10px]">Status: PAID (Deposit)</p>
                      </div>
                    </div>

                    {/* Table representation */}
                    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                      <div className="grid grid-cols-5 bg-slate-900 text-white p-2 font-bold text-[10px]">
                        <span className="col-span-2">Servicio</span>
                        <span className="text-center">Viajeros</span>
                        <span className="text-right">Tarifa</span>
                        <span className="text-right">Importe</span>
                      </div>
                      <div className="grid grid-cols-5 p-2 text-[11px] border-t border-slate-100 items-center">
                        <span className="col-span-2 font-semibold text-slate-900">Tour de lujo por el Sáhara y campamento</span>
                        <span className="text-center text-slate-500">2</span>
                        <span className="text-right font-mono text-slate-600">{formatMoney(4200, currency)}</span>
                        <span className="text-right font-bold text-slate-900 font-mono">{formatMoney(8400, currency)}</span>
                      </div>
                    </div>

                    {/* Banking & Calculations */}
                    <div className="grid grid-cols-2 gap-3 items-start pt-1">
                      <div className="rounded-lg border border-amber-200/80 bg-amber-50/60 p-2 text-[10px] space-y-0.5">
                        <p className="font-bold text-amber-950 uppercase text-[9px]">Datos bancarios Santander</p>
                        <p className="text-slate-700">Banco: <strong>Banco Santander</strong></p>
                        <p className="text-slate-700 font-mono">IBAN: <strong>ES18 0049 1573 5127 1099 7804</strong></p>
                        <p className="text-slate-700 font-mono">SWIFT: <strong>BSCH ES MM</strong></p>
                        <p className="text-amber-900 text-[9px] pt-0.5 italic">* Balance 60% payable in cash in Morocco.</p>
                      </div>

                      <div className="space-y-1 text-right text-xs">
                        <div className="flex justify-between text-slate-500 text-[11px]">
                          <span>Subtotal:</span>
                          <span className="font-mono">{formatMoney(8400, currency)}</span>
                        </div>
                        <div className="flex justify-between text-slate-500 text-[11px]">
                          <span>IVA ({invoiceForm.vatRate || 0}%):</span>
                          <span className="font-mono">{formatMoney((8400 * (Number(invoiceForm.vatRate) || 0)) / 100, currency)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
                          <span>Total en {currency}:</span>
                          <span className="font-extrabold text-amber-700 font-mono">
                            {formatMoney(8400 + (8400 * (Number(invoiceForm.vatRate) || 0)) / 100, currency)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Footer preview note & verification stamp */}
                    <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-[10px] text-slate-500">
                      <span className="italic">{invoiceForm.footerNote || 'All bookings subject to agency conditions.'}</span>
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        FACTURA VERIFICADA
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB CONTENT: Contract Templates */}
          {activeTab === 'contracts' && (
            <ContractTemplateSettingsTab onNotification={triggerSaveNotification} />
          )}

          {/* TAB CONTENT: Admin Language */}
          {activeTab === 'language' && (
            <div className="max-w-3xl space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Languages className="w-4 h-4 text-amber-600" />
                  {t('admin_lang_title', 'Idioma del panel de administración')}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t('admin_lang_subtitle', 'Seleccione el idioma usado en el panel, menús, botones y notificaciones.')}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ADMIN_LANGUAGES.map((lang) => {
                  const isSelected = adminLanguage === lang.code;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => handleSelectLanguage(lang.code)}
                      className={`flex items-center justify-between p-4 rounded-xl border text-left transition ${
                        isSelected
                          ? 'border-amber-600 bg-amber-50/50 shadow-xs ring-2 ring-amber-500/20'
                          : 'border-slate-200 bg-white hover:border-amber-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base">{lang.flag}</span>
                          <span className="font-bold text-xs text-slate-900">{lang.name}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wider">{lang.code}</p>
                      </div>
                      {isSelected && (
                        <span className="p-1 rounded-full bg-amber-600 text-white">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB CONTENT: Public Services Page */}
          {activeTab === 'services' && (
            <ServicesSettingsTab onNotification={triggerSaveNotification} />
          )}

          {/* TAB CONTENT: Homepage Reviews */}
          {activeTab === 'reviews' && (
            <ReviewsSettingsTab onNotification={triggerSaveNotification} />
          )}

          {/* TAB CONTENT: Public About Page */}
          {activeTab === 'about' && (
            <AboutSettingsTab onNotification={triggerSaveNotification} />
          )}

          {/* TAB CONTENT: Public Contact Page */}
          {activeTab === 'contact' && (
            <ContactSettingsTab onNotification={triggerSaveNotification} />
          )}

          {/* TAB CONTENT: Account & Danger Zone */}
          {activeTab === 'account' && (
            <AccountSettingsTab onNotification={triggerSaveNotification} />
          )}

          {/* TAB CONTENT: Roles & Security */}
          {activeTab === 'security' && (
            <div className="max-w-3xl space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs text-xs text-slate-700">
              <h2 className="text-sm font-semibold text-slate-900">{translate('Seguridad y autorización')}</h2>
              <p className="text-slate-500">
                {translate('Los permisos se aplican en la base de datos mediante políticas RLS de Supabase y protecciones por roles de página.')}
              </p>

              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-1">
                <span className="font-semibold text-amber-900">{translate('Identidad de usuario activa')}</span>
                <p className="text-amber-800 font-mono text-[11px]">{user?.email || 'authenticated-user'}</p>
                <div className="flex gap-1 pt-1">
                  {roles && roles.length > 0 ? (
                    roles.map((r) => (
                      <span key={r} className="rounded bg-amber-200/80 px-1.5 py-0.5 text-[10px] font-bold text-amber-950">
                        {r}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500 italic">{translate('Sin roles asignados')}</span>
                  )}
                </div>
              </div>

              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 pt-2">{translate('Roles del sistema definidos')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                {SYSTEM_ROLES.map((role) => (
                  <div key={role.name} className="rounded-lg border border-slate-200 p-2.5 bg-slate-50/50">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-semibold text-slate-900">{formatRoleLabel(role.name, translate)}</span>
                      <span className="font-mono text-[10px] text-slate-400">({role.name})</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">{formatRoleDescription(role.name, translate)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB CONTENT: Destinations */}
          {activeTab === 'destinations' && (
            <DestinationsSettingsTab onNotification={triggerSaveNotification} />
          )}

          {/* TAB CONTENT: Partnerships */}
          {activeTab === 'partnerships' && (
            <PartnershipsSettingsTab onNotification={triggerSaveNotification} />
          )}

          {/* TAB CONTENT: System State */}
          {activeTab === 'database' && (
            <div className="max-w-3xl space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs text-xs text-slate-700">
              <h2 className="text-sm font-semibold text-slate-900">{translate('Estado de conexión de Supabase')}</h2>
              <div className="space-y-2">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">{translate('Servidor de Supabase:')}</span>
                  <span className="font-mono text-slate-800">{translate('gklqhykfdyitnccbgpwk.supabase.co')}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">{translate('Extensiones de PostgreSQL:')}</span>
                  <span className="font-mono text-emerald-700">{translate('pgcrypto (Active)')}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">{translate('Seguridad a nivel de fila (RLS):')}</span>
                  <span className="font-semibold text-emerald-700">{translate('Habilitada en todas las tablas principales')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{translate('Tabla de auditoría:')}</span>
                  <span className="font-mono text-slate-800">{translate('public.audit_logs (Immutable)')}</span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
