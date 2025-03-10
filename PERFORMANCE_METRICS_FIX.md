# Performance Metrics Data Display Fix

## Issue Summary

The Performance Metrics page had several data visualization issues:

1. **Incorrect Data Distribution**: In the 6-month and yearly views, contract data was being incorrectly distributed. All contracts for a month were appearing on a single day (e.g., all February contracts showing on Feb 28).

2. **SQL Query Problems**: The underlying SQL functions weren't properly using `DATE_TRUNC` to group by day or month, causing the aggregation issues.

3. **Missing Data in Some Time Periods**: Some time periods showed zero contracts when data should have been present.

## Changes Made

### SQL Function Updates

1. **Fixed `count_agreements_by_date` function**:
   - Now properly uses `DATE_TRUNC('day', EffectiveDate)` or `DATE_TRUNC('month', EffectiveDate)` for correct date grouping
   - Added explicit support for 'day', 'month', and 'week' grouping options
   - Validates the `group_by` parameter to prevent errors

2. **Fixed `fetch_monthly_agreement_counts_with_status` function**:
   - Improved monthly grouping to ensure contracts appear in the correct month
   - Uses `DATE_TRUNC('month', EffectiveDate)` for accurate monthly aggregation

3. **Added `execute_sql` utility function**:
   - Provides more flexibility for complex SQL queries
   - Helps with dynamic SQL execution when needed

### Frontend Code Updates

1. **Enhanced `fetchMonthlyData` function in `usePerformanceMetricsData.ts`**:
   - Added a new approach that uses `count_agreements_by_date` with month grouping
   - Added additional logging to help debug any issues
   - Improved fallback mechanisms

2. **Enhanced `fetchDailyAgreementsByStatus` function**:
   - Updated to work with the fixed SQL function
   - Added better error handling and logging
   - Fixed date key formatting for proper lookup

## Implementation Steps

1. **SQL Migration**:
   - Created SQL migration file (`fix_agreement_date_grouping.sql`) with updated function definitions
   - Must be deployed to Supabase using the SQL Editor

2. **Frontend Updates**:
   - Modified data fetching functions to use the improved SQL functions
   - Enhanced error handling and logging
   - Added better data validation

## Testing

After implementing these changes, the Performance Metrics page should correctly display:

1. Daily contract counts in week/month views
2. Monthly contract counts in 6-month/yearly views
3. Proper breakdowns by status types (PENDING, ACTIVE, CLAIMABLE, CANCELLED, VOID)
4. Consistent data across all time periods

## Fallback Mechanisms

If the SQL functions fail for any reason, the code will gracefully fall back to:

1. Alternative SQL functions
2. Client-side data processing as a last resort

This ensures the page will display data even if there are issues with the primary data fetching approach.