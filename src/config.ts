const HOST = process.env.EXPO_PUBLIC_API_HOST ?? "localhost";

export const AUTH_API = `http://${HOST}:8085/api/v1/auth-service`;
export const STREAM_API = `http://${HOST}:8084/api/v1/stream`;
export const MOCK_AUTH = process.env.EXPO_PUBLIC_MOCK_AUTH === "true";
export const MOCK_DATA = MOCK_AUTH;

// Public demo HLS stream, used only while mock mode is on
export const DEMO_HLS = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";