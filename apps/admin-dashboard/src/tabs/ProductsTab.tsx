import { useState } from 'react';

interface ProductsTabProps {
  token: string;
}

export default function ProductsTab({ token }: ProductsTabProps) {
  const [name, setName] = useState('Premium T-Shirt');
  const [sku, setSku] = useState('TSHIRT-001');
  const [description, setDescription] = useState('High quality cotton t-shirt');
  const [retailPrice, setRetailPrice] = useState('150000');
  const [wholesalePrice, setWholesalePrice] = useState('100000');
  const [availableForRetail, setAvailableForRetail] = useState(true);
  const [availableForWholesale, setAvailableForWholesale] = useState(true);
  const [minimumOrderQuantity, setMinimumOrderQuantity] = useState('1');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleCreateProduct = async () => {
    if (!token) {
      setResponse({ success: false, error: 'Please login first to get a token' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          sku,
          description,
          retailPrice: availableForRetail ? parseFloat(retailPrice) : null,
          wholesalePrice: parseFloat(wholesalePrice),
          availableForRetail,
          availableForWholesale,
          minimumOrderQuantity: parseInt(minimumOrderQuantity),
        }),
      });
      const data = await res.json();
      setResponse({ success: res.ok, data });
    } catch (error) {
      setResponse({ success: false, error: (error as Error).message });
    }
    setLoading(false);
  };

  const handleListProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products');
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
        <h2>📦 Create Product</h2>
        <div className="grid">
          <div className="form-group">
            <label>Product Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="form-group">
            <label>SKU *</label>
            <input value={sku} onChange={(e) => setSku(e.target.value)} />
          </div>
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className="grid">
          <div className="form-group">
            <label>Retail Price (IDR)</label>
            <input
              type="number"
              value={retailPrice}
              onChange={(e) => setRetailPrice(e.target.value)}
              disabled={!availableForRetail}
            />
          </div>
          <div className="form-group">
            <label>Wholesale Price (IDR) *</label>
            <input
              type="number"
              value={wholesalePrice}
              onChange={(e) => setWholesalePrice(e.target.value)}
            />
          </div>
        </div>

        <div className="grid">
          <div className="form-group checkbox-group">
            <input
              type="checkbox"
              checked={availableForRetail}
              onChange={(e) => setAvailableForRetail(e.target.checked)}
            />
            <label>Available for Retail</label>
          </div>
          <div className="form-group checkbox-group">
            <input
              type="checkbox"
              checked={availableForWholesale}
              onChange={(e) => setAvailableForWholesale(e.target.checked)}
            />
            <label>Available for Wholesale</label>
          </div>
        </div>

        <div className="form-group">
          <label>Minimum Order Quantity</label>
          <input
            type="number"
            value={minimumOrderQuantity}
            onChange={(e) => setMinimumOrderQuantity(e.target.value)}
          />
        </div>

        <button className="button" onClick={handleCreateProduct} disabled={loading || !token}>
          {loading ? 'Creating...' : '➕ Create Product'}
        </button>

        {!token && (
          <p style={{ marginTop: '10px', color: '#dc3545' }}>
            ⚠️ Please login first to get an authentication token
          </p>
        )}
      </div>

      <div className="card">
        <h2>📋 List Products</h2>
        <button className="button button-secondary" onClick={handleListProducts} disabled={loading}>
          {loading ? 'Loading...' : '📄 Get All Products'}
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
