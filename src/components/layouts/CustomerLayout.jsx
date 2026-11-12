import { Outlet } from 'react-router-dom';
import CustomerSidebar from '../navigation/CustomerSidebar.jsx';

export default function CustomerLayout() {
  return (
    <>
      <CustomerSidebar />
      <Outlet />
    </>
  );
}