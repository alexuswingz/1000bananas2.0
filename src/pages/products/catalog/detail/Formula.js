import React from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const Formula = ({ data }) => {
  const { isDarkMode } = useTheme();

  const themeClasses = {
    bg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    inputBg: isDarkMode ? 'bg-dark-bg-tertiary' : 'bg-gray-50',
  };

  // Determine which brand data to display (first available)
  const brandData = data?.tps?.guaranteedAnalysis ? data.tps :
                    data?.tpsNutrients?.guaranteedAnalysis ? data.tpsNutrients :
                    data?.bloomCity?.guaranteedAnalysis ? data.bloomCity : null;

  const activeBrand = data?.tps?.guaranteedAnalysis ? 'TPS Plant Foods' :
                      data?.tpsNutrients?.guaranteedAnalysis ? 'TPS Nutrients' :
                      data?.bloomCity?.guaranteedAnalysis ? 'Bloom City' : null;

  const hasContent = !!(data?.formulaName || brandData);

  return (
    <div className={`${themeClasses.bg} rounded-xl border ${themeClasses.border} shadow-sm`}>
      <div className={`px-6 py-4 border-b ${themeClasses.border}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h2 className={`text-lg font-semibold ${themeClasses.text}`}>Formula</h2>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
            {data?.formulaName && (
              <div>
                <label className={`text-xs ${themeClasses.textSecondary} block mb-2`}>Formula Name</label>
                <div className={`text-sm font-medium ${themeClasses.text}`}>{data.formulaName}</div>
              </div>
            )}
            {activeBrand && (
              <div>
                <label className={`text-xs ${themeClasses.textSecondary} block mb-2`}>Brand</label>
                <div className={`text-sm font-medium ${themeClasses.text}`}>{activeBrand}</div>
              </div>
            )}
            {data?.category && (
              <div>
                <label className={`text-xs ${themeClasses.textSecondary} block mb-2`}>Category</label>
                <div className={`text-sm ${themeClasses.text}`}>{data.category}</div>
              </div>
            )}
            {data?.type && (
              <div>
                <label className={`text-xs ${themeClasses.textSecondary} block mb-2`}>Type</label>
                <div className={`text-sm ${themeClasses.text}`}>{data.type}</div>
              </div>
            )}
            {brandData?.npk && (
              <div>
                <label className={`text-xs ${themeClasses.textSecondary} block mb-2`}>NPK</label>
                <div className={`text-sm font-medium ${themeClasses.text}`}>{brandData.npk}</div>
              </div>
            )}
            {brandData?.guaranteedAnalysis && (
              <div style={{ gridColumn: '1 / -1' }}>
                <label className={`text-xs ${themeClasses.textSecondary} block mb-2`}>Guaranteed Analysis</label>
                <div className={`${themeClasses.inputBg} rounded-lg p-4`}>
                  <pre className={`text-sm ${themeClasses.text} whitespace-pre-wrap font-sans`}>
                    {brandData.guaranteedAnalysis}
                  </pre>
                </div>
              </div>
            )}
            {brandData?.derivedFrom && (
              <div style={{ gridColumn: '1 / -1' }}>
                <label className={`text-xs ${themeClasses.textSecondary} block mb-2`}>
                  {data?.bloomCity ? 'Ingredients' : 'Derived From'}
                </label>
                <div className={`${themeClasses.inputBg} rounded-lg p-4`}>
                  <pre className={`text-sm ${themeClasses.text} whitespace-pre-wrap font-sans`}>
                    {brandData.derivedFrom}
                  </pre>
                </div>
              </div>
            )}
            {(brandData?.storageWarranty || data?.bloomCity?.storage) && (
              <div style={{ gridColumn: '1 / -1' }}>
                <label className={`text-xs ${themeClasses.textSecondary} block mb-2`}>
                  {data?.bloomCity ? 'Storage' : 'Storage & Warranty'}
                </label>
                <div className={`${themeClasses.inputBg} rounded-lg p-4`}>
                  <pre className={`text-sm ${themeClasses.text} whitespace-pre-wrap font-sans`}>
                    {brandData?.storageWarranty || data?.bloomCity?.storage}
                  </pre>
                </div>
              </div>
            )}
            {data?.msds && (
              <div>
                <label className={`text-xs ${themeClasses.textSecondary} block mb-2`}>MSDS Document</label>
                <a 
                  href={data.msds} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1"
                >
                  <svg style={{ width: '1rem', height: '1rem' }} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM6 20V4h7v5h5v11H6z" />
                  </svg>
                  View MSDS
                </a>
              </div>
            )}
          </div>
        ) : (
          <div className={`${themeClasses.inputBg} rounded-lg p-8 text-center`}>
            <svg style={{ width: '4rem', height: '4rem', margin: '0 auto 1rem' }} className={themeClasses.textSecondary} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            <p className={`text-sm ${themeClasses.text} font-medium mb-2`}>No Formula Information Yet</p>
            <p className={`text-xs ${themeClasses.textSecondary}`}>Add formula details for this product</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Formula;
