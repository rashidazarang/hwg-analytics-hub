import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Claim, getClaimFinancialSummary } from '@/hooks/useClaimDetail';
import { formatCurrency } from '@/utils/formatters';

interface ClaimFinancialSummaryProps {
  claim: Claim;
}

const ClaimFinancialSummary: React.FC<ClaimFinancialSummaryProps> = ({ claim }) => {
  const financial = getClaimFinancialSummary(claim);
  
  // Calculate percentages for the progress bars
  const maxAmount = Math.max(financial.totalRequested, financial.totalApproved, financial.totalPaid, 1);
  const requestedPercentage = (financial.totalRequested / maxAmount) * 100;
  const approvedPercentage = (financial.totalApproved / maxAmount) * 100;
  const paidPercentage = (financial.totalPaid / maxAmount) * 100;
  
  // Calculate approval rate
  const approvalRate = financial.totalRequested > 0 
    ? (financial.totalApproved / financial.totalRequested) * 100 
    : 0;
  
  // Calculate payment rate (against approved)
  const paymentRate = financial.totalApproved > 0 
    ? (financial.totalPaid / financial.totalApproved) * 100 
    : 0;
  
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg">Financial Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress bars showing relative amounts */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Requested</span>
              <span className="text-sm font-medium">{formatCurrency(financial.totalRequested)}</span>
            </div>
            <Progress value={requestedPercentage} className="h-2 bg-muted [&>div]:bg-blue-500" />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Approved</span>
              <span className="text-sm font-medium">{formatCurrency(financial.totalApproved)}</span>
            </div>
            <Progress value={approvedPercentage} className="h-2 bg-muted [&>div]:bg-green-500" />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Paid</span>
              <span className="text-sm font-medium">{formatCurrency(financial.totalPaid)}</span>
            </div>
            <Progress value={paidPercentage} className="h-2 bg-muted [&>div]:bg-indigo-500" />
          </div>
        </div>
        
        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Approval Rate</p>
            <p className="text-2xl font-bold">
              {approvalRate.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">
              Of requested amount
            </p>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Payment Rate</p>
            <p className="text-2xl font-bold">
              {paymentRate.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">
              Of approved amount
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClaimFinancialSummary; 