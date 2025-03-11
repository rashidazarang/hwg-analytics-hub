# AI Assistant Guide to Claim Analytics Hub

This document is specifically designed to help AI assistants understand and work with the Claim Analytics Hub codebase. It provides key information about the project structure, database schema, and functions that are most relevant for AI-assisted development and troubleshooting.

## Project Overview

Claim Analytics Hub is a web application for analyzing and managing claims data. It provides dashboards, reports, and analytics tools for tracking agreements, claims, and dealer performance metrics.

## Key Files and Directories

- `/src` - Frontend source code (React/TypeScript)
  - `/src/hooks` - Custom React hooks for data fetching and state management
  - `/src/components` - UI components
  - `/src/pages` - Page components
  - `/src/lib` - Utility functions and helpers
  - `/src/integrations` - Integration with external services (Supabase)

- `/supabase` - Supabase backend configuration
  - `/supabase/functions` - SQL functions for data processing
  - `/supabase/schema.sql` - Complete database schema definition
  - `/supabase/schema.md` - Human-readable documentation of the database schema

## Database Schema

The application uses a Supabase PostgreSQL database with these primary tables:

### Core Tables

1. `agreements` - Stores contract agreements
   - Primary key: `id` (UUID)
   - Key fields: `AgreementID`, `AgreementStatus`, `DealerUUID`, `EffectiveDate`
   - Status values: 'ACTIVE', 'PENDING', 'CANCELLED', 'VOID', 'CLAIMABLE'

2. `claims` - Stores claims against agreements
   - Primary key: `id` (UUID)
   - Key fields: `ClaimID`, `AgreementID`, `ReportedDate`, `Closed`
   - A claim is considered closed when `Closed` is not null

3. `dealers` - Stores dealer information
   - Primary key: `DealerUUID` (text)
   - Key fields: `Payee`, `PayeeID`

4. `subclaims` - Stores subclaim information
   - Primary key: `_id` (text)
   - Key fields: `ClaimID`, `SubClaimID`, `Status`, `Closed`
   - Status values: 'PAID', 'PENDING', 'REJECTED'

5. `subclaim_parts` - Stores parts information for subclaims
   - Primary key: `_id` (text)
   - Key fields: `SubClaimID`, `PaidPrice`

### Relationships

- `agreements` are linked to `dealers` via `DealerUUID`
- `claims` are linked to `agreements` via `AgreementID`
- `subclaims` are linked to `claims` via `ClaimID`
- `subclaim_parts` are linked to `subclaims` via `SubClaimID`

## SQL Functions

The application uses PostgreSQL functions for complex data operations. Here are the most important functions to understand:

### Agreement Analysis

- `count_agreements_by_status(from_date, to_date, dealer_uuid)` - Counts agreements by status
- `count_agreements_by_date(from_date, to_date, group_by, dealer_uuid)` - Groups agreements by date
- `calculate_agreement_revenue(agreement_id)` - Calculates revenue for a specific agreement

### Dealer Analysis

- `get_top_dealers_by_revenue(start_date, end_date, limit_count)` - Returns top dealers by revenue
- `get_top_dealers_optimized(start_date, end_date, limit_count)` - Optimized version with more metrics
- `get_dealer_profile(dealer_id, start_date, end_date)` - Gets comprehensive dealer profile data

### Claims Analysis

- `get_claims_with_payment_in_date_range(start_date, end_date, max_results)` - Gets claims with payments
- `get_claims_payment_info(claim_ids)` - Gets payment information for specific claims
- `get_claims_with_dealer_info(start_date, end_date, dealer_uuid, max_results)` - Gets claims with dealer info

## Common Data Patterns

### Date Filtering

- For agreements, filter by `EffectiveDate`
- For claims, filter by `ReportedDate` or `LastModified`
- For subclaims, filter by `Closed` date

### Status Logic

- Agreement status is stored directly in `AgreementStatus` field
- Claim status is derived:
  - If `Closed` is not null, status is 'CLOSED'
  - Otherwise, status is 'OPEN'
- Subclaim status is stored directly in `Status` field

### Revenue Calculation

Revenue is calculated as:
- Base: `agreements.DealerCost`
- Plus: Sum of option costs from `option_surcharge_price` table for each selected option

## Common API Patterns

The application uses Supabase's RPC endpoints to call SQL functions:

```javascript
// Example: Get top dealers
const { data, error } = await supabase.rpc('get_top_dealers_by_revenue', {
  start_date: '2023-01-01',
  end_date: '2023-12-31',
  limit_count: 10
});

// Example: Get dealer profile
const { data, error } = await supabase.rpc('get_dealer_profile', {
  dealer_id: '123e4567-e89b-12d3-a456-426614174000',
  start_date: '2023-01-01T00:00:00',
  end_date: '2023-12-31T23:59:59'
});
```

## Common Issues and Solutions

### Performance Optimization

- Use `get_top_dealers_optimized` instead of `get_top_dealers_by_revenue` for better performance
- Limit date ranges to reasonable periods (e.g., 1 year or less)
- Use pagination for large result sets

### Data Consistency

- Always use UUID format for dealer_uuid parameters
- Format dates consistently (ISO format for timestamps)
- Handle null values in revenue calculations

## AI-Specific Guidance

When working with this codebase:

1. **Database Schema**: Always refer to `supabase/schema.md` for the most up-to-date schema information
2. **SQL Functions**: Check `supabase/functions/` directory for function implementations
3. **API Usage**: Look at hooks in `src/hooks/` to understand how functions are called
4. **Data Transformations**: Pay attention to data transformations in React components

When suggesting code changes:
1. Maintain consistent parameter naming across functions
2. Follow the established patterns for error handling
3. Ensure proper type checking for all parameters
4. Add appropriate comments for complex SQL queries

## Example Workflows

### Adding a New Analytics Function

1. Create SQL function in `supabase/functions/` directory
2. Update `supabase/functions/index.sql` to include the new function
3. Create a React hook in `src/hooks/` to call the function
4. Create or update UI components to display the results

### Debugging Data Issues

1. Check the SQL function implementation for logical errors
2. Verify parameter types and formats in API calls
3. Examine data transformations in React hooks
4. Check for null handling in calculations 