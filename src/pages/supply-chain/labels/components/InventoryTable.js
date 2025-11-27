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
    const inboundValues = [3000, 500, 0, 0, 0, 0, 500, 4000, 0, 0, 0, 0, 2000, 1000, 0];
    return Array.from({ length: 15 }, (_, i) => ({
      id: i + 1,
      status: i === 7 || i === 14 ? 'Needs Proofing' : 'Up to Date', // Row 8 and 15 (0-indexed: 7 and 14)
      brand: 'Total Pest Spray',
      product: 'Cherry Tree Fertilizer',
      size: 'Gallon',
      inventory: 25000,
      inbound: inboundValues[i] || 0,
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
  const actionMenuRefs = useRef({});
  const actionButtonRefs = useRef({});
  
  // Edit inventory modal state
  const [isEditInventoryOpen, setIsEditInventoryOpen] = useState(false);
  const [editingLabel, setEditingLabel] = useState(null);
  const [fullRolls, setFullRolls] = useState(['', '', '']);
  const [partialWeights, setPartialWeights] = useState(['', '', '']);
  const [successNotification, setSuccessNotification] = useState(null);
  
  // Status dropdown state
  const [statusDropdownId, setStatusDropdownId] = useState(null);
  const statusMenuRefs = useRef({});
  const statusButtonRefs = useRef({});

  // Filter icon state
  const [openFilterColumn, setOpenFilterColumn] = useState(null);
  const filterIconRefs = useRef({});
  const filterDropdownRef = useRef(null);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openFilterColumn !== null) {
        const filterIcon = filterIconRefs.current[openFilterColumn];
        const dropdown = filterDropdownRef.current;
        
        if (filterIcon && dropdown) {
          const isClickInsideIcon = filterIcon.contains(event.target);
          const isClickInsideDropdown = dropdown.contains(event.target);
          
          if (!isClickInsideIcon && !isClickInsideDropdown) {
            setOpenFilterColumn(null);
          }
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

  // Handle edit inventory
  const handleEditInventory = (label) => {
    setEditingLabel(label);
    setFullRolls(['', '', '']);
    setPartialWeights(['', '', '']);
    setIsEditInventoryOpen(true);
    setActionMenuLabelId(null);
  };

  // Handle delete (show popup but don't delete)
  const handleDelete = (label) => {
    // Show confirmation but don't actually delete
    alert(`Delete action for ${label.product} (${label.size}) - Data will not be deleted`);
    setActionMenuLabelId(null);
  };

  // Calculate total labels
  // Assumptions: Each full roll = 1000 labels, each gram of partial roll = 10 labels
  const calculateTotalLabels = () => {
    const fullRollCount = fullRolls.reduce((sum, roll) => sum + (parseInt(roll) || 0), 0);
    const partialWeightTotal = partialWeights.reduce((sum, weight) => sum + (parseInt(weight) || 0), 0);
    
    const labelsFromFullRolls = fullRollCount * 1000; // Each full roll = 1000 labels
    const labelsFromPartialRolls = partialWeightTotal * 10; // Each gram = 10 labels
    
    return labelsFromFullRolls + labelsFromPartialRolls;
  };

  // Handle save changes
  const handleSaveInventory = () => {
    const calculatedTotal = calculateTotalLabels();
    const currentInventory = editingLabel?.inventory || 0;
    const discrepancy = calculatedTotal - currentInventory;
    
    // Update the label inventory (optional - you can remove this if you don't want to update)
    // setLabels((prev) =>
    //   prev.map((label) =>
    //     label.id === editingLabel.id ? { ...label, inventory: calculatedTotal } : label
    //   )
    // );
    
    // Show success notification
    setSuccessNotification({
      message: `${editingLabel?.product} (${editingLabel?.size}) inventory updated`,
    });
    
    // Auto-dismiss notification after 5 seconds
    setTimeout(() => {
      setSuccessNotification(null);
    }, 5000);
    
    setIsEditInventoryOpen(false);
    setEditingLabel(null);
  };

  // Add another roll field
  const handleAddFullRoll = () => {
    setFullRolls([...fullRolls, '']);
  };

  // Add another weight field
  const handleAddPartialWeight = () => {
    setPartialWeights([...partialWeights, '']);
  };

  // Handle filter icon click
  const handleFilterClick = (columnKey, e) => {
    e.stopPropagation();
    setOpenFilterColumn(openFilterColumn === columnKey ? null : columnKey);
  };

  const renderStatus = (label) => {
    const status = label.status;
    const isUpToDate = status === 'Up to Date';
    
    return (
      <div className="relative">
        <button
          ref={(el) => (statusButtonRefs.current[label.id] = el)}
          type="button"
          data-status-button={label.id}
          className="inline-flex items-center justify-between h-6 w-[156px] py-1 px-3 rounded border border-gray-300 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            setStatusDropdownId(statusDropdownId === label.id ? null : label.id);
          }}
        >
          <div className="flex items-center gap-2">
            {isUpToDate ? (
              <svg className="w-3.5 h-3.5" fill="#10B981" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="#10B981"/>
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="#F97316" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="#F97316"/>
              </svg>
            )}
            <span className="text-gray-700">{status}</span>
          </div>
          <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {statusDropdownId === label.id && (
          <div
            ref={(el) => (statusMenuRefs.current[label.id] = el)}
            className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg text-xs z-50 min-w-[160px]"
          >
            <button
              type="button"
              className={`w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 transition-colors ${
                status === 'Up to Date' ? 'bg-gray-50' : ''
              }`}
              onClick={() => handleStatusChange(label.id, 'Up to Date')}
            >
              <svg className="w-3.5 h-3.5" fill="#10B981" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="#10B981"/>
              </svg>
              <span className="text-gray-700 font-medium">Up to Date</span>
            </button>
            <button
              type="button"
              className={`w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 transition-colors ${
                status === 'Needs Proofing' ? 'bg-gray-50' : ''
              }`}
              onClick={() => handleStatusChange(label.id, 'Needs Proofing')}
            >
              <svg className="w-3.5 h-3.5" fill="#F97316" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="#F97316"/>
              </svg>
              <span className="text-gray-700 font-medium">Needs Proofing</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Table header */}
      <div style={{ width: '100%', height: '40px', borderRadius: '12px 12px 0 0', backgroundColor: '#2C3544', overflow: 'hidden' }}>
        <div
          className="grid h-full"
          style={{
            gridTemplateColumns: '220px 180px 220px 120px 140px 140px 1fr',
            width: '100%',
            height: '100%',
            backgroundColor: '#2C3544',
            gap: 0,
            margin: 0,
            padding: 0,
          }}
        >
          <div className="text-xs font-bold text-white uppercase tracking-wider border-r border-white group" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', borderTopLeftRadius: '12px', backgroundColor: '#2C3544', paddingTop: '12px', paddingRight: '24px', paddingBottom: '12px', paddingLeft: '24px', boxSizing: 'border-box', gap: '10px' }}>
            <div className="flex items-center gap-2">
              <span>LABEL STATUS</span>
              <img
                ref={(el) => { if (el) filterIconRefs.current['status'] = el; }}
                src="/assets/Vector (1).png"
                alt="Filter"
                className={`w-3 h-3 transition-opacity cursor-pointer ${
                  openFilterColumn === 'status'
                    ? 'opacity-100'
                    : 'opacity-0 group-hover:opacity-100'
                }`}
                onClick={(e) => handleFilterClick('status', e)}
                style={
                  openFilterColumn === 'status'
                    ? {
                        filter:
                          'invert(29%) sepia(94%) saturate(2576%) hue-rotate(199deg) brightness(102%) contrast(105%)',
                      }
                    : undefined
                }
              />
            </div>
          </div>
          <div className="text-xs font-bold text-white uppercase tracking-wider border-r border-white group" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2C3544', paddingTop: '12px', paddingRight: '24px', paddingBottom: '12px', paddingLeft: '24px', boxSizing: 'border-box', gap: '10px' }}>
            <div className="flex items-center justify-center gap-2">
              <span>BRAND</span>
              <img
                ref={(el) => { if (el) filterIconRefs.current['brand'] = el; }}
                src="/assets/Vector (1).png"
                alt="Filter"
                className={`w-3 h-3 transition-opacity cursor-pointer ${
                  openFilterColumn === 'brand'
                    ? 'opacity-100'
                    : 'opacity-0 group-hover:opacity-100'
                }`}
                onClick={(e) => handleFilterClick('brand', e)}
                style={
                  openFilterColumn === 'brand'
                    ? {
                        filter:
                          'invert(29%) sepia(94%) saturate(2576%) hue-rotate(199deg) brightness(102%) contrast(105%)',
                      }
                    : undefined
                }
              />
            </div>
          </div>
          <div className="text-xs font-bold text-white uppercase tracking-wider border-r border-white group" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2C3544', paddingTop: '12px', paddingRight: '24px', paddingBottom: '12px', paddingLeft: '24px', boxSizing: 'border-box', gap: '10px' }}>
            <div className="flex items-center justify-center gap-2">
              <span>PRODUCT</span>
              <img
                ref={(el) => { if (el) filterIconRefs.current['product'] = el; }}
                src="/assets/Vector (1).png"
                alt="Filter"
                className={`w-3 h-3 transition-opacity cursor-pointer ${
                  openFilterColumn === 'product'
                    ? 'opacity-100'
                    : 'opacity-0 group-hover:opacity-100'
                }`}
                onClick={(e) => handleFilterClick('product', e)}
                style={
                  openFilterColumn === 'product'
                    ? {
                        filter:
                          'invert(29%) sepia(94%) saturate(2576%) hue-rotate(199deg) brightness(102%) contrast(105%)',
                      }
                    : undefined
                }
              />
            </div>
          </div>
          <div className="text-xs font-bold text-white uppercase tracking-wider border-r border-white group" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2C3544', paddingTop: '12px', paddingRight: '24px', paddingBottom: '12px', paddingLeft: '24px', boxSizing: 'border-box', gap: '10px' }}>
            <div className="flex items-center justify-center gap-2">
              <span>SIZE</span>
              <img
                ref={(el) => { if (el) filterIconRefs.current['size'] = el; }}
                src="/assets/Vector (1).png"
                alt="Filter"
                className={`w-3 h-3 transition-opacity cursor-pointer ${
                  openFilterColumn === 'size'
                    ? 'opacity-100'
                    : 'opacity-0 group-hover:opacity-100'
                }`}
                onClick={(e) => handleFilterClick('size', e)}
                style={
                  openFilterColumn === 'size'
                    ? {
                        filter:
                          'invert(29%) sepia(94%) saturate(2576%) hue-rotate(199deg) brightness(102%) contrast(105%)',
                      }
                    : undefined
                }
              />
            </div>
          </div>
          <div className="text-xs font-bold text-white uppercase tracking-wider border-r border-white group" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2C3544', paddingTop: '12px', paddingRight: '24px', paddingBottom: '12px', paddingLeft: '24px', boxSizing: 'border-box', gap: '10px' }}>
            <div className="flex items-center justify-center gap-2">
              <span>INVENTORY</span>
              <img
                ref={(el) => { if (el) filterIconRefs.current['inventory'] = el; }}
                src="/assets/Vector (1).png"
                alt="Filter"
                className={`w-3 h-3 transition-opacity cursor-pointer ${
                  openFilterColumn === 'inventory'
                    ? 'opacity-100'
                    : 'opacity-0 group-hover:opacity-100'
                }`}
                onClick={(e) => handleFilterClick('inventory', e)}
                style={
                  openFilterColumn === 'inventory'
                    ? {
                        filter:
                          'invert(29%) sepia(94%) saturate(2576%) hue-rotate(199deg) brightness(102%) contrast(105%)',
                      }
                    : undefined
                }
              />
            </div>
          </div>
          <div className="text-xs font-bold text-white uppercase tracking-wider border-r border-white group" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2C3544', paddingTop: '12px', paddingRight: '24px', paddingBottom: '12px', paddingLeft: '24px', boxSizing: 'border-box', gap: '10px' }}>
            <div className="flex items-center justify-center gap-2">
              <span>INBOUND</span>
              <img
                ref={(el) => { if (el) filterIconRefs.current['inbound'] = el; }}
                src="/assets/Vector (1).png"
                alt="Filter"
                className={`w-3 h-3 transition-opacity cursor-pointer ${
                  openFilterColumn === 'inbound'
                    ? 'opacity-100'
                    : 'opacity-0 group-hover:opacity-100'
                }`}
                onClick={(e) => handleFilterClick('inbound', e)}
                style={
                  openFilterColumn === 'inbound'
                    ? {
                        filter:
                          'invert(29%) sepia(94%) saturate(2576%) hue-rotate(199deg) brightness(102%) contrast(105%)',
                      }
                    : undefined
                }
              />
            </div>
          </div>
          <div className="text-xs font-bold text-white uppercase tracking-wider" style={{ width: '100%', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', borderTopRightRadius: '12px', backgroundColor: '#2C3544', paddingTop: '12px', paddingRight: '16px', paddingBottom: '12px', paddingLeft: '16px', boxSizing: 'border-box', gap: '10px' }}>
            {/* Actions column header - separate tab */}
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
                gridTemplateColumns: '220px 180px 220px 120px 140px 140px 1fr',
                borderBottom:
                  index === filteredData.length - 1
                    ? 'none'
                    : isDarkMode
                    ? '1px solid rgba(75,85,99,0.3)'
                    : '1px solid #e5e7eb',
              }}
            >
              {/* LABEL STATUS */}
              <div className="py-3 flex items-center relative" style={{ paddingLeft: '24px', paddingRight: '24px', justifyContent: 'flex-start' }}>
                {renderStatus(label)}
              </div>

              {/* BRAND */}
              <div className="py-3 flex items-center" style={{ paddingLeft: '24px', paddingRight: '24px', justifyContent: 'center' }}>
                <span className={themeClasses.textPrimary}>{label.brand}</span>
              </div>

              {/* PRODUCT */}
              <div className="py-3 flex items-center" style={{ paddingLeft: '24px', paddingRight: '24px', justifyContent: 'center' }}>
                <span className={themeClasses.textPrimary}>{label.product}</span>
              </div>

              {/* SIZE */}
              <div className="py-3 flex items-center" style={{ paddingLeft: '24px', paddingRight: '24px', justifyContent: 'center' }}>
                <span className={themeClasses.textPrimary}>{label.size}</span>
              </div>

              {/* INVENTORY */}
              <div className="py-3 flex items-center" style={{ paddingLeft: '24px', paddingRight: '24px', justifyContent: 'center' }}>
                <span className={themeClasses.textPrimary}>
                  {label.inventory.toLocaleString()}
                </span>
              </div>

              {/* INBOUND */}
              <div className="py-3 flex items-center" style={{ paddingLeft: '24px', paddingRight: '24px', justifyContent: 'center' }}>
                <span className={themeClasses.textPrimary}>
                  {(label.inbound || 0).toLocaleString()}
                </span>
              </div>

              {/* Actions */}
              <div className="py-3 flex items-center justify-end relative" style={{ paddingRight: '16px', paddingLeft: '16px', width: '100%' }}>
                <button
                  ref={(el) => (actionButtonRefs.current[label.id] = el)}
                  type="button"
                  data-action-button={label.id}
                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-dark-bg-tertiary transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActionMenuLabelId(actionMenuLabelId === label.id ? null : label.id);
                  }}
                  aria-label="Label actions"
                >
                  <span className={themeClasses.textSecondary}>⋮</span>
                </button>

                {actionMenuLabelId === label.id && (
                  <div
                    ref={(el) => (actionMenuRefs.current[label.id] = el)}
                    className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg text-xs z-50 min-w-[160px]"
                  >
                    <button
                      type="button"
                      className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 text-gray-700 transition-colors border-b border-gray-200"
                      onClick={() => handleEditInventory(label)}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      <span>Edit inventory</span>
                    </button>
                    <button
                      type="button"
                      className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 text-red-600 transition-colors"
                      onClick={() => handleDelete(label)}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Inventory Modal */}
      {isEditInventoryOpen && editingLabel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Edit Label Inventory - {editingLabel.product} ({editingLabel.size})
              </h2>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600"
                onClick={() => {
                  setIsEditInventoryOpen(false);
                  setEditingLabel(null);
                }}
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-6 overflow-y-auto flex-1">
              {/* Header section */}
              <div>
                <h3 className="text-base font-bold text-gray-900 mb-1">Update Label Inventory</h3>
                <p className="text-sm text-gray-600">
                  Enter the current inventory for full and partial label rolls to verify or update the count.
                </p>
              </div>

              {/* Two column layout */}
              <div className="grid grid-cols-2 gap-6">
                {/* Full Label Roll Count */}
                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-1">Full Label Roll Count</h4>
                  <p className="text-xs text-gray-600 mb-3">
                    Enter the quantity of complete, unused label rolls.
                  </p>
                  <div className="space-y-2">
                    {fullRolls.map((roll, index) => (
                      <input
                        key={index}
                        type="number"
                        placeholder="Enter roll quantity..."
                        value={roll}
                        onChange={(e) => {
                          const newRolls = [...fullRolls];
                          newRolls[index] = e.target.value;
                          setFullRolls(newRolls);
                        }}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleAddFullRoll}
                    className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                  >
                    <span>+</span>
                    <span>Add Another Roll</span>
                  </button>
                </div>

                {/* Partial Roll Weight */}
                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-1">Partial Roll Weight (g)</h4>
                  <p className="text-xs text-gray-600 mb-3">
                    Enter the weight in grams for each partially used roll.
                  </p>
                  <div className="space-y-2">
                    {partialWeights.map((weight, index) => (
                      <input
                        key={index}
                        type="number"
                        placeholder="Enter roll weight..."
                        value={weight}
                        onChange={(e) => {
                          const newWeights = [...partialWeights];
                          newWeights[index] = e.target.value;
                          setPartialWeights(newWeights);
                        }}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleAddPartialWeight}
                    className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                  >
                    <span>+</span>
                    <span>Add Another Weight</span>
                  </button>
                </div>
              </div>

              {/* Calculated Total Labels */}
              <div className="flex items-start justify-between pt-4 border-t border-gray-200">
                <div>
                  <h4 className="text-base font-bold text-gray-900 mb-1">Calculated Total Labels</h4>
                  <p className="text-sm text-gray-500">
                    Current Label Inventory: {editingLabel.inventory.toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {calculateTotalLabels().toLocaleString()}
                  </div>
                  {(() => {
                    const discrepancy = calculateTotalLabels() - editingLabel.inventory;
                    if (discrepancy !== 0) {
                      return (
                        <div className={`flex items-center gap-1 ${discrepancy < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={discrepancy < 0 ? "M19 9l-7 7-7-7" : "M5 15l7-7 7 7"} />
                          </svg>
                          <span className="text-sm font-medium">
                            {discrepancy > 0 ? '+' : ''}{discrepancy} Discrepancy
                          </span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100"
                onClick={() => {
                  setIsEditInventoryOpen(false);
                  setEditingLabel(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                onClick={handleSaveInventory}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {successNotification && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center justify-between shadow-lg min-w-[400px]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-sm font-medium text-green-800">{successNotification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessNotification(null)}
            className="text-green-600 hover:text-green-700"
            aria-label="Dismiss notification"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Filter Dropdown */}
      {openFilterColumn !== null && (
        <FilterDropdown
          ref={filterDropdownRef}
          columnKey={openFilterColumn}
          filterIconRef={filterIconRefs.current[openFilterColumn]}
          onClose={() => setOpenFilterColumn(null)}
          isDarkMode={isDarkMode}
        />
      )}
    </>
  );
});

InventoryTable.displayName = 'InventoryTable';

// FilterDropdown Component
const FilterDropdown = React.forwardRef(({ columnKey, filterIconRef, onClose, isDarkMode }, ref) => {
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
      const dropdownHeight = 400;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let left = rect.left;
      let top = rect.bottom + 8;
      
      // Adjust if dropdown goes off right edge
      if (left + dropdownWidth > viewportWidth) {
        left = viewportWidth - dropdownWidth - 16;
      }
      
      // Adjust if dropdown goes off bottom
      if (top + dropdownHeight > viewportHeight) {
        top = rect.top - dropdownHeight - 8;
      }
      
      // Don't go off left edge
      if (left < 16) {
        left = 16;
      }
      
      // Don't go off top edge
      if (top < 16) {
        top = 16;
      }
      
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
    // Apply filter logic here
    onClose();
  };

  const sortFields = [
    { value: 'status', label: 'Label Status' },
    { value: 'brand', label: 'Brand' },
    { value: 'product', label: 'Product' },
    { value: 'size', label: 'Size' },
    { value: 'inventory', label: 'Inventory' },
    { value: 'inbound', label: 'Inbound' },
  ];

  const sortOrders = [
    { value: 'asc', label: 'Sort ascending (A to Z)', icon: 'A^Z' },
    { value: 'desc', label: 'Sort descending (Z to A)', icon: 'Z^A' },
  ];

  const filterFields = [
    { value: '', label: 'Select field' },
    { value: 'status', label: 'Label Status' },
    { value: 'brand', label: 'Brand' },
    { value: 'product', label: 'Product' },
    { value: 'size', label: 'Size' },
    { value: 'inventory', label: 'Inventory' },
    { value: 'inbound', label: 'Inbound' },
  ];

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

FilterDropdown.displayName = 'FilterDropdown';

export default InventoryTable;

