import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import NewShipmentHeader from './components/NewShipmentHeader';
import NewShipmentTable from './components/NewShipmentTable';
import SortProductsTable from './components/SortProductsTable';
import SortFormulasTable from './components/SortFormulasTable';
import FormulaCheckTable from './components/FormulaCheckTable';
import LabelCheckTable from './components/LabelCheckTable';
import ShinersView from './components/ShinersView';
import UnusedFormulasView from './components/UnusedFormulasView';
import NgoosModal from './components/NgoosModal';
import ShipmentDetailsModal from './components/ShipmentDetailsModal';
import ExportTemplateModal from './components/ExportTemplateModal';
import SortProductsCompleteModal from './components/SortProductsCompleteModal';
import SortFormulasCompleteModal from './components/SortFormulasCompleteModal';

const NewShipment = () => {
  const { isDarkMode } = useTheme();
  const location = useLocation();
  const [isNgoosOpen, setIsNgoosOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [isShipmentDetailsOpen, setIsShipmentDetailsOpen] = useState(false);
  const [isExportTemplateOpen, setIsExportTemplateOpen] = useState(false);
  const [isSortProductsCompleteOpen, setIsSortProductsCompleteOpen] = useState(false);
  const [isSortFormulasCompleteOpen, setIsSortFormulasCompleteOpen] = useState(false);
  const [tableMode, setTableMode] = useState(false);
  const [activeAction, setActiveAction] = useState('add-products');
  const [completedTabs, setCompletedTabs] = useState(new Set());
  const [addedRows, setAddedRows] = useState([]);
  const [isFloorInventoryOpen, setIsFloorInventoryOpen] = useState(false);
  const [selectedFloorInventory, setSelectedFloorInventory] = useState(null);
  const [activeView, setActiveView] = useState('all-products'); // 'all-products' or 'floor-inventory'
  const floorInventoryRef = useRef(null);
  const floorInventoryButtonRef = useRef(null);
  const [floorInventoryPosition, setFloorInventoryPosition] = useState({ top: 0, left: 0 });
  const [shipmentData, setShipmentData] = useState({
    shipmentNumber: '2025-09-23',
    shipmentType: 'AWD',
    location: '',
    account: 'TPS',
  });

  // Get shipment data from navigation state
  useEffect(() => {
    if (location.state?.shipmentData) {
      setShipmentData(location.state.shipmentData);
    }
  }, [location.state]);

  const themeClasses = {
    pageBg: isDarkMode ? 'bg-dark-bg-primary' : 'bg-light-bg-primary',
  };

  const rows = [
    { id: 1, brand: 'TPS Plant Foods', product: 'Cherry Tree Fertilizer', size: '8oz', qty: 240, labelsAvailable: 180 },
    { id: 2, brand: 'TPS Plant Foods', product: 'Cherry Tree Fertilizer', size: 'Quart', qty: 96, labelsAvailable: 180 },
    { id: 3, brand: 'TPS Plant Foods', product: 'Cherry Tree Fertilizer', size: 'Gallon', qty: 28, labelsAvailable: 180 },
  ];

  const [qtyValues, setQtyValues] = useState(() => {
    const initialValues = {};
    rows.forEach((row, index) => {
      initialValues[index] = 0; // Default to 0
    });
    return initialValues;
  });

  // Calculate total units from qtyValues
  const totalUnits = Object.values(qtyValues).reduce((sum, qty) => {
    const numQty = typeof qty === 'number' ? qty : (qty === '' || qty === null || qty === undefined ? 0 : parseInt(qty, 10) || 0);
    return sum + numQty;
  }, 0);

  // Calculate total boxes based on size conversion rates
  const totalBoxes = rows.reduce((sum, row, index) => {
    const qty = qtyValues[index] ?? 0;
    const numQty = typeof qty === 'number' ? qty : (qty === '' || qty === null || qty === undefined ? 0 : parseInt(qty, 10) || 0);
    
    let boxesPerUnit = 0;
    const size = row.size?.toLowerCase() || '';
    
    if (size.includes('8oz')) {
      boxesPerUnit = 1 / 60; // 60 units = 1 box
    } else if (size.toLowerCase().includes('quart')) {
      boxesPerUnit = 1 / 12; // 12 units = 1 box
    } else if (size.toLowerCase().includes('gallon')) {
      boxesPerUnit = 1 / 4; // 4 units = 1 box
    }
    
    return sum + (numQty * boxesPerUnit);
  }, 0);

  // Calculate palettes (assuming ~50 boxes per palette, can be adjusted)
  const totalPalettes = Math.ceil(Math.ceil(totalBoxes) / 50);

  // Calculate time in hours (placeholder - can be calculated based on production time)
  const totalTimeHours = 0;

  // Calculate weight in lbs (placeholder - can be calculated based on product weights)
  const totalWeightLbs = 0;

  const handleProductClick = (row) => {
    setSelectedRow(row);
    setIsNgoosOpen(true);
  };

  const handleActionChange = (action) => {
    setActiveAction(action);
  };

  const handleBookAndProceed = () => {
    // Mark 'add-products' as completed when navigating to 'sort-products'
    setCompletedTabs(prev => {
      const newSet = new Set(prev);
      newSet.add('add-products');
      return newSet;
    });
    setActiveAction('sort-products');
    setIsShipmentDetailsOpen(false);
  };

  const handleBeginSortFormulas = () => {
    // Mark 'sort-products' as completed when navigating to 'sort-formulas'
    setCompletedTabs(prev => {
      const newSet = new Set(prev);
      newSet.add('sort-products');
      return newSet;
    });
    setActiveAction('sort-formulas');
  };

  const handleCompleteClick = () => {
    if (activeAction === 'sort-products') {
      setIsSortProductsCompleteOpen(true);
    } else if (activeAction === 'sort-formulas') {
      setIsSortFormulasCompleteOpen(true);
    }
  };

  const handleExport = () => {
    setIsExportTemplateOpen(true);
  };

  const handleSaveShipment = (data) => {
    setShipmentData(prev => ({
      ...prev,
      ...data,
    }));
  };

  // Handle Floor Inventory dropdown
  useEffect(() => {
    const updateDropdownPosition = () => {
      if (floorInventoryButtonRef.current && isFloorInventoryOpen) {
        const rect = floorInventoryButtonRef.current.getBoundingClientRect();
        setFloorInventoryPosition({
          top: rect.bottom + 4,
          left: rect.left,
        });
      }
    };

    const handleClickOutside = (event) => {
      if (
        floorInventoryRef.current && 
        !floorInventoryRef.current.contains(event.target) &&
        floorInventoryButtonRef.current &&
        !floorInventoryButtonRef.current.contains(event.target)
      ) {
        setIsFloorInventoryOpen(false);
      }
    };

    if (isFloorInventoryOpen) {
      updateDropdownPosition();
      window.addEventListener('resize', updateDropdownPosition);
      window.addEventListener('scroll', updateDropdownPosition, true);
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        window.removeEventListener('resize', updateDropdownPosition);
        window.removeEventListener('scroll', updateDropdownPosition, true);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isFloorInventoryOpen]);

  const handleFloorInventorySelect = (option) => {
    setSelectedFloorInventory(option);
    setActiveView('floor-inventory');
    setIsFloorInventoryOpen(false);
  };

  const handleAllProductsClick = () => {
    setActiveView('all-products');
    setSelectedFloorInventory(null);
  };

  const floorInventoryOptions = ['Sellables', 'Shiners', 'Unused Formulas'];

  return (
    <div className={`min-h-screen ${themeClasses.pageBg}`} style={{ paddingBottom: activeAction === 'add-products' ? '100px' : '0px' }}>
      <NewShipmentHeader
        tableMode={tableMode}
        onTableModeToggle={() => setTableMode(!tableMode)}
        onReviewShipmentClick={() => setIsShipmentDetailsOpen(true)}
        onCompleteClick={handleCompleteClick}
        shipmentData={shipmentData}
        totalUnits={totalUnits}
        totalBoxes={Math.ceil(totalBoxes)}
        activeAction={activeAction}
        onActionChange={handleActionChange}
        completedTabs={completedTabs}
      />

      <div style={{ padding: '0 1.5rem' }}>
        {activeAction === 'add-products' && (
          <>
            {/* Products Table Header */}
            <div
              style={{
                padding: '12px 16px',
                marginTop: '1.25rem',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
              }}
            >
              {/* Left: Navigation Tabs */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                <div
                  onClick={handleAllProductsClick}
                  style={{
                    color: activeView === 'all-products' ? '#3B82F6' : '#6B7280',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    borderBottom: activeView === 'all-products' ? '2px solid #3B82F6' : 'none',
                    paddingBottom: '4px',
                    transition: 'all 0.2s',
                  }}
                >
                  All Products
                </div>
                <div
                  ref={floorInventoryButtonRef}
                  onClick={() => setIsFloorInventoryOpen(!isFloorInventoryOpen)}
                  style={{
                    color: activeView === 'floor-inventory' ? '#3B82F6' : '#6B7280',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    position: 'relative',
                    borderBottom: activeView === 'floor-inventory' ? '2px solid #3B82F6' : 'none',
                    paddingBottom: '4px',
                    transition: 'all 0.2s',
                  }}
                >
                  {selectedFloorInventory || 'Floor Inventory'}
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 4.5L6 7.5L9 4.5" stroke={activeView === 'floor-inventory' ? '#3B82F6' : '#6B7280'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                
                {isFloorInventoryOpen && createPortal(
                  <div
                    ref={floorInventoryRef}
                    style={{
                      position: 'fixed',
                      top: `${floorInventoryPosition.top}px`,
                      left: `${floorInventoryPosition.left}px`,
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E5E7EB',
                      borderRadius: '6px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                      zIndex: 10000,
                      minWidth: '160px',
                      overflow: 'hidden',
                    }}
                  >
                    {floorInventoryOptions.map((option) => (
                      <div
                        key={option}
                        onClick={() => handleFloorInventorySelect(option)}
                        style={{
                          padding: '8px 12px',
                          cursor: 'pointer',
                          color: '#111827',
                          fontSize: '14px',
                          backgroundColor: selectedFloorInventory === option ? '#F3F4F6' : 'transparent',
                          transition: 'background-color 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          if (selectedFloorInventory !== option) {
                            e.currentTarget.style.backgroundColor = '#F9FAFB';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedFloorInventory !== option) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        {option}
                      </div>
                    ))}
                  </div>,
                  document.body
                )}
              </div>

              {/* Right: Legend and Search Input */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                {/* Legend */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '2px',
                        backgroundColor: '#A855F7',
                      }}
                    />
                    <span style={{ fontSize: '13px', color: isDarkMode ? '#E5E7EB' : '#374151' }}>
                      FBA Avail.
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '2px',
                        backgroundColor: '#22C55E',
                      }}
                    />
                    <span style={{ fontSize: '13px', color: isDarkMode ? '#E5E7EB' : '#374151' }}>
                      Total Inv.
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '2px',
                        backgroundColor: '#3B82F6',
                      }}
                    />
                    <span style={{ fontSize: '13px', color: isDarkMode ? '#E5E7EB' : '#374151' }}>
                      Forecast
                    </span>
                  </div>
                </div>

                {/* Search Input */}
                <div style={{ position: 'relative', width: '336px', height: '32px' }}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                  }}
                >
                  <path
                    d="M7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667Z"
                    stroke="#9CA3AF"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M14 14L11.1 11.1"
                    stroke="#9CA3AF"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Search..."
                  style={{
                    width: '100%',
                    height: '32px',
                    padding: '6px 12px 6px 32px',
                    borderRadius: '6px',
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: '#111827',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3B82F6';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#D1D5DB';
                  }}
                />
                </div>
              </div>
            </div>

            {activeView === 'all-products' && (
              <NewShipmentTable
                rows={rows}
                tableMode={tableMode}
                onProductClick={handleProductClick}
                qtyValues={qtyValues}
                onQtyChange={setQtyValues}
                onAddedRowsChange={setAddedRows}
              />
            )}
          </>
        )}

        {/* Separate container for Shiners View */}
        {activeAction === 'add-products' && activeView === 'floor-inventory' && selectedFloorInventory === 'Shiners' && (
          <div style={{ padding: '0 1.5rem' }}>
            <ShinersView />
          </div>
        )}

        {/* Separate container for Unused Formulas View */}
        {activeAction === 'add-products' && activeView === 'floor-inventory' && selectedFloorInventory === 'Unused Formulas' && (
          <div style={{ padding: '0 1.5rem' }}>
            <UnusedFormulasView />
          </div>
        )}

        {activeAction === 'sort-products' && (
          <SortProductsTable />
        )}

        {activeAction === 'sort-formulas' && (
          <SortFormulasTable />
        )}

        {activeAction === 'formula-check' && (
          <FormulaCheckTable />
        )}

        {activeAction === 'label-check' && (
          <LabelCheckTable />
        )}
      </div>

      {activeAction === 'add-products' && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: '256px',
            right: 0,
            backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
            borderTop: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{
                fontSize: '12px',
                fontWeight: 400,
                color: isDarkMode ? '#9CA3AF' : '#9CA3AF',
              }}>
                PALETTES
              </span>
              <span style={{
                fontSize: '18px',
                fontWeight: 700,
                color: isDarkMode ? '#FFFFFF' : '#000000',
              }}>
                {totalPalettes}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{
                fontSize: '12px',
                fontWeight: 400,
                color: isDarkMode ? '#9CA3AF' : '#9CA3AF',
              }}>
                TOTAL BOXES
              </span>
              <span style={{
                fontSize: '18px',
                fontWeight: 700,
                color: isDarkMode ? '#FFFFFF' : '#000000',
              }}>
                {Math.ceil(totalBoxes)}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{
                fontSize: '12px',
                fontWeight: 400,
                color: isDarkMode ? '#9CA3AF' : '#9CA3AF',
              }}>
                UNITS
              </span>
              <span style={{
                fontSize: '18px',
                fontWeight: 700,
                color: isDarkMode ? '#FFFFFF' : '#000000',
              }}>
                {totalUnits}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{
                fontSize: '12px',
                fontWeight: 400,
                color: isDarkMode ? '#9CA3AF' : '#9CA3AF',
              }}>
                TIME (HRS)
              </span>
              <span style={{
                fontSize: '18px',
                fontWeight: 700,
                color: isDarkMode ? '#FFFFFF' : '#000000',
              }}>
                {totalTimeHours}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{
                fontSize: '12px',
                fontWeight: 400,
                color: isDarkMode ? '#9CA3AF' : '#9CA3AF',
              }}>
                WEIGHT (LBS)
              </span>
              <span style={{
                fontSize: '18px',
                fontWeight: 700,
                color: isDarkMode ? '#FFFFFF' : '#000000',
              }}>
                {totalWeightLbs}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleExport}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'transparent',
                color: '#007AFF',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 2V10M8 10L5.5 7.5M8 10L10.5 7.5M3 12H13" stroke="#007AFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Export
            </button>
            <button
              type="button"
              onClick={() => setIsShipmentDetailsOpen(true)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#9CA3AF',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#6B7280';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#9CA3AF';
              }}
            >
              Book Shipment
            </button>
          </div>
        </div>
      )}

      <NgoosModal
        isOpen={isNgoosOpen}
        onClose={() => {
          setIsNgoosOpen(false);
          setSelectedRow(null);
        }}
        selectedRow={selectedRow}
      />

      <ShipmentDetailsModal
        isOpen={isShipmentDetailsOpen}
        onClose={() => setIsShipmentDetailsOpen(false)}
        shipmentData={shipmentData}
        totalUnits={totalUnits}
        totalBoxes={Math.ceil(totalBoxes)}
        onSave={handleSaveShipment}
        onBookAndProceed={handleBookAndProceed}
      />

      <ExportTemplateModal
        isOpen={isExportTemplateOpen}
        onClose={() => setIsExportTemplateOpen(false)}
        onExport={() => {
          setIsExportTemplateOpen(false);
          // Stay on add-products tab
        }}
      />

      <SortProductsCompleteModal
        isOpen={isSortProductsCompleteOpen}
        onClose={() => setIsSortProductsCompleteOpen(false)}
        onBeginSortFormulas={handleBeginSortFormulas}
      />

      <SortFormulasCompleteModal
        isOpen={isSortFormulasCompleteOpen}
        onClose={() => setIsSortFormulasCompleteOpen(false)}
      />
    </div>
  );
};

export default NewShipment;

