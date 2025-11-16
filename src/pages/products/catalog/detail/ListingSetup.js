import React, { useState } from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const ListingSetup = ({ data }) => {
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
          <h2 className={`text-lg font-semibold ${themeClasses.text}`}>Listing Setup</h2>
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
          {/* Product Size & Weight */}
          <div className="mb-6">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 className={`text-sm font-semibold ${themeClasses.text}`}>Product Size & Weight</h3>
              <button className="text-blue-500 hover:text-blue-600 text-sm font-medium flex items-center gap-1">
                <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Edit Info
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
              <div>
                <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>Length (in)</label>
                <div className={`${themeClasses.inputBg} rounded px-3 py-2 text-sm ${themeClasses.text}`}>2.5</div>
              </div>
              <div>
                <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>Width (in)</label>
                <div className={`${themeClasses.inputBg} rounded px-3 py-2 text-sm ${themeClasses.text}`}>2.5</div>
              </div>
              <div>
                <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>Height (in)</label>
                <div className={`${themeClasses.inputBg} rounded px-3 py-2 text-sm ${themeClasses.text}`}>5.4</div>
              </div>
              <div>
                <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>Weight (lbs)</label>
                <div className={`${themeClasses.inputBg} rounded px-3 py-2 text-sm ${themeClasses.text}`}>1.23</div>
              </div>
            </div>
          </div>

          {/* 6 Sided Images */}
          <div className="mb-6">
            <h3 className={`text-sm font-semibold ${themeClasses.text} mb-3`}>6 Sided Images</h3>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              {['Front', 'Left', 'Right', 'Back', 'Top', 'Bottom'].map((side) => (
                <div key={side} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    border: `2px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isDarkMode ? '#1F2937' : '#F9FAFB',
                  }}>
                    <button className="text-blue-500 hover:text-blue-600 text-xs">
                      Create new Asset
                    </button>
                  </div>
                  <span className={`text-xs font-medium ${themeClasses.text}`}>{side}</span>
                </div>
              ))}
            </div>
          </div>

          {/* PDP Setup */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 className={`text-sm font-semibold ${themeClasses.text}`}>PDP Setup</h3>
              <span className="px-2 py-0.5 rounded-md bg-green-500/10 text-green-600 text-xs font-medium flex items-center gap-1">
                <svg style={{ width: '0.875rem', height: '0.875rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Completed
              </span>
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

            {/* PDP Content */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className={`text-xs ${themeClasses.textSecondary} block mb-2`}>Title</label>
                <div className={`${themeClasses.inputBg} rounded-lg p-3 text-sm ${themeClasses.text}`}>
                  Cherry Tree Fertilizer 8oz
                </div>
              </div>
              <div>
                <label className={`text-xs ${themeClasses.textSecondary} block mb-2`}>Bullet Points</label>
                <div className={`${themeClasses.inputBg} rounded-lg p-3 text-sm ${themeClasses.text}`}>
                  <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem' }}>
                    <li>Designed specifically for cherry trees, from flowering to harvest</li>
                    <li>Boosts growth and fruit production in both potted and outdoor trees</li>
                    <li>Liquid formula for easy, even feeding with fast absorption</li>
                  </ul>
                </div>
              </div>
              <div>
                <label className={`text-xs ${themeClasses.textSecondary} block mb-2`}>Description</label>
                <div className={`${themeClasses.inputBg} rounded-lg p-3 text-sm ${themeClasses.text}`}>
                  There's nothing quite like the sight of cherry blossoms or the taste of freshly picked cherries from your own backyard...
                </div>
              </div>
              <div>
                <label className={`text-xs ${themeClasses.textSecondary} block mb-2`}>Price</label>
                <div className={`${themeClasses.inputBg} rounded-lg p-3 text-sm ${themeClasses.text}`}>
                  $11.99
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListingSetup;

