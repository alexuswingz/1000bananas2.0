# Debug: Prior Year Smoothed Line Not Showing

## Quick Diagnosis

### Step 1: Check Browser Console
1. Open the Ngoos chart page
2. Press **F12** to open Developer Tools
3. Go to **Console** tab
4. Look for these messages:

```
First forecast item structure: { ... }
Prior year value found: [value or null]
Available properties: [array of property names]
```

### What to Look For:

#### ✅ **If you see prior year data:**
```
Prior year value found: 145
Available properties: [..., 'prior_year_smoothed', ...]
```
**Solution**: The line should appear. If not, check the chart scale or data values.

#### ❌ **If you see null:**
```
Prior year value found: null
Available properties: ['week_end', 'forecast', 'units_sold', ...]
```
**Problem**: Backend is not providing prior year data.

---

## Solution: Backend Doesn't Have Prior Year Data Yet

If your backend doesn't provide prior year data, you have two options:

### Option 1: Add Prior Year to Backend API (Recommended)

Update your backend to include prior year data in the forecast response:

**Backend Change Needed:**
```python
# In your forecast API endpoint
for week in forecast_weeks:
    # Calculate prior year data (same week, previous year)
    prior_year_date = week.date - timedelta(days=365)
    prior_year_sales = get_sales_for_date(prior_year_date)
    
    week_data = {
        "week_end": week.date,
        "forecast": week.forecast_value,
        "prior_year_smoothed": prior_year_sales  # ADD THIS
    }
```

### Option 2: Calculate Prior Year on Frontend (Temporary)

If you can't modify the backend immediately, calculate it from historical data:

**Frontend Change:**

Add this helper function in `Ngoos.js`:

```javascript
// Helper to calculate prior year value from historical data
const getPriorYearValue = (targetDate, historicalData) => {
  // Go back ~52 weeks (1 year)
  const priorYearDate = new Date(targetDate);
  priorYearDate.setFullYear(priorYearDate.getFullYear() - 1);
  const priorYearTs = priorYearDate.getTime();
  
  // Find closest historical data point
  let closest = null;
  let minDiff = Infinity;
  
  historicalData.forEach(item => {
    const itemTs = new Date(item.week_end).getTime();
    const diff = Math.abs(itemTs - priorYearTs);
    
    if (diff < minDiff && diff < 7 * 86400000) { // Within 1 week
      minDiff = diff;
      closest = item;
    }
  });
  
  return closest ? getSmoothValue(closest) : null;
};
```

Then update the forecast loop:

```javascript
forecast.forEach((item, index) => {
  // ... existing code ...
  
  // Calculate prior year from historical data
  const priorYearVal = item.prior_year_smoothed || 
                       item.priorYearSmoothed || 
                       getPriorYearValue(item.week_end, historical); // FALLBACK
  
  // ... rest of code ...
});
```

---

## Common Issues & Solutions

### Issue 1: Line Shows But Is Flat/Zero
**Cause**: Prior year values are all 0 or very small
**Solution**: Check if prior year data actually has values in your database

### Issue 2: Line Shows Only Partially
**Cause**: Some forecast weeks have prior year data, others don't
**Solution**: Ensure backend provides consistent prior year data for all forecast weeks

### Issue 3: Console Shows Error
**Example**: `Cannot read property 'prior_year_smoothed' of undefined`
**Solution**: Check that forecast data array exists and has items

### Issue 4: Wrong Date Range
**Cause**: Prior year data showing for wrong time period
**Solution**: Verify backend is calculating prior year as exactly 365 days ago

---

## Data Structure Expected

### Backend Response Format:

```json
{
  "forecast": [
    {
      "week_end": "2026-02-15",
      "forecast": 150,
      "units_sold": 145,
      "units_smooth": 148,
      "prior_year_smoothed": 142  ← THIS IS NEEDED
    },
    {
      "week_end": "2026-02-22", 
      "forecast": 155,
      "units_sold": 150,
      "units_smooth": 152,
      "prior_year_smoothed": 145  ← AND THIS
    }
  ]
}
```

### Supported Property Names:
The code checks for these (in order):
1. `prior_year_smoothed` ⭐ Preferred
2. `priorYearSmoothed`
3. `prior_year`
4. `prior_year_smooth`
5. `priorYear`

---

## Testing Checklist

After adding prior year data:

- [ ] Console shows: `Prior year value found: [number]`
- [ ] Gray dashed line appears on forecast side
- [ ] Line has data points (not flat)
- [ ] Tooltip shows "Prior Year Smoothed: [value]"
- [ ] Legend shows "Prior Year Smoothed" item
- [ ] Line scale matches other lines (not too high/low)

---

## Quick Test Without Backend

Want to see if the line works before backend changes? Add this temporary code:

```javascript
// TEMPORARY: Generate fake prior year data for testing
forecast.forEach((item, index) => {
  if (!item.prior_year_smoothed) {
    // Generate fake data: 80-120% of forecast value
    const variance = 0.8 + Math.random() * 0.4;
    item.prior_year_smoothed = Math.round(getForecastValue(item) * variance);
  }
});
```

Add this right after:
```javascript
let forecast = chartData.forecast || [];
```

If the line shows with fake data, you know the frontend is working correctly.

---

## Backend Implementation Guide

### SQL Query Example:

```sql
-- Get prior year sales for comparison
SELECT 
  f.week_end,
  f.forecast_value,
  py.units_sold as prior_year_smoothed
FROM forecast_weeks f
LEFT JOIN sales_history py 
  ON py.week_end = f.week_end - INTERVAL '1 year'
WHERE f.asin = ?
ORDER BY f.week_end
```

### Python Example:

```python
def add_prior_year_data(forecast_data):
    for week in forecast_data:
        # Calculate date 1 year ago
        prior_year_date = week['week_end'] - timedelta(days=365)
        
        # Get sales from that week
        prior_sales = get_smoothed_sales(
            asin=week['asin'],
            week_end=prior_year_date
        )
        
        week['prior_year_smoothed'] = prior_sales
    
    return forecast_data
```

---

## Current Status

**Debug Logging**: ✅ Enabled
**Frontend Code**: ✅ Ready
**Backend Data**: ❓ To be verified

**Next Step**: 
1. Check console logs when page loads
2. If no prior year data found, implement backend solution
3. If data found but line doesn't show, check data values/scale

---

**Last Updated**: January 27, 2026
