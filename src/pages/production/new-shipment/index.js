import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { createShipment, getShipmentById, updateShipment, addShipmentProducts, getShipmentProducts, getShipmentFormulaCheck, getLabelsAvailability, updateShipmentFormulaCheck, updateShipmentProductLabelCheck } from '../../../services/productionApi';
import CatalogAPI from '../../../services/catalogApi';
import NgoosAPI from '../../../services/ngoosApi';
import { extractFileId, getDriveImageUrl } from '../../../services/googleDriveApi';
import NewShipmentHeader from './components/NewShipmentHeader';
import NewShipmentTable from './components/NewShipmentTable';
import SortProductsTable from './components/SortProductsTable';
import SortFormulasTable from './components/SortFormulasTable';
import FormulaCheckTable from './components/FormulaCheckTable';
import LabelCheckTable from './components/LabelCheckTable';
import ShinersView from './components/ShinersView';
import SellablesView from './components/SellablesView';
import UnusedFormulasView from './components/UnusedFormulasView';
import NgoosModal from './components/NgoosModal';
import ShipmentDetailsModal from './components/ShipmentDetailsModal';
import ExportTemplateModal from './components/ExportTemplateModal';
import SortProductsCompleteModal from './components/SortProductsCompleteModal';
import SortFormulasCompleteModal from './components/SortFormulasCompleteModal';
import VarianceExceededModal from './components/VarianceExceededModal';
import UncheckedFormulaModal from './components/UncheckedFormulaModal';
import FormulaCheckCommentModal from './components/FormulaCheckCommentModal';
import LabelCheckCommentModal from './components/LabelCheckCommentModal';
import LabelCheckCompleteModal from './components/LabelCheckCompleteModal';
import FormulaCheckCompleteModal from './components/FormulaCheckCompleteModal';

// Utility function to handle Google Drive image URLs
const getImageUrl = (url) => {
  if (!url) return null;
  
  // Check if URL is from Google Drive
  if (typeof url === 'string' && url.includes('drive.google.com')) {
    // Extract file ID and convert to direct image URL
    const fileId = extractFileId(url);
    if (fileId) {
      return getDriveImageUrl(fileId);
    }
  }
  
  // Return original URL if not a Drive URL
  return url;
};

// Account to Brand mapping based on Amazon Seller Account Structure
// Each account can only sell specific brands
const ACCOUNT_BRAND_MAPPING = {
  'TPS Nutrients': ['TPS Nutrients', 'Bloom City', 'TPS Plant Foods'],
  'Total Pest Spray': ['NatureStop', 'GreenThumbs'],
};

// Get allowed brands for an account
const getAllowedBrandsForAccount = (account) => {
  return ACCOUNT_BRAND_MAPPING[account] || [];
};

const knownCarriers = ['WeShip', 'TopCarrier', 'Worldwide Express'];

const NewShipment = () => {
  const { isDarkMode } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [shipmentId, setShipmentId] = useState(id || null);
  const [loading, setLoading] = useState(false);
  const [isNgoosOpen, setIsNgoosOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [isShipmentDetailsOpen, setIsShipmentDetailsOpen] = useState(false);
  const [isExportTemplateOpen, setIsExportTemplateOpen] = useState(false);
  const [isSortProductsCompleteOpen, setIsSortProductsCompleteOpen] = useState(false);
  const [isSortFormulasCompleteOpen, setIsSortFormulasCompleteOpen] = useState(false);
  const [isBookShipmentCompleteOpen, setIsBookShipmentCompleteOpen] = useState(false);
  const [isVarianceExceededOpen, setIsVarianceExceededOpen] = useState(false);
  const [varianceCount, setVarianceCount] = useState(0);
  const [isUncheckedFormulaOpen, setIsUncheckedFormulaOpen] = useState(false);
  const [uncheckedFormulaCount, setUncheckedFormulaCount] = useState(0);
  const [isFormulaCheckCommentOpen, setIsFormulaCheckCommentOpen] = useState(false);
  const [isFormulaIncompleteComment, setIsFormulaIncompleteComment] = useState(false);
  const [formulaCheckHasComment, setFormulaCheckHasComment] = useState(false);
  const [isLabelCheckCommentOpen, setIsLabelCheckCommentOpen] = useState(false);
  const [isLabelIncompleteComment, setIsLabelIncompleteComment] = useState(false);
  const [labelCheckHasComment, setLabelCheckHasComment] = useState(false);
  const [isLabelCheckCompleteOpen, setIsLabelCheckCompleteOpen] = useState(false);
  const [isFormulaCheckCompleteOpen, setIsFormulaCheckCompleteOpen] = useState(false);
  const [selectedCarrier, setSelectedCarrier] = useState('');
  const [isCarrierDropdownOpen, setIsCarrierDropdownOpen] = useState(false);
  const [customCarrierName, setCustomCarrierName] = useState('');
  const carrierDropdownRef = useRef(null);
  const carrierButtonRef = useRef(null);
  const [carrierDropdownPos, setCarrierDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const [isRecountMode, setIsRecountMode] = useState(false);
  const [varianceExceededRowIds, setVarianceExceededRowIds] = useState([]);
  const [labelCheckRows, setLabelCheckRows] = useState([]);
  const [formulaCheckData, setFormulaCheckData] = useState({ total: 0, completed: 0, remaining: 0 });
  const [formulaSelectedRows, setFormulaSelectedRows] = useState(new Set());
  const [formulaCheckRefreshKey, setFormulaCheckRefreshKey] = useState(0);
  const [labelCheckRefreshKey, setLabelCheckRefreshKey] = useState(0);
  const [checkAllIncompleteTrigger, setCheckAllIncompleteTrigger] = useState(0);
  const [labelCheckData, setLabelCheckData] = useState({ total: 0, completed: 0, remaining: 0 });
  const [shipmentProducts, setShipmentProducts] = useState([]); // Products loaded from existing shipment
  const [tableMode, setTableMode] = useState(false);
  const [activeAction, setActiveAction] = useState('add-products');
  const [completedTabs, setCompletedTabs] = useState(new Set());
  const [addedRows, setAddedRows] = useState(new Set());
  const [firstAccessedTab, setFirstAccessedTab] = useState(null); // Track which tab (label-check or formula-check) was accessed first
  const [isFloorInventoryOpen, setIsFloorInventoryOpen] = useState(false);
  const [selectedFloorInventory, setSelectedFloorInventory] = useState(null);
  const [activeView, setActiveView] = useState('all-products'); // 'all-products' or 'floor-inventory'
  const floorInventoryRef = useRef(null);
  const floorInventoryButtonRef = useRef(null);
  const [floorInventoryPosition, setFloorInventoryPosition] = useState({ top: 0, left: 0 });
  const [labelsAvailabilityMap, setLabelsAvailabilityMap] = useState({}); // Map of label_location -> available labels
  const [isBookShipmentHovered, setIsBookShipmentHovered] = useState(false);
  const bookShipmentButtonRef = useRef(null);
  const [bookShipmentTooltipPosition, setBookShipmentTooltipPosition] = useState({ top: 0, left: 0 });
  const [exportCompleted, setExportCompleted] = useState(false);
  const [forecastRange, setForecastRange] = useState('150');
  const [showDOITooltip, setShowDOITooltip] = useState(false);
  const [isTooltipPinned, setIsTooltipPinned] = useState(false);
  const [showDateCalculationInfo, setShowDateCalculationInfo] = useState(false);
  const doiIconRef = useRef(null);
  const doiTooltipRef = useRef(null);

  // Hide header action menu for existing shipments or when in label-check tab
  const hideActionsDropdown = Boolean(location.state?.existingShipment || shipmentId || activeAction === 'label-check');
  // Hide label check header when creating new shipment from planning or viewing an existing shipment
  const hideLabelCheckHeader = Boolean(location.state?.existingShipment || location.state?.fromPlanning || shipmentId);

  // Track label-check completion counts
  // A row is complete if it was either confirmed (quick check) or counted (detailed verify)
  const labelCheckCompletedCount = useMemo(() => (
    labelCheckRows.filter(row => 
      row.isComplete || // New: explicit completion flag from LabelCheckTable
      (row.totalCount !== '' && row.totalCount !== null && row.totalCount !== undefined) // Legacy: totalCount set
    ).length
  ), [labelCheckRows]);
  const totalLabelCheckRows = labelCheckRows.length;
  const labelCheckRemainingCount = totalLabelCheckRows - labelCheckCompletedCount;
  const isLabelCheckReadyToComplete = totalLabelCheckRows > 0 && labelCheckRemainingCount === 0;

  // REMOVED: Auto-complete label check when all products are checked
  // This was causing automatic navigation to planning table when the last row was completed,
  // even if the user didn't click the "Complete" button in the footer.
  // Users must now manually click the "Complete" button to finish the label check step.
  // useEffect(() => {
  //   // Only auto-complete if:
  //   // 1. We have products to check
  //   // 2. All products are completed
  //   // 3. Label check is not already marked as completed
  //   // 4. We have a shipmentId
  //   // 5. We're currently on the label-check step
  //   if (
  //     shipmentId &&
  //     activeAction === 'label-check' &&
  //     isLabelCheckReadyToComplete &&
  //     !completedTabs.has('label-check') &&
  //     totalLabelCheckRows > 0
  //   ) {
  //     // Check for variance/incomplete status - if any row is insufficient, mark as incomplete
  //     const hasVariance = labelCheckRows.some(row => {
  //       // A row is incomplete if it's counted and has insufficient labels
  //       return row.isCounted && row.isInsufficient === true;
  //     });
  //     
  //     // Auto-complete the label check step (only once)
  //     const autoComplete = async () => {
  //       try {
  //         await completeLabelCheck('', hasVariance);
  //       } catch (error) {
  //         console.error('Error auto-completing label check:', error);
  //       }
  //     };
  //     autoComplete();
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [isLabelCheckReadyToComplete, shipmentId, activeAction, completedTabs, totalLabelCheckRows, labelCheckRows]);

  // Close tooltip when clicking outside if it's pinned
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isTooltipPinned && showDOITooltip) {
        const isClickInsideIcon = doiIconRef.current?.contains(event.target);
        const isClickInsideTooltip = doiTooltipRef.current?.contains(event.target);
        
        if (!isClickInsideIcon && !isClickInsideTooltip) {
          setShowDOITooltip(false);
          setIsTooltipPinned(false);
        }
      }
    };

    if (isTooltipPinned && showDOITooltip) {
      const timeoutId = setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);
      
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [isTooltipPinned, showDOITooltip]);

  // Close carrier dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!isCarrierDropdownOpen) return;

      const clickedInsideButton = carrierButtonRef.current?.contains(e.target);
      const clickedInsideDropdown = carrierDropdownRef.current?.contains(e.target);

      if (!clickedInsideButton && !clickedInsideDropdown) {
        setIsCarrierDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCarrierDropdownOpen]);

  // Keep carrier dropdown aligned with trigger
  useEffect(() => {
    if (!isCarrierDropdownOpen || !carrierButtonRef.current) return;
    const rect = carrierButtonRef.current.getBoundingClientRect();
    setCarrierDropdownPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, [isCarrierDropdownOpen]);
  
  // Generate unique shipment number
  const generateShipmentNumber = () => {
    return new Date().toISOString().split('T')[0].replace(/-/g, '.') + '-' + Date.now().toString().slice(-6);
  };

  const handleCarrierSelect = (carrier) => {
    setSelectedCarrier(carrier);
    setIsCarrierDropdownOpen(false);
    setCustomCarrierName('');
  };

  const handleUseCustomCarrier = () => {
    const trimmedName = customCarrierName.trim();
    if (!trimmedName) return;
    setSelectedCarrier(trimmedName);
    setCustomCarrierName('');
    setIsCarrierDropdownOpen(false);
  };

  const [shipmentData, setShipmentData] = useState({
    shipmentNumber: generateShipmentNumber(),
    shipmentDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
    shipmentType: '', // Only set after user selects FBA or AWD in export template
    location: '',
    account: 'TPS Nutrients',
    shipFrom: '',
    shipTo: '',
    amazonShipmentNumber: '', // Only set after shipment type is selected
    amazonRefId: 'XXXXXXXX',
  });
  const [dataAsOfDate, setDataAsOfDate] = useState(new Date()); // Track when data was loaded
  
  // Helper function to get Amazon Shipment # format based on shipment type
  const getAmazonShipmentFormat = (type) => {
    if (type === 'FBA' || type === 'Parcel') {
      return 'FBAXXXXXXXXX';
    } else if (type === 'AWD') {
      return 'STAR-XXXXXXXXXXXXX';
    }
    return 'FBAXXXXXXXXX'; // Default
  };
  
  // Update Amazon Shipment # format when shipment type changes (only if type is set)
  useEffect(() => {
    if (shipmentData.shipmentType) {
      const format = getAmazonShipmentFormat(shipmentData.shipmentType);
      if (shipmentData.amazonShipmentNumber !== format) {
        setShipmentData(prev => ({
          ...prev,
          amazonShipmentNumber: format,
        }));
      }
    }
  }, [shipmentData.shipmentType]);

  // Load products from catalog - reload when shipment ID changes (new shipment vs editing)
  useEffect(() => {
    loadProducts();
  }, [id]); // Re-run when ID changes to get fresh labels availability

  // Reset shipment number for new shipments (when no ID in route)
  // Also read account from navigation state if coming from Planning modal
  useEffect(() => {
    if (!id) {
      // Check if we have shipment data from navigation (from Planning modal)
      const navShipmentData = location.state?.shipmentData;
      
      setShipmentData(prev => ({
        ...prev,
        shipmentNumber: navShipmentData?.shipmentName || generateShipmentNumber(),
        shipmentDate: new Date().toISOString().split('T')[0],
        account: navShipmentData?.account || prev.account || 'TPS Nutrients',
        marketplace: navShipmentData?.marketplace || prev.marketplace || 'Amazon',
        shipFrom: navShipmentData?.shipFrom || prev.shipFrom || '',
        shipTo: navShipmentData?.shipTo || prev.shipTo || '',
      }));
    }
  }, [id, location.state]); // Re-run when ID or navigation state changes

  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      
      // Load Amazon forecast data, production supply chain data, and labels availability
      // Use production inventory as PRIMARY source (all products from our database)
      // Merge in forecast data where available
      const [planningData, productionInventory, labelsAvailability] = await Promise.all([
        NgoosAPI.getPlanning(1, 5000), // Increase limit for forecast data
        import('../../../services/productionApi').then(api => api.getProductsInventory()),
        getLabelsAvailability(shipmentId) // Pass shipment ID to exclude current shipment
      ]);
      
      console.log('Loaded planning data:', planningData.products?.length || 0, 'products with forecast');
      console.log('Loaded production inventory:', productionInventory.length, 'total products from database');
      console.log('Loaded labels availability:', Object.keys(labelsAvailability.byLocation || {}).length, 'label locations');
      
      // Store labels availability map
      setLabelsAvailabilityMap(labelsAvailability.byLocation || {});
      
      if (productionInventory.length > 0) {
        console.log('Sample production item:', productionInventory[0]);
      }
      
      // Create lookup for forecast data by ASIN
      const forecastMap = {};
      (planningData.products || []).forEach(item => {
        if (item.asin) {
          forecastMap[item.asin] = item;
        }
      });
      
      console.log('Forecast map has', Object.keys(forecastMap).length, 'entries');
      
      // DEDUPLICATE products by child_asin to prevent React key errors
      // Keep the first occurrence of each ASIN (or use database ID for products without ASIN)
      const seenAsins = new Set();
      const uniqueProducts = productionInventory.filter(item => {
        const key = item.child_asin || `db-${item.id}`;
        if (seenAsins.has(key)) {
          console.log(`Duplicate product skipped: ${item.product_name} (${key})`);
          return false;
        }
        seenAsins.add(key);
        return true;
      });
      
      console.log(`Deduplicated: ${productionInventory.length} → ${uniqueProducts.length} products`);
      
      // USE PRODUCTION INVENTORY AS PRIMARY SOURCE (all products from our database)
      // This ensures we show ALL products, not just those with forecast data
      const formattedProducts = uniqueProducts.map((item, index) => {
        // Get forecast data for this product if available
        const forecast = forecastMap[item.child_asin] || {};
        
        // Get sales data from forecast API if available
        const salesData = forecast.sales_30_day || item.units_sold_30_days || 0;
        const sales7Day = forecast.sales_7_day || 0;
        
        // Calculate DOI based on sales data
        let calculatedDoiTotal = forecast.doi_total || 0;
        let calculatedDoiFba = forecast.doi_fba || 0;
        
        // If DOI not provided or zero, calculate from sales
        if (calculatedDoiTotal === 0 && salesData > 0) {
          const dailySales = salesData / 30.0;
          const totalInventory = forecast.inventory || item.bottle_inventory || 0;
          calculatedDoiTotal = Math.round(totalInventory / dailySales);
          
          // Estimate FBA Available as ~50% of total
          const estimatedFbaAvailable = totalInventory * 0.5;
          calculatedDoiFba = Math.round(estimatedFbaAvailable / dailySales);
        }
        
        // Ensure FBA DOI is always <= Total DOI and differentiate them
        if (calculatedDoiFba === calculatedDoiTotal && calculatedDoiTotal > 0) {
          calculatedDoiFba = Math.round(calculatedDoiTotal * 0.5);
        } else if (calculatedDoiFba === 0 && calculatedDoiTotal > 0) {
          calculatedDoiFba = Math.round(calculatedDoiTotal * 0.5);
        } else if (calculatedDoiFba > calculatedDoiTotal) {
          calculatedDoiFba = calculatedDoiTotal;
        }
        
        // Calculate forecast (use ML forecast or fallback to recent sales trend)
        let weeklyForecast = forecast.weekly_forecast || 0;
        if (weeklyForecast === 0 && salesData > 0) {
          weeklyForecast = (salesData / 30) * 7; // Convert daily avg to weekly
        }
        
        return {
          id: `${item.id}-${index}`, // Unique key combining DB ID and index
          catalogId: item.id,
          brand: item.brand_name || forecast.brand || '',
          product: item.product_name || forecast.product || '',
          size: item.size || forecast.size || '',
          childAsin: item.child_asin || '',
          childSku: item.child_sku_final || '',
          marketplace: 'Amazon',
          account: 'TPS Nutrients',
          // Image data - check multiple possible field names and convert Drive URLs
          mainImage: getImageUrl(item.mainImage || item.product_image_url || item.productImage || item.image || item.productImageUrl || null),
          product_image_url: getImageUrl(item.product_image_url || item.mainImage || item.productImage || item.image || item.productImageUrl || null),
          productImage: getImageUrl(item.productImage || item.mainImage || item.product_image_url || item.image || item.productImageUrl || null),
          image: getImageUrl(item.image || item.mainImage || item.product_image_url || item.productImage || item.productImageUrl || null),
          // Inventory/DOI data - merge forecast with database
          fbaAvailable: Math.round((forecast.inventory || 0) * 0.5),
          totalInventory: forecast.inventory || 0,
          forecast: Math.round(weeklyForecast),
          daysOfInventory: calculatedDoiTotal,
          doiFba: calculatedDoiFba,
          doiTotal: calculatedDoiTotal,
          sales7Day: sales7Day,
          sales30Day: salesData,
          weeklyForecast: weeklyForecast,
          // Supply chain data from production inventory (database)
          bottle_name: item.bottle_name || '',
          formula_name: item.formula_name || '',
          closure_name: item.closure_name || '',
          label_location: item.label_location || '',
          label_size: item.label_size || '',
          case_size: '',
          units_per_case: item.finished_units_per_case || item.units_per_case || 60,
          // Supply chain inventory levels
          bottleInventory: item.bottle_inventory || 0,
          closureInventory: item.closure_inventory || 0,
          labelsAvailable: item.label_inventory || 0,
          label_inventory: item.label_inventory || 0, // Also include as label_inventory
          formulaGallonsAvailable: item.formula_gallons_available || 0,
          formulaGallonsPerUnit: item.gallons_per_unit || 0,
          maxUnitsProducible: item.max_units_producible || 0,
          // Packaging calculation fields (for pallets, weight, time)
          box_weight_lbs: parseFloat(item.box_weight_lbs) || 0,
          boxes_per_pallet: parseFloat(item.boxes_per_pallet) || 50,
          single_box_pallet_share: parseFloat(item.single_box_pallet_share) || 0.02,
          bottles_per_minute: parseInt(item.bottles_per_minute) || 20,
          finished_units_per_case: parseInt(item.finished_units_per_case) || 60,
        };
      });
      
      console.log('Loaded products with supply chain:', formattedProducts.length);
      
      // Calculate suggested qty for each product based on forecast
      // Formula: unitsNeeded = (targetDOI - currentDOI) * dailySalesRate
      // Then round up to nearest units_per_case
      const productsWithSuggestedQty = formattedProducts.map(product => {
        const dailySalesRate = (product.sales30Day || 0) / 30;
        const currentDOI = product.doiTotal || product.daysOfInventory || 0;
        const targetDOI = parseInt(forecastRange) || 120;
        const unitsPerCase = product.units_per_case || 60;
        
        let suggestedQty = 0;
        
        // Only calculate if there are sales and we're below target DOI
        if (dailySalesRate > 0 && currentDOI < targetDOI) {
          const daysNeeded = targetDOI - currentDOI;
          const rawUnitsNeeded = daysNeeded * dailySalesRate;
          
          // Round up to nearest units_per_case (case pack)
          suggestedQty = Math.ceil(rawUnitsNeeded / unitsPerCase) * unitsPerCase;
          
          // Ensure minimum of 1 case if there's any need
          if (suggestedQty === 0 && rawUnitsNeeded > 0) {
            suggestedQty = unitsPerCase;
          }
        }
        
        return {
          ...product,
          suggestedQty,
        };
      });
      
      // Sort by DOI ascending (lowest DOI first = most urgent)
      // Products with sales but low DOI need to be prioritized
      const sortedProducts = productsWithSuggestedQty.sort((a, b) => {
        // First: items with sales > 0 come first
        const aHasSales = a.sales30Day > 0 ? 0 : 1;
        const bHasSales = b.sales30Day > 0 ? 0 : 1;
        if (aHasSales !== bHasSales) return aHasSales - bHasSales;
        
        // Second: sort by DOI ascending (lowest DOI = most urgent)
        const aDOI = a.doiTotal || a.daysOfInventory || 999;
        const bDOI = b.doiTotal || b.daysOfInventory || 999;
        if (aDOI !== bDOI) return aDOI - bDOI;
        
        // Third: higher sales first (as tiebreaker)
        return (b.sales30Day || 0) - (a.sales30Day || 0);
      });
      
      // Store all products (unfiltered) for account switching
      setAllProducts(sortedProducts);
      
      // Filter by account's allowed brands
      const allowedBrands = getAllowedBrandsForAccount(shipmentData.account);
      const filteredProducts = allowedBrands.length > 0 
        ? sortedProducts.filter(p => allowedBrands.includes(p.brand))
        : sortedProducts;
      
      setProducts(filteredProducts);
      setDataAsOfDate(new Date()); // Mark data as fresh
      
      console.log(`✅ Loaded ${sortedProducts.length} total products from database`);
      console.log(`✅ Showing ${filteredProducts.length} products after account filter (${shipmentData.account})`);
      console.log(`✅ Products with forecast data: ${Object.keys(forecastMap).length}`);
      
      // Initialize qty values with suggested quantities for FILTERED products
      // Use filtered products indices since that's what the table displays
      const initialQtyValues = {};
      filteredProducts.forEach((product, index) => {
        // Auto-populate qty with suggested qty if product needs restocking
        if (product.suggestedQty > 0) {
          initialQtyValues[index] = product.suggestedQty;
        }
      });
      setQtyValues(initialQtyValues);
      
      // Initialize lastAccount to prevent reset on first account filter useEffect run
      setLastAccount(shipmentData.account);
    } catch (error) {
      console.error('Error loading products:', error);
      alert('Failed to load products: ' + error.message);
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  // Handle navigation from Planning table - set shipment ID first
  useEffect(() => {
    if (location.state?.existingShipment && location.state.shipmentId) {
      // Set the shipment ID - this will trigger loadShipment via the next useEffect
      setShipmentId(location.state.shipmentId);
      
      // Set initial action if provided
      if (location.state.initialAction && location.state.initialAction !== 'completed') {
        handleActionChange(location.state.initialAction);
      }
    }
  }, [location.state]);

  // Load existing shipment when shipmentId is set
  useEffect(() => {
    // Reset per-shipment selections when switching shipments
    setFormulaSelectedRows(new Set());

    if (shipmentId) {
      loadShipment();
    } else if (location.state?.shipmentData) {
      setShipmentData(location.state.shipmentData);
    }
  }, [shipmentId]);

  // Update shipment status when navigating to workflow steps
  useEffect(() => {
    if (!shipmentId) return;

    const statusMap = {
      'label-check': 'label_check',
      'formula-check': 'formula_check',
      'book-shipment': 'book_shipment',
      'sort-products': 'sort_products',
      'sort-formulas': 'sort_formulas',
    };

    const newStatus = statusMap[activeAction];
    if (newStatus) {
      // Update shipment status to reflect current workflow step
      updateShipment(shipmentId, { status: newStatus })
        .then(() => {
          console.log(`Shipment status updated to: ${newStatus}`);
        })
        .catch(error => {
          console.error('Error updating shipment status:', error);
        });
    }
  }, [activeAction, shipmentId]);

  const loadShipment = async () => {
    try {
      setLoading(true);
      const data = await getShipmentById(shipmentId);
      setShipmentData({
        shipmentNumber: data.shipment_number,
        shipmentDate: data.shipment_date || new Date().toISOString().split('T')[0],
        shipmentType: data.shipment_type,
        location: data.location || '',
        account: data.account || 'TPS Nutrients',
        shipFrom: data.ship_from || data.location || '',
        shipTo: data.ship_to || '',
        amazonShipmentNumber: data.amazon_shipment_number || getAmazonShipmentFormat(data.shipment_type),
        amazonRefId: data.amazon_ref_id || '',
        carrier: data.carrier || '',
      });
      setSelectedCarrier(data.carrier || '');
      
      // Set completed tabs
      const completed = new Set();
      if (data.add_products_completed) completed.add('add-products');
      if (data.formula_check_completed) completed.add('formula-check');
      if (data.label_check_completed) completed.add('label-check');
      // Backend may not have book_shipment_completed column; infer from status
      if (data.book_shipment_completed || data.status === 'sort_products' || data.status === 'sort_formulas') {
        completed.add('book-shipment');
      }
      if (data.sort_products_completed) completed.add('sort-products');
      if (data.sort_formulas_completed) completed.add('sort-formulas');
      setCompletedTabs(completed);
      
      // Set comment flags from backend data
      if (data.formula_check_comment) {
        setFormulaCheckHasComment(true);
      }
      if (data.label_check_comment) {
        setLabelCheckHasComment(true);
      }
      
      // Load products and quantities
      if (data.products && data.products.length > 0) {
        // Transform products to Set of IDs for addedRows
        const addedProductIds = new Set(data.products.map(p => p.catalog_id));
        setAddedRows(addedProductIds);
        
        // Store shipment products for quantity mapping
        // Will be mapped to qtyValues once products are loaded
        setShipmentProducts(data.products);
      }
    } catch (error) {
      console.error('Error loading shipment:', error);
      alert('Failed to load shipment');
    } finally {
      setLoading(false);
    }
  };

  const themeClasses = {
    pageBg: isDarkMode ? 'bg-dark-bg-primary' : 'bg-light-bg-primary',
  };

  // Load products from API
  const [allProducts, setAllProducts] = useState([]); // Unfiltered products (all brands)
  const [products, setProducts] = useState([]); // Filtered by account's allowed brands
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [qtyValues, setQtyValues] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [lastAccount, setLastAccount] = useState(null); // Track account changes
  const [lastForecastRange, setLastForecastRange] = useState(null); // Track forecastRange changes
  
  // Re-filter products when account changes (but NOT on initial load)
  useEffect(() => {
    // Skip if no products loaded yet or if this is initial load (lastAccount not set)
    if (allProducts.length === 0 || lastAccount === null) {
      return;
    }
    
    // Only re-filter if account actually changed
    if (lastAccount !== shipmentData.account) {
      const allowedBrands = getAllowedBrandsForAccount(shipmentData.account);
      const filteredProducts = allowedBrands.length > 0 
        ? allProducts.filter(p => allowedBrands.includes(p.brand))
        : allProducts;
      
      setProducts(filteredProducts);
      
      // Rebuild qty values for the new filtered products
      const newQtyValues = {};
      filteredProducts.forEach((product, index) => {
        if (product.suggestedQty > 0) {
          newQtyValues[index] = product.suggestedQty;
        }
      });
      setQtyValues(newQtyValues);
      setAddedRows(new Set());
      
      // Track the current account
      setLastAccount(shipmentData.account);
      
      console.log(`Account changed from "${lastAccount}" to "${shipmentData.account}".`);
      console.log(`Showing ${filteredProducts.length} of ${allProducts.length} products`);
    }
  }, [shipmentData.account, allProducts, lastAccount]);

  // Map shipment products to qtyValues once products are loaded
  useEffect(() => {
    if (shipmentProducts.length > 0 && products.length > 0) {
      // Create a map of catalog_id -> quantity from shipment products
      const shipmentQtyMap = {};
      shipmentProducts.forEach(sp => {
        shipmentQtyMap[sp.catalog_id] = sp.quantity;
      });
      
      // Map to qtyValues using product index - match by catalogId (same as when saving)
      const newQtyValues = {};
      products.forEach((product, index) => {
        // Match by catalogId first (primary key used when saving), fall back to id (ASIN)
        const matchKey = product.catalogId || product.id;
        if (shipmentQtyMap[matchKey] !== undefined) {
          newQtyValues[index] = shipmentQtyMap[matchKey];
        }
      });
      
      if (Object.keys(newQtyValues).length > 0) {
        setQtyValues(newQtyValues);
        // Also mark these products as added
        const addedIds = new Set();
        products.forEach((product) => {
          const matchKey = product.catalogId || product.id;
          if (shipmentQtyMap[matchKey] !== undefined) {
            addedIds.add(product.id);
          }
        });
        setAddedRows(addedIds);
      }
    }
  }, [shipmentProducts, products]);

  // Recalculate suggested quantities when forecastRange changes (but NOT on initial load)
  useEffect(() => {
    // Skip if no products or if this is an existing shipment
    if (products.length === 0 || shipmentId) {
      return;
    }
    
    // Skip initial load - only recalculate when forecastRange actually CHANGES
    if (lastForecastRange === null) {
      setLastForecastRange(forecastRange);
      return;
    }
    
    // Skip if forecastRange hasn't changed
    if (lastForecastRange === forecastRange) {
      return;
    }
    
    console.log(`ForecastRange changed from ${lastForecastRange} to ${forecastRange}. Recalculating QTY values.`);
    setLastForecastRange(forecastRange);
    
    const targetDOI = parseInt(forecastRange) || 120;
    
    const newQtyValues = {};
    products.forEach((product, index) => {
      // Only update qty for products that haven't been manually added yet
      if (!addedRows.has(product.id)) {
        const dailySalesRate = (product.sales30Day || 0) / 30;
        const currentDOI = product.doiTotal || product.daysOfInventory || 0;
        const unitsPerCase = product.units_per_case || 60;
        
        let suggestedQty = 0;
        
        if (dailySalesRate > 0 && currentDOI < targetDOI) {
          const daysNeeded = targetDOI - currentDOI;
          const rawUnitsNeeded = daysNeeded * dailySalesRate;
          
          // Round up to nearest units_per_case (case pack)
          suggestedQty = Math.ceil(rawUnitsNeeded / unitsPerCase) * unitsPerCase;
          
          if (suggestedQty === 0 && rawUnitsNeeded > 0) {
            suggestedQty = unitsPerCase;
          }
        }
        
        if (suggestedQty > 0) {
          newQtyValues[index] = suggestedQty;
        }
      } else {
        // Keep existing quantity for already added products
        if (qtyValues[index] !== undefined) {
          newQtyValues[index] = qtyValues[index];
        }
      }
    });
    
    setQtyValues(newQtyValues);
  }, [forecastRange, products.length, lastForecastRange, addedRows, qtyValues, shipmentId, products]);

  // Compute the list of products for Sort Products and Sort Formulas tabs
  // This ensures all added products are included regardless of data source
  const productsForSortTabs = useMemo(() => {
    // If we have shipmentProducts from an existing shipment, use them directly
    if (shipmentProducts && shipmentProducts.length > 0) {
      // Transform shipment products to match the expected format
      return shipmentProducts.map(sp => ({
        id: sp.catalog_id,
        catalogId: sp.catalog_id,
        brand: sp.brand_name || '',
        product: sp.product_name || '',
        size: sp.size || '',
        qty: sp.quantity || 0,
        formula: sp.formula_name || '',
        formula_name: sp.formula_name || '',
        childAsin: sp.child_asin || '',
        childSku: sp.child_sku || '',
        bottle_name: sp.bottle_name || '',
        closure_name: sp.closure_name || '',
        label_location: sp.label_location || '',
        formulaGallonsPerUnit: sp.formula_gallons_needed ? (sp.formula_gallons_needed / (sp.quantity || 1)) : 0,
        units_per_case: sp.units_per_case || 60,
      }));
    }
    
    // Otherwise, use filtered products from the products list
    // Only include products that are in addedRows AND have qty > 0
    return products
      .map((product, index) => ({
        ...product,
        qty: qtyValues[index] || 0,
      }))
      .filter(p => addedRows.has(p.id) && p.qty > 0);
  }, [shipmentProducts, products, addedRows, qtyValues]);

  // Calculate total units from qtyValues - only for products that have been added
  const totalUnits = products.reduce((sum, product, index) => {
    // Only count products that are in addedRows
    if (!addedRows || !(addedRows instanceof Set) || !addedRows.has(product.id)) {
      return sum;
    }
    const qty = qtyValues[index];
    const numQty = typeof qty === 'number' ? qty : (qty === '' || qty === null || qty === undefined ? 0 : parseInt(qty, 10) || 0);
    return sum + numQty;
  }, 0);

  // Calculate total boxes based on size conversion rates - only for products that have been added
  const totalBoxes = products.reduce((sum, product, index) => {
    // Only count products that are in addedRows
    if (!addedRows || !(addedRows instanceof Set) || !addedRows.has(product.id)) {
      return sum;
    }
    const qty = qtyValues[index] ?? 0;
    const numQty = typeof qty === 'number' ? qty : (qty === '' || qty === null || qty === undefined ? 0 : parseInt(qty, 10) || 0);
    
    // Prefer known size-based case sizes; fall back to catalog units_per_case
    const size = product.size?.toLowerCase() || '';
    let unitsPerCase = 0;
    if (size.includes('8oz')) {
      unitsPerCase = 60; // 60 units = 1 box
    } else if (size.includes('quart')) {
      unitsPerCase = 12; // 12 units = 1 box
    } else if (size.includes('gallon')) {
      unitsPerCase = 4; // 4 units = 1 box
    } else if (product.units_per_case && product.units_per_case > 0) {
      unitsPerCase = product.units_per_case;
    }

    const boxesNeeded = unitsPerCase > 0 ? Math.ceil(numQty / unitsPerCase) : 0;
    
    return sum + boxesNeeded;
  }, 0);

  // Calculate palettes based on single_box_pallet_share or boxes_per_pallet
  // Each box takes up a fraction of a pallet (e.g., 0.028 = 2.8% of a pallet per box)
  const totalPalettes = products.reduce((sum, product, index) => {
    if (!addedRows || !(addedRows instanceof Set) || !addedRows.has(product.id)) {
      return sum;
    }
    const qty = qtyValues[index] ?? 0;
    const numQty = typeof qty === 'number' ? qty : (qty === '' || qty === null || qty === undefined ? 0 : parseInt(qty, 10) || 0);
    
    // Calculate boxes needed - use finished_units_per_case (for finished products) or units_per_case (fallback)
    const unitsPerCase = product.finished_units_per_case || product.units_per_case || 60;
    const boxesNeeded = numQty / unitsPerCase;
    
    // Calculate pallet share using single_box_pallet_share or boxes_per_pallet
    let palletShare = 0;
    if (product.single_box_pallet_share && product.single_box_pallet_share > 0) {
      // Each box takes this fraction of a pallet (e.g., 0.027778 = 1/36 of a pallet per box)
      palletShare = boxesNeeded * product.single_box_pallet_share;
    } else if (product.boxes_per_pallet && product.boxes_per_pallet > 0) {
      // boxes_per_pallet is max boxes that fit on one pallet
      palletShare = boxesNeeded / product.boxes_per_pallet;
    } else {
      // Fallback: assume 50 boxes per pallet
      palletShare = boxesNeeded / 50;
    }
    
    return sum + palletShare;
  }, 0);

  // Calculate time in hours based on bottles_per_minute (BPM)
  // Time (hours) = Total Units / BPM / 60
  const totalTimeHours = products.reduce((sum, product, index) => {
    if (!addedRows || !(addedRows instanceof Set) || !addedRows.has(product.id)) {
      return sum;
    }
    const qty = qtyValues[index] ?? 0;
    const numQty = typeof qty === 'number' ? qty : (qty === '' || qty === null || qty === undefined ? 0 : parseInt(qty, 10) || 0);
    
    const bpm = product.bottles_per_minute || 20; // Default 20 BPM if not specified
    const minutes = numQty / bpm;
    const hours = minutes / 60;
    
    return sum + hours;
  }, 0);

  // Calculate weight in lbs based on box_weight_lbs
  // Weight (lbs) = Number of Boxes × Box Weight (lbs)
  const totalWeightLbs = products.reduce((sum, product, index) => {
    if (!addedRows || !(addedRows instanceof Set) || !addedRows.has(product.id)) {
      return sum;
    }
    const qty = qtyValues[index] ?? 0;
    const numQty = typeof qty === 'number' ? qty : (qty === '' || qty === null || qty === undefined ? 0 : parseInt(qty, 10) || 0);
    
    // Calculate boxes needed
    const unitsPerCase = product.units_per_case || 60;
    const boxesNeeded = numQty / unitsPerCase;
    
    // Calculate weight: boxes × box_weight_lbs
    const boxWeight = product.box_weight_lbs || 0;
    const weight = boxesNeeded * boxWeight;
    
    return sum + weight;
  }, 0);

  const handleProductClick = (row) => {
    setSelectedRow(row);
    setIsNgoosOpen(true);
  };

  const handleActionChange = (action) => {
    setActiveAction(action);
    // Track which tab (label-check or formula-check) was accessed first
    // Only set if neither has been completed yet
    if ((action === 'label-check' || action === 'formula-check') && !firstAccessedTab) {
      if (!completedTabs.has('label-check') && !completedTabs.has('formula-check')) {
        setFirstAccessedTab(action);
      }
    }
  };

  const handleBookAndProceed = async (updatedShipmentData = null) => {
    try {
      setLoading(true);
      
      // Use the passed data or fall back to state (for backward compatibility)
      const currentShipmentData = updatedShipmentData || shipmentData;
      
      // Validate: Must have products selected
      const productsToAdd = Object.keys(qtyValues)
        .filter(idx => qtyValues[idx] > 0)
        .map(idx => ({
          catalog_id: products[idx].catalogId,
          quantity: qtyValues[idx],
        }));
      
      if (productsToAdd.length === 0) {
        toast.error('Please add at least one product before booking');
        setLoading(false);
        return;
      }
      
      let currentShipmentId = shipmentId;
      
      // Create shipment if it doesn't exist
      if (!currentShipmentId) {
        // Ensure shipment number and date are always set
        const shipmentNumber = currentShipmentData.shipmentNumber || generateShipmentNumber();
        const shipmentDate = currentShipmentData.shipmentDate || new Date().toISOString().split('T')[0];
        
        // Require shipment type to be selected before creating shipment
        if (!currentShipmentData.shipmentType) {
          toast.error('Please select a shipment type (FBA or AWD) in the export template before booking the shipment.');
          setLoading(false);
          return;
        }
        
        const newShipment = await createShipment({
          shipment_number: shipmentNumber,
          shipment_date: shipmentDate,
          shipment_type: currentShipmentData.shipmentType,
          marketplace: 'Amazon',
          account: currentShipmentData.account || 'TPS Nutrients',
          location: currentShipmentData.location || '',
          created_by: 'current_user', // TODO: Get from auth context
        });
        currentShipmentId = newShipment.id;
        setShipmentId(currentShipmentId);
        toast.success(`Shipment ${newShipment.shipment_number} created!`);
      }
      
      // Add products to shipment
      const addResult = await addShipmentProducts(currentShipmentId, productsToAdd);
      
      // Check for supply warnings
      if (addResult.supply_warnings && addResult.supply_warnings.length > 0) {
        const warningMessage = addResult.supply_warnings.map(w => 
          `${w.product} (${w.size}): Requested ${w.requested}, Max available ${w.max_available}`
        ).join('\n');
        
        const confirmed = window.confirm(
          `⚠️ Supply Chain Warning!\n\n` +
          `The following products exceed available inventory:\n\n${warningMessage}\n\n` +
          `Do you want to proceed anyway? You'll need to order more supplies before manufacturing.`
        );
        
        if (!confirmed) {
          setLoading(false);
          return;
        }
        toast.warning(`${addResult.supply_warnings.length} products exceed inventory`);
      } else {
        toast.success(`${productsToAdd.length} products added to shipment`);
      }
      
      // Update shipment to mark add_products as completed and move to label_check
      await updateShipment(currentShipmentId, {
        add_products_completed: true,
        status: 'label_check',
      });
      
      // Mark 'add-products' as completed when navigating to 'label-check'
      setCompletedTabs(prev => {
        const newSet = new Set(prev);
        newSet.add('add-products');
        return newSet;
      });
      handleActionChange('label-check');
      setIsShipmentDetailsOpen(false);
      toast.success('Moving to Label Check');
    } catch (error) {
      console.error('Error booking shipment:', error);
      toast.error('Failed to book shipment: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Check for insufficient labels (or variance for formulas) and get row IDs
  const checkVarianceExceeded = () => {
    if (activeAction === 'label-check') {
      // Count rows that have a recorded total but are insufficient vs needed
      const insufficientRows = labelCheckRows.filter(row => {
        if (row.totalCount === '' || row.totalCount === null || row.totalCount === undefined) return false;
        const counted = typeof row.totalCount === 'number' ? row.totalCount : parseFloat(row.totalCount) || 0;
        const needed = row.quantity || 0;
        return counted < needed;
      });

      const insufficientIds = insufficientRows.map(row => row.id);
      setVarianceExceededRowIds(insufficientIds);
      return insufficientIds.length;
    }
    
    if (activeAction === 'formula-check') {
      // Similar logic for formula-check if needed
      // For now, return 0
      setVarianceExceededRowIds([]);
      return 0;
    }
    
    setVarianceExceededRowIds([]);
    return 0;
  };

  const handleBeginSortFormulas = async () => {
    try {
      if (!shipmentId) {
        toast.error('No shipment found');
        return;
      }
      
      await updateShipment(shipmentId, {
        sort_products_completed: true,
        status: 'sort_formulas',
      });
      
      // Mark 'sort-products' as completed when navigating to 'sort-formulas'
      setCompletedTabs(prev => {
        const newSet = new Set(prev);
        newSet.add('sort-products');
        return newSet;
      });
      setActiveAction('sort-formulas');
      toast.success('Moving to Sort Formulas');
    } catch (error) {
      console.error('Error updating shipment:', error);
      toast.error('Failed to move to Sort Formulas');
    }
  };

  const completeFormulaStep = async (comment = '', isIncomplete = false) => {
    if (!shipmentId) {
      toast.error('Please book the shipment first');
      return;
    }

    const hasComment = !!(comment && comment.trim());
    const labelCheckCompleted = completedTabs.has('label-check');
    
    // Determine next status based on whether label check is completed
    // If label check is not completed, go to label check; otherwise go to book shipment
    const nextStatus = labelCheckCompleted ? 'book_shipment' : 'label_check';

    const updateData = isIncomplete
      ? {
          formula_check_completed: false,
          status: nextStatus, // move forward but keep formula check incomplete
        }
      : {
          formula_check_completed: true,
          status: nextStatus,
        };
    
    // Store comment in dedicated formula_check_comment column
    if (hasComment) {
      updateData.formula_check_comment = comment.trim();
    }
    
    await updateShipment(shipmentId, updateData);

    setFormulaCheckHasComment(hasComment);
    setCompletedTabs(prev => {
      const newSet = new Set(prev);
      if (isIncomplete) {
        newSet.delete('formula-check');
      } else {
        newSet.add('formula-check');
      }
      return newSet;
    });

    // Navigate based on whether label check is completed
    if (labelCheckCompleted) {
      // Both are completed, go to book shipment
      setActiveAction('book-shipment');
      if (isIncomplete) {
        if (hasComment) {
          toast.info('Formula Check comment saved. Proceeding to Book Shipment.');
        } else {
          toast.info('Proceeding to Book Shipment.');
        }
      } else {
        toast.success('Formula Check completed! Moving to Book Shipment');
      }
    } else {
      // If formula check is completed, show completion modal instead of auto-navigating
      if (!isIncomplete) {
        toast.success('Formula Check completed!');
        // Show the completion modal instead of automatically navigating
        setIsFormulaCheckCompleteOpen(true);
      } else {
        // If incomplete, navigate back to planning page
        if (hasComment) {
          toast.info('Formula Check comment saved. Returning to shipments table.');
        } else {
          toast.info('Returning to shipments table.');
        }
        
        // Navigate back to planning page with shipments tab
        navigate('/dashboard/production/planning', {
          state: {
            activeTab: 'shipments',
            refresh: Date.now(),
            fromFormulaCheckComplete: true,
          }
        });
      }
    }
  };
  const completeLabelCheck = async (comment = '', isIncomplete = false) => {
    if (!shipmentId) {
      toast.error('Please book the shipment first');
      return;
    }

    const hasComment = !!(comment && comment.trim());
    const formulaCheckCompleted = completedTabs.has('formula-check');
    const nextStatus = formulaCheckCompleted ? 'book_shipment' : 'formula_check';

    const updateData = isIncomplete
      ? {
          label_check_completed: false,
          status: nextStatus,
        }
      : {
          label_check_completed: true,
          status: nextStatus,
        };

    // Store comment in dedicated label_check_comment column
    if (hasComment) {
      updateData.label_check_comment = comment.trim();
    }

    await updateShipment(shipmentId, updateData);
    setLabelCheckHasComment(hasComment);

    setCompletedTabs(prev => {
      const newSet = new Set(prev);
      if (isIncomplete) {
        newSet.delete('label-check');
      } else {
        newSet.add('label-check');
      }
      return newSet;
    });

    // If a comment was added, navigate back to shipments table
    if (hasComment) {
      if (!isIncomplete) {
        toast.success('Label Check completed with comment!');
      } else {
        toast.info('Label Check comment saved. Returning to shipments table.');
      }
      
      // Navigate back to planning page with shipments tab
      navigate('/dashboard/production/planning', {
        state: {
          activeTab: 'shipments',
          refresh: Date.now(),
          fromLabelCheckComplete: true,
        }
      });
    } else if (!isIncomplete) {
      // If completed without comment, show completion modal
      toast.success('Label Check completed!');
      setIsLabelCheckCompleteOpen(true);
    } else {
      // If incomplete without comment, navigate back to planning page
      toast.info('Returning to shipments table.');
      
      // Navigate back to planning page with shipments tab
      navigate('/dashboard/production/planning', {
        state: {
          activeTab: 'shipments',
          refresh: Date.now(),
          fromLabelCheckComplete: true,
        }
      });
    }
  };

  const handleMarkAllAsCompleted = async () => {
    try {
      if (!shipmentId) {
        toast.error('Please book the shipment first');
        return;
      }

      // Get all formulas for the shipment
      const formulas = await getShipmentFormulaCheck(shipmentId);
      
      if (formulas.length === 0) {
        toast.info('No formulas to mark as completed');
        return;
      }

      // Get all formula IDs
      const allFormulaIds = formulas.map(formula => formula.id);

      // Mark all formulas as checked
      await updateShipmentFormulaCheck(shipmentId, {
        checked_formula_ids: allFormulaIds,
        uncheck_formula_ids: []
      });

      toast.success(`All ${allFormulaIds.length} formula(s) marked as completed`);
      
      // Trigger a refresh by incrementing the refresh key
      setFormulaCheckRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error marking all formulas as completed:', error);
      toast.error('Failed to mark all formulas as completed');
    }
  };

  const handleMarkAllLabelChecksAsDone = async () => {
    try {
      if (!shipmentId) {
        toast.error('Please book the shipment first');
        return;
      }

      // Get all label check rows that are not yet completed
      const incompleteRows = labelCheckRows.filter(row => !row.isComplete);

      if (incompleteRows.length === 0) {
        toast.info('All label checks are already completed');
        return;
      }

      // Mark all incomplete rows as confirmed
      const updatePromises = incompleteRows.map(row =>
        updateShipmentProductLabelCheck(shipmentId, row.id, 'confirmed')
      );

      await Promise.all(updatePromises);

      toast.success(`All ${incompleteRows.length} label check(s) marked as done`);
      
      // Check all incomplete row checkboxes
      setCheckAllIncompleteTrigger(prev => prev + 1);
      
      // Trigger a refresh by incrementing the refresh key
      setLabelCheckRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error marking all label checks as done:', error);
      toast.error('Failed to mark all label checks as done');
    }
  };

  const handleCompleteClick = async () => {
    try {
      if (!shipmentId) {
        toast.error('Please book the shipment first');
        return;
      }

      // WORKFLOW PROGRESSION:
      // add-products → label-check → formula-check → book-shipment → sort-products → sort-formulas

      if (activeAction === 'formula-check') {
        // Formula Check: Verify formulas are reviewed, then move to Label Check
        if (formulaCheckData?.remaining > 0) {
          setUncheckedFormulaCount(formulaCheckData.remaining);
          setIsFormulaIncompleteComment(true);
          setIsUncheckedFormulaOpen(true);
          return;
        }

        // If all formulas are checked, skip comment modal and move ahead
        setIsFormulaIncompleteComment(false);
        await completeFormulaStep('', false);
        return;
      }

      if (activeAction === 'label-check') {
        // Treat step as incomplete if not all label checks are done
        const isIncomplete = !isLabelCheckReadyToComplete;

        // If not all label checks are done, show comment modal
        if (isIncomplete) {
          setIsLabelIncompleteComment(true);
          setIsLabelCheckCommentOpen(true);
          return;
        }

        // Check for variance if all checks are done
        const varianceCount = checkVarianceExceeded();
        if (varianceCount > 0) {
          setVarianceCount(varianceCount);
          setIsLabelIncompleteComment(true);
          setIsVarianceExceededOpen(true);
          return;
        }

        // If all checks are done and no variance, complete directly without showing comment modal
        await completeLabelCheck('', false);
        return;
      }

      if (activeAction === 'book-shipment') {
        // Validate required fields before booking
        const trimmedShipmentType = (shipmentData.shipmentType || '').trim();
        const trimmedAmazonNumber = (shipmentData.amazonShipmentNumber || '').trim();
        const trimmedAmazonRef = (shipmentData.amazonRefId || '').trim();
        const trimmedShipFrom = (shipmentData.shipFrom || '').trim();
        const trimmedShipTo = (shipmentData.shipTo || '').trim();
        const trimmedCarrier = (selectedCarrier || '').trim();

        if (!trimmedShipmentType || !trimmedAmazonNumber || !trimmedAmazonRef || !trimmedShipFrom || !trimmedShipTo || !trimmedCarrier) {
          toast.error('Please fill Shipment Type, Amazon IDs, Ship From, Ship To, and Carrier.');
          return;
        }

        // Book Shipment: Complete and show modal
        await updateShipment(shipmentId, {
          shipment_type: trimmedShipmentType,
          amazon_shipment_number: trimmedAmazonNumber,
          amazon_ref_id: trimmedAmazonRef,
          ship_from: trimmedShipFrom,
          ship_to: trimmedShipTo,
          carrier: trimmedCarrier,
          book_shipment_completed: true,
          status: 'sort_products',
        });
        setCompletedTabs(prev => new Set(prev).add('book-shipment'));
        setIsBookShipmentCompleteOpen(true);
        toast.success('Shipment booked!');
        return;
      }

      if (activeAction === 'sort-products') {
        // Sort Products: Complete and show modal to move to Sort Formulas
        await updateShipment(shipmentId, {
          sort_products_completed: true,
          status: 'sort_formulas',
        });
        setCompletedTabs(prev => new Set(prev).add('sort-products'));
        setIsSortProductsCompleteOpen(true);
        return;
      }

      if (activeAction === 'sort-formulas') {
        // Sort Formulas: Final step - mark as ready for packaging
        await updateShipment(shipmentId, {
          sort_formulas_completed: true,
          status: 'packaging',
        });
        setCompletedTabs(prev => new Set(prev).add('sort-formulas'));
        setIsSortFormulasCompleteOpen(true);
        toast.success('All steps completed! Shipment ready for packaging.');
        return;
      }

    } catch (error) {
      console.error('Error completing stage:', error);
      toast.error('Failed to complete stage: ' + error.message);
    }
  };

  const handleVarianceGoBack = () => {
    setIsVarianceExceededOpen(false);
    setIsRecountMode(false);
    setVarianceExceededRowIds([]);
  };

  const handleVarianceRecount = () => {
    setIsVarianceExceededOpen(false);
    setIsRecountMode(true);
  };

  // Validate workflow progression
  const canAccessTab = (tabName) => {
    if (!shipmentId) {
      // Can only access add-products if no shipment exists
      return tabName === 'add-products';
    }
    
    // Workflow order: add-products → formula-check → label-check → book-shipment → sort-products → sort-formulas
    const tabOrder = ['add-products', 'formula-check', 'label-check', 'book-shipment', 'sort-products', 'sort-formulas'];
    const currentIndex = tabOrder.indexOf(tabName);
    
    // Can access current tab or any completed tab
    if (completedTabs.has(tabName)) {
      return true;
    }
    
    // Can access next tab if previous tab is completed
    if (currentIndex > 0) {
      const previousTab = tabOrder[currentIndex - 1];
      return completedTabs.has(previousTab);
    }
    
    return currentIndex === 0; // add-products is always accessible
  };

  const handleExport = () => {
    setIsExportTemplateOpen(true);
  };

  const handleSaveShipment = async (data) => {
    try {
      setShipmentData(prev => ({
        ...prev,
        ...data,
      }));
      
      // If shipment exists, update it
      if (shipmentId) {
        await updateShipment(shipmentId, {
          shipment_number: data.shipmentNumber,
          shipment_date: data.shipmentDate,
          shipment_type: data.shipmentType,
          location: data.location,
          account: data.account,
        });
      }
    } catch (error) {
      console.error('Error saving shipment:', error);
      alert('Failed to save shipment details');
    }
  };

  // Handle Floor Inventory dropdown
  useEffect(() => {
    const updateDropdownPosition = () => {
      if (floorInventoryButtonRef.current && isFloorInventoryOpen) {
        const rect = floorInventoryButtonRef.current.getBoundingClientRect();
        setFloorInventoryPosition({
          top: rect.bottom + 4,
          left: rect.left,
        });
      }
    };

    const handleClickOutside = (event) => {
      if (
        floorInventoryRef.current && 
        !floorInventoryRef.current.contains(event.target) &&
        floorInventoryButtonRef.current &&
        !floorInventoryButtonRef.current.contains(event.target)
      ) {
        setIsFloorInventoryOpen(false);
      }
    };

    if (isFloorInventoryOpen) {
      updateDropdownPosition();
      window.addEventListener('resize', updateDropdownPosition);
      window.addEventListener('scroll', updateDropdownPosition, true);
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        window.removeEventListener('resize', updateDropdownPosition);
        window.removeEventListener('scroll', updateDropdownPosition, true);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isFloorInventoryOpen]);

  // Handle Book Shipment tooltip position
  useEffect(() => {
    const updateTooltipPosition = () => {
      if (bookShipmentButtonRef.current && isBookShipmentHovered) {
        const rect = bookShipmentButtonRef.current.getBoundingClientRect();
        setBookShipmentTooltipPosition({
          top: rect.top, // Top of the button
          left: rect.left + rect.width / 2 - 40, // Shifted left from center
        });
      }
    };

    if (isBookShipmentHovered) {
      updateTooltipPosition();
      window.addEventListener('resize', updateTooltipPosition);
      window.addEventListener('scroll', updateTooltipPosition, true);
      return () => {
        window.removeEventListener('resize', updateTooltipPosition);
        window.removeEventListener('scroll', updateTooltipPosition, true);
      };
    }
  }, [isBookShipmentHovered]);

  // Handle DOI tooltip click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        doiTooltipRef.current && 
        !doiTooltipRef.current.contains(event.target) &&
        doiIconRef.current &&
        !doiIconRef.current.contains(event.target)
      ) {
        setShowDOITooltip(false);
      }
    };

    if (showDOITooltip) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showDOITooltip]);

  const handleFloorInventorySelect = (option) => {
    setSelectedFloorInventory(option);
    setActiveView('floor-inventory');
    setIsFloorInventoryOpen(false);
  };

  const handleAllProductsClick = () => {
    setActiveView('all-products');
    setSelectedFloorInventory(null);
  };

  const floorInventoryOptions = ['Sellables', 'Shiners', 'Unused Formulas'];

  // Filter products based on search term
  // This is computed directly, not memoized, to ensure immediate updates
  const getFilteredProducts = () => {
    // If no search term or empty, return all products
    if (!searchTerm || searchTerm.trim() === '') {
      console.log(`🔍 Search empty, returning all ${products.length} products`);
      return products;
    }
    
    const searchLower = searchTerm.toLowerCase().trim();
    
    // If search is empty after trim, return all products
    if (searchLower === '') {
      return products;
    }
    
    // Split into words for AND logic
    const searchWords = searchLower.split(/\s+/).filter(w => w.length > 0);
    console.log(`🔍 Searching for words: [${searchWords.join(', ')}] in ${products.length} products`);
    
    const filtered = products.filter(product => {
      // Create a single searchable string from all relevant fields
      const searchableText = [
        product.brand || '',
        product.product || '',
        product.size || '',
        product.childAsin || '',
        product.childSku || '',
        product.formula_name || '',
        product.bottle_name || '',
        product.label_location || '',
      ].join(' ').toLowerCase();
      
      // ALL search words must be found somewhere in the product text
      return searchWords.every(word => searchableText.includes(word));
    });
    
    console.log(`🔍 Found ${filtered.length} matching products`);
    return filtered;
  };
  
  const filteredProducts = getFilteredProducts();

  return (
    <div className={`min-h-screen ${themeClasses.pageBg}`} style={{ paddingBottom: (activeAction === 'add-products' || activeAction === 'formula-check' || activeAction === 'label-check' || activeAction === 'book-shipment' || activeAction === 'sort-products' || activeAction === 'sort-formulas') ? '100px' : '0px' }}>
      <NewShipmentHeader
        tableMode={tableMode}
        onTableModeToggle={() => setTableMode(!tableMode)}
        onReviewShipmentClick={() => setIsShipmentDetailsOpen(true)}
        onCompleteClick={handleCompleteClick}
        shipmentData={shipmentData}
        dataAsOfDate={dataAsOfDate}
        totalUnits={totalUnits}
        totalBoxes={Math.ceil(totalBoxes)}
        activeAction={activeAction}
        onActionChange={handleActionChange}
        completedTabs={completedTabs}
        shipmentId={shipmentId}
        canAccessTab={canAccessTab}
        formulaCheckHasComment={formulaCheckHasComment}
        formulaCheckRemainingCount={formulaCheckData.remaining || 0}
        labelCheckHasComment={labelCheckHasComment}
        labelCheckRemainingCount={labelCheckRemainingCount}
        hideActionsDropdown={hideActionsDropdown}
      />

      <div style={{ padding: '0 1.5rem' }}>
        {activeAction === 'add-products' && (
          <>
            {/* Products Table Header */}
            <div
              style={{
                padding: '12px 16px',
                marginTop: '1.25rem',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
              }}
            >
              {/* Left: Navigation Tabs */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                <div
                  onClick={handleAllProductsClick}
                  style={{
                    color: activeView === 'all-products' ? '#3B82F6' : '#6B7280',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    borderBottom: activeView === 'all-products' ? '2px solid #3B82F6' : 'none',
                    paddingBottom: '4px',
                    transition: 'all 0.2s',
                  }}
                >
                  All Products
                </div>
                <div
                  ref={floorInventoryButtonRef}
                  onClick={() => setIsFloorInventoryOpen(!isFloorInventoryOpen)}
                  style={{
                    color: activeView === 'floor-inventory' ? '#3B82F6' : '#6B7280',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    position: 'relative',
                    borderBottom: activeView === 'floor-inventory' ? '2px solid #3B82F6' : 'none',
                    paddingBottom: '4px',
                    transition: 'all 0.2s',
                  }}
                >
                  {selectedFloorInventory || 'Floor Inventory'}
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 4.5L6 7.5L9 4.5" stroke={activeView === 'floor-inventory' ? '#3B82F6' : '#6B7280'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                
                {isFloorInventoryOpen && createPortal(
                  <div
                    ref={floorInventoryRef}
                    style={{
                      position: 'fixed',
                      top: `${floorInventoryPosition.top}px`,
                      left: `${floorInventoryPosition.left}px`,
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E5E7EB',
                      borderRadius: '6px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                      zIndex: 10000,
                      minWidth: '160px',
                      overflow: 'hidden',
                    }}
                  >
                    {floorInventoryOptions.map((option) => (
                      <div
                        key={option}
                        onClick={() => handleFloorInventorySelect(option)}
                        style={{
                          padding: '8px 12px',
                          cursor: 'pointer',
                          color: '#111827',
                          fontSize: '14px',
                          backgroundColor: selectedFloorInventory === option ? '#F3F4F6' : 'transparent',
                          transition: 'background-color 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          if (selectedFloorInventory !== option) {
                            e.currentTarget.style.backgroundColor = '#F9FAFB';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedFloorInventory !== option) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        {option}
                      </div>
                    ))}
                  </div>,
                  document.body
                )}
              </div>

              {/* Right: Forecast Range and Search Input */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                {/* Forecast Range */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg
                      ref={doiIconRef}
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      onMouseEnter={() => setShowDOITooltip(true)}
                      onMouseLeave={() => {
                        if (!isTooltipPinned) {
                          setShowDOITooltip(false);
                        }
                      }}
                      onClick={() => {
                        setIsTooltipPinned(!isTooltipPinned);
                        setShowDOITooltip(true);
                      }}
                      style={{ cursor: 'pointer', flexShrink: 0, display: 'block' }}
                      role="button"
                      aria-label="Forecast Range info"
                    >
                      <defs>
                        <linearGradient id="infoGradient" x1="12" y1="0" x2="12" y2="24" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#3B82F6" />
                          <stop offset="1" stopColor="#1D4ED8" />
                        </linearGradient>
                      </defs>
                      <circle cx="12" cy="12" r="11" fill="url(#infoGradient)" stroke="#1E3A8A" strokeWidth="1" />
                      <rect x="11.25" y="10" width="1.5" height="6" rx="0.75" fill="#FFFFFF" />
                      <rect x="11.25" y="6" width="1.5" height="1.5" rx="0.75" fill="#FFFFFF" />
                    </svg>
                    <span style={{ fontSize: '14px', fontWeight: 400, color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>
                      Forecast Range
                    </span>
                  </div>
                  
                  {/* Forecast Range Tooltip */}
                  {showDOITooltip && (
                    <div
                      ref={doiTooltipRef}
                      onMouseEnter={() => setShowDOITooltip(true)}
                      onMouseLeave={() => {
                        if (!isTooltipPinned) {
                          setShowDOITooltip(false);
                        }
                      }}
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: '0',
                        marginTop: '8px',
                        backgroundColor: '#FFFFFF',
                        borderRadius: '6px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                        padding: '12px',
                        width: '360px',
                        zIndex: 10000,
                        boxSizing: 'border-box',
                        border: '1px solid #E5E7EB',
                      }}
                    >
                      {/* Arrow pointing up - aligned with icon center */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '-6px',
                          left: '8px',
                          transform: 'translateX(-50%) rotate(45deg)',
                          width: '12px',
                          height: '12px',
                          backgroundColor: '#FFFFFF',
                          borderLeft: '1px solid #E5E7EB',
                          borderTop: '1px solid #E5E7EB',
                        }}
                      />
                      
                      {/* Header with icon and title */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                        <svg 
                          width="20" 
                          height="20" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          xmlns="http://www.w3.org/2000/svg"
                          style={{ flexShrink: 0 }}
                        >
                          {/* Calendar */}
                          <rect x="3" y="4" width="18" height="18" rx="2" stroke="#2563EB" strokeWidth="2" fill="none"/>
                          <line x1="8" y1="2" x2="8" y2="6" stroke="#2563EB" strokeWidth="2" strokeLinecap="round"/>
                          <line x1="16" y1="2" x2="16" y2="6" stroke="#2563EB" strokeWidth="2" strokeLinecap="round"/>
                          <line x1="3" y1="10" x2="21" y2="10" stroke="#2563EB" strokeWidth="2"/>
                          {/* Clock inside calendar */}
                          <circle cx="12" cy="15" r="4" stroke="#2563EB" strokeWidth="1.5" fill="none"/>
                          <line x1="12" y1="15" x2="12" y2="13" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round"/>
                          <line x1="12" y1="15" x2="13.5" y2="15" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        <h3 style={{ 
                          fontSize: '16px', 
                          fontWeight: 600, 
                          color: '#111827', 
                          margin: 0 
                        }}>
                          Forecast Range Guide
                        </h3>
                      </div>
                      
                      {/* Body text */}
                      <div style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5', marginBottom: '4px' }}>
                        <p style={{ margin: 0 }}>
                          The Forecast Range determines the future period for calculating inventory needs. It sets the target date for your{' '}
                          <span style={{ color: '#2563EB', fontWeight: 500 }}>DOI Goal</span>
                          {' '}(Days of Inventory), the number of days your inventory will last based on sales data.
                        </p>
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6B7280' }}>
                          This range actively manipulates the DOI Goal and products react accordingly to help you maintain optimal inventory levels.
                        </p>
                      </div>
                      
                      {/* Recommended Range section */}
                      <div style={{ marginBottom: '4px' }}>
                        <span style={{ 
                          fontSize: '14px', 
                          fontWeight: 600, 
                          color: '#2563EB'
                        }}>
                          Recommended Range:{' '}
                        </span>
                        <span style={{ 
                          fontSize: '14px', 
                          color: '#2563EB',
                          lineHeight: '1.5'
                        }}>
                          90-180 days for optimal coverage and planning flexibility.
                        </span>
                      </div>
                      
                      {/* View Date Calculation Info */}
                      <div 
                        onClick={() => setShowDateCalculationInfo(!showDateCalculationInfo)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          cursor: 'pointer',
                          color: '#6B7280',
                          fontSize: '14px',
                          paddingTop: '4px',
                          marginTop: '4px',
                          borderTop: '1px solid #E5E7EB',
                        }}
                      >
                        <span>View Date Calculation Info</span>
                        <svg 
                          width="16" 
                          height="16" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          xmlns="http://www.w3.org/2000/svg"
                          style={{
                            transform: showDateCalculationInfo ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s',
                          }}
                        >
                          <path 
                            d="M6 9L12 15L18 9" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      
                      {/* Expanded Date Calculation Info */}
                      {showDateCalculationInfo && (
                        <div style={{ 
                          marginTop: '12px',
                        }}>
                          {/* Formula */}
                          <div style={{
                            fontSize: '14px',
                            color: '#111827',
                            fontWeight: 400,
                            marginBottom: '12px',
                            lineHeight: '1.5'
                          }}>
                            DOI Goal Date = Current Date + Forecast Range
                          </div>
                          
                          {/* Pro Tip Box */}
                          <div style={{
                            backgroundColor: '#F3E8FF',
                            borderRadius: '8px',
                            padding: '12px',
                            border: '1px solid #E9D5FF'
                          }}>
                            {/* Pro Tip Header */}
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              marginBottom: '8px'
                            }}>
                              <svg 
                                width="16" 
                                height="16" 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                xmlns="http://www.w3.org/2000/svg"
                                style={{ flexShrink: 0 }}
                              >
                                <path 
                                  d="M9 21c0 .5.4 1 1 1h4c.6 0 1-.5 1-1v-1H9v1zm3-19C8.1 2 5 5.1 5 9c0 2.4 1.2 4.5 3 5.7V17c0 .5.4 1 1 1h6c.6 0 1-.5 1-1v-2.3c1.8-1.3 3-3.4 3-5.7 0-3.9-3.1-7-7-7z" 
                                  fill="#9333EA"
                                />
                              </svg>
                              <span style={{
                                fontSize: '14px',
                                fontWeight: 600,
                                color: '#9333EA'
                              }}>
                                Pro Tip:
                              </span>
                            </div>
                            
                            {/* Pro Tip Body */}
                            <div style={{
                              fontSize: '14px',
                              color: '#9333EA',
                              lineHeight: '1.5'
                            }}>
                              Set your range to cover <strong>Lead Time</strong> + <strong>Manufacturing Cycle</strong> + <strong>Safety Buffer</strong>. This ensures you never run out of stock before the next shipment arrives.
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <input
                    type="text"
                    value={forecastRange}
                    onChange={(e) => setForecastRange(e.target.value)}
                    style={{
                      width: '80px',
                      height: '32px',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: '1px solid #D1D5DB',
                      backgroundColor: '#FFFFFF',
                      color: '#111827',
                      fontSize: '14px',
                      textAlign: 'center',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3B82F6';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#D1D5DB';
                    }}
                  />
                  <span style={{ fontSize: '14px', fontWeight: 400, color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>
                    days
                  </span>
                </div>

                {/* Search Input */}
                <div style={{ position: 'relative', width: '336px', height: '32px' }}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                  }}
                >
                  <path
                    d="M7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667Z"
                    stroke="#9CA3AF"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M14 14L11.1 11.1"
                    stroke="#9CA3AF"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    height: '32px',
                    padding: '6px 12px 6px 32px',
                    borderRadius: '6px',
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: '#111827',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3B82F6';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#D1D5DB';
                  }}
                />
                </div>
              </div>
            </div>

            {activeView === 'all-products' && (
              <>
                {loadingProducts && <div style={{ textAlign: 'center', padding: '2rem' }}>Loading products...</div>}
                {!loadingProducts && (
                  <NewShipmentTable
                    rows={filteredProducts}
                    tableMode={tableMode}
                    onProductClick={handleProductClick}
                    qtyValues={qtyValues}
                    onQtyChange={setQtyValues}
                    addedRows={addedRows}
                    onAddedRowsChange={setAddedRows}
                    labelsAvailabilityMap={labelsAvailabilityMap}
                    forecastRange={parseInt(forecastRange) || 120}
                  />
                )}
              </>
            )}
          </>
        )}

        {/* Separate container for Sellables View */}
        {activeAction === 'add-products' && activeView === 'floor-inventory' && selectedFloorInventory === 'Sellables' && (
          <div style={{ padding: '0 1.5rem' }}>
            <SellablesView />
          </div>
        )}

        {/* Separate container for Shiners View */}
        {activeAction === 'add-products' && activeView === 'floor-inventory' && selectedFloorInventory === 'Shiners' && (
          <div style={{ padding: '0 1.5rem' }}>
            <ShinersView />
          </div>
        )}

        {/* Separate container for Unused Formulas View */}
        {activeAction === 'add-products' && activeView === 'floor-inventory' && selectedFloorInventory === 'Unused Formulas' && (
          <div style={{ padding: '0 1.5rem' }}>
            <UnusedFormulasView />
          </div>
        )}

        {activeAction === 'sort-products' && (
          <div style={{ marginTop: '1.5rem' }}>
            <SortProductsTable 
              shipmentProducts={productsForSortTabs}
              shipmentType={shipmentData.shipmentType}
              shipmentId={shipmentId}
            />
          </div>
        )}

        {activeAction === 'sort-formulas' && (
          <div style={{ marginTop: '1.5rem' }}>
            <SortFormulasTable 
              shipmentProducts={productsForSortTabs}
              shipmentId={shipmentId}
            />
          </div>
        )}

        {activeAction === 'formula-check' && (
          <div style={{ marginTop: '1.5rem' }}>
            <FormulaCheckTable 
              shipmentId={shipmentId}
              isRecountMode={isRecountMode}
              varianceExceededRowIds={varianceExceededRowIds}
              onFormulaDataChange={setFormulaCheckData}
              selectedRows={formulaSelectedRows}
              onSelectedRowsChange={setFormulaSelectedRows}
              refreshKey={formulaCheckRefreshKey}
              isAdmin={false} // TODO: Connect to actual user role check (e.g., user?.role === 'admin')
            />
          </div>
        )}

        {activeAction === 'label-check' && (
          <div style={{ marginTop: '1.5rem' }}>
            <LabelCheckTable 
              shipmentId={shipmentId}
              isRecountMode={isRecountMode}
              varianceExceededRowIds={varianceExceededRowIds}
              hideHeader={hideLabelCheckHeader}
              onExitRecountMode={() => {
                setIsRecountMode(false);
                setVarianceExceededRowIds([]);
              }}
              onRowsDataChange={setLabelCheckRows}
              refreshKey={labelCheckRefreshKey}
              checkAllIncompleteTrigger={checkAllIncompleteTrigger}
              isAdmin={false} // TODO: Connect to actual user role check (e.g., user?.role === 'admin')
            />
          </div>
        )}

        {activeAction === 'book-shipment' && (
          <div style={{ marginTop: '1.5rem', padding: '0' }}>
            <div style={{
              backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
              padding: '24px',
            }}>
              <h2 style={{
                fontSize: '18px',
                fontWeight: 600,
                color: isDarkMode ? '#FFFFFF' : '#111827',
                marginBottom: '24px',
              }}>
                Shipment Details
              </h2>

              {/* Row 1: Shipment Name & Shipment Type */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: isDarkMode ? '#9CA3AF' : '#6B7280', marginBottom: '6px' }}>
                    Shipment Name
                  </label>
                  <input
                    type="text"
                    value={`${shipmentData.shipmentNumber} ${shipmentData.shipmentType}`}
                    readOnly
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
                      backgroundColor: isDarkMode ? '#374151' : '#FFFFFF',
                      color: isDarkMode ? '#FFFFFF' : '#111827',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: isDarkMode ? '#9CA3AF' : '#6B7280', marginBottom: '6px' }}>
                    Shipment Type<span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <select
                    value={shipmentData.shipmentType}
                    onChange={(e) => setShipmentData({ ...shipmentData, shipmentType: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
                      backgroundColor: isDarkMode ? '#374151' : '#FFFFFF',
                      color: shipmentData.shipmentType ? (isDarkMode ? '#FFFFFF' : '#111827') : '#9CA3AF',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      cursor: 'pointer',
                      appearance: 'none',
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M3 4.5L6 7.5L9 4.5' stroke='%239CA3AF' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 12px center',
                    }}
                  >
                    <option value="">Select Shipment Type</option>
                    <option value="FBA">FBA</option>
                    <option value="AWD">AWD</option>
                    <option value="Parcel">Parcel</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Amazon Shipment # & Amazon Ref ID */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: isDarkMode ? '#9CA3AF' : '#6B7280', marginBottom: '6px' }}>
                    Amazon Shipment #<span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={shipmentData.amazonShipmentNumber}
                    onChange={(e) => setShipmentData({ ...shipmentData, amazonShipmentNumber: e.target.value })}
                    placeholder={getAmazonShipmentFormat(shipmentData.shipmentType)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
                      backgroundColor: isDarkMode ? '#374151' : '#FFFFFF',
                      color: isDarkMode ? '#FFFFFF' : '#111827',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: isDarkMode ? '#9CA3AF' : '#6B7280', marginBottom: '6px' }}>
                    Amazon Ref ID<span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={shipmentData.amazonRefId || ''}
                    onChange={(e) => setShipmentData({ ...shipmentData, amazonRefId: e.target.value })}
                    placeholder="XXXXXXXX"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
                      backgroundColor: isDarkMode ? '#374151' : '#FFFFFF',
                      color: isDarkMode ? '#FFFFFF' : '#111827',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Row 3: Ship From */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: isDarkMode ? '#9CA3AF' : '#6B7280', marginBottom: '6px' }}>
                  Ship From<span style={{ color: '#EF4444', marginLeft: '4px' }}>*</span>
                </label>
                <input
                  type="text"
                  value={shipmentData.shipFrom}
                  onChange={(e) => setShipmentData({ ...shipmentData, shipFrom: e.target.value })}
                  placeholder="Enter Shipment Location..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
                    backgroundColor: isDarkMode ? '#374151' : '#FFFFFF',
                    color: isDarkMode ? '#FFFFFF' : '#111827',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Row 4: Ship To */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: isDarkMode ? '#9CA3AF' : '#6B7280', marginBottom: '6px' }}>
                  Ship To<span style={{ color: '#EF4444', marginLeft: '4px' }}>*</span>
                </label>
                <input
                  type="text"
                  value={shipmentData.shipTo}
                  onChange={(e) => setShipmentData({ ...shipmentData, shipTo: e.target.value })}
                  placeholder="Enter Shipment Destination..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
                    backgroundColor: isDarkMode ? '#374151' : '#FFFFFF',
                    color: isDarkMode ? '#FFFFFF' : '#111827',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Row 5: Carrier */}
              <div style={{ marginBottom: '16px', position: 'relative' }}>
                <label style={{ display: 'block', fontSize: '12px', color: isDarkMode ? '#9CA3AF' : '#6B7280', marginBottom: '6px' }}>
                  Carrier<span style={{ color: '#EF4444', marginLeft: '4px' }}>*</span>
                </label>
                <div
                  ref={carrierButtonRef}
                  onClick={() => setIsCarrierDropdownOpen(!isCarrierDropdownOpen)}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: selectedCarrier ? '#111827' : '#9CA3AF',
                    fontSize: '13px',
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    minHeight: '28px',
                  }}
                >
                  <span>{selectedCarrier || 'Select Carrier'}</span>
                  <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 1L6 6L11 1" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>

                {isCarrierDropdownOpen && createPortal(
                  <div
                    ref={carrierDropdownRef}
                    style={{
                      position: 'fixed',
                      top: `${carrierDropdownPos.top}px`,
                      left: `${carrierDropdownPos.left}px`,
                      width: `${carrierDropdownPos.width}px`,
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E5E7EB',
                      borderRadius: '6px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                      zIndex: 10000,
                      overflow: 'hidden',
                    }}
                  >
                    {/* Known Carriers */}
                    <div style={{ padding: '8px 10px', borderBottom: '1px solid #E5E7EB' }}>
                      <div style={{
                        fontSize: '11px',
                        fontWeight: 500,
                        color: '#6B7280',
                        marginBottom: '6px',
                      }}>
                        Known Carriers:
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {knownCarriers.map((carrier) => (
                          <div
                            key={carrier}
                            onClick={() => handleCarrierSelect(carrier)}
                            style={{
                              padding: '4px 6px',
                              cursor: 'pointer',
                              borderRadius: '4px',
                              color: '#111827',
                              fontSize: '12px',
                              transition: 'background-color 0.2s',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#F3F4F6';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            {carrier}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Custom Entry */}
                    <div style={{ padding: '8px 10px', borderBottom: '1px solid #E5E7EB' }}>
                      <div style={{
                        fontSize: '11px',
                        fontWeight: 500,
                        color: '#6B7280',
                        marginBottom: '6px',
                      }}>
                        Custom Entry:
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input
                          type="text"
                          value={customCarrierName}
                          onChange={(e) => setCustomCarrierName(e.target.value)}
                          placeholder="Enter custom carrier name here..."
                          style={{
                            flex: 1,
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: '1px solid #D1D5DB',
                            backgroundColor: '#FFFFFF',
                            color: '#111827',
                            fontSize: '12px',
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#3B82F6';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = '#D1D5DB';
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleUseCustomCarrier();
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleUseCustomCarrier}
                          style={{
                            padding: '4px 12px',
                            borderRadius: '4px',
                            border: 'none',
                            backgroundColor: '#9CA3AF',
                            color: '#FFFFFF',
                            fontSize: '12px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'background-color 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#6B7280';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#9CA3AF';
                          }}
                        >
                          Use
                        </button>
                      </div>
                    </div>

                    {/* Create a Carrier */}
                    <div style={{ padding: '8px 10px' }}>
                      <div style={{
                        fontSize: '11px',
                        fontWeight: 500,
                        color: '#6B7280',
                        marginBottom: '6px',
                      }}>
                        Create a Carrier:
                      </div>
                      <div
                        onClick={() => setIsCarrierDropdownOpen(false)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          cursor: 'pointer',
                          color: '#3B82F6',
                          fontSize: '12px',
                          padding: '2px 0',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = '0.8';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = '1';
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M8 3V13M3 8H13" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span>Add new carrier to system</span>
                      </div>
                    </div>
                  </div>,
                  document.body
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {(activeAction === 'add-products' || activeAction === 'formula-check' || activeAction === 'label-check' || activeAction === 'book-shipment' || activeAction === 'sort-products' || activeAction === 'sort-formulas') && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: '256px',
            right: 0,
            backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
            borderTop: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 10,
          }}
        >
          {activeAction === 'formula-check' ? (
            /* Formula Check Footer */
            <>
              <div style={{ display: 'flex', gap: '48px', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 400,
                    color: isDarkMode ? '#9CA3AF' : '#6B7280',
                    letterSpacing: '0.05em',
                  }}>
                    TOTAL FORMULAS
                  </span>
                  <span style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    color: isDarkMode ? '#FFFFFF' : '#000000',
                  }}>
                    {formulaCheckData.total}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 400,
                    color: isDarkMode ? '#9CA3AF' : '#6B7280',
                    letterSpacing: '0.05em',
                  }}>
                    COMPLETED
                  </span>
                  <span style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    color: isDarkMode ? '#FFFFFF' : '#000000',
                  }}>
                    {formulaCheckData.completed}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 400,
                    color: isDarkMode ? '#9CA3AF' : '#6B7280',
                    letterSpacing: '0.05em',
                  }}>
                    REMAINING
                  </span>
                  <span style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    color: isDarkMode ? '#FFFFFF' : '#000000',
                  }}>
                    {formulaCheckData.remaining}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {formulaCheckData.completed > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllAsCompleted}
                    style={{
                      height: '31px',
                      padding: '0 16px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: '#007AFF',
                      color: '#FFFFFF',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#0056CC';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#007AFF';
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      style={{ flexShrink: 0 }}
                    >
                      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" fill="none" />
                      <path
                        d="M5 8L7 10L11 6"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Mark All as Completed
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCompleteClick}
                  style={{
                    height: '31px',
                    padding: '0 16px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#007AFF',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#0056CC';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#007AFF';
                  }}
                >
                  Complete
                </button>
              </div>
            </>
          ) : activeAction === 'label-check' ? (
            /* Label Check Footer */
            <>
              <div style={{ display: 'flex', gap: '48px', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 400,
                    color: isDarkMode ? '#9CA3AF' : '#6B7280',
                    letterSpacing: '0.05em',
                  }}>
                    TOTAL LABELS
                  </span>
                  <span style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    color: isDarkMode ? '#FFFFFF' : '#000000',
                  }}>
                    {totalLabelCheckRows}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 400,
                    color: isDarkMode ? '#9CA3AF' : '#6B7280',
                    letterSpacing: '0.05em',
                  }}>
                    COMPLETED
                  </span>
                  <span style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    color: isDarkMode ? '#FFFFFF' : '#000000',
                  }}>
                    {labelCheckCompletedCount}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 400,
                    color: isDarkMode ? '#9CA3AF' : '#6B7280',
                    letterSpacing: '0.05em',
                  }}>
                    REMAINING
                  </span>
                  <span style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    color: isDarkMode ? '#FFFFFF' : '#000000',
                  }}>
                    {labelCheckRemainingCount}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {labelCheckRemainingCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllLabelChecksAsDone}
                    style={{
                      height: '31px',
                      padding: '0 16px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: '#007AFF',
                      color: '#FFFFFF',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#0056CC';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#007AFF';
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      style={{ flexShrink: 0 }}
                    >
                      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" fill="none" />
                      <path
                        d="M5 8L7 10L11 6"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Mark All as Done
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCompleteClick}
                  style={{
                    height: '31px',
                    padding: '0 16px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#007AFF',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    opacity: isLabelCheckReadyToComplete ? 1 : 0.7,
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#0056CC';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#007AFF';
                  }}
                >
                  Complete
                </button>
              </div>
            </>
          ) : activeAction === 'book-shipment' ? (
            /* Book Shipment Footer */
            <>
              <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }} />
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={handleCompleteClick}
                  style={{
                    height: '31px',
                    padding: '0 16px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#007AFF',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#0056CC';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#007AFF';
                  }}
                >
                  Book Shipment
                </button>
              </div>
            </>
          ) : (activeAction === 'sort-products' || activeAction === 'sort-formulas') ? (
            /* Sort Products / Sort Formulas Footer */
            <>
              <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
                {/* Empty left side */}
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={handleCompleteClick}
                  style={{
                    height: '38px',
                    padding: '0 24px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#007AFF',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#0056CC';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#007AFF';
                  }}
                >
                  Complete
                </button>
              </div>
            </>
          ) : (
            /* Default Footer (Add Products) */
            <>
              <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 400,
                    color: isDarkMode ? '#9CA3AF' : '#9CA3AF',
                  }}>
                    PALETTES
                  </span>
                  <span style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    color: isDarkMode ? '#FFFFFF' : '#000000',
                  }}>
                    {totalPalettes.toFixed(2)}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 400,
                    color: isDarkMode ? '#9CA3AF' : '#9CA3AF',
                  }}>
                    TOTAL BOXES
                  </span>
                  <span style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    color: isDarkMode ? '#FFFFFF' : '#000000',
                  }}>
                    {Math.ceil(totalBoxes).toLocaleString()}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 400,
                    color: isDarkMode ? '#9CA3AF' : '#9CA3AF',
                  }}>
                    UNITS
                  </span>
                  <span style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    color: isDarkMode ? '#FFFFFF' : '#000000',
                  }}>
                    {totalUnits.toLocaleString()}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 400,
                    color: isDarkMode ? '#9CA3AF' : '#9CA3AF',
                  }}>
                    TIME (HRS)
                  </span>
                  <span style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    color: isDarkMode ? '#FFFFFF' : '#000000',
                  }}>
                    {totalTimeHours.toFixed(1)}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 400,
                    color: isDarkMode ? '#9CA3AF' : '#9CA3AF',
                  }}>
                    WEIGHT (LBS)
                  </span>
                  <span style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    color: isDarkMode ? '#FFFFFF' : '#000000',
                  }}>
                    {Math.round(totalWeightLbs).toLocaleString()}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={handleExport}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = addedRows.size > 0 ? '#0066CC' : '#6B7280';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = addedRows.size > 0 ? '#007AFF' : '#9CA3AF';
                  }}
                  style={{
                    height: '31px',
                    padding: '0 10px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: addedRows.size > 0 ? '#007AFF' : '#9CA3AF',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  Export for Upload
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <NgoosModal
        isOpen={isNgoosOpen}
        onClose={() => {
          setIsNgoosOpen(false);
          setSelectedRow(null);
        }}
        selectedRow={selectedRow}
        forecastRange={parseInt(forecastRange) || 150}
        labelsAvailable={(() => {
          if (!selectedRow?.label_location) return null;
          const labelLoc = selectedRow.label_location;
          const baseAvailable = labelsAvailabilityMap[labelLoc]?.labels_available || selectedRow?.labelsAvailable || 0;
          
          // Subtract labels already committed in current shipment for products with same label_location
          const usedInCurrentShipment = products.reduce((sum, product, index) => {
            if (product.label_location === labelLoc && product.id !== selectedRow.id) {
              return sum + (qtyValues[index] || 0);
            }
            return sum;
          }, 0);
          
          return Math.max(0, baseAvailable - usedInCurrentShipment);
        })()}
        currentQty={(() => {
          const productIndex = products.findIndex(p => p.id === selectedRow?.id);
          return productIndex >= 0 ? (qtyValues[productIndex] || 0) : 0;
        })()}
        onAddUnits={(row, unitsToAdd) => {
          const productIndex = products.findIndex(p => p.id === row.id);
          if (productIndex >= 0) {
            const labelLoc = row.label_location;
            const baseAvailable = labelsAvailabilityMap[labelLoc]?.labels_available || row?.labelsAvailable || 0;
            
            // Calculate labels already used in current shipment for same label_location
            const usedInCurrentShipment = products.reduce((sum, product, idx) => {
              if (product.label_location === labelLoc && idx !== productIndex) {
                return sum + (qtyValues[idx] || 0);
              }
              return sum;
            }, 0);
            
            const maxAvailable = Math.max(0, baseAvailable - usedInCurrentShipment);
            const finalUnits = Math.min(unitsToAdd, maxAvailable);
            
            if (finalUnits < unitsToAdd) {
              toast.warning(`Only ${finalUnits.toLocaleString()} labels available. Capped from ${unitsToAdd.toLocaleString()}.`);
            }
            
            setQtyValues(prev => ({
              ...prev,
              [productIndex]: finalUnits
            }));
            
            // Also add the row to addedRows so button shows "Added"
            setAddedRows(prev => new Set([...prev, row.id]));
            
            toast.success(`Added ${finalUnits.toLocaleString()} units of ${row.product}`);
          }
        }}
      />

      <ShipmentDetailsModal
        isOpen={isShipmentDetailsOpen}
        onClose={() => setIsShipmentDetailsOpen(false)}
        shipmentData={shipmentData}
        totalUnits={totalUnits}
        totalBoxes={Math.ceil(totalBoxes)}
        onSave={handleSaveShipment}
        onBookAndProceed={handleBookAndProceed}
      />

      <ExportTemplateModal
        isOpen={isExportTemplateOpen}
        onClose={() => setIsExportTemplateOpen(false)}
        onExport={(selectedType) => {
          // Update shipment type based on export template selection
          if (selectedType === 'fba' || selectedType === 'awd') {
            const newType = selectedType.toUpperCase();
            setShipmentData(prev => ({
              ...prev,
              shipmentType: newType,
              amazonShipmentNumber: getAmazonShipmentFormat(newType),
            }));
          }
          // Mark export as completed
          setCompletedTabs(prev => {
            const newSet = new Set(prev);
            newSet.add('export');
            return newSet;
          });
          setExportCompleted(true);
        }}
        onBeginFormulaCheck={async () => {
          // Book shipment if not already booked (needed for formula check)
          if (!shipmentId) {
            try {
              setLoading(true);
              
              // Validate: Must have products selected
              // Only include products that are BOTH in addedRows AND have qty > 0
              const productsToAdd = Object.keys(qtyValues)
                .filter(idx => {
                  const product = products[idx];
                  const qty = qtyValues[idx];
                  return product && addedRows.has(product.id) && qty > 0;
                })
                .map(idx => ({
                  catalog_id: products[idx].catalogId || products[idx].id,
                  quantity: qtyValues[idx],
                }));
              
              if (productsToAdd.length === 0) {
                toast.error('Please add at least one product before exporting');
                setLoading(false);
                return;
              }
              
              // Create shipment - ensure shipment number and date are always set
              // Require shipment type to be selected before creating shipment
              if (!shipmentData.shipmentType) {
                toast.error('Please select a shipment type (FBA or AWD) in the export template before proceeding.');
                setLoading(false);
                return;
              }
              
              const shipmentNumber = shipmentData.shipmentNumber || generateShipmentNumber();
              const shipmentDate = shipmentData.shipmentDate || new Date().toISOString().split('T')[0];
              
              const newShipment = await createShipment({
                shipment_number: shipmentNumber,
                shipment_date: shipmentDate,
                shipment_type: shipmentData.shipmentType,
                marketplace: 'Amazon',
                account: shipmentData.account || 'TPS Nutrients',
                location: shipmentData.location || '',
                created_by: 'current_user',
              });
              
              const newShipmentId = newShipment.id;
              setShipmentId(newShipmentId);
              
              // Add products to shipment
              await addShipmentProducts(newShipmentId, productsToAdd);
              
              // Update shipment to mark add_products as completed
              await updateShipment(newShipmentId, {
                add_products_completed: true,
                status: 'label_check',
              });
              
              // Mark 'add-products' and 'export' as completed
              setCompletedTabs(prev => {
                const newSet = new Set(prev);
                newSet.add('add-products');
                newSet.add('export');
                return newSet;
              });
              setExportCompleted(true);
              toast.success('Shipment booked and exported!');
            } catch (error) {
              console.error('Error booking shipment for export:', error);
              toast.error('Failed to book shipment: ' + error.message);
              setLoading(false);
              return;
            } finally {
              setLoading(false);
            }
          } else {
            // If shipment already existed, still mark export as completed
            setCompletedTabs(prev => {
              const newSet = new Set(prev);
              newSet.add('export');
              return newSet;
            });
            setExportCompleted(true);
          }
          
          // After exporting, move to Label Check and keep footer visible
          handleActionChange('label-check');
        }}
        products={products.map((product, index) => ({
          ...product,
          qty: qtyValues[index] || 0
        })).filter(p => addedRows.has(p.id) && p.qty > 0)}
        shipmentData={shipmentData}
      />

      <SortProductsCompleteModal
        isOpen={isSortProductsCompleteOpen}
        onClose={() => setIsSortProductsCompleteOpen(false)}
        onBeginSortFormulas={handleBeginSortFormulas}
      />

      <SortFormulasCompleteModal
        isOpen={isSortFormulasCompleteOpen}
        onClose={() => setIsSortFormulasCompleteOpen(false)}
        shipmentData={shipmentData}
        onGoToShipments={() => {
          // Store shipment data in localStorage before navigation
          const dataToSave = {
            shipmentData: shipmentData,
            shipmentId: shipmentId,
            timestamp: new Date().toISOString(),
          };
          
          console.log('Data to save to localStorage:', dataToSave);
          localStorage.setItem('sortFormulasCompleted', JSON.stringify(dataToSave));
          
          // Close modal and navigate will be handled by the modal component
          setIsSortFormulasCompleteOpen(false);
        }}
      />
      <VarianceExceededModal
        isOpen={isVarianceExceededOpen}
        onClose={() => setIsVarianceExceededOpen(false)}
        onGoBack={handleVarianceGoBack}
        onRecount={async () => {
          setIsVarianceExceededOpen(false);
          // Show label check comment modal instead of navigating away
          setIsLabelIncompleteComment(true);
          setIsLabelCheckCommentOpen(true);
        }}
        varianceCount={varianceCount}
      />

      <UncheckedFormulaModal
        isOpen={isUncheckedFormulaOpen}
        remainingCount={uncheckedFormulaCount}
        onCancel={() => {
          setIsFormulaIncompleteComment(false);
          setIsUncheckedFormulaOpen(false);
        }}
        onConfirm={() => {
          setIsUncheckedFormulaOpen(false);
          setIsFormulaIncompleteComment(true);
          setIsFormulaCheckCommentOpen(true);
        }}
      />

      <FormulaCheckCommentModal
        isOpen={isFormulaCheckCommentOpen}
        onClose={() => {
          setIsFormulaIncompleteComment(false);
          setIsFormulaCheckCommentOpen(false);
        }}
        onComplete={async (comment) => {
          setIsFormulaCheckCommentOpen(false);
          await completeFormulaStep(comment, isFormulaIncompleteComment);
          setIsFormulaIncompleteComment(false);
        }}
        isDarkMode={isDarkMode}
      />

      <LabelCheckCommentModal
        isOpen={isLabelCheckCommentOpen}
        onClose={() => {
          setIsLabelCheckCommentOpen(false);
          setIsLabelIncompleteComment(false);
        }}
        onComplete={async (comment) => {
          setIsLabelCheckCommentOpen(false);
          await completeLabelCheck(comment, isLabelIncompleteComment);
          setIsLabelIncompleteComment(false);
        }}
        isDarkMode={isDarkMode}
        isIncomplete={isLabelIncompleteComment}
      />

      <LabelCheckCompleteModal
        isOpen={isLabelCheckCompleteOpen}
        onClose={() => setIsLabelCheckCompleteOpen(false)}
        onGoToShipments={() => {
          setIsLabelCheckCompleteOpen(false);
        }}
        onBeginFormulaCheck={() => {
          setIsLabelCheckCompleteOpen(false);
          // Navigate to formula-check section
          handleActionChange('formula-check');
        }}
        onBeginBookShipment={() => {
          setIsLabelCheckCompleteOpen(false);
          // Navigate to book-shipment section
          handleActionChange('book-shipment');
        }}
        isFormulaCheckCompleted={completedTabs.has('formula-check')}
      />

      <FormulaCheckCompleteModal
        isOpen={isFormulaCheckCompleteOpen}
        onClose={() => setIsFormulaCheckCompleteOpen(false)}
        onGoToShipments={() => {
          setIsFormulaCheckCompleteOpen(false);
        }}
        onBeginLabelCheck={() => {
          setIsFormulaCheckCompleteOpen(false);
          // Navigate to label-check section
          handleActionChange('label-check');
        }}
      />

      {/* Book Shipment Complete Modal */}
      {isBookShipmentCompleteOpen && (
        <>
          {/* Backdrop */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.35)',
              zIndex: 9998,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={() => setIsBookShipmentCompleteOpen(false)}
          >
            {/* Modal */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '14px',
                width: '400px',
                border: '1px solid #E5E7EB',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                zIndex: 9999,
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                type="button"
                aria-label="Close"
                onClick={() => setIsBookShipmentCompleteOpen(false)}
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#9CA3AF',
                  width: '24px',
                  height: '24px',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Content */}
              <div style={{
                padding: '32px 24px 18px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '14px',
              }}>
                {/* Green checkmark icon */}
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  backgroundColor: '#10B981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 12L10 17L19 8" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>

                {/* Title */}
                <h2 style={{
                  fontSize: '20px',
                  fontWeight: 600,
                  color: '#111827',
                  margin: 0,
                  textAlign: 'center',
                }}>
                  Shipment Booked!
                </h2>
              </div>

              {/* Footer buttons */}
              <div style={{
                padding: '14px 20px 20px',
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '10px',
              }}>
                {/* Go to Shipments button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsBookShipmentCompleteOpen(false);
                    navigate('/dashboard/production/planning', { 
                      state: { refresh: true } 
                    });
                  }}
                  style={{
                    minWidth: '170px',
                    height: '31px',
                    padding: '0 14px',
                    borderRadius: '4px',
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: '#374151',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F3F4F6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                  }}
                >
                  Go to Shipments
                </button>

                {/* Begin Sort Products button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsBookShipmentCompleteOpen(false);
                    setActiveAction('sort-products');
                  }}
                  style={{
                    minWidth: '170px',
                    height: '31px',
                    padding: '0 12px',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: '#007AFF',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#005FCC';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#007AFF';
                  }}
                >
                  Begin Sort Products
                </button>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
};

export default NewShipment;


