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