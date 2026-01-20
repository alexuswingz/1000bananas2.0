# Brand-Based Sorting and Filtering Approach

## Current State Analysis

Based on the codebase review, I can see that:
- The system already has brand filtering infrastructure (`row.brand` field)
- Brand information is displayed in the UI (`{row.brand} • {row.size}`)
- However, brand data may be inconsistent or embedded in product titles

## Recommended Approach

### Phase 1: Initial Solution (Text-Based Filtering)

**Option A: Text Contains Filter on Product Title (Quick Implementation)**

**Pros:**
- ✅ Fast to implement (leverages existing text filter infrastructure)
- ✅ Works immediately without data migration
- ✅ Flexible - users can search for partial brand names
- ✅ No database changes required

**Cons:**
- ⚠️ May return false positives (e.g., "Plant" matches "Plant Foods" and "Plant-Based")
- ⚠️ Case-sensitive matching requires normalization
- ⚠️ Less performant than indexed field searches
- ⚠️ Can't easily extract unique brand list for dropdowns

**Implementation:**
```javascript
// In NewShipmentTable.js filtering logic
case 'brand':
  // If brand field exists, use it; otherwise extract from product name
  const brandValue = row.brand || extractBrandFromProduct(row.product);
  const filterValue = activeFilters.filterValue.toLowerCase();
  return brandValue.toLowerCase().includes(filterValue);
```

**Does it make sense for first iteration?**
**YES**, but with caveats:
- ✅ Good for MVP/proof of concept
- ✅ Allows immediate brand filtering functionality
- ✅ Users can work around false positives
- ⚠️ Should be clearly labeled as "Contains [brand]" in UI
- ⚠️ Consider adding a warning tooltip about potential false matches

### Phase 2: Enhanced Solution (Hybrid Approach)

**Option B: Smart Brand Extraction + Fallback**

1. **Primary**: Use `row.brand` field if available
2. **Fallback**: Extract brand from product name using patterns
3. **Cache**: Store extracted brands to avoid repeated parsing

**Implementation Strategy:**
```javascript
// Brand extraction utility
const extractBrandFromProduct = (productName) => {
  // Common patterns:
  // 1. "Brand Name Product Description" (brand at start)
  // 2. "Product - Brand Name" (brand after dash)
  // 3. "Product (Brand Name)" (brand in parentheses)
  
  const patterns = [
    /^([A-Z][a-zA-Z\s]+?)\s+(?:Fertilizer|Nutrients|Plant|Foods)/i, // Start of string
    /-\s*([A-Z][a-zA-Z\s]+?)$/i, // After dash
    /\(([A-Z][a-zA-Z\s]+?)\)/i, // In parentheses
  ];
  
  for (const pattern of patterns) {
    const match = productName.match(pattern);
    if (match) return match[1].trim();
  }
  
  // Fallback: first 2-3 words if they look like a brand
  const words = productName.split(' ');
  if (words.length >= 2 && words[0].length > 2) {
    return words.slice(0, 2).join(' ');
  }
  
  return productName; // Last resort: return full name
};

// Use in filtering
const getBrandValue = (row) => {
  return row.brand || extractBrandFromProduct(row.product || '');
};
```

**Benefits:**
- ✅ More accurate than pure text search
- ✅ Handles missing brand data gracefully
- ✅ Can populate brand field automatically
- ✅ Better user experience

### Phase 3: Long-Term Solution (Data Normalization)

**Option C: Brand Field Normalization**

1. **Data Migration**: Extract and normalize all brand names
2. **Brand Dictionary**: Maintain a canonical list of brands
3. **Auto-Population**: Backfill missing brand fields
4. **Validation**: Prevent new products without brand data

**Database Schema Enhancement:**
```sql
-- Add brand normalization table
CREATE TABLE brand_normalization (
  id SERIAL PRIMARY KEY,
  canonical_name VARCHAR(255) UNIQUE NOT NULL,
  aliases TEXT[], -- Array of alternative names
  created_at TIMESTAMP DEFAULT NOW()
);

-- Update products table
ALTER TABLE products 
ADD COLUMN brand_id INTEGER REFERENCES brand_normalization(id),
ADD COLUMN brand_name VARCHAR(255); -- Denormalized for performance
```

**Benefits:**
- ✅ Most accurate and performant
- ✅ Enables proper brand-based analytics
- ✅ Supports brand hierarchies (parent companies)
- ✅ Prevents data inconsistencies

## Recommended Implementation Plan

### Immediate (Week 1-2)
1. **Implement Option A** (Text Contains Filter)
   - Add "Brand" filter option to filter dropdown
   - Use product title as search field
   - Add UI indicator: "Searching in product names"
   - Document limitations in tooltip

### Short-term (Month 1)
2. **Implement Option B** (Smart Extraction)
   - Create brand extraction utility
   - Add brand extraction on data load
   - Cache extracted brands in component state
   - Update filter to use extracted brands

### Long-term (Quarter 1)
3. **Implement Option C** (Data Normalization)
   - Create brand normalization table
   - Run data migration script
   - Update product creation/editing to require brand
   - Add brand management UI

## UI/UX Considerations

### Filter UI Design
```
┌─────────────────────────────────┐
│ Filter by Brand                 │
├─────────────────────────────────┤
│ [Text Input: "TPS"]             │
│                                  │
│ ☑ Contains "TPS"                │
│ ☐ Equals "TPS"                   │
│ ☐ Starts with "TPS"              │
│                                  │
│ [Apply] [Reset]                  │
└─────────────────────────────────┘
```

### Sorting UI
- Add "Brand" to sort dropdown
- Group by brand (future enhancement)
- Show brand badges/chips in product list

## Code Example: Quick Implementation

```javascript
// In NewShipmentTable.js - add to filter logic

// Add brand to filterable fields
const getColumnValues = (columnKey) => {
  // ... existing code ...
  if (columnKey === 'brand') {
    // Extract unique brands from product names
    const brands = new Set();
    rows.forEach(row => {
      const brand = row.brand || extractBrandFromProduct(row.product || '');
      if (brand) brands.add(brand);
    });
    return Array.from(brands).sort();
  }
  // ... rest of code ...
};

// Update filter application
case 'brand': {
  const brandValue = row.brand || extractBrandFromProduct(row.product || '');
  const filterValue = activeFilters.filterValue.toLowerCase();
  
  switch (activeFilters.filterCondition) {
    case 'contains':
      return brandValue.toLowerCase().includes(filterValue);
    case 'equals':
      return brandValue.toLowerCase() === filterValue;
    case 'startsWith':
      return brandValue.toLowerCase().startsWith(filterValue);
    default:
      return true;
  }
}
```

## Performance Considerations

1. **Caching**: Cache extracted brands to avoid repeated parsing
2. **Indexing**: If using database, add index on brand field
3. **Debouncing**: Debounce text input for real-time filtering
4. **Virtualization**: Use virtual scrolling for large product lists

## Testing Strategy

1. **Unit Tests**: Test brand extraction with various product name formats
2. **Integration Tests**: Test filtering with mixed data (with/without brand field)
3. **User Testing**: Validate that false positives are acceptable
4. **Performance Tests**: Measure filter performance with 1000+ products

## Conclusion

**For First Iteration**: Use text-based "contains" filter on product titles
- Quick to implement
- Provides immediate value
- Acceptable accuracy for MVP

**For Future**: Move to hybrid extraction, then full normalization
- Better accuracy
- Better performance
- Better user experience
