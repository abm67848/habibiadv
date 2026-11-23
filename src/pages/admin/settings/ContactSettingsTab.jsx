import React, { useEffect, useState } from 'react';
import {
  Save, RefreshCw, Undo2, Eye, Plus, Trash2, CheckCircle2, AlertTriangle,
  Phone, MessageCircle, Mail, MapPin, Clock, HelpCircle, Share2,
  Calendar, Check, ArrowRight, Sparkles, Building2,
} from 'lucide-react';
import {
  DEFAULT_CONTACT_CONTENT,
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

const DAYS_OF_WEEK = [
  { key: 'Mon', label: 'Monday' },
  { key: 'Tue', label: 'Tuesday' },
  { key: 'Wed', label: 'Wednesday' },
  { key: 'Thu', label: 'Thursday' },
  { key: 'Fri', label: 'Friday' },
  { key: 'Sat', label: 'Saturday' },
  { key: 'Sun', label: 'Sunday' },
];

export default function ContactSettingsTab({ onNotification }) {
  const [content, setContent] = useState(DEFAULT_CONTACT_CONTENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [activeSubTab, setActiveSubTab] = useState('channels'); // 'channels', 'hours', 'hero', 'topics', 'faqs', 'address', 'socials'

  useEffect(() => {
    let active = true;
    fetchPublicSiteContent()
      .then((pages) => {
        if (active && pages.contact) {
          setContent(pages.contact);
        }
      })
      .catch((err) => {
        console.error('Could not load contact content:', err);
        if (active) setError('Could not load Contact page content: ' + err.message);
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
      await savePublicPageContent('contact', content);
      const msg = 'Contact page details and office hours saved successfully!';
      setNotice(msg);
      onNotification?.(msg);
      setTimeout(() => setNotice(''), 4000);
    } catch (err) {
      console.error('Failed to save contact content:', err);
      setError('Could not save contact settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset Contact page details to default template? Unsaved changes will be lost.')) {
      setContent(DEFAULT_CONTACT_CONTENT);
      setNotice('Restored default Contact details. Click Save to publish.');
    }
  };

  // Channels helper
  const handleUpdateChannel = (index, field, value) => {
    const list = [...(content.channels || [])];
    list[index] = { ...list[index], [field]: value };
    setContent((p) => ({ ...p, channels: list }));
  };

  // Hours helper
  const handleUpdateHour = (dayKey, field, value) => {
    const hours = { ...(content.hours || {}) };
    hours[dayKey] = {
      ...(hours[dayKey] || { open: '09:00', close: '18:00', closed: false }),
      [field]: value,
    };
    setContent((p) => ({ ...p, hours }));
  };

  // FAQs helper
  const handleAddFaq = () => {
    const nextFaqs = [
      ...(content.faqs || []),
      { q: 'New Frequently Asked Question?', a: 'Provide a clear, reassuring answer for travelers.' },
    ];
    setContent((p) => ({ ...p, faqs: nextFaqs }));
  };

  const handleUpdateFaq = (index, field, value) => {
    const list = [...(content.faqs || [])];
    list[index] = { ...list[index], [field]: value };
    setContent((p) => ({ ...p, faqs: list }));
  };

  const handleDeleteFaq = (index) => {
    setContent((p) => ({ ...p, faqs: (p.faqs || []).filter((_, i) => i !== index) }));
  };

  // Topics helper
  const handleAddTopic = () => {
    setContent((p) => ({ ...p, topics: [...(p.topics || []), 'New Inquiry Topic'] }));
  };

  const handleUpdateTopic = (index, val) => {
    const list = [...(content.topics || [])];
    list[index] = val;
    setContent((p) => ({ ...p, topics: list }));
  };

  const handleDeleteTopic = (index) => {
    setContent((p) => ({ ...p, topics: (p.topics || []).filter((_, i) => i !== index) }));
  };

  // Socials helper
  const handleUpdateSocial = (index, href) => {
    const list = [...(content.socials || [])];
    list[index] = { ...list[index], href };
    setContent((p) => ({ ...p, socials: list }));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500 bg-white rounded-2xl border border-slate-200">
        <RefreshCw className="h-6 w-6 animate-spin text-amber-600 mb-2" />
        <p className="text-sm">Cargando la configuración de contacto…</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-5">
      {/* Top Banner Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-200">
            <Phone className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Configuración y horarios de la página de contacto</h2>
            <p className="text-xs text-slate-500">
              Controle los canales de contacto, horarios, temas de consulta, dirección y preguntas frecuentes de <span className="font-mono text-amber-700">/contact</span>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={handleReset} disabled={saving} className={btnGhost}>
            <Undo2 className="h-3.5 w-3.5" /> Restablecer
          </button>
          <a
            href="/contact"
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
          { id: 'channels', label: 'Canales de contacto (4)' },
          { id: 'hours', label: 'Horario y zona horaria' },
          { id: 'hero', label: 'Cabecera e indicador en línea' },
          { id: 'address', label: 'Dirección y mapa' },
          { id: 'topics', label: `Temas de consulta (${content.topics?.length || 0})` },
          { id: 'faqs', label: `Preguntas frecuentes (${content.faqs?.length || 0})` },
          { id: 'socials', label: 'Redes sociales' },
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

      {/* SUBTAB 1: CHANNELS */}
      {activeSubTab === 'channels' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900">Reach Channels (Phone, WhatsApp, Email, Visit)</h3>
            <p className="text-xs text-slate-500">Each channel renders as a quick-access card on the public contact page.</p>

            <div className="grid gap-4 sm:grid-cols-2">
              {content.channels?.map((ch, idx) => (
                <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 uppercase">
                      Channel {idx + 1}: {ch.type || 'Direct'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelClass}>Card Title</label>
                      <input
                        type="text"
                        value={ch.title || ''}
                        onChange={(e) => handleUpdateChannel(idx, 'title', e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Visible Text / Number</label>
                      <input
                        type="text"
                        value={ch.text || ''}
                        onChange={(e) => handleUpdateChannel(idx, 'text', e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelClass}>Link (tel:, mailto:, wa.me)</label>
                      <input
                        type="text"
                        value={ch.href || ''}
                        onChange={(e) => handleUpdateChannel(idx, 'href', e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Helper Note</label>
                      <input
                        type="text"
                        value={ch.note || ''}
                        onChange={(e) => handleUpdateChannel(idx, 'note', e.target.value)}
                        className={inputClass}
                        placeholder="e.g. Fastest for urgent trips"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: OFFICE HOURS */}
      {activeSubTab === 'hours' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Weekly Office Operating Schedule</h3>
              <p className="text-xs text-slate-500">The website automatically calculates whether the agency is currently Online or Offline.</p>
            </div>

            <div className="w-64">
              <label className={labelClass}>Agency Timezone</label>
              <input
                type="text"
                value={content.timeZone || 'Africa/Casablanca'}
                onChange={(e) => setContent((p) => ({ ...p, timeZone: e.target.value }))}
                className={inputClass}
                placeholder="Africa/Casablanca"
              />
            </div>
          </div>

          {/* Schedule Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Day</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Opening Time</th>
                  <th className="py-2.5 px-4">Closing Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {DAYS_OF_WEEK.map(({ key, label }) => {
                  const dayData = content.hours?.[key] || { open: '09:00', close: '18:00', closed: false };
                  const isClosed = Boolean(dayData.closed);
                  return (
                    <tr key={key} className={isClosed ? 'bg-slate-50/50' : 'bg-white'}>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {label}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => handleUpdateHour(key, 'closed', !isClosed)}
                          className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                            isClosed
                              ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                              : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                          }`}
                        >
                          {isClosed ? 'Closed' : 'Open'}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="time"
                          disabled={isClosed}
                          value={dayData.open || '09:00'}
                          onChange={(e) => handleUpdateHour(key, 'open', e.target.value)}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs disabled:opacity-40"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="time"
                          disabled={isClosed}
                          value={dayData.close || '18:00'}
                          onChange={(e) => handleUpdateHour(key, 'close', e.target.value)}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs disabled:opacity-40"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 3: HERO & ONLINE TEXTS */}
      {activeSubTab === 'hero' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900">Hero Header & Availability Badges</h3>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Online Badge Text (When Office is Open)</label>
              <input
                type="text"
                value={content.heroOpenText || ''}
                onChange={(e) => setContent((p) => ({ ...p, heroOpenText: e.target.value }))}
                className={inputClass}
                placeholder="We’re online now"
              />
            </div>
            <div>
              <label className={labelClass}>Offline Badge Text (When Office is Closed)</label>
              <input
                type="text"
                value={content.heroClosedText || ''}
                onChange={(e) => setContent((p) => ({ ...p, heroClosedText: e.target.value }))}
                className={inputClass}
                placeholder="We’ll reply when we’re back"
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Main Hero Title</label>
            <input
              type="text"
              value={content.heroTitle || ''}
              onChange={(e) => setContent((p) => ({ ...p, heroTitle: e.target.value }))}
              className={inputClass}
              placeholder="Tell us where you want to go"
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

      {/* SUBTAB 4: ADDRESS & MAPS */}
      {activeSubTab === 'address' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900">Physical Office & Map Pin</h3>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Address Line 1</label>
              <input
                type="text"
                value={content.address?.[0] || ''}
                onChange={(e) => {
                  const addr = [...(content.address || [])];
                  addr[0] = e.target.value;
                  setContent((p) => ({ ...p, address: addr }));
                }}
                className={inputClass}
                placeholder="Boulevard Mohammed V"
              />
            </div>
            <div>
              <label className={labelClass}>Address Line 2 (City / Country)</label>
              <input
                type="text"
                value={content.address?.[1] || ''}
                onChange={(e) => {
                  const addr = [...(content.address || [])];
                  addr[1] = e.target.value;
                  setContent((p) => ({ ...p, address: addr }));
                }}
                className={inputClass}
                placeholder="Tangier 90000, Morocco"
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Google Maps Search URL</label>
            <input
              type="text"
              value={content.mapsHref || ''}
              onChange={(e) => setContent((p) => ({ ...p, mapsHref: e.target.value }))}
              className={inputClass}
              placeholder="https://www.google.com/maps/search/?api=1&query=..."
            />
          </div>
        </div>
      )}

      {/* SUBTAB 5: TOPICS */}
      {activeSubTab === 'topics' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Form Inquiry Topics</h3>
              <p className="text-xs text-slate-500">The options appearing in the topic dropdown on the contact form.</p>
            </div>
            <button
              type="button"
              onClick={handleAddTopic}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-500"
            >
              <Plus className="h-3.5 w-3.5" /> Add Topic
            </button>
          </div>

          <div className="space-y-2">
            {content.topics?.map((topic, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-slate-100 text-slate-600 text-xs font-bold">
                  {idx + 1}
                </span>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => handleUpdateTopic(idx, e.target.value)}
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => handleDeleteTopic(idx)}
                  className="rounded p-1.5 text-rose-500 hover:bg-rose-50"
                  title="Remove topic"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 6: FAQS */}
      {activeSubTab === 'faqs' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Frequently Asked Questions (Before You Write)</h3>
              <p className="text-xs text-slate-500">Reassures prospective travelers before they submit a booking or quote request.</p>
            </div>
            <button
              type="button"
              onClick={handleAddFaq}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-500"
            >
              <Plus className="h-3.5 w-3.5" /> Add FAQ
            </button>
          </div>

          <div className="space-y-3">
            {content.faqs?.map((faq, idx) => (
              <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                    Question {idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteFaq(idx)}
                    className="rounded p-1 text-rose-500 hover:bg-rose-50"
                    title="Remove FAQ"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div>
                  <label className={labelClass}>Question Text</label>
                  <input
                    type="text"
                    value={faq.q || ''}
                    onChange={(e) => handleUpdateFaq(idx, 'q', e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Answer Text</label>
                  <textarea
                    rows={2}
                    value={faq.a || ''}
                    onChange={(e) => handleUpdateFaq(idx, 'a', e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 7: SOCIALS */}
      {activeSubTab === 'socials' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900">Social Media Profile Links</h3>
          <p className="text-xs text-slate-500">Displayed in the "Follow our trips" footer block on the contact page.</p>

          <div className="grid gap-3 sm:grid-cols-3">
            {content.socials?.map((soc, idx) => (
              <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-1">
                <label className={labelClass}>{soc.label} Profile URL</label>
                <input
                  type="text"
                  value={soc.href || ''}
                  onChange={(e) => handleUpdateSocial(idx, e.target.value)}
                  className={inputClass}
                  placeholder={`https://${soc.label.toLowerCase()}.com/youragency`}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sticky Bottom Save Bar */}
      <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-md backdrop-blur">
        <span className="text-xs text-slate-500">
          Save your changes to publish updated contact channels, office schedule, and FAQs to <span className="font-mono text-amber-700">/contact</span>.
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
