import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import { getShipmentProducts } from '../../../../services/productionApi';

const ShipmentsTable = ({ shipments, activeFilters, onFilterToggle }) => {
  const { isDarkMode } = useTheme();
  const [openFilterColumn, setOpenFilterColumn] = useState(null);
  const filterIconRefs = useRef({});
  const filterDropdownRef = useRef(null);
  const [filters, setFilters] = useState({});
  const [sortConfig, setSortConfig] = useState({ field: '', order: '' });
  const [sortedRowOrder, setSortedRowOrder] = useState(null); // Store sorted row IDs for one-time sort
  const [expandedShipmentId, setExpandedShipmentId] = useState(null);
  const [shipmentProducts, setShipmentProducts] = useState({});
  const [loadingProducts, setLoadingProducts] = useState(false);
  const containerRef = useRef(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [isScrollingHorizontally, setIsScrollingHorizontally] = useState(false);
  const scrollTimeoutRef = useRef(null);
  const lastScrollLeftRef = useRef(0);
  const [scrollbarWidth, setScrollbarWidth] = useState(0);

  const themeClasses = {
    cardBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    headerBg: 'bg-[#334155]',
    rowHover: isDarkMode ? 'hover:bg-dark-bg-tertiary' : 'hover:bg-gray-50',
  };

  const columnBorderColor = isDarkMode ? 'rgba(55, 65, 81, 0.9)' : '#E5E7EB';

  // Add style tag for scrollbar visibility
  useEffect(() => {
    const styleId = 'shipments-table-scrollbar-style';
    let style = document.getElementById(styleId);
    
    if (!style) {
      style = document.createElement('style');
      style.id = styleId;
      document.head.appendChild(style);
    }
    
    style.textContent = `
      .shipments-table-container {
        /* Firefox - always show thin scrollbar without buttons */
        scrollbar-width: thin !important;
        scrollbar-color: ${isDarkMode ? '#4B5563 #1F2937' : '#9CA3AF #F3F4F6'} !important;
        -ms-overflow-style: auto !important;
        /* Prevent layout shifts - reserve space for scrollbar on both edges */
        scrollbar-gutter: stable both-edges !important;
        box-sizing: border-box !important;
        /* Always show scrollbar to reserve space */
        overflow-y: scroll !important;
      }
      /* Webkit - default state: hide horizontal scrollbar (height: 0), show vertical (width: 8px) */
      .shipments-table-container::-webkit-scrollbar {
        width: 8px !important;
        height: 0 !important;
        background: transparent !important;
        -webkit-appearance: none !important;
      }
      /* Completely remove scrollbar buttons - most aggressive approach */
      .shipments-table-container::-webkit-scrollbar-button {
        -webkit-appearance: none !important;
        appearance: none !important;
        display: none !important;
        width: 0 !important;
        height: 0 !important;
        background: none !important;
        border: none !important;
        padding: 0 !important;
        margin: 0 !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
        min-width: 0 !important;
        min-height: 0 !important;
        max-width: 0 !important;
        max-height: 0 !important;
      }
      /* Target all possible scrollbar button states */
      .shipments-table-container::-webkit-scrollbar-button:vertical,
      .shipments-table-container::-webkit-scrollbar-button:horizontal,
      .shipments-table-container::-webkit-scrollbar-button:vertical:start,
      .shipments-table-container::-webkit-scrollbar-button:vertical:end,
      .shipments-table-container::-webkit-scrollbar-button:horizontal:start,
      .shipments-table-container::-webkit-scrollbar-button:horizontal:end {
        -webkit-appearance: none !important;
        appearance: none !important;
        display: none !important;
        width: 0 !important;
        height: 0 !important;
        background: none !important;
        border: none !important;
        padding: 0 !important;
        margin: 0 !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
        min-width: 0 !important;
        min-height: 0 !important;
        max-width: 0 !important;
        max-height: 0 !important;
      }
      .shipments-table-container::-webkit-scrollbar-track {
        background: ${isDarkMode ? '#1F2937' : '#F3F4F6'} !important;
        /* Ensure track always reserves space */
        -webkit-appearance: none !important;
        width: 8px !important;
      }
      .shipments-table-container::-webkit-scrollbar-thumb {
        background: ${isDarkMode ? '#4B5563' : '#9CA3AF'} !important;
        border-radius: 4px !important;
        transition: background 0.2s ease !important;
      }
      .shipments-table-container::-webkit-scrollbar-thumb:hover {
        background: ${isDarkMode ? '#6B7280' : '#6B7280'} !important;
      }
      /* Completely hide scrollbar buttons (up/down arrows) - all variations */
      .shipments-table-container::-webkit-scrollbar-button {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
        background: transparent !important;
        -webkit-appearance: none !important;
        appearance: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
      }
      .shipments-table-container::-webkit-scrollbar-button:start:decrement,
      .shipments-table-container::-webkit-scrollbar-button:end:increment {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
        background: transparent !important;
        -webkit-appearance: none !important;
        appearance: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
      }
      .shipments-table-container::-webkit-scrollbar-button:vertical:start:decrement,
      .shipments-table-container::-webkit-scrollbar-button:vertical:end:increment {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
        background: transparent !important;
        -webkit-appearance: none !important;
        appearance: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
      }
      .shipments-table-container::-webkit-scrollbar-button:horizontal:start:decrement,
      .shipments-table-container::-webkit-scrollbar-button:horizontal:end:increment {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
        background: transparent !important;
        -webkit-appearance: none !important;
        appearance: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
      }
      .shipments-table-container::-webkit-scrollbar-button:single-button {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
        background: transparent !important;
        -webkit-appearance: none !important;
        appearance: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
      }
      .shipments-table-container::-webkit-scrollbar-button:double-button {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
        background: transparent !important;
        -webkit-appearance: none !important;
        appearance: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
      }
      .shipments-table-container::-webkit-scrollbar-button:vertical:single-button:start:decrement,
      .shipments-table-container::-webkit-scrollbar-button:vertical:single-button:end:increment,
      .shipments-table-container::-webkit-scrollbar-button:horizontal:single-button:start:decrement,
      .shipments-table-container::-webkit-scrollbar-button:horizontal:single-button:end:increment {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
        background: transparent !important;
        -webkit-appearance: none !important;
        appearance: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
      }
      /* Show horizontal scrollbar when scrolling horizontally */
      .shipments-table-container.scrolling-horizontal::-webkit-scrollbar {
        height: 8px !important;
      }
      .shipments-table-container.scrolling-horizontal::-webkit-scrollbar-button {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
        background: transparent !important;
        -webkit-appearance: none !important;
        appearance: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
      }
      .shipments-table-container.scrolling-horizontal::-webkit-scrollbar-button:start:decrement,
      .shipments-table-container.scrolling-horizontal::-webkit-scrollbar-button:end:increment {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
        background: transparent !important;
        -webkit-appearance: none !important;
        appearance: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
      }
      /* Ensure table header stays sticky and doesn't collapse */
      .shipments-table-container thead {
        position: -webkit-sticky !important;
        position: sticky !important;
        top: 0 !important;
        z-index: 100 !important;
        background-color: #334155 !important;
        display: table-header-group !important;
        isolation: isolate !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .shipments-table-container thead tr {
        background-color: #334155 !important;
        position: -webkit-sticky !important;
        position: sticky !important;
        top: 0 !important;
        z-index: 100 !important;
      }
      .shipments-table-container thead th {
        background-color: #334155 !important;
        background-clip: padding-box !important;
        box-shadow: 0 2px 2px -1px rgba(0, 0, 0, 0.1) !important;
        white-space: nowrap !important;
        overflow: visible !important;
        position: -webkit-sticky !important;
        position: sticky !important;
        top: 0 !important;
        z-index: 100 !important;
      }
      .shipments-table-container thead tr {
        display: table-row !important;
      }
      /* Ensure table maintains structure and doesn't shift */
      .shipments-table-container table {
        width: 100% !important;
        min-width: max-content !important;
        border-collapse: separate !important;
        border-spacing: 0 !important;
        table-layout: auto !important;
        /* Prevent table from recalculating width when scrollbar appears */
        box-sizing: border-box !important;
        /* Ensure table width accounts for scrollbar from the start */
        max-width: 100% !important;
        position: relative !important;
      }
      /* Ensure thead stays fixed when scrolling - duplicate removed, using above definition */
      /* Force container to always reserve scrollbar space - ensure width is stable */
      .shipments-table-container {
        /* Container should maintain stable width */
        width: 100% !important;
        /* Ensure scrollbar gutter reserves space properly */
        scrollbar-gutter: stable both-edges !important;
        /* Always show scrollbar to reserve space */
        overflow-y: scroll !important;
      }
      /* Force scrollbar track to always be visible to prevent layout shift */
      .shipments-table-container::-webkit-scrollbar-track {
        background: ${isDarkMode ? '#1F2937' : '#F3F4F6'} !important;
        /* Ensure track always reserves space */
        -webkit-appearance: none !important;
        width: 8px !important;
      }
      /* Ensure tbody rows are below header */
      .shipments-table-container tbody {
        position: relative !important;
        z-index: 1 !important;
      }
      .shipments-table-container tbody tr {
        position: relative !important;
        z-index: 1 !important;
      }
    `;
  }, [isDarkMode]);


  // Handle scroll events to show/hide horizontal scrollbar and prevent layout shift
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Function to ensure scrollbar space is always reserved to prevent layout shift
    const ensureStableLayout = () => {
      // Force scrollbar to always be visible to reserve space
      container.style.overflowY = 'scroll';
      
      // Calculate current scrollbar width
      const currentScrollbarWidth = container.offsetWidth - container.clientWidth;
      setScrollbarWidth(currentScrollbarWidth || 8);
      
      // Always reserve 8px space to prevent layout shift
      // Use padding when scrollbar not visible, remove when visible
      // This ensures the table width doesn't change when scrollbar appears/disappears
      if (currentScrollbarWidth === 0 || currentScrollbarWidth < 8) {
        // No scrollbar visible or smaller than expected, reserve space with padding
        container.style.paddingRight = '8px';
      } else {
        // Scrollbar is visible and taking space, remove padding
        container.style.paddingRight = '0px';
      }
      
      // Force table to maintain width by using the container's clientWidth
      // This accounts for the scrollbar space already reserved
      const table = container.querySelector('table');
      if (table) {
        // Use clientWidth which excludes scrollbar, ensuring stable width
        const availableWidth = container.clientWidth;
        // Only set if it's different to avoid unnecessary reflows
        if (table.offsetWidth !== availableWidth) {
          table.style.width = `${availableWidth}px`;
        }
      }
    };

    const handleScroll = () => {
      const currentScrollLeft = container.scrollLeft;
      const hasHorizontalScroll = container.scrollWidth > container.clientWidth;
      
      // Check if horizontal scrolling occurred
      if (hasHorizontalScroll && currentScrollLeft !== lastScrollLeftRef.current) {
        setIsScrollingHorizontally(true);
        lastScrollLeftRef.current = currentScrollLeft;
      }
      
      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      // Hide horizontal scrollbar after scrolling stops (800ms delay)
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrollingHorizontally(false);
      }, 800);
    };

    // Ensure stable layout on mount and resize
    ensureStableLayout();
    const resizeObserver = new ResizeObserver(() => {
      ensureStableLayout();
    });
    resizeObserver.observe(container);

    // Also check after a short delay to catch any dynamic content changes
    const timeoutId = setTimeout(ensureStableLayout, 100);

    container.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
      clearTimeout(timeoutId);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);


  const isFilterActive = (key) => {
    const hasFilter = filters[key] !== undefined;
    const hasSorting = sortConfig.field === key && sortConfig.order !== '';
    return hasFilter || hasSorting || activeFilters.includes(key);
  };

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openFilterColumn !== null) {
        const filterIcon = filterIconRefs.current[openFilterColumn];
        const dropdown = filterDropdownRef.current;
        
        if (filterIcon && dropdown) {
          const isClickInsideIcon = filterIcon.contains(event.target);
          const isClickInsideDropdown = dropdown.contains(event.target);
          
          if (!isClickInsideIcon && !isClickInsideDropdown) {
            setOpenFilterColumn(null);
          }
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

  // Handle filter icon click
  const handleFilterClick = (columnKey, e) => {
    e.stopPropagation();
    setOpenFilterColumn(openFilterColumn === columnKey ? null : columnKey);
  };

  // Handle filter apply
  const handleApplyFilter = (filterConfig) => {
    // Prepare filter values to use for sorting (use new values from config if provided, otherwise current state)
    const filtersToUse = { ...filters };
    if (filterConfig.filterField && filterConfig.filterCondition && filterConfig.filterValue) {
      filtersToUse[filterConfig.filterField] = {
        condition: filterConfig.filterCondition,
        value: filterConfig.filterValue,
      };
    }
    
    // Update sort config
    if (filterConfig.sortField && filterConfig.sortOrder) {
      setSortConfig({ field: filterConfig.sortField, order: filterConfig.sortOrder });
      
      // Perform one-time sort and store the order
      let rowsToSort = [...shipments];
      
      // Apply filters
      Object.keys(filtersToUse).forEach(field => {
        const filter = filtersToUse[field];
        rowsToSort = rowsToSort.filter(row => {
          const value = row[field];
          const filterValue = filter.value.toLowerCase();
          const rowValue = String(value || '').toLowerCase();

          switch (filter.condition) {
            case 'equals':
              return rowValue === filterValue;
            case 'contains':
              return rowValue.includes(filterValue);
            case 'greaterThan':
              return rowValue > filterValue;
            case 'lessThan':
              return rowValue < filterValue;
            default:
              return true;
          }
        });
      });
      
      // Apply sorting
      rowsToSort.sort((a, b) => {
        // Special handling for date sorting
        if (filterConfig.sortField === 'shipmentDate' && a.shipmentDate && b.shipmentDate) {
          const aDate = new Date(a.shipmentDate);
          const bDate = new Date(b.shipmentDate);
          return filterConfig.sortOrder === 'asc' 
            ? aDate - bDate 
            : bDate - aDate;
        }
        
        const aVal = String(a[filterConfig.sortField] || '').toLowerCase();
        const bVal = String(b[filterConfig.sortField] || '').toLowerCase();
        
        if (filterConfig.sortOrder === 'asc') {
          return aVal.localeCompare(bVal);
        } else {
          return bVal.localeCompare(aVal);
        }
      });
      
      // Store the sorted order (array of IDs)
      setSortedRowOrder(rowsToSort.map(row => row.id));
    } else {
      // If no sort is being applied, clear the sorted order (filters changed, need to re-sort)
      setSortedRowOrder(null);
    }
    
    // Update filters
    if (filterConfig.filterField && filterConfig.filterCondition && filterConfig.filterValue) {
      setFilters(prev => ({
        ...prev,
        [filterConfig.filterField]: {
          condition: filterConfig.filterCondition,
          value: filterConfig.filterValue,
        }
      }));
      // If filters changed but sort wasn't reapplied, clear sorted order
      if (!filterConfig.sortField || !filterConfig.sortOrder) {
        setSortedRowOrder(null);
      }
    }
  };

  // Handle filter reset
  const handleResetFilter = () => {
    setSortConfig({ field: '', order: '' });
    setSortedRowOrder(null); // Clear stored sorted order
    setFilters({});
  };

  // Apply filters and sorting to rows
  const getFilteredAndSortedRows = () => {
    let filteredRows = [...shipments];

    // Apply filters
    Object.keys(filters).forEach(field => {
      const filter = filters[field];
      filteredRows = filteredRows.filter(row => {
        const value = row[field];
        const filterValue = filter.value.toLowerCase();
        const rowValue = String(value || '').toLowerCase();

        switch (filter.condition) {
          case 'equals':
            return rowValue === filterValue;
          case 'contains':
            return rowValue.includes(filterValue);
          case 'greaterThan':
            return rowValue > filterValue;
          case 'lessThan':
            return rowValue < filterValue;
          default:
            return true;
        }
      });
    });

    // Apply sorting - use stored sorted order if available (one-time sort)
    if (sortedRowOrder && sortedRowOrder.length > 0) {
      // Create a map for quick lookup
      const rowMap = new Map(filteredRows.map(row => [row.id, row]));
      
      // Order rows according to stored sorted order
      const orderedRows = [];
      const remainingRows = [];
      
      sortedRowOrder.forEach(id => {
        if (rowMap.has(id)) {
          orderedRows.push(rowMap.get(id));
          rowMap.delete(id);
        }
      });
      
      // Add any rows that weren't in the original sorted order (new rows)
      rowMap.forEach(row => {
        remainingRows.push(row);
      });
      
      // Sort remaining rows by default (newest first if has date, otherwise by ID)
      remainingRows.sort((a, b) => {
        if (a.shipmentDate && b.shipmentDate) {
          const aDate = new Date(a.shipmentDate);
          const bDate = new Date(b.shipmentDate);
          return bDate - aDate; // Newest first
        }
        return (b.id || 0) - (a.id || 0);
      });
      
      // Combine: sorted rows first, then new rows
      filteredRows = [...orderedRows, ...remainingRows];
    } else if (sortConfig.field && sortConfig.order) {
      // If sort config exists but no stored order, apply sorting (shouldn't happen normally, but fallback)
      filteredRows.sort((a, b) => {
        // Special handling for date sorting
        if (sortConfig.field === 'shipmentDate' && a.shipmentDate && b.shipmentDate) {
          const aDate = new Date(a.shipmentDate);
          const bDate = new Date(b.shipmentDate);
          return sortConfig.order === 'asc' 
            ? aDate - bDate 
            : bDate - aDate;
        }
        
        const aVal = String(a[sortConfig.field] || '').toLowerCase();
        const bVal = String(b[sortConfig.field] || '').toLowerCase();
        
        if (sortConfig.order === 'asc') {
          return aVal.localeCompare(bVal);
        } else {
          return bVal.localeCompare(aVal);
        }
      });
    } else {
      // Default sort by shipmentDate DESC (newest first) when no user sort is applied
      filteredRows.sort((a, b) => {
        if (a.shipmentDate && b.shipmentDate) {
          const aDate = new Date(a.shipmentDate);
          const bDate = new Date(b.shipmentDate);
          return bDate - aDate; // Newest first
        }
        // Fallback to ID if no timestamp
        return (b.id || 0) - (a.id || 0);
      });
    }

    return filteredRows;
  };

  const displayRows = getFilteredAndSortedRows();

  // Handle shipment row click to expand/collapse and fetch products
  const handleShipmentClick = async (shipmentId, e) => {
    // Don't expand if clicking on action button or filter icon
    if (e.target.closest('button[type="button"]') || e.target.closest('img[alt="Filter"]')) {
      return;
    }

    if (expandedShipmentId === shipmentId) {
      // Collapse
      setExpandedShipmentId(null);
    } else {
      // Expand and fetch products
      setExpandedShipmentId(shipmentId);
      
      // Only fetch if we don't have products cached
      if (!shipmentProducts[shipmentId]) {
        setLoadingProducts(true);
        try {
          const products = await getShipmentProducts(shipmentId);
          setShipmentProducts(prev => ({
            ...prev,
            [shipmentId]: products
          }));
        } catch (error) {
          console.error('Error fetching products:', error);
          setShipmentProducts(prev => ({
            ...prev,
            [shipmentId]: []
          }));
        } finally {
          setLoadingProducts(false);
        }
      }
    }
  };

  const columns = [
    { key: 'status', label: 'Status', width: 160, align: 'left' },
    { key: 'marketplace', label: 'Marketplace', width: 140, align: 'left' },
    { key: 'account', label: 'Account', width: 180, align: 'left' },
    { key: 'shipmentDate', label: 'Shipment #', width: 160, align: 'left' },
    { key: 'shipmentType', label: 'Shipment Type', width: 160, align: 'left' },
    { key: 'amznShipment', label: 'Amzn Shipment #', width: 200, align: 'left' },
    { key: 'amznRefId', label: 'Amzn Ref ID', width: 160, align: 'left' },
    { key: 'action', label: 'Action', width: 100, align: 'center' },
  ];

  return (
    <div
      ref={containerRef}
      className={`${themeClasses.cardBg} ${themeClasses.border} border rounded-xl shadow-sm shipments-table-container ${isScrollingHorizontally ? 'scrolling-horizontal' : ''}`}
      style={{ 
        position: 'relative',
        overflowY: 'scroll',
        overflowX: 'auto',
        maxHeight: '600px',
        width: '100%',
        minWidth: 0,
        scrollbarGutter: 'stable',
        boxSizing: 'border-box',
        // Padding will be dynamically set by JavaScript to always reserve 8px space
        // (padding when scrollbar not visible, removed when scrollbar is visible)
      }}
    >
      <table
        style={{
          width: '100%',
          minWidth: 'max-content',
          borderCollapse: 'separate',
          borderSpacing: 0,
          tableLayout: 'auto',
          position: 'relative',
        }}
      >
        <thead className={themeClasses.headerBg} style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backgroundColor: '#334155',
          display: 'table-header-group',
          isolation: 'isolate',
        }}>
          <tr style={{
            display: 'table-row',
            backgroundColor: '#334155',
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}>
            {columns.map((col, index) => (
              <th
                key={col.key}
                className={`${
                  col.align === 'right'
                    ? 'text-right'
                    : col.align === 'center'
                    ? 'text-center'
                    : 'text-left'
                } text-xs font-bold text-white uppercase tracking-wider group cursor-pointer`}
                style={{
                  padding: '0.75rem 1rem',
                  width: `${col.width}px`,
                  minWidth: `${col.width}px`,
                  maxWidth: `${col.width}px`,
                  backgroundColor: '#334155',
                  position: 'sticky',
                  top: 0,
                  zIndex: 100,
                  borderRight:
                    index < columns.length - 1 ? `1px solid ${columnBorderColor}` : undefined,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent:
                      col.align === 'right'
                        ? 'flex-end'
                        : col.align === 'center'
                        ? 'center'
                        : 'space-between',
                    gap: '0.5rem',
                  }}
                >
                  <span
                    style={{
                      color: (isFilterActive(col.key) || openFilterColumn === col.key) ? '#3B82F6' : '#FFFFFF',
                    }}
                  >
                    {col.label}
                  </span>
                  {col.key !== 'action' && (
                    <img
                      ref={(el) => { if (el) filterIconRefs.current[col.key] = el; }}
                      src="/assets/Vector (1).png"
                      alt="Filter"
                      className={`w-3 h-3 transition-opacity cursor-pointer ${
                        (isFilterActive(col.key) || openFilterColumn === col.key)
                          ? 'opacity-100'
                          : 'opacity-0 group-hover:opacity-100'
                      }`}
                      onClick={(e) => handleFilterClick(col.key, e)}
                      style={
                        (isFilterActive(col.key) || openFilterColumn === col.key)
                          ? {
                              filter:
                                'invert(29%) sepia(94%) saturate(2576%) hue-rotate(199deg) brightness(102%) contrast(105%)',
                            }
                          : undefined
                      }
                    />
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody
          className="divide-y"
          style={{ borderColor: isDarkMode ? 'rgba(75, 85, 99, 0.3)' : '#f3f4f6' }}
        >
          {displayRows.map((row) => {
            const hasComment = row.formulaCheckComment || row.labelCheckComment;
            const statusColor = hasComment ? '#F59E0B' : (row.statusColor || '#10B981');

            const isExpanded = expandedShipmentId === row.id;
            const products = shipmentProducts[row.id] || [];

            return (
            <React.Fragment key={row.id}>
            <tr
              className={`${themeClasses.rowHover} transition-colors duration-150`}
              onClick={(e) => handleShipmentClick(row.id, e)}
              style={{ cursor: 'pointer' }}
            >
              {/* Status with badge and chevron */}
              <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle', borderTop: '1px solid #E5E7EB' }}>
                <button
                  type="button"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                    padding: '0.35rem 0.9rem',
                    borderRadius: '9999px',
                    border: `1px solid ${isDarkMode ? '#1F2937' : '#E5E7EB'}`,
                    backgroundColor: isDarkMode ? '#020617' : '#FFFFFF',
                    boxShadow: isDarkMode
                      ? '0 1px 2px rgba(0,0,0,0.6)'
                      : '0 1px 2px rgba(15,23,42,0.08)',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    color: isDarkMode ? '#F9FAFB' : '#151515',
                    minWidth: '170px',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    {/* Status icon */}
                    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                    <svg
                      style={{ width: '1rem', height: '1rem' }}
                        viewBox="0 0 24 24"
                        fill={statusColor}
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <circle cx="12" cy="12" r="8" fill={statusColor} />
                      </svg>
                      {hasComment && (
                        <svg
                          style={{ width: '0.65rem', height: '0.65rem', position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                            d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"
                            stroke="#FFFFFF"
                            strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                      )}
                    </div>
                    <span>{row.status}</span>
                  </span>
                  {/* Chevron */}
                  <svg
                    style={{ 
                      width: '0.85rem', 
                      height: '0.85rem',
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s'
                    }}
                    fill="none"
                    stroke={isDarkMode ? '#9CA3AF' : '#9CA3AF'}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
              </td>
              <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle', borderTop: '1px solid #E5E7EB' }}>
                <span className={themeClasses.textSecondary} style={{ fontSize: '0.875rem', color: isDarkMode ? '#FFFFFF' : '#151515' }}>
                  {row.marketplace}
                </span>
              </td>
              <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle', borderTop: '1px solid #E5E7EB' }}>
                <span className={themeClasses.textSecondary} style={{ fontSize: '0.875rem', color: isDarkMode ? '#FFFFFF' : '#151515' }}>
                  {row.account}
                </span>
              </td>
              <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle', borderTop: '1px solid #E5E7EB' }}>
                <span className={themeClasses.textSecondary} style={{ fontSize: '0.875rem', color: isDarkMode ? '#FFFFFF' : '#151515' }}>
                  {row.shipmentDate}
                </span>
              </td>
              <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle', borderTop: '1px solid #E5E7EB' }}>
                <span className={themeClasses.textSecondary} style={{ fontSize: '0.875rem', color: isDarkMode ? '#FFFFFF' : '#151515' }}>
                  {row.shipmentType}
                </span>
              </td>
              <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle', borderTop: '1px solid #E5E7EB' }}>
                <span className={themeClasses.textSecondary} style={{ fontSize: '0.875rem', color: isDarkMode ? '#FFFFFF' : '#151515' }}>
                  {row.amznShipment}
                </span>
              </td>
              <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle', borderTop: '1px solid #E5E7EB' }}>
                <span className={themeClasses.textSecondary} style={{ fontSize: '0.875rem', color: isDarkMode ? '#FFFFFF' : '#151515' }}>
                  {row.amznRefId}
                </span>
              </td>
              <td
                style={{
                  padding: '0.75rem 1rem',
                  verticalAlign: 'middle',
                  textAlign: 'center',
                  borderTop: '1px solid #E5E7EB',
                }}
              >
                <button
                  type="button"
                  className="hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '28px',
                    height: '28px',
                    borderRadius: '9999px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <img
                    src="/assets/Icons.png"
                    alt="Actions"
                    style={{ width: '1rem', height: '1rem', objectFit: 'contain' }}
                  />
                </button>
              </td>
            </tr>
            
            {/* Non-table mode products display */}
            {isExpanded && (
              <tr>
                <td colSpan={columns.length} style={{ padding: 0, borderTop: 'none' }}>
                  <div
                    style={{
                      backgroundColor: isDarkMode ? '#0F172A' : '#F9FAFB',
                      padding: '24px',
                      borderTop: `1px solid ${isDarkMode ? '#1E293B' : '#E5E7EB'}`,
                    }}
                  >
                    {loadingProducts ? (
                      <div style={{ textAlign: 'center', padding: '2rem', color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>
                        Loading products...
                      </div>
                    ) : products.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '2rem', color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>
                        No products found for this shipment
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {/* Products Header */}
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 140px 220px 140px',
                            padding: '12px 16px',
                            borderBottom: `1px solid ${isDarkMode ? '#1E293B' : '#E5E7EB'}`,
                            marginBottom: '8px',
                          }}
                        >
                          <div style={{ fontSize: '12px', fontWeight: 600, color: isDarkMode ? '#9CA3AF' : '#6B7280', textTransform: 'uppercase', marginLeft: '20px' }}>
                            Products
                          </div>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: isDarkMode ? '#9CA3AF' : '#6B7280', textTransform: 'uppercase', textAlign: 'center', paddingLeft: '16px', marginLeft: '-220px', marginRight: '20px' }}>
                            Inventory
                          </div>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: isDarkMode ? '#9CA3AF' : '#6B7280', textTransform: 'uppercase', textAlign: 'center', paddingLeft: '16px', marginLeft: '-220px', marginRight: '20px' }}>
                            Quantity
                          </div>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: isDarkMode ? '#9CA3AF' : '#6B7280', textTransform: 'uppercase', textAlign: 'center', paddingLeft: '16px', marginLeft: '-220px', marginRight: '20px' }}>
                            Status
                          </div>
                        </div>

                        {/* Products List */}
                        {products.map((product, index) => {
                          const asin = product.asin || product.child_asin || product.childAsin || '';
                          return (
                            <div
                              key={product.id || index}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 140px 220px 140px',
                                height: '66px',
                                padding: '8px 16px',
                                backgroundColor: isDarkMode ? '#1A2235' : '#FFFFFF',
                                alignItems: 'center',
                                gap: '32px',
                                boxSizing: 'border-box',
                                position: 'relative',
                                borderBottom: `1px solid ${isDarkMode ? '#1E293B' : '#E5E7EB'}`,
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
                                {/* Product Icon */}
                                <div style={{ width: '36px', height: '36px', minWidth: '36px', borderRadius: '3px', overflow: 'hidden', backgroundColor: isDarkMode ? '#374151' : '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: '20px' }}>
                                  {product.imageUrl || product.smallImage || product.image ? (
                                    <img 
                                      src={product.imageUrl || product.smallImage || product.image} 
                                      alt={product.product || product.name} 
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                      onError={(e) => { 
                                        e.target.style.display = 'none'; 
                                        if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex'; 
                                      }} 
                                    />
                                  ) : null}
                                  <div style={{ display: product.imageUrl || product.smallImage || product.image ? 'none' : 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', borderRadius: '3px', gap: '7.5px', color: isDarkMode ? '#6B7280' : '#9CA3AF', fontSize: '12px' }}>
                                    No img
                                  </div>
                                </div>
                                
                                {/* Product Info */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
                                  {/* Product Name */}
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
                                    {product.product || product.name || 'N/A'}
                                  </span>
                                  
                                  {/* Product ID and Brand/Size on same line */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
                                    {/* Product ID */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span style={{ fontSize: '12px', color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>
                                        {asin || 'N/A'}
                                      </span>
                                    </div>
                                    
                                    {/* Brand and Size */}
                                    <span style={{ fontSize: '12px', color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>
                                      {product.brand || 'N/A'} • {product.size || 'N/A'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* INVENTORY Column */}
                              <div style={{ textAlign: 'center', fontSize: '14px', fontWeight: 500, color: isDarkMode ? '#F9FAFB' : '#111827', paddingLeft: '16px', marginLeft: '-220px', marginRight: '20px' }}>
                                {(product.fbaAvailable || product.inventory || 0).toLocaleString()}
                              </div>

                              {/* QUANTITY Column */}
                              <div style={{ textAlign: 'center', fontSize: '14px', fontWeight: 500, color: isDarkMode ? '#F9FAFB' : '#111827', paddingLeft: '16px', marginLeft: '-220px', marginRight: '20px' }}>
                                {product.quantity || product.qty || 0}
                              </div>

                              {/* STATUS Column */}
                              <div style={{ textAlign: 'center', fontSize: '14px', fontWeight: 500, color: isDarkMode ? '#F9FAFB' : '#111827', paddingLeft: '16px', marginLeft: '-220px', marginRight: '20px' }}>
                                {product.status || 'N/A'}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            )}
            </React.Fragment>
            );
          })}
        </tbody>
      </table>
      
      {/* Filter Dropdown */}
      {openFilterColumn && (
        <FilterDropdown
          ref={filterDropdownRef}
          columnKey={openFilterColumn}
          filterIconRef={filterIconRefs.current[openFilterColumn]}
          onClose={() => setOpenFilterColumn(null)}
          onApply={handleApplyFilter}
          onReset={handleResetFilter}
          currentSort={sortConfig}
          currentFilters={filters}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  );
};

// FilterDropdown Component
const FilterDropdown = React.forwardRef(({ columnKey, filterIconRef, onClose, onApply, onReset, currentSort, currentFilters, isDarkMode }, ref) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [sortField, setSortField] = useState(currentSort?.field || '');
  const [sortOrder, setSortOrder] = useState(currentSort?.order || '');
  
  // Initialize filter fields from current filters if they exist
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
      const applyData = {
        sortField,
        sortOrder,
        filterField,
        filterCondition,
        filterValue,
      };
      onApply(applyData);
    }
    onClose();
  };

  const sortFields = [
    { value: 'status', label: 'Status' },
    { value: 'marketplace', label: 'Marketplace' },
    { value: 'account', label: 'Account' },
    { value: 'shipmentDate', label: 'Shipment #' },
    { value: 'shipmentType', label: 'Shipment Type' },
    { value: 'amznShipment', label: 'Amzn Shipment #' },
    { value: 'amznRefId', label: 'Amzn Ref ID' },
  ];

  const sortOrders = [
    { value: 'asc', label: 'Sort ascending (A to Z)', icon: 'A^Z' },
    { value: 'desc', label: 'Sort descending (Z to A)', icon: 'Z^A' },
  ];

  const filterFields = [
    { value: '', label: 'Select field' },
    { value: 'status', label: 'Status' },
    { value: 'marketplace', label: 'Marketplace' },
    { value: 'account', label: 'Account' },
    { value: 'shipmentDate', label: 'Shipment #' },
    { value: 'shipmentType', label: 'Shipment Type' },
    { value: 'amznShipment', label: 'Amzn Shipment #' },
    { value: 'amznRefId', label: 'Amzn Ref ID' },
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

export default ShipmentsTable;

