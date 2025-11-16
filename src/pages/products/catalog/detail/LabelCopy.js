import React, { useState } from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const LabelCopy = ({ data }) => {
  const { isDarkMode } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('8oz');

  const themeClasses = {
    bg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    inputBg: isDarkMode ? 'bg-dark-bg-tertiary' : 'bg-gray-50',
  };

  const variations = data.variations || ['8oz', 'Quart', 'Gallon'];

  return (
    <div className={`${themeClasses.bg} rounded-xl border ${themeClasses.border} shadow-sm`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:opacity-80 transition-opacity"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h2 className={`text-lg font-semibold ${themeClasses.text}`}>Label Copy</h2>
          <span className="px-2 py-0.5 rounded-md bg-green-500/10 text-green-600 text-xs font-medium flex items-center gap-1">
            <svg style={{ width: '0.875rem', height: '0.875rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Completed
          </span>
        </div>
        <svg
          className={`${themeClasses.text} transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          style={{ width: '1.25rem', height: '1.25rem' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className={`px-6 pb-6 border-t ${themeClasses.border}`} style={{ paddingTop: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 className={`text-sm font-semibold ${themeClasses.text}`}>Asset Requests</h3>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}` }}>
            {variations.map((size) => (
              <button
                key={size}
                onClick={() => setActiveTab(size)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === size
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : `${themeClasses.textSecondary} hover:${themeClasses.text}`
                }`}
              >
                {size}
              </button>
            ))}
          </div>

          {/* Label Sections */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {['Left', 'Center', 'Right'].map((position, index) => (
              <div key={position}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: position === 'Left' ? '#EF4444' : position === 'Center' ? '#F59E0B' : '#10B981',
                  }} />
                  <h4 className={`text-sm font-semibold ${themeClasses.text}`}>{position}</h4>
                  {index === 2 && (
                    <button className="ml-auto text-blue-500 hover:text-blue-600 text-sm font-medium">Edit Info</button>
                  )}
                </div>
                <div className={`${themeClasses.inputBg} rounded-lg p-4`}>
                  {position === 'Left' && (
                    <div className={`text-sm ${themeClasses.text}`}>
                      Request edit by Christian R. at 1:15pm
                    </div>
                  )}
                  {position === 'Center' && (
                    <div className={`text-sm ${themeClasses.text}`}>
                      Recent edit by Christian R. at 1:10pm
                      <div className={`mt-2 ${themeClasses.textSecondary}`}>
                        FULL SPECTRUM NPK + MICROS
                      </div>
                    </div>
                  )}
                  {position === 'Right' && (
                    <div className={`text-sm ${themeClasses.text} space-y-2`}>
                      <div><strong>Right Side Benefit Graphic:</strong></div>
                      <div>FULL SPECTRUM NPK + MICROS</div>
                      <div><strong>Ingredient Statement:</strong></div>
                      <div>2.1% Calcium and 0.71% Magnesium with full micronutrients!</div>
                      <div><strong>Guaranteed Analysis:</strong></div>
                      <div>Total Nitrogen (N) 3.8%, Available Phosphate (P2O5) 3.0%, Soluble Potash (K2O) 4.3%...</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LabelCopy;


