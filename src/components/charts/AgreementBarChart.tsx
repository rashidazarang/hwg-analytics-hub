import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRange } from '@/lib/dateUtils';
import { useAgreementStatusData, STATUS_COLORS } from '@/hooks/useAgreementStatusData';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ChartLegend } from './ChartLegend';

type AgreementBarChartProps = {
  dateRange: DateRange;
  dealerFilter?: string;
};

const fetchDealerNameByUUID = async (uuid: string): Promise<string> => {
  if (!uuid) return '';
  
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

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-2 rounded-md shadow-md border border-gray-100">
        <p className="text-sm font-medium">
          {data.name}: {data.value.toLocaleString()} Agreements
        </p>
      </div>
    );
  }
  return null;
};

const AgreementBarChart: React.FC<AgreementBarChartProps> = ({ dateRange, dealerFilter = '' }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

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
  
  const { data: dealerName = '', isLoading: isNameLoading } = useQuery({
    queryKey: ['dealer-name', dealerFilter],
    queryFn: () => fetchDealerNameByUUID(dealerFilter),
    enabled: !!dealerFilter,
    staleTime: 1000 * 60 * 10,
  });
  
  const isLoading = isStatusLoading || (dealerFilter && isNameLoading);

  const onBarEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onBarLeave = () => {
    setActiveIndex(null);
  };

  const pieColors = {
    'ACTIVE': '#00B179',
    'PENDING': '#0079EE',
    'CANCELLED': '#FC912A',
    'OTHER': '#F6383F',
  };

  return (
    <Card className="h-full card-hover-effect">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">
          Agreement Status Distribution
          {dealerFilter && dealerName && ` - ${dealerName}`}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col h-[240px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-[85%]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : !statusData || statusData.length === 0 ? (
            <div className="flex items-center justify-center h-[85%] text-muted-foreground">
              No agreement data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="85%">
              <BarChart
                layout="vertical"
                data={statusData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 0,
                  bottom: 20
                }}
                barSize={20}
                barGap={8}
                barCategoryGap={12}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={true}
                  vertical={false}
                  stroke="#f0f0f0"
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  hide={true}
                />
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={false}
                  domain={[0, 'auto']}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="value"
                  radius={[4, 4, 4, 4]}
                  onMouseEnter={onBarEnter}
                  onMouseLeave={onBarLeave}
                  animationBegin={0}
                  animationDuration={800}
                  animationEasing="ease-in-out"
                >
                  {statusData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color || STATUS_COLORS[entry.name] || '#777'}
                      stroke={activeIndex === index ? 'rgba(255,255,255,0.3)' : 'transparent'}
                      strokeWidth={activeIndex === index ? 2 : 0}
                      className="transition-all duration-200"
                      style={{
                        filter: activeIndex === index ? 'drop-shadow(0 0 4px rgba(0,0,0,0.2))' : 'none',
                        opacity: activeIndex === null || activeIndex === index ? 1 : 0.7,
                        transition: 'opacity 0.3s, filter 0.3s'
                      }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          
          <ChartLegend statusColors={pieColors} />
        </div>
      </CardContent>
    </Card>
  );
};

export default AgreementBarChart;
