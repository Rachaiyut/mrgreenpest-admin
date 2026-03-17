import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { portalApi, PORTAL_STORAGE_KEYS } from '../api/customer-portal';

interface PortalCustomer {
  id: string;
  code: string;
  first_name: string;
  last_name: string;
  type: string;
}

interface PortalContextType {
  isAuthenticated: boolean;
  customer: PortalCustomer | null;
  loading: boolean;
  login: (token: string) => Promise<boolean>;
  logout: () => void;
}

const PortalContext = createContext<PortalContextType | null>(null);

export const PortalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customer, setCustomer] = useState<PortalCustomer | null>(() => {
    const stored = localStorage.getItem(PORTAL_STORAGE_KEYS.CUSTOMER);
    return stored ? JSON.parse(stored) : null;
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem(PORTAL_STORAGE_KEYS.TOKEN);
  });
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (token: string): Promise<boolean> => {
    setLoading(true);
    try {
      const response = await portalApi.verifyToken(token);
      const { access_token, customer: customerData } = response.data;

      localStorage.setItem(PORTAL_STORAGE_KEYS.TOKEN, access_token);
      localStorage.setItem(PORTAL_STORAGE_KEYS.CUSTOMER, JSON.stringify(customerData));

      setCustomer(customerData);
      setIsAuthenticated(true);
      return true;
    } catch (error) {
      console.error('Portal login failed:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(PORTAL_STORAGE_KEYS.TOKEN);
    localStorage.removeItem(PORTAL_STORAGE_KEYS.CUSTOMER);
    setCustomer(null);
    setIsAuthenticated(false);
  }, []);

  return (
    <PortalContext.Provider value={{ isAuthenticated, customer, loading, login, logout }}>
      {children}
    </PortalContext.Provider>
  );
};

export const usePortal = () => {
  const context = useContext(PortalContext);
  if (!context) {
    throw new Error('usePortal must be used within a PortalProvider');
  }
  return context;
};
