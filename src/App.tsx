import { useState, useCallback } from 'react';
import type { FC } from 'react';

// Base
import { ILOCAL_STORAGE } from './libs/common/interface/entity/auth.interface';

// Router
import { AppRouter } from './libs/router/router';

// Service
import { Auth } from './libs/api/auth';

// Context
import { DataProvider } from './contexts/DataContext';

const App: FC = () => {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return !!localStorage.getItem(ILOCAL_STORAGE.USER_TOKEN);
    } catch { return false; }
  });

  const handleLogin = useCallback((username: string, remember: boolean) => {
    setIsAuthenticated(true);
    try {
      localStorage.setItem('isAuthenticated', 'true');
      if (!remember) {
        localStorage.removeItem('rememberMe');
        localStorage.removeItem('rememberedUsername');
      }
    } catch { }
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await Auth.logout();
    } catch {}
    
    setIsAuthenticated(false);
    try {
      localStorage.removeItem(ILOCAL_STORAGE.USER_TOKEN);
      localStorage.removeItem(ILOCAL_STORAGE.USER_PROFILE);
      localStorage.removeItem('isAuthenticated');
    } catch { }
  }, []);

  return (
    <DataProvider>
      <AppRouter
        isAuthenticated={isAuthenticated}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />
    </DataProvider>
  );
};

export default App;
