-- Function to get claims payment info
CREATE OR REPLACE FUNCTION get_claims_payment_info(
  claim_ids TEXT[]
)
RETURNS TABLE (
  "ClaimID" TEXT,
  "AgreementID" TEXT,
  "TotalPaid" NUMERIC,
  "LastPaymentDate" TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY 
    WITH payment_data AS (
        SELECT 
            s."ClaimID"::TEXT,  
            SUM(COALESCE(sp."PaidPrice", 0)) AS claim_paid_amount,  
            MAX(s."Closed") AS last_payment_date
        FROM subclaims s
        LEFT JOIN subclaim_parts sp ON s."SubClaimID" = sp."SubClaimID"
        WHERE s."ClaimID" = ANY(claim_ids)
        AND s."Status" = 'PAID'
        GROUP BY s."ClaimID"
    ) 

    SELECT 
        c."ClaimID"::TEXT,  
        c."AgreementID"::TEXT,  
        COALESCE(pd.claim_paid_amount, 0) AS "TotalPaid",
        pd.last_payment_date AS "LastPaymentDate"
    FROM claims c
    LEFT JOIN payment_data pd ON c."ClaimID" = pd."ClaimID"
    WHERE c."ClaimID" = ANY(claim_ids)
    GROUP BY c."ClaimID", c."AgreementID", pd.claim_paid_amount, pd.last_payment_date;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_claims_payment_info(TEXT[]) TO authenticated;