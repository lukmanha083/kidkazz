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
 * Order Completed event from order-service
 */
export interface OrderCompletedEvent {
  eventId: string;
  eventType: 'OrderCompleted';
  orderId: string;
  orderNumber: string;
  orderDate: string;
  customerId: string;
  customerName: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    tax: number;
    total: number;
  }>;
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
  paymentMethod: string;
  salesPersonId?: string;
  warehouseId?: string;
  salesChannel: 'POS' | 'Online' | 'B2B' | 'Marketplace' | 'Wholesale';
}

/**
 * Handler for OrderCompleted events from order-service
 * Creates revenue journal entry when order is completed
 */
export class OrderCompletedHandler {
  constructor(
    private readonly processedEventRepository: IProcessedEventRepository,
    private readonly domainEventRepository: IDomainEventRepository,
    private readonly journalEntryRepository: IJournalEntryRepository,
    private readonly accountRepository: IAccountRepository,
    private readonly fiscalPeriodRepository: IFiscalPeriodRepository
  ) {}

  async handle(event: OrderCompletedEvent): Promise<void> {
    // Idempotency check
    const isProcessed = await this.processedEventRepository.isProcessed(event.eventId);
    if (isProcessed) {
      return;
    }

    try {
      // Determine fiscal period from order date
      const orderDate = new Date(event.orderDate);
      const fiscalYear = orderDate.getFullYear();
      const fiscalMonth = orderDate.getMonth() + 1;

      // Verify fiscal period is open
      const fiscalPeriod = await this.fiscalPeriodRepository.findByPeriod(fiscalYear, fiscalMonth);
      if (!fiscalPeriod || fiscalPeriod.status !== 'Open') {
        throw new Error(`Fiscal period ${fiscalYear}-${fiscalMonth} is not open`);
      }

      // Get required accounts
      const cashAccount = await this.accountRepository.findByCode('1101'); // Cash account
      const revenueAccount = await this.accountRepository.findByCode('4101'); // Sales revenue

      if (!cashAccount || !revenueAccount) {
        throw new Error('Required accounts (Cash 1101, Revenue 4101) not found');
      }

      // Get optional accounts (only fetch if needed)
      const taxPayableAccount =
        event.totalTax > 0
          ? await this.accountRepository.findByCode('2201') // Tax payable
          : null;
      const discountAccount =
        event.totalDiscount > 0
          ? await this.accountRepository.findByCode('4201') // Sales discount
          : null;

      // Validate optional accounts exist if needed
      if (event.totalTax > 0 && !taxPayableAccount) {
        throw new Error('Tax Payable account (2201) not found but tax amount exists');
      }
      if (event.totalDiscount > 0 && !discountAccount) {
        throw new Error('Sales Discount account (4201) not found but discount amount exists');
      }

      // Build journal entry lines
      const lines: Array<{
        accountId: string;
        direction: 'Debit' | 'Credit';
        amount: number;
        memo?: string;
        customerId?: string;
        salesPersonId?: string;
        warehouseId?: string;
        salesChannel?: 'POS' | 'Online' | 'B2B' | 'Marketplace' | 'Wholesale';
      }> = [];

      // Debit: Cash/Bank for grand total
      lines.push({
        accountId: cashAccount.id,
        direction: 'Debit',
        amount: event.grandTotal,
        memo: `Payment for order ${event.orderNumber}`,
        customerId: event.customerId,
        salesPersonId: event.salesPersonId,
        warehouseId: event.warehouseId,
        salesChannel: event.salesChannel,
      });

      // Credit: Sales Revenue for subtotal
      lines.push({
        accountId: revenueAccount.id,
        direction: 'Credit',
        amount: event.subtotal,
        memo: `Sales revenue - ${event.orderNumber}`,
        customerId: event.customerId,
        salesPersonId: event.salesPersonId,
        warehouseId: event.warehouseId,
        salesChannel: event.salesChannel,
      });

      // Debit: Sales Discount (if any)
      if (event.totalDiscount > 0 && discountAccount) {
        lines.push({
          accountId: discountAccount.id,
          direction: 'Debit',
          amount: event.totalDiscount,
          memo: `Discount - ${event.orderNumber}`,
          customerId: event.customerId,
          salesPersonId: event.salesPersonId,
          warehouseId: event.warehouseId,
          salesChannel: event.salesChannel,
        });
      }

      // Credit: Tax Payable (if any)
      if (event.totalTax > 0 && taxPayableAccount) {
        lines.push({
          accountId: taxPayableAccount.id,
          direction: 'Credit',
          amount: event.totalTax,
          memo: `PPN output - ${event.orderNumber}`,
          customerId: event.customerId,
          salesPersonId: event.salesPersonId,
          warehouseId: event.warehouseId,
          salesChannel: event.salesChannel,
        });
      }

      // Create journal entry (already posted for system entries - atomic)
      const journalEntry = JournalEntry.createPosted(
        {
          entryDate: orderDate,
          description: `Sales Order ${event.orderNumber} - ${event.customerName}`,
          reference: event.orderNumber,
          entryType: JournalEntryType.SYSTEM,
          sourceService: 'order-service',
          sourceReferenceId: event.orderId,
          createdBy: 'system',
          lines,
        },
        'system'
      );

      // Save (already posted - single atomic save)
      await this.journalEntryRepository.save(journalEntry);

      // Store domain event for journal entry posted
      const postedEvent = JournalEntryPosted.create({
        entryId: journalEntry.id,
        entryNumber: journalEntry.entryNumber,
        entryDate: journalEntry.entryDate.toISOString().split('T')[0],
        description: journalEntry.description,
        totalAmount: event.grandTotal,
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

      // Mark event as processed successfully
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
