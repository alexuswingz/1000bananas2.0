import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../../../context/ThemeContext';
import PlanningHeader from './components/PlanningHeader';
import PlanningTable from './components/PlanningTable';
import ArchiveTable from './components/ArchiveTable';
import ShipmentsTable from './components/ShipmentsTable';
import NewShipmentModal from './components/NewShipmentModal';
import LabelCheckCommentModal from '../new-shipment/components/LabelCheckCommentModal';
import StatusCommentModal from './components/StatusCommentModal';
import { getAllShipments, createShipment, updateShipment, getShipmentProducts } from '../../../services/productionApi';

const Planning = () => {
  const { isDarkMode } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
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
  const [showBookedToast, setShowBookedToast] = useState(false);
  const [bookedShipmentInfo, setBookedShipmentInfo] = useState(null);
  const [isLabelCommentOpen, setIsLabelCommentOpen] = useState(false);
  const [labelCommentRow, setLabelCommentRow] = useState(null);
  const [isStatusCommentOpen, setIsStatusCommentOpen] = useState(false);
  const [statusCommentRow, setStatusCommentRow] = useState(null);
  const [statusCommentField, setStatusCommentField] = useState(null);

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
      bookShipment: 'pending',
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
      bookShipment: 'pending',
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
      bookShipment: 'completed',
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
      bookShipment: 'completed',
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
      bookShipment: 'pending',
      sortProducts: 'pending',
      sortFormulas: 'pending',
    },
  ]);

  const themeClasses = {
    pageBg: isDarkMode ? 'bg-dark-bg-primary' : 'bg-light-bg-primary',
  };

  // Check for navigation state to show booked toast
  useEffect(() => {
    if (location.state?.showBookedToast && location.state?.shipmentInfo) {
      setShowBookedToast(true);
      setBookedShipmentInfo(location.state.shipmentInfo);
      
      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        setShowBookedToast(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [location.state]);

  // Check for navigation state to show label comment modal
  useEffect(() => {
    if (location.state?.showLabelCommentModal && location.state?.shipmentId) {
      // Find the shipment in the list
      const shipment = shipments.find(s => s.id === location.state.shipmentId);
      if (shipment) {
        // Update shipment to show orange (in progress) status with comment flag
        setShipments(prev => prev.map(s => {
          if (s.id === location.state.shipmentId) {
            return {
              ...s,
              labelCheck: 'in progress', // Will show orange because hasComment is true
              labelCheckComment: true, // Flag to show orange with comment icon
            };
          }
          return s;
        }));
        
        // Set the row and show modal
        const updatedShipment = {
          ...shipment,
          labelCheck: 'in progress',
          labelCheckComment: true,
        };
        setLabelCommentRow(updatedShipment);
        setIsLabelCommentOpen(true);
        
        // Clear the state to prevent showing again on refresh
        window.history.replaceState({}, document.title);
      } else {
        // If shipment not found, fetch shipments first
        fetchShipments().then(() => {
          const foundShipment = shipments.find(s => s.id === location.state.shipmentId);
          if (foundShipment) {
            setShipments(prev => prev.map(s => {
              if (s.id === location.state.shipmentId) {
                return {
                  ...s,
                  labelCheck: 'in progress',
                  labelCheckComment: true, // Flag to show orange with comment icon
                };
              }
              return s;
            }));
            const updatedShipment = {
              ...foundShipment,
              labelCheck: 'in progress',
              labelCheckComment: true,
            };
            setLabelCommentRow(updatedShipment);
            setIsLabelCommentOpen(true);
            window.history.replaceState({}, document.title);
          }
        });
      }
    }
  }, [location.state, shipments]);

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
        bookShipment: shipment.book_shipment_completed ? 'completed' : 'pending',
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

  const handleLabelCheckClick = async (row) => {
    // Only show comment modal if label check is not completed
    // If already completed, just mark as complete without showing modal
    if (row.labelCheck === 'completed') {
      // Already completed, no need to show modal
      return;
    }
    
    // Check if there are insufficient labels
    try {
      const products = await getShipmentProducts(row.id);
      
      // Check if any products have insufficient labels
      // A product has insufficient labels if labels_needed > labels_available
      const hasInsufficientLabels = products.some(product => {
        const labelsNeeded = product.labels_needed || 0;
        const labelsAvailable = product.labels_available || 0;
        return labelsNeeded > labelsAvailable;
      });
      
      // Only show modal if there are insufficient labels
      if (hasInsufficientLabels) {
        setLabelCommentRow(row);
        setIsLabelCommentOpen(true);
      } else {
        // All labels are sufficient, no need to show modal
        return;
      }
    } catch (error) {
      console.error('Error checking label availability:', error);
      // On error, still show modal to be safe
      setLabelCommentRow(row);
      setIsLabelCommentOpen(true);
    }
  };

  const handleStatusCommentClick = (row, statusFieldName) => {
    // Don't show modal if status is completed
    if (row[statusFieldName] === 'completed') {
      return;
    }
    setStatusCommentRow(row);
    setStatusCommentField(statusFieldName);
    setIsStatusCommentOpen(true);
  };

  const handleStatusCommentComplete = async (comment) => {
    if (!statusCommentRow?.id || !statusCommentField) {
      setIsStatusCommentOpen(false);
      setStatusCommentRow(null);
      setStatusCommentField(null);
      return;
    }

    const shipmentId = statusCommentRow.id;
    const commentText = comment || '';
    const fieldName = statusCommentField;
    
    // Clear the modal state
    setIsStatusCommentOpen(false);
    const rowToUpdate = statusCommentRow;
    setStatusCommentRow(null);
    setStatusCommentField(null);

    try {
      // Map status field names to backend field names
      const backendFieldMap = {
        'addProducts': 'add_products_completed',
        'formulaCheck': 'formula_check_completed',
        'labelCheck': 'label_check_completed',
        'bookShipment': 'book_shipment_completed',
        'sortProducts': 'sort_products_completed',
        'sortFormulas': 'sort_formulas_completed',
      };

      const backendField = backendFieldMap[fieldName];
      if (!backendField) {
        console.error('Unknown status field:', fieldName);
        return;
      }

      const updateData = {
        [backendField]: false, // Mark as incomplete since comment was added
      };
      
      // Add comment to notes if provided
      if (commentText.trim()) {
        updateData.notes = commentText.trim();
      }

      // Update shipment in backend
      await updateShipment(shipmentId, updateData);

      // Get current user name (from localStorage or default)
      const userName = localStorage.getItem('userName') || 'User';
      const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
      const commentDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      // Update local state
      setShipments(prev => prev.map(s => {
        if (s.id === shipmentId) {
          return {
            ...s,
            [`${fieldName}Comment`]: true,
            [fieldName]: 'in progress', // keep in-progress but flagged with comment
            [`${fieldName}CommentText`]: commentText,
            [`${fieldName}CommentDate`]: commentDate,
            [`${fieldName}CommentUser`]: userName,
            [`${fieldName}CommentUserInitials`]: userInitials,
          };
        }
        return s;
      }));
    } catch (error) {
      console.error('Error saving status comment:', error);
      // Get current user name (from localStorage or default)
      const userName = localStorage.getItem('userName') || 'User';
      const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
      const commentDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      // Still update local state even if backend fails
      setShipments(prev => prev.map(s => {
        if (s.id === shipmentId) {
          return {
            ...s,
            [`${fieldName}Comment`]: true,
            [fieldName]: 'in progress',
            [`${fieldName}CommentText`]: commentText,
            [`${fieldName}CommentDate`]: commentDate,
            [`${fieldName}CommentUser`]: userName,
            [`${fieldName}CommentUserInitials`]: userInitials,
          };
        }
        return s;
      }));
    }
  };

  const handleLabelCommentComplete = async (comment) => {
    console.log('handleLabelCommentComplete called', { comment, labelCommentRow });
    
    if (!labelCommentRow?.id) {
      console.log('No labelCommentRow.id');
      setIsLabelCommentOpen(false);
      setLabelCommentRow(null);
      return;
    }

    // Modal is already closed by the component, just update state
    const shipmentId = labelCommentRow.id;
    const commentText = comment || '';
    
    console.log('Processing comment', { shipmentId, commentText });
    
    // Clear the modal state
    setIsLabelCommentOpen(false);
    setLabelCommentRow(null);

    try {
      // Get existing notes and append the comment
      const updateData = {
        label_check_completed: false, // Mark as incomplete since comment was added
      };
      
      // Add comment to notes if provided
      if (commentText.trim()) {
        try {
          // We'll append to notes - for now just update the shipment
          // The notes field will be handled by the backend
          const notesText = commentText.trim();
          updateData.notes = notesText;
        } catch (error) {
          console.error('Error preparing comment:', error);
        }
      }

      // Update shipment in backend
      await updateShipment(shipmentId, updateData);

      // Get current user name (from localStorage or default)
      const userName = localStorage.getItem('userName') || 'User';
      const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
      const commentDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      // Update local state
      setShipments(prev => prev.map(s => {
        if (s.id === shipmentId) {
          return {
            ...s,
            labelCheckComment: true,
            labelCheck: 'in progress', // keep in-progress but flagged with comment
            labelCheckCommentText: commentText,
            labelCheckCommentDate: commentDate,
            labelCheckCommentUser: userName,
            labelCheckCommentUserInitials: userInitials,
          };
        }
        return s;
      }));
    } catch (error) {
      console.error('Error saving label check comment:', error);
      // Get current user name (from localStorage or default)
      const userName = localStorage.getItem('userName') || 'User';
      const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
      const commentDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

      // Still update local state even if backend fails
      setShipments(prev => prev.map(s => {
        if (s.id === shipmentId) {
          return {
            ...s,
            labelCheckComment: true,
            labelCheck: 'in progress',
            labelCheckCommentText: commentText,
            labelCheckCommentDate: commentDate,
            labelCheckCommentUser: userName,
            labelCheckCommentUserInitials: userInitials,
          };
        }
        return s;
      }));
    }
  };

  const getStatusDisplay = (status) => {
    const statusMap = {
      'planning': 'Planning',
      'add_products': 'Add Products',
      'formula_check': 'Formula Check',
      'label_check': 'Label Check',
      'book_shipment': 'Book Shipment',
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
  
  // Check for completed shipment data from localStorage
  useEffect(() => {
    console.log('Planning page mounted/activeTab changed:', activeTab);
    
    const checkForCompletedRows = () => {
      console.log('Checking localStorage for completed rows...');
      
      // Check for completed label check
      const completedLabelCheck = localStorage.getItem('labelCheckCompletedRows');
      console.log('localStorage labelCheckCompletedRows:', completedLabelCheck);
      
      if (completedLabelCheck) {
        try {
          const data = JSON.parse(completedLabelCheck);
          console.log('Parsed label check data:', data);
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
              bookShipment: 'pending',
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
      }
      
      // Check for completed sort formulas
      const completedSortFormulas = localStorage.getItem('sortFormulasCompleted');
      console.log('localStorage sortFormulasCompleted:', completedSortFormulas);
      
      if (completedSortFormulas) {
        try {
          const data = JSON.parse(completedSortFormulas);
          console.log('Parsed sort formulas data:', data);
          const { shipmentData, shipmentId } = data;
          
          console.log('Found completed sort formulas for shipment:', shipmentId);
          console.log('Shipment data:', shipmentData);
          
          if (shipmentData) {
            // Update or create shipment entry with all stages completed
            const shipmentDate = new Date().toISOString().split('T')[0];
            const shipmentType = shipmentData?.shipmentType || 'AWD';
            const shipmentNumber = shipmentData?.shipmentNumber || `${shipmentDate} ${shipmentType}`;
            
            const completedShipmentRow = {
              id: shipmentId || Date.now(),
              status: 'Ready for Pickup',
              shipment: shipmentNumber,
              marketplace: shipmentData?.marketplace || 'Amazon',
              account: shipmentData?.account || 'TPS',
              addProducts: 'completed',
              formulaCheck: 'completed',
              labelCheck: 'completed',
              bookShipment: 'completed',
              sortProducts: 'completed',
              sortFormulas: 'completed',
            };
            
            console.log('Adding/updating shipment row:', completedShipmentRow);
            
            // Add or update in the rows array
            setRows(prev => {
              console.log('Current rows before updating:', prev.length);
              // Check if this shipment already exists
              const existingIndex = prev.findIndex(row => 
                row.shipment === completedShipmentRow.shipment || row.id === shipmentId
              );
              
              if (existingIndex >= 0) {
                console.log('Shipment exists, updating it');
                const newRows = [...prev];
                newRows[existingIndex] = completedShipmentRow;
                return newRows;
              } else {
                console.log('Shipment does not exist, adding it');
                const newRows = [completedShipmentRow, ...prev];
                return newRows;
              }
            });
            
            // Clear localStorage after processing
            localStorage.removeItem('sortFormulasCompleted');
            console.log('Cleared sortFormulasCompleted from localStorage');
          }
        } catch (error) {
          console.error('Error processing completed sort formulas:', error);
          localStorage.removeItem('sortFormulasCompleted');
        }
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

  // Determine which step to navigate to based on shipment status
  const getNextIncompleteStep = (row) => {
    // Return the first incomplete step
    if (row.addProducts !== 'completed') return 'add-products';
    if (row.formulaCheck !== 'completed') return 'formula-check';
    if (row.labelCheck !== 'completed') return 'label-check';
    if (row.bookShipment !== 'completed') return 'book-shipment';
    if (row.sortProducts !== 'completed') return 'sort-products';
    if (row.sortFormulas !== 'completed') return 'sort-formulas';
    return 'completed'; // All steps completed
  };

  const handleRowClick = (row) => {
    const nextStep = getNextIncompleteStep(row);
    
    // Navigate to shipment order page with shipment data and step
    navigate('/dashboard/production/shipment/new', {
      state: {
        shipmentId: row.id,
        shipmentNumber: row.shipment,
        marketplace: row.marketplace,
        account: row.account,
        shipmentType: row.shipment?.includes('AWD') ? 'AWD' : row.shipment?.includes('FBA') ? 'FBA' : 'AWD',
        initialAction: nextStep,
        existingShipment: true,
        // Pass the current status of each step
        stepStatuses: {
          addProducts: row.addProducts,
          formulaCheck: row.formulaCheck,
          labelCheck: row.labelCheck,
          bookShipment: row.bookShipment,
          sortProducts: row.sortProducts,
          sortFormulas: row.sortFormulas,
        }
      }
    });
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

      <LabelCheckCommentModal
        isOpen={isLabelCommentOpen}
        onClose={() => {
          setIsLabelCommentOpen(false);
          setLabelCommentRow(null);
        }}
        onComplete={handleLabelCommentComplete}
        isDarkMode={isDarkMode}
      />

      <StatusCommentModal
        isOpen={isStatusCommentOpen}
        onClose={() => {
          setIsStatusCommentOpen(false);
          setStatusCommentRow(null);
          setStatusCommentField(null);
        }}
        onComplete={handleStatusCommentComplete}
        isDarkMode={isDarkMode}
        statusFieldName={statusCommentField}
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
                onRowClick={handleRowClick}
                onLabelCheckClick={handleLabelCheckClick}
                onStatusCommentClick={handleStatusCommentClick}
              />
            )}
          </>
        )}

        {/* Archive tab */}
        {activeTab === 'archive' && (
          <ArchiveTable rows={shipments.filter(s => s.status === 'archived')} />
        )}
      </div>

      {/* Toast Notification for Shipment Booked */}
      {showBookedToast && bookedShipmentInfo && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10000,
            animation: 'slideDown 0.3s ease-out',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #D1FAE5',
              borderRadius: '12px',
              padding: '12px 20px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              minWidth: '400px',
            }}
          >
            {/* Green checkmark icon */}
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: '#10B981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            {/* Message text */}
            <div style={{ flex: 1 }}>
              <span style={{
                fontSize: '15px',
                fontWeight: 600,
                color: '#10B981',
              }}>
                {bookedShipmentInfo.shipmentNumber || bookedShipmentInfo.shipmentName} {bookedShipmentInfo.shipmentType}
              </span>
              <span style={{
                fontSize: '15px',
                fontWeight: 400,
                color: '#6B7280',
                marginLeft: '6px',
              }}>
                shipment order booked
              </span>
            </div>

            {/* Close button */}
            <button
              type="button"
              onClick={() => setShowBookedToast(false)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#9CA3AF',
                flexShrink: 0,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Add keyframes animation */}
      <style>
        {`
          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translateX(-50%) translateY(-20px);
            }
            to {
              opacity: 1;
              transform: translateX(-50%) translateY(0);
            }
          }
        `}
      </style>
    </div>
  );
};

export default Planning;

