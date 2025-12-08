import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import { useLocation } from 'react-router-dom';
import { closuresApi } from '../../../../services/supplyChainApi';

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
        const response = await closuresApi.getOrders();
        if (response.success) {
          const allOrders = response.data.map(order => ({
            id: order.id,
            orderNumber: order.order_number,
            supplier: order.supplier,
            closureName: order.closure_name,
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
              // Determine group status: priority: partial > submitted > pending
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
    const newOrderState = location.state && location.state.newClosureOrder;
    if (newOrderState) {
      // Refresh orders from API
      const fetchOrders = async () => {
        try {
          const response = await closuresApi.getOrders();
          if (response.success) {
            const allOrders = response.data.map(order => ({
              id: order.id,
              orderNumber: order.order_number,
              supplier: order.supplier,
              closureName: order.closure_name,
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
        window.history.replaceState({ ...location.state, newClosureOrder: null }, '');
      }
    }
  }, [location.state, onNewOrderCreated]);

  const handleArchiveOrder = async (order, shouldReceive = false) => {
    try {
      // Update all line items for this order
      const lineItems = order.lineItems || [];
      
      for (const line of lineItems) {
        if (shouldReceive) {
          await closuresApi.updateOrder(line.id, {
            status: 'received',
          });
        } else {
          await closuresApi.updateOrder(line.id, {
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
          const response = await closuresApi.getOrders();
          if (response.success) {
            const allOrders = response.data.map(order => ({
              id: order.id,
              orderNumber: order.order_number,
              supplier: order.supplier,
              closureName: order.closure_name,
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


  const renderStatusIcon = (status) => {
    if (status === 'submitted' || status === 'Submitted') {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Document/screen icon with rounded corners */}
          <rect x="6" y="4" width="12" height="16" rx="2" fill="#9333EA" stroke="none"/>
          {/* Darker purple rectangle at bottom center */}
          <rect x="9" y="16" width="6" height="2" rx="1" fill="#7C3AED"/>
        </svg>
      );
    } else if (status === 'partial' || status === 'Partially Received') {
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="#F97316" strokeWidth="1.5" fill="none"/>
          <path d="M 2 12 A 10 10 0 0 1 22 12 L 12 12 Z" fill="#F97316"/>
        </svg>
      );
    } else {
      // pending
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" fill="#3B82F6"/>
          <path d="M14 2v6h6" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    }
  };

  // Helper function to determine step completion status
  const getStepStatus = (order, step) => {
    const status = order.status || 'pending';
    if (step === 'addProducts') {
      // Completed if order exists (has line items)
      return order.lineItems && order.lineItems.length > 0;
    } else if (step === 'submitPO') {
      // Completed if submitted, partially, or fully received
      return status === 'submitted' || status === 'partial' || status === 'received';
    } else if (step === 'receivePO') {
      // Completed if partially or fully received
      return status === 'partial' || status === 'received';
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
          tableLayout: 'fixed',
        }}
      >
        {/* Table header */}
        <thead 
          className={themeClasses.headerBg} 
          style={{ 
            position: 'relative',
            width: '100%',
            height: '40px',
            backgroundColor: '#2C3544',
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
                textAlign: 'center',
                width: '16.67%',
                height: '40px',
                borderRight: '1px solid white',
                borderTopLeftRadius: '12px',
                backgroundColor: '#2C3544',
              }}
            >
              ORDER STATUS
            </th>
            <th
              className="text-xs font-bold text-white uppercase tracking-wider border-r border-white"
              style={{
                padding: '12px 16px',
                textAlign: 'center',
                width: '16.67%',
                height: '40px',
                borderRight: '1px solid white',
                backgroundColor: '#2C3544',
              }}
            >
              CLOSURE ORDER #
            </th>
            <th
              className="text-xs font-bold text-white uppercase tracking-wider border-r border-white"
              style={{
                padding: '12px 16px',
                textAlign: 'center',
                width: '16.67%',
                height: '40px',
                borderRight: '1px solid white',
                backgroundColor: '#2C3544',
              }}
            >
              SUPPLIER
            </th>
            <th
              className="text-xs font-bold text-white uppercase tracking-wider border-r border-white"
              style={{
                padding: '12px 16px',
                textAlign: 'center',
                width: '16.67%',
                height: '40px',
                borderRight: '1px solid white',
                backgroundColor: '#2C3544',
              }}
            >
              ADD PRODUCTS
            </th>
            <th
              className="text-xs font-bold text-white uppercase tracking-wider border-r border-white"
              style={{
                padding: '12px 16px',
                textAlign: 'center',
                width: '16.67%',
                height: '40px',
                borderRight: '1px solid white',
                backgroundColor: '#2C3544',
              }}
            >
              SUBMIT PO
            </th>
            <th
              className="text-xs font-bold text-white uppercase tracking-wider"
              style={{
                padding: '12px 16px',
                textAlign: 'left',
                width: '16.65%',
                height: '40px',
                borderTopRightRadius: '12px',
                backgroundColor: '#2C3544',
                position: 'relative',
              }}
            >
              RECEIVE PO
            </th>
          </tr>
        </thead>

        {/* Table body */}
        <tbody>
          {loading ? (
            <tr>
              <td colSpan="6" className="px-6 py-6 text-center text-sm text-gray-400">
                Loading orders...
              </td>
            </tr>
          ) : filteredOrders.length === 0 ? (
            <tr>
              <td colSpan="6" className="px-6 py-6 text-center text-sm italic text-gray-400">
                No orders yet.
              </td>
            </tr>
          ) : (
            filteredOrders.map((order, index) => {
              const status = order.status || 'pending';
              let displayStatus = 'pending';
              if (status === 'submitted') {
                displayStatus = 'Submitted';
              } else if (status === 'partial') {
                displayStatus = 'Partially Received';
              }
              const hasLineItems = order.lineItems && order.lineItems.length > 0;
              
              return (
                <tr
                  key={order.id}
                  className={`text-sm ${themeClasses.rowHover} transition-colors`}
                  style={{
                    height: '40px',
                    borderTop: index === 0 ? 'none' : (isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid #e5e7eb'),
                  }}
                >
                  {/* ORDER STATUS */}
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
                        paddingRight: '8px',
                        paddingBottom: '4px',
                        paddingLeft: '12px',
                        width: 'auto',
                        minWidth: '145px',
                        height: '24px',
                        boxSizing: 'border-box',
                      }}
                    >
                      {renderStatusIcon(status)}
                      <span style={{ fontSize: '14px', color: '#000000', fontWeight: 400, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                        {displayStatus}
                      </span>
                      {displayStatus === 'Partially Received' && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" style={{ marginLeft: '4px' }}>
                          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                  </td>

                  {/* CLOSURE ORDER # */}
                  <td style={{ padding: '0.65rem 1rem', verticalAlign: 'middle', textAlign: 'left' }}>
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
                          padding: 0,
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
                            backgroundColor: '#FED7AA',
                            color: '#000000',
                            fontSize: '11px',
                            fontWeight: 500,
                            padding: '2px 8px',
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
                        backgroundColor: !hasLineItems ? '#3B82F6' : (getStepStatus(order, 'addProducts') ? '#10B981' : '#FFFFFF'),
                        border: (!hasLineItems || getStepStatus(order, 'addProducts')) ? 'none' : '2px solid #D1D5DB',
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
                  <td style={{ padding: '0.65rem 1rem', textAlign: 'left', verticalAlign: 'middle', position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: getStepStatus(order, 'receivePO') ? '#10B981' : '#FFFFFF',
                          border: getStepStatus(order, 'receivePO') ? 'none' : '2px solid #D1D5DB',
                        }}
                      />
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
                            ref={(el) => (menuRefs.current[orderActionMenuId] = el)}
                            className={`fixed z-[9999] w-32 ${themeClasses.cardBg} ${themeClasses.border} border rounded-md shadow-xl text-xs`}
                            style={{
                              top: `${menuPosition.top}px`,
                              right: `${menuPosition.right}px`,
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
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
                          </div>
                        )}
                      </div>
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
};

export default OrdersTable;
