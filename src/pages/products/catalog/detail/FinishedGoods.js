import React, { useState } from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const FinishedGoods = ({ data }) => {
  const { isDarkMode } = useTheme();
  const [isEditing, setIsEditing] = useState(false);

  const themeClasses = {
    bg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    inputBg: isDarkMode ? 'bg-dark-bg-tertiary' : 'bg-gray-50',
  };

  return (
    <div className={`${themeClasses.bg} rounded-xl border ${themeClasses.border} shadow-sm`}>
      {/* Header */}
      <div className={`px-6 py-4 border-b ${themeClasses.border}`}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h2 className={`text-lg font-semibold ${themeClasses.text}`}>Finished Goods Specs</h2>
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
        {/* Specifications Grid */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 className={`text-sm font-semibold ${themeClasses.text}`}>Product Specifications</h3>
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className="text-blue-500 hover:text-blue-600 text-sm font-medium flex items-center gap-1"
          >
            <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            {isEditing ? 'Save' : 'Edit Specs'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div>
            <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>Product Weight</label>
            {isEditing ? (
              <input 
                type="text" 
                defaultValue="8 fl oz (237 ml)"
                className={`text-sm ${themeClasses.text} ${themeClasses.inputBg} border ${themeClasses.border} rounded px-2 py-1 w-full`}
              />
            ) : (
              <div className={`text-sm ${themeClasses.text}`}>8 fl oz (237 ml)</div>
            )}
          </div>
          <div>
            <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>Package Dimensions</label>
            {isEditing ? (
              <input 
                type="text" 
                defaultValue="6.5 x 2.5 x 2.5 inches"
                className={`text-sm ${themeClasses.text} ${themeClasses.inputBg} border ${themeClasses.border} rounded px-2 py-1 w-full`}
              />
            ) : (
              <div className={`text-sm ${themeClasses.text}`}>6.5 x 2.5 x 2.5 inches</div>
            )}
          </div>
          <div>
            <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>Item Weight</label>
            {isEditing ? (
              <input 
                type="text" 
                defaultValue="9.6 ounces"
                className={`text-sm ${themeClasses.text} ${themeClasses.inputBg} border ${themeClasses.border} rounded px-2 py-1 w-full`}
              />
            ) : (
              <div className={`text-sm ${themeClasses.text}`}>9.6 ounces</div>
            )}
          </div>
          <div>
            <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>UPC</label>
            {isEditing ? (
              <input 
                type="text" 
                defaultValue="810012345678"
                className={`text-sm ${themeClasses.text} ${themeClasses.inputBg} border ${themeClasses.border} rounded px-2 py-1 w-full`}
              />
            ) : (
              <div className={`text-sm ${themeClasses.text}`}>810012345678</div>
            )}
          </div>
          <div>
            <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>ASIN</label>
            {isEditing ? (
              <input 
                type="text" 
                defaultValue="B08XXXXXXX"
                className={`text-sm ${themeClasses.text} ${themeClasses.inputBg} border ${themeClasses.border} rounded px-2 py-1 w-full`}
              />
            ) : (
              <div className={`text-sm ${themeClasses.text}`}>B08XXXXXXX</div>
            )}
          </div>
          <div>
            <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>SKU</label>
            {isEditing ? (
              <input 
                type="text" 
                defaultValue="TPS-CTF-8OZ"
                className={`text-sm ${themeClasses.text} ${themeClasses.inputBg} border ${themeClasses.border} rounded px-2 py-1 w-full`}
              />
            ) : (
              <div className={`text-sm ${themeClasses.text}`}>TPS-CTF-8OZ</div>
            )}
          </div>
        </div>

        {/* Material & Compliance */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 className={`text-sm font-semibold ${themeClasses.text} mb-3`}>Material & Compliance</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            <div>
              <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>Material Type</label>
              {isEditing ? (
                <input 
                  type="text" 
                  defaultValue="HDPE Plastic"
                  className={`text-sm ${themeClasses.text} ${themeClasses.inputBg} border ${themeClasses.border} rounded px-2 py-1 w-full`}
                />
              ) : (
                <div className={`text-sm ${themeClasses.text}`}>HDPE Plastic</div>
              )}
            </div>
            <div>
              <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>Certifications</label>
              {isEditing ? (
                <input 
                  type="text" 
                  defaultValue="OMRI Listed, USDA Organic"
                  className={`text-sm ${themeClasses.text} ${themeClasses.inputBg} border ${themeClasses.border} rounded px-2 py-1 w-full`}
                />
              ) : (
                <div className={`text-sm ${themeClasses.text}`}>OMRI Listed, USDA Organic</div>
              )}
            </div>
            <div>
              <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>Shelf Life</label>
              {isEditing ? (
                <input 
                  type="text" 
                  defaultValue="2 years"
                  className={`text-sm ${themeClasses.text} ${themeClasses.inputBg} border ${themeClasses.border} rounded px-2 py-1 w-full`}
                />
              ) : (
                <div className={`text-sm ${themeClasses.text}`}>2 years</div>
              )}
            </div>
          </div>
        </div>

        {/* Storage Requirements */}
        <div>
          <h3 className={`text-sm font-semibold ${themeClasses.text} mb-3`}>Storage Requirements</h3>
          <div className={`${themeClasses.inputBg} rounded-lg p-4`}>
            {isEditing ? (
              <textarea 
                defaultValue="Store in a cool, dry place (50°F - 80°F). Keep out of direct sunlight. Keep container tightly closed when not in use."
                className={`w-full ${themeClasses.text} ${themeClasses.inputBg} border ${themeClasses.border} rounded px-3 py-2 text-sm`}
                rows={3}
              />
            ) : (
              <div className={`text-sm ${themeClasses.text}`}>
                Store in a cool, dry place (50°F - 80°F). Keep out of direct sunlight. Keep container tightly closed when not in use.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinishedGoods;

