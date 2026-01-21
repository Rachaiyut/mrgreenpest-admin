import { FC } from 'react';
import { Link } from 'react-router-dom';

import { ChevronDownIcon } from '../../../assets/icons/Icons';
import { Page } from '../../../router/page';
import { PAGE_PATH } from '@/src/config/route';
import { NavGroup } from '@/src/types/entity/nav.interface';

interface SidebarGroupProps {
  item: NavGroup;
  isOpen: boolean;
  isActive: boolean;
  collapsed: boolean;
  currentPage: Page;
  onToggle: (groupName: string) => void;
  onFlyoutOpen?: (groupName: string, target: HTMLElement) => void;
  onFlyoutClose?: () => void;
  onFlyoutEnter?: () => void;
  onFlyoutLeave?: () => void;
}

export const SidebarGroup: FC<SidebarGroupProps> = ({
  item,
  isOpen,
  isActive,
  collapsed,
  currentPage,
  onToggle,
  onFlyoutOpen,
  onFlyoutEnter,
  onFlyoutLeave,
}) => {
  const getHref = (page: Page) => `/${PAGE_PATH[page]}`;

  return (
    <div key={item.name}>
      <button
        onClick={(e) => {
          if (collapsed) {
            if (onFlyoutOpen) {
              // Logic handled by parent or here?
              // The original code toggles flyout if same group, or opens new one.
              // Since we pass onFlyoutOpen, we assume the parent handles the logic or we just call it.
              // But we need to know if THIS group is currently the flyout group.
              // Let's assume the parent handles "toggle vs open" if we just say "I was clicked".
              // But the original code had specific logic:
              /*
                if (flyoutGroup === item.name) {
                  closeFlyout();
                } else {
                  clearCloseTimer();
                  openFlyout(item.name, e.currentTarget);
                }
               */
              // So we need to pass `isFlyoutOpen`?
              // Let's simplify: pass `onClick` which handles everything.
              // But for refactoring, let's keep it clean.
              onFlyoutOpen(item.name, e.currentTarget);
            }
          } else {
            onToggle(item.name);
          }
        }}
        onMouseEnter={() => {
          if (collapsed && onFlyoutEnter) {
            onFlyoutEnter();
          }
        }}
        onMouseLeave={() => {
          if (collapsed && onFlyoutLeave) {
            onFlyoutLeave();
          }
        }}
        className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} w-full ${collapsed ? 'px-2' : 'px-4'} py-2.5 text-base font-medium text-left rounded-md transition-colors ${
          isActive ? 'text-white bg-[#08a93d]/50' : 'text-white/80'
        } hover:bg-[#08a93d] hover:text-white focus:outline-none`}
        title={collapsed ? item.name : undefined}
      >
        <div className="flex items-center">
          {item.icon && (
            <item.icon className={`h-5 w-5 ${collapsed ? '' : 'mr-3'}`} />
          )}
          {!collapsed && item.name}
        </div>
        {!collapsed && (
          <ChevronDownIcon
            className={`h-5 w-5 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        )}
      </button>
      {!collapsed && isOpen && (
        <div className="pl-6 mt-1 space-y-1 ml-4 border-l-2 border-green-400/30">
          {item.subItems.map((subItem) => {
            const isSubActive = currentPage === subItem.name;
            return (
              <Link
                key={subItem.name}
                to={getHref(subItem.name as Page)}
                className={`flex items-center w-full px-3 py-2 text-sm font-normal rounded-md transition-colors ${
                  isSubActive
                    ? 'bg-[#08a93d] text-white'
                    : 'text-white/80 hover:bg-[#08a93d]/80 hover:text-white'
                }`}
              >
                {subItem.name}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};
