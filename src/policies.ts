import type { UserRole } from "./types";

/**
 * Exact validation constraints enforced by backend DTOs & PostgreSQL schema:
 * - CreateUserRequest.java & 02-seed-auth.sql: ^[a-z0-9_-]{3,32}$, password >= 8
 * - CreateWorkspaceRequest.java: ^[a-zA-Z0-9._-]+$, cannot be ".."
 * - FileService.java / StreamingController.java: no "..", no "\\", no "encoded" segment
 */
export const USERNAME_REGEX = /^[a-z0-9_-]{3,32}$/;
export const MIN_PASSWORD_LENGTH = 8;
export const WORKSPACE_NAME_REGEX = /^[a-zA-Z0-9._-]+$/;

/**
 * Extensions supported by nas-orchestrator MimeTypeResolver.java for /files/preview & /shared/preview
 */
export const PREVIEWABLE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "svg",
  "pdf",
  "en",
  "txt",
  "md",
  "csv",
  "json",
]);

export const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "svg"]);
export const TEXT_EXTENSIONS = new Set(["txt", "md", "csv", "json"]);
export const VIDEO_EXTENSIONS = new Set(["mp4", "mov", "mkv", "avi", "webm", "m4v"]);

export function hasEncodedSegment(path: string): boolean {
  const normalized = path.replace(/\\/g, "/").replace(/^\/+/, "");
  return (
    normalized === "encoded" ||
    normalized.startsWith("encoded/") ||
    normalized.includes("/encoded/") ||
    normalized.endsWith("/encoded")
  );
}

export function isValidRelativePath(path: string): boolean {
  if (path.includes("..") || path.includes("\\")) return false;
  if (hasEncodedSegment(path)) return false;
  return true;
}

/**
 * Role capabilities derived directly from:
 * - postgres-init/sql/03-seed-policy.sql
 * - policy-registry DecisionEngine.java
 * - api-gateway application.yaml
 * - auth-service AuthController.java
 */
export interface RoleCapabilities {
  canManageUsers: boolean;
  canCreateRoles: ("RESIDENT" | "GUEST")[];
  canListUsers: boolean;
  canAccessOwnNas: boolean;
  canWriteOwnNas: boolean;
  canListSharedNas: boolean;
  canReadSharedNas: boolean;
  canClearSharedNas: boolean;
  canUploadVideos: boolean;
  canStreamOwnVideos: boolean;
  canProvisionWorkspaces: boolean;
}

export function getRoleCapabilities(role: UserRole): RoleCapabilities {
  switch (role) {
    case "OWNER":
      return {
        canManageUsers: true,
        canCreateRoles: ["RESIDENT", "GUEST"],
        canListUsers: true,
        canAccessOwnNas: true,
        canWriteOwnNas: true,
        canListSharedNas: true,
        canReadSharedNas: true,
        canClearSharedNas: true,
        canUploadVideos: true,
        canStreamOwnVideos: true,
        canProvisionWorkspaces: true,
      };
    case "RESIDENT":
      return {
        canManageUsers: false,
        canCreateRoles: [],
        canListUsers: false,
        canAccessOwnNas: true,
        canWriteOwnNas: true,
        canListSharedNas: true,
        canReadSharedNas: true,
        canClearSharedNas: false,
        canUploadVideos: true,
        canStreamOwnVideos: true,
        canProvisionWorkspaces: true,
      };
    case "GUEST":
      return {
        canManageUsers: false,
        canCreateRoles: [],
        canListUsers: false,
        canAccessOwnNas: true,
        canWriteOwnNas: true,
        canListSharedNas: true,
        canReadSharedNas: true,
        canClearSharedNas: false,
        canUploadVideos: true,
        canStreamOwnVideos: true,
        canProvisionWorkspaces: false,
      };
  }
}

export interface PolicyRuleEntry {
  ruleName: string;
  domain: "NAS" | "USER" | "ELEMENT";
  role: UserRole | "SERVICE";
  action: string;
  resourceType: string;
  qualifier: string | null;
  scope: "OWN" | "SHARED" | "ANY";
  effect: "ALLOW" | "DENY";
  conditions: string;
  priority: number;
  note?: string;
}

/**
 * Mirrors the 69 seeded policy rules in postgres-init/sql/03-seed-policy.sql
 * so the Owner Policy Matrix reflects the actual backend policy registry.
 */
export const SEEDED_POLICY_MATRIX: PolicyRuleEntry[] = [
  // OWNER (22 ALLOW)
  { ruleName: "nas.workspace.list", domain: "NAS", role: "OWNER", action: "LIST", resourceType: "WORKSPACE", qualifier: null, scope: "OWN", effect: "ALLOW", conditions: "{}", priority: 0 },
  { ruleName: "nas.workspace.read", domain: "NAS", role: "OWNER", action: "READ", resourceType: "WORKSPACE", qualifier: null, scope: "OWN", effect: "ALLOW", conditions: "{}", priority: 0 },
  { ruleName: "nas.workspace.create", domain: "NAS", role: "OWNER", action: "CREATE", resourceType: "WORKSPACE", qualifier: null, scope: "OWN", effect: "ALLOW", conditions: "{}", priority: 0 },
  { ruleName: "nas.workspace.update", domain: "NAS", role: "OWNER", action: "UPDATE", resourceType: "WORKSPACE", qualifier: null, scope: "OWN", effect: "ALLOW", conditions: "{}", priority: 0 },
  { ruleName: "nas.workspace.delete", domain: "NAS", role: "OWNER", action: "DELETE", resourceType: "WORKSPACE", qualifier: null, scope: "OWN", effect: "ALLOW", conditions: "{}", priority: 0 },
  { ruleName: "nas.workspace.provision", domain: "NAS", role: "OWNER", action: "PROVISION", resourceType: "WORKSPACE", qualifier: "GUEST", scope: "ANY", effect: "ALLOW", conditions: "{}", priority: 0 },
  { ruleName: "nas.workspace.list", domain: "NAS", role: "OWNER", action: "LIST", resourceType: "WORKSPACE", qualifier: "GUEST", scope: "ANY", effect: "ALLOW", conditions: "{}", priority: 0 },
  { ruleName: "nas.workspace.read", domain: "NAS", role: "OWNER", action: "READ", resourceType: "WORKSPACE", qualifier: "GUEST", scope: "ANY", effect: "ALLOW", conditions: "{}", priority: 0 },
  { ruleName: "nas.workspace.create", domain: "NAS", role: "OWNER", action: "CREATE", resourceType: "WORKSPACE", qualifier: "GUEST", scope: "ANY", effect: "ALLOW", conditions: "{}", priority: 0 },
  { ruleName: "nas.workspace.update", domain: "NAS", role: "OWNER", action: "UPDATE", resourceType: "WORKSPACE", qualifier: "GUEST", scope: "ANY", effect: "ALLOW", conditions: "{}", priority: 0 },
  { ruleName: "nas.workspace.delete", domain: "NAS", role: "OWNER", action: "DELETE", resourceType: "WORKSPACE", qualifier: "GUEST", scope: "ANY", effect: "ALLOW", conditions: "{}", priority: 0 },
  { ruleName: "nas.workspace.archive", domain: "NAS", role: "OWNER", action: "ARCHIVE", resourceType: "WORKSPACE", qualifier: "RESIDENT", scope: "ANY", effect: "ALLOW", conditions: "{}", priority: 0 },
  { ruleName: "nas.workspace.purge", domain: "NAS", role: "OWNER", action: "PURGE", resourceType: "WORKSPACE", qualifier: "RESIDENT", scope: "ANY", effect: "ALLOW", conditions: '{"cooling_period_days":15,"cancelled_by":"TARGET_LOGIN"}', priority: 0 },
  { ruleName: "nas.workspace.list", domain: "NAS", role: "OWNER", action: "LIST", resourceType: "WORKSPACE", qualifier: null, scope: "SHARED", effect: "ALLOW", conditions: "{}", priority: 0 },
  { ruleName: "nas.workspace.read", domain: "NAS", role: "OWNER", action: "READ", resourceType: "WORKSPACE", qualifier: null, scope: "SHARED", effect: "ALLOW", conditions: "{}", priority: 0 },
  { ruleName: "nas.workspace.delete", domain: "NAS", role: "OWNER", action: "DELETE", resourceType: "WORKSPACE", qualifier: null, scope: "SHARED", effect: "ALLOW", conditions: "{}", priority: 0 },
  { ruleName: "nas.workspace.create", domain: "NAS", role: "OWNER", action: "CREATE", resourceType: "WORKSPACE", qualifier: null, scope: "SHARED", effect: "ALLOW", conditions: '{"ownership":"SELF"}', priority: 0 },
  { ruleName: "nas.workspace.update", domain: "NAS", role: "OWNER", action: "UPDATE", resourceType: "WORKSPACE", qualifier: null, scope: "SHARED", effect: "ALLOW", conditions: '{"ownership":"SELF"}', priority: 0 },
  { ruleName: "user.account.create", domain: "USER", role: "OWNER", action: "CREATE", resourceType: "ACCOUNT", qualifier: "RESIDENT", scope: "ANY", effect: "ALLOW", conditions: "{}", priority: 0 },
  { ruleName: "user.account.delete", domain: "USER", role: "OWNER", action: "DELETE", resourceType: "ACCOUNT", qualifier: "RESIDENT", scope: "ANY", effect: "ALLOW", conditions: "{}", priority: 0 },
  { ruleName: "user.account.create", domain: "USER", role: "OWNER", action: "CREATE", resourceType: "ACCOUNT", qualifier: "GUEST", scope: "ANY", effect: "ALLOW", conditions: "{}", priority: 0 },
  { ruleName: "user.account.delete", domain: "USER", role: "OWNER", action: "DELETE", resourceType: "ACCOUNT", qualifier: "GUEST", scope: "ANY", effect: "ALLOW", conditions: "{}", priority: 0 },

  // RESIDENT (16 ALLOW, 6 DENY)
  { ruleName: "nas.workspace.list", domain: "NAS", role: "RESIDENT", action: "LIST", resourceType: "WORKSPACE", qualifier: null, scope: "OWN", effect: "ALLOW", conditions: "{}", priority: 0 },
  { ruleName: "nas.workspace.read", domain: "NAS", role: "RESIDENT", action: "READ", resourceType: "WORKSPACE", qualifier: null, scope: "OWN", effect: "ALLOW", conditions: "{}", priority: 0 },
  { ruleName: "nas.workspace.create", domain: "NAS", role: "RESIDENT", action: "CREATE", resourceType: "WORKSPACE", qualifier: null, scope: "OWN", effect: "ALLOW", conditions: "{}", priority: 0 },
  { ruleName: "nas.workspace.update", domain: "NAS", role: "RESIDENT", action: "UPDATE", resourceType: "WORKSPACE", qualifier: null, scope: "OWN", effect: "ALLOW", conditions: "{}", priority: 0 },
  { ruleName: "nas.workspace.delete", domain: "NAS", role: "RESIDENT", action: "DELETE", resourceType: "WORKSPACE", qualifier: null, scope: "OWN", effect: "ALLOW", conditions: "{}", priority: 0 },
  { ruleName: "nas.workspace.archive", domain: "NAS", role: "RESIDENT", action: "ARCHIVE", resourceType: "WORKSPACE", qualifier: null, scope: "OWN", effect: "ALLOW", conditions: "{}", priority: 0 },
  { ruleName: "nas.workspace.cancel_purge", domain: "NAS", role: "RESIDENT", action: "CANCEL_PURGE", resourceType: "WORKSPACE", qualifier: null, scope: "OWN", effect: "ALLOW", conditions: '{"trigger":"LOGIN"}', priority: 0 },
  { ruleName: "nas.workspace.list", domain: "NAS", role: "RESIDENT", action: "LIST", resourceType: "WORKSPACE", qualifier: null, scope: "SHARED", effect: "ALLOW", conditions: "{}", priority: 0 },
  { ruleName: "nas.workspace.read", domain: "NAS", role: "RESIDENT", action: "READ", resourceType: "WORKSPACE", qualifier: null, scope: "SHARED", effect: "ALLOW", conditions: "{}", priority: 0 },
  { ruleName: "nas.workspace.create", domain: "NAS", role: "RESIDENT", action: "CREATE", resourceType: "WORKSPACE", qualifier: null, scope: "SHARED", effect: "ALLOW", conditions: '{"ownership":"SELF"}', priority: 0 },
  { ruleName: "nas.workspace.update", domain: "NAS", role: "RESIDENT", action: "UPDATE", resourceType: "WORKSPACE", qualifier: null, scope: "SHARED", effect: "ALLOW", conditions: '{"ownership":"SELF"}', priority: 0 },
  { ruleName: "nas.workspace.delete", domain: "NAS", role: "RESIDENT", action: "DELETE", resourceType: "WORKSPACE", qualifier: null, scope: "SHARED", effect: "ALLOW", conditions: '{"ownership":"SELF"}', priority: 0 },
  { ruleName: "user.account.create", domain: "USER", role: "RESIDENT", action: "CREATE", resourceType: "ACCOUNT", qualifier: "RESIDENT", scope: "ANY", effect: "ALLOW", conditions: "{}", priority: 0, note: "Gateway /auth/users enforces OWNER in AuthController" },
  { ruleName: "user.account.delete", domain: "USER", role: "RESIDENT", action: "DELETE", resourceType: "ACCOUNT", qualifier: "RESIDENT", scope: "ANY", effect: "ALLOW", conditions: "{}", priority: 0 },
  { ruleName: "user.account.create", domain: "USER", role: "RESIDENT", action: "CREATE", resourceType: "ACCOUNT", qualifier: "GUEST", scope: "ANY", effect: "ALLOW", conditions: "{}", priority: 0, note: "Gateway /auth/users enforces OWNER in AuthController" },
  { ruleName: "user.account.delete", domain: "USER", role: "RESIDENT", action: "DELETE", resourceType: "ACCOUNT", qualifier: "GUEST", scope: "ANY", effect: "ALLOW", conditions: "{}", priority: 0 },
  { ruleName: "nas.workspace.provision", domain: "NAS", role: "RESIDENT", action: "PROVISION", resourceType: "WORKSPACE", qualifier: "GUEST", scope: "ANY", effect: "DENY", conditions: "{}", priority: 100 },
  { ruleName: "nas.workspace.list", domain: "NAS", role: "RESIDENT", action: "LIST", resourceType: "WORKSPACE", qualifier: "GUEST", scope: "ANY", effect: "DENY", conditions: "{}", priority: 100 },
  { ruleName: "nas.workspace.read", domain: "NAS", role: "RESIDENT", action: "READ", resourceType: "WORKSPACE", qualifier: "GUEST", scope: "ANY", effect: "DENY", conditions: "{}", priority: 100 },
  { ruleName: "nas.workspace.create", domain: "NAS", role: "RESIDENT", action: "CREATE", resourceType: "WORKSPACE", qualifier: "GUEST", scope: "ANY", effect: "DENY", conditions: "{}", priority: 100 },
  { ruleName: "nas.workspace.update", domain: "NAS", role: "RESIDENT", action: "UPDATE", resourceType: "WORKSPACE", qualifier: "GUEST", scope: "ANY", effect: "DENY", conditions: "{}", priority: 100 },
  { ruleName: "nas.workspace.delete", domain: "NAS", role: "RESIDENT", action: "DELETE", resourceType: "WORKSPACE", qualifier: "GUEST", scope: "ANY", effect: "DENY", conditions: "{}", priority: 100 },

  // GUEST (10 ALLOW, 5 DENY)
  { ruleName: "nas.workspace.list", domain: "NAS", role: "GUEST", action: "LIST", resourceType: "WORKSPACE", qualifier: null, scope: "OWN", effect: "ALLOW", conditions: "{}", priority: 0 },
  { ruleName: "nas.workspace.read", domain: "NAS", role: "GUEST", action: "READ", resourceType: "WORKSPACE", qualifier: null, scope: "OWN", effect: "ALLOW", conditions: "{}", priority: 0 },
  { ruleName: "nas.workspace.create", domain: "NAS", role: "GUEST", action: "CREATE", resourceType: "WORKSPACE", qualifier: null, scope: "OWN", effect: "ALLOW", conditions: "{}", priority: 0 },
  { ruleName: "nas.workspace.update", domain: "NAS", role: "GUEST", action: "UPDATE", resourceType: "WORKSPACE", qualifier: null, scope: "OWN", effect: "ALLOW", conditions: "{}", priority: 0 },
  { ruleName: "nas.workspace.delete", domain: "NAS", role: "GUEST", action: "DELETE", resourceType: "WORKSPACE", qualifier: null, scope: "OWN", effect: "ALLOW", conditions: "{}", priority: 0 },
  { ruleName: "nas.workspace.list", domain: "NAS", role: "GUEST", action: "LIST", resourceType: "WORKSPACE", qualifier: null, scope: "SHARED", effect: "ALLOW", conditions: "{}", priority: 0 },
  { ruleName: "nas.workspace.read", domain: "NAS", role: "GUEST", action: "READ", resourceType: "WORKSPACE", qualifier: null, scope: "SHARED", effect: "ALLOW", conditions: "{}", priority: 0 },
  { ruleName: "nas.workspace.create", domain: "NAS", role: "GUEST", action: "CREATE", resourceType: "WORKSPACE", qualifier: null, scope: "SHARED", effect: "ALLOW", conditions: '{"ownership":"SELF"}', priority: 0 },
  { ruleName: "nas.workspace.update", domain: "NAS", role: "GUEST", action: "UPDATE", resourceType: "WORKSPACE", qualifier: null, scope: "SHARED", effect: "ALLOW", conditions: '{"ownership":"SELF"}', priority: 0 },
  { ruleName: "nas.workspace.delete", domain: "NAS", role: "GUEST", action: "DELETE", resourceType: "WORKSPACE", qualifier: null, scope: "SHARED", effect: "ALLOW", conditions: '{"ownership":"SELF"}', priority: 0 },
  { ruleName: "nas.workspace.provision", domain: "NAS", role: "GUEST", action: "PROVISION", resourceType: "WORKSPACE", qualifier: null, scope: "OWN", effect: "DENY", conditions: "{}", priority: 100 },
  { ruleName: "user.account.create", domain: "USER", role: "GUEST", action: "CREATE", resourceType: "ACCOUNT", qualifier: "RESIDENT", scope: "ANY", effect: "DENY", conditions: "{}", priority: 100 },
  { ruleName: "user.account.delete", domain: "USER", role: "GUEST", action: "DELETE", resourceType: "ACCOUNT", qualifier: "RESIDENT", scope: "ANY", effect: "DENY", conditions: "{}", priority: 100 },
  { ruleName: "user.account.create", domain: "USER", role: "GUEST", action: "CREATE", resourceType: "ACCOUNT", qualifier: "GUEST", scope: "ANY", effect: "DENY", conditions: "{}", priority: 100 },
  { ruleName: "user.account.delete", domain: "USER", role: "GUEST", action: "DELETE", resourceType: "ACCOUNT", qualifier: "GUEST", scope: "ANY", effect: "DENY", conditions: "{}", priority: 100 },

  // SERVICE (10 ALLOW)
  { ruleName: "nas.workspace.list", domain: "NAS", role: "SERVICE", action: "LIST", resourceType: "WORKSPACE", qualifier: null, scope: "OWN", effect: "ALLOW", conditions: '{"requires_hearth_intent":true,"assigned_resources_only":true}', priority: 0 },
  { ruleName: "nas.workspace.read", domain: "NAS", role: "SERVICE", action: "READ", resourceType: "WORKSPACE", qualifier: null, scope: "OWN", effect: "ALLOW", conditions: '{"requires_hearth_intent":true,"assigned_resources_only":true}', priority: 0 },
  { ruleName: "nas.workspace.create", domain: "NAS", role: "SERVICE", action: "CREATE", resourceType: "WORKSPACE", qualifier: null, scope: "OWN", effect: "ALLOW", conditions: '{"requires_hearth_intent":true,"assigned_resources_only":true}', priority: 0 },
  { ruleName: "nas.workspace.update", domain: "NAS", role: "SERVICE", action: "UPDATE", resourceType: "WORKSPACE", qualifier: null, scope: "OWN", effect: "ALLOW", conditions: '{"requires_hearth_intent":true,"assigned_resources_only":true}', priority: 0 },
  { ruleName: "nas.workspace.delete", domain: "NAS", role: "SERVICE", action: "DELETE", resourceType: "WORKSPACE", qualifier: null, scope: "OWN", effect: "ALLOW", conditions: '{"requires_hearth_intent":true,"assigned_resources_only":true}', priority: 0 },
  { ruleName: "nas.media.read", domain: "NAS", role: "SERVICE", action: "READ", resourceType: "MEDIA", qualifier: null, scope: "OWN", effect: "ALLOW", conditions: '{"requires_hearth_intent":true,"assigned_resources_only":true}', priority: 0 },
  { ruleName: "nas.media.stream", domain: "NAS", role: "SERVICE", action: "STREAM", resourceType: "MEDIA", qualifier: null, scope: "OWN", effect: "ALLOW", conditions: '{"requires_hearth_intent":true,"assigned_resources_only":true}', priority: 0 },
  { ruleName: "element.element.read", domain: "ELEMENT", role: "SERVICE", action: "READ", resourceType: "ELEMENT", qualifier: null, scope: "OWN", effect: "ALLOW", conditions: '{"requires_hearth_intent":true,"assigned_resources_only":true}', priority: 0 },
  { ruleName: "element.element.control", domain: "ELEMENT", role: "SERVICE", action: "CONTROL", resourceType: "ELEMENT", qualifier: null, scope: "OWN", effect: "ALLOW", conditions: '{"requires_hearth_intent":true,"assigned_resources_only":true}', priority: 0 },
  { ruleName: "element.element.stream", domain: "ELEMENT", role: "SERVICE", action: "STREAM", resourceType: "ELEMENT", qualifier: null, scope: "OWN", effect: "ALLOW", conditions: '{"requires_hearth_intent":true,"assigned_resources_only":true}', priority: 0 },
];
