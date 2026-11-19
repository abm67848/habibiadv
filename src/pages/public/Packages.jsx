import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Compass, Clock, MapPin, Users, Search, Check, Star, ArrowRight, ShieldCheck,
  Heart, X, SlidersHorizontal, RefreshCw, MessageCircle, CalendarDays,
} from 'lucide-react';
import { getPublicPackages } from '@/services/packages/index.jsx';

const HERO_IMG = '/images/packages-hero.jpg';
const display = { fontFamily: "'Fraunces', Georgia, serif" };
const body = { fontFamily: "'Manrope', system-ui, sans-serif" };
const ring = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a24b]';
const STORAGE_KEY = 'saved-packages';

const SORTS = [
  { id: 'featured', label: 'Featured first' },
  { id: 'price-low', label: 'Price: low to high' },
  { id: 'price-high', label: 'Price: high to low' },
  { id: 'duration', label: 'Longest first' },
];

const TRUST = [
  { icon: ShieldCheck, text: 'Full booking protection' },
  { icon: Star, text: 'Handpicked stays' },
  { icon: Users, text: 'Private group and VIP concierge' },
];

const isSectionVisible = (pkg, section) => pkg.section_visibility?.[section] !== false;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function formatPrice(pkg, locale, t) {
  if (pkg.price_display_mode === 'on_request') return t('On request');
  if (pkg.starting_price == null || pkg.starting_price === '') return t('Contact us');
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: pkg.default_currency || 'MAD',
      maximumFractionDigits: 0,
    }).format(Number(pkg.starting_price));
  } catch {
    return `${pkg.default_currency || 'MAD'} ${Number(pkg.starting_price).toLocaleString()}`;
  }
}

function formatDeparture(dateStr, locale) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return null;
  }
}

function PackageImage({ src, alt }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-[#0f3d2e] via-[#1f6b4f] to-[#c9a24b]">
      {src && !failed && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
        />
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-3xl bg-white ring-1 ring-[#0f3d2e]/10" aria-hidden="true">
      <div className="aspect-[16/10] animate-pulse bg-[#0f3d2e]/10" />
      <div className="space-y-3 p-6">
        <div className="h-5 w-3/4 animate-pulse rounded bg-[#0f3d2e]/10" />
        <div className="h-3 w-full animate-pulse rounded bg-[#0f3d2e]/10" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-[#0f3d2e]/10" />
        <div className="mt-6 h-10 animate-pulse rounded-full bg-[#0f3d2e]/10" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function PackagesPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === 'fr' ? 'fr-FR' : i18n.resolvedLanguage === 'es' ? 'es-ES' : 'en-US';
  const [params, setParams] = useSearchParams();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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

  const toggleSave = (id) =>
    setSaved((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...n]));
      } catch { /* storage unavailable */ }
      return n;
    });

  /* Categories — prefer offers.package_category, fall back to nothing */
  const categories = useMemo(() => {
    const counts = new Map();
    packages.forEach((p) => p.package_category && counts.set(p.package_category, (counts.get(p.package_category) || 0) + 1));
    return [...counts.entries()];
  }, [packages]);

  /* Countries — prefer offers.destination_country, fall back to destination records */
  const countries = useMemo(() => {
    const set = new Set();
    packages.forEach((p) => {
      if (p.destination_country) set.add(p.destination_country);
      else if (p.country) set.add(p.country);
    });
    return [...set].sort();
  }, [packages]);

  const priceBounds = useMemo(() => {
    const prices = packages
      .filter((p) => p.price_display_mode !== 'on_request')
      .map((p) => Number(p.starting_price))
      .filter((n) => n > 0);
    if (prices.length < 2) return null;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? null : { min: Math.floor(min), max: Math.ceil(max) };
  }, [packages]);

  const maxPrice = priceBounds ? Math.min(maxPriceParam || priceBounds.max, priceBounds.max) : 0;
  const priceActive = priceBounds && maxPriceParam > 0 && maxPriceParam < priceBounds.max;

  const filteredPackages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const result = packages.filter((pkg) => {
      const haystack = [
        pkg.public_title,
        pkg.short_description,
        pkg.destination_country,
        pkg.primary_city,
        ...(pkg.destination_names || []),
        pkg.package_category,
      ].filter(Boolean).map((s) => String(s).toLowerCase());
      const matchSearch = !q || haystack.some((s) => s.includes(q));
      const matchCat = selectedCategory === 'ALL' || pkg.package_category === selectedCategory;
      const countryValue = pkg.destination_country || pkg.country;
      const matchCountry = selectedCountry === 'ALL' || countryValue === selectedCountry;
      const matchPrice = !priceActive || !Number(pkg.starting_price) || Number(pkg.starting_price) <= maxPriceParam;
      return matchSearch && matchCat && matchCountry && matchPrice;
    });

    if (sortBy === 'price-low') result.sort((a, b) => Number(a.starting_price || 0) - Number(b.starting_price || 0));
    else if (sortBy === 'price-high') result.sort((a, b) => Number(b.starting_price || 0) - Number(a.starting_price || 0));
    else if (sortBy === 'duration') result.sort((a, b) => (b.duration_days || 0) - (a.duration_days || 0));
    return result;
  }, [packages, searchQuery, selectedCategory, selectedCountry, sortBy, priceActive, maxPriceParam]);

  const activeFilters = [
    searchQuery && { key: 'q', label: `“${searchQuery}”` },
    selectedCategory !== 'ALL' && { key: 'category', label: selectedCategory },
    selectedCountry !== 'ALL' && { key: 'country', label: selectedCountry },
    priceActive && { key: 'max', label: t('Up to {{amount}}', { amount: maxPriceParam.toLocaleString(locale) }) },
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-[#f3f6f1] text-slate-700 antialiased" style={body}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Manrope:wght@400;500;600;700&display=swap');
        @keyframes drift{from{transform:scale(1.04)}to{transform:scale(1.1)}}
        @keyframes rise{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
        .rise{opacity:0;animation:rise .8s cubic-bezier(.2,.7,.2,1) forwards}
        input[type=range]{accent-color:#c9a24b}
        @media (prefers-reduced-motion: reduce){*{animation:none!important;transition:none!important}.rise{opacity:1}}
      `}</style>

      {/* HERO */}
      <header className="relative isolate overflow-hidden bg-[#082a1f] pb-44 pt-36 text-white sm:pt-44">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#082a1f] via-[#1f6b4f] to-[#c9a24b]" />
        <img
          src={HERO_IMG}
          alt=""
          onError={(e) => (e.currentTarget.style.display = 'none')}
          className="absolute inset-0 -z-10 h-full w-full object-cover"
          style={{ animation: 'drift 26s ease-in-out infinite alternate' }}
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#082a1f]/70 via-[#082a1f]/60 to-[#082a1f]" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-[#f3f6f1] to-transparent" />

        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <h1 className="rise max-w-3xl text-4xl leading-[1.05] sm:text-6xl lg:text-7xl" style={display}>
            {t('Trips planned around how you like to travel')}
          </h1>
          <p className="rise mt-6 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg" style={{ animationDelay: '.2s' }}>
            {t('Hand-built itineraries, private stays and local guides. Pick a package, change what you like, and we handle the rest.')}
          </p>
          <ul className="rise mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm text-white/90" style={{ animationDelay: '.35s' }}>
            {TRUST.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-2"><Icon className="h-4 w-4 text-[#e6c877]" /> {t(text)}</li>
            ))}
          </ul>
        </div>
      </header>

      {/* FILTER PANEL */}
      <section className="relative z-10 mx-auto -mt-32 max-w-7xl px-5 lg:px-8" aria-label={t('Search and filter packages')}>
        <div className="rounded-3xl bg-white p-4 shadow-2xl shadow-[#082a1f]/15 ring-1 ring-[#0f3d2e]/5 sm:p-6">
          <div className="grid gap-3 lg:grid-cols-[1fr_220px_220px]">
            <label className="relative block">
              <span className="sr-only">{t('Search packages')}</span>
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c9a24b]" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => update('q', e.target.value)}
                placeholder={t('Search by trip, place or keyword')}
                className="w-full rounded-2xl border-0 bg-[#f3f6f1] py-3.5 pl-11 pr-4 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-[#c9a24b]"
              />
            </label>

            <label className="block">
              <span className="sr-only">{t('Country')}</span>
              <select
                value={selectedCountry}
                onChange={(e) => update('country', e.target.value, 'ALL')}
                className="w-full rounded-2xl border-0 bg-[#f3f6f1] px-4 py-3.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#c9a24b]"
              >
                <option value="ALL">{t('All countries')}</option>
                {countries.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>

            <label className="block">
              <span className="sr-only">{t('Sort packages')}</span>
              <select
                value={sortBy}
                onChange={(e) => update('sort', e.target.value, 'featured')}
                className="w-full rounded-2xl border-0 bg-[#f3f6f1] px-4 py-3.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-[#c9a24b]"
              >
                {SORTS.map((s) => <option key={s.id} value={s.id}>{t(s.label)}</option>)}
              </select>
            </label>
          </div>

          {categories.length > 0 && (
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label={t('Filter by category')}>
              {[['ALL', packages.length], ...categories].map(([cat, count]) => {
                const active = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    role="tab"
                    aria-selected={active}
                    onClick={() => update('category', cat, 'ALL')}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${ring} ${
                      active ? 'bg-[#0f3d2e] text-white' : 'bg-white text-slate-600 ring-1 ring-[#0f3d2e]/10 hover:ring-[#c9a24b]'
                    }`}
                  >
                    {cat === 'ALL' ? t('All trips') : t(cat)}
                    <span className={`rounded-full px-2 py-0.5 text-[11px] ${active ? 'bg-[#c9a24b] text-[#082a1f]' : 'bg-[#f3f6f1] text-slate-500'}`}>{count}</span>
                  </button>
                );
              })}
            </div>
          )}

          {priceBounds && (
            <div className="mt-4 flex flex-wrap items-center gap-4 rounded-2xl bg-[#f3f6f1] px-4 py-3">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#0a2a20]"><SlidersHorizontal className="h-4 w-4 text-[#c9a24b]" /> {t('Max price per traveler')}</span>
              <input
                type="range"
                min={priceBounds.min}
                max={priceBounds.max}
                step={Math.max(1, Math.round((priceBounds.max - priceBounds.min) / 50))}
                value={maxPrice}
                onChange={(e) => update('max', e.target.value)}
                aria-label={t('Maximum price')}
                className="h-2 min-w-[160px] flex-1 cursor-pointer"
              />
              <span className="min-w-24 text-right text-sm font-bold text-[#0a2a20]">{maxPrice.toLocaleString(locale)}</span>
            </div>
          )}
        </div>
      </section>

      {/* RESULTS */}
      <main className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3" role="status" aria-live="polite">
          <p className="text-sm text-slate-600">
            {loading ? t('Loading packages…') : <><strong className="text-[#0a2a20]">{filteredPackages.length}</strong> {t(filteredPackages.length === 1 ? 'package' : 'packages')} {t('available')}</>}
            {saved.size > 0 && !loading && <span className="ml-3 inline-flex items-center gap-1 text-[#9c7a2b]"><Heart className="h-3.5 w-3.5 fill-current" /> {t('{{count}} saved', { count: saved.size })}</span>}
          </p>
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {activeFilters.map((f) => (
                <button key={f.key} onClick={() => update(f.key, '')} className={`inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-[#0a2a20] ring-1 ring-[#c9a24b]/60 hover:bg-[#c9a24b]/10 ${ring}`} aria-label={t('Remove filter {{label}}', { label: f.label })}>
                  {f.label} <X className="h-3 w-3" />
                </button>
              ))}
              <button onClick={resetFilters} className="text-xs font-semibold text-[#9c7a2b] underline underline-offset-4">{t('Reset all')}</button>
            </div>
          )}
        </div>

        {error && !loading && (
          <div className="rounded-3xl bg-white p-10 text-center ring-1 ring-[#0f3d2e]/10" role="alert">
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
              const nights = pkg.duration_nights ?? (pkg.duration_days ? pkg.duration_days - 1 : 0);
              const isSaved = saved.has(pkg.id);
              const onRequest = pkg.price_display_mode === 'on_request';
              const departure = formatDeparture(pkg.next_departure, locale);
              return (
                <article key={pkg.id} className="group relative flex flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-[#0f3d2e]/10 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#0f3d2e]/10">
                  <div className="relative aspect-[16/10] w-full overflow-hidden">
                    <PackageImage src={pkg.cover_image_url || pkg.gallery?.[0]} alt={t(pkg.public_title || 'Package')} />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#082a1f]/70 via-transparent to-transparent" />

                    <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                      {isSectionVisible(pkg, 'trip_facts') && pkg.package_category && <span className="rounded-full bg-[#c9a24b] px-3 py-1 text-[11px] font-bold text-[#082a1f]">{pkg.package_category}</span>}
                      {isSectionVisible(pkg, 'trip_facts') && (pkg.primary_city || pkg.country) && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#082a1f]/75 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
                          <MapPin className="h-3 w-3 text-[#e6c877]" /> {pkg.primary_city || pkg.country}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => toggleSave(pkg.id)}
                      aria-pressed={isSaved}
                      aria-label={isSaved ? t('Remove {{title}} from saved', { title: t(pkg.public_title || '') }) : t('Save {{title}}', { title: t(pkg.public_title || '') })}
                      className={`absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-[#0f3d2e] backdrop-blur transition hover:scale-110 ${ring}`}
                    >
                      <Heart className={`h-4 w-4 ${isSaved ? 'fill-[#c9a24b] text-[#c9a24b]' : ''}`} />
                    </button>

                    {isSectionVisible(pkg, 'trip_facts') && (
                      <p className="absolute bottom-3 left-4 flex items-center gap-1.5 text-xs font-medium text-white">
                        <Clock className="h-3.5 w-3.5 text-[#e6c877]" />
                        {pkg.duration_days ? t('{{count}} days', { count: pkg.duration_days }) : t('Flexible duration')}
                        {pkg.duration_days && `, ${t('{{count}} nights', { count: nights })}`}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-6">
                    <h2 className="text-2xl leading-snug text-[#0a2a20]" style={display}>
                      <Link to={`/packages/${pkg.id}`} className={`after:absolute after:inset-0 after:z-0 ${ring} rounded`}>
                        {t(pkg.public_title || pkg.internal_title || 'Untitled trip')}
                      </Link>
                    </h2>
                    {isSectionVisible(pkg, 'overview') && (
                      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600">
                        {t(pkg.short_description || 'A guided itinerary with local hosts, private transfers and time to explore.')}
                      </p>
                    )}

                    {isSectionVisible(pkg, 'departures') && departure && (
                      <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[#0f3d2e]">
                        <CalendarDays className="h-3.5 w-3.5 text-[#c9a24b]" /> {t('Next departure')} {departure}
                      </p>
                    )}

                    {isSectionVisible(pkg, 'highlights') && Array.isArray(pkg.highlights) && pkg.highlights.length > 0 && (
                      <ul className="mt-4 space-y-2 border-t border-[#0f3d2e]/10 pt-4">
                        {pkg.highlights.slice(0, 3).map((h, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-xs text-slate-700">
                            <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-[#0f3d2e] text-[#e6c877]"><Check className="h-2.5 w-2.5" strokeWidth={3} /></span>
                            <span className="line-clamp-1">{h}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="mt-auto flex items-end justify-between gap-3 pt-6">
                      <div>
                        <span className="block text-xs text-slate-500">
                          {t(!isSectionVisible(pkg, 'pricing') || onRequest ? 'Pricing' : pkg.price_display_mode === 'starting_from' ? 'From' : 'Price')}
                        </span>
                        <span className="text-2xl font-bold text-[#0a2a20]" style={display}>
                          {isSectionVisible(pkg, 'pricing') ? formatPrice(pkg, locale, t) : t('Request a quote')}
                        </span>
                        {isSectionVisible(pkg, 'pricing') && !onRequest && pkg.starting_price ? <span className="text-xs text-slate-500"> / {t('traveler')}</span> : null}
                      </div>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0f3d2e] px-5 py-2.5 text-sm font-semibold text-white transition group-hover:bg-[#c9a24b] group-hover:text-[#082a1f]">
                        {t('View trip')} <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {!loading && !error && filteredPackages.length === 0 && (
          <div className="rounded-3xl bg-white p-12 text-center ring-1 ring-[#0f3d2e]/10">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#f3f6f1] text-[#c9a24b]"><Compass className="h-7 w-7" /></span>
            <h3 className="mt-5 text-2xl text-[#0a2a20]" style={display}>{t('No packages match those filters')}</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">{t('Try a different place, raise the price limit, or clear the filters to see every trip.')}</p>
            <button onClick={resetFilters} className={`mt-6 inline-flex items-center gap-2 rounded-full bg-[#0f3d2e] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1f6b4f] ${ring}`}>{t('Clear all filters')}</button>
          </div>
        )}

        {!loading && !error && (
          <section className="relative isolate mt-16 overflow-hidden rounded-3xl bg-[#0f3d2e] p-8 text-white sm:p-12">
            <div className="absolute -right-16 -top-16 -z-10 h-64 w-64 rounded-full bg-[#c9a24b]/20 blur-3xl" />
            <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
              <div>
                <h2 className="max-w-xl text-3xl sm:text-4xl" style={display}>{t('Don’t see the trip you have in mind?')}</h2>
                <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/80">{t('Tell us where, when and with whom. A planner will build a custom itinerary and send a quote within a day.')}</p>
              </div>
              <Link to="/contact" className={`inline-flex shrink-0 items-center gap-2 rounded-full bg-[#c9a24b] px-7 py-4 text-sm font-bold text-[#082a1f] transition hover:bg-[#e6c877] ${ring}`}>
                <MessageCircle className="h-4 w-4" /> {t('Request a custom trip')}
              </Link>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}