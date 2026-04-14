import axios from 'axios';
import { Capacitor } from '@capacitor/core';

// Get backend URL from environment or use default
let BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

// For web development (browser), default to localhost:8000
// For mobile apps, if no URL is set, use platform-specific defaults
if (!BACKEND_URL) {
  if (Capacitor.isNativePlatform()) {
    // For iOS simulator use localhost, for Android emulator use 10.0.2.2
    BACKEND_URL = Capacitor.getPlatform() === 'ios' 
      ? 'http://localhost:8000' 
      : 'http://10.0.2.2:8000';
  } else {
    // For web browser, use localhost:8000
    BACKEND_URL = 'http://localhost:8000';
  }
}

export const API_BASE = `${BACKEND_URL}/api`;

console.log('[API Config] BACKEND_URL:', BACKEND_URL || '(empty - same origin)');
console.log('[API Config] API_BASE:', API_BASE);
console.log('[API Config] Platform:', Capacitor.getPlatform());
console.log('[API Config] Is Native:', Capacitor.isNativePlatform());

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pos_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  console.log('[API Request]', config.method?.toUpperCase(), (config.baseURL || '') + (config.url || ''));
  return config;
}, (error) => {
  console.error('[API Request Error]', error);
  return Promise.reject(error);
});

// Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log network errors for debugging
    if (!error.response) {
      console.error('[API] Network error:', error.message);
      console.error('[API] Request URL:', error.config?.url);
      console.error('[API] Base URL:', error.config?.baseURL);
      console.error('[API] Full config:', error.config);
    }
    
    if (error.response?.status === 401) {
      localStorage.removeItem('pos_token');
      localStorage.removeItem('pos_user');
      // Redirect to login will be handled by the app router
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth APIs
export const authAPI = {
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  register: (data: any) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
};

// Organization APIs
export const orgAPI = {
  getCurrent: () => api.get('/organizations/current'),
  update: (id: string, data: any) => api.put(`/organizations/${id}`, data),
};

// Store APIs
export const storeAPI = {
  getAll: () => api.get('/stores'),
  get: (id: string) => api.get(`/stores/${id}`),
  create: (data: any) => api.post('/stores', data),
  update: (id: string, data: any) => api.put(`/stores/${id}`, data),
};

// User APIs
export const userAPI = {
  getAll: () => api.get('/users'),
  create: (data: any) => api.post('/users', data),
  update: (id: string, data: any) => api.put(`/users/${id}`, data),
};

// Product APIs
export const productAPI = {
  getAll: (params?: any) => api.get('/products', { params }),
  getWithStock: (storeId: string, params?: any) => api.get(`/products/with-stock/${storeId}`, { params }),
  get: (id: string) => api.get(`/products/${id}`),
  getByBarcode: (barcode: string) => api.get(`/products/barcode/${barcode}`),
  create: (data: any) => api.post('/products', data),
  update: (id: string, data: any) => api.put(`/products/${id}`, data),
  delete: (id: string) => api.delete(`/products/${id}`),
  getBrands: () => api.get('/products/brands'),
};

// Stock APIs
export const stockAPI = {
  getByStore: (storeId: string) => api.get(`/stock/${storeId}`),
  getAllStores: () => api.get('/stock/all-stores'),
  createMovement: (storeId: string, data: any) => api.post(`/stock/${storeId}/movement`, data),
  getMovements: (storeId: string, productId?: string) => 
    api.get(`/stock/${storeId}/movements`, { params: { product_id: productId } }),
};

// Transfer APIs
export const transferAPI = {
  getAll: (params?: any) => api.get('/transfers', { params }),
  create: (data: any) => api.post('/transfers', data),
  dispatch: (id: string) => api.put(`/transfers/${id}/dispatch`),
  receive: (id: string, items: any) => api.put(`/transfers/${id}/receive`, items),
};

// Transaction APIs
export const transactionAPI = {
  getAll: (params?: any) => api.get('/transactions', { params }),
  get: (id: string) => api.get(`/transactions/${id}`),
  create: (storeId: string, data: any) => 
    api.post('/transactions', data, { params: { store_id: storeId } }),
  void: (id: string, reason: string) => 
    api.post(`/transactions/${id}/void`, null, { params: { reason } }),
  refund: (id: string, reason: string, items: any) => 
    api.post(`/transactions/${id}/refund`, items, { params: { reason } }),
};

// Session APIs
export const sessionAPI = {
  start: (storeId: string, data: any) => 
    api.post('/sessions/start', data, { params: { store_id: storeId } }),
  end: (storeId: string, data: any) => 
    api.post('/sessions/end', data, { params: { store_id: storeId } }),
  getCurrent: (storeId: string) => 
    api.get('/sessions/current', { params: { store_id: storeId } }),
  getAll: (storeId: string) => 
    api.get('/sessions', { params: { store_id: storeId } }),
  getReport: (sessionId: string) => api.get(`/sessions/${sessionId}/report`),
};

// Analytics APIs
export const analyticsAPI = {
  getSalesSummary: (params?: any) => api.get('/analytics/sales-summary', { params }),
  getStoresMap: () => api.get('/analytics/stores-map'),
  getSalesTrend: (params?: any) => api.get('/analytics/sales-trend', { params }),
  getTopProducts: (params?: any) => api.get('/analytics/top-products', { params }),
  getDashboard: (storeId?: string) => 
    api.get('/analytics/dashboard', { params: { store_id: storeId } }),
};

// Warehouse APIs
export const warehouseAPI = {
  getAll: () => api.get('/warehouses'),
  get: (id: string) => api.get(`/warehouses/${id}`),
  create: (data: any) => api.post('/warehouses', data),
  update: (id: string, data: any) => api.put(`/warehouses/${id}`, data),
  delete: (id: string) => api.delete(`/warehouses/${id}`),
  getStock: (warehouseId: string) => api.get(`/warehouses/${warehouseId}/stock`),
};
