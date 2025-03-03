
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { Session, User, AuthError } from '@supabase/supabase-js';

// Define the shape of our auth context
type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: AuthError }>;
  signUp: (email: string, password: string) => Promise<{ error?: AuthError }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  console.log("Auth Provider initialized");

  // Helper function to check if user is admin
  const checkIsAdmin = async (userId: string): Promise<boolean> => {
    try {
      console.log(`Checking admin status for user: ${userId}`);
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .single();
        
      if (error) {
        console.error('Error fetching profile data:', error);
        return false;
      }
      
      console.log('Profile data:', data);
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
        console.log("Initializing auth state...");
        // Get initial session
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error getting session:", error);
          setIsLoading(false);
          return;
        }
        
        console.log("Session data:", data);
        
        if (data.session) {
          setUser(data.session.user);
          setSession(data.session);
          
          // Check admin status
          console.log("Checking admin status...");
          const isUserAdmin = await checkIsAdmin(data.session.user.id);
          console.log(`User admin status: ${isUserAdmin}`);
          setIsAdmin(isUserAdmin);
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
      } finally {
        setIsLoading(false);
        console.log("Auth initialization complete");
      }
    };
    
    initAuth();
    
    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('Auth state changed:', event);
      
      if (event === 'SIGNED_OUT') {
        // Clear all auth state on sign out
        console.log("User signed out, clearing auth state");
        setUser(null);
        setSession(null);
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }
      
      // For all other auth events
      if (newSession) {
        console.log("New session detected");
        setUser(newSession.user);
        setSession(newSession);
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          console.log("Signed in or token refreshed, checking admin status");
          const isUserAdmin = await checkIsAdmin(newSession.user.id);
          console.log(`User admin status: ${isUserAdmin}`);
          setIsAdmin(isUserAdmin);
        }
      }
      
      setIsLoading(false);
    });
    
    return () => {
      console.log("Cleaning up auth listener");
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  const signIn = async (email: string, password: string) => {
    try {
      console.log(`Attempting sign in for email: ${email}`);
      setIsLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error("Sign in error:", error);
        toast({
          variant: "destructive",
          title: "Login failed",
          description: error.message
        });
        setIsLoading(false);
        return { error };
      }

      console.log("Sign in successful:", data);

      if (data.user) {
        try {
          const isUserAdmin = await checkIsAdmin(data.user.id);
          console.log(`User admin status after sign in: ${isUserAdmin}`);
          
          if (!isUserAdmin) {
            console.log("User is not an admin, signing out");
            await supabase.auth.signOut();
            setUser(null);
            setSession(null);
            setIsAdmin(false);
            toast({
              variant: "destructive",
              title: "Access denied",
              description: "You don't have administrator privileges"
            });
            setIsLoading(false);
            return { error: { name: 'NotAdminError', message: "You don't have administrator privileges" } as AuthError };
          }
          
          setIsAdmin(true);
          toast({
            title: "Login successful",
            description: "Welcome back, admin!"
          });
          navigate('/');
        } catch (err) {
          console.error("Error checking admin status:", err);
          await supabase.auth.signOut();
          setUser(null);
          setSession(null);
          setIsAdmin(false);
          toast({
            variant: "destructive",
            title: "Authentication error",
            description: "Error verifying admin status. Please try again."
          });
          return { error: { name: 'AdminCheckError', message: "Error verifying admin status" } as AuthError };
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
      
      return {};
    } catch (error) {
      console.error('Sign in error:', error);
      toast({
        variant: "destructive",
        title: "Login error",
        description: "An unexpected error occurred. Please try again."
      });
      setIsLoading(false);
      return { error: error as AuthError };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      console.log(`Attempting sign up for email: ${email}`);
      setIsLoading(true);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      });

      if (error) {
        console.error("Sign up error:", error);
        toast({
          variant: "destructive",
          title: "Registration failed",
          description: error.message
        });
        setIsLoading(false);
        return { error };
      }

      console.log("Sign up successful:", data);
      toast({
        title: "Registration successful",
        description: "Account created successfully. Please check your email to confirm your account."
      });
      
      return {};
    } catch (error) {
      console.error('Sign up error:', error);
      toast({
        variant: "destructive",
        title: "Registration error",
        description: "An unexpected error occurred. Please try again."
      });
      return { error: error as AuthError };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      console.log("Attempting sign out");
      setIsLoading(true);
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("Sign out error:", error);
        throw error;
      }
      
      console.log("Sign out successful");
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
