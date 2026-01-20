import { useMemo } from 'react';
import { NAVIGATION_ITEMS } from '../libs/common/constant/navigate';
import { NavigationItem } from '../libs/common/type/nav';
import { useUserRole } from './useUserRole';

export const useNavigation = () => {
  const userRole = useUserRole();

  const filteredNavigationItems = useMemo(() => {
    if (!userRole) return [];

    return NAVIGATION_ITEMS.reduce<NavigationItem[]>((acc, item) => {
      if (item.roles && !item.roles.includes(userRole)) {
        return acc;
      }

      if (item.type === 'group') {
        const visibleSubItems = item.subItems.filter(
          (sub) => !sub.roles || sub.roles.includes(userRole)
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
