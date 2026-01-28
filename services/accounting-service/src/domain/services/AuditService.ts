import { AuditLog, type AuditAction, type AuditLogProps } from '@/domain/entities/audit-log.entity';
import type { IAuditLogRepository } from '@/domain/repositories/audit.repository';

/**
 * Log context interface for additional audit information
 */
export interface AuditLogContext {
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

/**
 * AuditService
 * Domain service for creating and managing audit logs
 */
export class AuditService {
  constructor(private readonly auditLogRepository: IAuditLogRepository) {}

  /**
   * Log an entity creation event
   */
  async logCreate(
    userId: string,
    entityType: string,
    entityId: string,
    newValues: Record<string, unknown>,
    context?: AuditLogContext
  ): Promise<AuditLog> {
    return this.log({
      userId,
      action: 'CREATE',
      entityType,
      entityId,
      oldValues: null,
      newValues,
      ...context,
    });
  }

  /**
   * Log an entity update event
   */
  async logUpdate(
    userId: string,
    entityType: string,
    entityId: string,
    oldValues: Record<string, unknown>,
    newValues: Record<string, unknown>,
    context?: AuditLogContext
  ): Promise<AuditLog> {
    return this.log({
      userId,
      action: 'UPDATE',
      entityType,
      entityId,
      oldValues,
      newValues,
      ...context,
    });
  }

  /**
   * Log an entity deletion event
   */
  async logDelete(
    userId: string,
    entityType: string,
    entityId: string,
    oldValues: Record<string, unknown>,
    context?: AuditLogContext
  ): Promise<AuditLog> {
    return this.log({
      userId,
      action: 'DELETE',
      entityType,
      entityId,
      oldValues,
      newValues: null,
      ...context,
    });
  }

  /**
   * Log a journal entry void event
   */
  async logVoid(
    userId: string,
    entityType: string,
    entityId: string,
    oldValues: Record<string, unknown>,
    voidReason: string,
    context?: AuditLogContext
  ): Promise<AuditLog> {
    return this.log({
      userId,
      action: 'VOID',
      entityType,
      entityId,
      oldValues,
      newValues: { ...oldValues, status: 'Voided', voidReason },
      metadata: { ...context?.metadata, voidReason },
      ...context,
    });
  }

  /**
   * Log an approval event
   */
  async logApprove(
    userId: string,
    entityType: string,
    entityId: string,
    oldValues: Record<string, unknown>,
    newValues: Record<string, unknown>,
    context?: AuditLogContext
  ): Promise<AuditLog> {
    return this.log({
      userId,
      action: 'APPROVE',
      entityType,
      entityId,
      oldValues,
      newValues,
      ...context,
    });
  }

  /**
   * Log a journal entry post event
   */
  async logPost(
    userId: string,
    entityType: string,
    entityId: string,
    oldValues: Record<string, unknown>,
    newValues: Record<string, unknown>,
    context?: AuditLogContext
  ): Promise<AuditLog> {
    return this.log({
      userId,
      action: 'POST',
      entityType,
      entityId,
      oldValues,
      newValues,
      ...context,
    });
  }

  /**
   * Log a fiscal period close event
   */
  async logClose(
    userId: string,
    entityType: string,
    entityId: string,
    oldValues: Record<string, unknown>,
    newValues: Record<string, unknown>,
    context?: AuditLogContext
  ): Promise<AuditLog> {
    return this.log({
      userId,
      action: 'CLOSE',
      entityType,
      entityId,
      oldValues,
      newValues,
      ...context,
    });
  }

  /**
   * Log a fiscal period reopen event
   */
  async logReopen(
    userId: string,
    entityType: string,
    entityId: string,
    oldValues: Record<string, unknown>,
    newValues: Record<string, unknown>,
    context?: AuditLogContext
  ): Promise<AuditLog> {
    return this.log({
      userId,
      action: 'REOPEN',
      entityType,
      entityId,
      oldValues,
      newValues,
      ...context,
    });
  }

  /**
   * Generic log method
   */
  async log(props: AuditLogProps): Promise<AuditLog> {
    const auditLog = AuditLog.create(props);
    await this.auditLogRepository.save(auditLog);
    return auditLog;
  }

  /**
   * Get audit history for an entity
   */
  async getEntityHistory(entityType: string, entityId: string): Promise<AuditLog[]> {
    return this.auditLogRepository.findByEntity(entityType, entityId);
  }

  /**
   * Get audit logs by user
   */
  async getLogsByUser(userId: string, limit?: number): Promise<AuditLog[]> {
    return this.auditLogRepository.findByUser(userId, limit);
  }

  /**
   * Get audit logs by action type
   */
  async getLogsByAction(action: AuditAction, limit?: number): Promise<AuditLog[]> {
    return this.auditLogRepository.findByAction(action, limit);
  }

  /**
   * Get recent audit logs
   */
  async getRecentLogs(limit: number = 100): Promise<AuditLog[]> {
    return this.auditLogRepository.findRecent(limit);
  }
}
