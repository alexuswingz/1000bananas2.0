import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { useTheme } from '../../../../context/ThemeContext';
import { useSidebar } from '../../../../context/SidebarContext';
import { toast } from 'sonner';
import SortFormulasFilterDropdown from './SortFormulasFilterDropdown';
import ProductsFilterDropdown from './ProductsFilterDropdown';

const parseSuggestedQtyValue = (value) => {
  if (value === undefined || value === null) return undefined;
  const cleaned = typeof value === 'number'
    ? String(value)
    : String(value).trim();
  if (cleaned === '') return undefined;
  const numeric = Number(cleaned.replace(/,/g, ''));
  return Number.isNaN(numeric) ? undefined : numeric;
};

const getSuggestedQtyFromRow = (row) => {
  const candidates = [row.suggestedQty, row.units_to_make, row.unitsToMake];
  for (const candidate of candidates) {
    const parsed = parseSuggestedQtyValue(candidate);
    if (parsed !== undefined) {
      return parsed;
    }
  }
  return undefined;
};

// Memoized bar fill so adding/updating other rows doesn't re-render this bar and interrupt its transition
const BarFill = React.memo(function BarFill({ widthPct, backgroundColor, durationSec = 1.2 }) {
  return (
    <div
      style={{
        width: `${widthPct}%`,
        height: '100%',
        backgroundColor,
        transition: `width ${durationSec}s ease-in-out`,
      }}
    />
  );
});

const NewShipmentTable = ({
  rows,
  tableMode,
  hideFooter = false, // Hide footer when e.g. N-GOOS modal is open
  onProductClick,
  qtyValues,
  onQtyChange,
  onAddedRowsChange,
  addedRows: externalAddedRows = null,
  labelsAvailabilityMap = {},
  forecastRange = 120,
  manuallyEditedIndicesRef = null, // Ref to expose manually edited indices to parent
  onBrandFilterChange = null, // Callback to pass brand filter to parent
  account = null, // Account name to determine which brands to show
  doiSettingsChangeCount = 0, // Track when DOI settings have changed
  totalPalettes = 0,
  totalProducts = 0,
  totalBoxes = 0,
  totalUnits = 0,
  totalTimeHours = 0,
  onClear = null, // Callback for Clear button
  onExport = null, // Callback for Export button
  totalWeightLbs = 0,
  totalFormulas = 0,
  addProductsUndoStackLength = 0,
  addProductsRedoStackLength = 0,
  onAddProductsUndo = null,
  onAddProductsRedo = null,
}) => {
  // Account to Brand mapping (for checking if all brands are selected)
  const ACCOUNT_BRAND_MAPPING = {
    'TPS Nutrients': ['TPS Nutrients', 'Bloom City', 'TPS Plant Foods'],
    'The Plant Shoppe, LLC': ['TPS Nutrients', 'TPS Plant Foods', 'Bloom City'],
    'Total Pest Supply': ['NatureStop', "Ms. Pixie's", "Burke's", 'Mint +'],
  };
  const { isDarkMode } = useTheme();
  const { sidebarWidth } = useSidebar();
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [addedRows, setAddedRows] = useState(new Set());
  const [selectionFilter, setSelectionFilter] = useState('all'); // all | checked | unchecked
  const selectAllCheckboxRef = useRef(null);
  const [clickedQtyIndex, setClickedQtyIndex] = useState(null);
  const [hoveredQtyIndex, setHoveredQtyIndex] = useState(null);
  const [hoveredAddIndex, setHoveredAddIndex] = useState(null);
  const [hoveredWarningIndex, setHoveredWarningIndex] = useState(null);
  const qtyContainerRefs = useRef({});
  const popupRefs = useRef({});
  const qtyInputRefs = useRef({});
  const addButtonRefs = useRef({});
  const addPopupRefs = useRef({});
  const warningIconRefs = useRef({});
  // Track when the "Use Available" label-inventory suggestion has been applied per product
  // so we can show a permanent reset icon in those cases
  const [labelSuggestionUsage, setLabelSuggestionUsage] = useState({});
  // Toggle to show FBA Available bar (how much you need to get to 30-day DOI goal) per product
  const [showFbaBar, setShowFbaBar] = useState(false);
  const [showDoiBar, setShowDoiBar] = useState(true);
  // Initialize local ref once
  const localManuallyEditedIndicesRef = useRef(new Set());
  
  // On mount, if parent provided a ref, copy any existing values and use parent's Set
  useEffect(() => {
    if (manuallyEditedIndicesRef) {
      // If parent has no Set yet, create one
      if (!manuallyEditedIndicesRef.current) {
        manuallyEditedIndicesRef.current = new Set();
      }
    }
  }, []); // Only on mount
  
  // Always use parent's Set if provided, otherwise use local Set
  // This creates a getter that always returns the current Set
  const getManuallyEditedSet = () => {
    return manuallyEditedIndicesRef?.current || localManuallyEditedIndicesRef.current;
  };
  
  // Create a ref-like object that always points to the correct Set
  const manuallyEditedIndices = {
    get current() {
      return getManuallyEditedSet();
    }
  };
  const rawQtyInputValues = useRef({}); // Store raw input values while typing (before rounding)
  const originalSuggestedQtyValues = useRef({}); // Store original suggested quantities for reset functionality (keyed by product ID)
  const originalSuggestedQtyValuesByIndex = useRef({}); // Also store by index for quick lookup
  const originalDoiValues = useRef({}); // Store original DOI values to detect changes (keyed by product ID)
  const getStoredOriginalQtyValue = (productId, idx) => {
    if (productId && Object.prototype.hasOwnProperty.call(originalSuggestedQtyValues.current, productId)) {
      return originalSuggestedQtyValues.current[productId];
    }
    if (idx !== undefined && Object.prototype.hasOwnProperty.call(originalSuggestedQtyValuesByIndex.current, idx)) {
      return originalSuggestedQtyValuesByIndex.current[idx];
    }
    return '';
  };
  const storeOriginalQtyValue = (row, storageIndex, value) => {
    const normalizedValue = value !== undefined && value !== null ? value : '';
    const productId = row.id || row.asin || row.child_asin || row.childAsin;
    if (productId && originalSuggestedQtyValues.current[productId] === undefined) {
      originalSuggestedQtyValues.current[productId] = normalizedValue;
    }
    originalSuggestedQtyValuesByIndex.current[storageIndex] = normalizedValue;
  };
  const [qtyInputUpdateTrigger, setQtyInputUpdateTrigger] = useState(0); // Trigger re-renders during typing
  const [openFilterIndex, setOpenFilterIndex] = useState(null);
  const filterRefs = useRef({});
  const filterModalRefs = useRef({});
  
  // Filter dropdown state for bottles, closures, boxes, labels
  const [openFilterColumns, setOpenFilterColumns] = useState(() => new Set());
  const filterIconRefs = useRef({});
  const filterDropdownRefs = useRef({}); // Store refs to dropdown DOM elements
  const [columnFilters, setColumnFilters] = useState({});
  const [columnSortConfig, setColumnSortConfig] = useState([]);
  // Store the sorted order (array of row IDs) to preserve positions after sorting
  const [sortedRowOrder, setSortedRowOrder] = useState(null);
  
  // Store original row order when component first loads (for Reset functionality)
  const originalRowOrder = useRef(null);
  
  // Ref to store current filtered rows (without sorting) for use in sort handler
  const currentFilteredRowsRef = useRef([]);
  
  // Non-table mode filter state
  const [nonTableOpenFilterColumn, setNonTableOpenFilterColumn] = useState(null);
  const nonTableFilterIconRefs = useRef({});
  const nonTableFilterDropdownRef = useRef(null);
  const [nonTableFilters, setNonTableFilters] = useState({});
  const nonTableContainerRef = useRef(null);

  // Shipment Stats popup (three-dots next to Export for Upload)
  const [shipmentStatsMenuOpen, setShipmentStatsMenuOpen] = useState(false);
  const shipmentStatsPopupRef = useRef(null);
  const [footerStatsVisibility, setFooterStatsVisibility] = useState({
    products: true,
    palettes: true,
    boxes: true,
    weightLbs: true,
    units: false,
    formulas: true,
    timeHours: true,
  });

  // Close Shipment Stats popup when clicking outside
  useEffect(() => {
    if (!shipmentStatsMenuOpen) return;
    const handleClick = (e) => {
      const popup = shipmentStatsPopupRef.current;
      const isTrigger = e.target.closest('[data-shipment-stats-trigger]');
      if (popup && !popup.contains(e.target) && !isTrigger) setShipmentStatsMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [shipmentStatsMenuOpen]);
  
  // Clean up any invalid brand filters when account changes or on mount
  // If a brand filter has all brands selected, treat it as no filter
  // Also clear filter if it has fewer brands than expected for the account
  useEffect(() => {
    if (!tableMode && account && nonTableFilters.product && nonTableFilters.product.selectedBrands) {
      const filter = nonTableFilters.product;
      if (filter.selectedBrands instanceof Set && filter.selectedBrands.size > 0) {
        const accountBrands = ACCOUNT_BRAND_MAPPING[account] || ACCOUNT_BRAND_MAPPING['TPS Nutrients'];
        
        // Check if all brands for this account are selected
        const allBrandsSelected = filter.selectedBrands.size === accountBrands.length &&
          accountBrands.every(brand => filter.selectedBrands.has(brand));
        
        // If all brands are selected, clear the brand filter (treat as no filter)
        // Also clear if filter has fewer brands than expected (likely a stale filter)
        if (allBrandsSelected || filter.selectedBrands.size < accountBrands.length) {
          setNonTableFilters(prev => {
            const newFilters = { ...prev };
            if (newFilters.product) {
              newFilters.product = {
                ...newFilters.product,
                selectedBrands: null,
              };
            }
            return newFilters;
          });
          // Clear brand filter in parent
          if (onBrandFilterChange) {
            onBrandFilterChange(null);
          }
        }
      }
    }
  }, [tableMode, account]); // Run when account changes
  const [nonTableSortField, setNonTableSortField] = useState('');
  const [nonTableSortOrder, setNonTableSortOrder] = useState('');
  // Store the sorted order (array of row IDs) to preserve positions after sorting (one-time sort)
  const [nonTableSortedRowOrder, setNonTableSortedRowOrder] = useState(null);
  // Ref to store current filtered rows (without sorting) for use in sort handler
  const currentNonTableFilteredRowsRef = useRef([]);
  
  // Multi-select state for non-table mode bulk operations
  const [nonTableSelectedIndices, setNonTableSelectedIndices] = useState(() => new Set());
  const lastClickTimeRef = useRef({});
  const [nonTableLastSelectedIndex, setNonTableLastSelectedIndex] = useState(null);
  
  // Filter state
  const [activeFilters, setActiveFilters] = useState({
    popularFilter: '',
    sortField: '',
    sortOrder: '',
    filterField: '',
    filterCondition: '',
    filterValue: '',
  });

  // Calculate available labels for a product, accounting for other products with same label_location
  const getAvailableLabelsForRow = (row, rowIndex) => {
    if (!row?.label_location) return row?.label_inventory || row?.labelsAvailable || 0;
    
    const labelLoc = row.label_location;
    // PRIORITY: Use Railway API label_inventory first, fall back to AWS Lambda
    const baseAvailable = row?.label_inventory || row?.labelsAvailable || labelsAvailabilityMap[labelLoc]?.labels_available || 0;
    
    // Subtract labels used by OTHER products with same label_location in current shipment
    const usedByOthers = rows.reduce((sum, otherRow, idx) => {
      if (idx !== rowIndex && otherRow.label_location === labelLoc) {
        const qty = qtyValues?.[idx] || 0;
        return sum + (typeof qty === 'number' ? qty : parseInt(qty, 10) || 0);
      }
      return sum;
    }, 0);
    
    return Math.max(0, baseAvailable - usedByOthers);
  };

  // Check if a row's qty exceeds available labels
  const isQtyExceedingLabels = (row, rowIndex) => {
    const qty = qtyValues?.[rowIndex] || 0;
    const numQty = typeof qty === 'number' ? qty : parseInt(qty, 10) || 0;
    if (numQty === 0) return false;
    
    const available = getAvailableLabelsForRow(row, rowIndex);
    return numQty > available;
  };

  // Use local state if props not provided (for backward compatibility)
  const [internalQtyValues, setInternalQtyValues] = useState(() => {
    if (qtyValues) return null; // Use props if provided
    const initialValues = {};
    rows.forEach((row, index) => {
      initialValues[index] = ''; // Default to empty
    });
    return initialValues;
  });

  const effectiveQtyValues = qtyValues || internalQtyValues || {};
  const effectiveSetQtyValues = onQtyChange || setInternalQtyValues;
  const effectiveSetQtyValuesRef = useRef(effectiveSetQtyValues);
  effectiveSetQtyValuesRef.current = effectiveSetQtyValues;

  // Update qtyValues when rows change (only if using internal state)
  useEffect(() => {
    if (!qtyValues && !onQtyChange && internalQtyValues) {
      const newValues = {};
      rows.forEach((row, index) => {
        newValues[index] = internalQtyValues[index] ?? ''; // Default to empty
      });
      setInternalQtyValues(newValues);
    }
  }, [rows.length]);

  // Create a stable signature for rows to detect actual changes (must be before any useEffect that uses it)
  const previousRowsSignatureRef = useRef('');
  const rowsSignature = useMemo(() => {
    if (!rows || rows.length === 0) return '';
    return rows.map(r => {
      const id = r.id || r.asin || r.child_asin || r.childAsin;
      return id ? String(id) : '';
    }).filter(Boolean).sort().join('|');
  }, [rows]);

  // Capture original row order on first load (for Reset functionality)
  // Use rowsSignature so dependency array size is always 1 (avoids React "dependency array changed size" error).
  useEffect(() => {
    if (rows.length > 0 && !originalRowOrder.current) {
      originalRowOrder.current = rows.map(r => r.id);
      console.log('[Original Row Order] Stored first', originalRowOrder.current.length, 'product IDs');
    }
  }, [rowsSignature]);

  // Store original forecast values when rows change (for reset functionality)
  useEffect(() => {
    // Skip if signature hasn't changed
    if (previousRowsSignatureRef.current === rowsSignature) {
      return;
    }
    
    previousRowsSignatureRef.current = rowsSignature;
    
    console.log('Storing original suggested qtys for', rows.length, 'rows');
    if (rows && rows.length > 0) {
      rows.forEach((row, index) => {
        const suggestedQty = getSuggestedQtyFromRow(row);
        const storageValue = suggestedQty !== undefined ? suggestedQty : '';
        const doiValue = row.doiTotal || row.daysOfInventory || 0;
        const storageIndex = row._originalIndex !== undefined ? row._originalIndex : index;
        
        storeOriginalQtyValue(row, storageIndex, storageValue);
        
        // Store original DOI value (only if not already set to preserve the original)
        const productId = row.id || row.asin || row.child_asin || row.childAsin;
        if (productId && originalDoiValues.current[productId] === undefined) {
          originalDoiValues.current[productId] = doiValue;
        }
      });
    }
    console.log('All original suggested qtys by ID:', originalSuggestedQtyValues.current);
    console.log('All original suggested qtys by index:', originalSuggestedQtyValuesByIndex.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowsSignature]); // Only use stable signature to avoid dependency array size issues

  // Apply filters to rows - preserve original index for qtyValues mapping
  const filteredRows = useMemo(() => {
    // Use existing _originalIndex if already set by parent (from search filter),
    // otherwise use the current index (for backward compatibility)
    let result = rows.map((row, index) => ({ 
      ...row, 
      _originalIndex: row._originalIndex !== undefined ? row._originalIndex : index 
    }));
    
    // Apply popular filter
    if (activeFilters.popularFilter) {
      switch (activeFilters.popularFilter) {
        case 'bestSellers':
          // Top revenue - sort by sales30Day * some average price or just by sales
          result = result.filter(r => (r.sales30Day || 0) > 0);
          result.sort((a, b) => (b.sales30Day || 0) - (a.sales30Day || 0));
          result = result.slice(0, 50); // Top 50
          break;
        case 'fastestMovers':
          // Highest unit velocity - sort by daily sales rate
          result = result.filter(r => (r.sales30Day || 0) > 0);
          result.sort((a, b) => ((b.sales30Day || 0) / 30) - ((a.sales30Day || 0) / 30));
          result = result.slice(0, 50);
          break;
        case 'topProfit':
          // Top profit - sort by margin or profit if available
          result = result.filter(r => (r.profit || r.margin || r.sales30Day || 0) > 0);
          result.sort((a, b) => (b.profit || b.margin || b.sales30Day || 0) - (a.profit || a.margin || a.sales30Day || 0));
          result = result.slice(0, 50);
          break;
        case 'topTraffic':
          // Top traffic - sort by sessions or CTR
          result = result.filter(r => (r.sessions || r.pageViews || 0) > 0);
          result.sort((a, b) => (b.sessions || b.pageViews || 0) - (a.sessions || a.pageViews || 0));
          result = result.slice(0, 50);
          break;
        case 'outOfStock':
          // Out of stock - where FBA available is 0 or very low
          result = result.filter(r => (r.fbaAvailable || 0) === 0 && (r.sales30Day || 0) > 0);
          break;
        case 'overstock':
          // Overstock - where DOI is higher than the forecast range goal
          result = result.filter(r => (r.doiTotal || r.daysOfInventory || 0) > forecastRange);
          break;
        default:
          break;
      }
    }
    
    // Apply custom filter condition
    if (activeFilters.filterField && activeFilters.filterCondition && activeFilters.filterValue) {
      const fieldMap = {
        'brand': 'brand',
        'product': 'product',
        'size': 'size',
        'fbaAvailable': 'fbaAvailable',
        'totalInventory': 'totalInventory',
        'forecast': 'weeklyForecast',
        'qty': 'qty',
      };
      const field = fieldMap[activeFilters.filterField] || activeFilters.filterField;
      const value = activeFilters.filterValue.toLowerCase();
      
      result = result.filter(row => {
        // Special handling for brand filter - search both brand field and product name
        if (activeFilters.filterField === 'brand') {
          const brandValue = row.brand || '';
          const productValue = row.product || '';
          const searchText = (brandValue + ' ' + productValue).toLowerCase();
          const filterValue = activeFilters.filterValue.toLowerCase();
          
          switch (activeFilters.filterCondition) {
            case 'equals':
              return brandValue.toLowerCase() === filterValue;
            case 'contains':
              return searchText.includes(filterValue);
            default:
              return true;
          }
        }
        
        // Standard filtering for other fields
        const rowValue = row[field];
        const strValue = String(rowValue || '').toLowerCase();
        const numValue = parseFloat(rowValue) || 0;
        const filterNum = parseFloat(activeFilters.filterValue) || 0;
        
        switch (activeFilters.filterCondition) {
          case 'equals':
            return strValue === value;
          case 'contains':
            return strValue.includes(value);
          case 'greaterThan':
            return numValue > filterNum;
          case 'lessThan':
            return numValue < filterNum;
          default:
            return true;
        }
      });
    }
    
    // Apply sorting
    if (activeFilters.sortField && activeFilters.sortOrder) {
      const fieldMap = {
        'fbaAvailable': 'fbaAvailable',
        'totalInventory': 'totalInventory',
        'forecast': 'weeklyForecast',
        'sales7': 'sales7Day',
        'sales30': 'sales30Day',
      };
      const field = fieldMap[activeFilters.sortField] || activeFilters.sortField;
      
      result.sort((a, b) => {
        const aVal = parseFloat(a[field]) || 0;
        const bVal = parseFloat(b[field]) || 0;
        return activeFilters.sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      });
    }

    // Apply column filters (bottles, closures, boxes, labels)
    Object.keys(columnFilters).forEach(columnKey => {
      const filter = columnFilters[columnKey];
      if (!filter) return;

      // Apply value filters (checkbox selections)
      if (filter.selectedValues && filter.selectedValues.size > 0) {
        result = result.filter(row => {
          // Special handling for Add column and Shipment Actions column
          if (columnKey === 'normal-3' || columnKey === 'add' || columnKey === 'normal-shipmentActions') {
            const isAdded = addedRows.has(row.id);
            const wantsAdded = filter.selectedValues.has('Added');
            const wantsNotAdded = filter.selectedValues.has('Not Added');
            
            // If both are selected, show all rows
            if (wantsAdded && wantsNotAdded) return true;
            // If only Added is selected, show only added rows
            if (wantsAdded && !wantsNotAdded) return isAdded;
            // If only Not Added is selected, show only non-added rows
            if (!wantsAdded && wantsNotAdded) return !isAdded;
            // If neither is selected, show nothing
            return false;
          }
          
          let rowValue;
          switch(columnKey) {
            case 'bottles':
              rowValue = row.bottleInventory || row.bottle_inventory;
              break;
            case 'closures':
              rowValue = row.closureInventory || row.closure_inventory;
              break;
            case 'boxes':
              rowValue = row.boxInventory || row.box_inventory;
              break;
            case 'labels':
              rowValue = row.labelsAvailable || row.label_inventory || row.labels_available;
              break;
            case 'brand':
              rowValue = row.brand;
              break;
            case 'product':
              rowValue = row.product;
              break;
            case 'size':
              rowValue = row.size;
              break;
            case 'qty': {
              const index = row._originalIndex !== undefined ? row._originalIndex : rows.findIndex(r => r.id === row.id);
              rowValue = effectiveQtyValues[index] || 0;
              break;
            }
            case 'fbaAvailable':
              rowValue = row.doiFba || row.doiTotal || 0;
              break;
            case 'totalInventory':
              rowValue = row.doiTotal || row.daysOfInventory || 0;
              break;
            case 'forecast':
              rowValue = row.weeklyForecast || row.forecast || 0;
              break;
            case 'sales7Day':
              rowValue = row.sales7Day || 0;
              break;
            case 'sales30Day':
              rowValue = row.sales30Day || 0;
              break;
            case 'sales4Month':
              rowValue = Math.round((row.sales30Day || 0) * 4);
              break;
            case 'formula':
              rowValue = row.formula_name || '';
              break;
            case 'normal-asin':
              rowValue = row.asin || row.child_asin || row.childAsin || '';
              break;
            case 'normal-status': {
              const doiValue = row.doiTotal || row.daysOfInventory || 0;
              rowValue = doiValue >= 30 ? 'Good' : 'Low';
              break;
            }
            case 'normal-inventory':
              rowValue = row.fbaAvailable || 0;
              break;
            case 'normal-unitsToMake':
              rowValue = row.weeklyForecast || row.forecast || 0;
              break;
            case 'normal-doi':
              rowValue = row.doiTotal || row.daysOfInventory || 0;
              break;
            default: {
              const field = getFieldForHeaderFilter(columnKey);
              rowValue = row[field];
              break;
            }
          }
          return filter.selectedValues.has(rowValue) || 
                 filter.selectedValues.has(String(rowValue));
        });
      }

      // Apply condition filters
      if (filter.conditionType && filter.conditionType !== '') {
        result = result.filter(row => {
          let rowValue;
          switch(columnKey) {
            case 'bottles':
              rowValue = row.bottleInventory || row.bottle_inventory || 0;
              break;
            case 'closures':
              rowValue = row.closureInventory || row.closure_inventory || 0;
              break;
            case 'boxes':
              rowValue = row.boxInventory || row.box_inventory || 0;
              break;
            case 'labels':
              rowValue = row.labelsAvailable || row.label_inventory || row.labels_available || 0;
              break;
            case 'brand':
              rowValue = row.brand || '';
              break;
            case 'product':
              rowValue = row.product || '';
              break;
            case 'size':
              rowValue = row.size || '';
              break;
            case 'qty': {
              const index = row._originalIndex !== undefined ? row._originalIndex : rows.findIndex(r => r.id === row.id);
              const qty = effectiveQtyValues[index];
              rowValue = typeof qty === 'number' ? qty : (qty === '' || qty === null || qty === undefined ? 0 : parseInt(qty, 10) || 0);
              break;
            }
            case 'fbaAvailable':
              rowValue = row.doiFba || row.doiTotal || 0;
              break;
            case 'totalInventory':
              rowValue = row.doiTotal || row.daysOfInventory || 0;
              break;
            case 'forecast':
              rowValue = row.weeklyForecast || row.forecast || 0;
              break;
            case 'sales7Day':
              rowValue = row.sales7Day || 0;
              break;
            case 'sales30Day':
              rowValue = row.sales30Day || 0;
              break;
            case 'sales4Month':
              rowValue = Math.round((row.sales30Day || 0) * 4);
              break;
            case 'formula':
              rowValue = row.formula_name || '';
              break;
            case 'normal-asin':
              rowValue = row.asin || row.child_asin || row.childAsin || '';
              break;
            case 'normal-status': {
              const doiValue = row.doiTotal || row.daysOfInventory || 0;
              rowValue = doiValue >= 30 ? 'Good' : 'Low';
              break;
            }
            case 'normal-inventory':
              rowValue = row.fbaAvailable || 0;
              break;
            case 'normal-unitsToMake':
              rowValue = row.weeklyForecast || row.forecast || 0;
              break;
            case 'normal-doi':
              rowValue = row.doiTotal || row.daysOfInventory || 0;
              break;
            default: {
              const field = getFieldForHeaderFilter(columnKey);
              rowValue = row[field] || 0;
              break;
            }
          }

          const numValue = typeof rowValue === 'number' ? rowValue : parseFloat(rowValue) || 0;
          const filterNum = parseFloat(filter.conditionValue) || 0;
          const strValue = String(rowValue || '').toLowerCase();
          const filterStr = (filter.conditionValue || '').toLowerCase();

          switch (filter.conditionType) {
            case 'equals':
              return numValue === filterNum || strValue === filterStr;
            case 'notEquals':
              return numValue !== filterNum && strValue !== filterStr;
            case 'greaterThan':
              return numValue > filterNum;
            case 'lessThan':
              return numValue < filterNum;
            case 'greaterOrEqual':
              return numValue >= filterNum;
            case 'lessOrEqual':
              return numValue <= filterNum;
            case 'contains':
              return strValue.includes(filterStr);
            case 'notContains':
              return !strValue.includes(filterStr);
            case 'startsWith':
              return strValue.startsWith(filterStr);
            case 'endsWith':
              return strValue.endsWith(filterStr);
            case 'isEmpty':
              return rowValue === null || rowValue === undefined || rowValue === '' || rowValue === 0;
            case 'isNotEmpty':
              return rowValue !== null && rowValue !== undefined && rowValue !== '' && rowValue !== 0;
            default:
              return true;
          }
        });
      }
    });

    // Apply column sorting - use stored order if available (one-time sort like SortProductsTable)
    if (sortedRowOrder && sortedRowOrder.length > 0) {
      // Create a map of row ID to row for quick lookup
      const rowMap = new Map(result.map(row => [row.id, row]));
      
      // Reorder result based on stored order
      const orderedResult = [];
      const processedIds = new Set();
      
      // First, add rows in the stored order
      sortedRowOrder.forEach(id => {
        if (rowMap.has(id)) {
          orderedResult.push(rowMap.get(id));
          processedIds.add(id);
        }
      });
      
      // Then, add any new rows that weren't in the original sort (e.g., newly added rows)
      result.forEach(row => {
        if (!processedIds.has(row.id)) {
          orderedResult.push(row);
        }
      });
      
      result = orderedResult;
    } else {
      // Default: put "No Sales History" items at the bottom (no sales 7-day and 30-day)
      const hasSales = (row) => (Number(row.sales30Day) || Number(row.sales7Day) || 0) > 0;
      result = [...result].sort((a, b) => {
        const aHasSales = hasSales(a);
        const bHasSales = hasSales(b);
        if (aHasSales === bHasSales) return 0;
        return aHasSales ? -1 : 1; // has sales first (before no sales)
      });
    }
    
    return result;
  }, [rowsSignature, activeFilters, columnFilters, sortedRowOrder, forecastRange]);

  // Apply selection filter only in table mode
  const filteredRowsWithSelection = useMemo(() => {
    if (selectionFilter === 'checked') {
      return filteredRows.filter((row) => addedRows.has(row.id));
    }
    if (selectionFilter === 'unchecked') {
      return filteredRows.filter((row) => !addedRows.has(row.id));
    }
    return filteredRows;
  }, [filteredRows, selectionFilter, addedRows]);

  // Keep local addedRows/selectedRows in sync with parent state so toggling views preserves selections
  // Use a stable key (sorted IDs string) so we don't re-run on every parent re-render when a new Set with same contents is passed (avoids React #185)
  const externalAddedRowsKey = (() => {
    if (externalAddedRows instanceof Set) {
      return [...externalAddedRows].sort().join(',');
    }
    if (Array.isArray(externalAddedRows)) {
      return [...externalAddedRows].sort().join(',');
    }
    return '';
  })();
  useEffect(() => {
    if (externalAddedRows instanceof Set) {
      setAddedRows(new Set(externalAddedRows));
      setSelectedRows(new Set(externalAddedRows));
    } else if (Array.isArray(externalAddedRows)) {
      const synced = new Set(externalAddedRows);
      setAddedRows(synced);
      setSelectedRows(synced);
    } else if (externalAddedRowsKey === '') {
      setAddedRows(new Set());
      setSelectedRows(new Set());
    }
  }, [externalAddedRowsKey]);
  
  // Handle filter apply
  const handleFilterApply = (filterSettings) => {
    setActiveFilters(filterSettings);
  };
  
  // Handle filter reset – clear both timeline filters and non-table column filters (e.g. Inventory Out of Stock / Best Sellers)
  const handleFilterReset = () => {
    console.log('[handleFilterReset] Resetting all filters and sorts');
    setActiveFilters({
      popularFilter: '',
      sortField: '',
      sortOrder: '',
      filterField: '',
      filterCondition: '',
      filterValue: '',
    });
    setNonTableFilters({});
    setNonTableSortField('');
    setNonTableSortOrder('');
    setNonTableSortedRowOrder(null);
    
    // Restore original row order
    if (originalRowOrder.current) {
      console.log('[handleFilterReset] Restoring original row order');
      setSortedRowOrder(originalRowOrder.current);
    } else {
      setSortedRowOrder(null);
    }
    
    setColumnFilters({}); // Clear all column filters
  };

  // Filter handlers for bottles, closures, boxes, labels columns
  const handleFilterClick = (columnKey, event) => {
    event.stopPropagation();
    // Close timeline filter if open
    if (openFilterIndex === 'doi-goal') {
      setOpenFilterIndex(null);
    }
    setOpenFilterColumns((prev) => {
      const next = new Set();
      // Close all other filters and open only the clicked one (if not already open)
      if (!prev.has(columnKey)) {
        next.add(columnKey);
      }
      // If it was already open, close it (empty set)
      return next;
    });
  };

  // Close column filters when timeline filter opens
  useEffect(() => {
    if (openFilterIndex === 'doi-goal' && openFilterColumns.size > 0) {
      setOpenFilterColumns(new Set());
    }
  }, [openFilterIndex]);

  // Store current filtered rows (without sorting) in ref for use in sort handler
  useEffect(() => {
    // Compute filtered rows without sorting
    let result = rows.map((row, index) => ({ 
      ...row, 
      _originalIndex: row._originalIndex !== undefined ? row._originalIndex : index 
    }));
    
    // Apply all filters except column sorting
    if (activeFilters.popularFilter) {
      switch (activeFilters.popularFilter) {
        case 'bestSellers':
          result = result.filter(r => (r.sales30Day || 0) > 0);
          result.sort((a, b) => (b.sales30Day || 0) - (a.sales30Day || 0));
          result = result.slice(0, 50);
          break;
        case 'fastestMovers':
          result = result.filter(r => (r.sales30Day || 0) > 0);
          result.sort((a, b) => ((b.sales30Day || 0) / 30) - ((a.sales30Day || 0) / 30));
          result = result.slice(0, 50);
          break;
        case 'topProfit':
          result = result.filter(r => (r.profit || r.margin || r.sales30Day || 0) > 0);
          result.sort((a, b) => (b.profit || b.margin || b.sales30Day || 0) - (a.profit || a.margin || a.sales30Day || 0));
          result = result.slice(0, 50);
          break;
        case 'topTraffic':
          result = result.filter(r => (r.sessions || r.pageViews || 0) > 0);
          result.sort((a, b) => (b.sessions || b.pageViews || 0) - (a.sessions || a.pageViews || 0));
          result = result.slice(0, 50);
          break;
        case 'outOfStock':
          result = result.filter(r => (r.fbaAvailable || 0) === 0 && (r.sales30Day || 0) > 0);
          break;
        case 'overstock':
          result = result.filter(r => (r.doiTotal || r.daysOfInventory || 0) > forecastRange);
          break;
      }
    }
    
    if (activeFilters.filterField && activeFilters.filterCondition && activeFilters.filterValue) {
      const fieldMap = {
        'brand': 'brand',
        'product': 'product',
        'size': 'size',
        'fbaAvailable': 'fbaAvailable',
        'totalInventory': 'totalInventory',
        'forecast': 'weeklyForecast',
        'qty': 'qty',
      };
      const field = fieldMap[activeFilters.filterField] || activeFilters.filterField;
      const value = activeFilters.filterValue.toLowerCase();
      
      result = result.filter(row => {
        // Special handling for brand filter - search both brand field and product name
        if (activeFilters.filterField === 'brand') {
          const brandValue = row.brand || '';
          const productValue = row.product || '';
          const searchText = (brandValue + ' ' + productValue).toLowerCase();
          const filterValue = activeFilters.filterValue.toLowerCase();
          
          switch (activeFilters.filterCondition) {
            case 'equals':
              return brandValue.toLowerCase() === filterValue;
            case 'contains':
              return searchText.includes(filterValue);
            default:
              return true;
          }
        }
        
        // Standard filtering for other fields
        const rowValue = row[field];
        const strValue = String(rowValue || '').toLowerCase();
        const numValue = parseFloat(rowValue) || 0;
        const filterNum = parseFloat(activeFilters.filterValue) || 0;
        
        switch (activeFilters.filterCondition) {
          case 'equals':
            return strValue === value;
          case 'contains':
            return strValue.includes(value);
          case 'greaterThan':
            return numValue > filterNum;
          case 'lessThan':
            return numValue < filterNum;
          default:
            return true;
        }
      });
    }
    
    // Apply column filters (but not sorting)
    Object.keys(columnFilters).forEach(key => {
      const filter = columnFilters[key];
      if (!filter || filter.sortOrder) return; // Skip if it's a sort-only filter

      if (filter.selectedValues && filter.selectedValues.size > 0) {
        result = result.filter(row => {
          // Special handling for Add column and Shipment Actions column
          if (key === 'normal-3' || key === 'add' || key === 'normal-shipmentActions') {
            const isAdded = addedRows.has(row.id);
            const wantsAdded = filter.selectedValues.has('Added');
            const wantsNotAdded = filter.selectedValues.has('Not Added');
            
            // If both are selected, show all rows
            if (wantsAdded && wantsNotAdded) return true;
            // If only Added is selected, show only added rows
            if (wantsAdded && !wantsNotAdded) return isAdded;
            // If only Not Added is selected, show only non-added rows
            if (!wantsAdded && wantsNotAdded) return !isAdded;
            // If neither is selected, show nothing
            return false;
          }
          
          let rowValue;
          switch(key) {
            case 'bottles':
              rowValue = row.bottleInventory || row.bottle_inventory;
              break;
            case 'closures':
              rowValue = row.closureInventory || row.closure_inventory;
              break;
            case 'boxes':
              rowValue = row.boxInventory || row.box_inventory;
              break;
            case 'labels':
              rowValue = row.labelsAvailable || row.label_inventory || row.labels_available;
              break;
            case 'brand':
              rowValue = row.brand;
              break;
            case 'product':
              rowValue = row.product;
              break;
            case 'size':
              rowValue = row.size;
              break;
            case 'qty': {
              const index = row._originalIndex !== undefined ? row._originalIndex : rows.findIndex(r => r.id === row.id);
              rowValue = effectiveQtyValues[index] || 0;
              break;
            }
            case 'fbaAvailable':
              rowValue = row.doiFba || row.doiTotal || 0;
              break;
            case 'totalInventory':
              rowValue = row.doiTotal || row.daysOfInventory || 0;
              break;
            case 'forecast':
              rowValue = row.weeklyForecast || row.forecast || 0;
              break;
            case 'sales7Day':
              rowValue = row.sales7Day || 0;
              break;
            case 'sales30Day':
              rowValue = row.sales30Day || 0;
              break;
            case 'sales4Month':
              rowValue = Math.round((row.sales30Day || 0) * 4);
              break;
            case 'formula':
              rowValue = row.formula_name || '';
              break;
            case 'normal-asin':
              rowValue = row.asin || row.child_asin || row.childAsin || '';
              break;
            case 'normal-status': {
              const doiValue = row.doiTotal || row.daysOfInventory || 0;
              rowValue = doiValue >= 30 ? 'Good' : 'Low';
              break;
            }
            case 'normal-inventory':
              rowValue = row.fbaAvailable || 0;
              break;
            case 'normal-unitsToMake':
              rowValue = row.weeklyForecast || row.forecast || 0;
              break;
            case 'normal-doi':
              rowValue = row.doiTotal || row.daysOfInventory || 0;
              break;
            default: {
              const field = getFieldForHeaderFilter(key);
              rowValue = row[field];
              break;
            }
          }
          return filter.selectedValues.has(rowValue) || 
                 filter.selectedValues.has(String(rowValue));
        });
      }

      if (filter.conditionType && filter.conditionType !== '') {
        result = result.filter(row => {
          let rowValue;
          switch(key) {
            case 'bottles':
              rowValue = row.bottleInventory || row.bottle_inventory || 0;
              break;
            case 'closures':
              rowValue = row.closureInventory || row.closure_inventory || 0;
              break;
            case 'boxes':
              rowValue = row.boxInventory || row.box_inventory || 0;
              break;
            case 'labels':
              rowValue = row.labelsAvailable || row.label_inventory || row.labels_available || 0;
              break;
            case 'brand':
              rowValue = row.brand || '';
              break;
            case 'product':
              rowValue = row.product || '';
              break;
            case 'size':
              rowValue = row.size || '';
              break;
            case 'qty': {
              const index = row._originalIndex !== undefined ? row._originalIndex : rows.findIndex(r => r.id === row.id);
              const qty = effectiveQtyValues[index];
              rowValue = typeof qty === 'number' ? qty : (qty === '' || qty === null || qty === undefined ? 0 : parseInt(qty, 10) || 0);
              break;
            }
            case 'fbaAvailable':
              rowValue = row.doiFba || row.doiTotal || 0;
              break;
            case 'totalInventory':
              rowValue = row.doiTotal || row.daysOfInventory || 0;
              break;
            case 'forecast':
              rowValue = row.weeklyForecast || row.forecast || 0;
              break;
            case 'sales7Day':
              rowValue = row.sales7Day || 0;
              break;
            case 'sales30Day':
              rowValue = row.sales30Day || 0;
              break;
            case 'sales4Month':
              rowValue = Math.round((row.sales30Day || 0) * 4);
              break;
            case 'formula':
              rowValue = row.formula_name || '';
              break;
            case 'normal-asin':
              rowValue = row.asin || row.child_asin || row.childAsin || '';
              break;
            case 'normal-status': {
              const doiValue = row.doiTotal || row.daysOfInventory || 0;
              rowValue = doiValue >= 30 ? 'Good' : 'Low';
              break;
            }
            case 'normal-inventory':
              rowValue = row.fbaAvailable || 0;
              break;
            case 'normal-unitsToMake':
              rowValue = row.weeklyForecast || row.forecast || 0;
              break;
            case 'normal-doi':
              rowValue = row.doiTotal || row.daysOfInventory || 0;
              break;
            default: {
              const field = getFieldForHeaderFilter(key);
              rowValue = row[field] || 0;
              break;
            }
          }

          const numValue = typeof rowValue === 'number' ? rowValue : parseFloat(rowValue) || 0;
          const filterNum = parseFloat(filter.conditionValue) || 0;
          const strValue = String(rowValue || '').toLowerCase();
          const filterStr = (filter.conditionValue || '').toLowerCase();

          switch (filter.conditionType) {
            case 'equals':
              return numValue === filterNum || strValue === filterStr;
            case 'notEquals':
              return numValue !== filterNum && strValue !== filterStr;
            case 'greaterThan':
              return numValue > filterNum;
            case 'lessThan':
              return numValue < filterNum;
            case 'greaterOrEqual':
              return numValue >= filterNum;
            case 'lessOrEqual':
              return numValue <= filterNum;
            case 'contains':
              return strValue.includes(filterStr);
            case 'notContains':
              return !strValue.includes(filterStr);
            case 'startsWith':
              return strValue.startsWith(filterStr);
            case 'endsWith':
              return strValue.endsWith(filterStr);
            case 'isEmpty':
              return rowValue === null || rowValue === undefined || rowValue === '' || rowValue === 0;
            case 'isNotEmpty':
              return rowValue !== null && rowValue !== undefined && rowValue !== '' && rowValue !== 0;
            default:
              return true;
          }
        });
      }
    });
    
    currentFilteredRowsRef.current = result;
  }, [rowsSignature, activeFilters, columnFilters, forecastRange]);

  // Store current non-table filtered rows (without sorting) in ref for use in sort handler
  useEffect(() => {
    if (tableMode) return; // Only for non-table mode
    
    // Compute filtered rows without sorting
    // Note: filteredRowsWithSelection is already filtered by account in the parent component
    // So we don't need to filter by account again here - just apply user filters
    let result = [...filteredRowsWithSelection];
    
    // Apply non-table filters (but not sorting)
    Object.keys(nonTableFilters).forEach(columnKey => {
      const filter = nonTableFilters[columnKey];
      if (!filter) return;

      const numeric = isNonTableNumericColumn(columnKey);

      // Popular filters (Inventory column) – when set, only apply this (skip value/condition for this column)
      if (columnKey === 'fbaAvailable' && filter.popularFilter) {
        if (filter.popularFilter === 'soldOut') {
          result = result.filter((row) => {
            const totalInv = Number(row.totalInventory ?? row.total_inventory) || 0;
            const sales30 = Number(row.sales30Day ?? row.sales_30_day) || 0;
            const sales7 = Number(row.sales7Day ?? row.sales_7_day) || 0;
            const hasSales = sales30 > 0 || sales7 > 0;
            return totalInv === 0 && hasSales;
          });
        } else if (filter.popularFilter === 'noSalesHistory') {
          result = result.filter((row) => hasNoSalesHistory(row));
        }
        // bestSellers: no row filter, sort is applied via sortOrder/sortField
      } else {
      // Value filters (skip for fbaAvailable when popularFilter is set – already handled above)
      if (filter.selectedValues && filter.selectedValues.size > 0) {
        result = result.filter((row, idx) => {
          if (columnKey === 'product') {
            return filter.selectedValues.has(row.product) || 
                   filter.selectedValues.has(String(row.product)) ||
                   filter.selectedValues.has(row.brand) || 
                   filter.selectedValues.has(String(row.brand)) ||
                   filter.selectedValues.has(row.size) || 
                   filter.selectedValues.has(String(row.size));
          }
          
          let value;
          if (columnKey === 'brand') value = row.brand;
          else if (columnKey === 'size') value = row.size;
          else if (columnKey === 'fbaAvailable') value = row.fbaAvailable || 0;
          else if (columnKey === 'unitsToMake') {
            const index = row._originalIndex !== undefined ? row._originalIndex : idx;
            const qty = effectiveQtyValues[index];
            const numericValue = typeof qty === 'number' ? qty : (qty === '' || qty === null || qty === undefined ? 0 : parseInt(qty, 10) || 0);
            value = numericValue === 0 ? 'add' : 'added';
          }
          else if (columnKey === 'doiDays') value = row.doiTotal || row.daysOfInventory || 0;
          
          return (
            filter.selectedValues.has(value) ||
            filter.selectedValues.has(String(value))
          );
        });
      }

      // Condition filters (same else: skip for fbaAvailable when popularFilter is set)
      if (filter.conditionType) {
        result = result.filter((row, idx) => {
          if (columnKey === 'product') {
            const productMatch = applyNonTableConditionFilter(
              row.product,
              filter.conditionType,
              filter.conditionValue,
              false
            );
            const brandMatch = applyNonTableConditionFilter(
              row.brand,
              filter.conditionType,
              filter.conditionValue,
              false
            );
            const sizeMatch = applyNonTableConditionFilter(
              row.size,
              filter.conditionType,
              filter.conditionValue,
              false
            );
            return productMatch || brandMatch || sizeMatch;
          }
          
          let value;
          if (columnKey === 'brand') value = row.brand;
          else if (columnKey === 'size') value = row.size;
          else if (columnKey === 'fbaAvailable') value = row.fbaAvailable || 0;
          else if (columnKey === 'unitsToMake') {
            const index = row._originalIndex !== undefined ? row._originalIndex : idx;
            const qty = effectiveQtyValues[index];
            const numericValue = typeof qty === 'number' ? qty : (qty === '' || qty === null || qty === undefined ? 0 : parseInt(qty, 10) || 0);
            value = numericValue === 0 ? 'add' : 'added';
          }
          else if (columnKey === 'doiDays') value = row.doiTotal || row.daysOfInventory || 0;
          
          return applyNonTableConditionFilter(
            value,
            filter.conditionType,
            filter.conditionValue,
            numeric
          );
        });
      }
      }
    });
    
    currentNonTableFilteredRowsRef.current = result;
  }, [filteredRowsWithSelection, nonTableFilters, tableMode, effectiveQtyValues, account]);

  const handleApplyColumnFilter = (columnKey, filterData) => {
    // If filterData is null, remove the filter (Reset was clicked)
    if (filterData === null) {
      setColumnFilters(prev => {
        const newFilters = { ...prev };
        delete newFilters[columnKey];
        return newFilters;
      });
      return;
    }
    
    setColumnFilters(prev => ({
      ...prev,
      [columnKey]: filterData,
    }));
    
    // If sortOrder is provided, apply one-time sort directly (like SortProductsTable)
    if (filterData.sortOrder) {
      // Get current filtered rows from ref (updated by useEffect)
      // Use setTimeout to ensure filters are applied and ref is updated
      setTimeout(() => {
        const rowsToSort = [...currentFilteredRowsRef.current];
        
        // Sort the rows
        rowsToSort.sort((a, b) => {
        let aVal, bVal;
        
        // Get the field value based on columnKey
        switch(columnKey) {
          case 'bottles':
            aVal = a.bottleInventory || a.bottle_inventory || 0;
            bVal = b.bottleInventory || b.bottle_inventory || 0;
            break;
          case 'closures':
            aVal = a.closureInventory || a.closure_inventory || 0;
            bVal = b.closureInventory || b.closure_inventory || 0;
            break;
          case 'boxes':
            aVal = a.boxInventory || a.box_inventory || 0;
            bVal = b.boxInventory || b.box_inventory || 0;
            break;
          case 'labels':
            aVal = a.labelsAvailable || a.label_inventory || a.labels_available || 0;
            bVal = b.labelsAvailable || b.label_inventory || b.labels_available || 0;
            break;
          case 'normal-4':
          case 'qty': {
            // Qty values are stored in effectiveQtyValues, indexed by original row index
            const aIndex = a._originalIndex !== undefined ? a._originalIndex : rows.indexOf(a);
            const bIndex = b._originalIndex !== undefined ? b._originalIndex : rows.indexOf(b);
            const aQty = effectiveQtyValues[aIndex];
            const bQty = effectiveQtyValues[bIndex];
            aVal = typeof aQty === 'number' ? aQty : (aQty === '' || aQty === null || aQty === undefined ? 0 : parseInt(aQty, 10) || 0);
            bVal = typeof bQty === 'number' ? bQty : (bQty === '' || bQty === null || bQty === undefined ? 0 : parseInt(bQty, 10) || 0);
            break;
          }
          case 'brand':
            aVal = a.brand || '';
            bVal = b.brand || '';
            break;
          case 'product':
            aVal = a.product || '';
            bVal = b.product || '';
            break;
          case 'size':
            aVal = a.size || '';
            bVal = b.size || '';
            break;
          case 'fbaAvailable':
            aVal = a.doiFba || a.doiTotal || 0;
            bVal = b.doiFba || b.doiTotal || 0;
            break;
          case 'totalInventory':
            aVal = a.doiTotal || a.daysOfInventory || 0;
            bVal = b.doiTotal || b.daysOfInventory || 0;
            break;
          case 'forecast':
            aVal = a.weeklyForecast || a.forecast || 0;
            bVal = b.weeklyForecast || b.forecast || 0;
            break;
          case 'sales7Day':
            aVal = a.sales7Day || 0;
            bVal = b.sales7Day || 0;
            break;
          case 'sales30Day':
            aVal = a.sales30Day || 0;
            bVal = b.sales30Day || 0;
            break;
          case 'sales4Month':
            aVal = Math.round((a.sales30Day || 0) * 4);
            bVal = Math.round((b.sales30Day || 0) * 4);
            break;
          case 'formula':
            aVal = a.formula_name || '';
            bVal = b.formula_name || '';
            break;
          default: {
            const field = getFieldForHeaderFilter(columnKey);
            aVal = a[field];
            bVal = b[field];
            break;
          }
        }
        
        let comparison = 0;
        
        // Handle numeric values
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          comparison = filterData.sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        } else {
          // Handle string values
          const aStr = String(aVal || '').toLowerCase();
          const bStr = String(bVal || '').toLowerCase();
          
          if (filterData.sortOrder === 'asc') {
            comparison = aStr.localeCompare(bStr);
          } else {
            comparison = bStr.localeCompare(aStr);
          }
        }
        
          return comparison;
        });
        
        // Store the sorted order (array of row IDs)
        const sortedIds = rowsToSort.map(row => row.id);
        setSortedRowOrder(sortedIds);
        
        // Clear sort config for this column (one-time sort, not persistent)
        setColumnSortConfig(prev => prev.filter(sort => sort.column !== columnKey));
      }, 0);
    } else {
      // If sortOrder is empty, remove sort from config and clear stored order
      setColumnSortConfig(prev => prev.filter(sort => sort.column !== columnKey));
      setSortedRowOrder(null);
    }
  };

  // Map normal header filter keys to row fields
  function getFieldForHeaderFilter(columnKey) {
    switch (columnKey) {
      case 'normal-0':
        return 'brand';
      case 'normal-1':
      case 'normal-product':
        return 'product';
      case 'normal-2':
        return 'size';
      case 'normal-3':
        return 'add'; // whether product is added (uses boolean/flag)
      case 'normal-4':
        return 'qty'; // quantity field
      case 'normal-asin':
        return 'asin';
      case 'normal-status':
        return 'status';
      case 'normal-inventory':
        return 'fbaAvailable';
      case 'normal-unitsToMake':
        return 'weeklyForecast';
      case 'normal-doi':
        return 'doiTotal';
      case 'normal-shipmentActions':
        return 'add'; // whether product is added (uses boolean/flag)
      default:
        return columnKey;
    }
  }

  // Get unique values for a column
  const getColumnValues = (columnKey) => {
    // Special handling for Add column and Shipment Actions column
    if (columnKey === 'normal-3' || columnKey === 'add' || columnKey === 'normal-shipmentActions') {
      return ['Added', 'Not Added'];
    }
    
    // Always use all rows (not filteredRows) to show all available values
    const values = new Set();
    rows.forEach((row, index) => {
      let val;
      switch(columnKey) {
        case 'bottles':
          val = row.bottleInventory || row.bottle_inventory;
          break;
        case 'closures':
          val = row.closureInventory || row.closure_inventory;
          break;
        case 'boxes':
          val = row.boxInventory || row.box_inventory;
          break;
        case 'labels':
          val = row.labelsAvailable || row.label_inventory || row.labels_available;
          break;
        case 'size':
          val = row.size;
          break;
        case 'brand':
          val = row.brand;
          break;
        case 'product':
          val = row.product;
          break;
        case 'qty':
          val = effectiveQtyValues[row._originalIndex !== undefined ? row._originalIndex : index] || 0;
          break;
        case 'fbaAvailable':
          val = row.doiFba || row.doiTotal || 0;
          break;
        case 'totalInventory':
          val = row.doiTotal || row.daysOfInventory || 0;
          break;
        case 'forecast':
          val = row.weeklyForecast || row.forecast || 0;
          break;
        case 'sales7Day':
          val = row.sales7Day || 0;
          break;
        case 'sales30Day':
          val = row.sales30Day || 0;
          break;
        case 'sales4Month':
          val = Math.round((row.sales30Day || 0) * 4);
          break;
        case 'formula':
          val = row.formula_name || '';
          break;
        case 'normal-asin':
          val = row.asin || row.child_asin || row.childAsin || '';
          break;
        case 'normal-status': {
          const doiValue = row.doiTotal || row.daysOfInventory || 0;
          val = doiValue >= 30 ? 'Good' : 'Low';
          break;
        }
        case 'normal-inventory':
          val = row.fbaAvailable || 0;
          break;
        case 'normal-unitsToMake':
          val = row.weeklyForecast || row.forecast || 0;
          break;
        case 'normal-doi':
          val = row.doiTotal || row.daysOfInventory || 0;
          break;
        default: {
          const field = getFieldForHeaderFilter(columnKey);
          val = row[field];
          break;
        }
      }
      if (val !== undefined && val !== null && val !== '') {
        values.add(val);
      }
    });
    const sortedValues = Array.from(values).sort((a, b) => {
      if (typeof a === 'number' && typeof b === 'number') {
        return a - b;
      }
      return String(a).localeCompare(String(b));
    });
    return sortedValues;
  };

  // Get sort order for a column
  const getColumnSortOrder = (columnKey) => {
    const sort = columnSortConfig.find(sort => sort.column === columnKey);
    return sort ? sort.order : '';
  };

  // Check if a column has active filters
  const hasActiveColumnFilter = (columnKey) => {
    const filter = columnFilters[columnKey];
    if (!filter) return false;
    
    // Check for condition filter
    const hasCondition = filter.conditionType && filter.conditionType !== '';
    if (hasCondition) return true;
    
    // Check for value filters - only active if not all values are selected
    if (!filter.selectedValues || filter.selectedValues.size === 0) return false;
    
    // Special handling for Add column and Shipment Actions column
    if (columnKey === 'normal-3' || columnKey === 'add' || columnKey === 'normal-shipmentActions') {
      // For Add column, both "Added" and "Not Added" selected means no active filter
      return filter.selectedValues.size < 2;
    }
    
    // Get all available values for this column
    const allAvailableValues = getColumnValues(columnKey);
    if (allAvailableValues.length === 0) return false;
    
    const allValuesSet = new Set(allAvailableValues.map(v => String(v)));
    const selectedValuesSet = filter.selectedValues instanceof Set 
      ? new Set(Array.from(filter.selectedValues).map(v => String(v)))
      : new Set(Array.from(filter.selectedValues || []).map(v => String(v)));
    
    // Check if all available values are selected - if so, it's not an active filter
    const allSelected = allValuesSet.size > 0 && 
      selectedValuesSet.size === allValuesSet.size &&
      Array.from(allValuesSet).every(val => selectedValuesSet.has(val));
    
    // Filter is active only if not all values are selected
    return !allSelected;
  };

  // Non-table mode filter helpers
  const getNonTableColumnValues = (columnKey) => {
    const values = new Set();
    filteredRowsWithSelection.forEach((row, idx) => {
      if (columnKey === 'product') {
        // Include product name, brand, and size for compound filtering
        if (row.product !== undefined && row.product !== null && row.product !== '') {
          values.add(row.product);
        }
        if (row.brand !== undefined && row.brand !== null && row.brand !== '') {
          values.add(row.brand);
        }
        if (row.size !== undefined && row.size !== null && row.size !== '') {
          values.add(row.size);
        }
      } else if (columnKey === 'unitsToMake') {
        // Filter by Units to Make: Added | Not Added
        values.add('Not Added');
        values.add('Added');
      } else if (columnKey === 'doiDays') {
        // Get DOI value
        const val = row.doiTotal || row.daysOfInventory || 0;
        values.add(val);
      } else {
        let val;
        if (columnKey === 'brand') {
          val = row.brand;
        } else if (columnKey === 'size') {
          val = row.size;
        } else if (columnKey === 'fbaAvailable') {
          val = row.fbaAvailable || 0;
        }
        if (val !== undefined && val !== null && val !== '') {
          values.add(val);
        }
      }
    });
    const sortedValues = Array.from(values).sort((a, b) => {
      if (typeof a === 'number' && typeof b === 'number') return a - b;
      return String(a).localeCompare(String(b));
    });
    return sortedValues;
  };

  const isNonTableNumericColumn = (columnKey) => columnKey === 'fbaAvailable' || columnKey === 'doiDays' || columnKey === 'unitsToMake' || columnKey === 'sales7Day';

  // Parse sales value (missing, null, "", or non-numeric → 0); used for DOI popular filters
  const parseSalesValue = (val) => {
    if (val === undefined || val === null || val === '') return 0;
    const n = Number(val);
    return Number.isFinite(n) ? n : 0;
  };

  // True when row would show the "NO SALES" badge: NOT out of stock AND no sales history (matches UI badge logic exactly)
  const hasNoSalesHistory = (row) => {
    const totalInv = parseSalesValue(row.totalInventory ?? row.total_inventory);
    const s30 = parseSalesValue(row.sales30Day ?? row.sales_30_day ?? row.units_sold_30_days);
    const s7 = parseSalesValue(row.sales7Day ?? row.sales_7_day ?? row.units_sold_7_days);
    // Match UI logic: "No Sales" tag shows when NOT out of stock (totalInv > 0) AND no sales history
    // UI checks: isOutOfStock ? "Out of Stock" : isNoSales ? "No Sales" : inventory number
    const isOutOfStock = totalInv === 0;
    const hasSalesHistory = s30 > 0 || s7 > 0;
    return !isOutOfStock && !hasSalesHistory;
  };

  const hasNonTableActiveFilter = (columnKey) => {
    const filter = nonTableFilters[columnKey];
    if (!filter || filter === null || filter === undefined) return false;
    
    // Check for brand filter (for product column)
    if (columnKey === 'product' && filter.selectedBrands && filter.selectedBrands instanceof Set && filter.selectedBrands.size > 0) {
      // Get account-specific brands (this would need account prop, but for now use a general check)
      // If selectedBrands is not null and has items, it's an active filter
      // The check for "all brands selected" is handled in the apply logic
      return true; // Brand filter is active
    }
    
    // Check for popular filter (Inventory column only)
    if (columnKey === 'fbaAvailable' && filter.popularFilter) return true;
    
    // Check for condition filter
    const hasCondition = filter.conditionType && filter.conditionType !== '';
    if (hasCondition) return true;
    
    // Check for value filters - only active if not all values are selected
    if (!filter.selectedValues || filter.selectedValues.size === 0) return false;
    
    // Get all available values for this column
    const allAvailableValues = getNonTableColumnValues(columnKey);
    if (allAvailableValues.length === 0) return false;
    
    const allValuesSet = new Set(allAvailableValues.map(v => String(v)));
    const selectedValuesSet = filter.selectedValues instanceof Set 
      ? new Set(Array.from(filter.selectedValues).map(v => String(v)))
      : new Set(Array.from(filter.selectedValues || []).map(v => String(v)));
    
    // Check if all available values are selected - if so, it's not an active filter
    const allSelected = allValuesSet.size > 0 && 
      selectedValuesSet.size === allValuesSet.size &&
      Array.from(allValuesSet).every(val => selectedValuesSet.has(val));
    
    // Filter is active only if not all values are selected
    return !allSelected;
  };

  const applyNonTableConditionFilter = (value, conditionType, conditionValue, numeric) => {
    if (!conditionType) return true;

    const strValue = String(value ?? '').toLowerCase();
    const strCond = String(conditionValue ?? '').toLowerCase();

    switch (conditionType) {
      case 'contains':
        return strValue.includes(strCond);
      case 'notContains':
        return !strValue.includes(strCond);
      case 'equals':
        return numeric ? Number(value) === Number(conditionValue) : strValue === strCond;
      case 'notEquals':
        return numeric ? Number(value) !== Number(conditionValue) : strValue !== strCond;
      case 'startsWith':
        return strValue.startsWith(strCond);
      case 'endsWith':
        return strValue.endsWith(strCond);
      case 'isEmpty':
        return !value || strValue === '';
      case 'isNotEmpty':
        return !!value && strValue !== '';
      case 'greaterThan':
        return Number(value) > Number(conditionValue);
      case 'lessThan':
        return Number(value) < Number(conditionValue);
      case 'greaterOrEqual':
        return Number(value) >= Number(conditionValue);
      case 'lessOrEqual':
        return Number(value) <= Number(conditionValue);
      case 'between':
        if (!conditionValue || !conditionValue.includes('-')) return true;
        const [min, max] = conditionValue.split('-').map(v => Number(v.trim()));
        if (isNaN(min) || isNaN(max)) return true;
        const numValue = Number(value);
        return numValue >= min && numValue <= max;
      case 'notBetween':
        if (!conditionValue || !conditionValue.includes('-')) return true;
        const [minNot, maxNot] = conditionValue.split('-').map(v => Number(v.trim()));
        if (isNaN(minNot) || isNaN(maxNot)) return true;
        const numValueNot = Number(value);
        return numValueNot < minNot || numValueNot > maxNot;
      default:
        return true;
    }
  };

  const handleNonTableApplyFilter = (columnKey, filterData) => {
    console.log('[handleNonTableApplyFilter] columnKey:', columnKey, 'filterData:', filterData);
    // If filterData is null, remove the filter (Reset was clicked) for this column only
    if (filterData === null) {
      console.log('[handleNonTableApplyFilter] Resetting filter for column only:', columnKey);
      
      // Clear only this column's filter (non-table and table column filters)
      setNonTableFilters(prev => {
        const next = { ...prev };
        delete next[columnKey];
        return next;
      });
      setColumnFilters(prev => {
        const next = { ...prev };
        delete next[columnKey];
        return next;
      });
      
      // When resetting Inventory column (e.g. after Out of Stock / No Sales History), clear sort and row order
      // at top level so the table fully resets to show all products in original order
      if (columnKey === 'fbaAvailable') {
        setNonTableSortOrder('');
        setNonTableSortedRowOrder(null);
        setNonTableSortField(prev => (prev === 'doiDays' || prev === 'fbaAvailable' ? '' : prev));
      } else {
        setNonTableSortField(prev => {
          const sortIsForThisColumn = prev === columnKey || (columnKey === 'doiDays' && prev === 'fbaAvailable');
          if (sortIsForThisColumn) {
            setNonTableSortOrder('');
            setNonTableSortedRowOrder(null);
            return '';
          }
          return prev;
        });
      }
      
      // Clear brand filter in parent only when resetting the product column
      if (columnKey === 'product' && onBrandFilterChange) {
        onBrandFilterChange(null);
      }
      
      console.log('[handleNonTableApplyFilter] Reset complete for column:', columnKey);
      return;
    }
    
    // For product column, check if all brands are selected - if so, treat as no brand filter
    let brandFilterToApply = filterData.selectedBrands || null;
    if (columnKey === 'product' && filterData.selectedBrands && filterData.selectedBrands instanceof Set) {
      const accountBrands = account && ACCOUNT_BRAND_MAPPING[account] 
        ? ACCOUNT_BRAND_MAPPING[account]
        : ACCOUNT_BRAND_MAPPING['TPS Nutrients'];
      
      // Check if all brands for this account are selected
      const allBrandsSelected = filterData.selectedBrands.size === accountBrands.length &&
        accountBrands.every(brand => filterData.selectedBrands.has(brand));
      
      // If all brands are selected, treat as no filter
      if (allBrandsSelected) {
        brandFilterToApply = null;
      }
    }
    
    // When applying an Inventory Popular Filter, commit state synchronously so the list updates before the dropdown closes
    const isInventoryPopularFilter = columnKey === 'fbaAvailable' && 
      (filterData.popularFilter === 'soldOut' || 
       filterData.popularFilter === 'noSalesHistory' || 
       filterData.popularFilter === 'bestSellers');
    
    const applyFilter = () => {
      setNonTableFilters(prev => ({
        ...prev,
        [columnKey]: {
          selectedValues: filterData.selectedValues || new Set(),
          conditionType: filterData.conditionType || '',
          conditionValue: filterData.conditionValue || '',
          selectedBrands: brandFilterToApply,
          ...(columnKey === 'fbaAvailable' ? { popularFilter: filterData.popularFilter ?? null } : {}),
        },
      }));
      // Clear sort only when applying Out of Stock/No Sales History *without* an explicit sort (dropdown now sends sort for these)
      if (columnKey === 'fbaAvailable' && (filterData.popularFilter === 'soldOut' || filterData.popularFilter === 'noSalesHistory') && !filterData.sortOrder) {
        setNonTableSortField('');
        setNonTableSortOrder('');
        setNonTableSortedRowOrder(null);
      }
    };
    
    if (isInventoryPopularFilter) {
      try {
        flushSync(applyFilter);
      } catch (e) {
        applyFilter();
      }
    } else {
      applyFilter();
    }
    
    // Pass brand filter to parent component for pre-filtering products
    // This filters the products list, but dropdown checkboxes remain visible
    if (columnKey === 'product' && onBrandFilterChange) {
      console.log('Passing brand filter to parent:', {
        brandFilterToApply: brandFilterToApply ? Array.from(brandFilterToApply) : null,
        account,
        filterDataSelectedBrands: filterData.selectedBrands ? Array.from(filterData.selectedBrands) : null,
        allBrandsSelected: columnKey === 'product' && filterData.selectedBrands ? (() => {
          const accountBrands = account && ACCOUNT_BRAND_MAPPING[account] 
            ? ACCOUNT_BRAND_MAPPING[account]
            : ACCOUNT_BRAND_MAPPING['TPS Nutrients'];
          return filterData.selectedBrands.size === accountBrands.length &&
            accountBrands.every(brand => filterData.selectedBrands.has(brand));
        })() : false
      });
      onBrandFilterChange(brandFilterToApply);
    }

    // If sortOrder is provided, apply one-time sort directly (snapshot the order)
    if (filterData.sortOrder) {
      const sortField = filterData.sortField || columnKey;
      setNonTableSortField(sortField);
      setNonTableSortOrder(filterData.sortOrder);
      
      // Best Sellers: sort the full list (not the ref) and commit order immediately so list updates
      const isBestSellersSort = columnKey === 'fbaAvailable' && filterData.popularFilter === 'bestSellers';
      const runSort = () => {
        const rowsToSort = isBestSellersSort
          ? [...filteredRowsWithSelection]
          : [...currentNonTableFilteredRowsRef.current];
        const numeric = isNonTableNumericColumn(sortField);
        
        // Get reference to original rows array for finding original indices
        const originalRows = filteredRowsWithSelection;
        
        // Sort the rows (use sortField so DOI dropdown can sort by FBA)
        rowsToSort.sort((a, b) => {
          let aVal, bVal;
          if (sortField === 'product') { aVal = a.product; bVal = b.product; }
          else if (sortField === 'brand') { aVal = a.brand; bVal = b.brand; }
          else if (sortField === 'size') { aVal = a.size; bVal = b.size; }
          else if (sortField === 'fbaAvailable') { aVal = a.doiFba ?? a.fbaAvailable ?? 0; bVal = b.doiFba ?? b.fbaAvailable ?? 0; }
          else if (sortField === 'unitsToMake') {
            // Use _originalIndex if available, otherwise find in original rows array
            const aIndex = a._originalIndex !== undefined ? a._originalIndex : originalRows.findIndex(r => r.id === a.id);
            const bIndex = b._originalIndex !== undefined ? b._originalIndex : originalRows.findIndex(r => r.id === b.id);
            const aQty = effectiveQtyValues[aIndex];
            const bQty = effectiveQtyValues[bIndex];
            
            // Helper function to convert value to number, handling commas and strings
            const parseNumericValue = (val) => {
              if (typeof val === 'number') return val;
              if (val === '' || val === null || val === undefined) return 0;
              // Remove commas and parse as number
              const cleaned = String(val).replace(/,/g, '');
              const parsed = Number(cleaned);
              return isNaN(parsed) ? 0 : parsed;
            };
            
            aVal = parseNumericValue(aQty);
            bVal = parseNumericValue(bQty);
          }
          else if (sortField === 'doiDays') { aVal = a.doiTotal || a.daysOfInventory || 0; bVal = b.doiTotal || b.daysOfInventory || 0; }
          else if (sortField === 'sales7Day') { aVal = a.sales7Day ?? a.sales_7_day ?? 0; bVal = b.sales7Day ?? b.sales_7_day ?? 0; }

          if (numeric) {
            const aNum = Number(aVal) || 0;
            const bNum = Number(bVal) || 0;
            // FBA A-Z: put zero inventory (0 FBA) first, then ascending by FBA
            if (sortField === 'fbaAvailable' && filterData.sortOrder === 'asc') {
              if (aNum === 0 && bNum !== 0) return -1;
              if (aNum !== 0 && bNum === 0) return 1;
              return aNum - bNum;
            }
            return filterData.sortOrder === 'asc' ? aNum - bNum : bNum - aNum;
          }

          const aStr = String(aVal ?? '').toLowerCase();
          const bStr = String(bVal ?? '').toLowerCase();
          return filterData.sortOrder === 'asc'
            ? aStr.localeCompare(bStr)
            : bStr.localeCompare(aStr);
        });
        
        // Store the sorted order (array of row IDs)
        const sortedIds = rowsToSort.map(row => row.id);
        setNonTableSortedRowOrder(sortedIds);
      };
      // Best Sellers: run sort synchronously and flush so the list reorders immediately
      if (isBestSellersSort) {
        try {
          flushSync(runSort);
        } catch (e) {
          runSort();
        }
      } else {
        requestAnimationFrame(() => {
          requestAnimationFrame(runSort);
        });
      }
    } else if (nonTableSortField === columnKey) {
      // If sortOrder is empty/cleared, remove sort and clear stored order
      setNonTableSortField('');
      setNonTableSortOrder('');
      setNonTableSortedRowOrder(null);
    }
  };

  // Close filter dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is on a filter icon (any column filter icon)
      const clickedOnFilterIcon = Object.values(filterIconRefs.current).some(ref => 
        ref && ref.contains && ref.contains(event.target)
      );
      
      // Check if click is inside a filter dropdown (by attribute or ref)
      const clickedInsideDropdown = event.target.closest('[data-filter-dropdown]') ||
        Object.values(filterDropdownRefs.current).some(ref => 
          ref && ref.contains && ref.contains(event.target)
        );
      
      // Check if click is on timeline filter icon
      const clickedOnTimelineFilter = filterRefs.current['doi-goal'] && 
        filterRefs.current['doi-goal'].contains && 
        filterRefs.current['doi-goal'].contains(event.target);
      
      // Check if click is inside timeline filter dropdown
      const clickedInsideTimelineFilter = event.target.closest('[data-timeline-filter]') ||
        (filterModalRefs.current['doi-goal'] && 
         filterModalRefs.current['doi-goal'].contains && 
         filterModalRefs.current['doi-goal'].contains(event.target));
      
      // Check if click is on ANY non-table filter icon
      const clickedOnNonTableFilterIcon = Object.values(nonTableFilterIconRefs.current).some(ref => 
        ref && ref.contains && ref.contains(event.target)
      );
      
      // Check if click is inside non-table filter dropdown
      const clickedInsideNonTableFilterDropdown = 
        (nonTableFilterDropdownRef.current && nonTableFilterDropdownRef.current.contains && nonTableFilterDropdownRef.current.contains(event.target)) ||
        event.target.closest('[data-filter-dropdown]');
      
      // Close column filters if open and click is outside
      if (openFilterColumns.size > 0) {
        if (!clickedOnFilterIcon && !clickedInsideDropdown && 
            !clickedOnTimelineFilter && !clickedInsideTimelineFilter) {
          setOpenFilterColumns(new Set());
        }
      }
      
      // Close timeline filter if open and click is outside
      if (openFilterIndex === 'doi-goal') {
        if (!clickedOnTimelineFilter && !clickedInsideTimelineFilter && 
            !clickedOnFilterIcon && !clickedInsideDropdown) {
          setOpenFilterIndex(null);
        }
      }
      
      // Close non-table filter if open and click is outside
      if (nonTableOpenFilterColumn !== null) {
        // Don't close if clicking on ANY filter icon - let the icon handler manage the transition
        // Only close if clicking truly outside (not on icons, not in dropdown)
        if (!clickedOnNonTableFilterIcon && !clickedInsideNonTableFilterDropdown) {
          setNonTableOpenFilterColumn(null);
        }
      }
    };

    // Use mousedown with capture phase to catch clicks early
    if (openFilterColumns.size > 0 || openFilterIndex === 'doi-goal' || nonTableOpenFilterColumn !== null) {
      // Add a delay to prevent immediate closing when opening or switching
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside, true);
      }, 100);
      
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside, true);
      };
    }
  }, [openFilterColumns, openFilterIndex, nonTableOpenFilterColumn]);

  // Apply non-table mode filters
  const nonTableFilteredRows = useMemo(() => {
    const inventoryFilter = nonTableFilters.fbaAvailable;
    // When in table mode, only apply Best Sellers sort if that filter is set (so sort works in both views)
    if (tableMode) {
      if (inventoryFilter?.popularFilter === 'bestSellers' && filteredRowsWithSelection.length > 0) {
        console.log('[Best Sellers Filter - TABLE MODE] Starting filter...');
        
        // Helper functions to match product names and sizes
        const pl = (r) => String(r.product || '').toLowerCase();
        const sz = (r) => String(r.size || '').toLowerCase().replace(/\s/g, '');
        
        // Define the exact top 10 products from last week's report (in order)
        const top10Matchers = [
          { name: 'liquid plant food', size: '8oz', rank: 1 },
          { name: 'indoor plant food', size: '8oz', rank: 2 },
          { name: 'monstera plant food', size: '8oz', rank: 3 },
          { name: 'christmas cactus fertilizer', size: '8oz', rank: 4 },
          { name: 'fiddle leaf fig plant food', size: '8oz', rank: 5 },
          { name: 'lemon tree fertilizer', size: '8oz', rank: 6 },
          { name: 'cleankelp seaweed fertilizer', size: 'quart', rank: 7 },
          { name: 'orchid fertilizer', size: '8oz', rank: 8 },
          { name: 'silica gold', size: 'quart', rank: 9 },
          { name: 'ph kit', size: '8ozkit', rank: 10 } // "8oz Kit" becomes "8ozkit" when spaces removed
        ];
        
        // Match each product in the list to a rank (if it's in the top 10)
        const matchedProducts = filteredRowsWithSelection.map((r) => {
          const pName = pl(r);
          const pSize = sz(r);
          const match = top10Matchers.find(m => {
            const nameMatch = pName.includes(m.name);
            const sizeMatch = pSize.includes(m.size) || pSize === m.size;
            return nameMatch && sizeMatch;
          });
          return { row: r, rank: match ? match.rank : null };
        }).filter(item => item.rank !== null); // Only keep top 10 products
        
        // Sort by rank (1, 2, 3, ...)
        matchedProducts.sort((a, b) => a.rank - b.rank);
        
        const top10 = matchedProducts.map(item => item.row);
        console.log('[Best Sellers Filter - TABLE MODE] Matched ' + top10.length + ' products:', top10.map(r => ({ product: r.product, size: r.size })));
        
        // Log which matchers didn't find a match
        const matchedRanks = new Set(matchedProducts.map(m => m.rank));
        const missingMatchers = top10Matchers.filter(m => !matchedRanks.has(m.rank));
        if (missingMatchers.length > 0) {
          console.log('[Best Sellers Filter - TABLE MODE] Missing products:', missingMatchers.map(m => ({ name: m.name, size: m.size, rank: m.rank })));
        }
        
        return top10;
      }
      return filteredRowsWithSelection;
    }
    
    let result = [...filteredRowsWithSelection];

    // Apply Inventory Popular Filter first: show only the chosen subset (Out of Stock = 0 inventory + has sales; No Sales History = all with zero sales only)
    if (inventoryFilter?.popularFilter === 'soldOut') {
      result = result.filter((row) => {
        const totalInv = Number(row.totalInventory ?? row.total_inventory) || 0;
        const s30 = parseSalesValue(row.sales30Day ?? row.sales_30_day ?? row.units_sold_30_days);
        const s7 = parseSalesValue(row.sales7Day ?? row.sales_7_day ?? row.units_sold_7_days);
        return totalInv === 0 && (s30 > 0 || s7 > 0);
      });
    } else if (inventoryFilter?.popularFilter === 'noSalesHistory') {
      // Show only products with no sales history (all such rows from the current list)
      result = result.filter((row) => hasNoSalesHistory(row));
    }
    // Best Sellers: no row filter here; sort is applied at the end of this useMemo
    
    // Apply non-table filters
    Object.keys(nonTableFilters).forEach(columnKey => {
      const filter = nonTableFilters[columnKey];
      if (!filter) return;

      const numeric = isNonTableNumericColumn(columnKey);

      // Skip value/condition for fbaAvailable when Popular Filter is set (applied at end of useMemo)
      if (columnKey === 'fbaAvailable' && filter.popularFilter) return;

      // Brand filter/sort (for product column)
      if (columnKey === 'product' && filter.selectedBrands && filter.selectedBrands instanceof Set && filter.selectedBrands.size > 0) {
        // Get account-specific brands to check if all are selected
        const accountBrands = account && ACCOUNT_BRAND_MAPPING[account] 
          ? ACCOUNT_BRAND_MAPPING[account]
          : ACCOUNT_BRAND_MAPPING['TPS Nutrients'];
        
        // Check if all brands for this account are selected
        const allBrandsSelected = filter.selectedBrands.size === accountBrands.length &&
          accountBrands.every(brand => filter.selectedBrands.has(brand));
        
        // Helper function to check if a brand matches any selected brand
        const isBrandChecked = (brandValue) => {
          return Array.from(filter.selectedBrands).some(selectedBrand => {
            const selectedBrandLower = selectedBrand.toLowerCase().trim();
            const brandValueLower = brandValue.toLowerCase();
            
            // Normalize both strings (remove spaces around +, handle variations)
            const normalizeBrand = (str) => str.replace(/\s*\+\s*/g, '+').replace(/\s+/g, ' ').trim();
            const normalizedSelected = normalizeBrand(selectedBrandLower);
            const normalizedValue = normalizeBrand(brandValueLower);
            
            // Exact match or contains match (handles variations like "Mint +" vs "Mint+")
            return normalizedValue === normalizedSelected ||
                   normalizedValue.includes(normalizedSelected) ||
                   normalizedSelected.includes(normalizedValue) ||
                   brandValueLower === selectedBrandLower ||
                   brandValueLower.includes(selectedBrandLower) ||
                   selectedBrandLower.includes(brandValueLower);
          });
        };
        
        // In non-table mode: Filter to show ONLY products from checked brands
        // If all brands are selected, show all products (no filtering needed)
        // If not all brands are selected, filter to show only products from checked brands
        // The brand checkboxes in the dropdown remain visible even when unchecked (handled by dropdown component)
        if (!allBrandsSelected) {
          result = result.filter(row => {
            const brandValue = (row.brand || '').trim();
            // If no brand value, don't show the product
            if (!brandValue) return false;
            // Show only products from checked brands
            return isBrandChecked(brandValue);
          });
        }
        // If allBrandsSelected is true, don't filter - show all products
      }

      // Value filters
      if (filter.selectedValues && filter.selectedValues.size > 0) {
        result = result.filter((row, idx) => {
          // For product column, check product name, brand, and size
          if (columnKey === 'product') {
            return filter.selectedValues.has(row.product) || 
                   filter.selectedValues.has(String(row.product)) ||
                   filter.selectedValues.has(row.brand) || 
                   filter.selectedValues.has(String(row.brand)) ||
                   filter.selectedValues.has(row.size) || 
                   filter.selectedValues.has(String(row.size));
          }
          
          let value;
          if (columnKey === 'brand') value = row.brand;
          else if (columnKey === 'size') value = row.size;
          else if (columnKey === 'fbaAvailable') value = row.fbaAvailable || 0;
          else if (columnKey === 'unitsToMake') {
            // Units to Make filter: Added | Not Added (based on addedRows)
            const isAdded = addedRows.has(row.id);
            if (filter.selectedValues.has('Added') && filter.selectedValues.has('Not Added')) return true;
            if (filter.selectedValues.has('Added')) return isAdded;
            if (filter.selectedValues.has('Not Added')) return !isAdded;
            return false;
          }
          else if (columnKey === 'doiDays') value = row.doiTotal || row.daysOfInventory || 0;
          
          return (
            filter.selectedValues.has(value) ||
            filter.selectedValues.has(String(value))
          );
        });
      }

      // Condition filters
      if (filter.conditionType) {
        result = result.filter((row, idx) => {
          // For product column, search across product name, brand, and size
          if (columnKey === 'product') {
            const productMatch = applyNonTableConditionFilter(
              row.product,
              filter.conditionType,
              filter.conditionValue,
              false
            );
            const brandMatch = applyNonTableConditionFilter(
              row.brand,
              filter.conditionType,
              filter.conditionValue,
              false
            );
            const sizeMatch = applyNonTableConditionFilter(
              row.size,
              filter.conditionType,
              filter.conditionValue,
              false
            );
            return productMatch || brandMatch || sizeMatch;
          }
          
          let value;
          if (columnKey === 'brand') value = row.brand;
          else if (columnKey === 'size') value = row.size;
          else if (columnKey === 'fbaAvailable') value = row.fbaAvailable || 0;
          else if (columnKey === 'unitsToMake') {
            value = addedRows.has(row.id) ? 'Added' : 'Not Added';
          }
          else if (columnKey === 'doiDays') value = row.doiTotal || row.daysOfInventory || 0;
          
          return applyNonTableConditionFilter(
            value,
            filter.conditionType,
            filter.conditionValue,
            numeric
          );
        });
      }
    });

    // Apply non-table sorting - use stored order if available (one-time sort)
    if (nonTableSortedRowOrder && nonTableSortedRowOrder.length > 0 && inventoryFilter?.popularFilter !== 'bestSellers') {
      // Create a map of row ID to row for quick lookup
      const rowMap = new Map(result.map(row => [row.id, row]));
      
      // Reorder result based on stored order
      const orderedResult = [];
      const processedIds = new Set();
      
      // First, add rows in the stored order
      nonTableSortedRowOrder.forEach(id => {
        if (rowMap.has(id)) {
          orderedResult.push(rowMap.get(id));
          processedIds.add(id);
        }
      });
      
      // Then, add any new rows that weren't in the original sort (e.g., newly added rows)
      result.forEach(row => {
        if (!processedIds.has(row.id)) {
          orderedResult.push(row);
        }
      });
      
      result = orderedResult;
    } else if (!tableMode && nonTableSortField === '' && !inventoryFilter?.popularFilter) {
      // Default view for non-table mode when no sort/filter is applied:
      // 1. Out of Stock products (DOI = 0) at the top
      // 2. Other products sorted by DOI ascending (low DOI first)
      // 3. No Sales History products at the bottom
      result = [...result].sort((a, b) => {
        const aDOI = a.doiTotal || a.daysOfInventory || 0;
        const bDOI = b.doiTotal || b.daysOfInventory || 0;
        const aTotalInv = Number(a.totalInventory ?? a.total_inventory) || 0;
        const bTotalInv = Number(b.totalInventory ?? b.total_inventory) || 0;
        const aIsOutOfStock = aTotalInv === 0;
        const bIsOutOfStock = bTotalInv === 0;
        const aIsNoSales = hasNoSalesHistory(a);
        const bIsNoSales = hasNoSalesHistory(b);
        
        // Out of Stock products (DOI = 0) at the top
        if (aIsOutOfStock && !bIsOutOfStock) return -1;
        if (!aIsOutOfStock && bIsOutOfStock) return 1;
        
        // No Sales History products at the bottom (but after Out of Stock)
        if (aIsNoSales && !bIsNoSales) return 1;
        if (!aIsNoSales && bIsNoSales) return -1;
        
        // Sort by DOI ascending (low DOI first) for remaining products
        return aDOI - bDOI;
      });
    }

    // Best Sellers: show ONLY the specific top 10 products from last week's report
    if (inventoryFilter?.popularFilter === 'bestSellers' && result.length > 0) {
      console.log('[Best Sellers Filter] Total rows before filter:', result.length);
      
      // Helper functions to match product names and sizes
      const pl = (r) => String(r.product || '').toLowerCase();
      const sz = (r) => String(r.size || '').toLowerCase().replace(/\s/g, '');
      
      // Define the exact top 10 products from last week's report (in order)
      const top10Matchers = [
        { name: 'liquid plant food', size: '8oz', rank: 1 },
        { name: 'indoor plant food', size: '8oz', rank: 2 },
        { name: 'monstera plant food', size: '8oz', rank: 3 },
        { name: 'christmas cactus fertilizer', size: '8oz', rank: 4 },
        { name: 'fiddle leaf fig plant food', size: '8oz', rank: 5 },
        { name: 'lemon tree fertilizer', size: '8oz', rank: 6 },
        { name: 'cleankelp seaweed fertilizer', size: 'quart', rank: 7 },
        { name: 'orchid fertilizer', size: '8oz', rank: 8 },
        { name: 'silica gold', size: 'quart', rank: 9 },
        { name: 'ph kit', size: '8ozkit', rank: 10 } // "8oz Kit" becomes "8ozkit" when spaces removed
      ];
      
      // Match each product in the list to a rank (if it's in the top 10)
      const matchedProducts = result.map((r) => {
        const pName = pl(r);
        const pSize = sz(r);
        const match = top10Matchers.find(m => {
          const nameMatch = pName.includes(m.name);
          const sizeMatch = pSize.includes(m.size) || pSize === m.size;
          return nameMatch && sizeMatch;
        });
        return { row: r, rank: match ? match.rank : null };
      }).filter(item => item.rank !== null); // Only keep top 10 products
      
      // Sort by rank (1, 2, 3, ...)
      matchedProducts.sort((a, b) => a.rank - b.rank);
      
      const top10 = matchedProducts.map(item => item.row);
      console.log('[Best Sellers Filter] Matched ' + top10.length + ' products:', top10.map(r => ({ product: r.product, size: r.size })));
      
      // Log which matchers didn't find a match
      const matchedRanks = new Set(matchedProducts.map(m => m.rank));
      const missingMatchers = top10Matchers.filter(m => !matchedRanks.has(m.rank));
      if (missingMatchers.length > 0) {
        console.log('[Best Sellers Filter] Missing products:', missingMatchers.map(m => ({ name: m.name, size: m.size, rank: m.rank })));
      }
      
      result = top10;
    }

    return result;
  }, [filteredRowsWithSelection, nonTableFilters, nonTableSortedRowOrder, tableMode, account, addedRows]);

  // When Best Sellers is active, always use nonTableFilteredRows (sorted); otherwise table mode uses filteredRowsWithSelection
  const currentRows = (tableMode && nonTableFilters.fbaAvailable?.popularFilter !== 'bestSellers')
    ? filteredRowsWithSelection
    : nonTableFilteredRows;

  // "BEST SELLER" badge: only for Liquid Plant Food 8oz and Indoor Plant Food 8oz (per last week's report)
  const topSellerIds = useMemo(() => {
    if (!filteredRowsWithSelection || filteredRowsWithSelection.length === 0) return new Set();
    const productLower = (r) => String(r.product || '').toLowerCase();
    const sizeStr = (r) => String(r.size || '').toLowerCase().replace(/\s/g, '');
    const isLiquidPlantFood8oz = (r) => productLower(r).includes('liquid plant food') && (sizeStr(r).includes('8oz') || sizeStr(r) === '8oz');
    const isIndoorPlantFood8oz = (r) => productLower(r).includes('indoor plant food') && (sizeStr(r).includes('8oz') || sizeStr(r) === '8oz');
    const isTopTwoProduct = (r) => isLiquidPlantFood8oz(r) || isIndoorPlantFood8oz(r);
    const candidates = filteredRowsWithSelection.filter((r) => {
      if (!isTopTwoProduct(r)) return false;
      const s30 = Number(r.sales30Day ?? r.sales_30_day ?? r.units_sold_30_days ?? 0) || 0;
      const s7 = Number(r.sales7Day ?? r.sales_7_day ?? r.units_sold_7_days ?? 0) || 0;
      return s30 > 0 || s7 > 0;
    });
    const sorted = [...candidates].sort((a, b) => {
      const a7 = Number(a.sales7Day ?? a.sales_7_day ?? a.units_sold_7_days ?? 0) || 0;
      const b7 = Number(b.sales7Day ?? b.sales_7_day ?? b.units_sold_7_days ?? 0) || 0;
      if (b7 !== a7) return b7 - a7;
      const a30 = Number(a.sales30Day ?? a.sales_30_day ?? a.units_sold_30_days ?? 0) || 0;
      const b30 = Number(b.sales30Day ?? b.sales_30_day ?? b.units_sold_30_days ?? 0) || 0;
      if (b30 !== a30) return b30 - a30;
      return String(a.product || '').localeCompare(String(b.product || ''));
    });
    const topN = Math.min(2, sorted.length);
    return new Set(sorted.slice(0, topN).map((r) => r.id).filter(Boolean));
  }, [filteredRowsWithSelection]);

  // Ensure Units to Make inputs always default to forecast values when empty.
  // This runs for both table and non-table modes and initializes qtyValues
  // anywhere a product has a suggested forecast (suggestedQty / units_to_make)
  // but the qty entry is still blank.
  // Use ref for setter and only depend on rowsSignature so we don't re-run when
  // parent re-renders and passes a new rows array reference (which would cause an infinite loop).
  useEffect(() => {
    if (!rows || rows.length === 0 || !rowsSignature) return;
    const setQty = effectiveSetQtyValuesRef.current;
    if (!setQty) return;

    setQty(prev => {
      const baseValues = prev || {};
      const newValues = { ...baseValues };
      let changed = false;

      rows.forEach((row, arrayIndex) => {
        const index = row._originalIndex !== undefined ? row._originalIndex : arrayIndex;

        const existing = newValues[index];
        const hasExisting =
          existing !== undefined &&
          existing !== null &&
          !(typeof existing === 'string' && existing.trim() === '');

        if (hasExisting) return;

        const suggested =
          row.suggestedQty ||
          row.units_to_make ||
          row.unitsToMake ||
          0;

        if (suggested > 0) {
          newValues[index] = suggested;
          changed = true;
        }
      });

      return changed ? newValues : prev;
    });
  }, [rowsSignature]);

  // Normalize existing qty values for case-based sizes (8oz, 6oz, 1/2 lb, 1 lb,
  // quarts, gallons, etc.), rounding *up* to the nearest increment, but only
  // for values the user has not manually edited.
  // Use ref for setter and only depend on rowsSignature to avoid infinite loop
  // when parent re-renders and passes a new rows array reference.
  useEffect(() => {
    if (!rows || rows.length === 0 || !rowsSignature) return;
    const setQty = effectiveSetQtyValuesRef.current;
    if (!setQty) return;

    setQty(prev => {
      const baseValues = prev || {};
      const newValues = { ...baseValues };
      let changed = false;

      rows.forEach((row, arrayIndex) => {
        const index = row._originalIndex !== undefined ? row._originalIndex : arrayIndex;

        // Don't touch values the user has manually edited
        if (manuallyEditedIndices.current.has(index)) return;

        const raw = newValues[index];
        if (raw === undefined || raw === null || raw === '') return;

        const num = typeof raw === 'number' ? raw : parseInt(raw, 10);
        if (!num || isNaN(num) || num <= 0) return;

        const increment = getQtyIncrement(row);
        if (!increment || increment <= 1) return;

        const rounded = Math.ceil(num / increment) * increment;
        if (rounded !== num) {
          newValues[index] = rounded;
          changed = true;
        }
      });

      return changed ? newValues : prev;
    });
  }, [rowsSignature]);

  // Helper: determine step size for qty increments
  const getQtyIncrement = (row) => {
    const sizeRaw = row?.size || '';
    const size = sizeRaw.toLowerCase();
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

  // Keyboard support for bulk increase/decrease (non-table mode)
  useEffect(() => {
    if (tableMode || nonTableSelectedIndices.size === 0) {
      return; // Only handle in non-table mode with selections
    }

    const handleKeyDown = (e) => {
      // Don't handle if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault(); // Prevent page scrolling
        
        const isIncrease = e.key === 'ArrowUp';
        
        effectiveSetQtyValues(prev => {
          const newValues = { ...prev };
          nonTableSelectedIndices.forEach(selectedIndex => {
            const selectedRow = currentRows.find(r => r._originalIndex === selectedIndex);
            if (selectedRow) {
              const currentQty = newValues[selectedIndex] ?? 0;
              const numQty = typeof currentQty === 'number' ? currentQty : parseInt(currentQty, 10) || 0;
              
              // Use size-based increment (e.g. 60 units for 8oz)
              const increment = getQtyIncrement(selectedRow);
              
              if (isIncrease) {
                newValues[selectedIndex] = numQty + increment;
              } else {
                if (numQty > 0) {
                  newValues[selectedIndex] = Math.max(0, numQty - increment);
                }
              }
              manuallyEditedIndices.current.add(selectedIndex);
            }
          });
          return newValues;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [tableMode, nonTableSelectedIndices, currentRows.length, effectiveSetQtyValues]);

  // Ctrl+Z (undo) and Ctrl+Y / Ctrl+Shift+Z (redo) for Add Products
  useEffect(() => {
    if (!onAddProductsUndo && !onAddProductsRedo) return;

    const handleKeyDown = (e) => {
      // Don't steal shortcuts when user is typing in an input/textarea
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return;

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      if (!isCtrlOrCmd) return;

      const k = e.key?.toLowerCase();
      if (k === 'z') {
        if (e.shiftKey) {
          // Ctrl+Shift+Z → Redo
          if (onAddProductsRedo && addProductsRedoStackLength > 0) {
            e.preventDefault();
            e.stopPropagation();
            onAddProductsRedo();
          }
        } else {
          // Ctrl+Z → Undo
          if (onAddProductsUndo && addProductsUndoStackLength > 0) {
            e.preventDefault();
            e.stopPropagation();
            onAddProductsUndo();
          }
        }
      } else if (k === 'y' && !e.shiftKey) {
        // Ctrl+Y → Redo
        if (onAddProductsRedo && addProductsRedoStackLength > 0) {
          e.preventDefault();
          e.stopPropagation();
          onAddProductsRedo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [onAddProductsUndo, onAddProductsRedo, addProductsUndoStackLength, addProductsRedoStackLength]);

  // Handle clicks outside the product list to deselect products (non-table mode)
  useEffect(() => {
    if (tableMode || nonTableSelectedIndices.size === 0) {
      return; // Only handle in non-table mode with selections
    }

    const handleClickOutside = (e) => {
      // Check if click is on a filter icon (don't deselect when opening filters)
      const clickedOnNonTableFilterIcon = Object.values(nonTableFilterIconRefs.current).some(
        ref => ref && ref.contains && ref.contains(e.target)
      );
      
      // Check if click is inside the filter dropdown
      const clickedInsideNonTableFilterDropdown = 
        (nonTableFilterDropdownRef.current && nonTableFilterDropdownRef.current.contains && nonTableFilterDropdownRef.current.contains(e.target)) ||
        e.target.closest('[data-filter-dropdown]');
      
      // Check if click is outside the product list container
      if (
        nonTableContainerRef.current &&
        !nonTableContainerRef.current.contains(e.target) &&
        !clickedOnNonTableFilterIcon &&
        !clickedInsideNonTableFilterDropdown &&
        // Don't deselect if clicking on modals or other overlays
        !e.target.closest('[data-modal]')
      ) {
        setNonTableSelectedIndices(new Set());
        setNonTableLastSelectedIndex(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [tableMode, nonTableSelectedIndices.size]);

  // Check if all rows are selected (respect current view/filter)
  const allSelected = useMemo(() => {
    return currentRows.length > 0 && selectedRows.size === currentRows.length;
  }, [currentRows.length, selectedRows.size]);

  // Check if some rows are selected (for indeterminate state)
  const someSelected = useMemo(() => {
    return selectedRows.size > 0 && selectedRows.size < currentRows.length;
  }, [selectedRows.size, currentRows.length]);

  // Set indeterminate state for select all checkbox
  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  // Function to position the popup - instant updates, no lag
  const positionPopup = useCallback(() => {
    if (clickedQtyIndex !== null) {
      // Try to use warning icon ref first (for non-table mode), fallback to qtyContainer
      const warningIcon = warningIconRefs.current[clickedQtyIndex];
      const qtyContainer = qtyContainerRefs.current[clickedQtyIndex];
      const popup = popupRefs.current[clickedQtyIndex];
      
      const targetElement = warningIcon || qtyContainer;
      
      if (targetElement && popup) {
        // Get current position of the icon relative to viewport
        const rect = targetElement.getBoundingClientRect();
        // Position below the warning icon or container, moved 110px higher total
        const top = rect.bottom - 106;
        const left = rect.left + rect.width / 2;
        
        // Update immediately - direct DOM manipulation for zero lag
        popup.style.position = 'fixed';
        popup.style.top = `${top}px`;
        popup.style.left = `${left}px`;
        popup.style.transform = 'translateX(-50%)';
      }
    }
  }, [clickedQtyIndex]);

  // Position popup when it appears
  useEffect(() => {
    positionPopup();
  }, [positionPopup]);

  // Update popup position on scroll and resize - continuous RAF loop for zero lag
  useEffect(() => {
    if (clickedQtyIndex !== null) {
      let rafId = null;
      let isActive = true;
      
      // Continuous update loop using requestAnimationFrame
      const updateLoop = () => {
        if (isActive && clickedQtyIndex !== null) {
          positionPopup();
          rafId = requestAnimationFrame(updateLoop);
        }
      };
      
      // Start the continuous update loop
      rafId = requestAnimationFrame(updateLoop);
      
      // Also update immediately on scroll/resize events for instant response
      const handleScroll = () => {
        if (isActive) {
          positionPopup();
        }
      };
      
      const handleResize = () => {
        if (isActive) {
          positionPopup();
        }
      };
      
      // Add event listeners to window and all scrollable parents
      // Use capture phase to catch all scroll events (including nested scrollable elements)
      window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
      window.addEventListener('resize', handleResize);
      
      // Also listen to scroll on any scrollable parent containers
      const scrollableParents = document.querySelectorAll('[data-table-container], .scrollable, [style*="overflow"]');
      scrollableParents.forEach(parent => {
        parent.addEventListener('scroll', handleScroll, { capture: true, passive: true });
      });
      
      return () => {
        isActive = false;
        if (rafId) {
          cancelAnimationFrame(rafId);
        }
        window.removeEventListener('scroll', handleScroll, { capture: true, passive: true });
        window.removeEventListener('resize', handleResize);
        scrollableParents.forEach(parent => {
          parent.removeEventListener('scroll', handleScroll, { capture: true, passive: true });
        });
      };
    }
  }, [clickedQtyIndex, positionPopup]);

  // Position Add button popup when it appears
  useEffect(() => {
    if (hoveredAddIndex !== null) {
      const addButton = addButtonRefs.current[hoveredAddIndex];
      const popup = addPopupRefs.current[hoveredAddIndex];
      if (addButton && popup) {
        const rect = addButton.getBoundingClientRect();
        const popupHeight = popup.offsetHeight || 100;
        const top = rect.bottom + 8;
        const left = rect.left + rect.width / 2;
        popup.style.top = `${top}px`;
        popup.style.left = `${left}px`;
        popup.style.transform = 'translateX(-50%)';
        
        // Update position on scroll/resize
        const updatePosition = () => {
          if (addButton && popup) {
            const newRect = addButton.getBoundingClientRect();
            const newTop = newRect.bottom + 8;
            const newLeft = newRect.left + newRect.width / 2;
            popup.style.top = `${newTop}px`;
            popup.style.left = `${newLeft}px`;
          }
        };
        
        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);
        
        return () => {
          window.removeEventListener('scroll', updatePosition, true);
          window.removeEventListener('resize', updatePosition);
        };
      }
    }
  }, [hoveredAddIndex]);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (clickedQtyIndex !== null) {
        const qtyContainer = qtyContainerRefs.current[clickedQtyIndex];
        const popup = popupRefs.current[clickedQtyIndex];
        
        // Check if click is outside both the QTY container and the popup
        if (qtyContainer && popup) {
          const isClickInsideQty = qtyContainer.contains(event.target);
          const isClickInsidePopup = popup.contains(event.target);
          
          // Only close if click is truly outside
          if (!isClickInsideQty && !isClickInsidePopup) {
            setClickedQtyIndex(null);
          }
        }
      }
    };

    if (clickedQtyIndex !== null) {
      // Use a timeout to add listener after current event cycle completes
      const timeoutId = setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);
      
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [clickedQtyIndex]);

  // Position filter modal when it appears
  useEffect(() => {
    if (openFilterIndex !== null) {
      const filterButton = filterRefs.current[openFilterIndex];
      const filterModal = filterModalRefs.current[openFilterIndex];
      
      if (filterButton && filterModal) {
        const rect = filterButton.getBoundingClientRect();
        const dropdownWidth = 228;
        const dropdownHeight = 265;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        let left = rect.left;
        let top = rect.bottom + 8;
        
        // Adjust if dropdown goes off right edge
        if (left + dropdownWidth > viewportWidth) {
          left = viewportWidth - dropdownWidth - 16;
        }
        
        // Adjust if dropdown goes off bottom
        if (top + dropdownHeight > viewportHeight) {
          top = rect.top - dropdownHeight - 8;
        }
        
        // Don't go off left edge
        if (left < 16) {
          left = 16;
        }
        
        // Don't go off top edge
        if (top < 16) {
          top = 16;
        }
        
        filterModal.style.top = `${top}px`;
        filterModal.style.left = `${left}px`;
      }
    }
  }, [openFilterIndex]);

  // Close filter modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openFilterIndex !== null) {
        const filterButton = filterRefs.current[openFilterIndex];
        const filterModal = filterModalRefs.current[openFilterIndex];
        
        if (filterButton && filterModal) {
          const isClickInsideButton = filterButton.contains(event.target);
          const isClickInsideModal = filterModal.contains(event.target);
          
          if (!isClickInsideButton && !isClickInsideModal) {
            setOpenFilterIndex(null);
          }
        }
      }
    };

    if (openFilterIndex !== null) {
      const timeoutId = setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);
      
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [openFilterIndex]);

  // Handle select all checkbox
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const selectedIds = new Set();
      const addedIds = new Set();
      
      // Only select/add rows with non-zero quantity
      currentRows.forEach(row => {
        const index = row._originalIndex;
        const currentQty = typeof effectiveQtyValues[index] === 'number' 
          ? effectiveQtyValues[index] 
          : (effectiveQtyValues[index] === '' || effectiveQtyValues[index] === null || effectiveQtyValues[index] === undefined) 
            ? 0 
            : parseInt(effectiveQtyValues[index], 10) || 0;
        
        if (currentQty > 0) {
          selectedIds.add(row.id);
          if (tableMode) {
            addedIds.add(row.id);
          }
        }
      });
      
      setSelectedRows(selectedIds);
      if (tableMode) {
        setAddedRows(addedIds);
        if (onAddedRowsChange) onAddedRowsChange(addedIds);
      }
      
      // Update checkbox state if not all rows were selected
      if (selectAllCheckboxRef.current && selectedIds.size < currentRows.length) {
        selectAllCheckboxRef.current.indeterminate = selectedIds.size > 0;
        selectAllCheckboxRef.current.checked = false;
      }
    } else {
      setSelectedRows(new Set());
      if (tableMode) {
        const newAdded = new Set();
        setAddedRows(newAdded);
        if (onAddedRowsChange) onAddedRowsChange(newAdded);
      }
    }
  };

  // Handle individual row checkbox
  const handleRowSelect = (rowId, e) => {
    const newSelected = new Set(selectedRows);
    if (e.target.checked) {
      newSelected.add(rowId);
    } else {
      newSelected.delete(rowId);
    }
    setSelectedRows(newSelected);

    if (tableMode) {
      const newAdded = new Set(addedRows);
      if (e.target.checked) {
        // Find the row index to check quantity
        const rowIndex = currentRows.findIndex(r => r.id === rowId);
        if (rowIndex >= 0) {
          const row = currentRows[rowIndex];
          const index = row._originalIndex;
          // Check if quantity is 0 before adding
          const currentQty = typeof effectiveQtyValues[index] === 'number' 
            ? effectiveQtyValues[index] 
            : (effectiveQtyValues[index] === '' || effectiveQtyValues[index] === null || effectiveQtyValues[index] === undefined) 
              ? 0 
              : parseInt(effectiveQtyValues[index], 10) || 0;
          
          if (currentQty === 0) {
            // Don't add if quantity is 0 - revert checkbox
            e.target.checked = false;
            newSelected.delete(rowId);
            setSelectedRows(newSelected);
            return;
          }
        }
        newAdded.add(rowId);
      } else {
        newAdded.delete(rowId);
      }
      setAddedRows(newAdded);
      if (onAddedRowsChange) onAddedRowsChange(newAdded);
    }
  };

  // Handle row mousedown to prevent text selection on Shift+Click
  const handleNonTableRowMouseDown = (e, arrayIndex, originalIndex) => {
    // Don't prevent if clicking on interactive elements
    // Exclude checkboxes specifically to allow checkbox selection
    if (
      e.target.closest('button') || 
      (e.target.closest('input') && e.target.type !== 'checkbox') ||
      e.target.type === 'checkbox'
    ) {
      return;
    }

    // Prevent text selection on Shift+Click
    if (e.shiftKey) {
      e.preventDefault();
      // Also prevent text selection via CSS
      if (window.getSelection) {
        window.getSelection().removeAllRanges();
      }
    }
  };

  // Handle row click for multi-select (non-table mode)
  // arrayIndex is the position in currentRows (0, 1, 2...), originalIndex is row._originalIndex for qty operations
  const handleNonTableRowClick = (e, arrayIndex, originalIndex) => {
    // Don't handle selection if clicking on interactive elements
    // Exclude checkboxes specifically to allow checkbox selection
    if (
      e.target.closest('button') || 
      (e.target.closest('input') && e.target.type !== 'checkbox') ||
      e.target.type === 'checkbox'
    ) {
      return;
    }

    const isShiftClick = e.shiftKey;
    const isCmdClick = e.metaKey || e.ctrlKey;

    // Prevent text selection on Shift+Click
    if (isShiftClick) {
      e.preventDefault();
      // Clear any existing text selection
      if (window.getSelection) {
        window.getSelection().removeAllRanges();
      }
    }

    if (isShiftClick && nonTableLastSelectedIndex !== null) {
      // Shift + Click: Select range between lastSelectedIndex and current arrayIndex
      const start = Math.min(nonTableLastSelectedIndex, arrayIndex);
      const end = Math.max(nonTableLastSelectedIndex, arrayIndex);
      const newSelected = new Set(nonTableSelectedIndices);
      
      // Add all rows in the range by their array positions
      for (let i = start; i <= end; i++) {
        if (i < currentRows.length) {
          const rowAtPosition = currentRows[i];
          newSelected.add(rowAtPosition._originalIndex);
        }
      }
      
      setNonTableSelectedIndices(newSelected);
      setNonTableLastSelectedIndex(arrayIndex);
    } else if (isCmdClick) {
      // Cmd/Ctrl + Click: Toggle selection of this item
      const newSelected = new Set(nonTableSelectedIndices);
      if (newSelected.has(originalIndex)) {
        newSelected.delete(originalIndex);
      } else {
        newSelected.add(originalIndex);
      }
      setNonTableSelectedIndices(newSelected);
      setNonTableLastSelectedIndex(arrayIndex);
    } else {
      // Regular click: Select only this item (modal opens on double-click)
      setNonTableSelectedIndices(new Set([originalIndex]));
      setNonTableLastSelectedIndex(arrayIndex);
    }
  };

  // Handle checkbox click for multi-select (non-table mode)
  // Supports Shift+Click and Cmd+Click for bulk selection
  const handleNonTableCheckboxClick = (e, arrayIndex, originalIndex) => {
    e.stopPropagation(); // Prevent triggering row click handler
    
    const isShiftClick = e.shiftKey;
    const isCmdClick = e.metaKey || e.ctrlKey;
    const wasChecked = nonTableSelectedIndices.has(originalIndex);
    const willBeChecked = e.target.checked;

    // Prevent text selection on Shift+Click
    if (isShiftClick) {
      e.preventDefault();
      // Clear any existing text selection
      if (window.getSelection) {
        window.getSelection().removeAllRanges();
      }
    }

    if (isShiftClick && nonTableLastSelectedIndex !== null) {
      // Shift + Click: Select range between lastSelectedIndex and current arrayIndex
      // Always select the entire range (standard Shift+Click behavior)
      const start = Math.min(nonTableLastSelectedIndex, arrayIndex);
      const end = Math.max(nonTableLastSelectedIndex, arrayIndex);
      const newSelected = new Set(nonTableSelectedIndices);
      
      // Add all rows in the range by their array positions
      for (let i = start; i <= end; i++) {
        if (i < currentRows.length) {
          const rowAtPosition = currentRows[i];
          newSelected.add(rowAtPosition._originalIndex);
        }
      }
      
      setNonTableSelectedIndices(newSelected);
      setNonTableLastSelectedIndex(arrayIndex);
    } else if (isCmdClick) {
      // Cmd/Ctrl + Click: Toggle selection of this item
      const newSelected = new Set(nonTableSelectedIndices);
      if (willBeChecked) {
        newSelected.add(originalIndex);
      } else {
        newSelected.delete(originalIndex);
      }
      setNonTableSelectedIndices(newSelected);
      setNonTableLastSelectedIndex(arrayIndex);
    } else {
      // Regular click: Select/deselect only this item
      if (willBeChecked) {
        setNonTableSelectedIndices(new Set([originalIndex]));
      } else {
        setNonTableSelectedIndices(new Set());
      }
      setNonTableLastSelectedIndex(arrayIndex);
    }
  };

  // Handle Add button click (with bulk support)
  const handleAddClick = (row, index) => {
    const newAdded = new Set(addedRows);
    
    // In non-table mode, if multiple products are selected, perform bulk add/remove
    if (!tableMode && nonTableSelectedIndices.size > 1 && nonTableSelectedIndices.has(index)) {
      // Determine if we're adding or removing based on the clicked row's state
      const isRemoving = newAdded.has(row.id);
      
      // Apply the action to all selected rows
      nonTableSelectedIndices.forEach(selectedIndex => {
        const selectedRow = currentRows.find(r => r._originalIndex === selectedIndex);
        if (selectedRow) {
          if (isRemoving) {
            // Remove from added - keep the qty value
            newAdded.delete(selectedRow.id);
          } else {
            // Check if quantity is greater than 0 before adding
            let currentQty = typeof effectiveQtyValues[selectedIndex] === 'number' 
              ? effectiveQtyValues[selectedIndex] 
              : (effectiveQtyValues[selectedIndex] === '' || effectiveQtyValues[selectedIndex] === null || effectiveQtyValues[selectedIndex] === undefined) 
                ? 0 
                : parseInt(effectiveQtyValues[selectedIndex], 10) || 0;
            
            // In non-table mode, if quantity is 0, use totalInventory from Ngoos
            if (!tableMode && currentQty === 0 && selectedRow.totalInventory) {
              currentQty = selectedRow.totalInventory;
              // Update the qty value to use totalInventory
              effectiveSetQtyValues(prev => ({ ...prev, [selectedIndex]: currentQty }));
            }
            
            if (currentQty > 0) {
              newAdded.add(selectedRow.id);
            }
          }
        }
      });
    } else {
      // Single product add/remove
      if (newAdded.has(row.id)) {
        // Remove from added - keep the qty value (don't clear it)
        newAdded.delete(row.id);
      } else {
        // Check if quantity is 0 before adding
        let currentQty = typeof effectiveQtyValues[index] === 'number' 
          ? effectiveQtyValues[index] 
          : (effectiveQtyValues[index] === '' || effectiveQtyValues[index] === null || effectiveQtyValues[index] === undefined) 
            ? 0 
            : parseInt(effectiveQtyValues[index], 10) || 0;
        
        // In non-table mode, if quantity is 0, use totalInventory from Ngoos
        if (!tableMode && currentQty === 0 && row.totalInventory) {
          currentQty = row.totalInventory;
          // Update the qty value to use totalInventory
          effectiveSetQtyValues(prev => ({ ...prev, [index]: currentQty }));
        }
        
        if (currentQty === 0) {
          // Don't add if quantity is still 0 after trying to use totalInventory
          return;
        }
        
        // Add - mark as added (qty value already set above if needed)
        newAdded.add(row.id);
      }
    }
    
    // This will update local state and notify parent
    setAddedRows(newAdded);
    if (onAddedRowsChange) onAddedRowsChange(newAdded);
  };

  const themeClasses = {
    cardBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    headerBg: 'bg-[#2C3544]',
  };

  // Helper: DOI number color by days — 0-54 red, 55-89 orange, 90+ green
  const getDoiColor = (doiValue) => {
    const n = Number(doiValue) || 0;
    if (n < 55) return '#EF4444'; // Red
    if (n < 90) return '#F97316'; // Orange
    return '#22C55E'; // Green
  };

  if (!tableMode) {
    // Card/List view layout
    return (
      <>
        {/* Pure CSS hover - fastest possible (browser native) */}
        <style>{`
          .non-table-row[data-selected="true"][data-dark="true"]:hover {
            background-color: #234A6F !important;
          }
          .non-table-row[data-selected="true"][data-dark="false"]:hover {
            background-color: #E3EFFE !important;
          }
          .non-table-row[data-selected="false"]:hover {
            background-color: #1D2933 !important;
          }
          .non-table-row:hover .pencil-icon-hover {
            opacity: 1 !important;
            pointer-events: auto !important;
          }
          .non-table-row:hover .analyze-icon-hover {
            opacity: 1 !important;
            pointer-events: auto !important;
          }
        `}</style>
        <div
          ref={nonTableContainerRef}
          className={`${themeClasses.cardBg} ${themeClasses.border} border rounded-xl shadow-sm`}
          style={{ marginTop: '1.25rem', overflow: 'hidden', borderRadius: '16px' }}
        >
          {/* Header Row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 140px 220px 140px',
              padding: '22px 16px 12px 16px',
              height: '67px',
              backgroundColor: '#1A2235',
              alignItems: 'center',
              gap: '32px',
              position: 'relative'
            }}
          >
            {/* Border line with 30px margin on both sides */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: '30px',
                right: '30px',
                height: '1px',
                backgroundColor: isDarkMode ? '#374151' : '#E5E7EB'
              }}
            />
            <div 
              className="group"
              style={{ 
                fontFamily: 'Inter, sans-serif', 
                fontWeight: 600, 
                fontSize: '12px', 
                textTransform: 'uppercase', 
                color: (hasNonTableActiveFilter('product') || nonTableOpenFilterColumn === 'product') ? '#3B82F6' : (isDarkMode ? '#FFFFFF' : '#111827'), 
                marginLeft: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                position: 'relative'
              }}
            >
              <span>PRODUCTS</span>
              {hasNonTableActiveFilter('product') && (
                <span style={{ 
                  display: 'inline-block',
                  width: '6px', 
                  height: '6px', 
                  borderRadius: '50%', 
                  backgroundColor: '#10B981',
                }} />
              )}
              <img
                ref={(el) => {
                  if (el) nonTableFilterIconRefs.current['product'] = el;
                }}
                src="/assets/Vector (1).png"
                alt="Filter"
                className={`w-3 h-3 transition-opacity cursor-pointer ${
                  hasNonTableActiveFilter('product') || nonTableOpenFilterColumn === 'product'
                    ? 'opacity-100'
                    : 'opacity-0 group-hover:opacity-100'
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setNonTableOpenFilterColumn(prev => prev === 'product' ? null : 'product');
                }}
                style={{
                  width: '12px',
                  height: '12px',
                  ...(hasNonTableActiveFilter('product') || nonTableOpenFilterColumn === 'product'
                    ? {
                        filter:
                          'invert(29%) sepia(94%) saturate(2576%) hue-rotate(199deg) brightness(102%) contrast(105%)',
                      }
                    : undefined)
                }}
              />
            </div>
            <div 
              className="group"
              style={{ 
                fontFamily: 'Inter, sans-serif', 
                fontWeight: 600, 
                fontSize: '12px', 
                textTransform: 'uppercase', 
                color: (hasNonTableActiveFilter('fbaAvailable') || nonTableOpenFilterColumn === 'fbaAvailable') ? '#3B82F6' : (isDarkMode ? '#FFFFFF' : '#111827'), 
                textAlign: 'center', 
                paddingLeft: '16px', 
                marginLeft: '-260px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                position: 'relative'
              }}
            >
              <span>INVENTORY</span>
              {hasNonTableActiveFilter('fbaAvailable') && (
                <span style={{ 
                  display: 'inline-block',
                  width: '6px', 
                  height: '6px', 
                  borderRadius: '50%', 
                  backgroundColor: '#10B981',
                }} />
              )}
              <img
                ref={(el) => {
                  if (el) nonTableFilterIconRefs.current['fbaAvailable'] = el;
                }}
                src="/assets/Vector (1).png"
                alt="Filter"
                className={`w-3 h-3 transition-opacity cursor-pointer ${
                  hasNonTableActiveFilter('fbaAvailable') || nonTableOpenFilterColumn === 'fbaAvailable'
                    ? 'opacity-100'
                    : 'opacity-0 group-hover:opacity-100'
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setNonTableOpenFilterColumn(prev => prev === 'fbaAvailable' ? null : 'fbaAvailable');
                }}
                style={{
                  width: '12px',
                  height: '12px',
                  ...(hasNonTableActiveFilter('fbaAvailable') || nonTableOpenFilterColumn === 'fbaAvailable'
                    ? {
                        filter:
                          'invert(29%) sepia(94%) saturate(2576%) hue-rotate(199deg) brightness(102%) contrast(105%)',
                      }
                    : undefined)
                }}
              />
            </div>
            <div 
              className="group"
              style={{ 
                fontFamily: 'Inter, sans-serif', 
                fontWeight: 600, 
                fontSize: '12px', 
                textTransform: 'uppercase', 
                color: (hasNonTableActiveFilter('unitsToMake') || nonTableOpenFilterColumn === 'unitsToMake') ? '#3B82F6' : (isDarkMode ? '#FFFFFF' : '#111827'), 
                textAlign: 'center', 
                paddingLeft: '16px', 
                marginLeft: '-260px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                position: 'relative'
              }}
            >
              <span>UNITS TO MAKE</span>
              {hasNonTableActiveFilter('unitsToMake') && (
                <span style={{ 
                  display: 'inline-block',
                  width: '6px', 
                  height: '6px', 
                  borderRadius: '50%', 
                  backgroundColor: '#10B981',
                }} />
              )}
              <img
                ref={(el) => {
                  if (el) nonTableFilterIconRefs.current['unitsToMake'] = el;
                }}
                src="/assets/Vector (1).png"
                alt="Filter"
                className={`w-3 h-3 transition-opacity cursor-pointer ${
                  hasNonTableActiveFilter('unitsToMake') || nonTableOpenFilterColumn === 'unitsToMake'
                    ? 'opacity-100'
                    : 'opacity-0 group-hover:opacity-100'
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setNonTableOpenFilterColumn(prev => prev === 'unitsToMake' ? null : 'unitsToMake');
                }}
                style={{
                  width: '12px',
                  height: '12px',
                  ...(hasNonTableActiveFilter('unitsToMake') || nonTableOpenFilterColumn === 'unitsToMake'
                    ? {
                        filter:
                          'invert(29%) sepia(94%) saturate(2576%) hue-rotate(199deg) brightness(102%) contrast(105%)',
                      }
                    : undefined)
                }}
              />
            </div>
            <div 
              className="group"
              style={{ 
                fontFamily: 'Inter, sans-serif', 
                fontWeight: 600, 
                fontSize: '12px', 
                textTransform: 'uppercase', 
                color: (hasNonTableActiveFilter('doiDays') || nonTableOpenFilterColumn === 'doiDays') ? '#3B82F6' : (isDarkMode ? '#FFFFFF' : '#111827'), 
                textAlign: 'center', 
                paddingLeft: '16px', 
                marginLeft: '-275px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                position: 'relative'
              }}
            >
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginLeft: '-130px' }}>
                <span>DAYS OF INVENTORY</span>
                {hasNonTableActiveFilter('doiDays') && (
                  <span style={{ 
                    display: 'inline-block',
                    width: '6px', 
                    height: '6px', 
                    borderRadius: '50%', 
                    backgroundColor: '#10B981',
                  }} />
                )}
                <img
                  ref={(el) => {
                    if (el) nonTableFilterIconRefs.current['doiDays'] = el;
                  }}
                  src="/assets/Vector (1).png"
                  alt="Filter"
                  className={`w-3 h-3 transition-opacity cursor-pointer ${
                    hasNonTableActiveFilter('doiDays') || nonTableOpenFilterColumn === 'doiDays'
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setNonTableOpenFilterColumn(prev => prev === 'doiDays' ? null : 'doiDays');
                  }}
                  style={{
                    width: '12px',
                    height: '12px',
                    ...(hasNonTableActiveFilter('doiDays') || nonTableOpenFilterColumn === 'doiDays'
                      ? {
                          filter:
                            'invert(29%) sepia(94%) saturate(2576%) hue-rotate(199deg) brightness(102%) contrast(105%)',
                        }
                      : undefined)
                  }}
                />
              </div>
              {/* Legend: FBA AVAILABLE and TOTAL INVENTORY as buttons; both can be active to show 2 rows */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', marginLeft: '-160px', marginTop: '-3px' }}>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowFbaBar((prev) => !prev); }}
                  onMouseDown={(e) => e.stopPropagation()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 8px',
                    minHeight: '18px',
                    height: '18px',
                    boxSizing: 'border-box',
                    borderRadius: '4px',
                    border: '1px solid',
                    borderColor: showFbaBar ? '#1A5DA7' : (isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.12)'),
                    cursor: 'pointer',
                    background: showFbaBar ? 'linear-gradient(to right, #1A5DA7, #007AFF)' : (isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'),
                    color: showFbaBar ? '#FFFFFF' : (isDarkMode ? '#9CA3AF' : '#6B7280'),
                    transition: 'background 0.2s, color 0.2s, border-color 0.2s',
                  }}
                  aria-label="Show FBA Available"
                >
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: showFbaBar ? '#22C55E' : '#64758B', flexShrink: 0 }} />
                  FBA AVAILABLE
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowDoiBar((prev) => !prev); }}
                  onMouseDown={(e) => e.stopPropagation()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 8px',
                    minHeight: '18px',
                    height: '18px',
                    boxSizing: 'border-box',
                    borderRadius: '4px',
                    border: '1px solid',
                    borderColor: showDoiBar ? '#1A5DA7' : (isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.12)'),
                    cursor: 'pointer',
                    background: showDoiBar ? 'linear-gradient(to right, #1A5DA7, #007AFF)' : (isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'),
                    color: showDoiBar ? '#FFFFFF' : (isDarkMode ? '#9CA3AF' : '#6B7280'),
                    transition: 'background 0.2s, color 0.2s, border-color 0.2s',
                  }}
                  aria-label="Show Total Inventory"
                >
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: showDoiBar ? '#3B82F6' : '#64758B', flexShrink: 0 }} />
                  TOTAL INVENTORY
                </button>
              </div>
            </div>
          </div>

          {/* Product Rows */}
          <div>
            {currentRows.map((row, arrayIndex) => {
              const index = row._originalIndex !== undefined ? row._originalIndex : arrayIndex;
              const effectiveAddedRows = addedRows;
              const doiValue = row.doiTotal || row.daysOfInventory || 0;
              const isAdded = effectiveAddedRows.has(row.id);
              // Average daily demand: used to project DOI from (total inventory + Units to Make)
              const sales7 = Number(row.sales7Day ?? row.sales_7_day ?? row.units_sold_7_days ?? 0) || 0;
              const sales30 = Number(row.sales30Day ?? row.sales_30_day ?? row.units_sold_30_days ?? 0) || 0;
              const avgDailyDemand = sales7 > 0 ? sales7 / 7 : (sales30 > 0 ? sales30 / 30 : 0);
              const totalInventory = Number(row.totalInventory ?? row.total_inventory ?? 0) || 0;
              const currentQtyForDoi = (() => {
                const q = effectiveQtyValues[index];
                if (q === undefined || q === null || q === '') return 0;
                return typeof q === 'number' ? q : (parseInt(q, 10) || 0);
              })();
              // When added: Units to Make is the suggested value from required DOI. Display DOI = projected
              // days of inventory after adding that quantity: (total inventory + Units to Make) / daily demand.
              const effectiveDemand = avgDailyDemand > 0 ? avgDailyDemand : 10;
              const displayDoi = (() => {
                if (!isAdded) return doiValue;
                const projectedInventory = totalInventory + currentQtyForDoi;
                const calculatedDoi = Math.floor(projectedInventory / effectiveDemand);
                return Math.max(0, calculatedDoi);
              })();
              const doiColor = getDoiColor(displayDoi);
              const asin = row.asin || row.child_asin || row.childAsin || '';
              
              const isSelected = nonTableSelectedIndices.has(index);
              
              // Check if product has custom DOI settings (different from general settings)
              const hasCustomDoiSettings = row.customDoiSettings || row.hasCustomDoi || false;
              // Check if product has custom forecast settings
              const hasCustomForecastSettings = row.hasCustomForecastSettings || false;
              
              // Check if this specific product's DOI value has changed from its original value
              const productId = row.id || row.asin || row.child_asin || row.childAsin;
              const originalDoi = productId ? originalDoiValues.current[productId] : undefined;
              const currentDoi = doiValue;
              const hasDoiChanged = originalDoi !== undefined && originalDoi !== currentDoi;
              const originalQtyValueForRow = getStoredOriginalQtyValue(productId, index);
              
              // Determine if pencil should be in "active" (blue) state.
              // This is true whenever the product has custom DOI or forecast settings,
              // regardless of table vs non-table mode.
              const isPencilActive = hasCustomDoiSettings || hasCustomForecastSettings;
              
              // Determine if pencil should be permanently visible.
              // - Non-table (card) mode:
              //     - Default: pencil only shows on hover (CSS handles this).
              //     - When active (blue): always visible, even without hover.
              // - Table mode:
              //     - Keep pencil visible when DOI changed or there are custom settings.
              const shouldShowPencilPermanently =
                (tableMode && (hasDoiChanged || isPencilActive)) ||
                (!tableMode && isPencilActive);
              
              return (
                <div
                  key={`${row.id}-${index}`}
                  onMouseDown={(e) => {
                    // Only handle mousedown if not clicking on interactive elements
                    // Exclude checkboxes specifically to allow checkbox selection
                    if (
                      e.target.type !== 'checkbox' &&
                      !e.target.closest('input[type="checkbox"]') &&
                      !e.target.closest('button') &&
                      !e.target.closest('img[alt="Copy"]')
                    ) {
                      handleNonTableRowMouseDown(e, arrayIndex, index);
                    }
                  }}
                  onClick={(e) => {
                    // Only handle selection if not clicking on interactive elements
                    // Exclude checkboxes specifically to allow checkbox selection
                    if (
                      e.target.type !== 'checkbox' &&
                      !e.target.closest('input[type="checkbox"]') &&
                      !e.target.closest('button') &&
                      !e.target.closest('img[alt="Copy"]')
                    ) {
                      // Track click time for slow double click detection
                      const currentTime = Date.now();
                      lastClickTimeRef.current[index] = currentTime;
                      
                      handleNonTableRowClick(e, arrayIndex, index);
                    }
                  }}
                  onDoubleClick={(e) => {
                    // Check if clicking on interactive elements
                    if (
                      e.target.closest('input') ||
                      e.target.closest('button') ||
                      e.target.closest('img[alt="Copy"]')
                    ) {
                      return;
                    }

                    const currentTime = Date.now();
                    const lastClickTime = lastClickTimeRef.current[index] || 0;
                    const timeBetweenClicks = currentTime - lastClickTime;
                    
                    // Update last click time
                    lastClickTimeRef.current[index] = currentTime;
                    
                    // Slow double click: time between clicks > 500ms
                    if (timeBetweenClicks > 500 && timeBetweenClicks < 2000) {
                      // Remove highlight by deselecting the row
                      const newSelected = new Set(nonTableSelectedIndices);
                      if (newSelected.has(index)) {
                        newSelected.delete(index);
                        setNonTableSelectedIndices(newSelected);
                      }
                      e.preventDefault();
                      e.stopPropagation();
                      return;
                    }
                    
                    // Fast double click: Open N-GOOS modal
                    if (
                      onProductClick &&
                      arrayIndex < currentRows.length
                    ) {
                      const clickedRow = currentRows[arrayIndex];
                      onProductClick(clickedRow, false);
                    }
                  }}
                  className="non-table-row"
                  data-selected={isSelected}
                  data-dark={isDarkMode}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 140px 220px 140px',
                    height: '66px',
                    minHeight: '66px',
                    maxHeight: '66px',
                    padding: '8px 16px',
                    backgroundColor: (() => {
                      if (isSelected) {
                        return isDarkMode ? '#1E3A5F' : '#DBEAFE';
                      } else {
                        return '#1A2235';
                      }
                    })(),
                    alignItems: 'center',
                    gap: '32px',
                    userSelect: 'none', // Prevent text selection
                    WebkitUserSelect: 'none', // Safari
                    MozUserSelect: 'none', // Firefox
                    msUserSelect: 'none', // IE/Edge
                    boxSizing: 'border-box',
                    position: 'relative',
                    cursor: 'pointer'
                  }}
                >
                  {/* Border line with 30px margin on both sides */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: '30px',
                      right: '30px',
                      height: '1px',
                      backgroundColor: isDarkMode ? '#374151' : '#E5E7EB'
                    }}
                  />
                  {/* PRODUCTS Column */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Checkbox for bulk selection */}
                    <label
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        marginLeft: '20px',
                        flexShrink: 0
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleNonTableCheckboxClick(e, arrayIndex, index)}
                        style={{
                          position: 'absolute',
                          opacity: 0,
                          width: 0,
                          height: 0,
                          margin: 0,
                          pointerEvents: 'none'
                        }}
                      />
                      <span
                        style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '4px',
                          border: '1px solid',
                          borderColor: isSelected
                            ? (isDarkMode ? '#3B82F6' : '#3B82F6')
                            : (isDarkMode ? '#64748B' : '#94A3B8'),
                          backgroundColor: isSelected 
                            ? (isDarkMode ? '#3B82F6' : '#3B82F6')
                            : (isDarkMode ? '#1A2235' : '#F9FAFB'),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          transition: 'background-color 0.2s, border-color 0.2s'
                        }}
                      >
                        {isSelected && (
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 4L4 7L9 1" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                    </label>
                    {/* Product Icon - Alternating placeholder images */}
                    <div style={{ width: '36px', height: '36px', minWidth: '36px', borderRadius: '3px', overflow: 'hidden', backgroundColor: isDarkMode ? '#374151' : '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <img 
                        src={index % 2 === 0 
                          ? "https://scontent.fcrk1-4.fna.fbcdn.net/v/t39.30808-6/324020813_5698060603642883_3730941176199502248_n.jpg?_nc_cat=109&ccb=1-7&_nc_sid=6ee11a&_nc_ohc=GGxaVG4-pVgQ7kNvwEPLk1T&_nc_oc=AdnEjj3CW2ATnumPvOuJ-FMNwcmhl9bJtNYRiqBX0KP8pIFYhMc84O-nNOk6kE4dvDA&_nc_zt=23&_nc_ht=scontent.fcrk1-4.fna&_nc_gid=9BGxqtl66s2GX15r0D2jdA&oh=00_Afowix4xzmWR-0krARMs91-l_crfPVOv-mYZt6pCBxQvqg&oe=697DA3B3"
                          : "https://scontent.fcrk1-5.fna.fbcdn.net/v/t39.30808-6/487773950_3943908355860406_7417001938099264240_n.jpg?_nc_cat=103&ccb=1-7&_nc_sid=a5f93a&_nc_ohc=Q5i960Y67IMQ7kNvwHED1Xh&_nc_oc=AdksAIFb-tZtqjUdT8lcXCdpdtncAEhjlovtG4Wc28FurTc5KNPMj0mo0nnTblhxnAU&_nc_zt=23&_nc_ht=scontent.fcrk1-5.fna&_nc_gid=10fX7hhwHytZNZlfttK-qg&oh=00_AfqRi4SDD09H1FMPJCT0mt9b9LBaaeqw2GjRw966aKV1hg&oe=697D9F4B"
                        }
                        alt={row.product} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        onError={(e) => { 
                          e.target.style.display = 'none'; 
                          if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex'; 
                        }} 
                      />
                      <div style={{ display: 'none', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', borderRadius: '3px', gap: '7.5px', color: isDarkMode ? '#6B7280' : '#9CA3AF', fontSize: '12px' }}>
                        No img
                      </div>
                    </div>
                    
                    {/* Product Info */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
                      {/* Product Name + Best Seller badge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span 
                          style={{ 
                            fontSize: '14px', 
                            fontWeight: 500, 
                            color: isDarkMode ? '#F9FAFB' : '#111827',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {row.product}
                        </span>
                        {topSellerIds.has(row.id) && (
                          <span
                            style={{
                              fontSize: '9px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.02em',
                              color: '#B45309',
                              backgroundColor: '#FEF3C7',
                              padding: '2px 6px',
                              borderRadius: '6px',
                              flexShrink: 0,
                            }}
                            title="Top 2 by 7-day (last week) & 30-day sales"
                          >
                            Best Seller
                          </span>
                        )}
                      </div>
                      
                      {/* Product ID and Brand/Size on same line */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
                        {/* Product ID with Clipboard Icon */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '12px', color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>
                            {asin || 'N/A'}
                          </span>
                          {asin && (
                            <img 
                              src="/assets/copyy.png" 
                              alt="Copy" 
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  // Try modern clipboard API first
                                  if (navigator.clipboard && navigator.clipboard.writeText) {
                                    await navigator.clipboard.writeText(asin);
                                  } else {
                                    // Fallback for non-secure contexts or older browsers
                                    const textArea = document.createElement('textarea');
                                    textArea.value = asin;
                                    textArea.style.position = 'fixed';
                                    textArea.style.left = '-999999px';
                                    textArea.style.top = '-999999px';
                                    document.body.appendChild(textArea);
                                    textArea.focus();
                                    textArea.select();
                                    try {
                                      document.execCommand('copy');
                                    } finally {
                                      document.body.removeChild(textArea);
                                    }
                                  }
                                  toast.success('ASIN copied to clipboard', {
                                    description: asin,
                                    duration: 2000,
                                  });
                                } catch (err) {
                                  console.error('Failed to copy ASIN:', err);
                                  toast.error('Failed to copy ASIN', {
                                    description: 'Please try again',
                                    duration: 2000,
                                  });
                                }
                              }}
                              style={{ width: '14px', height: '14px', cursor: 'pointer', flexShrink: 0 }} 
                            />
                          )}
                        </div>
                        
                        {/* Brand and Size (with package hint for 6oz / 1/2lb / 1lb / 5lb) */}
                        <span style={{ fontSize: '12px', color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>
                          {row.brand} • {row.size}
                          {(() => {
                            const rawSize = row.size || '';
                            const sizeLower = rawSize.toLowerCase();
                            const sizeCompact = sizeLower.replace(/\s+/g, '');

                            const isSixOz =
                              sizeCompact.includes('6oz') ||
                              sizeLower.includes('6 oz') ||
                              sizeLower.includes('6-ounce') ||
                              sizeLower.includes('6 ounce');

                            const isHalfPound =
                              sizeCompact.includes('1/2lb') ||
                              sizeLower.includes('1/2 lb') ||
                              sizeLower.includes('0.5lb') ||
                              sizeLower.includes('0.5 lb') ||
                              sizeLower.includes('half lb');

                            const isOnePound =
                              sizeCompact.includes('1lb') ||
                              sizeLower.includes('1 lb') ||
                              sizeLower.includes('1-pound') ||
                              sizeLower.includes('1 pound');

                            const isFivePound =
                              sizeCompact.includes('5lb') ||
                              sizeLower.includes('5 lb') ||
                              sizeLower.includes('5-pound') ||
                              sizeLower.includes('5 pound');

                            if (isSixOz || isHalfPound || isOnePound || isFivePound) {
                              return ' • Bag';
                            }

                            return null;
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* INVENTORY Column (number in white; Out of Stock / No Sales tags when applicable) */}
                  {(() => {
                    const totalInv = Number(row.totalInventory) || 0;
                    const hasSalesHistory = (Number(row.sales30Day) || Number(row.sales7Day) || 0) > 0;
                    const isOutOfStock = totalInv === 0;
                    const isNoSales = !hasSalesHistory;
                    return (
                      <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 500, color: isDarkMode ? '#FFFFFF' : '#111827', paddingLeft: '16px', marginLeft: '-255px', marginRight: '20px', minWidth: '140px', height: '23px' }}>
                        {isOutOfStock ? (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-start',
                            gap: '4px',
                            backgroundColor: '#F5D7D7',
                            borderRadius: '24px',
                            padding: '0 8px',
                            border: 'none',
                            height: '20px',
                            minHeight: '20px',
                            maxHeight: '20px',
                            boxSizing: 'border-box',
                            width: 'fit-content',
                            marginLeft: '-25px'
                          }}>
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                              style={{ flexShrink: 0 }}
                            >
                              <path
                                d="M12 9V13M12 17H12.01M10.29 3.86L1.82 18C1.64547 18.3024 1.55297 18.6453 1.55197 18.9945C1.55097 19.3437 1.64148 19.6871 1.81442 19.9905C1.98737 20.2939 2.23675 20.5467 2.53773 20.7239C2.83871 20.901 3.18082 20.9962 3.53 21H20.47C20.8192 20.9962 21.1613 20.901 21.4623 20.7239C21.7633 20.5467 22.0126 20.2939 22.1856 19.9905C22.3585 19.6871 22.449 19.3437 22.448 18.9945C22.447 18.6453 22.3545 18.3024 22.18 18L13.71 3.86C13.5318 3.56631 13.2807 3.32311 12.9812 3.15447C12.6817 2.98584 12.3438 2.89725 12 2.89725C11.6562 2.89725 11.3183 2.98584 11.0188 3.15447C10.7193 3.32311 10.4682 3.56631 10.29 3.86Z"
                                stroke="#EF4444"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                fill="#EF4444"
                              />
                            </svg>
                            <span style={{ color: '#EF4444', fontWeight: 700, fontSize: '12px', lineHeight: 1 }}>
                              Out of Stock
                            </span>
                          </div>
                        ) : isNoSales ? (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-start',
                            gap: '4px',
                            backgroundColor: '#FFF4E6',
                            borderRadius: '24px',
                            padding: '0 8px',
                            border: 'none',
                            height: '20px',
                            minHeight: '20px',
                            maxHeight: '20px',
                            boxSizing: 'border-box',
                            width: 'fit-content',
                            marginLeft: '-15px'
                          }}>
                            <span style={{
                              width: '12px',
                              height: '12px',
                              borderRadius: '50%',
                              backgroundColor: '#F97316',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              <span style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '10px', lineHeight: 1 }}>!</span>
                            </span>
                            <span style={{ color: '#F97316', fontWeight: 700, fontSize: '12px', lineHeight: 1 }}>
                              No Sales
                            </span>
                          </div>
                        ) : (
                          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', height: '100%', width: 'fit-content', marginLeft: '20px' }}>{totalInv.toLocaleString()}</span>
                        )}
                      </div>
                    );
                  })()}

                  {/* UNITS TO MAKE Column - match header: same padding so content aligns under header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px', paddingLeft: '16px', marginLeft: '-300px', marginRight: '20px', position: 'relative', minWidth: '220px' }}>
                    {/* Label warning icon - shown when QTY exceeds labels, positioned on the left */}
                    {(() => {
                      const labelsAvailable = getAvailableLabelsForRow(row, index);
                      const labelsNeeded = effectiveQtyValues[index] ?? 0;
                      // Only show warning if labels needed exceed available
                      if (labelsNeeded > labelsAvailable && labelsNeeded > 0) {
                        return (
                          <>
                            <span
                              ref={(el) => {
                                if (el) warningIconRefs.current[index] = el;
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setClickedQtyIndex(clickedQtyIndex === index ? null : index);
                              }}
                              onMouseEnter={() => setHoveredWarningIndex(index)}
                              onMouseLeave={() => setHoveredWarningIndex(null)}
                              style={{
                                position: 'absolute',
                                left: 'calc(50% - 257px)',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '18px',
                                height: '18px',
                                borderRadius: '50%',
                                backgroundColor: '#FEE2E2',
                                color: '#DC2626',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                zIndex: 10,
                              }}
                            >
                              !
                            </span>
                            {/* Custom tooltip for warning icon */}
                            {hoveredWarningIndex === index && (
                              <div
                                style={{
                                  position: 'absolute',
                                  left: 'calc(50% - 312px)', // 55px to the left of the warning icon
                                  top: '50%',
                                  transform: 'translateY(calc(-50% - 30px))',
                                  backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                                  color: isDarkMode ? '#E5E7EB' : '#111827',
                                  padding: '6px 10px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 500,
                                  whiteSpace: 'nowrap',
                                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                                  border: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
                                  zIndex: 9,
                                  pointerEvents: 'none',
                                }}
                              >
                                Labels Available: {labelsAvailable.toLocaleString()}
                              </div>
                            )}
                          </>
                        );
                      }
                      return null;
                    })()}
                    {/* Quantity input container with reset button inside */}
                    <div 
                      ref={(el) => {
                        if (el) qtyContainerRefs.current[index] = el;
                      }}
                      style={{ position: 'relative', width: '110px', height: '28px' }}
                      onMouseEnter={() => setHoveredQtyIndex(index)}
                      onMouseLeave={() => setHoveredQtyIndex(null)}
                    >
                      {/* Reset button - inside container */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const originalQtyValue = originalQtyValueForRow;
                          
                          console.log('Reset clicked for index:', index);
                          console.log('Product ID:', productId);
                          console.log('Row data:', row);
                          console.log('Original suggested value:', originalQtyValue);
                          console.log('Current qty value:', effectiveQtyValues[index]);
                          console.log('All original suggested qtys by ID:', originalSuggestedQtyValues.current);
                          console.log('All original suggested qtys by index:', originalSuggestedQtyValuesByIndex.current);
                          
                          effectiveSetQtyValues(prev => {
                            console.log('Previous state:', prev);
                            const newState = { ...prev, [index]: originalQtyValue };
                            console.log('New state:', newState);
                            return newState;
                          });
                          // Remove from manually edited set when reset to suggestion
                          manuallyEditedIndices.current.delete(index);
                          // Clear any stored label-inventory suggestion usage for this product
                          if (productId) {
                            setLabelSuggestionUsage(prev => {
                              if (!prev || prev[productId] === undefined) return prev;
                              const next = { ...prev };
                              delete next[productId];
                              return next;
                            });
                          }
                        }}
                        style={{
                          position: 'absolute',
                          left: '4px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: '20px',
                          height: '20px',
                          borderRadius: '4px',
                          border: 'none',
                          backgroundColor: 'transparent',
                          color: isDarkMode ? '#9CA3AF' : '#6B7280',
                          cursor: 'pointer',
                          display: (() => {
                            const qtyValue = effectiveQtyValues[index];
                            // Check if value has been manually edited
                            const wasManuallyEdited = manuallyEditedIndices.current.has(index);
                            
                            const isValueSet = qtyValue !== undefined && qtyValue !== null && qtyValue !== '';
                            const currentQty = typeof qtyValue === 'number' 
                              ? qtyValue 
                              : isValueSet 
                                ? parseInt(qtyValue, 10) || 0
                                : 0;
                            const hasChanged = wasManuallyEdited && currentQty !== originalQtyValueForRow;
                          // Determine if we are currently using the value suggested by the
                          // Label Inventory warning (i.e., "Use Available" was clicked and
                          // the qty still matches that suggested value). In this case, the
                          // reset icon should be permanently visible.
                          const suggestedFromLabels = productId && labelSuggestionUsage
                            ? labelSuggestionUsage[productId]
                            : undefined;
                          const isUsingLabelSuggestion =
                            suggestedFromLabels !== undefined && currentQty === suggestedFromLabels;
                          const shouldShowReset = hasChanged && (hoveredQtyIndex === index || isUsingLabelSuggestion);
                          return shouldShowReset ? 'flex' : 'none';
                          })(),
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0,
                          outline: 'none',
                          zIndex: 1,
                          transition: 'color 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = isDarkMode ? '#D1D5DB' : '#374151';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = isDarkMode ? '#9CA3AF' : '#6B7280';
                        }}
                        title="Reset to forecasted value"
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M2 6C2 3.79 3.79 2 6 2C7.5 2 8.8 2.8 9.4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                          <path d="M10 6C10 8.21 8.21 10 6 10C4.5 10 3.2 9.2 2.6 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                          <path d="M9.4 4L11 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                          <path d="M9.4 4L11 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                        </svg>
                      </button>
                      {/* Quantity input - clean rounded rectangle */}
                      <input 
                        type="text" 
                        value={(() => {
                          const qty = effectiveQtyValues[index];
                          if (qty === undefined || qty === null || qty === '') return '';
                          const numQty = typeof qty === 'number' ? qty : parseInt(qty, 10);
                          return isNaN(numQty) ? '' : numQty.toLocaleString();
                        })()}
                        onChange={(e) => { 
                          const inputValue = e.target.value.replace(/,/g, ''); 
                          manuallyEditedIndices.current.add(index); 
                          if (inputValue === '' || inputValue === '-') { 
                            effectiveSetQtyValues(prev => ({ ...prev, [index]: '' })); 
                          } else { 
                            const numValue = parseInt(inputValue, 10); 
                            if (!isNaN(numValue) && numValue >= 0) { 
                              effectiveSetQtyValues(prev => ({ ...prev, [index]: numValue })); 
                            } 
                          }
                          setQtyInputUpdateTrigger(prev => prev + 1);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.target.blur(); // Remove focus after Enter
                          }
                        }}
                        onClick={(e) => e.stopPropagation()} 
                        style={{ 
                          width: '100%',
                          height: '100%',
                          borderRadius: '6px', 
                          border: 'none',
                          backgroundColor: isDarkMode ? '#2C3544' : '#F3F4F6', 
                          color: isDarkMode ? '#E5E7EB' : '#111827', 
                          textAlign: 'center', 
                          fontSize: '13px', 
                          fontWeight: 500, 
                          outline: 'none', 
                          fontFamily: 'sans-serif',
                          padding: '0 12px',
                          paddingLeft: '28px',
                          paddingRight: '28px',
                          boxSizing: 'border-box',
                          cursor: 'text'
                        }}
                        onWheel={(e) => e.target.blur()}
                      />
                      {/* Decrement arrow button - inside container on the right (bottom) */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          
                          // Bulk decrease if multiple products are selected
                          if (nonTableSelectedIndices.size > 1 && nonTableSelectedIndices.has(index)) {
                            effectiveSetQtyValues(prev => {
                              const newValues = { ...prev };
                              nonTableSelectedIndices.forEach(selectedIndex => {
                                const selectedRow = currentRows.find(r => r._originalIndex === selectedIndex);
                                if (selectedRow) {
                                  const currentQty = newValues[selectedIndex] ?? 0;
                                  const numQty = typeof currentQty === 'number' ? currentQty : parseInt(currentQty, 10) || 0;
                                  if (numQty <= 0) return;
                                  
                                  // Use size-based increment (e.g. 60 units for 8oz)
                                  const increment = getQtyIncrement(selectedRow);
                                  
                                  newValues[selectedIndex] = Math.max(0, numQty - increment);
                                  manuallyEditedIndices.current.add(selectedIndex);
                                }
                              });
                              return newValues;
                            });
                          } else {
                            // Single product decrease
                            const currentQty = effectiveQtyValues[index] ?? 0;
                            const numQty = typeof currentQty === 'number' ? currentQty : parseInt(currentQty, 10) || 0;
                            if (numQty <= 0) return;
                            // Use size-based increment (e.g. 60 units for 8oz)
                            const increment = getQtyIncrement(row);
                            const newQty = Math.max(0, numQty - increment);
                            manuallyEditedIndices.current.add(index);
                            effectiveSetQtyValues(prev => ({ ...prev, [index]: newQty }));
                            setQtyInputUpdateTrigger(prev => prev + 1);
                          }
                        }}
                        style={{
                          position: 'absolute',
                          right: '4px',
                          bottom: '2px',
                          width: '20px',
                          height: '10px',
                          borderRadius: '4px',
                          border: 'none',
                          backgroundColor: 'transparent',
                          color: isDarkMode ? '#9CA3AF' : '#6B7280',
                          cursor: 'pointer',
                          display: hoveredQtyIndex === index ? 'flex' : 'none',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0,
                          outline: 'none',
                          zIndex: 1,
                          transition: 'color 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = isDarkMode ? '#D1D5DB' : '#374151';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = isDarkMode ? '#9CA3AF' : '#6B7280';
                        }}
                        title="Decrease quantity"
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M3 8L6 11L9 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      {/* Increment arrow button - inside container on the right (top) */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          
                          // Bulk increase if multiple products are selected
                          if (nonTableSelectedIndices.size > 1 && nonTableSelectedIndices.has(index)) {
                            effectiveSetQtyValues(prev => {
                              const newValues = { ...prev };
                              nonTableSelectedIndices.forEach(selectedIndex => {
                                const selectedRow = currentRows.find(r => r._originalIndex === selectedIndex);
                                if (selectedRow) {
                                  const currentQty = newValues[selectedIndex] ?? 0;
                                  const numQty = typeof currentQty === 'number' ? currentQty : parseInt(currentQty, 10) || 0;
                                  
                                  // Use size-based increment (e.g. 60 units for 8oz)
                                  const increment = getQtyIncrement(selectedRow);
                                  
                                  newValues[selectedIndex] = numQty + increment;
                                  manuallyEditedIndices.current.add(selectedIndex);
                                }
                              });
                              return newValues;
                            });
                          } else {
                            // Single product increase
                            const currentQty = effectiveQtyValues[index] ?? 0;
                            const numQty = typeof currentQty === 'number' ? currentQty : parseInt(currentQty, 10) || 0;
                            // Use size-based increment (e.g. 60 units for 8oz)
                            const increment = getQtyIncrement(row);
                            const newQty = numQty + increment;
                            manuallyEditedIndices.current.add(index);
                            effectiveSetQtyValues(prev => ({ ...prev, [index]: newQty }));
                            setQtyInputUpdateTrigger(prev => prev + 1);
                          }
                        }}
                        style={{
                          position: 'absolute',
                          right: '4px',
                          top: '2px',
                          width: '20px',
                          height: '10px',
                          borderRadius: '4px',
                          border: 'none',
                          backgroundColor: 'transparent',
                          color: isDarkMode ? '#9CA3AF' : '#6B7280',
                          cursor: 'pointer',
                          display: hoveredQtyIndex === index ? 'flex' : 'none',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0,
                          outline: 'none',
                          zIndex: 1,
                          transition: 'color 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = isDarkMode ? '#D1D5DB' : '#374151';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = isDarkMode ? '#9CA3AF' : '#6B7280';
                        }}
                        title="Increase quantity"
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M3 4L6 1L9 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                    {/* Add button */}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddClick(row, index);
                      }} 
                      style={{ 
                        width: '64px',
                        height: '24px',
                        minHeight: '24px',
                        maxHeight: '24px',
                        boxSizing: 'border-box',
                        borderRadius: '4px', 
                        border: 'none', 
                        backgroundColor: effectiveAddedRows.has(row.id) ? '#10B981' : '#2563EB', 
                        color: '#FFFFFF', 
                        fontSize: '12px', 
                        fontWeight: 500, 
                        cursor: 'pointer', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '4px 8px',
                        outline: 'none',
                        fontFamily: 'sans-serif',
                        position: 'relative',
                        zIndex: 5
                      }}
                    >
                      {!effectiveAddedRows.has(row.id) && (
                        <span style={{ fontSize: '14px', lineHeight: 1, pointerEvents: 'none' }}>+</span>
                      )}
                      <span style={{ pointerEvents: 'none' }}>{effectiveAddedRows.has(row.id) ? 'Added' : 'Add'}</span>
                    </button>
                    {/* Label warning tooltip - shown when warning icon is clicked (only in non-table mode) */}
                    {!tableMode && clickedQtyIndex === index && (() => {
                      const labelsAvailable = getAvailableLabelsForRow(row, index);
                      const labelsNeeded = effectiveQtyValues[index] ?? 0;
                      return labelsNeeded > labelsAvailable;
                    })() && (
                      <div
                        ref={(el) => {
                          if (el) popupRefs.current[index] = el;
                        }}
                        style={{
                          position: 'fixed',
                          backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                          borderRadius: '12px',
                          padding: '6px 8px',
                          width: '199px',
                          height: '76px',
                          boxShadow: isDarkMode 
                            ? '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4)'
                            : '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                          zIndex: 9999,
                          border: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
                          pointerEvents: 'auto',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          boxSizing: 'border-box',
                          // No transition - instant updates for fast scrolling
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onMouseUp={(e) => e.stopPropagation()}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minHeight: 0 }}>
                          <h3 style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: isDarkMode ? '#F9FAFB' : '#111827',
                            margin: 0,
                            height: '15px',
                            lineHeight: '15px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            Order exceeds available labels
                          </h3>
                          <p style={{
                            fontSize: '11px',
                            fontWeight: 400,
                            color: '#9CA3AF',
                            margin: 0,
                            lineHeight: '14px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            Labels Available: {getAvailableLabelsForRow(row, index).toLocaleString()}
                          </p>
                        </div>
                        <button
                          style={{
                            width: '175px',
                            height: '23px',
                            backgroundColor: '#3B82F6',
                            color: '#FFFFFF',
                            fontSize: '11px',
                            fontWeight: 600,
                            borderRadius: '4px',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s',
                            flexShrink: 0,
                            padding: 0,
                            alignSelf: 'center',
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#2563EB'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#3B82F6'}
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            const labelsAvailable = getAvailableLabelsForRow(row, index);
                            
                            // Use exact available quantity (no rounding)
                            // Mark as manually edited since user clicked "Use Available"
                            manuallyEditedIndices.current.add(index);
                            effectiveSetQtyValues(prev => ({
                              ...prev,
                              [index]: labelsAvailable
                            }));
                            // Remember that this product is now using the Label Inventory
                            // suggested value so we can show a permanent reset icon until
                            // the quantity is reset or changed away from this value.
                            const productId = row.id || row.asin || row.child_asin || row.childAsin;
                            if (productId) {
                              setLabelSuggestionUsage(prev => ({
                                ...(prev || {}),
                                [productId]: labelsAvailable
                              }));
                            }
                            
                            setTimeout(() => setClickedQtyIndex(null), 100);
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          Use Available
                        </button>
                      </div>
                    )}
                  </div>

                  {/* DOI (DAYS) Column - fixed height so FBA bar doesn't move row; no overflow hidden so bars aren't cut; clickable to open row */}
                  <div 
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: '16px', marginLeft: '-275px', marginRight: '20px', position: 'relative', height: '100%', minHeight: 0 }}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onProductClick && arrayIndex < currentRows.length) {
                          const clickedRow = currentRows[arrayIndex];
                          onProductClick(clickedRow, false);
                        }
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: (showFbaBar && showDoiBar) ? '1px' : 0,
                        position: 'relative',
                        minHeight: 0,
                        border: 'none',
                        background: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        font: 'inherit',
                        textAlign: 'inherit',
                      }}
                      aria-label={`Open ${row.title || row.product_name || 'product'} details`}
                    >
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: (showFbaBar && showDoiBar) ? '1px' : 0, position: 'relative', minHeight: 0, width: '100%' }}>
                      {/* FBA Available bar - shown when FBA button is selected; shows FBA vs needed to reach 30-day DOI goal */}
                      {showFbaBar && (() => {
                        const fbaDays = Number(row.doiFba ?? row.doi_fba ?? 0);
                        const baseWidth = 100;
                        const maxDaysForBar = 100;
                        const daysForWidth = Math.min(maxDaysForBar, fbaDays);
                        const fbaBarWidth = daysForWidth <= 30 ? baseWidth : Math.round(baseWidth * (daysForWidth / 30));
                        const fbaPct = fbaDays <= 30 ? (fbaDays / 30) * 100 : 100;
                        const showFbaWarning = fbaDays < 30;
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative', minHeight: '20px', width: '450px', flexShrink: 0, boxSizing: 'border-box' }}>
                            {/* FBA bar: 30 days = 100px; extends up to 100 days */}
                            <div
                              style={{
                                position: 'absolute',
                                left: '-50px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                width: `${fbaBarWidth}px`,
                                height: '20px',
                                borderRadius: '6px',
                                overflow: 'visible',
                                boxShadow: isDarkMode ? '0 1px 2px rgba(0,0,0,0.2)' : '0 1px 2px rgba(0,0,0,0.08)',
                              }}
                            >
                              <div style={{ display: 'flex', width: '100%', height: '100%', borderRadius: '6px', overflow: 'hidden' }}>
                                <BarFill widthPct={fbaPct} backgroundColor="#22C55E" durationSec={0.6} />
                                <div style={{ flex: 1, height: '100%', backgroundColor: '#DCE8DA', minWidth: 0 }} />
                              </div>
                              {showFbaWarning && (
                                <img
                                  src="/assets/zxcvb.png"
                                  alt="Low FBA"
                                  title="Low FBA days – below 30-day goal"
                                  style={{
                                    position: 'absolute',
                                    left: '4px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    width: '14px',
                                    height: '14px',
                                    objectFit: 'contain',
                                    zIndex: 2,
                                    pointerEvents: 'none',
                                  }}
                                />
                              )}
                            </div>
                            <div style={{ width: `${fbaBarWidth}px`, flexShrink: 0, marginLeft: '-20px' }} aria-hidden />
                            <span style={{ fontSize: '18px', fontWeight: 600, color: fbaDays >= 30 ? '#22C55E' : fbaDays >= 20 ? '#F97316' : '#EF4444', minWidth: 'fit-content', marginLeft: '-29px' }}>
                              {Math.round(fbaDays)}
                            </span>
                            {/* Placeholder so row width matches DOI row (pencil + gap) for alignment */}
                            <div style={{ width: '26px', flexShrink: 0 }} aria-hidden />
                          </div>
                        );
                      })()}
                      {/* When both toggles off: show only DOI number centered in column */}
                      {!showFbaBar && !showDoiBar && (
                        <span style={{ fontSize: '20px', fontWeight: 500, color: getDoiColor(displayDoi), height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 'fit-content', marginLeft: '-60px' }}>
                          {displayDoi}
                        </span>
                      )}
                      {/* DOI bar row: only render when showDoiBar (bar + number); marginTop when FBA bar also shown */}
                      {showDoiBar && (
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', position: 'relative', minHeight: '32px', width: '450px', flexShrink: 0, boxSizing: 'border-box', marginTop: showFbaBar ? '-6px' : 0 }}>
                      {/* Bar: fixed position so 2- vs 3-digit number doesn't move it */}
                      <div
                        style={{
                          position: 'absolute',
                          left: '-50px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: '333px',
                          height: '20px',
                          borderRadius: '6px',
                          overflow: 'visible',
                          boxShadow: isDarkMode ? '0 1px 2px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.1)',
                        }}
                        aria-hidden
                      >
                        <div style={{ display: 'flex', width: '100%', height: '100%', borderRadius: '6px', overflow: 'hidden' }}>
                          <BarFill
                            widthPct={Math.min(100, (Number(displayDoi) / 100) * 100)}
                            backgroundColor="#3399FF"
                            durationSec={0.6}
                          />
                          <div
                            style={{
                              flex: 1,
                              height: '100%',
                              backgroundColor: '#ADD8E6',
                              minWidth: 0,
                            }}
                          />
                        </div>
                        {Number(doiValue) < 30 && (
                          <img
                            src="/assets/zxcvb.png"
                            alt="At risk"
                            title="Low DOI – product at risk"
                            style={{
                              position: 'absolute',
                              left: '6px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              width: '14px',
                              height: '14px',
                              objectFit: 'contain',
                              zIndex: 2,
                              pointerEvents: 'none',
                            }}
                          />
                        )}
                      </div>
                      {/* Spacer: reserves bar width; -127px shifts number (3px right of -130) */}
                      <div style={{ width: '333px', flexShrink: 0, marginLeft: '-127px' }} aria-hidden />
                      <span style={{ fontSize: showFbaBar ? '18px' : '20px', fontWeight: 500, color: getDoiColor(displayDoi), height: '32px', display: 'flex', alignItems: 'center', gap: '2px', minWidth: 'fit-content', marginLeft: '-25px' }}>
                        {displayDoi}
                      </span>
                      {/* Spacer where pencil was - keeps DOI number position when pencil is in icon group */}
                      <div style={{ width: '16px', flexShrink: 0 }} aria-hidden />
                      </div>
                      )}
                    </div>
                    </button>
                    {/* Icon group: pencil + analyze, aligned at right and vertically centered (aligns with ngoos when FBA bar shown) */}
                    <div
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        flexShrink: 0,
                      }}
                    >
                      <img
                        src="/assets/pencil.png"
                        alt="Edit Settings"
                        className={shouldShowPencilPermanently ? '' : 'pencil-icon-hover'}
                        data-pencil-active={(hasCustomDoiSettings || hasCustomForecastSettings) ? 'true' : 'false'}
                        onClick={(e) => {
                          e.stopPropagation();
                          onProductClick(row, false, true);
                        }}
                        style={{
                          width: '16px',
                          height: '16px',
                          cursor: 'pointer',
                          opacity: shouldShowPencilPermanently ? 1 : 0,
                          transition: 'none',
                          filter: isPencilActive
                            ? 'brightness(0) saturate(100%) invert(47%) sepia(98%) saturate(2476%) hue-rotate(209deg) brightness(100%) contrast(101%)'
                            : 'brightness(0) saturate(100%) invert(50%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(95%) contrast(90%)',
                          pointerEvents: shouldShowPencilPermanently ? 'auto' : 'none',
                        }}
                      />
                      <span
                        className="analyze-icon-hover"
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          onProductClick(row);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            onProductClick(row);
                          }
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '28px',
                          height: '28px',
                          cursor: 'pointer',
                          opacity: 0,
                          pointerEvents: 'none',
                          transition: 'none',
                          color: 'inherit',
                          filter: 'brightness(0) saturate(100%) invert(50%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(95%) contrast(90%)',
                        }}
                        aria-label="Analyze"
                      >
                        <svg width="22" height="22" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M2.33333 10.5L5.25 7.58333L7.58333 9.91667L11.6667 5.83333M11.6667 5.83333V9.33333M11.6667 5.83333H8.16667" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Header Filter Dropdowns */}
        {Array.from(openFilterColumns).map((columnKey) => {
          if (!filterIconRefs.current[columnKey]) return null;
          return (
            <SortFormulasFilterDropdown
              key={columnKey}
              ref={(el) => {
                if (el) filterDropdownRefs.current[columnKey] = el;
                else delete filterDropdownRefs.current[columnKey];
              }}
              filterIconRef={filterIconRefs.current[columnKey]}
              columnKey={columnKey}
              availableValues={getColumnValues(columnKey)}
              currentFilter={columnFilters[columnKey] || {}}
              currentSort={getColumnSortOrder(columnKey)}
              onApply={(filterData) => handleApplyColumnFilter(columnKey, filterData)}
              onClose={() => {
                setOpenFilterColumns((prev) => {
                  const next = new Set(prev);
                  next.delete(columnKey);
                  return next;
                });
              }}
            />
          );
        })}

        {/* Filter Modals */}
        {['normal-0', 'normal-1', 'normal-2', 'normal-3', 'normal-4'].map((filterKey) => (
          openFilterIndex === filterKey && (
            <div
              key={filterKey}
              ref={(el) => {
                if (el) filterModalRefs.current[filterKey] = el;
              }}
              style={{
                position: 'fixed',
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                padding: '16px',
                width: '228px',
                boxSizing: 'border-box',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                zIndex: 10000,
                border: '1px solid #E5E7EB',
                pointerEvents: 'auto',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Sort by section */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', textTransform: 'uppercase' }}>
                    Sort by:
                  </label>
                  <button
                    type="button"
                    onClick={() => setOpenFilterIndex(null)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#3B82F6',
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    Clear
                  </button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <select
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      color: '#374151',
                      backgroundColor: '#FFFFFF',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="">Select field</option>
                    <option value="fbaAvailable">FBA Available</option>
                    <option value="totalInventory">Total Inventory</option>
                    <option value="forecast">Forecast</option>
                    <option value="sales7">7 Day Sales</option>
                    <option value="sales30">30 Day Sales</option>
                  </select>
                  
                  <select
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      color: '#374151',
                      backgroundColor: '#FFFFFF',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="">Select order</option>
                    <option value="asc">A^Z Sort ascending (A to Z)</option>
                    <option value="desc">Z^A Sort descending (Z to A)</option>
                    <option value="numAsc">0^9 Sort ascending (0 to 9)</option>
                    <option value="numDesc">9^0 Sort descending (9 to 0)</option>
                  </select>
                </div>
              </div>

              {/* Filter by condition section */}
              <div style={{ marginBottom: '16px', paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', textTransform: 'uppercase', marginBottom: '12px', display: 'block' }}>
                  Filter by condition:
                </label>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <select
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      color: '#9CA3AF',
                      backgroundColor: '#FFFFFF',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="">Select field</option>
                    <option value="brand">Brand</option>
                    <option value="product">Product</option>
                    <option value="size">Size</option>
                    <option value="qty">Qty</option>
                  </select>
                  
                  <select
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      color: '#9CA3AF',
                      backgroundColor: '#FFFFFF',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="">Select condition</option>
                    <option value="equals">Equals</option>
                    <option value="contains">Contains</option>
                    <option value="greaterThan">Greater than</option>
                    <option value="lessThan">Less than</option>
                  </select>
                  
                  <input
                    type="text"
                    placeholder="Value here..."
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      color: '#374151',
                      backgroundColor: '#FFFFFF',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
                <button
                  type="button"
                  onClick={() => setOpenFilterIndex(null)}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    backgroundColor: '#FFFFFF',
                    color: '#374151',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setOpenFilterIndex(null)}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: '#3B82F6',
                    color: '#FFFFFF',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Apply
                </button>
              </div>
            </div>
          )
        ))}
        
        {/* Timeline (doi-goal) Filter Modal with new design */}
        {openFilterIndex === 'doi-goal' && (
          <TimelineFilterDropdown
            ref={(el) => {
              if (el) filterModalRefs.current['doi-goal'] = el;
            }}
            filterIconRef={filterRefs.current['doi-goal']}
            onClose={() => setOpenFilterIndex(null)}
            onApply={handleFilterApply}
            onReset={handleFilterReset}
            currentFilters={activeFilters}
          />
        )}
        
        {/* Non-table mode filter dropdown */}
        {nonTableOpenFilterColumn && nonTableFilterIconRefs.current[nonTableOpenFilterColumn] && (
          (nonTableOpenFilterColumn === 'product' || 
           nonTableOpenFilterColumn === 'fbaAvailable' || 
           nonTableOpenFilterColumn === 'unitsToMake' || 
           nonTableOpenFilterColumn === 'doiDays') ? (
            <ProductsFilterDropdown
              key={nonTableOpenFilterColumn}
              ref={(el) => {
                nonTableFilterDropdownRef.current = el;
              }}
              filterIconRef={nonTableFilterIconRefs.current[nonTableOpenFilterColumn]}
              columnKey={nonTableOpenFilterColumn}
              availableValues={getNonTableColumnValues(nonTableOpenFilterColumn)}
              currentFilter={nonTableFilters[nonTableOpenFilterColumn] || {}}
              currentSort={nonTableSortField === nonTableOpenFilterColumn ? nonTableSortOrder : ''}
              currentSortByFba={nonTableOpenFilterColumn === 'doiDays' && nonTableSortField === 'fbaAvailable' ? nonTableSortOrder : ''}
              onApply={(filterData) => handleNonTableApplyFilter(nonTableOpenFilterColumn, filterData)}
              onClose={() => setNonTableOpenFilterColumn(null)}
              account={account}
            />
          ) : (
            <SortFormulasFilterDropdown
              key={nonTableOpenFilterColumn}
              ref={(el) => {
                nonTableFilterDropdownRef.current = el;
              }}
              filterIconRef={nonTableFilterIconRefs.current[nonTableOpenFilterColumn]}
              columnKey={nonTableOpenFilterColumn}
              availableValues={getNonTableColumnValues(nonTableOpenFilterColumn)}
              currentFilter={nonTableFilters[nonTableOpenFilterColumn] || {}}
              currentSort={nonTableSortField === nonTableOpenFilterColumn ? nonTableSortOrder : ''}
              onApply={(filterData) => handleNonTableApplyFilter(nonTableOpenFilterColumn, filterData)}
              onClose={() => setNonTableOpenFilterColumn(null)}
            />
          )
        )}

        {!hideFooter && (
        <>
        {/* Footer */}
        <div
          style={{
            position: 'fixed',
            bottom: '16px',
            left: `calc(${sidebarWidth}px + (100vw - ${sidebarWidth}px) / 2 - 125px)`,
            transform: 'translateX(-50%)',
            width: 'fit-content',
            height: '65px',
            backgroundColor: isDarkMode ? 'rgba(31, 41, 55, 0.85)' : 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
            borderRadius: '32px',
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '32px',
            zIndex: 1000,
            transition: 'left 300ms cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 -2px 4px -1px rgba(0, 0, 0, 0.06)',
          }}
        >
          <div style={{ display: 'flex', gap: '48px', alignItems: 'center', flexShrink: 0 }}>
            {footerStatsVisibility.products && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 400, color: isDarkMode ? '#9CA3AF' : '#9CA3AF', textAlign: 'center' }}>PRODUCTS</span>
                <span style={{ fontSize: '18px', fontWeight: 700, color: isDarkMode ? '#FFFFFF' : '#000000', textAlign: 'center' }}>{totalProducts}</span>
              </div>
            )}
            {footerStatsVisibility.palettes && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 400, color: isDarkMode ? '#9CA3AF' : '#9CA3AF', textAlign: 'center' }}>PALETTES</span>
                <span style={{ fontSize: '18px', fontWeight: 700, color: isDarkMode ? '#FFFFFF' : '#000000', textAlign: 'center' }}>{totalPalettes.toFixed(2)}</span>
              </div>
            )}
            {footerStatsVisibility.boxes && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 400, color: isDarkMode ? '#9CA3AF' : '#9CA3AF', textAlign: 'center' }}>BOXES</span>
                <span style={{ fontSize: '18px', fontWeight: 700, color: isDarkMode ? '#FFFFFF' : '#000000', textAlign: 'center' }}>{Math.ceil(totalBoxes).toLocaleString()}</span>
              </div>
            )}
            {footerStatsVisibility.units && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 400, color: isDarkMode ? '#9CA3AF' : '#9CA3AF', textAlign: 'center' }}>UNITS</span>
                <span style={{ fontSize: '18px', fontWeight: 700, color: isDarkMode ? '#FFFFFF' : '#000000', textAlign: 'center' }}>{totalUnits.toLocaleString()}</span>
              </div>
            )}
            {footerStatsVisibility.timeHours && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 400, color: isDarkMode ? '#9CA3AF' : '#9CA3AF', textAlign: 'center', whiteSpace: 'nowrap' }}>TIME (HRS)</span>
                <span style={{ fontSize: '18px', fontWeight: 700, color: isDarkMode ? '#FFFFFF' : '#000000', textAlign: 'center' }}>{totalTimeHours.toFixed(2)}</span>
              </div>
            )}
            {footerStatsVisibility.weightLbs && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 400, color: isDarkMode ? '#9CA3AF' : '#9CA3AF', textAlign: 'center', whiteSpace: 'nowrap' }}>WEIGHT (LBS)</span>
                <span style={{ fontSize: '18px', fontWeight: 700, color: isDarkMode ? '#FFFFFF' : '#000000', textAlign: 'center' }}>{Math.round(totalWeightLbs).toLocaleString()}</span>
              </div>
            )}
            {footerStatsVisibility.formulas && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 400, color: isDarkMode ? '#9CA3AF' : '#9CA3AF', textAlign: 'center' }}>FORMULAS</span>
                <span style={{ fontSize: '18px', fontWeight: 700, color: isDarkMode ? '#FFFFFF' : '#000000', textAlign: 'center' }}>{totalFormulas}</span>
              </div>
            )}
          </div>
          {(onClear || onExport) && (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexShrink: 0 }}>
              {onClear && (
                <button
                  type="button"
                  onClick={onClear}
                  style={{
                    height: '31px',
                    padding: '0 16px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: isDarkMode ? '#9CA3AF' : '#6B7280',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  Clear
                </button>
              )}
              {onExport && (
                <>
                  <button
                    type="button"
                    onClick={onExport}
                    style={{
                      height: '31px',
                      padding: '0 10px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: (addedRows && addedRows.size > 0) ? '#3B82F6' : '#9CA3AF',
                      color: '#FFFFFF',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: (addedRows && addedRows.size > 0) ? 'pointer' : 'not-allowed',
                      transition: 'background-color 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={(e) => {
                      if (addedRows && addedRows.size > 0) {
                        e.currentTarget.style.backgroundColor = '#2563EB';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (addedRows && addedRows.size > 0) {
                        e.currentTarget.style.backgroundColor = '#3B82F6';
                      } else {
                        e.currentTarget.style.backgroundColor = '#9CA3AF';
                      }
                    }}
                  >
                    Export for Upload
                  </button>
                  <button
                    type="button"
                    aria-label="Shipment stats"
                    data-shipment-stats-trigger
                    onClick={() => setShipmentStatsMenuOpen((prev) => !prev)}
                    style={{
                      padding: '4px',
                      border: 'none',
                      borderRadius: '4px',
                      backgroundColor: 'transparent',
                      color: shipmentStatsMenuOpen ? '#3B82F6' : (isDarkMode ? '#9CA3AF' : '#6B7280'),
                      fontSize: '1.25rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (!shipmentStatsMenuOpen) e.currentTarget.style.color = isDarkMode ? '#D1D5DB' : '#4B5563';
                    }}
                    onMouseLeave={(e) => {
                      if (!shipmentStatsMenuOpen) e.currentTarget.style.color = isDarkMode ? '#9CA3AF' : '#6B7280';
                    }}
                  >
                    ⋮
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Shipment Stats popup - above footer */}
        {shipmentStatsMenuOpen && (
          <div
            ref={shipmentStatsPopupRef}
            style={{
              position: 'fixed',
              bottom: '96px',
              left: `calc(${sidebarWidth}px + (100vw - ${sidebarWidth}px) / 2 - 125px + 350px)`,
              transform: 'translateX(-50%)',
              width: '204px',
              minHeight: '264px',
              maxHeight: '80vh',
              backgroundColor: isDarkMode ? '#1F2937' : '#374151',
              borderRadius: '8px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
              border: `1px solid ${isDarkMode ? '#374151' : '#4B5563'}`,
              zIndex: 1001,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', borderBottom: `1px solid ${isDarkMode ? '#374151' : '#4B5563'}` }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#FFFFFF' }}>Shipment Stats</span>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setShipmentStatsMenuOpen(false)}
                style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4L4 12M4 4l8 8" /></svg>
              </button>
            </div>
            <div style={{ padding: '8px', gap: '2px', display: 'flex', flexDirection: 'column', overflowY: 'auto', flex: 1, minHeight: 0 }}>
              {[
                { key: 'products', label: 'Products' },
                { key: 'palettes', label: 'Palettes' },
                { key: 'boxes', label: 'Boxes' },
                { key: 'weightLbs', label: 'Weight (lbs)' },
                { key: 'units', label: 'Units' },
                { key: 'formulas', label: 'Formulas' },
                { key: 'timeHours', label: 'Time (hrs)' },
              ].map(({ key, label }) => (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                    padding: '6px 8px',
                  }}
                >
                  <span style={{ color: '#9CA3AF', cursor: 'grab', display: 'flex' }} aria-hidden>≡</span>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
                    <input
                      type="checkbox"
                      checked={!!footerStatsVisibility[key]}
                      onChange={() => setFooterStatsVisibility((prev) => ({ ...prev, [key]: !prev[key] }))}
                      style={{ position: 'absolute', opacity: 0, width: 0, height: 0, margin: 0, pointerEvents: 'none' }}
                      aria-hidden
                    />
                    <span
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '4px',
                        border: '1px solid #6B7280',
                        backgroundColor: footerStatsVisibility[key] ? '#3B82F6' : '#374151',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {footerStatsVisibility[key] && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M1 4L4 7L9 1" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                  </label>
                    <span style={{ flex: 1, fontSize: '13px', color: '#FFFFFF' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        </>
        )}
      </>
    );
  }

  // Table mode view
  return (
    <>
      <style>{`
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
        <label style={{ fontSize: '0.85rem', color: isDarkMode ? '#D1D5DB' : '#4B5563' }}>Show:</label>
        <select
          value={selectionFilter}
          onChange={(e) => setSelectionFilter(e.target.value)}
          style={{
            height: '32px',
            borderRadius: '6px',
            border: '1px solid #D1D5DB',
            backgroundColor: isDarkMode ? '#111827' : '#FFFFFF',
            color: isDarkMode ? '#F9FAFB' : '#111827',
            padding: '6px 10px',
            fontSize: '0.85rem',
          }}
        >
          <option value="all">All</option>
          <option value="checked">Checked</option>
          <option value="unchecked">Unchecked</option>
        </select>
      </div>
      <div
      className={`${themeClasses.cardBg} ${themeClasses.border} border shadow-sm`}
      style={{ marginTop: '1.25rem', borderRadius: '6px', overflow: 'hidden' }}
    >
      <div style={{ 
        overflowX: 'auto', 
        overflowY: 'visible',
        width: '100%',
        WebkitOverflowScrolling: 'touch',
        position: 'relative',
      }}>
        <table
          style={{
            width: 'max-content',
            minWidth: '100%',
            borderCollapse: 'separate',
            borderSpacing: 0,
            tableLayout: 'fixed',
          }}
        >
          <thead className={themeClasses.headerBg}>
            <tr style={{ height: '40px', maxHeight: '40px' }}>
              {/* Sticky columns */}
              <th style={{ 
                padding: '0 0.75rem', 
                width: '40px', 
                minWidth: '40px',
                maxWidth: '40px',
                height: '40px',
                maxHeight: '40px',
                boxSizing: 'border-box',
                textAlign: 'center',
                position: 'sticky',
                left: 0,
                zIndex: 6,
                backgroundColor: '#1C2634',
                boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
                borderTopLeftRadius: '16px',
                borderRight: '1px solid #FFFFFF',
              }}>
                <input 
                  type="checkbox" 
                  style={{ cursor: 'pointer' }}
                  checked={allSelected}
                  ref={selectAllCheckboxRef}
                  onChange={handleSelectAll}
                />
              </th>
              <th 
                className="group"
                style={{ 
                  padding: '0 0.75rem', 
                  textAlign: 'center',
                  position: 'sticky',
                  left: '40px',
                  zIndex: 6,
                  backgroundColor: '#1C2634',
                  width: '150px',
                  minWidth: '150px',
                  maxWidth: '150px',
                  height: '40px',
                  maxHeight: '40px',
                  boxSizing: 'border-box',
                  boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 600,
                  fontSize: '12px',
                  lineHeight: '100%',
                  letterSpacing: '0%',
                  textTransform: 'uppercase',
                  color: (hasActiveColumnFilter('brand') || openFilterColumns.has('brand')) ? '#3B82F6' : '#FFFFFF',
                  borderRight: '1px solid #FFFFFF',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', position: 'relative' }}>
                  <span>BRAND</span>
                  <img
                    ref={(el) => {
                      if (el) filterIconRefs.current['brand'] = el;
                    }}
                    src="/assets/Vector (1).png"
                    alt="Filter"
                    className={`w-3 h-3 transition-opacity ${hasActiveColumnFilter('brand') || openFilterColumns.has('brand') ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    style={{ 
                      width: '12px', 
                      height: '12px',
                      cursor: 'pointer',
                      filter: hasActiveColumnFilter('brand') || openFilterColumns.has('brand') ? 'brightness(0) saturate(100%) invert(42%) sepia(93%) saturate(1352%) hue-rotate(196deg) brightness(95%) contrast(96%)' : 'none',
                    }}
                    onClick={(e) => handleFilterClick('brand', e)}
                  />
                </div>
              </th>
              <th 
                className="group"
                style={{ 
                  padding: '0 0.75rem', 
                  textAlign: 'center',
                  position: 'sticky',
                  left: '190px',
                  zIndex: 6,
                  backgroundColor: '#1C2634',
                  width: '200px',
                  minWidth: '200px',
                  maxWidth: '200px',
                  height: '40px',
                  maxHeight: '40px',
                  boxSizing: 'border-box',
                  boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 600,
                  fontSize: '12px',
                  lineHeight: '100%',
                  letterSpacing: '0%',
                  textTransform: 'uppercase',
                  color: (hasActiveColumnFilter('product') || openFilterColumns.has('product')) ? '#3B82F6' : '#FFFFFF',
                  borderRight: '1px solid #FFFFFF',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', position: 'relative' }}>
                  <span>PRODUCT</span>
                  <img
                    ref={(el) => {
                      if (el) filterIconRefs.current['product'] = el;
                    }}
                    src="/assets/Vector (1).png"
                    alt="Filter"
                    className={`w-3 h-3 transition-opacity ${hasActiveColumnFilter('product') || openFilterColumns.has('product') ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    style={{ 
                      width: '12px', 
                      height: '12px',
                      cursor: 'pointer',
                      filter: hasActiveColumnFilter('product') || openFilterColumns.has('product') ? 'brightness(0) saturate(100%) invert(42%) sepia(93%) saturate(1352%) hue-rotate(196deg) brightness(95%) contrast(96%)' : 'none',
                    }}
                    onClick={(e) => handleFilterClick('product', e)}
                  />
                </div>
              </th>
              <th 
                className="group"
                style={{ 
                  padding: '0 1rem', 
                  textAlign: 'center',
                  position: 'sticky',
                  left: '390px',
                  zIndex: 6,
                  backgroundColor: '#1C2634',
                  width: '120px',
                  minWidth: '120px',
                  maxWidth: '120px',
                  height: '40px',
                  maxHeight: '40px',
                  boxSizing: 'border-box',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 600,
                  fontSize: '12px',
                  lineHeight: '100%',
                  letterSpacing: '0%',
                  textTransform: 'uppercase',
                  color: (hasActiveColumnFilter('size') || openFilterColumns.has('size')) ? '#3B82F6' : '#FFFFFF',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', position: 'relative' }}>
                  <span>SIZE</span>
                  <img
                    ref={(el) => {
                      if (el) filterIconRefs.current['size'] = el;
                    }}
                    src="/assets/Vector (1).png"
                    alt="Filter"
                    className={`w-3 h-3 transition-opacity ${hasActiveColumnFilter('size') || openFilterColumns.has('size') ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    style={{ 
                      width: '12px', 
                      height: '12px',
                      cursor: 'pointer',
                      filter: hasActiveColumnFilter('size') || openFilterColumns.has('size') ? 'brightness(0) saturate(100%) invert(42%) sepia(93%) saturate(1352%) hue-rotate(196deg) brightness(95%) contrast(96%)' : 'none',
                    }}
                    onClick={(e) => handleFilterClick('size', e)}
                  />
                </div>
              </th>
              {/* Scrollable columns */}
              <th 
                className="group"
                style={{ 
                  padding: '0 1rem', 
                  textAlign: 'center', 
                  width: '143px',
                  height: '40px',
                  maxHeight: '40px',
                  borderRight: '1px solid #FFFFFF',
                  boxSizing: 'border-box',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 600,
                  fontSize: '12px',
                  lineHeight: '100%',
                  letterSpacing: '0%',
                  textTransform: 'uppercase',
                  color: (hasActiveColumnFilter('qty') || openFilterColumns.has('qty')) ? '#3B82F6' : '#FFFFFF',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <span>QTY</span>
                  <img
                    ref={(el) => {
                      if (el) filterIconRefs.current['qty'] = el;
                    }}
                    src="/assets/Vector (1).png"
                    alt="Filter"
                    className={`w-3 h-3 transition-opacity ${hasActiveColumnFilter('qty') || openFilterColumns.has('qty') ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    style={{ 
                      width: '12px', 
                      height: '12px',
                      cursor: 'pointer',
                      filter: hasActiveColumnFilter('qty') || openFilterColumns.has('qty') ? 'brightness(0) saturate(100%) invert(42%) sepia(93%) saturate(1352%) hue-rotate(196deg) brightness(95%) contrast(96%)' : 'none',
                    }}
                    onClick={(e) => handleFilterClick('qty', e)}
                  />
                </div>
              </th>
              <th 
                className="group"
                style={{ 
                  padding: '12px 16px', 
                  textAlign: 'center', 
                  width: '143px',
                  height: '40px',
                  maxHeight: '40px',
                  borderRight: '1px solid #FFFFFF',
                  boxSizing: 'border-box',
                  backgroundColor: '#1C2634',
                }}
              >
                <div style={{ position: 'relative', width: '100%' }}>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '2px',
                  }}>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      fontWeight: 700, 
                      lineHeight: 1.1, 
                      color: (hasActiveColumnFilter('fbaAvailable') || openFilterColumns.has('fbaAvailable')) ? '#3B82F6' : '#FFFFFF',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>INVENTORY</span>
                    <span style={{ 
                      fontSize: '0.6rem', 
                      fontWeight: 400, 
                      lineHeight: 1.1, 
                      color: (hasActiveColumnFilter('fbaAvailable') || openFilterColumns.has('fbaAvailable')) ? '#3B82F6' : '#FFFFFF',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>FBA AVAILABLE (DAYS)</span>
                  </div>
                  <img
                    ref={(el) => {
                      if (el) filterIconRefs.current['fbaAvailable'] = el;
                    }}
                    src="/assets/Vector (1).png"
                    alt="Filter"
                    className={`w-3 h-3 transition-opacity ${hasActiveColumnFilter('fbaAvailable') || openFilterColumns.has('fbaAvailable') ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    style={{ 
                      width: '12px', 
                      height: '12px',
                      position: 'absolute',
                      right: '0',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      cursor: 'pointer',
                      filter: hasActiveColumnFilter('fbaAvailable') || openFilterColumns.has('fbaAvailable') ? 'brightness(0) saturate(100%) invert(42%) sepia(93%) saturate(1352%) hue-rotate(196deg) brightness(95%) contrast(96%)' : 'none',
                    }}
                    onClick={(e) => handleFilterClick('fbaAvailable', e)}
                  />
                </div>
              </th>
              <th 
                className="group"
                style={{ 
                  padding: '12px 16px', 
                  textAlign: 'center', 
                  width: '143px',
                  height: '40px',
                  maxHeight: '40px',
                  borderRight: '1px solid #FFFFFF',
                  boxSizing: 'border-box',
                  backgroundColor: '#1C2634',
                }}
              >
                <div style={{ position: 'relative', width: '100%' }}>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '2px',
                  }}>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      fontWeight: 700, 
                      lineHeight: 1.1, 
                      color: (hasActiveColumnFilter('totalInventory') || openFilterColumns.has('totalInventory')) ? '#3B82F6' : '#FFFFFF',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>INVENTORY</span>
                    <span style={{ 
                      fontSize: '0.6rem', 
                      fontWeight: 400, 
                      lineHeight: 1.1, 
                      color: (hasActiveColumnFilter('totalInventory') || openFilterColumns.has('totalInventory')) ? '#3B82F6' : '#FFFFFF',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>TOTAL (DAYS)</span>
                  </div>
                  <img
                    ref={(el) => {
                      if (el) filterIconRefs.current['totalInventory'] = el;
                    }}
                    src="/assets/Vector (1).png"
                    alt="Filter"
                    className={`w-3 h-3 transition-opacity ${hasActiveColumnFilter('totalInventory') || openFilterColumns.has('totalInventory') ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    style={{ 
                      width: '12px', 
                      height: '12px',
                      position: 'absolute',
                      right: '0',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      cursor: 'pointer',
                      filter: hasActiveColumnFilter('totalInventory') || openFilterColumns.has('totalInventory') ? 'brightness(0) saturate(100%) invert(42%) sepia(93%) saturate(1352%) hue-rotate(196deg) brightness(95%) contrast(96%)' : 'none',
                    }}
                    onClick={(e) => handleFilterClick('totalInventory', e)}
                  />
                </div>
              </th>
              <th 
                className="group"
                style={{ 
                  padding: '12px 16px', 
                  textAlign: 'center', 
                  width: '143px',
                  height: '40px',
                  maxHeight: '40px',
                  borderRight: '1px solid #FFFFFF',
                  boxSizing: 'border-box',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 600,
                  fontSize: '12px',
                  lineHeight: '100%',
                  letterSpacing: '0%',
                  textTransform: 'uppercase',
                  color: (hasActiveColumnFilter('forecast') || openFilterColumns.has('forecast')) ? '#3B82F6' : '#FFFFFF',
                  backgroundColor: '#1C2634',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', position: 'relative' }}>
                  <span>FORECAST</span>
                  <img
                    ref={(el) => {
                      if (el) filterIconRefs.current['forecast'] = el;
                    }}
                    src="/assets/Vector (1).png"
                    alt="Filter"
                    className={`w-3 h-3 transition-opacity ${hasActiveColumnFilter('forecast') || openFilterColumns.has('forecast') ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    style={{ 
                      width: '12px', 
                      height: '12px',
                      cursor: 'pointer',
                      filter: hasActiveColumnFilter('forecast') || openFilterColumns.has('forecast') ? 'brightness(0) saturate(100%) invert(42%) sepia(93%) saturate(1352%) hue-rotate(196deg) brightness(95%) contrast(96%)' : 'none',
                    }}
                    onClick={(e) => handleFilterClick('forecast', e)}
                  />
                </div>
              </th>
              <th 
                className="group"
                style={{ 
                  padding: '12px 16px', 
                  textAlign: 'center', 
                  width: '143px',
                  height: '40px',
                  maxHeight: '40px',
                  borderRight: '1px solid #FFFFFF',
                  boxSizing: 'border-box',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 600,
                  fontSize: '12px',
                  lineHeight: '100%',
                  letterSpacing: '0%',
                  textTransform: 'uppercase',
                  color: (hasActiveColumnFilter('sales7Day') || openFilterColumns.has('sales7Day')) ? '#3B82F6' : '#FFFFFF',
                  backgroundColor: '#1C2634',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', position: 'relative' }}>
                  <span>7 DAY SALES</span>
                  <img
                    ref={(el) => {
                      if (el) filterIconRefs.current['sales7Day'] = el;
                    }}
                    src="/assets/Vector (1).png"
                    alt="Filter"
                    className={`w-3 h-3 transition-opacity ${hasActiveColumnFilter('sales7Day') || openFilterColumns.has('sales7Day') ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    style={{ 
                      width: '12px', 
                      height: '12px',
                      cursor: 'pointer',
                      filter: hasActiveColumnFilter('sales7Day') || openFilterColumns.has('sales7Day') ? 'brightness(0) saturate(100%) invert(42%) sepia(93%) saturate(1352%) hue-rotate(196deg) brightness(95%) contrast(96%)' : 'none',
                    }}
                    onClick={(e) => handleFilterClick('sales7Day', e)}
                  />
                </div>
              </th>
              <th 
                className="group"
                style={{ 
                  padding: '12px 16px', 
                  textAlign: 'center', 
                  width: '143px',
                  height: '40px',
                  maxHeight: '40px',
                  borderRight: '1px solid #FFFFFF',
                  boxSizing: 'border-box',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 600,
                  fontSize: '12px',
                  lineHeight: '100%',
                  letterSpacing: '0%',
                  textTransform: 'uppercase',
                  color: (hasActiveColumnFilter('sales30Day') || openFilterColumns.has('sales30Day')) ? '#3B82F6' : '#FFFFFF',
                  backgroundColor: '#1C2634',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', position: 'relative' }}>
                  <span>30 DAY SALES</span>
                  <img
                    ref={(el) => {
                      if (el) filterIconRefs.current['sales30Day'] = el;
                    }}
                    src="/assets/Vector (1).png"
                    alt="Filter"
                    className={`w-3 h-3 transition-opacity ${hasActiveColumnFilter('sales30Day') || openFilterColumns.has('sales30Day') ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    style={{ 
                      width: '12px', 
                      height: '12px',
                      cursor: 'pointer',
                      filter: hasActiveColumnFilter('sales30Day') || openFilterColumns.has('sales30Day') ? 'brightness(0) saturate(100%) invert(42%) sepia(93%) saturate(1352%) hue-rotate(196deg) brightness(95%) contrast(96%)' : 'none',
                    }}
                    onClick={(e) => handleFilterClick('sales30Day', e)}
                  />
                </div>
              </th>
              <th 
                className="group"
                style={{ 
                  padding: '12px 16px', 
                  textAlign: 'center', 
                  width: '143px',
                  height: '40px',
                  maxHeight: '40px',
                  borderRight: '1px solid #FFFFFF',
                  boxSizing: 'border-box',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 600,
                  fontSize: '12px',
                  lineHeight: '100%',
                  letterSpacing: '0%',
                  textTransform: 'uppercase',
                  color: (hasActiveColumnFilter('sales4Month') || openFilterColumns.has('sales4Month')) ? '#3B82F6' : '#FFFFFF',
                  backgroundColor: '#1C2634',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', position: 'relative' }}>
                  <span>4 MONTH SALES</span>
                  <img
                    ref={(el) => {
                      if (el) filterIconRefs.current['sales4Month'] = el;
                    }}
                    src="/assets/Vector (1).png"
                    alt="Filter"
                    className={`w-3 h-3 transition-opacity ${hasActiveColumnFilter('sales4Month') || openFilterColumns.has('sales4Month') ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    style={{ 
                      width: '12px', 
                      height: '12px',
                      cursor: 'pointer',
                      filter: hasActiveColumnFilter('sales4Month') || openFilterColumns.has('sales4Month') ? 'brightness(0) saturate(100%) invert(42%) sepia(93%) saturate(1352%) hue-rotate(196deg) brightness(95%) contrast(96%)' : 'none',
                    }}
                    onClick={(e) => handleFilterClick('sales4Month', e)}
                  />
                </div>
              </th>
              <th 
                className="group"
                style={{ 
                  padding: '12px 16px', 
                  textAlign: 'center', 
                  width: '143px',
                  height: '40px',
                  maxHeight: '40px',
                  borderRight: '1px solid #FFFFFF',
                  boxSizing: 'border-box',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 600,
                  fontSize: '12px',
                  lineHeight: '100%',
                  letterSpacing: '0%',
                  textTransform: 'uppercase',
                  color: (hasActiveColumnFilter('formula') || openFilterColumns.has('formula')) ? '#3B82F6' : '#FFFFFF',
                  backgroundColor: '#1C2634',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', position: 'relative' }}>
                  <span>FORMULA</span>
                  <img
                    ref={(el) => {
                      if (el) filterIconRefs.current['formula'] = el;
                    }}
                    src="/assets/Vector (1).png"
                    alt="Filter"
                    className={`w-3 h-3 transition-opacity ${hasActiveColumnFilter('formula') || openFilterColumns.has('formula') ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    style={{ 
                      width: '12px', 
                      height: '12px',
                      cursor: 'pointer',
                      filter: hasActiveColumnFilter('formula') || openFilterColumns.has('formula') ? 'brightness(0) saturate(100%) invert(42%) sepia(93%) saturate(1352%) hue-rotate(196deg) brightness(95%) contrast(96%)' : 'none',
                    }}
                    onClick={(e) => handleFilterClick('formula', e)}
                  />
                </div>
              </th>
              <th 
                className="group"
                style={{ 
                  padding: '12px 16px', 
                  textAlign: 'center', 
                  width: '143px',
                  height: '40px',
                  maxHeight: '40px',
                  borderRight: '1px solid #FFFFFF',
                  boxSizing: 'border-box',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 600,
                  fontSize: '12px',
                  lineHeight: '100%',
                  letterSpacing: '0%',
                  textTransform: 'uppercase',
                  color: '#FFFFFF',
                  backgroundColor: '#1C2634',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', position: 'relative', width: '100%' }}>
                  <span style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px',
                    color: (hasActiveColumnFilter('bottles') || openFilterColumns.has('bottles')) ? '#3B82F6' : '#FFFFFF',
                  }}>
                    BOTTLES
                    {(hasActiveColumnFilter('bottles') || openFilterColumns.has('bottles')) && (
                      <span style={{ 
                        display: 'inline-block',
                        width: '6px', 
                        height: '6px', 
                        borderRadius: '50%', 
                        backgroundColor: '#10B981',
                      }} />
                    )}
                  </span>
                  <img
                    src="/assets/Vector (1).png"
                    alt="Filter"
                    className={`w-3 h-3 transition-opacity ${hasActiveColumnFilter('bottles') || openFilterColumns.has('bottles') ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    ref={(el) => {
                      if (el) filterIconRefs.current['bottles'] = el;
                    }}
                    onClick={(e) => handleFilterClick('bottles', e)}
                    style={{ 
                      width: '12px', 
                      height: '12px',
                      cursor: 'pointer',
                      filter: hasActiveColumnFilter('bottles') || openFilterColumns.has('bottles') ? 'brightness(0) saturate(100%) invert(42%) sepia(93%) saturate(1352%) hue-rotate(196deg) brightness(95%) contrast(96%)' : 'none',
                      position: 'absolute',
                      right: '0',
                    }}
                  />
                </div>
              </th>
              <th 
                className="group"
                style={{ 
                  padding: '12px 16px', 
                  textAlign: 'center', 
                  width: '143px',
                  height: '40px',
                  maxHeight: '40px',
                  borderRight: '1px solid #FFFFFF',
                  boxSizing: 'border-box',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 600,
                  fontSize: '12px',
                  lineHeight: '100%',
                  letterSpacing: '0%',
                  textTransform: 'uppercase',
                  color: '#FFFFFF',
                  backgroundColor: '#1C2634',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <span style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px',
                    color: (hasActiveColumnFilter('closures') || openFilterColumns.has('closures')) ? '#3B82F6' : '#FFFFFF',
                  }}>
                    CLOSURES
                    {(hasActiveColumnFilter('closures') || openFilterColumns.has('closures')) && (
                      <span style={{ 
                        display: 'inline-block',
                        width: '6px', 
                        height: '6px', 
                        borderRadius: '50%', 
                        backgroundColor: '#10B981',
                      }} />
                    )}
                  </span>
                  <img
                    src="/assets/Vector (1).png"
                    alt="Filter"
                    className={`w-3 h-3 transition-opacity ${hasActiveColumnFilter('closures') || openFilterColumns.has('closures') ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    ref={(el) => {
                      if (el) filterIconRefs.current['closures'] = el;
                    }}
                    onClick={(e) => handleFilterClick('closures', e)}
                    style={{ 
                      width: '12px', 
                      height: '12px',
                      cursor: 'pointer',
                      filter: hasActiveColumnFilter('closures') || openFilterColumns.has('closures') ? 'brightness(0) saturate(100%) invert(42%) sepia(93%) saturate(1352%) hue-rotate(196deg) brightness(95%) contrast(96%)' : 'none',
                    }}
                  />
                </div>
              </th>
              <th 
                className="group"
                style={{ 
                  padding: '12px 16px', 
                  textAlign: 'center', 
                  width: '143px',
                  height: '40px',
                  maxHeight: '40px',
                  borderRight: '1px solid #FFFFFF',
                  boxSizing: 'border-box',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 600,
                  fontSize: '12px',
                  lineHeight: '100%',
                  letterSpacing: '0%',
                  textTransform: 'uppercase',
                  color: '#FFFFFF',
                  backgroundColor: '#1C2634',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <span style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px',
                    color: (hasActiveColumnFilter('boxes') || openFilterColumns.has('boxes')) ? '#3B82F6' : '#FFFFFF',
                  }}>
                    BOXES
                    {(hasActiveColumnFilter('boxes') || openFilterColumns.has('boxes')) && (
                      <span style={{ 
                        display: 'inline-block',
                        width: '6px', 
                        height: '6px', 
                        borderRadius: '50%', 
                        backgroundColor: '#10B981',
                      }} />
                    )}
                  </span>
                  <img
                    src="/assets/Vector (1).png"
                    alt="Filter"
                    className={`w-3 h-3 transition-opacity ${hasActiveColumnFilter('boxes') || openFilterColumns.has('boxes') ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    ref={(el) => {
                      if (el) filterIconRefs.current['boxes'] = el;
                    }}
                    onClick={(e) => handleFilterClick('boxes', e)}
                    style={{ 
                      width: '12px', 
                      height: '12px',
                      cursor: 'pointer',
                      filter: hasActiveColumnFilter('boxes') || openFilterColumns.has('boxes') ? 'brightness(0) saturate(100%) invert(42%) sepia(93%) saturate(1352%) hue-rotate(196deg) brightness(95%) contrast(96%)' : 'none',
                    }}
                  />
                </div>
              </th>
              <th 
                className="group"
                style={{ 
                  padding: '12px 16px', 
                  textAlign: 'center', 
                  width: '143px',
                  height: '40px',
                  maxHeight: '40px',
                  borderRight: '1px solid #FFFFFF',
                  boxSizing: 'border-box',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 600,
                  fontSize: '12px',
                  lineHeight: '100%',
                  letterSpacing: '0%',
                  textTransform: 'uppercase',
                  color: '#FFFFFF',
                  backgroundColor: '#1C2634',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <span style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px',
                    color: (hasActiveColumnFilter('labels') || openFilterColumns.has('labels')) ? '#3B82F6' : '#FFFFFF',
                  }}>
                    LABELS
                    {(hasActiveColumnFilter('labels') || openFilterColumns.has('labels')) && (
                      <span style={{ 
                        display: 'inline-block',
                        width: '6px', 
                        height: '6px', 
                        borderRadius: '50%', 
                        backgroundColor: '#10B981',
                      }} />
                    )}
                  </span>
                  <img
                    src="/assets/Vector (1).png"
                    alt="Filter"
                    className={`w-3 h-3 transition-opacity ${hasActiveColumnFilter('labels') || openFilterColumns.has('labels') ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    ref={(el) => {
                      if (el) filterIconRefs.current['labels'] = el;
                    }}
                    onClick={(e) => handleFilterClick('labels', e)}
                    style={{ 
                      width: '12px', 
                      height: '12px',
                      cursor: 'pointer',
                      filter: hasActiveColumnFilter('labels') || openFilterColumns.has('labels') ? 'brightness(0) saturate(100%) invert(42%) sepia(93%) saturate(1352%) hue-rotate(196deg) brightness(95%) contrast(96%)' : 'none',
                    }}
                  />
                </div>
              </th>
              {/* Sticky three dots */}
              <th style={{ 
                padding: '0 1rem', 
                width: '40px',
                height: '40px',
                maxHeight: '40px',
                boxSizing: 'border-box',
                textAlign: 'center',
                position: 'sticky',
                right: 0,
                zIndex: 6,
                backgroundColor: '#1C2634',
                boxShadow: '-2px 0 4px rgba(0,0,0,0.1)',
                borderRight: '1px solid #FFFFFF',
                borderTopRightRadius: '16px',
              }}>
                <span style={{ color: '#FFFFFF', fontSize: '1rem' }}>⋮</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {currentRows.map((row) => {
              const index = row._originalIndex;
              return (
              <tr key={`${row.id}-${index}`} style={{ height: '40px', maxHeight: '40px' }}>
                {/* Sticky columns */}
                <td style={{ 
                  padding: '0.65rem 0.75rem', 
                  textAlign: 'center',
                  position: 'sticky',
                  left: 0,
                  zIndex: 5,
                  backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                  width: '40px',
                  minWidth: '40px',
                  maxWidth: '40px',
                  height: '40px',
                  verticalAlign: 'middle',
                  boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
                  borderTop: '1px solid #E5E7EB',
                }}>
                  <input 
                    type="checkbox" 
                    style={{ cursor: 'pointer' }}
                    checked={selectedRows.has(row.id)}
                    onChange={(e) => handleRowSelect(row.id, e)}
                  />
                </td>
                <td style={{ 
                  padding: '0.65rem 0.75rem', 
                  fontSize: '0.85rem',
                  textAlign: 'center',
                  position: 'sticky',
                  left: '40px',
                  zIndex: 5,
                  backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                  width: '150px',
                  minWidth: '150px',
                  maxWidth: '150px',
                  height: '40px',
                  verticalAlign: 'middle',
                  boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
                  borderTop: '1px solid #E5E7EB',
                }} className={themeClasses.text}>
                  {row.brand}
                </td>
                <td style={{ 
                  padding: '0.65rem 0.75rem', 
                  fontSize: '0.85rem',
                  textAlign: 'center',
                  position: 'sticky',
                  left: '190px',
                  zIndex: 5,
                  backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                  height: '40px',
                  verticalAlign: 'middle',
                  width: '200px',
                  minWidth: '200px',
                  maxWidth: '200px',
                  boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
                  borderTop: '1px solid #E5E7EB',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => onProductClick(row)}
                      className="text-xs text-blue-500 hover:text-blue-600"
                      style={{ textDecoration: 'underline', cursor: 'pointer' }}
                    >
                      {row.product.length > 18 ? `${row.product.substring(0, 18)}...` : row.product}
                    </button>
                    {topSellerIds.has(row.id) && (
                      <span
                        style={{
                          fontSize: '9px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.02em',
                          color: '#B45309',
                          backgroundColor: '#FEF3C7',
                          padding: '2px 6px',
                          borderRadius: '6px',
                        }}
                        title="Top 2 by 7-day (last week) & 30-day sales"
                      >
                        Best Seller
                      </span>
                    )}
                  </div>
                </td>
                <td style={{ 
                  padding: '0.65rem 1rem', 
                  fontSize: '0.85rem',
                  textAlign: 'center',
                  position: 'sticky',
                  left: '390px',
                  zIndex: 5,
                  backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                  width: '120px',
                  minWidth: '120px',
                  maxWidth: '120px',
                  height: '40px',
                  verticalAlign: 'middle',
                  borderTop: '1px solid #E5E7EB',
                  borderRight: 'none',
                }} className={themeClasses.textSecondary}>
                  {row.size}
                </td>
                {/* Scrollable columns */}
                <td style={{ 
                  padding: '0.65rem 1rem', 
                  textAlign: 'center',
                  width: '143px',
                  height: '40px',
                  verticalAlign: 'middle',
                  boxSizing: 'border-box',
                  borderTop: '1px solid #E5E7EB',
                  borderLeft: 'none',
                }}>
                  <div style={{ position: 'relative', display: 'block' }}>
                    <div
                      ref={(el) => {
                        if (el) qtyContainerRefs.current[index] = el;
                      }}
                      onMouseEnter={() => setHoveredQtyIndex(index)}
                      onMouseLeave={() => setHoveredQtyIndex(null)}
                      title={isQtyExceedingLabels(row, index) ? `Exceeds available labels (${getAvailableLabelsForRow(row, index).toLocaleString()} available)` : ''}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        backgroundColor: isQtyExceedingLabels(row, index) 
                          ? (isDarkMode ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.05)')
                          : (isDarkMode ? '#1F2937' : '#FFFFFF'),
                        borderRadius: '6px',
                        border: isQtyExceedingLabels(row, index) 
                          ? '1px solid #EF4444' 
                          : (isDarkMode ? '1px solid #4B5563' : '1px solid #D1D5DB'),
                        padding: '4px 6px',
                        width: '107px',
                        height: '24px',
                        boxSizing: 'border-box',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      {(() => {
                        const forecastValue = row.weeklyForecast || row.forecast || 0;
                        const qtyValue = effectiveQtyValues[index];
                        // Only show reset if value has been manually edited by user and differs from forecast
                        const isValueSet = qtyValue !== undefined && qtyValue !== null && qtyValue !== '';
                        const isManuallyEdited = manuallyEditedIndices.current.has(index);
                        const currentQty = typeof qtyValue === 'number' 
                          ? qtyValue 
                          : isValueSet 
                            ? parseInt(qtyValue, 10) || 0
                            : 0;
                        const hasChanged = isValueSet && isManuallyEdited && currentQty !== forecastValue;
                        
                        return hasChanged ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              effectiveSetQtyValues(prev => ({
                                ...prev,
                                [index]: forecastValue,
                              }));
                              // Remove from manually edited set when reset to forecast
                              manuallyEditedIndices.current.delete(index);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: 'none',
                              backgroundColor: 'transparent',
                              cursor: 'pointer',
                              padding: 0,
                              margin: 0,
                              flexShrink: 0,
                            }}
                          >
                            <img
                              src="/assets/reset.png"
                              alt="Reset quantity"
                              style={{
                                display: 'block',
                                width: '9px',
                                height: '9px',
                                objectFit: 'contain',
                              }}
                            />
                          </button>
                        ) : null;
                      })()}
                      <input
                        key={`qty-input-${index}`}
                        ref={(el) => {
                          if (el) qtyInputRefs.current[index] = el;
                        }}
                        type="number"
                        min="0"
                        step={(() => {
                          const size = row.size?.toLowerCase() || '';
                          if (size.includes('8oz')) return 60;
                          if (size.includes('quart')) return 12;
                          if (size.includes('gallon')) return 4;
                          return 1;
                        })()}
                        data-row-index={index}
                        value={(() => {
                          // Show raw input value while typing, otherwise show rounded value
                          if (rawQtyInputValues.current[index] !== undefined) {
                            return rawQtyInputValues.current[index];
                          }
                          const qtyValue = effectiveQtyValues[index];
                          return qtyValue !== undefined && qtyValue !== null && qtyValue !== '' ? String(qtyValue) : '';
                        })()}
                        onChange={(e) => {
                          const inputValue = e.target.value;
                          // Mark this field as manually edited
                          manuallyEditedIndices.current.add(index);
                          
                          // Store raw input value (no rounding while typing)
                          if (inputValue === '' || inputValue === '-') {
                            rawQtyInputValues.current[index] = '';
                          } else {
                            // Store raw value for display while typing
                            rawQtyInputValues.current[index] = inputValue;
                          }
                          // Force a minimal re-render to update the input value
                          setQtyInputUpdateTrigger(prev => prev + 1);
                        }}
                        onBlur={(e) => {
                          const inputValue = e.target.value;
                          // Round and validate when user finishes typing
                          if (inputValue === '' || inputValue === '-') {
                            rawQtyInputValues.current[index] = undefined;
                            effectiveSetQtyValues(prev => ({
                              ...prev,
                              [index]: ''
                            }));
                          } else {
                            const numValue = parseInt(inputValue, 10);
                            if (!isNaN(numValue) && numValue >= 0) {
                              // No rounding - use value as-is
                              rawQtyInputValues.current[index] = undefined; // Clear raw value
                              effectiveSetQtyValues(prev => ({
                                ...prev,
                                [index]: numValue
                              }));
                            } else {
                              // Invalid input, clear it
                              rawQtyInputValues.current[index] = undefined;
                              effectiveSetQtyValues(prev => ({
                                ...prev,
                                [index]: ''
                              }));
                            }
                          }
                          
                          // Close popup if open when blurring
                          if (clickedQtyIndex === index) {
                            setClickedQtyIndex(null);
                          }
                        }}
                        onKeyDown={(e) => {
                          // Round and validate when user presses Enter
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const inputValue = e.target.value;
                            if (inputValue === '' || inputValue === '-') {
                              rawQtyInputValues.current[index] = undefined;
                              effectiveSetQtyValues(prev => ({
                                ...prev,
                                [index]: ''
                              }));
                            } else {
                              const numValue = parseInt(inputValue, 10);
                              if (!isNaN(numValue) && numValue >= 0) {
                                // No rounding - use value as-is
                                rawQtyInputValues.current[index] = undefined; // Clear raw value
                                effectiveSetQtyValues(prev => ({
                                  ...prev,
                                  [index]: numValue
                                }));
                              } else {
                                // Invalid input, clear it
                                rawQtyInputValues.current[index] = undefined;
                                effectiveSetQtyValues(prev => ({
                                  ...prev,
                                  [index]: ''
                                }));
                              }
                            }
                            e.target.blur(); // Remove focus after Enter
                          }
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const labelsAvailable = getAvailableLabelsForRow(row, index);
                          const labelsNeeded = effectiveQtyValues[index] ?? 0;
                          // Only show popup if labels needed exceed available
                          if (labelsNeeded > labelsAvailable) {
                            // Toggle popup: close if already open, open if closed
                            setClickedQtyIndex(clickedQtyIndex === index ? null : index);
                          }
                        }}
                        style={{
                          width: '100%',
                          height: '100%',
                          flex: 1,
                          border: 'none',
                          outline: 'none',
                          backgroundColor: 'transparent',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          color: isDarkMode ? '#FFFFFF' : '#111827',
                          textAlign: 'center',
                          padding: 0,
                          margin: 0,
                          MozAppearance: 'textfield',
                          WebkitAppearance: 'none',
                          minWidth: 0,
                        }}
                        onFocus={(e) => {
                          e.target.select();
                        }}
                        onWheel={(e) => {
                          e.target.blur();
                        }}
                      />
                      {hoveredQtyIndex === index && (
                        <div
                          style={{
                            position: 'absolute',
                            right: '2px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0',
                            height: '20px',
                            width: '14px',
                          }}
                        >
                          {/* Up / down controls */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              const currentQty = effectiveQtyValues[index] ?? 0;
                              const numQty =
                                typeof currentQty === 'number'
                                  ? currentQty
                                  : currentQty === '' ||
                                    currentQty === null ||
                                    currentQty === undefined
                                  ? 0
                                  : parseInt(currentQty, 10) || 0;
                              
                              // Use size-based increment (e.g. 60 units for 8oz)
                              const increment = getQtyIncrement(rows[index] || currentRows.find(r => r._originalIndex === index) || {});
                              
                              const newQty = Math.max(0, numQty + increment);
                              // Mark as manually edited since user clicked increment button
                              manuallyEditedIndices.current.add(index);
                              effectiveSetQtyValues(prev => ({
                                ...prev,
                                [index]: newQty,
                              }));
                            }}
                            style={{
                              width: '100%',
                              height: '50%',
                              border: 'none',
                              backgroundColor: 'transparent',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: 0,
                              margin: 0,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#F3F4F6';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <svg
                              width="8"
                              height="8"
                              viewBox="0 0 8 8"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path d="M4 2L6 5H2L4 2Z" fill="#6B7280" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              const currentQty = effectiveQtyValues[index] ?? 0;
                              const numQty =
                                typeof currentQty === 'number'
                                  ? currentQty
                                  : currentQty === '' ||
                                    currentQty === null ||
                                    currentQty === undefined
                                  ? 0
                                  : parseInt(currentQty, 10) || 0;
                              
                              // Stop at 0 - don't allow going negative
                              if (numQty <= 0) {
                                return;
                              }
                              
                              // Use size-based increment (e.g. 60 units for 8oz)
                              const increment = getQtyIncrement(rows[index] || currentRows.find(r => r._originalIndex === index) || {});
                              
                              const newQty = Math.max(0, numQty - increment);
                              // Mark as manually edited since user clicked decrement button
                              manuallyEditedIndices.current.add(index);
                              effectiveSetQtyValues(prev => ({
                                ...prev,
                                [index]: newQty,
                              }));
                            }}
                            style={{
                              width: '100%',
                              height: '50%',
                              border: 'none',
                              backgroundColor: 'transparent',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: 0,
                              margin: 0,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#F3F4F6';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <svg
                              width="8"
                              height="8"
                              viewBox="0 0 8 8"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path d="M4 6L2 3H6L4 6Z" fill="#6B7280" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                    {/* Label warning icon - shown when QTY exceeds labels, positioned absolutely to not affect alignment */}
                    {(() => {
                      const labelsAvailable = getAvailableLabelsForRow(row, index);
                      const labelsNeeded = effectiveQtyValues[index] ?? 0;
                      // Only show warning if labels needed exceed available
                      if (labelsNeeded > labelsAvailable && labelsNeeded > 0) {
                        return (
                          <>
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                setClickedQtyIndex(clickedQtyIndex === index ? null : index);
                              }}
                              onMouseEnter={() => setHoveredWarningIndex(index)}
                              onMouseLeave={() => setHoveredWarningIndex(null)}
                              style={{
                                position: 'absolute',
                                left: '119px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '18px',
                                height: '18px',
                                borderRadius: '50%',
                                backgroundColor: '#FEE2E2',
                                color: '#DC2626',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                zIndex: 10,
                              }}
                            >
                              !
                            </span>
                            {/* Custom tooltip for warning icon */}
                            {hoveredWarningIndex === index && (
                              <div
                                style={{
                                  position: 'absolute',
                                  left: '64px', // 55px to the left of the warning icon (119px - 55px)
                                  top: '50%',
                                  transform: 'translateY(calc(-50% - 30px))',
                                  backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                                  color: isDarkMode ? '#E5E7EB' : '#111827',
                                  padding: '6px 10px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 500,
                                  whiteSpace: 'nowrap',
                                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                                  border: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
                                  zIndex: 9,
                                  pointerEvents: 'none',
                                }}
                              >
                                Labels Available: {labelsAvailable.toLocaleString()}
                              </div>
                            )}
                          </>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </td>
                <td style={{ 
                  padding: '12px 16px', 
                  fontSize: '0.85rem', 
                  textAlign: 'center', 
                  width: '143px',
                  height: '40px',
                  verticalAlign: 'middle',
                  boxSizing: 'border-box',
                  borderTop: '1px solid #E5E7EB',
                  fontWeight: 600,
                  color: (() => {
                    const fbaVal = Number(row.doiFba ?? row.doiTotal) || 0;
                    return fbaVal >= 30 ? '#22C55E' : fbaVal >= 20 ? '#F97316' : '#EF4444';
                  })(),
                }}>
                  {row.doiFba || row.doiTotal || 0}
                </td>
                {(() => {
                  const totalInv = Number(row.totalInventory ?? row.doiTotal ?? row.daysOfInventory) || 0;
                  return (
                    <td style={{ 
                      padding: '12px 16px', 
                      fontSize: '0.85rem', 
                      textAlign: 'center', 
                      width: '143px',
                      height: '40px',
                      verticalAlign: 'middle',
                      boxSizing: 'border-box',
                      borderTop: '1px solid #E5E7EB',
                      fontWeight: 600,
                      color: isDarkMode ? '#FFFFFF' : '#111827',
                    }}>
                      {(row.totalInventory ?? row.doiTotal ?? row.daysOfInventory ?? 0).toLocaleString()}
                    </td>
                  );
                })()}
                <td style={{ 
                  padding: '12px 16px', 
                  fontSize: '0.85rem', 
                  textAlign: 'center', 
                  width: '143px',
                  height: '40px',
                  verticalAlign: 'middle',
                  boxSizing: 'border-box',
                  borderTop: '1px solid #E5E7EB',
                  fontWeight: 600,
                  color: '#3B82F6', // Blue - matches Forecast legend
                }}>
                  {row.weeklyForecast || row.forecast || 0}
                </td>
                <td style={{ 
                  padding: '12px 16px', 
                  fontSize: '0.85rem', 
                  textAlign: 'center', 
                  width: '143px',
                  height: '40px',
                  verticalAlign: 'middle',
                  boxSizing: 'border-box',
                  borderTop: '1px solid #E5E7EB',
                }} className={themeClasses.text}>
                  {row.sales7Day || 0}
                </td>
                <td style={{ 
                  padding: '12px 16px', 
                  fontSize: '0.85rem', 
                  textAlign: 'center', 
                  width: '143px',
                  height: '40px',
                  verticalAlign: 'middle',
                  boxSizing: 'border-box',
                  borderTop: '1px solid #E5E7EB',
                }} className={themeClasses.text}>
                  {row.sales30Day || 0}
                </td>
                <td style={{ 
                  padding: '12px 16px', 
                  fontSize: '0.85rem', 
                  textAlign: 'center', 
                  width: '143px',
                  height: '40px',
                  verticalAlign: 'middle',
                  boxSizing: 'border-box',
                  borderTop: '1px solid #E5E7EB',
                }} className={themeClasses.text}>
                  {Math.round((row.sales30Day || 0) * 4)}
                </td>
                <td style={{ 
                  padding: '12px 16px', 
                  fontSize: '0.85rem', 
                  textAlign: 'center', 
                  width: '143px',
                  height: '40px',
                  verticalAlign: 'middle',
                  boxSizing: 'border-box',
                  borderTop: '1px solid #E5E7EB',
                }} className={themeClasses.text}>
                  {row.formula_name || ''}
                </td>
                <td style={{ 
                  padding: '12px 16px', 
                  fontSize: '0.85rem', 
                  textAlign: 'center', 
                  width: '143px',
                  height: '40px',
                  verticalAlign: 'middle',
                  boxSizing: 'border-box',
                  borderTop: '1px solid #E5E7EB',
                }} className={themeClasses.text}>
                  {row.bottleInventory || row.bottle_inventory || 0}
                </td>
                <td style={{ 
                  padding: '12px 16px', 
                  fontSize: '0.85rem', 
                  textAlign: 'center', 
                  width: '143px',
                  height: '40px',
                  verticalAlign: 'middle',
                  boxSizing: 'border-box',
                  borderTop: '1px solid #E5E7EB',
                }} className={themeClasses.text}>
                  {row.closureInventory || row.closure_inventory || 0}
                </td>
                <td style={{ 
                  padding: '12px 16px', 
                  fontSize: '0.85rem', 
                  textAlign: 'center', 
                  width: '143px',
                  height: '40px',
                  verticalAlign: 'middle',
                  boxSizing: 'border-box',
                  borderTop: '1px solid #E5E7EB',
                }} className={themeClasses.text}>
                  {row.boxInventory || row.box_inventory || 0}
                </td>
                <td style={{ 
                  padding: '12px 16px', 
                  fontSize: '0.85rem', 
                  textAlign: 'center', 
                  width: '143px',
                  height: '40px',
                  verticalAlign: 'middle',
                  boxSizing: 'border-box',
                  borderTop: '1px solid #E5E7EB',
                }} className={themeClasses.text}>
                  {row.labelsAvailable || row.label_inventory || row.labels_available || 0}
                </td>
                {/* Sticky three dots */}
                <td style={{ 
                  padding: '0.65rem 1rem', 
                  textAlign: 'center',
                  position: 'sticky',
                  right: 0,
                  zIndex: 5,
                  backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                  height: '40px',
                  verticalAlign: 'middle',
                  boxShadow: '-2px 0 4px rgba(0,0,0,0.1)',
                  borderTop: '1px solid #E5E7EB',
                }}>
                  <button
                    type="button"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: isDarkMode ? '#9CA3AF' : '#6B7280',
                      cursor: 'pointer',
                      fontSize: '1rem',
                    }}
                  >
                    ⋮
                  </button>
                </td>
              </tr>
            ); })}
          </tbody>
        </table>
      </div>
    </div>
    
      {/* Timeline Filter Modal for Table Mode (DOI Goal) */}
    {openFilterIndex === 'doi-goal' && (
      <TimelineFilterDropdown
        ref={(el) => {
          if (el) filterModalRefs.current['doi-goal'] = el;
        }}
        filterIconRef={filterRefs.current['doi-goal']}
        onClose={() => setOpenFilterIndex(null)}
        onApply={handleFilterApply}
        onReset={handleFilterReset}
        currentFilters={activeFilters}
      />
    )}

    {/* Column Filter Dropdowns for all columns */}
    {Array.from(openFilterColumns).map((columnKey) => {
      if (!filterIconRefs.current[columnKey]) return null;
      return (
        <SortFormulasFilterDropdown
          key={columnKey}
          ref={(el) => {
            if (el) filterDropdownRefs.current[columnKey] = el;
            else delete filterDropdownRefs.current[columnKey];
          }}
          filterIconRef={filterIconRefs.current[columnKey]}
          columnKey={columnKey}
          availableValues={getColumnValues(columnKey)}
          currentFilter={columnFilters[columnKey] || {}}
          currentSort={getColumnSortOrder(columnKey)}
          onApply={(filterData) => handleApplyColumnFilter(columnKey, filterData)}
          onClose={() => {
            setOpenFilterColumns((prev) => {
              const next = new Set(prev);
              next.delete(columnKey);
              return next;
            });
          }}
        />
      );
    })}

      {!hideFooter && (
      <>
      {/* Footer */}
      <div
        style={{
          position: 'fixed',
          bottom: '16px',
          left: `calc(${sidebarWidth}px + (100vw - ${sidebarWidth}px) / 2 - 125px)`,
          transform: 'translateX(-50%)',
          width: 'fit-content',
          minWidth: '1014px',
          height: '65px',
          backgroundColor: isDarkMode ? 'rgba(31, 41, 55, 0.85)' : 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
          borderRadius: '32px',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '32px',
          zIndex: 1000,
          transition: 'left 300ms cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 -2px 4px -1px rgba(0, 0, 0, 0.06)',
        }}
      >
        <div style={{ display: 'flex', gap: '48px', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          {footerStatsVisibility.products && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 400, color: isDarkMode ? '#9CA3AF' : '#9CA3AF', textAlign: 'center' }}>PRODUCTS</span>
              <span style={{ fontSize: '18px', fontWeight: 700, color: isDarkMode ? '#FFFFFF' : '#000000', textAlign: 'center' }}>{totalProducts}</span>
            </div>
          )}
          {footerStatsVisibility.palettes && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 400, color: isDarkMode ? '#9CA3AF' : '#9CA3AF', textAlign: 'center' }}>PALETTES</span>
              <span style={{ fontSize: '18px', fontWeight: 700, color: isDarkMode ? '#FFFFFF' : '#000000', textAlign: 'center' }}>{totalPalettes.toFixed(2)}</span>
            </div>
          )}
          {footerStatsVisibility.boxes && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 400, color: isDarkMode ? '#9CA3AF' : '#9CA3AF', textAlign: 'center' }}>BOXES</span>
              <span style={{ fontSize: '18px', fontWeight: 700, color: isDarkMode ? '#FFFFFF' : '#000000', textAlign: 'center' }}>{Math.ceil(totalBoxes).toLocaleString()}</span>
            </div>
          )}
          {footerStatsVisibility.units && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 400, color: isDarkMode ? '#9CA3AF' : '#9CA3AF', textAlign: 'center' }}>UNITS</span>
              <span style={{ fontSize: '18px', fontWeight: 700, color: isDarkMode ? '#FFFFFF' : '#000000', textAlign: 'center' }}>{totalUnits.toLocaleString()}</span>
            </div>
          )}
          {footerStatsVisibility.timeHours && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 400, color: isDarkMode ? '#9CA3AF' : '#9CA3AF', textAlign: 'center', whiteSpace: 'nowrap' }}>TIME (HRS)</span>
              <span style={{ fontSize: '18px', fontWeight: 700, color: isDarkMode ? '#FFFFFF' : '#000000', textAlign: 'center' }}>{totalTimeHours.toFixed(2)}</span>
            </div>
          )}
          {footerStatsVisibility.weightLbs && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 400, color: isDarkMode ? '#9CA3AF' : '#9CA3AF', textAlign: 'center', whiteSpace: 'nowrap' }}>WEIGHT (LBS)</span>
              <span style={{ fontSize: '18px', fontWeight: 700, color: isDarkMode ? '#FFFFFF' : '#000000', textAlign: 'center' }}>{Math.round(totalWeightLbs).toLocaleString()}</span>
            </div>
          )}
          {footerStatsVisibility.formulas && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 400, color: isDarkMode ? '#9CA3AF' : '#9CA3AF', textAlign: 'center' }}>FORMULAS</span>
              <span style={{ fontSize: '18px', fontWeight: 700, color: isDarkMode ? '#FFFFFF' : '#000000', textAlign: 'center' }}>{totalFormulas}</span>
            </div>
          )}
        </div>
        {(onClear || onExport) && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {onClear && (
              <button
                type="button"
                onClick={onClear}
                style={{
                  height: '31px',
                  padding: '0 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: isDarkMode ? '#9CA3AF' : '#6B7280',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                Clear
              </button>
            )}
            {onExport && (
              <>
                <button
                  type="button"
                  onClick={onExport}
                  style={{
                    height: '31px',
                    padding: '0 10px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: (addedRows && addedRows.size > 0) ? '#3B82F6' : '#9CA3AF',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: (addedRows && addedRows.size > 0) ? 'pointer' : 'not-allowed',
                    transition: 'background-color 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onMouseEnter={(e) => {
                    if (addedRows && addedRows.size > 0) {
                      e.currentTarget.style.backgroundColor = '#2563EB';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (addedRows && addedRows.size > 0) {
                      e.currentTarget.style.backgroundColor = '#3B82F6';
                    } else {
                      e.currentTarget.style.backgroundColor = '#9CA3AF';
                    }
                  }}
                >
                  Export for Upload
                </button>
                <button
                  type="button"
                  aria-label="Shipment stats"
                  data-shipment-stats-trigger
                  onClick={() => setShipmentStatsMenuOpen((prev) => !prev)}
                  style={{
                    padding: '4px',
                    border: 'none',
                    borderRadius: '4px',
                    backgroundColor: 'transparent',
                    color: shipmentStatsMenuOpen ? '#3B82F6' : (isDarkMode ? '#9CA3AF' : '#6B7280'),
                    fontSize: '1.25rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (!shipmentStatsMenuOpen) e.currentTarget.style.color = isDarkMode ? '#D1D5DB' : '#4B5563';
                  }}
                  onMouseLeave={(e) => {
                    if (!shipmentStatsMenuOpen) e.currentTarget.style.color = isDarkMode ? '#9CA3AF' : '#6B7280';
                  }}
                >
                  ⋮
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Shipment Stats popup - above footer (table mode) */}
      {shipmentStatsMenuOpen && (
        <div
          ref={shipmentStatsPopupRef}
          style={{
            position: 'fixed',
            bottom: '96px',
            left: `calc(${sidebarWidth}px + (100vw - ${sidebarWidth}px) / 2 - 125px + 350px)`,
            transform: 'translateX(-50%)',
            width: '204px',
            minHeight: '264px',
            maxHeight: '80vh',
            backgroundColor: isDarkMode ? '#1F2937' : '#374151',
            borderRadius: '8px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            border: `1px solid ${isDarkMode ? '#374151' : '#4B5563'}`,
            zIndex: 1001,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', borderBottom: `1px solid ${isDarkMode ? '#374151' : '#4B5563'}` }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#FFFFFF' }}>Shipment Stats</span>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setShipmentStatsMenuOpen(false)}
              style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4L4 12M4 4l8 8" /></svg>
            </button>
          </div>
          <div style={{ padding: '8px', gap: '2px', display: 'flex', flexDirection: 'column', overflowY: 'auto', flex: 1, minHeight: 0 }}>
            {[
              { key: 'products', label: 'Products' },
              { key: 'palettes', label: 'Palettes' },
              { key: 'boxes', label: 'Boxes' },
              { key: 'weightLbs', label: 'Weight (lbs)' },
              { key: 'units', label: 'Units' },
              { key: 'formulas', label: 'Formulas' },
              { key: 'timeHours', label: 'Time (hrs)' },
            ].map(({ key, label }) => (
              <div
                key={key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                  padding: '6px 8px',
                }}
              >
                <span style={{ color: '#9CA3AF', cursor: 'grab', display: 'flex' }} aria-hidden>≡</span>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
                  <input
                    type="checkbox"
                    checked={!!footerStatsVisibility[key]}
                    onChange={() => setFooterStatsVisibility((prev) => ({ ...prev, [key]: !prev[key] }))}
                    style={{ position: 'absolute', opacity: 0, width: 0, height: 0, margin: 0, pointerEvents: 'none' }}
                    aria-hidden
                  />
                  <span
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '4px',
                      border: '1px solid #6B7280',
                      backgroundColor: footerStatsVisibility[key] ? '#3B82F6' : '#374151',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {footerStatsVisibility[key] && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 4L4 7L9 1" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                </label>
                <span style={{ flex: 1, fontSize: '13px', color: '#FFFFFF' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      </>
      )}
    </>
  );
};

// Timeline Filter Dropdown Component
const TimelineFilterDropdown = React.forwardRef(({ filterIconRef, onClose, onApply, onReset, currentFilters = {} }, ref) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [popularFilter, setPopularFilter] = useState(currentFilters.popularFilter || '');
  const [isPopularFilterOpen, setIsPopularFilterOpen] = useState(false);
  const [sortField, setSortField] = useState(currentFilters.sortField || '');
  const [isSortFieldOpen, setIsSortFieldOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState(currentFilters.sortOrder || '');
  const [isFilterConditionExpanded, setIsFilterConditionExpanded] = useState(false);
  const [filterField, setFilterField] = useState(currentFilters.filterField || '');
  const [filterCondition, setFilterCondition] = useState(currentFilters.filterCondition || '');
  const [filterValue, setFilterValue] = useState(currentFilters.filterValue || '');
  const popularFilterRef = useRef(null);
  const sortFieldRef = useRef(null);

  useEffect(() => {
    if (filterIconRef) {
      const rect = filterIconRef.getBoundingClientRect();
      const dropdownWidth = 300;
      const dropdownHeight = 500;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let left = rect.left;
      let top = rect.bottom + 8;
      
      // Adjust if dropdown goes off right edge
      if (left + dropdownWidth > viewportWidth) {
        left = viewportWidth - dropdownWidth - 16;
      }
      
      // Adjust if dropdown goes off bottom
      if (top + dropdownHeight > viewportHeight) {
        top = rect.top - dropdownHeight - 8;
      }
      
      // Don't go off left edge
      if (left < 16) {
        left = 16;
      }
      
      // Don't go off top edge
      if (top < 16) {
        top = 16;
      }
      
      setPosition({ top, left });
    }
  }, [filterIconRef]);

  // Close popular filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popularFilterRef.current && !popularFilterRef.current.contains(event.target)) {
        setIsPopularFilterOpen(false);
      }
      if (sortFieldRef.current && !sortFieldRef.current.contains(event.target)) {
        setIsSortFieldOpen(false);
      }
    };

    if (isPopularFilterOpen || isSortFieldOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPopularFilterOpen, isSortFieldOpen]);

  const handleClearPopular = () => {
    setPopularFilter('');
  };

  const handleClearSort = () => {
    setSortField('');
    setSortOrder('');
  };

  const handleReset = () => {
    setPopularFilter('');
    setSortField('');
    setSortOrder('');
    setFilterField('');
    setFilterCondition('');
    setFilterValue('');
    if (onReset) {
      onReset();
    }
    onClose();
  };

  const handleApply = () => {
    if (onApply) {
      onApply({
        popularFilter,
        sortField,
        sortOrder,
        filterField,
        filterCondition,
        filterValue,
      });
    }
    onClose();
  };

  const popularFilters = [
    { value: 'bestSellers', label: 'Best Sellers (Top Revenue)' },
    { value: 'fastestMovers', label: 'Fastest Movers (Highest Unit Velocity)' },
    { value: 'topProfit', label: 'Top Profit Products' },
    { value: 'topTraffic', label: 'Top Traffic Drivers (Sessions/CTR)' },
    { value: 'outOfStock', label: 'Out of Stock' },
    { value: 'overstock', label: 'Overstock' },
  ];

  const sortFields = [
    { value: '', label: 'Select field' },
    { value: 'fbaAvailable', label: 'FBA Available' },
    { value: 'totalInventory', label: 'Total Inventory' },
    { value: 'forecast', label: 'Forecast' },
    { value: 'sales7', label: '7 Day Sales' },
    { value: 'sales30', label: '30 Day Sales' },
  ];

  const sortOrders = [
    { value: '', label: 'Select order' },
    { value: 'asc', label: 'A^Z Sort ascending (A to Z)', icon: 'A^Z' },
    { value: 'desc', label: 'Z^A Sort descending (Z to A)', icon: 'Z^A' },
  ];

  const filterFields = [
    { value: '', label: 'Select field' },
    { value: 'brand', label: 'Brand' },
    { value: 'product', label: 'Product' },
    { value: 'size', label: 'Size' },
    { value: 'qty', label: 'Qty' },
    { value: 'fbaAvailable', label: 'FBA Available' },
    { value: 'totalInventory', label: 'Total Inventory' },
    { value: 'forecast', label: 'Forecast' },
  ];

  const filterConditions = [
    { value: '', label: 'Select condition' },
    { value: 'equals', label: 'Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'greaterThan', label: 'Greater than' },
    { value: 'lessThan', label: 'Less than' },
  ];

  return createPortal(
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: '300px',
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        border: '1px solid #E5E7EB',
        zIndex: 10000,
        padding: '12px',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Popular filters section */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', textTransform: 'uppercase' }}>
            Popular filters:
          </label>
          <button
            type="button"
            onClick={handleClearPopular}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#3B82F6',
              fontSize: '0.875rem',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Clear
          </button>
        </div>
        
        <div style={{ position: 'relative' }} ref={popularFilterRef}>
            <button
            type="button"
            onClick={() => setIsPopularFilterOpen(!isPopularFilterOpen)}
            style={{
              width: '100%',
              padding: '6px 10px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '0.875rem',
              color: popularFilter ? '#374151' : '#9CA3AF',
              backgroundColor: '#FFFFFF',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>
              {popularFilter 
                ? popularFilters.find(f => f.value === popularFilter)?.label || 'Select filter'
                : 'Select filter'
              }
            </span>
            <svg
              width="12"
              height="8"
              viewBox="0 0 12 8"
              fill="none"
              style={{
                transform: isPopularFilterOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
              }}
            >
              <path d="M1 1L6 6L11 1" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          
          {isPopularFilterOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: '4px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                overflow: 'hidden',
                zIndex: 10001,
              }}
            >
              {popularFilters.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => {
                    setPopularFilter(filter.value);
                    setIsPopularFilterOpen(false);
                    // Apply immediately when selecting a popular filter
                    if (onApply) {
                      onApply({
                        popularFilter: filter.value,
                        sortField,
                        sortOrder,
                        filterField,
                        filterCondition,
                        filterValue,
                      });
                    }
                    onClose();
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 12px',
                    fontSize: '0.875rem',
                    color: popularFilter === filter.value ? '#3B82F6' : '#374151',
                    backgroundColor: '#FFFFFF',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: popularFilter === filter.value ? 500 : 400,
                  }}
                  onMouseEnter={(e) => {
                    if (popularFilter !== filter.value) {
                      e.currentTarget.style.backgroundColor = '#F9FAFB';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                  }}
                >
                  {popularFilter === filter.value && (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      style={{ flexShrink: 0 }}
                    >
                      <path
                        d="M13.3333 4L6 11.3333L2.66667 8"
                        stroke="#3B82F6"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                  {popularFilter !== filter.value && (
                    <div style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                  )}
                  <span>{filter.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sort by section */}
      <div style={{ marginBottom: '12px', paddingTop: '12px', borderTop: '1px solid #E5E7EB' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', textTransform: 'uppercase' }}>
            Sort by:
          </label>
          <button
            type="button"
            onClick={handleClearSort}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#3B82F6',
              fontSize: '0.875rem',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Clear
          </button>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ position: 'relative' }} ref={sortFieldRef}>
            <button
              type="button"
              onClick={() => setIsSortFieldOpen(!isSortFieldOpen)}
              style={{
                width: '100%',
                padding: '6px 10px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '0.875rem',
                color: sortField ? '#374151' : '#9CA3AF',
                backgroundColor: '#FFFFFF',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>
                {sortField 
                  ? sortFields.find(f => f.value === sortField)?.label || 'Select field'
                  : 'Select field'
                }
              </span>
              <svg
                width="12"
                height="8"
                viewBox="0 0 12 8"
                fill="none"
                style={{
                  transform: isSortFieldOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                }}
              >
                <path d="M1 1L6 6L11 1" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            
            {isSortFieldOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '4px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  overflow: 'hidden',
                  zIndex: 10001,
                }}
              >
                {sortFields.filter(f => f.value !== '').map((field) => (
                  <button
                    key={field.value}
                    type="button"
                    onClick={() => {
                      setSortField(field.value);
                      setIsSortFieldOpen(false);
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 10px',
                      fontSize: '0.875rem',
                      color: '#374151',
                      backgroundColor: sortField === field.value ? '#F9FAFB' : '#FFFFFF',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      if (sortField !== field.value) {
                        e.currentTarget.style.backgroundColor = '#F9FAFB';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = sortField === field.value ? '#F9FAFB' : '#FFFFFF';
                    }}
                  >
                    {field.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 36px 6px 10px',
              border: sortOrder ? '1px solid #3B82F6' : '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '0.875rem',
              color: sortOrder ? '#374151' : '#9CA3AF',
              backgroundColor: sortOrder ? '#EFF6FF' : '#FFFFFF',
              cursor: 'pointer',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 6L11 1' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 12px center',
              paddingRight: '36px',
            }}
          >
            {sortOrders.map((order) => (
              <option key={order.value} value={order.value}>
                {order.icon ? `${order.icon} ${order.label}` : order.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filter by condition section - collapsible */}
      <div style={{ marginBottom: '12px', paddingTop: '12px', borderTop: '1px solid #E5E7EB' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: isFilterConditionExpanded ? '8px' : 0,
            cursor: 'pointer',
          }}
          onClick={() => setIsFilterConditionExpanded(!isFilterConditionExpanded)}
        >
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', textTransform: 'uppercase' }}>
            Filter by condition:
          </label>
          <svg
            width="12"
            height="8"
            viewBox="0 0 12 8"
            fill="none"
            style={{
              transform: isFilterConditionExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
            }}
          >
            <path d="M1 1L6 6L11 1" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        
        {isFilterConditionExpanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <select
              value={filterField}
              onChange={(e) => setFilterField(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 36px 6px 10px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '0.875rem',
                color: filterField ? '#374151' : '#9CA3AF',
                backgroundColor: '#FFFFFF',
                cursor: 'pointer',
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 6L11 1' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
                paddingRight: '36px',
              }}
            >
              {filterFields.map((field) => (
                <option key={field.value} value={field.value}>
                  {field.label}
                </option>
              ))}
            </select>
            
            <select
              value={filterCondition}
              onChange={(e) => setFilterCondition(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 36px 6px 10px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '0.875rem',
                color: filterCondition ? '#374151' : '#9CA3AF',
                backgroundColor: '#FFFFFF',
                cursor: 'pointer',
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 6L11 1' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
                paddingRight: '36px',
              }}
            >
              {filterConditions.map((condition) => (
                <option key={condition.value} value={condition.value}>
                  {condition.label}
                </option>
              ))}
            </select>
            
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Value here..."
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 36px 6px 10px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  color: '#374151',
                  backgroundColor: '#FFFFFF',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ cursor: 'pointer' }}>
                  <path d="M1 5L5 1L9 5" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ cursor: 'pointer' }}>
                  <path d="M1 1L5 5L9 1" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '12px', borderTop: '1px solid #E5E7EB' }}>
        <button
          type="button"
          onClick={handleReset}
          style={{
            width: '57px',
            height: '23px',
            padding: '0',
            border: '1px solid #D1D5DB',
            borderRadius: '4px',
            backgroundColor: '#FFFFFF',
            color: '#374151',
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            whiteSpace: 'nowrap',
            boxSizing: 'border-box',
          }}
        >
          Reset
        </button>
        <button
          type="button"
          onClick={handleApply}
          style={{
            width: '57px',
            height: '23px',
            padding: '0',
            border: 'none',
            borderRadius: '4px',
            backgroundColor: '#3B82F6',
            color: '#FFFFFF',
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            whiteSpace: 'nowrap',
            boxSizing: 'border-box',
          }}
        >
          Apply
        </button>
      </div>
    </div>,
    document.body
  );
});

TimelineFilterDropdown.displayName = 'TimelineFilterDropdown';

export default NewShipmentTable;


