const express = require('express');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// SP-API Configuration
const SP_API_CONFIG = {
  clientId: process.env.SP_API_CLIENT_ID,
  clientSecret: process.env.SP_API_CLIENT_SECRET,
  refreshToken: process.env.SP_API_REFRESH_TOKEN,
  region: 'na', // North America
  marketplaceId: 'ATVPDKIKX0DER', // US Marketplace
  endpoint: 'https://sellingpartnerapi-na.amazon.com'
};

// AWS Credentials (needed for signing requests)
const AWS_CONFIG = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  region: 'us-east-1'
};

let accessToken = null;
let tokenExpiry = null;

// Get LWA Access Token
async function getAccessToken() {
  // Return cached token if still valid
  if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
    return accessToken;
  }

  try {
    console.log('🔑 Requesting new SP-API access token...');
    
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: SP_API_CONFIG.refreshToken,
      client_id: SP_API_CONFIG.clientId,
      client_secret: SP_API_CONFIG.clientSecret
    });

    const response = await axios.post(
      'https://api.amazon.com/auth/o2/token',
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    accessToken = response.data.access_token;
    tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000; // Refresh 1 min early
    
    console.log('✅ Access token obtained successfully');
    return accessToken;
  } catch (error) {
    console.error('❌ Error getting access token:', error.response?.data || error.message);
    throw new Error('Failed to get SP-API access token');
  }
}

// AWS Signature V4 - Simplified version for SP-API
function signRequest(method, path, queryParams = {}, body = '') {
  const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const date = timestamp.substr(0, 8);
  
  // For now, we'll use x-amz-access-token which doesn't require AWS signing
  // If AWS credentials are needed later, full signature implementation would go here
  return {};
}

// Fetch Products from SP-API (Catalog Items API)
async function fetchCatalogItems(nextToken = null) {
  try {
    const token = await getAccessToken();
    
    const params = {
      marketplaceIds: SP_API_CONFIG.marketplaceId,
      includedData: 'summaries,images,attributes',
      pageSize: 20
    };
    
    if (nextToken) {
      params.nextToken = nextToken;
    }

    const queryString = new URLSearchParams(params).toString();
    const url = `${SP_API_CONFIG.endpoint}/catalog/2022-04-01/items?${queryString}`;

    console.log('📦 Fetching catalog items from SP-API...');
    
    const response = await axios.get(url, {
      headers: {
        'x-amz-access-token': token,
        'Accept': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error('❌ Error fetching catalog items:', error.response?.data || error.message);
    throw error;
  }
}

// Fetch detailed product info by ASIN
async function fetchProductDetails(asin) {
  try {
    const token = await getAccessToken();
    
    const params = {
      marketplaceIds: SP_API_CONFIG.marketplaceId,
      includedData: 'attributes,identifiers,images,productTypes,salesRanks,summaries,dimensions'
    };

    const queryString = new URLSearchParams(params).toString();
    const url = `${SP_API_CONFIG.endpoint}/catalog/2022-04-01/items/${asin}?${queryString}`;
    
    const response = await axios.get(url, {
      headers: {
        'x-amz-access-token': token,
        'Accept': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error(`❌ Error fetching details for ${asin}:`, error.response?.data?.errors?.[0]?.message || error.message);
    return null;
  }
}

// Helper to add delay between requests (rate limiting)
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Fetch Seller's Active Listings
async function fetchListings(nextToken = null) {
  try {
    const token = await getAccessToken();
    
    const params = {
      marketplaceIds: SP_API_CONFIG.marketplaceId,
      pageSize: 20
    };
    
    if (nextToken) {
      params.nextToken = nextToken;
    }

    const queryString = new URLSearchParams(params).toString();
    const url = `${SP_API_CONFIG.endpoint}/listings/2021-08-01/items?${queryString}`;

    console.log('📋 Fetching active listings from SP-API...');
    
    const response = await axios.get(url, {
      headers: {
        'x-amz-access-token': token,
        'Accept': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error('❌ Error fetching listings:', error.response?.data || error.message);
    throw error;
  }
}

// Create Inventory Report
async function createInventoryReport() {
  try {
    const token = await getAccessToken();
    
    const reportBody = {
      reportType: 'GET_MERCHANT_LISTINGS_ALL_DATA',
      marketplaceIds: [SP_API_CONFIG.marketplaceId]
    };

    console.log('📊 Creating inventory report...');
    
    const response = await axios.post(
      `${SP_API_CONFIG.endpoint}/reports/2021-06-30/reports`,
      reportBody,
      {
        headers: {
          'x-amz-access-token': token,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.reportId;
  } catch (error) {
    console.error('❌ Error creating report:', error.response?.data || error.message);
    throw error;
  }
}

// Get Report Status
async function getReportStatus(reportId) {
  try {
    const token = await getAccessToken();
    
    console.log('🔍 Checking report status...');
    
    const response = await axios.get(
      `${SP_API_CONFIG.endpoint}/reports/2021-06-30/reports/${reportId}`,
      {
        headers: {
          'x-amz-access-token': token
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('❌ Error checking report:', error.response?.data || error.message);
    throw error;
  }
}

// Download Report
async function downloadReport(reportDocumentId) {
  try {
    const token = await getAccessToken();
    
    console.log('📥 Getting report document info...');
    
    const docResponse = await axios.get(
      `${SP_API_CONFIG.endpoint}/reports/2021-06-30/documents/${reportDocumentId}`,
      {
        headers: {
          'x-amz-access-token': token
        }
      }
    );

    const documentUrl = docResponse.data.url;
    
    console.log('📥 Downloading report...');
    
    const reportResponse = await axios.get(documentUrl);
    
    return reportResponse.data;
  } catch (error) {
    console.error('❌ Error downloading report:', error.response?.data || error.message);
    throw error;
  }
}

// Parse TSV Report to Products
function parseInventoryReport(tsvData) {
  const lines = tsvData.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split('\t');
  const products = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split('\t');
    const row = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    products.push({
      sku: row['seller-sku'] || row['sku'] || '',
      asin: row['asin1'] || row['asin'] || '',
      product: row['item-name'] || row['product-name'] || row['seller-sku'] || 'Unknown Product',
      price: row['price'] || '',
      quantity: row['quantity'] || '0',
      status: row['status'] || 'Active',
      module: 'catalog',
      account: 'Amazon US',
      brand: row['brand-name'] || '',
      marketplace: 'Amazon',
      source: 'sp-api-report'
    });
  }
  
  return products;
}

// Fetch Inventory Summary
async function fetchInventory() {
  try {
    const token = await getAccessToken();
    
    const url = `${SP_API_CONFIG.endpoint}/fba/inventory/v1/summaries?granularityType=Marketplace&granularityId=${SP_API_CONFIG.marketplaceId}&marketplaceIds=${SP_API_CONFIG.marketplaceId}`;

    console.log('📊 Fetching inventory from SP-API...');
    console.log('URL:', url);
    
    const response = await axios.get(url, {
      headers: {
        'x-amz-access-token': token,
        'Accept': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error('❌ Error fetching inventory:', error.response?.data || error.message);
    throw error;
  }
}

// API Endpoints

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'SP-API Server is running',
    config: {
      hasClientId: !!SP_API_CONFIG.clientId,
      hasClientSecret: !!SP_API_CONFIG.clientSecret,
      hasRefreshToken: !!SP_API_CONFIG.refreshToken,
      region: SP_API_CONFIG.region,
      marketplaceId: SP_API_CONFIG.marketplaceId
    }
  });
});

// Get catalog items
app.get('/api/catalog/items', async (req, res) => {
  try {
    const nextToken = req.query.nextToken;
    const data = await fetchCatalogItems(nextToken);
    res.json(data);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch catalog items',
      details: error.response?.data || error.message 
    });
  }
});

// Get active listings
app.get('/api/listings', async (req, res) => {
  try {
    const nextToken = req.query.nextToken;
    const data = await fetchListings(nextToken);
    res.json(data);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch listings',
      details: error.response?.data || error.message 
    });
  }
});

// Get inventory
app.get('/api/inventory', async (req, res) => {
  try {
    const data = await fetchInventory();
    res.json(data);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch inventory',
      details: error.response?.data || error.message 
    });
  }
});

// Simplified endpoint to get all seller products
app.get('/api/products/sync', async (req, res) => {
  try {
    console.log('🔄 Starting product sync...');
    
    let products = [];
    
    // Try Method 1: Fetch from FBA Inventory
    try {
      console.log('📦 Trying FBA Inventory API...');
      const inventoryData = await fetchInventory();
      
      if (inventoryData.inventorySummaries && inventoryData.inventorySummaries.length > 0) {
        products = inventoryData.inventorySummaries.map(item => ({
          asin: item.asin,
          sku: item.sellerSku,
          fnSku: item.fnSku,
          product: item.productName || item.sellerSku,
          status: item.totalQuantity > 0 ? 'launched' : 'in-progress',
          module: 'catalog',
          account: 'Amazon US',
          brand: '',
          marketplace: 'Amazon',
          totalQuantity: item.totalQuantity || 0,
          condition: item.condition || 'NewItem',
          source: 'sp-api-inventory'
        }));
        console.log(`✅ Found ${products.length} products from Inventory API`);
      }
    } catch (invError) {
      console.log('⚠️ Inventory API failed:', invError.response?.data?.errors?.[0]?.message || invError.message);
    }
    
    // Try Method 2: Fetch from Reports API (most reliable)
    if (products.length === 0) {
      try {
        console.log('📊 Trying Reports API (this takes 10-30 seconds)...');
        
        // Step 1: Create report
        const reportId = await createInventoryReport();
        console.log(`📄 Report created: ${reportId}`);
        
        // Step 2: Wait for report to be ready (poll every 3 seconds)
        let reportStatus = 'IN_QUEUE';
        let attempts = 0;
        const maxAttempts = 60; // 3 minutes max
        
        while (reportStatus !== 'DONE' && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
          const report = await getReportStatus(reportId);
          reportStatus = report.processingStatus;
          console.log(`📊 Report status: ${reportStatus} (attempt ${attempts + 1}/${maxAttempts})`);
          attempts++;
        }
        
        if (reportStatus === 'DONE') {
          // Step 3: Get report document
          const report = await getReportStatus(reportId);
          const reportDocumentId = report.reportDocumentId;
          
          // Step 4: Download and parse report
          const reportData = await downloadReport(reportDocumentId);
          products = parseInventoryReport(reportData);
          
          console.log(`✅ Found ${products.length} products from Reports API`);
        } else {
          console.log('⚠️ Report took too long to generate');
        }
      } catch (reportError) {
        console.log('⚠️ Reports API failed:', reportError.response?.data?.errors?.[0]?.message || reportError.message);
      }
    }
    
    // Try Method 3: Fetch from Listings API (if reports failed)
    if (products.length === 0) {
      try {
        console.log('📋 Trying Listings API...');
        const listingsData = await fetchListings();
        
        if (listingsData.items && listingsData.items.length > 0) {
          products = listingsData.items.map(item => ({
            sku: item.sku,
            asin: item.asin,
            product: item.productType || item.sku,
            status: 'launched',
            module: 'catalog',
            account: 'Amazon US',
            brand: '',
            marketplace: 'Amazon',
            itemName: item.itemName || '',
            source: 'sp-api-listings'
          }));
          console.log(`✅ Found ${products.length} products from Listings API`);
        }
      } catch (listError) {
        console.log('⚠️ Listings API failed:', listError.response?.data?.errors?.[0]?.message || listError.message);
      }
    }
    
    // No products found from either API
    if (products.length === 0) {
      return res.json({
        success: true,
        products: [],
        count: 0,
        message: 'No products found. Make sure you have active listings in Amazon Seller Central.'
      });
    }

    console.log(`✅ Successfully synced ${products.length} products`);

    res.json({
      success: true,
      count: products.length,
      products: products
    });
  } catch (error) {
    console.error('❌ Sync failed:', error.response?.data || error.message);
    res.status(500).json({ 
      success: false,
      error: 'Failed to sync products',
      details: error.response?.data || error.message 
    });
  }
});

// Detailed sync endpoint - fetches full product details
app.post('/api/products/sync-details', async (req, res) => {
  try {
    const { asins } = req.body;
    
    if (!asins || !Array.isArray(asins) || asins.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide an array of ASINs'
      });
    }

    console.log(`🔄 Starting detailed sync for ${asins.length} products...`);
    console.log(`⏱️  Estimated time: ~${Math.ceil(asins.length / 2 / 60)} minutes (SP-API allows 2 requests/second)`);
    
    const detailedProducts = [];
    let successCount = 0;
    let errorCount = 0;
    
    // Process ONE at a time with 500ms delay (2 requests per second = SP-API limit)
    for (let i = 0; i < asins.length; i++) {
      const asin = asins[i];
      
      // Progress update every 10 products
      if (i % 10 === 0) {
        console.log(`📦 Progress: ${i}/${asins.length} (${successCount} success, ${errorCount} failed)`);
      }
      
      try {
        const details = await fetchProductDetails(asin);
        
        if (details) {
          const item = details;
          
          // Extract images
          const images = [];
          if (item.images && item.images.length > 0) {
            item.images[0].images?.forEach(img => {
              if (img.link) images.push(img.link);
            });
          }
          
          // Extract attributes
          const attributes = item.attributes || {};
          const summaries = item.summaries?.[0] || {};
          
          // Extract description from bullet points
          let description = '';
          if (attributes.bullet_point && Array.isArray(attributes.bullet_point)) {
            description = attributes.bullet_point
              .map(bp => typeof bp === 'object' ? bp.value : bp)
              .filter(Boolean)
              .join(' | ');
          }
          
          detailedProducts.push({
            asin: item.asin,
            sku: item.identifiers?.[0]?.identifiers?.[0]?.identifier || '',
            product: summaries.itemName || summaries.brandName || '',
            brand: summaries.brandName || '',
            description: description,
            images: images,
            mainImage: images[0] || '',
            price: '',
            quantity: '',
            status: 'Active',
            
            // Additional details
            manufacturer: summaries.manufacturer || '',
            partNumber: summaries.partNumber || '',
            modelNumber: attributes.model_number?.[0]?.value || '',
            color: attributes.color?.[0]?.value || '',
            size: attributes.size?.[0]?.value || '',
            itemDimensions: attributes.item_dimensions?.[0] || {},
            packageDimensions: attributes.package_dimensions?.[0] || {},
            weight: attributes.item_weight?.[0]?.value || '',
            
            module: 'catalog',
            account: 'Amazon US',
            marketplace: 'Amazon',
            source: 'sp-api-detailed'
          });
          
          successCount++;
        } else {
          errorCount++;
        }
      } catch (err) {
        errorCount++;
      }
      
      // Rate limiting: wait 500ms between requests (2 requests per second)
      if (i < asins.length - 1) {
        await delay(500);
      }
    }

    console.log(`✅ Successfully fetched details for ${detailedProducts.length}/${asins.length} products`);

    res.json({
      success: true,
      count: detailedProducts.length,
      products: detailedProducts
    });
  } catch (error) {
    console.error('❌ Detailed sync failed:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch product details',
      details: error.response?.data || error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 SP-API Server running on http://localhost:${PORT}`);
  console.log(`\n📋 Available endpoints:`);
  console.log(`   GET  /api/test                    - Test server status`);
  console.log(`   GET  /api/products/sync           - Sync products (basic info)`);
  console.log(`   POST /api/products/sync-details   - Sync detailed product info`);
  console.log(`   GET  /api/catalog/items           - Get catalog items`);
  console.log(`   GET  /api/listings                - Get active listings`);
  console.log(`   GET  /api/inventory               - Get inventory summary`);
  console.log(`\n✅ Ready to sync Amazon products!\n`);
});

