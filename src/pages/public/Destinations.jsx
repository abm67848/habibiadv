import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  MapPin, Clock, Star, ArrowRight, ArrowUpRight,
  Search, Filter, ChevronDown,
} from 'lucide-react';
import {
  DEFAULT_DESTINATIONS_CONTENT,
  fetchPublicSiteContent,
} from '@/services/publicSiteContent.js';

const display = { fontFamily: "'Fraunces', Georgia, serif" };
const body = { fontFamily: "'Manrope', system-ui, sans-serif" };
const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a24b]';

const DIFFICULTY_COLOR = {
  Easy: 'bg-emerald-100 text-emerald-800',
  Moderate: 'bg-amber-100 text-amber-800',
  Challenging: 'bg-rose-100 text-rose-800',
};

function Photo({ src, tone = 'from-[#0f3d2e] to-[#c9a24b]', alt = '', className = '', children }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${tone} ${className}`}>
      {src && !failed && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.06]"
        />
      )}
      {children}
    </div>
  );
}

export default function Destinations() {
  const { t } = useTranslation();
  const [data, setData] = useState(DEFAULT_DESTINATIONS_CONTENT);
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('All');
  const [difficulty, setDifficulty] = useState('All');

  useEffect(() => {
    document.title = 'Destinations | Explore Morocco';
    fetchPublicSiteContent()
      .then((d) => { if (d.destinations) setData(d.destinations); })
      .catch(() => {});
  }, []);

  const published = useMemo(
    () => (data.destinations || []).filter((d) => d.published !== false),
    [data.destinations],
  );

  const regions = useMemo(() => {
    const r = [...new Set(published.map((d) => d.region).filter(Boolean))];
    return ['All', ...r];
  }, [published]);

  const difficulties = useMemo(() => {
    const d = [...new Set(published.map((d) => d.difficulty).filter(Boolean))];
    return ['All', ...d];
  }, [published]);

  const filtered = useMemo(() => {
    return published.filter((d) => {
      const q = query.toLowerCase();
      const matchQ = !q || d.name.toLowerCase().includes(q) || d.tagline?.toLowerCase().includes(q) || d.region?.toLowerCase().includes(q);
      const matchR = region === 'All' || d.region === region;
      const matchD = difficulty === 'All' || d.difficulty === difficulty;
      return matchQ && matchR && matchD;
    });
  }, [published, query, region, difficulty]);

  const featured = useMemo(() => filtered.filter((d) => d.featured), [filtered]);
  const rest = useMemo(() => filtered.filter((d) => !d.featured), [filtered]);

  return (
    <main className="min-h-screen bg-[#f3f6f1] text-slate-700 antialiased" style={body}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,400&family=Manrope:wght@400;500;600;700&display=swap');`}</style>

      {/* HERO */}
      <section className="relative isolate overflow-hidden bg-[#082a1f]">
        <Photo
          src={data.hero?.image}
          tone="from-[#082a1f] to-[#1f6b4f]"
          alt="Morocco destinations"
          className="absolute inset-0 h-full w-full"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-[#082a1f]/60 via-[#082a1f]/30 to-[#082a1f]/80" />
        </Photo>

        <div className="relative mx-auto max-w-7xl px-5 py-32 text-center lg:px-8">
          {data.hero?.badge && (
            <span className="inline-block rounded-full bg-[#c9a24b]/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#e6c877]">
              {t(data.hero.badge)}
            </span>
          )}
          <h1 className="mt-6 text-4xl leading-[1.06] text-white sm:text-6xl" style={display}>
            {t(data.hero?.title || 'Discover Incredible Destinations')}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/80">
            {t(data.hero?.description || '')}
          </p>

          {/* Search + Filters */}
          <div className="mx-auto mt-10 flex max-w-3xl flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('Search destinations...')}
                className="w-full rounded-2xl border-0 bg-white py-4 pl-11 pr-4 text-sm text-slate-800 shadow-lg focus:outline-none focus:ring-2 focus:ring-[#c9a24b]"
              />
            </div>
            <div className="relative">
              <Filter className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="h-full rounded-2xl border-0 bg-white py-4 pl-11 pr-8 text-sm text-slate-700 shadow-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#c9a24b]"
              >
                {regions.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
            <div className="relative">
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="h-full rounded-2xl border-0 bg-white py-4 px-5 text-sm text-slate-700 shadow-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#c9a24b]"
              >
                {difficulties.map((d) => <option key={d} value={d}>{d === 'All' ? t('All levels') : d}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
        </div>
      </section>

      {/* RESULTS COUNT */}
      <div className="mx-auto max-w-7xl px-5 pt-10 lg:px-8">
        <p className="text-sm text-slate-500">
          {filtered.length === 0
            ? t('No destinations found. Try different filters.')
            : t('{{count}} destination(s) found', { count: filtered.length })}
        </p>
      </div>

      {/* FEATURED DESTINATIONS */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#9c7a2b]">{t('Featured Destinations')}</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((dest, i) => (
              <DestCard key={dest.id} dest={dest} big={i === 0 && featured.length > 1} t={t} />
            ))}
          </div>
        </section>
      )}

      {/* ALL OTHER DESTINATIONS */}
      {rest.length > 0 && (
        <section className="mx-auto max-w-7xl px-5 pb-24 lg:px-8">
          {featured.length > 0 && (
            <h2 className="mb-6 text-xs font-bold uppercase tracking-widest text-slate-400">{t('More Destinations')}</h2>
          )}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((dest) => (
              <DestCard key={dest.id} dest={dest} big={false} t={t} />
            ))}
          </div>
        </section>
      )}

      {/* EMPTY STATE */}
      {filtered.length === 0 && (
        <div className="mx-auto max-w-7xl px-5 py-24 text-center lg:px-8">
          <p className="text-5xl" role="img" aria-label="globe">🌍</p>
          <p className="mt-5 text-2xl text-[#0a2a20]" style={display}>{t('No Destinations Found')}</p>
          <p className="mt-2 text-sm text-slate-500">{t('Try adjusting your search or filters to discover more destinations.')}</p>
          <button
            onClick={() => { setQuery(''); setRegion('All'); setDifficulty('All'); }}
            className={`mt-6 rounded-full bg-[#0f3d2e] px-6 py-3 text-sm font-medium text-white hover:bg-[#1f6b4f] transition ${focus}`}
          >
            {t('Clear filters')}
          </button>
        </div>
      )}

      {/* CTA BANNER */}
      <section className="bg-[#0f3d2e]">
        <div className="mx-auto max-w-7xl px-5 py-20 text-center lg:px-8">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#e6c877]">{t('Plan Your Journey')}</span>
          <h2 className="mt-4 text-3xl text-white sm:text-5xl" style={display}>{t("Can't decide? We'll help you choose.")}</h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/75">
            {t('Our local planners know every corner of Morocco. Tell us your interests and we\'ll recommend the perfect destinations for your trip.')}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              to="/contact"
              className={`inline-flex items-center gap-2 rounded-full bg-[#c9a24b] px-7 py-3.5 text-sm font-semibold text-[#082a1f] transition hover:bg-[#e6c877] ${focus}`}
            >
              {t('Talk to a Planner')} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/packages"
              className={`inline-flex items-center gap-2 rounded-full border border-white/30 px-7 py-3.5 text-sm font-medium text-white transition hover:bg-white/10 ${focus}`}
            >
              {t('Browse Packages')}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function DestCard({ dest, big, t }) {
  const tones = ['from-[#0f3d2e] to-[#c9a24b]', 'from-sky-500 to-[#0f3d2e]', 'from-amber-300 to-orange-700', 'from-cyan-500 to-slate-700', 'from-rose-400 to-purple-700'];
  const tone = tones[Math.abs(dest.name.charCodeAt(0) - 65) % tones.length];
  return (
    <article className={`group flex flex-col overflow-hidden rounded-[2rem] bg-white ring-1 ring-[#0f3d2e]/10 transition duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-[#0f3d2e]/15 ${big ? 'sm:col-span-2 lg:col-span-1' : ''}`}>
      <Photo src={dest.image} tone={tone} alt={dest.name} className={big ? 'h-72' : 'h-52'}>
        <span className="absolute inset-0 bg-gradient-to-t from-[#082a1f]/70 via-transparent to-transparent" />
        {dest.featured && (
          <span className="absolute left-3 top-3 rounded-full bg-[#c9a24b] px-3 py-1 text-[11px] font-semibold text-[#082a1f]">
            {t('Featured')}
          </span>
        )}
        {dest.difficulty && (
          <span className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold ${DIFFICULTY_COLOR[dest.difficulty] || 'bg-slate-100 text-slate-700'}`}>
            {t(dest.difficulty)}
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 p-5">
          {dest.region && (
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-[#e6c877]">
              <MapPin className="h-3 w-3" /> {dest.region}
            </p>
          )}
          <h3 className="mt-1 text-2xl text-white" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>{dest.name}</h3>
          {dest.tagline && <p className="mt-0.5 text-xs italic text-white/80">{dest.tagline}</p>}
        </div>
      </Photo>

      <div className="flex flex-1 flex-col p-5">
        {dest.description && (
          <p className="line-clamp-2 text-xs leading-relaxed text-slate-500">{dest.description}</p>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          {dest.duration && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
              <Clock className="h-3 w-3" /> {dest.duration}
            </span>
          )}
          {dest.bestSeason && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#f3f6f1] px-2.5 py-1 text-[11px] font-medium text-[#0f3d2e]">
              <Star className="h-3 w-3 text-[#c9a24b]" /> {dest.bestSeason}
            </span>
          )}
        </div>

        {dest.highlights && dest.highlights.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {dest.highlights.slice(0, 3).map((h) => (
              <span key={h} className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] text-slate-500">{h}</span>
            ))}
            {dest.highlights.length > 3 && (
              <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] text-slate-400">
                +{dest.highlights.length - 3} more
              </span>
            )}
          </div>
        )}

        <div className="mt-auto pt-4">
          <Link
            to={`/packages?destination=${encodeURIComponent(dest.name)}`}
            className={`group/c flex items-center justify-between rounded-full bg-[#0f3d2e] py-2.5 pl-5 pr-2.5 text-sm font-semibold text-[#e6c877] transition hover:bg-[#c9a24b] hover:text-[#082a1f] ${focus}`}
          >
            {t('Explore Tours')}
            <span className="grid h-8 w-8 place-items-center rounded-full bg-white/15 transition group-hover/c:rotate-45">
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </Link>
        </div>
      </div>
    </article>
  );
}
