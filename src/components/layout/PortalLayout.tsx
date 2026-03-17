import React from 'react';
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">MG</span>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-800">MrGreenPest Portal</h1>
                {customer && (
                  <p className="text-xs text-slate-500">
                    {customer.first_name} {customer.last_name} ({customer.code})
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => {
                logout();
                navigate('/portal');
              }}
              className="text-sm text-slate-600 hover:text-slate-800 px-3 py-1.5 rounded-md hover:bg-slate-100 transition-colors"
            >
              ออกจากระบบ
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200">
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
};
