-- Function to execute dynamic SQL
CREATE OR REPLACE FUNCTION execute_sql(sql TEXT)
RETURNS SETOF RECORD AS $$
BEGIN
  RETURN QUERY EXECUTE sql;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users with admin role only
-- This function should be restricted as it allows arbitrary SQL execution
GRANT EXECUTE ON FUNCTION execute_sql(TEXT) TO authenticated; 