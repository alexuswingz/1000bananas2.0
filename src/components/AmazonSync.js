import React, { useState } from 'react';
import { toast } from 'sonner';
import { useTheme } from '../context/ThemeContext';
import { useProducts } from '../context/ProductsContext';

const AmazonSync = ({ onClose }) => {
  const { isDarkMode } = useTheme();
  const { addProducts } = useProducts();
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');
  const [products, setProducts] = useState([]);
  const [syncMode, setSyncMode] = useState('basic'); // 'basic' or 'detailed'

  const themeClasses = {
    bg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-600',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncStatus('Connecting to Amazon SP-API...');
    setProducts([]);

    try {
      // Test server connection first
      setSyncStatus('Checking server connection...');
      const testResponse = await fetch('http://localhost:3001/api/test');
      
      if (!testResponse.ok) {
        throw new Error('Backend server is not running. Please start it with: npm run server');
      }

      if (syncMode === 'basic') {
        // Basic sync
        setSyncStatus('Fetching products from Amazon...');
        const syncResponse = await fetch('http://localhost:3001/api/products/sync');
        
        if (!syncResponse.ok) {
          const errorData = await syncResponse.json();
          throw new Error(errorData.details || errorData.error || 'Failed to sync products');
        }

        const data = await syncResponse.json();

        if (!data.success) {
          throw new Error(data.error || 'Sync failed');
        }

        if (data.products.length === 0) {
          setSyncStatus('No products found in your Amazon inventory');
          toast.info('No products found', {
            description: 'Your Amazon inventory appears to be empty',
          });
          return;
        }

        setProducts(data.products);
        setSyncStatus(`Found ${data.products.length} products`);

        // Add products to the app
        addProducts(data.products);

        toast.success('Products synced successfully!', {
          description: `${data.products.length} products imported from Amazon`,
        });
      } else {
        // Detailed sync - First get basic product list, then fetch details
        setSyncStatus('Step 1/2: Fetching product list from Amazon...');
        const basicResponse = await fetch('http://localhost:3001/api/products/sync');
        
        if (!basicResponse.ok) {
          throw new Error('Failed to fetch product list');
        }
        
        const basicData = await basicResponse.json();
        
        if (!basicData.success || basicData.products.length === 0) {
          throw new Error('No products found to fetch details for');
        }

        const asins = basicData.products.map(p => p.asin).filter(a => a);
        
        // For testing: limit to first 5 products
        const limitedAsins = asins.slice(0, 5);
        const estimatedMinutes = Math.ceil(limitedAsins.length / 2 / 60);
        
        setSyncStatus(`Step 2/2: Fetching detailed info for ${limitedAsins.length} products (TEST MODE - first 5 only)...`);

        const detailResponse = await fetch('http://localhost:3001/api/products/sync-details', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ asins: limitedAsins })
        });

        if (!detailResponse.ok) {
          const errorData = await detailResponse.json();
          throw new Error(errorData.error || 'Failed to fetch detailed product information');
        }

        const detailData = await detailResponse.json();
        
        setProducts(detailData.products);
        setSyncStatus(`✅ Fetched full details for ${detailData.products.length} products!`);

        // Add detailed products to the app
        addProducts(detailData.products);

        toast.success('Detailed sync completed!', {
          description: `${detailData.products.length} products with images, descriptions & more imported!`,
        });
      }

      // Close after 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (error) {
      console.error('Sync error:', error);
      setSyncStatus('');
      
      if (error.message.includes('Backend server is not running')) {
        toast.error('Backend Server Not Running', {
          description: 'Please run: npm run server',
          duration: 5000,
        });
      } else if (error.message.includes('Failed to fetch')) {
        toast.error('Cannot connect to backend', {
          description: 'Make sure the backend server is running on port 3001',
          duration: 5000,
        });
      } else {
        toast.error('Sync failed', {
          description: error.message,
          duration: 5000,
        });
      }
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !syncing) {
          onClose();
        }
      }}
    >
      <div
        className={`${themeClasses.bg} ${themeClasses.text}`}
        style={{
          borderRadius: '1rem',
          padding: '2rem',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: isDarkMode
            ? '0 20px 60px rgba(0, 0, 0, 0.8)'
            : '0 20px 60px rgba(0, 0, 0, 0.15)',
        }}
      >
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            Sync Amazon Products
          </h2>
          <p className={themeClasses.textSecondary} style={{ fontSize: '0.875rem' }}>
            Import your products from Amazon Seller Central via SP-API
          </p>
        </div>

        {!syncing && products.length === 0 && (
          <div style={{ marginBottom: '2rem' }}>
            {/* Sync Mode Selection */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', display: 'block' }} className={themeClasses.text}>
                Sync Mode:
              </label>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => setSyncMode('basic')}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: `2px solid ${syncMode === 'basic' ? '#3b82f6' : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)')}`,
                    backgroundColor: syncMode === 'basic' ? (isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)') : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ fontWeight: '600', fontSize: '0.875rem', marginBottom: '0.25rem' }} className={themeClasses.text}>
                    ⚡ Basic (Fast)
                  </div>
                  <div style={{ fontSize: '0.75rem' }} className={themeClasses.textSecondary}>
                    ~30 seconds - SKUs, ASINs, prices, quantities
                  </div>
                </button>
                <button
                  onClick={() => setSyncMode('detailed')}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: `2px solid ${syncMode === 'detailed' ? '#3b82f6' : (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)')}`,
                    backgroundColor: syncMode === 'detailed' ? (isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)') : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ fontWeight: '600', fontSize: '0.875rem', marginBottom: '0.25rem' }} className={themeClasses.text}>
                    🔍 Detailed (Very Slow)
                  </div>
                  <div style={{ fontSize: '0.75rem' }} className={themeClasses.textSecondary}>
                    ~10 mins per 1000 - + images, descriptions, dimensions
                  </div>
                </button>
              </div>
            </div>

            <div
              style={{
                padding: '1.5rem',
                backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
                border: `1px solid ${isDarkMode ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)'}`,
                borderRadius: '0.5rem',
                marginBottom: '1rem',
              }}
            >
              <h3 style={{ fontWeight: '600', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                {syncMode === 'basic' ? 'Basic sync includes:' : 'Detailed sync includes:'}
              </h3>
              <ul style={{ fontSize: '0.875rem', paddingLeft: '1.25rem' }} className={themeClasses.textSecondary}>
                <li>Product names and SKUs</li>
                <li>ASINs and Fulfillment SKUs</li>
                <li>Current inventory levels</li>
                <li>Prices and status</li>
                {syncMode === 'detailed' && (
                  <>
                    <li><strong>+ Product images (main & gallery)</strong></li>
                    <li><strong>+ Full descriptions & bullet points</strong></li>
                    <li><strong>+ Dimensions & weight</strong></li>
                    <li><strong>+ Color, size, model numbers</strong></li>
                    <li><strong>+ Manufacturer info</strong></li>
                  </>
                )}
              </ul>
            </div>

            <div
              style={{
                padding: '1rem',
                backgroundColor: isDarkMode ? 'rgba(234, 179, 8, 0.1)' : 'rgba(234, 179, 8, 0.05)',
                border: `1px solid ${isDarkMode ? 'rgba(234, 179, 8, 0.3)' : 'rgba(234, 179, 8, 0.2)'}`,
                borderRadius: '0.5rem',
                fontSize: '0.75rem',
              }}
              className={themeClasses.textSecondary}
            >
              <strong>Note:</strong> Make sure the backend server is running (npm run server) before syncing.
              {syncMode === 'detailed' && (
                <div style={{ marginTop: '0.5rem' }}>
                  <strong>⚠️ Detailed sync is VERY slow:</strong>
                  <ul style={{ marginTop: '0.25rem', paddingLeft: '1.25rem' }}>
                    <li>~10 minutes per 1,000 products</li>
                    <li>SP-API limits: 2 requests/second</li>
                    <li>Consider running overnight for large catalogs</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {syncStatus && (
          <div
            style={{
              padding: '1rem',
              backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
              borderRadius: '0.5rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            {syncing && (
              <div
                style={{
                  width: '1rem',
                  height: '1rem',
                  border: '2px solid',
                  borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
                  borderTopColor: '#3b82f6',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              />
            )}
            <span style={{ fontSize: '0.875rem' }}>{syncStatus}</span>
          </div>
        )}

        {products.length > 0 && (
          <div
            style={{
              marginBottom: '1.5rem',
              maxHeight: '300px',
              overflowY: 'auto',
              border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
              borderRadius: '0.5rem',
              padding: '1rem',
            }}
          >
            <h3 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.75rem' }}>
              Products to Import ({products.length}):
            </h3>
            {products.map((product, index) => (
              <div
                key={index}
                style={{
                  padding: '0.75rem',
                  backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                  borderRadius: '0.375rem',
                  marginBottom: '0.5rem',
                  fontSize: '0.75rem',
                }}
              >
                <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>{product.product}</div>
                <div className={themeClasses.textSecondary}>
                  SKU: {product.sku} | ASIN: {product.asin} | Qty: {product.totalQuantity}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={syncing}
            style={{
              padding: '0.625rem 1.25rem',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
              color: isDarkMode ? '#fff' : '#000',
              border: 'none',
              cursor: syncing ? 'not-allowed' : 'pointer',
              opacity: syncing ? 0.5 : 1,
            }}
          >
            {products.length > 0 ? 'Close' : 'Cancel'}
          </button>

          {products.length === 0 && (
            <button
              onClick={handleSync}
              disabled={syncing}
              style={{
                padding: '0.625rem 1.25rem',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                backgroundColor: '#3b82f6',
                color: '#fff',
                border: 'none',
                cursor: syncing ? 'not-allowed' : 'pointer',
                opacity: syncing ? 0.6 : 1,
              }}
            >
              {syncing ? 'Syncing...' : 'Sync Products'}
            </button>
          )}
        </div>
      </div>

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default AmazonSync;

