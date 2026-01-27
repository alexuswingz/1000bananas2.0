# Ngoos Colored Segments - Debug Guide

## Issue Fixed
The colored DOI segments weren't appearing in the chart.

## Solution Implemented

### Hybrid Rendering Approach
The chart now uses a **two-tier fallback system**:

1. **Primary Method**: Backend-provided periods
   - Uses `forecastData.chart_rendering.periods` if available
   - Most reliable as backend pre-calculates exact dates
   
2. **Fallback Method**: Dynamic calculation
   - Calculates segments based on DOI days
   - Uses multiple property name variations for compatibility
   - Includes console logging for debugging

### Changes Made

#### 1. Enhanced Segment Calculation
```javascript
// Checks multiple property names for DOI values
const fbaD = forecastData?.doi_fba || forecastData?.fba_days || 0;
const totalD = forecastData?.doi_total || forecastData?.total_days || 0;
```

#### 2. Added Console Logging
Open browser console (F12) to see debug information:
- `"Using backend-provided periods: X"` - If using backend data
- `"DOI Values: {...}"` - Shows FBA, Total, Forecast days
- `"Finding point for X days: Found/Not found"` - Point search results
- `"Segment Points: {...}"` - Timestamps of segment boundaries

#### 3. Increased Opacity
Changed from `0.15` to `0.2` for better visibility of colored segments.

#### 4. Added yAxisId
All ReferenceArea and ReferenceLine components now have `yAxisId="left"` for proper alignment.

#### 5. Fallback Rendering
If individual segments can't be calculated, renders a single blue forecast area.

## How to Debug

### Step 1: Open Browser Console
1. Open the Ngoos page
2. Press F12 to open Developer Tools
3. Go to "Console" tab
4. Look for debug messages

### Step 2: Check Data Structure

Look for these console messages:
```
Using backend-provided periods: 3
```
✅ **Good**: Backend is providing period data

```
DOI Values: { fbaD: 45, totalD: 120, forecastD: 180, ... }
```
✅ **Good**: DOI values are available

```
DOI Values: { fbaD: 0, totalD: 0, forecastD: 0, ... }
```
❌ **Problem**: No DOI data - check API response

### Step 3: Verify Segments Appear

Expected colored areas:
- 🟣 **Violet** (left): FBA Available period
- 🟢 **Green** (middle): Total Inventory period
- 🔵 **Blue** (right): Forecast period

### Common Issues & Solutions

#### Issue: No colored segments at all
**Possible causes:**
1. No DOI data from backend
2. Chart data doesn't extend into future
3. All DOI values are 0

**Solution:**
```javascript
// Check in console:
console.log('Forecast Data:', forecastData);
console.log('Chart Display Data:', chartDisplayData);
```

#### Issue: Only blue segment shows
**Possible cause:** FBA and Total DOI are the same or very close

**This is normal if:** Product has minimal inventory differentiation

#### Issue: Segments appear but in wrong positions
**Possible cause:** Timestamp mismatch

**Solution:** Backend timestamps must match chart data timestamps format

### Step 4: Test Different Products

Try the chart with:
1. ✅ Product with healthy inventory (should show all 3 segments)
2. ✅ Product with low inventory (may show only 1-2 segments)
3. ✅ Product with no inventory (may show only forecast)

## Expected Behavior

### With Backend Periods (Preferred)
- Uses exact dates from `forecastData.chart_rendering.periods`
- Segments align perfectly with chart timeline
- Most accurate representation

### With Dynamic Calculation (Fallback)
- Calculates segment boundaries based on DOI days
- Searches for closest data points
- May have slight alignment variations

### Fallback Mode
- If neither method works, shows single blue forecast area
- Ensures chart always has some visual indicator

## Color Scheme

| Segment | Color | Represents |
|---------|-------|------------|
| FBA Available | 🟣 Violet (#a855f7) | Days of inventory in FBA |
| Total Inventory | 🟢 Green (#10b981) | Days including FBA + AWD + Inbound |
| Forecast | 🔵 Blue (#3b82f6) | Days after units to make arrive |

All segments have 20% opacity (`fillOpacity={0.2}`) for subtle background effect.

## Files Modified
- `src/pages/products/catalog/detail/Ngoos.js`
  - Enhanced segment calculation
  - Added backend fallback
  - Increased opacity
  - Added debug logging
  - Added yAxisId to components

## Next Steps

If segments still don't appear:

1. **Check Browser Console** - Look for error messages
2. **Inspect Network Tab** - Verify API response includes DOI data
3. **Check forecastData structure** - Ensure it has required properties
4. **Try different products** - Some may have better data than others

---

**Last Updated**: January 27, 2026
**Status**: Enhanced with hybrid rendering
