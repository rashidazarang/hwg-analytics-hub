import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  FileText, 
  DollarSign, 
  Clock, 
  AlertTriangle, 
  Wrench, 
  CheckSquare 
} from 'lucide-react';
import { Claim, getClaimDuration, getClaimFinancialSummary } from '@/hooks/useClaimDetail';
import { formatCurrency } from '@/utils/formatters';

interface ClaimDetailsProps {
  claim: Claim;
}

const ClaimDetails: React.FC<ClaimDetailsProps> = ({ claim }) => {
  const duration = getClaimDuration(claim);
  const financial = getClaimFinancialSummary(claim);

  // Helper function to display a text field with proper formatting
  const renderTextField = (label: string, value: string | null | undefined, icon: React.ReactNode) => {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-medium">{label}</h3>
        </div>
        <div className="pl-6">
          <p className="text-sm whitespace-pre-wrap">
            {value || 'No information provided'}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
      {/* Left column: Problem details */}
      <Card className="col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">Claim Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {renderTextField('Complaint', claim.Complaint, <AlertTriangle className="h-4 w-4 text-amber-500" />)}
          {renderTextField('Cause', claim.Cause, <FileText className="h-4 w-4 text-blue-500" />)}
          {renderTextField('Correction', claim.Correction, <Wrench className="h-4 w-4 text-green-500" />)}
        </CardContent>
      </Card>

      {/* Right column: Financial summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Financial Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Deductible:</span>
            </div>
            <span className="font-medium">{claim.Deductible ? formatCurrency(claim.Deductible) : 'N/A'}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              <span className="text-muted-foreground">Total Requested:</span>
            </div>
            <span className="font-medium">{formatCurrency(financial.totalRequested)}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-blue-500" />
              <span className="text-muted-foreground">Total Approved:</span>
            </div>
            <span className="font-medium">{formatCurrency(financial.totalApproved)}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-indigo-500" />
              <span className="text-muted-foreground">Total Paid:</span>
            </div>
            <span className="font-medium">{formatCurrency(financial.totalPaid)}</span>
          </div>

          {duration !== null && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Claim Duration:</span>
              </div>
              <span className="font-medium">{duration} {duration === 1 ? 'day' : 'days'}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClaimDetails; 