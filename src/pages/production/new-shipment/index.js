import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { createShipment, getShipmentById, updateShipment, addShipmentProducts, getShipmentProducts, getShipmentFormulaCheck, getLabelsAvailability } from '../../../services/productionApi';
import CatalogAPI from '../../../services/catalogApi';
import NgoosAPI from '../../../services/ngoosApi';
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
  const [isRecountMode, setIsRecountMode] = useState(false);
  const [varianceExceededRowIds, setVarianceExceededRowIds] = useState([]);
  const [labelCheckRows, setLabelCheckRows] = useState([]);
  const [formulaCheckData, setFormulaCheckData] = useState({ total: 0, completed: 0, remaining: 0 });
  const [labelCheckData, setLabelCheckData] = useState({ total: 0, completed: 0, remaining: 0 });
  const [shipmentProducts, setShipmentProducts] = useState([]); // Products loaded from existing shipment
  const [tableMode, setTableMode] = useState(false);
  const [activeAction, setActiveAction] = useState('add-products');
  const [completedTabs, setCompletedTabs] = useState(new Set());
  const [addedRows, setAddedRows] = useState(new Set());
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
  
  // Generate unique shipment number
  const generateShipmentNumber = () => {
    return new Date().toISOString().split('T')[0].replace(/-/g, '.') + '-' + Date.now().toString().slice(-6);
  };

  const [shipmentData, setShipmentData] = useState({
    shipmentNumber: generateShipmentNumber(),
    shipmentDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
    shipmentType: 'AWD',
    location: '',
    account: 'TPS Nutrients',
    amazonShipmentNumber: 'STAR-XXXXXXXXXXXXX', // Default for AWD
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
  
  // Update Amazon Shipment # format when shipment type changes
  useEffect(() => {
    const format = getAmazonShipmentFormat(shipmentData.shipmentType);
    if (shipmentData.amazonShipmentNumber !== format && shipmentData.shipmentType) {
      setShipmentData(prev => ({
        ...prev,
        amazonShipmentNumber: format,
      }));
    }
  }, [shipmentData.shipmentType]);

  // Load products from catalog - reload when shipment ID changes (new shipment vs editing)
  useEffect(() => {
    loadProducts();
  }, [id]); // Re-run when ID changes to get fresh labels availability

  // Reset shipment number for new shipments (when no ID in route)
  useEffect(() => {
    if (!id) {
      setShipmentData(prev => ({
        ...prev,
        shipmentNumber: generateShipmentNumber(),
        shipmentDate: new Date().toISOString().split('T')[0],
      }));
    }
  }, [id]); // Re-run when ID changes (e.g., navigating from edit to new)

  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      
      // Load Amazon forecast data, production supply chain data, and labels availability
      const [planningData, productionInventory, labelsAvailability] = await Promise.all([
        NgoosAPI.getPlanning(1, 1000),
        import('../../../services/productionApi').then(api => api.getProductsInventory()),
        getLabelsAvailability(shipmentId) // Pass shipment ID to exclude current shipment
      ]);
      
      console.log('Loaded planning data:', planningData.products.length, 'products');
      console.log('Loaded production inventory:', productionInventory.length, 'items');
      console.log('Loaded labels availability:', Object.keys(labelsAvailability.byLocation || {}).length, 'label locations');
      
      // Store labels availability map
      setLabelsAvailabilityMap(labelsAvailability.byLocation || {});
      
      if (productionInventory.length > 0) {
        console.log('Sample production item:', productionInventory[0]);
      }
      
      // Create lookup for production inventory by ASIN
      const productionMap = {};
      productionInventory.forEach(item => {
        if (item.child_asin) {
          productionMap[item.child_asin] = item;
        }
      });
      
      console.log('Production map has', Object.keys(productionMap).length, 'entries');
      console.log('Sample ASINs in map:', Object.keys(productionMap).slice(0, 5));
      
      // Remove duplicates by ASIN (in case forecast lambda returns dupes)
      const uniqueProducts = {};
      planningData.products.forEach(item => {
        if (!uniqueProducts[item.asin]) {
          uniqueProducts[item.asin] = item;
        }
      });
      
      // Transform planning data to match table format
      const formattedProducts = Object.values(uniqueProducts).map((item) => {
        // Get supply chain data for this product
        const supplyChain = productionMap[item.asin] || {};
        
        // Debug Cherry Tree specifically
        if (item.product && item.product.includes('Cherry Tree')) {
          console.log('Cherry Tree product:', item.asin, item.product);
          console.log('Has supply chain data?', !!productionMap[item.asin]);
          if (productionMap[item.asin]) {
            console.log('Supply chain:', productionMap[item.asin]);
          }
        }
        
        // Calculate DOI if not provided (fallback to 30-day sales)
        let calculatedDoiTotal = item.doi_total || 0;
        let calculatedDoiFba = item.doi_fba || 0;
        
        // If DOI not provided or zero, calculate from sales
        if (calculatedDoiTotal === 0 && item.sales_30_day > 0) {
          const dailySales = item.sales_30_day / 30.0;
          const totalInventory = item.inventory || 0;
          calculatedDoiTotal = Math.round(totalInventory / dailySales);
          
          // Estimate FBA Available as ~50% of total (typical split between FBA available/reserved/inbound)
          const estimatedFbaAvailable = totalInventory * 0.5;
          calculatedDoiFba = Math.round(estimatedFbaAvailable / dailySales);
        }
        
        // Ensure FBA DOI is always <= Total DOI and differentiate them
        if (calculatedDoiFba === calculatedDoiTotal && calculatedDoiTotal > 0) {
          // If they're the same, estimate FBA as 50% of total
          calculatedDoiFba = Math.round(calculatedDoiTotal * 0.5);
        } else if (calculatedDoiFba === 0 && calculatedDoiTotal > 0) {
          // If we have doi_total but not doi_fba, estimate FBA as 50% of total
          calculatedDoiFba = Math.round(calculatedDoiTotal * 0.5);
        } else if (calculatedDoiFba > calculatedDoiTotal) {
          // If FBA is somehow greater than total, cap it
          calculatedDoiFba = calculatedDoiTotal;
        }
        
        // Calculate forecast (use ML forecast or fallback to recent sales trend)
        let weeklyForecast = item.weekly_forecast || 0;
        if (weeklyForecast === 0 && item.sales_30_day > 0) {
          // Fallback: Use 30-day sales average as forecast estimate
          weeklyForecast = (item.sales_30_day / 30) * 7; // Convert daily avg to weekly
        }
        
        return {
          id: item.asin, // Use ASIN as temp ID
          catalogId: supplyChain.id || item.asin,
          brand: item.brand,
          product: item.product,
          size: item.size,
          childAsin: item.asin,
          childSku: supplyChain.child_sku_final || '',
          marketplace: 'Amazon',
          account: 'TPS Nutrients',
          // Inventory/DOI data from N-GOOS planning endpoint
          fbaAvailable: Math.round((item.inventory || 0) * 0.5), // Estimate FBA as 50% of total
          totalInventory: item.inventory || 0,
          forecast: Math.round(weeklyForecast), // Weekly forecast (ML or sales-based estimate)
          daysOfInventory: calculatedDoiTotal, // Total DOI (used for color coding)
          doiFba: calculatedDoiFba, // DOI for FBA Available (purple bar)
          doiTotal: calculatedDoiTotal, // DOI for Total Inventory (green bar)
          sales7Day: item.sales_7_day || 0,
          sales30Day: item.sales_30_day || 0,
          weeklyForecast: weeklyForecast,
          // Supply chain data from production inventory
          bottle_name: supplyChain.bottle_name || '',
          formula_name: supplyChain.formula_name || item.formula || '',
          closure_name: supplyChain.closure_name || '',
          label_location: supplyChain.label_location || '',
          label_size: supplyChain.label_size || '',
          case_size: '',
          units_per_case: supplyChain.units_per_case || 60,
          // Supply chain inventory levels
          bottleInventory: supplyChain.bottle_inventory || 0,
          closureInventory: supplyChain.closure_inventory || 0,
          labelsAvailable: supplyChain.label_inventory || 0,
          formulaGallonsAvailable: supplyChain.formula_gallons_available || 0,
          formulaGallonsPerUnit: supplyChain.gallons_per_unit || 0,
          maxUnitsProducible: supplyChain.max_units_producible || 0,
          bottle_name: supplyChain.bottle_name || '',
          closure_name: supplyChain.closure_name || '',
        };
      });
      
      console.log('Loaded products with supply chain:', formattedProducts.length, 'Sample:', formattedProducts[0]);
      
      // Sort: items with sales activity first, then by higher sales, then by lower inventory
      const sortedProducts = formattedProducts.sort((a, b) => {
        // First: items with sales > 0 come first
        const aHasSales = a.sales30Day > 0 ? 0 : 1;
        const bHasSales = b.sales30Day > 0 ? 0 : 1;
        if (aHasSales !== bHasSales) return aHasSales - bHasSales;
        
        // Second: higher sales first
        if (a.sales30Day !== b.sales30Day) return b.sales30Day - a.sales30Day;
        
        // Third: lower inventory first
        return a.totalInventory - b.totalInventory;
      });
      
      setProducts(sortedProducts);
      setDataAsOfDate(new Date()); // Mark data as fresh
      
      // Initialize qty values as empty - only populate when Add is clicked
      setQtyValues({});
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
        setActiveAction(location.state.initialAction);
      }
    }
  }, [location.state]);

  // Load existing shipment when shipmentId is set
  useEffect(() => {
    if (shipmentId) {
      loadShipment();
    } else if (location.state?.shipmentData) {
      setShipmentData(location.state.shipmentData);
    }
  }, [shipmentId]);

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
      });
      
      // Set completed tabs
      const completed = new Set();
      if (data.add_products_completed) completed.add('add-products');
      if (data.formula_check_completed) completed.add('formula-check');
      if (data.label_check_completed) completed.add('label-check');
      if (data.book_shipment_completed) completed.add('book-shipment');
      if (data.sort_products_completed) completed.add('sort-products');
      if (data.sort_formulas_completed) completed.add('sort-formulas');
      setCompletedTabs(completed);
      
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
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [qtyValues, setQtyValues] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

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
    
    // Use units_per_case from catalog if available, otherwise calculate based on size
    let boxesNeeded = 0;
    if (product.units_per_case && product.units_per_case > 0) {
      boxesNeeded = numQty / product.units_per_case;
    } else {
      // Fallback to size-based calculation
      let boxesPerUnit = 0;
      const size = product.size?.toLowerCase() || '';
      
      if (size.includes('8oz')) {
        boxesPerUnit = 1 / 60; // 60 units = 1 box
      } else if (size.toLowerCase().includes('quart')) {
        boxesPerUnit = 1 / 12; // 12 units = 1 box
      } else if (size.toLowerCase().includes('gallon')) {
        boxesPerUnit = 1 / 4; // 4 units = 1 box
      }
      boxesNeeded = numQty * boxesPerUnit;
    }
    
    return sum + boxesNeeded;
  }, 0);

  // Calculate palettes (assuming ~50 boxes per palette, can be adjusted)
  const totalPalettes = Math.ceil(Math.ceil(totalBoxes) / 50);

  // Calculate time in hours (placeholder - can be calculated based on production time)
  const totalTimeHours = 0;

  // Calculate weight in lbs (placeholder - can be calculated based on product weights)
  const totalWeightLbs = 0;

  const handleProductClick = (row) => {
    setSelectedRow(row);
    setIsNgoosOpen(true);
  };

  const handleActionChange = (action) => {
    setActiveAction(action);
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
        
        const newShipment = await createShipment({
          shipment_number: shipmentNumber,
          shipment_date: shipmentDate,
          shipment_type: currentShipmentData.shipmentType || 'AWD',
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
      
      // Update shipment to mark add_products as completed and move to formula_check
      await updateShipment(currentShipmentId, {
        add_products_completed: true,
        status: 'formula_check',
      });
      
      // Mark 'add-products' as completed when navigating to 'formula-check'
      setCompletedTabs(prev => {
        const newSet = new Set(prev);
        newSet.add('add-products');
        return newSet;
      });
      setActiveAction('formula-check');
      setIsShipmentDetailsOpen(false);
      toast.success('Moving to Formula Check');
    } catch (error) {
      console.error('Error booking shipment:', error);
      toast.error('Failed to book shipment: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Check for variance exceeded and get row IDs
  const checkVarianceExceeded = () => {
    // For label-check and formula-check actions, check if there are products with variance exceeded
    if (activeAction === 'label-check') {
      // Check rows from LabelCheckTable
      // Variance is exceeded when discrepancy between calculated total and labels needed exceeds threshold
      // Threshold: absolute value > 5% of labels needed or > 10 units (whichever is larger)
      const varianceThreshold = 10; // Minimum threshold in units
      const varianceThresholdPercent = 0.05; // 5% threshold
      
      const rowsWithVariance = labelCheckRows.filter(row => {
        // Only check rows that have been completed (have a totalCount value)
        if (row.totalCount === '' || row.totalCount === null || row.totalCount === undefined) {
          return false;
        }
        
        const calculatedTotal = typeof row.totalCount === 'number' ? row.totalCount : parseFloat(row.totalCount) || 0;
        const labelsNeeded = row.quantity || 0;
        
        // Calculate discrepancy: calculated total - labels needed
        const discrepancy = calculatedTotal - labelsNeeded;
        const absVariance = Math.abs(discrepancy);
        
        // Check if variance exceeds threshold (either absolute or percentage)
        const percentThreshold = Math.abs(labelsNeeded * varianceThresholdPercent);
        const threshold = Math.max(varianceThreshold, percentThreshold);
        
        return absVariance > threshold;
      });
      
      const varianceRowIds = rowsWithVariance.map(row => row.id);
      setVarianceExceededRowIds(varianceRowIds);
      return varianceRowIds.length;
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

  const handleCompleteClick = async () => {
    try {
      if (!shipmentId) {
        toast.error('Please book the shipment first');
        return;
      }

      // WORKFLOW PROGRESSION:
      // add-products → formula-check → label-check → (review) → sort-products → sort-formulas

      if (activeAction === 'formula-check') {
        // Formula Check: Verify formulas are reviewed, then move to Label Check
        await updateShipment(shipmentId, {
          formula_check_completed: true,
          status: 'label_check',
        });
        setCompletedTabs(prev => new Set(prev).add('formula-check'));
        setActiveAction('label-check');
        toast.success('Formula Check completed! Moving to Label Check');
        return;
      }

      if (activeAction === 'label-check') {
        // Check for variance first
        const varianceCount = checkVarianceExceeded();
        if (varianceCount > 0) {
          setVarianceCount(varianceCount);
          setIsVarianceExceededOpen(true);
          return;
        }
        
        // Label Check: Complete and move to Book Shipment
        await updateShipment(shipmentId, {
          label_check_completed: true,
          status: 'book_shipment',
        });
        setCompletedTabs(prev => new Set(prev).add('label-check'));
        setActiveAction('book-shipment');
        toast.success('Label Check completed! Moving to Book Shipment.');
        return;
      }

      if (activeAction === 'book-shipment') {
        // Book Shipment: Complete and show modal
        await updateShipment(shipmentId, {
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
  const filteredProducts = products.filter(product => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      (product.brand?.toLowerCase() || '').includes(searchLower) ||
      (product.product?.toLowerCase() || '').includes(searchLower) ||
      (product.size?.toLowerCase() || '').includes(searchLower) ||
      (product.childAsin?.toLowerCase() || '').includes(searchLower) ||
      (product.childSku?.toLowerCase() || '').includes(searchLower)
    );
  });

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
                      style={{ cursor: 'pointer' }}
                    >
                      <circle cx="12" cy="12" r="10" stroke="#9CA3AF" strokeWidth="2" fill="none"/>
                      <circle cx="12" cy="12" r="2" fill="#9CA3AF"/>
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
                        width: '304px',
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
            <SortProductsTable />
          </div>
        )}

        {activeAction === 'sort-formulas' && (
          <div style={{ marginTop: '1.5rem' }}>
            <SortFormulasTable />
          </div>
        )}

        {activeAction === 'formula-check' && (
          <div style={{ marginTop: '1.5rem' }}>
            <FormulaCheckTable 
              shipmentId={shipmentId}
              isRecountMode={isRecountMode}
              varianceExceededRowIds={varianceExceededRowIds}
              onFormulaDataChange={setFormulaCheckData}
            />
          </div>
        )}

        {activeAction === 'label-check' && (
          <div style={{ marginTop: '1.5rem' }}>
            <LabelCheckTable 
              shipmentId={shipmentId}
              isRecountMode={isRecountMode}
              varianceExceededRowIds={varianceExceededRowIds}
              onExitRecountMode={() => {
                setIsRecountMode(false);
                setVarianceExceededRowIds([]);
              }}
              onRowsDataChange={setLabelCheckRows}
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
                  Ship From
                </label>
                <input
                  type="text"
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
                  Ship To
                </label>
                <input
                  type="text"
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
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: isDarkMode ? '#9CA3AF' : '#6B7280', marginBottom: '6px' }}>
                  Carrier
                </label>
                <select
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
                    backgroundColor: isDarkMode ? '#374151' : '#FFFFFF',
                    color: isDarkMode ? '#9CA3AF' : '#9CA3AF',
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
                  <option value="">Select Carrier Name...</option>
                  <option value="ups">UPS</option>
                  <option value="fedex">FedEx</option>
                  <option value="usps">USPS</option>
                  <option value="dhl">DHL</option>
                </select>
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
                <button
                  type="button"
                  onClick={handleCompleteClick}
                  style={{
                    height: '31px',
                    padding: '0 16px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#9CA3AF',
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
                    e.currentTarget.style.backgroundColor = '#6B7280';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#9CA3AF';
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
                    {labelCheckRows.length}
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
                    {labelCheckRows.filter(row => row.totalCount !== '' && row.totalCount !== null && row.totalCount !== undefined).length}
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
                    {labelCheckRows.length - labelCheckRows.filter(row => row.totalCount !== '' && row.totalCount !== null && row.totalCount !== undefined).length}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={handleCompleteClick}
                  style={{
                    height: '31px',
                    padding: '0 16px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#9CA3AF',
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
                    e.currentTarget.style.backgroundColor = '#6B7280';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#9CA3AF';
                  }}
                >
                  Complete
                </button>
              </div>
            </>
          ) : activeAction === 'book-shipment' ? (
            /* Book Shipment Footer */
            <>
              <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
                {/* Empty left side */}
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={handleCompleteClick}
                  style={{
                    height: '31px',
                    padding: '0 16px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#9CA3AF',
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
                    e.currentTarget.style.backgroundColor = '#6B7280';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#9CA3AF';
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
                    {totalPalettes}
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
                    {Math.ceil(totalBoxes)}
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
                    {totalUnits}
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
                    {totalTimeHours}
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
                    {totalWeightLbs}
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
        onExport={() => {
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
              const productsToAdd = Object.keys(qtyValues)
                .filter(idx => qtyValues[idx] > 0)
                .map(idx => ({
                  catalog_id: products[idx].catalogId,
                  quantity: qtyValues[idx],
                }));
              
              if (productsToAdd.length === 0) {
                toast.error('Please add at least one product before exporting');
                setLoading(false);
                return;
              }
              
              // Create shipment - ensure shipment number and date are always set
              const shipmentNumber = shipmentData.shipmentNumber || generateShipmentNumber();
              const shipmentDate = shipmentData.shipmentDate || new Date().toISOString().split('T')[0];
              
              const newShipment = await createShipment({
                shipment_number: shipmentNumber,
                shipment_date: shipmentDate,
                shipment_type: shipmentData.shipmentType || 'AWD',
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
                status: 'formula_check',
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
          
          // After exporting, move to Formula Check and keep footer visible
          setActiveAction('formula-check');
        }}
        products={products.map((product, index) => ({
          ...product,
          qty: qtyValues[index] || 0
        })).filter(p => p.qty > 0)}
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
        onRecount={handleVarianceRecount}
        varianceCount={varianceCount}
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
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
                borderRadius: '12px',
                width: '360px',
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
                padding: '32px 24px 24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
              }}>
                {/* Green checkmark icon */}
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: '#10B981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
                padding: '16px 24px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '12px',
              }}>
                {/* Go to Shipments button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsBookShipmentCompleteOpen(false);
                    navigate('/production/planning');
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: '#374151',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F9FAFB';
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
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#3B82F6',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#2563EB';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#3B82F6';
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

