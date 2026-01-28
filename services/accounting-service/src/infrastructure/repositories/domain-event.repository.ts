import { eq, and, sql, desc, lt } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from '../db/schema';
import { domainEvents, processedEvents } from '../db/schema';
import type { IDomainEventRepository, IProcessedEventRepository } from '@/domain/repositories/domain-event.repository';
import type { DomainEvent, EventStatus } from '@/domain/events';
import type { StoredDomainEvent, ProcessedEvent } from '@/domain/services/EventPublisher';

type DrizzleDB = DrizzleD1Database<typeof schema>;

/**
 * Drizzle implementation of IDomainEventRepository
 */
export class DrizzleDomainEventRepository implements IDomainEventRepository {
  constructor(private readonly db: DrizzleDB) {}

  async save(event: DomainEvent): Promise<void> {
    const now = new Date().toISOString();
    await this.db.insert(domainEvents).values({
      id: event.id,
      eventType: event.eventType,
      aggregateId: event.aggregateId,
      aggregateType: event.aggregateType,
      payload: JSON.stringify(event.payload),
      occurredAt: event.occurredAt.toISOString(),
      publishedAt: null,
      status: 'pending',
      retryCount: 0,
      lastError: null,
      createdAt: now,
    });
  }

  async findPendingEvents(limit: number = 100): Promise<StoredDomainEvent[]> {
    const results = await this.db
      .select()
      .from(domainEvents)
      .where(eq(domainEvents.status, 'pending'))
      .orderBy(domainEvents.occurredAt)
      .limit(limit);

    return results.map(this.toDomain);
  }

  async markAsPublished(eventId: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .update(domainEvents)
      .set({
        status: 'published',
        publishedAt: now,
      })
      .where(eq(domainEvents.id, eventId));
  }

  async markAsFailed(eventId: string, error: string): Promise<void> {
    await this.db
      .update(domainEvents)
      .set({
        status: 'failed',
        lastError: error,
      })
      .where(eq(domainEvents.id, eventId));
  }

  async incrementRetryCount(eventId: string): Promise<void> {
    await this.db
      .update(domainEvents)
      .set({
        retryCount: sql`${domainEvents.retryCount} + 1`,
        status: 'pending', // Reset to pending for retry
      })
      .where(eq(domainEvents.id, eventId));
  }

  async findById(eventId: string): Promise<StoredDomainEvent | null> {
    const results = await this.db
      .select()
      .from(domainEvents)
      .where(eq(domainEvents.id, eventId))
      .limit(1);

    if (results.length === 0) return null;
    return this.toDomain(results[0]);
  }

  async findByAggregateId(aggregateType: string, aggregateId: string): Promise<StoredDomainEvent[]> {
    const results = await this.db
      .select()
      .from(domainEvents)
      .where(
        and(
          eq(domainEvents.aggregateType, aggregateType),
          eq(domainEvents.aggregateId, aggregateId)
        )
      )
      .orderBy(desc(domainEvents.occurredAt));

    return results.map(this.toDomain);
  }

  async findByEventType(
    eventType: string,
    options?: { status?: EventStatus; limit?: number; offset?: number }
  ): Promise<StoredDomainEvent[]> {
    let query = this.db.select().from(domainEvents).where(eq(domainEvents.eventType, eventType));

    if (options?.status) {
      query = this.db
        .select()
        .from(domainEvents)
        .where(and(eq(domainEvents.eventType, eventType), eq(domainEvents.status, options.status)));
    }

    const results = await query
      .orderBy(desc(domainEvents.occurredAt))
      .limit(options?.limit || 100)
      .offset(options?.offset || 0);

    return results.map(this.toDomain);
  }

  async deleteOldPublishedEvents(olderThan: Date): Promise<number> {
    const result = await this.db
      .delete(domainEvents)
      .where(
        and(
          eq(domainEvents.status, 'published'),
          lt(domainEvents.publishedAt, olderThan.toISOString())
        )
      );

    return (result as { changes?: number }).changes || 0;
  }

  private toDomain(record: schema.DomainEventRecord): StoredDomainEvent {
    return {
      id: record.id,
      eventType: record.eventType,
      aggregateId: record.aggregateId,
      aggregateType: record.aggregateType,
      payload: JSON.parse(record.payload),
      occurredAt: new Date(record.occurredAt),
      publishedAt: record.publishedAt ? new Date(record.publishedAt) : null,
      status: record.status as EventStatus,
      retryCount: record.retryCount,
      lastError: record.lastError,
      createdAt: new Date(record.createdAt),
    };
  }
}

/**
 * Drizzle implementation of IProcessedEventRepository
 */
export class DrizzleProcessedEventRepository implements IProcessedEventRepository {
  constructor(private readonly db: DrizzleDB) {}

  async isProcessed(eventId: string): Promise<boolean> {
    const results = await this.db
      .select({ id: processedEvents.id })
      .from(processedEvents)
      .where(eq(processedEvents.eventId, eventId))
      .limit(1);

    return results.length > 0;
  }

  async markAsProcessed(
    eventId: string,
    eventType: string,
    result: 'success' | 'failed' | 'skipped',
    errorMessage?: string
  ): Promise<void> {
    const now = new Date().toISOString();
    await this.db.insert(processedEvents).values({
      id: `pe-${nanoid(12)}`,
      eventId,
      eventType,
      processedAt: now,
      result,
      errorMessage: errorMessage || null,
      createdAt: now,
    });
  }

  async findByEventId(eventId: string): Promise<ProcessedEvent | null> {
    const results = await this.db
      .select()
      .from(processedEvents)
      .where(eq(processedEvents.eventId, eventId))
      .limit(1);

    if (results.length === 0) return null;
    return this.toDomain(results[0]);
  }

  async findByEventType(
    eventType: string,
    options?: { result?: 'success' | 'failed' | 'skipped'; limit?: number; offset?: number }
  ): Promise<ProcessedEvent[]> {
    let query = this.db.select().from(processedEvents).where(eq(processedEvents.eventType, eventType));

    if (options?.result) {
      query = this.db
        .select()
        .from(processedEvents)
        .where(
          and(
            eq(processedEvents.eventType, eventType),
            eq(processedEvents.result, options.result)
          )
        );
    }

    const results = await query
      .orderBy(desc(processedEvents.processedAt))
      .limit(options?.limit || 100)
      .offset(options?.offset || 0);

    return results.map(this.toDomain);
  }

  async deleteOldRecords(olderThan: Date): Promise<number> {
    const result = await this.db
      .delete(processedEvents)
      .where(lt(processedEvents.processedAt, olderThan.toISOString()));

    return (result as { changes?: number }).changes || 0;
  }

  private toDomain(record: schema.ProcessedEventRecord): ProcessedEvent {
    return {
      id: record.id,
      eventId: record.eventId,
      eventType: record.eventType,
      processedAt: new Date(record.processedAt),
      result: record.result as 'success' | 'failed' | 'skipped',
      errorMessage: record.errorMessage || undefined,
      createdAt: new Date(record.createdAt),
    };
  }
}
