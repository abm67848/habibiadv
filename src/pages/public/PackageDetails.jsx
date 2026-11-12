import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import {
  Calendar, Clock, MapPin, Users, Check, X, ArrowLeft, Phone, Mail, CalendarCheck,
  AlertCircle, Minus, Plus, Share2, ChevronDown, ChevronLeft, ChevronRight, Images,
  ShieldCheck, Eye, ArrowRight,
} from 'lucide-react';
import { getPackageDetailsByIdOrRef } from '@/services/packages/index.jsx';
import { useAuth } from '@/context/index.jsx';

const display = { fontFamily: "'Fraunces', Georgia, serif" };
const body = { fontFamily: "'Manrope', system-ui, sans-serif" };
const ring = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a24b]';

const TAB_LABELS = {
  itinerary: 'Itinerary',
  inclusions: 'Included',
  departures: 'Departures',
};

const fmtDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
};

const seatsLeft = (dep) =>
  dep?.max_capacity != null ? Math.max(0, dep.max_capacity - (dep.reserved_capacity || 0)) : null;

function Card({ children, className = '' }) {
  return <div className={`rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#0f3d2e]/10 sm:p-8 ${className}`}>{children}</div>;
}

export default function PackageDetailsPage() {
  const { packageId } = useParams();
  const [searchParams] = useSearchParams();
  const previewMode = searchParams.get('preview') === 'true';
  const { isAdmin, loading: authLoading } = useAuth();

  const [pkg, setPkg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedDeparture, setSelectedDeparture] = useState(null);
  const [travelerCount, setTravelerCount] = useState(2);
  const [activeTab, setActiveTab] = useState('itinerary');
  const [openDays, setOpenDays] = useState(() => new Set());
  const [lightbox, setLightbox] = useState(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({ name: '', contact: '' });
  const [formError, setFormError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      if (previewMode && authLoading) return;
      setLoading(true);
      setError(null);
      if (previewMode && !isAdmin) {
        setPkg(null);
        setError('Sign in with an administrator account to preview draft offers.');
        setLoading(false);
        return;
      }
      try {
        const data = await getPackageDetailsByIdOrRef(packageId, { preview: previewMode });
        setPkg(data);
        setSelectedDeparture(data?.departures?.[0] || null);
        const min = Number(data?.min_travelers) || 1;
        const max = Number(data?.max_travelers) || Infinity;
        setTravelerCount(Math.max(min, Math.min(2, max)));
        const visibility = data?.landing_page?.section_visibility || {};
        const firstVisibleTab = ['itinerary', 'inclusions', 'departures'].find((tab) => visibility[tab] !== false);
        if (firstVisibleTab) setActiveTab(firstVisibleTab);
        const firstDay = data?.itinerary?.[0]?.id;
        setOpenDays(firstDay != null ? new Set([firstDay]) : new Set());
      } catch (err) {
        console.error('Failed to load package details:', err);
        setError('Could not load package details.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [packageId, previewMode, isAdmin, authLoading]);

  const gallery = useMemo(() => {
    if (!pkg) return [];
    const all = [pkg.cover_image_url, ...(Array.isArray(pkg.gallery) ? pkg.gallery : [])].filter(Boolean);
    return [...new Set(all)];
  }, [pkg]);

  /* Lightbox keyboard controls */
  useEffect(() => {
    if (lightbox == null) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setLightbox(null);
      if (e.key === 'ArrowRight') setLightbox((i) => (i + 1) % gallery.length);
      if (e.key === 'ArrowLeft') setLightbox((i) => (i - 1 + gallery.length) % gallery.length);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [lightbox, gallery.length]);

  const toggleDay = (id) =>
    setOpenDays((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const share = useCallback(async () => {
    const url = window.location.href.replace(/[?&]preview=true/, '');
    try {
      if (navigator.share) await navigator.share({ title: pkg?.public_title, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      /* share dismissed */
    }
  }, [pkg]);

  /* ------------------------------ states ------------------------------ */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f3f6f1]" style={body} aria-busy="true">
        <div className="h-[52vh] min-h-[420px] animate-pulse bg-[#0f3d2e]/90" />
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-10 lg:grid-cols-3 lg:px-8">
          <div className="space-y-6 lg:col-span-2">
            <div className="h-48 animate-pulse rounded-3xl bg-white" />
            <div className="h-72 animate-pulse rounded-3xl bg-white" />
          </div>
          <div className="h-96 animate-pulse rounded-3xl bg-white" />
        </div>
        <p className="sr-only" role="status">Loading package details</p>
      </div>
    );
  }

  if (error || !pkg) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3f6f1] p-6" style={body}>
        <div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-xl ring-1 ring-[#0f3d2e]/10">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-rose-50 text-rose-600"><AlertCircle className="h-7 w-7" /></span>
          <h2 className="mt-5 text-2xl text-[#0a2a20]" style={display}>We couldn’t find this package</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {error || 'It may have been unpublished or the link may be wrong. Browse the catalog to find another trip.'}
          </p>
          <Link to="/packages" className={`mt-6 inline-flex items-center gap-2 rounded-full bg-[#0f3d2e] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1f6b4f] ${ring}`}>
            <ArrowLeft className="h-4 w-4" /> Back to packages
          </Link>
        </div>
      </div>
    );
  }

  /* ------------------------------ derived ------------------------------ */
  const adultPriceRule = pkg.pricing_rules?.find((rule) => rule.price_type === 'adult');
  const effectivePrice = selectedDeparture?.selling_price_override ?? pkg.starting_price ?? adultPriceRule?.amount;
  const totalPrice = effectivePrice == null ? null : Number(effectivePrice) * travelerCount;
  const effectiveCurrency = selectedDeparture?.currency || adultPriceRule?.currency || pkg.default_currency || 'MAD';
  const nights = pkg.duration_nights ?? pkg.duration_days - 1;
  const landingPage = pkg.landing_page || {};
  const sectionVisibility =
    landingPage.section_visibility && typeof landingPage.section_visibility === 'object' ? landingPage.section_visibility : {};
  const isSectionVisible = (name) => sectionVisibility[name] !== false;
  const visibleTabs = ['itinerary', 'inclusions', 'departures'].filter(isSectionVisible);

  const formatCurrency = (amount, currency = pkg.default_currency || 'MAD') => {
    if (amount == null || amount === '') return 'Price on request';
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(amount));
    } catch {
      return `${currency} ${Number(amount).toLocaleString()}`;
    }
  };

  const minTravelers = Number(pkg.min_travelers) || 1;
  const selectedSeats = seatsLeft(selectedDeparture);
  const maxTravelers = Math.min(Number(pkg.max_travelers) || Infinity, selectedSeats ?? Infinity);
  const soldOut = selectedSeats === 0;
  const faqs = Array.isArray(landingPage.faqs) ? landingPage.faqs : [];
  const hasPolicies = landingPage.terms_and_conditions || landingPage.cancellation_policy;
  const heroImage = gallery[0];

  const setCount = (n) => setTravelerCount(Math.max(minTravelers, Math.min(n, maxTravelers)));

  const selectDeparture = (dep) => {
    setSelectedDeparture(dep);
    const cap = Math.min(Number(pkg.max_travelers) || Infinity, seatsLeft(dep) ?? Infinity);
    setTravelerCount((c) => Math.max(minTravelers, Math.min(c, cap)));
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (soldOut) return;
    if (!form.name.trim() || !form.contact.trim()) {
      setFormError('Add your name and an email or phone number so we can reach you.');
      return;
    }
    setFormError('');
    setBookingSuccess(true);
  };

  const scrollToBooking = () => document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  /* ------------------------------ render ------------------------------ */
  return (
    <div className="min-h-screen bg-[#f3f6f1] pb-24 text-slate-700 antialiased lg:pb-0" style={body}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Manrope:wght@400;500;600;700&display=swap');
        @keyframes drift{from{transform:scale(1.04)}to{transform:scale(1.1)}}
        @media (prefers-reduced-motion: reduce){*{animation:none!important;transition:none!important}}
      `}</style>

      {previewMode && (
        <div className="fixed left-1/2 top-20 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full bg-[#e6c877] px-5 py-2 text-xs font-semibold text-[#082a1f] shadow-lg">
          <Eye className="h-4 w-4" /> Admin preview. This offer is not public.
          <Link to={`/admin/packages-services/${packageId}`} className="underline underline-offset-2">Back to editor</Link>
        </div>
      )}

      {/* HERO */}
      <header className="relative isolate h-[56vh] min-h-[440px] w-full overflow-hidden bg-[#082a1f]">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#082a1f] via-[#1f6b4f] to-[#c9a24b]" />
        {heroImage && (
          <img src={heroImage} alt={pkg.public_title} className="absolute inset-0 -z-10 h-full w-full object-cover" style={{ animation: 'drift 26s ease-in-out infinite alternate' }} />
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#082a1f] via-[#082a1f]/55 to-[#082a1f]/20" />

        <div className="mx-auto flex h-full max-w-7xl flex-col justify-between px-5 pb-10 pt-28 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <Link to="/packages" className={`inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-white/25 ${ring}`}>
              <ArrowLeft className="h-3.5 w-3.5" /> All packages
            </Link>
            <div className="flex items-center gap-2">
              {gallery.length > 1 && (
                <button onClick={() => setLightbox(0)} className={`inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-white/25 ${ring}`}>
                  <Images className="h-3.5 w-3.5" /> {gallery.length} photos
                </button>
              )}
              <button onClick={share} className={`inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-white/25 ${ring}`}>
                {copied ? <Check className="h-3.5 w-3.5 text-[#e6c877]" /> : <Share2 className="h-3.5 w-3.5" />}
                {copied ? 'Link copied' : 'Share'}
              </button>
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#c9a24b] px-3 py-1 text-xs font-bold text-[#082a1f]">{pkg.package_category || 'Travel offer'}</span>
              {pkg.destination_country && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">
                  <MapPin className="h-3.5 w-3.5 text-[#e6c877]" /> {pkg.destination_country}
                </span>
              )}
              {pkg.reference && <span className="text-xs text-white/70">Ref {pkg.reference}</span>}
            </div>
            <h1 className="mt-4 max-w-3xl text-4xl leading-[1.08] text-white sm:text-5xl lg:text-6xl" style={display}>
              {landingPage.hero_heading || pkg.public_title}
            </h1>
            {(landingPage.hero_subtitle || pkg.short_description) && (
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/85">{landingPage.hero_subtitle || pkg.short_description}</p>
            )}
            <div className="mt-5 flex flex-wrap items-center gap-x-7 gap-y-2 text-sm text-white/90">
              <span className="flex items-center gap-2"><Clock className="h-4 w-4 text-[#e6c877]" /> {pkg.duration_days} days, {nights} nights</span>
              {(pkg.min_travelers || pkg.max_travelers) && (
                <span className="flex items-center gap-2"><Users className="h-4 w-4 text-[#e6c877]" /> {pkg.min_travelers || '1'} to {pkg.max_travelers || '—'} guests</span>
              )}
              {selectedDeparture && (
                <span className="flex items-center gap-2"><Calendar className="h-4 w-4 text-[#e6c877]" /> Next departure {fmtDate(selectedDeparture.departure_date)}</span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* BODY */}
      <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
          {/* Left column */}
          <div className="space-y-8 lg:col-span-2">
            {isSectionVisible('overview') && (
              <Card>
                <h2 className="text-3xl text-[#0a2a20]" style={display}>About this journey</h2>
                <p className="mt-4 whitespace-pre-line text-[15px] leading-7 text-slate-600">
                  {landingPage.public_introduction || pkg.full_description || pkg.short_description || 'Offer details are being prepared.'}
                </p>

                {Array.isArray(pkg.highlights) && pkg.highlights.length > 0 && (
                  <div className="mt-7 border-t border-[#0f3d2e]/10 pt-7">
                    <h3 className="text-lg text-[#0a2a20]" style={display}>Highlights</h3>
                    <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                      {pkg.highlights.map((h, i) => (
                        <li key={i} className="flex items-start gap-3 rounded-2xl bg-[#f3f6f1] p-3.5 text-sm text-slate-700">
                          <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#c9a24b] text-[#082a1f]"><Check className="h-3 w-3" strokeWidth={3} /></span>
                          <span className="leading-snug">{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>
            )}

            {/* Gallery strip */}
            {gallery.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {gallery.slice(0, 4).map((src, i) => (
                  <button key={src} onClick={() => setLightbox(i)} className={`group relative aspect-[4/3] overflow-hidden rounded-2xl ${ring}`} aria-label={`Open photo ${i + 1}`}>
                    <img src={src} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                    {i === 3 && gallery.length > 4 && (
                      <span className="absolute inset-0 grid place-items-center bg-[#082a1f]/65 text-sm font-semibold text-white">+{gallery.length - 4} more</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Tabs */}
            {visibleTabs.length > 0 && (
              <div id="package-tabs" className="scroll-mt-28">
                <div role="tablist" aria-label="Package details" className="flex gap-1 overflow-x-auto rounded-full bg-white p-1.5 ring-1 ring-[#0f3d2e]/10">
                  {visibleTabs.map((tab) => {
                    const count = tab === 'itinerary' ? pkg.itinerary?.length : tab === 'departures' ? pkg.departures?.length : null;
                    return (
                      <button
                        key={tab}
                        role="tab"
                        aria-selected={activeTab === tab}
                        onClick={() => setActiveTab(tab)}
                        className={`whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold transition ${ring} ${
                          activeTab === tab ? 'bg-[#0f3d2e] text-white' : 'text-slate-600 hover:bg-[#f3f6f1]'
                        }`}
                      >
                        {TAB_LABELS[tab]}{count ? <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] ${activeTab === tab ? 'bg-[#c9a24b] text-[#082a1f]' : 'bg-[#f3f6f1] text-slate-500'}`}>{count}</span> : null}
                      </button>
                    );
                  })}
                </div>

                {/* Itinerary */}
                {isSectionVisible('itinerary') && activeTab === 'itinerary' && (
                  <Card className="mt-4">
                    {pkg.itinerary?.length > 0 ? (
                      <>
                        <div className="mb-6 flex items-center justify-between">
                          <h2 className="text-2xl text-[#0a2a20]" style={display}>Day by day</h2>
                          <button
                            onClick={() => setOpenDays(openDays.size === pkg.itinerary.length ? new Set() : new Set(pkg.itinerary.map((d) => d.id)))}
                            className="text-sm font-semibold text-[#9c7a2b] hover:underline"
                          >
                            {openDays.size === pkg.itinerary.length ? 'Collapse all' : 'Expand all'}
                          </button>
                        </div>
                        <ol className="relative space-y-4 before:absolute before:bottom-4 before:left-[19px] before:top-4 before:w-px before:bg-[#c9a24b]/50">
                          {pkg.itinerary.map((day) => {
                            const isOpen = openDays.has(day.id);
                            return (
                              <li key={day.id} className="relative flex gap-4">
                                <span className="z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#0f3d2e] text-sm font-bold text-[#e6c877] ring-4 ring-white">{day.day_number}</span>
                                <div className="min-w-0 flex-1 rounded-2xl bg-[#f3f6f1] transition">
                                  <button onClick={() => toggleDay(day.id)} aria-expanded={isOpen} className={`flex w-full items-center justify-between gap-3 rounded-2xl p-4 text-left ${ring}`}>
                                    <span>
                                      <span className="block text-base font-semibold text-[#0a2a20]">{day.title}</span>
                                      {day.destination && (
                                        <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[#9c7a2b]"><MapPin className="h-3 w-3" />{day.destination}</span>
                                      )}
                                    </span>
                                    <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                  </button>
                                  {isOpen && <p className="whitespace-pre-line px-4 pb-4 text-sm leading-relaxed text-slate-600">{day.description}</p>}
                                </div>
                              </li>
                            );
                          })}
                        </ol>
                      </>
                    ) : (
                      <p className="text-sm text-slate-500">The detailed day plan is sent with your quote. Ask us and we’ll share it.</p>
                    )}
                  </Card>
                )}

                {/* Inclusions */}
                {isSectionVisible('inclusions') && activeTab === 'inclusions' && (
                  <Card className="mt-4">
                    <div className="grid gap-8 md:grid-cols-2">
                      {[
                        { title: 'What’s included', items: pkg.inclusions, icon: Check, tone: 'bg-[#0f3d2e] text-[#e6c877]', head: 'text-[#0f3d2e]' },
                        { title: 'Not included', items: pkg.exclusions, icon: X, tone: 'bg-rose-50 text-rose-600', head: 'text-rose-700' },
                      ].map(({ title, items, icon: Icon, tone, head }) => (
                        <div key={title}>
                          <h3 className={`text-xl ${head}`} style={display}>{title}</h3>
                          <ul className="mt-4 space-y-3 text-sm text-slate-700">
                            {items?.length > 0 ? (
                              items.map((item) => (
                                <li key={item.id} className="flex items-start gap-3">
                                  <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${tone}`}><Icon className="h-3 w-3" strokeWidth={3} /></span>
                                  <span className="leading-snug">{item.description}</span>
                                </li>
                              ))
                            ) : (
                              <li className="text-slate-500">Your travel advisor will confirm the details.</li>
                            )}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Departures */}
                {isSectionVisible('departures') && activeTab === 'departures' && (
                  <Card className="mt-4">
                    <h2 className="text-2xl text-[#0a2a20]" style={display}>Choose your departure</h2>
                    {pkg.departures?.length > 0 ? (
                      <div role="radiogroup" aria-label="Departure dates" className="mt-5 space-y-3">
                        {pkg.departures.map((dep) => {
                          const isSelected = selectedDeparture?.id === dep.id;
                          const left = seatsLeft(dep);
                          const full = left === 0;
                          return (
                            <button
                              key={dep.id}
                              role="radio"
                              aria-checked={isSelected}
                              disabled={full}
                              onClick={() => selectDeparture(dep)}
                              className={`flex w-full items-center justify-between gap-4 rounded-2xl p-4 text-left transition ${ring} ${
                                full ? 'cursor-not-allowed bg-slate-50 opacity-60' : isSelected ? 'bg-[#f3f6f1] ring-2 ring-[#c9a24b]' : 'ring-1 ring-[#0f3d2e]/10 hover:ring-[#c9a24b]'
                              }`}
                            >
                              <span className="flex items-center gap-3">
                                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${isSelected ? 'bg-[#c9a24b] text-[#082a1f]' : 'bg-[#0f3d2e] text-[#e6c877]'}`}>
                                  <CalendarCheck className="h-4 w-4" />
                                </span>
                                <span>
                                  <span className="block text-sm font-semibold text-[#0a2a20]">{fmtDate(dep.departure_date)} to {fmtDate(dep.return_date)}</span>
                                  <span className={`block text-xs ${left != null && left > 0 && left <= 5 ? 'font-semibold text-[#9c7a2b]' : 'text-slate-500'}`}>
                                    {left == null ? 'Capacity confirmed on request' : left === 0 ? 'Sold out' : left <= 5 ? `Only ${left} seats left` : `${left} seats remaining`}
                                  </span>
                                </span>
                              </span>
                              <span className="text-right">
                                <span className="block text-base font-bold text-[#0a2a20]">{formatCurrency(dep.selling_price_override ?? pkg.starting_price, dep.currency || pkg.default_currency)}</span>
                                <span className="text-xs text-slate-500">{isSelected ? 'Selected' : 'per traveler'}</span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-slate-500">This trip runs privately on demand. Contact us and we’ll set dates around yours.</p>
                    )}
                  </Card>
                )}
              </div>
            )}

            {/* FAQs & policies */}
            {isSectionVisible('faqs') && (faqs.length > 0 || hasPolicies) && (
              <div className="space-y-6">
                {faqs.length > 0 && (
                  <Card>
                    <h2 className="text-3xl text-[#0a2a20]" style={display}>Questions, answered</h2>
                    <div className="mt-5 divide-y divide-[#0f3d2e]/10">
                      {faqs.map((faq, index) => (
                        <details key={faq.id || index} className="group py-4">
                          <summary className={`flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-[#0a2a20] ${ring} rounded`}>
                            {faq.question || faq.title || `Question ${index + 1}`}
                            <ChevronDown className="h-5 w-5 shrink-0 text-[#c9a24b] transition-transform group-open:rotate-180" />
                          </summary>
                          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">{faq.answer || faq.description || ''}</p>
                        </details>
                      ))}
                    </div>
                  </Card>
                )}
                {hasPolicies && (
                  <Card className="grid gap-8 sm:grid-cols-2">
                    {landingPage.terms_and_conditions && (
                      <div>
                        <h2 className="text-xl text-[#0a2a20]" style={display}>Terms and conditions</h2>
                        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">{landingPage.terms_and_conditions}</p>
                      </div>
                    )}
                    {landingPage.cancellation_policy && (
                      <div>
                        <h2 className="text-xl text-[#0a2a20]" style={display}>Cancellation policy</h2>
                        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">{landingPage.cancellation_policy}</p>
                      </div>
                    )}
                  </Card>
                )}
              </div>
            )}
          </div>

          {/* Right column: booking widget */}
          {isSectionVisible('booking_widget') && (
            <aside id="booking" className="scroll-mt-28">
              <div className="rounded-3xl bg-white p-6 shadow-2xl shadow-[#0f3d2e]/10 ring-1 ring-[#0f3d2e]/10 lg:sticky lg:top-28">
                <div className="flex items-end justify-between border-b border-[#0f3d2e]/10 pb-5">
                  <div>
                    <p className="text-xs text-slate-500">From, per traveler</p>
                    <p className="text-3xl font-bold text-[#0a2a20]" style={display}>{formatCurrency(effectivePrice, effectiveCurrency)}</p>
                  </div>
                  {selectedSeats != null && selectedSeats > 0 && selectedSeats <= 5 && (
                    <span className="rounded-full bg-[#c9a24b]/20 px-3 py-1 text-xs font-semibold text-[#7a5c17]">{selectedSeats} seats left</span>
                  )}
                </div>

                {bookingSuccess ? (
                  <div className="mt-6 text-center" role="status">
                    <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#0f3d2e] text-[#e6c877]"><Check className="h-7 w-7" /></span>
                    <h3 className="mt-4 text-xl text-[#0a2a20]" style={display}>Request received</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      We logged your request for {pkg.public_title}. A concierge will contact you at {form.contact} to confirm availability and final price.
                    </p>
                    <button onClick={() => setBookingSuccess(false)} className={`mt-5 text-sm font-semibold text-[#9c7a2b] hover:underline ${ring} rounded`}>Make another request</button>
                  </div>
                ) : (
                  <form onSubmit={onSubmit} noValidate className="mt-6 space-y-5 text-sm">
                    {/* Departure */}
                    <div>
                      <p className="font-semibold text-slate-800">Departure</p>
                      <div className="mt-2 flex items-center justify-between rounded-2xl bg-[#f3f6f1] p-3.5">
                        {selectedDeparture ? (
                          <>
                            <span className="font-semibold text-[#0a2a20]">{fmtDate(selectedDeparture.departure_date)}</span>
                            <span className="text-slate-500">to {fmtDate(selectedDeparture.return_date)}</span>
                          </>
                        ) : (
                          <span className="text-slate-500">Private custom date</span>
                        )}
                      </div>
                      {visibleTabs.includes('departures') && pkg.departures?.length > 1 && (
                        <button type="button" onClick={() => { setActiveTab('departures'); document.getElementById('package-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} className="mt-2 text-xs font-semibold text-[#9c7a2b] hover:underline">
                          Change date
                        </button>
                      )}
                    </div>

                    {/* Travelers */}
                    <div>
                      <p className="font-semibold text-slate-800" id="traveler-label">Travelers</p>
                      <div className="mt-2 flex items-center justify-between rounded-2xl bg-[#f3f6f1] p-2" role="group" aria-labelledby="traveler-label">
                        <button type="button" aria-label="Remove a traveler" disabled={travelerCount <= minTravelers} onClick={() => setCount(travelerCount - 1)} className={`grid h-10 w-10 place-items-center rounded-xl bg-white shadow-sm transition hover:bg-[#0f3d2e] hover:text-white disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-inherit ${ring}`}>
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="font-semibold text-[#0a2a20]" aria-live="polite">{travelerCount} {travelerCount === 1 ? 'traveler' : 'travelers'}</span>
                        <button type="button" aria-label="Add a traveler" disabled={travelerCount >= maxTravelers} onClick={() => setCount(travelerCount + 1)} className={`grid h-10 w-10 place-items-center rounded-xl bg-white shadow-sm transition hover:bg-[#0f3d2e] hover:text-white disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-inherit ${ring}`}>
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      {Number.isFinite(maxTravelers) && travelerCount >= maxTravelers && (
                        <p className="mt-2 text-xs text-slate-500">That’s the maximum for this departure.</p>
                      )}
                    </div>

                    {/* Contact */}
                    <div className="space-y-3">
                      <label className="block">
                        <span className="font-semibold text-slate-800">Your name</span>
                        <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} autoComplete="name" className={`mt-2 w-full rounded-2xl border-0 bg-[#f3f6f1] p-3.5 text-slate-800 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-[#c9a24b]`} placeholder="Full name" />
                      </label>
                      <label className="block">
                        <span className="font-semibold text-slate-800">Email or phone</span>
                        <input value={form.contact} onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))} autoComplete="email" className={`mt-2 w-full rounded-2xl border-0 bg-[#f3f6f1] p-3.5 text-slate-800 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-[#c9a24b]`} placeholder="How should we reach you?" />
                      </label>
                      {formError && <p className="text-xs font-medium text-rose-700" role="alert">{formError}</p>}
                    </div>

                    {/* Price summary */}
                    <dl className="space-y-2 border-t border-[#0f3d2e]/10 pt-5 text-slate-600">
                      <div className="flex justify-between gap-4">
                        <dt>{formatCurrency(effectivePrice, effectiveCurrency)} × {travelerCount}</dt>
                        <dd className="font-semibold text-slate-900">{formatCurrency(totalPrice, effectiveCurrency)}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt>Final charges</dt>
                        <dd className="text-right text-slate-700">Confirmed before you pay</dd>
                      </div>
                      <div className="flex justify-between border-t border-[#0f3d2e]/10 pt-3 text-base font-bold text-[#0a2a20]">
                        <dt>Estimated total</dt>
                        <dd>{formatCurrency(totalPrice, effectiveCurrency)}</dd>
                      </div>
                    </dl>

                    <button
                      type="submit"
                      disabled={soldOut}
                      className={`inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#c9a24b] py-4 text-sm font-bold text-[#082a1f] shadow-lg shadow-[#c9a24b]/30 transition hover:bg-[#e6c877] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none ${ring}`}
                    >
                      {soldOut ? 'This departure is sold out' : <>Request this trip <ArrowRight className="h-4 w-4" /></>}
                    </button>
                    <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500"><ShieldCheck className="h-3.5 w-3.5 text-[#0f3d2e]" /> No payment now. We confirm availability first.</p>
                  </form>
                )}

                <div className="mt-6 border-t border-[#0f3d2e]/10 pt-5 text-center">
                  <p className="text-xs text-slate-500">Want to change something? Talk to a person.</p>
                  <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm font-semibold text-[#0f3d2e]">
                    <a href="tel:+212529808080" className="inline-flex items-center gap-1.5 hover:text-[#9c7a2b]"><Phone className="h-3.5 w-3.5" /> +212 529-808080</a>
                    <a href="mailto:concierge@skyview-travel.com" className="inline-flex items-center gap-1.5 hover:text-[#9c7a2b]"><Mail className="h-3.5 w-3.5" /> Concierge desk</a>
                  </div>
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* Mobile sticky booking bar */}
      {isSectionVisible('booking_widget') && !bookingSuccess && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-4 bg-white/95 px-5 py-3 shadow-[0_-8px_30px_rgba(8,42,31,0.12)] backdrop-blur lg:hidden">
          <div>
            <p className="text-xs text-slate-500">From, per traveler</p>
            <p className="text-lg font-bold text-[#0a2a20]" style={display}>{formatCurrency(effectivePrice, effectiveCurrency)}</p>
          </div>
          <button onClick={scrollToBooking} className={`inline-flex items-center gap-2 rounded-full bg-[#c9a24b] px-6 py-3 text-sm font-bold text-[#082a1f] ${ring}`}>
            Reserve <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Lightbox */}
      {lightbox != null && gallery[lightbox] && (
        <div role="dialog" aria-modal="true" aria-label="Photo gallery" className="fixed inset-0 z-[60] grid place-items-center bg-[#041510]/95 p-4" onClick={() => setLightbox(null)}>
          <button aria-label="Close gallery" onClick={() => setLightbox(null)} className={`absolute right-5 top-5 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 ${ring}`}><X className="h-5 w-5" /></button>
          {gallery.length > 1 && (
            <>
              <button aria-label="Previous photo" onClick={(e) => { e.stopPropagation(); setLightbox((lightbox - 1 + gallery.length) % gallery.length); }} className={`absolute left-4 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 ${ring}`}><ChevronLeft className="h-6 w-6" /></button>
              <button aria-label="Next photo" onClick={(e) => { e.stopPropagation(); setLightbox((lightbox + 1) % gallery.length); }} className={`absolute right-4 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 ${ring}`}><ChevronRight className="h-6 w-6" /></button>
            </>
          )}
          <img src={gallery[lightbox]} alt={`${pkg.public_title}, photo ${lightbox + 1} of ${gallery.length}`} onClick={(e) => e.stopPropagation()} className="max-h-[85vh] max-w-full rounded-2xl object-contain" />
          <p className="absolute bottom-5 text-xs text-white/70">{lightbox + 1} / {gallery.length}</p>
        </div>
      )}
    </div>
  );
}