import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from '../../db/schema';
import {
  DrizzleDomainEventRepository,
  DrizzleProcessedEventRepository,
} from '../../repositories/domain-event.repository';
import { CloudflareQueuePublisher, NoOpQueuePublisher } from '../../messaging';
import { EventPublisher } from '@/domain/services/EventPublisher';
import {
  listDomainEventsQuerySchema,
  listProcessedEventsQuerySchema,
  publishPendingEventsSchema,
  toDomainEventResponse,
  toProcessedEventResponse,
} from '@/application/dtos/event.dto';

type Bindings = {
  DB: D1Database;
  ACCOUNTING_EVENTS_QUEUE?: Queue;
};

type Variables = {
  db: DrizzleD1Database<typeof schema>;
  userId: string;
};

const eventRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * GET /events - List domain events
 */
eventRoutes.get('/', zValidator('query', listDomainEventsQuerySchema), async (c) => {
  const db = c.get('db');
  const query = c.req.valid('query');

  const repository = new DrizzleDomainEventRepository(db);

  let events;
  if (query.aggregateType && query.aggregateId) {
    events = await repository.findByAggregateId(query.aggregateType, query.aggregateId);
  } else if (query.eventType) {
    events = await repository.findByEventType(query.eventType, {
      status: query.status,
      limit: query.limit,
      offset: query.offset,
    });
  } else if (query.status === 'pending') {
    events = await repository.findPendingEvents(query.limit || 100);
  } else {
    // Return pending by default to avoid large result sets
    events = await repository.findPendingEvents(query.limit || 100);
  }

  return c.json({
    success: true,
    data: events.map(toDomainEventResponse),
    meta: {
      count: events.length,
    },
  });
});

/**
 * GET /events/:id - Get a specific domain event
 */
eventRoutes.get('/:id', async (c) => {
  const db = c.get('db');
  const id = c.req.param('id');

  const repository = new DrizzleDomainEventRepository(db);
  const event = await repository.findById(id);

  if (!event) {
    return c.json({ success: false, error: 'Event not found' }, 404);
  }

  return c.json({
    success: true,
    data: toDomainEventResponse(event),
  });
});

/**
 * POST /events/publish - Publish pending events to queue
 */
eventRoutes.post('/publish', zValidator('json', publishPendingEventsSchema), async (c) => {
  const db = c.get('db');
  const body = c.req.valid('json');
  const queue = c.env.ACCOUNTING_EVENTS_QUEUE;

  const domainEventRepository = new DrizzleDomainEventRepository(db);
  const queuePublisher = queue ? new CloudflareQueuePublisher(queue) : new NoOpQueuePublisher();

  const publisher = new EventPublisher(domainEventRepository, queuePublisher);
  const result = await publisher.publishPendingEvents(body.batchSize);

  return c.json({
    success: true,
    data: result,
  });
});

/**
 * GET /events/aggregate/:type/:id - Get events for a specific aggregate
 */
eventRoutes.get('/aggregate/:type/:id', async (c) => {
  const db = c.get('db');
  const aggregateType = c.req.param('type');
  const aggregateId = c.req.param('id');

  const repository = new DrizzleDomainEventRepository(db);
  const events = await repository.findByAggregateId(aggregateType, aggregateId);

  return c.json({
    success: true,
    data: events.map(toDomainEventResponse),
    meta: {
      aggregateType,
      aggregateId,
      count: events.length,
    },
  });
});

/**
 * GET /events/processed - List processed events
 */
eventRoutes.get('/processed', zValidator('query', listProcessedEventsQuerySchema), async (c) => {
  const db = c.get('db');
  const query = c.req.valid('query');

  const repository = new DrizzleProcessedEventRepository(db);

  let events;
  if (query.eventType) {
    events = await repository.findByEventType(query.eventType, {
      result: query.result,
      limit: query.limit,
      offset: query.offset,
    });
  } else {
    // List recent processed events
    events = await repository.findByEventType('', {
      result: query.result,
      limit: query.limit || 100,
      offset: query.offset,
    });
  }

  return c.json({
    success: true,
    data: events.map(toProcessedEventResponse),
    meta: {
      count: events.length,
    },
  });
});

/**
 * GET /events/processed/:eventId - Check if an event has been processed
 */
eventRoutes.get('/processed/:eventId', async (c) => {
  const db = c.get('db');
  const eventId = c.req.param('eventId');

  const repository = new DrizzleProcessedEventRepository(db);
  const processedEvent = await repository.findByEventId(eventId);

  if (!processedEvent) {
    return c.json({
      success: true,
      data: {
        eventId,
        isProcessed: false,
      },
    });
  }

  const response = toProcessedEventResponse(processedEvent);
  return c.json({
    success: true,
    data: {
      ...response,
      isProcessed: true,
    },
  });
});

export { eventRoutes };
