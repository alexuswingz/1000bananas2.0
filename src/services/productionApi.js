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

/**
 * Get a specific shipment by ID
 * @param {string|number} shipmentId - The shipment ID
 * @returns {Promise<Object>} Shipment object with products
 */
export const getShipmentById = async (shipmentId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/production/shipments/${shipmentId}`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch shipment');
    }
    
    return data.data;
  } catch (error) {
    console.error(`Error fetching shipment ${shipmentId}:`, error);
    throw error;
  }
};

/**
 * Update a shipment
 * @param {string|number} shipmentId - The shipment ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated shipment object
 */
export const updateShipment = async (shipmentId, updates) => {
  try {
    const response = await fetch(`${API_BASE_URL}/production/shipments/${shipmentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to update shipment');
    }
    
    return data.data;
  } catch (error) {
    console.error(`Error updating shipment ${shipmentId}:`, error);
    throw error;
  }
};

/**
 * Delete a shipment
 * @param {string|number} shipmentId - The shipment ID
 * @returns {Promise<Object>} Deletion result
 */
export const deleteShipment = async (shipmentId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/production/shipments/${shipmentId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to delete shipment');
    }
    
    return data;
  } catch (error) {
    console.error(`Error deleting shipment ${shipmentId}:`, error);
    throw error;
  }
};

/**
 * Add products to a shipment
 * @param {string|number} shipmentId - The shipment ID
 * @param {Array} products - Array of products with catalog_id and quantity
 * @returns {Promise<Object>} Result with products and supply_warnings
 */
export const addShipmentProducts = async (shipmentId, products) => {
  try {
    const response = await fetch(`${API_BASE_URL}/production/shipments/${shipmentId}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ products }),
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to add products to shipment');
    }
    
    return data.data;
  } catch (error) {
    console.error(`Error adding products to shipment ${shipmentId}:`, error);
    throw error;
  }
};

/**
 * Get products for a shipment (for label check)
 * @param {string|number} shipmentId - The shipment ID
 * @returns {Promise<Array>} Array of products with label info
 */
export const getShipmentProducts = async (shipmentId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/production/shipments/${shipmentId}/products`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch shipment products');
    }
    
    return data.data;
  } catch (error) {
    console.error(`Error fetching products for shipment ${shipmentId}:`, error);
    throw error;
  }
};

/**
 * Get formula check data for a shipment
 * @param {string|number} shipmentId - The shipment ID
 * @returns {Promise<Array>} Array of formulas with availability info
 */
export const getShipmentFormulaCheck = async (shipmentId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/production/shipments/${shipmentId}/formula-check`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch formula check data');
    }
    
    return data.data;
  } catch (error) {
    console.error(`Error fetching formula check for shipment ${shipmentId}:`, error);
    throw error;
  }
};

/**
 * Update formula check status for a shipment
 * @param {string|number} shipmentId - The shipment ID
 * @param {Object} updates - Updates to apply
 * @param {Array<number>} updates.checked_formula_ids - IDs of formulas that are checked
 * @param {Array<number>} updates.uncheck_formula_ids - IDs of formulas to uncheck
 * @param {Object} updates.formula_notes - Notes keyed by formula ID
 * @param {string} updates.checked_by - User who made the changes
 * @returns {Promise<Array>} Updated array of formulas
 */
export const updateShipmentFormulaCheck = async (shipmentId, updates) => {
  try {
    const response = await fetch(`${API_BASE_URL}/production/shipments/${shipmentId}/formula-check`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to update formula check status');
    }
    
    return data.data;
  } catch (error) {
    console.error(`Error updating formula check for shipment ${shipmentId}:`, error);
    throw error;
  }
};

/**
 * Get labels availability, optionally excluding a specific shipment
 * @param {string|number} excludeShipmentId - Optional shipment ID to exclude from calculations
 * @returns {Promise<Object>} Object with byLocation map of label availability
 */
export const getLabelsAvailability = async (excludeShipmentId = null) => {
  try {
    const params = new URLSearchParams();
    if (excludeShipmentId) {
      params.append('exclude_shipment', excludeShipmentId);
    }
    
    const url = `${API_BASE_URL}/production/labels/availability${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch labels availability');
    }
    
    return data.data;
  } catch (error) {
    console.error('Error fetching labels availability:', error);
    throw error;
  }
};

/**
 * Get label formula by label location for weight-to-labels conversion
 * Formula: labels = (gram_weight - core_weight_grams) / grams_per_label
 * @param {string} labelLocation - The label location code (e.g., "LBL-PLANT-494")
 * @returns {Promise<Object>} Label formula object with core_weight_grams and grams_per_label
 */
export const getLabelFormulaByLocation = async (labelLocation) => {
  try {
    const url = `${API_BASE_URL}/supply-chain/labels/formulas/by-location?label_location=${encodeURIComponent(labelLocation)}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch label formula');
    }
    
    return data.data;
  } catch (error) {
    console.error(`Error fetching label formula for ${labelLocation}:`, error);
    // Return default formula on error
    return {
      core_weight_grams: 71,
      grams_per_label: 3.35,
      notes: 'Default formula - error fetching from API'
    };
  }
};

/**
 * Get all label formulas
 * @returns {Promise<Array>} Array of label formula objects
 */
export const getLabelFormulas = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/supply-chain/labels/formulas`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch label formulas');
    }
    
    return data.data;
  } catch (error) {
    console.error('Error fetching label formulas:', error);
    throw error;
  }
};

/**
 * Update label inventory by label location (used after counting labels)
 * @param {string} labelLocation - The label location code (e.g., "LBL-PLANT-494")
 * @param {number} warehouseInventory - The new counted inventory value
 * @returns {Promise<Object>} Updated label inventory object
 */
export const updateLabelInventoryByLocation = async (labelLocation, warehouseInventory) => {
  try {
    const response = await fetch(`${API_BASE_URL}/supply-chain/labels/inventory/by-location`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        label_location: labelLocation,
        warehouse_inventory: warehouseInventory,
      }),
    });
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to update label inventory');
    }
    
    return data.data;
  } catch (error) {
    console.error(`Error updating label inventory for ${labelLocation}:`, error);
    throw error;
  }
};

/**
 * Update label check status for a shipment product
 * @param {number} shipmentId - The shipment ID
 * @param {number} productId - The shipment product ID
 * @param {string|null} status - Status: 'confirmed', 'counted', or null (to reset)
 * @param {number|null} count - The counted inventory (only for 'counted' status)
 * @returns {Promise<Object>} Updated shipment product object
 */
export const updateShipmentProductLabelCheck = async (shipmentId, productId, status, count = null) => {
  try {
    const response = await fetch(`${API_BASE_URL}/production/shipments/${shipmentId}/products/${productId}/label-check`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status,
        count,
      }),
    });
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to update label check status');
    }
    
    return data.data;
  } catch (error) {
    console.error(`Error updating label check for product ${productId}:`, error);
    throw error;
  }
};

/**
 * Get products inventory for production supply chain
 * @returns {Promise<Array>} Array of product inventory items
 */
export const getProductsInventory = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/production/products/inventory`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch products inventory');
    }
    
    return data.data;
  } catch (error) {
    console.error('Error fetching products inventory:', error);
    throw error;
  }
};

/**
 * Get sellable products (products with all components in stock)
 * @returns {Promise<Array>} Array of sellable products
 */
export const getSellables = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/production/floor-inventory/sellables`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch sellables');
    }
    
    return data.data;
  } catch (error) {
    console.error('Error fetching sellables:', error);
    throw error;
  }
};

/**
 * Get shiners data (products grouped by formula with issues)
 * @returns {Promise<Array>} Array of formula groups with shiner products
 */
export const getShiners = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/production/floor-inventory/shiners`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch shiners');
    }
    
    return data.data;
  } catch (error) {
    console.error('Error fetching shiners:', error);
    throw error;
  }
};

/**
 * Get unused formulas (formulas with unallocated inventory)
 * @returns {Promise<Array>} Array of formulas with unused gallons
 */
export const getUnusedFormulas = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/production/floor-inventory/unused-formulas`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch unused formulas');
    }
    
    return data.data;
  } catch (error) {
    console.error('Error fetching unused formulas:', error);
    throw error;
  }
};

/**
 * Add unused formula to inventory
 * @param {string} formulaName - Name of the formula
 * @param {number} gallons - Amount of unused formula in gallons
 * @returns {Promise<Object>} Result of the operation
 */
export const addUnusedFormula = async (formulaName, gallons) => {
  try {
    const response = await fetch(`${API_BASE_URL}/production/floor-inventory/unused-formulas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        formula_name: formulaName,
        gallons: gallons,
      }),
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to add unused formula');
    }
    
    return data;
  } catch (error) {
    console.error('Error adding unused formula:', error);
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
  getShipmentById,
  updateShipment,
  deleteShipment,
  addShipmentProducts,
  getShipmentProducts,
  getShipmentFormulaCheck,
  updateShipmentFormulaCheck,
  getLabelsAvailability,
  
  // Products & Inventory
  getProductsInventory,
  getSellables,
  getShiners,
  getUnusedFormulas,
  
  // Helpers
  calculateFormulaGallons,
};

