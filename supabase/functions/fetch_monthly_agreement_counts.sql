-- Function to fetch monthly agreement counts
CREATE OR REPLACE FUNCTION fetch_monthly_agreement_counts(
  start_date DATE,
  end_date DATE
)
RETURNS TABLE (
  month TEXT,
  total INT
) AS $$
BEGIN
    RETURN QUERY 
    SELECT 
        TO_CHAR(DATE_TRUNC('month', "EffectiveDate"), 'YYYY-MM') AS month, 
        COUNT(*)::INT AS total
    FROM agreements
    WHERE "EffectiveDate" >= start_date
      AND "EffectiveDate" < end_date
    GROUP BY month
    ORDER BY month;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION fetch_monthly_agreement_counts(DATE, DATE) TO authenticated; 