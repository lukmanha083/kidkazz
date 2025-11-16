import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Circle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Service {
  name: string;
  status: 'online' | 'offline' | 'degraded';
  endpoint?: string;
}

const SERVICES: Service[] = [
  { name: 'API Gateway', status: 'online', endpoint: '/api/gateway' },
  { name: 'User Service', status: 'online', endpoint: '/api/users' },
  { name: 'Product Service', status: 'online', endpoint: '/api/products' },
  { name: 'Order Service', status: 'online', endpoint: '/api/orders' },
  { name: 'Payment Service', status: 'online', endpoint: '/api/payments' },
  { name: 'Inventory Service', status: 'online', endpoint: '/api/inventory' },
  { name: 'Shipping Service', status: 'online', endpoint: '/api/shipping' },
];

export function SystemStatus() {
  const [services, setServices] = useState<Service[]>(SERVICES);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());

  const checkServiceStatus = async () => {
    setIsRefreshing(true);

    // Simulate health check (in production, this would call actual health endpoints)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // For demo purposes, randomly set some services as online/offline
    const updatedServices = services.map(service => ({
      ...service,
      // Simulate 95% uptime
      status: Math.random() > 0.05 ? 'online' : 'offline'
    } as Service));

    setServices(updatedServices);
    setLastChecked(new Date());
    setIsRefreshing(false);
  };

  useEffect(() => {
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      checkServiceStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const allServicesOnline = services.every(s => s.status === 'online');
  const anyServiceOffline = services.some(s => s.status === 'offline');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'text-green-500';
      case 'offline':
        return 'text-red-500';
      case 'degraded':
        return 'text-yellow-500';
      default:
        return 'text-gray-500';
    }
  };

  const getOverallStatus = () => {
    if (allServicesOnline) return { text: 'All Systems Operational', color: 'text-green-500' };
    if (anyServiceOffline) return { text: 'System Offline', color: 'text-red-500' };
    return { text: 'Degraded Performance', color: 'text-yellow-500' };
  };

  const overallStatus = getOverallStatus();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Circle
            className={cn('h-2 w-2 fill-current', overallStatus.color)}
          />
          <span className="hidden sm:inline text-xs">System Status</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm">System Status</h3>
              <p className={cn('text-xs', overallStatus.color)}>
                {overallStatus.text}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={checkServiceStatus}
              disabled={isRefreshing}
              className="h-8 w-8"
            >
              <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            </Button>
          </div>

          {/* Services List */}
          <div className="space-y-2">
            {services.map((service) => (
              <div
                key={service.name}
                className="flex items-center justify-between py-1.5 border-b last:border-0"
              >
                <div className="flex items-center gap-2">
                  <Circle
                    className={cn(
                      'h-2 w-2 fill-current',
                      getStatusColor(service.status)
                    )}
                  />
                  <span className="text-sm">{service.name}</span>
                </div>
                <span className={cn('text-xs capitalize', getStatusColor(service.status))}>
                  {service.status}
                </span>
              </div>
            ))}
          </div>

          {/* Last Checked */}
          <div className="text-xs text-muted-foreground text-center pt-2 border-t">
            Last checked: {lastChecked.toLocaleTimeString()}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
