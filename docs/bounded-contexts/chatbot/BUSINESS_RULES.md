# Chatbot Service Business Rules

**Version**: 1.0
**Last Updated**: 2026-01-22
**Status**: Planning Phase

---

## Overview

This document describes all business rules implemented in the Chatbot Service. The service manages customer service automation through AI-powered conversations, tool-based actions, and intelligent escalation to human agents.

---

## Conversation Rules

### Rule 1: Per-User Conversation History

**Rule**: Each user has their own conversation history stored in D1, isolated from other users.

**Business Rationale**:
- Personalized customer experience
- Context continuity across sessions
- Privacy compliance

**Implementation**:
```typescript
// Fetch history for specific user
const history = await db
  .select()
  .from(messages)
  .where(and(
    eq(messages.conversationId, conversationId),
    eq(conversations.userId, userId)  // Ensure user owns this conversation
  ))
  .orderBy(desc(messages.createdAt))
  .limit(20);
```

**Error Message**: "Conversation not found or access denied"

---

### Rule 2: Conversation History Limit

**Rule**: Only the last 20 messages are loaded as context for each API call to manage token costs.

**Business Rationale**:
- Cost optimization (fewer tokens)
- Grok's 2M context can handle more, but practical limit prevents runaway costs
- Most recent context is most relevant

**Implementation**:
```typescript
const CONVERSATION_HISTORY_LIMIT = 20;

const recentMessages = await fetchMessages(conversationId, CONVERSATION_HISTORY_LIMIT);
```

**Configuration**: Adjustable via environment variable `CHATBOT_HISTORY_LIMIT`

---

### Rule 3: Conversation Auto-Close

**Rule**: Conversations are automatically closed after 24 hours of inactivity.

**Business Rationale**:
- Clean up stale conversations
- Accurate metrics calculation
- Database hygiene

**Implementation**:
```typescript
const INACTIVITY_THRESHOLD_HOURS = 24;

// Scheduled job (Cloudflare Cron)
async function closeInactiveConversations() {
  const threshold = new Date(Date.now() - INACTIVITY_THRESHOLD_HOURS * 60 * 60 * 1000);

  await db
    .update(conversations)
    .set({
      status: 'CLOSED',
      closedAt: new Date().toISOString()
    })
    .where(and(
      eq(conversations.status, 'ACTIVE'),
      lt(conversations.lastMessageAt, threshold.toISOString())
    ));
}
```

---

### Rule 4: Guest Conversation Limitation

**Rule**: Guest (non-logged-in) users can have conversations but cannot access order-related tools.

**Business Rationale**:
- Allow FAQ and product search for all visitors
- Protect order data behind authentication
- Encourage account creation

**Implementation**:
```typescript
const GUEST_ALLOWED_TOOLS = ['search_products', 'check_stock', 'escalate_to_human'];
const AUTHENTICATED_TOOLS = ['get_order_status', 'track_shipment', 'get_user_orders'];

function getAvailableTools(isAuthenticated: boolean): Tool[] {
  if (isAuthenticated) {
    return [...GUEST_ALLOWED_TOOLS, ...AUTHENTICATED_TOOLS];
  }
  return GUEST_ALLOWED_TOOLS;
}
```

**Error Message**: "Please log in to check your order status"

---

## Message Rules

### Rule 5: Message Content Validation

**Rule**: All messages must have non-empty content with maximum length of 4000 characters.

**Business Rationale**:
- Prevent empty submissions
- Manage token costs
- Match Grok's optimal input size

**Implementation**:
```typescript
const MAX_MESSAGE_LENGTH = 4000;

function validateMessage(content: string): void {
  if (!content || content.trim().length === 0) {
    throw new Error('Message cannot be empty');
  }
  if (content.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`);
  }
}
```

**Error Messages**:
- "Message cannot be empty"
- "Message exceeds maximum length of 4000 characters"

---

### Rule 6: Rate Limiting

**Rule**: Users are limited to 30 messages per minute to prevent abuse.

**Business Rationale**:
- Prevent API abuse
- Control costs
- Ensure fair usage

**Implementation**:
```typescript
const RATE_LIMIT = {
  maxRequests: 30,
  windowMs: 60 * 1000  // 1 minute
};

// Using Cloudflare Workers rate limiting
async function checkRateLimit(userId: string): Promise<boolean> {
  const key = `chatbot:rate:${userId}`;
  const count = await rateLimiter.increment(key, RATE_LIMIT.windowMs);
  return count <= RATE_LIMIT.maxRequests;
}
```

**Error Message**: "Too many messages. Please wait a moment before sending another."

---

### Rule 7: Profanity and Abuse Detection

**Rule**: Messages containing excessive profanity or abusive content trigger automatic escalation.

**Business Rationale**:
- Protect AI from manipulation
- Flag potentially angry customers early
- Ensure appropriate human handling

**Implementation**:
```typescript
const ABUSE_KEYWORDS = ['kasar', 'bodoh', 'goblok', 'stupid', 'idiot'];
const ABUSE_THRESHOLD = 2;

function checkForAbuse(content: string): boolean {
  const lowerContent = content.toLowerCase();
  let count = 0;
  for (const keyword of ABUSE_KEYWORDS) {
    if (lowerContent.includes(keyword)) {
      count++;
    }
  }
  return count >= ABUSE_THRESHOLD;
}

// Auto-escalate if abuse detected
if (checkForAbuse(message)) {
  await escalateToHuman({
    reason: 'Abuse detected - customer may need immediate attention',
    priority: 'HIGH',
    category: 'COMPLAINT'
  });
}
```

---

## Tool Usage Rules

### Rule 8: Tool Authorization by User Type

**Rule**: Different tools are available based on user authentication status and customer type.

**Business Rationale**:
- Security (order data requires auth)
- B2B customers may have different access
- Guest users get limited functionality

**Tool Access Matrix**:

| Tool | Guest | Retail (B2C) | Wholesale (B2B) |
|------|-------|--------------|-----------------|
| search_products | ✅ | ✅ | ✅ |
| check_stock | ✅ | ✅ | ✅ |
| get_order_status | ❌ | ✅ | ✅ |
| track_shipment | ❌ | ✅ | ✅ |
| get_user_orders | ❌ | ✅ | ✅ |
| escalate_to_human | ✅ | ✅ | ✅ |

---

### Rule 9: Tool Call Retry Limit

**Rule**: If a tool call fails, retry up to 2 times before falling back to error message.

**Business Rationale**:
- Handle transient failures
- Don't hang on broken integrations
- Provide fallback user experience

**Implementation**:
```typescript
const TOOL_RETRY_LIMIT = 2;
const TOOL_RETRY_DELAY_MS = 500;

async function executeToolWithRetry(toolCall: ToolCall): Promise<ToolResult> {
  let lastError: Error;

  for (let attempt = 0; attempt <= TOOL_RETRY_LIMIT; attempt++) {
    try {
      return await executeTool(toolCall);
    } catch (error) {
      lastError = error;
      if (attempt < TOOL_RETRY_LIMIT) {
        await sleep(TOOL_RETRY_DELAY_MS * (attempt + 1));
      }
    }
  }

  return {
    toolCallId: toolCall.id,
    result: null,
    error: `Service temporarily unavailable. Please try again.`
  };
}
```

---

### Rule 10: Tool Response Size Limit

**Rule**: Tool responses are truncated to 2000 characters to prevent context overflow.

**Business Rationale**:
- Prevent single tool from consuming all context
- Keep responses concise
- Manage token costs

**Implementation**:
```typescript
const MAX_TOOL_RESPONSE_SIZE = 2000;

function truncateToolResponse(result: any): string {
  const stringified = JSON.stringify(result, null, 2);
  if (stringified.length > MAX_TOOL_RESPONSE_SIZE) {
    return stringified.substring(0, MAX_TOOL_RESPONSE_SIZE) + '\n... (truncated)';
  }
  return stringified;
}
```

---

## Escalation Rules

### Rule 11: Automatic Escalation Triggers

**Rule**: Conversations are automatically escalated under specific conditions.

**Triggers**:

| Trigger | Condition | Priority |
|---------|-----------|----------|
| Explicit Request | User says "human", "agent", "cs", etc. | MEDIUM |
| Frustration Detected | Sentiment keywords detected | HIGH |
| Refund Request | Keywords: "refund", "uang kembali" | HIGH |
| Complaint | Keywords: "komplain", "complaint" | HIGH |
| Repeated Failures | 3+ failed resolution attempts | MEDIUM |
| Low Confidence | AI confidence < 50% | MEDIUM |

**Implementation**:
```typescript
function checkEscalationTriggers(message: string, context: ConversationContext): EscalationResult | null {
  const lowerMessage = message.toLowerCase();

  // Explicit request
  if (EXPLICIT_REQUEST_KEYWORDS.some(k => lowerMessage.includes(k))) {
    return { trigger: 'EXPLICIT_REQUEST', priority: 'MEDIUM' };
  }

  // Frustration
  if (FRUSTRATION_KEYWORDS.some(k => lowerMessage.includes(k))) {
    return { trigger: 'FRUSTRATION', priority: 'HIGH' };
  }

  // Refund request
  if (REFUND_KEYWORDS.some(k => lowerMessage.includes(k))) {
    return { trigger: 'REFUND_REQUEST', priority: 'HIGH', category: 'REFUND' };
  }

  // Complaint
  if (COMPLAINT_KEYWORDS.some(k => lowerMessage.includes(k))) {
    return { trigger: 'COMPLAINT', priority: 'HIGH', category: 'COMPLAINT' };
  }

  // Repeated failures
  if (context.failedResolutionCount >= 3) {
    return { trigger: 'REPEATED_FAILURES', priority: 'MEDIUM' };
  }

  return null;
}
```

---

### Rule 12: Escalation Priority SLA

**Rule**: Each escalation priority has a defined SLA for first human response.

**SLA Targets**:

| Priority | First Response SLA | Resolution SLA |
|----------|-------------------|----------------|
| URGENT | 5 minutes | 1 hour |
| HIGH | 15 minutes | 4 hours |
| MEDIUM | 1 hour | 24 hours |
| LOW | 4 hours | 48 hours |

**Implementation**:
```typescript
const SLA_TARGETS = {
  URGENT: { firstResponse: 5 * 60 * 1000, resolution: 60 * 60 * 1000 },
  HIGH: { firstResponse: 15 * 60 * 1000, resolution: 4 * 60 * 60 * 1000 },
  MEDIUM: { firstResponse: 60 * 60 * 1000, resolution: 24 * 60 * 60 * 1000 },
  LOW: { firstResponse: 4 * 60 * 60 * 1000, resolution: 48 * 60 * 60 * 1000 }
};

function calculateSLADeadline(priority: TicketPriority): Date {
  const sla = SLA_TARGETS[priority];
  return new Date(Date.now() + sla.resolution);
}
```

---

### Rule 13: One Active Escalation Per Conversation

**Rule**: A conversation can only have one OPEN ticket at a time.

**Business Rationale**:
- Prevent duplicate tickets
- Clear ownership
- Simplified tracking

**Implementation**:
```typescript
async function createTicket(conversationId: string, data: CreateTicketData): Promise<Ticket> {
  // Check for existing open ticket
  const existingTicket = await db
    .select()
    .from(tickets)
    .where(and(
      eq(tickets.conversationId, conversationId),
      inArray(tickets.status, ['OPEN', 'IN_PROGRESS', 'PENDING_CUSTOMER'])
    ))
    .limit(1);

  if (existingTicket.length > 0) {
    throw new Error('This conversation already has an open ticket');
  }

  // Create new ticket
  return await createNewTicket(data);
}
```

**Error Message**: "This conversation already has an open ticket"

---

## Ticket Rules

### Rule 14: Ticket Status Transitions

**Rule**: Ticket status must follow valid transition paths.

**Valid Transitions**:
```
OPEN → IN_PROGRESS          # Agent picks up
OPEN → CLOSED               # Auto-close (spam, duplicate)
IN_PROGRESS → PENDING_CUSTOMER  # Waiting for customer response
IN_PROGRESS → RESOLVED      # Issue resolved
PENDING_CUSTOMER → IN_PROGRESS  # Customer responded
PENDING_CUSTOMER → CLOSED   # No response timeout
RESOLVED → CLOSED           # Final closure
RESOLVED → IN_PROGRESS      # Reopened
CLOSED → OPEN               # Reopened (within 7 days)
```

**Implementation**:
```typescript
const VALID_TICKET_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ['IN_PROGRESS', 'CLOSED'],
  IN_PROGRESS: ['PENDING_CUSTOMER', 'RESOLVED'],
  PENDING_CUSTOMER: ['IN_PROGRESS', 'CLOSED'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'],
  CLOSED: ['OPEN']  // Reopen within 7 days
};

function validateTicketTransition(current: TicketStatus, next: TicketStatus): void {
  if (!VALID_TICKET_TRANSITIONS[current].includes(next)) {
    throw new Error(`Cannot transition ticket from ${current} to ${next}`);
  }
}
```

---

### Rule 15: Ticket Auto-Escalation

**Rule**: Tickets approaching SLA deadline are auto-escalated to higher priority.

**Business Rationale**:
- Prevent SLA breaches
- Alert supervisors
- Maintain service quality

**Implementation**:
```typescript
const SLA_WARNING_THRESHOLD = 0.8;  // 80% of SLA time elapsed

// Scheduled job
async function checkSLAWarnings() {
  const openTickets = await db
    .select()
    .from(tickets)
    .where(inArray(tickets.status, ['OPEN', 'IN_PROGRESS', 'PENDING_CUSTOMER']));

  for (const ticket of openTickets) {
    const elapsed = Date.now() - new Date(ticket.createdAt).getTime();
    const slaDeadline = new Date(ticket.slaDeadline).getTime() - new Date(ticket.createdAt).getTime();
    const progress = elapsed / slaDeadline;

    if (progress >= SLA_WARNING_THRESHOLD && !ticket.slaBreach) {
      // Escalate priority if possible
      if (ticket.priority !== 'URGENT') {
        await escalateTicketPriority(ticket.id);
      }
      // Notify supervisor
      await notifySupervisor(ticket);
    }
  }
}
```

---

## Rating and Feedback Rules

### Rule 16: Rating Window

**Rule**: Customers can only rate a conversation within 7 days of closure.

**Business Rationale**:
- Fresh feedback is more accurate
- Clean up old data
- Consistent metrics

**Implementation**:
```typescript
const RATING_WINDOW_DAYS = 7;

async function rateConversation(conversationId: string, rating: number, feedback?: string): Promise<void> {
  const conversation = await getConversation(conversationId);

  if (conversation.status !== 'CLOSED') {
    throw new Error('Can only rate closed conversations');
  }

  const closedAt = new Date(conversation.closedAt);
  const now = new Date();
  const daysSinceClosure = (now.getTime() - closedAt.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceClosure > RATING_WINDOW_DAYS) {
    throw new Error('Rating window has expired');
  }

  await updateConversationRating(conversationId, rating, feedback);
}
```

**Error Messages**:
- "Can only rate closed conversations"
- "Rating window has expired"

---

### Rule 17: Rating Validation

**Rule**: Rating must be an integer between 1 and 5.

**Implementation**:
```typescript
function validateRating(rating: number): void {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }
}
```

**Error Message**: "Rating must be between 1 and 5"

---

## Cost Management Rules

### Rule 18: Token Budget Per Conversation

**Rule**: Each conversation has a daily token budget to prevent runaway costs.

**Budget**: 50,000 tokens per conversation per day

**Business Rationale**:
- Cost control
- Prevent abuse
- Fair resource allocation

**Implementation**:
```typescript
const DAILY_TOKEN_BUDGET = 50000;

async function checkTokenBudget(conversationId: string, estimatedTokens: number): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];
  const key = `chatbot:tokens:${conversationId}:${today}`;

  const used = await kv.get<number>(key) || 0;

  if (used + estimatedTokens > DAILY_TOKEN_BUDGET) {
    return false;
  }

  await kv.put(key, used + estimatedTokens, { expirationTtl: 86400 });
  return true;
}
```

**Error Message**: "Daily conversation limit reached. Please try again tomorrow or contact support."

---

### Rule 19: Model Selection by Complexity

**Rule**: Simple queries use cheaper models, complex queries use more capable models.

**Model Selection**:

| Query Type | Model | Cost |
|------------|-------|------|
| FAQ (simple) | Grok 4.1 Fast | $0.20/$0.50 per M |
| Transactional | Grok 4.1 Fast | $0.20/$0.50 per M |
| Complex reasoning | Grok 4 | $3/$15 per M |

**Implementation**:
```typescript
function selectModel(intent: Intent, complexity: number): string {
  // Complex intents or high complexity score
  if (complexity > 0.8 || ['COMPLAINT', 'REFUND_REQUEST'].includes(intent)) {
    return 'grok-4';
  }

  // Default to fast model
  return 'grok-4.1-fast';
}
```

---

## Data Retention Rules

### Rule 20: Conversation Archival

**Rule**: Conversations older than 90 days are archived to cold storage.

**Business Rationale**:
- D1 storage optimization
- Compliance with data retention policies
- Performance optimization

**Implementation**:
```typescript
const ARCHIVE_THRESHOLD_DAYS = 90;

// Scheduled job (monthly)
async function archiveOldConversations() {
  const threshold = new Date(Date.now() - ARCHIVE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);

  // Move to archive table / R2 storage
  const toArchive = await db
    .select()
    .from(conversations)
    .where(and(
      eq(conversations.status, 'CLOSED'),
      lt(conversations.closedAt, threshold.toISOString())
    ));

  for (const conv of toArchive) {
    await archiveConversation(conv);
    await softDeleteConversation(conv.id);
  }
}
```

---

### Rule 21: Message Retention

**Rule**: Messages are retained for 2 years for compliance, then permanently deleted.

**Business Rationale**:
- Legal compliance
- Customer dispute resolution
- Storage management

**Implementation**:
```typescript
const MESSAGE_RETENTION_YEARS = 2;

// Scheduled job (yearly)
async function purgeOldMessages() {
  const threshold = new Date();
  threshold.setFullYear(threshold.getFullYear() - MESSAGE_RETENTION_YEARS);

  await db
    .delete(messages)
    .where(lt(messages.createdAt, threshold.toISOString()));
}
```

---

## Security Rules

### Rule 22: PII Masking in Logs

**Rule**: Personal Identifiable Information (PII) must be masked in all logs.

**PII Fields**: Email, phone, address, payment details

**Implementation**:
```typescript
function maskPII(content: string): string {
  // Mask email
  content = content.replace(/[\w.-]+@[\w.-]+\.\w+/g, '***@***.***');

  // Mask phone (Indonesian format)
  content = content.replace(/(\+62|08)\d{8,11}/g, '***-****-****');

  // Mask credit card
  content = content.replace(/\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/g, '****-****-****-****');

  return content;
}

function logMessage(message: string): void {
  console.log(maskPII(message));
}
```

---

### Rule 23: Injection Prevention

**Rule**: All user input must be sanitized before being used in tool calls or database queries.

**Implementation**:
```typescript
function sanitizeInput(input: string): string {
  // Remove potential SQL injection
  input = input.replace(/['";\\]/g, '');

  // Remove potential script injection
  input = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Limit length
  input = input.substring(0, 4000);

  return input.trim();
}
```

---

## Internationalization Rules

### Rule 24: Language Detection

**Rule**: Chatbot responds in the same language as the customer's message (Indonesian or English).

**Implementation**:
```typescript
function detectLanguage(text: string): 'id' | 'en' {
  const indonesianKeywords = ['apa', 'bagaimana', 'apakah', 'berapa', 'dimana', 'kapan', 'siapa', 'mengapa'];
  const englishKeywords = ['what', 'how', 'where', 'when', 'why', 'who', 'which', 'is', 'are'];

  const lowerText = text.toLowerCase();

  let idScore = indonesianKeywords.filter(k => lowerText.includes(k)).length;
  let enScore = englishKeywords.filter(k => lowerText.includes(k)).length;

  return idScore >= enScore ? 'id' : 'en';
}
```

---

### Rule 25: Currency Display

**Rule**: All prices are displayed in IDR with Indonesian number formatting.

**Implementation**:
```typescript
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

// Example: formatCurrency(150000) → "Rp 150.000"
```

---

## Testing Requirements

### Unit Tests

```typescript
describe('Chatbot Business Rules', () => {
  describe('Rule 1: Per-User History', () => {
    it('should only fetch messages for the authenticated user', async () => {
      const history = await fetchUserHistory('user-123', 'conv-456');
      expect(history.every(m => m.userId === 'user-123')).toBe(true);
    });
  });

  describe('Rule 11: Escalation Triggers', () => {
    it('should escalate when frustration keywords detected', () => {
      const result = checkEscalationTriggers('Saya sangat kecewa dengan layanan ini!', context);
      expect(result).not.toBeNull();
      expect(result.priority).toBe('HIGH');
    });

    it('should escalate after 3 failed resolutions', () => {
      const context = { failedResolutionCount: 3 };
      const result = checkEscalationTriggers('hello', context);
      expect(result).not.toBeNull();
      expect(result.trigger).toBe('REPEATED_FAILURES');
    });
  });

  describe('Rule 14: Ticket Transitions', () => {
    it('should allow valid transitions', () => {
      expect(() => validateTicketTransition('OPEN', 'IN_PROGRESS')).not.toThrow();
    });

    it('should reject invalid transitions', () => {
      expect(() => validateTicketTransition('OPEN', 'RESOLVED')).toThrow();
    });
  });
});
```

---

## Rule Change Process

1. **Document** the rule change in this file
2. **Implement** in domain layer (entity/value object)
3. **Add** validation to use cases
4. **Update** API documentation
5. **Write** tests for the rule
6. **Notify** stakeholders of changes

---

**Last Updated**: January 2026
**Maintained By**: Development Team
**Review Cycle**: Quarterly or when new rules are added
**Related Docs**:
- [Chatbot Service Architecture](./CHATBOT_SERVICE_ARCHITECTURE.md)
- [Chatbot Implementation Plan](./CHATBOT_IMPLEMENTATION_PLAN.md)
