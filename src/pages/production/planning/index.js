import React, { useState } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import PlanningHeader from './components/PlanningHeader';
import PlanningTable from './components/PlanningTable';
import ShipmentsTable from './components/ShipmentsTable';
import NewShipmentModal from './components/NewShipmentModal';

const Planning = () => {
  const { isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState('products');
  const [activeFilters, setActiveFilters] = useState([]);
  const [showNewShipmentModal, setShowNewShipmentModal] = useState(false);
  const [newShipment, setNewShipment] = useState({
    shipmentNumber: '',
    shipmentType: '',
    account: '',
    location: '',
    supplier: 'amazon',
  });

  const themeClasses = {
    pageBg: isDarkMode ? 'bg-dark-bg-primary' : 'bg-light-bg-primary',
  };

  const rows = [
    {
      id: 1,
      brand: 'Total Pest Spray',
      product: 'Cherry Tree Fertilizer',
      size: 'Gallon',
      doiFba: 12,
      doiTotal: 32,
      inventory: 20,
      forecast: 20,
      sales7: 20,
      sales30: 20,
    },
    {
      id: 2,
      brand: 'Total Pest Spray',
      product: 'Cherry Tree Fertilizer',
      size: 'Gallon',
      doiFba: 12,
      doiTotal: 32,
      inventory: 20,
      forecast: 20,
      sales7: 20,
      sales30: 20,
    },
    {
      id: 3,
      brand: 'Total Pest Spray',
      product: 'Cherry Tree Fertilizer',
      size: 'Gallon',
      doiFba: 12,
      doiTotal: 32,
      inventory: 20,
      forecast: 20,
      sales7: 20,
      sales30: 20,
    },
    {
      id: 4,
      brand: 'Total Pest Spray',
      product: 'Cherry Tree Fertilizer',
      size: 'Gallon',
      doiFba: 12,
      doiTotal: 32,
      inventory: 20,
      forecast: 20,
      sales7: 20,
      sales30: 20,
    },
    {
      id: 5,
      brand: 'Total Pest Spray',
      product: 'Cherry Tree Fertilizer',
      size: 'Gallon',
      doiFba: 12,
      doiTotal: 32,
      inventory: 20,
      forecast: 20,
      sales7: 20,
      sales30: 20,
    },
  ];

  const shipments = [
    {
      id: 1,
      status: 'Shipped',
      statusColor: '#7C3AED', // purple
      marketplace: 'Amazon',
      account: 'TPS Nutrients',
      shipmentDate: '2025-09-23',
      shipmentType: 'AWD',
      amznShipment: 'STAR-VTFU4AYC',
      amznRefId: '43WA0H1U',
    },
    {
      id: 2,
      status: 'Ready for Pickup',
      statusColor: '#10B981', // green
      marketplace: 'Amazon',
      account: 'TPS Nutrients',
      shipmentDate: '2025-09-23',
      shipmentType: 'AWD',
      amznShipment: 'STAR-VTFU4AYC',
      amznRefId: '43WA0H1U',
    },
    {
      id: 3,
      status: 'Packaging',
      statusColor: '#F59E0B', // amber
      marketplace: 'Amazon',
      account: 'TPS Nutrients',
      shipmentDate: '2025-09-23',
      shipmentType: 'AWD',
      amznShipment: 'STAR-VTFU4AYC',
      amznRefId: '43WA0H1U',
    },
  ];

  const toggleFilter = (key) => {
    setActiveFilters((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSearch = (searchTerm) => {
    // Handle search logic here
    console.log('Search:', searchTerm);
  };

  return (
    <div className={`min-h-screen ${themeClasses.pageBg}`}>
      <PlanningHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onNewShipmentClick={() => setShowNewShipmentModal(true)}
        onSearch={handleSearch}
      />

      <NewShipmentModal
        isOpen={showNewShipmentModal}
        onClose={() => setShowNewShipmentModal(false)}
        newShipment={newShipment}
        setNewShipment={setNewShipment}
      />

      {/* Content */}
      <div style={{ padding: '1rem 2rem 2rem 2rem' }}>
        {/* Products (Planning) tab */}
        {activeTab === 'products' && (
          <PlanningTable
            rows={rows}
            activeFilters={activeFilters}
            onFilterToggle={toggleFilter}
          />
        )}

        {/* Shipments tab */}
        {activeTab === 'shipments' && (
          <ShipmentsTable
            shipments={shipments}
            activeFilters={activeFilters}
            onFilterToggle={toggleFilter}
          />
        )}

        {/* Archive tab */}
        {activeTab === 'archive' && (
          <div
            className={`${isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white'} ${isDarkMode ? 'border-dark-border-primary' : 'border-gray-200'} border rounded-xl shadow-sm`}
            style={{ padding: '2rem', minHeight: '200px' }}
          >
            <p className={isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500'} style={{ fontSize: '0.875rem' }}>
              Archived shipments will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Planning;

