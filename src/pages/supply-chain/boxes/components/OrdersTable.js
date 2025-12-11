import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import { useLocation } from 'react-router-dom';
import { boxesApi } from '../../../../services/supplyChainApi';

const OrdersTable = ({ searchQuery = '', themeClasses, onViewOrder, onArchiveOrder, onNewOrderCreated, archivedOrdersRef }) => {
  const { isDarkMode } = useTheme();
  const location = useLocation();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch orders from API
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const response = await boxesApi.getOrders();
        if (response.success) {
          const allOrders = response.data.map(order => ({
            id: order.id,
            orderNumber: order.order_number,
            supplier: order.supplier,
            boxType: order.box_type,
            status: order.status || 'pending',
            orderDate: order.order_date,
            quantityOrdered: order.quantity_ordered,
            quantityReceived: order.quantity_received || 0,
            isEdited: order.is_edited || false,
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
                isEdited: false, // Will be set to true if any line item is edited
              };
            }
            grouped[baseOrderNumber].orderCount++;
            grouped[baseOrderNumber].lineItems.push(order);
            // Mark group as edited if any line item is edited
            if (order.isEdited) {
              grouped[baseOrderNumber].isEdited = true;
            }
          });
          
          // Filter: Only show groups that have at least one 'pending', 'submitted', or 'partial' line item
          // Exclude groups where ALL items are 'received' or 'archived'
          const activeGroupedOrders = Object.values(grouped)
            .filter(group => {
              // Include if at least one line item is pending, submitted, or partial
              return group.lineItems.some(item => 
                item.status === 'pending' || item.status === 'submitted' || item.status === 'partial'
              );
            })
            .map(group => {
              // Determine group status: if any partial, show partial; if any submitted, show submitted; otherwise pending
              const hasPartial = group.lineItems.some(item => item.status === 'partial');
              const hasSubmitted = group.lineItems.some(item => item.status === 'submitted');
              return {
                ...group,
                status: hasPartial ? 'partial' : (hasSubmitted ? 'submitted' : 'pending')
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
  }, []);

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
    const newOrderState = location.state && location.state.newBoxOrder;
    if (newOrderState) {
      // Refresh orders from API
      const fetchOrders = async () => {
        try {
          const response = await boxesApi.getOrders();
          if (response.success) {
            const allOrders = response.data.map(order => ({
              id: order.id,
              orderNumber: order.order_number,
              supplier: order.supplier,
              boxType: order.box_type,
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
            
            // Filter: Only show groups that have at least one 'pending', 'submitted', or 'partial' line item
            const activeGroupedOrders = Object.values(grouped)
              .filter(group => {
                return group.lineItems.some(item => 
                  item.status === 'pending' || item.status === 'submitted' || item.status === 'partial'
                );
              })
              .map(group => {
                const hasPartial = group.lineItems.some(item => item.status === 'partial');
                const hasSubmitted = group.lineItems.some(item => item.status === 'submitted');
                return {
                  ...group,
                  status: hasPartial ? 'partial' : (hasSubmitted ? 'submitted' : 'pending')
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
        window.history.replaceState({ ...location.state, newBoxOrder: null }, '');
      }
    }
  }, [location.state, onNewOrderCreated]);

  const handleArchiveOrder = async (order, shouldReceive = false) => {
    try {
      // Update all line items for this order
      const lineItems = order.lineItems || [];
      
      for (const line of lineItems) {
        if (shouldReceive) {
          await boxesApi.updateOrder(line.id, {
            status: 'received',
          });
        } else {
          await boxesApi.updateOrder(line.id, {
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

  // Handle received orders (from navigation state)
  useEffect(() => {
    const receivedOrderId = location.state && location.state.receivedOrderId;
    const isPartial = location.state && location.state.isPartial;
    
    if (receivedOrderId) {
      // Refresh orders and archive received ones
      const handleReceivedOrders = async () => {
        try {
          const response = await boxesApi.getOrders();
          if (response.success) {
            const allOrders = response.data.map(order => ({
              id: order.id,
              orderNumber: order.order_number,
              supplier: order.supplier,
              boxType: order.box_type,
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
            
            // Filter: Only show groups that have at least one 'pending', 'submitted', or 'partial' line item
            const activeGroupedOrders = Object.values(grouped)
              .filter(group => {
                return group.lineItems.some(item => 
                  item.status === 'pending' || item.status === 'submitted' || item.status === 'partial'
                );
              })
              .map(group => {
                const hasPartial = group.lineItems.some(item => item.status === 'partial');
                const hasSubmitted = group.lineItems.some(item => item.status === 'submitted');
                return {
                  ...group,
                  status: hasPartial ? 'partial' : (hasSubmitted ? 'submitted' : 'pending')
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
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });

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


  const renderStatusPill = (order) => {
    // Map backend status to display status
    const backendStatus = order.status || 'pending';
    let displayStatus = 'Pending';
    let style = { bg: 'bg-blue-100', text: 'text-blue-700' };
    
    if (backendStatus === 'submitted') {
      displayStatus = 'Submitted';
      style = { bg: 'bg-purple-100', text: 'text-purple-700' };
    } else if (backendStatus === 'partial') {
      displayStatus = 'Partially Received';
      style = { bg: 'bg-orange-100', text: 'text-orange-700' };
    } else {
      displayStatus = 'Pending';
      style = { bg: 'bg-blue-100', text: 'text-blue-700' };
    }

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}>
        {displayStatus === 'Submitted' ? (
          <img 
            src="/assets/Icons (1).png" 
            alt="Submitted" 
            className="w-3.5 h-3.5"
            style={{ objectFit: 'contain' }}
          />
        ) : displayStatus === 'Partially Received' ? (
          <img 
            src="/assets/Icons (2).png" 
            alt="Partially Received" 
            className="w-3.5 h-3.5"
            style={{ objectFit: 'contain' }}
          />
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
      className={`${themeClasses.cardBg} rounded-xl border ${themeClasses.border} shadow-md`}
      style={{ overflow: 'hidden' }}
    >
      {/* Table header row */}
      <div className={themeClasses.headerBg}>
        <div
          className="grid"
          style={{
            gridTemplateColumns: '222px 222px 222px 120px 120px 120px 1fr',
          }}
        >
          <div className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider border-r border-[#3C4656] text-center">
            Status
          </div>
          <div className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider border-r border-[#3C4656] text-center">
            Boxes Order #
          </div>
          <div className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider border-r border-[#3C4656] text-center">
            Supplier
          </div>
          <div className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider border-r border-[#3C4656] text-center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: '1.2' }}>
            <div>ADD</div>
            <div>PRODUCTS</div>
          </div>
          <div className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider border-r border-[#3C4656] text-center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: '1.2' }}>
            <div>SUBMIT</div>
            <div>PO</div>
          </div>
          <div className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider border-r border-[#3C4656] text-center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: '1.2' }}>
            <div>RECEIVE</div>
            <div>PO</div>
          </div>
          <div className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider text-center" style={{ textAlign: 'right', position: 'relative', paddingRight: '16px', paddingLeft: '0px', paddingTop: '12px', paddingBottom: '12px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
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
              const submitPOStatus = order.status !== 'pending'; // Completed if not pending (submitted, partial, received)
              // RECEIVE PO: Only green if order is actually received (not just submitted)
              // Check both order status and line items - must have at least one 'received' status
              const hasReceivedLineItem = order.lineItems?.some(item => item.status === 'received') || false;
              const orderStatusIsReceived = order.status === 'received';
              // Receive PO should only be green if actually received, not just submitted
              // If status is 'submitted', do not show green dot (even if line items might be marked received)
              const receivePOStatus = order.status === 'received' || (hasReceivedLineItem && order.status !== 'submitted');
              
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
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="text-xs font-medium text-blue-600 hover:text-blue-700 underline-offset-2 hover:underline text-left"
                          onClick={() => onViewOrder(order)}
                        >
                          {order.orderNumber}
                        </button>
                        {order.isEdited && (
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium"
                            style={{
                              backgroundColor: '#FEF3C7',
                              color: '#92400E',
                            }}
                          >
                            Edited
                          </span>
                        )}
                      </div>
                      {order.orderCount > 1 && (
                        <span className="text-[10px] text-gray-400">
                          {order.orderCount} box types
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
                No box orders yet. Click &quot;New Order&quot; to create one.
              </div>
            )}
          </>
        )}
      </div>

      {/* Dropdown menu portal - rendered outside overflow container */}
      {orderActionMenuId && (
        <div
          ref={(el) => (menuRefs.current[orderActionMenuId] = el)}
          className={`fixed z-[9999] w-32 ${themeClasses.cardBg} ${themeClasses.border} border rounded-md shadow-xl text-xs`}
          style={{
            top: `${menuPosition.top}px`,
            right: `${menuPosition.right}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {orders
            .filter((order) => order.id === orderActionMenuId)
            .map((order) => (
              <React.Fragment key={order.id}>
                <button
                  type="button"
                  className={`w-full flex items-center gap-2 px-3 py-2.5 ${themeClasses.rowHover} ${themeClasses.textPrimary} transition-colors`}
                    onClick={() => {
                      if (onViewOrder) {
                        onViewOrder(order);
                      }
                      setOrderActionMenuId(null);
                    }}
                  >
                    <span className={themeClasses.textSecondary}>
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
                  <button
                    type="button"
                    className={`w-full flex items-center gap-2 px-3 py-2.5 ${themeClasses.rowHover} ${themeClasses.textPrimary} border-t ${themeClasses.border} transition-colors`}
                    onClick={() => {
                      handleArchiveOrder(order);
                      setOrderActionMenuId(null);
                    }}
                  >
                  <span className={themeClasses.textSecondary}>
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
                        d="M4 4h16v4H4zM6 8v10a2 2 0 002 2h8a2 2 0 002-2V8"
                      />
                    </svg>
                  </span>
                  <span className="font-medium">Archive</span>
                </button>
              </React.Fragment>
            ))}
        </div>
      )}
    </div>
  );
};

export default OrdersTable;
