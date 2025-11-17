import React, { useState } from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const Slides = ({ data }) => {
  const { isDarkMode } = useTheme();

  const themeClasses = {
    bg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    inputBg: isDarkMode ? 'bg-dark-bg-tertiary' : 'bg-gray-50',
  };

  const variations = data?.variations || ['Default'];
  const variationType = data?.variationType || 'variation';
  
  // Six-sided images from API
  const sixSidedImages = [
    { label: 'Product Image', url: data?.product_image_url, key: 'product' },
    { label: 'Front', url: data?.six_sided_image_front, key: 'front' },
    { label: 'Back', url: data?.six_sided_image_back, key: 'back' },
    { label: 'Left', url: data?.six_sided_image_left, key: 'left' },
    { label: 'Right', url: data?.six_sided_image_right, key: 'right' },
    { label: 'Top', url: data?.six_sided_image_top, key: 'top' },
    { label: 'Bottom', url: data?.six_sided_image_bottom, key: 'bottom' }
  ].filter(img => img.url); // Only show images that have URLs

  return (
    <div className={`${themeClasses.bg} rounded-xl border ${themeClasses.border} shadow-sm`}>
      {/* Header */}
      <div className={`px-6 py-4 border-b ${themeClasses.border}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h2 className={`text-lg font-semibold ${themeClasses.text}`}>Slides</h2>
          <span className="px-2 py-0.5 rounded-md bg-green-500/10 text-green-600 text-xs font-medium flex items-center gap-1">
            <svg style={{ width: '0.875rem', height: '0.875rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Completed
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 pb-6" style={{ paddingTop: '1.5rem' }}>
        {/* Slide Assets */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 className={`text-sm font-semibold ${themeClasses.text}`}>Presentation Slides</h3>
            <button className="text-blue-500 hover:text-blue-600 text-sm font-medium flex items-center gap-1">
              <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Upload Slides
            </button>
          </div>

          {sixSidedImages.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' }}>
              {sixSidedImages.map((image) => (
                <div key={image.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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
                      src={image.url} 
                      alt={image.label}
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
                    <div style={{ 
                      width: '100%', 
                      height: '100%', 
                      display: 'none', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}>
                      <svg style={{ width: '3rem', height: '3rem' }} className={themeClasses.textSecondary} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className={`text-xs ${themeClasses.textSecondary}`}>Image unavailable</span>
                    </div>
                    {image.url && (
                      <div style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: '#10B981',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <svg style={{ width: '14px', height: '14px' }} fill="none" stroke="white" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <span className={`text-sm font-medium ${themeClasses.text}`}>{image.label}</span>
                    <span className={`text-xs ${themeClasses.textSecondary}`}>{data?.brand || ''} {data?.product || ''}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <a 
                      href={image.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex-1 text-center text-xs px-3 py-1.5 border border-blue-500 text-blue-500 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    >
                      View
                    </a>
                    <button className={`flex-1 text-xs px-3 py-1.5 border ${themeClasses.border} ${themeClasses.text} rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors`}>
                      Replace
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={`${themeClasses.inputBg} rounded-lg p-8 text-center`}>
              <svg style={{ width: '4rem', height: '4rem', margin: '0 auto 1rem' }} className={themeClasses.textSecondary} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className={`text-sm ${themeClasses.textSecondary}`}>No slides available yet</p>
            </div>
          )}
        </div>

        {/* Notes */}
        <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)', borderRadius: '8px', border: `1px solid ${isDarkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.2)'}` }}>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <svg style={{ width: '1.25rem', height: '1.25rem', color: '#3B82F6', flexShrink: 0 }} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#3B82F6', marginBottom: '0.25rem' }}>
                Slide Guidelines
              </p>
              <p style={{ fontSize: '0.8125rem', color: isDarkMode ? '#93C5FD' : '#2563EB', lineHeight: '1.5' }}>
                Presentation slides should be in 16:9 aspect ratio, PowerPoint or PDF format. Include product benefits, usage instructions, and key features.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Slides;

