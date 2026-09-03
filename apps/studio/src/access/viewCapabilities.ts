import type { AppRole } from '../types/access';

export type AppViewId = 'executive' | 'sales' | 'customers' | 'customer-action-center' | 'sales-rep-daily-action-center' | 'sales-reps' | 'products' | 'categories' | 'areas' | 'lost-customers' | 'settings' | 'admin-users' | 'ai-assistant';

const ROLE_VIEWS: Record<AppRole, ReadonlySet<AppViewId>> = {
  sales_rep: new Set(['customers','customer-action-center','sales-rep-daily-action-center','products','lost-customers','ai-assistant']),
  supervisor: new Set(['sales','customers','customer-action-center','sales-rep-daily-action-center','sales-reps','products','lost-customers','ai-assistant']),
  manager: new Set(['executive','sales','customers','customer-action-center','sales-rep-daily-action-center','sales-reps','products','categories','areas','lost-customers','settings','ai-assistant']),
  admin: new Set(['executive','sales','customers','customer-action-center','sales-rep-daily-action-center','sales-reps','products','categories','areas','lost-customers','settings','admin-users','ai-assistant']),
};

export function canViewAppView(role: AppRole, view: AppViewId): boolean { return ROLE_VIEWS[role].has(view); }
export function getDefaultViewForRole(role: AppRole): AppViewId { return role === 'sales_rep' ? 'sales-rep-daily-action-center' : role === 'supervisor' ? 'sales-reps' : 'executive'; }
export function getAllowedViewsForRole(role: AppRole): AppViewId[] { return Array.from(ROLE_VIEWS[role]); }
