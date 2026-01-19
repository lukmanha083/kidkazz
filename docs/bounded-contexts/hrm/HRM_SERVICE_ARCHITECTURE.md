# HRM (Human Resource Management) Service Architecture

## Overview

The HRM Service manages the employment lifecycle for Kidkazz employees, handling payroll processing, attendance tracking, and leave management. This service complements the Business Partner Service (which manages employee identity/RBAC) by focusing on HR operations.

**Key Responsibilities:**
- Payroll management (Indonesian tax & BPJS compliance)
- Attendance tracking (mobile app integration)
- Leave management (cuti tahunan, sakit, etc.)
- Overtime calculation
- Payslip generation

---

## Service Boundaries

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SERVICE BOUNDARIES                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────┐           ┌──────────────────────┐                │
│  │  BUSINESS PARTNER    │           │     HRM SERVICE      │                │
│  │      SERVICE         │           │                      │                │
│  │                      │           │                      │                │
│  │  • Employee Identity │ ────────► │  • Payroll           │                │
│  │  • Authentication    │  employee │  • Attendance        │                │
│  │  • RBAC/Roles        │  reference│  • Leave Management  │                │
│  │  • Department        │           │  • Overtime          │                │
│  │  • Position          │           │  • Payslip           │                │
│  └──────────────────────┘           └──────────┬───────────┘                │
│                                                 │                            │
│                                                 │ salary journal             │
│                                                 ▼                            │
│                                     ┌──────────────────────┐                │
│                                     │  ACCOUNTING SERVICE  │                │
│                                     │                      │                │
│                                     │  • Beban Gaji        │                │
│                                     │  • Hutang PPh 21     │                │
│                                     │  • Hutang BPJS       │                │
│                                     └──────────────────────┘                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### What HRM Service Owns:
- Salary structure & components
- Attendance records (clock-in/out)
- Leave balances & requests
- Overtime calculations
- Payroll processing & history
- Payslip generation

### What HRM Service Does NOT Own:
- Employee master data (→ Business Partner Service)
- Employee authentication (→ Business Partner Service)
- RBAC/Permissions (→ Business Partner Service)
- Financial posting (→ Accounting Service)

---

## Domain Model

### Core Entities

#### 1. EmployeeSalary (Aggregate Root)

```typescript
interface EmployeeSalary {
  id: string;
  employeeId: string;                    // Reference to Business Partner Service

  // Salary Components
  basicSalary: number;                   // Gaji Pokok
  positionAllowance: number;             // Tunjangan Jabatan
  transportAllowance: number;            // Tunjangan Transport
  mealAllowance: number;                 // Tunjangan Makan
  communicationAllowance: number;        // Tunjangan Komunikasi
  otherAllowances: number;               // Tunjangan Lainnya

  // Bank Account for Salary Transfer
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;

  // Tax Configuration
  ptkpStatus: PTKPStatus;                // TK/0, TK/1, K/0, K/1, etc.
  npwp?: string;                         // NPWP (if different from Business Partner)
  hasTaxExemption: boolean;              // Bebas PPh 21

  // BPJS Configuration
  bpjsKesehatanNumber?: string;
  bpjsKetenagakerjaanNumber?: string;
  jkkRiskLevel: JKKRiskLevel;            // Risk level for JKK calculation
  isEnrolledBpjsKesehatan: boolean;
  isEnrolledBpjsKetenagakerjaan: boolean;

  // Effective Date
  effectiveDate: Date;
  endDate?: Date;                        // If salary structure changed

  // Audit
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

type PTKPStatus =
  | 'TK/0'   // Tidak Kawin, 0 tanggungan - Rp 54.000.000/tahun
  | 'TK/1'   // Tidak Kawin, 1 tanggungan - Rp 58.500.000/tahun
  | 'TK/2'   // Tidak Kawin, 2 tanggungan - Rp 63.000.000/tahun
  | 'TK/3'   // Tidak Kawin, 3 tanggungan - Rp 67.500.000/tahun
  | 'K/0'    // Kawin, 0 tanggungan - Rp 58.500.000/tahun
  | 'K/1'    // Kawin, 1 tanggungan - Rp 63.000.000/tahun
  | 'K/2'    // Kawin, 2 tanggungan - Rp 67.500.000/tahun
  | 'K/3'    // Kawin, 3 tanggungan - Rp 72.000.000/tahun
  | 'K/I/0'  // Kawin, penghasilan istri digabung, 0 tanggungan
  | 'K/I/1'  // Kawin, penghasilan istri digabung, 1 tanggungan
  | 'K/I/2'  // Kawin, penghasilan istri digabung, 2 tanggungan
  | 'K/I/3'; // Kawin, penghasilan istri digabung, 3 tanggungan

type JKKRiskLevel =
  | 'VERY_LOW'    // 0.24% - Kantor, retail
  | 'LOW'         // 0.54% - Gudang ringan
  | 'MEDIUM'      // 0.89% - Gudang berat
  | 'HIGH'        // 1.27% - Manufaktur
  | 'VERY_HIGH';  // 1.74% - Konstruksi, pertambangan
```

#### 2. Attendance (Aggregate Root)

```typescript
interface Attendance {
  id: string;
  employeeId: string;
  date: Date;                            // Attendance date (YYYY-MM-DD)

  // Clock In/Out
  clockIn?: Date;                        // Timestamp
  clockInLocation?: GeoLocation;
  clockInPhoto?: string;                 // Selfie URL
  clockInMethod: ClockMethod;

  clockOut?: Date;
  clockOutLocation?: GeoLocation;
  clockOutPhoto?: string;
  clockOutMethod: ClockMethod;

  // Calculated Fields
  workingHours?: number;                 // In minutes
  overtimeHours?: number;                // In minutes
  lateMinutes?: number;                  // Late arrival
  earlyLeaveMinutes?: number;            // Early departure

  // Status
  status: AttendanceStatus;

  // Notes
  notes?: string;

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  address?: string;
}

type ClockMethod =
  | 'MOBILE_APP'      // Kidkazz Admin mobile app
  | 'WEB'             // ERP Dashboard
  | 'FINGERPRINT'     // Biometric device
  | 'MANUAL';         // HR manual entry

type AttendanceStatus =
  | 'PRESENT'         // Hadir
  | 'ABSENT'          // Tidak Hadir
  | 'LEAVE'           // Cuti/Izin
  | 'SICK'            // Sakit
  | 'HOLIDAY'         // Libur
  | 'HALF_DAY'        // Setengah hari
  | 'WORK_FROM_HOME'; // WFH
```

#### 3. Leave (Aggregate Root)

```typescript
interface Leave {
  id: string;
  employeeId: string;

  // Leave Details
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  totalDays: number;                     // Excluding weekends/holidays

  // Request
  reason: string;
  attachmentUrl?: string;                // Surat dokter, etc.

  // Approval
  status: LeaveStatus;
  approvedBy?: string;                   // Manager/HR employee ID
  approvedAt?: Date;
  rejectionReason?: string;

  // Delegation (if applicable)
  delegateTo?: string;                   // Employee ID to handle tasks

  // Audit
  requestedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

type LeaveType =
  | 'ANNUAL'          // Cuti Tahunan (12 days/year)
  | 'SICK'            // Sakit (with doctor's note)
  | 'MATERNITY'       // Cuti Melahirkan (3 months)
  | 'PATERNITY'       // Cuti Ayah (2 days)
  | 'MARRIAGE'        // Cuti Nikah (3 days)
  | 'BEREAVEMENT'     // Cuti Duka (3 days immediate family, 2 days extended)
  | 'RELIGIOUS'       // Cuti Keagamaan (Haji, etc.)
  | 'UNPAID'          // Cuti Tanpa Gaji
  | 'SPECIAL';        // Cuti Khusus (other)

type LeaveStatus =
  | 'PENDING'         // Menunggu persetujuan
  | 'APPROVED'        // Disetujui
  | 'REJECTED'        // Ditolak
  | 'CANCELLED';      // Dibatalkan
```

#### 4. LeaveBalance (Aggregate)

```typescript
interface LeaveBalance {
  id: string;
  employeeId: string;
  year: number;                          // Fiscal year

  // Annual Leave
  annualLeaveEntitlement: number;        // Total hak cuti (12 days default)
  annualLeaveUsed: number;               // Yang sudah dipakai
  annualLeaveBalance: number;            // Sisa cuti
  annualLeaveCarryOver: number;          // Sisa tahun lalu (max 6 days)

  // Sick Leave (unlimited with doctor's note, but tracked)
  sickLeaveTaken: number;

  // Other Leave Taken
  maternityLeaveTaken: number;
  paternityLeaveTaken: number;
  marriageLeaveTaken: number;
  bereavementLeaveTaken: number;
  unpaidLeaveTaken: number;

  // Audit
  lastUpdated: Date;
}
```

#### 5. Payroll (Aggregate Root)

```typescript
interface Payroll {
  id: string;

  // Period
  month: number;                         // 1-12
  year: number;
  periodStart: Date;
  periodEnd: Date;

  // Status
  status: PayrollStatus;

  // Processing
  processedAt?: Date;
  processedBy?: string;
  approvedAt?: Date;
  approvedBy?: string;
  paidAt?: Date;

  // Summary
  totalEmployees: number;
  totalGrossSalary: number;
  totalDeductions: number;
  totalNetSalary: number;
  totalPPh21: number;
  totalBpjsCompany: number;
  totalBpjsEmployee: number;

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

type PayrollStatus =
  | 'DRAFT'           // Initial creation
  | 'PROCESSING'      // Calculating
  | 'CALCULATED'      // Ready for review
  | 'APPROVED'        // Approved by management
  | 'PAID'            // Salary transferred
  | 'CLOSED';         // Period closed
```

#### 6. PayrollItem (Entity under Payroll)

```typescript
interface PayrollItem {
  id: string;
  payrollId: string;
  employeeId: string;

  // Employee Info (snapshot at payroll time)
  employeeName: string;
  department: string;
  position: string;

  // Earnings (Pendapatan)
  basicSalary: number;                   // Gaji Pokok
  positionAllowance: number;             // Tunjangan Jabatan
  transportAllowance: number;            // Tunjangan Transport
  mealAllowance: number;                 // Tunjangan Makan
  communicationAllowance: number;        // Tunjangan Komunikasi
  otherAllowances: number;               // Tunjangan Lainnya
  overtimePay: number;                   // Uang Lembur
  bonus: number;                         // Bonus
  thr: number;                           // THR (if applicable)
  backPay: number;                       // Rapel
  otherEarnings: number;                 // Pendapatan Lainnya

  grossSalary: number;                   // Total Pendapatan

  // Deductions (Potongan)
  bpjsKesehatanEmployee: number;         // BPJS Kesehatan - Karyawan (1%)
  bpjsJhtEmployee: number;               // BPJS JHT - Karyawan (2%)
  bpjsJpEmployee: number;                // BPJS JP - Karyawan (1%)
  pph21: number;                         // Pajak PPh 21
  loanDeduction: number;                 // Potongan Pinjaman
  absenceDeduction: number;              // Potongan Absensi
  otherDeductions: number;               // Potongan Lainnya

  totalDeductions: number;               // Total Potongan

  // Company Contributions (not deducted from salary, for accounting)
  bpjsKesehatanCompany: number;          // BPJS Kesehatan - Perusahaan (4%)
  bpjsJhtCompany: number;                // BPJS JHT - Perusahaan (3.7%)
  bpjsJpCompany: number;                 // BPJS JP - Perusahaan (2%)
  bpjsJkkCompany: number;                // BPJS JKK - Perusahaan (0.24%-1.74%)
  bpjsJkmCompany: number;                // BPJS JKM - Perusahaan (0.3%)

  totalCompanyContributions: number;

  // Net Salary
  netSalary: number;                     // Take Home Pay

  // Attendance Summary
  workingDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  sickDays: number;
  overtimeHours: number;
  lateCount: number;

  // Bank Transfer
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;

  // Audit
  createdAt: Date;
}
```

#### 7. WorkSchedule (Aggregate)

```typescript
interface WorkSchedule {
  id: string;
  name: string;                          // "Office Hours", "Shift A", etc.
  description?: string;

  // Schedule
  scheduleType: ScheduleType;

  // For FIXED schedule
  mondayStart?: string;                  // "08:00"
  mondayEnd?: string;                    // "17:00"
  tuesdayStart?: string;
  tuesdayEnd?: string;
  wednesdayStart?: string;
  wednesdayEnd?: string;
  thursdayStart?: string;
  thursdayEnd?: string;
  fridayStart?: string;
  fridayEnd?: string;
  saturdayStart?: string;
  saturdayEnd?: string;
  sundayStart?: string;
  sundayEnd?: string;

  // Break Time
  breakDurationMinutes: number;          // e.g., 60 minutes

  // Overtime Rules
  overtimeThresholdMinutes: number;      // After how many minutes is overtime
  maxOvertimePerDay: number;             // Max overtime hours per day

  // Late/Early Rules
  graceMinutes: number;                  // Toleransi keterlambatan (e.g., 15 min)

  // Status
  isActive: boolean;
  isDefault: boolean;

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

type ScheduleType =
  | 'FIXED'           // Same hours every day
  | 'SHIFT'           // Rotating shifts
  | 'FLEXIBLE';       // Flexible hours
```

#### 8. EmployeeScheduleAssignment

```typescript
interface EmployeeScheduleAssignment {
  id: string;
  employeeId: string;
  workScheduleId: string;
  effectiveDate: Date;
  endDate?: Date;

  createdAt: Date;
  updatedAt: Date;
}
```

---

## Indonesian Payroll Calculations

### PTKP (Penghasilan Tidak Kena Pajak) 2025-2026

**PTKP is the tax-free income threshold.** If an employee's annual gross income is at or below PTKP, they pay **NO PPh 21**.

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

**PPh 21 Decision Flow:**
```
If (Monthly Gross Salary ≤ Monthly PTKP)
  → PPh 21 = Rp 0 (No tax - employee takes home full salary)

If (Monthly Gross Salary > Monthly PTKP)
  → PPh 21 = Salary × TER Rate (based on income bracket and PTKP category)
```

> **Note on PPh 21 DTP (Ditanggung Pemerintah) 2025-2026:**
>
> For specific sectors (footwear, textile, furniture, leather, tourism) employees with salary ≤ Rp 10 million have PPh 21 covered by government (PMK 10/2025, PMK 105/2025). Since Kidkazz is a **trading/retail company**, this incentive does NOT apply.

```typescript
const PTKP_VALUES: Record<PTKPStatus, number> = {
  'TK/0': 54_000_000,    // Tidak Kawin, 0 tanggungan
  'TK/1': 58_500_000,    // Tidak Kawin, 1 tanggungan
  'TK/2': 63_000_000,    // Tidak Kawin, 2 tanggungan
  'TK/3': 67_500_000,    // Tidak Kawin, 3 tanggungan
  'K/0':  58_500_000,    // Kawin, 0 tanggungan
  'K/1':  63_000_000,    // Kawin, 1 tanggungan
  'K/2':  67_500_000,    // Kawin, 2 tanggungan
  'K/3':  72_000_000,    // Kawin, 3 tanggungan
  'K/I/0': 112_500_000,  // Kawin, istri digabung, 0 tanggungan
  'K/I/1': 117_000_000,  // Kawin, istri digabung, 1 tanggungan
  'K/I/2': 121_500_000,  // Kawin, istri digabung, 2 tanggungan
  'K/I/3': 126_000_000,  // Kawin, istri digabung, 3 tanggungan
};

// Check if employee is below PTKP threshold (no tax)
function isBelowPTKP(monthlyGross: number, ptkpStatus: PTKPStatus): boolean {
  const monthlyPTKP = PTKP_VALUES[ptkpStatus] / 12;
  return monthlyGross <= monthlyPTKP;
}
```

### PPh 21 Tarif Progresif (Pasal 17 UU PPh)

```typescript
const PPH21_BRACKETS = [
  { min: 0,           max: 60_000_000,    rate: 0.05 },  // 5%
  { min: 60_000_000,  max: 250_000_000,   rate: 0.15 },  // 15%
  { min: 250_000_000, max: 500_000_000,   rate: 0.25 },  // 25%
  { min: 500_000_000, max: 5_000_000_000, rate: 0.30 },  // 30%
  { min: 5_000_000_000, max: Infinity,    rate: 0.35 },  // 35%
];

function calculatePPh21Annual(penghasilanKenaPajak: number): number {
  let tax = 0;
  let remaining = penghasilanKenaPajak;

  for (const bracket of PPH21_BRACKETS) {
    if (remaining <= 0) break;

    const taxableInBracket = Math.min(remaining, bracket.max - bracket.min);
    tax += taxableInBracket * bracket.rate;
    remaining -= taxableInBracket;
  }

  return tax;
}
```

### TER (Tarif Efektif Rata-rata) - Monthly Calculation

```typescript
// Simplified TER rates based on PTKP status category
// Full TER table has granular rates per income bracket
// Reference: PMK 168/2023

type TERCategory = 'A' | 'B' | 'C';

const TER_CATEGORY_MAP: Record<PTKPStatus, TERCategory> = {
  'TK/0': 'A',
  'TK/1': 'A',
  'K/0':  'A',
  'TK/2': 'B',
  'K/1':  'B',
  'TK/3': 'B',
  'K/2':  'B',
  'K/3':  'C',
  'K/I/0': 'C',
  'K/I/1': 'C',
  'K/I/2': 'C',
  'K/I/3': 'C',
};

// Example TER rates for Category A (simplified)
const TER_A_RATES = [
  { maxIncome: 5_400_000,   rate: 0 },
  { maxIncome: 5_650_000,   rate: 0.0025 },
  { maxIncome: 5_950_000,   rate: 0.005 },
  { maxIncome: 6_300_000,   rate: 0.0075 },
  { maxIncome: 6_750_000,   rate: 0.01 },
  { maxIncome: 7_500_000,   rate: 0.0125 },
  { maxIncome: 8_550_000,   rate: 0.015 },
  { maxIncome: 9_650_000,   rate: 0.0175 },
  { maxIncome: 10_050_000,  rate: 0.02 },
  { maxIncome: 10_350_000,  rate: 0.0225 },
  { maxIncome: 10_700_000,  rate: 0.025 },
  { maxIncome: 11_050_000,  rate: 0.03 },
  { maxIncome: 11_600_000,  rate: 0.035 },
  { maxIncome: 12_500_000,  rate: 0.04 },
  { maxIncome: 13_750_000,  rate: 0.045 },
  { maxIncome: 15_100_000,  rate: 0.05 },
  { maxIncome: 16_950_000,  rate: 0.06 },
  { maxIncome: 19_750_000,  rate: 0.07 },
  { maxIncome: 24_150_000,  rate: 0.08 },
  { maxIncome: 26_450_000,  rate: 0.09 },
  { maxIncome: 28_000_000,  rate: 0.10 },
  { maxIncome: 30_050_000,  rate: 0.11 },
  { maxIncome: 32_400_000,  rate: 0.12 },
  { maxIncome: 35_400_000,  rate: 0.13 },
  { maxIncome: 39_100_000,  rate: 0.14 },
  { maxIncome: 43_850_000,  rate: 0.15 },
  { maxIncome: 47_800_000,  rate: 0.16 },
  { maxIncome: 51_400_000,  rate: 0.17 },
  { maxIncome: 56_300_000,  rate: 0.18 },
  { maxIncome: 62_200_000,  rate: 0.19 },
  { maxIncome: 68_600_000,  rate: 0.20 },
  { maxIncome: 77_500_000,  rate: 0.21 },
  { maxIncome: 89_000_000,  rate: 0.22 },
  { maxIncome: 103_000_000, rate: 0.23 },
  { maxIncome: 125_000_000, rate: 0.24 },
  { maxIncome: 157_000_000, rate: 0.25 },
  { maxIncome: 206_000_000, rate: 0.26 },
  { maxIncome: 337_000_000, rate: 0.27 },
  { maxIncome: 454_000_000, rate: 0.28 },
  { maxIncome: 550_000_000, rate: 0.29 },
  { maxIncome: 695_000_000, rate: 0.30 },
  { maxIncome: 910_000_000, rate: 0.31 },
  { maxIncome: 1_400_000_000, rate: 0.32 },
  { maxIncome: Infinity,    rate: 0.34 },
];
```

### BPJS Calculations

```typescript
const BPJS_RATES = {
  // BPJS Kesehatan (5% total)
  KESEHATAN_COMPANY: 0.04,    // 4% - Perusahaan
  KESEHATAN_EMPLOYEE: 0.01,   // 1% - Karyawan
  KESEHATAN_MAX_SALARY: 12_000_000, // Batas maksimal gaji untuk perhitungan

  // BPJS JHT - Jaminan Hari Tua (5.7% total)
  JHT_COMPANY: 0.037,         // 3.7% - Perusahaan
  JHT_EMPLOYEE: 0.02,         // 2% - Karyawan

  // BPJS JP - Jaminan Pensiun (3% total)
  JP_COMPANY: 0.02,           // 2% - Perusahaan
  JP_EMPLOYEE: 0.01,          // 1% - Karyawan
  JP_MAX_SALARY: 10_547_400,  // Batas maksimal gaji untuk JP (2026)

  // BPJS JKK - Jaminan Kecelakaan Kerja (varies by risk)
  JKK_VERY_LOW: 0.0024,       // 0.24% - Sangat Rendah
  JKK_LOW: 0.0054,            // 0.54% - Rendah
  JKK_MEDIUM: 0.0089,         // 0.89% - Sedang
  JKK_HIGH: 0.0127,           // 1.27% - Tinggi
  JKK_VERY_HIGH: 0.0174,      // 1.74% - Sangat Tinggi

  // BPJS JKM - Jaminan Kematian
  JKM: 0.003,                 // 0.3% - 100% Perusahaan
};

function calculateBpjs(salary: number, jkkRiskLevel: JKKRiskLevel) {
  // BPJS Kesehatan
  const kesehatanBase = Math.min(salary, BPJS_RATES.KESEHATAN_MAX_SALARY);
  const kesehatanCompany = kesehatanBase * BPJS_RATES.KESEHATAN_COMPANY;
  const kesehatanEmployee = kesehatanBase * BPJS_RATES.KESEHATAN_EMPLOYEE;

  // BPJS JHT
  const jhtCompany = salary * BPJS_RATES.JHT_COMPANY;
  const jhtEmployee = salary * BPJS_RATES.JHT_EMPLOYEE;

  // BPJS JP
  const jpBase = Math.min(salary, BPJS_RATES.JP_MAX_SALARY);
  const jpCompany = jpBase * BPJS_RATES.JP_COMPANY;
  const jpEmployee = jpBase * BPJS_RATES.JP_EMPLOYEE;

  // BPJS JKK
  const jkkRate = {
    VERY_LOW: BPJS_RATES.JKK_VERY_LOW,
    LOW: BPJS_RATES.JKK_LOW,
    MEDIUM: BPJS_RATES.JKK_MEDIUM,
    HIGH: BPJS_RATES.JKK_HIGH,
    VERY_HIGH: BPJS_RATES.JKK_VERY_HIGH,
  }[jkkRiskLevel];
  const jkkCompany = salary * jkkRate;

  // BPJS JKM
  const jkmCompany = salary * BPJS_RATES.JKM;

  return {
    employee: {
      kesehatan: kesehatanEmployee,
      jht: jhtEmployee,
      jp: jpEmployee,
      total: kesehatanEmployee + jhtEmployee + jpEmployee,
    },
    company: {
      kesehatan: kesehatanCompany,
      jht: jhtCompany,
      jp: jpCompany,
      jkk: jkkCompany,
      jkm: jkmCompany,
      total: kesehatanCompany + jhtCompany + jpCompany + jkkCompany + jkmCompany,
    },
  };
}
```

### Overtime Calculation

```typescript
const OVERTIME_RATES = {
  // Lembur hari kerja
  WEEKDAY_FIRST_HOUR: 1.5,     // Jam pertama = 1.5x upah/jam
  WEEKDAY_NEXT_HOURS: 2.0,     // Jam berikutnya = 2x upah/jam

  // Lembur hari libur/weekend
  HOLIDAY_FIRST_7_HOURS: 2.0,  // 7 jam pertama = 2x
  HOLIDAY_8TH_HOUR: 3.0,       // Jam ke-8 = 3x
  HOLIDAY_NEXT_HOURS: 4.0,     // Jam ke-9 dst = 4x
};

function calculateOvertimePay(
  basicSalary: number,
  overtimeHours: number,
  isHoliday: boolean
): number {
  // Upah per jam = (Gaji Pokok / 173)
  // 173 = rata-rata jam kerja per bulan (40 jam/minggu * 52 minggu / 12 bulan)
  const hourlyRate = basicSalary / 173;

  let overtimePay = 0;

  if (isHoliday) {
    // Lembur hari libur
    if (overtimeHours <= 7) {
      overtimePay = overtimeHours * hourlyRate * OVERTIME_RATES.HOLIDAY_FIRST_7_HOURS;
    } else if (overtimeHours === 8) {
      overtimePay = 7 * hourlyRate * OVERTIME_RATES.HOLIDAY_FIRST_7_HOURS
                  + 1 * hourlyRate * OVERTIME_RATES.HOLIDAY_8TH_HOUR;
    } else {
      overtimePay = 7 * hourlyRate * OVERTIME_RATES.HOLIDAY_FIRST_7_HOURS
                  + 1 * hourlyRate * OVERTIME_RATES.HOLIDAY_8TH_HOUR
                  + (overtimeHours - 8) * hourlyRate * OVERTIME_RATES.HOLIDAY_NEXT_HOURS;
    }
  } else {
    // Lembur hari kerja
    if (overtimeHours <= 1) {
      overtimePay = overtimeHours * hourlyRate * OVERTIME_RATES.WEEKDAY_FIRST_HOUR;
    } else {
      overtimePay = 1 * hourlyRate * OVERTIME_RATES.WEEKDAY_FIRST_HOUR
                  + (overtimeHours - 1) * hourlyRate * OVERTIME_RATES.WEEKDAY_NEXT_HOURS;
    }
  }

  return Math.round(overtimePay);
}
```

---

## Database Schema

```sql
-- ============================================
-- EMPLOYEE SALARY STRUCTURE
-- ============================================
CREATE TABLE employee_salaries (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,             -- Reference to Business Partner Service

  -- Salary Components
  basic_salary REAL NOT NULL DEFAULT 0,
  position_allowance REAL NOT NULL DEFAULT 0,
  transport_allowance REAL NOT NULL DEFAULT 0,
  meal_allowance REAL NOT NULL DEFAULT 0,
  communication_allowance REAL NOT NULL DEFAULT 0,
  other_allowances REAL NOT NULL DEFAULT 0,

  -- Bank Account
  bank_name TEXT,
  bank_account_number TEXT,
  bank_account_name TEXT,

  -- Tax Configuration
  ptkp_status TEXT NOT NULL DEFAULT 'TK/0',
  npwp TEXT,
  has_tax_exemption INTEGER DEFAULT 0,

  -- BPJS Configuration
  bpjs_kesehatan_number TEXT,
  bpjs_ketenagakerjaan_number TEXT,
  jkk_risk_level TEXT NOT NULL DEFAULT 'VERY_LOW',
  is_enrolled_bpjs_kesehatan INTEGER DEFAULT 1,
  is_enrolled_bpjs_ketenagakerjaan INTEGER DEFAULT 1,

  -- Effective Period
  effective_date INTEGER NOT NULL,
  end_date INTEGER,

  -- Audit
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by TEXT,
  updated_by TEXT
);

CREATE INDEX idx_salary_employee ON employee_salaries(employee_id);
CREATE INDEX idx_salary_effective ON employee_salaries(effective_date);

-- ============================================
-- WORK SCHEDULES
-- ============================================
CREATE TABLE work_schedules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  schedule_type TEXT NOT NULL DEFAULT 'FIXED',

  -- Daily Hours
  monday_start TEXT,
  monday_end TEXT,
  tuesday_start TEXT,
  tuesday_end TEXT,
  wednesday_start TEXT,
  wednesday_end TEXT,
  thursday_start TEXT,
  thursday_end TEXT,
  friday_start TEXT,
  friday_end TEXT,
  saturday_start TEXT,
  saturday_end TEXT,
  sunday_start TEXT,
  sunday_end TEXT,

  -- Rules
  break_duration_minutes INTEGER DEFAULT 60,
  overtime_threshold_minutes INTEGER DEFAULT 480,  -- 8 hours
  max_overtime_per_day INTEGER DEFAULT 180,        -- 3 hours
  grace_minutes INTEGER DEFAULT 15,

  -- Status
  is_active INTEGER DEFAULT 1,
  is_default INTEGER DEFAULT 0,

  -- Audit
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- ============================================
-- EMPLOYEE SCHEDULE ASSIGNMENTS
-- ============================================
CREATE TABLE employee_schedule_assignments (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  work_schedule_id TEXT NOT NULL REFERENCES work_schedules(id),
  effective_date INTEGER NOT NULL,
  end_date INTEGER,

  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_esa_employee ON employee_schedule_assignments(employee_id);

-- ============================================
-- ATTENDANCE
-- ============================================
CREATE TABLE attendances (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  date INTEGER NOT NULL,                 -- Date only (YYYYMMDD as integer)

  -- Clock In/Out
  clock_in INTEGER,                      -- Timestamp
  clock_in_latitude REAL,
  clock_in_longitude REAL,
  clock_in_address TEXT,
  clock_in_photo TEXT,
  clock_in_method TEXT DEFAULT 'MOBILE_APP',

  clock_out INTEGER,
  clock_out_latitude REAL,
  clock_out_longitude REAL,
  clock_out_address TEXT,
  clock_out_photo TEXT,
  clock_out_method TEXT DEFAULT 'MOBILE_APP',

  -- Calculated
  working_minutes INTEGER,
  overtime_minutes INTEGER,
  late_minutes INTEGER,
  early_leave_minutes INTEGER,

  -- Status
  status TEXT NOT NULL DEFAULT 'PRESENT',
  notes TEXT,

  -- Audit
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,

  UNIQUE(employee_id, date)
);

CREATE INDEX idx_attendance_employee ON attendances(employee_id);
CREATE INDEX idx_attendance_date ON attendances(date);
CREATE INDEX idx_attendance_employee_date ON attendances(employee_id, date);

-- ============================================
-- LEAVE BALANCES
-- ============================================
CREATE TABLE leave_balances (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  year INTEGER NOT NULL,

  -- Annual Leave
  annual_leave_entitlement INTEGER DEFAULT 12,
  annual_leave_used INTEGER DEFAULT 0,
  annual_leave_balance INTEGER DEFAULT 12,
  annual_leave_carry_over INTEGER DEFAULT 0,

  -- Other Leave Tracking
  sick_leave_taken INTEGER DEFAULT 0,
  maternity_leave_taken INTEGER DEFAULT 0,
  paternity_leave_taken INTEGER DEFAULT 0,
  marriage_leave_taken INTEGER DEFAULT 0,
  bereavement_leave_taken INTEGER DEFAULT 0,
  unpaid_leave_taken INTEGER DEFAULT 0,

  -- Audit
  last_updated INTEGER NOT NULL,

  UNIQUE(employee_id, year)
);

CREATE INDEX idx_lb_employee ON leave_balances(employee_id);

-- ============================================
-- LEAVE REQUESTS
-- ============================================
CREATE TABLE leaves (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,

  -- Leave Details
  leave_type TEXT NOT NULL,
  start_date INTEGER NOT NULL,
  end_date INTEGER NOT NULL,
  total_days INTEGER NOT NULL,

  -- Request
  reason TEXT,
  attachment_url TEXT,

  -- Approval
  status TEXT NOT NULL DEFAULT 'PENDING',
  approved_by TEXT,
  approved_at INTEGER,
  rejection_reason TEXT,

  -- Delegation
  delegate_to TEXT,

  -- Audit
  requested_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_leave_employee ON leaves(employee_id);
CREATE INDEX idx_leave_status ON leaves(status);
CREATE INDEX idx_leave_dates ON leaves(start_date, end_date);

-- ============================================
-- PAYROLL (Header)
-- ============================================
CREATE TABLE payrolls (
  id TEXT PRIMARY KEY,

  -- Period
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  period_start INTEGER NOT NULL,
  period_end INTEGER NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'DRAFT',

  -- Processing
  processed_at INTEGER,
  processed_by TEXT,
  approved_at INTEGER,
  approved_by TEXT,
  paid_at INTEGER,

  -- Summary
  total_employees INTEGER DEFAULT 0,
  total_gross_salary REAL DEFAULT 0,
  total_deductions REAL DEFAULT 0,
  total_net_salary REAL DEFAULT 0,
  total_pph21 REAL DEFAULT 0,
  total_bpjs_company REAL DEFAULT 0,
  total_bpjs_employee REAL DEFAULT 0,

  -- Audit
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,

  UNIQUE(month, year)
);

CREATE INDEX idx_payroll_period ON payrolls(year, month);

-- ============================================
-- PAYROLL ITEMS (Detail per employee)
-- ============================================
CREATE TABLE payroll_items (
  id TEXT PRIMARY KEY,
  payroll_id TEXT NOT NULL REFERENCES payrolls(id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL,

  -- Employee Info Snapshot
  employee_name TEXT NOT NULL,
  department TEXT,
  position TEXT,

  -- Earnings
  basic_salary REAL DEFAULT 0,
  position_allowance REAL DEFAULT 0,
  transport_allowance REAL DEFAULT 0,
  meal_allowance REAL DEFAULT 0,
  communication_allowance REAL DEFAULT 0,
  other_allowances REAL DEFAULT 0,
  overtime_pay REAL DEFAULT 0,
  bonus REAL DEFAULT 0,
  thr REAL DEFAULT 0,
  back_pay REAL DEFAULT 0,
  other_earnings REAL DEFAULT 0,
  gross_salary REAL DEFAULT 0,

  -- Deductions
  bpjs_kesehatan_employee REAL DEFAULT 0,
  bpjs_jht_employee REAL DEFAULT 0,
  bpjs_jp_employee REAL DEFAULT 0,
  pph21 REAL DEFAULT 0,
  loan_deduction REAL DEFAULT 0,
  absence_deduction REAL DEFAULT 0,
  other_deductions REAL DEFAULT 0,
  total_deductions REAL DEFAULT 0,

  -- Company Contributions
  bpjs_kesehatan_company REAL DEFAULT 0,
  bpjs_jht_company REAL DEFAULT 0,
  bpjs_jp_company REAL DEFAULT 0,
  bpjs_jkk_company REAL DEFAULT 0,
  bpjs_jkm_company REAL DEFAULT 0,
  total_company_contributions REAL DEFAULT 0,

  -- Net Salary
  net_salary REAL DEFAULT 0,

  -- Attendance Summary
  working_days INTEGER DEFAULT 0,
  present_days INTEGER DEFAULT 0,
  absent_days INTEGER DEFAULT 0,
  leave_days INTEGER DEFAULT 0,
  sick_days INTEGER DEFAULT 0,
  overtime_hours REAL DEFAULT 0,
  late_count INTEGER DEFAULT 0,

  -- Bank Transfer
  bank_name TEXT,
  bank_account_number TEXT,
  bank_account_name TEXT,

  -- Audit
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_pi_payroll ON payroll_items(payroll_id);
CREATE INDEX idx_pi_employee ON payroll_items(employee_id);

-- ============================================
-- HOLIDAYS (Public Holidays)
-- ============================================
CREATE TABLE holidays (
  id TEXT PRIMARY KEY,
  date INTEGER NOT NULL,                 -- Date as YYYYMMDD
  name TEXT NOT NULL,
  description TEXT,
  is_national INTEGER DEFAULT 1,         -- National holiday
  year INTEGER NOT NULL,

  created_at INTEGER NOT NULL,

  UNIQUE(date)
);

CREATE INDEX idx_holiday_year ON holidays(year);

-- ============================================
-- EMPLOYEE LOANS (for payroll deduction)
-- ============================================
CREATE TABLE employee_loans (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,

  -- Loan Details
  loan_type TEXT NOT NULL,               -- 'SALARY_ADVANCE', 'COMPANY_LOAN'
  principal_amount REAL NOT NULL,
  interest_rate REAL DEFAULT 0,
  total_amount REAL NOT NULL,

  -- Repayment
  monthly_deduction REAL NOT NULL,
  total_paid REAL DEFAULT 0,
  remaining_balance REAL NOT NULL,
  start_date INTEGER NOT NULL,
  expected_end_date INTEGER,

  -- Status
  status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'COMPLETED', 'WRITTEN_OFF'

  -- Audit
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  approved_by TEXT,
  approved_at INTEGER
);

CREATE INDEX idx_loan_employee ON employee_loans(employee_id);
CREATE INDEX idx_loan_status ON employee_loans(status);
```

---

## API Endpoints

### Attendance

```
# Mobile App Endpoints
POST   /api/attendance/clock-in          # Clock in with location & photo
POST   /api/attendance/clock-out         # Clock out with location & photo
GET    /api/attendance/today             # Get today's attendance for current user
GET    /api/attendance/history           # Get attendance history for current user

# Admin/HR Endpoints
GET    /api/attendance                   # List all attendance (filtered, paginated)
GET    /api/attendance/employee/:id      # Get attendance for specific employee
POST   /api/attendance/manual            # Manual attendance entry (HR only)
PUT    /api/attendance/:id               # Update attendance record
GET    /api/attendance/report            # Attendance summary report
```

### Leave Management

```
# Employee Endpoints
GET    /api/leaves/balance               # Get my leave balance
POST   /api/leaves/request               # Submit leave request
GET    /api/leaves/my-requests           # Get my leave requests
DELETE /api/leaves/:id                   # Cancel pending leave request

# Manager/HR Endpoints
GET    /api/leaves/pending               # List pending approvals
POST   /api/leaves/:id/approve           # Approve leave
POST   /api/leaves/:id/reject            # Reject leave
GET    /api/leaves                       # List all leaves (filtered)
GET    /api/leaves/calendar              # Leave calendar view
```

### Salary Structure

```
# Admin/HR Endpoints
GET    /api/salaries                     # List all employee salaries
GET    /api/salaries/employee/:id        # Get salary for specific employee
POST   /api/salaries                     # Create/update salary structure
PUT    /api/salaries/:id                 # Update salary structure
GET    /api/salaries/history/:employeeId # Salary change history
```

### Payroll

```
# HR Endpoints
GET    /api/payroll                      # List all payroll periods
POST   /api/payroll                      # Create new payroll period
GET    /api/payroll/:id                  # Get payroll details
POST   /api/payroll/:id/process          # Process payroll calculations
POST   /api/payroll/:id/approve          # Approve payroll (requires permission)
POST   /api/payroll/:id/pay              # Mark as paid
GET    /api/payroll/:id/items            # Get payroll items (all employees)
GET    /api/payroll/:id/items/:employeeId # Get specific employee payroll

# Employee Endpoints
GET    /api/payroll/my-payslips          # Get my payslips
GET    /api/payroll/my-payslips/:id      # Get specific payslip
GET    /api/payroll/my-payslips/:id/pdf  # Download payslip PDF
```

### Work Schedules

```
# Admin Endpoints
GET    /api/schedules                    # List work schedules
POST   /api/schedules                    # Create work schedule
PUT    /api/schedules/:id                # Update work schedule
DELETE /api/schedules/:id                # Delete work schedule
POST   /api/schedules/assign             # Assign schedule to employee
GET    /api/schedules/employee/:id       # Get employee's schedule
```

### Holidays

```
GET    /api/holidays                     # List holidays (by year)
POST   /api/holidays                     # Add holiday
PUT    /api/holidays/:id                 # Update holiday
DELETE /api/holidays/:id                 # Delete holiday
POST   /api/holidays/import/:year        # Import national holidays for year
```

### Loans

```
GET    /api/loans                        # List all loans
POST   /api/loans                        # Create loan
GET    /api/loans/employee/:id           # Get employee loans
PUT    /api/loans/:id                    # Update loan
POST   /api/loans/:id/payment            # Record payment
```

---

## Service Integration

### With Business Partner Service

```typescript
// Get employee info for payroll
interface EmployeeInfo {
  id: string;
  code: string;
  name: string;
  email: string;
  department: string;
  position: string;
  employmentStatus: string;
  hireDate: Date;
}

// HRM Service calls Business Partner Service
GET /api/employees/:id → EmployeeInfo
GET /api/employees?status=active → EmployeeInfo[]
```

### With Accounting Service

```typescript
// When payroll is approved and paid, create journal entry
// Event: PayrollPaid

interface PayrollJournalEvent {
  payrollId: string;
  month: number;
  year: number;
  journalEntries: JournalEntry[];
}

// Example Journal Entry for monthly payroll:
// Dr. Beban Gaji Pokok (6010)           Rp 50.000.000
// Dr. Beban Tunjangan Jabatan (6020)    Rp 10.000.000
// Dr. Beban Tunjangan Transport (6022)  Rp  5.000.000
// Dr. Beban BPJS - Perusahaan (6060)    Rp  5.000.000
//    Cr. Hutang Gaji (2210)                 Rp 55.000.000
//    Cr. Hutang PPh 21 (2130)               Rp  3.000.000
//    Cr. Hutang BPJS Kesehatan (2220)       Rp  4.000.000
//    Cr. Hutang BPJS Ketenagakerjaan (2221) Rp  8.000.000
```

### With Mobile App (Kidkazz Admin)

```typescript
// Mobile app sends attendance data
interface ClockInRequest {
  employeeId: string;
  timestamp: Date;
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  photoBase64: string;  // Selfie
  deviceId: string;
}

// HRM Service validates and stores attendance
// Validates:
// - Employee is active
// - Location is within allowed radius (if geofencing enabled)
// - Not already clocked in today
// - Within work hours (with grace period)
```

---

## Event Publishing

### Events Published by HRM Service

```typescript
// Attendance Events
AttendanceClockIn     { employeeId, timestamp, location }
AttendanceClockOut    { employeeId, timestamp, workingHours, overtimeHours }
AttendanceCorrected   { employeeId, date, changes, correctedBy }

// Leave Events
LeaveRequested        { employeeId, leaveType, startDate, endDate }
LeaveApproved         { employeeId, leaveId, approvedBy }
LeaveRejected         { employeeId, leaveId, rejectedBy, reason }
LeaveCancelled        { employeeId, leaveId }

// Payroll Events
PayrollCreated        { payrollId, month, year }
PayrollProcessed      { payrollId, totalEmployees, totalNetSalary }
PayrollApproved       { payrollId, approvedBy }
PayrollPaid           { payrollId, paidAt, journalEntries }

// Salary Events
SalaryStructureChanged { employeeId, changes, effectiveDate }
```

### Events Consumed by HRM Service

```typescript
// From Business Partner Service
EmployeeCreated       → Create default salary structure, leave balance
EmployeeTerminated    → Close salary, calculate final pay
EmployeeUpdated       → Update employee info cache

// From Accounting Service
JournalPosted         → Mark payroll accounting as complete
```

---

## Folder Structure

```
services/hrm-service/
├── src/
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── EmployeeSalary.ts
│   │   │   ├── Attendance.ts
│   │   │   ├── Leave.ts
│   │   │   ├── LeaveBalance.ts
│   │   │   ├── Payroll.ts
│   │   │   ├── PayrollItem.ts
│   │   │   ├── WorkSchedule.ts
│   │   │   ├── Holiday.ts
│   │   │   └── EmployeeLoan.ts
│   │   ├── value-objects/
│   │   │   ├── PTKPStatus.ts
│   │   │   ├── GeoLocation.ts
│   │   │   ├── Money.ts
│   │   │   └── WorkingHours.ts
│   │   ├── services/
│   │   │   ├── PayrollCalculator.ts
│   │   │   ├── PPh21Calculator.ts
│   │   │   ├── BPJSCalculator.ts
│   │   │   ├── OvertimeCalculator.ts
│   │   │   └── AttendanceValidator.ts
│   │   ├── repositories/
│   │   │   ├── ISalaryRepository.ts
│   │   │   ├── IAttendanceRepository.ts
│   │   │   ├── ILeaveRepository.ts
│   │   │   └── IPayrollRepository.ts
│   │   └── events/
│   │       ├── AttendanceEvents.ts
│   │       ├── LeaveEvents.ts
│   │       └── PayrollEvents.ts
│   │
│   ├── application/
│   │   ├── commands/
│   │   │   ├── ClockIn.ts
│   │   │   ├── ClockOut.ts
│   │   │   ├── RequestLeave.ts
│   │   │   ├── ApproveLeave.ts
│   │   │   ├── ProcessPayroll.ts
│   │   │   └── UpdateSalary.ts
│   │   ├── queries/
│   │   │   ├── GetAttendanceReport.ts
│   │   │   ├── GetLeaveBalance.ts
│   │   │   ├── GetPayslip.ts
│   │   │   └── GetPayrollSummary.ts
│   │   └── event-handlers/
│   │       ├── EmployeeCreatedHandler.ts
│   │       └── EmployeeTerminatedHandler.ts
│   │
│   ├── infrastructure/
│   │   ├── db/
│   │   │   ├── schema.ts
│   │   │   └── repositories/
│   │   ├── http/
│   │   │   └── routes/
│   │   │       ├── attendance.routes.ts
│   │   │       ├── leave.routes.ts
│   │   │       ├── payroll.routes.ts
│   │   │       ├── salary.routes.ts
│   │   │       └── schedule.routes.ts
│   │   ├── pdf/
│   │   │   └── PayslipGenerator.ts
│   │   └── events/
│   │       ├── publisher.ts
│   │       └── subscriber.ts
│   │
│   └── index.ts
│
├── migrations/
│   ├── 0001_employee_salaries.sql
│   ├── 0002_work_schedules.sql
│   ├── 0003_attendances.sql
│   ├── 0004_leaves.sql
│   ├── 0005_payrolls.sql
│   ├── 0006_holidays.sql
│   └── 0007_employee_loans.sql
│
├── test/
│   ├── unit/
│   │   ├── PPh21Calculator.test.ts
│   │   ├── BPJSCalculator.test.ts
│   │   └── OvertimeCalculator.test.ts
│   ├── integration/
│   └── e2e/
│
├── wrangler.toml
├── package.json
└── tsconfig.json
```

---

## Security Considerations

### Data Sensitivity Levels

| Data Type | Sensitivity | Access Control |
|-----------|-------------|----------------|
| Salary Structure | HIGH | HR Admin, Finance, Self |
| Payslip | HIGH | HR Admin, Finance, Self |
| BPJS Numbers | MEDIUM | HR Admin, Self |
| Bank Account | HIGH | HR Admin, Finance |
| Attendance | LOW | HR Admin, Manager, Self |
| Leave Requests | LOW | HR Admin, Manager, Self |

### Permission Model

```typescript
const HRM_PERMISSIONS = {
  // Attendance
  'hrm:attendance:clock': 'Can clock in/out (self)',
  'hrm:attendance:view': 'Can view attendance records',
  'hrm:attendance:manage': 'Can manage all attendance',

  // Leave
  'hrm:leave:request': 'Can request leave (self)',
  'hrm:leave:view': 'Can view leave requests',
  'hrm:leave:approve': 'Can approve/reject leave',
  'hrm:leave:manage': 'Can manage all leaves',

  // Salary
  'hrm:salary:view-self': 'Can view own salary',
  'hrm:salary:view-all': 'Can view all salaries',
  'hrm:salary:manage': 'Can manage salaries',

  // Payroll
  'hrm:payroll:view': 'Can view payroll',
  'hrm:payroll:process': 'Can process payroll',
  'hrm:payroll:approve': 'Can approve payroll',

  // Admin
  'hrm:schedule:manage': 'Can manage work schedules',
  'hrm:holiday:manage': 'Can manage holidays',
  'hrm:loan:manage': 'Can manage employee loans',
};
```

---

## Monthly Payroll Processing Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        MONTHLY PAYROLL FLOW                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. CREATE PAYROLL PERIOD                                                    │
│     └─► Status: DRAFT                                                        │
│                                                                              │
│  2. PROCESS PAYROLL                                                          │
│     ├─► Fetch all active employees from Business Partner Service             │
│     ├─► For each employee:                                                   │
│     │   ├─► Get salary structure                                             │
│     │   ├─► Get attendance for period (working days, overtime, late)         │
│     │   ├─► Calculate gross salary (basic + allowances + overtime)           │
│     │   ├─► Calculate BPJS deductions (employee portion)                     │
│     │   ├─► Calculate PPh 21 (using TER for monthly)                         │
│     │   ├─► Apply loan deductions                                            │
│     │   ├─► Calculate net salary                                             │
│     │   └─► Calculate company contributions (BPJS company portion)           │
│     └─► Status: CALCULATED                                                   │
│                                                                              │
│  3. REVIEW & APPROVE                                                         │
│     ├─► HR reviews all payroll items                                         │
│     ├─► Make corrections if needed                                           │
│     ├─► Finance/Management approval                                          │
│     └─► Status: APPROVED                                                     │
│                                                                              │
│  4. EXECUTE PAYMENT                                                          │
│     ├─► Generate bank transfer file                                          │
│     ├─► Execute transfers                                                    │
│     ├─► Publish PayrollPaid event → Accounting Service                       │
│     └─► Status: PAID                                                         │
│                                                                              │
│  5. CLOSE PERIOD                                                             │
│     ├─► Generate payslips                                                    │
│     ├─► Archive records                                                      │
│     └─► Status: CLOSED                                                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## References

- [PPh 21 Tarif TER 2025-2026](https://klikpajak.id/blog/pajak-penghasilan-pasal-21-2/)
- [PTKP 2026](https://artikel.pajakku.com/ptkp-2026-bagi-wajib-pajak-simak-aturan-terbarunya)
- [BPJS Ketenagakerjaan Rates 2026](https://dealls.com/pengembangan-karir/potongan-bpjs-ketenagakerjaan)
- [PP 58/2023 - Tarif Pemotongan PPh 21](https://www.softwarepajak.net/news/informasi-pph-21-terbaru-2025-regulasi-dan-skema/)
- [PMK 168/2023 - Petunjuk Pelaksanaan PPh 21](https://muc.co.id/en/article/effective-1-january-2024-regulation-on-the-use-of-effective-rates-of-ita-21-released)

---

**Document Version**: 1.0
**Created**: January 2026
**Last Updated**: January 2026
**Status**: Design Phase
**Maintained By**: Development Team
