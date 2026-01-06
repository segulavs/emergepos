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
  const { isAuthenticated, user } = useAuthStore();
  const { setStores, setSelectedStore, selectedStore, stores } = useStoreSelection();
  const { setOrganization } = useOrgStore();
  const location = useLocation();
  
  // Check if we're on POS page
  const isPOS = location.pathname === '/pos';
  const [sidebarOpen, setSidebarOpen] = useState(!isPOS);
  
  // Auto-hide sidebar on POS, show on other pages
  useEffect(() => {
    setSidebarOpen(!isPOS);
  }, [isPOS]);

  useEffect(() => {
    setupOfflineListeners();
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      if (isAuthenticated && user) {
        try {
          // Load organization
          if (user.organization_id) {
            const orgRes = await orgAPI.getCurrent();
            setOrganization(orgRes.data);
          }

          // Load stores
          const storesRes = await storeAPI.getAll();
          setStores(storesRes.data);
          
          // Auto-select first store if none selected
          if (storesRes.data.length > 0 && !selectedStore) {
            setSelectedStore(storesRes.data[0]);
          }

          // Pull offline data
          if (selectedStore) {
            await pullDataFromServer(selectedStore.id);
          }
        } catch (error) {
          console.error('Failed to load initial data:', error);
        }
      }
    };

    loadInitialData();
  }, [isAuthenticated, user]);

  if (!isAuthenticated) {
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
