-- Function to count agreements by status daily
CREATE OR REPLACE FUNCTION count_agreements_by_status_daily(
  from_day DATE,
  to_day DATE,
  dealer_uuid UUID DEFAULT NULL
)
RETURNS TABLE (
  status TEXT,
  count INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
      COALESCE("AgreementStatus", 'Unknown')::TEXT AS status,
      COUNT(*)::INT AS count
  FROM public.agreements 
  WHERE 
      "EffectiveDate"::DATE BETWEEN from_day::DATE AND to_day::DATE
      AND (dealer_uuid IS NULL OR "DealerID" = dealer_uuid::VARCHAR)
  GROUP BY status
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION count_agreements_by_status_daily(DATE, DATE, UUID) TO authenticated; 