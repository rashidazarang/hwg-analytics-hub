import { Claim } from '@/lib/types';

/**
 * Utility functions for claims management
 */

/**
 * Determines if a claim has been denied based on its correction field
 */
export function isClaimDenied(correction: string | null | undefined): boolean {
  if (!correction) return false;
  return /denied|not covered|rejected/i.test(correction);
}

/**
 * Determines the status of a claim based on its Closed, ReportedDate and Correction fields
 * STANDARDIZED to ensure consistent status determination across all components
 */
export function getClaimStatus(claim: Claim): string {
  // First check for closed claims
  if (claim.Closed) return 'CLOSED';
  
  // We'll no longer have a DENIED status as per requirements
  // Instead of treating denied claims as a separate status, we'll treat them according to other criteria
  
  // Then check for pending claims (no ReportedDate and not closed)
  if (!claim.ReportedDate && !claim.Closed) return 'PENDING';
  
  // Default to open for anything else (has ReportedDate but not closed)
  return 'OPEN';
}

/**
 * Status variant mapping for styling claim status badges
 * Updated to match the required color scheme
 */
export const statusVariants = {
  OPEN: 'bg-success/15 text-success border-success/20',
  PENDING: 'bg-warning/15 text-warning border-warning/20',
  CLOSED: 'bg-destructive/15 text-destructive border-destructive/20',
  UNKNOWN: 'bg-muted/30 text-muted-foreground border-muted/40'
};
