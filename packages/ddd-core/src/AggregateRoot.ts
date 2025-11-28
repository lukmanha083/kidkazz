import { Entity } from './Entity';
import { DomainEvent } from './DomainEvent';

/**
 * AggregateRoot is the entry point to an aggregate
 * It maintains a list of domain events that occurred
 */
export abstract class AggregateRoot<T = string> extends Entity<T> {
  private _domainEvents: DomainEvent[] = [];

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  public getDomainEvents(): DomainEvent[] {
    return [...this._domainEvents];
  }

  public clearDomainEvents(): void {
    this._domainEvents = [];
  }

  /**
   * Get uncommitted domain events
   * Alias for getDomainEvents() to match common naming conventions
   */
  public getUncommittedEvents(): DomainEvent[] {
    return this.getDomainEvents();
  }

  /**
   * Mark all domain events as committed by clearing them
   * Alias for clearDomainEvents() to match common naming conventions
   */
  public markEventsAsCommitted(): void {
    this.clearDomainEvents();
  }
}
