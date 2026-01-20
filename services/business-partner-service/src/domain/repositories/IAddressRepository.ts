import type { IRepository } from '@kidkazz/ddd-core';
import type { Address, OwnerType } from '../value-objects/Address';

export interface IAddressRepository extends IRepository<Address> {
  findByOwner(ownerType: OwnerType, ownerId: string): Promise<Address[]>;
  findPrimaryByOwner(ownerType: OwnerType, ownerId: string): Promise<Address | null>;
  deleteByOwner(ownerType: OwnerType, ownerId: string): Promise<void>;
}
