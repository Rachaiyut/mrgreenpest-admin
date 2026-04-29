import { Navigate } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  access?: string;
}

const ProtectedRoute = ({ children, access }: ProtectedRouteProps) => {
  const { hasPermission } = usePermissions();

  if (!access) {
    return children;
  }

  if (hasPermission(access)) {
    return children;
  }

  return <Navigate to="/dashboard" replace />;
};

export default ProtectedRoute;
