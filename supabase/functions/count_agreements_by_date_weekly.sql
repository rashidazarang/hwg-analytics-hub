-- Function to count agreements by date with weekly granularity
CREATE OR REPLACE FUNCTION count_agreements_by_date_weekly(
  from_week DATE,
  to_week DATE,
  dealer_uuid UUID DEFAULT NULL
)
RETURNS TABLE (
  date_group TEXT,
  total_count BIGINT,
  pending_count BIGINT,
  active_count BIGINT,
  claimable_count BIGINT,
  cancelled_count BIGINT,
  void_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH filtered_agreements AS (
    SELECT 
      "EffectiveDate",
      "AgreementStatus"
    FROM 
      agreements
    WHERE 
      DATE_TRUNC('week', "EffectiveDate") BETWEEN DATE_TRUNC('week', from_week) AND DATE_TRUNC('week', to_week)
      AND (dealer_uuid IS NULL OR "DealerID" = dealer_uuid::VARCHAR)
  )
  SELECT
    TO_CHAR(DATE_TRUNC('week', "EffectiveDate"), 'YYYY-MM-DD') AS date_group,
    COUNT(*) AS total_count,
    COUNT(*) FILTER (WHERE "AgreementStatus" = 'PENDING') AS pending_count,
    COUNT(*) FILTER (WHERE "AgreementStatus" = 'ACTIVE') AS active_count,
    COUNT(*) FILTER (WHERE "AgreementStatus" = 'CLAIMABLE') AS claimable_count,
    COUNT(*) FILTER (WHERE "AgreementStatus" = 'CANCELLED') AS cancelled_count,
    COUNT(*) FILTER (WHERE "AgreementStatus" = 'VOID') AS void_count
  FROM 
    filtered_agreements
  GROUP BY 
    date_group
  ORDER BY 
    date_group;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION count_agreements_by_date_weekly(DATE, DATE, UUID) TO authenticated; 