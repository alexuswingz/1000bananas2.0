import React, { useState } from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const FormulaEditor = ({ isOpen, onClose, onSave, formula }) => {
  const { isDarkMode } = useTheme();
  
  // Determine which brand tab to show initially based on existing data
  const getInitialTab = () => {
    if (!formula) return 'TPS Plant Foods';
    if (formula.brand_1) return formula.brand_1;
    if (formula.brand_2) return formula.brand_2;
    if (formula.brand_3) return formula.brand_3;
    if (formula.brand_4) return formula.brand_4;
    return 'TPS Plant Foods';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab());
  const [formulaData, setFormulaData] = useState({
    formula: formula?.formula || '',
    category: formula?.category || 'Plant',
    type: formula?.type || 'Liquid',
    filter: formula?.filter || '75',
    brand_1: formula?.brand_1 || '',
    brand_2: formula?.brand_2 || null,
    brand_3: formula?.brand_3 || null,
    brand_4: formula?.brand_4 || null,
    // TPS Plant Foods fields
    tps_guaranteed_analysis: formula?.tps_guaranteed_analysis || '',
    tps_npk: formula?.tps_npk || '',
    tps_derived_from: formula?.tps_derived_from || '',
    tps_storage___warranty___precautionary___metals: formula?.tps_storage___warranty___precautionary___metals || '',
    // TPS Nutrients fields
    tps_nutrients_guaranteed_analysis: formula?.tps_nutrients_guaranteed_analysis || '',
    tps_nutrients_npk: formula?.tps_nutrients_npk || '',
    tps_nutrients_derived_from: formula?.tps_nutrients_derived_from || '',
    tps_nutrients_storage___warranty___precautionary___metals: formula?.tps_nutrients_storage___warranty___precautionary___metals || '',
    // Bloom City fields
    bloom_city_npk: formula?.bloom_city_npk || '',
    bloom_city_ingredients: formula?.bloom_city_ingredients || '',
    bloom_city_guaranteed_analysis: formula?.bloom_city_guaranteed_analysis || '',
    bloom_city_derived_from: formula?.bloom_city_derived_from || '',
    bloom_city_storage: formula?.bloom_city_storage || '',
    bloom_city_metals: formula?.bloom_city_metals || '',
  });

  const themeClasses = {
    bg: isDarkMode ? 'bg-dark-bg-primary' : 'bg-light-bg-primary',
    cardBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    inputBg: isDarkMode ? 'bg-dark-bg-tertiary' : 'bg-gray-50',
    headerBg: isDarkMode ? 'bg-[#1e293b]' : 'bg-[#2c3e50]',
  };

  const tabs = ['TPS Plant Foods', 'TPS Nutrients', 'Bloom City'];

  const handleSave = () => {
    onSave(formulaData);
  };

  // Get fields based on active tab
  const getTabFields = () => {
    switch(activeTab) {
      case 'TPS Plant Foods':
        return {
          guaranteedAnalysis: formulaData.tps_guaranteed_analysis,
          npk: formulaData.tps_npk,
          derivedFrom: formulaData.tps_derived_from,
          storage: formulaData.tps_storage___warranty___precautionary___metals,
        };
      case 'TPS Nutrients':
        return {
          guaranteedAnalysis: formulaData.tps_nutrients_guaranteed_analysis,
          npk: formulaData.tps_nutrients_npk,
          derivedFrom: formulaData.tps_nutrients_derived_from,
          storage: formulaData.tps_nutrients_storage___warranty___precautionary___metals,
        };
      case 'Bloom City':
        return {
          guaranteedAnalysis: formulaData.bloom_city_guaranteed_analysis,
          npk: formulaData.bloom_city_npk,
          derivedFrom: formulaData.bloom_city_derived_from,
          storage: formulaData.bloom_city_storage,
          ingredients: formulaData.bloom_city_ingredients,
          metals: formulaData.bloom_city_metals,
        };
      default:
        return {};
    }
  };

  const updateTabFields = (field, value) => {
    switch(activeTab) {
      case 'TPS Plant Foods':
        if (field === 'guaranteedAnalysis') setFormulaData({ ...formulaData, tps_guaranteed_analysis: value });
        if (field === 'npk') setFormulaData({ ...formulaData, tps_npk: value });
        if (field === 'derivedFrom') setFormulaData({ ...formulaData, tps_derived_from: value });
        if (field === 'storage') setFormulaData({ ...formulaData, tps_storage___warranty___precautionary___metals: value });
        break;
      case 'TPS Nutrients':
        if (field === 'guaranteedAnalysis') setFormulaData({ ...formulaData, tps_nutrients_guaranteed_analysis: value });
        if (field === 'npk') setFormulaData({ ...formulaData, tps_nutrients_npk: value });
        if (field === 'derivedFrom') setFormulaData({ ...formulaData, tps_nutrients_derived_from: value });
        if (field === 'storage') setFormulaData({ ...formulaData, tps_nutrients_storage___warranty___precautionary___metals: value });
        break;
      case 'Bloom City':
        if (field === 'guaranteedAnalysis') setFormulaData({ ...formulaData, bloom_city_guaranteed_analysis: value });
        if (field === 'npk') setFormulaData({ ...formulaData, bloom_city_npk: value });
        if (field === 'derivedFrom') setFormulaData({ ...formulaData, bloom_city_derived_from: value });
        if (field === 'storage') setFormulaData({ ...formulaData, bloom_city_storage: value });
        if (field === 'ingredients') setFormulaData({ ...formulaData, bloom_city_ingredients: value });
        if (field === 'metals') setFormulaData({ ...formulaData, bloom_city_metals: value });
        break;
    }
  };

  const tabFields = getTabFields();

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop with animation */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        style={{ 
          zIndex: 9998,
          animation: 'fadeIn 0.2s ease-out'
        }}
        onClick={onClose}
      />

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translate(-50%, -48%);
          }
          to { 
            opacity: 1;
            transform: translate(-50%, -50%);
          }
        }
      `}</style>

      {/* Modal */}
      <div 
        className={`fixed ${themeClasses.cardBg} rounded-2xl shadow-2xl`}
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '95%',
          maxWidth: '1000px',
          maxHeight: '90vh',
          overflowY: 'auto',
          zIndex: 9999,
          animation: 'slideUp 0.3s ease-out',
          border: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`
        }}
      >
        {/* Header - Modern gradient design */}
        <div 
          style={{
            padding: '2rem 2.5rem',
            background: isDarkMode 
              ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
              : 'linear-gradient(135deg, #2C3544 0%, #3b4a5f 100%)',
            borderTopLeftRadius: '1rem',
            borderTopRightRadius: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.2)'}`
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(59, 130, 246, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg style={{ width: '28px', height: '28px', color: '#60a5fa' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <div>
              <h2 style={{ color: 'white', fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.25rem' }}>
                Formula Editor
              </h2>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>
                {formula ? 'Edit formula details' : 'Create new formula'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-all hover:bg-white/10 rounded-lg"
            style={{ padding: '0.5rem' }}
          >
            <svg style={{ width: '1.5rem', height: '1.5rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs - Modern pill design */}
        <div style={{ padding: '1.5rem 2.5rem', borderBottom: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}` }}>
          <div style={{ display: 'flex', gap: '0.5rem', background: isDarkMode ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)', padding: '0.375rem', borderRadius: '0.75rem' }}>
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2.5 text-sm font-semibold transition-all rounded-lg ${
                  activeTab === tab 
                    ? 'text-white shadow-md' 
                    : `${themeClasses.text} hover:bg-white/5`
                }`}
                style={{
                  background: activeTab === tab 
                    ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' 
                    : 'transparent',
                  flex: 1,
                  position: 'relative'
                }}
              >
                {activeTab === tab && (
                  <span style={{
                    position: 'absolute',
                    top: '50%',
                    left: '0.75rem',
                    transform: 'translateY(-50%)',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#60a5fa'
                  }} />
                )}
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '2.5rem' }}>
          {/* Three-column layout for first row */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
            {/* Formula Name */}
            <div>
              <label className={`text-sm font-semibold ${themeClasses.text} block mb-3 flex items-center gap-2`}>
                <svg style={{ width: '1rem', height: '1rem', color: '#3b82f6' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Formula Name
              </label>
              <input
                type="text"
                value={formulaData.formula}
                onChange={(e) => setFormulaData({ ...formulaData, formula: e.target.value })}
                className={`w-full px-4 py-3 border-2 ${themeClasses.border} rounded-xl ${themeClasses.inputBg} ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm`}
                placeholder="e.g., F.Ultra Grow"
              />
            </div>

            {/* Category */}
            <div>
              <label className={`text-sm font-semibold ${themeClasses.text} block mb-3 flex items-center gap-2`}>
                <svg style={{ width: '1rem', height: '1rem', color: '#3b82f6' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Category
              </label>
              <select
                value={formulaData.category}
                onChange={(e) => setFormulaData({ ...formulaData, category: e.target.value })}
                className={`w-full px-4 py-3 border-2 ${themeClasses.border} rounded-xl ${themeClasses.inputBg} ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm`}
              >
                <option value="Plant">Plant</option>
                <option value="Cleaner">Cleaner</option>
                <option value="Pest">Pest</option>
              </select>
            </div>

            {/* Type */}
            <div>
              <label className={`text-sm font-semibold ${themeClasses.text} block mb-3 flex items-center gap-2`}>
                <svg style={{ width: '1rem', height: '1rem', color: '#3b82f6' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Type
              </label>
              <select
                value={formulaData.type}
                onChange={(e) => setFormulaData({ ...formulaData, type: e.target.value })}
                className={`w-full px-4 py-3 border-2 ${themeClasses.border} rounded-xl ${themeClasses.inputBg} ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm`}
              >
                <option value="Liquid">Liquid</option>
                <option value="Dry">Dry</option>
              </select>
            </div>
          </div>

          {/* NPK */}
          <div style={{ marginBottom: '2rem' }}>
            <label className={`text-sm font-semibold ${themeClasses.text} block mb-3 flex items-center gap-2`}>
              <svg style={{ width: '1rem', height: '1rem', color: '#3b82f6' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              NPK Ratio
            </label>
            <input
              type="text"
              value={tabFields.npk || ''}
              onChange={(e) => updateTabFields('npk', e.target.value)}
              className={`w-full px-4 py-3 border-2 ${themeClasses.border} rounded-xl ${themeClasses.inputBg} ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm`}
              placeholder="e.g., 3 - 6 - 5.1"
            />
          </div>

          {/* Guaranteed Analysis */}
          <div style={{ marginBottom: '2rem' }}>
            <label className={`text-sm font-semibold ${themeClasses.text} block mb-3 flex items-center gap-2`}>
              <svg style={{ width: '1rem', height: '1rem', color: '#3b82f6' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Guaranteed Analysis
            </label>
            <textarea
              value={tabFields.guaranteedAnalysis || ''}
              onChange={(e) => updateTabFields('guaranteedAnalysis', e.target.value)}
              className={`w-full px-4 py-3 border-2 ${themeClasses.border} rounded-xl ${themeClasses.inputBg} ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm`}
              rows={4}
              style={{ resize: 'vertical', lineHeight: '1.6' }}
              placeholder="Enter guaranteed analysis details"
            />
          </div>

          {/* Derived From / Ingredients */}
          <div style={{ marginBottom: '2rem' }}>
            <label className={`text-sm font-semibold ${themeClasses.text} block mb-3 flex items-center gap-2`}>
              <svg style={{ width: '1rem', height: '1rem', color: '#3b82f6' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              {activeTab === 'Bloom City' ? 'Ingredients' : 'Derived From'}
            </label>
            <textarea
              value={activeTab === 'Bloom City' ? (tabFields.ingredients || '') : (tabFields.derivedFrom || '')}
              onChange={(e) => updateTabFields(activeTab === 'Bloom City' ? 'ingredients' : 'derivedFrom', e.target.value)}
              className={`w-full px-4 py-3 border-2 ${themeClasses.border} rounded-xl ${themeClasses.inputBg} ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm`}
              rows={3}
              style={{ resize: 'vertical', lineHeight: '1.6' }}
              placeholder="Enter ingredients or derived from"
            />
          </div>

          {/* Storage / Warranty / Precautionary */}
          <div style={{ marginBottom: '2rem' }}>
            <label className={`text-sm font-semibold ${themeClasses.text} block mb-3 flex items-center gap-2`}>
              <svg style={{ width: '1rem', height: '1rem', color: '#3b82f6' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Storage / Warranty / Precautionary
            </label>
            <textarea
              value={tabFields.storage || ''}
              onChange={(e) => updateTabFields('storage', e.target.value)}
              className={`w-full px-4 py-3 border-2 ${themeClasses.border} rounded-xl ${themeClasses.inputBg} ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm`}
              rows={7}
              style={{ resize: 'vertical', lineHeight: '1.6' }}
              placeholder="Enter storage instructions, warranty, and precautionary statements"
            />
          </div>

          {/* Metals (Bloom City only) */}
          {activeTab === 'Bloom City' && (
            <div style={{ marginBottom: '2rem' }}>
              <label className={`text-sm font-semibold ${themeClasses.text} block mb-3 flex items-center gap-2`}>
                <svg style={{ width: '1rem', height: '1rem', color: '#3b82f6' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Metals Information
              </label>
              <textarea
                value={tabFields.metals || ''}
                onChange={(e) => updateTabFields('metals', e.target.value)}
                className={`w-full px-4 py-3 border-2 ${themeClasses.border} rounded-xl ${themeClasses.inputBg} ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm`}
                rows={3}
                style={{ resize: 'vertical', lineHeight: '1.6' }}
                placeholder="Enter metals information"
              />
            </div>
          )}

          {/* Warning Note - Modern design */}
          <div 
            style={{ 
              padding: '1.25rem 1.5rem',
              background: isDarkMode 
                ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.1) 100%)'
                : 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
              border: `2px solid ${isDarkMode ? 'rgba(251, 191, 36, 0.3)' : '#F59E0B'}`,
              borderRadius: '1rem',
              display: 'flex',
              gap: '1rem',
              alignItems: 'start'
            }}
          >
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '0.75rem',
              background: 'rgba(251, 191, 36, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <svg style={{ width: '1.5rem', height: '1.5rem', color: '#F59E0B' }} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#92400e', marginBottom: '0.25rem' }}>
                Important: Master Formula Edit
              </p>
              <p style={{ fontSize: '0.8125rem', color: '#92400e', lineHeight: '1.5' }}>
                You are editing the master formula. Changes will overwrite all uses across the app.
              </p>
            </div>
          </div>
        </div>

        {/* Footer - Modern design */}
        <div 
          style={{
            padding: '1.75rem 2.5rem',
            borderTop: `1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: isDarkMode ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)'
          }}
        >
          <p className={`text-sm ${themeClasses.textSecondary}`}>
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={onClose}
              className={`px-6 py-3 border-2 ${themeClasses.border} ${themeClasses.text} rounded-xl hover:${themeClasses.inputBg} transition-all font-semibold`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl transition-all font-semibold shadow-lg hover:shadow-xl"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default FormulaEditor;

