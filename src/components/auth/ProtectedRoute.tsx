
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = () => {
  const { isAdmin, isLoading, session } = useAuth();

  console.log("ProtectedRoute - isLoading:", isLoading, "isAdmin:", isAdmin, "session exists:", !!session);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        <span>Loading authentication...</span>
      </div>
    );
  }

  // After loading is complete, check if user is authenticated and admin
  return isAdmin ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
