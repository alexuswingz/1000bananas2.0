import React from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const Pagination = ({ currentPage, totalPages, pageSize, totalItems, onPageChange, onPageSizeChange }) => {
  const { isDarkMode } = useTheme();

  const themeClasses = {
    bg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-600',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    hoverBg: isDarkMode ? 'hover:bg-dark-bg-tertiary' : 'hover:bg-gray-100',
    activeBg: isDarkMode ? 'bg-blue-500' : 'bg-blue-600',
    activeHoverBg: isDarkMode ? 'hover:bg-blue-600' : 'hover:bg-blue-700',
    disabledText: isDarkMode ? 'text-gray-700' : 'text-gray-300',
    buttonBg: isDarkMode ? 'bg-dark-bg-tertiary' : 'bg-gray-50',
    buttonBorder: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
  };

  // Don't show dropdown - page size is dynamic
  const pageSizes = [];

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div 
      className={`${themeClasses.bg} border-t ${themeClasses.border}`}
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        padding: '1rem 1.5rem',
        flexShrink: 0,
      }}
    >
      {/* Left side - Items info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span className={`text-sm font-medium ${themeClasses.text}`} style={{ whiteSpace: 'nowrap' }}>
          {startItem}-{endItem}
        </span>
        <span className={`text-sm ${themeClasses.textSecondary}`} style={{ whiteSpace: 'nowrap' }}>
          of {totalItems}
        </span>
      </div>

      {/* Center - Pagination controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        {/* Previous button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
            currentPage === 1
              ? `cursor-not-allowed ${themeClasses.disabledText} ${themeClasses.border} opacity-50`
              : `${themeClasses.text} ${themeClasses.buttonBorder} ${themeClasses.hoverBg} hover:border-blue-400`
          }`}
          style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Page numbers */}
        <div style={{ display: 'flex', gap: '0.25rem', marginLeft: '0.5rem', marginRight: '0.5rem' }}>
          {getPageNumbers().map((page, index) => (
            page === '...' ? (
              <span
                key={`ellipsis-${index}`}
                className={`px-3 py-2 text-sm font-medium ${themeClasses.textSecondary}`}
              >
                ...
              </span>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all border ${
                  currentPage === page
                    ? `${themeClasses.activeBg} text-white border-transparent ${themeClasses.activeHoverBg} shadow-md`
                    : `${themeClasses.text} ${themeClasses.buttonBorder} ${themeClasses.hoverBg} hover:border-blue-400`
                }`}
                style={{ minWidth: '2.75rem' }}
              >
                {page}
              </button>
            )
          ))}
        </div>

        {/* Next button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
            currentPage === totalPages
              ? `cursor-not-allowed ${themeClasses.disabledText} ${themeClasses.border} opacity-50`
              : `${themeClasses.text} ${themeClasses.buttonBorder} ${themeClasses.hoverBg} hover:border-blue-400`
          }`}
          style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Right side - Page info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span className={`text-sm ${themeClasses.textSecondary}`}>Page</span>
        <span className={`text-sm font-medium ${themeClasses.text}`}>
          {currentPage}
        </span>
        <span className={`text-sm ${themeClasses.textSecondary}`}>of</span>
        <span className={`text-sm font-medium ${themeClasses.text}`}>
          {totalPages}
        </span>
      </div>
    </div>
  );
};

export default Pagination;
