import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import { boxesApi } from '../../../../services/supplyChainApi';

const ArchivedOrdersTable = forwardRef(({ themeClasses }, ref) => {
  const { isDarkMode } = useTheme();
  const [archivedOrders, setArchivedOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch archived orders from API
  useEffect(() => {
    const fetchArchivedOrders = async () => {
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
          }));
          
          // Group by base order number first
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
          
          // Filter: Only show groups where ALL line items are fully received or archived (no partial)
          const fullyArchived = Object.values(grouped)
            .filter(group => {
              // Check if ALL line items in the group are 'received' or 'archived' (no 'partial' or 'pending')
              return group.lineItems.every(item => 
                item.status === 'received' || item.status === 'archived'
              );
            })
            .map(group => {
              // Set status: 'received' if all items are received, otherwise 'archived'
              const allReceived = group.lineItems.every(item => item.status === 'received');
              return {
                ...group,
                status: allReceived ? 'received' : 'archived'
              };
            });
          
          setArchivedOrders(fullyArchived);
        }
      } catch (err) {
        console.error('Error fetching archived orders:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchArchivedOrders();
  }, []);

  // Expose function to add archived order (called from OrdersTable)
  useImperativeHandle(ref, () => ({
    addArchivedOrder: (order) => {
      // Refresh from API instead of localStorage
      const fetchArchivedOrders = async () => {
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
            
            // Group by base order number first
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
            
            // Filter: Only show groups where ALL line items are fully received or archived (no partial)
            const fullyArchived = Object.values(grouped)
              .filter(group => {
                return group.lineItems.every(item => 
                  item.status === 'received' || item.status === 'archived'
                );
              })
              .map(group => {
                // Set status: 'received' if all items are received, otherwise 'archived'
                const allReceived = group.lineItems.every(item => item.status === 'received');
                return {
                  ...group,
                  status: allReceived ? 'received' : 'archived'
                };
              });
            
            setArchivedOrders(fullyArchived);
          }
        } catch (err) {
          console.error('Error refreshing archived orders:', err);
        }
      };
      fetchArchivedOrders();
    },
  }));

  const renderStatusPill = (status) => {
    if (status === 'received') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-600">
          <svg className="w-3.5 h-3.5" fill="#10B981" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="#10B981"/>
          </svg>
          Received
        </span>
      );
    } else if (status === 'partial') {
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
      // Archived status
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
          <svg className="w-3.5 h-3.5" fill="#6B7280" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 4h16v4H4zM6 8v10a2 2 0 002 2h8a2 2 0 002-2V8" fill="#6B7280"/>
          </svg>
          Archived
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
            Status
          </div>
          <div className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider border-r border-[#3C4656] text-center">
            Box Order #
          </div>
          <div className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider text-center">
            Supplier
          </div>
        </div>
      </div>

      {/* Table body */}
      <div>
        {loading ? (
          <div className="px-6 py-6 text-center text-sm text-gray-400">
            Loading archived orders...
          </div>
        ) : archivedOrders.length === 0 ? (
          <div className="px-6 py-6 text-center text-sm italic text-gray-400">
            No archived orders yet.
          </div>
        ) : (
          archivedOrders.map((order, index) => (
            <div
              key={order.orderNumber}
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
                {renderStatusPill(order.status || 'archived')}
              </div>
              <div className="px-6 py-3 flex items-center">
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-blue-600">{order.orderNumber}</span>
                  {order.orderCount > 1 && (
                    <span className="text-[10px] text-gray-400">
                      {order.orderCount} box types
                    </span>
                  )}
                </div>
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
