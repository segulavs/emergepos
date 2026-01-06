import React, { useState, useEffect } from 'react';
import { useAuthStore, useOrgStore } from '@/lib/store';
import { userAPI, storeAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

const roleLabels = {
  super_admin: 'Super Admin',
  org_admin: 'Organization Admin',
  store_admin: 'Store Admin',
  cashier: 'Cashier',
};

const roleColors = {
  super_admin: 'bg-purple-100 text-purple-800',
  org_admin: 'bg-blue-100 text-blue-800',
  store_admin: 'bg-emerald-100 text-emerald-800',
  cashier: 'bg-slate-100 text-slate-800',
};

export function Users() {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role: 'cashier',
    store_ids: [],
    pin: '',
  });
  const [saving, setSaving] = useState(false);

  const canEdit = ['super_admin', 'org_admin', 'store_admin'].includes(currentUser?.role);

  useEffect(() => {
    loadUsers();
    loadStores();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await userAPI.getAll();
      setUsers(response.data);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadStores = async () => {
    try {
      const response = await storeAPI.getAll();
      setStores(response.data);
    } catch (error) {
      console.error('Failed to load stores:', error);
    }
  };

  const openCreateDialog = () => {
    setEditingUser(null);
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      role: 'cashier',
      store_ids: [],
      pin: '',
    });
    setShowDialog(true);
  };

  const openEditDialog = (user) => {
    setEditingUser(user);
    setFormData({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      password: '',
      role: user.role,
      store_ids: user.store_ids || [],
      pin: '',
    });
    setShowDialog(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const data = { ...formData };
    if (!data.password) delete data.password;
    if (!data.pin) delete data.pin;

    try {
      if (editingUser) {
        await userAPI.update(editingUser.id, data);
        toast.success('User updated!');
      } else {
        if (!data.password) {
          toast.error('Password is required');
          setSaving(false);
          return;
        }
        await userAPI.create(data);
        toast.success('User created!');
      }
      setShowDialog(false);
      loadUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const toggleStore = (storeId) => {
    const currentStores = formData.store_ids;
    if (currentStores.includes(storeId)) {
      setFormData({ ...formData, store_ids: currentStores.filter(id => id !== storeId) });
    } else {
      setFormData({ ...formData, store_ids: [...currentStores, storeId] });
    }
  };

  const availableRoles = () => {
    if (currentUser?.role === 'super_admin') {
      return ['org_admin', 'store_admin', 'cashier'];
    }
    if (currentUser?.role === 'org_admin') {
      return ['store_admin', 'cashier'];
    }
    return ['cashier'];
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Users</h1>
          <p className="text-slate-500">Manage staff and access control</p>
        </div>
        {canEdit && (
          <Button onClick={openCreateDialog} className="bg-emerald-600 hover:bg-emerald-700">
            + Add User
          </Button>
        )}
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Assigned Stores</TableHead>
                <TableHead>Status</TableHead>
                {canEdit && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {user.first_name?.[0]}{user.last_name?.[0]}
                      </div>
                      <span className="font-medium">
                        {user.first_name} {user.last_name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge className={roleColors[user.role]}>
                      {roleLabels[user.role]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.store_ids?.length > 0 ? (
                      <span className="text-sm text-slate-600">
                        {user.store_ids.length} store(s)
                      </span>
                    ) : (
                      <span className="text-sm text-slate-400">All stores</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.is_active ? 'default' : 'secondary'}
                           className={user.is_active ? 'bg-emerald-100 text-emerald-800' : ''}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(user)}
                        disabled={user.id === currentUser?.id}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {users.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    No users found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* User Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'Edit User' : 'Add New User'}
            </DialogTitle>
            <DialogDescription>
              {editingUser ? 'Update user details and permissions' : 'Create a new staff account'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name *</Label>
                  <Input
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name *</Label>
                  <Input
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{editingUser ? 'New Password' : 'Password *'}</Label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingUser ? 'Leave empty to keep current' : ''}
                    required={!editingUser}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role *</Label>
                  <Select 
                    value={formData.role} 
                    onValueChange={(v) => setFormData({ ...formData, role: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles().map(role => (
                        <SelectItem key={role} value={role}>
                          {roleLabels[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {(formData.role === 'cashier' || formData.role === 'store_admin') && stores.length > 0 && (
                <div className="space-y-2">
                  <Label>Assigned Stores</Label>
                  <div className="border rounded-lg p-3 max-h-32 overflow-y-auto space-y-2">
                    {stores.map((store) => (
                      <div key={store.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`store-${store.id}`}
                          checked={formData.store_ids.includes(store.id)}
                          onCheckedChange={() => toggleStore(store.id)}
                        />
                        <label htmlFor={`store-${store.id}`} className="text-sm cursor-pointer">
                          {store.name} ({store.code})
                        </label>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500">
                    Leave empty for access to all stores
                  </p>
                </div>
              )}

              {formData.role === 'cashier' && (
                <div className="space-y-2">
                  <Label>Quick PIN (4 digits)</Label>
                  <Input
                    type="password"
                    maxLength={4}
                    value={formData.pin}
                    onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '') })}
                    placeholder="Optional quick login PIN"
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={saving}>
                {saving ? 'Saving...' : (editingUser ? 'Update' : 'Create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
