# Supabase Database Functions - Deployment Instructions

This folder contains SQL migrations that need to be applied to the Supabase project to fix performance metrics visualizations and restore missing functions.

## Issues Addressed

1. **Performance Metrics Data Discrepancy**:
   - In the 6-month and Year timeframes, data was not being distributed correctly across months
   - All contracts for a given month (e.g., February 2025's 938 contracts) were incorrectly appearing on a single day (Feb 28, 2025)
   - The query logic failed to properly group by day/month

2. **Missing Function**:
   - The `get_leaderboard_summary` function was missing, affecting the leaderboard page

## SQL Function Updates

1. `count_agreements_by_date` - Now properly groups by day, month, or week using DATE_TRUNC
2. `fetch_monthly_agreement_counts_with_status` - Improved monthly aggregation with proper date grouping  
3. `execute_sql` - Added utility function for more flexible SQL execution
4. `get_leaderboard_summary` - Re-created function with proper revenue calculation

## Deployment Steps

To deploy these fixes to Supabase:

1. Connect to the Supabase Dashboard
2. Navigate to the SQL Editor
3. **IMPORTANT: First drop the conflicting function variants:**
   - Copy and run the contents of `migrations/drop_specific_functions.sql`
   - This will remove only the text-parameter versions of the functions while keeping the UUID versions needed by the frontend
4. Then deploy the new functions in this order:
   - First, run `migrations/create_leaderboard_summary_function.sql` to restore the missing function
   - Then run `migrations/fix_agreement_date_grouping.sql` to update the date grouping functions
5. Verify the functions were created by checking function definitions with:
   ```sql
   SELECT proname, nspname 
   FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
   WHERE proname IN ('count_agreements_by_date', 'fetch_monthly_agreement_counts_with_status', 'execute_sql', 'get_leaderboard_summary');
   ```

## Testing After Deployment

After deploying the changes:

1. **Performance Metrics Page**:
   - Test with different timeframes (week, month, 6 months, year)
   - Verify that data is correctly distributed across days/months
   - Check that all status types (PENDING, ACTIVE, CLAIMABLE, CANCELLED, VOID) appear correctly
   - Verify the totals match expectations

2. **Leaderboard Page**:
   - Verify the leaderboard page loads successfully
   - Check that summary statistics appear (active contracts, total revenue, etc.)
   - Confirm the top dealers and agents lists display correctly
   - Validate that revenue calculations include both dealer cost and option costs

If you encounter any issues after deployment:
- The performance metrics page has multiple fallbacks and will gracefully degrade to client-side data processing
- For leaderboard issues, check the browser console for specific error messages related to the `get_leaderboard_summary` function

## Function Documentation

### get_leaderboard_summary

```sql
get_leaderboard_summary(start_date timestamp, end_date timestamp)
```

Returns a table with:
- `active_contracts` - Count of active contracts in the date range
- `total_revenue` - Sum of revenue from active contracts
- `cancellation_rate` - Percentage of cancelled contracts
- `top_dealer` - Name of the dealer with highest revenue
- `top_agent` - Name of the agent with most contracts

### count_agreements_by_date

```sql
count_agreements_by_date(from_date timestamp, to_date timestamp, dealer_uuid uuid, group_by text)
```

Groups agreements by date with proper time-based grouping and status breakdowns.