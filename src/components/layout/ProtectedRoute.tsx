import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import type { UserRole } from '../../types/user';

export function ProtectedRoute({
  children,
  requiredRole,
}: {
  children: React.ReactNode;
  requiredRole?: UserRole;
}) {
  const { firebaseUser, userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600">
        Đang tải dữ liệu phiên làm việc...
      </div>
    );
  }

  if (!firebaseUser || !userProfile) {
    return <Navigate to="/auth" replace />;
  }

  if (requiredRole && userProfile.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
