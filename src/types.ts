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

export interface StreamQualityOption {
  id: string;
  label: string;
  resolution?: string;
  width?: number;
  height?: number;
  bandwidth?: number;
  uri: string;
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

export interface CameraDevice {
  entity_id?: string;
  entityId?: string;
  device_id?: string;
  deviceId?: string;
  name?: string;
  ip?: string;
  status?: string;
  online?: boolean;
  type?: string;
  [key: string]: unknown;
}

export interface CameraStreamUrlsResponse {
  entity_id: string;
  device_id: string;
  hls_stream_url: string;
  snapshot_url: string;
  live_stream_url: string;
  substream_rtsp: string;
  mainstream_rtsp: string;
  protocol: string;
}

export type CameraPtzCommand =
  | "PTZ_LEFT"
  | "PTZ_RIGHT"
  | "PTZ_UP"
  | "PTZ_DOWN"
  | "PTZ_ZOOM_IN"
  | "PTZ_ZOOM_OUT"
  | "PTZ_STOP"
  | (string & {});

export interface CameraPtzRequest {
  command: CameraPtzCommand;
  speed?: number;
}

export interface CameraRecordingInfo {
  id: string;
  filename: string;
  sizeBytes: number;
  timestamp: string | number;
  status: string;
}

export interface CameraRecordResponse {
  status: string;
  recording: CameraRecordingInfo;
}

export interface CameraStatusResponse {
  subnet: string;
  default_ip: string;
  rtsp_port: number;
  http_port: number;
  online_cameras: number;
  total_cameras: number;
}

export interface CameraScanResponse {
  count: number;
  cameras: CameraDevice[];
}
