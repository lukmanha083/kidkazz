import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import AuthTab from './tabs/AuthTab';
import ProductsTab from './tabs/ProductsTab';
import OrdersTab from './tabs/OrdersTab';
import ShippingTab from './tabs/ShippingTab';
import StatusTab from './tabs/StatusTab';

export default function App() {
  const [token, setToken] = useState<string>('');

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg shadow-lg p-8 text-white">
          <h1 className="text-4xl font-bold mb-2">🛍️ KidKazz Admin Dashboard</h1>
          <p className="text-lg opacity-90">
            Dual-Market E-Commerce Platform (Retail B2C + Wholesale B2B)
          </p>
          <p className="text-sm opacity-75 mt-2">
            Test all microservices • Cloudflare Workers • Service Bindings
          </p>
        </div>

        {/* Token Display */}
        {token && (
          <Card className="bg-green-50 border-green-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                🔐 Active Authentication Token
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-sm break-all text-green-800">
                {token}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Main Tabs */}
        <Tabs defaultValue="status" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="status">📊 Status</TabsTrigger>
            <TabsTrigger value="auth">🔐 Auth</TabsTrigger>
            <TabsTrigger value="products">📦 Products</TabsTrigger>
            <TabsTrigger value="orders">🛒 Orders</TabsTrigger>
            <TabsTrigger value="shipping">🚚 Shipping</TabsTrigger>
          </TabsList>

          <TabsContent value="status" className="space-y-4">
            <StatusTab />
          </TabsContent>

          <TabsContent value="auth" className="space-y-4">
            <AuthTab token={token} setToken={setToken} />
          </TabsContent>

          <TabsContent value="products" className="space-y-4">
            <ProductsTab token={token} />
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            <OrdersTab token={token} />
          </TabsContent>

          <TabsContent value="shipping" className="space-y-4">
            <ShippingTab />
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 py-4">
          <p>Built with shadcn/ui + TanStack Table + Cloudflare Workers</p>
        </div>
      </div>
    </div>
  );
}
