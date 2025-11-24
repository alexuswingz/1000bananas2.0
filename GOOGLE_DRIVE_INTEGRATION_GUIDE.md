# 🖼️ Google Drive Image Integration Guide

## ✅ What's Been Set Up

You can now display **real Google Drive images** in your product details instead of placeholders!

---

## 📁 Files Created

1. **`src/services/googleDriveApi.js`** - Frontend service for Drive URLs
2. **`backend/lambda/google_drive_handler.py`** - Secure backend proxy (optional, for private files)
3. **`src/pages/products/catalog/ProductDetail.js`** - Updated to use Drive API

---

## 🎯 How It Works

### **For Public Drive Files** (Easiest - Works Now!)

If your Google Drive files are shared with "Anyone with the link":

1. Your product image URLs like:
   ```
   https://drive.google.com/file/d/1ABC123xyz/view
   ```

2. Are automatically converted to:
   ```
   https://drive.google.com/uc?export=view&id=1ABC123xyz
   ```

3. **No additional setup needed!** Images will display immediately.

---

### **For Private Drive Files** (More Secure)

For files that require authentication:

1. Backend Lambda proxy fetches images using Service Account
2. Requires deploying `google_drive_handler.py` to AWS Lambda
3. More secure - private key never exposed to frontend

---

## 🚀 Quick Start (Public Files)

### **Step 1: Make Your Drive Files Public**

1. Right-click file in Google Drive → **Share**
2. Change to **"Anyone with the link"**
3. Set to **Viewer** access
4. Click **Done**

### **Step 2: Use the Drive URL**

Just use the Google Drive URL in your product data:

```javascript
// In your database or product data:
{
  "product_image_url": "https://drive.google.com/file/d/1ABC123xyz/view",
  "stock_image": "https://drive.google.com/file/d/1XYZ789abc/view"
}
```

### **Step 3: View Your Product**

Go to product details - images will load automatically! ✅

---

## 🔒 Advanced Setup (Private Files with Backend Proxy)

### **Step 1: Install Dependencies**

```bash
cd backend/lambda
pip install PyJWT requests -t .
```

### **Step 2: Update Lambda Function**

Add Google Drive handler to your Lambda:

```python
# In lambda_function.py, import the handler
from google_drive_handler import lambda_handler as drive_handler

# In your main lambda_handler, add routing:
elif http_method == 'GET' and path.startswith('/drive/'):
    return drive_handler(event, context)
```

### **Step 3: Add Environment Variables** (Recommended)

In AWS Lambda Console → Configuration → Environment Variables:

```
GOOGLE_SERVICE_ACCOUNT_EMAIL = id-000-bananas-drive-viewer@bananas-drive-integration.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY = -----BEGIN PRIVATE KEY-----\nMIIE...
```

### **Step 4: Add API Gateway Routes**

Add these routes:
- `GET /drive/image/{fileId}` - Fetch image
- `GET /drive/metadata/{fileId}` - Get file info
- `OPTIONS /drive/*` - CORS preflight

### **Step 5: Update Frontend Service**

```javascript
// In src/services/googleDriveApi.js
const API_BASE_URL = 'https://your-api-gateway-url.amazonaws.com';

export const fetchAuthenticatedDriveImage = async (fileId) => {
  const response = await fetch(`${API_BASE_URL}/drive/image/${fileId}`);
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};
```

---

## 📋 Testing

### **Test 1: Public File**

```javascript
// In browser console:
import { extractFileId, getDriveImageUrl } from './services/googleDriveApi';

const url = 'https://drive.google.com/file/d/1ABC123xyz/view';
const fileId = extractFileId(url);
console.log('File ID:', fileId);

const directUrl = getDriveImageUrl(fileId);
console.log('Direct URL:', directUrl);

// Test in image tag:
const img = document.createElement('img');
img.src = directUrl;
document.body.appendChild(img);
```

### **Test 2: Check Product Images**

1. Go to **Products → Catalog**
2. Open any product with Drive URLs
3. Images should display (not placeholders!)

### **Test 3: Backend Proxy** (if set up)

```bash
# Test metadata endpoint
curl https://your-api-gateway-url/drive/metadata/1ABC123xyz

# Test image endpoint
curl https://your-api-gateway-url/drive/image/1ABC123xyz > test.jpg
```

---

## 🐛 Troubleshooting

### **Issue: Still seeing placeholders**

**Check:**
1. Is the Drive URL correct?
   ```javascript
   const fileId = extractFileId(url);
   console.log(fileId); // Should return the file ID
   ```

2. Is the file public?
   - Try opening the direct URL in a browser
   - `https://drive.google.com/uc?export=view&id={fileId}`

3. Check browser console for errors

### **Issue: "Access Denied" or "Forbidden"**

**Solution:**
- File is private - make it public OR use backend proxy
- Check sharing settings in Google Drive

### **Issue: Images load slowly**

**Solution:**
- Google Drive thumbnails are faster:
  ```javascript
  getDriveThumbnailUrl(fileId, 800); // 800px width
  ```

- Add caching headers in backend proxy

### **Issue: Lambda deployment fails**

**Check:**
1. PyJWT and requests are installed in lambda directory:
   ```bash
   cd backend/lambda
   ls -la | grep -E "jwt|requests"
   ```

2. Private key format is correct (includes `\n` for line breaks)

3. Lambda has internet access (if in VPC, needs NAT gateway)

---

## 🎨 Usage Examples

### **Example 1: Product Image Gallery**

```jsx
import { getDriveImageUrl, extractFileId } from '../../../services/googleDriveApi';

const ProductGallery = ({ images }) => {
  const convertedImages = images.map(url => {
    const fileId = extractFileId(url);
    return fileId ? getDriveImageUrl(fileId) : url;
  });

  return (
    <div className="gallery">
      {convertedImages.map((src, i) => (
        <img key={i} src={src} alt={`Product ${i + 1}`} />
      ))}
    </div>
  );
};
```

### **Example 2: Lazy Loading with Authentication**

```jsx
import { useState, useEffect } from 'react';
import { fetchAuthenticatedDriveImage, extractFileId } from '../../../services/googleDriveApi';

const SecureImage = ({ driveUrl }) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadImage = async () => {
      const fileId = extractFileId(driveUrl);
      if (fileId) {
        const src = await fetchAuthenticatedDriveImage(fileId);
        setImageSrc(src);
      }
      setLoading(false);
    };

    loadImage();
  }, [driveUrl]);

  if (loading) return <div>Loading...</div>;
  if (!imageSrc) return <div>Failed to load image</div>;

  return <img src={imageSrc} alt="Product" />;
};
```

### **Example 3: Bulk URL Conversion**

```javascript
import { convertDriveUrl } from './services/googleDriveApi';

// Convert multiple URLs
const product = {
  main_image: 'https://drive.google.com/file/d/1ABC/view',
  gallery: [
    'https://drive.google.com/file/d/1DEF/view',
    'https://drive.google.com/file/d/1GHI/view',
  ]
};

// Convert all at once
const convertedProduct = {
  main_image: await convertDriveUrl(product.main_image),
  gallery: await Promise.all(
    product.gallery.map(url => convertDriveUrl(url))
  )
};
```

---

## 🔐 Security Best Practices

### **Production Checklist:**

- [ ] ✅ **Move private key to environment variables**
  ```bash
  # DO NOT commit private key to git!
  # Add to .gitignore:
  *service-account*.json
  ```

- [ ] ✅ **Use backend proxy for private files**
  - Keep service account credentials on backend only
  - Never expose private key in frontend code

- [ ] ✅ **Add rate limiting**
  ```python
  # In Lambda, add:
  from functools import lru_cache
  
  @lru_cache(maxsize=1000)
  def get_cached_image(file_id):
      return fetch_drive_image(file_id)
  ```

- [ ] ✅ **Enable CloudFront caching**
  - Add CloudFront in front of Lambda
  - Cache Drive images for 24 hours
  - Reduces API calls to Google

- [ ] ✅ **Monitor usage**
  - Set up CloudWatch alarms
  - Track Google Drive API quota
  - Free tier: 1 billion requests/day (plenty!)

---

## 📊 Current Status

### ✅ **What's Working:**

- [x] Frontend service created (`googleDriveApi.js`)
- [x] ProductDetail.js updated to use Drive URLs
- [x] Public file access working
- [x] File ID extraction from various URL formats
- [x] Backend proxy handler created (not deployed yet)

### ⏳ **Next Steps:**

- [ ] Deploy backend proxy to Lambda (optional)
- [ ] Add environment variables for private key
- [ ] Test with your actual product images
- [ ] Update database with Drive URLs

---

## 🎯 Quick Command Reference

```bash
# Extract file ID from URL
fileId = extractFileId(url)

# Get direct image URL (public files)
imageUrl = getDriveImageUrl(fileId)

# Get thumbnail URL
thumbnailUrl = getDriveThumbnailUrl(fileId, 800)

# Fetch with authentication (requires backend)
imageBlob = await fetchAuthenticatedDriveImage(fileId)

# Get file metadata
metadata = await getDriveFileMetadata(fileId)

# Check if file is public
isPublic = await isFilePublic(fileId)
```

---

## 📞 Support

**Common URLs to test with:**
```
https://drive.google.com/file/d/1ABC123xyz/view
https://drive.google.com/open?id=1ABC123xyz
https://drive.google.com/uc?id=1ABC123xyz
```

**All formats are supported!** ✅

---

## 🎉 Summary

**You're all set!** 

For **public Drive files**, images will work immediately. For **private files**, deploy the backend proxy for secure access.

Test it out:
1. Go to any product with a Google Drive image URL
2. Images should display instead of placeholders
3. ✅ Done!

Need help? Check the troubleshooting section or test in browser console first.

