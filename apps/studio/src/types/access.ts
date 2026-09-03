export type AppRole = 'sales_rep' | 'supervisor' | 'manager' | 'admin';

export interface AccessProfile {
  userId: string;
  displayName: string;
  role: AppRole;
  isActive: boolean;
  companyId: number | null;
  teamId: number | null;
  salespersonId: number | null;
  canViewExecutive: boolean;
  canManageUsers: boolean;
}

export type AccessStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'inactive' | 'unauthorized' | 'not_configured';
