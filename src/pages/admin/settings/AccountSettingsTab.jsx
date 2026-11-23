import { useEffect, useState } from 'react';
import { AlertTriangle, Save, ShieldCheck, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/index.jsx';
import { supabase } from '@/lib/supabase/client.jsx';

const inputClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20';
const deletePhrase = 'DELETE MY ACCOUNT';

export default function AccountSettingsTab({ onNotification }) {
  const { user, profile, roles, refreshSession } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [emailConfirmation, setEmailConfirmation] = useState('');
  const [phraseConfirmation, setPhraseConfirmation] = useState('');
  const [understands, setUnderstands] = useState(false);
  const [accountError, setAccountError] = useState('');
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    setForm({
      fullName: profile?.full_name || '',
      phone: profile?.phone || '',
    });
  }, [profile]);

  const handleSave = async (event) => {
    event.preventDefault();
    if (!user?.id) return;
    setSaving(true);
    setAccountError('');
    try {
      const { data, error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: form.fullName.trim(),
          phone: form.phone.trim() || null,
        })
        .eq('id', user.id)
        .select('id')
        .maybeSingle();
      if (updateError) throw updateError;
      if (!data) throw new Error('No se encontró el perfil de su cuenta.');

      await refreshSession();
      onNotification?.('Información de la cuenta guardada.');
    } catch (saveError) {
      console.error('Could not save account information:', saveError);
      setAccountError(`No se pudo guardar la información de la cuenta: ${saveError.message}`);
    } finally {
      setSaving(false);
    }
  };

  const canDelete = Boolean(
    user?.email
    && currentPassword
    && emailConfirmation === user.email
    && phraseConfirmation === deletePhrase
    && understands,
  );

  const handleDelete = async (event) => {
    event.preventDefault();
    if (!canDelete || !user?.email) return;
    setDeleting(true);
    setDeleteError('');
    try {
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (reauthError) throw new Error(`La verificación de contraseña falló: ${reauthError.message}`);

      const { error: deleteError } = await supabase.rpc('delete_my_account', {
        confirmation_email: emailConfirmation.trim(),
        confirmation_phrase: phraseConfirmation,
      });
      if (deleteError) throw deleteError;

      const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
      if (signOutError) throw signOutError;
      navigate('/auth/admin-login', { replace: true });
    } catch (deleteError) {
      console.error('Could not delete the account:', deleteError);
      setDeleteError(`No se pudo eliminar la cuenta: ${deleteError.message}`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <form onSubmit={handleSave} className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Información de la cuenta</h2>
          <p className="mt-1 text-xs text-slate-500">Actualice los datos de contacto asociados a su perfil de administrador.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 text-xs font-medium text-slate-600">
            <span>Nombre completo</span>
            <input
              required
              value={form.fullName}
              onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
              className={inputClass}
              autoComplete="name"
            />
          </label>
          <label className="space-y-1.5 text-xs font-medium text-slate-600">
            <span>Correo electrónico</span>
            <input value={user?.email || ''} readOnly className={`${inputClass} bg-slate-50 text-slate-500`} />
          </label>
          <label className="space-y-1.5 text-xs font-medium text-slate-600">
            <span>Número de teléfono</span>
            <input
              type="tel"
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              className={inputClass}
              autoComplete="tel"
            />
          </label>
          <div className="space-y-1.5 text-xs font-medium text-slate-600">
            <span className="block">Roles asignados</span>
            <div className="flex min-h-[42px] items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <ShieldCheck className="h-4 w-4 text-amber-600" />
              {roles?.length ? roles.join(', ') : 'Sin roles asignados'}
            </div>
          </div>
        </div>

        {accountError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{accountError}</p>}
        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-50">
          <Save className="h-4 w-4" /> {saving ? 'Guardando…' : 'Guardar información de la cuenta'}
        </button>
      </form>

      <section className="space-y-5 rounded-xl border-2 border-rose-200 bg-white p-6 shadow-xs">
        <div className="flex items-start gap-3">
          <span className="rounded-lg bg-rose-100 p-2 text-rose-700"><AlertTriangle className="h-5 w-5" /></span>
          <div>
            <h2 className="text-base font-semibold text-rose-800">Zona peligrosa — eliminar cuenta</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              Esto elimina permanentemente su acceso y perfil. Las reservas, pagos y demás registros comerciales de la agencia no se eliminan deliberadamente. El último superadministrador activo no puede eliminar su cuenta.
            </p>
          </div>
        </div>

        <form onSubmit={handleDelete} className="space-y-4 rounded-lg bg-rose-50/60 p-4">
          <label className="block space-y-1.5 text-xs font-semibold text-slate-700">
            <span>1. Introduzca de nuevo su contraseña actual</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block space-y-1.5 text-xs font-semibold text-slate-700">
            <span>2. Escriba exactamente el correo de su cuenta: <span className="font-mono text-rose-800">{user?.email}</span></span>
            <input
              type="email"
              required
              value={emailConfirmation}
              onChange={(event) => setEmailConfirmation(event.target.value)}
              className={inputClass}
              autoComplete="off"
            />
          </label>
          <label className="block space-y-1.5 text-xs font-semibold text-slate-700">
            <span>3. Escriba <span className="font-mono text-rose-800">{deletePhrase}</span></span>
            <input
              required
              value={phraseConfirmation}
              onChange={(event) => setPhraseConfirmation(event.target.value)}
              className={inputClass}
              autoComplete="off"
              spellCheck="false"
            />
          </label>
          <label className="flex items-start gap-2 text-xs leading-relaxed text-slate-700">
            <input
              type="checkbox"
              checked={understands}
              onChange={(event) => setUnderstands(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
            />
            <span>4. Entiendo que esta acción es permanente, cerrará mi sesión y no se puede deshacer.</span>
          </label>

          {deleteError && <p role="alert" className="rounded-lg border border-rose-200 bg-white p-3 text-sm text-rose-700">{deleteError}</p>}
          <button
            type="submit"
            disabled={!canDelete || deleting}
            className="inline-flex items-center gap-2 rounded-lg bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" /> {deleting ? 'Verificando y eliminando…' : 'Eliminar permanentemente mi cuenta'}
          </button>
        </form>
      </section>
    </div>
  );
}
