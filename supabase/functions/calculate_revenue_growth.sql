-- Set timezone to CST for consistency
SET timezone = 'America/Chicago';

-- Function to calculate revenue growth
CREATE OR REPLACE FUNCTION calculate_revenue_growth(
  current_start_date DATE,
  current_end_date DATE,
  previous_start_date DATE,
  previous_end_date DATE
)
RETURNS TABLE (
  current_revenue NUMERIC,
  previous_revenue NUMERIC,
  growth_rate NUMERIC
) AS $$
  WITH all_agreements AS (
    SELECT 
      a."AgreementID",
      a."AgreementStatus",
      a."DealerCost",
      a."Product",
      a."Option1", a."Option2", a."Option3", a."Option4",
      a."Option5", a."Option6", a."Option7", a."Option8",
      CASE 
        WHEN a."EffectiveDate" BETWEEN current_start_date AND current_end_date THEN 'current'
        WHEN a."EffectiveDate" BETWEEN previous_start_date AND previous_end_date THEN 'previous'
        ELSE 'other'
      END AS period
    FROM agreements a
    WHERE 
      (a."EffectiveDate" BETWEEN current_start_date AND current_end_date OR
       a."EffectiveDate" BETWEEN previous_start_date AND previous_end_date)
      AND a."AgreementStatus" = 'ACTIVE'
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
  calculated_revenues AS (
    SELECT 
      a.period,
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
  period_totals AS (
    SELECT
      COALESCE(SUM(CASE WHEN period = 'current' THEN calculated_revenue ELSE 0 END), 0) AS current_revenue,
      COALESCE(SUM(CASE WHEN period = 'previous' THEN calculated_revenue ELSE 0 END), 0) AS previous_revenue
    FROM calculated_revenues
  )
  SELECT 
    current_revenue,
    previous_revenue,
    CASE 
      WHEN previous_revenue = 0 THEN 
        CASE WHEN current_revenue > 0 THEN 100 ELSE 0 END
      ELSE
        ((current_revenue - previous_revenue) / previous_revenue * 100)
    END AS growth_rate
  FROM period_totals;
$$ LANGUAGE SQL;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION calculate_revenue_growth(DATE, DATE, DATE, DATE) TO authenticated;