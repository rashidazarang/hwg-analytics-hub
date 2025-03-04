import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from '@/lib/dateUtils';
import { getClaimStatus, isClaimDenied } from '@/utils/claimUtils';

type ClaimChartProps = {
  dateRange: DateRange;
  dealershipFilter?: string;
};

const fetchClaimsData = async (dateRange: DateRange, dealershipFilter?: string) => {
  console.log('[CLAIMCHART_FETCH] Fetching claims with filters:', {
    dateRange,
    dealershipFilter,
    fromDate: dateRange.from.toISOString(),
    toDate: dateRange.to.toISOString()
  });
  
  try {
    let query = supabase
      .from("claims")
      .select(`
        id,
        ClaimID, 
        ReportedDate, 
        Closed,
        Cause,
        Correction,
        LastModified,
        agreements(DealerUUID, dealers(Payee))
      `)
      // Use LastModified for date filtering to be consistent with ClaimsTable
      .gte('LastModified', dateRange.from.toISOString())
      .lte('LastModified', dateRange.to.toISOString());
    
    if (dealershipFilter && dealershipFilter.trim() !== '') {
      console.log('[CLAIMCHART_FILTER] Filtering by dealership UUID:', dealershipFilter);
      query = query.eq('agreements.DealerUUID', dealershipFilter);
    }

    const { data: claims, error } = await query;

    if (error) {
      console.error('[CLAIMCHART_ERROR] Error fetching claims:', error);
      return [];
    }

    console.log(`[CLAIMCHART_RESULT] Fetched ${claims?.length || 0} claims`);
    
    return claims || [];
  } catch (error) {
    console.error('[CLAIMCHART_ERROR] Error in fetchClaimsData:', error);
    return [];
  }
};

const ClaimChart: React.FC<ClaimChartProps> = ({
  dateRange,
  dealershipFilter
}) => {
  const [animatedData, setAnimatedData] = useState<any[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const {
    data: claims = [],
    isFetching,
    isError
  } = useQuery({
    queryKey: ['claims-chart', dateRange.from, dateRange.to, dealershipFilter],
    queryFn: () => fetchClaimsData(dateRange, dealershipFilter),
    staleTime: 1000 * 60 * 10
  });

  const processedData = React.useMemo(() => {
    console.log('[CLAIMCHART_PROCESS] Processing claims data:', claims.length);
    const statusCounts = {
      OPEN: 0,
      PENDING: 0,
      CLOSED: 0,
      DENIED: 0
    };

    claims.forEach(claim => {
      const status = getClaimStatus(claim);
      statusCounts[status as keyof typeof statusCounts] = 
        (statusCounts[status as keyof typeof statusCounts] || 0) + 1;
    });

    const chartData = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
      percentage: claims.length > 0 ? Math.round(count / claims.length * 100) : 0
    }));

    console.log('[CLAIMCHART_PROCESSED] Processed claim counts:', chartData);
    return chartData;
  }, [claims]);

  useEffect(() => {
    if (processedData.length > 0) {
      setAnimatedData(processedData);
    } else {
      setAnimatedData([]);
    }
  }, [processedData]);

  console.log('[CLAIMCHART_RENDER] Rendering chart with data:', processedData);

  const onBarEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onBarLeave = () => {
    setActiveIndex(null);
  };

  const COLORS = {
    OPEN: '#10b981',
    PENDING: '#f59e0b',
    CLOSED: '#ef4444',
    DENIED: '#64748b'
  };

  const CustomTooltip = ({
    active,
    payload
  }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return <div className="bg-white p-2 rounded-md shadow-md border border-gray-100">
          <p className="text-sm font-medium">
            {data.status.toUpperCase()}: {data.count.toLocaleString()} Claims
          </p>
        </div>;
    }
    return null;
  };

  const renderLegendText = (value: string) => {
    return <span className="text-xs font-medium">{value.toUpperCase()}</span>;
  };

  const CustomizedLegend = (props: any) => {
    const {
      payload
    } = props;
    return <div className="flex justify-center items-center gap-4 mt-2">
        {payload.map((entry: any, index: number) => <div key={`legend-${index}`} className="flex items-center">
            <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{
          backgroundColor: entry.color
        }} />
            <span className="text-xs font-medium">{entry.value.toUpperCase()}</span>
          </div>)}
      </div>;
  };

  if (isError) {
    return <Card className="h-full card-hover-effect">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium">Claims Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[240px] text-destructive">
            Error loading claims data. Please try again.
          </div>
        </CardContent>
      </Card>;
  }

  return <Card className="h-full card-hover-effect">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">
          Claims Status Distribution
          {dealershipFilter && <span className=""></span>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isFetching ? <div className="flex items-center justify-center h-[240px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div> : animatedData.length === 0 || animatedData.every(d => d.count === 0) ? <div className="flex items-center justify-center h-[240px] text-muted-foreground">
            No claims data available for the selected filters.
          </div> : <div className="flex flex-col h-[240px]">
            <ResponsiveContainer width="100%" height="85%">
              <BarChart layout="vertical" data={animatedData} margin={{
            top: 20,
            right: 30,
            left: 0,
            bottom: 20
          }} barSize={20} barGap={8} barCategoryGap={12}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                <YAxis dataKey="status" type="category" axisLine={false} tickLine={false} hide={true} />
                <XAxis type="number" axisLine={false} tickLine={false} tick={false} domain={[0, 'auto']} />
                <Tooltip content={<CustomTooltip />} cursor={{
              fill: 'rgba(0, 0, 0, 0.05)'
            }} />
                <Bar dataKey="count" radius={[4, 4, 4, 4]} onMouseEnter={onBarEnter} onMouseLeave={onBarLeave} animationBegin={0} animationDuration={800} animationEasing="ease-in-out">
                  {animatedData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[entry.status as keyof typeof COLORS] || '#777'} stroke={activeIndex === index ? 'rgba(255,255,255,0.3)' : 'transparent'} strokeWidth={activeIndex === index ? 2 : 0} className="transition-all duration-200" style={{
                filter: activeIndex === index ? 'drop-shadow(0 0 4px rgba(0,0,0,0.2))' : 'none',
                opacity: activeIndex === null || activeIndex === index ? 1 : 0.7,
                transition: 'opacity 0.3s, filter 0.3s'
              }} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            
            <div className="flex justify-center items-center gap-4 mt-2 mb-1">
              <div className="flex items-center">
                <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{
              backgroundColor: '#10b981'
            }}></span>
                <span className="text-xs font-medium">OPEN</span>
              </div>
              <div className="flex items-center">
                <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{
              backgroundColor: '#f59e0b'
            }}></span>
                <span className="text-xs font-medium">PENDING</span>
              </div>
              <div className="flex items-center">
                <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{
              backgroundColor: '#ef4444'
            }}></span>
                <span className="text-xs font-medium">CLOSED</span>
              </div>
              <div className="flex items-center">
                <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{
              backgroundColor: '#64748b'
            }}></span>
                <span className="text-xs font-medium">DENIED</span>
              </div>
            </div>
          </div>}
      </CardContent>
    </Card>;
};

export default ClaimChart;
