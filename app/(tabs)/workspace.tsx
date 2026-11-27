import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError, testGatewayConnection } from "../../src/api/client";
import ToastBanner from "../../src/components/ToastBanner";
import { useAuth } from "../../src/context/AuthContext";
import { useTheme } from "../../src/context/ThemeContext";
import { useNasApi } from "../../src/hooks/useNasApi";
import { useToast } from "../../src/hooks/useToast";
import { getRoleCapabilities } from "../../src/policies";
import { formatDateTime, formatSize } from "../../src/utils";

type WsStatus = "loading" | "active" | "missing" | "error";

export default function Workspace() {
  const insets = useSafeAreaInsets();
  const {
    session,
    gatewayUrl,
    updateGatewayUrl,
    clearVault,
    refreshSession,
    logout,
  } = useAuth();
  const { colors } = useTheme();
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
  const bottomPad = Math.max(insets.bottom, 12) + 100;

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
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      style={{ backgroundColor: colors.bg }}
      className="flex-1"
    >
      <ScrollView
        style={{ backgroundColor: colors.bg }}
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: bottomPad }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadWorkspaceStatus(true)}
            tintColor={colors.accent}
          />
        }
      >
        <ToastBanner toast={toast} onDismiss={hide} />

        {/* Workspace Appliance Card */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.hairline,
            borderWidth: 1,
          }}
          className="mt-1 rounded-2xl p-5"
        >
          <View className="flex-row items-center">
            <View
              style={{
                backgroundColor: colors.recessed,
                borderColor: colors.hairlineStrong,
                borderWidth: 1,
              }}
              className="h-11 w-11 items-center justify-center rounded-xl"
            >
              <Ionicons name="hardware-chip-outline" size={22} color={colors.accentWarm} />
            </View>
            <View className="ml-3.5 flex-1">
              <Text style={{ color: colors.ink }} className="text-base font-semibold">
                {session?.username}&apos;s workspace
              </Text>
              <View className="mt-1 flex-row items-center">
                <View
                  style={{
                    backgroundColor:
                      wsStatus === "active"
                        ? colors.emerald
                        : wsStatus === "missing"
                        ? colors.amber
                        : colors.inkSubtle,
                  }}
                  className="mr-1.5 h-1.5 w-1.5 rounded-full"
                />
                <Text
                  style={{ color: colors.inkMuted }}
                  className="text-[11px] uppercase tracking-[0.14em]"
                >
                  {wsStatus === "loading"
                    ? "Checking"
                    : wsStatus === "active"
                    ? "Active on NAS"
                    : wsStatus === "missing"
                    ? "Not Provisioned"
                    : "Gateway Unreachable"}
                </Text>
              </View>
            </View>
            <View
              style={{
                backgroundColor: colors.recessed,
                borderColor: colors.hairlineStrong,
                borderWidth: 1,
              }}
              className="rounded-full px-3 py-1"
            >
              <Text
                style={{ color: colors.accentWarm }}
                className="text-[10px] font-semibold tracking-wider"
              >
                {session?.role}
              </Text>
            </View>
          </View>

          {wsStatus === "active" && (
            <View
              style={{ borderTopColor: colors.hairline, borderTopWidth: 1 }}
              className="mt-5 flex-row pt-4"
            >
              <View className="flex-1">
                <Text
                  style={{ color: colors.inkSubtle }}
                  className="text-[11px] uppercase tracking-wider"
                >
                  Root Items
                </Text>
                <Text style={{ color: colors.ink }} className="mt-1 text-lg font-semibold">
                  {itemCount}
                </Text>
              </View>
              <View style={{ backgroundColor: colors.hairline }} className="w-px" />
              <View className="flex-1 pl-4">
                <Text
                  style={{ color: colors.inkSubtle }}
                  className="text-[11px] uppercase tracking-wider"
                >
                  Root Files
                </Text>
                <Text style={{ color: colors.ink }} className="mt-1 text-lg font-semibold">
                  {formatSize(visibleBytes)}
                </Text>
              </View>
            </View>
          )}
        </View>

        {busy && (
          <View
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.hairlineStrong,
              borderWidth: 1,
            }}
            className="mt-4 flex-row items-center rounded-xl px-4 py-3"
          >
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={{ color: colors.ink }} className="ml-2.5 text-xs font-medium">
              {busy}
            </Text>
          </View>
        )}

        {/* Workspace Lifecycle */}
        {wsStatus === "missing" ? (
          <View
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.hairline,
              borderWidth: 1,
            }}
            className="mt-5 items-center rounded-2xl p-6"
          >
            <Text
              style={{ color: colors.inkMuted }}
              className="text-center text-xs leading-5"
            >
              No workspace directory exists yet on TrueNAS for &quot;{session?.username}&quot;.
            </Text>
            <Pressable
              onPress={() => void handleCreate()}
              style={{ backgroundColor: colors.accent }}
              className="mt-4 w-full items-center rounded-2xl py-3.5"
            >
              <Text
                style={{ color: colors.accentInk }}
                className="text-xs font-bold tracking-wide"
              >
                Create Workspace
              </Text>
            </Pressable>
            {!caps.canProvisionWorkspaces && (
              <Text
                style={{ color: colors.amber }}
                className="mt-2.5 text-center text-[11px]"
              >
                Note: Guest provisioning may require Owner approval per policy.
              </Text>
            )}
          </View>
        ) : (
          <View
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.hairline,
              borderWidth: 1,
            }}
            className="mt-5 overflow-hidden rounded-2xl"
          >
            <Pressable
              disabled={wsStatus !== "active"}
              onPress={() =>
                confirm(
                  "Clear workspace?",
                  "All files and folders inside your workspace will be removed. The workspace directory itself remains.",
                  "Clear",
                  handleClear
                )
              }
              className={`flex-row items-center p-4 ${
                wsStatus !== "active" ? "opacity-45" : ""
              }`}
            >
              <Ionicons name="trash-bin-outline" size={20} color={colors.inkMuted} />
              <View className="ml-3.5 flex-1">
                <Text style={{ color: colors.ink }} className="text-sm font-semibold">
                  Clear Workspace
                </Text>
                <Text style={{ color: colors.inkSubtle }} className="mt-0.5 text-[11px]">
                  {"Remove all contents inside workspace"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.inkSubtle} />
            </Pressable>

            <View style={{ backgroundColor: colors.hairline }} className="h-px" />

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
              className={`flex-row items-center p-4 ${
                wsStatus !== "active" ? "opacity-45" : ""
              }`}
            >
              <Ionicons name="warning-outline" size={20} color={colors.crimson} />
              <View className="ml-3.5 flex-1">
                <Text style={{ color: colors.crimson }} className="text-sm font-semibold">
                  Delete Workspace
                </Text>
                <Text style={{ color: colors.inkSubtle }} className="mt-0.5 text-[11px]">
                  Permanently remove your NAS workspace directory
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.inkSubtle} />
            </Pressable>
          </View>
        )}

        {/* Session Claims */}
        <Text
          style={{ color: colors.inkSubtle }}
          className="mb-2.5 mt-8 text-[11px] font-semibold uppercase tracking-[0.16em]"
        >
          Session Claims
        </Text>
        <View
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.hairline,
            borderWidth: 1,
          }}
          className="gap-2.5 rounded-2xl p-4"
        >
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

        {/* API Gateway Endpoint */}
        <Text
          style={{ color: colors.inkSubtle }}
          className="mb-2.5 mt-8 text-[11px] font-semibold uppercase tracking-[0.16em]"
        >
          Gateway Endpoint
        </Text>
        <View
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.hairline,
            borderWidth: 1,
          }}
          className="rounded-2xl p-4"
        >
          <TextInput
            value={urlEdit}
            onChangeText={setUrlEdit}
            placeholder="http://192.168.0.104:8443"
            placeholderTextColor={colors.inkSubtle}
            autoCapitalize="none"
            autoCorrect={false}
            style={{
              backgroundColor: colors.recessed,
              borderColor: colors.hairlineStrong,
              borderWidth: 1,
              color: colors.ink,
            }}
            className="rounded-xl px-3.5 py-3 font-mono text-xs"
          />
          {connInfo && (
            <Text style={{ color: colors.inkMuted }} className="mt-2 text-xs">
              {connInfo}
            </Text>
          )}
          <Pressable
            onPress={() => void handleSaveGateway()}
            style={{ backgroundColor: colors.accent }}
            className="mt-3 items-center rounded-xl py-3"
          >
            <Text
              style={{ color: colors.accentInk }}
              className="text-xs font-bold tracking-wide"
            >
              Save & Test Gateway
            </Text>
          </Pressable>
        </View>

        {/* Security Actions */}
        <Text
          style={{ color: colors.inkSubtle }}
          className="mb-2.5 mt-8 text-[11px] font-semibold uppercase tracking-[0.16em]"
        >
          Security
        </Text>
        <View
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.hairline,
            borderWidth: 1,
          }}
          className="overflow-hidden rounded-2xl"
        >
          <Pressable
            onPress={() => void handleRotateToken()}
            className="flex-row items-center p-4"
          >
            <Ionicons name="refresh-outline" size={20} color={colors.accentWarm} />
            <Text style={{ color: colors.ink }} className="ml-3.5 flex-1 text-sm font-medium">
              Rotate Access & Refresh Tokens
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.inkSubtle} />
          </Pressable>

          <View style={{ backgroundColor: colors.hairline }} className="h-px" />

          <Pressable
            onPress={async () => {
              await clearVault();
              show("Biometric sign-in removed from this device.", "info");
            }}
            className="flex-row items-center p-4"
          >
            <Ionicons name="finger-print-outline" size={20} color={colors.inkMuted} />
            <Text style={{ color: colors.ink }} className="ml-3.5 flex-1 text-sm font-medium">
              Forget Biometrics on Device
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.inkSubtle} />
          </Pressable>

          <View style={{ backgroundColor: colors.hairline }} className="h-px" />

          <Pressable
            onPress={() =>
              confirm(
                "Sign out?",
                "This revokes your active session on auth-service.",
                "Sign out",
                logout
              )
            }
            className="flex-row items-center p-4"
          >
            <Ionicons name="log-out-outline" size={20} color={colors.crimson} />
            <Text style={{ color: colors.crimson }} className="ml-3.5 flex-1 text-sm font-semibold">
              Sign Out
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const { colors } = useTheme();
  return (
    <View className="flex-row items-center justify-between gap-4">
      <Text style={{ color: colors.inkSubtle }} className="text-xs">
        {label}
      </Text>
      <Text
        style={{ color: colors.ink }}
        className={`flex-1 text-right text-xs ${mono ? "font-mono" : "font-medium"}`}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}
