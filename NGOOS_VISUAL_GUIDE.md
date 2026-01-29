# NGOOS DOI Zones - Visual Guide

## What You'll See

### 1. Enhanced Tooltip on Hover

When you hover over any point on the graph, you'll see:

```
┌─────────────────────────────────────┐
│ Thu, Jan 15, 2026                   │
│ ─────────────────────────────────── │
│ 🟣 FBA AVAILABLE                    │
│    45 days from today               │
│ ─────────────────────────────────── │
│ Units Sold: 1,234                   │
│ Forecast: 1,150                     │
└─────────────────────────────────────┘
```

**Zone indicators you might see:**
- 📊 **Historical** - Past sales data
- 🟣 **FBA Available** - Current FBA inventory period
- 🟢 **Total Inventory** - Including AWD + Inbound
- 🔵 **Forecast Period** - After units to make arrive
- ⚪ **Beyond Forecast** - Past forecast horizon

---

### 2. Colored Zone Segments on Graph

The graph background shows 3 colored zones:

```
Historical | 🟣 FBA Available | 🟢 Total Inventory | 🔵 Forecast Period |
────────────────────────────────────────────────────────────────────────
           Today                                                        
           ↑                                                            
```

**Visual appearance:**
- 🟣 **Violet zone** - Semi-transparent purple overlay
- 🟢 **Green zone** - Semi-transparent green overlay
- 🔵 **Blue zone** - Semi-transparent blue overlay

---

### 3. Zone Boundary Markers

At each transition point, you'll see:

```
    🟣              🟢              🔵
    │               │               │
    │               │               │
────┼───────────────┼───────────────┼────
 Today        FBA End        Total End
```

**Marker appearance:**
- Subtle dashed vertical lines
- Color-matched to the zone they mark
- Small emoji indicators at bottom (🟣 🟢 🔵)
- White "Today" marker is most prominent

---

### 4. Enhanced Legend at Bottom

Below the chart:

```
Chart Data:
[Gray Box] Units Sold  
[Orange Line] Units Sold Smoothed  
[Gray Dash] Prior Year Smoothed  
[Orange Dash] Forecast

DOI Zones:
🟣 [Purple Box] FBA Available (45d)  
🟢 [Green Box] Total Inv. (120d)  
🔵 [Blue Box] Forecast Period (60d)
```

**Features:**
- Live day counts from actual DOI data
- Tooltips on hover explaining each zone
- Zone icons matching boundary markers

---

## Browser Console Output

Open Developer Tools (F12) → Console tab to see:

```
📊 DOI Values: {
  fba_days: 45,
  total_days: 120,
  forecast_days: 180,
  additional_forecast_days: 60,
  daily_velocity: 25,
  units_to_make: 1500
}

📍 FBA Available boundary (45 days): Target=2026-03-15, Found=2026-03-15
📍 Total Inventory boundary (120 days): Target=2026-05-29, Found=2026-05-29
📍 Forecast End boundary (180 days): Target=2026-07-28, Found=2026-07-28

📍 DOI Zone Boundaries Summary:
  🟣 FBA Available: Today → 2026-03-15
  🟢 Total Inventory: 2026-03-15 → 2026-05-29
  🔵 Forecast Period: 2026-05-29 → 2026-07-28
```

---

## How to Use

### Verify Zone Accuracy

1. **Open the NGOOS modal** for any product
2. **Press F12** to open Developer Tools
3. **Look for 📊 and 📍 messages** in Console
4. **Compare dates**:
   - Target dates = What we calculated
   - Found dates = Actual data points used
   - They should match closely (within 1-2 days max)

### Check Zone Transitions

1. **Hover over the graph** moving from left to right
2. **Watch the tooltip** zone name change:
   - Historical → FBA Available → Total Inventory → Forecast Period
3. **Look for boundary markers**:
   - 🟣 at FBA→Total transition
   - 🟢 at Total→Forecast transition
   - 🔵 at Forecast end

### Verify DOI Settings Impact

1. **Open DOI Settings** for a product
2. **Change Amazon DOI Goal** (e.g., from 93 to 120 days)
3. **Observe the changes**:
   - Green zone should expand
   - Blue zone should shift right
   - Legend should show updated day counts
4. **Check console** to see new calculations

---

## Troubleshooting

### Problem: Zones not showing

**Check Console for:**
```
❌ No today data point found
```

**Solution:** Chart data may not include today's date. This is normal for some products.

---

### Problem: Only blue zone showing

**Check Console for:**
```
📊 DOI Values: { fba_days: 0, total_days: 0, ... }
```

**Solution:** Product may have no current inventory. This is normal for out-of-stock items.

---

### Problem: Zones in wrong position

**Check Console for date mismatches:**
```
📍 FBA Available boundary (45 days): Target=2026-03-15, Found=2026-06-20
```

**Solution:** Large date mismatch indicates data issue. Report to backend team with ASIN.

---

## Expected Behavior Examples

### Healthy Product (All Zones)
```
Historical | 🟣 FBA (45d) | 🟢 Total (120d) | 🔵 Forecast (60d) |
```

### Low Inventory Product
```
Historical | 🟣 FBA (12d) | 🟢 Total (25d) | 🔵 Forecast (150d) |
```
(Short FBA/Total, long Forecast)

### Out of Stock Product
```
Historical | 🔵 Forecast (180d) |
```
(Only forecast zone, no current inventory)

### New Product (< 6 months)
```
Historical (short) | 🟣 FBA (60d) | 🟢 Total (120d) | 🔵 Forecast (120d) |
```
(Limited historical data, extended forecast)

---

## Key Improvements

### Before Enhancement:
- ❌ Zones compressed (60% of actual size)
- ❌ No way to know which zone you're in
- ❌ No boundary markers
- ❌ Hard to verify accuracy

### After Enhancement:
- ✅ Zones at exact dates (100% accurate)
- ✅ Tooltip shows zone name + relative date
- ✅ Boundary markers at transitions
- ✅ Console logging for verification
- ✅ Legend shows day counts
- ✅ Easy to identify turning points

---

## Questions?

If zones don't look correct:

1. Check the console output
2. Take a screenshot of the graph + console
3. Note the product ASIN
4. Share with the development team

The debug logging will help identify any issues quickly!

---

**Last Updated**: January 29, 2026
