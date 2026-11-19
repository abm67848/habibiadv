// Preview and export controls for payment receipts and credit notes.

import React, { useRef } from 'react';
import {
  X, Download, Printer, Copy, Check, CreditCard, MapPin, Users, FileText,
} from 'lucide-react';
import { useAppSettings } from '@/context/index.jsx';
import {
  buildInvoicePdf,
  formatPaymentMethod,
  getInvoiceFileName,
  getInvoiceNumber,
  getInvoiceSummary,
  getTransactionReference,
  pdfDate,
} from '@/services/documents/invoicePdfService.js';
import LOGO from '@/assets/logo.png';

export default function AdvancedInvoiceModal({
  isOpen,
  onClose,
  payment = {},
  booking = {},
  ledger = [],
  customer = null,
}) {
  const { invoice: invoiceConfig, currency: globalCurrency, formatMoney } = useAppSettings();
  const [copied, setCopied] = React.useState(false);
  const [downloading, setDownloading] = React.useState(false);
  const [downloadError, setDownloadError] = React.useState('');
  const printRef = useRef(null);

  if (!isOpen) return null;

  const summary = getInvoiceSummary({
    payment,
    booking,
    ledger,
    invoiceConfig,
    defaultCurrency: globalCurrency,
  });
  const cur = summary.paymentCurrency;
  const bookingCur = summary.bookingCurrency;
  const total = summary.bookingTotal;
  const travelers = summary.travelers;
  const isRefund = payment.transaction_type === 'refund';
  const providedCustomer = Array.isArray(customer) ? customer[0] : customer;
  const billedCustomer = providedCustomer && Object.keys(providedCustomer).length
    ? providedCustomer
    : summary.customer;
  const invoiceNo = getInvoiceNumber(payment, invoiceConfig);
  const transactionRef = getTransactionReference(payment) || '—';
  const paymentDate = pdfDate(payment.transaction_date || payment.created_at);
  const paymentMethod = formatPaymentMethod(payment.payment_method);
  const transactionValue = summary.transactionAmount === null
    ? '—'
    : `${summary.transactionAmount < 0 ? '−' : ''}${formatMoney(Math.abs(summary.transactionAmount), cur)}`;
  const originalPayment = isRefund
    ? ledger.find((entry) => entry.id === payment.original_payment_id)
    : null;
  const originalTransactionRef = originalPayment ? getTransactionReference(originalPayment) : '';
  const dateRange = booking.departure_date || booking.return_date
    ? `${pdfDate(booking.departure_date)} – ${pdfDate(booking.return_date)}`
    : '—';
  const bookingTitle = booking.offer_title || booking.destination || booking.booking_reference || 'Travel booking';
  const statusLabel = String(payment.transaction_status || '—').replace(/_/g, ' ').toUpperCase();
  const isPaidInFull = payment.transaction_status === 'completed' && summary.balance !== null && summary.balance <= 0;
  const documentStatus = isRefund
    ? 'CREDIT NOTE'
    : isPaidInFull
      ? 'PAID IN FULL'
      : payment.transaction_status === 'completed'
        ? 'PARTIAL PAYMENT'
        : statusLabel;
  const statusBadgeClass = payment.transaction_status === 'completed'
    ? 'bg-emerald-500/20 text-emerald-300 ring-emerald-400/30'
    : payment.transaction_status === 'pending'
      ? 'bg-amber-500/20 text-amber-200 ring-amber-400/30'
      : 'bg-rose-500/20 text-rose-200 ring-rose-400/30';
  const displayMoney = (amount, currency = bookingCur) =>
    amount === null ? '—' : formatMoney(amount, currency);
  const noteText = [
    originalTransactionRef ? `Original payment: ${originalTransactionRef}` : null,
    payment.refund_reason,
    payment.notes,
  ].filter(Boolean).join(' · ') || '—';
  const agencyAddress = [invoiceConfig.addressLine1, invoiceConfig.addressLine2].filter(Boolean).join(', ') || '—';
  const agencyContacts = [invoiceConfig.phone, invoiceConfig.email].filter(Boolean).join(' · ') || '—';

  const handleCopyRef = () => {
    navigator.clipboard.writeText(invoiceNo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPdf = async () => {
    try {
      setDownloading(true);
      setDownloadError('');
      const doc = await buildInvoicePdf({
        payment,
        booking,
        customer: billedCustomer,
        ledger,
        invoiceConfig,
        defaultCurrency: cur,
      });
      doc.save(getInvoiceFileName(payment, invoiceConfig));
    } catch (err) {
      console.error('Error downloading invoice PDF:', err);
      setDownloadError(`Could not generate the PDF: ${err.message || 'Unknown error'}`);
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-950/70 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Floating Control Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 ring-1 ring-amber-400/30">
              <FileText className="h-4 w-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold tracking-wider text-amber-400">{invoiceNo}</span>
                <span className={`rounded-full text-[10px] font-bold px-2 py-0.5 ring-1 ${statusBadgeClass}`}>
                  {documentStatus}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Transaction and booking details</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyRef}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 text-xs font-medium transition"
              title="Copy Invoice Reference"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy Ref'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 text-xs font-medium transition"
              title="Print Invoice"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white px-3.5 py-1.5 text-xs font-semibold shadow-xs transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloading ? 'Generating PDF…' : 'Download PDF'}</span>
            </button>

            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {downloadError && (
          <div role="alert" className="border-b border-rose-200 bg-rose-50 px-6 py-3 text-sm text-rose-800">
            {downloadError}
          </div>
        )}

        {/* Printable Invoice Canvas */}
        <div ref={printRef} className="p-8 sm:p-10 font-sans text-slate-800 space-y-8 bg-white max-h-[80vh] overflow-y-auto">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-6 border-b border-slate-200">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <img src={LOGO} alt="Agency Logo" className="h-12 w-12 object-contain" />
                <div>
                  <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
                    {invoiceConfig.companyName || invoiceConfig.brand || 'Habibi Adventure'}
                  </h1>
                  <p className="text-xs uppercase tracking-widest text-amber-700 font-semibold">
                    {invoiceConfig.tagline || 'TRAVEL & LUXURY EXPEDITIONS'}
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-500 max-w-sm">{agencyAddress}</p>
              <p className="text-xs text-slate-500">
                {agencyContacts}
              </p>
              {invoiceConfig.taxNumber && (
                <p className="font-mono text-[11px] text-slate-400">
                  Tax / Reg: {invoiceConfig.taxNumber}
                </p>
              )}
            </div>

            <div className="sm:text-right space-y-1">
              <span className="inline-block px-3 py-1 rounded bg-slate-900 text-amber-400 font-mono text-sm font-bold tracking-wider">
                {invoiceNo}
              </span>
              <p className="text-xs text-slate-500 pt-1">
                Date: <strong className="text-slate-800">{paymentDate}</strong>
              </p>
              <p className="text-xs text-slate-500">
                Payment Method: <strong className="text-slate-800">{paymentMethod}</strong>
              </p>
              <p className="text-xs text-slate-500">
                Status: <strong className="text-slate-800 font-bold">{statusLabel}</strong>
              </p>
            </div>
          </div>

          {/* Client & Trip Facts Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Bill To */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span>Billed To / Client Information</span>
              </span>
              <h3 className="text-sm font-bold text-slate-900">
                {billedCustomer.full_name || '—'}
              </h3>
              <div className="text-xs text-slate-600 space-y-0.5">
                <p>Email: {billedCustomer.email || '—'}</p>
                <p>Phone: {billedCustomer.phone || '—'}</p>
                <p>Country / Address: {[billedCustomer.address, billedCustomer.country].filter(Boolean).join(', ') || '—'}</p>
              </div>
            </div>

            {/* Trip Details */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                <span>Trip & Booking Details</span>
              </span>
              <h3 className="text-sm font-bold text-slate-900">
                {bookingTitle}
              </h3>
              <div className="text-xs text-slate-600 space-y-0.5">
                <p>Destination: {booking.destination || '—'}</p>
                <p>Booking reference: {booking.booking_reference || '—'}</p>
                <p>Travelers: {travelers ?? '—'}</p>
                <p>Dates: {dateRange}</p>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-white font-semibold">
                <tr>
                  <th className="py-3 px-4">Service & Package</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-center">Travelers</th>
                  <th className="py-3 px-4 text-right">Unit Rate</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr className="bg-white">
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    {bookingTitle}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">
                    {booking.destination ? `Travel services for ${booking.destination}` : 'Travel services'}
                  </td>
                  <td className="py-3.5 px-4 text-center font-medium">{travelers ?? '—'}</td>
                  <td className="py-3.5 px-4 text-right font-mono">
                    {total !== null && travelers ? formatMoney(total / travelers, bookingCur) : '—'}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-slate-900 font-mono">{displayMoney(total)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Transaction Details & Financial Totals */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Payment Details */}
            <div className="md:col-span-7 rounded-xl border border-amber-200/80 bg-amber-50/50 p-4 space-y-2 text-xs">
              <span className="font-bold text-amber-950 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <CreditCard className="w-3.5 h-3.5 text-amber-700" />
                <span>{isRefund ? 'Refund Details' : 'Payment Details'}</span>
              </span>
              <p className="text-slate-700">Transaction reference: <strong className="font-mono text-slate-900">{transactionRef}</strong></p>
              <p className="text-slate-700">Amount: <strong className="text-slate-900">{transactionValue}</strong></p>
              <p className="text-slate-700">Method: <strong className="text-slate-900">{paymentMethod}</strong></p>
              <p className="text-slate-700">Status: <strong className="text-slate-900">{statusLabel}</strong></p>
              {originalTransactionRef && (
                <p className="text-slate-700">Original payment: <strong className="font-mono text-slate-900">{originalTransactionRef}</strong></p>
              )}
              {(payment.refund_reason || payment.notes) && (
                <p className="text-slate-700">Notes: <strong className="font-normal text-slate-900">{noteText}</strong></p>
              )}
            </div>

            {/* Calculations Breakdown */}
            <div className="md:col-span-5 rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Booking subtotal:</span>
                <span className="font-mono font-medium">{displayMoney(total)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Tax / VAT ({summary.vatRate ?? '—'}%):</span>
                <span className="font-mono font-medium">{displayMoney(summary.vatAmount)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                <span>Booking total:</span>
                <span className="font-mono text-amber-700 text-base">{displayMoney(summary.grandTotal)}</span>
              </div>
              <div className="flex justify-between text-xs text-emerald-800 font-semibold pt-1 border-t border-slate-200">
                <span>Net paid to date:</span>
                <span className="font-mono">
                  {summary.mixedCurrencies
                    ? 'Unavailable (mixed currencies)'
                    : summary.invalidLedgerAmounts
                      ? 'Unavailable (invalid transaction amount)'
                      : displayMoney(summary.paidToDate)}
                </span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-900">
                <span>{summary.balance !== null && summary.balance < 0 ? 'Account credit:' : 'Balance due:'}</span>
                <span className="font-mono text-slate-800">
                  {summary.mixedCurrencies
                    ? 'Unavailable (mixed currencies)'
                    : summary.invalidLedgerAmounts
                      ? 'Unavailable (invalid transaction amount)'
                      : displayMoney(summary.balance)}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Official Seal & Notes */}
          <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-slate-200 text-xs text-slate-500 gap-4">
            <div className="space-y-1">
              <p className="italic text-slate-600">
                {invoiceConfig.footerNote || 'Document generated from the recorded transaction and booking details.'}
              </p>
              <p className="text-[11px] text-slate-400">
                {booking.booking_reference ? `Booking reference: ${booking.booking_reference}` : 'Payment record'}
              </p>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-700 font-semibold text-[11px]">
              <FileText className="w-4 h-4 text-slate-500" />
              <span>{isRefund ? 'CREDIT NOTE' : 'PAYMENT RECEIPT'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
