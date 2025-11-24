# 🚀 API Endpoints - Quick Reference

## Priority 1: Core Endpoints (Build First)

| # | Method | Endpoint | Purpose |
|---|--------|----------|---------|
| 1 | GET | `/production/formula-inventory` | List all formulas with inventory |
| 2 | GET | `/production/formula-inventory/{formula_name}` | Get specific formula details |
| 3 | PUT | `/production/formula-inventory/{formula_name}` | Update formula quantities |
| 4 | GET | `/production/formulas` | Get formulas grouped with products |
| 5 | GET | `/production/planning` | Planning dashboard with N-GOOS DOI |
| 6 | POST | `/production/shipments` | Create new shipment |
| 7 | GET | `/production/shipments` | List all shipments |
| 8 | GET | `/production/shipments/{id}` | Get shipment details |
| 9 | POST | `/production/shipments/{id}/products` | Add product to shipment |

**Total: 9 endpoints** ⭐

---

## Priority 2: Important Endpoints

| # | Method | Endpoint | Purpose |
|---|--------|----------|---------|
| 10 | DELETE | `/production/shipments/{id}/products/{product_id}` | Remove product |
| 11 | PUT | `/production/shipments/{id}/products/{product_id}` | Update quantity |
| 12 | GET | `/production/shipments/{id}/banana-prep` | Get workflow progress |
| 13 | POST | `/production/shipments/{id}/banana-prep/step/{step}` | Mark step complete |
| 14 | GET | `/production/banana-prep/steps` | Get workflow definitions |
| 15 | POST | `/production/shipments/{id}/allocate-formula` | Allocate formulas |
| 16 | POST | `/production/shipments/{id}/release-formula` | Release allocations |
| 17 | PUT | `/production/shipments/{id}` | Update shipment |
| 18 | DELETE | `/production/shipments/{id}` | Delete shipment |

**Total: 9 endpoints** 📦

---

## Priority 3: Nice to Have

| # | Method | Endpoint | Purpose |
|---|--------|----------|---------|
| 19 | GET | `/production/label-inventory` | List label inventory |
| 20 | PUT | `/production/label-inventory/{label_size}` | Update label quantities |
| 21 | GET | `/production/reports/formula-usage` | Formula usage report |

**Total: 3 endpoints** ✨

---

## 🎯 Implementation Sprint Plan

### Sprint 1 (Week 1): Foundation
```
Day 1-2: Formula Inventory (endpoints #1, #2, #3)
Day 3:   Formula Grouping (endpoint #4)
Day 4:   Planning Dashboard (endpoint #5)
Day 5:   Shipment CRUD (endpoints #6, #7, #8, #9)
```

### Sprint 2 (Week 2): Workflow
```
Day 1:   Banana Prep endpoints (#12, #13, #14)
Day 2:   Formula Allocation (#15, #16)
Day 3:   Update/Delete operations (#10, #11, #17, #18)
Day 4:   Testing & Bug Fixes
Day 5:   Integration with Frontend
```

### Sprint 3 (Week 3): Polish
```
Day 1:   Label Inventory (#19, #20)
Day 2:   Reports (#21)
Day 3:   Performance optimization
Day 4:   Documentation
Day 5:   Deployment to Production
```

---

## 🔧 API Gateway Setup

### Create Resources:
1. `/production` (base)
2. `/production/formula-inventory`
3. `/production/formula-inventory/{formula_name}`
4. `/production/formulas`
5. `/production/planning`
6. `/production/shipments`
7. `/production/shipments/{id}`
8. `/production/shipments/{id}/products`
9. `/production/shipments/{id}/products/{product_id}`
10. `/production/shipments/{id}/banana-prep`
11. `/production/shipments/{id}/banana-prep/step/{step_number}`
12. `/production/shipments/{id}/allocate-formula`
13. `/production/shipments/{id}/release-formula`
14. `/production/banana-prep/steps`
15. `/production/label-inventory`
16. `/production/label-inventory/{label_size}`

### For Each Resource:
- ✅ Enable CORS
- ✅ Add OPTIONS method
- ✅ Add relevant HTTP methods (GET, POST, PUT, DELETE)
- ✅ Set Lambda Proxy Integration
- ✅ Deploy to stage

---

## 📝 Lambda Handler Pattern

```python
def lambda_handler(event, context):
    method = event['httpMethod']
    path = event['path']
    
    # Route to appropriate handler
    if method == 'GET':
        if path == '/production/formula-inventory':
            return get_formula_inventory(event)
        elif path.startswith('/production/formula-inventory/'):
            formula_name = path.split('/')[-1]
            return get_formula_detail(formula_name)
        # ... etc
    
    elif method == 'POST':
        if path == '/production/shipments':
            return create_shipment(event)
        # ... etc
    
    return {
        'statusCode': 404,
        'body': json.dumps({'error': 'Not Found'})
    }
```

---

## 🧪 Testing Commands

```bash
# Test Formula Inventory
curl https://your-api.com/prod/production/formula-inventory

# Test Specific Formula
curl https://your-api.com/prod/production/formula-inventory/F.10-10-10

# Test Planning Dashboard
curl https://your-api.com/prod/production/planning?view=sellables

# Create Shipment
curl -X POST https://your-api.com/prod/production/shipments \
  -H "Content-Type: application/json" \
  -d '{"shipment_number":"TEST-001","shipment_date":"2025-11-20"}'

# Add Product to Shipment
curl -X POST https://your-api.com/prod/production/shipments/1/products \
  -H "Content-Type: application/json" \
  -d '{"product_id":1,"quantity":240}'
```

---

## 📊 Expected Response Format

All endpoints return:

### Success:
```json
{
  "success": true,
  "data": { ... },
  "count": 10  // Optional for list endpoints
}
```

### Error:
```json
{
  "success": false,
  "error": "Error message",
  "traceback": "..." // Only in development
}
```

---

## ✅ Checklist for Each Endpoint

When implementing each endpoint:

- [ ] Lambda function handler created
- [ ] API Gateway resource created
- [ ] Method added (GET/POST/PUT/DELETE)
- [ ] Lambda integration configured
- [ ] CORS enabled
- [ ] OPTIONS method added
- [ ] Tested with Postman
- [ ] Error handling implemented
- [ ] Response format validated
- [ ] Documented in code
- [ ] Deployed to stage

---

**Grand Total: 21 endpoints**  
**Start with: 9 Priority 1 endpoints**  
**Estimated Time: 2-3 weeks for all**

---

See `API_GATEWAY_ENDPOINTS.md` for complete details! 🍌

