import React, { useState } from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const Formula = ({ data }) => {
  const { isDarkMode } = useTheme();
  const [expandedSection, setExpandedSection] = useState(null);

  const themeClasses = {
    bg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    inputBg: isDarkMode ? 'bg-dark-bg-tertiary' : 'bg-gray-50',
    cardBg: isDarkMode ? 'bg-dark-bg-tertiary' : 'bg-gray-50',
    hoverBg: isDarkMode ? 'hover:bg-dark-bg-tertiary' : 'hover:bg-gray-100',
    accentBg: isDarkMode ? 'bg-purple-500/10' : 'bg-purple-50',
    accentBorder: isDarkMode ? 'border-purple-500/30' : 'border-purple-200',
    accentText: isDarkMode ? 'text-purple-400' : 'text-purple-600',
  };

  // Get formula data - can be at data level or data.formula level
  const formulaData = data?.formula || data;
  const formulaName = formulaData?.formulaName || data?.formula_name || data?.formulaName;
  
  // Determine which brand data to display (first available)
  const brandData = formulaData?.tps?.guaranteedAnalysis ? formulaData.tps :
                    formulaData?.tpsNutrients?.guaranteedAnalysis ? formulaData.tpsNutrients :
                    formulaData?.bloomCity?.guaranteedAnalysis ? formulaData.bloomCity :
                    data?.tps?.guaranteedAnalysis ? data.tps :
                    data?.tpsNutrients?.guaranteedAnalysis ? data.tpsNutrients :
                    data?.bloomCity?.guaranteedAnalysis ? data.bloomCity : null;

  const activeBrand = (formulaData?.tps?.guaranteedAnalysis || data?.tps?.guaranteedAnalysis) ? 'TPS Plant Foods' :
                      (formulaData?.tpsNutrients?.guaranteedAnalysis || data?.tpsNutrients?.guaranteedAnalysis) ? 'TPS Nutrients' :
                      (formulaData?.bloomCity?.guaranteedAnalysis || data?.bloomCity?.guaranteedAnalysis) ? 'Bloom City' : null;

  const hasContent = !!(formulaName || brandData);

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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Header Info Card */}
            <div className={`${themeClasses.accentBg} border ${themeClasses.accentBorder} rounded-xl p-5`}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                {formulaName && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <svg style={{ width: '1rem', height: '1rem' }} className={themeClasses.accentText} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <label className={`text-xs font-semibold ${themeClasses.textSecondary} uppercase`}>Formula Name</label>
                    </div>
                    <div className={`text-base font-bold ${themeClasses.text}`} style={{ fontFamily: 'monospace', letterSpacing: '0.5px' }}>{formulaName}</div>
                  </div>
                )}
                {activeBrand && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <svg style={{ width: '1rem', height: '1rem' }} className={themeClasses.accentText} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      <label className={`text-xs font-semibold ${themeClasses.textSecondary} uppercase`}>Brand</label>
                    </div>
                    <div className={`text-base font-bold ${themeClasses.accentText}`}>{activeBrand}</div>
                  </div>
                )}
                {brandData?.npk && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <svg style={{ width: '1rem', height: '1rem' }} className={themeClasses.accentText} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <label className={`text-xs font-semibold ${themeClasses.textSecondary} uppercase`}>NPK Ratio</label>
                    </div>
                    <div className={`text-2xl font-bold ${themeClasses.text}`} style={{ fontFamily: 'monospace', letterSpacing: '2px' }}>{brandData.npk}</div>
                  </div>
                )}
                {formulaData?.category && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <svg style={{ width: '1rem', height: '1rem' }} className={themeClasses.accentText} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      <label className={`text-xs font-semibold ${themeClasses.textSecondary} uppercase`}>Category</label>
                    </div>
                    <div className={`text-sm font-medium ${themeClasses.text}`}>{formulaData.category}</div>
                  </div>
                )}
                {formulaData?.type && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <svg style={{ width: '1rem', height: '1rem' }} className={themeClasses.accentText} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      <label className={`text-xs font-semibold ${themeClasses.textSecondary} uppercase`}>Type</label>
                    </div>
                    <div className={`text-sm font-medium ${themeClasses.text}`}>{formulaData.type}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Guaranteed Analysis Section */}
            {brandData?.guaranteedAnalysis && (
              <div className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-xl overflow-hidden`}>
                <button
                  onClick={() => setExpandedSection(expandedSection === 'analysis' ? null : 'analysis')}
                  className={`w-full px-5 py-4 flex items-center justify-between ${themeClasses.hoverBg} transition-colors`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ 
                      width: '2.5rem', 
                      height: '2.5rem', 
                      borderRadius: '0.5rem',
                      backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <svg style={{ width: '1.25rem', height: '1.25rem' }} className="text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div className={`text-sm font-semibold ${themeClasses.text}`}>Guaranteed Analysis</div>
                      <div className={`text-xs ${themeClasses.textSecondary}`}>Nutrient composition details</div>
                    </div>
                  </div>
                  <svg 
                    style={{ 
                      width: '1.25rem', 
                      height: '1.25rem',
                      transform: expandedSection === 'analysis' ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s'
                    }} 
                    className={themeClasses.textSecondary}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {expandedSection === 'analysis' && (
                  <div className={`px-5 pb-5 border-t ${themeClasses.border}`} style={{ paddingTop: '1rem' }}>
                    <div className={`${isDarkMode ? 'bg-dark-bg-primary' : 'bg-white'} rounded-lg p-4 border ${themeClasses.border}`}>
                      <pre className={`text-sm ${themeClasses.text} whitespace-pre-wrap font-sans leading-relaxed`} style={{ margin: 0 }}>
                        {brandData.guaranteedAnalysis}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Ingredients/Derived From Section */}
            {brandData?.derivedFrom && (
              <div className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-xl overflow-hidden`}>
                <button
                  onClick={() => setExpandedSection(expandedSection === 'ingredients' ? null : 'ingredients')}
                  className={`w-full px-5 py-4 flex items-center justify-between ${themeClasses.hoverBg} transition-colors`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ 
                      width: '2.5rem', 
                      height: '2.5rem', 
                      borderRadius: '0.5rem',
                      backgroundColor: isDarkMode ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <svg style={{ width: '1.25rem', height: '1.25rem' }} className="text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                      </svg>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div className={`text-sm font-semibold ${themeClasses.text}`}>
                        {data?.bloomCity ? 'Ingredients' : 'Derived From'}
                      </div>
                      <div className={`text-xs ${themeClasses.textSecondary}`}>Source materials and components</div>
                    </div>
                  </div>
                  <svg 
                    style={{ 
                      width: '1.25rem', 
                      height: '1.25rem',
                      transform: expandedSection === 'ingredients' ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s'
                    }} 
                    className={themeClasses.textSecondary}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {expandedSection === 'ingredients' && (
                  <div className={`px-5 pb-5 border-t ${themeClasses.border}`} style={{ paddingTop: '1rem' }}>
                    <div className={`${isDarkMode ? 'bg-dark-bg-primary' : 'bg-white'} rounded-lg p-4 border ${themeClasses.border}`}>
                      <pre className={`text-sm ${themeClasses.text} whitespace-pre-wrap font-sans leading-relaxed`} style={{ margin: 0 }}>
                        {brandData.derivedFrom}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Storage & Warranty Section */}
            {(brandData?.storageWarranty || data?.bloomCity?.storage) && (
              <div className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-xl overflow-hidden`}>
                <button
                  onClick={() => setExpandedSection(expandedSection === 'storage' ? null : 'storage')}
                  className={`w-full px-5 py-4 flex items-center justify-between ${themeClasses.hoverBg} transition-colors`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ 
                      width: '2.5rem', 
                      height: '2.5rem', 
                      borderRadius: '0.5rem',
                      backgroundColor: isDarkMode ? 'rgba(234, 179, 8, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <svg style={{ width: '1.25rem', height: '1.25rem' }} className="text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div className={`text-sm font-semibold ${themeClasses.text}`}>
                        {data?.bloomCity ? 'Storage Information' : 'Storage & Warranty'}
                      </div>
                      <div className={`text-xs ${themeClasses.textSecondary}`}>Handling and storage guidelines</div>
                    </div>
                  </div>
                  <svg 
                    style={{ 
                      width: '1.25rem', 
                      height: '1.25rem',
                      transform: expandedSection === 'storage' ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s'
                    }} 
                    className={themeClasses.textSecondary}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {expandedSection === 'storage' && (
                  <div className={`px-5 pb-5 border-t ${themeClasses.border}`} style={{ paddingTop: '1rem' }}>
                    <div className={`${isDarkMode ? 'bg-dark-bg-primary' : 'bg-white'} rounded-lg p-4 border ${themeClasses.border}`}>
                      <pre className={`text-sm ${themeClasses.text} whitespace-pre-wrap font-sans leading-relaxed`} style={{ margin: 0 }}>
                        {brandData?.storageWarranty || data?.bloomCity?.storage}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MSDS Document */}
            {(formulaData?.msds || data?.msds) && (
              <div className={`${themeClasses.cardBg} border ${themeClasses.border} rounded-xl p-5`}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ 
                      width: '2.5rem', 
                      height: '2.5rem', 
                      borderRadius: '0.5rem',
                      backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <svg style={{ width: '1.25rem', height: '1.25rem' }} className="text-red-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM6 20V4h7v5h5v11H6z" />
                      </svg>
                    </div>
                    <div>
                      <div className={`text-sm font-semibold ${themeClasses.text}`}>Safety Data Sheet</div>
                      <div className={`text-xs ${themeClasses.textSecondary}`}>Material Safety Data Sheet (MSDS)</div>
                    </div>
                  </div>
                  <a 
                    href={formulaData?.msds || data?.msds} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-lg text-sm font-medium text-blue-500 hover:text-blue-600 border border-blue-500/30 hover:border-blue-500 hover:bg-blue-500/5 transition-all flex items-center gap-2"
                  >
                    <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    View Document
                  </a>
                </div>
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
