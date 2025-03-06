
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Bell, Info, ArrowRight } from 'lucide-react';
import { KPIData } from '@/lib/types';
import { DateRange } from '@/lib/dateUtils';

interface DashboardAlertsProps {
  kpiData?: KPIData;
  dateRange: DateRange;
}

const DashboardAlerts: React.FC<DashboardAlertsProps> = ({ kpiData, dateRange }) => {
  const hasHighCancellationRate = kpiData && kpiData.totalAgreements > 0 && 
    (kpiData.cancelledContracts / kpiData.totalAgreements) > 0.05;
  
  const hasPendingClaims = kpiData?.statusBreakdown?.PENDING && 
    kpiData.statusBreakdown.PENDING > 10;
  
  const hasHighOpenClaimsRatio = kpiData && kpiData.totalAgreements > 0 && 
    (kpiData.openClaims / kpiData.totalAgreements) > 0.1;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold tracking-tight">Alerts & Action Items</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="card-hover-effect">
          <CardHeader>
            <CardTitle className="text-lg font-medium flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5 text-warning" /> 
              Urgent Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(!kpiData || (!hasHighCancellationRate && !hasPendingClaims && !hasHighOpenClaimsRatio)) ? (
              <div className="text-center py-4 text-muted-foreground">
                No urgent alerts at this time
              </div>
            ) : (
              <>
                {hasHighCancellationRate && (
                  <Alert variant="destructive">
                    <AlertTitle className="font-medium">High Cancellation Rate</AlertTitle>
                    <AlertDescription>
                      Cancellation rate is {((kpiData.cancelledContracts / kpiData.totalAgreements) * 100).toFixed(1)}% in the selected period, 
                      which is above the 5% threshold.
                    </AlertDescription>
                  </Alert>
                )}
                
                {hasPendingClaims && (
                  <Alert>
                    <AlertTitle className="font-medium">Pending Claims Require Attention</AlertTitle>
                    <AlertDescription>
                      {kpiData.statusBreakdown?.PENDING} claims are currently pending and require review.
                    </AlertDescription>
                  </Alert>
                )}
                
                {hasHighOpenClaimsRatio && (
                  <Alert>
                    <AlertTitle className="font-medium">High Open Claims Ratio</AlertTitle>
                    <AlertDescription>
                      Open claims represent {((kpiData.openClaims / kpiData.totalAgreements) * 100).toFixed(1)}% of active agreements, 
                      which is above the 10% threshold.
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </CardContent>
        </Card>
        
        <Card className="card-hover-effect">
          <CardHeader>
            <CardTitle className="text-lg font-medium flex items-center">
              <Bell className="mr-2 h-5 w-5 text-primary" /> 
              Pending Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!kpiData ? (
              <div className="text-center py-4 text-muted-foreground">
                Loading action items...
              </div>
            ) : (
              <>
                {kpiData.pendingContracts > 0 && (
                  <div className="p-4 border rounded-md bg-muted/50">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium">Review Pending Agreements</h4>
                        <p className="text-sm text-muted-foreground">
                          {kpiData.pendingContracts} agreements pending review in the current period
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        className="flex items-center" 
                        onClick={() => window.location.href = '/agreements'}
                      >
                        Review <ArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
                
                {kpiData.statusBreakdown?.PENDING > 0 && (
                  <div className="p-4 border rounded-md bg-muted/50">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium">Process Pending Claims</h4>
                        <p className="text-sm text-muted-foreground">
                          {kpiData.statusBreakdown.PENDING} claims are awaiting processing
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        className="flex items-center" 
                        onClick={() => window.location.href = '/claims'}
                      >
                        Process <ArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
                
                {kpiData.openClaims > 0 && (
                  <div className="p-4 border rounded-md bg-muted/50">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium">Resolve Open Claims</h4>
                        <p className="text-sm text-muted-foreground">
                          {kpiData.openClaims} claims remain open and need resolution
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        className="flex items-center" 
                        onClick={() => window.location.href = '/claims'}
                      >
                        Resolve <ArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
                
                {kpiData.pendingContracts === 0 && kpiData.statusBreakdown?.PENDING === 0 && kpiData.openClaims === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    No pending actions at this time
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardAlerts;
