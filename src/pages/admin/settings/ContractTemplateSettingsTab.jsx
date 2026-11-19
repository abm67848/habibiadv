import { useAppSettings, translate } from '@/context/index.jsx';
import React, { useState, useRef, useMemo } from 'react';
import {
  FileText, Plus, Trash2, ChevronUp, ChevronDown, Sparkles, Save, RotateCcw,
  Eye, Edit3, Copy, Check, Info, Tag, Search, X, FileCheck, Building,
  CreditCard, MapPin, Calendar, Layers, ArrowRight, Upload, Image, Phone,
} from 'lucide-react';
import {
  getSavedContractTemplate,
  saveContractTemplate,
  getSavedContractHeaderSettings,
  saveContractHeaderSettings,
  resetContractTemplateToDefault,
  CONTRACT_VARIABLE_CATEGORIES,
  ALL_VARIABLES,
  replaceTemplateVariables,
  DEFAULT_CONTRACT_HEADER_SETTINGS,
} from '@/pages/admin/contracts/templateEngine.js';
import { LOGO_BASE64 } from '@/services/documents/logoBase64.js';

export default function ContractTemplateSettingsTab({ onNotification }) {
  const [template, setTemplate] = useState(() => getSavedContractTemplate());
  const [headerSettings, setHeaderSettings] = useState(() => getSavedContractHeaderSettings());
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [previewMode, setPreviewMode] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [varSearch, setVarSearch] = useState('');
  const [copiedKey, setCopiedKey] = useState(null);
  const [isSaved, setIsSaved] = useState(false);

  const fileInputRef = useRef(null);
  const textareaRefs = useRef({});

  // Sample data to simulate live evaluation in preview mode
  const sampleSimulationContext = useMemo(() => ({
    ...headerSettings,
    customer_name: 'Carlos Mendoza Ruiz',
    customer_document: 'PA49201948',
    customer_phone: '+34 622 890 123',
    customer_email: 'carlos.mendoza@email.com',
    customer_address: 'Gran Vía 42, Madrid',
    customer_country: 'España',
    pax_count: 2,
    trip_title: 'Gran Tour de Marruecos & Desierto del Sahara',
    destination: 'Marruecos (Marrakech - Merzouga - Fez)',
    start_date: '2026-12-26',
    end_date: '2027-01-02',
    duration_days: 8,
    duration_nights: 7,
    travel_modality: 'Circuito Privado con Chófer y Guía',
    total_amount: 1450,
    currency: 'EUR',
    deposit_percentage: 40,
    deposit_amount: 580,
    remaining_amount: 870,
    payment_deadline: '2026-12-11',
    cancellation_policy_es: 'Pasados 21 días naturales desde el abono del pago, el depósito es no reembolsable bajo ninguna circunstancia.',
    itinerary: [
      { day_number: 1, title_es: 'Llegada a Marrakech y bienvenida en el Riad' },
      { day_number: 2, title_es: 'Marrakech - Alto Atlas - Kasbah Ait Ben Haddou - Dades' },
      { day_number: 3, title_es: 'Gargantas del Todra - Erfoud - Dunas de Merzouga (Campamento de lujo)' },
      { day_number: 4, title_es: 'Merzouga - Valle del Ziz - Midelt - Bosque de Cedros - Fez' },
    ],
    services: [
      { service_type: 'included', title_es: 'Transporte privado en vehículo 4x4 con chófer-guía en español' },
      { service_type: 'included', title_es: 'Combustible, peajes y gastos de gestión durante todo el recorrido' },
      { service_type: 'included', title_es: 'Paseo en dromedario y noche en campamento de jaimas deluxe en Merzouga' },
      { service_type: 'excluded', title_es: 'Vuelos internacionales y tasas aeroportuarias' },
      { service_type: 'excluded', title_es: 'Bebidas alcohólicas y comidas no especificadas' },
    ],
    accommodations: [
      { location: 'Marrakech', accommodation_name: 'Riad Al Jazira', room_type: 'Doble Superior' },
      { location: 'Dades', accommodation_name: 'Hotel Xaluca Dades', room_type: 'Doble Estándar' },
      { location: 'Merzouga', accommodation_name: 'Luxury Desert Camp Erg Chebbi', room_type: 'Haima Deluxe' },
    ],
    contract_number: 'CTR-2026-0042',
    contract_date: new Date().toISOString(),
    signed_place: 'Marrakech',
  }), [headerSettings]);

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setHeaderSettings((prev) => ({ ...prev, logo_base64: ev.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleTitleChange = (idx, value) => {
    const updated = [...template.sections];
    updated[idx] = { ...updated[idx], title_es: value };
    setTemplate({ ...template, sections: updated });
  };

  const handleContentChange = (idx, value) => {
    const updated = [...template.sections];
    updated[idx] = { ...updated[idx], content_es: value };
    setTemplate({ ...template, sections: updated });
  };

  const handleMoveUp = (idx) => {
    if (idx === 0) return;
    const updated = [...template.sections];
    const temp = updated[idx - 1];
    updated[idx - 1] = updated[idx];
    updated[idx] = temp;
    updated.forEach((s, i) => { s.sort_order = i + 1; });
    setTemplate({ ...template, sections: updated });
    setActiveSectionIdx(idx - 1);
  };

  const handleMoveDown = (idx) => {
    if (idx === template.sections.length - 1) return;
    const updated = [...template.sections];
    const temp = updated[idx + 1];
    updated[idx + 1] = updated[idx];
    updated[idx] = temp;
    updated.forEach((s, i) => { s.sort_order = i + 1; });
    setTemplate({ ...template, sections: updated });
    setActiveSectionIdx(idx + 1);
  };

  const handleDeleteSection = (idx) => {
    if (template.sections.length <= 1) {
      alert('El contrato debe tener al menos una sección.');
      return;
    }
    if (!window.confirm(`¿Desea eliminar la sección "${template.sections[idx].title_es}"?`)) return;
    const updated = template.sections.filter((_, i) => i !== idx);
    updated.forEach((s, i) => { s.sort_order = i + 1; });
    setTemplate({ ...template, sections: updated });
    setActiveSectionIdx(Math.max(0, idx - 1));
  };

  const handleAddSection = () => {
    const newSecNum = template.sections.length + 1;
    const newSection = {
      section_number: newSecNum,
      section_key: `sec_${newSecNum}_personalizada`,
      title_es: `${newSecNum}. NUEVA CLÁUSULA PERSONALIZADA`,
      content_es: 'Escriba aquí los términos y condiciones de esta cláusula.',
      sort_order: newSecNum,
      is_required: false,
    };
    const updated = [...template.sections, newSection];
    setTemplate({ ...template, sections: updated });
    setActiveSectionIdx(updated.length - 1);
  };

  const handleInsertVariable = (varKey) => {
    const ta = textareaRefs.current[activeSectionIdx];
    if (!ta) return;
    const start = ta.selectionStart || 0;
    const end = ta.selectionEnd || 0;
    const currentVal = template.sections[activeSectionIdx]?.content_es || '';
    const newVal = currentVal.substring(0, start) + varKey + currentVal.substring(end);
    handleContentChange(activeSectionIdx, newVal);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + varKey.length, start + varKey.length);
    }, 50);
  };

  const handleCopyVariable = (varKey) => {
    navigator.clipboard.writeText(varKey);
    setCopiedKey(varKey);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSaveAll = () => {
    saveContractHeaderSettings(headerSettings);
    saveContractTemplate(template);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3500);
    if (onNotification) {
      onNotification('Configuración de encabezado y 16 cláusulas del contrato guardadas correctamente.');
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm('¿Restablecer la configuración del encabezado y las 16 secciones a los valores estándar de fábrica?')) {
      const def = resetContractTemplateToDefault();
      setHeaderSettings(DEFAULT_CONTRACT_HEADER_SETTINGS);
      setTemplate(def);
      setActiveSectionIdx(0);
      if (onNotification) onNotification('Plantilla oficial de 16 cláusulas restablecida a los valores estándar.');
    }
  };

  const filteredVariables = useMemo(() => {
    let list = selectedCategory === 'all'
      ? ALL_VARIABLES
      : CONTRACT_VARIABLE_CATEGORIES.find((c) => c.id === selectedCategory)?.variables || [];
    if (varSearch.trim()) {
      const q = varSearch.toLowerCase();
      list = list.filter((v) => v.key.toLowerCase().includes(q) || v.label.toLowerCase().includes(q));
    }
    return list;
  }, [selectedCategory, varSearch]);

  const currentLogo = headerSettings.logo_base64 || LOGO_BASE64;

  return (
    <div className="space-y-6">
      {/* Top Banner and Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
              CONTRATOS OFICIALES (16 CLÁUSULAS)
            </span>
            <span className="text-xs text-slate-400">• Formato Normativo Español</span>
          </div>
          <h2 className="mt-1 text-xl font-bold text-slate-900">
            Encabezado Editable y Gestor de Cláusulas Contractuales
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Personalice el logotipo oficial, datos fiscales (C.P. 04740), cuenta Santander y las 16 secciones legales del contrato.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isSaved && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200 animate-in fade-in">
              <Check className="h-4 w-4 text-emerald-600" />
              <span>Guardado</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setPreviewMode(!previewMode)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
              previewMode
                ? 'border-amber-600 bg-amber-50 text-amber-900'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Eye className="h-4 w-4 text-amber-600" />
            <span>{previewMode ? 'Modo Edición' : 'Vista Previa Documento'}</span>
          </button>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
            title="Restablecer a valores de fábrica"
          >
            <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
            <span className="hidden sm:inline">Restablecer</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-amber-500 transition"
          >
            <Save className="h-4 w-4" />
            <span>Guardar Configuración</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: EDITABLE HEADER CARD (LOGO UPLOAD, NAME, PHONES, ADDRESS, C.P. 04740, SANTANDER) */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building className="w-4 h-4 text-amber-600" />
              <span>Encabezado Oficial de la Agencia (Header del Contrato)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Editable en tiempo real. Aparecerá en la cabecera superior de todos los contratos y documentos oficiales generados.
            </p>
          </div>
          <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
            Sección 1 del Contrato
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Logo Upload Box */}
          <div className="lg:col-span-3 flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 text-center">
            <div className="w-24 h-24 rounded-lg bg-stone-900 p-2 flex items-center justify-center shadow-xs mb-3">
              <img
                src={currentLogo}
                alt="Logo Agencia"
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleLogoUpload}
              accept="image/*"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold px-3 py-1.5 shadow-xs transition"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Subir Logotipo</span>
            </button>
            {headerSettings.logo_base64 && (
              <button
                type="button"
                onClick={() => setHeaderSettings({ ...headerSettings, logo_base64: '' })}
                className="mt-1 text-[11px] text-slate-400 hover:text-rose-600 underline"
              >
                Restablecer logo base
              </button>
            )}
            <p className="text-[10px] text-slate-400 mt-2">PNG o JPG con fondo transparente</p>
          </div>

          {/* Agency Details Fields */}
          <div className="lg:col-span-9 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Nombre de la Agencia</label>
              <input
                type="text"
                value={headerSettings.agency_name}
                onChange={(e) => setHeaderSettings({ ...headerSettings, agency_name: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
                placeholder="e.g. Habibi Adventure Hafa S.L."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Identificador Postal (C.P.)</label>
              <input
                type="text"
                value={headerSettings.agency_postal_code}
                onChange={(e) => setHeaderSettings({ ...headerSettings, agency_postal_code: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-amber-800 focus:border-amber-500 focus:outline-none"
                placeholder="C.P. 04740"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">CIF / Identificación Fiscal</label>
              <input
                type="text"
                value={headerSettings.agency_cif}
                onChange={(e) => setHeaderSettings({ ...headerSettings, agency_cif: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
                placeholder="C.I.F. B-70659918"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Dirección Social</label>
              <input
                type="text"
                value={headerSettings.agency_address}
                onChange={(e) => setHeaderSettings({ ...headerSettings, agency_address: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
                placeholder="Calle Tetuán 14, 4º"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Ciudad y País</label>
              <div className="mt-1 flex gap-2">
                <input
                  type="text"
                  value={headerSettings.agency_city}
                  onChange={(e) => setHeaderSettings({ ...headerSettings, agency_city: e.target.value })}
                  className="w-1/2 rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
                  placeholder="Sevilla / Marrakech"
                />
                <input
                  type="text"
                  value={headerSettings.agency_country}
                  onChange={(e) => setHeaderSettings({ ...headerSettings, agency_country: e.target.value })}
                  className="w-1/2 rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
                  placeholder="España / Marruecos"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Teléfonos de Contacto</label>
              <input
                type="text"
                value={headerSettings.agency_phone}
                onChange={(e) => setHeaderSettings({ ...headerSettings, agency_phone: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
                placeholder="+34 611 144 040 / +212 524-001122"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Correo Electrónico Oficial</label>
              <input
                type="email"
                value={headerSettings.agency_email}
                onChange={(e) => setHeaderSettings({ ...headerSettings, agency_email: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
                placeholder="info@habibiadventure.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Cuenta Banco Santander / IBAN</label>
              <input
                type="text"
                value={headerSettings.bank_account_iban}
                onChange={(e) => setHeaderSettings({ ...headerSettings, bank_account_iban: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-amber-500 focus:outline-none"
                placeholder="ES18 0049 1573 5127 1099 7804"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Código SWIFT / BIC</label>
              <input
                type="text"
                value={headerSettings.bank_account_swift}
                onChange={(e) => setHeaderSettings({ ...headerSettings, bank_account_swift: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-amber-500 focus:outline-none"
                placeholder="BSCH ES MM"
              />
            </div>
          </div>
        </div>
      </div>

      {/* VIEW MODE: EITHER 16-SECTION EDITOR OR REALISTIC LIVE PREVIEW */}
      {!previewMode ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: 16 Sections List */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-700">
                Estructura de Cláusulas ({template.sections.length} Secciones)
              </span>
              <button
                type="button"
                onClick={handleAddSection}
                className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-800"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Añadir</span>
              </button>
            </div>

            <div className="space-y-1.5 max-h-[700px] overflow-y-auto pr-1">
              {template.sections.map((sec, idx) => {
                const isActive = activeSectionIdx === idx;
                return (
                  <div
                    key={sec.section_key || idx}
                    onClick={() => setActiveSectionIdx(idx)}
                    className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition ${
                      isActive
                        ? 'border-amber-500 bg-amber-50/70 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-amber-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isActive ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className={`text-xs truncate font-medium ${isActive ? 'text-amber-950 font-bold' : 'text-slate-800'}`}>
                        {sec.title_es}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleMoveUp(idx)}
                        disabled={idx === 0}
                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                        title="Subir"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveDown(idx)}
                        disabled={idx === template.sections.length - 1}
                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                        title="Bajar"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Active Section Editor & Variables Palette */}
          <div className="lg:col-span-8 space-y-4">
            {template.sections[activeSectionIdx] ? (
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-amber-100 text-amber-800 text-xs font-bold flex items-center justify-center">
                      {activeSectionIdx + 1}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">
                      Editando Cláusula {activeSectionIdx + 1}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteSection(activeSectionIdx)}
                    className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2 py-1 rounded transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar Sección</span>
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Título de la Sección / Cláusula (en Español)
                  </label>
                  <input
                    type="text"
                    value={template.sections[activeSectionIdx].title_es}
                    onChange={(e) => handleTitleChange(activeSectionIdx, e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Contenido y Texto Legal (Soporta Variables Dinámicas)
                    </label>
                    <span className="text-[10px] text-slate-400">
                      Haga clic en una variable abajo para insertarla en el cursor
                    </span>
                  </div>
                  <textarea
                    ref={(el) => (textareaRefs.current[activeSectionIdx] = el)}
                    rows={8}
                    value={template.sections[activeSectionIdx].content_es}
                    onChange={(e) => handleContentChange(activeSectionIdx, e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-3 text-xs text-slate-800 leading-relaxed font-mono focus:border-amber-500 focus:outline-none"
                  />
                </div>

                {/* Variables Palette */}
                <div className="pt-2 border-t border-slate-100 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-amber-600" />
                      <span>Variables Dinámicas Disponibles</span>
                    </span>

                    {/* Filter categories */}
                    <div className="flex items-center gap-1 overflow-x-auto">
                      <button
                        type="button"
                        onClick={() => setSelectedCategory('all')}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                          selectedCategory === 'all'
                            ? 'bg-amber-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Todas
                      </button>
                      {CONTRACT_VARIABLE_CATEGORIES.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSelectedCategory(cat.id)}
                          className={`px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap transition ${
                            selectedCategory === cat.id
                              ? 'bg-amber-600 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-50 rounded-lg border border-slate-200">
                    {filteredVariables.map((v) => {
                      const isCopied = copiedKey === v.key;
                      return (
                        <div
                          key={v.key}
                          className="group inline-flex items-center gap-1 rounded bg-white px-2 py-1 text-xs border border-slate-200 shadow-2xs hover:border-amber-400"
                        >
                          <button
                            type="button"
                            onClick={() => handleInsertVariable(v.key)}
                            className="font-mono text-[11px] text-amber-900 font-semibold hover:underline"
                            title={`Insertar ${v.key} en el texto`}
                          >
                            {v.key}
                          </button>
                          <span className="text-[10px] text-slate-400">({v.label})</span>
                          <button
                            type="button"
                            onClick={() => handleCopyVariable(v.key)}
                            className="text-slate-400 hover:text-slate-700 ml-0.5"
                            title="Copiar variable"
                          >
                            {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        /* REALISTIC LIVE PREVIEW CARD */
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-md font-sans text-slate-800 space-y-6 max-w-4xl mx-auto">
          {/* Header Banner Preview */}
          <div className="bg-[#231f1c] text-[#ebb96e] p-5 rounded-xl flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-4">
              <img src={currentLogo} alt="" className="h-14 w-14 object-contain" />
              <div>
                <h3 className="font-bold text-base tracking-wide text-white">{headerSettings.agency_name}</h3>
                <p className="text-xs text-[#ebb96e]/90">{headerSettings.agency_cif} • {headerSettings.agency_postal_code}</p>
                <p className="text-[11px] text-[#ebb96e]/80">{headerSettings.agency_address}, {headerSettings.agency_city}</p>
              </div>
            </div>
            <div className="text-right text-xs space-y-0.5">
              <p className="text-white font-medium">{headerSettings.agency_phone}</p>
              <p className="text-[11px] text-[#ebb96e]/80">{headerSettings.agency_email}</p>
            </div>
          </div>

          {/* Document Title */}
          <div className="text-center py-2">
            <h2 className="text-lg font-black tracking-tight text-slate-900 uppercase">
              CONTRATO DE RESERVA Y PRESTACIÓN DE SERVICIOS TURÍSTICOS
            </h2>
            <p className="text-xs text-amber-800 font-medium mt-0.5">
              (RESERVATION AND TOURIST SERVICES CONTRACT)
            </p>
          </div>

          {/* Sequential 16 Sections Preview with Sample Data */}
          <div className="space-y-5 text-xs text-slate-700 leading-relaxed border-t border-slate-200 pt-5">
            {template.sections.map((sec, idx) => {
              const evaluated = replaceTemplateVariables(sec.content_es, sampleSimulationContext);
              return (
                <div key={sec.section_key || idx} className="space-y-1.5 p-3 rounded-lg bg-slate-50/60 border border-slate-100">
                  <h4 className="font-bold text-amber-900 text-xs uppercase flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <span>{sec.title_es}</span>
                  </h4>
                  <div className="whitespace-pre-wrap pl-6 text-slate-800 font-mono text-[11px] leading-relaxed">
                    {evaluated}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
