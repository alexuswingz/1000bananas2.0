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
   */
  static async getForecast(asin) {
    try {
      const response = await fetch(`${API_BASE_URL}/forecast/${asin}`, {
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
  static async getChartData(asin, weeks = 52) {
    try {
      const response = await fetch(`${API_BASE_URL}/chart/${asin}?weeks=${weeks}`, {
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
   */
  static async getPlanning(page = 1, limit = 20) {
    try {
      const response = await fetch(`${API_BASE_URL}/planning?page=${page}&limit=${limit}`, {
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
}

export default NgoosAPI;

