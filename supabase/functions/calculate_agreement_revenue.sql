-- Function to calculate agreement revenue
CREATE OR REPLACE FUNCTION calculate_agreement_revenue(agreement_id TEXT)
RETURNS NUMERIC AS $$
  WITH agreement_data AS (
    SELECT 
      a."DealerCost",
      a."Product",
      a."Option1", a."Option2", a."Option3", a."Option4", 
      a."Option5", a."Option6", a."Option7", a."Option8"
    FROM agreements a
    WHERE a."AgreementID" = agreement_id
  ),
  option_costs AS (
    SELECT
      os.product,
      os."Option",
      os.cost
    FROM option_surcharge_price os
    JOIN agreement_data ad ON os.product = ad."Product"
    WHERE os."Option" IN (
      ad."Option1", ad."Option2", ad."Option3", ad."Option4",
      ad."Option5", ad."Option6", ad."Option7", ad."Option8"
    )
  )
  SELECT 
    COALESCE(ad."DealerCost", 0) +
    COALESCE((SELECT SUM(cost) FROM option_costs), 0)
  FROM agreement_data ad;
$$ LANGUAGE SQL;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION calculate_agreement_revenue(TEXT) TO authenticated; 