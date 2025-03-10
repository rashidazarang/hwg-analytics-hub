-- Function to calculate payment information for claims
-- This is a more efficient way to get payment data compared to client-side calculation
CREATE OR REPLACE FUNCTION public.get_claims_payment_info(claim_ids text[])
RETURNS TABLE(
    "ClaimID" text,
    "AgreementID" text,
    totalpaid numeric,
    lastpaymentdate timestamp without time zone
)
LANGUAGE sql
AS $$$
    SELECT 
      c."ClaimID",
      c."AgreementID",
      -- Calculate the total paid amount by summing PaidPrice from parts of PAID subclaims
      -- Use COALESCE to handle NULLs and convert to numeric to ensure type consistency
      COALESCE(
        (SELECT SUM(COALESCE(CAST(sp."PaidPrice" AS numeric), 0))
         FROM subclaim_parts sp
         JOIN subclaims s ON sp."SubClaimID" = s."SubClaimID"
         WHERE s."ClaimID" = c."ClaimID" AND s."Status" = 'PAID'), 
      0) AS totalpaid,
      
      -- Find the most recent payment date using Closed from PAID subclaims
      -- This field represents when the payment was made according to your context
      (SELECT MAX(s."Closed")
       FROM subclaims s
       WHERE s."ClaimID" = c."ClaimID" AND s."Status" = 'PAID') AS lastpaymentdate
    FROM 
      claims c
    WHERE
      c."ClaimID" = ANY(claim_ids)
    GROUP BY 
      c."ClaimID", c."AgreementID";
$$;