/**
 * Base ValueObject class for DDD
 * Value Objects are immutable and compared by their values, not identity
 */
export abstract class ValueObject<T> {
  protected readonly _value: T;

  constructor(value: T) {
    this._value = value;
    this.validate(value);
  }

  /**
   * Override this method to add validation logic
   */
  protected abstract validate(value: T): void;

  public getValue(): T {
    return this._value;
  }

  public equals(vo?: ValueObject<T>): boolean {
    if (!vo) {
      return false;
    }

    if (this === vo) {
      return true;
    }

    return JSON.stringify(this._value) === JSON.stringify(vo._value);
  }
}
