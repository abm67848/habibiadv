import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Calendar, Users, MapPin, ArrowRight, ArrowUpRight, Play, Star, Quote,
  ChevronLeft, ChevronRight, Heart, Compass,
  ShieldCheck, Headphones, Route, Sparkles, Leaf, Clock, Mail, Check, ArrowUp,
  Flower2, UtensilsCrossed, Mountain, Landmark, SlidersHorizontal,
} from 'lucide-react';
import { getPublicPackages } from '@/services/packages/index.jsx';
import HERO_IMG from '../../assets/hero.jpeg';
import TANGIER_IMG from '../../assets/im1.jpg';
import CHEFCHAOUEN_IMG from '../../assets/im2.jpg';
import ESSAOUIRA_IMG from '../../assets/im3.jpeg';
import MARRAKECH_IMG from '../../assets/im4.jpg';
import MERZOUGA_IMG from '../../assets/im5.jpg';

/* ------------------------------------------------------------------ */
/*  Content. Swap the `img` paths for photos in /public/images         */
/* ------------------------------------------------------------------ */

const TRUST = [
  { icon: Compass, label: 'Local guides', text: 'Born and raised on the routes' },
  { icon: ShieldCheck, label: 'Safe and insured', text: 'Every booking is covered' },
  { icon: Route, label: 'Custom itineraries', text: 'Built around your pace' },
  { icon: Headphones, label: 'Support 24/7', text: 'Talk to a person, any hour' },
];

const DESTINATIONS = [
  { name: 'Tangier', tag: 'Two seas, one skyline', img: TANGIER_IMG, tone: 'from-[#0f3d2e] to-[#c9a24b]', span: 'lg:col-span-2 lg:row-span-2' },
  { name: 'Chefchaouen', tag: 'The blue mountain town', img: CHEFCHAOUEN_IMG, tone: 'from-sky-500 to-[#0f3d2e]', span: '' },
  { name: 'Essaouira', tag: 'Wind, ramparts, seafood', img: ESSAOUIRA_IMG, tone: 'from-cyan-500 to-slate-700', span: '' },
  { name: 'Marrakech', tag: 'Souks and riads', img: MARRAKECH_IMG, tone: 'from-orange-400 to-rose-700', span: '' },
  { name: 'Merzouga', tag: 'Dunes at golden hour', img: MERZOUGA_IMG, tone: 'from-amber-300 to-orange-700', span: '' },
];

const WHY = [
  { icon: Leaf, title: 'Handpicked places', text: 'We visit every riad, camp and guesthouse before it goes on the site.' },
  { icon: Route, title: 'Itineraries that bend', text: 'Swap a day, add a night, skip a city. Nothing is locked in.' },
  { icon: Clock, title: 'No logistics', text: 'Transfers, tickets and tables are booked before you land.' },
  { icon: Heart, title: 'Stories worth keeping', text: 'Small groups, local hosts and time to actually look around.' },
];

const EXPERIENCES = [
  { icon: Flower2, title: 'Hammam and spa', text: 'Slow mornings', img: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80', tone: 'from-rose-200 to-amber-200' },
  { icon: UtensilsCrossed, title: 'Cooking with locals', text: 'Taste the city', img: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=800&q=80', tone: 'from-orange-300 to-red-700' },
  { icon: Mountain, title: 'Atlas treks', text: 'Higher ground', img: 'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=800&q=80', tone: 'from-sky-300 to-emerald-700' },
  { icon: Landmark, title: 'Medina walks', text: 'Back streets', img: 'https://images.unsplash.com/photo-1539020140153-e479b8c22e70?auto=format&fit=crop&w=800&q=80', tone: 'from-amber-300 to-indigo-700' },
];

const REVIEWS = [
  { name: 'Sarah Mitchell', from: 'United States', text: 'Our guide knew every alley in the Tangier medina and every café owner by name. It felt like visiting a friend, not a destination.' },
  { name: 'Youssef El Idrissi', from: 'Casablanca', text: 'Booking took two minutes. The airport transfer and a sunset dinner were arranged without us asking twice. We are already planning the next one.' },
  { name: 'Claire Dubois', from: 'France', text: 'Quiet, spotless and personal. The Essaouira villa pool at sunrise is something I will not forget.' },
];

const POSTS = [
  { date: 'Oct 28, 2026', title: 'A first-timer’s two days in Tangier', img: 'https://images.unsplash.com/photo-1539020140153-e479b8c22e70?auto=format&fit=crop&w=800&q=80', tone: 'from-[#0f3d2e] to-[#c9a24b]', read: '6 min' },
  { date: 'Oct 14, 2026', title: 'How to ride the Atlas by road without rushing', img: 'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=800&q=80', tone: 'from-sky-300 to-emerald-700', read: '8 min' },
  { date: 'Sep 30, 2026', title: 'What to pack for the Sahara in winter', img: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80', tone: 'from-amber-300 to-orange-700', read: '4 min' },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const display = { fontFamily: "'Fraunces', Georgia, serif" };

function formatPrice(pkg) {
  if (!pkg.starting_price) return 'Contact us';
  const currency = pkg.default_currency || 'MAD';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(Number(pkg.starting_price));
  } catch {
    return `${currency} ${Number(pkg.starting_price).toLocaleString('en-US')}`;
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
          className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
        />
      )}
      {children}
    </div>
  );
}

function Field({ icon: Icon, label, children, className = '' }) {
  return (
    <label className={`flex flex-1 items-center gap-3 rounded-xl px-4 py-3 transition focus-within:bg-[#f3f6f1] hover:bg-[#f3f6f1]/70 ${className}`}>
      <Icon className="h-5 w-5 shrink-0 text-[#c9a24b]" />
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold text-slate-500">{label}</span>
        {children}
      </span>
    </label>
  );
}

function SectionHead({ kicker, title, action, to }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {kicker && <p className="text-sm font-medium text-[#9c7a2b]">{kicker}</p>}
        <h2 className="mt-1 text-3xl text-[#0a2a20] sm:text-4xl" style={display}>{title}</h2>
      </div>
      {action && (
        <Link to={to} className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0f3d2e] hover:text-[#9c7a2b]">
          {action} <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

function useCountdown(target) {
  const calc = useCallback(() => Math.max(0, target - Date.now()), [target]);
  const [ms, setMs] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setMs(calc()), 1000);
    return () => clearInterval(id);
  }, [calc]);
  const s = Math.floor(ms / 1000);
  return [
    ['Days', Math.floor(s / 86400)],
    ['Hours', Math.floor((s % 86400) / 3600)],
    ['Minutes', Math.floor((s % 3600) / 60)],
    ['Seconds', s % 60],
  ];
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function Home() {
  const [packages, setPackages] = useState([]);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [packagesError, setPackagesError] = useState('');
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState({ destination: '', checkIn: '', checkOut: '', guests: 2 });
  const [applied, setApplied] = useState(null);
  const [sort, setSort] = useState('featured');
  const [saved, setSaved] = useState(() => new Set());
  const [review, setReview] = useState(0);
  const [paused, setPaused] = useState(false);
  const [email, setEmail] = useState('');
  const [mailState, setMailState] = useState('idle'); // idle | error | done
  const [showTop, setShowTop] = useState(false);
  const [parallax, setParallax] = useState(0);
  const raf = useRef(0);

  const offerEnd = useMemo(() => Date.now() + 5 * 86400000 + 12 * 3600000, []);
  const countdown = useCountdown(offerEnd);

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

  useEffect(() => {
    loadPackages();
  }, [loadPackages]);

  useEffect(() => {
    const onScroll = () => {
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => {
        setShowTop(window.scrollY > 700);
        setParallax(Math.min(window.scrollY, 600) * 0.18);
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
    if (paused) return undefined;
    const id = setInterval(() => setReview((r) => (r + 1) % REVIEWS.length), 7000);
    return () => clearInterval(id);
  }, [paused]);

  const set = (k) => (e) => setSearch((s) => ({ ...s, [k]: e.target.value }));

  const onSearch = (e) => {
    e.preventDefault();
    setApplied({ ...search, type: tab });
    document.getElementById('packages')?.scrollIntoView({ behavior: 'smooth' });
  };

  const clearSearch = () => {
    setApplied(null);
    setTab('all');
    setSearch({ destination: '', checkIn: '', checkOut: '', guests: 2 });
  };

  const packageTabs = useMemo(() => [
    { id: 'all', label: 'Everything', icon: Compass },
    ...[...new Set(packages.map((pkg) => pkg.package_category).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b))
      .map((category) => ({ id: category, label: category, icon: Compass })),
  ], [packages]);

  const results = useMemo(() => {
    let list = packages.filter((pkg) => {
      if (!applied) return true;
      const q = applied.destination.trim().toLowerCase();
      const title = pkg.public_title || pkg.internal_title || '';
      const country = pkg.destination_country || '';
      const okCategory = applied.type === 'all' || pkg.package_category === applied.type;
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

  const onSubscribe = (e) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setMailState('error');
    setMailState('done');
    setEmail('');
  };

  const r = REVIEWS[review];

  return (
    <div className="min-h-screen bg-[#f3f6f1] text-slate-700 antialiased" style={{ fontFamily: "'Manrope', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=Manrope:wght@400;500;600;700&display=swap');
        @keyframes drift{from{transform:scale(1.04)}to{transform:scale(1.12)}}
        @keyframes rise{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:none}}
        .rise{opacity:0;animation:rise .8s cubic-bezier(.2,.7,.2,1) forwards}
        @media (prefers-reduced-motion: reduce){*{animation:none!important;transition:none!important}.rise{opacity:1}}
      `}</style>

      {/* HERO */}
      <section id="home" className="relative isolate flex min-h-[92vh] items-end overflow-hidden bg-[#082a1f] pb-44 pt-40 lg:items-center lg:pb-52">
        <div className="absolute inset-0 -z-10" style={{ transform: `translateY(${parallax}px)` }}>
          <div className="absolute inset-0 bg-gradient-to-br from-[#082a1f] via-[#1f6b4f] to-[#c9a24b]" />
          <img
            src={HERO_IMG}
            alt="A street in a Moroccan medina"
            onError={(e) => (e.currentTarget.style.display = 'none')}
            className="absolute inset-0 h-[115%] w-full object-cover"
            style={{ animation: 'drift 26s ease-in-out infinite alternate' }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#082a1f]/85 via-[#082a1f]/35 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#f3f6f1] to-transparent" />
        </div>

        <div className="mx-auto w-full max-w-7xl px-5 lg:px-8">
          <p className="rise inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm text-white/90 ring-1 ring-white/25 backdrop-blur" style={{ animationDelay: '.1s' }}>
            <span className="h-1.5 w-1.5 rounded-full bg-[#e6c877]" /> Morocco, planned by people who live here
          </p>
          <h1 className="rise mt-6 max-w-3xl text-4xl leading-[1.04] text-white sm:text-6xl lg:text-7xl" style={{ ...display, animationDelay: '.25s' }}>
            Start in Tangier. <span className="block text-[#e6c877]">Go anywhere from there.</span>
          </h1>
          <p className="rise mt-6 max-w-lg text-base leading-relaxed text-white/85" style={{ animationDelay: '.45s' }}>
            Handpicked stays, local guides and itineraries you can change as you go, from the first search to the last mint tea.
          </p>
          <div className="rise mt-8 flex flex-wrap items-center gap-4" style={{ animationDelay: '.6s' }}>
            <a href="#packages" className="inline-flex items-center gap-2 rounded-full bg-[#c9a24b] px-6 py-3.5 text-sm font-semibold text-[#082a1f] transition hover:bg-[#e6c877] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e6c877]">
              Plan your trip <ArrowRight className="h-4 w-4" />
            </a>
            <button className="group inline-flex items-center gap-3 text-sm font-medium text-white">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-white/15 ring-1 ring-white/40 backdrop-blur transition group-hover:scale-110 group-hover:bg-white/25">
                <Play className="h-4 w-4 fill-white" />
              </span>
              Watch our story
            </button>
          </div>
        </div>

        <p className="absolute bottom-52 right-8 hidden items-center gap-2 rounded-full bg-black/30 px-4 py-2 text-xs text-white/90 backdrop-blur lg:flex">
          <MapPin className="h-3.5 w-3.5 text-[#e6c877]" /> Cap Spartel, Tangier
        </p>
      </section>

      {/* SEARCH PANEL (overlaps hero) */}
      <section className="relative z-10 mx-auto -mt-36 max-w-6xl px-5 lg:-mt-40 lg:px-8">
        <form onSubmit={onSearch} className="rounded-3xl bg-white p-3 shadow-2xl shadow-[#082a1f]/25 ring-1 ring-[#0f3d2e]/5">
          <div className="flex flex-wrap gap-1 px-2 pt-1" role="tablist" aria-label="What are you looking for">
            {packageTabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${tab === id ? 'bg-[#0f3d2e] text-white' : 'text-slate-600 hover:bg-[#f3f6f1]'}`}
              >
                <Icon className={`h-4 w-4 ${tab === id ? 'text-[#e6c877]' : ''}`} /> {label}
              </button>
            ))}
          </div>
          <div className="mt-2 flex flex-col gap-1 md:flex-row md:items-center">
            <Field icon={MapPin} label="Where to?" className="md:flex-[1.4]">
              <input value={search.destination} onChange={set('destination')} list="dest-list" placeholder="Tangier, Marrakech, Merzouga" className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400" />
              <datalist id="dest-list">{DESTINATIONS.map((d) => <option key={d.name} value={d.name} />)}</datalist>
            </Field>
            <Field icon={Calendar} label="Check in">
              <input type="date" value={search.checkIn} onChange={set('checkIn')} className="w-full bg-transparent text-sm text-slate-800 outline-none" />
            </Field>
            <Field icon={Calendar} label="Check out">
              <input type="date" min={search.checkIn} value={search.checkOut} onChange={set('checkOut')} className="w-full bg-transparent text-sm text-slate-800 outline-none" />
            </Field>
            <Field icon={Users} label="Travellers">
              <select value={search.guests} onChange={set('guests')} className="w-full bg-transparent text-sm text-slate-800 outline-none">
                {[1, 2, 3, 4, 5, 6, 8].map((n) => <option key={n} value={n}>{n} {n === 1 ? 'traveller' : 'travellers'}</option>)}
              </select>
            </Field>
            <button className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0f3d2e] px-8 py-4 text-sm font-semibold text-white transition hover:bg-[#1f6b4f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a24b]">
              <Search className="h-4 w-4" /> Search
            </button>
          </div>
        </form>

        <ul className="mt-6 grid grid-cols-2 gap-5 lg:grid-cols-4">
          {TRUST.map(({ icon: Icon, label, text }) => (
            <li key={label} className="flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#0f3d2e] text-[#e6c877]"><Icon className="h-5 w-5" strokeWidth={1.6} /></span>
              <span>
                <span className="block text-sm font-semibold text-[#0a2a20]">{label}</span>
                <span className="block text-xs text-slate-500">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* DESTINATIONS */}
      <section id="destinations" className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <SectionHead kicker="Popular destinations" title="Places that pull you in" action="All destinations" to="/destinations" />
        <div className="mt-8 grid auto-rows-[190px] grid-cols-2 gap-4 lg:grid-cols-4 lg:auto-rows-[200px]">
          {DESTINATIONS.map((d) => (
            <button
              key={d.name}
              onClick={() => { setSearch((s) => ({ ...s, destination: d.name })); setApplied({ ...search, destination: d.name, type: 'all' }); setTab('all'); document.getElementById('packages')?.scrollIntoView({ behavior: 'smooth' }); }}
              className={`group relative isolate overflow-hidden rounded-3xl text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a24b] ${d.span}`}
              aria-label={`See trips in ${d.name}`}
            >
              <span className="absolute inset-0 z-0">
                <Photo src={d.img} tone={d.tone} alt={d.name} className="h-full w-full" />
              </span>
              <span className="absolute inset-0 z-10 bg-gradient-to-t from-[#082a1f]/85 via-[#082a1f]/10 to-transparent" />
              <span className="absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-2 p-3 sm:p-5">
                <span className="min-w-0">
                  <span className="block break-words text-xl text-white sm:text-2xl" style={display}>{d.name}</span>
                  <span className="block text-xs text-white/80">{d.tag}</span>
                </span>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/15 text-white ring-1 ring-white/40 backdrop-blur transition group-hover:bg-[#c9a24b] group-hover:text-[#082a1f] sm:h-10 sm:w-10">
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* WHY US */}
      <section id="about" className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <div>
            <p className="text-sm font-medium text-[#9c7a2b]">Why travel with us</p>
            <h2 className="mt-1 text-4xl leading-tight text-[#0a2a20] sm:text-5xl" style={display}>More than just a booking</h2>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-600">
              We built this for people who want a trip that feels easy and personal, without spending weeks comparing tabs.
            </p>
          </div>
          <ul className="grid gap-px overflow-hidden rounded-3xl bg-[#0f3d2e]/10 ring-1 ring-[#0f3d2e]/10 sm:grid-cols-2">
            {WHY.map(({ icon: Icon, title, text }) => (
              <li key={title} className="bg-white p-7">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-[#f3f6f1] text-[#0f3d2e] ring-1 ring-[#c9a24b]/60"><Icon className="h-5 w-5" strokeWidth={1.6} /></span>
                <h3 className="mt-5 text-lg text-[#0a2a20]" style={display}>{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* PACKAGES / STAYS */}
      <section id="packages" className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <SectionHead kicker="Featured packages" title="Curated just for you" />

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter packages by category">
            {packageTabs.map(({ id, label }) => {
              const active = (applied?.type ?? 'all') === id;
              return (
                <button
                  key={id}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setApplied((a) => ({ ...(a ?? { ...search, destination: '' }), type: id }))}
                  className={`rounded-full px-4 py-2 text-sm transition ${active ? 'bg-[#0f3d2e] text-white' : 'bg-white text-slate-600 ring-1 ring-[#0f3d2e]/10 hover:ring-[#c9a24b]'}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <label className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm text-slate-600 ring-1 ring-[#0f3d2e]/10">
            <SlidersHorizontal className="h-4 w-4 text-[#c9a24b]" />
            <span className="sr-only">Sort by</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="bg-transparent outline-none">
              <option value="featured">Featured</option>
              <option value="low">Price: low to high</option>
              <option value="high">Price: high to low</option>
            </select>
          </label>
        </div>

        {applied && (applied.destination || applied.type !== 'all' || Number(applied.guests) > 2) && (
          <p className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-600" role="status">
            {results.length} {results.length === 1 ? 'result' : 'results'}
            {applied.destination && <> for <strong className="text-[#0a2a20]">{applied.destination}</strong></>}
            {applied.checkIn && applied.checkOut && <>, {applied.checkIn} to {applied.checkOut}</>}
            <button onClick={clearSearch} className="font-medium text-[#9c7a2b] underline underline-offset-4">Clear search</button>
          </p>
        )}

        {packagesLoading ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4" aria-label="Loading featured packages" aria-busy="true">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="overflow-hidden rounded-3xl bg-white ring-1 ring-[#0f3d2e]/10">
                <div className="h-44 animate-pulse bg-[#0f3d2e]/10" />
                <div className="space-y-3 p-5">
                  <div className="h-3 w-1/3 animate-pulse rounded bg-[#0f3d2e]/10" />
                  <div className="h-5 w-3/4 animate-pulse rounded bg-[#0f3d2e]/10" />
                  <div className="h-4 w-1/2 animate-pulse rounded bg-[#0f3d2e]/10" />
                </div>
              </div>
            ))}
          </div>
        ) : packagesError ? (
          <div className="mt-10 rounded-3xl bg-white p-8 text-center ring-1 ring-[#0f3d2e]/10" role="alert">
            <p className="text-sm text-slate-600">{packagesError}</p>
            <button onClick={loadPackages} className="mt-5 rounded-full bg-[#0f3d2e] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1f6b4f]">Try again</button>
          </div>
        ) : packages.length === 0 ? (
          <div className="mt-10 rounded-3xl bg-white p-8 text-center ring-1 ring-[#0f3d2e]/10">
            <p className="text-2xl text-[#0a2a20]" style={display}>No published packages yet</p>
            <p className="mt-2 text-sm text-slate-600">New trips will appear here as soon as they’re published.</p>
          </div>
        ) : results.length === 0 ? (
          <div className="mt-10 rounded-3xl bg-white p-12 text-center ring-1 ring-[#0f3d2e]/10">
            <p className="text-2xl text-[#0a2a20]" style={display}>Nothing matches that search</p>
            <p className="mt-2 text-sm text-slate-600">Try a different destination, fewer travellers or all package categories.</p>
            <button onClick={clearSearch} className="mt-5 rounded-full bg-[#0f3d2e] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1f6b4f]">Show everything</button>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {results.map((pkg) => {
              const title = pkg.public_title || pkg.internal_title || 'Untitled package';
              const duration = `${pkg.duration_days} days, ${pkg.duration_nights ?? Math.max(0, Number(pkg.duration_days || 1) - 1)} nights`;
              const groupSize = pkg.max_travelers
                ? `Up to ${pkg.max_travelers} travelers`
                : pkg.min_travelers
                  ? `${pkg.min_travelers}+ travelers`
                  : 'Flexible group size';
              return (
              <article key={pkg.id} className="group overflow-hidden rounded-3xl bg-white ring-1 ring-[#0f3d2e]/10 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-[#0f3d2e]/10">
                <Photo src={pkg.cover_image_url} tone="from-[#0f3d2e] to-[#c9a24b]" alt={title} className="h-44">
                  {pkg.package_category && <span className="absolute left-3 top-3 rounded-full bg-[#c9a24b] px-3 py-1 text-[11px] font-semibold text-[#082a1f]">{pkg.package_category}</span>}
                  <button
                    onClick={() => toggleSave(pkg.id)}
                    aria-pressed={saved.has(pkg.id)}
                    aria-label={saved.has(pkg.id) ? `Remove ${title} from saved` : `Save ${title}`}
                    className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-[#0f3d2e] backdrop-blur transition hover:scale-110"
                  >
                    <Heart className={`h-4 w-4 ${saved.has(pkg.id) ? 'fill-[#c9a24b] text-[#c9a24b]' : ''}`} />
                  </button>
                </Photo>
                <div className="p-5">
                  <p className="flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5 text-[#c9a24b]" />{pkg.destination_country || 'Morocco'}</p>
                  <h3 className="mt-1 text-lg leading-snug text-[#0a2a20]" style={display}>
                    <Link to={`/packages/${pkg.id}`} className="hover:text-[#0f3d2e]">{title}</Link>
                  </h3>
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">
                    {pkg.short_description || 'A thoughtfully planned trip with local experiences and handpicked stays.'}
                  </p>
                  <p className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                    <span>{duration}</span><span className="h-3 w-px bg-slate-200" />
                    <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{groupSize}</span>
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <p>
                      <span className="block text-[11px] text-slate-500">{pkg.price_display_mode === 'starting_from' ? 'From' : 'Price'}</span>
                      <span className="text-lg font-bold text-[#0a2a20]">{formatPrice(pkg)}</span>
                      {pkg.starting_price ? <span className="text-xs text-slate-500"> / traveler</span> : null}
                    </p>
                    <Link to={`/packages/${pkg.id}`} aria-label={`View ${title}`} className="grid h-9 w-9 place-items-center rounded-full bg-[#f3f6f1] text-[#0f3d2e] transition hover:bg-[#0f3d2e] hover:text-[#e6c877]"><ArrowRight className="h-4 w-4" /></Link>
                  </div>
                </div>
              </article>
              );
            })}
          </div>
        )}
        {saved.size > 0 && <p className="mt-6 text-sm text-slate-600" role="status">{saved.size} saved {saved.size === 1 ? 'trip' : 'trips'}</p>}
      </section>

      {/* CTA BANNER WITH COUNTDOWN */}
      <section className="relative isolate overflow-hidden bg-[#082a1f]">
        <Photo src="/images/offer.jpg" tone="from-[#082a1f] via-[#0f3d2e] to-[#1f6b4f]" className="absolute inset-0 -z-10 opacity-50" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#082a1f] via-[#082a1f]/70 to-transparent" />
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-10 px-5 py-20 lg:flex-row lg:items-center lg:px-8">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-[#e6c877]"><Sparkles className="h-4 w-4" /> Winter offer, ends soon</p>
            <h2 className="mt-3 max-w-xl text-4xl text-white sm:text-5xl" style={display}>The world is calling. Save up to 30% before it ends.</h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-white/80">Early access to winter dates, free breakfast on every stay and a travel planner who stays on call.</p>
            <a href="#packages" className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#c9a24b] px-6 py-3.5 text-sm font-semibold text-[#082a1f] transition hover:bg-[#e6c877]">Plan your dream trip <ArrowRight className="h-4 w-4" /></a>
          </div>
          <div className="grid grid-cols-4 divide-x divide-white/15 overflow-hidden rounded-2xl bg-white/10 ring-1 ring-[#c9a24b]/50 backdrop-blur" role="timer" aria-label="Offer countdown">
            {countdown.map(([label, v]) => (
              <div key={label} className="w-20 px-2 py-5 text-center sm:w-24">
                <p className="text-3xl tabular-nums text-[#e6c877]" style={display}>{String(v).padStart(2, '0')}</p>
                <p className="mt-1 text-[11px] text-white/70">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EXPERIENCES */}
      <section id="experiences" className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <SectionHead kicker="Experiences" title="More than a stay" />
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {EXPERIENCES.map(({ icon: Icon, title, text, img, tone }) => (
            <Link key={title} to="/services" className="group block">
              <Photo src={img} tone={tone} alt={title} className="aspect-[3/4] rounded-3xl" />
              <span className="mt-3 flex items-center gap-2 text-sm font-semibold text-[#0a2a20]"><Icon className="h-4 w-4 text-[#c9a24b]" />{title}</span>
              <span className="block text-xs text-slate-500">{text}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <div>
            <p className="text-sm font-medium text-[#9c7a2b]">Travellers love us</p>
            <h2 className="mt-1 text-4xl leading-tight text-[#0a2a20] sm:text-5xl" style={display}>Real stories. Real smiles.</h2>
            <p className="mt-4 flex items-center gap-2 text-sm text-slate-600">
              <span className="flex text-[#c9a24b]">{Array.from({ length: 5 }, (_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}</span>
              4.9 average from 2,400 reviews
            </p>
          </div>
          <figure onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} className="flex flex-col justify-between rounded-3xl bg-[#0f3d2e] p-8 text-white sm:p-10">
            <div>
              <Quote className="h-8 w-8 text-[#c9a24b]" />
              <blockquote key={review} className="rise mt-5 text-xl leading-relaxed sm:text-2xl" style={{ ...display, animationDuration: '.5s' }}>{r.text}</blockquote>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
              <figcaption className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-[#c9a24b] text-sm font-bold text-[#082a1f]">{r.name[0]}</span>
                <span>
                  <span className="block text-sm font-semibold">{r.name}</span>
                  <span className="block text-xs text-white/70">{r.from}</span>
                </span>
              </figcaption>
              <div className="flex items-center gap-3">
                <span className="text-xs text-white/70">{review + 1} / {REVIEWS.length}</span>
                <button aria-label="Previous review" onClick={() => setReview((review + REVIEWS.length - 1) % REVIEWS.length)} className="rounded-full p-2.5 ring-1 ring-white/30 transition hover:bg-white/10"><ChevronLeft className="h-4 w-4" /></button>
                <button aria-label="Next review" onClick={() => setReview((review + 1) % REVIEWS.length)} className="rounded-full p-2.5 ring-1 ring-white/30 transition hover:bg-white/10"><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
          </figure>
        </div>
      </section>

      {/* BLOG */}
      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <SectionHead kicker="Travel guides and tips" title="Stories to fuel your next trip" action="View all" to="/blog" />
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {POSTS.map((p) => (
            <article key={p.title} className="group overflow-hidden rounded-3xl bg-white ring-1 ring-[#0f3d2e]/10 transition hover:shadow-xl hover:shadow-[#0f3d2e]/10">
              <Photo src={p.img} tone={p.tone} alt={p.title} className="h-48" />
              <div className="p-6">
                <p className="text-xs text-slate-500">{p.date} · {p.read} read</p>
                <h3 className="mt-2 text-xl leading-snug text-[#0a2a20]" style={display}>{p.title}</h3>
                <Link to="/blog" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#0f3d2e] group-hover:text-[#9c7a2b]">Read more <ArrowRight className="h-4 w-4" /></Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="mx-auto max-w-7xl px-5 pb-20 lg:px-8">
        <form onSubmit={onSubscribe} noValidate className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-[#e4ecdf] p-8 ring-1 ring-[#0f3d2e]/10 lg:flex-row lg:items-center lg:p-10">
          <div className="flex items-center gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#0f3d2e] text-[#e6c877]"><Mail className="h-5 w-5" /></span>
            <div>
              <h3 className="text-2xl text-[#0a2a20]" style={display}>Get deals and ideas in your inbox</h3>
              <p className="text-sm text-slate-600">One email a month. Unsubscribe any time.</p>
            </div>
          </div>
          <div className="w-full lg:w-[460px]">
            <div className="flex gap-2 rounded-full bg-white p-1.5 ring-1 ring-[#0f3d2e]/10 focus-within:ring-2 focus-within:ring-[#c9a24b]">
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (mailState !== 'idle') setMailState('idle'); }}
                placeholder="Enter your email"
                aria-label="Email address"
                aria-invalid={mailState === 'error'}
                className="min-w-0 flex-1 bg-transparent px-4 text-sm text-slate-800 outline-none placeholder:text-slate-400"
              />
              <button className="inline-flex items-center gap-2 rounded-full bg-[#0f3d2e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1f6b4f]">Subscribe <ArrowRight className="h-4 w-4" /></button>
            </div>
            <p className="mt-2 min-h-5 pl-4 text-xs" role="status">
              {mailState === 'error' && <span className="text-red-700">Enter a valid email, like name@example.com.</span>}
              {mailState === 'done' && <span className="inline-flex items-center gap-1 text-[#0f3d2e]"><Check className="h-3.5 w-3.5" /> You’re subscribed. Check your inbox to confirm.</span>}
            </p>
          </div>
        </form>
      </section>

      {/* BACK TO TOP */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Back to top"
        className={`fixed bottom-6 right-6 z-40 grid h-12 w-12 place-items-center rounded-full bg-[#c9a24b] text-[#082a1f] shadow-lg transition ${showTop ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'}`}
      >
        <ArrowUp className="h-5 w-5" />
      </button>
    </div>
  );
}