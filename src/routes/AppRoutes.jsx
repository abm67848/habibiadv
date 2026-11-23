import { Route, Routes, Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import AdminLayout from '../components/layouts/AdminLayout.jsx';
import AuthLayout from '../components/layouts/AuthLayout.jsx';
import CustomerLayout from '../components/layouts/CustomerLayout.jsx';
import PublicLayout from '../components/layouts/PublicLayout.jsx';
import NotFound from '../components/shared/NotFound.jsx';
import * as AdminPages from '../pages/admin/index.jsx';
import * as AuthPages from '../pages/auth/index.jsx';
import * as CustomerPages from '../pages/customer/index.jsx';
import * as PublicPages from '../pages/public/index.jsx';
import { useAuth } from '../context/index.jsx';
import { canUserAccessPath } from '../services/roleAccessService.js';

function ProtectedAdminPage({ path, Component }) {
  const { roles, rolePagePermissions, loading } = useAuth();
  if (loading) return null;

  const fullPath = `/admin/${path}`.replace(/\/$/, '');
  const allowed = canUserAccessPath(roles, fullPath, rolePagePermissions);

  if (!allowed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mb-4 ring-8 ring-amber-50">
          <ShieldAlert className="w-8 h-8 text-amber-700" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Access Restricted</h2>
        <p className="text-sm text-slate-500 max-w-md mb-6 leading-relaxed">
          Your assigned role does not have permission to view or manage this section. Please contact your manager or administrator to request access.
        </p>
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 text-white font-medium text-sm hover:bg-amber-500 transition shadow-xs"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return <Component />;
}

const adminRoutes = [
  ['analytics', AdminPages.Analytics],
  ['blog', AdminPages.Blog],
  ['bookings', AdminPages.Bookings],
  ['contracts', AdminPages.Contracts],
  ['customers', AdminPages.Customers],
  ['customers/:customerId', AdminPages.CustomerDetails],
  ['expenses', AdminPages.Expenses],
  ['finance', AdminPages.Finance],
  // ['insurance', AdminPages.Insurance], // <-- REMOVED: This was causing the Vite import error
  ['packages', AdminPages.PackagesAndServices],
  ['packages/:id', AdminPages.PackageDetails],
  ['packages-services', AdminPages.PackagesAndServices],
  ['packages-services/:id', AdminPages.PackageDetails],
  ['payments-transactions', AdminPages.PaymentsAndTransactions],
  ['payments-transactions/:id', AdminPages.TransactionDetails],
  ['profile', AdminPages.Profile],
  ['settings', AdminPages.Settings],
  ['support', AdminPages.Support],
  ['suppliers', AdminPages.Suppliers],
  ['suppliers/new', AdminPages.NewSupplier],
  ['suppliers/:id', AdminPages.SupplierDetails],
  ['team', AdminPages.Team], // <-- ADDED: The new Team Directory route
];

const publicRoutes = [
  ['/', PublicPages.Home],
  ['/about', PublicPages.About],
  ['/contact', PublicPages.Contact],
  ['/destinations', PublicPages.Destinations],
  ['/destinations/:destinationId', PublicPages.DestinationDetails],
  ['/packages', PublicPages.Packages],
  ['/packages/:packageId', PublicPages.PackageDetails],
  ['/services', PublicPages.Services],
  ['/flights', PublicPages.Flights],
  ['/hotels', PublicPages.Hotels],
  ['/visa-assistance', PublicPages.VisaAssistance],
  ['/umrah-hajj', PublicPages.UmrahHajj],
  ['/excursions', PublicPages.Excursions],
  ['/transportation', PublicPages.Transportation],
  ['/travel-insurance', PublicPages.TravelInsurance],
  ['/custom-travel', PublicPages.CustomTravel],
  ['/blog', PublicPages.Blog],
  ['/blog/:slug', PublicPages.BlogDetails],
  ['/faqs', PublicPages.FAQs],
  ['/testimonials', PublicPages.Testimonials],
  ['/booking-request', PublicPages.BookingRequest],
  ['/custom-trip-inquiry', PublicPages.CustomTripInquiry],
  ['/terms', PublicPages.Terms],
  ['/privacy', PublicPages.Privacy],
  ['/cookies', PublicPages.Cookies],
];

const customerRoutes = [
  ['bookings', CustomerPages.Bookings],
  ['bookings/:bookingId', CustomerPages.BookingDetails],
  ['payments', CustomerPages.Payments],
  ['documents', CustomerPages.Documents],
  ['profile', CustomerPages.Profile],
  ['support', CustomerPages.Support],
  ['notifications', CustomerPages.Notifications],
  ['settings', CustomerPages.Settings],
];

const authRoutes = [
  ['admin-login', AuthPages.AdminLogin],
  ['admin-signup', AuthPages.AdminSignup],
  ['employee-login', AuthPages.EmployeeLogin],
  ['customer-login', AuthPages.CustomerLogin],
  ['register', AuthPages.Register],
  ['forgot-password', AuthPages.ForgotPassword],
  ['reset-password', AuthPages.ResetPassword],
];

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        {publicRoutes.map(([path, Page]) => (
          <Route key={path} path={path} element={<Page />} />
        ))}
      </Route>
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<ProtectedAdminPage path="" Component={AdminPages.Dashboard} />} />
        {adminRoutes.map(([path, Page]) => (
          <Route
            key={path}
            path={path}
            element={<ProtectedAdminPage path={path} Component={Page} />}
          />
        ))}
      </Route>
      <Route path="/portal" element={<CustomerLayout />}>
        <Route index element={<CustomerPages.Dashboard />} />
        {customerRoutes.map(([path, Page]) => (
          <Route key={path} path={path} element={<Page />} />
        ))}
      </Route>
      <Route path="/auth" element={<AuthLayout />}>
        {authRoutes.map(([path, Page]) => (
          <Route key={path} path={path} element={<Page />} />
        ))}
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
