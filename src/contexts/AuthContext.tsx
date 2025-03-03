
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

// Define the type for profile data to satisfy TypeScript
type ProfileData = {
  is_admin: boolean;
  first_name?: string;
  last_name?: string;
  email?: string;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Function to fetch admin status
  const fetchAdminStatus = async (userId: string) => {
    try {
      console.log("Fetching admin status for user:", userId);
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('is_admin, first_name, last_name')
        .eq('id', userId)
        .single();
        
      if (!error && profileData) {
        console.log("Profile data fetched:", profileData);
        setIsAdmin((profileData as ProfileData).is_admin || false);
        return (profileData as ProfileData).is_admin || false;
      } else {
        console.error('Error fetching profile data:', error);
        setIsAdmin(false);
        return false;
      }
    } catch (err) {
      console.error('Exception fetching profile data:', err);
      setIsAdmin(false);
      return false;
    }
  };

  // Clear any stale sessions that might be causing issues
  const clearStaleSession = async () => {
    try {
      // Force clear the session from localStorage
      localStorage.removeItem('supabase.auth.token');
      
      // Additional Supabase specific storage items that might need clearing
      const keysToRemove = Object.keys(localStorage).filter(
        key => key.startsWith('supabase.auth.')
      );
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });
      
      console.log("Cleared potential stale session data");
    } catch (err) {
      console.error("Error clearing stale session:", err);
    }
  };

  useEffect(() => {
    const setupAuth = async () => {
      try {
        // Clear potential stale data on initial load
        await clearStaleSession();
        
        setIsLoading(true);
        
        // Get the current session
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error getting session:", error);
          setIsLoading(false);
          return;
        }
        
        console.log("Session data:", data.session ? "Session exists" : "No session");
        
        setSession(data.session);
        setUser(data.session?.user || null);
        
        if (data.session?.user) {
          await fetchAdminStatus(data.session.user.id);
        }
      } catch (err) {
        console.error("Exception in setupAuth:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    setupAuth();

    // Set up auth state change listener with error handling
    try {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event);
        
        setSession(session);
        setUser(session?.user || null);
        
        if (session?.user) {
          await fetchAdminStatus(session.user.id);
        } else {
          setIsAdmin(false);
        }
      });

      return () => {
        data.subscription.unsubscribe();
      };
    } catch (err) {
      console.error("Error setting up auth listener:", err);
      return () => {};
    }
  }, [navigate]);

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      // Clear any potential stale session data before login attempt
      await clearStaleSession();
      
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
        console.error("Login error:", error.message);
        return;
      }

      if (data.user) {
        // Check if user is admin
        const isUserAdmin = await fetchAdminStatus(data.user.id);
        
        if (!isUserAdmin) {
          toast({
            variant: "destructive",
            title: "Access denied",
            description: "You don't have administrator privileges"
          });
          await supabase.auth.signOut();
          throw new Error('Not an admin user');
        }
        
        toast({
          title: "Login successful",
          description: "Welcome back, admin!"
        });
        navigate('/');
      }
    } catch (error) {
      console.error('Sign in error:', error);
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
        throw error;
      }

      toast({
        title: "Registration successful",
        description: "Account created successfully. Please check your email to confirm your account."
      });
      
      // Redirect to confirmation page instead of staying on login
      navigate('/signup-confirmation');
      
      // Note: The user will need to be made an admin manually in the database
    } catch (error) {
      console.error('Sign up error:', error);
    } finally {
      setIsLoading(false);
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
