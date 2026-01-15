import React, { useState, useEffect, useRef } from 'react';
import { useOrgStore, useAuthStore } from '@/lib/store';
import { orgAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
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
import { Upload, X, Image } from 'lucide-react';

const defaultPaymentMethods = [
  { id: '1', name: 'Cash', code: 'cash', icon: '💵', is_active: true, requires_reference: false },
  { id: '2', name: 'Card', code: 'card', icon: '💳', is_active: true, requires_reference: true },
  { id: '3', name: 'Mobile Money', code: 'mobile_money', icon: '📱', is_active: true, requires_reference: true },
];

export function Settings() {
  const { organization, setOrganization } = useOrgStore();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    currency: 'ZMW',
    currency_symbol: 'K',
    tax_rate: 16,
    tax_inclusive_pricing: true,
    tpin: '',
    receipt_footer: '',
    invoice_prefix: '',
    timezone: 'Africa/Lusaka',
    fiscal_compliance_enabled: true,
    allow_negative_stock: false,
    low_stock_threshold: 10,
    payment_methods: defaultPaymentMethods,
    system_logo: null,
    invoice_logo: null,
  });

  const systemLogoInputRef = useRef(null);
  const invoiceLogoInputRef = useRef(null);

  const [paymentFormData, setPaymentFormData] = useState({
    name: '',
    code: '',
    icon: '💵',
    is_active: true,
    requires_reference: false,
  });

  useEffect(() => {
    if (organization) {
      setFormData({
        name: organization.name || '',
        slug: organization.slug || '',
        currency: organization.settings?.currency || 'ZMW',
        currency_symbol: organization.settings?.currency_symbol || 'K',
        tax_rate: organization.settings?.tax_rate || 16,
        tax_inclusive_pricing: organization.settings?.tax_inclusive_pricing ?? true,
        tpin: organization.settings?.tpin || '',
        receipt_footer: organization.settings?.receipt_footer || '',
        invoice_prefix: organization.settings?.invoice_prefix || '',
        timezone: organization.settings?.timezone || 'Africa/Lusaka',
        fiscal_compliance_enabled: organization.settings?.fiscal_compliance_enabled ?? true,
        allow_negative_stock: organization.settings?.allow_negative_stock ?? false,
        low_stock_threshold: organization.settings?.low_stock_threshold || 10,
        payment_methods: organization.settings?.payment_methods || defaultPaymentMethods,
        system_logo: organization.settings?.system_logo || null,
        invoice_logo: organization.settings?.invoice_logo || null,
      });
    }
  }, [organization]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await orgAPI.update(organization.id, {
        name: formData.name,
        slug: formData.slug,
        settings: {
          currency: formData.currency,
          currency_symbol: formData.currency_symbol,
          tax_rate: parseFloat(formData.tax_rate),
          tax_inclusive_pricing: formData.tax_inclusive_pricing,
          tpin: formData.tpin,
          receipt_footer: formData.receipt_footer,
          invoice_prefix: formData.invoice_prefix,
          timezone: formData.timezone,
          fiscal_compliance_enabled: formData.fiscal_compliance_enabled,
          allow_negative_stock: formData.allow_negative_stock,
          low_stock_threshold: parseInt(formData.low_stock_threshold),
          payment_methods: formData.payment_methods,
          system_logo: formData.system_logo,
          invoice_logo: formData.invoice_logo,
        },
      });
      setOrganization(response.data);
      toast.success('Settings saved!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = (type, event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size should be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      if (type === 'system') {
        setFormData({ ...formData, system_logo: base64 });
      } else {
        setFormData({ ...formData, invoice_logo: base64 });
      }
      toast.success('Logo uploaded! Don\'t forget to save settings.');
    };
    reader.onerror = () => {
      toast.error('Failed to read file');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = (type) => {
    if (type === 'system') {
      setFormData({ ...formData, system_logo: null });
    } else {
      setFormData({ ...formData, invoice_logo: null });
    }
    toast.info('Logo removed. Don\'t forget to save settings.');
  };

  const handleAddPaymentMethod = () => {
    setEditingPayment(null);
    setPaymentFormData({
      name: '',
      code: '',
      icon: '💵',
      is_active: true,
      requires_reference: false,
    });
    setShowPaymentDialog(true);
  };

  const handleEditPaymentMethod = (method) => {
    setEditingPayment(method);
    setPaymentFormData({
      name: method.name,
      code: method.code,
      icon: method.icon,
      is_active: method.is_active,
      requires_reference: method.requires_reference,
    });
    setShowPaymentDialog(true);
  };

  const handleSavePaymentMethod = () => {
    if (!paymentFormData.name || !paymentFormData.code) {
      toast.error('Name and code are required');
      return;
    }

    let updatedMethods;
    if (editingPayment) {
      updatedMethods = formData.payment_methods.map(pm =>
        pm.id === editingPayment.id ? { ...pm, ...paymentFormData } : pm
      );
    } else {
      updatedMethods = [
        ...formData.payment_methods,
        { ...paymentFormData, id: Date.now().toString() },
      ];
    }

    setFormData({ ...formData, payment_methods: updatedMethods });
    setShowPaymentDialog(false);
    toast.success(`Payment method ${editingPayment ? 'updated' : 'added'}!`);
  };

  const handleTogglePaymentMethod = (methodId) => {
    const updatedMethods = formData.payment_methods.map(pm =>
      pm.id === methodId ? { ...pm, is_active: !pm.is_active } : pm
    );
    setFormData({ ...formData, payment_methods: updatedMethods });
  };

  const handleDeletePaymentMethod = (methodId) => {
    if (!window.confirm('Delete this payment method?')) return;
    const updatedMethods = formData.payment_methods.filter(pm => pm.id !== methodId);
    setFormData({ ...formData, payment_methods: updatedMethods });
    toast.success('Payment method deleted');
  };

  const canEdit = ['super_admin', 'org_admin'].includes(user?.role);

  const iconOptions = ['💵', '💳', '📱', '🏦', '💰', '🪙', '💸', '🔗'];

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500">Configure your organization settings</p>
      </div>

      {/* Organization Info */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
          <CardDescription>Basic information about your organization</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Organization Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-2">
              <Label>Slug (URL identifier)</Label>
              <Input
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase() })}
                disabled={!canEdit}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logo Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="w-5 h-5" />
            Logo Configuration
          </CardTitle>
          <CardDescription>Upload logos for your organization and invoices</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* System Logo */}
          <div className="space-y-3">
            <div>
              <Label className="text-base font-medium">System Logo</Label>
              <p className="text-sm text-slate-500">This logo will be displayed throughout the application (sidebar, login page, etc.)</p>
            </div>
            <div className="flex items-center gap-4">
              {formData.system_logo ? (
                <div className="relative group">
                  <div className="w-32 h-32 border-2 border-slate-200 rounded-lg overflow-hidden bg-slate-50 flex items-center justify-center">
                    <img 
                      src={formData.system_logo} 
                      alt="System Logo" 
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  {canEdit && (
                    <Button 
                      variant="destructive" 
                      size="icon" 
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemoveLogo('system')}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ) : (
                <div 
                  className={`w-32 h-32 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-400 ${canEdit ? 'cursor-pointer hover:border-emerald-500 hover:text-emerald-500 transition-colors' : ''}`}
                  onClick={() => canEdit && systemLogoInputRef.current?.click()}
                >
                  <Upload className="w-8 h-8 mb-1" />
                  <span className="text-xs">Upload Logo</span>
                </div>
              )}
              <input 
                ref={systemLogoInputRef}
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={(e) => handleLogoUpload('system', e)}
                disabled={!canEdit}
              />
              {canEdit && formData.system_logo && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => systemLogoInputRef.current?.click()}
                >
                  Change Logo
                </Button>
              )}
            </div>
          </div>

          <Separator />

          {/* Invoice Logo */}
          <div className="space-y-3">
            <div>
              <Label className="text-base font-medium">Invoice/Receipt Logo</Label>
              <p className="text-sm text-slate-500">This logo will be displayed on invoices and receipts for customers. You can use a different logo from the system logo.</p>
            </div>
            <div className="flex items-center gap-4">
              {formData.invoice_logo ? (
                <div className="relative group">
                  <div className="w-32 h-32 border-2 border-slate-200 rounded-lg overflow-hidden bg-white flex items-center justify-center">
                    <img 
                      src={formData.invoice_logo} 
                      alt="Invoice Logo" 
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  {canEdit && (
                    <Button 
                      variant="destructive" 
                      size="icon" 
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemoveLogo('invoice')}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ) : (
                <div 
                  className={`w-32 h-32 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-400 ${canEdit ? 'cursor-pointer hover:border-emerald-500 hover:text-emerald-500 transition-colors' : ''}`}
                  onClick={() => canEdit && invoiceLogoInputRef.current?.click()}
                >
                  <Upload className="w-8 h-8 mb-1" />
                  <span className="text-xs">Upload Logo</span>
                </div>
              )}
              <input 
                ref={invoiceLogoInputRef}
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={(e) => handleLogoUpload('invoice', e)}
                disabled={!canEdit}
              />
              {canEdit && formData.invoice_logo && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => invoiceLogoInputRef.current?.click()}
                >
                  Change Logo
                </Button>
              )}
            </div>
            <p className="text-xs text-slate-400">Tip: Use a logo with a transparent background for best results on receipts.</p>
          </div>
        </CardContent>
      </Card>

      {/* Tax Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Tax Configuration (Zambia)</CardTitle>
          <CardDescription>Configure VAT and tax settings for ZRA compliance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>TPIN (Tax Payer Identification Number)</Label>
              <Input
                value={formData.tpin}
                onChange={(e) => setFormData({ ...formData, tpin: e.target.value })}
                placeholder="Enter your TPIN"
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-2">
              <Label>VAT Rate (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.tax_rate}
                onChange={(e) => setFormData({ ...formData, tax_rate: e.target.value })}
                disabled={!canEdit}
              />
            </div>
          </div>
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <p className="font-medium">Tax Inclusive Pricing</p>
              <p className="text-sm text-slate-500">
                When enabled, selling prices include VAT
              </p>
            </div>
            <Switch
              checked={formData.tax_inclusive_pricing}
              onCheckedChange={(v) => setFormData({ ...formData, tax_inclusive_pricing: v })}
              disabled={!canEdit}
            />
          </div>
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <p className="font-medium">Fiscal Compliance Mode</p>
              <p className="text-sm text-slate-500">
                Enable ZRA fiscal compliance features
              </p>
            </div>
            <Switch
              checked={formData.fiscal_compliance_enabled}
              onCheckedChange={(v) => setFormData({ ...formData, fiscal_compliance_enabled: v })}
              disabled={!canEdit}
            />
          </div>
        </CardContent>
      </Card>

      {/* Stock Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Settings</CardTitle>
          <CardDescription>Configure inventory and stock behavior</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <p className="font-medium">Allow Negative Stock</p>
              <p className="text-sm text-slate-500">
                Allow selling items even when stock is zero
              </p>
            </div>
            <Switch
              checked={formData.allow_negative_stock}
              onCheckedChange={(v) => setFormData({ ...formData, allow_negative_stock: v })}
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-2">
            <Label>Low Stock Threshold</Label>
            <Input
              type="number"
              value={formData.low_stock_threshold}
              onChange={(e) => setFormData({ ...formData, low_stock_threshold: e.target.value })}
              disabled={!canEdit}
              className="w-32"
            />
            <p className="text-xs text-slate-500">Alert when stock falls below this level</p>
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Payment Methods</CardTitle>
              <CardDescription>Configure accepted payment methods for POS</CardDescription>
            </div>
            {canEdit && (
              <Button onClick={handleAddPaymentMethod} size="sm">
                + Add Method
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Icon</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Requires Reference</TableHead>
                <TableHead>Status</TableHead>
                {canEdit && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {formData.payment_methods.map((method) => (
                <TableRow key={method.id}>
                  <TableCell className="text-2xl">{method.icon}</TableCell>
                  <TableCell className="font-medium">{method.name}</TableCell>
                  <TableCell className="font-mono text-sm">{method.code}</TableCell>
                  <TableCell>
                    {method.requires_reference ? (
                      <Badge className="bg-blue-100 text-blue-800">Yes</Badge>
                    ) : (
                      <Badge variant="outline">No</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={method.is_active}
                      onCheckedChange={() => handleTogglePaymentMethod(method.id)}
                      disabled={!canEdit}
                    />
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditPaymentMethod(method)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600"
                        onClick={() => handleDeletePaymentMethod(method.id)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Currency Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Currency & Localization</CardTitle>
          <CardDescription>Configure currency and regional settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Currency Code</Label>
              <Input
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
                placeholder="ZMW"
                maxLength={3}
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-2">
              <Label>Currency Symbol</Label>
              <Input
                value={formData.currency_symbol}
                onChange={(e) => setFormData({ ...formData, currency_symbol: e.target.value })}
                placeholder="K"
                maxLength={3}
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Input
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                disabled={!canEdit}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Receipt Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Receipt Configuration</CardTitle>
          <CardDescription>Customize your receipt appearance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Invoice/Receipt Prefix</Label>
            <Input
              value={formData.invoice_prefix}
              onChange={(e) => setFormData({ ...formData, invoice_prefix: e.target.value })}
              placeholder="INV"
              maxLength={12}
              disabled={!canEdit}
            />
            <p className="text-xs text-slate-500">Added before the date in receipt numbers (e.g., INV-20260115-000001).</p>
          </div>
          <div className="space-y-2">
            <Label>Receipt Footer Message</Label>
            <Textarea
              value={formData.receipt_footer}
              onChange={(e) => setFormData({ ...formData, receipt_footer: e.target.value })}
              placeholder="Thank you for your business!"
              rows={2}
              disabled={!canEdit}
            />
          </div>
          
          {/* Receipt Preview */}
          <div className="mt-4 p-4 bg-slate-900 text-white rounded-lg font-mono text-xs">
            <p className="text-center text-lg font-bold">{formData.name || 'Your Business'}</p>
            <p className="text-center text-slate-400">TPIN: {formData.tpin || 'XXXXXXXXXX'}</p>
            <Separator className="my-2 bg-slate-700" />
            <p className="text-center">Sample Item x1</p>
            <p className="text-center">{formData.currency_symbol}100.00</p>
            <Separator className="my-2 bg-slate-700" />
            <p className="text-center">VAT @ {formData.tax_rate}%: {formData.currency_symbol}16.00</p>
            <p className="text-center text-lg font-bold">Total: {formData.currency_symbol}100.00</p>
            <Separator className="my-2 bg-slate-700" />
            <p className="text-center text-slate-400 text-[10px]">
              {formData.receipt_footer || 'Thank you for your business!'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      {canEdit && (
        <div className="flex justify-end">
          <Button 
            onClick={handleSave} 
            className="bg-emerald-600 hover:bg-emerald-700"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      )}

      {/* Payment Method Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPayment ? 'Edit Payment Method' : 'Add Payment Method'}</DialogTitle>
            <DialogDescription>
              Configure a payment method for your POS system
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Icon</Label>
              <div className="flex gap-2 flex-wrap">
                {iconOptions.map((icon) => (
                  <Button
                    key={icon}
                    type="button"
                    variant={paymentFormData.icon === icon ? 'default' : 'outline'}
                    className={`text-2xl w-12 h-12 ${paymentFormData.icon === icon ? 'bg-emerald-600' : ''}`}
                    onClick={() => setPaymentFormData({ ...paymentFormData, icon })}
                  >
                    {icon}
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={paymentFormData.name}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, name: e.target.value })}
                  placeholder="e.g., MTN Mobile Money"
                />
              </div>
              <div className="space-y-2">
                <Label>Code *</Label>
                <Input
                  value={paymentFormData.code}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, code: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                  placeholder="e.g., mtn_momo"
                />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="font-medium">Requires Reference</p>
                <p className="text-sm text-slate-500">Ask for transaction reference number</p>
              </div>
              <Switch
                checked={paymentFormData.requires_reference}
                onCheckedChange={(v) => setPaymentFormData({ ...paymentFormData, requires_reference: v })}
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="font-medium">Active</p>
                <p className="text-sm text-slate-500">Show this method in POS</p>
              </div>
              <Switch
                checked={paymentFormData.is_active}
                onCheckedChange={(v) => setPaymentFormData({ ...paymentFormData, is_active: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePaymentMethod} className="bg-emerald-600 hover:bg-emerald-700">
              {editingPayment ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
