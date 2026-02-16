import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { useSidebar } from '../../../context/SidebarContext';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { createShipment, getShipmentById, updateShipment, addShipmentProducts, getShipmentProducts, getShipmentFormulaCheck, getLabelsAvailability, updateShipmentFormulaCheck, updateShipmentProductLabelCheck, getSellables, getShiners, getUnusedFormulas } from '../../../services/productionApi';
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
import DOISettingsPopover, { getDefaultDoiSettings } from './components/DOISettingsPopover';
import LocationSelect from './components/LocationSelect';
import AddLocationModal from './components/AddLocationModal';
import CarrierSelect from './components/CarrierSelect';
import AddCarrierModal from './components/AddCarrierModal';

// Per-shipment applied DOI persistence (Apply = for this shipment only; survives navigation)
const SHIPMENT_DOI_STORAGE_PREFIX = 'shipment_doi_applied_';
const getShipmentDoiStorageKey = (shipmentId) => SHIPMENT_DOI_STORAGE_PREFIX + (shipmentId || 'new');

// Utility function to extract size from product name
const extractSizeFromProductName = (productName) => {
  if (!productName) return null;
  const patterns = [
    /(\d+\s*oz)/i,
    /(\d+\s*ml)/i,
    /(Quart)/i,
    /(Gallon)/i,
    /(\d+\s*Gallon)/i,
  ];
  for (const pattern of patterns) {
    const match = productName.match(pattern);
    if (match) return match[1];
  }
  return null;
};

// Helper: determine step size for qty increments based on product size
// Mirrors the logic used in NewShipmentTable non-table mode so N-GOOS additions
// use the same case-based rounding behavior.
const getQtyIncrementForSize = (sizeRaw) => {
  const size = (sizeRaw || '').toLowerCase();
  const sizeCompact = size.replace(/\s+/g, '');

  // 8oz products change in full-case increments (60 units)
  if (sizeCompact.includes('8oz')) return 60;

  // 6oz products (bag or bottle) change in case increments (40 units)
  const isSixOz =
    sizeCompact.includes('6oz') ||
    size.includes('6 oz') ||
    size.includes('6-ounce') ||
    size.includes('6 ounce');

  // 1/2 lb bag products also use 40-unit increments
  const isHalfPoundBag =
    sizeCompact.includes('1/2lb') ||
    size.includes('1/2 lb') ||
    size.includes('0.5lb') ||
    size.includes('0.5 lb') ||
    size.includes('half lb');

  if (isSixOz || isHalfPoundBag) return 40;

  // 1 lb products change in case increments (25 units)
  const isOnePound =
    sizeCompact.includes('1lb') ||
    size.includes('1 lb') ||
    size.includes('1-pound') ||
    size.includes('1 pound');
  if (isOnePound) return 25;

  // 25 lb products should use single-unit increments
  const isTwentyFivePound =
    sizeCompact.includes('25lb') ||
    size.includes('25 lb') ||
    size.includes('25-pound') ||
    size.includes('25 pound');
  if (isTwentyFivePound) return 1;

  // 5 lb products change in small increments (5 units)
  const isFivePound =
    sizeCompact.includes('5lb') ||
    size.includes('5 lb') ||
    size.includes('5-pound') ||
    size.includes('5 pound');
  if (isFivePound) return 5;

  // Gallon products change in case increments (4 units)
  if (size.includes('gallon') || size.includes('gal ')) return 4;

  // Quart products change in case increments (12 units)
  if (size.includes('quart') || size.includes(' qt')) return 12;

  return 1;
};

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
  'The Plant Shoppe, LLC': ['TPS Nutrients', 'TPS Plant Foods', 'Bloom City'],
  'Total Pest Supply': ['NatureStop', "Ms. Pixie's", "Burke's", 'Mint +'],
};

// Get allowed brands for an account
const getAllowedBrandsForAccount = (account) => {
  return ACCOUNT_BRAND_MAPPING[account] || [];
};


// Load hazmat classification data
let hazmatClassificationMap = null;
const loadHazmatClassification = async () => {
  if (hazmatClassificationMap) return hazmatClassificationMap;
  
  try {
    const response = await fetch('/test13.json');
    const data = await response.json();
    // Create a map: product name (lowercase) -> hazmat status ("Yes" or "No")
    hazmatClassificationMap = {};
    data.forEach(item => {
      const productName = (item.Product || '').toLowerCase().trim();
      if (productName) {
        // Use the first occurrence of each product name, or update if we find "Yes"
        if (!hazmatClassificationMap[productName] || item.Hazmat === 'Yes') {
          hazmatClassificationMap[productName] = item.Hazmat || 'No';
        }
      }
    });
    console.log(`✅ Loaded hazmat classification for ${Object.keys(hazmatClassificationMap).length} products`);
    return hazmatClassificationMap;
  } catch (error) {
    console.error('Error loading hazmat classification:', error);
    return {};
  }
};


const NewShipment = () => {
  const { isDarkMode } = useTheme();
  const { sidebarWidth } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [shipmentId, setShipmentId] = useState(id || null);
  const [loading, setLoading] = useState(false);
  const [isNgoosOpen, setIsNgoosOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [openDoiSettings, setOpenDoiSettings] = useState(false);
  const [openForecastSettings, setOpenForecastSettings] = useState(false);
  // Store product-specific DOI settings (keyed by ASIN)
  const [productDoiSettings, setProductDoiSettings] = useState({});
  // Store product-specific forecast settings (keyed by ASIN)
  const [productForecastSettings, setProductForecastSettings] = useState({});
  const [isShipmentDetailsOpen, setIsShipmentDetailsOpen] = useState(false);
  const [addLocationForField, setAddLocationForField] = useState(null); // 'shipFrom' | 'shipTo' when Add Location modal is for that field
  const [isAddCarrierOpen, setIsAddCarrierOpen] = useState(false);
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
  const [isFormulaCheckCompleteOpen, setIsFormulaCheckCompleteOpen] = useState(false);
  const [isLabelCheckCommentOpen, setIsLabelCheckCommentOpen] = useState(false);
  const [isLabelIncompleteComment, setIsLabelIncompleteComment] = useState(false);
  const [labelCheckHasComment, setLabelCheckHasComment] = useState(false);
  const [isLabelCheckCompleteOpen, setIsLabelCheckCompleteOpen] = useState(false);
  const [selectedCarrier, setSelectedCarrier] = useState('');
  const [isRecountMode, setIsRecountMode] = useState(false);
  const [varianceExceededRowIds, setVarianceExceededRowIds] = useState([]);
  const [labelCheckRows, setLabelCheckRows] = useState([]);
  const [labelCheckSelectedRowsCount, setLabelCheckSelectedRowsCount] = useState(0);
  const [formulaCheckData, setFormulaCheckData] = useState({ total: 0, completed: 0, remaining: 0 });
  const [formulaSelectedRows, setFormulaSelectedRows] = useState(new Set());
  const [formulaCheckRefreshKey, setFormulaCheckRefreshKey] = useState(0);
  const [labelCheckRefreshKey, setLabelCheckRefreshKey] = useState(0);
  const [checkAllIncompleteTrigger, setCheckAllIncompleteTrigger] = useState(0);
  const [labelCheckData, setLabelCheckData] = useState({ total: 0, completed: 0, remaining: 0 });
  const [shipmentProducts, setShipmentProducts] = useState([]); // Products loaded from existing shipment
  const [tableMode, setTableMode] = useState(false);
  const [isCustomizeColumnsOpen, setIsCustomizeColumnsOpen] = useState(false);
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
  const [floorInventoryCounts, setFloorInventoryCounts] = useState({
    'Finished Goods': 0,
    'Shiners': 0,
    'Unused Formulas': 0
  });
  const [isBookShipmentHovered, setIsBookShipmentHovered] = useState(false);
  const bookShipmentButtonRef = useRef(null);
  const [bookShipmentTooltipPosition, setBookShipmentTooltipPosition] = useState({ top: 0, left: 0 });
  const [exportCompleted, setExportCompleted] = useState(false);
  
  // DOI Settings - managed by DOISettingsPopover component
  const [forecastRange, setForecastRange] = useState('150');
  const [doiSettingsValues, setDoiSettingsValues] = useState({
    amazonDoiGoal: 130,
    inboundLeadTime: 30,
    manufactureLeadTime: 7
  });
  // Applied DOI for this shipment (persisted; null = using default)
  const [appliedDoiForShipment, setAppliedDoiForShipment] = useState(null);

  // Track DOI settings change counter to trigger reload
  const [doiSettingsChangeCount, setDoiSettingsChangeCount] = useState(0);
  const doiSettingsInitialized = useRef(false);

  // Load persisted applied DOI when shipmentId is set (and migrate 'new' -> id when shipment is created)
  useEffect(() => {
    const key = getShipmentDoiStorageKey(shipmentId);
    if (shipmentId) {
      const fromNew = localStorage.getItem(getShipmentDoiStorageKey(null));
      if (fromNew) {
        try {
          localStorage.setItem(key, fromNew);
          localStorage.removeItem(getShipmentDoiStorageKey(null));
        } catch (e) {
          console.warn('Failed to migrate applied DOI from new to shipment:', e);
        }
      }
    }
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const stored = JSON.parse(raw);
        if (stored && typeof stored.totalDoi !== 'undefined' && stored.settings) {
          setForecastRange(String(stored.totalDoi));
          setDoiSettingsValues(stored.settings);
          setAppliedDoiForShipment(stored.settings);
          doiSettingsInitialized.current = true;
          loadProducts(stored.settings); // reload with restored DOI so Units to Make match
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to load applied DOI from storage:', e);
    }
    setAppliedDoiForShipment(null);
  }, [shipmentId]);
  
  // Track manually edited quantity indices (from NewShipmentTable)
  const manuallyEditedIndicesRef = useRef(new Set());
  
  // Sort option for product table
  const [sortOption, setSortOption] = useState('doi'); // 'doi', 'qty', 'name'

  // If user navigates to Label Check after exporting (for example by
  // clicking the top tab instead of the "Begin Label Check" button),
  // automatically create the shipment and attach products so that
  // LabelCheckTable has data to show.
  useEffect(() => {
    // Only run when:
    // - user is on the label-check step
    // - export has completed
    // - we don't already have a shipmentId
    if (activeAction !== 'label-check') return;
    if (shipmentId) return;
    if (!exportCompleted) return;

    const ensureShipmentForLabelCheck = async () => {
      try {
        setLoading(true);

        // Build list of products to attach to the shipment
        // Build productsToAdd by iterating through allProducts to catch products even if filtered out
        const productsToAdd = [];
        
        // First, try to get products from the current filtered products array
        products.forEach((product, index) => {
          if (addedRows.has(product.id)) {
            const qty = qtyValues[index] || 0;
            if (qty > 0) {
              productsToAdd.push({
                catalog_id: product.catalogId || product.id,
                quantity: qty,
              });
            }
          }
        });
        
        // Also check allProducts for any products in addedRows that might have been filtered out
        allProducts.forEach((product, allIndex) => {
          // Skip if we already added this product
          if (productsToAdd.some(p => (p.catalog_id === (product.catalogId || product.id)))) {
            return;
          }
          
          // If product is in addedRows, try to find it in current products array
          if (addedRows.has(product.id)) {
            const currentIndex = products.findIndex(p => p.id === product.id);
            if (currentIndex >= 0) {
              // Found in current products, use that index for qty lookup
              const qty = qtyValues[currentIndex] || 0;
              if (qty > 0) {
                productsToAdd.push({
                  catalog_id: product.catalogId || product.id,
                  quantity: qty,
                });
              }
            } else {
              // Not in current products (filtered out), but was added - check if we have a qty
              // Try to find qty by matching product ID across all indices
              let foundQty = 0;
              for (let idx = 0; idx < products.length; idx++) {
                if (products[idx]?.id === product.id) {
                  foundQty = qtyValues[idx] || 0;
                  break;
                }
              }
              // If still no qty found, check if there's a qty at the original allProducts index
              if (foundQty === 0 && qtyValues[allIndex]) {
                foundQty = qtyValues[allIndex];
              }
              if (foundQty > 0) {
                productsToAdd.push({
                  catalog_id: product.catalogId || product.id,
                  quantity: foundQty,
                });
              }
            }
          }
        });

        console.log('📦 Auto-booking shipment for Label Check:', {
          totalProducts: products.length,
          allProductsCount: allProducts.length,
          addedRowsCount: addedRows.size,
          productsToAddCount: productsToAdd.length,
          productsToAdd,
          addedRows: Array.from(addedRows),
        });

        if (productsToAdd.length === 0) {
          console.error('❌ No products to add - validation failed');
          toast.error('Please add at least one product before starting Label Check');
          return;
        }

        // Require shipment type before creating shipment
        if (!shipmentData.shipmentType) {
          console.error('❌ No shipment type selected');
          toast.error('Please select a shipment type (FBA or AWD) in the export template before proceeding to Label Check.');
          return;
        }

        const shipmentNumber = shipmentData.shipmentNumber || generateShipmentNumber();
        const shipmentDate = shipmentData.shipmentDate || new Date().toISOString().split('T')[0];

        console.log('🚀 Auto-creating shipment with data:', {
          shipment_number: shipmentNumber,
          shipment_date: shipmentDate,
          shipment_type: shipmentData.shipmentType,
          account: shipmentData.account,
        });

        const newShipment = await createShipment({
          shipment_number: shipmentNumber,
          shipment_date: shipmentDate,
          shipment_type: shipmentData.shipmentType,
          marketplace: 'Amazon',
          account: shipmentData.account || 'TPS Nutrients',
          location: shipmentData.location || '',
          created_by: 'current_user',
        });

        console.log('✅ Shipment auto-created:', newShipment);

        const newShipmentId = newShipment?.id || newShipment?.shipment_id || newShipment?.data?.id;
        if (!newShipmentId) {
          console.error('❌ No shipment ID in response:', newShipment);
          throw new Error('Invalid response from createShipment API - missing shipment ID');
        }

        console.log('🆔 Shipment ID:', newShipmentId);
        setShipmentId(newShipmentId);

        console.log('📝 Auto-adding products to shipment:', productsToAdd);
        const addResult = await addShipmentProducts(newShipmentId, productsToAdd);
        console.log('✅ Products auto-added:', addResult);

        console.log('🔄 Updating shipment status to label_check');
        await updateShipment(newShipmentId, {
          add_products_completed: true,
          status: 'label_check',
        });
        console.log('✅ Shipment status updated');

        setCompletedTabs(prev => {
          const newSet = new Set(prev);
          newSet.add('add-products');
          newSet.add('export');
          return newSet;
        });
        setExportCompleted(true);
        console.log('✅ Auto-booking completed successfully');
        toast.success('Shipment booked for Label Check.');
      } catch (error) {
        console.error('❌ Error preparing shipment for Label Check:', error);
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          error: error,
        });
        toast.error('Failed to prepare shipment for Label Check: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    // Fire and forget; LabelCheckTable will react when shipmentId is set
    ensureShipmentForLabelCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAction, shipmentId, exportCompleted]);
  
  // Callback when DOI settings change from the popover (Apply / Save as Default / initial load)
  const handleDoiSettingsChange = (newSettings, totalDoi, options = {}) => {
    const source = options?.source;
    const prevSettings = doiSettingsValues;
    setDoiSettingsValues(newSettings);
    setForecastRange(String(totalDoi));
    
    if (source === 'apply') {
      // Apply: Set appliedDoiForShipment to show exclamation icon and persist for this shipment
      setAppliedDoiForShipment(newSettings);
      try {
        const key = getShipmentDoiStorageKey(shipmentId);
        localStorage.setItem(key, JSON.stringify({
          settings: newSettings,
          totalDoi: totalDoi,
        }));
      } catch (e) {
        console.warn('Failed to persist applied DOI:', e);
      }
    } else if (source === 'saveAsDefault') {
      // Save as Default: Clear appliedDoiForShipment to remove exclamation icon
      setAppliedDoiForShipment(null);
      try {
        const key = getShipmentDoiStorageKey(shipmentId);
        localStorage.removeItem(key); // Remove persisted custom DOI to clear the badge
      } catch (e) {
        console.warn('Failed to clear applied DOI:', e);
      }
    }

    const settingsActuallyChanged = doiSettingsInitialized.current &&
        (prevSettings.amazonDoiGoal !== newSettings.amazonDoiGoal ||
         prevSettings.inboundLeadTime !== newSettings.inboundLeadTime ||
         prevSettings.manufactureLeadTime !== newSettings.manufactureLeadTime);

    if (settingsActuallyChanged) {
      console.log('DOI settings changed, reloading products with new settings:', newSettings);
      loadProducts(newSettings);
    }
    doiSettingsInitialized.current = true;
  };

  // Revert to default DOI for this shipment (clear applied; use API default)
  const handleRevertDoiToDefault = useCallback(async () => {
    try {
      const key = getShipmentDoiStorageKey(shipmentId);
      localStorage.removeItem(key);
      setAppliedDoiForShipment(null);
      const defaultSettings = await getDefaultDoiSettings();
      const totalDoi = (parseInt(defaultSettings.amazonDoiGoal) || 0) +
        (parseInt(defaultSettings.inboundLeadTime) || 0) +
        (parseInt(defaultSettings.manufactureLeadTime) || 0);
      setDoiSettingsValues(defaultSettings);
      setForecastRange(String(totalDoi));
      loadProducts(defaultSettings);
      setDoiSettingsChangeCount(c => c + 1);
      toast.success('DOI reverted to default settings for this shipment.');
    } catch (e) {
      console.error('Failed to revert DOI to default:', e);
      toast.error('Could not revert to default DOI settings.');
    }
  }, [shipmentId]);
  
  // Legacy state for tooltip (keeping for backward compatibility)
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

  // Generate unique shipment number
  const generateShipmentNumber = () => {
    return new Date().toISOString().split('T')[0].replace(/-/g, '.') + '-' + Date.now().toString().slice(-6);
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

  // DOI settings change - now uses instant accurate recalculation!
  // The /recalculate-doi endpoint uses cached cumulative forecasts to instantly recalculate units_to_make
  useEffect(() => {
    if (doiSettingsChangeCount > 0) {
      console.log('DOI settings changed. Recalculating with instant accurate recalculation:', doiSettingsValues);
      loadProducts(doiSettingsValues);
    }
  }, [doiSettingsChangeCount, forecastRange]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-sort products when sort option changes
  useEffect(() => {
    if (products.length > 0) {
      const sorted = [...products].sort((a, b) => {
        if (sortOption === 'doi') {
          const aDOI = a.doiTotal || a.daysOfInventory || 999;
          const bDOI = b.doiTotal || b.daysOfInventory || 999;
          if (aDOI !== bDOI) return aDOI - bDOI;
          return (b.suggestedQty || 0) - (a.suggestedQty || 0);
        } else if (sortOption === 'qty') {
          const aQty = a.suggestedQty || 0;
          const bQty = b.suggestedQty || 0;
          if (aQty !== bQty) return bQty - aQty;
          const aDOI = a.doiTotal || a.daysOfInventory || 999;
          const bDOI = b.doiTotal || b.daysOfInventory || 999;
          return aDOI - bDOI;
        } else if (sortOption === 'name') {
          const aName = (a.name || a.productName || '').toLowerCase();
          const bName = (b.name || b.productName || '').toLowerCase();
          return aName.localeCompare(bName);
        }
        return 0;
      });
      setProducts(sorted);
    }
  }, [sortOption]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch floor inventory counts
  useEffect(() => {
    const fetchFloorInventoryCounts = async () => {
      try {
        const [sellables, shiners, unusedFormulas] = await Promise.all([
          getSellables().catch(() => []),
          getShiners().catch(() => []),
          getUnusedFormulas().catch(() => [])
        ]);

        // Count products/items for each category
        const finishedGoodsCount = sellables.length || 0;
        
        // For shiners, count total products across all formula groups
        const shinersCount = shiners.reduce((total, group) => total + (group.products?.length || 0), 0);
        
        // For unused formulas, count total formulas
        const unusedFormulasCount = unusedFormulas.length || 0;

        setFloorInventoryCounts({
          'Finished Goods': finishedGoodsCount,
          'Shiners': shinersCount,
          'Unused Formulas': unusedFormulasCount
        });
      } catch (error) {
        console.error('Error fetching floor inventory counts:', error);
      }
    };

    fetchFloorInventoryCounts();
  }, []); // Fetch once on mount

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

  const loadProducts = async (doiSettings = null) => {
    try {
      setLoadingProducts(true);
      
      // Load TPS Forecast data (Railway/Lambda API), production supply chain data, and labels availability
      // Use production inventory as PRIMARY source (all products from our database)
      // Merge in forecast data where available
      // If DOI settings provided, use instant accurate recalculation endpoint
      // Otherwise, use cached data with default DOI values
      
      const apiOptions = doiSettings ? {
        amazonDoiGoal: doiSettings.amazonDoiGoal,
        inboundLeadTime: doiSettings.inboundLeadTime,
        manufactureLeadTime: doiSettings.manufactureLeadTime,
      } : {};
      
      const [tpsForecastData, productionInventory, labelsAvailability] = await Promise.all([
        NgoosAPI.getTpsAllForecasts(apiOptions), // Uses recalculate-doi if settings provided, else cached
        import('../../../services/productionApi').then(api => api.getProductsInventory()),
        getLabelsAvailability(shipmentId) // Pass shipment ID to exclude current shipment
      ]);
      
      // Map TPS forecast data to planning format - USE RAILWAY DATA AS SOURCE OF TRUTH
      const planningData = {
        products: (tpsForecastData.products || []).map(p => ({
            asin: p.asin || p.child_asin,
            child_asin: p.child_asin || p.asin,
            brand: p.brand || 'TPS Plant Foods',
            product: p.product_name || p.product,
            size: p.size || extractSizeFromProductName(p.product_name || p.product),
            // DOI from Railway API
            doi_total: p.doi_total_days || p.doi_total || 0,
            doi_fba: p.doi_fba_days || p.doi_fba || 0,
            // Inventory from Railway API
            inventory: p.total_inventory || 0,
            total_inventory: p.total_inventory || 0,
            fba_available: p.fba_available || 0,
            // Label inventory from Railway API
            label_inventory: p.label_inventory || 0,
            // Units to make from Railway API - USE EXACT VALUE FROM API
            units_to_make: p.units_to_make || 0,
            algorithm: p.algorithm,
            needs_seasonality: p.needs_seasonality,
            status: p.status,
            // Product image from Shopify (Railway API)
            image_url: p.image_url || null,
          }))
      };
      
      console.log('Loaded TPS forecast data:', planningData.products?.length || 0, 'products with forecast (source:', tpsForecastData.source || 'api', ')');
      console.log('Loaded production inventory:', productionInventory.length, 'total products from database');
      console.log('Loaded labels availability:', Object.keys(labelsAvailability.byLocation || {}).length, 'label locations');
      
      // Store labels availability map
      setLabelsAvailabilityMap(labelsAvailability.byLocation || {});
      
      if (productionInventory.length > 0) {
        console.log('Sample production item:', productionInventory[0]);
      }
      
      // Create lookup for forecast data by ASIN (index by both asin and child_asin so production inventory lookup succeeds)
      const forecastMap = {};
      (planningData.products || []).forEach(item => {
        const asin = item.asin || item.child_asin;
        if (asin) {
          forecastMap[asin] = item;
          if (item.child_asin && item.child_asin !== asin) {
            forecastMap[item.child_asin] = item;
          }
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
      
      // DEBUG: Show sample production inventory item structure
      if (uniqueProducts.length > 0) {
        const sample = uniqueProducts[0];
        console.log('Sample production inventory item ASIN fields:', {
          child_asin: sample.child_asin,
          asin: sample.asin,
          childAsin: sample.childAsin,
          product_name: sample.product_name
        });
      }
      
      // USE PRODUCTION INVENTORY AS PRIMARY SOURCE (all products from our database)
      // This ensures we show ALL products, not just those with forecast data
      let mergeSuccessCount = 0;
      let mergeFailCount = 0;
      const formattedProducts = uniqueProducts.map((item, index) => {
        // Get forecast data for this product if available - try multiple ASIN fields
        const asinKey = item.child_asin || item.asin || item.childAsin || '';
        const forecast = forecastMap[asinKey] || {};
        
        // Debug: Log when merge fails (no forecast data found)
        if (Object.keys(forecast).length === 0) {
          mergeFailCount++;
          if (mergeFailCount <= 5) {
            console.warn(`Forecast merge FAILED for: ${item.product_name} (ASIN key: "${asinKey}")`);
          }
        } else {
          mergeSuccessCount++;
        }
        
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
        
        // Get inventory values from Railway API (TPS Forecast) - this is the source of truth
        const railwayTotalInventory = forecast.total_inventory || forecast.inventory || 0;
        const railwayFbaAvailable = forecast.fba_available || 0;
        const railwayDoiTotal = forecast.doi_total || forecast.doi_total_days || 0;
        const railwayDoiFba = forecast.doi_fba || forecast.doi_fba_days || 0;
        const railwayUnitsToMake = forecast.units_to_make || 0;
        const railwayLabelInventory = forecast.label_inventory || 0;
        
        // Use units_to_make from Railway API as the forecast value
        // Fallback to sales-based calculation only if API value is 0
        let weeklyForecast = railwayUnitsToMake;
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
          // Image data - prioritize Railway API (Shopify images), then AWS Lambda
          mainImage: getImageUrl(forecast.image_url || item.mainImage || item.product_image_url || item.productImage || item.image || item.productImageUrl || null),
          product_image_url: getImageUrl(forecast.image_url || item.product_image_url || item.mainImage || item.productImage || item.image || item.productImageUrl || null),
          productImage: getImageUrl(forecast.image_url || item.productImage || item.mainImage || item.product_image_url || item.image || item.productImageUrl || null),
          image: getImageUrl(forecast.image_url || item.image || item.mainImage || item.product_image_url || item.productImage || item.productImageUrl || null),
          imageUrl: forecast.image_url || null, // Direct Shopify image URL
          // Inventory/DOI data - USE RAILWAY API (TPS Forecast) as source of truth
          fbaAvailable: railwayFbaAvailable,
          totalInventory: railwayTotalInventory,
          forecast: Math.round(weeklyForecast),
          daysOfInventory: railwayDoiTotal,
          doiFba: railwayDoiFba,
          doiTotal: railwayDoiTotal,
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
          // Label inventory - USE RAILWAY API as source of truth (falls back to AWS Lambda if Railway has 0)
          labelsAvailable: railwayLabelInventory || item.label_inventory || 0,
          label_inventory: railwayLabelInventory || item.label_inventory || 0,
          formulaGallonsAvailable: item.formula_gallons_available || 0,
          formulaGallonsPerUnit: item.gallons_per_unit || 0,
          maxUnitsProducible: item.max_units_producible || 0,
          // TPS Forecast data (from Railway API) - source of truth for units_to_make
          unitsToMake: railwayUnitsToMake, // Store TPS units_to_make for suggestedQty calculation
          units_to_make: railwayUnitsToMake, // Also store as units_to_make for compatibility
          tpsAlgorithm: forecast.algorithm || '',
          tpsNeedsSeasonality: forecast.needs_seasonality || false,
          // Packaging calculation fields (for pallets, weight, time)
          box_weight_lbs: parseFloat(item.box_weight_lbs) || 0,
          boxes_per_pallet: parseFloat(item.boxes_per_pallet) || 50,
          single_box_pallet_share: parseFloat(item.single_box_pallet_share) || 0.02,
          bottles_per_minute: parseInt(item.bottles_per_minute) || 20,
          finished_units_per_case: parseInt(item.finished_units_per_case) || 60,
        };
      });
      
      console.log('Loaded products with supply chain:', formattedProducts.length);
      console.log(`Forecast merge: ${mergeSuccessCount} SUCCESS, ${mergeFailCount} FAILED (no forecast data)`);
      
      // Use units_to_make from TPS Forecast API as suggested qty
      // This already accounts for DOI goals, lead times, and seasonality
      const productsWithSuggestedQty = formattedProducts.map((product, index) => {
        // Get forecast data for this product - use the stored units_to_make from formattedProducts
        // This ensures we use the same lookup that was done earlier
        const unitsPerCase = product.units_per_case || 60;
        const needsSeasonality = product.tpsNeedsSeasonality || false;
        
        // If product needs seasonality data, set QTY to 0 and flag it
        if (needsSeasonality) {
          return {
            ...product,
            suggestedQty: 0,
            algorithm: product.tpsAlgorithm || '',
            needsSeasonality: true,
          };
        }
        
        // Use units_to_make directly from product (set in formattedProducts from forecastMap)
        // This avoids a second lookup that might fail
        let suggestedQty = product.unitsToMake || 0;
        
        // Fallback: calculate if TPS forecast not available AND product doesn't need seasonality
        if (suggestedQty === 0 && !needsSeasonality) {
          const dailySalesRate = (product.sales30Day || 0) / 30;
          const currentDOI = product.doiTotal || product.daysOfInventory || 0;
          const targetDOI = parseInt(forecastRange) || 120;
          
          if (dailySalesRate > 0 && currentDOI < targetDOI) {
            const daysNeeded = targetDOI - currentDOI;
            const rawUnitsNeeded = daysNeeded * dailySalesRate;
            suggestedQty = Math.ceil(rawUnitsNeeded); // Just round up to whole number, no case pack rounding
          }
        }
        
        return {
          ...product,
          suggestedQty,
          // Keep original TPS values from formattedProducts
          algorithm: product.tpsAlgorithm || '',
          needsSeasonality: needsSeasonality,
        };
      });
      
      // Sort products based on selected sort option
      const sortedProducts = productsWithSuggestedQty.sort((a, b) => {
        if (sortOption === 'doi') {
          // Sort by DOI ascending (lowest DOI = most urgent)
          const aDOI = a.doiTotal || a.daysOfInventory || 999;
          const bDOI = b.doiTotal || b.daysOfInventory || 999;
          if (aDOI !== bDOI) return aDOI - bDOI;
          // Secondary: higher qty first
          return (b.suggestedQty || 0) - (a.suggestedQty || 0);
        } else if (sortOption === 'qty') {
          // Sort by QTY descending (highest units to make first)
          const aQty = a.suggestedQty || 0;
          const bQty = b.suggestedQty || 0;
          if (aQty !== bQty) return bQty - aQty;
          // Secondary: lower DOI first
          const aDOI = a.doiTotal || a.daysOfInventory || 999;
          const bDOI = b.doiTotal || b.daysOfInventory || 999;
          return aDOI - bDOI;
        } else if (sortOption === 'name') {
          // Sort by product name alphabetically
          const aName = (a.name || a.productName || '').toLowerCase();
          const bName = (b.name || b.productName || '').toLowerCase();
          return aName.localeCompare(bName);
        }
        return 0;
      });
      
      // Store all products (unfiltered) for account switching
      setAllProducts(sortedProducts);
      
      // Filter by account's allowed brands
      const allowedBrands = getAllowedBrandsForAccount(shipmentData.account);
      let filteredProducts = allowedBrands.length > 0 
        ? sortedProducts.filter(p => allowedBrands.includes(p.brand))
        : sortedProducts;
      
      // Apply shipment type filters based on hazmat classification
      const shipmentType = shipmentData.shipmentType || shipmentData.shipment_type || '';
      
      if (shipmentType === 'Hazmat') {
        // For Hazmat: only show products where Hazmat = "Yes"
        filteredProducts = filteredProducts.filter(p => {
          const productName = (p.product || p.product_name || '').toLowerCase().trim();
          const hazmatStatus = hazmatMap[productName] || 'No';
          return hazmatStatus === 'Yes';
        });
        console.log(`✅ Filtered to ${filteredProducts.length} hazmat products for Hazmat shipment`);
      } else if (shipmentType === 'FBA' || shipmentType === 'AWD') {
        // For FBA/AWD: only show products where Hazmat = "No"
        filteredProducts = filteredProducts.filter(p => {
          const productName = (p.product || p.product_name || '').toLowerCase().trim();
          const hazmatStatus = hazmatMap[productName] || 'No';
          return hazmatStatus === 'No';
        });
        console.log(`✅ Filtered to ${filteredProducts.length} non-hazmat products for ${shipmentType} shipment`);
      }
      
      setProducts(filteredProducts);
      setDataAsOfDate(new Date()); // Mark data as fresh
      
      console.log(`✅ Loaded ${sortedProducts.length} total products from database`);
      console.log(`✅ Showing ${filteredProducts.length} products after account filter (${shipmentData.account})`);
      console.log(`✅ Products with forecast data: ${Object.keys(forecastMap).length}`);
      
      // Preserve manually edited quantities when reloading
      // Build a map of product ID -> manually edited quantity
      const manuallyEditedQtyMap = {};
      const manuallyEditedProductIds = new Set();
      if (manuallyEditedIndicesRef.current && products.length > 0) {
        manuallyEditedIndicesRef.current.forEach((index) => {
          const product = products[index];
          if (product && qtyValues[index] !== undefined) {
            manuallyEditedQtyMap[product.id] = qtyValues[index];
            manuallyEditedProductIds.add(product.id);
          }
        });
      }
      
      // Initialize qty values with suggested quantities for FILTERED products
      // Use filtered products indices since that's what the table displays
      const initialQtyValues = {};
      const newManuallyEditedIndices = new Set();
      
      filteredProducts.forEach((product, index) => {
        // First check if this product had a manually edited quantity
        if (manuallyEditedQtyMap[product.id] !== undefined) {
          initialQtyValues[index] = manuallyEditedQtyMap[product.id];
          // Mark this index as manually edited in the new product list
          newManuallyEditedIndices.add(index);
        }
        // Otherwise auto-populate qty with suggested qty (or 0 when DOI is already at goal)
        else {
          const suggested = product.suggestedQty ?? product.unitsToMake ?? product.units_to_make ?? 0;
          if (suggested > 0) {
            const increment = getSuggestedQtyIncrement(product);
            const roundedSuggested =
              increment && increment > 1
                ? Math.ceil(suggested / increment) * increment
                : suggested;
            initialQtyValues[index] = roundedSuggested;
          } else {
            // DOI at goal (green): show 0 instead of blank
            initialQtyValues[index] = 0;
          }
        }
      });

      // Merge with any existing qty values so we don't accidentally
      // clear quantities that were already initialized elsewhere.
      setQtyValues(prev => ({
        ...(prev || {}),
        ...initialQtyValues,
      }));
      
      // Update manually edited indices with new indices after reload
      // IMPORTANT: Clear and repopulate the existing Set instead of replacing it
      // This preserves the reference that the child component is using
      if (manuallyEditedIndicesRef.current) {
        manuallyEditedIndicesRef.current.clear();
        newManuallyEditedIndices.forEach(idx => manuallyEditedIndicesRef.current.add(idx));
      }
      
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

  // Track if we've attempted to create shipment from planning (prevent duplicate attempts)
  const shipmentCreationAttemptedRef = useRef(false);

  // Create shipment immediately when coming from planning (even without products)
  useEffect(() => {
    const createShipmentFromPlanning = async () => {
      // Only create if:
      // 1. Coming from planning
      // 2. No shipmentId exists yet
      // 3. We have shipmentData from navigation
      // 4. We haven't already attempted to create it
      if (location.state?.fromPlanning && !shipmentId && location.state?.shipmentData && !shipmentCreationAttemptedRef.current) {
        const navShipmentData = location.state.shipmentData;
        
        // Validate required fields
        if (!navShipmentData.shipmentName || !navShipmentData.shipmentType || !navShipmentData.account) {
          console.warn('Missing required fields for shipment creation:', navShipmentData);
          return;
        }
        
        shipmentCreationAttemptedRef.current = true;
        
        try {
          setLoading(true);
          const shipmentPayload = {
            shipment_number: navShipmentData.shipmentName,
            shipment_date: new Date().toISOString().split('T')[0],
            shipment_type: navShipmentData.shipmentType,
            marketplace: navShipmentData.marketplace || 'Amazon',
            account: navShipmentData.account,
            location: navShipmentData.location || '',
            created_by: 'current_user', // TODO: Get from auth context
          };
          
          console.log('Creating shipment from planning:', shipmentPayload);
          const newShipment = await createShipment(shipmentPayload);
          
          // Handle different response formats
          const shipmentId = newShipment?.id || newShipment?.shipment_id || newShipment?.data?.id;
          const shipmentNumber = newShipment?.shipment_number || newShipment?.shipmentNumber || navShipmentData.shipmentName;
          
          if (shipmentId) {
            setShipmentId(shipmentId);
            setShipmentData(prev => ({
              ...prev,
              shipmentNumber: shipmentNumber,
              shipmentDate: newShipment.shipment_date || newShipment.shipmentDate || new Date().toISOString().split('T')[0],
              shipmentType: newShipment.shipment_type || newShipment.shipmentType || navShipmentData.shipmentType,
              account: newShipment.account || navShipmentData.account,
              marketplace: newShipment.marketplace || navShipmentData.marketplace || 'Amazon',
            }));
            console.log('Shipment created successfully:', shipmentId);
          } else {
            console.error('Invalid response from createShipment API:', newShipment);
            throw new Error('Invalid response from createShipment API - missing shipment ID');
          }
        } catch (error) {
          console.error('Error creating shipment from planning:', error);
          // Only show error toast if it's not a network error or if we have a meaningful error message
          const errorMessage = error?.message || error?.error || 'Failed to create shipment';
          // Check if error message contains useful information
          if (errorMessage && !errorMessage.includes('NetworkError') && !errorMessage.includes('Failed to fetch')) {
            toast.error(errorMessage);
          } else {
            // For network errors, show a more user-friendly message
            toast.error('Unable to create shipment. Please check your connection and try again.');
          }
          // Reset the ref so user can try again if needed
          shipmentCreationAttemptedRef.current = false;
        } finally {
          setLoading(false);
        }
      }
    };

    createShipmentFromPlanning();
  }, [location.state?.fromPlanning, location.state?.shipmentData, shipmentId]);

  // Load existing shipment when shipmentId is set
  useEffect(() => {
    // Reset per-shipment selections when switching shipments
    setFormulaSelectedRows(new Set());

    if (shipmentId) {
      loadShipment();
    } else if (location.state?.shipmentData && !location.state?.fromPlanning) {
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
  const [hazmatMap, setHazmatMap] = useState({}); // Hazmat classification map

  // Load hazmat classification on mount
  useEffect(() => {
    loadHazmatClassification().then(map => {
      setHazmatMap(map);
    });
  }, []);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [qtyValues, setQtyValues] = useState({});
  const MAX_ADD_PRODUCTS_UNDO = 50;
  const [addProductsUndoStack, setAddProductsUndoStack] = useState([]);
  const [addProductsRedoStack, setAddProductsRedoStack] = useState([]);
  const addProductsQtyValuesRef = useRef({});
  const addProductsAddedRowsRef = useRef(new Set());
  const addProductsFilteredProductsRef = useRef([]);
  const addProductsLastPushRef = useRef({ source: null, time: 0 }); // coalesce add + qty into one undo step
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrands, setSelectedBrands] = useState(null); // Brand filter from products dropdown (Set of brands or null)
  const [lastAccount, setLastAccount] = useState(null); // Track account changes
  const [lastForecastRange, setLastForecastRange] = useState(null); // Track forecastRange changes

  // Helper: determine case increment for a product's suggested quantity,
  // so Units to Make defaults align with full cases (e.g. 60 units for 8oz).
  const getSuggestedQtyIncrement = (product) => {
    const rawSize = product?.size || '';
    const size = rawSize.toLowerCase();
    const sizeCompact = size.replace(/\s+/g, '');

    // 8oz products change in full-case increments (60 units)
    if (sizeCompact.includes('8oz')) return 60;

    // 6oz products (bag or bottle) change in case increments (40 units)
    const isSixOz =
      sizeCompact.includes('6oz') ||
      size.includes('6 oz') ||
      size.includes('6-ounce') ||
      size.includes('6 ounce');

    // 1/2 lb bag products also use 40-unit increments
    const isHalfPoundBag =
      sizeCompact.includes('1/2lb') ||
      size.includes('1/2 lb') ||
      size.includes('0.5lb') ||
      size.includes('0.5 lb') ||
      size.includes('half lb');

    if (isSixOz || isHalfPoundBag) return 40;

    // 1 lb products change in case increments (25 units)
    const isOnePound =
      sizeCompact.includes('1lb') ||
      size.includes('1 lb') ||
      size.includes('1-pound') ||
      size.includes('1 pound');
    if (isOnePound) return 25;

    // Quart products change in case increments (12 units)
    if (size.includes('quart') || size.includes(' qt')) return 12;

    // Gallon products change in case increments (4 units)
    if (size.includes('gallon') || size.includes(' gal')) return 4;

    return 1;
  };
  
  // Clear brand filter when account changes
  useEffect(() => {
    if (lastAccount !== null && lastAccount !== shipmentData.account) {
      setSelectedBrands(null);
    }
    setLastAccount(shipmentData.account);
  }, [shipmentData.account, lastAccount]);

  // Keep Add Products undo refs in sync (so undo/redo can read current state)
  // Note: addProductsFilteredProductsRef is synced in render after filteredProducts is defined
  useEffect(() => {
    if (activeAction !== 'add-products') return;
    addProductsQtyValuesRef.current = qtyValues;
    addProductsAddedRowsRef.current = addedRows;
  }, [activeAction, qtyValues, addedRows]);

  const buildAddProductsSnapshot = useCallback((qtyVals, addedRowsSet, productsList) => {
    const quantitiesByProductId = {};
    (productsList || []).forEach((p, i) => {
      if (p && p.id && qtyVals[i] !== undefined && qtyVals[i] !== '') {
        quantitiesByProductId[p.id] = qtyVals[i];
      }
    });
    return {
      quantitiesByProductId,
      addedIds: Array.from(addedRowsSet || []),
    };
  }, []);

  const pushAddProductsUndo = useCallback((qtyVals, addedRowsSet, productsList) => {
    if (!productsList || productsList.length === 0) return;
    const snapshot = buildAddProductsSnapshot(qtyVals, addedRowsSet, productsList);
    setAddProductsUndoStack((prev) => [...prev.slice(-(MAX_ADD_PRODUCTS_UNDO - 1)), snapshot]);
    setAddProductsRedoStack([]);
  }, [buildAddProductsSnapshot]);

  const applyAddProductsSnapshot = useCallback((snapshot, productsList) => {
    const newQtyValues = {};
    (productsList || []).forEach((p, i) => {
      if (p && p.id && snapshot.quantitiesByProductId[p.id] !== undefined) {
        newQtyValues[i] = snapshot.quantitiesByProductId[p.id];
      }
    });
    setQtyValues(newQtyValues);
    setAddedRows(new Set(snapshot.addedIds || []));
  }, []);

  const handleAddProductsUndo = useCallback(() => {
    if (addProductsUndoStack.length === 0) return;
    const snapshot = addProductsUndoStack[addProductsUndoStack.length - 1];
    const currentSnapshot = buildAddProductsSnapshot(
      addProductsQtyValuesRef.current,
      addProductsAddedRowsRef.current,
      addProductsFilteredProductsRef.current
    );
    setAddProductsRedoStack((prev) => [...prev, currentSnapshot]);
    setAddProductsUndoStack((prev) => prev.slice(0, -1));
    applyAddProductsSnapshot(snapshot, addProductsFilteredProductsRef.current);
  }, [addProductsUndoStack, buildAddProductsSnapshot, applyAddProductsSnapshot]);

  const handleAddProductsRedo = useCallback(() => {
    if (addProductsRedoStack.length === 0) return;
    const snapshot = addProductsRedoStack[addProductsRedoStack.length - 1];
    const currentSnapshot = buildAddProductsSnapshot(
      addProductsQtyValuesRef.current,
      addProductsAddedRowsRef.current,
      addProductsFilteredProductsRef.current
    );
    setAddProductsUndoStack((prev) => [...prev.slice(-(MAX_ADD_PRODUCTS_UNDO - 1)), currentSnapshot]);
    setAddProductsRedoStack((prev) => prev.slice(0, -1));
    applyAddProductsSnapshot(snapshot, addProductsFilteredProductsRef.current);
  }, [addProductsRedoStack, buildAddProductsSnapshot, applyAddProductsSnapshot]);
  
  // Re-filter products when account or shipment type changes (but NOT on initial load)
  useEffect(() => {
    // Skip if no products loaded yet or if this is initial load (lastAccount not set)
    if (allProducts.length === 0 || lastAccount === null) {
      return;
    }
    
    // Only re-filter if account or shipment type actually changed
    if (lastAccount !== shipmentData.account) {
      const allowedBrands = getAllowedBrandsForAccount(shipmentData.account);
      let filteredProducts = allowedBrands.length > 0 
        ? allProducts.filter(p => allowedBrands.includes(p.brand))
        : allProducts;
      
      // Apply shipment type filters
      const shipmentType = shipmentData.shipmentType || shipmentData.shipment_type || '';
      
      if (shipmentType === 'Hazmat') {
        // For Hazmat: only show products where Hazmat = "Yes"
        filteredProducts = filteredProducts.filter(p => {
          const productName = (p.product || p.product_name || '').toLowerCase().trim();
          const hazmatStatus = hazmatMap[productName] || 'No';
          return hazmatStatus === 'Yes';
        });
        console.log(`✅ Filtered to ${filteredProducts.length} hazmat products for Hazmat shipment`);
      } else if (shipmentType === 'FBA' || shipmentType === 'AWD') {
        // For FBA/AWD: only show products where Hazmat = "No"
        filteredProducts = filteredProducts.filter(p => {
          const productName = (p.product || p.product_name || '').toLowerCase().trim();
          const hazmatStatus = hazmatMap[productName] || 'No';
          return hazmatStatus === 'No';
        });
        console.log(`✅ Filtered to ${filteredProducts.length} non-hazmat products for ${shipmentType} shipment`);
      }
      
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
  }, [shipmentData.account, shipmentData.shipmentType, shipmentData.shipment_type, allProducts, lastAccount, hazmatMap]);

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
          // Product is in the shipment - use saved quantity
          newQtyValues[index] = shipmentQtyMap[matchKey];
        } else {
          // Product is NOT in the shipment - initialize with suggestedQty (units_to_make)
          // This ensures "Units to Make" is visible for products not yet added
          if (product.suggestedQty > 0) {
            newQtyValues[index] = product.suggestedQty;
          }
        }
      });
      
      if (Object.keys(newQtyValues).length > 0) {
        setQtyValues(newQtyValues);
        // Also mark these products as added (only those from the shipment)
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

  // When forecastRange changes, trigger a full API reload instead of client-side calculation
  // The Railway API's /recalculate-doi endpoint properly calculates units_to_make using the algorithm
  // Client-side formulas are inaccurate and should not be used
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
    
    console.log(`ForecastRange changed from ${lastForecastRange} to ${forecastRange}. Using API values for Units to Make.`);
    setLastForecastRange(forecastRange);
    
    // DON'T do client-side calculation - use the units_to_make values from the API (stored in products)
    // The API values are calculated using the proper algorithm with seasonality, velocity, etc.
    // Trigger a reload with updated DOI settings to get fresh API values
    // Update doiSettingsValues to match forecastRange and trigger API call
    const newTargetDOI = parseInt(forecastRange) || 130;
    const newAmazonDoiGoal = Math.max(30, newTargetDOI - 30 - 7); // Subtract lead times
    setDoiSettingsValues(prev => ({
      ...prev,
      amazonDoiGoal: newAmazonDoiGoal
    }));
    setDoiSettingsChangeCount(c => c + 1); // This triggers loadProducts() with new DOI
    return; // Don't do client-side recalculation below
    
    // Recalculate suggestedQty based on new forecastRange (DOI)
    // This ensures Units to Make updates when DOI changes
    // Use functional update to access current qtyValues without including it in dependencies
    setQtyValues(prevQtyValues => {
      // Start from existing quantities so we never wipe out
      // non-zero values unless we have a positive recalculation.
      const newQtyValues = { ...(prevQtyValues || {}) };
      const targetDOI = parseInt(forecastRange) || 120;
      
      products.forEach((product, index) => {
        // Keep existing quantity for:
        // 1. Already added products (addedRows) - these are in the shipment
        // 2. Manually edited quantities (manuallyEditedIndicesRef) - user explicitly changed
        const isManuallyEdited = manuallyEditedIndicesRef.current?.has(index);
        const isInAddedRows = addedRows.has(product.id);
        
        // Debug for Moth Repellent or products with value 2163
        const isMothRepellent = product.product && product.product.toLowerCase().includes('moth');
        const hasValue2163 = prevQtyValues[index] === 2163;
        
        if (isMothRepellent || hasValue2163) {
          console.log(`[DOI Recalc] Product at index ${index}:`, {
            productName: product.product,
            productId: product.id,
            childAsin: product.childAsin,
            currentValue: prevQtyValues[index],
            isInAddedRows,
            isManuallyEdited,
            addedRowsIds: Array.from(addedRows),
            manuallyEditedIndices: Array.from(manuallyEditedIndicesRef.current || [])
          });
        }
        
        // IMPORTANT: Only preserve quantities for products that are actually in the shipment
        // Products that just have a suggestedQty value should be recalculated when DOI changes
        if (isInAddedRows || isManuallyEdited) {
          // Preserve the manually set or added quantity exactly as-is
          return;
        } else {
        // Recalculate suggestedQty based on new DOI
        // Always recalculate when DOI changes, using the same logic as the fallback calculation
        const needsSeasonality = product.tpsNeedsSeasonality || product.needsSeasonality || false;
        
        // If product needs seasonality, keep qty at 0
        if (needsSeasonality) {
          newQtyValues[index] = 0;
        } else {
          // Recalculate using the new target DOI
          // Always recalculate from scratch using the same formula as the fallback calculation
          // This ensures Units to Make updates correctly when DOI changes
          const dailySalesRate = (product.sales30Day || 0) / 30;
          const currentDOI = product.doiTotal || product.daysOfInventory || 0;
          let recalculatedQty = 0;
          
          // Use the same calculation logic as in productsWithSuggestedQty fallback
          // Formula: (targetDOI - currentDOI) * dailySalesRate
          if (dailySalesRate > 0 && currentDOI < targetDOI) {
            const daysNeeded = targetDOI - currentDOI;
            const rawUnitsNeeded = daysNeeded * dailySalesRate;
            recalculatedQty = Math.ceil(rawUnitsNeeded);
          }
          
          // Set qty to recalculated value (or 0 when DOI is at goal so it shows 0, not blank)
          newQtyValues[index] = recalculatedQty;
          
          // Debug logging for products that should update
          if (isMothRepellent || hasValue2163) {
            console.log(`[DOI Recalc] RECALCULATING for ${product.product}:`, {
              currentDOI,
              targetDOI,
              dailySalesRate,
              daysNeeded: targetDOI - currentDOI,
              recalculatedQty,
              wasInQtyValues: prevQtyValues[index],
              isManuallyEdited,
              isInAddedRows: addedRows.has(product.id),
              sales30Day: product.sales30Day,
              doiTotal: product.doiTotal,
              daysOfInventory: product.daysOfInventory
            });
          }
        }
      }
      }); // Close forEach loop
      
      return newQtyValues;
    }); // Close setQtyValues arrow function
  }, [forecastRange, products.length, lastForecastRange, addedRows, shipmentId, products]);

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

  // Calculate total products count (unique products added)
  const totalProducts = products.filter((product, index) => {
    return addedRows && addedRows instanceof Set && addedRows.has(product.id) && (qtyValues[index] || 0) > 0;
  }).length;

  // Calculate total formulas count (unique formulas from added products)
  const totalFormulas = new Set(
    products
      .filter((product, index) => {
        return addedRows && addedRows instanceof Set && addedRows.has(product.id) && (qtyValues[index] || 0) > 0;
      })
      .map(product => product.formula_name || product.formulaName)
      .filter(formula => formula && formula.trim() !== '')
  ).size;

  const handleProductClick = (row, shouldOpenDoiSettings = false, shouldOpenForecastSettings = false) => {
    setSelectedRow(row);
    setOpenDoiSettings(shouldOpenDoiSettings);
    setOpenForecastSettings(shouldOpenForecastSettings);
    setIsNgoosOpen(true);
  };

  // Handle product-specific DOI settings changes
  const handleProductDoiSettingsChange = (row, newSettings) => {
    const asin = row?.child_asin || row?.childAsin || row?.asin;
    if (!asin) return;

    // If newSettings is null, remove the custom settings for this product
    if (newSettings === null) {
      setProductDoiSettings(prev => {
        const updated = { ...prev };
        delete updated[asin];
        return updated;
      });
      console.log(`Cleared custom DOI settings for ${asin}`);
      return;
    }

    // Save product-specific DOI settings
    setProductDoiSettings(prev => ({
      ...prev,
      [asin]: newSettings
    }));

    // TODO: When backend is ready, save to database via API
    // await ProductionAPI.saveProductDoiSettings(asin, newSettings);
    
    console.log(`Saved custom DOI settings for ${asin}:`, newSettings);
  };

  // Handle product-specific forecast settings changes
  const handleProductForecastSettingsChange = (row, newSettings) => {
    const asin = row?.child_asin || row?.childAsin || row?.asin;
    if (!asin) return;

    // If newSettings is null, remove the custom settings for this product
    if (newSettings === null) {
      setProductForecastSettings(prev => {
        const updated = { ...prev };
        delete updated[asin];
        return updated;
      });
      console.log(`Cleared custom forecast settings for ${asin}`);
      return;
    }

    // Save product-specific forecast settings
    setProductForecastSettings(prev => ({
      ...prev,
      [asin]: newSettings
    }));

    // TODO: When backend is ready, save to database via API
    // await ProductionAPI.saveProductForecastSettings(asin, newSettings);
    
    console.log(`Saved custom forecast settings for ${asin}:`, newSettings);
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

    // If a comment was added, navigate back to planning table
    if (hasComment) {
      if (!isIncomplete) {
        toast.success('Formula Check completed with comment!');
      } else {
        toast.info('Formula Check comment saved. Returning to shipments table.');
      }
      
      // Navigate back to planning page with shipments tab
      navigate('/dashboard/production/planning', {
        state: {
          activeTab: 'shipments',
          refresh: Date.now(),
          fromFormulaCheckComplete: true,
        }
      });
    } else if (!isIncomplete) {
      // If completed without comment, show completion modal
      if (labelCheckCompleted) {
        // Both are completed, show modal (user will click button to navigate)
        toast.success('Formula Check completed! Moving to Book Shipment');
        setIsFormulaCheckCompleteOpen(true);
      } else {
        // Show the completion modal instead of automatically navigating
        toast.success('Formula Check completed!');
        setIsFormulaCheckCompleteOpen(true);
      }
    } else {
      // If incomplete without comment, navigate back to planning page
      toast.info('Returning to shipments table.');
      
      // Navigate back to planning page with shipments tab
      navigate('/dashboard/production/planning', {
        state: {
          activeTab: 'shipments',
          refresh: Date.now(),
          fromFormulaCheckComplete: true,
        }
      });
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

      // Get selected formula IDs from checkbox selection
      const selectedFormulaIds = Array.from(formulaSelectedRows);
      
      if (selectedFormulaIds.length === 0) {
        toast.info('Please select at least one formula to mark as completed');
        return;
      }

      // Mark only selected formulas as checked
      await updateShipmentFormulaCheck(shipmentId, {
        checked_formula_ids: selectedFormulaIds,
        uncheck_formula_ids: []
      });

      toast.success(`${selectedFormulaIds.length} formula(s) marked as completed`);
      
      // Clear selection after marking as completed
      setFormulaSelectedRows(new Set());
      
      // Trigger a refresh by incrementing the refresh key
      setFormulaCheckRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error marking formulas as completed:', error);
      toast.error('Failed to mark formulas as completed');
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
        const trimmedShipmentName = (shipmentData.shipmentNumber || '').trim();
        const trimmedShipmentType = (shipmentData.shipmentType || '').trim();
        const trimmedAmazonNumber = (shipmentData.amazonShipmentNumber || '').trim();
        const trimmedAmazonRef = (shipmentData.amazonRefId || '').trim();
        const trimmedShipFrom = (shipmentData.shipFrom || '').trim();
        const trimmedShipTo = (shipmentData.shipTo || '').trim();
        const trimmedCarrier = (selectedCarrier || '').trim();

        if (!trimmedShipmentName || !trimmedShipmentType || !trimmedAmazonNumber || !trimmedAmazonRef || !trimmedShipFrom || !trimmedShipTo || !trimmedCarrier) {
          toast.error('Please fill all required fields: Shipment Name, Shipment Type, Amazon IDs, Ship From, Ship To, and Carrier.');
          return;
        }

        // Book Shipment: Complete and show modal
        await updateShipment(shipmentId, {
          shipment_number: trimmedShipmentName,
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

  const floorInventoryOptions = ['Finished Goods', 'Shiners', 'Unused Formulas'];

  // Get unique brands from products - only show allowed brands
  const allowedBrands = ['TPS Nutrients', 'TPS Plant Foods', 'Bloom City'];
  const uniqueBrands = useMemo(() => {
    // Always return only the three allowed brands, sorted
    return [...allowedBrands].sort();
  }, []);

  // Filter products based on search term and brand
  // This is computed directly, not memoized, to ensure immediate updates
  const getFilteredProducts = () => {
    // IMPORTANT: Add _originalIndex to ALL products so qtyValues lookup works after filtering
    let productsWithIndex = products.map((product, index) => {
      const asin = product.child_asin || product.childAsin || product.asin;
      const hasCustomDoiSettings = asin && productDoiSettings[asin] ? true : false;
      const hasCustomForecastSettings = asin && productForecastSettings[asin] ? true : false;
      
      return {
        ...product,
        _originalIndex: index, // Store original position in products array for qtyValues lookup
        hasCustomDoiSettings, // Flag to indicate if product has custom DOI settings
        hasCustomForecastSettings, // Flag to indicate if product has custom forecast settings
      };
    });
    
    // Log all unique brands in the data for debugging
    const allBrandsInData = [...new Set(productsWithIndex.map(p => p.brand).filter(Boolean))];
    console.log('All unique brands in product data:', allBrandsInData);
    if (shipmentData.account === 'Total Pest Supply') {
      const totalPestBrands = allBrandsInData.filter(b => 
        b.toLowerCase().includes('naturestop') ||
        b.toLowerCase().includes("pixie") ||
        b.toLowerCase().includes("burke") ||
        b.toLowerCase().includes("mint")
      );
      console.log('Total Pest Supply related brands found:', totalPestBrands);
    }
    
    // Apply brand filter from products dropdown
    // In non-table mode, skip brand filtering here - let the table component handle it
    // This ensures brands remain visible in the filter dropdown even when unchecked
    // In table mode, apply brand filtering at the parent level
    if (tableMode && selectedBrands && selectedBrands instanceof Set && selectedBrands.size > 0) {
      // Get account-specific brands to check if all are selected
      const ACCOUNT_BRAND_MAPPING = {
        'TPS Nutrients': ['TPS Nutrients', 'Bloom City', 'TPS Plant Foods'],
        'The Plant Shoppe, LLC': ['TPS Nutrients', 'TPS Plant Foods', 'Bloom City'],
        'Total Pest Supply': ['NatureStop', "Ms. Pixie's", "Burke's", 'Mint +'],
      };
      const accountBrands = shipmentData.account && ACCOUNT_BRAND_MAPPING[shipmentData.account] 
        ? ACCOUNT_BRAND_MAPPING[shipmentData.account]
        : ACCOUNT_BRAND_MAPPING['TPS Nutrients'];
      
      // Check if all brands for this account are selected
      const allBrandsSelected = selectedBrands.size === accountBrands.length &&
        accountBrands.every(brand => selectedBrands.has(brand));
      
      console.log('Brand filter applied:', {
        selectedBrands: Array.from(selectedBrands),
        accountBrands,
        allBrandsSelected,
        productsBeforeFilter: productsWithIndex.length,
        account: shipmentData.account
      });
      
      // Only apply filter if not all brands are selected
      if (!allBrandsSelected) {
        const beforeCount = productsWithIndex.length;
        // Get unique brands in the data before filtering
        const brandsInData = [...new Set(productsWithIndex.map(p => p.brand).filter(Boolean))];
        console.log('Brands in data before filter:', brandsInData);
        console.log('Selected brands for filter:', Array.from(selectedBrands));
        
        productsWithIndex = productsWithIndex.filter(product => {
          const brandValue = (product.brand || '').trim();
          // Check if product's brand matches any selected brand
          const matches = Array.from(selectedBrands).some(selectedBrand => {
            const selectedBrandLower = selectedBrand.toLowerCase().trim();
            const brandValueLower = brandValue.toLowerCase();
            
            // Normalize both strings (remove spaces around +, handle variations)
            const normalizeBrand = (str) => str.replace(/\s*\+\s*/g, '+').replace(/\s+/g, ' ').trim();
            const normalizedSelected = normalizeBrand(selectedBrandLower);
            const normalizedValue = normalizeBrand(brandValueLower);
            
            // Exact match or contains match (handles variations like "Mint +" vs "Mint+")
            const isMatch = normalizedValue === normalizedSelected ||
                   normalizedValue.includes(normalizedSelected) ||
                   normalizedSelected.includes(normalizedValue) ||
                   brandValueLower === selectedBrandLower ||
                   brandValueLower.includes(selectedBrandLower) ||
                   selectedBrandLower.includes(brandValueLower);
            if (isMatch) {
              console.log(`Brand match: "${brandValue}" matches "${selectedBrand}"`);
            }
            return isMatch;
          });
          if (!matches && brandValue) {
            console.log(`Brand no match: "${brandValue}" does not match any of:`, Array.from(selectedBrands));
          }
          return matches;
        });
        
        const brandsAfterFilter = [...new Set(productsWithIndex.map(p => p.brand).filter(Boolean))];
        console.log('Brand filter result:', {
          productsAfterFilter: productsWithIndex.length,
          filteredOut: beforeCount - productsWithIndex.length,
          selectedBrands: Array.from(selectedBrands),
          brandsInDataBefore: brandsInData,
          brandsInDataAfter: brandsAfterFilter
        });
      }
    }
    
    // Then apply search term filter
    if (!searchTerm || searchTerm.trim() === '') {
      return productsWithIndex;
    }
    
    const searchLower = searchTerm.toLowerCase().trim();
    
    // If search is empty after trim, return products with index
    if (searchLower === '') {
      return productsWithIndex;
    }
    
    // Split into words for AND logic
    const searchWords = searchLower.split(/\s+/).filter(w => w.length > 0);
    
    // Filter products but preserve _originalIndex
    // Search in product name, ASIN, and size fields
    const filtered = productsWithIndex.filter(product => {
      const productTitle = (product.product || '').toLowerCase();
      const productAsin = (product.childAsin || product.asin || '').toLowerCase();
      const productSize = (product.size || '').toLowerCase();
      // Combine all searchable fields
      const searchableText = `${productTitle} ${productAsin} ${productSize}`;
      // ALL search words must be found in any of the searchable fields
      return searchWords.every(word => searchableText.includes(word));
    });
    
    return filtered;
  };
  
  const filteredProducts = getFilteredProducts();
  if (activeAction === 'add-products') {
    addProductsFilteredProductsRef.current = filteredProducts;
  }

  return (
    <div className={themeClasses.pageBg} style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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

      <div style={{ flex: 1, overflowY: (activeAction === 'sort-products' || activeAction === 'add-products') ? 'hidden' : 'auto', overflowX: 'hidden', paddingBottom: (activeAction === 'add-products' || activeAction === 'formula-check' || activeAction === 'label-check' || activeAction === 'book-shipment' || activeAction === 'sort-products' || activeAction === 'sort-formulas') ? '100px' : '0px' }}>
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
                overflow: 'visible',
              }}
            >
              {/* Left: Product Catalog Label and Navigation Tabs */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 1, minWidth: 0 }}>
                {/* Product Catalog - Static Label */}
                <div
                  style={{
                    color: isDarkMode ? '#FFFFFF' : '#111827',
                    fontSize: '16px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap'
                  }}
                >
                  My Products
                </div>
                
                {/* Navigation Tabs */}
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px',
                    padding: '4px',
                    borderRadius: '8px',
                    border: `1px solid ${isDarkMode ? '#4B5563' : '#D1D5DB'}`,
                    backgroundColor: isDarkMode ? '#0B111E' : '#FFFFFF'
                  }}
                >
                  <div
                    onClick={handleAllProductsClick}
                    style={{
                      padding: '4px 8px',
                      height: '23px',
                      minHeight: '23px',
                      borderRadius: activeView === 'all-products' ? '4px' : '4px 0 0 4px',
                      backgroundColor: activeView === 'all-products' 
                        ? (isDarkMode ? '#2E3541' : '#F1F5F9') 
                        : 'transparent',
                      border: 'none',
                      color: activeView === 'all-products' 
                        ? (isDarkMode ? '#FFFFFF' : '#3B82F6') 
                        : (isDarkMode ? '#9CA3AF' : '#6B7280'),
                      fontSize: '14px',
                      fontWeight: activeView === 'all-products' ? 600 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      whiteSpace: 'nowrap',
                      boxSizing: 'border-box'
                    }}
                  >
                    All ({products.length})
                  </div>
                  <div
                    ref={floorInventoryButtonRef}
                    onClick={() => setIsFloorInventoryOpen(!isFloorInventoryOpen)}
                    style={{
                      padding: '4px 8px',
                      height: '23px',
                      minHeight: '23px',
                      borderRadius: '0 4px 4px 0',
                      backgroundColor: isDarkMode ? '#0B111E' : '#FFFFFF',
                      border: 'none',
                      color: isDarkMode ? '#AEB1B6' : '#6B7280',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      position: 'relative',
                      transition: 'all 0.2s',
                      whiteSpace: 'nowrap',
                      boxSizing: 'border-box'
                    }}
                  >
                    Floor Inventory
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path 
                        d="M3 4.5L6 7.5L9 4.5" 
                        stroke={isDarkMode ? '#AEB1B6' : '#6B7280'} 
                        strokeWidth="1.5" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
              </div>
                
                {isFloorInventoryOpen && createPortal(
                  <div
                    ref={floorInventoryRef}
                    style={{
                      position: 'fixed',
                      top: `${floorInventoryPosition.top}px`,
                      left: `${floorInventoryPosition.left}px`,
                      backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                      border: `1px solid ${isDarkMode ? '#4B5563' : '#E5E7EB'}`,
                      borderRadius: '6px',
                      boxShadow: isDarkMode 
                        ? '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)' 
                        : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
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
                          color: isDarkMode ? '#F9FAFB' : '#111827',
                          fontSize: '14px',
                          backgroundColor: selectedFloorInventory === option 
                            ? (isDarkMode ? '#374151' : '#F3F4F6') 
                            : 'transparent',
                          transition: 'background-color 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          if (selectedFloorInventory !== option) {
                            e.currentTarget.style.backgroundColor = isDarkMode ? '#374151' : '#F9FAFB';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedFloorInventory !== option) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        {option} ({floorInventoryCounts[option] || 0})
                      </div>
                    ))}
                  </div>,
                  document.body
                )}

              {/* Right: DOI Settings, Sort, and Search Input */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
                {/* DOI Settings Popover (blue exclamation badge on button when custom DOI applied) */}
                <DOISettingsPopover
                  isDarkMode={isDarkMode}
                  initialSettings={appliedDoiForShipment ?? doiSettingsValues}
                  onSettingsChange={handleDoiSettingsChange}
                  showCustomDoiBadge={appliedDoiForShipment != null}
                  onRevertDoi={handleRevertDoiToDefault}
                />


                {/* Search Input */}
                <div style={{ position: 'relative', width: '280px', height: '32px', flexShrink: 0 }}>
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
                    zIndex: 1,
                  }}
                >
                  <path
                    d="M7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667Z"
                    stroke={isDarkMode ? '#9CA3AF' : '#9CA3AF'}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M14 14L11.1 11.1"
                    stroke={isDarkMode ? '#9CA3AF' : '#9CA3AF'}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Search by name, ASIN, size..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    height: '32px',
                    padding: '6px 12px 6px 32px',
                    paddingRight: searchTerm ? '32px' : '12px',
                    borderRadius: '6px',
                    border: `1px solid ${isDarkMode ? '#4B5563' : '#D1D5DB'}`,
                    backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                    color: isDarkMode ? '#F9FAFB' : '#111827',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3B82F6';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = isDarkMode ? '#4B5563' : '#D1D5DB';
                  }}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '16px',
                      height: '16px',
                      border: `1px solid ${isDarkMode ? '#4B5563' : '#D1D5DB'}`,
                      borderRadius: '4px',
                      backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                      zIndex: 2,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = isDarkMode ? '#6B7280' : '#9CA3AF';
                      e.currentTarget.style.backgroundColor = isDarkMode ? '#374151' : '#F3F4F6';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = isDarkMode ? '#4B5563' : '#D1D5DB';
                      e.currentTarget.style.backgroundColor = isDarkMode ? '#1F2937' : '#FFFFFF';
                    }}
                  >
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={isDarkMode ? '#9CA3AF' : '#6B7280'}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
                </div>
                {/* Columns Button - only show when tableMode is on */}
                {tableMode && (
                  <button
                    type="button"
                    onClick={() => setIsCustomizeColumnsOpen(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 12px',
                      height: '32px',
                      borderRadius: '6px',
                      border: `1px solid ${isDarkMode ? '#475569' : '#D1D5DB'}`,
                      backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                      color: isDarkMode ? '#F9FAFB' : '#111827',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'background-color 0.2s, border-color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = isDarkMode ? '#334155' : '#F3F4F6';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = isDarkMode ? '#1F2937' : '#FFFFFF';
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2 2H6V6H2V2ZM10 2H14V6H10V2ZM2 10H6V14H2V10ZM10 10H14V14H10V10Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Columns
                  </button>
                )}
              </div>
            </div>

            {activeView === 'all-products' && (
              <>
                {loadingProducts && <div style={{ textAlign: 'center', padding: '2rem' }}>Loading products...</div>}
                {!loadingProducts && (
                  <NewShipmentTable
                    rows={filteredProducts}
                    tableMode={tableMode}
                    hideFooter={isNgoosOpen}
                    onProductClick={handleProductClick}
                    qtyValues={qtyValues}
                    onQtyChange={(updater) => {
                      addProductsLastPushRef.current = { source: 'qty', time: Date.now() };
                      pushAddProductsUndo(addProductsQtyValuesRef.current, addProductsAddedRowsRef.current, addProductsFilteredProductsRef.current);
                      setAddProductsRedoStack([]);
                      setQtyValues(updater);
                    }}
                    addedRows={addedRows}
                    onAddedRowsChange={(next) => {
                      const last = addProductsLastPushRef.current;
                      if (last.source === 'qty' && Date.now() - last.time < 200) {
                        setAddProductsUndoStack((prev) => prev.slice(0, -1));
                      }
                      addProductsLastPushRef.current = { source: 'added', time: Date.now() };
                      pushAddProductsUndo(addProductsQtyValuesRef.current, addProductsAddedRowsRef.current, addProductsFilteredProductsRef.current);
                      setAddProductsRedoStack([]);
                      setAddedRows(next);
                    }}
                    labelsAvailabilityMap={labelsAvailabilityMap}
                    forecastRange={parseInt(forecastRange) || 120}
                    manuallyEditedIndicesRef={manuallyEditedIndicesRef}
                    onBrandFilterChange={setSelectedBrands}
                    account={shipmentData.account}
                    doiSettingsChangeCount={doiSettingsChangeCount}
                    totalPalettes={totalPalettes}
                    totalProducts={totalProducts}
                    totalBoxes={totalBoxes}
                    totalUnits={totalUnits}
                    totalTimeHours={totalTimeHours}
                    totalWeightLbs={totalWeightLbs}
                    totalFormulas={totalFormulas.size}
                    onClear={() => {
                      setAddedRows(new Set());
                      setQtyValues({});
                    }}
                    onExport={handleExport}
                    addProductsUndoStackLength={addProductsUndoStack.length}
                    addProductsRedoStackLength={addProductsRedoStack.length}
                    onAddProductsUndo={handleAddProductsUndo}
                    onAddProductsRedo={handleAddProductsRedo}
                    isCustomizeColumnsOpen={isCustomizeColumnsOpen}
                    onCustomizeColumnsOpenChange={setIsCustomizeColumnsOpen}
                  />
                )}
              </>
            )}
          </>
        )}

        {/* Separate container for Sellables View */}
        {activeAction === 'add-products' && activeView === 'floor-inventory' && selectedFloorInventory === 'Finished Goods' && (
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
              onCompleteClick={handleCompleteClick}
              tableMode={tableMode}
            />
          </div>
        )}

        {activeAction === 'sort-formulas' && (
          <div style={{ marginTop: '1.5rem' }}>
            <SortFormulasTable 
              shipmentProducts={productsForSortTabs}
              shipmentId={shipmentId}
              onCompleteClick={handleCompleteClick}
              totalTimeHours={totalTimeHours}
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
              onCompleteClick={handleCompleteClick}
              onMarkAllAsCompleted={handleMarkAllAsCompleted}
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
              onSelectedRowsChange={setLabelCheckSelectedRowsCount}
              refreshKey={labelCheckRefreshKey}
              checkAllIncompleteTrigger={checkAllIncompleteTrigger}
              isAdmin={false} // TODO: Connect to actual user role check (e.g., user?.role === 'admin')
              onCompleteClick={handleCompleteClick}
              onMarkAllLabelChecksAsDone={handleMarkAllLabelChecksAsDone}
            />
          </div>
        )}

        {activeAction === 'book-shipment' && (
          <div style={{ marginTop: '1.5rem', padding: '0' }}>
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
                    Shipment Name<span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={shipmentData.shipmentNumber}
                    onChange={(e) => setShipmentData({ ...shipmentData, shipmentNumber: e.target.value })}
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
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3B82F6';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = isDarkMode ? '#374151' : '#E5E7EB';
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
                      paddingRight: '36px',
                      borderRadius: '6px',
                      border: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
                      backgroundColor: isDarkMode ? '#374151' : '#FFFFFF',
                      color: shipmentData.shipmentType ? (isDarkMode ? '#FFFFFF' : '#111827') : (isDarkMode ? '#9CA3AF' : '#9CA3AF'),
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      cursor: 'pointer',
                      appearance: 'none',
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M3 4.5L6 7.5L9 4.5' stroke='${isDarkMode ? '%23FFFFFF' : '%239CA3AF'}' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 12px center',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3B82F6';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = isDarkMode ? '#374151' : '#E5E7EB';
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
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3B82F6';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = isDarkMode ? '#374151' : '#E5E7EB';
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
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3B82F6';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = isDarkMode ? '#374151' : '#E5E7EB';
                    }}
                  />
                </div>
              </div>

              {/* Ship From & Ship To side by side */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ fontSize: '12px', color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>
                      Ship From<span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setAddLocationForField('shipFrom')}
                      style={{
                        border: 'none',
                        background: 'none',
                        color: '#3B82F6',
                        fontSize: '12px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      + Add New Location
                    </button>
                  </div>
                  <LocationSelect
                    value={shipmentData.shipFrom}
                    onChange={(v) => setShipmentData((prev) => ({ ...prev, shipFrom: v }))}
                    placeholder="Enter or select location..."
                    onAddNewLocation={() => setAddLocationForField('shipFrom')}
                  />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ fontSize: '12px', color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>
                      Ship To<span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setAddLocationForField('shipTo')}
                      style={{
                        border: 'none',
                        background: 'none',
                        color: '#3B82F6',
                        fontSize: '12px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      + Add New Location
                    </button>
                  </div>
                  <LocationSelect
                    value={shipmentData.shipTo}
                    onChange={(v) => setShipmentData((prev) => ({ ...prev, shipTo: v }))}
                    placeholder="Enter Shipment Destination..."
                    onAddNewLocation={() => setAddLocationForField('shipTo')}
                  />
                </div>
              </div>

              {/* Carrier - same width as left column (aligned with Ship From) */}
              <div style={{ marginBottom: '16px', maxWidth: 'calc(50% - 8px)' }}>
                <label style={{ display: 'block', fontSize: '12px', color: isDarkMode ? '#9CA3AF' : '#6B7280', marginBottom: '6px' }}>
                  Carrier<span style={{ color: '#EF4444' }}>*</span>
                </label>
                <CarrierSelect
                  value={selectedCarrier}
                  onChange={setSelectedCarrier}
                  placeholder="Select Carrier Name..."
                  onAddNewCarrier={() => setIsAddCarrierOpen(true)}
                />
              </div>

              {/* Book Shipment Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={handleCompleteClick}
                  style={{
                    width: '120px',
                    height: '31px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#007AFF',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                    boxSizing: 'border-box',
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
          </div>
        )}
      </div>
      </div>

      {/* Shared footer is now handled by individual table components */}

      <NgoosModal
        isOpen={isNgoosOpen}
        onClose={() => {
          setIsNgoosOpen(false);
          setSelectedRow(null);
          setOpenDoiSettings(false);
          setOpenForecastSettings(false);
        }}
        selectedRow={selectedRow}
        isAlreadyAdded={useMemo(() => {
          if (!selectedRow || !addedRows || !(addedRows instanceof Set)) return false;
          return addedRows.has(selectedRow.id);
        }, [selectedRow, addedRows])}
        forecastRange={parseInt(forecastRange) || 150}
        doiSettings={useMemo(() => {
          // Use product-specific DOI settings if available, otherwise use general settings
          const asin = selectedRow?.child_asin || selectedRow?.childAsin || selectedRow?.asin;
          return asin && productDoiSettings[asin] ? productDoiSettings[asin] : doiSettingsValues;
        }, [selectedRow?.child_asin, selectedRow?.childAsin, selectedRow?.asin, productDoiSettings, doiSettingsValues])}
        openDoiSettings={openDoiSettings}
        openForecastSettings={openForecastSettings}
        onDoiSettingsChange={(newSettings) => handleProductDoiSettingsChange(selectedRow, newSettings)}
        onForecastSettingsChange={(newSettings) => handleProductForecastSettingsChange(selectedRow, newSettings)}
        allProducts={filteredProducts}
        onNavigate={(direction) => {
          if (!selectedRow || !filteredProducts || filteredProducts.length === 0) return;
          
          const currentIndex = filteredProducts.findIndex(p => p.id === selectedRow.id);
          if (currentIndex === -1) return;
          
          let newIndex;
          if (direction === 'prev') {
            // Go to previous, wrap to end if at beginning
            newIndex = currentIndex === 0 ? filteredProducts.length - 1 : currentIndex - 1;
          } else {
            // Go to next, wrap to beginning if at end
            newIndex = currentIndex === filteredProducts.length - 1 ? 0 : currentIndex + 1;
          }
          
          setSelectedRow(filteredProducts[newIndex]);
        }}
        labelsAvailable={useMemo(() => {
          if (!selectedRow?.label_location) return null;
          const labelLoc = selectedRow.label_location;
          // PRIORITY: Use Railway API label_inventory first, fall back to AWS Lambda
          const baseAvailable = selectedRow?.label_inventory || selectedRow?.labelsAvailable || labelsAvailabilityMap[labelLoc]?.labels_available || 0;
          
          // Subtract labels already committed in current shipment for products with same label_location
          const usedInCurrentShipment = products.reduce((sum, product, index) => {
            if (product.label_location === labelLoc && product.id !== selectedRow.id) {
              return sum + (qtyValues[index] || 0);
            }
            return sum;
          }, 0);
          
          return Math.max(0, baseAvailable - usedInCurrentShipment);
        }, [selectedRow, products, qtyValues, labelsAvailabilityMap])}
        currentQty={useMemo(() => {
          const productIndex = products.findIndex(p => p.id === selectedRow?.id);
          return productIndex >= 0 ? (qtyValues[productIndex] || 0) : 0;
        }, [selectedRow, products, qtyValues])}
        onAddUnits={(row, unitsToAdd) => {
          const productIndex = products.findIndex(p => p.id === row.id);
          if (productIndex >= 0) {
            const labelLoc = row.label_location;
            // PRIORITY: Use Railway API label_inventory first, fall back to AWS Lambda
            const baseAvailable = row?.label_inventory || row?.labelsAvailable || labelsAvailabilityMap[labelLoc]?.labels_available || 0;
            
            // Calculate labels already used in current shipment for same label_location
            const usedInCurrentShipment = products.reduce((sum, product, idx) => {
              if (product.label_location === labelLoc && idx !== productIndex) {
                return sum + (qtyValues[idx] || 0);
              }
              return sum;
            }, 0);

            const maxAvailable = Math.max(0, baseAvailable - usedInCurrentShipment);

            // Round units to nearest case increment, mirroring non-table mode behavior
            const sizeForIncrement = row?.size || extractSizeFromProductName(row?.product);
            const increment = getQtyIncrementForSize(sizeForIncrement);
            const rawNum = typeof unitsToAdd === 'number' ? unitsToAdd : parseInt(unitsToAdd, 10);
            const roundedUnitsToAdd =
              rawNum && !Number.isNaN(rawNum) && increment && increment > 1
                ? Math.ceil(rawNum / increment) * increment
                : rawNum || 0;

            // Add the forecast units WITHOUT capping - let user see and adjust
            // Just show a warning if it exceeds available labels
            if (roundedUnitsToAdd > maxAvailable) {
              toast.warning(`⚠️ Adding ${roundedUnitsToAdd.toLocaleString()} units but only ${maxAvailable.toLocaleString()} labels available!`, {
                duration: 5000
              });
            }
            
            setQtyValues(prev => ({
              ...prev,
              [productIndex]: roundedUnitsToAdd
            }));
            
            // Also add the row to addedRows so button shows "Added"
            setAddedRows(prev => new Set([...prev, row.id]));
            
            toast.success(`Added ${roundedUnitsToAdd.toLocaleString()} units of ${row.product}`);
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

      <AddLocationModal
        isOpen={addLocationForField !== null}
        onClose={() => setAddLocationForField(null)}
        onSave={(displayValue) => {
          if (addLocationForField === 'shipFrom') {
            setShipmentData((prev) => ({ ...prev, shipFrom: displayValue }));
          } else if (addLocationForField === 'shipTo') {
            setShipmentData((prev) => ({ ...prev, shipTo: displayValue }));
          }
          setAddLocationForField(null);
        }}
      />

      <AddCarrierModal
        isOpen={isAddCarrierOpen}
        onClose={() => setIsAddCarrierOpen(false)}
        onSave={(carrierName) => {
          setSelectedCarrier(carrierName);
          setIsAddCarrierOpen(false);
        }}
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
          console.log('🎯 Begin Label Check clicked, current shipmentId:', shipmentId);
          if (!shipmentId) {
            console.log('📌 No shipmentId exists, creating new shipment...');
            try {
              setLoading(true);
              
              // Validate: Must have products selected
              // Build productsToAdd by iterating through allProducts to catch products even if filtered out
              // Then match to current products array to get the correct index for qty lookup
              const productsToAdd = [];
              
              // First, try to get products from the current filtered products array
              products.forEach((product, index) => {
                if (addedRows.has(product.id)) {
                  const qty = qtyValues[index] || 0;
                  if (qty > 0) {
                    productsToAdd.push({
                      catalog_id: product.catalogId || product.id,
                      quantity: qty,
                    });
                  }
                }
              });
              
              // Also check allProducts for any products in addedRows that might have been filtered out
              // This handles the case where a product was added, then filtered out, but should still be included
              allProducts.forEach((product, allIndex) => {
                // Skip if we already added this product
                if (productsToAdd.some(p => (p.catalog_id === (product.catalogId || product.id)))) {
                  return;
                }
                
                // If product is in addedRows, try to find it in current products array
                if (addedRows.has(product.id)) {
                  const currentIndex = products.findIndex(p => p.id === product.id);
                  if (currentIndex >= 0) {
                    // Found in current products, use that index for qty lookup
                    const qty = qtyValues[currentIndex] || 0;
                    if (qty > 0) {
                      productsToAdd.push({
                        catalog_id: product.catalogId || product.id,
                        quantity: qty,
                      });
                    }
                  } else {
                    // Not in current products (filtered out), but was added - check if we have a qty
                    // Try to find qty by matching product ID across all indices
                    let foundQty = 0;
                    for (let idx = 0; idx < products.length; idx++) {
                      if (products[idx]?.id === product.id) {
                        foundQty = qtyValues[idx] || 0;
                        break;
                      }
                    }
                    // If still no qty found, check if there's a qty at the original allProducts index
                    // (This handles edge cases where qty was set before filtering)
                    if (foundQty === 0 && qtyValues[allIndex]) {
                      foundQty = qtyValues[allIndex];
                    }
                    if (foundQty > 0) {
                      productsToAdd.push({
                        catalog_id: product.catalogId || product.id,
                        quantity: foundQty,
                      });
                    }
                  }
                }
              });
              
              console.log('📦 Products to add to shipment:', {
                totalProducts: products.length,
                allProductsCount: allProducts.length,
                addedRowsCount: addedRows.size,
                productsToAddCount: productsToAdd.length,
                productsToAdd,
                addedRows: Array.from(addedRows),
                qtyValuesKeys: Object.keys(qtyValues),
              });
              
              if (productsToAdd.length === 0) {
                console.error('❌ No products to add - validation failed');
                toast.error('Please add at least one product before exporting');
                setLoading(false);
                return;
              }
              
              // Create shipment - ensure shipment number and date are always set
              // Require shipment type to be selected before creating shipment
              if (!shipmentData.shipmentType) {
                console.error('❌ No shipment type selected');
                toast.error('Please select a shipment type (FBA or AWD) in the export template before proceeding.');
                setLoading(false);
                return;
              }
              
              const shipmentNumber = shipmentData.shipmentNumber || generateShipmentNumber();
              const shipmentDate = shipmentData.shipmentDate || new Date().toISOString().split('T')[0];
              
              console.log('🚀 Creating shipment with data:', {
                shipment_number: shipmentNumber,
                shipment_date: shipmentDate,
                shipment_type: shipmentData.shipmentType,
                account: shipmentData.account,
              });
              
              const newShipment = await createShipment({
                shipment_number: shipmentNumber,
                shipment_date: shipmentDate,
                shipment_type: shipmentData.shipmentType,
                marketplace: 'Amazon',
                account: shipmentData.account || 'TPS Nutrients',
                location: shipmentData.location || '',
                created_by: 'current_user',
              });
              
              console.log('✅ Shipment created:', newShipment);
              
              // Handle different response formats (id, shipment_id, or nested data)
              const newShipmentId = newShipment?.id || newShipment?.shipment_id || newShipment?.data?.id;
              if (!newShipmentId) {
                console.error('❌ No shipment ID in response:', newShipment);
                throw new Error('Invalid response from createShipment API - missing shipment ID');
              }
              
              console.log('🆔 Shipment ID:', newShipmentId);
              setShipmentId(newShipmentId);
              
              // Add products to shipment
              console.log('📝 Adding products to shipment:', productsToAdd);
              const addProductsResult = await addShipmentProducts(newShipmentId, productsToAdd);
              console.log('✅ Products added to shipment:', addProductsResult);
              
              // Update shipment to mark add_products as completed
              console.log('🔄 Updating shipment status to label_check');
              await updateShipment(newShipmentId, {
                add_products_completed: true,
                status: 'label_check',
              });
              console.log('✅ Shipment status updated');
              
              // Mark 'add-products' and 'export' as completed
              setCompletedTabs(prev => {
                const newSet = new Set(prev);
                newSet.add('add-products');
                newSet.add('export');
                return newSet;
              });
              setExportCompleted(true);
              console.log('✅ All steps completed successfully');
              toast.success('Shipment booked and exported!');
            } catch (error) {
              console.error('❌ Error booking shipment for export:', error);
              console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                error: error,
              });
              toast.error('Failed to book shipment: ' + error.message);
              setLoading(false);
              return;
            } finally {
              setLoading(false);
            }
          } else {
            // Shipment already exists - we need to add products to it
            console.log('⚠️ Shipment already exists:', shipmentId, '- adding products to existing shipment');
            
            try {
              setLoading(true);
              
              // Build products list the same way
              const productsToAdd = [];
              
              products.forEach((product, index) => {
                if (addedRows.has(product.id)) {
                  const qty = qtyValues[index] || 0;
                  if (qty > 0) {
                    productsToAdd.push({
                      catalog_id: product.catalogId || product.id,
                      quantity: qty,
                    });
                  }
                }
              });
              
              allProducts.forEach((product, allIndex) => {
                if (productsToAdd.some(p => (p.catalog_id === (product.catalogId || product.id)))) {
                  return;
                }
                
                if (addedRows.has(product.id)) {
                  const currentIndex = products.findIndex(p => p.id === product.id);
                  if (currentIndex >= 0) {
                    const qty = qtyValues[currentIndex] || 0;
                    if (qty > 0) {
                      productsToAdd.push({
                        catalog_id: product.catalogId || product.id,
                        quantity: qty,
                      });
                    }
                  } else {
                    let foundQty = 0;
                    for (let idx = 0; idx < products.length; idx++) {
                      if (products[idx]?.id === product.id) {
                        foundQty = qtyValues[idx] || 0;
                        break;
                      }
                    }
                    if (foundQty === 0 && qtyValues[allIndex]) {
                      foundQty = qtyValues[allIndex];
                    }
                    if (foundQty > 0) {
                      productsToAdd.push({
                        catalog_id: product.catalogId || product.id,
                        quantity: foundQty,
                      });
                    }
                  }
                }
              });
              
              console.log('📦 Products to add to existing shipment:', {
                shipmentId,
                productsToAddCount: productsToAdd.length,
                productsToAdd,
              });
              
              if (productsToAdd.length > 0) {
                console.log('📝 Adding products to existing shipment:', productsToAdd);
                const addResult = await addShipmentProducts(shipmentId, productsToAdd);
                console.log('✅ Products added to existing shipment:', addResult);
                
                // Update shipment to mark add_products_completed as true and set status to label_check
                console.log('🔄 Updating shipment to mark add_products_completed: true and status: label_check');
                await updateShipment(shipmentId, {
                  add_products_completed: true,
                  status: 'label_check',
                });
                console.log('✅ Shipment updated - add_products_completed set to true, status set to label_check');
              } else {
                console.log('⚠️ No products to add - addedRows or qtyValues empty');
              }
              
              // Mark tabs as completed
              setCompletedTabs(prev => {
                const newSet = new Set(prev);
                newSet.add('add-products');
                newSet.add('export');
                return newSet;
              });
              setExportCompleted(true);
              
            } catch (error) {
              console.error('❌ Error adding products to existing shipment:', error);
              toast.error('Failed to add products: ' + error.message);
            } finally {
              setLoading(false);
            }
          }
          
          // After exporting, move to Label Check and keep footer visible
          console.log('🔄 Navigating to label-check with shipmentId:', shipmentId);
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
        onBeginBookShipment={() => {
          setIsFormulaCheckCompleteOpen(false);
          // Navigate to book-shipment section
          handleActionChange('book-shipment');
        }}
        isLabelCheckCompleted={completedTabs.has('label-check')}
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
              backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.35)',
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
                backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                borderRadius: '14px',
                width: '278px',
                border: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
                boxShadow: isDarkMode 
                  ? '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.2)'
                  : '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
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
                  color: isDarkMode ? '#9CA3AF' : '#9CA3AF',
                  width: '24px',
                  height: '24px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = isDarkMode ? '#D1D5DB' : '#6B7280';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#9CA3AF';
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
                gap: '16px',
              }}>
                {/* Green checkmark icon */}
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#10B981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 12L10 17L19 8" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>

                {/* Title */}
                <h2 style={{
                  fontSize: '20px',
                  fontWeight: 600,
                  color: isDarkMode ? '#F9FAFB' : '#111827',
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
                {/* Close button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsBookShipmentCompleteOpen(false);
                    navigate('/dashboard/production/planning', { 
                      state: { refresh: true } 
                    });
                  }}
                  style={{
                    width: '65px',
                    height: '31px',
                    padding: 0,
                    borderRadius: '4px',
                    border: isDarkMode ? '1px solid #4B5563' : '1px solid #D1D5DB',
                    backgroundColor: isDarkMode ? '#374151' : '#FFFFFF',
                    color: isDarkMode ? '#E5E7EB' : '#374151',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxSizing: 'border-box',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = isDarkMode ? '#4B5563' : '#F3F4F6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = isDarkMode ? '#374151' : '#FFFFFF';
                  }}
                >
                  Close
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
                    boxShadow: isDarkMode 
                      ? '0 1px 2px rgba(0,0,0,0.3)'
                      : '0 1px 2px rgba(0,0,0,0.04)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#0056CC';
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


