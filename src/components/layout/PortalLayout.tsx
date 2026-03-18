import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { usePortal } from '../../contexts/PortalContext';

const NAV_ITEMS = [
  { label: 'ภาพรวม', path: '/portal/dashboard' },
  { label: 'ใบเสนอราคา', path: '/portal/quotations' },
  { label: 'สัญญา', path: '/portal/contracts' },
  { label: 'ใบเสร็จ', path: '/portal/receipts' },
];

export const PortalLayout: React.FC = () => {
  const { customer, logout } = usePortal();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              {/* Hamburger - mobile only */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="sm:hidden p-1.5 -ml-1.5 rounded-md text-slate-600 hover:bg-slate-100"
              >
                {isMobileMenuOpen ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                  </svg>
                )}
              </button>

              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">MG</span>
              </div>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-lg font-semibold text-slate-800 truncate">MrGreenPest Portal</h1>
                {customer && (
                  <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                    {customer.first_name} {customer.last_name}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => {
                logout();
                navigate('/portal');
              }}
              className="text-xs sm:text-sm text-slate-600 hover:text-slate-800 px-2 sm:px-3 py-1.5 rounded-md hover:bg-slate-100 transition-colors flex-shrink-0"
            >
              ออกจากระบบ
            </button>
          </div>
        </div>
      </header>

      {/* Desktop Navigation tabs */}
      <nav className="bg-white border-b border-slate-200 hidden sm:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto">
            {NAV_ITEMS.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    isActive
                      ? 'border-green-600 text-green-600'
                      : 'border-transparent text-slate-600 hover:text-slate-800 hover:border-slate-300'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Mobile dropdown menu */}
      {isMobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-20 sm:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="absolute left-0 right-0 bg-white border-b border-slate-200 shadow-lg z-20 sm:hidden">
            <div className="px-2 py-2">
              {NAV_ITEMS.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavigate(item.path)}
                    className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-green-50 text-green-700'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
};
