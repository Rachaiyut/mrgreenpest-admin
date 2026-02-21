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

// Components
import { Sidebar } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';

// Context
import { useData } from '../contexts/DataContext';

// Lazy Imports for Login only (since it's outside the main routes)
const Login = lazy(() => import('../pages/login/Login'));

import ProtectedRoute from './ProtectedRoute';

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
  }, [location.pathname, PATH_PAGE]);

  const handleNavigation = useCallback(
    (page: Page) => {
      navigate('/' + pagePaths[page]);
    },
    [navigate, pagePaths]
  );

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);

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
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        currentPage={currentPage}
        isOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
        onPageChange={handleNavigation}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header toggleSidebar={toggleSidebar} onLogout={onLogout} />
        <main className="flex-1 overflow-auto">
          <Suspense fallback={<div>Loading...</div>}>
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
        </main>
      </div>
    </div>
  );
};