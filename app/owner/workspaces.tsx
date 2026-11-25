import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ApiError } from "../../src/api/client";
import KeyboardModal from "../../src/components/KeyboardModal";
import ToastBanner from "../../src/components/ToastBanner";
import { useTheme } from "../../src/context/ThemeContext";
import { useOwnerApi } from "../../src/hooks/useOwnerApi";
import { useToast } from "../../src/hooks/useToast";
import { MIN_PASSWORD_LENGTH, USERNAME_REGEX } from "../../src/policies";
import type { UserResponse } from "../../src/types";
import { formatDate } from "../../src/utils";

type ExpiryPreset = "none" | "24h" | "7d" | "30d";

function computeExpiryIso(preset: ExpiryPreset): string | null {
  if (preset === "none") return null;
  const hours = preset === "24h" ? 24 : preset === "7d" ? 24 * 7 : 24 * 30;
  return new Date(Date.now() + hours * 3600_000).toISOString();
}

export default function UsersAndWorkspaces() {
  const { colors } = useTheme();
  const { listUsers, createUser, provisionWorkspace } = useOwnerApi();
  const { toast, show, hide } = useToast();

  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [provisioningUser, setProvisioningUser] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"RESIDENT" | "GUEST">("RESIDENT");
  const [expiryPreset, setExpiryPreset] = useState<ExpiryPreset>("none");
  const [mustChangePwd, setMustChangePwd] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(
    async (isPull = false) => {
      if (isPull) setRefreshing(true);
      else setLoading(true);
      try {
        const res = await listUsers();
        setUsers(res);
      } catch (err) {
        show(err instanceof Error ? err.message : "Failed to load users.", "error");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [listUsers, show]
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const handleProvision = async (targetUsername: string) => {
    setProvisioningUser(targetUsername);
    try {
      await provisionWorkspace(targetUsername);
      show(`Provisioned NAS workspace for "${targetUsername}".`, "success");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        show(`Workspace for "${targetUsername}" already exists.`, "info");
      } else {
        show(err instanceof Error ? err.message : "Provisioning failed.", "error");
      }
    } finally {
      setProvisioningUser(null);
    }
  };

  const handleCreateUser = async () => {
    const cleanUser = username.trim();
    if (!USERNAME_REGEX.test(cleanUser)) {
      return setFormError(
        "Username must be 3-32 chars: lowercase letters, digits, '_' or '-'."
      );
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return setFormError(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
      );
    }

    setFormError(null);
    setCreating(true);
    try {
      const created = await createUser({
        username: cleanUser,
        password,
        role,
        expiresAt: computeExpiryIso(expiryPreset),
        mustChangePassword: mustChangePwd,
      });
      setCreateOpen(false);
      setUsername("");
      setPassword("");
      setRole("RESIDENT");
      setExpiryPreset("none");
      setMustChangePwd(false);
      show(`Created ${created.role} "${created.username}".`, "success");
      await load(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create user.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={{ backgroundColor: colors.bg }} className="flex-1">
      <ScrollView
        contentContainerClassName="p-4 pb-24"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            tintColor={colors.accent}
          />
        }
      >
        <ToastBanner toast={toast} onDismiss={hide} />

        <View
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.hairline,
            borderWidth: 1,
          }}
          className="mt-1 flex-row items-center justify-between rounded-2xl p-4"
        >
          <View>
            <Text style={{ color: colors.ink }} className="text-2xl font-semibold">
              {users.length}
            </Text>
            <Text
              style={{ color: colors.inkSubtle }}
              className="mt-0.5 text-[11px] uppercase tracking-wider"
            >
              Registered Accounts
            </Text>
          </View>
          <Pressable
            onPress={() => {
              setFormError(null);
              setCreateOpen(true);
            }}
            style={{ backgroundColor: colors.accent }}
            className="flex-row items-center rounded-xl px-4 py-2.5"
          >
            <Ionicons name="person-add-outline" size={15} color={colors.accentInk} />
            <Text
              style={{ color: colors.accentInk }}
              className="ml-1.5 text-xs font-bold"
            >
              New User
            </Text>
          </Pressable>
        </View>

        {loading ? (
          <View className="items-center pt-16">
            <ActivityIndicator size="small" color={colors.accent} />
          </View>
        ) : (
          <View className="mt-5 gap-2.5">
            {users.map((u) => (
              <View
                key={u.id}
                style={{
                  backgroundColor: colors.surface,
                  borderColor: colors.hairline,
                  borderWidth: 1,
                }}
                className="rounded-2xl p-4"
              >
                <View className="flex-row items-center">
                  <View
                    style={{
                      backgroundColor: colors.recessed,
                      borderColor: colors.hairlineStrong,
                      borderWidth: 1,
                    }}
                    className="h-10 w-10 items-center justify-center rounded-full"
                  >
                    <Text
                      style={{ color: colors.accentWarm }}
                      className="text-sm font-bold uppercase"
                    >
                      {u.username[0]}
                    </Text>
                  </View>

                  <View className="ml-3 flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text style={{ color: colors.ink }} className="text-sm font-semibold">
                        {u.username}
                      </Text>
                      <View
                        style={{
                          backgroundColor: colors.recessed,
                          borderColor: colors.hairlineStrong,
                          borderWidth: 1,
                        }}
                        className="rounded-full px-2 py-0.5"
                      >
                        <Text
                          style={{ color: colors.accentWarm }}
                          className="text-[10px] font-semibold tracking-wider"
                        >
                          {u.role}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ color: colors.inkMuted }} className="mt-0.5 text-[11px]">
                      {u.status} · Joined {formatDate(u.createdAt)}
                      {u.expiresAt ? ` · Expires ${formatDate(u.expiresAt)}` : ""}
                    </Text>
                  </View>

                  {u.role !== "OWNER" && (
                    <Pressable
                      disabled={provisioningUser === u.username}
                      onPress={() => void handleProvision(u.username)}
                      style={{
                        backgroundColor: colors.elevated,
                        borderColor: colors.hairlineStrong,
                        borderWidth: 1,
                      }}
                      className="rounded-xl px-3 py-2"
                    >
                      {provisioningUser === u.username ? (
                        <ActivityIndicator size="small" color={colors.accent} />
                      ) : (
                        <Text
                          style={{ color: colors.ink }}
                          className="text-[11px] font-semibold"
                        >
                          Provision NAS
                        </Text>
                      )}
                    </Pressable>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Create User Modal */}
      <KeyboardModal
        visible={createOpen}
        variant="sheet"
        onRequestClose={() => setCreateOpen(false)}
      >
        <Text style={{ color: colors.ink }} className="text-base font-semibold">
          Create Resident or Guest
        </Text>
        <Text style={{ color: colors.inkMuted }} className="mt-1 text-xs leading-4">
          Enforced by auth-service: lowercase username (3-32 chars), password ≥ 8,
          OWNER role forbidden via API.
        </Text>

        <View
          style={{
            backgroundColor: colors.recessed,
            borderColor: colors.hairline,
            borderWidth: 1,
          }}
          className="mt-4 flex-row rounded-xl p-1"
        >
          {(["RESIDENT", "GUEST"] as const).map((r) => (
            <Pressable
              key={r}
              onPress={() => setRole(r)}
              style={{
                backgroundColor: role === r ? colors.accent : "transparent",
              }}
              className="flex-1 items-center rounded-lg py-2.5"
            >
              <Text
                style={{ color: role === r ? colors.accentInk : colors.inkMuted }}
                className="text-xs font-bold tracking-wide"
              >
                {r}
              </Text>
            </Pressable>
          ))}
        </View>

        <TextInput
          value={username}
          onChangeText={setUsername}
          placeholder="Username (lowercase, digits, _, -)"
          placeholderTextColor={colors.inkSubtle}
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            backgroundColor: colors.recessed,
            borderColor: colors.hairlineStrong,
            borderWidth: 1,
            color: colors.ink,
          }}
          className="mt-3 rounded-xl px-4 py-3 text-sm"
        />

        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password (min 8 characters)"
          placeholderTextColor={colors.inkSubtle}
          secureTextEntry
          autoCapitalize="none"
          style={{
            backgroundColor: colors.recessed,
            borderColor: colors.hairlineStrong,
            borderWidth: 1,
            color: colors.ink,
          }}
          className="mt-3 rounded-xl px-4 py-3 text-sm"
        />

        <Text
          style={{ color: colors.inkSubtle }}
          className="mb-1.5 mt-4 text-[11px] font-semibold uppercase tracking-[0.14em]"
        >
          Account Expiry (optional)
        </Text>
        <View className="flex-row gap-2">
          {(
            [
              { k: "none", label: "Never" },
              { k: "24h", label: "24h" },
              { k: "7d", label: "7 days" },
              { k: "30d", label: "30 days" },
            ] as { k: ExpiryPreset; label: string }[]
          ).map((p) => (
            <Pressable
              key={p.k}
              onPress={() => setExpiryPreset(p.k)}
              style={{
                backgroundColor: expiryPreset === p.k ? colors.elevated : colors.recessed,
                borderColor: expiryPreset === p.k ? colors.accent : colors.hairline,
                borderWidth: 1,
              }}
              className="flex-1 items-center rounded-lg py-2"
            >
              <Text
                style={{
                  color: expiryPreset === p.k ? colors.accent : colors.inkMuted,
                }}
                className="text-xs font-semibold"
              >
                {p.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View className="mt-4 flex-row items-center justify-between">
          <Text style={{ color: colors.inkMuted }} className="text-xs">
            Require password change on first login
          </Text>
          <Switch
            value={mustChangePwd}
            onValueChange={setMustChangePwd}
            trackColor={{ false: colors.hairlineStrong, true: colors.accent }}
            thumbColor={colors.elevated}
          />
        </View>

        {formError && (
          <Text style={{ color: colors.crimson }} className="mt-3 text-xs">
            {formError}
          </Text>
        )}

        <View className="mt-5 flex-row gap-3">
          <Pressable
            onPress={() => setCreateOpen(false)}
            style={{ borderColor: colors.hairlineStrong, borderWidth: 1 }}
            className="flex-1 items-center rounded-xl py-3.5"
          >
            <Text style={{ color: colors.inkMuted }} className="text-xs font-semibold">
              Cancel
            </Text>
          </Pressable>
          <Pressable
            disabled={creating}
            onPress={() => void handleCreateUser()}
            style={{ backgroundColor: colors.accent }}
            className="flex-1 items-center rounded-xl py-3.5"
          >
            {creating ? (
              <ActivityIndicator color={colors.accentInk} />
            ) : (
              <Text style={{ color: colors.accentInk }} className="text-xs font-bold">
                Create User
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardModal>
    </View>
  );
}
