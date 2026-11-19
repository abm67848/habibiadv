import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Phone, Mail, MapPin, MessageCircle, Clock, Send, Check, ChevronDown, ArrowUpRight,
  AlertCircle, Loader2,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Edit these once. Everything on the page reads from here.           */
/* ------------------------------------------------------------------ */
const CONTACT = {
  phone: '+212 529-808080',
  phoneHref: 'tel:+212529808080',
  whatsappHref: 'https://wa.me/212600000000', // replace with your WhatsApp number
  email: 'concierge@skyview-travel.com',
  address: ['Boulevard Mohammed V', 'Tangier 90000, Morocco'],
  mapsHref: 'https://www.google.com/maps/search/?api=1&query=Tangier+Morocco',
  timeZone: 'Africa/Casablanca',
  // 24h clock, [open, close]. null = closed.
  hours: {
    Mon: [9, 18], Tue: [9, 18], Wed: [9, 18], Thu: [9, 18], Fri: [9, 18], Sat: [10, 14], Sun: null,
  },
  socials: [
    { label: 'Instagram', href: '' },
    { label: 'Facebook', href: '' },
    { label: 'YouTube', href: '' },
  ],
};

const TOPICS = [
  'Plan a trip',
  'Question about a booking',
  'Custom itinerary or group',
  'Partnership',
  'Something else',
];

const FAQS = [
  { q: 'How fast will I get a reply?', a: 'Messages sent during office hours get a reply within a few hours. Anything sent overnight is answered first thing the next working day.' },
  { q: 'Do I pay anything to ask for a quote?', a: 'No. Quotes are free and come with no obligation. You only pay once you confirm a trip and we’ve confirmed availability.' },
  { q: 'Can you change a trip from the catalog?', a: 'Yes. Most packages can be shortened, extended or swapped for different stays. Tell us what you’d like and we’ll price it.' },
  { q: 'I already booked. Who do I contact?', a: 'Choose “Question about a booking” and include your reference number, or call us directly if you’re travelling in the next 48 hours.' },
];

const display = { fontFamily: "'Fraunces', Georgia, serif" };
const body = { fontFamily: "'Manrope', system-ui, sans-serif" };
const ring = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a24b]';
const inputBase =
  'w-full rounded-2xl border-0 bg-[#f3f6f1] px-4 py-3.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-[#c9a24b]';
const MAX_MESSAGE = 1000;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function getOfficeState(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: CONTACT.timeZone, weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false,
  }).formatToParts(now);
  const get = (t) => parts.find((p) => p.type === t)?.value;
  const day = get('weekday');
  const hour = Number(get('hour')) % 24;
  const minute = Number(get('minute'));
  const today = CONTACT.hours[day];
  const decimal = hour + minute / 60;
  const open = Boolean(today) && decimal >= today[0] && decimal < today[1];
  return { open, day, today };
}

const fmtHour = (h) => `${String(h).padStart(2, '0')}:00`;

/**
 * Replace this with your real endpoint, e.g. a services/contact module that posts to your API.
 * It must resolve on success and throw on failure.
 */
async function sendContactMessage(payload) {
  // TODO: connect to your backend. Simulated delay for now.
  await new Promise((r) => setTimeout(r, 900));
  return payload;
}

function Field({ id, label, error, hint, children }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-[#0a2a20]">{label}</label>
      <div className="mt-2">{children}</div>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-700" role="alert">
          <AlertCircle className="h-3.5 w-3.5" /> {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function ContactPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const packageRef = params.get('package') || '';
  const initialTopic = TOPICS.includes(params.get('topic')) ? params.get('topic') : TOPICS[0];

  const [form, setForm] = useState({
    name: '', email: '', phone: '', topic: initialTopic, reply: 'email',
    message: packageRef ? `Hi, I’d like more information about the package ${packageRef}.` : '',
    website: '', // honeypot
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle | sending | done | error
  const [office, setOffice] = useState(() => getOfficeState());

  useEffect(() => {
    const id = setInterval(() => setOffice(getOfficeState()), 60000);
    return () => clearInterval(id);
  }, []);

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((er) => ({ ...er, [k]: undefined }));
  };

  const validate = () => {
    const er = {};
    if (form.name.trim().length < 2) er.name = 'Enter your name.';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) er.email = 'Enter a valid email, like name@example.com.';
    if (form.phone && !/^[+\d][\d\s().-]{6,}$/.test(form.phone)) er.phone = 'Enter a phone number with country code, like +212 600 000 000.';
    if (form.reply === 'phone' && !form.phone) er.phone = 'Add a phone number so we can call you.';
    if (form.message.trim().length < 10) er.message = 'Tell us a little more (at least 10 characters).';
    setErrors(er);
    return Object.keys(er).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (form.website) return; // bots fill the hidden field
    if (!validate()) {
      document.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    setStatus('sending');
    try {
      const { website, ...payload } = form;
      await sendContactMessage({ ...payload, packageRef });
      setStatus('done');
    } catch (err) {
      console.error('Contact form failed:', err);
      setStatus('error');
    }
  };

  const reset = () => {
    setForm((f) => ({ ...f, name: '', email: '', phone: '', message: '', topic: TOPICS[0], reply: 'email' }));
    setErrors({});
    setStatus('idle');
  };

  const todayHours = office.today ? `${fmtHour(office.today[0])} to ${fmtHour(office.today[1])}` : 'Closed today';
  const orderedDays = useMemo(() => Object.entries(CONTACT.hours), []);

  const channels = [
    { icon: Phone, title: 'Call us', text: CONTACT.phone, href: CONTACT.phoneHref, note: 'Fastest for urgent trips' },
    { icon: MessageCircle, title: 'WhatsApp', text: 'Chat with a planner', href: CONTACT.whatsappHref, note: 'Share photos and dates easily', external: true },
    { icon: Mail, title: 'Email', text: CONTACT.email, href: `mailto:${CONTACT.email}`, note: 'Best for itineraries and quotes' },
    { icon: MapPin, title: 'Visit', text: CONTACT.address[0], href: CONTACT.mapsHref, note: CONTACT.address[1], external: true },
  ];

  return (
    <div className="min-h-screen bg-[#f3f6f1] text-slate-700 antialiased" style={body}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Manrope:wght@400;500;600;700&display=swap');
        @keyframes drift{from{transform:scale(1.04)}to{transform:scale(1.1)}}
        @keyframes rise{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
        .rise{opacity:0;animation:rise .8s cubic-bezier(.2,.7,.2,1) forwards}
        @media (prefers-reduced-motion: reduce){*{animation:none!important;transition:none!important}.rise{opacity:1}}
      `}</style>

      {/* HERO */}
      <header className="relative isolate overflow-hidden bg-[#082a1f] pb-44 pt-36 text-white sm:pt-44">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#082a1f] via-[#0f3d2e] to-[#1f6b4f]" />
        <img
          src="/images/contact-hero.jpg"
          alt=""
          onError={(e) => (e.currentTarget.style.display = 'none')}
          className="absolute inset-0 -z-10 h-full w-full object-cover opacity-50"
          style={{ animation: 'drift 26s ease-in-out infinite alternate' }}
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#082a1f]/60 to-[#082a1f]/90" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-[#f3f6f1] to-transparent" />

        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="rise inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm text-white/90 ring-1 ring-white/25 backdrop-blur">
            <span className={`h-2 w-2 rounded-full ${office.open ? 'bg-emerald-400' : 'bg-[#e6c877]'}`} />
            {t(office.open ? 'We’re online now' : 'We’ll reply when we’re back')}
          </p>
          <h1 className="rise mt-6 max-w-3xl text-4xl leading-[1.05] sm:text-6xl lg:text-7xl" style={{ ...display, animationDelay: '.15s' }}>
            {t('Tell us where you want to go')}
          </h1>
          <p className="rise mt-6 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg" style={{ animationDelay: '.3s' }}>
            {t('A real planner reads every message. Send your dates, your group and your ideas, and we’ll come back with a plan and a price.')}
          </p>
        </div>
      </header>

      {/* CONTACT CHANNELS */}
      <section className="relative z-10 mx-auto -mt-32 max-w-7xl px-5 lg:px-8" aria-label={t('Ways to reach us')}>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {channels.map(({ icon: Icon, title, text, href, note, external }) => (
            <li key={title}>
              <a
                href={href}
                {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className={`group flex h-full flex-col rounded-3xl bg-white p-6 shadow-xl shadow-[#082a1f]/10 ring-1 ring-[#0f3d2e]/5 transition hover:-translate-y-1 hover:shadow-2xl ${ring}`}
              >
                <span className="flex items-center justify-between">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-[#0f3d2e] text-[#e6c877] transition group-hover:bg-[#c9a24b] group-hover:text-[#082a1f]">
                    <Icon className="h-5 w-5" strokeWidth={1.7} />
                  </span>
                  <ArrowUpRight className="h-5 w-5 text-slate-300 transition group-hover:text-[#c9a24b]" />
                </span>
                <span className="mt-5 text-lg text-[#0a2a20]" style={display}>{t(title)}</span>
                <span className="mt-1 break-words text-sm font-semibold text-[#0f3d2e]">{t(text)}</span>
                <span className="mt-1 text-xs text-slate-500">{t(note)}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      {/* FORM + SIDE */}
      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-20 lg:grid-cols-5 lg:px-8">
        {/* Form */}
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#0f3d2e]/10 sm:p-10 lg:col-span-3">
          {status === 'done' ? (
            <div className="py-10 text-center" role="status">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#0f3d2e] text-[#e6c877]"><Check className="h-8 w-8" /></span>
              <h2 className="mt-6 text-3xl text-[#0a2a20]" style={display}>{t('Message sent')}</h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-600">
                {t(office.open
                  ? 'Thanks, {{name}}. We’ll reply to {{contact}} within a few hours.'
                  : 'Thanks, {{name}}. We’ll reply to {{contact}} as soon as the office reopens.', {
                  name: form.name.split(' ')[0] || t('friend'),
                  contact: form.reply === 'phone' ? form.phone : form.email,
                })}
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link to="/packages" className={`inline-flex items-center gap-2 rounded-full bg-[#c9a24b] px-6 py-3 text-sm font-bold text-[#082a1f] transition hover:bg-[#e6c877] ${ring}`}>{t('Browse packages')}</Link>
                <button onClick={reset} className={`rounded-full px-6 py-3 text-sm font-semibold text-[#0f3d2e] ring-1 ring-[#0f3d2e]/20 hover:bg-[#f3f6f1] ${ring}`}>{t('Send another message')}</button>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate aria-label={t('Contact form')}>
              <h2 className="text-3xl text-[#0a2a20]" style={display}>{t('Send us a message')}</h2>
              <p className="mt-2 text-sm text-slate-600">{t('Fields marked with a star are required.')}</p>

              <div className="mt-8 grid gap-5 sm:grid-cols-2">
                <Field id="name" label={t('Full name ★')} error={errors.name && t(errors.name)}>
                  <input id="name" value={form.name} onChange={set('name')} autoComplete="name" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'name-error' : undefined} placeholder={t('Your name')} className={inputBase} />
                </Field>
                <Field id="email" label={t('Email ★')} error={errors.email && t(errors.email)}>
                  <input id="email" type="email" value={form.email} onChange={set('email')} autoComplete="email" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'email-error' : undefined} placeholder="name@example.com" className={inputBase} />
                </Field>
                <Field id="phone" label={t('Phone or WhatsApp')} error={errors.phone && t(errors.phone)} hint={t('Include the country code.')}>
                  <input id="phone" type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? 'phone-error' : undefined} placeholder="+212 600 000 000" className={inputBase} />
                </Field>
                <Field id="topic" label={t('What’s this about?')}>
                  <select id="topic" value={form.topic} onChange={set('topic')} className={inputBase}>
                    {TOPICS.map((topic) => <option key={topic}>{t(topic)}</option>)}
                  </select>
                </Field>
              </div>

              <fieldset className="mt-5">
                <legend className="text-sm font-semibold text-[#0a2a20]">{t('How should we reply?')}</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[['email', 'Email'], ['phone', 'Phone call'], ['whatsapp', 'WhatsApp']].map(([val, label]) => (
                    <label key={val} className={`cursor-pointer rounded-full px-5 py-2.5 text-sm font-medium transition has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[#c9a24b] ${form.reply === val ? 'bg-[#0f3d2e] text-white' : 'bg-[#f3f6f1] text-slate-600 hover:bg-[#e4ecdf]'}`}>
                      <input type="radio" name="reply" value={val} checked={form.reply === val} onChange={set('reply')} className="sr-only" />
                      {t(label)}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="mt-5">
                <Field id="message" label={t('Your message ★')} error={errors.message && t(errors.message)}>
                  <textarea
                    id="message"
                    rows={6}
                    maxLength={MAX_MESSAGE}
                    value={form.message}
                    onChange={set('message')}
                    aria-invalid={Boolean(errors.message)}
                    aria-describedby={errors.message ? 'message-error' : 'message-count'}
                    placeholder={t('Where, when, how many people, and anything we should know.')}
                    className={`${inputBase} resize-y leading-relaxed`}
                  />
                </Field>
                <p id="message-count" className="mt-1 text-right text-xs text-slate-400">{form.message.length} / {MAX_MESSAGE}</p>
              </div>

              {/* Honeypot: hidden from people, visible to bots */}
              <div className="absolute -left-[9999px]" aria-hidden="true">
                <label>{t('Leave this empty')}<input tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} /></label>
              </div>

              {status === 'error' && (
                <p className="mt-5 flex items-start gap-2 rounded-2xl bg-rose-50 p-4 text-sm text-rose-800" role="alert">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {t('We couldn’t send your message. Try again, or reach us on {{phone}} or {{email}}.', { phone: CONTACT.phone, email: CONTACT.email })}
                </p>
              )}

              <button
                type="submit"
                disabled={status === 'sending'}
                className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#c9a24b] px-8 py-4 text-sm font-bold text-[#082a1f] shadow-lg shadow-[#c9a24b]/30 transition hover:bg-[#e6c877] disabled:cursor-wait disabled:opacity-70 sm:w-auto ${ring}`}
              >
                {status === 'sending' ? <><Loader2 className="h-4 w-4 animate-spin" /> {t('Sending…')}</> : <>{t('Send message')} <Send className="h-4 w-4" /></>}
              </button>
              <p className="mt-4 text-xs text-slate-500">{t('We only use your details to answer this message.')}</p>
            </form>
          )}
        </div>

        {/* Side column */}
        <aside className="space-y-6 lg:col-span-2">
          <div className="rounded-3xl bg-[#0f3d2e] p-7 text-white">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-2xl" style={display}><Clock className="h-5 w-5 text-[#e6c877]" /> {t('Office hours')}</h2>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${office.open ? 'bg-emerald-400/20 text-emerald-300' : 'bg-[#c9a24b]/20 text-[#e6c877]'}`}>
                {t(office.open ? 'Open now' : 'Closed now')}
              </span>
            </div>
            <p className="mt-2 text-sm text-white/70">{t('Today: {{hours}} (Morocco time)', { hours: todayHours })}</p>
            <dl className="mt-5 divide-y divide-white/10 text-sm">
              {orderedDays.map(([day, h]) => (
                <div key={day} className={`flex justify-between py-2.5 ${day === office.day ? 'font-semibold text-[#e6c877]' : 'text-white/80'}`}>
                  <dt>{t(day)}</dt>
                  <dd>{h ? `${fmtHour(h[0])} ${t('to')} ${fmtHour(h[1])}` : t('Closed')}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="overflow-hidden rounded-3xl bg-white ring-1 ring-[#0f3d2e]/10">
            <div className="relative grid h-44 place-items-center bg-gradient-to-br from-[#e4ecdf] to-[#c9a24b]/30">
              <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(#0f3d2e22 1px,transparent 1px),linear-gradient(90deg,#0f3d2e22 1px,transparent 1px)', backgroundSize: '28px 28px' }} />
              <span className="relative grid h-12 w-12 place-items-center rounded-full bg-[#0f3d2e] text-[#e6c877] shadow-lg"><MapPin className="h-6 w-6" /></span>
            </div>
            <div className="p-6">
              <h2 className="text-xl text-[#0a2a20]" style={display}>{t('Visit the office')}</h2>
              <address className="mt-2 text-sm not-italic leading-relaxed text-slate-600">
                {CONTACT.address.map((line) => <span key={line} className="block">{line}</span>)}
              </address>
              <a href={CONTACT.mapsHref} target="_blank" rel="noopener noreferrer" className={`mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#0f3d2e] hover:text-[#9c7a2b] ${ring} rounded`}>
                {t('Get directions')} <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 ring-1 ring-[#0f3d2e]/10">
            <h2 className="text-xl text-[#0a2a20]" style={display}>{t('Follow our trips')}</h2>
            <div className="mt-4 flex gap-3">
              {CONTACT.socials.map(({ label, href }) => (
                href ? (
                  <a key={label} href={href} aria-label={label} className={`grid h-11 w-11 place-items-center rounded-full bg-[#f3f6f1] text-xs font-bold text-[#0f3d2e] transition hover:bg-[#c9a24b] hover:text-[#082a1f] ${ring}`}>
                    {label.slice(0, 2).toUpperCase()}
                  </a>
                ) : (
                  <span key={label} aria-label={`${label} link not configured`} title={`${label} link not configured`} className="grid h-11 w-11 place-items-center rounded-full bg-[#f3f6f1] text-xs font-bold text-[#0f3d2e]/50">
                    {label.slice(0, 2).toUpperCase()}
                  </span>
                )
              ))}
            </div>
          </div>
        </aside>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-4xl px-5 pb-24 lg:px-8">
        <h2 className="text-3xl text-[#0a2a20] sm:text-4xl" style={display}>{t('Before you write')}</h2>
        <div className="mt-6 divide-y divide-[#0f3d2e]/10 rounded-3xl bg-white px-6 ring-1 ring-[#0f3d2e]/10 sm:px-8">
          {FAQS.map(({ q, a }) => (
            <details key={q} className="group py-5">
              <summary className={`flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-[#0a2a20] ${ring} rounded`}>
                {t(q)}
                <ChevronDown className="h-5 w-5 shrink-0 text-[#c9a24b] transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{t(a)}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}