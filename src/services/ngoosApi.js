/**
 * N-GOOS API Service
 * Handles Amazon product metrics, forecasting, and inventory planning
 */

const API_BASE_URL = 'https://sl2r0ip8zl.execute-api.ap-southeast-2.amazonaws.com';

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
   * GET /forecast/{asin} - Get forecast metrics
   * @param {string} asin - Product ASIN
   * @param {number} doiGoal - DOI goal in days (optional)
   * @param {number} leadTime - Lead time in days (optional)
   */
  static async getForecast(asin, doiGoal = null, leadTime = null) {
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
   * GET /chart/{asin} - Get chart data (historical + forecast)
   */
  static async getChartData(asin, weeks = 52, salesVelocityWeight = null, svVelocityWeight = null) {
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
   * GET /planning - Get planning table data
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @param {number} doiGoal - DOI goal in days (optional, defaults to 120)
   */
  static async getPlanning(page = 1, limit = 20, doiGoal = null) {
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
}

export default NgoosAPI;

