import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Edit, Eye, Loader2, Plus, Search, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/index.jsx';
import { supabase } from '@/lib/supabase/client.jsx';
import { getAdminPackages, saveAdminOffer } from '@/services/packages/index.jsx';

const categories = [
  'Adventure',
  'Beach & Island',
  'City & Culture',
  'Desert & Safari',
  'Family',
  'Food & Wine',
  'Luxury',
  'Religious & Pilgrimage',
  'Other',
];

const createInitialOffer = () => ({
  reference: `PKG-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`,
  internal_title: '',
  public_title: '',
  package_category: 'City & Culture',
  destination_country: '',
  destination_city: '',
  duration_days: 1,
  duration_nights: 0,
  short_description: '',
});

function formatCurrency(amount, currency) {
  if (amount == null || amount === '') return 'Not priced';
  const code = currency || 'MAD';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 2,
    }).format(Number(amount));
  } catch {
    return `${code} ${Number(amount).toLocaleString()}`;
  }
}

export default function AdminPackagesAndServicesPage() {
  const navigate = useNavigate();
  const { user, permissions, loading: authLoading } = useAuth();
  const canViewOffers = permissions.includes('packages.view');
  const canCreateOffers = permissions.includes('packages.create');
  const [packages, setPackages] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newOffer, setNewOffer] = useState(createInitialOffer);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);

  const loadData = useCallback(async () => {
    if (authLoading) return;
    if (!user || !canViewOffers) {
      setPackages([]);
      setCounts({});
      setError(!user
        ? 'Sign in with an authorized account to manage offers.'
        : 'Your account is missing the packages.view permission.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const offers = await getAdminPackages();
      setPackages(offers);
      if (!offers.length) {
        setCounts({});
        return;
      }

      const offerIds = offers.map((offer) => offer.id);
      const [destinationsRes, accommodationsRes, transportsRes, departuresRes] = await Promise.all([
        supabase.from('offer_destinations').select('offer_id,country,destination_name').in('offer_id', offerIds),
        supabase.from('offer_accommodations').select('offer_id').in('offer_id', offerIds),
        supabase.from('offer_transports').select('offer_id,transport_type').in('offer_id', offerIds),
        supabase
          .from('offer_departures')
          .select('offer_id')
          .in('offer_id', offerIds)
          .gte('departure_date', new Date().toISOString().slice(0, 10)),
      ]);
      const countErrors = [destinationsRes, accommodationsRes, transportsRes, departuresRes]
        .filter((result) => result.error);
      if (countErrors.length) throw countErrors[0].error;

      const nextCounts = {};
      offerIds.forEach((id) => {
        nextCounts[id] = { countries: new Set(), cities: new Set(), hotels: 0, flights: 0, departures: 0 };
      });
      (destinationsRes.data || []).forEach((row) => {
        const item = nextCounts[row.offer_id];
        if (!item) return;
        if (row.country) item.countries.add(row.country.trim().toLowerCase());
        if (row.destination_name) item.cities.add(row.destination_name.trim().toLowerCase());
      });
      (accommodationsRes.data || []).forEach((row) => {
        if (nextCounts[row.offer_id]) nextCounts[row.offer_id].hotels += 1;
      });
      (transportsRes.data || []).forEach((row) => {
        if (row.transport_type?.toLowerCase() === 'flight' && nextCounts[row.offer_id]) {
          nextCounts[row.offer_id].flights += 1;
        }
      });
      (departuresRes.data || []).forEach((row) => {
        if (nextCounts[row.offer_id]) nextCounts[row.offer_id].departures += 1;
      });
      Object.keys(nextCounts).forEach((id) => {
        nextCounts[id].countries = nextCounts[id].countries.size;
        nextCounts[id].cities = nextCounts[id].cities.size;
      });
      setCounts(nextCounts);
    } catch (loadError) {
      console.error('Error loading admin offers:', loadError);
      setError(`Could not load offers and configuration counts: ${loadError.message}`);
    } finally {
      setLoading(false);
    }
  }, [authLoading, canViewOffers, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return packages.filter((offer) => {
      const matchesSearch =
        !query ||
        [offer.reference, offer.public_title, offer.internal_title, offer.destination_country]
          .some((value) => value?.toLowerCase().includes(query));
      return matchesSearch && (statusFilter === 'ALL' || offer.status === statusFilter);
    });
  }, [packages, search, statusFilter]);

  const handleCreateOffer = async (event) => {
    event.preventDefault();
    if (!canCreateOffers) {
      setError('Your account is missing the packages.create permission required to create offers.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const offer = await saveAdminOffer({
        reference: newOffer.reference,
        internal_title: newOffer.internal_title.trim(),
        public_title: newOffer.public_title.trim(),
        package_category: newOffer.package_category.trim(),
        destination_country: newOffer.destination_country.trim(),
        duration_days: Number(newOffer.duration_days),
        duration_nights: Number(newOffer.duration_nights),
        short_description: newOffer.short_description.trim() || null,
        status: 'draft',
        is_public: false,
        created_by: user?.id || null,
      });

      let destinationWarning = '';
      if (newOffer.destination_city.trim()) {
        const { error: destinationError } = await supabase.from('offer_destinations').insert({
          offer_id: offer.id,
          destination_name: newOffer.destination_city.trim(),
          country: newOffer.destination_country.trim(),
          sort_order: 0,
        });
        if (destinationError) {
          console.error('Offer created but main city could not be added:', destinationError);
          destinationWarning = ` The offer was created, but its city could not be saved: ${destinationError.message}`;
        }
      }

      setIsModalOpen(false);
      setNewOffer(createInitialOffer());
      await loadData();
      setNotice({ id: offer.id, message: `Draft offer created successfully.${destinationWarning}` });
    } catch (createError) {
      console.error('Error creating draft offer:', createError);
      setError(`Could not create offer: ${createError.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const liveCount = packages.filter((offer) => offer.is_public && offer.status === 'active').length;
  const draftCount = packages.filter((offer) => offer.status === 'draft').length;
  const activeCount = packages.filter((offer) => offer.status === 'active').length;

  if (authLoading || loading) {
    return <main className="flex min-h-[50vh] items-center justify-center gap-3 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin text-amber-600" />Checking account access and loading offers…</main>;
  }

  if (!user || !canViewOffers) {
    return (
      <main className="m-6 rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        <p>{!user ? 'Sign in with an authorized account to manage offers.' : 'Your account is missing the packages.view permission.'}</p>
        {!user && <button type="button" onClick={() => navigate('/auth/admin-login')} className="mt-3 font-semibold underline">Sign in</button>}
      </main>
    );
  }

  return (
    <main className="space-y-6 p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="rounded-md bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
            OFFERS & SERVICES
          </span>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Travel Offers Catalog</h1>
          <p className="mt-1 text-sm text-slate-500">Create draft offers, complete their details, then publish when ready.</p>
        </div>
        <button
          type="button"
          disabled={!canCreateOffers}
          onClick={() => {
            setError('');
            setNewOffer(createInitialOffer());
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Create New Offer
        </button>
      </header>

      {!canCreateOffers && (
        <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          You can view offers, but creating new ones requires the <code>packages.create</code> permission.
        </div>
      )}

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" />{notice.message}</span>
          <button
            type="button"
            onClick={() => navigate(`/admin/packages-services/${notice.id}`)}
            className="font-semibold underline underline-offset-2"
          >
            Continue editing
          </button>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          ['Total offers', packages.length],
          ['Active offers', activeCount],
          ['Draft offers', draftCount],
          ['Live online', liveCount],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative block w-full max-w-sm">
            <span className="sr-only">Search offers</span>
            <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title, reference or country..."
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-xs focus:border-amber-500 focus:outline-none"
            />
          </label>
          <select
            aria-label="Filter by offer status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600 focus:border-amber-500 focus:outline-none"
          >
            <option value="ALL">All statuses</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-xs">
            <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Reference / Offer</th>
                <th className="px-4 py-3">Category / Country</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Configuration</th>
                <th className="px-4 py-3">Starting price</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Public</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr><td colSpan={8} className="py-12 text-center text-slate-500"><Loader2 className="mx-auto h-6 w-6 animate-spin text-amber-600" />Loading offers...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="py-10 text-center text-slate-400">No matching offers found.</td></tr>
              ) : filtered.map((offer) => {
                const config = counts[offer.id] || {};
                return (
                  <tr key={offer.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-900">{offer.public_title || offer.internal_title || 'Untitled offer'}</div>
                      <div className="font-mono text-[10px] text-amber-700">{offer.reference}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div>{offer.package_category || '—'}</div>
                      <div className="text-[11px] text-slate-400">{offer.destination_country || '—'}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5">{offer.duration_days ?? '—'} days / {offer.duration_nights ?? '—'} nights</td>
                    <td className="px-4 py-3.5 leading-5 text-slate-500">
                      {config.countries || 0} countries · {config.cities || 0} cities<br />
                      {config.hotels || 0} hotels · {config.flights || 0} flights · {config.departures || 0} upcoming departures
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 font-semibold">{formatCurrency(offer.starting_price, offer.default_currency)}</td>
                    <td className="px-4 py-3.5">
                      <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${offer.status === 'active' ? 'bg-emerald-50 text-emerald-700' : offer.status === 'draft' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                        {offer.status || 'draft'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${offer.is_public && offer.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {offer.is_public && offer.status === 'active' ? 'Live Online' : 'Draft / Private'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-right">
                      <Link
                        to={`/packages/${offer.id}${offer.is_public && offer.status === 'active' ? '' : '?preview=true'}`}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`View ${offer.public_title || offer.reference} page`}
                        className="mr-3 inline-flex items-center gap-1 text-sky-700 hover:text-sky-900"
                      >
                        <Eye className="h-3.5 w-3.5" />View
                      </Link>
                      <Link to={`/admin/packages-services/${offer.id}`} aria-label={`Edit ${offer.public_title || offer.reference}`} className="inline-flex items-center gap-1 font-semibold text-amber-700 hover:text-amber-900">
                        <Edit className="h-3.5 w-3.5" />Edit
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="create-offer-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 id="create-offer-title" className="text-lg font-bold text-slate-900">Create draft offer</h2>
                <p className="mt-1 text-xs text-slate-500">Add the essentials now; configure services and pricing in the editor.</p>
              </div>
              <button type="button" onClick={() => setIsModalOpen(false)} aria-label="Close dialog" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleCreateOffer} className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-medium text-slate-700">Internal title
                  <input required value={newOffer.internal_title} onChange={(event) => setNewOffer({ ...newOffer, internal_title: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2" />
                </label>
                <label className="text-xs font-medium text-slate-700">Public title
                  <input required value={newOffer.public_title} onChange={(event) => setNewOffer({ ...newOffer, public_title: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2" />
                </label>
              </div>
              <label className="block text-xs font-medium text-slate-700">Reference (generated automatically)
                <input readOnly value={newOffer.reference} className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-slate-500" />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-medium text-slate-700">Package category
                  <select value={newOffer.package_category} onChange={(event) => setNewOffer({ ...newOffer, package_category: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2">
                    {categories.map((category) => <option key={category}>{category}</option>)}
                  </select>
                </label>
                <label className="text-xs font-medium text-slate-700">Destination country
                  <input required value={newOffer.destination_country} onChange={(event) => setNewOffer({ ...newOffer, destination_country: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2" />
                </label>
              </div>
              <label className="block text-xs font-medium text-slate-700">Main destination city <span className="font-normal text-slate-400">(optional)</span>
                <input value={newOffer.destination_city} onChange={(event) => setNewOffer({ ...newOffer, destination_city: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2" />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-medium text-slate-700">Duration in days
                  <input type="number" min="1" required value={newOffer.duration_days} onChange={(event) => setNewOffer({ ...newOffer, duration_days: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2" />
                </label>
                <label className="text-xs font-medium text-slate-700">Duration in nights
                  <input type="number" min="0" required value={newOffer.duration_nights} onChange={(event) => setNewOffer({ ...newOffer, duration_nights: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2" />
                </label>
              </div>
              <label className="block text-xs font-medium text-slate-700">Short description <span className="font-normal text-slate-400">(optional)</span>
                <textarea rows={3} value={newOffer.short_description} onChange={(event) => setNewOffer({ ...newOffer, short_description: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2" />
              </label>
              {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs text-slate-600">Cancel</button>
                <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2 text-xs font-semibold text-white disabled:opacity-50">
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {submitting ? 'Creating draft...' : 'Create draft offer'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
