-- Set timezone to CST for consistency
SET timezone = 'America/Chicago';

-- Function to calculate revenue growth between two periods
CREATE OR REPLACE FUNCTION calculate_revenue_growth(
  current_start_date TEXT,
  current_end_date TEXT,
  previous_start_date TEXT,
  previous_end_date TEXT
) RETURNS TABLE (
  current_revenue NUMERIC,
  previous_revenue NUMERIC,
  growth_rate NUMERIC
) AS $$
DECLARE
  curr_rev NUMERIC;
  prev_rev NUMERIC;
  growth NUMERIC;
BEGIN
  -- Calculate current period revenue
  SELECT COALESCE(SUM(revenue), 0) INTO curr_rev
  FROM get_agreements_with_revenue(current_start_date, current_end_date);
  
  -- Calculate previous period revenue
  SELECT COALESCE(SUM(revenue), 0) INTO prev_rev
  FROM get_agreements_with_revenue(previous_start_date, previous_end_date);
  
  -- Calculate growth rate
  IF prev_rev > 0 THEN
    growth := ((curr_rev - prev_rev) / prev_rev) * 100;
  ELSE
    growth := 0;
  END IF;
  
  RETURN QUERY SELECT
    curr_rev AS current_revenue,
    prev_rev AS previous_revenue,
    growth AS growth_rate;
END;
$$ LANGUAGE plpgsql;