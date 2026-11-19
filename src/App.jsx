import { AuthProvider, AppSettingsProvider } from './context/index.jsx';
import AppRoutes from './routes/AppRoutes.jsx';

import './i18n';
export default function App() {
  return (
    <AuthProvider>
      <AppSettingsProvider>
        <AppRoutes />
      </AppSettingsProvider>
    </AuthProvider>
  );
}
