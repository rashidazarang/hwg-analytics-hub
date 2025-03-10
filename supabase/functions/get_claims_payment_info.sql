-- Function to calculate payment information for claims
-- This is a more efficient way to get payment data compared to client-side calculation
-- Optimized to prevent timeouts
CREATE OR REPLACE FUNCTION public.get_claims_payment_info(
    claim_ids text[],
    max_results int DEFAULT 1000  -- Limit results to prevent timeouts
)
RETURNS TABLE(
    "ClaimID" text,
    "AgreementID" text,
    totalpaid numeric,
    lastpaymentdate timestamp without time zone
)
LANGUAGE sql
AS $$$
    -- Get payment data with an explicit limit to prevent timeouts
    SELECT 
      c."ClaimID",
      c."AgreementID",
      -- Calculate the total paid amount with optimized query
      COALESCE(
        (SELECT SUM(COALESCE(CAST(sp."PaidPrice" AS numeric), 0))
         FROM subclaim_parts sp
         JOIN subclaims s ON sp."SubClaimID" = s."SubClaimID"
         WHERE s."ClaimID" = c."ClaimID" 
           AND s."Status" = 'PAID'
         LIMIT 500), 
      0) AS totalpaid,
      
      -- Find the most recent payment date 
      (SELECT MAX(s."Closed")
       FROM subclaims s
       WHERE s."ClaimID" = c."ClaimID" 
         AND s."Status" = 'PAID'
       LIMIT 1) AS lastpaymentdate
    FROM 
      claims c
    WHERE
      c."ClaimID" = ANY(claim_ids)
    GROUP BY 
      c."ClaimID", c."AgreementID"
    LIMIT max_results;
$$$;