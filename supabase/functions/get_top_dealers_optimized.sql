-- Drop all existing versions of the functions first
DROP FUNCTION IF EXISTS get_top_dealers_optimized(DATE, DATE, INT);
DROP FUNCTION IF EXISTS get_top_dealers_aggregated(DATE, DATE, INT);

-- Optimized function for fetching top dealers with all KPIs
-- This function uses indexing, pagination, and aggregation to prevent timeouts
CREATE OR REPLACE FUNCTION get_top_dealers_optimized(
  start_date DATE,
  end_date DATE,
  limit_count INT DEFAULT 10
)
RETURNS TABLE (
  dealer_uuid TEXT,
  dealer_name TEXT,
  total_contracts INTEGER,
  active_contracts INTEGER,
  pending_contracts INTEGER,
  cancelled_contracts INTEGER,
  total_revenue NUMERIC,
  expected_revenue NUMERIC,
  funded_revenue NUMERIC,
  cancellation_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH dealer_agreements AS (
    SELECT 
      a."DealerUUID"::TEXT AS dealer_uuid,
      d."Payee" AS dealer_name,
      COUNT(*)::INTEGER AS total_contracts,
      COUNT(*) FILTER (WHERE a."AgreementStatus" = 'ACTIVE')::INTEGER AS active_contracts,
      COUNT(*) FILTER (WHERE a."AgreementStatus" = 'PENDING')::INTEGER AS pending_contracts,
      COUNT(*) FILTER (WHERE a."AgreementStatus" = 'CANCELLED')::INTEGER AS cancelled_contracts,
      SUM(COALESCE(a."DealerCost", 0)) AS total_revenue,
      SUM(CASE WHEN a."AgreementStatus" IN ('ACTIVE', 'PENDING') THEN COALESCE(a."DealerCost", 0) ELSE 0 END) AS expected_revenue,
      SUM(CASE WHEN a."AgreementStatus" = 'ACTIVE' AND a."IsActive" = TRUE THEN COALESCE(a."DealerCost", 0) ELSE 0 END) AS funded_revenue
    FROM agreements a
    JOIN dealers d ON a."DealerUUID" = d."DealerUUID"
    WHERE a."EffectiveDate" BETWEEN start_date AND end_date
    GROUP BY a."DealerUUID", d."Payee"
  )
  SELECT
    da.dealer_uuid,
    da.dealer_name,
    da.total_contracts,
    da.active_contracts,
    da.pending_contracts,
    da.cancelled_contracts,
    da.total_revenue,
    da.expected_revenue,
    da.funded_revenue,
    CASE
      WHEN da.total_contracts > 0 THEN (da.cancelled_contracts::NUMERIC / da.total_contracts::NUMERIC) * 100
      ELSE 0
    END AS cancellation_rate
  FROM dealer_agreements da
  ORDER BY da.total_revenue DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- More optimized function that only uses one join
CREATE OR REPLACE FUNCTION get_top_dealers_aggregated(
  start_date DATE,
  end_date DATE,
  limit_count INT DEFAULT 10
)
RETURNS TABLE (
  dealer_uuid TEXT,
  dealer_name TEXT,
  total_revenue NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a."DealerUUID"::TEXT,
    d."Payee",
    SUM(COALESCE(a."DealerCost", 0))::NUMERIC AS total_revenue
  FROM agreements a
  JOIN dealers d ON a."DealerUUID" = d."DealerUUID"
  WHERE a."EffectiveDate" BETWEEN start_date AND end_date
  GROUP BY a."DealerUUID", d."Payee"
  ORDER BY total_revenue DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_agreements_effective_date ON "agreements" ("EffectiveDate");
CREATE INDEX IF NOT EXISTS idx_agreements_dealer_uuid ON "agreements" ("DealerUUID");
CREATE INDEX IF NOT EXISTS idx_agreements_status ON "agreements" ("AgreementStatus");

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_top_dealers_optimized(DATE, DATE, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_dealers_aggregated(DATE, DATE, INT) TO authenticated;