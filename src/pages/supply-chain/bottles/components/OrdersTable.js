import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const OrdersTable = ({ orders, themeClasses, onViewOrder, onArchiveOrder }) => {
  const { isDarkMode } = useTheme();
  const [orderActionMenuId, setOrderActionMenuId] = useState(null);
  const menuRefs = useRef({});
  const buttonRefs = useRef({});
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });

  const statusStyles = {
    Draft: { bg: 'bg-blue-100', text: 'text-blue-700', icon: '📝' },
    Submitted: { bg: 'bg-purple-100', text: 'text-purple-700', icon: '⬇️' },
    Received: { bg: 'bg-green-100', text: 'text-green-700', icon: '✔️' },
    'Partially Received': { bg: 'bg-orange-100', text: 'text-orange-700', icon: '⦿' },
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

  const renderStatusPill = (status) => {
    const style = statusStyles[status] || {
      bg: 'bg-gray-100',
      text: 'text-gray-700',
      icon: '•',
    };

    return (
      <span
        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}
      >
        <span aria-hidden="true">{style.icon}</span>
        {status}
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
            gridTemplateColumns: '140px 2fr 2fr',
          }}
        >
          <div className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider border-r border-[#3C4656] text-center">
            Status
          </div>
          <div className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider border-r border-[#3C4656] text-center">
            Bottle Order #
          </div>
          <div className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider text-center">
            Supplier
          </div>
        </div>
      </div>

      {/* Table body */}
      <div>
        {orders.map((order, index) => (
          <div
            key={order.id}
            className={`grid text-sm ${themeClasses.rowHover} transition-colors`}
            style={{
              gridTemplateColumns: '140px 2fr 2fr',
              borderBottom:
                index === orders.length - 1
                  ? 'none'
                  : isDarkMode
                  ? '1px solid rgba(75,85,99,0.3)'
                  : '1px solid #e5e7eb',
            }}
          >
            <div className="px-6 py-3 flex items-center justify-center">
              {renderStatusPill(order.status || 'Draft')}
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
              </div>
            </div>
          </div>
        ))}

        {orders.length === 0 && (
          <div className="px-6 py-6 text-center text-sm italic text-gray-400">
            No bottle orders yet. Click &quot;New Order&quot; to create one.
          </div>
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
                    onViewOrder(order);
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
                    onArchiveOrder(order);
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

