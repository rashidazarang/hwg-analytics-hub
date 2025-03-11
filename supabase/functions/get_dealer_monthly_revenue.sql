-- Drop all existing versions of the function first
DROP FUNCTION IF EXISTS get_dealer_monthly_revenue(UUID, TIMESTAMP, TIMESTAMP);
DROP FUNCTION IF EXISTS get_dealer_monthly_revenue(TEXT, TIMESTAMP, TIMESTAMP);

-- Function to get monthly revenue for a dealer
CREATE OR REPLACE FUNCTION get_dealer_monthly_revenue(
  dealer_id TEXT,
  start_date TIMESTAMP,
  end_date TIMESTAMP
)
RETURNS TABLE (
  month DATE,
  total_revenue NUMERIC,
  funded_revenue NUMERIC,
  expected_revenue NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE_TRUNC('month', a."EffectiveDate")::DATE AS month,
    SUM(a."DealerCost")::NUMERIC AS total_revenue,
    SUM(CASE WHEN a."AgreementStatus" = 'ACTIVE' AND a."IsActive" = TRUE THEN a."DealerCost" ELSE 0 END)::NUMERIC AS funded_revenue,
    SUM(CASE WHEN a."AgreementStatus" IN ('ACTIVE', 'PENDING') THEN a."DealerCost" ELSE 0 END)::NUMERIC AS expected_revenue
  FROM agreements a
  WHERE a."DealerUUID" = dealer_id
    AND a."EffectiveDate" BETWEEN start_date AND end_date
  GROUP BY month
  ORDER BY month;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_dealer_monthly_revenue(TEXT, TIMESTAMP, TIMESTAMP) TO authenticated; 