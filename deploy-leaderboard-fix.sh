#!/bin/bash
# Script to deploy leaderboard fix to production database

# ANSI color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Preparing to deploy leaderboard SQL function...${NC}"

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}Error: PostgreSQL client (psql) is not installed. Please install it first.${NC}"
    exit 1
fi

# Check for required environment variables
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL environment variable is not set.${NC}"
    echo -e "${YELLOW}Please set it to your Supabase PostgreSQL connection string:${NC}"
    echo -e "export DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres"
    exit 1
fi

echo -e "${YELLOW}Running migration to add detailed top dealers function...${NC}"

# Execute the SQL function
psql "$DATABASE_URL" -f ./supabase/migrations/add_detailed_top_dealers_function.sql

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Successfully added get_top_dealers_with_kpis function!${NC}"
else
    echo -e "${RED}❌ Failed to add the function. Check the error message above.${NC}"
    exit 1
fi

echo -e "${YELLOW}Testing the new function...${NC}"

# Test the function with a simple query
psql "$DATABASE_URL" -c "SELECT count(*) FROM get_top_dealers_with_kpis('2024-01-01', '2024-12-31');"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Function test successful!${NC}"
    echo ""
    echo -e "${GREEN}==========================================${NC}"
    echo -e "${GREEN}   Leaderboard fix has been deployed!${NC}"
    echo -e "${GREEN}==========================================${NC}"
    echo ""
    echo -e "You can now refresh the leaderboard page to see the changes."
else
    echo -e "${RED}❌ Function test failed. The function may not be working correctly.${NC}"
    exit 1
fi