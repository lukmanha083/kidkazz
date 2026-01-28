import { FiscalPeriodEntity } from '@/domain/entities/fiscal-period.entity';
import { FiscalPeriod, FiscalPeriodStatus } from '@/domain/value-objects';

/**
 * Filter options for querying fiscal periods
 */
export interface FiscalPeriodFilter {
  status?: FiscalPeriodStatus;
  fiscalYear?: number;
  fromPeriod?: FiscalPeriod;
  toPeriod?: FiscalPeriod;
}

/**
 * Repository interface for FiscalPeriodEntity
 */
export interface IFiscalPeriodRepository {
  /**
   * Find a fiscal period by its ID
   */
  findById(id: string): Promise<FiscalPeriodEntity | null>;

  /**
   * Find a fiscal period by year and month
   */
  findByPeriod(year: number, month: number): Promise<FiscalPeriodEntity | null>;

  /**
   * Find the fiscal period that contains a specific date
   */
  findByDate(date: Date): Promise<FiscalPeriodEntity | null>;

  /**
   * Find all fiscal periods matching the filter
   */
  findAll(filter?: FiscalPeriodFilter): Promise<FiscalPeriodEntity[]>;

  /**
   * Find the previous fiscal period (chronologically)
   */
  findPrevious(year: number, month: number): Promise<FiscalPeriodEntity | null>;

  /**
   * Find all open fiscal periods
   */
  findOpen(): Promise<FiscalPeriodEntity[]>;

  /**
   * Find the current open fiscal period (most recent open period)
   */
  findCurrentOpen(): Promise<FiscalPeriodEntity | null>;

  /**
   * Save a fiscal period (insert or update)
   */
  save(period: FiscalPeriodEntity): Promise<void>;

  /**
   * Delete a fiscal period by ID
   * Note: Should only be allowed for periods with no journal entries
   */
  delete(id: string): Promise<void>;

  /**
   * Check if a period with the given year/month already exists
   */
  periodExists(year: number, month: number): Promise<boolean>;
}
