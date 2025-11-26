import React, { useState, useEffect, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import { useLocation, useNavigate } from 'react-router-dom';

const OrdersTable = forwardRef(({ searchQuery = '', themeClasses, onViewOrder, onArchiveOrder, onNewOrderCreated, archivedOrdersRef }, ref) => {
  const { isDarkMode } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  // Orders data - moved from Labels.js
  const [orders, setOrders] = useState(() => {
    try {
      const stored = window.localStorage.getItem('labelOrders');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {}
    return [];
  });

  // Persist orders to localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem('labelOrders', JSON.stringify(orders));
    } catch {}
  }, [orders]);

  // Filter orders based on search query
  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders;
    const query = searchQuery.toLowerCase();
    return orders.filter(
      (order) =>
        order.orderNumber.toLowerCase().includes(query) ||
        order.supplier.toLowerCase().includes(query)
    );
  }, [orders, searchQuery]);

  // Handle new order from navigation state
  useEffect(() => {
    const newOrderState = location.state && location.state.newLabelOrder;
    if (newOrderState) {
      const { orderNumber: newOrderNumber, supplierName, lines } = newOrderState;
      setOrders((prev) => {
        // Check for duplicates in the current state
        const existing = prev.find(
          (o) => o.orderNumber === newOrderNumber && o.supplier === supplierName
        );
        if (existing) {
          return prev;
        }

        const newOrder = {
          id: Date.now(),
          status: 'Submitted',
          orderNumber: newOrderNumber,
          supplier: supplierName,
          lines: lines || [], // Save the lines data with the order
        };

        const updated = [newOrder, ...prev];
        try {
          window.localStorage.setItem('labelOrders', JSON.stringify(updated));
        } catch {}
        
        // Clear navigation state to prevent re-processing
        if (window.history && window.history.replaceState) {
          window.history.replaceState({ ...location.state, newLabelOrder: null }, '');
        }
        
        if (onNewOrderCreated) {
          onNewOrderCreated();
        }
        
        return updated;
      });
    }
  }, [location.state, onNewOrderCreated]);

  // Handle received order from navigation state
  useEffect(() => {
    const receivedOrderId = location.state && location.state.receivedOrderId;
    
    if (receivedOrderId) {
      setOrders((prev) => {
        const orderToArchive = prev.find((o) => o.id === receivedOrderId);
        if (!orderToArchive) return prev;
        
        const remaining = prev.filter((o) => o.id !== receivedOrderId);
        try {
          window.localStorage.setItem('labelOrders', JSON.stringify(remaining));
        } catch (err) {
          console.error('Failed to update label orders in localStorage', err);
        }
        
        // Add to archived orders with "Received" status
        const archivedOrder = { ...orderToArchive, status: 'Received' };
        if (archivedOrdersRef && archivedOrdersRef.current) {
          archivedOrdersRef.current.addArchivedOrder(archivedOrder);
        }
        
        return remaining;
      });
    }
  }, [location.state, archivedOrdersRef]);

  // Expose function to archive order (for parent component)
  useImperativeHandle(ref, () => ({
    archiveOrder: (order) => {
      handleArchiveOrder(order);
    },
    updateOrder: (orderId, updates) => {
      setOrders((prev) => {
        const updated = prev.map((order) => {
          if (order.id === orderId) {
            return { ...order, ...updates };
          }
          return order;
        });
        try {
          window.localStorage.setItem('labelOrders', JSON.stringify(updated));
        } catch {}
        return updated;
      });
    },
    getOrderById: (orderId) => {
      return orders.find((order) => order.id === orderId);
    },
  }));

  const handleArchiveOrder = (order) => {
    // Remove from active orders FIRST to ensure it disappears immediately from the UI
    setOrders((prev) => {
      const remaining = prev.filter((o) => o.id !== order.id);
      
      // Save to localStorage immediately to persist the change
      try {
        window.localStorage.setItem('labelOrders', JSON.stringify(remaining));
      } catch (err) {
        console.error('Failed to save to localStorage', err);
      }
      
      return remaining;
    });
    
    // Add to archived orders
    if (archivedOrdersRef && archivedOrdersRef.current) {
      archivedOrdersRef.current.addArchivedOrder({
        ...order,
        status: order.status || 'Draft'
      });
    }
    
    // Call parent callback to switch to archive tab
    if (onArchiveOrder) {
      onArchiveOrder(order);
    }
  };

  const [orderActionMenuId, setOrderActionMenuId] = useState(null);
  const [editingStatusId, setEditingStatusId] = useState(null);
  const menuRefs = useRef({});
  const buttonRefs = useRef({});
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });

  const statusOptions = ['Draft', 'Submitted', 'Received', 'Partially Received'];

  const statusStyles = {
    Draft: { bg: 'bg-blue-100', text: 'text-blue-700' },
    Submitted: { bg: 'bg-purple-100', text: 'text-purple-700' },
    Received: { bg: 'bg-green-50', text: 'text-green-600' },
    'Partially Received': { bg: 'bg-orange-50', text: 'text-orange-600' },
  };

  // Calculate dropdown position and handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (orderActionMenuId) {
        const menuElement = menuRefs.current[orderActionMenuId];
        const buttonElement = event.target.closest('[data-menu-button]');
        
        if (menuElement && !menuElement.contains(event.target) && buttonElement?.dataset.menuButton !== orderActionMenuId) {
          setOrderActionMenuId(null);
        }
      }
    };

    // Calculate position when menu opens
    if (orderActionMenuId) {
      const buttonElement = buttonRefs.current[orderActionMenuId];
      if (buttonElement) {
        const rect = buttonElement.getBoundingClientRect();
        setMenuPosition({
          top: rect.bottom + window.scrollY,
          right: window.innerWidth - rect.right,
        });
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [orderActionMenuId]);

  const renderStatusIcon = (status) => {
    if (status === 'Submitted') {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Document/screen icon with rounded corners */}
          <rect x="6" y="4" width="12" height="16" rx="2" fill="#9333EA" stroke="none"/>
          {/* Darker purple rectangle at bottom center */}
          <rect x="9" y="16" width="6" height="2" rx="1" fill="#7C3AED"/>
        </svg>
      );
    } else {
      // Draft
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" fill="#3B82F6"/>
          <path d="M14 2v6h6" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    }
  };

  const renderStatusPill = (order) => {
    const status = order.status || 'Draft';
    const style = statusStyles[status] || statusStyles.Draft;
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}>
        {renderStatusIcon(status)}
        {status}
      </span>
    );
  };

  const handleStatusChange = (orderId, newStatus) => {
    setOrders((prev) => {
      const updated = prev.map((o) =>
        o.id === orderId ? { ...o, status: newStatus } : o
      );
      try {
        window.localStorage.setItem('labelOrders', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    setEditingStatusId(null);
  };

  // Helper function to determine step completion status
  const getStepStatus = (order, step) => {
    const status = order.status || 'Draft';
    if (step === 'addProducts') {
      return status !== 'Draft'; // Completed if not draft
    } else if (step === 'submitPO') {
      return status === 'Submitted' || status === 'Received' || status === 'Partially Received';
    } else if (step === 'receivePO') {
      return status === 'Received' || status === 'Partially Received';
    }
    return false;
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
                padding: '0 1rem',
                textAlign: 'left',
                width: '140px',
              }}
            >
              LABEL STATUS
            </th>
            <th
              className="text-xs font-bold text-white uppercase tracking-wider border-r border-white"
              style={{
                padding: '0 1rem',
                textAlign: 'left',
                width: '150px',
              }}
            >
              LABEL ORDER #
            </th>
            <th
              className="text-xs font-bold text-white uppercase tracking-wider border-r border-white"
              style={{
                padding: '0 1rem',
                textAlign: 'left',
                width: '150px',
              }}
            >
              SUPPLIER
            </th>
             <th
               className="text-xs font-bold text-white uppercase tracking-wider border-r border-white"
               style={{
                 padding: '0 1rem',
                 textAlign: 'center',
                 width: '90px',
               }}
             >
               ADD PRODUCTS
             </th>
             <th
               className="text-xs font-bold text-white uppercase tracking-wider border-r border-white"
               style={{
                 padding: '0 1rem',
                 textAlign: 'center',
                 width: '90px',
               }}
             >
               SUBMIT PO
             </th>
             <th
               className="text-xs font-bold text-white uppercase tracking-wider border-r border-white"
               style={{
                 padding: '0 1rem',
                 textAlign: 'center',
                 width: '90px',
               }}
             >
               RECEIVE PO
             </th>
             <th
               className="text-xs font-bold text-white uppercase tracking-wider"
               style={{
                 padding: '0 1rem',
                 textAlign: 'center',
                 width: '40px',
               }}
             >
             </th>
          </tr>
        </thead>

        {/* Table body */}
        <tbody>
          {filteredOrders.length === 0 ? (
            <tr>
              <td colSpan="7" className="px-6 py-6 text-center text-sm italic text-gray-400">
                No orders yet.
              </td>
            </tr>
          ) : (
            filteredOrders.map((order, index) => {
              const status = order.status || 'Draft';
              const isSubmitted = status === 'Submitted' || status === 'Received' || status === 'Partially Received';
              const isDraft = status === 'Draft';
              
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => onViewOrder(order)}
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
                      {/* Edited badge - only show if order was edited */}
                      {order.isEdited && (
                        <span
                          style={{
                            backgroundColor: '#FED7AA', // Light orange background
                            color: '#C2410C', // Darker orange/brown text
                            fontSize: '11px',
                            fontWeight: 500,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontFamily: 'system-ui, -apple-system, sans-serif',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Edited
                        </span>
                      )}
                    </div>
                  </td>

                  {/* SUPPLIER */}
                  <td style={{ padding: '0.65rem 1rem', verticalAlign: 'middle' }}>
                    <span className={themeClasses.textPrimary} style={{ fontSize: '14px' }}>
                      {order.supplier}
                    </span>
                  </td>

                  {/* ADD PRODUCTS */}
                  <td style={{ padding: '0.65rem 1rem', textAlign: 'center', verticalAlign: 'middle' }}>
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: getStepStatus(order, 'addProducts') ? (isDraft ? '#3B82F6' : '#10B981') : '#FFFFFF',
                        border: getStepStatus(order, 'addProducts') ? 'none' : '2px solid #D1D5DB',
                        margin: '0 auto',
                      }}
                    />
                  </td>

                  {/* SUBMIT PO */}
                  <td style={{ padding: '0.65rem 1rem', textAlign: 'center', verticalAlign: 'middle' }}>
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: getStepStatus(order, 'submitPO') ? '#10B981' : '#FFFFFF',
                        border: getStepStatus(order, 'submitPO') ? 'none' : '2px solid #D1D5DB',
                        margin: '0 auto',
                      }}
                    />
                  </td>

                  {/* RECEIVE PO */}
                  <td style={{ padding: '0.65rem 1rem', textAlign: 'center', verticalAlign: 'middle' }}>
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: getStepStatus(order, 'receivePO') ? '#10B981' : '#FFFFFF',
                        border: getStepStatus(order, 'receivePO') ? 'none' : '2px solid #D1D5DB',
                        margin: '0 auto',
                      }}
                    />
                  </td>

                  {/* Action Menu */}
                  <td style={{ padding: '0.65rem 1rem', textAlign: 'center', verticalAlign: 'middle' }}>
                    <div className="relative">
                      <button
                        ref={(el) => (buttonRefs.current[order.id] = el)}
                        type="button"
                        data-menu-button={order.id}
                        className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-dark-bg-tertiary transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOrderActionMenuId((prev) => (prev === order.id ? null : order.id));
                        }}
                        aria-label="Order actions"
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

                      {orderActionMenuId === order.id && (
                        <div
                          ref={(el) => (menuRefs.current[order.id] = el)}
                          className="fixed bg-white border border-gray-200 rounded-md shadow-lg text-xs z-50 min-w-[120px]"
                          style={{
                            top: `${menuPosition.top}px`,
                            right: `${menuPosition.right}px`,
                          }}
                        >
                          <button
                            type="button"
                            className={`w-full flex items-center gap-2 px-3 py-2.5 ${themeClasses.rowHover} ${themeClasses.textPrimary} transition-colors`}
                            onClick={() => {
                              onViewOrder(order);
                              setOrderActionMenuId(null);
                            }}
                          >
                            <span className={themeClasses.textSecondary}>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </span>
                            View
                          </button>
                        </div>
                      )}
                    </div>
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

OrdersTable.displayName = 'OrdersTable';

export default OrdersTable;

