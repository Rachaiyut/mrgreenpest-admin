import { useState } from 'react';
import { STORAGE_KEYS } from '../constants';
import { Role } from '../types/enums/role';

export const useUserRole = () => {
  const [userRole] = useState<Role | null>(() => {
    try {
      const userProfileStr = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      if (userProfileStr) {
        const userProfile = JSON.parse(userProfileStr);
        return userProfile.role as Role;
      }
    } catch (error) {
      console.error('Error parsing user profile:', error);
    }
    return null;
  });

  return userRole;
};
