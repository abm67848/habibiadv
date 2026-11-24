import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search, Calendar, Users, MapPin, ArrowRight, ArrowUpRight, Sun, Quote,
  ChevronLeft, ChevronRight, ChevronDown, Minus, Plus, Heart, Compass,
  ShieldCheck, Headphones, Route, Leaf, Clock, ArrowUp,
  Flower2, UtensilsCrossed, Mountain, Landmark, SlidersHorizontal,
} from 'lucide-react';
import { getPublicPackages } from '@/services/packages/index.jsx';
import {
  DEFAULT_REVIEWS_CONTENT,
  DEFAULT_BLOG_CONTENT,
  DEFAULT_PARTNERSHIPS_CONTENT,
  fetchPublicSiteContent,
} from '@/services/publicSiteContent.js';
import HERO_IMG from '../../assets/hero.jpeg';
import TANGIER_IMG from '../../assets/im1.jpg';
import CHEFCHAOUEN_IMG from '../../assets/im2.jpg';
import ESSAOUIRA_IMG from '../../assets/im3.jpeg';
import MARRAKECH_IMG from '../../assets/im4.jpg';
import MERZOUGA_IMG from '../../assets/im5.jpg';

/* ------------------------------------------------------------------ */
/*  Content                                                            */
/* ------------------------------------------------------------------ */

const TRUST = [
  { icon: Compass, label: 'Local Travel Experts', text: 'Explore Morocco with people who know its culture, landscapes and hidden gems.' },
  { icon: ShieldCheck, label: 'Travel with Confidence', text: 'Enjoy carefully planned trips and reliable travel arrangements.' },
  { icon: Route, label: 'Tailor-Made Journeys', text: 'Discover itineraries designed around your interests, schedule and travel style.' },
  { icon: Headphones, label: 'Personal Travel Support', text: 'Get assistance and guidance throughout your travel planning journey.' },
];

const DESTINATIONS = [
  { name: 'Tangier', tag: 'Where Two Seas Meet', cta: 'Explore Tangier Tours', blurb: 'Discover Tangier, a captivating coastal city where Mediterranean charm meets Moroccan culture. Explore its historic medina, stroll along scenic waterfronts and experience the unique atmosphere of a city connecting Africa and Europe.', img: TANGIER_IMG, tone: 'from-[#0f3d2e] to-[#c9a24b]' },
  { name: 'Chefchaouen', tag: 'Discover Morocco’s Blue City', cta: 'Explore Chefchaouen Tours', blurb: 'Wander through the enchanting blue streets of Chefchaouen, nestled in the Rif Mountains. Discover traditional architecture, mountain scenery, local crafts and a peaceful atmosphere unlike anywhere else in Morocco.', img: CHEFCHAOUEN_IMG, tone: 'from-sky-500 to-[#0f3d2e]' },
  { name: 'Essaouira', tag: 'Coastal Charm and Moroccan Culture', cta: 'Explore Essaouira Tours', blurb: 'Experience the relaxed atmosphere of Essaouira, a coastal destination famous for its historic ramparts, charming medina, fishing harbor, fresh seafood and beautiful Atlantic coastline.', img: ESSAOUIRA_IMG, tone: 'from-cyan-500 to-slate-700' },
  { name: 'Marrakech', tag: 'The Heart of Moroccan Culture', cta: 'Explore Marrakech Tours', blurb: 'Explore Marrakech, one of Morocco’s most iconic destinations. Discover vibrant souks, traditional riads, historic palaces, beautiful gardens and the unforgettable energy of Jemaa el-Fna.', img: MARRAKECH_IMG, tone: 'from-orange-400 to-rose-700' },
  { name: 'Merzouga', tag: 'Experience the Magic of the Sahara', cta: 'Explore Sahara Desert Tours', blurb: 'Journey into the Sahara Desert in Merzouga and discover the breathtaking Erg Chebbi dunes. Enjoy unforgettable desert landscapes, traditional experiences, sunset views and nights beneath the stars.', img: MERZOUGA_IMG, tone: 'from-amber-300 to-orange-700' },
];

const WHY = [
  { icon: Leaf, title: 'Experiences Worth Discovering', text: 'We focus on memorable places, authentic experiences and thoughtfully selected accommodations to help you experience the best of Morocco, from historic cities to breathtaking natural landscapes.', img: 'https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?auto=format&fit=crop&w=1000&q=80' },
  { icon: Route, title: 'Your Journey, Your Way', text: 'Every traveler is different. Whether you want to explore Morocco’s cities, experience the Sahara Desert or discover hidden destinations, we help you plan a journey that fits your interests and travel pace.', img: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1000&q=80' },
  { icon: Clock, title: 'Stress-Free Travel Planning', text: 'From transportation and accommodations to activities and travel arrangements, we help organize the details so you can focus on discovering Morocco and enjoying your journey.', img: 'https://images.unsplash.com/photo-1539020140153-e479b8c22e70?auto=format&fit=crop&w=1000&q=80' },
  { icon: Heart, title: 'Discover Morocco Beyond the Tourist Trail', text: 'Discover Moroccan culture, local traditions, hidden corners, regional cuisine and unforgettable landscapes through experiences that bring you closer to the country and its people.', img: 'https://images.unsplash.com/photo-1553603227-2358aabe821e?auto=format&fit=crop&w=1000&q=80' },
];
const WHY_SIDE_IMG = 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80';

const EXPERIENCES = [
  { icon: Flower2, title: 'Traditional Moroccan Hammam & Spa', text: 'Relax, Rejuvenate and Unwind', img: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80', tone: 'from-rose-200 to-amber-200' },
  { icon: UtensilsCrossed, title: 'Authentic Moroccan Cooking Experiences', text: 'Discover the Flavors of Morocco', img: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=800&q=80', tone: 'from-orange-300 to-red-700' },
  { icon: Mountain, title: 'Atlas Mountains Hiking & Adventures', text: 'Explore Morocco’s Breathtaking Landscapes', img: 'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=800&q=80', tone: 'from-sky-300 to-emerald-700' },
  { icon: Landmark, title: 'Guided Moroccan Medina Tours', text: 'Discover History, Culture and Hidden Streets', img: 'https://images.unsplash.com/photo-1539020140153-e479b8c22e70?auto=format&fit=crop&w=800&q=80', tone: 'from-amber-300 to-indigo-700' },
];

// IMPORTANT: publish only genuine customer reviews. Replace these names and quotes with real ones.
const REVIEWS = [
  { name: 'Sarah Mitchell', from: 'United States', text: 'Our guide made discovering Tangier such a wonderful experience. We explored places we would never have found on our own, and every moment felt authentic and memorable.' },
  { name: 'Youssef El Idrissi', from: 'Casablanca', text: 'Everything was so easy to organize. From transportation to our experiences, everything was planned with care. We had an amazing time and can’t wait to return to Morocco.' },
  { name: 'Claire Dubois', from: 'France', text: 'Essaouira was absolutely beautiful. The experience was peaceful, comfortable and thoughtfully organized. It was exactly the kind of trip we wanted.' },
];

const POSTS = [
  { date: 'Oct 28, 2026', title: 'The Ultimate Tangier Travel Guide: What to See, Do and Explore', cta: 'Read the Tangier Travel Guide', img: 'https://images.unsplash.com/photo-1539020140153-e479b8c22e70?auto=format&fit=crop&w=1000&q=80', tone: 'from-[#0f3d2e] to-[#c9a24b]', read: '6 min' },
  { date: 'Oct 14, 2026', title: 'Discover the Atlas Mountains: A Guide to Exploring Morocco by Road', cta: 'Explore the Atlas Mountains Guide', img: 'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=800&q=80', tone: 'from-sky-300 to-emerald-700', read: '8 min' },
  { date: 'Sep 30, 2026', title: 'What to Pack for a Sahara Desert Trip in Morocco', cta: 'Read Our Sahara Travel Tips', img: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80', tone: 'from-amber-300 to-orange-700', read: '4 min' },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const SITE_NAME = 'Explore Morocco'; // change to your brand name
const SEO_TITLE = 'Morocco Tours & Travel Packages | Explore Morocco';
const SEO_DESC = 'Discover Morocco with unforgettable tours and travel packages. Explore Marrakech, Chefchaouen, Tangier and the Sahara Desert with personalized travel experiences.';
const SEARCH_TABS = [
  { id: 'all', label: 'All Tours', icon: Compass },
  { id: 'cultural', label: 'Cultural Tours', icon: Landmark },
  { id: 'desert', label: 'Desert Tours', icon: Sun },
  { id: 'adventure', label: 'Adventure Tours', icon: Mountain },
  { id: 'private', label: 'Private Tours', icon: Users },
];
const PACKAGE_FILTERS = [
  { id: 'all', label: 'All Trips' },
  { id: 'cultural', label: 'Cultural Tours' },
  { id: 'adventure', label: 'Adventure Tours' },
  { id: 'desert', label: 'Desert Tours' },
  { id: 'private', label: 'Private Tours' },
];
// A package matches a tab when its category (or title) contains the tab keyword.
const matchCategory = (pkg, id) => id === 'all' || `${pkg.package_category || ''} ${pkg.public_title || pkg.internal_title || ''}`.toLowerCase().includes(id);
const display = { fontFamily: "'Fraunces', Georgia, serif" };

// Eight-point zellige star, used as a quiet texture on the dark green sections.
const ZELLIGE = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='72' height='72' viewBox='0 0 64 64'%3E%3Cpath d='M32 4l6 14 14-6-6 14 14 6-14 6 6 14-14-6-6 14-6-14-14 6 6-14-14-6 14-6-6-14 14 6z' fill='none' stroke='%23e6c877' stroke-opacity='.13'/%3E%3C/svg%3E")`,
};

function formatPrice(pkg, locale, t) {
  if (!pkg.starting_price) return t('Contact us');
  const currency = pkg.default_currency || 'MAD';
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(pkg.starting_price));
  } catch {
    return `${currency} ${Number(pkg.starting_price).toLocaleString(locale)}`;
  }
}

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

const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseISO = (v) => (v ? new Date(`${v}T00:00:00`) : null);
const PANEL = 'pop rounded-3xl bg-white p-5 shadow-2xl shadow-[#082a1f]/30 ring-1 ring-[#0f3d2e]/10';

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

function IconBadge({ open, children }) {
  return (
    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full transition duration-300 ${open ? 'bg-[#0f3d2e] text-[#e6c877] shadow-md shadow-[#0f3d2e]/30' : 'bg-[#0f3d2e]/5 text-[#9c7a2b] group-hover/f:bg-[#0f3d2e]/10'}`}>{children}</span>
  );
}

const fieldBase = 'group/f flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition hover:bg-[#f3f6f1]/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#c9a24b]';

function PopField({ icon: Icon, label, value, placeholder, className = '', panelClass = '', children }) {
  const [ref, open, setOpen] = usePopover();
  return (
    <div ref={ref} className={`relative flex-1 ${className}`}>
      <button type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={`${fieldBase} ${open ? 'bg-[#f3f6f1] ring-2 ring-[#c9a24b]/60' : ''}`}>
        <IconBadge open={open}><Icon className="h-4 w-4" /></IconBadge>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-semibold text-slate-500">{label}</span>
          <span className={`block truncate text-sm ${value ? 'font-medium text-slate-800' : 'text-slate-400'}`}>{value || placeholder}</span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition duration-300 ${open ? 'rotate-180 text-[#9c7a2b]' : ''}`} />
      </button>
      {open && <div role="dialog" className={`absolute top-full z-50 mt-3 ${panelClass}`}>{children(() => setOpen(false))}</div>}
    </div>
  );
}

function DestField({ label, placeholder, value, onChange, className = '' }) {
  const { t } = useTranslation();
  const [ref, open, setOpen] = usePopover();
  const q = value.trim().toLowerCase();
  const list = DESTINATIONS.filter((d) => !q || d.name.toLowerCase().includes(q));
  return (
    <div ref={ref} className={`relative flex-1 ${className}`}>
      <label className={`${fieldBase} cursor-text ${open ? 'bg-[#f3f6f1] ring-2 ring-[#c9a24b]/60' : ''}`}>
        <IconBadge open={open}><MapPin className="h-4 w-4" /></IconBadge>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-semibold text-slate-500">{label}</span>
          <input
            value={value}
            onChange={(e) => { onChange(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            role="combobox"
            aria-expanded={open}
            autoComplete="off"
            className="w-full bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-400"
          />
        </span>
      </label>
      {open && (
        <div className={`absolute left-0 top-full z-50 mt-3 w-full min-w-[20rem] md:w-[22rem] ${PANEL} !p-2`}>
          <p className="px-3 pb-1 pt-2 text-xs font-semibold text-slate-500">{t('Popular destinations')}</p>
          {list.length === 0 && <p className="px-3 py-4 text-sm text-slate-500">{t('No match. We’ll search all trips.')}</p>}
          {list.map((d) => (
            <button key={d.name} type="button" onClick={() => { onChange(d.name); setOpen(false); }} className="group flex w-full items-center gap-3 rounded-2xl p-2 text-left transition hover:bg-[#f3f6f1] focus-visible:bg-[#f3f6f1] focus-visible:outline-none">
              <Photo src={d.img} tone={d.tone} alt="" className="h-12 w-12 shrink-0 rounded-xl" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-[#0a2a20]">{t(d.name)}</span>
                <span className="block truncate text-xs text-slate-500">{t(d.tag)}</span>
              </span>
              <ArrowUpRight className="ml-auto h-4 w-4 text-slate-300 transition group-hover:text-[#9c7a2b]" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MonthGrid({ year, month, start, end, hover, today, locale, onPick, onHover }) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const count = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(offset).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)];
  const title = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(first);
  const days = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).format(new Date(2024, 0, 1 + i)));
  const rangeEnd = end || (start && hover > start ? hover : '');
  return (
    <div className="min-w-0 flex-1">
      <p className="mb-3 text-center text-lg capitalize text-[#0a2a20]" style={display}>{title}</p>
      <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-slate-400">{days.map((d, i) => <span key={i} className="py-1">{d}</span>)}</div>
      <div className="grid grid-cols-7">
        {cells.map((d, i) => {
          if (!d) return <span key={i} />;
          const v = iso(new Date(year, month, d));
          const isStart = v === start;
          const isEnd = v === rangeEnd;
          const inRange = start && rangeEnd && v > start && v < rangeEnd;
          const band = inRange ? 'bg-[#c9a24b]/15' : isStart && rangeEnd ? 'bg-gradient-to-r from-transparent from-50% to-[#c9a24b]/15 to-50%' : isEnd && start ? 'bg-gradient-to-l from-transparent from-50% to-[#c9a24b]/15 to-50%' : '';
          return (
            <span key={i} className={`flex justify-center ${band}`}>
              <button
                type="button"
                disabled={v < today}
                onClick={() => onPick(v)}
                onMouseEnter={() => onHover(v)}
                aria-label={new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(new Date(year, month, d))}
                aria-pressed={isStart || v === end}
                className={`h-10 w-10 rounded-full text-sm tabular-nums transition ${isStart || v === end ? 'bg-[#0f3d2e] font-semibold text-white shadow-md shadow-[#0f3d2e]/30' : v < today ? 'text-slate-300' : `text-slate-700 hover:bg-[#0f3d2e]/10 ${v === today ? 'ring-1 ring-[#c9a24b]' : ''}`} focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#c9a24b]`}
              >{d}</button>
            </span>
          );
        })}
      </div>
    </div>
  );
}

function RangeCalendar({ start, end, nights, locale, onPick, onClear }) {
  const { t } = useTranslation();
  const today = iso(new Date());
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const [view, setView] = useState(() => { const b = parseISO(start) || now; return new Date(b.getFullYear(), b.getMonth(), 1); });
  const [hover, setHover] = useState('');
  const next = new Date(view.getFullYear(), view.getMonth() + 1, 1);
  const nav = 'absolute top-0 grid h-9 w-9 place-items-center rounded-full text-[#0f3d2e] ring-1 ring-[#0f3d2e]/15 transition hover:bg-[#0f3d2e] hover:text-[#e6c877] disabled:pointer-events-none disabled:opacity-30';
  return (
    <div className={PANEL} onMouseLeave={() => setHover('')}>
      <div className="relative">
        <button type="button" aria-label={t('Previous month')} disabled={view <= thisMonth} onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))} className={`${nav} left-0`}><ChevronLeft className="h-4 w-4" /></button>
        <button type="button" aria-label={t('Next month')} onClick={() => setView(next)} className={`${nav} right-0`}><ChevronRight className="h-4 w-4" /></button>
        <div className="flex gap-8 px-11 sm:px-12">
          <MonthGrid year={view.getFullYear()} month={view.getMonth()} start={start} end={end} hover={hover} today={today} locale={locale} onPick={onPick} onHover={setHover} />
          <div className="hidden min-w-0 flex-1 sm:block">
            <MonthGrid year={next.getFullYear()} month={next.getMonth()} start={start} end={end} hover={hover} today={today} locale={locale} onPick={onPick} onHover={setHover} />
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-dashed border-[#0f3d2e]/15 pt-4 text-sm">
        <p className="text-slate-600" role="status">
          {end ? <span className="font-semibold text-[#0a2a20]">{nights} {t(nights === 1 ? 'night' : 'nights')}</span> : start ? t('Now pick your check-out date') : t('Pick your check-in date')}
        </p>
        <button type="button" onClick={onClear} disabled={!start} className="font-medium text-[#9c7a2b] underline underline-offset-4 disabled:opacity-40">{t('Clear dates')}</button>
      </div>
    </div>
  );
}

function GuestPicker({ value, onChange, onDone }) {
  const { t } = useTranslation();
  const n = Number(value);
  const round = 'grid h-11 w-11 place-items-center rounded-full ring-1 ring-[#0f3d2e]/20 text-[#0f3d2e] transition hover:bg-[#0f3d2e] hover:text-[#e6c877] disabled:pointer-events-none disabled:opacity-30';
  return (
    <div className={PANEL}>
      <div className="flex items-center justify-between gap-6">
        <div>
          <p className="text-sm font-semibold text-[#0a2a20]">{t('Travellers')}</p>
          <p className="text-xs text-slate-500">{t('How many people are travelling?')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" aria-label={t('Fewer travellers')} disabled={n <= 1} onClick={() => onChange(n - 1)} className={round}><Minus className="h-4 w-4" /></button>
          <span className="w-8 text-center text-2xl tabular-nums text-[#0a2a20]" style={display} aria-live="polite">{n}</span>
          <button type="button" aria-label={t('More travellers')} disabled={n >= 12} onClick={() => onChange(n + 1)} className={round}><Plus className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {[1, 2, 4, 6, 8].map((c) => (
          <button key={c} type="button" onClick={() => onChange(c)} className={`rounded-full px-4 py-1.5 text-sm transition ${n === c ? 'bg-[#0f3d2e] text-white' : 'bg-[#f3f6f1] text-slate-600 hover:ring-1 hover:ring-[#c9a24b]'}`}>{c}</button>
        ))}
      </div>
      <button type="button" onClick={onDone} className="mt-5 w-full rounded-full bg-[#c9a24b] py-3 text-sm font-semibold text-[#082a1f] transition hover:bg-[#e6c877]">{t('Done')}</button>
    </div>
  );
}

function SectionHead({ title, text, action, to, light = false }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
      <div className="max-w-2xl">
        <h2 className={`text-3xl leading-[1.1] sm:text-5xl ${light ? 'text-white' : 'text-[#0a2a20]'}`} style={display}>{t(title)}</h2>
        {text && <p className={`mt-4 text-sm leading-relaxed ${light ? 'text-white/75' : 'text-slate-600'}`}>{t(text)}</p>}
      </div>
      {action && (
        <Link to={to} className="group inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-[#0f3d2e] ring-1 ring-[#0f3d2e]/10 transition hover:bg-[#0f3d2e] hover:text-white">
          {t(action)} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function Home() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === 'fr' ? 'fr-FR' : i18n.resolvedLanguage === 'es' ? 'es-ES' : i18n.resolvedLanguage === 'pl' ? 'pl-PL' : 'en-US';
  const [packages, setPackages] = useState([]);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [packagesError, setPackagesError] = useState('');
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState({ destination: '', checkIn: '', checkOut: '', guests: 2 });
  const [applied, setApplied] = useState(null);
  const [sort, setSort] = useState('featured');
  const [saved, setSaved] = useState(() => new Set());
  const [reviewsData, setReviewsData] = useState(DEFAULT_REVIEWS_CONTENT);
  const [blogData, setBlogData] = useState(DEFAULT_BLOG_CONTENT);
  const [partnershipsData, setPartnershipsData] = useState(DEFAULT_PARTNERSHIPS_CONTENT);
  const [review, setReview] = useState(0);
  const [paused, setPaused] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const [parallax, setParallax] = useState(0);
  const [dest, setDest] = useState(0);
  const [why, setWhy] = useState(0);
  const [whyPaused, setWhyPaused] = useState(false);
  const raf = useRef(0);

  useEffect(() => {
    const handleAdminShortcut = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        navigate('/auth/admin-login');
      }
    };
    window.addEventListener('keydown', handleAdminShortcut);
    return () => window.removeEventListener('keydown', handleAdminShortcut);
  }, [navigate]);

  const loadPackages = useCallback(async () => {
    setPackagesLoading(true);
    setPackagesError('');
    try {
      const data = await getPublicPackages();
      setPackages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading featured packages:', error);
      setPackagesError('We couldn’t load the travel packages. Check your connection and try again.');
    } finally {
      setPackagesLoading(false);
    }
  }, []);

  useEffect(() => { loadPackages(); }, [loadPackages]);

  // SEO: title, meta description, canonical and TravelAgency structured data.
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
    ensure('link[rel="canonical"]', 'link', { rel: 'canonical' }).setAttribute('href', `${origin}/`);
    ensure('#ld-travel-agency', 'script', { id: 'ld-travel-agency', type: 'application/ld+json' }).textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'TravelAgency',
      name: SITE_NAME,
      url: `${origin}/`,
      description: t(SEO_DESC),
      areaServed: { '@type': 'Country', name: 'Morocco' },
    });
  }, [t, i18n.resolvedLanguage]);

  useEffect(() => {
    const onScroll = () => {
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => {
        setShowTop(window.scrollY > 700);
        setParallax(Math.min(window.scrollY, 1000));
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  useEffect(() => {
    let active = true;
    fetchPublicSiteContent()
      .then((data) => {
        if (!active) return;
        if (data.homeReviews) setReviewsData(data.homeReviews);
        if (data.blog) setBlogData(data.blog);
        if (data.partnerships) setPartnershipsData(data.partnerships);
      })
      .catch((err) => console.error('Could not load public home content:', err));
    return () => { active = false; };
  }, []);

  const activeReviews = useMemo(() => {
    return reviewsData.items && reviewsData.items.length > 0
      ? reviewsData.items
      : DEFAULT_REVIEWS_CONTENT.items;
  }, [reviewsData.items]);

  useEffect(() => {
    if (paused || !activeReviews.length) return undefined;
    const id = setInterval(() => setReview((r) => (r + 1) % activeReviews.length), 7000);
    return () => clearInterval(id);
  }, [paused, activeReviews.length]);

  const setField = (k, v) => setSearch((s) => ({ ...s, [k]: v }));
  const fmt = useMemo(() => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }), [locale]);
  const nights = search.checkIn && search.checkOut ? Math.round((parseISO(search.checkOut) - parseISO(search.checkIn)) / 86400000) : 0;
  const dateLabel = search.checkIn
    ? `${fmt.format(parseISO(search.checkIn))} – ${search.checkOut ? `${fmt.format(parseISO(search.checkOut))} (${nights} ${t(nights === 1 ? 'night' : 'nights')})` : '…'}`
    : '';
  const pickDate = (day, close) => {
    const { checkIn, checkOut } = search;
    if (!checkIn || checkOut || day < checkIn) setSearch((s) => ({ ...s, checkIn: day, checkOut: '' }));
    else if (day !== checkIn) { setSearch((s) => ({ ...s, checkOut: day })); close(); }
  };
  const goPackages = () => document.getElementById('packages')?.scrollIntoView({ behavior: 'smooth' });

  const exploreDest = (name) => {
    setSearch((s) => ({ ...s, destination: name }));
    setApplied({ ...search, destination: name, type: 'all' });
    setTab('all');
    goPackages();
  };

  const onSearch = (e) => {
    e.preventDefault();
    setApplied({ ...search, type: tab });
    goPackages();
  };

  const clearSearch = () => {
    setApplied(null);
    setTab('all');
    setSearch({ destination: '', checkIn: '', checkOut: '', guests: 2 });
  };

  const results = useMemo(() => {
    let list = packages.filter((pkg) => {
      if (!applied) return true;
      const q = applied.destination.trim().toLowerCase();
      const title = pkg.public_title || pkg.internal_title || '';
      const country = pkg.destination_country || '';
      const okCategory = matchCategory(pkg, applied.type);
      const okPlace = !q || country.toLowerCase().includes(q) || title.toLowerCase().includes(q);
      const okGuests = !pkg.max_travelers || Number(pkg.max_travelers) >= Number(applied.guests);
      return okCategory && okPlace && okGuests;
    });
    if (sort === 'low') list = [...list].sort((a, b) => Number(a.starting_price || 0) - Number(b.starting_price || 0));
    if (sort === 'high') list = [...list].sort((a, b) => Number(b.starting_price || 0) - Number(a.starting_price || 0));
    return list;
  }, [applied, packages, sort]);

  const toggleSave = (id) =>
    setSaved((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const r = activeReviews[review] || activeReviews[0] || {};
  const p = Math.min(parallax / 700, 1); // hero scroll progress, 0 to 1
  const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a24b]';

  return (
    <main className="min-h-screen bg-[#f3f6f1] text-slate-700 antialiased" style={{ fontFamily: "'Manrope', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=Manrope:wght@400;500;600;700&display=swap');
        @keyframes drift{from{transform:scale(1.02)}to{transform:scale(1.1)}}
        @keyframes rise{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:none}}
        @keyframes arch{from{clip-path:inset(100% 0 0 0)}to{clip-path:inset(0 0 0 0)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes lineUp{from{transform:translateY(112%)}to{transform:none}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes grow{from{transform:scaleX(0)}to{transform:scaleX(1)}}
        @keyframes cue{0%{transform:scaleY(0);transform-origin:top}45%{transform:scaleY(1);transform-origin:top}55%{transform:scaleY(1);transform-origin:bottom}100%{transform:scaleY(0);transform-origin:bottom}}
        @keyframes pop{from{opacity:0;transform:translateY(-8px) scale(.98)}to{opacity:1;transform:none}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes bar{from{width:0}to{width:100%}}
        .pop{animation:pop .22s cubic-bezier(.2,.8,.2,1)}
        .line{display:block;animation:lineUp 1.2s cubic-bezier(.2,.8,.2,1) both}
        .rise{opacity:0;animation:rise .8s cubic-bezier(.2,.7,.2,1) forwards}
        .arch-in{animation:arch 1.3s cubic-bezier(.7,0,.2,1) .15s both}
        @media (prefers-reduced-motion: reduce){*{animation:none!important;transition:none!important}.rise{opacity:1}}
      `}</style>

      {/* HERO: full-bleed photograph, heritage frame, scroll-linked depth */}
      <section id="home" className="relative isolate min-h-[100svh] overflow-hidden bg-[#082a1f]">
        <div className="absolute inset-0 -z-20 will-change-transform" style={{ transform: `translate3d(0, ${parallax * 0.35}px, 0) scale(${1 + p * 0.16})` }}>
          <div className="absolute inset-0 bg-gradient-to-br from-[#082a1f] via-[#1f6b4f] to-[#c9a24b]" />
          <img
            src={HERO_IMG}
            alt={t('Street in a Moroccan medina, Morocco tours and travel')}
            onError={(e) => (e.currentTarget.style.display = 'none')}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ animation: 'drift 30s ease-in-out infinite alternate' }}
          />
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#082a1f]/70 via-[#082a1f]/25 to-[#082a1f]/85" />
        <div className="absolute inset-0 -z-10 bg-[#082a1f]" style={{ opacity: p * 0.7 }} />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-48 bg-gradient-to-t from-[#f3f6f1] to-transparent" />

        {/* heritage double frame */}
        <div className="pointer-events-none absolute inset-4 border border-[#e6c877]/45 sm:inset-8" style={{ opacity: 1 - p, transform: `scale(${1 - p * 0.04})`, animation: 'fadeIn 1.6s ease .3s both' }} aria-hidden="true" />
        <div className="pointer-events-none absolute inset-6 border border-[#e6c877]/15 sm:inset-11" style={{ opacity: 1 - p }} aria-hidden="true" />

        <p className="absolute left-12 top-1/2 hidden -translate-y-1/2 text-xs tracking-[0.35em] text-white/70 [writing-mode:vertical-rl] rotate-180 xl:block" style={{ opacity: 1 - p * 1.6 }}>{t('Morocco tours & travel packages')}</p>
        <p className="absolute right-12 top-1/2 hidden -translate-y-1/2 text-xs tracking-[0.35em] text-white/70 [writing-mode:vertical-rl] xl:block" style={{ opacity: 1 - p * 1.6 }}>{t('Marrakech, Chefchaouen, Sahara Desert')}</p>

        <div className="relative flex min-h-[100svh] flex-col items-center justify-center px-6 pb-44 pt-32 text-center" style={{ transform: `translate3d(0, ${-p * 90}px, 0)`, opacity: Math.max(0, 1 - p * 1.4) }}>
          <div className="flex items-center gap-4 text-[#e6c877]" style={{ animation: 'fadeIn 1.2s ease .2s both' }}>
            <span className="hidden h-px w-14 origin-right bg-[#e6c877]/70 sm:block" style={{ animation: 'grow 1.2s ease .4s both' }} />
            <svg viewBox="0 0 64 64" className="h-6 w-6 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M32 4l6 14 14-6-6 14 14 6-14 6 6 14-14-6-6 14-6-14-14 6 6-14-14-6 14-6-6-14 14 6z" /></svg>
            <p className="text-sm">{t('Discover Morocco with Local Experts')}</p>
            <span className="hidden h-px w-14 origin-left bg-[#e6c877]/70 sm:block" style={{ animation: 'grow 1.2s ease .4s both' }} />
          </div>

          <h1 className="mt-8 max-w-5xl text-4xl leading-[1.05] tracking-tight text-white sm:text-6xl xl:text-7xl" style={display}>
            <span className="block overflow-hidden pb-2"><span className="line" style={{ animationDelay: '.45s' }}>{t('Explore Morocco Your Way')}</span></span>
            <span className="sr-only"> — </span>
            <span className="block overflow-hidden pb-3"><span className="line italic text-[#e6c877]" style={{ animationDelay: '.65s' }}>{t('Unforgettable Journeys, Made for You')}</span></span>
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/85" style={{ animation: 'fadeIn 1.4s ease 1.2s both' }}>
            {t('Discover the magic of Morocco with expertly crafted travel packages, authentic local experiences and personalized itineraries. From the vibrant streets of Marrakech and the blue alleys of Chefchaouen to the golden dunes of the Sahara Desert, experience Morocco beyond the ordinary.')}
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-5" style={{ animation: 'fadeIn 1.4s ease 1.4s both' }}>
            <a href="#packages" className={`group inline-flex items-center gap-2 rounded-full bg-[#c9a24b] py-3.5 pl-7 pr-3.5 text-sm font-semibold text-[#082a1f] transition hover:bg-[#e6c877] ${focus}`}>
              {t('Explore Our Morocco Tours')}
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#082a1f] text-[#e6c877] transition group-hover:rotate-45"><ArrowRight className="h-4 w-4" /></span>
            </a>
            <a href="#about" className={`group inline-flex items-center gap-3 rounded-full text-sm font-medium text-white ${focus}`}>
              <span className="grid h-12 w-12 place-items-center rounded-full bg-white/10 ring-1 ring-white/40 backdrop-blur transition group-hover:scale-110 group-hover:bg-white/20"><ChevronDown className="h-4 w-4" /></span>
              {t('Discover Our Story')}
            </a>
          </div>
        </div>

        <a href="#destinations" aria-label={t('Scroll down')} className="absolute bottom-44 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-3 text-xs text-white/70 sm:flex" style={{ opacity: 1 - p * 3 }}>
          {t('Scroll')}
          <span className="block h-12 w-px bg-[#e6c877]" style={{ animation: 'cue 2.4s ease-in-out infinite' }} />
        </a>
      </section>

      {/* SEARCH PANEL */}
      <section className="relative z-10 mx-auto -mt-36 max-w-6xl px-5 lg:-mt-40 lg:px-8">
        <form onSubmit={onSearch} className="rounded-[2rem] bg-white p-3 shadow-2xl shadow-[#082a1f]/30 ring-1 ring-[#0f3d2e]/5">
          <div className="no-scrollbar flex gap-1 overflow-x-auto px-2 pt-1" role="tablist" aria-label={t('What are you looking for')}>
            {SEARCH_TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${focus} ${tab === id ? 'bg-[#0f3d2e] text-white shadow-md shadow-[#0f3d2e]/30' : 'text-slate-600 hover:bg-[#f3f6f1]'}`}
              >
                <Icon className={`h-4 w-4 ${tab === id ? 'text-[#e6c877]' : ''}`} /> {t(label)}
              </button>
            ))}
          </div>
          <div className="mt-2 flex flex-col gap-1 md:flex-row md:items-center md:divide-x md:divide-slate-100">
            <DestField label={t('Destination')} placeholder={t('Where do you want to explore?')} value={search.destination} onChange={(v) => setField('destination', v)} className="md:flex-[1.3]" />
            <PopField icon={Calendar} label={t('Travel dates')} value={dateLabel} placeholder={t('Select your travel dates')} className="md:flex-[1.5]" panelClass="left-0 w-full md:left-1/2 md:w-[40rem] md:-translate-x-1/2">
              {(close) => (
                <RangeCalendar start={search.checkIn} end={search.checkOut} nights={nights} locale={locale} onPick={(d) => pickDate(d, close)} onClear={() => setSearch((x) => ({ ...x, checkIn: '', checkOut: '' }))} />
              )}
            </PopField>
            <PopField icon={Users} label={t('Travellers')} value={`${search.guests} ${t(Number(search.guests) === 1 ? 'traveller' : 'travellers')}`} panelClass="left-0 w-full sm:w-80 md:left-auto md:right-0">
              {(close) => <GuestPicker value={search.guests} onChange={(n) => setField('guests', n)} onDone={close} />}
            </PopField>
            <button className={`ml-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-[#0f3d2e] to-[#1f6b4f] px-6 py-4 text-sm font-semibold whitespace-nowrap text-white shadow-lg shadow-[#0f3d2e]/30 transition hover:brightness-110 ${focus}`}>
              <Search className="h-4 w-4" /> {t('Find Your Perfect Trip')}
            </button>
          </div>
        </form>

        <ul className="mt-8 grid grid-cols-2 gap-5 lg:grid-cols-4">
          {TRUST.map(({ icon: Icon, label, text }) => (
            <li key={label} className="flex items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#0f3d2e] text-[#e6c877] shadow-md shadow-[#0f3d2e]/20"><Icon className="h-5 w-5" strokeWidth={1.6} /></span>
              <span>
                <span className="block text-sm font-semibold text-[#0a2a20]">{t(label)}</span>
                <span className="block text-xs text-slate-500">{t(text)}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* DESTINATIONS: expanding gallery */}
      <section id="destinations" className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
        <SectionHead title="Discover the Best Destinations in Morocco" text="From historic imperial cities and breathtaking mountain landscapes to peaceful coastal towns and the Sahara Desert, discover the destinations that make Morocco unforgettable. Explore our Morocco tours and find the perfect place to begin your journey." action="All destinations" to="/destinations" />
        <div className="mt-10 flex h-[760px] flex-col gap-3 lg:h-[580px] lg:flex-row">
          {DESTINATIONS.map((d, i) => {
            const on = i === dest;
            return (
              <article key={d.name} onMouseEnter={() => setDest(i)} className={`group relative isolate min-h-[4.5rem] overflow-hidden rounded-[2rem] transition-[flex] duration-700 ease-[cubic-bezier(.7,0,.2,1)] ${on ? 'flex-[6]' : 'flex-1'} ${i === 0 ? 'lg:rounded-t-[999px]' : ''}`}>
                <div className="absolute inset-0 -z-10"><Photo src={d.img} tone={d.tone} alt={t('{{name}}, Morocco', { name: d.name })} className="h-full w-full" /></div>
                <div className={`absolute inset-0 transition duration-700 ${on ? 'bg-gradient-to-t from-[#082a1f]/90 via-[#082a1f]/10 to-transparent' : 'bg-[#082a1f]/55 hover:bg-[#082a1f]/35'}`} />
                {!on && <button type="button" onClick={() => setDest(i)} aria-label={t(d.cta)} className={`absolute inset-0 z-10 ${focus}`} />}
                <span aria-hidden="true" className={`pointer-events-none absolute bottom-4 left-5 text-xl text-white transition duration-500 lg:bottom-7 lg:left-1/2 lg:-translate-x-1/2 lg:rotate-180 lg:text-2xl lg:[writing-mode:vertical-rl] ${on ? 'opacity-0' : 'opacity-100 delay-300'}`} style={display}>{t(d.name)}</span>
                <div aria-hidden={!on} className={`absolute inset-x-0 bottom-0 flex flex-col items-start gap-3 p-6 transition duration-700 lg:p-10 ${on ? 'translate-y-0 opacity-100 delay-300' : 'pointer-events-none translate-y-6 opacity-0'}`}>
                  <p className="text-sm italic text-[#e6c877]">{t(d.tag)}</p>
                  <h3 className="text-5xl text-white sm:text-6xl" style={display}>{t(d.name)}</h3>
                  <p className="max-w-md text-sm leading-relaxed text-white/85">{t(d.blurb)}</p>
                  <button type="button" tabIndex={on ? 0 : -1} onClick={() => exploreDest(d.name)} className={`group/c mt-2 inline-flex items-center gap-2 rounded-full bg-[#c9a24b] py-3 pl-6 pr-3 text-sm font-semibold text-[#082a1f] transition hover:bg-[#e6c877] ${focus}`}>
                    {t(d.cta)}
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-[#082a1f] text-[#e6c877] transition group-hover/c:rotate-45"><ArrowUpRight className="h-4 w-4" /></span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* WHY US: feature rail synced to a crossfading photo arch */}
      <section id="about" className="relative isolate overflow-hidden bg-[#0f3d2e]">
        <div className="absolute inset-0 -z-10" style={ZELLIGE} />
        <div className="absolute -right-40 top-0 -z-10 h-[32rem] w-[32rem] rounded-full bg-[#c9a24b]/10 blur-3xl" />
        <div className="mx-auto grid max-w-7xl items-center gap-20 px-5 py-24 lg:grid-cols-2 lg:px-8">
          <div>
            <h2 className="text-4xl leading-[1.08] text-white sm:text-5xl" style={display}>{t('More Than a Morocco Tour — A Journey You’ll Remember')}</h2>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-white/75">
              {t('Planning a trip to Morocco should be exciting, not overwhelming. We help you discover the best of Morocco through carefully planned journeys, authentic experiences and flexible travel itineraries designed to make every moment count.')}
            </p>
            <ul onMouseEnter={() => setWhyPaused(true)} onMouseLeave={() => setWhyPaused(false)} className="mt-10 divide-y divide-white/10 border-y border-white/10">
              {WHY.map(({ icon: Icon, title, text }, i) => {
                const on = i === why;
                return (
                  <li key={title}>
                    <button type="button" aria-expanded={on} onClick={() => setWhy(i)} className={`relative flex w-full items-start gap-4 py-5 text-left ${focus}`}>
                      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full transition duration-500 ${on ? 'bg-[#c9a24b] text-[#082a1f]' : 'bg-white/10 text-[#e6c877]'}`}><Icon className="h-5 w-5" strokeWidth={1.8} /></span>
                      <span className="min-w-0 flex-1">
                        <span className={`block text-xl transition duration-500 ${on ? 'text-white' : 'text-white/55'}`} style={display}>{t(title)}</span>
                        <span className={`grid transition-[grid-template-rows,opacity] duration-500 ${on ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                          <span className="overflow-hidden"><span className="block pt-2 text-sm leading-relaxed text-white/75">{t(text)}</span></span>
                        </span>
                      </span>
                      {on && <span key={why} onAnimationEnd={() => setWhy((w) => (w + 1) % WHY.length)} className="absolute bottom-0 left-0 h-px bg-[#e6c877]" style={{ animation: 'bar 6s linear forwards', animationPlayState: whyPaused ? 'paused' : 'running' }} />}
                    </button>
                  </li>
                );
              })}
            </ul>
            <a href="#packages" className={`mt-10 inline-flex items-center gap-2 rounded-full bg-[#c9a24b] px-6 py-3.5 text-sm font-semibold text-[#082a1f] transition hover:bg-[#e6c877] ${focus}`}>
              {t('Explore Our Travel Packages')} <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          <div className="relative mx-auto w-full max-w-md pb-8 pl-6 sm:max-w-lg sm:pl-0">
            <div className="absolute -inset-3 -translate-x-4 translate-y-4 rounded-t-[999px] rounded-b-[2.5rem] ring-1 ring-[#c9a24b]/40" aria-hidden="true" />
            <div className="relative aspect-[4/5] overflow-hidden rounded-t-[999px] rounded-b-[2.5rem] bg-[#082a1f] shadow-2xl shadow-black/40">
              {WHY.map((w, i) => (
                <div key={w.title} className={`absolute inset-0 transition-opacity duration-1000 ${i === why ? 'opacity-100' : 'opacity-0'}`}>
                  <Photo src={w.img} tone="from-[#1f6b4f] to-[#c9a24b]" alt={t(w.title)} className="h-full w-full" />
                </div>
              ))}
              <div className="absolute inset-0 bg-gradient-to-t from-[#082a1f]/70 via-transparent to-transparent" />
              <p className="absolute inset-x-0 bottom-7 text-center text-lg text-white" style={display}>{t(WHY[why].title)}</p>
            </div>

            <div className="absolute -left-2 bottom-0 h-40 w-32 overflow-hidden rounded-[1.5rem] ring-4 ring-[#0f3d2e] sm:-left-12 sm:h-48 sm:w-40">
              <Photo src={WHY_SIDE_IMG} tone="from-rose-200 to-amber-200" alt="" className="h-full w-full" />
            </div>

            <div className="absolute -left-3 top-12 grid h-28 w-28 place-items-center rounded-full bg-[#082a1f] ring-1 ring-[#c9a24b]/60 sm:-left-10" aria-hidden="true">
              <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full" style={{ animation: 'spin 24s linear infinite' }}>
                <defs><path id="why-circle" d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0" /></defs>
                <text fill="#e6c877" fontSize="11" textLength="272" lengthAdjust="spacing"><textPath href="#why-circle">{`${t('Local')} ✦ ${t('Tailor-made')} ✦ ${t('Authentic')} ✦ `}</textPath></text>
              </svg>
              <Leaf className="h-6 w-6 text-[#e6c877]" />
            </div>

            <div className="absolute -right-2 top-1/3 flex items-center gap-3 rounded-2xl bg-white p-4 shadow-xl sm:-right-8">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#0f3d2e] text-[#e6c877]"><Compass className="h-5 w-5" /></span>
              <p className="max-w-[8rem] text-xs font-semibold leading-snug text-[#0a2a20]">{t('Local Travel Experts')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* PACKAGES */}
      <section id="packages" className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
        <SectionHead title="Explore Our Morocco Travel Packages" text="Discover our carefully designed Morocco travel packages and find the perfect adventure for your next getaway. From Sahara Desert adventures and cultural city tours to private journeys and multi-day Morocco itineraries, explore unforgettable experiences tailored to your travel goals." />

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label={t('Filter packages by category')}>
            {PACKAGE_FILTERS.map(({ id, label }) => {
              const active = (applied?.type ?? 'all') === id;
              return (
                <button
                  key={id}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setApplied((a) => ({ ...(a ?? { ...search, destination: '' }), type: id }))}
                  className={`rounded-full px-4 py-2 text-sm transition ${focus} ${active ? 'bg-[#0f3d2e] text-white shadow-md shadow-[#0f3d2e]/25' : 'bg-white text-slate-600 ring-1 ring-[#0f3d2e]/10 hover:ring-[#c9a24b]'}`}
                >
                  {t(label)}
                </button>
              );
            })}
          </div>
          <label className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm text-slate-600 ring-1 ring-[#0f3d2e]/10">
            <SlidersHorizontal className="h-4 w-4 text-[#c9a24b]" />
            <span className="sr-only">{t('Sort by')}</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="bg-transparent outline-none">
              <option value="featured">{t('Featured Trips')}</option>
              <option value="low">{t('Price: Low to High')}</option>
              <option value="high">{t('Price: High to Low')}</option>
            </select>
          </label>
        </div>

        {applied && (applied.destination || applied.type !== 'all' || Number(applied.guests) > 2) && (
          <p className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-600" role="status">
            {results.length} {results.length === 1 ? 'result' : 'results'}
            {applied.destination && <> {t('for')} <strong className="text-[#0a2a20]">{t(applied.destination)}</strong></>}
            {applied.checkIn && applied.checkOut && <>, {applied.checkIn} {t('to')} {applied.checkOut}</>}
            <button onClick={clearSearch} className="font-medium text-[#9c7a2b] underline underline-offset-4">{t('Clear search')}</button>
          </p>
        )}

        {packagesLoading ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4" aria-label={t('Loading featured packages')} aria-busy="true">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="overflow-hidden rounded-[2rem] bg-white ring-1 ring-[#0f3d2e]/10">
                <div className="h-56 animate-pulse bg-[#0f3d2e]/10" />
                <div className="space-y-3 p-5">
                  <div className="h-3 w-1/3 animate-pulse rounded bg-[#0f3d2e]/10" />
                  <div className="h-5 w-3/4 animate-pulse rounded bg-[#0f3d2e]/10" />
                  <div className="h-4 w-1/2 animate-pulse rounded bg-[#0f3d2e]/10" />
                </div>
              </div>
            ))}
          </div>
        ) : packagesError ? (
          <div className="mt-10 rounded-[2rem] bg-white p-10 text-center ring-1 ring-[#0f3d2e]/10" role="alert">
            <p className="text-sm text-slate-600">{t(packagesError)}</p>
            <button onClick={loadPackages} className={`mt-5 rounded-full bg-[#0f3d2e] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1f6b4f] ${focus}`}>{t('Try again')}</button>
          </div>
        ) : packages.length === 0 ? (
          <div className="mt-10 rounded-[2rem] bg-white p-10 text-center ring-1 ring-[#0f3d2e]/10">
            <p className="text-2xl text-[#0a2a20]" style={display}>{t('No Travel Packages Available Yet')}</p>
            <p className="mt-2 text-sm text-slate-600">{t('We’re preparing new travel experiences for you. Check back soon to discover our latest Morocco tours and travel packages.')}</p>
          </div>
        ) : results.length === 0 ? (
          <div className="mt-10 rounded-[2rem] bg-white p-12 text-center ring-1 ring-[#0f3d2e]/10">
            <p className="text-2xl text-[#0a2a20]" style={display}>{t('No Trips Match Your Search')}</p>
            <p className="mt-2 text-sm text-slate-600">{t('Try another destination, adjust your travel dates or explore all our available Morocco travel packages.')}</p>
            <button onClick={clearSearch} className={`mt-5 rounded-full bg-[#0f3d2e] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1f6b4f] ${focus}`}>{t('Explore all Morocco tours')}</button>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {results.map((pkg) => {
              const title = pkg.public_title || pkg.internal_title || 'Untitled package';
              const duration = t('{{count}} Days, {{nights}} Nights', {
                count: pkg.duration_days,
                nights: pkg.duration_nights ?? Math.max(0, Number(pkg.duration_days || 1) - 1),
              });
              const groupSize = pkg.max_travelers
                ? t('Ideal for {{count}} Travelers', { count: pkg.max_travelers })
                : pkg.min_travelers
                  ? t('{{count}}+ Travelers', { count: pkg.min_travelers })
                  : t('Flexible group size');
              const isVisible = (section) => pkg.section_visibility?.[section] !== false;
              return (
                <article key={pkg.id} className="group flex flex-col overflow-hidden rounded-[2rem] bg-white ring-1 ring-[#0f3d2e]/10 transition duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-[#0f3d2e]/15">
                  <Photo src={isVisible('media') ? pkg.cover_image_url : null} tone="from-[#0f3d2e] to-[#c9a24b]" alt={t(title)} className="h-56 rounded-b-[1.5rem]">
                    <span className="absolute inset-0 bg-gradient-to-t from-[#082a1f]/60 via-transparent to-[#082a1f]/20" />
                    {isVisible('trip_facts') && pkg.package_category && <span className="absolute left-3 top-3 rounded-full bg-[#c9a24b] px-3 py-1 text-[11px] font-semibold text-[#082a1f]">{t(pkg.package_category)}</span>}
                    <button
                      onClick={() => toggleSave(pkg.id)}
                      aria-pressed={saved.has(pkg.id)}
                      aria-label={saved.has(pkg.id) ? t('Remove {{title}} from saved', { title: t(title) }) : t('Save {{title}}', { title: t(title) })}
                      className={`absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-[#0f3d2e] backdrop-blur transition hover:scale-110 ${focus}`}
                    >
                      <Heart className={`h-4 w-4 ${saved.has(pkg.id) ? 'fill-[#c9a24b] text-[#c9a24b]' : ''}`} />
                    </button>
                    {isVisible('trip_facts') && (
                      <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1 text-[11px] text-white backdrop-blur"><Clock className="h-3 w-3" />{duration}</span>
                    )}
                  </Photo>
                  <div className="flex flex-1 flex-col p-5">
                    {isVisible('trip_facts') && (
                      <p className="flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5 text-[#c9a24b]" />{t(pkg.destination_country || 'Morocco')}</p>
                    )}
                    <h3 className="mt-1.5 text-xl leading-snug text-[#0a2a20]" style={display}>
                      <Link to={`/packages/${pkg.id}`} className="hover:text-[#9c7a2b]">{t(title)}</Link>
                    </h3>
                    {isVisible('overview') && (
                      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">
                        {t(pkg.short_description || 'A thoughtfully planned trip with local experiences and handpicked stays.')}
                      </p>
                    )}
                    {isVisible('trip_facts') && (
                      <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-slate-500"><Users className="h-3.5 w-3.5" />{groupSize}</p>
                    )}
                    <div className="mt-auto border-t border-dashed border-[#0f3d2e]/15 pt-4">
                      <p>
                        <span className="block text-[11px] text-slate-500">{t(isVisible('pricing') && pkg.price_display_mode === 'starting_from' ? 'Starting From' : 'Price')}</span>
                        <span className="text-xl font-bold text-[#0a2a20]">{isVisible('pricing') ? formatPrice(pkg, locale, t) : t('Request a quote')}</span>
                        {isVisible('pricing') && pkg.starting_price ? <span className="text-xs text-slate-500"> {t('Per Traveler')}</span> : null}
                      </p>
                      <Link to={`/packages/${pkg.id}`} aria-label={`${t('Discover This Tour')}: ${t(title)}`} className={`group/c mt-4 flex items-center justify-between rounded-full bg-[#0f3d2e] py-2.5 pl-5 pr-2.5 text-sm font-semibold text-[#e6c877] transition group-hover:bg-[#c9a24b] group-hover:text-[#082a1f] ${focus}`}>
                        {t('Discover This Tour')}
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-white/15 transition group-hover/c:rotate-45"><ArrowUpRight className="h-4 w-4" /></span>
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        {saved.size > 0 && <p className="mt-6 text-sm text-slate-600" role="status">{t(saved.size === 1 ? '{{count}} trip saved' : '{{count}} trips saved', { count: saved.size })}</p>}
      </section>

      {/* EXPERIENCES */}
      <section id="experiences" className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
        <SectionHead title="Discover Authentic Moroccan Experiences" text="Morocco is more than destinations. It’s a world of traditions, flavors, landscapes and experiences waiting to be discovered. Explore the experiences that make every journey through Morocco truly memorable." action="Explore All Experiences" to="/services" />
        <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
          {EXPERIENCES.map(({ icon: Icon, title, text, img, tone }, i) => (
            <Link key={title} to="/services" className={`group block ${focus} ${i % 2 ? 'lg:mt-12' : ''}`}>
              <Photo src={img} tone={tone} alt={title} className="aspect-[3/4] rounded-t-[999px] rounded-b-[1.5rem]">
                <span className="absolute inset-0 bg-gradient-to-t from-[#082a1f]/50 to-transparent" />
                <span className="absolute inset-x-0 bottom-4 mx-auto grid h-11 w-11 place-items-center rounded-full bg-white/90 text-[#0f3d2e] shadow-lg transition group-hover:bg-[#c9a24b]"><Icon className="h-5 w-5" /></span>
              </Photo>
              <span className="mt-4 block text-center text-lg text-[#0a2a20]" style={display}>{t(title)}</span>
              <span className="block text-center text-xs text-slate-500">{t(text)}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="reviews" className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-24 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <div>
            {reviewsData.badge && (
              <span className="text-xs font-semibold uppercase tracking-widest text-[#9c7a2b]">
                {t(reviewsData.badge)}
              </span>
            )}
            <h2 className="mt-2 text-4xl leading-[1.08] text-[#0a2a20] sm:text-5xl" style={display}>
              {t(reviewsData.heading || 'Memorable Journeys. Meaningful Experiences.')}
            </h2>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-slate-600">
              {t(reviewsData.subheading || 'Every journey tells a story. Discover what travelers have to say about their experiences exploring Morocco with us.')}
            </p>
            <div className="mt-8 flex gap-2" role="tablist" aria-label={t('Reviews')}>
              {activeReviews.map((rv, i) => (
                <button
                  key={rv.id || rv.name || i}
                  role="tab"
                  aria-selected={i === review}
                  aria-label={rv.name}
                  onClick={() => setReview(i)}
                  className={`h-2 rounded-full transition-all ${i === review ? 'w-10 bg-[#c9a24b]' : 'w-2 bg-[#0f3d2e]/20 hover:bg-[#0f3d2e]/40'}`}
                />
              ))}
            </div>
          </div>
          <figure onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} className="relative isolate flex flex-col justify-between overflow-hidden rounded-[2.5rem] bg-[#0f3d2e] p-8 text-white sm:p-12">
            <div className="absolute inset-0 -z-10" style={ZELLIGE} />
            <div>
              <Quote className="h-10 w-10 text-[#c9a24b]" />
              <blockquote key={review} className="rise mt-6 text-2xl leading-snug sm:text-3xl" style={{ ...display, animationDuration: '.5s' }}>
                "{t(r.text || '')}"
              </blockquote>
            </div>
            <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
              <figcaption className="flex items-center gap-3">
                {r.avatar ? (
                  <img src={r.avatar} alt="" className="h-12 w-12 rounded-full object-cover ring-2 ring-[#c9a24b]" />
                ) : (
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-[#c9a24b] text-base font-bold text-[#082a1f]">
                    {r.name ? r.name[0] : 'T'}
                  </span>
                )}
                <span>
                  <span className="block text-sm font-semibold">{r.name}</span>
                  <span className="block text-xs text-white/70">{t(r.from || '')}</span>
                  {r.trip && <span className="block text-[11px] text-[#e6c877] mt-0.5">{t(r.trip)}</span>}
                </span>
              </figcaption>
              <div className="flex items-center gap-3">
                <span className="text-xs tabular-nums text-white/70">{review + 1} / {activeReviews.length}</span>
                <button aria-label={t('Previous review')} onClick={() => setReview((review + activeReviews.length - 1) % activeReviews.length)} className={`rounded-full p-3 ring-1 ring-white/30 transition hover:bg-white/10 ${focus}`}><ChevronLeft className="h-4 w-4" /></button>
                <button aria-label={t('Next review')} onClick={() => setReview((review + 1) % activeReviews.length)} className={`rounded-full bg-[#c9a24b] p-3 text-[#082a1f] transition hover:bg-[#e6c877] ${focus}`}><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
          </figure>
        </div>
      </section>


      {/* PARTNERSHIPS */}
      {partnershipsData.partners && partnershipsData.partners.length > 0 && (
        <section id="partnerships" className="bg-white">
          <div className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
            <div className="text-center">
              {partnershipsData.badge && (
                <span className="inline-block text-xs font-semibold uppercase tracking-widest text-[#9c7a2b]">
                  {t(partnershipsData.badge)}
                </span>
              )}
              <h2 className="mt-3 text-3xl leading-[1.1] text-[#0a2a20] sm:text-5xl" style={display}>
                {t(partnershipsData.heading || 'The Local Experts Behind Your Journey')}
              </h2>
              {partnershipsData.description && (
                <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-600">
                  {t(partnershipsData.description)}
                </p>
              )}
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {partnershipsData.partners.map((partner) => (
                <div
                  key={partner.id}
                  className="group flex flex-col items-center rounded-[2rem] bg-[#f3f6f1] p-7 text-center ring-1 ring-[#0f3d2e]/5 transition duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-[#0f3d2e]/10"
                >
                  {partner.logo ? (
                    <img src={partner.logo} alt={partner.name} className="h-14 w-14 rounded-full object-contain bg-white p-2 ring-1 ring-slate-200 shadow-sm" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  ) : (
                    <span className="grid h-14 w-14 place-items-center rounded-full bg-[#0f3d2e] text-xl font-bold text-[#e6c877]">
                      {partner.name ? partner.name[0] : 'P'}
                    </span>
                  )}
                  {partner.category && (
                    <span className="mt-4 rounded-full bg-[#0f3d2e]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#0f3d2e]">{t(partner.category)}</span>
                  )}
                  <h3 className="mt-3 text-base font-semibold text-[#0a2a20]" style={display}>{partner.name}</h3>
                  {partner.description && (
                    <p className="mt-2 text-xs leading-relaxed text-slate-500 line-clamp-3">{t(partner.description)}</p>
                  )}
                  {partner.website && (
                    <a href={partner.website} target="_blank" rel="noopener noreferrer" className={`mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-[#9c7a2b] hover:text-[#c9a24b] transition ${focus}`}>
                      {t('Visit website')} <ArrowUpRight className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
      {/* BLOG: one lead story, two supporting */}
      <section className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
        <SectionHead
          title={blogData.hero?.title || 'Morocco Travel Guides, Tips & Inspiration'}
          text={blogData.hero?.description || 'Planning your trip to Morocco? Explore our travel guides, destination recommendations, insider tips and itineraries to help you make the most of your Moroccan adventure.'}
          action="Explore All Morocco Travel Guides"
          to="/blog"
        />
        <div className="mt-10 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          {((blogData.posts && blogData.posts.filter((p) => p.published).length > 0)
            ? blogData.posts.filter((p) => p.published).slice(0, 3)
            : POSTS
          ).map((p, i) => (
            <article key={p.id || p.title || i} className={`group overflow-hidden rounded-[2rem] bg-white ring-1 ring-[#0f3d2e]/10 transition hover:shadow-xl hover:shadow-[#0f3d2e]/10 ${i === 0 ? 'lg:row-span-2' : 'sm:flex'}`}>
              <Photo src={p.coverImage || p.img} tone={p.tone || 'from-[#0f3d2e] to-[#c9a24b]'} alt={t(p.title)} className={i === 0 ? 'h-72 lg:h-[26rem]' : 'h-48 sm:h-auto sm:w-2/5 sm:shrink-0'} />
              <div className="flex flex-col justify-center p-6 lg:p-8">
                <p className="text-xs text-slate-500">{p.publishedAt || p.date}, {p.readTime || p.read || '5 min'} {t('read')}</p>
                <h3 className={`mt-2 leading-snug text-[#0a2a20] ${i === 0 ? 'text-3xl' : 'text-xl'}`} style={display}>
                  <Link to={`/blog/${p.slug || p.id || ''}`} className="hover:text-[#9c7a2b]">{t(p.title)}</Link>
                </h3>
                <Link to={`/blog/${p.slug || p.id || ''}`} className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#0f3d2e] group-hover:text-[#9c7a2b]">
                  {t('Read article')} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* BACK TO TOP */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label={t('Back to top')}
        className={`fixed bottom-6 right-6 z-40 grid h-12 w-12 place-items-center rounded-full bg-[#c9a24b] text-[#082a1f] shadow-lg transition ${focus} ${showTop ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'}`}
      >
        <ArrowUp className="h-5 w-5" />
      </button>
    </main>
  );
}