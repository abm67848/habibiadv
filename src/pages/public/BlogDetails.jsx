import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Calendar, Clock, User, ArrowLeft, ArrowRight, Share2, Check,
  BookOpen, Compass, Sparkles, MessageCircle,
} from 'lucide-react';
import {
  DEFAULT_BLOG_CONTENT,
  fetchPublicSiteContent,
} from '@/services/publicSiteContent.js';

const display = { fontFamily: "'Fraunces', Georgia, serif" };
const body = { fontFamily: "'Manrope', system-ui, sans-serif" };

export default function BlogDetailsPage() {
  const { slug } = useParams();
  const { t } = useTranslation();
  const [blogData, setBlogData] = useState(DEFAULT_BLOG_CONTENT);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    fetchPublicSiteContent()
      .then((data) => {
        if (active && data.blog) {
          setBlogData(data.blog);
        }
      })
      .catch((err) => {
        console.error('Failed to load blog content:', err);
      });
    return () => { active = false; };
  }, []);

  const posts = useMemo(() => {
    return blogData.posts || DEFAULT_BLOG_CONTENT.posts;
  }, [blogData.posts]);

  // Find post by slug or ID
  const post = useMemo(() => {
    return posts.find((p) => p.slug === slug || String(p.id) === slug) || null;
  }, [posts, slug]);

  // Related posts from same category
  const relatedPosts = useMemo(() => {
    if (!post) return [];
    return posts
      .filter((p) => (p.slug !== post.slug && p.id !== post.id) && (p.category === post.category || true))
      .slice(0, 3);
  }, [posts, post]);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard?.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  if (!post) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center" style={body}>
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-amber-50 text-amber-800 ring-1 ring-amber-200 mb-4">
          <BookOpen className="h-8 w-8 text-amber-700" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900" style={display}>
          {t('Article not found')}
        </h1>
        <p className="mt-2 text-sm text-slate-500 max-w-md">
          {t('The travel story you are looking for may have been moved or unpublished.')}
        </p>
        <Link
          to="/blog"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#0f3d2e] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#1f6b4f] transition"
        >
          <ArrowLeft className="h-4 w-4" /> {t('Back to all articles')}
        </Link>
      </div>
    );
  }

  return (
    <article className="min-h-screen bg-[#f3f6f1] text-slate-700 antialiased pb-24" style={body}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Manrope:wght@400;500;600;700&display=swap');
      `}</style>

      {/* HEADER & BREADCRUMBS */}
      <header className="bg-white border-b border-slate-200/80 pt-28 pb-12 sm:pt-36 sm:pb-16">
        <div className="mx-auto max-w-4xl px-5 lg:px-8">
          {/* Breadcrumb nav */}
          <nav className="flex items-center gap-2 text-xs text-slate-400 mb-6 font-medium">
            <Link to="/" className="hover:text-slate-700 transition">{t('Home')}</Link>
            <span>/</span>
            <Link to="/blog" className="hover:text-slate-700 transition">{t('Blog')}</Link>
            <span>/</span>
            <span className="text-slate-600 truncate max-w-[14rem] sm:max-w-xs">{t(post.category)}</span>
          </nav>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-900">
              {t(post.category)}
            </span>
            <span className="flex items-center gap-1 text-slate-500">
              <Calendar className="h-3.5 w-3.5" /> {post.publishedAt}
            </span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1 text-slate-500">
              <Clock className="h-3.5 w-3.5" /> {t(post.readTime)}
            </span>
          </div>

          <h1 className="mt-5 text-3xl sm:text-5xl lg:text-6xl leading-[1.1] text-[#0a2a20]" style={display}>
            {t(post.title)}
          </h1>

          <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed">
            {t(post.excerpt)}
          </p>

          {/* Author Card & Actions */}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-6">
            <div className="flex items-center gap-3.5">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-[#0f3d2e] text-base font-bold text-[#e6c877] ring-2 ring-[#c9a24b]/40">
                {post.author?.name ? post.author.name[0] : 'A'}
              </span>
              <div>
                <p className="text-sm font-bold text-slate-900">{post.author?.name}</p>
                <p className="text-xs text-slate-500">{t(post.author?.role || 'Local Travel Planner')}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Share2 className="h-3.5 w-3.5 text-slate-500" />}
                {copied ? t('Link copied!') : t('Share article')}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* FEATURED COVER IMAGE */}
      <div className="mx-auto max-w-5xl px-5 -mt-6 sm:-mt-8">
        <div className="overflow-hidden rounded-3xl shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/5 aspect-[16/9]">
          <img
            src={post.coverImage}
            alt={t(post.title)}
            className="h-full w-full object-cover"
          />
        </div>
      </div>

      {/* ARTICLE BODY CONTENT */}
      <div className="mx-auto max-w-3xl px-5 py-12 lg:px-8">
        <div className="space-y-6 text-base text-slate-700 leading-relaxed">
          {post.content ? (
            post.content.split('\n\n').map((block, idx) => {
              const trimmed = block.trim();
              if (trimmed.startsWith('### ')) {
                return (
                  <h2 key={idx} className="mt-8 text-2xl sm:text-3xl font-semibold text-[#0a2a20]" style={display}>
                    {t(trimmed.replace(/^### /, ''))}
                  </h2>
                );
              }
              if (trimmed.startsWith('## ')) {
                return (
                  <h2 key={idx} className="mt-8 text-2xl sm:text-3xl font-semibold text-[#0a2a20]" style={display}>
                    {t(trimmed.replace(/^## /, ''))}
                  </h2>
                );
              }
              if (trimmed.startsWith('- ')) {
                const items = trimmed.split('\n').filter((l) => l.trim().startsWith('- '));
                return (
                  <ul key={idx} className="my-4 space-y-2 pl-2">
                    {items.map((item, itemIdx) => (
                      <li key={itemIdx} className="flex items-start gap-2.5 text-sm sm:text-base">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c9a24b]" />
                        <span>{t(item.replace(/^- /, ''))}</span>
                      </li>
                    ))}
                  </ul>
                );
              }
              return (
                <p key={idx} className="text-slate-700 leading-relaxed">
                  {t(trimmed)}
                </p>
              );
            })
          ) : (
            <p>{post.excerpt}</p>
          )}
        </div>

        {/* AUTHOR BIO CARD */}
        <div className="mt-12 rounded-2xl bg-white p-6 shadow-sm border border-slate-200 sm:p-8 flex items-start gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#0f3d2e] text-lg font-bold text-[#e6c877]">
            {post.author?.name ? post.author.name[0] : 'A'}
          </span>
          <div>
            <h3 className="text-base font-bold text-slate-900">{post.author?.name}</h3>
            <p className="text-xs text-amber-700 font-medium">{post.author?.role || 'Journey Planner'}</p>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              {t('A passionate local travel specialist who lives and breathes Morocco. Dedicated to designing honest, authentic, and unforgettable itineraries.')}
            </p>
          </div>
        </div>

        {/* NAVIGATION BACK */}
        <div className="mt-8 flex items-center justify-between border-t border-slate-200/80 pt-6">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs"
          >
            <ArrowLeft className="h-4 w-4" /> {t('Back to all articles')}
          </Link>
          <Link
            to="/packages"
            className="inline-flex items-center gap-2 rounded-full bg-[#0f3d2e] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#1f6b4f] transition shadow-xs"
          >
            {t('Browse trips inspired by this')} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* RELATED ARTICLES */}
      {relatedPosts.length > 0 && (
        <section className="mx-auto max-w-7xl px-5 pt-12 lg:px-8 border-t border-slate-200/80">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-[#0a2a20]" style={display}>
              {t('Keep Exploring Stories')}
            </h2>
            <Link to="/blog" className="text-xs font-semibold text-[#0f3d2e] hover:text-[#9c7a2b] transition">
              {t('View all')} →
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {relatedPosts.map((rel) => (
              <article
                key={rel.id || rel.slug}
                className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                  <img
                    src={rel.coverImage}
                    alt={rel.title}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  <span className="absolute left-3 top-3 rounded-full bg-[#082a1f]/80 px-2 py-0.5 text-[10px] font-semibold text-[#e6c877] backdrop-blur">
                    {rel.category}
                  </span>
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400">{rel.readTime}</span>
                    <h3 className="mt-1 text-base font-bold leading-snug text-[#0a2a20]" style={display}>
                      <Link to={`/blog/${rel.slug || rel.id}`} className="hover:text-[#9c7a2b]">
                        {t(rel.title)}
                      </Link>
                    </h3>
                  </div>
                  <Link
                    to={`/blog/${rel.slug || rel.id}`}
                    className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#0f3d2e] group-hover:text-[#9c7a2b]"
                  >
                    {t('Read article')} →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
