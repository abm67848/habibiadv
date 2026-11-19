import { DEFAULT_INVOICE_SETTINGS } from '@/context/AppSettingsContext.jsx';
import { LOGO_BASE64 } from './logoBase64.js';

const finiteAmount = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
};

const customerFromBooking = (booking) => {
  const customer = booking?.customers;
  return Array.isArray(customer) ? customer[0] || {} : customer || {};
};

export const pdfMoney = (value, currency) => {
  const amount = finiteAmount(value);
  if (amount === null) return '—';
  return `${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency || ''}`.trim();
};

export const pdfDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatPaymentMethod = (method) =>
  String(method || '—')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export const getTransactionReference = (payment) =>
  String(payment?.transaction_reference_unique || payment?.transaction_reference || payment?.id || '');

export const getInvoiceNumber = (payment, invoiceConfig = {}) => {
  const isRefund = payment?.transaction_type === 'refund';
  const prefix = isRefund
    ? invoiceConfig.creditNotePrefix || 'CN'
    : invoiceConfig.invoicePrefix || 'INV';
  const reference = getTransactionReference(payment);
  return reference ? `${prefix}-${reference}` : prefix;
};

export const getInvoiceFileName = (payment, invoiceConfig = {}) =>
  `${getInvoiceNumber(payment, invoiceConfig).replace(/[^\w.-]+/g, '-')}.pdf`;

export function getInvoiceSummary({
  payment = {},
  booking = {},
  ledger = [],
  invoiceConfig = {},
  defaultCurrency = 'MAD',
}) {
  const bookingCurrency = booking.currency || defaultCurrency || 'MAD';
  const paymentCurrency = payment.currency || bookingCurrency;
  const bookingTotal = finiteAmount(booking.total_amount);
  const paymentAmount = finiteAmount(payment.amount);
  const vatRate = invoiceConfig.vatRate === undefined || invoiceConfig.vatRate === null || invoiceConfig.vatRate === ''
    ? 0
    : finiteAmount(invoiceConfig.vatRate);
  const vatAmount = bookingTotal === null || vatRate === null ? null : (bookingTotal * vatRate) / 100;
  const grandTotal = bookingTotal === null || vatAmount === null ? null : bookingTotal + vatAmount;
  const completedEntries = (Array.isArray(ledger) ? ledger : [])
    .filter((entry) => entry?.transaction_status === 'completed');
  const invalidLedgerAmounts = completedEntries.some((entry) => finiteAmount(entry.amount) === null);
  let mixedCurrencies = completedEntries.some(
    (entry) => entry.currency && entry.currency !== bookingCurrency
  );
  const transactionAmount = paymentAmount === null
    ? null
    : (payment.transaction_type === 'refund' ? -Math.abs(paymentAmount) : Math.abs(paymentAmount));

  let paidToDate = null;
  if (!mixedCurrencies && !invalidLedgerAmounts) {
    if (completedEntries.length > 0) {
      paidToDate = completedEntries.reduce((sum, entry) => {
        const amount = finiteAmount(entry.amount) ?? 0;
        return sum + (entry.transaction_type === 'refund' ? -Math.abs(amount) : Math.abs(amount));
      }, 0);
    } else if (payment.transaction_status === 'completed' && transactionAmount !== null) {
      mixedCurrencies = paymentCurrency !== bookingCurrency;
      if (!mixedCurrencies) paidToDate = transactionAmount;
    } else {
      paidToDate = 0;
    }
  }

  const balance = grandTotal === null || paidToDate === null ? null : grandTotal - paidToDate;
  const travelers = finiteAmount(booking.traveler_count);

  return {
    bookingCurrency,
    paymentCurrency,
    bookingTotal,
    paymentAmount,
    transactionAmount,
    vatRate,
    vatAmount,
    grandTotal,
    paidToDate,
    balance,
    mixedCurrencies,
    invalidLedgerAmounts,
    travelers: travelers && travelers > 0 ? travelers : null,
    customer: customerFromBooking(booking),
  };
}

function drawCard(doc, { x, y, width, height, title, values, colors }) {
  const { border, background, navy, muted } = colors;
  doc.setDrawColor(...border);
  doc.setFillColor(...background);
  doc.roundedRect(x, y, width, height, 2.5, 2.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...muted);
  doc.text(title.toUpperCase(), x + 5, y + 7);

  let textY = y + 14;
  values.forEach(({ text, bold = false }) => {
    if (!text) return;
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 9 : 8);
    doc.setTextColor(...(bold ? navy : muted));
    const lines = doc.splitTextToSize(String(text), width - 10);
    doc.text(lines, x + 5, textY);
    textY += lines.length * 4;
  });
}

export async function buildInvoicePdf({
  payment = {},
  booking = {},
  customer,
  ledger = [],
  invoiceConfig = {},
  defaultCurrency = 'MAD',
}) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const cfg = { ...DEFAULT_INVOICE_SETTINGS, ...invoiceConfig };
  const summary = getInvoiceSummary({ payment, booking, ledger, invoiceConfig: cfg, defaultCurrency });
  const providedCustomer = Array.isArray(customer) ? customer[0] : customer;
  const billedCustomer = providedCustomer && Object.keys(providedCustomer).length
    ? providedCustomer
    : summary.customer;
  const isRefund = payment.transaction_type === 'refund';
  const invoiceNumber = getInvoiceNumber(payment, cfg);
  const transactionRef = getTransactionReference(payment) || '—';
  const paymentDate = pdfDate(payment.transaction_date || payment.created_at);
  const paymentMethod = formatPaymentMethod(payment.payment_method);
  const paymentStatus = String(payment.transaction_status || '—').replace(/_/g, ' ').toUpperCase();
  const transactionValue = summary.transactionAmount === null
    ? '—'
    : `${summary.transactionAmount < 0 ? '−' : ''}${pdfMoney(Math.abs(summary.transactionAmount), summary.paymentCurrency)}`;
  const originalPayment = isRefund
    ? (Array.isArray(ledger) ? ledger : []).find((entry) => entry.id === payment.original_payment_id)
    : null;
  const originalTransactionRef = originalPayment ? getTransactionReference(originalPayment) : '';
  const title = booking.offer_title || booking.destination || booking.booking_reference || 'Travel booking';
  const destination = booking.destination || '—';
  const dates = booking.departure_date || booking.return_date
    ? `${pdfDate(booking.departure_date)} – ${pdfDate(booking.return_date)}`
    : '—';
  const reference = booking.booking_reference ? `Booking reference: ${booking.booking_reference}` : null;

  const NAVY = [15, 23, 42];
  const MUTED = [100, 116, 139];
  const AMBER = [180, 118, 24];
  const BORDER = [226, 232, 240];
  const LIGHT = [248, 250, 252];

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = width - margin * 2;
  const right = width - margin;
  const colors = { border: BORDER, background: LIGHT, navy: NAVY, muted: MUTED };

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.setFontSize(15);
  doc.addImage(LOGO_BASE64, 'PNG', margin, 13, 16, 22);
  doc.text(cfg.companyName || cfg.brand || 'Habibi Adventure', margin + 21, 19, { maxWidth: 86 });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  if (cfg.tagline) doc.text(String(cfg.tagline), margin + 21, 24);

  const agencyDetails = [
    [cfg.addressLine1, cfg.addressLine2].filter(Boolean).join(', '),
    [cfg.email, cfg.phone].filter(Boolean).join(' · '),
    cfg.taxNumber ? `Tax / Reg: ${cfg.taxNumber}` : '',
  ].filter(Boolean);
  agencyDetails.forEach((value, index) => {
    doc.text(doc.splitTextToSize(String(value), 78), margin + 21, 30 + index * 4);
  });

  const boxX = right - 64;
  doc.setFillColor(...NAVY);
  doc.roundedRect(boxX, 12, 64, 39, 2.5, 2.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text(doc.splitTextToSize(invoiceNumber, 56), boxX + 4, 19);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(226, 232, 240);
  doc.text(`Date: ${paymentDate}`, boxX + 4, 29);
  doc.text(`Method: ${paymentMethod}`, boxX + 4, 35);
  doc.text(`Status: ${paymentStatus}`, boxX + 4, 41);

  doc.setDrawColor(...BORDER);
  doc.line(margin, 56, right, 56);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...AMBER);
  doc.setFontSize(13);
  doc.text(isRefund ? 'CREDIT NOTE' : 'PAYMENT RECEIPT', margin, 64);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MUTED);
  doc.setFontSize(8);
  doc.text(`Transaction reference: ${transactionRef}`, right, 64, { align: 'right' });

  const cardY = 69;
  const cardWidth = (contentWidth - 6) / 2;
  drawCard(doc, {
    x: margin,
    y: cardY,
    width: cardWidth,
    height: 39,
    title: 'Billed to',
    colors,
    values: [
      { text: billedCustomer.full_name || '—', bold: true },
      { text: billedCustomer.email || '—' },
      { text: [billedCustomer.phone, billedCustomer.address || billedCustomer.country].filter(Boolean).join(' · ') || '—' },
    ],
  });
  drawCard(doc, {
    x: margin + cardWidth + 6,
    y: cardY,
    width: cardWidth,
    height: 39,
    title: 'Trip and booking',
    colors,
    values: [
      { text: title, bold: true },
      { text: `Destination: ${destination}` },
      { text: `${reference || 'Booking reference: —'} · Travelers: ${summary.travelers || '—'}` },
      { text: `Travel dates: ${dates}` },
    ],
  });

  autoTable(doc, {
    startY: 114,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [['Transaction reference', 'Payment date', 'Payment method', 'Status', isRefund ? 'Refund amount' : 'Payment amount']],
    body: [[transactionRef, paymentDate, paymentMethod, paymentStatus, transactionValue]],
    styles: { font: 'helvetica', fontSize: 7.5, cellPadding: 2.5, textColor: NAVY, overflow: 'linebreak' },
    headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 42 },
      1: { cellWidth: 29 },
      2: { cellWidth: 34 },
      3: { cellWidth: 27 },
      4: { cellWidth: 36, halign: 'right' },
    },
  });

  const bookingAmount = summary.bookingTotal === null
    ? '—'
    : pdfMoney(summary.bookingTotal, summary.bookingCurrency);
  const unitRate = summary.bookingTotal !== null && summary.travelers
    ? pdfMoney(summary.bookingTotal / summary.travelers, summary.bookingCurrency)
    : '—';
  const description = [
    destination !== '—' ? `Destination: ${destination}` : null,
    dates !== '—' ? `Travel dates: ${dates}` : null,
    reference,
  ].filter(Boolean).join('\n') || '—';

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 8,
    margin: { left: margin, right: margin },
    theme: 'striped',
    head: [['Service & package', 'Description', 'Travelers', 'Unit rate', 'Booking total']],
    body: [[title, description, summary.travelers || '—', unitRate, bookingAmount]],
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 3, textColor: NAVY, overflow: 'linebreak', valign: 'middle' },
    headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: LIGHT },
    columnStyles: {
      0: { cellWidth: 38 },
      1: { cellWidth: 67 },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 27, halign: 'right' },
      4: { cellWidth: 18, halign: 'right' },
    },
  });

  let summaryY = doc.lastAutoTable.finalY + 8;
  if (summaryY > height - 76) {
    doc.addPage();
    summaryY = margin;
  }

  const notes = [
    isRefund && originalTransactionRef ? `Original payment: ${originalTransactionRef}` : null,
    payment.refund_reason,
    payment.notes,
  ].filter((value) => String(value || '').trim());
  const notesWidth = 82;
  const summaryX = margin + notesWidth + 7;
  const summaryWidth = contentWidth - notesWidth - 7;
  doc.setFillColor(...LIGHT);
  doc.setDrawColor(...BORDER);
  doc.roundedRect(margin, summaryY, notesWidth, 54, 2.5, 2.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...NAVY);
  doc.text(isRefund ? 'REFUND DETAILS' : 'PAYMENT NOTES', margin + 5, summaryY + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  const notesText = notes.length ? notes.join('\n') : cfg.notes || '—';
  doc.text(doc.splitTextToSize(String(notesText), notesWidth - 10), margin + 5, summaryY + 14);

  doc.setDrawColor(...BORDER);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(summaryX, summaryY, summaryWidth, 54, 2.5, 2.5, 'FD');
  const totalRows = [
    ['Booking subtotal', pdfMoney(summary.bookingTotal, summary.bookingCurrency)],
    [`Tax / VAT (${summary.vatRate ?? '—'}%)`, pdfMoney(summary.vatAmount, summary.bookingCurrency)],
    ['Booking total', pdfMoney(summary.grandTotal, summary.bookingCurrency)],
    ['Net paid to date', summary.mixedCurrencies
      ? 'Unavailable: mixed currencies'
      : summary.invalidLedgerAmounts
        ? 'Unavailable: invalid transaction amount'
        : pdfMoney(summary.paidToDate, summary.bookingCurrency)],
    [isRefund ? 'This refund' : 'This payment', transactionValue],
  ];
  const balanceLabel = summary.balance === null
    ? 'Balance due'
    : summary.balance < 0
      ? 'Account credit'
      : 'Balance due';
  const balanceValue = summary.balance === null
    ? summary.mixedCurrencies
      ? 'Unavailable: mixed currencies'
      : summary.invalidLedgerAmounts
        ? 'Unavailable: invalid transaction amount'
        : '—'
    : pdfMoney(Math.abs(summary.balance), summary.bookingCurrency);
  totalRows.push([balanceLabel, balanceValue]);

  const rowHeight = 7.2;
  totalRows.forEach(([label, value], index) => {
    const y = summaryY + 7 + index * rowHeight;
    const isEmphasis = index === 2 || index === totalRows.length - 1;
    doc.setFont('helvetica', isEmphasis ? 'bold' : 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...(isEmphasis && index === 2 ? AMBER : NAVY));
    doc.text(label, summaryX + 4, y);
    doc.text(String(value), summaryX + summaryWidth - 4, y, { align: 'right', maxWidth: summaryWidth - 8 });
  });

  const footerY = Math.min(height - 14, summaryY + 61);
  doc.setDrawColor(...BORDER);
  doc.line(margin, footerY - 5, right, footerY - 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text(String(cfg.footerNote || 'Document generated from the recorded transaction and booking details.'), margin, footerY, {
    maxWidth: contentWidth,
  });
  if (cfg.website) {
    doc.setTextColor(...AMBER);
    doc.text(String(cfg.website), right, height - 7, { align: 'right' });
  }

  return doc;
}
