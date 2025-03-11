-- Drop all existing versions of the function first
DROP FUNCTION IF EXISTS get_dealer_agreement_distribution(UUID, TIMESTAMP, TIMESTAMP);
DROP FUNCTION IF EXISTS get_dealer_agreement_distribution(TEXT, TIMESTAMP, TIMESTAMP);

-- Function to get the distribution of dealer agreements by status
CREATE OR REPLACE FUNCTION get_dealer_agreement_distribution(
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
      COALESCE("AgreementStatus", 'Unknown')::TEXT AS status,
      COUNT(*)::INTEGER AS count
    FROM agreements
    WHERE "DealerUUID" = dealer_id
      AND "EffectiveDate" BETWEEN start_date AND end_date
    GROUP BY "AgreementStatus"
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
GRANT EXECUTE ON FUNCTION get_dealer_agreement_distribution(TEXT, TIMESTAMP, TIMESTAMP) TO authenticated; 