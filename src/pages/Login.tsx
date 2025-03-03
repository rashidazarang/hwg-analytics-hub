
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signIn, signUp, isAdmin, session } = useAuth();
  const navigate = useNavigate();

  console.log("Login component - MOUNT with session:", session ? "exists" : "null", "isAdmin:", isAdmin);

  useEffect(() => {
    console.log("Login component - useEffect triggered with session:", session ? "exists" : "null", "isAdmin:", isAdmin);
    
    if (session && isAdmin) {
      console.log("Login component - Attempting to redirect to dashboard from useEffect");
      navigate('/');
      console.log("Login component - Navigation function called - did it work?");
    } else {
      console.log("Login component - Not redirecting because:", !session ? "No session" : "Not admin");
    }
  }, [session, isAdmin, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Login component - handleLogin triggered with email:", email);
    
    if (!email || !password) {
      console.log("Login component - Missing email or password");
      toast({
        variant: "destructive",
        title: "Missing information",
        description: "Please provide both email and password"
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      console.log("Login component - Setting isSubmitting to true");
      
      console.log("Login component - Calling signIn function");
      const success = await signIn(email, password);
      console.log("Login component - signIn returned:", success ? "Success" : "Failed");
      
      if (!success) {
        console.log("Login component - Login unsuccessful, resetting submission state");
        setIsSubmitting(false);
      } else {
        console.log("Login component - Login successful in handleLogin");
        // Explicit navigation attempt as a backup
        console.log("Login component - Attempting direct navigation to dashboard");
        navigate('/');
        console.log("Login component - Direct navigation called - did it execute?");
      }
      
    } catch (error) {
      console.error("Login component - Login error:", error);
      setIsSubmitting(false);
      toast({
        variant: "destructive",
        title: "Login error",
        description: "An unexpected error occurred during login"
      });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Login component - handleSignUp triggered");
    
    if (!email || !password) {
      console.log("Login component - Missing email or password for signup");
      toast({
        variant: "destructive",
        title: "Missing information",
        description: "Please provide both email and password"
      });
      return;
    }
    
    if (password.length < 6) {
      console.log("Login component - Password too short for signup");
      toast({
        variant: "destructive",
        title: "Password too short",
        description: "Password must be at least 6 characters"
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      console.log("Login component - Calling signUp function");
      await signUp(email, password);
      console.log("Login component - signUp completed");
      setIsSubmitting(false);
    } catch (error) {
      console.error("Login component - Signup error:", error);
      setIsSubmitting(false);
      toast({
        variant: "destructive",
        title: "Signup error",
        description: "An unexpected error occurred during signup"
      });
    }
  };

  // Log render state
  console.log("Login component - Rendering with isSubmitting:", isSubmitting);

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/30">
      <div className="w-full max-w-md p-8 space-y-8 bg-background rounded-lg shadow-lg">
        <div className="text-center">
          <div className="flex justify-center mb-2">
            <ShieldCheck className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Sign in to access the admin area
          </p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="login-email" className="text-sm font-medium">
                    Email Address
                  </label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="login-password" className="text-sm font-medium">
                    Password
                  </label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={!email || !password || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  "Log in"
                )}
              </Button>
            </form>
          </TabsContent>
          
          <TabsContent value="signup">
            <form onSubmit={handleSignUp} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="signup-email" className="text-sm font-medium">
                    Email Address
                  </label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="signup-password" className="text-sm font-medium">
                    Password
                  </label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                  <p className="text-xs text-muted-foreground">
                    Password must be at least 6 characters
                  </p>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={!email || !password || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing up...
                  </>
                ) : (
                  "Sign up"
                )}
              </Button>
              
              <p className="text-xs text-center text-muted-foreground mt-4">
                Note: After signing up, you will need to contact an administrator to grant you admin privileges.
              </p>
            </form>
          </TabsContent>
        </Tabs>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          <p>This is a secure area. Only authorized administrators can access.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
