import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import { toast } from 'sonner';
import NgoosAPI from '../../../../services/ngoosApi';
import OpenAIService from '../../../../services/openaiService';
import BananaBrainModal from '../../../../components/BananaBrainModal';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ComposedChart,
  Area,
  ReferenceArea,
  Brush
} from 'recharts';

const Ngoos = ({ data, inventoryOnly = false, doiGoalDays = null }) => {
  const { isDarkMode } = useTheme();
  const [selectedView, setSelectedView] = useState('2 Years');
  const [loading, setLoading] = useState(true);
  const [productDetails, setProductDetails] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [salesChartData, setSalesChartData] = useState(null);
  const [adsChartData, setAdsChartData] = useState(null);
  const [zoomDomain, setZoomDomain] = useState({ left: null, right: null });
  const [isZooming, setIsZooming] = useState(false);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [activeTab, setActiveTab] = useState('forecast');
  const [metricsDays, setMetricsDays] = useState(30);
  const [showMetricSelector, setShowMetricSelector] = useState(false);
  const [metricSearch, setMetricSearch] = useState('');
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [salesVelocityWeight, setSalesVelocityWeight] = useState(25);
  const [svVelocityWeight, setSvVelocityWeight] = useState(15);
  const [tempSalesVelocityWeight, setTempSalesVelocityWeight] = useState(25);
  const [tempSvVelocityWeight, setTempSvVelocityWeight] = useState(15);
  const [currentProductAsin, setCurrentProductAsin] = useState(null);
  const [visibleSalesMetrics, setVisibleSalesMetrics] = useState(['units_sold', 'sales']);
  const [visibleAdsMetrics, setVisibleAdsMetrics] = useState(['total_sales', 'tacos']);
  const [selectedMetrics, setSelectedMetrics] = useState({
    sales: [
      'units_sold',
      'sales',
      'sessions',
      'conversion_rate',
      'tacos',
      'price',
      'profit_margin',
      'profit_total',
      'organic_sales_pct'
    ],
    ads: [
      'units_sold',
      'sales',
      'sessions',
      'conversion_rate',
      'tacos',
      'ad_spend',
      'ad_cpc',
      'organic_sales_pct'
    ]
  });

  const themeClasses = {
    bg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    cardBg: isDarkMode ? 'bg-[#1e293b]' : 'bg-[#1e293b]', // Match the dark blue from screenshot
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    inputBg: isDarkMode ? 'bg-dark-bg-tertiary' : 'bg-gray-50',
  };

  // Get weeks based on selected view
  const getWeeksForView = (view) => {
    switch(view) {
      case '1 Year': return 52;
      case '2 Years': return 104;
      case '3 Years': return 156;
      default: return 52;
    }
  };

  // Reset weights to default when product changes
  useEffect(() => {
    const childAsin = data?.child_asin || data?.childAsin;
    
    if (childAsin && childAsin !== currentProductAsin) {
      // Product changed - reset to defaults
      setSalesVelocityWeight(25);
      setSvVelocityWeight(15);
      setTempSalesVelocityWeight(25);
      setTempSvVelocityWeight(15);
      setCurrentProductAsin(childAsin);
      
      console.log('🔄 Product changed, resetting weights to default:', {
        newAsin: childAsin,
        previousAsin: currentProductAsin
      });
    }
  }, [data?.child_asin, data?.childAsin, currentProductAsin]);

  // Fetch N-GOOS data from API
  useEffect(() => {
    const fetchNgoosData = async () => {
      const childAsin = data?.child_asin || data?.childAsin;
      
      if (!childAsin) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
              const weeks = getWeeksForView(selectedView);
              
              // Fetch all N-GOOS data in parallel
              const [details, forecast, chart, metricsData, salesChart, adsChart] = await Promise.all([
                NgoosAPI.getProductDetails(childAsin),
                NgoosAPI.getForecast(childAsin),
                NgoosAPI.getChartData(childAsin, weeks, salesVelocityWeight, svVelocityWeight),
                NgoosAPI.getMetrics(childAsin, metricsDays),
                NgoosAPI.getSalesChart(childAsin, metricsDays),
                NgoosAPI.getAdsChart(childAsin, metricsDays)
              ]);

              setProductDetails(details);
              setForecastData(forecast);
              setChartData(chart);
              setMetrics(metricsData);
              setSalesChartData(salesChart);
              setAdsChartData(adsChart);
              
              // Debug logging
              console.log('Ads Chart Response:', adsChart);
              console.log('Chart Data Array:', adsChart?.chart_data);
      } catch (error) {
        console.error('Error fetching N-GOOS data:', error);
        toast.error('Failed to load N-GOOS data', {
          description: error.message
        });
      } finally {
        setLoading(false);
      }
    };

      fetchNgoosData();
    }, [data?.child_asin, data?.childAsin, selectedView, metricsDays, salesVelocityWeight, svVelocityWeight]);

  // Extract inventory data from API response or use fallback
  const inventoryData = productDetails?.inventory || {
    fba: {
      total: 0,
      available: 0,
      reserved: 0,
      inbound: 0
    },
    awd: {
      total: 0,
      outbound_to_fba: 0,
      available: 0,
      reserved: 0
    }
  };

  // Extract timeline data from forecast API response
  const timeline = {
    fbaAvailable: Math.round(forecastData?.fba_available_days || 0),
    totalDays: Math.round(forecastData?.total_days || 0),
    forecast: Math.round(forecastData?.forecast_days || 0),
    adjustment: Math.round(forecastData?.forecast_adjustment || 0)
  };

  // Prepare chart data for visualization with inventory bars
  const chartDisplayData = useMemo(() => {
    if (!chartData || !forecastData) return [];

    const historical = chartData.historical || [];
    let forecast = chartData.forecast || [];
    
    // 🎯 Limit forecast to half of selected period for better detail/zoom
    const maxForecastWeeks = getWeeksForView(selectedView) / 2;
    forecast = forecast.slice(0, maxForecastWeeks);
    
    // Get current date and DOI goal date from forecast
    // When doiGoalDays is provided (from production planning), calculate DOI goal date from it
    const currentDate = new Date(forecastData.current_date || Date.now());
    const doiGoalDate = doiGoalDays 
      ? new Date(currentDate.getTime() + doiGoalDays * 24 * 60 * 60 * 1000)
      : new Date(forecastData.doi_goal_date || Date.now());
    
    // Calculate runout dates based on DOI days from current date
    // Per CALCULATIONS.md: Runout Date = Current Date + DOI (days)
    const fbaAvailableDays = forecastData.fba_available_days || 0;
    const totalDays = forecastData.total_days || 0;
    
    // FBA Runout = Current Date + FBA Available Days
    const runoutDate = forecastData.runout_date 
      ? new Date(forecastData.runout_date)
      : new Date(currentDate.getTime() + fbaAvailableDays * 24 * 60 * 60 * 1000);
    
    // Total Runout = Current Date + Total Days (includes FBA + AWD + Inbound)
    const totalRunoutDate = forecastData.total_runout_date 
      ? new Date(forecastData.total_runout_date)
      : new Date(currentDate.getTime() + totalDays * 24 * 60 * 60 * 1000);
    
    
    // Find max value to make bars span full chart height
    let maxValue = 0;
    historical.forEach(item => {
      maxValue = Math.max(maxValue, item.units_sold || 0, item.units_smooth || 0);
    });
    forecast.forEach(item => {
      maxValue = Math.max(maxValue, item.forecast_base || 0, item.forecast_adjusted || 0);
    });
    
    // Use max value for full-height bars
    const barHeight = maxValue * 1.1; // 10% padding to ensure full coverage
    
    // Combine historical and forecast data
    const combinedData = [];
    
    // Add historical data
    historical.forEach(item => {
      const itemDate = new Date(item.week_end);
      const isInInventoryPeriod = itemDate >= currentDate && itemDate <= doiGoalDate;
      const isInFbaAvailPeriod = itemDate >= currentDate && itemDate < runoutDate;
      const isInTotalPeriod = itemDate >= runoutDate && itemDate < totalRunoutDate;
      
      combinedData.push({
        date: item.week_end,
        timestamp: itemDate.getTime(),
        unitsSold: item.units_sold || 0,
        unitsSmooth: item.units_smooth || 0,
        isForecast: false,
        isInDoiPeriod: isInInventoryPeriod,
        // Bars span full height when in their respective periods
        fbaAvail: isInFbaAvailPeriod ? barHeight : null,
        totalInv: isInTotalPeriod ? barHeight : null,
        forecastInv: null
      });
    });
    
    // Add forecast data with inventory visualization
    forecast.forEach((item, index) => {
      const itemDate = new Date(item.week_end);
      const isInInventoryPeriod = itemDate >= currentDate && itemDate <= doiGoalDate;
      const isInFbaAvailPeriod = itemDate >= currentDate && itemDate < runoutDate;
      const isInTotalPeriod = itemDate >= runoutDate && itemDate < totalRunoutDate;
      const isInForecastPeriod = itemDate >= totalRunoutDate && itemDate <= doiGoalDate;
      
      combinedData.push({
        date: item.week_end,
        timestamp: itemDate.getTime(),
        forecastBase: item.forecast_base || 0,
        forecastAdjusted: item.forecast_adjusted || 0,
        isForecast: true,
        isInDoiPeriod: isInInventoryPeriod,
        // Bars span full height when in their respective periods
        fbaAvail: isInFbaAvailPeriod ? barHeight : null,
        totalInv: isInTotalPeriod ? barHeight : null,
        forecastInv: isInForecastPeriod ? barHeight : null
      });
    });
    
    return combinedData;
  }, [chartData, forecastData, selectedView]);

  // Get timeline period boundaries for highlighting
  // Use doiGoalDays when provided (from production planning modal)
  const timelinePeriods = useMemo(() => {
    if (!forecastData) return null;
    
    // Calculate DOI goal date based on doiGoalDays if provided
    const currentDate = forecastData.current_date || new Date().toISOString();
    const calculatedDoiGoalDate = doiGoalDays 
      ? new Date(new Date(currentDate).getTime() + doiGoalDays * 24 * 60 * 60 * 1000).toISOString()
      : forecastData.doi_goal_date;
    
    return {
      fbaAvailable: {
        start: currentDate,
        end: forecastData.runout_date,
        color: '#a855f7',
        label: 'FBA Available'
      },
      total: {
        start: forecastData.runout_date,
        end: forecastData.total_runout_date,
        color: '#22c55e',
        label: 'Total'
      },
      forecast: {
        start: forecastData.total_runout_date,
        end: calculatedDoiGoalDate,
        color: '#3b82f6',
        label: 'Forecast'
      }
    };
  }, [forecastData, doiGoalDays]);

  // Handle zoom reset
  const handleZoomReset = () => {
    setZoomDomain({ left: null, right: null });
  };

  // Available metrics configuration
  // Sales Metrics Configuration
  const SALES_METRICS = [
    {
      id: 'units_sold',
      label: 'Units Sold',
      color: '#4169E1',
      valueKey: 'units_sold',
      formatType: 'number',
      defaultVisible: true
    },
    {
      id: 'sales',
      label: 'Sales',
      color: '#FF8C00',
      valueKey: 'sales',
      formatType: 'currency',
      defaultVisible: true
    },
    {
      id: 'sessions',
      label: 'Sessions',
      color: '#32CD32',
      valueKey: 'sessions',
      formatType: 'number',
      defaultVisible: false
    },
    {
      id: 'conversion_rate',
      label: 'Conversion Rate',
      color: '#9370DB',
      valueKey: 'conversion_rate',
      formatType: 'percentage',
      defaultVisible: false
    },
    {
      id: 'price',
      label: 'Price',
      color: '#FFD700',
      valueKey: 'price',
      formatType: 'currency',
      defaultVisible: false
    },
    {
      id: 'profit',
      label: 'Profit',
      color: '#228B22',
      valueKey: 'profit',
      formatType: 'currency',
      defaultVisible: false
    },
    {
      id: 'profit_margin',
      label: 'Profit %',
      color: '#20B2AA',
      valueKey: 'profit_margin',
      formatType: 'percentage',
      defaultVisible: false
    },
    {
      id: 'profit_total',
      label: 'Profit Total',
      color: '#3CB371',
      valueKey: 'profit_total',
      formatType: 'currency',
      defaultVisible: false
    }
  ];

  // Ads Metrics Configuration
  const ADS_METRICS = [
    {
      id: 'total_sales',
      label: 'Total Sales',
      color: '#4169E1',
      valueKey: 'total_sales',
      formatType: 'currency',
      defaultVisible: true
    },
    {
      id: 'tacos',
      label: 'TACOS',
      color: '#FF8C00',
      valueKey: 'tacos',
      formatType: 'percentage',
      defaultVisible: true
    },
    {
      id: 'ad_spend',
      label: 'Ad Spend',
      color: '#DC143C',
      valueKey: 'ad_spend',
      formatType: 'currency',
      defaultVisible: false
    },
    {
      id: 'ad_sales',
      label: 'Ad Sales',
      color: '#32CD32',
      valueKey: 'ad_sales',
      formatType: 'currency',
      defaultVisible: false
    },
    {
      id: 'ad_units',
      label: 'Ad Units',
      color: '#9370DB',
      valueKey: 'ad_units',
      formatType: 'number',
      defaultVisible: false
    },
    {
      id: 'acos',
      label: 'ACOS',
      color: '#FF69B4',
      valueKey: 'acos',
      formatType: 'percentage',
      defaultVisible: false
    },
    {
      id: 'cpc',
      label: 'CPC',
      color: '#FFD700',
      valueKey: 'cpc',
      formatType: 'currency',
      defaultVisible: false
    },
    {
      id: 'ad_clicks',
      label: 'Ad Clicks',
      color: '#20B2AA',
      valueKey: 'ad_clicks',
      formatType: 'number',
      defaultVisible: false
    },
    {
      id: 'ad_impressions',
      label: 'Impressions',
      color: '#778899',
      valueKey: 'ad_impressions',
      formatType: 'number',
      defaultVisible: false
    }
  ];

  const availableMetrics = [
    { id: 'units_sold', label: 'Units Sold', border: '2px solid #3b82f6' },
    { id: 'sales', label: 'Sales', border: '2px solid #f97316' },
    { id: 'sessions', label: 'Sessions', border: '1px solid #334155' },
    { id: 'conversion_rate', label: 'Conversion Rate', border: '1px solid #334155' },
    { id: 'tacos', label: 'TACOS', border: '1px solid #334155' },
    { id: 'price', label: 'Price', border: '1px solid #334155' },
    { id: 'profit_margin', label: 'Profit %', border: '1px solid #334155' },
    { id: 'profit_total', label: 'Profit Total', border: '1px solid #334155' },
    { id: 'organic_sales_pct', label: 'Organic Sales %', border: '1px solid #334155' },
    { id: 'ad_spend', label: 'Ad Spend', border: '1px solid #334155' },
    { id: 'ad_sales', label: 'Ad Sales', border: '1px solid #334155' },
    { id: 'ad_clicks', label: 'Ad Clicks', border: '1px solid #334155' },
    { id: 'ad_impressions', label: 'Ad Impressions', border: '1px solid #334155' },
    { id: 'ad_cpc', label: 'Ad CPC', border: '1px solid #334155' },
    { id: 'ad_orders', label: 'Ad Orders', border: '1px solid #334155' },
    { id: 'page_views', label: 'Page Views', border: '1px solid #334155' }
  ];

  const filteredMetrics = availableMetrics.filter(metric =>
    metric.label.toLowerCase().includes(metricSearch.toLowerCase())
  );

  const toggleMetric = (metricId) => {
    setSelectedMetrics(prev => {
      const currentTab = activeTab === 'sales' ? 'sales' : 'ads';
      const currentMetrics = prev[currentTab];
      
      if (currentMetrics.includes(metricId)) {
        return {
          ...prev,
          [currentTab]: currentMetrics.filter(id => id !== metricId)
        };
      } else {
        return {
          ...prev,
          [currentTab]: [...currentMetrics, metricId]
        };
      }
    });
  };

  const clearAllMetrics = () => {
    const currentTab = activeTab === 'sales' ? 'sales' : 'ads';
    setSelectedMetrics(prev => ({
      ...prev,
      [currentTab]: []
    }));
  };

  const getCurrentMetrics = () => {
    return activeTab === 'sales' ? selectedMetrics.sales : selectedMetrics.ads;
  };

  const handlePerformAnalysis = async () => {
    setShowAIModal(true);
    setIsAnalyzing(true);
    setAiAnalysis('');

    try {
      const currentTab = activeTab === 'forecast' ? 'sales' : activeTab;
      const analysis = await OpenAIService.analyzeMetrics(data, metrics, currentTab);
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
      content: `Context: You are analyzing ${metrics?.product?.name || data?.product || 'a product'} (ASIN: ${metrics?.product?.asin || data?.child_asin || 'N/A'}). Current tab: ${activeTab}`
    };

    const response = await OpenAIService.askFollowUp([contextMessage, ...messages], question);
    return response;
  };

  const handleOpenAdjustmentModal = () => {
    setTempSalesVelocityWeight(salesVelocityWeight);
    setTempSvVelocityWeight(svVelocityWeight);
    setShowAdjustmentModal(true);
  };

  const handleApplyAdjustments = () => {
    setSalesVelocityWeight(tempSalesVelocityWeight);
    setSvVelocityWeight(tempSvVelocityWeight);
    setShowAdjustmentModal(false);
    toast.success('Forecast adjusted', {
      description: `Sales Velocity: ${tempSalesVelocityWeight}%, Search Volume: ${tempSvVelocityWeight}%`
    });
  };

  const handleCancelAdjustments = () => {
    setTempSalesVelocityWeight(salesVelocityWeight);
    setTempSvVelocityWeight(svVelocityWeight);
    setShowAdjustmentModal(false);
  };

  const toggleSalesMetric = (metricId) => {
    setVisibleSalesMetrics(prev => {
      if (prev.includes(metricId)) {
        // Don't allow hiding all metrics
        if (prev.length === 1) return prev;
        return prev.filter(id => id !== metricId);
      } else {
        return [...prev, metricId];
      }
    });
  };

  const toggleAdsMetric = (metricId) => {
    setVisibleAdsMetrics(prev => {
      if (prev.includes(metricId)) {
        // Don't allow hiding all metrics
        if (prev.length === 1) return prev;
        return prev.filter(id => id !== metricId);
      } else {
        return [...prev, metricId];
      }
    });
  };

  const formatChartValue = (value, formatType) => {
    if (value === null || value === undefined) return '0';
    
    switch (formatType) {
      case 'currency':
        return `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'percentage':
        return `${Number(value).toFixed(1)}%`;
      case 'number':
        return Number(value).toLocaleString();
      default:
        return String(value);
    }
  };

  const getMetricValue = (metricId) => {
    const current = metrics?.current_period;
    const changes = metrics?.changes;
    
    switch(metricId) {
      case 'units_sold':
        return {
          value: current?.units_sold?.toLocaleString() || '0',
          change: changes?.units_sold,
          prefix: ''
        };
      case 'sales':
        return {
          value: current?.sales?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '0',
          change: changes?.sales,
          prefix: '$'
        };
      case 'sessions':
        return {
          value: current?.sessions?.toLocaleString() || '0',
          change: changes?.sessions,
          prefix: ''
        };
      case 'conversion_rate':
        return {
          value: (current?.conversion_rate?.toFixed(1) || '0.0') + '%',
          change: changes?.conversion_rate,
          prefix: ''
        };
      case 'tacos':
        return {
          value: (current?.tacos?.toFixed(1) || '0.0') + '%',
          change: changes?.tacos,
          prefix: '',
          invertColor: true
        };
      case 'price':
        return {
          value: current?.price?.toFixed(2) || '0.00',
          change: changes?.price,
          prefix: '$'
        };
      case 'profit_margin':
        return {
          value: (current?.profit_margin?.toFixed(1) || '0.0') + '%',
          change: changes?.profit_margin,
          prefix: ''
        };
      case 'profit_total':
        return {
          value: current?.profit_total?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '0',
          change: changes?.profit_total,
          prefix: '$'
        };
      case 'organic_sales_pct':
        return {
          value: (current?.organic_sales_pct?.toFixed(0) || '0') + '%',
          change: null,
          prefix: ''
        };
      case 'ad_spend':
        return {
          value: current?.ad_spend?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00',
          change: null,
          prefix: '$'
        };
      case 'ad_sales':
        return {
          value: current?.ad_sales?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00',
          change: null,
          prefix: '$'
        };
      case 'ad_clicks':
        return {
          value: current?.ad_clicks?.toLocaleString() || '0',
          change: null,
          prefix: ''
        };
      case 'ad_impressions':
        return {
          value: current?.ad_impressions?.toLocaleString() || '0',
          change: null,
          prefix: ''
        };
      case 'ad_cpc':
        return {
          value: ((current?.ad_spend || 0) / (current?.ad_clicks || 1)).toFixed(2),
          change: null,
          prefix: '$'
        };
      case 'ad_orders':
        return {
          value: current?.ad_orders?.toLocaleString() || '0',
          change: null,
          prefix: ''
        };
      case 'page_views':
        return {
          value: current?.page_views?.toLocaleString() || '0',
          change: null,
          prefix: ''
        };
      default:
        return { value: '0', change: null, prefix: '' };
    }
  };

  // Handle double-click zoom
  const handleChartClick = (e) => {
    if (!e || !e.activeLabel) return;
    
    const currentTime = new Date().getTime();
    const timeDiff = currentTime - lastClickTime;
    
    // Detect double-click (within 300ms)
    if (timeDiff < 300) {
      // Double-click detected - zoom in
      const clickedDate = new Date(e.activeLabel);
      const allDates = chartDisplayData.map(d => new Date(d.date).getTime()).sort((a, b) => a - b);
      
      // Find the index of clicked date
      const clickedIndex = allDates.findIndex(d => Math.abs(d - clickedDate.getTime()) < 1000 * 60 * 60 * 24 * 7);
      
      if (clickedIndex !== -1) {
        // Zoom to show ±4 weeks around clicked date (8 weeks total)
        const zoomRange = 4;
        const startIndex = Math.max(0, clickedIndex - zoomRange);
        const endIndex = Math.min(allDates.length - 1, clickedIndex + zoomRange);
        
        const startDate = new Date(allDates[startIndex]);
        const endDate = new Date(allDates[endIndex]);
        
        setZoomDomain({
          left: startDate.toISOString().split('T')[0],
          right: endDate.toISOString().split('T')[0]
        });
      }
    }
    
    setLastClickTime(currentTime);
  };

  // Custom tooltip with detailed date and filtering
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const date = new Date(label);
      return (
        <div style={{ 
          backgroundColor: '#1e293b', 
          padding: '0.75rem', 
          borderRadius: '0.5rem',
          border: '1px solid #475569',
          fontSize: '0.875rem',
          boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
        }}>
          <p style={{ color: '#fff', fontWeight: '600', marginBottom: '0.5rem' }}>
            {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
          {payload.map((entry, index) => {
            if (entry.value && entry.value !== 0 && entry.value !== null) {
              return (
                <p key={index} style={{ color: entry.color, margin: '0.25rem 0', fontSize: '0.75rem' }}>
                  {entry.name}: {Math.round(entry.value).toLocaleString()}
                </p>
              );
            }
            return null;
          })}
        </div>
      );
    }
    return null;
  };

  // Show loading state
  if (loading) {
    return (
      <div className={`${themeClasses.bg} rounded-xl border ${themeClasses.border} shadow-sm`}>
        <div className={`px-6 py-4 border-b ${themeClasses.border}`}>
          <h2 className={`text-lg font-semibold ${themeClasses.text}`}>N-GOOS Inventory</h2>
        </div>
        <div style={{ padding: '3rem', textAlign: 'center' }}>
          <div style={{ display: 'inline-block' }}>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" style={{ margin: '0 auto' }}></div>
            <p className={`mt-4 text-sm ${themeClasses.textSecondary}`}>Loading N-GOOS data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show message if no child ASIN
  if (!data?.child_asin && !data?.childAsin) {
    return (
      <div className={`${themeClasses.bg} rounded-xl border ${themeClasses.border} shadow-sm`}>
        <div className={`px-6 py-4 border-b ${themeClasses.border}`}>
          <h2 className={`text-lg font-semibold ${themeClasses.text}`}>N-GOOS Inventory</h2>
        </div>
        <div style={{ padding: '3rem', textAlign: 'center' }}>
          <svg style={{ width: '64px', height: '64px', margin: '0 auto', marginBottom: '1rem', color: '#64748b' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <p className={`text-sm ${themeClasses.text} font-medium mb-2`}>N-GOOS Not Available</p>
          <p className={`text-xs ${themeClasses.textSecondary}`}>This feature is only available for child products with an ASIN</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${themeClasses.bg} rounded-xl border ${themeClasses.border} shadow-sm`}>
      {/* Tab Navigation - Hidden when inventoryOnly is true */}
      {!inventoryOnly && (
        <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid #334155' }}>
          <button
            onClick={() => setActiveTab('forecast')}
            style={{
              padding: '1rem 2rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: activeTab === 'forecast' ? '#fff' : '#94a3b8',
              backgroundColor: activeTab === 'forecast' ? '#1e293b' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'forecast' ? '2px solid #3b82f6' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Inventory
          </button>
          <button
            onClick={() => setActiveTab('sales')}
            style={{
              padding: '1rem 2rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: activeTab === 'sales' ? '#fff' : '#94a3b8',
              backgroundColor: activeTab === 'sales' ? '#1e293b' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'sales' ? '2px solid #3b82f6' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Sales
          </button>
          <button
            onClick={() => setActiveTab('ads')}
            style={{
              padding: '1rem 2rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: activeTab === 'ads' ? '#fff' : '#94a3b8',
              backgroundColor: activeTab === 'ads' ? '#1e293b' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'ads' ? '2px solid #3b82f6' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Ads
          </button>
        </div>
      )}

      {/* Inventory Tab Content */}
      {activeTab === 'forecast' && (
        <div>
      {/* Header - Hidden when inventoryOnly (shown in parent modal) */}
      {!inventoryOnly && (
        <div className={`px-6 py-4 border-b ${themeClasses.border}`}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h2 className={`text-lg font-semibold ${themeClasses.text}`}>N-GOOS Inventory</h2>
              <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 text-xs font-medium">
                Never Go Out Of Stock
              </span>
            </div>
            {productDetails?.inventory && (
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div className="px-3 py-1 rounded-md bg-red-500/10 border border-red-500/20" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: '600' }}>●</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#ef4444' }}>
                    Label Inventory: {inventoryData.fba.total + inventoryData.awd.total}
                  </span>
                </div>
                <button className="px-4 py-1.5 rounded-md bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors">
                  Add Units ({forecastData?.units_to_make || 0})
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content - More compact padding when inventoryOnly */}
      <div className={inventoryOnly ? "" : "px-6 pb-6"} style={{ padding: inventoryOnly ? '0.5rem 0.75rem' : '1.5rem' }}>
        {/* Main Grid - Horizontal layout when inventoryOnly */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: inventoryOnly ? '1fr 1fr 1fr' : '1fr 2fr', 
          gap: inventoryOnly ? '0.75rem' : '1.5rem', 
          marginBottom: inventoryOnly ? '0.75rem' : '2rem' 
        }}>
          {/* Left: Product Info */}
          <div className={themeClasses.cardBg} style={{ borderRadius: '0.5rem', padding: inventoryOnly ? '0.75rem' : '1.5rem' }}>
            <div style={{ display: 'flex', gap: inventoryOnly ? '0.5rem' : '1rem', marginBottom: inventoryOnly ? '0' : '1.5rem' }}>
              <div style={{ 
                width: inventoryOnly ? '50px' : '80px', 
                height: inventoryOnly ? '75px' : '120px', 
                backgroundColor: '#fff', 
                borderRadius: '0.375rem', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                overflow: 'hidden',
                flexShrink: 0
              }}>
                {data?.mainImage ? (
                  <img src={data.mainImage} alt={data.product} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                ) : (
                  <svg style={{ width: inventoryOnly ? '1.5rem' : '3rem', height: inventoryOnly ? '1.5rem' : '3rem', color: '#9ca3af' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ 
                  fontSize: inventoryOnly ? '0.8rem' : '1.125rem', 
                  fontWeight: '600', 
                  color: '#fff', 
                  marginBottom: inventoryOnly ? '0.2rem' : '0.5rem',
                  lineHeight: 1.2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: inventoryOnly ? 'nowrap' : 'normal'
                }}>
                  {productDetails?.product?.name || data?.product || 'Product Name'}
                </h3>
                <div style={{ fontSize: inventoryOnly ? '0.7rem' : '0.875rem', color: '#94a3b8', marginBottom: '0.15rem' }}>
                  SIZE: {productDetails?.product?.size || data?.size || data?.variations?.[0] || 'N/A'}
                </div>
                <div style={{ fontSize: inventoryOnly ? '0.7rem' : '0.875rem', color: '#94a3b8', marginBottom: '0.15rem' }}>
                  ASIN: {productDetails?.product?.asin || data?.child_asin || data?.childAsin || 'N/A'}
                </div>
                <div style={{ fontSize: inventoryOnly ? '0.7rem' : '0.875rem', color: '#94a3b8' }}>
                  BRAND: {productDetails?.product?.brand || data?.brand || 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* FBA Card */}
          <div className={themeClasses.cardBg} style={{ borderRadius: '0.5rem', padding: inventoryOnly ? '0.75rem' : '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: inventoryOnly ? '0.5rem' : '1rem' }}>
              <div style={{ 
                width: inventoryOnly ? '24px' : '32px', 
                height: inventoryOnly ? '24px' : '32px', 
                borderRadius: '50%', 
                backgroundColor: '#22c55e', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <svg style={{ width: inventoryOnly ? '14px' : '18px', height: inventoryOnly ? '14px' : '18px', color: '#fff' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <span style={{ fontSize: inventoryOnly ? '0.75rem' : '0.875rem', fontWeight: '600', color: '#fff' }}>FBA</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: inventoryOnly ? '0.25rem' : '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: inventoryOnly ? '0.7rem' : '0.875rem', color: '#94a3b8' }}>Total:</span>
                <span style={{ fontSize: inventoryOnly ? '0.7rem' : '0.875rem', fontWeight: '600', color: '#fff' }}>{inventoryData.fba.total}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: inventoryOnly ? '0.7rem' : '0.875rem', color: '#94a3b8' }}>Available:</span>
                <span style={{ fontSize: inventoryOnly ? '0.7rem' : '0.875rem', fontWeight: '600', color: '#fff' }}>{inventoryData.fba.available}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: inventoryOnly ? '0.7rem' : '0.875rem', color: '#94a3b8' }}>Reserved:</span>
                <span style={{ fontSize: inventoryOnly ? '0.7rem' : '0.875rem', fontWeight: '600', color: '#fff' }}>{inventoryData.fba.reserved}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: inventoryOnly ? '0.7rem' : '0.875rem', color: '#94a3b8' }}>Inbound:</span>
                <span style={{ fontSize: inventoryOnly ? '0.7rem' : '0.875rem', fontWeight: '600', color: '#fff' }}>{inventoryData.fba.inbound}</span>
              </div>
            </div>
          </div>

          {/* AWD Card */}
          <div className={themeClasses.cardBg} style={{ borderRadius: '0.5rem', padding: inventoryOnly ? '0.75rem' : '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: inventoryOnly ? '0.5rem' : '1rem' }}>
              <div style={{ 
                width: inventoryOnly ? '24px' : '32px', 
                height: inventoryOnly ? '24px' : '32px', 
                borderRadius: '50%', 
                backgroundColor: '#3b82f6', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <svg style={{ width: inventoryOnly ? '14px' : '18px', height: inventoryOnly ? '14px' : '18px', color: '#fff' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </div>
              <span style={{ fontSize: inventoryOnly ? '0.75rem' : '0.875rem', fontWeight: '600', color: '#fff' }}>AWD</span>
            </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: inventoryOnly ? '0.25rem' : '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: inventoryOnly ? '0.7rem' : '0.875rem', color: '#94a3b8' }}>Total:</span>
                  <span style={{ fontSize: inventoryOnly ? '0.7rem' : '0.875rem', fontWeight: '600', color: '#fff' }}>{inventoryData.awd.total}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: inventoryOnly ? '0.7rem' : '0.875rem', color: '#94a3b8' }}>Outbound:</span>
                  <span style={{ fontSize: inventoryOnly ? '0.7rem' : '0.875rem', fontWeight: '600', color: '#fff' }}>{inventoryData.awd.outbound_to_fba || 0}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: inventoryOnly ? '0.7rem' : '0.875rem', color: '#94a3b8' }}>Available:</span>
                  <span style={{ fontSize: inventoryOnly ? '0.7rem' : '0.875rem', fontWeight: '600', color: '#fff' }}>{inventoryData.awd.available}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: inventoryOnly ? '0.7rem' : '0.875rem', color: '#94a3b8' }}>Reserved:</span>
                  <span style={{ fontSize: inventoryOnly ? '0.7rem' : '0.875rem', fontWeight: '600', color: '#fff' }}>{inventoryData.awd.reserved}</span>
                </div>
              </div>
            </div>
        </div>

        {/* Timeline Bar - Compact when inventoryOnly */}
        <div className={themeClasses.cardBg} style={{ borderRadius: '0.5rem', padding: inventoryOnly ? '0.75rem' : '1.5rem', marginBottom: inventoryOnly ? '0.75rem' : '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: inventoryOnly ? '0.5rem' : '1rem' }}>
            <div style={{ fontSize: inventoryOnly ? '0.65rem' : '0.75rem', color: '#94a3b8' }}>
              Today<br />{forecastData?.current_date ? new Date(forecastData.current_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }) : '11/11/25'}
            </div>
            <div style={{ fontSize: inventoryOnly ? '0.65rem' : '0.75rem', color: '#94a3b8' }}>Dec</div>
            <div style={{ fontSize: inventoryOnly ? '0.65rem' : '0.75rem', color: '#94a3b8' }}>Jan</div>
            <div style={{ fontSize: inventoryOnly ? '0.65rem' : '0.75rem', color: '#94a3b8' }}>Feb</div>
            <div style={{ fontSize: inventoryOnly ? '0.65rem' : '0.75rem', color: '#94a3b8' }}>Mar</div>
            <div style={{ fontSize: inventoryOnly ? '0.65rem' : '0.75rem', color: '#94a3b8', textAlign: 'right' }}>
              DOI Goal{doiGoalDays ? ` (${doiGoalDays}d)` : ''}<br />
              {(() => {
                if (doiGoalDays) {
                  const goalDate = new Date(Date.now() + doiGoalDays * 24 * 60 * 60 * 1000);
                  return goalDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
                }
                return forecastData?.doi_goal_date 
                  ? new Date(forecastData.doi_goal_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }) 
                  : '4/13/25';
              })()}
            </div>
          </div>
          
          <div style={{ display: 'flex', height: inventoryOnly ? '40px' : '60px', borderRadius: '0.375rem', overflow: 'hidden', position: 'relative' }}>
            <div style={{ 
              width: '20%', 
              backgroundColor: '#a855f7', 
              display: 'flex', 
              flexDirection: inventoryOnly ? 'row' : 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: inventoryOnly ? '0.25rem' : 0,
              color: '#fff',
              fontSize: inventoryOnly ? '0.7rem' : '0.875rem',
              fontWeight: '600'
            }}>
              <div>{timeline.fbaAvailable} Days</div>
              <div style={{ fontSize: inventoryOnly ? '0.6rem' : '0.75rem', opacity: 0.8 }}>FBA</div>
            </div>
            <div style={{ 
              width: '35%', 
              backgroundColor: '#22c55e', 
              display: 'flex', 
              flexDirection: inventoryOnly ? 'row' : 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: inventoryOnly ? '0.25rem' : 0,
              color: '#fff',
              fontSize: inventoryOnly ? '0.7rem' : '0.875rem',
              fontWeight: '600'
            }}>
              <div>{timeline.totalDays} Days</div>
              <div style={{ fontSize: inventoryOnly ? '0.6rem' : '0.75rem', opacity: 0.8 }}>Total</div>
            </div>
            <div style={{ 
              width: '45%', 
              backgroundColor: '#3b82f6', 
              display: 'flex', 
              flexDirection: inventoryOnly ? 'row' : 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: inventoryOnly ? '0.25rem' : 0,
              color: '#fff',
              fontSize: inventoryOnly ? '0.7rem' : '0.875rem',
              fontWeight: '600',
              position: 'relative'
            }}>
              <div>{timeline.forecast} Days</div>
              <div style={{ fontSize: inventoryOnly ? '0.6rem' : '0.75rem', opacity: 0.8 }}>Forecast</div>
              {timeline.adjustment !== 0 && (
                <div style={{ 
                  position: 'absolute', 
                  right: inventoryOnly ? '-12px' : '-20px', 
                  top: inventoryOnly ? '-12px' : '-20px',
                  width: inventoryOnly ? '28px' : '40px',
                  height: inventoryOnly ? '28px' : '40px',
                  borderRadius: '50%',
                  backgroundColor: timeline.adjustment > 0 ? '#f59e0b' : '#ef4444',
                  border: '2px solid #1e293b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: inventoryOnly ? '0.65rem' : '0.875rem',
                  fontWeight: '700'
                }}>
                  {timeline.adjustment > 0 ? `+${timeline.adjustment}` : timeline.adjustment}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Unit Forecast Chart - Compact when inventoryOnly */}
        <div className={themeClasses.cardBg} style={{ borderRadius: '0.5rem', padding: inventoryOnly ? '0.75rem' : '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: inventoryOnly ? '0.5rem' : '1rem' }}>
            <div>
              <h3 style={{ fontSize: inventoryOnly ? '0.85rem' : '1rem', fontWeight: '600', color: '#fff', marginBottom: '0.15rem' }}>Unit Forecast</h3>
              <p style={{ fontSize: inventoryOnly ? '0.75rem' : '0.875rem', color: '#94a3b8' }}>
                {productDetails?.product?.size || data?.size || data?.variations?.[0] || '8oz'} Forecast
              </p>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem', color: '#3b82f6' }}>All Variations</span>
                <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
                  <input type="checkbox" style={{ opacity: 0, width: 0, height: 0 }} />
                  <span style={{ 
                    position: 'absolute', 
                    cursor: 'pointer', 
                    top: 0, 
                    left: 0, 
                    right: 0, 
                    bottom: 0, 
                    backgroundColor: '#475569', 
                    transition: '0.4s',
                    borderRadius: '24px'
                  }}>
                    <span style={{ 
                      position: 'absolute', 
                      content: '', 
                      height: '18px', 
                      width: '18px', 
                      left: '3px', 
                      bottom: '3px', 
                      backgroundColor: 'white', 
                      transition: '0.4s',
                      borderRadius: '50%'
                    }}></span>
                  </span>
                </label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Forecast View</span>
                <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
                  <input type="checkbox" defaultChecked style={{ opacity: 0, width: 0, height: 0 }} />
                  <span style={{ 
                    position: 'absolute', 
                    cursor: 'pointer', 
                    top: 0, 
                    left: 0, 
                    right: 0, 
                    bottom: 0, 
                    backgroundColor: '#3b82f6', 
                    transition: '0.4s',
                    borderRadius: '24px'
                  }}>
                    <span style={{ 
                      position: 'absolute', 
                      content: '', 
                      height: '18px', 
                      width: '18px', 
                      right: '3px', 
                      bottom: '3px', 
                      backgroundColor: 'white', 
                      transition: '0.4s',
                      borderRadius: '50%'
                    }}></span>
                  </span>
                </label>
              </div>
              <button 
                onClick={handleOpenAdjustmentModal}
                title="Adjustment Weights"
                style={{ 
                  padding: '0.5rem', 
                  color: '#94a3b8', 
                  backgroundColor: 'rgba(59, 130, 246, 0.1)', 
                  border: '1px solid rgba(59, 130, 246, 0.3)', 
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
                  e.currentTarget.style.color = '#3b82f6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                  e.currentTarget.style.color = '#94a3b8';
                }}
              >
                <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <select 
                value={selectedView}
                onChange={(e) => setSelectedView(e.target.value)}
                style={{ 
                  padding: '0.375rem 0.75rem', 
                  borderRadius: '0.375rem', 
                  backgroundColor: '#334155', 
                  color: '#fff',
                  border: '1px solid #475569',
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                <option value="1 Year">1 Year</option>
                <option value="2 Years">2 Years</option>
                <option value="3 Years">3 Years</option>
              </select>
            </div>
          </div>

          {/* Chart Legend */}
          <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', marginTop: '1rem', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '32px', height: '2px', backgroundColor: '#64748b' }}></div>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Unit Sales</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '32px', height: '2px', backgroundColor: '#f97316' }}></div>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Forecast</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '32px', height: '2px', backgroundColor: '#06b6d4' }}></div>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Search Volume</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '12px', height: '12px', backgroundColor: '#a855f7', borderRadius: '2px' }}></div>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>FBA Avail</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '12px', height: '12px', backgroundColor: '#22c55e', borderRadius: '2px' }}></div>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Total Inv</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '12px', height: '12px', backgroundColor: '#3b82f6', borderRadius: '2px' }}></div>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Forecast</span>
            </div>
          </div>

          {/* Chart Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>
              💡 Double-click on the chart to zoom in for detailed dates
            </div>
            <button 
              onClick={handleZoomReset}
              style={{ 
                padding: '0.375rem 0.75rem', 
                fontSize: '0.75rem',
                color: '#94a3b8',
                backgroundColor: '#1e293b',
                border: '1px solid #475569',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#334155';
                e.target.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#1e293b';
                e.target.style.color = '#94a3b8';
              }}
            >
              Reset Zoom
            </button>
          </div>

          {/* Chart Area - More compact height when inventoryOnly */}
          <div style={{ height: inventoryOnly ? '240px' : '320px', width: '100%', marginTop: '0.25rem' }}>
            {chartDisplayData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartDisplayData}
                  margin={{ top: 5, right: 40, left: 10, bottom: 25 }}
                  onClick={handleChartClick}
                  onMouseDown={(e) => {
                    if (e) {
                      setZoomDomain({ ...zoomDomain, left: e.activeLabel });
                      setIsZooming(true);
                    }
                  }}
                  onMouseMove={(e) => {
                    if (isZooming && e) {
                      setZoomDomain({ ...zoomDomain, right: e.activeLabel });
                    }
                  }}
                  onMouseUp={() => {
                    if (isZooming && zoomDomain.left && zoomDomain.right) {
                      setIsZooming(false);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  
                  {/* Timeline Period Background Highlights */}
                  {timelinePeriods?.fbaAvailable && (
                    <ReferenceArea
                      x1={timelinePeriods.fbaAvailable.start}
                      x2={timelinePeriods.fbaAvailable.end}
                      fill="#a855f7"
                      fillOpacity={0.18}
                      strokeOpacity={0}
                      ifOverflow="extendDomain"
                      isFront={false}
                    />
                  )}
                  
                  {timelinePeriods?.total && (
                    <ReferenceArea
                      x1={timelinePeriods.total.start}
                      x2={timelinePeriods.total.end}
                      fill="#22c55e"
                      fillOpacity={0.18}
                      strokeOpacity={0}
                      ifOverflow="extendDomain"
                      isFront={false}
                    />
                  )}
                  
                  {timelinePeriods?.forecast && (
                    <ReferenceArea
                      x1={timelinePeriods.forecast.start}
                      x2={timelinePeriods.forecast.end}
                      fill="#3b82f6"
                      fillOpacity={0.18}
                      strokeOpacity={0}
                      ifOverflow="extendDomain"
                      isFront={false}
                    />
                  )}
                  
                  <XAxis 
                    dataKey="date" 
                    stroke="#475569"
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      // Show more detailed format when zoomed
                      if (zoomDomain.left && zoomDomain.right) {
                        return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                      }
                      return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear().toString().slice(-2)}`;
                    }}
                    domain={zoomDomain.left && zoomDomain.right ? [zoomDomain.left, zoomDomain.right] : ['auto', 'auto']}
                    interval={zoomDomain.left && zoomDomain.right ? 0 : "preserveStartEnd"}
                    minTickGap={zoomDomain.left && zoomDomain.right ? 20 : 30}
                    angle={zoomDomain.left && zoomDomain.right ? -45 : 0}
                    textAnchor={zoomDomain.left && zoomDomain.right ? "end" : "middle"}
                  />
                  <YAxis 
                    yAxisId="left"
                    stroke="#475569"
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    tickFormatter={(value) => {
                      if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                      return value;
                    }}
                    label={{ value: 'Unit Sales', angle: -90, position: 'insideLeft', style: { fill: '#64748b', fontSize: 11 } }}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    stroke="#475569"
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    tickFormatter={(value) => {
                      if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                      return value;
                    }}
                    label={{ value: 'Search Volume', angle: 90, position: 'insideRight', style: { fill: '#64748b', fontSize: 11 } }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  
                  {/* Inventory Bars - Full Height - FBA Available (Purple) */}
                  <Bar 
                    yAxisId="left"
                    dataKey="fbaAvail" 
                    fill="#a855f7" 
                    fillOpacity={0.9}
                    name="FBA Avail"
                    barSize={40}
                    stackId="inventory"
                  />
                  
                  {/* Inventory Bars - Full Height - Total Inventory (Green) */}
                  <Bar 
                    yAxisId="left"
                    dataKey="totalInv" 
                    fill="#22c55e" 
                    fillOpacity={0.9}
                    name="Total Inv"
                    barSize={40}
                    stackId="inventory"
                  />
                  
                  {/* Inventory Bars - Full Height - Forecast (Blue) */}
                  <Bar 
                    yAxisId="left"
                    dataKey="forecastInv" 
                    fill="#3b82f6" 
                    fillOpacity={0.9}
                    name="Forecast"
                    barSize={40}
                    stackId="inventory"
                  />
                  
                  {/* Unit Sales - Gray line */}
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="unitsSold" 
                    stroke="#64748b" 
                    strokeWidth={2}
                    dot={false}
                    name="Unit Sales"
                    connectNulls
                  />
                  
                  {/* Forecast - Orange line */}
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="forecastAdjusted" 
                    stroke="#f97316" 
                    strokeWidth={2.5}
                    dot={false}
                    name="Forecast"
                    connectNulls
                  />
                  
                  {/* Search Volume - Cyan/Teal line */}
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="unitsSmooth" 
                    stroke="#06b6d4" 
                    strokeWidth={2}
                    dot={false}
                    name="Search Volume"
                    connectNulls
                  />
                  
                  {/* Forecast Dashed - Orange dashed line */}
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="forecastBase" 
                    stroke="#f97316" 
                    strokeWidth={2}
                    strokeDasharray="8 4"
                    dot={false}
                    name="Forecast (Dashed)"
                    connectNulls
                  />
                  
                  {/* Brush for zooming */}
                  <Brush 
                    dataKey="date"
                    height={20}
                    stroke="#475569"
                    fill="#1e293b"
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getMonth() + 1}/${date.getFullYear().toString().slice(-2)}`;
                    }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #475569', borderRadius: '0.5rem' }}>
                <div style={{ textAlign: 'center', color: '#64748b' }}>
                  <svg style={{ width: '48px', height: '48px', margin: '0 auto', marginBottom: '0.5rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <p style={{ fontSize: '0.875rem' }}>No chart data available</p>
                </div>
              </div>
            )}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: '2rem', marginTop: '3rem', justifyContent: 'center', fontSize: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '40px', height: '3px', backgroundColor: '#06b6d4' }}></div>
              <span style={{ color: '#94a3b8' }}>Unit Sales</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '40px', height: '3px', backgroundColor: '#f97316' }}></div>
              <span style={{ color: '#94a3b8' }}>Forecast</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '40px', height: '3px', backgroundColor: '#64748b' }}></div>
              <span style={{ color: '#94a3b8' }}>Search Volume</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '20px', height: '12px', backgroundColor: '#a855f7' }}></div>
              <span style={{ color: '#94a3b8' }}>FBA Avail.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '20px', height: '12px', backgroundColor: '#22c55e' }}></div>
              <span style={{ color: '#94a3b8' }}>Total Inv.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '20px', height: '12px', backgroundColor: '#3b82f6' }}></div>
              <span style={{ color: '#94a3b8' }}>Forecast</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '40px', height: '3px', borderTop: '2px dashed #f97316' }}></div>
              <span style={{ color: '#94a3b8' }}>Forecast</span>
            </div>
          </div>
        </div>
      </div>
        </div>
      )}

      {/* Sales Tab Content */}
      {activeTab === 'sales' && (
          <div>
            {/* Header with Controls */}
            <div className="px-6 pt-6" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', gap: '1rem' }}>
              {/* Metric Controller */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', flex: 1 }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', alignSelf: 'center', marginRight: '0.5rem', fontWeight: '600', textTransform: 'uppercase' }}>
                  Metrics:
                </span>
                {SALES_METRICS.map(metric => {
                  const isVisible = visibleSalesMetrics.includes(metric.id);
                  return (
                    <button
                      key={metric.id}
                      onClick={() => toggleSalesMetric(metric.id)}
                      style={{
                        padding: '0.375rem 0.75rem',
                        borderRadius: '0.375rem',
                        backgroundColor: isVisible ? metric.color + '20' : 'transparent',
                        border: `2px solid ${isVisible ? metric.color : '#475569'}`,
                        color: isVisible ? metric.color : '#94a3b8',
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
                        backgroundColor: isVisible ? metric.color : '#475569'
                      }} />
                      {metric.label}
                    </button>
                  );
                })}
              </div>

              {/* Period Selectors */}
              <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
                <select 
                  value={metricsDays}
                  onChange={(e) => setMetricsDays(Number(e.target.value))}
                  style={{ 
                    padding: '0.5rem 1rem', 
                    borderRadius: '0.5rem', 
                    backgroundColor: '#1e293b', 
                    color: '#fff',
                    border: '1px solid #334155',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    minWidth: '100px'
                  }}
                >
                  <option value={7}>7 Days</option>
                  <option value={30}>30 Days</option>
                  <option value={60}>60 Days</option>
                  <option value={90}>90 Days</option>
                </select>
                
                <select 
                  style={{ 
                    padding: '0.5rem 1rem', 
                    borderRadius: '0.5rem', 
                    backgroundColor: '#1e293b', 
                    color: '#fff',
                    border: '1px solid #334155',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    minWidth: '120px'
                  }}
                >
                  <option value="prior">Prior Period</option>
                </select>
              </div>
            </div>

            {/* Graph Section: 70% Graph + 30% Banana Factors */}
            <div className="px-6" style={{ display: 'grid', gridTemplateColumns: '70% 30%', gap: '1.5rem', marginBottom: '1.5rem' }}>
              {/* Left: Graph (70%) */}
              <div className={themeClasses.cardBg} style={{ borderRadius: '0.75rem', padding: '1.5rem' }}>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={salesChartData?.chart_data || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      stroke="#64748b"
                      style={{ fontSize: '0.75rem' }}
                      tickLine={false}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                      }}
                    />
                    <YAxis 
                      stroke="#64748b"
                      style={{ fontSize: '0.75rem' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#0f172a', 
                        border: '1px solid #334155',
                        borderRadius: '0.5rem',
                        color: '#fff',
                        fontSize: '0.875rem'
                      }}
                      formatter={(value, name) => {
                        const metric = SALES_METRICS.find(m => m.label === name);
                        if (metric) {
                          return [formatChartValue(value, metric.formatType), name];
                        }
                        return [value, name];
                      }}
                    />
                    {/* Dynamically render visible metrics */}
                    {visibleSalesMetrics.length > 0 && SALES_METRICS
                      .filter(metric => visibleSalesMetrics.includes(metric.id))
                      .map((metric) => {
                        console.log('Rendering Sales metric:', metric.id, metric.valueKey, 'Sample data:', salesChartData?.chart_data?.[0]?.[metric.valueKey]);
                        return (
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
                        );
                      })}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Right: Banana Factors (30%) */}
              <div className={themeClasses.cardBg} style={{ borderRadius: '0.75rem', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#fff', marginBottom: '1.5rem' }}>Banana Factors</h3>
                
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Sessions */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid #334155' }}>
                    <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Sessions</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: '600', color: metrics?.changes?.sessions >= 0 ? '#22c55e' : '#ef4444' }}>
                      {metrics?.current_period?.sessions?.toLocaleString() || '0'}
                    </span>
                  </div>

                  {/* Conversion Rate */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid #334155' }}>
                    <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Conversion Rate</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: '600', color: metrics?.changes?.conversion_rate >= 0 ? '#22c55e' : '#ef4444' }}>
                      {metrics?.current_period?.conversion_rate?.toFixed(2) || '0.00'}%
                    </span>
                  </div>

                  {/* TACOS */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid #334155' }}>
                    <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>TACOS</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: '600', color: metrics?.changes?.tacos <= 0 ? '#22c55e' : '#ef4444' }}>
                      {metrics?.current_period?.tacos?.toFixed(2) || '0.00'}%
                    </span>
                  </div>
                </div>

                {/* Perform Analysis Button */}
                <button 
                  onClick={handlePerformAnalysis}
                  style={{
                    marginTop: 'auto',
                    padding: '0.75rem',
                    backgroundColor: '#3b82f6',
                    color: '#fff',
                    borderRadius: '0.5rem',
                    border: 'none',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <svg style={{ width: '1rem', height: '1rem' }} fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/>
                  </svg>
                  Perform Analysis
                </button>
                <div style={{ fontSize: '0.625rem', color: '#64748b', textAlign: 'center', marginTop: '0.5rem' }}>
                  Powered by Banana Brain AI
                </div>
              </div>
            </div>

            {/* Bottom Section: Metrics Grid */}
            <div className="px-6 pb-6" style={{ position: 'relative' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem' }}>
                  {getCurrentMetrics().map(metricId => {
                    const metric = availableMetrics.find(m => m.id === metricId);
                    if (!metric) return null;
                    const metricData = getMetricValue(metricId);
                    const changeColor = metricData.invertColor 
                      ? (metricData.change >= 0 ? '#ef4444' : '#22c55e')
                      : (metricData.change >= 0 ? '#22c55e' : '#ef4444');
                    
                    // Determine chart metric visibility
                    const chartMetric = (activeTab === 'sales' ? SALES_METRICS : ADS_METRICS).find(m => m.id === metricId);
                    const isVisibleOnChart = chartMetric && (activeTab === 'sales' ? visibleSalesMetrics : visibleAdsMetrics).includes(metricId);
                    const borderColor = isVisibleOnChart ? chartMetric.color : '#334155';
                    const toggleMetric = activeTab === 'sales' ? toggleSalesMetric : toggleAdsMetric;
                    
                    return (
                      <div 
                        key={metricId} 
                        onClick={() => chartMetric && toggleMetric(metricId)}
                        style={{ 
                          padding: '1.5rem', 
                          backgroundColor: '#0f1729', 
                          borderRadius: '0.75rem', 
                          border: `2px solid ${borderColor}`, 
                          textAlign: 'center',
                          cursor: chartMetric ? 'pointer' : 'default',
                          transition: 'all 0.2s',
                          position: 'relative'
                        }}
                        onMouseEnter={(e) => {
                          if (chartMetric) {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = `0 4px 12px ${borderColor}40`;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (chartMetric) {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }
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
                            backgroundColor: chartMetric.color,
                            boxShadow: `0 0 8px ${chartMetric.color}`
                          }} />
                        )}
                        <div style={{ fontSize: '2rem', fontWeight: '700', color: '#fff', marginBottom: '0.25rem' }}>
                          {metricData.prefix}{metricData.value}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          {metric.label} 
                          {metricData.change !== null && (
                            <span style={{ color: changeColor, fontWeight: '600' }}>
                              {' '}{metricData.change >= 0 ? '+' : ''}{metricData.change?.toFixed(1)}%
                            </span>
                          )}
                        </div>
                        {chartMetric && (
                          <div style={{ fontSize: '0.625rem', color: '#64748b', marginTop: '0.5rem' }}>
                            {isVisibleOnChart ? '📊 On chart' : 'Click to show'}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Add Metric Button */}
                  <div 
                    onClick={() => setShowMetricSelector(true)}
                    style={{ 
                      padding: '1.5rem',
                      backgroundColor: 'transparent',
                      borderRadius: '0.75rem',
                      border: '1px dashed #475569',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '2rem', color: '#94a3b8', marginBottom: '0.25rem' }}>+</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Add Metric</div>
                    </div>
                  </div>
              </div>

              {/* Metric Selector Modal */}
              {showMetricSelector && (
                <div style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1000
                }}
                onClick={() => setShowMetricSelector(false)}
                >
                  <div style={{
                    backgroundColor: '#1e293b',
                    borderRadius: '0.75rem',
                    padding: '1.5rem',
                    width: '400px',
                    maxHeight: '600px',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                  onClick={(e) => e.stopPropagation()}
                  >
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#fff', marginBottom: '1rem' }}>Metrics</h3>
                    
                    {/* Search Input */}
                    <div style={{ position: 'relative', marginBottom: '1rem' }}>
                      <input
                        type="text"
                        placeholder="Search metrics..."
                        value={metricSearch}
                        onChange={(e) => setMetricSearch(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.75rem 2.5rem 0.75rem 1rem',
                          backgroundColor: '#334155',
                          border: 'none',
                          borderRadius: '0.5rem',
                          color: '#fff',
                          fontSize: '0.875rem'
                        }}
                      />
                      <svg style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '1.25rem', height: '1.25rem', color: '#94a3b8' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>

                    {/* Results and Clear */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
                        {filteredMetrics.length} results
                      </span>
                      <div>
                        <span style={{ fontSize: '0.875rem', color: '#3b82f6', marginRight: '0.5rem' }}>
                          {getCurrentMetrics().length} selected
                        </span>
                        <button onClick={clearAllMetrics} style={{ fontSize: '0.875rem', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                          Clear all
                        </button>
                      </div>
                    </div>

                    {/* Metric List */}
                    <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem' }}>
                      {filteredMetrics.map(metric => (
                        <div
                          key={metric.id}
                          onClick={() => toggleMetric(metric.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0.75rem',
                            marginBottom: '0.5rem',
                            borderRadius: '0.5rem',
                            cursor: 'pointer',
                            backgroundColor: getCurrentMetrics().includes(metric.id) ? '#334155' : 'transparent'
                          }}
                        >
                          <div style={{
                            width: '1.25rem',
                            height: '1.25rem',
                            borderRadius: '50%',
                            border: `2px solid ${getCurrentMetrics().includes(metric.id) ? '#3b82f6' : '#64748b'}`,
                            backgroundColor: getCurrentMetrics().includes(metric.id) ? '#3b82f6' : 'transparent',
                            marginRight: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {getCurrentMetrics().includes(metric.id) && (
                              <div style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', backgroundColor: '#fff' }} />
                            )}
                          </div>
                          <span style={{ fontSize: '0.875rem', color: '#fff' }}>{metric.label}</span>
                        </div>
                      ))}
                    </div>

                    {/* Close Button */}
                    <button
                      onClick={() => setShowMetricSelector(false)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        backgroundColor: '#3b82f6',
                        color: '#fff',
                        borderRadius: '0.5rem',
                        border: 'none',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
      )}

      {/* Ads Tab Content */}
      {activeTab === 'ads' && (
          <div>
            {/* Header with Controls */}
            <div className="px-6 pt-6" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', gap: '1rem' }}>
              {/* Metric Controller */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', flex: 1 }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', alignSelf: 'center', marginRight: '0.5rem', fontWeight: '600', textTransform: 'uppercase' }}>
                  Metrics:
                </span>
                {ADS_METRICS.map(metric => {
                  const isVisible = visibleAdsMetrics.includes(metric.id);
                  return (
                    <button
                      key={metric.id}
                      onClick={() => toggleAdsMetric(metric.id)}
                      style={{
                        padding: '0.375rem 0.75rem',
                        borderRadius: '0.375rem',
                        backgroundColor: isVisible ? metric.color + '20' : 'transparent',
                        border: `2px solid ${isVisible ? metric.color : '#475569'}`,
                        color: isVisible ? metric.color : '#94a3b8',
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
                        backgroundColor: isVisible ? metric.color : '#475569'
                      }} />
                      {metric.label}
                    </button>
                  );
                })}
              </div>

              {/* Period Selectors */}
              <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
                <select 
                  value={metricsDays}
                  onChange={(e) => setMetricsDays(Number(e.target.value))}
                  style={{ 
                    padding: '0.5rem 1rem', 
                    borderRadius: '0.5rem', 
                    backgroundColor: '#1e293b', 
                    color: '#fff',
                    border: '1px solid #334155',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    minWidth: '100px'
                  }}
                >
                  <option value={7}>7 Days</option>
                  <option value={30}>30 Days</option>
                  <option value={60}>60 Days</option>
                  <option value={90}>90 Days</option>
                </select>
                
                <select 
                  style={{ 
                    padding: '0.5rem 1rem', 
                    borderRadius: '0.5rem', 
                    backgroundColor: '#1e293b', 
                    color: '#fff',
                    border: '1px solid #334155',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    minWidth: '120px'
                  }}
                >
                  <option value="prior">Prior Period</option>
                </select>
              </div>
            </div>

            {/* Graph Section: 70% Graph + 30% Banana Factors */}
            <div className="px-6" style={{ display: 'grid', gridTemplateColumns: '70% 30%', gap: '1.5rem', marginBottom: '1.5rem' }}>
              {/* Left: Graph (70%) */}
              <div className={themeClasses.cardBg} style={{ borderRadius: '0.75rem', padding: '1.5rem' }}>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={adsChartData?.chart_data || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      stroke="#64748b"
                      style={{ fontSize: '0.75rem' }}
                      tickLine={false}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                      }}
                    />
                    <YAxis 
                      stroke="#64748b"
                      style={{ fontSize: '0.75rem' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#0f172a', 
                        border: '1px solid #334155',
                        borderRadius: '0.5rem',
                        color: '#fff',
                        fontSize: '0.875rem'
                      }}
                      formatter={(value, name) => {
                        const metric = ADS_METRICS.find(m => m.label === name);
                        if (metric) {
                          return [formatChartValue(value, metric.formatType), name];
                        }
                        return [value, name];
                      }}
                    />
                    {/* Dynamically render visible metrics */}
                    {visibleAdsMetrics.length > 0 && ADS_METRICS
                      .filter(metric => visibleAdsMetrics.includes(metric.id))
                      .map((metric) => {
                        console.log('Rendering Ads metric:', metric.id, metric.valueKey, 'Sample data:', adsChartData?.chart_data?.[0]?.[metric.valueKey]);
                        return (
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
                        );
                      })}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Right: Banana Factors (30%) */}
              <div className={themeClasses.cardBg} style={{ borderRadius: '0.75rem', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#fff', marginBottom: '1.5rem' }}>Banana Factors</h3>
                
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Sessions */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid #334155' }}>
                    <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Sessions</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: '600', color: metrics?.changes?.sessions >= 0 ? '#22c55e' : '#ef4444' }}>
                      {metrics?.changes?.sessions >= 0 ? '+' : ''}{metrics?.changes?.sessions?.toFixed(1) || '0.0'}%
                    </span>
                  </div>

                  {/* Conversion Rate */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid #334155' }}>
                    <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Conversion Rate</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: '600', color: metrics?.changes?.conversion_rate >= 0 ? '#22c55e' : '#ef4444' }}>
                      {metrics?.changes?.conversion_rate >= 0 ? '+' : ''}{metrics?.changes?.conversion_rate?.toFixed(1) || '0.0'}%
                    </span>
                  </div>

                  {/* TACOS */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid #334155' }}>
                    <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>TACOS</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: '600', color: metrics?.changes?.tacos <= 0 ? '#22c55e' : '#ef4444' }}>
                      {metrics?.changes?.tacos >= 0 ? '+' : ''}{metrics?.changes?.tacos?.toFixed(1) || '0.0'}%
                    </span>
                  </div>
                </div>

                {/* Perform Analysis Button */}
                <button 
                  onClick={handlePerformAnalysis}
                  style={{
                    marginTop: 'auto',
                    padding: '0.75rem',
                    backgroundColor: '#3b82f6',
                    color: '#fff',
                    borderRadius: '0.5rem',
                    border: 'none',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <svg style={{ width: '1rem', height: '1rem' }} fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/>
                  </svg>
                  Perform Analysis
                </button>
                <div style={{ fontSize: '0.625rem', color: '#64748b', textAlign: 'center', marginTop: '0.5rem' }}>
                  Powered by Banana Brain AI
                </div>
              </div>
            </div>

            {/* Bottom Section: Metrics Grid */}
            <div className="px-6 pb-6" style={{ position: 'relative' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem' }}>
                  {getCurrentMetrics().map(metricId => {
                    const metric = availableMetrics.find(m => m.id === metricId);
                    if (!metric) return null;
                    const metricData = getMetricValue(metricId);
                    const changeColor = metricData.invertColor 
                      ? (metricData.change >= 0 ? '#ef4444' : '#22c55e')
                      : (metricData.change >= 0 ? '#22c55e' : '#ef4444');
                    
                    // Determine chart metric visibility
                    const chartMetric = (activeTab === 'sales' ? SALES_METRICS : ADS_METRICS).find(m => m.id === metricId);
                    const isVisibleOnChart = chartMetric && (activeTab === 'sales' ? visibleSalesMetrics : visibleAdsMetrics).includes(metricId);
                    const borderColor = isVisibleOnChart ? chartMetric.color : '#334155';
                    const toggleMetric = activeTab === 'sales' ? toggleSalesMetric : toggleAdsMetric;
                    
                    return (
                      <div 
                        key={metricId} 
                        onClick={() => chartMetric && toggleMetric(metricId)}
                        style={{ 
                          padding: '1.5rem', 
                          backgroundColor: '#0f1729', 
                          borderRadius: '0.75rem', 
                          border: `2px solid ${borderColor}`, 
                          textAlign: 'center',
                          cursor: chartMetric ? 'pointer' : 'default',
                          transition: 'all 0.2s',
                          position: 'relative'
                        }}
                        onMouseEnter={(e) => {
                          if (chartMetric) {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = `0 4px 12px ${borderColor}40`;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (chartMetric) {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }
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
                            backgroundColor: chartMetric.color,
                            boxShadow: `0 0 8px ${chartMetric.color}`
                          }} />
                        )}
                        <div style={{ fontSize: '2rem', fontWeight: '700', color: '#fff', marginBottom: '0.25rem' }}>
                          {metricData.prefix}{metricData.value}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          {metric.label} 
                          {metricData.change !== null && (
                            <span style={{ color: changeColor, fontWeight: '600' }}>
                              {' '}{metricData.change >= 0 ? '+' : ''}{metricData.change?.toFixed(1)}%
                            </span>
                          )}
                        </div>
                        {chartMetric && (
                          <div style={{ fontSize: '0.625rem', color: '#64748b', marginTop: '0.5rem' }}>
                            {isVisibleOnChart ? '📊 On chart' : 'Click to show'}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Add Metric Button */}
                  <div 
                    onClick={() => setShowMetricSelector(true)}
                    style={{ 
                      padding: '1.5rem',
                      backgroundColor: 'transparent',
                      borderRadius: '0.75rem',
                      border: '1px dashed #475569',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '2rem', color: '#94a3b8', marginBottom: '0.25rem' }}>+</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Add Metric</div>
                    </div>
                  </div>
              </div>

              {/* Metric Selector Modal */}
              {showMetricSelector && (
                <div style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1000
                }}
                onClick={() => setShowMetricSelector(false)}
                >
                  <div style={{
                    backgroundColor: '#1e293b',
                    borderRadius: '0.75rem',
                    padding: '1.5rem',
                    width: '400px',
                    maxHeight: '600px',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                  onClick={(e) => e.stopPropagation()}
                  >
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#fff', marginBottom: '1rem' }}>Metrics</h3>
                    
                    {/* Search Input */}
                    <div style={{ position: 'relative', marginBottom: '1rem' }}>
                      <input
                        type="text"
                        placeholder="Search metrics..."
                        value={metricSearch}
                        onChange={(e) => setMetricSearch(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.75rem 2.5rem 0.75rem 1rem',
                          backgroundColor: '#334155',
                          border: 'none',
                          borderRadius: '0.5rem',
                          color: '#fff',
                          fontSize: '0.875rem'
                        }}
                      />
                      <svg style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '1.25rem', height: '1.25rem', color: '#94a3b8' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>

                    {/* Results and Clear */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
                        {filteredMetrics.length} results
                      </span>
                      <div>
                        <span style={{ fontSize: '0.875rem', color: '#3b82f6', marginRight: '0.5rem' }}>
                          {getCurrentMetrics().length} selected
                        </span>
                        <button onClick={clearAllMetrics} style={{ fontSize: '0.875rem', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                          Clear all
                        </button>
                      </div>
                    </div>

                    {/* Metric List */}
                    <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem' }}>
                      {filteredMetrics.map(metric => (
                        <div
                          key={metric.id}
                          onClick={() => toggleMetric(metric.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0.75rem',
                            marginBottom: '0.5rem',
                            borderRadius: '0.5rem',
                            cursor: 'pointer',
                            backgroundColor: getCurrentMetrics().includes(metric.id) ? '#334155' : 'transparent'
                          }}
                        >
                          <div style={{
                            width: '1.25rem',
                            height: '1.25rem',
                            borderRadius: '50%',
                            border: `2px solid ${getCurrentMetrics().includes(metric.id) ? '#3b82f6' : '#64748b'}`,
                            backgroundColor: getCurrentMetrics().includes(metric.id) ? '#3b82f6' : 'transparent',
                            marginRight: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {getCurrentMetrics().includes(metric.id) && (
                              <div style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', backgroundColor: '#fff' }} />
                            )}
                          </div>
                          <span style={{ fontSize: '0.875rem', color: '#fff' }}>{metric.label}</span>
                        </div>
                      ))}
                    </div>

                    {/* Close Button */}
                    <button
                      onClick={() => setShowMetricSelector(false)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        backgroundColor: '#3b82f6',
                        color: '#fff',
                        borderRadius: '0.5rem',
                        border: 'none',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
      )}

      {/* AI Analysis Modal */}
      <BananaBrainModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        analysis={aiAnalysis}
        onAskQuestion={handleAskFollowUp}
        isLoading={isAnalyzing}
      />

      {/* Adjustment Weights Modal */}
      {showAdjustmentModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={handleCancelAdjustments}
        >
          <div
            style={{
              backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
              borderRadius: '1rem',
              padding: '2rem',
              width: 'min(90vw, 450px)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
              border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
              animation: 'slideUp 0.3s ease-out'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                width: '2.5rem',
                height: '2.5rem',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                borderRadius: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '1rem'
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M12 1v6m0 6v6m-9-9h6m6 0h6"></path>
                </svg>
              </div>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                color: isDarkMode ? '#fff' : '#1f2937',
                margin: 0
              }}>
                Adjustment Weights
              </h3>
            </div>

            {/* Sales Velocity Slider */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <label style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: isDarkMode ? '#e2e8f0' : '#374151'
                }}>
                  Sales Velocity
                </label>
                <div style={{
                  backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
                  padding: '0.375rem 0.75rem',
                  borderRadius: '0.5rem',
                  border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
                  minWidth: '60px',
                  textAlign: 'center',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: isDarkMode ? '#fff' : '#1f2937'
                }}>
                  {tempSalesVelocityWeight}%
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={tempSalesVelocityWeight}
                onChange={(e) => setTempSalesVelocityWeight(Number(e.target.value))}
                style={{
                  width: '100%',
                  height: '6px',
                  borderRadius: '3px',
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${tempSalesVelocityWeight}%, ${isDarkMode ? '#334155' : '#cbd5e1'} ${tempSalesVelocityWeight}%, ${isDarkMode ? '#334155' : '#cbd5e1'} 100%)`,
                  outline: 'none',
                  cursor: 'pointer',
                  WebkitAppearance: 'none',
                  appearance: 'none'
                }}
              />
              <style>
                {`
                  input[type="range"]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    background: #3b82f6;
                    cursor: pointer;
                    border: 3px solid #ffffff;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                  }
                  input[type="range"]::-moz-range-thumb {
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    background: #3b82f6;
                    cursor: pointer;
                    border: 3px solid #ffffff;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                  }
                `}
              </style>
            </div>

            {/* Search Volume Velocity Slider */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <label style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: isDarkMode ? '#e2e8f0' : '#374151'
                }}>
                  Search Volume Velocity
                </label>
                <div style={{
                  backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
                  padding: '0.375rem 0.75rem',
                  borderRadius: '0.5rem',
                  border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
                  minWidth: '60px',
                  textAlign: 'center',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: isDarkMode ? '#fff' : '#1f2937'
                }}>
                  {tempSvVelocityWeight}%
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={tempSvVelocityWeight}
                onChange={(e) => setTempSvVelocityWeight(Number(e.target.value))}
                style={{
                  width: '100%',
                  height: '6px',
                  borderRadius: '3px',
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${tempSvVelocityWeight}%, ${isDarkMode ? '#334155' : '#cbd5e1'} ${tempSvVelocityWeight}%, ${isDarkMode ? '#334155' : '#cbd5e1'} 100%)`,
                  outline: 'none',
                  cursor: 'pointer',
                  WebkitAppearance: 'none',
                  appearance: 'none'
                }}
              />
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={handleCancelAdjustments}
                style={{
                  padding: '0.625rem 1.25rem',
                  backgroundColor: isDarkMode ? '#334155' : '#e2e8f0',
                  color: isDarkMode ? '#e2e8f0' : '#475569',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = isDarkMode ? '#475569' : '#cbd5e1';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = isDarkMode ? '#334155' : '#e2e8f0';
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleApplyAdjustments}
                style={{
                  padding: '0.625rem 1.25rem',
                  backgroundColor: '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#2563eb';
                  e.target.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#3b82f6';
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ngoos;

