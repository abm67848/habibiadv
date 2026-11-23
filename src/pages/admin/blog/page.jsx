import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen, Plus, Search, Edit, Trash2, Eye, EyeOff, Save, RefreshCw,
  CheckCircle2, AlertTriangle, ExternalLink, Calendar, Clock, User, Tag,
  FileText, Sparkles, Filter, ChevronRight, X, ArrowLeft,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  DEFAULT_BLOG_CONTENT,
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

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

export default function AdminBlogPage() {
  const [blogData, setBlogData] = useState(DEFAULT_BLOG_CONTENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  // Filtering & search
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'published', 'draft'

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);

  useEffect(() => {
    let active = true;
    fetchPublicSiteContent()
      .then((data) => {
        if (active && data.blog) {
          setBlogData(data.blog);
        }
      })
      .catch((err) => {
        console.error('Failed to load blog posts:', err);
        if (active) setError('Could not load blog posts: ' + err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const triggerNotice = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 4000);
  };

  const persistBlog = async (nextBlogData, successMsg) => {
    setSaving(true);
    setError('');
    try {
      await savePublicPageContent('blog', nextBlogData);
      setBlogData(nextBlogData);
      triggerNotice(successMsg || 'Blog updates published successfully!');
    } catch (err) {
      console.error('Error saving blog:', err);
      setError('Failed to save blog changes: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Stats calculation
  const stats = useMemo(() => {
    const posts = blogData.posts || [];
    return {
      total: posts.length,
      published: posts.filter((p) => p.published).length,
      drafts: posts.filter((p) => !p.published).length,
      categories: blogData.categories?.length || 0,
    };
  }, [blogData]);

  // Filtered posts
  const filteredPosts = useMemo(() => {
    return (blogData.posts || []).filter((post) => {
      const matchSearch =
        !search.trim() ||
        post.title?.toLowerCase().includes(search.toLowerCase()) ||
        post.excerpt?.toLowerCase().includes(search.toLowerCase()) ||
        post.author?.name?.toLowerCase().includes(search.toLowerCase());

      const matchCat =
        selectedCategory === 'All' || post.category === selectedCategory;

      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'published' && post.published) ||
        (statusFilter === 'draft' && !post.published);

      return matchSearch && matchCat && matchStatus;
    });
  }, [blogData.posts, search, selectedCategory, statusFilter]);

  // Actions
  const handleOpenCreateModal = () => {
    setEditingPost({
      id: 'post-' + Date.now(),
      slug: '',
      title: '',
      excerpt: '',
      coverImage: 'https://images.unsplash.com/photo-1539020140153-e479b8c22e70?auto=format&fit=crop&w=1200&q=80',
      category: 'Travel Guides',
      author: {
        name: 'Ayoub El Idrissi',
        role: 'Journey Planner',
        avatar: '',
      },
      publishedAt: new Date().toISOString().split('T')[0],
      readTime: '5 min read',
      published: true,
      featured: false,
      content: '### Article Heading\nWrite your inspiring travel story or practical guide here. Paragraphs and markdown bullet points are fully formatted on the public article page.',
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (post) => {
    setEditingPost({ ...post });
    setModalOpen(true);
  };

  const handleTogglePublish = async (post) => {
    const nextPosts = blogData.posts.map((p) =>
      p.id === post.id ? { ...p, published: !p.published } : p
    );
    const nextData = { ...blogData, posts: nextPosts };
    await persistBlog(
      nextData,
      `Article "${post.title}" is now ${!post.published ? 'Published' : 'a Draft'}.`
    );
  };

  const handleDeletePost = async (post) => {
    if (window.confirm(`Are you sure you want to permanently delete "${post.title}"?`)) {
      const nextPosts = blogData.posts.filter((p) => p.id !== post.id);
      const nextData = { ...blogData, posts: nextPosts };
      await persistBlog(nextData, `Article "${post.title}" deleted.`);
    }
  };

  const handleSaveModalPost = async (e) => {
    e.preventDefault();
    if (!editingPost.title.trim()) {
      alert('Please enter an article title.');
      return;
    }

    const postToSave = {
      ...editingPost,
      slug: editingPost.slug.trim() || slugify(editingPost.title),
    };

    const exists = blogData.posts.some((p) => p.id === postToSave.id);
    let nextPosts;
    if (exists) {
      nextPosts = blogData.posts.map((p) => (p.id === postToSave.id ? postToSave : p));
    } else {
      nextPosts = [postToSave, ...blogData.posts];
    }

    // Ensure category exists in categories list
    let nextCategories = blogData.categories || ['All'];
    if (postToSave.category && !nextCategories.includes(postToSave.category)) {
      nextCategories = [...nextCategories, postToSave.category];
    }

    const nextData = { ...blogData, categories: nextCategories, posts: nextPosts };
    await persistBlog(nextData, `Article "${postToSave.title}" saved successfully!`);
    setModalOpen(false);
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
              CONTENT MANAGEMENT
            </span>
            <span className="text-xs text-slate-400">• Travel Journal</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Blog Articles & Stories
          </h1>
          <p className="text-sm text-slate-500">
            Publish guides, cultural notes, and travel advice visible to travelers on <span className="font-mono text-amber-700">/blog</span>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/blog"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition shadow-xs"
          >
            <ExternalLink className="h-4 w-4 text-slate-500" /> View Public Blog
          </a>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-amber-500 transition"
          >
            <Plus className="h-4 w-4" /> New Article
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

      {/* KPI Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Total Articles</span>
          <p className="mt-1 text-2xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 shadow-xs">
          <span className="text-xs font-medium text-emerald-700">Published</span>
          <p className="mt-1 text-2xl font-bold text-emerald-800">{stats.published}</p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 shadow-xs">
          <span className="text-xs font-medium text-amber-700">Drafts</span>
          <p className="mt-1 text-2xl font-bold text-amber-800">{stats.drafts}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Topics & Categories</span>
          <p className="mt-1 text-2xl font-bold text-slate-900">{stats.categories}</p>
        </div>
      </div>

      {/* Filters and search */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by article title, excerpt, or author..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status selector */}
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-medium">
            <button
              onClick={() => setStatusFilter('all')}
              className={`rounded-md px-2.5 py-1 ${statusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              All ({stats.total})
            </button>
            <button
              onClick={() => setStatusFilter('published')}
              className={`rounded-md px-2.5 py-1 ${statusFilter === 'published' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Published ({stats.published})
            </button>
            <button
              onClick={() => setStatusFilter('draft')}
              className={`rounded-md px-2.5 py-1 ${statusFilter === 'draft' ? 'bg-white text-amber-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Drafts ({stats.drafts})
            </button>
          </div>

          {/* Category selector */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-amber-500 focus:outline-none"
          >
            {blogData.categories?.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'All' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Articles List Table / Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-slate-500 bg-white rounded-xl border border-slate-200">
          <RefreshCw className="h-6 w-6 animate-spin text-amber-600 mb-2" />
          <p className="text-sm">Loading articles…</p>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-slate-400 mb-2" />
          <p className="text-sm font-semibold text-slate-700">No articles match your criteria</p>
          <p className="text-xs text-slate-500 mt-1">Try clearing filters or create a new blog article.</p>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-500"
          >
            <Plus className="h-3.5 w-3.5" /> Add New Article
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredPosts.map((post) => (
            <div
              key={post.id}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-slate-300"
            >
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <img
                  src={post.coverImage || 'https://images.unsplash.com/photo-1539020140153-e479b8c22e70?auto=format&fit=crop&w=300&q=80'}
                  alt=""
                  className="h-16 w-24 rounded-lg object-cover bg-slate-100 shrink-0 border border-slate-200"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 ring-1 ring-amber-200">
                      {post.category}
                    </span>
                    {post.featured && (
                      <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 ring-1 ring-indigo-200">
                        ★ Featured
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        post.published
                          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                          : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                      }`}
                    >
                      {post.published ? 'Published' : 'Draft'}
                    </span>
                  </div>

                  <h3 className="mt-1 text-sm font-bold text-slate-900 line-clamp-1">{post.title}</h3>
                  <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">{post.excerpt}</p>

                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" /> {post.author?.name || 'Ayoub El Idrissi'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {post.publishedAt || '2026-11-20'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {post.readTime || '5 min'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <a
                  href={`/blog/${post.slug || post.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                  title="Preview public article"
                >
                  <Eye className="h-4 w-4" />
                </a>

                <button
                  type="button"
                  onClick={() => handleTogglePublish(post)}
                  disabled={saving}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                    post.published
                      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                  }`}
                  title={post.published ? 'Unpublish article' : 'Publish article'}
                >
                  {post.published ? 'Unpublish' : 'Publish'}
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenEditModal(post)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() => handleDeletePost(post)}
                  disabled={saving}
                  className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 transition"
                  title="Delete article"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {modalOpen && editingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-3xl my-8 rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-100 text-amber-800">
                  <FileText className="h-4 w-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingPost.title ? 'Edit Article' : 'Create New Travel Article'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModalPost} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div>
                <label className={labelClass}>Article Title</label>
                <input
                  type="text"
                  required
                  value={editingPost.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    setEditingPost((prev) => ({
                      ...prev,
                      title,
                      slug: prev.slug ? prev.slug : slugify(title),
                    }));
                  }}
                  className={inputClass}
                  placeholder="e.g. 10 Secret Spots in Tangier Every Traveler Should Visit"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="flex items-center justify-between">
                    <label className={labelClass}>URL Slug</label>
                    <button
                      type="button"
                      onClick={() => setEditingPost((p) => ({ ...p, slug: slugify(p.title) }))}
                      className="text-[10px] text-amber-600 hover:underline"
                    >
                      Regenerate
                    </button>
                  </div>
                  <input
                    type="text"
                    value={editingPost.slug}
                    onChange={(e) => setEditingPost((p) => ({ ...p, slug: slugify(e.target.value) }))}
                    className={inputClass}
                    placeholder="secret-spots-in-tangier"
                  />
                </div>

                <div>
                  <label className={labelClass}>Category</label>
                  <input
                    type="text"
                    list="blog-category-list"
                    value={editingPost.category}
                    onChange={(e) => setEditingPost((p) => ({ ...p, category: e.target.value }))}
                    className={inputClass}
                    placeholder="Travel Guides, Food, Culture..."
                  />
                  <datalist id="blog-category-list">
                    {blogData.categories?.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label className={labelClass}>Short Excerpt / Teaser</label>
                <textarea
                  rows={2}
                  required
                  value={editingPost.excerpt}
                  onChange={(e) => setEditingPost((p) => ({ ...p, excerpt: e.target.value }))}
                  className={inputClass}
                  placeholder="Brief summary appearing in social previews and card listings..."
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Cover Image URL</label>
                  <input
                    type="text"
                    value={editingPost.coverImage}
                    onChange={(e) => setEditingPost((p) => ({ ...p, coverImage: e.target.value }))}
                    className={inputClass}
                    placeholder="https://images.unsplash.com/..."
                  />
                </div>

                <div>
                  <label className={labelClass}>Estimated Read Time</label>
                  <input
                    type="text"
                    value={editingPost.readTime}
                    onChange={(e) => setEditingPost((p) => ({ ...p, readTime: e.target.value }))}
                    className={inputClass}
                    placeholder="e.g. 6 min read"
                  />
                </div>
              </div>

              {/* Author & publish settings */}
              <div className="grid gap-3 sm:grid-cols-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <div>
                  <label className={labelClass}>Author Name</label>
                  <input
                    type="text"
                    value={editingPost.author?.name || ''}
                    onChange={(e) =>
                      setEditingPost((p) => ({
                        ...p,
                        author: { ...(p.author || {}), name: e.target.value },
                      }))
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Author Role</label>
                  <input
                    type="text"
                    value={editingPost.author?.role || ''}
                    onChange={(e) =>
                      setEditingPost((p) => ({
                        ...p,
                        author: { ...(p.author || {}), role: e.target.value },
                      }))
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Publish Date</label>
                  <input
                    type="date"
                    value={editingPost.publishedAt || ''}
                    onChange={(e) => setEditingPost((p) => ({ ...p, publishedAt: e.target.value }))}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap items-center gap-6 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPost.published}
                    onChange={(e) => setEditingPost((p) => ({ ...p, published: e.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="font-semibold text-slate-800">Publish immediately to public website</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPost.featured}
                    onChange={(e) => setEditingPost((p) => ({ ...p, featured: e.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-semibold text-slate-800">Pin as Featured Hero Article</span>
                </label>
              </div>

              {/* Full Article Content */}
              <div>
                <label className={labelClass}>Article Body (Supports Headings with ### and Bullet points with -)</label>
                <textarea
                  rows={10}
                  required
                  value={editingPost.content}
                  onChange={(e) => setEditingPost((p) => ({ ...p, content: e.target.value }))}
                  className="w-full font-mono text-xs rounded-lg border border-slate-200 bg-white p-3 text-slate-800 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className={btnGhost}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={btnPrimary}
                >
                  {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? 'Saving…' : 'Save & Publish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
