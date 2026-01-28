import { TaxSummary, type TaxType, TAX_RATES } from '@/domain/entities/tax-summary.entity';
import { JournalEntryStatus, type JournalLine } from '@/domain/entities/journal-entry.entity';
import type { ITaxSummaryRepository } from '@/domain/repositories/audit.repository';
import type { IJournalEntryRepository } from '@/domain/repositories/journal-entry.repository';
import type { IAccountRepository } from '@/domain/repositories/account.repository';
import { FiscalPeriod } from '@/domain/value-objects';

/**
 * Tax calculation result
 */
export interface TaxCalculationResult {
  taxType: TaxType;
  grossAmount: number;
  taxAmount: number;
  netAmount: number;
  transactionCount: number;
  effectiveRate: number;
}

/**
 * Period tax report
 */
export interface PeriodTaxReport {
  fiscalYear: number;
  fiscalMonth: number;
  summaries: TaxSummary[];
  totalGross: number;
  totalTax: number;
  totalNet: number;
  totalTransactions: number;
}

/**
 * TaxSummaryService
 * Domain service for Indonesian tax calculations and reporting
 */
export class TaxSummaryService {
  // Indonesian tax account codes (standard COA)
  private static readonly TAX_ACCOUNT_CODES: Record<TaxType, string[]> = {
    PPN: ['2111'], // PPN Keluaran (Output VAT Payable)
    PPH21: ['2112'], // PPH 21 Payable
    PPH23: ['2113'], // PPH 23 Payable
    PPH4_2: ['2114'], // PPH 4(2) Payable
  };

  constructor(
    private readonly taxSummaryRepository: ITaxSummaryRepository,
    private readonly journalEntryRepository: IJournalEntryRepository,
    private readonly accountRepository: IAccountRepository
  ) {}

  /**
   * Calculate and save tax summary for a period
   */
  async calculatePeriodTaxSummary(
    fiscalYear: number,
    fiscalMonth: number
  ): Promise<TaxSummary[]> {
    const summaries: TaxSummary[] = [];

    for (const taxType of Object.keys(TAX_RATES) as TaxType[]) {
      const calculation = await this.calculateTaxForType(fiscalYear, fiscalMonth, taxType);

      // Check if summary already exists
      let summary = await this.taxSummaryRepository.findByPeriodAndType(
        fiscalYear,
        fiscalMonth,
        taxType
      );

      if (summary) {
        // Update existing summary
        summary.recalculate(
          calculation.grossAmount,
          calculation.taxAmount,
          calculation.transactionCount
        );
      } else {
        // Create new summary
        summary = TaxSummary.create({
          fiscalYear,
          fiscalMonth,
          taxType,
          grossAmount: calculation.grossAmount,
          taxAmount: calculation.taxAmount,
          transactionCount: calculation.transactionCount,
        });
      }

      await this.taxSummaryRepository.save(summary);
      summaries.push(summary);
    }

    return summaries;
  }

  /**
   * Calculate tax for a specific type
   */
  private async calculateTaxForType(
    fiscalYear: number,
    fiscalMonth: number,
    taxType: TaxType
  ): Promise<TaxCalculationResult> {
    const accountCodes = TaxSummaryService.TAX_ACCOUNT_CODES[taxType];
    let grossAmount = 0;
    let taxAmount = 0;
    let transactionCount = 0;

    // Get tax accounts
    for (const code of accountCodes) {
      const account = await this.accountRepository.findByCode(code);
      if (!account) continue;

      // Get journal entries affecting this account in the period
      const fiscalPeriod = FiscalPeriod.create(fiscalYear, fiscalMonth);
      const entries = await this.journalEntryRepository.findByFiscalPeriod(fiscalPeriod, JournalEntryStatus.POSTED);

      for (const entry of entries) {
        // Find lines affecting this tax account
        const taxLines = entry.lines.filter((line: JournalLine) => line.accountId === account.id);
        if (taxLines.length === 0) continue;

        transactionCount++;

        for (const line of taxLines) {
          // Tax payable is typically a credit
          if (line.direction === 'Credit') {
            taxAmount += line.amount;
            // Calculate gross based on standard rate
            const rate = TAX_RATES[taxType];
            if (rate > 0) {
              grossAmount += line.amount / rate;
            }
          }
        }
      }
    }

    const netAmount = grossAmount - taxAmount;
    const effectiveRate = grossAmount > 0 ? taxAmount / grossAmount : 0;

    return {
      taxType,
      grossAmount,
      taxAmount,
      netAmount,
      transactionCount,
      effectiveRate,
    };
  }

  /**
   * Get tax report for a period
   */
  async getPeriodTaxReport(fiscalYear: number, fiscalMonth: number): Promise<PeriodTaxReport> {
    const summaries = await this.taxSummaryRepository.findByPeriod(fiscalYear, fiscalMonth);

    let totalGross = 0;
    let totalTax = 0;
    let totalNet = 0;
    let totalTransactions = 0;

    for (const summary of summaries) {
      totalGross += summary.grossAmount;
      totalTax += summary.taxAmount;
      totalNet += summary.netAmount;
      totalTransactions += summary.transactionCount;
    }

    return {
      fiscalYear,
      fiscalMonth,
      summaries,
      totalGross,
      totalTax,
      totalNet,
      totalTransactions,
    };
  }

  /**
   * Get annual tax report
   */
  async getAnnualTaxReport(fiscalYear: number): Promise<PeriodTaxReport[]> {
    const reports: PeriodTaxReport[] = [];

    for (let month = 1; month <= 12; month++) {
      const report = await this.getPeriodTaxReport(fiscalYear, month);
      if (report.summaries.length > 0) {
        reports.push(report);
      }
    }

    return reports;
  }

  /**
   * Calculate PPN (VAT) for a transaction
   */
  static calculatePPN(grossAmount: number): { taxAmount: number; netAmount: number } {
    const taxAmount = grossAmount * TAX_RATES.PPN;
    return {
      taxAmount,
      netAmount: grossAmount - taxAmount,
    };
  }

  /**
   * Calculate PPH 23 (Service Withholding Tax)
   */
  static calculatePPH23(grossAmount: number): { taxAmount: number; netAmount: number } {
    const taxAmount = grossAmount * TAX_RATES.PPH23;
    return {
      taxAmount,
      netAmount: grossAmount - taxAmount,
    };
  }

  /**
   * Calculate PPH 4(2) (Final Tax)
   */
  static calculatePPH4_2(grossAmount: number): { taxAmount: number; netAmount: number } {
    const taxAmount = grossAmount * TAX_RATES.PPH4_2;
    return {
      taxAmount,
      netAmount: grossAmount - taxAmount,
    };
  }
}
