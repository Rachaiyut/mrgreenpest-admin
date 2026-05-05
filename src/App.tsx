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

      function onPermissionsUpdated(payload: { permissions?: string[] }) {
        const next = Array.isArray(payload?.permissions) ? payload.permissions : [];
        localStorage.setItem('permissions', JSON.stringify(next));
        window.dispatchEvent(new Event('permissions-updated'));
      }

      socket.on('connect', onConnect);
      socket.on('disconnect', onDisconnect);
      socket.on('permissions:updated', onPermissionsUpdated);

      return () => {
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
        socket.off('permissions:updated', onPermissionsUpdated);
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
          fontSize: 16,           /* ข้อความทั่วไป: 16px */
          fontSizeHeading1: 28,   /* หัวข้อหลัก: 28px */
          fontSizeHeading2: 22,   /* หัวข้อรอง: 22px */
          fontSizeHeading3: 18,   /* หัวข้อย่อย: 18px */
          fontSizeLG: 18,         /* Large text: 18px */
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
