import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { isSupabaseConfigured } from './lib/supabase/config.jsx';
import './index.css';

const root = createRoot(document.getElementById('app'));

function SupabaseSetupRequired() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f3f6f1] px-6 text-slate-700">
      <section className="max-w-xl rounded-3xl bg-white p-8 shadow-xl ring-1 ring-[#0f3d2e]/10 sm:p-10">
        <h1 className="text-3xl font-semibold text-[#0a2a20]">Habibi Adventure needs configuration</h1>
        <p className="mt-4 leading-relaxed">
          Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in
          your Vercel project’s Environment Variables, then redeploy.
        </p>
      </section>
    </main>
  );
}

if (!isSupabaseConfigured) {
  root.render(<SupabaseSetupRequired />);
} else {
  import('./App.jsx')
    .then(({ default: App }) => {
      root.render(
        <StrictMode>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </StrictMode>,
      );
    })
    .catch((error) => {
      console.error('Application failed to start:', error);
      root.render(
        <main className="grid min-h-screen place-items-center bg-[#f3f6f1] px-6 text-slate-700">
          <p role="alert" className="max-w-xl rounded-3xl bg-white p-8 shadow-xl ring-1 ring-[#0f3d2e]/10">
            The application failed to start. Please check the browser console for details and try again.
          </p>
        </main>,
      );
    });
}