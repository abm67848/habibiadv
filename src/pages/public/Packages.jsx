import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Compass, Clock, MapPin, Users, Search, Check, Star, ArrowRight, ArrowUpRight, ShieldCheck,
  Heart, X, SlidersHorizontal, RefreshCw, MessageCircle, CalendarDays, ChevronDown, ArrowUpDown, ChevronRight,
} from 'lucide-react';
import { getPublicPackages } from '@/services/packages/index.jsx';

const HERO_IMG = '/images/packages-hero.jpg';
const CTA_IMG = 'https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?auto=format&fit=crop&w=1000&q=80';
const display = { fontFamily: "'Fraunces', Georgia, serif" };
const body = { fontFamily: "'Manrope', system-ui, sans-serif" };
const ring = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a24b]';
const STORAGE_KEY = 'saved-packages';
const SEO_TITLE = 'Morocco Travel Packages & Tours | Explore Our Trips';
const SEO_DESC = 'Discover unforgettable Morocco travel packages, private tours, Sahara Desert adventures and cultural trips. Explore our itineraries and plan your perfect Morocco journey.';

const ZELLIGE = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='72' height='72' viewBox='0 0 64 64'%3E%3Cpath d='M32 4l6 14 14-6-6 14 14 6-14 6 6 14-14-6-6 14-6-14-14 6 6-14-14-6 14-6-6-14 14 6z' fill='none' stroke='%23e6c877' stroke-opacity='.13'/%3E%3C/svg%3E")`,
};

const SORTS = [
  { value: 'featured', label: 'Recommended Trips' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'duration', label: 'Longest Trips First' },
];

const CATEGORIES = [
  { id: 'ALL', label: 'All Trips' },
  { id: 'cultural', label: 'Cultural Tours' },
  { id: 'adventure', label: 'Adventure Tours' },
  { id: 'desert', label: 'Desert Tours' },
  { id: 'private', label: 'Private Tours' },
];

const TRUST = [
  { icon: Star, title: 'Handpicked Travel Experiences', text: 'Carefully selected itineraries and stays.' },
  { icon: Users, title: 'Private Tours & VIP Concierge', text: 'Personalized travel with dedicated support.' },
  { icon: ShieldCheck, title: 'Secure & Hassle-Free Planning', text: 'Travel planning designed around your comfort.' },
];

const isSectionVisible = (pkg, section) => pkg.section_visibility?.[section] !== false;
const matchCategory = (pkg, id) =>
  id === 'ALL' || pkg.package_category === id ||
  `${pkg.package_category || ''} ${pkg.public_title || pkg.internal_title || ''}`.toLowerCase().includes(id.toLowerCase());

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function formatMoney(value, currency, locale) {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: currency || 'MAD', maximumFractionDigits: 0 }).format(Number(value));
  } catch {
    return `${currency || 'MAD'} ${Number(value).toLocaleString()}`;
  }
}

function formatPrice(pkg, locale, t) {
  if (pkg.price_display_mode === 'on_request') return t('Price Upon Request');
  if (pkg.starting_price == null || pkg.starting_price === '') return t('Contact us');
  return formatMoney(pkg.starting_price, pkg.default_currency, locale);
}

function formatDeparture(dateStr, locale) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return null;
  }
}

function usePopover() {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return undefined;
    const down = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const key = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key); };
  }, [open]);
  return [ref, open, setOpen];
}

function Select({ icon: Icon, label, value, options, onChange }) {
  const { t } = useTranslation();
  const [ref, open, setOpen] = usePopover();
  const current = options.find((o) => o.value === value) || options[0];
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-haspopup="listbox" aria-expanded={open} aria-label={label} onClick={() => setOpen((o) => !o)} className={`group flex w-full items-center gap-3 rounded-2xl bg-[#f3f6f1] px-4 py-3 text-left transition hover:bg-[#e9efe4] ${open ? 'ring-2 ring-[#c9a24b]/70' : ''} ${ring}`}>
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full transition ${open ? 'bg-[#0f3d2e] text-[#e6c877]' : 'bg-white text-[#9c7a2b]'}`}><Icon className="h-4 w-4" /></span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{t(current.label)}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition duration-300 ${open ? 'rotate-180 text-[#9c7a2b]' : ''}`} />
      </button>
      {open && (
        <ul role="listbox" aria-label={label} className="pop absolute left-0 top-full z-50 mt-2 max-h-72 w-full min-w-[14rem] overflow-auto rounded-2xl bg-white p-1.5 shadow-2xl shadow-[#082a1f]/25 ring-1 ring-[#0f3d2e]/10">
          {options.map((o) => {
            const on = o.value === value;
            return (
              <li key={o.value} role="option" aria-selected={on}>
                <button type="button" onClick={() => { onChange(o.value); setOpen(false); }} className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${on ? 'bg-[#0f3d2e] text-white' : 'text-slate-700 hover:bg-[#f3f6f1]'}`}>
                  {t(o.label)} {on && <Check className="h-4 w-4 text-[#e6c877]" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function PackageImage({ src, alt }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-[#0f3d2e] via-[#1f6b4f] to-[#c9a24b]">
      {src && !failed && (
        <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.07]" />
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-[2rem] bg-white ring-1 ring-[#0f3d2e]/10" aria-hidden="true">
      <div className="aspect-[16/11] animate-pulse bg-[#0f3d2e]/10" />
      <div className="space-y-3 p-6">
        <div className="h-5 w-3/4 animate-pulse rounded bg-[#0f3d2e]/10" />
        <div className="h-3 w-full animate-pulse rounded bg-[#0f3d2e]/10" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-[#0f3d2e]/10" />
        <div className="mt-6 h-11 animate-pulse rounded-full bg-[#0f3d2e]/10" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function PackagesPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === 'fr' ? 'fr-FR' : i18n.resolvedLanguage === 'es' ? 'es-ES' : i18n.resolvedLanguage === 'pl' ? 'pl-PL' : 'en-US';
  const [params, setParams] = useSearchParams();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scrollY, setScrollY] = useState(0);
  const raf = useRef(0);
  const [saved, setSaved] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));
    } catch {
      return new Set();
    }
  });

  const searchQuery = params.get('q') || '';
  const selectedCategory = params.get('category') || 'ALL';
  const selectedCountry = params.get('country') || 'ALL';
  const sortBy = params.get('sort') || 'featured';
  const maxPriceParam = Number(params.get('max')) || 0;
  const p = Math.min(scrollY / 700, 1); // hero scroll progress

  const update = useCallback(
    (key, value, fallback = '') => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (!value || value === fallback) next.delete(key);
          else next.set(key, value);
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const resetFilters = () => setParams({}, { replace: true });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPublicPackages();
      setPackages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading packages:', err);
      setError('We couldn’t load the travel packages. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const onScroll = () => {
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => setScrollY(Math.min(window.scrollY, 1000)));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf.current); };
  }, []);

  const toggleSave = (id) =>
    setSaved((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...n])); } catch { /* storage unavailable */ }
      return n;
    });

  const categoryCounts = useMemo(
    () => Object.fromEntries(CATEGORIES.map((c) => [c.id, packages.filter((pkg) => matchCategory(pkg, c.id)).length])),
    [packages],
  );

  const countries = useMemo(() => {
    const set = new Set();
    packages.forEach((pkg) => { const c = pkg.destination_country || pkg.country; if (c) set.add(c); });
    return [...set].sort();
  }, [packages]);

  const currency = useMemo(() => packages.find((pkg) => pkg.default_currency)?.default_currency || 'MAD', [packages]);

  const priceBounds = useMemo(() => {
    const prices = packages.filter((pkg) => pkg.price_display_mode !== 'on_request').map((pkg) => Number(pkg.starting_price)).filter((n) => n > 0);
    if (prices.length < 2) return null;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? null : { min: Math.floor(min), max: Math.ceil(max) };
  }, [packages]);

  const maxPrice = priceBounds ? Math.min(maxPriceParam || priceBounds.max, priceBounds.max) : 0;
  const priceActive = priceBounds && maxPriceParam > 0 && maxPriceParam < priceBounds.max;
  const sliderPct = priceBounds ? ((maxPrice - priceBounds.min) / (priceBounds.max - priceBounds.min)) * 100 : 100;

  const filteredPackages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const result = packages.filter((pkg) => {
      const haystack = [pkg.public_title, pkg.short_description, pkg.destination_country, pkg.primary_city, ...(pkg.destination_names || []), pkg.package_category]
        .filter(Boolean).map((s) => String(s).toLowerCase());
      const matchSearch = !q || haystack.some((s) => s.includes(q));
      const countryValue = pkg.destination_country || pkg.country;
      const matchCountry = selectedCountry === 'ALL' || countryValue === selectedCountry;
      const matchPrice = !priceActive || !Number(pkg.starting_price) || Number(pkg.starting_price) <= maxPriceParam;
      return matchSearch && matchCategory(pkg, selectedCategory) && matchCountry && matchPrice;
    });
    if (sortBy === 'price-low') result.sort((a, b) => Number(a.starting_price || 0) - Number(b.starting_price || 0));
    else if (sortBy === 'price-high') result.sort((a, b) => Number(b.starting_price || 0) - Number(a.starting_price || 0));
    else if (sortBy === 'duration') result.sort((a, b) => (b.duration_days || 0) - (a.duration_days || 0));
    return result;
  }, [packages, searchQuery, selectedCategory, selectedCountry, sortBy, priceActive, maxPriceParam]);

  const activeFilters = [
    searchQuery && { key: 'q', label: `“${searchQuery}”` },
    selectedCategory !== 'ALL' && { key: 'category', label: t(CATEGORIES.find((c) => c.id === selectedCategory)?.label || selectedCategory) },
    selectedCountry !== 'ALL' && { key: 'country', label: selectedCountry },
    priceActive && { key: 'max', label: t('Up to {{amount}}', { amount: formatMoney(maxPriceParam, currency, locale) }) },
  ].filter(Boolean);

  // SEO: title, description, canonical, and a CollectionPage + ItemList of the real packages.
  // For best crawlability also render these server-side (SSR/prerender or react-helmet-async).
  useEffect(() => {
    const origin = window.location.origin;
    document.title = t(SEO_TITLE);
    const ensure = (selector, tag, attrs) => {
      let el = document.head.querySelector(selector);
      if (!el) { el = document.createElement(tag); Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v)); document.head.appendChild(el); }
      return el;
    };
    ensure('meta[name="description"]', 'meta', { name: 'description' }).setAttribute('content', t(SEO_DESC));
    ensure('link[rel="canonical"]', 'link', { rel: 'canonical' }).setAttribute('href', `${origin}/packages`);
    ensure('#ld-packages', 'script', { id: 'ld-packages', type: 'application/ld+json' }).textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: t(SEO_TITLE),
      url: `${origin}/packages`,
      description: t(SEO_DESC),
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: packages.map((pkg, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: pkg.public_title || pkg.internal_title,
          url: `${origin}/packages/${pkg.id}`,
        })),
      },
    });
  }, [t, i18n.resolvedLanguage, packages]);

  const countryOptions = [{ value: 'ALL', label: 'All Destinations' }, ...countries.map((c) => ({ value: c, label: c }))];
  const noPackagesAtAll = !loading && !error && packages.length === 0;
  const noMatches = !loading && !error && packages.length > 0 && filteredPackages.length === 0;

  return (
    <div className="min-h-screen bg-[#f3f6f1] text-slate-700 antialiased" style={body}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;1,9..144,400&family=Manrope:wght@400;500;600;700&display=swap');
        @keyframes drift{from{transform:scale(1.02)}to{transform:scale(1.1)}}
        @keyframes lineUp{from{transform:translateY(112%)}to{transform:none}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes grow{from{transform:scaleX(0)}to{transform:scaleX(1)}}
        @keyframes pop{from{opacity:0;transform:translateY(-8px) scale(.98)}to{opacity:1;transform:none}}
        @keyframes cue{0%{transform:scaleY(0);transform-origin:top}45%{transform:scaleY(1);transform-origin:top}55%{transform:scaleY(1);transform-origin:bottom}100%{transform:scaleY(0);transform-origin:bottom}}
        .line{display:block;animation:lineUp 1.2s cubic-bezier(.2,.8,.2,1) both}
        .pop{animation:pop .2s cubic-bezier(.2,.8,.2,1)}
        .rng{-webkit-appearance:none;appearance:none;height:6px;border-radius:999px;background:linear-gradient(to right,#c9a24b var(--p),rgba(15,61,46,.14) var(--p))}
        .rng::-webkit-slider-thumb{-webkit-appearance:none;height:24px;width:24px;border-radius:999px;background:#0f3d2e;border:4px solid #e6c877;box-shadow:0 2px 8px rgba(8,42,31,.35);cursor:grab}
        .rng::-moz-range-thumb{height:16px;width:16px;border-radius:999px;background:#0f3d2e;border:4px solid #e6c877;cursor:grab}
        .no-scrollbar{scrollbar-width:none}.no-scrollbar::-webkit-scrollbar{display:none}
        @media (prefers-reduced-motion: reduce){*{animation:none!important;transition:none!important}}
      `}</style>

      {/* HERO: full-bleed photograph, heritage frame, scroll-linked depth */}
      <header className="relative isolate min-h-[88svh] overflow-hidden bg-[#082a1f] text-white">
        <div className="absolute inset-0 -z-20 will-change-transform" style={{ transform: `translate3d(0, ${scrollY * 0.35}px, 0) scale(${1 + p * 0.16})` }}>
          <div className="absolute inset-0 bg-gradient-to-br from-[#082a1f] via-[#1f6b4f] to-[#c9a24b]" />
          <img
            src={HERO_IMG}
            alt={t('Moroccan landscape, Morocco travel packages and tours')}
            onError={(e) => (e.currentTarget.style.display = 'none')}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ animation: 'drift 30s ease-in-out infinite alternate' }}
          />
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#082a1f]/70 via-[#082a1f]/35 to-[#082a1f]/90" />
        <div className="absolute inset-0 -z-10 bg-[#082a1f]" style={{ opacity: p * 0.7 }} />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-[#f3f6f1] to-transparent" />
        <div className="pointer-events-none absolute inset-4 border border-[#e6c877]/45 sm:inset-8" style={{ opacity: 1 - p, transform: `scale(${1 - p * 0.04})`, animation: 'fadeIn 1.6s ease .3s both' }} aria-hidden="true" />
        <div className="pointer-events-none absolute inset-6 border border-[#e6c877]/15 sm:inset-11" style={{ opacity: 1 - p }} aria-hidden="true" />

        <div className="relative flex min-h-[88svh] flex-col items-center justify-center px-6 pb-56 pt-36 text-center" style={{ transform: `translate3d(0, ${-p * 80}px, 0)`, opacity: Math.max(0, 1 - p * 1.4) }}>
          <nav aria-label={t('Breadcrumb')} className="flex items-center gap-2 text-sm text-white/80" style={{ animation: 'fadeIn 1.2s ease .2s both' }}>
            <Link to="/" className="transition hover:text-[#e6c877]">{t('Home')}</Link>
            <ChevronRight className="h-3.5 w-3.5 text-[#e6c877]" />
            <span aria-current="page" className="text-[#e6c877]">{t('Travel Packages')}</span>
          </nav>

          <h1 className="mt-7 max-w-4xl text-4xl leading-[1.05] tracking-tight sm:text-6xl xl:text-7xl" style={display}>
            <span className="block overflow-hidden pb-2"><span className="line" style={{ animationDelay: '.35s' }}>{t('Discover Unforgettable')}</span></span>
            <span className="sr-only"> </span>
            <span className="block overflow-hidden pb-3"><span className="line italic text-[#e6c877]" style={{ animationDelay: '.55s' }}>{t('Morocco Travel Packages')}</span></span>
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/85" style={{ animation: 'fadeIn 1.4s ease 1.1s both' }}>
            {t('Explore Morocco through thoughtfully designed travel packages, private tours and authentic local experiences. Whether you’re dreaming of the Sahara Desert, exploring historic imperial cities or discovering hidden gems, find the perfect Morocco trip tailored to your travel style, interests and budget.')}
          </p>

          <ul className="mt-10 grid w-full max-w-4xl gap-3 sm:grid-cols-3" style={{ animation: 'fadeIn 1.4s ease 1.4s both' }}>
            {TRUST.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-start gap-3 rounded-2xl bg-white/10 p-4 text-left ring-1 ring-white/20 backdrop-blur">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#c9a24b] text-[#082a1f]"><Icon className="h-4 w-4" /></span>
                <span>
                  <span className="block text-sm font-semibold">{t(title)}</span>
                  <span className="block text-xs leading-snug text-white/75">{t(text)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <a href="#results" aria-label={t('Scroll down')} className="absolute bottom-40 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-3 text-xs text-white/70 lg:flex" style={{ opacity: 1 - p * 3 }}>
          <span className="block h-12 w-px bg-[#e6c877]" style={{ animation: 'cue 2.4s ease-in-out infinite' }} />
        </a>
      </header>

      {/* FILTER PANEL */}
      <section className="relative z-20 mx-auto -mt-36 max-w-7xl px-5 lg:px-8" aria-label={t('Search and filter packages')}>
        <div className="rounded-[2rem] bg-white p-4 shadow-2xl shadow-[#082a1f]/30 ring-1 ring-[#0f3d2e]/5 sm:p-6">
          <div className="grid gap-3 lg:grid-cols-[1fr_240px_240px]">
            <label className="group relative flex items-center gap-3 rounded-2xl bg-[#f3f6f1] px-4 py-3 transition focus-within:ring-2 focus-within:ring-[#c9a24b]/70 hover:bg-[#e9efe4]">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-[#9c7a2b] transition group-focus-within:bg-[#0f3d2e] group-focus-within:text-[#e6c877]"><Search className="h-4 w-4" /></span>
              <span className="sr-only">{t('Search packages')}</span>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => update('q', e.target.value)}
                placeholder={t('Search tours, destinations or experiences...')}
                className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-400"
              />
              {searchQuery && <button type="button" onClick={() => update('q', '')} aria-label={t('Clear search')} className="text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button>}
            </label>
            <Select icon={MapPin} label={t('Destination')} value={selectedCountry} options={countryOptions} onChange={(v) => update('country', v, 'ALL')} />
            <Select icon={ArrowUpDown} label={t('Sort packages')} value={sortBy} options={SORTS} onChange={(v) => update('sort', v, 'featured')} />
          </div>

          <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label={t('Filter by category')}>
            {CATEGORIES.map(({ id, label }) => {
              const active = selectedCategory === id;
              return (
                <button key={id} role="tab" aria-selected={active} onClick={() => update('category', id, 'ALL')} className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${ring} ${active ? 'bg-[#0f3d2e] text-white shadow-md shadow-[#0f3d2e]/30' : 'bg-white text-slate-600 ring-1 ring-[#0f3d2e]/10 hover:ring-[#c9a24b]'}`}>
                  {t(label)}
                  <span className={`rounded-full px-2 py-0.5 text-[11px] tabular-nums ${active ? 'bg-[#c9a24b] text-[#082a1f]' : 'bg-[#f3f6f1] text-slate-500'}`}>{categoryCounts[id] ?? 0}</span>
                </button>
              );
            })}
          </div>

          {priceBounds && (
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl bg-[#f3f6f1] px-5 py-4">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#0a2a20]"><SlidersHorizontal className="h-4 w-4 text-[#c9a24b]" /> {t('Maximum Price Per Traveler')}</span>
              <input
                type="range"
                className="rng h-2 min-w-[160px] flex-1 cursor-pointer"
                style={{ '--p': `${sliderPct}%` }}
                min={priceBounds.min}
                max={priceBounds.max}
                step={Math.max(1, Math.round((priceBounds.max - priceBounds.min) / 50))}
                value={maxPrice}
                onChange={(e) => update('max', e.target.value)}
                aria-label={t('Maximum Price Per Traveler')}
              />
              <span className="min-w-28 rounded-full bg-white px-4 py-1.5 text-right text-sm font-bold tabular-nums text-[#0a2a20] ring-1 ring-[#c9a24b]/50">{formatMoney(maxPrice, currency, locale)}</span>
            </div>
          )}
        </div>
      </section>

      {/* RESULTS */}
      <main id="results" className="mx-auto max-w-7xl scroll-mt-24 px-5 pb-24 pt-20 lg:px-8">
        <div className="max-w-3xl">
          <h2 className="text-3xl leading-[1.1] text-[#0a2a20] sm:text-5xl" style={display}>{t('Find Your Perfect Morocco Tour')}</h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">{t('Discover our collection of Morocco travel packages designed to make every journey unforgettable. From immersive cultural experiences and Sahara Desert adventures to private guided tours and multi-day Morocco itineraries, explore the best of Morocco at your own pace.')}</p>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">{t('Find the right trip for your dates, destination and travel budget, and let us help you turn your travel plans into an unforgettable experience.')}</p>
        </div>

        <div className="mb-8 mt-10 flex flex-wrap items-center justify-between gap-3 border-y border-dashed border-[#0f3d2e]/15 py-4" role="status" aria-live="polite">
          <p className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-600">
            {loading ? t('Loading packages…') : <span><strong className="text-lg text-[#0a2a20]" style={display}>{filteredPackages.length}</strong> {t('Travel Packages Available')}</span>}
            {saved.size > 0 && !loading && <span className="inline-flex items-center gap-1.5 text-[#9c7a2b]"><Heart className="h-3.5 w-3.5 fill-current" /> {t('Saved Trips')}: {saved.size}</span>}
          </p>
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">{t('Selected Filters')}</span>
              {activeFilters.map((f) => (
                <button key={f.key} onClick={() => update(f.key, '')} className={`inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-[#0a2a20] ring-1 ring-[#c9a24b]/60 transition hover:bg-[#c9a24b]/10 ${ring}`} aria-label={t('Remove filter {{label}}', { label: f.label })}>
                  {f.label} <X className="h-3 w-3" />
                </button>
              ))}
              <button onClick={resetFilters} className="text-xs font-semibold text-[#9c7a2b] underline underline-offset-4">{t('Clear All Filters')}</button>
            </div>
          )}
        </div>

        {error && !loading && (
          <div className="rounded-[2rem] bg-white p-10 text-center ring-1 ring-[#0f3d2e]/10" role="alert">
            <p className="text-2xl text-[#0a2a20]" style={display}>{t('Something went wrong')}</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">{t(error)}</p>
            <button onClick={loadData} className={`mt-5 inline-flex items-center gap-2 rounded-full bg-[#0f3d2e] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1f6b4f] ${ring}`}>
              <RefreshCw className="h-4 w-4" /> {t('Try again')}
            </button>
          </div>
        )}

        {loading && (
          <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {!loading && !error && filteredPackages.length > 0 && (
          <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
            {filteredPackages.map((pkg) => {
              const title = pkg.public_title || pkg.internal_title || 'Untitled trip';
              const nights = pkg.duration_nights ?? (pkg.duration_days ? pkg.duration_days - 1 : 0);
              const isSaved = saved.has(pkg.id);
              const onRequest = pkg.price_display_mode === 'on_request';
              const showPrice = isSectionVisible(pkg, 'pricing');
              const departure = formatDeparture(pkg.next_departure, locale);
              return (
                <article key={pkg.id} className="group relative flex flex-col overflow-hidden rounded-[2rem] bg-white ring-1 ring-[#0f3d2e]/10 transition duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-[#0f3d2e]/15">
                  <div className="relative aspect-[16/11] w-full overflow-hidden rounded-b-[1.5rem]">
                    <PackageImage src={pkg.cover_image_url || pkg.gallery?.[0]} alt={t(title)} />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#082a1f]/75 via-transparent to-[#082a1f]/20" />

                    <div className="absolute left-3 top-3 flex flex-wrap gap-1.5 pr-14">
                      {isSectionVisible(pkg, 'trip_facts') && pkg.package_category && <span className="rounded-full bg-[#c9a24b] px-3 py-1 text-[11px] font-bold text-[#082a1f]">{t(pkg.package_category)}</span>}
                      {isSectionVisible(pkg, 'trip_facts') && (pkg.primary_city || pkg.country || pkg.destination_country) && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#082a1f]/70 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
                          <MapPin className="h-3 w-3 text-[#e6c877]" /> {pkg.primary_city || pkg.country || pkg.destination_country}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => toggleSave(pkg.id)}
                      aria-pressed={isSaved}
                      aria-label={isSaved ? t('Remove {{title}} from saved', { title: t(title) }) : t('Save {{title}}', { title: t(title) })}
                      className={`absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-[#0f3d2e] backdrop-blur transition hover:scale-110 ${ring}`}
                    >
                      <Heart className={`h-4 w-4 ${isSaved ? 'fill-[#c9a24b] text-[#c9a24b]' : ''}`} />
                    </button>

                    {isSectionVisible(pkg, 'trip_facts') && (
                      <p className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1 text-[11px] font-medium text-white backdrop-blur">
                        <Clock className="h-3 w-3 text-[#e6c877]" />
                        {pkg.duration_days ? t('{{count}} Days, {{nights}} Nights', { count: pkg.duration_days, nights }) : t('Flexible duration')}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="text-2xl leading-snug text-[#0a2a20]" style={display}>
                      <Link to={`/packages/${pkg.id}`} className={`rounded after:absolute after:inset-0 after:z-0 ${ring}`}>{t(title)}</Link>
                    </h3>
                    {isSectionVisible(pkg, 'overview') && (
                      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600">
                        {t(pkg.short_description || 'A guided itinerary with local hosts, private transfers and time to explore.')}
                      </p>
                    )}

                    {isSectionVisible(pkg, 'departures') && departure && (
                      <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[#0f3d2e]">
                        <CalendarDays className="h-3.5 w-3.5 text-[#c9a24b]" /> {t('Next Departure')}: {departure}
                      </p>
                    )}

                    {isSectionVisible(pkg, 'highlights') && Array.isArray(pkg.highlights) && pkg.highlights.length > 0 && (
                      <ul className="mt-4 space-y-2 border-t border-dashed border-[#0f3d2e]/15 pt-4">
                        {pkg.highlights.slice(0, 3).map((h, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-xs text-slate-700">
                            <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-[#0f3d2e] text-[#e6c877]"><Check className="h-2.5 w-2.5" strokeWidth={3} /></span>
                            <span className="line-clamp-1">{h}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="mt-auto pt-6">
                      <div className="border-t border-dashed border-[#0f3d2e]/15 pt-4">
                        <span className="block text-xs text-slate-500">{t(!showPrice || onRequest ? 'Pricing' : pkg.price_display_mode === 'starting_from' ? 'Starting From' : 'Price')}</span>
                        <span className="text-2xl font-bold text-[#0a2a20]" style={display}>{showPrice ? formatPrice(pkg, locale, t) : t('Request a Personalized Quote')}</span>
                        {showPrice && !onRequest && pkg.starting_price ? <span className="text-xs text-slate-500"> / {t('Traveler')}</span> : null}
                      </div>
                      <span className="mt-4 flex items-center justify-between rounded-full bg-[#0f3d2e] py-2.5 pl-5 pr-2.5 text-sm font-semibold text-[#e6c877] transition group-hover:bg-[#c9a24b] group-hover:text-[#082a1f]">
                        {t('Explore This Tour')}
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-white/15 transition group-hover:rotate-45"><ArrowUpRight className="h-4 w-4" /></span>
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {noPackagesAtAll && (
          <div className="rounded-[2rem] bg-white p-12 text-center ring-1 ring-[#0f3d2e]/10">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#f3f6f1] text-[#c9a24b]"><Compass className="h-7 w-7" /></span>
            <h3 className="mt-5 text-2xl text-[#0a2a20]" style={display}>{t('No Travel Packages Available Right Now')}</h3>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate-600">{t('We’re preparing new travel experiences and itineraries for you. Get in touch with our team to plan your next adventure or check back soon to discover our latest travel packages.')}</p>
            <Link to="/contact" className={`mt-6 inline-flex items-center gap-2 rounded-full bg-[#0f3d2e] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1f6b4f] ${ring}`}>{t('Request Your Custom Morocco Tour')}</Link>
          </div>
        )}

        {noMatches && (
          <div className="rounded-[2rem] bg-white p-12 text-center ring-1 ring-[#0f3d2e]/10">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#f3f6f1] text-[#c9a24b]"><Search className="h-7 w-7" /></span>
            <h3 className="mt-5 text-2xl text-[#0a2a20]" style={display}>{t('No Trips Found for Your Search')}</h3>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate-600">{t('We couldn’t find travel packages matching your current search. Try exploring another destination, adjusting your price range or clearing your filters to discover more travel experiences.')}</p>
            <button onClick={resetFilters} className={`mt-6 inline-flex items-center gap-2 rounded-full bg-[#0f3d2e] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1f6b4f] ${ring}`}>{t('Explore All Travel Packages')}</button>
          </div>
        )}

        {/* CUSTOM TRIP CTA */}
        {!loading && !error && (
          <section className="relative isolate mt-20 overflow-hidden rounded-[2.5rem] bg-[#0f3d2e] text-white">
            <div className="absolute inset-0 -z-10" style={ZELLIGE} />
            <div className="absolute -right-16 -top-16 -z-10 h-72 w-72 rounded-full bg-[#c9a24b]/20 blur-3xl" />
            <div className="grid items-center gap-10 p-8 sm:p-12 lg:grid-cols-[1.3fr_0.7fr] lg:p-16">
              <div>
                <h2 className="max-w-xl text-3xl leading-[1.1] sm:text-5xl" style={display}>{t('Your Dream Trip Doesn’t Have to Be on the List')}</h2>
                <p className="mt-5 max-w-lg text-sm leading-relaxed text-white/80">{t('Looking for a unique Morocco tour, a private itinerary or a travel experience tailored to your interests? Tell us where you want to go, how you want to travel and what you’d love to experience.')}</p>
                <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/80">{t('Our travel planners will help you create a personalized itinerary designed around your preferences, schedule and budget, so you can enjoy a journey that’s truly your own.')}</p>
                <Link to="/contact" className={`group mt-8 inline-flex items-center gap-2 rounded-full bg-[#c9a24b] py-3.5 pl-6 pr-3.5 text-sm font-bold text-[#082a1f] transition hover:bg-[#e6c877] ${ring}`}>
                  <MessageCircle className="h-4 w-4" /> {t('Request Your Custom Morocco Tour')}
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-[#082a1f] text-[#e6c877] transition group-hover:rotate-45"><ArrowRight className="h-4 w-4" /></span>
                </Link>
              </div>
              <div className="relative mx-auto hidden w-full max-w-xs lg:block">
                <div className="absolute -inset-3 translate-x-3 translate-y-3 rounded-t-[999px] rounded-b-[2rem] ring-1 ring-[#c9a24b]/50" aria-hidden="true" />
                <div className="relative aspect-[4/5] overflow-hidden rounded-t-[999px] rounded-b-[2rem] bg-gradient-to-br from-[#1f6b4f] to-[#c9a24b]">
                  <img src={CTA_IMG} alt="" loading="lazy" onError={(e) => (e.currentTarget.style.display = 'none')} className="h-full w-full object-cover" />
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}