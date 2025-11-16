import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useTheme } from '../../context/ThemeContext';
import { useDialog } from '../../context/DialogContext';

const ProductForm = () => {
  const { isDarkMode } = useTheme();
  const { showDialog } = useDialog();
  const navigate = useNavigate();
  const location = useLocation();
  const productData = location.state?.productData || {};

  const themeClasses = {
    bg: isDarkMode ? 'bg-dark-bg-primary' : 'bg-light-bg-primary',
    card: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    inputBg: isDarkMode ? 'bg-dark-bg-tertiary' : 'bg-white',
  };

  // Form state
  const [formData, setFormData] = useState({
    // Essential Info
    salesMarketplace: '',
    sellerAccount: productData.account || '',
    country: '',
    brandName: productData.brand || '',
    productName: productData.product || '',
    productType: '',
    formula: '',
    
    // Product Variations
    variations: [
      { id: 1, units: '', bottleName: '', closureName: '', labelSize: '' }
    ],
    
    // Marketing
    coreCompetitors: ['', '', ''],
    coreCompetitorKeywords: [{}, {}, {}],
    otherCompetitors: [''],
    otherCompetitorKeywords: [{}],
    otherKeywords: [''],
    
    // Listing
    upc: '',
    parentMap: '',
    childMap: '',
    
    // Notes
    notes: '',
    design: '',
    marketing: '',
    production: '',
  });

  const [activeTab, setActiveTab] = useState('notes');

  // Marketplace options
  const marketplaces = ['Amazon US', 'Amazon CA', 'Amazon UK', 'Walmart', 'eBay'];
  const countries = ['United States', 'Canada', 'United Kingdom', 'Australia'];
  const accounts = ['TPS Nutrients', 'Total Pest Supply', 'Task Pro Solutions', 'The Perfect Shine'];
  const brands = ['HomeJungle', 'TPS Plant Foods', 'Bloom City', 'NatureStop', "Burke's", 'Mint+', "Ms. Pixie's", 'Daily Shine', 'TASK-X', 'Steel & Saddle', 'PureGlossCo', 'WAX-X'];
  const productTypes = ['Formula', 'Powder', 'Liquid', 'Spray', 'Concentrate'];
  const formulas = ['Formula A', 'Formula B', 'Formula C'];
  const units = ['8oz', '16oz', '32oz', '1 Gallon', '5 Gallon'];
  const bottles = ['8oz Bottle', '16oz Bottle', '32oz Bottle', 'Gallon Jug'];
  const closures = ['Aptar Pour Cap', 'Spray Trigger', 'Pump Cap', 'Flip Cap'];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleVariationChange = (index, field, value) => {
    const newVariations = [...formData.variations];
    newVariations[index][field] = value;
    setFormData(prev => ({ ...prev, variations: newVariations }));
  };

  const addVariation = () => {
    setFormData(prev => ({
      ...prev,
      variations: [...prev.variations, { id: Date.now(), units: '', bottleName: '', closureName: '', labelSize: '' }]
    }));
  };

  const removeVariation = (index) => {
    if (formData.variations.length > 1) {
      const newVariations = formData.variations.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, variations: newVariations }));
    }
  };

  const handleCompetitorChange = (type, index, value) => {
    if (type === 'core') {
      const newCompetitors = [...formData.coreCompetitors];
      newCompetitors[index] = value;
      setFormData(prev => ({ ...prev, coreCompetitors: newCompetitors }));
    } else {
      const newCompetitors = [...formData.otherCompetitors];
      newCompetitors[index] = value;
      setFormData(prev => ({ ...prev, otherCompetitors: newCompetitors }));
    }
  };

  const addCompetitor = (type) => {
    if (type === 'core') {
      setFormData(prev => ({
        ...prev,
        coreCompetitors: [...prev.coreCompetitors, ''],
        coreCompetitorKeywords: [...prev.coreCompetitorKeywords, {}]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        otherCompetitors: [...prev.otherCompetitors, ''],
        otherCompetitorKeywords: [...prev.otherCompetitorKeywords, {}]
      }));
    }
  };

  const handleSubmit = () => {
    // Validation
    if (!formData.sellerAccount || !formData.brandName || !formData.productName) {
      toast.error('Required fields missing', {
        description: 'Please fill in Seller Account, Brand Name, and Product Name.',
      });
      return;
    }

    showDialog({
      title: 'Submit Product',
      message: `Are you sure you want to submit "${formData.productName}"? This will create the product entry.`,
      confirmText: 'Submit Product',
      cancelText: 'Cancel',
      type: 'success',
      onConfirm: () => {
        // Submit logic here
        toast.success('Product submitted successfully!', {
          description: `${formData.productName} has been created.`,
        });
        navigate('/dashboard/products/selection');
      },
    });
  };

  const handleCancel = () => {
    showDialog({
      title: 'Cancel Product Entry',
      message: 'Are you sure you want to cancel? All unsaved changes will be lost.',
      confirmText: 'Discard Changes',
      cancelText: 'Keep Editing',
      type: 'warning',
      onConfirm: () => {
        navigate('/dashboard/products/selection');
      },
    });
  };

  return (
    <div className={`h-screen ${themeClasses.bg} flex flex-col overflow-hidden`}>
      {/* Header */}
      <div className={`${themeClasses.card} ${themeClasses.border} border-b px-6 py-4 flex items-center justify-between`} style={{ flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={handleCancel}
            className={`p-2 rounded-lg ${themeClasses.textSecondary} hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
          >
            <svg style={{ width: '1.5rem', height: '1.5rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img src="/assets/logo.png" alt="Logo" style={{ width: '2.5rem', height: '2.5rem', objectFit: 'contain' }} />
            <h1 className={`text-xl font-bold ${themeClasses.text}`}>New Product Entry</h1>
          </div>
        </div>
      </div>

      {/* Form Content - Scrollable */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Essential Info Section */}
          <div className={`${themeClasses.card} ${themeClasses.border} border rounded-2xl p-6 mb-6 shadow-sm`}>
            <h2 className={`text-lg font-semibold ${themeClasses.text} mb-4`}>Essential Info</h2>
            
            <div className={`border-t ${themeClasses.border} pt-4`}>
              <h3 className={`text-sm font-medium ${themeClasses.textSecondary} mb-4 uppercase tracking-wide`}>Core Product Info</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                {/* Sales Marketplace */}
                <div>
                  <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                    Sales Marketplace <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.salesMarketplace}
                    onChange={(e) => handleInputChange('salesMarketplace', e.target.value)}
                    className={`w-full ${themeClasses.inputBg} ${themeClasses.text} ${themeClasses.border} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  >
                    <option value="">Select Marketplace</option>
                    {marketplaces.map(mp => (
                      <option key={mp} value={mp}>{mp}</option>
                    ))}
                  </select>
                </div>

                {/* Seller Account */}
                <div>
                  <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                    Seller Account <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.sellerAccount}
                    onChange={(e) => handleInputChange('sellerAccount', e.target.value)}
                    className={`w-full ${themeClasses.inputBg} ${themeClasses.text} ${themeClasses.border} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  >
                    <option value="">Select Seller Account</option>
                    {accounts.map(acc => (
                      <option key={acc} value={acc}>{acc}</option>
                    ))}
                  </select>
                </div>

                {/* Country */}
                <div>
                  <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                    Country <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.country}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                    className={`w-full ${themeClasses.inputBg} ${themeClasses.text} ${themeClasses.border} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  >
                    <option value="">Select Country</option>
                    {countries.map(country => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                {/* Brand Name */}
                <div>
                  <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                    Brand Name <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.brandName}
                    onChange={(e) => handleInputChange('brandName', e.target.value)}
                    className={`w-full ${themeClasses.inputBg} ${themeClasses.text} ${themeClasses.border} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  >
                    <option value="">Select Brand</option>
                    {brands.map(brand => (
                      <option key={brand} value={brand}>{brand}</option>
                    ))}
                  </select>
                </div>

                {/* Product Name */}
                <div>
                  <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                    Product Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.productName}
                    onChange={(e) => handleInputChange('productName', e.target.value)}
                    placeholder="Enter Product Name"
                    className={`w-full ${themeClasses.inputBg} ${themeClasses.text} ${themeClasses.border} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                {/* Product Type */}
                <div>
                  <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>Product Type</label>
                  <select
                    value={formData.productType}
                    onChange={(e) => handleInputChange('productType', e.target.value)}
                    className={`w-full ${themeClasses.inputBg} ${themeClasses.text} ${themeClasses.border} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  >
                    <option value="">Select Type</option>
                    {productTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                {/* Formula */}
                <div>
                  <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>Formula</label>
                  <select
                    value={formData.formula}
                    onChange={(e) => handleInputChange('formula', e.target.value)}
                    className={`w-full ${themeClasses.inputBg} ${themeClasses.text} ${themeClasses.border} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  >
                    <option value="">Select Formula</option>
                    {formulas.map(formula => (
                      <option key={formula} value={formula}>{formula}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Product Variations Section */}
          <div className={`${themeClasses.card} ${themeClasses.border} border rounded-2xl p-6 mb-6 shadow-sm`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 className={`text-lg font-semibold ${themeClasses.text}`}>Product Variations</h2>
              <button
                onClick={addVariation}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Variation
              </button>
            </div>

            {formData.variations.map((variation, index) => (
              <div key={variation.id} className={`border ${themeClasses.border} rounded-xl p-4 mb-4`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 className={`text-sm font-medium ${themeClasses.text}`}>Variation {index + 1}</h3>
                  {formData.variations.length > 1 && (
                    <button
                      onClick={() => removeVariation(index)}
                      className={`p-1 rounded-lg ${themeClasses.textSecondary} hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 transition-colors`}
                    >
                      <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                  {/* Units */}
                  <div>
                    <label className={`block text-sm font-medium ${themeClasses.textSecondary} mb-2`}>Units</label>
                    <select
                      value={variation.units}
                      onChange={(e) => handleVariationChange(index, 'units', e.target.value)}
                      className={`w-full ${themeClasses.inputBg} ${themeClasses.text} ${themeClasses.border} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    >
                      <option value="">Select</option>
                      {units.map(unit => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </select>
                  </div>

                  {/* Bottle Name */}
                  <div>
                    <label className={`block text-sm font-medium ${themeClasses.textSecondary} mb-2`}>Bottle Name</label>
                    <select
                      value={variation.bottleName}
                      onChange={(e) => handleVariationChange(index, 'bottleName', e.target.value)}
                      className={`w-full ${themeClasses.inputBg} ${themeClasses.text} ${themeClasses.border} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    >
                      <option value="">Select</option>
                      {bottles.map(bottle => (
                        <option key={bottle} value={bottle}>{bottle}</option>
                      ))}
                    </select>
                  </div>

                  {/* Closure Name */}
                  <div>
                    <label className={`block text-sm font-medium ${themeClasses.textSecondary} mb-2`}>Closure Name</label>
                    <select
                      value={variation.closureName}
                      onChange={(e) => handleVariationChange(index, 'closureName', e.target.value)}
                      className={`w-full ${themeClasses.inputBg} ${themeClasses.text} ${themeClasses.border} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    >
                      <option value="">Select</option>
                      {closures.map(closure => (
                        <option key={closure} value={closure}>{closure}</option>
                      ))}
                    </select>
                  </div>

                  {/* Label Size */}
                  <div>
                    <label className={`block text-sm font-medium ${themeClasses.textSecondary} mb-2`}>Label Size</label>
                    <input
                      type="text"
                      value={variation.labelSize}
                      onChange={(e) => handleVariationChange(index, 'labelSize', e.target.value)}
                      placeholder='5" x 8"'
                      className={`w-full ${themeClasses.inputBg} ${themeClasses.text} ${themeClasses.border} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Marketing Section */}
          <div className={`${themeClasses.card} ${themeClasses.border} border rounded-2xl p-6 mb-6 shadow-sm`}>
            <h2 className={`text-lg font-semibold ${themeClasses.text} mb-4`}>Marketing</h2>

            {/* Core Competitors */}
            <div className="mb-6">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <label className={`text-sm font-medium ${themeClasses.text}`}>Core Competitor ASIN (10)</label>
                <button
                  onClick={() => addCompetitor('core')}
                  className={`text-sm text-blue-500 hover:text-blue-600 font-medium flex items-center gap-1`}
                >
                  <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                {formData.coreCompetitors.map((comp, index) => (
                  <input
                    key={index}
                    type="text"
                    value={comp}
                    onChange={(e) => handleCompetitorChange('core', index, e.target.value)}
                    placeholder="B00XGVHP71"
                    className={`${themeClasses.inputBg} ${themeClasses.text} ${themeClasses.border} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                ))}
              </div>
            </div>

            {/* Other Competitors */}
            <div className="mb-6">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <label className={`text-sm font-medium ${themeClasses.text}`}>Other Competitor ASIN</label>
                <button
                  onClick={() => addCompetitor('other')}
                  className={`text-sm text-blue-500 hover:text-blue-600 font-medium flex items-center gap-1`}
                >
                  <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                {formData.otherCompetitors.map((comp, index) => (
                  <input
                    key={index}
                    type="text"
                    value={comp}
                    onChange={(e) => handleCompetitorChange('other', index, e.target.value)}
                    placeholder="B00XGVHP71"
                    className={`${themeClasses.inputBg} ${themeClasses.text} ${themeClasses.border} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                ))}
              </div>
            </div>

            {/* Other Keywords */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <label className={`text-sm font-medium ${themeClasses.text}`}>Other Keywords (0)</label>
                <button
                  className={`text-sm text-blue-500 hover:text-blue-600 font-medium flex items-center gap-1`}
                >
                  <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add
                </button>
              </div>
              <textarea
                placeholder="No Other Keywords"
                className={`w-full ${themeClasses.inputBg} ${themeClasses.text} ${themeClasses.border} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                rows={3}
              />
            </div>
          </div>

          {/* Listing Section */}
          <div className={`${themeClasses.card} ${themeClasses.border} border rounded-2xl p-6 mb-6 shadow-sm`}>
            <h2 className={`text-lg font-semibold ${themeClasses.text} mb-4`}>Listing</h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              {/* UPC */}
              <div>
                <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>UPC</label>
                <input
                  type="text"
                  value={formData.upc}
                  onChange={(e) => handleInputChange('upc', e.target.value)}
                  placeholder="Enter UPC"
                  className={`w-full ${themeClasses.inputBg} ${themeClasses.text} ${themeClasses.border} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>

              {/* Parent MAP */}
              <div>
                <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>Parent MAP</label>
                <input
                  type="text"
                  value={formData.parentMap}
                  onChange={(e) => handleInputChange('parentMap', e.target.value)}
                  placeholder="Enter Parent MAP"
                  className={`w-full ${themeClasses.inputBg} ${themeClasses.text} ${themeClasses.border} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>

              {/* Child MAP */}
              <div>
                <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>Child MAP</label>
                <input
                  type="text"
                  value={formData.childMap}
                  onChange={(e) => handleInputChange('childMap', e.target.value)}
                  placeholder="Enter Child MAP"
                  className={`w-full ${themeClasses.inputBg} ${themeClasses.text} ${themeClasses.border} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>
            </div>
          </div>

          {/* Notes Section */}
          <div className={`${themeClasses.card} ${themeClasses.border} border rounded-2xl p-6 mb-6 shadow-sm`}>
            <h2 className={`text-lg font-semibold ${themeClasses.text} mb-4`}>Notes</h2>

            {/* Tabs */}
            <div className={`flex gap-2 mb-4 border-b ${themeClasses.border}`}>
              {['notes', 'design', 'marketing', 'production'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                    activeTab === tab
                      ? `${themeClasses.text} border-b-2 border-blue-500`
                      : `${themeClasses.textSecondary} hover:${themeClasses.text}`
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <textarea
              value={formData[activeTab]}
              onChange={(e) => handleInputChange(activeTab, e.target.value)}
              placeholder={`Enter notes for ${activeTab}...`}
              className={`w-full ${themeClasses.inputBg} ${themeClasses.text} ${themeClasses.border} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
              rows={6}
            />
          </div>
        </div>
      </div>

      {/* Footer - Fixed */}
      <div className={`${themeClasses.card} ${themeClasses.border} border-t px-6 py-4 flex justify-end gap-3`} style={{ flexShrink: 0 }}>
        <button
          onClick={handleCancel}
          className={`px-6 py-2.5 rounded-xl font-medium text-sm transition-all ${
            isDarkMode
              ? 'bg-dark-bg-tertiary text-dark-text-primary hover:bg-dark-bg-primary'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          className="px-6 py-2.5 rounded-xl font-medium text-sm bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-md hover:shadow-lg"
        >
          Submit Product
        </button>
      </div>
    </div>
  );
};

export default ProductForm;


