// Official Travel Contract PDF Generation Service
// Strict 16-Section Architecture modeled on the official tourism contract regulations,
// featuring editable header with logo upload, agency C.P., Santander bank account, and dynamic placeholders.

import * as jspdfModule from 'jspdf';
import { LOGO_BASE64 } from './logoBase64.js';
import {
  replaceTemplateVariables,
  getSavedContractTemplate,
  getSavedContractHeaderSettings,
} from '@/pages/admin/contracts/templateEngine.js';

const jsPDF = jspdfModule.jsPDF || jspdfModule.default;

// Palette matching the reference document
const COLOR_DARK_HEADER = [35, 31, 28];       // #231f1c - Dark header banner
const COLOR_GOLD = [235, 185, 110];           // #ebb96e - Gold banner text
const COLOR_ORANGE = [224, 114, 0];           // #e07200 - Headings & accents
const COLOR_BLUE = [37, 99, 235];             // #2563eb - Customer data & numbers
const COLOR_BORDER_GREEN = [16, 149, 118];    // #109576 - Green badge border
const COLOR_BLACK = [25, 25, 25];

function sanitizeForPdf(text) {
  if (!text) return '';
  return String(text)
    .replace(/[\u2010\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2022/g, '-')
    .replace(/[^\x00-\xFF]/g, '');
}

function pdfDate(d) {
  if (!d) return '';
  try {
    const parsed = new Date(d);
    if (isNaN(parsed.getTime())) return String(d);
    const day = String(parsed.getDate()).padStart(2, '0');
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const year = parsed.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return String(d);
  }
}

function pdfMoney(amount, currency = 'EUR') {
  const val = Number(amount || 0).toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const symbol = currency === 'EUR' ? '€' : currency;
  return `${val} ${symbol}`;
}

export async function buildContractPdf({
  contract = {},
  participants = [],
  itinerary = [],
  pricing = [],
  services = [],
  accommodations = [],
  sections = [],
  agencyConfig = {},
}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const W = 210;
  const H = 297;
  const M = 18; // Margin: 18mm
  const contentW = W - M * 2;
  let curY = 16;
  const bottomThreshold = H - 22;

  const checkPageBreak = (neededHeight = 12) => {
    if (curY + neededHeight > bottomThreshold) {
      doc.addPage();
      curY = 22;
      return true;
    }
    return false;
  };

  const headerSettings = getSavedContractHeaderSettings();

  const agencyName = contract.agency_name || agencyConfig.companyName || headerSettings.agency_name || 'Habibi Adventure Hafa S.L.';
  const agencyAddress = contract.agency_address || agencyConfig.addressLine1 || headerSettings.agency_address || 'Calle Tetuán 14, 4º';
  const agencyPostal = contract.agency_postal_code || headerSettings.agency_postal_code || 'C.P. 04740';
  const agencyCif = contract.agency_tax_number || agencyConfig.taxNumber || headerSettings.agency_cif || 'C.I.F. B-70659918';
  const agencyCity = contract.agency_city || headerSettings.agency_city || 'Sevilla / Marrakech';
  const agencyCountry = contract.agency_country || headerSettings.agency_country || 'España / Marruecos';
  const agencyPhone = contract.agency_phone || agencyConfig.phone || headerSettings.agency_phone || '+48 665 208 846 / +212 661-731123';
  const agencyEmail = contract.agency_email || agencyConfig.email || headerSettings.agency_email || 'info@habibiadventure.com';
  const bankAcc = contract.bank_account_iban || headerSettings.bank_account_iban || 'ES18 0049 1573 5127 1099 7804';
  const swiftCode = contract.bank_account_swift || headerSettings.bank_account_swift || 'BSCH ES MM';

  // Resolve logo: uploaded logo from contract or settings, fallback to base logo
  const logoImage = contract.agency_logo || agencyConfig.logo_base64 || headerSettings.logo_base64 || LOGO_BASE64;

  const travelersList = (participants && participants.length > 0)
    ? participants
    : [
        {
          full_name: contract.customer_name || '',
          document_number: contract.customer_document || '',
          phone: contract.customer_phone || '',
          email: contract.customer_email || agencyEmail,
          address: contract.customer_address || '',
          nationality: contract.customer_country || 'España',
        },
      ];

  const primaryClient = travelersList[0] || {};
  const namesString = travelersList.map((t) => t.full_name).filter(Boolean).join(' | ') || primaryClient.full_name || '—';
  const docsString = travelersList.map((t) => t.document_number).filter(Boolean).join(' | ') || primaryClient.document_number || '—';
  const phoneString = primaryClient.phone || contract.customer_phone || '—';
  const emailString = primaryClient.email || contract.customer_email || agencyEmail;
  const addressString = primaryClient.address || contract.customer_address || '—';

  /* ========================================================================= */
  /* SECTION 1: EDITABLE HEADER BANNER WITH LOGO, NAME, PHONES, C.P. 04740    */
  /* ========================================================================= */

  const bannerW = contentW;
  const bannerH = 28;
  doc.setFillColor(...COLOR_DARK_HEADER);
  doc.roundedRect(M, curY, bannerW, bannerH, 4, 4, 'F');

  // Insert Logo on left of banner
  try {
    if (logoImage) {
      doc.addImage(logoImage, 'PNG', M + 6, curY + 3.5, 21, 21);
    }
  } catch (err) {
    console.warn('Could not render logo in PDF banner:', err);
  }

  // Right side of banner: Agency info in elegant gold text with C.P. identifier
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(...COLOR_GOLD);
  const bannerTextX = M + bannerW - 8;
  doc.text(sanitizeForPdf(agencyName), bannerTextX, curY + 6.5, { align: 'right' });
  doc.setFontSize(8.5);
  doc.text(sanitizeForPdf(`${agencyAddress} • ${agencyPostal} ${agencyCity}`), bannerTextX, curY + 11.5, { align: 'right' });
  doc.text(sanitizeForPdf(`${agencyCif} • ${agencyCountry}`), bannerTextX, curY + 16, { align: 'right' });
  doc.text(sanitizeForPdf(`Tel: ${agencyPhone} • ${agencyEmail}`), bannerTextX, curY + 20.5, { align: 'right' });

  curY += bannerH + 8;

  /* ========================================================================= */
  /* SECTION 2: ## RESERVATION AND TOURIST SERVICES CONTRACT                  */
  /* ========================================================================= */
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...COLOR_BLACK);
  doc.text('CONTRATO DE RESERVA Y PRESTACIÓN', M, curY);
  curY += 6;
  doc.text('DE SERVICIOS TURÍSTICOS', M, curY);
  curY += 8.5;

  const renderField = (title, value) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...COLOR_BLACK);
    doc.text(title, M, curY);
    curY += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...COLOR_BLACK);
    const lines = doc.splitTextToSize(sanitizeForPdf(value), contentW);
    doc.text(lines, M, curY);
    curY += lines.length * 4.3 + 3.5;
  };

  const tripTitle = contract.trip_title || 'Viaje Personalizado a Marruecos';
  renderField('Viaje / Trip', tripTitle);

  const durationStr = `${contract.duration_days || 1} días / ${contract.duration_nights || 0} noches`;
  renderField('Duración / Duration', durationStr);

  const datesStr = contract.start_date && contract.end_date
    ? `${pdfDate(contract.start_date)} - ${pdfDate(contract.end_date)}`
    : (contract.start_date ? pdfDate(contract.start_date) : 'A convenir con el cliente');
  renderField('Fechas / Dates', datesStr);

  const modalityStr = contract.travel_modality || 'Circuito Privado con Chófer y Guía Profesional';
  renderField('Modalidad / Modality', modalityStr);

  curY += 2;

  /* ========================================================================= */
  /* SECTION 3: REUNIDOS (PART 1: AGENCY & PART 2: CLIENT FETCHED FROM BOOKING)*/
  /* ========================================================================= */
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...COLOR_BLACK);
  doc.text('REUNIDOS - PARTES INTERVINIENTES', M, curY);
  curY += 7;

  // Parte 1: La Agencia
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...COLOR_BLACK);
  doc.text('PARTE 1 - La Agencia:', M, curY);
  curY += 4.5;

  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(9.5);
  doc.setTextColor(...COLOR_ORANGE);
  doc.text(sanitizeForPdf(agencyName.toUpperCase()), M, curY);
  const agencyNameW = doc.getTextWidth(sanitizeForPdf(agencyName.toUpperCase()) + '  ');
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_BLACK);
  doc.text(sanitizeForPdf(`${agencyCif} • ${agencyPostal} • ${agencyCity}`), M + agencyNameW, curY);
  curY += 7;

  // Parte 2: El Cliente
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...COLOR_BLACK);
  doc.text('PARTE 2 - El Cliente (Datos obtenidos de la reserva):', M, curY);
  curY += 5;

  const renderClientDetail = (label, value) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...COLOR_BLACK);
    doc.text(label + ': ', M, curY);
    const labelW = doc.getTextWidth(label + ': ');

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLOR_BLUE);
    const valLines = doc.splitTextToSize(sanitizeForPdf(value), contentW - labelW);
    doc.text(valLines, M + labelW, curY);
    curY += valLines.length * 4.2 + 1.2;
  };

  renderClientDetail('Nombre y apellidos', namesString);
  renderClientDetail('DNI / Pasaporte / Documento', docsString);
  renderClientDetail('Teléfono de contacto', phoneString);
  renderClientDetail('Correo electrónico', emailString);
  renderClientDetail('Domicilio', addressString);

  curY += 2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_BLACK);
  doc.text('Ambas partes acuerdan celebrar el presente contrato con arreglo a las siguientes cláusulas y estipulaciones.', M, curY);

  /* ========================================================================= */
  /* ARTICLES 4 THROUGH 16: NUMBERED SECTIONS WITH RICH BADGES & STYLING       */
  /* ========================================================================= */

  const renderArticleHeading = (num, title) => {
    checkPageBreak(22);
    curY += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...COLOR_ORANGE);
    doc.text(`${num}. ${title.toUpperCase()}`, M, curY);
    curY += 6;
  };

  const renderParagraph = (text) => {
    if (!text) return;
    checkPageBreak(12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...COLOR_BLACK);
    const lines = doc.splitTextToSize(sanitizeForPdf(text), contentW);
    doc.text(lines, M, curY);
    curY += lines.length * 4.3 + 3;
  };

  const renderBullet = (text) => {
    if (!text) return;
    checkPageBreak(10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...COLOR_BLACK);
    const bulletPrefix = '•  ';
    const bW = doc.getTextWidth(bulletPrefix);
    const lines = doc.splitTextToSize(sanitizeForPdf(text), contentW - bW);
    doc.text(bulletPrefix, M, curY);
    doc.text(lines, M + bW, curY);
    curY += lines.length * 4.3 + 1.8;
  };

  // Start Section 4 on Page 2 for clean document flow
  doc.addPage();
  curY = 22;

  // Resolve effective sections from parameter, contract object, or saved custom template
  const effectiveSections = (sections && sections.length > 0)
    ? sections
    : ((contract.sections && contract.sections.length > 0)
      ? contract.sections
      : getSavedContractTemplate().sections);

  const depPct = Number(contract.deposit_percentage || 40);
  const totalAmount = Number(contract.total_amount || 0);
  const depAmount = contract.deposit_amount !== undefined ? Number(contract.deposit_amount) : Math.round((totalAmount * depPct) / 100);
  const remAmount = contract.remaining_amount !== undefined ? Number(contract.remaining_amount) : Math.max(0, totalAmount - depAmount);

  const templateContext = {
    ...contract,
    agency_name: agencyName,
    agency_cif: agencyCif,
    agency_address: agencyAddress,
    agency_postal_code: agencyPostal,
    agency_city: agencyCity,
    agency_country: agencyCountry,
    agency_phone: agencyPhone,
    agency_email: agencyEmail,
    bank_account_name: 'Banco Santander',
    bank_account_iban: bankAcc,
    santander_account: bankAcc,
    bank_account_swift: swiftCode,
    swift_bic: swiftCode,
    customer_name: namesString,
    customer_document: primaryClient.document_number,
    customer_phone: primaryClient.phone,
    customer_email: primaryClient.email,
    customer_address: primaryClient.address,
    customer_country: primaryClient.nationality,
    pax_count: participants.length || contract.pax_count || 1,
    trip_title: tripTitle,
    destination: contract.destination || 'Marruecos',
    start_date: contract.start_date,
    end_date: contract.end_date,
    duration_days: contract.duration_days || 1,
    duration_nights: contract.duration_nights || 0,
    travel_modality: modalityStr,
    total_amount: totalAmount,
    currency: contract.currency || 'EUR',
    deposit_percentage: depPct,
    deposit_amount: depAmount,
    remaining_amount: remAmount,
    payment_deadline: contract.payment_deadline,
    cancellation_policy_es: contract.cancellation_policy_es,
    itinerary,
    pricing,
    services,
    accommodations,
    contract_number: contract.contract_number,
    contract_date: contract.contract_date || contract.signed_at,
    signed_place: contract.signed_place || 'Marrakech',
  };

  // Filter out header and reunidos from body loop if already rendered on Page 1
  const bodySections = effectiveSections.filter(
    (sec) => sec.section_key !== 'sec_1_header' && sec.section_key !== 'sec_2_reserva_servicios' && sec.section_key !== 'sec_3_reunidos_partes'
  );

  bodySections.forEach((sec, idx) => {
    const rawTitle = sec.title_es || sec.title || `Cláusula ${idx + 4}`;
    const cleanTitle = rawTitle.replace(/^\d+[\.\-\s]+/, '');
    const secNum = sec.section_number || idx + 4;
    renderArticleHeading(String(secNum), cleanTitle);

    const rawContent = sec.content_es || sec.default_content_es || sec.content || '';
    const evaluatedContent = replaceTemplateVariables(rawContent, templateContext);

    const lines = evaluatedContent.split('\n');
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        curY += 1.5;
      } else if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
        renderBullet(trimmed.replace(/^[•\-\*]\s*/, ''));
      } else {
        renderParagraph(trimmed);
      }
    });

    const titleUpper = rawTitle.toUpperCase();

    // Section 6: Visual Green Total Price Badge
    if (titleUpper.includes('PRECIO') || sec.section_key === 'sec_6_precio' || sec.section_key === '3_precio') {
      checkPageBreak(18);
      curY += 2;
      const totalPriceVal = pdfMoney(totalAmount, contract.currency || 'EUR');
      const totalBoxW = 95;
      const totalBoxH = 10;
      doc.setDrawColor(...COLOR_BORDER_GREEN);
      doc.setLineWidth(0.8);
      doc.roundedRect(M, curY, totalBoxW, totalBoxH, 2.5, 2.5, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(...COLOR_BLACK);
      doc.text('Precio total acordado: ', M + 3, curY + 6.8);
      const ptW = doc.getTextWidth('Precio total acordado: ');
      doc.setTextColor(...COLOR_BLUE);
      doc.text(totalPriceVal, M + 3 + ptW, curY + 6.8);
      curY += totalBoxH + 6;
    }

    // Section 9: Visual Deposit Badge, Santander Account & 60% Cash in Morocco
    if (titleUpper.includes('RESERVA Y PAGO') || sec.section_key === 'sec_9_reserva_pago' || sec.section_key === '6_reserva_pago') {
      checkPageBreak(30);
      curY += 2;
      const depositVal = pdfMoney(depAmount, contract.currency || 'EUR');
      const depositBoxW = 90;
      const depositBoxH = 9.5;
      doc.setDrawColor(...COLOR_BORDER_GREEN);
      doc.setLineWidth(0.8);
      doc.roundedRect(M, curY, depositBoxW, depositBoxH, 2, 2, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...COLOR_BLACK);
      doc.text('Importe abonado (Depósito 40%): ', M + 3, curY + 6.3);
      const dpW = doc.getTextWidth('Importe abonado (Depósito 40%): ');
      doc.setTextColor(...COLOR_BLUE);
      doc.text(depositVal, M + 3 + dpW, curY + 6.3);
      curY += depositBoxH + 5;

      // Santander Account Info in Orange / Gold
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...COLOR_ORANGE);
      doc.text(`CUENTA SANTANDER / IBAN : ${sanitizeForPdf(bankAcc)}`, M, curY);
      curY += 5.5;
      doc.text(`SWIFT / BIC : ${sanitizeForPdf(swiftCode)}`, M, curY);
      curY += 6;

      // The remaining 60% cash statement
      doc.setFont('helvetica', 'bolditalic');
      doc.setFontSize(9.5);
      doc.setTextColor(...COLOR_BLACK);
      doc.text(`El 60% restante (${pdfMoney(remAmount, contract.currency || 'EUR')}) se abonará en efectivo en Marruecos a la llegada.`, M, curY);
      curY += 7.5;
    }
  });

  return doc;
}
