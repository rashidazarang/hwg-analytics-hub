
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TopDealer, TopAgent } from '@/lib/types';

interface DashboardLeaderboardProps {
  topDealers?: TopDealer[];
  topAgents?: TopAgent[];
  isTopDealersLoading: boolean;
  isTopAgentsLoading: boolean;
}

const DashboardLeaderboard: React.FC<DashboardLeaderboardProps> = ({
  topDealers,
  topAgents,
  isTopDealersLoading,
  isTopAgentsLoading
}) => {
  const navigate = useNavigate();

  const formatCurrency = (value?: number) => {
    if (value === undefined) return 'N/A';
    return value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold tracking-tight">Leaderboard Highlights</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="card-hover-effect">
          <CardHeader>
            <CardTitle className="text-lg font-medium">Top Dealers by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {isTopDealersLoading ? (
              <div className="space-y-2">
                <div className="h-14 bg-gray-100 animate-pulse rounded"></div>
                <div className="h-14 bg-gray-100 animate-pulse rounded"></div>
                <div className="h-14 bg-gray-100 animate-pulse rounded"></div>
              </div>
            ) : topDealers && topDealers.length > 0 ? (
              <div className="space-y-3">
                {topDealers.map((dealer, index) => (
                  <div key={index} className="flex justify-between items-center border-b pb-2 last:border-0 last:pb-0">
                    <div>
                      <div className="font-medium">{dealer.dealer_name}</div>
                      <div className="text-sm text-muted-foreground">{dealer.total_contracts} contracts</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-primary">{formatCurrency(dealer.total_revenue)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">No dealer data available</div>
            )}
          </CardContent>
          <CardFooter>
            <Button 
              variant="link" 
              className="flex items-center ml-auto" 
              onClick={() => navigate('/leaderboard')}
            >
              View full leaderboard <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>

        <Card className="card-hover-effect">
          <CardHeader>
            <CardTitle className="text-lg font-medium">Top Agents by Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {isTopAgentsLoading ? (
              <div className="space-y-2">
                <div className="h-14 bg-gray-100 animate-pulse rounded"></div>
                <div className="h-14 bg-gray-100 animate-pulse rounded"></div>
                <div className="h-14 bg-gray-100 animate-pulse rounded"></div>
              </div>
            ) : topAgents && topAgents.length > 0 ? (
              <div className="space-y-3">
                {topAgents.map((agent, index) => (
                  <div key={index} className="flex justify-between items-center border-b pb-2 last:border-0 last:pb-0">
                    <div>
                      <div className="font-medium">{agent.agent_name}</div>
                      <div className="text-sm text-muted-foreground">{agent.contracts_closed} contracts closed</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-primary">{formatCurrency(agent.total_revenue)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">No agent data available</div>
            )}
          </CardContent>
          <CardFooter>
            <Button 
              variant="link" 
              className="flex items-center ml-auto" 
              onClick={() => navigate('/leaderboard')}
            >
              View full leaderboard <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default DashboardLeaderboard;
