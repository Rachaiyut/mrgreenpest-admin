import { FC } from 'react';
import { Link } from 'react-router-dom';

import { NavLink } from '@/src/types/entity/nav.interface';
import { PAGE_PATH } from '@/src/constants/route';
import { Page } from '@/src/router/page';

interface SidebarLinkProps {
  item: NavLink;
  isActive: boolean;
  collapsed: boolean;
}

export const SidebarLink: FC<SidebarLinkProps> = ({
  item,
  isActive,
  collapsed,
}) => {
  const displayName = item.name === 'Dashboard' ? 'แดชบอร์ด' : item.name;

  return (
    <Link
      to={`/${PAGE_PATH[item.name as Page]}`}
      className={`flex items-center ${collapsed ? 'justify-center px-2' : 'px-4'} py-2.5 text-base font-medium rounded-md transition-colors ${
        isActive
          ? 'bg-[#08a93d] text-white'
          : 'text-white/80 hover:bg-[#08a93d] hover:text-white'
      }`}
      title={collapsed ? displayName : undefined}
    >
      {item.icon && (
        <item.icon className={`h-5 w-5 ${collapsed ? '' : 'mr-3'}`} />
      )}
      {!collapsed && displayName}
    </Link>
  );
};

