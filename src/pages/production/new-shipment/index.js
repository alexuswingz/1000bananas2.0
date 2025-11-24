import React, { useState, useEffect } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { useLocation } from 'react-router-dom';
import NewShipmentHeader from './components/NewShipmentHeader';
import NewShipmentTable from './components/NewShipmentTable';
import SortProductsTable from './components/SortProductsTable';
import SortFormulasTable from './components/SortFormulasTable';
import FormulaCheckTable from './components/FormulaCheckTable';
import LabelCheckTable from './components/LabelCheckTable';
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
  const [shipmentData, setShipmentData] = useState({
    shipmentName: '2025.11.18',
    shipmentType: 'AWD',
    marketplace: 'Amazon',
    account: 'TPS Nutrients',
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
      initialValues[index] = ''; // Default to empty
    });
    return initialValues;
  });

  const [addedRows, setAddedRows] = useState(new Set());

  // Calculate total units from qtyValues - only for added rows
  const totalUnits = rows.reduce((sum, row, index) => {
    // Only count if row is in addedRows
    if (!addedRows.has(row.id)) {
      return sum;
    }
    const qty = qtyValues[index];
    // Only count if qty has a valid number value
    if (qty === '' || qty === null || qty === undefined) {
      return sum;
    }
    const numQty = typeof qty === 'number' ? qty : parseInt(qty, 10);
    return sum + (isNaN(numQty) ? 0 : numQty);
  }, 0);

  // Calculate total boxes based on size conversion rates - only for added rows
  const totalBoxes = rows.reduce((sum, row, index) => {
    // Only count if row is in addedRows
    if (!addedRows.has(row.id)) {
      return sum;
    }
    const qty = qtyValues[index];
    // Only count if qty has a valid number value
    if (qty === '' || qty === null || qty === undefined) {
      return sum;
    }
    const numQty = typeof qty === 'number' ? qty : parseInt(qty, 10);
    if (isNaN(numQty) || numQty <= 0) {
      return sum;
    }
    
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

  const handleProductClick = (row) => {
    setSelectedRow(row);
    setIsNgoosOpen(true);
  };

  const handleExport = (shipmentType) => {
    console.log('Exporting with shipment type:', shipmentType);
    // Close the modal and stay on add-products tab
    setIsExportTemplateOpen(false);
  };

  return (
    <div className={`min-h-screen ${themeClasses.pageBg}`} style={{ paddingBottom: activeAction === 'add-products' ? '100px' : '0' }}>
      <NewShipmentHeader
        tableMode={tableMode}
        onTableModeToggle={() => setTableMode(!tableMode)}
        onReviewShipmentClick={() => setIsShipmentDetailsOpen(true)}
        onCompleteClick={() => {
          if (activeAction === 'sort-products') {
            setIsSortProductsCompleteOpen(true);
          } else if (activeAction === 'sort-formulas') {
            setIsSortFormulasCompleteOpen(true);
          }
        }}
        shipmentData={shipmentData}
        totalUnits={totalUnits}
        totalBoxes={Math.ceil(totalBoxes)}
        activeAction={activeAction}
        onActionChange={setActiveAction}
        completedTabs={completedTabs}
      />

      {/* Tabs and Search bar - above table - only show for add-products */}
      {activeAction === 'add-products' && (
        <div className="px-6 py-4 flex justify-between items-center" style={{ marginTop: '0' }}>
          {/* Left side - Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <button
              type="button"
              style={{
                padding: '8px 0',
                border: 'none',
                backgroundColor: 'transparent',
                fontSize: '14px',
                fontWeight: 500,
                color: '#3B82F6',
                cursor: 'pointer',
                borderBottom: '2px solid #3B82F6',
                paddingBottom: '8px',
              }}
            >
              All Products
            </button>
            <select
              style={{
                padding: '8px 12px',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: 'transparent',
                color: isDarkMode ? '#E5E7EB' : '#374151',
                fontSize: '13px',
                fontWeight: 400,
                cursor: 'pointer',
                outline: 'none',
                appearance: 'none',
                paddingRight: '32px',
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 6L11 1' stroke='%23374151' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
              }}
            >
              <option>Floor Inventory</option>
              <option>All Inventory</option>
              <option>Available</option>
            </select>
          </div>

          {/* Right side - Search */}
          <div className="relative" style={{ maxWidth: '300px', width: '100%' }}>
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{
                backgroundColor: isDarkMode ? '#374151' : '#FFFFFF',
                color: isDarkMode ? '#F9FAFB' : '#000000',
                borderColor: isDarkMode ? '#4B5563' : '#D1D5DB',
              }}
            />
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>
      )}

      <div style={{ padding: '0 1.5rem' }}>
        {activeAction === 'add-products' && (
          <NewShipmentTable
            rows={rows}
            tableMode={tableMode}
            onProductClick={handleProductClick}
            qtyValues={qtyValues}
            onQtyChange={setQtyValues}
            onAddedRowsChange={setAddedRows}
          />
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
        onSave={(updatedData) => {
          setShipmentData({
            ...shipmentData,
            shipmentName: updatedData.shipmentName,
            shipmentType: updatedData.shipmentType,
            marketplace: updatedData.marketplace || shipmentData.marketplace,
            account: updatedData.account || shipmentData.account,
          });
        }}
        onBookAndProceed={() => {
          // Mark add-products as completed
          setCompletedTabs(prev => new Set([...prev, 'add-products']));
          setIsShipmentDetailsOpen(false);
          // Go directly to sort-products tab
          setActiveAction('sort-products');
        }}
      />

      <ExportTemplateModal
        isOpen={isExportTemplateOpen}
        onClose={() => setIsExportTemplateOpen(false)}
        onExport={handleExport}
      />

      <SortProductsCompleteModal
        isOpen={isSortProductsCompleteOpen}
        onClose={() => setIsSortProductsCompleteOpen(false)}
        onBeginSortFormulas={() => {
          // Mark sort-products as completed
          setCompletedTabs(prev => new Set([...prev, 'sort-products']));
          // Switch to sort-formulas tab
          setActiveAction('sort-formulas');
        }}
      />

      <SortFormulasCompleteModal
        isOpen={isSortFormulasCompleteOpen}
        onClose={() => setIsSortFormulasCompleteOpen(false)}
      />

      {/* Footer with stats and actions - only show for add-products */}
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
        {/* Left side - Statistics */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '48px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ 
              fontSize: '11px', 
              fontWeight: 600, 
              color: '#9CA3AF', 
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              PALETTES
            </span>
            <span style={{ 
              fontSize: '18px', 
              fontWeight: 600, 
              color: isDarkMode ? '#FFFFFF' : '#000000',
            }}>
              0
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ 
              fontSize: '11px', 
              fontWeight: 600, 
              color: '#9CA3AF', 
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              TOTAL BOXES
            </span>
            <span style={{ 
              fontSize: '18px', 
              fontWeight: 600, 
              color: isDarkMode ? '#FFFFFF' : '#000000',
            }}>
              {Math.ceil(totalBoxes)}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ 
              fontSize: '11px', 
              fontWeight: 600, 
              color: '#9CA3AF', 
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              UNITS
            </span>
            <span style={{ 
              fontSize: '18px', 
              fontWeight: 600, 
              color: isDarkMode ? '#FFFFFF' : '#000000',
            }}>
              {totalUnits}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ 
              fontSize: '11px', 
              fontWeight: 600, 
              color: '#9CA3AF', 
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              TIME (HRS)
            </span>
            <span style={{ 
              fontSize: '18px', 
              fontWeight: 600, 
              color: isDarkMode ? '#FFFFFF' : '#000000',
            }}>
              0
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ 
              fontSize: '11px', 
              fontWeight: 600, 
              color: '#9CA3AF', 
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              WEIGHT (LBS)
            </span>
            <span style={{ 
              fontSize: '18px', 
              fontWeight: 600, 
              color: isDarkMode ? '#FFFFFF' : '#000000',
            }}>
              0
            </span>
          </div>
        </div>

        {/* Right side - Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            type="button"
            onClick={() => setIsExportTemplateOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0',
              border: 'none',
              backgroundColor: 'transparent',
              color: '#3B82F6',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <svg style={{ width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
          <button
            type="button"
            onClick={() => setIsShipmentDetailsOpen(true)}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#9CA3AF',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background-color 0.2s',
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
    </div>
  );
};

export default NewShipment;

