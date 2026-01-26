# Chatbot Service Architecture

**Version**: 1.0
**Last Updated**: 2026-01-22
**Status**: Planning Phase
**Primary LLM Provider**: Grok API (xAI)

---

## Executive Summary

The Chatbot Service handles customer service automation for the Kidkazz platform using AI-powered conversational interfaces. This service manages FAQ responses, transactional queries (product search, stock check, order status), and intelligent routing to human agents when needed.

### Key Principles

1. **Per-User Memory** - Each customer has personalized conversation history stored in D1
2. **FAQ via Grok RAG** - General knowledge base uploaded to Grok's built-in RAG system
3. **Tool-Based Actions** - LLM can execute internal API calls (Product, Inventory, Order services)
4. **Human Escalation** - Automatic routing to human agents for complex issues
5. **Cost-Efficient** - Using Grok 4.1 Fast for low-cost, high-context conversations

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Domain Model](#domain-model)
3. [Conversation Types](#conversation-types)
4. [Technology Stack](#technology-stack)
5. [Database Schema](#database-schema)
6. [API Architecture](#api-architecture)
7. [Tool Definitions](#tool-definitions)
8. [Service Integration](#service-integration)
9. [Memory Architecture](#memory-architecture)
10. [Escalation Workflow](#escalation-workflow)

---

## System Overview

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           CHATBOT SERVICE                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                        Customer Channels                                  │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │   │
│  │  │ Website │  │ Mobile  │  │WhatsApp │  │Telegram │  │  Other  │       │   │
│  │  │  Chat   │  │  Chat   │  │   Bot   │  │   Bot   │  │ Channels│       │   │
│  │  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘       │   │
│  └───────┼───────────┼───────────┼───────────┼───────────┼────────────────┘   │
│          │           │           │           │           │                      │
│          └───────────┴───────────┴─────┬─────┴───────────┘                      │
│                                        │                                         │
│                                        ▼                                         │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                     Conversation Orchestrator                             │   │
│  │                      (Vercel AI SDK + Hono)                              │   │
│  │                                                                           │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │   │
│  │  │   Router    │  │   Memory    │  │    Tool     │  │  Escalation │    │   │
│  │  │   Agent     │  │   Manager   │  │  Executor   │  │   Handler   │    │   │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘    │   │
│  └─────────┼────────────────┼────────────────┼────────────────┼───────────┘   │
│            │                │                │                │                │
│            ▼                ▼                ▼                ▼                │
│  ┌─────────────────┐ ┌─────────────┐ ┌─────────────────────────────────────┐  │
│  │   Grok API      │ │     D1      │ │        Internal Services            │  │
│  │                 │ │  Database   │ │                                      │  │
│  │ ┌─────────────┐ │ │             │ │ ┌─────────┐ ┌─────────┐ ┌─────────┐│  │
│  │ │ Built-in    │ │ │ • Conversa- │ │ │ Product │ │Inventory│ │  Order  ││  │
│  │ │ RAG (FAQ)   │ │ │   tions     │ │ │ Service │ │ Service │ │ Service ││  │
│  │ │             │ │ │ • Messages  │ │ └─────────┘ └─────────┘ └─────────┘│  │
│  │ │ Tool Use    │ │ │ • Tickets   │ │                                      │  │
│  │ └─────────────┘ │ │             │ │ ┌─────────┐ ┌─────────┐            │  │
│  │                 │ │             │ │ │Business │ │ Payment │            │  │
│  │ LLM Reasoning   │ │             │ │ │ Partner │ │ Service │            │  │
│  └─────────────────┘ └─────────────┘ │ └─────────┘ └─────────┘            │  │
│                                       └─────────────────────────────────────┘  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                           MESSAGE PROCESSING FLOW                               │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  1. USER MESSAGE                                                                │
│     │                                                                           │
│     ▼                                                                           │
│  2. LOAD USER CONTEXT                                                           │
│     ├── Fetch user profile from Business Partner Service                       │
│     ├── Fetch recent conversation history from D1 (last N messages)            │
│     └── Fetch any open tickets/escalations                                     │
│     │                                                                           │
│     ▼                                                                           │
│  3. BUILD PROMPT                                                                │
│     ├── System prompt (CS bot persona, capabilities)                           │
│     ├── User context (name, tier, recent orders)                               │
│     ├── Conversation history                                                    │
│     └── Current message                                                         │
│     │                                                                           │
│     ▼                                                                           │
│  4. GROK API CALL                                                               │
│     ├── FAQ queries → Built-in RAG retrieval                                   │
│     ├── Transactional queries → Tool calling                                   │
│     └── Complex issues → Escalation recommendation                             │
│     │                                                                           │
│     ▼                                                                           │
│  5. EXECUTE TOOLS (if any)                                                      │
│     ├── search_products → Product Service                                      │
│     ├── check_stock → Inventory Service                                        │
│     ├── get_order_status → Order Service                                       │
│     └── escalate_to_human → Create Ticket                                      │
│     │                                                                           │
│     ▼                                                                           │
│  6. SAVE & RESPOND                                                              │
│     ├── Save user message to D1                                                │
│     ├── Save assistant response to D1                                          │
│     └── Return response to user                                                │
│                                                                                 │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Domain Model

### Core Entities

#### 1. Conversation (Aggregate Root)

```typescript
interface Conversation {
  // Identity
  id: string;
  conversationNumber: string;       // Format: CONV-{YYYYMMDD}-{SEQ}

  // Participant
  userId: string;                   // From Business Partner Service (Customer)
  userType: UserType;               // CUSTOMER, GUEST
  guestInfo?: GuestInfo;            // For non-logged-in users

  // Channel
  channel: ChatChannel;             // WEB, MOBILE, WHATSAPP, TELEGRAM
  sessionId?: string;               // Browser/app session tracking

  // Status
  status: ConversationStatus;       // ACTIVE, WAITING_HUMAN, CLOSED, ARCHIVED

  // Escalation
  escalatedAt?: Date;
  escalationReason?: string;
  assignedAgentId?: string;         // Human agent ID

  // Messages
  messages: Message[];

  // Metrics
  messageCount: number;
  firstResponseTime?: number;       // Milliseconds
  resolutionTime?: number;          // Milliseconds

  // Satisfaction
  rating?: number;                  // 1-5 stars
  feedback?: string;

  // Timestamps
  startedAt: Date;
  lastMessageAt: Date;
  closedAt?: Date;

  // Audit
  createdAt: Date;
  updatedAt: Date;
  version: number;
}
```

#### 2. Message (Entity)

```typescript
interface Message {
  id: string;
  conversationId: string;

  // Sender
  role: MessageRole;                // USER, ASSISTANT, SYSTEM, HUMAN_AGENT
  senderId?: string;                // User ID or Agent ID

  // Content
  content: string;
  contentType: ContentType;         // TEXT, IMAGE, DOCUMENT, AUDIO
  attachments?: Attachment[];

  // AI Metadata
  model?: string;                   // grok-4.1-fast, etc.
  tokensUsed?: number;
  toolCalls?: ToolCall[];           // Tools executed
  toolResults?: ToolResult[];       // Tool execution results

  // Intent (from routing)
  detectedIntent?: Intent;          // FAQ, PRODUCT_SEARCH, ORDER_STATUS, etc.
  confidence?: number;              // 0-1 confidence score

  // Status
  status: MessageStatus;            // PENDING, DELIVERED, READ, FAILED

  // Timestamps
  createdAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
}
```

#### 3. Ticket (Entity - for escalations)

```typescript
interface Ticket {
  id: string;
  ticketNumber: string;             // Format: TKT-{YYYYMMDD}-{SEQ}

  // Source
  conversationId: string;
  userId: string;

  // Classification
  category: TicketCategory;         // COMPLAINT, REFUND, TECHNICAL, ORDER_ISSUE, OTHER
  priority: TicketPriority;         // LOW, MEDIUM, HIGH, URGENT

  // Content
  subject: string;
  description: string;

  // Assignment
  assignedTo?: string;              // Human agent ID
  department?: string;              // CS, TECHNICAL, BILLING

  // Status
  status: TicketStatus;             // OPEN, IN_PROGRESS, PENDING_CUSTOMER, RESOLVED, CLOSED

  // Resolution
  resolution?: string;
  resolvedAt?: Date;
  resolvedBy?: string;

  // SLA
  slaDeadline?: Date;
  slaBreach: boolean;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
}
```

#### 4. Enums and Value Objects

```typescript
enum ChatChannel {
  WEB = 'WEB',
  MOBILE = 'MOBILE',
  WHATSAPP = 'WHATSAPP',
  TELEGRAM = 'TELEGRAM'
}

enum ConversationStatus {
  ACTIVE = 'ACTIVE',
  WAITING_HUMAN = 'WAITING_HUMAN',
  CLOSED = 'CLOSED',
  ARCHIVED = 'ARCHIVED'
}

enum MessageRole {
  USER = 'USER',
  ASSISTANT = 'ASSISTANT',
  SYSTEM = 'SYSTEM',
  HUMAN_AGENT = 'HUMAN_AGENT'
}

enum ContentType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  DOCUMENT = 'DOCUMENT',
  AUDIO = 'AUDIO'
}

enum Intent {
  // FAQ
  FAQ_GENERAL = 'FAQ_GENERAL',
  FAQ_SHIPPING = 'FAQ_SHIPPING',
  FAQ_RETURNS = 'FAQ_RETURNS',
  FAQ_PAYMENT = 'FAQ_PAYMENT',

  // Transactional
  PRODUCT_SEARCH = 'PRODUCT_SEARCH',
  STOCK_CHECK = 'STOCK_CHECK',
  ORDER_STATUS = 'ORDER_STATUS',
  ORDER_TRACKING = 'ORDER_TRACKING',

  // Actions
  ESCALATE = 'ESCALATE',
  COMPLAINT = 'COMPLAINT',
  REFUND_REQUEST = 'REFUND_REQUEST',

  // Other
  GREETING = 'GREETING',
  FAREWELL = 'FAREWELL',
  UNKNOWN = 'UNKNOWN'
}

enum TicketCategory {
  COMPLAINT = 'COMPLAINT',
  REFUND = 'REFUND',
  TECHNICAL = 'TECHNICAL',
  ORDER_ISSUE = 'ORDER_ISSUE',
  PRODUCT_INQUIRY = 'PRODUCT_INQUIRY',
  OTHER = 'OTHER'
}

enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  PENDING_CUSTOMER = 'PENDING_CUSTOMER',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED'
}

interface Attachment {
  id: string;
  type: ContentType;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
}

interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

interface ToolResult {
  toolCallId: string;
  result: any;
  error?: string;
}

interface GuestInfo {
  name?: string;
  email?: string;
  phone?: string;
}
```

### Domain Events

```typescript
interface ConversationStarted {
  type: 'ConversationStarted';
  payload: {
    conversationId: string;
    userId: string;
    channel: ChatChannel;
    startedAt: Date;
  };
}

interface MessageReceived {
  type: 'MessageReceived';
  payload: {
    messageId: string;
    conversationId: string;
    userId: string;
    content: string;
    intent: Intent;
  };
}

interface ConversationEscalated {
  type: 'ConversationEscalated';
  payload: {
    conversationId: string;
    ticketId: string;
    reason: string;
    priority: TicketPriority;
  };
}

interface TicketResolved {
  type: 'TicketResolved';
  payload: {
    ticketId: string;
    conversationId: string;
    resolution: string;
    resolvedBy: string;
  };
}

interface ConversationRated {
  type: 'ConversationRated';
  payload: {
    conversationId: string;
    rating: number;
    feedback?: string;
  };
}
```

---

## Conversation Types

### 1. FAQ / Question-Answering

**Description**: Direct answers to common questions using Grok's built-in RAG.

**Examples**:
- "What are your shipping options?"
- "How can I return a product?"
- "What payment methods do you accept?"

**Flow**:
```
User Question → Grok RAG Retrieval → Direct Answer
```

**Data Source**: FAQ documents uploaded to Grok project context.

### 2. Transactional / Process-Oriented

**Description**: Guide users through processes using tool calls to internal APIs.

**Examples**:
- "I'm looking for baby bottles" → Product search
- "Is the Pigeon bottle in stock?" → Stock check
- "Where is my order #WR-20260120-0001?" → Order tracking

**Flow**:
```
User Request → Intent Detection → Tool Call → API Response → Formatted Answer
```

**Tools Used**: `search_products`, `check_stock`, `get_order_status`, `track_shipment`

### 3. Routing / Escalation

**Description**: Redirect to human agents when AI cannot resolve the issue.

**Escalation Triggers**:
- User explicitly requests human agent
- Sentiment analysis detects frustration
- Complex issue detected (refund, complaint)
- AI confidence below threshold
- Multiple failed resolution attempts

**Flow**:
```
Complex Issue → Escalation Trigger → Create Ticket → Notify Human Agent
```

---

## Technology Stack

### Core Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Runtime** | Cloudflare Workers | Edge hosting, low latency |
| **Framework** | Hono | HTTP routing, middleware |
| **LLM Orchestration** | Vercel AI SDK | Streaming, tool calling, providers |
| **LLM Provider** | Grok API (xAI) | Reasoning, RAG, tool use |
| **Database** | Cloudflare D1 | Conversation history, tickets |
| **ORM** | Drizzle | Type-safe database queries |

### Grok API Features Used

| Feature | Purpose | Cost |
|---------|---------|------|
| **Grok 4.1 Fast** | Main reasoning model | $0.20/M input, $0.50/M output |
| **Built-in RAG** | FAQ knowledge base | Included |
| **Tool Calling** | Execute internal APIs | Included |
| **Prompt Caching** | Reduce repeated costs | $0.05/M cached tokens |
| **2M Context** | Long conversation support | Included |

### Integration Points

| Service | Method | Purpose |
|---------|--------|---------|
| **Product Service** | tRPC/HTTP | Product search, details |
| **Inventory Service** | tRPC/HTTP | Stock availability |
| **Order Service** | tRPC/HTTP | Order status, tracking |
| **Business Partner** | tRPC/HTTP | Customer profile, tier |
| **Notification Service** | Events | Escalation alerts |

---

## Database Schema

```sql
-- Conversations
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  conversation_number TEXT NOT NULL UNIQUE,

  -- Participant
  user_id TEXT,                     -- NULL for guests
  user_type TEXT NOT NULL,          -- CUSTOMER, GUEST
  guest_name TEXT,
  guest_email TEXT,
  guest_phone TEXT,

  -- Channel
  channel TEXT NOT NULL,            -- WEB, MOBILE, WHATSAPP, TELEGRAM
  session_id TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'ACTIVE',

  -- Escalation
  escalated_at TEXT,
  escalation_reason TEXT,
  assigned_agent_id TEXT,

  -- Metrics
  message_count INTEGER DEFAULT 0,
  first_response_time INTEGER,      -- ms
  resolution_time INTEGER,          -- ms

  -- Satisfaction
  rating INTEGER,                   -- 1-5
  feedback TEXT,

  -- Timestamps
  started_at TEXT NOT NULL,
  last_message_at TEXT NOT NULL,
  closed_at TEXT,

  -- Audit
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  version INTEGER DEFAULT 1
);

-- Messages
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,

  -- Sender
  role TEXT NOT NULL,               -- USER, ASSISTANT, SYSTEM, HUMAN_AGENT
  sender_id TEXT,

  -- Content
  content TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'TEXT',
  attachments TEXT,                 -- JSON array

  -- AI Metadata
  model TEXT,
  tokens_used INTEGER,
  tool_calls TEXT,                  -- JSON array
  tool_results TEXT,                -- JSON array

  -- Intent
  detected_intent TEXT,
  confidence REAL,

  -- Status
  status TEXT NOT NULL DEFAULT 'DELIVERED',

  -- Timestamps
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  delivered_at TEXT,
  read_at TEXT,

  FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

-- Tickets (Escalations)
CREATE TABLE tickets (
  id TEXT PRIMARY KEY,
  ticket_number TEXT NOT NULL UNIQUE,

  -- Source
  conversation_id TEXT NOT NULL,
  user_id TEXT,

  -- Classification
  category TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'MEDIUM',

  -- Content
  subject TEXT NOT NULL,
  description TEXT NOT NULL,

  -- Assignment
  assigned_to TEXT,
  department TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'OPEN',

  -- Resolution
  resolution TEXT,
  resolved_at TEXT,
  resolved_by TEXT,

  -- SLA
  sla_deadline TEXT,
  sla_breach INTEGER DEFAULT 0,

  -- Timestamps
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at TEXT,

  FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

-- FAQ Documents (for local reference/backup)
CREATE TABLE faq_documents (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  keywords TEXT,                    -- JSON array for search
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
```

---

## API Architecture

### RESTful Endpoints

```typescript
// Chat
POST   /api/chat                     // Send message, get response
GET    /api/chat/conversations       // List user's conversations
GET    /api/chat/conversations/:id   // Get conversation details
POST   /api/chat/conversations/:id/close  // Close conversation
POST   /api/chat/conversations/:id/rate   // Rate conversation

// Tickets
GET    /api/tickets                  // List tickets (admin)
GET    /api/tickets/:id              // Get ticket details
PUT    /api/tickets/:id              // Update ticket
POST   /api/tickets/:id/assign       // Assign to agent
POST   /api/tickets/:id/resolve      // Resolve ticket

// FAQ Management (Admin)
GET    /api/faq                      // List FAQ
POST   /api/faq                      // Create FAQ
PUT    /api/faq/:id                  // Update FAQ
DELETE /api/faq/:id                  // Delete FAQ
POST   /api/faq/sync                 // Sync FAQ to Grok RAG

// Analytics
GET    /api/analytics/conversations  // Conversation metrics
GET    /api/analytics/intents        // Intent distribution
GET    /api/analytics/satisfaction   // CSAT scores
```

### WebSocket Endpoints

```typescript
// Real-time chat
WS /api/chat/ws                      // WebSocket connection for chat

// Events:
// - message: New message
// - typing: User/agent typing indicator
// - escalated: Conversation escalated
// - agent_joined: Human agent joined
// - closed: Conversation closed
```

### Request/Response Examples

```typescript
// Send Chat Message
POST /api/chat
{
  "conversationId": "conv-123",      // Optional, creates new if not provided
  "userId": "cust-456",              // Or guestInfo for non-logged-in
  "message": "I'm looking for baby bottles",
  "channel": "WEB",
  "sessionId": "sess-789"
}

// Response (streaming or complete)
{
  "conversationId": "conv-123",
  "messageId": "msg-abc",
  "response": "I found several baby bottles for you! Here are some options:\n\n1. **Pigeon SofTouch** - Rp 125,000 (In Stock: 45 units)\n2. **Tommee Tippee** - Rp 189,000 (In Stock: 23 units)\n3. **Dr. Brown's Natural Flow** - Rp 215,000 (In Stock: 12 units)\n\nWould you like more details on any of these?",
  "intent": "PRODUCT_SEARCH",
  "toolsUsed": ["search_products"],
  "tokensUsed": 234
}
```

---

## Tool Definitions

### Available Tools for Grok

```typescript
const tools = [
  // Product Search
  {
    name: "search_products",
    description: "Search product catalog by name, category, keywords, or attributes. Use this when the user is looking for products.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query (product name, keyword, category)"
        },
        category: {
          type: "string",
          description: "Product category to filter by",
          optional: true
        },
        priceMin: {
          type: "number",
          description: "Minimum price in IDR",
          optional: true
        },
        priceMax: {
          type: "number",
          description: "Maximum price in IDR",
          optional: true
        },
        limit: {
          type: "number",
          description: "Maximum number of results (default: 5)",
          optional: true
        }
      },
      required: ["query"]
    }
  },

  // Stock Check
  {
    name: "check_stock",
    description: "Check real-time stock availability for a specific product. Use when user asks about availability.",
    parameters: {
      type: "object",
      properties: {
        productId: {
          type: "string",
          description: "Product ID to check"
        },
        productName: {
          type: "string",
          description: "Product name (if ID unknown)",
          optional: true
        },
        warehouseId: {
          type: "string",
          description: "Specific warehouse to check",
          optional: true
        }
      },
      required: ["productId"]
    }
  },

  // Order Status
  {
    name: "get_order_status",
    description: "Get current status of a customer's order. Use when user asks about their order.",
    parameters: {
      type: "object",
      properties: {
        orderNumber: {
          type: "string",
          description: "Order number (e.g., WR-20260120-0001)"
        },
        userId: {
          type: "string",
          description: "Customer ID for verification",
          optional: true
        }
      },
      required: ["orderNumber"]
    }
  },

  // Track Shipment
  {
    name: "track_shipment",
    description: "Get shipment tracking information. Use when user asks about delivery status.",
    parameters: {
      type: "object",
      properties: {
        orderNumber: {
          type: "string",
          description: "Order number"
        },
        trackingNumber: {
          type: "string",
          description: "Carrier tracking number",
          optional: true
        }
      },
      required: ["orderNumber"]
    }
  },

  // Get User Orders
  {
    name: "get_user_orders",
    description: "Get list of user's recent orders. Use when user asks about their orders in general.",
    parameters: {
      type: "object",
      properties: {
        userId: {
          type: "string",
          description: "Customer ID"
        },
        status: {
          type: "string",
          description: "Filter by order status",
          optional: true
        },
        limit: {
          type: "number",
          description: "Number of orders to return (default: 5)",
          optional: true
        }
      },
      required: ["userId"]
    }
  },

  // Escalate to Human
  {
    name: "escalate_to_human",
    description: "Transfer conversation to a human agent. Use when: 1) User explicitly requests human, 2) Issue is too complex, 3) User is frustrated, 4) Refund/complaint needs human handling.",
    parameters: {
      type: "object",
      properties: {
        reason: {
          type: "string",
          description: "Reason for escalation"
        },
        priority: {
          type: "string",
          enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
          description: "Escalation priority"
        },
        category: {
          type: "string",
          enum: ["COMPLAINT", "REFUND", "TECHNICAL", "ORDER_ISSUE", "OTHER"],
          description: "Issue category"
        },
        summary: {
          type: "string",
          description: "Summary of the conversation for the human agent"
        }
      },
      required: ["reason", "priority", "category", "summary"]
    }
  }
];
```

### Tool Execution Flow

```typescript
// Tool executor implementation
async function executeTools(toolCalls: ToolCall[]): Promise<ToolResult[]> {
  const results: ToolResult[] = [];

  for (const call of toolCalls) {
    try {
      let result: any;

      switch (call.name) {
        case 'search_products':
          result = await productService.search(call.arguments);
          break;

        case 'check_stock':
          result = await inventoryService.checkStock(call.arguments);
          break;

        case 'get_order_status':
          result = await orderService.getStatus(call.arguments);
          break;

        case 'track_shipment':
          result = await shippingService.track(call.arguments);
          break;

        case 'get_user_orders':
          result = await orderService.getUserOrders(call.arguments);
          break;

        case 'escalate_to_human':
          result = await escalationService.escalate(call.arguments);
          break;

        default:
          throw new Error(`Unknown tool: ${call.name}`);
      }

      results.push({
        toolCallId: call.id,
        result
      });
    } catch (error) {
      results.push({
        toolCallId: call.id,
        result: null,
        error: error.message
      });
    }
  }

  return results;
}
```

---

## Service Integration

### Integration Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         SERVICE INTEGRATION                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                        CHATBOT SERVICE                                   │    │
│  │                                                                          │    │
│  │  ┌────────────────┐        ┌────────────────┐        ┌────────────────┐│    │
│  │  │  Tool Executor │───────▶│  Service Clients│───────▶│    tRPC/HTTP  ││    │
│  │  └────────────────┘        └────────────────┘        └────────────────┘│    │
│  │                                                                          │    │
│  └──────────────────────────────────┬───────────────────────────────────────┘    │
│                                     │                                            │
│     ┌───────────────────────────────┼───────────────────────────────────────┐   │
│     │                               │                                        │   │
│     ▼                               ▼                               ▼        │   │
│  ┌──────────────┐            ┌──────────────┐            ┌──────────────┐   │   │
│  │   Product    │            │  Inventory   │            │    Order     │   │   │
│  │   Service    │            │   Service    │            │   Service    │   │   │
│  │              │            │              │            │              │   │   │
│  │ • Search     │            │ • Stock      │            │ • Status     │   │   │
│  │ • Details    │            │ • Batches    │            │ • Tracking   │   │   │
│  │ • Categories │            │ • Locations  │            │ • History    │   │   │
│  └──────────────┘            └──────────────┘            └──────────────┘   │   │
│                                                                              │   │
│     ▼                               ▼                               ▼        │   │
│  ┌──────────────┐            ┌──────────────┐            ┌──────────────┐   │   │
│  │  Business    │            │   Payment    │            │   Shipping   │   │   │
│  │   Partner    │            │   Service    │            │   Service    │   │   │
│  │              │            │              │            │              │   │   │
│  │ • Customer   │            │ • Payment    │            │ • Track      │   │   │
│  │   Profile    │            │   Status     │            │ • Carriers   │   │   │
│  │ • Tier/Loyalty│           │ • Refunds    │            │ • ETA        │   │   │
│  └──────────────┘            └──────────────┘            └──────────────┘   │   │
│                                                                              │   │
│                        ┌──────────────────────┐                             │   │
│                        │   Notification       │                             │   │
│                        │   Service            │                             │   │
│                        │                      │                             │   │
│                        │ • Escalation Alerts  │                             │   │
│                        │ • Agent Assignment   │                             │   │
│                        └──────────────────────┘                             │   │
│                                                                              │   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Event Subscriptions

```typescript
// Chatbot Service subscribes to events from other services

// Order Service Events
EventBus.subscribe('OrderShipped', async (event) => {
  // Proactively notify customer if they have active conversation
  const conversation = await findActiveConversation(event.customerId);
  if (conversation) {
    await sendProactiveMessage(conversation.id,
      `Great news! Your order #${event.orderNumber} has been shipped! ` +
      `Track it here: ${event.trackingUrl}`
    );
  }
});

EventBus.subscribe('OrderDelivered', async (event) => {
  // Ask for feedback
  const conversation = await findActiveConversation(event.customerId);
  if (conversation) {
    await sendProactiveMessage(conversation.id,
      `Your order #${event.orderNumber} has been delivered! ` +
      `How was your experience? We'd love to hear your feedback.`
    );
  }
});

// Inventory Service Events
EventBus.subscribe('ProductBackInStock', async (event) => {
  // Notify customers who asked about this product
  const waitingCustomers = await getCustomersWaitingForProduct(event.productId);
  for (const customer of waitingCustomers) {
    await notifyCustomer(customer.id,
      `Good news! ${event.productName} is back in stock! Would you like to order?`
    );
  }
});
```

### Published Events

```typescript
// Events published by Chatbot Service

interface ConversationEscalated {
  type: 'ConversationEscalated';
  payload: {
    conversationId: string;
    ticketId: string;
    userId: string;
    reason: string;
    priority: TicketPriority;
    summary: string;
  };
}
// → Consumed by: Notification Service (alert agents)

interface CustomerFeedbackReceived {
  type: 'CustomerFeedbackReceived';
  payload: {
    conversationId: string;
    userId: string;
    rating: number;
    feedback?: string;
    intentsUsed: Intent[];
  };
}
// → Consumed by: Reporting Service (analytics)

interface ChatbotFailedToResolve {
  type: 'ChatbotFailedToResolve';
  payload: {
    conversationId: string;
    userId: string;
    intent: Intent;
    reason: string;
  };
}
// → Consumed by: Reporting Service (improvement analytics)
```

---

## Memory Architecture

### Per-User Context Management

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         MEMORY ARCHITECTURE                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                    GROK BUILT-IN (Account Level)                         │    │
│  │                                                                          │    │
│  │  FAQ Documents       Company Policies       Product Catalog Info        │    │
│  │  Shipping Info       Return Policy          Payment Methods             │    │
│  │                                                                          │    │
│  │  → Shared across ALL conversations                                       │    │
│  │  → Managed via Grok project context upload                              │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                    D1 DATABASE (Per-User Level)                          │    │
│  │                                                                          │    │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐               │    │
│  │  │  Conversation │  │   Messages    │  │    Tickets    │               │    │
│  │  │   History     │  │   (All roles) │  │  (Escalations)│               │    │
│  │  └───────────────┘  └───────────────┘  └───────────────┘               │    │
│  │                                                                          │    │
│  │  → Fetched per user_id on each request                                  │    │
│  │  → Injected into Grok prompt as conversation history                    │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                    EXTERNAL SERVICES (Real-time)                         │    │
│  │                                                                          │    │
│  │  Business Partner Service    Order Service        Inventory Service     │    │
│  │  ├── Customer profile        ├── Recent orders    ├── Stock levels     │    │
│  │  ├── Customer tier           ├── Order status     └── Product info     │    │
│  │  └── Loyalty points          └── Shipment tracking                      │    │
│  │                                                                          │    │
│  │  → Fetched via API calls during conversation                            │    │
│  │  → NOT stored in chatbot DB (single source of truth)                    │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Context Building Flow

```typescript
async function buildConversationContext(
  userId: string,
  conversationId: string
): Promise<ConversationContext> {
  // 1. Fetch from D1 - User's conversation history
  const recentMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(20);

  // 2. Fetch from Business Partner Service - User profile
  const customer = await businessPartnerClient.getCustomer(userId);

  // 3. Fetch from Order Service - Recent orders (optional)
  const recentOrders = await orderClient.getRecentOrders(userId, 5);

  // 4. Build system prompt with user context
  const systemPrompt = buildSystemPrompt({
    customerName: customer.name,
    customerTier: customer.tier,
    loyaltyPoints: customer.loyaltyPoints,
    recentOrders: recentOrders.map(o => o.orderNumber)
  });

  // 5. Build conversation messages
  const conversationHistory = recentMessages
    .reverse()
    .map(m => ({
      role: m.role.toLowerCase() as 'user' | 'assistant',
      content: m.content
    }));

  return {
    systemPrompt,
    conversationHistory,
    customerContext: customer
  };
}

function buildSystemPrompt(context: CustomerContext): string {
  return `You are a helpful customer service assistant for Kidkazz, an Indonesian baby & kids e-commerce store.

## Customer Context
- Name: ${context.customerName}
- Tier: ${context.customerTier}
- Loyalty Points: ${context.loyaltyPoints}
- Recent Orders: ${context.recentOrders.join(', ') || 'None'}

## Your Capabilities
1. Answer questions about products, shipping, returns, and policies (via FAQ knowledge)
2. Search for products and check stock availability
3. Look up order status and tracking information
4. Escalate complex issues to human agents

## Guidelines
- Be friendly, helpful, and professional
- Respond in Indonesian unless the customer writes in English
- Use customer's name when appropriate
- When unsure, ask clarifying questions
- Escalate to human for: complaints, refunds, complex technical issues, or when customer requests

## Available Tools
- search_products: Find products by name, category, or keywords
- check_stock: Check if a product is in stock
- get_order_status: Get status of an order
- track_shipment: Get delivery tracking info
- escalate_to_human: Transfer to human agent`;
}
```

---

## Escalation Workflow

### Escalation Triggers

```typescript
const ESCALATION_TRIGGERS = {
  // Explicit triggers
  EXPLICIT_REQUEST: {
    keywords: ['bicara dengan manusia', 'berbicara dengan cs', 'human agent', 'speak to human', 'real person'],
    priority: 'MEDIUM'
  },

  // Sentiment triggers
  FRUSTRATION: {
    keywords: ['kecewa', 'marah', 'tidak puas', 'frustrated', 'angry', 'disappointed'],
    priority: 'HIGH'
  },

  // Category triggers
  REFUND_REQUEST: {
    keywords: ['refund', 'pengembalian dana', 'uang kembali'],
    priority: 'HIGH',
    category: 'REFUND'
  },

  COMPLAINT: {
    keywords: ['komplain', 'complaint', 'keluhan', 'tidak sesuai', 'rusak', 'defect'],
    priority: 'HIGH',
    category: 'COMPLAINT'
  },

  // System triggers
  REPEATED_FAILURES: {
    threshold: 3, // 3 failed resolution attempts
    priority: 'MEDIUM'
  },

  LOW_CONFIDENCE: {
    threshold: 0.5, // Below 50% confidence
    priority: 'MEDIUM'
  }
};
```

### Escalation Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         ESCALATION WORKFLOW                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  1. ESCALATION TRIGGERED                                                         │
│     │                                                                            │
│     ▼                                                                            │
│  2. CREATE TICKET                                                                │
│     ├── Generate ticket number (TKT-YYYYMMDD-SEQ)                               │
│     ├── Set category and priority                                               │
│     ├── Generate conversation summary (AI-powered)                              │
│     └── Link to conversation                                                    │
│     │                                                                            │
│     ▼                                                                            │
│  3. UPDATE CONVERSATION STATUS                                                   │
│     └── status: ACTIVE → WAITING_HUMAN                                          │
│     │                                                                            │
│     ▼                                                                            │
│  4. NOTIFY AGENTS                                                                │
│     ├── Publish ConversationEscalated event                                     │
│     ├── Notification Service sends alert to available agents                    │
│     └── Dashboard shows new ticket                                              │
│     │                                                                            │
│     ▼                                                                            │
│  5. AGENT PICKS UP                                                               │
│     ├── Ticket assigned to agent                                                │
│     ├── Agent joins conversation                                                │
│     └── Customer notified: "A human agent will assist you shortly"             │
│     │                                                                            │
│     ▼                                                                            │
│  6. HUMAN CONVERSATION                                                           │
│     ├── Messages saved with role: HUMAN_AGENT                                   │
│     └── AI can assist agent with suggestions (optional)                         │
│     │                                                                            │
│     ▼                                                                            │
│  7. RESOLUTION                                                                   │
│     ├── Agent resolves ticket                                                   │
│     ├── Ticket status: RESOLVED                                                 │
│     ├── Conversation status: CLOSED                                             │
│     └── Customer prompted for rating                                            │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Related Documents

- [Chatbot Service Business Rules](./BUSINESS_RULES.md)
- [Chatbot Implementation Plan](./CHATBOT_IMPLEMENTATION_PLAN.md)
- [Business Partner Service](../business-partner/BUSINESS_PARTNER_SERVICE_ARCHITECTURE.md)
- [Notification Service](../notification/NOTIFICATION_SERVICE_ARCHITECTURE.md)
- [Sales Service](../sales/SALES_SERVICE_ARCHITECTURE.md)
