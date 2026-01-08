import React, { useState, useEffect } from 'react';
import { useStoreSelection, useOrgStore } from '@/lib/store';
import { analyticsAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

export function Dashboard() {
  const { selectedStore } = useStoreSelection();
  const { organization } = useOrgStore();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [salesTrend, setSalesTrend] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [period, setPeriod] = useState('monthly');
  const [salesPerProduct, setSalesPerProduct] = useState([]);
  const [profitPerProduct, setProfitPerProduct] = useState([]);
  const [salesPerBranch, setSalesPerBranch] = useState([]);
  const [profitPerBranch, setProfitPerBranch] = useState([]);

  const currencySymbol = organization?.settings?.currency_symbol || 'K';

  useEffect(() => {
    loadDashboardData();
  }, [selectedStore, period]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [dashRes, trendRes, topRes, salesProdRes, profitProdRes, salesBranchRes, profitBranchRes] = await Promise.all([
        analyticsAPI.getDashboard(selectedStore?.id),
        analyticsAPI.getSalesTrend({ store_id: selectedStore?.id, days: 14 }),
        analyticsAPI.getTopProducts({ store_id: selectedStore?.id, limit: 5 }),
        analyticsAPI.getSalesPerProduct({ store_id: selectedStore?.id, period }),
        analyticsAPI.getProfitPerProduct({ store_id: selectedStore?.id, period }),
        analyticsAPI.getSalesPerBranch({ period }),
        analyticsAPI.getProfitPerBranch({ period }),
      ]);
      setDashboard(dashRes.data);
      setSalesTrend(trendRes.data);
      setTopProducts(topRes.data);
      setSalesPerProduct(salesProdRes.data || []);
      setProfitPerProduct(profitProdRes.data || []);
      setSalesPerBranch(salesBranchRes.data || []);
      setProfitPerBranch(profitBranchRes.data || []);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => `${currencySymbol}${amount?.toLocaleString() || '0'}`;

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500">
            {selectedStore ? `${selectedStore.name} Overview` : 'All Stores Overview'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={loadDashboardData} size="sm">
            Refresh
          </Button>
          <Badge variant="outline" className="text-emerald-600 border-emerald-600">
            {organization?.name || 'Organization'}
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Today's Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrency(dashboard?.today?.sales)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {dashboard?.today?.transactions || 0} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(dashboard?.week?.sales)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {dashboard?.week?.transactions || 0} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(dashboard?.month?.sales)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {dashboard?.month?.transactions || 0} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Tax Collected (Today)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(dashboard?.today?.tax)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              VAT @ {organization?.settings?.tax_rate || 16}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-2xl">
                🏪
              </div>
              <div>
                <p className="text-2xl font-bold">{dashboard?.store_count || 0}</p>
                <p className="text-sm text-slate-500">Active Stores</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl">
                📦
              </div>
              <div>
                <p className="text-2xl font-bold">{dashboard?.product_count || 0}</p>
                <p className="text-sm text-slate-500">Products</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center text-2xl">
                ⚠️
              </div>
              <div>
                <p className="text-2xl font-bold">{dashboard?.low_stock_alerts?.length || 0}</p>
                <p className="text-sm text-slate-500">Low Stock Alerts</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Trend (14 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Line 
                    type="monotone" 
                    dataKey="sales" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ fill: '#10b981' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Top Selling Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis 
                    type="category" 
                    dataKey="product_name" 
                    tick={{ fontSize: 11 }} 
                    width={100}
                  />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Bar dataKey="total_revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alerts */}
      {dashboard?.low_stock_alerts?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Low Stock Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {dashboard.low_stock_alerts.map((item, index) => (
                <div key={index} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{item.product_name}</p>
                    <p className="text-sm text-slate-500">SKU: {item.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-600">{item.quantity} units</p>
                    <p className="text-xs text-slate-500">Reorder level: {item.reorder_level}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sales & Profit Per Product */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Sales Per Product ({period.charAt(0).toUpperCase() + period.slice(1)})</CardTitle>
          </CardHeader>
          <CardContent>
            {salesPerProduct.length > 0 ? (
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Sales</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesPerProduct.slice(0, 20).map((product) => (
                      <TableRow key={product.product_id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{product.product_name}</p>
                            {product.brand && (
                              <p className="text-xs text-slate-500">Brand: {product.brand}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{product.quantity_sold}</TableCell>
                        <TableCell className="text-right font-bold text-emerald-600">
                          {formatCurrency(product.total_sales)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-center py-8 text-slate-500">No product sales data</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profit Per Product ({period.charAt(0).toUpperCase() + period.slice(1)})</CardTitle>
          </CardHeader>
          <CardContent>
            {profitPerProduct.length > 0 ? (
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profitPerProduct.slice(0, 20).map((product) => (
                      <TableRow key={product.product_id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{product.product_name}</p>
                            {product.brand && (
                              <p className="text-xs text-slate-500">Brand: {product.brand}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{product.quantity_sold}</TableCell>
                        <TableCell className={`text-right font-bold ${product.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {formatCurrency(product.profit)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-center py-8 text-slate-500">No product profit data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sales & Profit Per Branch */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Sales Per Branch ({period.charAt(0).toUpperCase() + period.slice(1)})</CardTitle>
          </CardHeader>
          <CardContent>
            {salesPerBranch.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Branch</TableHead>
                    <TableHead className="text-right">Transactions</TableHead>
                    <TableHead className="text-right">Sales</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesPerBranch.map((branch) => (
                    <TableRow key={branch.store_id}>
                      <TableCell className="font-medium">{branch.store_name}</TableCell>
                      <TableCell className="text-right">{branch.transaction_count}</TableCell>
                      <TableCell className="text-right font-bold text-emerald-600">
                        {formatCurrency(branch.total_sales)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center py-8 text-slate-500">No branch sales data</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profit Per Branch ({period.charAt(0).toUpperCase() + period.slice(1)})</CardTitle>
          </CardHeader>
          <CardContent>
            {profitPerBranch.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Branch</TableHead>
                    <TableHead className="text-right">Sales</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profitPerBranch.map((branch) => (
                    <TableRow key={branch.store_id}>
                      <TableCell className="font-medium">{branch.store_name}</TableCell>
                      <TableCell className="text-right">{formatCurrency(branch.total_sales)}</TableCell>
                      <TableCell className={`text-right font-bold ${branch.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {formatCurrency(branch.profit)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center py-8 text-slate-500">No branch profit data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {dashboard?.recent_transactions?.length > 0 ? (
              dashboard.recent_transactions.map((txn) => (
                <div key={txn.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">#{txn.receipt_number}</p>
                    <p className="text-sm text-slate-500">
                      {new Date(txn.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-600">{formatCurrency(txn.total)}</p>
                    <p className="text-xs text-slate-500">{txn.items?.length || 0} items</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center py-8 text-slate-500">No recent transactions</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
