-- Set timezone to CST for consistency
SET timezone = 'America/Chicago';

-- Function to get top 10 dealers with KPI data, optimized for performance
CREATE OR REPLACE FUNCTION get_top_dealers_with_kpis(start_date TEXT, end_date TEXT)
RETURNS TABLE (
  dealer_uuid TEXT,
  dealer_name TEXT,
  total_contracts BIGINT,
  active_contracts BIGINT,
  pending_contracts BIGINT,
  cancelled_contracts BIGINT,
  total_revenue NUMERIC,
  expected_revenue NUMERIC,
  funded_revenue NUMERIC,
  cancellation_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH agreement_revenue AS (
    SELECT
      a."AgreementID",
      a."AgreementStatus",
      a."DealerUUID",
      d."Payee" AS dealer_name,
      -- Precompute revenue with a more efficient approach
      COALESCE(a."DealerCost", 0) + 
      -- Sum option costs in a single query to avoid multiple subqueries per row
      COALESCE((
        SELECT SUM(osp.cost)
        FROM option_surcharge_price osp
        WHERE osp.product = a."Product"
        AND osp.option_name IN (
          a."Option1", a."Option2", a."Option3", a."Option4",
          a."Option5", a."Option6", a."Option7", a."Option8"
        )
      ), 0) AS revenue
    FROM
      agreements a
    JOIN
      dealers d ON a."DealerUUID" = d."DealerUUID"
    WHERE
      a."EffectiveDate" >= start_date::TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'America/Chicago'
      AND a."EffectiveDate" <= end_date::TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'America/Chicago'
  ),
  dealer_summary AS (
    SELECT
      ar."DealerUUID",
      ar.dealer_name,
      COUNT(ar."AgreementID") AS total_contracts,
      COUNT(CASE WHEN ar."AgreementStatus" = 'ACTIVE' THEN ar."AgreementID" END) AS active_contracts,
      COUNT(CASE WHEN ar."AgreementStatus" = 'PENDING' THEN ar."AgreementID" END) AS pending_contracts,
      COUNT(CASE WHEN ar."AgreementStatus" = 'CANCELLED' OR ar."AgreementStatus" = 'VOID' THEN ar."AgreementID" END) AS cancelled_contracts,
      SUM(ar.revenue) AS total_revenue,
      SUM(CASE WHEN ar."AgreementStatus" = 'PENDING' THEN ar.revenue ELSE 0 END) AS expected_revenue,
      SUM(CASE WHEN ar."AgreementStatus" = 'ACTIVE' THEN ar.revenue ELSE 0 END) AS funded_revenue,
      CASE 
        WHEN COUNT(ar."AgreementID") = 0 THEN 0
        ELSE COUNT(CASE WHEN ar."AgreementStatus" = 'CANCELLED' OR ar."AgreementStatus" = 'VOID' THEN ar."AgreementID" END)::NUMERIC / COUNT(ar."AgreementID")::NUMERIC * 100
      END AS cancellation_rate
    FROM
      agreement_revenue ar
    GROUP BY
      ar."DealerUUID", ar.dealer_name
  )
  SELECT 
    ds."DealerUUID",
    ds.dealer_name,
    ds.total_contracts,
    ds.active_contracts,
    ds.pending_contracts,
    ds.cancelled_contracts,
    ds.total_revenue,
    ds.expected_revenue,
    ds.funded_revenue,
    ds.cancellation_rate
  FROM 
    dealer_summary ds
  ORDER BY 
    ds.total_revenue DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;