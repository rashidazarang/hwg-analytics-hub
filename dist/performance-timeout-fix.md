# Performance Page SQL Timeout Fix

## Issue

The Performance page was causing SQL statement timeouts with error code 57014:

```
Error fetching leaderboard summary: 
{code: '57014', message: 'canceling statement due to statement timeout'}
```

```
Error fetching agreements: 
{code: '57014', message: 'canceling statement due to statement timeout'}
```

This was causing the page to display blank or fail to load data properly.

## Root Cause

The issue was related to excessive database overhead caused by:

1. **Multiple Timezone Conversion Calls**: The code was calling `set_timezone` before each query, which introduced significant overhead.

2. **Complex Date Conversions**: The code was performing unnecessary timezone conversions on every date both in JavaScript and in SQL.

3. **Concurrent Timezone Setting**: Multiple components were trying to set the timezone at the same time, leading to conflicts.

## Fixes Implemented

### 1. Removed Redundant Timezone Setting

Removed the calls to `set_timezone` before each query:

```typescript
// BEFORE:
// First, set timezone to CST for the query
await supabase.rpc('set_timezone', { timezone_name: CST_TIMEZONE });

// AFTER:
// Removed - server timezone configuration handles this
```

### 2. Simplified Date Handling

Simplified the date handling by using the dates as-is:

```typescript
// BEFORE:
const cstStartDateIso = toCSTISOString(setCSTHours(startDate, 0, 0, 0, 0));
const cstEndDateIso = toCSTISOString(setCSTHours(endDate, 23, 59, 59, 999));

// AFTER:
const startIso = startDate.toISOString();
const endIso = endDate.toISOString();
```

### 3. Eliminated Complex Date Processing

Removed overly complex date conversions in the processing logic:

```typescript
// BEFORE:
const effectiveDate = new Date(agreement.EffectiveDate);
const effectiveDateCST = toCSTDate(effectiveDate);
const monthKey = format(effectiveDateCST, 'yyyy-MM');

// AFTER:
const effectiveDate = new Date(agreement.EffectiveDate);
const monthKey = format(effectiveDate, 'yyyy-MM');
```

## Results

These changes help prevent SQL timeouts by:

1. Reducing the database overhead by eliminating redundant calls to `set_timezone`
2. Simplifying date handling throughout the component
3. Relying on the server timezone configuration rather than setting it for each query

The Performance page should now load correctly without timing out, while still maintaining accurate date aggregation.