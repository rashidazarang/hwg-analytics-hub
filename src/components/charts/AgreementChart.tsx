
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRange } from '@/lib/dateUtils';
import { useAgreementStatusData } from '@/hooks/useAgreementStatusData';
import { AgreementPieChart } from './AgreementPieChart';

type AgreementChartProps = {
  dateRange: DateRange;
  dealerFilter?: string;
};

const AgreementChart: React.FC<AgreementChartProps> = ({ dateRange, dealerFilter = '' }) => {
  const { data: statusData = [], isLoading } = useAgreementStatusData(dateRange, dealerFilter);

  return (
    <Card className="h-full card-hover-effect">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">
          Agreement Status Distribution
          {dealerFilter && (
            <span className="text-sm font-normal text-muted-foreground ml-2">
              (Filtered by: {dealerFilter})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <AgreementPieChart data={statusData} isLoading={isLoading} />
      </CardContent>
    </Card>
  );
};

export default AgreementChart;
