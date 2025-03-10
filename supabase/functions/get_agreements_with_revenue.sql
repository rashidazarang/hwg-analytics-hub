-- Set timezone to CST for consistency
SET timezone = 'America/Chicago';

-- Function to get agreements with revenue calculated from DealerCost + option surcharges
CREATE OR REPLACE FUNCTION get_agreements_with_revenue(start_date TEXT, end_date TEXT)
RETURNS TABLE (
  AgreementID TEXT,
  AgreementStatus TEXT,
  DealerUUID TEXT,
  dealers JSONB,
  revenue NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a."AgreementID",
    a."AgreementStatus",
    a."DealerUUID",
    (SELECT jsonb_build_object('Payee', d."Payee") FROM dealers d WHERE d."DealerUUID" = a."DealerUUID") AS dealers,
    (
      COALESCE(a."DealerCost", 0)
      + COALESCE((SELECT cost FROM option_surcharge_price WHERE product = a."Product" AND option_name = a."Option1"), 0)
      + COALESCE((SELECT cost FROM option_surcharge_price WHERE product = a."Product" AND option_name = a."Option2"), 0)
      + COALESCE((SELECT cost FROM option_surcharge_price WHERE product = a."Product" AND option_name = a."Option3"), 0)
      + COALESCE((SELECT cost FROM option_surcharge_price WHERE product = a."Product" AND option_name = a."Option4"), 0)
      + COALESCE((SELECT cost FROM option_surcharge_price WHERE product = a."Product" AND option_name = a."Option5"), 0)
      + COALESCE((SELECT cost FROM option_surcharge_price WHERE product = a."Product" AND option_name = a."Option6"), 0)
      + COALESCE((SELECT cost FROM option_surcharge_price WHERE product = a."Product" AND option_name = a."Option7"), 0)
      + COALESCE((SELECT cost FROM option_surcharge_price WHERE product = a."Product" AND option_name = a."Option8"), 0)
    ) AS revenue
  FROM
    agreements a
  WHERE
    a."EffectiveDate" >= start_date::TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'America/Chicago'
    AND a."EffectiveDate" <= end_date::TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'America/Chicago';
END;
$$ LANGUAGE plpgsql;