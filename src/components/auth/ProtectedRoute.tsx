
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = () => {
  const { isAdmin, isLoading, session } = useAuth();
  
  // Show loading spinner while authentication is being checked
  if (isLoading) {
    console.log("Protected route: Still loading auth state");
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        <span>Loading authentication...</span>
      </div>
    );
  }

  // Log authentication details for debugging
  console.log("Protected route: Auth check completed", {
    hasSession: !!session,
    isAdmin,
    user: session?.user?.email
  });

  // After loading completes, verify both session and admin status
  if (!session || !isAdmin) {
    console.log('Protected route: User not authenticated or not admin, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // User is authenticated and is admin, render the protected content
  console.log('Protected route: User authenticated and is admin, rendering content');
  return <Outlet />;
};

export default ProtectedRoute;
