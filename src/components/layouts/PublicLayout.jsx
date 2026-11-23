import { Outlet } from 'react-router-dom';
import PublicFooter from '../navigation/PublicFooter.jsx';
import PublicNavbar from '../navigation/PublicNavbar.jsx';
import CookieConsentBanner from '../shared/CookieConsentBanner.jsx';

export default function PublicLayout() {
  return (
    <>
      <PublicNavbar />
      <Outlet />
      <PublicFooter />
      <CookieConsentBanner />
    </>
  );
}
