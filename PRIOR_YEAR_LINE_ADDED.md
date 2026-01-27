# Prior Year Smoothed Line - Added

## Date
January 27, 2026

## Change
Added the missing **Prior Year Smoothed** line (gray dashed) to the Ngoos forecast chart.

## What Was Added

### 1. Prior Year Line Component
```javascript
<Line 
  yAxisId="left"
  type="monotone" 
  dataKey="priorYearSmoothed" 
  stroke="#9ca3af"           // Gray color
  strokeWidth={1.5}
  strokeDasharray="4 4"      // Dashed pattern
  dot={false}
  name="Prior Year Smoothed"
  connectNulls={false}
/>
```

### 2. Prior Year Data in Chart Data Structure
Added prior year data extraction from backend:
```javascript
// Get prior year data if available (for comparison)
const priorYearVal = item.prior_year_smoothed || 
                     item.priorYearSmoothed || 
                     item.prior_year || 
                     null;
```

Supports multiple backend property names:
- `prior_year_smoothed` (snake_case)
- `priorYearSmoothed` (camelCase)
- `prior_year` (simple)

### 3. Updated Max Value Calculation
Includes prior year values in chart scaling:
```javascript
chartMaxValue = Math.max(
  chartMaxValue,
  item.unitsSold || 0,
  item.forecastBase || 0,
  item.forecastAdjusted || 0,
  item.priorYearSmoothed || 0  // ✅ Added
);
```

### 4. Updated Legend
Added Prior Year Smoothed to the chart legend:
- **Icon**: Gray dashed line (matching chart)
- **Label**: "Prior Year Smoothed"
- **Style**: Rounded background with hover effect

## Purpose

The Prior Year Smoothed line allows you to:
- **Compare** current forecast with same period last year
- **Identify** seasonal patterns and trends
- **Validate** forecast assumptions against historical performance
- **Spot** year-over-year growth or decline

## Visual Appearance

| Line | Color | Style | When Shown |
|------|-------|-------|------------|
| Units Sold | Gray | Solid area fill | Historical data |
| Units Sold Smoothed | Orange | Solid line | Full timeline |
| **Prior Year Smoothed** | **Gray** | **Dashed line** | **Forecast period** |
| Forecast | Orange | Dashed line | Forecast period |

## Expected Behavior

### When Backend Provides Prior Year Data:
✅ Gray dashed line appears on the forecast side (right of "Today" marker)
✅ Line shows smoothed sales from same time period last year
✅ Helps compare forecast with actual performance from prior year

### When Backend Doesn't Provide Prior Year Data:
⚠️ Line doesn't appear (gracefully hidden)
ℹ️ Chart functions normally with other lines
ℹ️ No errors or warnings

## Backend Requirements

For the prior year line to appear, backend should provide in forecast data:

**Option 1** (Preferred):
```json
{
  "week_end": "2026-02-15",
  "forecast": 150,
  "prior_year_smoothed": 145
}
```

**Option 2** (Alternative):
```json
{
  "week_end": "2026-02-15",
  "forecast": 150,
  "priorYearSmoothed": 145
}
```

**Option 3** (Fallback):
```json
{
  "week_end": "2026-02-15",
  "forecast": 150,
  "prior_year": 145
}
```

## Testing

### To Verify Prior Year Line Works:

1. **Open Ngoos chart** for a product
2. **Look at the forecast side** (right of "Today" marker)
3. **Check for gray dashed line** alongside orange dashed forecast line
4. **Hover over line** - tooltip should show "Prior Year Smoothed: [value]"
5. **Check legend** - "Prior Year Smoothed" item with gray dashed icon

### If Prior Year Line Doesn't Appear:

**Possible Reasons:**
1. Backend doesn't provide prior year data (most common)
2. Prior year values are all null or 0
3. Data property name mismatch (check console)

**Debug Steps:**
1. Open browser console (F12)
2. Inspect forecast data structure
3. Look for prior year properties
4. Check if values are valid numbers

## Files Modified

- `src/pages/products/catalog/detail/Ngoos.js`
  - Added Prior Year Line component
  - Added prior year data extraction
  - Updated max value calculation
  - Updated legend with Prior Year item

## Color Scheme Reference

```css
Units Sold Area:     #6b7280 (gray-500)
Units Sold Smoothed: #f97316 (orange-500)
Prior Year Smoothed: #9ca3af (gray-400) ✨ NEW
Forecast:            #f97316 (orange-500)
```

## Comparison with Original TheAlgorithmFE

The implementation matches the original:
- ✅ Gray color (#9ca3af)
- ✅ Dashed style (4 4 pattern)
- ✅ Shows on forecast side only
- ✅ Helps with year-over-year comparison
- ✅ Included in legend

---

**Status**: ✅ Complete
**Linter Errors**: None
**Breaking Changes**: None
**Graceful Degradation**: ✅ (Works with or without prior year data)
