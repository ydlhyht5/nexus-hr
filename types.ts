
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

export interface Employee {
  id: string; // Generated: Pinyin initials + MMDD
  name: string;
  jobTitle: string; // Added field for "Role" / Position
  gender: Gender;
  joinDate: string; // YYYY-MM-DD
  probationSalary: number;
  fullSalary: number;
  probationMonths: number;
  password: string; // Default: '1234'
  isFirstLogin: boolean;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  startDate: string;
  endDate: string;
  days: number; // Added duration in days
  reason: string;
  status: LeaveStatus;
  createdAt: number; // Timestamp for 6-hour check
  rejectionReason?: string;
}

export interface SalaryRecord {
  id: string; // composite: empId_YYYY-MM
  employeeId: string;
  employeeName: string;
  month: string; // YYYY-MM
  basicSalary: number;
  salesAmount: number;
  bonusRate: number; // percentage (e.g., 3 for 3%)
  bonusAmount: number;
  totalSalary: number;
  updatedAt: number;
}

export interface UserSession {
  id: string;
  role: UserRole;
  name: string;
}
