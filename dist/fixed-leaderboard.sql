-- Helper function to calculate revenue for a single agreement
CREATE OR REPLACE FUNCTION public.calculate_agreement_revenue(agreement_id text)
 RETURNS numeric
 LANGUAGE sql
AS $function$
  WITH agreement_data AS (
    SELECT 
      a."DealerCost",
      a."Product",
      a."Option1", a."Option2", a."Option3", a."Option4", 
      a."Option5", a."Option6", a."Option7", a."Option8"
    FROM agreements a
    WHERE a."AgreementID" = agreement_id
  ),
  option_costs AS (
    SELECT
      os.product,
      os."Option",
      os.cost
    FROM option_surcharge_price os
    JOIN agreement_data ad ON os.product = ad."Product"
    WHERE os."Option" IN (
      ad."Option1", ad."Option2", ad."Option3", ad."Option4",
      ad."Option5", ad."Option6", ad."Option7", ad."Option8"
    )
  )
  SELECT 
    COALESCE(ad."DealerCost", 0) +
    COALESCE((SELECT SUM(cost) FROM option_costs), 0)
  FROM agreement_data ad;
$function$;

-- Create a function to get top agents by contracts with updated revenue calculation
CREATE OR REPLACE FUNCTION public.get_top_agents_by_contracts(start_date timestamp without time zone, end_date timestamp without time zone, limit_count integer DEFAULT 10)
 RETURNS TABLE(agent_name text, contracts_closed bigint, total_revenue numeric, cancelled_contracts bigint)
 LANGUAGE sql
AS $function$
  WITH all_agreements AS (
    SELECT 
      a."AgreementID",
      COALESCE(a."HolderFirstName", '') || ' ' || COALESCE(a."HolderLastName", '') AS agent_name,
      a."AgreementStatus",
      a."DealerCost",
      a."Product",
      a."Option1", a."Option2", a."Option3", a."Option4",
      a."Option5", a."Option6", a."Option7", a."Option8"
    FROM agreements a
    WHERE 
      a."EffectiveDate" BETWEEN start_date AND end_date
      AND (a."HolderFirstName" IS NOT NULL OR a."HolderLastName" IS NOT NULL)
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
  agreement_options AS (
    SELECT 
      a."AgreementID",
      a.agent_name,
      a."AgreementStatus",
      COALESCE(a."DealerCost", 0) +
      COALESCE((
        SELECT SUM(o.cost) 
        FROM all_options o 
        WHERE 
          o.product = a."Product" AND
          o."Option" IN (a."Option1", a."Option2", a."Option3", a."Option4", a."Option5", a."Option6", a."Option7", a."Option8")
      ), 0) AS calculated_revenue
    FROM all_agreements a
  )
  
  SELECT 
    agent_name,
    COUNT("AgreementID") AS contracts_closed,
    COALESCE(SUM(calculated_revenue), 0) AS total_revenue,
    COUNT(CASE WHEN "AgreementStatus" = 'CANCELLED' THEN "AgreementID" END) AS cancelled_contracts
  FROM agreement_options
  GROUP BY agent_name
  HAVING TRIM(agent_name) <> ''
  ORDER BY contracts_closed DESC
  LIMIT limit_count;
$function$;

-- Create a function to get top dealers by revenue with updated revenue calculation
CREATE OR REPLACE FUNCTION public.get_top_dealers_by_revenue(start_date timestamp without time zone, end_date timestamp without time zone, limit_count integer DEFAULT 10)
 RETURNS TABLE(dealer_name text, total_contracts bigint, total_revenue numeric, cancelled_contracts bigint)
 LANGUAGE sql
AS $function$
  WITH all_agreements AS (
    SELECT 
      a."AgreementID",
      a."AgreementStatus",
      a."DealerUUID",
      a."DealerCost",
      a."Product",
      a."Option1", a."Option2", a."Option3", a."Option4",
      a."Option5", a."Option6", a."Option7", a."Option8",
      d."Payee" AS dealer_name
    FROM agreements a
    JOIN dealers d ON a."DealerUUID" = d."DealerUUID"
    WHERE 
      a."EffectiveDate" BETWEEN start_date AND end_date
      AND d."Payee" IS NOT NULL
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
  agreement_revenues AS (
    SELECT 
      a."AgreementID",
      a.dealer_name,
      a."AgreementStatus",
      COALESCE(a."DealerCost", 0) +
      COALESCE((
        SELECT SUM(o.cost) 
        FROM all_options o 
        WHERE 
          o.product = a."Product" AND
          o."Option" IN (a."Option1", a."Option2", a."Option3", a."Option4", a."Option5", a."Option6", a."Option7", a."Option8")
      ), 0) AS calculated_revenue
    FROM all_agreements a
  )
  
  SELECT 
    dealer_name,
    COUNT("AgreementID") AS total_contracts,
    COALESCE(SUM(calculated_revenue), 0) AS total_revenue,
    COUNT(CASE WHEN "AgreementStatus" = 'CANCELLED' THEN "AgreementID" END) AS cancelled_contracts
  FROM agreement_revenues
  GROUP BY dealer_name
  ORDER BY total_revenue DESC
  LIMIT limit_count;
$function$;

-- Create a function to get revenue growth rates with updated revenue calculation
CREATE OR REPLACE FUNCTION public.calculate_revenue_growth(current_start_date timestamp without time zone, current_end_date timestamp without time zone, previous_start_date timestamp without time zone, previous_end_date timestamp without time zone)
 RETURNS TABLE(current_revenue numeric, previous_revenue numeric, growth_rate numeric)
 LANGUAGE sql
AS $function$
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
$function$;

-- Create a function to get leaderboard summary data with updated revenue calculation
CREATE OR REPLACE FUNCTION public.get_leaderboard_summary(start_date timestamp without time zone, end_date timestamp without time zone)
 RETURNS TABLE(active_contracts bigint, total_revenue numeric, cancellation_rate numeric, top_dealer text, top_agent text)
 LANGUAGE sql
AS $function$
  WITH all_agreements AS (
    SELECT 
      a."AgreementID",
      a."AgreementStatus",
      a."DealerUUID",
      COALESCE(a."HolderFirstName", '') || ' ' || COALESCE(a."HolderLastName", '') AS agent_name,
      a."DealerCost",
      a."Product",
      a."Option1", a."Option2", a."Option3", a."Option4",
      a."Option5", a."Option6", a."Option7", a."Option8"
    FROM agreements a
    WHERE a."EffectiveDate" BETWEEN start_date AND end_date
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
  agreement_revenues AS (
    SELECT 
      a."AgreementID",
      a."AgreementStatus",
      a."DealerUUID",
      a.agent_name,
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
  summary AS (
    SELECT 
      COUNT(CASE WHEN "AgreementStatus" = 'ACTIVE' THEN "AgreementID" END) AS active_contracts,
      COUNT(CASE WHEN "AgreementStatus" = 'CANCELLED' THEN "AgreementID" END) AS cancelled_contracts,
      COUNT("AgreementID") AS total_contracts,
      COALESCE(SUM(CASE WHEN "AgreementStatus" = 'ACTIVE' THEN calculated_revenue ELSE 0 END), 0) AS total_revenue
    FROM agreement_revenues
  ),
  top_dealer AS (
    SELECT d."Payee" AS dealer_name
    FROM agreement_revenues ar
    JOIN dealers d ON ar."DealerUUID" = d."DealerUUID"
    WHERE ar."AgreementStatus" = 'ACTIVE'
    GROUP BY d."Payee"
    ORDER BY SUM(ar.calculated_revenue) DESC
    LIMIT 1
  ),
  top_agent AS (
    SELECT agent_name
    FROM agreement_revenues
    WHERE "AgreementStatus" = 'ACTIVE'
      AND TRIM(agent_name) <> ''
    GROUP BY agent_name
    ORDER BY COUNT("AgreementID") DESC
    LIMIT 1
  )
  
  SELECT 
    s.active_contracts,
    s.total_revenue,
    CASE 
      WHEN s.total_contracts = 0 THEN 0 
      ELSE (s.cancelled_contracts::numeric / s.total_contracts::numeric * 100)
    END AS cancellation_rate,
    td.dealer_name,
    ta.agent_name
  FROM 
    summary s,
    top_dealer td,
    top_agent ta;
$function$;

-- Function to get agreements with calculated revenue
CREATE OR REPLACE FUNCTION public.get_agreements_with_revenue(start_date timestamp without time zone, end_date timestamp without time zone)
 RETURNS TABLE (
   "AgreementID" text,
   "AgreementStatus" text,
   "DealerUUID" text,
   dealers jsonb,
   revenue numeric
 )
 LANGUAGE sql
AS $function$
  WITH all_agreements AS (
    SELECT 
      a."AgreementID",
      a."AgreementStatus",
      a."DealerUUID",
      a."DealerCost",
      a."Product",
      a."Option1", a."Option2", a."Option3", a."Option4",
      a."Option5", a."Option6", a."Option7", a."Option8"
    FROM agreements a
    WHERE a."EffectiveDate" BETWEEN start_date AND end_date
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
  )
  SELECT 
    a."AgreementID",
    a."AgreementStatus",
    a."DealerUUID",
    jsonb_build_object('Payee', d."Payee") AS dealers,
    COALESCE(a."DealerCost", 0) +
    COALESCE((
      SELECT SUM(o.cost) 
      FROM all_options o 
      WHERE 
        o.product = a."Product" AND
        o."Option" IN (a."Option1", a."Option2", a."Option3", a."Option4", a."Option5", a."Option6", a."Option7", a."Option8")
    ), 0) AS revenue
  FROM all_agreements a
  JOIN dealers d ON a."DealerUUID" = d."DealerUUID";
$function$;

-- Set timezone function
CREATE OR REPLACE FUNCTION set_timezone(timezone_name TEXT)
RETURNS void AS $$
BEGIN
  EXECUTE format('SET timezone TO %L', timezone_name);
END;
$$ LANGUAGE plpgsql;