import React, { useState } from 'react';
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
  Phone,
  FileCheck,
  Eye,
  Check,
  Sparkles
} from 'lucide-react';
import { useAuth, translate, useAppSettings, ADMIN_LANGUAGES, CURRENCY_LIST, DEFAULT_INVOICE_SETTINGS } from '@/context/index.jsx';

import ContractTemplateSettingsTab from './ContractTemplateSettingsTab.jsx';

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

  const handleSaveGeneral = (e) => {
    e.preventDefault();
    updateSettings({
      agencyName: generalForm.agencyName,
      contactEmail: generalForm.contactEmail,
      timezone: generalForm.timezone,
      currency: generalForm.currency,
    });
    triggerSaveNotification('Agency general configuration and currency updated!');
  };

  const handleSaveInvoice = (e) => {
    e.preventDefault();
    updateInvoiceSettings(invoiceForm);
    triggerSaveNotification('Invoice template details updated successfully!');
  };

  const handleSelectLanguage = (langCode) => {
    setAdminLanguage(langCode);
    triggerSaveNotification(`Admin language switched to ${ADMIN_LANGUAGES.find(l => l.code === langCode)?.name}!`);
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset invoice and general settings to system defaults?')) {
      resetSettings();
      setGeneralForm({
        agencyName: 'Habibi Adventure',
        contactEmail: 'contact@skyview-travel.com',
        timezone: 'Africa/Casablanca (UTC+1)',
        currency: 'MAD',
      });
      setInvoiceForm({ ...DEFAULT_INVOICE_SETTINGS });
      triggerSaveNotification('Settings restored to defaults!');
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
              {t('settings_badge', 'SYSTEM CONFIGURATION')}
            </span>
            <span className="text-xs text-slate-400">{translate('• Control Hub')}</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            {t('settings_title', 'Agency System & Settings')}
          </h1>
          <p className="text-sm text-slate-500">
            {t('settings_subtitle', 'Configure project currency, admin panel language, invoice details, and system security.')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {saved && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>{savedMsg}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
            title="Reset settings to defaults"
          >
            <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
            <span className="hidden sm:inline">{t('reset_defaults', 'Reset')}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap border-b border-slate-200 gap-1 sm:gap-2">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
            activeTab === 'general'
              ? 'border-amber-600 text-amber-800 bg-amber-50/40 rounded-t'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <DollarSign className="h-4 w-4 text-amber-600" />
          <span>{t('tab_general', 'General & Currency')}</span>
        </button>

        <button
          onClick={() => setActiveTab('invoice')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
            activeTab === 'invoice'
              ? 'border-amber-600 text-amber-800 bg-amber-50/40 rounded-t'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Receipt className="h-4 w-4 text-amber-600" />
          <span>{t('tab_invoice', 'Invoice Settings')}</span>
        </button>

        <button
          onClick={() => setActiveTab('contracts')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
            activeTab === 'contracts'
              ? 'border-amber-600 text-amber-800 bg-amber-50/40 rounded-t'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="h-4 w-4 text-amber-600" />
          <span>{t('tab_contracts', 'Plantilla de Contratos')}</span>
        </button>

        <button
          onClick={() => setActiveTab('language')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
            activeTab === 'language'
              ? 'border-amber-600 text-amber-800 bg-amber-50/40 rounded-t'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Languages className="h-4 w-4 text-amber-600" />
          <span>{t('tab_language', 'Admin Language')}</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
            activeTab === 'security'
              ? 'border-amber-600 text-amber-800 bg-amber-50/40 rounded-t'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Shield className="h-4 w-4 text-amber-600" />
          <span>{t('tab_security', 'Roles & Security')}</span>
        </button>

        <button
          onClick={() => setActiveTab('database')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
            activeTab === 'database'
              ? 'border-amber-600 text-amber-800 bg-amber-50/40 rounded-t'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Database className="h-4 w-4 text-amber-600" />
          <span>{t('tab_database', 'System State')}</span>
        </button>
      </div>

      {/* TAB 1: General & Currency */}
      {activeTab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form
            onSubmit={handleSaveGeneral}
            className="lg:col-span-2 space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-xs"
          >
            <div>
              <h2 className="text-sm font-bold text-slate-900">{translate('Project Agency & Currency Settings')}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{translate('Manage the agency brand identity and project-wide default financial currency.')}</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {t('agency_name', 'Agency Name')}
                </label>
                <input
                  type="text"
                  value={generalForm.agencyName}
                  onChange={(e) => setGeneralForm({ ...generalForm, agencyName: e.target.value })}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {t('contact_email', 'Official Contact Email')}
                </label>
                <input
                  type="email"
                  value={generalForm.contactEmail}
                  onChange={(e) => setGeneralForm({ ...generalForm, contactEmail: e.target.value })}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
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
                    {t('default_currency', 'Global Project Currency')}
                  </h3>
                  <p className="text-[11px] text-amber-800">
                    {t('currency_help', 'This currency will be used across packages, bookings, payments, finances, and public displays.')}
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
                  {t('timezone', 'Agency Timezone')}
                </label>
                <input
                  type="text"
                  value={generalForm.timezone}
                  onChange={(e) => setGeneralForm({ ...generalForm, timezone: e.target.value })}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div className="flex flex-col justify-end">
                <p className="text-[11px] text-slate-500 mb-1.5">{translate('Sample formatted currency display:')}</p>
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
                <Save className="h-4 w-4" /> {t('save_changes', 'Save Agency & Currency Settings')}
              </button>
            </div>
          </form>

          {/* Side Info Box */}
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" />{translate('Active Environment Status')}</h3>
              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span>{translate('Selected Currency:')}</span>
                  <span className="font-bold text-amber-700">{currency}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span>{translate('Admin Interface Lang:')}</span>
                  <span className="font-bold uppercase text-slate-800">{adminLanguage}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span>{translate('Invoice Template:')}</span>
                  <span className="font-bold text-emerald-700">{translate('Customized v2.1')}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>{translate('Public Catalogs Sync:')}</span>
                  <span className="font-semibold text-emerald-600">{translate('Active')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Invoice Settings */}
      {activeTab === 'invoice' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleSaveInvoice}
            className="lg:col-span-7 space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-xs"
          >
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-600" />{translate('Control Invoice & Credit Note Documents')}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{translate('Customize agency branding, addresses, tax registration numbers, and invoice prefixes for PDF generation.')}</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  {t('inv_brand', 'Brand Display Name')}
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
                  {t('inv_tagline', 'Tagline / Slogan')}
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
                {t('inv_legal_name', 'Legal Company Name')}
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
                  {t('inv_address1', 'Address Line 1')}
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
                  {t('inv_address2', 'Address Line 2 (City / Country)')}
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
                  {t('inv_phone', 'Phone on Invoices')}
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
                  {t('inv_email', 'Email on Invoices')}
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
                  {t('inv_website', 'Website URL')}
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
                  {t('inv_prefix', 'Invoice Prefix')}
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
                  {t('inv_cn_prefix', 'Credit Note Prefix')}
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
                  {t('inv_vat', 'Default VAT (%)')}
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
                {t('inv_tax_id', 'Tax Registration (ICE / IF / RC)')}
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
                {t('inv_footer_note', 'Invoice Footer Notes & Payment Instructions')}
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
                <Save className="h-4 w-4" /> {t('save_changes', 'Save Invoice Settings')}
              </button>
            </div>
          </form>

          {/* Advanced Invoice Live Visual Card Preview */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-amber-600" />
                  <span>{t('inv_preview_title', 'Advanced Luxury Invoice Live Preview')}</span>
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
                    <p className="font-bold text-amber-900 uppercase text-[9px]">Billed To</p>
                    <p className="font-semibold text-slate-900">Carlos Mendoza Ruiz</p>
                    <p className="text-slate-500 text-[10px]">carlos.mendoza@email.com</p>
                    <p className="text-slate-500 text-[10px]">España • PA49201948</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-amber-900 uppercase text-[9px]">Trip Information</p>
                    <p className="font-semibold text-slate-900">Gran Tour de Marruecos</p>
                    <p className="text-slate-500 text-[10px]">2 Travelers • Private 4x4</p>
                    <p className="text-emerald-700 font-bold text-[10px]">Status: PAID (Deposit)</p>
                  </div>
                </div>

                {/* Table representation */}
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                  <div className="grid grid-cols-5 bg-slate-900 text-white p-2 font-bold text-[10px]">
                    <span className="col-span-2">Service</span>
                    <span className="text-center">Travelers</span>
                    <span className="text-right">Rate</span>
                    <span className="text-right">Amount</span>
                  </div>
                  <div className="grid grid-cols-5 p-2 text-[11px] border-t border-slate-100 items-center">
                    <span className="col-span-2 font-semibold text-slate-900">Sahara Luxury Tour & Camp</span>
                    <span className="text-center text-slate-500">2</span>
                    <span className="text-right font-mono text-slate-600">{formatMoney(4200, currency)}</span>
                    <span className="text-right font-bold text-slate-900 font-mono">{formatMoney(8400, currency)}</span>
                  </div>
                </div>

                {/* Banking & Calculations */}
                <div className="grid grid-cols-2 gap-3 items-start pt-1">
                  <div className="rounded-lg border border-amber-200/80 bg-amber-50/60 p-2 text-[10px] space-y-0.5">
                    <p className="font-bold text-amber-950 uppercase text-[9px]">Santander Banking Details</p>
                    <p className="text-slate-700">Bank: <strong>Banco Santander</strong></p>
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
                      <span>VAT ({invoiceForm.vatRate || 0}%):</span>
                      <span className="font-mono">{formatMoney((8400 * (Number(invoiceForm.vatRate) || 0)) / 100, currency)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
                      <span>Total with {currency}:</span>
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
                    VERIFIED INVOICE
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Admin Language (Admin Panel Only) */}
      {activeTab === 'language' && (
        <div className="max-w-3xl space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Languages className="w-4 h-4 text-amber-600" />
              {t('admin_lang_title', 'Admin Panel Language')}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('admin_lang_desc', 'Select the operational language used in this administration portal. This setting only applies to the admin dashboard.')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ADMIN_LANGUAGES.map((lang) => {
              const isActive = adminLanguage === lang.code;
              return (
                <div
                  key={lang.code}
                  onClick={() => handleSelectLanguage(lang.code)}
                  className={`relative flex items-center justify-between p-4 rounded-xl border cursor-pointer transition ${
                    isActive
                      ? 'border-amber-600 bg-amber-50/50 ring-2 ring-amber-500/20'
                      : 'border-slate-200 hover:border-amber-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{lang.flag}</span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{lang.name}</h3>
                      <p className="text-[11px] text-slate-500">
                        {lang.dir === 'rtl' ? 'Right-to-Left (RTL)' : 'Left-to-Right (LTR)'}
                      </p>
                    </div>
                  </div>

                  {isActive ? (
                    <div className="h-6 w-6 rounded-full bg-amber-600 text-white flex items-center justify-center">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="text-xs font-semibold text-slate-500 hover:text-amber-700 px-2 py-1 rounded border border-slate-200"
                    >{translate('Select')}</button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="rounded-lg bg-slate-50 p-4 border border-slate-200 text-xs text-slate-600">
            <p className="font-semibold text-slate-800 mb-1">
              {t('admin_lang_active', 'Active Admin Language')}: <span className="text-amber-700 font-bold uppercase">{adminLanguage}</span>
            </p>
            <p className="text-slate-500">
              {t('admin_lang_preview', 'Selected language will apply instantly to all admin headers, navigation, and badges.')}
            </p>
          </div>
        </div>
      )}

      {/* TAB 4: Roles & Security */}
      {activeTab === 'security' && (
        <div className="max-w-3xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <h2 className="text-sm font-semibold text-slate-900">{translate('Current Session Authority')}</h2>
          <div className="rounded-lg bg-slate-50 p-4 text-xs space-y-2">
            <div>
              <strong className="text-slate-800">{translate('Signed In As:')}</strong> {user?.email || 'admin.travelagency@gmail.com'}
            </div>
            <div>
              <strong className="text-slate-800">{translate('Assigned Roles:')}</strong> {roles?.join(', ') || 'super_admin'}
            </div>
            <div>
              <strong className="text-slate-800">{translate('Super Admin Privilege:')}</strong>{' '}
              {isSuperAdmin ? 'Active (Full Grants)' : 'Active'}
            </div>
          </div>

          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 pt-2">{translate('System Roles Defined')}</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border border-slate-200 p-2.5">
              <span className="font-semibold text-slate-900">{translate('super_admin')}</span>
              <p className="text-[11px] text-slate-500">{translate('Full system access, can manage roles & administrators.')}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-2.5">
              <span className="font-semibold text-slate-900">{translate('administrator')}</span>
              <p className="text-[11px] text-slate-500">{translate('Manages employees, operations and all agency resources.')}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-2.5">
              <span className="font-semibold text-slate-900">{translate('manager')}</span>
              <p className="text-[11px] text-slate-500">{translate('Supervises teams, bookings, destinations & logistics.')}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-2.5">
              <span className="font-semibold text-slate-900">{translate('accountant')}</span>
              <p className="text-[11px] text-slate-500">{translate('Handles finance, payments, invoices & expenses.')}</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Database State */}
      {activeTab === 'database' && (
        <div className="max-w-3xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-xs text-xs text-slate-700">
          <h2 className="text-sm font-semibold text-slate-900">{translate('Supabase Connection State')}</h2>
          <div className="space-y-2">
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">{translate('Supabase Host:')}</span>
              <span className="font-mono text-slate-800">{translate('gklqhykfdyitnccbgpwk.supabase.co')}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">{translate('PostgreSQL Extensions:')}</span>
              <span className="font-mono text-emerald-700">{translate('pgcrypto (Active)')}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">{translate('Row Level Security (RLS):')}</span>
              <span className="font-semibold text-emerald-700">{translate('Enabled on all core tables')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{translate('Audit Logging Table:')}</span>
              <span className="font-mono text-slate-800">{translate('public.audit_logs (Immutable)')}</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: Contract Template Settings */}
      {activeTab === 'contracts' && (
        <ContractTemplateSettingsTab onNotification={triggerSaveNotification} />
      )}
    </div>
  );
}
