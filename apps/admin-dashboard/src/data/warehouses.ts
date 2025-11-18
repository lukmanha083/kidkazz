export interface Warehouse {
  id: string;
  code: string;
  name: string;
  location: string;
  address: string;
  city: string;
  postalCode: string;
  phone: string;
  manager: string;
  rack?: string;
  bin?: string;
  status: 'Active' | 'Inactive';
  createdAt: Date;
}

export const mockWarehouses: Warehouse[] = [
  {
    id: 'WH-001',
    code: 'WH-JKT-01',
    name: 'Main Warehouse Jakarta',
    location: 'Jakarta',
    address: 'Jl. Raya Industri No. 123',
    city: 'Jakarta',
    postalCode: '12345',
    phone: '+62 21 1234 5678',
    manager: 'Budi Santoso',
    rack: 'A-01',
    bin: 'BIN-001',
    status: 'Active',
    createdAt: new Date('2024-01-15'),
  },
  {
    id: 'WH-002',
    code: 'WH-SBY-01',
    name: 'Distribution Center Surabaya',
    location: 'Surabaya',
    address: 'Jl. Industri Raya No. 456',
    city: 'Surabaya',
    postalCode: '60234',
    phone: '+62 31 2345 6789',
    manager: 'Siti Rahayu',
    rack: 'B-12',
    bin: 'BIN-045',
    status: 'Active',
    createdAt: new Date('2024-02-20'),
  },
  {
    id: 'WH-003',
    code: 'WH-BDG-01',
    name: 'Regional Hub Bandung',
    location: 'Bandung',
    address: 'Jl. Soekarno Hatta No. 789',
    city: 'Bandung',
    postalCode: '40293',
    phone: '+62 22 3456 7890',
    manager: 'Ahmad Wijaya',
    rack: 'C-05',
    bin: 'BIN-023',
    status: 'Active',
    createdAt: new Date('2024-03-10'),
  },
];
