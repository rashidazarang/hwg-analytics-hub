
import React, { useEffect, useState } from 'react';
import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = () => {
  // Authentication checks removed for frictionless access
  return <Outlet />;
};

export default ProtectedRoute;
