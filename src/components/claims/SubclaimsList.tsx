import React, { useState } from 'react';
import { format } from 'date-fns';
import { 
  ChevronDown, 
  ChevronRight, 
  DollarSign, 
  FileText, 
  CalendarCheck, 
  User, 
  FileSpreadsheet,
  Wrench
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Claim, Subclaim, SubclaimPart } from '@/hooks/useClaimDetail';
import { formatCurrency } from '@/utils/formatters';
import SubclaimPartsTable from './SubclaimPartsTable';

// Status variants for subclaim status badges
const subclaim_status_variants = {
  PAID: 'bg-success/15 text-success border-success/20',
  PENDING: 'bg-warning/15 text-warning border-warning/20',
  REJECTED: 'bg-destructive/15 text-destructive border-destructive/20',
  UNKNOWN: 'bg-muted/30 text-muted-foreground border-muted/40'
};

interface SubclaimsListProps {
  claim: Claim;
}

const SubclaimsList: React.FC<SubclaimsListProps> = ({ claim }) => {
  // Keep track of which subclaims are expanded
  const [expandedSubclaims, setExpandedSubclaims] = useState<Record<string, boolean>>({});
  
  const toggleSubclaim = (subclaim: Subclaim) => {
    setExpandedSubclaims(prev => ({
      ...prev,
      [subclaim.SubClaimID]: !prev[subclaim.SubClaimID]
    }));
  };
  
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'MMM d, yyyy');
  };
  
  // Calculate total amount for a subclaim
  const getSubclaimTotal = (subclaim: Subclaim): number => {
    let total = 0;
    if (subclaim.parts) {
      subclaim.parts.forEach(part => {
        if (part.PaidPrice !== null) {
          total += part.PaidPrice * (part.Quantity || 1);
        }
      });
    }
    return total;
  };
  
  // Helper function to get status badge for a subclaim
  const getStatusBadge = (status: string) => {
    const normalizedStatus = status.toUpperCase();
    const badgeClass = subclaim_status_variants[normalizedStatus as keyof typeof subclaim_status_variants] || 
                       subclaim_status_variants.UNKNOWN;
    
    return (
      <Badge 
        variant="outline" 
        className={`${badgeClass} border pointer-events-none`}
      >
        {normalizedStatus}
      </Badge>
    );
  };
  
  if (!claim.subclaims || claim.subclaims.length === 0) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Subclaims</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No subclaims found for this claim.
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg">Subclaims ({claim.subclaims.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {claim.subclaims.map((subclaim) => (
          <div 
            key={subclaim.SubClaimID} 
            className="border rounded-lg overflow-hidden"
          >
            {/* Subclaim header - always visible */}
            <div 
              className="flex items-center justify-between px-4 py-3 bg-muted/20 cursor-pointer"
              onClick={() => toggleSubclaim(subclaim)}
            >
              <div className="flex items-center gap-3">
                {expandedSubclaims[subclaim.SubClaimID] ? 
                  <ChevronDown className="h-4 w-4" /> : 
                  <ChevronRight className="h-4 w-4" />
                }
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="font-medium">{subclaim.SubClaimID}</span>
                  <div className="hidden sm:block text-muted-foreground">•</div>
                  <span className="text-sm text-muted-foreground">{subclaim.Payee}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {getStatusBadge(subclaim.Status)}
                <span className="font-medium">{formatCurrency(getSubclaimTotal(subclaim))}</span>
              </div>
            </div>
            
            {/* Expanded subclaim details */}
            {expandedSubclaims[subclaim.SubClaimID] && (
              <div className="p-4 border-t">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {/* Left column: Basic info */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Payee:</span>
                      <span className="font-medium">{subclaim.Payee}</span>
                    </div>
                    
                    {subclaim.RepairOrder && (
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Repair Order:</span>
                        <span className="font-medium">{subclaim.RepairOrder}</span>
                      </div>
                    )}
                    
                    {subclaim.ServiceWriter && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Service Writer:</span>
                        <span className="font-medium">{subclaim.ServiceWriter}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Right column: Dates */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Created:</span>
                      <span className="font-medium">{formatDate(subclaim.Created)}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Closed:</span>
                      <span className="font-medium">{formatDate(subclaim.Closed)}</span>
                    </div>
                  </div>
                </div>
                
                {/* Problem details */}
                {(subclaim.Complaint || subclaim.Cause || subclaim.Correction) && (
                  <div className="space-y-4 mb-6 px-2">
                    {subclaim.Complaint && (
                      <div className="space-y-1">
                        <h4 className="text-sm font-medium">Complaint</h4>
                        <p className="text-sm whitespace-pre-wrap">{subclaim.Complaint}</p>
                      </div>
                    )}
                    
                    {subclaim.Cause && (
                      <div className="space-y-1">
                        <h4 className="text-sm font-medium">Cause</h4>
                        <p className="text-sm whitespace-pre-wrap">{subclaim.Cause}</p>
                      </div>
                    )}
                    
                    {subclaim.Correction && (
                      <div className="space-y-1">
                        <h4 className="text-sm font-medium">Correction</h4>
                        <p className="text-sm whitespace-pre-wrap">{subclaim.Correction}</p>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Parts table */}
                {subclaim.parts && subclaim.parts.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-muted-foreground" />
                      Parts ({subclaim.parts.length})
                    </h4>
                    <SubclaimPartsTable parts={subclaim.parts} />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default SubclaimsList; 