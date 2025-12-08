# Missing API Gateway Route

## ❌ Issue Found

The `/production/products/inventory` endpoint returns **404 Not Found**.

This endpoint is implemented in Lambda but **not configured in API Gateway**.

---

## ✅ Solution

Add this route to API Gateway:

### **Route Configuration:**

```
Method:      GET
Path:        /production/products/inventory
Integration: Lambda Function (same as other /production routes)
CORS:        Enabled
Timeout:     29 seconds (default)
```

### **Steps to Add:**

1. Open **AWS API Gateway Console**
2. Select your API (the one with existing `/production` routes)
3. Click **"Create Resource"** or **"Create Route"** (depending on API type)
4. Set path: `/production/products/inventory`
5. Add **GET** method
6. Set integration to your Lambda function
7. **Enable CORS**
8. **Deploy API** to your stage

---

## 🧪 Test After Adding

```bash
curl https://sl2r0ip8zl.execute-api.ap-southeast-2.amazonaws.com/production/products/inventory
```

Should return:
```json
{
  "success": true,
  "data": [
    {
      "id": 378,
      "child_asin": "B0FKMDVCG3",
      "product_name": "Cherry Tree Fertilizer",
      "size": "Gallon",
      "bottle_name": "Gallon Standard Handle Bottle",
      "bottle_inventory": 3000,
      "closure_name": "Berry Unvented Cap",
      "closure_inventory": 5000,
      "label_location": "LBL-PLANT-522",
      "label_inventory": 204,
      "formula_name": "F.Ultra Grow",
      "formula_gallons_available": 100.00,
      "max_units_producible": 100
    },
    ...more products...
  ]
}
```

---

## 📊 What This Fixes

**Before (without route):**
- ❌ API returns 404
- ❌ Frontend gets no supply chain data
- ❌ All inventory shows 0
- ❌ Max units = 0 for all products
- ❌ Warnings show for any quantity > 0

**After (with route):**
- ✅ API returns product inventory
- ✅ Frontend merges supply chain data
- ✅ Real inventory levels displayed
- ✅ Accurate max units calculation
- ✅ Warnings only when qty exceeds available

---

## 🎯 Expected Result

**Cherry Tree Fertilizer (8oz):**
```
Supply Chain:
• Bottles: 5,000 units
• Closures: 5,000 units
• Labels: 859 units ← Bottleneck
• Formula: 100 gal (1,600 units)

Max Producible: 859 units

If requesting 1000 units:
⚠️ Warning: Requested 1000, Max available 859
Bottleneck: Labels
```

---

## ⚡ Quick Add (if using REST API)

In API Gateway Console:
1. Resources → `/production` → Create Resource
2. Resource Name: `products`
3. Resource Path: `products`
4. Create
5. `/products` → Create Resource  
6. Resource Name: `inventory`
7. Resource Path: `inventory`
8. Create
9. `/inventory` → Create Method → `GET`
10. Lambda Function: [your-production-lambda]
11. Enable CORS
12. Deploy API

---

## 📝 Notes

- Lambda function already has the `get_products_inventory()` handler
- Lambda routing already includes the path check
- Just needs the API Gateway route
- Don't forget to deploy after adding the route!






