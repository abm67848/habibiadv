// Dynamic Travel Contract Template Engine & Variable Dictionary
// Provides variable definitions, placeholder substitution, header settings, and template persistence
// Configured with all 16 standard legal sections according to official tourism contract regulations

import { LOGO_BASE64 } from '@/services/documents/logoBase64.js';

export const CONTRACT_VARIABLE_CATEGORIES = [
  {
    id: 'agency',
    name: 'Agencia (Empresa)',
    description: 'Datos fiscales y de contacto de la agencia de viajes',
    variables: [
      { key: '{{agency_name}}', label: 'Nombre de la Agencia', example: 'Habibi Adventure Hafa S.L.' },
      { key: '{{agency_cif}}', label: 'CIF / NIF', example: 'C.I.F. B-70659918' },
      { key: '{{agency_address}}', label: 'Dirección Fiscal', example: 'Calle Tetuán 14, 4º' },
      { key: '{{agency_postal_code}}', label: 'Código Postal / C.P.', example: 'C.P. 04740' },
      { key: '{{agency_city}}', label: 'Ciudad', example: 'Sevilla / Marrakech' },
      { key: '{{agency_country}}', label: 'País', example: 'España / Marruecos' },
      { key: '{{agency_phone}}', label: 'Teléfono(s)', example: '+34 611 144 040 / +212 524-001122' },
      { key: '{{agency_email}}', label: 'Correo Electrónico', example: 'info@habibiadventure.com' },
      { key: '{{agency_bank_name}}', label: 'Banco', example: 'Banco Santander' },
      { key: '{{agency_bank_iban}}', label: 'Cuenta Santander / IBAN', example: 'ES18 0049 1573 5127 1099 7804' },
      { key: '{{agency_bank_swift}}', label: 'Código SWIFT / BIC', example: 'BSCH ES MM' },
    ],
  },
  {
    id: 'customer',
    name: 'Cliente y Pasajeros',
    description: 'Información del contratante y grupo de viaje (obtenido de la reserva)',
    variables: [
      { key: '{{customer_name}}', label: 'Nombre Completo', example: 'Carlos Mendoza Ruiz' },
      { key: '{{customer_document}}', label: 'DNI / Pasaporte', example: 'PA49201948' },
      { key: '{{customer_phone}}', label: 'Teléfono Móvil', example: '+34 622 890 123' },
      { key: '{{customer_email}}', label: 'Correo Electrónico', example: 'carlos.mendoza@email.com' },
      { key: '{{customer_address}}', label: 'Dirección o Ciudad', example: 'Madrid, España' },
      { key: '{{customer_country}}', label: 'Nacionalidad / País', example: 'España' },
      { key: '{{pax_count}}', label: 'Número de Pasajeros', example: '2' },
    ],
  },
  {
    id: 'trip',
    name: 'Detalles del Viaje',
    description: 'Destino, fechas, etapas y modalidad del tour',
    variables: [
      { key: '{{trip_title}}', label: 'Título del Viaje Seleccionado', example: 'Gran Tour de Marruecos & Desierto del Sahara' },
      { key: '{{destination}}', label: 'Destino', example: 'Marruecos (Marrakech - Merzouga - Fez)' },
      { key: '{{start_date}}', label: 'Fecha de Salida', example: '26/12/2026' },
      { key: '{{end_date}}', label: 'Fecha de Regreso', example: '02/01/2027' },
      { key: '{{duration_days}}', label: 'Días de Viaje', example: '8' },
      { key: '{{duration_nights}}', label: 'Noches de Estancia', example: '7' },
      { key: '{{travel_modality}}', label: 'Modalidad de Viaje', example: 'Circuito Privado con Chófer y Guía' },
    ],
  },
  {
    id: 'financial',
    name: 'Precios y Condiciones de Pago',
    description: 'Importe total, anticipo del 40%, saldo del 60% en Marruecos y cuenta Santander',
    variables: [
      { key: '{{total_amount}}', label: 'Precio Total', example: '1.450,00' },
      { key: '{{currency}}', label: 'Moneda', example: 'EUR' },
      { key: '{{deposit_percentage}}', label: 'Porcentaje de Depósito', example: '40%' },
      { key: '{{deposit_amount}}', label: 'Importe Abonado / Depósito (40%)', example: '580,00' },
      { key: '{{remaining_amount}}', label: 'Saldo Restante en Marruecos (60%)', example: '870,00' },
      { key: '{{payment_deadline}}', label: 'Plazo Límite de Pago', example: '5 días naturales tras la reserva' },
      { key: '{{cancellation_policy}}', label: 'Cláusula de Cancelación', example: 'Pasados 21 días naturales...' },
    ],
  },
  {
    id: 'services',
    name: 'Servicios, Alojamientos e Itinerario',
    description: 'Listados estructurados de los servicios coordinados con paquetes',
    variables: [
      { key: '{{itinerary_list}}', label: 'Itinerario Completo (Día a Día)', example: '• Día 1: Llegada a Marrakech...\n• Día 2: Dades...' },
      { key: '{{included_services}}', label: 'Servicios Incluidos (Lista)', example: '• Transporte privado 4x4...\n• Guía oficial...' },
      { key: '{{excluded_services}}', label: 'Servicios No Incluidos (Lista)', example: '• Vuelos internacionales...\n• Bebidas...' },
      { key: '{{accommodations_list}}', label: 'Alojamientos (Lista)', example: '• Marrakech: Riad Al Jazira\n• Merzouga: Desert Camp...' },
    ],
  },
  {
    id: 'meta',
    name: 'Metadatos del Contrato',
    description: 'Referencia oficial, fecha y lugar de formalización',
    variables: [
      { key: '{{contract_number}}', label: 'Número de Contrato', example: 'CTR-2026-0042' },
      { key: '{{contract_date}}', label: 'Fecha del Contrato', example: '18/11/2026' },
      { key: '{{signed_place}}', label: 'Lugar de Formalización', example: 'Marrakech' },
    ],
  },
];

// Flat lookup map of all available variables
export const ALL_VARIABLES = CONTRACT_VARIABLE_CATEGORIES.flatMap((cat) => cat.variables);

// Default agency header settings (controllable from Settings)
export const DEFAULT_CONTRACT_HEADER_SETTINGS = {
  agency_name: 'Habibi Adventure Hafa S.L.',
  agency_cif: 'C.I.F. B-70659918',
  agency_address: 'Calle Tetuán 14, 4º',
  agency_postal_code: 'C.P. 04740',
  agency_city: 'Sevilla / Marrakech',
  agency_country: 'España / Marruecos',
  agency_phone: '+48 665 208 846 / +212 661-731123',
  agency_email: 'habibiadventure.26@gmail.com',
  bank_account_name: 'Banco Santander',
  bank_account_iban: 'ES18 0049 1573 5127 1099 7804',
  bank_account_swift: 'BSCH ES MM',
  logo_base64: '',
};

// The 16 Complete Standard Sections required by the contract specification
export const DEFAULT_DYNAMIC_SECTIONS = [
  {
    section_number: 1,
    section_key: 'sec_1_header',
    title_es: '1. ENCABEZADO Y DATOS DE LA AGENCIA (HEADER)',
    content_es: 'AGENCIA ORGANIZADORA: {{agency_name}}\nIDENTIFICACIÓN FISCAL / REGISTRO: {{agency_cif}} | {{agency_postal_code}}\nDOMICILIO SOCIAL: {{agency_address}}, {{agency_city}}, {{agency_country}}\nTELÉFONOS DE CONTACTO: {{agency_phone}}\nCORREO ELECTRÓNICO: {{agency_email}}',
    sort_order: 1,
    is_required: true,
  },
  {
    section_number: 2,
    section_key: 'sec_2_reserva_servicios',
    title_es: '2. CONTRATO DE RESERVA Y PRESTACIÓN DE SERVICIOS TURÍSTICOS',
    content_es: '## RESERVATION AND TOURIST SERVICES CONTRACT\n\n• **Viaje seleccionado / Selected Trip:** {{trip_title}}\n• **Duración / Duration:** {{duration_days}} días / {{duration_nights}} noches\n• **Fechas / Dates:** {{start_date}} - {{end_date}}\n• **Modalidad / Modality:** {{travel_modality}}',
    sort_order: 2,
    is_required: true,
  },
  {
    section_number: 3,
    section_key: 'sec_3_reunidos_partes',
    title_es: '3. PARTES INTERVINIENTES (REUNIDOS)',
    content_es: '**PARTE 1 - LA AGENCIA:**\n{{agency_name}}, con {{agency_cif}}, código postal {{agency_postal_code}}, con domicilio en {{agency_address}}, {{agency_city}}, {{agency_country}}. Teléfonos: {{agency_phone}}. Correo electrónico: {{agency_email}}.\n\n**PARTE 2 - EL CLIENTE (DATOS OBTENIDOS DE LA RESERVA):**\n• Nombre y apellidos: {{customer_name}}\n• DNI / Pasaporte / Documento de identidad: {{customer_document}}\n• Teléfono de contacto: {{customer_phone}}\n• Correo electrónico: {{customer_email}}\n• Domicilio: {{customer_address}}, {{customer_country}}',
    sort_order: 3,
    is_required: true,
  },
  {
    section_number: 4,
    section_key: 'sec_4_objeto_contrato',
    title_es: '4. OBJETO DEL CONTRATO (SUBJECT OF THE CONTRACT)',
    content_es: 'El presente contrato regula la reserva y prestación de los servicios turísticos correspondientes al viaje "{{trip_title}}" contratado para {{pax_count}} participante(s) a nombre de {{customer_name}}, con destino a {{destination}}, con arreglo a las condiciones generales y particulares estipuladas en este documento.',
    sort_order: 4,
    is_required: true,
  },
  {
    section_number: 5,
    section_key: 'sec_5_programa_viaje',
    title_es: '5. PROGRAMA DEL VIAJE (TRIP PROGRAM)',
    content_es: 'El itinerario y las etapas del viaje de {{duration_days}} días ({{duration_nights}} noches), coordinado con el paquete de viaje seleccionado, comprende el siguiente programa detallado:\n\n{{itinerary_list}}\n\nEl itinerario y las etapas del viaje podrán ser modificadas por causas de fuerza mayor debidamente justificadas o por imperativo de seguridad de los participantes.',
    sort_order: 5,
    is_required: true,
  },
  {
    section_number: 6,
    section_key: 'sec_6_precio',
    title_es: '6. PRECIO (PRICE)',
    content_es: 'El precio total estipulado para la reserva de {{pax_count}} participante(s) asciende a {{total_amount}} {{currency}}, desglosado conforme a los servicios, alojamientos y traslados acordados en la oferta contratada.',
    sort_order: 6,
    is_required: true,
  },
  {
    section_number: 7,
    section_key: 'sec_7_servicios_incluidos',
    title_es: '7. SERVICIOS INCLUIDOS (INCLUDED SERVICES)',
    content_es: 'El viaje comprende expresamente la inclusión de los siguientes servicios:\n{{included_services}}',
    sort_order: 7,
    is_required: true,
  },
  {
    section_number: 8,
    section_key: 'sec_8_servicios_no_incluidos',
    title_es: '8. SERVICIOS NO INCLUIDOS (NON INCLUDED SERVICES)',
    content_es: 'Quedan expresamente excluidos del precio del viaje los siguientes conceptos:\n{{excluded_services}}',
    sort_order: 8,
    is_required: true,
  },
  {
    section_number: 9,
    section_key: 'sec_9_reserva_pago',
    title_es: '9. RESERVA Y PAGO (RESERVATION AND PAYMENT)',
    content_es: 'La reserva queda formalmente confirmada con el abono del 40% del importe total en un plazo máximo de 5 días naturales tras la formalización del contrato.\n\n• Importe abonado / Depósito (40%): {{deposit_amount}} {{currency}}\n• Cuenta bancaria / Santander Account: {{agency_bank_iban}}\n• SWIFT / BIC: {{agency_bank_swift}}\n\nEl 60% restante ({{remaining_amount}} {{currency}}) se abonará en efectivo en Marruecos a la llegada de los participantes.',
    sort_order: 9,
    is_required: true,
  },
  {
    section_number: 10,
    section_key: 'sec_10_cancelacion_reembolso',
    title_es: '10. CANCELACIÓN Y DEVOLUCIÓN (CANCELLATION AND REFUND)',
    content_es: 'Pasados 21 días naturales desde el abono del pago, el depósito es no reembolsable bajo ninguna circunstancia. La fecha válida a efectos de cómputo de plazos será la de recepción fehaciente de la comunicación escrita remitida a la Agencia.',
    sort_order: 10,
    is_required: true,
  },
  {
    section_number: 11,
    section_key: 'sec_11_alojamiento',
    title_es: '11. ALOJAMIENTO (ACCOMMODATION)',
    content_es: 'Los alojamientos previstos para este itinerario, obtenidos de los detalles del viaje, son:\n{{accommodations_list}}\n\nEn caso de fuerza mayor o circunstancias sobrevenidas ajenas al control de la Agencia, se garantizará la asignación de un establecimiento alternativo de igual o superior categoría contratada.',
    sort_order: 11,
    is_required: true,
  },
  {
    section_number: 12,
    section_key: 'sec_12_obligaciones_cliente',
    title_es: '12. OBLIGACIONES DEL CLIENTE (CLIENT OBLIGATIONS)',
    content_es: 'El Cliente y los participantes se obligan expresamente a:\n• Facilitar documentación identificativa válida y en vigor (pasaporte con vigencia mínima de 6 meses).\n• Respetar con puntualidad los horarios e instrucciones de los guías y organizadores.\n• Abonar los importes y saldos pendientes en los términos y plazos convenidos.\n• Cumplir escrupulosamente las normas de convivencia y régimen interior de los alojamientos y actividades contratadas.',
    sort_order: 12,
    is_required: true,
  },
  {
    section_number: 13,
    section_key: 'sec_13_fuerza_mayor',
    title_es: '13. FUERZA MAYOR (FORCE MAJEURE)',
    content_es: 'La Agencia no se hace responsable de modificaciones, retrasos o cancelaciones derivados de causas de fuerza mayor, tales como incidencias o problemas de tráfico, lluvia, tormentas, fuertes vientos, pandemias o terremotos.',
    sort_order: 13,
    is_required: true,
  },
  {
    section_number: 14,
    section_key: 'sec_14_detalles_adicionales_notas',
    title_es: '14. DETALLES ADICIONALES Y NOTAS DEL PROGRAMA (Polish Itinerary Notes)',
    content_es: '**Parte 1: Servicios incluidos en el precio:**\n{{included_services}}\n\n**Parte 2: Servicios NO incluidos en el precio:**\n{{excluded_services}}\n\n**Notas y Observaciones de Ruta (Polish Itinerary Notes):**\n• Se recomienda llevar vestimenta adecuada según las estaciones y calzado cómodo para las etapas de marcha.\n• Los horarios de traslados al aeropuerto se reconfirmarán con el conductor asignado según el itinerario del vuelo.',
    sort_order: 14,
    is_required: true,
  },
  {
    section_number: 15,
    section_key: 'sec_15_anexo_apendice_1',
    title_es: '15. ANEXO AL CONTRATO / APÉNDICE N.º 1 (CONTRACT ANNEX / APPENDIX NO. 1)',
    content_es: '**Condiciones organizativas del viaje:**\n• **Organizador:** {{agency_name}} (CIF: {{agency_cif}})\n• **Participante:** {{customer_name}} (Documento: {{customer_document}})\n• **Fecha y Lugar:** {{contract_date}}, {{signed_place}}\n\nDisposiciones organizativas acordadas entre las partes:\n1. Coordinación directa y canal de comunicación telefónica durante las 24 horas en Marruecos.\n2. La contratación no ampara incidencias cuando el viajero se desvíe unilateralmente del itinerario fijado.\n3. El viajero responderá de la custodia de sus efectos personales durante todo el itinerario.',
    sort_order: 15,
    is_required: true,
  },
  {
    section_number: 16,
    section_key: 'sec_16_aceptacion_firmas',
    title_es: '16. ACEPTACIÓN DE CONDICIONES Y FIRMAS (ACCEPTANCE & SIGNATURES)',
    content_es: 'Ambas partes declaran haber leído, comprendido y aceptado en su integridad todas las cláusulas, especificaciones, anexos y notas estipuladas en el presente contrato formalizado en {{signed_place}} a fecha de {{contract_date}}.\n\nLugar y fecha de formalización: {{signed_place}}, a {{contract_date}}\n\nEl Cliente:\nNombre: {{customer_name}}\nFirma: _________________________________________\n\nPor la Agencia:\n{{agency_name}}\nFirma y Sello: _________________________________________',
    sort_order: 16,
    is_required: true,
  },
];

export const DEFAULT_MAIN_TEMPLATE = {
  id: 'tpl-custom-main',
  name: 'Contrato Oficial de 16 Cláusulas Turísticas',
  code: 'MAIN_DYNAMIC_TEMPLATE_V2',
  description: 'Plantilla oficial completa con 16 secciones estándar, encabezado editable, cuenta Santander y variables dinámicas.',
  primary_language: 'es',
  secondary_language: null,
  version: 3,
  is_active: true,
  is_main: true,
  header_settings: DEFAULT_CONTRACT_HEADER_SETTINGS,
  sections: DEFAULT_DYNAMIC_SECTIONS,
};

const TEMPLATE_STORAGE_KEY = 'custom_contract_main_template_v2';
const HEADER_STORAGE_KEY = 'custom_contract_header_settings_v2';

/**
 * Retrieves the saved contract header settings from localStorage.
 */
export function getSavedContractHeaderSettings() {
  try {
    const raw = localStorage.getItem(HEADER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return { ...DEFAULT_CONTRACT_HEADER_SETTINGS, ...parsed };
      }
    }
  } catch (e) {
    console.warn('Error reading saved contract header settings:', e);
  }
  return { ...DEFAULT_CONTRACT_HEADER_SETTINGS };
}

/**
 * Saves the contract header settings to localStorage.
 */
export function saveContractHeaderSettings(settings) {
  try {
    const toSave = {
      ...DEFAULT_CONTRACT_HEADER_SETTINGS,
      ...settings,
      updated_at: new Date().toISOString(),
    };
    localStorage.setItem(HEADER_STORAGE_KEY, JSON.stringify(toSave));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('contract-header-updated', { detail: toSave }));
    }
    return true;
  } catch (e) {
    console.error('Error saving contract header settings:', e);
    return false;
  }
}

/**
 * Retrieves the user-saved main contract template from localStorage,
 * falling back to DEFAULT_MAIN_TEMPLATE with 16 sections.
 */
export function getSavedContractTemplate() {
  try {
    const raw = localStorage.getItem(TEMPLATE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.sections) && parsed.sections.length > 0) {
        return {
          ...parsed,
          id: 'tpl-custom-main',
          is_main: true,
        };
      }
    }
  } catch (e) {
    console.warn('Error reading saved contract template:', e);
  }
  return {
    ...DEFAULT_MAIN_TEMPLATE,
    header_settings: getSavedContractHeaderSettings(),
  };
}

/**
 * Saves the main contract template to localStorage.
 */
export function saveContractTemplate(template) {
  try {
    const toSave = {
      ...template,
      id: 'tpl-custom-main',
      is_main: true,
      updated_at: new Date().toISOString(),
    };
    localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(toSave));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('contract-template-updated', { detail: toSave }));
    }
    return true;
  } catch (e) {
    console.error('Error saving contract template:', e);
    return false;
  }
}

/**
 * Resets the contract template to default 16 sections and standard header.
 */
export function resetContractTemplateToDefault() {
  saveContractHeaderSettings(DEFAULT_CONTRACT_HEADER_SETTINGS);
  saveContractTemplate(DEFAULT_MAIN_TEMPLATE);
  return DEFAULT_MAIN_TEMPLATE;
}

/**
 * Replaces all placeholders in a text template with corresponding values from the context object.
 * Handles both {{var}} and {var} syntaxes, ignoring case and surrounding whitespaces.
 */
export function replaceTemplateVariables(text, context = {}) {
  if (!text || typeof text !== 'string') return text || '';

  const formatMoney = (val) => {
    if (val === null || val === undefined || isNaN(val)) return '0,00';
    return Number(val).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = (val) => {
    if (!val) return '';
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return String(val);
      return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return String(val);
    }
  };

  const headerSettings = getSavedContractHeaderSettings();

  const totalNum = Number(context.total_amount || 0);
  const depPct = Number(context.deposit_percentage || 40);
  const depAmount = context.deposit_amount !== undefined ? Number(context.deposit_amount) : Math.round((totalNum * depPct) / 100);
  const remAmount = context.remaining_amount !== undefined ? Number(context.remaining_amount) : Math.max(0, totalNum - depAmount);

  // Build full replacement dictionary
  const dict = {
    // Agency Header & Identifiers
    agency_name: context.agency_name || context.agencyName || headerSettings.agency_name || 'Habibi Adventure Hafa S.L.',
    agency_cif: context.agency_tax_number || context.agency_cif || context.cif || headerSettings.agency_cif || 'C.I.F. B-70659918',
    agency_address: context.agency_address || context.addressLine1 || headerSettings.agency_address || 'Calle Tetuán 14, 4º',
    agency_postal_code: context.agency_postal_code || context.postal_code || context.cp || headerSettings.agency_postal_code || 'C.P. 04740',
    agency_cp: context.agency_postal_code || context.postal_code || context.cp || headerSettings.agency_postal_code || 'C.P. 04740',
    agency_city: context.agency_city || headerSettings.agency_city || 'Sevilla / Marrakech',
    agency_country: context.agency_country || headerSettings.agency_country || 'España / Marruecos',
    agency_phone: context.agency_phone || context.phone || headerSettings.agency_phone || '+48 665 208 846 / +212 661-731123',
    agency_phones: context.agency_phone || context.phone || headerSettings.agency_phone || '+48 665 208 846 / +212 661-731123',
    agency_email: context.agency_email || context.email || headerSettings.agency_email || 'info@habibiadventure.com',
    agency_bank_name: context.bank_account_name || headerSettings.bank_account_name || 'Banco Santander',
    agency_bank_iban: context.bank_account_iban || headerSettings.bank_account_iban || 'ES18 0049 1573 5127 1099 7804',
    santander_account: context.bank_account_iban || headerSettings.bank_account_iban || 'ES18 0049 1573 5127 1099 7804',
    agency_bank_swift: context.bank_account_swift || headerSettings.bank_account_swift || 'BSCH ES MM',
    swift_bic: context.bank_account_swift || headerSettings.bank_account_swift || 'BSCH ES MM',

    // Customer / Booking Info
    customer_name: context.customer_name || context.client_name || context.primary_contact_name || 'Cliente',
    customer_document: context.customer_document || context.passport_number || context.id_number || 'Pendiente de facilitar',
    customer_phone: context.customer_phone || context.phone || 'Pendiente de facilitar',
    customer_email: context.customer_email || context.email || 'Pendiente de facilitar',
    customer_address: context.customer_address || context.address || 'Domicilio no especificado',
    customer_country: context.customer_country || context.nationality || 'España',
    pax_count: String(context.pax_count || context.participants_count || (context.participants && context.participants.length) || 1),

    // Trip & Package Details
    trip_title: context.trip_title || context.package_name || context.offer_title || 'Viaje Personalizado a Marruecos',
    destination: context.destination || 'Marruecos',
    start_date: formatDate(context.start_date || context.departure_date),
    end_date: formatDate(context.end_date || context.return_date),
    duration_days: String(context.duration_days || 1),
    duration_nights: String(context.duration_nights || Math.max(0, (Number(context.duration_days) || 1) - 1)),
    travel_modality: context.travel_modality || 'Circuito Privado con Chófer y Guía',
    modality: context.travel_modality || 'Circuito Privado con Chófer y Guía',

    // Financial & Payment Terms
    total_amount: formatMoney(totalNum),
    currency: context.currency || 'EUR',
    deposit_percentage: `${depPct}%`,
    deposit_amount: formatMoney(depAmount),
    amount_paid: formatMoney(depAmount),
    remaining_amount: formatMoney(remAmount),
    payment_deadline: context.payment_deadline
      ? formatDate(context.payment_deadline)
      : '5 días naturales tras formalizar la reserva',
    cancellation_policy: context.cancellation_policy_es || 'Pasados 21 días naturales desde el abono del pago, el depósito es no reembolsable bajo ninguna circunstancia.',

    // Services & Itinerary
    itinerary_list: Array.isArray(context.itinerary) && context.itinerary.length > 0
      ? context.itinerary.map((it, idx) => {
          const day = it.day_number || idx + 1;
          const title = it.title_es || it.title || `Día ${day}`;
          const desc = it.description_es || it.description || '';
          return `• Día ${day}: ${title}${desc ? ' — ' + desc : ''}`;
        }).join('\n')
      : '• Día 1: Llegada y recepción en destino.\n• Día 2: Excursiones y visitas guiadas según el programa oficial.\n• Día 3: Traslado y regreso.',

    included_services: Array.isArray(context.services) && context.services.filter(s => s.service_type === 'included').length > 0
      ? context.services
          .filter(s => s.service_type === 'included')
          .map(s => `• ${s.title_es || s.title || s.description || ''}`)
          .join('\n')
      : '• Transporte privado y traslados indicados en el itinerario.\n• Conductor / Guía profesional durante las excursiones.\n• Seguro básico de asistencia y responsabilidad civil.',

    excluded_services: Array.isArray(context.services) && context.services.filter(s => s.service_type === 'excluded').length > 0
      ? context.services
          .filter(s => s.service_type === 'excluded')
          .map(s => `• ${s.title_es || s.title || s.description || ''}`)
          .join('\n')
      : '• Vuelos internacionales y tasas de aeropuerto.\n• Bebidas alcohólicas y comidas no especificadas.\n• Entradas a monumentos o propinas personales.',

    accommodations_list: Array.isArray(context.accommodations) && context.accommodations.length > 0
      ? context.accommodations
          .map(a => `• ${a.location ? a.location + ': ' : ''}${a.accommodation_name || a.name || 'Hotel/Riad'}${a.room_type ? ' (' + a.room_type + ')' : ''}`)
          .join('\n')
      : '• Alojamientos seleccionados de categoría superior según especificaciones de la reserva.',

    // Meta
    contract_number: context.contract_number || 'CTR-2026-XXXX',
    contract_date: formatDate(context.contract_date || new Date()),
    signed_place: context.signed_place || 'Marrakech',
  };

  // Perform dynamic replacement: matches {{key}} or {key}
  return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}|\{\s*([a-zA-Z0-9_]+)\s*\}/g, (match, p1, p2) => {
    const key = (p1 || p2).toLowerCase();
    if (Object.prototype.hasOwnProperty.call(dict, key)) {
      return dict[key] !== null && dict[key] !== undefined ? dict[key] : '';
    }
    return match;
  });
}
