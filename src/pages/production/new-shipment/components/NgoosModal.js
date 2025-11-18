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

const NgoosModal = ({ isOpen, onClose, selectedRow }) => {
  const { isDarkMode } = useTheme();
  const [allVariations, setAllVariations] = useState(true);
  const [forecastView, setForecastView] = useState(true);
  const [loading, setLoading] = useState(true);
  const [productDetails, setProductDetails] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [selectedView, setSelectedView] = useState('2 Years');
  const [salesDays, setSalesDays] = useState(30);

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
        
        // Fetch all N-GOOS data in parallel
        const [details, forecast, chart] = await Promise.all([
          NgoosAPI.getProductDetails(childAsin),
          NgoosAPI.getForecast(childAsin),
          NgoosAPI.getChartData(childAsin, weeks)
        ]);

        setProductDetails(details);
        setForecastData(forecast);
        setChartData(chart);
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
  }, [isOpen, selectedRow, selectedView]);

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
    if (!chartData || !forecastData) return [];

    const historical = chartData.historical || [];
    const forecast = chartData.forecast || [];
    
    // Get current date and DOI goal date from forecast
    const currentDate = new Date(forecastData.current_date || Date.now());
    const doiGoalDate = new Date(forecastData.doi_goal_date || Date.now());
    
    // Calculate runout dates
    const fbaAvailableDays = forecastData.fba_available_days || 0;
    const totalDays = forecastData.total_days || 0;
    
    const runoutDate = forecastData.runout_date 
      ? new Date(forecastData.runout_date)
      : new Date(currentDate.getTime() + fbaAvailableDays * 24 * 60 * 60 * 1000);
    
    const totalRunoutDate = forecastData.total_runout_date 
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
    
    return combinedData;
  }, [chartData, forecastData]);

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
  
  const progressValues = calculateProgressBarValues();

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
          width: '100%',
          maxWidth: '1120px',
          maxHeight: '94vh',
          borderRadius: '0.9rem',
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
            {productDetails?.inventory && (
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
                      backgroundColor: '#DC2626',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ color: '#FFFFFF', fontSize: '10px', fontWeight: 700 }}>!</span>
                  </span>
                  <span>Label Inventory: {inventoryData.fba.total + inventoryData.awd.total}</span>
                </button>
                <button
                  type="button"
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
                  }}
                >
                  Add Units ({forecastData?.units_to_make || 0})
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
          {['Inventory', 'Sales', 'Ads'].map((tab, idx) => (
            <button
              key={tab}
              type="button"
              style={{
                padding: '4px 24px',
                borderRadius: '4px',
                border: 'none',
                fontSize: '0.75rem',
                fontWeight: 500,
                backgroundColor: idx === 0 ? '#2563EB' : 'transparent',
                color: idx === 0 ? '#FFFFFF' : '#9CA3AF',
                cursor: 'pointer',
                transition: 'all 0.2s',
                height: '23px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
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
                minHeight: '190px',
                borderRadius: '0.75rem',
                border: `1px dashed ${isDarkMode ? '#374151' : '#D1D5DB'}`,
                padding: '0.5rem',
              }}
            >
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : chartDisplayData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={chartDisplayData}
                    margin={{ top: 5, right: 20, left: 10, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#1e293b' : '#e5e7eb'} vertical={false} />
                    <XAxis 
                      dataKey="date" 
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
                      barSize={20}
                      stackId="inventory"
                    />
                    <Bar 
                      dataKey="totalInv" 
                      fill="#22c55e" 
                      fillOpacity={0.9}
                      name="Total Inv"
                      barSize={20}
                      stackId="inventory"
                    />
                    <Bar 
                      dataKey="forecastInv" 
                      fill="#3b82f6" 
                      fillOpacity={0.9}
                      name="Forecast"
                      barSize={20}
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '0.8rem' }} className={themeClasses.textSecondary}>
                  No chart data available
                </div>
              )}
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
};

export default NgoosModal;

