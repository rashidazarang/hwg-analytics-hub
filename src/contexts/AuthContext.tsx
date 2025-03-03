
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

  useEffect(() => {
    const setupAuth = async () => {
      try {
        // Get the initial session
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error getting session:", error);
          setUser(null);
          setSession(null);
          setIsAdmin(false);
          return;
        }
        
        setSession(data.session);
        setUser(data.session?.user || null);
        
        if (data.session?.user) {
          // Check if user is admin
          try {
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('is_admin')
              .eq('id', data.session.user.id)
              .single();
              
            if (profileError) {
              console.error('Error fetching profile data:', profileError);
              setIsAdmin(false);
            } else if (profileData) {
              setIsAdmin((profileData as ProfileData).is_admin || false);
            }
          } catch (err) {
            console.error('Unexpected error fetching profile:', err);
            setIsAdmin(false);
          }
        }
      } catch (err) {
        console.error("Unexpected error in setupAuth:", err);
        setUser(null);
        setSession(null);
        setIsAdmin(false);
      } finally {
        // Always set loading to false when done
        setIsLoading(false);
      }
    };
    
    setupAuth();

    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('Auth state changed:', event);
      
      setSession(newSession);
      setUser(newSession?.user || null);
      
      if (newSession?.user) {
        // Check if user is admin when auth state changes
        try {
          const { data: profileData, error } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', newSession.user.id)
            .single();
            
          if (error) {
            console.error('Error fetching profile data on auth change:', error);
            setIsAdmin(false);
          } else if (profileData) {
            setIsAdmin((profileData as ProfileData).is_admin || false);
          } else {
            setIsAdmin(false);
          }
        } catch (err) {
          console.error('Error in auth state change handler:', err);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      
      // Always ensure loading is set to false after auth state changes
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
      
      // Note: The user will need to be made an admin manually in the database
    } catch (error) {
      console.error('Sign up error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
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
