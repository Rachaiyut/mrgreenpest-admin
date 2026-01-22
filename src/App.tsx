import { useState, useCallback } from 'react';
import type { FC } from 'react';
import { ConfigProvider } from 'antd';

// Cnstant
import { STORAGE_KEYS } from './constants';

// Router
import { AppRouter } from '@/src/router/router';

// Service
import { Auth } from '@/src/api/auth';

// Context
import { DataProvider } from './contexts/DataContext';

const App: FC = () => {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return !!localStorage.getItem(STORAGE_KEYS.TOKEN);
    } catch {
      return false;
    }
  });

  const handleLogin = useCallback((username: string, remember: boolean) => {
    setIsAuthenticated(true);
    try {
      localStorage.setItem('isAuthenticated', 'true');
      if (!remember) {
        localStorage.removeItem('rememberMe');
        localStorage.removeItem('rememberedUsername');
      }
    } catch {}
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await Auth.logout();
    } catch {}

    setIsAuthenticated(false);
    try {
      localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
      localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
      localStorage.removeItem('isAuthenticated');
    } catch {}
  }, []);

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#08a93d',
          fontFamily: '"Noto Sans Thai", sans-serif',
        },
      }}
    >
      <DataProvider>
        <AppRouter
          isAuthenticated={isAuthenticated}
          onLogin={handleLogin}
          onLogout={handleLogout}
        />
      </DataProvider>
    </ConfigProvider>
  );
};

export default App;
