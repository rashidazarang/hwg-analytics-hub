
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Menu, User } from 'lucide-react';
import { toast } from 'sonner';
import AccountMenu from './AccountMenu';

const AuthNav = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
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
    setMenuOpen(prevState => !prevState);
  };

  const navigateToAccount = () => {
    navigate('/account');
    setMenuOpen(false);
  };

  // Close menu when clicking outside, but not when clicking the menu button
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuOpen && 
        menuButtonRef.current && 
        !menuButtonRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  if (loading) {
    return (
      <Button variant="ghost" size="icon" className="h-7 w-7 xs:h-8 xs:w-8 opacity-70" disabled>
        <span className="sr-only">Loading</span>
      </Button>
    );
  }

  return user ? (
    <div className="relative">
      <Button 
        ref={menuButtonRef}
        variant="ghost" 
        size="icon"
        onClick={toggleMenu}
        aria-label="Account menu"
        className="h-7 w-7 xs:h-8 xs:w-8 rounded-full bg-muted/50 hover:bg-muted transition-all duration-200"
      >
        <User className="h-3.5 w-3.5 xs:h-4 xs:w-4" />
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
    <Button 
      variant="default" 
      size="sm" 
      className="h-7 xs:h-8 text-xs font-medium shadow-sm px-2 xs:px-3" 
      onClick={() => navigate('/auth')}
    >
      Sign In
    </Button>
  );
};

export default AuthNav;
