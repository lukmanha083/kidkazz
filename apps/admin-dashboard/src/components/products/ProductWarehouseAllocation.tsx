import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Combobox } from '@/components/ui/combobox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Warehouse } from 'lucide-react';
import type { Warehouse as WarehouseType, ProductLocation } from '@/lib/api';

export interface WarehouseAllocation {
  warehouseId: string;
  warehouseName?: string;
  quantity: number;
  rack?: string;
  bin?: string;
  zone?: string;
  aisle?: string;
}

interface ProductWarehouseAllocationProps {
  warehouses: WarehouseType[];
  allocations: WarehouseAllocation[];
  onAllocationsChange: (allocations: WarehouseAllocation[]) => void;
  totalStock?: number;
  readOnly?: boolean;
}

export function ProductWarehouseAllocation({
  warehouses,
  allocations,
  onAllocationsChange,
  totalStock,
  readOnly = false,
}: ProductWarehouseAllocationProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<WarehouseAllocation>({
    warehouseId: '',
    quantity: 0,
    rack: '',
    bin: '',
    zone: '',
    aisle: '',
  });

  const warehouseOptions = warehouses.map(w => ({
    value: w.id,
    label: `${w.name} - ${w.city}${w.province ? ', ' + w.province : ''}`,
  }));

  const allocatedTotal = allocations.reduce((sum, alloc) => sum + alloc.quantity, 0);
  const isStockValid = totalStock === undefined || allocatedTotal === totalStock;

  const handleAddClick = () => {
    setEditingIndex(null);
    setFormData({
      warehouseId: '',
      quantity: 0,
      rack: '',
      bin: '',
      zone: '',
      aisle: '',
    });
    setDialogOpen(true);
  };

  const handleEditClick = (index: number) => {
    setEditingIndex(index);
    setFormData({ ...allocations[index] });
    setDialogOpen(true);
  };

  const handleDeleteClick = (index: number) => {
    const newAllocations = allocations.filter((_, i) => i !== index);
    onAllocationsChange(newAllocations);
  };

  const handleSave = () => {
    const warehouse = warehouses.find(w => w.id === formData.warehouseId);
    if (!warehouse) return;

    const allocationWithName = {
      ...formData,
      warehouseName: warehouse.name,
      quantity: Number(formData.quantity) || 0,
    };

    let newAllocations: WarehouseAllocation[];
    if (editingIndex !== null) {
      // Edit existing
      newAllocations = allocations.map((alloc, i) =>
        i === editingIndex ? allocationWithName : alloc
      );
    } else {
      // Add new
      newAllocations = [...allocations, allocationWithName];
    }

    onAllocationsChange(newAllocations);
    setDialogOpen(false);
  };

  const getWarehouseName = (warehouseId: string) => {
    const warehouse = warehouses.find(w => w.id === warehouseId);
    return warehouse ? `${warehouse.name} - ${warehouse.city}` : 'Unknown';
  };

  const isWarehouseAlreadyAllocated = (warehouseId: string) => {
    if (editingIndex !== null) {
      // When editing, allow the current warehouse
      return allocations.some((alloc, i) => alloc.warehouseId === warehouseId && i !== editingIndex);
    }
    return allocations.some(alloc => alloc.warehouseId === warehouseId);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-semibold">Warehouse Allocations</Label>
          <p className="text-sm text-muted-foreground mt-1">
            Allocate product stock across multiple warehouse locations
          </p>
        </div>
        {!readOnly && (
          <Button type="button" onClick={handleAddClick} variant="outline" size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Warehouse
          </Button>
        )}
      </div>

      {/* Stock Summary */}
      <div className="p-4 bg-muted/30 rounded-lg border">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Total Stock:</span>
            <p className="text-lg font-bold mt-1">
              {totalStock !== undefined ? totalStock.toLocaleString() : '-'}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Allocated:</span>
            <p className="text-lg font-bold mt-1">
              {allocatedTotal.toLocaleString()}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Remaining:</span>
            <p className={`text-lg font-bold mt-1 ${
              totalStock !== undefined && allocatedTotal > totalStock
                ? 'text-destructive'
                : totalStock !== undefined && allocatedTotal < totalStock
                ? 'text-orange-600'
                : 'text-green-600'
            }`}>
              {totalStock !== undefined ? (totalStock - allocatedTotal).toLocaleString() : '-'}
            </p>
          </div>
        </div>

        {/* Validation Message */}
        {totalStock !== undefined && !isStockValid && (
          <div className="mt-3 pt-3 border-t">
            {allocatedTotal > totalStock ? (
              <p className="text-sm text-destructive font-medium">
                ⚠️ Over-allocated by {(allocatedTotal - totalStock).toLocaleString()} units
              </p>
            ) : (
              <p className="text-sm text-orange-600 font-medium">
                ⚠️ Under-allocated by {(totalStock - allocatedTotal).toLocaleString()} units
              </p>
            )}
          </div>
        )}
      </div>

      {/* Allocations Table */}
      {allocations.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <Warehouse className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="font-medium text-muted-foreground">No warehouse allocations</p>
          <p className="text-sm text-muted-foreground mt-1">
            {readOnly ? 'Product is not allocated to any warehouse' : 'Add warehouses to allocate stock'}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Warehouse</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead>Rack</TableHead>
                <TableHead>Bin</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead>Aisle</TableHead>
                {!readOnly && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {allocations.map((allocation, index) => (
                <TableRow key={`${allocation.warehouseId}-${index}`}>
                  <TableCell className="font-medium">
                    {allocation.warehouseName || getWarehouseName(allocation.warehouseId)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {allocation.quantity.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {allocation.rack || '-'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {allocation.bin || '-'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {allocation.zone || '-'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {allocation.aisle || '-'}
                  </TableCell>
                  {!readOnly && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEditClick(index)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteClick(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingIndex !== null ? 'Edit Warehouse Allocation' : 'Add Warehouse Allocation'}
            </DialogTitle>
            <DialogDescription>
              Allocate product stock to a warehouse location
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Warehouse *</Label>
              <Combobox
                options={warehouseOptions}
                value={formData.warehouseId}
                onValueChange={(value) => setFormData({ ...formData, warehouseId: value })}
                placeholder="Select warehouse..."
                searchPlaceholder="Search warehouses..."
                emptyText="No warehouses found"
                disabled={editingIndex !== null} // Can't change warehouse when editing
              />
              {isWarehouseAlreadyAllocated(formData.warehouseId) && formData.warehouseId && (
                <p className="text-sm text-destructive">
                  This warehouse is already allocated
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                placeholder="100"
                value={formData.quantity || ''}
                onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="rack">Rack</Label>
                <Input
                  id="rack"
                  placeholder="A1"
                  value={formData.rack || ''}
                  onChange={(e) => setFormData({ ...formData, rack: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bin">Bin</Label>
                <Input
                  id="bin"
                  placeholder="TOP"
                  value={formData.bin || ''}
                  onChange={(e) => setFormData({ ...formData, bin: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="zone">Zone</Label>
                <Input
                  id="zone"
                  placeholder="Zone A"
                  value={formData.zone || ''}
                  onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="aisle">Aisle</Label>
                <Input
                  id="aisle"
                  placeholder="1"
                  value={formData.aisle || ''}
                  onChange={(e) => setFormData({ ...formData, aisle: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={
                !formData.warehouseId ||
                formData.quantity <= 0 ||
                isWarehouseAlreadyAllocated(formData.warehouseId)
              }
            >
              {editingIndex !== null ? 'Update' : 'Add'} Allocation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
