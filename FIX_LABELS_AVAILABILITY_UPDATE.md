# Fix: Labels Availability Not Updating When DOI Goal Changes

## Problem
When adding products to a new shipment in non-table mode, if you view a product's details and then change the DOI goal in DOI settings, the "labels available" value displayed in the product modal (container) would not update to reflect the new availability.

## Root Cause
When DOI settings changed:
1. Products were correctly reloaded with new forecast data
2. Labels availability map was correctly refetched
3. BUT the `selectedRow` (product shown in modal) was not updated with the new data
4. The modal component didn't recognize that labels availability had changed

## Solution

### Changes Made to `src/pages/production/new-shipment/index.js`:

1. **Added useEffect to Update Selected Row When Products Change** (Lines ~953-970)
   - Watches for changes in the `products` array when the modal is open
   - Automatically finds and updates the `selectedRow` with the latest product data
   - Ensures the modal always shows current forecast and labels availability data

2. **Added Key Prop to NgoosModal** (Line ~3219)
   - Key includes: product ID, label location, and current labels available
   - Forces React to re-mount the modal when labels availability changes
   - Ensures all component state is fresh when critical data changes

3. **Enhanced Debug Logging** (Lines ~503-507)
   - Added sample logging of labels availability when products load
   - Helps verify that labels availability is being updated correctly

## How It Works Now

1. User opens a product detail modal (NgoosModal)
2. User changes DOI goal in DOI Settings popover
3. DOI settings change triggers product reload via `doiSettingsChangeCount`
4. Products are reloaded with new DOI settings (new forecast data)
5. Labels availability is refetched (accounts for current inventory state)
6. New `labelsAvailabilityMap` is stored in state
7. useEffect detects products array changed
8. If modal is open, `selectedRow` is updated with matching product from new products array
9. Key prop on NgoosModal changes (includes new labels_available value)
10. Modal re-renders/re-mounts with updated data
11. Labels available display now shows correct value based on new DOI settings

## Files Modified

- `src/pages/production/new-shipment/index.js`
  - Added useEffect to refresh selectedRow when products change
  - Added key prop to NgoosModal component
  - Enhanced debug logging for labels availability

## Testing

To verify the fix:
1. Open a new shipment
2. Click on a product to view its details in the modal
3. Note the "Labels Available" value
4. Change the DOI Goal in DOI Settings (click the dropdown next to "Required DOI")
5. Click "Apply" or "Save as Default"
6. Verify that the "Labels Available" value updates to reflect the new inventory state
7. Try adding units and verify the validation uses the updated labels available value

## Notes

- The labels availability calculation accounts for:
  - Total label inventory from warehouse
  - Labels committed to other active shipments (not shipped/received/archived)
  - Labels already allocated to other products in the current shipment
  - The calculation is dynamic and updates whenever any of these factors change

- DOI goal changes affect forecast data (units_to_make) but labels availability is based on physical inventory, not forecast requirements

- The fix ensures that when viewing product details, all displayed data (forecast, inventory, labels) is always current and synchronized with the selected DOI settings
