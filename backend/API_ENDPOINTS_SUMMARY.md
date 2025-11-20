# 1000 Bananas API - Complete Endpoint Summary

Complete reference for all API endpoints in the 1000 Bananas system.

## Base URL
`https://your-api-gateway-url/prod`

---

## Selection Module Endpoints

### 1. Get All Products (Selection View)
- **Endpoint:** `GET /selection`
- **Description:** List all products for selection dashboard, grouped by product name
- **Returns:** Products with status, account, brand, product name, search volume, action type, variations

### 2. Create Product
- **Endpoint:** `POST /selection`
- **Description:** Create new product in catalog
- **Body:**
  ```json
  {
    "product": "Product Name",
    "account": "TPS Nutrients",
    "brand": "TPS Plant Foods",
    "status": "active",
    "searchVol": 1000,
    "actionType": "launch",
    "templateId": "template-1"
  }
  ```

### 3. Update Product
- **Endpoint:** `PUT /selection/{id}`
- **Description:** Update product in selection
- **Body:** Same as create

### 4. Delete Product
- **Endpoint:** `DELETE /selection/{id}`
- **Description:** Delete product from catalog

### 5. Launch Product
- **Endpoint:** `PATCH /selection/{id}/launch`
- **Description:** Mark product as launched (moves to development/listing)

---

## Development Module Endpoints

### 6. Get Development Dashboard
- **Endpoint:** `GET /products/development`
- **Description:** List all products with section statuses for development view
- **Sections:** Essential Info, Formula/Form, Design, Listing, Production, Pack/Packaging, Labels, Ads/Marketing
- **Returns:** Products with completion status for each section

---

## Listing Module Endpoints (NEW)

### 7. Get Listing Dashboard
- **Endpoint:** `GET /products/listing`
- **Description:** List all products with section statuses for listing view
- **Sections:** Essential Info, Slides, A+ Content, Finished Goods, PDP Setup, Vine
- **Returns:** Products with completion status for each section

### 8. Get Product Details (Listing)
- **Endpoint:** `GET /products/listing/{id}`
- **Description:** Get complete product details organized by tabs
- **Returns:** Structured data for all tabs: essentialInfo, slides, aplus, finishedGoods, pdpSetup, vine, variations

### 9. Update Product Details (Listing)
- **Endpoint:** `PUT /products/listing/{id}`
- **Description:** Update any product details across all listing tabs
- **Body:** Partial updates supported - send only fields to change

---

## Catalog Endpoints

### 10. Get Catalog Product by ID
- **Endpoint:** `GET /products/catalog/{id}`
- **Description:** Get single product with all variations
- **Returns:** Full product data plus all variations array

### 11. Update Catalog Product (Full)
- **Endpoint:** `PUT /products/catalog/{id}`
- **Description:** Update full catalog product details
- **Note:** Marks product as "launched" in notes

---

## Quick Reference Table

| Method | Endpoint | Module | Purpose |
|--------|----------|--------|---------|
| GET | `/selection` | Selection | List products for selection |
| POST | `/selection` | Selection | Create new product |
| PUT | `/selection/{id}` | Selection | Update product |
| DELETE | `/selection/{id}` | Selection | Delete product |
| PATCH | `/selection/{id}/launch` | Selection | Launch product |
| GET | `/products/development` | Development | Development dashboard |
| GET | `/products/listing` | **Listing** | **Listing dashboard** |
| GET | `/products/listing/{id}` | **Listing** | **Product details** |
| PUT | `/products/listing/{id}` | **Listing** | **Update product** |
| GET | `/products/catalog/{id}` | Catalog | Get product by ID |
| PUT | `/products/catalog/{id}` | Catalog | Update product |
| OPTIONS | `*` | All | CORS preflight |

---

## Response Format

All endpoints return responses in this format:

### Success Response
```json
{
  "success": true,
  "data": { /* response data */ },
  "count": 10  // Optional: for list endpoints
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "traceback": "Stack trace (dev only)"
}
```

---

## Status Codes

- `200` - Success
- `201` - Created (POST requests)
- `400` - Bad Request (validation errors)
- `404` - Not Found
- `500` - Internal Server Error

---

## CORS Configuration

All endpoints support CORS with the following headers:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Headers: Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token`
- `Access-Control-Allow-Methods: GET,POST,PUT,DELETE,PATCH,OPTIONS`

---

## Authentication

Currently, the API does not require authentication. For production deployment, consider adding:
- API Keys
- JWT tokens
- AWS Cognito
- IAM authorization

---

## Module Flow

```
1. SELECTION → Create/Select products
   ↓
2. DEVELOPMENT → Complete all development sections
   ↓
3. LISTING → Prepare listing materials & PDP content
   ↓
4. LAUNCH → Product goes live on Amazon
```

---

## Database Schema

### Main Tables
- **catalog** - Main product catalog
- **formula** - Product formulas
- **bottle** - Packaging/bottles
- **finished_goods** - Finished goods data
- **brand** - Brand information
- **kit** - Product kits
- **bag** - Bag packaging
- **closure** - Closure types

### Key Relationships
- Products can have multiple variations (by size)
- Products reference formulas by `formula_name`
- Products reference bottles by `packaging_name`
- Finished goods link to products by `child_asin`

---

## Testing Endpoints

### Using cURL

```bash
# Get listing products
curl https://your-api-url/prod/products/listing

# Get product details
curl https://your-api-url/prod/products/listing/1

# Update product
curl -X PUT https://your-api-url/prod/products/listing/1 \
  -H "Content-Type: application/json" \
  -d '{"title": "New Product Title", "vineEnrolled": true}'

# Create product
curl -X POST https://your-api-url/prod/selection \
  -H "Content-Type: application/json" \
  -d '{"product": "Test Product", "status": "active"}'
```

### Using Postman

1. Import the collection (if available)
2. Set base URL as environment variable
3. All endpoints return JSON
4. No auth required (currently)

---

## Notes

1. **Product Grouping**: Products are grouped by `product_name` across all list endpoints
2. **Variations**: Each size of a product is stored as a separate row but displayed as variations
3. **Status Calculation**: Status fields (completed/inProgress/pending) are calculated dynamically based on field completion
4. **JSONB Fields**: The `notes` field stores flexible JSON data for module-specific information
5. **Timestamps**: All records have `created_at` and `updated_at` timestamps (ISO 8601 format)

---

## Future Enhancements

Potential additions:
- [ ] Batch operations (bulk update/delete)
- [ ] Search and filtering
- [ ] Pagination for large datasets
- [ ] File upload endpoints for images
- [ ] Webhook notifications
- [ ] Export to CSV/Excel
- [ ] Analytics endpoints
- [ ] User activity logging

---

## Support

For questions or issues:
- Check the detailed documentation files for each module
- Review the Lambda function code
- Test endpoints using the examples provided



