import { AggregateRoot } from '@kidkazz/ddd-core';
import { PartnerCode } from '../value-objects/PartnerCode';

export type EmploymentStatus = 'active' | 'on_leave' | 'terminated' | 'resigned';
export type Gender = 'male' | 'female';

interface EmployeeProps {
  id: string;
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
  employeeNumber: string;
  department: string | null;
  position: string | null;
  managerId: string | null;
  dateOfBirth: Date | null;
  gender: Gender | null;
  nationalId: string | null;
  npwp: string | null;
  joinDate: Date | null;
  endDate: Date | null;
  employmentStatus: EmploymentStatus;
  baseSalary: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
}

/**
 * Employee Aggregate Root
 * Represents internal staff (data only - no auth in this phase)
 */
export class Employee extends AggregateRoot {
  private props: EmployeeProps;

  private constructor(props: EmployeeProps) {
    super(props.id);
    this.props = props;
  }

  private static validate(input: {
    name: string;
    employeeNumber: string;
    gender?: Gender;
    baseSalary?: number;
  }): void {
    if (!input.name || input.name.trim().length === 0) {
      throw new Error('Employee name is required');
    }
    if (!input.employeeNumber || input.employeeNumber.trim().length === 0) {
      throw new Error('Employee number is required');
    }
    if (input.gender && !['male', 'female'].includes(input.gender)) {
      throw new Error('Gender must be either male or female');
    }
    if (input.baseSalary !== undefined && input.baseSalary < 0) {
      throw new Error('Base salary cannot be negative');
    }
  }

  public static create(input: {
    name: string;
    email?: string;
    phone?: string;
    employeeNumber: string;
    department?: string;
    position?: string;
    managerId?: string;
    dateOfBirth?: Date;
    gender?: Gender;
    nationalId?: string;
    npwp?: string;
    joinDate?: Date;
    baseSalary?: number;
  }): Employee {
    Employee.validate(input);

    const now = new Date();
    const id = `emp-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const code = PartnerCode.create('employee').getValue();

    return new Employee({
      id,
      code,
      name: input.name,
      email: input.email || null,
      phone: input.phone || null,
      employeeNumber: input.employeeNumber,
      department: input.department || null,
      position: input.position || null,
      managerId: input.managerId || null,
      dateOfBirth: input.dateOfBirth || null,
      gender: input.gender || null,
      nationalId: input.nationalId || null,
      npwp: input.npwp || null,
      joinDate: input.joinDate || null,
      endDate: null,
      employmentStatus: 'active',
      baseSalary: input.baseSalary ?? null,
      notes: null,
      createdAt: now,
      updatedAt: now,
      createdBy: null,
      updatedBy: null,
    });
  }

  public static reconstitute(data: EmployeeProps): Employee {
    return new Employee(data);
  }

  // Getters
  public getCode(): string {
    return this.props.code;
  }

  public getName(): string {
    return this.props.name;
  }

  public getEmail(): string | null {
    return this.props.email;
  }

  public getPhone(): string | null {
    return this.props.phone;
  }

  public getEmployeeNumber(): string {
    return this.props.employeeNumber;
  }

  public getDepartment(): string | null {
    return this.props.department;
  }

  public getPosition(): string | null {
    return this.props.position;
  }

  public getManagerId(): string | null {
    return this.props.managerId;
  }

  public getDateOfBirth(): Date | null {
    return this.props.dateOfBirth;
  }

  public getGender(): Gender | null {
    return this.props.gender;
  }

  public getNationalId(): string | null {
    return this.props.nationalId;
  }

  public getNpwp(): string | null {
    return this.props.npwp;
  }

  public getJoinDate(): Date | null {
    return this.props.joinDate;
  }

  public getEndDate(): Date | null {
    return this.props.endDate;
  }

  public getEmploymentStatus(): EmploymentStatus {
    return this.props.employmentStatus;
  }

  public getBaseSalary(): number | null {
    return this.props.baseSalary;
  }

  public isActive(): boolean {
    return this.props.employmentStatus === 'active';
  }

  // Employment Status Management
  public terminate(endDate: Date): void {
    this.props.employmentStatus = 'terminated';
    this.props.endDate = endDate;
    this.props.updatedAt = new Date();
  }

  public resign(endDate: Date): void {
    this.props.employmentStatus = 'resigned';
    this.props.endDate = endDate;
    this.props.updatedAt = new Date();
  }

  public putOnLeave(): void {
    this.props.employmentStatus = 'on_leave';
    this.props.updatedAt = new Date();
  }

  public activate(): void {
    this.props.employmentStatus = 'active';
    this.props.endDate = null;
    this.props.updatedAt = new Date();
  }

  // Manager Relationship
  public setManager(managerId: string): void {
    if (managerId === this.props.id) {
      throw new Error('Employee cannot be their own manager');
    }
    this.props.managerId = managerId;
    this.props.updatedAt = new Date();
  }

  public removeManager(): void {
    this.props.managerId = null;
    this.props.updatedAt = new Date();
  }

  // Department and Position
  public changeDepartment(department: string): void {
    this.props.department = department;
    this.props.updatedAt = new Date();
  }

  public changePosition(position: string): void {
    this.props.position = position;
    this.props.updatedAt = new Date();
  }

  // Salary
  public setBaseSalary(salary: number): void {
    if (salary < 0) {
      throw new Error('Base salary cannot be negative');
    }
    this.props.baseSalary = salary;
    this.props.updatedAt = new Date();
  }

  // Update
  public update(input: {
    name?: string;
    email?: string;
    phone?: string;
    dateOfBirth?: Date;
    gender?: Gender;
    nationalId?: string;
    npwp?: string;
    notes?: string;
  }): void {
    if (input.name !== undefined) {
      if (!input.name || input.name.trim().length === 0) {
        throw new Error('Employee name is required');
      }
      this.props.name = input.name;
    }
    if (input.email !== undefined) this.props.email = input.email || null;
    if (input.phone !== undefined) this.props.phone = input.phone || null;
    if (input.dateOfBirth !== undefined) this.props.dateOfBirth = input.dateOfBirth;
    if (input.gender !== undefined) {
      if (input.gender && !['male', 'female'].includes(input.gender)) {
        throw new Error('Gender must be either male or female');
      }
      this.props.gender = input.gender;
    }
    if (input.nationalId !== undefined) this.props.nationalId = input.nationalId || null;
    if (input.npwp !== undefined) this.props.npwp = input.npwp || null;
    if (input.notes !== undefined) this.props.notes = input.notes || null;
    this.props.updatedAt = new Date();
  }

  public toData() {
    return {
      id: this.props.id,
      code: this.props.code,
      name: this.props.name,
      email: this.props.email,
      phone: this.props.phone,
      employeeNumber: this.props.employeeNumber,
      department: this.props.department,
      position: this.props.position,
      managerId: this.props.managerId,
      dateOfBirth: this.props.dateOfBirth,
      gender: this.props.gender,
      nationalId: this.props.nationalId,
      npwp: this.props.npwp,
      joinDate: this.props.joinDate,
      endDate: this.props.endDate,
      employmentStatus: this.props.employmentStatus,
      baseSalary: this.props.baseSalary,
      notes: this.props.notes,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
      createdBy: this.props.createdBy,
      updatedBy: this.props.updatedBy,
    };
  }
}
