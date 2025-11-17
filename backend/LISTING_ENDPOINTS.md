# Listing Module API Endpoints

This document describes the API endpoints for the Listing Dashboard module.

## Base URL
`https://your-api-gateway-url/prod`

---

## Endpoints

### 1. Get Listing Dashboard Products

**Endpoint:** `GET /products/listing`

**Description:** Retrieves all products for the listing dashboard with completion status for each section.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "account": "TPS Nutrients",
      "brand": "TPS Plant Foods",
      "product": "African Violet Fertilizer",
      "essentialInfo": "completed",
      "slides": "inProgress",
      "aplus": "completed",
      "finishedGoods": "completed",
      "pdpSetup": "pending",
      "vine": "completed",
      "createdAt": "2023-07-01T00:00:00.000Z",
      "updatedAt": "2024-11-17T10:23:00.000Z"
    }
  ],
  "count": 1
}
```

**Status Values:**
- `completed` - All required fields are filled
- `inProgress` - Some fields are filled
- `pending` - No fields are filled

**Section Requirements:**
- **Essential Info**: marketplace, country, brand, product, type, parent ASIN, child ASIN (6/7 required)
- **Slides**: All 6 sided images required (front, back, left, right, top, bottom)
- **A+ Content**: 3 out of 4 modules required
- **Finished Goods**: packaging, closure, label size, case size, units per case (4/5 required)
- **PDP Setup**: title, bullets, description, search terms (3/4 required)
- **Vine**: vineEnrolled flag in notes field

---

### 2. Get Product Details

**Endpoint:** `GET /products/listing/{id}`

**Description:** Retrieves detailed product information organized by tabs for the product detail view.

**Path Parameters:**
- `id` (integer, required) - Product ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "productName": "African Violet Fertilizer",
    "brandName": "TPS Plant Foods",
    "sellerAccount": "TPS Nutrients",
    
    "essentialInfo": {
      "marketplace": "Amazon",
      "country": "US",
      "brandName": "TPS Plant Foods",
      "productName": "African Violet Fertilizer",
      "size": "Gallon",
      "type": "Liquid",
      "formulaName": "TPS Growth Formula",
      "parentAsin": "B0C73SWQ79",
      "childAsin": "B0C73TDLPX",
      "parentSku": "TPS-AFRICANVIOLET-PARENT",
      "childSku": "AFVIOLET1G-FBA-UPC-0523",
      "upc": "850048592735"
    },
    
    "slides": {
      "productImage": "https://drive.google.com/...",
      "front": "https://drive.google.com/...",
      "back": "https://drive.google.com/...",
      "left": "https://drive.google.com/...",
      "right": "https://drive.google.com/...",
      "top": "https://drive.google.com/...",
      "bottom": "https://drive.google.com/..."
    },
    
    "aplus": {
      "module1": "Module 1 content/URL",
      "module2": "Module 2 content/URL",
      "module3": "Module 3 content/URL",
      "module4": "Module 4 content/URL"
    },
    
    "finishedGoods": {
      "packagingName": "Gallon Standard Handle Bottle",
      "closureName": "Berry Unvented Cap",
      "labelSize": "4x6",
      "labelLocation": "LBL-PLANT-494",
      "caseSize": "12x12x12",
      "unitsPerCase": 4,
      "productDimensions": {
        "length": 10.5,
        "width": 6.5,
        "height": 12.0,
        "weight": 9.2
      },
      "unitsSold30Days": 450,
      "formula": {
        "guaranteedAnalysis": "NPK 4-3-3",
        "npk": "4-3-3",
        "derivedFrom": "Potassium Nitrate, Ammonium Phosphate",
        "msds": "https://link-to-msds.pdf"
      }
    },
    
    "pdpSetup": {
      "title": "TPS Plant Foods African Violet Fertilizer - 1 Gallon",
      "bullets": "• Specially formulated...\n• Promotes blooming...",
      "description": "Long product description...",
      "searchTerms": "african violet fertilizer, indoor plant food",
      "coreKeywords": "african violet, fertilizer, plant food",
      "otherKeywords": "indoor plants, blooming plants",
      "coreCompetitorAsins": "B001234567, B007654321",
      "otherCompetitorAsins": "B009876543"
    },
    
    "vine": {
      "vineEnrolled": true,
      "vineNotes": "Enrolled on 2024-01-15. 50 units sent.",
      "vineDate": "2024-01-15"
    },
    
    "variations": [
      {
        "id": 1,
        "size": "Gallon",
        "packagingName": "Gallon Standard Handle Bottle",
        "closureName": "Berry Unvented Cap",
        "labelSize": "4x6",
        "parentAsin": "B0C73SWQ79",
        "childAsin": "B0C73TDLPX",
        "parentSku": "TPS-AFRICANVIOLET-PARENT",
        "childSku": "AFVIOLET1G-FBA-UPC-0523",
        "upc": "850048592735",
        "price": 24.99,
        "labelLocation": "LBL-PLANT-494",
        "caseSize": "12x12x12",
        "unitsPerCase": 4,
        "productDimensionsLength": 10.5,
        "productDimensionsWidth": 6.5,
        "productDimensionsHeight": 12.0,
        "productDimensionsWeight": 9.2
      }
    ],
    
    "createdAt": "2023-07-01T00:00:00.000Z",
    "updatedAt": "2024-11-17T10:23:00.000Z"
  }
}
```

**Error Responses:**
```json
{
  "success": false,
  "error": "Product not found"
}
```

---

### 3. Update Product Details

**Endpoint:** `PUT /products/listing/{id}`

**Description:** Updates product details for any of the listing tabs.

**Path Parameters:**
- `id` (integer, required) - Product ID

**Request Body:**
You can send any combination of the following fields to update:

```json
{
  // Essential Info
  "marketplace": "Amazon",
  "country": "US",
  "brandName": "TPS Plant Foods",
  "productName": "African Violet Fertilizer",
  "size": "Gallon",
  "type": "Liquid",
  "formulaName": "TPS Growth Formula",
  "parentAsin": "B0C73SWQ79",
  "childAsin": "B0C73TDLPX",
  "parentSku": "TPS-AFRICANVIOLET-PARENT",
  "childSku": "AFVIOLET1G-FBA-UPC-0523",
  "upc": "850048592735",
  
  // Slides
  "productImage": "https://drive.google.com/...",
  "sixSidedFront": "https://drive.google.com/...",
  "sixSidedBack": "https://drive.google.com/...",
  "sixSidedLeft": "https://drive.google.com/...",
  "sixSidedRight": "https://drive.google.com/...",
  "sixSidedTop": "https://drive.google.com/...",
  "sixSidedBottom": "https://drive.google.com/...",
  
  // A+ Content
  "aplusModule1": "Module 1 content",
  "aplusModule2": "Module 2 content",
  "aplusModule3": "Module 3 content",
  "aplusModule4": "Module 4 content",
  
  // Finished Goods
  "packagingName": "Gallon Standard Handle Bottle",
  "closureName": "Berry Unvented Cap",
  "labelSize": "4x6",
  "labelLocation": "LBL-PLANT-494",
  "caseSize": "12x12x12",
  "unitsPerCase": 4,
  "productDimensionsLength": 10.5,
  "productDimensionsWidth": 6.5,
  "productDimensionsHeight": 12.0,
  "productDimensionsWeight": 9.2,
  
  // PDP Setup
  "title": "Product title",
  "bullets": "Bullet points",
  "description": "Product description",
  "searchTerms": "search terms",
  "coreKeywords": "keywords",
  "otherKeywords": "other keywords",
  "coreCompetitorAsins": "ASIN1, ASIN2",
  "otherCompetitorAsins": "ASIN3",
  
  // Vine
  "vineEnrolled": true,
  "vineDate": "2024-01-15"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Product updated successfully",
  "data": {
    "id": 1,
    "productName": "African Violet Fertilizer",
    "brandName": "TPS Plant Foods",
    "sellerAccount": "TPS Nutrients",
    "updatedAt": "2024-11-17T10:23:00.000Z"
  }
}
```

**Error Responses:**
```json
{
  "success": false,
  "error": "Product not found"
}
```

```json
{
  "success": false,
  "error": "No fields to update"
}
```

---

## Usage Example

### JavaScript/React Example

```javascript
// Fetch listing dashboard products
const fetchListingProducts = async () => {
  const response = await fetch('https://your-api-url/prod/products/listing');
  const data = await response.json();
  return data.data;
};

// Get product details
const fetchProductDetail = async (productId) => {
  const response = await fetch(`https://your-api-url/prod/products/listing/${productId}`);
  const data = await response.json();
  return data.data;
};

// Update product
const updateProduct = async (productId, updates) => {
  const response = await fetch(`https://your-api-url/prod/products/listing/${productId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates)
  });
  const data = await response.json();
  return data;
};

// Example: Update slides for a product
await updateProduct(1, {
  sixSidedFront: 'https://new-image-url.com/front.jpg',
  sixSidedBack: 'https://new-image-url.com/back.jpg'
});

// Example: Mark product as vine enrolled
await updateProduct(1, {
  vineEnrolled: true,
  vineDate: '2024-11-17'
});
```

---

## Database Tables Used

- **catalog** - Main product catalog table
- **formula** - Formula details (joined for finished goods specs)
- **bottle** - Packaging details (joined for finished goods specs)
- **finished_goods** - Additional finished goods data (joined for finished goods specs)

---

## Notes

1. **Status Calculation**: Status for each section is automatically calculated based on how many required fields are filled.

2. **Grouping**: Products are grouped by `product_name` to combine variations.

3. **Variations**: All variations of a product (different sizes) are returned in the `variations` array.

4. **Vine Data**: Vine enrollment status is stored in the `notes` JSONB field as `vineEnrolled` and `vineDate`.

5. **Partial Updates**: The PUT endpoint supports partial updates - you only need to send the fields you want to change.

6. **CORS**: All endpoints support CORS with wildcard origin (`*`) for development purposes.

