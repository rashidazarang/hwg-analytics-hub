
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
 * Determines the status of a claim based on its Closed and ReportedDate fields
 */
export function getClaimStatus(claim: any): string {
  if (claim.Closed && claim.ReportedDate) return 'CLOSED';
  if (claim.Closed && !claim.ReportedDate) return 'PENDING';
  if (claim.ReportedDate && !claim.Closed) return 'OPEN';
  return 'PENDING';
}

/**
 * Status variant mapping for styling claim status badges
 * Updated to match the required color scheme:
 * - Open: Green
 * - Pending: Yellow
 * - Closed: Red
 */
export const statusVariants = {
  OPEN: 'bg-success/15 text-success border-success/20',
  PENDING: 'bg-warning/15 text-warning border-warning/20',
  CLOSED: 'bg-destructive/15 text-destructive border-destructive/20',
  UNKNOWN: 'bg-muted/30 text-muted-foreground border-muted/40'
};
