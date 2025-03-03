
import React from 'react';
import { Outlet } from 'react-router-dom';

const ProtectedRoute = () => {
  // Removed all authentication checks - just render the content
  return <Outlet />;
};

export default ProtectedRoute;
