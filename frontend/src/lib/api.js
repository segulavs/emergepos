import axios from 'axios';

// In production, frontend is served from same origin as backend
// Use empty string to make requests to same origin, or use env variable if set
let BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

// If BACKEND_URL is empty, use same origin (for same-port setup)
// Normalize 0.0.0.0 to localhost to avoid CORS issues
if (!BACKEND_URL) {
  const origin = window.location.origin;
  // Replace 0.0.0.0 with localhost to avoid CORS issues
  BACKEND_URL = origin.replace(/0\.0\.0\.0/, 'localhost');
}

export const API_BASE = `${BACKEND_URL}/api`;

// Log API configuration for debugging
console.log('[API Config] BACKEND_URL:', BACKEND_URL || '(empty - same origin)');
console.log('[API Config] API_BASE:', API_BASE);
console.log('[API Config] Current origin:', window.location.origin);
console.log('[API Config] Normalized origin:', BACKEND_URL);

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pos_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log(`[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url} - Token: ${token.substring(0, 20)}...`);
  } else {
    console.warn(`[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url} - NO TOKEN FOUND!`);
    console.warn('[API] localStorage keys:', Object.keys(localStorage));
  }
  console.log(`[API] Request headers:`, config.headers);
  return config;
}, (error) => {
  console.error('[API] Request error:', error);
  return Promise.reject(error);
});

// Handle 401 errors
api.interceptors.response.use(
  (response) => {
    console.log(`[API] Response ${response.status} from ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('[API] Response error:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: error.config?.url,
      baseURL: error.config?.baseURL,
    });
    
    if (error.code === 'ECONNABORTED') {
      console.error('[API] Request timeout');
      error.message = 'Request timeout - server is not responding';
    } else if (error.code === 'ERR_NETWORK' || error.message?.includes('blocked') || error.message?.includes('CORS')) {
      console.error('[API] Network/CORS error');
      error.message = 'Network error - request was blocked. Check CORS settings and ensure backend is running.';
      error.isBlocked = true;
    } else if (!error.response) {
      // No response means request never reached server
      console.error('[API] No response from server');
      error.message = 'Cannot connect to server. Is the backend running?';
    }
    
    if (error.response?.status === 401) {
      localStorage.removeItem('pos_token');
      localStorage.removeItem('pos_user');
      // Don't redirect if we're already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth APIs
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
};

// Organization APIs
export const orgAPI = {
  getCurrent: () => api.get('/organizations/current'),
  update: (id, data) => api.put(`/organizations/${id}`, data),
};

// Store APIs
export const storeAPI = {
  getAll: () => api.get('/stores'),
  get: (id) => api.get(`/stores/${id}`),
  create: (data) => api.post('/stores', data),
  update: (id, data) => api.put(`/stores/${id}`, data),
};

// User APIs
export const userAPI = {
  getAll: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
};

// Product APIs
export const productAPI = {
  getAll: (params) => api.get('/products', { params }),
  getWithStock: (storeId, params) => api.get(`/products/with-stock/${storeId}`, { params }),
  get: (id) => api.get(`/products/${id}`),
  getByBarcode: (barcode) => api.get(`/products/barcode/${barcode}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  getBrands: () => api.get('/products/brands'),
  downloadTemplate: async () => {
    const token = localStorage.getItem('pos_token');
    
    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    try {
      const response = await fetch(`${API_BASE}/products/template`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        let errorMessage = 'Failed to download template';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch (e) {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
      
      const blob = await response.blob();
      
      // Check if blob is valid
      if (blob.size === 0) {
        throw new Error('Downloaded file is empty');
      }
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'product_import_template.xlsx';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);
      
      return blob;
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Template download error:', error);
      
      if (error.name === 'AbortError') {
        throw new Error('Download timeout - please try again');
      }
      
      throw error;
    }
  },
  importFromExcel: (file) => {
    const token = localStorage.getItem('pos_token');
    const formData = new FormData();
    formData.append('file', file);
    return fetch(`${API_BASE}/products/import`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    }).then(async response => {
      const data = await response.json();
      if (!response.ok) {
        return Promise.reject({ detail: data.detail || 'Failed to import products' });
      }
      return data;
    });
  },
};

// Stock APIs
export const stockAPI = {
  getByStore: (storeId) => api.get(`/stock/${storeId}`),
  createMovement: (storeId, data) => api.post(`/stock/${storeId}/movement`, data),
  getMovements: (storeId, productId) => api.get(`/stock/${storeId}/movements`, { params: { product_id: productId } }),
};

// Transfer APIs
export const transferAPI = {
  getAll: (params) => api.get('/transfers', { params }),
  create: (data) => api.post('/transfers', data),
  dispatch: (id) => api.put(`/transfers/${id}/dispatch`),
  receive: (id, items) => api.put(`/transfers/${id}/receive`, items),
};

// Transaction APIs
export const transactionAPI = {
  getAll: (params) => api.get('/transactions', { params }),
  get: (id) => api.get(`/transactions/${id}`),
  create: (storeId, data) => api.post('/transactions', data, { params: { store_id: storeId } }),
  void: (id, reason) => api.post(`/transactions/${id}/void`, null, { params: { reason } }),
  refund: (id, reason, items) => api.post(`/transactions/${id}/refund`, items, { params: { reason } }),
};

// Session APIs
export const sessionAPI = {
  start: (storeId, data) => api.post('/sessions/start', data, { params: { store_id: storeId } }),
  end: (storeId, data) => api.post('/sessions/end', data, { params: { store_id: storeId } }),
  getCurrent: (storeId) => api.get('/sessions/current', { params: { store_id: storeId } }),
  getAll: (storeId) => api.get('/sessions', { params: { store_id: storeId } }),
  getReport: (sessionId) => api.get(`/sessions/${sessionId}/report`),
};

// Print Log APIs
export const printLogAPI = {
  create: (data) => api.post('/print-logs', data),
  getAll: (params) => api.get('/print-logs', { params }),
  getAll: (storeId) => api.get('/sessions', { params: { store_id: storeId } }),
  getReport: (sessionId) => api.get(`/sessions/${sessionId}/report`),
};

// Audit APIs
export const auditAPI = {
  getAll: (params) => api.get('/audits', { params }),
  create: (storeId) => api.post('/audits', null, { params: { store_id: storeId } }),
  updateCount: (id, items) => api.put(`/audits/${id}/count`, items),
  complete: (id) => api.put(`/audits/${id}/complete`),
  approve: (id) => api.put(`/audits/${id}/approve`),
};

// Analytics APIs
export const analyticsAPI = {
  getSalesSummary: (params) => api.get('/analytics/sales-summary', { params }),
  getStoresMap: () => api.get('/analytics/stores-map'),
  getSalesTrend: (params) => api.get('/analytics/sales-trend', { params }),
  getTopProducts: (params) => api.get('/analytics/top-products', { params }),
  getDashboard: (storeId) => api.get('/analytics/dashboard', { params: { store_id: storeId } }),
  getSalesPerProduct: (params) => api.get('/analytics/sales-per-product', { params }),
  getProfitPerProduct: (params) => api.get('/analytics/profit-per-product', { params }),
  getSalesPerBranch: (params) => api.get('/analytics/sales-per-branch', { params }),
  getProfitPerBranch: (params) => api.get('/analytics/profit-per-branch', { params }),
};

// Print APIs
export const printAPI = {
  getReceipt: (transactionId, printerId) => api.post('/print/receipt', null, { params: { transaction_id: transactionId, printer_id: printerId } }),
  getPrinters: () => api.get('/printers'),
  testPrinter: (printerId) => api.post('/printers/test', null, { params: { printer_id: printerId } }),
};

// Admin APIs (Super Admin only)
export const adminAPI = {
  getOrganizations: () => api.get('/admin/organizations'),
  createOrganization: (data) => api.post('/admin/organizations', data),
  updateOrganization: (id, data) => api.put(`/admin/organizations/${id}`, data),
  deleteOrganization: (id) => api.delete(`/admin/organizations/${id}`),
  getUsers: (orgId) => api.get('/admin/users', { params: { org_id: orgId } }),
  createUserForOrg: (orgId, data) => api.post(`/admin/organizations/${orgId}/users`, data),
  getStats: () => api.get('/admin/stats'),
};

// Sync APIs
export const syncAPI = {
  push: (storeId, data) => api.post('/sync/push', data, { params: { store_id: storeId } }),
  pull: (storeId, lastSync) => api.get('/sync/pull', { params: { store_id: storeId, last_sync: lastSync } }),
};

// Warehouse APIs
export const warehouseAPI = {
  getAll: () => api.get('/warehouses'),
  get: (id) => api.get(`/warehouses/${id}`),
  create: (data) => api.post('/warehouses', data),
  update: (id, data) => api.put(`/warehouses/${id}`, data),
  delete: (id) => api.delete(`/warehouses/${id}`),
  // Stock Management
  getStock: (warehouseId) => api.get(`/warehouses/${warehouseId}/stock`),
  createStockMovement: (warehouseId, data) => api.post(`/warehouses/${warehouseId}/stock/movement`, data),
  getStockMovements: (warehouseId, productId) => api.get(`/warehouses/${warehouseId}/stock/movements`, { params: { product_id: productId } }),
};

// Warehouse Transfer APIs
export const warehouseTransferAPI = {
  getAll: (params) => api.get('/warehouse-transfers', { params }),
  create: (data) => api.post('/warehouse-transfers', data),
  dispatch: (id) => api.put(`/warehouse-transfers/${id}/dispatch`),
  receive: (id, items) => api.put(`/warehouse-transfers/${id}/receive`, items),
};

// Store Pricing APIs
export const storePricingAPI = {
  getAll: (storeId) => api.get(`/stores/${storeId}/pricing`),
  set: (storeId, data) => api.post(`/stores/${storeId}/pricing`, data),
  remove: (storeId, productId) => api.delete(`/stores/${storeId}/pricing/${productId}`),
  getAudit: (storeId, productId) => api.get(`/stores/${storeId}/pricing/${productId}/audit`),
};

// Credit Note APIs
export const creditNoteAPI = {
  getAll: (params) => api.get('/credit-notes', { params }),
  get: (id) => api.get(`/credit-notes/${id}`),
  create: (storeId, data) => api.post('/credit-notes', data, { params: { store_id: storeId } }),
  use: (id, transactionId) => api.put(`/credit-notes/${id}/use`, null, { params: { transaction_id: transactionId } }),
};

// Goods Received APIs
export const goodsReceivedAPI = {
  getAll: (storeId) => api.get('/goods-received', { params: { store_id: storeId } }),
  get: (id) => api.get(`/goods-received/${id}`),
  create: (transferId, notes) => api.post('/goods-received', null, { params: { transfer_id: transferId, notes } }),
};
