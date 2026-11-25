import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError } from "../../src/api/client";
import ToastBanner from "../../src/components/ToastBanner";
import { useAuth } from "../../src/context/AuthContext";
import { useTheme } from "../../src/context/ThemeContext";
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
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { colors } = useTheme();
  const { readElement, controlElement } = useElementsApi();
  const { toast, show, hide } = useToast();

  const [elementIds, setElementIds] = useState<string[]>(DEFAULT_ELEMENT_IDS);
  const [newId, setNewId] = useState("");
  const [states, setStates] = useState<Record<string, ElementCardState>>({});

  const bottomPad = Math.max(insets.bottom, 12) + 100;

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
      >
        <ToastBanner toast={toast} onDismiss={hide} />

        {/* Policy Context Card */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.hairline,
            borderWidth: 1,
          }}
          className="mt-1 rounded-2xl p-4"
        >
          <View className="flex-row items-center justify-between">
            <Text style={{ color: colors.ink }} className="text-sm font-semibold">
              Element Registry
            </Text>
            <View
              style={{
                backgroundColor: colors.recessed,
                borderColor: colors.hairlineStrong,
                borderWidth: 1,
              }}
              className="rounded-full px-2.5 py-0.5"
            >
              <Text
                style={{ color: colors.accentWarm }}
                className="text-[10px] font-semibold tracking-wider"
              >
                {session?.role}
              </Text>
            </View>
          </View>
          <Text
            style={{ color: colors.inkMuted }}
            className="mt-2 text-xs leading-4"
          >
            Queries /api/v1/elements/&#123;id&#125; and /state through API Gateway. Default
            69-rule seed limits ELEMENT rules to SERVICE unless optional RESIDENT/GUEST rules
            are enabled in policy-registry.
          </Text>
        </View>

        {/* Add Element ID */}
        <View className="mt-4 flex-row gap-2">
          <TextInput
            value={newId}
            onChangeText={setNewId}
            placeholder="Add elementId (e.g. elem-living-room-01)"
            placeholderTextColor={colors.inkSubtle}
            autoCapitalize="none"
            autoCorrect={false}
            style={{
              backgroundColor: colors.recessed,
              borderColor: colors.hairlineStrong,
              borderWidth: 1,
              color: colors.ink,
            }}
            className="flex-1 rounded-xl px-3.5 py-3 text-sm"
          />
          <Pressable
            onPress={addElementId}
            style={{ backgroundColor: colors.accent }}
            className="items-center justify-center rounded-xl px-5"
          >
            <Text style={{ color: colors.accentInk }} className="text-xs font-bold">
              Add
            </Text>
          </Pressable>
        </View>

        <Text
          style={{ color: colors.inkSubtle }}
          className="mb-2.5 mt-7 text-[11px] font-semibold uppercase tracking-[0.16em]"
        >
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
                style={{
                  backgroundColor: colors.surface,
                  borderColor: colors.hairline,
                  borderWidth: 1,
                }}
                className="rounded-2xl p-4"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 flex-row items-center">
                    <View
                      style={{
                        backgroundColor: colors.recessed,
                        borderColor: colors.hairline,
                        borderWidth: 1,
                      }}
                      className="h-10 w-10 items-center justify-center rounded-xl"
                    >
                      <Ionicons
                        name="radio-button-on-outline"
                        size={18}
                        color={colors.accentWarm}
                      />
                    </View>
                    <View className="ml-3 flex-1">
                      <Text
                        style={{ color: colors.ink }}
                        className="font-mono text-sm font-semibold"
                        numberOfLines={1}
                      >
                        {id}
                      </Text>
                      <Text style={{ color: colors.inkMuted }} className="mt-0.5 text-[11px]">
                        {st?.lastRead
                          ? `${st.lastRead.type} · requestedBy ${st.lastRead.requestedBy}`
                          : "Tap Read to query element-registry"}
                      </Text>
                    </View>
                  </View>

                  {elementIds.length > 1 && (
                    <Pressable onPress={() => removeElementId(id)} hitSlop={10}>
                      <Ionicons name="close-circle-outline" size={19} color={colors.inkSubtle} />
                    </Pressable>
                  )}
                </View>

                {appliedState && (
                  <View
                    style={{
                      backgroundColor: colors.emeraldBg,
                      borderColor: colors.emeraldBorder,
                      borderWidth: 1,
                    }}
                    className="mt-3 self-start rounded-full px-3 py-1"
                  >
                    <Text
                      style={{ color: colors.emerald }}
                      className="text-[11px] font-semibold"
                    >
                      State: {appliedState} (by {st?.lastControl?.appliedBy})
                    </Text>
                  </View>
                )}

                {st?.lastError && (
                  <View
                    style={{
                      backgroundColor: colors.crimsonBg,
                      borderColor: colors.crimsonBorder,
                      borderWidth: 1,
                    }}
                    className="mt-3 rounded-xl p-3"
                  >
                    <Text
                      style={{ color: colors.crimson }}
                      className="text-[11px] font-semibold"
                    >
                      {st.policyDenied ? "403 POLICY_DENIED" : "Request Error"}
                    </Text>
                    <Text
                      style={{ color: colors.crimson }}
                      className="mt-0.5 text-xs opacity-90"
                    >
                      {st.lastError}
                    </Text>
                  </View>
                )}

                <View className="mt-3.5 flex-row gap-2">
                  <Pressable
                    disabled={st?.loading}
                    onPress={() => void handleRead(id)}
                    style={{
                      backgroundColor: colors.recessed,
                      borderColor: colors.hairlineStrong,
                      borderWidth: 1,
                    }}
                    className="flex-1 flex-row items-center justify-center rounded-xl py-2.5"
                  >
                    {st?.loading ? (
                      <ActivityIndicator size="small" color={colors.accent} />
                    ) : (
                      <>
                        <Ionicons name="refresh-outline" size={14} color={colors.inkMuted} />
                        <Text
                          style={{ color: colors.ink }}
                          className="ml-1.5 text-xs font-semibold"
                        >
                          Read
                        </Text>
                      </>
                    )}
                  </Pressable>

                  <Pressable
                    disabled={st?.loading}
                    onPress={() => void handleControl(id, "ON")}
                    style={{ backgroundColor: colors.accent }}
                    className="flex-1 items-center justify-center rounded-xl py-2.5"
                  >
                    <Text
                      style={{ color: colors.accentInk }}
                      className="text-xs font-bold"
                    >
                      Set ON
                    </Text>
                  </Pressable>

                  <Pressable
                    disabled={st?.loading}
                    onPress={() => void handleControl(id, "OFF")}
                    style={{
                      backgroundColor: colors.elevated,
                      borderColor: colors.hairlineStrong,
                      borderWidth: 1,
                    }}
                    className="flex-1 items-center justify-center rounded-xl py-2.5"
                  >
                    <Text style={{ color: colors.ink }} className="text-xs font-semibold">
                      Set OFF
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
