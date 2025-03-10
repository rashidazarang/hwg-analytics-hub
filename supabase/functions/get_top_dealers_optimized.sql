-- Optimized function for fetching top dealers with all KPIs
-- This function uses indexing, pagination, and aggregation to prevent timeouts
CREATE OR REPLACE FUNCTION get_top_dealers_optimized(
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  dealer_uuid UUID,
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
DECLARE
  query_timeout TEXT := '30s'; -- Set a reasonable timeout
BEGIN
  -- Set statement timeout to prevent long-running queries
  EXECUTE 'SET LOCAL statement_timeout TO ''' || query_timeout || '''';
  
  -- Return the results using window functions and aggregation
  -- This is much more efficient than fetching all rows and processing in the application
  RETURN QUERY
  WITH dealer_stats AS (
    SELECT
      d."DealerUUID" as dealer_uuid,
      d."Payee" as dealer_name,
      COUNT(a."AgreementID") as total_contracts,
      COUNT(CASE WHEN UPPER(a."AgreementStatus") IN ('ACTIVE', 'CLAIMABLE') THEN 1 END) as active_contracts,
      COUNT(CASE WHEN UPPER(a."AgreementStatus") = 'PENDING' THEN 1 END) as pending_contracts,
      COUNT(CASE WHEN UPPER(a."AgreementStatus") IN ('CANCELLED', 'VOID') THEN 1 END) as cancelled_contracts,
      COALESCE(SUM(NULLIF(a."DealerCost", 0)), 0) as total_revenue,
      COALESCE(SUM(CASE WHEN UPPER(a."AgreementStatus") = 'PENDING' THEN NULLIF(a."DealerCost", 0) ELSE 0 END), 0) as expected_revenue,
      COALESCE(SUM(CASE WHEN UPPER(a."AgreementStatus") IN ('ACTIVE', 'CLAIMABLE') THEN NULLIF(a."DealerCost", 0) ELSE 0 END), 0) as funded_revenue
    FROM
      "agreements" a
    JOIN 
      "dealers" d ON a."DealerUUID" = d."DealerUUID"
    WHERE
      a."EffectiveDate" >= start_date
      AND a."EffectiveDate" <= end_date
    GROUP BY
      d."DealerUUID", d."Payee"
  )
  SELECT
    dealer_uuid,
    dealer_name,
    total_contracts,
    active_contracts,
    pending_contracts,
    cancelled_contracts,
    total_revenue,
    expected_revenue,
    funded_revenue,
    CASE 
      WHEN total_contracts > 0 THEN (cancelled_contracts::NUMERIC / total_contracts) * 100
      ELSE 0
    END as cancellation_rate
  FROM
    dealer_stats
  WHERE
    total_contracts > 0
  ORDER BY
    total_contracts DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- This is a simpler aggregation function that works directly on the agreements table
-- It's more efficient and less likely to timeout
CREATE OR REPLACE FUNCTION get_top_dealers_aggregated(
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  max_results INTEGER DEFAULT 10
)
RETURNS TABLE (
  dealer_uuid UUID,
  dealer_name TEXT,
  total_contracts BIGINT,
  active_contracts BIGINT,
  pending_contracts BIGINT,
  cancelled_contracts BIGINT,
  total_revenue NUMERIC,
  expected_revenue NUMERIC,
  funded_revenue NUMERIC
) AS $$
BEGIN
  -- Set a short timeout to prevent long-running queries
  SET LOCAL statement_timeout = '15s';
  
  RETURN QUERY
  SELECT
    d."DealerUUID",
    d."Payee",
    COUNT(a."AgreementID"),
    COUNT(CASE WHEN UPPER(a."AgreementStatus") IN ('ACTIVE', 'CLAIMABLE') THEN 1 END),
    COUNT(CASE WHEN UPPER(a."AgreementStatus") = 'PENDING' THEN 1 END),
    COUNT(CASE WHEN UPPER(a."AgreementStatus") IN ('CANCELLED', 'VOID') THEN 1 END),
    COALESCE(SUM(CAST(a."DealerCost" AS NUMERIC)), 0),
    COALESCE(SUM(CASE WHEN UPPER(a."AgreementStatus") = 'PENDING' THEN CAST(a."DealerCost" AS NUMERIC) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN UPPER(a."AgreementStatus") IN ('ACTIVE', 'CLAIMABLE') THEN CAST(a."DealerCost" AS NUMERIC) ELSE 0 END), 0)
  FROM
    "agreements" a
  JOIN 
    "dealers" d ON a."DealerUUID" = d."DealerUUID"
  WHERE
    a."EffectiveDate" >= start_date
    AND a."EffectiveDate" <= end_date
  GROUP BY
    d."DealerUUID", d."Payee"
  ORDER BY
    COUNT(a."AgreementID") DESC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Add an index to improve query performance
CREATE INDEX IF NOT EXISTS idx_agreements_effective_date ON "agreements" ("EffectiveDate");
CREATE INDEX IF NOT EXISTS idx_agreements_dealer_uuid ON "agreements" ("DealerUUID");
CREATE INDEX IF NOT EXISTS idx_agreements_status ON "agreements" ("AgreementStatus");