import { DomainEvent, type DomainEventProps } from './domain-event';

/**
 * Payload for JournalEntryPosted event
 */
export interface JournalEntryPostedPayload {
  entryId: string;
  entryNumber: string;
  entryDate: string;
  description: string;
  totalAmount: number;
  fiscalYear: number;
  fiscalMonth: number;
  accounts: Array<{
    accountId: string;
    accountCode: string;
    accountName: string;
    direction: 'Debit' | 'Credit';
    amount: number;
  }>;
  postedBy: string;
  postedAt: string;
}

/**
 * Event emitted when a journal entry is posted
 */
export class JournalEntryPosted extends DomainEvent<JournalEntryPostedPayload> {
  private readonly _payload: JournalEntryPostedPayload;

  private constructor(props: DomainEventProps, payload: JournalEntryPostedPayload) {
    super(props);
    this._payload = payload;
  }

  get eventType(): string {
    return 'JournalEntryPosted';
  }

  get payload(): JournalEntryPostedPayload {
    return this._payload;
  }

  static create(payload: JournalEntryPostedPayload): JournalEntryPosted {
    return new JournalEntryPosted(
      {
        aggregateId: payload.entryId,
        aggregateType: 'JournalEntry',
      },
      payload
    );
  }

  static fromPersistence(
    props: DomainEventProps,
    payload: JournalEntryPostedPayload
  ): JournalEntryPosted {
    return new JournalEntryPosted(props, payload);
  }
}

/**
 * Payload for JournalEntryVoided event
 */
export interface JournalEntryVoidedPayload {
  entryId: string;
  entryNumber: string;
  voidedBy: string;
  voidedAt: string;
  voidReason: string;
  originalAmount: number;
  fiscalYear: number;
  fiscalMonth: number;
}

/**
 * Event emitted when a journal entry is voided
 */
export class JournalEntryVoided extends DomainEvent<JournalEntryVoidedPayload> {
  private readonly _payload: JournalEntryVoidedPayload;

  private constructor(props: DomainEventProps, payload: JournalEntryVoidedPayload) {
    super(props);
    this._payload = payload;
  }

  get eventType(): string {
    return 'JournalEntryVoided';
  }

  get payload(): JournalEntryVoidedPayload {
    return this._payload;
  }

  static create(payload: JournalEntryVoidedPayload): JournalEntryVoided {
    return new JournalEntryVoided(
      {
        aggregateId: payload.entryId,
        aggregateType: 'JournalEntry',
      },
      payload
    );
  }

  static fromPersistence(
    props: DomainEventProps,
    payload: JournalEntryVoidedPayload
  ): JournalEntryVoided {
    return new JournalEntryVoided(props, payload);
  }
}

/**
 * Payload for AccountBalanceUpdated event
 */
export interface AccountBalanceUpdatedPayload {
  accountId: string;
  accountCode: string;
  accountName: string;
  fiscalYear: number;
  fiscalMonth: number;
  previousBalance: number;
  newBalance: number;
  changeAmount: number;
  updatedAt: string;
}

/**
 * Event emitted when an account balance is recalculated
 */
export class AccountBalanceUpdated extends DomainEvent<AccountBalanceUpdatedPayload> {
  private readonly _payload: AccountBalanceUpdatedPayload;

  private constructor(props: DomainEventProps, payload: AccountBalanceUpdatedPayload) {
    super(props);
    this._payload = payload;
  }

  get eventType(): string {
    return 'AccountBalanceUpdated';
  }

  get payload(): AccountBalanceUpdatedPayload {
    return this._payload;
  }

  static create(payload: AccountBalanceUpdatedPayload): AccountBalanceUpdated {
    return new AccountBalanceUpdated(
      {
        aggregateId: payload.accountId,
        aggregateType: 'AccountBalance',
      },
      payload
    );
  }

  static fromPersistence(
    props: DomainEventProps,
    payload: AccountBalanceUpdatedPayload
  ): AccountBalanceUpdated {
    return new AccountBalanceUpdated(props, payload);
  }
}
