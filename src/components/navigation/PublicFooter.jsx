import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Mail, Phone, MapPin, ArrowRight, ArrowUp, Check, Loader2, AlertCircle,
  Camera, UsersRound, Play,
} from 'lucide-react';
import LOGO from '../../assets/logo.png';

const footerSections = [
  {
    title: 'Explore',
    links: [
      ['Home', '/'],
      ['Destinations', '/destinations'],
      ['Packages', '/packages'],
      ['Flights', '/flights'],
      ['Hotels', '/hotels'],
      ['Excursions', '/excursions'],
    ],
  },
  {
    title: 'Travel services',
    links: [
      ['All services', '/services'],
      ['Transportation', '/transportation'],
      ['Visa assistance', '/visa-assistance'],
      ['Umrah & Hajj', '/umrah-hajj'],
      ['Travel insurance', '/travel-insurance'],
      ['Custom travel', '/custom-travel'],
    ],
  },
  {
    title: 'Help & information',
    links: [
      ['About us', '/about'],
      ['Contact', '/contact'],
      ['FAQs', '/faqs'],
      ['Booking request', '/booking-request'],
      ['Custom trip inquiry', '/custom-trip-inquiry'],
      ['Travel guides', '/blog'],
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

/**
 * Replace with your real newsletter endpoint. Resolve on success, throw on failure.
 */
async function subscribeToNewsletter(email) {
  // TODO: connect to your backend or email provider. Simulated for now.
  await new Promise((r) => setTimeout(r, 700));
  return email;
}

export default function PublicFooter() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | invalid | sending | done | error

  const onSubscribe = async (e) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setStatus('invalid');
    setStatus('sending');
    try {
      await subscribeToNewsletter(email);
      setStatus('done');
      setEmail('');
    } catch (err) {
      console.error('Newsletter signup failed:', err);
      setStatus('error');
    }
  };

  return (
    <footer className="bg-[#061f17] text-white/70" style={body}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Manrope:wght@400;500;600;700&display=swap');`}</style>

      {/* Newsletter band */}
      <div className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-5 py-12 lg:flex-row lg:items-center lg:px-8">
          <div className="max-w-md">
            <h2 className="text-3xl text-white" style={display}>Get trip ideas and early deals</h2>
            <p className="mt-2 text-sm leading-relaxed">One email a month. No spam, and you can unsubscribe any time.</p>
          </div>

          <form onSubmit={onSubscribe} noValidate className="w-full lg:max-w-md" aria-label="Newsletter signup">
            <div className="flex gap-2 rounded-full bg-white/5 p-1.5 ring-1 ring-white/15 focus-within:ring-2 focus-within:ring-[#c9a24b]">
              <label className="sr-only" htmlFor="footer-email">Email address</label>
              <input
                id="footer-email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (status !== 'idle' && status !== 'sending') setStatus('idle'); }}
                placeholder="Enter your email"
                autoComplete="email"
                aria-invalid={status === 'invalid'}
                aria-describedby="footer-email-status"
                className="min-w-0 flex-1 bg-transparent px-4 text-sm text-white outline-none placeholder:text-white/40"
              />
              <button
                type="submit"
                disabled={status === 'sending'}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full bg-[#c9a24b] px-5 py-3 text-sm font-bold text-[#082a1f] transition hover:bg-[#e6c877] disabled:cursor-wait disabled:opacity-70 ${ring}`}
              >
                {status === 'sending' ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Subscribe <ArrowRight className="h-4 w-4" /></>}
              </button>
            </div>
            <p id="footer-email-status" className="mt-2 min-h-5 pl-4 text-xs" role="status" aria-live="polite">
              {status === 'invalid' && <span className="inline-flex items-center gap-1.5 text-rose-300"><AlertCircle className="h-3.5 w-3.5" /> Enter a valid email, like name@example.com.</span>}
              {status === 'error' && <span className="inline-flex items-center gap-1.5 text-rose-300"><AlertCircle className="h-3.5 w-3.5" /> Something went wrong. Please try again.</span>}
              {status === 'done' && <span className="inline-flex items-center gap-1.5 text-[#e6c877]"><Check className="h-3.5 w-3.5" /> You’re on the list. Check your inbox to confirm.</span>}
            </p>
          </form>
        </div>
      </div>

      {/* Main grid */}
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-14 sm:grid-cols-2 lg:grid-cols-[1.5fr_repeat(3,1fr)] lg:px-8">
        <div className="sm:col-span-2 lg:col-span-1">
          <Link to="/" className={`inline-flex items-center gap-3 rounded-lg text-white ${ring}`}>
            <img src={LOGO} alt="" className="h-14 w-10 object-contain" />
            <span className="text-2xl" style={display}>Habibi Adventure</span>
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed">
            Journeys worth taking, thoughtfully planned by people who know Morocco.
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
              <MapPin className="h-4 w-4 text-[#c9a24b]" /> {CONTACT.address}
            </li>
          </ul>

          <div className="mt-6 flex gap-3">
            {SOCIALS.map(({ icon: Icon, label, href }) => (
              <a key={label} href={href} aria-label={label} className={`grid h-10 w-10 place-items-center rounded-full ring-1 ring-white/20 transition hover:bg-[#c9a24b] hover:text-[#082a1f] hover:ring-[#c9a24b] ${ring}`}>
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        {footerSections.map(({ title, links }) => (
          <nav key={title} aria-label={title}>
            <h2 className="text-base text-white" style={display}>{title}</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {links.map(([label, to]) => (
                <li key={to}>
                  <Link to={to} className={`group inline-flex items-center gap-1.5 rounded transition hover:text-[#e6c877] ${ring}`}>
                    <span className="h-px w-0 bg-[#c9a24b] transition-all duration-300 group-hover:w-3" aria-hidden="true" />
                    {label}
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
          <p>© {new Date().getFullYear()} Habibi Adventure. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link to="/privacy" className={`rounded hover:text-white ${ring}`}>Privacy policy</Link>
            <Link to="/terms" className={`rounded hover:text-white ${ring}`}>Terms and conditions</Link>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 font-semibold text-white ring-1 ring-white/20 transition hover:bg-[#c9a24b] hover:text-[#082a1f] hover:ring-[#c9a24b] ${ring}`}
            >
              Back to top <ArrowUp className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}