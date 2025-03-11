import React from 'react';
import { DealerProfile } from '@/hooks/useDealerProfileData';
import { formatCurrency } from '@/lib/utils';
import KPICard from '@/components/metrics/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileSignature, AlertTriangle, Banknote, BarChart, Calendar, Activity, BadgePercent } from 'lucide-react';

interface DealerProfileMetricsProps {
  profile: DealerProfile;
  isLoading: boolean;
}

const DealerProfileMetrics: React.FC<DealerProfileMetricsProps> = ({ profile, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
        ))}
      </div>
    );
  }

  // Calculate the percentage of cancelled contracts
  const cancelledPercentage = profile.total_contracts > 0 
    ? (profile.cancelled_contracts / profile.total_contracts) * 100 
    : 0;

  return (
    <div className="mb-6">
      <Tabs defaultValue="agreements" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="agreements" className="data-[state=active]:bg-primary/10">
            <FileSignature className="h-4 w-4 mr-2" />
            Agreements
          </TabsTrigger>
          <TabsTrigger value="claims" className="data-[state=active]:bg-primary/10">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Claims
          </TabsTrigger>
          <TabsTrigger value="revenue" className="data-[state=active]:bg-primary/10">
            <Banknote className="h-4 w-4 mr-2" />
            Revenue
          </TabsTrigger>
        </TabsList>

        {/* Agreements Metrics */}
        <TabsContent value="agreements" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Total Agreements"
              value={profile.total_contracts.toLocaleString()}
              icon={FileSignature}
              color="primary"
            />
            <KPICard
              title="Active Agreements"
              value={profile.active_contracts.toLocaleString()}
              icon={Activity}
              color="success"
            />
            <KPICard
              title="Pending Agreements"
              value={profile.pending_contracts.toLocaleString()}
              icon={Calendar}
              color="warning"
            />
            <KPICard
              title="Cancelled Agreements"
              value={profile.cancelled_contracts.toLocaleString()}
              icon={BadgePercent}
              color={cancelledPercentage > 15 ? "destructive" : "default"}
            />
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Agreement Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Active agreements progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Active</span>
                    <span className="font-medium">{(profile.active_contracts / profile.total_contracts * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <div 
                      className="bg-green-500 h-2.5 rounded-full" 
                      style={{ width: `${(profile.active_contracts / profile.total_contracts * 100).toFixed(1)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Pending agreements progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Pending</span>
                    <span className="font-medium">{(profile.pending_contracts / profile.total_contracts * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <div 
                      className="bg-amber-500 h-2.5 rounded-full" 
                      style={{ width: `${(profile.pending_contracts / profile.total_contracts * 100).toFixed(1)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Cancelled agreements progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Cancelled</span>
                    <span className="font-medium">{(profile.cancelled_contracts / profile.total_contracts * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <div 
                      className="bg-red-500 h-2.5 rounded-full" 
                      style={{ width: `${(profile.cancelled_contracts / profile.total_contracts * 100).toFixed(1)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Expired agreements progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Expired</span>
                    <span className="font-medium">{(profile.expired_contracts / profile.total_contracts * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <div 
                      className="bg-gray-500 h-2.5 rounded-full" 
                      style={{ width: `${(profile.expired_contracts / profile.total_contracts * 100).toFixed(1)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Claims Metrics */}
        <TabsContent value="claims" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Total Claims"
              value={profile.total_claims.toLocaleString()}
              icon={AlertTriangle}
              color="warning"
            />
            <KPICard
              title="Open Claims"
              value={profile.open_claims.toLocaleString()}
              icon={AlertTriangle}
              color="primary"
            />
            <KPICard
              title="Closed Claims"
              value={profile.closed_claims.toLocaleString()}
              icon={AlertTriangle}
              color="success"
            />
            <KPICard
              title="Average Resolution"
              value={`${Math.round(profile.avg_claim_resolution_days)} days`}
              icon={Calendar}
              color={profile.avg_claim_resolution_days > 30 ? "destructive" : "default"}
            />
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Claims Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Claims per agreement */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium">Claims per Agreement</h3>
                  <div className="flex items-center">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                      <span className="font-bold text-primary">{profile.claims_per_contract.toFixed(2)}</span>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {profile.claims_per_contract > 0.5 
                          ? 'Above average claims ratio'
                          : profile.claims_per_contract < 0.1
                            ? 'Very low claims ratio'
                            : 'Average claims ratio'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Claims resolution efficiency */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium">Resolution Efficiency</h3>
                  <div className="flex items-center">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-3 
                      ${profile.avg_claim_resolution_days > 30 
                        ? 'bg-red-100 text-red-600' 
                        : profile.avg_claim_resolution_days < 15
                          ? 'bg-green-100 text-green-600'
                          : 'bg-amber-100 text-amber-600'}`}
                    >
                      <span className="font-bold">
                        {profile.avg_claim_resolution_days > 30 
                          ? 'Slow' 
                          : profile.avg_claim_resolution_days < 15
                            ? 'Fast'
                            : 'Avg'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {profile.avg_claim_resolution_days > 30 
                          ? 'Claims take longer than average to resolve'
                          : profile.avg_claim_resolution_days < 15
                            ? 'Claims are resolved quickly'
                            : 'Average resolution time'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revenue Metrics */}
        <TabsContent value="revenue" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Total Revenue"
              value={formatCurrency(profile.total_revenue)}
              icon={Banknote}
              color="success"
            />
            <KPICard
              title="Expected Revenue"
              value={formatCurrency(profile.expected_revenue)}
              icon={Banknote}
              color="warning"
            />
            <KPICard
              title="Funded Revenue"
              value={formatCurrency(profile.funded_revenue)}
              icon={Banknote}
              color="primary"
            />
            <KPICard
              title="Average Contract Value"
              value={formatCurrency(profile.total_contracts > 0 
                ? profile.total_revenue / profile.total_contracts 
                : 0)}
              icon={BarChart}
              color="default"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Revenue Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Total revenue */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Revenue</span>
                      <span className="font-medium">{formatCurrency(profile.total_revenue)}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div 
                        className="bg-green-500 h-2.5 rounded-full" 
                        style={{ width: '100%' }}
                      ></div>
                    </div>
                  </div>

                  {/* Expected revenue */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Expected Revenue</span>
                      <span className="font-medium">{formatCurrency(profile.expected_revenue)}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div 
                        className="bg-amber-500 h-2.5 rounded-full" 
                        style={{ width: `${(profile.expected_revenue / profile.total_revenue * 100).toFixed(1)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Funded revenue */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Funded Revenue</span>
                      <span className="font-medium">{formatCurrency(profile.funded_revenue)}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div 
                        className="bg-blue-500 h-2.5 rounded-full" 
                        style={{ width: `${(profile.funded_revenue / profile.total_revenue * 100).toFixed(1)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Revenue Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Active Contracts Value */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="text-sm font-medium">Active Contracts Value</h3>
                      <p className="text-xs text-muted-foreground">
                        Revenue from active agreements
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {formatCurrency(profile.active_contracts * (profile.total_contracts > 0 
                          ? profile.total_revenue / profile.total_contracts 
                          : 0))}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {profile.active_contracts} contracts
                      </div>
                    </div>
                  </div>

                  {/* Cancellation Impact */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="text-sm font-medium">Cancellation Impact</h3>
                      <p className="text-xs text-muted-foreground">
                        Estimated revenue lost to cancellations
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {formatCurrency(profile.cancelled_contracts * (profile.total_contracts > 0 
                          ? profile.total_revenue / profile.total_contracts 
                          : 0))}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {profile.cancelled_contracts} cancellations
                      </div>
                    </div>
                  </div>

                  {/* Divisor Line */}
                  <div className="border-t my-2"></div>

                  {/* Average Contract Value */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="text-sm font-medium">Average Contract Value</h3>
                      <p className="text-xs text-muted-foreground">
                        Revenue per contract
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {formatCurrency(profile.total_contracts > 0 
                          ? profile.total_revenue / profile.total_contracts 
                          : 0)}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DealerProfileMetrics;