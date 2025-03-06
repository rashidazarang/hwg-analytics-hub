
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TopAgent, TopDealer } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface LeaderboardChartsProps {
  topAgents: TopAgent[];
  topDealers: TopDealer[];
  isLoading: boolean;
}

const LeaderboardCharts: React.FC<LeaderboardChartsProps> = ({
  topAgents,
  topDealers,
  isLoading,
}) => {
  // Format the top dealers data for the chart
  const dealersChartData = topDealers?.slice(0, 5).map(dealer => ({
    name: dealer.dealer_name.length > 15 
      ? `${dealer.dealer_name.substring(0, 15)}...` 
      : dealer.dealer_name,
    revenue: parseFloat(dealer.total_revenue.toString()),
    contracts: dealer.total_contracts,
    fullName: dealer.dealer_name,
  })).reverse() || [];

  // Format the top agents data for the chart
  const agentsChartData = topAgents?.slice(0, 5).map(agent => ({
    name: agent.agent_name.length > 15 
      ? `${agent.agent_name.substring(0, 15)}...` 
      : agent.agent_name,
    revenue: parseFloat(agent.total_revenue.toString()),
    contracts: agent.contracts_closed,
    fullName: agent.agent_name,
  })).reverse() || [];

  // Custom tooltip for the charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background p-3 border rounded shadow-sm">
          <p className="font-medium">{payload[0]?.payload.fullName}</p>
          <p>Revenue: {formatCurrency(payload[0]?.value)}</p>
          <p>Contracts: {payload[1]?.value}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <Card>
        <CardHeader>
          <CardTitle>Top Dealers by Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="h-6 w-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin"></div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={dealersChartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
                <Bar dataKey="contracts" fill="#3b82f6" name="Contracts" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Agents by Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="h-6 w-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin"></div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={agentsChartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
                <Bar dataKey="contracts" fill="#3b82f6" name="Contracts" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LeaderboardCharts;
