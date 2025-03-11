import { DealerProfile } from '@/hooks/useDealerProfileData';

/**
 * Calculate a performance rating score for a dealer (1-5 stars)
 * based on multiple factors including cancellations, claims, and revenue
 */
export function calculatePerformanceRating(profile: DealerProfile): number {
  // If no contracts, return a default rating
  if (!profile?.total_contracts) {
    return 3;
  }

  // Start with a base score
  let score = 3;

  // Factor 1: Cancellation rate (lower is better)
  if (profile.cancellation_rate < 5) {
    score += 1; // Very low cancellation is good
  } else if (profile.cancellation_rate > 15) {
    score -= 1; // High cancellation is bad
  }

  // Factor 2: Claims per contract (lower is better)
  if (profile.claims_per_contract < 0.1) {
    score += 0.5; // Very few claims is good
  } else if (profile.claims_per_contract > 0.5) {
    score -= 0.5; // Many claims is bad
  }

  // Factor 3: Volume (higher is better, indicates trust)
  if (profile.total_contracts > 100) {
    score += 0.5; // High volume dealer
  }

  // Factor 4: Revenue (higher is better)
  const avgContractValue = profile.total_revenue / profile.total_contracts;
  if (avgContractValue > 2000) {
    score += 0.5; // High value contracts
  }

  // Ensure score is between 1 and 5
  return Math.max(1, Math.min(5, Math.round(score)));
}

/**
 * Determines the trend in the monthly revenue data (up, down, stable)
 */
export function getRevenueTrend(monthlyData: { total_revenue: number }[]): {
  trend: 'up' | 'down' | 'stable';
  percentage: number;
} {
  if (!monthlyData || monthlyData.length < 2) {
    return { trend: 'stable', percentage: 0 };
  }

  // Compare last two months
  const lastMonth = monthlyData[monthlyData.length - 1]?.total_revenue || 0;
  const previousMonth = monthlyData[monthlyData.length - 2]?.total_revenue || 0;

  if (previousMonth === 0) {
    return { trend: 'stable', percentage: 0 };
  }

  const changePercentage = ((lastMonth - previousMonth) / previousMonth) * 100;

  if (changePercentage > 5) {
    return { trend: 'up', percentage: changePercentage };
  } else if (changePercentage < -5) {
    return { trend: 'down', percentage: Math.abs(changePercentage) };
  } else {
    return { trend: 'stable', percentage: Math.abs(changePercentage) };
  }
}