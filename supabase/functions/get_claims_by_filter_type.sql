-- Function to get claims by filter type
CREATE OR REPLACE FUNCTION get_claims_by_filter_type(
  start_date DATE,
  end_date DATE,
  dealer_uuid UUID DEFAULT NULL,
  page_number INT DEFAULT 1,
  page_size INT DEFAULT 20
)
RETURNS TABLE (
  "ClaimID" TEXT,
  "AgreementID" TEXT,
  "DealerName" TEXT,
  "DealerUUID" TEXT,
  "IncurredDate" TIMESTAMP,
  "ReportedDate" TIMESTAMP,
  "Closed" TIMESTAMP,
  "LastPaymentDate" TIMESTAMP,
  "TotalPaid" NUMERIC,
  "SubclaimCount" INTEGER
) AS $$
BEGIN
    RETURN QUERY 
    WITH claim_aggregates AS (
        SELECT 
            c."ClaimID"::TEXT,  
            c."AgreementID"::TEXT,  
            d."Payee"::TEXT AS "DealerName",  
            a."DealerUUID"::TEXT AS "DealerUUID",  
            c."IncurredDate",
            c."ReportedDate",
            c."Closed",
            MAX(sc."Closed") AS "LastPaymentDate",
            SUM(COALESCE(sp."PaidPrice"::numeric, 0)) AS "TotalPaid",
            COUNT(DISTINCT sc."SubClaimID")::INTEGER AS "SubclaimCount"
        FROM claims c
        JOIN agreements a ON c."AgreementID" = a."AgreementID"
        LEFT JOIN dealers d ON a."DealerUUID" = d."DealerUUID"
        LEFT JOIN subclaims sc ON c."ClaimID" = sc."ClaimID"
        LEFT JOIN subclaim_parts sp ON sc."SubClaimID" = sp."SubClaimID"
        WHERE sc."Status" = 'PAID'
          AND sc."Closed" BETWEEN start_date AND end_date
          AND (dealer_uuid IS NULL OR a."DealerUUID"::TEXT = dealer_uuid::TEXT)  
        GROUP BY c."ClaimID", c."AgreementID", d."Payee", a."DealerUUID",
                 c."IncurredDate", c."ReportedDate", c."Closed"
        ORDER BY MAX(sc."Closed") DESC NULLS LAST
        LIMIT page_size OFFSET ((page_number - 1) * page_size)
    )
    SELECT * FROM claim_aggregates;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_claims_by_filter_type(DATE, DATE, UUID, INT, INT) TO authenticated; 