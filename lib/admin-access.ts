import type { AdminUser } from "@/types"

export type AdminPageKey = (typeof ADMIN_PAGES)[number]["key"]

export type AdminNavItem = (typeof ADMIN_PAGES)[number]

export const ADMIN_LOGIN_PATH = "/admin/login"

export const ADMIN_PAGES = [
  { key: "stats", label: "Statistics", href: "/admin/stats" },
  { key: "users", label: "User Management", href: "/admin/users" },
  { key: "fields", label: "Card Fields", href: "/admin/fields" },
  { key: "contacts", label: "Contact Status", href: "/admin/contacts" },
  { key: "config", label: "Platform Config", href: "/admin/config" },
  { key: "offers", label: "Offers", href: "/admin/offers" },
  { key: "banners", label: "Home Banners", href: "/admin/banners" },
  { key: "notifications", label: "Send Notifications", href: "/admin/notifications" },
  { key: "notif_assist", label: "Notification Assistance", href: "/admin/notif-assist" },
  { key: "access", label: "User Access", href: "/admin/access" },
] as const satisfies readonly {
  key: string
  label: string
  href: string
}[]

export function getAdminPageFromPathname(pathname: string) {
  return ADMIN_PAGES.find((page) => page.href === pathname) ?? null
}

export function getAccessibleAdminPages(admin: Pick<AdminUser, "role" | "accessible_pages"> | null | undefined) {
  if (!admin) return []
  if (admin.role === "owner") return [...ADMIN_PAGES]
  return ADMIN_PAGES.filter((page) => admin.accessible_pages?.includes(page.key))
}

export function canAccessAdminPath(
  admin: Pick<AdminUser, "role" | "accessible_pages"> | null | undefined,
  pathname: string,
) {
  if (pathname === ADMIN_LOGIN_PATH) return true

  const page = getAdminPageFromPathname(pathname)
  if (!page) return false
  if (!admin) return false
  if (admin.role === "owner") return true

  return admin.accessible_pages?.includes(page.key) ?? false
}

export function getDefaultAdminPath(admin: Pick<AdminUser, "role" | "accessible_pages"> | null | undefined) {
  return getAccessibleAdminPages(admin)[0]?.href ?? null
}
