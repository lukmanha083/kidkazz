// ============================================================================
// Cash Threshold Repository Interface (for DI)
// ============================================================================

export interface ICashThresholdRepository {
  findCurrent(): Promise<CashThresholdConfig | null>;
  save(config: CashThresholdConfig): Promise<void>;
}

export interface CashThresholdConfig {
  id: string;
  warningThreshold: number;
  criticalThreshold: number;
  emergencyThreshold: number;
  updatedAt: Date;
  updatedBy: string;
}

// ============================================================================
// Update Cash Threshold Command
// ============================================================================

export interface UpdateCashThresholdCommand {
  warningThreshold: number;
  criticalThreshold: number;
  emergencyThreshold: number;
  updatedBy: string;
}

export interface UpdateCashThresholdResult {
  warningThreshold: number;
  criticalThreshold: number;
  emergencyThreshold: number;
  updatedAt: Date;
}

export class UpdateCashThresholdHandler {
  constructor(private readonly thresholdRepo: ICashThresholdRepository) {}

  async execute(command: UpdateCashThresholdCommand): Promise<UpdateCashThresholdResult> {
    // Validate updatedBy is non-empty
    if (!command.updatedBy || command.updatedBy.trim().length === 0) {
      throw new Error('updatedBy must be a non-empty string');
    }

    // Validate thresholds are finite non-negative numbers
    if (!Number.isFinite(command.warningThreshold) || command.warningThreshold < 0) {
      throw new Error('warningThreshold must be a non-negative finite number');
    }
    if (!Number.isFinite(command.criticalThreshold) || command.criticalThreshold < 0) {
      throw new Error('criticalThreshold must be a non-negative finite number');
    }
    if (!Number.isFinite(command.emergencyThreshold) || command.emergencyThreshold < 0) {
      throw new Error('emergencyThreshold must be a non-negative finite number');
    }

    // Validate thresholds order
    if (command.warningThreshold <= command.criticalThreshold) {
      throw new Error('Warning threshold must be greater than critical threshold');
    }
    if (command.criticalThreshold <= command.emergencyThreshold) {
      throw new Error('Critical threshold must be greater than emergency threshold');
    }

    const now = new Date();
    const config: CashThresholdConfig = {
      id: 'default', // Single config record
      warningThreshold: command.warningThreshold,
      criticalThreshold: command.criticalThreshold,
      emergencyThreshold: command.emergencyThreshold,
      updatedAt: now,
      updatedBy: command.updatedBy,
    };

    await this.thresholdRepo.save(config);

    return {
      warningThreshold: command.warningThreshold,
      criticalThreshold: command.criticalThreshold,
      emergencyThreshold: command.emergencyThreshold,
      updatedAt: now,
    };
  }
}

// ============================================================================
// Get Cash Threshold Query
// ============================================================================

export interface GetCashThresholdResult {
  warningThreshold: number;
  criticalThreshold: number;
  emergencyThreshold: number;
  updatedAt: Date;
  updatedBy: string;
}

export class GetCashThresholdHandler {
  // Default thresholds (in IDR)
  private static readonly DEFAULT_WARNING = 300_000_000; // Rp 300M
  private static readonly DEFAULT_CRITICAL = 275_000_000; // Rp 275M
  private static readonly DEFAULT_EMERGENCY = 250_000_000; // Rp 250M

  constructor(private readonly thresholdRepo: ICashThresholdRepository) {}

  async execute(): Promise<GetCashThresholdResult> {
    const config = await this.thresholdRepo.findCurrent();

    if (!config) {
      // Return defaults if not configured
      return {
        warningThreshold: GetCashThresholdHandler.DEFAULT_WARNING,
        criticalThreshold: GetCashThresholdHandler.DEFAULT_CRITICAL,
        emergencyThreshold: GetCashThresholdHandler.DEFAULT_EMERGENCY,
        updatedAt: new Date(),
        updatedBy: 'system',
      };
    }

    return {
      warningThreshold: config.warningThreshold,
      criticalThreshold: config.criticalThreshold,
      emergencyThreshold: config.emergencyThreshold,
      updatedAt: config.updatedAt,
      updatedBy: config.updatedBy,
    };
  }
}
