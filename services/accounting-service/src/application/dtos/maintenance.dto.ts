import { z } from 'zod';
import { MaintenanceType, MaintenanceStatus } from '@/domain/value-objects';

/**
 * Create Maintenance Request Schema
 */
export const createMaintenanceSchema = z.object({
  assetId: z.string().min(1, 'Asset ID is required'),
  maintenanceType: z.nativeEnum(MaintenanceType),
  description: z.string().min(1, 'Description is required').max(1000),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional(),
  cost: z.number().min(0, 'Cost must be non-negative').optional(),
  isCapitalized: z.boolean().optional(),
  extendsUsefulLifeMonths: z.number().int().min(0).optional(),
  vendorId: z.string().optional(),
  vendorName: z.string().max(255).optional(),
  notes: z.string().max(2000).optional(),
});

export type CreateMaintenanceRequest = z.infer<typeof createMaintenanceSchema>;

/**
 * Update Maintenance Request Schema
 */
export const updateMaintenanceSchema = z.object({
  description: z.string().min(1).max(1000).optional(),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional(),
  cost: z.number().min(0).optional(),
  isCapitalized: z.boolean().optional(),
  extendsUsefulLifeMonths: z.number().int().min(0).optional(),
  vendorId: z.string().optional(),
  vendorName: z.string().max(255).optional(),
  invoiceNumber: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
});

export type UpdateMaintenanceRequest = z.infer<typeof updateMaintenanceSchema>;

/**
 * Complete Maintenance Request Schema
 */
export const completeMaintenanceSchema = z.object({
  performedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  actualCost: z.number().min(0).optional(),
  nextScheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional(),
  notes: z.string().max(2000).optional(),
});

export type CompleteMaintenanceRequest = z.infer<typeof completeMaintenanceSchema>;

/**
 * Cancel Maintenance Request Schema
 */
export const cancelMaintenanceSchema = z.object({
  reason: z.string().min(1, 'Reason is required').max(500),
});

export type CancelMaintenanceRequest = z.infer<typeof cancelMaintenanceSchema>;

/**
 * List Maintenance Query Schema
 */
export const listMaintenanceQuerySchema = z.object({
  status: z.nativeEnum(MaintenanceStatus).optional(),
});

export type ListMaintenanceQueryParams = z.infer<typeof listMaintenanceQuerySchema>;

/**
 * List Movements Query Schema
 */
export const listMovementsQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional(),
});

export type ListMovementsQueryParams = z.infer<typeof listMovementsQuerySchema>;
