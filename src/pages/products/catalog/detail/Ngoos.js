import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Brush,
  Area,
  ReferenceArea,
  ReferenceLine
} from 'recharts';

// Helper: determine step size for qty increments based on product size.
// This mirrors the non-table \"Add products\" behavior so N-GOOS rounds to case sizes.
const getQtyIncrementForSize = (sizeRaw) => {
  const size = (sizeRaw || '').toLowerCase();
  const sizeCompact = size.replace(/\s+/g, '');

  // 8oz products change in full-case increments (60 units)
  if (sizeCompact.includes('8oz')) return 60;

  // 6oz products (bag or bottle) change in case increments (40 units)
  const isSixOz =
    sizeCompact.includes('6oz') ||
    size.includes('6 oz') ||
    size.includes('6-ounce') ||
    size.includes('6 ounce');

  // 1/2 lb bag products also use 40-unit increments
  const isHalfPoundBag =
    sizeCompact.includes('1/2lb') ||
    size.includes('1/2 lb') ||
    size.includes('0.5lb') ||
    size.includes('0.5 lb') ||
    size.includes('half lb');

  if (isSixOz || isHalfPoundBag) return 40;

  // 1 lb products change in case increments (25 units)
  const isOnePound =
    sizeCompact.includes('1lb') ||
    size.includes('1 lb') ||
    size.includes('1-pound') ||
    size.includes('1 pound');
  if (isOnePound) return 25;

  // 25 lb products should use single-unit increments
  const isTwentyFivePound =
    sizeCompact.includes('25lb') ||
    size.includes('25 lb') ||
    size.includes('25-pound') ||
    size.includes('25 pound');
  if (isTwentyFivePound) return 1;

  // 5 lb products change in small increments (5 units)
  const isFivePound =
    sizeCompact.includes('5lb') ||
    size.includes('5 lb') ||
    size.includes('5-pound') ||
    size.includes('5 pound');
  if (isFivePound) return 5;

  // Gallon products change in case increments (4 units)
  if (size.includes('gallon') || size.includes('gal ')) return 4;

  // Quart products change in case increments (12 units)
  if (size.includes('quart') || size.includes(' qt')) return 12;

  return 1;
};

const Ngoos = ({ data, inventoryOnly = false, doiGoalDays = null, doiSettings = null, overrideUnitsToMake = null, onAddUnits = null, labelsAvailable = null, openDoiSettings = false, openForecastSettings = false, onDoiSettingsChange = null, onForecastSettingsChange = null, hasActiveForecastSettings = false, isAlreadyAdded = false }) => {
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
  const [zoomHistory, setZoomHistory] = useState([]); // stack of previous zoom levels for "reset to previous"
  const [zKeyHeld, setZKeyHeld] = useState(false);
  const [zoomBox, setZoomBox] = useState({ startTimestamp: null, endTimestamp: null }); // Z-drag zoom selection
  const [isZooming, setIsZooming] = useState(false);
  const [brushRange, setBrushRange] = useState({ startIndex: null, endIndex: null });
  const [chartRangeSelection, setChartRangeSelection] = useState({ startTimestamp: null, endTimestamp: null });
  const [chartRangeSelecting, setChartRangeSelecting] = useState(false);
  const chartContainerRef = useRef(null);
  const zoomBoxDragRef = useRef({ startTimestamp: null, endTimestamp: null });
  const rangeSelectingRef = useRef(false);
  const chartCursorRef = useRef(null); // cursor position for tooltip (DOM updates, no setState)
  const chartTooltipWrapperRef = useRef(null); // tooltip wrapper div for position updates without re-render
  const [lastClickTime, setLastClickTime] = useState(0);
  const [activeTab, setActiveTab] = useState('forecast');
  const [metricsDays, setMetricsDays] = useState(30);
  const [showMetricSelector, setShowMetricSelector] = useState(false);
  const [metricSearch, setMetricSearch] = useState('');
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showForecastSettingsTooltip, setShowForecastSettingsTooltip] = useState(false);
  const [showForecastSettingsModal, setShowForecastSettingsModal] = useState(false);
  const [showTemporaryConfirmModal, setShowTemporaryConfirmModal] = useState(false);
  const [dontRemindAgain, setDontRemindAgain] = useState(false);
  const [hoveredWarning, setHoveredWarning] = useState(false);
  const [settingsApplied, setSettingsApplied] = useState(false);
  const [showIndicatorTooltip, setShowIndicatorTooltip] = useState(false);
  const [salesVelocityWeight, setSalesVelocityWeight] = useState(25);
  const [svVelocityWeight, setSvVelocityWeight] = useState(15);
  const [tempSalesVelocityWeight, setTempSalesVelocityWeight] = useState(25);
  const [tempSvVelocityWeight, setTempSvVelocityWeight] = useState(15);
  const [forecastModel, setForecastModel] = useState('Growing'); // New, Growing, Established
  const [marketAdjustment, setMarketAdjustment] = useState(5.0);
  const [tempForecastModel, setTempForecastModel] = useState('Growing');
  const [tempMarketAdjustment, setTempMarketAdjustment] = useState(5.0);
  const [tempDoiSettings, setTempDoiSettings] = useState(() => {
    return doiSettings || { amazonDoiGoal: 130, inboundLeadTime: 30, manufactureLeadTime: 7 };
  });
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

  // Ensure the forecast settings indicator shows when this product already
  // has active custom forecast/DOI settings (e.g. from the Add Products page).
  useEffect(() => {
    if (hasActiveForecastSettings) {
      setSettingsApplied(true);
    }
  }, [hasActiveForecastSettings, data?.child_asin, data?.childAsin]);

  const themeClasses = {
    bg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    cardBg: isDarkMode ? 'bg-[#0f172a]' : 'bg-[#0f172a]', // Match the dark blue from screenshot
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
              
              // When inventoryOnly is true (production planning modal), only fetch essential data
              // Skip metrics/sales/ads APIs that may fail and aren't needed for inventory forecast
              if (inventoryOnly) {
                // Use doiSettings object if provided, otherwise fall back to doiGoalDays
                const forecastSettings = doiSettings || doiGoalDays;
                const results = await Promise.allSettled([
                  NgoosAPI.getProductDetails(childAsin),
                  NgoosAPI.getForecast(childAsin, forecastSettings), // Pass DOI settings for accurate units_to_make
                  NgoosAPI.getChartData(childAsin, weeks, salesVelocityWeight, svVelocityWeight)
                ]);

                const details = results[0].status === 'fulfilled' ? results[0].value : null;
                const forecast = results[1].status === 'fulfilled' ? results[1].value : null;
                const chart = results[2].status === 'fulfilled' ? results[2].value : null;

                // Log any failed requests for debugging
                results.forEach((result, index) => {
                  if (result.status === 'rejected') {
                    const apiNames = ['ProductDetails', 'Forecast', 'ChartData'];
                    console.warn(`N-GOOS ${apiNames[index]} failed for ${childAsin}:`, result.reason?.message || result.reason);
                  }
                });

                setProductDetails(details);
                setForecastData(forecast);
                setChartData(chart);
                // Don't set metrics/salesChart/adsChart - not needed for inventory-only mode
              } else {
                // Full mode - fetch all data including metrics/sales/ads
                // Use doiSettings object if provided, otherwise fall back to doiGoalDays
                const forecastSettings = doiSettings || doiGoalDays;
                const results = await Promise.allSettled([
                  NgoosAPI.getProductDetails(childAsin),
                  NgoosAPI.getForecast(childAsin, forecastSettings), // Pass DOI settings for accurate units_to_make
                  NgoosAPI.getChartData(childAsin, weeks, salesVelocityWeight, svVelocityWeight),
                  NgoosAPI.getMetrics(childAsin, metricsDays),
                  NgoosAPI.getSalesChart(childAsin, metricsDays),
                  NgoosAPI.getAdsChart(childAsin, metricsDays)
                ]);

                // Extract values safely - use null if the request failed
                const details = results[0].status === 'fulfilled' ? results[0].value : null;
                const forecast = results[1].status === 'fulfilled' ? results[1].value : null;
                const chart = results[2].status === 'fulfilled' ? results[2].value : null;
                const metricsData = results[3].status === 'fulfilled' ? results[3].value : null;
                const salesChart = results[4].status === 'fulfilled' ? results[4].value : null;
                const adsChart = results[5].status === 'fulfilled' ? results[5].value : null;

                // Log any failed requests for debugging
                results.forEach((result, index) => {
                  if (result.status === 'rejected') {
                    const apiNames = ['ProductDetails', 'Forecast', 'ChartData', 'Metrics', 'SalesChart', 'AdsChart'];
                    console.warn(`N-GOOS ${apiNames[index]} failed for ${childAsin}:`, result.reason?.message || result.reason);
                  }
                });

                setProductDetails(details);
                setForecastData(forecast);
                setChartData(chart);
                setMetrics(metricsData);
                setSalesChartData(salesChart);
                setAdsChartData(adsChart);
                
                // Debug logging
                console.log('Ads Chart Response:', adsChart);
                console.log('Chart Data Array:', adsChart?.chart_data);
              }
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
    }, [data?.child_asin, data?.childAsin, selectedView, metricsDays, salesVelocityWeight, svVelocityWeight, inventoryOnly, doiGoalDays, doiSettings]);

  // Sync tempDoiSettings when doiSettings prop changes
  useEffect(() => {
    if (doiSettings) {
      setTempDoiSettings(doiSettings);
    }
  }, [doiSettings]);

  // Open forecast settings modal when openForecastSettings prop is true
  useEffect(() => {
    if (openForecastSettings) {
      setShowForecastSettingsModal(true);
    }
  }, [openForecastSettings]);

  // Extract inventory data - PREFER forecastData (Railway/PostgreSQL) over productDetails (AWS Lambda)
  // forecastData comes from our Railway API with accurate real-time inventory
  const inventoryData = useMemo(() => {
    // First try to get inventory from forecastData (Railway API - accurate)
    if (forecastData?.fba_available !== undefined || forecastData?.inventory?.fba_available !== undefined) {
      const inv = forecastData.inventory || forecastData;
      return {
        fba: {
          total: (inv.fba_available || 0) + (inv.fba_reserved || 0) + (inv.fba_inbound || 0),
          available: inv.fba_available || 0,
          reserved: inv.fba_reserved || 0,
          inbound: inv.fba_inbound || 0
        },
        awd: {
          total: (inv.awd_available || 0) + (inv.awd_reserved || 0) + (inv.awd_inbound || 0),
          outbound_to_fba: inv.awd_outbound_to_fba || 0,
          available: inv.awd_available || 0,
          reserved: inv.awd_reserved || 0,
          inbound: inv.awd_inbound || 0
        }
      };
    }
    // Fallback to productDetails (AWS Lambda API)
    return productDetails?.inventory || {
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
  }, [forecastData, productDetails]);

  // Extract inventory data for timeline visualization
  // Uses same logic as backend: FBA inventory + Additional inventory + Units to Make
  const timeline = useMemo(() => {
    // Get inventory units directly
    const fbaUnits = inventoryData?.fba?.available || inventoryData?.fba?.total || 0;
    const awdUnits = inventoryData?.awd?.available || inventoryData?.awd?.total || 0;
    const totalUnits = fbaUnits + awdUnits;
    const additionalUnits = awdUnits; // Additional inventory beyond FBA

    // Get units_to_make - use override if provided (from parent component), otherwise from forecast API.
    // Then normalize to the nearest case size using the same rules as non-table mode.
    const rawUnitsToMake = overrideUnitsToMake ?? forecastData?.units_to_make ?? 0;
    const sizeForIncrement = productDetails?.product?.size || data?.size || data?.variations?.[0] || '';
    const increment = getQtyIncrementForSize(sizeForIncrement);
    const numUnits = typeof rawUnitsToMake === 'number' ? rawUnitsToMake : parseInt(rawUnitsToMake, 10);
    const unitsToMake =
      numUnits && !Number.isNaN(numUnits) && increment && increment > 1
        ? Math.ceil(numUnits / increment) * increment
        : numUnits || 0;
    const adjustment = forecastData?.forecast_adjustment || 0;
    
    // Get DOI days from API
    let doiFba = forecastData?.doi_fba || 0;
    let doiTotal = forecastData?.doi_total || 0;
    
    // If DOI not provided, calculate from runout dates
    if (doiFba === 0 && forecastData?.runout_date && forecastData?.current_date) {
      const currentDate = new Date(forecastData.current_date);
      const runoutDate = new Date(forecastData.runout_date);
      doiFba = Math.round((runoutDate - currentDate) / (1000 * 60 * 60 * 24));
    }
    if (doiTotal === 0 && forecastData?.total_runout_date && forecastData?.current_date) {
      const currentDate = new Date(forecastData.current_date);
      const totalRunoutDate = new Date(forecastData.total_runout_date);
      doiTotal = Math.round((totalRunoutDate - currentDate) / (1000 * 60 * 60 * 24));
    }
    
    // Final fallback: calculate from inventory and weekly forecast
    if (doiFba === 0 || doiTotal === 0) {
      const weeklyForecast = forecastData?.weekly_forecast || forecastData?.forecast || 0;
      if (weeklyForecast > 0) {
        const dailySales = weeklyForecast / 7;
        if (doiFba === 0 && fbaUnits > 0) {
          doiFba = Math.round(fbaUnits / dailySales);
        }
        if (doiTotal === 0 && totalUnits > 0) {
          doiTotal = Math.round(totalUnits / dailySales);
        }
      }
    }
    
    // Fallback for products where API doesn't return doi_total / total_runout_date: use DOI settings
    // so all products show FBA and Total Inventory days (e.g. from catalog or global settings).
    if (doiFba === 0 && doiSettings?.amazonDoiGoal != null) {
      doiFba = Number(doiSettings.amazonDoiGoal) || 0;
    }
    if (doiTotal === 0 && doiSettings) {
      const inbound = Number(doiSettings.inboundLeadTime) || 0;
      const manufacture = Number(doiSettings.manufactureLeadTime) || 0;
      doiTotal = doiFba + inbound + manufacture;
    }
    
    return {
      // Inventory units for bar proportions
      fbaInventory: Math.round(fbaUnits),
      additionalInventory: Math.round(additionalUnits),
      totalInventory: Math.round(totalUnits),
      unitsToMake: Math.round(unitsToMake),
      // DOI days for labels
      fbaAvailable: doiFba,
      totalDays: doiTotal,
      forecast: Math.round(unitsToMake), // Show units to make, not days
      adjustment: Math.round(adjustment)
    };
  }, [forecastData, inventoryData, overrideUnitsToMake, doiSettings]);

  // Calculate bar widths proportionally based on inventory units (matches backend logic)
  // Total span = FBA inventory + Additional inventory + Units to Make
  const totalTimelineUnits = useMemo(() => {
    const fba = timeline.fbaInventory || 0;
    const additional = timeline.additionalInventory || 0;
    const unitsToMake = timeline.unitsToMake || 0;
    
    const totalSpan = fba + additional + unitsToMake;
    
    return totalSpan > 0 ? totalSpan : 1; // Avoid division by zero
  }, [timeline.fbaInventory, timeline.additionalInventory, timeline.unitsToMake]);

  // Calculate percentage widths for each bar segment
  const timelineWidths = useMemo(() => {
    const fba = timeline.fbaInventory || 0;
    const additional = timeline.additionalInventory || 0;
    const unitsToMake = timeline.unitsToMake || 0;
    
    // Calculate percentages - ensure minimum width of 10% if there are any units
    let fbaPercent = fba > 0 ? Math.max(10, (fba / totalTimelineUnits) * 100) : 0;
    let totalPercent = additional > 0 ? Math.max(10, (additional / totalTimelineUnits) * 100) : 0;
    let forecastPercent = unitsToMake > 0 ? Math.max(10, (unitsToMake / totalTimelineUnits) * 100) : 0;
    
    // Normalize to 100% if we have data
    const sum = fbaPercent + totalPercent + forecastPercent;
    if (sum > 0 && sum !== 100) {
      const scale = 100 / sum;
      fbaPercent = fbaPercent * scale;
      totalPercent = totalPercent * scale;
      forecastPercent = forecastPercent * scale;
    }
    
    return {
      fba: `${fbaPercent.toFixed(1)}%`,
      total: `${totalPercent.toFixed(1)}%`,
      forecast: `${forecastPercent.toFixed(1)}%`
    };
  }, [timeline.fbaInventory, timeline.additionalInventory, timeline.unitsToMake, totalTimelineUnits]);

  // Prepare chart data for visualization with inventory bars
  const chartDisplayData = useMemo(() => {
    if (!chartData) return { data: [], maxValue: 0 };

    const historical = chartData.historical || [];
    let forecast = chartData.forecast || [];
    const algorithm = chartData.algorithm || '18m+';
    
    // 🎯 Limit forecast to half of selected period for better detail/zoom
    const maxForecastWeeks = getWeeksForView(selectedView) / 2;
    forecast = forecast.slice(0, maxForecastWeeks);
    
    // Get current date - prefer from chart data metadata, then forecastData, then today
    const currentDate = new Date(
      chartData.metadata?.today || 
      chartData.today || 
      forecastData?.current_date || 
      Date.now()
    );
    
    // Get DOI goal date - calculate from doiGoalDays/doiSettings or use API value
    const totalDoiDays = doiGoalDays || (doiSettings ? 
      (doiSettings.amazonDoiGoal + doiSettings.inboundLeadTime + doiSettings.manufactureLeadTime) : 
      130);
    const doiGoalDate = new Date(currentDate.getTime() + totalDoiDays * 24 * 60 * 60 * 1000);
    
    // Calculate runout dates based on DOI days from chart data or forecastData
    // Per CALCULATIONS.md: Runout Date = Current Date + DOI (days)
    const fbaAvailableDays = chartData.doi?.fba_days || forecastData?.doi_fba || forecastData?.fba_available_days || 0;
    const totalDays = chartData.doi?.total_days || forecastData?.doi_total || forecastData?.total_days || 0;
    
    // FBA Runout = Current Date + FBA Available Days
    const runoutDate = forecastData.runout_date 
      ? new Date(forecastData.runout_date)
      : new Date(currentDate.getTime() + fbaAvailableDays * 24 * 60 * 60 * 1000);
    
    // Total Runout = Current Date + Total Days (includes FBA + AWD + Inbound)
    const totalRunoutDate = forecastData.total_runout_date 
      ? new Date(forecastData.total_runout_date)
      : new Date(currentDate.getTime() + totalDays * 24 * 60 * 60 * 1000);
    
    // Helper to get the correct "smooth" field based on algorithm
    // 18m+: units_sold_smoothed | 6-18m: units_sold_potential | 0-6m: max_week_seasonality_index_applied
    const getSmoothValue = (item) => {
      if (algorithm === '18m+') {
        return item.units_sold_smoothed || item.units_smooth || 0;
      } else if (algorithm === '6-18m') {
        return item.units_sold_potential || 0;
      } else { // 0-6m
        return item.max_week_seasonality_index_applied || 0;
      }
    };
    
    // Helper to get the correct "units sold" field based on algorithm
    const getUnitsSoldValue = (item) => {
      if (algorithm === '0-6m') {
        return item.adj_units_sold || item.units_sold || 0;
      }
      return item.units_sold || 0;
    };
    
    // Helper to get the correct "forecast" field (backend returns 'forecast', not 'adj_forecast')
    const getForecastValue = (item) => {
      return item.forecast || item.adj_forecast || 0;
    };

    // Helper to calculate prior year value from historical data (fallback when backend doesn't provide it)
    const getPriorYearValue = (targetDate, historicalData) => {
      const priorYearDate = new Date(targetDate);
      priorYearDate.setFullYear(priorYearDate.getFullYear() - 1);
      const priorYearTs = priorYearDate.getTime();

      let closest = null;
      let minDiff = Infinity;

      historicalData.forEach((h) => {
        if (!h?.week_end) return;
        const itemTs = new Date(h.week_end).getTime();
        const diff = Math.abs(itemTs - priorYearTs);
        // Only accept matches within ~1 week
        if (diff < minDiff && diff < 7 * 24 * 60 * 60 * 1000) {
          minDiff = diff;
          closest = h;
        }
      });

      return closest ? getSmoothValue(closest) : null;
    };
    
    // Find max value to make bars span full chart height
    let maxValue = 0;
    historical.forEach(item => {
      maxValue = Math.max(maxValue, getUnitsSoldValue(item), getSmoothValue(item));
    });
    forecast.forEach(item => {
      maxValue = Math.max(maxValue, getForecastValue(item));
    });
    
    // Use max value for full-height bars
    const barHeight = maxValue * 1.1; // 10% padding to ensure full coverage
    
    // Combine historical and forecast data
    const combinedData = [];
    
    // Add historical data
    historical.forEach((item, index) => {
      const itemDate = new Date(item.week_end);
      const isInInventoryPeriod = itemDate >= currentDate && itemDate <= doiGoalDate;
      const isInFbaAvailPeriod = itemDate >= currentDate && itemDate < runoutDate;
      const isInTotalPeriod = itemDate >= runoutDate && itemDate < totalRunoutDate;
      
      const smoothVal = getSmoothValue(item);
      const unitsSoldVal = getUnitsSoldValue(item);
      // Get prior year data if available on historical points
      const priorYearValHist = item.prior_year_smoothed ||
                               item.priorYearSmoothed ||
                               item.prior_year ||
                               item.prior_year_smooth ||
                               item.priorYear ||
                               null;
      
      // Debug first historical item
      if (index === 0) {
        console.log('First historical item structure:', item);
        console.log('Historical available properties:', Object.keys(item));
      }
      
      combinedData.push({
        date: item.week_end,
        timestamp: itemDate.getTime(),
        unitsSold: unitsSoldVal,
        unitsSmooth: smoothVal,
        forecastBase: smoothVal, // Smoothed units sold (forecast base) - shown from start
        priorYearSmoothed: priorYearValHist,
        isForecast: false,
        isInDoiPeriod: isInInventoryPeriod,
        // Bars span full height when in their respective periods
        fbaAvail: isInFbaAvailPeriod ? barHeight : null,
        totalInv: isInTotalPeriod ? barHeight : null,
        forecastInv: null
      });
    });
    
    // Add forecast data with inventory visualization
    // Smoothed units sold (solid) stops at Today, forecast (dashed) takes over
    forecast.forEach((item, index) => {
      const itemDate = new Date(item.week_end);
      const isInInventoryPeriod = itemDate >= currentDate && itemDate <= doiGoalDate;
      const isInFbaAvailPeriod = itemDate >= currentDate && itemDate < runoutDate;
      const isInTotalPeriod = itemDate >= runoutDate && itemDate < totalRunoutDate;
      const isInForecastPeriod = itemDate >= totalRunoutDate && itemDate <= doiGoalDate;
      
      const forecastVal = getForecastValue(item);
      
      // Get prior year data if available (for comparison)
      // Check multiple possible property names, then fall back to calculating from historical data
      let priorYearVal = item.prior_year_smoothed || 
                         item.priorYearSmoothed || 
                         item.prior_year || 
                         item.prior_year_smooth ||
                         item.priorYear ||
                         null;

      // Fallback: if backend did not include prior year for this forecast point, derive it from historical data
      if (priorYearVal == null) {
        priorYearVal = getPriorYearValue(item.week_end, historical);
      }
      
      // Debug logging for first forecast item to see data structure
      if (index === 0) {
        console.log('First forecast item structure:', item);
        console.log('Prior year value found:', priorYearVal);
        console.log('Available properties:', Object.keys(item));
      }
      
      // In forecast region only orange dashed line: no forecastBase (no solid), no prior year
      combinedData.push({
        date: item.week_end,
        timestamp: itemDate.getTime(),
        forecastBase: null, // no solid orange in forecast; only dashed
        forecastAdjusted: forecastVal, // Forecast (dashed) - only line in forecast
        priorYearSmoothed: null, // not shown in forecast
        isForecast: true,
        isInDoiPeriod: isInInventoryPeriod,
        // Bars span full height when in their respective periods
        fbaAvail: isInFbaAvailPeriod ? barHeight : null,
        totalInv: isInTotalPeriod ? barHeight : null,
        forecastInv: isInForecastPeriod ? barHeight : null
      });
    });
    
    // Calculate min/max from actual line data (excluding inventory bars) so Y axis shows only the range that has graph data
    let chartMinValue = Infinity;
    let chartMaxValue = 0;
    combinedData.forEach(item => {
      [item.unitsSold, item.forecastBase, item.forecastAdjusted, item.priorYearSmoothed].forEach(v => {
        if (v == null || Number.isNaN(v)) return;
        chartMinValue = Math.min(chartMinValue, v);
        chartMaxValue = Math.max(chartMaxValue, v);
      });
    });
    if (chartMinValue === Infinity) chartMinValue = 0;
    
    return { data: combinedData, maxValue: chartMaxValue, minValue: chartMinValue };
  }, [chartData, forecastData, selectedView, doiGoalDays, doiSettings]);

  // Y-axis tick values for Unit Forecast chart: only numbers in the data range (min to max of graph)
  const unitForecastYTicks = useMemo(() => {
    const min = chartDisplayData.minValue ?? 0;
    const max = chartDisplayData.maxValue || 0;
    if (max <= 0) return [];
    const range = Math.max(max - min, max * 0.01 || 1);
    const tickCount = 5;
    const rawStep = range / (tickCount - 1);

    const pow10 = Math.pow(10, Math.floor(Math.log10(rawStep || 1)));
    const normalized = rawStep / pow10;
    let nice;
    if (normalized <= 1) nice = 1;
    else if (normalized <= 2) nice = 2;
    else if (normalized <= 5) nice = 5;
    else nice = 10;
    const step = Math.max(nice * pow10, range / (tickCount - 1));

    const ticks = [];
    const start = Math.floor(min / step) * step;
    for (let v = start; v <= max + step * 0.01; v += step) {
      const rounded = Math.round(v);
      if (rounded >= min - step * 0.01 && rounded <= max + step * 0.01) ticks.push(rounded);
      if (ticks.length >= tickCount) break;
    }
    if (ticks.length === 0) ticks.push(min, max);
    return [...new Set(ticks.sort((a, b) => a - b))];
  }, [chartDisplayData.maxValue, chartDisplayData.minValue]);

  // Timeline periods are now provided by the backend via forecastData.chart_rendering
  // This eliminates complex date calculations on the frontend

  // Handle zoom reset: return to previous zoom level (or full view if no history)
  const handleZoomReset = () => {
    if (zoomHistory.length === 0) {
      setZoomDomain({ left: null, right: null });
      return;
    }
    const next = [...zoomHistory];
    const previous = next.pop();
    setZoomHistory(next);
    setZoomDomain(previous);
  };

  // Parse date string as local date (avoid UTC midnight shifting the right edge)
  const parseZoomDateToLocal = (dateStr, endOfDay) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    if (endOfDay) return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
    return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
  };

  // Zoom range as timestamps: used so both ends of the grabbed range are visible on the axis
  const chartXDomainWhenZoomed = useMemo(() => {
    if (zoomDomain.left == null || zoomDomain.right == null) return null;
    const zoomMin = parseZoomDateToLocal(zoomDomain.left, false);
    const zoomMax = parseZoomDateToLocal(zoomDomain.right, true);
    return [zoomMin, zoomMax];
  }, [zoomDomain?.left, zoomDomain?.right]);

  // Chart data actually shown: when zoomed, filter to zoom range so the graph visibly zooms
  const chartDataForDisplay = useMemo(() => {
    const data = chartDisplayData?.data;
    if (!data?.length) return [];
    if (zoomDomain.left == null || zoomDomain.right == null) return data;
    const zoomMin = parseZoomDateToLocal(zoomDomain.left, false);
    const zoomMax = parseZoomDateToLocal(zoomDomain.right, true);
    return data.filter((d) => {
      const t = typeof d.timestamp === 'number' ? d.timestamp : new Date(d.timestamp).getTime();
      return t >= zoomMin && t <= zoomMax;
    });
  }, [chartDisplayData?.data, zoomDomain?.left, zoomDomain?.right]);

  // Sum of Units Sold and Units Sold Smoothed for the drag-selected range
  const chartRangeSum = useMemo(() => {
    if (!chartDisplayData?.data?.length || chartRangeSelection.startTimestamp == null || chartRangeSelection.endTimestamp == null) return null;
    const data = chartDisplayData.data;
    const lo = Math.min(chartRangeSelection.startTimestamp, chartRangeSelection.endTimestamp);
    const hi = Math.max(chartRangeSelection.startTimestamp, chartRangeSelection.endTimestamp);
    let unitsSold = 0;
    let unitsSmoothed = 0;
    data.forEach((d) => {
      if (d.timestamp >= lo && d.timestamp <= hi) {
        unitsSold += Number(d.unitsSold) || 0;
        unitsSmoothed += Number(d.forecastBase ?? d.unitsSmooth) || 0;
      }
    });
    return { unitsSold, unitsSmoothed };
  }, [chartDisplayData?.data, chartRangeSelection.startTimestamp, chartRangeSelection.endTimestamp]);

  // Map client X to timestamp using the chart's actual plot area and current visible domain (zoom-aware)
  const getTimestampFromClientX = (clientX) => {
    const data = chartDisplayData?.data;
    if (!chartContainerRef.current || !data?.length) return null;
    const dataMin = data[0].timestamp;
    const dataMax = data[data.length - 1].timestamp;
    const visibleMin = zoomDomain.left != null ? parseZoomDateToLocal(zoomDomain.left, false) : dataMin;
    const visibleMax = zoomDomain.right != null ? parseZoomDateToLocal(zoomDomain.right, true) : dataMax;
    const container = chartContainerRef.current;
    let plotEl = container.querySelector('.recharts-cartesian-grid');
    const gridRect = plotEl?.getBoundingClientRect();
    if (!plotEl || !gridRect || gridRect.width <= 0) {
      plotEl = null;
      const layers = container.querySelectorAll('.recharts-layer');
      let maxW = 0;
      layers.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width > maxW && r.width <= container.getBoundingClientRect().width) {
          maxW = r.width;
          plotEl = el;
        }
      });
    }
    if (!plotEl) plotEl = container.querySelector('svg');
    const rect = plotEl ? plotEl.getBoundingClientRect() : container.getBoundingClientRect();
    const xInPlot = clientX - rect.left;
    const plotWidth = rect.width;
    if (plotWidth <= 0) return null;
    const t = visibleMin + (xInPlot / plotWidth) * (visibleMax - visibleMin);
    return Math.max(dataMin, Math.min(dataMax, t));
  };

  const handleChartRangeMouseDown = (e) => {
    if (!chartDisplayData?.data?.length) return;
    const t = getTimestampFromClientX(e.clientX);
    if (t == null) return;
    if (zKeyHeld) {
      zoomBoxDragRef.current = { startTimestamp: t, endTimestamp: t };
      setZoomBox({ startTimestamp: t, endTimestamp: t });
      rangeSelectingRef.current = false;
    } else {
      rangeSelectingRef.current = true;
      setChartRangeSelection({ startTimestamp: t, endTimestamp: t });
      setChartRangeSelecting(true);
    }
  };

  const handleChartRangeMouseMove = (e) => {
    const isZoomDragging = zoomBoxDragRef.current.startTimestamp != null;
    const isRangeSelecting = rangeSelectingRef.current;
    if (isZoomDragging || isRangeSelecting) {
      const t = getTimestampFromClientX(e.clientX);
      if (t == null) return;
      if (isZoomDragging) {
        zoomBoxDragRef.current.endTimestamp = t;
        setZoomBox((prev) => {
          if (prev.startTimestamp == null) return prev;
          if (prev.endTimestamp === t) return prev;
          return { ...prev, endTimestamp: t };
        });
      } else {
        setChartRangeSelection((prev) => {
          if (prev.endTimestamp === t) return prev;
          return { ...prev, endTimestamp: t };
        });
      }
    } else {
      chartCursorRef.current = { clientX: e.clientX, clientY: e.clientY };
      const wrapper = chartTooltipWrapperRef.current;
      if (wrapper) {
        wrapper.style.left = `${e.clientX}px`;
        wrapper.style.top = `${e.clientY - 250}px`;
      }
    }
  };

  const handleChartRangeMouseUp = () => {
    rangeSelectingRef.current = false;
    if (zoomBoxDragRef.current.startTimestamp != null) {
      const { startTimestamp: s, endTimestamp: endTs } = zoomBoxDragRef.current;
      const data = chartDisplayData?.data;
      if (data?.length && s != null && endTs != null) {
        const lo = Math.min(s, endTs);
        const hi = Math.max(s, endTs);
        if (hi > lo) {
          const toLocalDateStr = (ts) => {
            const d = new Date(ts);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          };
          setZoomHistory((hist) => [...hist, zoomDomain]);
          setZoomDomain({ left: toLocalDateStr(lo), right: toLocalDateStr(hi) });
        }
      }
      zoomBoxDragRef.current = { startTimestamp: null, endTimestamp: null };
      setZoomBox({ startTimestamp: null, endTimestamp: null });
    }
    setChartRangeSelecting(false);
  };

  // Global mouse up to end drag when released outside chart (range selection or Z-drag zoom)
  // Defer setState to avoid triggering during React commit/effect phase (prevents update loop)
  useEffect(() => {
    const onUp = () => {
      const wasZoomDragging = zoomBoxDragRef.current.startTimestamp != null;
      const wasRangeSelecting = rangeSelectingRef.current;
      rangeSelectingRef.current = false;
      zoomBoxDragRef.current = { startTimestamp: null, endTimestamp: null };
      if (wasZoomDragging || wasRangeSelecting) {
        const tick = () => {
          if (wasZoomDragging) setZoomBox({ startTimestamp: null, endTimestamp: null });
          if (wasRangeSelecting) setChartRangeSelecting(false);
        };
        setTimeout(tick, 0);
      }
    };
    window.addEventListener('mouseup', onUp);
    return () => window.removeEventListener('mouseup', onUp);
  }, []);

  // Z key held: enable zoom mode (magnifying glass cursor, drag-to-zoom)
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== 'z' && e.key !== 'Z') return;
      const target = e.target;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) return;
      e.preventDefault();
      setZKeyHeld((prev) => (prev ? prev : true));
    };
    const onKeyUp = (e) => {
      if (e.key === 'z' || e.key === 'Z') {
        setZKeyHeld((prev) => (prev ? false : prev));
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
    };
  }, []);

  // Apply magnifying-glass cursor to body when Z is held (so it shows over chart/SVG)
  useEffect(() => {
    if (!zKeyHeld) return;
    const prev = document.body.style.cursor;
    document.body.style.cursor = 'zoom-in';
    return () => {
      document.body.style.cursor = prev || '';
    };
  }, [zKeyHeld]);

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


  const handleOpenForecastSettingsModal = () => {
    setTempSalesVelocityWeight(salesVelocityWeight);
    setTempSvVelocityWeight(svVelocityWeight);
    setTempForecastModel(forecastModel);
    setTempMarketAdjustment(marketAdjustment);
    setTempDoiSettings(doiSettings || { amazonDoiGoal: 130, inboundLeadTime: 30, manufactureLeadTime: 7 });
    setShowForecastSettingsModal(true);
    setShowForecastSettingsTooltip(false);
  };

  const calculateTotalDOI = (settings) => {
    return (parseInt(settings.amazonDoiGoal) || 0) + 
           (parseInt(settings.inboundLeadTime) || 0) + 
           (parseInt(settings.manufactureLeadTime) || 0);
  };

  const handleApplyForecastSettings = () => {
    // Check if user has previously checked "Don't remind me again"
    const dontRemind = localStorage.getItem('forecast_settings_dont_remind') === 'true';
    
    if (dontRemind) {
      // Apply directly without showing confirmation
      applyForecastSettingsTemporarily();
    } else {
      // Close forecast settings modal and show confirmation modal
      setShowForecastSettingsModal(false);
      setShowTemporaryConfirmModal(true);
    }
  };

  const applyForecastSettingsTemporarily = () => {
    setSalesVelocityWeight(tempSalesVelocityWeight);
    setSvVelocityWeight(tempSvVelocityWeight);
    setForecastModel(tempForecastModel);
    setMarketAdjustment(tempMarketAdjustment);
    // Apply DOI settings via callback
    if (onDoiSettingsChange) {
      onDoiSettingsChange(tempDoiSettings);
    }
    // Notify parent that forecast settings have been applied
    if (onForecastSettingsChange) {
      onForecastSettingsChange({
        salesVelocityWeight: tempSalesVelocityWeight,
        svVelocityWeight: tempSvVelocityWeight,
        forecastModel: tempForecastModel,
        marketAdjustment: tempMarketAdjustment
      });
    }
    setShowForecastSettingsModal(false);
    setShowTemporaryConfirmModal(false);
    setSettingsApplied(true);
    toast.success('Forecast settings applied', {
      description: `Model: ${tempForecastModel}, Market: ${tempMarketAdjustment}%, Sales Velocity: ${tempSalesVelocityWeight}%`
    });
  };

  const handleConfirmTemporaryApply = () => {
    // Save "Don't remind me again" preference if checked
    if (dontRemindAgain) {
      localStorage.setItem('forecast_settings_dont_remind', 'true');
    }
    applyForecastSettingsTemporarily();
    setDontRemindAgain(false); // Reset checkbox state
  };

  const handleGoBackFromConfirm = () => {
    setShowTemporaryConfirmModal(false);
    setDontRemindAgain(false); // Reset checkbox state
    // Reopen the forecast settings modal
    setShowForecastSettingsModal(true);
  };

  const handleCancelForecastSettings = () => {
    setTempSalesVelocityWeight(salesVelocityWeight);
    setTempSvVelocityWeight(svVelocityWeight);
    setTempForecastModel(forecastModel);
    setTempMarketAdjustment(marketAdjustment);
    setTempDoiSettings(doiSettings || { amazonDoiGoal: 130, inboundLeadTime: 30, manufactureLeadTime: 7 });
    setShowForecastSettingsModal(false);
  };

  const handleSaveForecastSettingsAsDefault = () => {
    setSalesVelocityWeight(tempSalesVelocityWeight);
    setSvVelocityWeight(tempSvVelocityWeight);
    setForecastModel(tempForecastModel);
    setMarketAdjustment(tempMarketAdjustment);
    // Save DOI settings to localStorage
    try {
      localStorage.setItem('doi_default_settings', JSON.stringify(tempDoiSettings));
      localStorage.setItem('forecast_default_settings', JSON.stringify({
        salesVelocityWeight: tempSalesVelocityWeight,
        svVelocityWeight: tempSvVelocityWeight,
        forecastModel: tempForecastModel,
        marketAdjustment: tempMarketAdjustment
      }));
    } catch (e) {
      console.error('Error saving forecast settings:', e);
    }
    // Apply DOI settings via callback
    if (onDoiSettingsChange) {
      onDoiSettingsChange(tempDoiSettings);
    }
    // Notify parent that forecast settings have been applied
    if (onForecastSettingsChange) {
      onForecastSettingsChange({
        salesVelocityWeight: tempSalesVelocityWeight,
        svVelocityWeight: tempSvVelocityWeight,
        forecastModel: tempForecastModel,
        marketAdjustment: tempMarketAdjustment
      });
    }
    setShowForecastSettingsModal(false);
    toast.success('Forecast settings saved as default');
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
      const allDates = (chartDisplayData?.data || []).map(d => new Date(d.date).getTime()).sort((a, b) => a - b);
      
      // Find the index of clicked date
      const clickedIndex = allDates.findIndex(d => Math.abs(d - clickedDate.getTime()) < 1000 * 60 * 60 * 24 * 7);
      
      if (clickedIndex !== -1) {
        // Zoom to show ±4 weeks around clicked date (8 weeks total)
        const zoomRange = 4;
        const startIndex = Math.max(0, clickedIndex - zoomRange);
        const endIndex = Math.min(allDates.length - 1, clickedIndex + zoomRange);
        
        const startDate = new Date(allDates[startIndex]);
        const endDate = new Date(allDates[endIndex]);
        
        const newDomain = {
          left: startDate.toISOString().split('T')[0],
          right: endDate.toISOString().split('T')[0]
        };
        setZoomHistory((hist) => [...hist, zoomDomain]);
        setZoomDomain(newDomain);
      }
    }
    
    setLastClickTime(currentTime);
  };

  // Custom tooltip: date, DOI zone name, days from today, and metric values (for turning-point read)
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const date = new Date(label);
    const todayTs = new Date().setHours(0, 0, 0, 0);
    const labelTs = new Date(label).setHours(0, 0, 0, 0);
    const daysFromToday = Math.round((labelTs - todayTs) / (1000 * 60 * 60 * 24));

    let zoneName = '';
    let zoneColor = '#94a3b8';
    let zoneIcon = '';

    if (forecastData) {
      const fbaD = forecastData?.doi_fba ?? forecastData?.fba_days ?? 0;
      const totalD = forecastData?.doi_total ?? forecastData?.total_days ?? 0;
      const dailyVel = forecastData?.daily_velocity ?? forecastData?.velocity_daily ?? 1;
      const unitsToMake = forecastData?.units_to_make ?? 0;
      const forecastDays = dailyVel > 0 ? Math.round(unitsToMake / dailyVel) : 0;
      const forecastD = totalD + forecastDays;

      if (daysFromToday < 0) {
        zoneName = 'Historical';
        zoneColor = '#6b7280';
        zoneIcon = '📊';
      } else if (daysFromToday <= fbaD) {
        zoneName = 'FBA Available';
        zoneColor = '#a855f7';
        zoneIcon = '🟣';
      } else if (daysFromToday <= totalD) {
        zoneName = 'Total Inventory';
        zoneColor = '#10b981';
        zoneIcon = '🟢';
      } else if (daysFromToday <= forecastD) {
        zoneName = 'Forecast Period';
        zoneColor = '#3b82f6';
        zoneIcon = '🔵';
      } else {
        zoneName = 'Beyond Forecast';
        zoneColor = '#64748b';
        zoneIcon = '⚪';
      }
    }

    const daysLabel = daysFromToday < 0
      ? `${Math.abs(daysFromToday)} days ago`
      : daysFromToday === 0
        ? 'Today'
        : `${daysFromToday} days from today`;

    return (
      <div style={{
        backgroundColor: '#1e293b',
        padding: '0.75rem',
        borderRadius: '0.5rem',
        border: '1px solid #334155',
        fontSize: '0.875rem',
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        minWidth: '180px'
      }}>
        <p style={{ color: '#fff', fontWeight: '600', marginBottom: '0.25rem', fontSize: '0.875rem' }}>
          {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
        {zoneName && (
          <p style={{ color: zoneColor, fontWeight: '600', marginBottom: '0.25rem', fontSize: '0.8rem' }}>
            {zoneIcon} {zoneName}
          </p>
        )}
        <p style={{ color: '#94a3b8', marginBottom: '0.5rem', fontSize: '0.75rem' }}>
          {daysLabel}
        </p>
        <div style={{ borderTop: '1px solid #334155', paddingTop: '0.5rem', marginTop: '0.25rem' }} />
        {payload.map((entry, index) => {
          if (entry.value == null || entry.value === '') return null;
          const display = typeof entry.value === 'number' ? Math.round(entry.value).toLocaleString() : String(entry.value);
          return (
            <p key={index} style={{ color: entry.color || '#fff', margin: '0.2rem 0', fontSize: '0.75rem', fontWeight: '500' }}>
              {entry.name}: <span style={{ color: '#fff', fontWeight: '600' }}>{display}</span>
            </p>
          );
        })}
      </div>
    );
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
    <div 
      className={`${themeClasses.bg} rounded-xl border ${themeClasses.border} shadow-sm`} 
      style={{ 
        width: inventoryOnly ? '100%' : '100%', 
        maxWidth: inventoryOnly ? '100%' : 'none', 
        margin: inventoryOnly ? '0' : '0 auto',
        backgroundColor: '#1A2235',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0
      }}
    >
      {/* Tab Navigation - Hidden when inventoryOnly is true */}
      {!inventoryOnly && (
        <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid #334155', backgroundColor: '#1A2235' }}>
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
        <div style={{ backgroundColor: '#1A2235', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
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
                <button 
                type="button"
                disabled={isAlreadyAdded}
                  onClick={() => {
                  if (onAddUnits && !isAlreadyAdded) {
                      const sizeForIncrement = productDetails?.product?.size || data?.size || data?.variations?.[0] || '';
                      const increment = getQtyIncrementForSize(sizeForIncrement);
                      const rawUnitsToAdd = overrideUnitsToMake ?? forecastData?.units_to_make ?? 0;
                      const numUnits = typeof rawUnitsToAdd === 'number' ? rawUnitsToAdd : parseInt(rawUnitsToAdd, 10);
                      const unitsToAdd =
                        numUnits && !Number.isNaN(numUnits) && increment && increment > 1
                          ? Math.ceil(numUnits / increment) * increment
                          : numUnits || 0;
                      onAddUnits(unitsToAdd);
                    }
                  }}
                  className="px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: isAlreadyAdded ? '#059669' : '#3B82F6',
                    color: '#FFFFFF',
                    cursor: isAlreadyAdded ? 'default' : 'pointer',
                    opacity: isAlreadyAdded ? 0.9 : 1,
                  }}
                >
                  {isAlreadyAdded ? (
                    'Added'
                  ) : (
                    <>
                      Add Units ({(() => {
                        const sizeForIncrement = productDetails?.product?.size || data?.size || data?.variations?.[0] || '';
                        const increment = getQtyIncrementForSize(sizeForIncrement);
                        const rawUnitsToAdd = overrideUnitsToMake ?? forecastData?.units_to_make ?? 0;
                        const numUnits = typeof rawUnitsToAdd === 'number' ? rawUnitsToAdd : parseInt(rawUnitsToAdd, 10);
                        const unitsToAdd =
                          numUnits && !Number.isNaN(numUnits) && increment && increment > 1
                            ? Math.ceil(numUnits / increment) * increment
                            : numUnits || 0;
                        return unitsToAdd;
                      })().toLocaleString()})
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content - More compact padding when inventoryOnly */}
      <div className={inventoryOnly ? "" : "px-6 pb-6"} style={{ 
        padding: inventoryOnly ? '0.5rem clamp(0.75rem, 2vw, 1.5rem)' : '1.5rem', 
        backgroundColor: '#1A2235',
        overflow: 'auto',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0
      }}>
        {/* Tabs and Add Units Button - Only show in inventoryOnly mode */}
        {inventoryOnly && (
            <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            marginBottom: '1rem', 
            marginTop: '0.9375rem'
          }}>
          <div style={{ 
            display: 'flex', 
            gap: '0.25rem',
            backgroundColor: '#0f172a',
            borderRadius: '0.5rem',
            padding: '4px',
            width: '325px',
            height: '32px',
            border: '1px solid #334155',
            alignItems: 'center',
            boxSizing: 'border-box'
          }}>
            <button
              onClick={() => setActiveTab('forecast')}
              style={{
                padding: '0',
                fontSize: '1rem',
                fontWeight: '500',
                color: activeTab === 'forecast' ? '#fff' : '#94a3b8',
                backgroundColor: activeTab === 'forecast' ? '#2563EB' : 'transparent',
                border: 'none',
                borderRadius: '0.25rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                flex: 1,
                height: '23px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              Inventory
            </button>
            <button
              onClick={() => setActiveTab('sales')}
              style={{
                padding: '0',
                fontSize: '1rem',
                fontWeight: '500',
                color: activeTab === 'sales' ? '#fff' : '#94a3b8',
                backgroundColor: activeTab === 'sales' ? '#2563EB' : 'transparent',
                border: 'none',
                borderRadius: '0.25rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                flex: 1,
                height: '23px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              Sales
            </button>
            <button
              onClick={() => setActiveTab('ads')}
              style={{
                padding: '0',
                fontSize: '1rem',
                fontWeight: '500',
                color: activeTab === 'ads' ? '#fff' : '#94a3b8',
                backgroundColor: activeTab === 'ads' ? '#2563EB' : 'transparent',
                border: 'none',
                borderRadius: '0.25rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                flex: 1,
                height: '23px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              Ads
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative' }}>
              {/* Units Display Field */}
              <div style={{
                position: 'relative',
                padding: '4px 12px',
                borderRadius: '4px',
                border: `1px solid ${isDarkMode ? '#374151' : '#D1D5DB'}`,
                backgroundColor: isDarkMode ? '#1F2937' : '#F3F4F6',
                color: isDarkMode ? '#9CA3AF' : '#6B7280',
                fontSize: '0.875rem',
                fontWeight: 500,
                height: '23px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '80px',
                boxSizing: 'border-box',
              }}>
                {(() => {
                  const sizeForIncrement = productDetails?.product?.size || data?.size || data?.variations?.[0] || '';
                  const increment = getQtyIncrementForSize(sizeForIncrement);
                  const rawUnitsToAdd = overrideUnitsToMake ?? forecastData?.units_to_make ?? 0;
                  const numUnits = typeof rawUnitsToAdd === 'number' ? rawUnitsToAdd : parseInt(rawUnitsToAdd, 10);
                  const units =
                    numUnits && !Number.isNaN(numUnits) && increment && increment > 1
                      ? Math.ceil(numUnits / increment) * increment
                      : numUnits || 0;
                  return units.toLocaleString();
                })()}
                
                {/* Label warning icon - shown when units exceed labels available */}
                {(() => {
                  const sizeForIncrement = productDetails?.product?.size || data?.size || data?.variations?.[0] || '';
                  const increment = getQtyIncrementForSize(sizeForIncrement);
                  const rawUnitsToAdd = overrideUnitsToMake ?? forecastData?.units_to_make ?? 0;
                  const numUnits = typeof rawUnitsToAdd === 'number' ? rawUnitsToAdd : parseInt(rawUnitsToAdd, 10);
                  const unitsNeeded =
                    numUnits && !Number.isNaN(numUnits) && increment && increment > 1
                      ? Math.ceil(numUnits / increment) * increment
                      : numUnits || 0;
                  const availableLabels = labelsAvailable ?? 0;
                  // Only show warning if units needed exceed available labels
                  if (unitsNeeded > availableLabels && unitsNeeded > 0 && availableLabels !== null) {
                    return (
                      <>
                        <span
                          onMouseEnter={() => setHoveredWarning(true)}
                          onMouseLeave={() => setHoveredWarning(false)}
                          style={{
                            position: 'absolute',
                            left: '-22px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            backgroundColor: '#FEE2E2',
                            color: '#DC2626',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            zIndex: 10,
                          }}
                        >
                          !
                        </span>
                        {/* Custom tooltip for warning icon */}
                        {hoveredWarning && (
                          <div
                            style={{
                              position: 'absolute',
                              left: '-22px',
                              top: '50%',
                              transform: 'translate(calc(-100% - 8px + 80px), calc(-50% - 25px))',
                              backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                              color: isDarkMode ? '#E5E7EB' : '#111827',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 500,
                              whiteSpace: 'nowrap',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                              border: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
                              zIndex: 11,
                              pointerEvents: 'none',
                            }}
                          >
                            Labels Available: {availableLabels.toLocaleString()}
                          </div>
                        )}
                      </>
                    );
                  }
                  return null;
                })()}
              </div>
              
              {/* Add Button */}
              <button
                type="button"
                disabled={isAlreadyAdded}
                onClick={() => {
                  if (onAddUnits && !isAlreadyAdded) {
                    const sizeForIncrement = productDetails?.product?.size || data?.size || data?.variations?.[0] || '';
                    const increment = getQtyIncrementForSize(sizeForIncrement);
                    const rawUnitsToAdd = overrideUnitsToMake ?? forecastData?.units_to_make ?? 0;
                    const numUnits = typeof rawUnitsToAdd === 'number' ? rawUnitsToAdd : parseInt(rawUnitsToAdd, 10);
                    const unitsToAdd =
                      numUnits && !Number.isNaN(numUnits) && increment && increment > 1
                        ? Math.ceil(numUnits / increment) * increment
                        : numUnits || 0;
                    console.log('Add Units clicked:', {
                      unitsToAdd,
                      overrideUnitsToMake,
                      forecastUnitsToMake: forecastData?.units_to_make,
                      labelsAvailable
                    });
                    onAddUnits(unitsToAdd);
                  }
                }}
                style={{
                  padding: '4px 12px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: isAlreadyAdded ? '#059669' : '#2563EB',
                  color: '#FFFFFF',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  height: '23px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                  cursor: isAlreadyAdded ? 'default' : 'pointer',
                  boxSizing: 'border-box',
                  opacity: isAlreadyAdded ? 0.9 : 1,
                }}
              >
                {isAlreadyAdded ? (
                  <span>Added</span>
                ) : (
                  <>
                    <span style={{ fontSize: '1rem', lineHeight: 1 }}>+</span>
                    <span>Add</span>
                  </>
                )}
              </button>
            </div>
          </div>
          </div>
        )}
        
        {/* Main Grid - Horizontal layout when inventoryOnly */}
        <div style={{ 
          display: 'flex', 
          gap: inventoryOnly ? '1rem' : '1.5rem', 
          marginBottom: inventoryOnly ? '0.75rem' : '2rem',
          justifyContent: 'space-between',
          flexWrap: inventoryOnly ? 'nowrap' : 'wrap'
        }}>
          {/* Left: Product Info */}
          <div className={themeClasses.cardBg} style={{ 
            borderRadius: '0.5rem', 
            padding: inventoryOnly ? '1rem 3rem 1rem 1rem' : '1.5rem',
            minWidth: inventoryOnly ? '300px' : 'auto',
            flex: inventoryOnly ? '1 1 48%' : '1',
            maxWidth: inventoryOnly ? '488px' : 'auto',
            height: inventoryOnly ? '160px' : 'auto',
            border: '1px solid #334155',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ 
                width: inventoryOnly ? '128px' : '80px', 
                height: inventoryOnly ? '128px' : '120px', 
                backgroundColor: '#fff', 
                borderRadius: '0.5rem', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                overflow: 'hidden',
                flexShrink: 0
              }}>
                {(data?.mainImage || data?.product_image_url || data?.productImage || data?.image || data?.productImageUrl) ? (
                  <img 
                    src={data?.mainImage || data?.product_image_url || data?.productImage || data?.image || data?.productImageUrl} 
                    alt={data?.product || data?.product_name || 'Product'} 
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} 
                  />
                ) : (
                  <svg style={{ width: inventoryOnly ? '2rem' : '3rem', height: inventoryOnly ? '2rem' : '3rem', color: '#9ca3af' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <h3 style={{ 
                  fontSize: inventoryOnly ? '1.125rem' : '1.125rem', 
                  fontWeight: '600', 
                  color: '#fff', 
                  lineHeight: 1.3,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  margin: 0
                }}>
                  {productDetails?.product?.name || data?.product || 'Product Name'}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ fontSize: inventoryOnly ? '0.875rem' : '0.875rem', color: '#94a3b8' }}>
                    <span style={{ fontWeight: 500 }}>SIZE:</span> <span style={{ color: '#fff' }}>{productDetails?.product?.size || data?.size || data?.variations?.[0] || 'N/A'}</span>
                  </div>
                  <div style={{ fontSize: inventoryOnly ? '0.875rem' : '0.875rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 500 }}>ASIN:</span> 
                    <span style={{ color: '#fff' }}>{productDetails?.product?.asin || data?.child_asin || data?.childAsin || 'N/A'}</span>
                    {(productDetails?.product?.asin || data?.child_asin || data?.childAsin) && (
                      <img 
                        src="/assets/copyy.png" 
                        alt="Copy" 
                        onClick={async (e) => {
                          e.stopPropagation();
                          const asinToCopy = productDetails?.product?.asin || data?.child_asin || data?.childAsin;
                          try {
                            // Try modern clipboard API first
                            if (navigator.clipboard && navigator.clipboard.writeText) {
                              await navigator.clipboard.writeText(asinToCopy);
                            } else {
                              // Fallback for non-secure contexts or older browsers
                              const textArea = document.createElement('textarea');
                              textArea.value = asinToCopy;
                              textArea.style.position = 'fixed';
                              textArea.style.left = '-999999px';
                              textArea.style.top = '-999999px';
                              document.body.appendChild(textArea);
                              textArea.focus();
                              textArea.select();
                              try {
                                document.execCommand('copy');
                              } finally {
                                document.body.removeChild(textArea);
                              }
                            }
                            toast.success('ASIN copied to clipboard', {
                              description: asinToCopy,
                              duration: 2000,
                            });
                          } catch (err) {
                            console.error('Failed to copy ASIN:', err);
                            toast.error('Failed to copy ASIN', {
                              description: 'Please try again',
                              duration: 2000,
                            });
                          }
                        }}
                        style={{ width: '14px', height: '14px', cursor: 'pointer', flexShrink: 0 }} 
                      />
                    )}
                  </div>
                  <div style={{ fontSize: inventoryOnly ? '0.875rem' : '0.875rem', color: '#94a3b8' }}>
                    <span style={{ fontWeight: 500 }}>BRAND:</span> <span style={{ color: '#fff' }}>{productDetails?.product?.brand || data?.brand || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* FBA Card */}
          <div className={themeClasses.cardBg} style={{ 
            borderRadius: '0.5rem', 
            padding: '1rem', 
            minWidth: inventoryOnly ? '180px' : 'auto',
            flex: inventoryOnly ? '1 1 22%' : '1',
            maxWidth: inventoryOnly ? '220px' : 'auto',
            height: inventoryOnly ? '160px' : 'auto',
            border: '1px solid #334155',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: inventoryOnly ? '0.7rem' : '0.875rem', color: '#94a3b8' }}>Total FBA:</span>
                <span style={{ fontSize: inventoryOnly ? '0.7rem' : '0.875rem', fontWeight: '600', color: '#fff' }}>{inventoryData.fba.total}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: inventoryOnly ? '0.7rem' : '0.875rem', color: '#94a3b8' }}>Available:</span>
                <span style={{ fontSize: inventoryOnly ? '0.7rem' : '0.875rem', fontWeight: '600', color: '#fff' }}>{inventoryData.fba.available}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: inventoryOnly ? '0.7rem' : '0.875rem', color: '#94a3b8' }}>Inbound:</span>
                <span style={{ fontSize: inventoryOnly ? '0.7rem' : '0.875rem', fontWeight: '600', color: '#fff' }}>{inventoryData.fba.inbound}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: inventoryOnly ? '0.7rem' : '0.875rem', color: '#94a3b8' }}>Reserved:</span>
                <span style={{ fontSize: inventoryOnly ? '0.7rem' : '0.875rem', fontWeight: '600', color: '#fff' }}>{inventoryData.fba.reserved}</span>
              </div>
            </div>
          </div>

          {/* AWD Card */}
          <div className={themeClasses.cardBg} style={{ 
            borderRadius: '0.5rem', 
            padding: '1rem', 
            minWidth: inventoryOnly ? '180px' : 'auto',
            flex: inventoryOnly ? '1 1 22%' : '1',
            maxWidth: inventoryOnly ? '220px' : 'auto',
            height: inventoryOnly ? '160px' : 'auto',
            border: '1px solid #334155',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: inventoryOnly ? '0.7rem' : '0.875rem', color: '#94a3b8' }}>Total AWD:</span>
                <span style={{ fontSize: inventoryOnly ? '0.7rem' : '0.875rem', fontWeight: '600', color: '#fff' }}>{inventoryData.awd.total}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: inventoryOnly ? '0.7rem' : '0.875rem', color: '#94a3b8' }}>Available:</span>
                <span style={{ fontSize: inventoryOnly ? '0.7rem' : '0.875rem', fontWeight: '600', color: '#fff' }}>{inventoryData.awd.available}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: inventoryOnly ? '0.7rem' : '0.875rem', color: '#94a3b8' }}>Inbound:</span>
                <span style={{ fontSize: inventoryOnly ? '0.7rem' : '0.875rem', fontWeight: '600', color: '#fff' }}>{inventoryData.awd.inbound || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: inventoryOnly ? '0.7rem' : '0.875rem', color: '#94a3b8' }}>Reserved:</span>
                <span style={{ fontSize: inventoryOnly ? '0.7rem' : '0.875rem', fontWeight: '600', color: '#fff' }}>{inventoryData.awd.reserved}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: inventoryOnly ? '0.7rem' : '0.875rem', color: '#94a3b8' }}>Outbound:</span>
                <span style={{ fontSize: inventoryOnly ? '0.7rem' : '0.875rem', fontWeight: '600', color: '#fff' }}>{inventoryData.awd.outbound_to_fba || 0}</span>
              </div>
            </div>
            </div>
        </div>

        {/* Three Metric Cards - FBA Available, Total Inventory, Forecast */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: inventoryOnly ? 'repeat(auto-fit, minmax(200px, 1fr))' : '1fr 1fr 1fr', 
          gap: inventoryOnly ? '0.75rem' : '1.5rem', 
          marginBottom: inventoryOnly ? '0.75rem' : '2rem' 
        }}>
          {/* FBA Available Card */}
          <div style={{ 
            borderRadius: '0.5rem', 
            padding: inventoryOnly ? '0.75rem 1rem' : '1rem 1.25rem',
            backgroundColor: '#0f172a',
            borderTop: '3px solid #a855f7',
            position: 'relative',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ 
              fontSize: inventoryOnly ? '0.75rem' : '0.85rem', 
              color: '#a855f7', 
              marginBottom: inventoryOnly ? '0.25rem' : '0.35rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'baseline',
              gap: '0.35rem'
            }}>
              <span>FBA Available</span>
              <span style={{ 
                fontSize: inventoryOnly ? '0.65rem' : '0.75rem',
                color: '#94a3b8',
                fontWeight: 400
              }}>
                ({inventoryData.fba.available || 0} units)
              </span>
            </div>
            <div style={{ 
              fontSize: inventoryOnly ? '1.75rem' : '2rem', 
              fontWeight: '700', 
              color: '#fff',
              lineHeight: 1,
              marginBottom: inventoryOnly ? '0.15rem' : '0.25rem'
            }}>
              {timeline.fbaAvailable}
            </div>
            <div style={{ 
              fontSize: inventoryOnly ? '0.75rem' : '0.85rem', 
              color: '#94a3b8',
              fontWeight: 500
            }}>
              days
            </div>
          </div>

          {/* Total Inventory Card */}
          <div style={{ 
            borderRadius: '0.5rem', 
            padding: inventoryOnly ? '0.75rem 1rem' : '1rem 1.25rem',
            backgroundColor: '#0f172a',
            borderTop: '3px solid #22c55e',
            position: 'relative',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ 
              fontSize: inventoryOnly ? '0.75rem' : '0.85rem', 
              color: '#22c55e', 
              marginBottom: inventoryOnly ? '0.25rem' : '0.35rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'baseline',
              gap: '0.35rem'
            }}>
              <span>Total Inventory</span>
              <span style={{ 
                fontSize: inventoryOnly ? '0.65rem' : '0.75rem',
                color: '#94a3b8',
                fontWeight: 400
              }}>
                ({(inventoryData.fba.total + inventoryData.awd.total) || 0} units)
              </span>
            </div>
            <div style={{ 
              fontSize: inventoryOnly ? '1.75rem' : '2rem', 
              fontWeight: '700', 
              color: '#fff',
              lineHeight: 1,
              marginBottom: inventoryOnly ? '0.15rem' : '0.25rem'
            }}>
              {timeline.totalDays}
            </div>
            <div style={{ 
              fontSize: inventoryOnly ? '0.75rem' : '0.85rem', 
              color: '#94a3b8',
              fontWeight: 500
            }}>
              days
            </div>
          </div>

          {/* Forecast Card */}
          <div style={{ 
            borderRadius: '0.5rem', 
            padding: inventoryOnly ? '0.75rem 1rem' : '1rem 1.25rem',
            backgroundColor: '#0f172a',
            borderTop: '3px solid #3b82f6',
            position: 'relative',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ 
              fontSize: inventoryOnly ? '0.75rem' : '0.85rem', 
              color: '#3b82f6', 
              marginBottom: inventoryOnly ? '0.25rem' : '0.35rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'baseline',
              gap: '0.35rem'
            }}>
              <span>Forecast</span>
              <span style={{ 
                fontSize: inventoryOnly ? '0.65rem' : '0.75rem',
                color: '#94a3b8',
                fontWeight: 400
              }}>
                ({(overrideUnitsToMake ?? forecastData?.units_to_make ?? 0).toLocaleString()} units)
              </span>
            </div>
            <div style={{ 
              fontSize: inventoryOnly ? '1.75rem' : '2rem', 
              fontWeight: '700', 
              color: '#fff',
              lineHeight: 1,
              marginBottom: inventoryOnly ? '0.15rem' : '0.25rem'
            }}>
              {(() => {
                const totalDoiDays = doiGoalDays || (doiSettings ? 
                  (doiSettings.amazonDoiGoal + doiSettings.inboundLeadTime + doiSettings.manufactureLeadTime) : 
                  130);
                return totalDoiDays;
              })()}
            </div>
            <div style={{ 
              fontSize: inventoryOnly ? '0.75rem' : '0.85rem', 
              color: '#94a3b8',
              fontWeight: 500
            }}>
              days
            </div>
          </div>
        </div>

        {/* Unit Forecast Chart - Compact when inventoryOnly */}
        <div className={themeClasses.cardBg} style={{ 
          borderRadius: '0.75rem', 
          padding: '1rem', 
          border: '1px solid #334155',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: inventoryOnly ? '0.85rem' : '1rem', fontWeight: '600', color: '#fff', marginBottom: '0.25rem' }}>Unit Forecast</h3>
              <p style={{ fontSize: inventoryOnly ? '0.75rem' : '0.875rem', color: '#94a3b8' }}>
                {productDetails?.product?.size || data?.size || data?.variations?.[0] || '8oz'} Forecast
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <div 
                style={{ 
                  position: 'relative',
                  display: 'inline-block'
                }}
                onMouseEnter={() => {
                  // Don't show forecast settings tooltip if indicator tooltip is showing
                  if (!showIndicatorTooltip) {
                    setShowForecastSettingsTooltip(true);
                  }
                }}
                onMouseLeave={() => setShowForecastSettingsTooltip(false)}
              >
                <button 
                  title="Forecast Settings"
                  style={{ 
                    padding: '0.5rem', 
                    color: '#94a3b8', 
                    backgroundColor: showForecastSettingsTooltip ? 'rgba(59, 130, 246, 0.1)' : 'transparent', 
                    border: 'none', 
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <img 
                    src="/assets/Vector.png" 
                    alt="Settings" 
                    style={{ width: '20px', height: '20px' }}
                  />
                </button>
                {(settingsApplied || hasActiveForecastSettings) && (
                  <div
                    data-indicator-icon
                    style={{
                      position: 'absolute',
                      top: '-7px',
                      right: '-4px',
                      width: '16px',
                      height: '16px',
                      zIndex: 10,
                    }}
                    onMouseEnter={(e) => {
                      e.stopPropagation();
                      setShowIndicatorTooltip(true);
                      setShowForecastSettingsTooltip(false);
                    }}
                  >
                    <div
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        backgroundColor: '#3B82F6',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <svg
                        width="8"
                        height="10"
                        viewBox="0 0 8 10"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <rect
                          x="3.5"
                          y="1"
                          width="1"
                          height="5"
                          fill="white"
                          rx="0.5"
                        />
                        <circle
                          cx="4"
                          cy="8"
                          r="1"
                          fill="white"
                        />
                      </svg>
                    </div>
                    {showIndicatorTooltip && (
                      <>
                        {/* Invisible bridge to keep tooltip visible when moving mouse up */}
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '100%',
                            right: '50%',
                            transform: 'translateX(-50%)',
                            width: '250px',
                            height: '8px',
                            pointerEvents: 'auto',
                            zIndex: 999,
                          }}
                          onMouseEnter={(e) => {
                            e.stopPropagation();
                            setShowIndicatorTooltip(true);
                            setShowForecastSettingsTooltip(false);
                          }}
                          onMouseLeave={(e) => {
                            e.stopPropagation();
                            setShowIndicatorTooltip(false);
                          }}
                        />
                        <div
                          onMouseEnter={(e) => {
                            e.stopPropagation();
                            setShowIndicatorTooltip(true);
                            setShowForecastSettingsTooltip(false);
                          }}
                          onMouseLeave={(e) => {
                            e.stopPropagation();
                            setShowIndicatorTooltip(false);
                          }}
                          style={{
                            position: 'absolute',
                            bottom: 'calc(100% + 8px)',
                            right: '50%',
                            transform: 'translateX(50%)',
                            backgroundColor: '#0F172A',
                            borderRadius: '8px',
                            padding: '12px',
                            minWidth: '210px',
                            maxWidth: '250px',
                            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
                            zIndex: 1000,
                            border: '1px solid #1F2937',
                            pointerEvents: 'auto',
                          }}
                        >
                        {/* Text */}
                        <p style={{
                          fontSize: '0.875rem',
                          color: '#F8F8F8',
                          margin: 0,
                          marginBottom: '10px',
                          lineHeight: '1.4',
                          textAlign: 'center',
                        }}>
                          This product has custom<br />forecast settings
                        </p>
                        
                        {/* Reset Button */}
                        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                          <button
                          onClick={() => {
                            try {
                              // Clear custom product-specific settings by passing null
                              // This removes the custom settings and makes the pencil icon inactive
                              if (onDoiSettingsChange) {
                                onDoiSettingsChange(null);
                              }
                              if (onForecastSettingsChange) {
                                onForecastSettingsChange(null);
                              }
                              
                              // Get global DOI settings from localStorage for local state
                              const globalDoiSettings = JSON.parse(localStorage.getItem('doi_default_settings') || '{}');
                              // Get global forecast settings from localStorage for local state
                              const globalForecastSettings = JSON.parse(localStorage.getItem('forecast_default_settings') || '{}');
                              
                              // Reset DOI settings to global defaults (for local display only)
                              if (Object.keys(globalDoiSettings).length > 0) {
                                setTempDoiSettings(globalDoiSettings);
                              } else {
                                setTempDoiSettings({ amazonDoiGoal: 130, inboundLeadTime: 30, manufactureLeadTime: 7 });
                              }
                              
                              // Reset forecast settings to global defaults (for local display only)
                              if (Object.keys(globalForecastSettings).length > 0) {
                                const {
                                  salesVelocityWeight: defaultSalesVelocityWeight = 25,
                                  svVelocityWeight: defaultSvVelocityWeight = 15,
                                  forecastModel: defaultForecastModel = 'Growing',
                                  marketAdjustment: defaultMarketAdjustment = 5.0
                                } = globalForecastSettings;
                                
                                // Reset all forecast settings state
                                setSalesVelocityWeight(defaultSalesVelocityWeight);
                                setSvVelocityWeight(defaultSvVelocityWeight);
                                setForecastModel(defaultForecastModel);
                                setMarketAdjustment(defaultMarketAdjustment);
                                setTempSalesVelocityWeight(defaultSalesVelocityWeight);
                                setTempSvVelocityWeight(defaultSvVelocityWeight);
                                setTempForecastModel(defaultForecastModel);
                                setTempMarketAdjustment(defaultMarketAdjustment);
                              } else {
                                // If no global forecast settings, reset to defaults
                                setSalesVelocityWeight(25);
                                setSvVelocityWeight(15);
                                setForecastModel('Growing');
                                setMarketAdjustment(5.0);
                                setTempSalesVelocityWeight(25);
                                setTempSvVelocityWeight(15);
                                setTempForecastModel('Growing');
                                setTempMarketAdjustment(5.0);
                              }
                              
                              setSettingsApplied(false);
                              setShowIndicatorTooltip(false);
                              toast.success('Reset to global settings');
                            } catch (e) {
                              console.error('Error loading global settings:', e);
                            }
                          }}
                          style={{
                            width: 'auto',
                            height: '24px',
                            padding: '0 12px',
                            borderRadius: '4px',
                            border: 'none',
                            backgroundColor: '#007BFF',
                            color: '#FFFFFF',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px',
                            transition: 'background-color 0.2s',
                            boxSizing: 'border-box',
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#0056B3'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#007BFF'}
                        >
                          <img 
                            src="/assets/Icon=Reset.png" 
                            alt="Reset" 
                            style={{ 
                              width: '16px', 
                              height: '16px',
                              filter: 'brightness(0) invert(1)'
                            }}
                          />
                          <span>
                            Reset
                          </span>
                          </button>
                        </div>
                        
                        {/* Caret - centered at bottom */}
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '-6px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: 0,
                            height: 0,
                            borderLeft: '6px solid transparent',
                            borderRight: '6px solid transparent',
                            borderTop: '6px solid #0F172A',
                          }}
                        />
                      </div>
                      </>
                    )}
                  </div>
                )}
                {showForecastSettingsTooltip && (
                  <>
                    {/* Invisible bridge to keep tooltip visible when moving mouse down */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '120px',
                        height: '8px',
                        pointerEvents: 'auto',
                      }}
                    />
                    <div
                      onClick={handleOpenForecastSettingsModal}
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        backgroundColor: '#1A1F2E',
                        color: '#E5E7EB',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                        zIndex: 1000,
                        cursor: 'pointer',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
                        transition: 'background-color 0.2s',
                        pointerEvents: 'auto',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#2563EB';
                        setShowForecastSettingsTooltip(true);
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#1A1F2E';
                      }}
                    >
                      Forecast Settings
                    </div>
                  </>
                )}
              </div>
              <select 
                value={selectedView}
                onChange={(e) => setSelectedView(e.target.value)}
                style={{ 
                  padding: '0 0.625rem', 
                  paddingRight: '1.75rem',
                  borderRadius: '0.25rem', 
                  backgroundColor: '#1A1F2E', 
                  color: '#fff',
                  border: '1px solid #2D3748',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M3 5L6 8L9 5' stroke='%23ffffff' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0.5rem center',
                  backgroundSize: '12px',
                  width: '91px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <option value="1 Year">1 Year</option>
                <option value="2 Years">2 Years</option>
                <option value="3 Years">3 Years</option>
              </select>
              {(zoomDomain.left != null || zoomDomain.right != null) && (
                <button
                  type="button"
                  onClick={handleZoomReset}
                  style={{
                    marginLeft: '0.5rem',
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.75rem',
                    color: '#94a3b8',
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid #475569',
                    borderRadius: '0.25rem',
                    cursor: 'pointer',
                    fontWeight: 500
                  }}
                  title={zoomHistory.length > 0 ? 'Return to previous zoom level' : 'Return to full view'}
                >
                  Reset zoom
                </button>
              )}
            </div>
          </div>


          {/* Chart Area - Hold Z and drag to zoom; drag without Z to sum Units Sold / Units Sold Smoothed. */}
          <div
            ref={chartContainerRef}
            style={{
              height: inventoryOnly ? 188 : 420,
              width: '100%',
              marginTop: '0.25rem',
              position: 'relative',
              cursor: zoomBox.startTimestamp != null
                ? 'zoom-in'
                : zKeyHeld
                  ? 'zoom-in'
                  : chartRangeSelecting
                    ? 'col-resize'
                    : 'crosshair'
            }}
            onMouseDown={handleChartRangeMouseDown}
            onMouseMove={handleChartRangeMouseMove}
            onMouseUp={handleChartRangeMouseUp}
            onMouseLeave={(e) => { chartCursorRef.current = null; handleChartRangeMouseUp(e); }}
          >
            {/* 
              ENHANCED CHART RENDERING
              Using Recharts ReferenceArea and ReferenceLine for better integration
              Colored backgrounds and Today marker are now rendered inside the chart
            */}
            
            {chartDataForDisplay.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                  data={chartDataForDisplay}
                  margin={{ top: 20, right: 20, left: 0, bottom: 20 }}
                  style={{ backgroundColor: 'transparent' }}
                >
                  <defs>
                    <linearGradient id="unitsSoldGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6b7280" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6b7280" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  {/* Base grid (no horizontal lines; we draw them via ReferenceLine below) */}
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="#111827" 
                    vertical={false} 
                    horizontal={false}
                    strokeWidth={1}
                  />
                  
                  <XAxis 
                    dataKey="timestamp"
                    type="number"
                    scale="time"
                    domain={chartXDomainWhenZoomed ?? ['dataMin', 'dataMax']}
                    axisLine={false}
                    tickLine={false}
                    // Brighter tick color + extra margin so dates are always visible
                    tick={{ fill: '#e5e7eb', fontSize: 10 }}
                    tickMargin={8}
                    // Ask Recharts for ~6 ticks across the width
                    tickCount={6}
                    minTickGap={20}
                    interval={chartDataForDisplay.length > 0 
                      ? Math.max(1, Math.floor(chartDataForDisplay.length / 8)) 
                      : 0}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                    }}
                  />
                  <YAxis 
                    yAxisId="left"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6b7280', fontSize: 11 }}
                    ticks={unitForecastYTicks}
                    tickFormatter={(value) => {
                      if (value >= 1000) {
                        return `${(value / 1000).toFixed(0)}k`;
                      }
                      return Math.round(value);
                    }}
                    domain={unitForecastYTicks.length >= 2 
                      ? [unitForecastYTicks[0], unitForecastYTicks[unitForecastYTicks.length - 1]] 
                      : unitForecastYTicks.length === 1 
                        ? [unitForecastYTicks[0], unitForecastYTicks[0] * 1.1] 
                        : (chartDisplayData.maxValue ? [0, Math.ceil(chartDisplayData.maxValue * 1.1)] : 'auto')}
                  />
                  <Tooltip 
                    content={(props) => {
                      if (!props.active || !props.payload?.length) return null;
                      const inner = <CustomTooltip {...props} />;
                      const pos = chartCursorRef.current;
                      return (
                        <div
                          ref={chartTooltipWrapperRef}
                          style={{
                            position: 'fixed',
                            left: pos ? `${pos.clientX}px` : 0,
                            top: pos ? `${pos.clientY - 250}px` : 0,
                            transform: 'translate(-50%, 0)',
                            zIndex: 10,
                            pointerEvents: 'none'
                          }}
                        >
                          {inner}
                        </div>
                      );
                    }}
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                    wrapperStyle={{ zIndex: 10 }}
                  />
                  
                  {/* Render horizontal dashed lines for each Y tick */}
                  {unitForecastYTicks.map((v) => (
                    <ReferenceLine
                      key={`unit-y-${v}`}
                      y={v}
                      yAxisId="left"
                      stroke="rgba(148, 163, 184, 0.55)"
                      strokeDasharray="3 3"
                      strokeWidth={0.75}
                    />
                  ))}
                  
                  {/* Render colored DOI segments and Today marker */}
                  {(() => {
                    const data = chartDisplayData.data;
                    if (!data || data.length === 0) return null;
                    
                    // Use backend-provided periods if available (fallback method)
                    if (forecastData?.chart_rendering?.periods && forecastData.chart_rendering.periods.length > 0) {
                      const periods = forecastData.chart_rendering.periods;
                      console.log('Using backend-provided periods:', periods.length);
                      
                      // Map period colors to match our new color scheme
                      const colorMap = {
                        '#a855f7': '#a855f7', // Violet - FBA
                        '#15803d': '#10b981', // Green - Total (updated to brighter green)
                        '#3b82f6': '#3b82f6'  // Blue - Forecast
                      };

                      return (
                        <>
                          {periods.map((period, idx) => {
                            const startTs = new Date(period.start_date).getTime();
                            const endTs = new Date(period.end_date).getTime();
                            const mappedColor = colorMap[period.color] || period.color;
                            // Use exact timestamps so zones strike at the right dates
                            return (
                              <ReferenceArea
                                key={`period-${idx}`}
                                x1={startTs}
                                x2={endTs}
                                fill={mappedColor}
                                fillOpacity={0.2}
                                yAxisId="left"
                              />
                            );
                          })}
                          {/* Zone boundary markers at period edges (turning points) */}
                          {periods.length > 1 && periods.slice(1).map((p, idx) => (
                            <ReferenceLine key={`boundary-${idx}`} x={new Date(p.start_date).getTime()} stroke={colorMap[p.color] || p.color} strokeDasharray="3 3" strokeWidth={1} strokeOpacity={0.7} yAxisId="left" />
                          ))}
                          {periods.length > 0 && (
                            <ReferenceLine x={new Date(periods[periods.length - 1].end_date).getTime()} stroke="#3b82f6" strokeDasharray="3 3" strokeWidth={1} strokeOpacity={0.7} yAxisId="left" />
                          )}
                          
                          {/* Today marker from backend or calculated */}
                          {(() => {
                            const todayTs = new Date().setHours(0, 0, 0, 0);
                            let todayPoint = data.find(p => Math.abs(new Date(p.timestamp).setHours(0, 0, 0, 0) - todayTs) < 86400000);
                            if (!todayPoint) todayPoint = data[Math.floor(data.length / 3)]; // Fallback
                            
                            return todayPoint ? (
                              <ReferenceLine 
                                x={todayPoint.timestamp}
                                stroke="#ffffff"
                                strokeDasharray="4 4"
                                strokeWidth={2}
                                strokeOpacity={0.9}
                                yAxisId="left"
                                label={{ 
                                  value: 'Today', 
                                  position: 'top', 
                                  fill: '#ffffff', 
                                  fontSize: 12,
                                  fontWeight: '600',
                                  offset: 8
                                }}
                              />
                            ) : null;
                          })()}
                        </>
                      );
                    }
                    
                    // Find today's data point
                    const todayTs = new Date().setHours(0, 0, 0, 0);
                    let todayDataPoint = null;
                    let todayIndex = -1;
                    let minDiff = Infinity;
                    
                    data.forEach((point, idx) => {
                      const pointTs = new Date(point.timestamp).setHours(0, 0, 0, 0);
                      const diff = Math.abs(pointTs - todayTs);
                      if (diff < minDiff) {
                        minDiff = diff;
                        todayDataPoint = point;
                        todayIndex = idx;
                      }
                    });
                    
                    if (!todayDataPoint || todayIndex === -1) {
                      console.log('No today data point found');
                      return null;
                    }
                    
                    // Use same values as the cards so purple/green/blue segments match the timeline
                    const fbaD = timeline.fbaAvailable ?? forecastData?.doi_fba ?? forecastData?.fba_days ?? doiSettings?.amazonDoiGoal ?? 0;
                    const totalD = timeline.totalDays ?? forecastData?.doi_total ?? forecastData?.total_days ?? (fbaD + (doiSettings?.inboundLeadTime ?? 0) + (doiSettings?.manufactureLeadTime ?? 0));
                    const forecastEndDays = doiGoalDays ?? (doiSettings ? (doiSettings.amazonDoiGoal + doiSettings.inboundLeadTime + doiSettings.manufactureLeadTime) : 130);
                    
                    const lastDataPoint = data[data.length - 1];
                    const lastTs = lastDataPoint ? new Date(lastDataPoint.timestamp).getTime() : todayTs;
                    
                    // Find data points for each segment boundary; clamp to chart end so all segments show
                    const findClosestPoint = (targetDays) => {
                      if (targetDays <= 0) return null;
                      const targetDate = new Date(todayTs + targetDays * 86400000);
                      let closest = null;
                      let minDiff = Infinity;
                      
                      for (let i = todayIndex; i < data.length; i++) {
                        const point = data[i];
                        const diff = Math.abs(new Date(point.timestamp) - targetDate);
                        if (diff < minDiff) {
                          minDiff = diff;
                          closest = point;
                        }
                        if (i > todayIndex && diff > minDiff * 2) break;
                      }
                      // If target is beyond chart end, use last point so blue segment extends to end
                      if (!closest && lastDataPoint) closest = lastDataPoint;
                      if (closest && targetDate.getTime() > lastTs) closest = lastDataPoint;
                      return closest;
                    };
                    
                    const fbaPoint = fbaD > 0 ? findClosestPoint(fbaD) : todayDataPoint;
                    const totalPoint = totalD > 0 ? findClosestPoint(totalD) : (fbaPoint || todayDataPoint);
                    const forecastPoint = forecastEndDays > 0 ? findClosestPoint(forecastEndDays) : lastDataPoint;
                    
                    // When Total Inventory days = FBA days (e.g. 31 = 31), both map to same point so green has no span.
                    // Find next data point after FBA so we always draw a visible green "Total Inv." band.
                    let greenEndTimestamp = totalPoint?.timestamp;
                    if (fbaPoint && totalPoint && totalD >= fbaD && totalPoint.timestamp <= fbaPoint.timestamp) {
                      const fbaIdx = data.findIndex(p => p.timestamp === fbaPoint.timestamp);
                      const nextPoint = fbaIdx >= 0 && fbaIdx < data.length - 1 ? data[fbaIdx + 1] : null;
                      greenEndTimestamp = nextPoint ? nextPoint.timestamp : (fbaPoint.timestamp + 86400000);
                    }
                    
                    // Use timestamp comparison so all segments show; green shows even when Total = FBA (minimal band)
                    const hasVioletSpan = todayDataPoint && fbaPoint && fbaPoint.timestamp > todayDataPoint.timestamp;
                    const hasGreenSpan = fbaPoint && greenEndTimestamp != null && greenEndTimestamp > fbaPoint.timestamp;
                    // Blue starts where green ends (so when Total = FBA, blue starts after the thin green band)
                    const blueStartTimestamp = hasGreenSpan ? greenEndTimestamp : totalPoint?.timestamp;
                    const hasBlueSpan = forecastPoint && blueStartTimestamp != null && forecastPoint.timestamp > blueStartTimestamp;
                    const segmentOpacity = 0.2;

                    return (
                      <>
                        {/* Violet: FBA Available (Today → FBA boundary) */}
                        {hasVioletSpan && (
                          <ReferenceArea
                            x1={todayDataPoint.timestamp}
                            x2={fbaPoint.timestamp}
                            fill="#a855f7"
                            fillOpacity={segmentOpacity}
                            yAxisId="left"
                          />
                        )}
                        
                        {/* Green: Total Inventory (FBA → Total boundary); visible even when Total days = FBA days */}
                        {hasGreenSpan && (
                          <ReferenceArea
                            x1={fbaPoint.timestamp}
                            x2={greenEndTimestamp}
                            fill="#10b981"
                            fillOpacity={segmentOpacity}
                            yAxisId="left"
                          />
                        )}
                        
                        {/* Blue: Forecast Period (Total → Forecast end, matches DOI forecast) */}
                        {hasBlueSpan && (
                          <ReferenceArea
                            x1={blueStartTimestamp}
                            x2={forecastPoint.timestamp}
                            fill="#3b82f6"
                            fillOpacity={segmentOpacity}
                            yAxisId="left"
                          />
                        )}
                        
                        {/* Fallback: single blue band when we only have today + forecast end (e.g. no FBA/Total breakdown) */}
                        {todayDataPoint && forecastPoint && forecastPoint.timestamp > todayDataPoint.timestamp && !hasVioletSpan && !hasGreenSpan && !hasBlueSpan && (
                          <ReferenceArea
                            x1={todayDataPoint.timestamp}
                            x2={forecastPoint.timestamp}
                            fill="#3b82f6"
                            fillOpacity={segmentOpacity}
                            yAxisId="left"
                          />
                        )}
                        
                        {/* Today marker */}
                        {todayDataPoint && (
                          <ReferenceLine 
                            x={todayDataPoint.timestamp}
                            stroke="#ffffff"
                            strokeDasharray="4 4"
                            strokeWidth={2}
                            strokeOpacity={0.9}
                            yAxisId="left"
                            label={{ 
                              value: 'Today', 
                              position: 'top', 
                              fill: '#ffffff', 
                              fontSize: 12,
                              fontWeight: '600',
                              offset: 8
                            }}
                          />
                        )}
                        {/* Zone boundary markers: turning points from one zone to another */}
                        {hasVioletSpan && (
                          <ReferenceLine x={fbaPoint.timestamp} stroke="#a855f7" strokeDasharray="3 3" strokeWidth={1} strokeOpacity={0.7} yAxisId="left" />
                        )}
                        {hasGreenSpan && (
                          <ReferenceLine x={greenEndTimestamp} stroke="#10b981" strokeDasharray="3 3" strokeWidth={1} strokeOpacity={0.7} yAxisId="left" />
                        )}
                        {hasBlueSpan && (
                          <ReferenceLine x={forecastPoint.timestamp} stroke="#3b82f6" strokeDasharray="3 3" strokeWidth={1} strokeOpacity={0.7} yAxisId="left" />
                        )}
                      </>
                    );
                  })()}
                  
                  {/* Z-drag zoom box (while user drags with Z held) */}
                  {zoomBox.startTimestamp != null && zoomBox.endTimestamp != null && (
                    <ReferenceArea
                      x1={Math.min(zoomBox.startTimestamp, zoomBox.endTimestamp)}
                      x2={Math.max(zoomBox.startTimestamp, zoomBox.endTimestamp)}
                      fill="#94a3b8"
                      fillOpacity={0.25}
                      yAxisId="left"
                      stroke="#e2e8f0"
                      strokeOpacity={0.8}
                      strokeDasharray="4 2"
                    />
                  )}
                  {/* Drag-selection range highlight (Units Sold sum) */}
                  {chartRangeSelection.startTimestamp != null && chartRangeSelection.endTimestamp != null && (
                    <ReferenceArea
                      x1={Math.min(chartRangeSelection.startTimestamp, chartRangeSelection.endTimestamp)}
                      x2={Math.max(chartRangeSelection.startTimestamp, chartRangeSelection.endTimestamp)}
                      fill="#3b82f6"
                      fillOpacity={0.15}
                      yAxisId="left"
                      stroke="#3b82f6"
                      strokeOpacity={0.5}
                    />
                  )}
                  
                  {/* Units Sold Area (Historical) */}
                  <Area 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="unitsSold" 
                    stroke="#6b7280"
                    strokeWidth={1}
                    fill="url(#unitsSoldGradient)"
                    name="Units Sold"
                    connectNulls={false}
                  />
                  
                  {/* Smoothed Units Sold - Orange solid line (historical only; stops at today) */}
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="forecastBase" 
                    stroke="#f97316" 
                    strokeWidth={2}
                    dot={false}
                    name="Units Sold Smoothed"
                    connectNulls={false}
                  />
                  
                  {/* Forecast - Orange dashed line (only line in forecast region) */}
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="forecastAdjusted" 
                    stroke="#f97316" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Forecast"
                    connectNulls={false}
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

          {/* Range selection sum - show when user has dragged a range */}
          {chartRangeSum != null && (
            <div style={{
              marginTop: '0.5rem',
              padding: '0.5rem 0.75rem',
              borderRadius: '0.5rem',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}>
              <span style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>Selected range:</span>
              <span style={{ fontSize: '0.8125rem', color: '#e5e7eb' }}>
                <strong>Units Sold</strong> {chartRangeSum.unitsSold.toLocaleString()}
                <span style={{ marginLeft: '1rem' }}><strong>Units Sold Smoothed</strong> {chartRangeSum.unitsSmoothed.toLocaleString()}</span>
              </span>
              <button
                type="button"
                onClick={() => setChartRangeSelection({ startTimestamp: null, endTimestamp: null })}
                style={{
                  fontSize: '0.75rem',
                  color: '#3b82f6',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Clear selection
              </button>
            </div>
          )}

          {/* Legend at bottom - Enhanced style with gradients and colored backgrounds */}
          <div style={{ 
            display: 'flex', 
            gap: inventoryOnly ? '0.5rem' : '1rem', 
            marginTop: inventoryOnly ? '0.5rem' : '0.75rem', 
            paddingTop: inventoryOnly ? '0.5rem' : '0.75rem',
            borderTop: '1px solid #1f2937',
            justifyContent: 'center', 
            fontSize: inventoryOnly ? '0.7rem' : '0.75rem',
            flexWrap: 'wrap'
          }}>
            {/* Chart Series Legend */}
            <div style={{ display: 'flex', gap: inventoryOnly ? '0.75rem' : '1.25rem', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                padding: '0.375rem 0.75rem',
                borderRadius: '0.5rem',
                backgroundColor: 'rgba(17, 24, 39, 0.5)',
                transition: 'background-color 0.2s'
              }}>
                <div style={{ width: '20px', height: '12px', backgroundColor: 'rgba(107, 114, 128, 0.5)', borderRadius: '2px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}></div>
                <span style={{ color: '#d1d5db', fontWeight: '500' }}>Units Sold</span>
              </div>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                padding: '0.375rem 0.75rem',
                borderRadius: '0.5rem',
                backgroundColor: 'rgba(17, 24, 39, 0.5)',
                transition: 'background-color 0.2s'
              }}>
                <div style={{ width: '24px', height: '2px', backgroundColor: '#f97316', borderRadius: '1px', boxShadow: '0 1px 2px rgba(249, 115, 22, 0.3)' }}></div>
                <span style={{ color: '#d1d5db', fontWeight: '500' }}>Units Sold Smoothed</span>
              </div>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                padding: '0.375rem 0.75rem',
                borderRadius: '0.5rem',
                backgroundColor: 'rgba(17, 24, 39, 0.5)',
                transition: 'background-color 0.2s'
              }}>
                <div style={{ 
                  width: '24px', 
                  height: '2px', 
                  backgroundImage: 'repeating-linear-gradient(90deg, #f97316 0, #f97316 3px, transparent 3px, transparent 6px)',
                  borderRadius: '1px'
                }}></div>
                <span style={{ color: '#d1d5db', fontWeight: '500' }}>Forecast</span>
              </div>
            </div>
            
            {/* DOI Segment Legend with Gradients */}
            <div style={{ 
              display: 'flex', 
              gap: inventoryOnly ? '0.75rem' : '1.25rem', 
              alignItems: 'center',
              justifyContent: 'center',
              flexWrap: 'wrap',
              paddingLeft: inventoryOnly ? '0' : '1rem',
              marginLeft: inventoryOnly ? '0' : '1rem',
              borderLeft: inventoryOnly ? 'none' : '1px solid #1f2937'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                padding: '0.375rem 0.75rem',
                borderRadius: '0.5rem',
                backgroundColor: 'rgba(17, 24, 39, 0.5)',
                transition: 'background-color 0.2s'
              }}>
                <div style={{ 
                  width: '16px', 
                  height: '16px', 
                  background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                  borderRadius: '4px',
                  boxShadow: '0 1px 3px rgba(124, 58, 237, 0.3)'
                }}></div>
                <span style={{ color: '#d1d5db', fontWeight: '500' }}>FBA Available</span>
              </div>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                padding: '0.375rem 0.75rem',
                borderRadius: '0.5rem',
                backgroundColor: 'rgba(17, 24, 39, 0.5)',
                transition: 'background-color 0.2s'
              }}>
                <div style={{ 
                  width: '16px', 
                  height: '16px', 
                  background: 'linear-gradient(135deg, #22c55e, #4ade80)',
                  borderRadius: '4px',
                  boxShadow: '0 1px 3px rgba(34, 197, 94, 0.3)'
                }}></div>
                <span style={{ color: '#d1d5db', fontWeight: '500' }}>Total Inv.</span>
              </div>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                padding: '0.375rem 0.75rem',
                borderRadius: '0.5rem',
                backgroundColor: 'rgba(17, 24, 39, 0.5)',
                transition: 'background-color 0.2s'
              }}>
                <div style={{ 
                  width: '16px', 
                  height: '16px', 
                  background: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
                  borderRadius: '4px',
                  boxShadow: '0 1px 3px rgba(59, 130, 246, 0.3)'
                }}></div>
                <span style={{ color: '#d1d5db', fontWeight: '500' }}>Forecast</span>
              </div>
            </div>
          </div>
          
          {/* Legacy Right side - Period squares (kept for backwards compatibility but can be removed if not needed) */}
          <div style={{ display: 'none' }}>
            
            {/* Right side - Squares */}
            <div style={{ display: 'flex', gap: inventoryOnly ? '0.35rem' : '0.5rem', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <div style={{ 
                  width: inventoryOnly ? '10px' : '12px', 
                  height: inventoryOnly ? '10px' : '12px', 
                  backgroundColor: '#a855f7',
                  borderRadius: '2px'
                }}></div>
                <span style={{ color: '#94a3b8' }}>FBA Avail.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <div style={{ 
                  width: inventoryOnly ? '10px' : '12px', 
                  height: inventoryOnly ? '10px' : '12px', 
                  backgroundColor: '#15803d',
                  borderRadius: '2px'
                }}></div>
                <span style={{ color: '#94a3b8' }}>Total Inv.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <div style={{ 
                  width: inventoryOnly ? '10px' : '12px', 
                  height: inventoryOnly ? '10px' : '12px', 
                  backgroundColor: '#3b82f6',
                  borderRadius: '2px'
                }}></div>
                <span style={{ color: '#94a3b8' }}>Forecast</span>
              </div>
            </div>
          </div>
        </div>
      </div>
        </div>
      )}

      {/* Sales Tab Content */}
      {activeTab === 'sales' && (
          <div style={{ backgroundColor: '#1A2235' }}>
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
            <div className="px-6" style={{ display: 'grid', gridTemplateColumns: '70% 30%', gap: '1.5rem', marginBottom: '1.5rem', minHeight: '400px' }}>
              {/* Left: Graph (70%) */}
              <div className={themeClasses.cardBg} style={{ borderRadius: '0.75rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <div style={{ flex: 1, minHeight: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={salesChartData?.chart_data || []}>
                    <CartesianGrid 
                      strokeDasharray="4 4" 
                      stroke="rgba(148, 163, 184, 0.45)" 
                      vertical={false} 
                      horizontal={true}
                      strokeWidth={1} 
                    />
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
          <div style={{ backgroundColor: '#1A2235' }}>
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
            <div className="px-6" style={{ display: 'grid', gridTemplateColumns: '70% 30%', gap: '1.5rem', marginBottom: '1.5rem', minHeight: '400px' }}>
              {/* Left: Graph (70%) */}
              <div className={themeClasses.cardBg} style={{ borderRadius: '0.75rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <div style={{ flex: 1, minHeight: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={adsChartData?.chart_data || []}>
                    <CartesianGrid 
                      strokeDasharray="4 4" 
                      stroke="rgba(148, 163, 184, 0.45)" 
                      vertical={false} 
                      horizontal={true}
                      strokeWidth={1} 
                    />
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

      {/* Forecast Settings Modal */}
      {showForecastSettingsModal && (
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
          onClick={handleCancelForecastSettings}
        >
          <div
            style={{
              backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
              borderRadius: '0.75rem',
              width: 'min(90vw, 400px)',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
              border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
              animation: 'slideUp 0.3s ease-out',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              width: '100%',
              height: '44px',
              padding: '12px 16px',
              borderBottom: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
              flexShrink: 0,
              gap: '8px'
            }}>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: '700',
                color: isDarkMode ? '#fff' : '#1f2937',
                margin: 0
              }}>
                Forecast Settings
              </h3>
              <button
                onClick={handleCancelForecastSettings}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isDarkMode ? '#9CA3AF' : '#6B7280',
                  borderRadius: '4px',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
                  e.currentTarget.style.color = isDarkMode ? '#fff' : '#1f2937';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = isDarkMode ? '#9CA3AF' : '#6B7280';
                }}
              >
                <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
                  <path 
                    d="M12 4L4 12M4 4L12 12" 
                    stroke="currentColor" 
                    strokeWidth="1.5" 
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            {/* Content Area */}
            <div style={{
              width: '100%',
              padding: '16px',
              overflowY: 'auto',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>

            {/* DOI Settings Section */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
                <h4 style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: isDarkMode ? '#F9FAFB' : '#111827',
                  margin: 0
                }}>
                  DOI Settings
                </h4>
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: isDarkMode ? '#374151' : '#E5E7EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'help',
                  }}
                  title="Days of Inventory settings determine how far ahead to plan production"
                >
                  <span style={{ 
                    fontSize: '11px', 
                    fontWeight: 600, 
                    color: isDarkMode ? '#9CA3AF' : '#6B7280'
                  }}>
                    i
                  </span>
                </div>
              </div>
              
              <div style={{ 
                backgroundColor: isDarkMode ? '#1F2937' : '#F9FAFB',
                borderRadius: '0.5rem',
                padding: '1rem',
                border: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Amazon DOI Goal */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '14px', color: isDarkMode ? '#F9FAFB' : '#111827', fontWeight: 400 }}>
                    Amazon DOI Goal
                  </label>
                  <input
                    type="text"
                    value={tempDoiSettings.amazonDoiGoal}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      setTempDoiSettings(prev => ({ ...prev, amazonDoiGoal: value }));
                    }}
                    style={{
                      width: '107px',
                      height: '24px',
                      padding: '4px 6px',
                      borderRadius: '8px',
                      border: `1px solid ${isDarkMode ? '#374151' : '#D1D5DB'}`,
                      backgroundColor: isDarkMode ? '#111827' : '#FFFFFF',
                      color: isDarkMode ? '#F9FAFB' : '#111827',
                      fontSize: '14px',
                      textAlign: 'center',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#3B82F6'}
                    onBlur={(e) => e.target.style.borderColor = isDarkMode ? '#374151' : '#D1D5DB'}
                  />
                </div>

                {/* Inbound Lead Time */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '14px', color: isDarkMode ? '#F9FAFB' : '#111827', fontWeight: 400 }}>
                    Inbound Lead Time
                  </label>
                  <input
                    type="text"
                    value={tempDoiSettings.inboundLeadTime}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      setTempDoiSettings(prev => ({ ...prev, inboundLeadTime: value }));
                    }}
                    style={{
                      width: '107px',
                      height: '24px',
                      padding: '4px 6px',
                      borderRadius: '8px',
                      border: `1px solid ${isDarkMode ? '#374151' : '#D1D5DB'}`,
                      backgroundColor: isDarkMode ? '#111827' : '#FFFFFF',
                      color: isDarkMode ? '#F9FAFB' : '#111827',
                      fontSize: '14px',
                      textAlign: 'center',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#3B82F6'}
                    onBlur={(e) => e.target.style.borderColor = isDarkMode ? '#374151' : '#D1D5DB'}
                  />
                </div>

                {/* Manufacture Lead Time */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '14px', color: isDarkMode ? '#F9FAFB' : '#111827', fontWeight: 400 }}>
                    Manufacture Lead Time
                  </label>
                  <input
                    type="text"
                    value={tempDoiSettings.manufactureLeadTime}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      setTempDoiSettings(prev => ({ ...prev, manufactureLeadTime: value }));
                    }}
                    style={{
                      width: '107px',
                      height: '24px',
                      padding: '4px 6px',
                      borderRadius: '8px',
                      border: `1px solid ${isDarkMode ? '#374151' : '#D1D5DB'}`,
                      backgroundColor: isDarkMode ? '#111827' : '#FFFFFF',
                      color: isDarkMode ? '#F9FAFB' : '#111827',
                      fontSize: '14px',
                      textAlign: 'center',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#3B82F6'}
                    onBlur={(e) => e.target.style.borderColor = isDarkMode ? '#374151' : '#D1D5DB'}
                  />
                </div>

                {/* Divider */}
                <div style={{ height: '1px', backgroundColor: isDarkMode ? '#374151' : '#E5E7EB', margin: '4px 0' }} />

                {/* Total Required DOI */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '14px', color: isDarkMode ? '#9CA3AF' : '#6B7280', fontWeight: 400 }}>
                    Total Required DOI
                  </span>
                  <div style={{
                    width: '107px',
                    height: '24px',
                    padding: '4px 6px',
                    borderRadius: '8px',
                    border: `1px solid ${isDarkMode ? '#374151' : '#D1D5DB'}`,
                    backgroundColor: isDarkMode ? '#0F172A' : '#F3F4F6',
                    color: isDarkMode ? '#9CA3AF' : '#6B7280',
                    fontSize: '14px',
                    textAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxSizing: 'border-box',
                  }}>
                    {calculateTotalDOI(tempDoiSettings)}
                  </div>
                </div>
              </div>
              </div>
            </div>

            {/* Forecast Adjustments Section */}
            <div>
              <style>
                {`
                  input[type="number"]::-webkit-inner-spin-button,
                  input[type="number"]::-webkit-outer-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                  }
                  input[type="number"] {
                    -moz-appearance: textfield;
                  }
                `}
              </style>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
                <h4 style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: isDarkMode ? '#F9FAFB' : '#111827',
                  margin: 0
                }}>
                  Forecast Adjustments
                </h4>
              </div>
              
              <div style={{ 
                backgroundColor: isDarkMode ? '#1F2937' : '#F9FAFB',
                borderRadius: '0.5rem',
                padding: '1rem',
                border: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Forecast Model */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
                    <label style={{ fontSize: '14px', color: isDarkMode ? '#F9FAFB' : '#111827', fontWeight: 400 }}>
                      Forecast Model
                    </label>
                    <div
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        backgroundColor: isDarkMode ? '#374151' : '#E5E7EB',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'help',
                      }}
                      title="Select the product lifecycle stage"
                    >
                      <span style={{ 
                        fontSize: '11px', 
                        fontWeight: 600, 
                        color: isDarkMode ? '#9CA3AF' : '#6B7280'
                      }}>
                        i
                      </span>
                    </div>
                  </div>
                  
                  {/* Slider Container */}
                  <div style={{ position: 'relative', width: '100%' }}>
                    {/* Labels */}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      marginBottom: '10px',
                      position: 'relative',
                      zIndex: 2,
                      width: '100%',
                      height: '20px'
                    }}>
                      {['New', 'Growing', 'Established'].map((model, index) => {
                        // Calculate position for labels: 0%, 50%, 100%
                        const labelPosition = index === 0 ? '0%' : index === 1 ? '50%' : '100%';
                        const transformX = index === 0 ? '0' : index === 1 ? '-50%' : '-100%';
                        
                        return (
                          <span
                            key={model}
                            style={{
                              fontSize: '14px',
                              fontWeight: 400,
                              color: tempForecastModel === model ? '#3B82F6' : (isDarkMode ? '#9CA3AF' : '#6B7280'),
                              cursor: 'pointer',
                              transition: 'color 0.2s',
                              position: 'absolute',
                              left: labelPosition,
                              transform: `translateX(${transformX})`,
                              whiteSpace: 'nowrap',
                            }}
                            onClick={() => setTempForecastModel(model)}
                          >
                            {model}
                          </span>
                        );
                      })}
                    </div>
                    
                    {/* Slider Track */}
                    <div 
                      style={{ 
                        position: 'relative', 
                        width: '100%', 
                        height: '6px',
                        cursor: 'pointer',
                        touchAction: 'none',
                        marginTop: '4px',
                      }}
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickX = e.clientX - rect.left;
                        const percentage = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
                        
                        // Determine which option based on click position
                        if (percentage < 25) {
                          setTempForecastModel('New');
                        } else if (percentage < 75) {
                          setTempForecastModel('Growing');
                        } else {
                          setTempForecastModel('Established');
                        }
                      }}
                    >
                      <div
                        style={{
                          width: '100%',
                          height: '6px',
                          backgroundColor: isDarkMode ? '#374151' : '#D1D5DB',
                          borderRadius: '3px',
                          position: 'relative',
                        }}
                      >
                        {/* Slider Handle - positioned at 0%, 50%, or 100% */}
                        <div
                          style={{
                            position: 'absolute',
                            left: tempForecastModel === 'New' ? '0%' : tempForecastModel === 'Growing' ? '50%' : '100%',
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            backgroundColor: '#FFFFFF',
                            border: '2px solid #3B82F6',
                            cursor: 'pointer',
                            transition: 'left 0.2s ease',
                            zIndex: 3,
                            pointerEvents: 'none',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Market Adjustment */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontSize: '14px', color: isDarkMode ? '#F9FAFB' : '#111827', fontWeight: 400 }}>
                      Market Adjustment
                    </label>
                    <div
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        backgroundColor: isDarkMode ? '#374151' : '#E5E7EB',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'help',
                      }}
                      title="Adjust forecast based on market conditions"
                    >
                      <span style={{ 
                        fontSize: '11px', 
                        fontWeight: 600, 
                        color: isDarkMode ? '#9CA3AF' : '#6B7280'
                      }}>
                        i
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      type="number"
                      step="0.1"
                      value={tempMarketAdjustment}
                      onChange={(e) => setTempMarketAdjustment(parseFloat(e.target.value) || 0)}
                      style={{
                        width: '88px',
                        height: '24px',
                        padding: '4px 6px',
                        borderRadius: '4px',
                        border: `1px solid ${isDarkMode ? '#374151' : '#D1D5DB'}`,
                        backgroundColor: isDarkMode ? '#111827' : '#FFFFFF',
                        color: isDarkMode ? '#F9FAFB' : '#111827',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                        textAlign: 'center',
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#3B82F6'}
                      onBlur={(e) => e.target.style.borderColor = isDarkMode ? '#374151' : '#D1D5DB'}
                    />
                    <span style={{ fontSize: '14px', color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>%</span>
                  </div>
                </div>

                {/* Sales Velocity Adjustment */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontSize: '14px', color: isDarkMode ? '#F9FAFB' : '#111827', fontWeight: 400 }}>
                      Sales Velocity Adjustment
                    </label>
                    <div
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        backgroundColor: isDarkMode ? '#374151' : '#E5E7EB',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'help',
                      }}
                      title="Adjust forecast based on sales velocity trends"
                    >
                      <span style={{ 
                        fontSize: '11px', 
                        fontWeight: 600, 
                        color: isDarkMode ? '#9CA3AF' : '#6B7280'
                      }}>
                        i
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      type="number"
                      step="0.1"
                      value={tempSalesVelocityWeight}
                      onChange={(e) => setTempSalesVelocityWeight(parseFloat(e.target.value) || 0)}
                      style={{
                        width: '88px',
                        height: '24px',
                        padding: '4px 6px',
                        borderRadius: '4px',
                        border: `1px solid ${isDarkMode ? '#374151' : '#D1D5DB'}`,
                        backgroundColor: isDarkMode ? '#111827' : '#FFFFFF',
                        color: isDarkMode ? '#F9FAFB' : '#111827',
                        fontSize: '14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                        textAlign: 'center',
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#3B82F6'}
                      onBlur={(e) => e.target.style.borderColor = isDarkMode ? '#374151' : '#D1D5DB'}
                    />
                    <span style={{ fontSize: '14px', color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>%</span>
                  </div>
                </div>
              </div>
              </div>
            </div>

            </div>

            {/* Footer */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              width: '100%',
              height: '47px',
              padding: '12px 16px',
              borderTop: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
              flexShrink: 0
            }}>
              <button
                onClick={handleSaveForecastSettingsAsDefault}
                style={{
                  minWidth: '113px',
                  width: 'auto',
                  height: '23px',
                  padding: '4px 12px',
                  borderRadius: '4px',
                  border: '1px solid #3B82F6',
                  backgroundColor: 'transparent',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxSizing: 'border-box',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                }}
              >
                Save as Default
              </button>
              <button
                onClick={handleApplyForecastSettings}
                style={{
                  width: '57px',
                  height: '23px',
                  padding: '4px 12px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: '#3B82F6',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxSizing: 'border-box',
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#2563EB'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#3B82F6'}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Temporary Apply Confirmation Modal */}
      {showTemporaryConfirmModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1001,
          }}
          onClick={handleGoBackFromConfirm}
        >
          <div
            style={{
              backgroundColor: '#1A2235',
              borderRadius: '12px',
              padding: '24px',
              width: '418px',
              height: 'auto',
              minHeight: '257px',
              boxShadow: '0 24px 80px rgba(15,23,42,0.75)',
              border: '1px solid #1F2937',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* X Button */}
            <button
              onClick={handleGoBackFromConfirm}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#9CA3AF',
                borderRadius: '4px',
                transition: 'all 0.2s',
                zIndex: 10,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#9CA3AF';
              }}
            >
              <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
                <path 
                  d="M12 4L4 12M4 4L12 12" 
                  stroke="currentColor" 
                  strokeWidth="1.5" 
                  strokeLinecap="round"
                />
              </svg>
            </button>

            {/* Warning Icon */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center',
            }}>
              <div
                style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '50%',
                  backgroundColor: '#F97316',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: '#FFFFFF',
                }}
              >
                !
              </div>
            </div>

            {/* Title */}
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              color: '#FFFFFF',
              textAlign: 'center',
              margin: 0,
              marginTop: '-12px',
            }}>
              Apply Forecast Settings Temporarily?
            </h3>

            {/* Body Text */}
            <div style={{ marginTop: '-12px' }}>
              <p style={{
                fontSize: '0.875rem',
                color: '#E2E8F0',
                textAlign: 'center',
                margin: 0,
                marginBottom: '0.5rem',
                lineHeight: '1.5',
              }}>
                You're making a temporary change for this product only.
              </p>
              <p style={{
                fontSize: '0.875rem',
                color: '#E2E8F0',
                textAlign: 'center',
                margin: 0,
                lineHeight: '1.5',
              }}>
                To keep these settings, use Save as Default.
              </p>
            </div>

            {/* Checkbox */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              justifyContent: 'center',
            }}>
              <div
                onClick={() => setDontRemindAgain(!dontRemindAgain)}
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '3px',
                  border: '1.5px solid #E2E8F0',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 1px 2px rgba(226, 232, 240, 0.3)',
                  transition: 'all 0.2s ease',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#F3F4F6';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(226, 232, 240, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E2E8F0';
                  e.currentTarget.style.boxShadow = '0 1px 2px rgba(226, 232, 240, 0.3)';
                }}
              >
                {dontRemindAgain && (
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M8 2.5L4 6.5L2 4.5"
                      stroke="#E2E8F0"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
              <label
                onClick={() => setDontRemindAgain(!dontRemindAgain)}
                style={{
                  fontSize: '0.875rem',
                  color: '#C7C7CC',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                Don't remind me again
              </label>
            </div>

            {/* Buttons */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'row',
              gap: '16px',
              width: '100%',
            }}>
              <button
                onClick={handleGoBackFromConfirm}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#FFFFFF',
                  color: '#1F2937',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  width: '177px',
                  height: '31px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxSizing: 'border-box',
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#F3F4F6'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#FFFFFF'}
              >
                Go back
              </button>
              <button
                onClick={handleConfirmTemporaryApply}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#3B82F6',
                  color: '#FFFFFF',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  width: '177px',
                  height: '31px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxSizing: 'border-box',
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#2563EB'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#3B82F6'}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ngoos;

