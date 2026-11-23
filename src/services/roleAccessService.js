// Role Page Access & Security Service
// Integrates with Centralized Roles Configuration (rolesConfig.js) and Supabase
import { supabase } from '../lib/supabase/client.jsx';
import {
  SYSTEM_ROLES,
  SYSTEM_ROLE_NAMES,
  IMMUTABLE_ROLES,
  getRoleDefinition,
} from '../config/rolesConfig.js';

export const ADMIN_PAGES = [
  {
    path: '/admin',
    key: 'dashboard',
    name: 'Dashboard',
    group: 'Overview',
    description: 'Main metrics, recent bookings and operational overview',
    defaultRoles: ['super_admin', 'manager', 'receptionist', 'employee', 'accountant'],
  },
  {
    path: '/admin/packages',
    key: 'packages',
    name: 'Packages & Services',
    group: 'Sales & operations',
    description: 'Travel packages, tours, itineraries, and inclusions',
    defaultRoles: ['super_admin', 'manager', 'receptionist', 'employee'],
  },
  {
    path: '/admin/blog',
    key: 'blog',
    name: 'Blog Articles',
    group: 'Sales & operations',
    description: 'Travel stories, guides, and articles for the public blog',
    defaultRoles: ['super_admin', 'manager', 'receptionist', 'employee'],
  },
  {
    path: '/admin/bookings',
    key: 'bookings',
    name: 'Bookings',
    group: 'Sales & operations',
    description: 'Reservations, traveler manifests, and booking management',
    defaultRoles: ['super_admin', 'manager', 'receptionist', 'accountant'],
  },
  {
    path: '/admin/customers',
    key: 'customers',
    name: 'Customers',
    group: 'Sales & operations',
    description: 'Customer directory, contact details, and travel history',
    defaultRoles: ['super_admin', 'manager', 'receptionist'],
  },
  {
    path: '/admin/messages',
    key: 'messages',
    name: 'Contact Messages & Inquiries',
    group: 'Sales & operations',
    description: 'Direct inquiries and requests received from the public /contact form',
    defaultRoles: ['super_admin', 'manager', 'receptionist', 'employee'],
  },
  {
    path: '/admin/suppliers',
    key: 'suppliers',
    name: 'Suppliers',
    group: 'Partners',
    description: 'Hotels, transport providers, local guides, and contracts',
    defaultRoles: ['super_admin', 'manager'],
  },
  {
    path: '/admin/contracts',
    key: 'contracts',
    name: 'Contracts',
    group: 'Partners',
    description: 'Official 16-section travel contracts, PDF generation, and signatures',
    defaultRoles: ['super_admin', 'manager', 'accountant'],
  },
  {
    path: '/admin/finance',
    key: 'finance',
    name: 'Finance',
    group: 'Finance',
    description: 'Cashflow overview, supplier payments, and financial summaries',
    defaultRoles: ['super_admin', 'manager', 'accountant'],
  },
  {
    path: '/admin/payments-transactions',
    key: 'payments_transactions',
    name: 'Payments & Transactions',
    group: 'Finance',
    description: 'Client invoices, deposit payments, transaction ledgers, and refunds',
    defaultRoles: ['super_admin', 'manager', 'accountant'],
  },
  {
    path: '/admin/expenses',
    key: 'expenses',
    name: 'Expenses',
    group: 'Finance',
    description: 'Operational expenses, supplier invoices, and receipts',
    defaultRoles: ['super_admin', 'manager', 'accountant'],
  },
  {
    path: '/admin/analytics',
    key: 'analytics',
    name: 'Analytics',
    group: 'Insights',
    description: 'Revenue graphs, booking conversion, and performance reporting',
    defaultRoles: ['super_admin', 'manager'],
  },
  {
    path: '/admin/team',
    key: 'team',
    name: 'Team Directory & Roles',
    group: 'Administration',
    description: 'Staff accounts, role assignments, approvals, and page access control',
    defaultRoles: ['super_admin', 'manager'],
  },
  {
    path: '/admin/settings',
    key: 'settings',
    name: 'Settings',
    group: 'Administration',
    description: 'Currency, contract templates, language, and agency branding',
    defaultRoles: ['super_admin', 'manager'],
  },
  {
    path: '/admin/profile',
    key: 'profile',
    name: 'Profile',
    group: 'Administration',
    description: 'Personal account profile and preferences',
    defaultRoles: ['super_admin', 'manager', 'receptionist', 'employee', 'accountant'],
  },
  {
    path: '/admin/support',
    key: 'support',
    name: 'Support',
    group: 'Help',
    description: 'Support center, documentation, and operational help',
    defaultRoles: ['super_admin', 'manager', 'receptionist', 'employee', 'accountant'],
  },
];

const PRIVILEGED_ROLE = 'super_admin';
export const ALWAYS_FULL_ACCESS_ROLES = IMMUTABLE_ROLES;

/**
 * Builds the default permissions mapping: { [roleName]: string[] of allowed paths }
 */
export function buildDefaultRolePagePermissions() {
  const allPaths = ADMIN_PAGES.map((p) => p.path);
  const permissions = {};
  SYSTEM_ROLE_NAMES.forEach((role) => {
    if (ALWAYS_FULL_ACCESS_ROLES.includes(role)) {
      permissions[role] = allPaths;
    } else {
      permissions[role] = ADMIN_PAGES.filter((page) => page.defaultRoles.includes(role)).map((page) => page.path);
    }
  });
  return permissions;
}

function normalizeRolePermissions(permissions = {}) {
  const defaults = buildDefaultRolePagePermissions();
  const validPaths = new Set(ADMIN_PAGES.map((page) => page.path));
  const normalized = { ...defaults };

  Object.entries(permissions).forEach(([role, paths]) => {
    if (ALWAYS_FULL_ACCESS_ROLES.includes(role)) {
      normalized[role] = ADMIN_PAGES.map((page) => page.path);
    } else if (Array.isArray(paths)) {
      normalized[role] = [...new Set(paths.filter((path) => typeof path === 'string' && validPaths.has(path)))];
    }
  });

  return normalized;
}

/**
 * Ensures all system roles exist in Supabase and returns the unified list of roles.
 * If the database only has super_admin, this automatically syncs manager, receptionist,
 * employee, and accountant so the UI and permission matrix always have all roles available.
 */
export async function fetchOrSyncRoles() {
  let dbRoles = [];
  try {
    const { data, error } = await supabase.from('roles').select('*');
    if (!error && Array.isArray(data)) {
      dbRoles = data;
    }
  } catch (err) {
    console.warn('Could not query roles table:', err);
  }

  const existingMap = new Map();
  dbRoles.forEach((r) => {
    if (r?.name) existingMap.set(r.name.toLowerCase(), r);
  });

  const missingSystemRoles = SYSTEM_ROLES.filter((sysRole) => !existingMap.has(sysRole.name));

  // If there are missing roles, attempt to insert them into public.roles
  if (missingSystemRoles.length > 0) {
    try {
      const rowsToInsert = missingSystemRoles.map((r) => ({
        name: r.name,
        description: r.defaultDescription,
      }));
      const { data: inserted, error: insertError } = await supabase
        .from('roles')
        .insert(rowsToInsert)
        .select('*');

      if (!insertError && Array.isArray(inserted)) {
        inserted.forEach((r) => {
          if (r?.name) existingMap.set(r.name.toLowerCase(), r);
        });
      }
    } catch (insertErr) {
      console.warn('Could not auto-insert missing system roles to database:', insertErr);
    }
  }

  // Build the complete combined list of roles
  const combinedRoles = [];

  // Add system roles in their defined order
  SYSTEM_ROLES.forEach((sysRole) => {
    const fromDb = existingMap.get(sysRole.name);
    if (fromDb) {
      combinedRoles.push({
        ...fromDb,
        labelKey: sysRole.labelKey,
        defaultLabel: sysRole.defaultLabel,
        descriptionKey: sysRole.descriptionKey,
        isImmutable: sysRole.isImmutable,
        order: sysRole.order,
      });
    } else {
      // Deterministic fallback ID if database insert was blocked
      combinedRoles.push({
        id: `sys-role-${sysRole.name}`,
        name: sysRole.name,
        description: sysRole.defaultDescription,
        labelKey: sysRole.labelKey,
        defaultLabel: sysRole.defaultLabel,
        descriptionKey: sysRole.descriptionKey,
        isImmutable: sysRole.isImmutable,
        order: sysRole.order,
      });
    }
  });

  // Add any custom roles that might exist in the database beyond system roles
  dbRoles.forEach((dbRole) => {
    if (dbRole?.name && !SYSTEM_ROLE_NAMES.includes(dbRole.name.toLowerCase())) {
      combinedRoles.push({
        ...dbRole,
        isImmutable: false,
        order: 99,
      });
    }
  });

  return combinedRoles;
}

/**
 * Loads per-role access from Supabase, falling back to shared defaults for roles not yet configured.
 */
export async function fetchRolePagePermissions() {
  const { data, error } = await supabase
    .from('role_page_permissions')
    .select('allowed_paths, roles(name)');
  if (error) throw error;

  const permissions = buildDefaultRolePagePermissions();
  (data || []).forEach((row) => {
    const role = Array.isArray(row.roles) ? row.roles[0] : row.roles;
    if (role?.name && Array.isArray(row.allowed_paths)) {
      permissions[role.name] = row.allowed_paths;
    }
  });

  return normalizeRolePermissions(permissions);
}

/**
 * Persists the complete role matrix so changes apply across users and devices.
 */
export async function saveRolePagePermissions(permissions, roles, updatedBy) {
  if (!Array.isArray(roles) || roles.length === 0) {
    throw new Error('No roles are available to save page access for.');
  }

  const normalized = normalizeRolePermissions(permissions);

  // If any role has a synthetic ID (sys-role-...), attempt to resolve or insert it in DB first
  for (const role of roles) {
    if (role?.id && String(role.id).startsWith('sys-role-')) {
      try {
        const { data: dbRole } = await supabase
          .from('roles')
          .select('id, name')
          .eq('name', role.name)
          .maybeSingle();

        if (dbRole?.id) {
          role.id = dbRole.id;
        } else {
          const { data: createdRole } = await supabase
            .from('roles')
            .insert([{ name: role.name, description: role.description || '' }])
            .select('id')
            .maybeSingle();
          if (createdRole?.id) {
            role.id = createdRole.id;
          }
        }
      } catch (err) {
        console.warn(`Could not sync role ${role.name} before saving permissions:`, err);
      }
    }
  }

  // Filter to rows with real UUIDs (not sys-role-...)
  const rows = roles
    .filter((role) => role?.id && role?.name && !String(role.id).startsWith('sys-role-'))
    .map((role) => ({
      role_id: role.id,
      allowed_paths: normalized[role.name] || [],
      updated_by: updatedBy || null,
      updated_at: new Date().toISOString(),
    }));

  if (rows.length > 0) {
    const { error } = await supabase
      .from('role_page_permissions')
      .upsert(rows, { onConflict: 'role_id' });
    if (error) throw error;
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('role-permissions-updated', { detail: normalized }));
  }
  return normalized;
}

/**
 * Checks if a user possessing any of `userRoles` is allowed to access `pagePath`.
 * Managers and super admins always have unrestricted access; other roles use their saved matrix.
 */
export function canUserAccessPath(userRoles = [], pagePath, rolePermissions = buildDefaultRolePagePermissions()) {
  const normalizedPath = pagePath.replace(/\/$/, '').replace(/^\/admin\/packages-services(?=\/|$)/, '/admin/packages');

  if (normalizedPath === '/admin/profile' || normalizedPath.startsWith('/admin/profile/')) {
    return true;
  }

  if (!userRoles || userRoles.length === 0) {
    // If no roles are assigned, deny access to protected subpages
    return Boolean(rolePermissions) && (normalizedPath === '/admin' || normalizedPath === '/admin/support');
  }

  if (userRoles.some((role) => ALWAYS_FULL_ACCESS_ROLES.includes(role))) {
    return true;
  }
  if (!rolePermissions) return false;

  // Normalize path by stripping trailing slashes or subpaths (e.g. /admin/payments-transactions/123 -> /admin/payments-transactions)
  const matchedPage = ADMIN_PAGES.find((p) => {
    if (p.path === normalizedPath) return true;
    if (p.path !== '/admin' && normalizedPath.startsWith(`${p.path}/`)) return true;
    return false;
  });

  const targetPath = matchedPage ? matchedPage.path : normalizedPath;

  // Check if any of the user's roles has access to this target path
  return userRoles.some((role) => {
    const allowed = rolePermissions[role];
    if (Array.isArray(allowed)) {
      return allowed.includes(targetPath);
    }
    return false;
  });
}
