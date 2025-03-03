
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save, User } from 'lucide-react';

interface UserProfile {
  first_name: string | null;
  last_name: string | null;
}

const AccountSettings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    first_name: '',
    last_name: '',
  });
  const [password, setPassword] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  const [updateType, setUpdateType] = useState<'profile' | 'password' | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchProfile = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', user.id)
          .single();

        if (error) {
          throw error;
        }

        if (data) {
          setProfile({
            first_name: data.first_name || '',
            last_name: data.last_name || '',
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load profile information',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, navigate]);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPassword((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validatePasswordForm = () => {
    if (!password.current) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Current password is required',
      });
      return false;
    }

    if (!password.new) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'New password is required',
      });
      return false;
    }

    if (password.new !== password.confirm) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'New passwords do not match',
      });
      return false;
    }

    if (password.new.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Password must be at least 6 characters',
      });
      return false;
    }

    return true;
  };

  const updateProfile = async () => {
    setLoading(true);
    setUpdateType('profile');
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: profile.first_name,
          last_name: profile.last_name,
        })
        .eq('id', user?.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update profile',
      });
    } finally {
      setLoading(false);
      setUpdateType(null);
    }
  };

  const updatePassword = async () => {
    if (!validatePasswordForm()) return;

    setLoading(true);
    setUpdateType('password');
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: password.new,
      });

      if (error) throw error;

      setPassword({
        current: '',
        new: '',
        confirm: '',
      });

      toast({
        title: 'Success',
        description: 'Password updated successfully',
      });
    } catch (error) {
      console.error('Error updating password:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update password',
      });
    } finally {
      setLoading(false);
      setUpdateType(null);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 flex items-center">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="p-0 mr-3"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-semibold">Account Settings</h1>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your account profile details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 mb-4 p-4 rounded-md bg-muted/50">
                <User className="w-6 h-6 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{user?.email}</p>
                  <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                </div>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input 
                    id="first_name"
                    name="first_name"
                    value={profile.first_name || ''}
                    onChange={handleProfileChange}
                    placeholder="Your first name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input 
                    id="last_name"
                    name="last_name"
                    value={profile.last_name || ''}
                    onChange={handleProfileChange}
                    placeholder="Your last name"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={updateProfile}
                disabled={loading && updateType === 'profile'}
                className="ml-auto"
              >
                {loading && updateType === 'profile' ? 
                  "Saving..." : 
                  <><Save className="mr-2 h-4 w-4" /> Save Changes</>
                }
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your account password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current">Current Password</Label>
                <Input 
                  id="current"
                  name="current"
                  type="password"
                  value={password.current}
                  onChange={handlePasswordChange}
                  placeholder="Your current password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new">New Password</Label>
                <Input 
                  id="new"
                  name="new"
                  type="password"
                  value={password.new}
                  onChange={handlePasswordChange}
                  placeholder="Your new password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm New Password</Label>
                <Input 
                  id="confirm"
                  name="confirm"
                  type="password"
                  value={password.confirm}
                  onChange={handlePasswordChange}
                  placeholder="Confirm your new password"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={updatePassword}
                disabled={loading && updateType === 'password'}
                className="ml-auto"
              >
                {loading && updateType === 'password' ? 
                  "Updating..." : 
                  "Update Password"
                }
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;
