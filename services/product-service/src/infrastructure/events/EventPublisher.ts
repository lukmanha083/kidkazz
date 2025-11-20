import { DomainEvent } from '@kidkazz/ddd-core';

/**
 * Event Publisher for publishing domain events to Cloudflare Queue
 */
export class EventPublisher {
  constructor(private queue?: Queue) {}

  async publish(event: DomainEvent): Promise<void> {
    if (!this.queue) {
      console.warn('No event queue configured, skipping event publication');
      return;
    }

    try {
      await this.queue.send(event.toData());
      console.log(`✅ Published event: ${event.eventType}`, event.toData());
    } catch (error) {
      console.error(`❌ Failed to publish event: ${event.eventType}`, error);
      throw error;
    }
  }

  async publishAll(events: DomainEvent[]): Promise<void> {
    if (!this.queue) {
      console.warn('No event queue configured, skipping event publication');
      return;
    }

    if (events.length === 0) {
      return;
    }

    try {
      // Publish events in batch
      await Promise.all(events.map(event => this.publish(event)));
    } catch (error) {
      console.error('❌ Failed to publish events batch', error);
      throw error;
    }
  }
}
