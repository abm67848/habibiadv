import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Compass, Heart, ShieldCheck, Leaf, Route, ArrowRight, MessageCircle, MapPin, Users, Star, Award,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Content. All of this is placeholder copy: replace it with yours.   */
/*  Photos go in /public/images; missing ones fall back to a gradient. */
/* ------------------------------------------------------------------ */
const STATS = [
  { value: 12, suffix: '+', label: 'Years planning trips' },
  { value: 8400, suffix: '+', label: 'Travelers hosted' },
  { value: 60, suffix: '+', label: 'Local partners' },
  { value: 4.9, suffix: '/5', label: 'Average review', decimals: 1 },
];

const VALUES = [
  { icon: Compass, title: 'Local first', text: 'Our guides, drivers and hosts live where you’re going. They know which café is worth the detour.' },
  { icon: Heart, title: 'Personal by default', text: 'No copy-pasted itineraries. Every trip is shaped around who’s travelling and how they like to move.' },
  { icon: ShieldCheck, title: 'Honest pricing', text: 'You see what’s included and what isn’t before you pay. No surprise fees at the border or the hotel desk.' },
  { icon: Leaf, title: 'Light footprint', text: 'Small groups, family-run stays and money that stays in the communities you visit.' },
];

const MILESTONES = [
  { year: '2014', title: 'First tour', text: 'Two founders and one van, running day trips out of Tangier.' },
  { year: '2017', title: 'Beyond the north', text: 'Added Chefchaouen, Fes and Marrakech circuits with a growing guide team.' },
  { year: '2020', title: 'Rebuilt for flexibility', text: 'Introduced changeable bookings and a 24/7 support line.' },
  { year: '2023', title: 'Sahara and Atlas', text: 'Opened private desert camps and mountain treks with partner families.' },
  { year: '2026', title: 'Online booking', text: 'Launched this site so you can browse, tweak and request a trip in minutes.' },
];

const STEPS = [
  { title: 'Tell us your idea', text: 'Dates, who’s coming, what you love. A short message or a call is enough.' },
  { title: 'We draft a plan', text: 'A planner sends a day-by-day itinerary and a clear price, usually within a day.' },
  { title: 'Adjust until it fits', text: 'Swap a stay, add a night, skip a stop. We keep revising until you’re happy.' },
  { title: 'Travel with backup', text: 'Transfers, tickets and tables are booked, and a real person is on call the whole way.' },
];

const TEAM = [
  { name: 'Ayoub El Idrissi', role: 'Founder and lead planner', img: '/images/team-1.jpg' },
  { name: 'Salma Benali', role: 'Head of experiences', img: '/images/team-2.jpg' },
  { name: 'Omar Tazi', role: 'Guide coordinator', img: '/images/team-3.jpg' },
  { name: 'Lina Chraibi', role: 'Guest care', img: '/images/team-4.jpg' },
];

const display = { fontFamily: "'Fraunces', Georgia, serif" };
const body = { fontFamily: "'Manrope', system-ui, sans-serif" };
const ring = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a24b]';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function useInView(options = { threshold: 0.4 }) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      setSeen(true);
      return undefined;
    }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setSeen(true);
        io.disconnect();
      }
    }, options);
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return [ref, seen];
}

function CountUp({ value, suffix = '', decimals = 0, run }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!run) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setN(value);
      return undefined;
    }
    let raf;
    const start = performance.now();
    const dur = 1400;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / dur);
      setN(value * (1 - (1 - p) ** 3));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, value]);
  return <>{n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</>;
}

function Photo({ src, alt = '', tone = 'from-[#0f3d2e] via-[#1f6b4f] to-[#c9a24b]', className = '', children }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${tone} ${className}`}>
      {src && !failed && (
        <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className="absolute inset-0 h-full w-full object-cover" />
      )}
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function AboutPage() {
  const [statsRef, statsSeen] = useInView();

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
      <header className="relative isolate overflow-hidden bg-[#082a1f] pb-48 pt-36 text-white sm:pt-44">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#082a1f] via-[#1f6b4f] to-[#c9a24b]" />
        <img
          src="/images/about-hero.jpg"
          alt=""
          onError={(e) => (e.currentTarget.style.display = 'none')}
          className="absolute inset-0 -z-10 h-full w-full object-cover"
          style={{ animation: 'drift 26s ease-in-out infinite alternate' }}
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#082a1f]/85 via-[#082a1f]/50 to-[#082a1f]/20" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-[#f3f6f1] to-transparent" />

        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="rise inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm text-white/90 ring-1 ring-white/25 backdrop-blur">
            <MapPin className="h-3.5 w-3.5 text-[#e6c877]" /> Based in Tangier, Morocco
          </p>
          <h1 className="rise mt-6 max-w-3xl text-4xl leading-[1.05] sm:text-6xl lg:text-7xl" style={{ ...display, animationDelay: '.15s' }}>
            We’re the people behind your trip
          </h1>
          <p className="rise mt-6 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg" style={{ animationDelay: '.3s' }}>
            A small team of planners, guides and hosts who grew up on these roads and still can’t stop showing them off.
          </p>
        </div>
      </header>

      {/* STATS */}
      <section ref={statsRef} className="relative z-10 mx-auto -mt-32 max-w-6xl px-5 lg:px-8" aria-label="Our numbers">
        <dl className="grid grid-cols-2 divide-[#0f3d2e]/10 overflow-hidden rounded-3xl bg-white shadow-2xl shadow-[#082a1f]/15 ring-1 ring-[#0f3d2e]/5 lg:grid-cols-4 lg:divide-x">
          {STATS.map(({ value, suffix, label, decimals }) => (
            <div key={label} className="p-6 text-center sm:p-8">
              <dd className="text-4xl text-[#0f3d2e] sm:text-5xl" style={display}>
                <CountUp value={value} suffix={suffix} decimals={decimals} run={statsSeen} />
              </dd>
              <dt className="mt-2 text-sm text-slate-500">{label}</dt>
            </div>
          ))}
        </dl>
      </section>

      {/* STORY */}
      <section className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-24 lg:grid-cols-2 lg:px-8">
        <div>
          <h2 className="text-4xl leading-tight text-[#0a2a20] sm:text-5xl" style={display}>It started with a van and a long list of favorite places</h2>
          <div className="mt-6 space-y-4 text-[15px] leading-7 text-slate-600">
            <p>We began by taking friends of friends around Tangier: the medina at dawn, the caves at Hercules, the café where two seas seem to meet. They kept telling their friends, and the van got bigger.</p>
            <p>Today we plan trips across Morocco, from the Rif mountains to the Sahara. What hasn’t changed is how we work. We pick every stay ourselves, we pay local people fairly, and we answer the phone.</p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/packages" className={`inline-flex items-center gap-2 rounded-full bg-[#0f3d2e] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#1f6b4f] ${ring}`}>
              See our trips <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/contact" className={`inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold text-[#0f3d2e] ring-1 ring-[#0f3d2e]/20 transition hover:bg-white ${ring}`}>
              Talk to a planner
            </Link>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-lg">
          <Photo src="/images/about-story-1.jpg" alt="Guide leading a small group through a medina" className="aspect-[4/5] rounded-[2rem] shadow-xl shadow-[#0f3d2e]/15" />
          <Photo src="/images/about-story-2.jpg" alt="Mint tea served in a riad courtyard" tone="from-[#c9a24b] via-[#e6c877] to-[#1f6b4f]" className="absolute -bottom-8 -left-6 hidden aspect-square w-44 rounded-3xl ring-8 ring-[#f3f6f1] sm:block" />
          <div className="absolute right-0 top-8 flex items-center gap-2 rounded-2xl bg-white px-3 py-3 shadow-lg ring-1 ring-[#0f3d2e]/10 sm:-right-3 sm:gap-3 sm:px-4">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#c9a24b] text-[#082a1f]"><Star className="h-5 w-5 fill-current" /></span>
            <span>
              <span className="block text-sm font-bold text-[#0a2a20]">4.9 out of 5</span>
              <span className="block text-xs text-slate-500">from guests</span>
            </span>
          </div>
        </div>
      </section>

      {/* VALUES */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
          <h2 className="max-w-2xl text-4xl leading-tight text-[#0a2a20] sm:text-5xl" style={display}>What we promise every traveler</h2>
          <ul className="mt-12 grid gap-px overflow-hidden rounded-3xl bg-[#0f3d2e]/10 ring-1 ring-[#0f3d2e]/10 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="bg-white p-7">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-[#f3f6f1] text-[#0f3d2e] ring-1 ring-[#c9a24b]/60"><Icon className="h-5 w-5" strokeWidth={1.6} /></span>
                <h3 className="mt-5 text-xl text-[#0a2a20]" style={display}>{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* TIMELINE */}
      <section className="mx-auto max-w-4xl px-5 py-24 lg:px-8">
        <h2 className="text-4xl text-[#0a2a20] sm:text-5xl" style={display}>How we got here</h2>
        <ol className="relative mt-12 space-y-10 before:absolute before:bottom-2 before:left-[39px] before:top-2 before:w-px before:bg-[#c9a24b]/60 sm:before:left-[51px]">
          {MILESTONES.map(({ year, title, text }) => (
            <li key={year} className="relative flex gap-6 sm:gap-8">
              <span className="z-10 grid h-[78px] w-[78px] shrink-0 place-items-center rounded-full bg-[#0f3d2e] text-lg text-[#e6c877] ring-8 ring-[#f3f6f1] sm:h-[102px] sm:w-[102px] sm:text-2xl" style={display}>{year}</span>
              <div className="pt-3 sm:pt-6">
                <h3 className="text-xl text-[#0a2a20]" style={display}>{title}</h3>
                <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-slate-600">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* PROCESS */}
      <section className="relative isolate overflow-hidden bg-[#0f3d2e] text-white">
        <div className="absolute -right-24 -top-24 -z-10 h-96 w-96 rounded-full bg-[#c9a24b]/15 blur-3xl" />
        <div className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
          <h2 className="max-w-2xl text-4xl leading-tight sm:text-5xl" style={display}>How planning a trip with us works</h2>
          <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ title, text }, i) => (
              <li key={title} className="rounded-3xl bg-white/5 p-7 ring-1 ring-white/10">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-[#c9a24b] text-sm font-bold text-[#082a1f]">{i + 1}</span>
                <h3 className="mt-5 text-xl" style={display}>{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/75">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* TEAM */}
      <section className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="max-w-xl text-4xl leading-tight text-[#0a2a20] sm:text-5xl" style={display}>Meet the team you’ll talk to</h2>
          <p className="flex items-center gap-2 text-sm text-slate-600"><Users className="h-4 w-4 text-[#c9a24b]" /> Real people, real names, real phone numbers</p>
        </div>
        <ul className="mt-12 grid grid-cols-2 gap-5 lg:grid-cols-4">
          {TEAM.map(({ name, role, img }) => (
            <li key={name} className="group">
              <Photo src={img} alt={name} className="aspect-[4/5] rounded-3xl">
                <span className="absolute inset-0 grid place-items-center text-6xl text-white/60" style={display} aria-hidden="true">{name[0]}</span>
              </Photo>
              <h3 className="mt-4 text-lg text-[#0a2a20]" style={display}>{name}</h3>
              <p className="text-sm text-slate-500">{role}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-5 pb-24 lg:px-8">
        <div className="relative isolate overflow-hidden rounded-[2rem] bg-[#082a1f] p-8 text-white sm:p-14">
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#082a1f] via-[#0f3d2e] to-[#1f6b4f]" />
          <div className="absolute -bottom-20 -right-10 -z-10 h-72 w-72 rounded-full bg-[#c9a24b]/25 blur-3xl" />
          <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium text-[#e6c877]"><Award className="h-4 w-4" /> Planning is free, and so is the quote</p>
              <h2 className="mt-3 max-w-xl text-4xl leading-tight sm:text-5xl" style={display}>Ready to see Morocco with people who love it?</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/packages" className={`inline-flex items-center gap-2 rounded-full bg-[#c9a24b] px-7 py-4 text-sm font-bold text-[#082a1f] transition hover:bg-[#e6c877] ${ring}`}>
                <Route className="h-4 w-4" /> Browse packages
              </Link>
              <Link to="/contact" className={`inline-flex items-center gap-2 rounded-full px-7 py-4 text-sm font-semibold text-white ring-1 ring-white/40 transition hover:bg-white/10 ${ring}`}>
                <MessageCircle className="h-4 w-4" /> Contact us
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}