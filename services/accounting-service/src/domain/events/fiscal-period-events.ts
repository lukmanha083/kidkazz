import { DomainEvent, type DomainEventProps } from './domain-event';

/**
 * Payload for FiscalPeriodClosed event
 */
export interface FiscalPeriodClosedPayload {
  periodId: string;
  fiscalYear: number;
  fiscalMonth: number;
  closedBy: string;
  closedAt: string;
  finalBalances: Array<{
    accountId: string;
    accountCode: string;
    closingBalance: number;
  }>;
}

/**
 * Event emitted when a fiscal period is closed
 */
export class FiscalPeriodClosed extends DomainEvent<FiscalPeriodClosedPayload> {
  private readonly _payload: FiscalPeriodClosedPayload;

  private constructor(props: DomainEventProps, payload: FiscalPeriodClosedPayload) {
    super(props);
    this._payload = payload;
  }

  get eventType(): string {
    return 'FiscalPeriodClosed';
  }

  get payload(): FiscalPeriodClosedPayload {
    return this._payload;
  }

  static create(payload: FiscalPeriodClosedPayload): FiscalPeriodClosed {
    return new FiscalPeriodClosed(
      {
        aggregateId: payload.periodId,
        aggregateType: 'FiscalPeriod',
      },
      payload
    );
  }

  static fromPersistence(
    props: DomainEventProps,
    payload: FiscalPeriodClosedPayload
  ): FiscalPeriodClosed {
    return new FiscalPeriodClosed(props, payload);
  }
}

/**
 * Payload for FiscalPeriodReopened event
 */
export interface FiscalPeriodReopenedPayload {
  periodId: string;
  fiscalYear: number;
  fiscalMonth: number;
  reopenedBy: string;
  reopenedAt: string;
  reopenReason: string;
}

/**
 * Event emitted when a fiscal period is reopened
 */
export class FiscalPeriodReopened extends DomainEvent<FiscalPeriodReopenedPayload> {
  private readonly _payload: FiscalPeriodReopenedPayload;

  private constructor(props: DomainEventProps, payload: FiscalPeriodReopenedPayload) {
    super(props);
    this._payload = payload;
  }

  get eventType(): string {
    return 'FiscalPeriodReopened';
  }

  get payload(): FiscalPeriodReopenedPayload {
    return this._payload;
  }

  static create(payload: FiscalPeriodReopenedPayload): FiscalPeriodReopened {
    return new FiscalPeriodReopened(
      {
        aggregateId: payload.periodId,
        aggregateType: 'FiscalPeriod',
      },
      payload
    );
  }

  static fromPersistence(
    props: DomainEventProps,
    payload: FiscalPeriodReopenedPayload
  ): FiscalPeriodReopened {
    return new FiscalPeriodReopened(props, payload);
  }
}
