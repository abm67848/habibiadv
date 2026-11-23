import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Mail, ArrowRight, ArrowLeft, KeyRound, CheckCircle2, AlertCircle,
  Loader2, ShieldCheck, Sparkles, Send, RefreshCw, HelpCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase/client.jsx';
import heroImg from '../../assets/hero.jpeg';
import logoImg from '../../assets/logo.png';

const BRAND = 'Habibi Adventure';

const display = { fontFamily: "'Fraunces', Georgia, serif" };
const body = { fontFamily: "'Manrope', system-ui, sans-serif" };
const ring = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a24b]';
const ringOnDark = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e6c877]';

const SECURITY_POINTS = [
  {
    icon: ShieldCheck,
    title: 'Secure One-Time Link',
    desc: 'Password reset links expire quickly and can only be used once for optimal security.',
  },
  {
    icon: KeyRound,
    title: 'Encrypted Recovery',
    desc: 'Direct integration with verified Supabase authentication to protect user credentials.',
  },
  {
    icon: Sparkles,
    title: 'Fast & Seamless',
    desc: 'Instant delivery directly to your inbox so you can get back to planning your journeys.',
  },
];

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [fieldError, setFieldError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const emailRef = useRef(null);
  const timerRef = useRef(null);

  const startCooldown = (seconds = 60) => {
    setCooldown(seconds);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const validate = () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setFieldError('Email address is required.');
      emailRef.current?.focus();
      return false;
    }
    if (!/^\S+@\S+\.\S+$/.test(trimmed)) {
      setFieldError('Please enter a valid email address.');
      emailRef.current?.focus();
      return false;
    }
    setFieldError('');
    return true;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError(null);

    if (!validate()) return;
    if (cooldown > 0) return;

    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/auth/reset-password`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl,
      });

      if (resetError) {
        const msg = resetError.message?.toLowerCase() || '';
        if (
          resetError.code === 'over_email_send_rate_limit' ||
          resetError.status === 429 ||
          msg.includes('rate limit') ||
          msg.includes('over_email_send_rate_limit')
        ) {
          throw new Error('Too many requests. Please wait a short while before requesting another link.');
        }
        throw resetError;
      }

      setSubmitted(true);
      startCooldown(60);
    } catch (err) {
      console.error('Password reset request error:', err);
      setError(err?.message || 'Unable to send reset email. Please try again or contact support.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    if (cooldown > 0 || loading) return;
    handleSubmit();
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

      {/* Brand Visual Aside (Luxury Emerald & Gold) */}
      <aside className="relative isolate m-3 hidden w-[46%] flex-col justify-between overflow-hidden rounded-[2.5rem] p-10 text-white lg:flex xl:w-1/2 xl:p-12 shadow-2xl shadow-[#082a1f]/30">
        <div className="absolute inset-0 -z-20 bg-gradient-to-br from-[#0c3629] via-[#07241a] to-[#03130d]" />
        
        {/* Background Image with Elegant Drift Effect */}
        <img
          src={heroImg}
          alt="Luxury travel scenery"
          className="absolute inset-0 -z-10 h-full w-full object-cover opacity-25 mix-blend-luminosity filter contrast-125"
          style={{ animation: 'drift 26s ease-in-out infinite alternate' }}
        />
        
        {/* Subtle Vignette & Glow Overlays */}
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

        {/* Feature Context */}
        <div className="max-w-md py-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#c9a24b]/30 bg-[#c9a24b]/10 px-3.5 py-1 text-xs font-semibold text-[#e6c877] backdrop-blur-sm">
            <KeyRound className="h-3.5 w-3.5" />
            <span>Self-Service Recovery</span>
          </div>
          
          <h1 className="mt-5 text-4xl font-semibold leading-[1.15] text-white xl:text-5xl" style={display}>
            Regain access to your journeys
          </h1>
          
          <p className="mt-4 text-sm leading-relaxed text-white/75">
            Forgotten your credentials? Enter your email address and we will generate an authentic, single-use reset link to safely restore your account.
          </p>

          <div className="mt-10 space-y-4">
            {SECURITY_POINTS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="group flex items-start gap-3.5 rounded-2xl border border-white/5 bg-white/5 p-3.5 backdrop-blur-xs transition hover:bg-white/10 hover:border-white/10">
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#c9a24b]/20 text-[#e6c877] ring-1 ring-[#c9a24b]/40 transition group-hover:scale-105">
                  <Icon className="h-4.5 w-4.5" strokeWidth={1.8} />
                </span>
                <div>
                  <h4 className="text-sm font-semibold text-white/95">{title}</h4>
                  <p className="mt-0.5 text-xs text-white/65 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
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

      {/* Main Content Area */}
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

          {/* Form / Success Card */}
          <div className="rise rounded-3xl bg-white p-8 shadow-xl shadow-[#082a1f]/5 ring-1 ring-slate-200/80 sm:p-10">
            {!submitted ? (
              <>
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#0f3d2e]/10 text-[#0f3d2e] ring-1 ring-[#0f3d2e]/15">
                    <KeyRound className="h-6 w-6 text-[#0f3d2e]" strokeWidth={1.7} />
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-600/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    Encrypted
                  </span>
                </div>

                <h2 className="mt-6 text-3xl font-semibold tracking-tight text-[#0a2a20]" style={display}>
                  Forgot password?
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  No worries! Enter your registered account email and we'll send a direct reset link right to your inbox.
                </p>

                {/* Error Banner */}
                {error && (
                  <div className="mt-6 flex items-start gap-3 rounded-2xl bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-rose-200 animate-in fade-in" role="alert">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                    <div className="flex-1 leading-snug">
                      <p className="font-semibold text-rose-900">Unable to proceed</p>
                      <p className="mt-0.5 text-xs text-rose-700">{error}</p>
                    </div>
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} noValidate className="mt-7 space-y-5">
                  <div>
                    <label htmlFor="recovery-email" className="block text-sm font-semibold text-[#0a2a20]">
                      Email address
                    </label>
                    <div className="relative mt-2">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9c7a2b]" />
                      <input
                        id="recovery-email"
                        ref={emailRef}
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (fieldError) setFieldError('');
                        }}
                        autoComplete="email"
                        autoFocus
                        placeholder="you@travelagency.com"
                        aria-invalid={Boolean(fieldError)}
                        aria-describedby={fieldError ? 'recovery-email-error' : undefined}
                        className={`w-full rounded-2xl border bg-[#f3f6f1] py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-2 ${
                          fieldError
                            ? 'border-rose-400 focus:ring-rose-500'
                            : 'border-transparent focus:border-[#c9a24b] focus:ring-[#c9a24b]'
                        }`}
                      />
                    </div>
                    {fieldError && (
                      <p id="recovery-email-error" className="mt-2 text-xs font-medium text-rose-700" role="alert">
                        {fieldError}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || cooldown > 0}
                    className={`group relative flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0f3d2e] to-[#092b20] py-3.5 px-4 text-sm font-semibold text-white shadow-lg shadow-[#0f3d2e]/25 transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 ${ring}`}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-[#e6c877]" />
                        <span>Sending reset link...</span>
                      </>
                    ) : (
                      <>
                        <span>Send recovery link</span>
                        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                      </>
                    )}
                  </button>
                </form>
              </>
            ) : (
              /* Success / Email Sent View */
              <div className="py-2 text-center animate-in fade-in zoom-in-95 duration-300">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50">
                  <CheckCircle2 className="h-8 w-8" strokeWidth={2} />
                </div>

                <h2 className="mt-6 text-2xl font-bold tracking-tight text-[#0a2a20]" style={display}>
                  Check your email
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  We've sent a password reset link to:
                </p>
                <div className="mt-2 inline-flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-1.5 text-sm font-medium text-slate-800">
                  <Mail className="h-4 w-4 text-[#9c7a2b]" />
                  <span>{email}</span>
                </div>

                <div className="mt-6 rounded-2xl bg-amber-50/80 border border-amber-200/80 p-4 text-left text-xs text-amber-900 leading-relaxed">
                  <p className="font-semibold text-amber-950 flex items-center gap-1.5">
                    <HelpCircle className="h-3.5 w-3.5 text-amber-700" />
                    Didn't receive the email?
                  </p>
                  <ul className="mt-1.5 list-disc list-inside space-y-1 text-amber-800/90">
                    <li>Check your spam, junk, or promotions folder.</li>
                    <li>Verify you entered the correct address.</li>
                    <li>Wait a minute before sending another request.</li>
                  </ul>
                </div>

                <div className="mt-6 flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={cooldown > 0 || loading}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed ${ring}`}
                  >
                    {cooldown > 0 ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Resend link in {cooldown}s</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5 text-[#0f3d2e]" />
                        <span>Resend recovery email</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSubmitted(false);
                      setError(null);
                    }}
                    className="text-xs font-medium text-slate-500 hover:text-slate-800 transition underline underline-offset-4"
                  >
                    Use a different email address
                  </button>
                </div>
              </div>
            )}

            {/* Back to Login Options */}
            <div className="mt-8 border-t border-slate-100 pt-6">
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:justify-between text-xs">
                <Link
                  to="/auth/admin-login"
                  className={`inline-flex items-center gap-1.5 font-semibold text-[#0f3d2e] transition hover:text-[#7a5c17] ${ring}`}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to Admin Sign In</span>
                </Link>
                
                <span className="hidden sm:inline text-slate-300">•</span>

                <Link
                  to="/auth/customer-login"
                  className={`font-medium text-slate-500 transition hover:text-slate-800 ${ring}`}
                >
                  Customer portal login
                </Link>
              </div>
            </div>
          </div>

          {/* Quick Help Note */}
          <p className="mt-6 text-center text-xs text-slate-500">
            Need immediate administrative help?{' '}
            <Link to="/contact" className="font-semibold text-[#0f3d2e] underline hover:text-[#7a5c17]">
              Contact support
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
