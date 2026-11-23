// Cookie Consent & Privacy Preference Service
const STORAGE_KEY = 'habibi_cookie_consent_v1';
const CONSENT_EVENT = 'habibi_cookie_consent_changed';

export const COOKIE_CATEGORIES = [
  {
    id: 'necessary',
    name: 'Strictly Necessary Cookies',
    required: true,
    description:
      'Essential for the website to function properly. They enable core security features, authentication sessions, form validation, and saved trip requests. These cannot be disabled.',
    cookies: [
      { name: 'sb-access-token', purpose: 'Authentication and user session state', expires: 'Session' },
      { name: 'habibi_cookie_consent_v1', purpose: 'Stores your cookie privacy preferences', expires: '1 year' },
      { name: 'selected_services', purpose: 'Retains your custom trip request builder choices', expires: 'Session' },
    ],
  },
  {
    id: 'functional',
    name: 'Preferences & Functional Cookies',
    required: false,
    description:
      'Allow the website to remember choices you make, such as your preferred currency (MAD, EUR, USD), language preference, and search dates for travel packages.',
    cookies: [
      { name: 'app_currency', purpose: 'Remembers your chosen currency format', expires: '1 year' },
      { name: 'admin_language', purpose: 'Remembers your interface language selection', expires: '1 year' },
      { name: 'travel_search_cache', purpose: 'Restores your recent destinations filter', expires: '30 days' },
    ],
  },
  {
    id: 'analytics',
    name: 'Analytics & Performance Cookies',
    required: false,
    description:
      'Help us understand how travelers interact with our itineraries, which destinations are most visited, and measure loading speeds to continuously improve our services.',
    cookies: [
      { name: '_ga / _gid', purpose: 'Anonymous website usage and journey analytics', expires: '2 years' },
      { name: 'perf_metrics', purpose: 'Measures page load speeds and responsiveness', expires: 'Session' },
    ],
  },
  {
    id: 'marketing',
    name: 'Marketing & Personalized Recommendations',
    required: false,
    description:
      'Used to deliver tailored travel recommendations, relevant excursions, and allow social media content sharing (such as Instagram and YouTube trip highlights).',
    cookies: [
      { name: '_fbp', purpose: 'Tailored travel ads and campaign performance', expires: '90 days' },
      { name: 'social_embed_pref', purpose: 'Supports embedded interactive maps and social media', expires: '180 days' },
    ],
  },
];

export function getStoredCookieConsent() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed;
  } catch {
    return null;
  }
}

export function saveCookieConsent(preferences) {
  if (typeof window === 'undefined') return;
  const payload = {
    necessary: true, // Always true
    functional: Boolean(preferences.functional),
    analytics: Boolean(preferences.analytics),
    marketing: Boolean(preferences.marketing),
    updatedAt: new Date().toISOString(),
    version: '1.0',
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    // Also set a lightweight browser cookie
    document.cookie = `${STORAGE_KEY}=true; path=/; max-age=31536000; SameSite=Lax`;
  } catch (err) {
    console.warn('Could not persist cookie consent:', err);
  }

  // Dispatch custom event to notify listeners
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: payload }));
  return payload;
}

export function acceptAllCookies() {
  return saveCookieConsent({
    necessary: true,
    functional: true,
    analytics: true,
    marketing: true,
  });
}

export function declineNonEssentialCookies() {
  return saveCookieConsent({
    necessary: true,
    functional: false,
    analytics: false,
    marketing: false,
  });
}

export function onCookieConsentChange(callback) {
  if (typeof window === 'undefined') return () => {};
  const handler = (e) => callback(e.detail);
  window.addEventListener(CONSENT_EVENT, handler);
  return () => window.removeEventListener(CONSENT_EVENT, handler);
}
