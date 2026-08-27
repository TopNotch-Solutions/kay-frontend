/**
 * Maps backend `user.role` (Role.name, snake_case) to the app home path after login.
 * Kay One only ships front office, doctor, and system admin.
 */

/** @type {Record<string, string>} role slug → default route after login */
const ROLE_HOME_PATHS = {
  front_office: '/front_office',
  doctor: '/doctor',
  system_admin: '/system_admin',
};

/** Legacy, informal, or queue-department slugs → canonical Role.name */
const ROLE_ALIASES = {
  fo: 'front_office',
  reception: 'front_office',
  admin: 'system_admin',
};

/** Display labels */
const ROLE_DISPLAY_NAMES = {
  front_office: 'Front Office / Reception',
  doctor: 'Doctor',
  system_admin: 'System Administrator',
};

export function normalizeRoleSlug(roleName) {
  const raw =
    typeof roleName === 'string'
      ? roleName.trim()
      : roleName && typeof roleName === 'object' && typeof roleName.name === 'string'
        ? roleName.name.trim()
        : '';
  const key = raw.toLowerCase();
  if (!key) return '';
  return ROLE_ALIASES[key] || key;
}

export function roleDisplayName(roleSlug) {
  const key = normalizeRoleSlug(roleSlug);
  if (!key) return 'Unknown role';
  return ROLE_DISPLAY_NAMES[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function roleAccessHint(roleSlug) {
  const key = normalizeRoleSlug(roleSlug);
  if (!key) {
    return 'Your account has no role assigned. Contact your system administrator.';
  }
  const label = roleDisplayName(key);
  const expected = ROLE_HOME_PATHS[key]
    ? `Expected role slug: "${key}" (${label}).`
    : `Role "${key}" is not configured in this app version.`;
  return `Your account role "${key}" (${label}) cannot open its module. ${expected} Ask a system administrator to verify your account and redeploy the latest frontend if needed.`;
}

/** Resolve role slug from login /me payload (string, nested role, or alias). */
export function authRoleSlug(user) {
  if (!user || typeof user !== 'object') return '';
  if (typeof user.role === 'string' && user.role.trim()) return normalizeRoleSlug(user.role);
  if (typeof user.role_name === 'string' && user.role_name.trim()) return normalizeRoleSlug(user.role_name);
  if (user.role && typeof user.role === 'object' && typeof user.role.name === 'string') {
    return normalizeRoleSlug(user.role.name);
  }
  return '';
}

/** Role required for a module path (longest prefix wins). */
export function requiredRoleForPath(pathname) {
  const path = (pathname || '').split('?')[0];
  const entries = Object.entries(ROLE_HOME_PATHS).sort((a, b) => b[1].length - a[1].length);
  for (const [role, prefix] of entries) {
    if (path === prefix || path.startsWith(`${prefix}/`)) {
      return role;
    }
  }
  return null;
}

export function isRoleAllowedForPath(pathname, user) {
  const required = requiredRoleForPath(pathname);
  if (!required) return true;
  const slug = authRoleSlug(user).toLowerCase();
  return slug === required;
}

export function hasHomePathForRole(roleName) {
  const key = normalizeRoleSlug(roleName);
  return Boolean(key && ROLE_HOME_PATHS[key]);
}

export function homePathForRole(roleName) {
  const key = normalizeRoleSlug(roleName);
  if (!key) return null;
  return ROLE_HOME_PATHS[key] || null;
}

/** All backend role slugs that have a frontend home route. */
export function allConfiguredRoleSlugs() {
  return Object.keys(ROLE_HOME_PATHS);
}

/** When the API is unreachable (e.g. no backend / CORS), infer home from email for local UI demos only. */
export function demoHomePathFromEmail(email) {
  const e = (email || '').toLowerCase().trim();
  const local = e.split('@')[0]?.replace(/\./g, '_') || '';
  if (local) {
    const path = homePathForRole(local);
    if (path) return path;
  }
  if (e.includes('front')) return '/front_office';
  if (e.includes('doctor')) return '/doctor';
  if (e.includes('admin')) return '/system_admin';
  return '/front_office';
}
