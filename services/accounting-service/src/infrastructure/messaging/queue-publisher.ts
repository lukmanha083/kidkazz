import type { IQueuePublisher, QueueMessage } from '@/domain/services/EventPublisher';

/**
 * Cloudflare Queue publisher implementation
 */
export class CloudflareQueuePublisher implements IQueuePublisher {
  constructor(private readonly queue: Queue) {}

  async publish(message: QueueMessage): Promise<void> {
    await this.queue.send(message);
  }

  async publishBatch(messages: QueueMessage[]): Promise<void> {
    if (messages.length === 0) return;

    // Cloudflare Queues batch send
    const batch = messages.map((message) => ({
      body: message,
    }));

    await this.queue.sendBatch(batch);
  }
}

/**
 * No-op queue publisher for testing or when queue is not available
 */
export class NoOpQueuePublisher implements IQueuePublisher {
  private readonly publishedMessages: QueueMessage[] = [];

  async publish(message: QueueMessage): Promise<void> {
    this.publishedMessages.push(message);
  }

  async publishBatch(messages: QueueMessage[]): Promise<void> {
    this.publishedMessages.push(...messages);
  }

  /**
   * Get all published messages (for testing)
   */
  getPublishedMessages(): QueueMessage[] {
    return [...this.publishedMessages];
  }

  /**
   * Clear published messages (for testing)
   */
  clear(): void {
    this.publishedMessages.length = 0;
  }
}
