-- Create an enhanced top dealers function that includes all the fields we need
CREATE OR REPLACE FUNCTION public.get_top_dealers_with_kpis(start_date timestamp without time zone, end_date timestamp without time zone, limit_count integer DEFAULT 10)
RETURNS TABLE(
  dealer_uuid text,
  dealer_name text,
  total_contracts bigint,
  active_contracts bigint,
  pending_contracts bigint,
  cancelled_contracts bigint,
  total_revenue numeric,
  expected_revenue numeric,
  funded_revenue numeric,
  cancellation_rate numeric
) 
LANGUAGE sql
AS $$
  WITH all_agreements AS (
    SELECT 
      a."AgreementID",
      a."AgreementStatus",
      a."DealerUUID",
      a."DealerCost",
      a."Product",
      a."Option1", a."Option2", a."Option3", a."Option4",
      a."Option5", a."Option6", a."Option7", a."Option8",
      d."Payee" AS dealer_name
    FROM agreements a
    JOIN dealers d ON a."DealerUUID" = d."DealerUUID"
    WHERE 
      a."EffectiveDate" BETWEEN start_date AND end_date
      AND d."Payee" IS NOT NULL
  ),
  all_options AS (
    SELECT 
      os.product,
      os."Option",
      os.cost
    FROM option_surcharge_price os
    WHERE EXISTS (
      SELECT 1 FROM all_agreements 
      WHERE os.product = all_agreements."Product"
    )
  ),
  agreement_revenues AS (
    SELECT 
      a."AgreementID",
      a."DealerUUID",
      a.dealer_name,
      a."AgreementStatus",
      COALESCE(a."DealerCost", 0) +
      COALESCE((
        SELECT SUM(o.cost) 
        FROM all_options o 
        WHERE 
          o.product = a."Product" AND
          o."Option" IN (a."Option1", a."Option2", a."Option3", a."Option4", a."Option5", a."Option6", a."Option7", a."Option8")
      ), 0) AS calculated_revenue
    FROM all_agreements a
  )
  
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
  ORDER BY total_revenue DESC
  LIMIT limit_count;
$$;