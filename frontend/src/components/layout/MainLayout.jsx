import React, { useEffect, useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useAuthStore, useStoreSelection, useOrgStore } from '@/lib/store';
import { storeAPI, orgAPI } from '@/lib/api';
import { setupOfflineListeners, pullDataFromServer } from '@/lib/offline';
import { Toaster } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';

export function MainLayout() {
  const { isAuthenticated, user, token, setAuth } = useAuthStore();
  const { setStores, setSelectedStore, selectedStore, stores } = useStoreSelection();
  const { setOrganization } = useOrgStore();
  const location = useLocation();
  
  // Check if we're on POS page
  const isPOS = location.pathname === '/pos';
  const [sidebarOpen, setSidebarOpen] = useState(!isPOS);
  const [isHydrated, setIsHydrated] = useState(false);
  
  // Sync auth state from localStorage on mount (in case Zustand persist hasn't hydrated yet)
  useEffect(() => {
    const syncAuth = () => {
      try {
        const storedToken = localStorage.getItem('pos_token');
        const storedUserStr = localStorage.getItem('pos_user');
        
        // If we have stored auth but store doesn't, sync it
        if (storedToken && storedUserStr) {
          // Check if store already has this data
          const currentToken = token || '';
          const currentUserId = user?.id || '';
          
          if (currentToken !== storedToken) {
            try {
              const storedUser = JSON.parse(storedUserStr);
              setAuth(storedUser, storedToken);
            } catch (e) {
              console.error('Failed to parse stored user:', e);
              // Clear corrupted data
              localStorage.removeItem('pos_token');
              localStorage.removeItem('pos_user');
            }
          }
        }
      } catch (error) {
        console.error('Error syncing auth:', error);
      }
      
      // Mark as hydrated after a brief delay to allow Zustand to hydrate
      setTimeout(() => setIsHydrated(true), 150);
    };
    
    syncAuth();
  }, [token, user, setAuth]); // Include dependencies but this should only run once effectively
  
  // Auto-hide sidebar on POS, show on other pages
  useEffect(() => {
    setSidebarOpen(!isPOS);
  }, [isPOS]);

  useEffect(() => {
    setupOfflineListeners();
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      // Check both isAuthenticated and token/user directly
      const authenticated = isAuthenticated || (user && token);
      
      if (authenticated && user) {
        try {
          // Load organization
          if (user.organization_id) {
            const orgRes = await orgAPI.getCurrent();
            setOrganization(orgRes.data);
          }

          // Load stores
          try {
            const storesRes = await storeAPI.getAll();
            setStores(storesRes.data || []);
            
            // Auto-select first store if none selected
            if (storesRes.data && storesRes.data.length > 0 && !selectedStore) {
              setSelectedStore(storesRes.data[0]);
            }
          } catch (storeError) {
            console.error('Failed to load stores:', storeError);
            console.error('Store error details:', {
              message: storeError.message,
              response: storeError.response?.data,
              status: storeError.response?.status,
            });
            // Don't show toast here - let individual pages handle it
            setStores([]);
          }

          // Pull offline data
          if (selectedStore) {
            await pullDataFromServer(selectedStore.id);
          }
        } catch (error) {
          console.error('[MainLayout] Failed to load initial data:', error);
          console.error('[MainLayout] Error details:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
          });
          // Don't show toast here - individual pages will handle their own errors
        }
      }
    };

    if (isHydrated) {
      loadInitialData();
    }
  }, [isAuthenticated, user, token, isHydrated, selectedStore, setStores, setSelectedStore, setOrganization]);

  // Check authentication - verify both store state and localStorage
  const storedToken = localStorage.getItem('pos_token');
  const storedUser = localStorage.getItem('pos_user');
  const hasStoreAuth = isAuthenticated || (user && token);
  const hasLocalStorageAuth = !!(storedToken && storedUser);
  const authenticated = hasStoreAuth || hasLocalStorageAuth;
  
  if (!isHydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* Toggle Button for POS - Higher z-index */}
      {isPOS && (
        <Button
          variant="default"
          size="icon"
          className="fixed top-2 left-2 z-[60] bg-slate-900 hover:bg-slate-800 text-white shadow-xl rounded-lg h-10 w-10"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      )}
      
      {/* Sidebar - Fixed position for POS */}
      <div className={`
        ${isPOS ? 'fixed left-0 top-0 h-full z-[55]' : 'relative'} 
        transition-transform duration-300 ease-in-out
        ${isPOS && !sidebarOpen ? '-translate-x-full' : 'translate-x-0'}
        w-64 flex-shrink-0
      `}>
        <Sidebar onNavigate={() => isPOS && setSidebarOpen(false)} />
      </div>
      
      {/* Overlay for POS when sidebar is open */}
      {isPOS && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[50]"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
      <Toaster position="bottom-left" />
    </div>
  );
}
