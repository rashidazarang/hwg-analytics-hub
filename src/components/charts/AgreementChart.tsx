
import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRange } from '@/lib/dateUtils';
import { useAgreementStatusData } from '@/hooks/useAgreementStatusData';
import { AgreementPieChart } from './AgreementPieChart';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type AgreementChartProps = {
  dateRange: DateRange;
  dealerFilter?: string;
};

// Helper function to fetch dealer name by UUID
const fetchDealerNameByUUID = async (uuid: string): Promise<string> => {
  if (!uuid) return '';
  
  console.log('🔍 Fetching dealer name for UUID:', uuid);
  
  try {
    const { data, error } = await supabase
      .from('dealers')
      .select('Payee')
      .eq('DealerUUID', uuid)
      .maybeSingle();
    
    if (error) {
      console.error('❌ Error fetching dealer name:', error);
      return '';
    }
    
    return data?.Payee || '';
  } catch (err) {
    console.error('❌ Exception in fetchDealerNameByUUID:', err);
    return '';
  }
};

const AgreementChart: React.FC<AgreementChartProps> = ({ dateRange, dealerFilter = '' }) => {
  // Add logging to verify the dealerFilter is being passed correctly
  useEffect(() => {
    console.log('🔍 AgreementChart - dateRange:', dateRange);
    console.log('🔍 AgreementChart - dealerFilter:', dealerFilter);
  }, [dateRange, dealerFilter]);
  
  const { 
    data: statusData = [], 
    isLoading: isStatusLoading,
    error: statusError 
  } = useAgreementStatusData(dateRange, dealerFilter);
  
  useEffect(() => {
    if (statusError) {
      console.error('❌ Error loading agreement status data:', statusError);
      toast.error('Failed to load agreement status data');
    }
  }, [statusError]);
  
  // Fetch dealer name when dealerFilter changes
  const { data: dealerName = '', isLoading: isNameLoading } = useQuery({
    queryKey: ['dealer-name', dealerFilter],
    queryFn: () => fetchDealerNameByUUID(dealerFilter),
    enabled: !!dealerFilter,
    staleTime: 1000 * 60 * 10, // 10 minutes
    retry: 3,
    retryDelay: (attempt) => Math.min(attempt * 1000, 5000), // Exponential backoff
  });
  
  const isLoading = isStatusLoading || (dealerFilter && isNameLoading);

  // Find the active agreements count
  const activeData = statusData.find(item => item.name === 'ACTIVE');
  const activeCount = activeData?.value || 0;

  useEffect(() => {
    console.log('👀 AgreementChart - statusData:', statusData);
    console.log('👀 AgreementChart - activeCount:', activeCount);
  }, [statusData, activeCount]);

  return (
    <Card className="h-full card-hover-effect">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">
          Agreement Status Distribution
          {dealerFilter && dealerName && ` - ${dealerName}`}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <AgreementPieChart data={statusData} isLoading={isLoading} />
      </CardContent>
    </Card>
  );
};

export default AgreementChart;
