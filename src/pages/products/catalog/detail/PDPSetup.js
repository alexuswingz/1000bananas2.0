import React, { useState } from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const PDPSetup = ({ data }) => {
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
            <h2 className={`text-lg font-semibold ${themeClasses.text}`}>PDP Setup</h2>
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
        {/* Product Title & Description */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 className={`text-sm font-semibold ${themeClasses.text}`}>Product Title & Description</h3>
            <button 
              onClick={() => setIsEditing(!isEditing)}
              className="text-blue-500 hover:text-blue-600 text-sm font-medium flex items-center gap-1"
            >
              <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              {isEditing ? 'Save' : 'Edit Setup'}
            </button>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label className={`text-xs ${themeClasses.textSecondary} block mb-2`}>Product Title</label>
            {isEditing ? (
              <input 
                type="text" 
                defaultValue={data.title || `${data.brand} ${data.product}`}
                className={`w-full ${themeClasses.text} ${themeClasses.inputBg} border ${themeClasses.border} rounded px-3 py-2 text-sm`}
              />
            ) : (
              <div className={`text-sm ${themeClasses.text}`}>
                {data.title || `${data.brand} ${data.product}`}
              </div>
            )}
          </div>
          <div>
            <label className={`text-xs ${themeClasses.textSecondary} block mb-2`}>Product Description</label>
            {isEditing ? (
              <textarea 
                defaultValue={data.description || 'No description yet'}
                className={`w-full ${themeClasses.text} ${themeClasses.inputBg} border ${themeClasses.border} rounded px-3 py-2 text-sm`}
                rows={4}
              />
            ) : (
              <div className={`text-sm ${themeClasses.text} leading-relaxed`}>
                {data.description || 'No description yet'}
              </div>
            )}
          </div>
        </div>

        {/* Bullet Points */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 className={`text-sm font-semibold ${themeClasses.text} mb-3`}>Key Features (Bullet Points)</h3>
          <div className={`${themeClasses.inputBg} rounded-lg p-4`}>
            {isEditing ? (
              <textarea 
                defaultValue={data.bullets || data.bullet_points || 'No bullet points yet'}
                className={`w-full ${themeClasses.text} ${themeClasses.inputBg} border ${themeClasses.border} rounded px-3 py-2 text-sm`}
                rows={6}
              />
            ) : (
              <div className={`text-sm ${themeClasses.text} whitespace-pre-wrap`}>
                {data.bullets || data.bullet_points || 'No bullet points yet'}
              </div>
            )}
          </div>
        </div>

        {/* Search Terms & Keywords */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 className={`text-sm font-semibold ${themeClasses.text} mb-3`}>Search Terms & Keywords</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            <div>
              <label className={`text-xs ${themeClasses.textSecondary} block mb-2`}>Primary Keywords</label>
              {isEditing ? (
                <input 
                  type="text" 
                  defaultValue={data.search_terms || data.searchTerms || ''}
                  className={`w-full text-sm ${themeClasses.text} ${themeClasses.inputBg} border ${themeClasses.border} rounded px-3 py-2`}
                />
              ) : (
                <div className={`text-sm ${themeClasses.text}`}>
                  {data.search_terms || data.searchTerms || 'No search terms yet'}
                </div>
              )}
            </div>
            <div>
              <label className={`text-xs ${themeClasses.textSecondary} block mb-2`}>Secondary Keywords</label>
              {isEditing ? (
                <input 
                  type="text" 
                  defaultValue="fruit tree fertilizer, liquid plant food, organic tree food"
                  className={`w-full text-sm ${themeClasses.text} ${themeClasses.inputBg} border ${themeClasses.border} rounded px-3 py-2`}
                />
              ) : (
                <div className={`text-sm ${themeClasses.text}`}>
                  fruit tree fertilizer, liquid plant food, organic tree food
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Category & Attributes */}
        <div>
          <h3 className={`text-sm font-semibold ${themeClasses.text} mb-3`}>Category & Attributes</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            <div>
              <label className={`text-xs ${themeClasses.textSecondary} block mb-2`}>Category</label>
              {isEditing ? (
                <input 
                  type="text" 
                  defaultValue="Patio, Lawn & Garden > Gardening & Lawn Care > Fertilizers"
                  className={`w-full text-sm ${themeClasses.text} ${themeClasses.inputBg} border ${themeClasses.border} rounded px-3 py-2`}
                />
              ) : (
                <div className={`text-sm ${themeClasses.text}`}>
                  Patio, Lawn & Garden {'>'} Gardening & Lawn Care {'>'} Fertilizers
                </div>
              )}
            </div>
            <div>
              <label className={`text-xs ${themeClasses.textSecondary} block mb-2`}>Brand</label>
              {isEditing ? (
                <input 
                  type="text" 
                  defaultValue="TPS Plant Foods"
                  className={`w-full text-sm ${themeClasses.text} ${themeClasses.inputBg} border ${themeClasses.border} rounded px-3 py-2`}
                />
              ) : (
                <div className={`text-sm ${themeClasses.text}`}>TPS Plant Foods</div>
              )}
            </div>
            <div>
              <label className={`text-xs ${themeClasses.textSecondary} block mb-2`}>Item Form</label>
              {isEditing ? (
                <input 
                  type="text" 
                  defaultValue="Liquid"
                  className={`w-full text-sm ${themeClasses.text} ${themeClasses.inputBg} border ${themeClasses.border} rounded px-3 py-2`}
                />
              ) : (
                <div className={`text-sm ${themeClasses.text}`}>Liquid</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDPSetup;


