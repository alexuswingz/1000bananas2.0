/**
 * Development API Service
 * Fetches product development status from catalog database
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'YOUR_API_GATEWAY_URL';

class DevelopmentAPI {
  /**
   * GET /products/development - Fetch all products with section statuses
   */
  static async getAll() {
    try {
      const response = await fetch(`${API_BASE_URL}/products/development`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch development data');
      }

      return data.data || [];
    } catch (error) {
      console.error('Error fetching development data:', error);
      throw error;
    }
  }
}

export default DevelopmentAPI;

