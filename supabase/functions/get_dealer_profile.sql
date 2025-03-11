-- Drop all existing versions of the function first
DROP FUNCTION IF EXISTS get_dealer_profile(UUID, TIMESTAMP, TIMESTAMP);
DROP FUNCTION IF EXISTS get_dealer_profile(TEXT, TIMESTAMP, TIMESTAMP);

-- Function to get dealer profile data using approved functions
CREATE OR REPLACE FUNCTION get_dealer_profile(
  dealer_id TEXT,
  start_date TIMESTAMP,
  end_date TIMESTAMP
)
RETURNS TABLE (
  dealer_uuid TEXT,
  dealer_name TEXT,
  dealer_address TEXT,
  dealer_city TEXT,
  dealer_region TEXT,
  dealer_country TEXT,
  dealer_postal_code TEXT,
  dealer_contact TEXT,
  dealer_phone TEXT,
  dealer_email TEXT,
  total_contracts INTEGER,
  active_contracts INTEGER,
  pending_contracts INTEGER,
  cancelled_contracts INTEGER,
  expired_contracts INTEGER,
  total_revenue NUMERIC,
  expected_revenue NUMERIC,
  funded_revenue NUMERIC,
  cancellation_rate NUMERIC,
  total_claims INTEGER,
  open_claims INTEGER,
  closed_claims INTEGER,
  claims_per_contract NUMERIC,
  avg_claim_resolution_days NUMERIC
) AS $$
BEGIN
  -- Get dealer data using get_top_dealers_optimized
  RETURN QUERY
  WITH dealer_data AS (
    SELECT 
      t.dealer_uuid,
      t.dealer_name AS dealer_name_from_stats,
      t.total_contracts,
      t.active_contracts,
      t.pending_contracts,
      t.cancelled_contracts,
      t.total_revenue,
      t.expected_revenue,
      t.funded_revenue,
      t.cancellation_rate
    FROM get_top_dealers_optimized(start_date::DATE, end_date::DATE, 1000) t
    WHERE t.dealer_uuid = dealer_id
  ),
  dealer_info AS (
    SELECT
      "DealerUUID",
      "Payee",
      "Address",
      "City",
      "Region",
      "Country",
      "PostalCode",
      "Contact",
      "Phone",
      "EMail"
    FROM dealers
    WHERE "DealerUUID" = dealer_id
  ),
  claims_info AS (
    SELECT
      COUNT(*)::INTEGER AS total_claims,
      COUNT(*) FILTER (WHERE c."Closed" IS NULL)::INTEGER AS open_claims,
      COUNT(*) FILTER (WHERE c."Closed" IS NOT NULL)::INTEGER AS closed_claims,
      AVG(
        CASE 
          WHEN c."Closed" IS NOT NULL AND c."ReportedDate" IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (c."Closed" - c."ReportedDate")) / 86400
          ELSE NULL
        END
      ) AS avg_claim_resolution_days
    FROM claims c
    JOIN agreements a ON c."AgreementID" = a."AgreementID"
    WHERE a."DealerUUID" = dealer_id
      AND a."EffectiveDate" BETWEEN start_date AND end_date
  )
  
  SELECT
    di."DealerUUID",
    di."Payee",
    di."Address",
    di."City",
    di."Region",
    di."Country",
    di."PostalCode",
    di."Contact",
    di."Phone",
    di."EMail",
    COALESCE(dd.total_contracts, 0)::INTEGER,
    COALESCE(dd.active_contracts, 0)::INTEGER,
    COALESCE(dd.pending_contracts, 0)::INTEGER,
    COALESCE(dd.cancelled_contracts, 0)::INTEGER,
    0::INTEGER, -- expired_contracts set explicitly to 0 if intended
    COALESCE(dd.total_revenue, 0),
    COALESCE(dd.expected_revenue, 0),
    COALESCE(dd.funded_revenue, 0),
    COALESCE(dd.cancellation_rate, 0),
    COALESCE(ci.total_claims, 0)::INTEGER,
    COALESCE(ci.open_claims, 0)::INTEGER,
    COALESCE(ci.closed_claims, 0)::INTEGER,
    CASE 
      WHEN COALESCE(dd.total_contracts, 0) > 0 THEN COALESCE(ci.total_claims, 0)::NUMERIC / dd.total_contracts::NUMERIC
      ELSE 0
    END AS claims_per_contract,
    COALESCE(ci.avg_claim_resolution_days, 0)
  FROM dealer_info di
  LEFT JOIN dealer_data dd ON di."DealerUUID" = dd.dealer_uuid
  CROSS JOIN claims_info ci;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_dealer_profile(TEXT, TIMESTAMP, TIMESTAMP) TO authenticated; 