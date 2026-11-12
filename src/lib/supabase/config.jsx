const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } = import.meta.env;

export const supabaseConfig = Object.freeze({
  url: VITE_SUPABASE_URL,
  key: VITE_SUPABASE_ANON_KEY,
});

export const isSupabaseConfigured = Boolean(VITE_SUPABASE_URL && VITE_SUPABASE_ANON_KEY);