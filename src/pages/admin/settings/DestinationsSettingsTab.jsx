import { useEffect, useState, useCallback } from 'react';
import {
  Plus, Trash2, ChevronDown, ChevronUp, Save, Eye, EyeOff,
  Star, MapPin, Clock, Loader2, Image as ImageIcon, Globe, Tag,
} from 'lucide-react';
import {
  DEFAULT_DESTINATIONS_CONTENT,
  fetchPublicSiteContent,
  savePublicPageContent,
} from '@/services/publicSiteContent.js';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function uid() {
  return `dest-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
}

const INPUT = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20';
const LABEL = 'block text-xs font-semibold text-slate-700 mb-1';
const SECTION = 'rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5';
const BTN_PRIMARY = 'inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-amber-500 transition disabled:opacity-50';
const BTN_GHOST = 'inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition';

const BLANK_DEST = () => ({
  id: uid(),
  slug: '',
  name: '',
  tagline: '',
  country: 'Morocco',
  region: '',
  image: '',
  coverImage: '',
  description: '',
  highlights: [],
  duration: '',
  difficulty: 'Easy',
  bestSeason: '',
  featured: false,
  published: true,
  activities: [],
  includes: [],
  gallery: [],
});

/* ------------------------------------------------------------------ */
/*  Single Destination Editor (expandable row)                         */
/* ------------------------------------------------------------------ */
function DestEditor({ dest, onChange, onDelete, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const [newHighlight, setNewHighlight] = useState('');
  const [newActivity, setNewActivity] = useState('');
  const [newInclude, setNewInclude] = useState('');

  const set = (key, val) => onChange({ ...dest, [key]: val });

  const handleNameChange = (name) => {
    onChange({ ...dest, name, slug: slugify(name) });
  };

  const addItem = (key, val, setter) => {
    if (!val.trim()) return;
    set(key, [...(dest[key] || []), val.trim()]);
    setter('');
  };

  const removeItem = (key, idx) => set(key, (dest[key] || []).filter((_, i) => i !== idx));

  return (
    <div className={`rounded-xl border transition ${dest.published ? 'border-slate-200' : 'border-dashed border-slate-300 opacity-70'} bg-white`}>
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Badges */}
        <div className="flex flex-1 items-center gap-2 min-w-0">
          <span className={`shrink-0 h-2 w-2 rounded-full ${dest.published ? 'bg-emerald-500' : 'bg-slate-300'}`} />
          <span className="truncate text-sm font-semibold text-slate-800">{dest.name || 'Destino sin título'}</span>
          {dest.featured && (
            <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">Destacado</span>
          )}
          {dest.region && (
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">{dest.region}</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => set('published', !dest.published)}
            title={dest.published ? 'Ocultar destino' : 'Publicar destino'}
            className={`grid h-7 w-7 place-items-center rounded-lg transition ${dest.published ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
          >
            {dest.published ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => set('featured', !dest.featured)}
            title={dest.featured ? 'Quitar destacado' : 'Marcar como destacado'}
            className={`grid h-7 w-7 place-items-center rounded-lg transition ${dest.featured ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
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
            title="Eliminar destino"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded Form */}
      {open && (
        <div className="border-t border-slate-100 px-4 pb-5 pt-4 space-y-4">
          {/* Row 1: Name + Slug */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL}>Nombre del destino <span className="text-rose-500">*</span></label>
              <input value={dest.name} onChange={(e) => handleNameChange(e.target.value)} className={INPUT} placeholder="e.g. Marrakech" />
            </div>
            <div>
              <label className={LABEL}>Slug de URL (generado automáticamente)</label>
              <input value={dest.slug} onChange={(e) => set('slug', e.target.value)} className={`${INPUT} bg-slate-50 font-mono`} placeholder="e.g. marrakech" />
            </div>
          </div>

          {/* Row 2: Tagline + Country + Region */}
          <div>
            <label className={LABEL}>Eslogan</label>
            <input value={dest.tagline} onChange={(e) => set('tagline', e.target.value)} className={INPUT} placeholder="e.g. The Heart of Moroccan Culture" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL}><Globe className="inline h-3 w-3 mr-1" />País</label>
              <input value={dest.country} onChange={(e) => set('country', e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}><MapPin className="inline h-3 w-3 mr-1" />Región</label>
              <input value={dest.region} onChange={(e) => set('region', e.target.value)} className={INPUT} placeholder="e.g. Northern Morocco" />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={LABEL}>Description</label>
            <textarea value={dest.description} onChange={(e) => set('description', e.target.value)} rows={3} className={INPUT} placeholder="Describe this destination for travelers..." />
          </div>

          {/* Images */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL}><ImageIcon className="inline h-3 w-3 mr-1" />Card Image URL</label>
              <input value={dest.image} onChange={(e) => set('image', e.target.value)} className={INPUT} placeholder="https://..." />
              {dest.image && (
                <img src={dest.image} alt="" className="mt-2 h-20 w-full rounded-lg object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
              )}
            </div>
            <div>
              <label className={LABEL}><ImageIcon className="inline h-3 w-3 mr-1" />Cover Image URL</label>
              <input value={dest.coverImage} onChange={(e) => set('coverImage', e.target.value)} className={INPUT} placeholder="https://..." />
              {dest.coverImage && (
                <img src={dest.coverImage} alt="" className="mt-2 h-20 w-full rounded-lg object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
              )}
            </div>
          </div>

          {/* Trip Details */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className={LABEL}><Clock className="inline h-3 w-3 mr-1" />Duration</label>
              <input value={dest.duration} onChange={(e) => set('duration', e.target.value)} className={INPUT} placeholder="e.g. 2–3 days" />
            </div>
            <div>
              <label className={LABEL}>Difficulty Level</label>
              <select value={dest.difficulty} onChange={(e) => set('difficulty', e.target.value)} className={INPUT}>
                <option>Easy</option>
                <option>Moderate</option>
                <option>Challenging</option>
              </select>
            </div>
            <div>
              <label className={LABEL}><Star className="inline h-3 w-3 mr-1" />Best Season</label>
              <input value={dest.bestSeason} onChange={(e) => set('bestSeason', e.target.value)} className={INPUT} placeholder="e.g. April – October" />
            </div>
          </div>

          {/* Highlights, Activities, Includes */}
          {[
            { key: 'highlights', label: 'Highlights', placeholder: 'e.g. Jemaa el-Fna Square', val: newHighlight, setter: setNewHighlight },
            { key: 'activities', label: 'Activities', placeholder: 'e.g. City Tours', val: newActivity, setter: setNewActivity },
            { key: 'includes', label: 'What\'s Included', placeholder: 'e.g. Local guide', val: newInclude, setter: setNewInclude },
          ].map(({ key, label, placeholder, val, setter }) => (
            <div key={key}>
              <label className={LABEL}><Tag className="inline h-3 w-3 mr-1" />{label}</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {(dest[key] || []).map((item, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                    {item}
                    <button type="button" onClick={() => removeItem(key, idx)} className="ml-1 text-slate-400 hover:text-rose-500">×</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={val}
                  onChange={(e) => setter(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(key, val, setter); } }}
                  className={`${INPUT} flex-1`}
                  placeholder={placeholder}
                />
                <button type="button" onClick={() => addItem(key, val, setter)} className={BTN_GHOST}>
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              </div>
            </div>
          ))}

          {/* Toggles */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!dest.published} onChange={(e) => set('published', e.target.checked)} className="accent-amber-600" />
              <span className="text-xs font-medium text-slate-700">Published (visible to visitors)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!dest.featured} onChange={(e) => set('featured', e.target.checked)} className="accent-amber-600" />
              <span className="text-xs font-medium text-slate-700">Featured (highlighted on page)</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Tab Component                                                 */
/* ------------------------------------------------------------------ */
export default function DestinationsSettingsTab({ onNotification }) {
  const [activeSubTab, setActiveSubTab] = useState('destinations');
  const [data, setData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load from service
  useEffect(() => {
    fetchPublicSiteContent()
      .then((d) => setData(d.destinations || DEFAULT_DESTINATIONS_CONTENT))
      .catch(() => setData(DEFAULT_DESTINATIONS_CONTENT))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = useCallback(async () => {
    if (!data) return;
    setSaving(true);
    try {
      await savePublicPageContent('destinations', data);
      onNotification?.('¡Catálogo de destinos guardado correctamente!');
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

  const dests = data?.destinations || [];
  const setDests = (destinations) => setData((d) => ({ ...d, destinations }));
  const setHero = (hero) => setData((d) => ({ ...d, hero: { ...(d.hero || {}), ...hero } }));

  return (
    <div className="space-y-5">
      {/* Sub-tabs */}
      <div className="flex gap-2">
        {[
          { id: 'destinations', label: 'Tarjetas de destinos' },
          { id: 'hero', label: 'Cabecera principal' },
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

      {/* ---- DESTINATIONS TAB ---- */}
      {activeSubTab === 'destinations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Catálogo de destinos</h3>
              <p className="text-xs text-slate-500 mt-0.5">{dests.length} destino(s)</p>
            </div>
            <button
              type="button"
              onClick={() => setDests([...dests, BLANK_DEST()])}
              className={BTN_PRIMARY}
            >
              <Plus className="h-4 w-4" /> Añadir destino
            </button>
          </div>

          {dests.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-slate-200 p-10 text-center">
              <MapPin className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm text-slate-500">Todavía no hay destinos. Añada el primero.</p>
            </div>
          )}

          <div className="space-y-3">
            {dests.map((dest, idx) => (
              <DestEditor
                key={dest.id}
                dest={dest}
                defaultOpen={idx === 0 && dests.length === 1}
                onChange={(updated) => setDests(dests.map((d) => (d.id === updated.id ? updated : d)))}
                onDelete={() => {
                  if (window.confirm(`¿Eliminar "${dest.name || 'este destino'}"?`)) {
                    setDests(dests.filter((d) => d.id !== dest.id));
                  }
                }}
              />
            ))}
          </div>

          <div className="sticky bottom-0 flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-md">
            <button type="button" onClick={handleSave} disabled={saving} className={BTN_PRIMARY}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Guardando...' : 'Guardar destinos'}
            </button>
            <span className="text-xs text-slate-400">Changes are reflected immediately on the public /destinations page.</span>
          </div>
        </div>
      )}

      {/* ---- HERO TAB ---- */}
      {activeSubTab === 'hero' && (
        <div className={`${SECTION}`}>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Sección principal</h3>
            <p className="text-xs text-slate-500 mt-0.5">Cabecera superior de la página de destinos.</p>
          </div>

          <div>
            <label className={LABEL}>Badge Text</label>
            <input value={data?.hero?.badge || ''} onChange={(e) => setHero({ badge: e.target.value })} className={INPUT} placeholder="e.g. Explore Morocco" />
          </div>
          <div>
            <label className={LABEL}>Hero Title</label>
            <input value={data?.hero?.title || ''} onChange={(e) => setHero({ title: e.target.value })} className={INPUT} placeholder="e.g. Discover Incredible Destinations" />
          </div>
          <div>
            <label className={LABEL}>Hero Description</label>
            <textarea value={data?.hero?.description || ''} onChange={(e) => setHero({ description: e.target.value })} rows={3} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}><ImageIcon className="inline h-3 w-3 mr-1" />Background Image URL</label>
            <input value={data?.hero?.image || ''} onChange={(e) => setHero({ image: e.target.value })} className={INPUT} placeholder="https://..." />
            {data?.hero?.image && (
              <img src={data.hero.image} alt="" className="mt-2 h-28 w-full rounded-xl object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
            )}
          </div>

          <button type="button" onClick={handleSave} disabled={saving} className={BTN_PRIMARY}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Guardando...' : 'Guardar ajustes'}
          </button>
        </div>
      )}
    </div>
  );
}
