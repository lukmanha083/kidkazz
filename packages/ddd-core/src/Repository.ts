/**
 * Repository interface pattern
 * Repositories provide collection-like interface for domain objects
 */
export interface IRepository<T> {
  /**
   * Find entity by ID
   */
  findById(id: string): Promise<T | null>;

  /**
   * Save entity (create or update)
   */
  save(entity: T): Promise<void>;

  /**
   * Delete entity
   */
  delete(id: string): Promise<void>;
}
