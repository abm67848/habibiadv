import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Shield, User, Mail, Lock, Briefcase, Building, Phone, AlertCircle, CheckCircle2,
  ArrowRight, Eye, EyeOff, Loader2, ArrowLeft, Check, Circle,
} from 'lucide-react';
import { signUpAdmin } from '../../services/adminAuthService.js';

const BRAND = 'Habibi Adventure'; // change to your public brand name if different

const display = { fontFamily: "'Fraunces', Georgia, serif" };
const body = { fontFamily: "'Manrope', system-ui, sans-serif" };
const ring = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a24b]';
const ringOnDark = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e6c877]';

const AVAILABLE_ROLES = [
  { id: 'administrator', label: 'Administrator', desc: 'Full operational and staff management' },
  { id: 'manager', label: 'Manager', desc: 'Supervises teams, bookings and operations' },
  { id: 'sales_agent', label: 'Sales agent', desc: 'Leads, quotations and customer sales' },
  { id: 'reservation_agent', label: 'Reservation agent', desc: 'Bookings, packages and destinations' },
  { id: 'accountant', label: 'Accountant', desc: 'Finance, invoices, payments and expenses' },
  { id: 'content_manager', label: 'Content manager', desc: 'Website content, blogs and destinations' },
];

const GUIDANCE = [
  'Pick the role that matches the job, nothing broader',
  'Use a work email the person checks regularly',
  'Choose a long, unique password',
];

const getSignupErrorMessage = (err) => {
  const message = err?.message?.toLowerCase() || '';
  const isEmailRateLimit =
    err?.code === 'over_email_send_rate_limit' ||
    err?.status === 429 ||
    message.includes('email rate limit') ||
    message.includes('over_email_send_rate_limit');

  if (isEmailRateLimit) {
    // Developer hint stays in the console; users get a plain message.
    console.warn(
      'Signup email rate limit reached. Configure a custom SMTP provider or review the email rate limits in your Supabase project.',
    );
    return 'Too many sign-up emails were requested. Wait a few minutes, then check whether the account was already created before submitting again.';
  }

  return err?.message || 'Failed to create the admin account. Please try again.';
};

const passwordChecks = (pw) => [
  { id: 'len', label: 'At least 8 characters', ok: pw.length >= 8 },
  { id: 'case', label: 'Upper and lower case letters', ok: /[a-z]/.test(pw) && /[A-Z]/.test(pw) },
  { id: 'num', label: 'A number', ok: /\d/.test(pw) },
  { id: 'sym', label: 'A symbol or 12+ characters', ok: /[^A-Za-z0-9]/.test(pw) || pw.length >= 12 },
];

const STRENGTH = [
  { label: 'Too short', bar: 'bg-rose-400', text: 'text-rose-700' },
  { label: 'Weak', bar: 'bg-rose-400', text: 'text-rose-700' },
  { label: 'Fair', bar: 'bg-amber-400', text: 'text-amber-700' },
  { label: 'Good', bar: 'bg-[#c9a24b]', text: 'text-[#7a5c17]' },
  { label: 'Strong', bar: 'bg-emerald-500', text: 'text-emerald-700' },
];

const baseInput =
  'w-full rounded-2xl border bg-[#f3f6f1] py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-2';
const inputState = (err) => (err ? 'border-rose-400 focus:ring-rose-500' : 'border-transparent focus:border-[#c9a24b] focus:ring-[#c9a24b]');

function TextField({ id, label, icon: Icon, error, hint, right, ...props }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-[#0a2a20]">{label}</label>
      <div className="relative mt-1.5">
        {Icon && <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9c7a2b]" />}
        <input
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={`${baseInput} ${inputState(error)} ${Icon ? 'pl-11' : 'pl-4'} ${right ? 'pr-12' : 'pr-4'}`}
          {...props}
        />
        {right}
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-rose-700" role="alert">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

export default function AdminSignup() {
  const navigate = useNavigate();
  const redirectTimer = useRef(null);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'administrator',
    department: 'Operations',
    jobTitle: '',
    phone: '',
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');

  useEffect(() => () => clearTimeout(redirectTimer.current), []);

  const checks = useMemo(() => passwordChecks(formData.password), [formData.password]);
  const score = formData.password ? checks.filter((c) => c.ok).length : 0;
  const strength = STRENGTH[score];
  const passwordsMatch = formData.confirmPassword && formData.password === formData.confirmPassword;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((er) => ({ ...er, [name]: undefined }));
  };

  const validate = () => {
    const er = {};
    if (formData.fullName.trim().length < 2) er.fullName = 'Enter the person’s full name.';
    if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) er.email = 'Enter a valid email address.';
    if (formData.phone && !/^[+\d][\d\s().-]{6,}$/.test(formData.phone.trim())) er.phone = 'Enter a phone number with country code.';
    if (formData.password.length < 8) er.password = 'Password must be at least 8 characters long.';
    if (formData.password !== formData.confirmPassword) er.confirmPassword = 'Passwords do not match.';
    setErrors(er);
    return Object.keys(er).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setInfoMessage('');

    if (!validate()) {
      requestAnimationFrame(() => document.querySelector('[aria-invalid="true"]')?.focus());
      return;
    }

    setLoading(true);

    try {
      const data = await signUpAdmin({
        email: formData.email.trim(),
        password: formData.password,
        fullName: formData.fullName.trim(),
        role: formData.role,
        department: formData.department,
        jobTitle: formData.jobTitle.trim(),
        phone: formData.phone.trim(),
      });

      setSuccess(true);

      // If the project requires email confirmation
      if (data?.user && (!data.session || data.user.identities?.length === 0)) {
        setInfoMessage('Account created. If email confirmation is required, check the inbox and confirm the email address before signing in.');
      } else {
        setInfoMessage('Account created. Redirecting you to sign in…');
        redirectTimer.current = setTimeout(() => {
          navigate('/auth/admin-login', {
            state: { message: 'Account registered successfully! You can now log in.' },
          });
        }, 2000);
      }
    } catch (err) {
      console.error('Registration failed:', err);
      setError(getSignupErrorMessage(err));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white text-slate-700 antialiased" style={body}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Manrope:wght@400;500;600;700&display=swap');
        @keyframes drift{from{transform:scale(1.04)}to{transform:scale(1.1)}}
        @keyframes rise{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
        .rise{opacity:0;animation:rise .7s cubic-bezier(.2,.7,.2,1) forwards}
        @media (prefers-reduced-motion: reduce){*{animation:none!important;transition:none!important}.rise{opacity:1}}
      `}</style>

      {/* Brand panel */}
      <aside className="relative isolate m-4 hidden w-5/12 shrink-0 flex-col justify-between overflow-hidden rounded-[2rem] p-10 text-white lg:flex lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]">
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
          <span className="grid h-12 w-12 place-items-center rounded-full bg-white/10 text-[#e6c877] ring-1 ring-[#c9a24b]/70"><Shield className="h-6 w-6" strokeWidth={1.6} /></span>
          <span className="leading-none">
            <span className="block text-2xl" style={display}>{BRAND}</span>
            <span className="mt-1 block text-xs text-white/65">Administration portal</span>
          </span>
        </div>

        <div className="max-w-sm">
          <h1 className="text-4xl leading-[1.1]" style={display}>Add a teammate to the console</h1>
          <p className="mt-4 text-sm leading-relaxed text-white/75">Create an account for an administrator or team member and choose what they can do.</p>
          <ul className="mt-7 space-y-3">
            {GUIDANCE.map((g) => (
              <li key={g} className="flex items-start gap-3 text-sm text-white/85">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#e6c877]" /> {g}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center justify-between border-t border-white/10 pt-6 text-xs text-white/60">
          <span>© {new Date().getFullYear()} {BRAND}</span>
          <Link to="/" className={`inline-flex items-center gap-1.5 rounded text-[#e6c877] hover:text-white ${ringOnDark}`}><ArrowLeft className="h-3.5 w-3.5" /> Back to website</Link>
        </div>
      </aside>

      {/* Form panel */}
      <main className="flex flex-1 flex-col justify-center px-6 py-10 sm:px-12 lg:px-14">
        <div className="mx-auto w-full max-w-xl">
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <span className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-[#0f3d2e] text-[#e6c877]"><Shield className="h-5 w-5" strokeWidth={1.6} /></span>
              <span className="text-xl text-[#0a2a20]" style={display}>{BRAND}</span>
            </span>
            <Link to="/" className={`rounded text-xs font-semibold text-[#0f3d2e] hover:text-[#7a5c17] ${ring}`}>Website</Link>
          </div>

          <div className="rise rounded-3xl bg-white p-7 shadow-2xl shadow-[#0f3d2e]/10 ring-1 ring-[#0f3d2e]/10 sm:p-10">
            {success ? (
              <div className="py-6 text-center" role="status">
                <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#0f3d2e] text-[#e6c877]"><Check className="h-8 w-8" /></span>
                <h2 className="mt-6 text-3xl text-[#0a2a20]" style={display}>Account created</h2>
                <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-slate-600">{infoMessage}</p>
                <Link to="/auth/admin-login" className={`mt-8 inline-flex items-center gap-2 rounded-full bg-[#c9a24b] px-7 py-3.5 text-sm font-bold text-[#082a1f] transition hover:bg-[#e6c877] ${ring}`}>
                  Go to sign in <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <>
                <h2 className="text-3xl text-[#0a2a20]" style={display}>Create administrator account</h2>
                <p className="mt-2 text-sm text-slate-600">Register an administrator or team member with access to the agency system.</p>

                {error && (
                  <div className="mt-6 flex items-start gap-3 rounded-2xl bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-rose-200" role="alert">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                    <div className="flex-1 leading-snug">{error}</div>
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate className="mt-7 space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <TextField id="fullName" name="fullName" label="Full name" icon={User} value={formData.fullName} onChange={handleChange} autoComplete="name" placeholder="e.g. Ayoub Benali" error={errors.fullName} />
                    <TextField id="email" name="email" type="email" label="Work email" icon={Mail} value={formData.email} onChange={handleChange} autoComplete="email" placeholder="name@travelagency.com" error={errors.email} />
                  </div>

                  {/* Role picker */}
                  <fieldset>
                    <legend className="text-sm font-semibold text-[#0a2a20]">System role</legend>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {AVAILABLE_ROLES.map((r) => {
                        const on = formData.role === r.id;
                        return (
                          <label key={r.id} className={`flex cursor-pointer items-start gap-3 rounded-2xl p-3.5 transition has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[#c9a24b] ${on ? 'bg-[#f3f6f1] ring-2 ring-[#c9a24b]' : 'ring-1 ring-[#0f3d2e]/10 hover:ring-[#c9a24b]/70'}`}>
                            <input type="radio" name="role" value={r.id} checked={on} onChange={handleChange} className="sr-only" />
                            <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${on ? 'bg-[#0f3d2e] text-[#e6c877]' : 'bg-slate-100 text-transparent'}`}><Check className="h-3 w-3" strokeWidth={3} /></span>
                            <span>
                              <span className="block text-sm font-semibold text-[#0a2a20]">{r.label}</span>
                              <span className="block text-xs leading-snug text-slate-500">{r.desc}</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <TextField id="department" name="department" label="Department" icon={Building} value={formData.department} onChange={handleChange} placeholder="e.g. Operations, Sales" />
                    <TextField id="jobTitle" name="jobTitle" label="Job title" icon={Briefcase} value={formData.jobTitle} onChange={handleChange} placeholder="e.g. Operations manager" />
                  </div>

                  <TextField id="phone" name="phone" type="tel" label="Phone number" icon={Phone} value={formData.phone} onChange={handleChange} autoComplete="tel" placeholder="+212 600-000000" error={errors.phone} hint="Optional. Include the country code." />

                  <div className="grid gap-5 sm:grid-cols-2">
                    <TextField
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      label="Password"
                      icon={Lock}
                      value={formData.password}
                      onChange={handleChange}
                      autoComplete="new-password"
                      placeholder="At least 8 characters"
                      error={errors.password}
                      right={
                        <button
                          type="button"
                          onClick={() => setShowPassword((s) => !s)}
                          aria-label={showPassword ? 'Hide passwords' : 'Show passwords'}
                          aria-pressed={showPassword}
                          className={`absolute right-2.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-slate-500 transition hover:bg-[#0f3d2e]/10 hover:text-[#0f3d2e] ${ring}`}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      }
                    />
                    <TextField
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      label="Confirm password"
                      icon={Lock}
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      autoComplete="new-password"
                      placeholder="Repeat password"
                      error={errors.confirmPassword}
                      hint={passwordsMatch ? 'Passwords match.' : undefined}
                    />
                  </div>

                  {/* Strength meter */}
                  {formData.password && (
                    <div className="rounded-2xl bg-[#f3f6f1] p-4" aria-live="polite">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#0a2a20]">Password strength</span>
                        <span className={`font-semibold ${strength.text}`}>{strength.label}</span>
                      </div>
                      <div className="mt-2 flex gap-1.5" aria-hidden="true">
                        {[1, 2, 3, 4].map((i) => (
                          <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${score >= i ? strength.bar : 'bg-slate-200'}`} />
                        ))}
                      </div>
                      <ul className="mt-3 grid gap-1.5 text-xs sm:grid-cols-2">
                        {checks.map((c) => (
                          <li key={c.id} className={`flex items-center gap-2 ${c.ok ? 'text-[#0f3d2e]' : 'text-slate-500'}`}>
                            {c.ok ? <Check className="h-3.5 w-3.5 text-emerald-600" strokeWidth={3} /> : <Circle className="h-3 w-3" />} {c.label}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className={`flex w-full items-center justify-center gap-2 rounded-full bg-[#c9a24b] py-4 text-sm font-bold text-[#082a1f] shadow-lg shadow-[#c9a24b]/30 transition hover:bg-[#e6c877] disabled:cursor-not-allowed disabled:opacity-60 ${ring}`}
                  >
                    {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Registering…</> : <>Create administrator account <ArrowRight className="h-4 w-4" /></>}
                  </button>
                </form>

                <div className="mt-7 border-t border-[#0f3d2e]/10 pt-6 text-center text-sm text-slate-600">
                  Already registered?{' '}
                  <Link to="/auth/admin-login" className={`rounded font-semibold text-[#0f3d2e] transition hover:text-[#7a5c17] ${ring}`}>Admin sign in</Link>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}