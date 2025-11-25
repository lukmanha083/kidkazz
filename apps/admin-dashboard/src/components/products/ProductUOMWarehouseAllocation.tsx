import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import type { Warehouse as WarehouseType } from '@/lib/api';

export interface UOMWarehouseAllocation {
  warehouseId: string;
  warehouseName?: string;
  quantity: number;
  rack?: string;
  bin?: string;
  zone?: string;
  aisle?: string;
}

interface ProductUOMWarehouseAllocationProps {
  warehouses: WarehouseType[];
  allocations: UOMWarehouseAllocation[];
  onAllocationsChange: (allocations: UOMWarehouseAllocation[]) => void;
  uomCode: string;
  uomName: string;
  totalStock?: number;
  readOnly?: boolean;
}

export function ProductUOMWarehouseAllocation({
  warehouses,
  allocations,
  onAllocationsChange,
  uomCode,
  uomName,
  totalStock,
  readOnly = false,
}: ProductUOMWarehouseAllocationProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<UOMWarehouseAllocation>({
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

    let newAllocations: UOMWarehouseAllocation[];
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
          <Label className="text-sm font-semibold">{uomCode} - {uomName} Warehouse Allocations</Label>
          <p className="text-xs text-muted-foreground mt-1">
            Allocate {uomCode} stock across warehouses
          </p>
        </div>
        {!readOnly && (
          <Button type="button" onClick={handleAddClick} variant="outline" size="sm" className="gap-2">
            <Plus className="h-3 w-3" />
            Add Warehouse
          </Button>
        )}
      </div>

      {/* Stock Summary */}
      <div className="p-3 bg-muted/20 rounded-md border text-sm">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <span className="text-xs text-muted-foreground">Total Stock ({uomCode}):</span>
            <p className="text-base font-bold mt-0.5">
              {totalStock !== undefined ? totalStock.toLocaleString() : '-'}
            </p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Allocated:</span>
            <p className="text-base font-bold mt-0.5">
              {allocatedTotal.toLocaleString()}
            </p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Remaining:</span>
            <p className={`text-base font-bold mt-0.5 ${
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
          <div className="mt-2 pt-2 border-t">
            {allocatedTotal > totalStock ? (
              <p className="text-xs text-destructive font-medium">
                ⚠️ Over-allocated by {(allocatedTotal - totalStock).toLocaleString()} {uomCode}
              </p>
            ) : (
              <p className="text-xs text-orange-600 font-medium">
                ⚠️ Under-allocated by {(totalStock - allocatedTotal).toLocaleString()} {uomCode}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Allocations Table */}
      {allocations.length === 0 ? (
        <div className="text-center py-8 border rounded-md bg-muted/10">
          <Warehouse className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-sm font-medium text-muted-foreground">No warehouse allocations</p>
          <p className="text-xs text-muted-foreground mt-1">
            {readOnly ? `${uomCode} not allocated to any warehouse` : `Add warehouses to allocate ${uomCode} stock`}
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Warehouse</TableHead>
                <TableHead className="text-right">Quantity ({uomCode})</TableHead>
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
                  <TableCell className="font-medium text-sm">
                    {allocation.warehouseName || getWarehouseName(allocation.warehouseId)}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-sm">
                    {allocation.quantity.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {allocation.rack || '-'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {allocation.bin || '-'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {allocation.zone || '-'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {allocation.aisle || '-'}
                  </TableCell>
                  {!readOnly && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleEditClick(index)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteClick(index)}
                        >
                          <Trash2 className="h-3 w-3" />
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
              Allocate {uomCode} stock to a warehouse location
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
              <Label>Quantity ({uomCode}) *</Label>
              <Input
                type="number"
                min="0"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                placeholder={`Enter quantity in ${uomCode}`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Rack</Label>
                <Input
                  value={formData.rack || ''}
                  onChange={(e) => setFormData({ ...formData, rack: e.target.value })}
                  placeholder="e.g., A1"
                />
              </div>
              <div className="space-y-2">
                <Label>Bin</Label>
                <Input
                  value={formData.bin || ''}
                  onChange={(e) => setFormData({ ...formData, bin: e.target.value })}
                  placeholder="e.g., B1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Zone</Label>
                <Input
                  value={formData.zone || ''}
                  onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                  placeholder="e.g., Zone A"
                />
              </div>
              <div className="space-y-2">
                <Label>Aisle</Label>
                <Input
                  value={formData.aisle || ''}
                  onChange={(e) => setFormData({ ...formData, aisle: e.target.value })}
                  placeholder="e.g., A"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!formData.warehouseId || formData.quantity <= 0 || isWarehouseAlreadyAllocated(formData.warehouseId)}
            >
              {editingIndex !== null ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
