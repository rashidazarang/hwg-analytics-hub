
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = () => {
  const { isAdmin, isLoading, session } = useAuth();

  // Show loading spinner while authentication is being checked
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        <span>Loading authentication...</span>
      </div>
    );
  }

  // After loading completes, verify both session and admin status
  // Redirect to login if either condition fails
  if (!session || !isAdmin) {
    console.log('Protected route: Not authenticated or not admin, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // User is authenticated and is admin, render the protected content
  return <Outlet />;
};

export default ProtectedRoute;
