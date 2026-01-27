import { FiscalPeriodEntity } from '@/domain/entities/fiscal-period.entity';
import { FiscalPeriodStatus } from '@/domain/value-objects';
import type {
  IFiscalPeriodRepository,
  FiscalPeriodFilter,
} from '@/domain/repositories/fiscal-period.repository';

// ============================================================================
// Fiscal Period Response DTO
// ============================================================================

export interface FiscalPeriodResponse {
  id: string;
  fiscalYear: number;
  fiscalMonth: number;
  periodString: string;
  displayString: string;
  status: FiscalPeriodStatus;
  isOpen: boolean;
  isClosed: boolean;
  isLocked: boolean;
  closedAt?: Date;
  closedBy?: string;
  reopenedAt?: Date;
  reopenedBy?: string;
  reopenReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

function toResponse(entity: FiscalPeriodEntity): FiscalPeriodResponse {
  return {
    id: entity.id,
    fiscalYear: entity.fiscalYear,
    fiscalMonth: entity.fiscalMonth,
    periodString: entity.period.toString(),
    displayString: entity.period.toDisplayString(),
    status: entity.status,
    isOpen: entity.isOpen,
    isClosed: entity.isClosed,
    isLocked: entity.isLocked,
    closedAt: entity.closedAt,
    closedBy: entity.closedBy,
    reopenedAt: entity.reopenedAt,
    reopenedBy: entity.reopenedBy,
    reopenReason: entity.reopenReason,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

// ============================================================================
// Get Fiscal Period by ID Query
// ============================================================================

export interface GetFiscalPeriodByIdQuery {
  id: string;
}

export class GetFiscalPeriodByIdHandler {
  constructor(private readonly repository: IFiscalPeriodRepository) {}

  async execute(query: GetFiscalPeriodByIdQuery): Promise<FiscalPeriodResponse | null> {
    const period = await this.repository.findById(query.id);
    if (!period) {
      return null;
    }
    return toResponse(period);
  }
}

// ============================================================================
// Get Fiscal Period by Year/Month Query
// ============================================================================

export interface GetFiscalPeriodByPeriodQuery {
  fiscalYear: number;
  fiscalMonth: number;
}

export class GetFiscalPeriodByPeriodHandler {
  constructor(private readonly repository: IFiscalPeriodRepository) {}

  async execute(query: GetFiscalPeriodByPeriodQuery): Promise<FiscalPeriodResponse | null> {
    const period = await this.repository.findByPeriod(query.fiscalYear, query.fiscalMonth);
    if (!period) {
      return null;
    }
    return toResponse(period);
  }
}

// ============================================================================
// List Fiscal Periods Query
// ============================================================================

export interface ListFiscalPeriodsQuery {
  status?: FiscalPeriodStatus;
  fiscalYear?: number;
}

export class ListFiscalPeriodsHandler {
  constructor(private readonly repository: IFiscalPeriodRepository) {}

  async execute(query: ListFiscalPeriodsQuery): Promise<FiscalPeriodResponse[]> {
    const filter: FiscalPeriodFilter = {};

    if (query.status) {
      filter.status = query.status;
    }
    if (query.fiscalYear) {
      filter.fiscalYear = query.fiscalYear;
    }

    const periods = await this.repository.findAll(filter);
    return periods.map(toResponse);
  }
}

// ============================================================================
// Get Current Fiscal Period Query
// ============================================================================

export class GetCurrentFiscalPeriodHandler {
  constructor(private readonly repository: IFiscalPeriodRepository) {}

  async execute(): Promise<FiscalPeriodResponse | null> {
    const period = await this.repository.findCurrentOpen();
    if (!period) {
      return null;
    }
    return toResponse(period);
  }
}
