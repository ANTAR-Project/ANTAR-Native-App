export type UserRole = "OWNER" | "RESIDENT" | "GUEST";
export type UserStatus = "ACTIVE" | "SUSPENDED";

export interface JwtClaims {
  sub: string;
  username: string;
  role: UserRole;
  sid: string;
  amr?: string[];
  iat?: number;
  exp?: number;
  jti?: string;
  scope?: string;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  userId: string;
  username: string;
  role: UserRole;
  sessionId: string;
  mustChangePassword: boolean;
  expiresAtEpochMs?: number;
}

export interface LoginRequest {
  username: string;
  password: string;
  deviceId?: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  role: "RESIDENT" | "GUEST";
  expiresAt?: string | null;
  mustChangePassword?: boolean;
}

export interface UserResponse {
  id: string;
  username: string;
  role: UserRole;
  status: UserStatus;
  mustChangePassword: boolean;
  expiresAt: string | null;
  createdAt: string;
}

export interface FileEntry {
  name: string;
  size: number;
  isDirectory: boolean;
  lastModified: number;
}

export interface FileListResponse {
  path: string;
  entry: FileEntry[];
}

export interface FileUploadResponse {
  path: string;
  size: number;
  message: string;
}

export interface CreateFolderResponse {
  path: string;
  message: string;
}

export interface CreateWorkspaceRequest {
  name: string;
}

export interface CreateWorkspaceResponse {
  path: string;
  message: string;
}

export interface PlaylistDto {
  path: string;
  thumbnailUrl: string | null;
}

export interface NotificationPayload {
  type: string;
  rawPath: string;
  thumbnailPath: string | null;
}

export interface ElementReadResponse {
  elementId: string;
  requestedBy: string;
  type: string;
  qualifier: string;
  stub?: boolean;
  [key: string]: unknown;
}

export interface ElementStateResponse {
  elementId: string;
  appliedBy: string;
  applied: Record<string, unknown>;
  stub?: boolean;
  [key: string]: unknown;
}

export interface GatewayProblem {
  type?: string;
  title?: string;
  status?: number;
  code?: string;
  intentId?: string;
  error?: string;
  message?: string;
}
