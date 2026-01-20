import { describe, expect, it } from 'vitest';
import { Employee } from '../../../src/domain/entities/Employee';

describe('Employee Entity', () => {
  describe('create', () => {
    it('should create an employee with valid data', () => {
      const employee = Employee.create({
        name: 'John Doe',
        email: 'john.doe@company.com',
        phone: '+62812345678',
        employeeNumber: 'EMP001',
        department: 'Engineering',
        position: 'Software Engineer',
        joinDate: new Date('2024-01-15'),
      });

      expect(employee.getId()).toBeDefined();
      expect(employee.getCode()).toMatch(/^EMP-\d{4}$/);
      expect(employee.getName()).toBe('John Doe');
      expect(employee.getEmail()).toBe('john.doe@company.com');
      expect(employee.getEmployeeNumber()).toBe('EMP001');
      expect(employee.getDepartment()).toBe('Engineering');
      expect(employee.getPosition()).toBe('Software Engineer');
      expect(employee.getEmploymentStatus()).toBe('active');
    });

    it('should create an employee with personal info', () => {
      const employee = Employee.create({
        name: 'John Doe',
        employeeNumber: 'EMP001',
        dateOfBirth: new Date('1990-05-15'),
        gender: 'male',
        nationalId: '3201234567890001',
        npwp: '01.234.567.8-901.000',
      });

      expect(employee.getDateOfBirth()?.toISOString()).toContain('1990-05-15');
      expect(employee.getGender()).toBe('male');
      expect(employee.getNationalId()).toBe('3201234567890001');
      expect(employee.getNpwp()).toBe('01.234.567.8-901.000');
    });

    it('should throw error if name is empty', () => {
      expect(() =>
        Employee.create({
          name: '',
          employeeNumber: 'EMP001',
        })
      ).toThrow('Employee name is required');
    });

    it('should throw error if employee number is empty', () => {
      expect(() =>
        Employee.create({
          name: 'John Doe',
          employeeNumber: '',
        })
      ).toThrow('Employee number is required');
    });

    it('should throw error if gender is invalid', () => {
      expect(() =>
        Employee.create({
          name: 'John Doe',
          employeeNumber: 'EMP001',
          gender: 'invalid' as any,
        })
      ).toThrow('Gender must be either male or female');
    });

    it('should throw error if base salary is negative', () => {
      expect(() =>
        Employee.create({
          name: 'John Doe',
          employeeNumber: 'EMP001',
          baseSalary: -1000000,
        })
      ).toThrow('Base salary cannot be negative');
    });

    it('should allow zero base salary', () => {
      const employee = Employee.create({
        name: 'John Doe',
        employeeNumber: 'EMP001',
        baseSalary: 0,
      });

      expect(employee.getBaseSalary()).toBe(0);
    });
  });

  describe('employment status management', () => {
    it('should terminate an employee', () => {
      const employee = Employee.create({
        name: 'John Doe',
        employeeNumber: 'EMP001',
      });

      const endDate = new Date('2024-06-30');
      employee.terminate(endDate);

      expect(employee.getEmploymentStatus()).toBe('terminated');
      expect(employee.getEndDate()).toEqual(endDate);
    });

    it('should put employee on leave', () => {
      const employee = Employee.create({
        name: 'John Doe',
        employeeNumber: 'EMP001',
      });

      employee.putOnLeave();
      expect(employee.getEmploymentStatus()).toBe('on_leave');
    });

    it('should mark employee as resigned', () => {
      const employee = Employee.create({
        name: 'John Doe',
        employeeNumber: 'EMP001',
      });

      const endDate = new Date('2024-06-30');
      employee.resign(endDate);

      expect(employee.getEmploymentStatus()).toBe('resigned');
      expect(employee.getEndDate()).toEqual(endDate);
    });

    it('should reactivate an employee from on_leave', () => {
      const employee = Employee.create({
        name: 'John Doe',
        employeeNumber: 'EMP001',
      });

      employee.putOnLeave();
      employee.activate();
      expect(employee.getEmploymentStatus()).toBe('active');
    });

    it('should reactivate a terminated employee and clear endDate', () => {
      const employee = Employee.create({
        name: 'John Doe',
        employeeNumber: 'EMP001',
      });

      const endDate = new Date('2024-06-30');
      employee.terminate(endDate);
      expect(employee.getEndDate()).toEqual(endDate);

      employee.activate();
      expect(employee.getEmploymentStatus()).toBe('active');
      expect(employee.getEndDate()).toBeNull();
    });

    it('should reactivate a resigned employee and clear endDate', () => {
      const employee = Employee.create({
        name: 'John Doe',
        employeeNumber: 'EMP001',
      });

      const endDate = new Date('2024-06-30');
      employee.resign(endDate);
      expect(employee.getEndDate()).toEqual(endDate);

      employee.activate();
      expect(employee.getEmploymentStatus()).toBe('active');
      expect(employee.getEndDate()).toBeNull();
    });

    it('should check if employee is active', () => {
      const employee = Employee.create({
        name: 'John Doe',
        employeeNumber: 'EMP001',
      });

      expect(employee.isActive()).toBe(true);

      employee.putOnLeave();
      expect(employee.isActive()).toBe(false);
    });
  });

  describe('manager relationship', () => {
    it('should set manager', () => {
      const employee = Employee.create({
        name: 'John Doe',
        employeeNumber: 'EMP001',
      });

      employee.setManager('manager-123');
      expect(employee.getManagerId()).toBe('manager-123');
    });

    it('should remove manager', () => {
      const employee = Employee.create({
        name: 'John Doe',
        employeeNumber: 'EMP001',
        managerId: 'manager-123',
      });

      employee.removeManager();
      expect(employee.getManagerId()).toBeNull();
    });

    it('should throw error if setting self as manager', () => {
      const employee = Employee.create({
        name: 'John Doe',
        employeeNumber: 'EMP001',
      });

      expect(() => employee.setManager(employee.getId())).toThrow(
        'Employee cannot be their own manager'
      );
    });
  });

  describe('department and position', () => {
    it('should update department', () => {
      const employee = Employee.create({
        name: 'John Doe',
        employeeNumber: 'EMP001',
        department: 'Engineering',
      });

      employee.changeDepartment('Product');
      expect(employee.getDepartment()).toBe('Product');
    });

    it('should update position', () => {
      const employee = Employee.create({
        name: 'John Doe',
        employeeNumber: 'EMP001',
        position: 'Junior Engineer',
      });

      employee.changePosition('Senior Engineer');
      expect(employee.getPosition()).toBe('Senior Engineer');
    });
  });

  describe('salary', () => {
    it('should set base salary', () => {
      const employee = Employee.create({
        name: 'John Doe',
        employeeNumber: 'EMP001',
      });

      employee.setBaseSalary(10000000);
      expect(employee.getBaseSalary()).toBe(10000000);
    });

    it('should throw error if salary is negative', () => {
      const employee = Employee.create({
        name: 'John Doe',
        employeeNumber: 'EMP001',
      });

      expect(() => employee.setBaseSalary(-1000000)).toThrow('Base salary cannot be negative');
    });
  });

  describe('update', () => {
    it('should update employee details', () => {
      const employee = Employee.create({
        name: 'John Doe',
        employeeNumber: 'EMP001',
        email: 'john@company.com',
      });

      employee.update({
        name: 'John Doe Updated',
        email: 'john.doe@company.com',
        phone: '+62812345678',
      });

      expect(employee.getName()).toBe('John Doe Updated');
      expect(employee.getEmail()).toBe('john.doe@company.com');
      expect(employee.getPhone()).toBe('+62812345678');
    });

    it('should throw error when updating with invalid gender', () => {
      const employee = Employee.create({
        name: 'John Doe',
        employeeNumber: 'EMP001',
      });

      expect(() => employee.update({ gender: 'invalid' as any })).toThrow(
        'Gender must be either male or female'
      );
    });

    it('should allow updating gender to valid value', () => {
      const employee = Employee.create({
        name: 'John Doe',
        employeeNumber: 'EMP001',
      });

      employee.update({ gender: 'female' });
      expect(employee.getGender()).toBe('female');
    });
  });

  describe('reconstitute', () => {
    it('should reconstitute employee from persistence data', () => {
      const data = {
        id: 'emp-123',
        code: 'EMP-0001',
        name: 'John Doe',
        email: 'john.doe@company.com',
        phone: '+62812345678',
        employeeNumber: 'EMP001',
        department: 'Engineering',
        position: 'Software Engineer',
        managerId: 'manager-123',
        dateOfBirth: new Date('1990-05-15'),
        gender: 'male' as const,
        nationalId: '3201234567890001',
        npwp: '01.234.567.8-901.000',
        joinDate: new Date('2024-01-15'),
        endDate: null,
        employmentStatus: 'active' as const,
        baseSalary: 10000000,
        notes: 'Good employee',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
        createdBy: 'admin',
        updatedBy: 'admin',
      };

      const employee = Employee.reconstitute(data);

      expect(employee.getId()).toBe('emp-123');
      expect(employee.getCode()).toBe('EMP-0001');
      expect(employee.getName()).toBe('John Doe');
      expect(employee.getEmployeeNumber()).toBe('EMP001');
      expect(employee.getDepartment()).toBe('Engineering');
      expect(employee.getManagerId()).toBe('manager-123');
    });
  });

  describe('toData', () => {
    it('should convert employee to persistence data', () => {
      const employee = Employee.create({
        name: 'John Doe',
        email: 'john.doe@company.com',
        employeeNumber: 'EMP001',
        department: 'Engineering',
      });

      const data = employee.toData();

      expect(data.id).toBeDefined();
      expect(data.code).toMatch(/^EMP-\d{4}$/);
      expect(data.name).toBe('John Doe');
      expect(data.email).toBe('john.doe@company.com');
      expect(data.employeeNumber).toBe('EMP001');
      expect(data.department).toBe('Engineering');
      expect(data.employmentStatus).toBe('active');
      expect(data.createdAt).toBeInstanceOf(Date);
    });
  });
});
