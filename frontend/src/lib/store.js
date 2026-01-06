import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Auth Store
export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      
      setAuth: (user, token) => {
        localStorage.setItem('pos_token', token);
        localStorage.setItem('pos_user', JSON.stringify(user));
        set({ user, token, isAuthenticated: true });
      },
      
      logout: () => {
        localStorage.removeItem('pos_token');
        localStorage.removeItem('pos_user');
        set({ user: null, token: null, isAuthenticated: false });
      },
      
      updateUser: (userData) => {
        const user = { ...get().user, ...userData };
        localStorage.setItem('pos_user', JSON.stringify(user));
        set({ user });
      },
    }),
    {
      name: 'pos-auth',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
);

// Store Selection Store
export const useStoreSelection = create(
  persist(
    (set) => ({
      selectedStore: null,
      stores: [],
      
      setSelectedStore: (store) => set({ selectedStore: store }),
      setStores: (stores) => set({ stores }),
    }),
    {
      name: 'pos-store-selection',
    }
  )
);

// Cart Store (for POS)
export const useCartStore = create((set, get) => ({
  items: [],
  discount: 0,
  customer: null,
  
  addItem: (product, quantity = 1) => {
    const items = get().items;
    // Support both {id, name, selling_price} and {product_id, product_name, unit_price}
    const productId = product.product_id || product.id;
    const productName = product.product_name || product.name;
    const unitPrice = product.unit_price || product.selling_price;
    const sku = product.sku || '';
    const taxType = product.tax_type || 'standard';
    
    const existingIndex = items.findIndex(item => item.product_id === productId);
    
    if (existingIndex > -1) {
      const newItems = [...items];
      newItems[existingIndex].quantity += quantity;
      newItems[existingIndex].line_total = 
        newItems[existingIndex].quantity * newItems[existingIndex].unit_price - (newItems[existingIndex].discount_amount || 0);
      set({ items: newItems });
    } else {
      const newItem = {
        product_id: productId,
        product_name: productName,
        sku: sku,
        quantity,
        unit_price: unitPrice,
        discount_amount: 0,
        tax_type: taxType,
        tax_amount: 0,
        line_total: quantity * unitPrice,
      };
      set({ items: [...items, newItem] });
    }
  },
  
  updateQuantity: (productId, newQuantity) => {
    const items = get().items.map(item => {
      if (item.product_id === productId) {
        return {
          ...item,
          quantity: newQuantity,
          line_total: newQuantity * item.unit_price - (item.discount_amount || 0),
        };
      }
      return item;
    }).filter(item => item.quantity > 0);
    set({ items });
  },
  
  updateItemQuantity: (productId, quantity) => {
    const items = get().items.map(item => {
      if (item.product_id === productId) {
        return {
          ...item,
          quantity,
          line_total: quantity * item.unit_price - (item.discount_amount || 0),
        };
      }
      return item;
    }).filter(item => item.quantity > 0);
    set({ items });
  },
  
  updateItemDiscount: (productId, discountAmount) => {
    const items = get().items.map(item => {
      if (item.product_id === productId) {
        return {
          ...item,
          discount_amount: discountAmount,
          line_total: item.quantity * item.unit_price - discountAmount,
        };
      }
      return item;
    });
    set({ items });
  },
  
  removeItem: (productId) => {
    set({ items: get().items.filter(item => item.product_id !== productId) });
  },
  
  setDiscount: (discount) => set({ discount }),
  
  setCustomer: (customer) => set({ customer }),
  
  clearCart: () => set({ items: [], discount: 0, customer: null }),
  
  getSubtotal: () => get().items.reduce((sum, item) => sum + item.line_total, 0),
  
  getTotal: () => {
    const subtotal = get().getSubtotal();
    return subtotal - get().discount;
  },
}));

// Offline Queue Store
export const useOfflineStore = create(
  persist(
    (set, get) => ({
      isOnline: navigator.onLine,
      pendingTransactions: [],
      lastSyncAt: null,
      
      setOnlineStatus: (isOnline) => set({ isOnline }),
      
      addPendingTransaction: (transaction) => {
        set({ pendingTransactions: [...get().pendingTransactions, transaction] });
      },
      
      removePendingTransaction: (localId) => {
        set({ 
          pendingTransactions: get().pendingTransactions.filter(t => t.local_id !== localId) 
        });
      },
      
      clearPendingTransactions: () => set({ pendingTransactions: [] }),
      
      setLastSyncAt: (timestamp) => set({ lastSyncAt: timestamp }),
    }),
    {
      name: 'pos-offline',
    }
  )
);

// Organization Store
export const useOrgStore = create(
  persist(
    (set) => ({
      organization: null,
      setOrganization: (org) => set({ organization: org }),
    }),
    {
      name: 'pos-organization',
    }
  )
);
