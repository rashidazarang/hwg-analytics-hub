
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Menu, X } from 'lucide-react';
import { toast } from 'sonner';
import AccountMenu from './AccountMenu';

const AuthNav = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
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
    setMenuOpen(false);
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const navigateToAccount = () => {
    navigate('/account');
    setMenuOpen(false);
  };

  if (loading) {
    return <Button variant="ghost" size="icon" className="h-8 w-8" disabled><span className="sr-only">Loading</span></Button>;
  }

  return user ? (
    <div className="relative">
      <Button 
        variant="ghost" 
        size="icon"
        onClick={toggleMenu}
        aria-label="Account menu"
        className="h-8 w-8 rounded-full bg-muted/50 hover:bg-muted"
      >
        {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </Button>
      
      <AccountMenu 
        isOpen={menuOpen} 
        onClose={() => setMenuOpen(false)}
        onAccountClick={navigateToAccount}
        onLogoutClick={handleSignOut}
        email={user.email} 
      />
    </div>
  ) : (
    <Button variant="default" size="sm" className="h-8 text-xs" onClick={() => navigate('/auth')}>
      Sign In
    </Button>
  );
};

export default AuthNav;
