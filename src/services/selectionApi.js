/**
 * Selection API Service
 * Connects to AWS Lambda via API Gateway for Selection CRUD operations
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'YOUR_API_GATEWAY_URL';

class SelectionAPI {
  /**
   * GET /products/selection - Fetch all selection products
   */
  static async getAll() {
    try {
      const response = await fetch(`${API_BASE_URL}/products/selection`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch products');
      }

      return data.data || [];
    } catch (error) {
      console.error('Error fetching selection products:', error);
      throw error;
    }
  }

  /**
   * POST /products/selection - Create new product
   */
  static async create(productData) {
    try {
      const response = await fetch(`${API_BASE_URL}/products/selection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create product');
      }

      return data.data;
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  }

  /**
   * PUT /products/selection/{id} - Update product
   */
  static async update(id, productData) {
    try {
      const response = await fetch(`${API_BASE_URL}/products/selection/${id}`, {
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

  /**
   * DELETE /products/selection/{id} - Delete product
   */
  static async delete(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/products/selection/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete product');
      }

      return data;
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }

  /**
   * PATCH /products/selection/{id}/launch - Launch product to catalog
   */
  static async launch(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/products/selection/${id}/launch`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to launch product');
      }

      return data;
    } catch (error) {
      console.error('Error launching product:', error);
      throw error;
    }
  }
}

export default SelectionAPI;

