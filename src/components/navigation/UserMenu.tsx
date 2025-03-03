
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Menu, User, LogOut } from 'lucide-react';

const UserMenu = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  const userInitials = React.useMemo(() => {
    if (!user?.email) return '?';
    
    // Extract initials from email (first letter before @ sign)
    const emailName = user.email.split('@')[0];
    return emailName.charAt(0).toUpperCase();
  }, [user]);
  
  const handleNavigateToAccount = () => {
    navigate('/account');
  };
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarFallback>{userInitials}</AvatarFallback>
          </Avatar>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 mt-1 p-0" align="end">
        <div className="p-2 border-b">
          <p className="text-sm font-medium">{user?.email}</p>
        </div>
        <div className="p-1">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-sm px-2 py-1.5 h-auto"
            onClick={handleNavigateToAccount}
          >
            <User className="mr-2 h-4 w-4" />
            Account
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-sm px-2 py-1.5 h-auto text-destructive hover:text-destructive"
            onClick={signOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default UserMenu;
