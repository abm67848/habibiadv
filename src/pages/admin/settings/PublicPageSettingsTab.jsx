import { useEffect, useState } from 'react';
import {
  Plus, RefreshCw, Save, Trash2, AlertTriangle, CheckCircle2, Eye, FileText,
  Mail, Globe, PanelTop, Sparkles, ChevronDown, ChevronRight, Undo2,
} from 'lucide-react';
import {
  DEFAULT_ABOUT_CONTENT,
  DEFAULT_CONTACT_CONTENT,
  fetchPublicSiteContent,
  savePublicPageContent,
} from '@/services/publicSiteContent.js';

/* ------------------------------------------------------------------ */
/*  Style tokens                                                       */
/* ------------------------------------------------------------------ */
const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 hover:border-slate-300 focus:border-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-500/15';
const buttonClass =
  'inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50';
const btnPrimary =
  'inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm ring-1 ring-inset ring-amber-600/20 transition hover:bg-amber-600 disabled:opacity-50';
const btnGhost =
  'inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50';

function labelFor(key) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/^./, (letter) => letter.toUpperCase());
}

function blankLike(value) {
  if (typeof value === 'string') return '';
  if (typeof value === 'number') return 0;
  if (typeof value === 'boolean') return false;
  if (Array.isArray(value)) return [];
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, key === 'type' || key === 'icon' ? child : blankLike(child)]),
    );
  }
  return '';
}

function setAtPath(value, path, nextValue) {
  if (path.length === 0) return nextValue;
  const [key, ...rest] = path;
  const copy = Array.isArray(value) ? [...value] : { ...value };
  copy[key] = setAtPath(value[key], rest, nextValue);
  return copy;
}

function getAtPath(value, path) {
  return path.reduce((current, key) => current?.[key], value);
}

/* ------------------------------------------------------------------ */
/*  Recursive content field                                            */
/* ------------------------------------------------------------------ */
function ContentField({ label, path, value, template, onChange, depth = 0 }) {
  const fieldKey = String(path[path.length - 1] ?? '');
  if (fieldKey === 'type' || fieldKey === 'icon') return null;

  /* ---- Array ---- */
  if (Array.isArray(value)) {
    const templateValue = getAtPath(template, path);
    const sample = value[0] ?? (Array.isArray(templateValue) ? templateValue[0] : '');
    return (
      <fieldset className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/40 p-4">
        <legend className="flex items-center gap-2 rounded-md bg-white px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-slate-600 ring-1 ring-inset ring-slate-200">
          {label}
          <span className="rounded-full bg-amber-100 px-1.5 text-[10px] font-bold text-amber-800">{value.length}</span>
        </legend>

        {value.length === 0 && (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-4 text-center text-xs text-slate-500">
            No items yet. Add the first one below.
          </p>
        )}

        <div className="space-y-3">
          {value.map((item, index) => (
            <div key={`${path.join('.')}-${index}`} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-800">
                    {index + 1}
                  </span>
                  {label}
                </span>
                <button
                  type="button"
                  onClick={() => onChange(path, value.filter((_, itemIndex) => itemIndex !== index))}
                  className="rounded-md p-1.5 text-rose-600 transition hover:bg-rose-50 hover:text-rose-700"
                  aria-label={`Remove ${label} ${index + 1}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <ContentField
                label={`${label} ${index + 1}`}
                path={[...path, index]}
                value={item}
                template={template}
                onChange={onChange}
                depth={depth + 1}
              />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onChange(path, [...value, blankLike(sample)])}
          className={buttonClass}
        >
          <Plus className="h-3.5 w-3.5 text-amber-600" /> Add {label.toLowerCase()}
        </button>
      </fieldset>
    );
  }

  /* ---- Object ---- */
  if (value && typeof value === 'object') {
    return (
      <fieldset className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
        <legend className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
          {label}
        </legend>
        {Object.entries(value).map(([key, child]) => (
          <div key={[...path, key].join('.')} className={child && typeof child === 'object' && !Array.isArray(child) ? 'sm:col-span-2' : ''}>
            <ContentField
              label={labelFor(key)}
              path={[...path, key]}
              value={child}
              template={template}
              onChange={onChange}
              depth={depth + 1}
            />
          </div>
        ))}
      </fieldset>
    );
  }

  /* ---- Boolean ---- */
  if (typeof value === 'boolean') {
    return (
      <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm transition hover:border-slate-300">
        <input
          type="checkbox"
          checked={value}
          onChange={(event) => onChange(path, event.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
        />
        {label}
      </label>
    );
  }

  /* ---- Primitive (string / number) ---- */
  const multiline = typeof value === 'string'
    && (value.length > 90 || /description|text|answer|paragraph|title|summary|content|body/i.test(fieldKey));

  return (
    <label className="block space-y-1.5 text-xs font-medium text-slate-600">
      <span className="flex items-center gap-1.5">
        {label}
        {typeof value === 'number' && (
          <span className="rounded bg-slate-100 px-1.5 text-[10px] font-semibold text-slate-500">number</span>
        )}
      </span>
      {multiline ? (
        <textarea
          rows={3}
          value={value}
          onChange={(event) => onChange(path, event.target.value)}
          className={inputClass}
        />
      ) : (
        <input
          type={typeof value === 'number' ? 'number' : 'text'}
          value={value}
          onChange={(event) => onChange(path, typeof value === 'number' ? Number(event.target.value) : event.target.value)}
          className={inputClass}
        />
      )}
    </label>
  );
}

/* ------------------------------------------------------------------ */
/*  Small stat card (left accent bar)                                  */
/* ------------------------------------------------------------------ */
function StatCard({ label, value, tone = 'text-slate-900', bar = 'bg-slate-300' }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <span className={`absolute inset-y-0 left-0 w-1 ${bar}`} />
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function PublicPageSettingsTab({ page, onNotification }) {
  const defaults = page === 'contact' ? DEFAULT_CONTACT_CONTENT : DEFAULT_ABOUT_CONTENT;
  const [content, setContent] = useState(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    fetchPublicSiteContent()
      .then((pages) => { if (active) setContent(pages[page]); })
      .catch((loadError) => {
        console.error(`Could not load public ${page} content:`, loadError);
        if (active) setError(`Could not load saved content: ${loadError.message}`);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  const updateContent = (path, value) => {
    setContent((current) => setAtPath(current, path, value));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await savePublicPageContent(page, content);
      const msg = `${page === 'contact' ? 'Contact' : 'About'} page content saved.`;
      onNotification?.(msg);
      setNotice(msg);
    } catch (saveError) {
      console.error(`Could not save public ${page} content:`, saveError);
      setError(`Could not save changes: ${saveError.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!window.confirm('Reset this page to the default template? Unsaved changes will be lost.')) return;
    setContent(defaults);
    setNotice('Restored default template. Save to publish the changes.');
  };

  const heading = page === 'contact' ? 'Public Contact Page' : 'Public About Page';
  const HeadingIcon = page === 'contact' ? Mail : FileText;

  /* Rough KPI-ish counts (content stats) */
  const stats = {
    sections: content && typeof content === 'object' ? Object.keys(content).length : 0,
    links: JSON.stringify(content).match(/"(href|url)":/g)?.length || 0,
  };

  return (
    <main className="mx-auto w-full max-w-5xl space-y-5">
      {/* Header card */}
      <section className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 text-amber-600 ring-1 ring-inset ring-amber-200">
            <HeadingIcon aria-hidden="true" className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">{heading}</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Changes are published to the public site after saving.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
                <Globe className="h-3 w-3" /> live preview after save
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-800 ring-1 ring-inset ring-amber-200">
                <Sparkles className="h-3 w-3" /> structured content editor
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={handleReset} disabled={loading || saving} className={btnGhost}>
            <Undo2 className="h-4 w-4" /> Reset defaults
          </button>
          <button
            type="submit"
            form="public-page-form"
            disabled={loading || saving}
            className={btnPrimary}
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving…' : 'Save page content'}
          </button>
        </div>
      </section>

      {/* Banners */}
      {notice && (
        <p role="status" className="flex items-center justify-between gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 ring-1 ring-inset ring-emerald-200">
          <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" />{notice}</span>
          <button type="button" onClick={() => setNotice('')} className="rounded p-0.5 hover:bg-emerald-100" aria-label="Dismiss">
            ✕
          </button>
        </p>
      )}
      {error && (
        <p role="alert" className="flex items-center justify-between gap-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-inset ring-rose-200">
          <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{error}</span>
          <button type="button" onClick={() => setError('')} className="rounded p-0.5 hover:bg-rose-100" aria-label="Dismiss">
            ✕
          </button>
        </p>
      )}

      {/* Stats row */}
      {!loading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard label="Sections" value={stats.sections} bar="bg-amber-500" />
          <StatCard label="Links / URLs" value={stats.links} bar="bg-slate-300" />
          <StatCard label="Status" value={saving ? 'Saving' : 'Ready'} tone={saving ? 'text-amber-700' : 'text-emerald-700'} bar={saving ? 'bg-amber-400' : 'bg-emerald-500'} />
        </div>
      )}

      {/* Editor card */}
      <form id="public-page-form" onSubmit={handleSave} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/60 px-5 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <PanelTop className="h-4 w-4 text-amber-600" />
            Content editor
          </div>
          <span className="hidden text-[11px] text-slate-500 sm:inline">
            Fields marked <span className="rounded bg-slate-100 px-1 font-mono">type</span> and <span className="rounded bg-slate-100 px-1 font-mono">icon</span> are managed internally.
          </span>
        </div>

        <div className="space-y-4 p-5">
          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin text-amber-600" />
              Loading public page content…
            </div>
          ) : (
            <ContentField label={heading} path={[]} value={content} template={defaults} onChange={updateContent} />
          )}
        </div>

        {/* Sticky footer bar */}
        <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white/95 px-5 py-3 backdrop-blur">
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <Eye className="h-3.5 w-3.5" />
            Preview changes before saving.
          </p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleReset} disabled={loading || saving} className={btnGhost}>
              <Undo2 className="h-4 w-4" /> Reset
            </button>
            <button type="submit" disabled={loading || saving} className={btnPrimary}>
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Saving…' : 'Save page content'}
            </button>
          </div>
        </div>
      </form>
    </main>
  );
}