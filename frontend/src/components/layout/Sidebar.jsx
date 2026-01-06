import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuthStore, useStoreSelection, useOfflineStore, useOrgStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊', roles: ['super_admin', 'org_admin', 'store_admin'] },
  { path: '/pos', label: 'Point of Sale', icon: '💰', roles: ['super_admin', 'org_admin', 'store_admin', 'cashier'] },
  { path: '/products', label: 'Products', icon: '📦', roles: ['super_admin', 'org_admin', 'store_admin'] },
  { path: '/inventory', label: 'Inventory', icon: '📋', roles: ['super_admin', 'org_admin', 'store_admin'] },
  { path: '/warehouses', label: 'Warehouses', icon: '🏭', roles: ['super_admin', 'org_admin'] },
  { path: '/transfers', label: 'Transfers', icon: '🔄', roles: ['super_admin', 'org_admin', 'store_admin'] },
  { path: '/transactions', label: 'Transactions', icon: '🧾', roles: ['super_admin', 'org_admin', 'store_admin'] },
  { path: '/analytics', label: 'Analytics', icon: '📈', roles: ['super_admin', 'org_admin'] },
  { path: '/stores', label: 'Stores', icon: '🏪', roles: ['super_admin', 'org_admin'] },
  { path: '/store-pricing', label: 'Store Pricing', icon: '💲', roles: ['super_admin', 'org_admin'] },
  { path: '/users', label: 'Users', icon: '👥', roles: ['super_admin', 'org_admin', 'store_admin'] },
  { path: '/settings', label: 'Settings', icon: '⚙️', roles: ['super_admin', 'org_admin'] },
  { path: '/admin', label: 'Admin Panel', icon: '🛡️', roles: ['super_admin'] },
];

export function Sidebar({ onNavigate }) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { selectedStore, stores, setSelectedStore } = useStoreSelection();
  const { isOnline, pendingTransactions } = useOfflineStore();
  const { organization } = useOrgStore();
  
  const systemLogo = organization?.settings?.system_logo;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavClick = (path) => {
    navigate(path);
    if (onNavigate) onNavigate();
  };

  const filteredNavItems = navItems.filter(item => 
    item.roles.includes(user?.role)
  );

  return (
    <div className="flex flex-col h-full w-64 bg-slate-900 text-white">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          {systemLogo ? (
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-white flex items-center justify-center flex-shrink-0">
              <img 
                src={systemLogo} 
                alt="Logo" 
                className="max-w-full max-h-full object-contain"
              />
            </div>
          ) : (
            <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center text-xl font-bold text-white flex-shrink-0">
              NG
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-emerald-400">NG POS</h1>
            <p className="text-xs text-slate-400">Inventory & Sales System</p>
          </div>
        </div>
      </div>

      {/* Online Status */}
      <div className="px-4 py-2 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            isOnline ? "bg-green-500" : "bg-red-500"
          )} />
          <span className="text-xs text-slate-400">
            {isOnline ? 'Online' : 'Offline'}
          </span>
          {pendingTransactions.length > 0 && (
            <Badge variant="destructive" className="text-xs">
              {pendingTransactions.length} pending
            </Badge>
          )}
        </div>
      </div>

      {/* Store Selector */}
      {stores.length > 0 && user?.role !== 'super_admin' && (
        <div className="px-4 py-3 border-b border-slate-700">
          <label className="text-xs text-slate-400 mb-1 block">Current Store</label>
          <Select
            value={selectedStore?.id || ''}
            onValueChange={(value) => {
              const store = stores.find(s => s.id === value);
              setSelectedStore(store);
            }}
          >
            <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
              <SelectValue placeholder="Select store" />
            </SelectTrigger>
            <SelectContent>
              {stores.map(store => (
                <SelectItem key={store.id} value={store.id}>
                  {store.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {filteredNavItems.map(item => (
          <button
            key={item.path}
            onClick={() => handleNavClick(item.path)}
            className={cn(
              "flex items-center gap-3 px-4 py-3 text-sm transition-colors w-full text-left",
              location.pathname === item.path
                ? "bg-emerald-600/20 text-emerald-400 border-r-2 border-emerald-400" 
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            )}
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center text-lg font-bold">
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user?.first_name} {user?.last_name}
            </p>
            <p className="text-xs text-slate-400 capitalize">
              {user?.role?.replace('_', ' ')}
            </p>
          </div>
        </div>
        <Button 
          variant="outline" 
          className="w-full border-slate-600 text-slate-300 hover:bg-slate-800"
          onClick={handleLogout}
        >
          Logout
        </Button>
      </div>
    </div>
  );
}
