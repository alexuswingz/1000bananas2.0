# Test Plan: Labels Availability Update on DOI Goal Change

## Test Scenario 1: Basic DOI Goal Change
**Steps:**
1. Navigate to Production → New Shipment
2. Click on any product in the product list to open the details modal
3. Note the "Labels Available" value shown in the modal
4. Without closing the modal, click on the DOI Settings dropdown (next to "Required DOI")
5. Change any of the values (Amazon DOI Goal, Inbound Lead Time, or Manufacture Lead Time)
6. Click "Apply" button
7. **Expected Result:** The "Labels Available" value in the modal should update to reflect any changes in inventory/availability

## Test Scenario 2: Adding Units After DOI Change
**Steps:**
1. Open a product details modal
2. Note the initial "Labels Available" value (e.g., 5,000 labels)
3. Change DOI settings and click "Apply"
4. Verify the "Labels Available" value updates
5. Try adding units using the "Add Units" button
6. **Expected Result:** The validation should use the updated labels available value (not the old value)

## Test Scenario 3: Multiple DOI Changes
**Steps:**
1. Open a product details modal
2. Change DOI settings → Apply
3. Immediately change DOI settings again with different values → Apply
4. **Expected Result:** Labels availability should update after each change

## Test Scenario 4: Navigating Between Products
**Steps:**
1. Open a product details modal
2. Change DOI settings and Apply
3. Use the navigation arrows (← →) to switch to a different product
4. **Expected Result:** The new product should show correct labels availability based on the updated DOI settings

## Test Scenario 5: Adding Products to Shipment
**Steps:**
1. Open a product modal and add some units to your shipment
2. Close the modal
3. Open a different product that uses the SAME label location
4. Change DOI settings and Apply
5. **Expected Result:** Labels available should account for:
   - Updated inventory state
   - Labels already allocated to the first product you added

## Console Verification
While testing, open browser DevTools Console (F12) and look for:
- `"Reloading products due to DOI settings change..."` - when you click Apply
- `"Loaded labels availability: X label locations"` - shows labels were fetched
- `"Labels availability for [location]: [number]"` - sample of actual values
- `"Updating selected row with latest product data..."` - when modal data refreshes

## Known Behaviors (Not Bugs)
1. **Labels availability is based on physical inventory**, not forecast requirements
   - Changing DOI goal affects forecast (units_to_make) but labels available is based on actual label inventory minus committed shipments

2. **Small delay when modal updates**
   - The modal may briefly re-render when DOI settings change - this is expected as it's refreshing with new data

3. **Labels shared across products**
   - If multiple products use the same label location, labels available will decrease as you add units to any of them
   - This is correct behavior - the system tracks total available labels per location

## Troubleshooting
If labels available doesn't update:
1. Check browser console for errors
2. Verify you clicked "Apply" or "Save as Default" (closing popover without applying won't trigger update)
3. Try closing and reopening the product modal
4. Refresh the page and try again

## Success Criteria
✅ Labels available updates when DOI settings change (modal open)
✅ Updated values are used for validation when adding units
✅ Multiple DOI changes are handled correctly
✅ Navigation between products shows correct values
✅ Console logs confirm data is being reloaded
