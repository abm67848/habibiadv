import React, { useEffect, useState } from 'react';
import {
  Save, RefreshCw, Undo2, Eye, Plus, Trash2, CheckCircle2, AlertTriangle,
  Globe, Sparkles, Compass, Heart, ShieldCheck, Leaf, Users, Calendar,
  Check, ArrowRight, Award, MessageCircle, Star, Layers, MapPin,
} from 'lucide-react';
import {
  DEFAULT_ABOUT_CONTENT,
  fetchPublicSiteContent,
  savePublicPageContent,
} from '@/services/publicSiteContent.js';

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 shadow-sm transition placeholder:text-slate-400 hover:border-slate-300 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20';
const labelClass = 'block text-[11px] font-semibold text-slate-600 mb-1';
const btnPrimary =
  'inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-amber-500 disabled:opacity-50';
const btnGhost =
  'inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:opacity-50';

const VALUE_ICONS = [
  { name: 'Compass', label: 'Compass (Local)' },
  { name: 'Heart', label: 'Heart (Personal)' },
  { name: 'ShieldCheck', label: 'Shield (Honest/Safety)' },
  { name: 'Leaf', label: 'Leaf (Eco/Sustainability)' },
  { name: 'Users', label: 'Users (Community)' },
  { name: 'Star', label: 'Star (Excellence)' },
];

export default function AboutSettingsTab({ onNotification }) {
  const [content, setContent] = useState(DEFAULT_ABOUT_CONTENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [activeSubTab, setActiveSubTab] = useState('hero'); // 'hero', 'stats', 'story', 'values', 'timeline', 'process', 'team', 'cta'

  useEffect(() => {
    let active = true;
    fetchPublicSiteContent()
      .then((pages) => {
        if (active && pages.about) {
          setContent(pages.about);
        }
      })
      .catch((err) => {
        console.error('Could not load about content:', err);
        if (active) setError('Could not load About page content: ' + err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await savePublicPageContent('about', content);
      const msg = 'About page content saved and published!';
      setNotice(msg);
      onNotification?.(msg);
      setTimeout(() => setNotice(''), 4000);
    } catch (err) {
      console.error('Failed to save about content:', err);
      setError('Could not save changes: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset the About page to default template? Unsaved changes will be lost.')) {
      setContent(DEFAULT_ABOUT_CONTENT);
      setNotice('Restored default About content. Click Save to publish.');
    }
  };

  // Team helper
  const handleAddTeamMember = () => {
    const newMember = {
      name: 'New Team Member',
      role: 'Travel Planner',
      img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    };
    setContent((p) => ({ ...p, team: [...(p.team || []), newMember] }));
  };

  const handleUpdateTeamMember = (index, field, value) => {
    const list = [...(content.team || [])];
    list[index] = { ...list[index], [field]: value };
    setContent((p) => ({ ...p, team: list }));
  };

  const handleDeleteTeamMember = (index) => {
    setContent((p) => ({ ...p, team: (p.team || []).filter((_, i) => i !== index) }));
  };

  // Milestones helper
  const handleAddMilestone = () => {
    const nextMilestone = {
      year: String(new Date().getFullYear()),
      title: 'New Milestone',
      text: 'Describe what your travel agency achieved this year.',
    };
    setContent((p) => ({ ...p, milestones: [...(p.milestones || []), nextMilestone] }));
  };

  const handleUpdateMilestone = (index, field, value) => {
    const list = [...(content.milestones || [])];
    list[index] = { ...list[index], [field]: value };
    setContent((p) => ({ ...p, milestones: list }));
  };

  const handleDeleteMilestone = (index) => {
    setContent((p) => ({ ...p, milestones: (p.milestones || []).filter((_, i) => i !== index) }));
  };

  // Values helper
  const handleUpdateValue = (index, field, value) => {
    const list = [...(content.values || [])];
    list[index] = { ...list[index], [field]: value };
    setContent((p) => ({ ...p, values: list }));
  };

  // Story paragraphs helper
  const handleAddParagraph = () => {
    setContent((p) => ({
      ...p,
      storyParagraphs: [...(p.storyParagraphs || []), 'New story paragraph detailing your agency heritage.'],
    }));
  };

  const handleUpdateParagraph = (index, val) => {
    const list = [...(content.storyParagraphs || [])];
    list[index] = val;
    setContent((p) => ({ ...p, storyParagraphs: list }));
  };

  const handleDeleteParagraph = (index) => {
    setContent((p) => ({
      ...p,
      storyParagraphs: (p.storyParagraphs || []).filter((_, i) => i !== index),
    }));
  };

  // Process steps helper
  const handleUpdateStep = (index, field, val) => {
    const list = [...(content.steps || [])];
    list[index] = { ...list[index], [field]: val };
    setContent((p) => ({ ...p, steps: list }));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500 bg-white rounded-2xl border border-slate-200">
        <RefreshCw className="h-6 w-6 animate-spin text-amber-600 mb-2" />
        <p className="text-sm">Cargando el contenido de Nosotros…</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-5">
      {/* Top Banner Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-200">
            <Globe className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Gestor visual de la página Nosotros</h2>
            <p className="text-xs text-slate-500">
              Personalice la historia, indicadores clave, valores, hitos y perfiles del equipo en <span className="font-mono text-amber-700">/about</span>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={handleReset} disabled={saving} className={btnGhost}>
            <Undo2 className="h-3.5 w-3.5" /> Restablecer
          </button>
          <a
            href="/about"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            <Eye className="h-3.5 w-3.5 text-slate-500" /> Ver página
          </a>
          <button type="button" onClick={handleSave} disabled={saving} className={btnPrimary}>
            {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      {notice && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800 ring-1 ring-rose-200">
          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Sub-tab pills */}
      <div className="flex flex-wrap gap-1.5 border-b border-slate-200/80 pb-2">
        {[
          { id: 'hero', label: 'Cabecera principal' },
          { id: 'stats', label: 'Indicadores clave (4)' },
          { id: 'story', label: 'Nuestra historia' },
          { id: 'values', label: 'Valores (4)' },
          { id: 'timeline', label: `Cronología (${content.milestones?.length || 0})` },
          { id: 'process', label: 'Proceso (4)' },
          { id: 'team', label: `Equipo (${content.team?.length || 0})` },
          { id: 'cta', label: 'Llamada a la acción' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSubTab(tab.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeSubTab === tab.id
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* SECTION 1: HERO */}
      {activeSubTab === 'hero' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900">Hero Intro Section</h3>

          <div>
            <label className={labelClass}>Location Badge</label>
            <input
              type="text"
              value={content.location || ''}
              onChange={(e) => setContent((p) => ({ ...p, location: e.target.value }))}
              className={inputClass}
              placeholder="e.g. Based in Tangier, Morocco"
            />
          </div>

          <div>
            <label className={labelClass}>Main Hero Title</label>
            <input
              type="text"
              value={content.heroTitle || ''}
              onChange={(e) => setContent((p) => ({ ...p, heroTitle: e.target.value }))}
              className={inputClass}
              placeholder="e.g. We’re the people behind your trip"
            />
          </div>

          <div>
            <label className={labelClass}>Hero Description</label>
            <textarea
              rows={3}
              value={content.heroDescription || ''}
              onChange={(e) => setContent((p) => ({ ...p, heroDescription: e.target.value }))}
              className={inputClass}
            />
          </div>
        </div>
      )}

      {/* SECTION 2: STATS */}
      {activeSubTab === 'stats' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Key Performance Indicators (Counters)</h3>
            <p className="text-xs text-slate-500">Displayed in the animated stats bar under the hero section.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {content.stats?.map((stat, idx) => (
              <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-2">
                <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                  Metric {idx + 1}
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelClass}>Value</label>
                    <input
                      type="number"
                      step="any"
                      value={stat.value}
                      onChange={(e) => {
                        const next = [...(content.stats || [])];
                        next[idx] = { ...next[idx], value: Number(e.target.value) };
                        setContent((p) => ({ ...p, stats: next }));
                      }}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Suffix</label>
                    <input
                      type="text"
                      value={stat.suffix || ''}
                      onChange={(e) => {
                        const next = [...(content.stats || [])];
                        next[idx] = { ...next[idx], suffix: e.target.value };
                        setContent((p) => ({ ...p, stats: next }));
                      }}
                      className={inputClass}
                      placeholder="+ or /5"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Label</label>
                  <input
                    type="text"
                    value={stat.label || ''}
                    onChange={(e) => {
                      const next = [...(content.stats || [])];
                      next[idx] = { ...next[idx], label: e.target.value };
                      setContent((p) => ({ ...p, stats: next }));
                    }}
                    className={inputClass}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 3: STORY */}
      {activeSubTab === 'story' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900">Agency Heritage Story</h3>

          <div>
            <label className={labelClass}>Story Section Headline</label>
            <input
              type="text"
              value={content.storyTitle || ''}
              onChange={(e) => setContent((p) => ({ ...p, storyTitle: e.target.value }))}
              className={inputClass}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelClass}>Story Paragraphs</label>
              <button
                type="button"
                onClick={handleAddParagraph}
                className="text-xs font-semibold text-amber-700 hover:underline"
              >
                + Add Paragraph
              </button>
            </div>

            <div className="space-y-3">
              {content.storyParagraphs?.map((paragraph, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-slate-100 text-slate-600 font-bold text-xs mt-1">
                    {idx + 1}
                  </span>
                  <textarea
                    rows={3}
                    value={paragraph}
                    onChange={(e) => handleUpdateParagraph(idx, e.target.value)}
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteParagraph(idx)}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded"
                    title="Delete paragraph"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-slate-100">
            <div>
              <label className={labelClass}>Review Score Badge</label>
              <input
                type="text"
                value={content.reviewScore || ''}
                onChange={(e) => setContent((p) => ({ ...p, reviewScore: e.target.value }))}
                className={inputClass}
                placeholder="4.9 out of 5"
              />
            </div>
            <div>
              <label className={labelClass}>Review Caption</label>
              <input
                type="text"
                value={content.reviewCaption || ''}
                onChange={(e) => setContent((p) => ({ ...p, reviewCaption: e.target.value }))}
                className={inputClass}
                placeholder="from guests"
              />
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: VALUES */}
      {activeSubTab === 'values' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
          <div>
            <label className={labelClass}>Values Section Headline</label>
            <input
              type="text"
              value={content.valuesTitle || ''}
              onChange={(e) => setContent((p) => ({ ...p, valuesTitle: e.target.value }))}
              className={inputClass}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {content.values?.map((val, idx) => (
              <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelClass}>Icon</label>
                    <select
                      value={val.icon || 'Compass'}
                      onChange={(e) => handleUpdateValue(idx, 'icon', e.target.value)}
                      className={inputClass}
                    >
                      {VALUE_ICONS.map((ic) => (
                        <option key={ic.name} value={ic.name}>
                          {ic.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Promise Title</label>
                    <input
                      type="text"
                      value={val.title || ''}
                      onChange={(e) => handleUpdateValue(idx, 'title', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Value Description</label>
                  <textarea
                    rows={2}
                    value={val.text || ''}
                    onChange={(e) => handleUpdateValue(idx, 'text', e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 5: TIMELINE */}
      {activeSubTab === 'timeline' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Timeline & Milestones</h3>
              <p className="text-xs text-slate-500">Chronological history of the agency.</p>
            </div>
            <button
              type="button"
              onClick={handleAddMilestone}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-500"
            >
              <Plus className="h-3.5 w-3.5" /> Add Milestone
            </button>
          </div>

          <div className="space-y-3">
            {content.milestones?.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/40 p-3">
                <div className="w-24 shrink-0">
                  <label className={labelClass}>Year</label>
                  <input
                    type="text"
                    value={item.year || ''}
                    onChange={(e) => handleUpdateMilestone(idx, 'year', e.target.value)}
                    className={inputClass}
                    placeholder="2026"
                  />
                </div>

                <div className="flex-1 space-y-2">
                  <div>
                    <label className={labelClass}>Milestone Title</label>
                    <input
                      type="text"
                      value={item.title || ''}
                      onChange={(e) => handleUpdateMilestone(idx, 'title', e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Summary Text</label>
                    <input
                      type="text"
                      value={item.text || ''}
                      onChange={(e) => handleUpdateMilestone(idx, 'text', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteMilestone(idx)}
                  className="mt-6 rounded p-1.5 text-rose-500 hover:bg-rose-50"
                  title="Remove milestone"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 6: PROCESS STEPS */}
      {activeSubTab === 'process' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
          <div>
            <label className={labelClass}>Process Section Headline</label>
            <input
              type="text"
              value={content.processTitle || ''}
              onChange={(e) => setContent((p) => ({ ...p, processTitle: e.target.value }))}
              className={inputClass}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {content.steps?.map((step, idx) => (
              <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
                <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                  Step {idx + 1}
                </span>

                <div>
                  <label className={labelClass}>Step Title</label>
                  <input
                    type="text"
                    value={step.title || ''}
                    onChange={(e) => handleUpdateStep(idx, 'title', e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Step Description</label>
                  <textarea
                    rows={2}
                    value={step.text || ''}
                    onChange={(e) => handleUpdateStep(idx, 'text', e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 7: TEAM */}
      {activeSubTab === 'team' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Team Profiles</h3>
              <p className="text-xs text-slate-500">Members shown in the "Meet the team" section.</p>
            </div>
            <button
              type="button"
              onClick={handleAddTeamMember}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-500"
            >
              <Plus className="h-3.5 w-3.5" /> Add Member
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {content.team?.map((member, idx) => (
              <div key={idx} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
                <img
                  src={member.img || '/images/team-1.jpg'}
                  alt=""
                  onError={(e) => (e.currentTarget.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80')}
                  className="h-16 w-16 rounded-xl object-cover bg-slate-200 shrink-0 border border-slate-200"
                />

                <div className="flex-1 space-y-2">
                  <div>
                    <label className={labelClass}>Full Name</label>
                    <input
                      type="text"
                      value={member.name || ''}
                      onChange={(e) => handleUpdateTeamMember(idx, 'name', e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Job Title / Role</label>
                    <input
                      type="text"
                      value={member.role || ''}
                      onChange={(e) => handleUpdateTeamMember(idx, 'role', e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Photo URL</label>
                    <input
                      type="text"
                      value={member.img || ''}
                      onChange={(e) => handleUpdateTeamMember(idx, 'img', e.target.value)}
                      className={inputClass}
                      placeholder="/images/team-1.jpg or https://"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteTeamMember(idx)}
                  className="rounded p-1 text-rose-500 hover:bg-rose-50"
                  title="Remove member"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 8: BOTTOM CTA */}
      {activeSubTab === 'cta' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900">Bottom Call-to-Action</h3>

          <div>
            <label className={labelClass}>Kicker Tagline</label>
            <input
              type="text"
              value={content.ctaKicker || ''}
              onChange={(e) => setContent((p) => ({ ...p, ctaKicker: e.target.value }))}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Main CTA Title</label>
            <input
              type="text"
              value={content.ctaTitle || ''}
              onChange={(e) => setContent((p) => ({ ...p, ctaTitle: e.target.value }))}
              className={inputClass}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Primary Button Text</label>
              <input
                type="text"
                value={content.ctaPrimary || ''}
                onChange={(e) => setContent((p) => ({ ...p, ctaPrimary: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Secondary Button Text</label>
              <input
                type="text"
                value={content.ctaSecondary || ''}
                onChange={(e) => setContent((p) => ({ ...p, ctaSecondary: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>
        </div>
      )}

      {/* Sticky Bottom Save Bar */}
      <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-md backdrop-blur">
        <span className="text-xs text-slate-500">
          Save your changes to publish the updated story, team, and metrics to <span className="font-mono text-amber-700">/about</span>.
        </span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={handleReset} disabled={saving} className={btnGhost}>
            <Undo2 className="h-3.5 w-3.5" /> Reset
          </button>
          <button type="button" onClick={handleSave} disabled={saving} className={btnPrimary}>
            {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
