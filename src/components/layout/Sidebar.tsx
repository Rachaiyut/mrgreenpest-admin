import { FC, useState, useEffect, useCallback } from 'react';
import { Page } from '../../types/page';
import { XIcon, MenuIcon } from '../../assets/icons/Icons';
import { useNavigation } from '../../hooks/useNavigation';
import { useFlyout } from '../../hooks/useFlyout';
import { SidebarLink } from './sidebar/SidebarLink';
import { SidebarGroup } from './sidebar/SidebarGroup';
import { SidebarFlyout } from './sidebar/SidebarFlyout';

interface SidebarProps {
  currentPage: Page;
  isOpen: boolean;
  toggleSidebar: () => void;
  onPageChange: (page: Page) => void;
}

export const Sidebar: FC<SidebarProps> = ({
  currentPage,
  isOpen,
  toggleSidebar,
  onPageChange,
}) => {
  const filteredNavigationItems = useNavigation();
  const collapsed = !isOpen;

  const getActiveGroup = useCallback(() => {
    const activeGroup = filteredNavigationItems.find(
      (item) =>
        item.type === 'group' &&
        item.subItems.some((sub) => sub.name === currentPage)
    );
    return activeGroup ? (activeGroup as any).name : '';
  }, [currentPage, filteredNavigationItems]);

  const [openGroups, setOpenGroups] = useState<string[]>(() => {
    const active = getActiveGroup();
    return active ? [active] : [];
  });

  useEffect(() => {
    const activeGroup = getActiveGroup();
    setOpenGroups((prev) => {
      const newGroups = activeGroup ? [activeGroup] : [];
      if (prev.length === newGroups.length && prev[0] === newGroups[0]) {
        return prev;
      }
      return newGroups;
    });
  }, [currentPage, getActiveGroup]);

  const toggleGroup = (groupName: string) => {
    setOpenGroups((prev) => (prev.includes(groupName) ? [] : [groupName]));
  };

  const {
    flyoutGroup,
    flyoutPos,
    anchorEl,
    openFlyout,
    closeFlyout,
    startCloseTimer,
    clearCloseTimer,
  } = useFlyout(collapsed);

  const closeMobileSidebar = () => {
    if (window.innerWidth < 768) {
      toggleSidebar();
    }
  };

  return (
    <>
      {/* Overlay for mobile */}
      <div
        className={`fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-20 md:hidden transition-opacity duration-300 ease-in-out ${
          isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
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
          {filteredNavigationItems.map((item) => {
            if (item.type === 'group') {
              const isGroupActive = item.subItems.some(
                (sub) => sub.name === currentPage
              );
              return (
                <SidebarGroup
                  key={item.name}
                  item={item}
                  isOpen={openGroups.includes(item.name)}
                  isActive={isGroupActive}
                  collapsed={collapsed}
                  currentPage={currentPage}
                  onToggle={toggleGroup}
                  onFlyoutOpen={(groupName, target) => {
                    if (flyoutGroup === groupName) {
                      closeFlyout();
                    } else {
                      clearCloseTimer();
                      openFlyout(groupName, target);
                    }
                  }}
                  onFlyoutEnter={clearCloseTimer}
                  onFlyoutLeave={() => {
                    if (flyoutGroup) startCloseTimer();
                  }}
                  onLinkClick={closeMobileSidebar}
                />
              );
            }
            return (
              <SidebarLink
                key={item.name}
                item={item}
                isActive={currentPage === item.name}
                collapsed={collapsed}
                onClick={closeMobileSidebar}
              />
            );
          })}
        </nav>
      </aside>

      {collapsed && flyoutGroup && (
        <SidebarFlyout
          groupName={flyoutGroup}
          items={filteredNavigationItems}
          position={flyoutPos}
          currentPage={currentPage}
          onClose={closeFlyout}
          onEnter={clearCloseTimer}
          onLeave={startCloseTimer}
          anchorEl={anchorEl}
        />
      )}
    </>
  );
};
