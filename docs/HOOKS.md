# Hooks Architecture Documentation

This document provides a comprehensive overview of the hooks architecture in the Claim Analytics Hub application. Hooks are a fundamental part of our React application, enabling clean separation of concerns, reusable data fetching logic, and consistent state management.

## Table of Contents

1. [Directory Structure](#directory-structure)
2. [Hook Categories](#hook-categories)
3. [Naming Conventions](#naming-conventions)
4. [Data Fetching Pattern](#data-fetching-pattern)
5. [State Management Pattern](#state-management-pattern)
6. [Hook Composition](#hook-composition)
7. [Best Practices](#best-practices)
8. [Examples](#examples)

## Directory Structure

The hooks are organized in the following directory structure:

```
src/
└── hooks/
    ├── leaderboard/                # Domain-specific hooks for leaderboard feature
    │   ├── useLeaderboardData.ts   # Main data fetching hook for leaderboard
    │   ├── useTopDealersData.ts    # Hook for top dealers data
    │   ├── useTopAgentsData.ts     # Hook for top agents data
    │   ├── useRevenueGrowthData.ts # Hook for revenue growth calculations
    │   ├── useLeaderboardSummary.ts # Hook for leaderboard summary metrics
    │   └── dateRangeUtils.ts       # Utility functions for date handling
    │
    ├── useAgreementStatusData.ts   # Hook for agreement status data
    ├── useClaimPaymentData.ts      # Hook for claim payment data
    ├── useClaimsFetching.ts        # Hook for claims fetching logic
    ├── useClaimsChartData.ts       # Hook for claims chart data
    ├── useDealerClaimsData.ts      # Hook for dealer claims data
    ├── useDealerProfileData.ts     # Hook for dealer profile data
    ├── useDealershipData.ts        # Hook for dealership data
    ├── useKPIData.ts               # Hook for KPI metrics
    ├── useLeaderboardData.ts       # Re-export file for leaderboard hooks
    ├── usePerformanceMetricsData.ts # Hook for performance metrics
    ├── useSharedAgreementsData.ts  # Shared hook for agreements data
    ├── useSharedClaimsData.ts      # Shared hook for claims data
    ├── useSharedPerformanceData.ts # Shared hook for performance data
    ├── useTopDealersContractData.ts # Hook for top dealers contract data
    ├── use-mobile.tsx              # Utility hook for responsive design
    └── use-toast.ts                # Utility hook for toast notifications
```

## Hook Categories

Our hooks are organized into several categories:

### 1. Data Fetching Hooks

These hooks are responsible for fetching data from the Supabase backend and handling loading, error, and success states. They typically use React Query (TanStack Query) for data fetching and caching.

Examples:
- `useLeaderboardData`
- `useDealerProfileData`
- `useClaimsFetching`

### 2. Shared Data Hooks

These hooks provide shared data access across multiple components, ensuring consistent data representation and reducing duplicate API calls.

Examples:
- `useSharedClaimsData`
- `useSharedAgreementsData`
- `useSharedPerformanceData`

### 3. UI Utility Hooks

These hooks handle UI-related functionality such as responsive design, notifications, and theme management.

Examples:
- `use-mobile`
- `use-toast`

### 4. Domain-Specific Hooks

These hooks are organized by domain/feature and handle specific business logic for that domain.

Examples:
- Leaderboard hooks (`leaderboard/useTopDealersData`, etc.)
- Dealer profile hooks (`useDealerProfileData`)
- Claims hooks (`useClaimPaymentData`)

## Naming Conventions

We follow these naming conventions for hooks:

1. **Prefix**: All hooks start with `use` to follow React conventions.
2. **Domain Prefix**: Domain-specific hooks are organized in subdirectories.
3. **Data vs. UI**: Data hooks use camelCase (`useLeaderboardData`), while UI utility hooks use kebab-case (`use-mobile`).
4. **Re-export Files**: Simple files that re-export hooks from subdirectories use the same name as the subdirectory.

## Data Fetching Pattern

Our data fetching hooks follow a consistent pattern using React Query:

```typescript
export function useExampleData(params: ParamsType) {
  return useQuery({
    queryKey: ['uniqueQueryKey', ...dependencyValues],
    queryFn: async () => {
      // Format parameters if needed
      
      // Log the request for debugging
      console.log('[EXAMPLE] Fetching data with params:', params);
      
      // Make the API call using Supabase
      const { data, error } = await supabase.rpc('function_name', {
        param1: value1,
        param2: value2
      });
      
      // Handle errors
      if (error) {
        console.error('[EXAMPLE] Error fetching data:', error);
        throw new Error(error.message);
      }
      
      // Transform the data if needed
      const transformedData = transformData(data);
      
      return transformedData;
    },
    // Optional configuration
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}
```

## State Management Pattern

For hooks that manage local state, we follow this pattern:

```typescript
export function useExampleState(initialValue: ValueType) {
  // State declaration
  const [value, setValue] = useState<ValueType>(initialValue);
  
  // Derived state
  const derivedValue = useMemo(() => {
    return computeDerivedValue(value);
  }, [value]);
  
  // Event handlers
  const handleChange = useCallback((newValue: ValueType) => {
    setValue(newValue);
  }, []);
  
  // Side effects
  useEffect(() => {
    // Side effect logic
    return () => {
      // Cleanup logic
    };
  }, [value]);
  
  // Return values and handlers
  return {
    value,
    derivedValue,
    handleChange
  };
}
```

## Hook Composition

We use hook composition to build complex functionality from simpler hooks:

```typescript
export function useComposedHook(params: ParamsType) {
  // Use simpler hooks
  const { data: firstData } = useFirstHook(params);
  const { data: secondData } = useSecondHook(params);
  
  // Combine data from multiple hooks
  const combinedData = useMemo(() => {
    if (!firstData || !secondData) return null;
    return combineData(firstData, secondData);
  }, [firstData, secondData]);
  
  return { combinedData };
}
```

## Best Practices

1. **Single Responsibility**: Each hook should have a single responsibility.
2. **Consistent Error Handling**: Use consistent error handling patterns across hooks.
3. **Memoization**: Use `useMemo` and `useCallback` to optimize performance.
4. **Descriptive Names**: Use descriptive names that clearly indicate the hook's purpose.
5. **Documentation**: Document complex hooks with JSDoc comments.
6. **Testing**: Write tests for hooks to ensure they work as expected.
7. **Avoid Prop Drilling**: Use hooks to avoid prop drilling in components.
8. **TypeScript**: Use TypeScript interfaces to define input and output types.

## Examples

### Data Fetching Hook Example

```typescript
// src/hooks/useDealerProfileData.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateRange } from '@/lib/dateUtils';

export interface DealerProfile {
  dealer_uuid: string;
  dealer_name: string;
  // ... other properties
}

export function useDealerProfileData(dealerId: string, dateRange: DateRange) {
  return useQuery({
    queryKey: ['dealerProfile', dealerId, dateRange.from, dateRange.to],
    queryFn: async (): Promise<DealerProfile> => {
      const { data, error } = await supabase.rpc('get_dealer_profile', {
        dealer_id: dealerId,
        start_date: dateRange.from,
        end_date: dateRange.to
      });
      
      if (error) {
        console.error('[DEALER] Error fetching dealer profile:', error);
        throw new Error(error.message);
      }
      
      return data;
    },
    enabled: !!dealerId,
  });
}
```

### UI Utility Hook Example

```typescript
// src/hooks/use-mobile.tsx
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
```

### Hook Re-export Example

```typescript
// src/hooks/useLeaderboardData.ts
// This file re-exports all leaderboard hooks for backward compatibility
import { useTopAgentsData } from './leaderboard/useTopAgentsData';
import { useTopDealersData } from './leaderboard/useTopDealersData';
import { useRevenueGrowthData } from './leaderboard/useRevenueGrowthData';
import { useLeaderboardSummary } from './leaderboard/useLeaderboardSummary';

export {
  useTopAgentsData,
  useTopDealersData,
  useRevenueGrowthData,
  useLeaderboardSummary
};
``` 