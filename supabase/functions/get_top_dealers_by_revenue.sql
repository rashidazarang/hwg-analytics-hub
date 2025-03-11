-- Function to get top dealers by revenue
CREATE OR REPLACE FUNCTION get_top_dealers_by_revenue(
  start_date DATE,
  end_date DATE,
  limit_count INT DEFAULT 10
)
RETURNS TABLE (
  dealer_name TEXT,
  total_contracts INTEGER,
  total_revenue NUMERIC,
  cancelled_contracts INTEGER
) AS $$
BEGIN
    RETURN QUERY 
    SELECT 
        d."Payee" AS dealer_name,
        COUNT(a."AgreementID")::INTEGER AS total_contracts,
        COALESCE(SUM(a."Total"), 0) AS total_revenue,
        COUNT(CASE WHEN a."AgreementStatus" = 'CANCELLED' THEN a."AgreementID" END)::INTEGER AS cancelled_contracts
    FROM agreements a
    JOIN dealers d ON a."DealerUUID" = d."DealerUUID"
    WHERE 
        a."EffectiveDate" BETWEEN start_date AND end_date
        AND d."Payee" IS NOT NULL
    GROUP BY d."Payee"
    ORDER BY total_revenue DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_top_dealers_by_revenue(DATE, DATE, INT) TO authenticated; 