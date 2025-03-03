import React, { useEffect } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = () => {
  const { isAdmin, isLoading, session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    console.log("Protected route: Session state changed", {
      isLoading,
      hasSession: !!session,
      isAdmin,
      user: session?.user?.email
    });
    
    // If auth check is done and user is not authenticated or not admin, redirect to login
    if (!isLoading && (!session || !isAdmin)) {
      console.log("Protected route: Redirecting to login (not authenticated or not admin)");
      navigate('/login');
    }
  }, [isLoading, session, isAdmin, navigate]);

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
  if (!session) {
    console.log('Protected route: No session, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    console.log('Protected route: User is not admin, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // User is authenticated and is admin, render the protected content
  console.log('Protected route: User authenticated and is admin, rendering content');
  return <Outlet />;
};

export default ProtectedRoute;
