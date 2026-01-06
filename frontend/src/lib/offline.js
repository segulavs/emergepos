import localforage from 'localforage';
import { syncAPI } from './api';
import { useOfflineStore } from './store';

// Initialize localforage stores
export const productsDB = localforage.createInstance({
  name: 'pos_offline',
  storeName: 'products',
});

export const stockDB = localforage.createInstance({
  name: 'pos_offline',
  storeName: 'stock',
});

export const transactionsDB = localforage.createInstance({
  name: 'pos_offline',
  storeName: 'transactions',
});

export const settingsDB = localforage.createInstance({
  name: 'pos_offline',
  storeName: 'settings',
});

// Sync data from server to local storage
export const pullDataFromServer = async (storeId) => {
  try {
    const lastSync = await settingsDB.getItem('lastSync');
    const response = await syncAPI.pull(storeId, lastSync);
    const data = response.data;
    
    // Store products
    if (data.products) {
      for (const product of data.products) {
        await productsDB.setItem(product.id, product);
      }
    }
    
    // Store stock
    if (data.stock) {
      for (const item of data.stock) {
        await stockDB.setItem(`${item.store_id}_${item.product_id}`, item);
      }
    }
    
    // Store organization settings
    if (data.organization) {
      await settingsDB.setItem('organization', data.organization);
    }
    
    // Update last sync timestamp
    await settingsDB.setItem('lastSync', data.sync_timestamp);
    useOfflineStore.getState().setLastSyncAt(data.sync_timestamp);
    
    return { success: true, data };
  } catch (error) {
    console.error('Pull sync failed:', error);
    return { success: false, error };
  }
};

// Push pending transactions to server
export const pushPendingTransactions = async (storeId) => {
  const pendingTransactions = useOfflineStore.getState().pendingTransactions;
  
  if (pendingTransactions.length === 0) {
    return { success: true, syncedCount: 0 };
  }
  
  try {
    const response = await syncAPI.push(storeId, {
      entity_type: 'transactions',
      transactions: pendingTransactions,
    });
    
    if (response.data.status === 'completed') {
      useOfflineStore.getState().clearPendingTransactions();
    }
    
    return { success: true, syncedCount: response.data.records_synced };
  } catch (error) {
    console.error('Push sync failed:', error);
    return { success: false, error };
  }
};

// Get products from local storage
export const getOfflineProducts = async (search) => {
  const products = [];
  await productsDB.iterate((value, key) => {
    if (!search || 
        value.name.toLowerCase().includes(search.toLowerCase()) ||
        value.sku.toLowerCase().includes(search.toLowerCase()) ||
        value.barcode === search) {
      products.push(value);
    }
  });
  return products;
};

// Get product by barcode from local storage
export const getOfflineProductByBarcode = async (barcode) => {
  let found = null;
  await productsDB.iterate((value) => {
    if (value.barcode === barcode) {
      found = value;
      return false; // Stop iteration
    }
  });
  return found;
};

// Get stock for a store from local storage
export const getOfflineStock = async (storeId, productId) => {
  const key = `${storeId}_${productId}`;
  return await stockDB.getItem(key);
};

// Save transaction locally
export const saveOfflineTransaction = async (transaction) => {
  await transactionsDB.setItem(transaction.local_id || transaction.id, transaction);
  useOfflineStore.getState().addPendingTransaction(transaction);
};

// Get organization settings
export const getOfflineOrganization = async () => {
  return await settingsDB.getItem('organization');
};

// Check online status and sync
export const syncIfOnline = async (storeId) => {
  if (navigator.onLine) {
    await pushPendingTransactions(storeId);
    await pullDataFromServer(storeId);
  }
};

// Setup online/offline listeners
export const setupOfflineListeners = () => {
  window.addEventListener('online', () => {
    useOfflineStore.getState().setOnlineStatus(true);
  });
  
  window.addEventListener('offline', () => {
    useOfflineStore.getState().setOnlineStatus(false);
  });
};
