import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Cookie, Shield, Check, X, Sliders, ChevronDown, ChevronUp, Lock,
  Info, ExternalLink, Sparkles,
} from 'lucide-react';
import {
  COOKIE_CATEGORIES,
  getStoredCookieConsent,
  saveCookieConsent,
  acceptAllCookies,
  declineNonEssentialCookies,
  onCookieConsentChange,
} from '@/services/cookieConsentService.js';

export default function CookieConsentBanner() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [expandedCat, setExpandedCat] = useState(null);

  // Preference state
  const [prefs, setPrefs] = useState({
    necessary: true,
    functional: true,
    analytics: true,
    marketing: false,
  });

  useEffect(() => {
    // Check if consent has already been given
    const saved = getStoredCookieConsent();
    if (!saved) {
      // First-time visit: delay appearance slightly for smooth fade-in
      const tId = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(tId);
    } else {
      setPrefs({
        necessary: true,
        functional: Boolean(saved.functional),
        analytics: Boolean(saved.analytics),
        marketing: Boolean(saved.marketing),
      });
    }

    // Allow opening modal via custom event from anywhere in the app (e.g. footer)
    const handleOpenModal = () => {
      setModalOpen(true);
    };
    window.addEventListener('open_cookie_preferences_modal', handleOpenModal);

    const unsub = onCookieConsentChange((next) => {
      if (next) {
        setPrefs({
          necessary: true,
          functional: Boolean(next.functional),
          analytics: Boolean(next.analytics),
          marketing: Boolean(next.marketing),
        });
      }
    });

    return () => {
      window.removeEventListener('open_cookie_preferences_modal', handleOpenModal);
      unsub();
    };
  }, []);

  const handleAcceptAll = () => {
    acceptAllCookies();
    setVisible(false);
    setModalOpen(false);
  };

  const handleDeclineAll = () => {
    declineNonEssentialCookies();
    setVisible(false);
    setModalOpen(false);
  };

  const handleSaveCustom = () => {
    saveCookieConsent(prefs);
    setVisible(false);
    setModalOpen(false);
  };

  if (!visible && !modalOpen) return null;

  return (
    <>
      {/* ------------------------------------------------------------- */}
      {/*  BOTTOM FLOATING BANNER                                       */}
      {/* ------------------------------------------------------------- */}
      {visible && !modalOpen && (
        <aside
          role="region"
          aria-label={t('Cookie consent banner')}
          className="fixed inset-x-0 bottom-0 z-50 p-4 sm:p-6 pointer-events-none animate-in fade-in slide-in-from-bottom-6 duration-500"
        >
          <div className="mx-auto max-w-4xl rounded-3xl bg-[#082a1f]/95 text-white p-5 sm:p-6 shadow-2xl backdrop-blur-md border border-[#c9a24b]/30 pointer-events-auto">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              {/* Message */}
              <div className="flex items-start gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#0f3d2e] text-[#e6c877] ring-1 ring-[#c9a24b]/40">
                  <Cookie className="h-6 w-6" />
                </span>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold tracking-tight text-white">
                      {t('We value your privacy & travel experience')}
                    </h3>
                    <span className="rounded-full bg-[#c9a24b]/20 px-2 py-0.5 text-[10px] font-semibold text-[#e6c877]">
                      {t('GDPR & ePrivacy')}
                    </span>
                  </div>
                  <p className="text-xs text-white/80 leading-relaxed max-w-xl">
                    {t('We use cookies to secure authentication sessions, remember your currency preferences, analyze website traffic, and tailor travel experiences. You can choose to accept all, decline non-essential cookies, or manage your preferences individually.')}
                  </p>
                  <div className="pt-1 flex items-center gap-3 text-[11px]">
                    <Link
                      to="/cookies"
                      className="text-[#e6c877] hover:underline font-medium"
                    >
                      {t('Read Cookie Policy')}
                    </Link>
                    <span className="text-white/40">•</span>
                    <Link
                      to="/privacy"
                      className="text-[#e6c877] hover:underline font-medium"
                    >
                      {t('Privacy policy')}
                    </Link>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white/90 transition hover:bg-white/10 hover:text-white"
                >
                  <Sliders className="inline-block h-3.5 w-3.5 mr-1" />
                  {t('Manage')}
                </button>

                <button
                  type="button"
                  onClick={handleDeclineAll}
                  className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white/90 transition hover:bg-white/10 hover:text-white"
                >
                  {t('Decline')}
                </button>

                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="rounded-full bg-[#c9a24b] px-5 py-2 text-xs font-bold text-[#082a1f] shadow-sm transition hover:bg-[#e6c877]"
                >
                  {t('Accept All')}
                </button>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* ------------------------------------------------------------- */}
      {/*  MANAGE PREFERENCES MODAL                                     */}
      {/* ------------------------------------------------------------- */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs overflow-y-auto animate-in fade-in">
          <div className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-[#082a1f] p-5 sm:px-6 text-white">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#0f3d2e] text-[#e6c877] ring-1 ring-[#c9a24b]/40">
                  <Cookie className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-base font-bold">{t('Customize Cookie Preferences')}</h2>
                  <p className="text-xs text-white/70">
                    {t('Choose which categories of cookies you consent to on Habibi Adventure.')}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition"
                aria-label={t('Close menu')}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Categories Body */}
            <div className="p-5 sm:p-6 space-y-4 max-h-[65vh] overflow-y-auto">
              <p className="text-xs text-slate-500 leading-relaxed">
                {t('When you visit our site, we store or retrieve information on your browser, mostly in the form of cookies. You can review the details below and enable or disable individual categories.')}
              </p>

              <div className="space-y-3">
                {COOKIE_CATEGORIES.map((cat) => {
                  const isRequired = Boolean(cat.required);
                  const isChecked = isRequired ? true : Boolean(prefs[cat.id]);
                  const isExpanded = expandedCat === cat.id;

                  return (
                    <div
                      key={cat.id}
                      className="rounded-2xl border border-slate-200 bg-white transition hover:border-slate-300"
                    >
                      <div className="flex items-center justify-between p-4 gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900">{t(cat.name)}</h3>
                            {isRequired ? (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                                {t('Always Active')}
                              </span>
                            ) : (
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  isChecked
                                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                                    : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {isChecked ? t('Enabled') : t('Disabled')}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                            {t(cat.description)}
                          </p>
                        </div>

                        {/* Toggle switch */}
                        <div className="shrink-0 flex items-center gap-2">
                          {isRequired ? (
                            <span className="grid h-6 w-11 place-items-center rounded-full bg-slate-200 text-slate-500">
                              <Lock className="h-3 w-3" />
                            </span>
                          ) : (
                            <button
                              type="button"
                              role="switch"
                              aria-checked={isChecked}
                              onClick={() =>
                                setPrefs((prev) => ({ ...prev, [cat.id]: !prev[cat.id] }))
                              }
                              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#c9a24b] ${
                                isChecked ? 'bg-[#0f3d2e]' : 'bg-slate-200'
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                  isChecked ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Expandable cookie breakdown */}
                      <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-2 rounded-b-2xl">
                        <button
                          type="button"
                          onClick={() => setExpandedCat(isExpanded ? null : cat.id)}
                          className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 hover:text-slate-900"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> {t('Hide technical details')}
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> {t('View cookies used in this category ({{count}})', { count: cat.cookies?.length || 0 })}
                            </>
                          )}
                        </button>

                        {isExpanded && (
                          <div className="mt-2.5 pb-2 space-y-2 text-[11px] animate-in fade-in">
                            {cat.cookies?.map((c, i) => (
                              <div
                                key={i}
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 rounded-lg bg-white p-2.5 border border-slate-200/80"
                              >
                                <div>
                                  <span className="font-mono font-bold text-slate-800">{c.name}</span>
                                  <p className="text-slate-500 text-[10px]">{t(c.purpose)}</p>
                                </div>
                                <span className="text-[10px] font-semibold text-slate-400 sm:text-right shrink-0">
                                  {t('Duration')}: {t(c.expires)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
              <Link
                to="/cookies"
                onClick={() => setModalOpen(false)}
                className="text-xs font-semibold text-[#0f3d2e] hover:underline flex items-center gap-1"
              >
                {t('Visit Full Cookie Policy Page')} <ExternalLink className="h-3 w-3" />
              </Link>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleDeclineAll}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                >
                  {t('Decline All')}
                </button>

                <button
                  type="button"
                  onClick={handleSaveCustom}
                  className="rounded-full bg-[#0f3d2e] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1f6b4f] transition shadow-xs"
                >
                  {t('Save My Preferences')}
                </button>

                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="rounded-full bg-[#c9a24b] px-5 py-2 text-xs font-bold text-[#082a1f] hover:bg-[#e6c877] transition shadow-xs"
                >
                  {t('Accept All')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
