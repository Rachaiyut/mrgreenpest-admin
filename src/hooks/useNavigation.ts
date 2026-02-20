import { useMemo } from 'react';
import { NavigationItem } from '@/src/types/nav';
import { useUserRole } from './useUserRole';
import { NAVIGATION_ITEMS } from '../constants';

export const useNavigation = () => {
  const userRole = useUserRole();

  const filteredNavigationItems = useMemo(() => {
    if (!userRole) return [];

    const permissionsRaw =
      typeof window !== 'undefined' ? localStorage.getItem('permissions') : null;
    const permissions: string[] =
      permissionsRaw && permissionsRaw !== 'undefined'
        ? (() => {
            try {
              return JSON.parse(permissionsRaw as string);
            } catch {
              return [];
            }
          })()
        : [];

    const hasPermission = (access?: string) => {
      if (!access) return true;
      if (!permissions || permissions.length === 0) return false;
      return permissions.includes(access);
    };

    return NAVIGATION_ITEMS.reduce<NavigationItem[]>((acc, item) => {
      // First, honor role-based restrictions if defined
      if (item.roles && !item.roles.includes(userRole)) {
        return acc;
      }

      // Then, enforce permission-based access if access is defined on the item
      if ('access' in item && !hasPermission(item.access)) {
        return acc;
      }

      if (item.type === 'group') {
        const visibleSubItems = item.subItems.filter(
          (sub) => {
            if (sub.roles && !sub.roles.includes(userRole)) {
              return false;
            }

            if (!hasPermission(sub.access)) {
              return false;
            }

            return true;
          }
        );

        if (visibleSubItems.length === 0) {
          return acc;
        }

        acc.push({
          ...item,
          subItems: visibleSubItems,
        });
      } else {
        acc.push(item);
      }

      return acc;
    }, []);
  }, [userRole]);

  return filteredNavigationItems;
};

