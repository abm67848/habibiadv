import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2,
  ArrowRight, ShieldCheck, KeyRound, Sparkles, ArrowLeft, Check, Circle
} from 'lucide-react';
import { supabase } from '../../lib/supabase/client.jsx';
import heroImg from '../../assets/hero.jpeg';
import logoImg from '../../assets/logo.png';

const BRAND = 'Habibi Adventure';

const display = { fontFamily: "'Fraunces', Georgia, serif" };
const body = { fontFamily: "'Manrope', system-ui, sans-serif" };
const ring = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a24b]';
const ringOnDark = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e6c877]';

const passwordChecks = (pw) => [
  { id: 'len', label: 'At least 8 characters', ok: pw.length >= 8 },
  { id: 'case', label: 'Upper and lower case letters', ok: /[a-z]/.test(pw) && /[A-Z]/.test(pw) },
  { id: 'num', label: 'At least one number', ok: /\d/.test(pw) },
  { id: 'sym', label: 'A symbol or 12+ characters', ok: /[^A-Za-z0-9]/.test(pw) || pw.length >= 12 },
];

const STRENGTH = [
  { label: 'Very weak', bar: 'bg-rose-400', text: 'text-rose-700' },
  { label: 'Weak', bar: 'bg-rose-400', text: 'text-rose-700' },
  { label: 'Fair', bar: 'bg-amber-400', text: 'text-amber-700' },
  { label: 'Good', bar: 'bg-[#c9a24b]', text: 'text-[#7a5c17]' },
  { label: 'Strong', bar: 'bg-emerald-500', text: 'text-emerald-700' },
];

export default function ResetPassword() {
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Supabase sends the recovery token in the URL hash, which the JS client parses into a session on load.
  useEffect(() => {
    let mounted = true;

    const checkRecoverySession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          if (session) {
            setIsSessionReady(true);
          }
        }
      } catch (err) {
        console.warn('Error checking session:', err);
      } finally {
        if (mounted) setCheckingSession(false);
      }
    };

    checkRecoverySession();

    // Listen for auth state change specifically for PASSWORD_RECOVERY
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        if (mounted) {
          setIsSessionReady(true);
          setCheckingSession(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const checks = passwordChecks(password);
  const passedCount = checks.filter((c) => c.ok).length;
  const strengthTier = password ? STRENGTH[passedCount] || STRENGTH[0] : null;

  const validate = () => {
    const errs = {};
    if (!password) {
      errs.password = 'New password is required.';
    } else if (password.length < 8) {
      errs.password = 'Password must be at least 8 characters long.';
    }

    if (!confirmPassword) {
      errs.confirmPassword = 'Confirm your new password.';
    } else if (password !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.';
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!validate()) return;
    setLoading(true);

    try {
      const { data, error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) throw updateError;

      setSuccess(true);
      setTimeout(() => {
        navigate('/auth/admin-login', {
          state: { message: 'Your password has been reset successfully. Please sign in with your new credentials.' }
        });
      }, 3500);
    } catch (err) {
      console.error('Password update error:', err);
      setError(err?.message || 'Failed to update your password. Please verify the reset link or request a new one.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f8faf8] text-slate-700 antialiased selection:bg-[#c9a24b]/20 selection:text-[#082a1f]" style={body}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Manrope:wght@400;500;600;700&display=swap');
        @keyframes drift { from { transform: scale(1.03) } to { transform: scale(1.09) } }
        @keyframes rise { from { opacity: 0; transform: translateY(18px) } to { opacity: 1; transform: none } }
        @keyframes pulseGlow { 0%, 100% { opacity: 0.25; transform: scale(1); } 50% { opacity: 0.45; transform: scale(1.08); } }
        .rise { opacity: 0; animation: rise 0.65s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .pulse-glow { animation: pulseGlow 8s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; transition: none !important; }
          .rise { opacity: 1; }
        }
      `}</style>

      {/* Brand Visual Aside */}
      <aside className="relative isolate m-3 hidden w-[46%] flex-col justify-between overflow-hidden rounded-[2.5rem] p-10 text-white lg:flex xl:w-1/2 xl:p-12 shadow-2xl shadow-[#082a1f]/30">
        <div className="absolute inset-0 -z-20 bg-gradient-to-br from-[#0c3629] via-[#07241a] to-[#03130d]" />
        
        <img
          src={heroImg}
          alt="Luxury scenery"
          className="absolute inset-0 -z-10 h-full w-full object-cover opacity-25 mix-blend-luminosity filter contrast-125"
          style={{ animation: 'drift 26s ease-in-out infinite alternate' }}
        />
        
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#051c14] via-[#07241a]/60 to-transparent" />
        <div className="pulse-glow absolute -left-20 -top-20 -z-10 h-96 w-96 rounded-full bg-[#c9a24b]/25 blur-3xl" />
        <div className="pulse-glow absolute -bottom-24 -right-24 -z-10 h-96 w-96 rounded-full bg-[#20604b]/40 blur-3xl" />

        {/* Brand Header */}
        <div className="flex items-center gap-3.5">
          <div className="relative flex h-13 w-13 items-center justify-center rounded-2xl bg-white/10 p-2 shadow-inner ring-1 ring-[#c9a24b]/50 backdrop-blur-md">
            <img src={logoImg} alt={BRAND} className="h-full w-full object-contain" />
          </div>
          <div>
            <span className="block text-2xl tracking-tight text-white" style={display}>
              {BRAND}
            </span>
            <span className="text-xs font-medium tracking-wider uppercase text-[#e6c877]/80">
              Account Security Center
            </span>
          </div>
        </div>

        {/* Aside Content */}
        <div className="max-w-md py-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#c9a24b]/30 bg-[#c9a24b]/10 px-3.5 py-1 text-xs font-semibold text-[#e6c877] backdrop-blur-sm">
            <KeyRound className="h-3.5 w-3.5" />
            <span>Create New Password</span>
          </div>
          
          <h1 className="mt-5 text-4xl font-semibold leading-[1.15] text-white xl:text-5xl" style={display}>
            Secure your portal access
          </h1>
          
          <p className="mt-4 text-sm leading-relaxed text-white/75">
            Choose a strong, unique password to safeguard your administrative tools, bookings, and traveler records.
          </p>

          <div className="mt-10 space-y-4">
            <div className="flex items-start gap-3.5 rounded-2xl border border-white/5 bg-white/5 p-3.5 backdrop-blur-xs">
              <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#c9a24b]/20 text-[#e6c877] ring-1 ring-[#c9a24b]/40">
                <ShieldCheck className="h-4.5 w-4.5" strokeWidth={1.8} />
              </span>
              <div>
                <h4 className="text-sm font-semibold text-white/95">Immediate Protection</h4>
                <p className="mt-0.5 text-xs text-white/65 leading-relaxed">
                  Your previous password will be invalidated immediately once your new password is saved.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 rounded-2xl border border-white/5 bg-white/5 p-3.5 backdrop-blur-xs">
              <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#c9a24b]/20 text-[#e6c877] ring-1 ring-[#c9a24b]/40">
                <Sparkles className="h-4.5 w-4.5" strokeWidth={1.8} />
              </span>
              <div>
                <h4 className="text-sm font-semibold text-white/95">Recommended Standard</h4>
                <p className="mt-0.5 text-xs text-white/65 leading-relaxed">
                  We recommend combining uppercase letters, numbers, and special symbols for maximum account integrity.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Aside Footer */}
        <div className="flex items-center justify-between border-t border-white/10 pt-6 text-xs text-white/60">
          <span>&copy; {new Date().getFullYear()} {BRAND}. All rights reserved.</span>
          <Link
            to="/"
            className={`inline-flex items-center gap-1.5 rounded text-[#e6c877] transition hover:text-white ${ringOnDark}`}
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to website
          </Link>
        </div>
      </aside>

      {/* Main Form Content */}
      <main className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 xl:px-20">
        <div className="mx-auto w-full max-w-md">
          {/* Mobile Brand Bar */}
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Link to="/" className="flex items-center gap-3">
              <div className="h-10 w-10 overflow-hidden rounded-xl bg-[#082a1f] p-1.5">
                <img src={logoImg} alt={BRAND} className="h-full w-full object-contain" />
              </div>
              <span className="text-xl font-bold text-[#0a2a20]" style={display}>
                {BRAND}
              </span>
            </Link>
            <Link
              to="/auth/admin-login"
              className={`inline-flex items-center gap-1 text-xs font-semibold text-[#0f3d2e] hover:text-[#7a5c17] ${ring}`}
            >
              Sign in <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Form Card */}
          <div className="rise rounded-3xl bg-white p-8 shadow-xl shadow-[#082a1f]/5 ring-1 ring-slate-200/80 sm:p-10">
            {success ? (
              /* Success View */
              <div className="py-2 text-center animate-in fade-in zoom-in-95 duration-300">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50">
                  <CheckCircle2 className="h-8 w-8" strokeWidth={2} />
                </div>

                <h2 className="mt-6 text-2xl font-bold tracking-tight text-[#0a2a20]" style={display}>
                  Password Reset Successful!
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  Your password has been safely updated. You will be redirected to the sign-in page in a moment.
                </p>

                <div className="mt-7">
                  <Link
                    to="/auth/admin-login"
                    className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0f3d2e] to-[#092b20] py-3.5 px-4 text-sm font-semibold text-white shadow-lg shadow-[#0f3d2e]/25 transition hover:brightness-110 active:scale-[0.99] ${ring}`}
                  >
                    <span>Proceed to Sign In</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#0f3d2e]/10 text-[#0f3d2e] ring-1 ring-[#0f3d2e]/15">
                    <KeyRound className="h-6 w-6 text-[#0f3d2e]" strokeWidth={1.7} />
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-600/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    Authorized Recovery
                  </span>
                </div>

                <h2 className="mt-6 text-3xl font-semibold tracking-tight text-[#0a2a20]" style={display}>
                  Reset password
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Enter your new password below to regain full access to your account.
                </p>

                {/* Error Banner */}
                {error && (
                  <div className="mt-6 flex items-start gap-3 rounded-2xl bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-rose-200 animate-in fade-in" role="alert">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                    <div className="flex-1 leading-snug">
                      <p className="font-semibold text-rose-900">Reset Failed</p>
                      <p className="mt-0.5 text-xs text-rose-700">{error}</p>
                      <p className="mt-2 text-xs">
                        <Link to="/auth/forgot-password" className="font-semibold text-[#0f3d2e] underline">
                          Request a fresh recovery link
                        </Link>
                      </p>
                    </div>
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} noValidate className="mt-7 space-y-5">
                  {/* Password Field */}
                  <div>
                    <label htmlFor="new-password" className="block text-sm font-semibold text-[#0a2a20]">
                      New password
                    </label>
                    <div className="relative mt-2">
                      <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9c7a2b]" />
                      <input
                        id="new-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (fieldErrors.password) setFieldErrors((f) => ({ ...f, password: undefined }));
                        }}
                        autoComplete="new-password"
                        placeholder="••••••••••••"
                        aria-invalid={Boolean(fieldErrors.password)}
                        aria-describedby={fieldErrors.password ? 'new-password-error' : undefined}
                        className={`w-full rounded-2xl border bg-[#f3f6f1] py-3.5 pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-2 ${
                          fieldErrors.password
                            ? 'border-rose-400 focus:ring-rose-500'
                            : 'border-transparent focus:border-[#c9a24b] focus:ring-[#c9a24b]'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className={`absolute right-3.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition hover:text-slate-700 ${ring}`}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {fieldErrors.password && (
                      <p id="new-password-error" className="mt-1.5 text-xs font-medium text-rose-700" role="alert">
                        {fieldErrors.password}
                      </p>
                    )}

                    {/* Password Strength Meter */}
                    {password && (
                      <div className="mt-3 space-y-2 rounded-2xl bg-slate-50/90 border border-slate-100 p-3.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-medium">Strength:</span>
                          <span className={`font-semibold ${strengthTier?.text}`}>{strengthTier?.label}</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5">
                          {[0, 1, 2, 3].map((i) => (
                            <div
                              key={i}
                              className={`h-1.5 rounded-full transition-colors duration-300 ${
                                i < passedCount ? strengthTier?.bar : 'bg-slate-200'
                              }`}
                            />
                          ))}
                        </div>
                        <ul className="mt-2 space-y-1 text-[11px]">
                          {checks.map(({ id, label, ok }) => (
                            <li key={id} className={`flex items-center gap-1.5 ${ok ? 'text-emerald-700' : 'text-slate-400'}`}>
                              {ok ? <Check className="h-3 w-3 shrink-0 stroke-[2.5]" /> : <Circle className="h-2 w-2 shrink-0 fill-current opacity-60" />}
                              <span>{label}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password Field */}
                  <div>
                    <label htmlFor="confirm-password" className="block text-sm font-semibold text-[#0a2a20]">
                      Confirm new password
                    </label>
                    <div className="relative mt-2">
                      <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9c7a2b]" />
                      <input
                        id="confirm-password"
                        type={showConfirm ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (fieldErrors.confirmPassword) setFieldErrors((f) => ({ ...f, confirmPassword: undefined }));
                        }}
                        autoComplete="new-password"
                        placeholder="••••••••••••"
                        aria-invalid={Boolean(fieldErrors.confirmPassword)}
                        aria-describedby={fieldErrors.confirmPassword ? 'confirm-password-error' : undefined}
                        className={`w-full rounded-2xl border bg-[#f3f6f1] py-3.5 pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-2 ${
                          fieldErrors.confirmPassword
                            ? 'border-rose-400 focus:ring-rose-500'
                            : 'border-transparent focus:border-[#c9a24b] focus:ring-[#c9a24b]'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((v) => !v)}
                        aria-label={showConfirm ? 'Hide password' : 'Show password'}
                        className={`absolute right-3.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition hover:text-slate-700 ${ring}`}
                      >
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {fieldErrors.confirmPassword && (
                      <p id="confirm-password-error" className="mt-1.5 text-xs font-medium text-rose-700" role="alert">
                        {fieldErrors.confirmPassword}
                      </p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className={`group relative flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0f3d2e] to-[#092b20] py-3.5 px-4 text-sm font-semibold text-white shadow-lg shadow-[#0f3d2e]/25 transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 ${ring}`}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-[#e6c877]" />
                        <span>Updating password...</span>
                      </>
                    ) : (
                      <>
                        <span>Update password</span>
                        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                      </>
                    )}
                  </button>
                </form>
              </>
            )}

            {/* Back to Sign In Link */}
            <div className="mt-8 border-t border-slate-100 pt-6 text-center text-xs">
              <Link
                to="/auth/admin-login"
                className={`inline-flex items-center gap-1.5 font-semibold text-[#0f3d2e] transition hover:text-[#7a5c17] ${ring}`}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Admin Sign In</span>
              </Link>
            </div>
          </div>

          {/* Quick Help Note */}
          <p className="mt-6 text-center text-xs text-slate-500">
            Link expired or having trouble?{' '}
            <Link to="/auth/forgot-password" className="font-semibold text-[#0f3d2e] underline hover:text-[#7a5c17]">
              Request another link
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
