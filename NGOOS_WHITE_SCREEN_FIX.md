# NGOOS White Screen Fix

## Problem
When opening the NGOOS modal in production planning, the page would go to a white screen after a few seconds.

## Root Cause
**Infinite render loop** caused by recreating object references on every render.

In `src/pages/production/new-shipment/index.js` (line 3572-3576), the `doiSettings` prop was being calculated using an IIFE (Immediately Invoked Function Expression):

```javascript
doiSettings={(() => {
  const asin = selectedRow?.child_asin || selectedRow?.childAsin || selectedRow?.asin;
  return asin && productDoiSettings[asin] ? productDoiSettings[asin] : doiSettingsValues;
})()}
```

### Why This Caused the Issue:
1. This creates a **new object reference** on every render
2. The Ngoos component has a `useEffect` with `doiSettings` in its dependency array (line 307 in Ngoos.js)
3. Because the object reference changes on every render, the useEffect runs again
4. The useEffect calls multiple API endpoints and updates state with `setLoading`, `setProductDetails`, `setForecastData`, etc.
5. State updates trigger a re-render
6. The cycle repeats infinitely
7. Browser gets overwhelmed and displays white screen

## Solution
Wrapped all calculated props in `useMemo` hooks to prevent unnecessary recalculations:

### Fixed Props:
1. **`doiSettings`** (CRITICAL) - Object passed to useEffect dependencies
2. **`isAlreadyAdded`** - Boolean calculation
3. **`labelsAvailable`** - Number with expensive reduce calculation
4. **`currentQty`** - Number from array search

### Changes Made:
```javascript
// Before (creates new object every render):
doiSettings={(() => {
  const asin = selectedRow?.child_asin || selectedRow?.childAsin || selectedRow?.asin;
  return asin && productDoiSettings[asin] ? productDoiSettings[asin] : doiSettingsValues;
})()}

// After (memoized - only recalculates when dependencies change):
doiSettings={useMemo(() => {
  const asin = selectedRow?.child_asin || selectedRow?.childAsin || selectedRow?.asin;
  return asin && productDoiSettings[asin] ? productDoiSettings[asin] : doiSettingsValues;
}, [selectedRow?.child_asin, selectedRow?.childAsin, selectedRow?.asin, productDoiSettings, doiSettingsValues])}
```

## Impact
- ✅ Fixes white screen crashes
- ✅ Prevents infinite API calls
- ✅ Improves performance by avoiding unnecessary recalculations
- ✅ No breaking changes - same functionality, just stable references

## Testing
To verify the fix:
1. Go to Production Planning → New Shipment
2. Click "Add Products" to add products to the shipment
3. Click the NGOOS icon on any product row
4. The NGOOS modal should open without crashing
5. Navigate between products using the arrow buttons
6. Change DOI settings - should not cause crashes

## Related Files
- `src/pages/production/new-shipment/index.js` - Fixed (added useMemo hooks)
- `src/pages/products/catalog/detail/Ngoos.js` - Issue originates from useEffect here
- `src/pages/production/new-shipment/components/NgoosModal.js` - Already had protective measures

## Prevention
When passing objects/arrays as props that will be used in child component's useEffect dependencies:
- ✅ Use `useMemo` to create stable references
- ✅ Use `useCallback` for functions
- ✅ Extract primitive values when possible
- ❌ Never use IIFE that returns objects/arrays in JSX props
- ❌ Never create objects/arrays inline in JSX props

## Date Fixed
February 4, 2026
