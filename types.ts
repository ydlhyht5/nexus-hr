export enum UserRole {
  ADMIN = 'ADMIN',
  EMPLOYEE = 'EMPLOYEE'
}

export enum Gender {
  MALE = 'Male',
  FEMALE = 'Female',
  OTHER = 'Other'
}

export enum LeaveStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export interface Syncable {
  synced?: boolean; // false = pending upload, true/undefined = synced
}

export interface Employee extends Syncable {
  id: string; // Generated: Pinyin initials + MMDD
  name: string;
  jobTitle: string; 
  gender: Gender;
  joinDate: string; // YYYY-MM-DD
  probationSalary: number;
  fullSalary: number;
  probationMonths: number;
  password: string; // Default: '1234'
  isFirstLogin: boolean;
}

export interface LeaveRequest extends Syncable {
  id: string;
  employeeId: string;
  employeeName: string;
  startDate: string;
  endDate: string;
  days: number; 
  reason: string;
  status: LeaveStatus;
  createdAt: number; 
  rejectionReason?: string;
}

export interface SalaryRecord extends Syncable {
  id: string; // composite: empId_YYYY-MM
  employeeId: string;
  employeeName: string;
  month: string; // YYYY-MM
  basicSalary: number;
  manualWorkDays?: number; // Manual override for work days
  standardSalary?: number; // Theoretical full salary for the period
  leaveDeduction?: number; // Amount deducted due to leave
  salesAmount: number;
  bonusRate: number; 
  bonusAmount: number;
  totalSalary: number;
  updatedAt: number;
}

export interface UserSession {
  id: string;
  role: UserRole;
  name: string;
}
