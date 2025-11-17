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
            <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>Packaging Name</label>
            <div className={`text-sm ${themeClasses.text}`}>{data?.packaging_name || 'N/A'}</div>
          </div>
          <div>
            <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>Closure Name</label>
            <div className={`text-sm ${themeClasses.text}`}>{data?.closure_name || 'N/A'}</div>
          </div>
          <div>
            <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>Label Size</label>
            <div className={`text-sm ${themeClasses.text}`}>{data?.label_size || 'N/A'}</div>
          </div>
          <div>
            <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>Label Location</label>
            <div className={`text-sm ${themeClasses.text}`}>{data?.label_location || 'N/A'}</div>
          </div>
          <div>
            <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>Package Dimensions</label>
            <div className={`text-sm ${themeClasses.text}`}>
              {data?.product_dimensions_length_in && data?.product_dimensions_width_in && data?.product_dimensions_height_in 
                ? `${data.product_dimensions_length_in} x ${data.product_dimensions_width_in} x ${data.product_dimensions_height_in} inches`
                : 'N/A'}
            </div>
          </div>
          <div>
            <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>Item Weight</label>
            <div className={`text-sm ${themeClasses.text}`}>
              {data?.product_dimensions_weight_lbs ? `${data.product_dimensions_weight_lbs} lbs` : 'N/A'}
            </div>
          </div>
          <div>
            <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>UPC</label>
            <div className={`text-sm ${themeClasses.text}`}>{data?.upc || 'N/A'}</div>
          </div>
          <div>
            <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>Child ASIN</label>
            <div className={`text-sm ${themeClasses.text}`}>{data?.child_asin || 'N/A'}</div>
          </div>
          <div>
            <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>Child SKU</label>
            <div className={`text-sm ${themeClasses.text}`}>{data?.child_sku_final || 'N/A'}</div>
          </div>
          <div>
            <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>Case Size</label>
            <div className={`text-sm ${themeClasses.text}`}>{data?.case_size || 'N/A'}</div>
          </div>
          <div>
            <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>Units Per Case</label>
            <div className={`text-sm ${themeClasses.text}`}>{data?.units_per_case || 'N/A'}</div>
          </div>
          <div>
            <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>Units Sold (30 days)</label>
            <div className={`text-sm ${themeClasses.text}`}>{data?.units_sold_30_days || 'N/A'}</div>
          </div>
        </div>

        {/* Formula Information */}
        {(data?.guaranteed_analysis || data?.npk || data?.derived_from) && (
          <div style={{ marginBottom: '2rem' }}>
            <h3 className={`text-sm font-semibold ${themeClasses.text} mb-3`}>Formula Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
              {data?.npk && (
                <div>
                  <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>NPK</label>
                  <div className={`text-sm ${themeClasses.text}`}>{data.npk}</div>
                </div>
              )}
              {data?.guaranteed_analysis && (
                <div>
                  <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>Guaranteed Analysis</label>
                  <div className={`text-sm ${themeClasses.text} whitespace-pre-wrap`}>{data.guaranteed_analysis}</div>
                </div>
              )}
              {data?.derived_from && (
                <div>
                  <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>Derived From</label>
                  <div className={`text-sm ${themeClasses.text} whitespace-pre-wrap`}>{data.derived_from}</div>
                </div>
              )}
              {data?.msds && (
                <div>
                  <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>MSDS</label>
                  <a 
                    href={data.msds} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-500 hover:text-blue-600"
                  >
                    View MSDS Document
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

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
                    <th className="text-left text-xs font-bold text-white uppercase tracking-wider px-4 py-2">ASIN</th>
                    <th className="text-left text-xs font-bold text-white uppercase tracking-wider px-4 py-2">SKU</th>
                    <th className="text-left text-xs font-bold text-white uppercase tracking-wider px-4 py-2">UPC</th>
                    <th className="text-left text-xs font-bold text-white uppercase tracking-wider px-4 py-2">Units Sold (30d)</th>
                  </tr>
                </thead>
                <tbody className={isDarkMode ? 'divide-y divide-gray-700' : 'divide-y divide-gray-200'}>
                  {data.allVariations.map((variant, index) => (
                    <tr key={index} className={isDarkMode ? 'hover:bg-dark-bg-tertiary' : 'hover:bg-gray-50'}>
                      <td className={`px-4 py-3 text-sm ${themeClasses.text}`}>{variant.size || 'N/A'}</td>
                      <td className={`px-4 py-3 text-sm ${themeClasses.text}`}>{variant.child_asin || 'N/A'}</td>
                      <td className={`px-4 py-3 text-sm ${themeClasses.text}`}>{variant.child_sku_final || 'N/A'}</td>
                      <td className={`px-4 py-3 text-sm ${themeClasses.text}`}>{variant.upc || 'N/A'}</td>
                      <td className={`px-4 py-3 text-sm ${themeClasses.text}`}>{variant.units_sold_30_days || '0'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Material & Compliance - Keep this section but simplified */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 className={`text-sm font-semibold ${themeClasses.text} mb-3`}>Material & Compliance</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            <div>
              <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>Formula Name</label>
              <div className={`text-sm ${themeClasses.text}`}>{data?.formula_name || 'N/A'}</div>
            </div>
            <div>
              <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>Product Type</label>
              <div className={`text-sm ${themeClasses.text}`}>{data?.type || 'N/A'}</div>
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


