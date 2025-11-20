import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { IWarehouseRepository } from '../../domain/repositories/IWarehouseRepository';
import { Warehouse } from '../../domain/entities/Warehouse';
import { warehouses } from '../db/schema';

/**
 * Drizzle ORM implementation of Warehouse Repository
 */
export class WarehouseRepository implements IWarehouseRepository {
  private db: ReturnType<typeof drizzle>;

  constructor(database: D1Database) {
    this.db = drizzle(database);
  }

  async findById(id: string): Promise<Warehouse | null> {
    const result = await this.db
      .select()
      .from(warehouses)
      .where(eq(warehouses.id, id))
      .get();

    if (!result) {
      return null;
    }

    return Warehouse.reconstitute(result as any);
  }

  async findByCode(code: string): Promise<Warehouse | null> {
    const result = await this.db
      .select()
      .from(warehouses)
      .where(eq(warehouses.code, code))
      .get();

    if (!result) {
      return null;
    }

    return Warehouse.reconstitute(result as any);
  }

  async findAll(status?: string): Promise<Warehouse[]> {
    let query = this.db.select().from(warehouses);

    if (status) {
      query = query.where(eq(warehouses.status, status)) as any;
    }

    const results = await query.all();
    return results.map(r => Warehouse.reconstitute(r as any));
  }

  async findActive(): Promise<Warehouse[]> {
    const results = await this.db
      .select()
      .from(warehouses)
      .where(eq(warehouses.status, 'active'))
      .all();

    return results.map(r => Warehouse.reconstitute(r as any));
  }

  async save(warehouse: Warehouse): Promise<void> {
    const data = warehouse.toData();

    // Check if warehouse exists
    const existing = await this.db
      .select()
      .from(warehouses)
      .where(eq(warehouses.id, data.id))
      .get();

    if (existing) {
      // Update
      await this.db
        .update(warehouses)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(warehouses.id, data.id))
        .run();
    } else {
      // Insert
      await this.db.insert(warehouses).values(data as any).run();
    }
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(warehouses).where(eq(warehouses.id, id)).run();
  }
}
