import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { useTheme } from '../../../../context/ThemeContext';
import { useSidebar } from '../../../../context/SidebarContext';
import { toast } from 'sonner';
import { getShipmentProducts, getLabelFormulaByLocation, updateLabelInventoryByLocation, updateShipmentProductLabelCheck, updateShipment } from '../../../../services/productionApi';
import CatalogAPI from '../../../../services/catalogApi';
import { getDriveImageUrl, extractFileId } from '../../../../services/googleDriveApi';
import VarianceStillExceededModal from './VarianceStillExceededModal';
import SortFormulasFilterDropdown from './SortFormulasFilterDropdown';

// Helper function to get image URL (handles both Drive URLs and regular URLs)
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
  
  // Return as-is if it's already a direct URL
  return url;
};

const LabelCheckTable = ({
  shipmentId,
  isRecountMode = false,
  varianceExceededRowIds = [],
  onExitRecountMode,
  onRowsDataChange,
  hideHeader = false,
  refreshKey = 0, // Increment to trigger reload while preserving checked status
  checkAllIncompleteTrigger = 0, // Increment to check all incomplete row checkboxes
  isAdmin = false, // Admin role check for bulk actions
  onSelectedRowsChange, // Callback to notify parent of selected rows count
  onCompleteClick = null, // Callback for Complete button
  onMarkAllLabelChecksAsDone = null, // Callback for Mark All as Done button
}) => {
  const { isDarkMode } = useTheme();
  const { sidebarWidth } = useSidebar();
  const location = useLocation();
  const isPlanningView = location.pathname.includes('planning');
  // Show column dropdown filters in Label Check table (except in planning view)
  const disableFilters = isPlanningView;
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  // Auto-expand table when in recount mode
  useEffect(() => {
    if (isRecountMode) {
      setIsExpanded(true);
    }
  }, [isRecountMode]);

  // Reset completed status for rows that need recount
  useEffect(() => {
    if (isRecountMode && varianceExceededRowIds.length > 0) {
      setCompletedRows(prev => {
        const newSet = new Set(prev);
        // Remove rows that need recount from completed set so they show "Start" again
        varianceExceededRowIds.forEach(id => {
          newSet.delete(id);
        });
        return newSet;
      });
    }
  }, [isRecountMode, varianceExceededRowIds]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [selectedRowIndex, setSelectedRowIndex] = useState(null);
  const [fullRolls, setFullRolls] = useState(['', '', '']);
  const [partialWeights, setPartialWeights] = useState(['', '', '']);
  const [openFilterColumn, setOpenFilterColumn] = useState(null);
  const [isStartPreviewOpen, setIsStartPreviewOpen] = useState(false);
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  const [completedRows, setCompletedRows] = useState(new Set());
  const [confirmedRows, setConfirmedRows] = useState(new Set()); // Rows confirmed without counting
  const [completedRowStatus, setCompletedRowStatus] = useState({}); // id -> insufficient?: true/false
  const [selectedRows, setSelectedRows] = useState(new Set()); // Track selected rows for checkboxes
  const [bulkSelectedRows, setBulkSelectedRows] = useState(new Set()); // Track rows selected for bulk actions
  const [isVarianceStillExceededOpen, setIsVarianceStillExceededOpen] = useState(false);
  const [labelFormula, setLabelFormula] = useState(null); // Current label formula for weight conversion
  const hideActionsDropdown = Boolean(shipmentId);
  const disableHeaderDropdown = true; // Always show label check products; no collapsible header
  const filterIconRefs = useRef({});
  const filterDropdownRef = useRef(null);
  const [filters, setFilters] = useState({});
  const [sortField, setSortField] = useState('');
  const [sortOrder, setSortOrder] = useState('');

  // Fetch label formula when a row is selected for counting
  const fetchLabelFormula = useCallback(async (labelLocation) => {
    if (!labelLocation) {
      setLabelFormula(null);
      return;
    }
    try {
      const formula = await getLabelFormulaByLocation(labelLocation);
      setLabelFormula(formula);
    } catch (error) {
      console.error('Error fetching label formula:', error);
      // Use default formula if fetch fails
      setLabelFormula({
        labels_per_gram: 5.56,
        full_roll_labels: 2500,
        core_weight_grams: 50
      });
    }
  }, []);

  // Load label data from API - reload when shipmentId OR refreshKey changes
  useEffect(() => {
    if (shipmentId) {
      loadLabelData();
    }
  }, [shipmentId, refreshKey]);

  const loadLabelData = async () => {
    try {
      setLoading(true);
      console.log('🔍 Loading label data for shipmentId:', shipmentId);
      const data = await getShipmentProducts(shipmentId);
      console.log('✅ Label data loaded:', {
        shipmentId,
        productCount: data?.length || 0,
        products: data,
      });
      
      // Initialize completed/confirmed rows from saved database status
      const newCompletedRows = new Set();
      const newConfirmedRows = new Set();
      const newCompletedRowStatus = {};
      
      // Transform API data to match table format
      const formattedRows = data.map(product => {
        const row = {
          id: product.id,
          catalogId: product.catalog_id,
          brand: product.brand_name,
          product: product.product_name,
          size: product.size,
          quantity: product.labels_needed,
          lblCurrentInv: product.labels_available || 0,
          labelLocation: product.label_location,
          totalCount: product.label_check_count || '',
          label_check_status: product.label_check_status,
          childAsin: product.child_asin || '',
          childSku: product.child_sku || '',
        };
        
        // Restore completed/confirmed status from database
        if (product.label_check_status === 'confirmed') {
          newConfirmedRows.add(product.id);
          newCompletedRows.add(product.id);
          newCompletedRowStatus[product.id] = false; // Confirmed = not insufficient
        } else if (product.label_check_status === 'counted') {
          newCompletedRows.add(product.id);
          const insufficient = (product.label_check_count || 0) < (product.labels_needed || 0);
          newCompletedRowStatus[product.id] = insufficient;
        }
        
        return row;
      });
      
      // Fetch product images for all rows
      const imagePromises = formattedRows.map(async (row) => {
        if (!row.catalogId) return;
        try {
          const catalogData = await CatalogAPI.getById(row.catalogId);
          if (catalogData) {
            const imageUrl = catalogData.productImages?.productImageUrl || 
                           catalogData.slides?.productImage ||
                           catalogData.mainImage ||
                           catalogData.product_image_url ||
                           null;
            if (imageUrl) {
              return { id: row.id, imageUrl: getImageUrl(imageUrl) };
            }
          }
        } catch (error) {
          console.error(`Error fetching image for product ${row.id}:`, error);
        }
        return null;
      });
      
      const imageResults = await Promise.all(imagePromises);
      const imagesMap = {};
      imageResults.forEach(result => {
        if (result) {
          imagesMap[result.id] = result.imageUrl;
        }
      });
      setProductImages(imagesMap);
      
      console.log('📋 Formatted label rows:', {
        rowCount: formattedRows.length,
        rows: formattedRows,
      });
      
      setRows(formattedRows);
      setCompletedRows(newCompletedRows);
      setConfirmedRows(newConfirmedRows);
      setCompletedRowStatus(newCompletedRowStatus);
    } catch (error) {
      console.error('❌ Error loading label data:', error);
      console.error('Error details:', {
        shipmentId,
        message: error.message,
        stack: error.stack,
        error: error,
      });
      setRows([]); // Use empty array on error instead of dummy data
    } finally {
      setLoading(false);
    }
  };

  // Handle bulk checkbox change (for bulk actions)
  const handleBulkCheckboxChange = (id) => {
    setBulkSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Handle select all checkbox in header
  const handleSelectAll = (checked) => {
    const filteredRows = getFilteredRows();
    if (isAdmin) {
      if (checked) {
        // Add all filtered row IDs to bulkSelectedRows (preserve existing selections)
        setBulkSelectedRows(prev => {
          const newSet = new Set(prev);
          filteredRows.forEach(row => newSet.add(row.id));
          return newSet;
        });
      } else {
        // Remove all filtered row IDs from bulkSelectedRows
        setBulkSelectedRows(prev => {
          const newSet = new Set(prev);
          filteredRows.forEach(row => newSet.delete(row.id));
          return newSet;
        });
      }
    } else {
      if (checked) {
        // Add all filtered row IDs to selectedRows (preserve existing selections)
        setSelectedRows(prev => {
          const newSet = new Set(prev);
          filteredRows.forEach(row => newSet.add(row.id));
          return newSet;
        });
      } else {
        // Remove all filtered row IDs from selectedRows
        setSelectedRows(prev => {
          const newSet = new Set(prev);
          filteredRows.forEach(row => newSet.delete(row.id));
          return newSet;
        });
      }
    }
  };

  // Check if all filtered rows are selected
  const areAllRowsSelected = () => {
    const filteredRows = getFilteredRows();
    if (filteredRows.length === 0) return false;
    
    if (isAdmin) {
      return filteredRows.every(row => bulkSelectedRows.has(row.id));
    } else {
      return filteredRows.every(row => selectedRows.has(row.id));
    }
  };

  // Handle bulk complete action
  const handleBulkComplete = async () => {
    if (bulkSelectedRows.size === 0) return;
    
    try {
      setLoading(true);
      // Complete all selected products by marking them as confirmed
      const promises = Array.from(bulkSelectedRows).map(async (id) => {
        try {
          await updateShipmentProductLabelCheck(shipmentId, id, 'confirmed');
        } catch (error) {
          console.error(`Error completing product ${id}:`, error);
        }
      });
      await Promise.all(promises);
      
      // Reload data
      await loadLabelData();
      await checkAndClearLabelCheckComment();
      
      // Clear bulk selection
      setBulkSelectedRows(new Set());
    } catch (error) {
      console.error('Error bulk completing label checks:', error);
    } finally {
      setLoading(false);
    }
  };

  // Check if all label checks are complete and clear comment if so
  const checkAndClearLabelCheckComment = async () => {
    if (!shipmentId) return;
    
    try {
      // Reload data to get current status
      const data = await getShipmentProducts(shipmentId);
      
      // Check if all products are complete (confirmed or counted)
      const allComplete = data.length > 0 && data.every(product => 
        product.label_check_status === 'confirmed' || product.label_check_status === 'counted'
      );
      
      console.log('Checking label check completion:', {
        totalProducts: data.length,
        allComplete,
        statuses: data.map(p => ({ id: p.id, status: p.label_check_status }))
      });
      
      if (allComplete) {
        // Clear the label_check_comment since all are now complete
        // Use empty string to ensure it's cleared (some databases prefer empty string over null)
        try {
          const result = await updateShipment(shipmentId, { label_check_comment: '' });
          console.log('Label check comment cleared - all products are complete', result);
        } catch (updateError) {
          console.error('Error clearing label check comment:', updateError);
          // Try with null as fallback
          try {
            const result = await updateShipment(shipmentId, { label_check_comment: null });
            console.log('Label check comment cleared (using null)', result);
          } catch (nullError) {
            console.error('Error clearing label check comment with null:', nullError);
          }
        }
      } else {
        console.log('Not all products are complete yet:', {
          total: data.length,
          completed: data.filter(p => p.label_check_status === 'confirmed' || p.label_check_status === 'counted').length
        });
      }
    } catch (error) {
      console.error('Error checking and clearing label check comment:', error);
      // Don't throw - this is a cleanup operation
    }
  };

  // Initialize rows state with empty array - only use real data from API
  const [rows, setRows] = useState([]);
  const [productImages, setProductImages] = useState({}); // Store product images by row id

  // Check all incomplete row checkboxes when trigger changes
  useEffect(() => {
    if (checkAllIncompleteTrigger > 0 && rows.length > 0) {
      setSelectedRows(prev => {
        const newSet = new Set(prev);
        // Add all incomplete rows (rows without confirmed or counted status) to selectedRows
        rows.forEach(row => {
          const isCompleted = row.label_check_status === 'confirmed' || row.label_check_status === 'counted';
          if (!isCompleted) {
            newSet.add(row.id);
          }
        });
        return newSet;
      });
    }
  }, [checkAllIncompleteTrigger, rows]);

  const columns = [
    { key: 'checkbox', label: '', width: '50px' },
    { key: 'start', label: '', width: '100px' },
    { key: 'product', label: 'PRODUCTS', width: 'auto' },
    { key: 'size', label: 'SIZE', width: '100px' },
    { key: 'quantity', label: 'QUANTITY', width: '120px' },
    { key: 'lblCurrentInv', label: 'LABEL INV', width: '150px' },
    { key: 'labelLocation', label: 'LABEL LOCATION', width: '150px' },
  ];

  const formatNumber = (num) => {
    if (num === '' || num === null || num === undefined) return '';
    return num.toLocaleString();
  };

  // Get unique values for a column (for dropdown list)
  const getColumnValues = (columnKey) => {
    const values = new Set();
    rows.forEach(row => {
      const val = row[columnKey];
      if (val !== undefined && val !== null && val !== '') {
        values.add(val);
      }
    });
    const sortedValues = Array.from(values).sort((a, b) => {
      if (typeof a === 'number' && typeof b === 'number') return a - b;
      return String(a).localeCompare(String(b));
    });
    return sortedValues;
  };

  const isNumericColumn = (columnKey) =>
    columnKey === 'quantity' || columnKey === 'lblCurrentInv';

  // Check if a column has active filters (excludes sort - only checks for Filter by Values and Filter by Conditions)
  const hasActiveFilter = (columnKey) => {
    const filter = filters[columnKey];
    if (!filter || filter === null || filter === undefined) return false;
    
    // Check for condition filter
    const hasCondition = filter.conditionType && filter.conditionType !== '';
    if (hasCondition) return true;
    
    // Check for value filters - only active if not all values are selected
    if (!filter.selectedValues || filter.selectedValues.size === 0) return false;
    
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

  const applyConditionFilter = (value, conditionType, conditionValue, numeric) => {
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

  const handleApplyFilter = (columnKey, filterData) => {
    // If filterData is null, remove the filter (Reset was clicked)
    if (filterData === null) {
      setFilters(prev => {
        const newFilters = { ...prev };
        delete newFilters[columnKey];
        return newFilters;
      });
      // Also clear sort for this column
      if (sortField === columnKey) {
        setSortField('');
        setSortOrder('');
      }
      return;
    }
    
    setFilters(prev => ({
      ...prev,
      [columnKey]: {
        selectedValues: filterData.selectedValues || new Set(),
        conditionType: filterData.conditionType || '',
        conditionValue: filterData.conditionValue || '',
      },
    }));

    if (filterData.sortOrder) {
      setSortField(columnKey);
      setSortOrder(filterData.sortOrder);
    } else if (sortField === columnKey) {
      setSortField('');
      setSortOrder('');
    }
  };

  const getFilteredRows = () => {
    // Base rows: all rows, or only variance-exceeded in recount mode
    const baseRows = isRecountMode
      ? rows.filter(row => varianceExceededRowIds.includes(row.id))
      : rows;

    let result = [...baseRows];

    // Apply filters
    Object.keys(filters).forEach(columnKey => {
      const filter = filters[columnKey];
      if (!filter) return;

      const numeric = isNumericColumn(columnKey);

      // Value filters
      if (filter.selectedValues && filter.selectedValues.size > 0) {
        result = result.filter(row => {
          const value = row[columnKey];
          return (
            filter.selectedValues.has(value) ||
            filter.selectedValues.has(String(value))
          );
        });
      }

      // Condition filters
      if (filter.conditionType) {
        result = result.filter(row =>
          applyConditionFilter(
            row[columnKey],
            filter.conditionType,
            filter.conditionValue,
            numeric
          )
        );
      }
    });

    // Apply single-column sort
    if (sortField && sortOrder) {
      const numeric = isNumericColumn(sortField);
      result.sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];

        if (numeric) {
          const aNum = Number(aVal) || 0;
          const bNum = Number(bVal) || 0;
          return sortOrder === 'asc' ? aNum - bNum : bNum - aNum;
        }

        const aStr = String(aVal ?? '').toLowerCase();
        const bStr = String(bVal ?? '').toLowerCase();
        return sortOrder === 'asc'
          ? aStr.localeCompare(bStr)
          : bStr.localeCompare(aStr);
      });
    }

    return result;
  };

  const handleStartClick = (row, index) => {
    setSelectedRow(row);
    setSelectedRowIndex(index);
    setIsStartPreviewOpen(true);
    // Fetch label formula when opening the modal
    if (row.labelLocation) {
      fetchLabelFormula(row.labelLocation);
    }
  };

  const handleEditClick = (row, index) => {
    setSelectedRow(row);
    setSelectedRowIndex(index);
    // If it was counted, open the edit modal with existing data
    // If it was confirmed, open the preview modal
    if (row.label_check_status === 'counted' && row.totalCount) {
      // Restore the count data - we'll need to parse it
      // For now, just open the edit modal
      setIsModalOpen(true);
      // Reset form fields - user will need to re-enter
      setFullRolls(['', '', '']);
      setPartialWeights(['', '', '']);
    } else {
      // It was confirmed, open preview modal
      setIsStartPreviewOpen(true);
    }
    // Fetch label formula when opening the modal
    if (row.labelLocation) {
      fetchLabelFormula(row.labelLocation);
    }
  };

  const handleReset = async () => {
    if (selectedRow && selectedRow.id && shipmentId) {
      try {
        // Reset status to null by calling API with null status
        await updateShipmentProductLabelCheck(shipmentId, selectedRow.id, null);
        console.log(`Label check reset for product ${selectedRow.id}`);
        
        // Reload data from API to ensure consistency
        await loadLabelData();
        
        handleCloseModal();
      } catch (error) {
        console.error('Error resetting label check:', error);
        // Still update local state even if API fails
        setCompletedRows(prev => {
          const newSet = new Set(prev);
          newSet.delete(selectedRow.id);
          return newSet;
        });
        setConfirmedRows(prev => {
          const newSet = new Set(prev);
          newSet.delete(selectedRow.id);
          return newSet;
        });
        const updatedRows = rows.map(r => 
          r.id === selectedRow.id 
            ? { ...r, totalCount: '', label_check_status: null }
            : r
        );
        setRows(updatedRows);
        handleCloseModal();
      }
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsStartPreviewOpen(false);
    setSelectedRow(null);
    setSelectedRowIndex(null);
    setFullRolls(['', '', '']);
    setPartialWeights(['', '', '']);
  };

  const handleSave = async () => {
    if (selectedRow && selectedRow.id) {
      const calculatedTotal = calculateTotalLabels();
      const labelsNeeded = selectedRow.quantity || 0;
      const discrepancy = calculatedTotal - labelsNeeded;
      const insufficient = calculatedTotal < labelsNeeded;
      
      // Check if variance exceeds threshold
      const varianceExceeds = checkVarianceExceeded(discrepancy, labelsNeeded);
      
      if (varianceExceeds) {
        // Show the variance still exceeded modal
        setIsVarianceStillExceededOpen(true);
        // Don't close the edit modal yet - user might want to go back and edit
        return;
      }
      
      // Save label check status to database (this also updates label_inventory)
      if (shipmentId) {
        try {
          await updateShipmentProductLabelCheck(shipmentId, selectedRow.id, 'counted', calculatedTotal);
          console.log(`Label check counted for product ${selectedRow.id}: ${calculatedTotal}`);
        } catch (error) {
          console.error('Error saving label check:', error);
          // Fallback: try to update label inventory directly
          if (selectedRow.labelLocation) {
            try {
              await updateLabelInventoryByLocation(selectedRow.labelLocation, calculatedTotal);
            } catch (e) {
              console.error('Error updating label inventory:', e);
            }
          }
        }
      }
      
      // Reload data from API to ensure consistency
      await loadLabelData();
      
      // Check if all products are now complete and clear comment if so (after reload)
      await checkAndClearLabelCheckComment();
      
      handleCloseModal();
    }
  };

  const handleVarianceGoBack = () => {
    // Close the variance modal but keep the edit modal open
    setIsVarianceStillExceededOpen(false);
  };

  const handleVarianceConfirm = async () => {
    // User confirmed the variance - save the data and close both modals
    if (selectedRow && selectedRow.id) {
      const calculatedTotal = calculateTotalLabels();
      const labelsNeeded = selectedRow.quantity || 0;
      const insufficient = calculatedTotal < labelsNeeded;
      
      // Save label check status to database (this also updates label_inventory)
      if (shipmentId) {
        try {
          await updateShipmentProductLabelCheck(shipmentId, selectedRow.id, 'counted', calculatedTotal);
          console.log(`Label check counted (variance confirmed) for product ${selectedRow.id}: ${calculatedTotal}`);
        } catch (error) {
          console.error('Error saving label check:', error);
          // Fallback: try to update label inventory directly
          if (selectedRow.labelLocation) {
            try {
              await updateLabelInventoryByLocation(selectedRow.labelLocation, calculatedTotal);
            } catch (e) {
              console.error('Error updating label inventory:', e);
            }
          }
        }
      }
      
      // Reload data from API to ensure consistency
      await loadLabelData();
      
      // Check if all products are now complete and clear comment if so (after reload)
      await checkAndClearLabelCheckComment();
    }
    setIsVarianceStillExceededOpen(false);
    handleCloseModal();
  };

  const handleAddRoll = () => {
    setFullRolls([...fullRolls, '']);
  };

  const handleAddWeight = () => {
    setPartialWeights([...partialWeights, '']);
  };

  const handleRollChange = (index, value) => {
    const newRolls = [...fullRolls];
    newRolls[index] = value;
    setFullRolls(newRolls);
  };

  const handleWeightChange = (index, value) => {
    const newWeights = [...partialWeights];
    newWeights[index] = value;
    setPartialWeights(newWeights);
  };

  const calculateTotalLabels = () => {
    // Label Weight Calculation Formula from 1000 Bananas Database > LabelFormulas:
    // - Full roll count: User enters actual label count directly (e.g., 2500 labels)
    // - Partial roll: labels = (gram_weight - core_weight) / grams_per_label
    
    // Full rolls: Sum of all entered label counts (direct values)
    const fullRollTotal = fullRolls.reduce((sum, roll) => {
      const numLabels = parseInt(roll) || 0;
      return sum + numLabels; // Direct label count
    }, 0);
    
    // Partial rolls: Convert weight to labels using formula
    // Default formula values if not loaded: core_weight=71g, grams_per_label=3.35
    const coreWeight = labelFormula?.core_weight_grams || 71;
    const gramsPerLabel = labelFormula?.grams_per_label || 3.35;
    
    const partialWeightTotal = partialWeights.reduce((sum, weight) => {
      const numGrams = parseFloat(weight) || 0;
      if (numGrams <= coreWeight) return sum; // Not enough weight (just core)
      // Formula: labels = (weight - core_weight) / grams_per_label
      const labels = Math.floor((numGrams - coreWeight) / gramsPerLabel);
      return sum + Math.max(0, labels);
    }, 0);
    
    return fullRollTotal + partialWeightTotal;
  };

  const calculateDiscrepancy = () => {
    if (!selectedRow) return 0;
    const calculatedTotal = calculateTotalLabels();
    // Compare against labels needed for shipment (not current inventory)
    const labelsNeeded = selectedRow.quantity || 0;
    return calculatedTotal - labelsNeeded;
  };

  const isInsufficientLabels = (() => {
    if (!selectedRow) return false;
    const counted = calculateTotalLabels();
    const needed = Number(selectedRow.quantity ?? 0) || 0;
    return counted < needed;
  })();

  // Check if variance exceeds threshold
  // Variance is the difference between calculated total and labels needed
  const checkVarianceExceeded = (discrepancy, labelsNeeded) => {
    const varianceThreshold = 10; // Minimum threshold in units
    const varianceThresholdPercent = 0.05; // 5% threshold
    
    const absVariance = Math.abs(discrepancy);
    const percentThreshold = Math.abs(labelsNeeded * varianceThresholdPercent);
    const threshold = Math.max(varianceThreshold, percentThreshold);
    
    return absVariance > threshold;
  };

  // Notify parent component when rows data changes
  // Include completion status in the row data so parent can track confirmed rows
  useEffect(() => {
    if (onRowsDataChange) {
      // Merge completion status into rows so parent knows which are done
      const rowsWithStatus = rows.map(row => ({
        ...row,
        isComplete: completedRows.has(row.id) || confirmedRows.has(row.id),
        isConfirmed: confirmedRows.has(row.id),
        isCounted: completedRows.has(row.id) && !confirmedRows.has(row.id),
        isInsufficient: completedRowStatus[row.id] || false, // Include insufficient status
      }));
      onRowsDataChange(rowsWithStatus);
    }
  }, [rows, completedRows, confirmedRows, completedRowStatus, onRowsDataChange]);

  // Notify parent component when selected rows change
  useEffect(() => {
    if (onSelectedRowsChange) {
      onSelectedRowsChange(selectedRows.size);
    }
  }, [selectedRows, onSelectedRowsChange]);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openFilterColumn !== null) {
        const filterIcon = filterIconRefs.current[openFilterColumn];
        
        // Check if click is on the filter icon
        const clickedOnFilterIcon = filterIcon && filterIcon.contains && filterIcon.contains(event.target);
        
        // Check if click is inside the dropdown (by ref or attribute)
        const clickedInsideDropdown = 
          (filterDropdownRef.current && filterDropdownRef.current.contains && filterDropdownRef.current.contains(event.target)) ||
          event.target.closest('[data-filter-dropdown]');
        
        if (!clickedOnFilterIcon && !clickedInsideDropdown) {
          setOpenFilterColumn(null);
        }
      }
    };

    if (openFilterColumn !== null) {
      // Use mousedown with capture phase to catch clicks early
      document.addEventListener('mousedown', handleClickOutside, true);
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside, true);
      };
    }
  }, [openFilterColumn]);

  // Force expanded when dropdown is disabled
  useEffect(() => {
    if (disableHeaderDropdown && !isExpanded) {
      setIsExpanded(true);
    }
  }, [disableHeaderDropdown, isExpanded]);

  return (
    <div style={{
      backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
      borderRadius: '12px',
      border: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
      overflow: 'hidden',
      width: '100%',
      marginBottom: '16px',
    }}>
      {/* Bulk Action Bar (Admin only, shown when items are selected) */}
      {isAdmin && bulkSelectedRows.size > 0 && (
        <div style={{
          backgroundColor: isDarkMode ? '#374151' : '#F3F4F6',
          borderBottom: isDarkMode ? '1px solid #4B5563' : '1px solid #E5E7EB',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{
            fontSize: '14px',
            fontWeight: 500,
            color: isDarkMode ? '#E5E7EB' : '#374151',
          }}>
            {bulkSelectedRows.size} {bulkSelectedRows.size === 1 ? 'product' : 'products'} selected
          </span>
          <button
            type="button"
            onClick={handleBulkComplete}
            disabled={loading}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#10B981',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.backgroundColor = '#059669';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.backgroundColor = '#10B981';
              }
            }}
          >
            Complete Selected
          </button>
        </div>
      )}
      {/* Recount Mode Banner */}
      {isRecountMode && (
        <div style={{
          backgroundColor: '#FEF3C7',
          borderBottom: '1px solid #FCD34D',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
              <path d="M12 9v4M12 17h.01" />
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
            </svg>
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#92400E' }}>
              Recount Mode: Showing {varianceExceededRowIds.length} {varianceExceededRowIds.length === 1 ? 'product' : 'products'} with variance exceeded
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (onExitRecountMode) {
                onExitRecountMode();
              }
            }}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #F59E0B',
              backgroundColor: '#FFFFFF',
              color: '#92400E',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#FEF3C7';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
            }}
          >
            Show All
          </button>
        </div>
      )}
      {/* Dropdown Header */}
      {!hideHeader && (
        <div
          onClick={disableHeaderDropdown ? undefined : () => setIsExpanded(!isExpanded)}
          style={{
            padding: '16px 24px',
            marginTop: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: disableHeaderDropdown ? 'default' : 'pointer',
            backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = isDarkMode ? '#374151' : '#FFFFFF';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = isDarkMode ? '#1F2937' : '#FFFFFF';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flex: 1 }}>
            {/* Status Indicator */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #D1D5DB',
              backgroundColor: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 400,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                {/* Radial spinner icon with 12 dashed lines */}
                <g stroke="#3B82F6" strokeWidth="2" strokeLinecap="round">
                  {[...Array(12)].map((_, i) => {
                    const angle = (i * 30) * (Math.PI / 180);
                    const x1 = 12 + 4 * Math.cos(angle);
                    const y1 = 12 + 4 * Math.sin(angle);
                    const x2 = 12 + 6 * Math.cos(angle);
                    const y2 = 12 + 6 * Math.sin(angle);
                    return (
                      <line
                        key={i}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        strokeDasharray="2 2"
                      />
                    );
                  })}
                </g>
              </svg>
              <span style={{ color: '#000000' }}>In Progress</span>
            </div>

            {/* COUNT ID */}
            <div style={{
              fontSize: '14px',
              fontWeight: 400,
              color: isDarkMode ? '#9CA3AF' : '#6B7280',
            }}>
              COUNT ID
            </div>
            <div style={{
              fontSize: '14px',
              fontWeight: 700,
              color: isDarkMode ? '#E5E7EB' : '#111827',
            }}>
              CC-DC-1
            </div>

            {/* COUNT TYPE */}
            <div style={{
              fontSize: '14px',
              fontWeight: 400,
              color: isDarkMode ? '#9CA3AF' : '#6B7280',
            }}>
              COUNT TYPE
            </div>
            <div style={{
              fontSize: '14px',
              fontWeight: 700,
              color: isDarkMode ? '#E5E7EB' : '#111827',
            }}>
              Shipment Count
            </div>

            {/* DATE CREATED */}
            <div style={{
              fontSize: '14px',
              fontWeight: 400,
              color: isDarkMode ? '#9CA3AF' : '#6B7280',
            }}>
              DATE CREATED
            </div>
            <div style={{
              fontSize: '14px',
              fontWeight: 700,
              color: isDarkMode ? '#E5E7EB' : '#111827',
            }}>
              2025-11-20
            </div>
          </div>
          
          {!disableHeaderDropdown && (
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              style={{
                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
                color: '#3B82F6',
              }}
            >
              <path
                d="M4 6L8 10L12 6"
                stroke="#3B82F6"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      )}

      {/* Expanded Table */}
      {(hideHeader || isExpanded) && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            borderSpacing: 0,
          }}>
            <thead style={{ backgroundColor: '#1A2235' }}>
              <tr style={{ 
                height: '66px', 
                maxHeight: '66px',
                borderBottom: 'none',
                position: 'relative',
              }}>
                {/* Header separator line with 20px margins on both ends */}
                <th
                  colSpan={columns.length}
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: '20px',
                    right: '20px',
                    height: '1px',
                    backgroundColor: '#4B5563',
                    padding: 0,
                    border: 'none',
                    pointerEvents: 'none',
                  }}
                />
                {(() => {
                  const filteredRows = getFilteredRows();
                  return columns.map((column) => {
                    const isActive = hasActiveFilter(column.key);
                    return (
                    <th
                      key={column.key}
                      className={column.key !== 'start' ? 'group cursor-pointer' : ''}
                      style={{
                        padding: (column.key === 'start' || column.key === 'checkbox') 
                          ? '0 8px' 
                          : (column.key === 'size' || column.key === 'quantity' || column.key === 'lblCurrentInv' || column.key === 'labelLocation')
                            ? '0 24px 0 4px' // Reduce left padding by 20px (24px - 20px = 4px)
                            : '0 24px',
                        marginLeft: (column.key === 'size' || column.key === 'quantity' || column.key === 'lblCurrentInv' || column.key === 'labelLocation')
                          ? '-20px'
                          : '0',
                        textAlign: 'center',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: isDarkMode ? '#9CA3AF' : '#6B7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        width: column.width,
                        whiteSpace: 'nowrap',
                        borderRight: 'none',
                        height: '66px',
                        position: (column.key !== 'start' && column.key !== 'checkbox') ? 'relative' : 'static',
                        backgroundColor: isActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                        borderBottom: 'none',
                      }}
                    >
                      {column.key === 'checkbox' ? (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginLeft: '35px',
                        }}>
                          <label
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={areAllRowsSelected()}
                              onChange={(e) => handleSelectAll(e.target.checked)}
                              style={{
                                position: 'absolute',
                                opacity: 0,
                                width: 0,
                                height: 0,
                              }}
                              title="Select all rows"
                            />
                            <span
                              style={{
                                width: '16px',
                                height: '16px',
                                border: '1px solid #6B7280',
                                borderRadius: '3px',
                                boxSizing: 'border-box',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: areAllRowsSelected() ? '#3B82F6' : 'transparent',
                              }}
                            >
                              {areAllRowsSelected() && (
                                <span
                                  style={{
                                    width: '10px',
                                    height: '6px',
                                    borderBottom: '2px solid #FFFFFF',
                                    borderLeft: '2px solid #FFFFFF',
                                    transform: 'rotate(-45deg)',
                                    marginTop: '-1px',
                                    marginLeft: '0px',
                                  }}
                                />
                              )}
                            </span>
                          </label>
                        </div>
                      ) : column.key === 'start' ? (
                        // Empty header for Start column
                        <div></div>
                      ) : (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: column.key === 'product' ? 'flex-start' : 'center',
                          gap: '0.5rem',
                          marginLeft: column.key === 'product' ? '40px' : '0',
                        }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {column.label}
                            {isActive && (
                              <span style={{ 
                                display: 'inline-block',
                                width: '6px', 
                                height: '6px', 
                                borderRadius: '50%', 
                                backgroundColor: '#10B981',
                              }} />
                            )}
                          </span>
                          {!disableFilters && column.key !== 'start' && column.key !== 'checkbox' && (
                            <img
                              ref={(el) => { if (el) filterIconRefs.current[column.key] = el; }}
                              src="/assets/Vector (1).png"
                              alt="Filter"
                              className={`w-3 h-3 transition-opacity cursor-pointer ${
                                isActive || openFilterColumn === column.key
                                  ? 'opacity-100'
                                  : 'opacity-0 group-hover:opacity-100'
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenFilterColumn(openFilterColumn === column.key ? null : column.key);
                              }}
                              style={{
                                width: '12px',
                                height: '12px',
                                ...(isActive || openFilterColumn === column.key
                                  ? {
                                      filter:
                                        'invert(29%) sepia(94%) saturate(2576%) hue-rotate(199deg) brightness(102%) contrast(105%)',
                                    }
                                  : undefined)
                              }}
                            />
                          )}
                        </div>
                      )}
                  </th>
                  );
                  });
                })()}
              </tr>
            </thead>

            <tbody>
              {getFilteredRows().map((row, index) => {
                // Find the original index for styling
                const originalIndex = rows.findIndex(r => r.id === row.id);
                return (
                <tr
                  key={`${row.id}-${index}`}
                  style={{
                    backgroundColor: isDarkMode ? '#1A2235' : '#F9FAFB',
                    borderBottom: 'none',
                    borderTop: 'none',
                    borderLeft: 'none',
                    borderRight: 'none',
                    transition: 'background-color 0.2s',
                    height: '66px',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = isDarkMode ? '#232c41' : '#F3F4F6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = isDarkMode ? '#1A2235' : '#F9FAFB';
                  }}
                >
                  {/* Separator line with 20px margins on both ends */}
                  <td
                    colSpan={columns.length}
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: '20px',
                      right: '20px',
                      height: '1px',
                      backgroundColor: '#4B5563',
                      padding: 0,
                      border: 'none',
                      pointerEvents: 'none',
                    }}
                  />
                  <td style={{
                    padding: '0 8px',
                    textAlign: 'center',
                    height: '66px',
                    borderBottom: 'none',
                  }}>
                    <div style={{ marginLeft: '30px', marginRight: '-10px' }}>
                      <label
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isAdmin ? bulkSelectedRows.has(row.id) : selectedRows.has(row.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            if (isAdmin) {
                              handleBulkCheckboxChange(row.id);
                            } else {
                              setSelectedRows(prev => {
                                const newSet = new Set(prev);
                                if (e.target.checked) {
                                  newSet.add(row.id);
                                } else {
                                  newSet.delete(row.id);
                                }
                                return newSet;
                              });
                            }
                          }}
                          style={{
                            position: 'absolute',
                            opacity: 0,
                            width: 0,
                            height: 0,
                          }}
                          title={isAdmin ? "Select for bulk action" : undefined}
                        />
                        <span
                          style={{
                            width: '16px',
                            height: '16px',
                            border: '1px solid #6B7280',
                            borderRadius: '3px',
                            boxSizing: 'border-box',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: (isAdmin ? bulkSelectedRows.has(row.id) : selectedRows.has(row.id))
                              ? '#3B82F6'
                              : 'transparent',
                          }}
                        >
                          {(isAdmin ? bulkSelectedRows.has(row.id) : selectedRows.has(row.id)) && (
                            <span
                              style={{
                                width: '10px',
                                height: '6px',
                                borderBottom: '2px solid #FFFFFF',
                                borderLeft: '2px solid #FFFFFF',
                                transform: 'rotate(-45deg)',
                                marginTop: '-1px',
                                marginLeft: '0px',
                              }}
                            />
                          )}
                        </span>
                      </label>
                    </div>
                  </td>
                  <td style={{
                    padding: '0 8px',
                    textAlign: 'center',
                    height: '66px',
                    borderBottom: 'none',
                  }}>
                    <div style={{ marginLeft: '20px' }}>
                    {completedRows.has(row.id) ? (
                      <button
                        type="button"
                        onClick={() => handleStartClick(row, index)}
                        className="done-badge-btn"
                        style={{
                          height: '26px',
                          padding: '0 12px',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: '#10B981',
                          color: '#FFFFFF',
                          fontSize: '12px',
                          fontWeight: 600,
                          letterSpacing: '0.025em',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '5px',
                          whiteSpace: 'nowrap',
                          minWidth: '60px',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                          position: 'relative',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#059669';
                          e.currentTarget.style.transform = 'scale(1.02)';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                          // Show edit icon
                          const icon = e.currentTarget.querySelector('.edit-icon');
                          if (icon) icon.style.opacity = '1';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#10B981';
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                          // Hide edit icon
                          const icon = e.currentTarget.querySelector('.edit-icon');
                          if (icon) icon.style.opacity = '0';
                        }}
                        title="Click to edit"
                      >
                        <svg 
                          width="12" 
                          height="12" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2.5"
                          style={{ marginRight: '-2px' }}
                        >
                          <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span>Done</span>
                        <svg 
                          className="edit-icon"
                          width="10" 
                          height="10" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2.5"
                          style={{ 
                            opacity: 0, 
                            transition: 'opacity 0.15s ease',
                            marginLeft: '2px',
                          }}
                        >
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleStartClick(row, index)}
                        style={{
                          height: '26px',
                          padding: '0 14px',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: '#3B82F6',
                          color: '#FFFFFF',
                          fontSize: '12px',
                          fontWeight: 600,
                          letterSpacing: '0.025em',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          whiteSpace: 'nowrap',
                          minWidth: '60px',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#2563EB';
                          e.currentTarget.style.transform = 'scale(1.02)';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#3B82F6';
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                        }}
                      >
                        Start
                      </button>
                    )}
                    </div>
                  </td>
                  {/* PRODUCTS Column - with image, name, SKU, brand */}
                  <td style={{
                    padding: '0 16px',
                    fontSize: '14px',
                    fontWeight: 400,
                    color: isDarkMode ? '#E5E7EB' : '#374151',
                    height: '66px',
                    verticalAlign: 'middle',
                    borderBottom: 'none',
                    textAlign: 'center',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                      {/* Product Image Thumbnail */}
                      <div style={{ 
                        width: '36px', 
                        height: '36px', 
                        minWidth: '36px', 
                        borderRadius: '3px', 
                        overflow: 'hidden', 
                        backgroundColor: isDarkMode ? '#374151' : '#F3F4F6', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        flexShrink: 0 
                      }}>
                        {productImages[row.id] ? (
                          <img 
                            src={productImages[row.id]} 
                            alt={row.product} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            onError={(e) => { 
                              e.target.style.display = 'none'; 
                              if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex'; 
                            }} 
                          />
                        ) : null}
                        <div style={{ 
                          display: productImages[row.id] ? 'none' : 'flex', 
                          flexDirection: 'column', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          width: '100%', 
                          height: '100%', 
                          borderRadius: '3px', 
                          gap: '7.5px', 
                          color: isDarkMode ? '#6B7280' : '#9CA3AF', 
                          fontSize: '12px' 
                        }}>
                          No img
                        </div>
                      </div>
                      
                      {/* Product Info */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
                        {/* Product Name - Clickable Link */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Could navigate to product detail page if needed
                          }}
                          style={{ 
                            fontSize: '14px', 
                            fontWeight: 500, 
                            color: '#3B82F6',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            textAlign: 'left',
                            cursor: 'pointer',
                            textDecoration: 'none'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#2563EB';
                            e.currentTarget.style.textDecoration = 'underline';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#3B82F6';
                            e.currentTarget.style.textDecoration = 'none';
                          }}
                        >
                          {row.product}
                        </button>
                        
                        {/* SKU/ASIN with Copy Icon and Brand/Size */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', flexWrap: 'wrap' }}>
                          {/* SKU/ASIN with Copy Icon */}
                          {(row.childSku || row.childAsin) && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '12px', color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>
                                {row.childSku || row.childAsin}
                              </span>
                              <img 
                                src="/assets/copyy.png" 
                                alt="Copy" 
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const skuToCopy = row.childSku || row.childAsin;
                                  try {
                                    // Try modern clipboard API first
                                    if (navigator.clipboard && navigator.clipboard.writeText) {
                                      await navigator.clipboard.writeText(skuToCopy);
                                    } else {
                                      // Fallback for non-secure contexts or older browsers
                                      const textArea = document.createElement('textarea');
                                      textArea.value = skuToCopy;
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
                                    toast.success('SKU copied to clipboard', {
                                      description: skuToCopy,
                                      duration: 2000,
                                    });
                                  } catch (err) {
                                    console.error('Failed to copy SKU:', err);
                                    toast.error('Failed to copy SKU', {
                                      description: 'Please try again',
                                      duration: 2000,
                                    });
                                  }
                                }}
                                style={{ width: '14px', height: '14px', cursor: 'pointer', flexShrink: 0 }} 
                              />
                            </div>
                          )}
                          
                          {/* Brand and Size with dot separator */}
                          {(row.childSku || row.childAsin) && (
                            <span style={{ fontSize: '12px', color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>
                              •
                            </span>
                          )}
                          <span style={{ fontSize: '12px', color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>
                            {row.brand} • {row.size}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{
                    padding: '0 16px 0 -4px',
                    fontSize: '14px',
                    fontWeight: 400,
                    color: isDarkMode ? '#E5E7EB' : '#374151',
                    height: '66px',
                    borderBottom: 'none',
                    marginLeft: '-35px',
                    textAlign: 'center',
                    verticalAlign: 'middle',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', marginLeft: '-15px' }}>
                      {row.size}
                    </div>
                  </td>
                  <td style={{
                    padding: '0 16px 0 -4px',
                    fontSize: '14px',
                    fontWeight: 400,
                    color: isDarkMode ? '#E5E7EB' : '#374151',
                    height: '66px',
                    textAlign: 'center',
                    borderBottom: 'none',
                    marginLeft: '-35px',
                    verticalAlign: 'middle',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', marginLeft: '-15px' }}>
                      {formatNumber(row.quantity)}
                    </div>
                  </td>
                  <td style={{
                    padding: '0 16px 0 -4px',
                    fontSize: '14px',
                    fontWeight: 400,
                    color: isDarkMode ? '#E5E7EB' : '#374151',
                    height: '66px',
                    textAlign: 'center',
                    borderBottom: 'none',
                    marginLeft: '-35px',
                    verticalAlign: 'middle',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', marginLeft: '-15px' }}>
                      {formatNumber(row.lblCurrentInv)}
                    </div>
                  </td>
                  <td style={{
                    padding: '0 16px 0 -4px',
                    fontSize: '14px',
                    fontWeight: 400,
                    color: isDarkMode ? '#E5E7EB' : '#374151',
                    height: '66px',
                    borderBottom: 'none',
                    marginLeft: '-35px',
                    textAlign: 'center',
                    verticalAlign: 'middle',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', marginLeft: '-15px' }}>
                      {row.labelLocation}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Label Inventory Modal */}
      {isModalOpen && selectedRow && createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={handleCloseModal}
        >
          <div
            style={{
              backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
              borderRadius: '12px',
              width: '90%',
              maxWidth: '800px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#1C2634',
              padding: '16px 24px',
              margin: '-24px -24px 24px -24px',
              borderRadius: '12px 12px 0 0',
            }}>
              <h2 style={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#E5E7EB',
                margin: 0,
              }}>
                Edit Label Inventory
              </h2>
              <button
                type="button"
                onClick={handleCloseModal}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#9CA3AF',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#FFFFFF';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#9CA3AF';
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            {/* Product Information */}
            <div style={{
              backgroundColor: isDarkMode ? '#374151' : '#F9FAFB',
              borderRadius: '8px',
              border: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
              padding: '16px',
              marginBottom: '24px',
              display: 'flex',
              gap: '32px',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: 400,
                  color: isDarkMode ? '#9CA3AF' : '#6B7280',
                  marginBottom: '4px',
                }}>
                  Product Name
                </div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: isDarkMode ? '#E5E7EB' : '#111827',
                }}>
                  {selectedRow.product} ({selectedRow.size})
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: 400,
                  color: isDarkMode ? '#9CA3AF' : '#6B7280',
                  marginBottom: '4px',
                }}>
                  Label Location
                </div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: isDarkMode ? '#E5E7EB' : '#111827',
                }}>
                  {selectedRow.labelLocation}
                </div>
              </div>
            </div>

            {/* Two Columns */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '24px',
              marginBottom: '24px',
            }}>
              {/* Left Column: Full Roll Label Count */}
              <div>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: isDarkMode ? '#E5E7EB' : '#111827',
                  marginBottom: '8px',
                }}>
                  Full Roll Label Count
                </h3>
                <p style={{
                  fontSize: '14px',
                  fontWeight: 400,
                  color: isDarkMode ? '#9CA3AF' : '#6B7280',
                  marginBottom: '16px',
                }}>
                  Enter the label count for each full roll (e.g., 2500).
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {fullRolls.map((roll, index) => (
                    <input
                      key={index}
                      type="number"
                      placeholder="Enter label count..."
                      value={roll}
                      onChange={(e) => handleRollChange(index, e.target.value)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: `1px solid ${isDarkMode ? '#374151' : '#D1D5DB'}`,
                        backgroundColor: isDarkMode ? '#374151' : '#FFFFFF',
                        color: isDarkMode ? '#E5E7EB' : '#111827',
                        fontSize: '14px',
                        outline: 'none',
                      }}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={handleAddRoll}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'transparent',
                      border: 'none',
                      color: '#3B82F6',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      padding: '8px 0',
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2">
                      <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
                    </svg>
                    Add Another Roll
                  </button>
                </div>
              </div>

              {/* Right Column: Partial Roll Weight */}
              <div>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: isDarkMode ? '#E5E7EB' : '#111827',
                  marginBottom: '8px',
                }}>
                  Partial Roll Weight (g)
                </h3>
                <p style={{
                  fontSize: '14px',
                  fontWeight: 400,
                  color: isDarkMode ? '#9CA3AF' : '#6B7280',
                  marginBottom: '16px',
                }}>
                  Enter the weight in grams for each partially used roll.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {partialWeights.map((weight, index) => (
                    <input
                      key={index}
                      type="text"
                      placeholder="Enter roll weight..."
                      value={weight}
                      onChange={(e) => handleWeightChange(index, e.target.value)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: `1px solid ${isDarkMode ? '#374151' : '#D1D5DB'}`,
                        backgroundColor: isDarkMode ? '#374151' : '#FFFFFF',
                        color: isDarkMode ? '#E5E7EB' : '#111827',
                        fontSize: '14px',
                        outline: 'none',
                      }}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={handleAddWeight}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'transparent',
                      border: 'none',
                      color: '#3B82F6',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      padding: '8px 0',
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2">
                      <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
                    </svg>
                    Add Another Weight
                  </button>
                </div>
              </div>
            </div>

            {/* Calculated Total Labels */}
            <div style={{
              backgroundColor: isDarkMode ? '#374151' : '#F9FAFB',
              borderRadius: '8px',
              border: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
              padding: '16px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: isDarkMode ? '#E5E7EB' : '#111827',
                  marginBottom: '4px',
                }}>
                  Calculated Total Labels
                </h3>
                <p style={{
                  fontSize: '14px',
                  fontWeight: 400,
                  color: isDarkMode ? '#9CA3AF' : '#6B7280',
                  margin: 0,
                }}>
                  Labels Needed: {formatNumber(selectedRow.quantity || 0)}
                </p>
              </div>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: '8px',
              }}>
                <div style={{
                  fontSize: '32px',
                  fontWeight: 700,
                  color: isDarkMode ? '#E5E7EB' : '#111827',
                }}>
                  {calculateTotalLabels()}
                </div>
                {(() => {
                  const calculatedTotal = calculateTotalLabels();
                  const labelsNeeded = selectedRow.quantity || 0;
                  const discrepancy = calculatedTotal - labelsNeeded;
                  return discrepancy !== 0 && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: discrepancy < 0 ? '#EF4444' : '#10B981',
                      fontSize: '14px',
                      fontWeight: 500,
                    }}>
                      {discrepancy < 0 && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                      {discrepancy > 0 && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M5 15l7-7 7 7" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                      <span>
                        {discrepancy > 0 ? '+' : ''}{discrepancy} {discrepancy < 0 ? 'Short' : 'Surplus'}
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Footer Buttons */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              paddingTop: '24px',
            }}>
              <button
                type="button"
                onClick={handleCloseModal}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: `1px solid ${isDarkMode ? '#374151' : '#D1D5DB'}`,
                  backgroundColor: isDarkMode ? '#374151' : '#FFFFFF',
                  color: isDarkMode ? '#E5E7EB' : '#111827',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = isDarkMode ? '#4B5563' : '#F9FAFB';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = isDarkMode ? '#374151' : '#FFFFFF';
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: isInsufficientLabels ? '#F59E0B' : '#22C55E',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = isInsufficientLabels ? '#D97706' : '#16A34A';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = isInsufficientLabels ? '#F59E0B' : '#22C55E';
                }}
              >
                Verify
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Start Preview Modal */}
      {isStartPreviewOpen && selectedRow && createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={handleCloseModal}
        >
          <div
            style={{
              backgroundColor: isDarkMode ? '#111827' : '#FFFFFF',
              borderRadius: '12px',
              width: '324px',
              padding: '24px',
              border: isDarkMode ? '1px solid #1F2937' : '1px solid #E5E7EB',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: isDarkMode ? '#E5E7EB' : '#111827' }}>
                  Label Check
                </h2>
                <div style={{ position: 'relative', display: 'inline-flex' }}>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-label="Info"
                    onMouseEnter={() => setShowInfoTooltip(true)}
                    onMouseLeave={() => setShowInfoTooltip(false)}
                    style={{ cursor: 'pointer' }}
                  >
                    <circle cx="12" cy="12" r="10" stroke="#3B82F6" strokeWidth="2" />
                    <path d="M12 10v6" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="12" cy="7" r="1" fill="#3B82F6" />
                  </svg>
                  {showInfoTooltip && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '28px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '304px',
                        backgroundColor: '#FFFFFF',
                        borderRadius: '12px',
                        border: '1px solid #E5E7EB',
                        boxShadow: '0px 10px 24px rgba(0, 0, 0, 0.14)',
                        padding: '12px',
                        display: 'flex',
                        gap: '4px',
                        alignItems: 'flex-start',
                        zIndex: 10,
                        overflow: 'visible',
                      }}
                    >
                      {/* Tail */}
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '-8px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: 0,
                          height: 0,
                          borderLeft: '8px solid transparent',
                          borderRight: '8px solid transparent',
                          borderTop: '8px solid #FFFFFF',
                          filter: 'drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.12))',
                        }}
                      />
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ marginTop: '2px' }}>
                        <rect x="5" y="3" width="14" height="18" rx="2" stroke="#3B82F6" strokeWidth="2" />
                        <path d="M9 7h6" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
                        <path d="M9 11h6" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                          Label Confirmation
                        </span>
                        <span style={{ fontSize: '13px', color: '#4B5563', lineHeight: 1.4 }}>
                          Confirming that we have sufficient labels for this shipment. This is not a full label inventory, but a quick confirmation.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: isDarkMode ? '#9CA3AF' : '#6B7280',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = isDarkMode ? '#FFFFFF' : '#111827'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = isDarkMode ? '#9CA3AF' : '#6B7280'; }}
              >
                ✕
              </button>
            </div>

            <div style={{
              border: isDarkMode ? '1px solid #1F2937' : '1px solid #E5E7EB',
              borderRadius: '12px',
              padding: '12px 16px',
              width: '276px',
              backgroundColor: isDarkMode ? '#1F2937' : '#F9FAFB',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              alignSelf: 'center',
            }}>
              <div>
                <div style={{ fontSize: '12px', color: isDarkMode ? '#9CA3AF' : '#6B7280', marginBottom: '4px' }}>Product Name</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: isDarkMode ? '#E5E7EB' : '#111827' }}>
                  {selectedRow.product} ({selectedRow.size})
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: isDarkMode ? '#9CA3AF' : '#6B7280', marginBottom: '4px' }}>Label Location</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: isDarkMode ? '#E5E7EB' : '#111827' }}>
                  {selectedRow.labelLocation}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: isDarkMode ? '#9CA3AF' : '#6B7280', marginBottom: '4px' }}>Labels Needed</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: isDarkMode ? '#E5E7EB' : '#111827' }}>
                  {formatNumber(selectedRow.quantity)}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {completedRows.has(selectedRow?.id) ? (
                <>
                  {/* Edit Mode Header */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    marginBottom: '4px',
                  }}>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 500,
                      color: '#10B981',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>
                      ✓ Previously confirmed
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      // Re-confirm action: Update confirmation
                      const rowId = selectedRow?.id;
                      
                      // Close modal immediately
                      handleCloseModal();
                      
                      if (rowId && shipmentId) {
                        try {
                          await updateShipmentProductLabelCheck(shipmentId, rowId, 'confirmed');
                          console.log(`Label check re-confirmed for product ${rowId}`);
                        } catch (error) {
                          console.error('Error saving label check confirmation:', error);
                        }
                        
                        setConfirmedRows(prev => new Set(prev).add(rowId));
                        setCompletedRows(prev => new Set(prev).add(rowId));
                        setCompletedRowStatus(prev => ({ ...prev, [rowId]: false }));
                        // Reload data from API to ensure consistency
                        await loadLabelData();
                        
                        // Check if all products are now complete and clear comment if so (after reload)
                        await checkAndClearLabelCheckComment();
                      }
                    }}
                    style={{
                      height: '40px',
                      padding: '0 16px',
                      borderRadius: '10px',
                      width: '276px',
                      border: 'none',
                      backgroundColor: '#10B981',
                      color: '#FFFFFF',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      alignSelf: 'center',
                      boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)',
                    }}
                    onMouseEnter={(e) => { 
                      e.currentTarget.style.backgroundColor = '#059669';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                    }}
                    onMouseLeave={(e) => { 
                      e.currentTarget.style.backgroundColor = '#10B981';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(16, 185, 129, 0.2)';
                    }}
                  >
                    Keep Confirmed
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsStartPreviewOpen(false);
                      setIsModalOpen(true);
                    }}
                    style={{
                      height: '40px',
                      padding: '0 16px',
                      borderRadius: '10px',
                      width: '276px',
                      alignSelf: 'center',
                      border: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
                      backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                      color: isDarkMode ? '#E5E7EB' : '#374151',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => { 
                      e.currentTarget.style.backgroundColor = isDarkMode ? '#374151' : '#F3F4F6';
                      e.currentTarget.style.borderColor = isDarkMode ? '#4B5563' : '#D1D5DB';
                    }}
                    onMouseLeave={(e) => { 
                      e.currentTarget.style.backgroundColor = isDarkMode ? '#1F2937' : '#FFFFFF';
                      e.currentTarget.style.borderColor = isDarkMode ? '#374151' : '#E5E7EB';
                    }}
                  >
                    Recount Labels
                  </button>
                  {/* Reset as subtle text link */}
                  <button
                    type="button"
                    onClick={handleReset}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: isDarkMode ? '#6B7280' : '#9CA3AF',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      padding: '8px 0 0 0',
                      transition: 'color 0.2s ease',
                      alignSelf: 'center',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = isDarkMode ? '#6B7280' : '#9CA3AF'; }}
                  >
                    Reset and start over
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={async () => {
                      // Confirm action: Mark row as confirmed without counting
                      // This is a checkpoint to verify labels are sufficient
                      const rowId = selectedRow?.id;
                      
                      // Close modal immediately
                      handleCloseModal();
                      
                      if (rowId && shipmentId) {
                        try {
                          // Save to database
                          await updateShipmentProductLabelCheck(shipmentId, rowId, 'confirmed');
                          console.log(`Label check confirmed for product ${rowId}`);
                        } catch (error) {
                          console.error('Error saving label check confirmation:', error);
                          // Continue with local update even if API fails
                        }
                        
                        setConfirmedRows(prev => new Set(prev).add(rowId));
                        setCompletedRows(prev => new Set(prev).add(rowId));
                        setCompletedRowStatus(prev => ({ ...prev, [rowId]: false })); // Not insufficient
                        // Reload data from API to ensure consistency
                        await loadLabelData();
                        
                        // Check if all products are now complete and clear comment if so (after reload)
                        await checkAndClearLabelCheckComment();
                      }
                    }}
                    style={{
                      height: '40px',
                      padding: '0 16px',
                      borderRadius: '10px',
                      width: '276px',
                      border: 'none',
                      backgroundColor: '#3B82F6',
                      color: '#FFFFFF',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      alignSelf: 'center',
                      boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)',
                    }}
                    onMouseEnter={(e) => { 
                      e.currentTarget.style.backgroundColor = '#2563EB';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                    }}
                    onMouseLeave={(e) => { 
                      e.currentTarget.style.backgroundColor = '#3B82F6';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.2)';
                    }}
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsStartPreviewOpen(false);
                      setIsModalOpen(true);
                    }}
                    style={{
                      height: '40px',
                      padding: '0 16px',
                      borderRadius: '10px',
                      width: '276px',
                      alignSelf: 'center',
                      border: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
                      backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                      color: isDarkMode ? '#E5E7EB' : '#374151',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => { 
                      e.currentTarget.style.backgroundColor = isDarkMode ? '#374151' : '#F3F4F6';
                      e.currentTarget.style.borderColor = isDarkMode ? '#4B5563' : '#D1D5DB';
                    }}
                    onMouseLeave={(e) => { 
                      e.currentTarget.style.backgroundColor = isDarkMode ? '#1F2937' : '#FFFFFF';
                      e.currentTarget.style.borderColor = isDarkMode ? '#374151' : '#E5E7EB';
                    }}
                  >
                    Count Labels
                  </button>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Filter Dropdown */}
      {!disableFilters && openFilterColumn && filterIconRefs.current[openFilterColumn] && (
        <SortFormulasFilterDropdown
          ref={(el) => {
            filterDropdownRef.current = el;
          }}
          filterIconRef={filterIconRefs.current[openFilterColumn]}
          columnKey={openFilterColumn}
          availableValues={getColumnValues(openFilterColumn)}
          currentFilter={filters[openFilterColumn] || {}}
          currentSort={sortField === openFilterColumn ? sortOrder : ''}
          enableBrandFilter={false}
          onApply={(data) => {
            // Handle sort independently so it never touches the underlying rows array
            if (data?.sortOrder) {
              setSortField(openFilterColumn);
              setSortOrder(data.sortOrder);
            } else if (sortField === openFilterColumn) {
              setSortField('');
              setSortOrder('');
            }

            // Only apply filters when this wasn't a pure sort click
            if (!data?.__fromSortClick) {
              handleApplyFilter(openFilterColumn, data ?? null);
              setOpenFilterColumn(null);
            }
          }}
          onClose={() => setOpenFilterColumn(null)}
        />
      )}

      {/* Variance Still Exceeded Modal */}
      <VarianceStillExceededModal
        isOpen={isVarianceStillExceededOpen}
        onClose={() => setIsVarianceStillExceededOpen(false)}
        onGoBack={handleVarianceGoBack}
        onConfirm={handleVarianceConfirm}
      />

      {/* Footer */}
      {(() => {
        const totalRows = rows.length;
        const completedCount = rows.filter(row => 
          completedRows.has(row.id) || confirmedRows.has(row.id)
        ).length;
        const remainingCount = totalRows - completedCount;
        const selectedRowsCount = selectedRows.size;

        return (
          <div
            style={{
              position: 'fixed',
              bottom: '16px',
              left: `calc(${sidebarWidth}px + (100vw - ${sidebarWidth}px) / 2)`,
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
                  {totalRows}
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
                  {completedCount}
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
                  {remainingCount}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {remainingCount > 0 && selectedRowsCount > 0 && onMarkAllLabelChecksAsDone && (
                <button
                  type="button"
                  onClick={onMarkAllLabelChecksAsDone}
                  style={{
                    height: '31px',
                    padding: '0 16px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#3B82F6',
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
                    e.currentTarget.style.backgroundColor = '#3B82F6';
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
              {onCompleteClick && (
                <button
                  type="button"
                  onClick={onCompleteClick}
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
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

// FilterDropdown Component
const FilterDropdown = React.forwardRef(({ columnKey, filterIconRef, onClose, isDarkMode }, ref) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [sortField, setSortField] = useState('');
  const [sortOrder, setSortOrder] = useState('');
  const [filterField, setFilterField] = useState('');
  const [filterCondition, setFilterCondition] = useState('');
  const [filterValue, setFilterValue] = useState('');

  useEffect(() => {
    if (filterIconRef) {
      const rect = filterIconRef.getBoundingClientRect();
      const dropdownWidth = 320;
      const dropdownHeight = 400;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let left = rect.left;
      // Start a bit lower than before so the dropdown sits further under the icon
      let top = rect.bottom + 16;
      
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

  const handleClear = () => {
    setSortField('');
    setSortOrder('');
  };

  const handleReset = () => {
    setSortField('');
    setSortOrder('');
    setFilterField('');
    setFilterCondition('');
    setFilterValue('');
  };

  const handleApply = () => {
    // Apply filter logic here
    onClose();
  };

  const sortFields = [
    { value: 'brand', label: 'Brand' },
    { value: 'product', label: 'Product' },
    { value: 'size', label: 'Size' },
    { value: 'quantity', label: 'Quantity' },
    { value: 'lblCurrentInv', label: 'LBL Current Inv' },
    { value: 'labelLocation', label: 'Label Location' },
  ];

  const sortOrders = [
    { value: 'asc', label: 'Sort ascending (A to Z)', icon: 'A^Z' },
    { value: 'desc', label: 'Sort descending (Z to A)', icon: 'Z^A' },
  ];

  const filterFields = [
    { value: '', label: 'Select field' },
    { value: 'brand', label: 'Brand' },
    { value: 'product', label: 'Product' },
    { value: 'size', label: 'Size' },
    { value: 'quantity', label: 'Quantity' },
    { value: 'lblCurrentInv', label: 'LBL Current Inv' },
    { value: 'labelLocation', label: 'Label Location' },
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
        width: '320px',
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        border: '1px solid #E5E7EB',
        zIndex: 10000,
        // Match Figma spec: top/bottom 12px, left/right 24px, horizontal gap handled in children
        padding: '12px 24px',
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
            onClick={handleClear}
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
            value={sortField}
            onChange={(e) => setSortField(e.target.value)}
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
            {sortFields.map((field) => (
              <option key={field.value} value={field.value}>
                {field.label}
              </option>
            ))}
          </select>
          
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: sortOrder ? '1px solid #3B82F6' : '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '0.875rem',
              color: '#374151',
              backgroundColor: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            <option value="">Select order</option>
            {sortOrders.map((order) => (
              <option key={order.value} value={order.value}>
                {order.icon} {order.label}
              </option>
            ))}
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
            value={filterField}
            onChange={(e) => setFilterField(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '0.875rem',
              color: filterField ? '#374151' : '#9CA3AF',
              backgroundColor: '#FFFFFF',
              cursor: 'pointer',
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
              padding: '8px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '0.875rem',
              color: filterCondition ? '#374151' : '#9CA3AF',
              backgroundColor: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            {filterConditions.map((condition) => (
              <option key={condition.value} value={condition.value}>
                {condition.label}
              </option>
            ))}
          </select>
          
          <div style={{ position: 'relative', width: '100%' }}>
            <input
              type="text"
              placeholder="Value here..."
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                paddingRight: filterValue ? '32px' : '12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '0.875rem',
                color: '#374151',
                backgroundColor: '#FFFFFF',
                boxSizing: 'border-box',
              }}
            />
            {filterValue && (
              <button
                type="button"
                onClick={() => setFilterValue('')}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '16px',
                  height: '16px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '4px',
                  backgroundColor: '#FFFFFF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  zIndex: 2,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#9CA3AF';
                  e.currentTarget.style.backgroundColor = '#F3F4F6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#D1D5DB';
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                }}
                onTouchStart={(e) => {
                  e.currentTarget.style.borderColor = '#9CA3AF';
                  e.currentTarget.style.backgroundColor = '#F3F4F6';
                }}
                onTouchEnd={(e) => {
                  e.currentTarget.style.borderColor = '#D1D5DB';
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                }}
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#6B7280"
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
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
        <button
          type="button"
          onClick={handleReset}
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
          onClick={handleApply}
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
    </div>,
    document.body
  );
});

FilterDropdown.displayName = 'FilterDropdown';

export default LabelCheckTable;





