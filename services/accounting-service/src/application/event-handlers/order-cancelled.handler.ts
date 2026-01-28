import { JournalEntry, JournalEntryType } from '@/domain/entities/journal-entry.entity';
import { JournalEntryPosted } from '@/domain/events';
import type {
  IDomainEventRepository,
  IProcessedEventRepository,
} from '@/domain/repositories/domain-event.repository';
import type { IFiscalPeriodRepository } from '@/domain/repositories/fiscal-period.repository';
import type { IJournalEntryRepository } from '@/domain/repositories/journal-entry.repository';

/**
 * Order Cancelled event from order-service
 */
export interface OrderCancelledEvent {
  eventId: string;
  eventType: 'OrderCancelled';
  orderId: string;
  orderNumber: string;
  orderDate: string;
  cancelledAt: string;
  cancelledBy: string;
  cancelReason: string;
  customerId: string;
  customerName: string;
  grandTotal: number;
  refundAmount: number;
  refundMethod: string;
  originalJournalEntryId?: string;
}

/**
 * Handler for OrderCancelled events from order-service
 * Creates reversal journal entry when order is cancelled
 */
export class OrderCancelledHandler {
  constructor(
    private readonly processedEventRepository: IProcessedEventRepository,
    private readonly domainEventRepository: IDomainEventRepository,
    private readonly journalEntryRepository: IJournalEntryRepository,
    private readonly fiscalPeriodRepository: IFiscalPeriodRepository
  ) {}

  async handle(event: OrderCancelledEvent): Promise<void> {
    // Idempotency check
    const isProcessed = await this.processedEventRepository.isProcessed(event.eventId);
    if (isProcessed) {
      return;
    }

    try {
      // Find original journal entry
      const originalEntry = event.originalJournalEntryId
        ? await this.journalEntryRepository.findById(event.originalJournalEntryId)
        : await this.findOriginalEntryByOrder(event.orderId);

      if (!originalEntry) {
        // No journal entry found, mark as skipped
        await this.processedEventRepository.markAsProcessed(
          event.eventId,
          event.eventType,
          'skipped',
          'Original journal entry not found'
        );
        return;
      }

      // Determine fiscal period for cancellation
      const cancelledDate = new Date(event.cancelledAt);
      const fiscalYear = cancelledDate.getFullYear();
      const fiscalMonth = cancelledDate.getMonth() + 1;

      // Verify fiscal period is open
      const fiscalPeriod = await this.fiscalPeriodRepository.findByPeriod(fiscalYear, fiscalMonth);
      if (!fiscalPeriod || fiscalPeriod.status !== 'Open') {
        throw new Error(`Fiscal period ${fiscalYear}-${fiscalMonth} is not open`);
      }

      // Create reversal journal entry (opposite of original)
      const reversalLines = originalEntry.lines.map((line) => ({
        accountId: line.accountId,
        direction: line.direction === 'Debit' ? ('Credit' as const) : ('Debit' as const),
        amount: line.amount,
        memo: `Reversal: ${line.memo || 'Order cancelled'}`,
        customerId: line.customerId,
        salesPersonId: line.salesPersonId,
        warehouseId: line.warehouseId,
        salesChannel: line.salesChannel,
      }));

      // Create reversal entry (already posted for system entries - atomic)
      const reversalEntry = JournalEntry.createPosted(
        {
          entryDate: cancelledDate,
          description: `Reversal: Order ${event.orderNumber} cancelled - ${event.cancelReason}`,
          reference: `REV-${event.orderNumber}`,
          entryType: JournalEntryType.SYSTEM,
          sourceService: 'order-service',
          sourceReferenceId: `cancel-${event.orderId}`,
          createdBy: event.cancelledBy,
          lines: reversalLines,
        },
        event.cancelledBy
      );

      // Save (already posted - single atomic save)
      await this.journalEntryRepository.save(reversalEntry);

      // Store domain event
      const postedEvent = JournalEntryPosted.create({
        entryId: reversalEntry.id,
        entryNumber: reversalEntry.entryNumber,
        entryDate: reversalEntry.entryDate.toISOString().split('T')[0],
        description: reversalEntry.description,
        totalAmount: event.refundAmount,
        fiscalYear: reversalEntry.fiscalPeriod.year,
        fiscalMonth: reversalEntry.fiscalPeriod.month,
        accounts: reversalLines.map((line) => ({
          accountId: line.accountId,
          accountCode: '',
          accountName: '',
          direction: line.direction,
          amount: line.amount,
        })),
        postedBy: event.cancelledBy,
        postedAt: new Date().toISOString(),
      });

      await this.domainEventRepository.save(postedEvent);

      // Mark original entry as voided (optional)
      if (originalEntry.status === 'Posted') {
        originalEntry.void(event.cancelledBy, `Order cancelled: ${event.cancelReason}`);
        await this.journalEntryRepository.save(originalEntry);
      }

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

  private async findOriginalEntryByOrder(orderId: string): Promise<JournalEntry | null> {
    return this.journalEntryRepository.findBySourceReference('order-service', orderId);
  }
}
