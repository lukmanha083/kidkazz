import { useState } from 'react';

interface OrdersTabProps {
  token: string;
}

export default function OrdersTab({ token }: OrdersTabProps) {
  const [userId, setUserId] = useState('');
  const [customerType, setCustomerType] = useState<'retail' | 'wholesale'>('retail');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleCreateOrder = async () => {
    if (!token) {
      setResponse({ success: false, error: 'Please login first to get a token' });
      return;
    }

    if (!userId) {
      setResponse({ success: false, error: 'Please enter a user ID' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          customerType,
          items: [
            {
              productId: 'PRODUCT-001',
              productName: 'Sample Product',
              sku: 'SKU-001',
              unitPrice: 150000,
              quantity: 2,
              discount: 0,
            },
          ],
          shippingAddress: {
            recipientName: 'John Doe',
            phone: '081234567890',
            address: 'Jl. Example No. 123',
            city: 'Jakarta',
            postalCode: '12345',
          },
          shippingCost: 25000,
        }),
      });
      const data = await res.json();
      setResponse({ success: res.ok, data });
    } catch (error) {
      setResponse({ success: false, error: (error as Error).message });
    }
    setLoading(false);
  };

  const handleListOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      setResponse({ success: res.ok, data });
    } catch (error) {
      setResponse({ success: false, error: (error as Error).message });
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="card">
        <h2>🛒 Create Order</h2>
        <p style={{ marginBottom: '20px', color: '#666' }}>
          Create a sample order with pre-filled data
        </p>
        <div className="form-group">
          <label>User ID *</label>
          <input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Enter user ID from login response"
          />
        </div>
        <div className="form-group">
          <label>Customer Type</label>
          <select
            value={customerType}
            onChange={(e) => setCustomerType(e.target.value as 'retail' | 'wholesale')}
          >
            <option value="retail">Retail</option>
            <option value="wholesale">Wholesale</option>
          </select>
        </div>

        <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
          <h4>Sample Order Details:</h4>
          <ul style={{ marginLeft: '20px', marginTop: '10px' }}>
            <li>Product: Sample Product (SKU-001)</li>
            <li>Quantity: 2 @ Rp 150,000 = Rp 300,000</li>
            <li>Shipping: Rp 25,000</li>
            <li><strong>Total: Rp 325,000</strong></li>
          </ul>
        </div>

        <button className="button" onClick={handleCreateOrder} disabled={loading || !token || !userId}>
          {loading ? 'Creating...' : '➕ Create Sample Order'}
        </button>

        {!token && (
          <p style={{ marginTop: '10px', color: '#dc3545' }}>
            ⚠️ Please login first to get an authentication token
          </p>
        )}
      </div>

      <div className="card">
        <h2>📋 List Orders</h2>
        <button className="button button-secondary" onClick={handleListOrders} disabled={loading}>
          {loading ? 'Loading...' : '📄 Get All Orders'}
        </button>
      </div>

      {response && (
        <div className={`response ${response.success ? 'success' : 'error'}`}>
          <strong>{response.success ? '✅ Success' : '❌ Error'}</strong>
          <pre>{JSON.stringify(response.data || response.error, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
