# Performance Metrics Data Discrepancy Fix

## Issue Description

There was a discrepancy between the SQL query data and what was displayed in the Performance Metrics page:

- SQL query: `SELECT COUNT(*) AS total_records FROM agreements WHERE "EffectiveDate" >= '2025-03-01 00:00:00' AND "EffectiveDate" <= '2025-03-01 23:59:59';` returned 124 records
- Performance Metrics page showed only 112 total agreements for March 1, 2025

## Root Causes Identified

1. **Timezone Inconsistency**: 
   - The Performance page was not consistently using CST timezone for date comparisons
   - This led to timezone shifts that affected which records were included

2. **Status Filtering**:
   - The chart was only counting agreements with PENDING, ACTIVE, or CANCELLED status
   - Agreements with other statuses (like VOID, TERMINATED, EXPIRED) were fetched but not counted in the total

3. **Date Handling**:
   - The effective date conversion between UTC and CST wasn't consistent
   - This affected which agreements were included in specific days

## Fixes Implemented

### 1. Consistent Timezone Handling

Added proper CST timezone handling for all date comparisons:

```typescript
// Format dates in CST timezone for proper comparison
const cstStartDateIso = toCSTISOString(setCSTHours(startDate, 0, 0, 0, 0));
const cstEndDateIso = toCSTISOString(setCSTHours(endDate, 23, 59, 59, 999));
```

Set database timezone to CST before each query:

```typescript
// First, set timezone to CST for the query
await supabase.rpc('set_timezone', { timezone_name: CST_TIMEZONE });
```

### 2. Status Counting Fix

Modified the status counting logic to count ALL agreements in the total:

```typescript
// Initialize counters for different statuses
let pending = 0, active = 0, cancelled = 0, other = 0;

// Count agreements by status - including ALL agreements in the total
dayAgreements.forEach(agreement => {
  const status = (agreement.AgreementStatus || '').toUpperCase();
  if (status === 'PENDING') pending++;
  else if (status === 'ACTIVE') active++;
  else if (status === 'CANCELLED') cancelled++;
  else other++; // Count other statuses separately for debugging
});
```

### 3. Enhanced Logging

Added detailed logging to track status distribution:

```typescript
// Log status distribution for debugging
if (data && data.length > 0) {
  const statusCounts: Record<string, number> = {};
  data.forEach(agreement => {
    const status = (agreement.AgreementStatus || '').toUpperCase();
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });
  console.log('[PERFORMANCE] Status distribution in raw data:', statusCounts);
}
```

### 4. CST Date Conversion

Added proper CST date conversion for date comparisons:

```typescript
const effectiveDate = new Date(agreement.EffectiveDate);
// Use CST dates to avoid timezone issues
const effectiveDateCST = toCSTDate(effectiveDate);
const monthKey = format(effectiveDateCST, 'yyyy-MM');
```

## Expected Results

After these fixes:

1. The Performance chart will show the correct total (124 records for March 1, 2025)
2. The count will now include ALL agreements regardless of status
3. The timezone will be consistently handled in CST
4. The console will provide detailed breakdowns of status counts

This ensures that the Performance metrics properly align with SQL query results and provide an accurate representation of all agreements in the system.