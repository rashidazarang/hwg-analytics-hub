-- Function to get top agents by contracts
CREATE OR REPLACE FUNCTION get_top_agents_by_contracts(
  start_date DATE,
  end_date DATE,
  limit_count INT DEFAULT 10
)
RETURNS TABLE (
  agent_name TEXT,
  contracts_closed BIGINT,
  total_revenue NUMERIC,
  cancelled_contracts BIGINT
) AS $$
  WITH all_agreements AS (
    SELECT 
      a."AgreementID",
      COALESCE(a."HolderFirstName", '') || ' ' || COALESCE(a."HolderLastName", '') AS agent_name,
      a."AgreementStatus",
      a."DealerCost",
      a."Product",
      a."Option1", a."Option2", a."Option3", a."Option4",
      a."Option5", a."Option6", a."Option7", a."Option8"
    FROM agreements a
    WHERE 
      a."EffectiveDate" BETWEEN start_date AND end_date
      AND (a."HolderFirstName" IS NOT NULL OR a."HolderLastName" IS NOT NULL)
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
  agreement_options AS (
    SELECT 
      a."AgreementID",
      a.agent_name,
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
    agent_name,
    COUNT("AgreementID") AS contracts_closed,
    COALESCE(SUM(calculated_revenue), 0) AS total_revenue,
    COUNT(CASE WHEN "AgreementStatus" = 'CANCELLED' THEN "AgreementID" END) AS cancelled_contracts
  FROM agreement_options
  GROUP BY agent_name
  HAVING TRIM(agent_name) <> ''
  ORDER BY contracts_closed DESC
  LIMIT limit_count;
$$ LANGUAGE SQL;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_top_agents_by_contracts(DATE, DATE, INT) TO authenticated; 