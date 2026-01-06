import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Layout
import { MainLayout } from "@/components/layout/MainLayout";

// Auth Pages
import { Login } from "@/pages/Login";
import { Register } from "@/pages/Register";

// Main Pages
import { Dashboard } from "@/pages/Dashboard";
import { POS } from "@/pages/POS";
import { Products } from "@/pages/Products";
import { Inventory } from "@/pages/Inventory";
import { Transactions } from "@/pages/Transactions";
import { Transfers } from "@/pages/Transfers";
import { Stores } from "@/pages/Stores";
import { Users } from "@/pages/Users";
import { Analytics } from "@/pages/Analytics";
import { Settings } from "@/pages/Settings";
import { AdminPanel } from "@/pages/AdminPanel";
import { Warehouses } from "@/pages/Warehouses";
import { StorePricing } from "@/pages/StorePricing";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="App">
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Protected Routes */}
            <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/pos" element={<POS />} />
              <Route path="/products" element={<Products />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/transfers" element={<Transfers />} />
              <Route path="/stores" element={<Stores />} />
              <Route path="/store-pricing" element={<StorePricing />} />
              <Route path="/users" element={<Users />} />
              <Route path="/warehouses" element={<Warehouses />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/admin" element={<AdminPanel />} />
            </Route>
            
            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </div>
    </QueryClientProvider>
  );
}

export default App;
