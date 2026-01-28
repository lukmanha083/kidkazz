import { describe, it, expect, beforeEach } from 'vitest';
import {
  CashPositionService,
  type CashAccountBalance,
  type CashPositionResult,
} from '@/domain/services/CashPositionService';
import { CashAlertLevel } from '@/domain/value-objects';

describe('CashPositionService', () => {
  let service: CashPositionService;

  beforeEach(() => {
    service = new CashPositionService();
  });

  describe('calculateCashPosition (Rule 30)', () => {
    it('should aggregate cash on hand balances (codes 1010-1014)', () => {
      const accounts: CashAccountBalance[] = [
        { accountCode: '1010', accountName: 'Petty Cash - Main', balance: 5_000_000, lastReconciledDate: new Date() },
        { accountCode: '1011', accountName: 'Petty Cash - Branch', balance: 3_000_000, lastReconciledDate: new Date() },
        { accountCode: '1012', accountName: 'POS Drawer 1', balance: 2_000_000, lastReconciledDate: new Date() },
      ];

      const result = service.calculateCashPosition(accounts);

      expect(result.cashOnHand.total).toBe(10_000_000);
      expect(result.cashOnHand.accounts).toHaveLength(3);
    });

    it('should aggregate bank account balances (codes 1020-1027)', () => {
      const accounts: CashAccountBalance[] = [
        { accountCode: '1020', accountName: 'Bank BCA - Operating', balance: 100_000_000, lastReconciledDate: new Date() },
        { accountCode: '1021', accountName: 'Bank Mandiri - Payroll', balance: 50_000_000, lastReconciledDate: new Date() },
        { accountCode: '1025', accountName: 'Bank CIMB - USD', balance: 75_000_000, lastReconciledDate: new Date() },
      ];

      const result = service.calculateCashPosition(accounts);

      expect(result.bankAccounts.total).toBe(225_000_000);
      expect(result.bankAccounts.accounts).toHaveLength(3);
    });

    it('should aggregate cash equivalents (codes 1030-1031)', () => {
      const accounts: CashAccountBalance[] = [
        { accountCode: '1030', accountName: 'Money Market Fund', balance: 50_000_000, lastReconciledDate: new Date() },
        { accountCode: '1031', accountName: 'Time Deposit < 3 months', balance: 100_000_000, lastReconciledDate: new Date() },
      ];

      const result = service.calculateCashPosition(accounts);

      expect(result.cashEquivalents.total).toBe(150_000_000);
      expect(result.cashEquivalents.accounts).toHaveLength(2);
    });

    it('should calculate total cash position', () => {
      const accounts: CashAccountBalance[] = [
        { accountCode: '1010', accountName: 'Petty Cash', balance: 5_000_000, lastReconciledDate: new Date() },
        { accountCode: '1020', accountName: 'Bank BCA', balance: 200_000_000, lastReconciledDate: new Date() },
        { accountCode: '1030', accountName: 'Money Market', balance: 100_000_000, lastReconciledDate: new Date() },
      ];

      const result = service.calculateCashPosition(accounts);

      expect(result.totalCashPosition).toBe(305_000_000);
    });
  });

  describe('checkThresholds (Rule 35)', () => {
    it('should return NORMAL when above warning threshold', () => {
      const thresholds = {
        warningThreshold: 300_000_000,
        criticalThreshold: 275_000_000,
        emergencyThreshold: 250_000_000,
      };

      const result = service.checkThresholds(350_000_000, thresholds);

      expect(result.alertLevel).toBe(CashAlertLevel.NORMAL);
      expect(result.isAlert).toBe(false);
    });

    it('should return WARNING when below warning but above critical', () => {
      const thresholds = {
        warningThreshold: 300_000_000,
        criticalThreshold: 275_000_000,
        emergencyThreshold: 250_000_000,
      };

      const result = service.checkThresholds(290_000_000, thresholds);

      expect(result.alertLevel).toBe(CashAlertLevel.WARNING);
      expect(result.isAlert).toBe(true);
      expect(result.message).toContain('Warning');
    });

    it('should return CRITICAL when below critical but above emergency', () => {
      const thresholds = {
        warningThreshold: 300_000_000,
        criticalThreshold: 275_000_000,
        emergencyThreshold: 250_000_000,
      };

      const result = service.checkThresholds(260_000_000, thresholds);

      expect(result.alertLevel).toBe(CashAlertLevel.CRITICAL);
      expect(result.isAlert).toBe(true);
      expect(result.message).toContain('Critical');
    });

    it('should return EMERGENCY when below emergency threshold', () => {
      const thresholds = {
        warningThreshold: 300_000_000,
        criticalThreshold: 275_000_000,
        emergencyThreshold: 250_000_000,
      };

      const result = service.checkThresholds(240_000_000, thresholds);

      expect(result.alertLevel).toBe(CashAlertLevel.EMERGENCY);
      expect(result.isAlert).toBe(true);
      expect(result.message).toContain('Emergency');
    });
  });

  describe('identifyUnreconciledAccounts', () => {
    it('should identify accounts not reconciled in current period', () => {
      const currentDate = new Date('2026-01-31');
      const accounts: CashAccountBalance[] = [
        { accountCode: '1020', accountName: 'Bank BCA', balance: 100_000_000, lastReconciledDate: new Date('2026-01-15') },
        { accountCode: '1021', accountName: 'Bank Mandiri', balance: 50_000_000, lastReconciledDate: new Date('2025-12-15') }, // Old
        { accountCode: '1022', accountName: 'Bank CIMB', balance: 25_000_000 }, // Never reconciled
      ];

      const unreconciledAccounts = service.identifyUnreconciledAccounts(accounts, currentDate);

      expect(unreconciledAccounts).toHaveLength(2);
      expect(unreconciledAccounts.map(a => a.accountCode)).toContain('1021');
      expect(unreconciledAccounts.map(a => a.accountCode)).toContain('1022');
    });
  });
});
