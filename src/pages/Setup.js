import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '../context/CompanyContext';
import { useTheme } from '../context/ThemeContext';
import { toast } from 'sonner';

const Setup = () => {
  const navigate = useNavigate();
  const { updateCompany, addBrand, addSalesAccount } = useCompany();
  const { isDarkMode } = useTheme();
  
  const [step, setStep] = useState(1);
  const [companyData, setCompanyData] = useState({
    name: '',
    logoUrl: '',
    website: ''
  });
  const [brandsData, setBrandsData] = useState([{ name: '', description: '' }]);
  const [accountsData, setAccountsData] = useState([{ name: '', marketplace: 'Amazon US' }]);

  const themeClasses = {
    bg: isDarkMode ? 'bg-dark-bg-primary' : 'bg-gray-50',
    cardBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    inputBg: isDarkMode ? 'bg-dark-bg-tertiary' : 'bg-white',
  };

  const handleNext = () => {
    if (step === 1 && !companyData.name) {
      toast.error('Please enter your company name');
      return;
    }
    if (step === 2 && brandsData.every(b => !b.name)) {
      toast.error('Please add at least one brand');
      return;
    }
    if (step === 3 && accountsData.every(a => !a.name)) {
      toast.error('Please add at least one sales account');
      return;
    }
    setStep(prev => prev + 1);
  };

  const handleComplete = () => {
    // Save company data
    updateCompany(companyData);
    
    // Save brands
    brandsData.forEach(brand => {
      if (brand.name) {
        addBrand(brand);
      }
    });
    
    // Save sales accounts
    accountsData.forEach(account => {
      if (account.name) {
        addSalesAccount(account);
      }
    });
    
    toast.success('Setup complete! Welcome to your dashboard.');
    navigate('/dashboard');
  };

  const addBrandField = () => {
    setBrandsData([...brandsData, { name: '', description: '' }]);
  };

  const addAccountField = () => {
    setAccountsData([...accountsData, { name: '', marketplace: 'Amazon US' }]);
  };

  const updateBrandField = (index, field, value) => {
    const updated = [...brandsData];
    updated[index][field] = value;
    setBrandsData(updated);
  };

  const updateAccountField = (index, field, value) => {
    const updated = [...accountsData];
    updated[index][field] = value;
    setAccountsData(updated);
  };

  const removeBrandField = (index) => {
    if (brandsData.length > 1) {
      setBrandsData(brandsData.filter((_, i) => i !== index));
    }
  };

  const removeAccountField = (index) => {
    if (accountsData.length > 1) {
      setAccountsData(accountsData.filter((_, i) => i !== index));
    }
  };

  return (
    <div className={`min-h-screen ${themeClasses.bg} flex items-center justify-center p-4`}>
      <div className={`max-w-2xl w-full ${themeClasses.cardBg} rounded-2xl shadow-2xl p-8`}>
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🍌</div>
          <h1 className={`text-3xl font-bold ${themeClasses.text} mb-2`}>
            Welcome to 1000 Bananas
          </h1>
          <p className={themeClasses.textSecondary}>
            Let's set up your product management workspace
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`flex-1 h-2 rounded-full mx-1 ${
                  s <= step
                    ? 'bg-gradient-to-r from-purple-500 to-orange-400'
                    : isDarkMode ? 'bg-dark-bg-tertiary' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs">
            <span className={step >= 1 ? themeClasses.text : themeClasses.textSecondary}>Company</span>
            <span className={step >= 2 ? themeClasses.text : themeClasses.textSecondary}>Brands</span>
            <span className={step >= 3 ? themeClasses.text : themeClasses.textSecondary}>Accounts</span>
          </div>
        </div>

        {/* Step 1: Company Information */}
        {step === 1 && (
          <div>
            <h2 className={`text-xl font-semibold ${themeClasses.text} mb-4`}>
              Company Information
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                  Company Name *
                </label>
                <input
                  type="text"
                  value={companyData.name}
                  onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                  className={`w-full px-4 py-3 border ${themeClasses.border} rounded-lg ${themeClasses.inputBg} ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="e.g., Acme Products Inc."
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                  Logo URL (Optional)
                </label>
                <input
                  type="url"
                  value={companyData.logoUrl}
                  onChange={(e) => setCompanyData({ ...companyData, logoUrl: e.target.value })}
                  className={`w-full px-4 py-3 border ${themeClasses.border} rounded-lg ${themeClasses.inputBg} ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="https://example.com/logo.png"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                  Website (Optional)
                </label>
                <input
                  type="url"
                  value={companyData.website}
                  onChange={(e) => setCompanyData({ ...companyData, website: e.target.value })}
                  className={`w-full px-4 py-3 border ${themeClasses.border} rounded-lg ${themeClasses.inputBg} ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="https://yourcompany.com"
                />
              </div>
            </div>

            <button
              onClick={handleNext}
              className="w-full mt-6 bg-gradient-to-r from-purple-500 to-orange-400 text-white py-3 rounded-lg hover:shadow-lg transition-all font-medium"
            >
              Next Step →
            </button>
          </div>
        )}

        {/* Step 2: Brands */}
        {step === 2 && (
          <div>
            <h2 className={`text-xl font-semibold ${themeClasses.text} mb-2`}>
              Your Brands
            </h2>
            <p className={`${themeClasses.textSecondary} text-sm mb-4`}>
              Add the product brands you manage
            </p>

            <div className="space-y-3 mb-4">
              {brandsData.map((brand, index) => (
                <div key={index} className={`p-4 border ${themeClasses.border} rounded-lg`}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1 space-y-3">
                      <input
                        type="text"
                        value={brand.name}
                        onChange={(e) => updateBrandField(index, 'name', e.target.value)}
                        className={`w-full px-3 py-2 border ${themeClasses.border} rounded-lg ${themeClasses.inputBg} ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm`}
                        placeholder="Brand Name"
                      />
                      <input
                        type="text"
                        value={brand.description}
                        onChange={(e) => updateBrandField(index, 'description', e.target.value)}
                        className={`w-full px-3 py-2 border ${themeClasses.border} rounded-lg ${themeClasses.inputBg} ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm`}
                        placeholder="Description (optional)"
                      />
                    </div>
                    {brandsData.length > 1 && (
                      <button
                        onClick={() => removeBrandField(index)}
                        className="text-red-500 hover:text-red-600 p-1"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={addBrandField}
              className={`w-full mb-6 py-2 border-2 border-dashed ${themeClasses.border} rounded-lg ${themeClasses.text} hover:border-blue-500 hover:text-blue-500 transition-colors`}
            >
              + Add Another Brand
            </button>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className={`flex-1 py-3 border ${themeClasses.border} rounded-lg ${themeClasses.text} hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary transition-colors`}
              >
                ← Back
              </button>
              <button
                onClick={handleNext}
                className="flex-1 bg-gradient-to-r from-purple-500 to-orange-400 text-white py-3 rounded-lg hover:shadow-lg transition-all font-medium"
              >
                Next Step →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Sales Accounts */}
        {step === 3 && (
          <div>
            <h2 className={`text-xl font-semibold ${themeClasses.text} mb-2`}>
              Sales Accounts
            </h2>
            <p className={`${themeClasses.textSecondary} text-sm mb-4`}>
              Add your marketplace seller accounts
            </p>

            <div className="space-y-3 mb-4">
              {accountsData.map((account, index) => (
                <div key={index} className={`p-4 border ${themeClasses.border} rounded-lg`}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1 space-y-3">
                      <input
                        type="text"
                        value={account.name}
                        onChange={(e) => updateAccountField(index, 'name', e.target.value)}
                        className={`w-full px-3 py-2 border ${themeClasses.border} rounded-lg ${themeClasses.inputBg} ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm`}
                        placeholder="Account Name"
                      />
                      <select
                        value={account.marketplace}
                        onChange={(e) => updateAccountField(index, 'marketplace', e.target.value)}
                        className={`w-full px-3 py-2 border ${themeClasses.border} rounded-lg ${themeClasses.inputBg} ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm`}
                      >
                        <option value="Amazon US">Amazon US</option>
                        <option value="Amazon UK">Amazon UK</option>
                        <option value="Amazon CA">Amazon CA</option>
                        <option value="Amazon DE">Amazon DE</option>
                        <option value="Amazon FR">Amazon FR</option>
                        <option value="Amazon JP">Amazon JP</option>
                        <option value="Walmart">Walmart</option>
                        <option value="eBay">eBay</option>
                      </select>
                    </div>
                    {accountsData.length > 1 && (
                      <button
                        onClick={() => removeAccountField(index)}
                        className="text-red-500 hover:text-red-600 p-1"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={addAccountField}
              className={`w-full mb-6 py-2 border-2 border-dashed ${themeClasses.border} rounded-lg ${themeClasses.text} hover:border-blue-500 hover:text-blue-500 transition-colors`}
            >
              + Add Another Account
            </button>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className={`flex-1 py-3 border ${themeClasses.border} rounded-lg ${themeClasses.text} hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary transition-colors`}
              >
                ← Back
              </button>
              <button
                onClick={handleComplete}
                className="flex-1 bg-gradient-to-r from-purple-500 to-orange-400 text-white py-3 rounded-lg hover:shadow-lg transition-all font-medium"
              >
                Complete Setup ✓
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Setup;


