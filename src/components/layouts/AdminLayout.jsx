import { Navigate, Outlet } from 'react-router-dom';
import AdminSidebar from '../navigation/AdminSidebar.jsx';
import AdminTopbar from '../navigation/AdminTopbar.jsx';
import { useAuth } from '../../context/index.jsx';

export default function AdminLayout() {
  const {
    user,
    accountStatus,
    accountStatusError,
    rolePagePermissionsError,
    loading,
    refreshSession,
    refreshRolePagePermissions,
  } = useAuth();

  if (loading) return null;

  if (!user) {
    return <Navigate to="/auth/admin-login" replace state={{ message: 'Please sign in with an active account to access the admin portal.' }} />;
  }

  if (accountStatus === 'unknown') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md rounded-xl border border-amber-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">Account status could not be verified</h1>
          <p className="mt-2 text-sm text-slate-600">
            {accountStatusError || 'Your session is still active. Check your connection and retry verification.'}
          </p>
          <button
            type="button"
            onClick={() => refreshSession().catch((error) => console.error('Could not verify account status:', error))}
            className="mt-4 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500"
          >
            Retry verification
          </button>
        </div>
      </main>
    );
  }

  if (accountStatus !== 'active') {
    const message = accountStatus === 'pending'
      ? 'Your account is pending manager or super admin approval. You cannot access the admin portal until it is activated.'
      : accountStatus === 'suspended'
        ? 'Your account is suspended. Contact a manager or system administrator.'
        : 'Please sign in with an active account to access the admin portal.';
    return <Navigate to="/auth/admin-login" replace state={{ message }} />;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50">
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminTopbar />
        {accountStatusError && (
          <div role="alert" className="flex items-center justify-between gap-4 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
            <span>{accountStatusError}</span>
            <button
              type="button"
              onClick={() => refreshSession().catch((error) => console.error('Could not verify account status:', error))}
              className="shrink-0 font-semibold underline underline-offset-2"
            >
              Retry
            </button>
          </div>
        )}
        {rolePagePermissionsError && (
          <div role="alert" className="flex items-center justify-between gap-4 border-b border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-900">
            <span>Role page access could not be loaded. Restricted pages remain blocked. {rolePagePermissionsError}</span>
            <button
              type="button"
              onClick={refreshRolePagePermissions}
              className="shrink-0 font-semibold underline underline-offset-2"
            >
              Retry
            </button>
          </div>
        )}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
