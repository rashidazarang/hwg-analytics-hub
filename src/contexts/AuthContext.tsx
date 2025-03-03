
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

// Define the type for profile data to satisfy TypeScript
type ProfileData = {
  is_admin: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const setupAuth = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setUser(data.session?.user || null);
      
      if (data.session?.user) {
        // Check if user is admin
        // Use explicit typing with as to handle the custom table
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', data.session.user.id)
          .single();
          
        if (!error && profileData) {
          setIsAdmin((profileData as ProfileData).is_admin || false);
        } else {
          console.error('Error fetching profile data:', error);
          setIsAdmin(false);
        }
      }
      
      setIsLoading(false);
    };
    
    setupAuth();

    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      setSession(session);
      setUser(session?.user || null);
      
      if (session?.user) {
        // Check if user is admin when auth state changes
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', session.user.id)
          .single();
          
        if (!error && profileData) {
          setIsAdmin((profileData as ProfileData).is_admin || false);
        } else {
          console.error('Error fetching profile data:', error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, [navigate]);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Login failed",
          description: error.message
        });
        throw error;
      }

      if (data.user) {
        // Check if user is admin
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', data.user.id)
          .single();
        
        if (profileError) {
          toast({
            variant: "destructive",
            title: "Error verifying admin status",
            description: profileError.message
          });
          await supabase.auth.signOut();
          throw new Error('Failed to verify admin status');
        }
        
        if (profileData && !(profileData as ProfileData).is_admin) {
          toast({
            variant: "destructive",
            title: "Access denied",
            description: "You don't have administrator privileges"
          });
          await supabase.auth.signOut();
          throw new Error('Not an admin user');
        }
        
        setIsAdmin(true);
        toast({
          title: "Login successful",
          description: "Welcome back, admin!"
        });
        navigate('/');
      }
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setIsAdmin(false);
      navigate('/login');
      toast({
        title: "Logged out",
        description: "You have been logged out successfully"
      });
    } catch (error) {
      console.error('Sign out error:', error);
      toast({
        variant: "destructive",
        title: "Logout failed",
        description: "Failed to log out. Please try again."
      });
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
