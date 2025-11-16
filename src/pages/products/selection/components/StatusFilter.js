import React, { useState } from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const StatusFilter = ({ onFilterChange }) => {
  const { isDarkMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('all');

  const themeClasses = {
    bg: isDarkMode ? 'bg-dark-bg-tertiary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    hoverBg: isDarkMode ? 'hover:bg-dark-bg-primary' : 'hover:bg-gray-50',
    dropdownBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
  };

  const statuses = [
    { value: 'all', label: 'All Status', icon: '📊' },
    { value: 'launched', label: 'Launched', icon: '✓' },
    { value: 'contender', label: 'Contender', icon: '⭐' },
  ];

  const handleStatusChange = (status) => {
    setSelectedStatus(status);
    setIsOpen(false);
    onFilterChange && onFilterChange(status);
  };

  const selectedLabel = statuses.find((s) => s.value === selectedStatus)?.label || 'All Status';
  const selectedIcon = statuses.find((s) => s.value === selectedStatus)?.icon || '📊';

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 ${themeClasses.bg} ${themeClasses.border} border rounded-xl px-4 py-2.5 text-sm font-medium ${themeClasses.text} ${themeClasses.hoverBg} transition-all shadow-sm hover:shadow`}
      >
        <span>{selectedIcon}</span>
        <span>{selectedLabel}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className={`absolute top-full mt-2 left-0 ${themeClasses.dropdownBg} ${themeClasses.border} border rounded-xl shadow-xl z-20 min-w-[200px] overflow-hidden`}>
            {statuses.map((status) => (
              <button
                key={status.value}
                onClick={() => handleStatusChange(status.value)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium ${
                  selectedStatus === status.value
                    ? isDarkMode
                      ? 'bg-blue-500/10 text-blue-400'
                      : 'bg-blue-50 text-blue-600'
                    : `${themeClasses.text} ${themeClasses.hoverBg}`
                } transition-colors text-left`}
              >
                <span className="text-base">{status.icon}</span>
                <span>{status.label}</span>
                {selectedStatus === status.value && (
                  <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default StatusFilter;

