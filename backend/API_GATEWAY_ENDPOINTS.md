# 🌐 API Gateway Endpoints - Production Planning

**Base URL:** `https://your-api-gateway-url.amazonaws.com/prod`

---

## 📋 Complete Endpoint List

### **Total Endpoints:** 21
- **Priority 1 (Core):** 8 endpoints
- **Priority 2 (Important):** 7 endpoints  
- **Priority 3 (Nice to have):** 6 endpoints

---

## 🎯 PRIORITY 1: Core Endpoints (Build First)

### 1. Formula Inventory Management

#### GET /production/formula-inventory
**Purpose:** Get all formulas with inventory levels  
**Method:** GET  
**Query Parameters:**
- `?low_only=true` - Only show low inventory (< 50 gallons)
- `?page=1&limit=50` - Pagination

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "formula_name": "F.10-10-10",
      "gallons_available": 496.04,
      "gallons_allocated": 0,
      "gallons_free": 496.04,
      "last_manufactured": "2025-11-18"
    }
  ],
  "count": 78
}
```

---

#### GET /production/formula-inventory/{formula_name}
**Purpose:** Get specific formula details  
**Method:** GET  
**Path Parameters:**
- `{formula_name}` - e.g., "F.10-10-10"

**Response:**
```json
{
  "success": true,
  "data": {
    "formula_name": "F.10-10-10",
    "gallons_available": 496.04,
    "gallons_allocated": 85.0,
    "gallons_in_production": 0,
    "gallons_free": 411.04,
    "last_manufactured": "2025-11-18",
    "allocations": [
      {
        "shipment_id": 1,
        "shipment_number": "2025-09-23",
        "gallons_allocated": 85.0,
        "allocated_at": "2025-11-18T10:00:00Z"
      }
    ]
  }
}
```

---

#### PUT /production/formula-inventory/{formula_name}
**Purpose:** Update formula inventory quantities  
**Method:** PUT  
**Path Parameters:**
- `{formula_name}` - e.g., "F.10-10-10"

**Request Body:**
```json
{
  "gallons_available": 500.0,
  "gallons_in_production": 100.0,
  "production_due_date": "2025-11-25",
  "notes": "New batch manufactured"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Formula inventory updated",
  "data": {
    "formula_name": "F.10-10-10",
    "gallons_available": 500.0,
    "last_updated": "2025-11-18T10:30:00Z"
  }
}
```

---

### 2. Formula Usage (Grouped View)

#### GET /production/formulas
**Purpose:** Get formulas grouped with products (for Planning Dashboard)  
**Method:** GET  
**Query Parameters:**
- `?view=sellables|shiners|unused|all` (default: all)
- `?page=1&limit=50`

**Response:**
```json
{
  "success": true,
  "view": "sellables",
  "data": [
    {
      "formula_name": "F.10-10-10",
      "gallons_available": 496.04,
      "gallons_allocated": 85.0,
      "gallons_free": 411.04,
      "products": [
        {
          "id": 1,
          "brand": "TPS Plant Foods",
          "product": "10-10-10 Fertilizer",
          "size": "8oz",
          "child_asin": "B0C73TDLPX",
          "doi_fba": 12,
          "inventory": 240
        }
      ],
      "total_products": 3
    }
  ],
  "count": 45
}
```

---

### 3. Planning Dashboard (with N-GOOS)

#### GET /production/planning
**Purpose:** Get planning dashboard with products enriched with N-GOOS DOI data  
**Method:** GET  
**Query Parameters:**
- `?view=sellables|shiners|unused|all`
- `?page=1&limit=50`
- `?filter=sold_out|low_doi|high_volume`

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
      "formula_name": "F.10-10-10",
      "doi_fba": 12,
      "doi_total": 32,
      "inventory_fba": 240,
      "inventory_awd": 100,
      "sales_7_days": 140,
      "sales_30_days": 600,
      "velocity_daily": 20,
      "forecast_units": 280,
      "labels_available": 500
    }
  ],
  "count": 50,
  "page": 1,
  "total_pages": 10
}
```

---

### 4. Shipment Management

#### POST /production/shipments
**Purpose:** Create a new shipment  
**Method:** POST  

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
**Purpose:** List all shipments  
**Method:** GET  
**Query Parameters:**
- `?status=planning|manufacturing|packaging|shipped`
- `?page=1&limit=20`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "shipment_number": "2025-09-23",
      "shipment_type": "AWD",
      "account": "TPS Nutrients",
      "status": "planning",
      "workflow_step": 2,
      "total_units": 2847,
      "total_boxes": 156,
      "created_at": "2025-11-18T10:00:00Z"
    }
  ],
  "count": 5
}
```

---

#### GET /production/shipments/{id}
**Purpose:** Get shipment details with products and allocations  
**Method:** GET  
**Path Parameters:**
- `{id}` - Shipment ID

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
    "products": [
      {
        "id": 1,
        "product_id": 1,
        "product_name": "Cherry Tree Fertilizer",
        "size": "8oz",
        "quantity_planned": 240,
        "formula_name": "F.10-10-10",
        "formula_gallons_needed": 15.0,
        "labels_needed": 240,
        "labels_available": 500,
        "labels_sufficient": true
      }
    ],
    "formula_requirements": [
      {
        "formula_name": "F.10-10-10",
        "gallons_needed": 85.0,
        "gallons_available": 496.04,
        "sufficient": true
      }
    ]
  }
}
```

---

#### POST /production/shipments/{id}/products
**Purpose:** Add product to shipment  
**Method:** POST  
**Path Parameters:**
- `{id}` - Shipment ID

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

## 🎯 PRIORITY 2: Important Endpoints

### 5. Shipment Products Management

#### DELETE /production/shipments/{id}/products/{product_id}
**Purpose:** Remove product from shipment  
**Method:** DELETE  

---

#### PUT /production/shipments/{id}/products/{product_id}
**Purpose:** Update product quantity in shipment  
**Method:** PUT  

**Request Body:**
```json
{
  "quantity": 300
}
```

---

### 6. Banana Prep Workflow

#### GET /production/shipments/{id}/banana-prep
**Purpose:** Get Banana Prep workflow progress  
**Method:** GET  

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

#### POST /production/shipments/{id}/banana-prep/step/{step_number}
**Purpose:** Mark a workflow step as complete  
**Method:** POST  
**Path Parameters:**
- `{id}` - Shipment ID
- `{step_number}` - Step number (1-8)

**Request Body:**
```json
{
  "notes": "Reviewed all sold out items, added 3 products"
}
```

---

#### GET /production/banana-prep/steps
**Purpose:** Get all workflow step definitions  
**Method:** GET  

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "step_number": 1,
      "step_name": "Check Sold Out Items",
      "step_description": "Review products with 0 FBA inventory",
      "auto_action": "filter_sold_out"
    }
  ]
}
```

---

### 7. Formula Allocation

#### POST /production/shipments/{id}/allocate-formula
**Purpose:** Allocate formulas for shipment  
**Method:** POST  

**Response:**
```json
{
  "success": true,
  "data": {
    "allocations": [
      {
        "formula_name": "F.10-10-10",
        "gallons_needed": 85.0,
        "gallons_available": 496.04,
        "gallons_allocated": 85.0,
        "sufficient": true
      }
    ],
    "insufficient": [],
    "total_gallons_allocated": 85.0
  }
}
```

---

#### POST /production/shipments/{id}/release-formula
**Purpose:** Release formula allocations (when shipment completes)  
**Method:** POST  

---

### 8. Shipment Actions

#### PUT /production/shipments/{id}
**Purpose:** Update shipment details  
**Method:** PUT  

**Request Body:**
```json
{
  "status": "manufacturing",
  "workflow_step": 3,
  "notes": "Started manufacturing"
}
```

---

#### DELETE /production/shipments/{id}
**Purpose:** Delete shipment (cascade deletes products and releases formulas)  
**Method:** DELETE  

---

## 🎯 PRIORITY 3: Nice to Have

### 9. Label Inventory

#### GET /production/label-inventory
**Purpose:** Get all label sizes with quantities  
**Method:** GET  

---

#### PUT /production/label-inventory/{label_size}
**Purpose:** Update label quantities  
**Method:** PUT  

---

### 10. Analytics & Reports

#### GET /production/reports/formula-usage
**Purpose:** Formula usage report over time  
**Method:** GET  

---

#### GET /production/reports/shipment-history
**Purpose:** Historical shipment data  
**Method:** GET  

---

### 11. Batch Operations

#### POST /production/shipments/{id}/products/batch
**Purpose:** Add multiple products at once  
**Method:** POST  

---

#### POST /production/formula-inventory/batch-update
**Purpose:** Update multiple formulas at once  
**Method:** POST  

---

## 📊 API Gateway Configuration

### Resources Structure:
```
/production
├── /formula-inventory
│   └── /{formula_name}
├── /formulas
├── /planning
├── /shipments
│   ├── /{id}
│   │   ├── /products
│   │   │   └── /{product_id}
│   │   ├── /banana-prep
│   │   │   └── /step
│   │   │       └── /{step_number}
│   │   ├── /allocate-formula
│   │   └── /release-formula
│   └── /batch
├── /banana-prep
│   └── /steps
├── /label-inventory
│   └── /{label_size}
└── /reports
    ├── /formula-usage
    └── /shipment-history
```

---

## 🔧 API Gateway Settings

### CORS Configuration:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token
Access-Control-Allow-Methods: GET,POST,PUT,DELETE,PATCH,OPTIONS
```

### Integration Type:
- **Lambda Proxy Integration** ✅ (Recommended)
- Passes entire request to Lambda
- Lambda returns full HTTP response

### Throttling:
- **Rate:** 10,000 requests/second
- **Burst:** 5,000 requests

### Caching (Optional):
- **TTL:** 300 seconds (5 minutes) for GET /production/planning
- **Invalidate:** On POST/PUT/DELETE operations

---

## 🚀 Implementation Order

### Week 1: Core Endpoints (Priority 1)
1. ✅ Formula Inventory (GET, PUT)
2. ✅ Formula Usage/Grouping (GET /production/formulas)
3. ✅ Planning Dashboard (GET /production/planning)
4. ✅ Shipment CRUD (POST, GET, GET by ID)
5. ✅ Add Product to Shipment (POST)

### Week 2: Important Features (Priority 2)
6. ✅ Banana Prep Workflow (GET, POST)
7. ✅ Formula Allocation (POST allocate/release)
8. ✅ Update/Delete Shipment Products

### Week 3: Polish (Priority 3)
9. ✅ Label Inventory
10. ✅ Reports & Analytics
11. ✅ Batch Operations

---

## 📝 Lambda Handler Routing

Your `lambda_function.py` will need to route like this:

```python
def lambda_handler(event, context):
    http_method = event.get('httpMethod')
    path = event.get('path')
    
    # Formula Inventory
    if path == '/production/formula-inventory' and http_method == 'GET':
        return get_formula_inventory(event)
    
    if path.startswith('/production/formula-inventory/') and http_method == 'GET':
        return get_formula_inventory_detail(event)
    
    if path.startswith('/production/formula-inventory/') and http_method == 'PUT':
        return update_formula_inventory(event)
    
    # Formula Usage
    if path == '/production/formulas' and http_method == 'GET':
        return get_formulas_grouped(event)
    
    # Planning Dashboard
    if path == '/production/planning' and http_method == 'GET':
        return get_planning_dashboard(event)
    
    # Shipments
    if path == '/production/shipments' and http_method == 'POST':
        return create_shipment(event)
    
    if path == '/production/shipments' and http_method == 'GET':
        return get_shipments(event)
    
    if path.startswith('/production/shipments/') and http_method == 'GET':
        return get_shipment_detail(event)
    
    # ... etc
```

---

## 🧪 Testing Checklist

For each endpoint:
- [ ] Test successful request
- [ ] Test with invalid data (400 error)
- [ ] Test with non-existent resource (404 error)
- [ ] Test CORS preflight (OPTIONS)
- [ ] Test with N-GOOS API down (fallback)
- [ ] Test pagination
- [ ] Test query parameters

---

## 📋 Quick Reference

### Most Used Endpoints:
```
GET  /production/planning                    # Main dashboard
GET  /production/formulas?view=sellables     # Formula view
POST /production/shipments                   # New shipment
POST /production/shipments/{id}/products     # Add product
POST /production/shipments/{id}/allocate     # Allocate formulas
GET  /production/shipments/{id}/banana-prep  # Workflow
```

### Update Endpoints:
```
PUT /production/formula-inventory/{name}      # Update gallons
PUT /production/shipments/{id}               # Update shipment
PUT /production/shipments/{id}/products/{id} # Update quantity
```

### Utility Endpoints:
```
GET /production/banana-prep/steps            # Get workflow steps
GET /production/label-inventory              # Check labels
```

---

## 🔒 Security (Future)

Consider adding:
- API Key authentication
- JWT tokens
- IAM authorization
- Rate limiting per user
- Request logging

---

**Total Endpoints to Create:** 21  
**Priority 1 (Must Have):** 8 endpoints  
**Priority 2 (Important):** 7 endpoints  
**Priority 3 (Nice to Have):** 6 endpoints  

**Estimated Development Time:** 2-3 weeks for all endpoints

---

Ready to start building? Begin with Priority 1 endpoints! 🚀

