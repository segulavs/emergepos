import React, { useState, useEffect } from 'react';
import { useStoreSelection, useOrgStore } from '@/lib/store';
import { analyticsAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { toast } from 'sonner';
import { TrendingUp, TrendingDown, Store, DollarSign, Receipt, ShoppingCart, Printer, Download } from 'lucide-react';

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];

export function Analytics() {
  const { stores } = useStoreSelection();
  const { organization } = useOrgStore();
  const [period, setPeriod] = useState('monthly');
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [salesSummary, setSalesSummary] = useState([]);
  const [salesTrend, setSalesTrend] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [storesData, setStoresData] = useState([]);
  const [loading, setLoading] = useState(true);

  const currencySymbol = organization?.settings?.currency_symbol || 'K';

  useEffect(() => {
    loadAnalytics();
  }, [period, selectedStoreId]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [summaryRes, trendRes, topRes, storesRes] = await Promise.all([
        analyticsAPI.getSalesSummary({ period, store_id: selectedStoreId || undefined }),
        analyticsAPI.getSalesTrend({ store_id: selectedStoreId || undefined, days: period === 'daily' ? 7 : period === 'weekly' ? 28 : 90 }),
        analyticsAPI.getTopProducts({ store_id: selectedStoreId || undefined, limit: 10 }),
        analyticsAPI.getStoresMap(),
      ]);
      setSalesSummary(summaryRes.data);
      setSalesTrend(trendRes.data);
      setTopProducts(topRes.data);
      setStoresData(storesRes.data);
    } catch (error) {
      console.error('Analytics error:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => `${currencySymbol}${(amount || 0).toLocaleString()}`;

  const totalSales = salesSummary.reduce((sum, s) => sum + (s.gross_sales || 0), 0);
  const totalTax = salesSummary.reduce((sum, s) => sum + (s.tax_collected || 0), 0);
  const totalTransactions = salesSummary.reduce((sum, s) => sum + (s.transaction_count || 0), 0);
  const avgTransaction = totalTransactions > 0 ? totalSales / totalTransactions : 0;

  // Calculate growth (mock - would need historical data)
  const calculateGrowth = (current, previous) => {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  // Print report
  const printReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print');
      return;
    }

    const selectedStoreName = selectedStoreId 
      ? stores?.find(s => s.id === selectedStoreId)?.name || 'Selected Store'
      : 'All Stores';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Sales Report - ${selectedStoreName}</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 12px; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { font-size: 18px; text-align: center; margin-bottom: 5px; }
          h2 { font-size: 14px; margin-top: 20px; border-bottom: 1px solid #000; padding-bottom: 5px; }
          .header { text-align: center; margin-bottom: 20px; }
          .summary { display: flex; justify-content: space-between; margin: 20px 0; }
          .summary-item { text-align: center; flex: 1; }
          .summary-value { font-size: 18px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f5f5f5; }
          .text-right { text-align: right; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${organization?.name || 'Sales Report'}</h1>
          <p>Location: ${selectedStoreName} | Period: ${period.charAt(0).toUpperCase() + period.slice(1)}</p>
          <p>Generated: ${new Date().toLocaleString()}</p>
        </div>
        
        <h2>Summary</h2>
        <div class="summary">
          <div class="summary-item">
            <div>Total Sales</div>
            <div class="summary-value">${formatCurrency(totalSales)}</div>
          </div>
          <div class="summary-item">
            <div>Tax Collected</div>
            <div class="summary-value">${formatCurrency(totalTax)}</div>
          </div>
          <div class="summary-item">
            <div>Transactions</div>
            <div class="summary-value">${totalTransactions}</div>
          </div>
          <div class="summary-item">
            <div>Avg. Transaction</div>
            <div class="summary-value">${formatCurrency(avgTransaction)}</div>
          </div>
        </div>
        
        <h2>Store Performance</h2>
        <table>
          <thead>
            <tr>
              <th>Store</th>
              <th class="text-right">Today</th>
              <th class="text-right">This Week</th>
              <th class="text-right">This Month</th>
            </tr>
          </thead>
          <tbody>
            ${storesData.map(store => `
              <tr>
                <td>${store.store_name}</td>
                <td class="text-right">${formatCurrency(store.daily_sales)}</td>
                <td class="text-right">${formatCurrency(store.weekly_sales)}</td>
                <td class="text-right">${formatCurrency(store.monthly_sales)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <h2>Top Products</h2>
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th class="text-right">Qty Sold</th>
              <th class="text-right">Revenue</th>
            </tr>
          </thead>
          <tbody>
            ${topProducts.map(p => `
              <tr>
                <td>${p.product_name}</td>
                <td class="text-right">${p.quantity_sold}</td>
                <td class="text-right">${formatCurrency(p.total_revenue)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics & Reports</h1>
          <p className="text-slate-500">Sales performance and insights</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedStoreId || "all"} onValueChange={(v) => setSelectedStoreId(v === "all" ? "" : v)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Stores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stores</SelectItem>
              {stores && stores.length > 0 && stores.map(store => (
                <SelectItem key={store.id} value={store.id}>
                  {store.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          <Button variant="outline" onClick={loadAnalytics}>
            Refresh
          </Button>
          <Button variant="outline" onClick={printReport}>
            <Printer className="w-4 h-4 mr-2" /> Print
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-700">Total Sales</p>
                <p className="text-3xl font-bold text-emerald-600">{formatCurrency(totalSales)}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700">Tax Collected</p>
                <p className="text-3xl font-bold text-blue-600">{formatCurrency(totalTax)}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                <Receipt className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-700">Transactions</p>
                <p className="text-3xl font-bold text-purple-600">{totalTransactions.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-700">Avg Transaction</p>
                <p className="text-3xl font-bold text-orange-600">{formatCurrency(avgTransaction)}</p>
              </div>
              <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Store Performance Report */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Store className="w-5 h-5" />
              Store Performance Report
            </CardTitle>
            <Badge variant="outline">
              {selectedStoreId ? '1 Store Selected' : `${storesData.length} Stores`}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Store Name</TableHead>
                <TableHead className="text-right">Today's Sales</TableHead>
                <TableHead className="text-right">Weekly Sales</TableHead>
                <TableHead className="text-right">Monthly Sales</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {storesData
                .filter(store => !selectedStoreId || store.store_id === selectedStoreId)
                .map((store) => (
                <TableRow key={store.store_id} className="hover:bg-slate-50">
                  <TableCell>
                    <div>
                      <p className="font-medium">{store.store_name}</p>
                      {store.last_sync_at && (
                        <p className="text-xs text-slate-500">
                          Last sync: {new Date(store.last_sync_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={`font-bold ${store.daily_sales > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {formatCurrency(store.daily_sales)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={`font-bold ${store.weekly_sales > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                      {formatCurrency(store.weekly_sales)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={`font-bold ${store.monthly_sales > 0 ? 'text-purple-600' : 'text-slate-400'}`}>
                      {formatCurrency(store.monthly_sales)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {store.monthly_sales > 0 ? (
                      <Badge className="bg-emerald-100 text-emerald-800">Active</Badge>
                    ) : store.weekly_sales > 0 ? (
                      <Badge className="bg-amber-100 text-amber-800">Slow</Badge>
                    ) : (
                      <Badge className="bg-slate-100 text-slate-600">No Sales</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {storesData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                    No store data available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          
          {/* Store Totals */}
          {storesData.length > 0 && !selectedStoreId && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-700">Total (All Stores)</span>
                <div className="flex gap-8">
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Today</p>
                    <p className="font-bold text-emerald-600">
                      {formatCurrency(storesData.reduce((sum, s) => sum + (s.daily_sales || 0), 0))}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Week</p>
                    <p className="font-bold text-blue-600">
                      {formatCurrency(storesData.reduce((sum, s) => sum + (s.weekly_sales || 0), 0))}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Month</p>
                    <p className="font-bold text-purple-600">
                      {formatCurrency(storesData.reduce((sum, s) => sum + (s.monthly_sales || 0), 0))}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {salesTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salesTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="sales" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      name="Sales"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="tax" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      name="Tax"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500">
                  No sales data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Store Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Store Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {salesSummary.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesSummary}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="store_name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Bar dataKey="gross_sales" fill="#10b981" name="Sales" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500">
                  No store data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* More Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products Table */}
        <Card>
          <CardHeader>
            <CardTitle>Top Selling Products</CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Qty Sold</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProducts.slice(0, 10).map((product, index) => (
                    <TableRow key={product.product_id}>
                      <TableCell className="font-bold text-slate-400">{index + 1}</TableCell>
                      <TableCell className="font-medium">{product.product_name}</TableCell>
                      <TableCell className="text-right">{product.quantity_sold}</TableCell>
                      <TableCell className="text-right font-bold text-emerald-600">
                        {formatCurrency(product.total_revenue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-500">
                No product data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sales Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Distribution by Store</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {salesSummary.length > 0 && salesSummary.some(s => s.gross_sales > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={salesSummary.filter(s => s.gross_sales > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      fill="#8884d8"
                      paddingAngle={2}
                      dataKey="gross_sales"
                      nameKey="store_name"
                      label={({ store_name, percent }) => 
                        `${store_name} (${(percent * 100).toFixed(0)}%)`
                      }
                      labelLine={false}
                    >
                      {salesSummary.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500">
                  No sales distribution data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
