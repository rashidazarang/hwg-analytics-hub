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
AS $$$
    -- Get claim IDs for claims with PAID subclaims where the Closed date (payment date)
    -- falls within the given date range
    SELECT DISTINCT 
      c."ClaimID"
    FROM 
      claims c
    JOIN 
      -- Join with subclaims, filtering for PAID status and date range
      -- Using Closed field which represents when the payment was made according to your context
      subclaims sc ON c."ClaimID" = sc."ClaimID" 
      AND sc."Status" = 'PAID'
      AND sc."Closed" BETWEEN start_date AND end_date
      -- Ensure we only include subclaims with actual payments
      AND EXISTS (
        SELECT 1 
        FROM subclaim_parts sp
        WHERE sp."SubClaimID" = sc."SubClaimID"
        AND COALESCE(CAST(sp."PaidPrice" AS numeric), 0) > 0
      );
$$;