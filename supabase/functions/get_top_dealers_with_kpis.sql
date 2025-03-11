-- Set timezone to CST for consistency
SET timezone = 'America/Chicago';

-- Function to get top dealers with KPIs
CREATE OR REPLACE FUNCTION get_top_dealers_with_kpis(
  start_date DATE,
  end_date DATE,
  limit_count INT DEFAULT 10
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
  funded_revenue NUMERIC,
  cancellation_rate NUMERIC
) AS $$
    -- Pre-filter and pre-aggregate dealers to find top 10 by revenue first
    WITH top_dealer_ids AS (
      SELECT
        a."DealerUUID",
        d."Payee" AS dealer_name,
        COUNT(*) AS contract_count,
        SUM(COALESCE(a."DealerCost", 0)) AS dealer_cost_sum
      FROM agreements a
      JOIN dealers d ON a."DealerUUID" = d."DealerUUID"
      WHERE
        a."EffectiveDate" BETWEEN start_date AND end_date
        AND d."Payee" IS NOT NULL
      GROUP BY a."DealerUUID", d."Payee"
      ORDER BY dealer_cost_sum DESC
      LIMIT limit_count
    ),

    -- Now process just the agreements for these top dealers
    filtered_agreements AS (
      SELECT
        a."AgreementID",
        a."AgreementStatus",
        a."DealerUUID",
        td.dealer_name,
        a."DealerCost",
        a."Product",
        a."Option1", a."Option2", a."Option3", a."Option4",
        a."Option5", a."Option6", a."Option7", a."Option8"
      FROM agreements a
      JOIN top_dealer_ids td ON a."DealerUUID" = td."DealerUUID"
      WHERE a."EffectiveDate" BETWEEN start_date AND end_date
    ),

    -- Calculate revenue once per agreement
    agreement_revenues AS (
      SELECT
        fa."AgreementID",
        fa."DealerUUID",
        fa.dealer_name,
        fa."AgreementStatus",
        COALESCE(fa."DealerCost", 0) +
        COALESCE((
          SELECT SUM(os.cost)
          FROM option_surcharge_price os
          WHERE os.product = fa."Product"
          AND os."Option" IN (
            fa."Option1", fa."Option2", fa."Option3", fa."Option4",
            fa."Option5", fa."Option6", fa."Option7", fa."Option8"
          )
        ), 0) AS calculated_revenue
      FROM filtered_agreements fa
    )

    -- Final aggregation
    SELECT
      ar."DealerUUID" AS dealer_uuid,
      ar.dealer_name,
      COUNT(ar."AgreementID") AS total_contracts,
      COUNT(CASE WHEN ar."AgreementStatus" = 'ACTIVE' THEN ar."AgreementID" END) AS active_contracts,
      COUNT(CASE WHEN ar."AgreementStatus" = 'PENDING' THEN ar."AgreementID" END) AS pending_contracts,
      COUNT(CASE WHEN ar."AgreementStatus" IN ('CANCELLED', 'VOID') THEN ar."AgreementID" END) AS cancelled_contracts,
      COALESCE(SUM(ar.calculated_revenue), 0) AS total_revenue,
      COALESCE(SUM(CASE WHEN ar."AgreementStatus" = 'PENDING' THEN ar.calculated_revenue ELSE 0 END), 0) AS expected_revenue,
      COALESCE(SUM(CASE WHEN ar."AgreementStatus" = 'ACTIVE' THEN ar.calculated_revenue ELSE 0 END), 0) AS funded_revenue,
      CASE
        WHEN COUNT(ar."AgreementID") = 0 THEN 0
        ELSE (COUNT(CASE WHEN ar."AgreementStatus" IN ('CANCELLED', 'VOID') THEN ar."AgreementID" END)::numeric / COUNT(ar."AgreementID")::numeric) * 100
      END AS cancellation_rate
    FROM agreement_revenues ar
    GROUP BY ar."DealerUUID", ar.dealer_name
    ORDER BY total_revenue DESC;
$$ LANGUAGE SQL;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_top_dealers_with_kpis(DATE, DATE, INT) TO authenticated;