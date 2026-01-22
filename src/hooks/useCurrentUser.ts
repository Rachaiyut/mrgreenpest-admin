import { useState, useEffect } from 'react';

// Cnstant
import { STORAGE_KEYS } from '../constants';

// Entity
import { AuthUser } from '../types/entity/auth.interface';

export const useCurrentUser = () => {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    if (userStr) {
      try {
        const parsedUser = JSON.parse(userStr);
        setUser(parsedUser);
      } catch (e) {
        console.error('Failed to parse user profile', e);
      }
    }
  }, []);

  return user;
};

