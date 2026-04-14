import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  organization_id?: string;
  store_ids?: string[];
  is_active?: boolean;
}

export interface Store {
  id: string;
  name: string;
  code?: string;
  address?: string | {
    street?: string;
    city?: string;
    province?: string;
    postal_code?: string;
    country?: string;
  };
  organization_id: string;
  phone?: string;
  email?: string;
}

export interface Organization {
  id: string;
  name: string;
  settings?: {
    currency_symbol?: string;
  };
}

// Auth Store
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      
      setAuth: (user, token) => {
        localStorage.setItem('pos_token', token);
        localStorage.setItem('pos_user', JSON.stringify(user));
        set({ user, token, isAuthenticated: !!(user && token) });
      },
      
      logout: () => {
        localStorage.removeItem('pos_token');
        localStorage.removeItem('pos_user');
        set({ user: null, token: null, isAuthenticated: false });
      },
      
      updateUser: (userData) => {
        const user = { ...get().user!, ...userData };
        localStorage.setItem('pos_user', JSON.stringify(user));
        set({ user });
      },
    }),
    {
      name: 'pos-auth',
      partialize: (state) => ({ user: state.user, token: state.token }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const token = localStorage.getItem('pos_token');
          const userStr = localStorage.getItem('pos_user');
          
          if (token && userStr) {
            try {
              const user = JSON.parse(userStr);
              state.user = user;
              state.token = token;
              state.isAuthenticated = !!(user && token);
            } catch (e) {
              localStorage.removeItem('pos_token');
              localStorage.removeItem('pos_user');
              state.user = null;
              state.token = null;
              state.isAuthenticated = false;
            }
          } else {
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;
          }
        }
      },
    }
  )
);

// Store Selection Store
interface StoreSelectionState {
  selectedStore: Store | null;
  stores: Store[];
  setSelectedStore: (store: Store | null) => void;
  setStores: (stores: Store[]) => void;
}

export const useStoreSelection = create<StoreSelectionState>()(
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
interface CartItem {
  product_id: string;
  product_name: string;
  sku: string;
  brand?: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  tax_type: string;
  tax_amount: number;
  line_total: number;
}

interface CartState {
  items: CartItem[];
  discount: number;
  customer: any | null;
  addItem: (product: any, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  setDiscount: (discount: number) => void;
  setCustomer: (customer: any) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getTotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  discount: 0,
  customer: null,
  
  addItem: (product, quantity = 1) => {
    const items = get().items;
    const productId = product.product_id || product.id;
    const productName = product.product_name || product.name;
    const unitPrice = product.unit_price || product.selling_price;
    const sku = product.sku || '';
    const brand = product.brand || '';
    const taxType = product.tax_type || 'standard';
    
    const existingIndex = items.findIndex(item => item.product_id === productId);
    
    if (existingIndex > -1) {
      const newItems = [...items];
      newItems[existingIndex].quantity += quantity;
      newItems[existingIndex].line_total = 
        newItems[existingIndex].quantity * newItems[existingIndex].unit_price - 
        (newItems[existingIndex].discount_amount || 0);
      set({ items: newItems });
    } else {
      const newItem: CartItem = {
        product_id: productId,
        product_name: productName,
        sku,
        brand,
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
  
  updateQuantity: (productId, quantity) => {
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

// Organization Store
interface OrgState {
  organization: Organization | null;
  setOrganization: (org: Organization | null) => void;
}

export const useOrgStore = create<OrgState>()(
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
