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

/**
 * The first page in the menu this person can actually open, used to land
 * someone somewhere sensible when the page they asked for is not theirs.
 * Null when their role opens nothing at all.
 */
export const firstAllowedPath = (groups, user) => {
  const visible = visibleGroups(groups, user)
  return visible[0]?.items[0]?.path ?? null
}
