-- Function to get claims that have payments within a date range
-- This is used to filter claims by their payment dates, not just claim dates
-- Optimized for performance to prevent timeouts
CREATE OR REPLACE FUNCTION public.get_claims_with_payment_in_date_range(
    start_date timestamp without time zone,
    end_date timestamp without time zone,
    max_results int DEFAULT 5000  -- Limit results to prevent timeouts
)
RETURNS TABLE(
    "ClaimID" text
)
LANGUAGE sql
AS $$
    -- Much simpler query with better performance characteristics
    SELECT DISTINCT sc."ClaimID"
    FROM subclaims sc
    WHERE 
        sc."Status" = 'PAID'
        AND sc."Closed" BETWEEN start_date AND end_date
        AND EXISTS (
            SELECT 1 
            FROM subclaim_parts sp
            WHERE sp."SubClaimID" = sc."SubClaimID"
            LIMIT 1
        )
    LIMIT max_results;
$$;