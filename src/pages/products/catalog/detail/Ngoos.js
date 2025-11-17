import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import { toast } from 'sonner';
import NgoosAPI from '../../../../services/ngoosApi';
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

const Ngoos = ({ data }) => {
  const { isDarkMode } = useTheme();
  const [selectedView, setSelectedView] = useState('2 Years');
  const [loading, setLoading] = useState(true);
  const [productDetails, setProductDetails] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [salesMetrics, setSalesMetrics] = useState(null);
  const [zoomDomain, setZoomDomain] = useState({ left: null, right: null });
  const [isZooming, setIsZooming] = useState(false);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [activeTab, setActiveTab] = useState('forecast');
  const [salesDays, setSalesDays] = useState(30);

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
        const [details, forecast, chart, salesData] = await Promise.all([
          NgoosAPI.getProductDetails(childAsin),
          NgoosAPI.getForecast(childAsin),
          NgoosAPI.getChartData(childAsin, weeks),
          NgoosAPI.getSalesMetrics(childAsin, salesDays)
        ]);

        setProductDetails(details);
        setForecastData(forecast);
        setChartData(chart);
        setSalesMetrics(salesData);
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
  }, [data?.child_asin, data?.childAsin, selectedView, salesDays]);

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
    const forecast = chartData.forecast || [];
    
    // Get current date and DOI goal date from forecast
    const currentDate = new Date(forecastData.current_date || Date.now());
    const doiGoalDate = new Date(forecastData.doi_goal_date || Date.now());
    
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
  }, [chartData, forecastData]);

  // Get timeline period boundaries for highlighting
  const timelinePeriods = useMemo(() => {
    if (!forecastData) return null;
    
    return {
      fbaAvailable: {
        start: forecastData.current_date,
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
        end: forecastData.doi_goal_date,
        color: '#3b82f6',
        label: 'Forecast'
      }
    };
  }, [forecastData]);

  // Handle zoom reset
  const handleZoomReset = () => {
    setZoomDomain({ left: null, right: null });
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
      {/* Tab Navigation */}
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

      {/* Inventory Tab Content */}
      {activeTab === 'forecast' && (
        <div>
      {/* Header */}
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

      {/* Content */}
      <div className="px-6 pb-6" style={{ paddingTop: '1.5rem' }}>
        {/* Main Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', marginBottom: '2rem' }}>
          {/* Left: Product Info */}
          <div className={themeClasses.cardBg} style={{ borderRadius: '0.75rem', padding: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ width: '80px', height: '120px', backgroundColor: '#fff', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {data?.mainImage ? (
                  <img src={data.mainImage} alt={data.product} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                ) : (
                  <svg style={{ width: '3rem', height: '3rem', color: '#9ca3af' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#fff', marginBottom: '0.5rem' }}>
                  {productDetails?.product?.name || data?.product || 'Product Name'}
                </h3>
                <div style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                  SIZE: {productDetails?.product?.size || data?.variations?.[0] || 'N/A'}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                  ASIN: {productDetails?.product?.asin || data?.child_asin || data?.childAsin || 'N/A'}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
                  BRAND: {productDetails?.product?.brand || data?.brand || 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Inventory Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {/* FBA Card */}
            <div className={themeClasses.cardBg} style={{ borderRadius: '0.75rem', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg style={{ width: '18px', height: '18px', color: '#fff' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#fff' }}>FBA</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Total:</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#fff' }}>{inventoryData.fba.total}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Available:</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#fff' }}>{inventoryData.fba.available}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Reserved:</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#fff' }}>{inventoryData.fba.reserved}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Inbound:</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#fff' }}>{inventoryData.fba.inbound}</span>
                </div>
              </div>
            </div>

            {/* AWD Card */}
            <div className={themeClasses.cardBg} style={{ borderRadius: '0.75rem', padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg style={{ width: '18px', height: '18px', color: '#fff' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                </div>
                <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#fff' }}>AWD</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Total:</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#fff' }}>{inventoryData.awd.total}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Outbound to FBA:</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#fff' }}>{inventoryData.awd.outbound_to_fba || 0}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Available:</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#fff' }}>{inventoryData.awd.available}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Reserved:</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#fff' }}>{inventoryData.awd.reserved}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Inbound:</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#fff' }}>{inventoryData.awd.inbound}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline Bar */}
        <div className={themeClasses.cardBg} style={{ borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Today<br />{forecastData?.current_date ? new Date(forecastData.current_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }) : '11/11/25'}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Dec</div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Jan</div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Feb</div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Mar</div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'right' }}>
              DOI Goal<br />{forecastData?.doi_goal_date ? new Date(forecastData.doi_goal_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }) : '4/13/25'}
            </div>
          </div>
          
          <div style={{ display: 'flex', height: '60px', borderRadius: '0.5rem', overflow: 'hidden', position: 'relative' }}>
            <div style={{ 
              width: '20%', 
              backgroundColor: '#a855f7', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: '#fff',
              fontSize: '0.875rem',
              fontWeight: '600'
            }}>
              <div>{timeline.fbaAvailable} Days</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>FBA Available</div>
            </div>
            <div style={{ 
              width: '35%', 
              backgroundColor: '#22c55e', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: '#fff',
              fontSize: '0.875rem',
              fontWeight: '600'
            }}>
              <div>{timeline.totalDays} Days</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Total</div>
            </div>
            <div style={{ 
              width: '45%', 
              backgroundColor: '#3b82f6', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: '#fff',
              fontSize: '0.875rem',
              fontWeight: '600',
              position: 'relative'
            }}>
              <div>{timeline.forecast} Days</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Forecast</div>
              {timeline.adjustment !== 0 && (
                <div style={{ 
                  position: 'absolute', 
                  right: '-20px', 
                  top: '-20px',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: timeline.adjustment > 0 ? '#f59e0b' : '#ef4444',
                  border: '3px solid #1e293b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.875rem',
                  fontWeight: '700'
                }}>
                  {timeline.adjustment > 0 ? `+${timeline.adjustment}` : timeline.adjustment}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Unit Forecast Chart */}
        <div className={themeClasses.cardBg} style={{ borderRadius: '0.75rem', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#fff', marginBottom: '0.25rem' }}>Unit Forecast</h3>
              <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
                {productDetails?.product?.size || data?.variations?.[0] || '8oz'} Forecast
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
              <button style={{ padding: '0.375rem', color: '#94a3b8', backgroundColor: 'transparent', border: 'none', cursor: 'pointer' }}>
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

          {/* Chart Area */}
          <div style={{ height: '320px', width: '100%', marginTop: '0.25rem' }}>
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
            <div className={`px-6 py-4 border-b ${themeClasses.border}`}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <select 
                    value={salesDays}
                    onChange={(e) => setSalesDays(Number(e.target.value))}
                    style={{ 
                      padding: '0.5rem 1rem', 
                      borderRadius: '0.5rem', 
                      backgroundColor: '#3b82f6', 
                      color: '#fff',
                      border: 'none',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    <option value={7}>7 Days</option>
                    <option value={30}>30 Days</option>
                    <option value={60}>60 Days</option>
                    <option value={90}>90 Days</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 pb-6" style={{ paddingTop: '1.5rem' }}>
              {/* Main Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', marginBottom: '2rem' }}>
                {/* Left: Product Info */}
                <div className={themeClasses.cardBg} style={{ borderRadius: '0.75rem', padding: '1.5rem' }}>
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ width: '80px', height: '120px', backgroundColor: '#fff', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {data?.mainImage ? (
                        <img src={data.mainImage} alt={salesMetrics?.product?.name || 'Product'} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                      ) : (
                        <svg style={{ width: '3rem', height: '3rem', color: '#9ca3af' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#fff', marginBottom: '0.5rem' }}>
                        {salesMetrics?.product?.name || data?.product || 'Product Name'}
                      </h3>
                      <div style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                        SIZE: {salesMetrics?.product?.size || data?.variations?.[0] || 'N/A'}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '0.25rem' }}>
                        ASIN: {salesMetrics?.product?.asin || data?.child_asin || 'N/A'}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
                        BRAND: {salesMetrics?.product?.brand || data?.brand || 'N/A'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Organic Sales % */}
                  <div style={{ marginTop: '2rem', textAlign: 'center', padding: '1.5rem', backgroundColor: '#0f172a', borderRadius: '0.5rem' }}>
                    <div style={{ fontSize: '3rem', fontWeight: '700', color: '#fff', marginBottom: '0.5rem' }}>
                      {salesMetrics?.current_period?.organic_sales_pct?.toFixed(0) || '0'}%
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Organic Sales %</div>
                  </div>

                  {/* Add Metric Button */}
                  <button style={{ 
                    width: '100%',
                    marginTop: '1rem',
                    padding: '0.75rem',
                    backgroundColor: 'transparent',
                    border: '1px dashed #475569',
                    borderRadius: '0.5rem',
                    color: '#94a3b8',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer'
                  }}>
                    <span style={{ fontSize: '1.25rem' }}>+</span>
                    Add Metric
                  </button>
                </div>

                {/* Right: Chart */}
                <div className={themeClasses.cardBg} style={{ borderRadius: '0.75rem', padding: '1.5rem' }}>
                  <div style={{ height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #475569', borderRadius: '0.5rem' }}>
                    <div style={{ textAlign: 'center', color: '#64748b' }}>
                      <svg style={{ width: '48px', height: '48px', margin: '0 auto', marginBottom: '0.5rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <p style={{ fontSize: '0.875rem' }}>Sales chart coming soon</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Metrics Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                {/* Units Sold */}
                <div style={{ padding: '1.5rem', backgroundColor: '#1e293b', borderRadius: '0.75rem', border: '2px solid #3b82f6' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.75rem' }}>Units Sold</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#fff', marginBottom: '0.5rem' }}>
                    {salesMetrics?.current_period?.units_sold?.toLocaleString() || '0'}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: salesMetrics?.changes?.units_sold >= 0 ? '#22c55e' : '#ef4444' }}>
                    {salesMetrics?.changes?.units_sold >= 0 ? '+' : ''}{salesMetrics?.changes?.units_sold?.toFixed(0) || '0'}%
                  </div>
                </div>

                {/* Sales */}
                <div style={{ padding: '1.5rem', backgroundColor: '#1e293b', borderRadius: '0.75rem', border: '2px solid #f97316' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.75rem' }}>Sales</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#fff', marginBottom: '0.5rem' }}>
                    ${salesMetrics?.current_period?.sales?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '0'}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: salesMetrics?.changes?.sales >= 0 ? '#22c55e' : '#ef4444' }}>
                    {salesMetrics?.changes?.sales >= 0 ? '+' : ''}{salesMetrics?.changes?.sales?.toFixed(0) || '0'}%
                  </div>
                </div>

                {/* Sessions */}
                <div style={{ padding: '1.5rem', backgroundColor: '#1e293b', borderRadius: '0.75rem', border: '1px solid #334155' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.75rem' }}>Sessions</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#fff', marginBottom: '0.5rem' }}>
                    {salesMetrics?.current_period?.sessions?.toLocaleString() || '0'}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: salesMetrics?.changes?.sessions >= 0 ? '#22c55e' : '#ef4444' }}>
                    {salesMetrics?.changes?.sessions >= 0 ? '+' : ''}{salesMetrics?.changes?.sessions?.toFixed(0) || '0'}%
                  </div>
                </div>

                {/* Conversion Rate */}
                <div style={{ padding: '1.5rem', backgroundColor: '#1e293b', borderRadius: '0.75rem', border: '1px solid #334155' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.75rem' }}>Conversion Rate</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#fff', marginBottom: '0.5rem' }}>
                    {salesMetrics?.current_period?.conversion_rate?.toFixed(1) || '0.0'}%
                  </div>
                  <div style={{ fontSize: '0.875rem', color: salesMetrics?.changes?.conversion_rate >= 0 ? '#22c55e' : '#ef4444' }}>
                    {salesMetrics?.changes?.conversion_rate >= 0 ? '+' : ''}{salesMetrics?.changes?.conversion_rate?.toFixed(0) || '0'}%
                  </div>
                </div>

                {/* TACOS */}
                <div style={{ padding: '1.5rem', backgroundColor: '#1e293b', borderRadius: '0.75rem', border: '2px solid #ef4444' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.75rem' }}>Tacos</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#fff', marginBottom: '0.5rem' }}>
                    {salesMetrics?.current_period?.tacos?.toFixed(1) || '0.0'}%
                  </div>
                  <div style={{ fontSize: '0.875rem', color: salesMetrics?.changes?.tacos >= 0 ? '#ef4444' : '#22c55e' }}>
                    {salesMetrics?.changes?.tacos >= 0 ? '+' : ''}{salesMetrics?.changes?.tacos?.toFixed(0) || '0'}%
                  </div>
                </div>

                {/* Price */}
                <div style={{ padding: '1.5rem', backgroundColor: '#1e293b', borderRadius: '0.75rem', border: '1px solid #334155' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.75rem' }}>Price</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#fff', marginBottom: '0.5rem' }}>
                    ${salesMetrics?.current_period?.price?.toFixed(2) || '0.00'}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: salesMetrics?.changes?.price >= 0 ? '#22c55e' : '#ef4444' }}>
                    {salesMetrics?.changes?.price >= 0 ? '+' : ''}{salesMetrics?.changes?.price?.toFixed(0) || '0'}%
                  </div>
                </div>

                {/* Profit % */}
                <div style={{ padding: '1.5rem', backgroundColor: '#1e293b', borderRadius: '0.75rem', border: '1px solid #334155' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.75rem' }}>Profit %</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#fff', marginBottom: '0.5rem' }}>
                    {salesMetrics?.current_period?.profit_margin?.toFixed(1) || '0.0'}%
                  </div>
                  <div style={{ fontSize: '0.875rem', color: salesMetrics?.changes?.profit_margin >= 0 ? '#22c55e' : '#ef4444' }}>
                    {salesMetrics?.changes?.profit_margin >= 0 ? '+' : ''}{salesMetrics?.changes?.profit_margin?.toFixed(0) || '0'}%
                  </div>
                </div>

                {/* Profit Total */}
                <div style={{ padding: '1.5rem', backgroundColor: '#1e293b', borderRadius: '0.75rem', border: '1px solid #334155' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.75rem' }}>Profit Total</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#fff', marginBottom: '0.5rem' }}>
                    ${salesMetrics?.current_period?.profit_total?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '0'}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: salesMetrics?.changes?.profit_total >= 0 ? '#22c55e' : '#ef4444' }}>
                    {salesMetrics?.changes?.profit_total >= 0 ? '+' : ''}{salesMetrics?.changes?.profit_total?.toFixed(0) || '0'}%
                  </div>
                </div>
              </div>
            </div>
          </div>
      )}

      {/* Ads Tab Content */}
      {activeTab === 'ads' && (
          <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#fff', marginBottom: '0.25rem' }}>Advertising Performance</h3>
                  <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
                    {productDetails?.product?.size || data?.variations?.[0] || '8oz'} Ad Metrics
                  </p>
                </div>
              </div>

              {/* Ads Chart Placeholder */}
              <div style={{ height: '400px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #475569', borderRadius: '0.5rem' }}>
                <div style={{ textAlign: 'center', color: '#64748b' }}>
                  <svg style={{ width: '64px', height: '64px', margin: '0 auto', marginBottom: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                  </svg>
                  <p style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>Ad Data Coming Soon</p>
                  <p style={{ fontSize: '0.875rem' }}>Advertising metrics and performance will be displayed here</p>
                </div>
              </div>

              {/* Ads Metrics Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginTop: '1.5rem' }}>
                <div style={{ padding: '1rem', backgroundColor: '#0f172a', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.5rem' }}>Ad Spend</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#fff' }}>-</div>
                </div>
                <div style={{ padding: '1rem', backgroundColor: '#0f172a', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.5rem' }}>Ad Sales</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#fff' }}>-</div>
                </div>
                <div style={{ padding: '1rem', backgroundColor: '#0f172a', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.5rem' }}>ACOS</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#fff' }}>-</div>
                </div>
                <div style={{ padding: '1rem', backgroundColor: '#0f172a', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.5rem' }}>ROAS</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#fff' }}>-</div>
                </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Ngoos;

