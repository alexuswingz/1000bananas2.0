import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useTheme } from '../../../context/ThemeContext';
import { useProducts } from '../../../context/ProductsContext';
import { useCompany } from '../../../context/CompanyContext';
import CatalogAPI from '../../../services/catalogApi';
import EssentialInfo from './detail/EssentialInfo';
import StockImage from './detail/StockImage';
import Slides from './detail/Slides';
import LabelCopy from './detail/LabelCopy';
import Label from './detail/Label';
import ProductImages from './detail/ProductImages';
import APlusContent from './detail/APlusContent';
import Website from './detail/Website';
import ListingSetup from './detail/ListingSetup';
import Vine from './detail/Vine';
import Formula from './detail/Formula';
import FinishedGoods from './detail/FinishedGoods';
import PDPSetup from './detail/PDPSetup';
import Ngoos from './detail/Ngoos';

import { extractFileId, getDriveImageUrl } from '../../../services/googleDriveApi';

// Utility function to handle Google Drive image URLs
const getImageUrl = (url) => {
  if (!url) return null;
  
  // Check if URL is from Google Drive
  if (typeof url === 'string' && url.includes('drive.google.com')) {
    // Extract file ID and convert to direct image URL
    const fileId = extractFileId(url);
    if (fileId) {
      // Use Google Drive's direct view URL (works for public files)
      return getDriveImageUrl(fileId);
    }
    
    // Fallback to placeholder if extraction fails
    return 'https://via.placeholder.com/800x800/e5e7eb/6b7280?text=Invalid+Drive+URL';
  }
  
  return url;
};

const ProductDetail = () => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { getProductConfig, setProductVariations, setProductTabs, setActiveTemplate } = useProducts();
  const { productTemplates, getProductTemplate } = useCompany();
  const { product, returnPath, allowedTabs, productId, isChildView, specificChildId } = location.state || {};

  const [activeTab, setActiveTab] = useState('essential');
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [configVersion, setConfigVersion] = useState(0); // Force re-render when template changes
  const [apiProductData, setApiProductData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Ref and state for grab-to-scroll behavior on tabs header
  const tabsContainerRef = useRef(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);

  // Fetch product data from API
  useEffect(() => {
    const fetchProductData = async () => {
      const idToFetch = productId || product?.id;
      
      if (!idToFetch) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await CatalogAPI.getById(idToFetch);
        
        if (data && Object.keys(data).length > 0) {
          setApiProductData(data);
        }
      } catch (error) {
        console.error('Error fetching product details:', error);
        toast.error('Failed to load product details', {
          description: error.message,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProductData();
  }, [productId, product?.id]);
  
  // Get product configuration (re-fetch when configVersion changes)
  const productConfig = useMemo(() => {
    if (!product?.id) {
      return {
        variations: ['Default'],
        variationType: 'size',
        enabledTabs: [],
        customFields: {},
        activeTemplateId: null
      };
    }
    return getProductConfig(product.id);
  }, [product?.id, getProductConfig, configVersion]);

  // Debug logging
  useEffect(() => {
    if (product?.id) {
      console.log('🔍 ProductDetail Debug:', {
        productId: product.id,
        productConfig: productConfig,
        enabledTabs: productConfig.enabledTabs,
        variations: productConfig.variations,
        variationType: productConfig.variationType
      });
    }
  }, [product?.id, productConfig]);

  // Build product data from API or passed product (re-compute when apiProductData or productConfig changes)
  const productData = useMemo(() => {
    // If we have API data, use it
    if (apiProductData) {
      // Extract variations from API data
      let variations = apiProductData.variations || [];
      
      // If opened from child view, filter to show only that specific child
      if (isChildView && specificChildId) {
        variations = variations.filter(v => v.id === specificChildId);
        console.log('🔍 Child view mode - Filtered to specific child:', {
          specificChildId,
          filteredVariations: variations.length,
          totalVariations: apiProductData.variations?.length
        });
      }
      const variationSizes = variations
        .map(v => v.size || `Variant ${v.id}`)
        .filter(Boolean);

      const variationsDataMap = {};
      variations.forEach((variant) => {
        const key = variant.size || `Variant ${variant.id}`;
        variationsDataMap[key] = {
          sizeLabel: variant.size || key,
          childAsin: variant.child_asin,
          parentAsin: variant.parent_asin,
          childSku: variant.child_sku_final,
          parentSku: variant.parent_sku_final,
          upc: variant.upc,
          fullProductName: variant.title || variant.product_name,
          packagingName: variant.packaging_name,
          closureName: variant.closure_name,
          labelSize: variant.label_size,
          labelLocation: variant.label_location,
          caseSize: variant.case_size,
          unitsPerCase: variant.units_per_case,
          filter: variant.filter,
          productImage: getImageUrl(variant.product_image_url || variant.basic_wrap_url || variant.tri_bottle_wrap_url),
          msds: variant.msds,
          notes: variant.notes,
          unitsSold30Days: variant.units_sold_30_days,
          dimensions: {
            length: variant.product_dimensions_length_in,
            width: variant.product_dimensions_width_in,
            height: variant.product_dimensions_height_in,
            weight: variant.product_dimensions_weight_lbs
          },
          formula: {
            guaranteedAnalysis: variant.var_tps_guaranteed_analysis || variant.var_guaranteed_analysis,
            npk: variant.var_tps_npk || variant.var_npk,
            derivedFrom: variant.var_tps_derived_from || variant.var_derived_from,
            storageWarranty: variant.var_tps_storage_warranty || variant.var_storage_warranty
          },
          raw: variant
        };
      });
      
      // Flatten the structured API response
      const essentialInfo = apiProductData.essentialInfo || {};
      const slides = apiProductData.slides || {};
      const aplus = apiProductData.aplus || {};
      const finishedGoods = apiProductData.finishedGoods || {};
      const pdpSetup = apiProductData.pdpSetup || {};
      const vine = apiProductData.vine || {};
      const stockImage = apiProductData.stockImage || {};
      const label = apiProductData.label || {};
      const labelCopy = apiProductData.labelCopy || {};
      const website = apiProductData.website || {};
      const formula = apiProductData.formula || {};
      const productImages = apiProductData.productImages || {};
      
      return {
        ...apiProductData,
        ...product, // Overlay with any passed product data
        
        // Basic info
        brand: apiProductData.brandName || essentialInfo.brandName || product?.brand || '',
        brandFull: apiProductData.brandName || essentialInfo.brandName || product?.brand || '',
        product: apiProductData.productName || essentialInfo.productName || product?.product || 'Product Name',
        marketplace: essentialInfo.marketplace || 'Amazon',
        salesAccount: apiProductData.sellerAccount || product?.account || '',
        country: essentialInfo.country || 'U.S.',
        type: essentialInfo.type || product?.type || 'Liquid',
        dateAdded: apiProductData.createdAt?.split('T')[0] || product?.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
        
        // Essential Info tab data
        formula_name: essentialInfo.formulaName || formula.formulaName || '',
        parent_asin: essentialInfo.parentAsin || '',
        child_asin: essentialInfo.childAsin || '',
        parent_sku_final: essentialInfo.parentSku || '',
        child_sku_final: essentialInfo.childSku || '',
        upc: essentialInfo.upc || '',
        
        // Product Images tab data
        images: [
          getImageUrl(productImages.productImageUrl),
          getImageUrl(productImages.basicWrapUrl),
          getImageUrl(productImages.plantBehindProductUrl),
          getImageUrl(productImages.triBottleWrapUrl)
        ].filter(Boolean),
        product_images: [
          getImageUrl(productImages.productImageUrl),
          getImageUrl(productImages.basicWrapUrl),
          getImageUrl(productImages.plantBehindProductUrl),
          getImageUrl(productImages.triBottleWrapUrl)
        ].filter(Boolean),
        mainImage: getImageUrl(productImages.productImageUrl || slides.productImage),
        
        // Slides tab data (6-sided + Amazon slides)
        product_image_url: getImageUrl(slides.productImage) || '',
        six_sided_image_front: getImageUrl(slides.front) || '',
        six_sided_image_back: getImageUrl(slides.back) || '',
        six_sided_image_left: getImageUrl(slides.left) || '',
        six_sided_image_right: getImageUrl(slides.right) || '',
        six_sided_image_top: getImageUrl(slides.top) || '',
        six_sided_image_bottom: getImageUrl(slides.bottom) || '',
        amazon_slide_1: getImageUrl(slides.amazonSlide1) || '',
        amazon_slide_2: getImageUrl(slides.amazonSlide2) || '',
        amazon_slide_3: getImageUrl(slides.amazonSlide3) || '',
        amazon_slide_4: getImageUrl(slides.amazonSlide4) || '',
        amazon_slide_5: getImageUrl(slides.amazonSlide5) || '',
        amazon_slide_6: getImageUrl(slides.amazonSlide6) || '',
        amazon_slide_7: getImageUrl(slides.amazonSlide7) || '',
        
        // A+ Content tab data
        aplus_module_1: getImageUrl(aplus.module1) || '',
        aplus_module_2: getImageUrl(aplus.module2) || '',
        aplus_module_3: getImageUrl(aplus.module3) || '',
        aplus_module_4: getImageUrl(aplus.module4) || '',
        aplus_module_5: getImageUrl(aplus.module5) || '',
        aplus_module_6: getImageUrl(aplus.module6) || '',
        
        // Finished Goods tab data
        packaging_name: finishedGoods.packagingName || '',
        closure_name: finishedGoods.closureName || '',
        label_size: finishedGoods.labelSize || '',
        label_location: finishedGoods.labelLocation || '',
        case_size: finishedGoods.caseSize || '',
        units_per_case: finishedGoods.unitsPerCase || '',
        product_dimensions_length_in: finishedGoods.productDimensions?.length || '',
        product_dimensions_width_in: finishedGoods.productDimensions?.width || '',
        product_dimensions_height_in: finishedGoods.productDimensions?.height || '',
        product_dimensions_weight_lbs: finishedGoods.productDimensions?.weight || '',
        units_sold_30_days: finishedGoods.unitsSold30Days || '',
        guaranteed_analysis: finishedGoods.formula?.guaranteedAnalysis || formula.guaranteedAnalysis || '',
        npk: finishedGoods.formula?.npk || formula.npk || '',
        derived_from: finishedGoods.formula?.derivedFrom || formula.derivedFrom || '',
        msds: finishedGoods.formula?.msds || formula.msds || '',
        
        // PDP Setup tab data
        title: pdpSetup.title || '',
        bullets: pdpSetup.bullets || '',
        bullet_points: pdpSetup.bullets || '',
        description: pdpSetup.description || '',
        search_terms: pdpSetup.searchTerms || '',
        core_keywords: pdpSetup.coreKeywords || '',
        other_keywords: pdpSetup.otherKeywords || '',
        core_competitor_asins: pdpSetup.coreCompetitorAsins || '',
        other_competitor_asins: pdpSetup.otherCompetitorAsins || '',
        
        // Stock Image tab data
        stock_image: getImageUrl(stockImage.stockImage || label.labelImage) || '',
        
        // Label tab data
        label_image: getImageUrl(label.labelImage) || '',
        label_ai_file: getImageUrl(label.labelAiFile) || '',
        label_print_ready_pdf: getImageUrl(label.labelPrintReadyPdf) || '',
        
        // Label Copy tab data
        label_copy: labelCopy.directions || labelCopy.productTitle || '',
        tps_left_side_benefit_graphic: labelCopy.leftSideBenefitGraphic || '',
        tps_directions: labelCopy.directions || '',
        tps_growing_recommendations: labelCopy.growingRecommendations || '',
        qr_code_section: labelCopy.qrCodeSection || '',
        product_title: labelCopy.productTitle || '',
        center_benefit_statement: labelCopy.centerBenefitStatement || '',
        
        // Website tab data
        website_url: website.websiteUrl || labelCopy.website || '',
        website: website.websiteUrl || labelCopy.website || '',
        
        // Formula tab data (complete formula object from API)
        formula: {
          formulaName: formula.formulaName || essentialInfo.formulaName || '',
          category: formula.category || '',
          type: formula.type || '',
          filter: formula.filter || '',
          brands: formula.brands || {},
          tps: formula.tps || {},
          tpsNutrients: formula.tpsNutrients || {},
          bloomCity: formula.bloomCity || {},
          msds: formula.msds || finishedGoods.formula?.msds || ''
        },
        
        // Vine tab data
        vine_enrolled: vine.vineEnrolled || false,
        vine_status: vine.vineStatus || '',
        vine_notes: vine.vineNotes || '',
        vine_date: vine.vineDate || '',
        units_enrolled: vine.unitsEnrolled || '',
        vine_reviews: vine.vineReviews || '',
        star_rating: vine.starRating || '',
        
        // Variations (with all variation data)
        variations: variationSizes.length > 0 ? variationSizes : (productConfig.variations.length > 0 ? productConfig.variations : ['Default']),
        variationType: productConfig.variationType || 'size',
        allVariations: variations,
        variationsData: Object.keys(variationsDataMap).length > 0 
          ? variationsDataMap 
          : (apiProductData.variationsData || {})
      };
    }
    
    // Fallback to passed product data
    return {
      ...product,
      brand: product?.brand || '',
      brandFull: product?.brand || '',
      product: product?.product || 'Product Name',
      title: product?.title || `${product?.brand || ''} ${product?.product || ''}`.trim(),
      description: product?.description || '',
      bullets: product?.bullets || product?.bullet_points || '',
      bullet_points: product?.bullet_points || product?.bullets || '',
      dateAdded: product?.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
      marketplace: 'Amazon',
      salesAccount: product?.account || '',
      country: 'U.S.',
      type: product?.type || 'Product',
      variations: productConfig.variations.length > 0 ? productConfig.variations : ['Default'],
      variationType: productConfig.variationType || 'size',
      // Formula data for fallback
      formula: {
        formulaName: product?.formula_name || '',
        category: '',
        type: '',
        filter: '',
        brands: {},
        tps: {
          guaranteedAnalysis: product?.guaranteed_analysis || '',
          npk: product?.npk || '',
          derivedFrom: product?.derived_from || '',
          storageWarranty: product?.storage_warranty || ''
        },
        tpsNutrients: {},
        bloomCity: {},
        msds: product?.msds || ''
      }
    };
  }, [apiProductData, product, productConfig, isChildView, specificChildId]);

  const handleBack = () => {
    // Navigate back to the page that opened this detail (Design, Catalog, etc.)
    navigate(returnPath || '/dashboard/products/catalog');
  };

  const handleTemplateChange = (template) => {
    if (!product?.id) return;
    
    setShowTemplateMenu(false);
    
    // Apply all template configurations in order
    setActiveTemplate(product.id, template.id);
    setProductVariations(product.id, template.defaultVariations, template.variationType);
    
    if (template.enabledTabs && template.enabledTabs.length > 0) {
      setProductTabs(product.id, template.enabledTabs);
    }
    
    // Force component to re-render with new config
    setConfigVersion(prev => prev + 1);
    
    // Reset to first tab since available tabs may have changed
    if (template.enabledTabs && template.enabledTabs.length > 0) {
      setActiveTab(template.enabledTabs[0]);
    } else {
      setActiveTab('essential');
    }
    
    toast.success('Template applied!', {
      description: `Switched to "${template.name}" template`,
    });
  };

  // Get the active template for display
  const activeTemplateId = productConfig.activeTemplateId;
  const activeTemplate = activeTemplateId ? getProductTemplate(activeTemplateId) : null;

  const allTabs = [
    { id: 'essential', label: 'Essential Info', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', component: EssentialInfo },
    { id: 'ngoos', label: 'N-GOOS', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', component: Ngoos },
    { id: 'stock', label: 'Stock Image', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z', component: StockImage },
    { id: 'slides', label: 'Slides', icon: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z', component: Slides },
    { id: 'label-copy', label: 'Label Copy', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', component: LabelCopy },
    { id: 'label', label: 'Label', icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z', component: Label },
    { id: 'images', label: 'Product Images', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z', component: ProductImages },
    { id: 'aplus', label: 'A+ Content', icon: 'M12 4v16m8-8H4', component: APlusContent },
    { id: 'finishedGoods', label: 'Finished Goods Specs', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01', component: FinishedGoods },
    { id: 'pdpSetup', label: 'PDP Setup', icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4', component: PDPSetup },
    { id: 'website', label: 'Website', icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9', component: Website },
    { id: 'listing', label: 'Listing Setup', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', component: ListingSetup },
    { id: 'vine', label: 'Vine', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z', component: Vine },
    { id: 'formula', label: 'Formula', icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z', component: Formula },
  ];

  // Check if a tab has data available
  const hasTabData = useCallback((tabId) => {
    if (!apiProductData) return true; // Show all tabs if no API data yet
    
    switch(tabId) {
      case 'ngoos':
        // Only show N-GOOS for child products with ASIN
        return !!(apiProductData.essentialInfo?.childAsin || productData?.child_asin || productData?.childAsin);
      
      case 'slides':
        return !!(apiProductData.slides?.productImage || 
                 apiProductData.slides?.front || 
                 apiProductData.slides?.back || 
                 apiProductData.slides?.left || 
                 apiProductData.slides?.right || 
                 apiProductData.slides?.top || 
                 apiProductData.slides?.bottom);
      
      case 'aplus':
        return !!(apiProductData.aplus?.module1 || 
                 apiProductData.aplus?.module2 || 
                 apiProductData.aplus?.module3 || 
                 apiProductData.aplus?.module4);
      
      case 'finishedGoods':
        const fg = apiProductData.finishedGoods;
        return !!(fg?.packagingName || fg?.closureName || fg?.labelSize || 
                 fg?.unitsSold30Days || fg?.formula?.guaranteedAnalysis);
      
      case 'pdpSetup':
        const pdp = apiProductData.pdpSetup;
        return !!(pdp?.title || pdp?.bullets || pdp?.description || 
                 pdp?.searchTerms || pdp?.coreKeywords);
      
      case 'vine':
        return !!(apiProductData.vine?.vineEnrolled || apiProductData.vine?.vineNotes);
      
      case 'stock':
      case 'label-copy':
      case 'label':
      case 'images':
      case 'website':
      case 'listing':
      case 'formula':
        // These tabs may not have structured data in API response yet
        // Show them for now
        return true;
      
      case 'essential':
        // Always show essential info
        return true;
      
      default:
        return true;
    }
  }, [apiProductData]);

  // Filter tabs based on priority: product-specific template tabs > module tabs > all tabs
  const tabs = useMemo(() => {
    let filteredTabs = allTabs;
    
    // HIGHEST PRIORITY: Product-specific template configuration
    if (productConfig.enabledTabs && productConfig.enabledTabs.length > 0) {
      filteredTabs = allTabs.filter(tab => productConfig.enabledTabs.includes(tab.id));
      console.log('✅ Using product template tabs:', productConfig.enabledTabs);
    }
    // MEDIUM PRIORITY: Module-specific allowedTabs (e.g., Listing only shows certain tabs)
    else if (allowedTabs && allowedTabs.length > 0) {
      filteredTabs = allTabs.filter(tab => allowedTabs.includes(tab.id));
      console.log('📋 Using module-specific tabs:', allowedTabs);
    }
    // LOW PRIORITY: Show all tabs
    else {
      console.log('📌 Showing all tabs (no restrictions)');
    }
    
    // Filter out tabs without data
    filteredTabs = filteredTabs.filter(tab => hasTabData(tab.id));
    
    return filteredTabs;
  }, [productConfig.enabledTabs, allowedTabs, configVersion, hasTabData]); // Add configVersion to deps
  
  // Set active tab to the first available tab if current active tab is not in the list
  useEffect(() => {
    if (tabs.length > 0 && !tabs.some(tab => tab.id === activeTab)) {
      setActiveTab(tabs[0].id);
    }
  }, [tabs, activeTab]);

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || EssentialInfo;

  const themeClasses = {
    bg: isDarkMode ? 'bg-dark-bg-primary' : 'bg-light-bg-primary',
    cardBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-600',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-light-border-primary',
    activeTab: isDarkMode ? 'border-blue-500 text-blue-500 bg-blue-500/10' : 'border-blue-600 text-blue-600 bg-blue-50',
    inactiveTab: isDarkMode ? 'border-transparent text-dark-text-secondary hover:text-dark-text-primary hover:border-dark-border-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
  };

  // Show loading state while fetching data
  if (loading) {
    return (
      <div 
        className={themeClasses.bg}
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div className={themeClasses.text} style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>
            Loading product details...
          </div>
          <div className={themeClasses.textSecondary} style={{ fontSize: '0.875rem' }}>
            Please wait
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={themeClasses.bg}
      style={{
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Header - Aligned with Sidebar */}
      <div 
        className={`${themeClasses.cardBg} border-b ${themeClasses.border}`}
        style={{
          padding: '1rem 2rem',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Back Button */}
          <button
            onClick={handleBack}
            className={`${themeClasses.text}`}
            style={{
              padding: '0.5rem',
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
          >
            <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>

          {/* Brand Logo */}
          <img 
            src="/assets/logo.png" 
            alt="Brand Logo" 
            style={{ 
              width: '3rem', 
              height: '3rem',
              objectFit: 'contain'
            }} 
          />

          {/* Product Info */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className={themeClasses.text} style={{ fontSize: '1.125rem', fontWeight: 'bold' }}>
                {productData.brandFull}
              </span>
              <span className={themeClasses.textSecondary} style={{ fontSize: '1.125rem' }}>
                – {productData.product}
              </span>
            </div>
            <p className={themeClasses.textSecondary} style={{ fontSize: '0.75rem', marginTop: '0.125rem' }}>
              {productData.marketplace} • {productData.salesAccount} • {productData.variations.length} {productData.variationType}(s)
            </p>
          </div>

          {/* Template Selector */}
          {productTemplates && productTemplates.length > 0 && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowTemplateMenu(!showTemplateMenu)}
                className={`${themeClasses.text}`}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s',
                  backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                  border: isDarkMode ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  minWidth: '200px',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.1)';
                }}
              >
                <svg style={{ width: '1rem', height: '1rem', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
                <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {activeTemplate ? activeTemplate.name : 'Select Template'}
                </span>
                <svg style={{ width: '1rem', height: '1rem', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Template Dropdown */}
              {showTemplateMenu && (
                <>
                  <div 
                    style={{
                      position: 'fixed',
                      inset: 0,
                      zIndex: 40
                    }}
                    onClick={() => setShowTemplateMenu(false)}
                  />
                  <div
                    className={`${themeClasses.cardBg} ${themeClasses.border}`}
                    style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: '0.5rem',
                      minWidth: '250px',
                      borderRadius: '0.5rem',
                      border: '1px solid',
                      boxShadow: isDarkMode ? '0 10px 25px rgba(0,0,0,0.5)' : '0 10px 25px rgba(0,0,0,0.1)',
                      zIndex: 50,
                      maxHeight: '400px',
                      overflowY: 'auto'
                    }}
                  >
                    <div style={{ padding: '0.5rem' }}>
                      <div style={{ 
                        padding: '0.5rem 0.75rem', 
                        fontSize: '0.75rem', 
                        fontWeight: '600',
                        color: isDarkMode ? '#9ca3af' : '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        Active Template
                      </div>
                      {productTemplates.map((template) => {
                        const isActive = activeTemplateId === template.id;
                        return (
                          <button
                            key={template.id}
                            onClick={() => handleTemplateChange(template)}
                            className={themeClasses.text}
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              textAlign: 'left',
                              borderRadius: '0.375rem',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.25rem',
                              transition: 'all 0.2s',
                              backgroundColor: isActive 
                                ? (isDarkMode ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)')
                                : 'transparent',
                              border: isActive 
                                ? `1px solid ${isDarkMode ? 'rgba(59, 130, 246, 0.4)' : 'rgba(59, 130, 246, 0.3)'}`
                                : '1px solid transparent'
                            }}
                            onMouseEnter={(e) => {
                              if (!isActive) {
                                e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isActive) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontWeight: '500', fontSize: '0.875rem', flex: 1 }}>
                                {template.name}
                              </span>
                              {isActive && (
                                <svg style={{ width: '1rem', height: '1rem', color: '#3b82f6' }} fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                            <div className={themeClasses.textSecondary} style={{ fontSize: '0.75rem' }}>
                              {template.variationType} • {template.defaultVariations.length} variations • {template.enabledTabs?.length || 0} tabs
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div 
        className={`${themeClasses.cardBg} border-b ${themeClasses.border} scrollbar-hide`}
        style={{
          flexShrink: 0,
          overflowX: 'auto',
          overflowY: 'hidden',
          cursor: 'grab',
        }}
        ref={tabsContainerRef}
        onMouseDown={(e) => {
          const el = tabsContainerRef.current;
          if (!el) return;
          isDraggingRef.current = true;
          startXRef.current = e.pageX - el.offsetLeft;
          scrollLeftRef.current = el.scrollLeft;
          el.style.cursor = 'grabbing';
        }}
        onMouseLeave={() => {
          const el = tabsContainerRef.current;
          isDraggingRef.current = false;
          if (el) el.style.cursor = 'grab';
        }}
        onMouseUp={() => {
          const el = tabsContainerRef.current;
          isDraggingRef.current = false;
          if (el) el.style.cursor = 'grab';
        }}
        onMouseMove={(e) => {
          const el = tabsContainerRef.current;
          if (!isDraggingRef.current || !el) return;
          e.preventDefault();
          const x = e.pageX - el.offsetLeft;
          const walk = x - startXRef.current;
          el.scrollLeft = scrollLeftRef.current - walk;
        }}
      >
        <div style={{ 
          display: 'flex', 
          gap: '0', 
          padding: '0 2rem',
          minWidth: 'max-content'
        }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-all whitespace-nowrap
                ${activeTab === tab.id ? themeClasses.activeTab : themeClasses.inactiveTab}
              `}
            >
              <svg style={{ width: '1.125rem', height: '1.125rem', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
              </svg>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content - minHeight: 0 so flex can shrink on small screens; extra paddingBottom so footer/content doesn't overlap */}
      <div 
        className="custom-scrollbar scrollbar-hide"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '2rem',
          paddingBottom: '3rem'
        }}
      >
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <ActiveComponent data={productData} />
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
