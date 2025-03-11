-- Function to count agreements by status monthly
CREATE OR REPLACE FUNCTION count_agreements_by_status_monthly(
  from_month DATE,
  to_month DATE,
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
      "EffectiveDate"::DATE BETWEEN from_month::DATE AND to_month::DATE
      AND (dealer_uuid IS NULL OR "DealerID" = dealer_uuid::VARCHAR)
  GROUP BY status
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION count_agreements_by_status_monthly(DATE, DATE, UUID) TO authenticated; 