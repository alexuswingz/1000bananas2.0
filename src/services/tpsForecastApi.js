/**
 * TPS Forecast API Service
 * Connects to the Railway-backed Lambda API for forecast data
 * Replaces the old N-GOOS forecast endpoints
 */

// Toggle to switch between local and production API
const USE_LOCAL_API = false;

const LOCAL_API_URL = 'http://127.0.0.1:8000';
const RAILWAY_API_URL = process.env.REACT_APP_TPS_FORECAST_API_URL || 'https://web-production-015c7.up.railway.app';

const FORECAST_API_URL = USE_LOCAL_API ? LOCAL_API_URL : RAILWAY_API_URL;

class TpsForecastAPI {
  /**
   * GET /forecast/{asin} - Get full forecast for a single product
   * Returns units_to_make, DOI, all algorithms, forecast data
   * @param {string} asin - Product ASIN
   * @param {Object} doiSettings - Optional DOI settings {amazon_doi_goal, inbound_lead_time, manufacture_lead_time}
   *                               If provided, forecast will be recalculated with these settings
   */
  static async getForecast(asin, doiSettings = null) {
    try {
      // Build URL with DOI parameters if provided
      let url = `${FORECAST_API_URL}/forecast/${asin}`;
      if (doiSettings) {
        const params = new URLSearchParams();
        if (doiSettings.amazon_doi_goal !== undefined) {
          params.append('amazon_doi_goal', doiSettings.amazon_doi_goal);
        }
        if (doiSettings.inbound_lead_time !== undefined) {
          params.append('inbound_lead_time', doiSettings.inbound_lead_time);
        }
        if (doiSettings.manufacture_lead_time !== undefined) {
          params.append('manufacture_lead_time', doiSettings.manufacture_lead_time);
        }
        if (params.toString()) {
          url += '?' + params.toString();
        }
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.detail || 'Failed to fetch forecast');
      }

      return data;
    } catch (error) {
      console.error(`Error fetching TPS forecast for ${asin}:`, error);
      throw error;
    }
  }

  /**
   * GET /forecast/ - Get forecasts for all products (from cache)
   * Fast endpoint - reads from pre-computed cache with accurate algorithm values
   * If doiSettings are provided, uses /recalculate-doi endpoint for instant accurate recalculation
   */
  static async getAllForecasts(doiSettings = null) {
    try {
      let url;
      let source;
      
      if (doiSettings && (doiSettings.amazon_doi_goal !== undefined || 
          doiSettings.inbound_lead_time !== undefined || 
          doiSettings.manufacture_lead_time !== undefined)) {
        // Use the new instant accurate recalculation endpoint
        const params = new URLSearchParams();
        if (doiSettings.amazon_doi_goal !== undefined) {
          params.append('amazon_doi_goal', doiSettings.amazon_doi_goal);
        }
        if (doiSettings.inbound_lead_time !== undefined) {
          params.append('inbound_lead_time', doiSettings.inbound_lead_time);
        }
        if (doiSettings.manufacture_lead_time !== undefined) {
          params.append('manufacture_lead_time', doiSettings.manufacture_lead_time);
        }
        url = `${FORECAST_API_URL}/forecast/recalculate-doi?${params.toString()}`;
        source = 'recalculate-doi';
        console.log('Using instant DOI recalculation endpoint (accurate + fast)');
      } else {
        // Use cached endpoint for default values
        url = `${FORECAST_API_URL}/forecast/`;
        source = 'railway-cache';
        console.log('Using cached forecast endpoint (default DOI values)');
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.detail || 'Failed to fetch all forecasts');
      }

      // Map our backend response format to expected format
      return {
        success: true,
        products: data.forecasts || [],
        total_products: data.total_products || 0,
        source: source,
        count: data.total_products || 0,
        doi_settings: data.doi_settings, // Include DOI settings that were used
      };
    } catch (error) {
      console.error('Error fetching all TPS forecasts:', error);
      throw error;
    }
  }

  /**
   * GET /forecast/ - Get dashboard summary with counts (from all forecasts response)
   * Returns total products, units_to_make, critical/low/good counts
   */
  static async getSummary() {
    try {
      const response = await fetch(`${FORECAST_API_URL}/forecast/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.detail || 'Failed to fetch summary');
      }

      // Extract summary from all forecasts response
      return {
        success: true,
        total_products: data.total_products || 0,
        critical_count: data.critical_count || 0,
        low_count: data.low_count || 0,
        good_count: data.good_count || 0,
        total_units_to_make: data.total_units_to_make || 0,
      };
    } catch (error) {
      console.error('Error fetching TPS forecast summary:', error);
      throw error;
    }
  }

  /**
   * Get forecasts for specific ASINs (fetches all and filters)
   * @param {Array<string>} asins - List of ASINs to fetch
   */
  static async getBatchForecasts(asins) {
    try {
      // Fetch all forecasts and filter by ASINs
      const allData = await this.getAllForecasts();
      const asinSet = new Set(asins);
      const filtered = (allData.products || []).filter(p => asinSet.has(p.asin));

      return {
        success: true,
        products: filtered,
        count: filtered.length,
      };
    } catch (error) {
      console.error('Error fetching batch TPS forecasts:', error);
      throw error;
    }
  }

  /**
   * GET /forecast/{asin}/sales - Get sales data for charting
   * Returns historical sales + smoothed data + forecast
   * @param {string} asin - Product ASIN
   * @param {number} weeks - Number of weeks to include (default 104 = 2 years, ignored - API returns all data)
   */
  static async getChartData(asin, weeks = 104) {
    try {
      const response = await fetch(`${FORECAST_API_URL}/forecast/${asin}/sales`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.detail || 'Failed to fetch chart data');
      }

      // Transform our backend format to expected format
      // Our backend returns: { asin, data: [{date, units_sold, smoothed, prior_year, forecast, is_past, is_future}] }
      const historical = (data.data || []).filter(d => d.is_past).map(d => ({
        week_end: d.date,
        units_sold: d.units_sold || 0,
        units_smooth: d.smoothed || 0,
      }));

      const forecast = (data.data || []).filter(d => d.is_future).map(d => ({
        week_end: d.date,
        adj_forecast: d.forecast || 0,
        units_smooth: d.prior_year || 0,
      }));

      return {
        success: true,
        asin: data.asin,
        historical,
        forecast,
      };
    } catch (error) {
      console.error(`Error fetching TPS chart data for ${asin}:`, error);
      throw error;
    }
  }

  /**
   * GET /forecast/recalculate-doi - Instant accurate DOI recalculation using cached cumulative forecasts
   * This is fast (~1-2 seconds) AND accurate (uses the exact same calculation as single forecast)
   * Use this when user changes DOI settings and needs instant accurate results
   * @param {Object} doiSettings - DOI settings {amazon_doi_goal, inbound_lead_time, manufacture_lead_time}
   * @param {Object} filters - Optional filters {brand, account, status}
   */
  static async recalculateDoi(doiSettings, filters = {}) {
    try {
      const params = new URLSearchParams();
      
      // Add DOI parameters
      if (doiSettings.amazon_doi_goal !== undefined) {
        params.append('amazon_doi_goal', doiSettings.amazon_doi_goal);
      }
      if (doiSettings.inbound_lead_time !== undefined) {
        params.append('inbound_lead_time', doiSettings.inbound_lead_time);
      }
      if (doiSettings.manufacture_lead_time !== undefined) {
        params.append('manufacture_lead_time', doiSettings.manufacture_lead_time);
      }
      
      // Add filters
      if (filters.status_filter) {
        params.append('status_filter', filters.status_filter);
      }
      if (filters.algorithm_filter) {
        params.append('algorithm_filter', filters.algorithm_filter);
      }
      
      const url = `${FORECAST_API_URL}/forecast/recalculate-doi?${params.toString()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.detail || 'Failed to recalculate forecasts');
      }

      // Map response to expected format
      return {
        success: true,
        products: data.forecasts || [],
        total_products: data.total_products || 0,
        source: 'recalculate-doi',
        count: data.total_products || 0,
        doi_settings: data.doi_settings,
      };
    } catch (error) {
      console.error('Error in DOI recalculation:', error);
      throw error;
    }
  }

  /**
   * @deprecated Use recalculateDoi instead - it's both fast AND accurate
   */
  static async fastRecalculateForecasts(doiSettings, filters = {}) {
    return this.recalculateDoi(doiSettings, filters);
  }

  /**
   * POST /forecast/refresh-cache - Refresh the forecast cache
   * Should be called periodically or manually to update cached data
   * Note: This takes a few minutes to complete
   */
  static async refreshCache() {
    try {
      const response = await fetch(`${FORECAST_API_URL}/forecast/refresh-cache`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.detail || 'Failed to refresh cache');
      }

      return {
        success: true,
        message: data.message || 'Cache refresh initiated',
      };
    } catch (error) {
      console.error('Error refreshing TPS forecast cache:', error);
      throw error;
    }
  }

  /**
   * Get planning data in the format expected by the production planning UI
   * Maps TPS forecast data to the planning table format
   */
  static async getPlanning() {
    try {
      const data = await this.getAllForecasts();
      
      // Map to planning format (data.products is already mapped from getAllForecasts)
      const products = (data.products || []).map(product => ({
        asin: product.asin,
        product_name: product.product_name,
        size: extractSize(product.product_name),
        algorithm: product.algorithm,
        age_months: product.age_months,
        units_to_make: product.units_to_make || 0,
        doi_total: product.doi_total || product.doi_total_days || 0,
        doi_fba: product.doi_fba || product.doi_fba_days || 0,
        total_inventory: product.total_inventory || 0,
        fba_available: product.fba_available || 0,
        status: product.status,
        needs_seasonality: false, // Our backend doesn't track this separately
        image_url: product.image_url, // Shopify product image
        imageUrl: product.image_url,  // Alternative casing for compatibility
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
function extractSize(productName) {
  if (!productName) return null;
  
  // Common size patterns
  const patterns = [
    /(\d+\s*oz)/i,           // "8oz", "8 oz"
    /(\d+\s*ml)/i,           // "250ml"
    /(Quart)/i,              // "Quart"
    /(Gallon)/i,             // "Gallon"
    /(\d+\s*Gallon)/i,       // "5 Gallon"
  ];
  
  for (const pattern of patterns) {
    const match = productName.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

export default TpsForecastAPI;
