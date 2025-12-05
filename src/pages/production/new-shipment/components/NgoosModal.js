import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import { toast } from 'sonner';
import NgoosAPI from '../../../../services/ngoosApi';
import { 
  Line, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ComposedChart
} from 'recharts';

const NgoosModal = ({ 
  isOpen, 
  onClose, 
  selectedRow,
  labelsAvailable = null,  // Available labels for this product's label_location
  onAddUnits = null,  // Callback when "Add Units" is clicked
  currentQty = 0,  // Current qty already added for this product
}) => {
  const { isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState('Inventory');
  const [allVariations, setAllVariations] = useState(true);
  const [forecastView, setForecastView] = useState(true);
  const [loading, setLoading] = useState(true);
  const [productDetails, setProductDetails] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [selectedView, setSelectedView] = useState('2 Years');
  const [metricsDays] = useState(30);
  const [metrics, setMetrics] = useState(null);
  const [salesChartData, setSalesChartData] = useState(null);
  const [adsChartData, setAdsChartData] = useState(null);
  const [visibleSalesMetrics, setVisibleSalesMetrics] = useState(['units_sold', 'sales']);
  const [visibleAdsMetrics, setVisibleAdsMetrics] = useState(['total_sales', 'tacos']);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [comparisonPeriod, setComparisonPeriod] = useState('prior'); // 'prior' or 'prior-year'
  const [showComparison, setShowComparison] = useState(true);

  const themeClasses = {
    cardBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
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

  // Fetch N-GOOS data from API
  useEffect(() => {
    const fetchNgoosData = async () => {
      if (!isOpen || !selectedRow) {
        setLoading(false);
        return;
      }

      // Try to get child_asin from selectedRow (could be child_asin, childAsin, or asin)
      const childAsin = selectedRow?.child_asin || selectedRow?.childAsin || selectedRow?.asin;
      
      if (!childAsin) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        const weeks = getWeeksForView(selectedView);
        
        // Fetch all N-GOOS data in parallel, but handle each independently
        const results = await Promise.allSettled([
          NgoosAPI.getProductDetails(childAsin),
          NgoosAPI.getForecast(childAsin),
          NgoosAPI.getChartData(childAsin, weeks),
          NgoosAPI.getMetrics(childAsin, metricsDays),
          NgoosAPI.getSalesChart(childAsin, metricsDays),
          NgoosAPI.getAdsChart(childAsin, metricsDays)
        ]);

        const details = results[0].status === 'fulfilled' ? results[0].value : null;
        const forecast = results[1].status === 'fulfilled' ? results[1].value : null;
        const chart = results[2].status === 'fulfilled' ? results[2].value : null;
        const metricsData = results[3].status === 'fulfilled' ? results[3].value : null;
        const salesChart = results[4].status === 'fulfilled' ? results[4].value : null;
        const adsChart = results[5].status === 'fulfilled' ? results[5].value : null;

        console.log('N-GOOS API responses:', { 
          details: results[0].status, 
          forecast: results[1].status, 
          chart: results[2].status,
          metrics: results[3].status,
          salesChart: results[4].status,
          adsChart: results[5].status
        });
        
        if (results[0].status === 'rejected') console.error('Details API failed:', results[0].reason);
        if (results[1].status === 'rejected') console.error('Forecast API failed:', results[1].reason);
        if (results[2].status === 'rejected') console.error('Chart API failed:', results[2].reason);
        if (results[3].status === 'rejected') console.error('Metrics API failed:', results[3].reason);
        if (results[4].status === 'rejected') console.error('Sales Chart API failed:', results[4].reason);
        if (results[5].status === 'rejected') console.error('Ads Chart API failed:', results[5].reason);

        setProductDetails(details);
        setForecastData(forecast);
        setChartData(chart);
        setMetrics(metricsData);
        setSalesChartData(salesChart);
        setAdsChartData(adsChart);
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
  }, [isOpen, selectedRow, selectedView, metricsDays]);

  // Extract inventory data from API response or use selectedRow fallback
  const inventoryData = productDetails?.inventory || {
    fba: {
      total: selectedRow?.totalInventory || 0,
      available: selectedRow?.fbaAvailable || 0,
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

  // Extract timeline data from forecast API response or use selectedRow fallback
  const timeline = {
    fbaAvailable: Math.round(forecastData?.fba_available_days || selectedRow?.doiFba || 0),
    totalDays: Math.round(forecastData?.total_days || selectedRow?.doiTotal || 0),
    forecast: Math.round(forecastData?.forecast_days || selectedRow?.forecast || 0),
    adjustment: Math.round(forecastData?.forecast_adjustment || 0)
  };

  // Sales data from API or selectedRow fallback
  const salesData = {
    sales7Day: forecastData?.sales_7_day || selectedRow?.sales7Day || 0,
    sales30Day: forecastData?.sales_30_day || selectedRow?.sales30Day || 0,
    weeklyForecast: forecastData?.weekly_forecast || selectedRow?.weeklyForecast || selectedRow?.forecast || 0,
  };

  // Calculate progress bar flex values based on timeline
  const calculateProgressBarValues = () => {
    const total = timeline.fbaAvailable + timeline.totalDays + timeline.forecast;
    if (total === 0) {
      return { fbaDays: 0, totalDays: 0, forecastDays: 0, flex1: 1, flex2: 1, flex3: 1 };
    }
    return {
      fbaDays: timeline.fbaAvailable,
      totalDays: timeline.totalDays,
      forecastDays: timeline.forecast,
      flex1: timeline.fbaAvailable || 1,
      flex2: timeline.totalDays || 1,
      flex3: timeline.forecast || 1
    };
  };

  // Prepare chart data for visualization
  const chartDisplayData = useMemo(() => {
    // Allow chart to render with just chartData, using selectedRow fallbacks for forecast info
    console.log('chartDisplayData useMemo - chartData:', chartData);
    
    if (!chartData) {
      console.log('chartData is null/undefined');
      return [];
    }

    const historical = Array.isArray(chartData.historical) ? chartData.historical : [];
    const forecast = Array.isArray(chartData.forecast) ? chartData.forecast : [];
    
    console.log('Processing historical:', historical.length, 'forecast:', forecast.length);
    
    // Get current date and DOI goal date from forecast or use fallbacks
    const currentDate = new Date(forecastData?.current_date || Date.now());
    
    // Use selectedRow data as fallback for DOI calculations
    const fbaAvailableDays = forecastData?.fba_available_days || selectedRow?.doiFba || 0;
    const totalDays = forecastData?.total_days || selectedRow?.doiTotal || 0;
    
    // Calculate DOI goal date (default to 120 days from now if not available)
    const doiGoalDate = forecastData?.doi_goal_date 
      ? new Date(forecastData.doi_goal_date)
      : new Date(currentDate.getTime() + 120 * 24 * 60 * 60 * 1000);
    
    const runoutDate = forecastData?.runout_date 
      ? new Date(forecastData.runout_date)
      : new Date(currentDate.getTime() + fbaAvailableDays * 24 * 60 * 60 * 1000);
    
    const totalRunoutDate = forecastData?.total_runout_date 
      ? new Date(forecastData.total_runout_date)
      : new Date(currentDate.getTime() + totalDays * 24 * 60 * 60 * 1000);
    
    // Find max value for bars
    let maxValue = 0;
    historical.forEach(item => {
      maxValue = Math.max(maxValue, item.units_sold || 0, item.units_smooth || 0);
    });
    forecast.forEach(item => {
      maxValue = Math.max(maxValue, item.forecast_base || 0, item.forecast_adjusted || 0);
    });
    
    // If no max value found, use a default
    if (maxValue === 0) maxValue = 100;
    
    const barHeight = maxValue * 1.1;
    
    // Combine historical and forecast data
    const combinedData = [];
    
    historical.forEach(item => {
      const itemDate = new Date(item.week_end);
      const isInFbaAvailPeriod = itemDate >= currentDate && itemDate < runoutDate;
      const isInTotalPeriod = itemDate >= runoutDate && itemDate < totalRunoutDate;
      
      combinedData.push({
        date: item.week_end,
        timestamp: itemDate.getTime(),
        unitsSold: item.units_sold || 0,
        unitsSmooth: item.units_smooth || 0,
        isForecast: false,
        fbaAvail: isInFbaAvailPeriod ? barHeight : null,
        totalInv: isInTotalPeriod ? barHeight : null,
        forecastInv: null
      });
    });
    
    forecast.forEach((item) => {
      const itemDate = new Date(item.week_end);
      const isInFbaAvailPeriod = itemDate >= currentDate && itemDate < runoutDate;
      const isInTotalPeriod = itemDate >= runoutDate && itemDate < totalRunoutDate;
      const isInForecastPeriod = itemDate >= totalRunoutDate && itemDate <= doiGoalDate;
      
      combinedData.push({
        date: item.week_end,
        timestamp: itemDate.getTime(),
        forecastBase: item.forecast_base || 0,
        forecastAdjusted: item.forecast_adjusted || 0,
        isForecast: true,
        fbaAvail: isInFbaAvailPeriod ? barHeight : null,
        totalInv: isInTotalPeriod ? barHeight : null,
        forecastInv: isInForecastPeriod ? barHeight : null
      });
    });
    
    // Sort by date
    combinedData.sort((a, b) => a.timestamp - b.timestamp);
    
    console.log('Chart data prepared:', combinedData.length, 'points', combinedData.slice(0, 3));
    
    return combinedData;
  }, [chartData, forecastData, selectedRow]);

  // When Forecast View is on, zoom to the forecast inventory period (blue bars)
  const displayedChartData = useMemo(() => {
    if (!chartDisplayData || chartDisplayData.length === 0) return [];
    if (!forecastView) return chartDisplayData;

    // Find the range where forecastInv bars exist (the blue forecast period)
    const forecastInvPoints = chartDisplayData
      .map((d, idx) => ({ ...d, originalIndex: idx }))
      .filter((d) => d.forecastInv !== null && d.forecastInv > 0);
    
    if (forecastInvPoints.length === 0) return chartDisplayData;

    // Get the first and last index of forecast inventory period
    const firstForecastInvIdx = forecastInvPoints[0].originalIndex;
    const lastForecastInvIdx = forecastInvPoints[forecastInvPoints.length - 1].originalIndex;

    // Include some context before and after the forecast period
    const contextBefore = 8; // ~2 months of weekly data before
    const contextAfter = 4;  // ~1 month after
    const startIdx = Math.max(0, firstForecastInvIdx - contextBefore);
    const endIdx = Math.min(chartDisplayData.length - 1, lastForecastInvIdx + contextAfter);

    return chartDisplayData.slice(startIdx, endIdx + 1);
  }, [chartDisplayData, forecastView]);

  // Sales Metrics Configuration
  const SALES_METRICS = [
    { id: 'units_sold', label: 'Units Sold', color: '#4169E1', valueKey: 'units_sold', formatType: 'number', defaultVisible: true },
    { id: 'sales', label: 'Sales', color: '#FF8C00', valueKey: 'sales', formatType: 'currency', defaultVisible: true },
    { id: 'sessions', label: 'Sessions', color: '#32CD32', valueKey: 'sessions', formatType: 'number', defaultVisible: false },
    { id: 'conversion_rate', label: 'Conversion Rate', color: '#9370DB', valueKey: 'conversion_rate', formatType: 'percentage', defaultVisible: false },
    { id: 'price', label: 'Price', color: '#FFD700', valueKey: 'price', formatType: 'currency', defaultVisible: false },
    { id: 'profit', label: 'Profit', color: '#228B22', valueKey: 'profit', formatType: 'currency', defaultVisible: false },
    { id: 'profit_margin', label: 'Profit %', color: '#20B2AA', valueKey: 'profit_margin', formatType: 'percentage', defaultVisible: false },
    { id: 'profit_total', label: 'Profit Total', color: '#3CB371', valueKey: 'profit_total', formatType: 'currency', defaultVisible: false }
  ];

  // Ads Metrics Configuration
  const ADS_METRICS = [
    { id: 'total_sales', label: 'Total Sales', color: '#4169E1', valueKey: 'total_sales', formatType: 'currency', defaultVisible: true },
    { id: 'tacos', label: 'TACOS', color: '#FF8C00', valueKey: 'tacos', formatType: 'percentage', defaultVisible: true },
    { id: 'ad_spend', label: 'Ad Spend', color: '#DC143C', valueKey: 'ad_spend', formatType: 'currency', defaultVisible: false },
    { id: 'ad_sales', label: 'Ad Sales', color: '#32CD32', valueKey: 'ad_sales', formatType: 'currency', defaultVisible: false },
    { id: 'acos', label: 'ACOS', color: '#FF69B4', valueKey: 'acos', formatType: 'percentage', defaultVisible: false },
    { id: 'cpc', label: 'CPC', color: '#FFD700', valueKey: 'cpc', formatType: 'currency', defaultVisible: false },
    { id: 'ad_clicks', label: 'Ad Clicks', color: '#20B2AA', valueKey: 'ad_clicks', formatType: 'number', defaultVisible: false },
    { id: 'ad_impressions', label: 'Impressions', color: '#778899', valueKey: 'ad_impressions', formatType: 'number', defaultVisible: false },
    { id: 'ad_units', label: 'Ad Units', color: '#9370DB', valueKey: 'ad_units', formatType: 'number', defaultVisible: false }
  ];

  // Format chart values based on type
  const formatChartValue = (value, formatType) => {
    if (value === null || value === undefined) return 'N/A';
    switch(formatType) {
      case 'currency':
        return `$${value.toFixed(2)}`;
      case 'percentage':
        return `${value.toFixed(2)}%`;
      case 'number':
        return Math.round(value).toLocaleString();
      default:
        return String(value);
    }
  };

  // Toggle visible metrics
  const toggleSalesMetric = (metricId) => {
    setVisibleSalesMetrics(prev => 
      prev.includes(metricId) ? prev.filter(id => id !== metricId) : [...prev, metricId]
    );
  };

  const toggleAdsMetric = (metricId) => {
    setVisibleAdsMetrics(prev => 
      prev.includes(metricId) ? prev.filter(id => id !== metricId) : [...prev, metricId]
    );
  };

  // Get metric value helper
  const getMetricValue = (metricId) => {
    const current = metrics?.current_period;
    const changes = metrics?.changes;

    switch(metricId) {
      case 'units_sold':
        return { value: current?.units_sold || 0, change: changes?.units_sold || 0, format: 'number' };
      case 'sales':
        return { value: current?.sales || 0, change: changes?.sales || 0, format: 'currency' };
      case 'sessions':
        return { value: current?.sessions || 0, change: changes?.sessions || 0, format: 'number' };
      case 'conversion_rate':
        return { value: current?.conversion_rate || 0, change: changes?.conversion_rate || 0, format: 'percentage' };
      case 'price':
        return { value: current?.price || 0, change: changes?.price || 0, format: 'currency' };
      case 'profit':
        return { value: current?.profit || 0, change: changes?.profit || 0, format: 'currency' };
      case 'profit_margin':
        return { value: current?.profit_margin || 0, change: changes?.profit_margin || 0, format: 'percentage' };
      case 'profit_total':
        return { value: current?.profit_total || 0, change: changes?.profit_total || 0, format: 'currency' };
      case 'total_sales':
        return { value: current?.total_sales || 0, change: changes?.total_sales || 0, format: 'currency' };
      case 'tacos':
        return { value: current?.tacos || 0, change: changes?.tacos || 0, format: 'percentage' };
      case 'ad_spend':
        return { value: current?.ad_spend || 0, change: changes?.ad_spend || 0, format: 'currency' };
      case 'ad_sales':
        return { value: current?.ad_sales || 0, change: changes?.ad_sales || 0, format: 'currency' };
      case 'ad_units':
        return { value: current?.ad_units || 0, change: changes?.ad_units || 0, format: 'number' };
      case 'acos':
        return { value: current?.acos || 0, change: changes?.acos || 0, format: 'percentage' };
      case 'cpc':
        return { value: current?.cpc || 0, change: changes?.cpc || 0, format: 'currency' };
      case 'ad_clicks':
        return { value: current?.ad_clicks || 0, change: changes?.ad_clicks || 0, format: 'number' };
      case 'ad_impressions':
        return { value: current?.ad_impressions || 0, change: changes?.ad_impressions || 0, format: 'number' };
      default:
        return { value: 0, change: 0, format: 'number' };
    }
  };

  // Custom tooltip
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

  if (!isOpen || !selectedRow) return null;

  const childAsin = selectedRow?.child_asin || selectedRow?.childAsin || selectedRow?.asin;
  const hasAsin = !!childAsin;
  const labelInventoryCount = labelsAvailable !== null ? labelsAvailable : (selectedRow?.labelsAvailable || 0);
  const forecastUnits = forecastData?.units_to_make || salesData.weeklyForecast || 0;
  
  const progressValues = calculateProgressBarValues();

  const handleConfirmUnits = (units) => {
    if (onAddUnits) {
      onAddUnits(selectedRow, units);
    }
    setShowConfirmModal(false);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(15,23,42,0.6)',
        backdropFilter: 'blur(3px)',
      }}
    >
      {loading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(15,23,42,0.8)',
            zIndex: 10,
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" style={{ margin: '0 auto' }}></div>
            <p style={{ marginTop: '1rem', color: '#94a3b8', fontSize: '0.875rem' }}>Loading N-GOOS data...</p>
          </div>
        </div>
      )}
      <div
        className={themeClasses.cardBg}
        style={{
          width: '984px',
          maxWidth: '984px',
          minHeight: '684px',
          maxHeight: '94vh',
          borderRadius: '12px',
          boxShadow: '0 24px 80px rgba(15,23,42,0.75)',
          border: `1px solid ${isDarkMode ? '#1F2937' : '#E5E7EB'}`,
          padding: '1.25rem 1.5rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          overflowY: 'auto',
        }}
      >
        {/* Modal header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.35rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.2rem 0.6rem',
                borderRadius: '9999px',
                backgroundColor: isDarkMode ? '#111827' : '#EEF2FF',
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: 9999, backgroundColor: '#22C55E' }} />
              <span className={themeClasses.text}>N-GOOS</span>
            </div>
            <div className={themeClasses.text} style={{ fontSize: '0.95rem', fontWeight: 600 }}>
              Never Go Out Of Stock
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {(productDetails?.inventory || selectedRow) && (
              <>
                <button
                  type="button"
                  style={{
                    padding: '4px 12px',
                    borderRadius: '4px',
                    border: '1px solid',
                    borderColor: isDarkMode ? '#374151' : '#E5E7EB',
                    backgroundColor: isDarkMode ? '#1F2937' : '#374151',
                    color: '#F9FAFB',
                    fontSize: '0.7rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    height: '24px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '9999px',
                      backgroundColor: labelsAvailable !== null && labelsAvailable < 100 ? '#DC2626' : '#22C55E',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ color: '#FFFFFF', fontSize: '10px', fontWeight: 700 }}>
                      {labelsAvailable !== null && labelsAvailable < 100 ? '!' : '✓'}
                    </span>
                  </span>
                  <span>Label Inventory: {labelsAvailable !== null ? labelsAvailable.toLocaleString() : (selectedRow?.labelsAvailable || 0).toLocaleString()}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(true)}
                  style={{
                    padding: '0 0.75rem',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    height: '23px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                  }}
                >
                  Add Units ({forecastUnits.toLocaleString()})
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '9999px',
                border: 'none',
                backgroundColor: isDarkMode ? '#111827' : '#F3F4F6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  fontSize: '1.1rem',
                  lineHeight: 1,
                  color: isDarkMode ? '#9CA3AF' : '#6B7280',
                }}
              >
                ×
              </span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'inline-flex',
            gap: '8px',
            padding: '4px',
            borderRadius: '4px',
            backgroundColor: '#2C3544',
            alignSelf: 'flex-start',
            overflow: 'hidden',
          }}
        >
          {['Inventory', 'Sales', 'Ads'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '4px 24px',
                borderRadius: '4px',
                border: 'none',
                fontSize: '0.75rem',
                fontWeight: 500,
                backgroundColor: activeTab === tab ? '#2563EB' : 'transparent',
                color: activeTab === tab ? '#FFFFFF' : '#9CA3AF',
                cursor: 'pointer',
                transition: 'all 0.2s',
                height: '23px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab) {
                  e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.2)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {tab}
            </button>
          ))}
        </div>

          {/* Main content */}
        {!hasAsin ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <svg style={{ width: '64px', height: '64px', margin: '0 auto', marginBottom: '1rem', color: '#64748b' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p className={themeClasses.text} style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>N-GOOS Not Available</p>
            <p className={themeClasses.textSecondary} style={{ fontSize: '0.875rem' }}>This product does not have an ASIN. N-GOOS data is only available for products with an ASIN.</p>
          </div>
        ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Inventory Tab Content */}
          {activeTab === 'Inventory' && (
          <>
          {/* Top cards row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr',
              gap: '1rem',
            }}
          >
            {/* Product card */}
            <div
              style={{
                borderRadius: '0.75rem',
                border: `1px solid ${isDarkMode ? '#1F2937' : '#E5E7EB'}`,
                background: isDarkMode
                  ? 'linear-gradient(135deg, #020617, #111827)'
                  : 'linear-gradient(135deg, #FFFFFF, #F9FAFB)',
                padding: '0.85rem 1rem',
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  width: '72px',
                  height: '144px',
                  borderRadius: '0.6rem',
                  backgroundColor: '#1F2937',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                <span style={{ fontSize: '0.7rem', color: '#9CA3AF', textAlign: 'center' }}>Bottle Image</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                <div className={themeClasses.text} style={{ fontSize: '1rem', fontWeight: 600 }}>
                  {productDetails?.product?.name || selectedRow.product}
                </div>
                <div style={{ fontSize: '0.75rem' }} className={themeClasses.textSecondary}>
                  <div>
                    SIZE: <span className={themeClasses.text}>{productDetails?.product?.size || selectedRow.size}</span>
                  </div>
                  <div>
                    ASIN: <span className={themeClasses.text}>{productDetails?.product?.asin || childAsin || 'N/A'}</span>
                  </div>
                  <div>
                    BRAND: <span className={themeClasses.text}>{productDetails?.product?.brand || selectedRow.brand}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* FBA card */}
            <div
              style={{
                borderRadius: '0.75rem',
                border: `1px solid ${isDarkMode ? '#1F2937' : '#E5E7EB'}`,
                padding: '0.85rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
              }}
            >
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#22C55E' }}>FBA</div>
              <div style={{ fontSize: '0.75rem' }} className={themeClasses.textSecondary}>
                <div>
                  Total: <span className={themeClasses.text}>{inventoryData.fba.total}</span>
                </div>
                <div>
                  Available: <span className={themeClasses.text}>{inventoryData.fba.available}</span>
                </div>
                <div>
                  Reserved: <span className={themeClasses.text}>{inventoryData.fba.reserved}</span>
                </div>
                <div>
                  Inbound: <span className={themeClasses.text}>{inventoryData.fba.inbound}</span>
                </div>
              </div>
            </div>

            {/* AWD card */}
            <div
              style={{
                borderRadius: '0.75rem',
                border: `1px solid ${isDarkMode ? '#1F2937' : '#E5E7EB'}`,
                padding: '0.85rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
              }}
            >
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#38BDF8' }}>AWD</div>
              <div style={{ fontSize: '0.75rem' }} className={themeClasses.textSecondary}>
                <div>
                  Total: <span className={themeClasses.text}>{inventoryData.awd.total}</span>
                </div>
                <div>
                  Outbound to FBA: <span className={themeClasses.text}>{inventoryData.awd.outbound_to_fba || 0}</span>
                </div>
                <div>
                  Available: <span className={themeClasses.text}>{inventoryData.awd.available}</span>
                </div>
                <div>
                  Reserved: <span className={themeClasses.text}>{inventoryData.awd.reserved}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline banner */}
          <div
            style={{
              borderRadius: '0.9rem',
              border: `1px solid ${isDarkMode ? '#1F2937' : '#E5E7EB'}`,
              padding: '0.85rem 1rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.45rem',
            }}
          >
            <div style={{ position: 'relative', marginTop: '0.35rem', padding: '0 0.25rem' }}>
              <div style={{ position: 'relative', height: '18px', marginBottom: '0.5rem', marginTop: '2.5rem' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '5%',
                    right: '5%',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    height: '2px',
                    backgroundColor: isDarkMode ? '#FFFFFF' : '#000000',
                    borderRadius: '1px',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: '5%',
                    top: '-32px',
                    transform: 'translateX(-50%)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '0.7rem', opacity: 0.85 }} className={themeClasses.textSecondary}>
                    Today
                  </div>
                  <div className={themeClasses.text} style={{ fontWeight: 600, fontSize: '0.75rem' }}>
                    {forecastData?.current_date ? new Date(forecastData.current_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }) : '11/11/25'}
                  </div>
                </div>
                <div
                  style={{
                    position: 'absolute',
                    left: '95%',
                    top: '-32px',
                    transform: 'translateX(-50%)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '0.7rem', opacity: 0.85 }} className={themeClasses.textSecondary}>
                    DOI Goal
                  </div>
                  <div className={themeClasses.text} style={{ fontWeight: 600, fontSize: '0.75rem' }}>
                    {forecastData?.doi_goal_date ? new Date(forecastData.doi_goal_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }) : '4/13/25'}
                  </div>
                </div>
                {[
                  { label: 'Dec', left: '23%' },
                  { label: 'Jan', left: '41%' },
                  { label: 'Feb', left: '59%' },
                  { label: 'Mar', left: '77%' },
                ].map((m) => (
                  <span
                    key={m.label}
                    style={{
                      position: 'absolute',
                      top: '-14px',
                      left: m.left,
                      transform: 'translateX(-50%)',
                      fontSize: '0.65rem',
                      color: isDarkMode ? '#9CA3AF' : '#6B7280',
                    }}
                  >
                    {m.label}
                  </span>
                ))}
                {['5%', '23%', '41%', '59%', '77%', '95%'].map((left) => (
                  <div
                    key={left}
                    style={{
                      position: 'absolute',
                      left,
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '8px',
                      height: '8px',
                      borderRadius: '9999px',
                      border: `2px solid ${isDarkMode ? '#FFFFFF' : '#000000'}`,
                      backgroundColor: isDarkMode ? '#FFFFFF' : '#000000',
                    }}
                  />
                ))}
              </div>

              <div
                style={{
                  position: 'relative',
                  height: '54px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  marginLeft: '53px',
                  marginRight: '53px',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '8px',
                    backgroundColor: isDarkMode ? '#020617' : '#E5E7EB',
                  }}
                />
                <div style={{ position: 'relative', display: 'flex', height: '100%' }}>
                  <div
                    style={{
                      flex: progressValues.flex1,
                      backgroundColor: '#A855F7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FDF2FF',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                    }}
                  >
                    {progressValues.fbaDays} Days
                    <span style={{ fontSize: '0.65rem', marginLeft: 4 }}>FBA Available</span>
                  </div>
                  <div
                    style={{
                      flex: progressValues.flex2,
                      backgroundColor: '#22C55E',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ECFDF3',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                    }}
                  >
                    {progressValues.totalDays} Days
                    <span style={{ fontSize: '0.65rem', marginLeft: 4 }}>Total</span>
                  </div>
                  <div
                    style={{
                      flex: progressValues.flex3,
                      backgroundColor: '#1D4ED8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#DBEAFE',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                    }}
                  >
                    {progressValues.forecastDays} Days
                    <span style={{ fontSize: '0.65rem', marginLeft: 4 }}>Forecast</span>
                  </div>
                </div>
                {timeline.adjustment !== 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      right: '-18px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      color: timeline.adjustment > 0 ? '#f59e0b' : '#ef4444',
                    }}
                  >
                    {timeline.adjustment > 0 ? `+${timeline.adjustment}` : timeline.adjustment}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Unit Forecast */}
          <div
            style={{
              borderRadius: '0.9rem',
              border: `1px solid ${isDarkMode ? '#1F2937' : '#E5E7EB'}`,
              padding: '0.9rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.25rem',
              }}
            >
              <div className={themeClasses.text} style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                Unit Forecast
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.75rem', color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>
                    All Variations
                  </span>
                  <button
                    type="button"
                    onClick={() => setAllVariations(!allVariations)}
                    style={{
                      width: '38px',
                      height: '20px',
                      borderRadius: '9999px',
                      border: 'none',
                      backgroundColor: allVariations ? '#2563EB' : '#9CA3AF',
                      padding: '0 2px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: allVariations ? 'flex-end' : 'flex-start',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <span
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '9999px',
                        backgroundColor: '#FFFFFF',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                      }}
                    />
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.75rem', color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>
                    Forecast View
                  </span>
                  <button
                    type="button"
                    onClick={() => setForecastView(!forecastView)}
                    style={{
                      width: '38px',
                      height: '20px',
                      borderRadius: '9999px',
                      border: 'none',
                      backgroundColor: forecastView ? '#2563EB' : '#9CA3AF',
                      padding: '0 2px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: forecastView ? 'flex-end' : 'flex-start',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <span
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '9999px',
                        backgroundColor: '#FFFFFF',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                      }}
                    />
                  </button>
                </div>
                <button
                  type="button"
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '9999px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <img
                    src="/assets/Icon Button.png"
                    alt="Settings"
                    style={{ width: '16px', height: '16px', objectFit: 'contain' }}
                  />
                </button>
                <select
                  value={selectedView}
                  onChange={(e) => setSelectedView(e.target.value)}
                  style={{
                    padding: '0.25rem 0.6rem',
                    borderRadius: '0.4rem',
                    border: `1px solid ${isDarkMode ? '#374151' : '#D1D5DB'}`,
                    backgroundColor: 'transparent',
                    fontSize: '0.75rem',
                    color: isDarkMode ? '#9CA3AF' : '#6B7280',
                    cursor: 'pointer',
                  }}
                >
                  <option value="1 Year">1 Year</option>
                  <option value="2 Years">2 Years</option>
                  <option value="3 Years">3 Years</option>
                </select>
              </div>
            </div>
            <div
              style={{
                flex: 1,
                height: '220px',
                borderRadius: '0.75rem',
                border: `1px dashed ${isDarkMode ? '#374151' : '#D1D5DB'}`,
                padding: '0.5rem',
              }}
            >
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : displayedChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <ComposedChart
                    data={displayedChartData}
                    margin={{ top: 5, right: 20, left: 10, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#1e293b' : '#e5e7eb'} vertical={false} />
                    <XAxis 
                      dataKey="timestamp"
                      type="number"
                      domain={['auto', 'auto']}
                      stroke={isDarkMode ? '#475569' : '#6b7280'}
                      tick={{ fill: isDarkMode ? '#64748b' : '#6b7280', fontSize: 10 }}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear().toString().slice(-2)}`;
                      }}
                    />
                    <YAxis 
                      stroke={isDarkMode ? '#475569' : '#6b7280'}
                      tick={{ fill: isDarkMode ? '#64748b' : '#6b7280', fontSize: 10 }}
                      tickFormatter={(value) => {
                        if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                        return value;
                      }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    
                    {/* Inventory Bars */}
                    <Bar 
                      dataKey="fbaAvail" 
                      fill="#a855f7" 
                      fillOpacity={0.9}
                      name="FBA Avail"
                      barSize={forecastView ? 30 : 20}
                      stackId="inventory"
                    />
                    <Bar 
                      dataKey="totalInv" 
                      fill="#22c55e" 
                      fillOpacity={0.9}
                      name="Total Inv"
                      barSize={forecastView ? 30 : 20}
                      stackId="inventory"
                    />
                    <Bar 
                      dataKey="forecastInv" 
                      fill="#3b82f6" 
                      fillOpacity={0.9}
                      name="Forecast"
                      barSize={forecastView ? 30 : 20}
                      stackId="inventory"
                    />
                    
                    {/* Unit Sales */}
                    <Line 
                      type="monotone" 
                      dataKey="unitsSold" 
                      stroke="#64748b" 
                      strokeWidth={2}
                      dot={false}
                      name="Unit Sales"
                      connectNulls
                    />
                    
                    {/* Forecast */}
                    <Line 
                      type="monotone" 
                      dataKey="forecastAdjusted" 
                      stroke="#f97316" 
                      strokeWidth={2.5}
                      dot={false}
                      name="Forecast"
                      connectNulls
                    />
                    
                    {/* Forecast Dashed */}
                    <Line 
                      type="monotone" 
                      dataKey="forecastBase" 
                      stroke="#f97316" 
                      strokeWidth={2}
                      strokeDasharray="8 4"
                      dot={false}
                      name="Forecast (Dashed)"
                      connectNulls
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '0.8rem', gap: '0.5rem' }} className={themeClasses.textSecondary}>
                  <span>No chart data available</span>
                  <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>
                    {chartData ? `Raw data: ${chartData.historical?.length || 0} historical, ${chartData.forecast?.length || 0} forecast points` : 'chartData is null'}
                  </span>
                </div>
              )}
            </div>
          </div>
          </>
          )}

          {/* Sales Tab Content */}
          {activeTab === 'Sales' && (
            <div>
              {/* Header with Controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '1rem' }}>
                {/* Top Row: Comparison Toggle and Period Selectors */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>
                      Parent View
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowComparison(!showComparison)}
                      style={{
                        width: '38px',
                        height: '20px',
                        borderRadius: '9999px',
                        border: 'none',
                        backgroundColor: showComparison ? '#2563EB' : '#9CA3AF',
                        padding: '0 2px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: showComparison ? 'flex-end' : 'flex-start',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <span
                        style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '9999px',
                          backgroundColor: '#FFFFFF',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                        }}
                      />
                    </button>
                  </div>

                  {/* Period Selectors */}
                  <select 
                    value={metricsDays}
                    style={{ 
                      padding: '0.5rem 1rem', 
                      borderRadius: '0.5rem', 
                      backgroundColor: isDarkMode ? '#1e293b' : '#F3F4F6', 
                      color: isDarkMode ? '#fff' : '#111827',
                      border: `1px solid ${isDarkMode ? '#334155' : '#D1D5DB'}`,
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
                    value={comparisonPeriod}
                    onChange={(e) => setComparisonPeriod(e.target.value)}
                    style={{ 
                      padding: '0.5rem 1rem', 
                      borderRadius: '0.5rem', 
                      backgroundColor: isDarkMode ? '#1e293b' : '#F3F4F6', 
                      color: isDarkMode ? '#fff' : '#111827',
                      border: `1px solid ${isDarkMode ? '#334155' : '#D1D5DB'}`,
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      cursor: 'pointer',
                      minWidth: '120px'
                    }}
                  >
                    <option value="prior">{comparisonPeriod === 'prior' ? '✓ ' : ''}Prior Period</option>
                    <option value="prior-year">{comparisonPeriod === 'prior-year' ? '✓ ' : ''}Prior Year</option>
                  </select>
                </div>

                {/* Bottom Row: Metric Controller */}
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
              </div>

              {/* Graph Section: 70% Graph + 30% Banana Factors */}
              <div style={{ display: 'grid', gridTemplateColumns: '70% 30%', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {/* Left: Graph (70%) */}
                <div style={{ borderRadius: '0.75rem', border: `1px solid ${isDarkMode ? '#1F2937' : '#E5E7EB'}`, padding: '1.5rem', backgroundColor: isDarkMode ? '#0f172a' : '#FFFFFF' }}>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={salesChartData?.chart_data || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#e5e7eb'} vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        stroke={isDarkMode ? '#64748b' : '#6b7280'}
                        style={{ fontSize: '0.75rem' }}
                        tickLine={false}
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return `${date.getMonth() + 1}/${date.getDate()}`;
                        }}
                      />
                      <YAxis 
                        stroke={isDarkMode ? '#64748b' : '#6b7280'}
                        style={{ fontSize: '0.75rem' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: isDarkMode ? '#0f172a' : '#FFFFFF', 
                          border: `1px solid ${isDarkMode ? '#334155' : '#E5E7EB'}`,
                          borderRadius: '0.5rem',
                          color: isDarkMode ? '#fff' : '#111827',
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
                <div style={{ borderRadius: '0.75rem', border: `1px solid ${isDarkMode ? '#1F2937' : '#E5E7EB'}`, padding: '1.5rem', display: 'flex', flexDirection: 'column', backgroundColor: isDarkMode ? '#0f172a' : '#FFFFFF' }}>
                  <h3 className={themeClasses.text} style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.5rem' }}>Banana Factors</h3>
                  
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Sessions */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: `1px solid ${isDarkMode ? '#334155' : '#E5E7EB'}` }}>
                      <span className={themeClasses.textSecondary} style={{ fontSize: '0.875rem' }}>Sessions</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: '600', color: metrics?.changes?.sessions >= 0 ? '#22c55e' : '#ef4444' }}>
                        {metrics?.current_period?.sessions?.toLocaleString() || '0'}
                      </span>
                    </div>

                    {/* Conversion Rate */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: `1px solid ${isDarkMode ? '#334155' : '#E5E7EB'}` }}>
                      <span className={themeClasses.textSecondary} style={{ fontSize: '0.875rem' }}>Conversion Rate</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: '600', color: metrics?.changes?.conversion_rate >= 0 ? '#22c55e' : '#ef4444' }}>
                        {metrics?.current_period?.conversion_rate?.toFixed(2) || '0.00'}%
                      </span>
                    </div>

                    {/* TACOS */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: `1px solid ${isDarkMode ? '#334155' : '#E5E7EB'}` }}>
                      <span className={themeClasses.textSecondary} style={{ fontSize: '0.875rem' }}>TACOS</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: '600', color: metrics?.changes?.tacos <= 0 ? '#22c55e' : '#ef4444' }}>
                        {metrics?.current_period?.tacos?.toFixed(2) || '0.00'}%
                      </span>
                    </div>
                  </div>

                  {/* Perform Analysis Button */}
                  <button 
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

              {/* Bottom Section: Product Info + Metrics */}
              {!showComparison ? (
                // Child View: Product Card + Metrics
                <>
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                    {/* Left: Product Card */}
                    <div style={{ 
                      flex: '0 0 280px',
                      borderRadius: '12px', 
                      border: `1px solid ${isDarkMode ? '#1F2937' : '#E5E7EB'}`, 
                      padding: '1.25rem',
                      backgroundColor: isDarkMode ? '#0f172a' : '#FFFFFF',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '1rem'
                    }}>
                      <div style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '12px',
                        backgroundColor: '#F3F4F6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden'
                      }}>
                        <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Product</span>
                      </div>
                      <div style={{ textAlign: 'center', width: '100%' }}>
                        <div className={themeClasses.text} style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem' }}>
                          {productDetails?.product?.name || selectedRow.product}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: isDarkMode ? '#9CA3AF' : '#6B7280', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <div>SIZE: <span className={themeClasses.text}>{productDetails?.product?.size || selectedRow.size}</span></div>
                          <div>ASIN: <span className={themeClasses.text}>{productDetails?.product?.asin || childAsin || 'N/A'}</span></div>
                          <div>BRAND: <span className={themeClasses.text}>{productDetails?.product?.brand || selectedRow.brand}</span></div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Metrics Grid (2 rows x 4 columns) */}
                    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gridTemplateRows: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                      {SALES_METRICS.slice(0, 8).map((metricConfig) => {
                        const metricId = metricConfig.id;
                        const metricData = getMetricValue(metricId);
                        const changeColor = metricData.change >= 0 ? '#22c55e' : '#ef4444';
                        
                        return (
                          <div 
                            key={metricId}
                            style={{ 
                              padding: '1rem', 
                              backgroundColor: isDarkMode ? '#0f172a' : '#FFFFFF', 
                              borderRadius: '12px', 
                              border: `1px solid ${isDarkMode ? '#1F2937' : '#E5E7EB'}`,
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between'
                            }}
                          >
                            <div className={themeClasses.text} style={{ fontSize: '1.75rem', fontWeight: '700', lineHeight: '1.2', marginBottom: '0.25rem' }}>
                              {formatChartValue(metricData.value, metricData.format)}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: isDarkMode ? '#9CA3AF' : '#6B7280', fontWeight: '500', marginBottom: '0.25rem' }}>
                              {metricConfig.label}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: changeColor, fontWeight: '600' }}>
                              {metricData.change >= 0 ? '+' : ''}{metricData.change.toFixed(1)}%
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Additional Metrics Row */}
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ 
                      flex: '0 0 280px',
                      borderRadius: '12px', 
                      border: `1px solid ${isDarkMode ? '#1F2937' : '#E5E7EB'}`, 
                      padding: '1.25rem',
                      backgroundColor: isDarkMode ? '#0f172a' : '#FFFFFF',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}>
                      <div className={themeClasses.text} style={{ fontSize: '2.5rem', fontWeight: '700', lineHeight: '1' }}>
                        {metrics?.current_period?.organic_sales_percent?.toFixed(0) || '0'}%
                      </div>
                      <div style={{ fontSize: '0.875rem', color: isDarkMode ? '#9CA3AF' : '#6B7280', marginTop: '0.5rem' }}>
                        Organic Sales %
                      </div>
                    </div>

                    <div style={{ 
                      flex: '0 0 280px',
                      borderRadius: '12px', 
                      border: `2px dashed ${isDarkMode ? '#374151' : '#D1D5DB'}`, 
                      padding: '1.25rem',
                      backgroundColor: 'transparent',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#2563EB';
                      e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(37, 99, 235, 0.05)' : 'rgba(37, 99, 235, 0.02)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = isDarkMode ? '#374151' : '#D1D5DB';
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    >
                      <div style={{ fontSize: '2rem', color: isDarkMode ? '#9CA3AF' : '#6B7280', marginBottom: '0.5rem' }}>+</div>
                      <div style={{ fontSize: '0.875rem', color: isDarkMode ? '#9CA3AF' : '#6B7280', fontWeight: '500' }}>
                        Add Metric
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                // Parent View: Just Metrics Grid
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    {SALES_METRICS.slice(0, 8).map((metricConfig) => {
                      const metricId = metricConfig.id;
                      const metricData = getMetricValue(metricId);
                      const changeColor = metricData.change >= 0 ? '#22c55e' : '#ef4444';
                      const isVisibleOnChart = visibleSalesMetrics.includes(metricId);
                      const borderColor = isVisibleOnChart ? metricConfig.color : (isDarkMode ? '#1F2937' : '#E5E7EB');
                      
                      return (
                        <div 
                          key={metricId}
                          style={{ 
                            padding: '16px', 
                            backgroundColor: isDarkMode ? '#0f172a' : '#1a2332', 
                            borderRadius: '12px', 
                            border: `2px solid ${borderColor}`,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            height: '72px',
                            justifyContent: 'flex-start'
                          }}
                        >
                          <div style={{ color: '#E5E7EB', fontSize: '1.75rem', fontWeight: '700', lineHeight: '1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>
                            {formatChartValue(metricData.value, metricData.format)}
                          </div>
                          <div style={{ fontSize: '0.625rem', color: '#9CA3AF', fontWeight: '500', lineHeight: '1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 'auto' }}>
                            {metricConfig.label}
                          </div>
                          <div style={{ fontSize: '0.625rem', color: changeColor, fontWeight: '600', lineHeight: '1', whiteSpace: 'nowrap' }}>
                            {metricData.change >= 0 ? '+' : ''}{metricData.change.toFixed(1)}%
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Additional Metrics Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.75rem' }}>
                    <div style={{ 
                      borderRadius: '12px', 
                      border: `1px solid ${isDarkMode ? '#1F2937' : '#E5E7EB'}`, 
                      padding: '1.25rem',
                      backgroundColor: isDarkMode ? '#0f172a' : '#1a2332',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}>
                      <div style={{ color: '#E5E7EB', fontSize: '2rem', fontWeight: '700', lineHeight: '1' }}>
                        {metrics?.current_period?.organic_sales_percent?.toFixed(0) || '39'}%
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '0.5rem' }}>
                        Organic Sales %
                      </div>
                    </div>

                    <div style={{ 
                      borderRadius: '12px', 
                      border: `2px dashed ${isDarkMode ? '#374151' : '#475569'}`, 
                      padding: '1.25rem',
                      backgroundColor: 'transparent',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#2563EB';
                      e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = isDarkMode ? '#374151' : '#475569';
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    >
                      <div style={{ fontSize: '2rem', color: '#9CA3AF', marginBottom: '0.25rem' }}>+</div>
                      <div style={{ fontSize: '0.75rem', color: '#9CA3AF', fontWeight: '500' }}>
                        Add Metric
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Ads Tab Content */}
          {activeTab === 'Ads' && (
            <div>
              {/* Header with Controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '1rem' }}>
                {/* Top Row: Comparison Toggle and Period Selectors */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>
                      Parent View
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowComparison(!showComparison)}
                      style={{
                        width: '38px',
                        height: '20px',
                        borderRadius: '9999px',
                        border: 'none',
                        backgroundColor: showComparison ? '#2563EB' : '#9CA3AF',
                        padding: '0 2px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: showComparison ? 'flex-end' : 'flex-start',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <span
                        style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '9999px',
                          backgroundColor: '#FFFFFF',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                        }}
                      />
                    </button>
                  </div>

                  {/* Period Selectors */}
                  <select 
                    value={metricsDays}
                    style={{ 
                      padding: '0.5rem 1rem', 
                      borderRadius: '0.5rem', 
                      backgroundColor: isDarkMode ? '#1e293b' : '#F3F4F6', 
                      color: isDarkMode ? '#fff' : '#111827',
                      border: `1px solid ${isDarkMode ? '#334155' : '#D1D5DB'}`,
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
                    value={comparisonPeriod}
                    onChange={(e) => setComparisonPeriod(e.target.value)}
                    style={{ 
                      padding: '0.5rem 1rem', 
                      borderRadius: '0.5rem', 
                      backgroundColor: isDarkMode ? '#1e293b' : '#F3F4F6', 
                      color: isDarkMode ? '#fff' : '#111827',
                      border: `1px solid ${isDarkMode ? '#334155' : '#D1D5DB'}`,
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      cursor: 'pointer',
                      minWidth: '120px'
                    }}
                  >
                    <option value="prior">{comparisonPeriod === 'prior' ? '✓ ' : ''}Prior Period</option>
                    <option value="prior-year">{comparisonPeriod === 'prior-year' ? '✓ ' : ''}Prior Year</option>
                  </select>
                </div>

                {/* Bottom Row: Metric Controller */}
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
              </div>

              {/* Graph Section: 70% Graph + 30% Banana Factors */}
              <div style={{ display: 'grid', gridTemplateColumns: '70% 30%', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {/* Left: Graph (70%) */}
                <div style={{ borderRadius: '0.75rem', border: `1px solid ${isDarkMode ? '#1F2937' : '#E5E7EB'}`, padding: '1.5rem', backgroundColor: isDarkMode ? '#0f172a' : '#FFFFFF' }}>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={adsChartData?.chart_data || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#e5e7eb'} vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        stroke={isDarkMode ? '#64748b' : '#6b7280'}
                        style={{ fontSize: '0.75rem' }}
                        tickLine={false}
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return `${date.getMonth() + 1}/${date.getDate()}`;
                        }}
                      />
                      <YAxis 
                        stroke={isDarkMode ? '#64748b' : '#6b7280'}
                        style={{ fontSize: '0.75rem' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: isDarkMode ? '#0f172a' : '#FFFFFF', 
                          border: `1px solid ${isDarkMode ? '#334155' : '#E5E7EB'}`,
                          borderRadius: '0.5rem',
                          color: isDarkMode ? '#fff' : '#111827',
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
                <div style={{ borderRadius: '0.75rem', border: `1px solid ${isDarkMode ? '#1F2937' : '#E5E7EB'}`, padding: '1.5rem', display: 'flex', flexDirection: 'column', backgroundColor: isDarkMode ? '#0f172a' : '#FFFFFF' }}>
                  <h3 className={themeClasses.text} style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '1.5rem' }}>Banana Factors</h3>
                  
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Sessions */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: `1px solid ${isDarkMode ? '#334155' : '#E5E7EB'}` }}>
                      <span className={themeClasses.textSecondary} style={{ fontSize: '0.875rem' }}>Sessions</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: '600', color: metrics?.changes?.sessions >= 0 ? '#22c55e' : '#ef4444' }}>
                        {metrics?.changes?.sessions >= 0 ? '+' : ''}{metrics?.changes?.sessions?.toFixed(1) || '0.0'}%
                      </span>
                    </div>

                    {/* Conversion Rate */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: `1px solid ${isDarkMode ? '#334155' : '#E5E7EB'}` }}>
                      <span className={themeClasses.textSecondary} style={{ fontSize: '0.875rem' }}>Conversion Rate</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: '600', color: metrics?.changes?.conversion_rate >= 0 ? '#22c55e' : '#ef4444' }}>
                        {metrics?.changes?.conversion_rate >= 0 ? '+' : ''}{metrics?.changes?.conversion_rate?.toFixed(1) || '0.0'}%
                      </span>
                    </div>

                    {/* TACOS */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: `1px solid ${isDarkMode ? '#334155' : '#E5E7EB'}` }}>
                      <span className={themeClasses.textSecondary} style={{ fontSize: '0.875rem' }}>TACOS</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: '600', color: metrics?.changes?.tacos <= 0 ? '#22c55e' : '#ef4444' }}>
                        {metrics?.changes?.tacos >= 0 ? '+' : ''}{metrics?.changes?.tacos?.toFixed(1) || '0.0'}%
                      </span>
                    </div>
                  </div>

                  {/* Perform Analysis Button */}
                  <button 
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

              {/* Bottom Section: Product Info + Metrics */}
              {!showComparison ? (
                // Child View: Product Card + Metrics
                <>
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                    {/* Left: Product Card */}
                    <div style={{ 
                      flex: '0 0 280px',
                      borderRadius: '12px', 
                      border: `1px solid ${isDarkMode ? '#1F2937' : '#E5E7EB'}`, 
                      padding: '1.25rem',
                      backgroundColor: isDarkMode ? '#0f172a' : '#FFFFFF',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '1rem'
                    }}>
                      <div style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '12px',
                        backgroundColor: '#F3F4F6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden'
                      }}>
                        <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Product</span>
                      </div>
                      <div style={{ textAlign: 'center', width: '100%' }}>
                        <div className={themeClasses.text} style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem' }}>
                          {productDetails?.product?.name || selectedRow.product}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: isDarkMode ? '#9CA3AF' : '#6B7280', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <div>SIZE: <span className={themeClasses.text}>{productDetails?.product?.size || selectedRow.size}</span></div>
                          <div>ASIN: <span className={themeClasses.text}>{productDetails?.product?.asin || childAsin || 'N/A'}</span></div>
                          <div>BRAND: <span className={themeClasses.text}>{productDetails?.product?.brand || selectedRow.brand}</span></div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Metrics Grid (2 rows x 4 columns) */}
                    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gridTemplateRows: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                      {ADS_METRICS.slice(0, 8).map((metricConfig) => {
                        const metricId = metricConfig.id;
                        const metricData = getMetricValue(metricId);
                        const changeColor = (metricId === 'tacos' || metricId === 'acos') 
                          ? (metricData.change <= 0 ? '#22c55e' : '#ef4444')
                          : (metricData.change >= 0 ? '#22c55e' : '#ef4444');
                        
                        return (
                          <div 
                            key={metricId}
                            style={{ 
                              padding: '1rem', 
                              backgroundColor: isDarkMode ? '#0f172a' : '#FFFFFF', 
                              borderRadius: '12px', 
                              border: `1px solid ${isDarkMode ? '#1F2937' : '#E5E7EB'}`,
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between'
                            }}
                          >
                            <div className={themeClasses.text} style={{ fontSize: '1.75rem', fontWeight: '700', lineHeight: '1.2', marginBottom: '0.25rem' }}>
                              {formatChartValue(metricData.value, metricData.format)}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: isDarkMode ? '#9CA3AF' : '#6B7280', fontWeight: '500', marginBottom: '0.25rem' }}>
                              {metricConfig.label}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: changeColor, fontWeight: '600' }}>
                              {metricData.change >= 0 ? '+' : ''}{metricData.change.toFixed(1)}%
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Additional Metrics Row */}
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ 
                      flex: '0 0 280px',
                      borderRadius: '12px', 
                      border: `1px solid ${isDarkMode ? '#1F2937' : '#E5E7EB'}`, 
                      padding: '1.25rem',
                      backgroundColor: isDarkMode ? '#0f172a' : '#FFFFFF',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}>
                      <div className={themeClasses.text} style={{ fontSize: '2.5rem', fontWeight: '700', lineHeight: '1' }}>
                        {metrics?.current_period?.organic_sales_percent?.toFixed(0) || '0'}%
                      </div>
                      <div style={{ fontSize: '0.875rem', color: isDarkMode ? '#9CA3AF' : '#6B7280', marginTop: '0.5rem' }}>
                        Organic Sales %
                      </div>
                    </div>

                    <div style={{ 
                      flex: '0 0 280px',
                      borderRadius: '12px', 
                      border: `2px dashed ${isDarkMode ? '#374151' : '#D1D5DB'}`, 
                      padding: '1.25rem',
                      backgroundColor: 'transparent',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#2563EB';
                      e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(37, 99, 235, 0.05)' : 'rgba(37, 99, 235, 0.02)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = isDarkMode ? '#374151' : '#D1D5DB';
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    >
                      <div style={{ fontSize: '2rem', color: isDarkMode ? '#9CA3AF' : '#6B7280', marginBottom: '0.5rem' }}>+</div>
                      <div style={{ fontSize: '0.875rem', color: isDarkMode ? '#9CA3AF' : '#6B7280', fontWeight: '500' }}>
                        Add Metric
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                // Parent View: Just Metrics Grid
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    {ADS_METRICS.slice(0, 8).map((metricConfig) => {
                      const metricId = metricConfig.id;
                      const metricData = getMetricValue(metricId);
                      const changeColor = (metricId === 'tacos' || metricId === 'acos') 
                        ? (metricData.change <= 0 ? '#22c55e' : '#ef4444')
                        : (metricData.change >= 0 ? '#22c55e' : '#ef4444');
                      const isVisibleOnChart = visibleAdsMetrics.includes(metricId);
                      const borderColor = isVisibleOnChart ? metricConfig.color : (isDarkMode ? '#1F2937' : '#E5E7EB');
                      
                      return (
                        <div 
                          key={metricId}
                          style={{ 
                            padding: '16px', 
                            backgroundColor: isDarkMode ? '#0f172a' : '#1a2332', 
                            borderRadius: '12px', 
                            border: `2px solid ${borderColor}`,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            height: '72px',
                            justifyContent: 'flex-start'
                          }}
                        >
                          <div style={{ color: '#E5E7EB', fontSize: '1.75rem', fontWeight: '700', lineHeight: '1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>
                            {formatChartValue(metricData.value, metricData.format)}
                          </div>
                          <div style={{ fontSize: '0.625rem', color: '#9CA3AF', fontWeight: '500', lineHeight: '1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 'auto' }}>
                            {metricConfig.label}
                          </div>
                          <div style={{ fontSize: '0.625rem', color: changeColor, fontWeight: '600', lineHeight: '1', whiteSpace: 'nowrap' }}>
                            {metricData.change >= 0 ? '+' : ''}{metricData.change.toFixed(1)}%
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Additional Metrics Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.75rem' }}>
                    <div style={{ 
                      borderRadius: '12px', 
                      border: `1px solid ${isDarkMode ? '#1F2937' : '#E5E7EB'}`, 
                      padding: '1.25rem',
                      backgroundColor: isDarkMode ? '#0f172a' : '#1a2332',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}>
                      <div style={{ color: '#E5E7EB', fontSize: '2rem', fontWeight: '700', lineHeight: '1' }}>
                        {metrics?.current_period?.organic_sales_percent?.toFixed(0) || '39'}%
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '0.5rem' }}>
                        Organic Sales %
                      </div>
                    </div>

                    <div style={{ 
                      borderRadius: '12px', 
                      border: `2px dashed ${isDarkMode ? '#374151' : '#475569'}`, 
                      padding: '1.25rem',
                      backgroundColor: 'transparent',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#2563EB';
                      e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = isDarkMode ? '#374151' : '#475569';
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    >
                      <div style={{ fontSize: '2rem', color: '#9CA3AF', marginBottom: '0.25rem' }}>+</div>
                      <div style={{ fontSize: '0.75rem', color: '#9CA3AF', fontWeight: '500' }}>
                        Add Metric
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        )}
      </div>

      {showConfirmModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 60,
            padding: '1rem',
          }}
        >
          <div
            style={{
              width: '360px',
              maxWidth: '90vw',
              backgroundColor: isDarkMode ? '#0f172a' : '#0f172a',
              color: '#e2e8f0',
              borderRadius: '14px',
              boxShadow: '0 25px 70px rgba(0,0,0,0.35)',
              padding: '20px 20px 16px',
              border: `1px solid ${isDarkMode ? '#1f2937' : '#1f2937'}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: '#e5e7eb' }}>Confirm Unit Quantity</h3>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '9999px',
                  border: 'none',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  color: '#cbd5e1',
                  cursor: 'pointer',
                  fontSize: '18px',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: '10px', fontSize: '15px', lineHeight: 1.5 }}>
              <div style={{ marginBottom: '8px' }}>
                Label Inventory: <span style={{ color: '#f59e0b', fontWeight: 700 }}>{labelInventoryCount.toLocaleString()} units</span>
              </div>
              <div>
                Forecast: <span style={{ fontWeight: 700 }}>{forecastUnits.toLocaleString()} Units</span>
              </div>
            </div>

            <p style={{ margin: '12px 0 18px', color: '#cbd5e1', fontSize: '14px' }}>
              Please choose how you would like to proceed:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                onClick={() => handleConfirmUnits(labelInventoryCount)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#f8fafc',
                  color: '#0f172a',
                  fontWeight: 600,
                  fontSize: '15px',
                  cursor: 'pointer',
                }}
              >
                Match Label Inventory ({labelInventoryCount.toLocaleString()})
              </button>

              <button
                type="button"
                onClick={() => handleConfirmUnits(forecastUnits)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#0b6bff',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '15px',
                  cursor: 'pointer',
                  boxShadow: '0 12px 20px rgba(11,107,255,0.35)',
                }}
              >
                Proceed with {forecastUnits.toLocaleString()} units
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NgoosModal;

