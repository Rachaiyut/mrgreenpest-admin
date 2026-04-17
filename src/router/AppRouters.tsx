import {
  useState,
  useCallback,
  useEffect,
  Suspense,
  useMemo,
  lazy,
} from 'react';
import { useNavigate, useLocation, Routes, Route } from 'react-router-dom';

// Config
import { createRoutes, PAGE_PATH, createNavigationItems } from './index';
import { getCurrentPageFromPath } from '../utils/route';
import { Page } from '../types/page';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { LoadingIcon } from '../assets/icons/Icons';

// Components
import { Sidebar } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';

// Context
import { useData } from '../contexts/DataContext';
import { PortalProvider } from '../contexts/PortalContext';

// Lazy Imports for Login only (since it's outside the main routes)
const Login = lazy(() => import('../pages/login/Login'));

// Portal Lazy Imports
const PortalLogin = lazy(() => import('../pages/portal/PortalLogin'));
const PortalSignQuotation = lazy(() => import('../pages/portal/PortalSignQuotation'));
const PortalDashboard = lazy(() => import('../pages/portal/PortalDashboard'));
const PortalQuotations = lazy(() => import('../pages/portal/PortalQuotations'));
const PortalContracts = lazy(() => import('../pages/portal/PortalContracts'));
const PortalReceipts = lazy(() => import('../pages/portal/PortalReceipts'));
const PortalServiceReports = lazy(() => import('../pages/portal/PortalServiceReports'));
const PortalLiff = lazy(() => import('../pages/portal/PortalLiff'));
const PortalLayoutLazy = lazy(() => import('../components/layout/PortalLayout').then(m => ({ default: m.PortalLayout })));

import ProtectedRoute from './ProtectedRoute';
import { PortalRoute } from './PortalRoute';

interface AppRouterProps {
  isAuthenticated: boolean;
  onLogin: (username: string, remember: boolean) => void;
  onLogout: () => void;
}

export const AppRouter = (props: AppRouterProps) => {
  const { isAuthenticated, onLogin, onLogout } = props;

  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const data = useData();
  const pagePaths = PAGE_PATH;

  const PATH_PAGE = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(pagePaths).map(([k, v]) => ['/' + v, k])
      ) as Record<string, Page>,
    [pagePaths]
  );

  const [currentPage, setCurrentPage] = useState<Page>(() =>
    getCurrentPageFromPath(location.pathname, PATH_PAGE)
  );

  const routes = useMemo(() => createRoutes(data), [data]);

  useEffect(() => {
    setCurrentPage(getCurrentPageFromPath(location.pathname, PATH_PAGE));
    // Auto-close sidebar on mobile when navigating
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname, PATH_PAGE]);

  // Auto-collapse sidebar on small screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNavigation = useCallback(
    (page: Page) => {
      navigate('/' + pagePaths[page]);
      // Close sidebar on mobile after navigation
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      }
    },
    [navigate, pagePaths]
  );

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  // Portal routes - accessible without admin authentication
  if (location.pathname.startsWith('/portal')) {
    return (
      <PortalProvider>
        <Suspense fallback={<div>Loading...</div>}>
          <Routes>
            <Route path="/portal" element={<PortalLogin />} />
            <Route path="/portal/liff" element={<PortalLiff />} />
            <Route path="/portal/sign" element={<PortalSignQuotation />} />
            <Route path="/portal" element={<PortalRoute><PortalLayoutLazy /></PortalRoute>}>
              <Route path="dashboard" element={<PortalDashboard />} />
              <Route path="quotations" element={<PortalQuotations />} />
              <Route path="contracts" element={<PortalContracts />} />
              <Route path="receipts" element={<PortalReceipts />} />
              <Route path="service-reports" element={<PortalServiceReports />} />
            </Route>
          </Routes>
        </Suspense>
      </PortalProvider>
    );
  }

  if (!isAuthenticated) {
    return (
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/login" element={<Login onLogin={onLogin} />} />
          <Route path="*" element={<Login onLogin={onLogin} />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar
        currentPage={currentPage}
        isOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
        onPageChange={handleNavigation}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header toggleSidebar={toggleSidebar} onLogout={onLogout} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto flex flex-col">
          <ErrorBoundary>
            <Suspense fallback={
              <div className="flex-1 flex flex-col items-center justify-center">
                <LoadingIcon className="w-10 h-10 animate-spin text-primary mb-3" />
                <p className="text-sm text-slate-400">กำลังโหลด...</p>
              </div>
            }>
              <Routes>
                {routes.map((route, index) => (
                  <Route
                    key={index}
                    path={route.path}
                    element={
                      <ProtectedRoute access={route.access}>
                        {route.element}
                      </ProtectedRoute>
                    }
                  />
                ))}
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};
