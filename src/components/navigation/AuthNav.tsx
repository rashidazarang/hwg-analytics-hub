
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { User } from 'lucide-react';
import { toast } from 'sonner';
import AccountMenu from './AccountMenu';

const AuthNav = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

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

  useEffect(() => {
    // Handle clicks outside both the button and menu
    const handleClickOutside = (event: MouseEvent) => {
      // Only close if the menu is open AND the click is outside both menu and button
      if (
        menuOpen &&
        menuRef.current && 
        buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    };

    // Use mousedown instead of click to ensure it captures all click types
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

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
        ref={buttonRef}
        className="h-7 w-7 xs:h-8 xs:w-8 rounded-full bg-muted/50 hover:bg-muted transition-all duration-200"
      >
        <User className="h-3.5 w-3.5 xs:h-4 xs:w-4" />
      </Button>
      
      <AccountMenu 
        menuRef={menuRef}
        isOpen={menuOpen}
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
