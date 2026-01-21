import { useState, useEffect } from 'react';
import { IAuthUser, ILOCAL_STORAGE } from '@/src/types/entity/auth.interface';

export const useCurrentUser = () => {
  const [user, setUser] = useState<IAuthUser | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem(ILOCAL_STORAGE.USER_PROFILE);
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
