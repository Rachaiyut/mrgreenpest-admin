import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { FC } from 'react';
import { Link } from 'react-router-dom';

// Constant
import { NAVIGATION_ITEMS } from '../../libs/common/constant/navigate';
import { PAGE_PATH } from '../../libs/common/constant/route.';

import { Role } from '../../libs/common/enum/role.enum';
import { Page } from '@/src/libs/router/page';
import { NavigationItem } from '@/src/libs/common/interface/entity/nav.interface';

import {
  XIcon,
  ChevronDownIcon,
  PackageIcon,
  MenuIcon,
} from '../../assets/icons/Icons';
import { ILOCAL_STORAGE } from '@/src/libs/common/interface/entity/auth.interface';

interface SidebarProps {
  currentPage: Page;
  onPageChange: (page: Page) => void;
  isOpen: boolean;
  toggleSidebar: () => void;
}

export const Sidebar: FC<SidebarProps> = ({
  currentPage,
  onPageChange,
  isOpen,
  toggleSidebar,
}) => {
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
        // It's a link, and we passed the role check
        acc.push(item);
      }

      return acc;
    }, []);
  }, [userRole]);

  const getHref = (page: Page) => `/${PAGE_PATH[page]}`;
  const getActiveGroup = useCallback(() => {
    const activeGroup = filteredNavigationItems.find(
      (item) =>
        item.type === 'group' &&
        item.subItems.some((sub) => sub.name === currentPage)
    );
    return activeGroup ? (activeGroup as any).name : '';
  }, [currentPage, filteredNavigationItems]);

  const [openGroups, setOpenGroups] = useState<string[]>([getActiveGroup()]);

  const [flyoutGroup, setFlyoutGroup] = useState<string | null>(null);
  const [flyoutPos, setFlyoutPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const flyoutRef = useRef<HTMLDivElement | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [closeTimer, setCloseTimer] = useState<number | null>(null);

  // This effect ensures that when the page changes to an item within a group,
  // that group automatically opens, becoming the only open group. This provides
  // clear visual context for the user's location. It does not run on manual
  // toggling, because it only depends on `currentPage`.
  useEffect(() => {
    const activeGroup = getActiveGroup();
    // When the current page changes, automatically open its parent group
    // and close any others. If the page is not in a group, close all groups.
    setOpenGroups(activeGroup ? [activeGroup] : []);
  }, [currentPage, getActiveGroup]);

  // This function allows only one group to be open at a time.
  // Clicking an open group closes it. Clicking a closed group opens it and closes any other.
  const toggleGroup = (groupName: string) => {
    setOpenGroups((prev) =>
      // If the clicked group is already open, close it (by setting an empty array).
      // Otherwise, open it by setting it as the only item in the array.
      prev.includes(groupName) ? [] : [groupName]
    );
  };

  const collapsed = !isOpen; // Desktop: collapsed shows only icons; Mobile: sidebar hidden when not open

  const openFlyout = (groupName: string, target: HTMLElement) => {
    const rect = target.getBoundingClientRect();
    setFlyoutGroup(groupName);
    setAnchorEl(target);
    setFlyoutPos({ top: rect.top, left: rect.right + 8 });
  };

  const closeFlyout = () => {
    setFlyoutGroup(null);
    setAnchorEl(null);
  };

  const startCloseTimer = () => {
    const id = window.setTimeout(() => {
      closeFlyout();
    }, 200);
    setCloseTimer(id);
  };

  const clearCloseTimer = () => {
    if (closeTimer) {
      window.clearTimeout(closeTimer);
      setCloseTimer(null);
    }
  };

  useEffect(() => {
    if (!collapsed || !flyoutGroup || !anchorEl) return;
    const updatePosition = () => {
      const rect = anchorEl.getBoundingClientRect();
      let top = rect.top;
      let left = rect.right + 8;
      const menuWidth = flyoutRef.current ? flyoutRef.current.offsetWidth : 240;
      const menuHeight = flyoutRef.current ? flyoutRef.current.offsetHeight : 0;
      if (left + menuWidth > window.innerWidth - 8) {
        left = rect.left - menuWidth - 8;
      }
      if (top + menuHeight > window.innerHeight - 8) {
        top = Math.max(8, window.innerHeight - menuHeight - 8);
      }
      setFlyoutPos({ top, left });
    };
    updatePosition();
    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [collapsed, flyoutGroup, anchorEl]);

  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      if (!flyoutRef.current) return;
      if (flyoutRef.current.contains(e.target as Node)) return;
      if (anchorEl && anchorEl.contains(e.target as Node)) return;
      closeFlyout();
    };
    if (flyoutGroup) {
      document.addEventListener('mousedown', onDocMouseDown);
    }
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
    };
  }, [flyoutGroup, anchorEl]);

  const renderNavItem = (item: NavigationItem) => {
    if (item.type === 'group') {
      const isGroupOpen = openGroups.includes(item.name);
      const isGroupActive = item.subItems.some(
        (sub) => sub.name === currentPage
      );

      return (
        <div key={item.name}>
          <button
            onClick={(e) => {
              if (collapsed) {
                if (flyoutGroup === item.name) {
                  closeFlyout();
                } else {
                  clearCloseTimer();
                  openFlyout(item.name, e.currentTarget);
                }
              } else {
                toggleGroup(item.name);
              }
            }}
            onMouseEnter={() => {
              if (collapsed) {
                clearCloseTimer();
              }
            }}
            onMouseLeave={() => {
              if (collapsed && flyoutGroup) {
                startCloseTimer();
              }
            }}
            className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} w-full ${collapsed ? 'px-2' : 'px-4'} py-2.5 text-base font-medium text-left rounded-md transition-colors ${
              isGroupActive ? 'text-white bg-[#08a93d]/50' : 'text-white/80'
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
                className={`h-5 w-5 transform transition-transform ${isGroupOpen ? 'rotate-180' : ''}`}
              />
            )}
          </button>
          {!collapsed && isGroupOpen && (
            <div className="pl-6 mt-1 space-y-1 ml-4 border-l-2 border-green-400/30">
              {item.subItems.map((subItem) => {
                const isActive = currentPage === subItem.name;
                return (
                  <Link
                    key={subItem.name}
                    to={getHref(subItem.name as Page)}
                    className={`flex items-center w-full px-3 py-2 text-sm font-normal rounded-md transition-colors ${
                      isActive
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
    }

    const isActive = currentPage === item.name;
    const displayName = item.name === 'Dashboard' ? 'แดชบอร์ด' : item.name;
    return (
      <Link
        key={item.name}
        to={getHref(item.name as Page)}
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

  return (
    <>
      {/* Overlay for mobile */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden ${isOpen ? 'block' : 'hidden'}`}
        onClick={toggleSidebar}
      ></div>

      <aside
        className={`fixed md:relative top-0 left-0 h-full bg-[#0e6d2e] text-white transform ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} transition-all duration-300 ease-in-out z-30 flex flex-col ${isOpen ? 'w-[300px]' : 'w-[300px] md:w-20'}`}
      >
        <div
          className={`flex items-center justify-between h-16 ${collapsed ? 'px-2' : 'px-4'} border-b border-white/20`}
        >
          <div className="flex items-center">
            <div>
              {collapsed ? (
                <h1 className="text-base font-extrabold text-white tracking-wider leading-tight">
                  MG
                </h1>
              ) : (
                <>
                  <h1 className="text-lg font-extrabold text-white tracking-wider leading-tight">
                    MR. GREEN
                  </h1>
                  <p className="text-[10px] text-green-200 tracking-widest">
                    PEST CONTROL CO.,LTD
                  </p>
                </>
              )}
            </div>
          </div>
          <button
            onClick={toggleSidebar}
            className="text-slate-300 hover:text-white md:hidden"
          >
            <XIcon className="h-6 w-6" />
          </button>
          <button
            onClick={toggleSidebar}
            className="text-slate-300 hover:text-white hidden md:block"
          >
            <MenuIcon className="h-6 w-6" />
          </button>
        </div>

        <nav
          className={`flex-1 ${collapsed ? 'px-2' : 'px-4'} py-6 space-y-2 overflow-y-auto overflow-x-hidden`}
        >
          {filteredNavigationItems.map((item) => renderNavItem(item))}
        </nav>
      </aside>
      {collapsed && flyoutGroup && (
        <div
          ref={flyoutRef}
          style={{
            position: 'fixed',
            top: flyoutPos.top,
            left: flyoutPos.left,
          }}
          className="z-50 bg-white text-slate-800 shadow-xl rounded-md border border-slate-200 min-w-[220px]"
          onMouseEnter={clearCloseTimer}
          onMouseLeave={startCloseTimer}
        >
          <div className="py-2">
            {(() => {
              const group = filteredNavigationItems.find(
                (i) => i.type === 'group' && i.name === flyoutGroup
              );
              if (!group || !('subItems' in group)) return null;
              return (group as any).subItems.map((subItem: any) => {
                const isActive = currentPage === subItem.name;
                return (
                  <Link
                    key={subItem.name}
                    to={getHref(subItem.name as Page)}
                    onClick={() => {
                      closeFlyout();
                    }}
                    className={`flex items-center w-full px-4 py-2 text-sm ${isActive ? 'bg-slate-100 text-primary' : 'hover:bg-slate-50'}`}
                  >
                    <span className="truncate">{subItem.name}</span>
                  </Link>
                );
              });
            })()}
          </div>
        </div>
      )}
    </>
  );
};
