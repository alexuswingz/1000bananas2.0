/**
 * Production Planning API Service
 * Handles all API calls for formula inventory, label inventory, planning, and shipments
 */

const API_BASE_URL = 'https://sl2r0ip8zl.execute-api.ap-southeast-2.amazonaws.com';

// ============================================
// FORMULA INVENTORY
// ============================================

/**
 * Get all formula inventory levels
 * @returns {Promise<Array>} Array of formula inventory objects
 */
export const getAllFormulaInventory = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/production/formula-inventory`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch formula inventory');
    }
    
    return data.data;
  } catch (error) {
    console.error('Error fetching formula inventory:', error);
    throw error;
  }
};

/**
 * Get specific formula inventory by name
 * @param {string} formulaName - The formula name (e.g., "F.ULTRAGROW")
 * @returns {Promise<Object>} Formula inventory object
 */
export const getFormulaInventory = async (formulaName) => {
  try {
    const response = await fetch(`${API_BASE_URL}/production/formula-inventory/${encodeURIComponent(formulaName)}`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch formula inventory');
    }
    
    return data.data;
  } catch (error) {
    console.error(`Error fetching formula inventory for ${formulaName}:`, error);
    throw error;
  }
};

/**
 * Update formula inventory levels
 * @param {string} formulaName - The formula name
 * @param {Object} updates - Fields to update (gallons_available, gallons_in_production, etc.)
 * @returns {Promise<Object>} Updated formula inventory object
 */
export const updateFormulaInventory = async (formulaName, updates) => {
  try {
    const response = await fetch(`${API_BASE_URL}/production/formula-inventory/${encodeURIComponent(formulaName)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to update formula inventory');
    }
    
    return data.data;
  } catch (error) {
    console.error(`Error updating formula inventory for ${formulaName}:`, error);
    throw error;
  }
};

// ============================================
// LABEL INVENTORY
// ============================================

/**
 * Get all label inventory levels
 * @returns {Promise<Array>} Array of label inventory objects
 */
export const getAllLabelInventory = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/production/label-inventory`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch label inventory');
    }
    
    return data.data;
  } catch (error) {
    console.error('Error fetching label inventory:', error);
    throw error;
  }
};

/**
 * Get specific label inventory by size
 * @param {string} labelSize - The label size (e.g., "5 x 8")
 * @returns {Promise<Object>} Label inventory object
 */
export const getLabelInventory = async (labelSize) => {
  try {
    const response = await fetch(`${API_BASE_URL}/production/label-inventory/${encodeURIComponent(labelSize)}`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch label inventory');
    }
    
    return data.data;
  } catch (error) {
    console.error(`Error fetching label inventory for ${labelSize}:`, error);
    throw error;
  }
};

/**
 * Update label inventory levels
 * @param {string} labelSize - The label size
 * @param {Object} updates - Fields to update (quantity_on_hand, quantity_on_order, etc.)
 * @returns {Promise<Object>} Updated label inventory object
 */
export const updateLabelInventory = async (labelSize, updates) => {
  try {
    const response = await fetch(`${API_BASE_URL}/production/label-inventory/${encodeURIComponent(labelSize)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to update label inventory');
    }
    
    return data.data;
  } catch (error) {
    console.error(`Error updating label inventory for ${labelSize}:`, error);
    throw error;
  }
};

// ============================================
// PRODUCTION PLANNING
// ============================================

/**
 * Get production planning data (products grouped by formula)
 * @param {Object} params - Query parameters
 * @param {string} params.view - View type: 'sellables' | 'shiners' | 'unused' | 'all'
 * @param {number} params.page - Page number (default: 1)
 * @param {number} params.limit - Items per page (default: 20)
 * @returns {Promise<Object>} Planning data with pagination info
 */
export const getProductionPlanningData = async ({ view = 'all', page = 1, limit = 20 } = {}) => {
  try {
    const params = new URLSearchParams({
      view,
      page: page.toString(),
      limit: limit.toString(),
    });
    
    const response = await fetch(`${API_BASE_URL}/production/planning?${params}`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch planning data');
    }
    
    return {
      data: data.data,
      count: data.count,
      totalCount: data.total_count,
      totalPages: data.total_pages,
      currentPage: data.current_page,
    };
  } catch (error) {
    console.error('Error fetching production planning data:', error);
    throw error;
  }
};

// ============================================
// PRODUCTION SHIPMENTS
// ============================================

/**
 * Create a new production shipment
 * @param {Object} shipmentData - Shipment details
 * @param {string} shipmentData.shipment_number - Unique shipment number
 * @param {string} shipmentData.shipment_date - Shipment date (YYYY-MM-DD)
 * @param {string} shipmentData.shipment_type - Type (e.g., 'AWD', 'FBA')
 * @param {string} shipmentData.account - Account name
 * @param {string} shipmentData.location - Location/warehouse
 * @param {string} shipmentData.created_by - User who created it
 * @returns {Promise<Object>} Created shipment object
 */
export const createShipment = async (shipmentData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/production/shipments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(shipmentData),
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to create shipment');
    }
    
    return data.data;
  } catch (error) {
    console.error('Error creating shipment:', error);
    throw error;
  }
};

/**
 * Get all production shipments
 * @param {Object} params - Query parameters
 * @param {string} params.status - Filter by status (optional)
 * @returns {Promise<Array>} Array of shipment objects
 */
export const getAllShipments = async ({ status } = {}) => {
  try {
    const params = new URLSearchParams();
    if (status) {
      params.append('status', status);
    }
    
    const url = `${API_BASE_URL}/production/shipments${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch shipments');
    }
    
    return data.data;
  } catch (error) {
    console.error('Error fetching shipments:', error);
    throw error;
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate formula gallons needed for a product quantity
 * @param {string} size - Product size (e.g., '8oz', 'Gallon')
 * @param {number} quantity - Number of units
 * @returns {number} Gallons needed
 */
export const calculateFormulaGallons = (size, quantity) => {
  const sizeToGallons = {
    '8oz': 0.0625,
    '16oz': 0.125,
    'Quart': 0.25,
    '32oz': 0.25,
    'Gallon': 1.0,
    '5 Gallon': 5.0,
  };
  
  const gallonsPerUnit = sizeToGallons[size] || 0;
  return Math.round(gallonsPerUnit * quantity * 100) / 100; // Round to 2 decimals
};

export default {
  // Formula Inventory
  getAllFormulaInventory,
  getFormulaInventory,
  updateFormulaInventory,
  
  // Label Inventory
  getAllLabelInventory,
  getLabelInventory,
  updateLabelInventory,
  
  // Production Planning
  getProductionPlanningData,
  
  // Shipments
  createShipment,
  getAllShipments,
  
  // Helpers
  calculateFormulaGallons,
};

