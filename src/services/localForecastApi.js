/**
 * Local Forecast API Service
 * Connects to localhost Flask API for testing
 * Switch between local and production by changing USE_LOCAL_API
 */

// Toggle this to switch between local and production
const USE_LOCAL_API = false;

const LOCAL_API_URL = 'http://127.0.0.1:5000/api';
const RAILWAY_API_URL = 'https://web-production-e39d6.up.railway.app/api';

const API_URL = USE_LOCAL_API ? LOCAL_API_URL : RAILWAY_API_URL;

class LocalForecastAPI {
  /**
   * GET /forecast/all - Get forecasts for all products
   * Returns: { forecasts: [...], total, performance, settings }
   * 
   * @param {Object} options - Query options
   * @param {string} options.brand - Filter by brand name
   * @param {string} options.sort - Sort field ('doi', 'units', 'product', 'fba')
   * @param {string} options.order - Sort order ('asc', 'desc')
   * @param {number} options.amazonDoiGoal - Amazon DOI goal in days (default: 93)
   * @param {number} options.inboundLeadTime - Inbound lead time in days (default: 30)
   * @param {number} options.manufactureLeadTime - Manufacturing lead time in days (default: 7)
   */
  static async getAllForecasts(options = {}) {
    try {
      const {
        brand = null,
        sort = 'doi',
        order = 'asc',
        amazonDoiGoal = null,
        inboundLeadTime = null,
        manufactureLeadTime = null,
      } = options;
      
      let url = `${API_URL}/forecast/all?sort=${sort}&order=${order}`;
      if (brand) {
        url += `&brand=${encodeURIComponent(brand)}`;
      }
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
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch forecasts');
      }

      return {
        success: true,
        products: data.products || data.forecasts,
        count: data.total,
        settings: data.settings,
        performance: data.performance,
      };
    } catch (error) {
      console.error('Error fetching all forecasts:', error);
      throw error;
    }
  }

  /**
   * GET /forecast/{asin} - Get forecast for single product (Settings view)
   */
  static async getForecast(asin) {
    try {
      const response = await fetch(`${API_URL}/forecast/${asin}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch forecast');
      }

      return {
        success: true,
        asin: data.product_info.child_asin,
        product_name: data.product_info.product,
        size: data.product_info.size,
        units_to_make: data.production_forecast.units_to_make,
        doi_total: data.production_forecast.doi_total_days,
        doi_fba: data.production_forecast.doi_fba_available_days,
        algorithm: data.production_forecast.algorithm,
        total_inventory: data.total_inventory,
        age_months: data.product_age.months,
        settings: data.global_settings,
      };
    } catch (error) {
      console.error(`Error fetching forecast for ${asin}:`, error);
      throw error;
    }
  }

  /**
   * GET /forecast/{asin}/chart - Get full chart data for N-GOOS modal
   * Returns: product info, inventory, DOI, labels, historical, forecast arrays
   */
  static async getChartData(asin) {
    try {
      const response = await fetch(`${API_URL}/forecast/${asin}/chart`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch chart data');
      }

      return {
        success: true,
        asin: data.asin,
        algorithm: data.algorithm,
        product_name: data.product.name,
        size: data.product.size,
        brand: data.product.brand,
        inventory: {
          fba: data.inventory.fba,
          awd: data.inventory.awd,
        },
        labels: data.labels,
        add_units: data.add_units,
        units_to_make: data.units_to_make,
        doi: data.doi,
        historical: data.historical,
        forecast: data.forecast,
        metadata: data.metadata,
      };
    } catch (error) {
      console.error(`Error fetching chart data for ${asin}:`, error);
      throw error;
    }
  }

  /**
   * GET /labels - Get all label inventory
   */
  static async getLabels() {
    try {
      const response = await fetch(`${API_URL}/labels`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch labels');
      }

      return {
        success: true,
        labels: data.labels,
        total: data.total,
        total_in_stock: data.total_labels_in_stock,
      };
    } catch (error) {
      console.error('Error fetching labels:', error);
      throw error;
    }
  }

  /**
   * GET /labels/needed - Get labels needed based on forecast
   */
  static async getLabelsNeeded() {
    try {
      const response = await fetch(`${API_URL}/labels/needed`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch labels needed');
      }

      return {
        success: true,
        labels: data.labels,
        total_products: data.total_products,
        summary: data.summary,
      };
    } catch (error) {
      console.error('Error fetching labels needed:', error);
      throw error;
    }
  }

  /**
   * GET /labels/schedule - Get label production schedule (grouped by label_id, DOI-based)
   */
  static async getLabelsSchedule() {
    try {
      const response = await fetch(`${API_URL}/labels/schedule`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch label schedule');
      }

      return {
        success: true,
        labels: data.labels,
        total_label_designs: data.total_label_designs,
        total_products: data.total_products,
        summary: data.summary,
      };
    } catch (error) {
      console.error('Error fetching label schedule:', error);
      throw error;
    }
  }

  /**
   * Get planning data formatted for production planning table
   * Maps to same structure expected by planning components
   */
  static async getPlanning() {
    try {
      const data = await this.getAllForecasts();
      
      // Map to planning format
      const products = (data.products || []).map(product => ({
        asin: product.asin,
        product_name: product.product,
        size: product.size,
        brand: product.brand,
        algorithm: product.algorithm,
        qty: product.units_to_make || 0,
        units_to_make: product.units_to_make || 0,
        doi_total: product.doi_total_days || 0,
        doi_fba: product.doi_fba_days || 0,
      }));

      return {
        success: true,
        count: data.count,
        products,
        performance: data.performance,
      };
    } catch (error) {
      console.error('Error fetching planning data:', error);
      throw error;
    }
  }
}

export default LocalForecastAPI;
