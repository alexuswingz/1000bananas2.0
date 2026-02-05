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
      childAsin: 'B0C73TDZCQ',
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
      childAsin: 'B0C73TDZCQ',
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
      childAsin: 'B0C73TDZCQ',
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

  const handlePause = (isPaused, productDataFromModal = null) => {
    // Use productData from modal if provided, otherwise use selectedProduct
    let productToUpdate = productDataFromModal || selectedProduct;
    
    if (!productToUpdate || !productToUpdate.id) {
      // Fallback: find product that's in progress
      const inProgressProduct = products.find(p => p.status === 'in_progress' || p.status === 'paused');
      if (!inProgressProduct) {
        console.error('No product to pause/resume');
        return;
      }
      productToUpdate = inProgressProduct;
    }

    const productId = productToUpdate.id;
    // When pausing, set status to 'paused'. When resuming, set to 'in_progress'
    const newStatus = isPaused ? 'paused' : 'in_progress';
    
    setProducts(prevProducts => 
      prevProducts.map(product => 
        product.id === productId
          ? { 
              ...product, 
              status: newStatus,
              // Store quality check images when pausing so they're available when reopening
              qualityCheckImages: isPaused && qualityCheckImages.length > 0 
                ? qualityCheckImages 
                : product.qualityCheckImages || []
            }
          : product
      )
    );
    
    // Update selectedProduct if it matches
    if (selectedProduct && selectedProduct.id === productId) {
      setSelectedProduct(prev => ({
        ...prev,
        status: newStatus,
        qualityCheckImages: isPaused && qualityCheckImages.length > 0 
          ? qualityCheckImages 
          : prev.qualityCheckImages || []
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

  const handleMarkDone = (productDataFromModal = null) => {
    // Try to get product ID from modal data, selectedProduct, or find from products array
    let productId = null;
    
    if (productDataFromModal && productDataFromModal.id) {
      productId = productDataFromModal.id;
    } else if (selectedProduct && selectedProduct.id) {
      productId = selectedProduct.id;
    } else {
      // If both are null, try to find the product that's currently "in_progress"
      // This is a fallback in case state got out of sync
      const inProgressProduct = products.find(p => p.status === 'in_progress' || p.status === 'paused');
      if (inProgressProduct) {
        productId = inProgressProduct.id;
        console.log('Found in-progress product as fallback:', productId);
      }
    }
    
    if (!productId) {
      console.error('❌ No product ID found!', { 
        productDataFromModal, 
        selectedProduct, 
        products: products.map(p => ({ id: p.id, status: p.status }))
      });
      return;
    }

    console.log('Updating product ID:', productId);

    // Update the product status to 'done'
    setProducts(prevProducts => {
      const updated = prevProducts.map(product => {
        if (product.id === productId) {
          console.log(`✅ Found product ${product.id}, updating status from ${product.status} to done`);
          return { ...product, status: 'done' };
        }
        return product;
      });
      return updated;
    });

    // Update selectedProduct if it matches
    if (selectedProduct && selectedProduct.id === productId) {
      setSelectedProduct(prev => prev ? { ...prev, status: 'done' } : null);
    }

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
    
    // If product has quality check images stored, use them; otherwise use current state
    if (row.qualityCheckImages && row.qualityCheckImages.length > 0) {
      setQualityCheckImages(row.qualityCheckImages);
    }
    
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
