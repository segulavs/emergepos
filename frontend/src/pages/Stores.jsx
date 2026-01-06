import React, { useState, useEffect } from 'react';
import { useAuthStore, useOrgStore } from '@/lib/store';
import { storeAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export function Stores() {
  const { user } = useAuthStore();
  const { organization } = useOrgStore();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingStore, setEditingStore] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    phone: '',
    email: '',
    street: '',
    city: '',
    province: '',
    latitude: '',
    longitude: '',
  });
  const [saving, setSaving] = useState(false);

  const canEdit = ['super_admin', 'org_admin'].includes(user?.role);

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    setLoading(true);
    try {
      const response = await storeAPI.getAll();
      setStores(response.data);
    } catch (error) {
      toast.error('Failed to load stores');
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingStore(null);
    setFormData({
      name: '',
      code: '',
      phone: '',
      email: '',
      street: '',
      city: '',
      province: '',
      latitude: '',
      longitude: '',
    });
    setShowDialog(true);
  };

  const openEditDialog = (store) => {
    setEditingStore(store);
    setFormData({
      name: store.name,
      code: store.code,
      phone: store.phone || '',
      email: store.email || '',
      street: store.address?.street || '',
      city: store.address?.city || '',
      province: store.address?.province || '',
      latitude: store.location?.latitude?.toString() || '',
      longitude: store.location?.longitude?.toString() || '',
    });
    setShowDialog(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const data = {
      name: formData.name,
      code: formData.code,
      phone: formData.phone,
      email: formData.email,
      address: {
        street: formData.street,
        city: formData.city,
        province: formData.province,
        country: 'Zambia',
      },
      location: {
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      },
    };

    try {
      if (editingStore) {
        await storeAPI.update(editingStore.id, data);
        toast.success('Store updated!');
      } else {
        await storeAPI.create(data);
        toast.success('Store created!');
      }
      setShowDialog(false);
      loadStores();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save store');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Stores</h1>
          <p className="text-slate-500">Manage your store locations</p>
        </div>
        {canEdit && (
          <Button onClick={openCreateDialog} className="bg-emerald-600 hover:bg-emerald-700">
            + Add Store
          </Button>
        )}
      </div>

      {/* Stores Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stores.map((store) => (
          <Card key={store.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{store.name}</CardTitle>
                  <p className="text-sm text-slate-500">Code: {store.code}</p>
                </div>
                <Badge variant={store.is_active ? 'default' : 'secondary'}
                       className={store.is_active ? 'bg-emerald-100 text-emerald-800' : ''}>
                  {store.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {store.address?.city && (
                  <p className="text-slate-600">
                    📍 {store.address.street}, {store.address.city}, {store.address.province}
                  </p>
                )}
                {store.phone && (
                  <p className="text-slate-600">📞 {store.phone}</p>
                )}
                {store.email && (
                  <p className="text-slate-600">✉️ {store.email}</p>
                )}
                {store.location?.latitude && store.location?.longitude && (
                  <p className="text-xs text-slate-400">
                    GPS: {store.location.latitude.toFixed(4)}, {store.location.longitude.toFixed(4)}
                  </p>
                )}
                {store.last_sync_at && (
                  <p className="text-xs text-slate-400">
                    Last sync: {new Date(store.last_sync_at).toLocaleString()}
                  </p>
                )}
              </div>
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-4"
                  onClick={() => openEditDialog(store)}
                >
                  Edit Store
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
        {stores.length === 0 && !loading && (
          <Card className="col-span-full p-8 text-center">
            <p className="text-slate-500">No stores found. Create your first store!</p>
          </Card>
        )}
      </div>

      {/* Store Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingStore ? 'Edit Store' : 'Add New Store'}
            </DialogTitle>
            <DialogDescription>
              {editingStore ? 'Update store details' : 'Add a new store location'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Store Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Store Code *</Label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g., STORE001"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+260..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Street Address</Label>
                <Input
                  value={formData.street}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Province</Label>
                  <Input
                    value={formData.province}
                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Latitude</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    placeholder="e.g., -15.4167"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Longitude</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    placeholder="e.g., 28.2833"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={saving}>
                {saving ? 'Saving...' : (editingStore ? 'Update' : 'Create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
