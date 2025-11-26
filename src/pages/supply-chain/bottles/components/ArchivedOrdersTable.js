import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const ArchivedOrdersTable = forwardRef(({ themeClasses }, ref) => {
  const { isDarkMode } = useTheme();

  // Archived orders data - moved from Bottles.js
  const [archivedOrders, setArchivedOrders] = useState(() => {
    try {
      const stored = window.localStorage.getItem('bottleArchivedOrders');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    return [];
  });

  // Persist archived orders to localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem('bottleArchivedOrders', JSON.stringify(archivedOrders));
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
          window.localStorage.setItem('bottleArchivedOrders', JSON.stringify(updated));
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
      style={{ 
        overflow: 'hidden',
        borderRadius: '8px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E7EB',
      }}
    >
      {/* Table header row */}
      <div style={{ backgroundColor: '#1F2937', borderRadius: '8px 8px 0 0' }}>
        <div
          className="grid"
          style={{
            gridTemplateColumns: '222px 222px 222px 120px 120px 120px 1fr',
            gap: 0,
          }}
        >
          <div className="text-xs font-bold text-white uppercase tracking-wider border-r border-[#3C4656]" style={{ 
            textAlign: 'left', 
            width: '222px',
            height: '40px',
            paddingTop: '12px',
            paddingRight: '16px',
            paddingBottom: '12px',
            paddingLeft: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            STATUS
          </div>
          <div className="text-xs font-bold text-white uppercase tracking-wider border-r border-[#3C4656]" style={{ 
            textAlign: 'left', 
            width: '222px',
            height: '40px',
            paddingTop: '12px',
            paddingRight: '16px',
            paddingBottom: '12px',
            paddingLeft: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            BOTTLE ORDER #
          </div>
          <div className="text-xs font-bold text-white uppercase tracking-wider border-r border-[#3C4656]" style={{ 
            textAlign: 'left', 
            width: '222px',
            height: '40px',
            paddingTop: '12px',
            paddingRight: '16px',
            paddingBottom: '12px',
            paddingLeft: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            SUPPLIER
          </div>
          <div className="text-xs font-bold text-white uppercase tracking-wider border-r border-[#3C4656]" style={{ textAlign: 'center', padding: '12px 8px', height: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: '1.2' }}>
            <div>ADD</div>
            <div>PRODUCTS</div>
          </div>
          <div className="text-xs font-bold text-white uppercase tracking-wider border-r border-[#3C4656]" style={{ textAlign: 'center', padding: '12px 8px', height: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: '1.2' }}>
            <div>SUBMIT</div>
            <div>PO</div>
          </div>
          <div className="text-xs font-bold text-white uppercase tracking-wider border-r border-[#3C4656]" style={{ textAlign: 'center', padding: '12px 8px', height: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: '1.2' }}>
            <div>RECEIVE</div>
            <div>PO</div>
          </div>
          <div className="text-xs font-bold text-white uppercase tracking-wider" style={{ textAlign: 'right', position: 'relative', paddingRight: '16px', paddingLeft: '0px', paddingTop: '12px', paddingBottom: '12px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
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
              className="grid text-sm"
              style={{
                gridTemplateColumns: '222px 222px 222px 120px 120px 120px 1fr',
                gap: 0,
                backgroundColor: '#FFFFFF',
                borderBottom:
                  index === archivedOrders.length - 1
                    ? 'none'
                    : '1px solid #e5e7eb',
              }}
            >
              <div className="flex items-center" style={{ 
                textAlign: 'left', 
                width: '222px',
                height: '40px',
                paddingTop: '12px',
                paddingRight: '16px',
                paddingBottom: '12px',
                paddingLeft: '16px',
                gap: '10px',
              }}>
                {renderStatusPill(order.status || 'Draft')}
              </div>
              <div className="flex items-center" style={{ 
                textAlign: 'left', 
                width: '222px',
                height: '40px',
                paddingTop: '12px',
                paddingRight: '16px',
                paddingBottom: '12px',
                paddingLeft: '16px',
                gap: '10px',
              }}>
                <span className="text-xs font-medium text-blue-600">{order.orderNumber}</span>
              </div>
              <div className="flex items-center" style={{ 
                textAlign: 'left', 
                width: '222px',
                height: '40px',
                paddingTop: '12px',
                paddingRight: '16px',
                paddingBottom: '12px',
                paddingLeft: '16px',
                gap: '10px',
              }}>
                <span style={{ textAlign: 'left', fontSize: '14px', color: '#374151' }}>{order.supplier}</span>
              </div>
              {/* ADD PRODUCTS status - always green for archived orders */}
              <div className="flex items-center justify-center" style={{ padding: '12px 8px', height: '40px' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="8" fill="#22C55E"/>
                </svg>
              </div>
              {/* SUBMIT PO status - always green for archived orders */}
              <div className="flex items-center justify-center" style={{ padding: '12px 8px', height: '40px' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="8" fill="#22C55E"/>
                </svg>
              </div>
              {/* RECEIVE PO status - always green for archived orders */}
              <div className="flex items-center justify-center" style={{ padding: '12px 8px', height: '40px' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="8" fill="#22C55E"/>
                </svg>
              </div>
              <div className="flex items-center justify-end relative" style={{ paddingRight: '16px', paddingLeft: '0px', paddingTop: '12px', paddingBottom: '12px', height: '40px', width: '100%', boxSizing: 'border-box' }}>
                <button
                  type="button"
                  className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                  style={{
                    color: '#6B7280',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  aria-label="Archived order actions"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="6" r="1.5" fill="currentColor"/>
                    <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                    <circle cx="12" cy="18" r="1.5" fill="currentColor"/>
                  </svg>
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

