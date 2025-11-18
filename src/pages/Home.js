import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import NgoosAPI from '../services/ngoosApi';
import OpenAIService from '../services/openaiService';
import BananaBrainModal from '../components/BananaBrainModal';

// Combined Sales & Ads Metrics Configuration (matching N-GOOS)
const ALL_METRICS = [
  // Sales Metrics
  {
    id: 'units_sold',
    label: 'Units Sold',
    color: '#4169E1',
    valueKey: 'units_sold',
    formatType: 'number',
    category: 'sales',
    defaultVisible: true
  },
  {
    id: 'sales',
    label: 'Sales',
    color: '#FF8C00',
    valueKey: 'sales',
    formatType: 'currency',
    category: 'sales',
    defaultVisible: true
  },
  {
    id: 'sessions',
    label: 'Sessions',
    color: '#32CD32',
    valueKey: 'sessions',
    formatType: 'number',
    category: 'sales',
    defaultVisible: false
  },
  {
    id: 'conversion_rate',
    label: 'Conversion Rate',
    color: '#9370DB',
    valueKey: 'conversion_rate',
    formatType: 'percentage',
    category: 'sales',
    defaultVisible: false
  },
  {
    id: 'price',
    label: 'Price',
    color: '#FFD700',
    valueKey: 'price',
    formatType: 'currency',
    category: 'sales',
    defaultVisible: false
  },
  {
    id: 'profit',
    label: 'Profit',
    color: '#228B22',
    valueKey: 'profit',
    formatType: 'currency',
    category: 'sales',
    defaultVisible: false
  },
  {
    id: 'profit_margin',
    label: 'Profit %',
    color: '#20B2AA',
    valueKey: 'profit_margin',
    formatType: 'percentage',
    category: 'sales',
    defaultVisible: false
  },
  {
    id: 'profit_total',
    label: 'Profit Total',
    color: '#3CB371',
    valueKey: 'profit_total',
    formatType: 'currency',
    category: 'sales',
    defaultVisible: false
  },
  // Ads Metrics
  {
    id: 'tacos',
    label: 'TACOS',
    color: '#FF1493',
    valueKey: 'tacos',
    formatType: 'percentage',
    category: 'ads',
    defaultVisible: true
  },
  {
    id: 'ad_spend',
    label: 'Ad Spend',
    color: '#DC143C',
    valueKey: 'ad_spend',
    formatType: 'currency',
    category: 'ads',
    defaultVisible: false
  },
  {
    id: 'ad_sales',
    label: 'Ad Sales',
    color: '#00CED1',
    valueKey: 'ad_sales',
    formatType: 'currency',
    category: 'ads',
    defaultVisible: false
  },
  {
    id: 'ad_units',
    label: 'Ad Units',
    color: '#BA55D3',
    valueKey: 'ad_units',
    formatType: 'number',
    category: 'ads',
    defaultVisible: false
  },
  {
    id: 'acos',
    label: 'ACOS',
    color: '#FF69B4',
    valueKey: 'acos',
    formatType: 'percentage',
    category: 'ads',
    defaultVisible: false
  },
  {
    id: 'cpc',
    label: 'CPC',
    color: '#DAA520',
    valueKey: 'cpc',
    formatType: 'currency',
    category: 'ads',
    defaultVisible: false
  },
  {
    id: 'ad_clicks',
    label: 'Ad Clicks',
    color: '#48D1CC',
    valueKey: 'ad_clicks',
    formatType: 'number',
    category: 'ads',
    defaultVisible: false
  },
  {
    id: 'ad_impressions',
    label: 'Impressions',
    color: '#778899',
    valueKey: 'ad_impressions',
    formatType: 'number',
    category: 'ads',
    defaultVisible: false
  }
];

const Home = () => {
  const { isDarkMode } = useTheme();
  
  // Selector states
  const [catalogData, setCatalogData] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedParent, setSelectedParent] = useState('');
  const [selectedChild, setSelectedChild] = useState('');
  const [selectedChildAsin, setSelectedChildAsin] = useState('');
  const [selectedProductName, setSelectedProductName] = useState('');
  
  // View options
  const [viewType, setViewType] = useState('chart'); // Default to chart view
  const [timePeriod, setTimePeriod] = useState('30');
  const [comparisonPeriod, setComparisonPeriod] = useState('prior');
  
  // Metrics data
  const [metrics, setMetrics] = useState(null);
  const [salesChartData, setSalesChartData] = useState(null);
  const [weeklyMetrics, setWeeklyMetrics] = useState(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  // Show all metrics by default (both sales and ads)
  const [visibleMetrics, setVisibleMetrics] = useState(
    ALL_METRICS.filter(m => m.defaultVisible).map(m => m.id)
  );

  // Drag to scroll state
  const scrollContainerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const hasAutoScrolledRef = useRef(false);

  // AI Modal states
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const themeClasses = {
    bg: isDarkMode ? 'bg-dark-bg-primary' : 'bg-light-bg-primary',
    cardBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
  };

  useEffect(() => {
    fetchCatalogData();
  }, []);

  const fetchCatalogData = async () => {
    try {
      setLoadingCatalog(true);
      const apiUrl = process.env.REACT_APP_API_URL || 'YOUR_API_GATEWAY_URL';
      
      // Fetch child products (contains all data we need)
      const response = await fetch(`${apiUrl}/products/catalog/children`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();
      if (response.ok && result.success) {
        setCatalogData(result.data || []);
        
        // Set default selections
        if (result.data && result.data.length > 0) {
          const firstProduct = result.data[0];
          setSelectedAccount(firstProduct.account || '');
          setSelectedBrand(firstProduct.brand || '');
          
          // Extract product name (remove size suffix)
          const productName = firstProduct.product ? firstProduct.product.split(' - ')[0] : '';
          setSelectedParent(productName);
          
          // Set first child
          setSelectedChild(firstProduct.id || '');
          setSelectedChildAsin(firstProduct.childAsin || firstProduct.child_asin || '');
          setSelectedProductName(firstProduct.product || '');
        }
      }
    } catch (error) {
      console.error('Error fetching catalog data:', error);
    } finally {
      setLoadingCatalog(false);
    }
  };

  // Cascading dropdown options
  const accounts = useMemo(() => 
    [...new Set(catalogData.map(item => item.account).filter(Boolean))],
    [catalogData]
  );
  
  const brands = useMemo(() => 
    selectedAccount
      ? [...new Set(catalogData.filter(item => item.account === selectedAccount).map(item => item.brand).filter(Boolean))]
      : [],
    [catalogData, selectedAccount]
  );
  
  const parents = useMemo(() => {
    if (!selectedBrand) return [];
    
    // Filter by account and brand, then extract unique parent product names
    const filtered = catalogData.filter(item => 
      item.account === selectedAccount && 
      item.brand === selectedBrand
    );
    
    // Extract parent product names (remove " - Size" suffix)
    const parentNames = filtered.map(item => {
      if (!item.product) return '';
      // Product format is "Product Name - Size", we want just "Product Name"
      return item.product.split(' - ')[0];
    }).filter(Boolean);
    
    // Return unique parent names
    return [...new Set(parentNames)];
  }, [catalogData, selectedAccount, selectedBrand]);
  
  const children = useMemo(() => {
    if (!selectedParent) return [];
    
    // Filter children by parent product name
    return catalogData.filter(item => {
      if (item.account !== selectedAccount) return false;
      if (item.brand !== selectedBrand) return false;
      if (!item.product) return false;
      
      // Check if this child belongs to the selected parent
      const parentName = item.product.split(' - ')[0];
      return parentName === selectedParent;
    });
  }, [catalogData, selectedAccount, selectedBrand, selectedParent]);

  // Handle selection changes
  const handleAccountChange = (e) => {
    setSelectedAccount(e.target.value);
    setSelectedBrand('');
    setSelectedParent('');
    setSelectedChild('');
    setSelectedChildAsin('');
    setSelectedProductName('');
  };

  const handleBrandChange = (e) => {
    setSelectedBrand(e.target.value);
    setSelectedParent('');
    setSelectedChild('');
    setSelectedChildAsin('');
    setSelectedProductName('');
  };

  const handleParentChange = (e) => {
    setSelectedParent(e.target.value);
    setSelectedChild('');
    setSelectedChildAsin('');
    setSelectedProductName('');
  };

  const handleChildChange = (e) => {
    const childId = e.target.value;
    setSelectedChild(childId);
    
    // Find the selected child product
    const childProduct = catalogData.find(item => item.id === parseInt(childId));
    if (childProduct) {
      setSelectedChildAsin(childProduct.childAsin || childProduct.child_asin || '');
      setSelectedProductName(childProduct.product || '');
    }
  };

  // Drag to scroll handlers
  const handleMouseDown = (e) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
    scrollContainerRef.current.style.cursor = 'grabbing';
    scrollContainerRef.current.style.userSelect = 'none';
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.cursor = 'grab';
      scrollContainerRef.current.style.userSelect = 'auto';
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.cursor = 'grab';
      scrollContainerRef.current.style.userSelect = 'auto';
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2; // Multiply by 2 for faster scrolling
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  // Touch handlers for mobile
  const handleTouchStart = (e) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.touches[0].pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
  };

  const handleTouchMove = (e) => {
    if (!isDragging || !scrollContainerRef.current) return;
    const x = e.touches[0].pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Horizontal scroll with mouse wheel
  const handleWheel = (e) => {
    if (!scrollContainerRef.current) return;
    if (e.deltaY !== 0) {
      e.preventDefault();
      scrollContainerRef.current.scrollLeft += e.deltaY;
    }
  };

  // Fetch metrics when ASIN or view changes
  useEffect(() => {
    if (selectedChildAsin) {
      if (viewType === 'chart') {
        fetchMetrics();
      } else if (viewType === 'table') {
        fetchWeeklyMetrics();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChildAsin, timePeriod, viewType, selectedYear]);

  const fetchMetrics = async () => {
    if (!selectedChildAsin) return;
    
    try {
      setLoadingMetrics(true);
      const [metricsData, salesChartData, adsChartData] = await Promise.all([
        NgoosAPI.getMetrics(selectedChildAsin, parseInt(timePeriod)),
        NgoosAPI.getSalesChart(selectedChildAsin, parseInt(timePeriod)),
        NgoosAPI.getAdsChart(selectedChildAsin, parseInt(timePeriod))
      ]);
      
      // Merge sales and ads chart data by date
      let combinedChartData = { chart_data: [] };
      
      if (salesChartData?.chart_data && adsChartData?.chart_data) {
        // Create a map of ads data by date for easy lookup
        const adsDataMap = new Map();
        adsChartData.chart_data.forEach(dataPoint => {
          adsDataMap.set(dataPoint.date, dataPoint);
        });
        
        // Merge sales data with ads data
        combinedChartData.chart_data = salesChartData.chart_data.map(salesPoint => {
          const adsPoint = adsDataMap.get(salesPoint.date) || {};
          return {
            ...salesPoint,
            ...adsPoint,
            date: salesPoint.date // Ensure date is preserved
          };
        });
      } else if (salesChartData?.chart_data) {
        // If only sales data is available
        combinedChartData = salesChartData;
      } else if (adsChartData?.chart_data) {
        // If only ads data is available
        combinedChartData = adsChartData;
      }
      
      // Process chart data to add calculated metrics
      if (combinedChartData?.chart_data) {
        combinedChartData.chart_data = combinedChartData.chart_data.map(dataPoint => {
          const processed = { ...dataPoint };
          
          // Calculate profit per unit if not present
          if (!processed.profit && processed.profit_total && processed.units_sold && processed.units_sold > 0) {
            processed.profit = processed.profit_total / processed.units_sold;
          }
          
          // Calculate ad_units if not present
          if (!processed.ad_units && processed.ad_sales && processed.price && processed.price > 0) {
            processed.ad_units = Math.round(processed.ad_sales / processed.price);
          }
          
          // Calculate ACOS if not present
          if (!processed.acos && processed.ad_spend && processed.ad_sales && processed.ad_sales > 0) {
            processed.acos = (processed.ad_spend / processed.ad_sales) * 100;
          }
          
          // Calculate CPC if not present
          if (!processed.cpc && processed.ad_spend && processed.ad_clicks && processed.ad_clicks > 0) {
            processed.cpc = processed.ad_spend / processed.ad_clicks;
          }
          
          return processed;
        });
      }
      
      setMetrics(metricsData);
      setSalesChartData(combinedChartData);
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoadingMetrics(false);
    }
  };

  const fetchWeeklyMetrics = async () => {
    if (!selectedChildAsin) return;
    
    try {
      setLoadingMetrics(true);
      hasAutoScrolledRef.current = false; // Reset auto-scroll flag when fetching new data
      const weeklyData = await NgoosAPI.getWeeklyMetrics(selectedChildAsin, selectedYear);
      setWeeklyMetrics(weeklyData);
    } catch (error) {
      console.error('Error fetching weekly metrics:', error);
    } finally {
      setLoadingMetrics(false);
    }
  };

  // Toggle metric visibility
  const toggleMetric = useCallback((metricId) => {
    setVisibleMetrics(prev => {
      if (prev.includes(metricId)) {
        return prev.filter(id => id !== metricId);
      } else {
        return [...prev, metricId];
      }
    });
  }, []);

  // AI Analysis handlers
  const handlePerformAnalysis = async () => {
    if (!selectedChildAsin || !metrics) {
      toast.error('Please select a product first');
      return;
    }

    setShowAIModal(true);
    setIsAnalyzing(true);
    setAiAnalysis('');

    try {
      // Create a data object that matches what OpenAI expects
      const productData = {
        product: selectedProductName,
        child_asin: selectedChildAsin,
        account: selectedAccount,
        brand: selectedBrand
      };
      
      const analysis = await OpenAIService.analyzeMetrics(productData, metrics, 'sales');
      setAiAnalysis(analysis);
    } catch (error) {
      console.error('Error analyzing metrics:', error);
      toast.error('Failed to analyze metrics', {
        description: error.message
      });
      setShowAIModal(false);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAskFollowUp = async (question, conversationHistory) => {
    const messages = conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Add context about the product and metrics
    const contextMessage = {
      role: 'system',
      content: `Context: You are analyzing ${selectedProductName} (ASIN: ${selectedChildAsin}). Account: ${selectedAccount}, Brand: ${selectedBrand}.`
    };

    const response = await OpenAIService.askFollowUp([contextMessage, ...messages], question);
    return response;
  };

  // Format chart values
  const formatChartValue = (value, formatType) => {
    if (value === null || value === undefined) return 'N/A';
    
    switch(formatType) {
      case 'currency':
        return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'percentage':
      case 'percent':
        return `${value.toFixed(2)}%`;
      case 'number':
      default:
        return value.toLocaleString();
    }
  };

  // Get metric value and change for display
  const getMetricValue = (metricId) => {
    if (!metrics) return { value: 'N/A', change: null, prefix: '' };
    
    let current = metrics.current_period?.[metricId];
    const change = metrics.changes?.[metricId];
    
    // Calculate derived metrics if not directly available
    if ((current === undefined || current === null) && metrics.current_period) {
      const cp = metrics.current_period;
      
      switch(metricId) {
        case 'profit':
          // Calculate profit per unit if we have profit_total and units_sold
          if (cp.profit_total !== undefined && cp.units_sold !== undefined && cp.units_sold > 0) {
            current = cp.profit_total / cp.units_sold;
          }
          break;
        case 'ad_units':
          // Calculate ad units from ad_sales and price
          if (cp.ad_sales !== undefined && cp.price !== undefined && cp.price > 0) {
            current = Math.round(cp.ad_sales / cp.price);
          }
          break;
        case 'acos':
          // ACOS = (ad_spend / ad_sales) * 100
          if (cp.ad_spend !== undefined && cp.ad_sales !== undefined && cp.ad_sales > 0) {
            current = (cp.ad_spend / cp.ad_sales) * 100;
          }
          break;
        case 'cpc':
          // CPC = ad_spend / ad_clicks
          if (cp.ad_spend !== undefined && cp.ad_clicks !== undefined && cp.ad_clicks > 0) {
            current = cp.ad_spend / cp.ad_clicks;
          }
          break;
        default:
          break;
      }
    }
    
    let formattedValue = 'N/A';
    let prefix = '';
    
    if (current !== undefined && current !== null) {
      const metric = ALL_METRICS.find(m => m.id === metricId);
      if (metric) {
        switch(metric.formatType) {
          case 'currency':
            prefix = '$';
            formattedValue = current.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
            break;
          case 'percentage':
            formattedValue = current.toFixed(2) + '%';
            break;
          case 'number':
          default:
            formattedValue = current.toLocaleString();
            break;
        }
      }
    }
    
    return {
      value: formattedValue,
      change: change !== undefined && change !== null ? change : null,
      prefix: prefix
    };
  };

  return (
    <div className={`min-h-screen ${themeClasses.bg} flex flex-col`}>
      {/* Page Header */}
      <div style={{ padding: '2rem 2rem 0 2rem' }}>
        <div 
          className="mb-6"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap'
          }}
        >
          {/* Left side - Logo and Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '200px' }}>
            <div style={{ 
              width: '48px', 
              height: '48px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              backgroundColor: isDarkMode ? '#374151' : '#F3F4F6',
              borderRadius: '12px'
            }}>
              <svg style={{ width: '28px', height: '28px' }} className={themeClasses.text} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <h1 className={`text-2xl font-bold ${themeClasses.text}`}>Dashboard</h1>
          </div>

          {/* Right side - Info Text */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <p className={`text-sm ${themeClasses.textSecondary}`}>
              Track your product performance and key metrics
            </p>
          </div>
        </div>
        
        {/* Header with Selectors */}
        <div className={`${themeClasses.cardBg} border ${themeClasses.border}`}
          style={{
            padding: '1.5rem',
            borderRadius: '0.75rem',
            boxShadow: isDarkMode ? '0 4px 20px rgba(0, 0, 0, 0.2)' : '0 4px 20px rgba(0, 0, 0, 0.05)',
            marginBottom: '2rem'
          }}
        >
          {loadingCatalog ? (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              padding: '2rem',
              color: isDarkMode ? '#94a3b8' : '#64748b'
            }}>
              <div style={{ 
                width: '20px', 
                height: '20px', 
                border: `3px solid ${isDarkMode ? '#334155' : '#cbd5e1'}`,
                borderTopColor: '#3b82f6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginRight: '0.75rem'
              }} />
              Loading...
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              
              {/* Seller Account */}
              <div style={{ flex: '1', minWidth: '180px' }}>
                <label 
                  className={`text-xs font-semibold ${themeClasses.textSecondary} mb-2`} 
                  style={{ display: 'block', textTransform: 'uppercase' }}
                >
                  Seller Account
                </label>
                <select
                  value={selectedAccount}
                  onChange={handleAccountChange}
                  disabled={accounts.length === 0}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.5rem',
                    backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                    color: isDarkMode ? '#fff' : '#000',
                    border: `2px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">Select Account</option>
                  {accounts.map(account => (
                    <option key={account} value={account}>{account}</option>
                  ))}
                </select>
              </div>

              {/* Brand */}
              <div style={{ flex: '1', minWidth: '180px' }}>
                <label 
                  className={`text-xs font-semibold ${themeClasses.textSecondary} mb-2`} 
                  style={{ display: 'block', textTransform: 'uppercase' }}
                >
                  Brand
                </label>
                <select
                  value={selectedBrand}
                  onChange={handleBrandChange}
                  disabled={!selectedAccount || brands.length === 0}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.5rem',
                    backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                    color: isDarkMode ? '#fff' : '#000',
                    border: `2px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: selectedAccount && brands.length > 0 ? 'pointer' : 'not-allowed',
                    opacity: selectedAccount && brands.length > 0 ? 1 : 0.5
                  }}
                >
                  <option value="">Select Brand</option>
                  {brands.map(brand => (
                    <option key={brand} value={brand}>{brand}</option>
                  ))}
                </select>
              </div>

              {/* Parent */}
              <div style={{ flex: '1', minWidth: '180px' }}>
                <label 
                  className={`text-xs font-semibold ${themeClasses.textSecondary} mb-2`} 
                  style={{ display: 'block', textTransform: 'uppercase' }}
                >
                  Parent
                </label>
                <select
                  value={selectedParent}
                  onChange={handleParentChange}
                  disabled={!selectedBrand || parents.length === 0}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.5rem',
                    backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                    color: isDarkMode ? '#fff' : '#000',
                    border: `2px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: selectedBrand && parents.length > 0 ? 'pointer' : 'not-allowed',
                    opacity: selectedBrand && parents.length > 0 ? 1 : 0.5
                  }}
                >
                  <option value="">Select Parent</option>
                  {parents.map(parent => (
                    <option key={parent} value={parent}>{parent}</option>
                  ))}
                </select>
              </div>

              {/* Child */}
              <div style={{ flex: '1', minWidth: '180px' }}>
                <label 
                  className={`text-xs font-semibold ${themeClasses.textSecondary} mb-2`} 
                  style={{ display: 'block', textTransform: 'uppercase' }}
                >
                  Child
                </label>
                <select
                  value={selectedChild}
                  onChange={handleChildChange}
                  disabled={!selectedParent || children.length === 0}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.5rem',
                    backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                    color: isDarkMode ? '#fff' : '#000',
                    border: `2px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: selectedParent && children.length > 0 ? 'pointer' : 'not-allowed',
                    opacity: selectedParent && children.length > 0 ? 1 : 0.5
                  }}
                >
                  <option value="">Select Child</option>
                  {children.map(child => {
                    // Extract size from "Product Name - Size" format
                    const size = child.product ? child.product.split(' - ')[1] || 'N/A' : 'N/A';
                    const asin = child.childAsin || child.child_asin || '';
                    return (
                      <option key={child.id} value={child.id}>
                        {size}{asin ? ` (${asin})` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Divider */}
              <div style={{ 
                width: '1px', 
                height: '60px', 
                backgroundColor: isDarkMode ? '#334155' : '#e2e8f0',
                margin: '0 0.5rem'
              }} />

              {/* Table View */}
              <div style={{ flex: '0 0 auto', minWidth: '140px' }}>
                <label 
                  className={`text-xs font-semibold ${themeClasses.textSecondary} mb-2`} 
                  style={{ display: 'block', textTransform: 'uppercase' }}
                >
                  &nbsp;
                </label>
                <select
                  value={viewType}
                  onChange={(e) => setViewType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.5rem',
                    backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                    color: isDarkMode ? '#fff' : '#000',
                    border: `2px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  <option value="table">Table View</option>
                  <option value="chart">Chart View</option>
                  <option value="grid">Grid View</option>
                </select>
              </div>

              {/* 30 Days */}
              <div style={{ flex: '0 0 auto', minWidth: '120px' }}>
                <label 
                  className={`text-xs font-semibold ${themeClasses.textSecondary} mb-2`} 
                  style={{ display: 'block', textTransform: 'uppercase' }}
                >
                  &nbsp;
                </label>
                <select
                  value={timePeriod}
                  onChange={(e) => setTimePeriod(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.5rem',
                    backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                    color: isDarkMode ? '#fff' : '#000',
                    border: `2px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  <option value="7">7 Days</option>
                  <option value="30">30 Days</option>
                  <option value="60">60 Days</option>
                  <option value="90">90 Days</option>
                </select>
              </div>

              {/* Prior Period */}
              <div style={{ flex: '0 0 auto', minWidth: '140px' }}>
                <label 
                  className={`text-xs font-semibold ${themeClasses.textSecondary} mb-2`} 
                  style={{ display: 'block', textTransform: 'uppercase' }}
                >
                  &nbsp;
                </label>
                <select
                  value={comparisonPeriod}
                  onChange={(e) => setComparisonPeriod(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.5rem',
                    backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                    color: isDarkMode ? '#fff' : '#000',
                    border: `2px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  <option value="prior">Prior Period</option>
                  <option value="yearago">Year Ago</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

            </div>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, padding: '0 2rem 2rem 2rem' }}>
        {/* Content Area - Sales Chart View */}
        {viewType === 'chart' && selectedChildAsin ? (
          <div className={`${themeClasses.cardBg} border ${themeClasses.border}`}
            style={{
              borderRadius: '0.75rem',
              boxShadow: isDarkMode ? '0 4px 20px rgba(0, 0, 0, 0.2)' : '0 4px 20px rgba(0, 0, 0, 0.05)',
              overflow: 'hidden'
            }}
          >
            {loadingMetrics ? (
              <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                <div style={{ display: 'inline-block' }}>
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" style={{ margin: '0 auto' }}></div>
                  <p className={`mt-4 text-sm ${themeClasses.textSecondary}`}>Loading metrics...</p>
                </div>
              </div>
            ) : (
              <div>
                {/* Header with Metric Controllers */}
                <div className="px-6 pt-6" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', gap: '1rem' }}>
                  {/* Metric Controller */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', flex: 1 }}>
                    <span style={{ fontSize: '0.75rem', color: isDarkMode ? '#94a3b8' : '#64748b', alignSelf: 'center', marginRight: '0.5rem', fontWeight: '600', textTransform: 'uppercase' }}>
                      Metrics:
                    </span>
                    {ALL_METRICS.map(metric => {
                      const isVisible = visibleMetrics.includes(metric.id);
                      return (
                        <button
                          key={metric.id}
                          onClick={() => toggleMetric(metric.id)}
                          style={{
                            padding: '0.375rem 0.75rem',
                            borderRadius: '0.375rem',
                            backgroundColor: isVisible ? metric.color + '20' : 'transparent',
                            border: `2px solid ${isVisible ? metric.color : (isDarkMode ? '#475569' : '#cbd5e1')}`,
                            color: isVisible ? metric.color : (isDarkMode ? '#94a3b8' : '#64748b'),
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.375rem',
                            opacity: isVisible ? 1 : 0.6
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.opacity = '1';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.opacity = isVisible ? '1' : '0.6';
                          }}
                        >
                          <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: isVisible ? metric.color : (isDarkMode ? '#475569' : '#cbd5e1')
                          }} />
                          {metric.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Product Info */}
                  <div style={{ fontSize: '0.875rem', color: isDarkMode ? '#94a3b8' : '#64748b', fontWeight: '600', whiteSpace: 'nowrap' }}>
                    {selectedProductName || 'No product selected'}
                  </div>
                </div>

                {/* Graph Section: 70% Graph + 30% Banana Factors */}
                <div className="px-6" style={{ display: 'grid', gridTemplateColumns: '70% 30%', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  {/* Left: Graph (70%) */}
                  <div style={{ 
                    backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc', 
                    borderRadius: '0.75rem', 
                    padding: '1.5rem',
                    border: isDarkMode ? '1px solid #1e293b' : '1px solid #e2e8f0'
                  }}>
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={salesChartData?.chart_data || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#cbd5e1'} vertical={false} />
                        <XAxis 
                          dataKey="date" 
                          stroke={isDarkMode ? '#64748b' : '#475569'}
                          style={{ fontSize: '0.75rem' }}
                          tickLine={false}
                          tickFormatter={(value) => {
                            const date = new Date(value);
                            return `${date.getMonth() + 1}/${date.getDate()}`;
                          }}
                        />
                        <YAxis 
                          stroke={isDarkMode ? '#64748b' : '#475569'}
                          style={{ fontSize: '0.75rem' }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', 
                            border: `1px solid ${isDarkMode ? '#334155' : '#cbd5e1'}`,
                            borderRadius: '0.5rem',
                            color: isDarkMode ? '#fff' : '#1e293b',
                            fontSize: '0.875rem'
                          }}
                          formatter={(value, name) => {
                            const metric = ALL_METRICS.find(m => m.label === name);
                            if (metric) {
                              return [formatChartValue(value, metric.formatType), name];
                            }
                            return [value, name];
                          }}
                        />
                        {/* Dynamically render visible metrics */}
                        {visibleMetrics.length > 0 && ALL_METRICS
                          .filter(metric => visibleMetrics.includes(metric.id))
                          .map((metric) => (
                            <Line 
                              key={metric.id}
                              type="monotone" 
                              dataKey={metric.valueKey} 
                              stroke={metric.color} 
                              strokeWidth={2.5}
                              name={metric.label}
                              dot={false}
                              connectNulls
                            />
                          ))}
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Right: Banana Factors (30%) */}
                  <div style={{ 
                    backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc', 
                    borderRadius: '0.75rem', 
                    padding: '1.5rem', 
                    display: 'flex', 
                    flexDirection: 'column',
                    border: isDarkMode ? '1px solid #1e293b' : '1px solid #e2e8f0'
                  }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: isDarkMode ? '#fff' : '#1e293b', marginBottom: '1.5rem' }}>Banana Factors</h3>
                    
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {/* Sessions */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: `1px solid ${isDarkMode ? '#334155' : '#cbd5e1'}` }}>
                        <span style={{ fontSize: '0.875rem', color: isDarkMode ? '#94a3b8' : '#64748b' }}>Sessions</span>
                        <span style={{ fontSize: '0.875rem', fontWeight: '600', color: metrics?.changes?.sessions >= 0 ? '#22c55e' : '#ef4444' }}>
                          {metrics?.current_period?.sessions?.toLocaleString() || '0'}
                        </span>
                      </div>

                      {/* Conversion Rate */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: `1px solid ${isDarkMode ? '#334155' : '#cbd5e1'}` }}>
                        <span style={{ fontSize: '0.875rem', color: isDarkMode ? '#94a3b8' : '#64748b' }}>Conversion Rate</span>
                        <span style={{ fontSize: '0.875rem', fontWeight: '600', color: metrics?.changes?.conversion_rate >= 0 ? '#22c55e' : '#ef4444' }}>
                          {metrics?.current_period?.conversion_rate?.toFixed(2) || '0.00'}%
                        </span>
                      </div>

                      {/* TACOS */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: `1px solid ${isDarkMode ? '#334155' : '#cbd5e1'}` }}>
                        <span style={{ fontSize: '0.875rem', color: isDarkMode ? '#94a3b8' : '#64748b' }}>TACOS</span>
                        <span style={{ fontSize: '0.875rem', fontWeight: '600', color: metrics?.changes?.tacos <= 0 ? '#22c55e' : '#ef4444' }}>
                          {metrics?.current_period?.tacos?.toFixed(2) || '0.00'}%
                        </span>
                      </div>
                    </div>

                    {/* Perform Analysis Button */}
                    <button 
                      onClick={handlePerformAnalysis}
                      disabled={!selectedChildAsin || !metrics}
                      style={{
                        marginTop: 'auto',
                        padding: '0.75rem',
                        backgroundColor: (!selectedChildAsin || !metrics) ? '#94a3b8' : '#3b82f6',
                        color: '#fff',
                        borderRadius: '0.5rem',
                        border: 'none',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        cursor: (!selectedChildAsin || !metrics) ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        transition: 'all 0.2s',
                        opacity: (!selectedChildAsin || !metrics) ? 0.6 : 1
                      }}
                      onMouseEnter={(e) => {
                        if (selectedChildAsin && metrics) {
                          e.currentTarget.style.backgroundColor = '#2563eb';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedChildAsin && metrics) {
                          e.currentTarget.style.backgroundColor = '#3b82f6';
                        }
                      }}
                    >
                      <svg style={{ width: '1rem', height: '1rem' }} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/>
                      </svg>
                      Perform Analysis
                    </button>
                    <div style={{ fontSize: '0.625rem', color: isDarkMode ? '#64748b' : '#94a3b8', textAlign: 'center', marginTop: '0.5rem' }}>
                      Powered by Banana Brain AI
                    </div>
                  </div>
                </div>

                {/* Bottom Section: Metrics Grid */}
                <div className="px-6 pb-6">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem' }}>
                    {ALL_METRICS.map(metric => {
                      const metricData = getMetricValue(metric.id);
                      const isVisibleOnChart = visibleMetrics.includes(metric.id);
                      const borderColor = isVisibleOnChart ? metric.color : (isDarkMode ? '#334155' : '#cbd5e1');
                      const changeColor = (metricData.change !== null && metricData.change >= 0) ? '#22c55e' : '#ef4444';
                      
                      return (
                        <div 
                          key={metric.id} 
                          onClick={() => toggleMetric(metric.id)}
                          style={{ 
                            padding: '1.5rem', 
                            backgroundColor: isDarkMode ? '#0f1729' : '#f8fafc', 
                            borderRadius: '0.75rem', 
                            border: `2px solid ${borderColor}`, 
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            position: 'relative'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = `0 4px 12px ${borderColor}40`;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          {isVisibleOnChart && (
                            <div style={{
                              position: 'absolute',
                              top: '0.5rem',
                              right: '0.5rem',
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: metric.color,
                              boxShadow: `0 0 8px ${metric.color}`
                            }} />
                          )}
                          <div style={{ fontSize: '2rem', fontWeight: '700', color: isDarkMode ? '#fff' : '#1e293b', marginBottom: '0.25rem' }}>
                            {metricData.prefix}{metricData.value}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: isDarkMode ? '#94a3b8' : '#64748b' }}>
                            {metric.label} 
                            {metricData.change !== null && (
                              <span style={{ color: changeColor, fontWeight: '600' }}>
                                {' '}{metricData.change >= 0 ? '+' : ''}{metricData.change?.toFixed(1)}%
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.625rem', color: isDarkMode ? '#64748b' : '#94a3b8', marginTop: '0.5rem' }}>
                            {isVisibleOnChart ? '📊 On chart' : 'Click to show'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : viewType === 'table' && selectedChildAsin ? (
          <div className={`${themeClasses.cardBg} border ${themeClasses.border}`}
            style={{
              borderRadius: '0.75rem',
              boxShadow: isDarkMode ? '0 4px 20px rgba(0, 0, 0, 0.2)' : '0 4px 20px rgba(0, 0, 0, 0.05)',
              overflow: 'hidden'
            }}
          >
            {loadingMetrics ? (
              <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                <div style={{ display: 'inline-block' }}>
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" style={{ margin: '0 auto' }}></div>
                  <p className={`mt-4 text-sm ${themeClasses.textSecondary}`}>Loading weekly metrics...</p>
                </div>
              </div>
            ) : weeklyMetrics ? (
              <div 
                style={{
                  borderRadius: '0.75rem',
                  overflow: 'hidden',
                  boxShadow: isDarkMode ? '0 4px 20px rgba(0, 0, 0, 0.3)' : '0 4px 20px rgba(0, 0, 0, 0.08)',
                  border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`
                }}
              >
                <div 
                  ref={(el) => {
                    scrollContainerRef.current = el;
                    if (el && weeklyMetrics && !hasAutoScrolledRef.current) {
                      // Auto-scroll to the latest week only once on initial load
                      setTimeout(() => {
                        if (el && scrollContainerRef.current) {
                          el.scrollLeft = el.scrollWidth - el.clientWidth;
                          hasAutoScrolledRef.current = true;
                        }
                      }, 100);
                    }
                  }}
                  onMouseDown={handleMouseDown}
                  onMouseLeave={handleMouseLeave}
                  onMouseUp={handleMouseUp}
                  onMouseMove={handleMouseMove}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onWheel={handleWheel}
                  style={{ 
                    overflowX: 'auto', 
                    overflowY: 'hidden',
                    scrollbarWidth: 'none', /* Firefox */
                    msOverflowStyle: 'none', /* IE and Edge */
                    WebkitOverflowScrolling: 'touch',
                    cursor: isDragging ? 'grabbing' : 'grab',
                    scrollBehavior: 'auto' // Always use auto for responsive scrolling
                  }}
                  className="hide-scrollbar"
                >
                  <style>{`
                    .hide-scrollbar::-webkit-scrollbar {
                      display: none;
                    }
                    .hide-scrollbar {
                      position: relative;
                    }
                    .hide-scrollbar::after {
                      content: '';
                      position: absolute;
                      top: 0;
                      right: 0;
                      bottom: 0;
                      width: 50px;
                      background: linear-gradient(to left, ${isDarkMode ? 'rgba(15, 23, 42, 0.8)' : 'rgba(248, 250, 252, 0.8)'}, transparent);
                      pointer-events: none;
                      z-index: 5;
                    }
                    .table-row:hover {
                      background-color: ${isDarkMode ? '#1e293b' : '#f1f5f9'} !important;
                    }
                    .hide-scrollbar table {
                      -webkit-user-select: none;
                      -moz-user-select: none;
                      -ms-user-select: none;
                      user-select: ${isDragging ? 'none' : 'auto'};
                    }
                  `}</style>
                <table style={{ width: '100%', minWidth: '1200px', borderCollapse: 'separate', borderSpacing: 0, position: 'relative' }}>
                  <thead style={{ 
                    backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9', 
                    position: 'sticky', 
                    top: 0, 
                    zIndex: 20,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    <tr>
                      <th style={{ 
                        padding: '1.25rem 1rem', 
                        textAlign: 'left', 
                        fontWeight: '700', 
                        fontSize: '0.6875rem', 
                        color: '#64748b', 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.05em',
                        borderBottom: `2px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
                        minWidth: '140px',
                        position: 'sticky',
                        left: 0,
                        backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
                        zIndex: 21,
                        boxShadow: '2px 0 4px rgba(0,0,0,0.05)'
                      }}>Brand</th>
                      <th style={{ 
                        padding: '1.25rem 1rem', 
                        textAlign: 'left', 
                        fontWeight: '700', 
                        fontSize: '0.6875rem', 
                        color: '#64748b', 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.05em',
                        borderBottom: `2px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
                        minWidth: '180px',
                        position: 'sticky',
                        left: '140px',
                        backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
                        zIndex: 21,
                        boxShadow: '2px 0 4px rgba(0,0,0,0.05)'
                      }}>Product</th>
                      <th style={{ 
                        padding: '1.25rem 1rem', 
                        textAlign: 'left', 
                        fontWeight: '700', 
                        fontSize: '0.6875rem', 
                        color: '#64748b', 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.05em',
                        borderBottom: `2px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
                        minWidth: '100px',
                        position: 'sticky',
                        left: '320px',
                        backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
                        zIndex: 21,
                        boxShadow: '2px 0 4px rgba(0,0,0,0.05)'
                      }}>Size</th>
                      <th style={{ 
                        padding: '1.25rem 1rem', 
                        textAlign: 'left', 
                        fontWeight: '700', 
                        fontSize: '0.6875rem', 
                        color: '#64748b', 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.05em',
                        borderBottom: `2px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
                        minWidth: '150px',
                        position: 'sticky',
                        left: '420px',
                        backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
                        zIndex: 21,
                        boxShadow: '2px 0 4px rgba(0,0,0,0.05)'
                      }}>Stat</th>
                      {[...weeklyMetrics.weeks, { week_number: 'TBD', placeholder: true }, { week_number: 'TBD', placeholder: true }, { week_number: 'TBD', placeholder: true }].map((week, idx) => (
                        <th key={week.placeholder ? `placeholder-${idx}` : week.week_number} style={{ 
                          padding: '1.25rem 1rem', 
                          textAlign: 'center', 
                          fontWeight: '600', 
                          fontSize: '0.6875rem', 
                          color: week.placeholder ? (isDarkMode ? '#475569' : '#94a3b8') : '#64748b', 
                          textTransform: 'uppercase', 
                          letterSpacing: '0.05em',
                          borderBottom: `2px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
                          minWidth: '110px',
                          backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9'
                        }}>
                          Week {week.week_number}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {['Total Sales', 'Sessions', 'Conversion', 'TACOS', 'Units Sold', 'Ad Impressions'].map((stat, index) => {
                      const getStatKey = (stat) => {
                        switch(stat) {
                          case 'Total Sales': return 'total_sales';
                          case 'Sessions': return 'sessions';
                          case 'Conversion': return 'conversion_rate';
                          case 'TACOS': return 'tacos';
                          case 'Units Sold': return 'units_sold';
                          case 'Ad Impressions': return 'ad_impressions';
                          default: return null;
                        }
                      };
                      
                      const statKey = getStatKey(stat);
                      
                      return (
                        <tr key={stat} className="table-row" style={{ 
                          borderBottom: `1px solid ${isDarkMode ? '#1e293b' : '#f1f5f9'}`,
                          transition: 'background-color 0.15s ease',
                          cursor: 'default'
                        }}>
                          {index === 0 && (
                            <>
                              <td rowSpan={6} style={{ 
                                padding: '1.25rem 1rem', 
                                verticalAlign: 'middle', 
                                borderRight: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
                                fontSize: '0.875rem', 
                                fontWeight: '600',
                                color: isDarkMode ? '#e2e8f0' : '#1e293b',
                                position: 'sticky',
                                left: 0,
                                backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
                                zIndex: 10,
                                boxShadow: '2px 0 4px rgba(0,0,0,0.05)'
                              }}>
                                {weeklyMetrics.product.brand}
                              </td>
                              <td rowSpan={6} style={{ 
                                padding: '1.25rem 1rem', 
                                verticalAlign: 'middle', 
                                borderRight: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
                                position: 'sticky',
                                left: '140px',
                                backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
                                zIndex: 10,
                                boxShadow: '2px 0 4px rgba(0,0,0,0.05)'
                              }}>
                                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#3b82f6', cursor: 'pointer' }}>
                                  {weeklyMetrics.product.name}
                                </div>
                              </td>
                              <td rowSpan={6} style={{ 
                                padding: '1.25rem 1rem', 
                                verticalAlign: 'middle', 
                                borderRight: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
                                fontSize: '0.875rem', 
                                fontWeight: '500',
                                color: isDarkMode ? '#cbd5e1' : '#475569',
                                position: 'sticky',
                                left: '320px',
                                backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
                                zIndex: 10,
                                boxShadow: '2px 0 4px rgba(0,0,0,0.05)'
                              }}>
                                {weeklyMetrics.product.size}
                              </td>
                            </>
                          )}
                          <td style={{ 
                            padding: '1rem 1rem', 
                            fontSize: '0.8125rem', 
                            fontWeight: '600',
                            color: isDarkMode ? '#94a3b8' : '#64748b', 
                            borderRight: `2px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
                            position: 'sticky',
                            left: '420px',
                            backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
                            zIndex: 10,
                            boxShadow: '2px 0 4px rgba(0,0,0,0.05)'
                          }}>
                            {stat}
                          </td>
                          {[...weeklyMetrics.weeks, { week_number: 'TBD', placeholder: true }, { week_number: 'TBD', placeholder: true }, { week_number: 'TBD', placeholder: true }].map((week, idx) => {
                            if (week.placeholder) {
                              return (
                                <td key={`placeholder-${idx}`} style={{ 
                                  padding: '1rem', 
                                  textAlign: 'center', 
                                  fontSize: '0.8125rem', 
                                  color: isDarkMode ? '#64748b' : '#94a3b8',
                                  backgroundColor: isDarkMode ? '#0a0f1a' : '#f8fafc',
                                  borderRight: `1px solid ${isDarkMode ? '#1e293b' : '#e2e8f0'}`
                                }}>
                                  -
                                </td>
                              );
                            }
                            
                            const value = week[statKey];
                            let formattedValue = value || '0';
                            
                            // Format based on stat type
                            if (stat === 'Total Sales') {
                              formattedValue = value ? `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '$0';
                            } else if (stat === 'Conversion' || stat === 'TACOS') {
                              formattedValue = value ? `${value.toFixed(2)}%` : '0%';
                            } else {
                              formattedValue = value ? value.toLocaleString() : '0';
                            }
                            
                            return (
                              <td key={week.week_number} style={{ 
                                padding: '1rem', 
                                textAlign: 'center', 
                                fontSize: '0.8125rem',
                                fontWeight: '500',
                                color: isDarkMode ? '#e2e8f0' : '#1e293b',
                                backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
                                borderRight: `1px solid ${isDarkMode ? '#1e293b' : '#e2e8f0'}`,
                                transition: 'background-color 0.15s ease'
                              }}>
                                {formattedValue}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className={`${themeClasses.cardBg} border ${themeClasses.border}`}
            style={{
              padding: '4rem 2rem',
              borderRadius: '0.75rem',
              boxShadow: isDarkMode ? '0 4px 20px rgba(0, 0, 0, 0.2)' : '0 4px 20px rgba(0, 0, 0, 0.05)',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3 }}>🍌</div>
            <p className={`${themeClasses.textSecondary} text-sm`}>
              {viewType !== 'chart' ? 'Please select a product to view metrics' : 'Please select a product to view metrics'}
            </p>
          </div>
        )}
      </div>

      {/* Banana Brain AI Modal */}
      <BananaBrainModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        analysis={aiAnalysis}
        onAskQuestion={handleAskFollowUp}
        isLoading={isAnalyzing}
      />

      {/* CSS for spinner animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Home;
