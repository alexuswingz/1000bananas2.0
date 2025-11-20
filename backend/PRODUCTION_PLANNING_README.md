# 🍌 Production Planning System - Implementation Tracker

**Status:** In Progress  
**Started:** November 18, 2025  
**Target Completion:** 2 weeks  

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Implementation Checklist](#implementation-checklist)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [Frontend Structure](#frontend-structure)
7. [Calculations Reference](#calculations-reference)
8. [Testing Guide](#testing-guide)

---

## Overview

### What We're Building

A **formula-centric production planning system** that helps plan Amazon FBA/AWD shipments by:

- Tracking formula inventory (gallons available/used)
- Calculating Days of Inventory (DOI) using N-GOOS API
- Managing label inventory
- Guiding production planning through "Banana Prep" workflow
- Allocating formulas to shipments
- Calculating production requirements

### The 4 Views

1. **Sellables** - Active products currently selling (need restocking)
2. **Shiners** - Formulas ready but not yet launched
3. **Unused Formulas** - Formulas with no products assigned
4. **All Products** - Flat list of all products

### Banana Prep Workflow (8 Steps)

1. ✅ Check Sold Out Items
2. 🔵 Prioritize Low DOI
3. ⚪ Check New Products
4. ⚪ Check High Volume Items
5. ⚪ Check Low Total Inventory
6. ⚪ Check Label Quantities
7. ⚪ Adjust Production Order
8. ⚪ Adjust Manufacturing Order

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                          │
│  • Planning Dashboard (4 tabs)                              │
│  • Banana Prep Sidebar                                      │
│  • New Shipment Flow                                        │
└─────────────────┬───────────────────────────────────────────┘
                  │
         ┌────────▼────────┐
         │  ProductionAPI   │ (Service Layer)
         └────────┬─────────┘
                  │
    ┌─────────────┴─────────────┐
    │                           │
┌───▼────────┐          ┌──────▼──────┐
│ Lambda API │          │  N-GOOS API │
│  (Backend) │          │  (External) │
└───┬────────┘          └─────────────┘
    │
    │ PostgreSQL RDS
    │
┌───▼──────────────────────────────────────────────────────┐
│  Database Tables:                                         │
│  • catalog (with formula_name) ✅ Already mapped         │
│  • formula (68 formulas) ✅                              │
│  • bottle (with label_size) ✅                           │
│  • label_inventory ⚪ To create                          │
│  • formula_inventory ⚪ To create                        │
│  • production_shipments ⚪ To create                     │
│  • shipment_products ⚪ To create                        │
│  • banana_prep_steps ⚪ To create                        │
│  • banana_prep_progress ⚪ To create                     │
│  • formula_allocations ⚪ To create                      │
└──────────────────────────────────────────────────────────┘
```

---

## Implementation Checklist

### PHASE 1: DATA FOUNDATION 🗄️

**Status:** Not Started  
**Estimated Time:** 1 day

#### Task 1.1: Verify Label Sizes ✅
- [ ] Run query to check label_size population
  ```sql
  SELECT COUNT(*) as total, COUNT(label_size) as with_label FROM catalog;
  ```
- [ ] Update any NULL label_size from bottle table
- [ ] Document label size standards

**Notes:**
```
Query result: _____ / _____ products have label_size
Missing: _____ products
```

---

#### Task 1.2: Formula Mapping ✅ **ALREADY DONE!**
- [x] Formulas mapped: 910/910 products
- [x] Unique formulas: 68
- [x] Verified in `formula_mapping_extracted.json`

**Notes:**
```
✅ All products have formula_name populated
✅ Mapping verified from Excel import
```

---

#### Task 1.3: Create Label Inventory Table ⚪
- [ ] Create table with SQL (see Database Schema section)
- [ ] Seed with distinct label sizes from catalog
- [ ] Manually enter current quantities (if available)
- [ ] Test insert/update operations

**SQL File:** `create_label_inventory.sql`

**Notes:**
```
Label sizes found: _____
Initial quantities entered: Yes / No
Source of quantities: _____________
```

---

#### Task 1.4: Create Formula Inventory Table ⚪
- [ ] Create table with SQL
- [ ] Seed with all 68 formulas
- [ ] Enter current gallons available (if tracked)
- [ ] Test formula allocation logic

**SQL File:** `create_formula_inventory.sql`

**Notes:**
```
Formulas seeded: _____ / 68
Initial gallons entered: Yes / No
Source of data: _____________
```

---

### PHASE 2: PRODUCTION PLANNING TABLES 🏗️

**Status:** Not Started  
**Estimated Time:** 1 day

#### Task 2.1: Create Production Shipments Table ⚪
- [ ] Create `production_shipments` table
- [ ] Create indexes (status, date)
- [ ] Test insert/update
- [ ] Verify foreign key constraints

**SQL File:** `create_production_shipments.sql`

**Notes:**
```
Table created: Yes / No
Indexes created: Yes / No
Test shipment created: Yes / No
```

---

#### Task 2.2: Create Shipment Products Table ⚪
- [ ] Create `shipment_products` table
- [ ] Create indexes (shipment_id, formula_name)
- [ ] Test adding products to shipment
- [ ] Verify unique constraint (shipment_id, product_id)

**SQL File:** `create_shipment_products.sql`

**Notes:**
```
Table created: Yes / No
Indexes created: Yes / No
Test product added: Yes / No
```

---

#### Task 2.3: Create Banana Prep Workflow Tables ⚪
- [ ] Create `banana_prep_steps` table
- [ ] Seed with 8 workflow steps
- [ ] Create `banana_prep_progress` table
- [ ] Test workflow state tracking

**SQL File:** `create_banana_prep_tables.sql`

**Notes:**
```
Steps table created: Yes / No
Steps seeded: _____ / 8
Progress table created: Yes / No
```

---

#### Task 2.4: Create Formula Allocations Table ⚪
- [ ] Create `formula_allocations` table
- [ ] Create indexes
- [ ] Test allocation/release cycle
- [ ] Verify foreign key to formula table

**SQL File:** `create_formula_allocations.sql`

**Notes:**
```
Table created: Yes / No
Test allocation: Yes / No
Test release: Yes / No
```

---

### PHASE 3: BACKEND APIs 🔌

**Status:** Not Started  
**Estimated Time:** 3-4 days

#### Task 3.1: Formula Usage Endpoints ⚪
- [ ] Add `GET /production/formulas`
  - [ ] Query formula_inventory table
  - [ ] Group products by formula
  - [ ] Calculate gallons used
  - [ ] Support view filter (sellables/shiners/unused/all)
- [ ] Add route to lambda_handler()
- [ ] Test with Postman
- [ ] Document response format

**File:** `backend/lambda/lambda_function.py`

**Endpoint Test Results:**
```
GET /production/formulas?view=sellables
Status: _____
Response time: _____
Products returned: _____
```

---

#### Task 3.2: Planning Dashboard Endpoint ⚪
- [ ] Add `GET /production/planning`
- [ ] Fetch products from catalog
- [ ] Integrate N-GOOS API for DOI:
  - [ ] Call getForecast(asin) for each product
  - [ ] Handle products without ASIN
  - [ ] Handle N-GOOS API errors
  - [ ] Add timeout/retry logic
- [ ] Enrich products with:
  - [ ] DOI (fba_available_days, total_days)
  - [ ] Inventory (fba_available, awd_total)
  - [ ] Sales velocity
- [ ] Support pagination
- [ ] Test with real products

**File:** `backend/lambda/lambda_function.py`

**Endpoint Test Results:**
```
GET /production/planning?view=sellables&page=1&limit=50
Status: _____
Response time: _____ (with N-GOOS calls)
Products with DOI: _____ / _____
N-GOOS errors: _____
```

---

#### Task 3.3: Shipment CRUD Endpoints ⚪
- [ ] `POST /production/shipments` - Create
  - [ ] Validate shipment data
  - [ ] Generate shipment_number
  - [ ] Initialize banana_prep_progress
- [ ] `GET /production/shipments` - List
  - [ ] Support status filter
  - [ ] Support pagination
- [ ] `GET /production/shipments/{id}` - Details
  - [ ] Include products list
  - [ ] Include formula allocations
  - [ ] Include banana_prep progress
- [ ] `PUT /production/shipments/{id}` - Update
- [ ] `DELETE /production/shipments/{id}` - Delete
  - [ ] Cascade delete products
  - [ ] Release formula allocations

**Endpoint Test Results:**
```
POST /production/shipments: _____
GET /production/shipments: _____
GET /production/shipments/1: _____
PUT /production/shipments/1: _____
DELETE /production/shipments/1: _____
```

---

#### Task 3.4: Shipment Products Endpoints ⚪
- [ ] `POST /production/shipments/{id}/products`
  - [ ] Calculate formula gallons needed
  - [ ] Check label availability
  - [ ] Update shipment totals
  - [ ] Prevent duplicates
- [ ] `DELETE /production/shipments/{id}/products/{productId}`
  - [ ] Update totals
  - [ ] Recalculate formula needs
- [ ] `PUT /production/shipments/{id}/products/{productId}/quantity`
  - [ ] Update quantity
  - [ ] Recalculate gallons/labels

**Endpoint Test Results:**
```
POST .../products (add): _____
DELETE .../products/1: _____
PUT .../products/1/quantity: _____
Calculations accurate: Yes / No
```

---

#### Task 3.5: Banana Prep Workflow Endpoints ⚪
- [ ] `GET /production/shipments/{id}/banana-prep`
  - [ ] Return all 8 steps with completion status
  - [ ] Calculate progress percentage
- [ ] `POST /production/shipments/{id}/banana-prep/step/{stepNumber}/complete`
  - [ ] Mark step complete
  - [ ] Update timestamp
  - [ ] Auto-advance to next step
- [ ] `GET /production/banana-prep/steps`
  - [ ] Return step definitions

**Endpoint Test Results:**
```
GET .../banana-prep: _____
POST .../step/1/complete: _____
Progress tracking: Yes / No
```

---

#### Task 3.6: Formula Allocation Endpoints ⚪
- [ ] `POST /production/shipments/{id}/allocate-formula`
  - [ ] Calculate total gallons needed per formula
  - [ ] Check formula_inventory availability
  - [ ] Create allocation records
  - [ ] Update formula_inventory.gallons_allocated
  - [ ] Handle insufficient inventory
- [ ] `POST /production/shipments/{id}/release-formula`
  - [ ] Release allocations
  - [ ] Update formula_inventory
  - [ ] Mark allocations as released

**Endpoint Test Results:**
```
POST .../allocate-formula: _____
Allocation logic: Correct / Incorrect
POST .../release-formula: _____
Inventory updated: Yes / No
```

---

#### Task 3.7: Helper Functions ⚪
- [ ] `calculateFormulaGallonsNeeded(size, quantity)`
  ```python
  SIZE_TO_GALLONS = {
      '8oz': 0.0625, '16oz': 0.125, 'Quart': 0.25,
      '32oz': 0.25, 'Gallon': 1.0, '5 Gallon': 5.0
  }
  ```
- [ ] `enrichProductWithNGOOS(product)`
  - [ ] Call N-GOOS API
  - [ ] Add DOI, inventory, sales
  - [ ] Handle errors gracefully
- [ ] `checkLabelAvailability(labelSize, quantity)`
  - [ ] Query label_inventory
  - [ ] Return available vs needed
- [ ] `groupProductsByFormula(products)`
  - [ ] Group by formula_name
  - [ ] Calculate totals per formula

**Function Test Results:**
```
calculateFormulaGallonsNeeded: Tested / Not tested
enrichProductWithNGOOS: Tested / Not tested
checkLabelAvailability: Tested / Not tested
groupProductsByFormula: Tested / Not tested
```

---

### PHASE 4: FRONTEND DEVELOPMENT ⚛️

**Status:** Not Started  
**Estimated Time:** 3-4 days

#### Task 4.1: Create Production API Service ⚪
- [ ] Create `src/services/productionApi.js`
- [ ] Add methods:
  - [ ] `getFormulas(view)`
  - [ ] `getPlanning(view)`
  - [ ] `createShipment(data)`
  - [ ] `getShipments()`
  - [ ] `getShipmentDetails(id)`
  - [ ] `addProductToShipment(shipmentId, productId, qty)`
  - [ ] `getBananaPrepProgress(shipmentId)`
  - [ ] `completeStep(shipmentId, stepNumber)`
  - [ ] `allocateFormula(shipmentId)`
- [ ] Test all methods
- [ ] Add error handling

**File:** `src/services/productionApi.js`

**Notes:**
```
Service created: Yes / No
All methods implemented: _____ / 9
Error handling: Yes / No
```

---

#### Task 4.2: Update Planning Page ⚪
- [ ] Update `src/pages/production/planning/index.js`
- [ ] Add 4 tabs: Sellables, Shiners, Unused, All Products
- [ ] Connect to ProductionAPI
- [ ] Add loading states
- [ ] Handle N-GOOS errors gracefully
- [ ] Show "Last synced" timestamp
- [ ] Add refresh button

**File:** `src/pages/production/planning/index.js`

**Notes:**
```
4 tabs working: Yes / No
Loading states: Yes / No
Error handling: Yes / No
```

---

#### Task 4.3: Create Planning Components ⚪
- [ ] Update `PlanningHeader.js` with 4 tabs
- [ ] Update `PlanningTable.js`:
  - [ ] Formula grouping view
  - [ ] Show UNITS AVAILABLE / UNITS USED
  - [ ] Expandable formula rows
  - [ ] Product list with [+ Add] buttons
- [ ] Create `FormulaRow.js` component
  - [ ] Expandable/collapsible
  - [ ] Show formula details
  - [ ] List products using formula
- [ ] Create `BananaPrepSidebar.js`
  - [ ] Show 8 steps
  - [ ] Progress bar
  - [ ] Current step highlighted
  - [ ] [Start Task] button
  - [ ] Step completion checkmarks

**Files:**
- `src/pages/production/planning/components/PlanningHeader.js`
- `src/pages/production/planning/components/PlanningTable.js`
- `src/pages/production/planning/components/FormulaRow.js` (NEW)
- `src/pages/production/planning/components/BananaPrepSidebar.js` (NEW)

**Notes:**
```
Components created: _____ / 4
Formula grouping working: Yes / No
Banana Prep sidebar: Yes / No
```

---

#### Task 4.4: Update New Shipment Flow ⚪
- [ ] Update `src/pages/production/new-shipment/index.js`
- [ ] Integrate with backend API
- [ ] Real-time formula calculation
- [ ] Label availability warnings
- [ ] Box count calculation
- [ ] Update `NewShipmentTable.js`:
  - [ ] Show formula gallons needed
  - [ ] Show labels available vs needed
  - [ ] Warning icons for insufficient labels

**Files:**
- `src/pages/production/new-shipment/index.js`
- `src/pages/production/new-shipment/components/NewShipmentTable.js`

**Notes:**
```
Backend integration: Yes / No
Formula calculations: Accurate / Inaccurate
Label warnings: Working / Not working
```

---

#### Task 4.5: Implement Banana Prep Workflow ⚪
- [ ] Create auto-actions for each step:
  - [ ] Step 1: Filter DOI = 0 (sold out)
  - [ ] Step 2: Sort by DOI ascending
  - [ ] Step 3: Filter new products (no shipment history)
  - [ ] Step 4: Sort by sales velocity
  - [ ] Step 5: Filter total inventory < threshold
  - [ ] Step 6: Show label availability check
  - [ ] Step 7: Show shipment summary
  - [ ] Step 8: Show formula requirements
- [ ] Progress tracking
- [ ] Step completion API calls
- [ ] Visual feedback (animations)

**Notes:**
```
Auto-actions working: _____ / 8
Progress tracking: Yes / No
API integration: Yes / No
```

---

#### Task 4.6: Formula Allocation UI ⚪
- [ ] Show formula requirements before finalizing shipment
- [ ] Display available vs needed for each formula
- [ ] Warning for insufficient formula
- [ ] Allocate button
- [ ] Confirmation dialog
- [ ] Success/error feedback

**Notes:**
```
Formula display: Yes / No
Allocation working: Yes / No
Error handling: Yes / No
```

---

### PHASE 5: TESTING & DEPLOYMENT 🧪

**Status:** Not Started  
**Estimated Time:** 1-2 days

#### Task 5.1: Backend Testing ⚪
- [ ] Test all endpoints with Postman
- [ ] Verify formula calculations
- [ ] Test N-GOOS API integration
- [ ] Test error handling
- [ ] Load testing (multiple products)
- [ ] Test edge cases:
  - [ ] Product without ASIN
  - [ ] N-GOOS API down
  - [ ] Formula not found
  - [ ] Label not found

**Test Results:**
```
All endpoints working: Yes / No
Formula calculations: Accurate / Inaccurate
N-GOOS integration: Working / Broken
Error handling: Good / Needs work
Edge cases handled: _____ / 4
```

---

#### Task 5.2: Frontend Testing ⚪
- [ ] Test all 4 tab views
- [ ] Test adding products to shipment
- [ ] Test Banana Prep workflow
- [ ] Test formula allocation
- [ ] Test calculations accuracy
- [ ] Cross-browser testing
- [ ] Mobile responsive check

**Test Results:**
```
All views working: Yes / No
Product addition: Working / Broken
Banana Prep: Working / Broken
Calculations accurate: Yes / No
Responsive: Yes / No
```

---

#### Task 5.3: Database Migration ⚪
- [ ] Create migration script
- [ ] Backup production database
- [ ] Run CREATE TABLE statements
- [ ] Seed reference data
- [ ] Verify tables created
- [ ] Verify indexes created
- [ ] Test rollback procedure

**Migration File:** `migrate_production_planning.sql`

**Notes:**
```
Backup completed: Yes / No
Tables created: _____ / 7
Seed data loaded: Yes / No
```

---

#### Task 5.4: Deploy to Production ⚪
- [ ] Update Lambda function code
- [ ] Deploy Lambda (zip + upload)
- [ ] Update API Gateway routes:
  - [ ] `/production/formulas`
  - [ ] `/production/planning`
  - [ ] `/production/shipments`
  - [ ] `/production/shipments/{id}/products`
  - [ ] `/production/shipments/{id}/banana-prep`
- [ ] Test production endpoints
- [ ] Deploy frontend to hosting
- [ ] Smoke testing

**Deployment Notes:**
```
Lambda deployed: Yes / No
API Gateway updated: Yes / No
Frontend deployed: Yes / No
Production smoke test: Pass / Fail
```

---

## Database Schema

### New Tables to Create

#### 1. label_inventory
```sql
CREATE TABLE label_inventory (
    id SERIAL PRIMARY KEY,
    label_size VARCHAR(100) NOT NULL UNIQUE,
    quantity_on_hand INTEGER DEFAULT 0,
    quantity_on_order INTEGER DEFAULT 0,
    supplier VARCHAR(255),
    reorder_point INTEGER DEFAULT 1000,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

CREATE INDEX idx_label_inventory_size ON label_inventory(label_size);

-- Seed data
INSERT INTO label_inventory (label_size, quantity_on_hand)
SELECT DISTINCT label_size, 0
FROM catalog 
WHERE label_size IS NOT NULL
ON CONFLICT (label_size) DO NOTHING;
```

#### 2. formula_inventory
```sql
CREATE TABLE formula_inventory (
    id SERIAL PRIMARY KEY,
    formula_name VARCHAR(255) NOT NULL UNIQUE,
    gallons_available DECIMAL(10,2) DEFAULT 0,
    gallons_allocated DECIMAL(10,2) DEFAULT 0,
    gallons_in_production DECIMAL(10,2) DEFAULT 0,
    production_due_date DATE,
    last_manufactured DATE,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (formula_name) REFERENCES formula(formula)
);

CREATE INDEX idx_formula_inventory_name ON formula_inventory(formula_name);

-- Seed data
INSERT INTO formula_inventory (formula_name, gallons_available)
SELECT formula, 0 
FROM formula
ON CONFLICT (formula_name) DO NOTHING;
```

#### 3. production_shipments
```sql
CREATE TABLE production_shipments (
    id SERIAL PRIMARY KEY,
    shipment_number VARCHAR(100) UNIQUE NOT NULL,
    shipment_date DATE NOT NULL,
    shipment_type VARCHAR(50),
    account VARCHAR(255),
    location VARCHAR(255),
    status VARCHAR(50) DEFAULT 'planning',
    workflow_step INTEGER DEFAULT 1,
    workflow_completed BOOLEAN DEFAULT FALSE,
    total_units INTEGER DEFAULT 0,
    total_boxes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255)
);

CREATE INDEX idx_shipments_status ON production_shipments(status);
CREATE INDEX idx_shipments_date ON production_shipments(shipment_date);
CREATE INDEX idx_shipments_number ON production_shipments(shipment_number);
```

#### 4. shipment_products
```sql
CREATE TABLE shipment_products (
    id SERIAL PRIMARY KEY,
    shipment_id INTEGER NOT NULL REFERENCES production_shipments(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES catalog(id),
    quantity_planned INTEGER NOT NULL,
    quantity_produced INTEGER DEFAULT 0,
    quantity_packaged INTEGER DEFAULT 0,
    formula_name VARCHAR(255),
    formula_gallons_needed DECIMAL(10,2),
    formula_allocated BOOLEAN DEFAULT FALSE,
    label_size VARCHAR(100),
    labels_needed INTEGER,
    labels_available INTEGER,
    labels_sufficient BOOLEAN DEFAULT FALSE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    UNIQUE(shipment_id, product_id)
);

CREATE INDEX idx_shipment_products_shipment ON shipment_products(shipment_id);
CREATE INDEX idx_shipment_products_product ON shipment_products(product_id);
CREATE INDEX idx_shipment_products_formula ON shipment_products(formula_name);
```

#### 5. banana_prep_steps
```sql
CREATE TABLE banana_prep_steps (
    id SERIAL PRIMARY KEY,
    step_number INTEGER NOT NULL UNIQUE,
    step_name VARCHAR(255) NOT NULL,
    step_description TEXT,
    auto_action VARCHAR(100)
);

-- Seed data
INSERT INTO banana_prep_steps (step_number, step_name, step_description, auto_action) VALUES
(1, 'Check Sold Out Items', 'Review products with 0 FBA inventory', 'filter_sold_out'),
(2, 'Prioritize Low DOI', 'Sort by days of inventory (lowest first)', 'sort_by_doi'),
(3, 'Check New Products', 'Review new launches ready to ship', 'filter_new_products'),
(4, 'Check High Volume Items', 'Ensure best sellers are included', 'sort_by_velocity'),
(5, 'Check Low Total Inventory', 'Review products low across all locations', 'filter_low_total'),
(6, 'Check Label Quantities', 'Verify sufficient labels available', 'validate_labels'),
(7, 'Adjust Production Order', 'Review and finalize shipment list', 'review_shipment'),
(8, 'Adjust Manufacturing Order', 'Calculate formula requirements', 'calculate_formulas');
```

#### 6. banana_prep_progress
```sql
CREATE TABLE banana_prep_progress (
    id SERIAL PRIMARY KEY,
    shipment_id INTEGER NOT NULL REFERENCES production_shipments(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    notes TEXT,
    UNIQUE(shipment_id, step_number)
);

CREATE INDEX idx_banana_prep_shipment ON banana_prep_progress(shipment_id);
```

#### 7. formula_allocations
```sql
CREATE TABLE formula_allocations (
    id SERIAL PRIMARY KEY,
    shipment_id INTEGER NOT NULL REFERENCES production_shipments(id),
    formula_name VARCHAR(255) NOT NULL,
    gallons_allocated DECIMAL(10,2) NOT NULL,
    allocated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    released_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'allocated',
    FOREIGN KEY (formula_name) REFERENCES formula(formula)
);

CREATE INDEX idx_formula_alloc_shipment ON formula_allocations(shipment_id);
CREATE INDEX idx_formula_alloc_formula ON formula_allocations(formula_name);
CREATE INDEX idx_formula_alloc_status ON formula_allocations(status);
```

---

## API Endpoints

### Formula Management

#### GET /production/formulas
Get formulas grouped with products and inventory levels.

**Query Parameters:**
- `view` (optional): `sellables` | `shiners` | `unused` | `all` (default: `all`)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "formula_name": "F.ULTRAGROW",
      "gallons_available": 320.5,
      "gallons_allocated": 85.0,
      "gallons_free": 235.5,
      "products": [
        {
          "id": 1,
          "brand": "TPS Plant Foods",
          "product": "Cherry Tree Fertilizer",
          "size": "8oz",
          "quantity_needed": 240
        }
      ]
    }
  ],
  "count": 68
}
```

---

#### GET /production/planning
Get planning dashboard with products enriched with N-GOOS data.

**Query Parameters:**
- `view` (optional): `sellables` | `shiners` | `unused` | `all`
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "brand": "TPS Plant Foods",
      "product": "Cherry Tree Fertilizer",
      "size": "8oz",
      "child_asin": "B0C73TDLPX",
      "formula_name": "F.ULTRAGROW",
      "doiFba": 12,
      "doiTotal": 32,
      "inventory": 240,
      "forecast": 20,
      "sales7": 140,
      "sales30": 600,
      "velocity": 20
    }
  ],
  "count": 50,
  "page": 1,
  "totalPages": 10
}
```

---

### Shipment Management

#### POST /production/shipments
Create a new shipment.

**Request Body:**
```json
{
  "shipment_number": "2025-09-23",
  "shipment_date": "2025-09-23",
  "shipment_type": "AWD",
  "account": "TPS Nutrients",
  "location": "1137 N 96th St"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "shipment_number": "2025-09-23",
    "status": "planning",
    "workflow_step": 1,
    "created_at": "2025-11-18T10:00:00Z"
  }
}
```

---

#### GET /production/shipments
List all shipments.

**Query Parameters:**
- `status` (optional): Filter by status
- `page`, `limit` (optional): Pagination

---

#### GET /production/shipments/{id}
Get shipment details with products and allocations.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "shipment_number": "2025-09-23",
    "shipment_type": "AWD",
    "status": "planning",
    "workflow_step": 2,
    "total_units": 2847,
    "total_boxes": 156,
    "products": [...],
    "formula_allocations": [...]
  }
}
```

---

#### POST /production/shipments/{id}/products
Add a product to shipment.

**Request Body:**
```json
{
  "product_id": 1,
  "quantity": 240
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "shipment_id": 1,
    "product_id": 1,
    "quantity_planned": 240,
    "formula_gallons_needed": 15.0,
    "labels_needed": 240,
    "labels_available": 500,
    "labels_sufficient": true
  }
}
```

---

### Banana Prep Workflow

#### GET /production/shipments/{id}/banana-prep
Get workflow progress for shipment.

**Response:**
```json
{
  "success": true,
  "data": {
    "shipment_id": 1,
    "current_step": 2,
    "progress_percentage": 12.5,
    "steps": [
      {
        "step_number": 1,
        "step_name": "Check Sold Out Items",
        "completed": true,
        "completed_at": "2025-11-18T10:00:00Z"
      },
      {
        "step_number": 2,
        "step_name": "Prioritize Low DOI",
        "completed": false,
        "completed_at": null
      }
    ]
  }
}
```

---

#### POST /production/shipments/{id}/banana-prep/step/{stepNumber}/complete
Mark a step as complete.

---

### Formula Allocation

#### POST /production/shipments/{id}/allocate-formula
Allocate formulas for shipment.

**Response:**
```json
{
  "success": true,
  "data": {
    "allocations": [
      {
        "formula_name": "F.ULTRAGROW",
        "gallons_allocated": 85.0,
        "gallons_available": 320.5,
        "sufficient": true
      }
    ],
    "insufficient": []
  }
}
```

---

## Frontend Structure

```
src/
├── pages/
│   └── production/
│       ├── planning/
│       │   ├── index.js                    # Main planning page
│       │   └── components/
│       │       ├── PlanningHeader.js       # 4 tabs
│       │       ├── PlanningTable.js        # Formula-grouped table
│       │       ├── FormulaRow.js           # ⭐ NEW - Expandable formula row
│       │       └── BananaPrepSidebar.js    # ⭐ NEW - Workflow sidebar
│       │
│       └── new-shipment/
│           ├── index.js
│           └── components/
│               ├── NewShipmentHeader.js
│               └── NewShipmentTable.js     # Updated with formula/labels
│
└── services/
    ├── productionApi.js                    # ⭐ NEW - Production API service
    └── ngoosApi.js                         # Already exists (N-GOOS)
```

---

## Calculations Reference

### Formula Gallons Needed

```python
SIZE_TO_GALLONS = {
    '8oz': 0.0625,      # 1/16 gallon
    '16oz': 0.125,      # 1/8 gallon
    'Quart': 0.25,      # 1/4 gallon
    '32oz': 0.25,       # 1/4 gallon
    'Gallon': 1.0,      # 1 gallon
    '5 Gallon': 5.0     # 5 gallons
}

gallons_needed = SIZE_TO_GALLONS[size] * quantity
```

**Example:**
- Product: Cherry Tree Fertilizer 8oz
- Quantity: 240 units
- Calculation: 0.0625 * 240 = **15 gallons**

---

### DOI (Days of Inventory)

```javascript
DOI = Total Inventory ÷ Daily Sales Velocity

// Example:
FBA Available: 240 units
Sales last 30 days: 600 units
Daily velocity: 600 ÷ 30 = 20 units/day
DOI = 240 ÷ 20 = 12 days
```

**DOI Types:**
- **DOI FBA** = FBA Available ÷ Daily Velocity
- **DOI Total** = (FBA + AWD + Inbound) ÷ Daily Velocity

---

### Boxes Per Product

```python
UNITS_PER_BOX = {
    '8oz': 60,
    'Quart': 12,
    'Gallon': 4
}

boxes_needed = ceil(quantity / UNITS_PER_BOX[size])
```

---

## Testing Guide

### Backend Testing with Postman

1. **Test Formula Endpoint**
   ```
   GET https://your-api.com/prod/production/formulas?view=sellables
   Expected: List of formulas with products
   ```

2. **Test Planning Endpoint**
   ```
   GET https://your-api.com/prod/production/planning?view=sellables&page=1&limit=10
   Expected: Products with DOI data from N-GOOS
   ```

3. **Test Shipment Creation**
   ```
   POST https://your-api.com/prod/production/shipments
   Body: { "shipment_number": "TEST-001", "shipment_date": "2025-11-20", ... }
   Expected: New shipment created
   ```

4. **Test Add Product to Shipment**
   ```
   POST https://your-api.com/prod/production/shipments/1/products
   Body: { "product_id": 1, "quantity": 240 }
   Expected: Product added, formula calculated
   ```

5. **Test Formula Allocation**
   ```
   POST https://your-api.com/prod/production/shipments/1/allocate-formula
   Expected: Formulas allocated, inventory updated
   ```

### Frontend Testing Checklist

- [ ] All 4 tabs load correctly
- [ ] Formula rows expand/collapse
- [ ] DOI values display correctly
- [ ] Add product to shipment works
- [ ] Banana Prep sidebar shows progress
- [ ] Step completion works
- [ ] Formula allocation shows warnings
- [ ] Label availability warnings show
- [ ] Calculations are accurate
- [ ] Loading states show
- [ ] Error messages display

---

## Progress Tracker

### Week 1 (Days 1-5)
- [ ] Day 1: Database tables created and seeded
- [ ] Day 2: Formula usage endpoints complete
- [ ] Day 3: Planning endpoint with N-GOOS integration
- [ ] Day 4: Shipment CRUD endpoints
- [ ] Day 5: Banana Prep workflow endpoints

### Week 2 (Days 6-10)
- [ ] Day 6: ProductionAPI service created
- [ ] Day 7: Planning page updated with 4 tabs
- [ ] Day 8: Banana Prep sidebar component
- [ ] Day 9: New shipment flow integration
- [ ] Day 10: Testing and deployment

---

## Quick Reference

### Database Connection
```python
DB_CONFIG = {
    'host': 'bananas-db.cf6s2y8ae04j.ap-southeast-2.rds.amazonaws.com',
    'port': 5432,
    'database': 'postgres',
    'user': 'postgres',
    'password': 'postgres'
}
```

### API Gateway Base URL
```
https://sl2r0ip8zl.execute-api.ap-southeast-2.amazonaws.com/prod
```

### N-GOOS API Base URL
```
https://sl2r0ip8zl.execute-api.ap-southeast-2.amazonaws.com
```

---

## Notes & Issues

### Known Issues
```
(Add any issues encountered here)
```

### Questions
```
(Add questions that need clarification)
```

### Decisions Made
```
Date: 2025-11-18
- Using N-GOOS API for DOI calculation (not local calculation)
- Formula mapping already complete (910/910 products)
- 68 formulas in use across all products
```

---

**Last Updated:** November 18, 2025  
**Updated By:** Development Team  
**Next Review:** When Phase 1 completes

