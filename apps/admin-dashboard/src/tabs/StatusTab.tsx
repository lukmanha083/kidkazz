import { useState, useEffect } from 'react';

interface ServiceStatus {
  name: string;
  url: string;
  status: 'healthy' | 'error' | 'checking';
  port: number;
}

export default function StatusTab() {
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: 'API Gateway', url: 'http://localhost:8787/health', status: 'checking', port: 8787 },
    { name: 'Product Service', url: 'http://localhost:8788/health', status: 'checking', port: 8788 },
    { name: 'User Service', url: 'http://localhost:8791/health', status: 'checking', port: 8791 },
    { name: 'Order Service', url: 'http://localhost:8789/health', status: 'checking', port: 8789 },
    { name: 'Payment Service', url: 'http://localhost:8790/health', status: 'checking', port: 8790 },
    { name: 'Inventory Service', url: 'http://localhost:8792/health', status: 'checking', port: 8792 },
    { name: 'Shipping Service', url: 'http://localhost:8793/health', status: 'checking', port: 8793 },
  ]);

  const checkServices = async () => {
    const checks = services.map(async (service) => {
      try {
        const response = await fetch(service.url);
        const data = await response.json();
        return {
          ...service,
          status: data.status === 'healthy' ? 'healthy' : 'error',
        } as ServiceStatus;
      } catch {
        // Service is offline or unreachable
        return {
          ...service,
          status: 'error',
        } as ServiceStatus;
      }
    });

    const results = await Promise.all(checks);
    setServices(results);
  };

  useEffect(() => {
    checkServices();
    const interval = setInterval(checkServices, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const healthyCount = services.filter((s) => s.status === 'healthy').length;

  return (
    <div>
      <div className="card">
        <h2>🏥 Service Health Status</h2>
        <div className="stat-card">
          <h3>{healthyCount} / {services.length}</h3>
          <p>Services Running</p>
        </div>
      </div>

      <div className="service-grid">
        {services.map((service) => (
          <div key={service.name} className="service-card">
            <h4>{service.name}</h4>
            <div style={{ marginTop: '10px' }}>
              <span
                className={`status-badge ${
                  service.status === 'healthy' ? 'healthy' : 'error'
                }`}
              >
                {service.status === 'healthy' ? '✅ Healthy' : '❌ Offline'}
              </span>
            </div>
            <p style={{ marginTop: '10px', fontSize: '0.9rem', color: '#666' }}>
              Port: {service.port}
            </p>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <h2>🏗️ Architecture</h2>
        <pre style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', overflow: 'auto' }}>
{`┌─────────────────────────────────────────┐
│       API Gateway :8787                  │
│     (Service Bindings - FREE!)           │
└──────┬──────┬──────┬──────┬──────┬──────┘
   ┌───▼──┐ ┌─▼───┐ ┌▼────┐ ┌▼───┐ ┌▼────┐
   │Product│ │User │ │Order│ │Pay │ │Ship │
   │ :8788 │ │:8791│ │:8789│ │:8790│ │:8793│
   └───┬──┘ └──┬──┘ └─┬───┘ └─┬──┘ └─┬───┘
   ┌───▼──┐ ┌─▼───┐ ┌▼────┐ ┌▼───┐ ┌▼────┐
   │  D1  │ │ D1  │ │ D1  │ │ D1 │ │ D1  │
   └──────┘ └─────┘ └─────┘ └────┘ └─────┘`}
        </pre>
      </div>

      <div className="card">
        <button className="button" onClick={checkServices}>
          🔄 Refresh Status
        </button>
      </div>
    </div>
  );
}
