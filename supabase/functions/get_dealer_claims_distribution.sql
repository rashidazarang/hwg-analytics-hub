-- Drop all existing versions of the function first
DROP FUNCTION IF EXISTS get_dealer_claims_distribution(UUID, TIMESTAMP, TIMESTAMP);
DROP FUNCTION IF EXISTS get_dealer_claims_distribution(TEXT, TIMESTAMP, TIMESTAMP);

-- Function to get dealer claims distribution by status
CREATE OR REPLACE FUNCTION get_dealer_claims_distribution(
  dealer_id TEXT,
  start_date TIMESTAMP,
  end_date TIMESTAMP
)
RETURNS TABLE (
  status TEXT,
  count INTEGER,
  percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH status_counts AS (
    SELECT 
      CASE 
        WHEN c."Closed" IS NULL THEN 'Open'
        ELSE 'Closed'
      END::TEXT AS status,
      COUNT(*)::INTEGER AS count
    FROM claims c
    JOIN agreements a ON c."AgreementID" = a."AgreementID"
    WHERE a."DealerUUID" = dealer_id
      AND a."EffectiveDate" BETWEEN start_date AND end_date
    GROUP BY status
  ),
  total AS (
    SELECT SUM(status_counts.count)::NUMERIC AS total FROM status_counts
  )
  SELECT 
    sc.status::TEXT,
    sc.count::INTEGER,
    CASE 
      WHEN t.total > 0 THEN (sc.count::NUMERIC / t.total::NUMERIC) * 100
      ELSE 0
    END::NUMERIC AS percentage
  FROM status_counts sc, total t
  ORDER BY sc.count DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_dealer_claims_distribution(TEXT, TIMESTAMP, TIMESTAMP) TO authenticated; 