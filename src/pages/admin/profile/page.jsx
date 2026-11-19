import { useAppSettings, translate } from '@/context/index.jsx';
import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  Mail,
  Lock,
  Camera,
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  AlertCircle,
  Shield,
  Clock,
  Hash,
  Phone,
  Briefcase,
  Building2,
  Star,
  RefreshCw,
  Upload,
} from 'lucide-react';
import { useAuth } from '../../../context/index.jsx';
import { supabase } from '../../../lib/supabase/client.jsx';

/* ─────────────────────────── helpers ─────────────────────────── */
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function Alert({ type = 'info', children }) {
  const cfg = {
    success: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', Icon: CheckCircle },
    error:   { bg: 'bg-rose-50',    border: 'border-rose-200',    text: 'text-rose-800',    Icon: XCircle },
    info:    { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-800',   Icon: AlertCircle },
  }[type];
  const { bg, border, text, Icon } = cfg;
  return (
    <div className={`flex items-start gap-2.5 rounded-lg border ${border} ${bg} px-4 py-3 text-xs ${text} font-medium`}>
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

/* ─────────────────────────── main component ─────────────────────────── */
export default function AdminProfilePage() {
  const { user, profile, roles, isSuperAdmin, refreshSession } = useAuth();

  /* ── avatar ── */
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile]       = useState(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarMsg, setAvatarMsg]         = useState(null);
  const fileInputRef = useRef(null);

  /* ── personal info ── */
  const [info, setInfo] = useState({
    full_name:  '',
    phone:      '',
    department: '',
    job_title:  '',
  });
  const [infoLoading, setInfoLoading] = useState(false);
  const [infoMsg, setInfoMsg]         = useState(null);

  /* ── email ── */
  const [newEmail, setNewEmail]       = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMsg, setEmailMsg]       = useState(null);

  /* ── password ── */
  const [passwords, setPasswords]       = useState({ newPwd: '', confirmPwd: '' });
  const [showNew, setShowNew]           = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [pwdLoading, setPwdLoading]     = useState(false);
  const [pwdMsg, setPwdMsg]             = useState(null);

  /* sync profile changes from context */
  useEffect(() => {
    if (profile) {
      setInfo({
        full_name:  profile.full_name  || '',
        phone:      profile.phone      || '',
        department: profile.department || '',
        job_title:  profile.job_title  || '',
      });
      setAvatarPreview(profile.avatar_url || null);
    }
  }, [profile]);

  /* ── initials avatar ── */
  const displayName = info.full_name || user?.email?.split('@')[0] || 'Admin';
  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  /* ═══════════════════ HANDLERS ═══════════════════ */

  /* avatar file pick */
  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setAvatarMsg({ type: 'error', text: 'Image must be under 2 MB.' });
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setAvatarMsg(null);
  }

  /* upload avatar */
  async function handleAvatarUpload() {
    if (!avatarFile || !user) return;
    setAvatarLoading(true);
    setAvatarMsg(null);
    try {
      const ext  = avatarFile.name.split('.').pop();
      const path = `${user.id}/avatar.${ext}`;

      /* try Supabase Storage first */
      const { error: storageErr } = await supabase.storage
        .from('avatars')
        .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type });

      let avatarUrl;
      if (!storageErr) {
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
        avatarUrl = urlData?.publicUrl;
      } else {
        /* fallback: base64 inline in profiles table */
        avatarUrl = await new Promise((res) => {
          const reader = new FileReader();
          reader.onloadend = () => res(reader.result);
          reader.readAsDataURL(avatarFile);
        });
      }

      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id);

      if (updateErr) throw updateErr;
      await refreshSession();
      setAvatarMsg({ type: 'success', text: 'Profile picture updated!' });
      setAvatarFile(null);
    } catch (err) {
      setAvatarMsg({ type: 'error', text: err.message || 'Upload failed.' });
    } finally {
      setAvatarLoading(false);
    }
  }

  /* save personal info */
  async function handleSaveInfo(e) {
    e.preventDefault();
    if (!user) return;
    setInfoLoading(true);
    setInfoMsg(null);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name:  info.full_name.trim(),
          phone:      info.phone.trim(),
          department: info.department.trim(),
          job_title:  info.job_title.trim(),
        })
        .eq('id', user.id);
      if (error) throw error;
      await refreshSession();
      setInfoMsg({ type: 'success', text: 'Personal information saved.' });
    } catch (err) {
      setInfoMsg({ type: 'error', text: err.message || 'Could not save changes.' });
    } finally {
      setInfoLoading(false);
    }
  }

  /* change email */
  async function handleEmailChange(e) {
    e.preventDefault();
    if (!newEmail || !newEmail.includes('@')) {
      setEmailMsg({ type: 'error', text: 'Enter a valid email address.' });
      return;
    }
    setEmailLoading(true);
    setEmailMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      setEmailMsg({ type: 'success', text: 'Confirmation sent — check your new inbox to confirm the change.' });
      setNewEmail('');
    } catch (err) {
      setEmailMsg({ type: 'error', text: err.message || 'Could not update email.' });
    } finally {
      setEmailLoading(false);
    }
  }

  /* change password */
  async function handlePasswordChange(e) {
    e.preventDefault();
    if (passwords.newPwd.length < 8) {
      setPwdMsg({ type: 'error', text: 'Password must be at least 8 characters.' });
      return;
    }
    if (passwords.newPwd !== passwords.confirmPwd) {
      setPwdMsg({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    setPwdLoading(true);
    setPwdMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwords.newPwd });
      if (error) throw error;
      setPwdMsg({ type: 'success', text: 'Password updated successfully.' });
      setPasswords({ newPwd: '', confirmPwd: '' });
    } catch (err) {
      setPwdMsg({ type: 'error', text: err.message || 'Could not update password.' });
    } finally {
      setPwdLoading(false);
    }
  }

  /* password strength */
  const pwdStrength = (() => {
    const p = passwords.newPwd;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8)          s++;
    if (/[A-Z]/.test(p))        s++;
    if (/[0-9]/.test(p))        s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  })();
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][pwdStrength];
  const strengthColor = ['', 'bg-rose-400', 'bg-amber-400', 'bg-blue-400', 'bg-emerald-500'][pwdStrength];

  /* ─────────────────────── UI ─────────────────────── */
  return (
    <div className="min-h-screen bg-slate-50/60 p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">

        {/* ── Page Header ── */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 shadow">
            <User className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">{translate('My Profile')}</h1>
            <p className="text-xs text-slate-500">{translate('Manage your account settings and personal information')}</p>
          </div>
        </div>

        {/* ════════════════════════════════════════
            SECTION 1 — Avatar + Personal Info
        ════════════════════════════════════════ */}
        <div className="grid gap-6 md:grid-cols-5">

          {/* ── Avatar Card ── */}
          <div className="md:col-span-2 rounded-xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col items-center gap-4">
            <h2 className="self-start text-xs font-semibold uppercase tracking-widest text-slate-500">{translate('Profile Picture')}</h2>

            <div className="relative">
              <div className="h-28 w-28 rounded-full overflow-hidden ring-4 ring-amber-100 shadow-md">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-amber-400 to-amber-600 text-white text-3xl font-bold">
                    {initials}
                  </div>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-amber-600 text-white shadow hover:bg-amber-500 transition-colors border-2 border-white"
                title="Change photo"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>

            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

            <p className="text-[11px] text-slate-400 text-center">{translate('JPG, PNG or WEBP · Max 2 MB')}</p>

            {avatarFile && (
              <button
                onClick={handleAvatarUpload}
                disabled={avatarLoading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-500 disabled:opacity-60 transition-all shadow-xs"
              >
                {avatarLoading
                  ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  : <Upload className="h-3.5 w-3.5" />}
                {avatarLoading ? 'Uploading…' : 'Save Photo'}
              </button>
            )}

            {avatarMsg && <Alert type={avatarMsg.type}>{avatarMsg.text}</Alert>}

            {/* Role badges */}
            <div className="w-full pt-2 border-t border-slate-100 flex flex-col gap-1.5">
              {roles.length > 0 ? roles.map((r) => (
                <div key={r} className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5">
                  <Star className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  <span className="text-[11px] font-semibold text-amber-800 capitalize">{r.replace('_', ' ')}</span>
                  {isSuperAdmin && r === 'super_admin' && (
                    <span className="ml-auto text-[9px] font-bold uppercase tracking-widest text-amber-600">{translate('Super')}</span>
                  )}
                </div>
              )) : (
                <p className="text-[11px] text-slate-400 italic">{translate('No roles assigned')}</p>
              )}
            </div>
          </div>

          {/* ── Personal Info Form ── */}
          <div className="md:col-span-3 rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">{translate('Personal Information')}</h2>
            <form onSubmit={handleSaveInfo} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { key: 'full_name',  label: 'Full Name',   Icon: User,      placeholder: 'Your full name' },
                  { key: 'phone',      label: 'Phone',        Icon: Phone,     placeholder: '+1 234 567 8900' },
                  { key: 'department', label: 'Department',   Icon: Building2, placeholder: 'e.g. Operations' },
                  { key: 'job_title',  label: 'Job Title',    Icon: Briefcase, placeholder: 'e.g. Travel Consultant' },
                ].map(({ key, label, Icon, placeholder }) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">{label}</label>
                    <div className="relative">
                      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        value={info[key]}
                        onChange={(e) => setInfo({ ...info, [key]: e.target.value })}
                        placeholder={placeholder}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100 transition"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {infoMsg && <Alert type={infoMsg.type}>{infoMsg.text}</Alert>}

              <button
                type="submit"
                disabled={infoLoading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-5 py-2 text-xs font-semibold text-white hover:bg-amber-500 disabled:opacity-60 transition-all shadow-xs"
              >
                {infoLoading
                  ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  : <Save className="h-3.5 w-3.5" />}
                {infoLoading ? 'Saving…' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>

        {/* ════════════════════════════════════════
            SECTION 2 — Email + Password
        ════════════════════════════════════════ */}
        <div className="grid gap-6 md:grid-cols-2">

          {/* ── Change Email ── */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50">
                <Mail className="h-3.5 w-3.5 text-blue-600" />
              </div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">{translate('Change Email')}</h2>
            </div>

            <div className="mb-4 rounded-lg border border-slate-100 bg-slate-50 px-3.5 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">{translate('Current Email')}</p>
              <p className="text-xs font-semibold text-slate-700">{user?.email || '—'}</p>
            </div>

            <form onSubmit={handleEmailChange} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">{translate('New Email Address')}</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="new@email.com"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100 transition"
                  />
                </div>
              </div>

              {emailMsg && <Alert type={emailMsg.type}>{emailMsg.text}</Alert>}

              <button
                type="submit"
                disabled={emailLoading || !newEmail}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-5 py-2 text-xs font-semibold text-white hover:bg-amber-500 disabled:opacity-60 transition-all shadow-xs"
              >
                {emailLoading
                  ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  : <Mail className="h-3.5 w-3.5" />}
                {emailLoading ? 'Sending…' : 'Update Email'}
              </button>
              <p className="text-[10px] text-slate-400">{translate('A confirmation link will be sent to your new email address.')}</p>
            </form>
          </div>

          {/* ── Change Password ── */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50">
                <Lock className="h-3.5 w-3.5 text-violet-600" />
              </div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">{translate('Change Password')}</h2>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">{translate('New Password')}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={passwords.newPwd}
                    onChange={(e) => setPasswords({ ...passwords, newPwd: e.target.value })}
                    placeholder="Min 8 characters"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-9 text-xs text-slate-800 placeholder:text-slate-400 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNew ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                {passwords.newPwd && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1">
                      {[1,2,3,4].map((n) => (
                        <div key={n} className={`h-1 flex-1 rounded-full transition-colors ${n <= pwdStrength ? strengthColor : 'bg-slate-200'}`} />
                      ))}
                    </div>
                    <p className={`text-[10px] font-semibold ${['','text-rose-500','text-amber-500','text-blue-500','text-emerald-600'][pwdStrength]}`}>
                      {strengthLabel}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">{translate('Confirm Password')}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={passwords.confirmPwd}
                    onChange={(e) => setPasswords({ ...passwords, confirmPwd: e.target.value })}
                    placeholder="Repeat new password"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-9 text-xs text-slate-800 placeholder:text-slate-400 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-100 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirm ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                {passwords.confirmPwd && passwords.newPwd !== passwords.confirmPwd && (
                  <p className="mt-1 text-[10px] font-semibold text-rose-500">{translate('Passwords don\'t match')}</p>
                )}
              </div>

              {pwdMsg && <Alert type={pwdMsg.type}>{pwdMsg.text}</Alert>}

              <button
                type="submit"
                disabled={pwdLoading || !passwords.newPwd || !passwords.confirmPwd}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-5 py-2 text-xs font-semibold text-white hover:bg-amber-500 disabled:opacity-60 transition-all shadow-xs"
              >
                {pwdLoading
                  ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  : <Lock className="h-3.5 w-3.5" />}
                {pwdLoading ? 'Updating…' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>

        {/* ════════════════════════════════════════
            SECTION 3 — Account Information (read-only)
        ════════════════════════════════════════ */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="mb-5 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100">
              <Shield className="h-3.5 w-3.5 text-slate-600" />
            </div>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">{translate('Account Information')}</h2>
            <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-100 rounded px-2 py-0.5">{translate('Read-only')}</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <InfoRow icon={<Hash />}        label="User ID"          value={user?.id ? `${user.id.slice(0,8)}…` : '—'} mono />
            <InfoRow icon={<Mail />}        label="Auth Provider"    value="Email / Password" />
            <InfoRow
              icon={<CheckCircle />}
              label="Email Confirmed"
              value={user?.email_confirmed_at ? fmtDate(user.email_confirmed_at) : 'Not confirmed'}
              valueColor={user?.email_confirmed_at ? 'text-emerald-600' : 'text-rose-500'}
            />
            <InfoRow icon={<Clock />}  label="Last Sign In"    value={fmtDate(user?.last_sign_in_at)} />
            <InfoRow icon={<Clock />}  label="Account Created" value={fmtDate(user?.created_at)} />
            <InfoRow
              icon={<Shield />}
              label="Super Admin"
              value={isSuperAdmin ? 'Yes' : 'No'}
              valueColor={isSuperAdmin ? 'text-amber-600 font-bold' : 'text-slate-500'}
            />
          </div>
        </div>

      </div>
    </div>
  );
}

/* ── small info row ── */
function InfoRow({ icon, label, value, mono = false, valueColor = 'text-slate-800' }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/60 px-3.5 py-3">
      <div className="mt-0.5 text-slate-400 shrink-0 [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <p className={`mt-0.5 text-xs ${valueColor} ${mono ? 'font-mono' : 'font-medium'} break-all`}>{value}</p>
      </div>
    </div>
  );
}
