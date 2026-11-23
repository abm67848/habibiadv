import { useEffect, useState, useCallback } from 'react';
import {
  Plus, Trash2, ChevronDown, ChevronUp, Save, Eye, EyeOff,
  Star, Globe, Loader2, Image as ImageIcon, Building2, Tag,
} from 'lucide-react';
import {
  DEFAULT_PARTNERSHIPS_CONTENT,
  fetchPublicSiteContent,
  savePublicPageContent,
} from '@/services/publicSiteContent.js';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function uid() {
  return `partner-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
}

const INPUT = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20';
const LABEL = 'block text-xs font-semibold text-slate-700 mb-1';
const SECTION = 'rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5';
const BTN_PRIMARY = 'inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-amber-500 transition disabled:opacity-50';

const PARTNER_CATEGORIES = [
  'Hotels & Riads',
  'Guides',
  'Transport',
  'Experiences',
  'Activities',
  'Food & Dining',
  'Other',
];

const BLANK_PARTNER = () => ({
  id: uid(),
  name: '',
  category: 'Other',
  logo: '',
  description: '',
  website: '',
  featured: false,
});

/* ------------------------------------------------------------------ */
/*  Single Partner Editor                                              */
/* ------------------------------------------------------------------ */
function PartnerEditor({ partner, onChange, onDelete, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const set = (key, val) => onChange({ ...partner, [key]: val });

  return (
    <div className={`rounded-xl border bg-white ${partner.featured ? 'border-amber-200' : 'border-slate-200'}`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex flex-1 items-center gap-2 min-w-0">
          {partner.logo ? (
            <img src={partner.logo} alt="" className="h-7 w-7 rounded-full object-contain bg-slate-50 ring-1 ring-slate-200" onError={(e) => (e.currentTarget.style.display = 'none')} />
          ) : (
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-400">
              <Building2 className="h-3.5 w-3.5" />
            </span>
          )}
          <span className="truncate text-sm font-semibold text-slate-800">{partner.name || 'Socio sin título'}</span>
          {partner.category && (
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">{partner.category}</span>
          )}
          {partner.featured && (
            <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">Destacado</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => set('featured', !partner.featured)}
            title={partner.featured ? 'Quitar destacado' : 'Marcar como destacado'}
            className={`grid h-7 w-7 place-items-center rounded-lg transition ${partner.featured ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
          >
            <Star className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="grid h-7 w-7 place-items-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
          >
            {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="grid h-7 w-7 place-items-center rounded-lg text-rose-500 hover:bg-rose-50 transition"
            title="Eliminar socio"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded Form */}
      {open && (
        <div className="border-t border-slate-100 px-4 pb-5 pt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL}>Nombre del socio <span className="text-rose-500">*</span></label>
              <input value={partner.name} onChange={(e) => set('name', e.target.value)} className={INPUT} placeholder="e.g. Atlas Luxury Riads" />
            </div>
            <div>
              <label className={LABEL}><Tag className="inline h-3 w-3 mr-1" />Categoría</label>
              <select value={partner.category} onChange={(e) => set('category', e.target.value)} className={INPUT}>
                {PARTNER_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={LABEL}>Descripción breve</label>
            <textarea value={partner.description} onChange={(e) => set('description', e.target.value)} rows={2} className={INPUT} placeholder="Briefly describe what this partner offers..." />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL}><ImageIcon className="inline h-3 w-3 mr-1" />URL del logotipo</label>
              <input value={partner.logo} onChange={(e) => set('logo', e.target.value)} className={INPUT} placeholder="https://..." />
              {partner.logo && (
                <img src={partner.logo} alt="" className="mt-2 h-12 max-w-[6rem] rounded-lg object-contain bg-slate-50 p-1 ring-1 ring-slate-200" onError={(e) => (e.currentTarget.style.display = 'none')} />
              )}
            </div>
            <div>
              <label className={LABEL}><Globe className="inline h-3 w-3 mr-1" />URL del sitio web</label>
              <input type="url" value={partner.website} onChange={(e) => set('website', e.target.value)} className={INPUT} placeholder="https://partner-website.com" />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={!!partner.featured} onChange={(e) => set('featured', e.target.checked)} className="accent-amber-600" />
            <span className="text-xs font-medium text-slate-700">Destacado (resaltado en la página de inicio)</span>
          </label>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Tab Component                                                 */
/* ------------------------------------------------------------------ */
export default function PartnershipsSettingsTab({ onNotification }) {
  const [activeSubTab, setActiveSubTab] = useState('partners');
  const [data, setData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublicSiteContent()
      .then((d) => setData(d.partnerships || DEFAULT_PARTNERSHIPS_CONTENT))
      .catch(() => setData(DEFAULT_PARTNERSHIPS_CONTENT))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = useCallback(async () => {
    if (!data) return;
    setSaving(true);
    try {
      await savePublicPageContent('partnerships', data);
      onNotification?.('¡Sección de asociaciones guardada correctamente!');
    } catch {
      onNotification?.('No se pudo guardar. Revise la consola para ver los detalles.');
    } finally {
      setSaving(false);
    }
  }, [data, onNotification]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
      </div>
    );
  }

  const partners = data?.partners || [];
  const setPartners = (p) => setData((d) => ({ ...d, partners: p }));
  const setSection = (key, val) => setData((d) => ({ ...d, [key]: val }));

  return (
    <div className="space-y-5">
      {/* Sub-tabs */}
      <div className="flex gap-2">
        {[
          { id: 'partners', label: 'Tarjetas de socios' },
          { id: 'section', label: 'Encabezado de sección' },
        ].map((st) => (
          <button
            key={st.id}
            type="button"
            onClick={() => setActiveSubTab(st.id)}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${activeSubTab === st.id ? 'bg-amber-600 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            {st.label}
          </button>
        ))}
      </div>

      {/* ---- PARTNER CARDS ---- */}
      {activeSubTab === 'partners' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Organizaciones asociadas</h3>
              <p className="text-xs text-slate-500 mt-0.5">{partners.length} socio(s) · aparecen en la sección de asociaciones de inicio</p>
            </div>
            <button
              type="button"
              onClick={() => setPartners([...partners, BLANK_PARTNER()])}
              className={BTN_PRIMARY}
            >
              <Plus className="h-4 w-4" /> Añadir socio
            </button>
          </div>

          {partners.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-slate-200 p-10 text-center">
              <Building2 className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm text-slate-500">Todavía no hay socios. Añada el primero.</p>
            </div>
          )}

          <div className="space-y-3">
            {partners.map((partner, idx) => (
              <PartnerEditor
                key={partner.id}
                partner={partner}
                defaultOpen={idx === 0 && partners.length === 1}
                onChange={(updated) => setPartners(partners.map((p) => (p.id === updated.id ? updated : p)))}
                onDelete={() => {
                  if (window.confirm(`¿Eliminar "${partner.name || 'este socio'}"?`)) {
                    setPartners(partners.filter((p) => p.id !== partner.id));
                  }
                }}
              />
            ))}
          </div>

          <div className="sticky bottom-0 flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-md">
            <button type="button" onClick={handleSave} disabled={saving} className={BTN_PRIMARY}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Guardando...' : 'Guardar socios'}
            </button>
            <span className="text-xs text-slate-400">Los socios aparecerán en la sección de asociaciones de la página de inicio.</span>
          </div>
        </div>
      )}

      {/* ---- SECTION HEADER ---- */}
      {activeSubTab === 'section' && (
        <div className={SECTION}>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Section Header</h3>
            <p className="text-xs text-slate-500 mt-0.5">The heading and introduction shown above the partner grid on the homepage.</p>
          </div>

          <div>
            <label className={LABEL}>Badge Text</label>
            <input value={data?.badge || ''} onChange={(e) => setSection('badge', e.target.value)} className={INPUT} placeholder="e.g. Trusted Partners" />
          </div>
          <div>
            <label className={LABEL}>Section Heading</label>
            <input value={data?.heading || ''} onChange={(e) => setSection('heading', e.target.value)} className={INPUT} placeholder="e.g. The Local Experts Behind Your Journey" />
          </div>
          <div>
            <label className={LABEL}>Description</label>
            <textarea value={data?.description || ''} onChange={(e) => setSection('description', e.target.value)} rows={3} className={INPUT} />
          </div>

          {/* Live Preview */}
          <div className="rounded-xl bg-[#f3f6f1] p-5 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#9c7a2b]">{data?.badge || 'Badge'}</p>
            <p className="text-xl font-bold text-[#0a2a20]" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>{data?.heading || 'Section Heading'}</p>
            <p className="text-xs text-slate-500 leading-relaxed">{data?.description || 'Description...'}</p>
          </div>

          <button type="button" onClick={handleSave} disabled={saving} className={BTN_PRIMARY}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving...' : 'Save Section Header'}
          </button>
        </div>
      )}
    </div>
  );
}
