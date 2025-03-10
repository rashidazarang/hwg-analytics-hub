# How to Fix the Leaderboard Revenue Calculation

This README explains the issue with the leaderboard page and how to fix it.

## Problem

The leaderboard page at `https://hwg-analytics-hub-bwt69.ondigitalocean.app/leaderboard` is not working properly due to:

1. SQL functions using the old revenue formula (directly summing the `Total` field) instead of the new formula
2. SQL queries timing out due to inefficient query structure with multiple nested subqueries

## Solution

The file `fixed-leaderboard.sql` contains updated, optimized versions of all the SQL functions needed for the leaderboard to properly calculate revenue using the new formula.

### Steps to Implement the Fix

1. Log in to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `fixed-leaderboard.sql` and paste it into a new SQL query
4. Run the query to create or replace all the functions with the updated versions

### What Changed?

The following SQL functions have been updated to use the new revenue calculation formula:

1. `calculate_agreement_revenue` (new helper function)
2. `get_top_agents_by_contracts`
3. `get_top_dealers_by_revenue`
4. `calculate_revenue_growth`
5. `get_leaderboard_summary`
6. `get_agreements_with_revenue`
7. `set_timezone` (new utility function)

Each function now:
1. Uses Common Table Expressions (CTEs) to efficiently calculate revenue
2. Correctly uses `"Option"` (not `option_name`) to match with the schema
3. Pre-fetches relevant option prices in one query instead of separate queries for each option
4. Processes the data in memory rather than with multiple round-trips to the database

### Performance Improvements

The key performance improvement is that we now:

1. Fetch all relevant agreement data once
2. Fetch all relevant option pricing data once 
3. Join these datasets in memory
4. Calculate all totals with a single pass

This is significantly more efficient than the previous approach of running separate subqueries for each option of each agreement.

### Verification

After running the SQL, you should verify that:

1. The leaderboard page now loads correctly without timeout errors
2. Revenue calculations are correct and match expectations
3. All charts and tables display data properly

## Additional Notes

- These functions use Common Table Expressions (CTEs) to calculate the revenue for agreements much more efficiently.
- The timezone function helps ensure consistent date handling in CST timezone.
- If you still encounter timeouts, consider adding indexes to the option_surcharge_price table or implementing additional optimizations.