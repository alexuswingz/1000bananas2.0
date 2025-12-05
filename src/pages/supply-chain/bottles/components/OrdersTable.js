import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import { useLocation } from 'react-router-dom';
import { bottlesApi } from '../../../../services/supplyChainApi';

const OrdersTable = ({ searchQuery = '', themeClasses, onViewOrder, onArchiveOrder, onNewOrderCreated, archivedOrdersRef }) => {
  const { isDarkMode } = useTheme();
  const location = useLocation();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [openFilterColumn, setOpenFilterColumn] = useState(null);
  const filterIconRefs = useRef({});
  const filterDropdownRef = useRef(null);

  // Fetch orders from API
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const response = await bottlesApi.getOrders();
        if (response.success) {
          const allOrders = response.data.map(order => ({
            id: order.id,
            orderNumber: order.order_number,
            supplier: order.supplier,
            bottleName: order.bottle_name,
            status: order.status || 'pending',
            orderDate: order.order_date,
            quantityOrdered: order.quantity_ordered,
            quantityReceived: order.quantity_received || 0,
          }));
          
          // Group orders by base order number (before timestamp)
          const grouped = {};
          allOrders.forEach(order => {
            const baseOrderNumber = order.orderNumber.split('-')[0];
            if (!grouped[baseOrderNumber]) {
              grouped[baseOrderNumber] = {
                id: order.id, // Use first order ID
                orderNumber: baseOrderNumber,
                supplier: order.supplier,
                status: order.status,
                orderDate: order.orderDate,
                orderCount: 0,
                lineItems: [],
              };
            }
            grouped[baseOrderNumber].orderCount++;
            grouped[baseOrderNumber].lineItems.push(order);
          });
          
          // Filter: Only show groups that have at least one 'pending' or 'partial' line item
          // Exclude groups where ALL items are 'received' or 'archived'
          const activeGroupedOrders = Object.values(grouped)
            .filter(group => {
              // Include if at least one line item is pending or partial
              return group.lineItems.some(item => 
                item.status === 'pending' || item.status === 'partial'
              );
            })
            .map(group => {
              // Determine group status: if any partial, show partial; otherwise pending
              const hasPartial = group.lineItems.some(item => item.status === 'partial');
              return {
                ...group,
                status: hasPartial ? 'partial' : 'pending'
              };
            });
          
          console.log('Grouped orders:', activeGroupedOrders);
          setOrders(activeGroupedOrders);
        }
      } catch (err) {
        console.error('Error fetching orders:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [refreshTrigger]); // Re-fetch when refreshTrigger changes
  
  // Listen for order created events
  useEffect(() => {
    if (location.state?.orderCreated) {
      // Trigger a refresh after a short delay to ensure backend is ready
      setTimeout(() => setRefreshTrigger(prev => prev + 1), 500);
    }
  }, [location.state]);

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
      // Refresh orders from API
      const fetchOrders = async () => {
        try {
          const response = await bottlesApi.getOrders();
          if (response.success) {
            const allOrders = response.data.map(order => ({
              id: order.id,
              orderNumber: order.order_number,
              supplier: order.supplier,
              bottleName: order.bottle_name,
              status: order.status || 'pending',
              orderDate: order.order_date,
              quantityOrdered: order.quantity_ordered,
              quantityReceived: order.quantity_received || 0,
            }));
            
            // Group orders by base order number
            const grouped = {};
            allOrders.forEach(order => {
              const baseOrderNumber = order.orderNumber.split('-')[0];
              if (!grouped[baseOrderNumber]) {
                grouped[baseOrderNumber] = {
                  id: order.id,
                  orderNumber: baseOrderNumber,
                  supplier: order.supplier,
                  status: order.status,
                  orderDate: order.orderDate,
                  orderCount: 0,
                  lineItems: [],
                };
              }
              grouped[baseOrderNumber].orderCount++;
              grouped[baseOrderNumber].lineItems.push(order);
            });
            
            // Filter: Only show groups that have at least one 'pending' or 'partial' line item
            const activeGroupedOrders = Object.values(grouped)
              .filter(group => {
                return group.lineItems.some(item => 
                  item.status === 'pending' || item.status === 'partial'
                );
              })
              .map(group => {
                const hasPartial = group.lineItems.some(item => item.status === 'partial');
                return {
                  ...group,
                  status: hasPartial ? 'partial' : 'pending'
                };
              });
            
            setOrders(activeGroupedOrders);
            if (onNewOrderCreated) {
              onNewOrderCreated();
            }
          }
        } catch (err) {
          console.error('Error refreshing orders:', err);
        }
      };
      fetchOrders();
      
      // Clear the navigation state
      if (window.history && window.history.replaceState) {
        window.history.replaceState({ ...location.state, newBottleOrder: null }, '');
      }
    }
  }, [location.state, onNewOrderCreated]);

  const handleArchiveOrder = async (order, shouldReceive = false) => {
    try {
      // Update all line items for this order
      const lineItems = order.lineItems || [];
      
      for (const line of lineItems) {
        if (shouldReceive) {
          await bottlesApi.updateOrder(line.id, {
            status: 'received',
          });
        } else {
          await bottlesApi.updateOrder(line.id, {
            status: 'archived',
          });
        }
      }
      
      // Remove from UI
      setOrders((prev) => prev.filter((o) => o.orderNumber !== order.orderNumber));
      
      // Add to archived orders with final status
      if (archivedOrdersRef && archivedOrdersRef.current) {
        archivedOrdersRef.current.addArchivedOrder({
          ...order,
          status: shouldReceive ? 'received' : 'archived'
        });
      }
      
      // Call parent callback
      if (onArchiveOrder) {
        onArchiveOrder(order);
      }
    } catch (err) {
      console.error('Error archiving order:', err);
      alert('Failed to archive order');
    }
  };

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openFilterColumn !== null) {
        const filterIcon = filterIconRefs.current[openFilterColumn];
        const dropdown = filterDropdownRef.current;
        const isClickInsideIcon = filterIcon?.contains(event.target);
        const isClickInsideDropdown = dropdown?.contains(event.target);
        if (!isClickInsideIcon && !isClickInsideDropdown) {
          setOpenFilterColumn(null);
        }
      }
    };

    if (openFilterColumn !== null) {
      const timeoutId = setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [openFilterColumn]);

  const handleFilterClick = (columnKey, e) => {
    e.stopPropagation();
    setOpenFilterColumn(openFilterColumn === columnKey ? null : columnKey);
  };

  // Handle received orders (from navigation state)
  useEffect(() => {
    const receivedOrderId = location.state && location.state.receivedOrderId;
    const isPartial = location.state && location.state.isPartial;
    
    if (receivedOrderId) {
      // Refresh orders and archive received ones
      const handleReceivedOrders = async () => {
        try {
          const response = await bottlesApi.getOrders();
          if (response.success) {
            const allOrders = response.data.map(order => ({
              id: order.id,
              orderNumber: order.order_number,
              supplier: order.supplier,
              bottleName: order.bottle_name,
              status: order.status || 'pending',
              orderDate: order.order_date,
              quantityOrdered: order.quantity_ordered,
              quantityReceived: order.quantity_received || 0,
            }));
            
            // Only archive and switch tab if order is FULLY received (not partial)
            if (!isPartial) {
              // Find the order that was received
              const receivedOrder = allOrders.find(o => o.id === receivedOrderId);
              
              if (receivedOrder && receivedOrder.status === 'received') {
                // Find all line items for this order group
                const baseOrderNumber = receivedOrder.orderNumber.split('-')[0];
                const orderGroup = allOrders.filter(o => o.orderNumber.split('-')[0] === baseOrderNumber);
                
                // Archive all line items
                for (const order of orderGroup) {
                  if (archivedOrdersRef && archivedOrdersRef.current) {
                    archivedOrdersRef.current.addArchivedOrder(order);
                  }
                }
                
                // Switch to archive tab only if fully received
                if (onArchiveOrder) {
                  onArchiveOrder();
                }
              }
            }
            // If isPartial is true, stay on orders tab (don't switch)
            
            // Group all orders first
            const grouped = {};
            allOrders.forEach(order => {
              const baseOrderNumber = order.orderNumber.split('-')[0];
              if (!grouped[baseOrderNumber]) {
                grouped[baseOrderNumber] = {
                  id: order.id,
                  orderNumber: baseOrderNumber,
                  supplier: order.supplier,
                  status: order.status,
                  orderDate: order.orderDate,
                  orderCount: 0,
                  lineItems: [],
                };
              }
              grouped[baseOrderNumber].orderCount++;
              grouped[baseOrderNumber].lineItems.push(order);
            });
            
            // Filter: Only show groups that have at least one 'pending' or 'partial' line item
            const activeGroupedOrders = Object.values(grouped)
              .filter(group => {
                return group.lineItems.some(item => 
                  item.status === 'pending' || item.status === 'partial'
                );
              })
              .map(group => {
                const hasPartial = group.lineItems.some(item => item.status === 'partial');
                return {
                  ...group,
                  status: hasPartial ? 'partial' : 'pending'
                };
              });
            
            setOrders(activeGroupedOrders);
          }
        } catch (err) {
          console.error('Error handling received orders:', err);
        }
      };
      handleReceivedOrders();
      
      // Clear the navigation state
      if (window.history && window.history.replaceState) {
        window.history.replaceState({ ...location.state, receivedOrderId: null, isPartial: null }, '');
      }
    }
  }, [location.state, archivedOrdersRef, onArchiveOrder]);

  const [orderActionMenuId, setOrderActionMenuId] = useState(null);
  const menuRefs = useRef({});
  const buttonRefs = useRef({});
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

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


  const renderStatusPill = (order) => {
    // Map backend status to display status
    const backendStatus = order.status || 'pending';
    let displayStatus = 'Pending';
    let style = { bg: 'bg-blue-100', text: 'text-blue-700' };
    
    if (backendStatus === 'partial') {
      displayStatus = 'Partially Received';
      style = { bg: 'bg-orange-100', text: 'text-orange-700' };
    } else {
      displayStatus = 'Pending';
      style = { bg: 'bg-blue-100', text: 'text-blue-700' };
    }

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}>
        {displayStatus === 'Partially Received' ? (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="#F97316" strokeWidth="1.5" fill="none"/>
            <path d="M 2 12 A 10 10 0 0 1 22 12 L 12 12 Z" fill="#F97316"/>
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" fill="#3B82F6" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" fill="#3B82F6"/>
            <path d="M14 2v6h6" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="9" y1="13" x2="15" y2="13" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="9" y1="17" x2="15" y2="17" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        )}
        {displayStatus}
      </span>
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
          {[
            { key: 'status', label: 'STATUS', align: 'left' },
            { key: 'orderNumber', label: 'BOTTLE ORDER #', align: 'left' },
            { key: 'supplier', label: 'SUPPLIER', align: 'left' },
          ].map(({ key, label, align }) => (
            <div
              key={key}
              className="text-xs font-bold text-white uppercase tracking-wider border-r border-[#3C4656] group cursor-pointer"
              style={{
                textAlign: align,
                width: '222px',
                height: '40px',
                paddingTop: '12px',
                paddingRight: '16px',
                paddingBottom: '12px',
                paddingLeft: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <span style={{ color: openFilterColumn === key ? '#007AFF' : '#FFFFFF' }}>{label}</span>
                <img
                  ref={(el) => {
                    if (el) filterIconRefs.current[key] = el;
                  }}
                  src="/assets/Vector (1).png"
                  alt="Filter"
                  className={`w-3 h-3 transition-opacity cursor-pointer ${
                    openFilterColumn === key ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                  onClick={(e) => handleFilterClick(key, e)}
                  style={{ width: '12px', height: '12px' }}
                />
              </div>
            </div>
          ))}
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
        {loading ? (
          <div className="px-6 py-6 text-center text-sm text-gray-400">
            Loading orders...
          </div>
        ) : (
          <>
            {filteredOrders.map((order, index) => {
              // Determine status for each stage
              const addProductsStatus = true; // Always completed (order exists)
              const submitPOStatus = true; // Always completed (order was submitted)
              // RECEIVE PO: Only green if order is actually received
              // Check both order status and line items - must have at least one 'received' status
              const hasReceivedLineItem = order.lineItems?.some(item => item.status === 'received') || false;
              const orderStatusIsReceived = order.status === 'received';
              const receivePOStatus = hasReceivedLineItem || orderStatusIsReceived;
              
              return (
                <div
                  key={order.id}
                  className={`grid text-sm ${themeClasses.rowHover} transition-colors`}
                  style={{
                    gridTemplateColumns: '222px 222px 222px 120px 120px 120px 1fr',
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
                    <div className="flex flex-col">
                      <button
                        type="button"
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 underline-offset-2 hover:underline text-left"
                        onClick={() => onViewOrder(order)}
                      >
                        {order.orderNumber}
                      </button>
                      {order.orderCount > 1 && (
                        <span className="text-[10px] text-gray-400">
                          {order.orderCount} bottle types
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="px-6 py-3 flex items-center">
                    <span className={themeClasses.textPrimary}>{order.supplier}</span>
                  </div>
                  {/* ADD PRODUCTS Circle */}
                  <div className="px-6 py-3 flex items-center justify-center">
                    <div
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        backgroundColor: addProductsStatus ? '#22C55E' : 'transparent',
                        border: addProductsStatus ? 'none' : '2px solid #9CA3AF',
                      }}
                    />
                  </div>
                  {/* SUBMIT PO Circle */}
                  <div className="px-6 py-3 flex items-center justify-center">
                    <div
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        backgroundColor: submitPOStatus ? '#22C55E' : 'transparent',
                        border: submitPOStatus ? 'none' : '2px solid #9CA3AF',
                      }}
                    />
                  </div>
                  {/* RECEIVE PO Circle */}
                  <div className="px-6 py-3 flex items-center justify-center">
                    <div
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        backgroundColor: receivePOStatus ? '#22C55E' : 'transparent',
                        border: receivePOStatus ? 'none' : '2px solid #9CA3AF',
                      }}
                    />
                  </div>
                  <div className="px-6 py-3 flex items-center justify-end relative">
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
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredOrders.length === 0 && (
              <div className="px-6 py-6 text-center text-sm italic text-gray-400">
                No bottle orders yet. Click &quot;New Order&quot; to create one.
              </div>
            )}
          </>
        )}
      </div>

      {/* Dropdown menu portal - rendered outside overflow container */}
      {openFilterColumn !== null && (
        <FilterDropdown
          ref={filterDropdownRef}
          columnKey={openFilterColumn}
          filterIconRef={filterIconRefs.current[openFilterColumn]}
          onClose={() => setOpenFilterColumn(null)}
        />
      )}

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

// FilterDropdown (styled like Planning)
const FilterDropdown = React.forwardRef(({ columnKey, filterIconRef, onClose }, ref) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [sortField, setSortField] = useState('');
  const [sortOrder, setSortOrder] = useState('');
  const [filterField, setFilterField] = useState('');
  const [filterCondition, setFilterCondition] = useState('');
  const [filterValue, setFilterValue] = useState('');

  useEffect(() => {
    if (filterIconRef) {
      const rect = filterIconRef.getBoundingClientRect();
      const dropdownWidth = 320;
      const dropdownHeight = 300;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let left = rect.left;
      let top = rect.bottom + 8;

      if (left + dropdownWidth > viewportWidth) {
        left = viewportWidth - dropdownWidth - 16;
      }
      if (top + dropdownHeight > viewportHeight) {
        top = rect.top - dropdownHeight - 8;
      }
      if (left < 16) left = 16;
      if (top < 16) top = 16;

      setPosition({ top, left });
    }
  }, [filterIconRef]);

  const handleClear = () => {
    setSortField('');
    setSortOrder('');
  };

  const handleReset = () => {
    setSortField('');
    setSortOrder('');
    setFilterField('');
    setFilterCondition('');
    setFilterValue('');
  };

  const handleApply = () => {
    // Placeholder for future filter/sort integration
    onClose();
  };

  const sortFields = [
    { value: 'status', label: 'Status' },
    { value: 'orderNumber', label: 'Bottle Order #' },
    { value: 'supplier', label: 'Supplier' },
  ];

  const sortOrders = [
    { value: 'asc', label: 'Sort ascending (A to Z)', icon: 'A^Z' },
    { value: 'desc', label: 'Sort descending (Z to A)', icon: 'Z^A' },
  ];

  const filterFields = [{ value: '', label: 'Select field' }, ...sortFields];

  const filterConditions = [
    { value: '', label: 'Select condition' },
    { value: 'equals', label: 'Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'greaterThan', label: 'Greater than' },
    { value: 'lessThan', label: 'Less than' },
  ];

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: '320px',
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        border: '1px solid #E5E7EB',
        zIndex: 10000,
        padding: '16px',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Sort by section */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', textTransform: 'uppercase' }}>
            Sort by:
          </label>
          <button
            type="button"
            onClick={handleClear}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#3B82F6',
              fontSize: '0.875rem',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Clear
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '0.875rem',
              color: '#374151',
              backgroundColor: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            <option value="">Select field</option>
            {sortFields.map((field) => (
              <option key={field.value} value={field.value}>
                {field.label}
              </option>
            ))}
          </select>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: sortOrder ? '1px solid #3B82F6' : '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '0.875rem',
              color: '#374151',
              backgroundColor: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            <option value="">Select order</option>
            {sortOrders.map((order) => (
              <option key={order.value} value={order.value}>
                {order.icon} {order.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filter by condition section */}
      <div style={{ marginBottom: '16px', paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', textTransform: 'uppercase', marginBottom: '12px', display: 'block' }}>
          Filter by condition:
        </label>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <select
            value={filterField}
            onChange={(e) => setFilterField(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '0.875rem',
              color: filterField ? '#374151' : '#9CA3AF',
              backgroundColor: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            {filterFields.map((field) => (
              <option key={field.value} value={field.value}>
                {field.label}
              </option>
            ))}
          </select>

          <select
            value={filterCondition}
            onChange={(e) => setFilterCondition(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '0.875rem',
              color: filterCondition ? '#374151' : '#9CA3AF',
              backgroundColor: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            {filterConditions.map((condition) => (
              <option key={condition.value} value={condition.value}>
                {condition.label}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Value here..."
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '0.875rem',
              color: '#374151',
              backgroundColor: '#FFFFFF',
            }}
          />
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
        <button
          type="button"
          onClick={handleReset}
          style={{
            padding: '8px 16px',
            border: '1px solid #D1D5DB',
            borderRadius: '6px',
            backgroundColor: '#FFFFFF',
            color: '#374151',
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Reset
        </button>
        <button
          type="button"
          onClick={handleApply}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderRadius: '6px',
            backgroundColor: '#3B82F6',
            color: '#FFFFFF',
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Apply
        </button>
      </div>
    </div>
  );
});

export default OrdersTable;

