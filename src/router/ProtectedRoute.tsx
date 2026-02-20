import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  access?: string;
}

const ProtectedRoute = ({ children, access }: ProtectedRouteProps) => {
  const permissionsRaw = localStorage.getItem('permissions');
  const permissions = permissionsRaw && permissionsRaw !== 'undefined' ? JSON.parse(permissionsRaw) : [];

  if (!access) {
    // If no access prop is provided, allow access
    return children;
  }

  if (permissions.includes(access)) {
    return children;
  } else {
    return <Navigate to="/dashboard" replace />;
  }
};

export default ProtectedRoute;
