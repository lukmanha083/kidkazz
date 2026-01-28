import type { DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from '../db/schema';
import {
  DrizzleDomainEventRepository,
  DrizzleProcessedEventRepository,
} from '../repositories/domain-event.repository';
import { DrizzleJournalEntryRepository } from '../repositories/journal-entry.repository';
import { DrizzleAccountRepository } from '../repositories/account.repository';
import { DrizzleFiscalPeriodRepository } from '../repositories/fiscal-period.repository';
import {
  OrderCompletedHandler,
  OrderCancelledHandler,
  InventoryAdjustedHandler,
  COGSCalculatedHandler,
  type OrderCompletedEvent,
  type OrderCancelledEvent,
  type InventoryAdjustedEvent,
  type COGSCalculatedEvent,
} from '@/application/event-handlers';
import type { QueueMessage } from '@/domain/services/EventPublisher';

type DrizzleDB = DrizzleD1Database<typeof schema>;

/**
 * Event types that this consumer can handle
 */
type SupportedEventType = 'OrderCompleted' | 'OrderCancelled' | 'InventoryAdjusted' | 'COGSCalculated';

/**
 * Queue consumer for processing incoming events from other services
 */
export class QueueConsumer {
  private readonly db: DrizzleDB;

  constructor(db: DrizzleDB) {
    this.db = db;
  }

  /**
   * Process a batch of queue messages
   */
  async processBatch(messages: MessageBatch<QueueMessage>): Promise<void> {
    for (const message of messages.messages) {
      try {
        await this.processMessage(message.body);
        message.ack();
      } catch (error) {
        console.error(`Failed to process message ${message.body.eventId}:`, error);
        message.retry();
      }
    }
  }

  /**
   * Process a single queue message
   */
  async processMessage(message: QueueMessage): Promise<void> {
    const { eventType, payload, eventId } = message;

    // Initialize repositories
    const processedEventRepository = new DrizzleProcessedEventRepository(this.db);
    const domainEventRepository = new DrizzleDomainEventRepository(this.db);
    const journalEntryRepository = new DrizzleJournalEntryRepository(this.db);
    const accountRepository = new DrizzleAccountRepository(this.db);
    const fiscalPeriodRepository = new DrizzleFiscalPeriodRepository(this.db);

    // Route to appropriate handler
    switch (eventType as SupportedEventType) {
      case 'OrderCompleted': {
        const handler = new OrderCompletedHandler(
          processedEventRepository,
          domainEventRepository,
          journalEntryRepository,
          accountRepository,
          fiscalPeriodRepository
        );
        await handler.handle({
          eventId,
          eventType: 'OrderCompleted',
          ...payload,
        } as OrderCompletedEvent);
        break;
      }

      case 'OrderCancelled': {
        const handler = new OrderCancelledHandler(
          processedEventRepository,
          domainEventRepository,
          journalEntryRepository,
          fiscalPeriodRepository
        );
        await handler.handle({
          eventId,
          eventType: 'OrderCancelled',
          ...payload,
        } as OrderCancelledEvent);
        break;
      }

      case 'InventoryAdjusted': {
        const handler = new InventoryAdjustedHandler(
          processedEventRepository,
          domainEventRepository,
          journalEntryRepository,
          accountRepository,
          fiscalPeriodRepository
        );
        await handler.handle({
          eventId,
          eventType: 'InventoryAdjusted',
          ...payload,
        } as InventoryAdjustedEvent);
        break;
      }

      case 'COGSCalculated': {
        const handler = new COGSCalculatedHandler(
          processedEventRepository,
          domainEventRepository,
          journalEntryRepository,
          accountRepository,
          fiscalPeriodRepository
        );
        await handler.handle({
          eventId,
          eventType: 'COGSCalculated',
          ...payload,
        } as COGSCalculatedEvent);
        break;
      }

      default:
        console.warn(`Unknown event type: ${eventType}`);
    }
  }
}

/**
 * Queue handler export for Cloudflare Workers
 */
export async function handleQueue(
  batch: MessageBatch<QueueMessage>,
  db: DrizzleDB
): Promise<void> {
  const consumer = new QueueConsumer(db);
  await consumer.processBatch(batch);
}
