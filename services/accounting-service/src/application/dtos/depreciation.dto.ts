import { z } from 'zod';

/**
 * Calculate Depreciation Request Schema
 */
export const calculateDepreciationSchema = z.object({
  fiscalYear: z.number().int().min(2020).max(2100),
  fiscalMonth: z.number().int().min(1).max(12),
});

export type CalculateDepreciationRequest = z.infer<typeof calculateDepreciationSchema>;

/**
 * Post Depreciation Request Schema
 */
export const postDepreciationSchema = z.object({
  runId: z.string().min(1),
});

export type PostDepreciationRequest = z.infer<typeof postDepreciationSchema>;

/**
 * Reverse Depreciation Request Schema
 */
export const reverseDepreciationSchema = z.object({
  runId: z.string().min(1),
  reason: z.string().min(1).max(1000),
});

export type ReverseDepreciationRequest = z.infer<typeof reverseDepreciationSchema>;

/**
 * Depreciation Preview Query Schema
 */
export const depreciationPreviewQuerySchema = z.object({
  fiscalYear: z.string().transform((v) => parseInt(v, 10)).pipe(z.number().int().min(2020).max(2100)),
  fiscalMonth: z.string().transform((v) => parseInt(v, 10)).pipe(z.number().int().min(1).max(12)),
});

export type DepreciationPreviewQueryParams = z.infer<typeof depreciationPreviewQuerySchema>;

/**
 * List Depreciation Runs Query Schema
 */
export const listDepreciationRunsQuerySchema = z.object({
  fiscalYear: z.string().transform((v) => parseInt(v, 10)).pipe(z.number().int().min(2020).max(2100)).optional(),
});

export type ListDepreciationRunsQueryParams = z.infer<typeof listDepreciationRunsQuerySchema>;
