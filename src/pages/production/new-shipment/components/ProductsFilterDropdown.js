import React, { 
  useEffect, 
  useState, 
  forwardRef, 
  useRef, 
  useImperativeHandle, 
  useMemo 
} from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../../../context/ThemeContext';

const ProductsFilterDropdown = forwardRef(({ 
  filterIconRef, 
  columnKey = 'product',
  availableValues = [], 
  currentFilter = {},
  currentSort = '',
  currentSortByFba = '', // When columnKey is doiDays: 'asc' | 'desc' if sorted by FBA
  onApply,
  onClose,
  account = null, // Account name to determine which brands to show
}, ref) => {
  const { isDarkMode } = useTheme();

  const theme = {
    bg: isDarkMode ? '#111827' : '#FFFFFF',
    border: isDarkMode ? '#374151' : '#E5E7EB',
    shadow: isDarkMode
      ? '0 18px 45px rgba(0, 0, 0, 0.85)'
      : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    headerText: isDarkMode ? '#E5E7EB' : '#111827',
    subtleText: isDarkMode ? '#9CA3AF' : '#6B7280',
    iconSubtle: isDarkMode ? '#9CA3AF' : '#9CA3AF',
    sectionBorder: isDarkMode ? '#374151' : '#E5E7EB',
    inputBg: isDarkMode ? '#111827' : '#FFFFFF',
    inputBorder: isDarkMode ? '#4B5563' : '#E5E7EB',
    inputText: isDarkMode ? '#E5E7EB' : '#111827',
    chipBgActive: '#3B82F6',
    chipBg: isDarkMode ? '#4B5563' : '#E5E7EB',
    chipTextActive: '#FFFFFF',
    chipText: isDarkMode ? '#E5E7EB' : '#6B7280',
    hoverRow: isDarkMode ? '#1F2937' : '#F9FAFB',
    valueText: isDarkMode ? '#E5E7EB' : '#374151',
    resetBg: isDarkMode ? '#111827' : '#FFFFFF',
    resetBgHover: isDarkMode ? '#1F2937' : '#F9FAFB',
    resetBorder: isDarkMode ? '#4B5563' : '#E5E7EB',
    resetText: isDarkMode ? '#E5E7EB' : '#374151',
    footerBorder: isDarkMode ? '#374151' : '#E5E7EB',
  };

  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [isPositioned, setIsPositioned] = useState(false);
  const [sortOrder, setSortOrder] = useState('');
  const [filterConditionExpanded, setFilterConditionExpanded] = useState(false);
  const [filterValuesExpanded, setFilterValuesExpanded] = useState(false); // Collapsed by default to save space
  const [brandFilterExpanded, setBrandFilterExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [brandSearchTerm, setBrandSearchTerm] = useState('');
  const hasInitializedRef = useRef(false);
  
  // Initialize with all available values checked (unless there's an existing filter)
  const [selectedValues, setSelectedValues] = useState(() => {
    if (currentFilter.selectedValues && currentFilter.selectedValues.size > 0) {
      return new Set(currentFilter.selectedValues);
    }
    const allValues = availableValues.map(v => String(v));
    return new Set(allValues);
  });
  
  // Brand filter state (only for product column) - Brands based on account
  const [selectedBrands, setSelectedBrands] = useState(() => {
    if (columnKey === 'product') {
      // Account to Brand mapping
      const ACCOUNT_BRAND_MAPPING = {
        'TPS Nutrients': ['TPS Nutrients', 'Bloom City', 'TPS Plant Foods'],
        'The Plant Shoppe, LLC': ['TPS Nutrients', 'TPS Plant Foods', 'Bloom City'],
        'Total Pest Supply': ['NatureStop', "Ms. Pixie's", "Burke's", 'Mint +'],
      };
      
      const allowedBrands = account && ACCOUNT_BRAND_MAPPING[account] 
        ? ACCOUNT_BRAND_MAPPING[account]
        : ACCOUNT_BRAND_MAPPING['TPS Nutrients'];
      
      if (currentFilter.selectedBrands && currentFilter.selectedBrands.size > 0) {
        // Filter to only include allowed brands for this account
        const filteredBrands = Array.from(currentFilter.selectedBrands).filter(b => allowedBrands.includes(b));
        // If all allowed brands are in the filter, treat it as no filter (all brands selected)
        const allBrandsSelected = filteredBrands.length === allowedBrands.length &&
          allowedBrands.every(brand => filteredBrands.includes(brand));
        // If all brands are selected, return all brands (no filter)
        // Otherwise return the filtered brands
        return allBrandsSelected ? new Set(allowedBrands) : new Set(filteredBrands);
      }
      return new Set(allowedBrands);
    }
    return new Set();
  });
  
  // Extract unique brands (only for product column) - Show brands based on account
  // Always show all allowed brands for the account, even if they don't have products in the current view
  // This ensures brands remain visible in the dropdown even when unchecked
  const availableBrands = useMemo(() => {
    if (columnKey !== 'product') return [];
    
    // Account to Brand mapping
    const ACCOUNT_BRAND_MAPPING = {
      'TPS Nutrients': ['TPS Nutrients', 'Bloom City', 'TPS Plant Foods'],
      'Total Pest Supply': ['NatureStop', "Ms. Pixie's", "Burke's", 'Mint +'],
    };
    
    // Get brands for the account, or default to TPS Nutrients brands
    const allowedBrands = account && ACCOUNT_BRAND_MAPPING[account] 
      ? ACCOUNT_BRAND_MAPPING[account]
      : ACCOUNT_BRAND_MAPPING['TPS Nutrients'];
    
    // Always return all allowed brands for the account, sorted
    // This ensures brands remain visible in the dropdown even when unchecked
    const sortedBrands = [...allowedBrands].sort();
    console.log('Available brands for account:', sortedBrands, 'account:', account);
    return sortedBrands;
  }, [columnKey, account]);
  
  const filteredBrands = availableBrands.filter(brand =>
    brand.toLowerCase().includes(brandSearchTerm.toLowerCase())
  );
  
  // Calculate product counts per brand
  const brandCounts = useMemo(() => {
    const counts = {};
    availableBrands.forEach(brand => {
      const normalizeBrand = (str) => str.replace(/\s*\+\s*/g, '+').replace(/\s+/g, ' ').trim().toLowerCase();
      const normalizedBrand = normalizeBrand(brand);
      counts[brand] = availableValues.filter(value => {
        const valueStr = String(value);
        const normalizedValue = normalizeBrand(valueStr);
        return normalizedValue === normalizedBrand || 
               normalizedValue.includes(normalizedBrand) || 
               normalizedBrand.includes(normalizedValue);
      }).length;
    });
    return counts;
  }, [availableBrands, availableValues]);
  
  // Update selectedValues when dropdown opens
  useEffect(() => {
    if (filterIconRef) {
      const existingFilterValues = currentFilter.selectedValues;
      const hasFilter = existingFilterValues && 
        (existingFilterValues instanceof Set ? existingFilterValues.size > 0 : 
         Array.isArray(existingFilterValues) ? existingFilterValues.length > 0 :
         false);
      
      if (hasFilter) {
        const filterValues = existingFilterValues instanceof Set 
          ? Array.from(existingFilterValues)
          : existingFilterValues;
        setSelectedValues(new Set(filterValues));
      } else if (!hasInitializedRef.current) {
        const allValues = availableValues.map(v => String(v));
        setSelectedValues(new Set(allValues));
        hasInitializedRef.current = true;
      }
    } else {
      hasInitializedRef.current = false;
    }
  }, [filterIconRef, currentFilter.selectedValues, availableValues]);
  
  // Update selectedBrands when dropdown opens (only for product column)
  useEffect(() => {
    if (filterIconRef && columnKey === 'product') {
      // Account to Brand mapping
      const ACCOUNT_BRAND_MAPPING = {
        'TPS Nutrients': ['TPS Nutrients', 'Bloom City', 'TPS Plant Foods'],
        'The Plant Shoppe, LLC': ['TPS Nutrients', 'TPS Plant Foods', 'Bloom City'],
        'Total Pest Supply': ['NatureStop', "Ms. Pixie's", "Burke's", 'Mint +'],
      };
      
      const allowedBrands = account && ACCOUNT_BRAND_MAPPING[account] 
        ? ACCOUNT_BRAND_MAPPING[account]
        : ACCOUNT_BRAND_MAPPING['TPS Nutrients'];
      
      const existingBrands = currentFilter.selectedBrands;
      if (existingBrands && existingBrands instanceof Set && existingBrands.size > 0) {
        // Filter to only include allowed brands for this account
        const filteredBrands = Array.from(existingBrands).filter(b => allowedBrands.includes(b));
        // If all allowed brands are in the filter, treat it as no filter (all brands selected)
        const allBrandsSelected = filteredBrands.length === allowedBrands.length &&
          allowedBrands.every(brand => filteredBrands.includes(brand));
        // If all brands are selected, set to all brands (no filter)
        // Otherwise use the filtered brands
        setSelectedBrands(new Set(allBrandsSelected ? allowedBrands : (filteredBrands.length > 0 ? filteredBrands : allowedBrands)));
      } else if (!hasInitializedRef.current) {
        setSelectedBrands(new Set(availableBrands));
      }
    }
  }, [filterIconRef, columnKey, currentFilter.selectedBrands, availableBrands, account]);
  
  // Condition filter state
  const [conditionType, setConditionType] = useState(currentFilter.conditionType || '');
  const [conditionValue, setConditionValue] = useState(currentFilter.conditionValue || '');
  const [conditionMenuOpen, setConditionMenuOpen] = useState(false);
  // Popular Filters (DOI only): section expanded + dropdown open
  const [popularFilterExpanded, setPopularFilterExpanded] = useState(true);
  const [popularFilterMenuOpen, setPopularFilterMenuOpen] = useState(false);
  
  // Convert values to strings for filtering
  const stringValues = availableValues.map(v => String(v));
  
  const filteredValues = stringValues.filter(value =>
    value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    if (filterIconRef) {
      const rect = filterIconRef.getBoundingClientRect();
      const dropdownWidth = 204;
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
      if (left < 16) left = 16;
      if (top < 16) top = 16;

      setPosition({ top, left });
      requestAnimationFrame(() => {
        setIsPositioned(true);
      });
    } else {
      setIsPositioned(false);
    }
  }, [filterIconRef]);

  const handleSelectAll = () => {
    setSelectedValues(new Set(filteredValues));
  };

  const handleClearAll = () => {
    setSelectedValues(new Set());
  };

  const handleToggleValue = (value) => {
    setSelectedValues(prev => {
      const newSet = new Set(prev);
      if (newSet.has(value)) {
        newSet.delete(value);
      } else {
        newSet.add(value);
      }
      return newSet;
    });
  };

  const handleSelectAllBrands = () => {
    setSelectedBrands(new Set(filteredBrands));
  };

  const handleClearAllBrands = () => {
    setSelectedBrands(new Set());
  };

  const handleToggleBrand = (brand) => {
    setSelectedBrands(prev => {
      const newSet = new Set(prev);
      if (newSet.has(brand)) {
        newSet.delete(brand);
      } else {
        newSet.add(brand);
      }
      return newSet;
    });
  };

  const handleReset = () => {
    console.log('[ProductsFilterDropdown] Reset clicked for column:', columnKey);
    setSortOrder('');
    setSearchTerm('');
    setBrandSearchTerm('');
    const allValues = availableValues.map(v => String(v));
    setSelectedValues(new Set(allValues));
    if (columnKey === 'product') {
      setSelectedBrands(new Set(availableBrands));
    }
    setConditionType('');
    setConditionValue('');
    if (onApply) {
      console.log('[ProductsFilterDropdown] Calling onApply(null)');
      onApply(null);
    }
    // Close dropdown after reset
    onClose?.();
  };

  const handleApply = () => {
    if (onApply) {
      const filterData = {
        sortOrder,
        selectedValues,
        conditionType,
        conditionValue,
      };
      // Add brand filter only for product column
      if (columnKey === 'product') {
        // Only apply brand filter if not all brands are selected (active filter)
        // If all brands are selected, it's the same as no filter, so pass null
        const allBrandsSelected = selectedBrands.size === availableBrands.length &&
          availableBrands.every(brand => selectedBrands.has(brand));
        filterData.selectedBrands = allBrandsSelected ? null : selectedBrands;
      }
      onApply(filterData);
    }
    onClose?.();
  };

  const dropdownRef = useRef(null);
  useImperativeHandle(ref, () => dropdownRef.current, []);

  // Check if column is numeric
  const isNumericColumn = columnKey === 'fbaAvailable' || columnKey === 'unitsToMake' || columnKey === 'doiDays';

  // Universal conditions
  const conditions = [
    { value: '', label: 'None' },
    { value: 'greaterThan', label: 'Greater than' },
    { value: 'greaterOrEqual', label: 'Greater than or equal to' },
    { value: 'lessThan', label: 'Less than' },
    { value: 'lessOrEqual', label: 'Less than or equal to' },
    { value: 'equals', label: 'Is equal to' },
    { value: 'notEquals', label: 'Is not equal to' },
    { value: 'between', label: 'Is between' },
    { value: 'notBetween', label: 'Is not between' },
  ];

  return createPortal(
      <div
        ref={dropdownRef}
        data-filter-dropdown={columnKey}
        style={{
          position: 'fixed',
          top: `${position.top}px`,
          left: `${position.left}px`,
          width: '204px',
          backgroundColor: theme.bg,
          borderRadius: '8px',
          boxShadow: theme.shadow,
          border: `1px solid ${theme.border}`,
          zIndex: 10000,
          overflow: 'visible',
          opacity: isPositioned ? 1 : 0,
          transition: 'opacity 0.15s ease-in',
        }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
      <style>{`
        .tps-filter-scroll {
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* IE 10+ */
        }
        .tps-filter-scroll::-webkit-scrollbar {
          display: none; /* Chrome, Safari */
        }
      `}</style>
      {/* Popular Filters (Inventory column) – dropdown like Filter by condition */}
      {columnKey === 'fbaAvailable' && (
        <div style={{ borderBottom: `1px solid ${theme.border}` }}>
          <div
            onClick={() => setPopularFilterExpanded(!popularFilterExpanded)}
            style={{
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <span style={{ fontSize: '12px', color: currentFilter.popularFilter ? '#3B82F6' : theme.subtleText, fontWeight: currentFilter.popularFilter ? 500 : 400 }}>
              Popular Filters: {currentFilter.popularFilter && <span style={{ color: '#10B981' }}>●</span>}
            </span>
            <svg
              width="10"
              height="10"
              viewBox="0 0 12 12"
              fill="none"
              style={{
                transform: popularFilterExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
              }}
            >
              <path
                d="M3 4.5L6 7.5L9 4.5"
                stroke={theme.subtleText}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          {popularFilterExpanded && (
            <div style={{ padding: '0 12px 8px 12px' }}>
              <div style={{ position: 'relative', marginBottom: '4px' }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPopularFilterMenuOpen(!popularFilterMenuOpen);
                  }}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: `1px solid ${theme.inputBorder}`,
                    backgroundColor: theme.inputBg,
                    color: theme.inputText,
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {currentFilter.popularFilter === 'soldOut'
                      ? 'Sold Out'
                      : currentFilter.popularFilter === 'noSalesHistory'
                        ? 'No Sales History'
                        : currentFilter.popularFilter === 'bestSellers'
                          ? 'Best Sellers'
                          : 'None'}
                  </span>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    style={{
                      flexShrink: 0,
                      transform: popularFilterMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.15s ease-out',
                    }}
                  >
                    <path
                      d="M3 4.5L6 7.5L9 4.5"
                      stroke={theme.subtleText}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                {popularFilterMenuOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: '4px',
                      backgroundColor: theme.bg,
                      borderRadius: '10px',
                      border: `1px solid ${theme.border}`,
                      boxShadow: theme.shadow,
                      padding: '4px 0',
                      zIndex: 10001,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {[
                      { id: null, label: 'None' },
                      { id: 'soldOut', label: 'Sold Out' },
                      { id: 'noSalesHistory', label: 'No Sales History' },
                      { id: 'bestSellers', label: 'Best Sellers' },
                    ].map(({ id, label }) => {
                      const selected = currentFilter.popularFilter === id;
                      return (
                        <button
                          key={id ?? 'none'}
                          type="button"
                          onClick={() => {
                            setPopularFilterMenuOpen(false);
                            if (onApply) {
                              const filterData = {
                                selectedValues,
                                conditionType,
                                conditionValue,
                                popularFilter: id,
                                __fromSortClick: true,
                              };
                              if (id === 'bestSellers') {
                                filterData.sortOrder = 'desc';
                                filterData.sortField = 'sales7Day';
                              } else if (id === 'noSalesHistory' || id === 'soldOut') {
                                // Sort by product A–Z so the filtered list has a visible order
                                filterData.sortOrder = 'asc';
                                filterData.sortField = 'product';
                              }
                              onApply(filterData);
                              // Close after a short delay so the list can update first (Popular Filters use flushSync in parent)
                              setTimeout(() => onClose?.(), 50);
                            } else {
                              onClose?.();
                            }
                          }}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            padding: '6px 10px',
                            backgroundColor: selected ? 'rgba(59,130,246,0.15)' : 'transparent',
                            color: selected ? '#FFFFFF' : theme.valueText,
                            fontSize: '12px',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                          onMouseEnter={(e) => {
                            if (!selected) e.currentTarget.style.backgroundColor = theme.hoverRow;
                          }}
                          onMouseLeave={(e) => {
                            if (!selected) e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div style={{ fontSize: '10px', color: theme.subtleText, fontStyle: 'italic' }}>
                Best Sellers: sort by prior week units sold (high to low)
              </div>
            </div>
          )}
        </div>
      )}
      {/* Sort Options */}
      <div style={{ padding: '8px 12px', borderBottom: `1px solid ${theme.border}` }}>
        {columnKey === 'doiDays' && (
          <div style={{ fontSize: '10px', fontWeight: 600, color: theme.subtleText, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
            Sort by Total Inventory
          </div>
        )}
        {/* Sort Ascending */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            const newOrder = 'asc';
            if (onApply) {
              const sortData = {
                sortOrder: newOrder,
                sortField: columnKey,
                selectedValues,
                conditionType,
                conditionValue,
                __fromSortClick: true,
              };
              if (columnKey === 'product') {
                sortData.selectedBrands = selectedBrands;
              }
              onApply(sortData);
            }
            setSortOrder('');
            onClose?.();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px',
            cursor: 'pointer',
            borderRadius: '4px',
            backgroundColor: 'transparent',
            marginBottom: '6px',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.hoverRow;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <div
            style={{
              width: '17px',
              height: '17px',
              borderRadius: '3px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <img src="/assets/High to Low.png" alt="Low to High" style={{ width: '17px', height: '17px', objectFit: 'contain', imageRendering: 'crisp-edges', ...(isDarkMode ? { filter: 'invert(1) brightness(1.05)' } : {}) }} />
          </div>
          <div style={{ fontSize: '12px', color: theme.headerText, fontWeight: 400, lineHeight: '1.3' }}>
            Low to High
          </div>
        </div>

        {/* Sort Descending */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            const newOrder = 'desc';
            if (onApply) {
              const sortData = {
                sortOrder: newOrder,
                sortField: columnKey,
                selectedValues,
                conditionType,
                conditionValue,
                __fromSortClick: true,
              };
              if (columnKey === 'product') {
                sortData.selectedBrands = selectedBrands;
              }
              onApply(sortData);
            }
            setSortOrder('');
            onClose?.();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px',
            cursor: 'pointer',
            borderRadius: '4px',
            backgroundColor: 'transparent',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.hoverRow;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <div
            style={{
              width: '17px',
              height: '17px',
              borderRadius: '3px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <img src="/assets/Low to High.png" alt="High to Low" style={{ width: '17px', height: '17px', objectFit: 'contain', imageRendering: 'crisp-edges', ...(isDarkMode ? { filter: 'invert(1) brightness(1.05)' } : {}) }} />
          </div>
          <div style={{ fontSize: '12px', color: theme.headerText, fontWeight: 400, lineHeight: '1.3' }}>
            High to Low
          </div>
        </div>

        {/* Sort by FBA (only for DAYS OF INVENTORY column) */}
        {columnKey === 'doiDays' && (
          <>
            <div style={{ borderTop: `1px solid ${theme.sectionBorder}`, marginTop: '6px', paddingTop: '6px' }}>
              <span style={{ fontSize: '10px', fontWeight: 600, color: theme.subtleText, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sort by FBA Inventory</span>
            </div>
            <div
              onClick={(e) => {
                e.stopPropagation();
                if (onApply) {
                  const sortData = {
                    sortOrder: 'asc',
                    sortField: 'fbaAvailable',
                    selectedValues,
                    conditionType,
                    conditionValue,
                    __fromSortClick: true,
                  };
                  onApply(sortData);
                }
                setSortOrder('');
                onClose?.();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px',
                cursor: 'pointer',
                borderRadius: '4px',
                backgroundColor: 'transparent',
                marginTop: '4px',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme.hoverRow; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <div
                style={{
                  width: '17px',
                  height: '17px',
                  borderRadius: '3px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <img src="/assets/High to Low.png" alt="FBA Low to High" style={{ width: '17px', height: '17px', objectFit: 'contain', imageRendering: 'crisp-edges', ...(isDarkMode ? { filter: 'invert(1) brightness(1.05)' } : {}) }} />
              </div>
              <div style={{ fontSize: '12px', color: theme.headerText, fontWeight: 400, lineHeight: '1.3' }}>
                FBA Low to High
              </div>
            </div>
            <div
              onClick={(e) => {
                e.stopPropagation();
                if (onApply) {
                  const sortData = {
                    sortOrder: 'desc',
                    sortField: 'fbaAvailable',
                    selectedValues,
                    conditionType,
                    conditionValue,
                    __fromSortClick: true,
                  };
                  onApply(sortData);
                }
                setSortOrder('');
                onClose?.();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px',
                cursor: 'pointer',
                borderRadius: '4px',
                backgroundColor: 'transparent',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme.hoverRow; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <div
                style={{
                  width: '17px',
                  height: '17px',
                  borderRadius: '3px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <img src="/assets/Low to High.png" alt="FBA High to Low" style={{ width: '17px', height: '17px', objectFit: 'contain', imageRendering: 'crisp-edges', ...(isDarkMode ? { filter: 'invert(1) brightness(1.05)' } : {}) }} />
              </div>
              <div style={{ fontSize: '12px', color: theme.headerText, fontWeight: 400, lineHeight: '1.3' }}>
                FBA High to Low
              </div>
            </div>
          </>
        )}
      </div>

      {/* Filter by condition */}
      <div style={{ borderBottom: `1px solid ${theme.border}` }}>
        <div
          onClick={() => setFilterConditionExpanded(!filterConditionExpanded)}
          style={{
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <span style={{ fontSize: '12px', color: conditionType ? '#3B82F6' : theme.subtleText, fontWeight: conditionType ? 500 : 400 }}>
            Filter by condition: {conditionType && <span style={{ color: '#10B981' }}>●</span>}
          </span>
          <svg
            width="10"
            height="10"
            viewBox="0 0 12 12"
            fill="none"
            style={{
              transform: filterConditionExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
            }}
          >
            <path
              d="M3 4.5L6 7.5L9 4.5"
              stroke={theme.subtleText}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        {filterConditionExpanded && (
          <div style={{ padding: '0 12px 8px 12px' }}>
            {/* Custom styled condition dropdown */}
            <div style={{ position: 'relative', marginBottom: '8px' }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setConditionMenuOpen(!conditionMenuOpen);
                }}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: `1px solid ${theme.inputBorder}`,
                  backgroundColor: theme.inputBg,
                  color: theme.inputText,
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {conditions.find(c => c.value === conditionType)?.label || 'None'}
                </span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  style={{
                    flexShrink: 0,
                    transform: conditionMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.15s ease-out',
                  }}
                >
                  <path
                    d="M3 4.5L6 7.5L9 4.5"
                    stroke={theme.subtleText}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {conditionMenuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    backgroundColor: theme.bg,
                    borderRadius: '10px',
                    border: `1px solid ${theme.border}`,
                    boxShadow: theme.shadow,
                    padding: '4px 0',
                    zIndex: 10001,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {conditions.map((c) => {
                    const selected = c.value === conditionType || (!conditionType && c.value === '');
                    return (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => {
                          setConditionType(c.value);
                          setConditionMenuOpen(false);
                        }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '6px 10px',
                          backgroundColor: selected ? 'rgba(59,130,246,0.15)' : 'transparent',
                          color: selected ? '#FFFFFF' : theme.valueText,
                          fontSize: '12px',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => {
                          if (!selected) e.currentTarget.style.backgroundColor = theme.hoverRow;
                        }}
                        onMouseLeave={(e) => {
                          if (!selected) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {conditionType && conditionType !== 'isEmpty' && conditionType !== 'isNotEmpty' && (
              <>
                {conditionType === 'between' || conditionType === 'notBetween' ? (
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <input
                        type="number"
                        value={conditionValue.includes('-') ? conditionValue.split('-')[0] : conditionValue}
                        onChange={(e) => {
                          const parts = conditionValue.includes('-') ? conditionValue.split('-') : [conditionValue, ''];
                          const minValue = e.target.value;
                          const maxValue = parts[1] || '';
                          if (minValue && maxValue) {
                            setConditionValue(`${minValue}-${maxValue}`);
                          } else if (minValue) {
                            setConditionValue(minValue);
                          } else if (maxValue) {
                            setConditionValue(`-${maxValue}`);
                          } else {
                            setConditionValue('');
                          }
                        }}
                        placeholder="Min"
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          paddingRight: (conditionValue.includes('-') ? conditionValue.split('-')[0] : conditionValue) ? '26px' : '8px',
                          border: `1px solid ${theme.inputBorder}`,
                          borderRadius: '4px',
                          fontSize: '12px',
                          outline: 'none',
                          boxSizing: 'border-box',
                          backgroundColor: theme.inputBg,
                          color: theme.inputText,
                        }}
                        onFocus={(e) => { e.target.style.borderColor = '#3B82F6'; }}
                        onBlur={(e) => { e.target.style.borderColor = theme.inputBorder; }}
                      />
                      {(conditionValue.includes('-') ? conditionValue.split('-')[0] : conditionValue) && (
                        <button
                          type="button"
                          onClick={() => {
                            const parts = conditionValue.includes('-') ? conditionValue.split('-') : [conditionValue, ''];
                            const maxValue = parts[1] || '';
                            if (maxValue) {
                              setConditionValue(`-${maxValue}`);
                            } else {
                              setConditionValue('');
                            }
                          }}
                          style={{
                            position: 'absolute',
                            right: '6px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '14px',
                            height: '14px',
                            border: `1px solid ${theme.inputBorder}`,
                            borderRadius: '3px',
                            backgroundColor: theme.inputBg,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0,
                            zIndex: 2,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = theme.subtleText;
                            e.currentTarget.style.backgroundColor = theme.hoverRow;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = theme.inputBorder;
                            e.currentTarget.style.backgroundColor = theme.inputBg;
                          }}
                        >
                          <svg
                            width="8"
                            height="8"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke={theme.subtleText}
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
                    <span style={{ fontSize: '12px', color: theme.subtleText }}>to</span>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <input
                        type="number"
                        value={conditionValue.includes('-') ? conditionValue.split('-')[1] : ''}
                        onChange={(e) => {
                          const parts = conditionValue.includes('-') ? conditionValue.split('-') : [conditionValue, ''];
                          const minValue = parts[0] || '';
                          const maxValue = e.target.value;
                          if (minValue && maxValue) {
                            setConditionValue(`${minValue}-${maxValue}`);
                          } else if (minValue) {
                            setConditionValue(minValue);
                          } else if (maxValue) {
                            setConditionValue(`-${maxValue}`);
                          } else {
                            setConditionValue('');
                          }
                        }}
                        placeholder="Max"
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          paddingRight: (conditionValue.includes('-') ? conditionValue.split('-')[1] : '') ? '26px' : '8px',
                          border: `1px solid ${theme.inputBorder}`,
                          borderRadius: '4px',
                          fontSize: '12px',
                          outline: 'none',
                          boxSizing: 'border-box',
                          backgroundColor: theme.inputBg,
                          color: theme.inputText,
                        }}
                        onFocus={(e) => { e.target.style.borderColor = '#3B82F6'; }}
                        onBlur={(e) => { e.target.style.borderColor = theme.inputBorder; }}
                      />
                      {(conditionValue.includes('-') ? conditionValue.split('-')[1] : '') && (
                        <button
                          type="button"
                          onClick={() => {
                            const parts = conditionValue.includes('-') ? conditionValue.split('-') : [conditionValue, ''];
                            const minValue = parts[0] || '';
                            if (minValue) {
                              setConditionValue(minValue);
                            } else {
                              setConditionValue('');
                            }
                          }}
                          style={{
                            position: 'absolute',
                            right: '6px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '14px',
                            height: '14px',
                            border: `1px solid ${theme.inputBorder}`,
                            borderRadius: '3px',
                            backgroundColor: theme.inputBg,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0,
                            zIndex: 2,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = theme.subtleText;
                            e.currentTarget.style.backgroundColor = theme.hoverRow;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = theme.inputBorder;
                            e.currentTarget.style.backgroundColor = theme.inputBg;
                          }}
                        >
                          <svg
                            width="8"
                            height="8"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke={theme.subtleText}
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
                ) : (
                  <div style={{ position: 'relative', width: '100%' }}>
                    <input
                      type={isNumericColumn ? 'number' : 'text'}
                      value={conditionValue}
                      onChange={(e) => setConditionValue(e.target.value)}
                      placeholder={isNumericColumn ? 'Enter number...' : 'Enter value...'}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        paddingRight: conditionValue ? '26px' : '8px',
                        border: `1px solid ${theme.inputBorder}`,
                        borderRadius: '4px',
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box',
                        backgroundColor: theme.inputBg,
                        color: theme.inputText,
                      }}
                      onFocus={(e) => { e.target.style.borderColor = '#3B82F6'; }}
                      onBlur={(e) => { e.target.style.borderColor = theme.inputBorder; }}
                    />
                    {conditionValue && (
                      <button
                        type="button"
                        onClick={() => setConditionValue('')}
                        style={{
                          position: 'absolute',
                          right: '6px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: '14px',
                          height: '14px',
                            border: `1px solid ${theme.inputBorder}`,
                          borderRadius: '3px',
                            backgroundColor: theme.inputBg,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0,
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = theme.subtleText;
                            e.currentTarget.style.backgroundColor = theme.hoverRow;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = theme.inputBorder;
                            e.currentTarget.style.backgroundColor = theme.inputBg;
                        }}
                      >
                        <svg
                          width="8"
                          height="8"
                          viewBox="0 0 24 24"
                          fill="none"
                            stroke={theme.subtleText}
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
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Brand Filter (only for product column) */}
      {columnKey === 'product' && (
      <div style={{ borderBottom: `1px solid ${theme.border}` }}>
        <div
          onClick={() => {
            setBrandFilterExpanded(!brandFilterExpanded);
            if (!brandFilterExpanded) {
              setFilterValuesExpanded(false);
            }
          }}
          style={{
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <span style={{ fontSize: '12px', color: (selectedBrands.size > 0 && selectedBrands.size < availableBrands.length) ? '#3B82F6' : theme.subtleText, fontWeight: (selectedBrands.size > 0 && selectedBrands.size < availableBrands.length) ? 500 : 400 }}>
            Filter by brand: {(selectedBrands.size > 0 && selectedBrands.size < availableBrands.length) && <span style={{ color: '#10B981' }}>●</span>}
          </span>
          <svg
            width="10"
            height="10"
            viewBox="0 0 12 12"
            fill="none"
            style={{
              transform: brandFilterExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
            }}
          >
            <path
              d="M3 4.5L6 7.5L9 4.5"
              stroke={theme.subtleText}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        
        {brandFilterExpanded && (
          <div style={{ padding: '0 12px 8px 12px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={handleSelectAllBrands}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#3B82F6',
                    fontSize: '11px',
                    cursor: 'pointer',
                    padding: 0,
                    fontWeight: 400,
                  }}
                >
                  Select all
                </button>
                <button
                  onClick={handleClearAllBrands}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#3B82F6',
                    fontSize: '11px',
                    cursor: 'pointer',
                    padding: 0,
                    fontWeight: 400,
                  }}
                >
                  Clear all
                </button>
              </div>
              <span style={{ fontSize: '11px', color: theme.subtleText }}>
                {filteredBrands.length} results
              </span>
            </div>
            
            <div style={{ position: 'relative', marginBottom: '8px' }}>
              <svg
                width="12"
                height="12"
                viewBox="0 0 16 16"
                fill="none"
                style={{
                  position: 'absolute',
                  left: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  zIndex: 1,
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
                value={brandSearchTerm}
                onChange={(e) => setBrandSearchTerm(e.target.value)}
                placeholder="Search brands..."
                style={{
                  width: '100%',
                  padding: '5px 8px 5px 26px',
                  paddingRight: brandSearchTerm ? '26px' : '8px',
                  border: `1px solid ${theme.inputBorder}`,
                  borderRadius: '4px',
                  fontSize: '11px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  backgroundColor: theme.inputBg,
                  color: theme.inputText,
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3B82F6';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = theme.inputBorder;
                }}
              />
              {brandSearchTerm && (
              <button
                type="button"
                onClick={() => setBrandSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '6px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '14px',
                  height: '14px',
                  border: `1px solid ${theme.inputBorder}`,
                  borderRadius: '3px',
                  backgroundColor: theme.inputBg,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  zIndex: 2,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = theme.subtleText;
                  e.currentTarget.style.backgroundColor = theme.hoverRow;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = theme.inputBorder;
                  e.currentTarget.style.backgroundColor = theme.inputBg;
                }}
              >
                <svg
                  width="8"
                  height="8"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={theme.subtleText}
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
            
            <div
              className="tps-filter-scroll"
              style={{
                maxHeight: '120px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              {filteredBrands.map((brand) => (
                <label
                  key={brand}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    padding: '2px 0',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedBrands.has(brand)}
                    onChange={() => handleToggleBrand(brand)}
                    style={{
                      width: '14px',
                      height: '14px',
                      cursor: 'pointer',
                      accentColor: '#3B82F6',
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: '12px', color: '#374151', lineHeight: '1.2', flex: 1 }}>
                    {brand}
                    {brandCounts[brand] !== undefined && (
                      <span style={{ color: '#9CA3AF', marginLeft: '6px', fontSize: '11px' }}>
                        ({brandCounts[brand]})
                      </span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
      )}

      {/* Filter by values */}
      <div>
        <div
          onClick={() => {
            setFilterValuesExpanded(!filterValuesExpanded);
            // Close brand filter when opening values filter
            if (!filterValuesExpanded) {
              setBrandFilterExpanded(false);
            }
          }}
          style={{
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <span style={{ fontSize: '12px', color: selectedValues.size > 0 ? '#3B82F6' : theme.subtleText, fontWeight: selectedValues.size > 0 ? 500 : 400 }}>
            Filter by values: {selectedValues.size > 0 && <span style={{ color: '#10B981' }}>●</span>}
          </span>
          <svg
            width="10"
            height="10"
            viewBox="0 0 12 12"
            fill="none"
            style={{
              transform: filterValuesExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
            }}
          >
            <path
              d="M3 4.5L6 7.5L9 4.5"
              stroke={theme.subtleText}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {filterValuesExpanded && (
        <div style={{ padding: '0 12px 8px 12px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
            }}
          >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={handleSelectAll}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#3B82F6',
                    fontSize: '11px',
                    cursor: 'pointer',
                    padding: 0,
                    fontWeight: 400,
                  }}
                >
                  Select all
                </button>
                <button
                  onClick={handleClearAll}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#3B82F6',
                    fontSize: '11px',
                    cursor: 'pointer',
                    padding: 0,
                    fontWeight: 400,
                  }}
                >
                  Clear all
                </button>
              </div>
              <span style={{ fontSize: '11px', color: theme.subtleText }}>
                {filteredValues.length} results
              </span>
            </div>

            <div style={{ position: 'relative', marginBottom: '8px' }}>
              <svg
                width="12"
                height="12"
                viewBox="0 0 16 16"
                fill="none"
                style={{
                  position: 'absolute',
                  left: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  zIndex: 1,
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
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                style={{
                  width: '100%',
                  padding: '5px 8px 5px 26px',
                  paddingRight: searchTerm ? '26px' : '8px',
                  border: `1px solid ${theme.inputBorder}`,
                  borderRadius: '4px',
                  fontSize: '11px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  backgroundColor: theme.inputBg,
                  color: theme.inputText,
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3B82F6';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = theme.inputBorder;
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  style={{
                    position: 'absolute',
                    right: '6px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '14px',
                    height: '14px',
                    border: `1px solid ${theme.inputBorder}`,
                    borderRadius: '3px',
                    backgroundColor: theme.inputBg,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                    zIndex: 2,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = theme.subtleText;
                    e.currentTarget.style.backgroundColor = theme.hoverRow;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = theme.inputBorder;
                    e.currentTarget.style.backgroundColor = theme.inputBg;
                  }}
                >
                  <svg
                    width="8"
                    height="8"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={theme.subtleText}
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

            <div
              className="tps-filter-scroll"
              style={{
               maxHeight: '140px',
               overflowY: 'auto',
               display: 'flex',
               flexDirection: 'column',
               gap: '6px',
              }}
            >
              {filteredValues.map((value) => (
                <label
                  key={value}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    padding: '2px 0',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedValues.has(value)}
                    onChange={() => handleToggleValue(value)}
                    style={{
                      width: '14px',
                      height: '14px',
                      cursor: 'pointer',
                      accentColor: '#3B82F6',
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: '12px', color: theme.valueText, lineHeight: '1.2' }}>{value}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px',
          padding: '8px 12px',
          borderTop: `1px solid ${theme.footerBorder}`,
        }}
      >
        <button
          type="button"
          onClick={handleReset}
          style={{
            padding: '4px 14px',
            border: `1px solid ${theme.resetBorder}`,
            borderRadius: '4px',
            backgroundColor: theme.resetBg,
            color: theme.resetText,
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background-color 0.2s',
            height: '23px',
            minWidth: '57px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.resetBgHover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = theme.resetBg;
          }}
        >
          Reset
        </button>
        <button
          type="button"
          onClick={handleApply}
          style={{
            padding: '4px 14px',
            border: '1px solid #3B82F6',
            borderRadius: '4px',
            backgroundColor: '#3B82F6',
            color: '#FFFFFF',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background-color 0.2s',
            height: '23px',
            minWidth: '57px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#2563EB';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#3B82F6';
          }}
        >
          Apply
        </button>
      </div>
    </div>,
    document.body
  );
});

ProductsFilterDropdown.displayName = 'ProductsFilterDropdown';

export default ProductsFilterDropdown;
