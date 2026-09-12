import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import './index.css';

function AppContent() {
  const { isAuthenticated } = useAuth();
  const [authDone, setAuthDone] = useState(false);

  if (!isAuthenticated && !authDone) {
    return <AuthPage onAuth={() => setAuthDone(true)} />;
  }

  // Redirect to login if no auth on refresh
  if (!isAuthenticated) {
    return <AuthPage onAuth={() => setAuthDone(true)} />;
  }

  return <DashboardPage />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
