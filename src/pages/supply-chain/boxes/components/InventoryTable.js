import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../../../context/ThemeContext';

const InventoryTable = ({ searchQuery = '' }) => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();

  // Boxes data
  const [boxes, setBoxes] = useState(() => {
    try {
      const stored = window.localStorage.getItem('boxInventory');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // If parsing fails, use default data
    }
    // Default data
    return [
      { id: 1, boxSize: '12 x 10 x 12', warehouseInventory: 1000, boxesNeeded: 200, receiveQty: 0 },
      { id: 2, boxSize: '14 x 14 x 8', warehouseInventory: 1000, boxesNeeded: 200, receiveQty: 0 },
      { id: 3, boxSize: '12 x 9 x 12', warehouseInventory: 1000, boxesNeeded: 200, receiveQty: 0 },
      { id: 4, boxSize: '13 x 10 x 10', warehouseInventory: 1000, boxesNeeded: 200, receiveQty: 0 },
      { id: 5, boxSize: '12 x 6 x 12', warehouseInventory: 1000, boxesNeeded: 200, receiveQty: 0 },
      { id: 6, boxSize: '10 x 10 x 10', warehouseInventory: 1000, boxesNeeded: 200, receiveQty: 0 },
    ];
  });

  // Persist boxes to localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem('boxInventory', JSON.stringify(boxes));
    } catch (err) {
      console.error('Failed to save box inventory to localStorage', err);
    }
  }, [boxes]);

  // Filter boxes based on search query
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return boxes;
    const query = searchQuery.toLowerCase();
    return boxes.filter(
      (box) =>
        box.boxSize.toLowerCase().includes(query)
    );
  }, [boxes, searchQuery]);

  // Inline warehouse inventory editing
  const [editingBoxId, setEditingBoxId] = useState(null);
  const [editWarehouseInv, setEditWarehouseInv] = useState('');

  // Receive quantities (temporary state for input fields)
  const [receiveQuantities, setReceiveQuantities] = useState({});

  const themeClasses = {
    cardBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    headerBg: isDarkMode ? 'bg-[#2C3544]' : 'bg-[#2C3544]',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    rowHover: isDarkMode ? 'hover:bg-dark-bg-tertiary' : 'hover:bg-gray-50',
    textPrimary: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    inputBg: isDarkMode ? 'bg-dark-bg-tertiary' : 'bg-white',
    inputBorder: isDarkMode ? 'border-dark-border-primary' : 'border-gray-300',
    inputText: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
  };

  // Handle start edit
  const handleStartEdit = (box) => {
    setEditingBoxId(box.id);
    setEditWarehouseInv(box.warehouseInventory.toString());
  };

  // Handle save edit
  const handleSaveEdit = (boxId) => {
    setBoxes((prev) =>
      prev.map((box) =>
        box.id === boxId
          ? { ...box, warehouseInventory: Number(editWarehouseInv) || 0 }
          : box
      )
    );
    setEditingBoxId(null);
    setEditWarehouseInv('');
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingBoxId(null);
    setEditWarehouseInv('');
  };

  // Handle receive quantity change
  const handleReceiveQtyChange = (boxId, value) => {
    setReceiveQuantities((prev) => ({
      ...prev,
      [boxId]: value,
    }));
  };

  // Handle receive button click - navigate to simple receive page
  const handleReceive = (box) => {
    // Get all boxes data from localStorage
    try {
      const stored = window.localStorage.getItem('boxInventory');
      const boxes = stored ? JSON.parse(stored) : [];
      
      // Navigate to box order page with simple receive view
      navigate('/dashboard/supply-chain/boxes/order', {
        state: {
          orderNumber: new Date().toISOString().split('T')[0],
          supplier: { name: 'Rhino Container', logoSrc: '/assets/rhino.png' },
          mode: 'receive', // Simple view mode
          lines: boxes.map((b) => ({
            id: b.id,
            name: b.boxSize,
            supplierInventory: 'Auto',
            unitsNeeded: b.boxesNeeded,
            qty: 200, // Default value from image
            pallets: 1, // Default value from image
            selected: false,
          })),
        },
      });
    } catch (err) {
      console.error('Failed to load boxes from localStorage', err);
    }
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
            gridTemplateColumns: '2fr 1.5fr 1.5fr 2fr',
          }}
        >
          <div className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider border-r border-[#3C4656]">
            BOX SIZE
          </div>
          <div className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider border-r border-[#3C4656]">
            WAREHOUSE INVENTORY
          </div>
          <div className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider border-r border-[#3C4656]">
            BOXES NEEDED
          </div>
          <div className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider">
            RECEIVE
          </div>
        </div>
      </div>

      {/* Table body */}
      <div>
        {filteredData.length === 0 ? (
          <div className="px-6 py-6 text-center text-sm italic text-gray-400">
            No boxes found.
          </div>
        ) : (
          filteredData.map((box, index) => (
            <div
              key={box.id}
              className={`grid text-sm ${themeClasses.rowHover} transition-colors`}
              style={{
                gridTemplateColumns: '2fr 1.5fr 1.5fr 2fr',
                borderBottom:
                  index === filteredData.length - 1
                    ? 'none'
                    : isDarkMode
                    ? '1px solid rgba(75,85,99,0.3)'
                    : '1px solid #e5e7eb',
              }}
            >
              {/* Box Size */}
              <div className="px-6 py-3 flex items-center">
                <span className={themeClasses.textPrimary}>{box.boxSize}</span>
              </div>

              {/* Warehouse Inventory */}
              <div className="px-6 py-3 flex items-center gap-2">
                {editingBoxId === box.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={editWarehouseInv}
                      onChange={(e) => setEditWarehouseInv(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveEdit(box.id);
                        } else if (e.key === 'Escape') {
                          handleCancelEdit();
                        }
                      }}
                      className={`w-24 px-2 py-1 rounded border ${themeClasses.inputBg} ${themeClasses.inputBorder} ${themeClasses.inputText} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveEdit(box.id)}
                      className="text-green-600 hover:text-green-700"
                    >
                      ✓
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="text-red-600 hover:text-red-700"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className={themeClasses.textPrimary}>{box.warehouseInventory}</span>
                    <button
                      onClick={() => handleStartEdit(box)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label="Edit warehouse inventory"
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
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              {/* Boxes Needed */}
              <div className="px-6 py-3 flex items-center">
                <span className={themeClasses.textPrimary}>{box.boxesNeeded}</span>
              </div>

              {/* Receive */}
              <div className="px-6 py-3 flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  value={receiveQuantities[box.id] ?? 0}
                  onChange={(e) => handleReceiveQtyChange(box.id, e.target.value)}
                  className={`w-20 px-2 py-1 rounded border ${themeClasses.inputBg} ${themeClasses.inputBorder} ${themeClasses.inputText} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="0"
                />
                <button
                  onClick={() => handleReceive(box)}
                  className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                >
                  Receive
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default InventoryTable;

