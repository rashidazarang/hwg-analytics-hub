# Supabase Configuration

This directory contains all Supabase-related configuration, functions, and schema definitions for the Claim Analytics Hub application.

## Directory Structure

- `/functions` - SQL functions for data processing and analytics
- `/migrations` - Database migration files
- `/schema.sql` - Complete database schema definition
- `/schema.md` - Human-readable documentation of the database schema

## Database Schema

The application uses a PostgreSQL database with the following main tables:

- `agreements` - Stores agreement/contract information
- `claims` - Stores claim information related to agreements
- `dealers` - Stores dealer information
- `subclaims` - Subclaim information related to claims
- `subclaim_parts` - Parts information for subclaims
- `option_surcharge_price` - Stores pricing information for optional features
- `profiles` - User profile information

For a complete schema reference, see [schema.md](./schema.md).

## SQL Functions

The application uses several PostgreSQL functions to process and analyze data. These functions are stored in the `/functions` directory.

### Function Categories

#### Dealer Analytics Functions

- `get_top_dealers_by_revenue` - Returns top dealers by revenue
- `get_top_dealers_optimized` - Optimized version with more metrics
- `get_top_dealers_aggregated` - Returns aggregated dealer metrics
- `get_top_dealers_with_kpis` - Returns top dealers with KPI metrics
- `get_dealer_profile` - Gets comprehensive dealer profile data
- `get_dealer_agreement_distribution` - Gets agreement distribution for a dealer
- `get_dealer_claims_distribution` - Gets claims distribution for a dealer
- `get_dealer_monthly_revenue` - Gets monthly revenue for a dealer
- `delete_duplicate_dealers` - Utility to remove duplicate dealer records

#### Agreement Analytics Functions

- `count_agreements_by_status` - Counts agreements by status
- `count_agreements_by_date` - Groups agreements by date
- `fetch_monthly_agreement_counts` - Gets monthly agreement counts
- `fetch_monthly_agreement_counts_with_status` - Gets monthly agreement counts with status breakdown
- `get_agreements_with_revenue` - Gets agreements with calculated revenue
- `calculate_agreement_revenue` - Calculates revenue for a specific agreement
- `calculate_revenue_growth` - Calculates revenue growth between two periods
- `get_leaderboard_summary` - Gets summary data for the leaderboard
- `get_top_agents_by_contracts` - Returns top agents by number of contracts

#### Claims Analytics Functions

- `get_claims_with_payment_in_date_range` - Gets claims with payments in date range
- `get_claims_by_filter_type` - Gets claims filtered by various criteria
- `get_claims_payment_info` - Gets payment information for specific claims
- `get_claims_with_dealer_info` - Gets claims with dealer information

#### Utility Functions

- `check_auth_setup` - Verifies authentication setup
- `update_timestamp` - Updates timestamp on record changes
- `set_timezone` - Sets the timezone for the session
- `execute_sql` - Executes dynamic SQL (admin only)
- `handle_new_user` - Handles new user creation

### Function Implementation

Each function is implemented in its own SQL file in the `/functions` directory. The `index.sql` file includes all functions and creates necessary indexes.

### Using Functions

Functions can be called using Supabase's RPC endpoints:

```javascript
// Example: Get top dealers by revenue
const { data, error } = await supabase.rpc('get_top_dealers_by_revenue', {
  start_date: '2023-01-01',
  end_date: '2023-12-31',
  limit_count: 10
});
```

## Deployment

To deploy Supabase functions:

1. Ensure you have the Supabase CLI installed
2. Run `supabase functions deploy`

## Development

### Adding a New Function

1. Create a new SQL file in the `/functions` directory
2. Implement the function with proper parameter types and return types
3. Add the function to `index.sql`
4. Grant appropriate permissions to the function

### Testing Functions

You can test functions using the Supabase SQL Editor:

```sql
-- Example: Test get_top_dealers_by_revenue
SELECT * FROM get_top_dealers_by_revenue('2023-01-01', '2023-12-31', 5);
```

## Performance Considerations

- Use appropriate indexes for frequently queried columns
- Limit date ranges to reasonable periods
- Use pagination for large result sets
- Consider using materialized views for complex, frequently-used queries