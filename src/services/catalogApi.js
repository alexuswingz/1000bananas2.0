/**
 * Catalog API Service
 * Handles full product catalog CRUD operations
 */

const API_BASE_URL = 'https://sl2r0ip8zl.execute-api.ap-southeast-2.amazonaws.com';

class CatalogAPI {
  /**
   * GET /products/catalog - Fetch parent products
   */
  static async getParents() {
    try {
      const response = await fetch(`${API_BASE_URL}/products/catalog`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch catalog products');
      }

      return data.data || [];
    } catch (error) {
      console.error('Error fetching catalog products:', error);
      throw error;
    }
  }

  /**
   * GET /products/catalog/children - Fetch child products (all variations)
   */
  static async getChildren() {
    try {
      const response = await fetch(`${API_BASE_URL}/products/catalog/children`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch catalog children');
      }

      return data.data || [];
    } catch (error) {
      console.error('Error fetching catalog children:', error);
      throw error;
    }
  }

  /**
   * GET /products/catalog/{id} - Get product details with all tabs data
   */
  static async getById(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/products/catalog/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch product');
      }

      const data = await response.json();
      return data.data || data;
    } catch (error) {
      console.error('Error fetching product:', error);
      // Return empty object if fetch fails - form will use passed productData
      return {};
    }
  }

  /**
   * PUT /products/catalog/{id} - Update product details (supports partial updates)
   */
  static async update(id, updates) {
    try {
      const response = await fetch(`${API_BASE_URL}/products/catalog/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update product');
      }

      return data.data;
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }

  /**
   * Alias for backward compatibility
   */
  static async updateFull(id, productData) {
    return this.update(id, productData);
  }
}

export default CatalogAPI;

