import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ToastBanner from "../../src/components/ToastBanner";
import { useTheme } from "../../src/context/ThemeContext";
import { useOwnerApi } from "../../src/hooks/useOwnerApi";
import { useToast } from "../../src/hooks/useToast";
import { SEEDED_POLICY_MATRIX } from "../../src/policies";
import type { UserResponse } from "../../src/types";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const ITEMS: { title: string; desc: string; icon: IconName; href: string }[] = [
  {
    title: "Users & Workspaces",
    desc: "Create Resident or Guest accounts and provision their NAS workspace directories.",
    icon: "people-outline",
    href: "/owner/workspaces",
  },
  {
    title: "Hearth Policy Matrix",
    desc: "Inspect all 69 active policy rules across OWNER, RESIDENT, GUEST, and SERVICE.",
    icon: "key-outline",
    href: "/owner/permissions",
  },
];

export default function Panel() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { listUsers, clearShared } = useOwnerApi();
  const { toast, show, hide } = useToast();

  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);

  const bottomPad = Math.max(insets.bottom, 12) + 100;

  const loadUsers = useCallback(
    async (isPull = false) => {
      if (isPull) setRefreshing(true);
      else setLoading(true);
      try {
        const data = await listUsers();
        setUsers(data);
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
    void loadUsers(false);
  }, [loadUsers]);

  const residentsCount = users.filter((u) => u.role === "RESIDENT").length;
  const guestsCount = users.filter((u) => u.role === "GUEST").length;

  const confirmClearShared = () => {
    Alert.alert(
      "Clear Shared Workspace?",
      "Permanently delete all files and folders inside /shared? Only OWNER is permitted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear Shared",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              await clearShared();
              show("Shared workspace cleared.", "success");
            } catch (err) {
              show(err instanceof Error ? err.message : "Clear failed.", "error");
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      className="flex-1"
      contentContainerStyle={{ padding: 16, paddingBottom: bottomPad }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void loadUsers(true)}
          tintColor={colors.accent}
        />
      }
    >
      <ToastBanner toast={toast} onDismiss={hide} />

      {/* Metric Strip */}
      <View
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.hairline,
          borderWidth: 1,
        }}
        className="mt-1 flex-row overflow-hidden rounded-2xl"
      >
        <View className="flex-1 p-4">
          {loading ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Text style={{ color: colors.ink }} className="text-2xl font-semibold">
              {residentsCount}
            </Text>
          )}
          <Text
            style={{ color: colors.inkSubtle }}
            className="mt-1 text-[11px] uppercase tracking-wider"
          >
            Residents
          </Text>
        </View>
        <View style={{ backgroundColor: colors.hairline }} className="w-px" />
        <View className="flex-1 p-4">
          {loading ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Text style={{ color: colors.ink }} className="text-2xl font-semibold">
              {guestsCount}
            </Text>
          )}
          <Text
            style={{ color: colors.inkSubtle }}
            className="mt-1 text-[11px] uppercase tracking-wider"
          >
            Guests
          </Text>
        </View>
        <View style={{ backgroundColor: colors.hairline }} className="w-px" />
        <View className="flex-1 p-4">
          <Text style={{ color: colors.accentWarm }} className="text-2xl font-semibold">
            {SEEDED_POLICY_MATRIX.length}
          </Text>
          <Text
            style={{ color: colors.inkSubtle }}
            className="mt-1 text-[11px] uppercase tracking-wider"
          >
            Rules
          </Text>
        </View>
      </View>

      {/* Navigation List */}
      <Text
        style={{ color: colors.inkSubtle }}
        className="mb-2.5 mt-7 text-[11px] font-semibold uppercase tracking-[0.16em]"
      >
        Administration
      </Text>
      <View
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.hairline,
          borderWidth: 1,
        }}
        className="overflow-hidden rounded-2xl"
      >
        {ITEMS.map((item, i) => (
          <View key={item.href}>
            {i > 0 && <View style={{ backgroundColor: colors.hairline }} className="h-px" />}
            <Pressable
              onPress={() => router.push(item.href as Href)}
              className="flex-row items-center p-4"
            >
              <View
                style={{
                  backgroundColor: colors.recessed,
                  borderColor: colors.hairline,
                  borderWidth: 1,
                }}
                className="h-11 w-11 items-center justify-center rounded-xl"
              >
                <Ionicons name={item.icon} size={20} color={colors.accentWarm} />
              </View>
              <View className="ml-3.5 flex-1">
                <Text style={{ color: colors.ink }} className="text-sm font-semibold">
                  {item.title}
                </Text>
                <Text style={{ color: colors.inkMuted }} className="mt-0.5 text-xs leading-4">
                  {item.desc}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.inkSubtle} />
            </Pressable>
          </View>
        ))}
      </View>

      {/* Owner-only Shared Workspace Action */}
      <Text
        style={{ color: colors.inkSubtle }}
        className="mb-2.5 mt-7 text-[11px] font-semibold uppercase tracking-[0.16em]"
      >
        Shared Space Governance
      </Text>
      <Pressable
        disabled={busy}
        onPress={confirmClearShared}
        style={{
          backgroundColor: colors.crimsonBg,
          borderColor: colors.crimsonBorder,
          borderWidth: 1,
        }}
        className="flex-row items-center rounded-2xl p-4"
      >
        {busy ? (
          <ActivityIndicator size="small" color={colors.crimson} />
        ) : (
          <Ionicons name="trash-outline" size={20} color={colors.crimson} />
        )}
        <View className="ml-3.5 flex-1">
          <Text style={{ color: colors.crimson }} className="text-sm font-semibold">
            Clear Shared Workspace
          </Text>
          <Text style={{ color: colors.inkSubtle }} className="mt-0.5 text-[11px]">
            DELETE /api/v1/nas/shared/clear · Unconditional OWNER rule
          </Text>
        </View>
      </Pressable>
    </ScrollView>
  );
}
