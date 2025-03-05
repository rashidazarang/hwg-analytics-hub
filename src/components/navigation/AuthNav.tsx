
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
  const navigate = useNavigate();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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

  // Add global click handler
  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      // Skip if menu is not open
      if (!menuOpen) return;
      
      // Check if click is outside both the button and the menu
      const isClickInside = 
        (menuButtonRef.current && menuButtonRef.current.contains(event.target as Node)) ||
        (menuRef.current && menuRef.current.contains(event.target as Node));
      
      if (!isClickInside) {
        setMenuOpen(false);
      }
    };
    
    // Add event listener to document
    document.addEventListener('mousedown', handleGlobalClick);
    
    // Clean up
    return () => {
      document.removeEventListener('mousedown', handleGlobalClick);
    };
  }, [menuOpen]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success('You have been signed out');
    navigate('/auth');
    setMenuOpen(false);
  };

  const toggleMenu = () => {
    setMenuOpen(prevOpen => !prevOpen);
  };

  const navigateToAccount = () => {
    navigate('/account');
    setMenuOpen(false);
  };

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
        variant="ghost" 
        size="icon"
        onClick={toggleMenu}
        aria-label="Account menu"
        className="h-7 w-7 xs:h-8 xs:w-8 rounded-full bg-muted/50 hover:bg-muted transition-all duration-200"
        ref={menuButtonRef}
      >
        <User className="h-3.5 w-3.5 xs:h-4 xs:w-4" />
      </Button>
      
      <AccountMenu 
        isOpen={menuOpen} 
        onAccountClick={navigateToAccount}
        onLogoutClick={handleSignOut}
        email={user.email}
        menuRef={menuRef}
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
