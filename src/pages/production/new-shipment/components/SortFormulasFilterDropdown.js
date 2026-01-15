import React, { useEffect, useState, forwardRef, useRef, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';

const SortFormulasFilterDropdown = forwardRef(({ 
  filterIconRef, 
  columnKey, 
  availableValues = [], 
  currentFilter = {},
  currentSort = '',
  onApply,
  onClose 
}, ref) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [sortOrder, setSortOrder] = useState(''); // Always start with empty, don't show blue state
  const [filterConditionExpanded, setFilterConditionExpanded] = useState(true);
  const [filterValuesExpanded, setFilterValuesExpanded] = useState(true);
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
    if (onApply) {
      // Pass null to indicate filter should be cleared
      onApply(null);
    }
  };

  const handleApply = () => {
    if (onApply) {
      onApply({
        sortOrder,
        selectedValues,
        conditionType,
        conditionValue,
      });
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
        backgroundColor: '#FFFFFF',
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        border: '1px solid #E5E7EB',
        zIndex: 10000,
        overflow: 'hidden',
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Sort Options */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #E5E7EB' }}>
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
            e.currentTarget.style.backgroundColor = '#F9FAFB';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <div
            style={{
              width: '20px',
              height: '20px',
              backgroundColor: sortOrder === 'asc' ? '#3B82F6' : '#E5E7EB',
              borderRadius: '3px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '9px',
              fontWeight: 700,
              color: sortOrder === 'asc' ? '#FFFFFF' : '#6B7280',
              flexShrink: 0,
            }}
          >
            AZ
          </div>
          <div style={{ fontSize: '12px', color: '#111827', fontWeight: 400, lineHeight: '1.3' }}>
            Sort ascending<br/>
            <span style={{ color: '#9CA3AF', fontSize: '11px' }}>(A to Z)</span>
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
            e.currentTarget.style.backgroundColor = '#F9FAFB';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <div
            style={{
              width: '20px',
              height: '20px',
              backgroundColor: sortOrder === 'desc' ? '#3B82F6' : '#E5E7EB',
              borderRadius: '3px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '9px',
              fontWeight: 700,
              color: sortOrder === 'desc' ? '#FFFFFF' : '#6B7280',
              flexShrink: 0,
            }}
          >
            ZA
          </div>
          <div style={{ fontSize: '12px', color: '#111827', fontWeight: 400, lineHeight: '1.3' }}>
            Sort descending<br/>
            <span style={{ color: '#9CA3AF', fontSize: '11px' }}>(Z to A)</span>
          </div>
        </div>
      </div>

      {/* Filter by condition */}
      <div style={{ borderBottom: '1px solid #E5E7EB' }}>
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
          <span style={{ fontSize: '12px', color: conditionType ? '#3B82F6' : '#6B7280', fontWeight: conditionType ? 500 : 400 }}>
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
              stroke="#6B7280"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        {filterConditionExpanded && (
          <div style={{ padding: '0 12px 8px 12px' }}>
            {/* Condition type selector */}
            <select
              value={conditionType}
              onChange={(e) => setConditionType(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid #E5E7EB',
                borderRadius: '4px',
                fontSize: '12px',
                outline: 'none',
                marginBottom: '8px',
                backgroundColor: '#FFFFFF',
                cursor: 'pointer',
              }}
              onFocus={(e) => { e.target.style.borderColor = '#3B82F6'; }}
              onBlur={(e) => { e.target.style.borderColor = '#E5E7EB'; }}
            >
              <option value="">Select condition...</option>
              {conditions.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            
            {/* Condition value input - show for most conditions except isEmpty/isNotEmpty */}
            {conditionType && conditionType !== 'isEmpty' && conditionType !== 'isNotEmpty' && (
              <>
                {conditionType === 'between' || conditionType === 'notBetween' ? (
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
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
                        flex: 1,
                        padding: '6px 8px',
                        border: '1px solid #E5E7EB',
                        borderRadius: '4px',
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                      onFocus={(e) => { e.target.style.borderColor = '#3B82F6'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#E5E7EB'; }}
                    />
                    <span style={{ fontSize: '12px', color: '#6B7280' }}>to</span>
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
                        flex: 1,
                        padding: '6px 8px',
                        border: '1px solid #E5E7EB',
                        borderRadius: '4px',
                        fontSize: '12px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                      onFocus={(e) => { e.target.style.borderColor = '#3B82F6'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#E5E7EB'; }}
                    />
                  </div>
                ) : (
                  <input
                    type={isNumericColumn ? 'number' : 'text'}
                    value={conditionValue}
                    onChange={(e) => setConditionValue(e.target.value)}
                    placeholder={isNumericColumn ? 'Enter number...' : 'Enter value...'}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      border: '1px solid #E5E7EB',
                      borderRadius: '4px',
                      fontSize: '12px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    onFocus={(e) => { e.target.style.borderColor = '#3B82F6'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#E5E7EB'; }}
                  />
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Filter by values */}
      <div>
        <div
          onClick={() => setFilterValuesExpanded(!filterValuesExpanded)}
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
              stroke="#6B7280"
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
              <span style={{ fontSize: '11px', color: '#9CA3AF' }}>
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
                  border: '1px solid #E5E7EB',
                  borderRadius: '4px',
                  fontSize: '11px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3B82F6';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#E5E7EB';
                }}
              />
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
                  <span style={{ fontSize: '12px', color: '#374151', lineHeight: '1.2' }}>{value}</span>
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
          borderTop: '1px solid #E5E7EB',
        }}
      >
        <button
          type="button"
          onClick={handleReset}
          style={{
            padding: '4px 14px',
            border: '1px solid #E5E7EB',
            borderRadius: '4px',
            backgroundColor: '#FFFFFF',
            color: '#374151',
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
            e.currentTarget.style.backgroundColor = '#F9FAFB';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#FFFFFF';
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
