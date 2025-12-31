import { useState } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export interface WarehouseStockDetail {
  warehouseId: string;
  warehouseName: string;
  quantity: number;
  rack?: string | null;
  bin?: string | null;
  zone?: string | null;
  aisle?: string | null;
}

interface WarehouseDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  warehouseStocks: WarehouseStockDetail[];
  reportType: 'variant' | 'uom' | 'product';
  itemName: string; // Variant name, UOM name, or Product name
  itemSKU?: string; // Optional SKU or code
  productBarcode?: string; // Optional product barcode
  productSKU?: string; // Optional product SKU
  productName?: string; // Optional product name
}

export function WarehouseDetailModal({
  open,
  onOpenChange,
  title,
  subtitle,
  warehouseStocks,
  reportType,
  itemName,
  itemSKU,
  productBarcode,
  productSKU,
  productName,
}: WarehouseDetailModalProps) {
  const [isExporting, setIsExporting] = useState(false);

  const totalStock = warehouseStocks.reduce((sum, stock) => sum + stock.quantity, 0);

  const handleExportPDF = () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();

      // Add header
      doc.setFontSize(18);
      doc.text('Warehouse Stock Report', 14, 20);

      // Add report details
      doc.setFontSize(11);
      let yPos = 30;

      doc.text(`Report Type: ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}`, 14, yPos);
      yPos += 7;

      // Always show product details if available (for all report types)
      if (productName) {
        doc.text(`Product: ${productName}`, 14, yPos);
        yPos += 7;
      }

      if (productSKU) {
        doc.text(`Product SKU: ${productSKU}`, 14, yPos);
        yPos += 7;
      }

      if (productBarcode) {
        doc.text(`Barcode: ${productBarcode}`, 14, yPos);
        yPos += 7;
      }

      // For variant/UOM reports, also show the specific item details
      if (reportType !== 'product') {
        doc.text(`${reportType.charAt(0).toUpperCase() + reportType.slice(1)}: ${itemName}`, 14, yPos);
        yPos += 7;

        if (itemSKU) {
          doc.text(`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} SKU/Code: ${itemSKU}`, 14, yPos);
          yPos += 7;
        }
      }

      doc.text(`Total Stock: ${totalStock} units`, 14, yPos);
      yPos += 7;

      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, yPos);
      yPos += 7;

      // Prepare table data
      const tableData = warehouseStocks.map((stock) => [
        stock.warehouseName,
        stock.quantity.toString(),
        stock.rack || '-',
        stock.bin || '-',
        stock.zone || '-',
        stock.aisle || '-',
      ]);

      // Add table
      autoTable(doc, {
        startY: yPos,
        head: [['Warehouse', 'Quantity', 'Rack', 'Bin', 'Zone', 'Aisle']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [0, 0, 0], // Black color
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        styles: {
          fontSize: 10,
        },
        columnStyles: {
          0: { cellWidth: 50 }, // Warehouse
          1: { cellWidth: 25, halign: 'right' }, // Quantity
          2: { cellWidth: 20, halign: 'center' }, // Rack
          3: { cellWidth: 20, halign: 'center' }, // Bin
          4: { cellWidth: 25, halign: 'center' }, // Zone
          5: { cellWidth: 25, halign: 'center' }, // Aisle
        },
      });

      // Add footer with total
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Total: ${totalStock} units across ${warehouseStocks.length} warehouses`, 14, finalY);

      // Save PDF
      const fileName = `${reportType}_${itemName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      toast.success('PDF exported successfully', {
        description: `Report saved as ${fileName}`,
      });
    } catch (error) {
      console.error('Failed to export PDF:', error);
      toast.error('Failed to export PDF', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {subtitle && <DialogDescription>{subtitle}</DialogDescription>}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="p-3 border rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground">Total Warehouses</p>
              <p className="text-2xl font-bold">{warehouseStocks.length}</p>
            </div>
            <div className="p-3 border rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground">Total Stock</p>
              <p className="text-2xl font-bold">{totalStock}</p>
            </div>
            <div className="p-3 border rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground">Average per Warehouse</p>
              <p className="text-2xl font-bold">
                {warehouseStocks.length > 0 ? Math.round(totalStock / warehouseStocks.length) : 0}
              </p>
            </div>
          </div>

          {/* Warehouse List */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium mb-2">Warehouse Details</h4>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-left p-3 text-xs font-medium">Warehouse</th>
                    <th className="text-right p-3 text-xs font-medium">Quantity</th>
                    <th className="text-center p-3 text-xs font-medium">Rack</th>
                    <th className="text-center p-3 text-xs font-medium">Bin</th>
                    <th className="text-center p-3 text-xs font-medium">Zone</th>
                    <th className="text-center p-3 text-xs font-medium">Aisle</th>
                  </tr>
                </thead>
                <tbody>
                  {warehouseStocks.map((stock, idx) => (
                    <tr key={idx} className="border-b last:border-b-0 hover:bg-muted/20">
                      <td className="p-3 text-sm font-medium">{stock.warehouseName}</td>
                      <td className="p-3 text-sm text-right font-semibold">{stock.quantity}</td>
                      <td className="p-3 text-sm text-center text-muted-foreground">
                        {stock.rack || '-'}
                      </td>
                      <td className="p-3 text-sm text-center text-muted-foreground">
                        {stock.bin || '-'}
                      </td>
                      <td className="p-3 text-sm text-center text-muted-foreground">
                        {stock.zone || '-'}
                      </td>
                      <td className="p-3 text-sm text-center text-muted-foreground">
                        {stock.aisle || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/30 border-t">
                  <tr>
                    <td className="p-3 text-sm font-bold">Total</td>
                    <td className="p-3 text-sm font-bold text-right">{totalStock}</td>
                    <td colSpan={4} className="p-3 text-xs text-muted-foreground text-right">
                      {warehouseStocks.length} warehouses
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-row justify-between items-center gap-2">
          <p className="text-xs text-muted-foreground flex-1">
            This report shows stock distribution across all warehouses
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button onClick={handleExportPDF} disabled={isExporting}>
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
