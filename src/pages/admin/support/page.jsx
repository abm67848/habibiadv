import { useAppSettings, translate, useAuth } from '@/context/index.jsx';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle, ArrowLeft, Check, CheckCircle2, ChevronRight, Clock, Copy, LifeBuoy, Mail,
  MessageCircle, Phone, RefreshCw, Search, Send, Ticket,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';


/* ==========================================================================
   SUPPORT SETTINGS: edit these
   ========================================================================== */
const SUPPORT = {
  brand: 'SkyView Travel',
  whatsappNumber: '212770491886', // international format, digits only, no "+" or spaces
  phoneDisplay: '0782417054',
  email: 'wellmadedigital.ma@gmail.com',
  hours: 'Monday to Saturday, 9:00 to 18:00',
};
const waLink = (text) => `https://wa.me/${SUPPORT.whatsappNumber}?text=${encodeURIComponent(text)}`;

/* ---------- Options ---------- */
const CATEGORY_OPTIONS = [
  { value: 'booking', label: 'My booking', hint: 'Questions about a reservation' },
  { value: 'payment', label: 'Payment or invoice', hint: 'Receipts, refunds, balances' },
  { value: 'change_cancel', label: 'Change or cancel a trip' },
  { value: 'documents', label: 'Travel documents', hint: 'Vouchers, tickets, visas' },
  { value: 'complaint', label: 'Complaint' },
  { value: 'general', label: 'General question' },
  { value: 'other', label: 'Something else' },
];
const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Not urgent', dot: 'bg-slate-400' },
  { value: 'normal', label: 'Normal', dot: 'bg-sky-500' },
  { value: 'high', label: 'Urgent', hint: 'My trip is coming up soon', dot: 'bg-amber-500' },
  { value: 'urgent', label: 'Emergency', hint: 'I am travelling right now', dot: 'bg-rose-500' },
];
const STATUS_INFO = {
  open: { label: 'Received', cls: 'bg-sky-50 text-sky-800 ring-sky-200', dot: 'bg-sky-500' },
  in_progress: { label: 'In progress', cls: 'bg-amber-50 text-amber-800 ring-amber-200', dot: 'bg-amber-500' },
  waiting_customer: { label: 'Waiting for your reply', cls: 'bg-violet-50 text-violet-800 ring-violet-200', dot: 'bg-violet-500' },
  resolved: { label: 'Resolved', cls: 'bg-emerald-50 text-emerald-800 ring-emerald-200', dot: 'bg-emerald-500' },
  closed: { label: 'Closed', cls: 'bg-slate-100 text-slate-600 ring-slate-200', dot: 'bg-slate-400' },
};

/* ---------- Style tokens + helpers ---------- */
const inputCls =
  'w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition';
const labelCls = 'block text-xs font-medium text-slate-600 mb-1.5';
const btnPrimary =
  'inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-500 shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed';
const btnGhost =
  'inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition disabled:opacity-50';
const btnWhatsApp =
  'inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#1FA855] rounded-lg hover:bg-[#188f47] shadow-sm transition';

function Select({ value, onChange, options, ariaLabel }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={ariaLabel}
      className={inputCls}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : '');
const errMsg = (e, fallback) => (e && typeof e.message === 'string' ? e.message : fallback);

const RECENT_KEY = 'support_recent_tickets';
const readRecent = () => {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
};
const rememberTicket = (entry) => {
  try {
    const next = [entry, ...readRecent().filter((t) => t.number !== entry.number)].slice(0, 5);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch { /* storage unavailable: ignore */ }
};

function StatusPill({ status }) {
  const s = STATUS_INFO[status] || STATUS_INFO.open;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${s.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} /> {s.label}
    </span>
  );
}

/* ==========================================================================
   Conversation view (used for "track" and "my tickets")
   ========================================================================== */
function ThreadView({ ticketNumber, email, onBack, onLoaded }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const endRef = useRef(null);
  const reportedRef = useRef(false);
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded; // keep the latest callback without re-triggering the load effect

  const load = useCallback(async (silent) => {
    if (!silent) setLoading(true);
    const { data: res, error: err } = await supabase.rpc('track_support_ticket', {
      p_ticket_number: ticketNumber,
      p_email: email || null,
    });
    if (err) setError(errMsg(err, 'Could not load this ticket.'));
    else if (!res) setError('We could not find a ticket with those details. Check the number and the email you used.');
    else {
      setData(res);
      setError('');
      if (!reportedRef.current) { reportedRef.current = true; onLoadedRef.current?.(res.ticket); }
    }
    setLoading(false);
  }, [ticketNumber, email]);

  useEffect(() => {
    load(false);
    const t = setInterval(() => load(true), 30000);
    return () => clearInterval(t);
  }, [load]);

  const count = data?.messages?.length || 0;
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [count]);

  const send = async (e) => {
    e.preventDefault();
    if (!reply.trim() || sending) return;
    try {
      setSending(true);
      setSendError('');
      const { error: err } = await supabase.rpc('reply_support_ticket', {
        p_ticket_number: ticketNumber,
        p_email: email || null,
        p_body: reply.trim(),
      });
      if (err) throw err;
      setReply('');
      await load(true);
    } catch (err) {
      setSendError(errMsg(err, 'Could not send your message.'));
    } finally {
      setSending(false);
    }
  };

  const ticket = data?.ticket;
  const closed = ticket?.status === 'closed';

  return (
    <div>
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 mb-4">
        <ArrowLeft className="w-4 h-4" />{translate('Back')}</button>

      {loading ? (
        <div className="py-16 text-center text-slate-400"><RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-600" />{translate('Loading ticket…')}</div>
      ) : error && !ticket ? (
        <div role="alert" className="px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800 text-sm">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" /> {error}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="min-w-0">
              <p className="font-mono text-xs font-semibold text-amber-700">{ticket.ticket_number}</p>
              <h3 className="text-lg font-semibold text-slate-900 mt-0.5">{ticket.subject}</h3>
              <p className="text-xs text-slate-500 mt-1">
                Opened {fmtDate(ticket.created_at)}
                {ticket.booking_reference ? ` · Booking ${ticket.booking_reference}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusPill status={ticket.status} />
              <button onClick={() => load(true)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition" aria-label="Refresh ticket">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="py-5 space-y-4 max-h-[460px] overflow-y-auto pr-1" aria-live="polite">
            {data.messages.map((m) => {
              const mine = m.sender_type === 'customer';
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${mine ? 'bg-amber-600 text-white rounded-br-md' : 'bg-stone-100 text-slate-800 rounded-bl-md'}`}>
                    <p className={`text-xs font-medium mb-1 ${mine ? 'text-amber-100' : 'text-slate-500'}`}>
                      {mine ? 'You' : m.sender_name || `${SUPPORT.brand} support`} · {fmtDateTime(m.created_at)}
                    </p>
                    <p className="whitespace-pre-line break-words">{m.body}</p>
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>

          {closed ? (
            <p className="text-sm text-slate-500 bg-stone-50 rounded-lg px-4 py-3">{translate('This ticket is closed. If you still need help, please open a new ticket.')}</p>
          ) : (
            <form onSubmit={send} className="space-y-3 pt-4 border-t border-slate-100">
              {ticket.status === 'resolved' && (
                <p className="text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">{translate('Marked as resolved. Replying will reopen it.')}</p>
              )}
              {sendError && <p role="alert" className="text-sm text-rose-700">{sendError}</p>}
              <textarea rows="3" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write your reply" className={inputCls} maxLength={5000} />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <a href={waLink(`Hello, I am writing about support ticket ${ticket.ticket_number}.`)} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-[#188f47] hover:underline inline-flex items-center gap-1.5">
                  <MessageCircle className="w-4 h-4" />{translate('Prefer WhatsApp?')}</a>
                <button type="submit" disabled={sending || !reply.trim()} className={btnPrimary}>
                  <Send className="w-4 h-4" /> {sending ? 'Sending…' : 'Send reply'}
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}

/* ==========================================================================
   Page
   ========================================================================== */
export default function SupportPage() {
  const { user, profile } = useAuth();

  const [tab, setTab] = useState('new'); // new | track | mine
  const [openTicket, setOpenTicket] = useState(null); // { number, email }
  const [created, setCreated] = useState(null); // { ticket_number, subject, name }
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    name: '', email: '', phone: '', category: 'booking', priority: 'normal',
    booking_reference: '', subject: '', message: '', website: '', // "website" is a honeypot for bots
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [trackForm, setTrackForm] = useState({ number: '', email: '' });
  const [recent, setRecent] = useState([]);
  const [mine, setMine] = useState([]);
  const [mineLoading, setMineLoading] = useState(false);

  // Prefill from the signed-in account
  useEffect(() => {
    if (!user) return;
    setForm((f) => ({
      ...f,
      name: f.name || profile?.full_name || user.user_metadata?.full_name || '',
      email: f.email || user.email || '',
      phone: f.phone || profile?.phone || '',
    }));
  }, [user, profile]);

  useEffect(() => { setRecent(readRecent()); }, [openTicket, created]);

  useEffect(() => {
    if (!user || tab !== 'mine') return;
    let cancelled = false;
    (async () => {
      setMineLoading(true);
      const { data } = await supabase
        .from('support_tickets')
        .select('ticket_number, subject, status, created_at, last_activity_at')
        .eq('user_id', user.id)
        .order('last_activity_at', { ascending: false });
      if (!cancelled) { setMine(data || []); setMineLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [user, tab, openTicket]);

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const messageLen = form.message.trim().length;

  const submit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (form.website) { setCreated({ ticket_number: 'TKT-RECEIVED', subject: form.subject, name: form.name }); return; } // bot: pretend success
    if (form.subject.trim().length < 3) return setFormError('Please add a short subject.');
    if (messageLen < 10) return setFormError('Please describe your request in at least 10 characters.');

    try {
      setSubmitting(true);
      const { data, error } = await supabase.rpc('create_support_ticket', {
        p_name: form.name,
        p_email: form.email,
        p_phone: form.phone || null,
        p_subject: form.subject,
        p_message: form.message,
        p_category: form.category,
        p_priority: form.priority,
        p_booking_reference: form.booking_reference || null,
        p_channel: 'web',
      });
      if (error) throw error;
      rememberTicket({ number: data.ticket_number, email: form.email.trim().toLowerCase(), subject: form.subject.trim() });
      setCreated({ ticket_number: data.ticket_number, subject: form.subject.trim(), name: form.name.trim(), email: form.email.trim().toLowerCase() });
      setForm((f) => ({ ...f, subject: '', message: '', booking_reference: '', priority: 'normal' }));
    } catch (err) {
      console.error('Error creating ticket:', err);
      setFormError(errMsg(err, 'Could not create your ticket. Please try again or write to us on WhatsApp.'));
    } finally {
      setSubmitting(false);
    }
  };

  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText(created.ticket_number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* clipboard blocked: ignore */ }
  };

  const tabs = [
    { id: 'new', label: 'New ticket', icon: Ticket },
    { id: 'track', label: 'Track a ticket', icon: Search },
    ...(user ? [{ id: 'mine', label: 'My tickets', icon: LifeBuoy }] : []),
  ];

  const quickWhatsApp = waLink(`Hello ${SUPPORT.brand}, I need some help.`);

  return (
    <div className="min-h-screen bg-stone-50">
      <style>{`
        @keyframes sp-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        .sp-in { animation: sp-in .2s ease-out; }
        @media (prefers-reduced-motion: reduce) { .sp-in { animation-duration: 1ms; } }
      `}</style>

      {/* Hero */}
      <header className="bg-gradient-to-b from-amber-50 to-stone-50 border-b border-amber-100/60">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-start gap-4">
            <span className="w-12 h-12 rounded-2xl bg-white ring-1 ring-inset ring-amber-200 text-amber-600 flex items-center justify-center shrink-0">
              <LifeBuoy className="w-6 h-6" aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">{translate('How can we help?')}</h1>
              <p className="text-slate-600 mt-1.5 max-w-xl">{translate('Open a ticket and our team will answer you here, or chat with us directly on WhatsApp.')}</p>
            </div>
          </div>
          <a href={quickWhatsApp} target="_blank" rel="noopener noreferrer" className={`${btnWhatsApp} !px-5 !py-3 shrink-0`}>
            <MessageCircle className="w-5 h-5" />{translate('Chat on WhatsApp')}</a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Main card */}
        <section className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div role="tablist" className="flex gap-1 p-2 bg-stone-100/70 border-b border-slate-100 overflow-x-auto">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                onClick={() => { setTab(id); setOpenTicket(null); }}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition
                  ${tab === id ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>

          <div className="p-6 sp-in" key={`${tab}-${openTicket ? openTicket.number : ''}-${created ? 'done' : ''}`}>
            {/* ---------- Conversation ---------- */}
            {openTicket ? (
              <ThreadView
                ticketNumber={openTicket.number}
                email={openTicket.email}
                onBack={() => setOpenTicket(null)}
                onLoaded={(t) => openTicket.email && rememberTicket({ number: t.ticket_number, email: openTicket.email, subject: t.subject })}
              />
            ) : tab === 'new' ? (
              created ? (
                /* ---------- Success ---------- */
                <div className="text-center py-4">
                  <span className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-200 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7" />
                  </span>
                  <h2 className="text-xl font-semibold text-slate-900 mt-4">{translate('Your ticket has been created')}</h2>
                  <p className="text-sm text-slate-500 mt-1">Thank you{created.name ? `, ${created.name.split(' ')[0]}` : ''}. Keep this number to follow up.</p>

                  <div className="inline-flex items-center gap-3 mt-5 px-5 py-3 bg-amber-50 ring-1 ring-inset ring-amber-200 rounded-xl">
                    <span className="font-mono text-lg font-bold text-amber-800">{created.ticket_number}</span>
                    <button onClick={copyNumber} className="p-1.5 text-amber-700 hover:bg-amber-100 rounded-md transition" aria-label="Copy ticket number">
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  <p className="text-xs text-slate-500 mt-4 max-w-md mx-auto">
                    {user ? 'You will find it under "My tickets".' : 'To check on it later, use "Track a ticket" with this number and your email.'}
                  </p>

                  <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                    <a
                      href={waLink(`Hello ${SUPPORT.brand}, I just opened support ticket ${created.ticket_number}${created.subject ? ` ("${created.subject}")` : ''}. My name is ${created.name}.`)}
                      target="_blank" rel="noopener noreferrer" className={btnWhatsApp}
                    >
                      <MessageCircle className="w-4 h-4" />{translate('Continue on WhatsApp')}</a>
                    {created.email && (
                      <button onClick={() => setOpenTicket({ number: created.ticket_number, email: created.email })} className={btnGhost}>{translate('View ticket')}</button>
                    )}
                    <button onClick={() => setCreated(null)} className={btnGhost}>{translate('Create another')}</button>
                  </div>
                </div>
              ) : (
                /* ---------- New ticket form ---------- */
                <form onSubmit={submit} className="space-y-5" noValidate={false}>
                  {formError && (
                    <div role="alert" className="px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800 text-sm">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" /> {formError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls} htmlFor="sp-name">{translate('Your name *')}</label>
                      <input id="sp-name" required autoComplete="name" value={form.name} onChange={setField('name')} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls} htmlFor="sp-email">{translate('Email *')}</label>
                      <input id="sp-email" type="email" required autoComplete="email" value={form.email} onChange={setField('email')} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls} htmlFor="sp-phone">{translate('Phone or WhatsApp')}</label>
                      <input id="sp-phone" type="tel" autoComplete="tel" placeholder="+212 600 000 000" value={form.phone} onChange={setField('phone')} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls} htmlFor="sp-booking">{translate('Booking reference')}</label>
                      <input id="sp-booking" placeholder="e.g. BK-2026-000012" value={form.booking_reference} onChange={setField('booking_reference')} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>{translate('What is it about?')}</label>
                      <Select value={form.category} onChange={(v) => setForm((f) => ({ ...f, category: v }))} options={CATEGORY_OPTIONS} ariaLabel="Category" menuMinWidth={260} />
                    </div>
                    <div>
                      <label className={labelCls}>{translate('How urgent is it?')}</label>
                      <Select value={form.priority} onChange={(v) => setForm((f) => ({ ...f, priority: v }))} options={PRIORITY_OPTIONS} ariaLabel="Urgency" menuMinWidth={260} />
                    </div>
                    <div className="md:col-span-2">
                      <label className={labelCls} htmlFor="sp-subject">{translate('Subject *')}</label>
                      <input id="sp-subject" required maxLength={200} placeholder="A few words that sum it up" value={form.subject} onChange={setField('subject')} className={inputCls} />
                    </div>
                    <div className="md:col-span-2">
                      <label className={labelCls} htmlFor="sp-message">{translate('How can we help? *')}</label>
                      <textarea id="sp-message" required rows="6" maxLength={5000} placeholder="Tell us what happened and what you would like us to do." value={form.message} onChange={setField('message')} className={inputCls} />
                      <p className={`text-xs mt-1 ${messageLen > 0 && messageLen < 10 ? 'text-rose-600' : 'text-slate-400'}`}>{messageLen}/5000</p>
                    </div>
                  </div>

                  {/* Honeypot: hidden from people, bots fill it in */}
                  <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                    <label>Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={setField('website')} /></label>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <p className="text-xs text-slate-500">{translate('We only use your details to answer this request.')}</p>
                    <button type="submit" disabled={submitting} className={btnPrimary}>
                      <Send className="w-4 h-4" /> {submitting ? 'Sending…' : 'Create ticket'}
                    </button>
                  </div>
                </form>
              )
            ) : tab === 'track' ? (
              /* ---------- Track ---------- */
              <div className="space-y-6">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setOpenTicket({ number: trackForm.number.trim().toUpperCase(), email: trackForm.email.trim().toLowerCase() });
                  }}
                  className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end"
                >
                  <div className="md:col-span-2">
                    <label className={labelCls} htmlFor="tr-number">{translate('Ticket number')}</label>
                    <input id="tr-number" required placeholder="TKT-2026-000123" value={trackForm.number} onChange={(e) => setTrackForm((f) => ({ ...f, number: e.target.value }))} className={`${inputCls} font-mono`} />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelCls} htmlFor="tr-email">{translate('Email used on the ticket')}</label>
                    <input id="tr-email" type="email" required value={trackForm.email} onChange={(e) => setTrackForm((f) => ({ ...f, email: e.target.value }))} className={inputCls} />
                  </div>
                  <button type="submit" className={btnPrimary}><Search className="w-4 h-4" />{translate('Find')}</button>
                </form>

                {recent.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-2">{translate('Recent on this device')}</h3>
                    <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                      {recent.map((t) => (
                        <li key={t.number}>
                          <button onClick={() => setOpenTicket({ number: t.number, email: t.email })} className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-amber-50/40 transition">
                            <span className="min-w-0">
                              <span className="block font-mono text-xs font-semibold text-amber-700">{t.number}</span>
                              <span className="block text-sm text-slate-700 truncate">{t.subject}</span>
                            </span>
                            <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              /* ---------- My tickets ---------- */
              <div>
                {mineLoading ? (
                  <div className="py-12 text-center text-slate-400"><RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-600" />{translate('Loading your tickets…')}</div>
                ) : mine.length === 0 ? (
                  <div className="py-12 text-center text-slate-500">
                    <Ticket className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium text-slate-700">{translate('You have no tickets yet')}</p>
                    <button onClick={() => setTab('new')} className={`${btnPrimary} mt-4`}>{translate('Create your first ticket')}</button>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    {mine.map((t) => (
                      <li key={t.ticket_number}>
                        <button onClick={() => setOpenTicket({ number: t.ticket_number, email: null })} className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-amber-50/40 transition">
                          <span className="min-w-0">
                            <span className="block font-mono text-xs font-semibold text-amber-700">{t.ticket_number}</span>
                            <span className="block text-sm font-medium text-slate-800 truncate">{t.subject}</span>
                            <span className="block text-xs text-slate-400 mt-0.5">Updated {fmtDateTime(t.last_activity_at)}</span>
                          </span>
                          <span className="flex items-center gap-3 shrink-0"><StatusPill status={t.status} /><ChevronRight className="w-4 h-4 text-slate-300" /></span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Sidebar */}
        <aside className="space-y-4">
          <section className="rounded-2xl bg-gradient-to-br from-[#1FA855] to-[#14803c] text-white p-6 shadow-sm">
            <span className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center"><MessageCircle className="w-6 h-6" /></span>
            <h2 className="text-lg font-semibold mt-4">{translate('Prefer to talk?')}</h2>
            <p className="text-sm text-white/85 mt-1">{translate('Message us on WhatsApp for quick questions. For anything that needs a paper trail, open a ticket.')}</p>
            <a href={quickWhatsApp} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-semibold text-[#14803c] bg-white rounded-lg hover:bg-green-50 transition">
              <MessageCircle className="w-4 h-4" />{translate('Open WhatsApp')}</a>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-slate-900">{translate('Other ways to reach us')}</h2>
            <ul className="space-y-3 text-sm text-slate-600">
              <li className="flex items-center gap-3"><Mail className="w-4 h-4 text-amber-600 shrink-0" /><a href={`mailto:${SUPPORT.email}`} className="hover:text-amber-700 break-all">{SUPPORT.email}</a></li>
              <li className="flex items-center gap-3"><Phone className="w-4 h-4 text-amber-600 shrink-0" /><a href={`tel:${SUPPORT.phoneDisplay.replace(/\s/g, '')}`} className="hover:text-amber-700">{SUPPORT.phoneDisplay}</a></li>
              <li className="flex items-center gap-3"><Clock className="w-4 h-4 text-amber-600 shrink-0" />{SUPPORT.hours}</li>
            </ul>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200/80 p-6">
            <h2 className="text-sm font-semibold text-slate-900">{translate('Help us help you faster')}</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-600 list-disc pl-5">
              <li>{translate('Include your booking reference if you have one.')}</li>
              <li>{translate('Say which dates or people the question is about.')}</li>
              <li>{translate('Mark the ticket as urgent only if you travel soon.')}</li>
            </ul>
          </section>
        </aside>
      </main>
    </div>
  );
}