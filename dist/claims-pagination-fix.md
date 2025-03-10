# Claims Table Pagination Fix

## Issue

The Claims table had the same pagination issues as the Agreements table when searching by dealership:

1. **Pagination not working properly**: When filtering by a specific dealership that had many claims, the table was only showing the records on the current page without allowing navigation to other pages.

2. **Search and filter interaction**: The local search was affecting the total count calculation, which broke pagination.

3. **Inconsistent page resets**: When filters changed, pagination wasn't always properly reset.

## Fixes Applied

1. **Fixed pagination count handling**:
   - Changed how `effectiveTotalCount` is calculated to always use the total count from the database query
   - Added detailed logging of pagination parameters and filter values
   - Ensured large result sets can be properly paginated through

2. **Improved search behavior**:
   - Added better logging of search term changes
   - Improved handling when clearing a search term
   - Maintained pagination functionality even with local filtering

3. **Enhanced filter change handling**:
   - Added detailed logging when filter values change
   - Ensured page is always reset to 1 when filters change
   - Added documentation about query invalidation behavior

## Expected Results

After these changes:

1. When filtering by a dealership with many claims, all pages should be properly accessible through pagination.

2. The total count displayed should be accurate, matching the actual number of claims for the selected dealer.

3. Search functionality should work correctly on the current page of results without breaking pagination.

4. When filters are changed, the table should consistently reset to page 1 and show the correct total.

## Testing

To verify the fix:

1. Navigate to the Claims page
2. Search for a dealership with many claims in the dealership search
3. Verify the total count shows the correct number of claims
4. Confirm you can navigate to page 2, 3, etc.
5. Try using the search box and verify it filters the current page correctly
6. Clear the search and verify all claims are shown again