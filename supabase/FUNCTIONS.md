# Supabase Functions Reference

This document provides a comprehensive reference for all SQL functions used in the Claim Analytics Hub application. Each function is documented with its purpose, parameters, return values, and usage examples.

## Table of Contents

- [Dealer Analytics Functions](#dealer-analytics-functions)
- [Agreement Analytics Functions](#agreement-analytics-functions)
- [Claims Analytics Functions](#claims-analytics-functions)
- [Revenue Analytics Functions](#revenue-analytics-functions)
- [Utility Functions](#utility-functions)

## Dealer Analytics Functions

### get_top_dealers_by_revenue

Returns a list of top dealers sorted by revenue within a specified date range.

**Parameters:**
- `start_date DATE` - Start date for the analysis period
- `end_date DATE` - End date for the analysis period
- `limit_count INT DEFAULT 10` - Maximum number of dealers to return

**Returns:**
```
TABLE (
  dealer_name TEXT,
  total_contracts INTEGER,
  total_revenue NUMERIC,
  cancelled_contracts INTEGER
)
```

**Example:**
```sql
SELECT * FROM get_top_dealers_by_revenue('2023-01-01', '2023-12-31', 5);
```

**Usage Notes:**
- Revenue is calculated based on dealer cost and option surcharges
- Only considers agreements with status 'ACTIVE' or 'CLAIMABLE'

---

### get_top_dealers_optimized

An optimized function for fetching top dealers with key performance indicators.

**Parameters:**
- `start_date DATE` - Start date for the analysis period
- `end_date DATE` - End date for the analysis period
- `limit_count INT DEFAULT 10` - Maximum number of dealers to return

**Returns:**
```
TABLE (
  dealer_uuid UUID,
  dealer_name TEXT,
  total_contracts INTEGER,
  active_contracts INTEGER,
  pending_contracts INTEGER,
  cancelled_contracts INTEGER,
  total_revenue NUMERIC,
  expected_revenue NUMERIC,
  funded_revenue NUMERIC,
  cancellation_rate NUMERIC
)
```

**Example:**
```sql
SELECT * FROM get_top_dealers_optimized('2023-01-01', '2023-12-31', 5);
```

**Usage Notes:**
- Provides detailed metrics for dealer performance analysis
- `active_contracts` counts agreements with status 'ACTIVE' or 'CLAIMABLE'
- `pending_contracts` counts agreements with status 'PENDING'
- `cancelled_contracts` counts agreements with status 'CANCELLED' or 'VOID'
- `total_revenue` is the sum of all dealer costs
- `expected_revenue` is the sum of dealer costs for pending agreements
- `funded_revenue` is the sum of dealer costs for active/claimable agreements
- `cancellation_rate` is calculated as (cancelled_contracts / total_contracts) * 100
- Results are ordered by total_contracts in descending order

---

### get_top_dealers_aggregated

Returns aggregated metrics for dealers, including revenue and contract counts.

**Parameters:**
- `start_date DATE` - Start date for the analysis period
- `end_date DATE` - End date for the analysis period
- `limit_count INT DEFAULT 10` - Maximum number of dealers to return

**Returns:**
```
TABLE (
  dealer_uuid UUID,
  dealer_name TEXT,
  total_contracts INTEGER,
  active_contracts INTEGER,
  pending_contracts INTEGER,
  cancelled_contracts INTEGER,
  total_revenue NUMERIC
)
```

**Example:**
```sql
SELECT * FROM get_top_dealers_aggregated('2023-01-01', '2023-12-31', 5);
```

---

### get_top_dealers_with_kpis

Returns top dealers with key performance indicators.

**Parameters:**
- `start_date DATE` - Start date for the analysis period
- `end_date DATE` - End date for the analysis period
- `limit_count INT DEFAULT 10` - Maximum number of dealers to return

**Returns:**
```
TABLE (
  dealer_uuid UUID,
  dealer_name TEXT,
  total_contracts INTEGER,
  active_contracts INTEGER,
  pending_contracts INTEGER,
  cancelled_contracts INTEGER,
  total_revenue NUMERIC,
  expected_revenue NUMERIC,
  funded_revenue NUMERIC,
  cancellation_rate NUMERIC,
  claims_per_contract NUMERIC,
  avg_claim_resolution_days NUMERIC
)
```

**Example:**
```sql
SELECT * FROM get_top_dealers_with_kpis('2023-01-01', '2023-12-31', 5);
```

**Usage Notes:**
- Includes claims-related KPIs
- Useful for comprehensive dealer performance analysis

---

### get_dealer_profile

Returns a comprehensive profile for a specific dealer, including all relevant metrics.

**Parameters:**
- `dealer_id UUID` - UUID of the dealer
- `start_date TIMESTAMP` - Start date for the analysis period
- `end_date TIMESTAMP` - End date for the analysis period

**Returns:**
```
TABLE (
  dealer_uuid UUID,
  dealer_name TEXT,
  dealer_address TEXT,
  dealer_city TEXT,
  dealer_region TEXT,
  dealer_country TEXT,
  dealer_postal_code TEXT,
  dealer_contact TEXT,
  dealer_phone TEXT,
  dealer_email TEXT,
  total_contracts INTEGER,
  active_contracts INTEGER,
  pending_contracts INTEGER,
  cancelled_contracts INTEGER,
  expired_contracts INTEGER,
  total_revenue NUMERIC,
  expected_revenue NUMERIC,
  funded_revenue NUMERIC,
  cancellation_rate NUMERIC,
  total_claims INTEGER,
  open_claims INTEGER,
  closed_claims INTEGER,
  claims_per_contract NUMERIC,
  avg_claim_resolution_days NUMERIC
)
```

**Example:**
```sql
SELECT * FROM get_dealer_profile('123e4567-e89b-12d3-a456-426614174000', '2023-01-01', '2023-12-31');
```

**Usage Notes:**
- Provides a complete profile for a single dealer by combining data from multiple sources
- Basic dealer information comes from the `dealers` table
- Performance metrics come from the `get_top_dealers_optimized` function
- Claims metrics are calculated directly from the `claims` and `agreements` tables
- `expired_contracts` is currently set to 0 as this status is not tracked in the current data model
- `claims_per_contract` is calculated as (total_claims / total_contracts)
- `avg_claim_resolution_days` calculates the average time between report and closure dates
- All numeric values default to 0 when no data is available
- Used for dealer detail pages and comprehensive reports

---

### get_dealer_agreement_distribution

Returns the distribution of agreements by status for a specific dealer.

**Parameters:**
- `dealer_id UUID` - UUID of the dealer
- `start_date TIMESTAMP` - Start date for the analysis period
- `end_date TIMESTAMP` - End date for the analysis period

**Returns:**
```
TABLE (
  status TEXT,
  count INTEGER,
  percentage NUMERIC
)
```

**Example:**
```sql
SELECT * FROM get_dealer_agreement_distribution('123e4567-e89b-12d3-a456-426614174000', '2023-01-01', '2023-12-31');
```

**Usage Notes:**
- Used for pie charts and distribution analysis
- Shows percentage breakdown of agreement statuses

---

### get_dealer_claims_distribution

Returns the distribution of claims by status for a specific dealer.

**Parameters:**
- `dealer_id UUID` - UUID of the dealer
- `start_date TIMESTAMP` - Start date for the analysis period
- `end_date TIMESTAMP` - End date for the analysis period

**Returns:**
```
TABLE (
  status TEXT,
  count INTEGER,
  percentage NUMERIC
)
```

**Example:**
```sql
SELECT * FROM get_dealer_claims_distribution('123e4567-e89b-12d3-a456-426614174000', '2023-01-01', '2023-12-31');
```

**Usage Notes:**
- Used for pie charts and distribution analysis
- Shows percentage breakdown of claim statuses

---

### get_dealer_monthly_revenue

Returns monthly revenue data for a specific dealer.

**Parameters:**
- `dealer_id UUID` - UUID of the dealer
- `start_date TIMESTAMP` - Start date for the analysis period
- `end_date TIMESTAMP` - End date for the analysis period

**Returns:**
```
TABLE (
  month TEXT,
  revenue NUMERIC
)
```

**Example:**
```sql
SELECT * FROM get_dealer_monthly_revenue('123e4567-e89b-12d3-a456-426614174000', '2023-01-01', '2023-12-31');
```

**Usage Notes:**
- Used for time-series charts
- Revenue is grouped by month

---

### delete_duplicate_dealers

Utility function to remove duplicate dealer records.

**Parameters:**
- None

**Returns:**
- Number of deleted records

**Example:**
```sql
SELECT delete_duplicate_dealers();
```

**Usage Notes:**
- Should be used with caution
- Keeps the most recently updated record for each dealer

## Agreement Analytics Functions

### count_agreements_by_status

Counts agreements by status within a specified date range.

**Parameters:**
- `from_date DATE` - Start date for the analysis period
- `to_date DATE` - End date for the analysis period
- `dealer_uuid UUID DEFAULT NULL` - Optional dealer UUID to filter by

**Returns:**
```
TABLE (
  status TEXT,
  count INT
)
```

**Example:**
```sql
SELECT * FROM count_agreements_by_status('2023-01-01', '2023-12-31');
```

**Usage Notes:**
- Used for status distribution charts
- Can be filtered by dealer

---

### count_agreements_by_status_yearly

Counts agreements by status with yearly granularity.

**Parameters:**
- `from_year DATE` - Start year for the analysis period
- `to_year DATE` - End year for the analysis period
- `dealer_uuid UUID DEFAULT NULL` - Optional dealer UUID to filter by

**Returns:**
```
TABLE (
  status TEXT,
  count INT
)
```

**Example:**
```sql
SELECT * FROM count_agreements_by_status_yearly('2023-01-01', '2023-12-31');
```

**Usage Notes:**
- Truncates dates to year granularity
- Used for yearly status distribution charts
- Can be filtered by dealer

---

### count_agreements_by_status_monthly

Counts agreements by status with monthly granularity.

**Parameters:**
- `from_month DATE` - Start month for the analysis period
- `to_month DATE` - End month for the analysis period
- `dealer_uuid UUID DEFAULT NULL` - Optional dealer UUID to filter by

**Returns:**
```
TABLE (
  status TEXT,
  count INT
)
```

**Example:**
```sql
SELECT * FROM count_agreements_by_status_monthly('2023-01-01', '2023-12-31');
```

**Usage Notes:**
- Truncates dates to month granularity
- Used for monthly status distribution charts
- Can be filtered by dealer

---

### count_agreements_by_status_weekly

Counts agreements by status with weekly granularity.

**Parameters:**
- `from_week DATE` - Start week for the analysis period
- `to_week DATE` - End week for the analysis period
- `dealer_uuid UUID DEFAULT NULL` - Optional dealer UUID to filter by

**Returns:**
```
TABLE (
  status TEXT,
  count INT
)
```

**Example:**
```sql
SELECT * FROM count_agreements_by_status_weekly('2023-01-01', '2023-12-31');
```

**Usage Notes:**
- Truncates dates to week granularity
- Used for weekly status distribution charts
- Can be filtered by dealer

---

### count_agreements_by_status_daily

Counts agreements by status with daily granularity.

**Parameters:**
- `from_day DATE` - Start day for the analysis period
- `to_day DATE` - End day for the analysis period
- `dealer_uuid UUID DEFAULT NULL` - Optional dealer UUID to filter by

**Returns:**
```
TABLE (
  status TEXT,
  count INT
)
```

**Example:**
```sql
SELECT * FROM count_agreements_by_status_daily('2023-01-01', '2023-12-31');
```

**Usage Notes:**
- Uses exact dates without truncation
- Used for daily status distribution charts
- Can be filtered by dealer

---

### count_agreements_by_date

Groups agreements by date with proper time-based grouping and status breakdowns.

**Parameters:**
- `from_date DATE` - Start date for the analysis period
- `to_date DATE` - End date for the analysis period
- `group_by TEXT DEFAULT 'month'` - Grouping interval ('day', 'week', 'month')
- `dealer_uuid UUID DEFAULT NULL` - Optional dealer UUID to filter by

**Returns:**
```
TABLE (
  date_group TEXT,
  total_count BIGINT,
  pending_count BIGINT,
  active_count BIGINT,
  claimable_count BIGINT,
  cancelled_count BIGINT,
  void_count BIGINT
)
```

**Example:**
```sql
SELECT * FROM count_agreements_by_date('2023-01-01', '2023-12-31', 'week');
```

**Usage Notes:**
- Used for time-series charts
- Supports different time groupings
- Breaks down counts by status

---

### count_agreements_by_date_daily

Groups agreements by day with status breakdowns.

**Parameters:**
- `from_day DATE` - Start date for the analysis period
- `to_day DATE` - End date for the analysis period
- `dealer_uuid UUID DEFAULT NULL` - Optional dealer UUID to filter by

**Returns:**
```
TABLE (
  date_group TEXT,
  total_count BIGINT,
  pending_count BIGINT,
  active_count BIGINT,
  claimable_count BIGINT,
  cancelled_count BIGINT,
  void_count BIGINT
)
```

**Example:**
```sql
SELECT * FROM count_agreements_by_date_daily('2023-01-01', '2023-01-31');
```

**Usage Notes:**
- Optimized for daily granularity
- Returns data grouped by day in 'YYYY-MM-DD' format
- Used for detailed daily time-series charts

---

### count_agreements_by_date_weekly

Groups agreements by week with status breakdowns.

**Parameters:**
- `from_week DATE` - Start date for the analysis period
- `to_week DATE` - End date for the analysis period
- `dealer_uuid UUID DEFAULT NULL` - Optional dealer UUID to filter by

**Returns:**
```
TABLE (
  date_group TEXT,
  total_count BIGINT,
  pending_count BIGINT,
  active_count BIGINT,
  claimable_count BIGINT,
  cancelled_count BIGINT,
  void_count BIGINT
)
```

**Example:**
```sql
SELECT * FROM count_agreements_by_date_weekly('2023-01-01', '2023-12-31');
```

**Usage Notes:**
- Optimized for weekly granularity
- Returns data grouped by week in 'YYYY-MM-DD' format (first day of week)
- Used for weekly time-series charts

---

### count_agreements_by_date_monthly

Groups agreements by month with status breakdowns.

**Parameters:**
- `from_month DATE` - Start date for the analysis period
- `to_month DATE` - End date for the analysis period
- `dealer_uuid UUID DEFAULT NULL` - Optional dealer UUID to filter by

**Returns:**
```
TABLE (
  date_group TEXT,
  total_count BIGINT,
  pending_count BIGINT,
  active_count BIGINT,
  claimable_count BIGINT,
  cancelled_count BIGINT,
  void_count BIGINT
)
```

**Example:**
```sql
SELECT * FROM count_agreements_by_date_monthly('2023-01-01', '2023-12-31');
```

**Usage Notes:**
- Optimized for monthly granularity
- Returns data grouped by month in 'YYYY-MM' format
- Used for monthly time-series charts

---

### count_agreements_by_date_yearly

Groups agreements by year with status breakdowns.

**Parameters:**
- `from_year DATE` - Start date for the analysis period
- `to_year DATE` - End date for the analysis period
- `dealer_uuid UUID DEFAULT NULL` - Optional dealer UUID to filter by

**Returns:**
```
TABLE (
  date_group TEXT,
  total_count BIGINT,
  pending_count BIGINT,
  active_count BIGINT,
  claimable_count BIGINT,
  cancelled_count BIGINT,
  void_count BIGINT
)
```

**Example:**
```sql
SELECT * FROM count_agreements_by_date_yearly('2020-01-01', '2023-12-31');
```

**Usage Notes:**
- Optimized for yearly granularity
- Returns data grouped by year in 'YYYY' format
- Used for yearly time-series charts and long-term trend analysis

---

### fetch_monthly_agreement_counts

Gets monthly agreement counts within a specified date range.

**Parameters:**
- `start_date DATE` - Start date for the analysis period
- `end_date DATE` - End date for the analysis period
- `dealer_uuid UUID DEFAULT NULL` - Optional dealer UUID to filter by

**Returns:**
```
TABLE (
  month TEXT,
  count BIGINT
)
```

**Example:**
```sql
SELECT * FROM fetch_monthly_agreement_counts('2023-01-01', '2023-12-31');
```

**Usage Notes:**
- Simplified version of count_agreements_by_date
- Only returns total counts by month

---

### fetch_monthly_agreement_counts_with_status

Gets monthly agreement counts with status breakdown.

**Parameters:**
- `start_date DATE` - Start date for the analysis period
- `end_date DATE` - End date for the analysis period
- `dealer_uuid UUID DEFAULT NULL` - Optional dealer UUID to filter by

**Returns:**
```
TABLE (
  month TEXT,
  total BIGINT,
  pending BIGINT,
  active BIGINT,
  claimable BIGINT,
  cancelled BIGINT,
  void BIGINT
)
```

**Example:**
```sql
SELECT * FROM fetch_monthly_agreement_counts_with_status('2023-01-01', '2023-12-31');
```

**Usage Notes:**
- Used for stacked bar charts
- Provides monthly breakdown with status counts

---

### get_agreements_with_revenue

Gets agreements with calculated revenue.

**Parameters:**
- `start_date DATE` - Start date for the analysis period
- `end_date DATE` - End date for the analysis period

**Returns:**
```
TABLE (
  "AgreementID" TEXT,
  "AgreementStatus" TEXT,
  "DealerUUID" TEXT,
  dealers JSONB,
  revenue NUMERIC
)
```

**Example:**
```sql
SELECT * FROM get_agreements_with_revenue('2023-01-01', '2023-12-31');
```

**Usage Notes:**
- Includes dealer information as JSONB
- Calculates revenue for each agreement

---

### calculate_agreement_revenue

Calculates revenue for a specific agreement.

**Parameters:**
- `agreement_id TEXT` - ID of the agreement

**Returns:**
- `NUMERIC` - Calculated revenue

**Example:**
```sql
SELECT calculate_agreement_revenue('AGR-12345');
```

**Usage Notes:**
- Includes dealer cost and option surcharges
- Used by other functions for revenue calculations

---

### calculate_revenue_growth

Calculates revenue growth between two periods.

**Parameters:**
- `current_start_date DATE` - Start date for current period
- `current_end_date DATE` - End date for current period
- `previous_start_date DATE` - Start date for previous period
- `previous_end_date DATE` - End date for previous period

**Returns:**
```
TABLE (
  current_revenue NUMERIC,
  previous_revenue NUMERIC,
  growth_rate NUMERIC
)
```

**Example:**
```sql
SELECT * FROM calculate_revenue_growth('2023-01-01', '2023-12-31', '2022-01-01', '2022-12-31');
```

**Usage Notes:**
- Growth rate is calculated as percentage
- Used for year-over-year comparisons

---

### get_leaderboard_summary

Gets summary data for the leaderboard.

**Parameters:**
- `start_date TIMESTAMP` - Start date for the analysis period
- `end_date TIMESTAMP` - End date for the analysis period

**Returns:**
```
TABLE (
  active_contracts INTEGER,
  total_revenue NUMERIC,
  cancellation_rate NUMERIC,
  top_dealer TEXT,
  top_agent TEXT
)
```

**Example:**
```sql
SELECT * FROM get_leaderboard_summary('2023-01-01', '2023-12-31');
```

**Usage Notes:**
- Used for dashboard summary metrics
- Includes top performer information

---

### get_top_agents_by_contracts

Returns top agents by number of contracts.

**Parameters:**
- `start_date DATE` - Start date for the analysis period
- `end_date DATE` - End date for the analysis period
- `limit_count INT DEFAULT 10` - Maximum number of agents to return

**Returns:**
```
TABLE (
  agent_name TEXT,
  total_contracts INTEGER,
  active_contracts INTEGER
)
```

**Example:**
```sql
SELECT * FROM get_top_agents_by_contracts('2023-01-01', '2023-12-31', 5);
```

**Usage Notes:**
- Used for agent leaderboards
- Focuses on contract volume rather than revenue

## Claims Analytics Functions

### get_claims_with_payment_in_date_range

Gets claims with payments in a specified date range.

**Parameters:**
- `start_date DATE` - Start date for the analysis period
- `end_date DATE` - End date for the analysis period
- `max_results INT DEFAULT 100` - Maximum number of results to return

**Returns:**
```
TABLE (
  claim_id TEXT
)
```

**Example:**
```sql
SELECT * FROM get_claims_with_payment_in_date_range('2023-01-01', '2023-12-31', 50);
```

**Usage Notes:**
- Filters claims based on payment dates
- Used for payment analysis

---

### get_claims_by_filter_type

Gets claims filtered by various criteria.

**Parameters:**
- `start_date DATE` - Start date for the analysis period
- `end_date DATE` - End date for the analysis period
- `dealer_uuid UUID DEFAULT NULL` - Optional dealer UUID to filter by
- `page_number INT DEFAULT 1` - Page number for pagination
- `page_size INT DEFAULT 20` - Number of results per page

**Returns:**
```
TABLE (
  "ClaimID" TEXT,
  "AgreementID" TEXT,
  "DealerName" TEXT,
  "DealerUUID" TEXT,
  "IncurredDate" TIMESTAMP,
  "ReportedDate" TIMESTAMP,
  "Closed" TIMESTAMP,
  "LastPaymentDate" TIMESTAMP,
  "TotalPaid" NUMERIC,
  "SubclaimCount" INTEGER
)
```

**Example:**
```sql
SELECT * FROM get_claims_by_filter_type('2023-01-01', '2023-12-31', NULL, 1, 10);
```

**Usage Notes:**
- Supports pagination
- Includes subclaim count
- Used for claims listing pages

---

### get_claims_payment_info

Gets payment information for specific claims.

**Parameters:**
- `claim_ids TEXT[]` - Array of claim IDs

**Returns:**
```
TABLE (
  "ClaimID" TEXT,
  "AgreementID" TEXT,
  "TotalPaid" NUMERIC,
  "LastPaymentDate" TIMESTAMP
)
```

**Example:**
```sql
SELECT * FROM get_claims_payment_info(ARRAY['CLM-12345', 'CLM-12346']);
```

**Usage Notes:**
- Accepts an array of claim IDs
- Used for batch retrieval of payment information

---

### get_claims_with_dealer_info

Gets claims with dealer information.

**Parameters:**
- `start_date DATE` - Start date for the analysis period
- `end_date DATE` - End date for the analysis period
- `dealer_uuid UUID DEFAULT NULL` - Optional dealer UUID to filter by
- `max_results INT DEFAULT 100` - Maximum number of results to return

**Returns:**
```
TABLE (
  "ClaimID" TEXT,
  "AgreementID" TEXT,
  "DealerName" TEXT,
  "DealerUUID" TEXT,
  "IncurredDate" TIMESTAMP,
  "ReportedDate" TIMESTAMP,
  "Closed" TIMESTAMP,
  "TotalPaid" NUMERIC
)
```

**Example:**
```sql
SELECT * FROM get_claims_with_dealer_info('2023-01-01', '2023-12-31', NULL, 50);
```

**Usage Notes:**
- Joins claims with dealer information
- Calculates total paid amount from subclaims

## Utility Functions

### check_auth_setup

Verifies authentication setup.

**Parameters:**
- None

**Returns:**
- `TEXT` - Confirmation message

**Example:**
```sql
SELECT check_auth_setup();
```

**Usage Notes:**
- Used during application initialization
- Confirms that authentication is properly configured

---

### update_timestamp

Updates timestamp on record changes.

**Parameters:**
- None

**Returns:**
- `TRIGGER` - Trigger result

**Example:**
```sql
-- Used as a trigger:
CREATE TRIGGER update_timestamp
BEFORE UPDATE ON some_table
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();
```

**Usage Notes:**
- Used as a trigger on tables
- Automatically updates timestamp fields

---

### set_timezone

Sets the timezone for the session.

**Parameters:**
- `timezone TEXT` - Timezone name (e.g., 'America/New_York')

**Returns:**
- `TEXT` - Confirmation message

**Example:**
```sql
SELECT set_timezone('America/New_York');
```

**Usage Notes:**
- Should be called at the beginning of a session
- Ensures consistent timezone handling

---

### execute_sql

Executes dynamic SQL (admin only).

**Parameters:**
- `sql_query TEXT` - SQL query to execute

**Returns:**
- `JSONB` - Query results as JSON

**Example:**
```sql
SELECT execute_sql('SELECT COUNT(*) FROM agreements');
```

**Usage Notes:**
- Restricted to admin users only
- Use with caution - potential SQL injection risk
- Useful for administrative tasks

---

### handle_new_user

Handles new user creation.

**Parameters:**
- None

**Returns:**
- `TRIGGER` - Trigger result

**Example:**
```sql
-- Used as a trigger:
CREATE TRIGGER handle_new_user
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_user();
```

**Usage Notes:**
- Used as a trigger on auth.users table
- Creates profile entries for new users

## Performance Considerations

When using these functions, consider the following performance tips:

1. **Date Ranges**: Limit date ranges to reasonable periods (e.g., 1 year or less)
2. **Pagination**: Use pagination parameters for functions that return large result sets
3. **Optimized Functions**: Use optimized versions of functions when available (e.g., `get_top_dealers_optimized` instead of `get_top_dealers_by_revenue`)
4. **Caching**: Consider caching results for frequently used functions with the same parameters
5. **Indexes**: Ensure that appropriate indexes are in place for frequently queried columns

## Function Development Guidelines

When developing new functions:

1. **Naming**: Use descriptive names that indicate the function's purpose
2. **Parameters**: Use consistent parameter naming across functions
3. **Documentation**: Document parameters, return values, and usage examples
4. **Error Handling**: Include appropriate error handling
5. **Performance**: Optimize queries for performance, especially for large datasets
6. **Security**: Apply appropriate row-level security policies
7. **Permissions**: Grant execute permissions to appropriate roles

## Troubleshooting

Common issues and solutions:

1. **Performance Issues**: 
   - Check execution plans with EXPLAIN ANALYZE
   - Ensure indexes are being used
   - Consider adding additional indexes

2. **Permission Errors**:
   - Verify that the function has been granted to the appropriate role
   - Check row-level security policies

3. **Data Inconsistencies**:
   - Verify parameter formats (especially dates and UUIDs)
   - Check for NULL handling in calculations 