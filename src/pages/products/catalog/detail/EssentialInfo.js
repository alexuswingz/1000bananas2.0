import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const EssentialInfo = ({ data }) => {
  const { isDarkMode } = useTheme();
  const allVariations = Array.isArray(data.allVariations) ? data.allVariations : [];
  const sizeOptions = useMemo(() => {
    if (Array.isArray(data.variations) && data.variations.length > 0) {
      return data.variations;
    }
    if (data.variationsData && Object.keys(data.variationsData).length > 0) {
      return Object.keys(data.variationsData);
    }
    if (allVariations.length > 0) {
      const uniqueSizes = allVariations.map(v => v.size || `Variant ${v.id}`);
      return [...new Set(uniqueSizes)];
    }
    return ['Default'];
  }, [data.variations, data.variationsData, allVariations]);
  
  const parseList = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(item => (typeof item === 'string' ? item.trim() : item)).filter(Boolean);
    if (typeof value === 'string') {
      return value
        .split(/[\n,]+/)
        .map(item => item.trim())
        .filter(Boolean);
    }
    return [];
  };
  
  const marketingCoreAsins = parseList(data.core_competitor_asins || data.coreCompetitorAsins);
  const marketingOtherAsins = parseList(data.other_competitor_asins || data.otherCompetitorAsins);
  const marketingCoreKeywords = parseList(data.core_keywords || data.coreKeywords);
  const marketingOtherKeywords = parseList(data.other_keywords || data.otherKeywords);

  const [isEditing, setIsEditing] = useState(false);
  const [activePackagingTab, setActivePackagingTab] = useState(() => sizeOptions[0] || 'Default');
  const [activeNotesTab, setActiveNotesTab] = useState(() => sizeOptions[0] || 'Default');
  const [editData, setEditData] = useState({});

  useEffect(() => {
    if (!sizeOptions.includes(activePackagingTab)) {
      setActivePackagingTab(sizeOptions[0] || 'Default');
    }
    if (!sizeOptions.includes(activeNotesTab)) {
      setActiveNotesTab(sizeOptions[0] || 'Default');
    }
  }, [sizeOptions, activePackagingTab, activeNotesTab]);

  const themeClasses = {
    bg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    inputBg: isDarkMode ? 'bg-dark-bg-tertiary' : 'bg-gray-50',
  };

  // Get variation-specific data for 1000 Bananas imports
  const buildVariantFromRaw = (variant, fallbackSize) => ({
    sizeLabel: variant.size || fallbackSize,
    childAsin: variant.child_asin,
    parentAsin: variant.parent_asin,
    childSku: variant.child_sku_final,
    parentSku: variant.parent_sku_final,
    upc: variant.upc,
    fullProductName: variant.title || variant.product_name,
    packagingName: variant.packaging_name,
    closureName: variant.closure_name,
    labelSize: variant.label_size,
    labelLocation: variant.label_location,
    caseSize: variant.case_size,
    unitsPerCase: variant.units_per_case,
    filter: variant.filter,
    productImage: variant.product_image_url || variant.basic_wrap_url || variant.tri_bottle_wrap_url,
    unitsSold30Days: variant.units_sold_30_days,
    notes: variant.notes,
    dimensions: {
      length: variant.product_dimensions_length_in,
      width: variant.product_dimensions_width_in,
      height: variant.product_dimensions_height_in,
      weight: variant.product_dimensions_weight_lbs
    },
    formula: {
      guaranteedAnalysis: variant.var_tps_guaranteed_analysis || variant.var_guaranteed_analysis,
      npk: variant.var_tps_npk || variant.var_npk,
      derivedFrom: variant.var_tps_derived_from || variant.var_derived_from,
      storageWarranty: variant.var_tps_storage_warranty || variant.var_storage_warranty
    }
  });

  const getVariationData = (size) => {
    if (data.source === '1000bananas-import' && data.variationsData && data.variationsData[size]) {
      return data.variationsData[size];
    }
    if (data.variationsData && data.variationsData[size]) {
      return data.variationsData[size];
    }
    const fallbackVariant = allVariations.find(
      variant => (variant.size || `Variant ${variant.id}`) === size
    );
    return fallbackVariant ? buildVariantFromRaw(fallbackVariant, size) : {};
  };
  
  // Use actual product images per variation
  const productImages = {};
  sizeOptions.forEach((size) => {
    const variantData = getVariationData(size);
    productImages[size] = variantData.productImage
      || data.mainImage
      || data.images?.[0]
      || '/assets/product-placeholder.png';
  });
  
  const packagingData = getVariationData(activePackagingTab) || {};
  const notesVariationData = getVariationData(activeNotesTab) || {};
  const packagingFormula = packagingData.formula || {};

  return (
    <div 
      className={`${themeClasses.bg} border ${themeClasses.border} rounded-xl shadow-sm`}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b ${themeClasses.border}">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h2 className={`text-lg font-semibold ${themeClasses.text}`}>Essential Info</h2>
            <span className="px-2 py-0.5 rounded-md bg-green-500/10 text-green-600 text-xs font-medium flex items-center gap-1">
              <svg style={{ width: '0.875rem', height: '0.875rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Completed
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 pb-6" style={{ paddingTop: '1.5rem' }}>
          {/* Product Images */}
          <div className="mb-6">
            <h3 className={`text-sm font-semibold ${themeClasses.text} mb-3`}>
              Product Images {data.images && data.images.length > 0 && <span className="text-xs font-normal text-green-600">({data.images.length} images synced from Amazon)</span>}
            </h3>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              {sizeOptions.map((size) => (
                <div key={size} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    border: `2px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isDarkMode ? '#1F2937' : '#F9FAFB',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <img 
                      src={productImages[size]} 
                      alt={`${data.product} - ${size}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        padding: '4px'
                      }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                    <svg style={{ width: '2rem', height: '2rem', display: 'none' }} className={themeClasses.textSecondary} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {data.mainImage && (
                      <div style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: '#10B981',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <svg style={{ width: '12px', height: '12px' }} fill="none" stroke="white" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <span className={`text-xs font-medium ${themeClasses.text}`}>{size}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Amazon Synced Data */}
          {data.source === 'sp-api-detailed' && (
            <div className="mb-6" style={{
              padding: '1rem',
              backgroundColor: isDarkMode ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.05)',
              border: `1px solid ${isDarkMode ? 'rgba(34, 197, 94, 0.3)' : 'rgba(34, 197, 94, 0.2)'}`,
              borderRadius: '0.5rem'
            }}>
              <h3 className={`text-sm font-semibold ${themeClasses.text} mb-3 flex items-center gap-2`}>
                <svg style={{ width: '1.25rem', height: '1.25rem' }} className="text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Amazon Product Data (Synced)
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '0.75rem', fontSize: '0.875rem' }}>
                {data.description && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span className={themeClasses.textSecondary}>Description:</span>
                    <p className={themeClasses.text} style={{ marginTop: '0.25rem', lineHeight: '1.5' }}>{data.description}</p>
                  </div>
                )}
                {data.manufacturer && (
                  <div>
                    <span className={themeClasses.textSecondary}>Manufacturer:</span>
                    <p className={themeClasses.text}>{data.manufacturer}</p>
                  </div>
                )}
                {data.partNumber && (
                  <div>
                    <span className={themeClasses.textSecondary}>Part Number:</span>
                    <p className={themeClasses.text}>{data.partNumber}</p>
                  </div>
                )}
                {data.modelNumber && (
                  <div>
                    <span className={themeClasses.textSecondary}>Model Number:</span>
                    <p className={themeClasses.text}>{data.modelNumber}</p>
                  </div>
                )}
                {data.color && (
                  <div>
                    <span className={themeClasses.textSecondary}>Color:</span>
                    <p className={themeClasses.text}>{data.color}</p>
                  </div>
                )}
                {data.size && (
                  <div>
                    <span className={themeClasses.textSecondary}>Size:</span>
                    <p className={themeClasses.text}>{data.size}</p>
                  </div>
                )}
                {data.weight && (
                  <div>
                    <span className={themeClasses.textSecondary}>Weight:</span>
                    <p className={themeClasses.text}>{data.weight} oz</p>
                  </div>
                )}
                {data.itemDimensions && Object.keys(data.itemDimensions).length > 0 && (
                  <div>
                    <span className={themeClasses.textSecondary}>Dimensions (L×W×H):</span>
                    <p className={themeClasses.text}>
                      {data.itemDimensions.length?.value || 0}" × {data.itemDimensions.width?.value || 0}" × {data.itemDimensions.height?.value || 0}"
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 1000 Bananas Database (Imported) */}
          {data.source === '1000bananas-import' && (
            <div className="mb-6" style={{
              padding: '1rem',
              backgroundColor: isDarkMode ? 'rgba(168, 85, 247, 0.1)' : 'rgba(168, 85, 247, 0.05)',
              border: `1px solid ${isDarkMode ? 'rgba(168, 85, 247, 0.3)' : 'rgba(168, 85, 247, 0.2)'}`,
              borderRadius: '0.5rem'
            }}>
              <h3 className={`text-sm font-semibold ${themeClasses.text} mb-3 flex items-center gap-2`}>
                <svg style={{ width: '1.25rem', height: '1.25rem' }} className="text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                  <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                1000 Bananas Database (Imported)
                <span className="text-xs font-normal text-purple-600">({sizeOptions.length} variations)</span>
              </h3>
              
              {/* Variation Tabs */}
              {sizeOptions.length > 0 && (
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}` }}>
                  {sizeOptions.map((size) => (
                    <button
                      key={size}
                      onClick={() => setActivePackagingTab(size)}
                      className={`px-4 py-2 text-sm font-medium transition-colors ${
                        activePackagingTab === size
                          ? 'text-purple-600 border-b-2 border-purple-600'
                          : `${themeClasses.textSecondary} hover:${themeClasses.text}`
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              )}
              
              {(() => {
                const varData = getVariationData(activePackagingTab);
                return (
                  <>
              {/* Variation-Specific Info */}
              <div className="mb-4">
                <h4 className={`text-xs font-semibold ${themeClasses.text} mb-2 uppercase tracking-wide`}>Product Identifiers</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.875rem' }}>
                  {varData.childAsin && (
                    <div>
                      <span className={themeClasses.textSecondary}>Child ASIN:</span>
                      <p className={themeClasses.text} style={{ fontFamily: 'monospace' }}>{varData.childAsin}</p>
                    </div>
                  )}
                  {varData.parentAsin && (
                    <div>
                      <span className={themeClasses.textSecondary}>Parent ASIN:</span>
                      <p className={themeClasses.text} style={{ fontFamily: 'monospace' }}>{varData.parentAsin}</p>
                    </div>
                  )}
                  {varData.childSku && (
                    <div>
                      <span className={themeClasses.textSecondary}>Child SKU:</span>
                      <p className={themeClasses.text} style={{ fontFamily: 'monospace' }}>{varData.childSku}</p>
                    </div>
                  )}
                  {varData.parentSku && (
                    <div>
                      <span className={themeClasses.textSecondary}>Parent SKU:</span>
                      <p className={themeClasses.text} style={{ fontFamily: 'monospace' }}>{varData.parentSku}</p>
                    </div>
                  )}
                  {varData.upc && (
                    <div>
                      <span className={themeClasses.textSecondary}>UPC:</span>
                      <p className={themeClasses.text} style={{ fontFamily: 'monospace' }}>{varData.upc}</p>
                    </div>
                  )}
                  {varData.fullProductName && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <span className={themeClasses.textSecondary}>Full Product Name:</span>
                      <p className={themeClasses.text} style={{ marginTop: '0.25rem' }}>{varData.fullProductName}</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Formula Information */}
              {(data.formula || data.formulaName || data.guaranteedAnalysis) && (
                <div className="mb-4">
                  <h4 className={`text-xs font-semibold ${themeClasses.text} mb-2 uppercase tracking-wide`}>Formula</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.875rem' }}>
                    {data.formula && (
                      <div>
                        <span className={themeClasses.textSecondary}>Formula Code:</span>
                        <p className={themeClasses.text} style={{ fontFamily: 'monospace' }}>{data.formula}</p>
                      </div>
                    )}
                    {data.formulaName && (
                      <div>
                        <span className={themeClasses.textSecondary}>Formula Name:</span>
                        <p className={themeClasses.text}>{data.formulaName}</p>
                      </div>
                    )}
                    {data.npk && (
                      <div>
                        <span className={themeClasses.textSecondary}>NPK:</span>
                        <p className={themeClasses.text}>{data.npk}</p>
                      </div>
                    )}
                    {data.guaranteedAnalysis && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <span className={themeClasses.textSecondary}>Guaranteed Analysis:</span>
                        <p className={themeClasses.text} style={{ marginTop: '0.25rem', lineHeight: '1.5' }}>{data.guaranteedAnalysis}</p>
                      </div>
                    )}
                    {data.derivedFrom && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <span className={themeClasses.textSecondary}>Derived From:</span>
                        <p className={themeClasses.text} style={{ marginTop: '0.25rem', lineHeight: '1.5' }}>{data.derivedFrom}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Packaging Information */}
              {(varData.packagingName || varData.closureName || varData.caseSize) && (
                <div className="mb-4">
                  <h4 className={`text-xs font-semibold ${themeClasses.text} mb-2 uppercase tracking-wide`}>Packaging</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.875rem' }}>
                    {varData.packagingName && (
                      <div>
                        <span className={themeClasses.textSecondary}>Packaging:</span>
                        <p className={themeClasses.text}>{varData.packagingName}</p>
                      </div>
                    )}
                    {varData.closureName && (
                      <div>
                        <span className={themeClasses.textSecondary}>Closure:</span>
                        <p className={themeClasses.text}>{varData.closureName}</p>
                      </div>
                    )}
                    {varData.labelSize && (
                      <div>
                        <span className={themeClasses.textSecondary}>Label Size:</span>
                        <p className={themeClasses.text}>{varData.labelSize}</p>
                      </div>
                    )}
                    {varData.labelLocation && (
                      <div>
                        <span className={themeClasses.textSecondary}>Label Location:</span>
                        <p className={themeClasses.text}>{varData.labelLocation}</p>
                      </div>
                    )}
                    {varData.caseSize && (
                      <div>
                        <span className={themeClasses.textSecondary}>Case Size:</span>
                        <p className={themeClasses.text}>{varData.caseSize}</p>
                      </div>
                    )}
                    {varData.unitsPerCase && (
                      <div>
                        <span className={themeClasses.textSecondary}>Units per Case:</span>
                        <p className={themeClasses.text}>{varData.unitsPerCase}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Dimensions */}
              {(varData.length || varData.width || varData.height || varData.weight) && (
                <div className="mb-4">
                  <h4 className={`text-xs font-semibold ${themeClasses.text} mb-2 uppercase tracking-wide`}>Product Dimensions</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', fontSize: '0.875rem' }}>
                    {varData.length && (
                      <div>
                        <span className={themeClasses.textSecondary}>Length:</span>
                        <p className={themeClasses.text}>{varData.length}"</p>
                      </div>
                    )}
                    {varData.width && (
                      <div>
                        <span className={themeClasses.textSecondary}>Width:</span>
                        <p className={themeClasses.text}>{varData.width}"</p>
                      </div>
                    )}
                    {varData.height && (
                      <div>
                        <span className={themeClasses.textSecondary}>Height:</span>
                        <p className={themeClasses.text}>{varData.height}"</p>
                      </div>
                    )}
                    {varData.weight && (
                      <div>
                        <span className={themeClasses.textSecondary}>Weight:</span>
                        <p className={themeClasses.text}>{varData.weight} lbs</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Listing Information */}
              {(varData.price || varData.title || varData.bullets) && (
                <div className="mb-4">
                  <h4 className={`text-xs font-semibold ${themeClasses.text} mb-2 uppercase tracking-wide`}>Listing Information</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.875rem' }}>
                    {varData.price && (
                      <div>
                        <span className={themeClasses.textSecondary}>Price:</span>
                        <p className={themeClasses.text}>${varData.price}</p>
                      </div>
                    )}
                    {varData.title && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <span className={themeClasses.textSecondary}>Title:</span>
                        <p className={themeClasses.text} style={{ marginTop: '0.25rem', lineHeight: '1.5' }}>{varData.title}</p>
                      </div>
                    )}
                    {varData.bullets && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <span className={themeClasses.textSecondary}>Bullet Points:</span>
                        <p className={themeClasses.text} style={{ marginTop: '0.25rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{varData.bullets}</p>
                      </div>
                    )}
                    {varData.description && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <span className={themeClasses.textSecondary}>Description:</span>
                        <p className={themeClasses.text} style={{ marginTop: '0.25rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{varData.description}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Vine Information */}
              {(varData.vineLaunchDate || varData.vineUnitsEnrolled || varData.vineReviews) && (
                <div className="mb-4">
                  <h4 className={`text-xs font-semibold ${themeClasses.text} mb-2 uppercase tracking-wide`}>Vine Program</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.875rem' }}>
                    {varData.vineLaunchDate && (
                      <div>
                        <span className={themeClasses.textSecondary}>Launch Date:</span>
                        <p className={themeClasses.text}>{varData.vineLaunchDate}</p>
                      </div>
                    )}
                    {varData.vineUnitsEnrolled && (
                      <div>
                        <span className={themeClasses.textSecondary}>Units Enrolled:</span>
                        <p className={themeClasses.text}>{varData.vineUnitsEnrolled}</p>
                      </div>
                    )}
                    {varData.vineReviews && (
                      <div>
                        <span className={themeClasses.textSecondary}>Reviews:</span>
                        <p className={themeClasses.text}>{varData.vineReviews}</p>
                      </div>
                    )}
                    {varData.starRating && (
                      <div>
                        <span className={themeClasses.textSecondary}>Star Rating:</span>
                        <p className={themeClasses.text}>{varData.starRating} ⭐</p>
                      </div>
                    )}
                    {varData.vineNotes && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <span className={themeClasses.textSecondary}>Vine Notes:</span>
                        <p className={themeClasses.text} style={{ marginTop: '0.25rem', lineHeight: '1.5' }}>{varData.vineNotes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Marketing Information */}
              {(marketingCoreKeywords.length > 0 ||
                marketingCoreAsins.length > 0 ||
                marketingOtherAsins.length > 0 ||
                marketingOtherKeywords.length > 0) && (
                <div className="mb-4">
                  <h4 className={`text-xs font-semibold ${themeClasses.text} mb-2 uppercase tracking-wide`}>Marketing</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '0.75rem', fontSize: '0.875rem' }}>
                    {marketingCoreKeywords.length > 0 && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <span className={themeClasses.textSecondary}>Core Keywords:</span>
                        <p className={themeClasses.text} style={{ marginTop: '0.25rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                          {marketingCoreKeywords.join(', ')}
                        </p>
                      </div>
                    )}
                    {marketingCoreAsins.length > 0 && (
                      <div>
                        <span className={themeClasses.textSecondary}>Core Competitor ASINs:</span>
                        <p className={themeClasses.text} style={{ marginTop: '0.25rem', lineHeight: '1.5' }}>
                          {marketingCoreAsins.join(', ')}
                        </p>
                      </div>
                    )}
                    {marketingOtherAsins.length > 0 && (
                      <div>
                        <span className={themeClasses.textSecondary}>Other Competitor ASINs:</span>
                        <p className={themeClasses.text} style={{ marginTop: '0.25rem', lineHeight: '1.5' }}>
                          {marketingOtherAsins.join(', ')}
                        </p>
                      </div>
                    )}
                    {marketingOtherKeywords.length > 0 && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <span className={themeClasses.textSecondary}>Other Keywords:</span>
                        <p className={themeClasses.text} style={{ marginTop: '0.25rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                          {marketingOtherKeywords.join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Additional Info */}
              {(varData.notes || data.dateAdded || varData.unitsSold30Days) && (
                <div>
                  <h4 className={`text-xs font-semibold ${themeClasses.text} mb-2 uppercase tracking-wide`}>Additional Information</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.875rem' }}>
                    {data.dateAdded && (
                      <div>
                        <span className={themeClasses.textSecondary}>Date Added:</span>
                        <p className={themeClasses.text}>{data.dateAdded}</p>
                      </div>
                    )}
                    {varData.unitsSold30Days && (
                      <div>
                        <span className={themeClasses.textSecondary}>Units Sold (30 Days):</span>
                        <p className={themeClasses.text}>{varData.unitsSold30Days}</p>
                      </div>
                    )}
                    {varData.notes && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <span className={themeClasses.textSecondary}>Notes:</span>
                        <p className={themeClasses.text} style={{ marginTop: '0.25rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{varData.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              </>
                );
              })()}
            </div>
          )}

          {/* Core Product Info */}
          <div className="mb-6">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 className={`text-sm font-semibold ${themeClasses.text}`}>Core Product Info</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {isEditing && (
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="text-gray-500 hover:text-gray-700 text-sm font-medium flex items-center gap-1"
                  >
                    Cancel
                  </button>
                )}
                <button 
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-blue-500 hover:text-blue-600 text-sm font-medium flex items-center gap-1"
                >
                  <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  {isEditing ? 'Save' : 'Edit Info'}
                </button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>Date Added</label>
                {isEditing ? (
                  <input 
                    type="text" 
                    defaultValue={data.dateAdded}
                    className={`text-sm ${themeClasses.text} ${themeClasses.inputBg} border ${themeClasses.border} rounded px-2 py-1 w-full`}
                  />
                ) : (
                  <div className={`text-sm ${themeClasses.text}`}>{data.dateAdded}</div>
                )}
              </div>
              <div>
                <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>Marketplace</label>
                {isEditing ? (
                  <input 
                    type="text" 
                    defaultValue={data.marketplace}
                    className={`text-sm ${themeClasses.text} ${themeClasses.inputBg} border ${themeClasses.border} rounded px-2 py-1 w-full`}
                  />
                ) : (
                  <div className={`text-sm ${themeClasses.text}`}>{data.marketplace}</div>
                )}
              </div>
              <div>
                <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>Sales Account</label>
                {isEditing ? (
                  <input 
                    type="text" 
                    defaultValue={data.salesAccount}
                    className={`text-sm ${themeClasses.text} ${themeClasses.inputBg} border ${themeClasses.border} rounded px-2 py-1 w-full`}
                  />
                ) : (
                  <div className={`text-sm ${themeClasses.text}`}>{data.salesAccount}</div>
                )}
              </div>
              <div>
                <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>Country</label>
                {isEditing ? (
                  <input 
                    type="text" 
                    defaultValue={data.country}
                    className={`text-sm ${themeClasses.text} ${themeClasses.inputBg} border ${themeClasses.border} rounded px-2 py-1 w-full`}
                  />
                ) : (
                  <div className={`text-sm ${themeClasses.text}`}>{data.country}</div>
                )}
              </div>
              <div>
                <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>Brand Name</label>
                {isEditing ? (
                  <input 
                    type="text" 
                    defaultValue={data.brandFull}
                    className={`text-sm ${themeClasses.text} ${themeClasses.inputBg} border ${themeClasses.border} rounded px-2 py-1 w-full`}
                  />
                ) : (
                  <div className={`text-sm ${themeClasses.text}`}>{data.brandFull}</div>
                )}
              </div>
              <div>
                <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>Product Name</label>
                {isEditing ? (
                  <input 
                    type="text" 
                    defaultValue={data.product}
                    className={`text-sm ${themeClasses.text} ${themeClasses.inputBg} border ${themeClasses.border} rounded px-2 py-1 w-full`}
                  />
                ) : (
                  <div className={`text-sm ${themeClasses.text}`}>{data.product}</div>
                )}
              </div>
              <div>
                <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>Sizes</label>
                {isEditing ? (
                  <input 
                    type="text" 
                    defaultValue={data.sizes}
                    className={`text-sm ${themeClasses.text} ${themeClasses.inputBg} border ${themeClasses.border} rounded px-2 py-1 w-full`}
                  />
                ) : (
                  <div className={`text-sm ${themeClasses.text}`}>{data.sizes}</div>
                )}
              </div>
              <div>
                <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>Type</label>
                {isEditing ? (
                  <input 
                    type="text" 
                    defaultValue={data.type}
                    className={`text-sm ${themeClasses.text} ${themeClasses.inputBg} border ${themeClasses.border} rounded px-2 py-1 w-full`}
                  />
                ) : (
                  <div className={`text-sm ${themeClasses.text}`}>{data.type}</div>
                )}
              </div>
            </div>
          </div>

          {/* Packaging */}
          <div className="mb-6">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 className={`text-sm font-semibold ${themeClasses.text}`}>Packaging</h3>
              <button className="text-blue-500 hover:text-blue-600 text-sm font-medium flex items-center gap-1">
                <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Edit Info
              </button>
            </div>
            
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}` }}>
              {sizeOptions.map((size) => (
                <button
                  key={size}
                  onClick={() => setActivePackagingTab(size)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activePackagingTab === size
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : `${themeClasses.textSecondary} hover:${themeClasses.text}`
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>

            {/* Packaging Details */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              <div>
                <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>Packaging Name</label>
                <div className={`text-sm ${themeClasses.text}`}>{packagingData.packagingName || data.packaging_name || 'N/A'}</div>
              </div>
              <div>
                <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>Closure Name</label>
                <div className={`text-sm ${themeClasses.text}`}>{packagingData.closureName || data.closure_name || 'N/A'}</div>
              </div>
              <div>
                <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>Label Size</label>
                <div className={`text-sm ${themeClasses.text}`}>{packagingData.labelSize || data.label_size || 'N/A'}</div>
              </div>
              <div>
                <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>Label Location</label>
                <div className={`text-sm ${themeClasses.text}`}>{packagingData.labelLocation || data.label_location || 'N/A'}</div>
              </div>
              <div>
                <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>Case Size</label>
                <div className={`text-sm ${themeClasses.text}`}>{packagingData.caseSize || data.case_size || 'N/A'}</div>
              </div>
              <div>
                <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>Units per Case</label>
                <div className={`text-sm ${themeClasses.text}`}>{packagingData.unitsPerCase || data.units_per_case || 'N/A'}</div>
              </div>
              <div>
                <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>Filter</label>
                <div className={`text-sm ${themeClasses.text}`}>{packagingData.filter || data.filter || 'N/A'}</div>
              </div>
              <div>
                <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>UPC Code</label>
                <div className={`text-sm ${themeClasses.text}`}>{packagingData.upc || data.upc || 'N/A'}</div>
              </div>
              <div>
                <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>UPC comm file</label>
                {packagingData.raw?.upc_image_file ? (
                  <a href={packagingData.raw.upc_image_file} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:text-blue-600">
                    View UPC Asset
                  </a>
                ) : (
                  <div className={`text-sm ${themeClasses.text}`}>N/A</div>
                )}
              </div>
              <div>
                <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>Parent ASIN</label>
                <div className={`text-sm ${themeClasses.text}`}>{packagingData.parentAsin || data.parent_asin || 'N/A'}</div>
              </div>
              <div>
                <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>Child ASIN</label>
                <div className={`text-sm ${themeClasses.text}`}>{packagingData.childAsin || data.child_asin || 'N/A'}</div>
              </div>
              <div>
                <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>PARENT SKU</label>
                <div className={`text-sm ${themeClasses.text}`}>{packagingData.parentSku || data.parent_sku_final || data.parent_sku || 'N/A'}</div>
              </div>
              <div>
                <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>Child SKU</label>
                <div className={`text-sm ${themeClasses.text}`}>{packagingData.childSku || data.child_sku_final || data.child_sku || 'N/A'}</div>
              </div>
            </div>
          </div>

          {/* Formula */}
          <div className="mb-6">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 className={`text-sm font-semibold ${themeClasses.text}`}>Formula</h3>
              <button className="text-blue-500 hover:text-blue-600 text-sm font-medium flex items-center gap-1">
                <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Edit Info
              </button>
            </div>
            <div className={`${themeClasses.inputBg} rounded-lg p-4`}>
              {packagingFormula.guaranteedAnalysis || packagingFormula.npk || data.formulaName ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  {(data.formulaName || data.formula) && (
                    <div>
                      <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>Formula Name</label>
                      <div className={`text-sm ${themeClasses.text}`}>{data.formulaName || data.formula}</div>
                    </div>
                  )}
                  {(packagingFormula.npk || data.formula_npk) && (
                    <div>
                      <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>NPK</label>
                      <div className={`text-sm ${themeClasses.text}`}>{packagingFormula.npk || data.formula_npk}</div>
                    </div>
                  )}
                  {(packagingFormula.guaranteedAnalysis || data.formula_guaranteed_analysis) && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>Guaranteed Analysis</label>
                      <div className={`text-sm ${themeClasses.text}`} style={{ whiteSpace: 'pre-wrap' }}>
                        {packagingFormula.guaranteedAnalysis || data.formula_guaranteed_analysis}
                      </div>
                    </div>
                  )}
                  {(packagingFormula.derivedFrom || data.formula_derived_from) && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>Derived From</label>
                      <div className={`text-sm ${themeClasses.text}`} style={{ whiteSpace: 'pre-wrap' }}>
                        {packagingFormula.derivedFrom || data.formula_derived_from}
                      </div>
                    </div>
                  )}
                  {(packagingFormula.storageWarranty || data.formula_storage_warranty) && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>Storage / Warranty</label>
                      <div className={`text-sm ${themeClasses.text}`} style={{ whiteSpace: 'pre-wrap' }}>
                        {packagingFormula.storageWarranty || data.formula_storage_warranty}
                      </div>
                    </div>
                  )}
                  {(packagingData.msds || data.formula_msds) && (
                    <div>
                      <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>MSDS</label>
                      <a 
                        href={packagingData.msds || data.formula_msds} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-500 hover:text-blue-600"
                      >
                        View MSDS
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className={`text-sm ${themeClasses.textSecondary}`}>No formula details available for this variation yet.</div>
              )}
            </div>
          </div>

          {/* Marketing */}
          <div className="mb-6">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 className={`text-sm font-semibold ${themeClasses.text}`}>Marketing</h3>
              <button className="text-blue-500 hover:text-blue-600 text-sm font-medium flex items-center gap-1">
                <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Edit Info
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              <div>
                <label className={`text-xs ${themeClasses.textSecondary} block mb-2`}>
                  Core Competitor ASINs ({marketingCoreAsins.length})
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {marketingCoreAsins.length > 0 ? (
                    marketingCoreAsins.map((asin, idx) => (
                      <div key={idx} className={`${themeClasses.inputBg} rounded px-3 py-2 text-sm ${themeClasses.text}`}>
                        {asin}
                      </div>
                    ))
                  ) : (
                    <div className={`${themeClasses.inputBg} rounded px-3 py-2 text-sm ${themeClasses.textSecondary}`}>
                      No core competitor ASINs yet
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className={`text-xs ${themeClasses.textSecondary} block mb-2`}>
                  Other Competitor ASINs ({marketingOtherAsins.length})
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {marketingOtherAsins.length > 0 ? (
                    marketingOtherAsins.map((asin, idx) => (
                      <div key={idx} className={`${themeClasses.inputBg} rounded px-3 py-2 text-sm ${themeClasses.text}`}>
                        {asin}
                      </div>
                    ))
                  ) : (
                    <div className={`${themeClasses.inputBg} rounded px-3 py-2 text-sm ${themeClasses.textSecondary}`}>
                      No other competitor ASINs yet
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className={`text-xs ${themeClasses.textSecondary} block mb-2`}>Competitor Keywords</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {marketingCoreKeywords.length > 0 ? (
                    marketingCoreKeywords.map((keyword, idx) => (
                      <div key={idx} className={`${themeClasses.inputBg} rounded px-3 py-2 text-sm ${themeClasses.text}`}>
                        {keyword}
                      </div>
                    ))
                  ) : (
                    <div className={`${themeClasses.inputBg} rounded px-3 py-2 text-sm ${themeClasses.textSecondary}`}>
                      No keywords yet
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className={`text-xs ${themeClasses.textSecondary} block mb-2`}>Other Keywords</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {marketingOtherKeywords.length > 0 ? (
                    marketingOtherKeywords.map((keyword, idx) => (
                      <div key={idx} className={`${themeClasses.inputBg} rounded px-3 py-2 text-sm ${themeClasses.text}`}>
                        {keyword}
                      </div>
                    ))
                  ) : (
                    <div className={`${themeClasses.inputBg} rounded px-3 py-2 text-sm ${themeClasses.textSecondary}`}>
                      No keywords yet
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* All Variations Table */}
          {data?.allVariations && data.allVariations.length > 1 && (
            <div style={{ marginBottom: '2rem' }}>
              <h3 className={`text-sm font-semibold ${themeClasses.text} mb-3`}>
                All Variants ({data.allVariations.length})
              </h3>
              <div className={`${themeClasses.inputBg} rounded-lg overflow-hidden`}>
                <table style={{ width: '100%' }}>
                  <thead className={isDarkMode ? 'bg-[#2C3544]' : 'bg-gray-800'}>
                    <tr>
                      <th className="text-left text-xs font-bold text-white uppercase tracking-wider px-4 py-2">Size</th>
                      <th className="text-left text-xs font-bold text-white uppercase tracking-wider px-4 py-2">Formula</th>
                      <th className="text-left text-xs font-bold text-white uppercase tracking-wider px-4 py-2">ASIN</th>
                      <th className="text-left text-xs font-bold text-white uppercase tracking-wider px-4 py-2">SKU</th>
                      <th className="text-left text-xs font-bold text-white uppercase tracking-wider px-4 py-2">UPC</th>
                    </tr>
                  </thead>
                  <tbody className={isDarkMode ? 'divide-y divide-gray-700' : 'divide-y divide-gray-200'}>
                    {data.allVariations.map((variant, index) => (
                      <tr key={index} className={isDarkMode ? 'hover:bg-dark-bg-tertiary' : 'hover:bg-gray-50'}>
                        <td className={`px-4 py-3 text-sm font-medium ${themeClasses.text}`}>{variant.size || 'N/A'}</td>
                        <td className={`px-4 py-3 text-sm ${themeClasses.text}`}>{variant.formula_name || 'N/A'}</td>
                        <td className={`px-4 py-3 text-sm ${themeClasses.text}`}>{variant.child_asin || 'N/A'}</td>
                        <td className={`px-4 py-3 text-sm ${themeClasses.text}`}>{variant.child_sku_final || 'N/A'}</td>
                        <td className={`px-4 py-3 text-sm ${themeClasses.text}`}>{variant.upc || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 className={`text-sm font-semibold ${themeClasses.text}`}>Notes</h3>
              <button className="text-blue-500 hover:text-blue-600 text-sm font-medium flex items-center gap-1">
                <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Edit Notes
              </button>
            </div>
            
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}` }}>
              {sizeOptions.map((size) => (
                <button
                  key={size}
                  onClick={() => setActiveNotesTab(size)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeNotesTab === size
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : `${themeClasses.textSecondary} hover:${themeClasses.text}`
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>

            {/* Notes Content */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {notesVariationData.notes && Object.keys(notesVariationData.notes).length > 0 ? (
                Object.entries(notesVariationData.notes).map(([key, value]) => (
                  <div key={key} className={`${themeClasses.inputBg} rounded-lg p-4`}>
                    <div className={`text-xs ${themeClasses.textSecondary} mb-2`}>
                      {key}
                    </div>
                    <div className={`text-sm ${themeClasses.text}`}>
                      {value}
                    </div>
                  </div>
                ))
              ) : (
                <div className={`${themeClasses.inputBg} rounded-lg p-4`}>
                  <div className={`text-sm ${themeClasses.textSecondary}`}>
                    No notes captured for this variation yet.
                  </div>
                </div>
              )}
            </div>
          </div>
      </div>
    </div>
  );
};

export default EssentialInfo;

