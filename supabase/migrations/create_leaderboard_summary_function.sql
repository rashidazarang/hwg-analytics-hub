-- Create a function to get leaderboard summary data with proper revenue calculation
-- This function calculates revenue as DealerCost + the cost of all options
CREATE OR REPLACE FUNCTION public.get_leaderboard_summary(start_date timestamp without time zone, end_date timestamp without time zone)
RETURNS TABLE(
  active_contracts bigint, 
  total_revenue numeric, 
  cancellation_rate numeric, 
  top_dealer text, 
  top_agent text
)
LANGUAGE sql
AS $$
  WITH all_agreements AS (
    SELECT 
      a."AgreementID",
      a."AgreementStatus",
      a."DealerUUID",
      COALESCE(a."HolderFirstName", '') || ' ' || COALESCE(a."HolderLastName", '') AS agent_name,
      a."DealerCost",
      a."Product",
      a."Option1", a."Option2", a."Option3", a."Option4",
      a."Option5", a."Option6", a."Option7", a."Option8"
    FROM agreements a
    WHERE a."EffectiveDate" BETWEEN start_date AND end_date
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
      a."AgreementStatus",
      a."DealerUUID",
      a.agent_name,
      COALESCE(a."DealerCost", 0) +
      COALESCE((
        SELECT SUM(o.cost) 
        FROM all_options o 
        WHERE 
          o.product = a."Product" AND
          o."Option" IN (a."Option1", a."Option2", a."Option3", a."Option4", a."Option5", a."Option6", a."Option7", a."Option8")
      ), 0) AS calculated_revenue
    FROM all_agreements a
  ),
  summary AS (
    SELECT 
      COUNT(CASE WHEN "AgreementStatus" = 'ACTIVE' THEN "AgreementID" END) AS active_contracts,
      COUNT(CASE WHEN "AgreementStatus" = 'CANCELLED' THEN "AgreementID" END) AS cancelled_contracts,
      COUNT("AgreementID") AS total_contracts,
      COALESCE(SUM(CASE WHEN "AgreementStatus" = 'ACTIVE' THEN calculated_revenue ELSE 0 END), 0) AS total_revenue
    FROM agreement_revenues
  ),
  top_dealer AS (
    SELECT d."Payee" AS dealer_name
    FROM agreement_revenues ar
    JOIN dealers d ON ar."DealerUUID" = d."DealerUUID"
    WHERE ar."AgreementStatus" = 'ACTIVE'
    GROUP BY d."Payee"
    ORDER BY SUM(ar.calculated_revenue) DESC
    LIMIT 1
  ),
  top_agent AS (
    SELECT agent_name
    FROM agreement_revenues
    WHERE "AgreementStatus" = 'ACTIVE'
      AND TRIM(agent_name) <> ''
    GROUP BY agent_name
    ORDER BY COUNT("AgreementID") DESC
    LIMIT 1
  )
  
  SELECT 
    s.active_contracts,
    s.total_revenue,
    CASE 
      WHEN s.total_contracts = 0 THEN 0 
      ELSE (s.cancelled_contracts::numeric / s.total_contracts::numeric * 100)
    END AS cancellation_rate,
    COALESCE(td.dealer_name, 'No active dealers') AS dealer_name,
    COALESCE(ta.agent_name, 'No active agents') AS agent_name
  FROM 
    summary s
    LEFT JOIN top_dealer td ON TRUE
    LEFT JOIN top_agent ta ON TRUE;
$$;