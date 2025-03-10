-- Function to get claims that have payments within a date range
-- This is used to filter claims by their payment dates, not just claim dates
CREATE OR REPLACE FUNCTION public.get_claims_with_payment_in_date_range(
    start_date timestamp without time zone,
    end_date timestamp without time zone
)
RETURNS TABLE(
    "ClaimID" text
)
LANGUAGE sql
AS $$
    -- Get claim IDs for claims with paid subclaims where the payment date (LastModified on subclaim) 
    -- falls within the given date range
    -- This query is important for filtering claims by their payment dates
    SELECT DISTINCT 
      c."ClaimID"
    FROM 
      claims c
    JOIN 
      -- Join with subclaims, filtering for PAID status and date range
      subclaims sc ON c."ClaimID" = sc."ClaimID" 
      AND sc."Status" = 'PAID'
      AND (
        -- We want subclaims where either the LastModified date is in range
        -- OR there is a subclaim part with a payment date in range
        sc."LastModified" BETWEEN start_date AND end_date
        OR EXISTS (
          SELECT 1 
          FROM subclaim_parts sp
          WHERE sp."SubClaimID" = sc."SubClaimID"
          AND sp."PaidPrice" > 0
        )
      );
$$;