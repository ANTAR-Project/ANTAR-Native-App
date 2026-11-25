import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { Ionicons } from "@expo/vector-icons";
import { ApiError } from "../../src/api/client";
import ToastBanner from "../../src/components/ToastBanner";
import { useAuth } from "../../src/context/AuthContext";
import { useElementsApi } from "../../src/hooks/useElementsApi";
import { useToast } from "../../src/hooks/useToast";
import type { ElementReadResponse, ElementStateResponse } from "../../src/types";

const SAVED_ELEMENTS_KEY = "antar_saved_element_ids";
const DEFAULT_ELEMENT_IDS = ["elem-living-room-01"];

interface ElementCardState {
  id: string;
  loading: boolean;
  lastRead?: ElementReadResponse;
  lastControl?: ElementStateResponse;
  lastError?: string;
  policyDenied?: boolean;
}

async function loadSavedIds(): Promise<string[]> {
  try {
    const raw =
      Platform.OS === "web" && typeof localStorage !== "undefined"
        ? localStorage.getItem(SAVED_ELEMENTS_KEY)
        : await SecureStore.getItemAsync(SAVED_ELEMENTS_KEY);
    if (!raw) return DEFAULT_ELEMENT_IDS;
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map(String);
    }
  } catch {
    // ignore
  }
  return DEFAULT_ELEMENT_IDS;
}

async function persistIds(ids: string[]): Promise<void> {
  const json = JSON.stringify(ids);
  try {
    if (Platform.OS === "web" && typeof localStorage !== "undefined") {
      localStorage.setItem(SAVED_ELEMENTS_KEY, json);
    } else {
      await SecureStore.setItemAsync(SAVED_ELEMENTS_KEY, json);
    }
  } catch {
    // ignore
  }
}

export default function Elements() {
  const { session } = useAuth();
  const { readElement, controlElement } = useElementsApi();
  const { toast, show, hide } = useToast();

  const [elementIds, setElementIds] = useState<string[]>(DEFAULT_ELEMENT_IDS);
  const [newId, setNewId] = useState("");
  const [states, setStates] = useState<Record<string, ElementCardState>>({});

  useEffect(() => {
    loadSavedIds().then((ids) => setElementIds(ids));
  }, []);

  const handleRead = useCallback(
    async (id: string) => {
      setStates((prev) => ({
        ...prev,
        [id]: { ...prev[id], id, loading: true, lastError: undefined, policyDenied: false },
      }));
      try {
        const res = await readElement(id);
        setStates((prev) => ({
          ...prev,
          [id]: { ...prev[id], id, loading: false, lastRead: res, lastError: undefined, policyDenied: false },
        }));
      } catch (err) {
        const isDenied = err instanceof ApiError && err.status === 403;
        const msg = err instanceof Error ? err.message : "Failed to read element.";
        setStates((prev) => ({
          ...prev,
          [id]: { ...prev[id], id, loading: false, lastError: msg, policyDenied: isDenied },
        }));
      }
    },
    [readElement]
  );

  const handleControl = useCallback(
    async (id: string, desiredState: "ON" | "OFF") => {
      setStates((prev) => ({
        ...prev,
        [id]: { ...prev[id], id, loading: true, lastError: undefined, policyDenied: false },
      }));
      try {
        const res = await controlElement(id, { state: desiredState });
        setStates((prev) => ({
          ...prev,
          [id]: {
            ...prev[id],
            id,
            loading: false,
            lastControl: res,
            lastError: undefined,
            policyDenied: false,
          },
        }));
        show(`Sent ${desiredState} to ${id}.`, "success");
      } catch (err) {
        const isDenied = err instanceof ApiError && err.status === 403;
        const msg = err instanceof Error ? err.message : "Control failed.";
        setStates((prev) => ({
          ...prev,
          [id]: { ...prev[id], id, loading: false, lastError: msg, policyDenied: isDenied },
        }));
        show(msg, "error");
      }
    },
    [controlElement, show]
  );

  const addElementId = () => {
    const clean = newId.trim();
    if (!clean) return;
    if (elementIds.includes(clean)) {
      show(`"${clean}" is already listed.`, "info");
      return;
    }
    const next = [clean, ...elementIds];
    setElementIds(next);
    setNewId("");
    void persistIds(next);
    void handleRead(clean);
  };

  const removeElementId = (id: string) => {
    const next = elementIds.filter((e) => e !== id);
    setElementIds(next);
    void persistIds(next);
  };

  return (
    <ScrollView className="flex-1 bg-blue-950" contentContainerClassName="p-4 pb-12">
      <ToastBanner toast={toast} onDismiss={hide} />

      {/* Policy Context Card */}
      <View className="mt-1 rounded-2xl border border-blue-800 bg-blue-900/60 p-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-bold text-blue-100">Element Registry</Text>
          <View className="rounded-full bg-blue-950 px-2.5 py-1">
            <Text className="text-[11px] font-semibold text-blue-200">{session?.role}</Text>
          </View>
        </View>
        <Text className="mt-1.5 text-xs leading-4 text-blue-300">
          Calls GET /api/v1/elements/&#123;id&#125; and PUT /api/v1/elements/&#123;id&#125;/state
          through API Gateway. Note: Default 69-rule policy seed restricts ELEMENT rules
          to SERVICE unless optional RESIDENT/GUEST rules are enabled in policy-registry.
        </Text>
      </View>

      {/* Add Element ID */}
      <View className="mt-4 flex-row gap-2">
        <TextInput
          value={newId}
          onChangeText={setNewId}
          placeholder="Add elementId (e.g. elem-living-room-01)"
          placeholderTextColor="#6b8bd6"
          autoCapitalize="none"
          autoCorrect={false}
          className="flex-1 rounded-xl border border-blue-800 bg-blue-900 px-3.5 py-2.5 text-sm text-blue-100"
        />
        <Pressable
          onPress={addElementId}
          className="items-center justify-center rounded-xl bg-blue-200 px-4"
        >
          <Text className="text-sm font-bold text-blue-950">Add</Text>
        </Pressable>
      </View>

      <Text className="mb-2.5 mt-6 text-xs font-semibold uppercase tracking-widest text-blue-400">
        Registered Targets ({elementIds.length})
      </Text>

      <View className="gap-3">
        {elementIds.map((id) => {
          const st = states[id];
          const appliedState =
            typeof st?.lastControl?.applied?.state === "string"
              ? st.lastControl.applied.state
              : null;

          return (
            <View
              key={id}
              className="rounded-2xl border border-blue-800 bg-blue-900/70 p-4"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1 flex-row items-center">
                  <Ionicons name="hardware-chip-outline" size={22} color="#bfdbfe" />
                  <View className="ml-2.5 flex-1">
                    <Text className="text-base font-semibold text-blue-100" numberOfLines={1}>
                      {id}
                    </Text>
                    <Text className="text-xs text-blue-300">
                      {st?.lastRead
                        ? `${st.lastRead.type} · requestedBy ${st.lastRead.requestedBy}`
                        : "Tap Read to query element-registry"}
                    </Text>
                  </View>
                </View>

                {elementIds.length > 1 && (
                  <Pressable onPress={() => removeElementId(id)} hitSlop={10}>
                    <Ionicons name="close-circle-outline" size={20} color="#6b8bd6" />
                  </Pressable>
                )}
              </View>

              {appliedState && (
                <View className="mt-2.5 self-start rounded-full bg-emerald-950/70 px-3 py-1">
                  <Text className="text-xs font-semibold text-emerald-300">
                    Last applied state: {appliedState} (by {st?.lastControl?.appliedBy})
                  </Text>
                </View>
              )}

              {st?.lastError && (
                <View className="mt-3 rounded-xl border border-red-400/50 bg-red-950/50 p-3">
                  <Text className="text-xs font-semibold text-red-200">
                    {st.policyDenied ? "403 POLICY_DENIED" : "Request Error"}
                  </Text>
                  <Text className="mt-0.5 text-xs text-red-300">{st.lastError}</Text>
                </View>
              )}

              <View className="mt-3.5 flex-row gap-2">
                <Pressable
                  disabled={st?.loading}
                  onPress={() => void handleRead(id)}
                  className="flex-1 flex-row items-center justify-center rounded-xl border border-blue-600 bg-blue-950 py-2.5"
                >
                  {st?.loading ? (
                    <ActivityIndicator size="small" color="#bfdbfe" />
                  ) : (
                    <>
                      <Ionicons name="refresh-outline" size={16} color="#bfdbfe" />
                      <Text className="ml-1.5 text-xs font-semibold text-blue-100">Read</Text>
                    </>
                  )}
                </Pressable>

                <Pressable
                  disabled={st?.loading}
                  onPress={() => void handleControl(id, "ON")}
                  className="flex-1 items-center justify-center rounded-xl bg-blue-200 py-2.5"
                >
                  <Text className="text-xs font-bold text-blue-950">Set ON</Text>
                </Pressable>

                <Pressable
                  disabled={st?.loading}
                  onPress={() => void handleControl(id, "OFF")}
                  className="flex-1 items-center justify-center rounded-xl bg-blue-800 py-2.5"
                >
                  <Text className="text-xs font-bold text-blue-100">Set OFF</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
