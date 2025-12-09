import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const SortFormulasFilterDropdown = ({ 
  filterIconRef, 
  columnKey, 
  availableValues = [], 
  currentFilter = {},
  currentSort = '',
  onApply,
  onClose 
}) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [sortOrder, setSortOrder] = useState(currentSort); // 'asc' or 'desc'
  const [filterConditionExpanded, setFilterConditionExpanded] = useState(true);
  const [filterValuesExpanded, setFilterValuesExpanded] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedValues, setSelectedValues] = useState(
    currentFilter.selectedValues ? new Set(currentFilter.selectedValues) : new Set()
  );
  
  // Condition filter state
  const [conditionType, setConditionType] = useState(currentFilter.conditionType || '');
  const [conditionValue, setConditionValue] = useState(currentFilter.conditionValue || '');
  
  // Check if column is numeric
  const isNumericColumn = columnKey === 'qty' || columnKey === 'volume';
  
  // Available conditions based on column type
  const textConditions = [
    { value: '', label: 'None' },
    { value: 'contains', label: 'Contains' },
    { value: 'notContains', label: 'Does not contain' },
    { value: 'equals', label: 'Equals' },
    { value: 'notEquals', label: 'Does not equal' },
    { value: 'startsWith', label: 'Starts with' },
    { value: 'endsWith', label: 'Ends with' },
    { value: 'isEmpty', label: 'Is empty' },
    { value: 'isNotEmpty', label: 'Is not empty' },
  ];
  
  const numericConditions = [
    { value: '', label: 'None' },
    { value: 'equals', label: 'Equals' },
    { value: 'notEquals', label: 'Does not equal' },
    { value: 'greaterThan', label: 'Greater than' },
    { value: 'lessThan', label: 'Less than' },
    { value: 'greaterOrEqual', label: 'Greater than or equal' },
    { value: 'lessOrEqual', label: 'Less than or equal' },
  ];
  
  const conditions = isNumericColumn ? numericConditions : textConditions;

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
    setSelectedValues(new Set());
    setConditionType('');
    setConditionValue('');
    if (onApply) {
      onApply({
        sortOrder: '',
        selectedValues: new Set(),
        conditionType: '',
        conditionValue: '',
      });
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

  return createPortal(
    <div
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
    >
      {/* Sort Options */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #E5E7EB' }}>
        {/* Sort Ascending */}
        <div
          onClick={() => setSortOrder(sortOrder === 'asc' ? '' : 'asc')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px',
            cursor: 'pointer',
            borderRadius: '4px',
            backgroundColor: sortOrder === 'asc' ? '#EFF6FF' : 'transparent',
            marginBottom: '6px',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            if (sortOrder !== 'asc') {
              e.currentTarget.style.backgroundColor = '#F9FAFB';
            }
          }}
          onMouseLeave={(e) => {
            if (sortOrder !== 'asc') {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
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
          onClick={() => setSortOrder(sortOrder === 'desc' ? '' : 'desc')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px',
            cursor: 'pointer',
            borderRadius: '4px',
            backgroundColor: sortOrder === 'desc' ? '#EFF6FF' : 'transparent',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            if (sortOrder !== 'desc') {
              e.currentTarget.style.backgroundColor = '#F9FAFB';
            }
          }}
          onMouseLeave={(e) => {
            if (sortOrder !== 'desc') {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
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
              {conditions.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            
            {/* Condition value input - show for most conditions except isEmpty/isNotEmpty */}
            {conditionType && conditionType !== 'isEmpty' && conditionType !== 'isNotEmpty' && (
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
};

export default SortFormulasFilterDropdown;
