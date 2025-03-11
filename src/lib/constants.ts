/**
 * Constants used throughout the application
 */

// Timezone constants
export const CST_TIMEZONE = 'America/Chicago';
export const UTC_TIMEZONE = 'UTC';
export const DEFAULT_TIMEZONE = CST_TIMEZONE;

// Date format constants
export const DATE_FORMAT = 'yyyy-MM-dd';
export const DATE_TIME_FORMAT = 'yyyy-MM-dd HH:mm:ss';
export const MONTH_YEAR_FORMAT = 'MMM yyyy';

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 10;
export const DEFAULT_PAGE = 1;

// Status constants
export const AGREEMENT_STATUSES = {
  ACTIVE: 'ACTIVE',
  PENDING: 'PENDING',
  CANCELLED: 'CANCELLED',
  CLAIMABLE: 'CLAIMABLE',
  VOID: 'VOID'
};

// Claim statuses
export const CLAIM_STATUSES = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED'
}; 