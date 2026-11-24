import { AuthProvider, AppSettingsProvider } from './context/index.jsx';
import { ConfirmationModalProvider } from './components/shared/ConfirmationModal.jsx';
import AppRoutes from './routes/AppRoutes.jsx';

import './i18n';
export default function App() {
  return (
    <AuthProvider>
      <AppSettingsProvider>
        <ConfirmationModalProvider>
          <AppRoutes />
        </ConfirmationModalProvider>
      </AppSettingsProvider>
    </AuthProvider>
  );
}
