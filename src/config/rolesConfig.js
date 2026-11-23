// Centralized System Roles Configuration
// Compatible with AppSettingsContext, Supabase schema, and Role Access Control Matrix

export const SYSTEM_ROLES = [
  {
    name: 'super_admin',
    labelKey: 'role_super_admin',
    defaultLabel: 'Super Admin',
    descriptionKey: 'role_super_admin_desc',
    defaultDescription: 'Full system access, security management, and role permission administration.',
    isImmutable: true,
    order: 1,
    badgeCls: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    dotCls: 'bg-indigo-500',
  },
  {
    name: 'manager',
    labelKey: 'role_manager',
    defaultLabel: 'Manager',
    descriptionKey: 'role_manager_desc',
    defaultDescription: 'Full administrative access across operations, teams, bookings, logistics, and settings.',
    isImmutable: true,
    order: 2,
    badgeCls: 'bg-amber-50 text-amber-800 ring-amber-200',
    dotCls: 'bg-amber-500',
  },
  {
    name: 'receptionist',
    labelKey: 'role_receptionist',
    defaultLabel: 'Receptionist',
    descriptionKey: 'role_receptionist_desc',
    defaultDescription: 'Front-desk customer care, reservation handling, check-in, and daily client inquiries.',
    isImmutable: false,
    order: 3,
    badgeCls: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    dotCls: 'bg-emerald-500',
  },
  {
    name: 'employee',
    labelKey: 'role_employee',
    defaultLabel: 'Employee',
    descriptionKey: 'role_employee_desc',
    defaultDescription: 'Operational staff member with role-based access to assigned packages and travel tasks.',
    isImmutable: false,
    order: 4,
    badgeCls: 'bg-sky-50 text-sky-800 ring-sky-200',
    dotCls: 'bg-sky-500',
  },
  {
    name: 'accountant',
    labelKey: 'role_accountant',
    defaultLabel: 'Accountant',
    descriptionKey: 'role_accountant_desc',
    defaultDescription: 'Financial management, customer billing, payment ledgers, invoices, and expenses.',
    isImmutable: false,
    order: 5,
    badgeCls: 'bg-violet-50 text-violet-800 ring-violet-200',
    dotCls: 'bg-violet-500',
  },
];

export const SYSTEM_ROLE_NAMES = SYSTEM_ROLES.map((r) => r.name);
export const IMMUTABLE_ROLES = SYSTEM_ROLES.filter((r) => r.isImmutable).map((r) => r.name);

export function getRoleDefinition(roleName) {
  if (!roleName) return null;
  const key = String(roleName).trim().toLowerCase();
  return SYSTEM_ROLES.find((r) => r.name === key) || null;
}

export function isImmutableRole(roleName) {
  return IMMUTABLE_ROLES.includes(String(roleName).trim().toLowerCase());
}

export function formatRoleLabel(roleName, translator) {
  if (!roleName) return '—';
  const def = getRoleDefinition(roleName);
  if (!def) {
    return roleName.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
  }
  if (typeof translator === 'function') {
    const translated = translator(def.labelKey, def.defaultLabel);
    if (translated && translated !== def.labelKey) return translated;
  }
  return def.defaultLabel;
}

export function formatRoleDescription(roleName, translator) {
  const def = getRoleDefinition(roleName);
  if (!def) return '';
  if (typeof translator === 'function') {
    const translated = translator(def.descriptionKey, def.defaultDescription);
    if (translated && translated !== def.descriptionKey) return translated;
  }
  return def.defaultDescription;
}

export function getRoleBadgeStyle(roleName) {
  const def = getRoleDefinition(roleName);
  return def?.badgeCls || 'bg-slate-100 text-slate-700 ring-slate-200';
}

export function getRoleDotStyle(roleName) {
  const def = getRoleDefinition(roleName);
  return def?.dotCls || 'bg-slate-400';
}
