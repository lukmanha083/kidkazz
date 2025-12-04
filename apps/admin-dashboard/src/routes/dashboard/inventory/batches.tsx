import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Package,
  Search,
  Plus,
  Calendar,
  AlertTriangle,
  Loader2,
  Edit,
  Trash2,
  Clock,
} from 'lucide-react';

export const Route = createFileRoute('/dashboard/inventory/batches')({
  component: BatchManagementPage,
});

// Type definitions
interface InventoryBatch {
  id: string;
  inventoryId: string;
  productId: string;
  warehouseId: string;
  batchNumber: string;
  lotNumber?: string | null;
  expirationDate: string | null;
  manufactureDate?: string | null;
  quantityAvailable: number;
  quantityReserved: number;
  status: 'active' | 'expired' | 'quarantined' | 'recalled';
  supplier?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  updatedBy?: string | null;
}

// Mock API (to be replaced with actual API)
const batchApi = {
  getAll: async (filters?: {
    productId?: string;
    warehouseId?: string;
    status?: string;
  }): Promise<{ batches: InventoryBatch[]; total: number }> => {
    // TODO: Replace with actual API call
    const INVENTORY_SERVICE_URL = import.meta.env.VITE_INVENTORY_SERVICE_URL || 'http://localhost:8792';
    const params = new URLSearchParams(filters as any).toString();
    const response = await fetch(`${INVENTORY_SERVICE_URL}/api/batches${params ? `?${params}` : ''}`);
    return response.json();
  },

  getById: async (id: string): Promise<InventoryBatch> => {
    const INVENTORY_SERVICE_URL = import.meta.env.VITE_INVENTORY_SERVICE_URL || 'http://localhost:8792';
    const response = await fetch(`${INVENTORY_SERVICE_URL}/api/batches/${id}`);
    return response.json();
  },

  getExpiring: async (days: number): Promise<{ batches: InventoryBatch[]; total: number }> => {
    const INVENTORY_SERVICE_URL = import.meta.env.VITE_INVENTORY_SERVICE_URL || 'http://localhost:8792';
    const response = await fetch(`${INVENTORY_SERVICE_URL}/api/batches/expiring?days=${days}`);
    return response.json();
  },

  create: async (data: Partial<InventoryBatch>): Promise<InventoryBatch> => {
    const INVENTORY_SERVICE_URL = import.meta.env.VITE_INVENTORY_SERVICE_URL || 'http://localhost:8792';
    const response = await fetch(`${INVENTORY_SERVICE_URL}/api/batches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  updateStatus: async (id: string, status: string, reason: string): Promise<{ message: string }> => {
    const INVENTORY_SERVICE_URL = import.meta.env.VITE_INVENTORY_SERVICE_URL || 'http://localhost:8792';
    const response = await fetch(`${INVENTORY_SERVICE_URL}/api/batches/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, reason }),
    });
    return response.json();
  },

  adjustQuantity: async (id: string, quantity: number, reason: string): Promise<{ message: string }> => {
    const INVENTORY_SERVICE_URL = import.meta.env.VITE_INVENTORY_SERVICE_URL || 'http://localhost:8792';
    const response = await fetch(`${INVENTORY_SERVICE_URL}/api/batches/${id}/adjust`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity, reason }),
    });
    return response.json();
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const INVENTORY_SERVICE_URL = import.meta.env.VITE_INVENTORY_SERVICE_URL || 'http://localhost:8792';
    const response = await fetch(`${INVENTORY_SERVICE_URL}/api/batches/${id}`, {
      method: 'DELETE',
    });
    return response.json();
  },
};

function BatchManagementPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expirationFilter, setExpirationFilter] = useState<string>('all'); // all, expiring-30, expiring-7, expired
  const [formDrawerOpen, setFormDrawerOpen] = useState(false);
  const [adjustDrawerOpen, setAdjustDrawerOpen] = useState(false);
  const [statusDrawerOpen, setStatusDrawerOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<InventoryBatch | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    batchNumber: '',
    lotNumber: '',
    expirationDate: null as Date | null,
    manufactureDate: null as Date | null,
    quantityAvailable: 0,
    supplier: '',
    notes: '',
  });

  const [adjustmentData, setAdjustmentData] = useState({
    quantity: 0,
    reason: '',
  });

  const [statusData, setStatusData] = useState({
    status: 'active' as InventoryBatch['status'],
    reason: '',
  });

  // Fetch batches
  const { data: batchesData, isLoading } = useQuery({
    queryKey: ['batches', statusFilter],
    queryFn: () => batchApi.getAll({ status: statusFilter === 'all' ? undefined : statusFilter }),
  });

  const batches = batchesData?.batches || [];

  // Create batch mutation
  const createBatchMutation = useMutation({
    mutationFn: (data: Partial<InventoryBatch>) => batchApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      toast.success('Batch created successfully');
      setFormDrawerOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error('Failed to create batch', {
        description: error.message,
      });
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: string; reason: string }) =>
      batchApi.updateStatus(id, status, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      toast.success('Batch status updated');
      setStatusDrawerOpen(false);
    },
    onError: (error: any) => {
      toast.error('Failed to update status', {
        description: error.message,
      });
    },
  });

  // Adjust quantity mutation
  const adjustQuantityMutation = useMutation({
    mutationFn: ({ id, quantity, reason }: { id: string; quantity: number; reason: string }) =>
      batchApi.adjustQuantity(id, quantity, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      toast.success('Batch quantity adjusted');
      setAdjustDrawerOpen(false);
    },
    onError: (error: any) => {
      toast.error('Failed to adjust quantity', {
        description: error.message,
      });
    },
  });

  // Delete batch mutation
  const deleteBatchMutation = useMutation({
    mutationFn: (id: string) => batchApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      toast.success('Batch deleted successfully');
      setDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error('Failed to delete batch', {
        description: error.message,
      });
    },
  });

  // Calculate days until expiration
  const calculateDaysUntilExpiration = (expirationDate: string | null): number => {
    if (!expirationDate) return Infinity;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(expirationDate);
    expDate.setHours(0, 0, 0, 0);
    return Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  // FEFO indicator - returns color class based on expiration
  const getExpirationBadge = (expirationDate: string | null) => {
    if (!expirationDate) {
      return <Badge variant="outline" className="bg-gray-100">No Expiration</Badge>;
    }

    const days = calculateDaysUntilExpiration(expirationDate);

    if (days < 0) {
      return <Badge variant="destructive" className="flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        Expired ({Math.abs(days)}d ago)
      </Badge>;
    } else if (days <= 7) {
      return <Badge variant="destructive" className="bg-orange-500 hover:bg-orange-600 flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {days}d left
      </Badge>;
    } else if (days <= 30) {
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300 flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {days}d left
      </Badge>;
    } else {
      return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
        {days}d left
      </Badge>;
    }
  };

  // Status badge
  const getStatusBadge = (status: InventoryBatch['status']) => {
    const styles = {
      active: 'bg-green-100 text-green-800 border-green-300',
      expired: 'bg-red-100 text-red-800 border-red-300',
      quarantined: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      recalled: 'bg-orange-100 text-orange-800 border-orange-300',
    };

    return <Badge variant="outline" className={styles[status]}>{status.toUpperCase()}</Badge>;
  };

  // Filter batches
  const filteredBatches = useMemo(() => {
    let filtered = batches;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(batch =>
        batch.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        batch.lotNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        batch.supplier?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Expiration filter
    if (expirationFilter !== 'all') {
      filtered = filtered.filter(batch => {
        const days = calculateDaysUntilExpiration(batch.expirationDate);

        switch (expirationFilter) {
          case 'expired':
            return days < 0;
          case 'expiring-7':
            return days >= 0 && days <= 7;
          case 'expiring-30':
            return days >= 0 && days <= 30;
          default:
            return true;
        }
      });
    }

    // Sort by FEFO (First Expired, First Out)
    return filtered.sort((a, b) => {
      const daysA = calculateDaysUntilExpiration(a.expirationDate);
      const daysB = calculateDaysUntilExpiration(b.expirationDate);

      // Expired batches first, then by expiration date
      if (daysA < 0 && daysB >= 0) return -1;
      if (daysA >= 0 && daysB < 0) return 1;
      return daysA - daysB;
    });
  }, [batches, searchTerm, expirationFilter]);

  // Reset form
  const resetForm = () => {
    setFormData({
      batchNumber: '',
      lotNumber: '',
      expirationDate: null,
      manufactureDate: null,
      quantityAvailable: 0,
      supplier: '',
      notes: '',
    });
  };

  // Handle form submit
  const handleSubmit = () => {
    if (!formData.batchNumber) {
      toast.error('Batch number is required');
      return;
    }

    createBatchMutation.mutate({
      ...formData,
      expirationDate: formData.expirationDate?.toISOString() || null,
      manufactureDate: formData.manufactureDate?.toISOString() || null,
    });
  };

  // Handle status update
  const handleStatusUpdate = () => {
    if (!selectedBatch || !statusData.reason) {
      toast.error('Reason is required');
      return;
    }

    updateStatusMutation.mutate({
      id: selectedBatch.id,
      status: statusData.status,
      reason: statusData.reason,
    });
  };

  // Handle quantity adjustment
  const handleQuantityAdjust = () => {
    if (!selectedBatch || !adjustmentData.reason) {
      toast.error('Reason is required');
      return;
    }

    adjustQuantityMutation.mutate({
      id: selectedBatch.id,
      quantity: adjustmentData.quantity,
      reason: adjustmentData.reason,
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Batch Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage inventory batches with FEFO (First Expired, First Out) tracking
          </p>
        </div>
        <Button onClick={() => setFormDrawerOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Batch
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Batches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredBatches.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Expired
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {filteredBatches.filter(b => calculateDaysUntilExpiration(b.expirationDate) < 0).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Expiring (7 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {filteredBatches.filter(b => {
                const days = calculateDaysUntilExpiration(b.expirationDate);
                return days >= 0 && days <= 7;
              }).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Quarantined
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {filteredBatches.filter(b => b.status === 'quarantined').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Batch number, lot, supplier..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="quarantined">Quarantined</SelectItem>
                  <SelectItem value="recalled">Recalled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Expiration</Label>
              <Select value={expirationFilter} onValueChange={setExpirationFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="expiring-7">Expiring in 7 days</SelectItem>
                  <SelectItem value="expiring-30">Expiring in 30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Batches Table */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Batches (FEFO Order)</CardTitle>
          <CardDescription>
            Batches sorted by expiration date - earliest first (FEFO strategy)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredBatches.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No batches found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch #</TableHead>
                  <TableHead>Lot #</TableHead>
                  <TableHead>Expiration</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBatches.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell className="font-medium">{batch.batchNumber}</TableCell>
                    <TableCell>{batch.lotNumber || '-'}</TableCell>
                    <TableCell>
                      {batch.expirationDate ? (
                        <div className="space-y-1">
                          <div className="text-sm">
                            {new Date(batch.expirationDate).toLocaleDateString()}
                          </div>
                          {getExpirationBadge(batch.expirationDate)}
                        </div>
                      ) : (
                        getExpirationBadge(null)
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{batch.quantityAvailable} available</div>
                        {batch.quantityReserved > 0 && (
                          <div className="text-sm text-muted-foreground">
                            {batch.quantityReserved} reserved
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(batch.status)}</TableCell>
                    <TableCell>{batch.supplier || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedBatch(batch);
                            setStatusData({ status: batch.status, reason: '' });
                            setStatusDrawerOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedBatch(batch);
                            setAdjustmentData({ quantity: 0, reason: '' });
                            setAdjustDrawerOpen(true);
                          }}
                        >
                          <Package className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedBatch(batch);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Batch Drawer */}
      <Drawer open={formDrawerOpen} onOpenChange={setFormDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Create New Batch</DrawerTitle>
            <DrawerDescription>
              Add a new inventory batch with expiration tracking
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Batch Number *</Label>
                <Input
                  value={formData.batchNumber}
                  onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                  placeholder="e.g., BATCH-2024-001"
                />
              </div>
              <div className="space-y-2">
                <Label>Lot Number</Label>
                <Input
                  value={formData.lotNumber}
                  onChange={(e) => setFormData({ ...formData, lotNumber: e.target.value })}
                  placeholder="e.g., LOT-12345"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Expiration Date</Label>
                <DatePicker
                  date={formData.expirationDate}
                  onDateChange={(date) => setFormData({ ...formData, expirationDate: date })}
                />
              </div>
              <div className="space-y-2">
                <Label>Manufacture Date</Label>
                <DatePicker
                  date={formData.manufactureDate}
                  onDateChange={(date) => setFormData({ ...formData, manufactureDate: date })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  value={formData.quantityAvailable}
                  onChange={(e) => setFormData({ ...formData, quantityAvailable: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Supplier</Label>
                <Input
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  placeholder="Supplier name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
              />
            </div>
          </div>
          <DrawerFooter>
            <Button onClick={handleSubmit} disabled={createBatchMutation.isPending}>
              {createBatchMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Batch
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Update Status Drawer */}
      <Drawer open={statusDrawerOpen} onOpenChange={setStatusDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Update Batch Status</DrawerTitle>
            <DrawerDescription>
              Change the status of batch: {selectedBatch?.batchNumber}
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={statusData.status}
                onValueChange={(value) => setStatusData({ ...statusData, status: value as InventoryBatch['status'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="quarantined">Quarantined</SelectItem>
                  <SelectItem value="recalled">Recalled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Reason *</Label>
              <Input
                value={statusData.reason}
                onChange={(e) => setStatusData({ ...statusData, reason: e.target.value })}
                placeholder="e.g., Quality control failed, Reached expiration date..."
              />
            </div>
          </div>
          <DrawerFooter>
            <Button onClick={handleStatusUpdate} disabled={updateStatusMutation.isPending}>
              {updateStatusMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Status
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Adjust Quantity Drawer */}
      <Drawer open={adjustDrawerOpen} onOpenChange={setAdjustDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Adjust Batch Quantity</DrawerTitle>
            <DrawerDescription>
              Adjust quantity for batch: {selectedBatch?.batchNumber}
              <div className="mt-2 text-sm">
                Current: {selectedBatch?.quantityAvailable} available
              </div>
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <Label>Quantity Change</Label>
              <Input
                type="number"
                value={adjustmentData.quantity}
                onChange={(e) => setAdjustmentData({ ...adjustmentData, quantity: parseInt(e.target.value) || 0 })}
                placeholder="Positive to add, negative to remove"
              />
              <p className="text-sm text-muted-foreground">
                New quantity: {(selectedBatch?.quantityAvailable || 0) + adjustmentData.quantity}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Reason *</Label>
              <Input
                value={adjustmentData.reason}
                onChange={(e) => setAdjustmentData({ ...adjustmentData, reason: e.target.value })}
                placeholder="e.g., Damage, spoilage, stock adjustment..."
              />
            </div>
          </div>
          <DrawerFooter>
            <Button onClick={handleQuantityAdjust} disabled={adjustQuantityMutation.isPending}>
              {adjustQuantityMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Adjust Quantity
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Batch?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete batch {selectedBatch?.batchNumber}?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedBatch && deleteBatchMutation.mutate(selectedBatch.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
