import React, { useState, useMemo, useImperativeHandle, forwardRef, useEffect, useRef } from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const InventoryTable = forwardRef(({
  searchQuery = '',
  themeClasses,
}, ref) => {
  const { isDarkMode } = useTheme();

  // Labels data
  const [labels, setLabels] = useState(() => {
    try {
      const stored = window.localStorage.getItem('labelsInventory');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    // Default data matching the image
    return Array.from({ length: 15 }, (_, i) => ({
      id: i + 1,
      status: i === 9 || i === 14 ? 'Needs Proofing' : 'Up to Date',
      brand: 'Total Pest Spray',
      product: 'Cherry Tree Fertilizer',
      size: 'Gallon',
      labelLink: 'https://drive.google.com/file/d/1a2b3c4d5e6f7g8h9i0j/view',
      labelSize: '5.375" x 4.5"',
      inventory: 25000,
    }));
  });

  // Persist labels to localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem('labelsInventory', JSON.stringify(labels));
    } catch {}
  }, [labels]);

  // Filter labels based on search query
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return labels;
    const query = searchQuery.toLowerCase();
    return labels.filter((label) =>
      label.brand.toLowerCase().includes(query) ||
      label.product.toLowerCase().includes(query) ||
      label.size.toLowerCase().includes(query)
    );
  }, [labels, searchQuery]);

  // Action menu state
  const [actionMenuLabelId, setActionMenuLabelId] = useState(null);
  
  // Status dropdown state
  const [statusDropdownId, setStatusDropdownId] = useState(null);
  const statusMenuRefs = useRef({});
  const statusButtonRefs = useRef({});
  const [statusMenuPosition, setStatusMenuPosition] = useState({ top: 0, left: 0 });

  // Expose bulk edit method
  useImperativeHandle(ref, () => ({
    enableBulkEdit: () => {
      // Bulk edit functionality can be added here if needed
    },
  }));

  // Handle status change
  const handleStatusChange = (labelId, newStatus) => {
    setLabels((prev) =>
      prev.map((label) =>
        label.id === labelId ? { ...label, status: newStatus } : label
      )
    );
    setStatusDropdownId(null);
  };

  // Calculate dropdown position and handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (statusDropdownId) {
        const menuElement = statusMenuRefs.current[statusDropdownId];
        const buttonElement = event.target.closest('[data-status-button]');
        
        if (menuElement && !menuElement.contains(event.target) && buttonElement?.dataset.statusButton !== statusDropdownId) {
          setStatusDropdownId(null);
        }
      }
    };

    // Calculate position when menu opens
    if (statusDropdownId) {
      const buttonElement = statusButtonRefs.current[statusDropdownId];
      if (buttonElement) {
        const rect = buttonElement.getBoundingClientRect();
        setStatusMenuPosition({
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
        });
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [statusDropdownId]);

  const renderStatus = (label) => {
    const status = label.status;
    const isUpToDate = status === 'Up to Date';
    
    return (
      <div className="relative">
        <button
          ref={(el) => (statusButtonRefs.current[label.id] = el)}
          type="button"
          data-status-button={label.id}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-semibold transition-colors ${
            isUpToDate
              ? 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100'
              : 'bg-orange-50 border-orange-300 text-orange-700 hover:bg-orange-100'
          }`}
          onClick={(e) => {
            e.stopPropagation();
            setStatusDropdownId(statusDropdownId === label.id ? null : label.id);
          }}
        >
          {isUpToDate ? (
            <svg className="w-3 h-3" fill="#10B981" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="#10B981"/>
            </svg>
          ) : (
            <svg className="w-3 h-3" fill="#F97316" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#F97316"/>
            </svg>
          )}
          <span>{status}</span>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {statusDropdownId === label.id && (
          <div
            ref={(el) => (statusMenuRefs.current[label.id] = el)}
            className="fixed bg-white border border-gray-200 rounded-md shadow-lg text-xs z-50 min-w-[160px]"
            style={{
              top: `${statusMenuPosition.top}px`,
              left: `${statusMenuPosition.left}px`,
            }}
          >
            <button
              type="button"
              className={`w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 transition-colors ${
                status === 'Up to Date' ? 'bg-green-50' : ''
              }`}
              onClick={() => handleStatusChange(label.id, 'Up to Date')}
            >
              <svg className="w-3 h-3" fill="#10B981" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="#10B981"/>
              </svg>
              <span className="text-green-700 font-semibold">Up to Date</span>
            </button>
            <button
              type="button"
              className={`w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 transition-colors ${
                status === 'Needs Proofing' ? 'bg-orange-50' : ''
              }`}
              onClick={() => handleStatusChange(label.id, 'Needs Proofing')}
            >
              <svg className="w-3 h-3" fill="#F97316" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#F97316"/>
              </svg>
              <span className="text-orange-700 font-semibold">Needs Proofing</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={`${themeClasses.cardBg} rounded-xl border ${themeClasses.border} shadow-md overflow-hidden`}
    >
      {/* Table header */}
      <div className={themeClasses.headerBg}>
        <div
          className="grid"
          style={{
            gridTemplateColumns: '140px 1.5fr 1.5fr 1fr 2fr 1.5fr 1fr 40px',
          }}
        >
          <div className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider border-r border-[#3C4656]">
            STATUS
          </div>
          <div className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider border-r border-[#3C4656]">
            BRAND
          </div>
          <div className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider border-r border-[#3C4656]">
            PRODUCT
          </div>
          <div className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider border-r border-[#3C4656]">
            SIZE
          </div>
          <div className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider border-r border-[#3C4656]">
            LABEL LINK
          </div>
          <div className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider border-r border-[#3C4656]">
            LABEL SIZE
          </div>
          <div className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider border-r border-[#3C4656]">
            INVENTORY
          </div>
          <div className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider">
            {/* Actions column */}
          </div>
        </div>
      </div>

      {/* Table body */}
      <div>
        {filteredData.length === 0 ? (
          <div className="px-6 py-6 text-center text-sm italic text-gray-400">
            No labels found.
          </div>
        ) : (
          filteredData.map((label, index) => (
            <div
              key={label.id}
              className={`grid text-sm ${themeClasses.rowHover} transition-colors`}
              style={{
                gridTemplateColumns: '140px 1.5fr 1.5fr 1fr 2fr 1.5fr 1fr 40px',
                borderBottom:
                  index === filteredData.length - 1
                    ? 'none'
                    : isDarkMode
                    ? '1px solid rgba(75,85,99,0.3)'
                    : '1px solid #e5e7eb',
              }}
            >
              {/* STATUS */}
              <div className="px-6 py-3 flex items-center">
                {renderStatus(label)}
              </div>

              {/* BRAND */}
              <div className="px-6 py-3 flex items-center">
                <span className={themeClasses.textPrimary}>{label.brand}</span>
              </div>

              {/* PRODUCT */}
              <div className="px-6 py-3 flex items-center">
                <span className={themeClasses.textPrimary}>{label.product}</span>
              </div>

              {/* SIZE */}
              <div className="px-6 py-3 flex items-center">
                <span className={themeClasses.textPrimary}>{label.size}</span>
              </div>

              {/* LABEL LINK */}
              <div className="px-6 py-3 flex items-center">
                <a
                  href={label.labelLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 hover:underline text-sm truncate"
                  title={label.labelLink}
                >
                  {label.labelLink.length > 30
                    ? `${label.labelLink.substring(0, 30)}...`
                    : label.labelLink}
                </a>
              </div>

              {/* LABEL SIZE */}
              <div className="px-6 py-3 flex items-center">
                <span className={themeClasses.textPrimary}>{label.labelSize}</span>
              </div>

              {/* INVENTORY */}
              <div className="px-6 py-3 flex items-center">
                <span className={themeClasses.textPrimary}>
                  {label.inventory.toLocaleString()}
                </span>
              </div>

              {/* Actions */}
              <div className="px-6 py-3 flex items-center justify-end relative">
                <button
                  type="button"
                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-dark-bg-tertiary transition-colors"
                  onClick={() => setActionMenuLabelId(actionMenuLabelId === label.id ? null : label.id)}
                  aria-label="Label actions"
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

InventoryTable.displayName = 'InventoryTable';

export default InventoryTable;

