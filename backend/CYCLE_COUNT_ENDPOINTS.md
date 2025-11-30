# 🔧 Cycle Count Endpoints to Add to API Gateway

## API Gateway Info
**Base URL:** `https://sl2r0ip8zl.execute-api.ap-southeast-2.amazonaws.com`  
**Lambda Function:** `bananas-supply-chain-api`

---

## 📋 Add These 5 Routes

### 1. GET /supply-chain/labels/cycle-counts
```
Method: GET
Path: /supply-chain/labels/cycle-counts
Integration: Lambda Proxy
Lambda: bananas-supply-chain-api
```
**Purpose:** List all cycle counts

---

### 2. GET /supply-chain/labels/cycle-counts/{id}
```
Method: GET
Path: /supply-chain/labels/cycle-counts/{id}
Integration: Lambda Proxy
Lambda: bananas-supply-chain-api
Path Parameter: id
```
**Purpose:** Get single cycle count with lines  
**⚠️ NEW - This may not exist yet!**

---

### 3. POST /supply-chain/labels/cycle-counts
```
Method: POST
Path: /supply-chain/labels/cycle-counts
Integration: Lambda Proxy
Lambda: bananas-supply-chain-api
```
**Purpose:** Create new cycle count

---

### 4. PUT /supply-chain/labels/cycle-counts/{id}
```
Method: PUT
Path: /supply-chain/labels/cycle-counts/{id}
Integration: Lambda Proxy
Lambda: bananas-supply-chain-api
Path Parameter: id
```
**Purpose:** Update cycle count (with lines)

---

### 5. POST /supply-chain/labels/cycle-counts/{id}/complete
```
Method: POST
Path: /supply-chain/labels/cycle-counts/{id}/complete
Integration: Lambda Proxy
Lambda: bananas-supply-chain-api
Path Parameter: id
```
**Purpose:** Complete count and update inventory  
**⚠️ Special route with /complete suffix!**

---

## 🧪 Quick Test

After adding routes:

```bash
# Test list
curl https://sl2r0ip8zl.execute-api.ap-southeast-2.amazonaws.com/supply-chain/labels/cycle-counts

# Expected: {"success": true, "data": []}
```

---

## 📦 Lambda Deployment

**Since you have psycopg2 layer, just zip the function:**

```powershell
# In backend/lambda directory:
Compress-Archive -Path lambda_function.py -DestinationPath lambda_deploy.zip -Force
```

Then upload `lambda_deploy.zip` to AWS Lambda console.

**Or even simpler - just upload the .py file directly in Lambda console!**

---

## ✅ Done!

Once API Gateway routes are added and Lambda is deployed:
- Frontend cycle counts will work
- Orders will update inventory when received
- All 16 endpoints working

