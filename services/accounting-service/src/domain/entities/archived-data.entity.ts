/**
 * Archive type - type of data being archived
 */
export type ArchiveType = 'journal_entries' | 'audit_logs';

/**
 * Props for creating a new ArchivedData record
 */
export interface ArchivedDataProps {
  archiveType: ArchiveType;
  fiscalYear: number;
  recordCount: number;
  archivePath?: string;
  archivedBy: string;
  checksum: string; // Pre-calculated checksum
}

/**
 * Props for persistence/reconstruction
 */
export interface ArchivedDataPersistenceProps {
  id: string;
  archiveType: ArchiveType;
  fiscalYear: number;
  recordCount: number;
  archivePath: string | null;
  archivedAt: Date;
  archivedBy: string;
  checksum: string;
  createdAt: Date;
}

/**
 * ArchivedData entity
 * Tracks data archival for retention policy compliance
 */
export class ArchivedData {
  private constructor(
    public readonly id: string,
    public readonly archiveType: ArchiveType,
    public readonly fiscalYear: number,
    public readonly recordCount: number,
    public readonly archivePath: string | null,
    public readonly archivedAt: Date,
    public readonly archivedBy: string,
    public readonly checksum: string,
    public readonly createdAt: Date
  ) {}

  /**
   * Create a new archived data record
   */
  static create(props: ArchivedDataProps): ArchivedData {
    const now = new Date();

    return new ArchivedData(
      crypto.randomUUID(),
      props.archiveType,
      props.fiscalYear,
      props.recordCount,
      props.archivePath || null,
      now,
      props.archivedBy,
      props.checksum,
      now
    );
  }

  /**
   * Reconstruct from persistence
   */
  static fromPersistence(props: ArchivedDataPersistenceProps): ArchivedData {
    return new ArchivedData(
      props.id,
      props.archiveType,
      props.fiscalYear,
      props.recordCount,
      props.archivePath,
      props.archivedAt,
      props.archivedBy,
      props.checksum,
      props.createdAt
    );
  }

  /**
   * Calculate SHA-256 checksum for data integrity verification (async for Web Crypto API)
   */
  static async calculateChecksum(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Verify data integrity against stored checksum
   */
  async verifyIntegrity(data: string): Promise<boolean> {
    const calculatedChecksum = await ArchivedData.calculateChecksum(data);
    return calculatedChecksum === this.checksum;
  }

  /**
   * Get archive description
   */
  get description(): string {
    return `${this.archiveType} for fiscal year ${this.fiscalYear} (${this.recordCount} records)`;
  }

  /**
   * Check if archive is stored in cloud storage
   */
  get isStored(): boolean {
    return this.archivePath !== null;
  }

  /**
   * Get age of archive in days
   */
  getArchiveAgeInDays(): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - this.archivedAt.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
