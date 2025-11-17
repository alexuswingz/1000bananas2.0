import React, { useState } from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const LabelCopy = ({ data }) => {
  const { isDarkMode } = useTheme();

  const themeClasses = {
    bg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    inputBg: isDarkMode ? 'bg-dark-bg-tertiary' : 'bg-gray-50',
  };

  // Check for label copy data from various sources
  const hasContent = !!(
    data?.product_title || 
    data?.tps_directions || 
    data?.tps_growing_recommendations ||
    data?.center_benefit_statement
  );

  return (
    <div className={`${themeClasses.bg} rounded-xl border ${themeClasses.border} shadow-sm`}>
      <div className={`px-6 py-4 border-b ${themeClasses.border}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h2 className={`text-lg font-semibold ${themeClasses.text}`}>Label Copy</h2>
          {hasContent ? (
            <span className="px-2 py-0.5 rounded-md bg-green-500/10 text-green-600 text-xs font-medium flex items-center gap-1">
              <svg style={{ width: '0.875rem', height: '0.875rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Completed
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-md bg-gray-500/10 text-gray-600 text-xs font-medium">
              No Content
            </span>
          )}
        </div>
      </div>

      <div className="px-6 pb-6" style={{ paddingTop: '1.5rem' }}>
        {hasContent ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {data?.product_title && (
              <div>
                <label className={`text-xs ${themeClasses.textSecondary} block mb-2`}>Product Title</label>
                <div className={`${themeClasses.inputBg} rounded-lg p-3 text-sm ${themeClasses.text}`}>
                  {data.product_title}
                </div>
              </div>
            )}
            {data?.center_benefit_statement && (
              <div style={{ gridColumn: '1 / -1' }}>
                <label className={`text-xs ${themeClasses.textSecondary} block mb-2`}>Center Benefit Statement</label>
                <div className={`${themeClasses.inputBg} rounded-lg p-3 text-sm ${themeClasses.text}`}>
                  {data.center_benefit_statement}
                </div>
              </div>
            )}
            {data?.tps_directions && (
              <div style={{ gridColumn: '1 / -1' }}>
                <label className={`text-xs ${themeClasses.textSecondary} block mb-2`}>Directions</label>
                <div className={`${themeClasses.inputBg} rounded-lg p-3 text-sm ${themeClasses.text} whitespace-pre-wrap`}>
                  {data.tps_directions}
                </div>
              </div>
            )}
            {data?.tps_growing_recommendations && (
              <div style={{ gridColumn: '1 / -1' }}>
                <label className={`text-xs ${themeClasses.textSecondary} block mb-2`}>Growing Recommendations</label>
                <div className={`${themeClasses.inputBg} rounded-lg p-3 text-sm ${themeClasses.text} whitespace-pre-wrap`}>
                  {data.tps_growing_recommendations}
                </div>
              </div>
            )}
            {data?.tps_left_side_benefit_graphic && (
              <div>
                <label className={`text-xs ${themeClasses.textSecondary} block mb-2`}>Left Side Benefit</label>
                <div className={`${themeClasses.inputBg} rounded-lg p-3 text-sm ${themeClasses.text}`}>
                  {data.tps_left_side_benefit_graphic}
                </div>
              </div>
            )}
            {data?.right_side_benefit_graphic && (
              <div>
                <label className={`text-xs ${themeClasses.textSecondary} block mb-2`}>Right Side Benefit</label>
                <div className={`${themeClasses.inputBg} rounded-lg p-3 text-sm ${themeClasses.text}`}>
                  {data.right_side_benefit_graphic}
                </div>
              </div>
            )}
            {data?.qr_code_section && (
              <div>
                <label className={`text-xs ${themeClasses.textSecondary} block mb-2`}>QR Code Section</label>
                <div className={`${themeClasses.inputBg} rounded-lg p-3 text-sm ${themeClasses.text}`}>
                  {data.qr_code_section}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={`${themeClasses.inputBg} rounded-lg p-8 text-center`}>
            <svg style={{ width: '4rem', height: '4rem', margin: '0 auto 1rem' }} className={themeClasses.textSecondary} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className={`text-sm ${themeClasses.text} font-medium mb-2`}>No Label Copy Yet</p>
            <p className={`text-xs ${themeClasses.textSecondary}`}>Add label copy content for this product</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LabelCopy;
