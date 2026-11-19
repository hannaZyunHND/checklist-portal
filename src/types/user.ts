export type UserRole = 'MANAGER' | 'STAFF';

export type DepartmentType = 'PD' | 'OM' | 'OTHER';

export function normalizeUserRole(rawRole: string | undefined | null): UserRole {
  if (rawRole === 'MANAGER' || rawRole === 'PD') return 'MANAGER';
  return 'STAFF';
}

export function inferDefaultDepartment(rawRole: string | undefined | null, dept?: string): DepartmentType {
  if (dept === 'PD' || dept === 'OM' || dept === 'OTHER') return dept;
  if (rawRole === 'PD') return 'PD';
  if (rawRole === 'OM') return 'OM';
  return 'OTHER';
}

export const ACCOUNT_ROLE_LABELS: Record<UserRole, string> = {
  MANAGER: 'Quản lý',
  STAFF: 'Nhân viên',
};

export const DEPARTMENT_LABELS: Record<DepartmentType, string> = {
  PD: 'Bộ phận PD',
  OM: 'Bộ phận OM',
  OTHER: 'Chung / Khác',
};

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  avatarDataUrl: string;
  role: UserRole;
  department?: DepartmentType;
  createdAt: number;
  updatedAt: number;
}

export interface UserSnapshot {
  uid: string;
  displayName: string;
  email: string;
  avatarDataUrl: string;
}
