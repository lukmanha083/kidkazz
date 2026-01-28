
/**
 * Audit action types
 */
export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'VOID'
  | 'APPROVE'
  | 'POST'
  | 'CLOSE'
  | 'REOPEN';

/**
 * Props for creating a new AuditLog
 */
export interface AuditLogProps {
  userId: string;
  userName?: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Props for persistence/reconstruction
 */
export interface AuditLogPersistenceProps {
  id: string;
  timestamp: Date;
  userId: string;
  userName: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

/**
 * AuditLog entity
 * Represents an audit trail record for entity changes
 */
export class AuditLog {
  private constructor(
    public readonly id: string,
    public readonly timestamp: Date,
    public readonly userId: string,
    public readonly userName: string | null,
    public readonly action: AuditAction,
    public readonly entityType: string,
    public readonly entityId: string,
    public readonly oldValues: Record<string, unknown> | null,
    public readonly newValues: Record<string, unknown> | null,
    public readonly ipAddress: string | null,
    public readonly userAgent: string | null,
    public readonly metadata: Record<string, unknown> | null,
    public readonly createdAt: Date
  ) {}

  /**
   * Create a new audit log entry
   */
  static create(props: AuditLogProps): AuditLog {
    const now = new Date();
    return new AuditLog(
      crypto.randomUUID(),
      now,
      props.userId,
      props.userName || null,
      props.action,
      props.entityType,
      props.entityId,
      props.oldValues || null,
      props.newValues || null,
      props.ipAddress || null,
      props.userAgent || null,
      props.metadata || null,
      now
    );
  }

  /**
   * Reconstruct from persistence
   */
  static fromPersistence(props: AuditLogPersistenceProps): AuditLog {
    return new AuditLog(
      props.id,
      props.timestamp,
      props.userId,
      props.userName,
      props.action,
      props.entityType,
      props.entityId,
      props.oldValues,
      props.newValues,
      props.ipAddress,
      props.userAgent,
      props.metadata,
      props.createdAt
    );
  }

  /**
   * Get a summary description of the audit event
   */
  get summary(): string {
    return `${this.action} ${this.entityType}:${this.entityId} by ${this.userId}`;
  }

  /**
   * Check if this audit log represents a data change
   */
  get hasDataChange(): boolean {
    return this.oldValues !== null || this.newValues !== null;
  }

  /**
   * Get the changed fields between old and new values
   */
  getChangedFields(): string[] {
    if (!this.oldValues && !this.newValues) return [];

    const oldKeys = Object.keys(this.oldValues || {});
    const newKeys = Object.keys(this.newValues || {});
    const allKeys = new Set([...oldKeys, ...newKeys]);

    const changedFields: string[] = [];
    for (const key of allKeys) {
      const oldVal = this.oldValues?.[key];
      const newVal = this.newValues?.[key];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changedFields.push(key);
      }
    }

    return changedFields;
  }
}
