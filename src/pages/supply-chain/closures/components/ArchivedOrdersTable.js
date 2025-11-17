import React from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const ArchivedOrdersTable = ({ archivedOrders }) => {
  const { isDarkMode } = useTheme();

  const themeClasses = {
    cardBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    headerBg: isDarkMode ? 'bg-[#2C3544]' : 'bg-[#2C3544]',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    rowHover: isDarkMode ? 'hover:bg-dark-bg-tertiary' : 'hover:bg-gray-50',
    textPrimary: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
  };

  const renderStatusPill = (status) => {
    if (status === 'Received') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
          <span aria-hidden="true">✓</span>
          Received
        </span>
      );
    } else {
      // Draft status
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
          <svg className="w-3.5 h-3.5" fill="#3B82F6" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" fill="#3B82F6"/>
            <path d="M14 2v6h6" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="9" y1="13" x2="15" y2="13" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="9" y1="17" x2="15" y2="17" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Draft
        </span>
      );
    }
  };

  return (
    <div
      className={`${themeClasses.cardBg} rounded-xl border ${themeClasses.border} shadow-md`}
      style={{ overflow: 'hidden' }}
    >
      {/* Table header row */}
      <div className={themeClasses.headerBg}>
        <div
          className="grid"
          style={{
            gridTemplateColumns: '140px 2fr 2fr',
          }}
        >
          <div className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider border-r border-[#3C4656] text-center">
            Status
          </div>
          <div className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider border-r border-[#3C4656] text-center">
            CAP Order #
          </div>
          <div className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider text-center">
            Supplier
          </div>
        </div>
      </div>

      {/* Table body */}
      <div>
        {archivedOrders.length === 0 ? (
          <div className="px-6 py-6 text-center text-sm italic text-gray-400">
            No archived orders yet.
          </div>
        ) : (
          archivedOrders.map((order, index) => (
            <div
              key={order.id}
              className={`grid text-sm ${themeClasses.rowHover} transition-colors`}
              style={{
                gridTemplateColumns: '140px 2fr 2fr',
                borderBottom:
                  index === archivedOrders.length - 1
                    ? 'none'
                    : isDarkMode
                    ? '1px solid rgba(75,85,99,0.3)'
                    : '1px solid #e5e7eb',
              }}
            >
              <div className="px-6 py-3 flex items-center justify-center">
                {renderStatusPill(order.status || 'Draft')}
              </div>
              <div className="px-6 py-3 flex items-center">
                <span className="text-xs font-medium text-blue-600">{order.orderNumber}</span>
              </div>
              <div className="px-6 py-3 flex items-center justify-between">
                <span className={themeClasses.textPrimary}>{order.supplier}</span>
                <button
                  type="button"
                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-dark-bg-tertiary transition-colors ml-2"
                  aria-label="Archived order actions"
                >
                  <span className={themeClasses.textSecondary}>⋮</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ArchivedOrdersTable;

