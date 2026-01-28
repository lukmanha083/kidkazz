import type { ProcessedEvent, StoredDomainEvent } from '@/domain/services/EventPublisher';
import { z } from 'zod';

/**
 * Query schema for listing domain events
 */
export const listDomainEventsQuerySchema = z.object({
  eventType: z.string().optional(),
  status: z.enum(['pending', 'published', 'failed']).optional(),
  aggregateType: z.string().optional(),
  aggregateId: z.string().optional(),
  limit: z
    .string()
    .transform((v) => Number.parseInt(v, 10))
    .pipe(z.number().min(1).max(100))
    .optional(),
  offset: z
    .string()
    .transform((v) => Number.parseInt(v, 10))
    .pipe(z.number().min(0))
    .optional(),
});

export type ListDomainEventsQuery = z.infer<typeof listDomainEventsQuerySchema>;

/**
 * Query schema for listing processed events
 */
export const listProcessedEventsQuerySchema = z.object({
  eventType: z.string().optional(),
  result: z.enum(['success', 'failed', 'skipped']).optional(),
  limit: z
    .string()
    .transform((v) => Number.parseInt(v, 10))
    .pipe(z.number().min(1).max(100))
    .optional(),
  offset: z
    .string()
    .transform((v) => Number.parseInt(v, 10))
    .pipe(z.number().min(0))
    .optional(),
});

export type ListProcessedEventsQuery = z.infer<typeof listProcessedEventsQuerySchema>;

/**
 * Request schema for publishing pending events
 */
export const publishPendingEventsSchema = z.object({
  batchSize: z.number().min(1).max(100).optional().default(100),
});

export type PublishPendingEventsRequest = z.infer<typeof publishPendingEventsSchema>;

/**
 * Response DTO for domain event
 */
export interface DomainEventResponse {
  id: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  payload: Record<string, unknown>;
  occurredAt: string;
  publishedAt: string | null;
  status: string;
  retryCount: number;
  lastError: string | null;
  createdAt: string;
}

/**
 * Response DTO for processed event
 */
export interface ProcessedEventResponse {
  id: string;
  eventId: string;
  eventType: string;
  processedAt: string;
  result: string;
  errorMessage: string | null;
  createdAt: string;
}

/**
 * Response DTO for publish result
 */
export interface PublishResultResponse {
  total: number;
  published: number;
  failed: number;
  skipped: number;
}

/**
 * Transform StoredDomainEvent to response DTO
 */
export function toDomainEventResponse(event: StoredDomainEvent): DomainEventResponse {
  return {
    id: event.id,
    eventType: event.eventType,
    aggregateId: event.aggregateId,
    aggregateType: event.aggregateType,
    payload: event.payload,
    occurredAt: event.occurredAt.toISOString(),
    publishedAt: event.publishedAt ? event.publishedAt.toISOString() : null,
    status: event.status,
    retryCount: event.retryCount,
    lastError: event.lastError,
    createdAt: event.createdAt.toISOString(),
  };
}

/**
 * Transform ProcessedEvent to response DTO
 */
export function toProcessedEventResponse(event: ProcessedEvent): ProcessedEventResponse {
  return {
    id: event.id,
    eventId: event.eventId,
    eventType: event.eventType,
    processedAt: event.processedAt.toISOString(),
    result: event.result,
    errorMessage: event.errorMessage || null,
    createdAt: event.createdAt.toISOString(),
  };
}
