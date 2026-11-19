import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, ArrowUp, Camera, UsersRound, Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LOGO from '../../assets/logo.png';

const footerSections = [
  {
    title: 'Explore',
    links: [
      ['Home', '/'],
      ['Packages', '/packages'],
    ],
  },
  {
    title: 'Help & information',
    links: [
      ['About us', '/about'],
      ['Contact', '/contact'],
      ['FAQs', '/faqs'],
      ['Terms & conditions', '/terms'],
      ['Privacy policy', '/privacy'],
    ],
  },
];

/* Edit once: the footer reads everything from here. */
const CONTACT = {
  phone: '+212 529-808080',
  phoneHref: 'tel:+212529808080',
  email: 'concierge@skyview-travel.com',
  address: 'Tangier, Morocco',
};

const SOCIALS = [
  { icon: Camera, label: 'Instagram', href: '#' },
  { icon: UsersRound, label: 'Facebook', href: '#' },
  { icon: Play, label: 'YouTube', href: '#' },
];

const display = { fontFamily: "'Fraunces', Georgia, serif" };
const body = { fontFamily: "'Manrope', system-ui, sans-serif" };
const ring = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e6c877]';

export default function PublicFooter() {
  const { t } = useTranslation();

  return (
    <footer className="bg-[#061f17] text-white/70" style={body}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Manrope:wght@400;500;600;700&display=swap');`}</style>

      {/* Main grid */}
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-14 sm:grid-cols-2 lg:grid-cols-[1.5fr_0.7fr_1fr] lg:px-8">
        <div className="sm:col-span-2 lg:col-span-1">
          <Link to="/" className={`inline-flex items-center gap-3 rounded-lg text-white ${ring}`}>
            <img src={LOGO} alt="" className="h-14 w-10 object-contain" />
            <span className="text-2xl" style={display}>Habibi Adventure</span>
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed">
            {t('Journeys worth taking, thoughtfully planned by people who know Morocco.')}
          </p>

          <ul className="mt-6 space-y-3 text-sm">
            <li>
              <a href={CONTACT.phoneHref} className={`inline-flex items-center gap-3 rounded transition hover:text-[#e6c877] ${ring}`}>
                <Phone className="h-4 w-4 text-[#c9a24b]" /> {CONTACT.phone}
              </a>
            </li>
            <li>
              <a href={`mailto:${CONTACT.email}`} className={`inline-flex items-center gap-3 rounded transition hover:text-[#e6c877] ${ring}`}>
                <Mail className="h-4 w-4 text-[#c9a24b]" /> {CONTACT.email}
              </a>
            </li>
            <li className="inline-flex items-center gap-3">
              <MapPin className="h-4 w-4 text-[#c9a24b]" /> {t(CONTACT.address)}
            </li>
          </ul>

          <div className="mt-6 flex gap-3">
            {SOCIALS.map(({ icon: Icon, label, href }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                className={`grid h-10 w-10 place-items-center rounded-full ring-1 ring-white/20 transition hover:bg-[#c9a24b] hover:text-[#082a1f] hover:ring-[#c9a24b] ${ring}`}
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        {footerSections.map(({ title, links }) => (
          <nav key={title} aria-label={t(title)}>
            <h2 className="text-base text-white" style={display}>{t(title)}</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {links.map(([label, to]) => (
                <li key={to}>
                  <Link to={to} className={`rounded transition hover:text-[#e6c877] ${ring}`}>
                    {t(label)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 py-6 text-xs sm:flex-row lg:px-8">
          <p>© {new Date().getFullYear()} Habibi Adventure. {t('All rights reserved.')}</p>

          <p>
            {t('Made by')}{' '}
            <a
              href="https://wellmadedigital.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className={`rounded font-semibold text-[#e6c877] transition hover:text-white ${ring}`}
            >
              WellMadeDigital
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </p>

          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 font-semibold text-white ring-1 ring-white/20 transition hover:bg-[#c9a24b] hover:text-[#082a1f] hover:ring-[#c9a24b] ${ring}`}
          >
            {t('Back to top')} <ArrowUp className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </footer>
  );
}