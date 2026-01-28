import { JournalEntry, JournalEntryType } from '@/domain/entities/journal-entry.entity';
import { JournalEntryPosted } from '@/domain/events';
import type { IAccountRepository } from '@/domain/repositories/account.repository';
import type {
  IDomainEventRepository,
  IProcessedEventRepository,
} from '@/domain/repositories/domain-event.repository';
import type { IFiscalPeriodRepository } from '@/domain/repositories/fiscal-period.repository';
import type { IJournalEntryRepository } from '@/domain/repositories/journal-entry.repository';

/**
 * Inventory Adjusted event from inventory-service
 */
export interface InventoryAdjustedEvent {
  eventId: string;
  eventType: 'InventoryAdjusted';
  adjustmentId: string;
  adjustmentNumber: string;
  adjustmentDate: string;
  adjustmentType: 'INCREASE' | 'DECREASE' | 'TRANSFER' | 'WRITE_OFF' | 'RECOUNT';
  reason: string;
  warehouseId: string;
  warehouseName: string;
  items: Array<{
    productId: string;
    productSku: string;
    productName: string;
    previousQty: number;
    adjustedQty: number;
    qtyChange: number;
    unitCost: number;
    totalCost: number;
  }>;
  totalValue: number;
  performedBy: string;
  notes?: string;
}

/**
 * COGS Calculated event from inventory-service
 */
export interface COGSCalculatedEvent {
  eventId: string;
  eventType: 'COGSCalculated';
  orderId: string;
  orderNumber: string;
  orderDate: string;
  warehouseId: string;
  items: Array<{
    productId: string;
    productSku: string;
    productName: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
  }>;
  totalCOGS: number;
}

/**
 * Handler for InventoryAdjusted events from inventory-service
 * Creates inventory adjustment journal entries
 */
export class InventoryAdjustedHandler {
  constructor(
    private readonly processedEventRepository: IProcessedEventRepository,
    private readonly domainEventRepository: IDomainEventRepository,
    private readonly journalEntryRepository: IJournalEntryRepository,
    private readonly accountRepository: IAccountRepository,
    private readonly fiscalPeriodRepository: IFiscalPeriodRepository
  ) {}

  async handle(event: InventoryAdjustedEvent): Promise<void> {
    // Idempotency check
    const isProcessed = await this.processedEventRepository.isProcessed(event.eventId);
    if (isProcessed) {
      return;
    }

    try {
      // Skip if no value impact
      if (event.totalValue === 0) {
        await this.processedEventRepository.markAsProcessed(
          event.eventId,
          event.eventType,
          'skipped',
          'No value impact'
        );
        return;
      }

      // Skip TRANSFER adjustments - they don't affect GL (only location changes)
      if (event.adjustmentType === 'TRANSFER') {
        await this.processedEventRepository.markAsProcessed(
          event.eventId,
          event.eventType,
          'skipped',
          'TRANSFER adjustments do not create journal entries'
        );
        return;
      }

      // Determine fiscal period
      const adjustmentDate = new Date(event.adjustmentDate);
      const fiscalYear = adjustmentDate.getFullYear();
      const fiscalMonth = adjustmentDate.getMonth() + 1;

      // Verify fiscal period is open
      const fiscalPeriod = await this.fiscalPeriodRepository.findByPeriod(fiscalYear, fiscalMonth);
      if (!fiscalPeriod || fiscalPeriod.status !== 'Open') {
        throw new Error(`Fiscal period ${fiscalYear}-${fiscalMonth} is not open`);
      }

      // Get required accounts
      const inventoryAccount = await this.accountRepository.findByCode('1301'); // Inventory
      const adjustmentAccount = await this.getAdjustmentAccount(event.adjustmentType);

      if (!inventoryAccount || !adjustmentAccount) {
        throw new Error('Required accounts not found');
      }

      // Build journal entry lines based on adjustment type
      const lines = this.buildJournalLines(event, inventoryAccount.id, adjustmentAccount.id);

      // Create journal entry (already posted for system entries - atomic)
      const journalEntry = JournalEntry.createPosted(
        {
          entryDate: adjustmentDate,
          description: `Inventory Adjustment ${event.adjustmentNumber} - ${event.reason}`,
          reference: event.adjustmentNumber,
          notes: event.notes,
          entryType: JournalEntryType.SYSTEM,
          sourceService: 'inventory-service',
          sourceReferenceId: event.adjustmentId,
          createdBy: event.performedBy,
          lines,
        },
        event.performedBy
      );

      // Save (already posted - single atomic save)
      await this.journalEntryRepository.save(journalEntry);

      // Store domain event
      const postedEvent = JournalEntryPosted.create({
        entryId: journalEntry.id,
        entryNumber: journalEntry.entryNumber,
        entryDate: journalEntry.entryDate.toISOString().split('T')[0],
        description: journalEntry.description,
        totalAmount: Math.abs(event.totalValue),
        fiscalYear: journalEntry.fiscalPeriod.year,
        fiscalMonth: journalEntry.fiscalPeriod.month,
        accounts: lines.map((line) => ({
          accountId: line.accountId,
          accountCode: '',
          accountName: '',
          direction: line.direction,
          amount: line.amount,
        })),
        postedBy: event.performedBy,
        postedAt: new Date().toISOString(),
      });

      await this.domainEventRepository.save(postedEvent);

      // Mark event as processed
      await this.processedEventRepository.markAsProcessed(
        event.eventId,
        event.eventType,
        'success'
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.processedEventRepository.markAsProcessed(
        event.eventId,
        event.eventType,
        'failed',
        errorMessage
      );
      throw error;
    }
  }

  private async getAdjustmentAccount(
    adjustmentType: InventoryAdjustedEvent['adjustmentType']
  ): Promise<{ id: string; code: string } | null> {
    // Map adjustment type to appropriate expense/income account
    const accountCodeMap: Record<string, string> = {
      INCREASE: '4901', // Other income - inventory gain
      DECREASE: '5901', // Inventory shrinkage expense
      WRITE_OFF: '5902', // Inventory write-off expense
      RECOUNT: '5903', // Inventory recount adjustment
      TRANSFER: '1301', // Still inventory (just location change)
    };

    const accountCode = accountCodeMap[adjustmentType];
    return this.accountRepository.findByCode(accountCode);
  }

  private buildJournalLines(
    event: InventoryAdjustedEvent,
    inventoryAccountId: string,
    adjustmentAccountId: string
  ): Array<{
    accountId: string;
    direction: 'Debit' | 'Credit';
    amount: number;
    memo?: string;
    warehouseId?: string;
    productId?: string;
  }> {
    const lines: Array<{
      accountId: string;
      direction: 'Debit' | 'Credit';
      amount: number;
      memo?: string;
      warehouseId?: string;
      productId?: string;
    }> = [];

    const absValue = Math.abs(event.totalValue);

    switch (event.adjustmentType) {
      case 'INCREASE':
        // Inventory increase: Debit Inventory, Credit Other Income
        lines.push({
          accountId: inventoryAccountId,
          direction: 'Debit',
          amount: absValue,
          memo: `Inventory increase - ${event.reason}`,
          warehouseId: event.warehouseId,
        });
        lines.push({
          accountId: adjustmentAccountId,
          direction: 'Credit',
          amount: absValue,
          memo: `Inventory gain - ${event.reason}`,
          warehouseId: event.warehouseId,
        });
        break;

      case 'DECREASE':
      case 'WRITE_OFF':
      case 'RECOUNT':
        // Inventory decrease: Debit Expense, Credit Inventory
        lines.push({
          accountId: adjustmentAccountId,
          direction: 'Debit',
          amount: absValue,
          memo: `${event.adjustmentType.toLowerCase()} - ${event.reason}`,
          warehouseId: event.warehouseId,
        });
        lines.push({
          accountId: inventoryAccountId,
          direction: 'Credit',
          amount: absValue,
          memo: `Inventory reduction - ${event.reason}`,
          warehouseId: event.warehouseId,
        });
        break;

      case 'TRANSFER':
        // Transfer doesn't affect GL value, only location
        // No journal entry needed for transfers
        break;
    }

    return lines;
  }
}

/**
 * Handler for COGSCalculated events from inventory-service
 * Creates COGS journal entries when inventory is sold
 */
export class COGSCalculatedHandler {
  constructor(
    private readonly processedEventRepository: IProcessedEventRepository,
    private readonly domainEventRepository: IDomainEventRepository,
    private readonly journalEntryRepository: IJournalEntryRepository,
    private readonly accountRepository: IAccountRepository,
    private readonly fiscalPeriodRepository: IFiscalPeriodRepository
  ) {}

  async handle(event: COGSCalculatedEvent): Promise<void> {
    // Idempotency check
    const isProcessed = await this.processedEventRepository.isProcessed(event.eventId);
    if (isProcessed) {
      return;
    }

    try {
      // Skip if no COGS
      if (event.totalCOGS === 0) {
        await this.processedEventRepository.markAsProcessed(
          event.eventId,
          event.eventType,
          'skipped',
          'No COGS to record'
        );
        return;
      }

      // Determine fiscal period
      const orderDate = new Date(event.orderDate);
      const fiscalYear = orderDate.getFullYear();
      const fiscalMonth = orderDate.getMonth() + 1;

      // Verify fiscal period is open
      const fiscalPeriod = await this.fiscalPeriodRepository.findByPeriod(fiscalYear, fiscalMonth);
      if (!fiscalPeriod || fiscalPeriod.status !== 'Open') {
        throw new Error(`Fiscal period ${fiscalYear}-${fiscalMonth} is not open`);
      }

      // Get required accounts
      const inventoryAccount = await this.accountRepository.findByCode('1301'); // Inventory
      const cogsAccount = await this.accountRepository.findByCode('5101'); // Cost of Goods Sold

      if (!inventoryAccount || !cogsAccount) {
        throw new Error('Required accounts not found');
      }

      // Build journal entry lines
      // COGS entry: Debit COGS, Credit Inventory
      const lines: Array<{
        accountId: string;
        direction: 'Debit' | 'Credit';
        amount: number;
        memo?: string;
        warehouseId?: string;
      }> = [
        {
          accountId: cogsAccount.id,
          direction: 'Debit',
          amount: event.totalCOGS,
          memo: `COGS for order ${event.orderNumber}`,
          warehouseId: event.warehouseId,
        },
        {
          accountId: inventoryAccount.id,
          direction: 'Credit',
          amount: event.totalCOGS,
          memo: `Inventory sold - order ${event.orderNumber}`,
          warehouseId: event.warehouseId,
        },
      ];

      // Create journal entry (already posted for system entries - atomic)
      const journalEntry = JournalEntry.createPosted(
        {
          entryDate: orderDate,
          description: `COGS - Order ${event.orderNumber}`,
          reference: `COGS-${event.orderNumber}`,
          entryType: JournalEntryType.SYSTEM,
          sourceService: 'inventory-service',
          sourceReferenceId: `cogs-${event.orderId}`,
          createdBy: 'system',
          lines,
        },
        'system'
      );

      // Save (already posted - single atomic save)
      await this.journalEntryRepository.save(journalEntry);

      // Store domain event
      const postedEvent = JournalEntryPosted.create({
        entryId: journalEntry.id,
        entryNumber: journalEntry.entryNumber,
        entryDate: journalEntry.entryDate.toISOString().split('T')[0],
        description: journalEntry.description,
        totalAmount: event.totalCOGS,
        fiscalYear: journalEntry.fiscalPeriod.year,
        fiscalMonth: journalEntry.fiscalPeriod.month,
        accounts: lines.map((line) => ({
          accountId: line.accountId,
          accountCode: '',
          accountName: '',
          direction: line.direction,
          amount: line.amount,
        })),
        postedBy: 'system',
        postedAt: new Date().toISOString(),
      });

      await this.domainEventRepository.save(postedEvent);

      // Mark event as processed
      await this.processedEventRepository.markAsProcessed(
        event.eventId,
        event.eventType,
        'success'
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.processedEventRepository.markAsProcessed(
        event.eventId,
        event.eventType,
        'failed',
        errorMessage
      );
      throw error;
    }
  }
}
