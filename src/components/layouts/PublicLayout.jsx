import { Outlet } from 'react-router-dom';
import PublicFooter from '../navigation/PublicFooter.jsx';
import PublicNavbar from '../navigation/PublicNavbar.jsx';

export default function PublicLayout() {
  return (
    <>
      <PublicNavbar />
      <Outlet />
      <PublicFooter />
    </>
  );
}