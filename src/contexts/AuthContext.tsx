
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { Session, User } from '@supabase/supabase-js';

// Define the shape of our auth context
type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock user for local development without authentication
const mockUser: User = {
  id: 'local-dev-user',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'local@dev.com',
  email_confirmed_at: new Date().toISOString(),
  phone: '',
  confirmed_at: new Date().toISOString(),
  last_sign_in_at: new Date().toISOString(),
  app_metadata: {},
  user_metadata: {},
  identities: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  is_anonymous: false
};

const mockSession: Session = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  expires_at: Date.now() / 1000 + 3600,
  token_type: 'bearer',
  user: mockUser
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  // For local development, always use mock authenticated user
  const [user, setUser] = useState<User | null>(mockUser);
  const [session, setSession] = useState<Session | null>(mockSession);
  const [isLoading, setIsLoading] = useState(false); // No loading for mock auth
  const [isAdmin, setIsAdmin] = useState(true); // Always admin for local dev

  useEffect(() => {
    // Set mock authenticated state immediately for local development
    setUser(mockUser);
    setSession(mockSession);
    setIsAdmin(true);
      setIsLoading(false);
  }, [navigate]);

  const signIn = async (email: string, password: string) => {
    // For local development, always succeed and use mock user
    try {
      setUser(mockUser);
      setSession(mockSession);
        setIsAdmin(true);
        toast({
        title: "Development Mode",
        description: "Authentication bypassed for local development"
        });
        navigate('/');
    } catch (error) {
      console.error('Mock sign in error:', error);
    }
  };

  const signOut = async () => {
    // For local development, just show message but keep user authenticated
    try {
      toast({
        title: "Development Mode",
        description: "Sign out disabled in local development"
      });
    } catch (error) {
      console.error('Mock sign out error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, isAdmin, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
