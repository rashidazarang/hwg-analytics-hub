
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { LogOut, LogIn } from 'lucide-react';
import { toast } from 'sonner';

const AuthNav = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      setLoading(true);
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user || null);
      setLoading(false);
    };
    
    getInitialSession();
    
    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user || null);
    });
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success('You have been signed out');
    navigate('/auth');
  };

  if (loading) {
    return <Button variant="ghost" disabled>Loading...</Button>;
  }

  return user ? (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">
        {user.email}
      </span>
      <Button variant="outline" size="sm" onClick={handleSignOut}>
        <LogOut className="h-4 w-4 mr-2" />
        Sign Out
      </Button>
    </div>
  ) : (
    <Button variant="default" size="sm" asChild>
      <Link to="/auth">
        <LogIn className="h-4 w-4 mr-2" />
        Sign In
      </Link>
    </Button>
  );
};

export default AuthNav;
