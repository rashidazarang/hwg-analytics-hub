
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
  signIn: (email: string, password: string) => Promise<boolean>;
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
  const [initialCheckComplete, setInitialCheckComplete] = useState(false);

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

  // Handle redirection based on auth status and current path
  const handleRedirection = (isAdmin: boolean, path: string) => {
    try {
      console.log(`Handling redirection with isAdmin: ${isAdmin}, current path: ${path}`);
      
      if (isAdmin) {
        if (path === '/login' || path === '/signup-confirmation') {
          console.log("Redirecting authenticated admin to dashboard");
          navigate('/');
        }
      } else {
        // If not an admin or not authenticated, and not on login pages, redirect to login
        const nonAuthPaths = ['/login', '/signup-confirmation'];
        if (!nonAuthPaths.includes(path)) {
          console.log("Not admin - redirecting to login");
          navigate('/login');
        }
      }
    } catch (err) {
      console.error("Error in handleRedirection:", err);
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
          setInitialCheckComplete(true);
          return;
        }
        
        console.log("Session data:", data.session ? "Session exists" : "No session");
        
        if (data.session?.user) {
          setSession(data.session);
          setUser(data.session.user);
          const isUserAdmin = await fetchAdminStatus(data.session.user.id);
          
          // Use window.location.pathname to ensure we get the current path
          handleRedirection(isUserAdmin, window.location.pathname);
        }
        
        setInitialCheckComplete(true);
      } catch (err) {
        console.error("Exception in setupAuth:", err);
        setInitialCheckComplete(true);
      } finally {
        setIsLoading(false);
      }
    };
    
    setupAuth();

    // Set up auth state change listener with error handling
    try {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event, session ? "Session exists" : "No session");
        
        if (session?.user) {
          setSession(session);
          setUser(session.user);
          const isUserAdmin = await fetchAdminStatus(session.user.id);
          
          // Always use window.location.pathname for reliable current path
          handleRedirection(isUserAdmin, window.location.pathname);
        } else {
          setSession(null);
          setUser(null);
          setIsAdmin(false);
          
          // If not on login or signup confirmation page and no session, redirect to login
          const nonAuthPaths = ['/login', '/signup-confirmation'];
          if (!nonAuthPaths.includes(window.location.pathname)) {
            console.log("No session - redirecting to login");
            navigate('/login');
          }
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
      console.log("Starting signIn process for email:", email);
      
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
        return false;
      }

      if (data.user) {
        console.log("Login successful, checking admin status");
        // Check if user is admin
        const isUserAdmin = await fetchAdminStatus(data.user.id);
        
        if (!isUserAdmin) {
          toast({
            variant: "destructive",
            title: "Access denied",
            description: "You don't have administrator privileges"
          });
          await supabase.auth.signOut();
          return false;
        }
        
        toast({
          title: "Login successful",
          description: "Welcome back, admin!"
        });
        
        console.log("Login successful, navigating to dashboard");
        // Force navigation here
        navigate('/');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Sign in error:', error);
      return false;
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
      {initialCheckComplete ? children : <div>Loading authentication...</div>}
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
