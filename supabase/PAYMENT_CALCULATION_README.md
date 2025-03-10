# Claims Payment Data Calculation

This document explains how the payment data for claims is calculated and provides instructions for deploying the SQL function to your Supabase project.

## Overview

We've improved the calculation of payment information for claims by:

1. Creating an efficient SQL function to calculate payment data in the database
2. Improving the client-side fallback mechanism when the SQL function is not available
3. Updating the Claims table to display the calculated payment data

## SQL Function

The `get_claims_payment_info` function takes an array of claim IDs and returns payment information for each claim:

```sql
-- Function to calculate payment information for claims
CREATE OR REPLACE FUNCTION public.get_claims_payment_info(claim_ids text[])
RETURNS TABLE(
    "ClaimID" text,
    "AgreementID" text,
    totalpaid numeric,
    lastpaymentdate timestamp without time zone
)
LANGUAGE sql
AS $$
    SELECT 
      c."ClaimID",
      c."AgreementID",
      -- Calculate the total paid amount by summing PaidPrice from parts of PAID subclaims
      COALESCE(SUM(sp."PaidPrice"), 0) AS totalpaid,
      -- Find the most recent payment date using LastModified from PAID subclaims
      MAX(sc."LastModified") AS lastpaymentdate
    FROM 
      claims c
    LEFT JOIN 
      -- Join with subclaims, filtering for PAID status in the join condition
      subclaims sc ON c."ClaimID" = sc."ClaimID" AND sc."Status" = 'PAID'
    LEFT JOIN 
      -- Join with subclaim_parts using SubClaimID
      subclaim_parts sp ON sc."SubClaimID" = sp."SubClaimID"
    WHERE
      c."ClaimID" = ANY(claim_ids)
    -- Group by claim identifiers
    GROUP BY 
      c."ClaimID", c."AgreementID";
$$;
```

## Deploying the SQL Function

### Option 1: Using the Supabase Dashboard

1. Log in to your Supabase project
2. Go to the SQL Editor
3. Copy the SQL code from the `get_claims_payment_info.sql` file
4. Paste the code into the SQL Editor
5. Click "Run" to execute the SQL and create the function

### Option 2: Using the Supabase CLI

If you have the Supabase CLI set up, you can run:

```bash
supabase functions deploy get_claims_payment_info --project-ref your-project-id
```

### Option 3: Using psql

If you have direct access to the PostgreSQL database:

```bash
psql "postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres" -f supabase/functions/get_claims_payment_info.sql
```

## Testing the Function

You can test the function in the Supabase SQL Editor after deployment:

```sql
-- Test with a few claim IDs
SELECT * FROM get_claims_payment_info(ARRAY['10', '11', '12', '13', '14']);
```

## Client-Side Implementation

The application has been updated to:

1. Try to use the SQL function first for optimal performance
2. Fall back to client-side calculation if the SQL function is not available
3. Process data in batches for large datasets to avoid timeouts

This ensures that the Claims page will work even if the SQL function has not been deployed yet, while providing optimal performance when the function is available.

## Expected Behavior

After deploying the SQL function and reloading the Claims page, you should see:

1. The "Payed" column showing dollar amounts for claims with PAID subclaims
2. The "Most Recent Payment" column showing the latest payment date from PAID subclaims

## Troubleshooting

If the payment data is not displaying correctly:

1. Check the browser console for errors
2. Verify that the SQL function was created successfully
3. Test the SQL function directly to ensure it returns the expected results
4. Check that the `LastModified` column exists in the `subclaims` table
5. Ensure that subclaims with Status = 'PAID' have valid `PaidPrice` values in their associated subclaim_parts