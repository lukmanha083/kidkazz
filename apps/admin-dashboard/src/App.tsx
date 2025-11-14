import { useState } from 'react';
import AuthTab from './tabs/AuthTab';
import ProductsTab from './tabs/ProductsTab';
import OrdersTab from './tabs/OrdersTab';
import ShippingTab from './tabs/ShippingTab';
import StatusTab from './tabs/StatusTab';

type Tab = 'status' | 'auth' | 'products' | 'orders' | 'shipping';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('status');
  const [token, setToken] = useState<string>('');

  return (
    <div className="container">
      <div className="header">
        <h1>🛍️ KidKazz Admin Dashboard</h1>
        <p>Dual-Market E-Commerce Platform (Retail B2C + Wholesale B2B)</p>
        <p style={{ fontSize: '0.9rem', marginTop: '10px', opacity: 0.8 }}>
          Test all microservices • Cloudflare Workers • Service Bindings
        </p>
      </div>

      {token && (
        <div className="token-display">
          <strong>🔐 Active Token:</strong> {token.substring(0, 50)}...
        </div>
      )}

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'status' ? 'active' : ''}`}
          onClick={() => setActiveTab('status')}
        >
          📊 Service Status
        </button>
        <button
          className={`tab ${activeTab === 'auth' ? 'active' : ''}`}
          onClick={() => setActiveTab('auth')}
        >
          🔐 Authentication
        </button>
        <button
          className={`tab ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          📦 Products
        </button>
        <button
          className={`tab ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          🛒 Orders
        </button>
        <button
          className={`tab ${activeTab === 'shipping' ? 'active' : ''}`}
          onClick={() => setActiveTab('shipping')}
        >
          🚚 Shipping
        </button>
      </div>

      {activeTab === 'status' && <StatusTab />}
      {activeTab === 'auth' && <AuthTab token={token} setToken={setToken} />}
      {activeTab === 'products' && <ProductsTab token={token} />}
      {activeTab === 'orders' && <OrdersTab token={token} />}
      {activeTab === 'shipping' && <ShippingTab />}
    </div>
  );
}
