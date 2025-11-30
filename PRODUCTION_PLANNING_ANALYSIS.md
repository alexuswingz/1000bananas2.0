# Production Planning Analysis - Database Structure & Relationships

## Executive Summary

This document analyzes the essential database relationships for production planning in the 1000 Bananas system, focusing on how **Catalog**, **Labels**, **Boxes**, **Closures**, **Bottles**, and **Formulas** interconnect to enable shipment planning and manufacturing execution.

---

## 1. Core Database Structure

### 1.1 Key Tables Overview

```
┌─────────────┐
│   CATALOG   │  ◄─── Main product table (what we sell)
└──────┬──────┘
       │
       ├─── packaging_name ────► BOTTLE (containers)
       │
       ├─── formula_name ─────► FORMULA (liquid recipes)
       │
       ├─── closure_name ─────► CLOSURE (caps/lids)
       │
       ├─── label_size ───────► LABEL (product labels)
       │
       ├─── case_size ────────► BOX (shipping boxes)
       │
       └─── brand_name ───────► BRAND (company info)
```

### 1.2 Critical Relationships

**Foreign Key Constraints** (from Migration 005):
- `catalog.packaging_name` → `bottle.bottle_name` (ON DELETE SET NULL)
- `catalog.formula_name` → `formula.formula` (ON DELETE SET NULL)
- `catalog.closure_name` → `closure.closure_name` (ON DELETE SET NULL)
- `catalog.brand_name` → `brand.brand_name` (ON DELETE SET NULL)

---

## 2. Production Planning Data Structure

### 2.1 Catalog Table (Product Variations)

The **catalog** table stores individual product variations (SKUs) that customers order:

```sql
catalog {
    id: SERIAL PRIMARY KEY,
    
    -- Product Identity
    product_name: "Cherry Tree Fertilizer",
    size: "8oz" | "Quart" | "Gallon",
    child_asin: "B0C73TDLPX",
    child_sku_final: "AFVIOLET1G-FBA-UPC-0523",
    
    -- Supply Chain Components
    packaging_name: "8oz Tall Cylinder Bottle",    ← Links to BOTTLE
    formula_name: "F.10-10-10",                     ← Links to FORMULA
    closure_name: "Berry Unvented Cap",             ← Links to CLOSURE
    label_size: "2.5x4",                            ← Label dimensions
    label_location: "LBL-PLANT-567",                ← Label SKU
    
    -- Packaging Info
    case_size: "12x10x12",
    units_per_case: 60,  // 60 units per box for 8oz
    
    -- Sales Data
    units_sold_30_days: INTEGER,
    price: DECIMAL
}
```

### 2.2 Bottle Table (Container Specs)

```sql
bottle {
    id: SERIAL PRIMARY KEY,
    bottle_name: "8oz Tall Cylinder Bottle",  ← UNIQUE identifier
    
    -- Physical Specs
    size_oz: 8,
    shape: "Tall Cylinder",
    color: "White",
    thread_type: "Non-Ratchet",
    cap_size: "38-400",
    material: "HDPE",
    
    -- Supplier Info
    supplier: "Rhino Container",
    lead_time_weeks: 6,
    moq: INTEGER,
    units_per_pallet: 7280,
    units_per_case: 364,
    cases_per_pallet: 20,
    
    -- Manufacturing (Added in Migration 003)
    bottles_per_minute: INTEGER,        ← Production speed (BPM)
    max_warehouse_inventory: INTEGER,   ← Storage capacity
    
    -- Inventory
    warehouse_inventory: INTEGER,
    supplier_inventory: INTEGER
}
```

### 2.3 Formula Table (Liquid Recipes)

```sql
formula {
    id: SERIAL PRIMARY KEY,
    formula: "F.10-10-10",  ← UNIQUE identifier
    
    -- Product Info
    guaranteed_analysis: TEXT,
    npk: "10-10-10",
    derived_from: "ascophyllum nodosum, monopotassium phosphate...",
    storage_warranty_precautionary_metals: TEXT,
    
    -- Inventory (from formula_inventory table)
    gallons_available: DECIMAL,
    gallons_allocated: DECIMAL,
    last_manufactured: TIMESTAMP
}
```

### 2.4 Closure Table (Caps & Lids)

```sql
closure {
    id: SERIAL PRIMARY KEY,
    closure_name: "Berry Unvented Cap",  ← Links to catalog
    
    category: "Cap",
    closure_supplier: "Berry Plastics",
    closure_part_number: "38-400-WH-UV",
    closure_description: TEXT,
    
    -- Supply Chain
    lead_time_weeks: DECIMAL,
    moq: INTEGER,
    units_per_pallet: INTEGER,
    units_per_case: INTEGER,
    cases_per_pallet: INTEGER
}
```

### 2.5 Label Inventory

Labels are tracked separately:

```sql
label_inventory {
    id: SERIAL PRIMARY KEY,
    label_location: "LBL-PLANT-567",  ← From catalog.label_location
    label_size: "2.5x4",
    product_name: "Cherry Tree Fertilizer 8oz",
    warehouse_quantity: INTEGER,
    supplier_quantity: INTEGER,
    min_quantity: INTEGER,
    max_quantity: INTEGER
}
```

### 2.6 Box Inventory

```sql
box_inventory {
    id: SERIAL PRIMARY KEY,
    box_type: "12x10x12",  ← From catalog.case_size
    warehouse_quantity: INTEGER,
    supplier_quantity: INTEGER,
    min_quantity: INTEGER,
    max_quantity: INTEGER
}
```

---

## 3. Production Planning View (v_production_planning)

The system uses a comprehensive VIEW that joins all related tables:

```sql
CREATE VIEW v_production_planning AS
SELECT 
    -- Product Info
    c.id as catalog_id,
    c.product_name,
    c.size,
    c.child_asin,
    c.child_sku_final,
    c.units_per_case,
    
    -- Formula Info (for liquid inventory)
    c.formula_name,
    f.guaranteed_analysis,
    f.npk,
    fi.gallons_available,
    fi.gallons_allocated,
    fi.last_manufactured,
    
    -- Bottle Info (for container inventory + BPM)
    c.packaging_name as bottle_name,
    b.bottles_per_minute as bpm,
    b.max_warehouse_inventory,
    b.warehouse_inventory as bottle_current_inventory,
    b.size_oz,
    
    -- Closure Info (for cap inventory)
    c.closure_name,
    cl.closure_supplier,
    cl.moq as closure_moq,
    
    -- Label Info
    c.label_size,
    
    -- Finished Goods (for packaging BPM)
    fg.finished_good_name,
    fg.max_packaging_per_minute as packaging_bpm,
    fg.boxes_per_pallet,
    fg.box_weight_lbs,
    
    -- Brand
    c.brand_name,
    
    -- Sales Data
    c.units_sold_30_days,
    c.price
    
FROM catalog c
LEFT JOIN formula f ON c.formula_name = f.formula
LEFT JOIN formula_inventory fi ON c.formula_name = fi.formula_name
LEFT JOIN bottle b ON c.packaging_name = b.bottle_name
LEFT JOIN closure cl ON c.closure_name = cl.closure_name
LEFT JOIN brand br ON c.brand_name = br.brand_name
LEFT JOIN finished_goods fg ON c.size = fg.finished_good_name
WHERE c.child_asin IS NOT NULL;
```

---

## 4. Frontend Production Planning Workflow

Based on the screenshots and code analysis, here's how the system works:

### 4.1 Planning Page (Main Shipment List)

**URL**: `/production/planning`

**Purpose**: View all shipments and their progress through the production pipeline

**Columns**:
- **Status**: Packaging → Ready for Pickup → Shipped → Received
- **Shipment**: Date + Type (e.g., "2025.11.18 AWD")
- **Marketplace**: Amazon
- **Account**: TPS Nutrients
- **Progress Indicators** (circles):
  - ⚪ Not Started (white with border)
  - 🔵 In Progress (blue)
  - 🟢 Completed (green)

**Workflow Stages**:
1. **Add Products** - Select products and quantities for shipment
2. **Formula Check** - Verify formula/liquid inventory
3. **Label Check** - Verify label inventory and conduct cycle count
4. **Sort Products** - Organize products by type/size
5. **Sort Formulas** - Group by formula for efficient manufacturing

### 4.2 New Shipment Page (Product Selection)

**URL**: `/production/new-shipment`

**Tabs**:
1. **Add Products** (Step 1)
   - View: "All Products" or "Floor Inventory"
   - Floor Inventory options:
     - Sellables
     - Shiners (damaged/unsellable)
     - Unused Formulas

2. **Formula Check** (Step 2)
   - Shows table of formulas needed
   - Check formula inventory availability
   - Flag variance issues

3. **Label Check** (Step 3)
   - Active cycle count functionality
   - Shows label count for each product
   - Variance checking (if count != expected)
   - **Cycle Count Details**:
     - COUNT ID: "CC-DC-1"
     - COUNT TYPE: "Shipment Count"
     - Shows: Brand, Product, Size, Quantity, Label Current Inv, Label Location
     - "Start" button to begin counting

4. **Sort Products** (Step 4)
   - Table view of products sorted by type
   - Shows: Type (AWD/FBA), Brand, Product, Size, Qty, Formula

5. **Sort Formulas** (Step 5)
   - Groups products by formula
   - Shows vessel requirements (Tote/Barrel)
   - Total volume calculations (275 gallons per tote)

**Bottom Bar** (during Add Products):
- **Palettes**: Calculated from total boxes
- **Total Boxes**: Sum of all units ÷ units_per_case
- **Units**: Total product count
- **Time (HRS)**: Production time estimate
- **Weight (LBS)**: Total shipment weight
- **Export** button
- **Book Shipment** button → Opens shipment details modal

### 4.3 Product Detail (from Screenshots)

Shows inventory visualization with color-coded bars:
- 🟣 **Purple**: FBA Available inventory
- 🟢 **Green**: Total Inventory
- 🔵 **Blue**: Forecast demand

Timeline showing months: Today (11/25) → Dec → Jan → Feb → Mar → DCI Goal (4/15/25)

---

## 5. Essential Data Relationships for Production Planning

### 5.1 To Add Products to a Shipment, You Need:

```javascript
{
  // From CATALOG table
  catalog_id: 123,
  product_name: "Cherry Tree Fertilizer",
  brand_name: "TPS Plant Foods",
  size: "8oz",
  child_asin: "B0C73TDLPX",
  child_sku_final: "AFVIOLET1G-FBA-UPC-0523",
  
  // Quantity Planning
  quantity_requested: 240,  // User input
  units_per_case: 60,       // From catalog
  boxes_needed: 4,          // Calculated: 240 / 60
  
  // Formula Check (from FORMULA)
  formula_name: "F.10-10-10",
  gallons_per_unit: 0.0625,  // 8oz = 0.0625 gallons
  gallons_needed: 15,        // 240 × 0.0625
  
  // Bottle Check (from BOTTLE)
  bottle_name: "8oz Tall Cylinder Bottle",
  bottles_available: 1250,   // From bottle_inventory
  bottles_needed: 240,
  
  // Closure Check (from CLOSURE)
  closure_name: "Berry Unvented Cap",
  closures_available: 2000,
  closures_needed: 240,
  
  // Label Check (from LABEL_INVENTORY)
  label_location: "LBL-PLANT-567",
  labels_available: 180,     // ⚠️ SHORTAGE!
  labels_needed: 240,
  
  // Box Check (from BOX_INVENTORY)
  box_type: "12x10x12",
  boxes_available: 50,
  boxes_needed: 4
}
```

### 5.2 Inventory Check Logic

```javascript
function checkInventoryForShipment(products) {
  const checks = {
    formulas: {},
    bottles: {},
    closures: {},
    labels: {},
    boxes: {}
  };
  
  products.forEach(product => {
    // Aggregate formula needs
    if (!checks.formulas[product.formula_name]) {
      checks.formulas[product.formula_name] = {
        needed: 0,
        available: product.formula_gallons_available
      };
    }
    checks.formulas[product.formula_name].needed += 
      (product.quantity * product.gallons_per_unit);
    
    // Aggregate bottle needs
    if (!checks.bottles[product.bottle_name]) {
      checks.bottles[product.bottle_name] = {
        needed: 0,
        available: product.bottle_warehouse_inventory
      };
    }
    checks.bottles[product.bottle_name].needed += product.quantity;
    
    // Similar for closures, labels, boxes...
  });
  
  // Flag shortages
  return checkShortages(checks);
}
```

### 5.3 Production Time Calculation

```javascript
function calculateProductionTime(products) {
  let totalMinutes = 0;
  
  products.forEach(product => {
    // Manufacturing time (filling bottles)
    const manufacturingMinutes = 
      product.quantity / product.bottles_per_minute;
    
    // Packaging time (boxing finished goods)
    const packagingMinutes = 
      product.boxes_needed / product.packaging_bpm;
    
    totalMinutes += Math.max(manufacturingMinutes, packagingMinutes);
  });
  
  return totalMinutes / 60; // Convert to hours
}
```

---

## 6. Differences Between Database Versions

### 6.1 Key Evolution (Database 2 → Database 3)

**Database Version 2** likely included:
- Basic catalog structure
- Simple bottle/formula/closure tables
- No foreign key relationships
- No production planning views

**Database Version 3** (Current) includes:

1. **Migration 003**: Added Production Columns
   - `bottle.bottles_per_minute` (BPM for manufacturing speed)
   - `bottle.max_warehouse_inventory` (capacity planning)
   - `finished_goods.max_packaging_per_minute` (packaging speed)

2. **Migration 005**: Added Foreign Key Relationships
   - Enforces referential integrity
   - Creates `v_production_planning` view
   - Links catalog → bottle, formula, closure, brand

3. **Migration 006**: Supply Chain Order Tables
   - `bottle_orders`, `closure_orders`, `box_orders`
   - `bottle_inventory`, `closure_inventory`, `box_inventory`
   - Separate inventory tracking from master data

4. **Migration 008**: Label Tables
   - `label_inventory` table
   - `label_orders` table
   - Label cycle count tracking

5. **Migration 009**: Cycle Count Tables
   - `cycle_counts` table
   - `cycle_count_items` table
   - Variance tracking for inventory audits

### 6.2 Critical Additions for Production Planning

**Inventory Management**:
- Separated **master data** (bottle specs) from **inventory** (stock levels)
- Added **order tracking** for supply chain components
- Implemented **cycle counts** for accuracy

**Performance**:
- Added BPM (bottles per minute) for time calculations
- Added max_warehouse_inventory for capacity planning
- Created indexed views for fast queries

**Relationships**:
- Foreign keys ensure data integrity
- Views simplify complex joins
- ON DELETE SET NULL preserves historical data

---

## 7. Frontend-Backend Data Flow

### 7.1 Creating a New Shipment

```
1. User clicks "+ New Shipment" 
   └─► Frontend: Shows NewShipmentModal
       └─► User enters: shipment_number, shipment_date, account
           └─► POST /production/shipments
               └─► Backend: Creates shipment record

2. User navigates to "Add Products" tab
   └─► GET /v_production_planning
       └─► Returns: All products with bottle, formula, closure, label data
           └─► Frontend: Displays table with inventory bars

3. User adds products with quantities
   └─► Frontend: Calculates
       - boxes_needed = quantity / units_per_case
       - gallons_needed = quantity × gallons_per_unit
       - labels_needed = quantity
       - closures_needed = quantity
       
4. User clicks "Book Shipment"
   └─► POST /production/shipments/{id}/products
       └─► Backend: 
           - Validates inventory availability
           - Creates shipment_products records
           - Allocates formula gallons
           - Returns shortage warnings

5. Formula Check stage
   └─► GET /production/shipments/{id}/formula-check
       └─► Backend: Aggregates formula needs by formula_name
           └─► Returns: {formula_name, gallons_needed, gallons_available, status}

6. Label Check stage (Cycle Count)
   └─► POST /cycle-counts
       └─► Creates: cycle_count record (type: "Shipment Count")
           └─► POST /cycle-counts/{id}/items
               └─► Creates: cycle_count_items for each label location
                   └─► User counts labels, enters actual_quantity
                       └─► PUT /cycle-counts/{id}/items/{item_id}
                           └─► Calculates variance: actual - expected
                               └─► If variance > threshold: Flag for recount

7. Sort Products stage
   └─► GET /production/shipments/{id}/products?sort=type
       └─► Returns: Products grouped by shipment type (AWD vs FBA)

8. Sort Formulas stage
   └─► GET /production/shipments/{id}/formulas
       └─► Returns: Products grouped by formula_name
           └─► Shows: vessel_type (Tote/Barrel), vessel_qty, total_volume

9. Complete shipment
   └─► PUT /production/shipments/{id}/status
       └─► Updates: status = 'manufacturing'
```

### 7.2 Data Structure Example

**Shipment Object**:
```json
{
  "id": 1,
  "shipment_number": "2025.11.18 AWD",
  "shipment_date": "2025-11-18",
  "shipment_type": "AWD",
  "account": "TPS Nutrients",
  "marketplace": "Amazon",
  "status": "planning",
  "created_by": "user@example.com",
  "products": [
    {
      "catalog_id": 1,
      "product_name": "Cherry Tree Fertilizer",
      "brand": "TPS Plant Foods",
      "size": "8oz",
      "quantity": 240,
      
      // From catalog
      "child_asin": "B0C73TDLPX",
      "child_sku": "AFVIOLET1G-FBA-UPC-0523",
      "units_per_case": 60,
      
      // From bottle
      "bottle_name": "8oz Tall Cylinder Bottle",
      "bottle_available": 1250,
      "bottles_per_minute": 45,
      
      // From formula
      "formula_name": "F.10-10-10",
      "gallons_per_unit": 0.0625,
      "gallons_needed": 15,
      "gallons_available": 275,
      
      // From closure
      "closure_name": "Berry Unvented Cap",
      "closures_available": 2000,
      
      // From label_inventory
      "label_location": "LBL-PLANT-567",
      "labels_available": 180,
      "label_shortage": 60,
      
      // Calculations
      "boxes_needed": 4,
      "production_time_minutes": 5.33
    }
  ],
  "totals": {
    "units": 240,
    "boxes": 4,
    "palettes": 1,
    "weight_lbs": 168,
    "production_hours": 0.09
  }
}
```

---

## 8. Key Insights & Recommendations

### 8.1 Essential Database Features

1. **Foreign Keys** (Migration 005)
   - ✅ Maintains referential integrity
   - ✅ Enables efficient joins
   - ✅ Prevents orphaned data

2. **Inventory Separation** (Migration 006)
   - ✅ Master data (specs) vs transactional data (stock)
   - ✅ Historical tracking through orders
   - ✅ Audit trail for cycle counts

3. **Production Metrics** (Migration 003)
   - ✅ BPM enables time calculations
   - ✅ Max inventory enables capacity planning
   - ✅ Real-time feasibility checks

### 8.2 Critical Data for Each Stage

**Add Products**:
- catalog (all fields)
- bottle (bottle_name, warehouse_inventory, bottles_per_minute)
- formula (formula_name, gallons_available)
- closure (closure_name, warehouse_inventory)
- label_inventory (label_location, warehouse_quantity)
- box_inventory (box_type, warehouse_quantity)

**Formula Check**:
- formula_inventory (gallons_available, gallons_allocated)
- Aggregated by formula_name across all products

**Label Check**:
- cycle_counts table
- cycle_count_items table
- label_inventory (for variance checking)

**Sort Products**:
- catalog (shipment_type: AWD vs FBA)
- Grouped by type and size

**Sort Formulas**:
- catalog grouped by formula_name
- formula (for formula specs)
- Vessel calculations based on size

### 8.3 Data Validation Rules

```javascript
// Before creating shipment
function validateShipment(products) {
  const errors = [];
  
  products.forEach(product => {
    // Check formula availability
    if (product.gallons_needed > product.gallons_available) {
      errors.push({
        type: 'formula_shortage',
        product: product.product_name,
        needed: product.gallons_needed,
        available: product.gallons_available
      });
    }
    
    // Check bottle availability
    if (product.quantity > product.bottle_available) {
      errors.push({
        type: 'bottle_shortage',
        product: product.product_name,
        needed: product.quantity,
        available: product.bottle_available
      });
    }
    
    // Check closure availability
    if (product.quantity > product.closures_available) {
      errors.push({
        type: 'closure_shortage',
        product: product.product_name,
        needed: product.quantity,
        available: product.closures_available
      });
    }
    
    // Check label availability
    if (product.quantity > product.labels_available) {
      errors.push({
        type: 'label_shortage',
        product: product.product_name,
        needed: product.quantity,
        available: product.labels_available
      });
    }
    
    // Check warehouse capacity
    const totalBottlesAfterProduction = 
      product.bottle_current_inventory + product.quantity;
    if (totalBottlesAfterProduction > product.bottle_max_inventory) {
      errors.push({
        type: 'capacity_exceeded',
        product: product.product_name,
        max_capacity: product.bottle_max_inventory,
        projected: totalBottlesAfterProduction
      });
    }
  });
  
  return errors;
}
```

---

## 9. Conclusion

### Essential Tables for Production Planning:

1. **catalog** - Product variations (what we sell)
2. **bottle** - Container specs + BPM + inventory
3. **formula** - Liquid recipes + availability
4. **closure** - Cap specs + inventory
5. **label_inventory** - Label stock by location
6. **box_inventory** - Shipping box stock
7. **v_production_planning** - Unified view joining all above

### Database Evolution:

**Database 2 → Database 3** added:
- Foreign key relationships (referential integrity)
- Production metrics (BPM, max_inventory)
- Inventory separation (master vs stock)
- Cycle count tracking (label audits)
- Supply chain orders (purchase tracking)

### Frontend Workflow:

1. **Planning Page** - View all shipments and progress
2. **New Shipment** - Multi-step wizard:
   - Add Products (select + quantities)
   - Formula Check (verify liquid inventory)
   - Label Check (cycle count + variance)
   - Sort Products (organize by type)
   - Sort Formulas (group by recipe)

### Key Success Factors:

✅ **Complete product data** in catalog with all relationships  
✅ **Real-time inventory** for bottles, closures, labels, boxes  
✅ **Production metrics** (BPM) for time calculations  
✅ **Warehouse capacity** for feasibility checking  
✅ **Cycle counts** for inventory accuracy  
✅ **Aggregation logic** to sum needs across products  

---

## Appendix A: Sample Queries

### Get Complete Product Data for Shipment Planning
```sql
SELECT 
    c.id,
    c.product_name,
    c.brand_name,
    c.size,
    c.child_asin,
    c.units_per_case,
    
    -- Bottle
    b.bottle_name,
    b.size_oz,
    b.bottles_per_minute,
    bi.warehouse_quantity as bottles_available,
    
    -- Formula
    f.formula,
    f.npk,
    fi.gallons_available,
    
    -- Closure
    cl.closure_name,
    cli.warehouse_quantity as closures_available,
    
    -- Label
    li.label_location,
    li.warehouse_quantity as labels_available,
    
    -- Box
    bxi.warehouse_quantity as boxes_available
    
FROM catalog c
LEFT JOIN bottle b ON c.packaging_name = b.bottle_name
LEFT JOIN bottle_inventory bi ON b.bottle_name = bi.bottle_name
LEFT JOIN formula f ON c.formula_name = f.formula
LEFT JOIN formula_inventory fi ON f.formula = fi.formula_name
LEFT JOIN closure cl ON c.closure_name = cl.closure_name
LEFT JOIN closure_inventory cli ON cl.closure_name = cli.closure_name
LEFT JOIN label_inventory li ON c.label_location = li.label_location
LEFT JOIN box_inventory bxi ON c.case_size = bxi.box_type
WHERE c.child_asin IS NOT NULL
ORDER BY c.brand_name, c.product_name, c.size;
```

### Aggregate Formula Needs for Shipment
```sql
-- Assuming shipment_products table exists
SELECT 
    c.formula_name,
    SUM(sp.quantity * (b.size_oz / 128.0)) as gallons_needed,
    fi.gallons_available,
    fi.gallons_available - SUM(sp.quantity * (b.size_oz / 128.0)) as remaining
FROM shipment_products sp
JOIN catalog c ON sp.catalog_id = c.id
JOIN bottle b ON c.packaging_name = b.bottle_name
LEFT JOIN formula_inventory fi ON c.formula_name = fi.formula_name
WHERE sp.shipment_id = 1
GROUP BY c.formula_name, fi.gallons_available
ORDER BY c.formula_name;
```

---

**Document Version**: 1.0  
**Created**: 2025-11-29  
**Purpose**: Database analysis for production planning system

