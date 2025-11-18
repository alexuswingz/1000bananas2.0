import React, { useState, useEffect } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { useLocation } from 'react-router-dom';
import NewShipmentHeader from './components/NewShipmentHeader';
import NewShipmentTable from './components/NewShipmentTable';
import NgoosModal from './components/NgoosModal';
import ShipmentDetailsModal from './components/ShipmentDetailsModal';

const NewShipment = () => {
  const { isDarkMode } = useTheme();
  const location = useLocation();
  const [isNgoosOpen, setIsNgoosOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [isShipmentDetailsOpen, setIsShipmentDetailsOpen] = useState(false);
  const [tableMode, setTableMode] = useState(false);
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

  return (
    <div className={`min-h-screen ${themeClasses.pageBg}`} style={{ padding: '1.5rem 2rem' }}>
      <NewShipmentHeader
        tableMode={tableMode}
        onTableModeToggle={() => setTableMode(!tableMode)}
        onReviewShipmentClick={() => setIsShipmentDetailsOpen(true)}
        shipmentData={shipmentData}
        totalUnits={totalUnits}
        totalBoxes={Math.ceil(totalBoxes)}
      />

      <NewShipmentTable
        rows={rows}
        tableMode={tableMode}
        onProductClick={handleProductClick}
        qtyValues={qtyValues}
        onQtyChange={setQtyValues}
      />

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
      />
    </div>
  );
};

export default NewShipment;

