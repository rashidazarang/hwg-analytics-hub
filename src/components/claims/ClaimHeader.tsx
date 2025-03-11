import React from 'react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Clock, 
  FileCheck, 
  FileWarning, 
  FileSpreadsheet, 
  Building 
} from 'lucide-react';
import { Claim, getClaimStatus } from '@/hooks/useClaimDetail';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Status variants for styling claim status badges
const statusVariants = {
  OPEN: 'bg-success/15 text-success border-success/20',
  CLOSED: 'bg-destructive/15 text-destructive border-destructive/20',
  UNKNOWN: 'bg-muted/30 text-muted-foreground border-muted/40'
};

interface ClaimHeaderProps {
  claim: Claim;
}

const ClaimHeader: React.FC<ClaimHeaderProps> = ({ claim }) => {
  const status = getClaimStatus(claim);
  const dealerInfo = claim.agreement?.dealer;
  
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'MMM d, yyyy');
  };
  
  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Left column: Claim Info */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Claim Information</h2>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge 
                      variant="outline" 
                      className={`${statusVariants[status as keyof typeof statusVariants] || statusVariants.UNKNOWN} border`}
                    >
                      {status}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    {status === 'OPEN' ? 'This claim is still being processed' : 'This claim has been processed and closed'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Claim ID:</span>
                <span className="font-medium">{claim.ClaimID}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Agreement ID:</span>
                <Link 
                  to={`/agreements/${claim.AgreementID}`} 
                  className="font-medium text-primary hover:underline"
                >
                  {claim.AgreementID}
                </Link>
              </div>
            </div>
          </div>
          
          {/* Middle column: Dealer Info */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Dealer Information</h2>
            <div className="space-y-2">
              {dealerInfo ? (
                <>
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Dealer Name:</span>
                    <span className="font-medium">{dealerInfo.Name}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Location:</span>
                    <span className="font-medium">
                      {dealerInfo.City}, {dealerInfo.State} {dealerInfo.ZipCode}
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-muted-foreground">Dealer information not available</div>
              )}
            </div>
          </div>
          
          {/* Right column: Dates */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Timeline</h2>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Reported:</span>
                <span className="font-medium">{formatDate(claim.Reported)}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Incurred:</span>
                <span className="font-medium">{formatDate(claim.Incurred)}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Closed:</span>
                <span className="font-medium">{formatDate(claim.Closed)}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClaimHeader; 