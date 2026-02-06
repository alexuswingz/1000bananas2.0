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

const SortFormulasFilterDropdown = forwardRef(({ 
  filterIconRef, 
  columnKey, 
  availableValues = [], 
  currentFilter = {},
  currentSort = '',
  onApply,
  onClose,
  enableBrandFilter = true, // allow callers to disable brand filter section
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
  const [sortOrder, setSortOrder] = useState(''); // Always start with empty, don't show blue state
  const [filterConditionExpanded, setFilterConditionExpanded] = useState(false);
  const [filterValuesExpanded, setFilterValuesExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const hasInitializedRef = useRef(false);
  
  // Initialize with all available values checked (unless there's an existing filter)
  const [selectedValues, setSelectedValues] = useState(() => {
    // If there's an existing filter with selectedValues, use those
    if (currentFilter.selectedValues && currentFilter.selectedValues.size > 0) {
      return new Set(currentFilter.selectedValues);
    }
    // Otherwise, start with all values checked
    const allValues = (columnKey === 'normal-3' || columnKey === 'add')
      ? ['Added', 'Not Added']
      : availableValues.map(v => String(v));
    return new Set(allValues);
  });
  
  // Update selectedValues when dropdown opens - respect existing filter or start with all checked
  useEffect(() => {
    if (filterIconRef) {
      // Check if there's an existing filter with selectedValues
      const existingFilterValues = currentFilter.selectedValues;
      const hasFilter = existingFilterValues && 
        (existingFilterValues instanceof Set ? existingFilterValues.size > 0 : 
         Array.isArray(existingFilterValues) ? existingFilterValues.length > 0 :
         false);
      
      if (hasFilter) {
        // Use existing filter values - always respect the saved filter
        const filterValues = existingFilterValues instanceof Set 
          ? Array.from(existingFilterValues)
          : existingFilterValues;
        setSelectedValues(new Set(filterValues));
      } else if (!hasInitializedRef.current) {
        // First time opening this dropdown with no filter - start with all checked
        const allValues = (columnKey === 'normal-3' || columnKey === 'add')
          ? ['Added', 'Not Added']
          : availableValues.map(v => String(v));
        setSelectedValues(new Set(allValues));
        hasInitializedRef.current = true;
      }
      // If hasInitializedRef is true and no filter, keep current selectedValues (don't reset)
    } else {
      // Dropdown closed - reset initialization flag for next open
      hasInitializedRef.current = false;
    }
  }, [filterIconRef, columnKey, currentFilter.selectedValues, availableValues]);
  
  // Condition filter state
  const [conditionType, setConditionType] = useState(currentFilter.conditionType || '');
  const [conditionValue, setConditionValue] = useState(currentFilter.conditionValue || '');
  const [conditionMenuOpen, setConditionMenuOpen] = useState(false);
  
  // Brand filter state (only for product column)
  const [brandFilterExpanded, setBrandFilterExpanded] = useState(false);
  const [brandSearchTerm, setBrandSearchTerm] = useState('');
  const [selectedBrands, setSelectedBrands] = useState(() => {
    if (enableBrandFilter && columnKey === 'product' && currentFilter.selectedBrands && currentFilter.selectedBrands.size > 0) {
      return new Set(currentFilter.selectedBrands);
    }
    // For product column, get unique brands from availableValues
    if (enableBrandFilter && columnKey === 'product') {
      const allowedBrands = ['TPS Nutrients', 'TPS Plant Foods', 'Bloom City', 'NatureStop', 'GreenThumbs'];
      return new Set(allowedBrands);
    }
    return new Set();
  });
  
  // Extract unique brands from availableValues (for product column)
  const availableBrands = useMemo(() => {
    if (!enableBrandFilter || columnKey !== 'product') return [];
    const allowedBrands = ['TPS Nutrients', 'TPS Plant Foods', 'Bloom City', 'NatureStop', 'GreenThumbs'];
    // Also check availableValues for any brands
    const brandsFromValues = availableValues
      .map(v => String(v))
      .filter(v => allowedBrands.some(b => v.includes(b) || b.includes(v)))
      .map(v => {
        // Try to extract brand name
        for (const brand of allowedBrands) {
          if (v.includes(brand)) return brand;
        }
        return null;
      })
      .filter(Boolean);
    
    const allBrands = [...new Set([...allowedBrands, ...brandsFromValues])];
    return allBrands.sort();
  }, [columnKey, availableValues]);
  
  const filteredBrands = availableBrands.filter(brand =>
    brand.toLowerCase().includes(brandSearchTerm.toLowerCase())
  );
  
  // Update selectedBrands when dropdown opens
  useEffect(() => {
    if (filterIconRef && enableBrandFilter && columnKey === 'product') {
      const existingBrands = currentFilter.selectedBrands;
      if (existingBrands && existingBrands instanceof Set && existingBrands.size > 0) {
        setSelectedBrands(new Set(existingBrands));
      } else if (!hasInitializedRef.current) {
        // Start with all brands selected
        setSelectedBrands(new Set(availableBrands));
      }
    }
  }, [filterIconRef, columnKey, currentFilter.selectedBrands, availableBrands]);
  
  // Check if column is numeric
  const isNumericColumn = columnKey === 'qty' || columnKey === 'volume' || 
                          columnKey === 'bottles' || columnKey === 'closures' || 
                          columnKey === 'boxes' || columnKey === 'labels' ||
                          columnKey === 'quantity' || columnKey === 'lblCurrentInv';
  
  // Universal conditions - apply to ALL filters
  const conditions = [
    { value: 'greaterThan', label: 'Greater than' },
    { value: 'greaterOrEqual', label: 'Greater than or equal to' },
    { value: 'lessThan', label: 'Less than' },
    { value: 'lessOrEqual', label: 'Less than or equal to' },
    { value: 'equals', label: 'Is equal to' },
    { value: 'notEquals', label: 'Is not equal to' },
    { value: 'between', label: 'Is between' },
    { value: 'notBetween', label: 'Is not between' },
  ];

  // Convert values to strings for filtering
  // Special handling for Add column
  const stringValues = (columnKey === 'normal-3' || columnKey === 'add')
    ? ['Added', 'Not Added']
    : availableValues.map(v => String(v));
  
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
      // Mark as positioned after calculating
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

  const handleReset = () => {
    setSortOrder('');
    setSearchTerm('');
    // Reset to all values checked
    const allValues = (columnKey === 'normal-3' || columnKey === 'add')
      ? ['Added', 'Not Added']
      : availableValues.map(v => String(v));
    setSelectedValues(new Set(allValues));
    setConditionType('');
    setConditionValue('');
    // Reset brand filter for product column
      if (enableBrandFilter && columnKey === 'product') {
      setSelectedBrands(new Set(availableBrands));
      setBrandSearchTerm('');
    }
    if (onApply) {
      // Pass null to indicate filter should be cleared
      onApply(null);
    }
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

  const handleApply = () => {
    if (onApply) {
      const filterData = {
        sortOrder,
        selectedValues,
        conditionType,
        conditionValue,
      };
      // Add brand filter for product column
      if (enableBrandFilter && columnKey === 'product') {
        filterData.selectedBrands = selectedBrands;
      }
      onApply(filterData);
    }
    onClose?.();
  };

  const dropdownRef = useRef(null);

  // Expose the DOM element via ref
  useImperativeHandle(ref, () => dropdownRef.current, []);
  
  // Ensure component always returns valid JSX
  if (!columnKey) {
    return null;
  }

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
      {/* Sort Options */}
      <div style={{ padding: '8px 12px', borderBottom: `1px solid ${theme.sectionBorder}` }}>
        {/* Sort Ascending */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            const newOrder = 'asc';
            if (onApply) {
              onApply({
                sortOrder: newOrder,
                selectedValues,
                conditionType,
                conditionValue,
                __fromSortClick: true,
              });
            }
            // Reset sortOrder state and close dropdown
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
              width: '20px',
              height: '20px',
              backgroundColor: sortOrder === 'asc' ? theme.chipBgActive : theme.chipBg,
              borderRadius: '3px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '9px',
              fontWeight: 700,
              color: sortOrder === 'asc' ? theme.chipTextActive : theme.chipText,
              flexShrink: 0,
            }}
          >
            AZ
          </div>
          <div style={{ fontSize: '12px', color: theme.headerText, fontWeight: 400, lineHeight: '1.3' }}>
            Sort ascending<br/>
            <span style={{ color: theme.subtleText, fontSize: '11px' }}>(A to Z)</span>
          </div>
        </div>

        {/* Sort Descending */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            const newOrder = 'desc';
            if (onApply) {
              onApply({
                sortOrder: newOrder,
                selectedValues,
                conditionType,
                conditionValue,
                __fromSortClick: true,
              });
            }
            // Reset sortOrder state and close dropdown
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
              width: '20px',
              height: '20px',
              backgroundColor: sortOrder === 'desc' ? theme.chipBgActive : theme.chipBg,
              borderRadius: '3px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '9px',
              fontWeight: 700,
              color: sortOrder === 'desc' ? theme.chipTextActive : theme.chipText,
              flexShrink: 0,
            }}
          >
            ZA
          </div>
          <div style={{ fontSize: '12px', color: theme.headerText, fontWeight: 400, lineHeight: '1.3' }}>
            Sort descending<br/>
            <span style={{ color: theme.subtleText, fontSize: '11px' }}>(Z to A)</span>
          </div>
        </div>
      </div>

      {/* Filter by condition */}
      <div style={{ borderBottom: `1px solid ${theme.sectionBorder}` }}>
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
            
            {/* Condition value input - show for most conditions except isEmpty/isNotEmpty */}
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
                          onTouchStart={(e) => {
                            e.currentTarget.style.borderColor = theme.subtleText;
                            e.currentTarget.style.backgroundColor = theme.hoverRow;
                          }}
                          onTouchEnd={(e) => {
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
                          onTouchStart={(e) => {
                            e.currentTarget.style.borderColor = theme.subtleText;
                            e.currentTarget.style.backgroundColor = theme.hoverRow;
                          }}
                          onTouchEnd={(e) => {
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
                          e.currentTarget.style.backgroundColor = '#F3F4F6';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = theme.inputBorder;
                          e.currentTarget.style.backgroundColor = '#FFFFFF';
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

      {/* Brand Filter (only for product column, and only when enabled) */}
      {enableBrandFilter && columnKey === 'product' && (
        <div style={{ borderBottom: `1px solid ${theme.sectionBorder}` }}>
          <div
            onClick={() => {
              setBrandFilterExpanded(!brandFilterExpanded);
              // Close values filter when opening brand filter
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
              {/* Select all / Clear all */}
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
              
              {/* Brand search box */}
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
                    stroke={theme.subtleText}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M14 14L11.1 11.1"
                    stroke={theme.subtleText}
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
                      e.currentTarget.style.backgroundColor = '#F3F4F6';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = theme.inputBorder;
                      e.currentTarget.style.backgroundColor = '#FFFFFF';
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
              
              {/* Brands list */}
              <div
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
                    <span style={{ fontSize: '12px', color: '#374151', lineHeight: '1.2' }}>{brand}</span>
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
          <span style={{ fontSize: '12px', color: selectedValues.size > 0 ? '#3B82F6' : '#6B7280', fontWeight: selectedValues.size > 0 ? 500 : 400 }}>
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
            {/* Select all / Clear all */}
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

            {/* Search box */}
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
                  stroke={theme.subtleText}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M14 14L11.1 11.1"
                  stroke={theme.subtleText}
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
                    e.currentTarget.style.backgroundColor = '#F3F4F6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = theme.inputBorder;
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
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

            {/* Values list */}
            <div
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

SortFormulasFilterDropdown.displayName = 'SortFormulasFilterDropdown';

export default SortFormulasFilterDropdown;
