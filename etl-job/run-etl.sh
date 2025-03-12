#!/bin/bash
# Simple script to run the ETL job

# Base directory for the ETL job (default to current directory)
ETL_DIR="$(dirname "$(readlink -f "$0")")"

# Log file setup
LOG_DIR="${LOG_DIR:-/var/log/claim-analytics-hub}"
LOG_FILE="${LOG_DIR}/etl-$(date +%Y-%m-%d).log"

# Create log directory if it doesn't exist
mkdir -p $LOG_DIR

# Change to the ETL job directory
cd $ETL_DIR

# Run the ETL script and log the output
echo "Starting ETL job at $(date)" > $LOG_FILE
/usr/bin/node etl.js >> $LOG_FILE 2>&1
EXIT_CODE=$?
echo "ETL job completed at $(date) with exit code $EXIT_CODE" >> $LOG_FILE