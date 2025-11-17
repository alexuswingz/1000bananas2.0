/**
 * Catalog API Service
 * Handles full product catalog CRUD operations
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'YOUR_API_GATEWAY_URL';

class CatalogAPI {
  /**
   * GET /products/catalog/{id} - Get single product
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
   * PUT /products/catalog/{id} - Update full product details
   */
  static async updateFull(id, productData) {
    try {
      const response = await fetch(`${API_BASE_URL}/products/catalog/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
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
}

export default CatalogAPI;

