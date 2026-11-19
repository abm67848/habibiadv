import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Shield, Lock, Mail, AlertCircle, ArrowRight, Eye, EyeOff, Loader2, ArrowLeft,
  CalendarCheck, PackageOpen, BarChart3, Users, TriangleAlert,
} from 'lucide-react';
import { useAuth } from '../../context/index.jsx';

const BRAND = 'Habibi Adventure'; // change to your public brand name if different
const EMAIL_KEY = 'admin-last-email';

const display = { fontFamily: "'Fraunces', Georgia, serif" };
const body = { fontFamily: "'Manrope', system-ui, sans-serif" };
const ring = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a24b]';
const ringOnDark = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e6c877]';

const CAPABILITIES = [
  { icon: CalendarCheck, label: 'Bookings and operations calendar' },
  { icon: PackageOpen, label: 'Packages, departures and pricing' },
  { icon: Users, label: 'Customers and sales pipeline' },
  { icon: BarChart3, label: 'Agency analytics' },
];

const readSavedEmail = () => {
  try {
    return localStorage.getItem(EMAIL_KEY) || '';
  } catch {
    return '';
  }
};

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, isAdmin, refreshSession } = useAuth();
  const from = location.state?.from?.pathname || '/admin';

  const [email, setEmail] = useState(readSavedEmail);
  const [remember, setRemember] = useState(() => Boolean(readSavedEmail()));
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [attempts, setAttempts] = useState(0);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  // Already signed in as an admin: skip the form.
  useEffect(() => {
    if (isAdmin) navigate(from, { replace: true });
  }, [isAdmin, from, navigate]);

  const validate = () => {
    const er = {};
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) er.email = 'Enter a valid email address.';
    if (!password) er.password = 'Enter your password.';
    setFieldErrors(er);
    if (er.email) emailRef.current?.focus();
    else if (er.password) passwordRef.current?.focus();
    return Object.keys(er).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!validate()) return;
    setLoading(true);

    try {
      await signIn(email.trim(), password);
      await refreshSession();
      try {
        if (remember) localStorage.setItem(EMAIL_KEY, email.trim());
        else localStorage.removeItem(EMAIL_KEY);
      } catch {
        /* storage unavailable */
      }
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Sign in error:', err);
      setAttempts((n) => n + 1);
      setPassword('');
      setError(err?.message || 'Invalid email or password. Please check your credentials and try again.');
      passwordRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const onKey = (e) => setCapsLock(e.getModifierState?.('CapsLock') ?? false);

  // Detect if the error is specifically about a pending/suspended account
  const isPendingError = error && (error.toLowerCase().includes('pending') || error.toLowerCase().includes('suspended'));

  const inputClass = (hasError) =>
    `w-full rounded-2xl border bg-[#f3f6f1] py-3.5 pl-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-2 ${
      hasError ? 'border-rose-400 focus:ring-rose-500' : 'border-transparent focus:border-[#c9a24b] focus:ring-[#c9a24b]'
    }`;

  return (
    <div className="flex min-h-screen bg-white text-slate-700 antialiased" style={body}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Manrope:wght@400;500;600;700&display=swap');
        @keyframes drift{from{transform:scale(1.04)}to{transform:scale(1.1)}}
        @keyframes rise{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
        .rise{opacity:0;animation:rise .7s cubic-bezier(.2,.7,.2,1) forwards}
        @media (prefers-reduced-motion: reduce){*{animation:none!important;transition:none!important}.rise{opacity:1}}
      `}</style>

      {/* Brand panel: a framed green card on the white page */}
      <aside className="relative isolate m-4 hidden w-1/2 flex-col justify-between overflow-hidden rounded-[2rem] p-10 text-white lg:flex">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#0f3d2e] via-[#082a1f] to-[#04150f]" />
        <img
          src="/images/admin-login.jpg"
          alt=""
          onError={(e) => (e.currentTarget.style.display = 'none')}
          className="absolute inset-0 -z-10 h-full w-full object-cover opacity-35"
          style={{ animation: 'drift 28s ease-in-out infinite alternate' }}
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#082a1f] via-[#082a1f]/50 to-transparent" />
        <div className="absolute -left-24 -top-24 -z-10 h-96 w-96 rounded-full bg-[#c9a24b]/20 blur-3xl" />

        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-white/10 text-[#e6c877] ring-1 ring-[#c9a24b]/70">
            <Shield className="h-6 w-6" strokeWidth={1.6} />
          </span>
          <span className="leading-none">
            <span className="block text-2xl" style={display}>{BRAND}</span>
            <span className="mt-1 block text-xs text-white/65">Administration portal</span>
          </span>
        </div>

        <div className="max-w-md">
          <h1 className="text-5xl leading-[1.08]" style={display}>Run every trip from one place</h1>
          <p className="mt-5 text-sm leading-relaxed text-white/75">
            For authorized staff only. Sign in to manage what travelers see and what happens behind the scenes.
          </p>
          <ul className="mt-8 space-y-3">
            {CAPABILITIES.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-sm text-white/85">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-[#e6c877]"><Icon className="h-4 w-4" strokeWidth={1.7} /></span>
                {label}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center justify-between border-t border-white/10 pt-6 text-xs text-white/60">
          <span>© {new Date().getFullYear()} {BRAND}</span>
          <Link to="/" className={`inline-flex items-center gap-1.5 rounded text-[#e6c877] hover:text-white ${ringOnDark}`}>
            <ArrowLeft className="h-3.5 w-3.5" /> Back to website
          </Link>
        </div>
      </aside>

      {/* Form panel */}
      <main className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <span className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-[#0f3d2e] text-[#e6c877]"><Shield className="h-5 w-5" strokeWidth={1.6} /></span>
              <span className="text-xl text-[#0a2a20]" style={display}>{BRAND}</span>
            </span>
            <Link to="/" className={`rounded text-xs font-semibold text-[#0f3d2e] hover:text-[#7a5c17] ${ring}`}>Website</Link>
          </div>

          <div className="rise rounded-3xl bg-white p-8 shadow-2xl shadow-[#0f3d2e]/10 ring-1 ring-[#0f3d2e]/10 sm:p-10">
            <h2 className="text-3xl text-[#0a2a20]" style={display}>Admin sign in</h2>
            <p className="mt-2 text-sm text-slate-600">Use your administrator credentials to continue.</p>

            {location.state?.message && !error && (
              <div className="mt-6 flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-300" role="status">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div className="flex-1 leading-snug">
                  {location.state.message}
                </div>
              </div>
            )}

            {error && (
              isPendingError ? (
                /* ── Pending / Suspended Account Banner ── */
                <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-5 ring-1 ring-amber-200" role="alert">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-100 ring-1 ring-amber-300">
                      <TriangleAlert className="h-5 w-5 text-amber-700" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-amber-900">Account Pending Approval</p>
                      <p className="mt-1 text-xs leading-relaxed text-amber-800">
                        {error}
                      </p>
                      <p className="mt-2 text-xs text-amber-700">
                        Please contact your <strong>Manager</strong> or <strong>Administrator</strong> to get your account activated.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── Standard Error Banner ── */
                <div className="mt-6 flex items-start gap-3 rounded-2xl bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-rose-200" role="alert">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                  <div className="flex-1 leading-snug">
                    {error}
                    {attempts >= 3 && (
                      <span className="mt-2 block text-rose-700">
                        Still stuck? <Link to="/auth/forgot-password" className="font-semibold text-[#0f3d2e] underline underline-offset-2">Reset your password</Link>.
                      </span>
                    )}
                  </div>
                </div>
              )
            )}

            <form onSubmit={handleSubmit} noValidate className="mt-7 space-y-5">
              <div>
                <label htmlFor="admin-email" className="block text-sm font-semibold text-[#0a2a20]">Email address</label>
                <div className="relative mt-2">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9c7a2b]" />
                  <input
                    id="admin-email"
                    ref={emailRef}
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (fieldErrors.email) setFieldErrors((f) => ({ ...f, email: undefined })); }}
                    autoComplete="username"
                    autoFocus={!email}
                    placeholder="admin@travelagency.com"
                    aria-invalid={Boolean(fieldErrors.email)}
                    aria-describedby={fieldErrors.email ? 'admin-email-error' : undefined}
                    className={`${inputClass(fieldErrors.email)} pr-4`}
                  />
                </div>
                {fieldErrors.email && <p id="admin-email-error" className="mt-1.5 text-xs font-medium text-rose-700" role="alert">{fieldErrors.email}</p>}
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="admin-password" className="block text-sm font-semibold text-[#0a2a20]">Password</label>
                  <Link to="/auth/forgot-password" className={`rounded text-xs font-semibold text-[#0f3d2e] transition hover:text-[#7a5c17] ${ring}`}>Forgot password?</Link>
                </div>
                <div className="relative mt-2">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9c7a2b]" />
                  <input
                    id="admin-password"
                    ref={passwordRef}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); if (fieldErrors.password) setFieldErrors((f) => ({ ...f, password: undefined })); }}
                    onKeyUp={onKey}
                    onKeyDown={onKey}
                    onBlur={() => setCapsLock(false)}
                    autoComplete="current-password"
                    placeholder="Your password"
                    aria-invalid={Boolean(fieldErrors.password)}
                    aria-describedby={fieldErrors.password ? 'admin-password-error' : capsLock ? 'caps-warning' : undefined}
                    className={`${inputClass(fieldErrors.password)} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    className={`absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-slate-500 transition hover:bg-[#0f3d2e]/10 hover:text-[#0f3d2e] ${ring}`}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {fieldErrors.password && <p id="admin-password-error" className="mt-1.5 text-xs font-medium text-rose-700" role="alert">{fieldErrors.password}</p>}
                {capsLock && !fieldErrors.password && (
                  <p id="caps-warning" className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-[#7a5c17]" role="status">
                    <TriangleAlert className="h-3.5 w-3.5" /> Caps Lock is on
                  </p>
                )}
              </div>

              <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-[#0f3d2e]"
                />
                Remember my email on this device
              </label>

              <button
                type="submit"
                disabled={loading}
                className={`flex w-full items-center justify-center gap-2 rounded-full bg-[#c9a24b] py-4 text-sm font-bold text-[#082a1f] shadow-lg shadow-[#c9a24b]/30 transition hover:bg-[#e6c877] disabled:cursor-not-allowed disabled:opacity-60 ${ring}`}
              >
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</> : <>Sign in to console <ArrowRight className="h-4 w-4" /></>}
              </button>
            </form>

            <div className="mt-8 border-t border-[#0f3d2e]/10 pt-6 text-center text-sm text-slate-600">
              Need an administrator account?{' '}
              <Link to="/auth/admin-signup" className={`rounded font-semibold text-[#0f3d2e] transition hover:text-[#7a5c17] ${ring}`}>Admin sign up</Link>
            </div>
          </div>

          <p className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
            <Lock className="h-3 w-3" /> Authorized staff only.
          </p>
        </div>
      </main>
    </div>
  );
}