/**
 * Supply Chain API Service
 * Handles all CRUD operations for bottles, closures, boxes, and labels
 */

const API_BASE_URL = 'https://sl2r0ip8zl.execute-api.ap-southeast-2.amazonaws.com';

// ============================================================================
// BOTTLES
// ============================================================================

export const bottlesApi = {
  // Inventory
  getInventory: async () => {
    const response = await fetch(`${API_BASE_URL}/supply-chain/bottles/inventory`);
    if (!response.ok) throw new Error('Failed to fetch bottle inventory');
    return response.json();
  },

  updateInventory: async (id, data) => {
    const response = await fetch(`${API_BASE_URL}/supply-chain/bottles/inventory/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update bottle inventory');
    return response.json();
  },

  // Orders
  getOrders: async (status = null) => {
    const url = status 
      ? `${API_BASE_URL}/supply-chain/bottles/orders?status=${status}`
      : `${API_BASE_URL}/supply-chain/bottles/orders`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch bottle orders');
    return response.json();
  },

  getOrder: async (id) => {
    const response = await fetch(`${API_BASE_URL}/supply-chain/bottles/orders/${id}`);
    if (!response.ok) throw new Error('Failed to fetch bottle order');
    return response.json();
  },

  createOrder: async (orderData) => {
    const response = await fetch(`${API_BASE_URL}/supply-chain/bottles/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    });
    if (!response.ok) throw new Error('Failed to create bottle order');
    return response.json();
  },

  updateOrder: async (id, orderData) => {
    const response = await fetch(`${API_BASE_URL}/supply-chain/bottles/orders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    });
    if (!response.ok) throw new Error('Failed to update bottle order');
    return response.json();
  },

  deleteOrder: async (id) => {
    const response = await fetch(`${API_BASE_URL}/supply-chain/bottles/orders/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete bottle order');
    return response.json();
  },
};

// ============================================================================
// CLOSURES
// ============================================================================

export const closuresApi = {
  // Inventory
  getInventory: async () => {
    const response = await fetch(`${API_BASE_URL}/supply-chain/closures/inventory`);
    if (!response.ok) throw new Error('Failed to fetch closure inventory');
    return response.json();
  },

  updateInventory: async (id, data) => {
    const response = await fetch(`${API_BASE_URL}/supply-chain/closures/inventory/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update closure inventory');
    return response.json();
  },

  // Orders
  getOrders: async (status = null) => {
    const url = status 
      ? `${API_BASE_URL}/supply-chain/closures/orders?status=${status}`
      : `${API_BASE_URL}/supply-chain/closures/orders`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch closure orders');
    return response.json();
  },

  getOrder: async (id) => {
    const response = await fetch(`${API_BASE_URL}/supply-chain/closures/orders/${id}`);
    if (!response.ok) throw new Error('Failed to fetch closure order');
    return response.json();
  },

  createOrder: async (orderData) => {
    const response = await fetch(`${API_BASE_URL}/supply-chain/closures/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    });
    if (!response.ok) throw new Error('Failed to create closure order');
    return response.json();
  },

  updateOrder: async (id, orderData) => {
    const response = await fetch(`${API_BASE_URL}/supply-chain/closures/orders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    });
    if (!response.ok) throw new Error('Failed to update closure order');
    return response.json();
  },
};

// ============================================================================
// BOXES
// ============================================================================

export const boxesApi = {
  // Inventory
  getInventory: async () => {
    const response = await fetch(`${API_BASE_URL}/supply-chain/boxes/inventory`);
    if (!response.ok) throw new Error('Failed to fetch box inventory');
    return response.json();
  },

  updateInventory: async (id, data) => {
    const response = await fetch(`${API_BASE_URL}/supply-chain/boxes/inventory/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update box inventory');
    return response.json();
  },

  // Orders
  getOrders: async (status = null) => {
    const url = status 
      ? `${API_BASE_URL}/supply-chain/boxes/orders?status=${status}`
      : `${API_BASE_URL}/supply-chain/boxes/orders`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch box orders');
    return response.json();
  },

  getOrder: async (id) => {
    const response = await fetch(`${API_BASE_URL}/supply-chain/boxes/orders/${id}`);
    if (!response.ok) throw new Error('Failed to fetch box order');
    return response.json();
  },

  createOrder: async (orderData) => {
    const response = await fetch(`${API_BASE_URL}/supply-chain/boxes/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    });
    if (!response.ok) throw new Error('Failed to create box order');
    return response.json();
  },

  updateOrder: async (id, orderData) => {
    const response = await fetch(`${API_BASE_URL}/supply-chain/boxes/orders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    });
    if (!response.ok) throw new Error('Failed to update box order');
    return response.json();
  },
};

// ============================================================================
// LABELS
// ============================================================================

export const labelsApi = {
  // Orders
  getOrders: async (status = null) => {
    const url = status 
      ? `${API_BASE_URL}/supply-chain/labels/orders?status=${status}`
      : `${API_BASE_URL}/supply-chain/labels/orders`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch label orders');
    return response.json();
  },

  createOrder: async (orderData) => {
    const response = await fetch(`${API_BASE_URL}/supply-chain/labels/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    });
    if (!response.ok) throw new Error('Failed to create label order');
    return response.json();
  },

  // Costs
  getCosts: async (size = null) => {
    const url = size 
      ? `${API_BASE_URL}/supply-chain/labels/costs?size=${encodeURIComponent(size)}`
      : `${API_BASE_URL}/supply-chain/labels/costs`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch label costs');
    return response.json();
  },
};

// ============================================================================
// PRODUCTION PLANNING
// ============================================================================

export const productionApi = {
  getPlanning: async () => {
    const response = await fetch(`${API_BASE_URL}/production/planning`);
    if (!response.ok) throw new Error('Failed to fetch production planning');
    return response.json();
  },

  calculateTime: async (product, units) => {
    const response = await fetch(
      `${API_BASE_URL}/production/calculate-time?product=${encodeURIComponent(product)}&units=${units}`
    );
    if (!response.ok) throw new Error('Failed to calculate production time');
    return response.json();
  },

  getWarehouseCapacity: async () => {
    const response = await fetch(`${API_BASE_URL}/production/warehouse-capacity`);
    if (!response.ok) throw new Error('Failed to fetch warehouse capacity');
    return response.json();
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Handle API errors consistently
 */
export const handleApiError = (error) => {
  console.error('API Error:', error);
  return {
    success: false,
    error: error.message || 'An unexpected error occurred',
  };
};

/**
 * Transform backend data to frontend format (if needed)
 */
export const transformInventoryData = (backendData) => {
  if (!backendData?.data) return [];
  
  return backendData.data.map(item => ({
    id: item.id,
    name: item.bottle_name || item.closure_name || item.box_type,
    warehouseInventory: item.warehouse_quantity,
    supplierInventory: item.supplier_quantity,
    unitsPerPallet: item.units_per_pallet,
    unitsPerCase: item.units_per_case,
    casesPerPallet: item.cases_per_pallet,
    supplier: item.supplier,
    moq: item.moq,
    leadTimeWeeks: item.lead_time_weeks,
    // Keep original for backend updates
    _original: item,
  }));
};

/**
 * Transform frontend data to backend format for updates
 */
export const transformToBackendFormat = (frontendData) => {
  return {
    warehouse_quantity: frontendData.warehouseInventory,
    supplier_quantity: frontendData.supplierInventory,
  };
};

