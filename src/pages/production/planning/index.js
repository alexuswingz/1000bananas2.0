import React, { useState, useEffect } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import PlanningHeader from './components/PlanningHeader';
import PlanningTable from './components/PlanningTable';
import ShipmentsTable from './components/ShipmentsTable';
import NewShipmentModal from './components/NewShipmentModal';
import { getAllShipments, createShipment } from '../../../services/productionApi';

const Planning = () => {
  const { isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState('shipments');
  const [activeFilters, setActiveFilters] = useState([]);
  const [showNewShipmentModal, setShowNewShipmentModal] = useState(false);
  const [newShipment, setNewShipment] = useState({
    shipmentName: '',
    marketplace: 'Amazon',
    account: '',
  });
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const themeClasses = {
    pageBg: isDarkMode ? 'bg-dark-bg-primary' : 'bg-light-bg-primary',
  };

  // Fetch shipments from API
  useEffect(() => {
    if (activeTab === 'shipments') {
      fetchShipments();
    }
  }, [activeTab]);

  const fetchShipments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllShipments();
      // Transform API data to match your table format
      const formattedShipments = data.map(shipment => ({
        id: shipment.id,
        status: shipment.status || 'planning',
        statusColor: getStatusColor(shipment.status),
        marketplace: 'Amazon',
        account: shipment.account || 'TPS Nutrients',
        shipmentDate: shipment.shipment_date,
        shipmentType: shipment.shipment_type || 'AWD',
        shipmentNumber: shipment.shipment_number,
        amznShipment: shipment.shipment_number,
        amznRefId: '-',
      }));
      setShipments(formattedShipments);
    } catch (err) {
      console.error('Error fetching shipments:', err);
      setError('Failed to load shipments');
      // Fallback to dummy data on error
      setShipments([
        {
          id: 1,
          status: 'Shipped',
          statusColor: '#7C3AED',
          marketplace: 'Amazon',
          account: 'TPS Nutrients',
          shipmentDate: '2025-09-23',
          shipmentType: 'AWD',
          amznShipment: 'STAR-VTFU4AYC',
          amznRefId: '43WA0H1U',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const statusColors = {
      'planning': '#F59E0B', // amber
      'manufacturing': '#3B82F6', // blue
      'packaging': '#F59E0B', // amber
      'ready for pickup': '#10B981', // green
      'shipped': '#7C3AED', // purple
      'received': '#10B981', // green
    };
    return statusColors[status?.toLowerCase()] || '#6B7280';
  };

  const handleCreateShipment = async () => {
    try {
      const shipmentData = {
        shipment_number: newShipment.shipmentName || `SHIP-${Date.now()}`,
        shipment_date: new Date().toISOString().split('T')[0],
        shipment_type: 'AWD',
        account: newShipment.account || 'TPS Nutrients',
        marketplace: newShipment.marketplace || 'Amazon',
        location: '',
        created_by: 'Current User', // TODO: Get from auth context
      };

      await createShipment(shipmentData);
      setShowNewShipmentModal(false);
      setNewShipment({
        shipmentName: '',
        marketplace: 'Amazon',
        account: '',
      });
      
      // Refresh shipments list
      if (activeTab === 'shipments') {
        fetchShipments();
      }
    } catch (err) {
      console.error('Error creating shipment:', err);
      alert('Failed to create shipment');
    }
  };

  // Dummy product data for shipments tab (to be replaced with real planning data)
  const rows = [
    {
      id: 1,
      status: 'Packaging',
      shipment: '2025.11.18 AWD',
      marketplace: 'Amazon',
      account: 'TPS Nutrients',
      addProducts: 'completed',
      formulaCheck: 'completed',
      labelCheck: 'in progress',
      sortProducts: 'pending',
      sortFormulas: 'pending',
    },
    {
      id: 2,
      status: 'Packaging',
      shipment: '2025.11.19 FBA',
      marketplace: 'Amazon',
      account: 'TPS Nutrients',
      addProducts: 'completed',
      formulaCheck: 'pending',
      labelCheck: 'pending',
      sortProducts: 'pending',
      sortFormulas: 'pending',
    },
    {
      id: 3,
      status: 'Shipped',
      shipment: '2025.11.20 AWD',
      marketplace: 'Amazon',
      account: 'TPS Nutrients',
      addProducts: 'completed',
      formulaCheck: 'completed',
      labelCheck: 'completed',
      sortProducts: 'completed',
      sortFormulas: 'completed',
    },
    {
      id: 4,
      status: 'Ready for Pickup',
      shipment: '2025.11.21 AWD',
      marketplace: 'Amazon',
      account: 'TPS Nutrients',
      addProducts: 'completed',
      formulaCheck: 'completed',
      labelCheck: 'completed',
      sortProducts: 'completed',
      sortFormulas: 'in progress',
    },
    {
      id: 5,
      status: 'Packaging',
      shipment: '2025.11.22 FBA',
      marketplace: 'Amazon',
      account: 'TPS Nutrients',
      addProducts: 'in progress',
      formulaCheck: 'pending',
      labelCheck: 'pending',
      sortProducts: 'pending',
      sortFormulas: 'pending',
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
        {/* Shipments tab */}
        {activeTab === 'shipments' && (
          <PlanningTable
            rows={rows}
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

