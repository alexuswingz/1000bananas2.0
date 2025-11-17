import React from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const Label = ({ data }) => {
  const { isDarkMode } = useTheme();

  const themeClasses = {
    bg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    inputBg: isDarkMode ? 'bg-dark-bg-tertiary' : 'bg-gray-50',
  };

  const hasContent = !!(data?.label_image || data?.labelImage);

  return (
    <div className={`${themeClasses.bg} rounded-xl border ${themeClasses.border} shadow-sm`}>
      <div className={`px-6 py-4 border-b ${themeClasses.border}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h2 className={`text-lg font-semibold ${themeClasses.text}`}>Label</h2>
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
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <img 
              src={data?.label_image || data?.labelImage} 
              alt="Product Label"
              style={{
                maxWidth: '100%',
                maxHeight: '600px',
                borderRadius: '8px',
                border: `2px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`
              }}
            />
          </div>
        ) : (
          <div className={`${themeClasses.inputBg} rounded-lg p-8 text-center`}>
            <svg style={{ width: '4rem', height: '4rem', margin: '0 auto 1rem' }} className={themeClasses.textSecondary} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <p className={`text-sm ${themeClasses.text} font-medium mb-2`}>No Label Design Yet</p>
            <p className={`text-xs ${themeClasses.textSecondary}`}>Upload a label design for this product</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Label;
