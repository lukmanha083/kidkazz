# Chatbot Service Implementation Plan

**Version**: 1.0
**Last Updated**: 2026-01-22
**Status**: Planning Phase
**Estimated Phases**: 8 Phases

---

## Executive Summary

This document outlines the implementation plan for the Chatbot Service, a new bounded context that provides AI-powered customer service automation for the Kidkazz platform. The service uses Grok API for LLM reasoning, Vercel AI SDK for orchestration, and Cloudflare D1 for per-user conversation storage.

---

## Technology Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Runtime | Cloudflare Workers | Latest |
| Framework | Hono | ^4.x |
| LLM Orchestration | Vercel AI SDK | ^3.x |
| LLM Provider | Grok API (xAI) | Latest |
| Database | Cloudflare D1 | Latest |
| ORM | Drizzle | ^0.30.x |
| Validation | Zod | ^3.x |
| Testing | Vitest | ^1.x |

---

## Implementation Phases

### Phase 1: Project Setup & Infrastructure
**Duration**: 1-2 days
**Priority**: Critical

#### Objectives
- Set up new service directory structure
- Configure Cloudflare Workers
- Initialize D1 database
- Set up development environment

#### Tasks

##### 1.1 Create Service Directory
```bash
services/
└── chatbot-service/
    ├── src/
    │   ├── domain/
    │   │   ├── entities/
    │   │   ├── value-objects/
    │   │   ├── events/
    │   │   └── repositories/
    │   ├── application/
    │   │   ├── use-cases/
    │   │   ├── commands/
    │   │   └── queries/
    │   ├── infrastructure/
    │   │   ├── db/
    │   │   ├── http/
    │   │   ├── llm/
    │   │   ├── repositories/
    │   │   └── services/
    │   └── index.ts
    ├── migrations/
    ├── test/
    │   ├── unit/
    │   ├── integration/
    │   └── e2e/
    ├── wrangler.toml
    ├── package.json
    ├── tsconfig.json
    └── vitest.config.ts
```

##### 1.2 Configure wrangler.toml
```toml
name = "chatbot-service"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "chatbot-db"
database_id = "xxx"

[vars]
ENVIRONMENT = "development"

# Secrets (set via wrangler secret)
# GROK_API_KEY
```

##### 1.3 Initialize Package.json
```json
{
  "name": "@kidkazz/chatbot-service",
  "version": "0.1.0",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:migrate": "wrangler d1 migrations apply chatbot-db",
    "db:migrate:local": "wrangler d1 migrations apply chatbot-db --local"
  },
  "dependencies": {
    "hono": "^4.0.0",
    "drizzle-orm": "^0.30.0",
    "ai": "^3.0.0",
    "@ai-sdk/xai": "^0.1.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "vitest": "^1.0.0",
    "wrangler": "^3.0.0",
    "drizzle-kit": "^0.21.0",
    "@cloudflare/workers-types": "^4.0.0"
  }
}
```

#### Deliverables
- [ ] Service directory created
- [ ] wrangler.toml configured
- [ ] Package dependencies installed
- [ ] TypeScript configuration
- [ ] D1 database created
- [ ] Development environment working

#### Tests
```typescript
describe('Phase 1: Infrastructure', () => {
  it('should start the worker', async () => {
    const response = await app.request('/health');
    expect(response.status).toBe(200);
  });

  it('should connect to D1 database', async () => {
    const result = await db.run(sql`SELECT 1`);
    expect(result).toBeDefined();
  });
});
```

---

### Phase 2: Database Schema & Domain Entities
**Duration**: 2-3 days
**Priority**: Critical

#### Objectives
- Create D1 migrations
- Implement domain entities
- Define value objects
- Set up repository interfaces

#### Tasks

##### 2.1 Create Migration Files

**Migration 0001: Initial Schema**
```sql
-- migrations/0001_initial_schema.sql

-- Conversations
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  conversation_number TEXT NOT NULL UNIQUE,
  user_id TEXT,
  user_type TEXT NOT NULL DEFAULT 'GUEST',
  guest_name TEXT,
  guest_email TEXT,
  guest_phone TEXT,
  channel TEXT NOT NULL,
  session_id TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  escalated_at TEXT,
  escalation_reason TEXT,
  assigned_agent_id TEXT,
  message_count INTEGER DEFAULT 0,
  first_response_time INTEGER,
  resolution_time INTEGER,
  rating INTEGER,
  feedback TEXT,
  started_at TEXT NOT NULL,
  last_message_at TEXT NOT NULL,
  closed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  version INTEGER DEFAULT 1
);

-- Messages
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL,
  sender_id TEXT,
  content TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'TEXT',
  attachments TEXT,
  model TEXT,
  tokens_used INTEGER,
  tool_calls TEXT,
  tool_results TEXT,
  detected_intent TEXT,
  confidence REAL,
  status TEXT NOT NULL DEFAULT 'DELIVERED',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  delivered_at TEXT,
  read_at TEXT,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

-- Tickets
CREATE TABLE tickets (
  id TEXT PRIMARY KEY,
  ticket_number TEXT NOT NULL UNIQUE,
  conversation_id TEXT NOT NULL,
  user_id TEXT,
  category TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'MEDIUM',
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  assigned_to TEXT,
  department TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN',
  resolution TEXT,
  resolved_at TEXT,
  resolved_by TEXT,
  sla_deadline TEXT,
  sla_breach INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at TEXT,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

-- FAQ Documents
CREATE TABLE faq_documents (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  keywords TEXT,
  locale TEXT DEFAULT 'id-ID',
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_conversations_user ON conversations(user_id);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversations_channel ON conversations(channel);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);
CREATE INDEX idx_messages_role ON messages(role);

CREATE INDEX idx_tickets_conversation ON tickets(conversation_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_assigned ON tickets(assigned_to);
CREATE INDEX idx_tickets_priority ON tickets(priority);

CREATE INDEX idx_faq_category ON faq_documents(category);
CREATE INDEX idx_faq_active ON faq_documents(is_active);
```

##### 2.2 Implement Domain Entities

**Conversation Entity**
```typescript
// src/domain/entities/conversation.entity.ts
import { ConversationStatus, ChatChannel, UserType } from '../value-objects';

export class Conversation {
  private constructor(
    public readonly id: string,
    public readonly conversationNumber: string,
    public readonly userId: string | null,
    public readonly userType: UserType,
    public readonly channel: ChatChannel,
    private _status: ConversationStatus,
    private _messageCount: number,
    private _lastMessageAt: Date,
    public readonly startedAt: Date,
    public readonly version: number
  ) {}

  static create(props: CreateConversationProps): Conversation {
    return new Conversation(
      generateId(),
      generateConversationNumber(),
      props.userId || null,
      props.userId ? UserType.CUSTOMER : UserType.GUEST,
      props.channel,
      ConversationStatus.ACTIVE,
      0,
      new Date(),
      new Date(),
      1
    );
  }

  get status(): ConversationStatus {
    return this._status;
  }

  get messageCount(): number {
    return this._messageCount;
  }

  addMessage(): void {
    this._messageCount++;
    this._lastMessageAt = new Date();
  }

  escalate(reason: string): void {
    if (this._status !== ConversationStatus.ACTIVE) {
      throw new Error('Can only escalate active conversations');
    }
    this._status = ConversationStatus.WAITING_HUMAN;
  }

  close(): void {
    this._status = ConversationStatus.CLOSED;
  }
}
```

**Message Entity**
```typescript
// src/domain/entities/message.entity.ts
import { MessageRole, ContentType, Intent } from '../value-objects';

export class Message {
  private constructor(
    public readonly id: string,
    public readonly conversationId: string,
    public readonly role: MessageRole,
    public readonly content: string,
    public readonly contentType: ContentType,
    public readonly detectedIntent: Intent | null,
    public readonly tokensUsed: number | null,
    public readonly createdAt: Date
  ) {}

  static createUserMessage(conversationId: string, content: string): Message {
    return new Message(
      generateId(),
      conversationId,
      MessageRole.USER,
      content,
      ContentType.TEXT,
      null,
      null,
      new Date()
    );
  }

  static createAssistantMessage(
    conversationId: string,
    content: string,
    intent: Intent,
    tokensUsed: number
  ): Message {
    return new Message(
      generateId(),
      conversationId,
      MessageRole.ASSISTANT,
      content,
      ContentType.TEXT,
      intent,
      tokensUsed,
      new Date()
    );
  }
}
```

##### 2.3 Define Repository Interfaces

```typescript
// src/domain/repositories/conversation.repository.ts
export interface IConversationRepository {
  findById(id: string): Promise<Conversation | null>;
  findByUserId(userId: string, limit?: number): Promise<Conversation[]>;
  findActiveByUserId(userId: string): Promise<Conversation | null>;
  save(conversation: Conversation): Promise<void>;
  update(conversation: Conversation): Promise<void>;
}

// src/domain/repositories/message.repository.ts
export interface IMessageRepository {
  findByConversationId(conversationId: string, limit?: number): Promise<Message[]>;
  save(message: Message): Promise<void>;
  countByConversationId(conversationId: string): Promise<number>;
}

// src/domain/repositories/ticket.repository.ts
export interface ITicketRepository {
  findById(id: string): Promise<Ticket | null>;
  findByConversationId(conversationId: string): Promise<Ticket | null>;
  findOpenByConversationId(conversationId: string): Promise<Ticket | null>;
  save(ticket: Ticket): Promise<void>;
  update(ticket: Ticket): Promise<void>;
}
```

#### Deliverables
- [ ] Migration 0001 created and applied
- [ ] Conversation entity implemented
- [ ] Message entity implemented
- [ ] Ticket entity implemented
- [ ] Value objects defined
- [ ] Repository interfaces defined
- [ ] Domain events defined

#### Tests
```typescript
describe('Phase 2: Domain Entities', () => {
  describe('Conversation', () => {
    it('should create a new conversation', () => {
      const conv = Conversation.create({
        userId: 'user-123',
        channel: ChatChannel.WEB
      });
      expect(conv.status).toBe(ConversationStatus.ACTIVE);
      expect(conv.messageCount).toBe(0);
    });

    it('should escalate active conversation', () => {
      const conv = Conversation.create({ channel: ChatChannel.WEB });
      conv.escalate('Customer requested human');
      expect(conv.status).toBe(ConversationStatus.WAITING_HUMAN);
    });
  });

  describe('Message', () => {
    it('should create user message', () => {
      const msg = Message.createUserMessage('conv-123', 'Hello');
      expect(msg.role).toBe(MessageRole.USER);
      expect(msg.content).toBe('Hello');
    });
  });
});
```

---

### Phase 3: Grok API Integration
**Duration**: 2-3 days
**Priority**: Critical

#### Objectives
- Set up Vercel AI SDK with Grok provider
- Implement LLM client wrapper
- Configure tool definitions
- Handle streaming responses

#### Tasks

##### 3.1 Configure Grok Provider

```typescript
// src/infrastructure/llm/grok-client.ts
import { createXai } from '@ai-sdk/xai';
import { generateText, streamText, tool } from 'ai';
import { z } from 'zod';

export function createGrokClient(apiKey: string) {
  return createXai({
    apiKey,
    baseURL: 'https://api.x.ai/v1'
  });
}

export class GrokLLMService {
  private client: ReturnType<typeof createXai>;
  private model: string;

  constructor(apiKey: string, model: string = 'grok-4.1-fast') {
    this.client = createGrokClient(apiKey);
    this.model = model;
  }

  async generateResponse(params: GenerateParams): Promise<GenerateResult> {
    const result = await generateText({
      model: this.client(this.model),
      system: params.systemPrompt,
      messages: params.messages,
      tools: params.tools,
      maxTokens: params.maxTokens || 2048,
      temperature: params.temperature || 0.7
    });

    return {
      text: result.text,
      toolCalls: result.toolCalls,
      usage: result.usage
    };
  }

  async *streamResponse(params: GenerateParams): AsyncGenerator<StreamChunk> {
    const result = await streamText({
      model: this.client(this.model),
      system: params.systemPrompt,
      messages: params.messages,
      tools: params.tools,
      maxTokens: params.maxTokens || 2048,
      temperature: params.temperature || 0.7
    });

    for await (const chunk of result.textStream) {
      yield { type: 'text', content: chunk };
    }

    // Yield final tool calls if any
    const finalResult = await result;
    if (finalResult.toolCalls?.length) {
      yield { type: 'tool_calls', toolCalls: finalResult.toolCalls };
    }
  }
}
```

##### 3.2 Define Tools

```typescript
// src/infrastructure/llm/tools.ts
import { tool } from 'ai';
import { z } from 'zod';

export const chatbotTools = {
  search_products: tool({
    description: 'Search product catalog by name, category, or keywords',
    parameters: z.object({
      query: z.string().describe('Search query'),
      category: z.string().optional(),
      priceMin: z.number().optional(),
      priceMax: z.number().optional(),
      limit: z.number().default(5)
    }),
    execute: async ({ query, category, priceMin, priceMax, limit }) => {
      // Will be implemented to call Product Service
      return { products: [] };
    }
  }),

  check_stock: tool({
    description: 'Check real-time stock availability',
    parameters: z.object({
      productId: z.string(),
      warehouseId: z.string().optional()
    }),
    execute: async ({ productId, warehouseId }) => {
      // Will be implemented to call Inventory Service
      return { available: 0 };
    }
  }),

  get_order_status: tool({
    description: 'Get order status by order number',
    parameters: z.object({
      orderNumber: z.string()
    }),
    execute: async ({ orderNumber }) => {
      // Will be implemented to call Order Service
      return { status: 'UNKNOWN' };
    }
  }),

  escalate_to_human: tool({
    description: 'Transfer to human agent',
    parameters: z.object({
      reason: z.string(),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
      category: z.enum(['COMPLAINT', 'REFUND', 'TECHNICAL', 'ORDER_ISSUE', 'OTHER']),
      summary: z.string()
    }),
    execute: async (params) => {
      // Will be implemented to create ticket
      return { ticketId: null, success: false };
    }
  })
};
```

##### 3.3 System Prompt Builder

```typescript
// src/infrastructure/llm/prompts.ts

export function buildSystemPrompt(context: CustomerContext): string {
  return `You are a helpful customer service assistant for Kidkazz, an Indonesian baby & kids e-commerce store.

## Customer Context
- Name: ${context.name || 'Guest'}
- Customer ID: ${context.id || 'N/A'}
- Tier: ${context.tier || 'N/A'}
- Loyalty Points: ${context.loyaltyPoints || 0}

## Your Capabilities
1. Answer questions about products, shipping, returns, and policies
2. Search for products and check stock availability
3. Look up order status and tracking information
4. Escalate complex issues to human agents

## Guidelines
- Be friendly, helpful, and professional
- Respond in Indonesian unless the customer writes in English
- Use customer's name when appropriate
- When unsure, ask clarifying questions
- Escalate to human for: complaints, refunds, complex technical issues

## Response Format
- Keep responses concise but helpful
- Use bullet points for lists
- Format prices as "Rp X.XXX"
- Include product links when mentioning products`;
}
```

#### Deliverables
- [ ] Grok client configured
- [ ] Tool definitions implemented
- [ ] System prompt builder created
- [ ] Streaming response handler
- [ ] Error handling for API failures

#### Tests
```typescript
describe('Phase 3: Grok Integration', () => {
  it('should generate text response', async () => {
    const result = await grokService.generateResponse({
      systemPrompt: 'You are a helpful assistant',
      messages: [{ role: 'user', content: 'Hello' }]
    });
    expect(result.text).toBeDefined();
  });

  it('should execute tool calls', async () => {
    const result = await grokService.generateResponse({
      systemPrompt: buildSystemPrompt({}),
      messages: [{ role: 'user', content: 'Search for baby bottles' }],
      tools: chatbotTools
    });
    expect(result.toolCalls).toBeDefined();
  });
});
```

---

### Phase 4: Core Use Cases
**Duration**: 3-4 days
**Priority**: Critical

#### Objectives
- Implement HandleMessageUseCase
- Implement GetConversationHistoryUseCase
- Implement EscalateToHumanUseCase
- Wire up tool executors

#### Tasks

##### 4.1 Handle Message Use Case

```typescript
// src/application/use-cases/handle-message.use-case.ts

export class HandleMessageUseCase {
  constructor(
    private conversationRepo: IConversationRepository,
    private messageRepo: IMessageRepository,
    private llmService: GrokLLMService,
    private toolExecutor: ToolExecutor,
    private customerService: ICustomerService
  ) {}

  async execute(input: HandleMessageInput): Promise<HandleMessageOutput> {
    // 1. Get or create conversation
    let conversation = input.conversationId
      ? await this.conversationRepo.findById(input.conversationId)
      : null;

    if (!conversation) {
      conversation = Conversation.create({
        userId: input.userId,
        channel: input.channel
      });
      await this.conversationRepo.save(conversation);
    }

    // 2. Save user message
    const userMessage = Message.createUserMessage(conversation.id, input.message);
    await this.messageRepo.save(userMessage);
    conversation.addMessage();

    // 3. Build context
    const history = await this.messageRepo.findByConversationId(conversation.id, 20);
    const customer = input.userId
      ? await this.customerService.getCustomer(input.userId)
      : null;

    const systemPrompt = buildSystemPrompt({
      name: customer?.name,
      id: customer?.id,
      tier: customer?.tier,
      loyaltyPoints: customer?.loyaltyPoints
    });

    // 4. Generate response
    const llmResult = await this.llmService.generateResponse({
      systemPrompt,
      messages: this.formatMessages(history),
      tools: this.getAvailableTools(input.userId)
    });

    // 5. Execute tools if needed
    let responseText = llmResult.text;
    if (llmResult.toolCalls?.length) {
      const toolResults = await this.toolExecutor.execute(llmResult.toolCalls);
      // Get final response with tool results
      responseText = await this.generateFinalResponse(systemPrompt, history, toolResults);
    }

    // 6. Save assistant message
    const assistantMessage = Message.createAssistantMessage(
      conversation.id,
      responseText,
      this.detectIntent(llmResult),
      llmResult.usage?.totalTokens || 0
    );
    await this.messageRepo.save(assistantMessage);
    conversation.addMessage();

    // 7. Update conversation
    await this.conversationRepo.update(conversation);

    return {
      conversationId: conversation.id,
      messageId: assistantMessage.id,
      response: responseText,
      intent: assistantMessage.detectedIntent,
      tokensUsed: llmResult.usage?.totalTokens
    };
  }
}
```

##### 4.2 Tool Executor

```typescript
// src/application/services/tool-executor.ts

export class ToolExecutor {
  constructor(
    private productClient: IProductServiceClient,
    private inventoryClient: IInventoryServiceClient,
    private orderClient: IOrderServiceClient,
    private escalationService: EscalationService
  ) {}

  async execute(toolCalls: ToolCall[]): Promise<ToolResult[]> {
    const results: ToolResult[] = [];

    for (const call of toolCalls) {
      try {
        let result: any;

        switch (call.toolName) {
          case 'search_products':
            result = await this.productClient.search(call.args);
            break;

          case 'check_stock':
            result = await this.inventoryClient.checkStock(call.args);
            break;

          case 'get_order_status':
            result = await this.orderClient.getStatus(call.args);
            break;

          case 'escalate_to_human':
            result = await this.escalationService.escalate(call.args);
            break;

          default:
            throw new Error(`Unknown tool: ${call.toolName}`);
        }

        results.push({
          toolCallId: call.toolCallId,
          result: this.truncateResult(result)
        });
      } catch (error) {
        results.push({
          toolCallId: call.toolCallId,
          error: error.message
        });
      }
    }

    return results;
  }

  private truncateResult(result: any): string {
    const str = JSON.stringify(result);
    if (str.length > 2000) {
      return str.substring(0, 2000) + '... (truncated)';
    }
    return str;
  }
}
```

#### Deliverables
- [ ] HandleMessageUseCase implemented
- [ ] GetConversationHistoryUseCase implemented
- [ ] EscalateToHumanUseCase implemented
- [ ] ToolExecutor implemented
- [ ] Service client interfaces defined

#### Tests
```typescript
describe('Phase 4: Use Cases', () => {
  describe('HandleMessageUseCase', () => {
    it('should create new conversation for first message', async () => {
      const result = await handleMessage.execute({
        userId: 'user-123',
        message: 'Hello',
        channel: 'WEB'
      });
      expect(result.conversationId).toBeDefined();
    });

    it('should continue existing conversation', async () => {
      const result = await handleMessage.execute({
        conversationId: 'conv-123',
        userId: 'user-123',
        message: 'What products do you have?',
        channel: 'WEB'
      });
      expect(result.response).toBeDefined();
    });
  });
});
```

---

### Phase 5: HTTP API Layer
**Duration**: 2-3 days
**Priority**: High

#### Objectives
- Implement REST endpoints
- Add request validation
- Implement rate limiting
- Add authentication middleware

#### Tasks

##### 5.1 Chat Routes

```typescript
// src/infrastructure/http/routes/chat.routes.ts
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const chatRoutes = new Hono();

// Send message
const sendMessageSchema = z.object({
  conversationId: z.string().optional(),
  message: z.string().min(1).max(4000),
  channel: z.enum(['WEB', 'MOBILE', 'WHATSAPP', 'TELEGRAM']).default('WEB'),
  sessionId: z.string().optional()
});

chatRoutes.post('/chat',
  authMiddleware({ required: false }),
  rateLimitMiddleware({ maxRequests: 30, windowMs: 60000 }),
  zValidator('json', sendMessageSchema),
  async (c) => {
    const body = c.req.valid('json');
    const userId = c.get('userId');

    const result = await handleMessageUseCase.execute({
      ...body,
      userId
    });

    return c.json(result);
  }
);

// Get conversation history
chatRoutes.get('/chat/conversations',
  authMiddleware({ required: true }),
  async (c) => {
    const userId = c.get('userId');
    const conversations = await getConversationsUseCase.execute({ userId });
    return c.json({ conversations });
  }
);

// Get conversation details
chatRoutes.get('/chat/conversations/:id',
  authMiddleware({ required: true }),
  async (c) => {
    const conversationId = c.req.param('id');
    const userId = c.get('userId');

    const conversation = await getConversationUseCase.execute({
      conversationId,
      userId
    });

    return c.json(conversation);
  }
);

// Close conversation
chatRoutes.post('/chat/conversations/:id/close',
  authMiddleware({ required: true }),
  async (c) => {
    const conversationId = c.req.param('id');
    const userId = c.get('userId');

    await closeConversationUseCase.execute({ conversationId, userId });

    return c.json({ success: true });
  }
);

// Rate conversation
const rateSchema = z.object({
  rating: z.number().int().min(1).max(5),
  feedback: z.string().optional()
});

chatRoutes.post('/chat/conversations/:id/rate',
  authMiddleware({ required: true }),
  zValidator('json', rateSchema),
  async (c) => {
    const conversationId = c.req.param('id');
    const userId = c.get('userId');
    const body = c.req.valid('json');

    await rateConversationUseCase.execute({
      conversationId,
      userId,
      ...body
    });

    return c.json({ success: true });
  }
);

export { chatRoutes };
```

##### 5.2 Ticket Routes

```typescript
// src/infrastructure/http/routes/ticket.routes.ts

const ticketRoutes = new Hono();

// List tickets (admin only)
ticketRoutes.get('/tickets',
  authMiddleware({ required: true, roles: ['admin', 'support'] }),
  async (c) => {
    const status = c.req.query('status');
    const priority = c.req.query('priority');
    const assignedTo = c.req.query('assignedTo');

    const tickets = await listTicketsUseCase.execute({
      status,
      priority,
      assignedTo
    });

    return c.json({ tickets });
  }
);

// Get ticket details
ticketRoutes.get('/tickets/:id',
  authMiddleware({ required: true }),
  async (c) => {
    const ticketId = c.req.param('id');
    const ticket = await getTicketUseCase.execute({ ticketId });
    return c.json(ticket);
  }
);

// Assign ticket
ticketRoutes.post('/tickets/:id/assign',
  authMiddleware({ required: true, roles: ['admin', 'support'] }),
  zValidator('json', z.object({ agentId: z.string() })),
  async (c) => {
    const ticketId = c.req.param('id');
    const { agentId } = c.req.valid('json');

    await assignTicketUseCase.execute({ ticketId, agentId });

    return c.json({ success: true });
  }
);

// Resolve ticket
ticketRoutes.post('/tickets/:id/resolve',
  authMiddleware({ required: true, roles: ['admin', 'support'] }),
  zValidator('json', z.object({ resolution: z.string() })),
  async (c) => {
    const ticketId = c.req.param('id');
    const { resolution } = c.req.valid('json');
    const agentId = c.get('userId');

    await resolveTicketUseCase.execute({ ticketId, resolution, agentId });

    return c.json({ success: true });
  }
);

export { ticketRoutes };
```

#### Deliverables
- [ ] Chat routes implemented
- [ ] Ticket routes implemented
- [ ] Request validation
- [ ] Rate limiting middleware
- [ ] Authentication middleware
- [ ] Error handling middleware

---

### Phase 6: Service Integration
**Duration**: 2-3 days
**Priority**: High

#### Objectives
- Implement service clients for Product, Inventory, Order services
- Wire up tool executors with real services
- Add event publishing

#### Tasks

##### 6.1 Service Clients

```typescript
// src/infrastructure/services/product-service.client.ts

export class ProductServiceClient implements IProductServiceClient {
  constructor(private baseUrl: string) {}

  async search(params: ProductSearchParams): Promise<ProductSearchResult> {
    const response = await fetch(`${this.baseUrl}/api/products/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      throw new Error('Product service unavailable');
    }

    return response.json();
  }

  async getProduct(productId: string): Promise<Product> {
    const response = await fetch(`${this.baseUrl}/api/products/${productId}`);

    if (!response.ok) {
      throw new Error('Product not found');
    }

    return response.json();
  }
}
```

```typescript
// src/infrastructure/services/inventory-service.client.ts

export class InventoryServiceClient implements IInventoryServiceClient {
  constructor(private baseUrl: string) {}

  async checkStock(params: CheckStockParams): Promise<StockResult> {
    const response = await fetch(
      `${this.baseUrl}/api/inventory/product/${params.productId}/total-stock`
    );

    if (!response.ok) {
      throw new Error('Inventory service unavailable');
    }

    return response.json();
  }
}
```

```typescript
// src/infrastructure/services/order-service.client.ts

export class OrderServiceClient implements IOrderServiceClient {
  constructor(private baseUrl: string) {}

  async getStatus(params: GetOrderStatusParams): Promise<OrderStatus> {
    const response = await fetch(
      `${this.baseUrl}/api/orders/${params.orderNumber}/status`
    );

    if (!response.ok) {
      throw new Error('Order not found');
    }

    return response.json();
  }

  async getUserOrders(userId: string, limit: number = 5): Promise<Order[]> {
    const response = await fetch(
      `${this.baseUrl}/api/orders?userId=${userId}&limit=${limit}`
    );

    return response.json();
  }
}
```

#### Deliverables
- [ ] ProductServiceClient implemented
- [ ] InventoryServiceClient implemented
- [ ] OrderServiceClient implemented
- [ ] BusinessPartnerClient implemented
- [ ] Event publisher configured

---

### Phase 7: FAQ Management & Grok RAG Setup
**Duration**: 2-3 days
**Priority**: Medium

#### Objectives
- Create FAQ management CRUD
- Upload FAQ documents to Grok project context
- Implement FAQ sync mechanism

#### Tasks

##### 7.1 FAQ Use Cases

```typescript
// src/application/use-cases/manage-faq.use-case.ts

export class ManageFAQUseCase {
  constructor(
    private faqRepo: IFAQRepository,
    private grokRAGService: GrokRAGService
  ) {}

  async createFAQ(input: CreateFAQInput): Promise<FAQ> {
    const faq = FAQ.create(input);
    await this.faqRepo.save(faq);
    await this.grokRAGService.syncFAQ();
    return faq;
  }

  async updateFAQ(id: string, input: UpdateFAQInput): Promise<FAQ> {
    const faq = await this.faqRepo.findById(id);
    if (!faq) throw new Error('FAQ not found');

    faq.update(input);
    await this.faqRepo.update(faq);
    await this.grokRAGService.syncFAQ();

    return faq;
  }

  async deleteFAQ(id: string): Promise<void> {
    await this.faqRepo.delete(id);
    await this.grokRAGService.syncFAQ();
  }
}
```

##### 7.2 Grok RAG Sync

```typescript
// src/infrastructure/llm/grok-rag.service.ts

export class GrokRAGService {
  constructor(
    private faqRepo: IFAQRepository,
    private grokApiKey: string
  ) {}

  async syncFAQ(): Promise<void> {
    const faqs = await this.faqRepo.findAllActive();

    // Format FAQs for Grok project context
    const faqDocument = this.formatFAQsForRAG(faqs);

    // Upload to Grok (via project context API)
    // Note: Actual implementation depends on Grok's project context API
    await this.uploadToGrokContext(faqDocument);
  }

  private formatFAQsForRAG(faqs: FAQ[]): string {
    let document = '# Kidkazz FAQ Knowledge Base\n\n';

    const categories = [...new Set(faqs.map(f => f.category))];

    for (const category of categories) {
      document += `## ${category}\n\n`;

      const categoryFaqs = faqs.filter(f => f.category === category);
      for (const faq of categoryFaqs) {
        document += `### Q: ${faq.question}\n`;
        document += `A: ${faq.answer}\n\n`;
      }
    }

    return document;
  }
}
```

#### Deliverables
- [ ] FAQ CRUD endpoints
- [ ] Grok RAG sync mechanism
- [ ] FAQ admin interface (separate task for ERP dashboard)

---

### Phase 8: Testing & Deployment
**Duration**: 2-3 days
**Priority**: High

#### Objectives
- Complete unit tests
- Complete integration tests
- E2E testing
- Deploy to production

#### Tasks

##### 8.1 Unit Tests

```typescript
// test/unit/domain/conversation.test.ts
describe('Conversation Entity', () => {
  it('should create with correct initial state', () => {
    const conv = Conversation.create({
      userId: 'user-123',
      channel: ChatChannel.WEB
    });

    expect(conv.status).toBe(ConversationStatus.ACTIVE);
    expect(conv.messageCount).toBe(0);
    expect(conv.userType).toBe(UserType.CUSTOMER);
  });

  it('should escalate active conversation', () => {
    const conv = Conversation.create({ channel: ChatChannel.WEB });
    conv.escalate('Customer frustrated');

    expect(conv.status).toBe(ConversationStatus.WAITING_HUMAN);
  });

  it('should not escalate closed conversation', () => {
    const conv = Conversation.create({ channel: ChatChannel.WEB });
    conv.close();

    expect(() => conv.escalate('test')).toThrow();
  });
});
```

##### 8.2 Integration Tests

```typescript
// test/integration/chat-flow.test.ts
describe('Chat Flow Integration', () => {
  it('should handle full conversation flow', async () => {
    // 1. Start conversation
    const startResponse = await request(app)
      .post('/api/chat')
      .send({ message: 'Hello', channel: 'WEB' });

    expect(startResponse.status).toBe(200);
    const { conversationId } = startResponse.body;

    // 2. Ask about products
    const productResponse = await request(app)
      .post('/api/chat')
      .send({
        conversationId,
        message: 'Show me baby bottles'
      });

    expect(productResponse.body.intent).toBe('PRODUCT_SEARCH');

    // 3. Close conversation
    const closeResponse = await request(app)
      .post(`/api/chat/conversations/${conversationId}/close`);

    expect(closeResponse.status).toBe(200);
  });
});
```

##### 8.3 Deployment Checklist

- [ ] Environment variables configured
- [ ] D1 database migrated
- [ ] Grok API key set
- [ ] Service URLs configured
- [ ] Rate limiting configured
- [ ] Monitoring set up
- [ ] Error tracking configured

#### Deliverables
- [ ] Unit tests complete (>80% coverage)
- [ ] Integration tests complete
- [ ] E2E tests complete
- [ ] Deployed to staging
- [ ] Deployed to production

---

## Implementation Timeline

| Phase | Duration | Dependencies | Status |
|-------|----------|--------------|--------|
| Phase 1: Setup | 1-2 days | None | Pending |
| Phase 2: Schema & Domain | 2-3 days | Phase 1 | Pending |
| Phase 3: Grok Integration | 2-3 days | Phase 2 | Pending |
| Phase 4: Use Cases | 3-4 days | Phase 3 | Pending |
| Phase 5: HTTP API | 2-3 days | Phase 4 | Pending |
| Phase 6: Service Integration | 2-3 days | Phase 5 | Pending |
| Phase 7: FAQ & RAG | 2-3 days | Phase 6 | Pending |
| Phase 8: Testing & Deploy | 2-3 days | Phase 7 | Pending |

**Total Estimated Duration**: 16-24 days

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Grok API changes | High | Version lock, adapter pattern |
| High token costs | Medium | Budget limits, model selection |
| Integration failures | Medium | Retry logic, fallback responses |
| Performance issues | Medium | Caching, connection pooling |

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Response time (P95) | < 2s | Monitoring |
| Resolution rate | > 70% | Analytics |
| Escalation rate | < 30% | Analytics |
| Customer satisfaction | > 4.0/5 | Ratings |
| Cost per conversation | < $0.10 | Billing |

---

## Related Documents

- [Chatbot Service Architecture](./CHATBOT_SERVICE_ARCHITECTURE.md)
- [Chatbot Business Rules](./BUSINESS_RULES.md)
- [Product Service](../product/PRODUCT_SERVICE_IMPLEMENTATION_PLAN.md)
- [Inventory Service](../inventory/BUSINESS_RULES.md)
- [Business Partner Service](../business-partner/BUSINESS_PARTNER_SERVICE_ARCHITECTURE.md)
