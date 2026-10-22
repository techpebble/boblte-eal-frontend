/**
 * Mirrors the server's own check. This is for tidiness only — hiding a
 * control is not what stops anyone doing anything; the API refuses it
 * regardless, and that is the guarantee.
 */
export const can = (user, key) => {
  const role = user?.role
  if (!role) return false
  if (role.isSystem) return true
  return Array.isArray(role.permissions) && role.permissions.includes(key)
}

/** Keeps the menu groups a person can actually use, dropping empty ones. */
export const visibleGroups = (groups, user) =>
  groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.permission || can(user, item.permission))
    }))
    .filter((group) => group.items.length > 0)
