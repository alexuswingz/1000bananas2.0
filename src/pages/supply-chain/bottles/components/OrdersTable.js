import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import { useLocation } from 'react-router-dom';

const OrdersTable = ({ searchQuery = '', themeClasses, onViewOrder, onArchiveOrder, onNewOrderCreated, archivedOrdersRef }) => {
  const { isDarkMode } = useTheme();
  const location = useLocation();

  // Orders data - moved from Bottles.js
  const [orders, setOrders] = useState(() => {
    try {
      const stored = window.localStorage.getItem('bottleOrders');
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
      window.localStorage.setItem('bottleOrders', JSON.stringify(orders));
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
    const newOrderState = location.state && location.state.newBottleOrder;
    if (newOrderState) {
      const { orderNumber: newOrderNumber, supplierName } = newOrderState;
      setOrders((prev) => {
        // Check for duplicates in the current state
        const existing = prev.find(
          (o) => o.orderNumber === newOrderNumber && o.supplier === supplierName
        );
        if (!existing) {
          const newOrder = {
            id: Date.now(),
            orderNumber: newOrderNumber,
            supplier: supplierName,
            status: 'Submitted',
          };
          if (onNewOrderCreated) {
            onNewOrderCreated();
          }
          return [...prev, newOrder];
        }
        return prev;
      });
      // Clear the navigation state to prevent re-processing
      if (window.history && window.history.replaceState) {
        window.history.replaceState({ ...location.state, newBottleOrder: null }, '');
      }
    }
  }, [location.state, onNewOrderCreated]);

  const handleArchiveOrder = (order) => {
    // Remove from active orders FIRST to ensure it disappears immediately from the UI
    setOrders((prev) => {
      // Double-check: filter out the order by ID
      const remaining = prev.filter((o) => {
        const shouldKeep = o.id !== order.id;
        return shouldKeep;
      });
      
      // Save to localStorage immediately to persist the change
      try {
        window.localStorage.setItem('bottleOrders', JSON.stringify(remaining));
      } catch (err) {
        console.error('Failed to save to localStorage', err);
      }
      
      return remaining;
    });
    
    // Add to archived orders
    if (archivedOrdersRef && archivedOrdersRef.current) {
      // Preserve the order status when archiving
      archivedOrdersRef.current.addArchivedOrder({
        ...order,
        status: order.status || 'Draft'
      });
    } else {
      // Fallback: save directly to localStorage if ref not available
      try {
        const stored = window.localStorage.getItem('bottleArchivedOrders');
        const existing = stored ? JSON.parse(stored) : [];
        if (!existing.some((o) => o.id === order.id)) {
          const updated = [...existing, { ...order, status: order.status || 'Draft' }];
          window.localStorage.setItem('bottleArchivedOrders', JSON.stringify(updated));
        }
      } catch (err) {
        console.error('Failed to save to localStorage', err);
      }
    }
    
    // Call parent callback to switch to archive tab
    if (onArchiveOrder) {
      onArchiveOrder(order);
    }
  };

  // Handle received orders (from navigation state)
  useEffect(() => {
    const receivedOrderId = location.state && location.state.receivedOrderId;
    const isPartial = location.state && location.state.isPartial;
    
    if (receivedOrderId) {
      setOrders((prev) => {
        const order = prev.find((o) => o.id === receivedOrderId);
        if (order) {
          if (isPartial) {
            // Partial receive - update status and keep in orders
            const updated = prev.map((o) =>
              o.id === receivedOrderId
                ? { ...o, status: 'Partially Received' }
                : o
            );
            try {
              window.localStorage.setItem('bottleOrders', JSON.stringify(updated));
            } catch {}
            return updated;
          } else {
            // Full receive - set status to "Received" and archive the order
            const orderWithReceivedStatus = { ...order, status: 'Received' };
            // Remove from active orders
            const remaining = prev.filter((o) => o.id !== receivedOrderId);
            try {
              window.localStorage.setItem('bottleOrders', JSON.stringify(remaining));
            } catch {}
            // Archive the order with "Received" status
            if (archivedOrdersRef && archivedOrdersRef.current) {
              archivedOrdersRef.current.addArchivedOrder(orderWithReceivedStatus);
            }
            if (onArchiveOrder) {
              onArchiveOrder(orderWithReceivedStatus);
            }
            return remaining;
          }
        }
        return prev;
      });
      // Clear the navigation state to prevent re-processing
      if (window.history && window.history.replaceState) {
        window.history.replaceState({ ...location.state, receivedOrderId: null, isPartial: null }, '');
      }
    }
  }, [location.state, archivedOrdersRef, onArchiveOrder]);

  const [orderActionMenuId, setOrderActionMenuId] = useState(null);
  const [editingStatusId, setEditingStatusId] = useState(null);
  const menuRefs = useRef({});
  const buttonRefs = useRef({});
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  const statusOptions = ['Draft', 'Submitted', 'Received', 'Partially Received'];

  const statusStyles = {
    Draft: { bg: 'bg-blue-100', text: 'text-blue-700' },
    Submitted: { bg: 'bg-purple-100', text: 'text-purple-700' },
    Received: { bg: 'bg-green-50', text: 'text-green-600' },
    'Partially Received': { bg: 'bg-orange-100', text: 'text-orange-700' },
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
          top: rect.bottom + 4,
          left: rect.right - 100, // Position to the left of the button
        });
      }
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [orderActionMenuId]);

  const renderStatusIcon = (status) => {
    switch (status) {
      case 'Draft':
        return (
          <svg className="w-3.5 h-3.5" fill="#3B82F6" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" fill="#3B82F6"/>
            <path d="M14 2v6h6" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="9" y1="13" x2="15" y2="13" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="9" y1="17" x2="15" y2="17" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        );
      case 'Submitted':
        return (
          <svg className="w-3.5 h-3.5" fill="#9333EA" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <rect x="6" y="6" width="12" height="12" rx="2" fill="#9333EA"/>
            <path d="M12 16l-3-3m0 0l3-3m-3 3h6" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'Received':
        return (
          <svg className="w-3.5 h-3.5" fill="#10B981" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="#10B981"/>
          </svg>
        );
      case 'Partially Received':
        return (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="#F97316" strokeWidth="1.5" fill="none"/>
            <path d="M 2 12 A 10 10 0 0 1 22 12 L 12 12 Z" fill="#F97316"/>
          </svg>
        );
      default:
        return null;
    }
  };

  const renderStatusPill = (order) => {
    const status = order.status || 'Draft';
    const style = statusStyles[status] || {
      bg: 'bg-gray-100',
      text: 'text-gray-700',
    };
    const isEditing = editingStatusId === order.id;

    const handleStatusChange = (orderId, newStatus) => {
      setOrders((prev) => {
        const updated = prev.map((o) =>
          o.id === orderId ? { ...o, status: newStatus } : o
        );
        try {
          window.localStorage.setItem('bottleOrders', JSON.stringify(updated));
        } catch {}
        return updated;
      });
    };

    if (isEditing) {
      return (
        <div className="relative">
          <select
            autoFocus
            value={status}
            onChange={(e) => {
              handleStatusChange(order.id, e.target.value);
              setEditingStatusId(null);
            }}
            onBlur={() => setEditingStatusId(null)}
            className={`${style.bg} ${style.text} border-2 border-blue-500 rounded-full text-xs font-semibold px-3 py-1 pr-8 appearance-none cursor-pointer`}
            onClick={(e) => e.stopPropagation()}
          >
            {statusOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setEditingStatusId(order.id);
        }}
        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${style.bg} ${style.text} hover:opacity-80 transition-opacity cursor-pointer`}
      >
        {renderStatusIcon(status)}
        {status}
      </button>
    );
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
        {filteredOrders.map((order, index) => (
          <div
            key={order.id}
            className="grid text-sm"
            style={{
              gridTemplateColumns: '222px 222px 222px 120px 120px 120px 1fr',
              gap: 0,
              backgroundColor: '#FFFFFF',
              borderBottom:
                index === filteredOrders.length - 1
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
              {renderStatusPill(order)}
            </div>
            <div className="flex items-center gap-2" style={{ 
              textAlign: 'left', 
              width: '222px',
              height: '40px',
              paddingTop: '12px',
              paddingRight: '16px',
              paddingBottom: '12px',
              paddingLeft: '16px',
              gap: '10px',
            }}>
              <button
                type="button"
                className="text-xs font-medium text-blue-600 hover:text-blue-700 underline-offset-2 hover:underline"
                onClick={() => onViewOrder(order)}
                style={{ textAlign: 'left' }}
              >
                {order.orderNumber}
              </button>
              {order.status === 'Partially Received' && (
                <button
                  type="button"
                  onClick={() => handleArchiveOrder(order)}
                  className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded-full hover:bg-blue-700"
                >
                  Archive
                </button>
              )}
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
            {/* ADD PRODUCTS status */}
            <div className="flex items-center justify-center" style={{ padding: '12px 8px', height: '40px' }}>
              {(() => {
                const isCompleted = order.status === 'Submitted' || order.status === 'Received' || order.status === 'Partially Received' || order.status === 'Draft';
                return isCompleted ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="8" fill="#22C55E"/>
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="8"/>
                  </svg>
                );
              })()}
            </div>
            {/* SUBMIT PO status */}
            <div className="flex items-center justify-center" style={{ padding: '12px 8px', height: '40px' }}>
              {(() => {
                const isCompleted = order.status === 'Submitted' || order.status === 'Received' || order.status === 'Partially Received' || order.status === 'Draft';
                return isCompleted ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="8" fill="#22C55E"/>
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="8"/>
                  </svg>
                );
              })()}
            </div>
            {/* RECEIVE PO status */}
            <div className="flex items-center justify-center" style={{ padding: '12px 8px', height: '40px' }}>
              {(() => {
                const isCompleted = order.status === 'Received' || order.status === 'Partially Received';
                return isCompleted ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="8" fill="#22C55E"/>
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="8"/>
                  </svg>
                );
              })()}
            </div>
            <div className="flex items-center justify-end relative" style={{ paddingRight: '16px', paddingLeft: '0px', paddingTop: '12px', paddingBottom: '12px', height: '40px', width: '100%', boxSizing: 'border-box' }}>
              <button
                ref={(el) => (buttonRefs.current[order.id] = el)}
                type="button"
                data-menu-button={order.id}
                className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                style={{
                  color: '#6B7280',
                  backgroundColor: 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setOrderActionMenuId((prev) => (prev === order.id ? null : order.id));
                }}
                aria-label="Order actions"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="6" r="1.5" fill="currentColor"/>
                  <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                  <circle cx="12" cy="18" r="1.5" fill="currentColor"/>
                </svg>
              </button>
            </div>
          </div>
        ))}

        {filteredOrders.length === 0 && (
          <div className="px-6 py-6 text-center text-sm italic text-gray-400">
            No bottle orders yet. Click &quot;New Order&quot; to create one.
          </div>
        )}
      </div>

      {/* Dropdown menu portal - rendered outside overflow container */}
      {orderActionMenuId && (
        <div
          ref={(el) => (menuRefs.current[orderActionMenuId] = el)}
          className={`fixed z-[9999] ${themeClasses.cardBg} ${themeClasses.border} border rounded-lg shadow-xl text-xs`}
          style={{
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`,
            minWidth: '100px',
            backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
            borderColor: isDarkMode ? '#374151' : '#E5E7EB',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {orders
            .filter((order) => order.id === orderActionMenuId)
            .map((order) => (
              <button
                key={order.id}
                type="button"
                className={`w-full flex items-center gap-2 px-3 py-2.5 ${themeClasses.rowHover} ${themeClasses.textPrimary} transition-colors rounded-lg`}
                onClick={() => {
                  if (onViewOrder) {
                    onViewOrder(order);
                  }
                  setOrderActionMenuId(null);
                }}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                <span className="font-medium">Edit</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
};

export default OrdersTable;

