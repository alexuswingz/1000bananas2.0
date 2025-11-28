import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../../../../context/ThemeContext';
import { calculatePallets } from '../../../../utils/palletCalculations';
import { boxesApi, transformInventoryData } from '../../../../services/supplyChainApi';

const BoxOrderPage = () => {
  const { isDarkMode } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state || {};
  const orderNumber = state.orderNumber || '';
  const supplier = state.supplier || null;
  const mode = state.mode || 'create';
  const isReceiveMode = mode === 'receive';
  const orderId = state.orderId || null;

  // Fetch available boxes from API
  const [availableBoxes, setAvailableBoxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderLines, setOrderLines] = useState([]);
  const [isReceiveConfirmOpen, setIsReceiveConfirmOpen] = useState(false);
  const [showAddBoxModal, setShowAddBoxModal] = useState(false);

  // Fetch order details if viewing/receiving existing order
  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (isReceiveMode && orderId) {
        try {
          setLoading(true);
          const response = await boxesApi.getOrder(orderId);
          if (response.success) {
            const orderData = response.data;
            
            // Handle multiple order lines
            const lines = orderData.lines || [];
            const orderLines = lines.map((line, index) => {
              const originalQty = line.quantity_ordered || 0;
              const receivedQty = line.quantity_received || 0;
              const qtyToReceive = originalQty - receivedQty; // Remaining to receive
              const calculatedPallets = calculatePallets(
                qtyToReceive,
                line.units_per_pallet || 1
              );
              return {
                id: line.id || index + 1,
                orderId: line.id,
                name: line.box_type || 'Unknown Box',
                boxType: line.box_type || 'Unknown Box',
                qty: qtyToReceive, // Default to remaining quantity
                originalQty: originalQty, // Store original ordered quantity
                receivedQty: receivedQty, // Store already received quantity
                pallets: calculatedPallets,
                unitsPerPallet: line.units_per_pallet || 1,
                supplier: line.supplier,
                selected: qtyToReceive > 0, // Auto-select if there's remaining to receive
              };
            });
            
            console.log('Loaded order lines:', orderLines);
            setOrderLines(orderLines);
          }
        } catch (err) {
          console.error('Error fetching order details:', err);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchOrderDetails();
  }, [isReceiveMode, orderId]);

  // Fetch boxes on mount for create mode
  useEffect(() => {
    const fetchBoxes = async () => {
      if (!isReceiveMode) {
        try {
          setLoading(true);
          const response = await boxesApi.getInventory();
          console.log('RAW API RESPONSE:', response);
          if (response.success) {
            const boxes = transformInventoryData(response);
            console.log('Fetched boxes from API:', boxes.length, boxes);
            console.log('First box data:', boxes[0]);
            setAvailableBoxes(boxes);
            
            // Create lines for ALL boxes
            const allBoxLines = boxes.map((box, index) => {
              const defaultQty = box.unitsPerPallet || 1000;
              const calculatedPallets = calculatePallets(defaultQty, box.unitsPerPallet || 1);
              console.log(`Creating line for ${box.name}:`, {
                unitsPerPallet: box.unitsPerPallet,
                defaultQty,
                calculatedPallets
              });
              return {
                id: index + 1,
                name: box.name,
                boxType: box.name,
                unitsNeeded: defaultQty,
                qty: defaultQty,
                pallets: calculatedPallets,
                unitsPerPallet: box.unitsPerPallet || 1,
                supplier: box.supplier,
                selected: true,
              };
            });
            console.log('Created order lines:', allBoxLines.length, allBoxLines);
            setOrderLines(allBoxLines);
          }
        } catch (err) {
          console.error('Error fetching boxes:', err);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchBoxes();
  }, [isReceiveMode]);

  const themeClasses = {
    pageBg: isDarkMode ? 'bg-dark-bg-primary' : 'bg-light-bg-primary',
    cardBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    textPrimary: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
  };

  const handleBack = () => {
    navigate('/dashboard/supply-chain/boxes');
  };

  const handleCreateOrder = async () => {
    try {
      const selectedLines = orderLines.filter(l => l.selected);
      const timestamp = Date.now();
      
      // Create separate order for each box type
      for (let i = 0; i < selectedLines.length; i++) {
        const line = selectedLines[i];
        const orderData = {
          order_number: `${orderNumber}-${timestamp}-${i + 1}`,
          box_type: line.boxType,
          supplier: supplier.name,
          order_date: new Date().toISOString().split('T')[0],
          quantity_ordered: line.qty,
          cost_per_unit: 0,
          total_cost: 0,
          status: 'pending',
          notes: `${line.qty} units (${line.pallets} pallets)`,
        };

        await boxesApi.createOrder(orderData);
      }
      
      navigate('/dashboard/supply-chain/boxes', {
        state: {
          newBoxOrder: {
            orderNumber,
            supplierName: supplier.name,
          },
        },
      });
    } catch (err) {
      console.error('Error creating order:', err);
      alert(`Failed to create order: ${err.message}`);
    }
  };

  const handleAddBox = (box) => {
    const nextId = orderLines.length ? Math.max(...orderLines.map(l => l.id)) + 1 : 1;
    const defaultQty = box.unitsPerPallet || 1000;
    const newLine = {
      id: nextId,
      name: box.name,
      boxType: box.name,
      unitsNeeded: defaultQty,
      qty: defaultQty,
      pallets: calculatePallets(defaultQty, box.unitsPerPallet || 1),
      unitsPerPallet: box.unitsPerPallet || 1,
      supplier: box.supplier,
      selected: true,
    };
    setOrderLines([...orderLines, newLine]);
    setShowAddBoxModal(false);
  };

  const handleRemoveLine = (lineId) => {
    setOrderLines(prev => prev.filter(l => l.id !== lineId));
  };

  const handleReceiveComplete = async (isPartial = false) => {
    try {
      const selectedLines = orderLines.filter(l => l.selected);
      
      if (selectedLines.length === 0) {
        alert('Please select at least one line to receive');
        return;
      }
      
      // Validate quantities before processing
      for (const line of selectedLines) {
        const alreadyReceived = line.receivedQty || 0;
        const newReceived = line.qty || 0;
        const totalReceived = alreadyReceived + newReceived;
        const originalQty = line.originalQty || 0;
        
        if (totalReceived > originalQty) {
          alert(`Cannot receive ${totalReceived} units for ${line.boxType}. Maximum is ${originalQty} units (${alreadyReceived} already received, ${originalQty - alreadyReceived} remaining).`);
          return;
        }
        
        if (newReceived <= 0) {
          alert(`Please enter a valid quantity greater than 0 for ${line.boxType}`);
          return;
        }
      }
      
      // Update each received line
      for (const line of selectedLines) {
        const lineOrderId = line.orderId || orderId;
        
        // Calculate total received: already received + new received
        const alreadyReceived = line.receivedQty || 0;
        const newReceived = line.qty || 0;
        const totalReceived = alreadyReceived + newReceived;
        
        // Determine if this is partial (total received < original ordered)
        const originalQty = line.originalQty || totalReceived;
        const isLinePartial = totalReceived < originalQty;
        
        // Update order with total received quantity
        await boxesApi.updateOrder(lineOrderId, {
          box_type: line.boxType,
          status: isLinePartial ? 'partial' : 'received',
          actual_delivery_date: new Date().toISOString().split('T')[0],
          quantity_received: totalReceived, // Total received (previous + new)
        });
      }
      
      // Check if any lines were not selected or quantities reduced (partial receive)
      const unselectedLines = orderLines.filter(l => !l.selected);
      const hasUnselected = unselectedLines.length > 0;
      const hasReducedQty = selectedLines.some(l => {
        const totalReceived = (l.receivedQty || 0) + (l.qty || 0);
        return totalReceived < (l.originalQty || 0);
      });
      
      navigate('/dashboard/supply-chain/boxes', {
        state: {
          receivedOrderId: orderId,
          isPartial: isPartial || hasUnselected || hasReducedQty,
        },
      });
    } catch (err) {
      console.error('Error receiving order:', err);
      alert(`Failed to receive order: ${err.message}`);
    }
  };

  if (!supplier || !orderNumber) {
    // If this page is hit directly, just send user back to boxes
    handleBack();
    return null;
  }

  return (
    <div className={`p-8 ${themeClasses.pageBg}`}>
      <div className={`${themeClasses.cardBg} rounded-xl border ${themeClasses.border} shadow-lg`}>
        {/* Header row */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-full hover:bg-gray-100"
              onClick={handleBack}
            >
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-gray-400">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </span>
              Back
            </button>

            <div className="flex flex-col gap-1 text-xs text-gray-500">
              <div className="flex items-center gap-8">
                <div>
                  <div className="uppercase tracking-wide text-[10px] text-gray-400">Box Order #</div>
                  <div className="text-sm font-semibold text-gray-900">{orderNumber}</div>
                </div>
                <div className="flex flex-col items-start gap-1">
                  <div className="uppercase tracking-wide text-[10px] text-gray-400">Supplier</div>
                  <div className="flex items-center gap-2">
                    <img
                      src={supplier.logoSrc}
                      alt={supplier.logoAlt}
                      className="h-6 object-contain"
                    />
                    <span className="text-sm font-semibold text-gray-900">{supplier.name}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {!isReceiveMode ? (
            <button
              type="button"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg px-4 py-2 shadow-sm"
              onClick={handleCreateOrder}
            >
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-white/60">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </span>
              Create Order
            </button>
          ) : (
            <button
              type="button"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg px-4 py-2 shadow-sm"
              onClick={() => {
                const selectedLines = orderLines.filter((line) => line.selected);
                if (selectedLines.length === 0) {
                  alert('Please select at least one line to receive');
                  return;
                }
                
                const allChecked = orderLines.every((line) => line.selected);
                const allFullQty = selectedLines.every((line) => {
                  // Check if received qty equals original ordered qty
                  return line.qty >= (line.originalQty || line.qty);
                });
                
                if (allChecked && allFullQty) {
                  // Full receive – all lines, full quantities
                  handleReceiveComplete(false);
                } else {
                  // Partial receive – show confirmation popup
                  setIsReceiveConfirmOpen(true);
                }
              }}
            >
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-white/60">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </span>
              Receive
            </button>
          )}
        </div>

        {/* Table */}
        <div className="px-6 py-4">
          <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Table header */}
            <div className="bg-[#1f2937] text-white text-[11px] font-semibold uppercase tracking-wide">
              <div
                className="grid items-center"
                style={{ gridTemplateColumns: '2fr 1.2fr 1.2fr 40px 40px' }}
              >
                <div className="px-4 py-2 border-r border-gray-700 text-center">Box Size</div>
                <div className="px-4 py-2 border-r border-gray-700 text-center">Qty</div>
                <div className="px-4 py-2 border-r border-gray-700 text-center">Pallets</div>
                <div className="px-4 py-2 border-r border-gray-700 text-center"></div>
                <div className="px-4 py-2 text-center"></div>
              </div>
            </div>

            {/* Table rows */}
            <div className="bg-white">
              {loading ? (
                <div className="px-4 py-6 text-center text-gray-500">Loading boxes...</div>
              ) : orderLines.length === 0 ? (
                <div className="px-4 py-6 text-center text-gray-500">No boxes added yet</div>
              ) : (
                orderLines.map((line) => (
                <div
                  key={line.id}
                  className="grid items-center text-sm border-t border-gray-100"
                  style={{ gridTemplateColumns: '2fr 1.2fr 1.2fr 40px 40px' }}
                >
                  <div className="px-4 py-2 text-sm text-gray-900">{line.name}</div>
                  <div className="px-4 py-2">
                    <input
                      type="number"
                      min="0"
                      max={isReceiveMode && line.originalQty ? (line.originalQty - (line.receivedQty || 0)) : undefined}
                      className="w-full text-sm px-2 py-1 text-center bg-white shadow-inner border border-gray-200 rounded-none"
                      value={line.qty}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        
                        // Only validate max quantity when receiving (originalQty exists)
                        if (isReceiveMode && line.originalQty) {
                          const maxQty = line.originalQty - (line.receivedQty || 0);
                          const clampedVal = Math.min(val, maxQty);
                          
                          if (val > maxQty) {
                            alert(`Cannot receive more than ${maxQty} units (${line.originalQty} ordered - ${line.receivedQty || 0} already received)`);
                          }
                          
                          // Use clamped value for receive mode
                          const finalVal = clampedVal;
                          const unitsPerPallet = line.unitsPerPallet || 1;
                          const newPallets = calculatePallets(finalVal, unitsPerPallet);
                          
                          setOrderLines((prev) =>
                            prev.map((l) => {
                              if (l.id === line.id) {
                                return { ...l, qty: finalVal, pallets: newPallets };
                              }
                              return l;
                            })
                          );
                        } else {
                          // Create mode: allow any positive quantity, no max limit
                          const unitsPerPallet = line.unitsPerPallet || 1;
                          const newPallets = calculatePallets(val, unitsPerPallet);
                          
                          setOrderLines((prev) =>
                            prev.map((l) => {
                              if (l.id === line.id) {
                                return { ...l, qty: val, pallets: newPallets };
                              }
                              return l;
                            })
                          );
                        }
                      }}
                    />
                  </div>
                  <div className="px-4 py-2">
                    <div className="text-sm px-2 py-1 text-right text-gray-700 font-medium" title={`Auto-calculated: ${line.qty} ÷ ${line.unitsPerPallet || 'N/A'} units/pallet = ${line.pallets} pallet${line.pallets !== 1 ? 's' : ''}`}>
                      {line.pallets}
                    </div>
                  </div>
                  <div className="px-4 py-2 flex items-center justify-center">
                    <input
                      type="checkbox"
                      className="form-checkbox h-3.5 w-3.5 rounded border-gray-400"
                      checked={line.selected}
                      onChange={(e) =>
                        setOrderLines((prev) =>
                          prev.map((l) =>
                            l.id === line.id ? { ...l, selected: e.target.checked } : l
                          )
                        )
                      }
                    />
                  </div>
                  <div className="px-4 py-2 flex items-center justify-center">
                    <button
                      type="button"
                      className="text-red-500 hover:text-red-700 text-xs"
                      onClick={() => handleRemoveLine(line.id)}
                      title="Remove line"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )))}
            </div>
            
            {/* Add box button */}
            {!isReceiveMode && (
              <div className="bg-gray-50 border-t border-gray-200 px-4 py-3">
                <button
                  type="button"
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  onClick={() => setShowAddBoxModal(true)}
                >
                  <span className="text-lg">+</span> Add Box
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Box Modal */}
      {showAddBoxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Add Box to Order</h2>
            </div>
            <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-1 gap-2">
                {availableBoxes.map((box) => {
                  const alreadyAdded = orderLines.some(l => l.name === box.name);
                  return (
                    <button
                      key={box.id}
                      type="button"
                      className={`text-left px-4 py-3 rounded-lg border transition-colors ${
                        alreadyAdded 
                          ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                          : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                      }`}
                      onClick={() => !alreadyAdded && handleAddBox(box)}
                      disabled={alreadyAdded}
                    >
                      <div className="font-semibold text-sm">{box.name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {box.unitsPerPallet} units/pallet • {box.supplier}
                        {alreadyAdded && ' • Already added'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100"
                onClick={() => setShowAddBoxModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {isReceiveMode && isReceiveConfirmOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md px-8 py-6 text-center">
            <h2 className="text-base font-semibold text-gray-900 mb-2">Are you sure?</h2>
            <p className="text-xs text-gray-500 mb-6">
              Proceed with a partial delivery? Only received items will be updated in inventory.
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100"
                onClick={() => setIsReceiveConfirmOpen(false)}
              >
                Go Back
              </button>
              <button
                type="button"
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                onClick={() => {
                  setIsReceiveConfirmOpen(false);
                  handleReceiveComplete(true);
                }}
              >
                Complete Partial
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BoxOrderPage;
