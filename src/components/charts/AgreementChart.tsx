
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRange } from '@/lib/dateUtils';
import { useAgreementStatusData } from '@/hooks/useAgreementStatusData';
import { AgreementPieChart } from './AgreementPieChart';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type AgreementChartProps = {
  dateRange: DateRange;
  dealerFilter?: string;
};

// Helper function to fetch dealer name by UUID
const fetchDealerNameByUUID = async (uuid: string): Promise<string> => {
  if (!uuid) return '';
  
  console.log('🔍 Fetching dealer name for UUID:', uuid);
  
  const { data, error } = await supabase
    .from('dealers')
    .select('Payee')
    .eq('DealerUUID', uuid)
    .single();
  
  if (error) {
    console.error('❌ Error fetching dealer name:', error);
    return '';
  }
  
  return data?.Payee || '';
};

const AgreementChart: React.FC<AgreementChartProps> = ({ dateRange, dealerFilter = '' }) => {
  // Add logging to verify the dealerFilter is being passed correctly
  console.log('🔍 AgreementChart - dealerFilter:', dealerFilter);
  
  const { data: statusData = [], isLoading: isStatusLoading } = useAgreementStatusData(dateRange, dealerFilter);
  
  // Fetch dealer name when dealerFilter changes
  const { data: dealerName = '', isLoading: isNameLoading } = useQuery({
    queryKey: ['dealer-name', dealerFilter],
    queryFn: () => fetchDealerNameByUUID(dealerFilter),
    enabled: !!dealerFilter,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
  
  const isLoading = isStatusLoading || (dealerFilter && isNameLoading);

  return (
    <Card className="h-full card-hover-effect">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">
          Agreement Status Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <AgreementPieChart data={statusData} isLoading={isLoading} />
      </CardContent>
    </Card>
  );
};

export default AgreementChart;
