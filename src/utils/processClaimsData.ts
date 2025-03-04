
import { getClaimStatus } from './claimUtils';

export interface ProcessedClaimData {
  status: string;
  count: number;
  percentage: number;
}

export function processClaimsForChart(claims: any[]): ProcessedClaimData[] {
  console.log('[CLAIMCHART_PROCESS] Processing claims data:', claims.length);
  
  const statusCounts = {
    OPEN: 0,
    PENDING: 0,
    CLOSED: 0
  };

  claims.forEach(claim => {
    const status = getClaimStatus(claim);
    if (statusCounts.hasOwnProperty(status)) {
      statusCounts[status as keyof typeof statusCounts] = 
        (statusCounts[status as keyof typeof statusCounts] || 0) + 1;
    }
  });

  const chartData = Object.entries(statusCounts).map(([status, count]) => ({
    status,
    count,
    percentage: claims.length > 0 ? Math.round(count / claims.length * 100) : 0
  }));

  console.log('[CLAIMCHART_PROCESSED] Processed claim counts:', chartData);
  return chartData;
}
