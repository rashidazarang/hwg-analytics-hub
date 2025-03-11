-- Function to get claims with payment in date range
CREATE OR REPLACE FUNCTION get_claims_with_payment_in_date_range(
  start_date DATE,
  end_date DATE,
  max_results INT DEFAULT 100
)
RETURNS TABLE (
  claim_id TEXT
) AS $$
BEGIN
    RETURN QUERY 
    SELECT DISTINCT sc."ClaimID"::TEXT
    FROM subclaims sc
    WHERE 
        sc."Status" = 'PAID'
        AND sc."Closed" >= start_date
        AND sc."Closed" <= end_date
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_claims_with_payment_in_date_range(DATE, DATE, INT) TO authenticated; 