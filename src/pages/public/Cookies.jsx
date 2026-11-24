import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Cookie, Shield, Check, Lock, Sliders, CheckCircle2, RotateCcw,
  Sparkles, ExternalLink, ArrowRight, Info, AlertCircle, Eye,
} from 'lucide-react';
import {
  COOKIE_CATEGORIES,
  getStoredCookieConsent,
  saveCookieConsent,
  acceptAllCookies,
  declineNonEssentialCookies,
  onCookieConsentChange,
} from '@/services/cookieConsentService.js';

const display = { fontFamily: "'Fraunces', Georgia, serif" };
const body = { fontFamily: "'Manrope', system-ui, sans-serif" };

export default function CookiesPage() {
  const { t } = useTranslation();
  const [prefs, setPrefs] = useState({
    necessary: true,
    functional: true,
    analytics: true,
    marketing: false,
  });

  const [savedTime, setSavedTime] = useState(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const saved = getStoredCookieConsent();
    if (saved) {
      setPrefs({
        necessary: true,
        functional: Boolean(saved.functional),
        analytics: Boolean(saved.analytics),
        marketing: Boolean(saved.marketing),
      });
      if (saved.updatedAt) {
        setSavedTime(new Date(saved.updatedAt).toLocaleDateString());
      }
    }

    const unsub = onCookieConsentChange((next) => {
      if (next) {
        setPrefs({
          necessary: true,
          functional: Boolean(next.functional),
          analytics: Boolean(next.analytics),
          marketing: Boolean(next.marketing),
        });
        if (next.updatedAt) {
          setSavedTime(new Date(next.updatedAt).toLocaleDateString());
        }
      }
    });

    return () => unsub();
  }, []);

  const triggerNotice = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 4500);
  };

  const handleSave = () => {
    const res = saveCookieConsent(prefs);
    if (res?.updatedAt) {
      setSavedTime(new Date(res.updatedAt).toLocaleDateString());
    }
    triggerNotice(t('Your cookie preferences have been updated and applied.'));
  };

  const handleAcceptAll = () => {
    const res = acceptAllCookies();
    if (res?.updatedAt) {
      setSavedTime(new Date(res.updatedAt).toLocaleDateString());
    }
    triggerNotice(t('All cookies accepted. Thank you for supporting our digital experience!'));
  };

  const handleDeclineAll = () => {
    const res = declineNonEssentialCookies();
    if (res?.updatedAt) {
      setSavedTime(new Date(res.updatedAt).toLocaleDateString());
    }
    triggerNotice(t('Non-essential cookies disabled. Only strictly necessary cookies are active.'));
  };

  return (
    <div className="min-h-screen bg-[#f3f6f1] text-slate-700 antialiased pb-24" style={body}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Manrope:wght@400;500;600;700&display=swap');
      `}</style>

      {/* HERO HEADER */}
      <header className="relative isolate overflow-hidden bg-[#082a1f] pb-32 pt-32 text-white sm:pt-40">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#082a1f] via-[#0f3d2e] to-[#1f6b4f]" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#082a1f]/60 to-[#082a1f]/90" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-t from-[#f3f6f1] to-transparent" />

        <div className="mx-auto max-w-4xl px-5 lg:px-8 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#c9a24b]/20 px-3.5 py-1 text-xs font-semibold text-[#e6c877] ring-1 ring-[#c9a24b]/30">
            <Cookie className="h-4 w-4" /> {t('Privacy & Data Governance')}
          </div>
          <h1 className="mt-4 text-4xl leading-[1.08] sm:text-6xl text-white font-serif" style={display}>
            {t('Cookie Management & Preferences')}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">
            {t('Transparency is at the heart of how we plan trips and manage data. Review, adjust, or revoke your cookie choices at any time.')}
          </p>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="mx-auto max-w-4xl px-5 -mt-12 space-y-10 relative z-10">
        {/* PREFERENCES CONTROL CARD */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xl shadow-[#082a1f]/5 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h2 className="text-xl font-bold text-slate-900" style={display}>
                {t('Your Active Privacy Settings')}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {savedTime
                  ? t('Consent last recorded on: {{date}}', { date: savedTime })
                  : t('Using default initial preferences')}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleDeclineAll}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                {t('Decline All')}
              </button>
              <button
                type="button"
                onClick={handleAcceptAll}
                className="rounded-full bg-[#c9a24b] px-4 py-2 text-xs font-bold text-[#082a1f] hover:bg-[#e6c877] transition shadow-xs"
              >
                {t('Accept All')}
              </button>
            </div>
          </div>

          {notice && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{notice}</span>
            </div>
          )}

          {/* Categories Switches */}
          <div className="space-y-4">
            {COOKIE_CATEGORIES.map((cat) => {
              const isRequired = Boolean(cat.required);
              const isChecked = isRequired ? true : Boolean(prefs[cat.id]);

              return (
                <div
                  key={cat.id}
                  className="rounded-2xl border border-slate-200/90 bg-slate-50/40 p-5 space-y-3 transition hover:border-slate-300"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-base font-bold text-slate-900">{t(cat.name)}</h3>
                        {isRequired ? (
                          <span className="rounded-full bg-slate-200/80 px-2.5 py-0.5 text-[10px] font-bold text-slate-700">
                            {t('Always Required')}
                          </span>
                        ) : (
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              isChecked
                                ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {isChecked ? t('Active') : t('Disabled')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
                        {t(cat.description)}
                      </p>
                    </div>

                    {/* Switch */}
                    <div className="shrink-0 pt-1">
                      {isRequired ? (
                        <span className="grid h-7 w-12 place-items-center rounded-full bg-slate-200 text-slate-500">
                          <Lock className="h-3.5 w-3.5" />
                        </span>
                      ) : (
                        <button
                          type="button"
                          role="switch"
                          aria-checked={isChecked}
                          onClick={() =>
                            setPrefs((prev) => ({ ...prev, [cat.id]: !prev[cat.id] }))
                          }
                          className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#c9a24b] ${
                            isChecked ? 'bg-[#0f3d2e]' : 'bg-slate-300'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                              isChecked ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Cookie Details List */}
                  <div className="border-t border-slate-200/70 pt-3">
                    <p className="text-[11px] font-semibold text-slate-500 mb-2">{t('Cookies & storage tokens in this category:')}</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {cat.cookies?.map((c, i) => (
                        <div key={i} className="rounded-xl bg-white p-3 border border-slate-200 text-xs shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-slate-900">{c.name}</span>
                            <span className="text-[10px] text-slate-400 font-medium">{t(c.expires)}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1">{t(c.purpose)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-2 rounded-full bg-[#0f3d2e] px-6 py-3 text-xs font-bold text-white shadow-sm hover:bg-[#1f6b4f] transition"
            >
              <Check className="h-4 w-4" /> {t('Save My Preferences')}
            </button>
          </div>
        </div>

        {/* DETAILED POLICY & EDUCATIONAL GUIDE */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6 shadow-xs leading-relaxed text-slate-600 text-sm">
          <h2 className="text-2xl font-bold text-[#0a2a20]" style={display}>
            {t('About Our Cookie & Privacy Standards')}
          </h2>

          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900">{t('1. What are cookies?')}</h3>
            <p>
              {t('Cookies are small text files placed on your computer or mobile device when you visit websites. They are widely used to make websites work efficiently, provide security, remember your settings (such as project currency or selected excursions), and report usage analytics.')}
            </p>

            <h3 className="text-base font-bold text-slate-900">{t('2. How Habibi Adventure uses cookies')}</h3>
            <p>
              {t('We treat user privacy with the same integrity we bring to organizing trips. We do not sell your personal data or search habits to data brokers. Cookies are used strictly to:')}
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>{t('Keep you securely logged in to your account and administrative tools.')}</li>
              <li>{t('Preserve your selected trip request items when browsing packages and services.')}</li>
              <li>{t('Remember your display currency (e.g. Moroccan Dirhams MAD, Euros EUR, US Dollars USD).')}</li>
              <li>{t('Analyze aggregate traffic patterns so we can optimize itineraries and page load times.')}</li>
            </ul>

            <h3 className="text-base font-bold text-slate-900">{t('3. Managing cookies in your web browser')}</h3>
            <p>
              {t('In addition to using the preference controls above, most modern web browsers allow you to control and delete cookies through their settings:')}
            </p>
            <div className="grid gap-3 sm:grid-cols-2 pt-2">
              <div className="rounded-xl border border-slate-200 p-3 bg-slate-50 text-xs">
                <span className="font-bold text-slate-800">Google Chrome</span>
                <p className="text-slate-500 mt-0.5">{t('Settings → Privacy and Security → Third-party cookies.')}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3 bg-slate-50 text-xs">
                <span className="font-bold text-slate-800">Apple Safari</span>
                <p className="text-slate-500 mt-0.5">{t('Preferences → Privacy → Block all cookies / Manage Website Data.')}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3 bg-slate-50 text-xs">
                <span className="font-bold text-slate-800">Mozilla Firefox</span>
                <p className="text-slate-500 mt-0.5">{t('Options → Privacy & Security → Enhanced Tracking Protection.')}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3 bg-slate-50 text-xs">
                <span className="font-bold text-slate-800">Microsoft Edge</span>
                <p className="text-slate-500 mt-0.5">{t('Settings → Cookies and Site Permissions → Manage and delete cookies.')}</p>
              </div>
            </div>

            <h3 className="text-base font-bold text-slate-900">{t('4. Contact our privacy team')}</h3>
            <p>
              {t('If you have any questions about our use of cookies or privacy practices, please contact our concierge team at')} <a href="mailto:habibiadventure.26@gmail.com" className="font-semibold text-amber-700 underline">habibiadventure.26@gmail.com</a> {t('or visit our office at Boulevard Mohammed V, Tangier, Morocco.')}
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
