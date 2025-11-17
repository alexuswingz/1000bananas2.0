import React, { createContext, useState, useContext, useEffect } from 'react';

const CompanyContext = createContext();

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within CompanyProvider');
  }
  return context;
};

export const CompanyProvider = ({ children }) => {
  const [company, setCompany] = useState(null);
  const [brands, setBrands] = useState([]);
  const [salesAccounts, setSalesAccounts] = useState([]);
  const [productTemplates, setProductTemplates] = useState([]);
  const [workspaceModules, setWorkspaceModules] = useState([]);
  const [statusWorkflows, setStatusWorkflows] = useState([]);
  const [productModules, setProductModules] = useState([]);
  const [customFields, setCustomFields] = useState([]);
  const [loading, setLoading] = useState(true);

  // Default status workflows
  const defaultStatuses = [
    { id: 'launched', name: 'Launched', color: '#10B981', order: 1 },
    { id: 'in-progress', name: 'In Progress', color: '#3B82F6', order: 2 },
    { id: 'contender', name: 'Contender', color: '#F59E0B', order: 3 },
    { id: 'revisit', name: 'Revisit', color: '#8B5CF6', order: 4 },
    { id: 'rejected', name: 'Rejected', color: '#EF4444', order: 5 }
  ];

  // Default product modules
  const defaultProductModules = [
    { id: 'selection', name: 'Selection', enabled: true, icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4', order: 1 },
    { id: 'development', name: 'Development', enabled: true, icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4', order: 2 },
    { id: 'catalog', name: 'Catalog', enabled: true, icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z', order: 3 }
  ];

  // Default custom fields
  const defaultCustomFields = [
    { id: 'status', name: 'Status', type: 'dropdown', required: true, order: 1, system: true },
    { id: 'account', name: 'Account', type: 'dropdown', required: true, order: 2, system: true },
    { id: 'brand', name: 'Brand', type: 'dropdown', required: true, order: 3, system: true },
    { id: 'product', name: 'Product', type: 'text', required: true, order: 4, system: true },
    { id: 'searchVol', name: 'Search Volume', type: 'number', required: false, order: 5, system: true }
  ];

  // Default modules configuration
  const defaultModules = [
    { id: 'dashboard', name: 'Dashboard', enabled: true, icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', visibleColumns: ['status', 'account', 'brand', 'product', 'searchVol'] },
    { id: 'design', name: 'Design', enabled: true, icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01', visibleColumns: ['status', 'account', 'brand', 'product', 'searchVol'] },
    { id: 'listing', name: 'Listing', enabled: true, icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4', visibleColumns: ['status', 'account', 'brand', 'product', 'searchVol'] },
    { id: 'ads', name: 'Ads', enabled: true, icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z', visibleColumns: ['status', 'account', 'brand', 'product', 'searchVol'] },
    { id: 'formula', name: 'Formula', enabled: true, icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z', visibleColumns: ['status', 'account', 'brand', 'product', 'searchVol'] }
  ];

  // Load company data from localStorage on mount
  useEffect(() => {
    const savedCompany = localStorage.getItem('company');
    const savedBrands = localStorage.getItem('brands');
    const savedAccounts = localStorage.getItem('salesAccounts');
    const savedTemplates = localStorage.getItem('productTemplates');
    const savedModules = localStorage.getItem('workspaceModules');
    const savedStatuses = localStorage.getItem('statusWorkflows');
    const savedProductModules = localStorage.getItem('productModules');
    const savedCustomFields = localStorage.getItem('customFields');

    if (savedCompany) {
      setCompany(JSON.parse(savedCompany));
    }
    if (savedBrands) {
      setBrands(JSON.parse(savedBrands));
    }
    if (savedAccounts) {
      setSalesAccounts(JSON.parse(savedAccounts));
    }
    if (savedTemplates) {
      setProductTemplates(JSON.parse(savedTemplates));
    }
    if (savedModules) {
      setWorkspaceModules(JSON.parse(savedModules));
    } else {
      setWorkspaceModules(defaultModules);
    }
    if (savedStatuses) {
      setStatusWorkflows(JSON.parse(savedStatuses));
    } else {
      setStatusWorkflows(defaultStatuses);
    }
    if (savedProductModules) {
      setProductModules(JSON.parse(savedProductModules));
    } else {
      setProductModules(defaultProductModules);
    }
    if (savedCustomFields) {
      setCustomFields(JSON.parse(savedCustomFields));
    } else {
      setCustomFields(defaultCustomFields);
    }
    
    setLoading(false);
  }, []);

  // Save to localStorage whenever data changes
  useEffect(() => {
    if (company) {
      localStorage.setItem('company', JSON.stringify(company));
    }
  }, [company]);

  useEffect(() => {
    localStorage.setItem('brands', JSON.stringify(brands));
  }, [brands]);

  useEffect(() => {
    localStorage.setItem('salesAccounts', JSON.stringify(salesAccounts));
  }, [salesAccounts]);

  useEffect(() => {
    localStorage.setItem('productTemplates', JSON.stringify(productTemplates));
  }, [productTemplates]);

  useEffect(() => {
    if (workspaceModules.length > 0) {
      localStorage.setItem('workspaceModules', JSON.stringify(workspaceModules));
    }
  }, [workspaceModules]);

  useEffect(() => {
    if (statusWorkflows.length > 0) {
      localStorage.setItem('statusWorkflows', JSON.stringify(statusWorkflows));
    }
  }, [statusWorkflows]);

  useEffect(() => {
    if (productModules.length > 0) {
      localStorage.setItem('productModules', JSON.stringify(productModules));
    }
  }, [productModules]);

  useEffect(() => {
    if (customFields.length > 0) {
      localStorage.setItem('customFields', JSON.stringify(customFields));
    }
  }, [customFields]);

  const updateCompany = (updates) => {
    setCompany(prev => ({ ...prev, ...updates }));
  };

  const addBrand = (brand) => {
    const newBrand = {
      id: Date.now().toString(),
      ...brand,
      createdAt: new Date().toISOString()
    };
    setBrands(prev => [...prev, newBrand]);
    return newBrand;
  };

  const updateBrand = (id, updates) => {
    setBrands(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const deleteBrand = (id) => {
    setBrands(prev => prev.filter(b => b.id !== id));
  };

  const addSalesAccount = (account) => {
    const newAccount = {
      id: Date.now().toString(),
      ...account,
      createdAt: new Date().toISOString()
    };
    setSalesAccounts(prev => [...prev, newAccount]);
    return newAccount;
  };

  const updateSalesAccount = (id, updates) => {
    setSalesAccounts(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const deleteSalesAccount = (id) => {
    setSalesAccounts(prev => prev.filter(a => a.id !== id));
  };

  const addProductTemplate = (template) => {
    const newTemplate = {
      id: Date.now().toString(),
      ...template,
      createdAt: new Date().toISOString()
    };
    setProductTemplates(prev => [...prev, newTemplate]);
    return newTemplate;
  };

  const updateProductTemplate = (id, updates) => {
    setProductTemplates(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const deleteProductTemplate = (id) => {
    setProductTemplates(prev => prev.filter(t => t.id !== id));
  };

  const getProductTemplate = (id) => {
    return productTemplates.find(t => t.id === id);
  };

  const updateWorkspaceModule = (id, updates) => {
    setWorkspaceModules(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const getWorkspaceModule = (id) => {
    return workspaceModules.find(m => m.id === id);
  };

  const getEnabledWorkspaceModules = () => {
    return workspaceModules.filter(m => m.enabled);
  };

  // Status Workflow Management
  const addStatus = (status) => {
    const newStatus = {
      id: Date.now().toString(),
      ...status,
      order: statusWorkflows.length + 1
    };
    setStatusWorkflows(prev => [...prev, newStatus]);
    return newStatus;
  };

  const updateStatus = (id, updates) => {
    setStatusWorkflows(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const deleteStatus = (id) => {
    setStatusWorkflows(prev => prev.filter(s => s.id !== id));
  };

  const reorderStatuses = (newOrder) => {
    setStatusWorkflows(newOrder);
  };

  // Product Modules Management
  const updateProductModule = (id, updates) => {
    setProductModules(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const getEnabledProductModules = () => {
    return productModules.filter(m => m.enabled).sort((a, b) => a.order - b.order);
  };

  // Custom Fields Management
  const addCustomField = (field) => {
    const newField = {
      id: Date.now().toString(),
      ...field,
      order: customFields.length + 1,
      system: false
    };
    setCustomFields(prev => [...prev, newField]);
    return newField;
  };

  const updateCustomField = (id, updates) => {
    setCustomFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const deleteCustomField = (id) => {
    // Only allow deleting non-system fields
    setCustomFields(prev => prev.filter(f => f.id !== id || f.system));
  };

  const reorderCustomFields = (newOrder) => {
    setCustomFields(newOrder);
  };

  const getVisibleCustomFields = () => {
    return customFields.filter(f => !f.hidden).sort((a, b) => a.order - b.order);
  };

  const resetCompany = () => {
    localStorage.removeItem('company');
    localStorage.removeItem('brands');
    localStorage.removeItem('salesAccounts');
    localStorage.removeItem('productTemplates');
    localStorage.removeItem('workspaceModules');
    localStorage.removeItem('statusWorkflows');
    localStorage.removeItem('productModules');
    localStorage.removeItem('customFields');
    setCompany(null);
    setBrands([]);
    setSalesAccounts([]);
    setProductTemplates([]);
    setWorkspaceModules([]);
    setStatusWorkflows([]);
    setProductModules([]);
    setCustomFields([]);
  };

  const isSetupComplete = () => {
    return company && company.name && brands.length > 0 && salesAccounts.length > 0;
  };

  return (
    <CompanyContext.Provider
      value={{
        company,
        brands,
        salesAccounts,
        productTemplates,
        workspaceModules,
        statusWorkflows,
        productModules,
        customFields,
        loading,
        updateCompany,
        addBrand,
        updateBrand,
        deleteBrand,
        addSalesAccount,
        updateSalesAccount,
        deleteSalesAccount,
        addProductTemplate,
        updateProductTemplate,
        deleteProductTemplate,
        getProductTemplate,
        updateWorkspaceModule,
        getWorkspaceModule,
        getEnabledWorkspaceModules,
        addStatus,
        updateStatus,
        deleteStatus,
        reorderStatuses,
        updateProductModule,
        getEnabledProductModules,
        addCustomField,
        updateCustomField,
        deleteCustomField,
        reorderCustomFields,
        getVisibleCustomFields,
        resetCompany,
        isSetupComplete
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
};

