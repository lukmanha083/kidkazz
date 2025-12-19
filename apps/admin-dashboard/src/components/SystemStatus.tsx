import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Circle, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Service {
  name: string;
  status: 'online' | 'offline' | 'degraded';
  timestamp?: string;
  error?: string;
}

interface HealthCheckResponse {
  overall: 'operational' | 'offline' | 'degraded';
  services: Service[];
  timestamp: string;
}

// Default/fallback services list
const DEFAULT_SERVICES: Service[] = [
  { name: 'API Gateway', status: 'offline' },
  { name: 'User Service', status: 'offline' },
  { name: 'Product Service', status: 'offline' },
  { name: 'Order Service', status: 'offline' },
  { name: 'Payment Service', status: 'offline' },
  { name: 'Inventory Service', status: 'offline' },
  { name: 'Shipping Service', status: 'offline' },
];

// API Gateway URL - configure this based on your environment
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

/**
 * Displays current system health and per-service statuses in a dropdown with manual and automatic refresh.
 *
 * The component performs health checks against the configured API, shows an overall status indicator, a list of services with individual statuses, an optional error block when checks fail, and a "last checked" timestamp. A refresh button triggers an immediate health check; the component also auto-refreshes periodically.
 *
 * @returns A React element that renders a status dropdown showing overall service health, per-service statuses, error messages, and the last-checked time.
 */
export function SystemStatus() {
  const [services, setServices] = useState<Service[]>(DEFAULT_SERVICES);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkServiceStatus = async () => {
    setIsRefreshing(true);
    setError(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(`${API_BASE_URL}/health/all`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      const data: HealthCheckResponse = await response.json();
      setServices(data.services);
      setLastChecked(new Date());
    } catch (err) {
      console.error('Health check error:', err);

      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('Health check timed out');
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to check service status');
      }

      // Keep existing services or set to default offline state
      setServices(prev =>
        prev.map(service => ({ ...service, status: 'offline' as const }))
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    // Initial check
    checkServiceStatus();

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
    if (error) return { text: 'Unable to Check Status', color: 'text-gray-500' };
    if (allServicesOnline) return { text: 'All Systems Operational', color: 'text-green-500' };
    if (anyServiceOffline) return { text: 'System Offline', color: 'text-red-500' };
    return { text: 'Degraded Performance', color: 'text-yellow-500' };
  };

  const overallStatus = getOverallStatus();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="sm" className="gap-2" />}
      >
        <Circle
          className={cn('h-2 w-2 fill-current', overallStatus.color)}
        />
        <span className="hidden sm:inline text-xs">System Status</span>
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

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2 p-2 bg-destructive/10 rounded-md">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-destructive font-medium">Error</p>
                <p className="text-xs text-muted-foreground">{error}</p>
              </div>
            </div>
          )}

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
            {lastChecked ? (
              <>Last checked: {lastChecked.toLocaleTimeString()}</>
            ) : (
              <>Checking status...</>
            )}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}