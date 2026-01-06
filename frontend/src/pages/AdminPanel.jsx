import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store';
import { adminAPI, userAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

export function AdminPanel() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [orgUsers, setOrgUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showOrgDialog, setShowOrgDialog] = useState(false);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);
  
  const [orgFormData, setOrgFormData] = useState({
    name: '',
    slug: '',
    subscription_plan: 'free',
    max_stores: 1,
    max_users: 5,
  });
  
  const [userFormData, setUserFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role: 'org_admin',
  });

  useEffect(() => {
    if (user?.role === 'super_admin') {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, orgsRes] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getOrganizations(),
      ]);
      setStats(statsRes.data);
      setOrganizations(orgsRes.data);
    } catch (error) {
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const loadOrgUsers = async (orgId) => {
    try {
      const response = await adminAPI.getUsers(orgId);
      setOrgUsers(response.data);
    } catch (error) {
      toast.error('Failed to load users');
    }
  };

  const handleOrgClick = (org) => {
    setSelectedOrg(org);
    loadOrgUsers(org.id);
  };

  const openCreateOrgDialog = () => {
    setEditingOrg(null);
    setOrgFormData({
      name: '',
      slug: '',
      subscription_plan: 'free',
      max_stores: 1,
      max_users: 5,
    });
    setShowOrgDialog(true);
  };

  const openEditOrgDialog = (org) => {
    setEditingOrg(org);
    setOrgFormData({
      name: org.name,
      slug: org.slug,
      subscription_plan: org.subscription_plan || 'free',
      max_stores: org.max_stores || 1,
      max_users: org.max_users || 5,
    });
    setShowOrgDialog(true);
  };

  const handleSaveOrg = async (e) => {
    e.preventDefault();
    try {
      if (editingOrg) {
        await adminAPI.updateOrganization(editingOrg.id, orgFormData);
        toast.success('Organization updated!');
      } else {
        await adminAPI.createOrganization(orgFormData);
        toast.success('Organization created!');
      }
      setShowOrgDialog(false);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save organization');
    }
  };

  const handleToggleOrgStatus = async (org) => {
    try {
      await adminAPI.updateOrganization(org.id, { is_active: !org.is_active });
      toast.success(`Organization ${org.is_active ? 'deactivated' : 'activated'}`);
      loadData();
    } catch (error) {
      toast.error('Failed to update organization');
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!selectedOrg) return;
    
    try {
      await adminAPI.createUserForOrg(selectedOrg.id, userFormData);
      toast.success('User created!');
      setShowUserDialog(false);
      loadOrgUsers(selectedOrg.id);
      setUserFormData({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        role: 'org_admin',
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create user');
    }
  };

  if (user?.role !== 'super_admin') {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="p-8 text-center">
          <p className="text-xl text-slate-500">Access Denied</p>
          <p className="text-sm text-slate-400 mt-2">Super Admin access required</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">SaaS Admin Panel</h1>
          <p className="text-slate-500">Manage organizations and platform settings</p>
        </div>
        <Badge className="bg-purple-100 text-purple-800">Super Admin</Badge>
      </div>

      {/* Platform Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-slate-500">Organizations</p>
              <p className="text-2xl font-bold">{stats.organizations?.active || 0}</p>
              <p className="text-xs text-slate-400">{stats.organizations?.total} total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-slate-500">Stores</p>
              <p className="text-2xl font-bold text-emerald-600">{stats.stores || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-slate-500">Users</p>
              <p className="text-2xl font-bold text-blue-600">{stats.users || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-slate-500">Products</p>
              <p className="text-2xl font-bold text-purple-600">{stats.products || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-slate-500">Monthly Sales</p>
              <p className="text-2xl font-bold text-orange-600">
                K{(stats.monthly_sales?.total || 0).toLocaleString()}
              </p>
              <p className="text-xs text-slate-400">{stats.monthly_sales?.transactions || 0} transactions</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Daily Signups Chart */}
      {stats?.daily_signups?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>User Signups (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.daily_signups}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="_id" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10b981" name="Signups" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Organizations Management */}
      <Tabs defaultValue="organizations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
          <TabsTrigger value="details" disabled={!selectedOrg}>
            {selectedOrg ? `${selectedOrg.name} Details` : 'Select Organization'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="organizations">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>All Organizations</CardTitle>
                <Button onClick={openCreateOrgDialog} className="bg-emerald-600 hover:bg-emerald-700">
                  + New Organization
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Stores</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead>Products</TableHead>
                    <TableHead>Monthly Sales</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organizations.map((org) => (
                    <TableRow 
                      key={org.id} 
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => handleOrgClick(org)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">{org.name}</p>
                          <p className="text-xs text-slate-500">{org.slug}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {org.subscription_plan || 'free'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {org.stats?.store_count || 0} / {org.max_stores || '∞'}
                      </TableCell>
                      <TableCell>
                        {org.stats?.user_count || 0} / {org.max_users || '∞'}
                      </TableCell>
                      <TableCell>{org.stats?.product_count || 0}</TableCell>
                      <TableCell>
                        K{(org.stats?.monthly_sales || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={org.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}>
                          {org.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditOrgDialog(org)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={org.is_active ? 'text-red-600' : 'text-emerald-600'}
                          onClick={() => handleToggleOrgStatus(org)}
                        >
                          {org.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {organizations.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                        No organizations found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details">
          {selectedOrg && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Org Info */}
              <Card>
                <CardHeader>
                  <CardTitle>{selectedOrg.name}</CardTitle>
                  <CardDescription>Organization Details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-slate-500">Slug</p>
                    <p className="font-medium">{selectedOrg.slug}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Subscription Plan</p>
                    <Badge className="capitalize">{selectedOrg.subscription_plan || 'free'}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">TPIN</p>
                    <p className="font-medium">{selectedOrg.settings?.tpin || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Currency</p>
                    <p className="font-medium">{selectedOrg.settings?.currency} ({selectedOrg.settings?.currency_symbol})</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">VAT Rate</p>
                    <p className="font-medium">{selectedOrg.settings?.tax_rate}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Created</p>
                    <p className="font-medium">{new Date(selectedOrg.created_at).toLocaleDateString()}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Org Users */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Users</CardTitle>
                    <Button onClick={() => setShowUserDialog(true)} size="sm">
                      + Add User
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orgUsers.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell>{u.first_name} {u.last_name}</TableCell>
                          <TableCell>{u.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {u.role?.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={u.is_active ? 'bg-emerald-100 text-emerald-800' : ''}>
                              {u.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {orgUsers.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-4 text-slate-500">
                            No users found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Organization Dialog */}
      <Dialog open={showOrgDialog} onOpenChange={setShowOrgDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingOrg ? 'Edit Organization' : 'Create Organization'}</DialogTitle>
            <DialogDescription>
              {editingOrg ? 'Update organization details' : 'Create a new organization'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveOrg}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Organization Name *</Label>
                  <Input
                    value={orgFormData.name}
                    onChange={(e) => setOrgFormData({ ...orgFormData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Slug *</Label>
                  <Input
                    value={orgFormData.slug}
                    onChange={(e) => setOrgFormData({ ...orgFormData, slug: e.target.value.toLowerCase().replace(/\s/g, '-') })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Subscription Plan</Label>
                <Select
                  value={orgFormData.subscription_plan}
                  onValueChange={(v) => setOrgFormData({ ...orgFormData, subscription_plan: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Max Stores</Label>
                  <Input
                    type="number"
                    value={orgFormData.max_stores}
                    onChange={(e) => setOrgFormData({ ...orgFormData, max_stores: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Users</Label>
                  <Input
                    type="number"
                    value={orgFormData.max_users}
                    onChange={(e) => setOrgFormData({ ...orgFormData, max_users: parseInt(e.target.value) })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowOrgDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                {editingOrg ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* User Dialog */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add User to {selectedOrg?.name}</DialogTitle>
            <DialogDescription>
              Create a new user for this organization
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUser}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name *</Label>
                  <Input
                    value={userFormData.first_name}
                    onChange={(e) => setUserFormData({ ...userFormData, first_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name *</Label>
                  <Input
                    value={userFormData.last_name}
                    onChange={(e) => setUserFormData({ ...userFormData, last_name: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Password *</Label>
                  <Input
                    type="password"
                    value={userFormData.password}
                    onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select
                    value={userFormData.role}
                    onValueChange={(v) => setUserFormData({ ...userFormData, role: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="org_admin">Organization Admin</SelectItem>
                      <SelectItem value="store_admin">Store Admin</SelectItem>
                      <SelectItem value="cashier">Cashier</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowUserDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                Create User
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
