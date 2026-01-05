import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../../../context/ThemeContext';
import SortFormulasFilterDropdown from './SortFormulasFilterDropdown';

const NewShipmentTable = ({
  rows,
  tableMode,
  onProductClick,
  qtyValues,
  onQtyChange,
  onAddedRowsChange,
  addedRows: externalAddedRows = null,
  labelsAvailabilityMap = {},
  forecastRange = 120,
}) => {
  const { isDarkMode } = useTheme();
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [addedRows, setAddedRows] = useState(new Set());
  const [selectionFilter, setSelectionFilter] = useState('all'); // all | checked | unchecked
  const selectAllCheckboxRef = useRef(null);
  const [clickedQtyIndex, setClickedQtyIndex] = useState(null);
  const [hoveredQtyIndex, setHoveredQtyIndex] = useState(null);
  const [hoveredAddIndex, setHoveredAddIndex] = useState(null);
  const qtyContainerRefs = useRef({});
  const popupRefs = useRef({});
  const qtyInputRefs = useRef({});
  const addButtonRefs = useRef({});
  const addPopupRefs = useRef({});
  const manuallyEditedIndices = useRef(new Set()); // Track which fields have been manually edited by user
  const rawQtyInputValues = useRef({}); // Store raw input values while typing (before rounding)
  const [qtyInputUpdateTrigger, setQtyInputUpdateTrigger] = useState(0); // Trigger re-renders during typing
  const [openFilterIndex, setOpenFilterIndex] = useState(null);
  const filterRefs = useRef({});
  const filterModalRefs = useRef({});
  
  // Filter dropdown state for bottles, closures, boxes, labels
  const [openFilterColumns, setOpenFilterColumns] = useState(() => new Set());
  const filterIconRefs = useRef({});
  const [columnFilters, setColumnFilters] = useState({});
  const [columnSortConfig, setColumnSortConfig] = useState([]);
  // Store the sorted order (array of row IDs) to preserve positions after sorting
  const [sortedRowOrder, setSortedRowOrder] = useState(null);
  // Ref to store current filtered rows (without sorting) for use in sort handler
  const currentFilteredRowsRef = useRef([]);
  
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
    if (!row?.label_location) return row?.labelsAvailable || 0;
    
    const labelLoc = row.label_location;
    const baseAvailable = labelsAvailabilityMap[labelLoc]?.labels_available || row?.labelsAvailable || 0;
    
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

  // Helper function to round quantity based on case size
  const roundQuantityToCaseSize = (value, size) => {
    if (value === '' || value === null || value === undefined) return '';
    
    const numValue = parseInt(value, 10);
    if (isNaN(numValue) || numValue < 0) return '';
    
    // Determine increment based on size
    let increment = 1;
    const sizeLower = (size || '').toLowerCase();
    if (sizeLower.includes('8oz')) {
      increment = 60;
    } else if (sizeLower.includes('quart')) {
      increment = 12;
    } else if (sizeLower.includes('gallon')) {
      increment = 4;
    }
    
    // Round to nearest increment
    const rounded = Math.round(numValue / increment) * increment;
    return rounded > 0 ? rounded : increment;
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
    }
    
    return result;
  }, [rows, activeFilters, columnFilters, sortedRowOrder, forecastRange]);

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
  useEffect(() => {
    if (externalAddedRows instanceof Set) {
      setAddedRows(new Set(externalAddedRows));
      setSelectedRows(new Set(externalAddedRows));
    } else if (Array.isArray(externalAddedRows)) {
      const synced = new Set(externalAddedRows);
      setAddedRows(synced);
      setSelectedRows(synced);
    }
  }, [externalAddedRows]);
  
  // Handle filter apply
  const handleFilterApply = (filterSettings) => {
    setActiveFilters(filterSettings);
  };
  
  // Handle filter reset
  const handleFilterReset = () => {
    setActiveFilters({
      popularFilter: '',
      sortField: '',
      sortOrder: '',
      filterField: '',
      filterCondition: '',
      filterValue: '',
    });
  };

  // Filter handlers for bottles, closures, boxes, labels columns
  const handleFilterClick = (columnKey, event) => {
    event.stopPropagation();
    setOpenFilterColumns((prev) => {
      const next = new Set(prev);
      if (next.has(columnKey)) {
        next.delete(columnKey);
      } else {
        next.add(columnKey);
      }
      return next;
    });
  };

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
  }, [rows, activeFilters, columnFilters, forecastRange]);

  const handleApplyColumnFilter = (columnKey, filterData) => {
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
        return 'product';
      case 'normal-2':
        return 'size';
      case 'normal-3':
        return 'add'; // whether product is added (uses boolean/flag)
      case 'normal-4':
        return 'qty'; // quantity field
      default:
        return columnKey;
    }
  }

  // Get unique values for a column
  const getColumnValues = (columnKey) => {
    const values = new Set();
    filteredRows.forEach((row, index) => {
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
        case 'qty':
          val = effectiveQtyValues[row._originalIndex !== undefined ? row._originalIndex : index] || 0;
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
    const hasValues = filter.selectedValues && filter.selectedValues.size > 0;
    const hasCondition = filter.conditionType && filter.conditionType !== '';
    return hasValues || hasCondition;
  };

  // Close filter dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openFilterColumns.size > 0) {
        const clickedOnFilterIcon = Object.values(filterIconRefs.current).some(ref => 
          ref && ref.contains(event.target)
        );
        const clickedInsideDropdown = event.target.closest('[data-filter-dropdown]');
        
        if (!clickedOnFilterIcon && !clickedInsideDropdown) {
          setOpenFilterColumns(new Set());
        }
      }
    };

    if (openFilterColumns.size > 0) {
      const timeoutId = setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);
      
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [openFilterColumns]);

  const currentRows = filteredRowsWithSelection;

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

  // Position popup when it appears
  useEffect(() => {
    if (clickedQtyIndex !== null) {
      const qtyContainer = qtyContainerRefs.current[clickedQtyIndex];
      const popup = popupRefs.current[clickedQtyIndex];
      
      if (qtyContainer && popup) {
        const rect = qtyContainer.getBoundingClientRect();
        const popupHeight = popup.offsetHeight || 200;
        const top = rect.top - popupHeight - 12;
        const left = rect.left + rect.width / 2;
        
        popup.style.top = `${top}px`;
        popup.style.left = `${left}px`;
        popup.style.transform = 'translateX(-50%)';
      }
    }
  }, [clickedQtyIndex]);

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

  // Handle Add button click
  const handleAddClick = (row, index) => {
    const newAdded = new Set(addedRows);
    
    if (newAdded.has(row.id)) {
      // Remove from added - keep the qty value (don't clear it)
      newAdded.delete(row.id);
    } else {
      // Check if quantity is 0 before adding
      const currentQty = typeof effectiveQtyValues[index] === 'number' 
        ? effectiveQtyValues[index] 
        : (effectiveQtyValues[index] === '' || effectiveQtyValues[index] === null || effectiveQtyValues[index] === undefined) 
          ? 0 
          : parseInt(effectiveQtyValues[index], 10) || 0;
      
      if (currentQty === 0) {
        // Don't add if quantity is 0 - the hover popup will show
        return;
      }
      
      // Add - just mark as added, don't change qty value
      // User should have already entered qty before clicking Add
      newAdded.add(row.id);
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

  const legendItems = [
    { label: 'FBA Avail.', color: '#A855F7' },
    { label: 'Total Inv.', color: '#22C55E' },
    { label: 'Forecast', color: '#3B82F6' },
  ];

  if (!tableMode) {
    // Normal view with timeline
    return (
      <>
        <div
          className={`${themeClasses.cardBg} ${themeClasses.border} border rounded-xl shadow-sm`}
          style={{ marginTop: '1.25rem', overflow: 'hidden', borderRadius: '16px' }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'separate',
                borderSpacing: 0,
              }}
            >
              <thead className={themeClasses.headerBg}>
                <tr style={{ height: '40px', maxHeight: '40px', borderRadius: '16px', overflow: 'hidden' }}>
                  {['Brand', 'Product', 'Size', 'Add', 'Qty'].map((col, idx) => (
                    <th
                      key={col}
                      className="group text-xs font-bold text-white uppercase tracking-wider"
                      style={{
                        padding: '0 1rem',
                        height: '40px',
                        maxHeight: '40px',
                        lineHeight: '40px',
                        boxSizing: 'border-box',
                        textAlign: idx === 3 || idx === 4 ? 'center' : 'left',
                        borderRight: idx === 3 ? 'none' : '1px solid #FFFFFF',
                        position: 'relative',
                        borderTopLeftRadius: idx === 0 ? '16px' : undefined,
                        width:
                          idx === 0
                            ? 160
                            : idx === 1
                            ? 200
                            : idx === 2
                            ? 70
                            : idx === 3 || idx === 4
                            ? 120
                            : undefined,
                      }}
                    >
                      <span>{col}</span>
                      <img
                        ref={(el) => {
                          if (el) filterIconRefs.current[`normal-${idx}`] = el;
                        }}
                        src="/assets/Vector (1).png"
                        alt="Filter"
                        className="w-3 h-3 transition-opacity opacity-0 group-hover:opacity-100"
                        style={{ 
                          width: '12px', 
                          height: '12px',
                          position: 'absolute',
                          right: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          cursor: 'pointer',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const filterKey = `normal-${idx}`;
                          setOpenFilterColumns((prev) => {
                            const next = new Set(prev);
                            if (next.has(filterKey)) {
                              next.delete(filterKey);
                            } else {
                              next.add(filterKey);
                            }
                            return next;
                          });
                        }}
                      />
                    </th>
                  ))}
                  <th
                    className="group text-xs font-bold text-white tracking-wider"
                    style={{
                      padding: '0 1rem',
                      height: '40px',
                      maxHeight: '40px',
                      boxSizing: 'border-box',
                      textAlign: 'left',
                      verticalAlign: 'middle',
                      overflow: 'visible',
                      borderRight: '1px solid #FFFFFF',
                      position: 'relative',
                      borderTopRightRadius: '16px',
                    }}
                  >
                    <img
                      ref={(el) => {
                        if (el) filterRefs.current['doi-goal'] = el;
                      }}
                      src="/assets/Vector (1).png"
                      alt="Filter"
                      className={`w-3 h-3 transition-opacity ${
                        activeFilters.popularFilter || activeFilters.sortField || activeFilters.filterField 
                          ? 'opacity-100' 
                          : 'opacity-0 group-hover:opacity-100'
                      }`}
                      style={{ 
                        width: '12px', 
                        height: '12px',
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        cursor: 'pointer',
                        filter: activeFilters.popularFilter || activeFilters.sortField || activeFilters.filterField 
                          ? 'invert(29%) sepia(94%) saturate(2576%) hue-rotate(199deg) brightness(102%) contrast(105%)' 
                          : undefined,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenFilterIndex(openFilterIndex === 'doi-goal' ? null : 'doi-goal');
                      }}
                    />
                    <div
                      style={{
                        position: 'relative',
                        height: '100%',
                        width: '100%',
                        paddingTop: '12px',
                      }}
                    >
                      {(() => {
                        const today = new Date();
                        const doiGoalDate = new Date(today.getTime() + forecastRange * 24 * 60 * 60 * 1000);
                        
                        // Format dates as M/D/YY
                        const formatDate = (date) => {
                          const month = date.getMonth() + 1;
                          const day = date.getDate();
                          const year = date.getFullYear().toString().slice(-2);
                          return `${month}/${day}/${year}`;
                        };
                        
                        // Calculate monthly intervals
                        const months = [];
                        const totalDays = forecastRange;
                        const numMonths = 4; // Dec, Jan, Feb, Mar
                        const daysPerSegment = totalDays / (numMonths + 1);
                        
                        for (let i = 1; i <= numMonths; i++) {
                          const monthDate = new Date(today.getTime() + (daysPerSegment * i) * 24 * 60 * 60 * 1000);
                          const monthLabel = monthDate.toLocaleDateString('en-US', { month: 'short' });
                          const leftPercent = (i / (numMonths + 1)) * 100;
                          months.push({ label: monthLabel, left: `${leftPercent}%` });
                        }
                        
                        return (
                          <>
                            {/* Today label and date */}
                            <div
                              style={{
                                position: 'absolute',
                                top: '0',
                                left: 'calc(7% - 5px)',
                                transform: 'translateX(-50%)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '1px',
                              }}
                            >
                              <span style={{ fontSize: '11px', fontWeight: 600, color: '#FFFFFF', whiteSpace: 'nowrap', lineHeight: '1.1' }}>
                                Today
                              </span>
                              <span style={{ fontSize: '9px', color: '#FFFFFF', whiteSpace: 'nowrap', lineHeight: '1.1' }}>
                                {formatDate(today)}
                              </span>
                            </div>
                            
                            {/* Month labels */}
                            {months.map((m) => {
                              // Adjust month label positions to align with the constrained markers
                              const basePercent = parseFloat(m.left);
                              const adjustedPercent = 7 + (basePercent * 0.86);
                              return (
                                <div
                                  key={m.left}
                                  style={{
                                    position: 'absolute',
                                    top: '8px',
                                    left: `${adjustedPercent}%`,
                                    transform: 'translateX(-50%)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                  }}
                                >
                                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#FFFFFF', whiteSpace: 'nowrap', lineHeight: '1.1' }}>
                                    {m.label}
                                  </span>
                                </div>
                              );
                            })}
                            
                            {/* DOI Goal label and date */}
                            <div
                              style={{
                                position: 'absolute',
                                top: '0',
                                right: 'calc(7% + 5px)',
                                transform: 'translateX(50%)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '1px',
                              }}
                            >
                              <span style={{ fontSize: '11px', fontWeight: 600, color: '#FFFFFF', whiteSpace: 'nowrap', lineHeight: '1.1' }}>
                                DOI Goal
                              </span>
                              <span style={{ fontSize: '9px', color: '#FFFFFF', whiteSpace: 'nowrap', lineHeight: '1.1' }}>
                                {formatDate(doiGoalDate)}
                              </span>
                            </div>
                            
                            {/* Horizontal line - thick white line with rounded corners on right */}
                            <div
                              style={{
                                position: 'absolute',
                                left: '7%',
                                right: 'calc(7% + 5px)',
                                top: '30px',
                                height: '3px',
                                backgroundColor: '#FFFFFF',
                                borderTopRightRadius: '6px',
                                borderBottomRightRadius: '6px',
                              }}
                            />
                            
                            {/* Today marker - solid white circle */}
                            <div
                              style={{
                                position: 'absolute',
                                left: 'calc(7% - 5px)',
                                top: '30px',
                                transform: 'translate(-50%, -50%)',
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                backgroundColor: '#FFFFFF',
                                zIndex: 1,
                              }}
                            />
                            
                            {/* Month markers - outlined circles with dark center */}
                            {months.map((m) => {
                              // Adjust month marker positions to align with the constrained line
                              const basePercent = parseFloat(m.left);
                              const adjustedPercent = 7 + (basePercent * 0.86);
                              return (
                                <div
                                  key={`marker-${m.left}`}
                                  style={{
                                    position: 'absolute',
                                    left: `${adjustedPercent}%`,
                                    top: '30px',
                                    transform: 'translate(-50%, -50%)',
                                    width: '12px',
                                    height: '12px',
                                    borderRadius: '50%',
                                    border: '2px solid #FFFFFF',
                                    backgroundColor: '#1C2634',
                                    zIndex: 1,
                                  }}
                                />
                              );
                            })}
                            
                            {/* DOI Goal marker - solid white circle */}
                            <div
                              style={{
                                position: 'absolute',
                                right: 'calc(7% + 5px)',
                                top: '30px',
                                transform: 'translate(50%, -50%)',
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                backgroundColor: '#FFFFFF',
                                zIndex: 1,
                              }}
                            />
                          </>
                        );
                      })()}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentRows.map((row) => {
                  const index = row._originalIndex;
                  return (
                  <tr key={`${row.id}-${index}`} className="border-t border-gray-200" style={{ height: '40px', maxHeight: '40px' }}>
                    <td style={{ padding: '0.65rem 1rem', fontSize: '0.85rem', height: '40px', verticalAlign: 'middle', borderTop: '1px solid #E5E7EB', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} className={themeClasses.text}>
                      {row.brand}
                    </td>
                    <td style={{ padding: '0.65rem 1rem', fontSize: '0.85rem', height: '40px', verticalAlign: 'middle', borderTop: '1px solid #E5E7EB' }}>
                      <button
                        type="button"
                        onClick={() => onProductClick(row)}
                        className="text-blue-500 hover:text-blue-600"
                        style={{ 
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          width: '100%',
                          textAlign: 'left',
                          background: 'none',
                          border: 'none',
                          padding: 0
                        }}
                      >
                        {row.product}
                      </button>
                    </td>
                    <td style={{ padding: '0.65rem 1rem', fontSize: '0.85rem', height: '40px', verticalAlign: 'middle', borderTop: '1px solid #E5E7EB', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} className={themeClasses.textSecondary}>
                      {row.size}
                    </td>
                    <td style={{ padding: '0.65rem 1rem', textAlign: 'center', height: '40px', verticalAlign: 'middle', borderTop: '1px solid #E5E7EB' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', position: 'relative' }}>
                        <div
                          ref={(el) => {
                            if (el) addButtonRefs.current[index] = el;
                          }}
                          onMouseEnter={() => {
                            const currentQty = typeof effectiveQtyValues[index] === 'number' 
                              ? effectiveQtyValues[index] 
                              : (effectiveQtyValues[index] === '' || effectiveQtyValues[index] === null || effectiveQtyValues[index] === undefined) 
                                ? 0 
                                : parseInt(effectiveQtyValues[index], 10) || 0;
                            if (currentQty === 0 && !addedRows.has(row.id)) {
                              setHoveredAddIndex(index);
                            }
                          }}
                          onMouseLeave={() => setHoveredAddIndex(null)}
                          style={{ position: 'relative', display: 'inline-block' }}
                        >
                          <button
                            type="button"
                            onClick={() => handleAddClick(row, index)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: addedRows.has(row.id) ? '0' : '10px',
                              width: '80px',
                              height: '24px',
                              borderRadius: '9999px',
                              border: 'none',
                              backgroundColor: addedRows.has(row.id) ? '#10B981' : '#2563EB',
                              color: '#FFFFFF',
                              fontSize: '0.875rem',
                              fontWeight: 500,
                              fontFamily: 'sans-serif',
                              cursor: 'pointer',
                              padding: 0,
                              transition: 'background-color 0.2s',
                              position: 'relative',
                            }}
                          >
                            {!addedRows.has(row.id) && (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '9.33px',
                                  height: '9.33px',
                                  color: '#FFFFFF',
                                  fontSize: '0.875rem',
                                  fontWeight: 600,
                                  lineHeight: 1,
                                  flexShrink: 0,
                                }}
                              >
                                +
                              </span>
                            )}
                            <span style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>{addedRows.has(row.id) ? 'Added' : 'Add'}</span>
                          </button>
                          {/* Hover popup for 0 quantity */}
                          {hoveredAddIndex === index && (() => {
                            const currentQty = typeof effectiveQtyValues[index] === 'number' 
                              ? effectiveQtyValues[index] 
                              : (effectiveQtyValues[index] === '' || effectiveQtyValues[index] === null || effectiveQtyValues[index] === undefined) 
                                ? 0 
                                : parseInt(effectiveQtyValues[index], 10) || 0;
                            return currentQty === 0 && !addedRows.has(row.id);
                          })() && (
                            <div
                              ref={(el) => {
                                if (el) addPopupRefs.current[index] = el;
                              }}
                              style={{
                                position: 'fixed',
                                backgroundColor: '#FFFFFF',
                                borderRadius: '8px',
                                padding: '8px 12px',
                                minWidth: '180px',
                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                                zIndex: 9999,
                                border: '1px solid #E5E7EB',
                                pointerEvents: 'auto',
                              }}
                              onMouseEnter={() => setHoveredAddIndex(index)}
                              onMouseLeave={() => setHoveredAddIndex(null)}
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                              }}
                              onMouseDown={(e) => e.stopPropagation()}
                              onMouseUp={(e) => e.stopPropagation()}
                            >
                              <div style={{ marginBottom: '6px' }}>
                                <h3 style={{
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  color: '#111827',
                                  marginBottom: '2px',
                                  lineHeight: '1.3',
                                }}>
                                  0 quantity. Add quantity to include in shipment
                                </h3>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '0.65rem 1rem', textAlign: 'center', height: '40px', verticalAlign: 'middle', borderTop: '1px solid #E5E7EB' }}>
                      <div
                        style={{ position: 'relative', display: 'inline-block' }}
                        onMouseEnter={() => setHoveredQtyIndex(index)}
                        onMouseLeave={() => setHoveredQtyIndex(null)}
                      >
                        <input
                          type="number"
                          step={(() => {
                            const size = row.size?.toLowerCase() || '';
                            if (size.includes('8oz')) return 60;
                            if (size.includes('quart')) return 12;
                            if (size.includes('gallon')) return 4;
                            return 1;
                          })()}
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
                                const rounded = roundQuantityToCaseSize(numValue, row.size);
                                rawQtyInputValues.current[index] = undefined; // Clear raw value
                                effectiveSetQtyValues(prev => ({
                                  ...prev,
                                  [index]: rounded
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
                                  const rounded = roundQuantityToCaseSize(numValue, row.size);
                                  rawQtyInputValues.current[index] = undefined; // Clear raw value
                                  effectiveSetQtyValues(prev => ({
                                    ...prev,
                                    [index]: rounded
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
                          placeholder="0"
                          className={`${themeClasses.cardBg} border rounded-md text-xs ${themeClasses.text}`}
                          style={{
                            padding: '0.25rem 0.5rem 0.25rem 1.75rem', // extra left padding for reset icon
                            width: '90px',
                            textAlign: 'center',
                            cursor: 'text',
                            borderColor: isQtyExceedingLabels(row, index) ? '#EF4444' : (isDarkMode ? '#374151' : '#D1D5DB'),
                            backgroundColor: isQtyExceedingLabels(row, index) ? (isDarkMode ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)') : undefined,
                          }}
                        />
                        {(() => {
                          const forecastValue = Math.round(row.weeklyForecast || row.forecast || 0);
                          // Check both the raw input value (while typing) and the effective value
                          const rawInputValue = rawQtyInputValues.current[index];
                          const qtyValue = effectiveQtyValues[index];
                          
                          // Determine the current displayed value (raw if typing, otherwise effective)
                          let currentDisplayValue;
                          if (rawInputValue !== undefined) {
                            // User is typing - use raw input value
                            currentDisplayValue = rawInputValue === '' ? 0 : (parseInt(rawInputValue, 10) || 0);
                          } else {
                            // Use effective value
                            const isValueSet = qtyValue !== undefined && qtyValue !== null && qtyValue !== '';
                            currentDisplayValue = typeof qtyValue === 'number' 
                              ? qtyValue 
                              : isValueSet 
                                ? parseInt(qtyValue, 10) || 0
                                : 0;
                          }
                          
                          // Only show reset if value has been manually edited by user and differs from forecast
                          const isManuallyEdited = manuallyEditedIndices.current.has(index);
                          const hasValue = rawInputValue !== undefined ? rawInputValue !== '' : (qtyValue !== undefined && qtyValue !== null && qtyValue !== '');
                          const hasChanged = hasValue && isManuallyEdited && currentDisplayValue !== forecastValue;
                          
                          return hasChanged ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                // Clear raw input value
                                rawQtyInputValues.current[index] = undefined;
                                effectiveSetQtyValues(prev => ({
                                  ...prev,
                                  [index]: forecastValue,
                                }));
                                // Remove from manually edited set when reset to forecast
                                manuallyEditedIndices.current.delete(index);
                              }}
                              style={{
                                position: 'absolute',
                                left: '6px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                borderRadius: '999px',
                                border: 'none',
                                backgroundColor: 'transparent',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: 0,
                                margin: 0,
                              }}
                              onMouseEnter={() => {}}
                              onMouseLeave={() => {}}
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
                        {/* Label warning icon - positioned absolutely to not affect alignment */}
                        {isQtyExceedingLabels(row, index) && (effectiveQtyValues[index] ?? 0) > 0 && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setClickedQtyIndex(clickedQtyIndex === index ? null : index);
                            }}
                            style={{
                              position: 'absolute',
                              left: '96px',
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
                        )}
                        {/* Popup for "Use Available" */}
                        {clickedQtyIndex === index && isQtyExceedingLabels(row, index) && (
                          <div
                            ref={(el) => {
                              if (el) popupRefs.current[index] = el;
                            }}
                            style={{
                              position: 'absolute',
                              top: '100%',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              marginTop: '8px',
                              backgroundColor: '#FFFFFF',
                              borderRadius: '12px',
                              padding: '14px 16px',
                              minWidth: '220px',
                              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                              zIndex: 9999,
                              border: '1px solid #E5E7EB',
                              pointerEvents: 'auto',
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            onMouseUp={(e) => e.stopPropagation()}
                          >
                            <div style={{ marginBottom: '10px' }}>
                              <h3 style={{
                                fontSize: '14px',
                                fontWeight: 600,
                                color: '#111827',
                                marginBottom: '4px',
                                lineHeight: '1.3',
                              }}>
                                Order exceeds available labels
                              </h3>
                              <p style={{
                                fontSize: '13px',
                                fontWeight: 400,
                                color: '#9CA3AF',
                                lineHeight: '1.4',
                              }}>
                                Labels Available: {getAvailableLabelsForRow(row, index).toLocaleString()}
                              </p>
                            </div>
                            <button
                              style={{
                                width: '100%',
                                height: '32px',
                                backgroundColor: '#3B82F6',
                                color: '#FFFFFF',
                                fontSize: '13px',
                                fontWeight: 600,
                                borderRadius: '6px',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s',
                              }}
                              onMouseEnter={(e) => e.target.style.backgroundColor = '#2563EB'}
                              onMouseLeave={(e) => e.target.style.backgroundColor = '#3B82F6'}
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                const labelsAvailable = getAvailableLabelsForRow(row, index);
                                
                                // Round down to nearest case pack increment
                                let increment = 1;
                                const size = row.size?.toLowerCase() || '';
                                if (size.includes('8oz')) increment = 60;
                                else if (size.includes('quart')) increment = 12;
                                else if (size.includes('gallon')) increment = 4;
                                
                                const maxQty = Math.floor(labelsAvailable / increment) * increment;
                                
                                // Mark as manually edited since user clicked "Use Available"
                                manuallyEditedIndices.current.add(index);
                                effectiveSetQtyValues(prev => ({
                                  ...prev,
                                  [index]: maxQty
                                }));
                                
                                setTimeout(() => setClickedQtyIndex(null), 100);
                              }}
                              onMouseDown={(e) => e.stopPropagation()}
                            >
                              Use Available
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '0.65rem 1rem', minWidth: '380px', height: '40px', verticalAlign: 'middle', borderTop: '1px solid #E5E7EB' }}>
                      <div
                        style={{
                          width: '86%',
                          margin: '0 auto',
                          transform: 'translateX(-7px)',
                          position: 'relative',
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            top: '-8px',
                            bottom: '-8px',
                            left: 0,
                            borderLeft: `2px dashed ${isDarkMode ? '#9CA3AF' : '#9CA3AF'}`,
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            top: '-8px',
                            bottom: '-8px',
                            right: 0,
                            borderRight: `2px dashed ${isDarkMode ? '#9CA3AF' : '#9CA3AF'}`,
                          }}
                        />
                        <div
                          style={{
                            position: 'relative',
                          }}
                        >
                          <div
                            onDoubleClick={() => onProductClick(row)}
                            style={{
                              borderRadius: '9999px',
                              backgroundColor: isDarkMode ? '#020617' : '#F3F4F6',
                              overflow: 'hidden',
                              height: '18px',
                              display: 'flex',
                              cursor: 'pointer',
                              position: 'relative',
                            }}
                            title={`FBA: ${row.fbaAvailable || 0}, Total: ${row.totalInventory || 0}, Forecast: ${Math.round(row.weeklyForecast || row.forecast || 0)}/week, DOI: ${row.daysOfInventory || 0}d | Double-click for N-GOOS details`}
                          >
                            {/* Inventory Timeline Visualization - matches backend units_to_make calculation */}
                            {(() => {
                              // Use the same logic as the backend:
                              // Target = weekly_forecast × weeks_to_goal
                              // units_to_make = Target - current_inventory
                              
                              const weeklyForecast = row.weeklyForecast || row.forecast || 0;
                              const weeksToGoal = forecastRange / 7; // Convert days to weeks
                              const targetInventory = weeklyForecast * weeksToGoal;
                              
                              const fbaInventory = row.fbaAvailable || 0;
                              const totalInventory = row.totalInventory || 0;
                              const additionalInventory = Math.max(0, totalInventory - fbaInventory); // AWD etc.
                              
                              // units_to_make from the row (calculated by backend)
                              const unitsToMake = row.units_to_make || row.suggestedQty || 0;
                              
                              // Show bars if:
                              // - units_to_make > 0 (something to produce) - shows all segments
                              // - OR inventory exists (fbaInventory or additionalInventory > 0) - shows purple/green only
                              // Hide bars only when there's nothing at all
                              const hasInventory = fbaInventory > 0 || additionalInventory > 0;
                              if (unitsToMake === 0 && !hasInventory) {
                                return null;
                              }
                              
                              // Total bar represents: current inventory + units to make = target
                              // OR just use target if we have it
                              const totalBar = Math.max(targetInventory, totalInventory + unitsToMake);
                              
                              if (totalBar === 0) {
                                return null;
                              }
                              
                              // Calculate proportional widths
                              let fbaPercent = fbaInventory > 0 ? (fbaInventory / totalBar) * 100 : 0;
                              let greenPercent = additionalInventory > 0 ? (additionalInventory / totalBar) * 100 : 0;
                              let bluePercent = unitsToMake > 0 ? (unitsToMake / totalBar) * 100 : 0;
                              
                              // Add minimum visibility (5%) only for non-zero segments
                              if (fbaPercent > 0 && fbaPercent < 5) fbaPercent = 5;
                              if (greenPercent > 0 && greenPercent < 5) greenPercent = 5;
                              if (bluePercent > 0 && bluePercent < 5) bluePercent = 5;
                              
                              // Normalize to 100%
                              const sum = fbaPercent + greenPercent + bluePercent;
                              if (sum > 0 && sum !== 100) {
                                const scale = 100 / sum;
                                fbaPercent = fbaPercent * scale;
                                greenPercent = greenPercent * scale;
                                bluePercent = bluePercent * scale;
                              }
                              
                              // Show as segments: Purple (FBA inventory) + Green (additional inventory) + Blue (units to make)
                              return (
                                <>
                                  {/* Purple segment: FBA Inventory */}
                                  {fbaInventory > 0 && (
                                    <div style={{ 
                                      width: `${fbaPercent}%`, 
                                      height: '100%',
                                      backgroundColor: '#A855F7',
                                      position: 'absolute',
                                      left: 0,
                                      top: 0,
                                      borderRadius: greenPercent === 0 && bluePercent === 0 ? '9999px' : '9999px 0 0 9999px',
                                    }} />
                                  )}
                                  
                                  {/* Green segment: Additional Inventory (AWD, etc.) */}
                                  {additionalInventory > 0 && (
                                    <div style={{ 
                                      width: `${greenPercent}%`, 
                                      height: '100%',
                                      backgroundColor: '#22C55E',
                                      position: 'absolute',
                                      left: `${fbaPercent}%`,
                                      top: 0,
                                      borderRadius: bluePercent === 0 ? '0 9999px 9999px 0' : 0,
                                    }} />
                                  )}
                                  
                                  {/* Blue segment: Units to Make (from backend) */}
                                  {unitsToMake > 0 && (
                                    <div style={{ 
                                      width: `${bluePercent}%`, 
                                      height: '100%',
                                      backgroundColor: addedRows.has(row.id) ? '#3B82F6' : '#93C5FD', // Regular blue when added, light blue when not added
                                      position: 'absolute',
                                      left: `${fbaPercent + greenPercent}%`,
                                      top: 0,
                                      borderRadius: '0 9999px 9999px 0',
                                    }} />
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ); })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Header Filter Dropdowns for Brand / Product / Size / Add / Qty */}
        {Array.from(openFilterColumns).map((columnKey) => {
          if (!filterIconRefs.current[columnKey]) return null;
          return (
            <SortFormulasFilterDropdown
              key={columnKey}
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

        {/* Filter status indicator */}
        {(activeFilters.popularFilter || activeFilters.sortField || activeFilters.filterField) && (
          <div
            style={{
              padding: '0.5rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#EFF6FF',
              borderBottom: '1px solid #BFDBFE',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.875rem', color: '#1D4ED8', fontWeight: 500 }}>
                🔍 Showing {currentRows.length} of {rows.length} products
              </span>
              {activeFilters.popularFilter && (
                <span style={{ 
                  fontSize: '0.75rem', 
                  backgroundColor: '#3B82F6', 
                  color: 'white', 
                  padding: '2px 8px', 
                  borderRadius: '12px' 
                }}>
                  {activeFilters.popularFilter === 'bestSellers' && 'Best Sellers'}
                  {activeFilters.popularFilter === 'fastestMovers' && 'Fastest Movers'}
                  {activeFilters.popularFilter === 'topProfit' && 'Top Profit'}
                  {activeFilters.popularFilter === 'topTraffic' && 'Top Traffic'}
                  {activeFilters.popularFilter === 'outOfStock' && 'Out of Stock'}
                  {activeFilters.popularFilter === 'overstock' && 'Overstock'}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleFilterReset}
              style={{
                fontSize: '0.75rem',
                color: '#3B82F6',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Floating Legend */}
        {typeof document !== 'undefined' &&
          createPortal(
            <div
              style={{
                position: 'fixed',
                bottom: '112px',
                right: '16px',
                zIndex: 1200,
                padding: '0.5rem 0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.9rem',
                borderRadius: '10px',
                backgroundColor: isDarkMode ? '#111827' : '#FFFFFF',
                border: `1px solid ${isDarkMode ? '#1F2937' : '#E5E7EB'}`,
                boxShadow: isDarkMode
                  ? '0 8px 18px rgba(0, 0, 0, 0.35)'
                  : '0 8px 18px rgba(0, 0, 0, 0.08)',
                pointerEvents: 'none',
                userSelect: 'none',
              }}
              className={themeClasses.text}
            >
              {legendItems.map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontSize: '0.8rem',
                    whiteSpace: 'nowrap',
                    color: isDarkMode ? '#E5E7EB' : '#111827',
                  }}
                >
                  <span
                    style={{
                      width: '0.85rem',
                      height: '0.85rem',
                      borderRadius: 0,
                      backgroundColor: item.color,
                    }}
                  />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>,
            document.body
          )}

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
                  color: '#FFFFFF',
                  borderRight: '1px solid #FFFFFF',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <span>BRAND</span>
                  <img
                    src="/assets/Vector (1).png"
                    alt="Filter"
                    className="w-3 h-3 transition-opacity opacity-0 group-hover:opacity-100"
                    style={{ width: '12px', height: '12px' }}
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
                  color: '#FFFFFF',
                  borderRight: '1px solid #FFFFFF',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <span>PRODUCT</span>
                  <img
                    src="/assets/Vector (1).png"
                    alt="Filter"
                    className="w-3 h-3 transition-opacity opacity-0 group-hover:opacity-100"
                    style={{ width: '12px', height: '12px' }}
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
                  color: '#FFFFFF',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <span>SIZE</span>
                  <img
                    src="/assets/Vector (1).png"
                    alt="Filter"
                    className="w-3 h-3 transition-opacity opacity-0 group-hover:opacity-100"
                    style={{ width: '12px', height: '12px' }}
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
                  color: '#FFFFFF',
                  backgroundColor: '#1C2634',
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
                    className="w-3 h-3 transition-opacity opacity-0 group-hover:opacity-100"
                    style={{ 
                      width: '12px', 
                      height: '12px',
                      cursor: 'pointer',
                      filter: hasActiveColumnFilter('qty') ? 'brightness(0) saturate(100%) invert(42%) sepia(93%) saturate(1352%) hue-rotate(196deg) brightness(95%) contrast(96%)' : 'none',
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
                      color: '#FFFFFF',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>INVENTORY</span>
                    <span style={{ 
                      fontSize: '0.6rem', 
                      fontWeight: 400, 
                      lineHeight: 1.1, 
                      color: '#FFFFFF',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>FBA AVAILABLE (DAYS)</span>
                  </div>
                  <img
                    src="/assets/Vector (1).png"
                    alt="Filter"
                    className="w-3 h-3 transition-opacity opacity-0 group-hover:opacity-100"
                    style={{ 
                      width: '12px', 
                      height: '12px',
                      position: 'absolute',
                      right: '0',
                      top: '50%',
                      transform: 'translateY(-50%)',
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
                      color: '#FFFFFF',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>INVENTORY</span>
                    <span style={{ 
                      fontSize: '0.6rem', 
                      fontWeight: 400, 
                      lineHeight: 1.1, 
                      color: '#FFFFFF',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>TOTAL (DAYS)</span>
                  </div>
                  <img
                    src="/assets/Vector (1).png"
                    alt="Filter"
                    className="w-3 h-3 transition-opacity opacity-0 group-hover:opacity-100"
                    style={{ 
                      width: '12px', 
                      height: '12px',
                      position: 'absolute',
                      right: '0',
                      top: '50%',
                      transform: 'translateY(-50%)',
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <span>FORECAST</span>
                  <img
                    src="/assets/Vector (1).png"
                    alt="Filter"
                    className="w-3 h-3 transition-opacity opacity-0 group-hover:opacity-100"
                    style={{ width: '12px', height: '12px' }}
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <span>7 DAY SALES</span>
                  <img
                    src="/assets/Vector (1).png"
                    alt="Filter"
                    className="w-3 h-3 transition-opacity opacity-0 group-hover:opacity-100"
                    style={{ width: '12px', height: '12px' }}
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <span>30 DAY SALES</span>
                  <img
                    src="/assets/Vector (1).png"
                    alt="Filter"
                    className="w-3 h-3 transition-opacity opacity-0 group-hover:opacity-100"
                    style={{ width: '12px', height: '12px' }}
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <span>4 MONTH SALES</span>
                  <img
                    src="/assets/Vector (1).png"
                    alt="Filter"
                    className="w-3 h-3 transition-opacity opacity-0 group-hover:opacity-100"
                    style={{ width: '12px', height: '12px' }}
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <span>FORMULA</span>
                  <img
                    src="/assets/Vector (1).png"
                    alt="Filter"
                    className="w-3 h-3 transition-opacity opacity-0 group-hover:opacity-100"
                    style={{ width: '12px', height: '12px' }}
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
                  backgroundColor: hasActiveColumnFilter('bottles') ? 'rgba(59, 130, 246, 0.1)' : '#1C2634',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', position: 'relative', width: '100%' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    BOTTLES
                    {hasActiveColumnFilter('bottles') && (
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
                    className={`w-3 h-3 transition-opacity ${hasActiveColumnFilter('bottles') ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    ref={(el) => {
                      if (el) filterIconRefs.current['bottles'] = el;
                    }}
                    onClick={(e) => handleFilterClick('bottles', e)}
                    style={{ 
                      width: '12px', 
                      height: '12px',
                      cursor: 'pointer',
                      filter: hasActiveColumnFilter('bottles') ? 'brightness(0) saturate(100%) invert(42%) sepia(93%) saturate(1352%) hue-rotate(196deg) brightness(95%) contrast(96%)' : 'none',
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
                  backgroundColor: hasActiveColumnFilter('closures') ? 'rgba(59, 130, 246, 0.1)' : '#1C2634',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    CLOSURES
                    {hasActiveColumnFilter('closures') && (
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
                    className={`w-3 h-3 transition-opacity ${hasActiveColumnFilter('closures') ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    ref={(el) => {
                      if (el) filterIconRefs.current['closures'] = el;
                    }}
                    onClick={(e) => handleFilterClick('closures', e)}
                    style={{ 
                      width: '12px', 
                      height: '12px',
                      cursor: 'pointer',
                      filter: hasActiveColumnFilter('closures') ? 'brightness(0) saturate(100%) invert(42%) sepia(93%) saturate(1352%) hue-rotate(196deg) brightness(95%) contrast(96%)' : 'none',
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
                  backgroundColor: hasActiveColumnFilter('boxes') ? 'rgba(59, 130, 246, 0.1)' : '#1C2634',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    BOXES
                    {hasActiveColumnFilter('boxes') && (
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
                    className={`w-3 h-3 transition-opacity ${hasActiveColumnFilter('boxes') ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    ref={(el) => {
                      if (el) filterIconRefs.current['boxes'] = el;
                    }}
                    onClick={(e) => handleFilterClick('boxes', e)}
                    style={{ 
                      width: '12px', 
                      height: '12px',
                      cursor: 'pointer',
                      filter: hasActiveColumnFilter('boxes') ? 'brightness(0) saturate(100%) invert(42%) sepia(93%) saturate(1352%) hue-rotate(196deg) brightness(95%) contrast(96%)' : 'none',
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
                  backgroundColor: hasActiveColumnFilter('labels') ? 'rgba(59, 130, 246, 0.1)' : '#1C2634',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    LABELS
                    {hasActiveColumnFilter('labels') && (
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
                    className={`w-3 h-3 transition-opacity ${hasActiveColumnFilter('labels') ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    ref={(el) => {
                      if (el) filterIconRefs.current['labels'] = el;
                    }}
                    onClick={(e) => handleFilterClick('labels', e)}
                    style={{ 
                      width: '12px', 
                      height: '12px',
                      cursor: 'pointer',
                      filter: hasActiveColumnFilter('labels') ? 'brightness(0) saturate(100%) invert(42%) sepia(93%) saturate(1352%) hue-rotate(196deg) brightness(95%) contrast(96%)' : 'none',
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
                  <button
                    type="button"
                    onClick={() => onProductClick(row)}
                    className="text-xs text-blue-500 hover:text-blue-600"
                    style={{ textDecoration: 'underline', cursor: 'pointer', margin: '0 auto', display: 'block' }}
                  >
                    {row.product.length > 18 ? `${row.product.substring(0, 18)}...` : row.product}
                  </button>
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
                        backgroundColor: isQtyExceedingLabels(row, index) ? 'rgba(239, 68, 68, 0.05)' : '#FFFFFF',
                        borderRadius: '8px',
                        border: isQtyExceedingLabels(row, index) ? '1px solid #EF4444' : '1px solid #E5E7EB',
                        padding: '4px 6px',
                        width: '107px',
                        height: '24px',
                        boxSizing: 'border-box',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      {(() => {
                        const forecastValue = Math.round(row.weeklyForecast || row.forecast || 0);
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
                              const rounded = roundQuantityToCaseSize(numValue, row.size);
                              rawQtyInputValues.current[index] = undefined; // Clear raw value
                              effectiveSetQtyValues(prev => ({
                                ...prev,
                                [index]: rounded
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
                                const rounded = roundQuantityToCaseSize(numValue, row.size);
                                rawQtyInputValues.current[index] = undefined; // Clear raw value
                                effectiveSetQtyValues(prev => ({
                                  ...prev,
                                  [index]: rounded
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
                          color: '#111827',
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
                              
                              // Determine increment based on size
                              let increment = 0;
                              const size = row.size?.toLowerCase() || '';
                              if (size.includes('8oz')) {
                                increment = 60;
                              } else if (size.includes('quart')) {
                                increment = 12;
                              } else if (size.includes('gallon')) {
                                increment = 4;
                              }
                              
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
                              
                              // Determine increment based on size
                              let increment = 0;
                              const size = row.size?.toLowerCase() || '';
                              if (size.includes('8oz')) {
                                increment = 60;
                              } else if (size.includes('quart')) {
                                increment = 12;
                              } else if (size.includes('gallon')) {
                                increment = 4;
                              }
                              
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
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setClickedQtyIndex(clickedQtyIndex === index ? null : index);
                            }}
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
                        );
                      }
                      return null;
                    })()}
                    {clickedQtyIndex === index && (() => {
                      const labelsAvailable = getAvailableLabelsForRow(row, index);
                      const labelsNeeded = effectiveQtyValues[index] ?? 0;
                      return labelsNeeded > labelsAvailable;
                    })() && (
                      <div
                        ref={(el) => {
                          if (el) popupRefs.current[index] = el;
                        }}
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          marginTop: '8px',
                          backgroundColor: '#FFFFFF',
                          borderRadius: '12px',
                          padding: '14px 16px',
                          minWidth: '220px',
                          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                          zIndex: 9999,
                          border: '1px solid #E5E7EB',
                          pointerEvents: 'auto',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onMouseUp={(e) => e.stopPropagation()}
                      >
                        <div style={{ marginBottom: '10px' }}>
                          <h3 style={{
                            fontSize: '14px',
                            fontWeight: 600,
                            color: '#111827',
                            marginBottom: '4px',
                            lineHeight: '1.3',
                          }}>
                            Order exceeds available labels
                          </h3>
                          <p style={{
                            fontSize: '13px',
                            fontWeight: 400,
                            color: '#9CA3AF',
                            lineHeight: '1.4',
                          }}>
                            Labels Available: {getAvailableLabelsForRow(row, index).toLocaleString()}
                          </p>
                        </div>
                        <button
                          style={{
                            width: '100%',
                            height: '32px',
                            backgroundColor: '#3B82F6',
                            color: '#FFFFFF',
                            fontSize: '13px',
                            fontWeight: 600,
                            borderRadius: '6px',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s',
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#2563EB'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#3B82F6'}
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            const labelsAvailable = getAvailableLabelsForRow(row, index);
                            
                            // Round down to nearest case pack increment
                            let increment = 1;
                            const size = row.size?.toLowerCase() || '';
                            if (size.includes('8oz')) increment = 60;
                            else if (size.includes('quart')) increment = 12;
                            else if (size.includes('gallon')) increment = 4;
                            
                            const maxQty = Math.floor(labelsAvailable / increment) * increment;
                            
                            // Mark as manually edited since user clicked "Use Available"
                            manuallyEditedIndices.current.add(index);
                            effectiveSetQtyValues(prev => ({
                              ...prev,
                              [index]: maxQty
                            }));
                            
                            setTimeout(() => setClickedQtyIndex(null), 100);
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          Use Available
                        </button>
                      </div>
                    )}
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
                  color: '#A855F7', // Purple - matches FBA Avail. legend
                }}>
                  {row.doiFba || row.doiTotal || 0}
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
                  color: '#22C55E', // Green - matches Total Inv. legend
                }}>
                  {row.doiTotal || row.daysOfInventory || 0}
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
                  color: '#3B82F6', // Blue - matches Forecast legend
                }}>
                  {Math.round(row.weeklyForecast || row.forecast || 0)}
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

    {/* Column Filter Dropdowns for Bottles, Closures, Boxes, Labels */}
    {Array.from(openFilterColumns).map((columnKey) => {
      if (!filterIconRefs.current[columnKey]) return null;
      return (
        <SortFormulasFilterDropdown
          key={columnKey}
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

