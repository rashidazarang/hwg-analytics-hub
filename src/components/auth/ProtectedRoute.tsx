
import React from 'react';
import { Outlet } from 'react-router-dom';

const ProtectedRoute = () => {
  // Simply render the outlet without any authentication checks
  console.log('Protected route: Authentication disabled, rendering content');
  return <Outlet />;
};

export default ProtectedRoute;
