import { Outlet } from 'react-router-dom';
import AdminSidebar from '../navigation/AdminSidebar.jsx';
import AdminTopbar from '../navigation/AdminTopbar.jsx';

export default function AdminLayout() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50">
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminTopbar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
