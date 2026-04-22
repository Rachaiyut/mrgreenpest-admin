import React from 'react';
import { MenuIcon } from '@/src/assets/icons/Icons';
import { Button } from '../common/FormControls';
import { useCurrentUser } from '@/src/hooks/useCurrentUser';
import { NotificationMenu } from './NotificationMenu';

interface HeaderProps {
  toggleSidebar: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ toggleSidebar, onLogout }) => {
  const currentUser = useCurrentUser();

  return (
    <header className="bg-white shadow-sm z-50 sticky top-0">
      <div className="mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14 sm:h-16">
        {/* Hamburger - mobile only */}
        <button
          onClick={toggleSidebar}
          className="md:hidden p-2 -ml-2 rounded-md text-slate-600 hover:bg-slate-100"
        >
          <MenuIcon className="h-5 w-5" />
        </button>
        <div className="flex items-center space-x-2 sm:space-x-4 ml-auto">
          <NotificationMenu />

          {currentUser && (
            <div className="relative">
              <Button variant="ghost" className="flex items-center space-x-2">
                <img
                  src={
                    currentUser.url ||
                    'https://ui-avatars.com/api/?name=' +
                    currentUser.firstName +
                    ' ' +
                    (currentUser.lastName || '')
                  }
                  alt={
                    currentUser.firstName + ' ' + (currentUser.lastName || '')
                  }
                  className="h-9 w-9 rounded-full object-cover"
                />
                <div className="hidden sm:flex flex-col items-start">
                  <span className="text-sm font-medium text-slate-700">
                    {currentUser.firstName + ' ' + (currentUser.lastName || '')}
                  </span>
                </div>
              </Button>
              {/* Dropdown menu can be added here */}
            </div>
          )}

          {onLogout && (
            <Button
              variant="outline"
              onClick={onLogout}
              className="ml-2 px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium border border-slate-300"
            >
              ออกจากระบบ
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
