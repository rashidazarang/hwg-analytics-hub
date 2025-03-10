-- Function to set session timezone
CREATE OR REPLACE FUNCTION set_timezone(timezone_name TEXT)
RETURNS void AS $$
BEGIN
  EXECUTE format('SET timezone TO %L', timezone_name);
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION set_timezone(TEXT) TO authenticated;