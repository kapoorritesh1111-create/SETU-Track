export type OrgRole = "owner" | "admin" | "manager" | "contractor";

export function isOrgAdminRole(role: string | null | undefined) {
  return role === "owner" || role === "admin";
}

export function isManagerOrAdminRole(role: string | null | undefined) {
  return role === "owner" || role === "admin" || role === "manager";
}

export function roleLabel(role: string | null | undefined) {
  if (role === "owner") return "Owner";
  if (role === "admin") return "Super Admin";
  if (role === "manager") return "Manager";
  if (role === "contractor") return "Contractor";
  return role || "User";
}
