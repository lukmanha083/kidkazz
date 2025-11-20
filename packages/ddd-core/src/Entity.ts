/**
 * Base Entity class for DDD
 * Entities have identity and can be distinguished by their ID
 */
export abstract class Entity<T = string> {
  protected readonly _id: T;

  constructor(id: T) {
    this._id = id;
  }

  public getId(): T {
    return this._id;
  }

  public equals(entity?: Entity<T>): boolean {
    if (!entity) {
      return false;
    }

    if (this === entity) {
      return true;
    }

    return this._id === entity._id;
  }
}
