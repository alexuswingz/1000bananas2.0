import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import { useLocation } from 'react-router-dom';

const OrdersTable = ({ searchQuery = '', themeClasses, onViewOrder, onArchiveOrder, onStatusChange, archivedOrdersRef, onNewOrderCreated }) => {
  const { isDarkMode } = useTheme();
  const location = useLocation();
  const [orderActionMenuId, setOrderActionMenuId] = useState(null);
  const [editingStatusId, setEditingStatusId] = useState(null);
  const menuRefs = useRef({});
  const buttonRefs = useRef({});
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });

  // Orders data - manage own state like labels
  const [orders, setOrders] = useState(() => {
    try {
      const stored = window.localStorage.getItem('closureOrders');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Filter out the two sample orders: "514413413" and "43145"
          const cleaned = parsed.filter((order) => 
            order.orderNumber !== '514413413' && order.orderNumber !== '43145'
          );
          // Update localStorage with cleaned data if any were removed
          if (cleaned.length !== parsed.length) {
            window.localStorage.setItem('closureOrders', JSON.stringify(cleaned));
          }
          return cleaned;
        }
      }
    } catch {}
    return [];
  });

  // Persist orders to localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem('closureOrders', JSON.stringify(orders));
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
    const newOrderState = location.state && location.state.newClosureOrder;
    if (newOrderState) {
      const { orderNumber: newOrderNumber, supplierName, lines } = newOrderState;

      setOrders((prev) => {
        // Check for duplicates
        const existing = prev.find(
          (o) => o.orderNumber === newOrderNumber && o.supplier === supplierName
        );
        if (existing) {
          return prev;
        }

        const newOrder = {
          id: Date.now(),
          status: 'In Progress',
          orderNumber: newOrderNumber,
          supplier: supplierName,
          lines: lines || [],
        };

        const updated = [newOrder, ...prev];
        try {
          window.localStorage.setItem('closureOrders', JSON.stringify(updated));
        } catch {}
        
        // Clear navigation state to prevent re-processing
        if (window.history && window.history.replaceState) {
          window.history.replaceState({ ...location.state, newClosureOrder: null }, '');
        }
        
        if (onNewOrderCreated) {
          onNewOrderCreated();
        }
        
        return updated;
      });
    }
  }, [location.state, onNewOrderCreated]);

  // Archive order function (matching boxes/bottles pattern)
  const handleArchiveOrder = (order) => {
    // Remove from active orders FIRST and save immediately to localStorage
    setOrders((prev) => {
      const remaining = prev.filter((o) => o.id !== order.id);
      // Save immediately to localStorage before component unmounts
      try {
        window.localStorage.setItem('closureOrders', JSON.stringify(remaining));
      } catch (err) {
        console.error('Failed to save to localStorage', err);
      }
      return remaining;
    });
    
    // Add to archived orders
    if (archivedOrdersRef && archivedOrdersRef.current) {
      // Partial orders should become Received when archived
      archivedOrdersRef.current.addArchivedOrder({
        ...order,
        status: order.status === 'Partial' ? 'Received' : (order.status || 'Draft')
      });
    } else {
      // Fallback: save directly to localStorage if ref not available
      try {
        const stored = window.localStorage.getItem('closureArchivedOrders');
        const existing = stored ? JSON.parse(stored) : [];
        if (!existing.some((o) => o.id === order.id)) {
          const updated = [...existing, { 
            ...order, 
            status: order.status === 'Partial' ? 'Received' : (order.status || 'Draft')
          }];
          window.localStorage.setItem('closureArchivedOrders', JSON.stringify(updated));
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

  // Handle received orders (from navigation state) - matching bottles pattern
  useEffect(() => {
    const receivedOrderId = location.state && location.state.receivedOrderId;
    const isPartial = location.state && location.state.isPartial;
    
    if (receivedOrderId) {
      console.log('🔍 Received order ID:', receivedOrderId, 'isPartial:', isPartial);
      
      setOrders((prev) => {
        console.log('🔎 Looking for order with ID:', receivedOrderId);
        console.log('📋 Available orders:', prev.map(o => ({ id: o.id, orderNumber: o.orderNumber })));
        
        const order = prev.find((o) => o.id === receivedOrderId);
        console.log('✅ Found order:', order);
        
        if (order) {
          if (isPartial) {
            // Partial receive - update status and keep in orders
            const updated = prev.map((o) =>
              o.id === receivedOrderId
                ? { ...o, status: 'Partial' }
                : o
            );
            try {
              window.localStorage.setItem('closureOrders', JSON.stringify(updated));
            } catch {}
            console.log('📝 Updated to Partial status');
            return updated;
          } else {
            // Full receive - archive the order
            console.log('🗄️ Archiving order:', order);
            // Remove from active orders
            const remaining = prev.filter((o) => o.id !== receivedOrderId);
            try {
              window.localStorage.setItem('closureOrders', JSON.stringify(remaining));
            } catch {}
            // Archive the order with Received status
            const archivedOrder = { ...order, status: 'Received' };
            if (archivedOrdersRef && archivedOrdersRef.current) {
              archivedOrdersRef.current.addArchivedOrder(archivedOrder);
              console.log('✅ Added to archived orders');
            } else {
              console.log('⚠️ archivedOrdersRef not available');
            }
            if (onArchiveOrder) {
              onArchiveOrder(archivedOrder);
              console.log('✅ Called onArchiveOrder callback');
            }
            return remaining;
          }
        } else {
          console.log('❌ Order not found!');
        }
        return prev;
      });
      // Clear the navigation state to prevent re-processing
      if (window.history && window.history.replaceState) {
        window.history.replaceState({ ...location.state, receivedOrderId: null, isPartial: null }, '');
      }
    }
  }, [location.state, archivedOrdersRef, onArchiveOrder]);

  const computedThemeClasses = themeClasses ? themeClasses : {
    cardBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    headerBg: isDarkMode ? 'bg-[#2C3544]' : 'bg-[#2C3544]',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    rowHover: isDarkMode ? 'hover:bg-dark-bg-tertiary' : 'hover:bg-gray-50',
    textPrimary: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
  };

  const statusOptions = ['In Progress', 'Partial', 'Draft', 'Submitted', 'Received', 'Partially Received'];

  const statusStyles = {
    Draft: { bg: 'bg-blue-100', text: 'text-blue-700' },
    Submitted: { bg: 'bg-purple-100', text: 'text-purple-700' },
    Received: { bg: 'bg-green-50', text: 'text-green-600' },
    'Partially Received': { bg: 'bg-blue-100', text: 'text-blue-700' },
    // Legacy statuses for backward compatibility
    'In Progress': { bg: 'bg-blue-100', text: 'text-blue-700' },
    'Partial': { bg: 'bg-blue-100', text: 'text-blue-700' },
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
          top: rect.bottom + window.scrollY + 4,
          right: window.innerWidth - rect.right - window.scrollX,
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
      case 'In Progress':
        // Blue loading/spinning icon (starburst pattern with 8 radiating lines)
        return (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <g stroke="#3B82F6" strokeWidth="2" strokeLinecap="round">
              <line x1="12" y1="2" x2="12" y2="4"/>
              <line x1="12" y1="20" x2="12" y2="22"/>
              <line x1="2" y1="12" x2="4" y2="12"/>
              <line x1="20" y1="12" x2="22" y2="12"/>
              <line x1="5.66" y1="5.66" x2="6.83" y2="6.83"/>
              <line x1="17.17" y1="17.17" x2="18.34" y2="18.34"/>
              <line x1="18.34" y1="5.66" x2="17.17" y2="6.83"/>
              <line x1="6.83" y1="17.17" x2="5.66" y2="18.34"/>
            </g>
          </svg>
        );
      case 'Partial':
        // Blue half-filled circle
        return (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="#3B82F6" strokeWidth="1.5" fill="none"/>
            <path d="M 2 12 A 10 10 0 0 1 22 12 L 12 12 Z" fill="#3B82F6"/>
          </svg>
        );
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
            <circle cx="12" cy="12" r="10" stroke="#3B82F6" strokeWidth="1.5" fill="none"/>
            <path d="M 2 12 A 10 10 0 0 1 22 12 L 12 12 Z" fill="#3B82F6"/>
          </svg>
        );
      default:
        return null;
    }
  };

  const renderStatusPill = (order) => {
    const status = order.status || 'In Progress';
    const style = statusStyles[status] || {
      bg: 'bg-gray-100',
      text: 'text-gray-700',
    };
    const isEditing = editingStatusId === order.id;

    if (isEditing) {
      return (
        <div className="relative">
          <select
            autoFocus
            value={status}
            onChange={(e) => {
              setOrders((prev) => {
                const updated = prev.map((o) =>
                  o.id === order.id ? { ...o, status: e.target.value } : o
                );
                try {
                  window.localStorage.setItem('closureOrders', JSON.stringify(updated));
                } catch {}
                return updated;
              });
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
      className={`${computedThemeClasses.cardBg} rounded-xl border ${computedThemeClasses.border} shadow-md`}
      style={{ overflow: 'hidden' }}
    >
      {/* Table header row */}
      <div className={computedThemeClasses.headerBg}>
        <div
          className="grid"
          style={{
            gridTemplateColumns: '140px 2fr 2fr 120px',
          }}
        >
          <div className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider border-r border-[#3C4656] text-center">
            Status
          </div>
          <div className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider border-r border-[#3C4656] text-center">
            CAP Order #
          </div>
          <div className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider border-r border-[#3C4656] text-center">
            Supplier
          </div>
          <div className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider text-center">
            Action
          </div>
        </div>
      </div>

      {/* Table body */}
      <div>
        {filteredOrders.length === 0 ? (
          <div className="px-6 py-6 text-center text-sm italic text-gray-400">
            No closure orders yet. Click &quot;New Order&quot; to create one.
          </div>
        ) : (
          filteredOrders.map((order, index) => (
            <div
              key={order.id}
              className={`grid text-sm ${computedThemeClasses.rowHover} transition-colors`}
              style={{
                gridTemplateColumns: '140px 2fr 2fr 120px',
                borderBottom:
                  index === filteredOrders.length - 1
                    ? 'none'
                    : isDarkMode
                    ? '1px solid rgba(75,85,99,0.3)'
                    : '1px solid #e5e7eb',
              }}
            >
              <div className="px-6 py-3 flex items-center justify-center">
                {renderStatusPill(order)}
              </div>
              <div className="px-6 py-3 flex items-center gap-2">
                <span className="text-xs font-medium text-gray-900">{order.orderNumber}</span>
                {order.status === 'Partial' && (
                  <button
                    type="button"
                    onClick={() => handleArchiveOrder(order)}
                    className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded-full hover:bg-blue-700"
                  >
                    Archive
                  </button>
                )}
              </div>
              <div className="px-6 py-3 flex items-center justify-between relative">
                <span className={computedThemeClasses.textPrimary}>{order.supplier}</span>

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
                    <span className={computedThemeClasses.textSecondary}>⋮</span>
                  </button>
                </div>
              </div>
              <div className="px-6 py-3 flex items-center justify-center">
                <button
                  type="button"
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 underline-offset-2 hover:underline"
                  onClick={() => onViewOrder(order)}
                >
                  View
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Dropdown menu portal - rendered outside overflow container */}
      {orderActionMenuId && (
        <div
          ref={(el) => (menuRefs.current[orderActionMenuId] = el)}
          className={`fixed z-[9999] w-32 ${computedThemeClasses.cardBg} ${computedThemeClasses.border} border rounded-md shadow-xl text-xs`}
          style={{
            top: `${menuPosition.top}px`,
            right: `${menuPosition.right}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {orders
            .filter((order) => order.id === orderActionMenuId)
            .map((order) => (
              <button
                key={order.id}
                type="button"
                className={`w-full flex items-center gap-2 px-3 py-2.5 ${computedThemeClasses.rowHover} ${computedThemeClasses.textPrimary} transition-colors`}
                onClick={() => {
                  onViewOrder(order);
                  setOrderActionMenuId(null);
                }}
              >
                <span className={computedThemeClasses.textSecondary}>
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                </span>
                <span className="font-medium">View</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
};

export default OrdersTable;

