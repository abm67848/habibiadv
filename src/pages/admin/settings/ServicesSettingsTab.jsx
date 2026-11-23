import React, { useEffect, useState } from 'react';
import {
  Plus, RefreshCw, Save, Trash2, AlertTriangle, CheckCircle2, Eye, Wrench,
  Route, BedDouble, Car, Compass, Mountain, Users, Heart, FileCheck, Headphones,
  PackageOpen, Wand2, Sparkles, MapPin, Shield, Star, Undo2, ArrowRight,
  ChevronDown, ChevronUp, Layers, Check,
} from 'lucide-react';
import {
  DEFAULT_SERVICES_CONTENT,
  fetchPublicSiteContent,
  savePublicPageContent,
} from '@/services/publicSiteContent.js';

const AVAILABLE_ICONS = [
  { name: 'Route', label: 'Route / Itinerary' },
  { name: 'BedDouble', label: 'Hotel / Riad / Stays' },
  { name: 'Car', label: 'Car / Transfers' },
  { name: 'Compass', label: 'Compass / Guide' },
  { name: 'Mountain', label: 'Mountain / Trekking' },
  { name: 'Users', label: 'Group / Corporate' },
  { name: 'Heart', label: 'Honeymoon / Heart' },
  { name: 'FileCheck', label: 'Documents / Visa' },
  { name: 'Headphones', label: 'Support / 24/7' },
  { name: 'PackageOpen', label: 'Package' },
  { name: 'Wrench', label: 'Custom / Wrench' },
  { name: 'Wand2', label: 'Magic / Tailor-made' },
  { name: 'Sparkles', label: 'Sparkles / Luxury' },
  { name: 'Star', label: 'Star / Featured' },
  { name: 'Shield', label: 'Shield / Insurance' },
];

export const ICON_MAP = {
  Route,
  BedDouble,
  Car,
  Compass,
  Mountain,
  Users,
  Heart,
  FileCheck,
  Headphones,
  PackageOpen,
  Wrench,
  Wand2,
  Sparkles,
  MapPin,
  Shield,
  Star,
};

export function RenderIcon({ name, className = 'h-5 w-5' }) {
  const Comp = ICON_MAP[name] || Compass;
  return <Comp className={className} />;
}

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm transition placeholder:text-slate-400 hover:border-slate-300 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20';
const labelClass = 'block text-xs font-semibold text-slate-600 mb-1';
const btnPrimary =
  'inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-500 disabled:opacity-50';
const btnGhost =
  'inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50';

export default function ServicesSettingsTab({ onNotification }) {
  const [content, setContent] = useState(DEFAULT_SERVICES_CONTENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [activeSubTab, setActiveSubTab] = useState('services'); // 'hero', 'services', 'categories', 'ways', 'cta'
  const [editingServiceId, setEditingServiceId] = useState(null);

  useEffect(() => {
    let active = true;
    fetchPublicSiteContent()
      .then((data) => {
        if (active && data.services) {
          setContent(data.services);
        }
      })
      .catch((err) => {
        console.error('Failed to load services content:', err);
        if (active) setError('Could not load services settings: ' + err.message);
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
      await savePublicPageContent('services', content);
      const msg = 'Public Services page configuration saved successfully!';
      setNotice(msg);
      onNotification?.(msg);
      setTimeout(() => setNotice(''), 4000);
    } catch (err) {
      console.error('Error saving services content:', err);
      setError('Failed to save services settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset all Services page settings to system defaults? Unsaved edits will be lost.')) {
      setContent(DEFAULT_SERVICES_CONTENT);
      setNotice('Restored default Services configuration. Click Save to publish.');
    }
  };

  // Service helpers
  const handleAddService = () => {
    const newId = 'service-' + Date.now();
    const newService = {
      id: newId,
      category: content.categories?.[0]?.id || 'plan',
      icon: 'Compass',
      title: 'New Travel Service',
      text: 'Describe what this service includes and how travelers benefit from booking it with your agency.',
      includes: ['Dedicated local coordinator', 'Transparent pricing', 'Flexible adjustments'],
      goodFor: 'Families, couples, and independent travelers',
    };
    setContent((prev) => ({
      ...prev,
      services: [newService, ...(prev.services || [])],
    }));
    setEditingServiceId(newId);
  };

  const handleUpdateService = (id, field, value) => {
    setContent((prev) => ({
      ...prev,
      services: prev.services.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    }));
  };

  const handleDeleteService = (id) => {
    if (window.confirm('Are you sure you want to delete this service?')) {
      setContent((prev) => ({
        ...prev,
        services: prev.services.filter((item) => item.id !== id),
      }));
      if (editingServiceId === id) setEditingServiceId(null);
    }
  };

  const handleAddInclude = (serviceId) => {
    const service = content.services.find((s) => s.id === serviceId);
    if (!service) return;
    const nextIncludes = [...(service.includes || []), 'New inclusion feature'];
    handleUpdateService(serviceId, 'includes', nextIncludes);
  };

  const handleUpdateInclude = (serviceId, index, text) => {
    const service = content.services.find((s) => s.id === serviceId);
    if (!service) return;
    const nextIncludes = [...(service.includes || [])];
    nextIncludes[index] = text;
    handleUpdateService(serviceId, 'includes', nextIncludes);
  };

  const handleDeleteInclude = (serviceId, index) => {
    const service = content.services.find((s) => s.id === serviceId);
    if (!service) return;
    const nextIncludes = (service.includes || []).filter((_, i) => i !== index);
    handleUpdateService(serviceId, 'includes', nextIncludes);
  };

  // Category helpers
  const handleAddCategory = () => {
    const id = 'cat-' + Date.now();
    setContent((prev) => ({
      ...prev,
      categories: [...(prev.categories || []), { id, label: 'New Category' }],
    }));
  };

  const handleUpdateCategory = (index, field, value) => {
    setContent((prev) => {
      const nextCats = [...(prev.categories || [])];
      nextCats[index] = { ...nextCats[index], [field]: value };
      return { ...prev, categories: nextCats };
    });
  };

  const handleDeleteCategory = (index) => {
    setContent((prev) => ({
      ...prev,
      categories: prev.categories.filter((_, i) => i !== index),
    }));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500">
        <RefreshCw className="h-6 w-6 animate-spin text-amber-600 mb-2" />
        <p className="text-sm">Cargando la configuración de servicios…</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-200">
            <Wrench className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Configuración de la página pública de servicios</h2>
            <p className="text-xs text-slate-500">
              Personalice el catálogo de servicios turísticos, categorías, formas de reserva y llamada a la acción que se muestran en <span className="font-mono text-amber-700">/services</span>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={handleReset} disabled={saving} className={btnGhost}>
            <Undo2 className="h-4 w-4" /> Restablecer
          </button>
          <a
            href="/services"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            <Eye className="h-4 w-4 text-slate-500" /> Ver página
          </a>
          <button type="button" onClick={handleSave} disabled={saving} className={btnPrimary}>
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      {notice && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800 ring-1 ring-rose-200">
          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Sub-tabs navigation */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {[
          { id: 'services', label: `Catálogo de servicios (${content.services?.length || 0})` },
          { id: 'categories', label: `Categorías (${content.categories?.length || 0})` },
          { id: 'hero', label: 'Cabecera principal' },
          { id: 'ways', label: 'Formas de reserva (3)' },
          { id: 'cta', label: 'Llamada a la acción' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSubTab(tab.id)}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              activeSubTab === tab.id
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* SUBTAB 1: Services catalog */}
      {activeSubTab === 'services' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Servicios turísticos ofrecidos</h3>
              <p className="text-xs text-slate-500">Cada servicio aparece como una tarjeta interactiva en el sitio público con sus inclusiones.</p>
            </div>
            <button
              type="button"
              onClick={handleAddService}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-500 shadow-xs transition"
            >
              <Plus className="h-3.5 w-3.5" /> Add New Service
            </button>
          </div>

          <div className="grid gap-4">
            {content.services?.map((service, index) => {
              const isExpanded = editingServiceId === service.id;
              return (
                <div
                  key={service.id || index}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-slate-300"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                        <RenderIcon name={service.icon} className="h-5 w-5" />
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">{service.title || 'Untitled Service'}</h4>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                            {content.categories?.find((c) => c.id === service.category)?.label || service.category}
                          </span>
                        </div>
                        <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{service.text}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditingServiceId(isExpanded ? null : service.id)}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        {isExpanded ? 'Collapse' : 'Edit Service'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteService(service.id)}
                        className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"
                        title="Delete service"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Edit Form */}
                  {isExpanded && (
                    <div className="mt-4 space-y-4 border-t border-slate-100 pt-4 text-xs animate-in fade-in">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="sm:col-span-2">
                          <label className={labelClass}>Service Title</label>
                          <input
                            type="text"
                            value={service.title || ''}
                            onChange={(e) => handleUpdateService(service.id, 'title', e.target.value)}
                            className={inputClass}
                            placeholder="e.g. Desert & Mountain Treks"
                          />
                        </div>

                        <div>
                          <label className={labelClass}>Category</label>
                          <select
                            value={service.category || ''}
                            onChange={(e) => handleUpdateService(service.id, 'category', e.target.value)}
                            className={inputClass}
                          >
                            {content.categories?.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div>
                          <label className={labelClass}>Card Icon</label>
                          <select
                            value={service.icon || 'Compass'}
                            onChange={(e) => handleUpdateService(service.id, 'icon', e.target.value)}
                            className={inputClass}
                          >
                            {AVAILABLE_ICONS.map((ic) => (
                              <option key={ic.name} value={ic.name}>
                                {ic.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <label className={labelClass}>Recommended For ("Good for")</label>
                          <input
                            type="text"
                            value={service.goodFor || ''}
                            onChange={(e) => handleUpdateService(service.id, 'goodFor', e.target.value)}
                            className={inputClass}
                            placeholder="e.g. Families, photographers, first-timers"
                          />
                        </div>
                      </div>

                      <div>
                        <label className={labelClass}>Description Text</label>
                        <textarea
                          rows={2}
                          value={service.text || ''}
                          onChange={(e) => handleUpdateService(service.id, 'text', e.target.value)}
                          className={inputClass}
                          placeholder="Short summary of what the agency provides..."
                        />
                      </div>

                      {/* Inclusions list */}
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <label className={labelClass}>Bullet Inclusions / Features</label>
                          <button
                            type="button"
                            onClick={() => handleAddInclude(service.id)}
                            className="text-[11px] font-semibold text-amber-700 hover:underline"
                          >
                            + Add Feature
                          </button>
                        </div>

                        <div className="space-y-1.5">
                          {service.includes?.map((inc, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="grid h-5 w-5 place-items-center rounded bg-amber-100 text-[10px] font-bold text-amber-800">
                                {i + 1}
                              </span>
                              <input
                                type="text"
                                value={inc}
                                onChange={(e) => handleUpdateInclude(service.id, i, e.target.value)}
                                className={inputClass}
                              />
                              <button
                                type="button"
                                onClick={() => handleDeleteInclude(service.id, i)}
                                className="text-rose-500 hover:text-rose-700"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUBTAB 2: Categories */}
      {activeSubTab === 'categories' && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Filter Categories</h3>
              <p className="text-xs text-slate-500">Categories organize services into pills on the top of the services catalog.</p>
            </div>
            <button
              type="button"
              onClick={handleAddCategory}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-500 shadow-xs transition"
            >
              <Plus className="h-3.5 w-3.5" /> Add Category
            </button>
          </div>

          <div className="space-y-2">
            {content.categories?.map((cat, idx) => (
              <div key={idx} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-2.5">
                <div className="w-1/3">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Slug / ID</label>
                  <input
                    type="text"
                    value={cat.id}
                    onChange={(e) => handleUpdateCategory(idx, 'id', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Visible Label</label>
                  <input
                    type="text"
                    value={cat.label}
                    onChange={(e) => handleUpdateCategory(idx, 'label', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteCategory(idx)}
                  className="mt-4 rounded-md p-2 text-rose-500 hover:bg-rose-50"
                  title="Remove category"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 3: Hero */}
      {activeSubTab === 'hero' && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-800">Hero Section Details</h3>

          <div>
            <label className={labelClass}>Hero Badge Text</label>
            <input
              type="text"
              value={content.hero?.badge || ''}
              onChange={(e) =>
                setContent((prev) => ({ ...prev, hero: { ...prev.hero, badge: e.target.value } }))
              }
              className={inputClass}
              placeholder="e.g. Our services"
            />
          </div>

          <div>
            <label className={labelClass}>Main Hero Title</label>
            <input
              type="text"
              value={content.hero?.title || ''}
              onChange={(e) =>
                setContent((prev) => ({ ...prev, hero: { ...prev.hero, title: e.target.value } }))
              }
              className={inputClass}
              placeholder="e.g. Everything a trip needs, handled"
            />
          </div>

          <div>
            <label className={labelClass}>Hero Description</label>
            <textarea
              rows={3}
              value={content.hero?.description || ''}
              onChange={(e) =>
                setContent((prev) => ({ ...prev, hero: { ...prev.hero, description: e.target.value } }))
              }
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Hero Background Image URL</label>
            <input
              type="text"
              value={content.hero?.image || ''}
              onChange={(e) =>
                setContent((prev) => ({ ...prev, hero: { ...prev.hero, image: e.target.value } }))
              }
              className={inputClass}
              placeholder="/images/services-hero.jpg or HTTPS URL"
            />
          </div>
        </div>
      )}

      {/* SUBTAB 4: Ways to book */}
      {activeSubTab === 'ways' && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-800">"Three Ways to Book" Cards</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            {content.ways?.map((way, idx) => (
              <div key={idx} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                  Option {idx + 1}
                </span>

                <div>
                  <label className={labelClass}>Card Title</label>
                  <input
                    type="text"
                    value={way.title || ''}
                    onChange={(e) => {
                      const next = [...content.ways];
                      next[idx] = { ...next[idx], title: e.target.value };
                      setContent((p) => ({ ...p, ways: next }));
                    }}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Description Text</label>
                  <textarea
                    rows={3}
                    value={way.text || ''}
                    onChange={(e) => {
                      const next = [...content.ways];
                      next[idx] = { ...next[idx], text: e.target.value };
                      setContent((p) => ({ ...p, ways: next }));
                    }}
                    className={inputClass}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelClass}>Button Text</label>
                    <input
                      type="text"
                      value={way.cta || ''}
                      onChange={(e) => {
                        const next = [...content.ways];
                        next[idx] = { ...next[idx], cta: e.target.value };
                        setContent((p) => ({ ...p, ways: next }));
                      }}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Target Link</label>
                    <input
                      type="text"
                      value={way.to || ''}
                      onChange={(e) => {
                        const next = [...content.ways];
                        next[idx] = { ...next[idx], to: e.target.value };
                        setContent((p) => ({ ...p, ways: next }));
                      }}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 5: Bottom CTA */}
      {activeSubTab === 'cta' && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-800">Bottom Call-to-Action Banner</h3>

          <div>
            <label className={labelClass}>Kicker Tagline</label>
            <input
              type="text"
              value={content.cta?.kicker || ''}
              onChange={(e) =>
                setContent((prev) => ({ ...prev, cta: { ...prev.cta, kicker: e.target.value } }))
              }
              className={inputClass}
              placeholder="e.g. Not sure what you need?"
            />
          </div>

          <div>
            <label className={labelClass}>Main Heading</label>
            <input
              type="text"
              value={content.cta?.title || ''}
              onChange={(e) =>
                setContent((prev) => ({ ...prev, cta: { ...prev.cta, title: e.target.value } }))
              }
              className={inputClass}
              placeholder="e.g. Describe the trip and we’ll suggest the rest"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Button Text</label>
              <input
                type="text"
                value={content.cta?.buttonText || ''}
                onChange={(e) =>
                  setContent((prev) => ({ ...prev, cta: { ...prev.cta, buttonText: e.target.value } }))
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Button Link</label>
              <input
                type="text"
                value={content.cta?.buttonLink || ''}
                onChange={(e) =>
                  setContent((prev) => ({ ...prev, cta: { ...prev.cta, buttonLink: e.target.value } }))
                }
                className={inputClass}
              />
            </div>
          </div>
        </div>
      )}

      {/* Sticky Save Bar */}
      <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-md backdrop-blur">
        <span className="text-xs text-slate-500">
          Click <strong>Save Changes</strong> to publish your updates to the live public services page.
        </span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={handleReset} disabled={saving} className={btnGhost}>
            <Undo2 className="h-4 w-4" /> Reset
          </button>
          <button type="button" onClick={handleSave} disabled={saving} className={btnPrimary}>
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
