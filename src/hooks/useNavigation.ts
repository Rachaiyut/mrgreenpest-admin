import { useMemo } from 'react';
import { NavigationItem } from '@/src/types/nav';
import { useUserRole } from './useUserRole';
import { createNavigationItems } from '../router/index';

export const useNavigation = () => {
  const userRole = useUserRole();
  const navigationItems = useMemo(() => createNavigationItems(), []);

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

    return navigationItems.reduce<NavigationItem[]>((acc, item) => {
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

        if (visibleSubItems.length > 0) {
          acc.push({
            ...item,
            subItems: visibleSubItems,
          });
        }
      } else {
        acc.push(item);
      }

      return acc;
    }, []);
  }, [userRole, navigationItems]);

  return filteredNavigationItems;
};