import React, { useState, useEffect, useImperativeHandle, forwardRef, useRef } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import { bottlesApi } from '../../../../services/supplyChainApi';

const ArchivedOrdersTable = forwardRef(({ themeClasses }, ref) => {
  const { isDarkMode } = useTheme();
  const [archivedOrders, setArchivedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openFilterColumn, setOpenFilterColumn] = useState(null);
  const filterIconRefs = useRef({});
  const filterDropdownRef = useRef(null);

  // Fetch archived orders from API
  useEffect(() => {
    const fetchArchivedOrders = async () => {
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

  // Expose function to add archived order (called from OrdersTable)
  useImperativeHandle(ref, () => ({
    addArchivedOrder: (order) => {
      // Refresh from API instead of localStorage
      const fetchArchivedOrders = async () => {
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
          <img 
            src="/assets/Icons (2).png" 
            alt="Partially Received" 
            className="w-3.5 h-3.5"
            style={{ objectFit: 'contain' }}
          />
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
            { key: 'status', label: 'STATUS' },
            { key: 'orderNumber', label: 'BOTTLE ORDER #' },
            { key: 'supplier', label: 'SUPPLIER' },
          ].map(({ key, label }) => (
            <div
              key={key}
              className="text-xs font-bold text-white uppercase tracking-wider border-r border-[#3C4656] group cursor-pointer"
              style={{ 
                textAlign: 'center', 
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', gap: '8px' }}>
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
          <div className="text-xs font-bold text-white uppercase tracking-wider" style={{ textAlign: 'center', position: 'relative', paddingRight: '16px', paddingLeft: '0px', paddingTop: '12px', paddingBottom: '12px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
          archivedOrders.map((order, index) => {
            // Determine status for each stage
            const addProductsStatus = true; // Always completed (order exists)
            const submitPOStatus = true; // Always completed (order was submitted)
            const receivePOStatus = order.status === 'received' || order.lineItems?.some(item => item.status === 'received') || false; // Only green if received
            
            return (
              <div
                key={order.orderNumber}
                className={`grid text-sm ${themeClasses.rowHover} transition-colors`}
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
                <div className="px-6 py-3 flex items-center justify-center">
                  {renderStatusPill(order.status || 'archived')}
                </div>
                <div className="px-6 py-3 flex items-center">
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-blue-600">{order.orderNumber}</span>
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
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      backgroundColor: addProductsStatus ? '#22C55E' : '#D1D5DB',
                      border: addProductsStatus ? '2px solid #1B7A3D' : '2px solid #E5E7EB',
                      boxShadow: addProductsStatus ? '0 0 0 2px rgba(34,197,94,0.2)' : 'none',
                    }}
                  />
                </div>
                {/* SUBMIT PO Circle */}
                <div className="px-6 py-3 flex items-center justify-center">
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      backgroundColor: submitPOStatus ? '#22C55E' : '#D1D5DB',
                      border: submitPOStatus ? '2px solid #1B7A3D' : '2px solid #E5E7EB',
                      boxShadow: submitPOStatus ? '0 0 0 2px rgba(34,197,94,0.2)' : 'none',
                    }}
                  />
                </div>
                {/* RECEIVE PO Circle */}
                <div className="px-6 py-3 flex items-center justify-center">
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      backgroundColor: receivePOStatus ? '#22C55E' : '#D1D5DB',
                      border: receivePOStatus ? '2px solid #1B7A3D' : '2px solid #E5E7EB',
                      boxShadow: receivePOStatus ? '0 0 0 2px rgba(34,197,94,0.2)' : 'none',
                    }}
                  />
                </div>
                <div className="px-6 py-3 flex items-center justify-end relative">
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
                    <span className={themeClasses.textSecondary}>⋮</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
      
      {/* Filter dropdown */}
      {openFilterColumn !== null && (
        <FilterDropdown
          ref={filterDropdownRef}
          columnKey={openFilterColumn}
          filterIconRef={filterIconRefs.current[openFilterColumn]}
          onClose={() => setOpenFilterColumn(null)}
        />
      )}
    </div>
  );
});

ArchivedOrdersTable.displayName = 'ArchivedOrdersTable';

// Filter dropdown styled like planning/orders
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

      if (left + dropdownWidth > viewportWidth) left = viewportWidth - dropdownWidth - 16;
      if (top + dropdownHeight > viewportHeight) top = rect.top - dropdownHeight - 8;
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

export default ArchivedOrdersTable;

