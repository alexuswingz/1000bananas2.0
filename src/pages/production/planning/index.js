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

  // State for planning table rows
  const [rows, setRows] = useState([
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
  ]);

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

  // Check for completed label check rows from localStorage
  useEffect(() => {
    console.log('Planning page mounted/activeTab changed:', activeTab);
    
    const checkForCompletedRows = () => {
      console.log('Checking localStorage for completed rows...');
      const completedLabelCheck = localStorage.getItem('labelCheckCompletedRows');
      console.log('localStorage value:', completedLabelCheck);
      
      if (completedLabelCheck) {
        try {
          const data = JSON.parse(completedLabelCheck);
          console.log('Parsed data:', data);
          const { rows: completedRows, shipmentData } = data;
          
          console.log('Found completed label check rows:', completedRows?.length);
          console.log('Completed rows data:', completedRows);
          console.log('Shipment data:', shipmentData);
          
          if (completedRows && completedRows.length > 0) {
            // Create a new shipment entry from the completed label check
            const shipmentDate = new Date().toISOString().split('T')[0];
            const shipmentType = shipmentData?.shipmentType || 'AWD';
            const shipmentNumber = shipmentData?.shipmentNumber || `${shipmentDate} ${shipmentType}`;
            
            const newShipmentRow = {
              id: Date.now(),
              status: 'Packaging',
              shipment: shipmentNumber,
              marketplace: shipmentData?.marketplace || 'Amazon',
              account: shipmentData?.account || 'TPS',
              addProducts: 'completed',
              formulaCheck: 'completed',
              labelCheck: 'completed',
              sortProducts: 'pending',
              sortFormulas: 'pending',
              completedRows: completedRows,
            };
            
            console.log('Adding new shipment row:', newShipmentRow);
            
            // Add to the rows array
            setRows(prev => {
              console.log('Current rows before adding:', prev.length);
              // Check if this shipment already exists to avoid duplicates
              const exists = prev.some(row => 
                row.shipment === newShipmentRow.shipment && 
                row.labelCheck === 'completed'
              );
              if (exists) {
                console.log('Shipment already exists, skipping');
                return prev;
              }
              const newRows = [newShipmentRow, ...prev];
              console.log('New rows after adding:', newRows.length);
              return newRows;
            });
            
            // Clear localStorage after processing
            localStorage.removeItem('labelCheckCompletedRows');
            console.log('Cleared localStorage');
          } else {
            console.log('No completed rows found in data');
          }
        } catch (error) {
          console.error('Error processing completed label check:', error);
          localStorage.removeItem('labelCheckCompletedRows');
        }
      } else {
        console.log('No data found in localStorage');
      }
    };
    
    // Check immediately on mount
    checkForCompletedRows();
    
    // Also check when activeTab changes to 'shipments' in case user navigates away and back
    if (activeTab === 'shipments') {
      checkForCompletedRows();
    }
  }, [activeTab]);

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
          <ArchiveTable rows={rows} />
        )}
      </div>
    </div>
  );
};

export default Planning;

