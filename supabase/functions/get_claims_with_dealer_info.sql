-- Function to get claims with dealer info
CREATE OR REPLACE FUNCTION get_claims_with_dealer_info(
  start_date DATE,
  end_date DATE,
  dealer_uuid UUID DEFAULT NULL,
  max_results INT DEFAULT 100
)
RETURNS TABLE (
  "ClaimID" TEXT,
  "AgreementID" TEXT,
  "DealerUUID" TEXT,
  "DealerName" TEXT,
  "ReportedDate" TIMESTAMP,
  "IncurredDate" TIMESTAMP,
  "Closed" TIMESTAMP,
  "Complaint" TEXT,
  "Cause" TEXT,
  "Correction" TEXT,
  "Deductible" NUMERIC,
  "LastModified" TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY 
    SELECT 
        c."ClaimID"::TEXT,  
        c."AgreementID"::TEXT,  
        a."DealerUUID"::TEXT,  
        d."Payee" AS "DealerName",
        c."ReportedDate",
        c."IncurredDate",
        c."Closed",
        COALESCE(c."Complaint", '') AS "Complaint",  
        COALESCE(c."Cause", '') AS "Cause",  
        COALESCE(c."Correction", '') AS "Correction",  
        c."Deductible",
        c."LastModified"
    FROM claims c
    JOIN agreements a ON c."AgreementID" = a."AgreementID"
    LEFT JOIN dealers d ON a."DealerUUID" = d."DealerUUID"
    WHERE 
        (c."LastModified" BETWEEN start_date AND end_date 
         OR c."ReportedDate" BETWEEN start_date AND end_date)
        AND (dealer_uuid IS NULL OR a."DealerUUID"::TEXT = dealer_uuid::TEXT)  
    ORDER BY c."LastModified" DESC
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_claims_with_dealer_info(DATE, DATE, UUID, INT) TO authenticated; 