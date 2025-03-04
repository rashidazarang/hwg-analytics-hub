
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { getClaimStatus, statusVariants } from '@/utils/claimUtils';

interface ClaimStatusBadgeProps {
  claim: any;
}

/**
 * Displays a color-coded badge with the claim's status
 */
const ClaimStatusBadge: React.FC<ClaimStatusBadgeProps> = ({ claim }) => {
  const status = getClaimStatus(claim);
  
  return (
    <Badge 
      variant="outline" 
      className={`${statusVariants[status as keyof typeof statusVariants] || statusVariants.UNKNOWN} border pointer-events-none`}
    >
      {status}
    </Badge>
  );
};

export default ClaimStatusBadge;
