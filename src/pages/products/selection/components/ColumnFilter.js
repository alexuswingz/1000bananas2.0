import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const ColumnFilter = ({ column, data, onFilterChange, onSort }) => {
  const { isDarkMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [filterCondition, setFilterCondition] = useState('none');
  const [filterValue, setFilterValue] = useState('');
  const [selectedValues, setSelectedValues] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  const themeClasses = {
    bg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    hoverBg: isDarkMode ? 'hover:bg-dark-bg-tertiary' : 'hover:bg-gray-50',
    inputBg: isDarkMode ? 'bg-dark-bg-tertiary' : 'bg-gray-50',
    selectedBg: isDarkMode ? 'bg-blue-500/10' : 'bg-blue-50',
    divider: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
  };

  // Get unique values from data for this column
  const uniqueValues = [...new Set(data.map(row => row[column]))].sort();

  const filteredUniqueValues = uniqueValues.filter(val =>
    val.toString().toLowerCase().includes(searchTerm.toLowerCase())
  );

  const conditions = [
    { value: 'none', label: 'None' },
    { value: 'isEmpty', label: 'Is empty' },
    { value: 'isNotEmpty', label: 'Is not empty' },
    { value: 'textContains', label: 'Text contains' },
    { value: 'textDoesNotContain', label: 'Text does not contain' },
    { value: 'textStartsWith', label: 'Text starts with' },
    { value: 'textEndsWith', label: 'Text ends with' },
    { value: 'textIsExactly', label: 'Text is exactly' },
    { value: 'greaterThan', label: 'Greater than' },
    { value: 'greaterThanOrEqual', label: 'Greater than or equal to' },
    { value: 'lessThan', label: 'Less than' },
    { value: 'lessThanOrEqual', label: 'Less than or equal to' },
    { value: 'isEqualTo', label: 'Is equal to' },
    { value: 'isNotEqualTo', label: 'Is not equal to' },
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      const dropdownContent = document.getElementById(`filter-dropdown-${column}`);
      
      // Close if clicked outside both the button and the dropdown
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target) &&
        dropdownContent &&
        !dropdownContent.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, column]);

  const handleSelectAll = () => {
    if (selectedValues.length === uniqueValues.length) {
      setSelectedValues([]);
    } else {
      setSelectedValues([...uniqueValues]);
    }
  };

  const handleToggleValue = (value) => {
    if (selectedValues.includes(value)) {
      setSelectedValues(selectedValues.filter(v => v !== value));
    } else {
      setSelectedValues([...selectedValues, value]);
    }
  };

  const handleApply = () => {
    const hasFilter = 
      (filterCondition !== 'none') || 
      (selectedValues.length > 0 && selectedValues.length < uniqueValues.length);
    
    if (hasFilter) {
      onFilterChange(column, {
        condition: filterCondition,
        value: filterValue,
        selectedValues: selectedValues,
      });
    } else {
      onFilterChange(column, null);
    }
    setIsOpen(false);
  };

  const handleReset = () => {
    setFilterCondition('none');
    setFilterValue('');
    setSelectedValues([]);
    setSearchTerm('');
    onFilterChange(column, null);
  };

  // Check if filter is active
  const isFilterActive = 
    (filterCondition !== 'none') || 
    (selectedValues.length > 0 && selectedValues.length < uniqueValues.length);

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-1 rounded ${themeClasses.hoverBg} transition-colors relative`}
      >
        <svg 
          className={`w-3 h-3 ${isFilterActive ? 'text-blue-500' : 'opacity-60'}`} 
          fill="currentColor" 
          viewBox="0 0 20 20"
        >
          <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
        </svg>
        {isFilterActive && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full"></span>
        )}
      </button>

      {isOpen && (
        <div 
          id={`filter-dropdown-${column}`}
          className={`fixed ${themeClasses.bg} ${themeClasses.border} border rounded-xl shadow-2xl w-[280px] max-h-[520px] overflow-hidden flex flex-col`}
          style={{ 
            top: dropdownRef.current?.getBoundingClientRect().bottom + 8 + 'px',
            right: window.innerWidth - dropdownRef.current?.getBoundingClientRect().right + 'px',
            zIndex: 9999
          }}
        >
          {/* Sort Options */}
          <div className={`border-b ${themeClasses.divider} p-2`}>
            <button 
              onClick={() => {
                onSort && onSort(column, 'asc');
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${themeClasses.text} ${themeClasses.hoverBg} rounded transition-colors text-left`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              </svg>
              <span>Sort ascending (A to Z)</span>
            </button>
            <button 
              onClick={() => {
                onSort && onSort(column, 'desc');
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${themeClasses.text} ${themeClasses.hoverBg} rounded transition-colors text-left`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
              </svg>
              <span>Sort descending (Z to A)</span>
            </button>
          </div>

          {/* Filter by Condition */}
          <div className={`border-b ${themeClasses.divider} p-3`}>
            <label className={`text-xs ${themeClasses.textSecondary} mb-2 block uppercase tracking-wide`}>
              Filter by condition:
            </label>
            <select
              value={filterCondition}
              onChange={(e) => setFilterCondition(e.target.value)}
              className={`w-full ${themeClasses.inputBg} ${themeClasses.text} ${themeClasses.border} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
            >
              {conditions.map((cond) => (
                <option key={cond.value} value={cond.value}>
                  {cond.label}
                </option>
              ))}
            </select>

            {filterCondition !== 'none' && !['isEmpty', 'isNotEmpty'].includes(filterCondition) && (
              <input
                type="text"
                placeholder="Value here..."
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                className={`w-full ${themeClasses.inputBg} ${themeClasses.text} ${themeClasses.border} border rounded-lg px-3 py-2 text-sm mt-2 focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
              />
            )}
          </div>

          {/* Filter by Values */}
          <div className="flex-1 overflow-y-auto p-3">
            <div className="flex items-center justify-between mb-2">
              <label className={`text-xs ${themeClasses.textSecondary} uppercase tracking-wide`}>
                Filter by values:
              </label>
              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={handleSelectAll}
                  className="text-blue-500 hover:text-blue-600"
                >
                  Select all
                </button>
                <span className={themeClasses.textSecondary}>·</span>
                <button
                  onClick={() => setSelectedValues([])}
                  className="text-blue-500 hover:text-blue-600"
                >
                  Clear all
                </button>
              </div>
            </div>

            <div className={`text-xs ${themeClasses.textSecondary} mb-2`}>
              {filteredUniqueValues.length} results
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full ${themeClasses.inputBg} ${themeClasses.text} ${themeClasses.border} border rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
              />
              <svg
                className={`absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 ${themeClasses.textSecondary}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Values List */}
            <div className="space-y-0.5">
              {filteredUniqueValues.map((value) => (
                <label
                  key={value}
                  className={`flex items-center gap-2 px-2 py-2 rounded cursor-pointer ${themeClasses.hoverBg} transition-colors`}
                >
                  <input
                    type="checkbox"
                    checked={selectedValues.includes(value)}
                    onChange={() => handleToggleValue(value)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className={`text-sm ${themeClasses.text}`}>{value}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className={`border-t ${themeClasses.divider} p-3 flex items-center justify-end gap-2`}>
            <button
              onClick={handleReset}
              className={`px-4 py-2 text-sm ${themeClasses.text} ${themeClasses.hoverBg} rounded-lg transition-colors`}
            >
              Reset
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColumnFilter;

