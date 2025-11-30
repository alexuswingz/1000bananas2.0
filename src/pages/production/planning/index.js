import React, { useState, useEffect } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import PlanningHeader from './components/PlanningHeader';
import PlanningTable from './components/PlanningTable';
import ArchiveTable from './components/ArchiveTable';
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
        status: getStatusDisplay(shipment.status),
        statusColor: getStatusColor(shipment.status),
        shipment: shipment.shipment_number,
        marketplace: shipment.marketplace || 'Amazon',
        account: shipment.account || 'TPS Nutrients',
        addProducts: shipment.add_products_completed ? 'completed' : 'pending',
        formulaCheck: shipment.formula_check_completed ? 'completed' : 'pending',
        labelCheck: shipment.label_check_completed ? 'completed' : 'pending',
        sortProducts: shipment.sort_products_completed ? 'completed' : 'pending',
        sortFormulas: shipment.sort_formulas_completed ? 'completed' : 'pending',
      }));
      setShipments(formattedShipments);
    } catch (err) {
      console.error('Error fetching shipments:', err);
      setError('Failed to load shipments');
      setShipments([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusDisplay = (status) => {
    const statusMap = {
      'planning': 'Planning',
      'add_products': 'Add Products',
      'formula_check': 'Formula Check',
      'label_check': 'Label Check',
      'sort_products': 'Sort Products',
      'sort_formulas': 'Sort Formulas',
      'manufacturing': 'Manufacturing',
      'packaging': 'Packaging',
      'ready_for_pickup': 'Ready for Pickup',
      'shipped': 'Shipped',
      'received': 'Received',
    };
    return statusMap[status] || 'Planning';
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

  // Use shipments from API instead of dummy data

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
          <>
            {loading && <div style={{ textAlign: 'center', padding: '2rem' }}>Loading shipments...</div>}
            {error && <div style={{ textAlign: 'center', padding: '2rem', color: '#EF4444' }}>{error}</div>}
            {!loading && !error && (
              <PlanningTable
                rows={shipments}
                activeFilters={activeFilters}
                onFilterToggle={toggleFilter}
              />
            )}
          </>
        )}

        {/* Archive tab */}
        {activeTab === 'archive' && (
          <ArchiveTable rows={shipments.filter(s => s.status === 'archived')} />
        )}
      </div>
    </div>
  );
};

export default Planning;

