import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Mail, MessageSquare, Phone, Clock, Calendar, CheckCircle2, AlertCircle,
  Search, RefreshCw, Trash2, Archive, Check, Send, ChevronRight, User,
  ExternalLink, Tag, Compass, FileSpreadsheet, Eye, Filter, ArrowUpRight,
  Sparkles, CheckCheck
} from 'lucide-react';
import { useAppSettings, translate } from '@/context/index.jsx';
import {
  fetchContactMessages,
  updateContactMessageStatus,
  deleteContactMessage,
} from '@/services/contactService.js';

const STATUS_CONFIG = {
  new: {
    label: 'Nuevo',
    badge: 'bg-amber-50 text-amber-800 ring-amber-300 font-semibold',
    dot: 'bg-amber-500 animate-pulse',
  },
  read: {
    label: 'Leído',
    badge: 'bg-slate-100 text-slate-700 ring-slate-200',
    dot: 'bg-slate-400',
  },
  replied: {
    label: 'Respondido',
    badge: 'bg-emerald-50 text-emerald-800 ring-emerald-300 font-semibold',
    dot: 'bg-emerald-500',
  },
  archived: {
    label: 'Archivado',
    badge: 'bg-zinc-100 text-zinc-600 ring-zinc-200',
    dot: 'bg-zinc-400',
  },
};

export default function ContactMessagesPage() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'new' | 'read' | 'replied' | 'archived'
  const [search, setSearch] = useState('');
  const [topicFilter, setTopicFilter] = useState('all');
  const [replyFilter, setReplyFilter] = useState('all');
  const [toast, setToast] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [staffNote, setStaffNote] = useState('');

  const notify = (msg, tone = 'success') => {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchContactMessages();
      setMessages(data || []);
      if (!selectedId && data?.length) {
        setSelectedId(data[0].id);
      }
    } catch (e) {
      console.error('Error loading messages:', e);
      setError(e.message || 'Error al cargar mensajes');
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedMsg = useMemo(() => {
    return messages.find((m) => m.id === selectedId) || null;
  }, [messages, selectedId]);

  useEffect(() => {
    if (selectedMsg) {
      setStaffNote(selectedMsg.notes || '');
    }
  }, [selectedMsg]);

  // Mark as read automatically when selecting an unread message
  useEffect(() => {
    if (selectedMsg && selectedMsg.status === 'new') {
      updateContactMessageStatus(selectedMsg.id, 'read')
        .then(() => {
          setMessages((prev) =>
            prev.map((m) => (m.id === selectedMsg.id ? { ...m, status: 'read' } : m))
          );
        })
        .catch((err) => console.warn('Could not auto-mark message as read:', err));
    }
  }, [selectedMsg]);

  // Status updates
  const handleSetStatus = async (id, status) => {
    setActionBusy(true);
    try {
      await updateContactMessageStatus(id, status);
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status } : m))
      );
      notify(`Mensaje marcado como ${STATUS_CONFIG[status]?.label || status}`);
    } catch (err) {
      notify('Error al actualizar el estado: ' + err.message, 'error');
    } finally {
      setActionBusy(false);
    }
  };

  const handleSaveNote = async () => {
    if (!selectedMsg) return;
    setActionBusy(true);
    try {
      await updateContactMessageStatus(selectedMsg.id, selectedMsg.status, staffNote);
      setMessages((prev) =>
        prev.map((m) => (m.id === selectedMsg.id ? { ...m, notes: staffNote } : m))
      );
      notify('Nota interna guardada.');
    } catch (err) {
      notify('Error al guardar la nota: ' + err.message, 'error');
    } finally {
      setActionBusy(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar este mensaje?')) return;
    setActionBusy(true);
    try {
      await deleteContactMessage(id);
      setMessages((prev) => prev.filter((m) => m.id !== id));
      if (selectedId === id) {
        setSelectedId(null);
      }
      notify('Mensaje eliminado.');
    } catch (err) {
      notify('Error al eliminar mensaje: ' + err.message, 'error');
    } finally {
      setActionBusy(false);
    }
  };

  // KPIs
  const kpis = useMemo(() => {
    const total = messages.length;
    const unread = messages.filter((m) => m.status === 'new').length;
    const replied = messages.filter((m) => m.status === 'replied').length;
    const withPackage = messages.filter((m) => Boolean(m.package_ref)).length;
    return { total, unread, replied, withPackage };
  }, [messages]);

  // Unique topics for filter dropdown
  const allTopics = useMemo(() => {
    const set = new Set();
    messages.forEach((m) => {
      if (m.topic) set.add(m.topic);
    });
    return Array.from(set);
  }, [messages]);

  // Filtered messages
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return messages.filter((m) => {
      const matchSearch =
        !q ||
        `${m.name || ''} ${m.email || ''} ${m.phone || ''} ${m.topic || ''} ${m.message || ''} ${m.package_ref || ''}`
          .toLowerCase()
          .includes(q);

      const matchTab =
        activeTab === 'all' ? true : m.status === activeTab;

      const matchTopic =
        topicFilter === 'all' ? true : m.topic === topicFilter;

      const matchReply =
        replyFilter === 'all' ? true : (m.preferred_reply || 'email') === replyFilter;

      return matchSearch && matchTab && matchTopic && matchReply;
    });
  }, [messages, search, activeTab, topicFilter, replyFilter]);

  const exportCsv = () => {
    const esc = (v) => (v == null ? '' : `"${String(v).replace(/"/g, '""')}"`);
    const header = ['id', 'name', 'email', 'phone', 'topic', 'preferred_reply', 'package_ref', 'status', 'message', 'notes', 'created_at'];
    const rows = filtered.map((m) =>
      [m.id, m.name, m.email, m.phone, m.topic, m.preferred_reply, m.package_ref, m.status, m.message, m.notes, m.created_at]
        .map(esc)
        .join(',')
    );
    const blob = new Blob([[header.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contact-messages-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold shadow-lg transition-all ${
            toast.tone === 'error'
              ? 'bg-rose-600 text-white'
              : 'bg-emerald-600 text-white'
          }`}
        >
          {toast.tone === 'error' ? (
            <AlertCircle className="h-4 w-4 shrink-0" />
          ) : (
            <Check className="h-4 w-4 shrink-0" />
          )}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-amber-100 p-2 text-amber-800">
              <Mail className="h-5 w-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900">
              {translate('Mensajes de contacto')}
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 max-w-2xl">
            Bandeja de entrada centralizada para todas las consultas, solicitudes y mensajes recibidos a través del formulario público de contacto.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-50 transition"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            <span>Exportar CSV</span>
          </button>
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-amber-500 disabled:opacity-50 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Mensajes</span>
            <span className="rounded-lg bg-slate-100 p-1.5 text-slate-600">
              <MessageSquare className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{kpis.total}</p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-900">Nuevos / Sin leer</span>
            <span className="rounded-lg bg-amber-200/60 p-1.5 text-amber-800">
              <Mail className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-900 flex items-center gap-2">
            {kpis.unread}
            {kpis.unread > 0 && (
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-ping" />
            )}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Respondidos</span>
            <span className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600">
              <CheckCheck className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{kpis.replied}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Consultas de Paquetes</span>
            <span className="rounded-lg bg-sky-50 p-1.5 text-sky-600">
              <Compass className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{kpis.withPackage}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Status Tabs */}
          <div className="flex flex-wrap gap-1.5 border-b md:border-b-0 pb-2 md:pb-0">
            {[
              { id: 'all', label: 'Todos', count: kpis.total },
              { id: 'new', label: 'Nuevos', count: kpis.unread },
              { id: 'read', label: 'Leídos', count: messages.filter((m) => m.status === 'read').length },
              { id: 'replied', label: 'Respondidos', count: kpis.replied },
              { id: 'archived', label: 'Archivados', count: messages.filter((m) => m.status === 'archived').length },
            ].map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    active
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                      active ? 'bg-amber-700/60 text-white' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search box */}
          <div className="relative min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, correo, mensaje…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-1.5 pl-8.5 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition"
            />
          </div>
        </div>

        {/* Secondary filters */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <span>Tema:</span>
            <select
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-amber-500 focus:outline-none"
            >
              <option value="all">Todos los temas</option>
              {allTopics.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span>Canal preferido:</span>
            <select
              value={replyFilter}
              onChange={(e) => setReplyFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-amber-500 focus:outline-none"
            >
              <option value="all">Cualquiera</option>
              <option value="email">Email</option>
              <option value="phone">Teléfono / WhatsApp</option>
            </select>
          </div>

          {(search || topicFilter !== 'all' || replyFilter !== 'all' || activeTab !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setTopicFilter('all');
                setReplyFilter('all');
                setActiveTab('all');
              }}
              className="text-amber-700 font-semibold hover:underline"
            >
              Restablecer filtros
            </button>
          )}
        </div>
      </div>

      {/* Main Split View: Left List, Right Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Messages List Column */}
        <div className="lg:col-span-5 space-y-2">
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
              <RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin text-amber-600" />
              <span>Cargando mensajes…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">
              <MessageSquare className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              <p className="font-semibold text-slate-700">No se encontraron mensajes</p>
              <p className="text-xs text-slate-400 mt-1">
                {search || topicFilter !== 'all'
                  ? 'Prueba con otros términos de búsqueda.'
                  : 'Los mensajes enviados desde /contact aparecerán aquí.'}
              </p>
            </div>
          ) : (
            filtered.map((msg) => {
              const isSelected = selectedId === msg.id;
              const statusCfg = STATUS_CONFIG[msg.status] || STATUS_CONFIG.new;
              const isUnread = msg.status === 'new';
              return (
                <div
                  key={msg.id}
                  onClick={() => setSelectedId(msg.id)}
                  className={`group relative cursor-pointer rounded-2xl border p-4 transition-all ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50/40 shadow-xs ring-1 ring-amber-500/30'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {isUnread && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" title="Nuevo sin leer" />
                      )}
                      <h3 className={`truncate text-sm font-bold ${isUnread ? 'text-slate-900' : 'text-slate-700'}`}>
                        {msg.name}
                      </h3>
                    </div>

                    <span className="shrink-0 text-[11px] text-slate-400 font-medium">
                      {formatDate(msg.created_at)}
                    </span>
                  </div>

                  <p className="mt-1 truncate text-xs text-slate-500">{msg.email}</p>

                  <p className="mt-2 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {msg.message}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ring-1 ring-inset ${statusCfg.badge}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dot}`} />
                      {statusCfg.label}
                    </span>

                    {msg.topic && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                        <Tag className="h-2.5 w-2.5 text-slate-400" />
                        {msg.topic}
                      </span>
                    )}

                    {msg.package_ref && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700 ring-1 ring-sky-200">
                        <Compass className="h-2.5 w-2.5 text-sky-500" />
                        {msg.package_ref}
                      </span>
                    )}

                    {msg.preferred_reply === 'phone' ? (
                      <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-slate-400" title="Preferencia: Teléfono / WhatsApp">
                        <Phone className="h-3 w-3 text-emerald-600" />
                      </span>
                    ) : (
                      <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-slate-400" title="Preferencia: Email">
                        <Mail className="h-3 w-3 text-sky-600" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Message Detail View Column */}
        <div className="lg:col-span-7 sticky top-6">
          {selectedMsg ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              {/* Sender Details Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-100">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-lg font-bold text-slate-900">{selectedMsg.name}</h2>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs ring-1 ring-inset ${STATUS_CONFIG[selectedMsg.status]?.badge || ''}`}>
                      {STATUS_CONFIG[selectedMsg.status]?.label || selectedMsg.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-1">
                    <a
                      href={`mailto:${selectedMsg.email}`}
                      className="inline-flex items-center gap-1 text-amber-700 hover:underline font-medium"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      {selectedMsg.email}
                    </a>

                    {selectedMsg.phone && (
                      <a
                        href={`tel:${selectedMsg.phone}`}
                        className="inline-flex items-center gap-1 text-slate-700 hover:text-amber-700"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        {selectedMsg.phone}
                      </a>
                    )}

                    <span className="inline-flex items-center gap-1 text-slate-400">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDate(selectedMsg.created_at)}
                    </span>
                  </div>
                </div>

                {/* Quick status dropdown or buttons */}
                <div className="flex items-center gap-2">
                  {selectedMsg.status !== 'replied' && (
                    <button
                      type="button"
                      disabled={actionBusy}
                      onClick={() => handleSetStatus(selectedMsg.id, 'replied')}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition shadow-xs"
                      title="Marcar como respondido"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Respondido</span>
                    </button>
                  )}

                  {selectedMsg.status !== 'archived' && (
                    <button
                      type="button"
                      disabled={actionBusy}
                      onClick={() => handleSetStatus(selectedMsg.id, 'archived')}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                      title="Archivar mensaje"
                    >
                      <Archive className="h-3.5 w-3.5 text-slate-400" />
                      <span>Archivar</span>
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={() => handleDelete(selectedMsg.id)}
                    className="rounded-xl border border-rose-200 p-2 text-rose-600 hover:bg-rose-50 transition"
                    title="Eliminar mensaje"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Inquiry Tags & Meta */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                <div>
                  <span className="text-[11px] font-medium text-slate-400 block">Tema de consulta:</span>
                  <span className="font-semibold text-slate-800">{selectedMsg.topic || 'General'}</span>
                </div>

                <div>
                  <span className="text-[11px] font-medium text-slate-400 block">Canal preferido:</span>
                  <span className="font-semibold text-slate-800 capitalize">
                    {selectedMsg.preferred_reply === 'phone' ? 'Teléfono / WhatsApp' : 'Correo electrónico'}
                  </span>
                </div>

                {selectedMsg.package_ref && (
                  <div>
                    <span className="text-[11px] font-medium text-slate-400 block">Paquete de interés:</span>
                    <span className="font-bold text-amber-700">{selectedMsg.package_ref}</span>
                  </div>
                )}
              </div>

              {/* Message Content */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Mensaje del cliente:
                </h4>
                <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed select-text">
                  {selectedMsg.message}
                </div>
              </div>

              {/* Direct Reply Actions */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                <a
                  href={`mailto:${selectedMsg.email}?subject=Respuesta a su consulta: ${encodeURIComponent(selectedMsg.topic || 'Habibi Adventure')}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => handleSetStatus(selectedMsg.id, 'replied')}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-amber-500 transition"
                >
                  <Mail className="h-4 w-4" />
                  <span>Responder por Email</span>
                </a>

                {selectedMsg.phone && (
                  <a
                    href={`https://wa.me/${selectedMsg.phone.replace(/[^\d]/g, '')}?text=Hola%20${encodeURIComponent(selectedMsg.name)},%20te%20contactamos%20desde%20Habibi%20Adventure%20en%20relación%20a%20tu%20consulta.`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => handleSetStatus(selectedMsg.id, 'replied')}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-500 transition"
                  >
                    <Send className="h-4 w-4" />
                    <span>Contactar por WhatsApp</span>
                  </a>
                )}
              </div>

              {/* Internal Staff Notes */}
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Notas internas del equipo:
                  </h4>
                  <span className="text-[11px] text-slate-400">Visible solo para administradores y equipo</span>
                </div>
                <textarea
                  value={staffNote}
                  onChange={(e) => setStaffNote(e.target.value)}
                  placeholder="Añade notas internas sobre el seguimiento de este cliente..."
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={actionBusy || staffNote === (selectedMsg.notes || '')}
                    onClick={handleSaveNote}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-40 transition"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Guardar nota</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-16 text-center text-slate-400">
              <Eye className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              <p className="text-sm font-medium text-slate-600">Selecciona un mensaje para ver los detalles</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
