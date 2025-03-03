
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRange } from '@/lib/dateUtils';
import { useAgreementStatusData } from '@/hooks/useAgreementStatusData';
import { AgreementPieChart } from './AgreementPieChart';

type AgreementChartProps = {
  dateRange: DateRange;
};

const AgreementChart: React.FC<AgreementChartProps> = ({ dateRange }) => {
  const { data: statusData = [], isLoading } = useAgreementStatusData(dateRange);

  return (
    <Card className="h-full card-hover-effect">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">Agreement Status Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <AgreementPieChart data={statusData} isLoading={isLoading} />
      </CardContent>
    </Card>
  );
};

export default AgreementChart;
