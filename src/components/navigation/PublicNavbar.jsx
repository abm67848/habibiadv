import { useEffect, useId, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X, ArrowRight, Phone, MapPin, Globe, ChevronDown, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LOGO from '../../assets/logo.png';

const LINKS = [
  { to: '/packages', label: 'Packages' },
  { to: '/services', label: 'Services' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

const LANGUAGES = [
  { code: 'en', short: 'EN', name: 'English' },
  { code: 'fr', short: 'FR', name: 'Français' },
  { code: 'es', short: 'ES', name: 'Español' },
];

const display = { fontFamily: "'Fraunces', Georgia, serif" };
const body = { fontFamily: "'Manrope', system-ui, sans-serif" };
const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e6c877]';

/**
 * Accessible custom language dropdown (listbox pattern).
 * Click or ArrowDown/Enter/Space opens it. Arrows, Home, End move. Enter/Space selects.
 * Escape closes and returns focus. Outside click and Tab close it.
 */
function LanguageMenu({ forceClose = false }) {
  const { t, i18n } = useTranslation();
  const uid = useId();
  const listId = `${uid}-list`;

  const current = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0];
  const selected = LANGUAGES.find((l) => l.code === current) || LANGUAGES[0];

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const listRef = useRef(null);

  const openMenu = () => {
    setActive(Math.max(0, LANGUAGES.findIndex((l) => l.code === selected.code)));
    setOpen(true);
  };

  const closeMenu = (returnFocus = false) => {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  };

  const choose = (code) => {
    i18n.changeLanguage(code);
    closeMenu(true);
  };

  // Move focus into the list when it opens
  useEffect(() => {
    if (open) listRef.current?.focus();
  }, [open]);

  // Close when the header hides or the mobile drawer toggles
  useEffect(() => {
    if (forceClose) setOpen(false);
  }, [forceClose]);

  // Outside click closes
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => rootRef.current && !rootRef.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown, { passive: true });
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [open]);

  const onButtonKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      openMenu();
    }
  };

  const onListKeyDown = (e) => {
    const last = LANGUAGES.length - 1;
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); setActive((i) => (i >= last ? 0 : i + 1)); break;
      case 'ArrowUp': e.preventDefault(); setActive((i) => (i <= 0 ? last : i - 1)); break;
      case 'Home': e.preventDefault(); setActive(0); break;
      case 'End': e.preventDefault(); setActive(last); break;
      case 'Enter':
      case ' ': e.preventDefault(); choose(LANGUAGES[active].code); break;
      case 'Escape': e.preventDefault(); e.stopPropagation(); closeMenu(true); break;
      case 'Tab': setOpen(false); break;
      default: {
        // Type-ahead: jump to the language starting with the typed letter
        const idx = LANGUAGES.findIndex((l) => l.name.toLowerCase().startsWith(e.key.toLowerCase()));
        if (e.key.length === 1 && idx >= 0) setActive(idx);
      }
    }
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={onButtonKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`${t('Choose language')}: ${selected.name}`}
        className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2.5 text-sm font-medium text-white ring-1 ring-white/30 transition hover:bg-white/10 ${open ? 'bg-white/10' : ''} ${focusRing}`}
      >
        <Globe className="h-4 w-4 text-[#e6c877]" aria-hidden="true" />
        <span className="sm:hidden">{selected.short}</span>
        <span className="hidden sm:inline">{selected.name}</span>
        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        tabIndex={-1}
        aria-label={t('Choose language')}
        aria-activedescendant={open ? `${uid}-opt-${LANGUAGES[active].code}` : undefined}
        onKeyDown={onListKeyDown}
        className={`nav-anim absolute right-0 mt-3 w-56 origin-top-right rounded-2xl bg-white p-2 shadow-2xl shadow-[#082a1f]/30 ring-1 ring-[#0f3d2e]/10 outline-none transition duration-200 ${
          open ? 'visible translate-y-0 scale-100 opacity-100' : 'invisible -translate-y-1 scale-95 opacity-0'
        }`}
      >
        {LANGUAGES.map((lang, i) => {
          const isSelected = lang.code === selected.code;
          const isActive = i === active;
          return (
            <li
              key={lang.code}
              id={`${uid}-opt-${lang.code}`}
              role="option"
              aria-selected={isSelected}
              lang={lang.code}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(lang.code)}
              className={`flex cursor-pointer items-center gap-3 rounded-xl p-2.5 transition ${isActive ? 'bg-[#f3f6f1]' : ''}`}
            >
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold transition ${
                  isSelected ? 'bg-[#c9a24b] text-[#082a1f]' : 'bg-[#0f3d2e] text-[#e6c877]'
                }`}
              >
                {lang.short}
              </span>
              <span className="min-w-0 flex-1 text-sm font-semibold text-[#0a2a20]">{lang.name}</span>
              {isSelected && <Check className="h-4 w-4 shrink-0 text-[#0f3d2e]" aria-hidden="true" />}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function PublicNavbar() {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const isHome = pathname === '/';

  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [progress, setProgress] = useState(0);
  const [open, setOpen] = useState(false);

  const lastY = useRef(0);
  const raf = useRef(0);

  // Transparent over the home hero, solid glass elsewhere, once scrolled, or when the menu is open.
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

  /* Close menu on navigation */
  useEffect(() => {
    setOpen(false);
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

  const linkClass = ({ isActive }) =>
    `relative py-1 text-sm font-medium transition-colors after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:origin-left after:rounded-full after:bg-[#c9a24b] after:transition-transform after:duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e6c877] ${
      isActive
        ? 'text-white after:scale-x-100'
        : 'text-white/80 hover:text-white after:scale-x-0 hover:after:scale-x-100'
    }`;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Manrope:wght@400;500;600;700&display=swap');
        @media (prefers-reduced-motion: reduce){.nav-anim{transition:none!important}}
      `}</style>

      <header
        style={body}
        className={`nav-anim fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          hidden && !open ? '-translate-y-full' : 'translate-y-0'
        } ${solid ? 'bg-[#082a1f]/90 py-3 shadow-lg shadow-[#082a1f]/25 backdrop-blur-xl' : 'bg-transparent py-5'}`}
      >
        <nav aria-label={t('Public navigation')} className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 sm:gap-6 sm:px-5 lg:px-8">
          {/* Brand */}
          <Link to="/" className={`flex min-w-0 items-center gap-2 text-white sm:gap-3 ${focusRing} rounded-lg`}>
            <img src={LOGO} alt="" className="h-11 w-8 shrink-0 object-contain sm:h-12" />
            <span className="leading-none">
              <span className="block text-xl sm:text-2xl" style={display}>Habibi Adventure</span>
              <span className="mt-1 block text-[10px] text-white/70">{t('Journeys worth taking')}</span>
            </span>
          </Link>

          {/* Desktop links */}
          <ul className="hidden items-center gap-5 xl:gap-7 lg:flex">
            {LINKS.map(({ to, label }) => (
              <li key={to}><NavLink to={to} className={linkClass}>{t(label)}</NavLink></li>
            ))}
          </ul>

          {/* Desktop actions */}
          <div className="hidden items-center gap-3 lg:flex">
            <LanguageMenu forceClose={hidden} />
            <Link
              to="/packages"
              className={`inline-flex items-center gap-2 rounded-full bg-[#c9a24b] px-5 py-2.5 text-sm font-semibold text-[#082a1f] transition hover:bg-[#e6c877] ${focusRing}`}
            >
              {t('Plan your trip')} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Mobile actions */}
          <div className="ml-auto flex items-center gap-2 lg:hidden">
            <LanguageMenu forceClose={hidden || open} />
            <button
              onClick={() => setOpen((o) => !o)}
              aria-label={t(open ? 'Close menu' : 'Open menu')}
              aria-expanded={open}
              aria-controls="mobile-menu"
              className={`rounded-full p-2.5 text-white ring-1 ring-white/25 transition hover:bg-white/10 ${focusRing}`}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
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
                      {t(label)}
                      <ArrowRight className="h-4 w-4 opacity-60" />
                    </NavLink>
                  </li>
                ))}
              </ul>

              <div className="mt-3 border-t border-white/10 p-2 pt-4">
                <Link
                  to="/packages"
                  tabIndex={open ? 0 : -1}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#c9a24b] px-4 py-3.5 text-sm font-semibold text-[#082a1f]"
                >
                  {t('Plan your trip')} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <p className="flex items-center justify-center gap-4 px-2 pb-2 pt-3 text-xs text-white/60">
                <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-[#c9a24b]" /> {t('Tangier, Morocco')}</span>
                <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-[#c9a24b]" /> {t('24/7 support')}</span>
              </p>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}