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
  const [addedRows, setAddedRows] = useState([]);
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
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <span style={{
              fontSize: '14px',
              fontWeight: 400,
              color: isDarkMode ? '#9CA3AF' : '#6B7280',
            }}>
              Total Units: <strong style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}>{totalUnits}</strong>
            </span>
            <span style={{
              fontSize: '14px',
              fontWeight: 400,
              color: isDarkMode ? '#9CA3AF' : '#6B7280',
            }}>
              Total Boxes: <strong style={{ color: isDarkMode ? '#FFFFFF' : '#000000' }}>{Math.ceil(totalBoxes)}</strong>
            </span>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={handleExport}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                backgroundColor: '#FFFFFF',
                color: '#374151',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Export
            </button>
            <button
              type="button"
              onClick={() => setIsShipmentDetailsOpen(true)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#007AFF',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
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

