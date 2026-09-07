import type { Role } from "./types";
export type Permission = "read" | "write" | "export" | "users" | "rules";
const grants: Record<Role, Permission[]> = {
  OWNER: ["read", "write", "export", "users", "rules"],
  EDITOR: ["read", "write", "export"],
  VIEWER: ["read"],
};
export function can(role: Role, permission: Permission): boolean {
  return grants[role]?.includes(permission) ?? false;
}
