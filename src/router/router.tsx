import {
  useState,
  useCallback,
  useEffect,
  Suspense,
  useMemo,
  lazy,
} from 'react';
import {
  useNavigate,
  useLocation,
  Routes,
  Route,
} from 'react-router-dom';

// Config
import { PAGE_PATH } from '../config/route';
import { getCurrentPageFromPath } from './utils';
import { getRoutes } from './routes';

// Components
import { Sidebar } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';

// Types
import { Page } from './page';

// Context
import { useData } from '../contexts/DataContext';

// Lazy Imports for Login only (since it's outside the main routes)
const Login = lazy(() => import('../pages/login/Login'));

interface AppRouterProps {
  isAuthenticated: boolean;
  onLogin: (username: string, remember: boolean) => void;
  onLogout: () => void;
}

export const AppRouter = (props: AppRouterProps) => {
  const { isAuthenticated, onLogin, onLogout } = props;

  const navigate = useNavigate();
  const location = useLocation();

  const data = useData();

  const PATH_PAGE = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(PAGE_PATH).map(([k, v]) => ['/' + v, k])
      ) as Record<string, Page>,
    []
  );

  const currentPage: Page = useMemo(() => {
    return getCurrentPageFromPath(location.pathname, PATH_PAGE);
  }, [location.pathname, PATH_PAGE]);

  const [isSidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('sidebarExpanded');
    if (stored !== null) {
      setSidebarOpen(stored === 'true');
    }
  }, []);

  const toggleSidebarState = useCallback(() => {
    setSidebarOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sidebarExpanded', String(next));
      } catch {}
      return next;
    });
  }, []);

  if (!isAuthenticated)
    return (
      <Suspense
        fallback={
          <div className="p-8">
            <p className="text-slate-600">กำลังโหลด...</p>
          </div>
        }
      >
        <Login onLogin={onLogin} />
      </Suspense>
    );

  const routes = getRoutes(data);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100">
      <Sidebar
        currentPage={currentPage}
        onPageChange={(page) => navigate('/' + PAGE_PATH[page])}
        isOpen={isSidebarOpen}
        toggleSidebar={toggleSidebarState}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header toggleSidebar={toggleSidebarState} onLogout={onLogout} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Suspense
              fallback={
                <div className="p-8">
                  <p className="text-slate-600">กำลังโหลด...</p>
                </div>
              }
            >
              <Routes>
                {routes.map((route, index) => (
                  <Route
                    key={route.path + index}
                    path={route.path}
                    element={route.element}
                  />
                ))}
              </Routes>
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
};
