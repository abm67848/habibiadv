import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Route, BedDouble, Car, Compass, Mountain, Users, Heart, FileCheck, Headphones,
  Check, Plus, ArrowRight, X, PackageOpen, Wrench, Wand2, MessageCircle, Sparkles,
  MapPin, Shield, Star,
} from 'lucide-react';
import {
  DEFAULT_SERVICES_CONTENT,
  fetchPublicSiteContent,
} from '@/services/publicSiteContent.js';

const ICON_MAP = {
  Route,
  BedDouble,
  Car,
  Compass,
  Mountain,
  Users,
  Heart,
  FileCheck,
  Headphones,
  PackageOpen,
  Wrench,
  Wand2,
  Sparkles,
  MapPin,
  Shield,
  Star,
};

function DynamicIcon({ name, className = 'h-6 w-6' }) {
  const Comp = ICON_MAP[name] || Compass;
  return <Comp className={className} strokeWidth={1.6} />;
}

const display = { fontFamily: "'Fraunces', Georgia, serif" };
const body = { fontFamily: "'Manrope', system-ui, sans-serif" };
const ring = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a24b]';

export default function ServicesPage() {
  const { t } = useTranslation();
  const [content, setContent] = useState(DEFAULT_SERVICES_CONTENT);
  const [category, setCategory] = useState('all');
  const [selected, setSelected] = useState(() => new Set());

  useEffect(() => {
    let active = true;
    fetchPublicSiteContent()
      .then((data) => {
        if (active && data.services) {
          setContent(data.services);
        }
      })
      .catch((err) => {
        console.error('Failed to load public services:', err);
      });
    return () => { active = false; };
  }, []);

  const categories = useMemo(() => {
    const list = content.categories || DEFAULT_SERVICES_CONTENT.categories;
    return [{ id: 'all', label: 'All services' }, ...list];
  }, [content.categories]);

  const servicesList = useMemo(() => {
    return content.services && content.services.length > 0
      ? content.services
      : DEFAULT_SERVICES_CONTENT.services;
  }, [content.services]);

  const waysList = useMemo(() => {
    return content.ways && content.ways.length > 0
      ? content.ways
      : DEFAULT_SERVICES_CONTENT.ways;
  }, [content.ways]);

  const visible = useMemo(
    () => (category === 'all' ? servicesList : servicesList.filter((s) => s.category === category)),
    [category, servicesList],
  );

  const counts = useMemo(() => {
    const c = { all: servicesList.length };
    servicesList.forEach((s) => { c[s.category] = (c[s.category] || 0) + 1; });
    return c;
  }, [servicesList]);

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const chosen = servicesList.filter((s) => selected.has(s.id));
  const quoteLink = `/contact?${new URLSearchParams({
    topic: 'Custom itinerary or group',
    services: chosen.map((s) => s.title).join(', '),
  }).toString()}`;

  const hero = content.hero || DEFAULT_SERVICES_CONTENT.hero;
  const cta = content.cta || DEFAULT_SERVICES_CONTENT.cta;

  return (
    <div className={`min-h-screen bg-[#f3f6f1] text-slate-700 antialiased ${chosen.length ? 'pb-28' : ''}`} style={body}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Manrope:wght@400;500;600;700&display=swap');
        @keyframes drift{from{transform:scale(1.04)}to{transform:scale(1.1)}}
        @keyframes rise{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
        @keyframes slideUp{from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:none}}
        .rise{opacity:0;animation:rise .8s cubic-bezier(.2,.7,.2,1) forwards}
        @media (prefers-reduced-motion: reduce){*{animation:none!important;transition:none!important}.rise{opacity:1}}
      `}</style>

      {/* HERO */}
      <header className="relative isolate overflow-hidden bg-[#082a1f] pb-44 pt-36 text-white sm:pt-44">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#082a1f] via-[#0f3d2e] to-[#1f6b4f]" />
        <img
          src={hero.image || '/images/services-hero.jpg'}
          alt=""
          onError={(e) => (e.currentTarget.style.display = 'none')}
          className="absolute inset-0 -z-10 h-full w-full object-cover opacity-55"
          style={{ animation: 'drift 26s ease-in-out infinite alternate' }}
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#082a1f]/60 to-[#082a1f]/90" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-[#f3f6f1] to-transparent" />

        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          {hero.badge && (
            <p className="rise text-xs font-semibold uppercase tracking-widest text-[#e6c877]">
              {t(hero.badge)}
            </p>
          )}
          <h1 className="rise mt-3 max-w-3xl text-5xl leading-[1.05] sm:text-6xl lg:text-7xl" style={display}>
            {t(hero.title)}
          </h1>
          <p className="rise mt-6 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg" style={{ animationDelay: '.2s' }}>
            {t(hero.description)}
          </p>
        </div>
      </header>

      {/* CATEGORY FILTER */}
      <section id="catalog" className="relative z-10 mx-auto -mt-32 max-w-7xl scroll-mt-24 px-5 lg:px-8" aria-label={t('Browse services')}>
        <div className="rounded-3xl bg-white p-3 shadow-2xl shadow-[#082a1f]/15 ring-1 ring-[#0f3d2e]/5 sm:p-4">
          <div role="tablist" aria-label={t('Service categories')} className="flex gap-2 overflow-x-auto">
            {categories.map(({ id, label }) => {
              const active = category === id;
              return (
                <button
                  key={id}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setCategory(id)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition ${ring} ${active ? 'bg-[#0f3d2e] text-white' : 'text-slate-600 hover:bg-[#f3f6f1]'}`}
                >
                  {t(label)}
                  <span className={`rounded-full px-2 py-0.5 text-[11px] ${active ? 'bg-[#c9a24b] text-[#082a1f]' : 'bg-[#f3f6f1] text-slate-500'}`}>{counts[id] || 0}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* SERVICE GRID */}
      <main className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <p className="mb-6 text-sm text-slate-600" role="status" aria-live="polite">
          {t(visible.length === 1 ? 'Showing {{count}} service' : 'Showing {{count}} services', { count: visible.length })}. {t('Use “Add to request” to build your own bundle.')}
        </p>

        <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {visible.map(({ id, icon, title, text, includes = [], goodFor }) => {
            const on = selected.has(id);
            return (
              <li key={id}>
                <article className={`flex h-full flex-col rounded-3xl bg-white p-7 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#0f3d2e]/10 ${on ? 'ring-2 ring-[#c9a24b]' : 'ring-1 ring-[#0f3d2e]/10'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#0f3d2e] text-[#e6c877]">
                      <DynamicIcon name={icon} className="h-6 w-6" />
                    </span>
                    {on && <span className="inline-flex items-center gap-1 rounded-full bg-[#c9a24b]/20 px-3 py-1 text-xs font-semibold text-[#7a5c17]"><Check className="h-3 w-3" strokeWidth={3} /> {t('In your request')}</span>}
                  </div>
                  <h2 className="mt-5 text-2xl leading-snug text-[#0a2a20]" style={display}>{t(title)}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{t(text)}</p>

                  {includes && includes.length > 0 && (
                    <ul className="mt-5 space-y-2 border-t border-[#0f3d2e]/10 pt-5">
                      {includes.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-700">
                          <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-[#c9a24b] text-[#082a1f]"><Check className="h-2.5 w-2.5" strokeWidth={3.5} /></span>
                          {t(item)}
                        </li>
                      ))}
                    </ul>
                  )}

                  {goodFor && (
                    <p className="mt-5 text-xs text-slate-500"><span className="font-semibold text-slate-700">{t('Good for:')}</span> {t(goodFor)}</p>
                  )}

                  <button
                    onClick={() => toggle(id)}
                    aria-pressed={on}
                    className={`mt-auto inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition ${ring} ${on ? 'bg-[#0f3d2e] text-white hover:bg-[#1f6b4f]' : 'text-[#0f3d2e] ring-1 ring-[#0f3d2e]/20 hover:bg-[#c9a24b] hover:text-[#082a1f] hover:ring-[#c9a24b]'}`}
                    style={{ marginTop: '1.5rem' }}
                  >
                    {on ? <><Check className="h-4 w-4" /> {t('Added')}</> : <><Plus className="h-4 w-4" /> {t('Add to request')}</>}
                  </button>
                </article>
              </li>
            );
          })}
        </ul>
      </main>

      {/* WAYS TO BOOK */}
      {waysList && waysList.length > 0 && (
        <section className="bg-white">
          <div className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
            <h2 className="max-w-2xl text-4xl leading-tight text-[#0a2a20] sm:text-5xl" style={display}>{t('Three ways to book with us')}</h2>
            <ul className="mt-12 grid gap-6 md:grid-cols-3">
              {waysList.map(({ icon, title, text, cta: ctaText, to }) => (
                <li key={title} className="flex flex-col rounded-3xl bg-[#f3f6f1] p-8">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-[#0f3d2e] ring-1 ring-[#c9a24b]/60">
                    <DynamicIcon name={icon} className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 text-2xl text-[#0a2a20]" style={display}>{t(title)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{t(text)}</p>
                  {to.startsWith('#') ? (
                    <a href={to} className={`mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[#0f3d2e] hover:text-[#9c7a2b] ${ring} rounded`}>{t(ctaText)} <ArrowRight className="h-4 w-4" /></a>
                  ) : (
                    <Link to={to} className={`mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[#0f3d2e] hover:text-[#9c7a2b] ${ring} rounded`}>{t(ctaText)} <ArrowRight className="h-4 w-4" /></Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
        <div className="relative isolate overflow-hidden rounded-[2rem] bg-[#0f3d2e] p-8 text-white sm:p-14">
          <div className="absolute -right-16 -top-16 -z-10 h-72 w-72 rounded-full bg-[#c9a24b]/25 blur-3xl" />
          <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium text-[#e6c877]"><Sparkles className="h-4 w-4" /> {t(cta.kicker)}</p>
              <h2 className="mt-3 max-w-xl text-4xl leading-tight sm:text-5xl" style={display}>{t(cta.title)}</h2>
            </div>
            <Link to={cta.buttonLink || '/contact'} className={`inline-flex items-center gap-2 rounded-full bg-[#c9a24b] px-7 py-4 text-sm font-bold text-[#082a1f] transition hover:bg-[#e6c877] ${ring}`}>
              <MessageCircle className="h-4 w-4" /> {t(cta.buttonText || 'Talk to a planner')}
            </Link>
          </div>
        </div>
      </section>

      {/* SELECTION BAR */}
      {chosen.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-4" style={{ animation: 'slideUp .35s ease-out' }} role="region" aria-label={t('Your request')}>
          <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 rounded-3xl bg-[#082a1f] p-4 pl-6 text-white shadow-2xl shadow-black/30 ring-1 ring-[#c9a24b]/40">
            <div className="min-w-0">
              <p className="text-sm font-semibold">{t(chosen.length === 1 ? '{{count}} service in your request' : '{{count}} services in your request', { count: chosen.length })}</p>
              <p className="truncate text-xs text-white/70">{chosen.map((s) => t(s.title)).join(', ')}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setSelected(new Set())} className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm text-white/80 ring-1 ring-white/25 hover:bg-white/10 ${ring}`}>
                <X className="h-4 w-4" /> {t('Clear')}
              </button>
              <Link to={quoteLink} className={`inline-flex items-center gap-2 rounded-full bg-[#c9a24b] px-6 py-2.5 text-sm font-bold text-[#082a1f] transition hover:bg-[#e6c877] ${ring}`}>
                {t('Request a quote')} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
