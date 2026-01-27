/**
 * Asset Status - Lifecycle states for fixed assets
 */
export enum AssetStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  FULLY_DEPRECIATED = 'FULLY_DEPRECIATED',
  DISPOSED = 'DISPOSED',
  WRITTEN_OFF = 'WRITTEN_OFF',
  SUSPENDED = 'SUSPENDED',
}

/**
 * Depreciation Method - Calculation methods for depreciation
 */
export enum DepreciationMethod {
  STRAIGHT_LINE = 'STRAIGHT_LINE',
  DECLINING_BALANCE = 'DECLINING_BALANCE',
  SUM_OF_YEARS_DIGITS = 'SUM_OF_YEARS_DIGITS',
  UNITS_OF_PRODUCTION = 'UNITS_OF_PRODUCTION',
}

/**
 * Acquisition Method - How the asset was acquired
 */
export enum AcquisitionMethod {
  PURCHASE = 'PURCHASE',
  LEASE = 'LEASE',
  DONATION = 'DONATION',
  TRANSFER = 'TRANSFER',
  CONSTRUCTION = 'CONSTRUCTION',
}

/**
 * Disposal Method - How the asset was disposed
 */
export enum DisposalMethod {
  SALE = 'SALE',
  SCRAP = 'SCRAP',
  DONATION = 'DONATION',
  TRADE_IN = 'TRADE_IN',
  THEFT = 'THEFT',
  DESTRUCTION = 'DESTRUCTION',
}

/**
 * Movement Type - Types of asset movements
 */
export enum MovementType {
  TRANSFER = 'TRANSFER',
  ASSIGNMENT = 'ASSIGNMENT',
  DISPOSAL = 'DISPOSAL',
  REVALUATION = 'REVALUATION',
  IMPAIRMENT = 'IMPAIRMENT',
}

/**
 * Maintenance Type - Types of maintenance activities
 */
export enum MaintenanceType {
  PREVENTIVE = 'PREVENTIVE',
  CORRECTIVE = 'CORRECTIVE',
  INSPECTION = 'INSPECTION',
  UPGRADE = 'UPGRADE',
  OVERHAUL = 'OVERHAUL',
}

/**
 * Maintenance Status - Status of maintenance records
 */
export enum MaintenanceStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

/**
 * Depreciation Schedule Status
 */
export enum DepreciationScheduleStatus {
  SCHEDULED = 'SCHEDULED',
  CALCULATED = 'CALCULATED',
  POSTED = 'POSTED',
  REVERSED = 'REVERSED',
}

/**
 * Depreciation Run Status
 */
export enum DepreciationRunStatus {
  CALCULATED = 'CALCULATED',
  POSTED = 'POSTED',
  REVERSED = 'REVERSED',
}

/**
 * Tax Asset Group - Indonesian PSAK 16 tax groups
 */
export enum TaxAssetGroup {
  GROUP_1 = 'GROUP_1', // 4 years
  GROUP_2 = 'GROUP_2', // 8 years
  GROUP_3 = 'GROUP_3', // 16 years
  GROUP_4 = 'GROUP_4', // 20 years
  NON_PERMANENT = 'NON_PERMANENT', // Non-permanent buildings
  PERMANENT = 'PERMANENT', // Permanent buildings (20 years)
}
