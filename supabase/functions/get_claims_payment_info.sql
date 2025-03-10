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
AS $$
    -- Get payment data with an explicit limit to prevent timeouts
    WITH payment_data AS (
        SELECT 
            s."ClaimID",
            SUM(COALESCE(CAST(sp."PaidPrice" AS numeric), 0)) AS claim_paid_amount,
            MAX(s."Closed") AS last_payment_date
        FROM 
            subclaims s
        JOIN 
            subclaim_parts sp ON s."SubClaimID" = sp."SubClaimID"
        WHERE 
            s."ClaimID" = ANY(claim_ids)
            AND s."Status" = 'PAID'
        GROUP BY 
            s."ClaimID"
    )
    
    SELECT 
        c."ClaimID",
        c."AgreementID",
        COALESCE(pd.claim_paid_amount, 0) AS totalpaid,
        pd.last_payment_date AS lastpaymentdate
    FROM 
        claims c
    LEFT JOIN 
        payment_data pd ON c."ClaimID" = pd."ClaimID"
    WHERE
        c."ClaimID" = ANY(claim_ids)
    GROUP BY 
        c."ClaimID", c."AgreementID", pd.claim_paid_amount, pd.last_payment_date
    LIMIT max_results;
$$;