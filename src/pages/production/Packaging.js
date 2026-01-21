import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { toast } from 'sonner';
import MobileHeader from '../../components/MobileHeader';
import Sidebar from '../../components/Sidebar';
import PackagingHeader from './packaging/components/PackagingHeader';
import PackagingTable from './packaging/components/PackagingTable';
import PackagingArchiveTable from './packaging/components/PackagingArchiveTable';
import ProductInfoModal from './packaging/components/ProductInfoModal';
import QualityChecksModal from './packaging/components/QualityChecksModal';
import ProductionStartedModal from './packaging/components/ProductionStartedModal';
import LogUnitsProducedModal from './packaging/components/LogUnitsProducedModal';
import RemainingFormulaCheckModal from './packaging/components/RemainingFormulaCheckModal';
import EnterRemainingQuantityModal from './packaging/components/EnterRemainingQuantityModal';
import DailyClosingReportModal from './packaging/components/DailyClosingReportModal';
import ClosingReportHistorySidebar from './packaging/components/ClosingReportHistorySidebar';
import { addUnusedFormula, getProductsInventory } from '../../services/productionApi';

const Packaging = () => {
  const { isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState('active');
  const [activeSubTab, setActiveSubTab] = useState('bottling');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShipment, setSelectedShipment] = useState('');
  const [showShipmentDropdown, setShowShipmentDropdown] = useState(false);
  const [showProductInfoModal, setShowProductInfoModal] = useState(false);
  const [showQualityChecksModal, setShowQualityChecksModal] = useState(false);
  const [showProductionStartedModal, setShowProductionStartedModal] = useState(false);
  const [showLogUnitsProducedModal, setShowLogUnitsProducedModal] = useState(false);
  const [showRemainingFormulaCheckModal, setShowRemainingFormulaCheckModal] = useState(false);
  const [showEnterRemainingQuantityModal, setShowEnterRemainingQuantityModal] = useState(false);
  const [showClosingReportModal, setShowClosingReportModal] = useState(false);
  const [showClosingReportHistory, setShowClosingReportHistory] = useState(false);
  const [viewingReport, setViewingReport] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isSortMode, setIsSortMode] = useState(false);
  const [isFromUnmarkShiners, setIsFromUnmarkShiners] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Sample data - initialize with packaging products
  const [products, setProducts] = useState([
    {
      id: 1,
      status: 'pending',
      tpsShipNumber: '10-01-2025',
      type: 'AWD',
      brand: 'TPS Plant Foods',
      product: 'Cherry Tree Fertilizer',
      productImage: '/assets/TPS_Cherry Tree_8oz_Wrap (1).png',
      size: '1 Gallon',
      qty: 72000,
      caseNumber: 488,
      sku: 'HPINDOOR8OZ-FBA-UPC-0123',
      formula: 'F.Indoor Plant Food',
      labelLocation: 'LBL-PLANT-218',
      cap: 'VENTED Berry',
      productType: 'Liquid',
      filter: 'Metal',
    },
    {
      id: 2,
      status: 'pending',
      tpsShipNumber: '10-01-2025',
      type: 'AWD',
      brand: 'TPS Plant Foods',
      product: 'Cherry Tree Fertilizer',
      productImage: '/assets/TPS_Cherry Tree_8oz_Wrap (1).png',
      size: '1 Gallon',
      qty: 72000,
      caseNumber: 488,
      sku: 'HPINDOOR8OZ-FBA-UPC-0123',
      formula: 'F.Indoor Plant Food',
      labelLocation: 'LBL-PLANT-218',
      cap: 'VENTED Berry',
      productType: 'Liquid',
      filter: 'Metal',
    },
    {
      id: 3,
      status: 'pending',
      tpsShipNumber: '10-01-2025',
      type: 'AWD',
      brand: 'TPS Plant Foods',
      product: 'Cherry Tree Fertilizer',
      productImage: '/assets/TPS_Cherry Tree_8oz_Wrap (1).png',
      size: '1 Gallon',
      qty: 72000,
      caseNumber: 488,
      sku: 'HPINDOOR8OZ-FBA-UPC-0123',
      formula: 'F.Indoor Plant Food',
      labelLocation: 'LBL-PLANT-218',
      cap: 'VENTED Berry',
      productType: 'Liquid',
      filter: 'Metal',
    },
  ]);

  const themeClasses = {
    pageBg: isDarkMode ? 'bg-dark-bg-primary' : 'bg-light-bg-primary',
    textPrimary: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-600',
  };

  // Handle window resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const subTabs = [
    { id: 'all', label: 'All', count: 88 },
    { id: 'bottling', label: 'Bottling', count: 12 },
    { id: 'bagging', label: 'Bagging', count: 11 },
  ];

  const handleStartClick = (row) => {
    // Close all modals first
    setShowProductionStartedModal(false);
    setShowQualityChecksModal(false);
    setShowProductInfoModal(false);
    
    // Set new product and open Product Info modal
    setSelectedProduct(row);
    setShowProductInfoModal(true);
  };

  const handleBeginQC = () => {
    // Update status to "In Progress" when Quality Checks modal opens
    if (selectedProduct) {
      setProducts(prevProducts => 
        prevProducts.map(product => 
          product.id === selectedProduct.id 
            ? { ...product, status: 'in_progress' }
            : product
        )
      );
      console.log('Setting status to In Progress for product:', selectedProduct.id);
    }
    // Close all other modals
    setShowProductInfoModal(false);
    setShowProductionStartedModal(false);
    
    // If coming from unmark shiners, skip QualityChecksModal and go directly to ProductionStartedModal
    if (isFromUnmarkShiners) {
      setIsFromUnmarkShiners(false); // Reset the flag
      setShowProductionStartedModal(true);
    } else {
      // Normal flow: Open Quality Checks modal
      setShowQualityChecksModal(true);
    }
  };

  const [qualityCheckImages, setQualityCheckImages] = useState([]);

  const handleStartProduction = (images) => {
    // Close all other modals
    setShowQualityChecksModal(false);
    setShowProductInfoModal(false);
    // Store quality check images
    if (images) {
      setQualityCheckImages(images);
    }
    // Open Production Started modal
    setShowProductionStartedModal(true);
  };

  // Log products whenever they change
  useEffect(() => {
    console.log('Products state updated:', products.map(p => ({ id: p.id, status: p.status })));
  }, [products]);

  const handleCloseProductionStarted = () => {
    // When closing via X button, just close the modal (status already set to in_progress)
    setShowProductionStartedModal(false);
    setSelectedProduct(null);
  };

  const handlePause = (isPaused) => {
    // Handle pause/resume logic
    if (selectedProduct) {
      const newStatus = isPaused ? 'paused' : 'in_progress';
      setProducts(prevProducts => 
        prevProducts.map(product => 
          product.id === selectedProduct.id 
            ? { ...product, status: newStatus }
            : product
        )
      );
      // Update selectedProduct state as well
      setSelectedProduct(prev => ({
        ...prev,
        status: newStatus
      }));
    }
  };

  const handleLogUnitsClick = () => {
    // Open the Log Units Produced modal
    setShowLogUnitsProducedModal(true);
  };

  const handleConfirmLogUnits = (unitsProduced) => {
    // Update the product with units produced
    if (selectedProduct) {
      const totalQty = selectedProduct.qty || 0;
      const remainingQty = totalQty - unitsProduced;
      
      const updatedProduct = {
        ...selectedProduct,
        unitsProduced,
        remainingQty,
        status: 'paused'
      };
      
      setProducts(prevProducts => 
        prevProducts.map(product => 
          product.id === selectedProduct.id 
            ? updatedProduct
            : product
        )
      );
      
      // Update selectedProduct state so the modal reflects the changes
      setSelectedProduct(updatedProduct);
    }
    setShowLogUnitsProducedModal(false);
  };

  const handleImageClick = () => {
    // Only show the Remaining Formula Check modal if status is in_progress
    if (selectedProduct?.status === 'in_progress') {
      setShowRemainingFormulaCheckModal(true);
    }
  };

  const handleRemainingFormulaYes = () => {
    // Handle "Yes, Formula Left" action - show Enter Remaining Quantity modal
    setShowRemainingFormulaCheckModal(false);
    setShowEnterRemainingQuantityModal(true);
  };

  const handleRemainingFormulaNo = () => {
    // Handle "No, Empty" action
    console.log('Vessel is empty');
    setShowRemainingFormulaCheckModal(false);
    // TODO: Add any additional logic needed
  };

  const handleConfirmRemainingQuantity = async (quantity) => {
    // Handle the confirmed remaining quantity
    if (selectedProduct) {
      const productName = selectedProduct.product || 'Product';
      const productSize = selectedProduct.size || '';
      const productQty = selectedProduct.qty || 0;
      const formula = selectedProduct.formula || 'Formula';
      
      console.log('🎯 Selected Product:', selectedProduct);
      console.log('📝 Formula name from product:', formula);
      console.log('💧 Quantity entered:', quantity);
      
      try {
        // TEMPORARY: Save to localStorage for demo (will be replaced with API call later)
        const unusedFormulas = JSON.parse(localStorage.getItem('unusedFormulas') || '[]');
        const gallons = parseFloat(quantity);
        
        // Fetch products that use this formula to calculate potential units
        let productsForFormula = [];
        try {
          const allProducts = await getProductsInventory();
          productsForFormula = allProducts
            .filter(p => p.formula_name === formula)
            .map(p => ({
              catalog_id: p.id,
              product_name: p.product_name,
              brand_name: p.brand_name,
              size: p.size,
              child_asin: p.child_asin,
              gallons_per_unit: p.gallons_per_unit || 0.25,
              potential_units: Math.floor(gallons / (p.gallons_per_unit || 0.25))
            }))
            .sort((a, b) => a.brand_name.localeCompare(b.brand_name));
        } catch (error) {
          console.error('Error fetching products:', error);
        }
        
        // Check if formula already exists
        const existingIndex = unusedFormulas.findIndex(f => f.formula_name === formula);
        
        if (existingIndex >= 0) {
          // Add to existing formula
          unusedFormulas[existingIndex].unused_gallons += gallons;
          unusedFormulas[existingIndex].total_gallons += gallons;
          // Recalculate potential units for existing products
          unusedFormulas[existingIndex].products = productsForFormula;
        } else {
          // Create new formula entry
          unusedFormulas.push({
            formula_name: formula,
            unused_gallons: gallons,
            allocated_gallons: 0,
            total_gallons: gallons,
            gallons_in_production: 0,
            product_count: productsForFormula.length,
            product_names: productsForFormula.map(p => p.product_name).join(', '),
            last_manufactured: new Date().toISOString(),
            products: productsForFormula
          });
        }
        
        localStorage.setItem('unusedFormulas', JSON.stringify(unusedFormulas));
        console.log('✅ Saved unused formula:', formula, '-', gallons, 'gallons');
        
        // Update product status to 'done' and save remaining formula quantity
        setProducts(prevProducts => 
          prevProducts.map(product => 
            product.id === selectedProduct.id 
              ? { ...product, remainingFormula: quantity, status: 'done' }
              : product
          )
        );

        // Close all modals
        setShowEnterRemainingQuantityModal(false);
        setShowProductionStartedModal(false);
        setSelectedProduct(null);

        // Show first toast - Units completed (with green background)
        toast.success(
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            <span style={{ fontSize: '14px', color: '#065F46', fontWeight: '500' }}>
              {productQty.toLocaleString()} units of {productName} {productSize ? `(${productSize})` : ''} done.
            </span>
          </div>,
          {
            style: {
              backgroundColor: '#D1FAE5',
              border: '1px solid #6EE7B7',
              borderRadius: '12px',
              padding: '8px 12px',
              minWidth: '400px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            },
            duration: 5000,
          }
        );

        // Show second toast - Formula added to floor inventory (with green background)
        setTimeout(() => {
          toast.success(
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <span style={{ fontSize: '14px', color: '#065F46', fontWeight: '500' }}>
                {quantity} Gallons of {formula} added to Floor Inventory - Unused Formulas.
              </span>
            </div>,
            {
              style: {
                backgroundColor: '#D1FAE5',
                border: '1px solid #6EE7B7',
                borderRadius: '12px',
                padding: '8px 12px',
                minWidth: '400px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              },
              duration: 5000,
            }
          );
        }, 300); // Slight delay so they appear in sequence
      } catch (error) {
        console.error('Error adding unused formula:', error);
        toast.error(
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: '500' }}>
              Failed to save unused formula. Please try again.
            </span>
          </div>,
          {
            duration: 5000,
          }
        );
      }
    }
  };

  const handleMarkDone = () => {
    // Handle mark done logic
    console.log('=== Mark Done Clicked ===');
    console.log('Selected Product:', selectedProduct);
    
    if (!selectedProduct) {
      console.error('No product selected!');
      return;
    }

    // Update the product status to 'done'
    setProducts(prevProducts => {
      const updated = prevProducts.map(product => {
        if (product.id === selectedProduct.id) {
          console.log(`Updating product ${product.id} from ${product.status} to done`);
          return { ...product, status: 'done' };
        }
        return product;
      });
      console.log('Products after update:', updated);
      return updated;
    });

    // Close modal after a brief delay to ensure state update
    setTimeout(() => {
      setShowProductionStartedModal(false);
      setSelectedProduct(null);
    }, 100);
  };

  const handleCloseProductInfo = () => {
    // Close all modals when Product Info is closed
    setShowProductInfoModal(false);
    setShowQualityChecksModal(false);
    setShowProductionStartedModal(false);
    setSelectedProduct(null);
  };

  const handleCloseQualityChecks = () => {
    // Close all modals when Quality Checks is closed
    setShowQualityChecksModal(false);
    setShowProductInfoModal(false);
    setShowProductionStartedModal(false);
    setSelectedProduct(null);
  };

  const handleSortClick = () => {
    setIsSortMode(!isSortMode);
  };

  const handleGenerateClosingReport = () => {
    console.log('Generate Closing Report clicked');
    setShowClosingReportModal(true);
  };

  const handleViewReportHistory = () => {
    console.log('View Report History clicked');
    setShowClosingReportHistory(true);
  };

  const handleViewReportFromHistory = (report) => {
    console.log('Viewing report:', report);
    setViewingReport(report);
    setShowClosingReportModal(true);
  };

  const handleInProgressClick = (row) => {
    // Close all other modals
    setShowProductInfoModal(false);
    setShowQualityChecksModal(false);
    
    // Set selected product and open Production Started modal
    setSelectedProduct(row);
    setShowProductionStartedModal(true);
  };

  const handleProductNotes = (row) => {
    console.log('Product Notes clicked for:', row);
    // TODO: Implement Product Notes functionality
    // For now, we can use the ProductionNotesModal if it exists
    setSelectedProduct(row);
    // setShowProductionNotesModal(true); // Uncomment when modal state is added
  };

  const handleMoreDetails = (row) => {
    console.log('More Details clicked for:', row);
    // Show Product Info Modal
    setSelectedProduct(row);
    setShowProductInfoModal(true);
  };

  return (
    <div className={`min-h-screen ${themeClasses.pageBg}`}>
      {/* Mobile Header - Only visible on mobile */}
      <div className="md:hidden">
        <MobileHeader onMenuClick={() => setIsSidebarOpen(true)} />
      </div>
      
      {/* Packaging Header - Has both desktop and mobile layouts inside */}
      <PackagingHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSearch={setSearchQuery}
        onSortClick={handleSortClick}
        onGenerateClosingReport={handleGenerateClosingReport}
        onViewReportHistory={handleViewReportHistory}
      />

      {/* Desktop Sub-navigation tabs - Simple tabs with Select Shipment */}
      {activeTab === 'active' && (
        <div
          className={`${themeClasses.pageBg} hidden md:flex`}
          style={{
            padding: '1rem 2rem',
            borderBottom: '1px solid #E5E7EB',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
            {subTabs.map((tab) => {
              const isActive = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id)}
                  style={{
                    padding: '0.5rem 0',
                    fontSize: '14px',
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#2563EB' : themeClasses.textSecondary,
                    borderBottom: isActive ? '2px solid #2563EB' : '2px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    background: 'none',
                    borderTop: 'none',
                    borderLeft: 'none',
                    borderRight: 'none',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Select Shipment Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowShipmentDropdown(!showShipmentDropdown)}
              className={`${isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white'} ${isDarkMode ? 'text-dark-text-primary' : 'text-gray-900'} ${isDarkMode ? 'border-dark-border-primary' : 'border-gray-200'} border text-sm transition-all hover:shadow-sm`}
              style={{
                padding: '0.5rem 1rem',
                paddingRight: '2rem',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                whiteSpace: 'nowrap',
                minWidth: '150px',
                position: 'relative',
              }}
            >
              <span>{selectedShipment || 'Select Shipment'}</span>
              <svg
                className={isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500'}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  width: '1rem',
                  height: '1rem',
                }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {showShipmentDropdown && (
              <div
                className={`${isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white'} ${isDarkMode ? 'border-dark-border-primary' : 'border-gray-200'} border shadow-lg rounded-md`}
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '0.25rem',
                  zIndex: 50,
                  maxHeight: '200px',
                  overflowY: 'auto',
                }}
              >
                <button
                  onClick={() => {
                    setSelectedShipment('');
                    setShowShipmentDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm ${isDarkMode ? 'text-dark-text-primary' : 'text-gray-900'} hover:bg-gray-50 dark:hover:bg-gray-700`}
                >
                  All Shipments
                </button>
                {/* Add more shipment options here */}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile Sub-navigation tabs with counts and Select Shipment */}
      {activeTab === 'active' && (
        <div
          className="md:hidden flex"
          style={{
            padding: '1rem',
            borderBottom: '1px solid #E5E7EB',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          {/* Tabs with counts */}
          <div
            style={{
              display: 'flex',
              gap: '1rem',
              alignItems: 'center',
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {subTabs.map((tab) => {
              const isActive = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: isActive ? '#2563EB' : '#6B7280',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    borderBottom: isActive ? '2px solid #2563EB' : '2px solid transparent',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span>{tab.label}</span>
                  <span
                    style={{
                      backgroundColor: isActive ? '#DBEAFE' : '#F3F4F6',
                      color: isActive ? '#2563EB' : '#6B7280',
                      borderRadius: '10px',
                      padding: '2px 8px',
                      fontSize: '12px',
                      fontWeight: 600,
                      minWidth: '24px',
                      textAlign: 'center',
                    }}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Select Shipment Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowShipmentDropdown(!showShipmentDropdown)}
              className={`${isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white'} ${isDarkMode ? 'text-dark-text-primary' : 'text-gray-900'} ${isDarkMode ? 'border-dark-border-primary' : 'border-gray-200'} border text-sm transition-all hover:shadow-sm`}
              style={{
                padding: '0.5rem 1rem',
                paddingRight: '2rem',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                whiteSpace: 'nowrap',
                width: '100%',
                position: 'relative',
              }}
            >
              <span>{selectedShipment || 'Select Shipment'}</span>
              <svg
                className={isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500'}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  width: '1rem',
                  height: '1rem',
                }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {showShipmentDropdown && (
              <div
                className={`${isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white'} ${isDarkMode ? 'border-dark-border-primary' : 'border-gray-200'} border shadow-lg rounded-md`}
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '0.25rem',
                  zIndex: 50,
                  maxHeight: '200px',
                  overflowY: 'auto',
                }}
              >
                <button
                  onClick={() => {
                    setSelectedShipment('');
                    setShowShipmentDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm ${isDarkMode ? 'text-dark-text-primary' : 'text-gray-900'} hover:bg-gray-50 dark:hover:bg-gray-700`}
                >
                  All Shipments
                </button>
                {/* Add more shipment options here */}
              </div>
            )}
          </div>
        </div>
      )}


      {/* Main content */}
      <div className="md:px-8 px-4" style={{ paddingTop: '1rem', paddingBottom: '0' }}>
        {activeTab === 'archive' ? (
          <PackagingArchiveTable
            data={[]}
            searchQuery={searchQuery}
          />
        ) : (
          <PackagingTable
            data={products}
            searchQuery={searchQuery}
            onStartClick={handleStartClick}
            onInProgressClick={handleInProgressClick}
            isSortMode={isSortMode}
            onExitSortMode={() => setIsSortMode(false)}
            onSetIsFromUnmarkShiners={setIsFromUnmarkShiners}
            onProductNotes={handleProductNotes}
            onMoreDetails={handleMoreDetails}
          />
        )}
      </div>

      {/* Product Info Modal */}
      <ProductInfoModal
        isOpen={showProductInfoModal}
        onClose={handleCloseProductInfo}
        onBeginQC={handleBeginQC}
        productData={selectedProduct}
      />

      {/* Quality Checks Modal */}
      <QualityChecksModal
        isOpen={showQualityChecksModal}
        onClose={handleCloseQualityChecks}
        productData={selectedProduct}
        onStartProduction={handleStartProduction}
      />

      {/* Production Started Modal */}
      <ProductionStartedModal
        isOpen={showProductionStartedModal}
        onClose={handleCloseProductionStarted}
        productData={selectedProduct}
        onPause={handlePause}
        onMarkDone={handleMarkDone}
        onLogUnitsClick={handleLogUnitsClick}
        onImageClick={handleImageClick}
        qualityCheckImages={qualityCheckImages}
      />

      {/* Log Units Produced Modal */}
      <LogUnitsProducedModal
        isOpen={showLogUnitsProducedModal}
        onClose={() => setShowLogUnitsProducedModal(false)}
        productData={selectedProduct}
        onConfirm={handleConfirmLogUnits}
      />

      {/* Remaining Formula Check Modal */}
      <RemainingFormulaCheckModal
        isOpen={showRemainingFormulaCheckModal}
        onClose={() => setShowRemainingFormulaCheckModal(false)}
        productData={selectedProduct}
        onYes={handleRemainingFormulaYes}
        onNo={handleRemainingFormulaNo}
      />

      {/* Enter Remaining Quantity Modal */}
      <EnterRemainingQuantityModal
        isOpen={showEnterRemainingQuantityModal}
        onClose={() => setShowEnterRemainingQuantityModal(false)}
        productData={selectedProduct}
        onConfirm={handleConfirmRemainingQuantity}
      />

      {/* Daily Closing Report Modal */}
      <DailyClosingReportModal
        isOpen={showClosingReportModal}
        onClose={() => {
          setShowClosingReportModal(false);
          setViewingReport(null);
        }}
        productionData={products.filter(p => p.status === 'done')}
        viewOnly={!!viewingReport}
        initialDate={viewingReport?.date || ''}
        reportData={viewingReport}
      />

      {/* Closing Report History Sidebar */}
      <ClosingReportHistorySidebar
        isOpen={showClosingReportHistory}
        onClose={() => setShowClosingReportHistory(false)}
        onViewReport={handleViewReportFromHistory}
      />

      {/* Mobile Sidebar Overlay */}
      {isMobile && isSidebarOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setIsSidebarOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 9998,
            }}
          />
          {/* Sidebar Drawer */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 0,
              width: '280px',
              backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
              zIndex: 9999,
              boxShadow: '2px 0 8px rgba(0, 0, 0, 0.15)',
              transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
              transition: 'transform 0.3s ease',
              overflowY: 'auto',
            }}
          >
            {/* Close Button */}
            <div
              style={{
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: '#9333EA',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span style={{ color: '#FCD34D', fontSize: '20px', fontWeight: 'bold' }}>🍌</span>
                </div>
                <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#FCD34D' }}>
                  1000 Bananas
                </span>
              </div>
              <button
                onClick={() => setIsSidebarOpen(false)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={isDarkMode ? '#FFFFFF' : '#374151'}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            {/* Sidebar Content */}
            <Sidebar forceMobile={true} />
          </div>
        </>
      )}
    </div>
  );
};

export default Packaging;
