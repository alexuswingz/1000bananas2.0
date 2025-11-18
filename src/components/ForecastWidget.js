import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea } from 'recharts';
import NgoosAPI from '../services/ngoosApi';
import { toast } from 'sonner';

const ForecastWidget = ({ asin, productName }) => {
  const { isDarkMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [selectedView, setSelectedView] = useState('26weeks');

  const themeClasses = {
    cardBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
  };

  const viewOptions = {
    '12weeks': 12,
    '26weeks': 26,
    '52weeks': 52,
    'all': 52
  };

  const getWeeksForView = (view) => viewOptions[view] || 26;

  useEffect(() => {
    if (!asin) return;

    const fetchForecastData = async () => {
      try {
        setLoading(true);
        const weeks = getWeeksForView(selectedView);
        const [forecast, chart] = await Promise.all([
          NgoosAPI.getForecast(asin),
          NgoosAPI.getChartData(asin, weeks, 25, 15)
        ]);

        setForecastData(forecast);
        setChartData(chart);
      } catch (error) {
        console.error('Error fetching forecast data:', error);
        toast.error('Failed to load forecast data');
      } finally {
        setLoading(false);
      }
    };

    fetchForecastData();
  }, [asin, selectedView]);

  // Prepare chart data
  const enhancedChartData = useMemo(() => {
    if (!chartData || !forecastData) return [];

    const { historical = [], forecast = [] } = chartData;
    const currentDate = new Date(forecastData.current_date);
    const runoutDate = new Date(forecastData.runout_date);
    const doiGoalDate = new Date(forecastData.doi_goal_date);
    
    const fbaAvailableDays = forecastData.fba_available_days || 0;
    const totalDays = forecastData.total_days || 0;
    const forecastDays = forecastData.forecast_days || 0;

    // Calculate dates for bar segments
    const fbaEndDate = new Date(currentDate);
    fbaEndDate.setDate(fbaEndDate.getDate() + fbaAvailableDays);
    
    const totalRunoutDate = new Date(currentDate);
    totalRunoutDate.setDate(totalRunoutDate.getDate() + totalDays);

    // Combine historical and forecast data
    const allData = [
      ...historical.map(item => ({
        week_end: item.week_end,
        units_sold: item.units_sold,
        units_smooth: item.units_smooth,
        forecast_base: null,
        forecast_adjusted: null,
        isForecast: false,
        isHistorical: true
      })),
      ...forecast.map(item => ({
        week_end: item.week_end,
        units_sold: null,
        units_smooth: null,
        forecast_base: item.forecast_base,
        forecast_adjusted: item.forecast_adjusted,
        isForecast: true,
        isHistorical: false
      }))
    ];

    // Add inventory bars
    return allData.map(item => {
      const itemDate = new Date(item.week_end);
      
      return {
        ...item,
        fba_available_bar: itemDate >= currentDate && itemDate < fbaEndDate ? 500 : 0,
        total_inventory_bar: itemDate >= fbaEndDate && itemDate < totalRunoutDate ? 500 : 0,
        forecast_bar: itemDate >= totalRunoutDate ? 500 : 0
      };
    });
  }, [chartData, forecastData]);

  if (loading || !chartData || !forecastData) {
    return (
      <div className={themeClasses.cardBg} style={{ 
        padding: '2rem', 
        borderRadius: '1rem', 
        border: `1px solid ${isDarkMode ? '#334155' : '#e5e7eb'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            border: '4px solid #334155',
            borderTopColor: '#3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }} />
          <p className={themeClasses.textSecondary}>Loading forecast...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={themeClasses.cardBg} style={{ 
      padding: '1.5rem', 
      border: `1px solid ${isDarkMode ? '#334155' : '#e5e7eb'}`,
      borderTop: 'none',
      boxShadow: isDarkMode ? '0 4px 20px rgba(0, 0, 0, 0.2)' : '0 4px 20px rgba(0, 0, 0, 0.05)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h3 className={`text-lg font-bold ${themeClasses.text}`}>
            📈 Inventory Forecast
          </h3>
          {productName && (
            <p className={`text-sm ${themeClasses.textSecondary}`}>{productName}</p>
          )}
        </div>
        <select
          value={selectedView}
          onChange={(e) => setSelectedView(e.target.value)}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
            color: isDarkMode ? '#fff' : '#000',
            border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          <option value="12weeks">12 Weeks</option>
          <option value="26weeks">26 Weeks</option>
          <option value="52weeks">52 Weeks</option>
          <option value="all">All</option>
        </select>
      </div>

      {/* Forecast Summary Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{ 
          padding: '1rem', 
          borderRadius: '0.5rem', 
          backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
          border: `1px solid ${isDarkMode ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)'}`
        }}>
          <p className={`text-xs font-semibold ${themeClasses.textSecondary} mb-1`}>CURRENT DOI</p>
          <p className={`text-2xl font-bold ${themeClasses.text}`}>{forecastData.current_doi || 0}</p>
          <p className={`text-xs ${themeClasses.textSecondary}`}>days</p>
        </div>
        
        <div style={{ 
          padding: '1rem', 
          borderRadius: '0.5rem', 
          backgroundColor: isDarkMode ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.05)',
          border: `1px solid ${isDarkMode ? 'rgba(34, 197, 94, 0.3)' : 'rgba(34, 197, 94, 0.2)'}`
        }}>
          <p className={`text-xs font-semibold ${themeClasses.textSecondary} mb-1`}>DOI GOAL</p>
          <p className={`text-2xl font-bold ${themeClasses.text}`}>{forecastData.doi_goal || 0}</p>
          <p className={`text-xs ${themeClasses.textSecondary}`}>days</p>
        </div>
        
        <div style={{ 
          padding: '1rem', 
          borderRadius: '0.5rem', 
          backgroundColor: isDarkMode ? 'rgba(249, 115, 22, 0.1)' : 'rgba(249, 115, 22, 0.05)',
          border: `1px solid ${isDarkMode ? 'rgba(249, 115, 22, 0.3)' : 'rgba(249, 115, 22, 0.2)'}`
        }}>
          <p className={`text-xs font-semibold ${themeClasses.textSecondary} mb-1`}>RUNOUT DATE</p>
          <p className={`text-sm font-bold ${themeClasses.text}`}>
            {new Date(forecastData.runout_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </p>
          <p className={`text-xs ${themeClasses.textSecondary}`}>FBA only</p>
        </div>
        
        <div style={{ 
          padding: '1rem', 
          borderRadius: '0.5rem', 
          backgroundColor: isDarkMode ? 'rgba(168, 85, 247, 0.1)' : 'rgba(168, 85, 247, 0.05)',
          border: `1px solid ${isDarkMode ? 'rgba(168, 85, 247, 0.3)' : 'rgba(168, 85, 247, 0.2)'}`
        }}>
          <p className={`text-xs font-semibold ${themeClasses.textSecondary} mb-1`}>TOTAL INVENTORY</p>
          <p className={`text-2xl font-bold ${themeClasses.text}`}>
            {(forecastData.fba_available || 0) + (forecastData.total_arriving || 0)}
          </p>
          <p className={`text-xs ${themeClasses.textSecondary}`}>units</p>
        </div>
      </div>

      {/* Chart */}
      <div style={{ width: '100%', height: '300px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={enhancedChartData}>
            {/* DOI Goal Highlight */}
            {forecastData.doi_goal_date && (
              <ReferenceArea
                x1={new Date(forecastData.doi_goal_date).toISOString().split('T')[0]}
                x2={new Date(new Date(forecastData.doi_goal_date).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                fill="#22c55e"
                fillOpacity={0.2}
                strokeOpacity={0.8}
                stroke="#22c55e"
                strokeWidth={2}
              />
            )}
            
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis 
              dataKey="week_end" 
              stroke="#64748b"
              style={{ fontSize: '0.75rem' }}
              tickLine={false}
              tickFormatter={(value) => {
                const date = new Date(value);
                return `${date.getMonth() + 1}/${date.getDate()}`;
              }}
            />
            <YAxis 
              yAxisId="left"
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
                if (name === 'units_sold' || name === 'units_smooth' || name === 'forecast_adjusted') {
                  return [Math.round(value), name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())];
                }
                return null;
              }}
            />
            
            {/* Inventory Bars */}
            <Bar yAxisId="left" dataKey="fba_available_bar" stackId="inventory" fill="#fbbf24" fillOpacity={0.3} />
            <Bar yAxisId="left" dataKey="total_inventory_bar" stackId="inventory" fill="#22c55e" fillOpacity={0.3} />
            <Bar yAxisId="left" dataKey="forecast_bar" stackId="inventory" fill="#ef4444" fillOpacity={0.3} />
            
            {/* Historical Data Lines */}
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="units_sold" 
              stroke="#3b82f6" 
              strokeWidth={2}
              name="Units Sold"
              dot={false}
              connectNulls
            />
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="units_smooth" 
              stroke="#8b5cf6" 
              strokeWidth={2}
              name="Smoothed"
              dot={false}
              connectNulls
            />
            
            {/* Forecast Line */}
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="forecast_adjusted" 
              stroke="#f97316" 
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Forecast"
              dot={false}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap',
        gap: '1rem', 
        marginTop: '1rem',
        padding: '1rem',
        borderRadius: '0.5rem',
        backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '20px', height: '3px', backgroundColor: '#3b82f6' }} />
          <span className={`text-xs ${themeClasses.textSecondary}`}>Units Sold</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '20px', height: '3px', backgroundColor: '#8b5cf6' }} />
          <span className={`text-xs ${themeClasses.textSecondary}`}>Smoothed</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '20px', height: '3px', backgroundColor: '#f97316', borderTop: '2px dashed #f97316' }} />
          <span className={`text-xs ${themeClasses.textSecondary}`}>Forecast</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '20px', height: '12px', backgroundColor: '#fbbf24', opacity: 0.3 }} />
          <span className={`text-xs ${themeClasses.textSecondary}`}>FBA Available</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '20px', height: '12px', backgroundColor: '#22c55e', opacity: 0.3 }} />
          <span className={`text-xs ${themeClasses.textSecondary}`}>Total Inventory</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: '20px', height: '12px', backgroundColor: '#ef4444', opacity: 0.3 }} />
          <span className={`text-xs ${themeClasses.textSecondary}`}>Forecast Period</span>
        </div>
      </div>
      
      {/* CSS Animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ForecastWidget;

