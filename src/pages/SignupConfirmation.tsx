
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';

const SignupConfirmation = () => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <ShieldCheck className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Registration Successful</CardTitle>
          <CardDescription>Your account has been created</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg border border-muted-foreground/20">
            <h3 className="font-medium mb-2">Next Steps:</h3>
            <p className="text-muted-foreground">
              After signing up, you will need to contact an administrator to grant you admin privileges.
              Only users with admin privileges can access the dashboard.
            </p>
          </div>
          
          <p className="text-sm text-muted-foreground">
            Once your account has been approved, you will be able to log in and access all features.
          </p>
        </CardContent>
        
        <CardFooter>
          <Button 
            className="w-full" 
            onClick={() => navigate('/login')}
          >
            Return to Login
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default SignupConfirmation;
