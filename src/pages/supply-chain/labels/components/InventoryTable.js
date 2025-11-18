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

  const renderStatus = (label) => {
    const status = label.status;
    const isUpToDate = status === 'Up to Date';
    
    return (
      <div className="relative">
        <button
          ref={(el) => (statusButtonRefs.current[label.id] = el)}
          type="button"
          data-status-button={label.id}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-gray-300 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            setStatusDropdownId(statusDropdownId === label.id ? null : label.id);
          }}
        >
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
              <div className="px-6 py-3 flex items-center relative">
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
    </div>
  );
});

InventoryTable.displayName = 'InventoryTable';

export default InventoryTable;

