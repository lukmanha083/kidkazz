import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OrderCompletedHandler, type OrderCompletedEvent } from '@/application/event-handlers';
import type { IProcessedEventRepository, IDomainEventRepository } from '@/domain/repositories/domain-event.repository';
import type { IJournalEntryRepository } from '@/domain/repositories/journal-entry.repository';
import type { IAccountRepository } from '@/domain/repositories/account.repository';
import type { IFiscalPeriodRepository } from '@/domain/repositories/fiscal-period.repository';
import { Account, AccountStatus } from '@/domain/entities/account.entity';
import { AccountType, AccountCategory, FinancialStatementType } from '@/domain/value-objects';

describe('OrderCompletedHandler', () => {
  // Mock repositories
  const mockProcessedEventRepository: IProcessedEventRepository = {
    isProcessed: vi.fn(),
    markAsProcessed: vi.fn(),
    findByEventId: vi.fn(),
    findByEventType: vi.fn(),
    findRecent: vi.fn(),
    deleteOldRecords: vi.fn(),
  };

  const mockDomainEventRepository: IDomainEventRepository = {
    save: vi.fn(),
    findPendingEvents: vi.fn(),
    markAsPublished: vi.fn(),
    markAsFailed: vi.fn(),
    incrementRetryCount: vi.fn(),
    findById: vi.fn(),
    findByAggregateId: vi.fn(),
    findByEventType: vi.fn(),
    deleteOldPublishedEvents: vi.fn(),
  };

  const mockJournalEntryRepository: IJournalEntryRepository = {
    findById: vi.fn(),
    findByEntryNumber: vi.fn(),
    findAll: vi.fn(),
    findByAccountId: vi.fn(),
    findBySourceReference: vi.fn(),
    findByFiscalPeriod: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
    generateEntryNumber: vi.fn(),
  };

  const mockAccountRepository: IAccountRepository = {
    findById: vi.fn(),
    findByIds: vi.fn(),
    findByCode: vi.fn(),
    findAll: vi.fn(),
    findByParentId: vi.fn(),
    getAccountTree: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
    hasTransactions: vi.fn(),
    codeExists: vi.fn(),
  };

  const mockFiscalPeriodRepository: IFiscalPeriodRepository = {
    findById: vi.fn(),
    findByPeriod: vi.fn(),
    findByDate: vi.fn(),
    findAll: vi.fn(),
    findPrevious: vi.fn(),
    findOpen: vi.fn(),
    findCurrentOpen: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
    periodExists: vi.fn(),
  };

  let handler: OrderCompletedHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new OrderCompletedHandler(
      mockProcessedEventRepository,
      mockDomainEventRepository,
      mockJournalEntryRepository,
      mockAccountRepository,
      mockFiscalPeriodRepository
    );
  });

  const createOrderCompletedEvent = (): OrderCompletedEvent => ({
    eventId: 'evt-order-001',
    eventType: 'OrderCompleted',
    orderId: 'ord-123',
    orderNumber: 'ORD-2026-001',
    orderDate: '2026-01-28',
    customerId: 'cust-1',
    customerName: 'Test Customer',
    items: [
      {
        productId: 'prod-1',
        productName: 'Test Product',
        quantity: 2,
        unitPrice: 500000,
        discount: 50000,
        tax: 99000,
        total: 1049000,
      },
    ],
    subtotal: 1000000,
    totalDiscount: 50000,
    totalTax: 99000,
    grandTotal: 1049000,
    paymentMethod: 'CASH',
    salesPersonId: 'sales-1',
    warehouseId: 'wh-1',
    salesChannel: 'POS',
  });

  const createMockAccount = (id: string, code: string, name: string) => {
    return Account.fromPersistence({
      id,
      code,
      name,
      nameEn: name,
      description: '',
      accountType: AccountType.ASSET,
      accountCategory: AccountCategory.CURRENT_ASSET,
      normalBalance: 'Debit',
      parentAccountId: null,
      level: 0,
      isDetailAccount: true,
      isSystemAccount: false,
      financialStatementType: FinancialStatementType.BALANCE_SHEET,
      status: AccountStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system',
      updatedBy: 'system',
    });
  };

  it('should skip processing if event was already processed', async () => {
    const event = createOrderCompletedEvent();
    vi.mocked(mockProcessedEventRepository.isProcessed).mockResolvedValue(true);

    await handler.handle(event);

    expect(mockProcessedEventRepository.isProcessed).toHaveBeenCalledWith('evt-order-001');
    expect(mockJournalEntryRepository.save).not.toHaveBeenCalled();
  });

  it('should create journal entry for order completed event', async () => {
    const event = createOrderCompletedEvent();

    vi.mocked(mockProcessedEventRepository.isProcessed).mockResolvedValue(false);
    vi.mocked(mockFiscalPeriodRepository.findByPeriod).mockResolvedValue({
      id: 'fp-1',
      fiscalYear: 2026,
      fiscalMonth: 1,
      status: 'Open',
      closedAt: null,
      closedBy: null,
      reopenedAt: null,
      reopenedBy: null,
      reopenReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    vi.mocked(mockAccountRepository.findByCode).mockImplementation(async (code) => {
      if (code === '1101') return createMockAccount('acc-1', '1101', 'Cash');
      if (code === '4101') return createMockAccount('acc-2', '4101', 'Sales Revenue');
      if (code === '2201') return createMockAccount('acc-3', '2201', 'Tax Payable');
      if (code === '4201') return createMockAccount('acc-4', '4201', 'Sales Discount');
      return null;
    });
    vi.mocked(mockJournalEntryRepository.save).mockResolvedValue(undefined);
    vi.mocked(mockDomainEventRepository.save).mockResolvedValue(undefined);
    vi.mocked(mockProcessedEventRepository.markAsProcessed).mockResolvedValue(undefined);

    await handler.handle(event);

    expect(mockJournalEntryRepository.save).toHaveBeenCalled();
    expect(mockDomainEventRepository.save).toHaveBeenCalled();
    expect(mockProcessedEventRepository.markAsProcessed).toHaveBeenCalledWith(
      'evt-order-001',
      'OrderCompleted',
      'success'
    );
  });

  it('should throw error if fiscal period is not open', async () => {
    const event = createOrderCompletedEvent();

    vi.mocked(mockProcessedEventRepository.isProcessed).mockResolvedValue(false);
    vi.mocked(mockFiscalPeriodRepository.findByPeriod).mockResolvedValue({
      id: 'fp-1',
      fiscalYear: 2026,
      fiscalMonth: 1,
      status: 'Closed',
      closedAt: '2026-02-01',
      closedBy: 'admin',
      reopenedAt: null,
      reopenedBy: null,
      reopenReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    await expect(handler.handle(event)).rejects.toThrow(
      'Fiscal period 2026-1 is not open'
    );

    expect(mockProcessedEventRepository.markAsProcessed).toHaveBeenCalledWith(
      'evt-order-001',
      'OrderCompleted',
      'failed',
      'Fiscal period 2026-1 is not open'
    );
  });

  it('should throw error if required accounts not found', async () => {
    const event = createOrderCompletedEvent();

    vi.mocked(mockProcessedEventRepository.isProcessed).mockResolvedValue(false);
    vi.mocked(mockFiscalPeriodRepository.findByPeriod).mockResolvedValue({
      id: 'fp-1',
      fiscalYear: 2026,
      fiscalMonth: 1,
      status: 'Open',
      closedAt: null,
      closedBy: null,
      reopenedAt: null,
      reopenedBy: null,
      reopenReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    vi.mocked(mockAccountRepository.findByCode).mockResolvedValue(null);

    await expect(handler.handle(event)).rejects.toThrow('Required accounts (Cash 1101, Revenue 4101) not found');
  });
});
