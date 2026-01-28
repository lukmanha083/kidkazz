import { describe, it, expect, beforeEach } from 'vitest';
import {
  CashFlowCalculationService,
  type CashFlowInput,
  type CashFlowStatement,
} from '@/domain/services/CashFlowCalculationService';
import { CashFlowActivityType } from '@/domain/value-objects';

describe('CashFlowCalculationService', () => {
  let service: CashFlowCalculationService;

  beforeEach(() => {
    service = new CashFlowCalculationService();
  });

  describe('calculateIndirectMethod (Rule 28 - PSAK 2)', () => {
    it('should calculate cash flow from operating activities', () => {
      const input: CashFlowInput = {
        fiscalYear: 2026,
        fiscalMonth: 1,
        // Income Statement
        netIncome: 50_000_000,
        // Non-cash adjustments
        depreciation: 5_000_000,
        amortization: 1_000_000,
        gainOnAssetDisposal: -2_000_000, // Gain is subtracted
        lossOnAssetDisposal: 500_000, // Loss is added
        // Working capital changes
        accountsReceivableChange: -10_000_000, // Increase = use of cash (negative)
        inventoryChange: -5_000_000, // Increase = use of cash
        prepaidExpenseChange: -1_000_000, // Increase = use of cash
        accountsPayableChange: 8_000_000, // Increase = source of cash
        accruedLiabilitiesChange: 3_000_000, // Increase = source of cash
        // Investing activities
        capitalExpenditures: -20_000_000, // Cash paid for assets
        proceedsFromAssetSales: 5_000_000, // Cash received from sales
        // Financing activities
        newLoans: 15_000_000, // Cash from new borrowing
        loanRepayments: -8_000_000, // Cash paid to repay loans
        dividendsPaid: -10_000_000, // Cash paid as dividends
        // Beginning cash
        beginningCash: 100_000_000,
      };

      const result = service.calculateIndirectMethod(input);

      // Operating Activities
      // Net Income: 50M
      // + Depreciation: 5M
      // + Amortization: 1M
      // - Gain on disposal: -2M (subtract gain)
      // + Loss on disposal: 0.5M
      // Working capital changes:
      // - AR increase: -10M
      // - Inventory increase: -5M
      // - Prepaid increase: -1M
      // + AP increase: 8M
      // + Accrued increase: 3M
      // = 50 + 5 + 1 - 2 + 0.5 - 10 - 5 - 1 + 8 + 3 = 49.5M
      expect(result.operatingActivities.netIncome).toBe(50_000_000);
      expect(result.operatingActivities.depreciation).toBe(5_000_000);
      expect(result.operatingActivities.amortization).toBe(1_000_000);
      expect(result.operatingActivities.netCashFromOperating).toBe(49_500_000);

      // Investing Activities
      // Capital expenditures: -20M
      // Proceeds from sales: 5M
      // = -15M
      expect(result.investingActivities.capitalExpenditures).toBe(-20_000_000);
      expect(result.investingActivities.proceedsFromAssetSales).toBe(5_000_000);
      expect(result.investingActivities.netCashFromInvesting).toBe(-15_000_000);

      // Financing Activities
      // New loans: 15M
      // Loan repayments: -8M
      // Dividends: -10M
      // = -3M
      expect(result.financingActivities.newLoans).toBe(15_000_000);
      expect(result.financingActivities.loanRepayments).toBe(-8_000_000);
      expect(result.financingActivities.netCashFromFinancing).toBe(-3_000_000);

      // Net Change = 49.5M - 15M - 3M = 31.5M
      expect(result.netChangeInCash).toBe(31_500_000);

      // Ending Cash = 100M + 31.5M = 131.5M
      expect(result.beginningCash).toBe(100_000_000);
      expect(result.endingCash).toBe(131_500_000);
    });

    it('should handle zero/null values gracefully', () => {
      const input: CashFlowInput = {
        fiscalYear: 2026,
        fiscalMonth: 1,
        netIncome: 10_000_000,
        depreciation: 0,
        beginningCash: 50_000_000,
      };

      const result = service.calculateIndirectMethod(input);

      expect(result.operatingActivities.netIncome).toBe(10_000_000);
      expect(result.operatingActivities.depreciation).toBe(0);
      expect(result.operatingActivities.netCashFromOperating).toBe(10_000_000);
      expect(result.netChangeInCash).toBe(10_000_000);
      expect(result.endingCash).toBe(60_000_000);
    });

    it('should handle negative net income (loss)', () => {
      const input: CashFlowInput = {
        fiscalYear: 2026,
        fiscalMonth: 1,
        netIncome: -20_000_000, // Loss
        depreciation: 15_000_000,
        beginningCash: 100_000_000,
      };

      const result = service.calculateIndirectMethod(input);

      // Loss + depreciation = -20M + 15M = -5M
      expect(result.operatingActivities.netCashFromOperating).toBe(-5_000_000);
      expect(result.netChangeInCash).toBe(-5_000_000);
      expect(result.endingCash).toBe(95_000_000);
    });
  });

  describe('validateReconciliation (Rule 34)', () => {
    it('should validate when net change equals actual cash change', () => {
      const statement: CashFlowStatement = {
        fiscalYear: 2026,
        fiscalMonth: 1,
        operatingActivities: {
          netIncome: 50_000_000,
          depreciation: 5_000_000,
          amortization: 0,
          gainLossOnDisposal: 0,
          workingCapitalChanges: {
            accountsReceivable: 0,
            inventory: 0,
            prepaidExpenses: 0,
            accountsPayable: 0,
            accruedLiabilities: 0,
          },
          netCashFromOperating: 55_000_000,
        },
        investingActivities: {
          capitalExpenditures: -10_000_000,
          proceedsFromAssetSales: 0,
          netCashFromInvesting: -10_000_000,
        },
        financingActivities: {
          newLoans: 0,
          loanRepayments: 0,
          dividendsPaid: 0,
          capitalInjections: 0,
          netCashFromFinancing: 0,
        },
        netChangeInCash: 45_000_000,
        beginningCash: 100_000_000,
        endingCash: 145_000_000,
      };

      const actualEndingCash = 145_000_000;

      const result = service.validateReconciliation(statement, actualEndingCash);

      expect(result.isValid).toBe(true);
      expect(result.difference).toBe(0);
    });

    it('should return invalid when there is a discrepancy', () => {
      const statement: CashFlowStatement = {
        fiscalYear: 2026,
        fiscalMonth: 1,
        operatingActivities: {
          netIncome: 50_000_000,
          depreciation: 5_000_000,
          amortization: 0,
          gainLossOnDisposal: 0,
          workingCapitalChanges: {
            accountsReceivable: 0,
            inventory: 0,
            prepaidExpenses: 0,
            accountsPayable: 0,
            accruedLiabilities: 0,
          },
          netCashFromOperating: 55_000_000,
        },
        investingActivities: {
          capitalExpenditures: 0,
          proceedsFromAssetSales: 0,
          netCashFromInvesting: 0,
        },
        financingActivities: {
          newLoans: 0,
          loanRepayments: 0,
          dividendsPaid: 0,
          capitalInjections: 0,
          netCashFromFinancing: 0,
        },
        netChangeInCash: 55_000_000,
        beginningCash: 100_000_000,
        endingCash: 155_000_000,
      };

      const actualEndingCash = 150_000_000; // Discrepancy of 5M

      const result = service.validateReconciliation(statement, actualEndingCash);

      expect(result.isValid).toBe(false);
      expect(result.difference).toBe(5_000_000);
    });
  });

  describe('classifyTransaction (Rule 29-33)', () => {
    it('should classify customer receipts as operating', () => {
      const result = service.classifyTransaction({
        accountCode: '1120', // Accounts Receivable
        transactionType: 'collection',
      });

      expect(result).toBe(CashFlowActivityType.OPERATING);
    });

    it('should classify vendor payments as operating', () => {
      const result = service.classifyTransaction({
        accountCode: '2100', // Accounts Payable
        transactionType: 'payment',
      });

      expect(result).toBe(CashFlowActivityType.OPERATING);
    });

    it('should classify asset purchases as investing', () => {
      const result = service.classifyTransaction({
        accountCode: '1500', // Fixed Assets
        transactionType: 'purchase',
      });

      expect(result).toBe(CashFlowActivityType.INVESTING);
    });

    it('should classify asset sales as investing', () => {
      const result = service.classifyTransaction({
        accountCode: '1500', // Fixed Assets
        transactionType: 'sale',
      });

      expect(result).toBe(CashFlowActivityType.INVESTING);
    });

    it('should classify loan proceeds as financing', () => {
      const result = service.classifyTransaction({
        accountCode: '2300', // Long-term Debt
        transactionType: 'proceeds',
      });

      expect(result).toBe(CashFlowActivityType.FINANCING);
    });

    it('should classify loan repayments as financing', () => {
      const result = service.classifyTransaction({
        accountCode: '2300', // Long-term Debt
        transactionType: 'repayment',
      });

      expect(result).toBe(CashFlowActivityType.FINANCING);
    });

    it('should classify dividend payments as financing', () => {
      const result = service.classifyTransaction({
        accountCode: '3200', // Retained Earnings
        transactionType: 'dividend',
      });

      expect(result).toBe(CashFlowActivityType.FINANCING);
    });
  });
});
