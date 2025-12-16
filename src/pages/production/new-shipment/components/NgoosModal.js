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
  labelsAvailable = null,
  onAddUnits = null,
  currentQty = 0,
  forecastRange = 150, // DOI goal in days from the order page
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

  // Fetch forecast data for Add Units button (refetch when forecastRange changes)
  useEffect(() => {
    const fetchForecastData = async () => {
      if (!isOpen || !selectedRow) return;

      const childAsin = selectedRow?.child_asin || selectedRow?.childAsin || selectedRow?.asin;
      if (!childAsin) return;

      try {
        // Pass the forecastRange (DOI goal) to get updated units_to_make calculation
        const forecast = await NgoosAPI.getForecast(childAsin, forecastRange);
        setForecastData(forecast);
      } catch (error) {
        console.error('Error fetching forecast data:', error);
      }
    };

    fetchForecastData();
  }, [isOpen, selectedRow, forecastRange]);

  // Fetch catalog data to get image if not available in selectedRow
  useEffect(() => {
    const fetchCatalogImage = async () => {
      if (!isOpen || !selectedRow) {
        setCatalogImageData(null);
        return;
      }

      // Check if image already exists
      const hasImage = selectedRow?.mainImage || 
                      selectedRow?.product_image_url || 
                      selectedRow?.productImage || 
                      selectedRow?.image ||
                      selectedRow?.productImageUrl;
      
      if (hasImage) {
        setCatalogImageData(null);
        return; // Image already available, no need to fetch
      }

      // Try to fetch from catalog using catalogId
      const catalogId = selectedRow?.catalogId || selectedRow?.id;
      if (!catalogId) return;

      try {
        const catalogData = await CatalogAPI.getById(catalogId);
        if (catalogData) {
          // Extract image from catalog data and convert Drive URLs
          const imageUrl = catalogData.productImages?.productImageUrl || 
                          catalogData.slides?.productImage ||
                          catalogData.mainImage ||
                          catalogData.product_image_url ||
                          null;
          setCatalogImageData(getImageUrl(imageUrl));
        }
      } catch (error) {
        console.error('Error fetching catalog image data:', error);
        setCatalogImageData(null);
      }
    };

    fetchCatalogImage();
  }, [isOpen, selectedRow]);

  if (!isOpen || !selectedRow) return null;

  const childAsin = selectedRow?.child_asin || selectedRow?.childAsin || selectedRow?.asin;
  const hasAsin = !!childAsin;
  
  // Get units_to_make from selectedRow (passed from table) - this matches what's shown in the row
  // Use nullish coalescing (??) to treat 0 as a valid value (not falsy)
  // This ensures consistency between the table QTY and the modal's "Add Units" button
  // Only fall back to forecastData if selectedRow values are undefined/null
  const forecastUnits = selectedRow?.units_to_make ?? selectedRow?.suggestedQty ?? forecastData?.units_to_make ?? 0;
  
  // Get real label inventory from database (passed via selectedRow.label_inventory or labelsAvailable prop)
  const realLabelInventory = labelsAvailable ?? selectedRow?.label_inventory ?? selectedRow?.labelsAvailable ?? 0;
  
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
          width: '64%',
          maxWidth: '896px',
          height: 'auto',
          maxHeight: '150vh',
          borderRadius: '12px',
          boxShadow: '0 24px 80px rgba(15,23,42,0.75)',
          border: `1px solid ${isDarkMode ? '#1F2937' : '#E5E7EB'}`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
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
            backgroundColor: isDarkMode ? '#0f172a' : '#FFFFFF',
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
                <div
                  style={{
                    padding: '3px 10px',
                    borderRadius: '4px',
                    backgroundColor: realLabelInventory < 100 ? 'rgba(220, 38, 38, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                    border: `1px solid ${realLabelInventory < 100 ? 'rgba(220, 38, 38, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
                    color: realLabelInventory < 100 ? '#DC2626' : '#22C55E',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span style={{ 
                    width: '14px', 
                    height: '14px', 
                    borderRadius: '9999px', 
                    backgroundColor: realLabelInventory < 100 ? '#DC2626' : '#22C55E',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '9px',
                    fontWeight: 700
                  }}>
                    {realLabelInventory < 100 ? '!' : '✓'}
                  </span>
                  Label Inventory: {realLabelInventory.toLocaleString()}
                </div>
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(true)}
                  style={{
                    padding: '0 0.6rem',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    fontSize: '0.7rem',
                    fontWeight: 500,
                    height: '22px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                  }}
                >
                  Add Units ({forecastUnits.toLocaleString()})
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '9999px',
                border: 'none',
                backgroundColor: isDarkMode ? '#111827' : '#F3F4F6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: '1rem', lineHeight: 1, color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>×</span>
            </button>
          </div>
        </div>

        {/* Main content - Using Ngoos component - No scrolling */}
        <div style={{ 
          flex: 1,
          backgroundColor: isDarkMode ? '#0f172a' : '#F9FAFB',
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
            <Ngoos data={ngoosData} inventoryOnly={true} doiGoalDays={forecastRange} />
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
