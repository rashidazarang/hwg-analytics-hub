
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, FileSignature, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TopDealer, TopDealerClaims } from '@/lib/types';

interface DashboardLeaderboardProps {
  topDealers?: TopDealer[];
  topDealerClaims?: TopDealerClaims[];
  isTopDealersLoading: boolean;
  isTopDealerClaimsLoading: boolean;
}

const DashboardLeaderboard: React.FC<DashboardLeaderboardProps> = ({
  topDealers,
  topDealerClaims,
  isTopDealersLoading,
  isTopDealerClaimsLoading
}) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold tracking-tight">Leaderboard Highlights</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="card-hover-effect">
          <CardHeader>
            <CardTitle className="text-lg font-medium">Top Dealers</CardTitle>
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
                      <div className="text-sm text-muted-foreground">{dealer.total_contracts} total contracts</div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center text-sm">
                        <Clock className="mr-1 h-3 w-3 text-amber-500" />
                        <span>{dealer.pending_contracts || 0}</span>
                        <FileSignature className="ml-2 mr-1 h-3 w-3 text-blue-500" />
                        <span>{dealer.active_contracts || 0}</span>
                        <AlertTriangle className="ml-2 mr-1 h-3 w-3 text-red-500" />
                        <span>{dealer.cancelled_contracts}</span>
                      </div>
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
            <CardTitle className="text-lg font-medium">Dealer Claims</CardTitle>
          </CardHeader>
          <CardContent>
            {isTopDealerClaimsLoading ? (
              <div className="space-y-2">
                <div className="h-14 bg-gray-100 animate-pulse rounded"></div>
                <div className="h-14 bg-gray-100 animate-pulse rounded"></div>
                <div className="h-14 bg-gray-100 animate-pulse rounded"></div>
              </div>
            ) : topDealerClaims && topDealerClaims.length > 0 ? (
              <div className="space-y-3">
                {topDealerClaims.map((dealer, index) => (
                  <div key={index} className="flex justify-between items-center border-b pb-2 last:border-0 last:pb-0">
                    <div>
                      <div className="font-medium">{dealer.dealer_name}</div>
                      <div className="text-sm text-muted-foreground">{dealer.total_claims} total claims</div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center text-sm">
                        <FileSignature className="mr-1 h-3 w-3 text-blue-500" />
                        <span>{dealer.open_claims}</span>
                        <Clock className="ml-2 mr-1 h-3 w-3 text-amber-500" />
                        <span>{dealer.pending_claims}</span>
                        <CheckCircle className="ml-2 mr-1 h-3 w-3 text-green-500" />
                        <span>{dealer.closed_claims}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">No claim data available</div>
            )}
          </CardContent>
          <CardFooter>
            <Button 
              variant="link" 
              className="flex items-center ml-auto" 
              onClick={() => navigate('/claims')}
            >
              View all claims <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default DashboardLeaderboard;
