import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search, Calendar, Clock, User, ArrowRight, Sparkles, BookOpen,
  Filter, Tag, Compass, MessageCircle,
} from 'lucide-react';
import {
  DEFAULT_BLOG_CONTENT,
  fetchPublicSiteContent,
} from '@/services/publicSiteContent.js';

const display = { fontFamily: "'Fraunces', Georgia, serif" };
const body = { fontFamily: "'Manrope', system-ui, sans-serif" };
const ring = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a24b]';

export default function BlogPage() {
  const { t } = useTranslation();
  const [blogData, setBlogData] = useState(DEFAULT_BLOG_CONTENT);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

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

  const hero = blogData.hero || DEFAULT_BLOG_CONTENT.hero;
  const categories = blogData.categories || DEFAULT_BLOG_CONTENT.categories;

  // Filter published posts
  const publishedPosts = useMemo(() => {
    const list = blogData.posts || DEFAULT_BLOG_CONTENT.posts;
    return list.filter((p) => p.published !== false);
  }, [blogData.posts]);

  // Find featured post
  const featuredPost = useMemo(() => {
    return publishedPosts.find((p) => p.featured) || publishedPosts[0] || null;
  }, [publishedPosts]);

  // Filtered posts for grid (excluding the featured one if no search/filter, or including all when filtered)
  const filteredPosts = useMemo(() => {
    return publishedPosts.filter((post) => {
      const matchCat =
        selectedCategory === 'All' || post.category === selectedCategory;
      const matchSearch =
        !searchQuery.trim() ||
        post.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.excerpt?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.author?.name?.toLowerCase().includes(searchQuery.toLowerCase());

      return matchCat && matchSearch;
    });
  }, [publishedPosts, selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-[#f3f6f1] text-slate-700 antialiased" style={body}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Manrope:wght@400;500;600;700&display=swap');
        @keyframes drift{from{transform:scale(1.04)}to{transform:scale(1.09)}}
        @keyframes rise{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
        .rise{opacity:0;animation:rise .7s cubic-bezier(.2,.7,.2,1) forwards}
      `}</style>

      {/* HERO SECTION */}
      <header className="relative isolate overflow-hidden bg-[#082a1f] pb-36 pt-32 text-white sm:pt-40">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#082a1f] via-[#0f3d2e] to-[#1f6b4f]" />
        <img
          src="https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1800&q=80"
          alt=""
          className="absolute inset-0 -z-10 h-full w-full object-cover opacity-25"
          style={{ animation: 'drift 24s ease-in-out infinite alternate' }}
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#082a1f]/60 to-[#082a1f]/90" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-t from-[#f3f6f1] to-transparent" />

        <div className="mx-auto max-w-7xl px-5 lg:px-8 text-center sm:text-left">
          {hero.badge && (
            <p className="rise inline-flex items-center gap-1.5 rounded-full bg-[#c9a24b]/20 px-3.5 py-1 text-xs font-semibold tracking-wider uppercase text-[#e6c877] ring-1 ring-[#c9a24b]/30">
              <Sparkles className="h-3.5 w-3.5" /> {t(hero.badge)}
            </p>
          )}
          <h1 className="rise mt-4 max-w-3xl text-4xl leading-[1.08] sm:text-6xl" style={display}>
            {t(hero.title)}
          </h1>
          <p className="rise mt-4 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg" style={{ animationDelay: '.15s' }}>
            {t(hero.description)}
          </p>

          {/* Search Bar */}
          <div className="rise mt-8 max-w-xl" style={{ animationDelay: '.25s' }}>
            <div className="relative">
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('Search articles, destinations, tips...')}
                className="w-full rounded-full border-0 bg-white/95 py-3.5 pl-12 pr-4 text-sm text-slate-900 shadow-xl backdrop-blur placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#c9a24b]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-3.5 text-xs font-semibold text-slate-400 hover:text-slate-700"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* CATEGORY FILTER PILLS */}
      <section className="relative z-10 mx-auto -mt-10 max-w-7xl px-5 lg:px-8">
        <div className="rounded-2xl bg-white p-2.5 shadow-xl shadow-[#082a1f]/10 ring-1 ring-[#0f3d2e]/5 sm:p-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-none py-1">
            {categories.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition ${ring} ${
                    active
                      ? 'bg-[#0f3d2e] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-[#f3f6f1] hover:text-slate-900'
                  }`}
                >
                  {cat === 'All' && <BookOpen className="h-3.5 w-3.5" />}
                  {t(cat)}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* MAIN CONTENT AREA */}
      <main className="mx-auto max-w-7xl px-5 py-12 lg:px-8 space-y-14">
        {/* FEATURED POST (Only shown when not searching and on 'All' category) */}
        {!searchQuery && selectedCategory === 'All' && featuredPost && (
          <section aria-label="Featured Story">
            <div className="overflow-hidden rounded-3xl bg-white shadow-xl shadow-[#0f3d2e]/5 ring-1 ring-[#0f3d2e]/10 transition duration-300 hover:shadow-2xl sm:grid sm:grid-cols-2">
              <div className="relative min-h-[18rem] sm:min-h-full">
                <img
                  src={featuredPost.coverImage}
                  alt={featuredPost.title}
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <span className="absolute left-4 top-4 rounded-full bg-[#082a1f]/80 px-3 py-1 text-xs font-semibold text-[#e6c877] backdrop-blur ring-1 ring-white/20">
                  ★ {t('Featured Story')}
                </span>
              </div>

              <div className="flex flex-col justify-between p-8 sm:p-10 lg:p-12">
                <div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-800 ring-1 ring-amber-200">
                      {featuredPost.category}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {featuredPost.readTime}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" /> {featuredPost.publishedAt}
                    </span>
                  </div>

                  <h2 className="mt-4 text-2xl sm:text-3xl lg:text-4xl leading-snug text-[#0a2a20]" style={display}>
                    <Link
                      to={`/blog/${featuredPost.slug || featuredPost.id}`}
                      className="hover:text-[#9c7a2b] transition"
                    >
                      {t(featuredPost.title)}
                    </Link>
                  </h2>

                  <p className="mt-4 text-sm leading-relaxed text-slate-600 line-clamp-3">
                    {t(featuredPost.excerpt)}
                  </p>
                </div>

                <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-[#0f3d2e] text-sm font-bold text-[#e6c877]">
                      {featuredPost.author?.name ? featuredPost.author.name[0] : 'A'}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{featuredPost.author?.name}</p>
                      <p className="text-[11px] text-slate-500">{featuredPost.author?.role}</p>
                    </div>
                  </div>

                  <Link
                    to={`/blog/${featuredPost.slug || featuredPost.id}`}
                    className={`inline-flex items-center gap-1.5 rounded-full bg-[#0f3d2e] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#1f6b4f] ${ring}`}
                  >
                    {t('Read story')} <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ARTICLES GRID */}
        <section aria-label="Article list">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#0a2a20]" style={display}>
              {selectedCategory === 'All' ? t('Latest Travel Articles') : t(selectedCategory)}
            </h2>
            <span className="text-xs text-slate-500">
              {filteredPosts.length} {filteredPosts.length === 1 ? t('article') : t('articles')}
            </span>
          </div>

          {filteredPosts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <BookOpen className="mx-auto h-10 w-10 text-slate-400 mb-3" />
              <h3 className="text-lg font-bold text-slate-800">{t('No articles found')}</h3>
              <p className="mt-1 text-sm text-slate-500">
                {t('Try searching for different keywords or select another category.')}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                }}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#0f3d2e] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#1f6b4f]"
              >
                {t('Reset filters')}
              </button>
            </div>
          ) : (
            <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
              {filteredPosts.map((post) => (
                <article
                  key={post.id || post.slug}
                  className="group flex flex-col overflow-hidden rounded-3xl bg-white shadow-md shadow-[#0f3d2e]/5 ring-1 ring-[#0f3d2e]/10 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#0f3d2e]/10"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                    <img
                      src={post.coverImage}
                      alt={post.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    <span className="absolute left-3 top-3 rounded-full bg-[#082a1f]/80 px-2.5 py-1 text-[11px] font-semibold text-[#e6c877] backdrop-blur">
                      {post.category}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col justify-between p-6">
                    <div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {post.publishedAt}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {post.readTime}
                        </span>
                      </div>

                      <h3 className="mt-3 text-xl leading-snug text-[#0a2a20]" style={display}>
                        <Link
                          to={`/blog/${post.slug || post.id}`}
                          className="hover:text-[#9c7a2b] transition"
                        >
                          {t(post.title)}
                        </Link>
                      </h3>

                      <p className="mt-2 text-xs leading-relaxed text-slate-600 line-clamp-3">
                        {t(post.excerpt)}
                      </p>
                    </div>

                    <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                      <div className="flex items-center gap-2">
                        <span className="grid h-7 w-7 place-items-center rounded-full bg-[#0f3d2e] text-[11px] font-bold text-[#e6c877]">
                          {post.author?.name ? post.author.name[0] : 'A'}
                        </span>
                        <span className="text-xs font-semibold text-slate-800">{post.author?.name}</span>
                      </div>

                      <Link
                        to={`/blog/${post.slug || post.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#0f3d2e] group-hover:text-[#9c7a2b] transition"
                      >
                        {t('Read')} <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* BOTTOM TRIP INSPIRATION CTA */}
        <section className="rounded-[2.5rem] bg-[#0f3d2e] p-8 text-white sm:p-14 relative overflow-hidden">
          <div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-[#c9a24b]/20 blur-3xl pointer-events-none" />
          <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center relative z-10">
            <div>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#e6c877]">
                <Sparkles className="h-4 w-4" /> {t('Turn Reading Into Reality')}
              </p>
              <h2 className="mt-2 text-3xl sm:text-4xl font-semibold leading-tight" style={display}>
                {t('Ready to experience Morocco with expert planners?')}
              </h2>
              <p className="mt-2 max-w-xl text-sm text-white/80">
                {t('Our team designs tailor-made itineraries, arranges authentic private stays, and provides 24/7 on-the-ground support.')}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/packages"
                className={`inline-flex items-center gap-2 rounded-full bg-[#c9a24b] px-6 py-3.5 text-xs font-bold text-[#082a1f] transition hover:bg-[#e6c877] ${ring}`}
              >
                {t('Browse packages')} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                to="/contact"
                className={`inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3.5 text-xs font-bold text-white transition hover:bg-white/10 ${ring}`}
              >
                <MessageCircle className="h-3.5 w-3.5" /> {t('Talk to a planner')}
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
