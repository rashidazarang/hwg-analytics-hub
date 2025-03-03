import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { Session, User } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

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

  console.log("AuthContext - Provider initializing");

  const fetchAdminStatus = async (userId: string) => {
    try {
      console.log("AuthContext - Fetching admin status for user:", userId);
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('is_admin, first_name, last_name')
        .eq('id', userId)
        .single();
        
      if (!error && profileData) {
        console.log("AuthContext - Profile data fetched:", profileData);
        const isUserAdmin = (profileData as ProfileData).is_admin || false;
        console.log("AuthContext - Setting isAdmin to:", isUserAdmin);
        setIsAdmin(isUserAdmin);
        return isUserAdmin;
      } else {
        console.error('AuthContext - Error fetching profile data:', error);
        setIsAdmin(false);
        return false;
      }
    } catch (err) {
      console.error('AuthContext - Exception fetching profile data:', err);
      setIsAdmin(false);
      return false;
    }
  };

  const clearStaleSession = async () => {
    try {
      console.log("AuthContext - Starting stale session cleanup");
      
      localStorage.removeItem('supabase.auth.token');
      
      const keysToRemove = Object.keys(localStorage).filter(
        key => key.startsWith('supabase.auth.')
      );
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log("AuthContext - Removed localStorage key:", key);
      });
      
      console.log("AuthContext - Cleared potential stale session data");
    } catch (err) {
      console.error("AuthContext - Error clearing stale session:", err);
    }
  };

  const handleRedirection = (isAdmin: boolean, path: string) => {
    try {
      console.log(`AuthContext - Handling redirection with isAdmin: ${isAdmin}, current path: ${path}`);
      
      if (isAdmin) {
        if (path === '/login' || path === '/signup-confirmation') {
          console.log("AuthContext - Redirecting authenticated admin to dashboard");
          console.log("AuthContext - Current navigate function:", navigate ? "exists" : "undefined");
          
          setTimeout(() => {
            console.log("AuthContext - Executing delayed navigation to /");
            window.location.href = '/';
          }, 100);
        }
      } else {
        const nonAuthPaths = ['/login', '/signup-confirmation'];
        if (!nonAuthPaths.includes(path)) {
          console.log("AuthContext - Not admin - redirecting to login");
          navigate('/login');
        }
      }
    } catch (err) {
      console.error("AuthContext - Error in handleRedirection:", err);
    }
  };

  useEffect(() => {
    console.log("AuthContext - setupAuth useEffect triggered");
    
    const setupAuth = async () => {
      try {
        console.log("AuthContext - Starting setupAuth");
        
        await clearStaleSession();
        
        setIsLoading(true);
        
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("AuthContext - Error getting session:", error);
          setIsLoading(false);
          setInitialCheckComplete(true);
          return;
        }
        
        console.log("AuthContext - Session data:", data.session ? "Session exists" : "No session");
        
        if (data.session?.user) {
          console.log("AuthContext - Session user found:", data.session.user.id);
          setSession(data.session);
          setUser(data.session.user);
          
          await fetchAdminStatus(data.session.user.id);
          
          console.log("AuthContext - Current pathname:", window.location.pathname);
          handleRedirection(isAdmin, window.location.pathname);
        } else {
          console.log("AuthContext - No session user found");
        }
      } catch (err) {
        console.error("AuthContext - Exception in setupAuth:", err);
      } finally {
        setIsLoading(false);
        setInitialCheckComplete(true);
        console.log("AuthContext - setupAuth complete, isLoading set to false, initialCheckComplete set to true");
      }
    };
    
    setupAuth();

    try {
      console.log("AuthContext - Setting up auth state change listener");
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('AuthContext - Auth state changed:', event, session ? "Session exists" : "No session");
        
        if (session?.user) {
          console.log("AuthContext - Auth state change detected user:", session.user.id);
          setSession(session);
          setUser(session.user);
          
          await fetchAdminStatus(session.user.id);
          
          console.log("AuthContext - Current pathname for auth state change:", window.location.pathname);
          handleRedirection(isAdmin, window.location.pathname);
        } else {
          console.log("AuthContext - Auth state change detected no user");
          setSession(null);
          setUser(null);
          setIsAdmin(false);
          
          const nonAuthPaths = ['/login', '/signup-confirmation'];
          if (!nonAuthPaths.includes(window.location.pathname)) {
            console.log("AuthContext - No session - redirecting to login");
            navigate('/login');
          }
        }
      });

      return () => {
        console.log("AuthContext - Cleaning up auth listener subscription");
        data.subscription.unsubscribe();
      };
    } catch (err) {
      console.error("AuthContext - Error setting up auth listener:", err);
      return () => {
        console.log("AuthContext - Empty cleanup due to error");
      };
    }
  }, [navigate]);

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      console.log("AuthContext - Starting signIn process for email:", email);
      
      await clearStaleSession();
      
      console.log("AuthContext - Making supabase.auth.signInWithPassword call");
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error("AuthContext - Login error:", error.message);
        toast({
          variant: "destructive",
          title: "Login failed",
          description: error.message
        });
        return false;
      }

      if (data.user) {
        console.log("AuthContext - Login successful for user:", data.user.id);
        console.log("AuthContext - Checking admin status");
        const isUserAdmin = await fetchAdminStatus(data.user.id);
        
        if (!isUserAdmin) {
          console.log("AuthContext - User not admin, signing out");
          toast({
            variant: "destructive",
            title: "Access denied",
            description: "You don't have administrator privileges"
          });
          await supabase.auth.signOut();
          return false;
        }
        
        console.log("AuthContext - Admin login successful");
        toast({
          title: "Login successful",
          description: "Welcome back, admin!"
        });
        
        setTimeout(() => {
          console.log("AuthContext - Executing forced navigation to homepage");
          navigate('/');
          window.location.href = '/';
        }, 100);
        
        return true;
      }
      
      console.log("AuthContext - No user data from login call");
      return false;
    } catch (error) {
      console.error('AuthContext - Sign in error:', error);
      return false;
    } finally {
      setIsLoading(false);
      console.log("AuthContext - signIn process complete, isLoading set to false");
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      console.log("AuthContext - Starting signUp process for email:", email);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      });

      if (error) {
        console.error("AuthContext - Registration error:", error.message);
        toast({
          variant: "destructive",
          title: "Registration failed",
          description: error.message
        });
        throw error;
      }

      console.log("AuthContext - Registration successful:", data ? "Data returned" : "No data");
      toast({
        title: "Registration successful",
        description: "Account created successfully. Please check your email to confirm your account."
      });
      
      navigate('/signup-confirmation');
    } catch (error) {
      console.error('AuthContext - Sign up error:', error);
    } finally {
      setIsLoading(false);
      console.log("AuthContext - signUp process complete, isLoading set to false");
    }
  };

  const signOut = async () => {
    try {
      console.log("AuthContext - Starting signOut process");
      await supabase.auth.signOut();
      setIsAdmin(false);
      console.log("AuthContext - Redirecting to login after signOut");
      navigate('/login');
      toast({
        title: "Logged out",
        description: "You have been logged out successfully"
      });
    } catch (error) {
      console.error('AuthContext - Sign out error:', error);
      toast({
        variant: "destructive",
        title: "Logout failed",
        description: "Failed to log out. Please try again."
      });
    }
  };

  console.log("AuthContext - Rendering provider with isAdmin:", isAdmin, "session:", session ? "exists" : "null", "initialCheckComplete:", initialCheckComplete, "isLoading:", isLoading);

  return (
    <AuthContext.Provider value={{ user, session, isLoading, isAdmin, signIn, signUp, signOut }}>
      {initialCheckComplete ? (
        children
      ) : (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading authentication...</span>
        </div>
      )}
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
