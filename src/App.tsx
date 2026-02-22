import { useState, useCallback, useEffect } from 'react';
import type { FC } from 'react';
import { ConfigProvider } from 'antd';

// Cnstant
import { STORAGE_KEYS } from './constants';

// Router
import { AppRouter } from '@/src/router/AppRouters';

// Service
import { Auth } from '@/src/api/auth';

import { socket } from './config/socket';

// Context
import { DataProvider } from './contexts/DataContext';

const App: FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return !!localStorage.getItem(STORAGE_KEYS.TOKEN);
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (isAuthenticated) {
      const token = localStorage.getItem('access_token');
      socket.auth = { token: `Bearer ${token}` };
      socket.connect();
      console.log('Socket connecting...');

      function onConnect() {
        console.log('Socket connected!');
      }

      function onDisconnect() {
        console.log('Socket disconnected!');
      }

      socket.on('connect', onConnect);
      socket.on('disconnect', onDisconnect);

      return () => {
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
        socket.disconnect();
      };
    } else {
      socket.disconnect();
    }
  }, [isAuthenticated]);

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
      localStorage.removeItem('user_info');
      localStorage.removeItem('permissions');
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
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
