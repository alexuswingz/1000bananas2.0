import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import { useSidebar } from '../../../../context/SidebarContext';
import { getShipmentFormulaCheck, updateShipmentFormulaCheck, updateShipment } from '../../../../services/productionApi';
import SortFormulasFilterDropdown from './SortFormulasFilterDropdown';

const FormulaCheckTable = ({
  shipmentId,
  isRecountMode = false,
  varianceExceededRowIds = [],
  onFormulaDataChange,
  selectedRows: externalSelectedRows = null,
  onSelectedRowsChange,
  refreshKey = 0, // Increment to trigger reload while preserving checked status
  isAdmin = false, // Admin role check for bulk actions
  onCompleteClick = null, // Callback for Complete button
  onMarkAllAsCompleted = null, // Callback for Mark All as Completed button
}) => {
  const { isDarkMode } = useTheme();
  const { sidebarWidth } = useSidebar();
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [formulas, setFormulas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openFilterColumn, setOpenFilterColumn] = useState(null);
  const filterIconRefs = useRef({});
  const [filters, setFilters] = useState({});
  const [sortConfig, setSortConfig] = useState({ field: '', order: '' });
  const [notes, setNotes] = useState({}); // Store notes by formula ID
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [selectedFormulaForNotes, setSelectedFormulaForNotes] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false); // Track if we've loaded from backend
  const [bulkSelectedRows, setBulkSelectedRows] = useState(new Set()); // Track rows selected for bulk actions

  // Load formula data from API - reload when shipmentId OR refreshKey changes
  useEffect(() => {
    if (shipmentId) {
      setDataLoaded(false); // Reset when shipment changes
      loadFormulaData();
    }
  }, [shipmentId, refreshKey]);

  // Only sync with parent selectedRows if we haven't loaded from backend yet
  // Once backend data is loaded, backend is the source of truth
  useEffect(() => {
    if (!dataLoaded && externalSelectedRows) {
      if (externalSelectedRows instanceof Set) {
        setSelectedRows(new Set(externalSelectedRows));
      } else if (Array.isArray(externalSelectedRows)) {
        setSelectedRows(new Set(externalSelectedRows));
      }
    }
  }, [externalSelectedRows, dataLoaded]);

  // Save notes to backend
  const saveNotes = useCallback(async (formulaId, noteText) => {
    const updatedNotes = {
      ...notes,
      [formulaId]: noteText
    };
    setNotes(updatedNotes);
    
    // Persist to backend
    if (shipmentId) {
      try {
        await updateShipmentFormulaCheck(shipmentId, {
          formula_notes: { [formulaId]: noteText }
        });
      } catch (error) {
        console.error('Error saving notes to backend:', error);
      }
    }
  }, [notes, shipmentId]);

  // Save checked status to backend
  const saveCheckedStatus = useCallback(async (formulaId, isChecked) => {
    if (!shipmentId) return;
    
    try {
      await updateShipmentFormulaCheck(shipmentId, {
        checked_formula_ids: isChecked ? [formulaId] : [],
        uncheck_formula_ids: isChecked ? [] : [formulaId]
      });
    } catch (error) {
      console.error('Error saving checked status to backend:', error);
    }
  }, [shipmentId]);

  // Check if all formulas are checked and clear comment if so
  const checkAndClearFormulaCheckComment = useCallback(async () => {
    if (!shipmentId) return;
    
    try {
      // Reload data to get current status of all formulas
      const data = await getShipmentFormulaCheck(shipmentId);
      
      // Check if all formulas are checked
      const allChecked = data.length > 0 && data.every(formula => formula.is_checked === true);
      
      console.log('Checking formula check completion:', {
        totalFormulas: data.length,
        allChecked,
        checkedStatuses: data.map(f => ({ id: f.id, is_checked: f.is_checked }))
      });
      
      if (allChecked) {
        // Clear the formula_check_comment since all are now checked
        // Use empty string to ensure it's cleared (some databases prefer empty string over null)
        try {
          const result = await updateShipment(shipmentId, { formula_check_comment: '' });
          console.log('Formula check comment cleared - all formulas are checked', result);
        } catch (updateError) {
          console.error('Error clearing formula check comment:', updateError);
          // Try with null as fallback
          try {
            const result = await updateShipment(shipmentId, { formula_check_comment: null });
            console.log('Formula check comment cleared (using null)', result);
          } catch (nullError) {
            console.error('Error clearing formula check comment with null:', nullError);
          }
        }
      } else {
        console.log('Not all formulas are checked yet:', {
          total: data.length,
          checked: data.filter(f => f.is_checked === true).length
        });
      }
    } catch (error) {
      console.error('Error checking and clearing formula check comment:', error);
      // Don't throw - this is a cleanup operation
    }
  }, [shipmentId]);

  // Calculate manufacturing volume with spillage and rounding
  // Formula: Round to nearest 5 gallons after adding 8% spillage factor
  const calculateManufacturingVolume = (rawGallons) => {
    if (!rawGallons || rawGallons <= 0) return 0;
    
    const SPILLAGE_FACTOR = 1.08; // 8% spillage adjustment
    const adjustedVolume = rawGallons * SPILLAGE_FACTOR;
    
    // Round to nearest 5 gallons
    return Math.round(adjustedVolume / 5) * 5;
  };

  const loadFormulaData = async () => {
    try {
      setLoading(true);
      console.log('🔍 Loading formula data for shipmentId:', shipmentId);
      const data = await getShipmentFormulaCheck(shipmentId);
      console.log('✅ Formula data loaded:', {
        shipmentId,
        formulaCount: data?.length || 0,
        formulas: data,
      });
      
      // Transform API data to match table format
      // Apply manufacturing volume formula: spillage + round to nearest 5
      const formattedFormulas = data.map(formula => {
        const rawVolume = formula.total_gallons_needed || 0;
        const manufacturingVolume = calculateManufacturingVolume(rawVolume);
        
        return {
          id: formula.id,
          formula: formula.formula_name,
          vessel: formula.vessel_type,
          qty: formula.vessel_quantity,
          vesselType: 'Clean',
          totalVolume: manufacturingVolume, // Manufacturing volume (with spillage + rounded to 5)
          rawVolume: rawVolume, // Keep raw volume for reference
          measure: 'Gallon',
          formulaType: 'Liquid',
          gallonsAvailable: formula.gallons_available,
          gallonsFree: formula.gallons_free,
          hasShortage: formula.has_shortage,
          shortageAmount: formula.shortage_amount,
          isChecked: formula.is_checked || false, // Load checked status from backend
          notes: formula.notes || '', // Load notes from backend
        };
      });
      
      console.log('📋 Formatted formula rows:', {
        formulaCount: formattedFormulas.length,
        formulas: formattedFormulas,
      });
      
      setFormulas(formattedFormulas);
      
      // DO NOT initialize selectedRows from isChecked status
      // Checkboxes are for manual selection only, independent of completion status
      // Keep existing selectedRows state (don't reset it on reload)
      
      // Initialize notes from backend data
      const loadedNotes = {};
      formattedFormulas.forEach(f => {
        if (f.notes) {
          loadedNotes[f.id] = f.notes;
        }
      });
      setNotes(loadedNotes); // Replace notes with backend data, don't merge
      
      // Mark data as loaded so parent state doesn't override backend data
      setDataLoaded(true);
    } catch (error) {
      console.error('❌ Error loading formula data:', error);
      console.error('Error details:', {
        shipmentId,
        message: error.message,
        stack: error.stack,
        error: error,
      });
      setFormulas([]);
      setDataLoaded(true); // Still mark as loaded even on error to prevent parent override
    } finally {
      setLoading(false);
    }
  };

  // Get unique values for a column (for dropdown list)
  const getColumnValues = (columnKey) => {
    const values = new Set();
    formulas.forEach(formula => {
      const val = formula[columnKey];
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
    columnKey === 'qty' || columnKey === 'totalVolume';

  // Check if a column has active filters (excludes sort - only checks for Filter by Values and Filter by Conditions)
  const hasActiveFilter = (columnKey) => {
    const filter = filters[columnKey];
    if (!filter) return false;
    
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
      default:
        return true;
    }
  };

  // Apply filters & sorting to formulas
  const getFilteredFormulas = () => {
    let result = [...formulas];

    // Apply filters
    Object.keys(filters).forEach(columnKey => {
      const filter = filters[columnKey];
      if (!filter) return;

      const numeric = isNumericColumn(columnKey);

      // Value filters
      if (filter.selectedValues && filter.selectedValues.size > 0) {
        result = result.filter(formula => {
          const value = formula[columnKey];
          return (
            filter.selectedValues.has(value) ||
            filter.selectedValues.has(String(value))
          );
        });
      }

      // Condition filters
      if (filter.conditionType) {
        result = result.filter(formula =>
          applyConditionFilter(
            formula[columnKey],
            filter.conditionType,
            filter.conditionValue,
            numeric
          )
        );
      }
    });

    // Apply single-column sort
    if (sortConfig.field && sortConfig.order) {
      const sortField = sortConfig.field;
      const sortOrder = sortConfig.order;
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

  const displayFormulas = getFilteredFormulas();

  // Report formula data changes to parent
  useEffect(() => {
    if (onFormulaDataChange) {
      const completedCount = formulas.filter(f => f.isChecked).length;
      onFormulaDataChange({
        total: formulas.length,
        completed: completedCount,
        remaining: formulas.length - completedCount,
      });
    }
  }, [formulas, onFormulaDataChange]);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openFilterColumn !== null) {
        const icon = filterIconRefs.current[openFilterColumn];
        const clickedOnIcon = icon && icon.contains(event.target);
        const clickedInsideDropdown = event.target.closest('[data-filter-dropdown]');

        if (!clickedOnIcon && !clickedInsideDropdown) {
          setOpenFilterColumn(null);
        }
      }
    };

    if (openFilterColumn !== null) {
      const timeoutId = setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [openFilterColumn]);

  // Handle filter apply from compact dropdown
  const handleApplyFilter = (columnKey, filterData) => {
    setFilters(prev => ({
      ...prev,
      [columnKey]: {
        selectedValues: filterData.selectedValues || new Set(),
        conditionType: filterData.conditionType || '',
        conditionValue: filterData.conditionValue || '',
      },
    }));

    if (filterData.sortOrder) {
      setSortConfig({ field: columnKey, order: filterData.sortOrder });
    } else if (sortConfig.field === columnKey) {
      setSortConfig({ field: '', order: '' });
    }
  };

  // Handle filter reset (clear all filters & sorting)
  const handleResetFilter = () => {
    setSortConfig({ field: '', order: '' });
    setFilters({});
  };

  const handleCheckboxChange = async (id) => {
    const newSet = new Set(selectedRows);
    const isNowChecked = !newSet.has(id);
    
    if (isNowChecked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    
    // Update local state only - do NOT persist to backend
    // Checkboxes are for selection only, not for marking as done
    setSelectedRows(newSet);
    if (onSelectedRowsChange) onSelectedRowsChange(newSet);
  };

  // Handle individual "Complete" button click - marks item as done
  const handleCompleteClick = async (id) => {
    try {
      // Mark as done in backend
      await saveCheckedStatus(id, true);
      
      // DO NOT automatically check the checkbox - checkbox is for selection only
      // The "Complete" button marks the formula as done, which is separate from selection
      
      // Reload data to get latest state, then check if all formulas are checked
      await loadFormulaData();
      await checkAndClearFormulaCheckComment();
    } catch (error) {
      console.error('Error completing formula:', error);
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
    const filteredFormulas = getFilteredFormulas();
    // In recount mode, only consider variance-exceeded formulas
    const formulasToSelect = isRecountMode
      ? filteredFormulas.filter(formula => varianceExceededRowIds.includes(formula.id))
      : filteredFormulas;
    
    if (isAdmin) {
      if (checked) {
        // Add all filtered formula IDs to bulkSelectedRows (preserve existing selections)
        setBulkSelectedRows(prev => {
          const newSet = new Set(prev);
          formulasToSelect.forEach(formula => newSet.add(formula.id));
          return newSet;
        });
      } else {
        // Remove all filtered formula IDs from bulkSelectedRows
        setBulkSelectedRows(prev => {
          const newSet = new Set(prev);
          formulasToSelect.forEach(formula => newSet.delete(formula.id));
          return newSet;
        });
      }
    } else {
      if (checked) {
        // Add all filtered formula IDs to selectedRows (preserve existing selections)
        setSelectedRows(prev => {
          const newSet = new Set(prev);
          formulasToSelect.forEach(formula => newSet.add(formula.id));
          if (onSelectedRowsChange) {
            onSelectedRowsChange(newSet);
          }
          return newSet;
        });
      } else {
        // Remove all filtered formula IDs from selectedRows
        setSelectedRows(prev => {
          const newSet = new Set(prev);
          formulasToSelect.forEach(formula => newSet.delete(formula.id));
          if (onSelectedRowsChange) {
            onSelectedRowsChange(newSet);
          }
          return newSet;
        });
      }
    }
  };

  // Check if all filtered rows are selected
  const areAllRowsSelected = () => {
    const filteredFormulas = getFilteredFormulas();
    // In recount mode, only consider variance-exceeded formulas
    const formulasToCheck = isRecountMode
      ? filteredFormulas.filter(formula => varianceExceededRowIds.includes(formula.id))
      : filteredFormulas;
    
    if (formulasToCheck.length === 0) return false;
    
    if (isAdmin) {
      return formulasToCheck.every(formula => bulkSelectedRows.has(formula.id));
    } else {
      return formulasToCheck.every(formula => selectedRows.has(formula.id));
    }
  };

  // Handle bulk complete action
  const handleBulkComplete = async () => {
    if (bulkSelectedRows.size === 0) return;
    
    try {
      setLoading(true);
      // Complete all selected formulas
      const promises = Array.from(bulkSelectedRows).map(id => 
        saveCheckedStatus(id, true)
      );
      await Promise.all(promises);
      
      // Reload data
      await loadFormulaData();
      await checkAndClearFormulaCheckComment();
      
      // Clear bulk selection
      setBulkSelectedRows(new Set());
    } catch (error) {
      console.error('Error bulk completing formulas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotesClick = (formula) => {
    setSelectedFormulaForNotes(formula);
    setNotesModalOpen(true);
  };

  const handleNotesSave = (noteText) => {
    if (selectedFormulaForNotes) {
      saveNotes(selectedFormulaForNotes.id, noteText);
      setNotesModalOpen(false);
      setSelectedFormulaForNotes(null);
    }
  };

  const handleNotesClose = () => {
    setNotesModalOpen(false);
    setSelectedFormulaForNotes(null);
  };

  const columns = [
    { key: 'checkbox', label: '', width: '50px' },
    { key: 'complete', label: '', width: '112px' },
    { key: 'formula', label: 'FORMULA', width: '150px' },
    { key: 'vessel', label: 'VESSEL', width: '120px' },
    { key: 'qty', label: 'QTY', width: '80px' },
    { key: 'vesselType', label: 'VESSEL TYPE', width: '120px' },
    { key: 'totalVolume', label: 'TOTAL VOLUME', width: '140px' },
    { key: 'measure', label: 'MEASURE', width: '120px' },
    { key: 'formulaType', label: 'FORMULA TYPE', width: '120px' },
    { key: 'notes', label: 'NOTES', width: '100px' },
  ];

  return (
    <>
      <style>
        {`
          .group:hover .transition-opacity {
            opacity: 1 !important;
          }
          /* Keep filter icon visible when dropdown is open */
          .transition-opacity[data-filter-open="true"] {
            opacity: 1 !important;
          }
        `}
      </style>
      <div style={{
        backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
        borderRadius: '12px',
        border: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
        overflow: 'hidden',
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
              {bulkSelectedRows.size} {bulkSelectedRows.size === 1 ? 'formula' : 'formulas'} selected
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
        {/* Table Container */}
        <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          borderSpacing: 0,
        }}>
          {/* Header */}
          <thead style={{ backgroundColor: '#1A2235' }}>
            {/* Header row */}
            <tr
              style={{
                height: '66px',
                maxHeight: '66px',
                borderBottom: 'none',
              }}
            >
              {columns.map((column) => {
                const isActive = hasActiveFilter(column.key);
                const isDropdownOpen = openFilterColumn === column.key;
                const shouldShowIcon = isActive || isDropdownOpen;

                return (
                  <th
                    key={column.key}
                    className="group"
                    style={{
                      padding:
                        column.key === 'checkbox' || column.key === 'complete'
                          ? '0 8px'
                          : '0 24px',
                      textAlign:
                        column.key === 'checkbox' || column.key === 'complete'
                          ? 'center'
                          : 'center',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: isDarkMode ? '#9CA3AF' : '#6B7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      width: column.width,
                      whiteSpace: 'nowrap',
                      borderRight: 'none',
                      height: '66px',
                      cursor:
                        column.key !== 'checkbox' && column.key !== 'complete'
                          ? 'pointer'
                          : 'default',
                      position:
                        column.key !== 'checkbox' && column.key !== 'complete'
                          ? 'relative'
                          : 'static',
                      backgroundColor: isActive
                        ? 'rgba(59, 130, 246, 0.1)'
                        : 'transparent',
                      borderBottom: 'none',
                    }}
                  >
                    {column.key === 'checkbox' ? (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-start',
                        }}
                      >
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
                              transform: 'translateX(37px)',
                              backgroundColor: areAllRowsSelected()
                                ? '#3B82F6'
                                : 'transparent',
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
                    ) : column.key === 'complete' ? (
                      <div />
                    ) : (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: column.key === 'notes' ? 'flex-start' : 'center',
                          gap: '0.5rem',
                        }}
                      >
                        <span
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            transform: column.key === 'notes' ? 'translateX(-20px)' : 'none',
                          }}
                        >
                          {column.label}
                          {isActive && (
                            <span
                              style={{
                                display: 'inline-block',
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                backgroundColor: '#10B981',
                              }}
                            />
                          )}
                        </span>
                        {column.key !== 'notes' && (
                          <img
                            ref={(el) => {
                              if (el) filterIconRefs.current[column.key] = el;
                            }}
                            src="/assets/Vector (1).png"
                            alt="Filter"
                            className="transition-opacity"
                            data-filter-open={isDropdownOpen ? 'true' : 'false'}
                            style={{
                              width: '12px',
                              height: '12px',
                              cursor: 'pointer',
                              opacity: shouldShowIcon ? 1 : 0,
                              filter: shouldShowIcon
                                ? 'invert(29%) sepia(94%) saturate(2576%) hue-rotate(199deg) brightness(102%) contrast(105%)'
                                : undefined,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.opacity = '1';
                            }}
                            onMouseLeave={(e) => {
                              if (shouldShowIcon) {
                                e.currentTarget.style.opacity = '1';
                              } else {
                                e.currentTarget.style.opacity = '0';
                              }
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenFilterColumn(
                                openFilterColumn === column.key ? null : column.key
                              );
                            }}
                          />
                        )}
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
            {/* Inset separator line under header, 16px from both ends */}
            <tr>
              <th
                colSpan={columns.length}
                style={{
                  padding: 0,
                  border: 'none',
                  height: '1px',
                }}
              >
                <div
                  style={{
                    margin: '0 16px',
                    borderBottom: '1px solid #334155',
                  }}
                />
              </th>
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {!shipmentId && (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: 'center', padding: '2rem', color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>
                  Please book the shipment first to view formulas.
                </td>
              </tr>
            )}
            {shipmentId && loading && (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: 'center', padding: '2rem', color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>
                  Loading formula data...
                </td>
              </tr>
            )}
            {shipmentId && !loading && displayFormulas.length === 0 && (
              <tr>
                <td colSpan={columns.length} style={{ textAlign: 'center', padding: '2rem', color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>
                  No formulas found for this shipment.
                </td>
              </tr>
            )}
            {shipmentId && !loading && displayFormulas.length > 0 && (isRecountMode 
              ? displayFormulas.filter(formula => varianceExceededRowIds.includes(formula.id))
              : displayFormulas
            ).map((formula, index) => {
              // Find the original index for styling
              const originalIndex = displayFormulas.findIndex(f => f.id === formula.id);
              const hasNote = !!notes[formula.id];

              return (
              <React.Fragment key={formula.id}>
              <tr
                style={{
                  backgroundColor: isDarkMode ? '#1A2235' : '#F9FAFB',
                  borderBottom: 'none',
                  transition: 'background-color 0.2s',
                  height: '66px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = isDarkMode ? '#232c41' : '#F3F4F6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = isDarkMode ? '#1A2235' : '#F9FAFB';
                }}
              >
                <td style={{
                  padding: '0 24px 0 20px',
                  textAlign: 'left',
                  height: '66px',
                  borderBottom: 'none',
                }}>
                  <div>
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
                        checked={isAdmin ? bulkSelectedRows.has(formula.id) : selectedRows.has(formula.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          if (isAdmin) {
                            handleBulkCheckboxChange(formula.id);
                          } else {
                            handleCheckboxChange(formula.id);
                          }
                        }}
                        style={{
                          position: 'absolute',
                          opacity: 0,
                          width: 0,
                          height: 0,
                        }}
                        title={isAdmin ? "Select for bulk action" : "Check to mark as complete"}
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
                          transform: 'translateX(25px)',
                          backgroundColor: (isAdmin ? bulkSelectedRows.has(formula.id) : selectedRows.has(formula.id))
                            ? (hasNote ? '#F59E0B' : '#3B82F6')
                            : 'transparent',
                        }}
                      >
                        {(isAdmin ? bulkSelectedRows.has(formula.id) : selectedRows.has(formula.id)) && (
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
                }}>
                  {(() => {
                    const isCompleted = formula.isChecked; // Use backend completion status, not checkbox selection
                    return (
                      <button
                        type="button"
                        onClick={() => handleCompleteClick(formula.id)}
                        className="done-badge-btn"
                        style={{
                          height: '24px',
                          width: '96px',
                          padding: '0 12px',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: isCompleted ? '#10B981' : '#3B82F6',
                          color: '#FFFFFF',
                          fontSize: '12px',
                          fontWeight: 600,
                          letterSpacing: '0.025em',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '10px',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                          position: 'relative',
                        }}
                        onMouseEnter={(e) => {
                          const baseColor = isCompleted ? '#059669' : '#2563EB';
                          e.currentTarget.style.backgroundColor = baseColor;
                          e.currentTarget.style.transform = 'scale(1.02)';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                          // Show edit icon
                          const icon = e.currentTarget.querySelector('.edit-icon');
                          if (icon) icon.style.opacity = '1';
                        }}
                        onMouseLeave={(e) => {
                          const baseColor = isCompleted ? '#10B981' : '#3B82F6';
                          e.currentTarget.style.backgroundColor = baseColor;
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                          // Hide edit icon
                          const icon = e.currentTarget.querySelector('.edit-icon');
                          if (icon) icon.style.opacity = '0';
                        }}
                        title={isCompleted ? "Click to edit" : "Click to complete"}
                      >
                        {isCompleted ? (
                          <>
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
                          </>
                        ) : (
                          <span>Complete</span>
                        )}
                      </button>
                    );
                  })()}
                </td>
                <td style={{
                  padding: '0 16px',
                  textAlign: 'center',
                  fontSize: '14px',
                  fontWeight: 400,
                  color: isDarkMode ? '#E5E7EB' : '#374151',
                  height: '40px',
                }}>
                  {formula.formula}
                </td>
                <td style={{
                  padding: '0 16px',
                  textAlign: 'center',
                  fontSize: '14px',
                  fontWeight: 400,
                  color: isDarkMode ? '#E5E7EB' : '#374151',
                  height: '40px',
                }}>
                  {formula.vessel}
                </td>
                <td style={{
                  padding: '0 16px',
                  textAlign: 'center',
                  fontSize: '14px',
                  fontWeight: 400,
                  color: isDarkMode ? '#E5E7EB' : '#374151',
                  height: '40px',
                }}>
                  {formula.qty}
                </td>
                <td style={{
                  padding: '0 16px',
                  textAlign: 'center',
                  fontSize: '14px',
                  fontWeight: 400,
                  color: isDarkMode ? '#E5E7EB' : '#374151',
                  height: '40px',
                }}>
                  {formula.vesselType}
                </td>
                <td style={{
                  padding: '0 16px',
                  textAlign: 'center',
                  height: '40px',
                }}>
                  <div
                    style={{
                      width: '107px',
                      height: '34px',
                      padding: '8px 6px',
                      borderRadius: '8px',
                      border: '1px solid #334155',
                      backgroundColor: isDarkMode ? '#020617' : '#0F172A',
                      color: '#F9FAFB',
                      fontSize: '14px',
                      lineHeight: '18px',
                      fontWeight: 600,
                      letterSpacing: '0.04em',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 0 0 1px rgba(15,23,42,0.85), 0 10px 25px rgba(15,23,42,0.55)',
                      textShadow: '0 0 8px rgba(15,23,42,0.9)',
                    }}
                  >
                    {Number(formula.totalVolume || 0).toLocaleString()}
                  </div>
                </td>
                <td style={{
                  padding: '0 16px',
                  textAlign: 'center',
                  fontSize: '14px',
                  fontWeight: 400,
                  color: isDarkMode ? '#E5E7EB' : '#374151',
                  height: '40px',
                }}>
                  {formula.measure}
                </td>
                <td style={{
                  padding: '0 16px',
                  textAlign: 'center',
                  fontSize: '14px',
                  fontWeight: 400,
                  color: isDarkMode ? '#E5E7EB' : '#374151',
                  height: '40px',
                }}>
                  {formula.formulaType}
                </td>
                <td style={{
                  padding: '0 16px',
                  textAlign: 'center',
                  height: '40px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginLeft: 0 }}>
                    <button
                      type="button"
                      onClick={() => handleNotesClick(formula)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'opacity 0.2s',
                        transform: 'translateX(-24px)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '0.8';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = '1';
                      }}
                      title={notes[formula.id] ? 'Edit notes' : 'Add notes'}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill={notes[formula.id] ? "#10B981" : "#3B82F6"}>
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8" fill={notes[formula.id] ? "#10B981" : "#3B82F6"}/>
                        <line x1="16" y1="13" x2="8" y2="13" stroke="white" strokeWidth="2"/>
                        <line x1="16" y1="17" x2="8" y2="17" stroke="white" strokeWidth="2"/>
                        <polyline points="10 9 9 9 8 9" stroke="white" strokeWidth="2"/>
                      </svg>
                    </button>
                    <button
                      type="button"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isDarkMode ? '#9CA3AF' : '#6B7280'} strokeWidth="2">
                        <circle cx="12" cy="5" r="1" fill="currentColor"/>
                        <circle cx="12" cy="12" r="1" fill="currentColor"/>
                        <circle cx="12" cy="19" r="1" fill="currentColor"/>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
              {/* Inset separator line under this row, 16px from both ends */}
              <tr>
                <td
                  colSpan={columns.length}
                  style={{
                    padding: 0,
                    border: 'none',
                    height: '1px',
                  }}
                >
                  <div
                    style={{
                      margin: '0 16px',
                      borderBottom: '1px solid #334155',
                    }}
                  />
                </td>
              </tr>
              </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Filter Dropdown */}
      {openFilterColumn !== null && filterIconRefs.current[openFilterColumn] && (
        <SortFormulasFilterDropdown
          filterIconRef={filterIconRefs.current[openFilterColumn]}
          columnKey={openFilterColumn}
          availableValues={getColumnValues(openFilterColumn)}
          currentFilter={filters[openFilterColumn] || {}}
          currentSort={sortConfig.field === openFilterColumn ? sortConfig.order : ''}
          onApply={(filterData) => handleApplyFilter(openFilterColumn, filterData)}
          onClose={() => setOpenFilterColumn(null)}
        />
      )}

      {/* Notes Modal */}
      {notesModalOpen && selectedFormulaForNotes && (
        <NotesModal
          isOpen={notesModalOpen}
          onClose={handleNotesClose}
          onSave={handleNotesSave}
          formula={selectedFormulaForNotes}
          currentNote={notes[selectedFormulaForNotes.id] || ''}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Footer */}
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
              TOTAL FORMULAS
            </span>
            <span style={{
              fontSize: '18px',
              fontWeight: 700,
              color: isDarkMode ? '#FFFFFF' : '#000000',
            }}>
              {formulas.length}
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
              {formulas.filter(f => f.isChecked).length}
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
              {formulas.length - formulas.filter(f => f.isChecked).length}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {selectedRows.size > 0 && onMarkAllAsCompleted && (
            <button
              type="button"
              onClick={onMarkAllAsCompleted}
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
              Mark All as Completed
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
    </div>
    </>
  );
};

// FilterDropdown Component
const FilterDropdown = React.forwardRef(({ columnKey, filterIconRef, onClose, onApply, onReset, currentSort, currentFilters, isDarkMode }, ref) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [sortField, setSortField] = useState(currentSort?.field || '');
  const [sortOrder, setSortOrder] = useState(currentSort?.order || '');
  
  const existingFilter = currentFilters ? Object.entries(currentFilters)[0] : null;
  const [filterField, setFilterField] = useState(existingFilter ? existingFilter[0] : '');
  const [filterCondition, setFilterCondition] = useState(existingFilter ? existingFilter[1].condition : '');
  const [filterValue, setFilterValue] = useState(existingFilter ? existingFilter[1].value : '');

  useEffect(() => {
    if (filterIconRef) {
      const rect = filterIconRef.getBoundingClientRect();
      const dropdownWidth = 320;
      const dropdownHeight = 400;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let left = rect.left;
      let top = rect.bottom + 8;
      
      if (left + dropdownWidth > viewportWidth) {
        left = viewportWidth - dropdownWidth - 16;
      }
      
      if (top + dropdownHeight > viewportHeight) {
        top = rect.top - dropdownHeight - 8;
      }
      
      if (left < 16) {
        left = 16;
      }
      
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

  const handleLocalReset = () => {
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

  const handleLocalApply = () => {
    if (onApply) {
      onApply({
        sortField,
        sortOrder,
        filterField,
        filterCondition,
        filterValue,
      });
    }
    onClose();
  };

  const sortFields = [
    { value: 'formula', label: 'Formula' },
    { value: 'vessel', label: 'Vessel' },
    { value: 'qty', label: 'Qty' },
    { value: 'vesselType', label: 'Vessel Type' },
    { value: 'totalVolume', label: 'Total Volume' },
  ];

  const sortOrders = [
    { value: 'asc', label: 'Sort ascending (A to Z)', icon: 'A^Z' },
    { value: 'desc', label: 'Sort descending (Z to A)', icon: 'Z^A' },
  ];

  const filterFields = [
    { value: '', label: 'Select field' },
    { value: 'formula', label: 'Formula' },
    { value: 'vessel', label: 'Vessel' },
    { value: 'qty', label: 'Qty' },
    { value: 'vesselType', label: 'Vessel Type' },
    { value: 'totalVolume', label: 'Total Volume' },
    { value: 'measure', label: 'Measure' },
    { value: 'formulaType', label: 'Formula Type' },
  ];

  const filterConditions = [
    { value: '', label: 'Select condition' },
    { value: 'equals', label: 'Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'greaterThan', label: 'Greater than' },
    { value: 'lessThan', label: 'Less than' },
  ];

  return (
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
        padding: '16px',
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
          
          <input
            type="text"
            placeholder="Value here..."
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '0.875rem',
              color: '#374151',
              backgroundColor: '#FFFFFF',
            }}
          />
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
        <button
          type="button"
          onClick={handleLocalReset}
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
          onClick={handleLocalApply}
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
  );
});

FilterDropdown.displayName = 'FilterDropdown';

// Notes Modal Component
const NotesModal = ({ isOpen, onClose, onSave, formula, currentNote, isDarkMode }) => {
  const [noteText, setNoteText] = useState(currentNote);
  const textareaRef = useRef(null);

  useEffect(() => {
    setNoteText(currentNote);
  }, [currentNote]);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  const handleSave = () => {
    onSave(noteText);
  };

  if (!isOpen) return null;

  return (
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
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={onClose}
      >
        {/* Modal */}
        <div
          style={{
            backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
            borderRadius: '12px',
            width: '500px',
            maxWidth: '90vw',
            border: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            zIndex: 10001,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '90vh',
            overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ 
            padding: '16px 24px',
            borderBottom: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
            borderTopLeftRadius: '12px',
            borderTopRightRadius: '12px',
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            backgroundColor: '#1C2634',
          }}>
            <div>
              <h2 style={{
                fontSize: '18px',
                fontWeight: 600,
                color: '#FFFFFF',
                margin: 0,
                marginBottom: '4px',
              }}>
                Notes
              </h2>
              <p style={{
                fontSize: '12px',
                color: '#9CA3AF',
                margin: 0,
              }}>
                {formula.formula}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                width: '24px',
                height: '24px',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div style={{ 
            flex: '1 1 auto',
            minHeight: 0,
            overflowY: 'auto',
            padding: '24px',
          }}>
            <textarea
              ref={textareaRef}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Enter notes for this formula..."
              style={{
                width: '100%',
                minHeight: '200px',
                padding: '12px',
                borderRadius: '6px',
                border: isDarkMode ? '1px solid #374151' : '1px solid #D1D5DB',
                backgroundColor: isDarkMode ? '#374151' : '#FFFFFF',
                color: isDarkMode ? '#E5E7EB' : '#374151',
                fontSize: '14px',
                fontWeight: 400,
                fontFamily: 'inherit',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Footer */}
          <div style={{ 
            padding: '16px 24px',
            borderTop: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
            display: 'flex', 
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: isDarkMode ? '1px solid #374151' : '1px solid #D1D5DB',
                backgroundColor: isDarkMode ? '#374151' : '#FFFFFF',
                color: isDarkMode ? '#E5E7EB' : '#374151',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
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
                backgroundColor: '#3B82F6',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#2563EB';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#3B82F6';
              }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default FormulaCheckTable;








