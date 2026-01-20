import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { Inventory } from '../../domain/entities/Inventory';
import type { IInventoryRepository } from '../../domain/repositories/IInventoryRepository';
import { inventory } from '../db/schema';

/**
 * Drizzle ORM implementation of Inventory Repository
 */
export class InventoryRepository implements IInventoryRepository {
  private db: ReturnType<typeof drizzle>;

  constructor(database: D1Database) {
    this.db = drizzle(database);
  }

  async findById(id: string): Promise<Inventory | null> {
    const result = await this.db.select().from(inventory).where(eq(inventory.id, id)).get();

    if (!result) {
      return null;
    }

    return Inventory.reconstitute(result as any);
  }

  async findByProductAndWarehouse(
    productId: string,
    warehouseId: string
  ): Promise<Inventory | null> {
    const result = await this.db
      .select()
      .from(inventory)
      .where(and(eq(inventory.productId, productId), eq(inventory.warehouseId, warehouseId)))
      .get();

    if (!result) {
      return null;
    }

    return Inventory.reconstitute(result as any);
  }

  async findByProduct(productId: string): Promise<Inventory[]> {
    const results = await this.db
      .select()
      .from(inventory)
      .where(eq(inventory.productId, productId))
      .all();

    return results.map((r) => Inventory.reconstitute(r as any));
  }

  async findByWarehouse(warehouseId: string): Promise<Inventory[]> {
    const results = await this.db
      .select()
      .from(inventory)
      .where(eq(inventory.warehouseId, warehouseId))
      .all();

    return results.map((r) => Inventory.reconstitute(r as any));
  }

  async findAll(filters?: {
    productId?: string;
    warehouseId?: string;
  }): Promise<Inventory[]> {
    let query = this.db.select().from(inventory);

    const conditions = [];
    if (filters?.productId) {
      conditions.push(eq(inventory.productId, filters.productId));
    }
    if (filters?.warehouseId) {
      conditions.push(eq(inventory.warehouseId, filters.warehouseId));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const results = await query.all();
    return results.map((r) => Inventory.reconstitute(r as any));
  }

  async save(inv: Inventory): Promise<void> {
    const data = inv.toData();

    // Check if inventory exists
    const existing = await this.db.select().from(inventory).where(eq(inventory.id, data.id)).get();

    if (existing) {
      // Update
      await this.db
        .update(inventory)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(inventory.id, data.id))
        .run();
    } else {
      // Insert
      await this.db
        .insert(inventory)
        .values(data as any)
        .run();
    }
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(inventory).where(eq(inventory.id, id)).run();
  }
}
