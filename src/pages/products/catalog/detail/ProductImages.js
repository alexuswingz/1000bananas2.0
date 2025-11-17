import React from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const ProductImages = ({ data }) => {
  const { isDarkMode } = useTheme();

  const themeClasses = {
    bg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    inputBg: isDarkMode ? 'bg-dark-bg-tertiary' : 'bg-gray-50',
  };

  // Check if product images are available
  const hasImages = !!(data?.images || data?.product_images || data?.mainImage);
  const images = data?.images || data?.product_images || (data?.mainImage ? [data.mainImage] : []);

  return (
    <div className={`${themeClasses.bg} rounded-xl border ${themeClasses.border} shadow-sm`}>
      <div className="px-6 py-4 flex items-center justify-between">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h2 className={`text-lg font-semibold ${themeClasses.text}`}>Product Images</h2>
          {hasImages ? (
            <>
              <span className="px-2 py-0.5 rounded-md bg-green-500/10 text-green-600 text-xs font-medium flex items-center gap-1">
                <svg style={{ width: '0.875rem', height: '0.875rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Completed
              </span>
              <span className={`text-sm ${themeClasses.textSecondary}`}>{images.length} Image{images.length !== 1 ? 's' : ''}</span>
            </>
          ) : (
            <span className="px-2 py-0.5 rounded-md bg-gray-500/10 text-gray-600 text-xs font-medium">
              No Content
            </span>
          )}
        </div>
      </div>

      <div className="px-6 pb-6" style={{ paddingTop: '1.5rem' }}>
        {hasImages ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1.5rem' }}>
            {images.map((image, index) => (
              <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{
                  aspectRatio: '1/1',
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
                    src={typeof image === 'string' ? image : image?.url} 
                    alt={`Product ${index + 1}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      padding: '8px'
                    }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <svg style={{ width: '2.5rem', height: '2.5rem', display: 'none' }} className={themeClasses.textSecondary} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className={`text-xs ${themeClasses.textSecondary} text-center`}>Image {index + 1}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className={`${themeClasses.inputBg} rounded-lg p-8 text-center`}>
            <svg style={{ width: '4rem', height: '4rem', margin: '0 auto 1rem' }} className={themeClasses.textSecondary} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className={`text-sm ${themeClasses.text} font-medium mb-2`}>No Product Images Yet</p>
            <p className={`text-xs ${themeClasses.textSecondary}`}>Upload product images to showcase your listing</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductImages;
