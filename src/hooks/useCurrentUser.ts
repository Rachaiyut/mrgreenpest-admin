import { useState, useEffect, useCallback } from 'react';

// Cnstant
import { STORAGE_KEYS } from '../constants';

// Entity
import { AuthUser } from '../types/entity/auth.interface';

const getStoredUser = (): AuthUser | null => {
  try {
    const userStr = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    if (userStr) {
      return JSON.parse(userStr);
    }
  } catch (e) {
    console.error('Failed to parse user profile', e);
  }
  return null;
};

export const useCurrentUser = () => {
  // Use lazy initialization to read from localStorage immediately on first render
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());

  // Optional: listen for storage changes (e.g., login/logout in another tab)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.USER_PROFILE) {
        setUser(getStoredUser());
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const refresh = useCallback(() => {
    setUser(getStoredUser());
  }, []);

  return user;
};
