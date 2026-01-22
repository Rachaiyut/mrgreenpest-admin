import { useState } from 'react';

// Constant
import { STORAGE_KEYS } from '../constants';

// Enum
import { Role } from '../types/enums/role';

// Interface
export const useUserRole = () => {
  const [userRole, setUserRole] = useState<Role | null>(() => {
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

