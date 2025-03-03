
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { ChevronLeft, Save, User, Lock } from 'lucide-react';

const Account = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    // Get current user and profile
    const getProfile = async () => {
      setLoading(true);
      
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        
        if (!sessionData.session) {
          navigate('/auth');
          return;
        }
        
        setUser(sessionData.session.user);
        
        // Get user profile data if available
        const { data: profileData } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', sessionData.session.user.id)
          .single();
        
        if (profileData) {
          setFirstName(profileData.first_name || '');
          setLastName(profileData.last_name || '');
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
        toast.error('Failed to load profile information');
      } finally {
        setLoading(false);
      }
    };
    
    getProfile();
  }, [navigate]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setSaving(true);
    
    try {
      // Update profile information
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
          updated_at: new Date()
        })
        .eq('id', user.id);
      
      if (profileError) throw profileError;
      
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    setSaving(true);
    
    try {
      // First verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      });
      
      if (signInError) {
        toast.error('Current password is incorrect');
        setSaving(false);
        return;
      }
      
      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (updateError) throw updateError;
      
      toast.success('Password updated successfully');
      
      // Clear password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error('Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex justify-center items-center">
        <p>Loading account information...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container max-w-3xl mx-auto px-4">
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')} 
            className="mb-4"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <h1 className="text-3xl font-bold">Account Settings</h1>
          <p className="text-muted-foreground">Manage your account information and security settings</p>
        </div>
        
        <div className="space-y-8">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Update your personal information
              </CardDescription>
            </CardHeader>
            
            <form onSubmit={handleUpdateProfile}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    Email Address
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Your email address cannot be changed
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="firstName" className="text-sm font-medium">
                      First Name
                    </label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Your first name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="lastName" className="text-sm font-medium">
                      Last Name
                    </label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Your last name"
                    />
                  </div>
                </div>
              </CardContent>
              
              <CardFooter>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>Saving...</>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
          
          {/* Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lock className="h-5 w-5 mr-2" />
                Security
              </CardTitle>
              <CardDescription>
                Update your password
              </CardDescription>
            </CardHeader>
            
            <form onSubmit={handleUpdatePassword}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="currentPassword" className="text-sm font-medium">
                    Current Password
                  </label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <label htmlFor="newPassword" className="text-sm font-medium">
                    New Password
                  </label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="text-sm font-medium">
                    Confirm New Password
                  </label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              </CardContent>
              
              <CardFooter>
                <Button 
                  type="submit" 
                  disabled={saving || !currentPassword || !newPassword || !confirmPassword}
                >
                  {saving ? (
                    <>Updating Password...</>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Update Password
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Account;
