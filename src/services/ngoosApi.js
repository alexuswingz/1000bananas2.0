/**
 * N-GOOS API Service
 * Handles Amazon product metrics, forecasting, and inventory planning
 * 
 * API ENDPOINTS:
 * ==============
 * RAILWAY API (TPS_FORECAST_API_URL) - Used for:
 *   - /forecast/{asin} - Single product forecast
 *   - /forecast/all - All products forecast  
 *   - /forecast/{asin}/chart - Chart data for N-GOOS modal
 *   - /labels/* - Label inventory and needs
 * 
 * AWS LAMBDA API (API_BASE_URL) - Used for:
 *   - /products - Product catalog
 *   - /product/{asin} - Product details
 *   - /metrics/* - Sales metrics
 *   - /ads-chart/* - Ads data
 *   - /supply-chain/* - Supply chain data
 *   - Other legacy endpoints
 */

import TpsForecastAPI from './tpsForecastApi';

// Toggle to switch between local and production API
const USE_LOCAL_API = false;

// Legacy AWS Lambda API - for catalog, metrics, supply chain
const API_BASE_URL = 'https://sl2r0ip8zl.execute-api.ap-southeast-2.amazonaws.com';

// Railway API - for forecasts, charts, labels (our new backend)
const LOCAL_API_URL = 'http://127.0.0.1:5000/api';
const RAILWAY_API_URL = 'https://web-production-e39d6.up.railway.app/api';
const TPS_FORECAST_API_URL = USE_LOCAL_API ? LOCAL_API_URL : RAILWAY_API_URL;

class NgoosAPI {
  /**
   * GET /products - Get all products
   */
  static async getAllProducts() {
    try {
      const response = await fetch(`${API_BASE_URL}/products`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch products');
      }

      return data.products || [];
    } catch (error) {
      console.error('Error fetching N-GOOS products:', error);
      throw error;
    }
  }

  /**
   * GET /product/{asin} - Get product details and inventory
   */
  static async getProductDetails(asin) {
    try {
      const response = await fetch(`${API_BASE_URL}/product/${asin}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch product details');
      }

      return data;
    } catch (error) {
      console.error(`Error fetching product details for ${asin}:`, error);
      throw error;
    }
  }

  /**
   * GET /forecast/{asin} - Get forecast metrics from TPS Railway API
   * Uses age-based algorithms: 0m-6m, 6m-18m, 18m+
   * Now uses the TPS Forecast API (Railway-backed Lambda) for accurate data
   * @param {string} asin - Product ASIN
   * @param {number|object} doiGoalOrSettings - DOI goal in days OR settings object with amazonDoiGoal, inboundLeadTime, manufactureLeadTime
   * @param {number} leadTime - Lead time in days (optional, deprecated - use settings object instead)
   */
  static async getForecast(asin, doiGoalOrSettings = null, leadTime = null) {
    try {
      // Build URL with query parameters for DOI settings
      let url = `${TPS_FORECAST_API_URL}/forecast/${asin}`;
      const params = [];
      
      // Handle both old signature (doiGoal, leadTime) and new signature (settings object)
      if (doiGoalOrSettings && typeof doiGoalOrSettings === 'object') {
        // New signature: settings object
        if (doiGoalOrSettings.amazonDoiGoal) {
          params.push(`amazon_doi_goal=${doiGoalOrSettings.amazonDoiGoal}`);
        }
        if (doiGoalOrSettings.inboundLeadTime) {
          params.push(`inbound_lead_time=${doiGoalOrSettings.inboundLeadTime}`);
        }
        if (doiGoalOrSettings.manufactureLeadTime) {
          params.push(`manufacture_lead_time=${doiGoalOrSettings.manufactureLeadTime}`);
        }
      } else if (doiGoalOrSettings && typeof doiGoalOrSettings === 'number') {
        // Old signature: single DOI goal number - convert to settings
        // Calculate approximate breakdown (DOI goal is typically amazonDoiGoal + leadTimes)
        const totalDoi = doiGoalOrSettings;
        const inboundLead = leadTime || 30;
        const mfgLead = 7;
        const amazonDoi = Math.max(30, totalDoi - inboundLead - mfgLead);
        
        params.push(`amazon_doi_goal=${amazonDoi}`);
        params.push(`inbound_lead_time=${inboundLead}`);
        params.push(`manufacture_lead_time=${mfgLead}`);
      }
      
      if (params.length > 0) {
        url += `?${params.join('&')}`;
      }
      
      // Use TPS Forecast API for accurate units_to_make calculation
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch forecast from TPS API');
      }

      // Map TPS API response to expected format for compatibility
      return {
        asin: data.asin || data.product_info?.child_asin,
        product_name: data.product_name || data.product_info?.product,
        size: data.size || data.product_info?.size,
        units_to_make: data.units_to_make || data.production_forecast?.units_to_make || 0,
        doi_total: data.doi_total_days || data.production_forecast?.doi_total_days || 0,
        doi_fba: data.doi_fba_days || data.production_forecast?.doi_fba_available_days || 0,
        total_inventory: data.inventory?.total_inventory || data.total_inventory || 0,
        fba_available: data.inventory?.fba_available || 0,
        fba_inbound: data.inventory?.fba_inbound || 0,
        fba_reserved: data.inventory?.fba_reserved || 0,
        awd_available: data.inventory?.awd_available || 0,
        age_months: data.age_months || (data.product_age?.months || 0),
        algorithm: data.algorithm || data.production_forecast?.algorithm || '18m+',
        needs_seasonality: data.needs_seasonality || false,
        // Include DOI goal settings used
        doi_goal_days: data.global_settings?.total_doi_days_goal || (doiGoalOrSettings?.amazonDoiGoal ? 
          (doiGoalOrSettings.amazonDoiGoal + doiGoalOrSettings.inboundLeadTime + doiGoalOrSettings.manufactureLeadTime) : 
          (typeof doiGoalOrSettings === 'number' ? doiGoalOrSettings : 130)),
        // Keep original response for any additional fields
        ...data
      };
    } catch (error) {
      console.error(`Error fetching TPS forecast for ${asin}:`, error);
      // Fallback to old API if TPS fails
      console.warn('Falling back to legacy V2.2 API...');
      try {
        let url = `${API_BASE_URL}/v22/forecast/${asin}`;
        const params = [];
        const doiGoal = typeof doiGoalOrSettings === 'number' ? doiGoalOrSettings : 
                        (doiGoalOrSettings?.amazonDoiGoal ? doiGoalOrSettings.amazonDoiGoal + doiGoalOrSettings.inboundLeadTime + doiGoalOrSettings.manufactureLeadTime : null);
        if (doiGoal !== null && doiGoal !== undefined) {
          params.push(`doi_goal=${doiGoal}`);
        }
        if (leadTime !== null && leadTime !== undefined) {
          params.push(`lead_time=${leadTime}`);
        }
        if (params.length > 0) {
          url += `?${params.join('&')}`;
        }
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch forecast');
        }
        return data;
      } catch (fallbackError) {
        console.error(`Fallback also failed for ${asin}:`, fallbackError);
        throw error; // Throw original error
      }
    }
  }

  /**
   * GET /forecast/{asin} - Get V1.5 forecast metrics (legacy)
   * @param {string} asin - Product ASIN
   * @param {number} doiGoal - DOI goal in days (optional)
   * @param {number} leadTime - Lead time in days (optional)
   */
  static async getForecastV15(asin, doiGoal = null, leadTime = null) {
    try {
      let url = `${API_BASE_URL}/forecast/${asin}`;
      const params = [];
      if (doiGoal !== null && doiGoal !== undefined) {
        params.push(`doi_goal=${doiGoal}`);
      }
      if (leadTime !== null && leadTime !== undefined) {
        params.push(`lead_time=${leadTime}`);
      }
      if (params.length > 0) {
        url += `?${params.join('&')}`;
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch forecast');
      }

      return data;
    } catch (error) {
      console.error(`Error fetching forecast for ${asin}:`, error);
      throw error;
    }
  }

  /**
   * GET /forecast/{asin}/chart - Get chart data from TPS Forecast API
   * Returns data in the expected chart format
   */
  static async getChartData(asin, weeks = 104, salesVelocityWeight = null, svVelocityWeight = null) {
    try {
      // Use TPS Forecast API for chart data
      const tpsData = await TpsForecastAPI.getChartData(asin, weeks);
      
      // Check if data is already in the correct format (from our Flask API)
      // Flask API returns: { historical: [{week_end, units_sold, units_smooth}], forecast: [{week_end, adj_forecast, units_smooth}] }
      const sampleHistorical = tpsData.historical?.[0];
      const isAlreadyFormatted = sampleHistorical && ('week_end' in sampleHistorical || 'units_sold' in sampleHistorical);
      
      if (isAlreadyFormatted) {
        // Data is already in the correct format from Flask API
        return {
          success: true,
          asin: tpsData.asin,
          product_name: tpsData.product?.name || tpsData.product_name,
          algorithm: tpsData.algorithm,
          historical: tpsData.historical || [],
          forecast: tpsData.forecast || [],
          today: tpsData.metadata?.today || tpsData.today,
          needs_seasonality: tpsData.needs_seasonality,
          // Include additional data from Flask API
          inventory: tpsData.inventory,
          doi: tpsData.doi,
          units_to_make: tpsData.units_to_make,
          metadata: tpsData.metadata,
        };
      }
      
      // Legacy format transformation (for old API compatibility)
      // Old format: { historical: [{date, units}], forecast: [{date, units}] }
      const historical = (tpsData.historical || []).map((item, index, arr) => {
        // Calculate simple 3-week moving average for smoothing
        let smooth = item.units;
        if (index >= 2) {
          const prev3 = arr.slice(index - 2, index + 1).map(d => d.units || 0);
          smooth = prev3.reduce((a, b) => a + b, 0) / 3;
        }
        
        return {
          week_end: item.date || item.week_end,
          units_sold: item.units || item.units_sold || 0,
          units_smooth: Math.round(smooth),
        };
      });
      
      const forecast = (tpsData.forecast || []).map(item => ({
        week_end: item.date || item.week_end,
        adj_forecast: item.units || item.adj_forecast || 0,
        units_smooth: item.units || item.units_smooth || 0,
      }));
      
      return {
        success: true,
        asin: tpsData.asin,
        product_name: tpsData.product_name,
        algorithm: tpsData.algorithm,
        historical,
        forecast,
        today: tpsData.today,
        needs_seasonality: tpsData.needs_seasonality,
      };
    } catch (error) {
      console.error(`Error fetching TPS chart data for ${asin}:`, error);
      throw error;
      
      // DISABLED: Old API fallback - now using Railway API only
      // If you need to re-enable, uncomment the block below:
      /*
      console.log('Falling back to legacy chart API...');
      try {
        let url = `${API_BASE_URL}/v22/chart/${asin}?weeks=${weeks}`;
        
        if (salesVelocityWeight !== null && salesVelocityWeight !== 25) {
          url += `&sales_velocity_weight=${salesVelocityWeight}`;
        }
        if (svVelocityWeight !== null && svVelocityWeight !== 15) {
          url += `&sv_velocity_weight=${svVelocityWeight}`;
        }
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch chart data');
        }

        return data;
      } catch (fallbackError) {
        console.error('Fallback chart API also failed:', fallbackError);
        throw error;
      }
      */
    }
  }

  /**
   * GET /chart/{asin} - Get V1.5 chart data (legacy)
   */
  static async getChartDataV15(asin, weeks = 52, salesVelocityWeight = null, svVelocityWeight = null) {
    try {
      let url = `${API_BASE_URL}/chart/${asin}?weeks=${weeks}`;
      
      // Add weight parameters if provided
      if (salesVelocityWeight !== null && salesVelocityWeight !== 25) {
        url += `&sales_velocity_weight=${salesVelocityWeight}`;
      }
      if (svVelocityWeight !== null && svVelocityWeight !== 15) {
        url += `&sv_velocity_weight=${svVelocityWeight}`;
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch chart data');
      }

      return data;
    } catch (error) {
      console.error(`Error fetching chart data for ${asin}:`, error);
      throw error;
    }
  }

  /**
   * GET /v22/planning - Get V2.2 planning table data
   * Uses age-based algorithms for all products
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @param {number} doiGoal - DOI goal in days (optional, defaults to 120)
   * @param {boolean} useCache - Whether to use cached data (default: true)
   */
  static async getPlanning(page = 1, limit = 20, doiGoal = null, useCache = true) {
    try {
      let url = `${API_BASE_URL}/v22/planning?page=${page}&limit=${limit}&use_cache=${useCache}`;
      if (doiGoal !== null && doiGoal !== undefined) {
        url += `&doi_goal=${doiGoal}`;
      }
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch planning data');
      }

      return data;
    } catch (error) {
      console.error('Error fetching planning data:', error);
      throw error;
    }
  }

  /**
   * GET /planning - Get V1.5 planning table data (legacy)
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @param {number} doiGoal - DOI goal in days (optional, defaults to 120)
   */
  static async getPlanningV15(page = 1, limit = 20, doiGoal = null) {
    try {
      let url = `${API_BASE_URL}/planning?page=${page}&limit=${limit}`;
      if (doiGoal !== null && doiGoal !== undefined) {
        url += `&doi_goal=${doiGoal}`;
      }
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch planning data');
      }

      return data;
    } catch (error) {
      console.error('Error fetching planning data:', error);
      throw error;
    }
  }

  /**
   * GET /metrics/{asin} - Get sales and ads metrics for a product
   * This endpoint returns both sales and advertising data
   */
  static async getMetrics(asin, days = 30) {
    try {
      const response = await fetch(`${API_BASE_URL}/metrics/${asin}?days=${days}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch metrics');
      }

      return data;
    } catch (error) {
      console.error(`Error fetching metrics for ${asin}:`, error);
      throw error;
    }
  }

  /**
   * GET /sales-chart/{asin} - Get sales chart data with time-series
   */
  static async getSalesChart(asin, days = 30) {
    try {
      const response = await fetch(`${API_BASE_URL}/sales-chart/${asin}?days=${days}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch sales chart data');
      }

      return data;
    } catch (error) {
      console.error(`Error fetching sales chart for ${asin}:`, error);
      throw error;
    }
  }

  static async getAdsChart(asin, days = 30) {
    try {
      const response = await fetch(`${API_BASE_URL}/ads-chart/${asin}?days=${days}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch ads chart data');
      }

      return data;
    } catch (error) {
      console.error(`Error fetching ads chart for ${asin}:`, error);
      throw error;
    }
  }

  /**
   * GET /weekly-metrics/{asin} - Get weekly metrics data
   */
  static async getWeeklyMetrics(asin, year = new Date().getFullYear()) {
    try {
      const response = await fetch(`${API_BASE_URL}/weekly-metrics/${asin}?year=${year}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch weekly metrics');
      }

      return data;
    } catch (error) {
      console.error(`Error fetching weekly metrics for ${asin}:`, error);
      throw error;
    }
  }

  // ============================================
  // TPS FORECAST API (NEW - Railway/Lambda)
  // ============================================

  /**
   * GET /forecast/{asin} - Get TPS forecast for a single product
   * Uses age-based algorithms from Railway database
   */
  static async getTpsForecast(asin) {
    try {
      const response = await fetch(`${TPS_FORECAST_API_URL}/forecast/${asin}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch TPS forecast');
      }

      return data;
    } catch (error) {
      console.error(`Error fetching TPS forecast for ${asin}:`, error);
      throw error;
    }
  }

  /**
   * GET /forecast/all - Get TPS forecasts for all products
   * Supports custom DOI settings
   * 
   * @param {Object} options - Settings options
   * @param {number} options.amazonDoiGoal - Amazon DOI goal in days (default: 93)
   * @param {number} options.inboundLeadTime - Inbound lead time in days (default: 30)
   * @param {number} options.manufactureLeadTime - Manufacturing lead time in days (default: 7)
   * @param {string} options.sort - Sort field ('doi', 'units', 'product', 'fba')
   * @param {string} options.order - Sort order ('asc', 'desc')
   */
  static async getTpsAllForecasts(options = {}) {
    try {
      const {
        amazonDoiGoal = null,
        inboundLeadTime = null,
        manufactureLeadTime = null,
        sort = 'doi',
        order = 'asc',
      } = options;
      
      let url = `${TPS_FORECAST_API_URL}/forecast/all?sort=${sort}&order=${order}`;
      
      // Add DOI settings if provided
      if (amazonDoiGoal !== null) {
        url += `&amazon_doi_goal=${amazonDoiGoal}`;
      }
      if (inboundLeadTime !== null) {
        url += `&inbound_lead_time=${inboundLeadTime}`;
      }
      if (manufactureLeadTime !== null) {
        url += `&manufacture_lead_time=${manufactureLeadTime}`;
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch TPS forecasts');
      }

      return data;
    } catch (error) {
      console.error('Error fetching all TPS forecasts:', error);
      throw error;
    }
  }

  /**
   * GET /forecast/summary - Get TPS dashboard summary
   * Returns counts and aggregated metrics
   */
  static async getTpsSummary() {
    try {
      const response = await fetch(`${TPS_FORECAST_API_URL}/forecast/summary`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch TPS summary');
      }

      return data;
    } catch (error) {
      console.error('Error fetching TPS forecast summary:', error);
      throw error;
    }
  }

  /**
   * Get TPS planning data formatted for UI
   * Maps to same structure expected by planning components
   */
  static async getTpsPlanning() {
    try {
      const data = await this.getTpsAllForecasts();
      
      // Map to planning format with units_to_make as qty
      const products = (data.products || []).map(product => ({
        asin: product.asin,
        product_name: product.product_name,
        size: extractSizeFromName(product.product_name),
        algorithm: product.algorithm,
        age_months: product.age_months,
        qty: product.units_to_make || 0,           // QTY = units_to_make
        units_to_make: product.units_to_make || 0,
        doi_total: product.doi_total_days || 0,
        doi_fba: product.doi_fba_days || 0,
        total_inventory: product.inventory?.total_inventory || product.total_inventory || 0,
        fba_available: product.inventory?.fba_available || product.fba_available || 0,
        status: product.status,
        needs_seasonality: product.needs_seasonality || false,
      }));

      return {
        success: true,
        source: data.source,
        count: data.count,
        products,
      };
    } catch (error) {
      console.error('Error fetching TPS planning data:', error);
      throw error;
    }
  }
}

/**
 * Extract size from product name (e.g., "8oz", "Quart", "Gallon")
 */
function extractSizeFromName(productName) {
  if (!productName) return null;
  
  const patterns = [
    /(\d+\s*oz)/i,
    /(\d+\s*ml)/i,
    /(Quart)/i,
    /(Gallon)/i,
    /(\d+\s*Gallon)/i,
  ];
  
  for (const pattern of patterns) {
    const match = productName.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

export default NgoosAPI;

