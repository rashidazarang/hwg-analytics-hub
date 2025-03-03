
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = () => {
  const { isAdmin, isLoading, session } = useAuth();

  // If still loading, show loading spinner
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        <span>Loading authentication...</span>
      </div>
    );
  }

  // After loading is complete, check if user is authenticated and admin
  // If not authenticated or not admin, redirect to login
  return session && isAdmin ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
