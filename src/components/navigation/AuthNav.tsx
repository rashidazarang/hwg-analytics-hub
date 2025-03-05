
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
    // Handle clicks outside the menu
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuOpen && 
        buttonRef.current && 
        !buttonRef.current.contains(event.target as Node) &&
        menuRef.current && 
        !menuRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    };

    // Add the event listener only when the menu is open
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    // Clean up
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

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the click from immediately triggering the document event
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
