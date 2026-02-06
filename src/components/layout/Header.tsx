import React from 'react';
import { MenuIcon, ChevronDownIcon } from '@/src/assets/icons/Icons';
import { Button } from '../common/FormControls';
import { useCurrentUser } from '@/src/hooks/useCurrentUser';
import { NotificationMenu } from './NotificationMenu';

interface HeaderProps {
  toggleSidebar: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ toggleSidebar, onLogout }) => {
  const currentUser = useCurrentUser();

  console.log("current USer", currentUser)

  return (
    <header className="bg-white shadow-sm z-10">
      <div className="mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-end h-16">
        <div className="flex items-center space-x-2 sm:space-x-4">
          <NotificationMenu />

          {currentUser && (
            <div className="relative">
              <Button variant="ghost" className="flex items-center space-x-2">
                <img
                  src={'https://ui-avatars.com/api/?name=' + currentUser.firstName + ' ' + (currentUser.lastName || '')}
                  alt={currentUser.firstName + ' ' + (currentUser.lastName || '')}
                  className="h-9 w-9 rounded-full object-cover"
                />
                <div className="hidden sm:flex flex-col items-start">
                  <span className="text-sm font-medium text-slate-700">
                    {currentUser.firstName + ' ' + (currentUser.lastName || '')}
                  </span>
                </div>
                <ChevronDownIcon className="hidden sm:block h-4 w-4 text-slate-500" />
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
