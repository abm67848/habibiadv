import { Link } from 'react-router-dom';

export default function CustomerSidebar() {
  return (
    <nav aria-label="Customer navigation">
      <Link to="/portal">Overview</Link>{' '}
      <Link to="/portal/bookings">Bookings</Link>{' '}
      <Link to="/portal/payments">Payments</Link>{' '}
      <Link to="/portal/documents">Documents</Link>{' '}
      <Link to="/portal/profile">Profile</Link>{' '}
      <Link to="/portal/support">Support</Link>
    </nav>
  );
}