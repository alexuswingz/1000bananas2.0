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

  const renderStatusIcon = (status) => {
    if (status === 'Received') {
      return (
        <svg className="w-3.5 h-3.5" fill="#10B981" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="#10B981"/>
        </svg>
      );
    } else if (status === 'Submitted') {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="6" y="4" width="12" height="16" rx="2" fill="#9333EA" stroke="none"/>
          <rect x="9" y="16" width="6" height="2" rx="1" fill="#7C3AED"/>
        </svg>
      );
    } else {
      // Draft or other
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" fill="#3B82F6"/>
          <path d="M14 2v6h6" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    }
  };

  return (
    <div
      className={`${themeClasses.cardBg} rounded-xl border ${themeClasses.border} shadow-md`}
      style={{ overflow: 'visible', position: 'relative' }}
    >
      {/* Expanded underline on corners */}
      <div
        style={{
          position: 'absolute',
          top: '40px',
          left: '-12px',
          right: '-12px',
          height: '1px',
          backgroundColor: 'rgba(255, 255, 255, 0.3)',
          zIndex: 10,
        }}
      />
      <table
        style={{
          width: '100%',
          borderCollapse: 'separate',
          borderSpacing: 0,
        }}
      >
        {/* Table header */}
        <thead 
          className={themeClasses.headerBg} 
          style={{ 
            position: 'relative',
          }}
        >
          <tr 
            style={{ 
              height: '40px',
              position: 'relative',
            }}
          >
            <th
              className="text-xs font-bold text-white uppercase tracking-wider border-r border-white"
              style={{
                padding: '12px 16px',
                textAlign: 'left',
                width: '169px',
                height: '40px',
                borderRight: '1px solid white',
                borderTopLeftRadius: '12px',
              }}
            >
              ORDER STATUS
            </th>
            <th
              className="text-xs font-bold text-white uppercase tracking-wider border-r border-white"
              style={{
                padding: '12px 16px',
                textAlign: 'left',
                width: '169px',
                height: '40px',
                borderRight: '1px solid white',
              }}
            >
              LABEL ORDER #
            </th>
            <th
              className="text-xs font-bold text-white uppercase tracking-wider border-r border-white"
              style={{
                padding: '12px 16px',
                textAlign: 'left',
                width: '169px',
                height: '40px',
                borderRight: '1px solid white',
              }}
            >
              SUPPLIER
            </th>
            <th
              className="text-xs font-bold text-white uppercase tracking-wider border-r border-white"
              style={{
                padding: '12px 16px',
                textAlign: 'center',
                width: '169px',
                height: '40px',
                borderRight: '1px solid white',
              }}
            >
              ADD PRODUCTS
            </th>
            <th
              className="text-xs font-bold text-white uppercase tracking-wider border-r border-white"
              style={{
                padding: '12px 16px',
                textAlign: 'center',
                width: '169px',
                height: '40px',
                borderRight: '1px solid white',
              }}
            >
              SUBMIT PO
            </th>
            <th
              className="text-xs font-bold text-white uppercase tracking-wider"
              style={{
                padding: '12px 16px',
                textAlign: 'center',
                width: '169px',
                height: '40px',
              }}
            >
              RECEIVE PO
            </th>
            <th
              className="text-xs font-bold text-white uppercase tracking-wider"
              style={{
                padding: '12px 16px',
                textAlign: 'right',
                width: '40px',
                height: '40px',
                borderTopRightRadius: '12px',
              }}
            >
            </th>
          </tr>
        </thead>

        {/* Table body */}
        <tbody>
          {archivedOrders.length === 0 ? (
            <tr>
              <td colSpan="7" className="px-6 py-6 text-center text-sm italic text-gray-400">
                No archived orders yet.
              </td>
            </tr>
          ) : (
            archivedOrders.map((order, index) => {
              const status = order.status || 'Received';
              
              return (
                <tr
                  key={order.id}
                  className={`text-sm ${themeClasses.rowHover} transition-colors`}
                  style={{
                    height: '40px',
                    borderTop: index === 0 ? 'none' : (isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid #e5e7eb'),
                  }}
                >
                  {/* LABEL STATUS */}
                  <td style={{ padding: '0.65rem 1rem', verticalAlign: 'middle' }}>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #D1D5DB',
                        borderRadius: '4px',
                        paddingTop: '4px',
                        paddingRight: '12px',
                        paddingBottom: '4px',
                        paddingLeft: '12px',
                        width: '145px',
                        height: '24px',
                        boxSizing: 'border-box',
                      }}
                    >
                      {renderStatusIcon(status)}
                      <span style={{ fontSize: '14px', color: '#000000', fontWeight: 400, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                        {status}
                      </span>
                    </div>
                  </td>

                  {/* LABEL ORDER # */}
                  <td style={{ padding: '0.65rem 1rem', verticalAlign: 'middle' }}>
                    <button
                      type="button"
                      style={{
                        color: '#3B82F6',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '14px',
                        textDecoration: 'none',
                      }}
                      onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                      onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                    >
                      {order.orderNumber}
                    </button>
                  </td>

                  {/* SUPPLIER */}
                  <td style={{ padding: '0.65rem 1rem', verticalAlign: 'middle' }}>
                    <span className={themeClasses.textPrimary} style={{ fontSize: '14px' }}>
                      {order.supplier}
                    </span>
                  </td>

                  {/* ADD PRODUCTS - green circle dot */}
                  <td style={{ padding: '0.65rem 1rem', textAlign: 'center', verticalAlign: 'middle' }}>
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: '#10B981',
                        margin: '0 auto',
                      }}
                    />
                  </td>

                  {/* SUBMIT PO - green circle dot */}
                  <td style={{ padding: '0.65rem 1rem', textAlign: 'center', verticalAlign: 'middle' }}>
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: '#10B981',
                        margin: '0 auto',
                      }}
                    />
                  </td>

                  {/* RECEIVE PO - green circle dot */}
                  <td style={{ padding: '0.65rem 1rem', textAlign: 'center', verticalAlign: 'middle' }}>
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: '#10B981',
                        margin: '0 auto',
                      }}
                    />
                  </td>

                  {/* Action Menu */}
                  <td style={{ padding: '0.65rem 1rem', textAlign: 'right', verticalAlign: 'middle', width: '40px' }}>
                    <button
                      type="button"
                      className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-dark-bg-tertiary transition-colors"
                      aria-label="Archived order actions"
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="5" r="1" fill="#6B7280" />
                        <circle cx="12" cy="12" r="1" fill="#6B7280" />
                        <circle cx="12" cy="19" r="1" fill="#6B7280" />
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
});

ArchivedOrdersTable.displayName = 'ArchivedOrdersTable';

export default ArchivedOrdersTable;

