import React, { useState } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import NewShipmentHeader from './components/NewShipmentHeader';
import NewShipmentTable from './components/NewShipmentTable';
import NgoosModal from './components/NgoosModal';
import ShipmentDetailsModal from './components/ShipmentDetailsModal';

const NewShipment = () => {
  const { isDarkMode } = useTheme();
  const [isNgoosOpen, setIsNgoosOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [isShipmentDetailsOpen, setIsShipmentDetailsOpen] = useState(false);
  const [tableMode, setTableMode] = useState(false);

  const themeClasses = {
    pageBg: isDarkMode ? 'bg-dark-bg-primary' : 'bg-light-bg-primary',
  };

  const rows = [
    { id: 1, brand: 'TPS Plant Foods', product: 'Cherry Tree Fertilizer', size: '8oz', qty: 240 },
    { id: 2, brand: 'TPS Plant Foods', product: 'Cherry Tree Fertilizer', size: 'Quart', qty: 96 },
    { id: 3, brand: 'TPS Plant Foods', product: 'Cherry Tree Fertilizer', size: 'Gallon', qty: 28 },
  ];

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
      />

      <NewShipmentTable
        rows={rows}
        tableMode={tableMode}
        onProductClick={handleProductClick}
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
      />
    </div>
  );
};

export default NewShipment;

