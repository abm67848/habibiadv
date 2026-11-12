import { Route, Routes } from 'react-router-dom';
import AdminLayout from '../components/layouts/AdminLayout.jsx';
import AuthLayout from '../components/layouts/AuthLayout.jsx';
import CustomerLayout from '../components/layouts/CustomerLayout.jsx';
import PublicLayout from '../components/layouts/PublicLayout.jsx';
import NotFound from '../components/shared/NotFound.jsx';
import * as AdminPages from '../pages/admin/index.jsx';
import * as AuthPages from '../pages/auth/index.jsx';
import * as CustomerPages from '../pages/customer/index.jsx';
import * as PublicPages from '../pages/public/index.jsx';

const adminRoutes = [
  ['analytics', AdminPages.Analytics],
  ['bookings', AdminPages.Bookings],
  ['customers', AdminPages.Customers],
  ['customers/:customerId', AdminPages.CustomerDetails],
  ['expenses', AdminPages.Expenses],
  ['finance', AdminPages.Finance],
  ['packages', AdminPages.PackagesAndServices],
  ['packages/:id', AdminPages.PackageDetails],
  ['packages-services', AdminPages.PackagesAndServices],
  ['packages-services/:id', AdminPages.PackageDetails],
  ['payments-transactions', AdminPages.PaymentsAndTransactions],
  ['payments-transactions/:id', AdminPages.TransactionDetails],
  ['settings', AdminPages.Settings],
  ['suppliers', AdminPages.Suppliers],
  ['travel', AdminPages.Travel],
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
        <Route index element={<AdminPages.Dashboard />} />
        {adminRoutes.map(([path, Page]) => (
          <Route key={path} path={path} element={<Page />} />
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