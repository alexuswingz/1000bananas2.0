import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../../../context/ThemeContext';
import SortFormulasFilterDropdown from '../../new-shipment/components/SortFormulasFilterDropdown';
import ProductionNotesModal from '../../packaging/components/ProductionNotesModal';

const ManufacturingTable = ({ data = [], searchQuery = '', selectedShipment = '', activeSubTab = 'all', isSortMode = false, onExitSortMode }) => {
  const { isDarkMode } = useTheme();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [statusDropdowns, setStatusDropdowns] = useState({});
  const [actionMenuId, setActionMenuId] = useState(null);
  const [actionMenuPosition, setActionMenuPosition] = useState({ top: 0, right: 0 });
  const actionButtonRefs = useRef({});
  const statusButtonRefs = useRef({});
  const filterIconRefs = useRef({});
  const hasSplitsRef = useRef(false);
  const [openFilterColumn, setOpenFilterColumn] = useState(null);
  const [filters, setFilters] = useState({});
  const [volumes, setVolumes] = useState({});
  const [draggedRowIndex, setDraggedRowIndex] = useState(null);
  const [draggedOverRowIndex, setDraggedOverRowIndex] = useState(null);
  const [localData, setLocalData] = useState([]);
  const [originalData, setOriginalData] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [selectedRowForSplit, setSelectedRowForSplit] = useState(null);
  const [firstBatchQty, setFirstBatchQty] = useState(1);
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [selectedRowForNotes, setSelectedRowForNotes] = useState(null);
  const [rowNotes, setRowNotes] = useState({});
  const [touchStartY, setTouchStartY] = useState(null);
  const [touchStartIndex, setTouchStartIndex] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMovedIndex, setLastMovedIndex] = useState(null);
  const [selectedRows, setSelectedRows] = useState(new Set()); // For single click selection
  const [bulkSelectedRows, setBulkSelectedRows] = useState(new Set()); // For bulk selection (Ctrl/Cmd + click)

  const themeClasses = {
    cardBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    textPrimary: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-600',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    rowHover: isDarkMode ? 'hover:bg-dark-bg-tertiary' : 'hover:bg-gray-50',
    inputBg: isDarkMode ? 'bg-dark-bg-tertiary' : 'bg-gray-50',
  };

  // Sample data - replace with actual data from props
  const sampleData = Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    status: 'Not Started',
    tpsShipNumber: '10-01-2025',
    type: 'AWD',
    formula: 'F.Ultra Grow',
    size: 'Barrel',
    qty: i === 0 ? 3 : 1,
    tote: 'Clean',
    volume: 275,
    measure: 'Gallons',
  }));

  const tableData = data.length > 0 ? data : sampleData;

  // Filter data based on activeSubTab
  const filteredByType = tableData.filter((row) => {
    if (activeSubTab === 'all') {
      // Include all types including bottling data (Bottling, AWD, or sizes with 'Bottle', 'Gallon', or 'Barrel')
      return true;
    }
    return true;
  });

  // Filter by search query
  const filteredBySearch = filteredByType.filter((row) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      row.tpsShipNumber?.toLowerCase().includes(query) ||
      row.type?.toLowerCase().includes(query) ||
      row.formula?.toLowerCase().includes(query) ||
      row.size?.toLowerCase().includes(query) ||
      String(row.qty || '').includes(query)
    );
  });

  // Apply column filters
  const applyConditionFilter = (value, conditionType, conditionValue, isNumeric = false) => {
    if (!conditionType) return true;
    
    const strValue = String(value || '').toLowerCase();
    const strCondition = String(conditionValue || '').toLowerCase();
    
    switch (conditionType) {
      case 'equals':
        if (isNumeric) {
          return Number(value) === Number(conditionValue);
        }
        return strValue === strCondition;
      case 'notEquals':
        if (isNumeric) {
          return Number(value) !== Number(conditionValue);
        }
        return strValue !== strCondition;
      case 'greaterThan':
        return Number(value) > Number(conditionValue);
      case 'lessThan':
        return Number(value) < Number(conditionValue);
      case 'greaterOrEqual':
        return Number(value) >= Number(conditionValue);
      case 'lessOrEqual':
        return Number(value) <= Number(conditionValue);
      case 'between':
        if (conditionValue && conditionValue.includes('-')) {
          const [min, max] = conditionValue.split('-').map(v => Number(v.trim()));
          const numValue = Number(value);
          return numValue >= min && numValue <= max;
        }
        return false;
      case 'notBetween':
        if (conditionValue && conditionValue.includes('-')) {
          const [min, max] = conditionValue.split('-').map(v => Number(v.trim()));
          const numValue = Number(value);
          return numValue < min || numValue > max;
        }
        return true;
      default:
        return true;
    }
  };

  const filteredData = filteredBySearch.filter((row) => {
    // Apply column filters
    for (const columnKey of Object.keys(filters)) {
      const filter = filters[columnKey];
      if (!filter) continue; // Skip if filter is null or undefined
      
      const isNumericColumn = columnKey === 'qty' || columnKey === 'volume';
      
      // Apply value filters (checkbox selections)
      if (filter.selectedValues && filter.selectedValues.size > 0) {
        const rowValue = row[columnKey];
        const matchesValue = filter.selectedValues.has(rowValue) || 
                            filter.selectedValues.has(String(rowValue));
        if (!matchesValue) return false;
      }
      
      // Apply condition filters
      if (filter.conditionType) {
        const matchesCondition = applyConditionFilter(
          row[columnKey],
          filter.conditionType,
          filter.conditionValue,
          isNumericColumn
        );
        if (!matchesCondition) return false;
      }
    }
    return true;
  });

  // Filter by selected shipment
  const filteredByShipment = selectedShipment
    ? filteredData.filter((row) => row.tpsShipNumber === selectedShipment)
    : filteredData;

  // Handle window resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize localData when filteredByShipment changes (outside sort mode)
  // Preserve splits if they exist
  useEffect(() => {
    if (!isSortMode && !hasSplitsRef.current) {
      // Only reset if we don't have splits
      // Preserve status changes when resetting
      setLocalData(prevData => {
        if (prevData.length === 0) {
          return filteredByShipment;
        }
        // Merge status changes from prevData into new filteredByShipment
        const statusMap = new Map();
        prevData.forEach(row => {
          if (row.status && row.status !== 'Not Started') {
            statusMap.set(row.id, row.status);
          }
        });
        
        const merged = filteredByShipment.map(row => {
          const savedStatus = statusMap.get(row.id);
          if (savedStatus) {
            return { ...row, status: savedStatus };
          }
          return row;
        });
        
        return merged;
      });
      setOriginalData(filteredByShipment);
    } else if (!isSortMode && hasSplitsRef.current) {
      // We have splits, merge them with new filtered data
      setLocalData(prevData => {
        if (!prevData || prevData.length === 0) {
          hasSplitsRef.current = false;
          return filteredByShipment;
        }
        
        // Create a map of split rows by originalId
        const splitMap = new Map();
        prevData.forEach(row => {
          if (row.splitTag && row.originalId) {
            const key = row.originalId;
            if (!splitMap.has(key)) {
              splitMap.set(key, []);
            }
            splitMap.get(key).push(row);
          }
        });
        
        // If no splits found, reset the ref
        if (splitMap.size === 0) {
          hasSplitsRef.current = false;
          return filteredByShipment;
        }
        
        // Start with new filtered data
        const result = [...filteredByShipment];
        
        // Replace original rows with their split versions, but only if the original row matches the current filters
        splitMap.forEach((splitRows, originalId) => {
          const index = result.findIndex(r => r.id === originalId);
          if (index !== -1) {
            // Original row exists in filtered results, replace with splits
            result.splice(index, 1, ...splitRows);
          } else {
            // Original row doesn't match current filters, check if split rows themselves match
            // Filter split rows based on current search query and filters
            const matchingSplits = splitRows.filter(splitRow => {
              // Check if split row matches search query
              if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                const matchesSearch = 
                  splitRow.tpsShipNumber?.toLowerCase().includes(query) ||
                  splitRow.type?.toLowerCase().includes(query) ||
                  splitRow.formula?.toLowerCase().includes(query) ||
                  splitRow.size?.toLowerCase().includes(query) ||
                  String(splitRow.qty || '').includes(query);
                if (!matchesSearch) return false;
              }
              // Check if split row matches column filters
              for (const columnKey of Object.keys(filters)) {
                const filter = filters[columnKey];
                if (!filter) continue; // Skip if filter is null or undefined
                
                const isNumericColumn = columnKey === 'qty' || columnKey === 'volume';
                
                if (filter.selectedValues && filter.selectedValues.size > 0) {
                  const rowValue = splitRow[columnKey];
                  const matchesValue = filter.selectedValues.has(rowValue) || 
                                      filter.selectedValues.has(String(rowValue));
                  if (!matchesValue) return false;
                }
                
                if (filter.conditionType) {
                  const matchesCondition = applyConditionFilter(
                    splitRow[columnKey],
                    filter.conditionType,
                    filter.conditionValue,
                    isNumericColumn
                  );
                  if (!matchesCondition) return false;
                }
              }
              // Check shipment filter
              if (selectedShipment && splitRow.tpsShipNumber !== selectedShipment) {
                return false;
              }
              return true;
            });
            // Add matching split rows to result
            if (matchingSplits.length > 0) {
              result.push(...matchingSplits);
            }
          }
        });
        
        return result;
      });
      setOriginalData(filteredByShipment);
    }
  }, [filteredByShipment, isSortMode, searchQuery, filters, selectedShipment]);

  // Capture original data when entering sort mode
  useEffect(() => {
    if (isSortMode && filteredByShipment.length > 0) {
      setOriginalData(filteredByShipment);
      setLocalData(filteredByShipment);
    } else if (!isSortMode) {
      // Clear last moved index and selections when exiting sort mode
      setLastMovedIndex(null);
      setSelectedRows(new Set());
      setBulkSelectedRows(new Set());
    }
  }, [isSortMode]);

  // Use localData for display (it contains splits if any), fallback to filteredByShipment
  // Ensure localData is synced with filteredByShipment when search changes (status changes preserved via useEffect)
  const finalData = localData.length > 0 ? localData : filteredByShipment;

  // Handle click outside status dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      Object.keys(statusDropdowns).forEach((rowId) => {
        const buttonElement = statusButtonRefs.current[rowId];
        if (buttonElement && !buttonElement.contains(event.target)) {
          const dropdown = document.querySelector(`[data-status-dropdown="${rowId}"]`);
          if (dropdown && !dropdown.contains(event.target)) {
            setStatusDropdowns((prev) => {
              const newState = { ...prev };
              delete newState[rowId];
              return newState;
            });
          }
        }
      });
    };

    if (Object.keys(statusDropdowns).length > 0) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [statusDropdowns]);

  // Handle click outside action menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionMenuId) {
        const buttonElement = actionButtonRefs.current[actionMenuId];
        const clickedElement = event.target;
        
        if (buttonElement && !buttonElement.contains(clickedElement)) {
          const menuElement = document.querySelector('[data-action-menu-portal]');
          if (menuElement && !menuElement.contains(clickedElement)) {
            setActionMenuId(null);
          }
        }
      }
    };

    if (actionMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [actionMenuId]);

  const statusOptions = ['In Progress', 'Completed', 'Not Started', 'On Hold'];

  const handleStatusClick = (rowId, e) => {
    e.stopPropagation();
    setStatusDropdowns((prev) => ({
      ...prev,
      [rowId]: !prev[rowId],
    }));
  };

  const handleStatusSelect = (rowId, status) => {
    // TODO: Update status in backend
    console.log(`Updating status for row ${rowId} to ${status}`);
    
    // Update the status in localData using functional update
    setLocalData((prevData) => {
      // Always use current localData if it exists, otherwise initialize from filteredByShipment
      const currentData = prevData.length > 0 ? prevData : filteredByShipment;
      const dataToUpdate = [...currentData];
      
      const updated = dataToUpdate.map((row) => {
        // Check both id and originalId for split rows
        if (row.id === rowId || (row.originalId && row.originalId === rowId)) {
          return { ...row, status: status };
        }
        return row;
      });
      
      console.log('Updated localData:', updated.find(r => r.id === rowId || r.originalId === rowId));
      return updated;
    });
    
    // Also update originalData to preserve the status change
    setOriginalData((prevData) => {
      const currentData = prevData.length > 0 ? prevData : filteredByShipment;
      const dataToUpdate = [...currentData];
      
      return dataToUpdate.map((row) => {
        if (row.id === rowId || (row.originalId && row.originalId === rowId)) {
          return { ...row, status: status };
        }
        return row;
      });
    });
    
    setStatusDropdowns((prev) => {
      const newState = { ...prev };
      delete newState[rowId];
      return newState;
    });
  };

  const handleVolumeChange = (rowId, value) => {
    setVolumes((prev) => ({
      ...prev,
      [rowId]: value,
    }));
  };

  const handleFilterClick = (columnKey, e) => {
    e.stopPropagation();
    setOpenFilterColumn(openFilterColumn === columnKey ? null : columnKey);
  };

  // Close filter dropdown when clicking outside
  useEffect(() => {
    if (openFilterColumn === null) return;
    const handleClickOutside = (event) => {
      const icon = filterIconRefs.current[openFilterColumn];
      if (icon && !icon.contains(event.target)) {
        const dropdown = document.querySelector(`[data-filter-dropdown="${openFilterColumn}"]`);
        if (dropdown && !dropdown.contains(event.target)) {
          setOpenFilterColumn(null);
        }
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openFilterColumn]);

  // Get unique values for a column
  const getColumnValues = (columnKey) => {
    const values = new Set();
    filteredBySearch.forEach(row => {
      const val = row[columnKey];
      if (val !== undefined && val !== null && val !== '') {
        values.add(val);
      }
    });
    // Sort values
    const sortedValues = Array.from(values).sort((a, b) => {
      if (typeof a === 'number' && typeof b === 'number') {
        return a - b;
      }
      return String(a).localeCompare(String(b));
    });
    return sortedValues;
  };

  // Check if a column has active filters
  const hasActiveFilter = (columnKey) => {
    const filter = filters[columnKey];
    if (!filter) return false;
    
    // Handle both Set and Array for selectedValues
    const hasValues = filter.selectedValues && (
      (filter.selectedValues instanceof Set && filter.selectedValues.size > 0) ||
      (Array.isArray(filter.selectedValues) && filter.selectedValues.length > 0)
    );
    const hasCondition = filter.conditionType && filter.conditionType !== '';
    
    return hasValues || hasCondition;
  };

  const handleApplyFilter = (columnKey, filterData) => {
    setFilters(prev => ({
      ...prev,
      [columnKey]: filterData,
    }));
  };

  // Drag and drop handlers
  const handleDragStart = (e, index) => {
    if (!isSortMode) return;
    // Prevent dragging if clicking on interactive elements
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.closest('button') || e.target.closest('input') || e.target.closest('select')) {
      e.preventDefault();
      return;
    }
    // For mobile, allow dragging from anywhere on the card (except interactive elements)
    setDraggedRowIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
    const rowElement = e.currentTarget;
    rowElement.style.opacity = '0.5';
    rowElement.style.cursor = 'grabbing';
  };

  const handleDragOver = (e, index) => {
    if (!isSortMode) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDraggedOverRowIndex(index);
  };

  const handleDragLeave = () => {
    setDraggedOverRowIndex(null);
  };

  const handleDrop = (e, dropIndex) => {
    if (!isSortMode || draggedRowIndex === null) return;
    e.preventDefault();
    
    const newData = [...localData];
    const draggedItem = newData[draggedRowIndex];
    const draggedItemId = draggedItem.id;
    
    newData.splice(draggedRowIndex, 1);
    newData.splice(dropIndex, 0, draggedItem);
    
    setLocalData(newData);
    
    // Keep the moved item highlighted - use the new index after drop
    setLastMovedIndex(dropIndex);
    
    // Preserve selection state for the moved item
    // If the dragged item was selected, keep it selected
    if (selectedRows.has(draggedItemId)) {
      // Selection is already tracked by ID, so it will persist
    }
    // If the dragged item was bulk selected, keep it bulk selected
    if (bulkSelectedRows.has(draggedItemId)) {
      // Bulk selection is already tracked by ID, so it will persist
    }
    
    setDraggedRowIndex(null);
    setDraggedOverRowIndex(null);
  };

  const handleDragEnd = (e) => {
    const rowElement = e.currentTarget;
    rowElement.style.opacity = '1';
    rowElement.style.cursor = isSortMode ? 'grab' : 'default';
    setDraggedRowIndex(null);
    setDraggedOverRowIndex(null);
  };

  // Touch-based drag handlers for mobile
  const handleTouchStart = (e, index) => {
    if (!isSortMode) return;
    // Don't start drag if clicking on interactive elements
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.closest('button') || e.target.closest('input') || e.target.closest('select')) {
      return;
    }
    const touch = e.touches[0];
    setTouchStartY(touch.clientY);
    setTouchStartIndex(index);
    setIsDragging(false);
  };

  const handleTouchMove = (e, index) => {
    if (!isSortMode || touchStartIndex === null) return;
    const touch = e.touches[0];
    const deltaY = Math.abs(touch.clientY - touchStartY);
    
    // Start dragging after 10px movement
    if (deltaY > 10 && !isDragging) {
      setIsDragging(true);
      setDraggedRowIndex(touchStartIndex);
      e.preventDefault();
    }
    
    if (isDragging) {
      e.preventDefault();
      // Find which card we're over
      const cards = document.querySelectorAll('[data-card-index]');
      let newOverIndex = null;
      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        if (touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
          const cardIndex = parseInt(card.getAttribute('data-card-index'));
          if (cardIndex !== draggedOverRowIndex) {
            newOverIndex = cardIndex;
          }
        }
      });
      if (newOverIndex !== null) {
        setDraggedOverRowIndex(newOverIndex);
      }
    }
  };

  const handleTouchEnd = (e, index) => {
    if (!isSortMode || touchStartIndex === null) return;
    
    if (isDragging && draggedRowIndex !== null && draggedOverRowIndex !== null && draggedRowIndex !== draggedOverRowIndex) {
      const newData = [...localData];
      const draggedItem = newData[draggedRowIndex];
      newData.splice(draggedRowIndex, 1);
      newData.splice(draggedOverRowIndex, 0, draggedItem);
      setLocalData(newData);
      // Keep the moved item highlighted - use the new index after drop
      setLastMovedIndex(draggedOverRowIndex);
    }
    
    setTouchStartY(null);
    setTouchStartIndex(null);
    setIsDragging(false);
    setDraggedRowIndex(null);
    setDraggedOverRowIndex(null);
  };

  // Calculate unsaved changes count
  const getUnsavedChangesCount = () => {
    if (!isSortMode || originalData.length === 0 || localData.length === 0) return 0;
    
    let changes = 0;
    originalData.forEach((originalRow, originalIndex) => {
      const currentIndex = localData.findIndex(row => row.id === originalRow.id);
      if (currentIndex !== originalIndex) {
        changes++;
      }
    });
    return changes;
  };

  const unsavedChangesCount = getUnsavedChangesCount();

  // Handle cancel changes - revert to original order and exit sort mode
  const handleCancelChanges = () => {
    setLocalData([...originalData]);
    setLastMovedIndex(null); // Clear highlight when canceling
    setSelectedRows(new Set()); // Clear selections
    setBulkSelectedRows(new Set()); // Clear bulk selections
    if (onExitSortMode) {
      onExitSortMode();
    }
  };

  // Handle save changes - show confirmation modal
  const handleSaveChanges = () => {
    setShowConfirmModal(true);
  };

  // Handle confirm save
  const handleConfirmSave = () => {
    // Update original data to match current order
    setOriginalData([...localData]);
    // TODO: Save to backend API here
    console.log('Saving order:', localData);
    setShowConfirmModal(false);
    setLastMovedIndex(null); // Clear highlight when saving
    setSelectedRows(new Set()); // Clear selections
    setBulkSelectedRows(new Set()); // Clear bulk selections
    // Exit sort mode after saving
    if (onExitSortMode) {
      onExitSortMode();
    }
  };

  // Handle cancel confirmation
  const handleCancelConfirm = () => {
    setShowConfirmModal(false);
  };

  // Handle first batch quantity change
  const handleFirstBatchQtyChange = (e) => {
    const newValue = parseFloat(e.target.value) || 0;
    if (!selectedRowForSplit) return;

    const originalQty = selectedRowForSplit.qty || 1;
    const minValue = 1;
    const maxValue = originalQty - 1;

    if (newValue < minValue) {
      setFirstBatchQty(minValue);
    } else if (newValue > maxValue) {
      setFirstBatchQty(maxValue);
    } else {
      setFirstBatchQty(newValue);
    }
  };

  // Calculate second batch quantity (auto-calculated)
  const secondBatchQty = selectedRowForSplit ? Math.max(0, (selectedRowForSplit.qty || 1) - firstBatchQty) : 0;

  const columns = [
    { key: 'status', label: 'STATUS', width: '190px' },
    { key: 'tpsShipNumber', label: 'TPS SHIP #', width: '160px' },
    { key: 'type', label: 'TYPE', width: '130px' },
    { key: 'formula', label: 'FORMULA', width: '190px' },
    { key: 'size', label: 'SIZE', width: '150px' },
    { key: 'qty', label: 'QTY', width: '110px' },
    { key: 'tote', label: 'TOTE', width: '150px' },
    { key: 'volume', label: 'VOLUME', width: '150px' },
    { key: 'measure', label: 'MEASURE', width: '150px' },
    { key: 'notes', label: 'NOTES', width: '170px' },
  ];

  // Helper function to get status color
  const getStatusColor = (status) => {
    if (status === 'Completed') return '#10B981'; // green
    if (status === 'In Progress') return '#3B82F6'; // blue
    if (status === 'On Hold') return '#F59E0B'; // amber/orange
    return 'transparent'; // no color for not started
  };

  // Helper function to get status icon
  const getStatusIcon = (status) => {
    if (status === 'Completed') {
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M11.6667 3.5L5.25 9.91667L2.33334 7" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    }
    if (status === 'In Progress') {
      return (
        <img 
          src="/assets/spinner.png" 
          alt="In Progress" 
          style={{ width: '14px', height: '14px' }}
        />
      );
    }
    if (status === 'On Hold') {
      return (
        <img 
          src="/assets/on hold.png" 
          alt="On Hold" 
          style={{ width: '14px', height: '14px' }}
        />
      );
    }
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="7" cy="7" r="5.5" stroke="#9CA3AF" strokeWidth="1.5"/>
      </svg>
    );
  };

  // Mobile Card View
  if (isMobile) {
    return (
      <>
        <div className="w-full" style={{ padding: '0 1rem', boxSizing: 'border-box' }}>
          {finalData.length === 0 ? (
            <div
              className={`px-6 py-6 text-center text-sm ${themeClasses.textSecondary}`}
            >
              No data available.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '1rem', width: '100%' }}>
              {finalData.map((row, index) => {
                const status = row.status || 'Not Started';
                const statusColor = getStatusColor(status);
                const totalGallons = (row.volume || 0) * (row.qty || 0);
                const formattedGallons = totalGallons.toLocaleString('en-US');
                
                return (
                  <div
                    key={row.id || index}
                    data-card-index={index}
                    className={`${themeClasses.cardBg}`}
                    draggable={isSortMode && !isMobile}
                    onDragStart={(e) => !isMobile && handleDragStart(e, index)}
                    onDragOver={(e) => !isMobile && handleDragOver(e, index)}
                    onDragLeave={!isMobile ? handleDragLeave : undefined}
                    onDrop={(e) => !isMobile && handleDrop(e, index)}
                    onDragEnd={!isMobile ? handleDragEnd : undefined}
                    onTouchStart={(e) => isMobile && handleTouchStart(e, index)}
                    onTouchMove={(e) => isMobile && handleTouchMove(e, index)}
                    onTouchEnd={(e) => isMobile && handleTouchEnd(e, index)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      width: '100%',
                      minHeight: '150px',
                      borderRadius: '12px',
                      border: lastMovedIndex === index ? '2px solid #007AFF' : (draggedOverRowIndex === index ? '1px solid #007AFF' : '1px solid #E5E7EB'),
                      position: 'relative',
                      overflow: 'hidden',
                      padding: '16px',
                      gap: '10px',
                      boxSizing: 'border-box',
                      cursor: isSortMode ? 'grab' : 'default',
                      opacity: draggedRowIndex === index ? 0.5 : 1,
                      backgroundColor: lastMovedIndex === index ? (isDarkMode ? 'rgba(0, 122, 255, 0.1)' : 'rgba(0, 122, 255, 0.05)') : 'transparent',
                      userSelect: isSortMode ? 'none' : 'auto',
                      WebkitUserSelect: isSortMode ? 'none' : 'auto',
                      touchAction: isSortMode ? 'pan-y' : 'auto',
                      transform: isDragging && touchStartIndex === index ? 'scale(1.02)' : 'scale(1)',
                      transition: isDragging ? 'none' : 'transform 0.2s ease, border-color 0.2s ease, background-color 0.2s ease',
                    }}
                  >
                    {/* Left side - Drag handle in sort mode, colored bar otherwise */}
                    {isSortMode ? (
                      <div
                        data-drag-handle
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#F9FAFB',
                          borderTopLeftRadius: '12px',
                          borderBottomLeftRadius: '12px',
                          cursor: 'grab',
                          touchAction: 'none',
                          pointerEvents: 'auto',
                        }}
                      >
                        <svg width="12" height="16" viewBox="0 0 12 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="3" cy="4" r="1.5" fill="#9CA3AF"/>
                          <circle cx="9" cy="4" r="1.5" fill="#9CA3AF"/>
                          <circle cx="3" cy="8" r="1.5" fill="#9CA3AF"/>
                          <circle cx="9" cy="8" r="1.5" fill="#9CA3AF"/>
                          <circle cx="3" cy="12" r="1.5" fill="#9CA3AF"/>
                          <circle cx="9" cy="12" r="1.5" fill="#9CA3AF"/>
                        </svg>
                      </div>
                    ) : (
                      <>
                        {/* Left colored bar - Green rounded bar for Completed status */}
                        {status === 'Completed' && (
                          <div
                            style={{
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              bottom: 0,
                              width: '6px',
                              backgroundColor: '#10B981',
                              borderTopLeftRadius: '12px',
                              borderBottomLeftRadius: '12px',
                            }}
                          />
                        )}
                        {/* Left colored bar - Blue rounded bar for In Progress status */}
                        {status === 'In Progress' && (
                          <div
                            style={{
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              bottom: 0,
                              width: '6px',
                              backgroundColor: '#3B82F6',
                              borderTopLeftRadius: '12px',
                              borderBottomLeftRadius: '12px',
                            }}
                          />
                        )}
                        {/* Left colored bar - Gray rounded bar for Not Started status */}
                        {status === 'Not Started' && (
                          <div
                            style={{
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              bottom: 0,
                              width: '6px',
                              backgroundColor: '#9CA3AF',
                              borderTopLeftRadius: '12px',
                              borderBottomLeftRadius: '12px',
                            }}
                          />
                        )}
                        {/* Left colored bar - Amber rounded bar for On Hold status */}
                        {status === 'On Hold' && (
                          <div
                            style={{
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              bottom: 0,
                              width: '6px',
                              backgroundColor: '#F59E0B',
                              borderTopLeftRadius: '12px',
                              borderBottomLeftRadius: '12px',
                            }}
                          />
                        )}
                      </>
                    )}

                    {/* Card Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, paddingLeft: isSortMode ? '28px' : '8px' }}>
                        <div style={{ fontSize: '16px', fontWeight: 600, color: themeClasses.textPrimary, marginBottom: '2px' }}>
                          {row.formula}
                        </div>
                        <div style={{ fontSize: '11px', color: themeClasses.textSecondary }}>
                          TPS #{row.tpsShipNumber} • {row.type}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* Split Icon - Show when product is split */}
                        {row.splitTag && (
                          <img
                            src="/assets/split.png"
                            alt="Split"
                            style={{
                              width: 'auto',
                              height: '16px',
                              display: 'inline-block',
                              flexShrink: 0,
                            }}
                          />
                        )}
                        <button
                          ref={(el) => {
                            if (el) actionButtonRefs.current[row.id] = el;
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (actionMenuId === row.id) {
                              setActionMenuId(null);
                            } else {
                              const buttonElement = actionButtonRefs.current[row.id];
                              if (buttonElement) {
                                const rect = buttonElement.getBoundingClientRect();
                                setActionMenuPosition({
                                  top: rect.top + window.scrollY,
                                  right: window.innerWidth - rect.right - window.scrollX,
                                });
                              }
                              setActionMenuId(row.id);
                            }
                          }}
                          style={{
                            backgroundColor: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '2px',
                          }}
                        >
                          <svg width="4" height="14" viewBox="0 0 4 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="2" cy="2" r="1.5" fill="#6B7280" />
                            <circle cx="2" cy="7" r="1.5" fill="#6B7280" />
                            <circle cx="2" cy="12" r="1.5" fill="#6B7280" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* SIZE, QTY, TOTE Row */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        width: isSortMode ? 'calc(100% - 28px)' : 'calc(100% - 4px)',
                        height: '45px',
                        marginLeft: isSortMode ? '28px' : '4px',
                        backgroundColor: '#F9FAFB',
                        borderRadius: '8px',
                        border: '1px solid #E5E7EB',
                        paddingTop: '8px',
                        paddingRight: '16px',
                        paddingBottom: '8px',
                        paddingLeft: '16px',
                        gap: '16px',
                        boxSizing: 'border-box',
                      }}
                    >
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #E5E7EB', paddingRight: '16px' }}>
                        <div style={{ fontSize: '11px', color: themeClasses.textSecondary, marginBottom: '4px', fontWeight: 500 }}>SIZE</div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: themeClasses.textPrimary }}>{row.size}</div>
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #E5E7EB', paddingLeft: '16px', paddingRight: '16px' }}>
                        <div style={{ fontSize: '11px', color: themeClasses.textSecondary, marginBottom: '4px', fontWeight: 500 }}>QTY</div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: themeClasses.textPrimary }}>{row.qty}</div>
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingLeft: '16px' }}>
                        <div style={{ fontSize: '11px', color: themeClasses.textSecondary, marginBottom: '4px', fontWeight: 500 }}>TOTE</div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: themeClasses.textPrimary }}>{row.tote}</div>
                      </div>
                    </div>

                    {/* Status and Total Gallons Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: isSortMode ? '28px' : '4px' }}>
                      {/* Status Dropdown */}
                      <div style={{ position: 'relative', zIndex: 1001 }}>
                        <button
                          ref={(el) => {
                            if (el) statusButtonRefs.current[row.id] = el;
                          }}
                          onClick={(e) => handleStatusClick(row.id, e)}
                          style={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: '8px',
                            width: '135px',
                            height: '24px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #E5E7EB',
                            borderRadius: '4px',
                            paddingTop: '4px',
                            paddingRight: '12px',
                            paddingBottom: '4px',
                            paddingLeft: '12px',
                            cursor: 'pointer',
                            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                            boxSizing: 'border-box',
                          }}
                        >
                          {getStatusIcon(status)}
                          <span
                            style={{
                              fontSize: '13px',
                              fontWeight: 400,
                              color: '#374151',
                              flex: 1,
                              textAlign: 'left',
                            }}
                          >
                            {status}
                          </span>
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 12 12"
                            fill="none"
                            style={{ flexShrink: 0 }}
                          >
                            <path
                              d="M3 4.5L6 7.5L9 4.5"
                              stroke="#6B7280"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                        {statusDropdowns[row.id] && createPortal(
                          <div
                            data-status-dropdown={row.id}
                            style={{
                              position: 'fixed',
                              top: statusButtonRefs.current[row.id] ? `${statusButtonRefs.current[row.id].getBoundingClientRect().bottom + 4}px` : '0',
                              left: statusButtonRefs.current[row.id] ? `${statusButtonRefs.current[row.id].getBoundingClientRect().left}px` : '0',
                              width: '135px',
                              zIndex: 10000,
                              backgroundColor: '#FFFFFF',
                              border: '1px solid #E5E7EB',
                              borderRadius: '8px',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                              overflow: 'hidden',
                            }}
                          >
                            {statusOptions.map((statusOption) => (
                              <button
                                key={statusOption}
                                onClick={() => handleStatusSelect(row.id, statusOption)}
                                style={{
                                  width: '100%',
                                  textAlign: 'left',
                                  padding: '8px 12px',
                                  fontSize: '14px',
                                  color: '#111827',
                                  backgroundColor: 'transparent',
                                  border: 'none',
                                  cursor: 'pointer',
                                  borderBottom: statusOption !== statusOptions[statusOptions.length - 1] ? '1px solid #E5E7EB' : 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#F3F4F6';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                              >
                                {getStatusIcon(statusOption)}
                                {statusOption}
                              </button>
                            ))}
                          </div>,
                          document.body
                        )}
                      </div>

                      {/* Total Gallons - Right Aligned */}
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: themeClasses.textPrimary }}>
                          {formattedGallons} {row.measure || 'Gallons'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Action Menu Portal for Mobile */}
        {actionMenuId && (() => {
          const selectedRow = finalData.find((r) => r.id === actionMenuId);
          if (!selectedRow) return null;

          return createPortal(
            <div
              data-action-menu-portal
              style={{
                position: 'fixed',
                top: `${actionMenuPosition.top}px`,
                right: `${actionMenuPosition.right}px`,
                transform: 'translate(calc(-20px), calc(-50% + 11px))',
                zIndex: 10000,
                width: '146px',
                minHeight: '108px',
                display: 'flex',
                flexDirection: 'column',
                padding: '8px',
                gap: '4px',
                backgroundColor: '#FFFFFF',
                borderBottom: '1px solid #E5E7EB',
                borderRadius: '8px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                boxSizing: 'border-box',
                overflow: 'visible',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Split Formula */}
              <button
                type="button"
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px',
                  fontSize: '13px',
                  fontWeight: 400,
                  color: '#374151',
                  borderRadius: '4px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F3F4F6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                onClick={() => {
                  setSelectedRowForSplit(selectedRow);
                  const initialQty = selectedRow.qty && selectedRow.qty > 0 ? Math.min(1, selectedRow.qty) : 1;
                  setFirstBatchQty(initialQty);
                  setShowSplitModal(true);
                  setActionMenuId(null);
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 2V14" stroke="#111827" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M3 6L8 2L13 6" stroke="#111827" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3 10L8 14L13 10" stroke="#111827" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Split Formula</span>
              </button>

              {/* Product Notes */}
              <button
                type="button"
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px',
                  fontSize: '13px',
                  fontWeight: 400,
                  color: '#374151',
                  borderRadius: '4px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F3F4F6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                onClick={() => {
                  setSelectedRowForNotes(selectedRow);
                  setNotesModalOpen(true);
                  setActionMenuId(null);
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 2H12C12.5523 2 13 2.44772 13 3V13C13 13.5523 12.5523 14 12 14H4C3.44772 14 3 13.5523 3 13V3C3 2.44772 3.44772 2 4 2Z" stroke="#111827" strokeWidth="1.5"/>
                  <path d="M4 5H12" stroke="#111827" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M4 8H12" stroke="#111827" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M4 11H8" stroke="#111827" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <span>Product Notes</span>
              </button>

              {/* More Details */}
              <button
                type="button"
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px',
                  fontSize: '13px',
                  fontWeight: 400,
                  color: '#374151',
                  borderRadius: '4px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F3F4F6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                onClick={() => {
                  console.log('More Details for:', selectedRow);
                  setActionMenuId(null);
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="8" cy="8" r="6" stroke="#111827" strokeWidth="1.5"/>
                  <path d="M8 5V8" stroke="#111827" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M8 11H8.01" stroke="#111827" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <span>More Details</span>
              </button>
            </div>,
            document.body
          );
        })()}

        {/* Shared Modals - accessible from mobile view */}
        {showSplitModal && selectedRowForSplit && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10002,
            }}
            onClick={() => {
              setShowSplitModal(false);
              setSelectedRowForSplit(null);
              setFirstBatchQty(1);
            }}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                width: '90%',
                maxWidth: '500px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '20px 24px',
                  backgroundColor: '#2C3544',
                  borderTopLeftRadius: '12px',
                  borderTopRightRadius: '12px',
                }}
              >
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
                  Split Formula Volume
                </h2>
                <button
                  onClick={() => {
                    setShowSplitModal(false);
                    setSelectedRowForSplit(null);
                    setFirstBatchQty(1);
                  }}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                    First Batch Quantity
                  </label>
                  <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>
                    Enter the quantity for the first batch.
                  </p>
                  <input
                    type="number"
                    value={firstBatchQty}
                    onChange={handleFirstBatchQtyChange}
                    min={1}
                    max={selectedRowForSplit ? (selectedRowForSplit.qty || 1) - 1 : 1}
                    step={1}
                    style={{
                      width: '100%',
                      height: '40px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #D1D5DB',
                      backgroundColor: '#FFFFFF',
                      fontSize: '14px',
                      color: '#111827',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                    Second Batch Quantity
                  </label>
                  <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>
                    The remaining units after the split.
                  </p>
                  <input
                    type="number"
                    value={secondBatchQty}
                    readOnly
                    style={{
                      width: '100%',
                      height: '40px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #D1D5DB',
                      backgroundColor: '#F9FAFB',
                      fontSize: '14px',
                      color: '#6B7280',
                      cursor: 'not-allowed',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
              <div style={{ padding: '20px 24px', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  onClick={() => {
                    setShowSplitModal(false);
                    setSelectedRowForSplit(null);
                    setFirstBatchQty(1);
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
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!selectedRowForSplit) return;
                    const originalQty = selectedRowForSplit.qty || 1;
                    const firstBatchQtyValue = firstBatchQty;
                    const secondBatchQty = originalQty - firstBatchQtyValue;
                    if (firstBatchQtyValue <= 0 || firstBatchQtyValue >= originalQty) return;
                    const baseId = selectedRowForSplit.id;
                    const firstBatch = { ...selectedRowForSplit, id: `${baseId}_split_1`, qty: firstBatchQtyValue, splitTag: '1/2', originalId: baseId };
                    const secondBatch = { ...selectedRowForSplit, id: `${baseId}_split_2`, qty: secondBatchQty, splitTag: '2/2', originalId: baseId };
                    const displayData = localData.length > 0 ? localData : filteredByShipment;
                    const rowIndex = displayData.findIndex(r => r.id === selectedRowForSplit.id);
                    if (rowIndex === -1) {
                      setShowSplitModal(false);
                      setSelectedRowForSplit(null);
                      setFirstBatchQty(1);
                      return;
                    }
                    const newData = [...displayData];
                    newData.splice(rowIndex, 1, firstBatch, secondBatch);
                    setLocalData(newData);
                    setOriginalData(newData);
                    hasSplitsRef.current = true;
                    setShowSplitModal(false);
                    setSelectedRowForSplit(null);
                    setFirstBatchQty(1);
                  }}
                  disabled={!selectedRowForSplit || firstBatchQty <= 0 || firstBatchQty >= (selectedRowForSplit?.qty || 1)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: (!selectedRowForSplit || firstBatchQty <= 0 || firstBatchQty >= (selectedRowForSplit?.qty || 1)) ? '#9CA3AF' : '#3B82F6',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: (!selectedRowForSplit || firstBatchQty <= 0 || firstBatchQty >= (selectedRowForSplit?.qty || 1)) ? 'not-allowed' : 'pointer',
                  }}
                >
                  Confirm Split
                </button>
              </div>
            </div>
          </div>
        )}

        {notesModalOpen && selectedRowForNotes && (
          <ProductionNotesModal
            isOpen={notesModalOpen}
            onClose={() => {
              setNotesModalOpen(false);
              setSelectedRowForNotes(null);
            }}
            product={{
              product: selectedRowForNotes.formula || 'Product',
              product_name: selectedRowForNotes.formula || 'Product',
              size: selectedRowForNotes.size || '',
            }}
            notes={rowNotes[selectedRowForNotes.id] || []}
            onAddNote={(noteText) => {
              const newNote = {
                text: noteText,
                userName: localStorage.getItem('userName') || 'User',
                userInitials: (localStorage.getItem('userName') || 'User')
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2),
                date: new Date().toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                }),
              };
              setRowNotes(prev => ({
                ...prev,
                [selectedRowForNotes.id]: [...(prev[selectedRowForNotes.id] || []), newNote],
              }));
            }}
            isDarkMode={isDarkMode}
            hideFooter={isMobile}
          />
        )}

        {/* Unsaved Changes Notification Bar - Mobile */}
        {isSortMode && unsavedChangesCount > 0 && (
          <div
            style={{
              position: 'fixed',
              bottom: '24px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 10000,
              backgroundColor: '#2C3544',
              borderRadius: '8px',
              padding: '8px 12px',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
              width: '303px',
              height: '39px',
              boxSizing: 'border-box',
            }}
          >
            {/* Pencil Icon */}
            <div
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                backgroundColor: '#3B82F6',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </div>

            {/* Unsaved Changes Text */}
            <span
              style={{
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 500,
                flex: 1,
                whiteSpace: 'nowrap',
              }}
            >
              {unsavedChangesCount} Unsaved Change{unsavedChangesCount !== 1 ? 's' : ''}
            </span>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                onClick={handleCancelChanges}
                style={{
                  width: '64px',
                  height: '23px',
                  borderRadius: '4px',
                  border: '1px solid #E5E7EB',
                  backgroundColor: '#FFFFFF',
                  color: '#374151',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  boxSizing: 'border-box',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F9FAFB';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveChanges}
                style={{
                  width: '52px',
                  height: '23px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: '#3B82F6',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  boxSizing: 'border-box',
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
        )}

        {/* Confirmation Modal - Mobile */}
        {showConfirmModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10001,
            }}
            onClick={handleCancelConfirm}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E5E7EB',
                padding: '24px',
                width: '90%',
                maxWidth: '473px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Title */}
              <h2
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#111827',
                  margin: 0,
                  textAlign: 'center',
                  marginBottom: '12px',
                }}
              >
                Are you sure?
              </h2>

              {/* Message */}
              <p
                style={{
                  fontSize: '14px',
                  color: '#6B7280',
                  margin: 0,
                  lineHeight: '1.5',
                  textAlign: 'center',
                  marginBottom: '24px',
                }}
              >
                Your changes will be applied to the current manufacturing order.
              </p>

              {/* Buttons */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  gap: '10px',
                  justifyContent: 'center',
                  marginTop: 'auto',
                }}
              >
                <button
                  onClick={handleCancelConfirm}
                  style={{
                    flex: 1,
                    height: '31px',
                    borderRadius: '4px',
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: '#374151',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                    boxSizing: 'border-box',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F9FAFB';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                  }}
                >
                  Go back
                </button>
                <button
                  onClick={handleConfirmSave}
                  style={{
                    flex: 1,
                    height: '31px',
                    borderRadius: '4px',
                    border: '1px solid #3B82F6',
                    backgroundColor: '#3B82F6',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                    boxSizing: 'border-box',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#2563EB';
                    e.currentTarget.style.borderColor = '#2563EB';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#3B82F6';
                    e.currentTarget.style.borderColor = '#3B82F6';
                  }}
                >
                  Confirm ({unsavedChangesCount})
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Desktop Table View
  return (
    <>
      <div
        className={`w-full ${themeClasses.cardBg}`}
        style={{
          borderRadius: '8px',
          border: '1px solid #E5E7EB',
          overflow: 'hidden',
        }}
      >
        {/* Table header */}
        <div
          className="bg-[#2C3544] border-b border-[#3C4656] w-full"
          style={{ height: '40px', borderRadius: '8px 8px 0 0' }}
        >
          <div
            className="grid h-full"
            style={{
              gridTemplateColumns: columns.map((col) => col.width).join(' '),
              gap: '0',
            }}
          >
            {columns.map((column, idx) => {
              const isActive = hasActiveFilter(column.key);
              return (
                <div
                  key={column.key}
                  className="h-full text-xs font-bold text-white uppercase tracking-wider flex items-center justify-center group"
                  style={{
                    paddingLeft: '22px',
                    paddingRight: '22px',
                    paddingTop: '12px',
                    paddingBottom: '12px',
                    position: 'relative',
                    borderRight: idx < columns.length - 1 ? '1px solid rgba(255, 255, 255, 0.15)' : 'none',
                    backgroundColor: isActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                  }}
                >
                  <span
                    style={{
                      color: (isActive || openFilterColumn === column.key) ? '#007AFF' : '#FFFFFF',
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {column.label}
                  </span>
                  <img
                    ref={(el) => {
                      if (el) filterIconRefs.current[column.key] = el;
                    }}
                    src="/assets/Vector (1).png"
                    alt="Filter"
                    className={`w-3 h-3 transition-opacity cursor-pointer ${
                      (isActive || openFilterColumn === column.key)
                        ? 'opacity-100'
                        : 'opacity-0 group-hover:opacity-100'
                    }`}
                    onClick={(e) => handleFilterClick(column.key, e)}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '12px',
                      height: '12px',
                      flexShrink: 0,
                      ...((isActive || openFilterColumn === column.key)
                        ? {
                            filter:
                              'invert(29%) sepia(94%) saturate(2576%) hue-rotate(199deg) brightness(102%) contrast(105%)',
                          }
                        : undefined),
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Table body */}
        <div className="w-full">
          {finalData.length === 0 ? (
            <div
              className={`px-6 py-6 text-center text-sm ${themeClasses.textSecondary}`}
            >
              No data available.
            </div>
          ) : (
            finalData.map((row, index) => {
              const isSelected = selectedRows.has(row.id);
              const isBulkSelected = bulkSelectedRows.has(row.id);
              const isMoved = lastMovedIndex === index;
              const isHighlighted = isMoved || isSelected || isBulkSelected;
              
              return (
              <div
                key={row.id || index}
                draggable={isSortMode}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                onClick={(e) => {
                  if (!isSortMode) return;
                  // Handle row selection
                  if (e.ctrlKey || e.metaKey) {
                    // Bulk selection with Ctrl/Cmd
                    setBulkSelectedRows(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has(row.id)) {
                        newSet.delete(row.id);
                      } else {
                        newSet.add(row.id);
                      }
                      return newSet;
                    });
                  } else {
                    // Single selection
                    setSelectedRows(prev => {
                      const newSet = new Set();
                      newSet.add(row.id);
                      return newSet;
                    });
                    // Clear bulk selection when single clicking
                    setBulkSelectedRows(new Set());
                  }
                }}
                className={`grid text-sm ${themeClasses.cardBg} ${themeClasses.rowHover}`}
                style={{
                  gridTemplateColumns: columns.map((col) => col.width).join(' '),
                  gap: '0',
                  borderBottom: '1px solid #e5e7eb',
                  height: '41px',
                  cursor: isSortMode ? 'grab' : 'default',
                  backgroundColor: isHighlighted 
                    ? (isDarkMode ? 'rgba(0, 122, 255, 0.15)' : 'rgba(0, 122, 255, 0.1)')
                    : (draggedOverRowIndex === index ? (isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)') : 'transparent'),
                  borderLeft: isHighlighted ? '3px solid #007AFF' : 'none',
                  transition: 'background-color 0.2s ease, border-left 0.2s ease',
                }}
              >
                {/* STATUS */}
                <div
                  className="flex items-center justify-center relative"
                  style={{
                    paddingLeft: '22px',
                    paddingRight: '22px',
                    paddingTop: '8px',
                    paddingBottom: '8px',
                  }}
                >
                  {isSortMode ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        height: '100%',
                        cursor: 'grab',
                      }}
                    >
                      <svg
                        width="12"
                        height="16"
                        viewBox="0 0 12 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        style={{ flexShrink: 0 }}
                      >
                        <line x1="2" y1="4" x2="10" y2="4" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" />
                        <line x1="2" y1="8" x2="10" y2="8" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" />
                        <line x1="2" y1="12" x2="10" y2="12" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </div>
                  ) : (
                    <>
                      <button
                        ref={(el) => {
                          if (el) statusButtonRefs.current[row.id] = el;
                        }}
                        onClick={(e) => handleStatusClick(row.id, e)}
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: '8px',
                          width: '100%',
                          maxWidth: '135px',
                          minHeight: '24px',
                          height: 'auto',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #E5E7EB',
                          borderRadius: '4px',
                          paddingTop: '4px',
                          paddingRight: '12px',
                          paddingBottom: '4px',
                          paddingLeft: '12px',
                          cursor: 'pointer',
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#D1D5DB';
                          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#E5E7EB';
                          e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                        }}
                      >
                        {getStatusIcon(row.status || 'Not Started')}
                        <span
                          style={{
                            fontSize: '13px',
                            fontWeight: 400,
                            color: '#374151',
                            flex: 1,
                            textAlign: 'left',
                            lineHeight: '1',
                          }}
                        >
                          {row.status || 'Not Started'}
                        </span>
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 12 12"
                          fill="none"
                          style={{ flexShrink: 0 }}
                        >
                          <path
                            d="M3 4.5L6 7.5L9 4.5"
                            stroke="#6B7280"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                      {statusDropdowns[row.id] && (
                        <div
                          data-status-dropdown={row.id}
                          style={{
                            position: 'absolute',
                            top: 'calc(100% + 4px)',
                            left: '22px',
                            right: '22px',
                            zIndex: 1000,
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            overflow: 'hidden',
                          }}
                        >
                          {statusOptions.map((status) => (
                            <button
                              key={status}
                              onClick={() => handleStatusSelect(row.id, status)}
                              style={{
                                width: '100%',
                                textAlign: 'left',
                                padding: '8px 12px',
                                fontSize: '14px',
                                color: '#111827',
                                backgroundColor: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                borderBottom: status !== statusOptions[statusOptions.length - 1] ? '1px solid #E5E7EB' : 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#F3F4F6';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                            >
                              {getStatusIcon(status)}
                              {status}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* TPS SHIP # */}
                <div
                  className={`flex items-center justify-center ${themeClasses.textPrimary}`}
                  style={{
                    paddingLeft: '22px',
                    paddingRight: '22px',
                    paddingTop: '8px',
                    paddingBottom: '8px',
                  }}
                >
                  {row.tpsShipNumber}
                </div>

                {/* TYPE */}
                <div
                  className={`flex items-center justify-center ${themeClasses.textPrimary}`}
                  style={{
                    paddingLeft: '22px',
                    paddingRight: '22px',
                    paddingTop: '8px',
                    paddingBottom: '8px',
                  }}
                >
                  {row.type}
                </div>

                {/* FORMULA */}
                <div
                  className={`flex items-center justify-center ${themeClasses.textPrimary}`}
                  style={{
                    paddingLeft: '22px',
                    paddingRight: '22px',
                    paddingTop: '8px',
                    paddingBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span>{row.formula}</span>
                  {row.splitTag && (
                    <img
                      src="/assets/split.png"
                      alt="Split"
                      style={{
                        width: 'auto',
                        height: '16px',
                        display: 'inline-block',
                      }}
                    />
                  )}
                </div>

                {/* SIZE */}
                <div
                  className={`flex items-center justify-center ${themeClasses.textPrimary}`}
                  style={{
                    paddingLeft: '22px',
                    paddingRight: '22px',
                    paddingTop: '8px',
                    paddingBottom: '8px',
                  }}
                >
                  {row.size}
                </div>

                {/* QTY */}
                <div
                  className={`flex items-center justify-center ${themeClasses.textPrimary}`}
                  style={{
                    paddingLeft: '22px',
                    paddingRight: '22px',
                    paddingTop: '8px',
                    paddingBottom: '8px',
                  }}
                >
                  {row.qty}
                </div>

                {/* TOTE */}
                <div
                  className={`flex items-center justify-center ${themeClasses.textPrimary}`}
                  style={{
                    paddingLeft: '22px',
                    paddingRight: '22px',
                    paddingTop: '8px',
                    paddingBottom: '8px',
                  }}
                >
                  {row.tote}
                </div>

                {/* VOLUME */}
                <div
                  className="flex items-center justify-center"
                  style={{
                    paddingLeft: '22px',
                    paddingRight: '22px',
                    paddingTop: '8px',
                    paddingBottom: '8px',
                  }}
                >
                  <input
                    type="text"
                    value={volumes[row.id] !== undefined ? volumes[row.id] : (row.volume || '')}
                    onChange={(e) => handleVolumeChange(row.id, e.target.value)}
                    style={{
                      width: '88px',
                      height: '24px',
                      backgroundColor: '#F9FAFB',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      paddingTop: '4px',
                      paddingRight: '6px',
                      paddingBottom: '4px',
                      paddingLeft: '6px',
                      textAlign: 'center',
                      fontSize: '13px',
                      color: isDarkMode ? '#E5E7EB' : '#374151',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#3B82F6';
                      e.currentTarget.style.backgroundColor = '#FFFFFF';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#E5E7EB';
                      e.currentTarget.style.backgroundColor = '#F9FAFB';
                    }}
                  />
                </div>

                {/* MEASURE */}
                <div
                  className={`flex items-center justify-center ${themeClasses.textPrimary}`}
                  style={{
                    paddingLeft: '22px',
                    paddingRight: '22px',
                    paddingTop: '8px',
                    paddingBottom: '8px',
                  }}
                >
                  {row.measure}
                </div>

                {/* NOTES */}
                <div
                  className="flex items-center justify-center relative"
                  style={{
                    paddingLeft: '22px',
                    paddingRight: '22px',
                    paddingTop: '8px',
                    paddingBottom: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', position: 'relative' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRowForNotes(row);
                        setNotesModalOpen(true);
                      }}
                      style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F3F4F6';
                        e.currentTarget.style.borderRadius = '4px';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <img
                        src="/assets/Vector (3).png"
                        alt="Notes"
                        style={{
                          width: '20px',
                          height: '16px',
                        }}
                      />
                    </button>
                    <button
                      ref={(el) => {
                        if (el) actionButtonRefs.current[row.id] = el;
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (actionMenuId === row.id) {
                          setActionMenuId(null);
                        } else {
                          const buttonElement = actionButtonRefs.current[row.id];
                          if (buttonElement) {
                            const rect = buttonElement.getBoundingClientRect();
                            setActionMenuPosition({
                              top: rect.top + window.scrollY,
                              right: window.innerWidth - rect.right - window.scrollX,
                            });
                          }
                          setActionMenuId(row.id);
                        }
                      }}
                      style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '2px',
                        position: 'absolute',
                        right: 0,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F3F4F6';
                        e.currentTarget.style.borderRadius = '4px';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <svg width="4" height="14" viewBox="0 0 4 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="2" cy="2" r="1.5" fill="#6B7280" />
                        <circle cx="2" cy="7" r="1.5" fill="#6B7280" />
                        <circle cx="2" cy="12" r="1.5" fill="#6B7280" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              );
            })
          )}
        </div>
      </div>

      {/* Action Menu Portal */}
      {actionMenuId && (() => {
        const selectedRow = finalData.find((r) => r.id === actionMenuId);
        if (!selectedRow) return null;

        return createPortal(
          <div
            data-action-menu-portal
            style={{
              position: 'fixed',
              top: `${actionMenuPosition.top}px`,
              right: `${actionMenuPosition.right}px`,
              transform: 'translate(calc(-20px), calc(-50% + 11px))',
              zIndex: 10000,
              minWidth: '220px',
              padding: '6px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Split Product */}
            <button
              type="button"
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '8px 12px',
                fontSize: '13px',
                fontWeight: 400,
                color: '#374151',
                borderRadius: '4px',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F3F4F6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              onClick={() => {
                setSelectedRowForSplit(selectedRow);
                // Initialize first batch with 1 (or the row's qty if it's less)
                const initialQty = selectedRow.qty && selectedRow.qty > 0 ? Math.min(1, selectedRow.qty) : 1;
                setFirstBatchQty(initialQty);
                setShowSplitModal(true);
                setActionMenuId(null);
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 4V12" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M4 2L8 4L12 2" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="4" cy="2" r="1.5" fill="#6B7280"/>
                <circle cx="12" cy="2" r="1.5" fill="#6B7280"/>
              </svg>
              <span>Split Product</span>
            </button>

            {/* Mark as Floor Inv. (Shiners) */}
            <button
              type="button"
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '8px 12px',
                fontSize: '13px',
                fontWeight: 400,
                color: '#374151',
                borderRadius: '4px',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F3F4F6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              onClick={() => {
                console.log('Mark as Floor Inv. (Shiners) for:', selectedRow);
                setActionMenuId(null);
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 3L5 13M7 3L7 13M9 3L9 13M11 3L11 13" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M4 2L12 2C12.5523 2 13 2.44772 13 3V13C13 13.5523 12.5523 14 12 14H4C3.44772 14 3 13.5523 3 13V3C3 2.44772 3.44772 2 4 2Z" stroke="#6B7280" strokeWidth="1.5"/>
                <circle cx="8" cy="8" r="1" fill="none" stroke="#6B7280" strokeWidth="1"/>
              </svg>
              <span>Mark as Floor Inv. (Shiners)</span>
            </button>

            {/* Mark as Floor Inv. (Finished Goods) */}
            <button
              type="button"
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '8px 12px',
                fontSize: '13px',
                fontWeight: 400,
                color: '#374151',
                borderRadius: '4px',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F3F4F6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              onClick={() => {
                console.log('Mark as Floor Inv. (Finished Goods) for:', selectedRow);
                setActionMenuId(null);
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 3L5 13M7 3L7 13M9 3L9 13M11 3L11 13" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M4 2L12 2C12.5523 2 13 2.44772 13 3V13C13 13.5523 12.5523 14 12 14H4C3.44772 14 3 13.5523 3 13V3C3 2.44772 3.44772 2 4 2Z" stroke="#6B7280" strokeWidth="1.5"/>
                <circle cx="8" cy="8" r="1" fill="#6B7280"/>
              </svg>
              <span>Mark as Floor Inv. (Finished Goods)</span>
            </button>
          </div>,
          document.body
        );
      })()}

      {/* Filter Dropdown */}
      {openFilterColumn && filterIconRefs.current[openFilterColumn] && (
        <SortFormulasFilterDropdown
          filterIconRef={filterIconRefs.current[openFilterColumn]}
          columnKey={openFilterColumn}
          availableValues={getColumnValues(openFilterColumn)}
          currentFilter={filters[openFilterColumn] || {}}
          currentSort={''}
          onApply={(filterData) => handleApplyFilter(openFilterColumn, filterData)}
          onClose={() => setOpenFilterColumn(null)}
        />
      )}

      {/* Unsaved Changes Notification Bar */}
      {isSortMode && unsavedChangesCount > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10000,
            backgroundColor: '#2C3544',
            borderRadius: '8px',
            padding: '8px 12px',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
            width: '303px',
            height: '39px',
            boxSizing: 'border-box',
          }}
        >
          {/* Pencil Icon */}
          <div
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: '#3B82F6',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </div>

          {/* Unsaved Changes Text */}
          <span
            style={{
              color: '#FFFFFF',
              fontSize: '12px',
              fontWeight: 500,
              flex: 1,
              whiteSpace: 'nowrap',
            }}
          >
            {unsavedChangesCount} Unsaved Change{unsavedChangesCount !== 1 ? 's' : ''}
          </span>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={handleCancelChanges}
              style={{
                width: '64px',
                height: '23px',
                borderRadius: '4px',
                border: '1px solid #E5E7EB',
                backgroundColor: '#FFFFFF',
                color: '#374151',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                boxSizing: 'border-box',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F9FAFB';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FFFFFF';
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveChanges}
              style={{
                width: '52px',
                height: '23px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: '#3B82F6',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                boxSizing: 'border-box',
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
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10001,
          }}
          onClick={handleCancelConfirm}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E5E7EB',
              padding: '24px',
              width: '473px',
              height: '154px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Title */}
            <h2
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: '#111827',
                margin: 0,
                textAlign: 'center',
                marginBottom: '12px',
              }}
            >
              Are you sure?
            </h2>

            {/* Message */}
            <p
              style={{
                fontSize: '14px',
                color: '#6B7280',
                margin: 0,
                lineHeight: '1.5',
                textAlign: 'center',
                marginBottom: '24px',
              }}
            >
              Your changes will be applied to the current manufacturing order.
            </p>

            {/* Buttons */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                gap: '10px',
                justifyContent: 'center',
                marginTop: 'auto',
              }}
            >
              <button
                onClick={handleCancelConfirm}
                style={{
                  width: '204.5px',
                  height: '31px',
                  borderRadius: '4px',
                  border: '1px solid #D1D5DB',
                  backgroundColor: '#FFFFFF',
                  color: '#374151',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  boxSizing: 'border-box',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F9FAFB';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                }}
              >
                Go back
              </button>
              <button
                onClick={handleConfirmSave}
                style={{
                  width: '204.5px',
                  height: '31px',
                  borderRadius: '4px',
                  border: '1px solid #3B82F6',
                  backgroundColor: '#3B82F6',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  boxSizing: 'border-box',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#2563EB';
                  e.currentTarget.style.borderColor = '#2563EB';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#3B82F6';
                  e.currentTarget.style.borderColor = '#3B82F6';
                }}
              >
                Confirm ({unsavedChangesCount})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Split Formula Volume Modal */}
      {showSplitModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10002,
          }}
          onClick={() => {
            setShowSplitModal(false);
            setSelectedRowForSplit(null);
            setFirstBatchQty(1);
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              width: '500px',
              maxWidth: '90vw',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with dark background */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px 24px',
                backgroundColor: '#2C3544',
                borderTopLeftRadius: '12px',
                borderTopRightRadius: '12px',
              }}
            >
              <h2
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#FFFFFF',
                  margin: 0,
                }}
              >
                Split Formula Volume
              </h2>
              <button
                onClick={() => {
                  setShowSplitModal(false);
                  setSelectedRowForSplit(null);
                  setFirstBatchQty(1);
                }}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.borderRadius = '4px';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* First Batch Quantity */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label
                  style={{
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#374151',
                  }}
                >
                  First Batch Quantity
                </label>
                <p
                  style={{
                    fontSize: '12px',
                    color: '#6B7280',
                    margin: 0,
                  }}
                >
                  Enter the quantity for the first batch.
                </p>
                <input
                  type="number"
                  value={firstBatchQty}
                  onChange={handleFirstBatchQtyChange}
                  min={1}
                  max={selectedRowForSplit ? (selectedRowForSplit.qty || 1) - 1 : 1}
                  step={1}
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    fontSize: '14px',
                    color: '#111827',
                    outline: 'none',
                    cursor: 'text',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3B82F6';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#D1D5DB';
                  }}
                />
              </div>

              {/* Second Batch Quantity */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label
                  style={{
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#374151',
                  }}
                >
                  Second Batch Quantity
                </label>
                <p
                  style={{
                    fontSize: '12px',
                    color: '#6B7280',
                    margin: 0,
                  }}
                >
                  The remaining units after the split.
                </p>
                <input
                  type="number"
                  value={secondBatchQty}
                  readOnly
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#F9FAFB',
                    fontSize: '14px',
                    color: '#6B7280',
                    cursor: 'not-allowed',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: '20px 24px',
                borderTop: '1px solid #E5E7EB',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
              }}
            >
              <button
                onClick={() => {
                  setShowSplitModal(false);
                  setSelectedRowForSplit(null);
                  setFirstBatchQty(1);
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
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!selectedRowForSplit) return;
                  
                  const originalQty = selectedRowForSplit.qty || 1;
                  const firstBatchQtyValue = firstBatchQty;
                  const secondBatchQty = originalQty - firstBatchQtyValue;
                  
                  // Validate that first batch is valid
                  if (firstBatchQtyValue <= 0 || firstBatchQtyValue >= originalQty) {
                    return; // Don't proceed if invalid
                  }
                  
                  // Create two new rows from the split
                  const baseId = selectedRowForSplit.id;
                  const firstBatch = {
                    ...selectedRowForSplit,
                    id: `${baseId}_split_1`,
                    qty: firstBatchQtyValue,
                    splitTag: '1/2',
                    originalId: baseId,
                  };
                  
                  const secondBatch = {
                    ...selectedRowForSplit,
                    id: `${baseId}_split_2`,
                    qty: secondBatchQty,
                    splitTag: '2/2',
                    originalId: baseId,
                  };
                  
                  // Find the row in finalData (what's currently displayed) to get the correct index
                  const displayData = localData.length > 0 ? localData : filteredByShipment;
                  const rowIndex = displayData.findIndex(r => r.id === selectedRowForSplit.id);
                  
                  if (rowIndex === -1) {
                    console.error('Row not found for split:', {
                      rowId: selectedRowForSplit.id,
                      localDataLength: localData.length,
                      filteredByShipmentLength: filteredByShipment.length,
                      displayDataLength: displayData.length
                    });
                    setShowSplitModal(false);
                    setSelectedRowForSplit(null);
                    setFirstBatchQty(1);
                    return;
                  }
                  
                  // Create new array with split rows replacing the original
                  const newData = [...displayData];
                  newData.splice(rowIndex, 1, firstBatch, secondBatch);
                  
                  // Update localData to show the split immediately
                  setLocalData(newData);
                  setOriginalData(newData);
                  hasSplitsRef.current = true; // Mark that we have splits
                  
                  console.log('Split confirmed:', { 
                    originalId: baseId,
                    originalQty: originalQty,
                    firstBatchQty: firstBatchQtyValue,
                    secondBatchQty: secondBatchQty,
                    firstBatch, 
                    secondBatch,
                    newDataLength: newData.length,
                    rowIndex,
                    beforeSplitLength: displayData.length
                  });
                  setShowSplitModal(false);
                  setSelectedRowForSplit(null);
                  setFirstBatchQty(1);
                }}
                disabled={!selectedRowForSplit || firstBatchQty <= 0 || firstBatchQty >= (selectedRowForSplit?.qty || 1)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: (!selectedRowForSplit || firstBatchQty <= 0 || firstBatchQty >= (selectedRowForSplit?.qty || 1)) ? '#9CA3AF' : '#3B82F6',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: (!selectedRowForSplit || firstBatchQty <= 0 || firstBatchQty >= (selectedRowForSplit?.qty || 1)) ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (selectedRowForSplit && firstBatchQty > 0 && firstBatchQty < (selectedRowForSplit?.qty || 1)) {
                    e.currentTarget.style.backgroundColor = '#2563EB';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedRowForSplit && firstBatchQty > 0 && firstBatchQty < (selectedRowForSplit?.qty || 1)) {
                    e.currentTarget.style.backgroundColor = '#3B82F6';
                  }
                }}
              >
                Confirm Split
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Production Notes Modal */}
      {notesModalOpen && selectedRowForNotes && (
        <ProductionNotesModal
          isOpen={notesModalOpen}
          onClose={() => {
            setNotesModalOpen(false);
            setSelectedRowForNotes(null);
          }}
          product={{
            product: selectedRowForNotes.formula || 'Product',
            product_name: selectedRowForNotes.formula || 'Product',
            size: selectedRowForNotes.size || '',
          }}
          notes={rowNotes[selectedRowForNotes.id] || []}
          onAddNote={(noteText) => {
            const newNote = {
              text: noteText,
              userName: localStorage.getItem('userName') || 'User',
              userInitials: (localStorage.getItem('userName') || 'User')
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2),
              date: new Date().toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
              }),
            };
            setRowNotes(prev => ({
              ...prev,
              [selectedRowForNotes.id]: [...(prev[selectedRowForNotes.id] || []), newNote],
            }));
          }}
          isDarkMode={isDarkMode}
        />
      )}
    </>
  );
};

export default ManufacturingTable;

