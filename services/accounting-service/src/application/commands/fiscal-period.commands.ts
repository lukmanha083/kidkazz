import { FiscalPeriodEntity } from '@/domain/entities/fiscal-period.entity';
import type { IFiscalPeriodRepository } from '@/domain/repositories/fiscal-period.repository';
import type { FiscalPeriodStatus } from '@/domain/value-objects';

// ============================================================================
// Create Fiscal Period Command
// ============================================================================

export interface CreateFiscalPeriodCommand {
  fiscalYear: number;
  fiscalMonth: number;
}

export interface CreateFiscalPeriodResult {
  id: string;
  fiscalYear: number;
  fiscalMonth: number;
  status: FiscalPeriodStatus;
  createdAt: Date;
}

export class CreateFiscalPeriodHandler {
  constructor(private readonly repository: IFiscalPeriodRepository) {}

  async execute(command: CreateFiscalPeriodCommand): Promise<CreateFiscalPeriodResult> {
    // Check if period already exists
    const exists = await this.repository.periodExists(command.fiscalYear, command.fiscalMonth);
    if (exists) {
      const periodStr = `${command.fiscalYear}-${String(command.fiscalMonth).padStart(2, '0')}`;
      throw new Error(`Fiscal period ${periodStr} already exists`);
    }

    // Create the fiscal period (validation happens in entity)
    const period = FiscalPeriodEntity.create({
      fiscalYear: command.fiscalYear,
      fiscalMonth: command.fiscalMonth,
    });

    await this.repository.save(period);

    return {
      id: period.id,
      fiscalYear: period.fiscalYear,
      fiscalMonth: period.fiscalMonth,
      status: period.status,
      createdAt: period.createdAt,
    };
  }
}

// ============================================================================
// Close Fiscal Period Command
// ============================================================================

export interface CloseFiscalPeriodCommand {
  periodId: string;
  closedBy: string;
}

export interface CloseFiscalPeriodResult {
  id: string;
  fiscalYear: number;
  fiscalMonth: number;
  status: FiscalPeriodStatus;
  closedAt?: Date;
  closedBy?: string;
}

export class CloseFiscalPeriodHandler {
  constructor(private readonly repository: IFiscalPeriodRepository) {}

  async execute(command: CloseFiscalPeriodCommand): Promise<CloseFiscalPeriodResult> {
    // Find the period
    const period = await this.repository.findById(command.periodId);
    if (!period) {
      throw new Error('Fiscal period not found');
    }

    // Rule 14: Check if previous period is closed (sequential closing)
    const previousPeriod = await this.repository.findPrevious(
      period.fiscalYear,
      period.fiscalMonth
    );

    if (previousPeriod && previousPeriod.isOpen) {
      const prevPeriodStr = `${previousPeriod.fiscalYear}-${String(previousPeriod.fiscalMonth).padStart(2, '0')}`;
      throw new Error(
        `Cannot close period: previous period (${prevPeriodStr}) must be closed first`
      );
    }

    // Close the period (validation happens in entity)
    period.close(command.closedBy);

    await this.repository.save(period);

    return {
      id: period.id,
      fiscalYear: period.fiscalYear,
      fiscalMonth: period.fiscalMonth,
      status: period.status,
      closedAt: period.closedAt,
      closedBy: period.closedBy,
    };
  }
}

// ============================================================================
// Reopen Fiscal Period Command
// ============================================================================

export interface ReopenFiscalPeriodCommand {
  periodId: string;
  reopenedBy: string;
  reason: string;
}

export interface ReopenFiscalPeriodResult {
  id: string;
  fiscalYear: number;
  fiscalMonth: number;
  status: FiscalPeriodStatus;
  reopenedAt?: Date;
  reopenedBy?: string;
  reopenReason?: string;
}

export class ReopenFiscalPeriodHandler {
  constructor(private readonly repository: IFiscalPeriodRepository) {}

  async execute(command: ReopenFiscalPeriodCommand): Promise<ReopenFiscalPeriodResult> {
    // Find the period
    const period = await this.repository.findById(command.periodId);
    if (!period) {
      throw new Error('Fiscal period not found');
    }

    // Reopen the period (validation happens in entity - Rule 15)
    period.reopen(command.reopenedBy, command.reason);

    await this.repository.save(period);

    return {
      id: period.id,
      fiscalYear: period.fiscalYear,
      fiscalMonth: period.fiscalMonth,
      status: period.status,
      reopenedAt: period.reopenedAt,
      reopenedBy: period.reopenedBy,
      reopenReason: period.reopenReason,
    };
  }
}

// ============================================================================
// Lock Fiscal Period Command
// ============================================================================

export interface LockFiscalPeriodCommand {
  periodId: string;
  lockedBy: string;
}

export interface LockFiscalPeriodResult {
  id: string;
  fiscalYear: number;
  fiscalMonth: number;
  status: FiscalPeriodStatus;
}

export class LockFiscalPeriodHandler {
  constructor(private readonly repository: IFiscalPeriodRepository) {}

  async execute(command: LockFiscalPeriodCommand): Promise<LockFiscalPeriodResult> {
    // Find the period
    const period = await this.repository.findById(command.periodId);
    if (!period) {
      throw new Error('Fiscal period not found');
    }

    // Lock the period (validation happens in entity)
    period.lock(command.lockedBy);

    await this.repository.save(period);

    return {
      id: period.id,
      fiscalYear: period.fiscalYear,
      fiscalMonth: period.fiscalMonth,
      status: period.status,
    };
  }
}
