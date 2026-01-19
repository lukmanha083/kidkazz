# Notification Service Architecture

**Version**: 1.0
**Last Updated**: 2025-01-16
**Status**: Planning Phase
**Primary Provider**: sent.dm

---

## Executive Summary

The Notification Service handles all customer communications for the Kidkazz platform using a **paperless-first approach**. We use **sent.dm** as the primary messaging provider to deliver invoices, receipts, OTP codes, order updates, and marketing communications through the customer's preferred channel.

### Key Principles

1. **Paperless First** - Digital receipts/invoices by default, print only on request
2. **Channel Auto-Detection** - Automatically detect best channel (WhatsApp > Telegram > iMessage > SMS)
3. **Unified API** - Single interface for all notification types
4. **Template-Based** - Pre-approved templates for transactional messages
5. **Multi-Language** - Support for Indonesian and English messages

---

## Table of Contents

1. [Provider Overview](#provider-overview)
2. [Domain Model](#domain-model)
3. [Notification Types](#notification-types)
4. [sent.dm Integration](#sentdm-integration)
5. [Message Templates](#message-templates)
6. [Database Schema](#database-schema)
7. [API Architecture](#api-architecture)
8. [Service Integration](#service-integration)

---

## Provider Overview

### sent.dm

**sent.dm** is a unified messaging API that allows sending messages through multiple channels with automatic detection of the best available channel for each recipient.

**Supported Channels**:
| Channel | Priority | Use Case | Character Limit |
|---------|----------|----------|-----------------|
| WhatsApp | 1 (Highest) | Rich messages, documents, images | 4096 |
| Telegram | 2 | Rich messages, documents | 4096 |
| iMessage | 3 | Apple users | 2000 |
| SMS | 4 (Fallback) | Universal fallback | 160 (or 1600 concatenated) |
| Email | 5 (Fallback) | Document delivery, long content | Unlimited |

**Channel Detection Logic**:
```
1. Check if phone has WhatsApp → Use WhatsApp
2. Else check if phone has Telegram → Use Telegram
3. Else check if phone is iPhone → Use iMessage
4. Else → Use SMS (or Email if phone unavailable)
```

---

## Domain Model

### Core Entities

#### 1. Notification (Aggregate Root)

```typescript
interface Notification {
  // Identity
  id: string;
  notificationNumber: string;     // Format: NOTIF-{YYYYMMDD}-{SEQ}

  // Recipient
  recipientId?: string;           // Customer/Employee ID
  recipientType: RecipientType;   // CUSTOMER, EMPLOYEE, SUPPLIER
  recipientPhone?: string;
  recipientEmail?: string;

  // Message
  type: NotificationType;
  template: string;
  templateData: Record<string, any>;
  channel: MessageChannel;        // Actual channel used
  channelDetected: boolean;       // Was channel auto-detected?

  // Content
  subject?: string;               // For email
  body: string;                   // Rendered message
  attachments?: Attachment[];

  // Delivery
  status: NotificationStatus;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failedAt?: Date;
  failureReason?: string;

  // Provider
  providerMessageId?: string;
  providerResponse?: Record<string, any>;

  // Metadata
  sourceService: string;          // PAYMENT, SALES, AUTH, etc.
  sourceReference?: string;       // Order ID, Payment ID, etc.
  locale: Locale;
  priority: NotificationPriority;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  scheduledAt?: Date;             // For scheduled notifications
  expiresAt?: Date;               // For time-sensitive (OTP)
}
```

#### 2. Enums and Value Objects

```typescript
enum NotificationType {
  // Transactional
  OTP = 'OTP',
  PAYMENT_CONFIRMATION = 'PAYMENT_CONFIRMATION',
  INVOICE = 'INVOICE',
  RECEIPT = 'RECEIPT',
  ORDER_CONFIRMATION = 'ORDER_CONFIRMATION',
  ORDER_SHIPPED = 'ORDER_SHIPPED',
  ORDER_DELIVERED = 'ORDER_DELIVERED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  REFUND_PROCESSED = 'REFUND_PROCESSED',

  // Account
  WELCOME = 'WELCOME',
  PASSWORD_RESET = 'PASSWORD_RESET',
  ACCOUNT_VERIFIED = 'ACCOUNT_VERIFIED',
  PROFILE_UPDATED = 'PROFILE_UPDATED',

  // Alerts
  LOW_STOCK_ALERT = 'LOW_STOCK_ALERT',
  PAYMENT_REMINDER = 'PAYMENT_REMINDER',
  DELIVERY_REMINDER = 'DELIVERY_REMINDER',

  // Marketing (opt-in only)
  PROMOTION = 'PROMOTION',
  NEW_PRODUCT = 'NEW_PRODUCT',
  FLASH_SALE = 'FLASH_SALE',

  // Live Streaming
  STREAM_STARTING = 'STREAM_STARTING',
  STREAM_REMINDER = 'STREAM_REMINDER',

  // Internal (Staff)
  ATTENDANCE_REMINDER = 'ATTENDANCE_REMINDER',
  TASK_ASSIGNED = 'TASK_ASSIGNED',
  APPROVAL_REQUEST = 'APPROVAL_REQUEST'
}

enum MessageChannel {
  WHATSAPP = 'WHATSAPP',
  TELEGRAM = 'TELEGRAM',
  IMESSAGE = 'IMESSAGE',
  SMS = 'SMS',
  EMAIL = 'EMAIL',
  PUSH = 'PUSH'                   // Mobile app push notification
}

enum NotificationStatus {
  PENDING = 'PENDING',
  QUEUED = 'QUEUED',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED'
}

enum NotificationPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT'               // For OTP, time-sensitive
}

enum RecipientType {
  CUSTOMER = 'CUSTOMER',
  EMPLOYEE = 'EMPLOYEE',
  SUPPLIER = 'SUPPLIER'
}

interface Attachment {
  type: 'IMAGE' | 'DOCUMENT' | 'VIDEO';
  url: string;
  filename: string;
  mimeType: string;
  size?: number;
}
```

### Domain Events

```typescript
interface NotificationSent {
  type: 'NotificationSent';
  payload: {
    notificationId: string;
    type: NotificationType;
    channel: MessageChannel;
    recipientPhone: string;
    sentAt: Date;
  };
}

interface NotificationDelivered {
  type: 'NotificationDelivered';
  payload: {
    notificationId: string;
    deliveredAt: Date;
    providerMessageId: string;
  };
}

interface NotificationFailed {
  type: 'NotificationFailed';
  payload: {
    notificationId: string;
    reason: string;
    willRetry: boolean;
  };
}
```

---

## Notification Types

### 1. Transactional Notifications

**Characteristics**:
- Triggered by user action or system event
- No opt-in required
- High priority
- Must be delivered

| Type | Trigger | Priority | Channels |
|------|---------|----------|----------|
| OTP | Login, Payment, Registration | URGENT | WhatsApp, SMS |
| Payment Confirmation | Payment completed | HIGH | All |
| Invoice | Order completed | NORMAL | All + PDF |
| Receipt | POS transaction | NORMAL | WhatsApp, SMS |
| Order Confirmation | Order placed | HIGH | All |
| Order Shipped | Shipment created | NORMAL | All |
| Order Delivered | Delivery confirmed | NORMAL | All |
| Refund Processed | Refund completed | HIGH | All |

### 2. Account Notifications

| Type | Trigger | Priority |
|------|---------|----------|
| Welcome | New registration | NORMAL |
| Password Reset | Reset requested | HIGH |
| Account Verified | Verification complete | NORMAL |

### 3. Marketing Notifications (Opt-in Required)

| Type | Trigger | Priority | Opt-in |
|------|---------|----------|--------|
| Promotion | Campaign scheduled | LOW | Required |
| New Product | Product launch | LOW | Required |
| Flash Sale | Sale starting | NORMAL | Required |
| Stream Starting | Live stream begins | NORMAL | Required |

### 4. Internal Notifications (Staff)

| Type | Recipient | Channel |
|------|-----------|---------|
| Attendance Reminder | Employee | WhatsApp, Push |
| Task Assigned | Employee | WhatsApp, Push |
| Approval Request | Manager | WhatsApp, Push |
| Low Stock Alert | Warehouse | WhatsApp, Email |

---

## sent.dm Integration

### Configuration

```typescript
// sent.dm Configuration
interface SentDMConfig {
  baseUrl: string;                // https://api.sent.dm/v1
  apiKey: string;
  apiSecret: string;
  senderId: string;               // Registered sender ID
  webhookSecret: string;          // For webhook verification
  webhookUrl: string;             // Callback URL
  defaultLocale: Locale;
  rateLimits: {
    perSecond: number;
    perMinute: number;
    perDay: number;
  };
}

// Environment-specific config
const config: SentDMConfig = {
  baseUrl: env.SENTDM_BASE_URL,
  apiKey: env.SENTDM_API_KEY,
  apiSecret: env.SENTDM_API_SECRET,
  senderId: 'KIDKAZZ',
  webhookSecret: env.SENTDM_WEBHOOK_SECRET,
  webhookUrl: 'https://api.kidkazz.com/api/notifications/webhooks/sentdm',
  defaultLocale: 'id-ID',
  rateLimits: {
    perSecond: 10,
    perMinute: 500,
    perDay: 50000
  }
};
```

### sent.dm Adapter

```typescript
class SentDMAdapter implements NotificationProvider {
  private client: SentDMClient;
  private rateLimiter: RateLimiter;

  constructor(private config: SentDMConfig) {
    this.client = new SentDMClient(config);
    this.rateLimiter = new RateLimiter(config.rateLimits);
  }

  // Detect best channel for recipient
  async detectChannel(phoneNumber: string): Promise<ChannelDetectionResult> {
    const response = await this.client.post('/channels/detect', {
      phone_number: this.formatPhoneNumber(phoneNumber),
      preferred_order: ['whatsapp', 'telegram', 'imessage', 'sms']
    });

    return {
      availableChannels: response.available_channels,
      recommendedChannel: response.recommended_channel,
      phoneType: response.phone_type,  // ANDROID, IOS, UNKNOWN
      hasWhatsApp: response.channels.whatsapp,
      hasTelegram: response.channels.telegram
    };
  }

  // Send notification
  async send(request: SendNotificationRequest): Promise<SendResult> {
    // Rate limiting
    await this.rateLimiter.acquire();

    // Detect channel if not specified
    let channel = request.channel;
    if (!channel && request.phoneNumber) {
      const detection = await this.detectChannel(request.phoneNumber);
      channel = detection.recommendedChannel;
    }

    // Build message based on channel
    const message = this.buildMessage(request, channel);

    // Send via sent.dm
    const response = await this.client.post('/messages/send', {
      to: request.phoneNumber || request.email,
      channel: channel.toLowerCase(),
      template_id: request.templateId,
      template_data: request.templateData,
      attachments: request.attachments?.map(a => ({
        type: a.type.toLowerCase(),
        url: a.url,
        filename: a.filename
      })),
      priority: this.mapPriority(request.priority),
      scheduled_at: request.scheduledAt?.toISOString(),
      expires_at: request.expiresAt?.toISOString(),
      metadata: {
        notification_id: request.notificationId,
        source_service: request.sourceService,
        source_reference: request.sourceReference
      }
    });

    return {
      success: response.status === 'accepted',
      messageId: response.message_id,
      channel,
      estimatedDeliveryAt: response.estimated_delivery_at
    };
  }

  // Handle delivery webhook
  async handleWebhook(payload: SentDMWebhook): Promise<void> {
    // Verify webhook signature
    if (!this.verifyWebhookSignature(payload)) {
      throw new Error('Invalid webhook signature');
    }

    const event = payload.event;
    const notificationId = payload.metadata?.notification_id;

    switch (event) {
      case 'message.sent':
        await this.updateNotificationStatus(notificationId, 'SENT', {
          sentAt: new Date(payload.timestamp)
        });
        break;

      case 'message.delivered':
        await this.updateNotificationStatus(notificationId, 'DELIVERED', {
          deliveredAt: new Date(payload.timestamp)
        });
        break;

      case 'message.read':
        await this.updateNotificationStatus(notificationId, 'READ', {
          readAt: new Date(payload.timestamp)
        });
        break;

      case 'message.failed':
        await this.updateNotificationStatus(notificationId, 'FAILED', {
          failedAt: new Date(payload.timestamp),
          failureReason: payload.error?.message
        });
        break;
    }
  }

  // Verify webhook signature
  private verifyWebhookSignature(payload: any): boolean {
    const signature = payload.headers['x-sentdm-signature'];
    const expectedSignature = createHmac('sha256', this.config.webhookSecret)
      .update(JSON.stringify(payload.body))
      .digest('hex');
    return signature === expectedSignature;
  }

  // Format phone number to international format
  private formatPhoneNumber(phone: string): string {
    // Remove any non-digit characters
    let cleaned = phone.replace(/\D/g, '');

    // Handle Indonesian numbers
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.substring(1);
    }

    // Add + prefix if not present
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }

    return cleaned;
  }
}
```

---

## Message Templates

### Template Structure

```typescript
interface MessageTemplate {
  id: string;
  name: string;
  type: NotificationType;
  locale: Locale;
  channels: MessageChannel[];     // Supported channels

  // Channel-specific content
  whatsapp?: {
    templateName: string;         // WhatsApp Business approved template
    headerType?: 'TEXT' | 'IMAGE' | 'DOCUMENT';
    headerContent?: string;
    bodyTemplate: string;
    footerTemplate?: string;
    buttons?: TemplateButton[];
  };

  telegram?: {
    bodyTemplate: string;
    parseMode: 'HTML' | 'Markdown';
    buttons?: InlineKeyboard[];
  };

  sms?: {
    bodyTemplate: string;
  };

  email?: {
    subject: string;
    bodyHtml: string;
    bodyText: string;
  };

  // Variables
  variables: TemplateVariable[];
}

interface TemplateVariable {
  name: string;
  type: 'STRING' | 'NUMBER' | 'DATE' | 'CURRENCY' | 'URL';
  required: boolean;
  example: string;
}
```

### Indonesian Templates

```typescript
// OTP Template
const OTP_TEMPLATE_ID: MessageTemplate = {
  id: 'otp_verification_id',
  name: 'OTP Verification (Indonesian)',
  type: NotificationType.OTP,
  locale: 'id-ID',
  channels: [MessageChannel.WHATSAPP, MessageChannel.SMS],

  whatsapp: {
    templateName: 'otp_verification',
    bodyTemplate: `🔐 *Kode Verifikasi Kidkazz*

Kode OTP Anda: *{{otp}}*

Berlaku selama {{expiryMinutes}} menit.

⚠️ Jangan bagikan kode ini kepada siapapun.`,
  },

  sms: {
    bodyTemplate: `[Kidkazz] Kode OTP: {{otp}}. Berlaku {{expiryMinutes}} menit. Jangan bagikan kode ini.`
  },

  variables: [
    { name: 'otp', type: 'STRING', required: true, example: '123456' },
    { name: 'expiryMinutes', type: 'NUMBER', required: true, example: '5' }
  ]
};

// Invoice Template
const INVOICE_TEMPLATE_ID: MessageTemplate = {
  id: 'invoice_id',
  name: 'Invoice (Indonesian)',
  type: NotificationType.INVOICE,
  locale: 'id-ID',
  channels: [MessageChannel.WHATSAPP, MessageChannel.EMAIL],

  whatsapp: {
    templateName: 'invoice_notification',
    headerType: 'DOCUMENT',
    bodyTemplate: `🧾 *Invoice dari Kidkazz*

Halo {{customerName}},

Berikut invoice untuk pesanan Anda:

📦 No. Pesanan: #{{orderNumber}}
📅 Tanggal: {{orderDate}}

{{#items}}
• {{name}} x{{quantity}} — {{price}}
{{/items}}

━━━━━━━━━━━━━━━━
💰 *Total: {{totalAmount}}*
💳 Pembayaran: {{paymentMethod}}

📄 Lihat invoice: {{invoiceUrl}}

Terima kasih telah berbelanja di Kidkazz! 🙏`,
    footerTemplate: 'Kidkazz - Belanja Kebutuhan Bayi & Anak',
    buttons: [
      { type: 'URL', text: 'Lihat Invoice', url: '{{invoiceUrl}}' }
    ]
  },

  email: {
    subject: 'Invoice Pesanan #{{orderNumber}} - Kidkazz',
    bodyHtml: `<!-- HTML email template -->`,
    bodyText: `Invoice untuk pesanan #{{orderNumber}}...`
  },

  variables: [
    { name: 'customerName', type: 'STRING', required: true, example: 'John Doe' },
    { name: 'orderNumber', type: 'STRING', required: true, example: 'WR-20250716-0001' },
    { name: 'orderDate', type: 'DATE', required: true, example: '16 Juli 2025' },
    { name: 'items', type: 'STRING', required: true, example: '...' },
    { name: 'totalAmount', type: 'CURRENCY', required: true, example: 'Rp 150.000' },
    { name: 'paymentMethod', type: 'STRING', required: true, example: 'QRIS' },
    { name: 'invoiceUrl', type: 'URL', required: true, example: 'https://...' }
  ]
};

// Order Shipped Template
const ORDER_SHIPPED_TEMPLATE_ID: MessageTemplate = {
  id: 'order_shipped_id',
  name: 'Order Shipped (Indonesian)',
  type: NotificationType.ORDER_SHIPPED,
  locale: 'id-ID',
  channels: [MessageChannel.WHATSAPP, MessageChannel.SMS],

  whatsapp: {
    templateName: 'order_shipped',
    bodyTemplate: `🚚 *Pesanan Dikirim!*

Halo {{customerName}},

Pesanan #{{orderNumber}} sudah dikirim!

📦 Kurir: {{carrierName}}
🔢 No. Resi: {{trackingNumber}}

📍 Lacak pesanan: {{trackingUrl}}

Estimasi tiba: {{estimatedDelivery}}`,
    buttons: [
      { type: 'URL', text: 'Lacak Pesanan', url: '{{trackingUrl}}' }
    ]
  },

  sms: {
    bodyTemplate: `[Kidkazz] Pesanan #{{orderNumber}} dikirim via {{carrierName}}. Resi: {{trackingNumber}}. Lacak: {{trackingUrl}}`
  },

  variables: [
    { name: 'customerName', type: 'STRING', required: true, example: 'John' },
    { name: 'orderNumber', type: 'STRING', required: true, example: 'WR-20250716-0001' },
    { name: 'carrierName', type: 'STRING', required: true, example: 'J&T Express' },
    { name: 'trackingNumber', type: 'STRING', required: true, example: 'JT1234567890' },
    { name: 'trackingUrl', type: 'URL', required: true, example: 'https://...' },
    { name: 'estimatedDelivery', type: 'DATE', required: false, example: '18 Juli 2025' }
  ]
};

// Payment Confirmation Template
const PAYMENT_CONFIRMATION_TEMPLATE_ID: MessageTemplate = {
  id: 'payment_confirmation_id',
  name: 'Payment Confirmation (Indonesian)',
  type: NotificationType.PAYMENT_CONFIRMATION,
  locale: 'id-ID',
  channels: [MessageChannel.WHATSAPP, MessageChannel.SMS],

  whatsapp: {
    templateName: 'payment_received',
    bodyTemplate: `✅ *Pembayaran Diterima*

Halo {{customerName}},

Pembayaran untuk pesanan #{{orderNumber}} telah kami terima.

💰 Jumlah: {{amount}}
💳 Metode: {{paymentMethod}}
🔢 ID Transaksi: {{transactionId}}

📄 Struk: {{receiptUrl}}

Pesanan Anda sedang diproses! 📦`,
    buttons: [
      { type: 'URL', text: 'Lihat Struk', url: '{{receiptUrl}}' }
    ]
  },

  sms: {
    bodyTemplate: `[Kidkazz] Pembayaran {{amount}} untuk #{{orderNumber}} diterima. ID: {{transactionId}}`
  },

  variables: [
    { name: 'customerName', type: 'STRING', required: true, example: 'John' },
    { name: 'orderNumber', type: 'STRING', required: true, example: 'WR-20250716-0001' },
    { name: 'amount', type: 'CURRENCY', required: true, example: 'Rp 150.000' },
    { name: 'paymentMethod', type: 'STRING', required: true, example: 'GoPay' },
    { name: 'transactionId', type: 'STRING', required: true, example: 'TXN123456' },
    { name: 'receiptUrl', type: 'URL', required: true, example: 'https://...' }
  ]
};

// Live Stream Starting Template
const STREAM_STARTING_TEMPLATE_ID: MessageTemplate = {
  id: 'stream_starting_id',
  name: 'Live Stream Starting (Indonesian)',
  type: NotificationType.STREAM_STARTING,
  locale: 'id-ID',
  channels: [MessageChannel.WHATSAPP, MessageChannel.PUSH],

  whatsapp: {
    templateName: 'live_stream_alert',
    headerType: 'IMAGE',
    bodyTemplate: `🔴 *LIVE SEKARANG!*

{{hostName}} sedang live di Kidkazz!

📺 {{streamTitle}}

🛍️ Produk yang akan ditampilkan:
{{#products}}
• {{name}} — {{price}}
{{/products}}

⏰ Jangan sampai ketinggalan!

👉 Tonton sekarang: {{streamUrl}}`,
    buttons: [
      { type: 'URL', text: 'Tonton Live', url: '{{streamUrl}}' }
    ]
  },

  variables: [
    { name: 'hostName', type: 'STRING', required: true, example: 'Admin Kidkazz' },
    { name: 'streamTitle', type: 'STRING', required: true, example: 'Flash Sale Perlengkapan Bayi!' },
    { name: 'products', type: 'STRING', required: false, example: '...' },
    { name: 'streamUrl', type: 'URL', required: true, example: 'https://...' }
  ]
};
```

### English Templates

```typescript
// OTP Template (English)
const OTP_TEMPLATE_EN: MessageTemplate = {
  id: 'otp_verification_en',
  name: 'OTP Verification (English)',
  type: NotificationType.OTP,
  locale: 'en-US',
  channels: [MessageChannel.WHATSAPP, MessageChannel.SMS],

  whatsapp: {
    templateName: 'otp_verification_en',
    bodyTemplate: `🔐 *Kidkazz Verification Code*

Your OTP code is: *{{otp}}*

Valid for {{expiryMinutes}} minutes.

⚠️ Do not share this code with anyone.`,
  },

  sms: {
    bodyTemplate: `[Kidkazz] Your OTP: {{otp}}. Valid for {{expiryMinutes}} min. Do not share this code.`
  },

  variables: [
    { name: 'otp', type: 'STRING', required: true, example: '123456' },
    { name: 'expiryMinutes', type: 'NUMBER', required: true, example: '5' }
  ]
};
```

---

## Database Schema

```sql
-- Notifications
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  notification_number TEXT NOT NULL UNIQUE,

  -- Recipient
  recipient_id TEXT,
  recipient_type TEXT NOT NULL,
  recipient_phone TEXT,
  recipient_email TEXT,

  -- Message
  type TEXT NOT NULL,
  template_id TEXT NOT NULL,
  template_data TEXT,             -- JSON
  channel TEXT NOT NULL,
  channel_detected INTEGER DEFAULT 0,

  -- Content
  subject TEXT,
  body TEXT NOT NULL,
  attachments TEXT,               -- JSON array

  -- Delivery
  status TEXT NOT NULL DEFAULT 'PENDING',
  sent_at TEXT,
  delivered_at TEXT,
  read_at TEXT,
  failed_at TEXT,
  failure_reason TEXT,

  -- Provider
  provider_message_id TEXT,
  provider_response TEXT,         -- JSON

  -- Metadata
  source_service TEXT NOT NULL,
  source_reference TEXT,
  locale TEXT NOT NULL DEFAULT 'id-ID',
  priority TEXT NOT NULL DEFAULT 'NORMAL',

  -- Scheduling
  scheduled_at TEXT,
  expires_at TEXT,

  -- Audit
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Notification Templates
CREATE TABLE notification_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  locale TEXT NOT NULL,
  channels TEXT NOT NULL,         -- JSON array

  -- Channel-specific content
  whatsapp_config TEXT,           -- JSON
  telegram_config TEXT,           -- JSON
  sms_config TEXT,                -- JSON
  email_config TEXT,              -- JSON

  -- Variables
  variables TEXT NOT NULL,        -- JSON array

  -- Status
  is_active INTEGER DEFAULT 1,

  -- Audit
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Notification Preferences (per customer)
CREATE TABLE notification_preferences (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL UNIQUE,

  -- Channel Preferences
  preferred_channel TEXT DEFAULT 'AUTO',
  whatsapp_enabled INTEGER DEFAULT 1,
  telegram_enabled INTEGER DEFAULT 1,
  sms_enabled INTEGER DEFAULT 1,
  email_enabled INTEGER DEFAULT 1,
  push_enabled INTEGER DEFAULT 1,

  -- Type Preferences (opt-in for marketing)
  transactional_enabled INTEGER DEFAULT 1,
  marketing_enabled INTEGER DEFAULT 0,
  promotions_enabled INTEGER DEFAULT 0,
  live_stream_alerts INTEGER DEFAULT 0,

  -- Quiet Hours
  quiet_hours_enabled INTEGER DEFAULT 0,
  quiet_hours_start TEXT,         -- HH:MM
  quiet_hours_end TEXT,           -- HH:MM

  -- Audit
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- sent.dm Webhooks (audit log)
CREATE TABLE sentdm_webhooks (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  message_id TEXT,
  notification_id TEXT,
  payload TEXT NOT NULL,          -- JSON
  processed INTEGER DEFAULT 0,
  processed_at TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_source ON notifications(source_service, source_reference);
CREATE INDEX idx_notifications_scheduled ON notifications(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX idx_preferences_customer ON notification_preferences(customer_id);
CREATE INDEX idx_webhooks_message ON sentdm_webhooks(message_id);
```

---

## API Architecture

### RESTful Endpoints

```typescript
// Send Notification
POST   /api/notifications                  // Send notification
GET    /api/notifications                  // List notifications
GET    /api/notifications/:id              // Get notification details

// Templates
GET    /api/notifications/templates        // List templates
GET    /api/notifications/templates/:id    // Get template

// Preferences
GET    /api/notifications/preferences/:customerId  // Get preferences
PUT    /api/notifications/preferences/:customerId  // Update preferences

// Channel Detection
POST   /api/notifications/detect-channel   // Detect best channel

// Webhooks
POST   /api/notifications/webhooks/sentdm  // sent.dm webhook

// Batch Operations
POST   /api/notifications/batch            // Send batch notifications
```

### Request/Response Examples

```typescript
// Send Invoice Notification
POST /api/notifications
{
  "type": "INVOICE",
  "recipientId": "cust-123",
  "recipientPhone": "+6281234567890",
  "templateData": {
    "customerName": "John Doe",
    "orderNumber": "WR-20250716-0001",
    "orderDate": "16 Juli 2025",
    "items": [
      { "name": "Baby Bottle", "quantity": 2, "price": "Rp 75.000" }
    ],
    "totalAmount": "Rp 150.000",
    "paymentMethod": "GoPay",
    "invoiceUrl": "https://kidkazz.com/invoice/abc123"
  },
  "attachments": [
    {
      "type": "DOCUMENT",
      "url": "https://kidkazz.com/invoice/abc123.pdf",
      "filename": "Invoice-WR-20250716-0001.pdf"
    }
  ],
  "sourceService": "PAYMENT",
  "sourceReference": "pay-456",
  "priority": "NORMAL"
}

// Response
{
  "id": "notif-789",
  "notificationNumber": "NOTIF-20250716-0001",
  "status": "QUEUED",
  "channel": "WHATSAPP",
  "channelDetected": true,
  "estimatedDeliveryAt": "2025-07-16T10:30:00Z"
}
```

---

## Service Integration

### Integration with Other Services

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     NOTIFICATION SERVICE INTEGRATION                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐  │
│  │   Sales     │     │  Payment    │     │  Business   │     │  Inventory  │  │
│  │  Service    │     │  Service    │     │  Partner    │     │  Service    │  │
│  └──────┬──────┘     └──────┬──────┘     └──────┬──────┘     └──────┬──────┘  │
│         │                   │                   │                   │          │
│         │ Order Events      │ Payment Events    │ Auth Events       │ Stock    │
│         │                   │                   │                   │ Alerts   │
│         ▼                   ▼                   ▼                   ▼          │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                      NOTIFICATION SERVICE                                │  │
│  │                                                                          │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │  │
│  │  │   Template   │  │   Channel    │  │   Delivery   │                  │  │
│  │  │   Engine     │  │   Detector   │  │   Manager    │                  │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                  │  │
│  │                                                                          │  │
│  └──────────────────────────────────┬───────────────────────────────────────┘  │
│                                     │                                          │
│                                     ▼                                          │
│                            ┌──────────────┐                                   │
│                            │   sent.dm    │                                   │
│                            │   Provider   │                                   │
│                            └──────────────┘                                   │
│                                     │                                          │
│           ┌─────────────────────────┼─────────────────────────┐               │
│           ▼                         ▼                         ▼               │
│    ┌──────────┐              ┌──────────┐              ┌──────────┐          │
│    │ WhatsApp │              │ Telegram │              │   SMS    │          │
│    └──────────┘              └──────────┘              └──────────┘          │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

### Event Subscriptions

```typescript
// Notification Service subscribes to domain events from other services

// Sales Service Events
EventBus.subscribe('SalesOrderConfirmed', async (event) => {
  await notificationService.send({
    type: NotificationType.ORDER_CONFIRMATION,
    recipientId: event.customerId,
    templateData: {
      customerName: event.customerName,
      orderNumber: event.orderNumber,
      items: event.items,
      totalAmount: formatCurrency(event.totalAmount)
    },
    sourceService: 'SALES',
    sourceReference: event.orderId
  });
});

EventBus.subscribe('SalesOrderShipped', async (event) => {
  await notificationService.send({
    type: NotificationType.ORDER_SHIPPED,
    recipientId: event.customerId,
    templateData: {
      customerName: event.customerName,
      orderNumber: event.orderNumber,
      carrierName: event.carrierName,
      trackingNumber: event.trackingNumber,
      trackingUrl: event.trackingUrl
    },
    sourceService: 'SALES',
    sourceReference: event.orderId
  });
});

// Payment Service Events
EventBus.subscribe('PaymentCompleted', async (event) => {
  await notificationService.send({
    type: NotificationType.PAYMENT_CONFIRMATION,
    recipientId: event.customerId,
    templateData: {
      customerName: event.customerName,
      orderNumber: event.orderNumber,
      amount: formatCurrency(event.amount),
      paymentMethod: event.paymentMethod,
      transactionId: event.transactionId,
      receiptUrl: event.receiptUrl
    },
    sourceService: 'PAYMENT',
    sourceReference: event.paymentId
  });

  // Also send invoice
  await notificationService.send({
    type: NotificationType.INVOICE,
    recipientId: event.customerId,
    templateData: { ... },
    attachments: [{
      type: 'DOCUMENT',
      url: event.invoicePdfUrl,
      filename: `Invoice-${event.orderNumber}.pdf`
    }],
    sourceService: 'PAYMENT',
    sourceReference: event.paymentId
  });
});

// Business Partner Service Events
EventBus.subscribe('OTPRequested', async (event) => {
  await notificationService.send({
    type: NotificationType.OTP,
    recipientPhone: event.phoneNumber,
    templateData: {
      otp: event.otp,
      expiryMinutes: event.expiryMinutes
    },
    priority: NotificationPriority.URGENT,
    expiresAt: new Date(Date.now() + event.expiryMinutes * 60 * 1000),
    sourceService: 'AUTH',
    sourceReference: event.requestId
  });
});

// Inventory Service Events
EventBus.subscribe('LowStockAlert', async (event) => {
  await notificationService.send({
    type: NotificationType.LOW_STOCK_ALERT,
    recipientId: event.warehouseManagerId,
    recipientType: RecipientType.EMPLOYEE,
    templateData: {
      productName: event.productName,
      currentStock: event.currentStock,
      minimumStock: event.minimumStock,
      warehouseName: event.warehouseName
    },
    sourceService: 'INVENTORY',
    sourceReference: event.productId
  });
});
```

---

## Related Documents

- [Notification Service Business Rules](./BUSINESS_RULES.md)
- [Payment Service Integration](../payment/PAYMENT_SERVICE_ARCHITECTURE.md)
- [Sales Service Integration](../sales/SALES_SERVICE_ARCHITECTURE.md)
- [Business Partner Service](../business-partner/BUSINESS_PARTNER_SERVICE_ARCHITECTURE.md)
