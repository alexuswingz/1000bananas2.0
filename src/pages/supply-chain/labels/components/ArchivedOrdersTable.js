import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const ArchivedOrdersTable = forwardRef(({ themeClasses }, ref) => {
  const { isDarkMode } = useTheme();

  // Archived orders data - moved from Labels.js
  const [archivedOrders, setArchivedOrders] = useState(() => {
    try {
      const stored = window.localStorage.getItem('labelArchivedOrders');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    return [];
  });

  // Persist archived orders to localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem('labelArchivedOrders', JSON.stringify(archivedOrders));
    } catch {}
  }, [archivedOrders]);

  // Expose function to add archived order (called from OrdersTable)
  useImperativeHandle(ref, () => ({
    addArchivedOrder: (order) => {
      setArchivedOrders((prev) => {
        // Avoid duplicates
        if (prev.some((o) => o.id === order.id)) {
          return prev;
        }
        const updated = [...prev, { ...order, status: order.status || 'Received' }];
        try {
          window.localStorage.setItem('labelArchivedOrders', JSON.stringify(updated));
        } catch {}
        return updated;
      });
    },
  }));

  const renderStatusPill = (status) => {
    if (status === 'Received') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-600">
          <svg className="w-3.5 h-3.5" fill="#10B981" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="#10B981"/>
          </svg>
          Received
        </span>
      );
    } else if (status === 'Partially Received') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-600">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="#F97316" strokeWidth="2" fill="none"/>
            <path d="M12 2 A 10 10 0 0 1 12 22" fill="#F97316"/>
          </svg>
          Partially Received
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
            STATUS
          </div>
          <div className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider border-r border-[#3C4656] text-center">
            LABEL ORDER #
          </div>
          <div className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider text-center">
            SUPPLIER
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
});

ArchivedOrdersTable.displayName = 'ArchivedOrdersTable';

export default ArchivedOrdersTable;

