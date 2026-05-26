import React, { useState, FC } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { usePortal } from '../../contexts/PortalContext';
import { Button } from '../common/FormControls';
import {
  NewDashboardIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  DocumentCheckIcon,
  CheckCircleIcon,
} from '../../assets/icons/Icons';

const NAV_ITEMS: { label: string; path: string; icon: FC<any> }[] = [
  { label: 'ภาพรวม', path: '/portal/dashboard', icon: NewDashboardIcon },
  { label: 'ใบเสนอราคา', path: '/portal/quotations', icon: DocumentTextIcon },
  { label: 'สัญญา', path: '/portal/contracts', icon: ClipboardDocumentListIcon },
  { label: 'ใบเสร็จ', path: '/portal/receipts', icon: DocumentCheckIcon },
  { label: 'รายงานบริการ', path: '/portal/service-reports', icon: CheckCircleIcon },
];

export const PortalLayout: React.FC = () => {
  const { customer, logout } = usePortal();
  const navigate = useNavigate();
  const location = useLocation();
  // Default ปิด sidebar บน mobile (overlay บัง content), เปิดบน desktop (อยู่ข้างเนื้อหา)
  const [isOpen, setIsOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : false,
  );
  // Session มาจาก code-login (Rich Menu) → ซ่อน sidebar/menu, เหลือแค่ header + content
  const noMenu = typeof window !== 'undefined' && localStorage.getItem('portal_no_menu') === '1';

  if (noMenu) {
    const displayName = `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim();
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col">
        <header className="bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-b border-slate-200 sticky top-0 z-10">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 flex items-center justify-between h-14 sm:h-16 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-green-500 to-green-700 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                <span className="text-white font-extrabold text-sm sm:text-base">MG</span>
              </div>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-extrabold text-slate-800 leading-tight truncate">MR. GREEN</h1>
                <p className="hidden sm:block text-[10px] text-slate-500 tracking-wider">PEST CONTROL PORTAL</p>
                {displayName && (
                  <p className="sm:hidden text-[11px] text-slate-500 truncate" title={displayName}>{displayName}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {displayName && (
                <span className="hidden sm:inline-block text-sm font-medium text-slate-700 max-w-[200px] truncate" title={displayName}>
                  {displayName}
                </span>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  logout();
                  localStorage.removeItem('portal_no_menu');
                  setTimeout(() => navigate('/portal/login-by-code'), 0);
                }}
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold border border-slate-300 shadow-sm"
              >
                ออกจากระบบ
              </Button>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-20 md:hidden transition-opacity duration-300 ease-in-out ${
          isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
        onClick={() => setIsOpen(false)}
      />

      {/* Sidebar — copy จาก Sidebar.tsx ของ web หลัก */}
      <aside
        className={`fixed md:relative top-0 left-0 h-full bg-[#0e6d2e] text-white transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } transition-all duration-300 ease-in-out z-30 flex flex-col ${
          isOpen ? 'w-[300px]' : 'w-[300px] md:w-20'
        }`}
      >
        {/* Logo — เหมือน web หลัก */}
        <div className={`flex items-center justify-between h-16 ${!isOpen ? 'md:px-2' : 'px-4'} border-b border-white/20`}>
          <div className="flex items-center">
            <div>
              {!isOpen ? (
                <h1 className="hidden md:block text-base font-extrabold text-white tracking-wider leading-tight">MG</h1>
              ) : (
                <>
                  <h1 className="text-lg font-extrabold text-white tracking-wider leading-tight">MR. GREEN</h1>
                  <p className="text-xs text-green-200 tracking-widest">PEST CONTROL CO.,LTD</p>
                </>
              )}
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-slate-300 hover:text-white md:hidden">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
          <button onClick={() => setIsOpen(!isOpen)} className="text-slate-300 hover:text-white hidden md:block">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
        </div>

        {/* Navigation — เหมือน SidebarLink ของ web หลัก */}
        <nav className={`flex-1 ${!isOpen ? 'md:px-2' : 'px-4'} py-6 space-y-2 overflow-y-auto overflow-x-hidden`}>
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            const collapsed = !isOpen;
            return (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); if (window.innerWidth < 768) setIsOpen(false); }}
                className={`w-full flex items-center ${collapsed ? 'md:justify-center md:px-2' : 'px-4'} py-2.5 text-base font-medium rounded-md transition-colors ${
                  isActive
                    ? 'bg-[#08a93d] text-white'
                    : 'text-white/80 hover:bg-[#08a93d] hover:text-white'
                }`}
                title={collapsed ? item.label : undefined}
              >
                {item.icon && <item.icon className={`h-5 w-5 ${collapsed ? '' : 'mr-3'}`} />}
                {!collapsed && item.label}
              </button>
            );
          })}
        </nav>

        <div className="py-2" />
      </aside>

      {/* Main area — เหมือน web หลัก */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header — copy จาก Header.tsx ของ web หลัก */}
        <header className="bg-white shadow-sm z-10 sticky top-0">
          <div className="mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14 sm:h-16">
            <button
              onClick={() => setIsOpen(true)}
              className="md:hidden p-2 -ml-2 rounded-md text-slate-600 hover:bg-slate-100"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
            <div className="flex items-center space-x-2 sm:space-x-4 ml-auto">
              {customer && (
                <div className="relative">
                  <Button variant="ghost" className="flex items-center space-x-2">
                    <img
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(customer.first_name || '')}+${encodeURIComponent(customer.last_name || '')}`}
                      alt={customer.first_name}
                      className="h-9 w-9 rounded-full object-cover"
                    />
                    <div className="hidden sm:flex flex-col items-start">
                      <span className="text-sm font-medium text-slate-700">
                        {customer.first_name} {customer.last_name}
                      </span>
                    </div>
                    <svg className="hidden sm:block h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                  </Button>
                </div>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  logout();
                  localStorage.removeItem('portal_no_menu');
                  setTimeout(() => navigate('/portal'), 0);
                }}
                className="ml-2 px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium border border-slate-300"
              >
                ออกจากระบบ
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
