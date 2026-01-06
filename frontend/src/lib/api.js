import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pos_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('pos_token');
      localStorage.removeItem('pos_user');
      window.location.href = '/login';
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
