# HRM Service Business Rules

## Overview

This document describes all business rules implemented in the HRM Service for payroll processing, attendance tracking, and leave management in compliance with Indonesian labor law.

---

## Attendance Rules

### Rule 1: Single Clock-In Per Day

**Rule**: An employee can only clock in once per day. Subsequent clock-in attempts are rejected.

**Business Rationale**:
- Prevents duplicate attendance records
- Ensures accurate working hour calculation

**Implementation**:
```typescript
public async clockIn(employeeId: string, data: ClockInData): Promise<Attendance> {
  const today = getDateOnly(new Date());
  const existing = await this.repository.findByEmployeeAndDate(employeeId, today);

  if (existing?.clockIn) {
    throw new Error('Already clocked in today');
  }

  // Proceed with clock in
}
```

**Error Message**: "Already clocked in today"

---

### Rule 2: Clock-Out Requires Clock-In

**Rule**: Employee must clock in before clocking out.

**Business Rationale**:
- Logical work flow
- Accurate duration calculation

**Implementation**:
```typescript
public async clockOut(employeeId: string, data: ClockOutData): Promise<Attendance> {
  const today = getDateOnly(new Date());
  const attendance = await this.repository.findByEmployeeAndDate(employeeId, today);

  if (!attendance?.clockIn) {
    throw new Error('Must clock in before clocking out');
  }

  if (attendance.clockOut) {
    throw new Error('Already clocked out today');
  }

  // Proceed with clock out
}
```

**Error Message**: "Must clock in before clocking out"

---

### Rule 3: Grace Period for Late Arrival

**Rule**: Employees have a configurable grace period (default 15 minutes) before being marked as late.

**Business Rationale**:
- Reasonable tolerance for minor delays
- Configurable per work schedule

**Implementation**:
```typescript
public calculateLateMinutes(clockInTime: Date, scheduleStart: string, graceMinutes: number): number {
  const expectedStart = parseTime(scheduleStart);
  const gracePeriodEnd = addMinutes(expectedStart, graceMinutes);

  if (clockInTime <= gracePeriodEnd) {
    return 0; // Within grace period
  }

  return differenceInMinutes(clockInTime, expectedStart);
}
```

---

### Rule 4: Overtime Threshold

**Rule**: Working hours beyond 8 hours (480 minutes) per day are considered overtime.

**Business Rationale**:
- Indonesian labor law: standard work day is 8 hours
- Overtime must be compensated

**Implementation**:
```typescript
const STANDARD_WORKING_MINUTES = 480; // 8 hours

public calculateOvertime(workingMinutes: number): number {
  if (workingMinutes <= STANDARD_WORKING_MINUTES) {
    return 0;
  }
  return workingMinutes - STANDARD_WORKING_MINUTES;
}
```

---

### Rule 5: Maximum Overtime Per Day

**Rule**: Maximum overtime is 3 hours on weekdays, 4 hours on rest days.

**Business Rationale**:
- Indonesian labor law limits (UU Ketenagakerjaan)
- Employee welfare

**Implementation**:
```typescript
const MAX_OVERTIME_WEEKDAY = 180;  // 3 hours
const MAX_OVERTIME_RESTDAY = 240;  // 4 hours

public validateOvertime(overtimeMinutes: number, isRestDay: boolean): void {
  const maxAllowed = isRestDay ? MAX_OVERTIME_RESTDAY : MAX_OVERTIME_WEEKDAY;

  if (overtimeMinutes > maxAllowed) {
    // Log warning but don't reject - may need management approval
    this.logger.warn(`Overtime exceeds maximum: ${overtimeMinutes} > ${maxAllowed}`);
  }
}
```

---

### Rule 6: Geofencing (Optional)

**Rule**: If enabled, clock-in/out location must be within allowed radius from office/store.

**Business Rationale**:
- Ensures physical presence
- Prevents remote clock-in fraud

**Implementation**:
```typescript
public validateLocation(location: GeoLocation, allowedLocations: GeoLocation[], radiusMeters: number): void {
  const isWithinRadius = allowedLocations.some(allowed =>
    calculateDistance(location, allowed) <= radiusMeters
  );

  if (!isWithinRadius) {
    throw new Error(`Location is outside allowed area (${radiusMeters}m radius)`);
  }
}
```

**Error Message**: "Location is outside allowed area"

---

## Leave Management Rules

### Rule 7: Annual Leave Entitlement

**Rule**: Employees are entitled to 12 days of annual leave per year after completing 12 months of continuous employment.

**Business Rationale**:
- Indonesian labor law (UU No. 13/2003)
- Employee welfare

**Implementation**:
```typescript
const ANNUAL_LEAVE_ENTITLEMENT = 12;

public calculateEntitlement(hireDate: Date, currentYear: number): number {
  const yearsOfService = differenceInYears(new Date(currentYear, 0, 1), hireDate);

  if (yearsOfService < 1) {
    // Pro-rata for first year (after probation)
    const monthsWorked = differenceInMonths(new Date(), hireDate);
    return Math.floor((monthsWorked / 12) * ANNUAL_LEAVE_ENTITLEMENT);
  }

  return ANNUAL_LEAVE_ENTITLEMENT;
}
```

---

### Rule 8: Leave Balance Cannot Go Negative

**Rule**: Leave requests cannot exceed available balance (except for certain leave types).

**Business Rationale**:
- Prevents over-utilization
- Financial planning

**Implementation**:
```typescript
public validateLeaveBalance(employeeId: string, leaveType: LeaveType, days: number): void {
  const balance = await this.getLeaveBalance(employeeId);

  if (leaveType === 'ANNUAL') {
    if (days > balance.annualLeaveBalance) {
      throw new Error(`Insufficient annual leave balance. Available: ${balance.annualLeaveBalance} days`);
    }
  }

  // Sick leave, maternity, bereavement don't check balance
}
```

**Error Message**: "Insufficient annual leave balance"

---

### Rule 9: Maximum Leave Carry Over

**Rule**: Maximum 6 days of unused annual leave can be carried over to next year. Expires by June 30.

**Business Rationale**:
- Encourages leave utilization
- Limits liability
- Common practice in Indonesia

**Implementation**:
```typescript
const MAX_CARRY_OVER = 6;
const CARRY_OVER_EXPIRY_MONTH = 6; // June

public calculateCarryOver(unusedDays: number): number {
  return Math.min(unusedDays, MAX_CARRY_OVER);
}

public processYearEndCarryOver(): void {
  // At year end, carry over up to 6 days
  const carryOver = Math.min(this.annualLeaveBalance, MAX_CARRY_OVER);
  this.annualLeaveCarryOver = carryOver;

  // Reset annual leave for new year
  this.annualLeaveBalance = this.annualLeaveEntitlement + carryOver;
}
```

---

### Rule 10: Minimum Leave Request Notice

**Rule**: Annual leave requests must be submitted at least 3 working days in advance.

**Business Rationale**:
- Allows for planning
- Work coverage arrangement

**Exception**: Emergency/sick leave exempt from notice requirement.

**Implementation**:
```typescript
const MIN_NOTICE_DAYS = 3;

public validateLeaveNotice(leaveType: LeaveType, startDate: Date): void {
  if (leaveType === 'SICK' || leaveType === 'BEREAVEMENT') {
    return; // No notice required
  }

  const workingDaysUntilLeave = countWorkingDays(new Date(), startDate);

  if (workingDaysUntilLeave < MIN_NOTICE_DAYS) {
    throw new Error(`Leave request must be submitted at least ${MIN_NOTICE_DAYS} working days in advance`);
  }
}
```

**Error Message**: "Leave request must be submitted at least 3 working days in advance"

---

### Rule 11: Leave Types and Duration

| Leave Type | Duration | Paid | Notes |
|------------|----------|------|-------|
| Annual (Cuti Tahunan) | 12 days/year | Yes | After 12 months service |
| Sick (Sakit) | As needed | Yes | Doctor's note required > 2 days |
| Maternity (Melahirkan) | 3 months | Yes | 1.5 months before, 1.5 months after |
| Paternity (Cuti Ayah) | 2 days | Yes | At birth |
| Marriage (Nikah) | 3 days | Yes | Employee's own marriage |
| Marriage Child | 2 days | Yes | Employee's child marriage |
| Bereavement - Immediate | 3 days | Yes | Spouse, parent, child, in-law |
| Bereavement - Extended | 2 days | Yes | Grandparent, sibling |
| Religious (Haji) | Up to 40 days | Yes | Once during employment |
| Unpaid (Tanpa Gaji) | As approved | No | Requires approval |

**Implementation**:
```typescript
const LEAVE_DURATIONS: Record<LeaveType, { maxDays: number; paid: boolean }> = {
  ANNUAL: { maxDays: 12, paid: true },
  SICK: { maxDays: 365, paid: true },      // Unlimited but tracked
  MATERNITY: { maxDays: 90, paid: true },  // 3 months
  PATERNITY: { maxDays: 2, paid: true },
  MARRIAGE: { maxDays: 3, paid: true },
  BEREAVEMENT: { maxDays: 3, paid: true },
  RELIGIOUS: { maxDays: 40, paid: true },
  UNPAID: { maxDays: 365, paid: false },
};
```

---

### Rule 12: Leave Approval Workflow

**Rule**: Leave requests require approval from direct manager or HR.

**Business Rationale**:
- Ensures work coverage
- Prevents scheduling conflicts

**Implementation**:
```typescript
public async requestLeave(employeeId: string, data: LeaveRequestData): Promise<Leave> {
  // Validate balance, notice period, etc.
  this.validateLeaveRequest(data);

  const leave = Leave.create({
    ...data,
    status: 'PENDING',
    requestedAt: new Date(),
  });

  // Notify manager
  await this.eventPublisher.publish(new LeaveRequested({
    employeeId,
    leaveId: leave.id,
    managerId: await this.getManagerId(employeeId),
  }));

  return leave;
}
```

---

## Payroll Rules

### Rule 13: Payroll Period Lock

**Rule**: Payroll period cannot be modified after approval.

**Business Rationale**:
- Data integrity
- Audit trail
- Legal compliance

**Implementation**:
```typescript
public updatePayroll(payrollId: string, changes: Partial<Payroll>): void {
  const payroll = this.repository.findById(payrollId);

  if (['APPROVED', 'PAID', 'CLOSED'].includes(payroll.status)) {
    throw new Error('Cannot modify approved or paid payroll');
  }

  // Proceed with update
}
```

**Error Message**: "Cannot modify approved or paid payroll"

---

### Rule 14: PPh 21 Tax-Free Threshold (PTKP)

**Rule**: Employees with monthly salary at or below PTKP threshold pay NO PPh 21.

**PTKP Values (2025-2026)**:

| Status | Description | Annual PTKP | Monthly Equivalent |
|--------|-------------|-------------|-------------------|
| TK/0 | Single, no dependents | Rp 54,000,000 | Rp 4,500,000 |
| TK/1 | Single, 1 dependent | Rp 58,500,000 | Rp 4,875,000 |
| TK/2 | Single, 2 dependents | Rp 63,000,000 | Rp 5,250,000 |
| TK/3 | Single, 3 dependents | Rp 67,500,000 | Rp 5,625,000 |
| K/0 | Married, no dependents | Rp 58,500,000 | Rp 4,875,000 |
| K/1 | Married, 1 dependent | Rp 63,000,000 | Rp 5,250,000 |
| K/2 | Married, 2 dependents | Rp 67,500,000 | Rp 5,625,000 |
| K/3 | Married, 3 dependents | Rp 72,000,000 | Rp 6,000,000 |

**Business Rationale**:
- UU HPP No. 7/2021 compliance
- Protects low-income earners

**Implementation**:
```typescript
const PTKP_VALUES: Record<PTKPStatus, number> = {
  'TK/0': 54_000_000,
  'TK/1': 58_500_000,
  'TK/2': 63_000_000,
  'TK/3': 67_500_000,
  'K/0':  58_500_000,
  'K/1':  63_000_000,
  'K/2':  67_500_000,
  'K/3':  72_000_000,
};

public isBelowPTKP(annualGross: number, ptkpStatus: PTKPStatus): boolean {
  return annualGross <= PTKP_VALUES[ptkpStatus];
}
```

---

### Rule 15: PPh 21 Calculation Methods

**Rule**: If salary > PTKP, PPh 21 uses TER (Tarif Efektif Rata-rata) for monthly calculation, progressive rates for year-end.

**PPh 21 Decision Flow**:
```
If (Monthly Salary ≤ Monthly PTKP)
  → PPh 21 = Rp 0 (No tax)

If (Monthly Salary > Monthly PTKP)
  → PPh 21 = Salary × TER Rate (based on PTKP status category)
```

**Business Rationale**:
- PMK 168/2023 compliance
- Simplifies monthly withholding
- Accurate annual tax

**Implementation**:
```typescript
public calculatePPh21(grossSalary: number, ptkpStatus: PTKPStatus, isYearEnd: boolean): number {
  const monthlyPTKP = PTKP_VALUES[ptkpStatus] / 12;

  // If salary is at or below PTKP, no tax
  if (grossSalary <= monthlyPTKP) {
    return 0;
  }

  if (isYearEnd) {
    // Use progressive rates (Pasal 17)
    const annualIncome = grossSalary * 12;
    const ptkp = PTKP_VALUES[ptkpStatus];
    const pkp = Math.max(0, annualIncome - ptkp);
    return calculateProgressiveTax(pkp);
  } else {
    // Use TER for monthly
    const terCategory = TER_CATEGORY_MAP[ptkpStatus];
    const terRate = getTERRate(terCategory, grossSalary);
    return grossSalary * terRate;
  }
}
```

> **Note on PPh 21 DTP (Ditanggung Pemerintah) 2025-2026**:
>
> For employees in specific sectors (footwear, textile, furniture, leather, tourism) with salary ≤ Rp 10 million, PPh 21 is covered by government (PMK 10/2025, PMK 105/2025). Since Kidkazz is a trading/retail company, this incentive does **NOT** apply. PPh 21 follows standard PTKP and TER rules.

---

### Rule 16: BPJS Kesehatan Salary Cap

**Rule**: BPJS Kesehatan contribution is calculated on maximum salary of Rp 12,000,000.

**Business Rationale**:
- BPJS regulation
- Caps contribution for high earners

**Implementation**:
```typescript
const BPJS_KESEHATAN_MAX = 12_000_000;
const BPJS_KESEHATAN_RATE = 0.05; // 5% total (4% company, 1% employee)

public calculateBpjsKesehatan(salary: number): { company: number; employee: number } {
  const base = Math.min(salary, BPJS_KESEHATAN_MAX);
  return {
    company: base * 0.04,
    employee: base * 0.01,
  };
}
```

---

### Rule 17: BPJS Jaminan Pensiun Salary Cap

**Rule**: BPJS JP contribution is calculated on maximum salary of Rp 10,547,400 (2026).

**Business Rationale**:
- BPJS regulation
- Adjusted annually

**Implementation**:
```typescript
const BPJS_JP_MAX_2026 = 10_547_400;
const BPJS_JP_RATE = 0.03; // 3% total (2% company, 1% employee)

public calculateBpjsJP(salary: number): { company: number; employee: number } {
  const base = Math.min(salary, BPJS_JP_MAX_2026);
  return {
    company: base * 0.02,
    employee: base * 0.01,
  };
}
```

---

### Rule 18: Overtime Pay Calculation

**Rule**: Overtime pay rates vary by day type and hours worked.

| Day Type | Hours | Rate |
|----------|-------|------|
| Weekday | 1st hour | 1.5x hourly |
| Weekday | 2nd+ hours | 2.0x hourly |
| Weekend/Holiday | 1-7 hours | 2.0x hourly |
| Weekend/Holiday | 8th hour | 3.0x hourly |
| Weekend/Holiday | 9th+ hours | 4.0x hourly |

**Hourly Rate Formula**: Basic Salary / 173

**Business Rationale**:
- Indonesian labor law
- Compensates for extra work

**Implementation**:
```typescript
const HOURS_PER_MONTH = 173;

public calculateOvertimePay(basicSalary: number, hours: number, isHoliday: boolean): number {
  const hourlyRate = basicSalary / HOURS_PER_MONTH;
  let pay = 0;

  if (isHoliday) {
    if (hours <= 7) pay = hours * hourlyRate * 2.0;
    else if (hours === 8) pay = 7 * hourlyRate * 2.0 + 1 * hourlyRate * 3.0;
    else pay = 7 * hourlyRate * 2.0 + 1 * hourlyRate * 3.0 + (hours - 8) * hourlyRate * 4.0;
  } else {
    if (hours <= 1) pay = hours * hourlyRate * 1.5;
    else pay = 1 * hourlyRate * 1.5 + (hours - 1) * hourlyRate * 2.0;
  }

  return Math.round(pay);
}
```

---

### Rule 19: Absence Deduction

**Rule**: Unauthorized absence results in salary deduction: (Daily Rate × Absent Days).

**Daily Rate Formula**: (Basic Salary + Fixed Allowances) / Working Days in Month

**Business Rationale**:
- No work, no pay principle
- Discourages absenteeism

**Implementation**:
```typescript
public calculateAbsenceDeduction(
  basicSalary: number,
  fixedAllowances: number,
  absentDays: number,
  workingDaysInMonth: number
): number {
  const dailyRate = (basicSalary + fixedAllowances) / workingDaysInMonth;
  return Math.round(dailyRate * absentDays);
}
```

---

### Rule 20: Loan Deduction Priority

**Rule**: Loan deductions are applied after BPJS but before PPh 21 calculation.

**Business Rationale**:
- Ensures loan recovery
- Proper tax calculation base

**Deduction Order**:
1. BPJS Employee contributions
2. Loan deductions
3. PPh 21 (calculated on gross - BPJS)
4. Other deductions

---

### Rule 21: Minimum Wage Compliance

**Rule**: Total compensation must meet or exceed regional minimum wage (UMR/UMP).

**Business Rationale**:
- Legal compliance
- Employee protection

**Implementation**:
```typescript
public validateMinimumWage(grossSalary: number, regionCode: string): void {
  const minimumWage = getRegionalMinimumWage(regionCode);

  if (grossSalary < minimumWage) {
    throw new Error(`Salary below minimum wage. Minimum: ${formatCurrency(minimumWage)}`);
  }
}
```

---

## Salary Structure Rules

### Rule 22: Effective Date Requirement

**Rule**: Salary changes must have a future effective date.

**Business Rationale**:
- No retroactive changes (except corrections)
- Clear audit trail

**Implementation**:
```typescript
public updateSalary(employeeId: string, newSalary: SalaryData, effectiveDate: Date): void {
  if (effectiveDate <= new Date()) {
    throw new Error('Effective date must be in the future');
  }

  // End current salary structure
  const current = this.repository.findActiveSalary(employeeId);
  if (current) {
    current.endDate = subDays(effectiveDate, 1);
    this.repository.save(current);
  }

  // Create new salary structure
  const salary = EmployeeSalary.create({
    ...newSalary,
    effectiveDate,
  });

  this.repository.save(salary);
}
```

**Error Message**: "Effective date must be in the future"

---

### Rule 23: NPWP Requirement for PPh 21

**Rule**: Employees without NPWP have 20% higher PPh 21 rate.

**Business Rationale**:
- Tax regulation (Pasal 21 ayat 5a)
- Encourages tax compliance

**Implementation**:
```typescript
public calculatePPh21WithNPWP(baseTax: number, hasNPWP: boolean): number {
  if (!hasNPWP) {
    return baseTax * 1.20; // 20% higher
  }
  return baseTax;
}
```

---

### Rule 24: THR Calculation

**Rule**: THR (Tunjangan Hari Raya) equals 1 month salary for employees with 12+ months service, pro-rata for less.

**Business Rationale**:
- Indonesian labor law
- Religious holiday bonus

**Implementation**:
```typescript
public calculateTHR(monthlyGross: number, monthsOfService: number): number {
  if (monthsOfService >= 12) {
    return monthlyGross;
  }

  if (monthsOfService >= 1) {
    return Math.round((monthsOfService / 12) * monthlyGross);
  }

  return 0; // Less than 1 month service
}
```

---

## Work Schedule Rules

### Rule 25: Maximum Working Hours

**Rule**: Maximum 40 hours per week (8 hours/day for 5-day week, 7 hours/day for 6-day week).

**Business Rationale**:
- Indonesian labor law
- Employee welfare

**Implementation**:
```typescript
const MAX_HOURS_5_DAY = 8;  // per day
const MAX_HOURS_6_DAY = 7;  // per day
const MAX_HOURS_WEEK = 40;

public validateSchedule(schedule: WorkSchedule): void {
  const totalHours = this.calculateWeeklyHours(schedule);

  if (totalHours > MAX_HOURS_WEEK) {
    throw new Error(`Weekly hours (${totalHours}) exceed maximum (${MAX_HOURS_WEEK})`);
  }
}
```

---

### Rule 26: Mandatory Rest Day

**Rule**: Employees must have at least 1 rest day per week.

**Business Rationale**:
- Indonesian labor law
- Employee welfare

**Implementation**:
```typescript
public validateRestDay(schedule: WorkSchedule): void {
  const workingDays = this.countWorkingDays(schedule);

  if (workingDays > 6) {
    throw new Error('Schedule must include at least 1 rest day per week');
  }
}
```

**Error Message**: "Schedule must include at least 1 rest day per week"

---

## Validation Summary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         VALIDATION HIERARCHY                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. Mobile App / Frontend Validation                                         │
│     - GPS location check (if geofencing)                                     │
│     - Photo capture validation                                               │
│     - Basic input validation                                                 │
│                                                                              │
│  2. API Layer Validation                                                     │
│     - Authentication                                                         │
│     - Authorization (permission check)                                       │
│     - Schema validation (Zod)                                                │
│                                                                              │
│  3. Domain Layer Validation (FINAL AUTHORITY)                                │
│     - Business rules (this document)                                         │
│     - Indonesian labor law compliance                                        │
│     - Tax regulation compliance                                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Regulatory Compliance

### Indonesian Labor Law (UU Ketenagakerjaan)

- UU No. 13/2003 - Ketenagakerjaan
- PP No. 35/2021 - PKWT, Alih Daya, Waktu Kerja, PHK
- UU No. 11/2020 - Cipta Kerja (Job Creation Law)

### Tax Regulations

- PP No. 58/2023 - Tarif Pemotongan PPh 21
- PMK 168/2023 - Petunjuk Pelaksanaan PPh 21
- UU No. 7/2021 - Harmonisasi Peraturan Perpajakan (HPP)

### BPJS Regulations

- UU No. 24/2011 - BPJS
- PP No. 44/2015 - JKK dan JKM
- PP No. 45/2015 - Jaminan Pensiun
- PP No. 46/2015 - JHT
- PP No. 37/2021 - Jaminan Kehilangan Pekerjaan

---

**Last Updated**: January 2026
**Maintained By**: Development Team
**Review Cycle**: Quarterly or when regulations change
**Related Docs**:
- [HRM Service Architecture](./HRM_SERVICE_ARCHITECTURE.md)
- [Business Partner Business Rules](../business-partner/BUSINESS_RULES.md)
- [Accounting COA](../accounting/INDONESIAN_TRADING_COA.md)
