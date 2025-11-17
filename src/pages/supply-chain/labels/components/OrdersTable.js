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
      const { orderNumber: newOrderNumber, supplierName } = newOrderState;
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
    archiveOrder: (orderId) => {
      setOrders((prev) => {
        const orderToArchive = prev.find((o) => o.id === orderId);
        if (!orderToArchive) return prev;
        
        const remaining = prev.filter((o) => o.id !== orderId);
        try {
          window.localStorage.setItem('labelOrders', JSON.stringify(remaining));
        } catch {}
        
        if (archivedOrdersRef && archivedOrdersRef.current) {
          archivedOrdersRef.current.addArchivedOrder({ ...orderToArchive, status: 'Received' });
        }
        
        return remaining;
      });
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
    if (status === 'Received') {
      return (
        <svg className="w-3.5 h-3.5" fill="#10B981" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="#10B981"/>
        </svg>
      );
    } else if (status === 'Partially Received') {
      return (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="#F97316" strokeWidth="2" fill="none"/>
          <path d="M12 2 A 10 10 0 0 1 12 22" fill="#F97316"/>
        </svg>
      );
    } else if (status === 'Submitted') {
      return (
        <svg className="w-3.5 h-3.5" fill="#9333EA" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <rect x="6" y="6" width="12" height="12" rx="2" fill="#9333EA"/>
        </svg>
      );
    } else {
      // Draft
      return (
        <svg className="w-3.5 h-3.5" fill="#3B82F6" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" fill="#3B82F6"/>
          <path d="M14 2v6h6" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="9" y1="13" x2="15" y2="13" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="9" y1="17" x2="15" y2="17" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
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
        {filteredOrders.length === 0 ? (
          <div className="px-6 py-6 text-center text-sm italic text-gray-400">
            No orders yet.
          </div>
        ) : (
          filteredOrders.map((order, index) => (
            <div
              key={order.id}
              className={`grid text-sm ${themeClasses.rowHover} transition-colors`}
              style={{
                gridTemplateColumns: '140px 2fr 2fr',
                borderBottom:
                  index === filteredOrders.length - 1
                    ? 'none'
                    : isDarkMode
                    ? '1px solid rgba(75,85,99,0.3)'
                    : '1px solid #e5e7eb',
              }}
            >
              <div className="px-6 py-3 flex items-center justify-center">
                {editingStatusId === order.id ? (
                  <select
                    value={order.status || 'Draft'}
                    onChange={(e) => handleStatusChange(order.id, e.target.value)}
                    onBlur={() => setEditingStatusId(null)}
                    className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
                    autoFocus
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingStatusId(order.id)}
                    className="w-full"
                  >
                    {renderStatusPill(order)}
                  </button>
                )}
              </div>
              <div className="px-6 py-3 flex items-center">
                <button
                  type="button"
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 underline-offset-2 hover:underline"
                  onClick={() => onViewOrder(order)}
                >
                  {order.orderNumber}
                </button>
              </div>
              <div className="px-6 py-3 flex items-center justify-between relative">
                <span className={themeClasses.textPrimary}>{order.supplier}</span>

                <div className="relative">
                  <button
                    ref={(el) => (buttonRefs.current[order.id] = el)}
                    type="button"
                    data-menu-button={order.id}
                    className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-dark-bg-tertiary transition-colors ml-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOrderActionMenuId((prev) => (prev === order.id ? null : order.id));
                    }}
                    aria-label="Order actions"
                  >
                    <span className={themeClasses.textSecondary}>⋮</span>
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
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
});

OrdersTable.displayName = 'OrdersTable';

export default OrdersTable;

