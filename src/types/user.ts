export type UserRole = 'PD' | 'OM';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  avatarDataUrl: string;
  role: UserRole;
  createdAt: number;
  updatedAt: number;
}

export interface UserSnapshot {
  uid: string;
  displayName: string;
  email: string;
  avatarDataUrl: string;
}
