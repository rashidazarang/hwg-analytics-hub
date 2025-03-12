#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting ETL process...${NC}"

# Load environment variables from .env.etl
if [ -f .env.etl ]; then
  echo -e "${GREEN}Loading environment variables from .env.etl${NC}"
  export $(grep -v '^#' .env.etl | xargs)
else
  echo -e "${RED}Error: .env.etl file not found${NC}"
  exit 1
fi

# Check if MongoDB URI is set
if [ -z "$MONGODB_URI" ]; then
  echo -e "${RED}Error: MONGODB_URI is not set${NC}"
  exit 1
fi

# Check if Supabase credentials are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE" ]; then
  echo -e "${RED}Error: Supabase credentials are not set${NC}"
  exit 1
fi

# Test MongoDB connection
echo -e "${YELLOW}Testing MongoDB connection...${NC}"
mongosh "$MONGODB_URI" --eval "db.adminCommand('ping')" > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo -e "${RED}Error: Could not connect to MongoDB${NC}"
  echo -e "${YELLOW}Make sure you're connected to the VPN or have network access to MongoDB Atlas${NC}"
  exit 1
fi
echo -e "${GREEN}MongoDB connection successful!${NC}"

# Run the ETL script
echo -e "${YELLOW}Running ETL script...${NC}"
node etl.js

# Check if the ETL script ran successfully
if [ $? -eq 0 ]; then
  echo -e "${GREEN}ETL process completed successfully!${NC}"
else
  echo -e "${RED}ETL process failed. Check the logs above for errors.${NC}"
  exit 1
fi 