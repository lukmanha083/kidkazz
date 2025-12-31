import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Database,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Package,
  Warehouse,
  AlertCircle,
  Loader2
} from 'lucide-react';

interface OrphanCheckResult {
  totalOrphaned: number;
  orphanedLocations?: {
    productLocations: any[];
    productUOMLocations: any[];
    variantLocations: any[];
  };
  orphanedData?: {
    inventoryWithDeletedWarehouses: any[];
    inventoryWithNonExistentProducts: any[];
  };
  summary?: any;
  warning?: string | null;
  message?: string;
}

function DatabaseMaintenancePage() {
  const queryClient = useQueryClient();
  const [selectedCleanup, setSelectedCleanup] = useState<'locations' | 'inventory' | null>(null);

  // Check orphaned locations (Product Service)
  const {
    data: locationsCheck,
    isLoading: locationsLoading,
    refetch: refetchLocations,
  } = useQuery<OrphanCheckResult>({
    queryKey: ['orphan-check', 'locations'],
    queryFn: async () => {
      const res = await fetch('http://localhost:8788/api/cleanup/orphaned-locations/check');
      if (!res.ok) throw new Error('Failed to check orphaned locations');
      return res.json();
    },
  });

  // Check orphaned inventory (Inventory Service)
  const {
    data: inventoryCheck,
    isLoading: inventoryLoading,
    refetch: refetchInventory,
  } = useQuery<OrphanCheckResult>({
    queryKey: ['orphan-check', 'inventory'],
    queryFn: async () => {
      const res = await fetch('http://localhost:8792/api/cleanup/orphaned-inventory/check');
      if (!res.ok) throw new Error('Failed to check orphaned inventory');
      return res.json();
    },
  });

  // Cleanup mutations
  const cleanupLocationsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('http://localhost:8788/api/cleanup/orphaned-locations', {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Cleanup failed');
      return res.json();
    },
    onSuccess: (data) => {
      toast.success('Locations cleaned up successfully', {
        description: `Deleted ${data.summary?.totalDeleted || 0} orphaned location(s)`,
      });
      refetchLocations();
      setSelectedCleanup(null);
    },
    onError: (error) => {
      toast.error('Cleanup failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });

  const cleanupInventoryMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('http://localhost:8792/api/cleanup/orphaned-inventory', {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Cleanup failed');
      return res.json();
    },
    onSuccess: (data) => {
      toast.success('Inventory cleaned up successfully', {
        description: `Deleted ${data.summary?.totalDeleted || 0} orphaned record(s)`,
      });
      refetchInventory();
      setSelectedCleanup(null);
    },
    onError: (error) => {
      toast.error('Cleanup failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });

  const handleRefreshAll = () => {
    refetchLocations();
    refetchInventory();
    toast.info('Refreshing orphan checks...');
  };

  const totalOrphans = (locationsCheck?.totalOrphaned || 0) + (inventoryCheck?.totalOrphaned || 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Database className="w-8 h-8" />
            Database Maintenance
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor and clean up orphaned data across services
          </p>
        </div>
        <Button onClick={handleRefreshAll} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh All
        </Button>
      </div>

      {/* Overall Health Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {totalOrphans === 0 ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                System Health: Excellent
              </>
            ) : (
              <>
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                System Health: Attention Required
              </>
            )}
          </CardTitle>
          <CardDescription>
            {totalOrphans === 0
              ? 'No orphaned data detected. Cascade delete is working correctly.'
              : `${totalOrphans} orphaned record(s) detected. Review and cleanup recommended.`}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Orphaned Product Locations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Orphaned Product Locations
            </div>
            <Badge variant={locationsCheck?.totalOrphaned ? 'destructive' : 'secondary'}>
              {locationsLoading ? '...' : locationsCheck?.totalOrphaned || 0} orphans
            </Badge>
          </CardTitle>
          <CardDescription>
            Product locations pointing to deleted or non-existent warehouses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {locationsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : locationsCheck?.totalOrphaned ? (
            <>
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Orphaned Locations Found</AlertTitle>
                <AlertDescription>
                  {locationsCheck.warning || 'Orphaned locations detected'}
                </AlertDescription>
              </Alert>

              {/* Details */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Product Locations:</span>
                  <span className="font-medium">
                    {locationsCheck.orphanedLocations?.productLocations.length || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>UOM Locations:</span>
                  <span className="font-medium">
                    {locationsCheck.orphanedLocations?.productUOMLocations.length || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Variant Locations:</span>
                  <span className="font-medium">
                    {locationsCheck.orphanedLocations?.variantLocations.length || 0}
                  </span>
                </div>
              </div>

              {/* Cleanup Actions */}
              {selectedCleanup === 'locations' ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Confirm Cleanup</AlertTitle>
                  <AlertDescription className="space-y-3">
                    <p>
                      This will permanently delete {locationsCheck.totalOrphaned} orphaned location
                      record(s). This action cannot be undone.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => cleanupLocationsMutation.mutate()}
                        disabled={cleanupLocationsMutation.isPending}
                      >
                        {cleanupLocationsMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Cleaning up...
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Confirm Delete
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedCleanup(null)}
                        disabled={cleanupLocationsMutation.isPending}
                      >
                        Cancel
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              ) : (
                <Button
                  variant="destructive"
                  onClick={() => setSelectedCleanup('locations')}
                  disabled={cleanupLocationsMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clean Up Locations
                </Button>
              )}
            </>
          ) : (
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertTitle>No Issues Found</AlertTitle>
              <AlertDescription>
                All product locations are valid. Cascade delete working correctly.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Orphaned Inventory */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Warehouse className="w-5 h-5" />
              Orphaned Inventory Records
            </div>
            <Badge variant={inventoryCheck?.totalOrphaned ? 'destructive' : 'secondary'}>
              {inventoryLoading ? '...' : inventoryCheck?.totalOrphaned || 0} orphans
            </Badge>
          </CardTitle>
          <CardDescription>
            Inventory pointing to deleted warehouses or non-existent products
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {inventoryLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : inventoryCheck?.totalOrphaned ? (
            <>
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Orphaned Inventory Found</AlertTitle>
                <AlertDescription>
                  {inventoryCheck.warning || inventoryCheck.message || 'Orphaned inventory detected'}
                </AlertDescription>
              </Alert>

              {/* Details */}
              {inventoryCheck.summary && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>With Deleted Warehouses:</span>
                    <span className="font-medium">
                      {inventoryCheck.summary.inventoryWithDeletedWarehouses || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>With Non-Existent Products:</span>
                    <span className="font-medium">
                      {inventoryCheck.summary.inventoryWithNonExistentProducts || 0}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2 mt-2">
                    <span className="font-medium">Total Inventory Records:</span>
                    <span className="font-medium">
                      {inventoryCheck.summary.totalInventoryRecords || 0}
                    </span>
                  </div>
                </div>
              )}

              {/* Cleanup Actions */}
              {selectedCleanup === 'inventory' ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Confirm Cleanup</AlertTitle>
                  <AlertDescription className="space-y-3">
                    <p>
                      This will delete orphaned inventory records with <strong>zero stock</strong>.
                      Non-zero stock records will be skipped and require manual review.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => cleanupInventoryMutation.mutate()}
                        disabled={cleanupInventoryMutation.isPending}
                      >
                        {cleanupInventoryMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Cleaning up...
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Confirm Delete
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedCleanup(null)}
                        disabled={cleanupInventoryMutation.isPending}
                      >
                        Cancel
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              ) : (
                <Button
                  variant="destructive"
                  onClick={() => setSelectedCleanup('inventory')}
                  disabled={cleanupInventoryMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clean Up Inventory
                </Button>
              )}
            </>
          ) : (
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertTitle>No Issues Found</AlertTitle>
              <AlertDescription>
                All inventory records are valid. Cascade delete working correctly.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Information */}
      <Card>
        <CardHeader>
          <CardTitle>About Database Maintenance</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>Orphaned data</strong> can occur from network failures during cascade deletes or
            from historical data before cascade delete was implemented.
          </p>
          <p>
            This tool helps you identify and clean up orphaned records to maintain database
            integrity.
          </p>
          <p className="text-yellow-600 dark:text-yellow-500">
            <strong>Safety:</strong> Inventory cleanup only deletes records with zero stock.
            Non-zero stock orphans are skipped and require manual investigation.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// TanStack Router route export
export const Route = createFileRoute('/dashboard/admin/maintenance')({
  component: DatabaseMaintenancePage,
});
