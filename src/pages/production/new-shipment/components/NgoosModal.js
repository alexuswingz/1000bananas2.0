import React, { useState, useEffect } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import NgoosAPI from '../../../../services/ngoosApi';
import CatalogAPI from '../../../../services/catalogApi';
import { extractFileId, getDriveImageUrl } from '../../../../services/googleDriveApi';
import Ngoos from '../../../products/catalog/detail/Ngoos';

// Utility function to handle Google Drive image URLs
const getImageUrl = (url) => {
  if (!url) return null;
  
  // Check if URL is from Google Drive
  if (typeof url === 'string' && url.includes('drive.google.com')) {
    // Extract file ID and convert to direct image URL
    const fileId = extractFileId(url);
    if (fileId) {
      return getDriveImageUrl(fileId);
    }
  }
  
  // Return original URL if not a Drive URL
  return url;
};

const NgoosModal = ({ 
  isOpen, 
  onClose, 
  selectedRow,
  isAlreadyAdded = false,
  labelsAvailable = null,
  onAddUnits = null,
  currentQty = 0,
  forecastRange = 150, // DOI goal in days from the order page
  doiSettings = null, // Full DOI settings object: { amazonDoiGoal, inboundLeadTime, manufactureLeadTime }
  allProducts = [], // All products from Add Products page for navigation
  onNavigate = null, // Navigation handler (prev/next)
  openDoiSettings = false, // Whether to open DOI settings popover by default
  openForecastSettings = false, // Whether to open forecast settings modal by default
  onDoiSettingsChange = null, // Callback when DOI settings change for this product
  onForecastSettingsChange = null, // Callback when forecast settings change for this product
}) => {
  const { isDarkMode } = useTheme();
  const [forecastData, setForecastData] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [catalogImageData, setCatalogImageData] = useState(null);

  const themeClasses = {
    cardBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
  };

  // Stable keys for DOI settings so effect doesn't re-run on every parent re-render (avoids React #185 infinite loop)
  const doiSettingsKey = doiSettings
    ? `${doiSettings.amazonDoiGoal ?? ''}_${doiSettings.inboundLeadTime ?? ''}_${doiSettings.manufactureLeadTime ?? ''}`
    : '';

  // Fetch forecast data for Add Units button (refetch when forecastRange or doiSettings changes)
  const childAsinForEffect = selectedRow?.child_asin || selectedRow?.childAsin || selectedRow?.asin;
  useEffect(() => {
    if (!isOpen || !childAsinForEffect) return;

    const fetchForecastData = async () => {
      try {
        const settings = doiSettings || forecastRange;
        const forecast = await NgoosAPI.getForecast(childAsinForEffect, settings);
        setForecastData(forecast);
      } catch (error) {
        console.error('Error fetching forecast data:', error);
      }
    };

    fetchForecastData();
  }, [isOpen, childAsinForEffect, forecastRange, doiSettingsKey]);

  // Fetch catalog data to get image if not available in selectedRow
  // Use stable primitives (id, child_asin) to avoid effect re-running every render (avoids React #185)
  const selectedRowId = selectedRow?.id;
  const selectedRowChildAsin = selectedRow?.child_asin ?? selectedRow?.childAsin ?? selectedRow?.asin;
  const selectedRowHasImage = !!(selectedRow?.mainImage || selectedRow?.product_image_url || selectedRow?.productImage || selectedRow?.image || selectedRow?.productImageUrl);
  const selectedRowCatalogId = selectedRow?.catalogId || selectedRow?.id;

  useEffect(() => {
    if (!isOpen || !selectedRowId) {
      setCatalogImageData(null);
      return;
    }

    if (selectedRowHasImage) {
      setCatalogImageData(null);
      return;
    }

    if (!selectedRowCatalogId) return;

    let cancelled = false;
    const fetchCatalogImage = async () => {
      try {
        const catalogData = await CatalogAPI.getById(selectedRowCatalogId);
        if (cancelled) return;
        if (catalogData) {
          const imageUrl = catalogData.productImages?.productImageUrl ||
            catalogData.slides?.productImage ||
            catalogData.mainImage ||
            catalogData.product_image_url ||
            null;
          setCatalogImageData(getImageUrl(imageUrl));
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Error fetching catalog image data:', error);
          setCatalogImageData(null);
        }
      }
    };

    fetchCatalogImage();
    return () => { cancelled = true; };
  }, [isOpen, selectedRowId, selectedRowHasImage, selectedRowCatalogId]);

  if (!isOpen || !selectedRow) return null;

  const childAsin = selectedRow?.child_asin || selectedRow?.childAsin || selectedRow?.asin;
  const hasAsin = !!childAsin;
  
  // Calculate current position in product list for navigation display
  const currentProductIndex = allProducts.findIndex(p => p.id === selectedRow?.id);
  const currentPosition = currentProductIndex >= 0 ? currentProductIndex + 1 : 0;
  const totalProducts = allProducts.length;
  
  // Get units_to_make from selectedRow (passed from table) to ensure consistency
  // This matches exactly what's shown in the table's QTY/Units to Make column
  // Fallback to freshly fetched forecastData only if selectedRow doesn't have it
  const forecastUnits = selectedRow?.units_to_make ?? selectedRow?.suggestedQty ?? forecastData?.units_to_make ?? 0;
  
  // Get ACTUAL available label inventory (accounting for labels already used in current shipment)
  // labelsAvailable prop is already calculated by parent to subtract used labels
  const realLabelInventory = labelsAvailable !== null && labelsAvailable !== undefined 
    ? labelsAvailable 
    : selectedRow?.label_inventory ?? selectedRow?.labelsAvailable ?? 0;
  
  // Get image from selectedRow or catalog, and convert Drive URLs
  const convertedImage = getImageUrl(
    selectedRow?.mainImage || 
    selectedRow?.product_image_url || 
    selectedRow?.productImage || 
    selectedRow?.image ||
    selectedRow?.productImageUrl ||
    catalogImageData ||
    null
  );

  // Prepare data for Ngoos component
  const ngoosData = {
    child_asin: childAsin,
    childAsin: childAsin,
    product_name: selectedRow?.product || selectedRow?.product_name,
    brand: selectedRow?.brand || selectedRow?.brand_name,
    size: selectedRow?.size,
    variations: selectedRow?.variations,
    // Ensure mainImage is included and converted from Drive URLs
    mainImage: convertedImage,
    product_image_url: convertedImage,
    productImage: convertedImage,
    image: convertedImage,
    ...selectedRow,
    // Override image fields with converted URLs (spread after to ensure they take precedence)
    mainImage: convertedImage,
    product_image_url: convertedImage,
    productImage: convertedImage,
    image: convertedImage
  };

  const handleConfirmUnits = (units) => {
    if (onAddUnits) {
      onAddUnits(selectedRow, units);
    }
    setShowConfirmModal(false);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(15,23,42,0.6)',
        backdropFilter: 'blur(3px)',
      }}
      onClick={onClose}
    >
      <div
        className={themeClasses.cardBg}
        style={{
          width: '90vw',
          maxWidth: '1009px',
          height: 'auto',
          minHeight: '722px',
          maxHeight: '90vh',
          borderRadius: '12px',
          boxShadow: '0 24px 80px rgba(15,23,42,0.75)',
          border: `1px solid ${isDarkMode ? '#1F2937' : '#E5E7EB'}`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header - Compact */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.65rem 1rem',
            borderBottom: `1px solid ${isDarkMode ? '#1F2937' : '#E5E7EB'}`,
            backgroundColor: isDarkMode ? '#1A2235' : '#FFFFFF',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.15rem 0.5rem',
                borderRadius: '9999px',
                backgroundColor: isDarkMode ? '#111827' : '#EEF2FF',
                fontSize: '0.65rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              <span style={{ width: 5, height: 5, borderRadius: 9999, backgroundColor: '#22C55E' }} />
              <span className={themeClasses.text}>N-GOOS</span>
            </div>
            <div className={themeClasses.text} style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              Never Go Out Of Stock
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {hasAsin && (
              <>
                {/* Navigation arrows */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                }}>
                  {totalProducts > 0 && (
                    <span style={{ 
                      fontSize: '0.7rem', 
                      color: isDarkMode ? '#9CA3AF' : '#6B7280',
                      fontWeight: 500
                    }}>
                      {currentPosition} of {totalProducts}
                    </span>
                  )}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0',
                    backgroundColor: '#1A1F2E',
                    padding: '0.25rem',
                    borderRadius: '6px'
                  }}>
                    <button
                      type="button"
                      onClick={() => onNavigate && onNavigate('prev')}
                      disabled={!onNavigate || totalProducts === 0}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '4px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: onNavigate && totalProducts > 0 ? 'pointer' : 'not-allowed',
                        color: '#9CA3AF',
                        opacity: onNavigate && totalProducts > 0 ? 1 : 0.5,
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (onNavigate && totalProducts > 0) {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M7.5 9L4.5 6L7.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <div style={{
                      width: '1px',
                      height: '16px',
                      backgroundColor: '#374151',
                      margin: '0 0.25rem'
                    }} />
                    <button
                      type="button"
                      onClick={() => onNavigate && onNavigate('next')}
                      disabled={!onNavigate || totalProducts === 0}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '4px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: onNavigate && totalProducts > 0 ? 'pointer' : 'not-allowed',
                        color: '#9CA3AF',
                        opacity: onNavigate && totalProducts > 0 ? 1 : 0.5,
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (onNavigate && totalProducts > 0) {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4.5 9L7.5 6L4.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                width: '26px',
                height: '26px',
                border: 'none',
                backgroundColor: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <img src="/assets/Vector (6).png" alt="Close" style={{ width: '12px', height: '12px' }} />
            </button>
          </div>
        </div>

        {/* Main content - Using Ngoos component - flex column so Sales/Ads same height as Inventory */}
        <div style={{ 
          flex: 1,
          minHeight: '662px',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: isDarkMode ? '#1A2235' : '#F9FAFB',
          overflow: 'auto',
        }}>
          {!hasAsin ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <svg style={{ width: '48px', height: '48px', margin: '0 auto', marginBottom: '0.75rem', color: '#64748b' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p className={themeClasses.text} style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.25rem' }}>N-GOOS Not Available</p>
              <p className={themeClasses.textSecondary} style={{ fontSize: '0.8rem' }}>This product does not have an ASIN.</p>
            </div>
          ) : (
            <Ngoos 
              data={ngoosData} 
              inventoryOnly={true} 
              doiGoalDays={forecastRange} 
              doiSettings={doiSettings} 
              overrideUnitsToMake={forecastUnits}
              labelsAvailable={realLabelInventory}
              openDoiSettings={openDoiSettings}
              openForecastSettings={openForecastSettings}
              onDoiSettingsChange={onDoiSettingsChange}
              onForecastSettingsChange={onForecastSettingsChange}
              hasActiveForecastSettings={
                !!(
                  selectedRow?.hasCustomForecastSettings ||
                  selectedRow?.hasCustomDoiSettings
                )
              }
              isAlreadyAdded={isAlreadyAdded}
              onAddUnits={(units) => {
                if (onAddUnits) {
                  onAddUnits(selectedRow, units);
                  onClose();
                }
              }}
            />
          )}
        </div>
      </div>

      {/* Confirm Units Modal */}
      {showConfirmModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.5)',
          }}
          onClick={() => setShowConfirmModal(false)}
        >
          <div
            style={{
              backgroundColor: isDarkMode ? '#1e293b' : '#FFFFFF',
              borderRadius: '0.75rem',
              padding: '1.5rem',
              width: '400px',
              maxWidth: '90vw',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ 
              fontSize: '1.125rem', 
              fontWeight: '600', 
              color: isDarkMode ? '#fff' : '#111827',
              marginBottom: '1rem' 
            }}>
              Add Units to Shipment
            </h3>
            <p style={{ 
              fontSize: '0.875rem', 
              color: isDarkMode ? '#94a3b8' : '#6B7280',
              marginBottom: '1rem' 
            }}>
              Add {forecastUnits.toLocaleString()} units of <strong>{selectedRow?.product || selectedRow?.product_name}</strong> to the shipment?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                onClick={() => setShowConfirmModal(false)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  border: `1px solid ${isDarkMode ? '#374151' : '#D1D5DB'}`,
                  backgroundColor: 'transparent',
                  color: isDarkMode ? '#fff' : '#374151',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmUnits(forecastUnits)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  backgroundColor: '#2563EB',
                  color: '#fff',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                }}
              >
                Add Units
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NgoosModal;
