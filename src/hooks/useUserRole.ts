import { useState, useEffect } from 'react';
import { Role } from '../libs/common/enum/role.enum';
import { ILOCAL_STORAGE } from '../libs/common/interface/entity/auth.interface';

export const useUserRole = () => {
  const [userRole, setUserRole] = useState<Role | null>(() => {
    try {
      const userProfileStr = localStorage.getItem(ILOCAL_STORAGE.USER_PROFILE);
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
