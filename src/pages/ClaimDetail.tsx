import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useClaimDetail } from '@/hooks/useClaimDetail';
import { supabase } from '@/integrations/supabase/client';
import Dashboard from '@/components/layout/Dashboard';
import ClaimHeader from '@/components/claims/ClaimHeader';
import ClaimDetails from '@/components/claims/ClaimDetails';
import SubclaimsList from '@/components/claims/SubclaimsList';
import ClaimFinancialSummary from '@/components/claims/ClaimFinancialSummary';
import ClaimTimeline from '@/components/claims/ClaimTimeline';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer, Download } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { DateRange } from '@/lib/dateUtils';
import { useAtom } from 'jotai';
import { globalDateRangeAtom } from '@/contexts/DateFilterContext';

// Function to generate placeholder skeletons during loading
const ClaimDetailSkeleton = () => (
  <>
    <div className="mb-6">
      <Skeleton className="h-[200px] w-full rounded-lg" />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
      <Skeleton className="h-[300px] w-full rounded-lg col-span-1 lg:col-span-2" />
      <Skeleton className="h-[300px] w-full rounded-lg" />
    </div>
    <Skeleton className="h-[400px] w-full rounded-lg mb-6" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      <Skeleton className="h-[300px] w-full rounded-lg" />
      <Skeleton className="h-[300px] w-full rounded-lg" />
    </div>
  </>
);

const ClaimDetail = () => {
  const { claimId } = useParams<{ claimId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useAtom(globalDateRangeAtom);
  
  const { 
    data: claim, 
    isLoading, 
    isError, 
    error 
  } = useClaimDetail(claimId || '');
  
  // Check for valid session
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate('/auth');
      }
    };
    
    checkSession();
  }, [navigate]);
  
  // Handle error state
  useEffect(() => {
    if (isError && error) {
      console.error('[CLAIM_DETAIL] Error loading claim:', error);
      toast({
        title: "Error loading claim details",
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: "destructive"
      });
    }
  }, [isError, error, toast]);
  
  // Navigation helper
  const handleBackClick = () => {
    navigate('/claims');
  };
  
  // Export helper (placeholder)
  const handleExportClick = () => {
    toast({
      title: "Export initiated",
      description: "The claim details are being prepared for export",
    });
  };
  
  // Print helper
  const handlePrintClick = () => {
    window.print();
  };
  
  // Handle date range changes (required by Dashboard component)
  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
  };
  
  const subnavbarContent = (
    <div className="flex items-center gap-2">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleBackClick}
        className="gap-1"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Claims
      </Button>
      
      <div className="hidden md:flex items-center gap-2 ml-auto">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleExportClick}
          className="gap-1"
        >
          <Download className="h-4 w-4" />
          Export
        </Button>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handlePrintClick}
          className="gap-1 print:hidden"
        >
          <Printer className="h-4 w-4" />
          Print
        </Button>
      </div>
    </div>
  );
  
  return (
    <Dashboard 
      pageTitle={isLoading ? "Loading Claim..." : `Claim: ${claim?.ClaimID || 'Not Found'}`}
      subnavbar={subnavbarContent}
      onDateRangeChange={handleDateRangeChange}
      kpiSection={<div />} // Empty div as placeholder since we don't need KPIs here
      hideDefaultDateFilter={true} // Hide the date filter as it's not relevant for the claim detail page
    >
      <div className="pb-12 print:p-4">
        {isLoading ? (
          <ClaimDetailSkeleton />
        ) : isError ? (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-2">Error Loading Claim</h2>
            <p className="text-muted-foreground mb-4">
              {error instanceof Error ? error.message : 'An unknown error occurred'}
            </p>
            <Button onClick={handleBackClick}>Return to Claims List</Button>
          </div>
        ) : !claim ? (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-2">Claim Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The claim you are looking for could not be found.
            </p>
            <Button onClick={handleBackClick}>Return to Claims List</Button>
          </div>
        ) : (
          <>
            <ClaimHeader claim={claim} />
            <ClaimDetails claim={claim} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <ClaimFinancialSummary claim={claim} />
              <ClaimTimeline claim={claim} />
            </div>
            
            <SubclaimsList claim={claim} />
          </>
        )}
      </div>
    </Dashboard>
  );
};

export default ClaimDetail; 