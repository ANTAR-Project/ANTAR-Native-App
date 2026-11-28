import { useCallback } from "react";
import { Directory, File, Paths, UploadType } from "expo-file-system";
import { gatewayFetch, gatewayJson, parseErrorResponse } from "../api/client";
import { getGatewayUrl, isIgnoredNasEntry } from "../config";
import { useAuth } from "../context/AuthContext";
import type {
  CreateFolderResponse,
  CreateWorkspaceResponse,
  FileListResponse,
  FileUploadResponse,
  WorkspaceInfoResponse,
} from "../types";

export type NasScope = "own" | "shared";

function baseNasPrefix(scope: NasScope): string {
  return scope === "shared" ? "/api/v1/nas/shared" : "/api/v1/nas/files";
}

export function useNasApi() {
  const { session, ensureFreshAccessToken, refreshSession } = useAuth();

  const authHeaders = useCallback(async (): Promise<string> => {
    const token = (await ensureFreshAccessToken()) ?? session?.accessToken;
    if (!token) throw new Error("Not authenticated");
    return token;
  }, [ensureFreshAccessToken, session?.accessToken]);

  const listFiles = useCallback(
    async (path: string = "", scope: NasScope = "own"): Promise<FileListResponse> => {
      const token = await authHeaders();
      const qs = path ? `?path=${encodeURIComponent(path)}` : "";
      const res = await gatewayJson<FileListResponse>(`${baseNasPrefix(scope)}/list${qs}`, {
        method: "GET",
        token,
        onUnauthorizedRefresh: refreshSession,
      });
      return {
        ...res,
        entry: (res.entry ?? []).filter((e) => !isIgnoredNasEntry(e.name)),
      };
    },
    [authHeaders, refreshSession]
  );

  const createFolder = useCallback(
    async (path: string, scope: NasScope = "own"): Promise<CreateFolderResponse> => {
      const token = await authHeaders();
      return gatewayJson<CreateFolderResponse>(
        `${baseNasPrefix(scope)}/mkdir?path=${encodeURIComponent(path)}`,
        {
          method: "POST",
          token,
          onUnauthorizedRefresh: refreshSession,
        }
      );
    },
    [authHeaders, refreshSession]
  );

  const deleteEntry = useCallback(
    async (path: string, scope: NasScope = "own"): Promise<void> => {
      const token = await authHeaders();
      await gatewayJson<void>(
        `${baseNasPrefix(scope)}/delete?path=${encodeURIComponent(path)}`,
        {
          method: "DELETE",
          token,
          onUnauthorizedRefresh: refreshSession,
        }
      );
    },
    [authHeaders, refreshSession]
  );

  const clearSharedWorkspace = useCallback(async (): Promise<void> => {
    const token = await authHeaders();
    await gatewayJson<void>("/api/v1/nas/shared/clear", {
      method: "DELETE",
      token,
      onUnauthorizedRefresh: refreshSession,
    });
  }, [authHeaders, refreshSession]);

  const uploadPickedFile = useCallback(
    async (
      dirPath: string,
      file: File,
      scope: NasScope = "own",
      onProgress?: (pct: number) => void
    ): Promise<FileUploadResponse> => {
      const token = await authHeaders();
      const qs = dirPath ? `?path=${encodeURIComponent(dirPath)}` : "";
      const url = `${getGatewayUrl()}${baseNasPrefix(scope)}/upload/file${qs}`;

      const task = file.createUploadTask(url, {
        httpMethod: "POST",
        uploadType: UploadType.MULTIPART,
        fieldName: "file",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        onProgress: ({ bytesSent, totalBytes }) => {
          const sent = Number(bytesSent);
          const total = Number(totalBytes);
          if (onProgress && total > 0) {
            onProgress(Math.min(100, Math.round((sent / total) * 100)));
          }
        },
      });

      const res = await task.uploadAsync();
      if (res.status < 200 || res.status >= 300) {
        let msg = `Upload failed (HTTP ${res.status})`;
        try {
          const parsed = JSON.parse(res.body) as { message?: string; error?: string; code?: string };
          msg = parsed.message || parsed.error || parsed.code || msg;
        } catch {
          if (res.body) msg = res.body;
        }
        throw new Error(msg);
      }
      return JSON.parse(res.body) as FileUploadResponse;
    },
    [authHeaders]
  );

  const downloadFileToCache = useCallback(
    async (
      filePath: string,
      fileName: string,
      scope: NasScope = "own",
      onProgress?: (pct: number) => void
    ): Promise<File> => {
      const token = await authHeaders();
      const url = `${getGatewayUrl()}${baseNasPrefix(scope)}/download?path=${encodeURIComponent(filePath)}`;
      const downloadsDir = new Directory(Paths.cache, "antar-downloads");
      if (!downloadsDir.exists) {
        downloadsDir.create({ intermediates: true, idempotent: true });
      }
      const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const destination = new File(downloadsDir, safeName);

      const task = File.createDownloadTask(url, destination, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        onProgress: ({ bytesWritten, totalBytes }) => {
          const written = Number(bytesWritten);
          const total = Number(totalBytes);
          if (onProgress && total > 0) {
            onProgress(Math.min(100, Math.round((written / total) * 100)));
          }
        },
      });

      const downloaded = await task.downloadAsync();
      if (!downloaded) {
        throw new Error("Download did not produce a file.");
      }
      return downloaded;
    },
    [authHeaders]
  );

  const fetchPreviewText = useCallback(
    async (filePath: string, scope: NasScope = "own"): Promise<string> => {
      const token = await authHeaders();
      const res = await gatewayFetch(
        `${baseNasPrefix(scope)}/preview?path=${encodeURIComponent(filePath)}`,
        {
          method: "GET",
          token,
          onUnauthorizedRefresh: refreshSession,
        }
      );
      if (!res.ok) {
        throw await parseErrorResponse(res);
      }
      return res.text();
    },
    [authHeaders, refreshSession]
  );

  const buildPreviewUrl = useCallback(
    (filePath: string, scope: NasScope = "own"): string => {
      const token = session?.accessToken ?? "";
      return `${getGatewayUrl()}${baseNasPrefix(scope)}/preview?path=${encodeURIComponent(
        filePath
      )}&token=${encodeURIComponent(token)}`;
    },
    [session?.accessToken]
  );

  const getWorkspaceInfo = useCallback(async (): Promise<WorkspaceInfoResponse> => {
    const token = await authHeaders();
    return gatewayJson<WorkspaceInfoResponse>("/api/v1/nas/workspace/info", {
      method: "GET",
      token,
      onUnauthorizedRefresh: refreshSession,
    });
  }, [authHeaders, refreshSession]);

  const createWorkspace = useCallback(
    async (name: string): Promise<CreateWorkspaceResponse> => {
      const token = await authHeaders();
      return gatewayJson<CreateWorkspaceResponse>("/api/v1/nas/workspace/create", {
        method: "POST",
        token,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
        onUnauthorizedRefresh: refreshSession,
      });
    },
    [authHeaders, refreshSession]
  );

  const clearOwnWorkspace = useCallback(async (): Promise<void> => {
    const token = await authHeaders();
    await gatewayJson<void>("/api/v1/nas/workspace/clear", {
      method: "DELETE",
      token,
      onUnauthorizedRefresh: refreshSession,
    });
  }, [authHeaders, refreshSession]);

  const deleteOwnWorkspace = useCallback(async (): Promise<void> => {
    const token = await authHeaders();
    await gatewayJson<void>("/api/v1/nas/workspace/delete", {
      method: "DELETE",
      token,
      onUnauthorizedRefresh: refreshSession,
    });
  }, [authHeaders, refreshSession]);

  return {
    listFiles,
    createFolder,
    deleteEntry,
    clearSharedWorkspace,
    uploadPickedFile,
    downloadFileToCache,
    fetchPreviewText,
    buildPreviewUrl,
    getWorkspaceInfo,
    createWorkspace,
    clearOwnWorkspace,
    deleteOwnWorkspace,
  };
}
