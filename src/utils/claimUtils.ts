
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
 */
export const statusVariants = {
  OPEN: 'bg-green-200 text-green-700 border-green-300',
  CLOSED: 'bg-red-200 text-red-700 border-red-300',
  PENDING: 'bg-yellow-200 text-yellow-700 border-yellow-300',
  UNKNOWN: 'bg-gray-200 text-gray-700 border-gray-300'
};
