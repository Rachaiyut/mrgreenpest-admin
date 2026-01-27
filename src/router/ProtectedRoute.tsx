import React from 'react';
import { Navigate } from 'react-router-dom';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { Role } from '../types/enums/role';

interface ProtectedRouteProps {
  allowedRoles?: Role[];
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles,
  children,
}) => {
  const currentUser = useCurrentUser();

  if (!currentUser) {
    return <Navigate to="/" replace />;
  }

  if (!allowedRoles || allowedRoles.length === 0) {
    return <>{children}</>;
  }

  const userRole = currentUser.role as Role;

  if (!allowedRoles.includes(userRole)) {

    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
