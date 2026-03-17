import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePortal } from '../contexts/PortalContext';

interface PortalRouteProps {
  children: React.ReactNode;
}

export const PortalRoute: React.FC<PortalRouteProps> = ({ children }) => {
  const { isAuthenticated } = usePortal();

  if (!isAuthenticated) {
    return <Navigate to="/portal" replace />;
  }

  return <>{children}</>;
};
