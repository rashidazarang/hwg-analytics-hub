-- Function to verify auth setup
CREATE OR REPLACE FUNCTION check_auth_setup()
RETURNS TEXT AS $$
BEGIN
  -- Just a simple function to verify we can run SQL commands
  -- The actual auth configuration will be done in the Supabase dashboard
  RETURN 'Auth setup check completed. Please configure email settings in the Supabase dashboard.';
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_auth_setup() TO authenticated; 