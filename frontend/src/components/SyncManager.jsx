import React, { useState, useEffect } from 'react';
import { useOfflineStore, useStoreSelection } from '@/lib/store';
import { pushPendingTransactions, pullDataFromServer } from '@/lib/offline';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Wifi, WifiOff, RefreshCw, Upload, Download, Clock, Check, AlertCircle } from 'lucide-react';

export function SyncManager({ showButton = true }) {
  const { isOnline, pendingTransactions, lastSyncAt, setLastSyncAt } = useOfflineStore();
  const { selectedStore } = useStoreSelection();
  const [syncing, setSyncing] = useState(false);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [syncStatus, setSyncStatus] = useState('idle'); // idle, syncing, success, error
  const [syncMessage, setSyncMessage] = useState('');

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingTransactions.length > 0) {
      handleSync();
    }
  }, [isOnline]);

  const handleSync = async () => {
    if (!selectedStore || syncing) return;

    setSyncing(true);
    setSyncStatus('syncing');
    setSyncMessage('Syncing data...');

    try {
      // Push pending transactions
      if (pendingTransactions.length > 0) {
        setSyncMessage(`Uploading ${pendingTransactions.length} pending transactions...`);
        const pushResult = await pushPendingTransactions(selectedStore.id);
        if (pushResult.success) {
          setSyncMessage(`Uploaded ${pushResult.syncedCount} transactions`);
        } else {
          throw new Error('Failed to upload transactions');
        }
      }

      // Pull latest data
      setSyncMessage('Downloading latest data...');
      const pullResult = await pullDataFromServer(selectedStore.id);
      if (pullResult.success) {
        setLastSyncAt(pullResult.data.sync_timestamp);
        setSyncStatus('success');
        setSyncMessage('Sync completed successfully');
        toast.success('Data synced successfully');
      } else {
        throw new Error('Failed to download data');
      }
    } catch (error) {
      setSyncStatus('error');
      setSyncMessage(error.message || 'Sync failed');
      toast.error('Sync failed. Will retry when online.');
    } finally {
      setSyncing(false);
    }
  };

  const formatLastSync = () => {
    if (!lastSyncAt) return 'Never';
    const date = new Date(lastSyncAt);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  if (!showButton) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant={isOnline ? 'default' : 'destructive'} className="text-xs">
          {isOnline ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
          {isOnline ? 'Online' : 'Offline'}
        </Badge>
        {pendingTransactions.length > 0 && (
          <Badge variant="warning" className="bg-amber-100 text-amber-800 text-xs">
            {pendingTransactions.length} pending
          </Badge>
        )}
      </div>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowSyncDialog(true)}
        className="gap-2"
      >
        {isOnline ? (
          <Wifi className="w-4 h-4 text-emerald-500" />
        ) : (
          <WifiOff className="w-4 h-4 text-red-500" />
        )}
        <span className="hidden md:inline">{isOnline ? 'Online' : 'Offline'}</span>
        {pendingTransactions.length > 0 && (
          <Badge variant="secondary" className="ml-1">
            {pendingTransactions.length}
          </Badge>
        )}
      </Button>

      <Dialog open={showSyncDialog} onOpenChange={setShowSyncDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isOnline ? (
                <Wifi className="w-5 h-5 text-emerald-500" />
              ) : (
                <WifiOff className="w-5 h-5 text-red-500" />
              )}
              Sync Status
            </DialogTitle>
            <DialogDescription>
              {isOnline ? 'Connected to server' : 'Working offline - data will sync when online'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Status Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-100 p-3 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Clock className="w-4 h-4" />
                  Last Sync
                </div>
                <p className="font-bold mt-1">{formatLastSync()}</p>
              </div>
              <div className={`p-3 rounded-lg ${pendingTransactions.length > 0 ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Upload className="w-4 h-4" />
                  Pending
                </div>
                <p className="font-bold mt-1">{pendingTransactions.length} transactions</p>
              </div>
            </div>

            {/* Sync Progress */}
            {syncing && (
              <div className="bg-blue-50 p-3 rounded-lg flex items-center gap-3">
                <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                <span className="text-blue-800">{syncMessage}</span>
              </div>
            )}

            {syncStatus === 'success' && !syncing && (
              <div className="bg-emerald-50 p-3 rounded-lg flex items-center gap-3">
                <Check className="w-5 h-5 text-emerald-600" />
                <span className="text-emerald-800">{syncMessage}</span>
              </div>
            )}

            {syncStatus === 'error' && !syncing && (
              <div className="bg-red-50 p-3 rounded-lg flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="text-red-800">{syncMessage}</span>
              </div>
            )}

            {/* Pending Transactions List */}
            {pendingTransactions.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2">Pending Transactions</h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {pendingTransactions.slice(0, 5).map((tx, idx) => (
                    <div key={idx} className="text-xs bg-slate-50 p-2 rounded flex justify-between">
                      <span>{tx.customer_name || 'Customer'}</span>
                      <span className="font-mono">{tx.items?.length || 0} items</span>
                    </div>
                  ))}
                  {pendingTransactions.length > 5 && (
                    <p className="text-xs text-slate-500">+{pendingTransactions.length - 5} more...</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSyncDialog(false)}>
              Close
            </Button>
            <Button 
              onClick={handleSync} 
              disabled={!isOnline || syncing}
              className="gap-2"
            >
              {syncing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Sync Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
