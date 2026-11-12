import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  Menu, X, UserRound, Shield, ChevronDown, ArrowRight, Phone, MapPin,
} from 'lucide-react';
import LOGO from '../../assets/logo.png';

const LINKS = [
  { to: '/destinations', label: 'Destinations' },
  { to: '/packages', label: 'Packages' },
  { to: '/services', label: 'Services' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

const ACCOUNT = [
  { to: '/auth/customer-login', label: 'Customer login', text: 'Manage your trips and bookings', icon: UserRound },
  { to: '/auth/admin-login', label: 'Admin login', text: 'Staff and agency dashboard', icon: Shield },
];

const display = { fontFamily: "'Fraunces', Georgia, serif" };
const body = { fontFamily: "'Manrope', system-ui, sans-serif" };

export default function PublicNavbar() {
  const { pathname } = useLocation();
  const isHome = pathname === '/';

  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [progress, setProgress] = useState(0);
  const [open, setOpen] = useState(false);
  const [account, setAccount] = useState(false);

  const lastY = useRef(0);
  const raf = useRef(0);
  const accountRef = useRef(null);

  // Transparent over the home hero, solid glass elsewhere, once scrolled, or when a menu is open.
  const solid = scrolled || !isHome || open;

  /* Scroll: solid state, hide on scroll down / show on scroll up, reading progress */
  useEffect(() => {
    const onScroll = () => {
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => {
        const y = window.scrollY;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setScrolled(y > 24);
        setProgress(max > 0 ? Math.min(1, y / max) : 0);
        if (y > lastY.current + 6 && y > 400) setHidden(true);
        else if (y < lastY.current - 6) setHidden(false);
        lastY.current = y;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  /* Close menus on navigation */
  useEffect(() => {
    setOpen(false);
    setAccount(false);
    setHidden(false);
  }, [pathname]);

  /* Mobile drawer: Escape closes, page scroll locked */
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  /* Account dropdown: outside click and Escape close it */
  useEffect(() => {
    if (!account) return undefined;
    const onDown = (e) => accountRef.current && !accountRef.current.contains(e.target) && setAccount(false);
    const onKey = (e) => e.key === 'Escape' && setAccount(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [account]);

  const linkClass = ({ isActive }) =>
    `relative py-1 text-sm font-medium transition-colors after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:origin-left after:rounded-full after:bg-[#c9a24b] after:transition-transform after:duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e6c877] ${
      isActive
        ? 'text-white after:scale-x-100'
        : 'text-white/80 hover:text-white after:scale-x-0 hover:after:scale-x-100'
    }`;

  const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e6c877]';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Manrope:wght@400;500;600;700&display=swap');
        @media (prefers-reduced-motion: reduce){.nav-anim{transition:none!important}}
      `}</style>

      <header
        style={body}
        className={`nav-anim fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          hidden && !open && !account ? '-translate-y-full' : 'translate-y-0'
        } ${solid ? 'bg-[#082a1f]/90 py-3 shadow-lg shadow-[#082a1f]/25 backdrop-blur-xl' : 'bg-transparent py-5'}`}
      >
        <nav aria-label="Public navigation" className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 sm:gap-6 sm:px-5 lg:px-8">
          {/* Brand */}
          <Link to="/" className={`flex min-w-0 items-center gap-2 text-white sm:gap-3 ${focusRing} rounded-lg`}>
            <img src={LOGO} alt="" className="h-11 w-8 shrink-0 object-contain sm:h-12" />
            <span className="leading-none">
              <span className="block text-xl sm:text-2xl" style={display}>Habibi Adventure</span>
              <span className="mt-1 block text-[10px] text-white/70">Journeys worth taking</span>
            </span>
          </Link>

          {/* Desktop links */}
          <ul className="hidden items-center gap-5 xl:gap-7 lg:flex">
            {LINKS.map(({ to, label }) => (
              <li key={to}><NavLink to={to} className={linkClass}>{label}</NavLink></li>
            ))}
          </ul>

          {/* Desktop actions */}
          <div className="hidden items-center gap-3 lg:flex">
            <div className="relative" ref={accountRef}>
              <button
                onClick={() => setAccount((a) => !a)}
                aria-haspopup="menu"
                aria-expanded={account}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-white ring-1 ring-white/30 transition hover:bg-white/10 ${focusRing}`}
              >
                <UserRound className="h-4 w-4" /> Sign in
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${account ? 'rotate-180' : ''}`} />
              </button>

              <div
                role="menu"
                aria-label="Sign in options"
                className={`absolute right-0 mt-3 w-72 origin-top-right rounded-2xl bg-white p-2 shadow-2xl shadow-[#082a1f]/30 ring-1 ring-[#0f3d2e]/10 transition duration-200 ${
                  account ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-1 opacity-0'
                }`}
              >
                {ACCOUNT.map(({ to, label, text, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    role="menuitem"
                    tabIndex={account ? 0 : -1}
                    className="group flex items-start gap-3 rounded-xl p-3 transition hover:bg-[#f3f6f1] focus-visible:bg-[#f3f6f1] focus-visible:outline-none"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#0f3d2e] text-[#e6c877] transition group-hover:bg-[#c9a24b] group-hover:text-[#082a1f]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-[#0a2a20]">{label}</span>
                      <span className="block text-xs text-slate-500">{text}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            <Link
              to="/packages"
              className={`inline-flex items-center gap-2 rounded-full bg-[#c9a24b] px-5 py-2.5 text-sm font-semibold text-[#082a1f] transition hover:bg-[#e6c877] ${focusRing}`}
            >
              Plan your trip <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-menu"
            className={`rounded-full p-2.5 text-white ring-1 ring-white/25 transition hover:bg-white/10 lg:hidden ${focusRing}`}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>

        {/* Reading progress */}
        <span
          aria-hidden="true"
          className={`absolute inset-x-0 bottom-0 h-0.5 origin-left bg-gradient-to-r from-[#c9a24b] to-[#e6c877] transition-opacity duration-300 ${solid && progress > 0.01 ? 'opacity-100' : 'opacity-0'}`}
          style={{ transform: `scaleX(${progress})` }}
        />

        {/* Mobile drawer */}
        <div
          id="mobile-menu"
          className={`nav-anim mx-5 grid max-h-[calc(100dvh-5.5rem)] overflow-y-auto transition-all duration-300 lg:hidden ${
            open ? 'mt-4 grid-rows-[1fr] opacity-100' : 'pointer-events-none grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="rounded-3xl bg-white/5 p-3 ring-1 ring-white/10">
              <ul>
                {LINKS.map(({ to, label }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      tabIndex={open ? 0 : -1}
                      className={({ isActive }) =>
                        `flex items-center justify-between rounded-2xl px-4 py-3.5 text-2xl transition ${
                          isActive ? 'bg-white/10 text-[#e6c877]' : 'text-white hover:bg-white/5'
                        }`
                      }
                      style={display}
                    >
                      {label}
                      <ArrowRight className="h-4 w-4 opacity-60" />
                    </NavLink>
                  </li>
                ))}
              </ul>

              <div className="mt-3 grid gap-2 border-t border-white/10 p-2 pt-4">
                <Link
                  to="/packages"
                  tabIndex={open ? 0 : -1}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#c9a24b] px-4 py-3.5 text-sm font-semibold text-[#082a1f]"
                >
                  Plan your trip <ArrowRight className="h-4 w-4" />
                </Link>
                <div className="grid grid-cols-2 gap-2">
                  {ACCOUNT.map(({ to, label, icon: Icon }) => (
                    <Link
                      key={to}
                      to={to}
                      tabIndex={open ? 0 : -1}
                      className="inline-flex items-center justify-center gap-2 rounded-full px-3 py-3 text-sm font-medium text-white ring-1 ring-white/30 transition hover:bg-white/10"
                    >
                      <Icon className="h-4 w-4 text-[#e6c877]" /> {label.split(' ')[0]}
                    </Link>
                  ))}
                </div>
              </div>

              <p className="flex items-center justify-center gap-4 px-2 pb-2 pt-3 text-xs text-white/60">
                <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-[#c9a24b]" /> Tangier, Morocco</span>
                <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-[#c9a24b]" /> 24/7 support</span>
              </p>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}