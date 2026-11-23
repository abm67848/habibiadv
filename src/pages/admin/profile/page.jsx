import { translate } from '@/context/index.jsx';
import React, { useState, useRef, useEffect } from 'react';
import {
  User, Mail, Lock, Camera, Save, Eye, EyeOff, CheckCircle2, XCircle, AlertCircle, Shield,
  Clock, Hash, Phone, Briefcase, Building2, Star, RefreshCw, Upload, KeyRound, IdCard,
} from 'lucide-react';
import { useAuth } from '../../../context/index.jsx';
import { supabase } from '../../../lib/supabase/client.jsx';

/* ---------- Shared style tokens ---------- */
const inputCls =
  'w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition';
const labelCls = 'block text-xs font-medium text-slate-600 mb-1.5';
const btnGhost =
  'inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition';
const btnPrimary =
  'inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-500 shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed';

/* ---------- Helpers ---------- */
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const ROLE_LABELS = {
  super_admin: 'Superadministrador',
  admin: 'Administrador',
  manager: 'Gerente',
  agent: 'Agente',
  staff: 'Personal',
  accountant: 'Contable',
};
const roleLabel = (r = '') =>
  ROLE_LABELS[r] || r.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

/* ---------- Small presentational pieces ---------- */
function Banner({ type = 'info', children }) {
  const cfg = {
    success: { cls: 'bg-emerald-50 border-emerald-200 text-emerald-800', Icon: CheckCircle2, icon: 'text-emerald-600', role: 'status' },
    error: { cls: 'bg-rose-50 border-rose-200 text-rose-800', Icon: XCircle, icon: 'text-rose-600', role: 'alert' },
    info: { cls: 'bg-amber-50 border-amber-200 text-amber-800', Icon: AlertCircle, icon: 'text-amber-600', role: 'status' },
  }[type];
  const { cls, Icon, icon, role } = cfg;
  return (
    <div role={role} className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm rp-pop ${cls}`}>
      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${icon}`} />
      <span>{children}</span>
    </div>
  );
}

function Card({ children, className = '' }) {
  return <section className={`bg-white rounded-xl border border-slate-200/80 p-6 ${className}`}>{children}</section>;
}

function SectionTitle({ icon: Icon, children, aside }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
        <Icon className="w-4 h-4 text-amber-600" /> {children}
      </h2>
      {aside}
    </div>
  );
}

function IconInput({ icon: Icon, id, className = '', children, ...props }) {
  return (
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
      <input id={id} {...props} className={`${inputCls} pl-9 ${className}`} />
      {children}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, mono = false, valueColor = 'text-slate-800' }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-stone-50/60 px-4 py-3">
      <Icon className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className={`mt-0.5 text-sm ${valueColor} ${mono ? 'font-mono' : 'font-medium'} break-all`}>{value}</p>
      </div>
    </div>
  );
}

/* ---------- Page ---------- */
export default function AdminProfilePage() {
  const { user, profile, roles = [], isSuperAdmin, refreshSession } = useAuth();

  /* avatar */
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState(null);
  const fileInputRef = useRef(null);
  const objectUrlRef = useRef(null);

  /* personal info */
  const [info, setInfo] = useState({ full_name: '', phone: '', department: '', job_title: '' });
  const [infoLoading, setInfoLoading] = useState(false);
  const [infoMsg, setInfoMsg] = useState(null);

  /* email */
  const [newEmail, setNewEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMsg, setEmailMsg] = useState(null);

  /* password */
  const [passwords, setPasswords] = useState({ newPwd: '', confirmPwd: '' });
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMsg, setPwdMsg] = useState(null);

  /* sincroniza el perfil del contexto */
  useEffect(() => {
    if (profile) {
      setInfo({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        department: profile.department || '',
        job_title: profile.job_title || '',
      });
      setAvatarPreview(profile.avatar_url || null);
    }
  }, [profile]);

  /* libera la URL temporal de la imagen al desmontar */
  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, []);

  const displayName = info.full_name || user?.email?.split('@')[0] || 'Admin';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || '?';

  const infoChanged =
    info.full_name.trim() !== (profile?.full_name || '') ||
    info.phone.trim() !== (profile?.phone || '') ||
    info.department.trim() !== (profile?.department || '') ||
    info.job_title.trim() !== (profile?.job_title || '');

  /* ═══════════════════ HANDLERS ═══════════════════ */

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setAvatarMsg({ type: 'error', text: 'La imagen debe pesar menos de 2 MB.' });
      return;
    }
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = URL.createObjectURL(file);
    setAvatarFile(file);
    setAvatarPreview(objectUrlRef.current);
    setAvatarMsg(null);
  }

  async function handleAvatarUpload() {
    if (!avatarFile || !user) return;
    setAvatarLoading(true);
    setAvatarMsg(null);
    try {
      const ext = avatarFile.name.split('.').pop();
      const path = `${user.id}/avatar.${ext}`;

      /* primero intenta Supabase Storage */
      const { error: storageErr } = await supabase.storage
        .from('avatars')
        .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type });

      let avatarUrl;
      if (!storageErr) {
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
        avatarUrl = urlData?.publicUrl;
      } else {
        /* alternativa: base64 dentro de la tabla profiles */
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
      setAvatarMsg({ type: 'success', text: '¡Foto de perfil actualizada!' });
      setAvatarFile(null);
    } catch (err) {
      setAvatarMsg({ type: 'error', text: err.message || 'No se pudo subir la imagen.' });
    } finally {
      setAvatarLoading(false);
    }
  }

  async function handleSaveInfo(e) {
    e.preventDefault();
    if (!user) return;
    setInfoLoading(true);
    setInfoMsg(null);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: info.full_name.trim(),
          phone: info.phone.trim(),
          department: info.department.trim(),
          job_title: info.job_title.trim(),
        })
        .eq('id', user.id);
      if (error) throw error;
      await refreshSession();
      setInfoMsg({ type: 'success', text: 'Información personal guardada.' });
    } catch (err) {
      setInfoMsg({ type: 'error', text: err.message || 'No se pudieron guardar los cambios.' });
    } finally {
      setInfoLoading(false);
    }
  }

  async function handleEmailChange(e) {
    e.preventDefault();
    if (!newEmail || !newEmail.includes('@')) {
      setEmailMsg({ type: 'error', text: 'Introduce un correo electrónico válido.' });
      return;
    }
    setEmailLoading(true);
    setEmailMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      setEmailMsg({ type: 'success', text: 'Confirmación enviada: revisa tu nueva bandeja de entrada para confirmar el cambio.' });
      setNewEmail('');
    } catch (err) {
      setEmailMsg({ type: 'error', text: err.message || 'No se pudo actualizar el correo.' });
    } finally {
      setEmailLoading(false);
    }
  }

  async function handlePasswordChange(e) {
    e.preventDefault();
    if (passwords.newPwd.length < 8) {
      setPwdMsg({ type: 'error', text: 'La contraseña debe tener al menos 8 caracteres.' });
      return;
    }
    if (passwords.newPwd !== passwords.confirmPwd) {
      setPwdMsg({ type: 'error', text: 'Las contraseñas no coinciden.' });
      return;
    }
    setPwdLoading(true);
    setPwdMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwords.newPwd });
      if (error) throw error;
      setPwdMsg({ type: 'success', text: 'Contraseña actualizada correctamente.' });
      setPasswords({ newPwd: '', confirmPwd: '' });
    } catch (err) {
      setPwdMsg({ type: 'error', text: err.message || 'No se pudo actualizar la contraseña.' });
    } finally {
      setPwdLoading(false);
    }
  }

  /* fortaleza de la contraseña */
  const pwdStrength = (() => {
    const p = passwords.newPwd;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  })();
  const strengthLabel = ['', 'Débil', 'Aceptable', 'Buena', 'Fuerte'][pwdStrength];
  const strengthBar = ['', 'bg-rose-400', 'bg-amber-400', 'bg-sky-400', 'bg-emerald-500'][pwdStrength];
  const strengthText = ['', 'text-rose-600', 'text-amber-600', 'text-sky-600', 'text-emerald-600'][pwdStrength];

  const personalFields = [
    { key: 'full_name', label: 'Nombre completo', Icon: User, placeholder: 'Tu nombre completo', autoComplete: 'name' },
    { key: 'phone', label: 'Teléfono', Icon: Phone, placeholder: '+212 600000000', autoComplete: 'tel', type: 'tel' },
    { key: 'department', label: 'Departamento', Icon: Building2, placeholder: 'p. ej. Operaciones', autoComplete: 'organization' },
    { key: 'job_title', label: 'Cargo', Icon: Briefcase, placeholder: 'p. ej. Consultor de viajes', autoComplete: 'organization-title' },
  ];

  /* ---------- Render ---------- */
  return (
    <div className="min-h-screen bg-stone-50">
      <style>{`
        @keyframes rp-pop { from { opacity: 0; transform: translateY(6px) scale(.98); } to { opacity: 1; transform: none; } }
        .rp-pop { animation: rp-pop .16s ease-out; }
        @media (prefers-reduced-motion: reduce) { .rp-pop { animation-duration: 1ms; } }
      `}</style>

      <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">{translate('Mi perfil')}</h1>
          <p className="text-sm text-slate-500 mt-1">{translate('Gestiona los ajustes de tu cuenta y tu información personal.')}</p>
        </div>

        {/* Avatar + información personal */}
        <div className="grid gap-6 md:grid-cols-5">
          <Card className="md:col-span-2 flex flex-col items-center gap-4">
            <div className="self-stretch">
              <SectionTitle icon={Camera}>{translate('Foto de perfil')}</SectionTitle>
            </div>

            <div className="relative">
              <div className="h-28 w-28 rounded-full overflow-hidden ring-4 ring-amber-100">
                {avatarPreview ? (
                  <img src={avatarPreview} alt={`Foto de perfil de ${displayName}`} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-slate-900 text-amber-100 text-3xl font-semibold">
                    {initials}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-amber-600 text-white shadow-sm hover:bg-amber-500 transition border-2 border-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
                title="Cambiar foto"
                aria-label="Cambiar foto de perfil"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>

            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />

            <p className="text-xs text-slate-400 text-center">{translate('JPG, PNG o WEBP · Máx. 2 MB')}</p>

            {avatarFile && (
              <button type="button" onClick={handleAvatarUpload} disabled={avatarLoading} className={btnPrimary}>
                {avatarLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {avatarLoading ? 'Subiendo…' : 'Guardar foto'}
              </button>
            )}

            {avatarMsg && <div className="w-full"><Banner type={avatarMsg.type}>{avatarMsg.text}</Banner></div>}

            {/* Roles */}
            <div className="w-full pt-4 border-t border-slate-100 space-y-2">
              <p className="text-xs font-medium text-slate-600">{translate('Roles asignados')}</p>
              {roles.length > 0 ? roles.map((r) => (
                <div key={r} className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                  <Star className="h-4 w-4 text-amber-600 shrink-0" />
                  <span className="text-sm font-medium text-amber-900">{roleLabel(r)}</span>
                  {isSuperAdmin && r === 'super_admin' && (
                    <span className="ml-auto text-xs font-semibold text-amber-700">{translate('Acceso total')}</span>
                  )}
                </div>
              )) : (
                <p className="text-sm text-slate-400">{translate('Sin roles asignados')}</p>
              )}
            </div>
          </Card>

          <Card className="md:col-span-3">
            <SectionTitle icon={IdCard}>{translate('Información personal')}</SectionTitle>
            <form onSubmit={handleSaveInfo} className="mt-5 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                {personalFields.map(({ key, label, Icon, placeholder, autoComplete, type }) => (
                  <div key={key}>
                    <label htmlFor={`profile-${key}`} className={labelCls}>{label}</label>
                    <IconInput
                      id={`profile-${key}`}
                      icon={Icon}
                      type={type || 'text'}
                      autoComplete={autoComplete}
                      value={info[key]}
                      onChange={(e) => setInfo({ ...info, [key]: e.target.value })}
                      placeholder={placeholder}
                    />
                  </div>
                ))}
              </div>

              {infoMsg && <Banner type={infoMsg.type}>{infoMsg.text}</Banner>}

              <div className="flex justify-end pt-5 border-t border-slate-100">
                <button type="submit" disabled={infoLoading || !infoChanged} className={btnPrimary}>
                  {infoLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {infoLoading ? 'Guardando…' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </Card>
        </div>

        {/* Correo + contraseña */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <SectionTitle icon={Mail}>{translate('Cambiar correo electrónico')}</SectionTitle>

            <div className="mt-5 rounded-xl border border-slate-200 bg-stone-50/60 px-4 py-3">
              <p className="text-xs text-slate-500">{translate('Correo actual')}</p>
              <p className="mt-0.5 text-sm font-medium text-slate-800 break-all">{user?.email || '—'}</p>
            </div>

            <form onSubmit={handleEmailChange} className="mt-4 space-y-4">
              <div>
                <label htmlFor="profile-new-email" className={labelCls}>{translate('Nuevo correo electrónico')}</label>
                <IconInput
                  id="profile-new-email"
                  icon={Mail}
                  type="email"
                  autoComplete="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="nuevo@ejemplo.com"
                />
                <p className="mt-1.5 text-xs text-slate-400">{translate('Enviaremos un enlace de confirmación a tu nuevo correo.')}</p>
              </div>

              {emailMsg && <Banner type={emailMsg.type}>{emailMsg.text}</Banner>}

              <div className="flex justify-end pt-5 border-t border-slate-100">
                <button type="submit" disabled={emailLoading || !newEmail} className={btnPrimary}>
                  {emailLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  {emailLoading ? 'Enviando…' : 'Actualizar correo'}
                </button>
              </div>
            </form>
          </Card>

          <Card>
            <SectionTitle icon={KeyRound}>{translate('Cambiar contraseña')}</SectionTitle>

            <form onSubmit={handlePasswordChange} className="mt-5 space-y-4">
              <div>
                <label htmlFor="profile-new-password" className={labelCls}>{translate('Nueva contraseña')}</label>
                <IconInput
                  id="profile-new-password"
                  icon={Lock}
                  type={showNew ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="pr-10"
                  value={passwords.newPwd}
                  onChange={(e) => setPasswords({ ...passwords, newPwd: e.target.value })}
                  placeholder="Mínimo 8 caracteres"
                >
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded"
                    aria-label={showNew ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    aria-pressed={showNew}
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </IconInput>
                {passwords.newPwd && (
                  <div className="mt-2 space-y-1" aria-live="polite">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((n) => (
                        <div key={n} className={`h-1 flex-1 rounded-full transition-colors ${n <= pwdStrength ? strengthBar : 'bg-slate-200'}`} />
                      ))}
                    </div>
                    <p className={`text-xs font-medium ${strengthText}`}>Seguridad: {strengthLabel}</p>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="profile-confirm-password" className={labelCls}>{translate('Confirmar contraseña')}</label>
                <IconInput
                  id="profile-confirm-password"
                  icon={Lock}
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="pr-10"
                  value={passwords.confirmPwd}
                  onChange={(e) => setPasswords({ ...passwords, confirmPwd: e.target.value })}
                  placeholder="Repite la nueva contraseña"
                >
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded"
                    aria-label={showConfirm ? 'Ocultar confirmación' : 'Mostrar confirmación'}
                    aria-pressed={showConfirm}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </IconInput>
                {passwords.confirmPwd && passwords.newPwd !== passwords.confirmPwd && (
                  <p className="mt-1.5 text-xs font-medium text-rose-600">{translate('Las contraseñas no coinciden')}</p>
                )}
              </div>

              {pwdMsg && <Banner type={pwdMsg.type}>{pwdMsg.text}</Banner>}

              <div className="flex justify-end pt-5 border-t border-slate-100">
                <button type="submit" disabled={pwdLoading || !passwords.newPwd || !passwords.confirmPwd} className={btnPrimary}>
                  {pwdLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                  {pwdLoading ? 'Actualizando…' : 'Actualizar contraseña'}
                </button>
              </div>
            </form>
          </Card>
        </div>

        {/* Información de la cuenta (solo lectura) */}
        <Card>
          <SectionTitle
            icon={Shield}
            aside={
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
                {translate('Solo lectura')}
              </span>
            }
          >
            {translate('Información de la cuenta')}
          </SectionTitle>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <InfoRow icon={Hash} label="ID de usuario" value={user?.id ? `${user.id.slice(0, 8)}…` : '—'} mono />
            <InfoRow icon={Mail} label="Método de acceso" value="Correo y contraseña" />
            <InfoRow
              icon={CheckCircle2}
              label="Correo confirmado"
              value={user?.email_confirmed_at ? fmtDate(user.email_confirmed_at) : 'Sin confirmar'}
              valueColor={user?.email_confirmed_at ? 'text-emerald-600' : 'text-rose-600'}
            />
            <InfoRow icon={Clock} label="Último inicio de sesión" value={fmtDate(user?.last_sign_in_at)} />
            <InfoRow icon={Clock} label="Cuenta creada" value={fmtDate(user?.created_at)} />
            <InfoRow
              icon={Shield}
              label="Superadministrador"
              value={isSuperAdmin ? 'Sí' : 'No'}
              valueColor={isSuperAdmin ? 'text-amber-700 font-semibold' : 'text-slate-500'}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}