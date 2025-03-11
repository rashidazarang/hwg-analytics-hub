-- Function to count agreements by status
CREATE OR REPLACE FUNCTION count_agreements_by_status(
  from_date DATE,
  to_date DATE,
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
      "EffectiveDate"::DATE BETWEEN from_date::DATE AND to_date::DATE
      AND (dealer_uuid IS NULL OR "DealerID" = dealer_uuid::VARCHAR)
  GROUP BY status
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION count_agreements_by_status(DATE, DATE, UUID) TO authenticated; 