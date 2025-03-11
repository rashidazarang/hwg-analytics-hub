# HWG Analytics Hub

## Overview

This repository contains the HWG Analytics Hub application, a comprehensive solution for managing and analyzing claims data. The application provides dashboards, reports, and analytics tools for tracking agreements, claims, and dealer performance.

## Project Structure

- `/src` - Source code for the frontend application
- `/supabase` - Supabase configuration, functions, and schema definitions
  - `/supabase/functions` - SQL functions for data processing and analytics
  - `/supabase/migrations` - Database migration files
  - `/supabase/schema.sql` - Complete database schema definition
  - `/supabase/schema.md` - Human-readable documentation of the database schema

## Database Schema

The application uses a Supabase PostgreSQL database with the following main tables:

- `agreements` - Stores agreement/contract information
- `claims` - Stores claim information related to agreements
- `dealers` - Stores dealer information
- `subclaims` - Subclaim information related to claims
- `subclaim_parts` - Parts information for subclaims
- `option_surcharge_price` - Stores pricing information for optional features
- `profiles` - User profile information

For a complete schema reference, see [Database Schema Documentation](./supabase/schema.md).

## Supabase Functions

The application uses several PostgreSQL functions to process and analyze data. These functions are stored in the `/supabase/functions` directory.

### Key Functions

| Function Name | Description |
|---------------|-------------|
| `check_auth_setup` | Verifies authentication setup |
| `update_timestamp` | Updates timestamp on record changes |
| `count_agreements_by_status` | Counts agreements by status within a date range |
| `get_top_agents_by_contracts` | Returns top agents by number of contracts |
| `calculate_agreement_revenue` | Calculates revenue for a specific agreement |
| `calculate_revenue_growth` | Calculates revenue growth between two periods |
| `get_leaderboard_summary` | Gets summary data for the leaderboard |
| `get_top_dealers_by_revenue` | Returns top dealers by revenue |
| `get_top_dealers_with_kpis` | Returns top dealers with KPI metrics |
| `get_claims_payment_info` | Gets payment information for claims |

For a complete list of functions and their parameters, see the [Functions Reference](#functions-reference) section below.

## API Endpoints

The application uses Supabase's auto-generated REST API for most data operations, with custom RPC endpoints for the SQL functions.

Example API usage:

```javascript
// Get top dealers by revenue
const { data, error } = await supabase.rpc('get_top_dealers_by_revenue', {
  start_date: '2023-01-01',
  end_date: '2023-12-31',
  limit_count: 10
});
```

## Functions Reference

### Dealer Analytics Functions

#### get_top_dealers_by_revenue
```sql
get_top_dealers_by_revenue(
  start_date DATE,
  end_date DATE,
  limit_count INT DEFAULT 10
) RETURNS TABLE (
  dealer_name TEXT,
  total_contracts INTEGER,
  total_revenue NUMERIC,
  cancelled_contracts INTEGER
)
```

#### get_top_dealers_optimized
```sql
get_top_dealers_optimized(
  start_date DATE,
  end_date DATE,
  limit_count INT DEFAULT 10
) RETURNS TABLE (
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

#### get_dealer_profile
```sql
get_dealer_profile(
  dealer_id UUID,
  start_date TIMESTAMP,
  end_date TIMESTAMP
) RETURNS TABLE (
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

### Agreement Analytics Functions

#### count_agreements_by_status
```sql
count_agreements_by_status(
  from_date DATE,
  to_date DATE,
  dealer_uuid UUID DEFAULT NULL
) RETURNS TABLE (
  status TEXT,
  count INT
)
```

#### count_agreements_by_date
```sql
count_agreements_by_date(
  from_date DATE,
  to_date DATE,
  group_by TEXT DEFAULT 'month',
  dealer_uuid UUID DEFAULT NULL
) RETURNS TABLE (
  date_group TEXT,
  total_count BIGINT,
  pending_count BIGINT,
  active_count BIGINT,
  claimable_count BIGINT,
  cancelled_count BIGINT,
  void_count BIGINT
)
```

#### fetch_monthly_agreement_counts_with_status
```sql
fetch_monthly_agreement_counts_with_status(
  start_date DATE,
  end_date DATE,
  dealer_uuid UUID DEFAULT NULL
) RETURNS TABLE (
  month TEXT,
  total BIGINT,
  pending BIGINT,
  active BIGINT,
  claimable BIGINT,
  cancelled BIGINT,
  void BIGINT
)
```

### Claims Analytics Functions

#### get_claims_with_payment_in_date_range
```sql
get_claims_with_payment_in_date_range(
  start_date DATE,
  end_date DATE,
  max_results INT DEFAULT 100
) RETURNS TABLE (
  claim_id TEXT
)
```

#### get_claims_by_filter_type
```sql
get_claims_by_filter_type(
  start_date DATE,
  end_date DATE,
  dealer_uuid UUID DEFAULT NULL,
  page_number INT DEFAULT 1,
  page_size INT DEFAULT 20
) RETURNS TABLE (
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

#### get_claims_payment_info
```sql
get_claims_payment_info(
  claim_ids TEXT[]
) RETURNS TABLE (
  "ClaimID" TEXT,
  "AgreementID" TEXT,
  "TotalPaid" NUMERIC,
  "LastPaymentDate" TIMESTAMP
)
```

### Revenue Analytics Functions

#### calculate_agreement_revenue
```sql
calculate_agreement_revenue(agreement_id TEXT) RETURNS NUMERIC
```

#### calculate_revenue_growth
```sql
calculate_revenue_growth(
  current_start_date DATE,
  current_end_date DATE,
  previous_start_date DATE,
  previous_end_date DATE
) RETURNS TABLE (
  current_revenue NUMERIC,
  previous_revenue NUMERIC,
  growth_rate NUMERIC
)
```

#### get_agreements_with_revenue
```sql
get_agreements_with_revenue(
  start_date DATE,
  end_date DATE
) RETURNS TABLE (
  "AgreementID" TEXT,
  "AgreementStatus" TEXT,
  "DealerUUID" TEXT,
  dealers JSONB,
  revenue NUMERIC
)
```

## Development

### Prerequisites

- Node.js 16+
- npm or yarn
- Supabase CLI

### Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see `.env.example`)
4. Start the development server: `npm run dev`

### Supabase Setup

1. Install Supabase CLI: `npm install -g supabase`
2. Initialize Supabase: `supabase init`
3. Start Supabase locally: `supabase start`
4. Apply migrations: `supabase db push`

## Deployment

The application can be deployed to any hosting platform that supports Node.js applications. The Supabase backend should be deployed to Supabase.com.

### Deployment Steps

1. Build the application: `npm run build`
2. Deploy the frontend to your hosting provider
3. Deploy the Supabase functions: `supabase functions deploy`

## License

This project is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.