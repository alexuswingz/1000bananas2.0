/**
 * TPS Forecast API Service
 * Connects to the Railway-backed Lambda API for forecast data
 * Replaces the old N-GOOS forecast endpoints
 */

// Toggle to switch between local and production API
const USE_LOCAL_API = false;

const LOCAL_API_URL = 'http://127.0.0.1:5000/api';
const RAILWAY_API_URL = 'https://web-production-e39d6.up.railway.app/api';

const FORECAST_API_URL = USE_LOCAL_API ? LOCAL_API_URL : RAILWAY_API_URL;

class TpsForecastAPI {
  /**
   * GET /forecast/{asin} - Get full forecast for a single product
   * Returns units_to_make, DOI, all algorithms, forecast data
   */
  static async getForecast(asin) {
    try {
      const response = await fetch(`${FORECAST_API_URL}/forecast/${asin}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch forecast');
      }

      return data;
    } catch (error) {
      console.error(`Error fetching TPS forecast for ${asin}:`, error);
      throw error;
    }
  }

  /**
   * GET /forecast/all - Get forecasts for all products (from cache)
   * Fast endpoint - reads from pre-computed cache
   */
  static async getAllForecasts() {
    try {
      const response = await fetch(`${FORECAST_API_URL}/forecast/all`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch all forecasts');
      }

      return data;
    } catch (error) {
      console.error('Error fetching all TPS forecasts:', error);
      throw error;
    }
  }

  /**
   * GET /forecast/summary - Get dashboard summary with counts
   * Returns total products, units_to_make, critical/low/good counts
   */
  static async getSummary() {
    try {
      const response = await fetch(`${FORECAST_API_URL}/forecast/summary`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch summary');
      }

      return data;
    } catch (error) {
      console.error('Error fetching TPS forecast summary:', error);
      throw error;
    }
  }

  /**
   * POST /forecast/batch - Get forecasts for specific ASINs
   * @param {Array<string>} asins - List of ASINs to fetch
   */
  static async getBatchForecasts(asins) {
    try {
      const response = await fetch(`${FORECAST_API_URL}/forecast/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ asins }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch batch forecasts');
      }

      return data;
    } catch (error) {
      console.error('Error fetching batch TPS forecasts:', error);
      throw error;
    }
  }

  /**
   * GET /forecast/{asin}/chart - Get chart data for graphing
   * Returns historical sales + future forecast data points
   * @param {string} asin - Product ASIN
   * @param {number} weeks - Number of weeks to include (default 104 = 2 years)
   */
  static async getChartData(asin, weeks = 104) {
    try {
      const response = await fetch(`${FORECAST_API_URL}/forecast/${asin}/chart?weeks=${weeks}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch chart data');
      }

      return data;
    } catch (error) {
      console.error(`Error fetching TPS chart data for ${asin}:`, error);
      throw error;
    }
  }

  /**
   * POST /forecast/refresh - Refresh the forecast cache
   * Should be called periodically or manually to update cached data
   * Note: This takes a few minutes to complete
   */
  static async refreshCache() {
    try {
      const response = await fetch(`${FORECAST_API_URL}/forecast/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to refresh cache');
      }

      return data;
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
      
      // Map to planning format
      const products = (data.products || []).map(product => ({
        asin: product.asin,
        product_name: product.product_name,
        size: extractSize(product.product_name),
        algorithm: product.algorithm,
        age_months: product.age_months,
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
