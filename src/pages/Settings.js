import React, { useState } from 'react';
import { useCompany } from '../context/CompanyContext';
import { useTheme } from '../context/ThemeContext';
import { useDialog } from '../context/DialogContext';
import ProductTemplateModal from '../components/ProductTemplateModal';
import AmazonSync from '../components/AmazonSync';
import { toast } from 'sonner';

const Settings = () => {
  const { company, brands, salesAccounts, productTemplates, workspaceModules, statusWorkflows, productModules, customFields, updateCompany, addBrand, updateBrand, deleteBrand, addSalesAccount, updateSalesAccount, deleteSalesAccount, addProductTemplate, updateProductTemplate, deleteProductTemplate, updateWorkspaceModule, addStatus, updateStatus, deleteStatus, updateProductModule, addCustomField, updateCustomField, deleteCustomField, resetCompany } = useCompany();
  const { isDarkMode } = useTheme();
  const { showDialog } = useDialog();
  
  const [activeTab, setActiveTab] = useState('company');
  const [editingCompany, setEditingCompany] = useState(company || {});
  const [newBrand, setNewBrand] = useState({ name: '', description: '' });
  const [newAccount, setNewAccount] = useState({ name: '', marketplace: 'Amazon US' });
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showAmazonSync, setShowAmazonSync] = useState(false);

  const themeClasses = {
    bg: isDarkMode ? 'bg-dark-bg-primary' : 'bg-gray-50',
    cardBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    inputBg: isDarkMode ? 'bg-dark-bg-tertiary' : 'bg-white',
  };

  const handleSaveCompany = () => {
    updateCompany(editingCompany);
    toast.success('Company information updated!');
  };

  const handleAddBrand = () => {
    if (!newBrand.name) {
      toast.error('Please enter a brand name');
      return;
    }
    addBrand(newBrand);
    setNewBrand({ name: '', description: '' });
    toast.success(`Brand "${newBrand.name}" added!`);
  };

  const handleDeleteBrand = (id, name) => {
    showDialog({
      title: 'Delete Brand',
      message: `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
      onConfirm: () => {
        deleteBrand(id);
        toast.success('Brand deleted');
      }
    });
  };

  const handleAddAccount = () => {
    if (!newAccount.name) {
      toast.error('Please enter an account name');
      return;
    }
    addSalesAccount(newAccount);
    setNewAccount({ name: '', marketplace: 'Amazon US' });
    toast.success(`Account "${newAccount.name}" added!`);
  };

  const handleDeleteAccount = (id, name) => {
    showDialog({
      title: 'Delete Sales Account',
      message: `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
      onConfirm: () => {
        deleteSalesAccount(id);
        toast.success('Account deleted');
      }
    });
  };

  const handleSaveTemplate = (templateData) => {
    if (editingTemplate) {
      updateProductTemplate(editingTemplate.id, templateData);
    } else {
      addProductTemplate(templateData);
    }
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setShowTemplateModal(true);
  };

  const handleDeleteTemplate = (id, name) => {
    showDialog({
      title: 'Delete Product Template',
      message: `Are you sure you want to delete "${name}"? Products using this template will not be affected.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
      onConfirm: () => {
        deleteProductTemplate(id);
        toast.success('Template deleted');
      }
    });
  };

  const handleResetAll = () => {
    showDialog({
      title: 'Reset All Data',
      message: 'This will delete all your company data, brands, and accounts. This action cannot be undone. Are you absolutely sure?',
      confirmText: 'Yes, Reset Everything',
      cancelText: 'Cancel',
      type: 'danger',
      onConfirm: () => {
        resetCompany();
        toast.success('All data has been reset');
        window.location.href = '/setup';
      }
    });
  };

  const tabs = [
    { 
      id: 'company', 
      label: 'Company Info', 
      icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
      category: 'General'
    },
    { 
      id: 'brands', 
      label: 'Brands', 
      icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z',
      category: 'General'
    },
    { 
      id: 'accounts', 
      label: 'Sales Accounts', 
      icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z',
      category: 'General'
    },
    { 
      id: 'templates', 
      label: 'Product Templates', 
      icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
      category: 'Products'
    },
    { 
      id: 'statuses', 
      label: 'Status Workflow', 
      icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      category: 'Products'
    },
    { 
      id: 'productModules', 
      label: 'Product Modules', 
      icon: 'M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3z',
      category: 'Products'
    },
    { 
      id: 'customFields', 
      label: 'Custom Fields', 
      icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4',
      category: 'Products'
    },
    { 
      id: 'workspaces', 
      label: 'Workspace Modules', 
      icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z',
      category: 'Workspaces'
    },
    { 
      id: 'amazon', 
      label: 'Amazon SP-API', 
      icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4',
      category: 'Integrations'
    },
  ];

  // Group tabs by category
  const tabsByCategory = tabs.reduce((acc, tab) => {
    if (!acc[tab.category]) acc[tab.category] = [];
    acc[tab.category].push(tab);
    return acc;
  }, {});

  return (
    <div className={`${themeClasses.bg} min-h-screen`}>
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-3xl font-bold ${themeClasses.text} mb-2`}>Settings</h1>
          <p className={themeClasses.textSecondary}>Configure your workspace and manage your organization</p>
        </div>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-12 gap-6 pb-8">
          {/* Sidebar Navigation */}
          <div className="col-span-12 lg:col-span-3">
            <div className={`${themeClasses.cardBg} rounded-xl border ${themeClasses.border} shadow-sm lg:sticky lg:top-8 lg:max-h-[calc(100vh-200px)] overflow-y-auto`}>
              <div className="p-4">
                <div className="space-y-1">
                  {Object.keys(tabsByCategory).map((category) => (
                    <div key={category}>
                      <div className={`px-3 py-2 text-xs font-semibold ${themeClasses.textSecondary} uppercase tracking-wider`}>
                        {category}
                      </div>
                      {tabsByCategory[category].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all ${
                            activeTab === tab.id
                              ? 'bg-gradient-to-r from-purple-500 to-orange-400 text-white shadow-md'
                              : `${themeClasses.text} hover:bg-purple-500/10 hover:text-purple-600`
                          }`}
                        >
                          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                          </svg>
                          <span className="text-sm">{tab.label}</span>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="col-span-12 lg:col-span-9">
            <div className={`${themeClasses.cardBg} rounded-xl border ${themeClasses.border} shadow-sm`}>
              <div className="p-8">
            {/* Company Info Tab */}
            {activeTab === 'company' && (
              <div className="space-y-6">
                {/* Section Header */}
                <div className="border-b ${themeClasses.border} pb-4">
                  <h2 className={`text-2xl font-bold ${themeClasses.text} mb-1`}>Company Information</h2>
                  <p className={themeClasses.textSecondary}>Manage your company profile and branding</p>
                </div>
                
                <div>
                  <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>Company Name</label>
                  <input
                    type="text"
                    value={editingCompany.name || ''}
                    onChange={(e) => setEditingCompany({ ...editingCompany, name: e.target.value })}
                    className={`w-full px-4 py-3 border ${themeClasses.border} rounded-lg ${themeClasses.inputBg} ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>Logo URL</label>
                  <input
                    type="url"
                    value={editingCompany.logoUrl || ''}
                    onChange={(e) => setEditingCompany({ ...editingCompany, logoUrl: e.target.value })}
                    className={`w-full px-4 py-3 border ${themeClasses.border} rounded-lg ${themeClasses.inputBg} ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="https://example.com/logo.png"
                  />
                  {editingCompany.logoUrl && (
                    <div className="mt-3">
                      <p className={`text-sm ${themeClasses.textSecondary} mb-2`}>Preview:</p>
                      <img src={editingCompany.logoUrl} alt="Logo" className="w-24 h-24 object-contain rounded-lg border ${themeClasses.border}" />
                    </div>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>Website</label>
                  <input
                    type="url"
                    value={editingCompany.website || ''}
                    onChange={(e) => setEditingCompany({ ...editingCompany, website: e.target.value })}
                    className={`w-full px-4 py-3 border ${themeClasses.border} rounded-lg ${themeClasses.inputBg} ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="https://yourcompany.com"
                  />
                </div>

                <button
                  onClick={handleSaveCompany}
                  className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors font-medium"
                >
                  Save Changes
                </button>

                <div className={`mt-12 pt-6 border-t ${themeClasses.border}`}>
                  <h3 className={`text-lg font-semibold ${themeClasses.text} mb-2`}>Danger Zone</h3>
                  <p className={`${themeClasses.textSecondary} text-sm mb-4`}>
                    Reset all your data and start from scratch. This action cannot be undone.
                  </p>
                  <button
                    onClick={handleResetAll}
                    className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors font-medium"
                  >
                    Reset All Data
                  </button>
                </div>
              </div>
            )}

            {/* Brands Tab */}
            {activeTab === 'brands' && (
              <div className="space-y-6">
                {/* Section Header */}
                <div className="border-b ${themeClasses.border} pb-4">
                  <h2 className={`text-2xl font-bold ${themeClasses.text} mb-1`}>Brands</h2>
                  <p className={themeClasses.textSecondary}>Manage your product brands and labels</p>
                </div>
                
                <div className={`p-4 border-2 border-dashed ${themeClasses.border} rounded-lg`}>
                  <h3 className={`text-sm font-semibold ${themeClasses.text} mb-3`}>Add New Brand</h3>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={newBrand.name}
                      onChange={(e) => setNewBrand({ ...newBrand, name: e.target.value })}
                      className={`w-full px-4 py-2 border ${themeClasses.border} rounded-lg ${themeClasses.inputBg} ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      placeholder="Brand Name"
                    />
                    <input
                      type="text"
                      value={newBrand.description}
                      onChange={(e) => setNewBrand({ ...newBrand, description: e.target.value })}
                      className={`w-full px-4 py-2 border ${themeClasses.border} rounded-lg ${themeClasses.inputBg} ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      placeholder="Description (optional)"
                    />
                    <button
                      onClick={handleAddBrand}
                      className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors font-medium"
                    >
                      Add Brand
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {brands.length === 0 ? (
                    <p className={`text-center py-8 ${themeClasses.textSecondary}`}>No brands yet. Add your first brand above!</p>
                  ) : (
                    brands.map(brand => (
                      <div key={brand.id} className={`p-4 border ${themeClasses.border} rounded-lg flex items-start justify-between`}>
                        <div>
                          <h4 className={`font-semibold ${themeClasses.text}`}>{brand.name}</h4>
                          {brand.description && (
                            <p className={`text-sm ${themeClasses.textSecondary} mt-1`}>{brand.description}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteBrand(brand.id, brand.name)}
                          className="text-red-500 hover:text-red-600 p-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Amazon SP-API Tab */}
            {activeTab === 'amazon' && (
              <div className="space-y-6">
                {/* Section Header */}
                <div className="border-b ${themeClasses.border} pb-4">
                  <h2 className={`text-2xl font-bold ${themeClasses.text} mb-1`}>Amazon Integration</h2>
                  <p className={themeClasses.textSecondary}>Sync products from Amazon Selling Partner API</p>
                </div>
                
                <div className={`p-6 border ${themeClasses.border} rounded-lg bg-gradient-to-br ${isDarkMode ? 'from-blue-900/20 to-purple-900/20' : 'from-blue-50 to-purple-50'}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className={`text-lg font-semibold ${themeClasses.text} mb-2`}>Amazon Selling Partner API</h3>
                      <p className={`text-sm ${themeClasses.textSecondary}`}>
                        Import and sync your products from Amazon Seller Central
                      </p>
                    </div>
                    <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-white/5' : 'bg-white/80'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className={`text-sm font-medium ${themeClasses.text}`}>SP-API Credentials Configured</span>
                      </div>
                      <p className={`text-xs ${themeClasses.textSecondary} ml-6`}>
                        Your credentials are stored in .env.local
                      </p>
                    </div>
                    
                    <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-white/5' : 'bg-white/80'}`}>
                      <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-yellow-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <span className={`text-sm font-medium ${themeClasses.text}`}>Backend Server Required</span>
                          <p className={`text-xs ${themeClasses.textSecondary} mt-0.5`}>
                            SP-API requires a backend server for security. Make sure to run: <code className="px-1 py-0.5 rounded bg-gray-700 text-gray-100">npm run server</code>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowAmazonSync(true)}
                    className="w-full bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Sync Products from Amazon
                  </button>
                </div>

                <div className={`p-4 border ${themeClasses.border} rounded-lg`}>
                  <h4 className={`text-sm font-semibold ${themeClasses.text} mb-3`}>What gets synced:</h4>
                  <ul className={`space-y-2 text-sm ${themeClasses.textSecondary}`}>
                    <li className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>Product names and descriptions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>ASINs and SKUs (Seller & Fulfillment)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>Current inventory levels</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>Product condition and status</span>
                    </li>
                  </ul>
                </div>

                <div className={`p-4 border ${themeClasses.border} rounded-lg ${isDarkMode ? 'bg-yellow-900/10' : 'bg-yellow-50'}`}>
                  <div className="flex gap-2">
                    <svg className="w-5 h-5 text-yellow-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className={`text-sm font-medium ${themeClasses.text} mb-1`}>Setup Instructions:</p>
                      <ol className={`text-xs ${themeClasses.textSecondary} space-y-1 list-decimal list-inside`}>
                        <li>Run <code className="px-1 py-0.5 rounded bg-gray-700 text-gray-100">install-backend.bat</code> to install dependencies</li>
                        <li>Start the backend: <code className="px-1 py-0.5 rounded bg-gray-700 text-gray-100">npm run server</code></li>
                        <li>Or run both together: <code className="px-1 py-0.5 rounded bg-gray-700 text-gray-100">npm run dev</code></li>
                        <li>Click "Sync Products from Amazon" above</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sales Accounts Tab */}
            {activeTab === 'accounts' && (
              <div className="space-y-6">
                {/* Section Header */}
                <div className="border-b ${themeClasses.border} pb-4">
                  <h2 className={`text-2xl font-bold ${themeClasses.text} mb-1`}>Sales Accounts</h2>
                  <p className={themeClasses.textSecondary}>Configure your marketplace and sales channels</p>
                </div>
                
                <div className={`p-4 border-2 border-dashed ${themeClasses.border} rounded-lg`}>
                  <h3 className={`text-sm font-semibold ${themeClasses.text} mb-3`}>Add New Sales Account</h3>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={newAccount.name}
                      onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                      className={`w-full px-4 py-2 border ${themeClasses.border} rounded-lg ${themeClasses.inputBg} ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      placeholder="Account Name"
                    />
                    <select
                      value={newAccount.marketplace}
                      onChange={(e) => setNewAccount({ ...newAccount, marketplace: e.target.value })}
                      className={`w-full px-4 py-2 border ${themeClasses.border} rounded-lg ${themeClasses.inputBg} ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
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
                    <button
                      onClick={handleAddAccount}
                      className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors font-medium"
                    >
                      Add Account
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {salesAccounts.length === 0 ? (
                    <p className={`text-center py-8 ${themeClasses.textSecondary}`}>No sales accounts yet. Add your first account above!</p>
                  ) : (
                    salesAccounts.map(account => (
                      <div key={account.id} className={`p-4 border ${themeClasses.border} rounded-lg flex items-start justify-between`}>
                        <div>
                          <h4 className={`font-semibold ${themeClasses.text}`}>{account.name}</h4>
                          <p className={`text-sm ${themeClasses.textSecondary} mt-1`}>{account.marketplace}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteAccount(account.id, account.name)}
                          className="text-red-500 hover:text-red-600 p-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Product Templates Tab */}
            {activeTab === 'templates' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className={`text-lg font-semibold ${themeClasses.text}`}>Product Templates</h3>
                    <p className={`text-sm ${themeClasses.textSecondary} mt-1`}>
                      Create templates to standardize product configurations with predefined variations and tabs
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingTemplate(null);
                      setShowTemplateModal(true);
                    }}
                    className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-orange-400 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all font-medium"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Template
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {productTemplates.length === 0 ? (
                    <div className={`col-span-full text-center py-12 border-2 border-dashed ${themeClasses.border} rounded-xl`}>
                      <svg className={`w-16 h-16 mx-auto ${themeClasses.textSecondary} mb-4`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                      <h3 className={`text-lg font-semibold ${themeClasses.text} mb-2`}>No templates yet</h3>
                      <p className={`${themeClasses.textSecondary} mb-4`}>
                        Create your first product template to streamline product creation
                      </p>
                      <button
                        onClick={() => {
                          setEditingTemplate(null);
                          setShowTemplateModal(true);
                        }}
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-orange-400 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all font-medium"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create First Template
                      </button>
                    </div>
                  ) : (
                    productTemplates.map(template => (
                      <div key={template.id} className={`p-6 border ${themeClasses.border} rounded-xl ${themeClasses.cardBg} hover:shadow-lg transition-all`}>
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h4 className={`text-lg font-semibold ${themeClasses.text}`}>{template.name}</h4>
                            {template.description && (
                              <p className={`text-sm ${themeClasses.textSecondary} mt-1`}>{template.description}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditTemplate(template)}
                              className="text-blue-500 hover:text-blue-600 p-2"
                              title="Edit template"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteTemplate(template.id, template.name)}
                              className="text-red-500 hover:text-red-600 p-2"
                              title="Delete template"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm">
                            <svg className={`w-4 h-4 ${themeClasses.textSecondary}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                            <span className={themeClasses.text}>
                              <strong>Type:</strong> {template.variationType.charAt(0).toUpperCase() + template.variationType.slice(1)}
                            </span>
                          </div>

                          <div className="flex items-start gap-2 text-sm">
                            <svg className={`w-4 h-4 ${themeClasses.textSecondary} mt-0.5`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                            </svg>
                            <div>
                              <span className={`${themeClasses.text} font-medium`}>Variations:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {template.defaultVariations.slice(0, 3).map((variation, idx) => (
                                  <span key={idx} className={`text-xs px-2 py-0.5 ${themeClasses.inputBg} ${themeClasses.text} rounded`}>
                                    {variation}
                                  </span>
                                ))}
                                {template.defaultVariations.length > 3 && (
                                  <span className={`text-xs px-2 py-0.5 ${themeClasses.inputBg} ${themeClasses.textSecondary} rounded`}>
                                    +{template.defaultVariations.length - 3} more
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-sm">
                            <svg className={`w-4 h-4 ${themeClasses.textSecondary}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                            </svg>
                            <span className={themeClasses.text}>
                              <strong>Tabs:</strong> {template.enabledTabs.length === 0 ? 'All tabs' : `${template.enabledTabs.length} selected`}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Status Workflow Tab */}
            {activeTab === 'statuses' && (
              <div className="space-y-6">
                <div className="mb-6">
                  <h3 className={`text-lg font-semibold ${themeClasses.text} mb-2`}>Status Workflow</h3>
                  <p className={`text-sm ${themeClasses.textSecondary}`}>
                    Define the statuses used throughout your product workflow. These will be available in all product tables.
                  </p>
                </div>

                <div className="space-y-3">
                  {statusWorkflows.map((status, index) => (
                    <div key={status.id} className={`p-4 border ${themeClasses.border} rounded-lg ${themeClasses.cardBg} flex items-center gap-4`}>
                      {/* Color Picker */}
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={status.color}
                          onChange={(e) => {
                            updateStatus(status.id, { color: e.target.value });
                            toast.success('Status color updated');
                          }}
                          className="w-12 h-12 rounded cursor-pointer border-2 border-gray-300"
                          title="Choose status color"
                        />
                      </div>

                      {/* Status Name */}
                      <div className="flex-1">
                        <input
                          type="text"
                          value={status.name}
                          onChange={(e) => updateStatus(status.id, { name: e.target.value })}
                          className={`w-full px-3 py-2 border ${themeClasses.border} rounded-lg ${themeClasses.inputBg} ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold`}
                          placeholder="Status Name"
                        />
                        <p className={`text-xs ${themeClasses.textSecondary} mt-1`}>
                          ID: {status.id}
                        </p>
                      </div>

                      {/* Preview Badge */}
                      <div 
                        className="px-3 py-1 rounded-full text-sm font-medium"
                        style={{ backgroundColor: `${status.color}20`, color: status.color }}
                      >
                        {status.name}
                      </div>

                      {/* Delete Button */}
                      {statusWorkflows.length > 1 && (
                        <button
                          onClick={() => {
                            showDialog({
                              title: 'Delete Status',
                              message: `Are you sure you want to delete "${status.name}"? Products using this status will need to be updated.`,
                              confirmText: 'Delete',
                              cancelText: 'Cancel',
                              type: 'danger',
                              onConfirm: () => {
                                deleteStatus(status.id);
                                toast.success('Status deleted');
                              }
                            });
                          }}
                          className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Delete status"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add New Status Button */}
                <button
                  onClick={() => {
                    const newStatus = addStatus({
                      name: 'New Status',
                      color: '#6B7280'
                    });
                    toast.success('Status added');
                  }}
                  className="w-full py-3 border-2 border-dashed ${themeClasses.border} rounded-lg ${themeClasses.text} hover:border-blue-500 hover:text-blue-500 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add New Status
                </button>

                <div className={`p-4 border ${themeClasses.border} rounded-lg bg-blue-50 dark:bg-blue-500/10`}>
                  <div className="flex gap-3">
                    <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className={`text-sm font-semibold ${themeClasses.text} mb-1`}>Status Workflow Tips</h4>
                      <ul className={`text-xs ${themeClasses.textSecondary} space-y-1`}>
                        <li>• Statuses are used across all product modules and tables</li>
                        <li>• Choose colors that clearly differentiate each status</li>
                        <li>• You must have at least one status defined</li>
                        <li>• Common workflows: Idea → Research → Development → Launch → Live</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Product Modules Tab */}
            {activeTab === 'productModules' && (
              <div className="space-y-6">
                <div className="mb-6">
                  <h3 className={`text-lg font-semibold ${themeClasses.text} mb-2`}>Product Modules</h3>
                  <p className={`text-sm ${themeClasses.textSecondary}`}>
                    Configure which product stages appear in your Products menu. Disable modules you don't use or rename them to match your workflow.
                  </p>
                </div>

                <div className="space-y-4">
                  {productModules.map(module => (
                    <div key={module.id} className={`p-6 border ${themeClasses.border} rounded-xl ${themeClasses.cardBg}`}>
                      <div className="flex items-center gap-3">
                        {/* Module Icon */}
                        <div className={`p-2 rounded-lg ${module.enabled ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-500' : 'bg-gray-100 dark:bg-dark-bg-tertiary text-gray-400'}`}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={module.icon} />
                          </svg>
                        </div>

                        {/* Module Name Input */}
                        <div className="flex-1">
                          <input
                            type="text"
                            value={module.name}
                            onChange={(e) => updateProductModule(module.id, { name: e.target.value })}
                            className={`w-full px-3 py-2 border ${themeClasses.border} rounded-lg ${themeClasses.inputBg} ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold`}
                            placeholder="Module Name"
                          />
                          <p className={`text-xs ${themeClasses.textSecondary} mt-1`}>
                            ID: {module.id}
                          </p>
                        </div>

                        {/* Enable/Disable Toggle */}
                        <label className="flex items-center cursor-pointer">
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={module.enabled}
                              onChange={(e) => {
                                updateProductModule(module.id, { enabled: e.target.checked });
                                toast.success(e.target.checked ? `${module.name} enabled` : `${module.name} disabled`);
                              }}
                              className="sr-only"
                            />
                            <div className={`block w-14 h-8 rounded-full transition ${module.enabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition ${module.enabled ? 'transform translate-x-6' : ''}`}></div>
                          </div>
                          <span className={`ml-3 text-sm font-medium ${themeClasses.text}`}>
                            {module.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>

                <div className={`p-4 border ${themeClasses.border} rounded-lg bg-blue-50 dark:bg-blue-500/10`}>
                  <div className="flex gap-3">
                    <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className={`text-sm font-semibold ${themeClasses.text} mb-1`}>Product Module Tips</h4>
                      <ul className={`text-xs ${themeClasses.textSecondary} space-y-1`}>
                        <li>• Disabled modules won't appear in the Products menu</li>
                        <li>• Rename modules to match your product lifecycle stages</li>
                        <li>• Common setups: Selection → Development → Catalog or Research → Testing → Active</li>
                        <li>• Changes apply immediately to the sidebar navigation</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Custom Fields Tab */}
            {activeTab === 'customFields' && (
              <div className="space-y-6">
                <div className="mb-6">
                  <h3 className={`text-lg font-semibold ${themeClasses.text} mb-2`}>Custom Product Fields</h3>
                  <p className={`text-sm ${themeClasses.textSecondary}`}>
                    Add custom fields to track additional product information. System fields cannot be deleted.
                  </p>
                </div>

                <div className="space-y-3">
                  {customFields.map((field, index) => (
                    <div key={field.id} className={`p-4 border ${themeClasses.border} rounded-lg ${themeClasses.cardBg} ${field.system ? 'opacity-75' : ''}`}>
                      <div className="flex items-center gap-4">
                        {/* Field Name */}
                        <div className="flex-1">
                          <input
                            type="text"
                            value={field.name}
                            onChange={(e) => !field.system && updateCustomField(field.id, { name: e.target.value })}
                            disabled={field.system}
                            className={`w-full px-3 py-2 border ${themeClasses.border} rounded-lg ${themeClasses.inputBg} ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold ${field.system ? 'cursor-not-allowed' : ''}`}
                            placeholder="Field Name"
                          />
                        </div>

                        {/* Field Type */}
                        <select
                          value={field.type}
                          onChange={(e) => !field.system && updateCustomField(field.id, { type: e.target.value })}
                          disabled={field.system}
                          className={`px-3 py-2 border ${themeClasses.border} rounded-lg ${themeClasses.inputBg} ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-blue-500 ${field.system ? 'cursor-not-allowed' : ''}`}
                        >
                          <option value="text">Text</option>
                          <option value="number">Number</option>
                          <option value="dropdown">Dropdown</option>
                          <option value="date">Date</option>
                        </select>

                        {/* Required Toggle */}
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) => !field.system && updateCustomField(field.id, { required: e.target.checked })}
                            disabled={field.system}
                            className={`w-4 h-4 ${field.system ? 'cursor-not-allowed' : ''}`}
                          />
                          <span className={`text-sm ${themeClasses.text}`}>Required</span>
                        </label>

                        {/* System Badge or Delete Button */}
                        {field.system ? (
                          <span className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-xs font-medium rounded">
                            System
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              showDialog({
                                title: 'Delete Field',
                                message: `Are you sure you want to delete "${field.name}"?`,
                                confirmText: 'Delete',
                                cancelText: 'Cancel',
                                type: 'danger',
                                onConfirm: () => {
                                  deleteCustomField(field.id);
                                  toast.success('Field deleted');
                                }
                              });
                            }}
                            className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add New Field Button */}
                <button
                  onClick={() => {
                    const newField = addCustomField({
                      name: 'New Field',
                      type: 'text',
                      required: false
                    });
                    toast.success('Field added');
                  }}
                  className="w-full py-3 border-2 border-dashed ${themeClasses.border} rounded-lg ${themeClasses.text} hover:border-blue-500 hover:text-blue-500 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Custom Field
                </button>

                <div className={`p-4 border ${themeClasses.border} rounded-lg bg-blue-50 dark:bg-blue-500/10`}>
                  <div className="flex gap-3">
                    <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className={`text-sm font-semibold ${themeClasses.text} mb-1`}>Custom Fields Tips</h4>
                      <ul className={`text-xs ${themeClasses.textSecondary} space-y-1`}>
                        <li>• System fields (Status, Account, Brand, Product, Search Volume) cannot be deleted</li>
                        <li>• Custom fields will appear in all product tables</li>
                        <li>• Use text fields for names, number for metrics, dropdown for categories</li>
                        <li>• Common fields: ASIN, SKU, Cost, Price, Supplier, MOQ, Lead Time</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Workspace Modules Tab */}
            {activeTab === 'workspaces' && (
              <div className="space-y-6">
                <div className="mb-6">
                  <h3 className={`text-lg font-semibold ${themeClasses.text} mb-2`}>Configure Workspace Modules</h3>
                  <p className={`text-sm ${themeClasses.textSecondary}`}>
                    Customize which modules appear in Team Workspaces, rename them, and configure which columns are visible in each table.
                  </p>
                </div>

                <div className="space-y-4">
                  {workspaceModules.map(module => (
                    <div key={module.id} className={`p-6 border ${themeClasses.border} rounded-xl ${themeClasses.cardBg}`}>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3 flex-1">
                          {/* Module Icon */}
                          <div className={`p-2 rounded-lg ${module.enabled ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-500' : 'bg-gray-100 dark:bg-dark-bg-tertiary text-gray-400'}`}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={module.icon} />
                            </svg>
                          </div>

                          {/* Module Name Input */}
                          <div className="flex-1">
                            <input
                              type="text"
                              value={module.name}
                              onChange={(e) => updateWorkspaceModule(module.id, { name: e.target.value })}
                              className={`w-full px-3 py-2 border ${themeClasses.border} rounded-lg ${themeClasses.inputBg} ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold`}
                              placeholder="Module Name"
                            />
                            <p className={`text-xs ${themeClasses.textSecondary} mt-1`}>
                              ID: {module.id}
                            </p>
                          </div>

                          {/* Enable/Disable Toggle */}
                          <label className="flex items-center cursor-pointer">
                            <div className="relative">
                              <input
                                type="checkbox"
                                checked={module.enabled}
                                onChange={(e) => {
                                  updateWorkspaceModule(module.id, { enabled: e.target.checked });
                                  toast.success(e.target.checked ? `${module.name} enabled` : `${module.name} disabled`);
                                }}
                                className="sr-only"
                              />
                              <div className={`block w-14 h-8 rounded-full transition ${module.enabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                              <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition ${module.enabled ? 'transform translate-x-6' : ''}`}></div>
                            </div>
                            <span className={`ml-3 text-sm font-medium ${themeClasses.text}`}>
                              {module.enabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </label>
                        </div>
                      </div>

                      {/* Visible Columns Configuration */}
                      <div className="mt-4 pt-4 border-t ${themeClasses.border}">
                        <h4 className={`text-sm font-semibold ${themeClasses.text} mb-3`}>Visible Table Columns</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                          {[
                            { id: 'status', label: 'Status' },
                            { id: 'account', label: 'Account' },
                            { id: 'brand', label: 'Brand' },
                            { id: 'product', label: 'Product' },
                            { id: 'searchVol', label: 'Search Volume' }
                          ].map(column => (
                            <label
                              key={column.id}
                              className={`flex items-center gap-2 p-3 border ${themeClasses.border} rounded-lg cursor-pointer transition-colors ${
                                module.visibleColumns.includes(column.id)
                                  ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-500'
                                  : 'hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={module.visibleColumns.includes(column.id)}
                                onChange={(e) => {
                                  const newColumns = e.target.checked
                                    ? [...module.visibleColumns, column.id]
                                    : module.visibleColumns.filter(c => c !== column.id);
                                  
                                  if (newColumns.length === 0) {
                                    toast.error('At least one column must be visible');
                                    return;
                                  }
                                  
                                  updateWorkspaceModule(module.id, { visibleColumns: newColumns });
                                }}
                                className="w-4 h-4"
                              />
                              <span className={`text-sm ${themeClasses.text}`}>{column.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className={`p-4 border ${themeClasses.border} rounded-lg bg-blue-50 dark:bg-blue-500/10`}>
                  <div className="flex gap-3">
                    <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className={`text-sm font-semibold ${themeClasses.text} mb-1`}>Module Configuration Tips</h4>
                      <ul className={`text-xs ${themeClasses.textSecondary} space-y-1`}>
                        <li>• Disable modules you don't use to simplify your workspace navigation</li>
                        <li>• Rename modules to match your company's terminology (e.g., "Design" → "Creative")</li>
                        <li>• Toggle columns to show only the data relevant to each stage of your workflow</li>
                        <li>• Changes are saved automatically and apply immediately</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Template Modal */}
      {showTemplateModal && (
        <ProductTemplateModal
          template={editingTemplate}
          onClose={() => {
            setShowTemplateModal(false);
            setEditingTemplate(null);
          }}
          onSave={handleSaveTemplate}
        />
      )}

      {showAmazonSync && (
        <AmazonSync
          onClose={() => setShowAmazonSync(false)}
        />
      )}
    </div>
  );
};

export default Settings;
