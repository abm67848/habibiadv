import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Calendar, Clock, MapPin, Users, Check, X, ArrowLeft, Phone, Mail, CalendarCheck,
  AlertCircle, Minus, Plus, Share2, ChevronDown, ChevronLeft, ChevronRight, Images,
  ShieldCheck, Eye, ArrowRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client.jsx';
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

const fmtDate = (value, locale) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
};

const getLocalDateInputValue = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const seatsLeft = (dep) =>
  dep?.max_capacity != null ? Math.max(0, dep.max_capacity - (dep.reserved_capacity || 0)) : null;

function Card({ children, className = '' }) {
  return <div className={`rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#0f3d2e]/10 sm:p-8 ${className}`}>{children}</div>;
}

export default function PackageDetailsPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === 'fr' ? 'fr-FR' : i18n.resolvedLanguage === 'es' ? 'es-ES' : 'en-US';
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
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingReference, setBookingReference] = useState('');
  const [requestedDepartureDate, setRequestedDepartureDate] = useState('');

  // Insurance state
  const [insuranceEnabled, setInsuranceEnabled] = useState(false);
  const [insurancePlanKey, setInsurancePlanKey] = useState('');

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
        setRequestedDepartureDate('');
        setBookingSuccess(false);
        setBookingReference('');
        setInsuranceEnabled(false);
        const insurancePlans = (data?.insurance_plans || []).filter((plan) => plan.active !== false);
        const defaultInsurancePlan = insurancePlans.find((plan) => plan.is_default) || insurancePlans[0];
        setInsurancePlanKey(defaultInsurancePlan?.plan_key || '');
        const min = Number(data?.min_travelers) || 1;
        const max = Math.min(
          Number(data?.max_travelers) || Infinity,
          seatsLeft(data?.departures?.[0]) ?? Infinity,
        );
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
    if (pkg.landing_page?.section_visibility?.media === false) return [];
    const all = [pkg.cover_image_url, ...(Array.isArray(pkg.gallery) ? pkg.gallery : [])].filter(Boolean);
    return [...new Set(all)];
  }, [pkg]);

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

  const insurancePlans = useMemo(
    () => (pkg?.insurance_plans || []).filter((plan) => plan.active !== false),
    [pkg],
  );
  const eligibleInsurancePlans = useMemo(
    () => insurancePlans.filter((plan) => !plan.min_travelers || travelerCount >= Number(plan.min_travelers)),
    [insurancePlans, travelerCount],
  );
  useEffect(() => {
    if (eligibleInsurancePlans.some((plan) => plan.plan_key === insurancePlanKey)) return;
    const defaultPlan = eligibleInsurancePlans.find((plan) => plan.is_default) || eligibleInsurancePlans[0];
    setInsurancePlanKey(defaultPlan?.plan_key || '');
  }, [eligibleInsurancePlans, insurancePlanKey]);

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
        <p className="sr-only" role="status">{t('Loading package details')}</p>
      </div>
    );
  }

  if (error || !pkg) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3f6f1] p-6" style={body}>
        <div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-xl ring-1 ring-[#0f3d2e]/10">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-rose-50 text-rose-600"><AlertCircle className="h-7 w-7" /></span>
          <h2 className="mt-5 text-2xl text-[#0a2a20]" style={display}>{t('We couldn’t find this package')}</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {t(error || 'It may have been unpublished or the link may be wrong.')}
          </p>
          <Link to="/packages" className={`mt-6 inline-flex items-center gap-2 rounded-full bg-[#0f3d2e] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1f6b4f] ${ring}`}>
            <ArrowLeft className="h-4 w-4" /> {t('Back to packages')}
          </Link>
        </div>
      </div>
    );
  }

  const adultPriceRule = pkg.pricing_rules?.find((rule) => rule.price_type === 'adult');
  const effectivePrice = selectedDeparture?.selling_price_override ?? pkg.starting_price ?? adultPriceRule?.amount;
  const baseTotal = effectivePrice == null ? null : Number(effectivePrice) * travelerCount;
  const effectiveCurrency = selectedDeparture?.currency || adultPriceRule?.currency || pkg.default_currency || 'MAD';
  const nights = pkg.duration_nights ?? pkg.duration_days - 1;
  const landingPage = pkg.landing_page || {};
  const sectionVisibility =
    landingPage.section_visibility && typeof landingPage.section_visibility === 'object' ? landingPage.section_visibility : {};
  const isSectionVisible = (name) => sectionVisibility[name] !== false;
  const showBookingWidget = isSectionVisible('booking_widget');
  const visibleTabs = ['itinerary', 'inclusions', 'departures'].filter(isSectionVisible);

  const formatCurrency = (amount, currency = pkg.default_currency || 'MAD') => {
    if (amount == null || amount === '') return t('Price on request');
    try {
      return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(amount));
    } catch {
      return `${currency} ${Number(amount).toLocaleString(locale)}`;
    }
  };

  const selectedInsurancePlan =
    eligibleInsurancePlans.find((plan) => plan.plan_key === insurancePlanKey)
    || eligibleInsurancePlans.find((plan) => plan.is_default)
    || eligibleInsurancePlans[0]
    || null;
  const insuranceCurrency = (selectedInsurancePlan?.currency || effectiveCurrency).toUpperCase();
  const insuranceUnitPremium = Number(selectedInsurancePlan?.premium) || 0;
  const insuranceCost = !insuranceEnabled || !selectedInsurancePlan
    ? 0
    : selectedInsurancePlan.pricing_model === 'flat'
      ? insuranceUnitPremium
      : insuranceUnitPremium * travelerCount;
  const insuranceCurrencyMatchesPackage = insuranceCurrency === effectiveCurrency.toUpperCase();
  const grandTotal = baseTotal == null
    ? null
    : baseTotal + (insuranceEnabled && insuranceCurrencyMatchesPackage ? insuranceCost : 0);

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

  const onSubmit = async (e) => {
    e.preventDefault();
    if (soldOut || bookingSubmitting) return;
    if (previewMode) {
      setFormError(t('Booking requests are disabled in preview mode.'));
      return;
    }
    if (!form.name.trim() || !form.contact.trim()) {
      setFormError(t('Add your name and an email or phone number so we can reach you.'));
      return;
    }
    if (!selectedDeparture && !requestedDepartureDate) {
      setFormError(t('Choose a preferred departure date.'));
      return;
    }
    if (!selectedDeparture && requestedDepartureDate < getLocalDateInputValue()) {
      setFormError(t('Choose today or a future departure date.'));
      return;
    }
    if (insuranceEnabled && !selectedInsurancePlan) {
      setFormError(t('Choose an insurance plan available for the selected number of travelers, or turn insurance off.'));
      return;
    }
    setFormError('');
    setBookingSubmitting(true);
    try {
      const { data, error: bookingError } = await supabase.rpc('create_public_package_booking', {
        p_offer_id: pkg.id,
        p_offer_departure_id: selectedDeparture?.id || null,
        p_requested_departure_date: selectedDeparture ? null : requestedDepartureDate || null,
        p_traveler_count: travelerCount,
        p_full_name: form.name.trim(),
        p_contact: form.contact.trim(),
        p_special_requests: null,
        p_insurance_plan_key: insuranceEnabled ? selectedInsurancePlan.plan_key : null,
      });
      if (bookingError) throw bookingError;
      if (!data?.booking_reference) {
        throw new Error(t('Booking confirmation was not returned. Please contact the concierge before submitting again.'));
      }
      setBookingReference(data.booking_reference);
      setBookingSuccess(true);
    } catch (err) {
      console.error('Failed to submit package booking request:', err);
      setFormError(t(err.message || 'Could not submit your request. Please try again.'));
    } finally {
      setBookingSubmitting(false);
    }
  };

  const scrollToBooking = () => document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="min-h-screen bg-[#f3f6f1] pb-24 text-slate-700 antialiased lg:pb-0" style={body}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Manrope:wght@400;500;600;700&display=swap');
        @keyframes drift{from{transform:scale(1.04)}to{transform:scale(1.1)}}
        @media (prefers-reduced-motion: reduce){*{animation:none!important;transition:none!important}}
      `}</style>

      {previewMode && (
        <div className="fixed left-1/2 top-20 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full bg-[#e6c877] px-5 py-2 text-xs font-semibold text-[#082a1f] shadow-lg">
          <Eye className="h-4 w-4" /> {t('Admin preview. This offer is not public.')}
          <Link to={`/admin/packages-services/${packageId}`} className="underline underline-offset-2">{t('Back to editor')}</Link>
        </div>
      )}

      {/* HERO */}
      <header className="relative isolate h-[56vh] min-h-[440px] w-full overflow-hidden bg-[#082a1f]">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#082a1f] via-[#1f6b4f] to-[#c9a24b]" />
        {heroImage && (
          <img src={heroImage} alt={t(pkg.public_title)} className="absolute inset-0 -z-10 h-full w-full object-cover" style={{ animation: 'drift 26s ease-in-out infinite alternate' }} />
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#082a1f] via-[#082a1f]/55 to-[#082a1f]/20" />

        <div className="mx-auto flex h-full max-w-7xl flex-col justify-between px-5 pb-10 pt-28 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <Link to="/packages" className={`inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-white/25 ${ring}`}>
              <ArrowLeft className="h-3.5 w-3.5" /> {t('All packages')}
            </Link>
            <div className="flex items-center gap-2">
              {gallery.length > 1 && (
                <button onClick={() => setLightbox(0)} className={`inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-white/25 ${ring}`}>
                  <Images className="h-3.5 w-3.5" /> {t('{{count}} photos', { count: gallery.length })}
                </button>
              )}
              <button onClick={share} className={`inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-white/25 ${ring}`}>
                {copied ? <Check className="h-3.5 w-3.5 text-[#e6c877]" /> : <Share2 className="h-3.5 w-3.5" />}
                {copied ? t('Link copied') : t('Share')}
              </button>
            </div>
          </div>

          <div>
            {isSectionVisible('trip_facts') && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#c9a24b] px-3 py-1 text-xs font-bold text-[#082a1f]">{t(pkg.package_category || 'Travel offer')}</span>
                {pkg.destination_country && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur-md">
                    <MapPin className="h-3.5 w-3.5 text-[#e6c877]" /> {t(pkg.destination_country)}
                  </span>
                )}
                {pkg.reference && <span className="text-xs text-white/70">{t('Ref {{reference}}', { reference: pkg.reference })}</span>}
              </div>
            )}
            <h1 className="mt-4 max-w-3xl text-4xl leading-[1.08] text-white sm:text-5xl lg:text-6xl" style={display}>
              {t(landingPage.hero_heading || pkg.public_title)}
            </h1>
            {isSectionVisible('overview') && (landingPage.hero_subtitle || pkg.short_description) && (
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/85">{t(landingPage.hero_subtitle || pkg.short_description)}</p>
            )}
            {isSectionVisible('trip_facts') && (
              <div className="mt-5 flex flex-wrap items-center gap-x-7 gap-y-2 text-sm text-white/90">
                {pkg.duration_days && <span className="flex items-center gap-2"><Clock className="h-4 w-4 text-[#e6c877]" /> {t('{{count}} days, {{nights}} nights', { count: pkg.duration_days, nights })}</span>}
                {(pkg.min_travelers || pkg.max_travelers) && (
                  <span className="flex items-center gap-2"><Users className="h-4 w-4 text-[#e6c877]" /> {t('{{min}} to {{max}} guests', { min: pkg.min_travelers || '1', max: pkg.max_travelers || '—' })}</span>
                )}
                {isSectionVisible('departures') && selectedDeparture && (
                  <span className="flex items-center gap-2"><Calendar className="h-4 w-4 text-[#e6c877]" /> {t('Next departure')} {fmtDate(selectedDeparture.departure_date, locale)}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* BODY */}
      <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <div className={`grid grid-cols-1 gap-10 ${showBookingWidget ? 'lg:grid-cols-3' : ''}`}>
          {/* Left column */}
          <div className={`space-y-8 ${showBookingWidget ? 'lg:col-span-2' : ''}`}>
            {isSectionVisible('overview') && (
              <Card>
                <h2 className="text-3xl text-[#0a2a20]" style={display}>{t('About this journey')}</h2>
                <p className="mt-4 whitespace-pre-line text-[15px] leading-7 text-slate-600">
                  {t(landingPage.public_introduction || pkg.full_description || pkg.short_description || 'Offer details are being prepared.')}
                </p>
              </Card>
            )}

            {isSectionVisible('highlights') && Array.isArray(pkg.highlights) && pkg.highlights.length > 0 && (
              <Card>
                <h2 className="text-2xl text-[#0a2a20]" style={display}>{t('Highlights')}</h2>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {pkg.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-3 rounded-2xl bg-[#f3f6f1] p-3.5 text-sm text-slate-700">
                      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#c9a24b] text-[#082a1f]"><Check className="h-3 w-3" strokeWidth={3} /></span>
                      <span className="leading-snug">{t(h)}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {gallery.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {gallery.slice(0, 4).map((src, i) => (
                  <button key={src} onClick={() => setLightbox(i)} className={`group relative aspect-[4/3] overflow-hidden rounded-2xl ${ring}`} aria-label={t('Open photo {{number}}', { number: i + 1 })}>
                    <img src={src} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                    {i === 3 && gallery.length > 4 && (
                      <span className="absolute inset-0 grid place-items-center bg-[#082a1f]/65 text-sm font-semibold text-white">+{t('{{count}} more', { count: gallery.length - 4 })}</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {visibleTabs.length > 0 && (
              <div id="package-tabs" className="scroll-mt-28">
                <div role="tablist" aria-label={t('Package details')} className="flex gap-1 overflow-x-auto rounded-full bg-white p-1.5 ring-1 ring-[#0f3d2e]/10">
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
                        {t(TAB_LABELS[tab])}{count ? <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] ${activeTab === tab ? 'bg-[#c9a24b] text-[#082a1f]' : 'bg-[#f3f6f1] text-slate-500'}`}>{count}</span> : null}
                      </button>
                    );
                  })}
                </div>

                {isSectionVisible('itinerary') && activeTab === 'itinerary' && (
                  <Card className="mt-4">
                    {pkg.itinerary?.length > 0 ? (
                      <>
                        <div className="mb-6 flex items-center justify-between">
                          <h2 className="text-2xl text-[#0a2a20]" style={display}>{t('Day by day')}</h2>
                          <button
                            onClick={() => setOpenDays(openDays.size === pkg.itinerary.length ? new Set() : new Set(pkg.itinerary.map((d) => d.id)))}
                            className="text-sm font-semibold text-[#9c7a2b] hover:underline"
                          >
                            {t(openDays.size === pkg.itinerary.length ? 'Collapse all' : 'Expand all')}
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
                                      <span className="block text-base font-semibold text-[#0a2a20]">{t(day.title)}</span>
                                      {day.destination && (
                                        <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[#9c7a2b]"><MapPin className="h-3 w-3" />{t(day.destination)}</span>
                                      )}
                                    </span>
                                    <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                  </button>
                                  {isOpen && <p className="whitespace-pre-line px-4 pb-4 text-sm leading-relaxed text-slate-600">{t(day.description)}</p>}
                                </div>
                              </li>
                            );
                          })}
                        </ol>
                      </>
                    ) : (
                      <p className="text-sm text-slate-500">{t('The detailed day plan is sent with your quote.')}</p>
                    )}
                  </Card>
                )}

                {isSectionVisible('inclusions') && activeTab === 'inclusions' && (
                  <Card className="mt-4">
                    <div className="grid gap-8 md:grid-cols-2">
                      {[
                        { title: 'What’s included', items: pkg.inclusions, icon: Check, tone: 'bg-[#0f3d2e] text-[#e6c877]', head: 'text-[#0f3d2e]' },
                        { title: 'Not included', items: pkg.exclusions, icon: X, tone: 'bg-rose-50 text-rose-600', head: 'text-rose-700' },
                      ].map(({ title, items, icon: Icon, tone, head }) => (
                        <div key={title}>
                          <h3 className={`text-xl ${head}`} style={display}>{t(title)}</h3>
                          <ul className="mt-4 space-y-3 text-sm text-slate-700">
                            {items?.length > 0 ? (
                              items.map((item) => (
                                <li key={item.id} className="flex items-start gap-3">
                                  <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${tone}`}><Icon className="h-3 w-3" strokeWidth={3} /></span>
                                  <span className="leading-snug">{t(item.description)}</span>
                                </li>
                              ))
                            ) : (
                              <li className="text-slate-500">{t('Your travel advisor will confirm the details.')}</li>
                            )}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {isSectionVisible('departures') && activeTab === 'departures' && (
                  <Card className="mt-4">
                    <h2 className="text-2xl text-[#0a2a20]" style={display}>{t('Choose your departure')}</h2>
                    {pkg.departures?.length > 0 ? (
                      <div role="radiogroup" aria-label={t('Departure dates')} className="mt-5 space-y-3">
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
                                  <span className="block text-sm font-semibold text-[#0a2a20]">{fmtDate(dep.departure_date, locale)} {t('Date range separator')} {fmtDate(dep.return_date, locale)}</span>
                                  <span className={`block text-xs ${left != null && left > 0 && left <= 5 ? 'font-semibold text-[#9c7a2b]' : 'text-slate-500'}`}>
                                    {left == null ? t('Capacity confirmed on request') : left === 0 ? t('Sold out') : left <= 5 ? t('Only {{count}} seats left', { count: left }) : t('{{count}} seats remaining', { count: left })}
                                  </span>
                                </span>
                              </span>
                              {isSectionVisible('pricing') && (
                                <span className="text-right">
                                  <span className="block text-base font-bold text-[#0a2a20]">{formatCurrency(dep.selling_price_override ?? pkg.starting_price, dep.currency || pkg.default_currency)}</span>
                                  <span className="text-xs text-slate-500">{t(isSelected ? 'Selected' : 'per traveler')}</span>
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-slate-500">{t('This trip runs privately on demand. Contact us and we’ll set dates around yours.')}</p>
                    )}
                  </Card>
                )}
              </div>
            )}

            {isSectionVisible('faqs') && (faqs.length > 0 || hasPolicies) && (
              <div className="space-y-6">
                {faqs.length > 0 && (
                  <Card>
                    <h2 className="text-3xl text-[#0a2a20]" style={display}>{t('Questions, answered')}</h2>
                    <div className="mt-5 divide-y divide-[#0f3d2e]/10">
                      {faqs.map((faq, index) => (
                        <details key={faq.id || index} className="group py-4">
                          <summary className={`flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-[#0a2a20] ${ring} rounded`}>
                            {t(faq.question || faq.title || 'Question {{number}}', { number: index + 1 })}
                            <ChevronDown className="h-5 w-5 shrink-0 text-[#c9a24b] transition-transform group-open:rotate-180" />
                          </summary>
                          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">{t(faq.answer || faq.description || '')}</p>
                        </details>
                      ))}
                    </div>
                  </Card>
                )}
                {hasPolicies && (
                  <Card className="grid gap-8 sm:grid-cols-2">
                    {landingPage.terms_and_conditions && (
                      <div>
                        <h2 className="text-xl text-[#0a2a20]" style={display}>{t('Terms and conditions')}</h2>
                        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">{t(landingPage.terms_and_conditions)}</p>
                      </div>
                    )}
                    {landingPage.cancellation_policy && (
                      <div>
                        <h2 className="text-xl text-[#0a2a20]" style={display}>{t('Cancellation policy')}</h2>
                        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">{t(landingPage.cancellation_policy)}</p>
                      </div>
                    )}
                  </Card>
                )}
              </div>
            )}
          </div>

          {/* Sticky booking form */}
          {showBookingWidget && (
          <aside className="lg:sticky lg:top-24 lg:h-fit" id="booking">
            <Card className="space-y-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#9c7a2b]">{t('Book this journey')}</p>
                {effectivePrice != null ? (
                  <>
                    <p className="mt-1 text-3xl font-bold text-[#0a2a20]" style={display}>
                      {formatCurrency(effectivePrice, effectiveCurrency)}
                      <span className="ml-2 text-sm font-normal text-slate-500">{t('per traveler')}</span>
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {selectedDeparture ? t('Departing {{date}}', { date: fmtDate(selectedDeparture.departure_date, locale) }) : t('Choose a departure below')}
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-xl font-semibold text-[#0a2a20]" style={display}>{t('Price on request')}</p>
                )}
              </div>

              {pkg.departures?.length > 0 && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">{t('Departure')}</label>
                  <select
                    value={selectedDeparture?.id || ''}
                    onChange={(e) => {
                      const dep = pkg.departures.find((d) => d.id === e.target.value);
                      if (dep) selectDeparture(dep);
                    }}
                    className={`w-full rounded-xl border border-[#0f3d2e]/15 bg-white px-3 py-2.5 text-sm text-slate-800 ${ring}`}
                  >
                    {pkg.departures.map((dep) => {
                      const left = seatsLeft(dep);
                      return (
                        <option key={dep.id} value={dep.id} disabled={left === 0}>
                          {fmtDate(dep.departure_date, locale)} {left != null ? `· ${t('{{count}} seats', { count: left })}` : ''}{left === 0 ? ` · ${t('Sold out')}` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {!pkg.departures?.length && (
                <div>
                  <label htmlFor="preferred-departure-date" className="mb-1.5 block text-xs font-medium text-slate-600">
                    {t('Preferred departure date *')}
                  </label>
                  <input
                    id="preferred-departure-date"
                    type="date"
                    min={getLocalDateInputValue()}
                    value={requestedDepartureDate}
                    onChange={(e) => setRequestedDepartureDate(e.target.value)}
                    required
                    className={`w-full rounded-xl border border-[#0f3d2e]/15 bg-white px-3 py-2.5 text-sm text-slate-800 ${ring}`}
                  />
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-600">{t('Travelers')}</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCount(travelerCount - 1)}
                    disabled={travelerCount <= minTravelers}
                    className={`grid h-10 w-10 place-items-center rounded-full border border-[#0f3d2e]/20 bg-white text-[#0a2a20] transition hover:border-[#c9a24b] disabled:opacity-40 ${ring}`}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="min-w-[3rem] text-center text-lg font-semibold text-[#0a2a20]">{travelerCount}</span>
                  <button
                    type="button"
                    onClick={() => setCount(travelerCount + 1)}
                    disabled={travelerCount >= maxTravelers}
                    className={`grid h-10 w-10 place-items-center rounded-full border border-[#0f3d2e]/20 bg-white text-[#0a2a20] transition hover:border-[#c9a24b] disabled:opacity-40 ${ring}`}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* ---------- INSURANCE ---------- */}
              {insurancePlans.length > 0 && (
              <div className="rounded-2xl border border-[#0f3d2e]/10 bg-[#f8faf7] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0a2a20]">
                      <ShieldCheck className="h-4 w-4 text-[#0f3d2e]" /> {t('Add extra insurance')}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                      {t('Optional. Choose from the coverage plans configured for this package.')}
                    </p>
                  </div>
                  <label className="relative inline-flex shrink-0 cursor-pointer items-center">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={insuranceEnabled}
                      onChange={(e) => setInsuranceEnabled(e.target.checked)}
                      aria-label={t('Enable extra insurance')}
                    />
                    <span className="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-[#0f3d2e] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#c9a24b]" />
                    <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
                  </label>
                </div>

                {insuranceEnabled && (
                  <div className="mt-3 space-y-2">
                    {eligibleInsurancePlans.length === 0 && (
                      <p role="status" className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
                        {t('No insurance plan is available for this number of travelers.')}
                      </p>
                    )}
                    {insurancePlans.map((plan) => {
                      const planPremium = Number(plan.premium) || 0;
                      const price = plan.pricing_model === 'flat' ? planPremium : planPremium * travelerCount;
                      const planCurrency = (plan.currency || effectiveCurrency).toUpperCase();
                      const unavailable = Boolean(plan.min_travelers && travelerCount < Number(plan.min_travelers));
                      const selected = selectedInsurancePlan?.plan_key === plan.plan_key;
                      return (
                        <button
                          key={plan.plan_key}
                          type="button"
                          onClick={() => setInsurancePlanKey(plan.plan_key)}
                          disabled={unavailable}
                          className={`flex w-full items-start justify-between gap-3 rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${ring} ${
                            selected ? 'border-[#c9a24b] bg-white ring-1 ring-[#c9a24b]' : 'border-[#0f3d2e]/10 bg-white hover:border-[#c9a24b]/50'
                          }`}
                          aria-pressed={selected}
                        >
                          <span className="flex items-start gap-2.5">
                            <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${selected ? 'bg-[#c9a24b] text-[#082a1f]' : 'bg-[#f3f6f1] text-[#0f3d2e]'}`}>
                              <ShieldCheck className="h-4 w-4" />
                            </span>
                            <span>
                              <span className="block text-sm font-semibold text-[#0a2a20]">{t(plan.label)}</span>
                              <span className="mt-0.5 block text-xs leading-snug text-slate-500">
                                {unavailable
                                  ? t('Available for at least {{count}} travelers.', { count: plan.min_travelers })
                                  : t(plan.description || (plan.pricing_model === 'flat' ? 'One premium covers the whole group.' : 'Premium charged per traveler.'))}
                              </span>
                            </span>
                          </span>
                          <span className="shrink-0 text-right">
                            <span className="block text-sm font-bold text-[#0a2a20]">{formatCurrency(price, planCurrency)}</span>
                            <span className="text-[11px] text-slate-500">
                              {plan.pricing_model === 'flat'
                                ? t('flat for group')
                                : `${formatCurrency(planPremium, planCurrency)}/${t('traveler')}`}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              )}

              {/* ---------- PRICE BREAKDOWN ---------- */}
              {baseTotal != null && (
                <div className="space-y-1.5 rounded-xl bg-[#f3f6f1] p-4 text-sm">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>{t('Base ({{count}} × {{price}})', { count: travelerCount, price: formatCurrency(effectivePrice, effectiveCurrency) })}</span>
                    <span className="font-medium text-slate-800">{formatCurrency(baseTotal, effectiveCurrency)}</span>
                  </div>
                  {insuranceEnabled && selectedInsurancePlan && (
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-[#0f3d2e]" /> {t('Insurance')} · {t(selectedInsurancePlan.label)}</span>
                      <span className="font-medium text-slate-800">{formatCurrency(insuranceCost, insuranceCurrency)}</span>
                    </div>
                  )}
                  <div className="mt-2 flex items-center justify-between border-t border-[#0f3d2e]/10 pt-2 text-base">
                    <span className="font-semibold text-[#0a2a20]">
                      {t(insuranceEnabled && selectedInsurancePlan && !insuranceCurrencyMatchesPackage ? 'Package total' : 'Total')}
                    </span>
                    <span className="font-bold text-[#0a2a20]">{formatCurrency(grandTotal, effectiveCurrency)}</span>
                  </div>
                  {insuranceEnabled && selectedInsurancePlan && !insuranceCurrencyMatchesPackage && (
                    <p className="text-[11px] text-slate-500">
                      {t('Insurance is priced separately in {{currency}}.', { currency: insuranceCurrency })}
                    </p>
                  )}
                </div>
              )}

              {/* ---------- FORM ---------- */}
              {bookingSuccess ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
                  <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Check className="h-6 w-6" /></span>
                  <p className="mt-3 text-lg font-semibold text-emerald-900" style={display}>{t('Request received')}</p>
                  <p className="mt-1 text-sm text-emerald-800">{t('Reference')} <span className="font-mono font-semibold">{bookingReference}</span></p>
                  <p className="mt-2 text-xs text-emerald-700">{t('Our concierge will reach out shortly to confirm details and insurance.')}</p>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="space-y-3" noValidate>
                  <div>
                    <label htmlFor="booker-name" className="mb-1.5 block text-xs font-medium text-slate-600">{t('Full name *')}</label>
                    <input
                      id="booker-name"
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder={t('Your name')}
                      className={`w-full rounded-xl border border-[#0f3d2e]/15 bg-white px-3 py-2.5 text-sm ${ring}`}
                      autoComplete="name"
                    />
                  </div>
                  <div>
                    <label htmlFor="booker-contact" className="mb-1.5 block text-xs font-medium text-slate-600">{t('Email or phone *')}</label>
                    <input
                      id="booker-contact"
                      type="text"
                      value={form.contact}
                      onChange={(e) => setForm({ ...form, contact: e.target.value })}
                      placeholder={t('Email or phone')}
                      className={`w-full rounded-xl border border-[#0f3d2e]/15 bg-white px-3 py-2.5 text-sm ${ring}`}
                      autoComplete="email"
                    />
                  </div>
                  {formError && (
                    <p role="alert" className="flex items-start gap-1.5 rounded-lg bg-rose-50 p-2 text-xs text-rose-700">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {formError}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={soldOut || bookingSubmitting || previewMode}
                    className={`w-full rounded-full bg-[#0f3d2e] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1f6b4f] disabled:opacity-50 ${ring}`}
                  >
                    {t(soldOut ? 'Sold out' : bookingSubmitting ? 'Sending…' : 'Request booking')}
                  </button>
                  <p className="text-[11px] leading-snug text-slate-500">
                    {t('No payment is taken now. We’ll confirm availability, insurance and final pricing by email.')}
                  </p>
                </form>
              )}
            </Card>
          </aside>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox != null && gallery.length > 0 && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('Photo viewer')}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            aria-label={t('Close photo viewer')}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={() => setLightbox(null)}
          >
            <X className="h-5 w-5" />
          </button>
          {gallery.length > 1 && (
            <>
              <button
                type="button"
                aria-label={t('Previous photo')}
                className="absolute left-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
                onClick={(e) => { e.stopPropagation(); setLightbox((i) => (i - 1 + gallery.length) % gallery.length); }}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label={t('Next photo')}
                className="absolute right-16 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
                onClick={(e) => { e.stopPropagation(); setLightbox((i) => (i + 1) % gallery.length); }}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
          <img
            src={gallery[lightbox]}
            alt={t('Photo {{number}}', { number: lightbox + 1 })}
            className="max-h-[85vh] max-w-[90vw] rounded-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}