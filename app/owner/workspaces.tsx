import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
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
import ToastBanner from "../../src/components/ToastBanner";
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
    <View className="flex-1 bg-blue-950">
      <ScrollView
        contentContainerClassName="p-4 pb-28"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            tintColor="#bfdbfe"
          />
        }
      >
        <ToastBanner toast={toast} onDismiss={hide} />

        <View className="mt-1 flex-row items-center justify-between rounded-2xl border border-blue-800 bg-blue-900/70 p-4">
          <View>
            <Text className="text-2xl font-bold text-blue-100">{users.length}</Text>
            <Text className="text-xs text-blue-300">registered accounts in auth-service</Text>
          </View>
          <Pressable
            onPress={() => {
              setFormError(null);
              setCreateOpen(true);
            }}
            className="flex-row items-center rounded-xl bg-blue-200 px-3.5 py-2.5"
          >
            <Ionicons name="person-add-outline" size={16} color="#172554" />
            <Text className="ml-1.5 text-xs font-bold text-blue-950">New User</Text>
          </Pressable>
        </View>

        {loading ? (
          <View className="items-center pt-16">
            <ActivityIndicator size="large" color="#bfdbfe" />
          </View>
        ) : (
          <View className="mt-5 gap-2.5">
            {users.map((u) => (
              <View
                key={u.id}
                className="rounded-2xl border border-blue-800 bg-blue-900/70 p-4"
              >
                <View className="flex-row items-center">
                  <View className="h-11 w-11 items-center justify-center rounded-full bg-blue-950">
                    <Text className="text-base font-bold uppercase text-blue-200">
                      {u.username[0]}
                    </Text>
                  </View>

                  <View className="ml-3 flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-base font-semibold text-blue-100">
                        {u.username}
                      </Text>
                      <View className="rounded-full bg-blue-950 px-2 py-0.5">
                        <Text className="text-[10px] font-bold text-blue-200">
                          {u.role}
                        </Text>
                      </View>
                    </View>
                    <Text className="mt-0.5 text-xs text-blue-300">
                      {u.status} · Joined {formatDate(u.createdAt)}
                      {u.expiresAt ? ` · Expires ${formatDate(u.expiresAt)}` : ""}
                    </Text>
                  </View>

                  {u.role !== "OWNER" && (
                    <Pressable
                      disabled={provisioningUser === u.username}
                      onPress={() => void handleProvision(u.username)}
                      className="rounded-xl bg-blue-200 px-3 py-2"
                    >
                      {provisioningUser === u.username ? (
                        <ActivityIndicator size="small" color="#172554" />
                      ) : (
                        <Text className="text-xs font-bold text-blue-950">
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
      <Modal
        visible={createOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setCreateOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/70">
          <View className="rounded-t-3xl border-t border-blue-700 bg-blue-900 p-6">
            <Text className="text-lg font-bold text-blue-100">
              Create Resident or Guest
            </Text>
            <Text className="mt-1 text-xs text-blue-300">
              Enforced by auth-service: lowercase username (3-32 chars), password ≥ 8,
              OWNER role forbidden via API.
            </Text>

            <View className="mt-4 flex-row gap-2">
              {(["RESIDENT", "GUEST"] as const).map((r) => (
                <Pressable
                  key={r}
                  onPress={() => setRole(r)}
                  className={`flex-1 items-center rounded-xl py-2.5 ${
                    role === r ? "bg-blue-200" : "bg-blue-950"
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      role === r ? "text-blue-950" : "text-blue-200"
                    }`}
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
              placeholderTextColor="#6b8bd6"
              autoCapitalize="none"
              autoCorrect={false}
              className="mt-3 rounded-xl bg-blue-950 px-4 py-3 text-sm text-blue-100"
            />

            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password (min 8 characters)"
              placeholderTextColor="#6b8bd6"
              secureTextEntry
              autoCapitalize="none"
              className="mt-3 rounded-xl bg-blue-950 px-4 py-3 text-sm text-blue-100"
            />

            <Text className="mb-1.5 mt-4 text-xs font-semibold uppercase tracking-wider text-blue-400">
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
                  className={`flex-1 items-center rounded-lg py-2 ${
                    expiryPreset === p.k ? "bg-blue-200" : "bg-blue-950"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      expiryPreset === p.k ? "text-blue-950" : "text-blue-300"
                    }`}
                  >
                    {p.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View className="mt-4 flex-row items-center justify-between">
              <Text className="text-xs text-blue-200">Require password change</Text>
              <Switch
                value={mustChangePwd}
                onValueChange={setMustChangePwd}
                trackColor={{ false: "#172554", true: "#60a5fa" }}
                thumbColor="#e0f2fe"
              />
            </View>

            {formError && (
              <Text className="mt-3 text-xs text-red-300">{formError}</Text>
            )}

            <View className="mt-5 flex-row gap-3">
              <Pressable
                onPress={() => setCreateOpen(false)}
                className="flex-1 items-center rounded-xl border border-blue-700 py-3.5"
              >
                <Text className="font-semibold text-blue-200">Cancel</Text>
              </Pressable>
              <Pressable
                disabled={creating}
                onPress={() => void handleCreateUser()}
                className="flex-1 items-center rounded-xl bg-blue-200 py-3.5"
              >
                {creating ? (
                  <ActivityIndicator color="#172554" />
                ) : (
                  <Text className="font-bold text-blue-950">Create User</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
