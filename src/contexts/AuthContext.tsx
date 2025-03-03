
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
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

// Define the type for profile data
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

  // Helper function to check if user is admin
  const checkIsAdmin = async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .single();
        
      if (error) {
        console.error('Error fetching profile data:', error);
        return false;
      }
      
      return data?.is_admin || false;
    } catch (err) {
      console.error('Error checking admin status:', err);
      return false;
    }
  };

  useEffect(() => {
    // Initialize auth state
    const initAuth = async () => {
      setIsLoading(true);
      try {
        // Get initial session
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error getting session:", error);
          return;
        }
        
        if (data.session) {
          setUser(data.session.user);
          setSession(data.session);
          
          // Check admin status
          const isUserAdmin = await checkIsAdmin(data.session.user.id);
          setIsAdmin(isUserAdmin);
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    initAuth();
    
    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('Auth state changed:', event);
      
      if (event === 'SIGNED_OUT') {
        // Clear all auth state on sign out
        setUser(null);
        setSession(null);
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }
      
      // For all other auth events
      if (newSession) {
        setUser(newSession.user);
        setSession(newSession);
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          const isUserAdmin = await checkIsAdmin(newSession.user.id);
          setIsAdmin(isUserAdmin);
        }
      }
      
      setIsLoading(false);
    });
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
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
        return;
      }

      if (data.user) {
        const isUserAdmin = await checkIsAdmin(data.user.id);
        
        if (!isUserAdmin) {
          await supabase.auth.signOut();
          toast({
            variant: "destructive",
            title: "Access denied",
            description: "You don't have administrator privileges"
          });
          return;
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
      toast({
        variant: "destructive",
        title: "Login error",
        description: "An unexpected error occurred. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Registration failed",
          description: error.message
        });
        return;
      }

      toast({
        title: "Registration successful",
        description: "Account created successfully. Please check your email to confirm your account."
      });
    } catch (error) {
      console.error('Sign up error:', error);
      toast({
        variant: "destructive",
        title: "Registration error",
        description: "An unexpected error occurred. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }
      
      setIsAdmin(false);
      setUser(null);
      setSession(null);
      
      toast({
        title: "Logged out",
        description: "You have been logged out successfully"
      });
      
      navigate('/login');
    } catch (error) {
      console.error('Sign out error:', error);
      toast({
        variant: "destructive",
        title: "Logout failed",
        description: "Failed to log out. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, isAdmin, signIn, signUp, signOut }}>
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
