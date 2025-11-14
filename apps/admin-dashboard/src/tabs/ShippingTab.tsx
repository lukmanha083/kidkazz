import { useState } from 'react';

export default function ShippingTab() {
  const [originCity, setOriginCity] = useState('Jakarta');
  const [destinationCity, setDestinationCity] = useState('Bandung');
  const [weight, setWeight] = useState('1000');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleGetRates = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/shipping/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin_city_id: originCity,
          destination_city_id: destinationCity,
          weight: parseFloat(weight),
        }),
      });
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
        <h2>🚚 Get Shipping Rates</h2>
        <p style={{ marginBottom: '20px', color: '#666' }}>
          Calculate shipping costs using JET API (currently using mock data)
        </p>

        <div className="grid">
          <div className="form-group">
            <label>Origin City</label>
            <input value={originCity} onChange={(e) => setOriginCity(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Destination City</label>
            <input value={destinationCity} onChange={(e) => setDestinationCity(e.target.value)} />
          </div>
        </div>

        <div className="form-group">
          <label>Weight (grams)</label>
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="1000"
          />
        </div>

        <button className="button" onClick={handleGetRates} disabled={loading}>
          {loading ? 'Calculating...' : '💰 Get Shipping Rates'}
        </button>

        <div style={{ marginTop: '20px', padding: '15px', background: '#fff3cd', borderRadius: '8px' }}>
          <strong>ℹ️ Note:</strong> Currently showing mock data while waiting for JET sandbox credentials.
          Supported couriers: JNE, J&T Express, SiCepat
        </div>
      </div>

      <div className="card">
        <h2>📦 Available Couriers</h2>
        <div className="service-grid">
          <div className="service-card">
            <h4>🚛 JNE</h4>
            <p>Regular: ~Rp 25,000</p>
            <p>YES: ~Rp 45,000</p>
          </div>
          <div className="service-card">
            <h4>📮 J&T Express</h4>
            <p>Regular: ~Rp 22,000</p>
          </div>
          <div className="service-card">
            <h4>⚡ SiCepat</h4>
            <p>Regular: ~Rp 23,000</p>
            <p>BEST: ~Rp 40,000</p>
          </div>
        </div>
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
