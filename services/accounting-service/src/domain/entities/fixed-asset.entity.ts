import { DepreciationCalculatorFactory, type DepreciationInput } from '@/domain/services';
import {
  type AcquisitionMethod,
  AssetStatus,
  type DepreciationMethod,
  type DisposalMethod,
} from '@/domain/value-objects';
import { nanoid } from 'nanoid';

/**
 * Props for creating a new FixedAsset
 */
export interface FixedAssetProps {
  assetNumber: string;
  name: string;
  description?: string;
  categoryId: string;
  // Physical identification
  serialNumber?: string;
  barcode?: string;
  manufacturer?: string;
  model?: string;
  // Location & Assignment
  locationId?: string;
  departmentId?: string;
  assignedToUserId?: string;
  // Acquisition details
  acquisitionDate: Date;
  acquisitionMethod: AcquisitionMethod;
  acquisitionCost: number;
  purchaseOrderId?: string;
  supplierId?: string;
  invoiceNumber?: string;
  // Depreciation settings
  usefulLifeMonths: number;
  salvageValue: number;
  depreciationMethod: DepreciationMethod;
  depreciationStartDate: Date;
  // Insurance & Warranty
  insurancePolicyNumber?: string;
  insuranceExpiryDate?: Date;
  warrantyExpiryDate?: Date;
  // Audit
  createdBy: string;
}

/**
 * Props for reconstituting from persistence
 */
export interface FixedAssetPersistenceProps extends FixedAssetProps {
  id: string;
  accumulatedDepreciation: number;
  bookValue: number;
  lastDepreciationDate?: Date;
  status: AssetStatus;
  // Disposal info
  disposalDate?: Date;
  disposalMethod?: DisposalMethod;
  disposalValue?: number;
  disposalReason?: string;
  gainLossOnDisposal?: number;
  // Verification
  lastVerifiedAt?: Date;
  lastVerifiedBy?: string;
  // Audit
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

/**
 * Disposal request
 */
export interface DisposeAssetRequest {
  method: DisposalMethod;
  value: number;
  reason: string;
  disposedBy: string;
}

/**
 * Disposal result
 */
export interface DisposalResult {
  bookValueAtDisposal: number;
  disposalValue: number;
  gainLoss: number;
  isGain: boolean;
}

/**
 * FixedAsset Entity (Aggregate Root)
 * Manages the lifecycle of a fixed asset from acquisition to disposal
 */
export class FixedAsset {
  private _id: string;
  private _assetNumber: string;
  private _name: string;
  private _description?: string;
  private _categoryId: string;
  // Physical identification
  private _serialNumber?: string;
  private _barcode?: string;
  private _manufacturer?: string;
  private _model?: string;
  // Location & Assignment
  private _locationId?: string;
  private _departmentId?: string;
  private _assignedToUserId?: string;
  // Acquisition details
  private _acquisitionDate: Date;
  private _acquisitionMethod: AcquisitionMethod;
  private _acquisitionCost: number;
  private _purchaseOrderId?: string;
  private _supplierId?: string;
  private _invoiceNumber?: string;
  // Depreciation settings
  private _usefulLifeMonths: number;
  private _salvageValue: number;
  private _depreciationMethod: DepreciationMethod;
  private _depreciationStartDate: Date;
  // Current values
  private _accumulatedDepreciation: number;
  private _bookValue: number;
  private _lastDepreciationDate?: Date;
  // Status
  private _status: AssetStatus;
  // Disposal info
  private _disposalDate?: Date;
  private _disposalMethod?: DisposalMethod;
  private _disposalValue?: number;
  private _disposalReason?: string;
  private _gainLossOnDisposal?: number;
  // Insurance & Warranty
  private _insurancePolicyNumber?: string;
  private _insuranceExpiryDate?: Date;
  private _warrantyExpiryDate?: Date;
  // Verification
  private _lastVerifiedAt?: Date;
  private _lastVerifiedBy?: string;
  // Audit
  private _createdBy: string;
  private _createdAt: Date;
  private _updatedAt: Date;
  private _version: number;

  private constructor(props: FixedAssetPersistenceProps) {
    this._id = props.id;
    this._assetNumber = props.assetNumber;
    this._name = props.name;
    this._description = props.description;
    this._categoryId = props.categoryId;
    this._serialNumber = props.serialNumber;
    this._barcode = props.barcode;
    this._manufacturer = props.manufacturer;
    this._model = props.model;
    this._locationId = props.locationId;
    this._departmentId = props.departmentId;
    this._assignedToUserId = props.assignedToUserId;
    this._acquisitionDate = props.acquisitionDate;
    this._acquisitionMethod = props.acquisitionMethod;
    this._acquisitionCost = props.acquisitionCost;
    this._purchaseOrderId = props.purchaseOrderId;
    this._supplierId = props.supplierId;
    this._invoiceNumber = props.invoiceNumber;
    this._usefulLifeMonths = props.usefulLifeMonths;
    this._salvageValue = props.salvageValue;
    this._depreciationMethod = props.depreciationMethod;
    this._depreciationStartDate = props.depreciationStartDate;
    this._accumulatedDepreciation = props.accumulatedDepreciation;
    this._bookValue = props.bookValue;
    this._lastDepreciationDate = props.lastDepreciationDate;
    this._status = props.status;
    this._disposalDate = props.disposalDate;
    this._disposalMethod = props.disposalMethod;
    this._disposalValue = props.disposalValue;
    this._disposalReason = props.disposalReason;
    this._gainLossOnDisposal = props.gainLossOnDisposal;
    this._insurancePolicyNumber = props.insurancePolicyNumber;
    this._insuranceExpiryDate = props.insuranceExpiryDate;
    this._warrantyExpiryDate = props.warrantyExpiryDate;
    this._lastVerifiedAt = props.lastVerifiedAt;
    this._lastVerifiedBy = props.lastVerifiedBy;
    this._createdBy = props.createdBy;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
    this._version = props.version;
  }

  /**
   * Create a new FixedAsset in DRAFT status
   */
  static create(props: FixedAssetProps): FixedAsset {
    // Validation
    if (props.acquisitionCost <= 0) {
      throw new Error('Acquisition cost must be positive');
    }
    if (props.salvageValue > props.acquisitionCost) {
      throw new Error('Salvage value cannot exceed acquisition cost');
    }
    if (props.usefulLifeMonths <= 0) {
      throw new Error('Useful life must be positive');
    }

    const now = new Date();

    return new FixedAsset({
      ...props,
      id: `ast-${nanoid(12)}`,
      accumulatedDepreciation: 0,
      bookValue: props.acquisitionCost,
      status: AssetStatus.DRAFT,
      createdAt: now,
      updatedAt: now,
      version: 1,
    });
  }

  /**
   * Reconstitute from persistence
   */
  static fromPersistence(props: FixedAssetPersistenceProps): FixedAsset {
    return new FixedAsset(props);
  }

  /**
   * Activate asset - starts depreciation eligibility
   */
  activate(): void {
    if (this._status !== AssetStatus.DRAFT) {
      throw new Error('Can only activate draft assets');
    }

    this._status = AssetStatus.ACTIVE;
    this._updatedAt = new Date();
    this._version++;
  }

  /**
   * Apply depreciation amount for a period
   */
  applyDepreciation(amount: number, period: { year: number; month: number }): void {
    if (this._status !== AssetStatus.ACTIVE) {
      throw new Error('Can only depreciate active assets');
    }

    // Cap depreciation at remaining depreciable amount
    const maxDepreciation = this._bookValue - this._salvageValue;
    const actualAmount = Math.min(amount, Math.max(0, maxDepreciation));

    this._accumulatedDepreciation += actualAmount;
    this._bookValue = this._acquisitionCost - this._accumulatedDepreciation;
    this._lastDepreciationDate = new Date(period.year, period.month - 1, 28); // Last day of period
    this._updatedAt = new Date();
    this._version++;

    // Check if fully depreciated
    if (this._bookValue <= this._salvageValue) {
      this._status = AssetStatus.FULLY_DEPRECIATED;
    }
  }

  /**
   * Dispose of the asset
   */
  dispose(request: DisposeAssetRequest): DisposalResult {
    if (this._status === AssetStatus.DISPOSED || this._status === AssetStatus.WRITTEN_OFF) {
      throw new Error('Asset is already disposed');
    }
    if (request.value < 0) {
      throw new Error('Disposal value cannot be negative');
    }

    const bookValueAtDisposal = this._bookValue;
    const gainLoss = request.value - bookValueAtDisposal;

    this._status = AssetStatus.DISPOSED;
    this._disposalDate = new Date();
    this._disposalMethod = request.method;
    this._disposalValue = request.value;
    this._disposalReason = request.reason;
    this._gainLossOnDisposal = gainLoss;
    this._updatedAt = new Date();
    this._version++;

    return {
      bookValueAtDisposal,
      disposalValue: request.value,
      gainLoss,
      isGain: gainLoss > 0,
    };
  }

  /**
   * Check if asset can be depreciated
   */
  isDepreciable(): boolean {
    if (this._status !== AssetStatus.ACTIVE) {
      return false;
    }
    if (this._bookValue <= this._salvageValue) {
      return false;
    }
    if (this._depreciationStartDate > new Date()) {
      return false;
    }
    return true;
  }

  /**
   * Calculate monthly depreciation using the asset's method
   */
  calculateMonthlyDepreciation(): number {
    const calculator = DepreciationCalculatorFactory.getCalculator(this._depreciationMethod);

    const input: DepreciationInput = {
      acquisitionCost: this._acquisitionCost,
      salvageValue: this._salvageValue,
      usefulLifeMonths: this._usefulLifeMonths,
      bookValue: this._bookValue,
      accumulatedDepreciation: this._accumulatedDepreciation,
      periodMonths: 1,
    };

    return calculator.calculate(input);
  }

  /**
   * Update location/department/assignment
   */
  transfer(updates: {
    locationId?: string;
    departmentId?: string;
    assignedToUserId?: string;
  }): void {
    if (updates.locationId !== undefined) {
      this._locationId = updates.locationId;
    }
    if (updates.departmentId !== undefined) {
      this._departmentId = updates.departmentId;
    }
    if (updates.assignedToUserId !== undefined) {
      this._assignedToUserId = updates.assignedToUserId;
    }
    this._updatedAt = new Date();
    this._version++;
  }

  /**
   * Record physical verification
   */
  verify(verifiedBy: string): void {
    this._lastVerifiedAt = new Date();
    this._lastVerifiedBy = verifiedBy;
    this._updatedAt = new Date();
    this._version++;
  }

  // Getters
  get id(): string {
    return this._id;
  }
  get assetNumber(): string {
    return this._assetNumber;
  }
  get name(): string {
    return this._name;
  }
  get description(): string | undefined {
    return this._description;
  }
  get categoryId(): string {
    return this._categoryId;
  }
  get serialNumber(): string | undefined {
    return this._serialNumber;
  }
  get barcode(): string | undefined {
    return this._barcode;
  }
  get manufacturer(): string | undefined {
    return this._manufacturer;
  }
  get model(): string | undefined {
    return this._model;
  }
  get locationId(): string | undefined {
    return this._locationId;
  }
  get departmentId(): string | undefined {
    return this._departmentId;
  }
  get assignedToUserId(): string | undefined {
    return this._assignedToUserId;
  }
  get acquisitionDate(): Date {
    return this._acquisitionDate;
  }
  get acquisitionMethod(): AcquisitionMethod {
    return this._acquisitionMethod;
  }
  get acquisitionCost(): number {
    return this._acquisitionCost;
  }
  get purchaseOrderId(): string | undefined {
    return this._purchaseOrderId;
  }
  get supplierId(): string | undefined {
    return this._supplierId;
  }
  get invoiceNumber(): string | undefined {
    return this._invoiceNumber;
  }
  get usefulLifeMonths(): number {
    return this._usefulLifeMonths;
  }
  get salvageValue(): number {
    return this._salvageValue;
  }
  get depreciationMethod(): DepreciationMethod {
    return this._depreciationMethod;
  }
  get depreciationStartDate(): Date {
    return this._depreciationStartDate;
  }
  get accumulatedDepreciation(): number {
    return this._accumulatedDepreciation;
  }
  get bookValue(): number {
    return this._bookValue;
  }
  get lastDepreciationDate(): Date | undefined {
    return this._lastDepreciationDate;
  }
  get status(): AssetStatus {
    return this._status;
  }
  get disposalDate(): Date | undefined {
    return this._disposalDate;
  }
  get disposalMethod(): DisposalMethod | undefined {
    return this._disposalMethod;
  }
  get disposalValue(): number | undefined {
    return this._disposalValue;
  }
  get disposalReason(): string | undefined {
    return this._disposalReason;
  }
  get gainLossOnDisposal(): number | undefined {
    return this._gainLossOnDisposal;
  }
  get insurancePolicyNumber(): string | undefined {
    return this._insurancePolicyNumber;
  }
  get insuranceExpiryDate(): Date | undefined {
    return this._insuranceExpiryDate;
  }
  get warrantyExpiryDate(): Date | undefined {
    return this._warrantyExpiryDate;
  }
  get lastVerifiedAt(): Date | undefined {
    return this._lastVerifiedAt;
  }
  get lastVerifiedBy(): string | undefined {
    return this._lastVerifiedBy;
  }
  get createdBy(): string {
    return this._createdBy;
  }
  get createdAt(): Date {
    return this._createdAt;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }
  get version(): number {
    return this._version;
  }
}
