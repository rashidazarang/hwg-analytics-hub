#!/bin/bash

FILTERS_PATH="/Users/rashid/HWG FIles 2.0/claim-analytics-hub/replace-filters.sed"

# Run git filter-branch to replace sensitive data in all files
git filter-branch --force --index-filter \
    "git ls-files -z | xargs -0 sed -i \"\" -f $FILTERS_PATH" \
    --tag-name-filter cat -- --all

# Clean up the old references
git for-each-ref --format="delete %(refname)" refs/original/ | git update-ref --stdin
git reflog expire --expire=now --all
git gc --prune=now