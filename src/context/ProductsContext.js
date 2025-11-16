import React, { createContext, useState, useContext, useEffect } from 'react';

const ProductsContext = createContext();

export const useProducts = () => {
  const context = useContext(ProductsContext);
  if (!context) {
    throw new Error('useProducts must be used within ProductsProvider');
  }
  return context;
};

export const ProductsProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [productConfigs, setProductConfigs] = useState({});
  const [loading, setLoading] = useState(true);

  // Load products from localStorage on mount
  useEffect(() => {
    const savedProducts = localStorage.getItem('products');
    const savedConfigs = localStorage.getItem('productConfigs');
    if (savedProducts) {
      setProducts(JSON.parse(savedProducts));
    }
    if (savedConfigs) {
      setProductConfigs(JSON.parse(savedConfigs));
    }
    setLoading(false);
  }, []);

  // Save to localStorage whenever products change
  useEffect(() => {
    localStorage.setItem('products', JSON.stringify(products));
  }, [products]);

  // Save to localStorage whenever configs change
  useEffect(() => {
    localStorage.setItem('productConfigs', JSON.stringify(productConfigs));
  }, [productConfigs]);

  const addProduct = (product) => {
    const newProduct = {
      id: Date.now().toString(),
      ...product,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setProducts(prev => [...prev, newProduct]);
    return newProduct;
  };

  const addProducts = (productsArray) => {
    const newProducts = productsArray.map(product => ({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      ...product,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
    setProducts(prev => [...prev, ...newProducts]);
    return newProducts;
  };

  const updateProduct = (id, updates) => {
    setProducts(prev => prev.map(p => 
      p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
    ));
  };

  const deleteProduct = (id) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const deleteProducts = (ids) => {
    setProducts(prev => prev.filter(p => !ids.includes(p.id)));
  };

  const getProductsByModule = (moduleName) => {
    return products.filter(p => p.module === moduleName);
  };

  const getProductById = (id) => {
    return products.find(p => p.id === id);
  };

  // Parse CSV with proper quote and comma handling
  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const importFrom1000BananasCSV = (csvData) => {
    try {
      const lines = csvData.trim().split('\n');
      
      // Find the header row (contains "Product Images", "Date Added", etc.)
      let headerRowIndex = -1;
      for (let i = 0; i < Math.min(20, lines.length); i++) {
        if (lines[i].includes('Product Images') && lines[i].includes('Date Added') && lines[i].includes('Brand Name')) {
          headerRowIndex = i;
          break;
        }
      }
      
      if (headerRowIndex === -1) {
        throw new Error('Could not find header row. Make sure this is the CatalogDataBase sheet.');
      }
      
      const headers = parseCSVLine(lines[headerRowIndex]);
      const productsMap = new Map(); // Group by base product name
      
      console.log('Found headers:', headers);
      console.log(`Processing ${lines.length - headerRowIndex - 1} product rows...`);
      
      // Process data rows
      for (let i = headerRowIndex + 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        
        // Skip empty rows
        if (values.every(v => !v)) continue;
        
        // Map columns to product object
        const rowData = {};
        headers.forEach((header, index) => {
          if (values[index]) {
            rowData[header] = values[index];
          }
        });
        
        // Extract base product name (without size variations)
        const fullProductName = rowData['Product Name'] || '';
        if (!fullProductName) continue;
        
        // Remove size info from product name to get base name
        // Example: "Cherry Tree Fertilizer, Liquid Plant Food, 1 Gallon (128 oz)" -> "Cherry Tree Fertilizer"
        const baseProductName = fullProductName.split(',')[0].trim();
        const size = rowData['Size'] || '';
        
        // Build variation-specific data
        const variationData = {
          size: size,
          fullProductName: fullProductName,
          
          // ASINs and SKUs per variation
          asin: rowData['Child ASIN'] || '',
          parentAsin: rowData['Parent ASIN'] || '',
          childAsin: rowData['Child ASIN'] || '',
          sku: rowData['CHILD SKU\nFINAL'] || '',
          parentSku: rowData['PARENT SKU\nFINAL'] || '',
          childSku: rowData['CHILD SKU\nFINAL'] || '',
          upc: rowData['UPC'] || '',
          upcImageFile: rowData['UPC Image File'] || '',
          
          // Packaging
          packagingName: rowData['Packaging Name'] || '',
          closureName: rowData['Closure Name'] || '',
          labelSize: rowData['Label Size'] || '',
          labelLocation: rowData['Label Location'] || '',
          caseSize: rowData['Case Size'] || '',
          unitsPerCase: rowData['Units per\nCase'] || '',
          
          // Formula
          formula: rowData['Formula'] || '',
          formulaName: rowData['Formula Name'] || '',
          msds: rowData['MSDS'] || '',
          guaranteedAnalysis: rowData['Guaranteed Analysis'] || '',
          npk: rowData['NPK'] || '',
          derivedFrom: rowData['Derived From'] || '',
          storageWarranty: rowData['Storage / Warranty / Precautionary / Metals'] || '',
          
          // Images
          productImages: rowData['Product Images'] || '',
          stockImage: rowData['Stock Image'] || '',
          basicWrap: rowData['Basic Wrap'] || '',
          plantBehindProduct: rowData['Plant Behind Product'] || '',
          triBottleWrap: rowData['Tri-Bottle Wrap'] || '',
          upcImageFile: rowData['UPC Image File'] || '',
          
          // Six Sided Images
          image_front: rowData['6 Sided Image Front'] || '',
          image_left: rowData['6 Sided Image Left'] || '',
          image_back: rowData['6 Sided Image Back'] || '',
          image_right: rowData['6 Sided Image Right'] || '',
          image_top: rowData['6 Sided Image Top'] || '',
          image_bottom: rowData['6 Sided Image Bottom'] || '',
          
          // Amazon Slides
          slide1: rowData['Amazon Slide #1'] || '',
          slide2: rowData['Amazon Slide #2'] || '',
          slide3: rowData['Amazon Slide #3'] || '',
          slide4: rowData['Amazon Slide #4'] || '',
          slide5: rowData['Amazon Slide #5'] || '',
          slide6: rowData['Amazon Slide #6'] || '',
          slide7: rowData['Amazon Slide #7'] || '',
          
          // A+ Content
          aplus_slide1: rowData['Amazon A+ Slide #1'] || '',
          aplus_slide2: rowData['Amazon A+ Slide #2'] || '',
          aplus_slide3: rowData['Amazon A+ Slide #3'] || '',
          aplus_slide4: rowData['Amazon A+ Slide #4'] || '',
          aplus_slide5: rowData['Amazon A+ Slide #5'] || '',
          aplus_slide6: rowData['Amazon A+ Slide #6'] || '',
          
          // Label Info
          leftBenefitGraphic: rowData['TPS Plant Foods \nLeft Side Benefit Graphic'] || '',
          directions: rowData['TPS Plant Foods\nDirections'] || '',
          growingRecommendations: rowData['TPS Plant Foods\nGrowing Recommendations'] || '',
          qrCodeSection: rowData['QR Code Section'] || '',
          productTitle: rowData['Product Title'] || '',
          centerBenefitStatement: rowData['Center Benefit Statement'] || '',
          sizeCopyForLabel: rowData['Size Copy for Label'] || '',
          rightBenefitGraphic: rowData['Right Side Benefit Graphic'] || '',
          ingredientStatement: rowData['INGREDIENT STATEMENT'] || '',
          tpsGuaranteedAnalysis: rowData['TPS GUARANTEED ANALYSIS'] || '',
          tpsNPK: rowData['TPS NPK'] || '',
          tpsDerivedFrom: rowData['TPS DERIVED FROM'] || '',
          tpsStorage: rowData['TPS STORAGE / WARRANTY / PRECAUTIONARY / METALS'] || '',
          tpsAddress: rowData['TPS Address'] || '',
          labelAI: rowData['LABEL: \nAI FILE'] || '',
          labelPDF: rowData['LABEL: PRINT READY PDF'] || '',
          
          // Product Dimensions
          length: rowData['Product Dimensions\nLength (in)'] || '',
          width: rowData['Product Dimensions\nWidth (in)'] || '',
          height: rowData['Product Dimensions\nHeight (in)'] || '',
          weight: rowData['Product Dimensions\nWeight (lbs)'] || '',
          
          // Listing
          price: rowData['Price'] || '',
          title: rowData['Title'] || '',
          bullets: rowData['Bullets'] || '',
          description: rowData['Description'] || '',
          status: rowData['Status'] || 'Active',
          
          // Vine
          vineLaunchDate: rowData['Vine Launch Date'] || '',
          vineUnitsEnrolled: rowData['Units Enrolled'] || '',
          vineReviews: rowData['Vine Reviews'] || '',
          starRating: rowData['Star Rating'] || '',
          vineNotes: rowData['Vine Notes'] || '',
          
          // Marketing
          coreCompetitorAsins: rowData['Core Competitor ASINS'] || '',
          otherCompetitorAsins: rowData['Other Competitor ASINS'] || '',
          coreKeywords: rowData['Core Keywords'] || '',
          otherKeywords: rowData['Other Keywords'] || '',
          
          // Other
          dateAdded: rowData['Date Added'] || '',
          notes: rowData['Notes'] || '',
          filter: rowData['Filter'] || '',
          website: rowData['WEBSITE'] || '',
          unitsSold30Days: rowData['Units Sold 30 Days'] || '',
          brandTailorDiscount: rowData['Brand Tailor Discount'] || '',
        };
        
        // Get or create product entry
        if (!productsMap.has(baseProductName)) {
          // Create new product with shared data
          productsMap.set(baseProductName, {
            product: baseProductName,
            brand: rowData['Brand Name'] || '',
            type: rowData['Type'] || '',
            account: rowData['Seller Account'] || 'Amazon US',
            marketplace: rowData['Marketplace'] || 'Amazon',
            country: rowData['Country'] || 'US',
            status: rowData['Status'] || 'Active',
            module: 'catalog',
            source: '1000bananas-import',
            
            // Shared formula data (from first variation)
            formula: rowData['Formula'] || '',
            formulaName: rowData['Formula Name'] || '',
            msds: rowData['MSDS'] || '',
            
            // Shared marketing data
            coreCompetitorAsins: rowData['Core Competitor ASINS'] || '',
            otherCompetitorAsins: rowData['Other Competitor ASINS'] || '',
            coreKeywords: rowData['Core Keywords'] || '',
            otherKeywords: rowData['Other Keywords'] || '',
            
            // Shared metadata
            dateAdded: rowData['Date Added'] || '',
            filter: rowData['Filter'] || '',
            website: rowData['WEBSITE'] || '',
            
            // Variations array
            variations: [],
            variationsData: {}
          });
        }
        
        // Add this variation
        const productEntry = productsMap.get(baseProductName);
        if (size && !productEntry.variations.includes(size)) {
          productEntry.variations.push(size);
        }
        
        // Store variation-specific data
        if (size) {
          productEntry.variationsData[size] = variationData;
        }
        
        // Use first variation's ASIN as main ASIN
        if (!productEntry.asin && variationData.asin) {
          productEntry.asin = variationData.asin;
          productEntry.parentAsin = variationData.parentAsin;
        }
        
        // Use first variation's SKU as main SKU
        if (!productEntry.sku && variationData.sku) {
          productEntry.sku = variationData.sku;
          productEntry.parentSku = variationData.parentSku;
        }
      }
      
      // Convert map to array
      const newProducts = Array.from(productsMap.values());
      
      if (newProducts.length === 0) {
        throw new Error('No valid products found in CSV');
      }
      
      console.log(`Parsed ${newProducts.length} products with variations`);
      
      // Add products and set up their configurations
      const added = addProducts(newProducts);
      
      // Set up product configurations with variations
      added.forEach(product => {
        if (product.variations && product.variations.length > 0) {
          updateProductConfig(product.id, {
            variations: product.variations,
            variationType: 'size',
            variationsData: product.variationsData,
            enabledTabs: [] // All tabs enabled by default
          });
        }
      });
      
      return { success: true, count: added.length, products: added };
    } catch (error) {
      console.error('Import error:', error);
      return { success: false, error: error.message };
    }
  };

  const importFromCSV = (csvData) => {
    // Try to detect if this is a 1000 Bananas database CSV
    if (csvData.includes('Product Images') && csvData.includes('TPS Plant Foods') && csvData.includes('LABEL COPY')) {
      console.log('Detected 1000 Bananas database format');
      return importFrom1000BananasCSV(csvData);
    }
    
    // Otherwise use simple CSV import
    try {
      const lines = csvData.trim().split('\n');
      if (lines.length < 2) {
        throw new Error('CSV must have at least a header row and one data row');
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const newProducts = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const product = {};

        headers.forEach((header, index) => {
          if (values[index]) {
            product[header] = values[index];
          }
        });

        // Set defaults if not provided
        if (!product.status) product.status = 'pending';
        if (!product.module) product.module = 'selection';

        newProducts.push(product);
      }

      const added = addProducts(newProducts);
      return { success: true, count: added.length, products: added };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const exportToCSV = (moduleProducts) => {
    if (moduleProducts.length === 0) {
      return '';
    }

    // Get all unique keys from all products
    const allKeys = new Set();
    moduleProducts.forEach(product => {
      Object.keys(product).forEach(key => {
        if (key !== 'id' && key !== 'createdAt' && key !== 'updatedAt') {
          allKeys.add(key);
        }
      });
    });

    const headers = Array.from(allKeys);
    const csvLines = [headers.join(',')];

    moduleProducts.forEach(product => {
      const row = headers.map(header => {
        const value = product[header] || '';
        // Escape commas and quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvLines.push(row.join(','));
    });

    return csvLines.join('\n');
  };

  const resetProducts = () => {
    localStorage.removeItem('products');
    localStorage.removeItem('productConfigs');
    setProducts([]);
    setProductConfigs({});
  };

  const updateProductConfig = (productId, config) => {
    setProductConfigs(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        ...config,
        updatedAt: new Date().toISOString()
      }
    }));
  };

  const getProductConfig = (productId) => {
    return productConfigs[productId] || {
      variations: [],
      variationType: 'size', // size, color, style, etc.
      enabledTabs: [], // Empty means all tabs enabled
      customFields: {},
      activeTemplateId: null
    };
  };

  const setActiveTemplate = (productId, templateId) => {
    updateProductConfig(productId, {
      activeTemplateId: templateId
    });
  };

  const setProductVariations = (productId, variations, variationType = 'size') => {
    updateProductConfig(productId, {
      variations,
      variationType
    });
  };

  const setProductTabs = (productId, enabledTabs) => {
    updateProductConfig(productId, {
      enabledTabs
    });
  };

  return (
    <ProductsContext.Provider
      value={{
        products,
        loading,
        addProduct,
        addProducts,
        updateProduct,
        deleteProduct,
        deleteProducts,
        getProductsByModule,
        getProductById,
        importFromCSV,
        exportToCSV,
        resetProducts,
        updateProductConfig,
        getProductConfig,
        setProductVariations,
        setProductTabs,
        setActiveTemplate
      }}
    >
      {children}
    </ProductsContext.Provider>
  );
};

