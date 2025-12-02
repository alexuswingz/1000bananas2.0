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

  // Forecast Requirements
  getForecastRequirements: async (doiGoal = 120, safetyBuffer = 0.85) => {
    const response = await fetch(`${API_BASE_URL}/supply-chain/bottles/forecast-requirements?doi_goal=${doiGoal}&safety_buffer=${safetyBuffer}`);
    if (!response.ok) throw new Error('Failed to fetch bottle forecast requirements');
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

  // Cycle Counts
  getCycleCounts: async () => {
    const response = await fetch(`${API_BASE_URL}/supply-chain/bottles/cycle-counts`);
    if (!response.ok) throw new Error('Failed to fetch cycle counts');
    return response.json();
  },

  getCycleCount: async (id) => {
    const response = await fetch(`${API_BASE_URL}/supply-chain/bottles/cycle-counts/${id}`);
    if (!response.ok) throw new Error('Failed to fetch cycle count');
    return response.json();
  },

  createCycleCount: async (countData) => {
    const response = await fetch(`${API_BASE_URL}/supply-chain/bottles/cycle-counts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        count_date: countData.countDate || countData.count_date,
        counted_by: countData.countedBy || countData.counted_by,
        status: countData.status || 'draft',
        notes: countData.notes,
        lines: (countData.lines || []).map(line => ({
          bottle_name: line.bottleName || line.bottle_name,
          counted_quantity: line.countedQuantity || line.counted_quantity || 0,
        })),
      }),
    });
    if (!response.ok) throw new Error('Failed to create cycle count');
    return response.json();
  },

  updateCycleCount: async (id, countData) => {
    const response = await fetch(`${API_BASE_URL}/supply-chain/bottles/cycle-counts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: countData.status,
        notes: countData.notes,
        lines: (countData.lines || []).map(line => ({
          bottle_name: line.bottleName || line.bottle_name,
          counted_quantity: line.countedQuantity || line.counted_quantity || 0,
        })),
      }),
    });
    if (!response.ok) throw new Error('Failed to update cycle count');
    return response.json();
  },

  completeCycleCount: async (id) => {
    const response = await fetch(`${API_BASE_URL}/supply-chain/bottles/cycle-counts/${id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error('Failed to complete cycle count');
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

  // Forecast Requirements
  getForecastRequirements: async (doiGoal = 120, safetyBuffer = 0.85) => {
    const response = await fetch(`${API_BASE_URL}/supply-chain/closures/forecast-requirements?doi_goal=${doiGoal}&safety_buffer=${safetyBuffer}`);
    if (!response.ok) throw new Error('Failed to fetch closure forecast requirements');
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

  // Cycle Counts
  getCycleCounts: async () => {
    const response = await fetch(`${API_BASE_URL}/supply-chain/closures/cycle-counts`);
    if (!response.ok) throw new Error('Failed to fetch cycle counts');
    return response.json();
  },

  getCycleCount: async (id) => {
    const response = await fetch(`${API_BASE_URL}/supply-chain/closures/cycle-counts/${id}`);
    if (!response.ok) throw new Error('Failed to fetch cycle count');
    return response.json();
  },

  createCycleCount: async (countData) => {
    const response = await fetch(`${API_BASE_URL}/supply-chain/closures/cycle-counts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        count_date: countData.countDate || countData.count_date,
        counted_by: countData.countedBy || countData.counted_by,
        status: countData.status || 'draft',
        notes: countData.notes,
        lines: (countData.lines || []).map(line => ({
          closure_name: line.closureName || line.closure_name,
          counted_quantity: line.countedQuantity || line.counted_quantity || 0,
        })),
      }),
    });
    if (!response.ok) throw new Error('Failed to create cycle count');
    return response.json();
  },

  updateCycleCount: async (id, countData) => {
    const response = await fetch(`${API_BASE_URL}/supply-chain/closures/cycle-counts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: countData.status,
        notes: countData.notes,
        lines: (countData.lines || []).map(line => ({
          closure_name: line.closureName || line.closure_name,
          counted_quantity: line.countedQuantity || line.counted_quantity || 0,
        })),
      }),
    });
    if (!response.ok) throw new Error('Failed to update cycle count');
    return response.json();
  },

  completeCycleCount: async (id) => {
    const response = await fetch(`${API_BASE_URL}/supply-chain/closures/cycle-counts/${id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error('Failed to complete cycle count');
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

  // Forecast Requirements
  getForecastRequirements: async (doiGoal = 120, safetyBuffer = 0.85) => {
    const response = await fetch(`${API_BASE_URL}/supply-chain/boxes/forecast-requirements?doi_goal=${doiGoal}&safety_buffer=${safetyBuffer}`);
    if (!response.ok) throw new Error('Failed to fetch box forecast requirements');
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

  // Cycle Counts
  getCycleCounts: async () => {
    const response = await fetch(`${API_BASE_URL}/supply-chain/boxes/cycle-counts`);
    if (!response.ok) throw new Error('Failed to fetch cycle counts');
    return response.json();
  },

  getCycleCount: async (id) => {
    const response = await fetch(`${API_BASE_URL}/supply-chain/boxes/cycle-counts/${id}`);
    if (!response.ok) throw new Error('Failed to fetch cycle count');
    return response.json();
  },

  createCycleCount: async (countData) => {
    const response = await fetch(`${API_BASE_URL}/supply-chain/boxes/cycle-counts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        count_date: countData.countDate || countData.count_date,
        counted_by: countData.countedBy || countData.counted_by,
        status: countData.status || 'draft',
        notes: countData.notes,
        lines: (countData.lines || []).map(line => ({
          box_name: line.boxName || line.box_name,
          counted_quantity: line.countedQuantity || line.counted_quantity || 0,
        })),
      }),
    });
    if (!response.ok) throw new Error('Failed to create cycle count');
    return response.json();
  },

  updateCycleCount: async (id, countData) => {
    const response = await fetch(`${API_BASE_URL}/supply-chain/boxes/cycle-counts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: countData.status,
        notes: countData.notes,
        lines: (countData.lines || []).map(line => ({
          box_type: line.boxType || line.box_type,
          counted_quantity: line.countedQuantity || line.counted_quantity || 0,
        })),
      }),
    });
    if (!response.ok) throw new Error('Failed to update cycle count');
    return response.json();
  },

  completeCycleCount: async (id) => {
    const response = await fetch(`${API_BASE_URL}/supply-chain/boxes/cycle-counts/${id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error('Failed to complete cycle count');
    return response.json();
  },
};

// ============================================================================
// LABELS
// ============================================================================

export const labelsApi = {
  // Inventory
  getInventory: async () => {
    const response = await fetch(`${API_BASE_URL}/supply-chain/labels/inventory`);
    if (!response.ok) throw new Error('Failed to fetch label inventory');
    return response.json();
  },

  getInventoryById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/supply-chain/labels/inventory/${id}`);
    if (!response.ok) throw new Error('Failed to fetch label');
    return response.json();
  },

  updateInventory: async (id, data) => {
    const response = await fetch(`${API_BASE_URL}/supply-chain/labels/inventory/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        warehouse_inventory: data.warehouseInventory || data.warehouse_inventory,
        inbound_quantity: data.inboundQuantity || data.inbound_quantity,
        label_status: data.labelStatus || data.label_status,
        google_drive_link: data.googleDriveLink || data.google_drive_link,
        notes: data.notes,
      }),
    });
    if (!response.ok) throw new Error('Failed to update label inventory');
    return response.json();
  },

  // Forecast Requirements
  getForecastRequirements: async (doiGoal = 120, safetyBuffer = 0.85) => {
    const response = await fetch(`${API_BASE_URL}/supply-chain/labels/forecast-requirements?doi_goal=${doiGoal}&safety_buffer=${safetyBuffer}`);
    if (!response.ok) throw new Error('Failed to fetch label forecast requirements');
    return response.json();
  },

  // Orders
  getOrders: async (status = null) => {
    const url = status 
      ? `${API_BASE_URL}/supply-chain/labels/orders?status=${status}`
      : `${API_BASE_URL}/supply-chain/labels/orders`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch label orders');
    return response.json();
  },

  getOrder: async (id) => {
    const response = await fetch(`${API_BASE_URL}/supply-chain/labels/orders/${id}`);
    if (!response.ok) throw new Error('Failed to fetch label order');
    return response.json();
  },

  createOrder: async (orderData) => {
    const response = await fetch(`${API_BASE_URL}/supply-chain/labels/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_number: orderData.orderNumber || orderData.order_number,
        supplier: orderData.supplier,
        order_date: orderData.orderDate || orderData.order_date,
        expected_delivery_date: orderData.expectedDeliveryDate || orderData.expected_delivery_date,
        total_quantity: orderData.totalQuantity || orderData.total_quantity,
        total_cost: orderData.totalCost || orderData.total_cost,
        status: orderData.status || 'pending',
        notes: orderData.notes,
        lines: (orderData.lines || []).map(line => ({
          brand_name: line.brand || line.brandName || line.brand_name,
          product_name: line.product || line.productName || line.product_name,
          bottle_size: line.size || line.bottleSize || line.bottle_size,
          label_size: line.labelSize || line.label_size,
          quantity_ordered: line.qty || line.quantityOrdered || line.quantity_ordered,
          cost_per_label: line.costPerLabel || line.cost_per_label || 0,
          line_total: line.lineTotal || line.line_total || 0,
          google_drive_link: line.googleDriveLink || line.google_drive_link,
        })),
      }),
    });
    if (!response.ok) throw new Error('Failed to create label order');
    return response.json();
  },

  updateOrder: async (id, data) => {
    const response = await fetch(`${API_BASE_URL}/supply-chain/labels/orders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: data.status,
        actual_delivery_date: data.actualDeliveryDate || data.actual_delivery_date,
        notes: data.notes,
        line_updates: data.lineUpdates || data.line_updates || [],
      }),
    });
    if (!response.ok) throw new Error('Failed to update label order');
    return response.json();
  },

  // Cycle Counts
  getCycleCounts: async () => {
    const response = await fetch(`${API_BASE_URL}/supply-chain/labels/cycle-counts`);
    if (!response.ok) throw new Error('Failed to fetch cycle counts');
    return response.json();
  },

  getCycleCount: async (id) => {
    const response = await fetch(`${API_BASE_URL}/supply-chain/labels/cycle-counts/${id}`);
    if (!response.ok) throw new Error('Failed to fetch cycle count');
    return response.json();
  },

  createCycleCount: async (countData) => {
    const response = await fetch(`${API_BASE_URL}/supply-chain/labels/cycle-counts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        count_date: countData.countDate || countData.count_date,
        counted_by: countData.countedBy || countData.counted_by,
        status: countData.status || 'draft',
        notes: countData.notes,
        lines: (countData.lines || []).map(line => ({
          brand_name: line.brand || line.brandName || line.brand_name,
          product_name: line.product || line.productName || line.product_name,
          bottle_size: line.size || line.bottleSize || line.bottle_size,
          counted_quantity: line.countedQuantity || line.counted || line.counted_quantity || 0,
        })),
      }),
    });
    if (!response.ok) throw new Error('Failed to create cycle count');
    return response.json();
  },

  updateCycleCount: async (id, data) => {
    const response = await fetch(`${API_BASE_URL}/supply-chain/labels/cycle-counts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: data.status,
        notes: data.notes,
      }),
    });
    if (!response.ok) throw new Error('Failed to update cycle count');
    return response.json();
  },

  completeCycleCount: async (id) => {
    const response = await fetch(`${API_BASE_URL}/supply-chain/labels/cycle-counts/${id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error('Failed to complete cycle count');
    return response.json();
  },

  // DOI Calculation
  getDOI: async (goal = 196) => {
    const response = await fetch(`${API_BASE_URL}/supply-chain/labels/doi?goal=${goal}`);
    if (!response.ok) throw new Error('Failed to calculate DOI');
    return response.json();
  },

  getDOIById: async (id, goal = 196) => {
    const response = await fetch(`${API_BASE_URL}/supply-chain/labels/doi/${id}?goal=${goal}`);
    if (!response.ok) throw new Error('Failed to calculate DOI');
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

