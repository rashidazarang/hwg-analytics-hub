-- Set timezone to CST for consistency
SET timezone = 'America/Chicago';

-- Function to get agreements with revenue
CREATE OR REPLACE FUNCTION get_agreements_with_revenue(
  start_date DATE,
  end_date DATE
)
RETURNS TABLE (
  "AgreementID" TEXT,
  "AgreementStatus" TEXT,
  "DealerUUID" TEXT,
  dealers JSONB,
  revenue NUMERIC
) AS $$
  WITH all_agreements AS (
    SELECT 
      a."AgreementID",
      a."AgreementStatus",
      a."DealerUUID",
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
  )
  SELECT 
    a."AgreementID",
    a."AgreementStatus",
    a."DealerUUID",
    jsonb_build_object('Payee', d."Payee") AS dealers,
    COALESCE(a."DealerCost", 0) +
    COALESCE((
      SELECT SUM(o.cost) 
      FROM all_options o 
      WHERE 
        o.product = a."Product" AND
        o."Option" IN (a."Option1", a."Option2", a."Option3", a."Option4", a."Option5", a."Option6", a."Option7", a."Option8")
    ), 0) AS revenue
  FROM all_agreements a
  JOIN dealers d ON a."DealerUUID" = d."DealerUUID";
$$ LANGUAGE SQL;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_agreements_with_revenue(DATE, DATE) TO authenticated;