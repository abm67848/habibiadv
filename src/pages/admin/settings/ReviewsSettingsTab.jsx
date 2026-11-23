import React, { useEffect, useState } from 'react';
import {
  Plus, RefreshCw, Save, Trash2, AlertTriangle, CheckCircle2, Eye, Star,
  MessageSquare, Quote, MoveUp, MoveDown, Undo2, UserCheck, Sparkles,
} from 'lucide-react';
import {
  DEFAULT_REVIEWS_CONTENT,
  fetchPublicSiteContent,
  savePublicPageContent,
} from '@/services/publicSiteContent.js';

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm transition placeholder:text-slate-400 hover:border-slate-300 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20';
const labelClass = 'block text-xs font-semibold text-slate-600 mb-1';
const btnPrimary =
  'inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-500 disabled:opacity-50';
const btnGhost =
  'inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50';

export default function ReviewsSettingsTab({ onNotification }) {
  const [content, setContent] = useState(DEFAULT_REVIEWS_CONTENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    let active = true;
    fetchPublicSiteContent()
      .then((data) => {
        if (active && data.homeReviews) {
          setContent(data.homeReviews);
        }
      })
      .catch((err) => {
        console.error('Failed to load reviews settings:', err);
        if (active) setError('Could not load reviews: ' + err.message);
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
      await savePublicPageContent('homeReviews', content);
      const msg = 'Homepage customer reviews saved successfully!';
      setNotice(msg);
      onNotification?.(msg);
      setTimeout(() => setNotice(''), 4000);
    } catch (err) {
      console.error('Error saving reviews:', err);
      setError('Failed to save reviews: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset homepage reviews to default sample testimonials?')) {
      setContent(DEFAULT_REVIEWS_CONTENT);
      setNotice('Restored default testimonials. Click Save to publish.');
    }
  };

  const handleAddReview = () => {
    const newId = 'rev-' + Date.now();
    const newReview = {
      id: newId,
      name: 'Traveler Name',
      from: 'City, Country',
      rating: 5,
      trip: 'Custom Morocco Journey',
      avatar: '',
      text: 'Share their feedback about the guides, stays, itinerary planning, and memorable moments.',
    };
    setContent((prev) => ({
      ...prev,
      items: [newReview, ...(prev.items || [])],
    }));
    setEditingId(newId);
  };

  const handleUpdateReview = (id, field, value) => {
    setContent((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    }));
  };

  const handleDeleteReview = (id) => {
    if (window.confirm('Remove this review from the homepage?')) {
      setContent((prev) => ({
        ...prev,
        items: prev.items.filter((item) => item.id !== id),
      }));
      if (editingId === id) setEditingId(null);
    }
  };

  const handleMoveReview = (index, direction) => {
    const items = [...(content.items || [])];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    const temp = items[index];
    items[index] = items[targetIndex];
    items[targetIndex] = temp;
    setContent((prev) => ({ ...prev, items }));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500">
        <RefreshCw className="h-6 w-6 animate-spin text-amber-600 mb-2" />
        <p className="text-sm">Cargando la configuración de reseñas…</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-200">
            <Quote className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Reseñas y testimonios de inicio</h2>
            <p className="text-xs text-slate-500">
              Gestione las historias y citas de viajeros que aparecen en el carrusel de la página de inicio.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={handleReset} disabled={saving} className={btnGhost}>
            <Undo2 className="h-4 w-4" /> Restablecer
          </button>
          <a
            href="/#reviews"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            <Eye className="h-4 w-4 text-slate-500" /> Ver en inicio
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

      {/* Section Headings */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
        <h3 className="text-sm font-bold text-slate-800">Encabezados de la sección de inicio</h3>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className={labelClass}>Etiqueta de sección</label>
            <input
              type="text"
              value={content.badge || ''}
              onChange={(e) => setContent((p) => ({ ...p, badge: e.target.value }))}
              className={inputClass}
              placeholder="e.g. Guest Stories"
            />
          </div>

          <div className="sm:col-span-2">
            <label className={labelClass}>Título principal</label>
            <input
              type="text"
              value={content.heading || ''}
              onChange={(e) => setContent((p) => ({ ...p, heading: e.target.value }))}
              className={inputClass}
              placeholder="e.g. Memorable Journeys. Meaningful Experiences."
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Descripción secundaria</label>
          <textarea
            rows={2}
            value={content.subheading || ''}
            onChange={(e) => setContent((p) => ({ ...p, subheading: e.target.value }))}
            className={inputClass}
          />
        </div>
      </div>

      {/* Reviews list */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Tarjetas de reseñas ({content.items?.length || 0})</h3>
            <p className="text-xs text-slate-500">
              Solo se deben mostrar historias auténticas y aprobadas de viajeros.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddReview}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-500 shadow-xs transition"
          >
            <Plus className="h-3.5 w-3.5" /> Add New Review
          </button>
        </div>

        <div className="grid gap-4">
          {content.items?.map((item, index) => {
            const isEditing = editingId === item.id;
            return (
              <div
                key={item.id || index}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-slate-300"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-amber-100 text-amber-800 font-bold text-xs ring-1 ring-amber-300">
                      {item.name ? item.name.charAt(0) : 'T'}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">{item.name || 'Anonymous Traveler'}</h4>
                        <span className="text-xs text-slate-500">• {item.from || 'Morocco'}</span>
                        <div className="flex text-amber-500">
                          {Array.from({ length: item.rating || 5 }).map((_, i) => (
                            <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs italic text-slate-600">
                        "{item.text}"
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleMoveReview(index, -1)}
                      disabled={index === 0}
                      className="rounded p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                      title="Move up"
                    >
                      <MoveUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveReview(index, 1)}
                      disabled={index === (content.items?.length || 0) - 1}
                      className="rounded p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                      title="Move down"
                    >
                      <MoveDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(isEditing ? null : item.id)}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 ml-1"
                    >
                      {isEditing ? 'Close' : 'Edit'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteReview(item.id)}
                      className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"
                      title="Delete review"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Edit Form */}
                {isEditing && (
                  <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 text-xs animate-in fade-in">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <label className={labelClass}>Traveler Full Name</label>
                        <input
                          type="text"
                          value={item.name || ''}
                          onChange={(e) => handleUpdateReview(item.id, 'name', e.target.value)}
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label className={labelClass}>Location / Country</label>
                        <input
                          type="text"
                          value={item.from || ''}
                          onChange={(e) => handleUpdateReview(item.id, 'from', e.target.value)}
                          className={inputClass}
                          placeholder="e.g. London, UK"
                        />
                      </div>

                      <div>
                        <label className={labelClass}>Rating (Stars)</label>
                        <select
                          value={item.rating || 5}
                          onChange={(e) => handleUpdateReview(item.id, 'rating', Number(e.target.value))}
                          className={inputClass}
                        >
                          <option value={5}>5 Stars ★★★★★</option>
                          <option value={4}>4 Stars ★★★★☆</option>
                          <option value={3}>3 Stars ★★★☆☆</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className={labelClass}>Trip Name (Optional)</label>
                        <input
                          type="text"
                          value={item.trip || ''}
                          onChange={(e) => handleUpdateReview(item.id, 'trip', e.target.value)}
                          className={inputClass}
                          placeholder="e.g. Imperial Cities & Sahara Tour"
                        />
                      </div>

                      <div>
                        <label className={labelClass}>Avatar Image URL (Optional)</label>
                        <input
                          type="text"
                          value={item.avatar || ''}
                          onChange={(e) => handleUpdateReview(item.id, 'avatar', e.target.value)}
                          className={inputClass}
                          placeholder="https://... photo URL"
                        />
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>Review Quote Text</label>
                      <textarea
                        rows={3}
                        value={item.text || ''}
                        onChange={(e) => handleUpdateReview(item.id, 'text', e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Sticky Save Bar */}
      <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-md backdrop-blur">
        <span className="text-xs text-slate-500">
          Save your review edits to update the carousel displayed on the homepage.
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
