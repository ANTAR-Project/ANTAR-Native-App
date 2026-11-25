import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ApiError, testGatewayConnection } from "../../src/api/client";
import ToastBanner from "../../src/components/ToastBanner";
import { useAuth } from "../../src/context/AuthContext";
import { useNasApi } from "../../src/hooks/useNasApi";
import { useToast } from "../../src/hooks/useToast";
import { getRoleCapabilities } from "../../src/policies";
import { formatDateTime, formatSize } from "../../src/utils";

type WsStatus = "loading" | "active" | "missing" | "error";

export default function Workspace() {
  const {
    session,
    gatewayUrl,
    updateGatewayUrl,
    clearVault,
    refreshSession,
    logout,
  } = useAuth();
  const { listFiles, createWorkspace, clearOwnWorkspace, deleteOwnWorkspace } = useNasApi();
  const { toast, show, hide } = useToast();

  const [wsStatus, setWsStatus] = useState<WsStatus>("loading");
  const [itemCount, setItemCount] = useState(0);
  const [visibleBytes, setVisibleBytes] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const [urlEdit, setUrlEdit] = useState(gatewayUrl);
  const [connInfo, setConnInfo] = useState<string | null>(null);

  useEffect(() => {
    setUrlEdit(gatewayUrl);
  }, [gatewayUrl]);

  const caps = getRoleCapabilities(session?.role ?? "GUEST");

  const loadWorkspaceStatus = useCallback(
    async (isPull = false) => {
      if (isPull) setRefreshing(true);
      else setWsStatus("loading");
      try {
        const res = await listFiles("", "own");
        const list = res.entry ?? [];
        setItemCount(list.length);
        setVisibleBytes(
          list.reduce((acc, e) => acc + (e.isDirectory ? 0 : e.size), 0)
        );
        setWsStatus("active");
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setItemCount(0);
          setVisibleBytes(0);
          setWsStatus("missing");
        } else {
          setWsStatus("error");
        }
      } finally {
        setRefreshing(false);
      }
    },
    [listFiles]
  );

  useEffect(() => {
    void loadWorkspaceStatus(false);
  }, [loadWorkspaceStatus]);

  const confirm = (
    title: string,
    message: string,
    label: string,
    action: () => Promise<void>
  ) =>
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      { text: label, style: "destructive", onPress: () => void action() },
    ]);

  const handleCreate = async () => {
    if (!session?.username) return;
    setBusy("Creating workspace...");
    try {
      await createWorkspace(session.username);
      show(`Workspace "${session.username}" created.`, "success");
      await loadWorkspaceStatus(false);
    } catch (err) {
      show(err instanceof Error ? err.message : "Failed to create workspace.", "error");
    } finally {
      setBusy(null);
    }
  };

  const handleClear = async () => {
    setBusy("Clearing workspace...");
    try {
      await clearOwnWorkspace();
      show("Workspace contents cleared.", "success");
      await loadWorkspaceStatus(false);
    } catch (err) {
      show(err instanceof Error ? err.message : "Failed to clear workspace.", "error");
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async () => {
    setBusy("Deleting workspace...");
    try {
      await deleteOwnWorkspace();
      show("Workspace permanently deleted.", "success");
      await loadWorkspaceStatus(false);
    } catch (err) {
      show(err instanceof Error ? err.message : "Failed to delete workspace.", "error");
    } finally {
      setBusy(null);
    }
  };

  const handleSaveGateway = async () => {
    const saved = await updateGatewayUrl(urlEdit);
    setUrlEdit(saved);
    const res = await testGatewayConnection(saved);
    setConnInfo(res.detail);
    show(res.detail, res.ok ? "success" : "error");
  };

  const handleRotateToken = async () => {
    setBusy("Rotating token pair...");
    const next = await refreshSession();
    setBusy(null);
    if (next) show("Access & refresh tokens rotated.", "success");
    else show("Could not refresh session.", "error");
  };

  return (
    <ScrollView
      className="flex-1 bg-blue-950"
      contentContainerClassName="p-4 pb-12"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void loadWorkspaceStatus(true)}
          tintColor="#bfdbfe"
        />
      }
    >
      <ToastBanner toast={toast} onDismiss={hide} />

      {/* Workspace status card */}
      <View className="mt-2 rounded-2xl border border-blue-800 bg-blue-900/70 p-5">
        <View className="flex-row items-center">
          <View className="h-12 w-12 items-center justify-center rounded-xl bg-blue-950">
            <Ionicons name="server-outline" size={26} color="#bfdbfe" />
          </View>
          <View className="ml-3.5 flex-1">
            <Text className="text-lg font-bold text-blue-100">
              {session?.username}&apos;s workspace
            </Text>
            <Text className="text-xs uppercase tracking-widest text-blue-300">
              {wsStatus === "loading"
                ? "Checking..."
                : wsStatus === "active"
                ? "Active on NAS"
                : wsStatus === "missing"
                ? "Not Provisioned"
                : "Gateway Unreachable"}
            </Text>
          </View>
          <View className="rounded-full bg-blue-950 px-3 py-1">
            <Text className="text-xs font-bold text-blue-200">{session?.role}</Text>
          </View>
        </View>

        {wsStatus === "active" && (
          <View className="mt-4 flex-row gap-3 border-t border-blue-800 pt-4">
            <View className="flex-1">
              <Text className="text-xs text-blue-400">Root items</Text>
              <Text className="mt-0.5 text-base font-bold text-blue-100">{itemCount}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-xs text-blue-400">Root files size</Text>
              <Text className="mt-0.5 text-base font-bold text-blue-100">
                {formatSize(visibleBytes)}
              </Text>
            </View>
          </View>
        )}
      </View>

      {busy && (
        <View className="mt-4 flex-row items-center rounded-xl bg-blue-900 px-4 py-3">
          <ActivityIndicator size="small" color="#bfdbfe" />
          <Text className="ml-2.5 text-sm text-blue-100">{busy}</Text>
        </View>
      )}

      {/* Workspace lifecycle actions */}
      {wsStatus === "missing" ? (
        <View className="mt-5 items-center rounded-2xl border border-blue-800 bg-blue-900/40 p-6">
          <Text className="text-center text-sm text-blue-300">
            No workspace folder exists yet on TrueNAS for &quot;{session?.username}&quot;.
          </Text>
          <Pressable
            onPress={() => void handleCreate()}
            className="mt-4 w-full items-center rounded-2xl bg-blue-200 py-3.5"
          >
            <Text className="text-base font-bold text-blue-950">Create Workspace</Text>
          </Pressable>
          {!caps.canProvisionWorkspaces && (
            <Text className="mt-2 text-center text-[11px] text-amber-300">
              Note: Guest provisioning may require Owner approval per policy.
            </Text>
          )}
        </View>
      ) : (
        <View className="mt-5 gap-3">
          <Pressable
            disabled={wsStatus !== "active" || itemCount === 0}
            onPress={() =>
              confirm(
                "Clear workspace?",
                "All files and folders inside your workspace will be removed. The workspace directory itself remains.",
                "Clear",
                handleClear
              )
            }
            className={`flex-row items-center rounded-2xl border-2 p-4 ${
              wsStatus !== "active" || itemCount === 0
                ? "border-blue-800 opacity-50"
                : "border-blue-600"
            }`}
          >
            <Ionicons name="trash-bin-outline" size={22} color="#bfdbfe" />
            <View className="ml-3 flex-1">
              <Text className="text-base font-semibold text-blue-100">Clear workspace</Text>
              <Text className="text-xs text-blue-300">
                {itemCount === 0 ? "Root is empty" : "Remove all contents inside your workspace"}
              </Text>
            </View>
          </Pressable>

          <Pressable
            disabled={wsStatus !== "active"}
            onPress={() =>
              confirm(
                "Delete workspace?",
                "Your entire workspace directory and all contents will be permanently deleted.",
                "Delete",
                handleDelete
              )
            }
            className={`flex-row items-center rounded-2xl border-2 border-red-400/60 p-4 ${
              wsStatus !== "active" ? "opacity-50" : ""
            }`}
          >
            <Ionicons name="warning-outline" size={22} color="#f87171" />
            <View className="ml-3 flex-1">
              <Text className="text-base font-semibold text-red-300">Delete workspace</Text>
              <Text className="text-xs text-blue-300">
                Permanently remove your NAS workspace directory
              </Text>
            </View>
          </Pressable>
        </View>
      )}

      {/* Identity & Session Claims */}
      <Text className="mb-2 mt-8 text-xs font-semibold uppercase tracking-widest text-blue-400">
        Hearth Session Claims
      </Text>
      <View className="rounded-2xl border border-blue-800 bg-blue-900/60 p-4 gap-2">
        <Row label="Username" value={session?.username ?? "-"} />
        <Row label="Role" value={session?.role ?? "-"} />
        <Row label="Session ID" value={session?.sessionId ?? "-"} mono />
        <Row label="User ID" value={session?.userId ?? "-"} mono />
        <Row
          label="Token Expires"
          value={
            session?.expiresAtEpochMs
              ? formatDateTime(session.expiresAtEpochMs)
              : "-"
          }
        />
      </View>

      {/* API Gateway endpoint */}
      <Text className="mb-2 mt-8 text-xs font-semibold uppercase tracking-widest text-blue-400">
        API Gateway Endpoint
      </Text>
      <View className="rounded-2xl border border-blue-800 bg-blue-900/60 p-4">
        <TextInput
          value={urlEdit}
          onChangeText={setUrlEdit}
          placeholder="http://192.168.0.104:8443"
          placeholderTextColor="#6b8bd6"
          autoCapitalize="none"
          autoCorrect={false}
          className="rounded-xl bg-blue-950 px-3.5 py-2.5 text-sm text-blue-100"
        />
        {connInfo && <Text className="mt-2 text-xs text-blue-300">{connInfo}</Text>}
        <Pressable
          onPress={() => void handleSaveGateway()}
          className="mt-3 items-center rounded-xl bg-blue-200 py-2.5"
        >
          <Text className="text-sm font-bold text-blue-950">Save & Test Gateway</Text>
        </Pressable>
      </View>

      {/* Security Actions */}
      <Text className="mb-2 mt-8 text-xs font-semibold uppercase tracking-widest text-blue-400">
        Security
      </Text>
      <View className="gap-2.5">
        <Pressable
          onPress={() => void handleRotateToken()}
          className="flex-row items-center rounded-2xl bg-blue-900 p-4"
        >
          <Ionicons name="refresh-outline" size={22} color="#bfdbfe" />
          <Text className="ml-3 text-base text-blue-100">Rotate Access & Refresh Tokens</Text>
        </Pressable>

        <Pressable
          onPress={async () => {
            await clearVault();
            show("Biometric sign-in removed from this device.", "info");
          }}
          className="flex-row items-center rounded-2xl bg-blue-900 p-4"
        >
          <Ionicons name="finger-print-outline" size={22} color="#bfdbfe" />
          <Text className="ml-3 text-base text-blue-100">Forget biometrics on this device</Text>
        </Pressable>

        <Pressable
          onPress={() =>
            confirm(
              "Sign out?",
              "This revokes your active session on auth-service.",
              "Sign out",
              logout
            )
          }
          className="flex-row items-center rounded-2xl border border-red-400/50 bg-red-950/30 p-4"
        >
          <Ionicons name="log-out-outline" size={22} color="#fca5a5" />
          <Text className="ml-3 text-base font-semibold text-red-200">Sign Out</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View className="flex-row items-center justify-between gap-4">
      <Text className="text-xs text-blue-400">{label}</Text>
      <Text
        className={`flex-1 text-right text-xs text-blue-100 ${mono ? "font-mono" : "font-medium"}`}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}
