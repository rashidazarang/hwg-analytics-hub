
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Menu, User, X } from 'lucide-react';
import { toast } from 'sonner';
import AccountMenu from './AccountMenu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const AuthNav = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('agreements');
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

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  if (loading) {
    return (
      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-70" disabled>
        <span className="sr-only">Loading</span>
      </Button>
    );
  }

  return (
    <div className="flex items-center space-x-4">
      {/* Desktop Navigation Tabs - visible on md screens and up */}
      <div className="hidden md:block">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="h-9 p-0.5 bg-muted/70">
            <TabsTrigger 
              value="agreements" 
              className="text-sm px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              onClick={() => navigate('/')}
            >
              Agreements
            </TabsTrigger>
            <TabsTrigger 
              value="claims" 
              className="text-sm px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              onClick={() => navigate('/')}
            >
              Claims
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Hamburger Menu Button */}
      <div className="relative">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={toggleMenu}
          aria-label="Menu"
          className="h-8 w-8 rounded-full bg-muted/50 hover:bg-muted transition-all duration-200"
        >
          {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
        
        {/* Menu Dropdown */}
        {menuOpen && (
          <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white border z-50">
            {/* Mobile Tabs - only visible on mobile */}
            <div className="md:hidden p-3 border-b">
              <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="h-9 p-0.5 bg-muted/70 w-full grid grid-cols-2">
                  <TabsTrigger 
                    value="agreements" 
                    className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    onClick={() => {
                      navigate('/');
                      setMenuOpen(false);
                    }}
                  >
                    Agreements
                  </TabsTrigger>
                  <TabsTrigger 
                    value="claims" 
                    className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    onClick={() => {
                      navigate('/');
                      setMenuOpen(false);
                    }}
                  >
                    Claims
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Account Menu */}
            <div className="py-1">
              {user ? (
                <>
                  <div className="px-4 py-2 text-sm text-gray-700 border-b">
                    <div className="font-medium">Signed in as</div>
                    <div className="truncate text-gray-500">{user.email}</div>
                  </div>
                  <button
                    onClick={navigateToAccount}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Account Settings
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    navigate('/auth');
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthNav;
